import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const notaries = await sql`SELECT * FROM documents.m_notary ORDER BY name`;
	return { notaries };
};

export const actions: Actions = {
	save: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString();
		const address = data.get('address')?.toString();
		const phone = data.get('phone')?.toString();

		if (!name) return { success: false, message: 'Name wajib diisi' };

		try {
			await sql`
				INSERT INTO documents.m_notary (name, address, phone)
				VALUES (${name}, ${address || null}, ${phone || null})
			`;
			return { success: true, message: 'Notary saved!' };
		} catch (err: any) {
			return { success: false, message: err.message };
		}
	}
};
