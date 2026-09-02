import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		// Summary Metrics
		const pendingResult = await sql`SELECT COUNT(*) FROM marketing.sales_order WHERE status IN ('WAITING_UJO', 'WAITING_TARIFF')`;
		const activeResult = await sql`SELECT COUNT(*) FROM fleet.trip WHERE status NOT IN ('COMPLETED', 'CANCELED')`;
		const completedResult = await sql`SELECT COUNT(*) FROM fleet.trip WHERE status = 'COMPLETED' AND tgl_trip = current_date`;
		const ujoResult = await sql`
			SELECT SUM(ca.estimated_ujo) as total 
			FROM finance.cash_advance ca
			JOIN marketing.sales_order so ON so.id = ca.sales_order_id
			WHERE date_trunc('day', ca.created_at) = date_trunc('day', current_date)
			AND so.status NOT IN ('CANCELED')
		`;

		const summary = {
			pendingDispatch: parseInt(pendingResult[0].count),
			activeJourneys: parseInt(activeResult[0].count),
			completedToday: parseInt(completedResult[0].count),
			totalUJO: parseFloat(ujoResult[0].total) || 0
		};

		// Pending DOs (Waiting OCS)
		const pendingDOs = await sql`
			SELECT 
				o.id,
				c.nama_kustomer as customer,
				ori.nama_kustomer as origin,
				dest.nama_kustomer as destination,
				o.jenis_muatan as cargo,
				o.berat_muatan as weight,
				tu.nama_tipe as "vehicleReq",
				o.tgl_muat as "loadingDate",
				COALESCE(o.tariff, 0) as tariff
			FROM marketing.sales_order o
			LEFT JOIN master.m_customer c ON c.id = o.customer_id
			LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
			LEFT JOIN master.m_tipe_unit tu ON tu.id = o.tipe_unit_id
			WHERE o.status = 'WAITING_UJO'
			ORDER BY o.created_at ASC
			LIMIT 5
		`;

		// Active Journeys
		const activeJourneys = await sql`
			SELECT 
				u.nomor_unit as unit,
				COALESCE(d.nama_karyawan, 'No Driver') as driver,
				COALESCE(ori.nama_kustomer, '-') as origin,
				COALESCE(dest.nama_kustomer, '-') as destination,
				o.id as do,
				CASE 
					WHEN t.status = 'DISPATCHED' THEN 10
					WHEN t.status = 'AT_ORIGIN' THEN 20
					WHEN t.status = 'ON_ROUTE' THEN 50
					WHEN t.status = 'AT_DESTINATION' THEN 80
					WHEN t.status = 'RETURNING' THEN 90
					WHEN t.status = 'COMPLETED' THEN 100
					ELSE 0
				END as progress,
				COALESCE(ca.estimated_ujo, 0) as ujo,
				COALESCE(ca.payment_status, 'UNPAID') as "ujoStatus"
			FROM marketing.sales_order o
			LEFT JOIN finance.cash_advance ca ON ca.sales_order_id = o.id
			LEFT JOIN fleet.unit u ON u.id = o.assigned_unit_id
			LEFT JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date AND t.status NOT IN ('COMPLETED', 'CANCELED')
			LEFT JOIN master.m_drivers md ON md.id = o.assigned_driver_id
			LEFT JOIN master.m_karyawan d ON d.id = md.karyawan_id
			LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
			WHERE o.status NOT IN ('COMPLETED', 'CANCELED', 'WAITING_UJO')
			  AND o.assigned_unit_id IS NOT NULL
			ORDER BY o.created_at DESC
			LIMIT 5
		`;

		// Recent Completions
		const recentCompletions = await sql`
			SELECT 
				u.nomor_unit as unit,
				COALESCE(d.nama_karyawan, 'No Driver') as driver,
				t.origin || ' → ' || t.destination as route,
				t.no_surat_tugas as do,
				to_char(COALESCE(t.arrive_time, t.updated_at, t.created_at), 'DD Mon HH24:MI') as "completedAt",
				COALESCE(o.estimated_ujo, 0) as ujo
			FROM fleet.trip t
			LEFT JOIN fleet.unit u ON u.id = t.unit_id
			LEFT JOIN master.m_drivers md ON md.id = t.driver_id
			LEFT JOIN master.m_karyawan d ON d.id = md.karyawan_id
			LEFT JOIN LATERAL (
				SELECT ca.estimated_ujo 
				FROM marketing.sales_order so
				JOIN finance.cash_advance ca ON ca.sales_order_id = so.id
				WHERE so.assigned_unit_id = t.unit_id AND so.tgl_muat::date = t.tgl_trip::date
				ORDER BY so.created_at DESC 
				LIMIT 1
			) o ON true
			WHERE t.status = 'COMPLETED'
			ORDER BY t.updated_at DESC
			LIMIT 5
		`;

		// Daily Target Progress
		const dailyTargets = await sql`
			SELECT 
				c.id,
				p.project_name as project,
				cust.nama_kustomer as customer,
				COALESCE(dp.target_tonnage, c.daily_target_tonnage) as "targetTonnage",
				COALESCE(dp.target_ritase, c.daily_target_ritase) as "targetRitase",
				dp.notes as "planNotes",
				(
					SELECT COALESCE(SUM(o.berat_muatan), 0) 
					FROM marketing.sales_order o 
					JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date AND t.status NOT IN ('CANCELED') 
					WHERE o.contract_id = c.id 
					  AND date_trunc('day', t.tgl_trip) = date_trunc('day', current_date)
				) as "achievedTonnage",
				(
					SELECT COUNT(t.id) 
					FROM fleet.trip t
					JOIN marketing.sales_order o ON o.assigned_unit_id = t.unit_id AND t.tgl_trip::date = o.tgl_muat::date
					WHERE o.contract_id = c.id
					  AND t.status NOT IN ('CANCELED')
					  AND date_trunc('day', t.tgl_trip) = date_trunc('day', current_date)
				) as "achievedRitase"
			FROM marketing.contract c
			LEFT JOIN master.m_project p ON p.id = c.project_id
			LEFT JOIN master.m_customer cust ON cust.id = c.customer_id
			LEFT JOIN operations.contract_daily_plan dp ON dp.contract_id = c.id AND dp.plan_date = current_date
			WHERE c.status = 'Active' AND (c.daily_target_tonnage > 0 OR dp.target_tonnage > 0)
			ORDER BY c.created_at DESC
			LIMIT 4
		`;

		return {
			summary,
			pendingDOs: pendingDOs as any[],
			activeJourneys: activeJourneys as any[],
			recentCompletions: recentCompletions as any[],
			dailyTargets: dailyTargets as any[]
		};
	} catch (error) {
		console.error("Error loading OCS dashboard:", error);
		return {
			summary: { pendingDispatch: 0, activeJourneys: 0, completedToday: 0, totalUJO: 0 },
			pendingDOs: [],
			activeJourneys: [],
			recentCompletions: [],
			dailyTargets: []
		};
	}
};
