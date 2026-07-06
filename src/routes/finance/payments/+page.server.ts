import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		// Base query
		const payments = await sql`
			SELECT 
				p.id,
				p.payment_number,
				p.date,
				p.amount,
				p.reference,
				p.status,
				p.type,
				c.nama_kustomer as partner_name,
				a.name as account_name
			FROM finance.payment p
			LEFT JOIN master.m_customer c ON c.id = p.partner_id
			LEFT JOIN finance.account a ON a.id = p.account_id
			ORDER BY p.date DESC, p.created_at DESC
		`;

		return {
			payments
		};
	} catch (err: any) {
		console.error("Error fetching payments:", err);
		throw error(500, 'Gagal mengambil data pembayaran');
	}
};

export const actions = {
	cancelPayment: async ({ request }) => {
		const data = await request.formData();
		const paymentId = data.get('paymentId');

		if (!paymentId) {
			return { success: false, message: 'ID Pembayaran tidak valid' };
		}

		try {
			await sql.begin(async (sql) => {
				// 1. Get payment status
				const [payment] = await sql`SELECT status FROM finance.payment WHERE id = ${paymentId}`;
				if (!payment) throw new Error('Pembayaran tidak ditemukan');
				if (payment.status === 'CANCELLED') throw new Error('Pembayaran sudah dibatalkan sebelumnya');

				// 2. Set Payment to CANCELLED
				await sql`UPDATE finance.payment SET status = 'CANCELLED' WHERE id = ${paymentId}`;

				// 3. Revert Invoice Statuses
				// Find all invoices that were allocated by this payment
				const allocations = await sql`SELECT invoice_id FROM finance.payment_allocation WHERE payment_id = ${paymentId}`;
				
				for (const alloc of allocations) {
					// We need to check if after removing this payment, the invoice is still fully paid.
					// But since we just updated the payment status to CANCELLED, our robust query will automatically exclude it!
					const checkRes = await sql`
						SELECT 
							i.total_amount,
							COALESCE(SUM(pa.amount), 0) as paid_amount
						FROM finance.invoice i
						LEFT JOIN finance.payment_allocation pa ON pa.invoice_id = i.id 
							AND pa.payment_id IN (SELECT id FROM finance.payment WHERE status != 'CANCELLED')
						WHERE i.id = ${alloc.invoice_id}
						GROUP BY i.id
					`;

					if (checkRes.length > 0) {
						const inv = checkRes[0];
						// If unpaid amount > 0, it means it's no longer fully paid. Revert status to POSTED
						if (Number(inv.total_amount) - Number(inv.paid_amount) > 0) {
							await sql`
								UPDATE finance.invoice 
								SET status = 'POSTED', updated_at = NOW() 
								WHERE id = ${alloc.invoice_id} AND status = 'PAID'
							`;
						}
					}
				}
			});

			return { success: true, message: 'Pembayaran berhasil dibatalkan.' };
		} catch (e: any) {
			console.error("Failed to cancel payment:", e);
			return { success: false, message: e.message || 'Terjadi kesalahan sistem' };
		}
	}
};
