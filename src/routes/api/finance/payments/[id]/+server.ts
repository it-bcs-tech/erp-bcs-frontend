import { json } from '@sveltejs/kit';
import sql from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const paymentId = params.id;

	try {
		// Fetch Payment Header
		const [payment] = await sql`
			SELECT 
				p.id,
				p.payment_number,
				p.date,
				p.amount,
				p.reference,
				p.notes,
				p.status,
				p.type,
				c.nama_kustomer as partner_name,
				a.name as account_name,
				a.code as account_code
			FROM finance.payment p
			LEFT JOIN master.m_customer c ON c.id = p.partner_id
			LEFT JOIN finance.account a ON a.id = p.account_id
			WHERE p.id = ${paymentId}
		`;

		if (!payment) {
			return json({ success: false, message: 'Payment not found' }, { status: 404 });
		}

		// Fetch Allocations
		const allocations = await sql`
			SELECT 
				pa.id,
				pa.amount,
				i.invoice_number,
				i.date as invoice_date,
				i.total_amount as invoice_total
			FROM finance.payment_allocation pa
			JOIN finance.invoice i ON i.id = pa.invoice_id
			WHERE pa.payment_id = ${paymentId}
			ORDER BY i.date ASC
		`;

		return json({
			success: true,
			data: {
				payment,
				allocations
			}
		});
	} catch (error: any) {
		console.error("Error fetching payment detail:", error);
		return json({ success: false, message: 'Gagal mengambil detail pembayaran' }, { status: 500 });
	}
};
