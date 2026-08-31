import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		const accounts = await sql`
			SELECT id, code, name, account_type, currency, description, is_active 
			FROM finance.account 
			ORDER BY code ASC
		`;

		return { accounts };
	} catch (err: any) {
		console.error('Error loading COA:', err);
		return { accounts: [] };
	}
};

export const actions: Actions = {
	saveAccount: async ({ request }) => {
		const data = await request.formData();
		const code = (data.get('code') as string || '').trim();
		const name = (data.get('name') as string || '').trim();
		const type = (data.get('account_type') as string || 'EXPENSE').trim();
		const description = (data.get('description') as string || '').trim();

		if (!code || !name) {
			return fail(400, { success: false, message: 'Kode Akun dan Nama Akun wajib diisi!' });
		}

		try {
			await sql`
				INSERT INTO finance.account (
					code, name, account_type, currency, description, is_active, created_at, updated_at
				) VALUES (
					${code}, ${name}, ${type}, 'IDR', ${description}, true, NOW(), NOW()
				)
			`;
			return { success: true, message: 'Akun COA berhasil ditambahkan!' };
		} catch (err: any) {
			console.error('Error saving COA:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan Akun COA' });
		}
	}
};
