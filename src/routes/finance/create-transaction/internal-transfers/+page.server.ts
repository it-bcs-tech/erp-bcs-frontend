import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		const accounts = await sql`
			SELECT id, code, name 
			FROM finance.account 
			WHERE is_active = true 
			ORDER BY code ASC
		`;

		return { accounts };
	} catch (err: any) {
		console.error('Error loading internal transfer accounts:', err);
		return { accounts: [] };
	}
};

export const actions: Actions = {
	saveTransfer: async ({ request }) => {
		const data = await request.formData();
		const date = data.get('date') as string || new Date().toISOString().split('T')[0];
		const fromAccountId = data.get('fromAccountId') ? parseInt(data.get('fromAccountId') as string) : null;
		const toAccountId = data.get('toAccountId') ? parseInt(data.get('toAccountId') as string) : null;
		const amount = parseFloat(data.get('amount') as string || '0');
		const reference = (data.get('reference') as string || '').trim();
		const notes = (data.get('notes') as string || '').trim();

		if (!fromAccountId || !toAccountId) {
			return fail(400, { success: false, message: 'Harap pilih Rekening Asal dan Rekening Tujuan!' });
		}
		if (fromAccountId === toAccountId) {
			return fail(400, { success: false, message: 'Rekening Asal dan Rekening Tujuan tidak boleh sama!' });
		}
		if (amount <= 0) {
			return fail(400, { success: false, message: 'Jumlah Transfer harus lebih besar dari 0!' });
		}

		try {
			await sql.begin(async (sql) => {
				const dateObj = new Date(date);
				const year = dateObj.getFullYear();
				const month = String(dateObj.getMonth() + 1).padStart(2, '0');
				const countRes = await sql`SELECT COUNT(*) FROM finance.payment WHERE type = 'TRANSFER'`;
				const seq = String(Number(countRes[0]?.count || 0) + 1).padStart(4, '0');
				const trfNo = `TRF/${year}/${month}/${seq}`;

				// 1. Outgoing from source account
				await sql`
					INSERT INTO finance.payment (
						type, payment_number, date, account_id, amount, reference, notes, status
					) VALUES (
						'TRANSFER_OUT', ${trfNo + '-OUT'}, ${date}, ${fromAccountId}, ${amount}, ${reference}, ${'Transfer ke rek #' + toAccountId + ': ' + notes}, 'POSTED'
					)
				`;

				// 2. Incoming to destination account
				await sql`
					INSERT INTO finance.payment (
						type, payment_number, date, account_id, amount, reference, notes, status
					) VALUES (
						'TRANSFER_IN', ${trfNo + '-IN'}, ${date}, ${toAccountId}, ${amount}, ${reference}, ${'Transfer dari rek #' + fromAccountId + ': ' + notes}, 'POSTED'
					)
				`;
			});
		} catch (err: any) {
			console.error('Error saving internal transfer:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan Transfer Internal' });
		}

		throw redirect(303, '/finance/payments');
	}
};
