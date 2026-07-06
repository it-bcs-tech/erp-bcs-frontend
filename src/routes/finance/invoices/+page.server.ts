import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	// 1. Get Date Range from URL parameters, default to current month
	const now = new Date();
	const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
	const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
	
	const startDate = url.searchParams.get('startDate') || firstDay;
	const endDate = url.searchParams.get('endDate') || lastDay;

	try {
		// 2. Fetch Invoices within the date range
		const invoices = await sql`
			SELECT 
				i.id,
				i.invoice_number,
				i.date as invoice_date,
				i.due_date,
				i.total_amount,
				i.status,
				c.nama_kustomer as customer_name
			FROM finance.invoice i
			LEFT JOIN master.m_customer c ON c.id = i.partner_id
			WHERE i.date >= ${startDate} AND i.date <= ${endDate}
			ORDER BY i.date DESC, i.created_at DESC
		`;

		// 3. Calculate Metrics
		// - Total Piutang Belum Dibayar (POSTED invoices only, regardless of date filter)
		const totalUnpaidRes = await sql`
			SELECT COALESCE(SUM(total_amount), 0) as total
			FROM finance.invoice
			WHERE status = 'POSTED'
		`;
		
		// - Total Piutang Jatuh Tempo (POSTED invoices where due_date < today)
		const todayStr = now.toISOString().split('T')[0];
		const totalOverdueRes = await sql`
			SELECT COALESCE(SUM(total_amount), 0) as total
			FROM finance.invoice
			WHERE status = 'POSTED' AND due_date < ${todayStr}
		`;

		// - Total Tagihan Bulan Ini (All POSTED and PAID invoices generated this month)
		const totalThisMonthRes = await sql`
			SELECT COALESCE(SUM(total_amount), 0) as total
			FROM finance.invoice
			WHERE (status = 'POSTED' OR status = 'PAID')
			  AND date >= ${firstDay} AND date <= ${lastDay}
		`;

		return {
			invoices,
			startDate,
			endDate,
			metrics: {
				totalUnpaid: totalUnpaidRes[0].total,
				totalOverdue: totalOverdueRes[0].total,
				totalThisMonth: totalThisMonthRes[0].total
			}
		};
	} catch (err) {
		console.error("Error fetching invoices:", err);
		throw error(500, 'Gagal mengambil data invoice');
	}
};

export const actions = {
	postInvoice: async ({ request }) => {
		const data = await request.formData();
		const invoiceId = data.get('invoiceId');
		if (!invoiceId) {
			return { success: false, message: 'Invoice ID tidak ditemukan' };
		}
		
		try {
			await sql`UPDATE finance.invoice SET status = 'POSTED', updated_at = NOW() WHERE id = ${invoiceId}`;
			return { success: true };
		} catch (e: any) {
			console.error("Failed to post invoice:", e);
			return { success: false, message: 'Gagal mengubah status menjadi POSTED' };
		}
	}
};
