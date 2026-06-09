import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// Summary Metrics
		const pendingResult = await sql`SELECT COUNT(*) FROM marketing.sales_order WHERE status IN ('WAITING_UJO', 'WAITING_TARIFF')`;
		const activeResult = await sql`SELECT COUNT(*) FROM fleet.trip WHERE status NOT IN ('COMPLETED', 'CANCELED')`;
		const completedResult = await sql`SELECT COUNT(*) FROM fleet.trip WHERE status = 'COMPLETED' AND tgl_trip = current_date`;
		const ujoResult = await sql`
			SELECT SUM(estimated_ujo) as total 
			FROM marketing.sales_order 
			WHERE date_trunc('day', created_at) = date_trunc('day', current_date)
			AND status NOT IN ('CANCELED')
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
				t.origin,
				t.destination,
				o.id as do,
				0 as progress, -- Mock progress for now
				COALESCE(o.estimated_ujo, 0) as ujo,
				COALESCE(o.ujo_payment_status, 'UNPAID') as "ujoStatus"
			FROM fleet.trip t
			LEFT JOIN fleet.unit u ON u.id = t.unit_id
			LEFT JOIN master.m_drivers md ON md.id = t.driver_id
			LEFT JOIN master.m_karyawan d ON d.id = md.karyawan_id
			-- Get related DO/Sales Order (assuming 1 DO active per unit right now)
			LEFT JOIN marketing.sales_order o ON o.assigned_unit_id = t.unit_id AND o.status IN ('DISPATCHED', 'CLOSING')
			WHERE t.status NOT IN ('COMPLETED', 'CANCELED')
			ORDER BY t.created_at DESC
			LIMIT 5
		`;

		// Recent Completions
		const recentCompletions = await sql`
			SELECT 
				u.nomor_unit as unit,
				COALESCE(d.nama_karyawan, 'No Driver') as driver,
				t.origin || ' → ' || t.destination as route,
				t.no_surat_tugas as do,
				to_char(t.updated_at, 'DD Mon HH24:MI') as "completedAt",
				COALESCE(o.estimated_ujo, 0) as ujo
			FROM fleet.trip t
			LEFT JOIN fleet.unit u ON u.id = t.unit_id
			LEFT JOIN master.m_drivers md ON md.id = t.driver_id
			LEFT JOIN master.m_karyawan d ON d.id = md.karyawan_id
			LEFT JOIN marketing.sales_order o ON o.assigned_unit_id = t.unit_id
			WHERE t.status = 'COMPLETED'
			ORDER BY t.updated_at DESC
			LIMIT 3
		`;

		return {
			summary,
			pendingDOs: pendingDOs as any[],
			activeJourneys: activeJourneys as any[],
			recentCompletions: recentCompletions as any[]
		};
	} catch (error) {
		console.error("Error loading OCS dashboard:", error);
		return {
			summary: { pendingDispatch: 0, activeJourneys: 0, completedToday: 0, totalUJO: 0 },
			pendingDOs: [],
			activeJourneys: [],
			recentCompletions: []
		};
	}
};
