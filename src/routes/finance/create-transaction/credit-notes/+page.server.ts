import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		const customers = await sql`
			SELECT id, kode_kustomer as code, nama_kustomer as name 
			FROM master.m_customer 
			ORDER BY nama_kustomer ASC
		`;

		const invoices = await sql`
			SELECT 
				i.id,
				i.invoice_number,
				i.partner_id as customer_id,
				to_char(i.date, 'YYYY-MM-DD') as date,
				i.total_amount,
				c.nama_kustomer as customer_name
			FROM finance.invoice i
			LEFT JOIN master.m_customer c ON c.id = i.partner_id
			WHERE i.type = 'OUT_INVOICE' AND i.status != 'CANCELLED'
			ORDER BY i.date DESC
			LIMIT 50
		`;

		return {
			customers,
			invoices
		};
	} catch (err: any) {
		console.error('Error loading credit notes data:', err);
		return { customers: [], invoices: [] };
	}
};

export const actions: Actions = {
	saveCreditNote: async ({ request }) => {
		const data = await request.formData();
		const date = data.get('date') as string || new Date().toISOString().split('T')[0];
		const customerId = data.get('customerId') as string;
		const invoiceId = data.get('invoiceId') ? parseInt(data.get('invoiceId') as string) : null;
		const amount = parseFloat(data.get('amount') as string || '0');
		const reason = (data.get('reason') as string || '').trim();

		if (!customerId) {
			return fail(400, { success: false, message: 'Harap pilih Kustomer!' });
		}
		if (amount <= 0) {
			return fail(400, { success: false, message: 'Jumlah Credit Note harus lebih besar dari 0!' });
		}

		try {
			const dateObj = new Date(date);
			const year = dateObj.getFullYear();
			const month = String(dateObj.getMonth() + 1).padStart(2, '0');
			const [seqRow] = await sql`SELECT COUNT(*) as count FROM finance.invoice WHERE type = 'OUT_REFUND'`;
			const seq = (parseInt(seqRow?.count || '0') + 1).toString().padStart(4, '0');
			const cnNumber = `CN/${year}/${month}/${seq}`;

			await sql`
				INSERT INTO finance.invoice (
					type,
					invoice_number,
					partner_id,
					date,
					total_amount,
					status,
					notes,
					reference
				) VALUES (
					'OUT_REFUND',
					${cnNumber},
					${customerId},
					${date},
					${amount},
					'POSTED',
					${reason},
					${invoiceId ? 'REF INV #' + invoiceId : 'MANUAL'}
				)
			`;
		} catch (err: any) {
			console.error('Error saving credit note:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan Credit Note' });
		}

		throw redirect(303, '/finance/invoices');
	}
};
