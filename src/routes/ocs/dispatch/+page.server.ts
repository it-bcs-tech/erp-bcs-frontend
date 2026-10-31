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
			LEFT JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date AND t.status::text NOT IN ('COMPLETED', 'CANCELED')
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

		// Get All Active Units (including Ready at Pool, Active On-Trip, and Open/Proses Work Orders in Maintenance)
		const rawUnitsResult = await sql`
			SELECT 
				u.id as "unitId",
				u.nomor_unit as id,
				u.no_lambung as "noLambung",
				u.tahun,
				mu.nama_produk as brand,
				mu.nama_model as "modelName",
				mu.axle_config as "axleConfig",
				tu.nama_tipe as type,
				COALESCE(tu.kapasitas_tonase, 35) as capacity,
				COALESCE(k.nama_karyawan, 'Sopir Libur (Habis 14 Hari)') as driver,
				d.id as "driverId",
				eligible_driver.days_worked,
				u.current_state,
				'Pool' as location,
				unit_compliance.has_expired_doc,
				unit_compliance.expired_doc_details,
				driver_compliance.has_expired_sim,
				driver_compliance.expired_sim_details,
				active_wo.wo_no,
				active_wo.wo_status,
				active_wo.wo_category,
				active_wo.wo_complaint,
				active_wo.wo_mechanic,
				active_wo.repaired_items as wo_repaired_items,
				active_wo.checklist_items as wo_checklist_items,
				active_trip.no_surat_tugas as trip_no_st,
				active_trip.dispatch_mode as trip_dispatch_mode,
				active_trip.trip_status,
				active_trip.customer as trip_customer,
				active_trip.origin as trip_origin,
				active_trip.destination as trip_destination,
				active_trip.cargo as trip_cargo,
				active_trip.ritase_ke as trip_ritase_ke,
				active_trip.total_ritase_plan as trip_total_plan,
				active_trip.completed_rit_count as trip_completed_rit,
				active_so.so_id,
				active_so.so_status,
				active_so.so_customer,
				active_so.so_origin,
				active_so.so_destination,
				active_so.so_cargo
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
					(
						(d.sim_expiry_date IS NOT NULL AND d.sim_expiry_date < CURRENT_DATE)
						OR
						EXISTS(
							SELECT 1 FROM dms.documents doc 
							WHERE (doc.employee_id = d.id OR (k.id IS NOT NULL AND doc.employee_id = k.id)) AND (doc.expiry_date < CURRENT_DATE OR doc.status = 'EXPIRED')
						)
					) as has_expired_sim,
					(
						SELECT string_agg(detail, ', ') FROM (
							SELECT COALESCE(d.sim_type, 'SIM') || ' (Expired: ' || to_char(d.sim_expiry_date, 'DD/MM/YYYY') || ')' as detail
							WHERE d.sim_expiry_date IS NOT NULL AND d.sim_expiry_date < CURRENT_DATE
							UNION ALL
							SELECT COALESCE(dt.name, doc.title) || ' (Expired: ' || to_char(doc.expiry_date, 'DD/MM/YYYY') || ')' as detail
							FROM dms.documents doc 
							LEFT JOIN dms.m_doc_type dt ON dt.id = doc.doc_type_id 
							WHERE (doc.employee_id = d.id OR (k.id IS NOT NULL AND doc.employee_id = k.id)) AND (doc.expiry_date < CURRENT_DATE OR doc.status = 'EXPIRED')
						) sub
					) as expired_sim_details
			) driver_compliance ON true
			LEFT JOIN LATERAL (
				SELECT 
					w.wo_no,
					w.status as wo_status,
					COALESCE(w.maint_category, 'Perbaikan Reguler') as wo_category,
					COALESCE(w.keluhan_driver, '-') as wo_complaint,
					COALESCE(mk.nama_karyawan, w.mechanic_id, 'Tim Mekanik') as wo_mechanic,
					w.repaired_items,
					w.checklist_items
				FROM fleet.work_orders w
				LEFT JOIN master.m_karyawan mk ON mk.payroll_id = w.mechanic_id
				WHERE REPLACE(w.unit_id, ' ', '') = REPLACE(u.nomor_unit, ' ', '')
				  AND w.status NOT IN ('Closed', 'CLOSED', 'Cancelled', 'CANCELLED')
				ORDER BY w.wo_date DESC, w.id DESC
				LIMIT 1
			) active_wo ON true
			LEFT JOIN LATERAL (
				SELECT 
					t.no_surat_tugas,
					COALESCE(t.dispatch_mode, 'REGULER') as dispatch_mode,
					t.status as trip_status,
					t.customer,
					t.origin,
					t.destination,
					t.cargo,
					COALESCE(t.ritase_ke, 1) as ritase_ke,
					COALESCE(t.total_ritase_plan, 1) as total_ritase_plan,
					(
						SELECT COUNT(*)::int FROM fleet.trip t2
						WHERE t2.group_id IS NOT NULL AND t2.group_id = t.group_id AND t2.status::text = 'COMPLETED'
					) as completed_rit_count
				FROM fleet.trip t
				WHERE t.unit_id = u.id
				  AND t.status::text NOT IN ('COMPLETED', 'CANCELED', 'VOID')
				ORDER BY 
					CASE WHEN t.status::text IN ('IN_TRANSIT', 'LOADING', 'DISPATCHED', 'ACTIVE_ONSITE') THEN 1 ELSE 2 END ASC,
					t.id DESC
				LIMIT 1
			) active_trip ON true
			LEFT JOIN LATERAL (
				SELECT 
					so.id as so_id,
					so.status as so_status,
					c.nama_kustomer as so_customer,
					ori.nama_kustomer as so_origin,
					dest.nama_kustomer as so_destination,
					so.jenis_muatan as so_cargo
				FROM marketing.sales_order so
				LEFT JOIN master.m_customer c ON c.id = so.customer_id
				LEFT JOIN master.m_customer ori ON ori.id = so.origin_id
				LEFT JOIN master.m_customer dest ON dest.id = so.destination_id
				WHERE so.assigned_unit_id = u.id
				  AND so.status NOT IN ('COMPLETED', 'CANCELED')
				ORDER BY so.created_at DESC
				LIMIT 1
			) active_so ON true
			WHERE u.is_active = true
			ORDER BY u.nomor_unit ASC
		`;

		function parseJsonArraySafe(val: any): any[] {
			if (!val) return [];
			let curr = val;
			while (typeof curr === 'string') {
				try {
					curr = JSON.parse(curr);
				} catch {
					break;
				}
			}
			return Array.isArray(curr) ? curr : [];
		}

		const unitsResult = (rawUnitsResult as any[]).map((u) => {
			// 1. Check Active Work Order (Open / Proses / etc.)
			const hasActiveWo = Boolean(u.wo_no);
			let woTotalItems = 0;
			let woResolvedItems = 0;
			let woProgressPct = 0;

			if (hasActiveWo) {
				const repaired = parseJsonArraySafe(u.wo_repaired_items);
				const checklist = parseJsonArraySafe(u.wo_checklist_items);
				const items = repaired.length > 0 ? repaired : checklist;
				woTotalItems = items.length;
				woResolvedItems = items.filter((i: any) => i?.status === 'RESOLVED' || i?.status === 'OK').length;

				if (woTotalItems > 0) {
					woProgressPct = Math.round((woResolvedItems / woTotalItems) * 100);
					// Ensure Open/Proses still shows a visible minimum bar if 0 resolved
					if (woProgressPct === 0 && String(u.wo_status).toLowerCase().includes('proses')) {
						woProgressPct = 25;
					} else if (woProgressPct === 0) {
						woProgressPct = 10;
					}
				} else {
					const st = String(u.wo_status || 'Open').toUpperCase();
					if (st.includes('REINSPECT')) woProgressPct = 90;
					else if (st.includes('PROSES') || st.includes('PROGRESS')) woProgressPct = 55;
					else if (st.includes('DISPENSATION')) woProgressPct = 75;
					else woProgressPct = 15; // Open
				}
			}

			// 2. Check Active Trip / Sales Order / Non-Pool State
			const isNonPoolState = u.current_state && !['AT_POOL', 'STANDBY'].includes(u.current_state);
			const hasActiveTrip = !hasActiveWo && Boolean(u.trip_status || u.so_status || isNonPoolState);

			let tripProgressPct = 0;
			let tripStageLabel = '';
			let tripRoute = '';
			let tripCustomer = '';
			let tripDetailText = '';

			if (hasActiveTrip) {
				tripCustomer = u.trip_customer || u.so_customer || 'Pelanggan';
				const ori = u.trip_origin || u.so_origin || 'Origin';
				const dest = u.trip_destination || u.so_destination || 'Destination';
				tripRoute = `${ori} → ${dest}`;

				const mode = String(u.trip_dispatch_mode || 'REGULER').toUpperCase();
				const rawStatus = String(u.trip_status || u.so_status || u.current_state || 'ON_TRIP').toUpperCase();

				if (mode === 'NGEPOK') {
					const totalPlan = Math.max(1, Number(u.trip_total_plan) || 1);
					const completed = Number(u.trip_completed_rit) || 0;
					const currentRit = Math.min(totalPlan, completed + 1);
					tripProgressPct = Math.min(95, Math.max(15, Math.round(((completed + 0.5) / totalPlan) * 100)));
					tripStageLabel = `Ngepok Rit ${currentRit}/${totalPlan}`;
					tripDetailText = `${completed} dari ${totalPlan} Rit Selesai • ${u.trip_cargo || '-'}`;
				} else if (mode === 'DEDICATED_ONSITE' || rawStatus === 'ACTIVE_ONSITE') {
					tripProgressPct = 60;
					tripStageLabel = 'Dedicated On-Site';
					tripDetailText = `Aktif Standby On-Site • ${u.trip_cargo || '-'}`;
				} else {
					if (rawStatus.includes('RETURN')) {
						tripProgressPct = 90;
						tripStageLabel = 'Perjalanan Pulang Pool';
					} else if (rawStatus.includes('DESTINATION') || rawStatus.includes('UNLOAD') || rawStatus.includes('CLOSING')) {
						tripProgressPct = 80;
						tripStageLabel = 'Bongkar Muatan (Tujuan)';
					} else if (rawStatus.includes('TRANSIT') || rawStatus.includes('ON_TRIP') || rawStatus.includes('DISPATCHED')) {
						tripProgressPct = 60;
						tripStageLabel = 'Dalam Perjalanan (In Transit)';
					} else if (rawStatus.includes('LOAD')) {
						tripProgressPct = 35;
						tripStageLabel = 'Proses Muat (Loading)';
					} else {
						tripProgressPct = 20;
						tripStageLabel = `Order Aktif (${rawStatus.replace(/_/g, ' ')})`;
					}
					tripDetailText = `${u.trip_no_st || (u.so_id ? 'SO #' + u.so_id : 'Trip Aktif')} • ${u.trip_cargo || u.so_cargo || '-'}`;
				}
			}

			// 3. Determine Operational Group
			const hasNoDriver = !u.driverId || String(u.driver).includes('Libur');
			const isNonCompliant = Boolean(u.has_expired_doc || u.has_expired_sim || hasNoDriver);

			let operationalGroup: 'READY' | 'ON_TRIP' | 'WORK_ORDER' | 'EXPIRED' = 'READY';
			if (hasActiveWo) {
				operationalGroup = 'WORK_ORDER';
			} else if (hasActiveTrip) {
				operationalGroup = 'ON_TRIP';
			} else if (isNonCompliant) {
				operationalGroup = 'EXPIRED';
			} else {
				operationalGroup = 'READY';
			}

			return {
				...u,
				has_active_wo: hasActiveWo,
				wo_total_items: woTotalItems,
				wo_resolved_items: woResolvedItems,
				wo_progress_pct: woProgressPct,
				has_active_trip: hasActiveTrip,
				trip_progress_pct: tripProgressPct,
				trip_stage_label: tripStageLabel,
				trip_route: tripRoute,
				trip_customer_name: tripCustomer,
				trip_detail_text: tripDetailText,
				operational_group: operationalGroup
			};
		});

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
		let availableUnitsPool = unitsResult.filter((u: any) => u.operational_group === 'READY'); // copy to keep track of assigned READY units in this session

		console.log("Active Contracts found:", activeContracts.length);
		if (activeContracts.length > 0) {
			console.log("First active contract:", activeContracts[0].contract_id);
		}

		for (const contract of activeContracts) {
			// AI Logic: Find best unit that is AT_POOL, driver days < 14, and compliant (docs + SIM valid)
			// unitsResult is already filtered and sorted by days_worked ASC
			let bestUnit = availableUnitsPool.find(u => u.driverId && u.days_worked < 14 && !u.has_expired_doc && !u.has_expired_sim);
			
			if (bestUnit) {
				// Remove the chosen unit from the pool so it doesn't get assigned to the next contract
				availableUnitsPool = availableUnitsPool.filter(u => u.unitId !== bestUnit?.unitId);
			}
			
			// Find up to 5 alternatives (strictly compliant units only)
			let alternatives = availableUnitsPool
				.filter(u => u.driverId && u.days_worked < 14 && !u.has_expired_doc && !u.has_expired_sim && (!bestUnit || u.unitId !== bestUnit.unitId))
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
				has_expired_doc: bestUnit ? Boolean(bestUnit.has_expired_doc) : false,
				has_expired_sim: bestUnit ? Boolean(bestUnit.has_expired_sim) : false,
				ai_reason: bestUnit 
					? `Rekomendasi AI: Unit ready di Pool & dokumen lengkap/valid. Sopir baru bekerja ${bestUnit.days_worked} hari bulan ini.` 
					: `PERINGATAN: Saat ini tidak ada armada di Pool dengan supir aktif dan dokumen kepatuhan (KIR, STNK, SIM) yang valid. Kontrak belum dapat didispatch.`,
				alternatives: alternatives
			});
		}

		console.log("Contract Orders length:", contractOrders.length);

		// Fetch Pool data for dynamic geofencing in UI
		const poolsResult = await sql`SELECT id, nama_pool, latitude, longitude, COALESCE(geofence_radius, 500) as radius FROM master.m_pool`;

		// Fetch Products for borongan contracts
		const products = await sql`SELECT id, nama_produk as name FROM master.m_produk ORDER BY nama_produk ASC`;

		// Fetch Customers list
		const customers = await sql`SELECT id, nama_kustomer FROM master.m_customer WHERE is_active = true ORDER BY nama_kustomer ASC`;

		// Fetch Master Rute UJO for OCS route selection during dispatch
		const masterRutesResult = await sql`
			SELECT 
				r.id,
				r.origin_id,
				r.destination_id,
				r.tipe_unit_id,
				ori.nama_kustomer as origin_name,
				dest.nama_kustomer as destination_name,
				tu.nama_tipe as tipe_unit_name,
				r.jarak_km,
				r.biaya_solar,
				r.biaya_tol,
				r.uang_makan,
				r.total_ujo
			FROM master.m_rute_ujo r
			JOIN master.m_customer ori ON ori.id = r.origin_id
			JOIN master.m_customer dest ON dest.id = r.destination_id
			JOIN master.m_tipe_unit tu ON tu.id = r.tipe_unit_id
			ORDER BY ori.nama_kustomer ASC, dest.nama_kustomer ASC
		`;

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
				t.no_surat_tugas,
				t.status,
				t.tgl_trip,
				t.customer,
				t.origin,
				t.destination,
				t.cargo,
				t.remark as periode_shift,
				t.actual_weight,
				COALESCE(t.uang_harian, 0) as uang_harian,
				COALESCE(t.insentif_per_rit, 0) as insentif_per_rit,
				COALESCE(t.total_ujo, 0) as total_ujo,
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
			dedicatedDispatches: dedicatedList,
			masterRutes: masterRutesResult as any[]
		};
	} catch (error) {
		console.error("Error loading dispatch data:", error);
		return {
			orders: [],
			availableUnits: [],
			contractOrders: [],
			pools: [],
			products: [],
			customers: [],
			ngepokBatches: [],
			dedicatedDispatches: [],
			masterRutes: []
		};
	}
};

