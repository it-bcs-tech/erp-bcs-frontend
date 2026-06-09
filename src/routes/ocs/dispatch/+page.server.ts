import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

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
				o.estimated_ujo as "estimatedUjo",
				o.ujo_makan as "ujoMakan",
				o.ujo_tol as "ujoTol",
				u.nomor_unit as "assignedUnit",
				k.nama_karyawan as "assignedDriver",
				o.status,
				ori.latitude as origin_lat,
				dest.latitude as dest_lat
			FROM marketing.sales_order o
			LEFT JOIN master.m_customer c ON c.id = o.customer_id
			LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
			LEFT JOIN fleet.unit u ON u.id = o.assigned_unit_id
			LEFT JOIN master.m_drivers d ON d.id = o.assigned_driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			WHERE o.status NOT IN ('COMPLETED', 'CANCELED')
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
				'Pool' as location
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
			WHERE u.is_active = true 
			  AND u.current_state IN ('AT_POOL')
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
				cust.nama_kustomer as customer,
				COALESCE(ori.nama_kustomer, mori.nama_kustomer) as origin,
				COALESCE(c.origin_id, mru.origin_id) as origin_id,
				COALESCE(dest.nama_kustomer, mdest.nama_kustomer) as destination,
				COALESCE(c.destination_id, mru.destination_id) as destination_id
			FROM marketing.contract c
			LEFT JOIN master.m_customer cust ON cust.id = c.customer_id
			LEFT JOIN master.m_customer ori ON ori.id = c.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = c.destination_id
			LEFT JOIN master.m_rute_ujo mru ON mru.id = c.master_rute_id
			LEFT JOIN master.m_customer mori ON mori.id = mru.origin_id
			LEFT JOIN master.m_customer mdest ON mdest.id = mru.destination_id
			WHERE c.status = 'Active' 
			  AND COALESCE(c.delivered_tonnage, 0) < c.target_tonnage
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
				cargo: 'Sesuai Kontrak',
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

		return {
			orders: ordersResult as any[],
			availableUnits: unitsResult as any[],
			contractOrders
		};
	} catch (error) {
		console.error("Error loading dispatch data:", error);
		return { orders: [], availableUnits: [] };
	}
};

export const actions: Actions = {
	createDoFromPo: async ({ request }) => {
		const data = await request.formData();
		const contractId = data.get('contractId') as string;
		const unitId = data.get('unitId') as string;
		const driverId = data.get('driverId') as string;
		
		if (!contractId || !unitId || !driverId) {
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
						c.jenis_muatan,
						COALESCE(mru.total_ujo, ((c.contract_value / NULLIF(c.target_tonnage, 0)) * (c.max_ujo_percentage / 100))) as fixed_ujo,
						(c.contract_value / NULLIF(c.target_tonnage, 0)) as tariff_per_ton,
						COALESCE(mru.biaya_tol, 0) as ujo_tol,
						COALESCE(mru.uang_makan, 0) as ujo_makan
					FROM marketing.contract c
					LEFT JOIN master.m_rute_ujo mru ON mru.id = c.master_rute_id
					WHERE c.id = ${contractId}
				`;
				if (contractData.length === 0) throw new Error('Kontrak tidak ditemukan.');
				const contract = contractData[0];

				// Get Unit Capacity and Tipe Unit ID
				const unitDataResult = await sql`
					SELECT u.id, mu.tipe_unit_id
					FROM fleet.unit u
					LEFT JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
					WHERE u.id = ${unitId}
				`;
				if (unitDataResult.length === 0) throw new Error('Unit tidak valid.');
				const unitData = unitDataResult[0];
				
				const realCapacity = 30; // Default capacity as DB doesn't have it
				const totalRit = Math.ceil(contract.target_tonnage / realCapacity);
				
				// Re-calculate UJO if it falls back to percentage
				let finalEstimatedUjo = contract.fixed_ujo;
				let finalTariff = contract.contract_value / (totalRit > 0 ? totalRit : 1); // Tariff is exact per trip
				
				// We need to know if we used MRU.
				const mruCheck = await sql`SELECT master_rute_id FROM marketing.contract WHERE id = ${contractId}`;
				if (!mruCheck[0].master_rute_id) {
					finalEstimatedUjo = finalTariff * (contract.max_ujo_percentage / 100);
				}

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

				const doId = `DO-PO-${Date.now().toString().slice(-6)}`;

				await sql`
					INSERT INTO marketing.sales_order (
						id, contract_id, customer_id, origin_id, destination_id,
						tipe_unit_id, jenis_muatan, berat_muatan, tgl_muat, estimated_ujo, 
						ujo_tol, ujo_makan, tariff,
						assigned_unit_id, assigned_driver_id, status, ujo_payment_status
					) VALUES (
						${doId}, ${contractId}, ${contract.customer_id}, ${contract.final_origin_id}, ${contract.final_dest_id},
						${unitData.tipe_unit_id}, ${contract.jenis_muatan || 'Muatan Kontrak'}, ${realCapacity}, CURRENT_DATE, ${finalEstimatedUjo || 0}, 
						${contract.ujo_tol}, ${contract.ujo_makan}, ${finalTariff || 0},
						${unitId}, ${driverId}, 'READY_TO_DISPATCH', 'UNPAID'
					)
				`;

			});

			return { success: true, message: 'Assign Berhasil: Menunggu UJO dicairkan oleh Kasir.' };
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

			const dbUnitId = unitData[0].id;
			const dbDriverId = unitData[0].driver_id;
			const totalUjo = ujoAmount + ujoMakan + ujoTol;

			await sql`
				UPDATE marketing.sales_order 
				SET assigned_unit_id = ${dbUnitId},
					assigned_driver_id = ${dbDriverId},
					estimated_ujo = ${totalUjo},
					ujo_makan = ${ujoMakan},
					ujo_tol = ${ujoTol},
					status = 'WAITING_TARIFF'
				WHERE id = ${orderId}
			`;
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
			await sql`
				UPDATE marketing.sales_order 
				SET status = 'CLOSING',
					real_weight = ${closeWeight},
					extra_cost = ${closeCost},
					extra_cost_desc = ${closeDesc}
				WHERE id = ${orderId}
			`;
			return { success: true, message: 'Order masuk antrian Kasir.' };
		} catch (e: any) {
			console.error("Submit closing error:", e);
			return fail(500, { error: e.message || 'Gagal update status closing.' });
		}
	}
};
