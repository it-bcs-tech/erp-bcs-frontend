import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const notaries = await sql`
		SELECT 
			n.*,
			COUNT(d.id)::int as document_count
		FROM dms.m_notary n
		LEFT JOIN dms.documents d ON d.notary_id = n.id
		GROUP BY n.id
		ORDER BY document_count DESC, n.name ASC
	`;
	return { notaries };
};

export const actions: Actions = {
	save: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString();
		const address = data.get('address')?.toString();
		const phone = data.get('phone')?.toString();

		if (!name) return { success: false, message: 'Nama Notaris wajib diisi' };

		try {
			await sql`
				INSERT INTO dms.m_notary (name, address, phone)
				VALUES (${name}, ${address || null}, ${phone || null})
			`;
			return { success: true, message: 'Notaris berhasil disimpan!' };
		} catch (err: any) {
			return { success: false, message: err.message };
		}
	}
};