function parseId(val: any): number | null {
	if (val === null || val === undefined) return null;
	const str = String(val).trim();
	if (str === '' || str === 'null' || str === 'undefined') return null;
	const num = parseInt(str, 10);
	return isNaN(num) ? null : num;
}

/**
 * Validasi kepatuhan armada (DMS) & SIM pengemudi sebelum dispatch
 */
async function validateDispatchCompliance(
	sqlClient: any,
	unitId: number | null,
	driverId: number | null
): Promise<{ valid: boolean; reason?: string }> {
	if (!unitId) {
		return { valid: false, reason: 'ID Armada/Unit tidak valid.' };
	}

	// 1. Validasi Dokumen Kepatuhan Armada di DMS (Uji KIR, STNK, Pajak Tahunan, Izin Limbah B3, dll.)
	const unitDocs = await sqlClient`
		SELECT 
			COALESCE(dt.name, doc.title) as doc_name,
			doc.expiry_date,
			doc.status
		FROM dms.documents doc
		LEFT JOIN dms.m_doc_type dt ON dt.id = doc.doc_type_id
		WHERE doc.asset_id = ${unitId} 
		  AND (doc.expiry_date < CURRENT_DATE OR doc.status = 'EXPIRED')
	`;

	if (unitDocs.length > 0) {
		const docDetails = unitDocs.map((d: any) => {
			const expStr = d.expiry_date ? new Date(d.expiry_date).toLocaleDateString('id-ID') : 'Expired';
			return `${d.doc_name} (Expired: ${expStr})`;
		}).join(', ');
		return {
			valid: false,
			reason: `Armada memiliki dokumen kepatuhan kedaluwarsa: ${docDetails}. Wajib diperbarui di DMS sebelum armada dapat didispatch.`
		};
	}

	// 2. Validasi Kepatuhan Pengemudi & SIM
	if (!driverId) {
		return {
			valid: false,
			reason: 'Armada belum memiliki pengemudi aktif yang ditugaskan. Pengemudi wajib terpasang dan valid untuk proses dispatch.'
		};
	}

	// Cek master.m_drivers
	const driverRes = await sqlClient`
		SELECT 
			d.id,
			d.karyawan_id,
			d.sim_expiry_date,
			d.sim_type,
			k.nama_karyawan
		FROM master.m_drivers d
		LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
		WHERE d.id = ${driverId}
	`;

	if (driverRes.length === 0) {
		return {
			valid: false,
			reason: `Data pengemudi (ID: ${driverId}) tidak ditemukan di Master Pengemudi.`
		};
	}

	const drv = driverRes[0];
	const simExp = drv.sim_expiry_date ? new Date(drv.sim_expiry_date) : null;
	const now = new Date();
	now.setHours(0, 0, 0, 0);

	if (simExp && simExp < now) {
		const expStr = simExp.toLocaleDateString('id-ID');
		return {
			valid: false,
			reason: `SIM Pengemudi (${drv.nama_karyawan}) telah kedaluwarsa sejak ${expStr} (${drv.sim_type || 'SIM'}). Pengemudi dilarang jalan.`
		};
	}

	// Cek dms.documents untuk dokumen pengemudi (SIM, Sertifikat B3, dsb)
	const driverDocs = await sqlClient`
		SELECT 
			COALESCE(dt.name, doc.title) as doc_name,
			doc.expiry_date,
			doc.status
		FROM dms.documents doc
		LEFT JOIN dms.m_doc_type dt ON dt.id = doc.doc_type_id
		WHERE (doc.employee_id = ${drv.id} OR (doc.employee_id IS NOT NULL AND ${drv.karyawan_id || null} IS NOT NULL AND doc.employee_id = ${drv.karyawan_id}))
		  AND (doc.expiry_date < CURRENT_DATE OR doc.status = 'EXPIRED')
	`;

	if (driverDocs.length > 0) {
		const docDetails = driverDocs.map((d: any) => {
			const expStr = d.expiry_date ? new Date(d.expiry_date).toLocaleDateString('id-ID') : 'Expired';
			return `${d.doc_name} (Expired: ${expStr})`;
		}).join(', ');
		return {
			valid: false,
			reason: `Pengemudi (${drv.nama_karyawan}) memiliki dokumen kepatuhan kedaluwarsa: ${docDetails}. Wajib diperbarui sebelum dispatch.`
		};
	}

	return { valid: true };
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

				const ruteUjoId = parseId(data.get('ruteUjoId'));
				if (ruteUjoId) {
					const rRows = await sql`
						SELECT id, origin_id, destination_id, total_ujo, biaya_tol, uang_makan, biaya_solar 
						FROM master.m_rute_ujo 
						WHERE id = ${ruteUjoId}
					`;
					if (rRows.length > 0) {
						const chosenRute = rRows[0];
						contract.final_origin_id = chosenRute.origin_id || contract.final_origin_id;
						contract.final_dest_id = chosenRute.destination_id || contract.final_dest_id;
						contract.fixed_ujo = parseFloat(chosenRute.total_ujo || '0');
						contract.ujo_tol = parseFloat(chosenRute.biaya_tol || '0');
						contract.ujo_makan = parseFloat(chosenRute.uang_makan || '0');

						await sql`
							UPDATE marketing.contract 
							SET master_rute_id = ${chosenRute.id} 
							WHERE id = ${contractId} AND master_rute_id IS NULL
						`;
					}
				}

				const customTotalUjo = data.get('customTotalUjo');
				const customUjoTol = data.get('customUjoTol');
				const customUjoMakan = data.get('customUjoMakan');
				if (customTotalUjo && !isNaN(parseFloat(customTotalUjo as string))) {
					contract.fixed_ujo = parseFloat(customTotalUjo as string);
				}
				if (customUjoTol && !isNaN(parseFloat(customUjoTol as string))) {
					contract.ujo_tol = parseFloat(customUjoTol as string);
				}
				if (customUjoMakan && !isNaN(parseFloat(customUjoMakan as string))) {
					contract.ujo_makan = parseFloat(customUjoMakan as string);
				}

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

					// Compliance Check: Block dispatch if armada docs or driver SIM is expired
					const compliance = await validateDispatchCompliance(sql, assignment.unitId, resolvedDriverId);
					if (!compliance.valid) {
						throw new Error(`Gagal Dispatch: ${compliance.reason}`);
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

					// Update unit status to ON_DUTY
					await sql`
						UPDATE fleet.unit
						SET current_state = 'ON_DUTY'
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

			// Compliance Check: Block assign if unit docs or driver SIM is expired
			const compliance = await validateDispatchCompliance(sql, dbUnitId, dbDriverId);
			if (!compliance.valid) {
				return fail(400, { message: `Gagal Assign: ${compliance.reason}` });
			}

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
		const originIdRaw = data.get('originId') as string;
		const destIdRaw = data.get('destinationId') as string;
		const ruteUjoId = data.get('ruteUjoId') as string || null;
		const cargoName = (data.get('cargoName') as string || 'Muatan Shuttle / Ngepok').trim();
		const loadingDate = data.get('loadingDate') as string || null;
		const planRitase = parseInt(data.get('planRitase') as string, 10) || 1;
		const ujoPerRit = parseFloat(data.get('ujoPerRit') as string) || 0;
		const ujoMakan = parseFloat(data.get('ujoMakan') as string) || 0;
		const ujoTol = parseFloat(data.get('ujoTol') as string) || 0;

		const unitIdsRaw = data.get('unitIds') as string;
		let assignments: { unitId: number, driverId: number | null }[] = [];
		if (unitIdsRaw) {
			try {
				const parsed = JSON.parse(unitIdsRaw);
				const arr = Array.isArray(parsed) ? parsed : [parsed];
				assignments = arr.map((p: any) => {
					const parts = String(p).split('|');
					return { unitId: parseId(parts[0])!, driverId: parseId(parts[1]) };
				}).filter(a => a.unitId !== null);
			} catch(e) {}
		}
		if (assignments.length === 0) {
			const u = parseId(data.get('unitId'));
			const d = parseId(data.get('driverId'));
			if (u) assignments.push({ unitId: u, driverId: d });
		}

		const originId = parseId(originIdRaw);
		const destId = parseId(destIdRaw);

		if (assignments.length === 0 || planRitase < 1) {
			return fail(400, { message: 'Minimal 1 unit armada dan Plan Ritase wajib diisi.' });
		}

		try {
			await sql.begin(async (sql) => {
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

				if (ruteUjoId && (!finalOriginId || !finalDestId)) {
					const rData = await sql`SELECT origin_id, destination_id FROM master.m_rute_ujo WHERE id = ${parseId(ruteUjoId)}`;
					if (rData.length > 0) {
						finalOriginId = finalOriginId || rData[0].origin_id;
						finalDestId = finalDestId || rData[0].destination_id;
					}
				}

				const originRes = finalOriginId ? await sql`SELECT nama_kustomer FROM master.m_customer WHERE id = ${finalOriginId}` : [];
				const destRes = finalDestId ? await sql`SELECT nama_kustomer FROM master.m_customer WHERE id = ${finalDestId}` : [];
				const originName = originRes.length > 0 ? originRes[0].nama_kustomer : 'Pool / Origin';
				const destName = destRes.length > 0 ? destRes[0].nama_kustomer : 'Lokasi Tujuan';

				for (let aIdx = 0; aIdx < assignments.length; aIdx++) {
					const { unitId, driverId: initialDriverId } = assignments[aIdx];
					let driverId = initialDriverId;
					if (!driverId) {
						const dRes = await sql`
							SELECT driver_id FROM fleet.unit_driver_assignment 
							WHERE unit_id = ${unitId} AND is_aktif = true 
							ORDER BY CASE WHEN posisi = 'SUPIR_UTAMA' THEN 1 ELSE 2 END ASC LIMIT 1
						`;
						if (dRes.length > 0) driverId = parseId(dRes[0].driver_id);
					}

					// Compliance Check
					const compliance = await validateDispatchCompliance(sql, unitId, driverId);
					if (!compliance.valid) {
						throw new Error(`Gagal Dispatch Ngepok (Unit #${unitId}): ${compliance.reason}`);
					}

					const dateSuffix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
					const randomSuffix = Math.floor(100 + Math.random() * 900);
					const groupId = `NPK-${dateSuffix}-${randomSuffix}-${aIdx + 1}`;
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
						SET current_state = 'ON_DUTY'
						WHERE id = ${unitId}
					`;
				}
			});

			return { success: true, message: `Batch Penugasan Ngepok (${planRitase} Rit) berhasil dibuat untuk ${assignments.length} armada.` };
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

				// Compliance Check: Block ritase susulan if armada docs or driver SIM is expired
				const compliance = await validateDispatchCompliance(sql, parseId(lastTrip.unit_id), parseId(lastTrip.driver_id));
				if (!compliance.valid) {
					throw new Error(`Gagal Tambah Ritase Susulan: ${compliance.reason}`);
				}

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
		const periodeShift = (data.get('periodeShift') as string || 'Shift 1 (08:00 - 16:00)').trim();
		const originIdRaw = data.get('originId') as string;
		const destIdRaw = data.get('destinationId') as string;
		const cargoName = (data.get('cargoName') as string || 'Muatan On-Site').trim();
		const tglTrip = data.get('tglTrip') as string || null;
		const uangHarianRaw = data.get('uangHarian') as string;
		const uangHarian = Math.max(0, parseFloat(uangHarianRaw) || 100000);

		const unitIdsRaw = data.get('unitIds') as string;
		let assignments: { unitId: number, driverId: number | null }[] = [];
		if (unitIdsRaw) {
			try {
				const parsed = JSON.parse(unitIdsRaw);
				const arr = Array.isArray(parsed) ? parsed : [parsed];
				assignments = arr.map((p: any) => {
					const parts = String(p).split('|');
					return { unitId: parseId(parts[0])!, driverId: parseId(parts[1]) };
				}).filter(a => a.unitId !== null);
			} catch(e) {}
		}
		if (assignments.length === 0) {
			const u = parseId(data.get('unitId'));
			const d = parseId(data.get('driverId'));
			if (u) assignments.push({ unitId: u, driverId: d });
		}

		const customerId = parseId(customerIdRaw);
		const originId = parseId(originIdRaw);
		const destId = parseId(destIdRaw);

		if (assignments.length === 0) {
			return fail(400, { message: 'Minimal 1 unit armada wajib dipilih.' });
		}

		try {
			await sql.begin(async (sql) => {
				let custName = 'Customer Dedicated';
				if (customerId) {
					const custRes = await sql`SELECT nama_kustomer FROM master.m_customer WHERE id = ${customerId}`;
					if (custRes.length > 0) custName = custRes[0].nama_kustomer;
				}
				const originRes = originId ? await sql`SELECT nama_kustomer FROM master.m_customer WHERE id = ${originId}` : [];
				const destRes = destId ? await sql`SELECT nama_kustomer FROM master.m_customer WHERE id = ${destId}` : [];
				const originName = originRes.length > 0 ? originRes[0].nama_kustomer : 'Area On-Site A';
				const destName = destRes.length > 0 ? destRes[0].nama_kustomer : 'Area On-Site B';

				for (let aIdx = 0; aIdx < assignments.length; aIdx++) {
					const { unitId, driverId: initialDriverId } = assignments[aIdx];
					let driverId = initialDriverId;
					if (!driverId) {
						const dRes = await sql`
							SELECT driver_id FROM fleet.unit_driver_assignment 
							WHERE unit_id = ${unitId} AND is_aktif = true 
							ORDER BY CASE WHEN posisi = 'SUPIR_UTAMA' THEN 1 ELSE 2 END ASC LIMIT 1
						`;
						if (dRes.length > 0) driverId = parseId(dRes[0].driver_id);
					}

					// Compliance Check: Block dispatch if armada docs or driver SIM is expired
					const compliance = await validateDispatchCompliance(sql, unitId, driverId);
					if (!compliance.valid) {
						throw new Error(`Gagal Dispatch Dedicated (Unit #${unitId}): ${compliance.reason}`);
					}

					const dateSuffix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
					const randomSuffix = Math.floor(100 + Math.random() * 900);
					const sessionId = `SES-DED-${dateSuffix}-${randomSuffix}-${aIdx + 1}`;

					// 1. Insert into marketing.sales_order (Draft/Dispatched SO untuk tracking internal)
					await sql`
						INSERT INTO marketing.sales_order (
							id, customer_id, origin_id, destination_id,
							jenis_muatan, berat_muatan, tgl_muat, tariff,
							assigned_unit_id, assigned_driver_id, status,
							dispatch_mode
						) VALUES (
							${sessionId}, ${customerId}, ${originId}, ${destId},
							${cargoName}, 0, ${tglTrip ? new Date(tglTrip) : sql`NOW()`}, 0,
							${unitId}, ${driverId}, 'DISPATCHED',
							'DEDICATED_ONSITE'
						)
					`;

					// 2. Insert into fleet.trip (Sesi On-Site aktif; Surat Tugas resmi terbit saat closing)
					await sql`
						INSERT INTO fleet.trip (
							no_surat_tugas, spk_induk_nomor, dispatch_mode,
							tgl_trip, unit_id, driver_id, customer,
							origin_id, destination_id, origin, destination, cargo,
							status, remark, uang_harian, insentif_per_rit, total_ujo, created_by
						) VALUES (
							${sessionId}, ${sessionId}, 'DEDICATED_ONSITE',
							${tglTrip ? new Date(tglTrip).toISOString().split('T')[0] : sql`CURRENT_DATE`},
							${unitId}, ${driverId}, ${custName},
							${originId}, ${destId}, ${originName}, ${destName}, ${cargoName},
							'DISPATCHED', ${periodeShift}, ${uangHarian}, 0, ${uangHarian}, 'OCS Dispatch'
						)
					`;

					// 3. Update fleet.unit current_state menjadi ON_DUTY
					await sql`
						UPDATE fleet.unit
						SET current_state = 'ON_DUTY'
						WHERE id = ${unitId}
					`;
				}
			});

			return { success: true, message: `Check-in Shift Dedicated berhasil untuk ${assignments.length} unit armada standby on-site.` };
		} catch (e: any) {
			console.error("Create Dedicated error:", e);
			return fail(500, { error: e.message || 'Gagal memulai penugasan Dedicated On-Site.' });
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
		const noSuratTugas = (data.get('noSuratTugas') as string || '').trim();
		const uangHarianRaw = data.get('uangHarian') as string;
		const insentifPerRitRaw = data.get('insentifPerRit') as string;
		const catatanClosing = (data.get('catatanClosing') as string || '').trim();

		const uangHarian = Math.max(0, parseFloat(uangHarianRaw) || 0);
		const insentifPerRit = Math.max(0, parseFloat(insentifPerRitRaw) || 0);

		if (!tripId) return fail(400, { message: 'Trip ID kosong.' });
		if (!noSuratTugas) return fail(400, { message: 'Nomor Surat Tugas resmi wajib diisi saat closing shift.' });

		try {
			await sql.begin(async (sql) => {
				const trip = await sql`SELECT unit_id, driver_id, no_surat_tugas, remark FROM fleet.trip WHERE id = ${tripId}`;
				if (trip.length === 0) throw new Error('Penugasan tidak ditemukan.');

				// 1. Ambil seluruh logsheet tarikan
				const ls = await sql`SELECT id, tonase FROM fleet.onsite_logsheet WHERE trip_id = ${tripId}`;
				const totalRit = ls.length;
				const totalTonase = ls.reduce((acc, r) => acc + (parseFloat(r.tonase) || 0), 0);
				const totalUjo = uangHarian + (insentifPerRit * totalRit);

				// 2. Update status trip & simpan nomor Surat Tugas resmi
				const updatedRemark = catatanClosing 
					? (trip[0].remark ? `${trip[0].remark} | Closing: ${catatanClosing}` : `Closing: ${catatanClosing}`)
					: trip[0].remark;

				await sql`
					UPDATE fleet.trip
					SET no_surat_tugas = ${noSuratTugas},
					    status = 'COMPLETED',
					    arrive_time = NOW(),
					    actual_weight = ${totalTonase},
					    uang_harian = ${uangHarian},
					    insentif_per_rit = ${insentifPerRit},
					    total_ujo = ${totalUjo},
					    remark = ${updatedRemark}
					WHERE id = ${tripId}
				`;

				// 3. Kembalikan armada ke AT_POOL
				if (trip[0].unit_id) {
					await sql`
						UPDATE fleet.unit
						SET current_state = 'AT_POOL'
						WHERE id = ${trip[0].unit_id}
					`;
				}

				// 4. Update sales order
				if (trip[0].no_surat_tugas) {
					await sql`
						UPDATE marketing.sales_order
						SET status = 'CLOSING'
						WHERE id = ${trip[0].no_surat_tugas} OR id = ${noSuratTugas}
					`;
				}

				// 5. Catat hak UJO supir ke finance.cash_advance
				const existingCa = await sql`SELECT id FROM finance.cash_advance WHERE trip_id = ${tripId}`;
				if (existingCa.length > 0) {
					await sql`
						UPDATE finance.cash_advance
						SET estimated_ujo = ${totalUjo},
						    ujo_makan = ${uangHarian},
						    extra_cost = ${insentifPerRit * totalRit},
						    extra_cost_desc = ${'Insentif ' + totalRit + ' ritase dedicated'}
						WHERE id = ${existingCa[0].id}
					`;
				} else if (trip[0].driver_id) {
					await sql`
						INSERT INTO finance.cash_advance (
							trip_id, unit_id, driver_id, estimated_ujo, ujo_makan, extra_cost, extra_cost_desc, payment_status, created_by
						) VALUES (
							${tripId}, ${trip[0].unit_id}, ${trip[0].driver_id}, ${totalUjo}, ${uangHarian}, ${insentifPerRit * totalRit},
							${'Insentif ' + totalRit + ' ritase dedicated'}, 'APPROVED', 'OCS Dedicated Closing'
						)
					`;
				}
			});

			return { success: true, message: `Penugasan Dedicated On-Site selesai. Surat Tugas resmi ${noSuratTugas} diterbitkan.` };
		} catch (e: any) {
			console.error("Close Dedicated error:", e);
			return fail(500, { error: e.message || 'Gagal menutup penugasan dedicated.' });
		}
	}
};
