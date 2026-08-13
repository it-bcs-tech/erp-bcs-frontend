import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	try {
		const [doc] = await sql`
			SELECT 
				d.*,
				dt.code as type_code,
				dt.name as type_name,
				c.nama_kustomer as partner_name,
				u.nomor_unit as asset_name,
				fl.name as filing_location_name,
				i.name as issuer_name,
				n.name as notary_name
			FROM documents.documents d
			LEFT JOIN documents.m_doc_type dt ON dt.id = d.doc_type_id
			LEFT JOIN master.m_customer c ON c.id = d.partner_id
			LEFT JOIN fleet.unit u ON u.id = d.asset_id
			LEFT JOIN documents.m_filing_location fl ON fl.id = d.filing_location_id
			LEFT JOIN documents.m_issuer i ON i.id = d.issuer_id
			LEFT JOIN documents.m_notary n ON n.id = d.notary_id
			WHERE d.id = ${id}
		`;

		if (!doc) {
			throw error(404, 'Dokumen tidak ditemukan');
		}

		return {
			document: doc
		};
	} catch (err: any) {
		console.error("Error loading DMS document detail:", err);
		throw error(500, 'Gagal memuat detail dokumen');
	}
};
