import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		// Fetch Vendor Bills (type = 'VENDOR_BILL')
		const bills = await sql`
			SELECT 
				i.id,
				i.invoice_number as bill_number,
				i.date,
				i.due_date,
				i.total_amount,
				i.status,
				c.nama_kustomer as vendor_name,
				COALESCE(SUM(pa.amount), 0) as paid_amount
			FROM finance.invoice i
			LEFT JOIN master.m_customer c ON c.id = i.partner_id
			LEFT JOIN finance.payment_allocation pa ON pa.invoice_id = i.id
			  AND pa.payment_id IN (SELECT id FROM finance.payment WHERE status != 'CANCELLED')
			WHERE i.type = 'VENDOR_BILL'
			GROUP BY i.id, c.nama_kustomer
			ORDER BY i.date DESC, i.created_at DESC
		`;

		return {
			bills
		};
	} catch (err: any) {
		console.error("Error fetching vendor bills:", err);
		throw error(500, 'Gagal mengambil data tagihan vendor');
	}
};
