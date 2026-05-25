import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
	
	try {
		// Metrics
		const totalUjoPaidResult = await sql`
			SELECT SUM(estimated_ujo) as total 
			FROM marketing.sales_order 
			WHERE ujo_payment_status = 'PAID' AND status NOT IN ('CANCELED')
		`;
		const totalUjoPaid = parseFloat(totalUjoPaidResult[0].total) || 0;

		const pendingUjoCountResult = await sql`
			SELECT COUNT(*) as count 
			FROM marketing.sales_order 
			WHERE ujo_payment_status = 'UNPAID' AND status IN ('READY_TO_DISPATCH', 'DISPATCHED', 'CLOSING', 'COMPLETED')
		`;

		const pendingDnCountResult = await sql`
			SELECT COUNT(*) as count 
			FROM marketing.sales_order 
			WHERE closing_payment_status = 'UNPAID' AND status = 'CLOSING'
		`;

		// Pending UJO Requests (Top 5)
		const pendingUjoRequests = await sql`
			SELECT 
				o.id,
				COALESCE(k.nama_karyawan, 'No Driver') as driver,
				u.nomor_unit as unit,
				o.estimated_ujo as amount,
				ori.nama_kustomer || ' → ' || dest.nama_kustomer as route,
				o.status
			FROM marketing.sales_order o
			LEFT JOIN fleet.unit u ON u.id = o.assigned_unit_id
			LEFT JOIN master.m_drivers d ON d.id = o.assigned_driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
			WHERE o.ujo_payment_status = 'UNPAID' AND o.status IN ('READY_TO_DISPATCH', 'DISPATCHED', 'CLOSING', 'COMPLETED')
			ORDER BY o.created_at ASC
			LIMIT 5
		`;

		// Pending DN Settlements (Top 5)
		const pendingDNSettlements = await sql`
			SELECT 
				o.id,
				c.nama_kustomer as customer,
				COALESCE(k.nama_karyawan, 'No Driver') as driver,
				o.extra_cost as "extraCost",
				o.extra_cost_desc as desc,
				'Pending Settlement' as status
			FROM marketing.sales_order o
			LEFT JOIN master.m_customer c ON c.id = o.customer_id
			LEFT JOIN fleet.unit u ON u.id = o.assigned_unit_id
			LEFT JOIN master.m_drivers d ON d.id = o.assigned_driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			WHERE o.closing_payment_status = 'UNPAID' AND o.status = 'CLOSING'
			ORDER BY o.created_at ASC
			LIMIT 5
		`;

		return {
			today,
			cashSummary: {
				cashIn: 0, // Need full finance tables for this
				cashOut: totalUjoPaid,
				netCash: -totalUjoPaid,
				pendingUjo: parseInt(pendingUjoCountResult[0].count),
				pendingDn: parseInt(pendingDnCountResult[0].count)
			},
			pendingUjoRequests: pendingUjoRequests as any[],
			pendingDNSettlements: pendingDNSettlements as any[],
			pendingInvoices: [], // Kasir Invoicing is out of scope for now
			recentTransactions: [], // Will require finance transaction table
			weeklyChart: [
				{ day: 'Sen', cashIn: 0, cashOut: 0 },
				{ day: 'Sel', cashIn: 0, cashOut: 0 },
				{ day: 'Rab', cashIn: 0, cashOut: 0 },
				{ day: 'Kam', cashIn: 0, cashOut: 0 },
				{ day: 'Jum', cashIn: 0, cashOut: 0 },
				{ day: 'Sab', cashIn: 0, cashOut: 0 },
				{ day: 'Min', cashIn: 0, cashOut: 0 },
			],
		};
	} catch (error) {
		console.error("Kasir Dashboard Error:", error);
		return {
			today,
			cashSummary: { cashIn: 0, cashOut: 0, netCash: 0, pendingUjo: 0, pendingDn: 0 },
			pendingUjoRequests: [],
			pendingDNSettlements: [],
			pendingInvoices: [],
			recentTransactions: [],
			weeklyChart: []
		};
	}
};
