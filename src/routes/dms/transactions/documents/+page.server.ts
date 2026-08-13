import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const page = Number(url.searchParams.get('page')) || 1;
		const limit = Number(url.searchParams.get('limit')) || 10;
		const offset = (page - 1) * limit;

		const q = url.searchParams.get('q') || '';
		const type = url.searchParams.get('type') || '';
		const status = url.searchParams.get('status') || '';

		const conditions = [];
		if (q) conditions.push(sql`(d.doc_number ILIKE ${'%' + q + '%'} OR d.title ILIKE ${'%' + q + '%'})`);
		if (type) conditions.push(sql`dt.code = ${type}`);
		if (status) conditions.push(sql`d.status = ${status}`);

		const whereClause = conditions.length > 0 ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}` : sql``;

		const [{ count: totalDocs }] = await sql`
			SELECT count(*) FROM documents.documents d
			LEFT JOIN documents.m_doc_type dt ON dt.id = d.doc_type_id
			${whereClause}
		`;

		const documents = await sql`
			SELECT 
				d.id,
				d.doc_number,
				d.title,
				dt.code as type_code,
				dt.name as type_name,
				d.issue_date,
				d.expiry_date,
				d.status,
				c.nama_kustomer as partner_name,
				d.metadata
			FROM documents.documents d
			LEFT JOIN documents.m_doc_type dt ON dt.id = d.doc_type_id
			LEFT JOIN master.m_customer c ON c.id = d.partner_id
			${whereClause}
			ORDER BY d.created_at DESC
			LIMIT ${limit} OFFSET ${offset}
		`;

		const docTypes = await sql`SELECT code, name FROM documents.m_doc_type WHERE is_active = true ORDER BY name`;

		return {
			documents,
			docTypes,
			pagination: {
				page,
				limit,
				total: Number(totalDocs),
				totalPages: Math.ceil(Number(totalDocs) / limit)
			}
		};
	} catch (err: any) {
		console.error("Error loading DMS documents:", err);
		throw error(500, 'Gagal memuat data dokumen');
	}
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (!id) return { success: false, message: 'ID is required' };

		try {
			await sql`DELETE FROM documents.documents WHERE id = ${id}`;
			return { success: true, message: 'Document deleted successfully' };
		} catch (err: any) {
			console.error("Error deleting document:", err);
			return { success: false, message: 'Failed to delete document' };
		}
	}
};
