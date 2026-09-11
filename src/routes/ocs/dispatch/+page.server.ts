import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		// Get Orders for Dispatch
		const ordersResult = await sql`
			SELECT 
				o.id,
				c.nama_kustomer as customer,
				ori.nama_kustomer as origin,
				dest.nama_kustomer as destination,
				o.jenis_muatan as cargo,
				o.berat_muatan as weight,
				o.tgl_muat as "loadingDate",
				ca.estimated_ujo as "estimatedUjo",
				ca.ujo_makan as "ujoMakan",
				ca.ujo_tol as "ujoTol",
				u.nomor_unit as "assignedUnit",
				k.nama_karyawan as "assignedDriver",
				o.status,
				o.dispatch_mode,
				o.total_ritase_plan,
				ori.latitude as origin_lat,
				dest.latitude as dest_lat,
				t.last_lat,
				t.last_lon,
				t.pool_tujuan_id
			FROM marketing.sales_order o
			LEFT JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date AND t.status NOT IN ('COMPLETED', 'CANCELED')
			LEFT JOIN master.m_customer c ON c.id = o.customer_id
			LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
			LEFT JOIN fleet.unit u ON u.id = o.assigned_unit_id
			LEFT JOIN master.m_drivers d ON d.id = o.assigned_driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN finance.cash_advance ca ON ca.sales_order_id = o.id
			WHERE o.status NOT IN ('COMPLETED', 'CANCELED') AND COALESCE(o.dispatch_mode, 'REGULER') = 'REGULER'
			ORDER BY o.created_at DESC
		`;

		// Get Available Units (In Pool, AT_DESTINATION, or RETURNING for continuous cargo bypass)
		const unitsResult = await sql`
			SELECT 
				u.id as "unitId",
				u.nomor_unit as id,
				mu.nama_produk as brand,
				tu.nama_tipe as type,
				COALESCE(k.nama_karyawan, 'Sopir Libur (Habis 14 Hari)') as driver,
				d.id as "driverId",
				eligible_driver.days_worked,
				u.current_state,
				'Pool' as location,
				unit_compliance.has_expired_doc,
				unit_compliance.expired_doc_details,
				driver_compliance.has_expired_sim,
				driver_compliance.expired_sim_details
			FROM fleet.unit u
			LEFT JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
			LEFT JOIN master.m_tipe_unit tu ON tu.id = mu.tipe_unit_id
			LEFT JOIN LATERAL (
				SELECT 
					uda.driver_id,
					COALESCE(trip_count.days_worked, 0) as days_worked
				FROM fleet.unit_driver_assignment uda
				LEFT JOIN (
					SELECT driver_id, COUNT(DISTINCT tgl_trip) as days_worked
					FROM fleet.trip
					WHERE tgl_trip >= date_trunc('month', CURRENT_DATE)
					GROUP BY driver_id
				) trip_count ON trip_count.driver_id = uda.driver_id
				WHERE uda.unit_id = u.id AND uda.is_aktif = true
				  AND COALESCE(trip_count.days_worked, 0) < 14
				ORDER BY 
					CASE WHEN uda.posisi = 'SUPIR_UTAMA' THEN 1 ELSE 2 END ASC,
					COALESCE(trip_count.days_worked, 0) ASC
				LIMIT 1
			) eligible_driver ON true
			LEFT JOIN master.m_drivers d ON d.id = eligible_driver.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN LATERAL (
				SELECT 
					EXISTS(
						SELECT 1 FROM dms.documents doc 
						WHERE doc.asset_id = u.id AND (doc.expiry_date < CURRENT_DATE OR doc.status = 'EXPIRED')
					) as has_expired_doc,
					(
						SELECT string_agg(COALESCE(dt.name, doc.title) || ' (Expired: ' || to_char(doc.expiry_date, 'DD/MM/YYYY') || ')', ', ') 
						FROM dms.documents doc 
						LEFT JOIN dms.m_doc_type dt ON dt.id = doc.doc_type_id 
						WHERE doc.asset_id = u.id AND (doc.expiry_date < CURRENT_DATE OR doc.status = 'EXPIRED')
					) as expired_doc_details
			) unit_compliance ON true
			LEFT JOIN LATERAL (
				SELECT 
					EXISTS(
						SELECT 1 FROM dms.documents doc 
						WHERE (doc.employee_id = d.id OR doc.employee_id = k.id) AND (doc.expiry_date < CURRENT_DATE OR doc.status = 'EXPIRED')
					) as has_expired_sim,
					(
						SELECT string_agg(COALESCE(dt.name, doc.title) || ' (Expired: ' || to_char(doc.expiry_date, 'DD/MM/YYYY') || ')', ', ') 
						FROM dms.documents doc 
						LEFT JOIN dms.m_doc_type dt ON dt.id = doc.doc_type_id 
						WHERE (doc.employee_id = d.id OR doc.employee_id = k.id) AND (doc.expiry_date < CURRENT_DATE OR doc.status = 'EXPIRED')
					) as expired_sim_details
			) driver_compliance ON true
			WHERE u.is_active = true 
			  AND u.current_state IN ('AT_POOL')
			  AND u.id NOT IN (
			      SELECT assigned_unit_id FROM marketing.sales_order WHERE status NOT IN ('COMPLETED', 'CANCELED') AND assigned_unit_id IS NOT NULL
			  )
			  AND REPLACE(u.nomor_unit, ' ', '') NOT IN (
			      SELECT REPLACE(unit_id, ' ', '') FROM fleet.work_orders WHERE status IN ('Open', 'Proses') AND unit_id IS NOT NULL
			  )
			ORDER BY u.current_state ASC, u.nomor_unit ASC
		`;

		// Fetch actual Active Contracts
		const activeContracts = await sql`
			SELECT 
				c.id as contract_id,
				c.target_tonnage,
				c.delivered_tonnage,
				(c.contract_value / NULLIF(c.target_tonnage, 0)) as tariff_per_ton,
				((c.contract_value / NULLIF(c.target_tonnage, 0)) * (c.max_ujo_percentage / 100)) as fixed_ujo,
				c.project_id,
				c.produk_id,
				prod.nama_produk as cargo_type_name,
				cust.nama_kustomer as customer,
				COALESCE(ori.nama_kustomer, mori.nama_kustomer) as origin,
				COALESCE(c.origin_id, mru.origin_id) as origin_id,
				COALESCE(dest.nama_kustomer, mdest.nama_kustomer) as destination,
				COALESCE(c.destination_id, mru.destination_id) as destination_id
			FROM marketing.contract c
			LEFT JOIN master.m_customer cust ON cust.id = c.customer_id
			LEFT JOIN master.m_produk prod ON prod.id = c.produk_id
			LEFT JOIN master.m_customer ori ON ori.id = c.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = c.destination_id
			LEFT JOIN master.m_rute_ujo mru ON mru.id = c.master_rute_id
			LEFT JOIN master.m_customer mori ON mori.id = mru.origin_id
			LEFT JOIN master.m_customer mdest ON mdest.id = mru.destination_id
			WHERE c.status = 'Active' 
			  AND (c.target_tonnage = 0 OR COALESCE(c.delivered_tonnage, 0) < c.target_tonnage)
			  AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date BETWEEN c.start_date AND c.end_date
			ORDER BY c.created_at ASC
		`;

		const contractOrders = [];
		let availableUnitsPool = [...unitsResult]; // copy to keep track of assigned units in this session

		console.log("Active Contracts found:", activeContracts.length);
		if (activeContracts.length > 0) {
			console.log("First active contract:", activeContracts[0].contract_id);
		}

		for (const contract of activeContracts) {
			// AI Logic: Find best unit that is AT_POOL and driver days < 14
			// unitsResult is already filtered and sorted by days_worked ASC
			let bestUnit = availableUnitsPool.find(u => u.driverId && u.days_worked < 14);
			
			if (bestUnit) {
				// Remove the chosen unit from the pool so it doesn't get assigned to the next contract
				availableUnitsPool = availableUnitsPool.filter(u => u.unitId !== bestUnit?.unitId);
			}
			
			// Find up to 5 alternatives (excluding the best unit)
			let alternatives = availableUnitsPool
				.filter(u => u.driverId && u.days_worked < 14 && (!bestUnit || u.unitId !== bestUnit.unitId))
				.slice(0, 5)
				.map(u => ({
					unitId: u.unitId,
					unitName: u.id,
					driverId: u.driverId,
					driverName: u.driver,
					reason: `Sopir bekerja ${u.days_worked} hari`
				}));

			contractOrders.push({
				id: `PO-${contract.contract_id}`, // Just a display label
				contract_id: contract.contract_id,
				customer: contract.customer,
				origin: contract.origin,
				origin_id: contract.origin_id,
				destination: contract.destination,
				destination_id: contract.destination_id,
				targetTonnage: contract.target_tonnage,
				deliveredTonnage: contract.delivered_tonnage,
				tariff: contract.tariff_per_ton,
				fixedUjo: contract.fixed_ujo,
				produk_id: contract.produk_id,
				cargo: contract.cargo_type_name || 'Menunggu Input Muatan',
				status: 'READY_TO_DISPATCH',
				ai_recommended_unit: bestUnit ? bestUnit.id : 'Menunggu Unit',
				ai_recommended_unit_id: bestUnit ? bestUnit.unitId : '',
				ai_recommended_driver: bestUnit ? bestUnit.driver : '-',
				ai_recommended_driver_id: bestUnit ? bestUnit.driverId : '',
				ai_reason: bestUnit 
					? `Rekomendasi AI: Unit ready di Pool. Sopir baru bekerja ${bestUnit.days_worked} hari bulan ini.` 
					: `PERINGATAN: Saat ini tidak ada unit yang tersedia di Pool dengan Supir yang berstatus aktif. Kontrak ini belum bisa dijalankan.`,
				alternatives: alternatives
			});

			if (bestUnit) {
				// Remove unit from pool so next contract gets a different unit
				availableUnitsPool = availableUnitsPool.filter(u => u.unitId !== bestUnit.unitId);
			}
		}

		console.log("Contract Orders length:", contractOrders.length);

		// Fetch Pool data for dynamic geofencing in UI
		const poolsResult = await sql`SELECT id, nama_pool, latitude, longitude, COALESCE(geofence_radius, 500) as radius FROM master.m_pool`;

		// Fetch Products for borongan contracts
		const products = await sql`SELECT id, nama_produk as name FROM master.m_produk ORDER BY nama_produk ASC`;

		// Fetch Customers list
		const customers = await sql`SELECT id, nama_kustomer FROM master.m_customer WHERE is_active = true ORDER BY nama_kustomer ASC`;

		// Fetch Ngepok Multi-Rit Batches
		const ngepokTrips = await sql`
			SELECT 
				t.id as trip_id,
				t.no_surat_tugas,
				t.group_id,
				t.ritase_ke,
				t.total_ritase_plan,
				t.status,
				t.tgl_trip,
				t.customer,
				t.origin,
				t.destination,
				t.cargo,
				t.no_surat_jalan_customer,
				t.actual_weight,
				t.void_reason,
				t.created_at,
				u.nomor_unit,
				k.nama_karyawan as driver_nama,
				ca.estimated_ujo,
				ca.payment_status as ujo_payment_status
			FROM fleet.trip t
			LEFT JOIN fleet.unit u ON u.id = t.unit_id
			LEFT JOIN master.m_drivers d ON d.id = t.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN finance.cash_advance ca ON ca.trip_id = t.id
			WHERE t.dispatch_mode = 'NGEPOK'
			ORDER BY t.created_at DESC, t.ritase_ke ASC
		`;

		const batchMap = new Map<string, any>();
		for (const trip of (ngepokTrips as any[])) {
			const gid = trip.group_id || `BATCH-${trip.trip_id}`;
			if (!batchMap.has(gid)) {
				batchMap.set(gid, {
					groupId: gid,
					nomorUnit: trip.nomor_unit,
					driverNama: trip.driver_nama,
					customer: trip.customer,
					origin: trip.origin,
					destination: trip.destination,
					cargo: trip.cargo,
					tglTrip: trip.tgl_trip,
					totalPlan: trip.total_ritase_plan,
					createdAt: trip.created_at,
					trips: []
				});
			}
			batchMap.get(gid).trips.push(trip);
		}
		const ngepokBatches = Array.from(batchMap.values());

		// Fetch Dedicated On-Site Dispatches
		const dedicatedTrips = await sql`
			SELECT 
				t.id as trip_id,
				t.spk_induk_nomor,
				t.status,
				t.tgl_trip,
				t.customer,
				t.origin,
				t.destination,
				t.cargo,
				t.remark as periode_shift,
				t.actual_weight,
				t.created_at,
				u.nomor_unit,
				k.nama_karyawan as driver_nama
			FROM fleet.trip t
			LEFT JOIN fleet.unit u ON u.id = t.unit_id
			LEFT JOIN master.m_drivers d ON d.id = t.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			WHERE t.dispatch_mode = 'DEDICATED_ONSITE'
			ORDER BY t.created_at DESC
		`;

		const logsheets = await sql`
			SELECT 
				id,
				trip_id,
				jam_muat::text,
				jam_bongkar::text,
				no_surat_jalan_customer,
				tonase,
				catatan,
				created_at
			FROM fleet.onsite_logsheet
			ORDER BY id ASC
		`;

		const logsheetMap = new Map<number, any[]>();
		for (const ls of (logsheets as any[])) {
			if (!logsheetMap.has(ls.trip_id)) logsheetMap.set(ls.trip_id, []);
			logsheetMap.get(ls.trip_id)!.push(ls);
		}
		const dedicatedList = (dedicatedTrips as any[]).map(dt => {
			const lsList = logsheetMap.get(dt.trip_id) || [];
			const totalTonnage = lsList.reduce((acc: number, l: any) => acc + (parseFloat(l.tonase) || 0), 0);
			return {
				...dt,
				logsheets: lsList,
				totalRitase: lsList.length,
				totalTonase: totalTonnage
			};
		});

		return {
			orders: ordersResult as any[],
			availableUnits: unitsResult as any[],
			contractOrders,
			pools: poolsResult as any[],
			products: products as any[],
			customers: customers as any[],
			ngepokBatches,
			dedicatedDispatches: dedicatedList
		};
	} catch (error) {
		console.error("Error loading dispatch data:", error);
		return { orders: [], availableUnits: [] };
	}
};

