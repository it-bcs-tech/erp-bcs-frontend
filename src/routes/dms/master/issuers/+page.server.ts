import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const issuers = await sql`SELECT * FROM dms.m_issuer ORDER BY name`;
	return { issuers };
};

export const actions: Actions = {
	save: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString();
		const type = data.get('type')?.toString();

		if (!name) return { success: false, message: 'Nama Penerbit wajib diisi' };

		try {
			await sql`
				INSERT INTO dms.m_issuer (name, type)
				VALUES (${name}, ${type || null})
			`;
			return { success: true, message: 'Penerbit berhasil disimpan!' };
		} catch (err: any) {
			return { success: false, message: err.message };
		}
	}
};
