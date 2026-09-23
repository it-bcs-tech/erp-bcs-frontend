import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const categories = await sql`
		SELECT 
			c.id, 
			c.code, 
			c.name, 
			c.description, 
			c.legacy_id, 
			c.is_active, 
			c.created_at,
			COUNT(d.id)::int AS document_count
		FROM dms.m_doc_category c
		LEFT JOIN dms.documents d ON d.category_id = c.id
		GROUP BY c.id
		ORDER BY c.legacy_id ASC NULLS LAST, c.name ASC
	`;
	return { categories };
};

export const actions: Actions = {
	save: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString()?.trim();
		const code = data.get('code')?.toString()?.trim();
		const name = data.get('name')?.toString()?.trim();
		const description = data.get('description')?.toString()?.trim();
		const isActive = data.get('is_active') === 'true';

		if (!code || !name) {
			return { success: false, message: 'Kode dan Nama Kategori wajib diisi' };
		}

		try {
			if (id) {
				await sql`
					UPDATE dms.m_doc_category
					SET 
						code = ${code},
						name = ${name},
						description = ${description || null},
						is_active = ${isActive},
						updated_at = CURRENT_TIMESTAMP
					WHERE id = ${id}
				`;
				return { success: true, message: 'Kategori Dokumen berhasil diperbarui!' };
			} else {
				await sql`
					INSERT INTO dms.m_doc_category (code, name, description, is_active)
					VALUES (${code}, ${name}, ${description || null}, ${isActive})
				`;
				return { success: true, message: 'Kategori Dokumen baru berhasil disimpan!' };
			}
		} catch (err: any) {
			return { success: false, message: err.message };
		}
	},

	toggleActive: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString()?.trim();
		if (!id) return { success: false, message: 'ID Kategori tidak ditemukan' };

		try {
			await sql`
				UPDATE dms.m_doc_category
				SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
				WHERE id = ${id}
			`;
			return { success: true, message: 'Status Kategori berhasil diubah!' };
		} catch (err: any) {
			return { success: false, message: err.message };
		}
	}
};
