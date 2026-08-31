import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		const accounts = await sql`
			SELECT id, code, name, account_type 
			FROM finance.account 
			WHERE is_active = true 
			ORDER BY code ASC
		`;

		return { accounts };
	} catch (err: any) {
		console.error('Error loading manual journal accounts:', err);
		return { accounts: [] };
	}
};

export const actions: Actions = {
	saveJournal: async ({ request }) => {
		const data = await request.formData();
		const date = data.get('date') as string || new Date().toISOString().split('T')[0];
		const reference = (data.get('reference') as string || '').trim();
		const description = (data.get('description') as string || '').trim();
		const linesJson = data.get('lines') as string;

		if (!linesJson) {
			return fail(400, { success: false, message: 'Baris jurnal tidak boleh kosong!' });
		}

		let lines: any[] = [];
		try {
			lines = JSON.parse(linesJson);
		} catch {
			return fail(400, { success: false, message: 'Format baris jurnal tidak valid!' });
		}

		if (lines.length < 2) {
			return fail(400, { success: false, message: 'Jurnal minimal harus memiliki 2 baris akun (Debit & Kredit)!' });
		}

		let totalDebit = 0;
		let totalCredit = 0;
		for (const l of lines) {
			totalDebit += Number(l.debit || 0);
			totalCredit += Number(l.credit || 0);
		}

		if (Math.abs(totalDebit - totalCredit) > 0.01) {
			return fail(400, { success: false, message: `Jurnal tidak seimbang (Balance)! Total Debit: ${totalDebit} != Total Kredit: ${totalCredit}` });
		}

		try {
			await sql.begin(async (sql) => {
				const [entry] = await sql`
					INSERT INTO finance.journal_entry (
						date, reference, description, status, created_at
					) VALUES (
						${date}, ${reference || `JV-${Date.now().toString().slice(-6)}`}, ${description}, 'POSTED', NOW()
					) RETURNING id
				`;

				for (const l of lines) {
					if (l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0)) {
						await sql`
							INSERT INTO finance.journal_line (
								journal_entry_id, account_id, debit, credit, description
							) VALUES (
								${entry.id}, ${l.account_id}, ${Number(l.debit || 0)}, ${Number(l.credit || 0)}, ${l.description || description}
							)
						`;
					}
				}
			});
		} catch (err: any) {
			console.error('Error saving manual journal:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan Jurnal Umum' });
		}

		throw redirect(303, '/finance');
	}
};