function parseId(val: any): number | null {
	if (val === null || val === undefined) return null;
	const str = String(val).trim();
	if (str === '' || str === 'null' || str === 'undefined') return null;
	const num = parseInt(str, 10);
	return isNaN(num) ? null : num;
}

export const actions: Actions = {
	createDoFromPo: async ({ request }) => {
		const data = await request.formData();
		const contractId = data.get('contractId') as string;
		const cargoName = data.get('cargoName') as string || null;
		const loadingDate = data.get('loadingDate') as string || null;
		const unloadingDate = data.get('unloadingDate') as string || null;
		
		const unitIdsRaw = data.get('unitIds') as string;
		let assignments: { unitId: number, driverId: number | null }[] = [];

		if (unitIdsRaw) {
			try {
				const parsed = JSON.parse(unitIdsRaw);
				const arr = Array.isArray(parsed) ? parsed : [parsed];
				assignments = arr.map((p: any) => {
					const parts = String(p).split('|');
					const uId = parseId(parts[0]);
					const dId = parseId(parts[1]);
					return { unitId: uId!, driverId: dId };
				}).filter(a => a.unitId !== null);
			} catch(e) {}
		} else {
			const rawU = data.get('unitId');
			const rawD = data.get('driverId');
			const uId = parseId(rawU);
			if (uId) {
				assignments.push({ unitId: uId, driverId: parseId(rawD) });
			}
		}

		if (!contractId || assignments.length === 0) {
			return fail(400, { message: 'Data unit/driver tidak lengkap.' });
		}

		try {
			await sql.begin(async (sql) => {
				// Get contract with calculated origin/destination and financial values
				const contractData = await sql`
					SELECT 
						c.id, 
						c.customer_id, 
						COALESCE(c.origin_id, mru.origin_id) as final_origin_id,
						COALESCE(c.destination_id, mru.destination_id) as final_dest_id,
						c.target_tonnage,
						c.contract_value,
						c.max_ujo_percentage,
						c.produk_id,
						prod.nama_produk as jenis_muatan,
						COALESCE(mru.total_ujo, ((c.contract_value / NULLIF(c.target_tonnage, 0)) * (c.max_ujo_percentage / 100))) as fixed_ujo,
						(c.contract_value / NULLIF(c.target_tonnage, 0)) as tariff_per_ton,
						COALESCE(mru.biaya_tol, 0) as ujo_tol,
						COALESCE(mru.uang_makan, 0) as ujo_makan
					FROM marketing.contract c
					LEFT JOIN master.m_produk prod ON prod.id = c.produk_id
					LEFT JOIN master.m_rute_ujo mru ON mru.id = c.master_rute_id
					WHERE c.id = ${contractId}
				`;
				if (contractData.length === 0) throw new Error('Kontrak tidak ditemukan.');
				const contract = contractData[0];

				// We need to know if we used MRU.
				const mruCheck = await sql`SELECT master_rute_id FROM marketing.contract WHERE id = ${contractId}`;

				// Check coordinates to prevent dispatching un-geocoded contracts
				const coordinateCheck = await sql`
					SELECT ori.latitude as origin_lat, dest.latitude as dest_lat
					FROM master.m_customer ori, master.m_customer dest
					WHERE ori.id = ${contract.final_origin_id} AND dest.id = ${contract.final_dest_id}
				`;
				if (coordinateCheck.length > 0) {
					if (!coordinateCheck[0].origin_lat || !coordinateCheck[0].dest_lat) {
						throw new Error('Gagal Create DO: Koordinat Origin/Destination pada Kontrak belum diset.');
					}
				}

				for (const assignment of assignments) {
					// Resolve Driver if not provided
					let resolvedDriverId = assignment.driverId;
					if (!resolvedDriverId) {
						const driverRes = await sql`
							SELECT driver_id FROM fleet.unit_driver_assignment 
							WHERE unit_id = ${assignment.unitId} AND is_aktif = true 
							ORDER BY CASE WHEN posisi = 'SUPIR_UTAMA' THEN 1 ELSE 2 END ASC LIMIT 1
						`;
						if (driverRes.length > 0 && driverRes[0].driver_id) {
							resolvedDriverId = parseId(driverRes[0].driver_id);
						}
					}

					// Get Unit Capacity and Tipe Unit ID
					const unitDataResult = await sql`
						SELECT u.id, mu.tipe_unit_id
						FROM fleet.unit u
						LEFT JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
						WHERE u.id = ${assignment.unitId}
					`;
					if (unitDataResult.length === 0) throw new Error(`Unit ${assignment.unitId} tidak valid.`);
					const unitData = unitDataResult[0];
					const tipeUnitId = parseId(unitData.tipe_unit_id);
					
					const realCapacity = 30; // Default capacity as DB doesn't have it
					const totalRit = contract.target_tonnage > 0 ? Math.ceil(contract.target_tonnage / realCapacity) : 1;
					
					// Re-calculate UJO if it falls back to percentage
					let finalEstimatedUjo = contract.fixed_ujo || 0;
					let finalTariff = contract.target_tonnage > 0 ? contract.contract_value / totalRit : 0; // Tariff is exact per trip, or 0 for borongan
					
					if (!mruCheck[0].master_rute_id && contract.target_tonnage > 0) {
						finalEstimatedUjo = finalTariff * (contract.max_ujo_percentage / 100);
					}

					const doId = `DO-PO-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
					const finalCargo = cargoName || contract.jenis_muatan || 'Muatan Borongan';

					await sql`
						INSERT INTO marketing.sales_order (
							id, contract_id, customer_id, origin_id, destination_id,
							tipe_unit_id, jenis_muatan, berat_muatan, tgl_muat, tgl_bongkar,
							tariff, assigned_unit_id, assigned_driver_id, status,
							dispatch_mode
						) VALUES (
							${doId}, ${contractId}, ${contract.customer_id}, ${contract.final_origin_id}, ${contract.final_dest_id},
							${tipeUnitId}, ${finalCargo}, ${realCapacity}, ${loadingDate ? new Date(loadingDate) : sql`NOW()`}, ${unloadingDate ? new Date(unloadingDate) : null},
							${finalTariff}, ${assignment.unitId}, ${resolvedDriverId}, 'READY_TO_DISPATCH',
							'REGULER'
						)
					`;

					const stNumber = 'ST-UJO-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 1000);

					// 2. Insert into fleet.trip as SCHEDULED
					const tripResult = await sql`
						INSERT INTO fleet.trip (
							no_surat_tugas,
							dispatch_mode,
							tgl_trip,
							unit_id,
							driver_id,
							customer,
							origin_id,
							destination_id,
							origin,
							destination,
							cargo,
							status,
							created_by,
							pool_tujuan_id
						) VALUES (
							${stNumber},
							'REGULER',
							${loadingDate ? new Date(loadingDate).toISOString().split('T')[0] : sql`CURRENT_DATE`},
							${assignment.unitId},
							${resolvedDriverId},
							(SELECT nama_kustomer FROM master.m_customer WHERE id = ${contract.customer_id}),
							${contract.final_origin_id},
							${contract.final_dest_id},
							(SELECT nama_kustomer FROM master.m_customer WHERE id = ${contract.final_origin_id}),
							(SELECT nama_kustomer FROM master.m_customer WHERE id = ${contract.final_dest_id}),
							${finalCargo},
							'SCHEDULED',
							'OCS Dispatch',
							'ded65e49-e477-47a1-aee8-a373a2485bba'
						)
						RETURNING id
					`;

					const tripId = tripResult[0].id;

					await sql`
						INSERT INTO fleet.trip_status_log (trip_id, status)
						VALUES (${tripId}, 'SCHEDULED')
					`;

					// Update unit status to ON_DUTY_REGULER
					await sql`
						UPDATE fleet.unit
						SET current_state = 'ON_DUTY_REGULER'
						WHERE id = ${assignment.unitId}
					`;

					// 3. Insert UJO into finance.cash_advance
					await sql`
						INSERT INTO finance.cash_advance (
							trip_id, sales_order_id, unit_id, driver_id,
							estimated_ujo, ujo_tol, ujo_makan, payment_status
						) VALUES (
							${tripId}, ${doId}, ${assignment.unitId}, ${resolvedDriverId},
							${finalEstimatedUjo}, ${contract.ujo_tol}, ${contract.ujo_makan}, 'UNPAID'
						)
					`;
				}

			});

			return { success: true, message: `Assign Berhasil: Menunggu UJO dicairkan oleh Kasir.` };
		} catch (e: any) {
			console.error("Create DO from PO error:", e);
			return fail(500, { error: e.message || 'Gagal generate DO dari Kontrak.' });
		}
	},

	assignUjo: async ({ request }) => {
		const data = await request.formData();
		const orderId = data.get('orderId') as string;
		const unitId = data.get('unitId') as string; // This is the ID column of fleet.unit
		const ujoAmount = parseFloat(data.get('ujoAmount') as string) || 0;
		const ujoMakan = parseFloat(data.get('ujoMakan') as string) || 0;
		const ujoTol = parseFloat(data.get('ujoTol') as string) || 0;

		if (!orderId || !unitId) {
			return fail(400, { missing: true, message: 'Harap lengkapi Unit!' });
		}

		try {
			// Get unit_id and driver_id from unit selection
			const unitData = await sql`
				SELECT u.id, eligible_driver.driver_id 
				FROM fleet.unit u 
				LEFT JOIN LATERAL (
					SELECT 
						uda.driver_id
					FROM fleet.unit_driver_assignment uda
					LEFT JOIN (
						SELECT driver_id, COUNT(DISTINCT tgl_trip) as days_worked
						FROM fleet.trip
						WHERE tgl_trip >= date_trunc('month', CURRENT_DATE)
						GROUP BY driver_id
					) trip_count ON trip_count.driver_id = uda.driver_id
					WHERE uda.unit_id = u.id AND uda.is_aktif = true
					  AND COALESCE(trip_count.days_worked, 0) < 14
					ORDER BY 
						CASE WHEN uda.posisi = 'SUPIR_UTAMA' THEN 1 ELSE 2 END ASC,
						COALESCE(trip_count.days_worked, 0) ASC
					LIMIT 1
				) eligible_driver ON true
				WHERE u.nomor_unit = ${unitId} LIMIT 1
			`;

			if (unitData.length === 0) return fail(400, { message: 'Unit tidak ditemukan.' });

			// Check if Origin or Destination is missing coordinates
			const coordinateCheck = await sql`
				SELECT ori.latitude as origin_lat, dest.latitude as dest_lat
				FROM marketing.sales_order o
				LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
				LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
				WHERE o.id = ${orderId}
			`;
			if (coordinateCheck.length > 0) {
				if (!coordinateCheck[0].origin_lat || !coordinateCheck[0].dest_lat) {
					return fail(400, { message: 'Gagal Assign: Koordinat Origin/Destination belum diset. Silakan lengkapi di Master Customer terlebih dahulu.' });
				}
			}

			const dbUnitId = parseId(unitData[0].id);
			const dbDriverId = parseId(unitData[0].driver_id);
			const totalUjo = ujoAmount + ujoMakan + ujoTol;

			await sql.begin(async (sql) => {
				await sql`
					UPDATE marketing.sales_order 
					SET assigned_unit_id = ${dbUnitId},
						assigned_driver_id = ${dbDriverId},
						status = 'WAITING_TARIFF'
					WHERE id = ${orderId}
				`;

				// Attempt to update existing cash_advance, if missing (e.g. from older data) we might need an upsert,
				// but since createDoFromPo now creates it, we can just update.
				await sql`
					UPDATE finance.cash_advance
					SET estimated_ujo = ${totalUjo},
						ujo_makan = ${ujoMakan},
						ujo_tol = ${ujoTol}
					WHERE sales_order_id = ${orderId}
				`;
			});
			return { success: true, message: 'Berhasil assign Unit dan UJO!' };
		} catch (e: any) {
			console.error("Assign UJO error:", e);
			return fail(500, { error: e.message || 'Gagal menyimpan data.' });
		}
	},



	submitClosing: async ({ request }) => {
		const data = await request.formData();
		const orderId = data.get('orderId') as string;
		const closeWeight = parseFloat(data.get('closeWeight') as string) || 0;
		const closeCost = parseFloat(data.get('closeCost') as string) || 0;
		const closeDesc = data.get('closeDesc') as string || '';

		if (!orderId) return fail(400, { message: 'Order ID kosong.' });

		try {
			await sql.begin(async (sql) => {
				await sql`
					UPDATE marketing.sales_order 
					SET status = 'CLOSING'
					WHERE id = ${orderId}
				`;

				await sql`
					UPDATE fleet.trip
					SET actual_weight = ${closeWeight}
					FROM marketing.sales_order o
					WHERE o.id = ${orderId} AND fleet.trip.unit_id = o.assigned_unit_id AND fleet.trip.tgl_trip::date = o.tgl_muat::date
				`;

				await sql`
					UPDATE finance.cash_advance
					SET extra_cost = ${closeCost},
						extra_cost_desc = ${closeDesc}
					WHERE sales_order_id = ${orderId}
				`;
			});
			return { success: true, message: 'Order masuk antrian Kasir.' };
		} catch (e: any) {
			console.error("Submit closing error:", e);
			return fail(500, { error: e.message || 'Gagal update status closing.' });
		}
	},

	createNgepokDispatch: async ({ request }) => {
		const data = await request.formData();
		const contractId = data.get('contractId') as string || null;
		const customerId = data.get('customerId') as string || null;
		const unitIdRaw = data.get('unitId') as string;
		const driverIdRaw = data.get('driverId') as string;
		const originIdRaw = data.get('originId') as string;
		const destIdRaw = data.get('destinationId') as string;
		const cargoName = (data.get('cargoName') as string || 'Muatan Shuttle / Ngepok').trim();
		const loadingDate = data.get('loadingDate') as string || null;
		const planRitase = parseInt(data.get('planRitase') as string, 10) || 1;
		const ujoPerRit = parseFloat(data.get('ujoPerRit') as string) || 0;
		const ujoMakan = parseFloat(data.get('ujoMakan') as string) || 0;
		const ujoTol = parseFloat(data.get('ujoTol') as string) || 0;

		const unitId = parseId(unitIdRaw);
		let driverId = parseId(driverIdRaw);
		const originId = parseId(originIdRaw);
		const destId = parseId(destIdRaw);

		if (!unitId || planRitase < 1) {
			return fail(400, { message: 'Unit dan Plan Ritase wajib diisi.' });
		}

		try {
			await sql.begin(async (sql) => {
				if (!driverId) {
					const dRes = await sql`
						SELECT driver_id FROM fleet.unit_driver_assignment 
						WHERE unit_id = ${unitId} AND is_aktif = true 
						ORDER BY CASE WHEN posisi = 'SUPIR_UTAMA' THEN 1 ELSE 2 END ASC LIMIT 1
					`;
					if (dRes.length > 0) driverId = parseId(dRes[0].driver_id);
				}

				let custName = 'Customer Umum';
				let finalCustId = parseId(customerId);
				let finalOriginId = originId;
				let finalDestId = destId;

				if (contractId) {
					const cData = await sql`
						SELECT c.customer_id, COALESCE(c.origin_id, mru.origin_id) as origin_id, COALESCE(c.destination_id, mru.destination_id) as destination_id, cust.nama_kustomer
						FROM marketing.contract c
						LEFT JOIN master.m_customer cust ON cust.id = c.customer_id
						LEFT JOIN master.m_rute_ujo mru ON mru.id = c.master_rute_id
						WHERE c.id = ${contractId}
					`;
					if (cData.length > 0) {
						finalCustId = cData[0].customer_id;
						finalOriginId = finalOriginId || cData[0].origin_id;
						finalDestId = finalDestId || cData[0].destination_id;
						custName = cData[0].nama_kustomer || custName;
					}
				} else if (finalCustId) {
					const custRes = await sql`SELECT nama_kustomer FROM master.m_customer WHERE id = ${finalCustId}`;
					if (custRes.length > 0) custName = custRes[0].nama_kustomer;
				}

				const originRes = finalOriginId ? await sql`SELECT nama_kustomer FROM master.m_customer WHERE id = ${finalOriginId}` : [];
				const destRes = finalDestId ? await sql`SELECT nama_kustomer FROM master.m_customer WHERE id = ${finalDestId}` : [];
				const originName = originRes.length > 0 ? originRes[0].nama_kustomer : 'Pool / Origin';
				const destName = destRes.length > 0 ? destRes[0].nama_kustomer : 'Lokasi Tujuan';

				const dateSuffix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
				const randomSuffix = Math.floor(100 + Math.random() * 900);
				const groupId = `NPK-${dateSuffix}-${randomSuffix}`;
				const doId = `DO-${groupId}`;

				// 1. Insert into marketing.sales_order
				await sql`
					INSERT INTO marketing.sales_order (
						id, contract_id, customer_id, origin_id, destination_id,
						jenis_muatan, berat_muatan, tgl_muat, tariff,
						assigned_unit_id, assigned_driver_id, status,
						dispatch_mode, total_ritase_plan
					) VALUES (
						${doId}, ${contractId ? parseId(contractId) : null}, ${finalCustId}, ${finalOriginId}, ${finalDestId},
						${cargoName}, 0, ${loadingDate ? new Date(loadingDate) : sql`NOW()`}, 0,
						${unitId}, ${driverId}, 'READY_TO_DISPATCH',
						'NGEPOK', ${planRitase}
					)
				`;

				// 2. Generate Batch Surat Tugas (ST-NPK-.../1 to N)
				for (let i = 1; i <= planRitase; i++) {
					const stNumber = `ST-${groupId}/${i}`;
					const tripRes = await sql`
						INSERT INTO fleet.trip (
							no_surat_tugas, group_id, dispatch_mode, ritase_ke, total_ritase_plan,
							tgl_trip, unit_id, driver_id, customer,
							origin_id, destination_id, origin, destination, cargo,
							status, created_by
						) VALUES (
							${stNumber}, ${groupId}, 'NGEPOK', ${i}, ${planRitase},
							${loadingDate ? new Date(loadingDate).toISOString().split('T')[0] : sql`CURRENT_DATE`},
							${unitId}, ${driverId}, ${custName},
							${finalOriginId}, ${finalDestId}, ${originName}, ${destName}, ${cargoName},
							'SCHEDULED', 'OCS Dispatch'
						)
						RETURNING id
					`;
					const tripId = tripRes[0].id;

					await sql`
						INSERT INTO fleet.trip_status_log (trip_id, status)
						VALUES (${tripId}, 'SCHEDULED')
					`;

					if (ujoPerRit > 0 || ujoMakan > 0 || ujoTol > 0) {
						await sql`
							INSERT INTO finance.cash_advance (
								trip_id, sales_order_id, unit_id, driver_id,
								estimated_ujo, ujo_tol, ujo_makan, payment_status
							) VALUES (
								${tripId}, ${doId}, ${unitId}, ${driverId},
								${ujoPerRit}, ${ujoTol}, ${ujoMakan}, 'UNPAID'
							)
						`;
					}
				}

				// 3. Update unit current_state
				await sql`
					UPDATE fleet.unit
					SET current_state = 'ON_DUTY_NGEPOK'
					WHERE id = ${unitId}
				`;
			});

			return { success: true, message: `Batch Penugasan Ngepok (${planRitase} Rit) berhasil dibuat.` };
		} catch (e: any) {
			console.error("Create Ngepok error:", e);
			return fail(500, { error: e.message || 'Gagal membuat penugasan Ngepok.' });
		}
	},

	voidRitNgepok: async ({ request }) => {
		const data = await request.formData();
		const tripId = parseId(data.get('tripId'));
		const voidReason = (data.get('voidReason') as string || 'Dibatalkan oleh Dispatcher').trim();

		if (!tripId) return fail(400, { message: 'Trip ID kosong.' });

		try {
			await sql.begin(async (sql) => {
				await sql`
					UPDATE fleet.trip
					SET status = 'VOID',
					    void_reason = ${voidReason}
					WHERE id = ${tripId}
				`;
				await sql`
					INSERT INTO fleet.trip_status_log (trip_id, status)
					VALUES (${tripId}, 'VOID')
				`;
			});
			return { success: true, message: 'Ritase berhasil di-Void.' };
		} catch (e: any) {
			return fail(500, { error: e.message || 'Gagal membatalkan ritase.' });
		}
	},

	addSusulanRitNgepok: async ({ request }) => {
		const data = await request.formData();
		const groupId = (data.get('groupId') as string || '').trim();
		const count = parseInt(data.get('count') as string, 10) || 1;
		if (!groupId) return fail(400, { message: 'Group ID kosong.' });
		if (count < 1) return fail(400, { message: 'Jumlah ritase susulan minimal 1.' });

		try {
			await sql.begin(async (sql) => {
				const existingTrips = await sql`
					SELECT * FROM fleet.trip WHERE group_id = ${groupId} ORDER BY ritase_ke DESC LIMIT 1
				`;
				if (existingTrips.length === 0) throw new Error('Batch Ngepok tidak ditemukan.');
				const lastTrip = existingTrips[0];
				const currentMaxRit = lastTrip.ritase_ke || 0;
				const newTotalRitasePlan = currentMaxRit + count;

				// Cari data cash advance ritase sebelumnya untuk mendapatkan tarif UJO per rit
				const caSample = await sql`
					SELECT ca.sales_order_id, ca.estimated_ujo, ca.ujo_tol, ca.ujo_makan
					FROM finance.cash_advance ca
					JOIN fleet.trip t ON t.id = ca.trip_id
					WHERE t.group_id = ${groupId}
					ORDER BY ca.id DESC
					LIMIT 1
				`;
				const salesOrderId = caSample.length > 0 && caSample[0].sales_order_id ? caSample[0].sales_order_id : `DO-${groupId}`;
				const ujoPerRit = caSample.length > 0 ? (caSample[0].estimated_ujo || 0) : 0;
				const ujoTol = caSample.length > 0 ? (caSample[0].ujo_tol || 0) : 0;
				const ujoMakan = caSample.length > 0 ? (caSample[0].ujo_makan || 0) : 0;

				// Update all existing trips in batch total_ritase_plan
				await sql`
					UPDATE fleet.trip
					SET total_ritase_plan = ${newTotalRitasePlan}
					WHERE group_id = ${groupId}
				`;

				// Update marketing.sales_order total_ritase_plan
				await sql`
					UPDATE marketing.sales_order
					SET total_ritase_plan = ${newTotalRitasePlan}
					WHERE id = ${salesOrderId}
				`;

				// Insert new trips (1..count)
				for (let step = 1; step <= count; step++) {
					const nextRit = currentMaxRit + step;
					const newStNumber = `ST-${groupId}/${nextRit}`;

					const tripRes = await sql`
						INSERT INTO fleet.trip (
							no_surat_tugas, group_id, dispatch_mode, ritase_ke, total_ritase_plan,
							tgl_trip, unit_id, driver_id, customer,
							origin_id, destination_id, origin, destination, cargo,
							status, created_by
						) VALUES (
							${newStNumber}, ${groupId}, 'NGEPOK', ${nextRit}, ${newTotalRitasePlan},
							${lastTrip.tgl_trip}, ${lastTrip.unit_id}, ${lastTrip.driver_id}, ${lastTrip.customer},
							${lastTrip.origin_id}, ${lastTrip.destination_id}, ${lastTrip.origin}, ${lastTrip.destination}, ${lastTrip.cargo},
							'SCHEDULED', 'OCS Dispatch'
						)
						RETURNING id
					`;
					const newTripId = tripRes[0].id;

					await sql`
						INSERT INTO fleet.trip_status_log (trip_id, status)
						VALUES (${newTripId}, 'SCHEDULED')
					`;

					if (ujoPerRit > 0 || ujoMakan > 0 || ujoTol > 0) {
						await sql`
							INSERT INTO finance.cash_advance (
								trip_id, sales_order_id, unit_id, driver_id,
								estimated_ujo, ujo_tol, ujo_makan, payment_status
							) VALUES (
								${newTripId}, ${salesOrderId}, ${lastTrip.unit_id}, ${lastTrip.driver_id},
								${ujoPerRit}, ${ujoTol}, ${ujoMakan}, 'UNPAID'
							)
						`;
					}
				}
			});
			return { success: true, message: `Berhasil menambahkan ${count} ritase susulan.` };
		} catch (e: any) {
			console.error("Add susulan rit error:", e);
			return fail(500, { error: e.message || 'Gagal menambah ritase susulan.' });
		}
	},

	completeRitNgepok: async ({ request }) => {
		const data = await request.formData();
		const tripId = parseId(data.get('tripId'));
		const noSuratJalanCustomer = (data.get('noSuratJalanCustomer') as string || '').trim();
		const actualWeight = parseFloat(data.get('actualWeight') as string) || 0;

		if (!tripId || !noSuratJalanCustomer) {
			return fail(400, { message: 'Trip ID dan Nomor Surat Jalan Customer wajib diisi.' });
		}

		try {
			await sql.begin(async (sql) => {
				await sql`
					UPDATE fleet.trip
					SET status = 'COMPLETED',
					    no_surat_jalan_customer = ${noSuratJalanCustomer},
					    actual_weight = ${actualWeight},
					    arrive_time = NOW()
					WHERE id = ${tripId}
				`;
				await sql`
					INSERT INTO fleet.trip_status_log (trip_id, status)
					VALUES (${tripId}, 'COMPLETED')
				`;
			});
			return { success: true, message: 'Ritase berhasil diselesaikan (Terkoneksi ke Surat Jalan Customer).' };
		} catch (e: any) {
			return fail(500, { error: e.message || 'Gagal menyelesaikan ritase.' });
		}
	},

	closeNgepokBatch: async ({ request }) => {
		const data = await request.formData();
		const groupId = (data.get('groupId') as string || '').trim();
		if (!groupId) return fail(400, { message: 'Group ID kosong.' });

		try {
			await sql.begin(async (sql) => {
				const trips = await sql`SELECT unit_id FROM fleet.trip WHERE group_id = ${groupId} LIMIT 1`;
				if (trips.length > 0 && trips[0].unit_id) {
					await sql`
						UPDATE fleet.unit
						SET current_state = 'AT_POOL'
						WHERE id = ${trips[0].unit_id}
					`;
				}
				await sql`
					UPDATE marketing.sales_order
					SET status = 'CLOSING'
					WHERE id = ${'DO-' + groupId} OR id LIKE ${'%' + groupId + '%'}
				`;
			});
			return { success: true, message: 'Batch penugasan Ngepok telah ditutup. Unit kembali ke AT_POOL.' };
		} catch (e: any) {
			return fail(500, { error: e.message || 'Gagal menutup batch.' });
		}
	},

	createDedicatedDispatch: async ({ request }) => {
		const data = await request.formData();
		const customerIdRaw = data.get('customerId') as string;
		const unitIdRaw = data.get('unitId') as string;
		const driverIdRaw = data.get('driverId') as string;
		const spkIndukNomor = (data.get('spkIndukNomor') as string || '').trim();
		const periodeShift = (data.get('periodeShift') as string || 'Harian').trim();
		const originIdRaw = data.get('originId') as string;
		const destIdRaw = data.get('destinationId') as string;
		const cargoName = (data.get('cargoName') as string || 'Muatan On-Site').trim();
		const tglTrip = data.get('tglTrip') as string || null;

		const unitId = parseId(unitIdRaw);
		let driverId = parseId(driverIdRaw);
		const customerId = parseId(customerIdRaw);
		const originId = parseId(originIdRaw);
		const destId = parseId(destIdRaw);

		if (!unitId || !spkIndukNomor) {
			return fail(400, { message: 'Unit dan Nomor SPK Induk wajib diisi.' });
		}

		try {
			await sql.begin(async (sql) => {
				if (!driverId) {
					const dRes = await sql`
						SELECT driver_id FROM fleet.unit_driver_assignment 
						WHERE unit_id = ${unitId} AND is_aktif = true 
						ORDER BY CASE WHEN posisi = 'SUPIR_UTAMA' THEN 1 ELSE 2 END ASC LIMIT 1
					`;
					if (dRes.length > 0) driverId = parseId(dRes[0].driver_id);
				}

				let custName = 'Customer Dedicated';
				if (customerId) {
					const custRes = await sql`SELECT nama_kustomer FROM master.m_customer WHERE id = ${customerId}`;
					if (custRes.length > 0) custName = custRes[0].nama_kustomer;
				}
				const originRes = originId ? await sql`SELECT nama_kustomer FROM master.m_customer WHERE id = ${originId}` : [];
				const destRes = destId ? await sql`SELECT nama_kustomer FROM master.m_customer WHERE id = ${destId}` : [];
				const originName = originRes.length > 0 ? originRes[0].nama_kustomer : 'Area On-Site A';
				const destName = destRes.length > 0 ? destRes[0].nama_kustomer : 'Area On-Site B';

				const dateSuffix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
				const randomSuffix = Math.floor(100 + Math.random() * 900);
				const spkId = `SPK-DED-${dateSuffix}-${randomSuffix}`;

				// 1. Insert into marketing.sales_order
				await sql`
					INSERT INTO marketing.sales_order (
						id, customer_id, origin_id, destination_id,
						jenis_muatan, berat_muatan, tgl_muat, tariff,
						assigned_unit_id, assigned_driver_id, status,
						dispatch_mode
					) VALUES (
						${spkId}, ${customerId}, ${originId}, ${destId},
						${cargoName}, 0, ${tglTrip ? new Date(tglTrip) : sql`NOW()`}, 0,
						${unitId}, ${driverId}, 'DISPATCHED',
						'DEDICATED_ONSITE'
					)
				`;

				// 2. Insert into fleet.trip (SPK Induk dedicated)
				await sql`
					INSERT INTO fleet.trip (
						no_surat_tugas, spk_induk_nomor, dispatch_mode,
						tgl_trip, unit_id, driver_id, customer,
						origin_id, destination_id, origin, destination, cargo,
						status, remark, created_by
					) VALUES (
						${spkId}, ${spkIndukNomor}, 'DEDICATED_ONSITE',
						${tglTrip ? new Date(tglTrip).toISOString().split('T')[0] : sql`CURRENT_DATE`},
						${unitId}, ${driverId}, ${custName},
						${originId}, ${destId}, ${originName}, ${destName}, ${cargoName},
						'DISPATCHED', ${periodeShift}, 'OCS Dispatch'
					)
				`;

				// 3. Update fleet.unit current_state
				await sql`
					UPDATE fleet.unit
					SET current_state = 'DEDICATED_ONSITE'
					WHERE id = ${unitId}
				`;
			});

			return { success: true, message: `Penugasan Dedicated On-Site (${spkIndukNomor}) berhasil dibuat.` };
		} catch (e: any) {
			console.error("Create Dedicated error:", e);
			return fail(500, { error: e.message || 'Gagal membuat penugasan Dedicated On-Site.' });
		}
	},

	saveOnsiteLogsheet: async ({ request }) => {
		const data = await request.formData();
		const tripId = parseId(data.get('tripId'));
		const jamMuat = (data.get('jamMuat') as string || null);
		const jamBongkar = (data.get('jamBongkar') as string || null);
		const noSuratJalanCustomer = (data.get('noSuratJalanCustomer') as string || '').trim();
		const tonase = parseFloat(data.get('tonase') as string) || 0;
		const catatan = (data.get('catatan') as string || '').trim();

		if (!tripId || !noSuratJalanCustomer) {
			return fail(400, { message: 'Trip ID dan No. Surat Jalan Customer wajib diisi.' });
		}

		try {
			await sql.begin(async (sql) => {
				await sql`
					INSERT INTO fleet.onsite_logsheet (
						trip_id, jam_muat, jam_bongkar, no_surat_jalan_customer, tonase, catatan, created_by
					) VALUES (
						${tripId}, ${jamMuat}, ${jamBongkar}, ${noSuratJalanCustomer}, ${tonase}, ${catatan}, 'OCS Dispatch'
					)
				`;

				// Update accumulated weight in fleet.trip
				await sql`
					UPDATE fleet.trip
					SET actual_weight = (
						SELECT COALESCE(SUM(tonase), 0) FROM fleet.onsite_logsheet WHERE trip_id = ${tripId}
					)
					WHERE id = ${tripId}
				`;
			});
			return { success: true, message: 'Baris logsheet berhasil ditambahkan.' };
		} catch (e: any) {
			console.error("Save logsheet error:", e);
			return fail(500, { error: e.message || 'Gagal menyimpan baris logsheet.' });
		}
	},

	deleteOnsiteLogsheet: async ({ request }) => {
		const data = await request.formData();
		const logsheetId = parseId(data.get('logsheetId'));
		const tripId = parseId(data.get('tripId'));

		if (!logsheetId || !tripId) {
			return fail(400, { message: 'Data logsheet tidak valid.' });
		}

		try {
			await sql.begin(async (sql) => {
				await sql`DELETE FROM fleet.onsite_logsheet WHERE id = ${logsheetId}`;
				await sql`
					UPDATE fleet.trip
					SET actual_weight = (
						SELECT COALESCE(SUM(tonase), 0) FROM fleet.onsite_logsheet WHERE trip_id = ${tripId}
					)
					WHERE id = ${tripId}
				`;
			});
			return { success: true, message: 'Baris logsheet berhasil dihapus.' };
		} catch (e: any) {
			return fail(500, { error: e.message || 'Gagal menghapus baris logsheet.' });
		}
	},

	closeDedicatedDispatch: async ({ request }) => {
		const data = await request.formData();
		const tripId = parseId(data.get('tripId'));
		if (!tripId) return fail(400, { message: 'Trip ID kosong.' });

		try {
			await sql.begin(async (sql) => {
				const trip = await sql`SELECT unit_id, no_surat_tugas FROM fleet.trip WHERE id = ${tripId}`;
				if (trip.length === 0) throw new Error('Penugasan tidak ditemukan.');

				await sql`
					UPDATE fleet.trip
					SET status = 'COMPLETED',
					    arrive_time = NOW()
					WHERE id = ${tripId}
				`;

				if (trip[0].unit_id) {
					await sql`
						UPDATE fleet.unit
						SET current_state = 'AT_POOL'
						WHERE id = ${trip[0].unit_id}
					`;
				}

				if (trip[0].no_surat_tugas) {
					await sql`
						UPDATE marketing.sales_order
						SET status = 'CLOSING'
						WHERE id = ${trip[0].no_surat_tugas}
					`;
				}
			});
			return { success: true, message: 'Penugasan Dedicated On-Site telah selesai / closing.' };
		} catch (e: any) {
			return fail(500, { error: e.message || 'Gagal menutup penugasan dedicated.' });
		}
	}
};
