import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

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
			FROM finance.cash_advance 
			WHERE payment_status = 'UNPAID'
		`;

		const pendingDnCountResult = await sql`
			SELECT COUNT(*) as count 
			FROM finance.cash_advance ca
			JOIN marketing.sales_order o ON o.id = ca.sales_order_id
			WHERE ca.extra_cost_payment_status = 'UNPAID' AND o.status = 'CLOSING'
		`;

		// Pending UJO Requests (Top 5)
		const pendingUjoRequests = await sql`
			SELECT 
				o.id,
				COALESCE(k.nama_karyawan, 'No Driver') as driver,
				u.nomor_unit as unit,
				ca.estimated_ujo as amount,
				ori.nama_kustomer || ' → ' || dest.nama_kustomer as route,
				o.status
			FROM finance.cash_advance ca
			JOIN marketing.sales_order o ON o.id = ca.sales_order_id
			LEFT JOIN fleet.unit u ON u.id = ca.unit_id
			LEFT JOIN master.m_drivers d ON d.id = ca.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
			WHERE ca.payment_status = 'UNPAID' AND o.status IN ('READY_TO_DISPATCH', 'DISPATCHED', 'CLOSING', 'COMPLETED')
			ORDER BY o.created_at ASC
			LIMIT 5
		`;

		// Pending DN Settlements (Top 5)
		const pendingDNSettlements = await sql`
			SELECT 
				o.id,
				c.nama_kustomer as customer,
				COALESCE(k.nama_karyawan, 'No Driver') as driver,
				ca.extra_cost as "extraCost",
				ca.extra_cost_desc as desc,
				'Pending Settlement' as status
			FROM finance.cash_advance ca
			JOIN marketing.sales_order o ON o.id = ca.sales_order_id
			LEFT JOIN master.m_customer c ON c.id = o.customer_id
			LEFT JOIN fleet.unit u ON u.id = o.assigned_unit_id
			LEFT JOIN master.m_drivers d ON d.id = o.assigned_driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			WHERE ca.extra_cost_payment_status = 'UNPAID' AND o.status = 'CLOSING'
			ORDER BY o.created_at ASC
			LIMIT 5
		`;

		// Cash Ledger Totals
		const totalsResult = await sql`
			SELECT 
				COALESCE(SUM(CASE WHEN direction = 'IN' THEN amount ELSE 0 END), 0) as "cashIn",
				COALESCE(SUM(CASE WHEN direction = 'OUT' THEN amount ELSE 0 END), 0) as "cashOut"
			FROM finance.kasir_cash_ledger
		`;
		const cashIn = parseFloat(totalsResult[0].cashIn) || 0;
		const cashOutLedger = parseFloat(totalsResult[0].cashOut) || 0;
		const cashOut = cashOutLedger > 0 ? cashOutLedger : totalUjoPaid;
		const netCash = cashIn - cashOut;

		// Recent Mutations from Ledger
		const recentTransactions = await sql`
			SELECT 
				id,
				transaction_date as "date",
				direction,
				category,
				amount,
				reference_id as "ref",
				description,
				performed_by as "by"
			FROM finance.kasir_cash_ledger
			ORDER BY transaction_date DESC, created_at DESC
			LIMIT 6
		`;

		// 7 Days Flow
		const dayNamesIndo: Record<string, string> = {
			'Mon': 'Sen', 'Tue': 'Sel', 'Wed': 'Rab', 'Thu': 'Kam', 'Fri': 'Jum', 'Sat': 'Sab', 'Sun': 'Min'
		};
		const weeklyRaw = await sql`
			SELECT 
				TO_CHAR(d.day, 'Dy') as day_abbr,
				COALESCE(SUM(CASE WHEN l.direction = 'IN' THEN l.amount ELSE 0 END), 0) as cash_in,
				COALESCE(SUM(CASE WHEN l.direction = 'OUT' THEN l.amount ELSE 0 END), 0) as cash_out
			FROM GENERATE_SERIES(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d(day)
			LEFT JOIN finance.kasir_cash_ledger l ON DATE(l.transaction_date) = DATE(d.day)
			GROUP BY d.day
			ORDER BY d.day ASC
		`;

		const weeklyChart = weeklyRaw.map((w: any) => ({
			day: dayNamesIndo[w.day_abbr] || w.day_abbr,
			cashIn: parseFloat(w.cash_in) || 0,
			cashOut: parseFloat(w.cash_out) || 0
		}));

		return {
			today,
			cashSummary: {
				cashIn,
				cashOut,
				netCash,
				pendingUjo: parseInt(pendingUjoCountResult[0].count),
				pendingDn: parseInt(pendingDnCountResult[0].count)
			},
			pendingUjoRequests: pendingUjoRequests as any[],
			pendingDNSettlements: pendingDNSettlements as any[],
			pendingInvoices: [],
			recentTransactions: recentTransactions as any[],
			weeklyChart
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
