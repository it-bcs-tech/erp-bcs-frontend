import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const companies = await sql`
		SELECT 
			c.id, 
			c.code, 
			c.name, 
			c.address, 
			c.phone, 
			c.remarks, 
			c.legacy_id, 
			c.is_active, 
			c.created_at,
			COUNT(d.id)::int AS doc_count
		FROM master.m_company c
		LEFT JOIN dms.documents d ON d.company_id = c.id
		GROUP BY c.id
		ORDER BY c.legacy_id ASC NULLS LAST, c.name ASC
	`;
	return { companies };
};

export const actions: Actions = {
	save: async ({ request }: any) => {
		const data = await request.formData();
		const id = data.get('id')?.toString()?.trim();
		const code = data.get('code')?.toString()?.trim()?.toUpperCase();
		const name = data.get('name')?.toString()?.trim();
		const address = data.get('address')?.toString()?.trim();
		const phone = data.get('phone')?.toString()?.trim();
		const remarks = data.get('remarks')?.toString()?.trim();
		const isActive = data.get('is_active') === 'true';

		if (!code || !name) {
			return { success: false, message: 'Kode dan Nama Perusahaan wajib diisi' };
		}

		try {
			if (id) {
				await sql`
					UPDATE master.m_company
					SET 
						code = ${code},
						name = ${name},
						address = ${address || null},
						phone = ${phone || null},
						remarks = ${remarks || null},
						is_active = ${isActive},
						updated_at = CURRENT_TIMESTAMP
					WHERE id = ${id}
				`;
				return { success: true, message: 'Data Perusahaan berhasil diperbarui!' };
			} else {
				await sql`
					INSERT INTO master.m_company (code, name, address, phone, remarks, is_active)
					VALUES (${code}, ${name}, ${address || null}, ${phone || null}, ${remarks || null}, ${isActive})
				`;
				return { success: true, message: 'Perusahaan baru berhasil ditambahkan!' };
			}
		} catch (err: any) {
			return { success: false, message: err.message };
		}
	},

	toggleActive: async ({ request }: any) => {
		const data = await request.formData();
		const id = data.get('id')?.toString()?.trim();
		if (!id) return { success: false, message: 'ID Perusahaan tidak ditemukan' };

		try {
			await sql`
				UPDATE master.m_company
				SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
				WHERE id = ${id}
			`;
			return { success: true, message: 'Status Perusahaan berhasil diubah!' };
		} catch (err: any) {
			return { success: false, message: err.message };
		}
	}
};
