import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const locations = await sql`
		SELECT 
			fl.*,
			COUNT(d.id)::int as document_count
		FROM dms.m_filing_location fl
		LEFT JOIN dms.documents d ON d.filing_location_id = fl.id
		GROUP BY fl.id
		ORDER BY document_count DESC, fl.name ASC
	`;
	return { locations };
};

export const actions: Actions = {
	save: async ({ request }) => {
		const data = await request.formData();
		const code = data.get('code')?.toString();
		const name = data.get('name')?.toString();
		const description = data.get('description')?.toString();

		if (!code || !name) return { success: false, message: 'Kode dan Nama Lokasi wajib diisi' };

		try {
			await sql`
				INSERT INTO dms.m_filing_location (code, name, description)
				VALUES (${code}, ${name}, ${description || null})
			`;
			return { success: true, message: 'Lokasi penyimpanan berhasil disimpan!' };
		} catch (err: any) {
			return { success: false, message: err.message };
		}
	}
};
