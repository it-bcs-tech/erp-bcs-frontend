import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		// 1. Total Customer Invoices (Receivables / Piutang)
		const [invoicesSummary] = await sql`
			SELECT 
				COALESCE(SUM(total_amount), 0) as total_invoiced,
				COALESCE(SUM(advance_payment), 0) as total_advance,
				COUNT(id) as total_count,
				COUNT(CASE WHEN status = 'DRAFT' THEN 1 END) as draft_count,
				COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'PAID' THEN 1 END) as overdue_count,
				COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND status != 'PAID' THEN total_amount ELSE 0 END), 0) as overdue_amount
			FROM finance.invoice
			WHERE type = 'OUT_INVOICE'
		`;

		// 2. Total Vendor Bills (Payables / Hutang)
		const [billsSummary] = await sql`
			SELECT 
				COALESCE(SUM(total_amount), 0) as total_bills,
				COUNT(id) as total_count,
				COUNT(CASE WHEN status = 'DRAFT' THEN 1 END) as draft_count
			FROM finance.invoice
			WHERE type = 'IN_INVOICE'
		`;

		// 3. Total Cash Advances (UJO Kasir Operasional)
		const [ujoSummary] = await sql`
			SELECT 
				COALESCE(SUM(estimated_ujo + COALESCE(extra_cost, 0)), 0) as total_ujo,
				COUNT(id) as total_count
			FROM finance.cash_advance
		`;

		// 4. Recent Invoices List
		const recentInvoices = await sql`
			SELECT 
				i.id,
				i.invoice_number,
				to_char(i.date, 'YYYY-MM-DD') as date,
				to_char(i.due_date, 'YYYY-MM-DD') as due_date,
				c.nama_kustomer as partner_name,
				i.total_amount,
				i.status,
				i.type
			FROM finance.invoice i
			LEFT JOIN master.m_customer c ON c.id = i.partner_id
			ORDER BY i.date DESC, i.id DESC
			LIMIT 6
		`;

		// 5. Recent Payments List
		const recentPayments = await sql`
			SELECT 
				p.id,
				p.payment_number,
				to_char(p.date, 'YYYY-MM-DD') as date,
				c.nama_kustomer as partner_name,
				p.amount,
				p.type,
				p.status
			FROM finance.payment p
			LEFT JOIN master.m_customer c ON c.id = p.partner_id
			ORDER BY p.date DESC, p.id DESC
			LIMIT 5
		`;

		return {
			summary: {
				totalInvoiced: parseFloat(invoicesSummary?.total_invoiced || '0'),
				totalBills: parseFloat(billsSummary?.total_bills || '0'),
				totalUjo: parseFloat(ujoSummary?.total_ujo || '0'),
				draftCount: parseInt(invoicesSummary?.draft_count || '0') + parseInt(billsSummary?.draft_count || '0'),
				overdueCount: parseInt(invoicesSummary?.overdue_count || '0'),
				overdueAmount: parseFloat(invoicesSummary?.overdue_amount || '0')
			},
			recentInvoices,
			recentPayments
		};
	} catch (err: any) {
		console.error('Error loading Finance dashboard:', err);
		return {
			summary: {
				totalInvoiced: 0,
				totalBills: 0,
				totalUjo: 0,
				draftCount: 0,
				overdueCount: 0,
				overdueAmount: 0
			},
			recentInvoices: [],
			recentPayments: []
		};
	}
};
