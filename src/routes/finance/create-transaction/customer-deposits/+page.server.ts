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

		const accounts = await sql`
			SELECT id, code, name 
			FROM finance.account 
			WHERE is_active = true 
			ORDER BY code ASC
		`;

		return { customers, accounts };
	} catch (err: any) {
		console.error('Error loading customer deposits data:', err);
		return { customers: [], accounts: [] };
	}
};

export const actions: Actions = {
	saveDeposit: async ({ request }) => {
		const data = await request.formData();
		const date = data.get('date') as string || new Date().toISOString().split('T')[0];
		const customerId = data.get('customerId') as string;
		const accountId = data.get('accountId') ? parseInt(data.get('accountId') as string) : null;
		const amount = parseFloat(data.get('amount') as string || '0');
		const reference = (data.get('reference') as string || '').trim();
		const notes = (data.get('notes') as string || '').trim();

		if (!customerId) {
			return fail(400, { success: false, message: 'Harap pilih Kustomer!' });
		}
		if (amount <= 0) {
			return fail(400, { success: false, message: 'Jumlah deposit harus lebih besar dari 0!' });
		}

		try {
			const dateObj = new Date(date);
			const year = dateObj.getFullYear();
			const month = String(dateObj.getMonth() + 1).padStart(2, '0');
			const countRes = await sql`SELECT COUNT(*) FROM finance.payment WHERE type = 'RECEIVE_DEPOSIT'`;
			const seq = String(Number(countRes[0]?.count || 0) + 1).padStart(4, '0');
			const payNo = `DEP/${year}/${month}/${seq}`;

			await sql`
				INSERT INTO finance.payment (
					type, payment_number, date, partner_id, account_id, amount, reference, notes, status
				) VALUES (
					'RECEIVE_DEPOSIT', ${payNo}, ${date}, ${customerId}, ${accountId}, ${amount}, ${reference}, ${notes}, 'POSTED'
				)
			`;
		} catch (err: any) {
			console.error('Error saving customer deposit:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan deposit kustomer' });
		}

		throw redirect(303, '/finance/payments');
	}
};
