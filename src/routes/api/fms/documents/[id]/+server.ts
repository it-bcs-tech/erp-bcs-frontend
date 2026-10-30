import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';
import { hasModuleAccess } from '$lib/stores/auth';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Akses diperbolehkan jika user punya akses modul FMS atau DMS
	if (!hasModuleAccess(user, 'fms') && !hasModuleAccess(user, 'dms')) {
		throw error(403, 'Akses ke berkas ditolak');
	}

	const { id } = params;
	if (!id) {
		throw error(400, 'ID dokumen wajib disertakan');
	}

	try {
		const [doc] = await sql`
			SELECT 
				d.id,
				d.doc_number,
				d.title,
				d.file_path,
				to_char(d.issue_date, 'YYYY-MM-DD') as issue_date_str,
				to_char(d.expiry_date, 'YYYY-MM-DD') as expiry_date_str,
				d.status,
				dt.name as type_name,
				dt.code as type_code
			FROM dms.documents d
			LEFT JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
			WHERE d.id = ${id}
			LIMIT 1
		`;

		if (!doc) {
			throw error(404, 'Dokumen tidak ditemukan');
		}

		return json({
			success: true,
			data: doc
		});
	} catch (err: any) {
		if (err.status) throw err;
		console.error('Error fetching FMS document:', err);
		throw error(500, 'Gagal mengambil detail dokumen');
	}
};
