import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const types = await sql`SELECT * FROM documents.m_doc_type ORDER BY name`;
	return { types };
};

export const actions: Actions = {
	save: async ({ request }) => {
		const data = await request.formData();
		const code = data.get('code')?.toString();
		const name = data.get('name')?.toString();
		const description = data.get('description')?.toString();

		if (!code || !name) return { success: false, message: 'Code dan Name wajib diisi' };

		try {
			await sql`
				INSERT INTO documents.m_doc_type (code, name, description)
				VALUES (${code}, ${name}, ${description || null})
			`;
			return { success: true, message: 'Document type saved!' };
		} catch (err: any) {
			return { success: false, message: err.message };
		}
	}
};
