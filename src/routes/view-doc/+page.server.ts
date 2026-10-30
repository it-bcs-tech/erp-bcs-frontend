import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { verifyScopedDocToken } from '$lib/server/dmsToken';
import { calculateExpiryGate } from '$lib/server/dms';
import type { DocumentItem, DocumentVersion } from '$lib/types/dms';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!token) {
		throw error(403, 'Akses ditolak: Token otorisasi dokumen tidak ditemukan');
	}

	const payload = verifyScopedDocToken(token);
	if (!payload || !payload.docId) {
		throw error(403, 'Akses ditolak: Tautan berkas tidak valid atau masa berlakunya telah berakhir');
	}

	const docId = payload.docId;

	try {
		const [doc] = await sql`
			SELECT 
				d.*,
				to_char(d.issue_date, 'YYYY-MM-DD') as issue_date_str,
				to_char(d.expiry_date, 'YYYY-MM-DD') as expiry_date_str,
				dt.code as type_code,
				dt.name as type_name,
				COALESCE(c.nama_kustomer, v.nama_vendor, d.metadata->>'partner_name') as partner_name,
				u.nomor_unit as unit_number,
				u.nomor_unit_lama as unit_old_plate,
				u.business_unit as unit_type,
				k.nama_karyawan as driver_name,
				k.payroll_id as driver_payroll_id,
				fl.name as filing_location_name,
				fl.code as filing_location_code,
				i.name as issuer_name,
				n.name as notary_name,
				dc.name as category_name,
				dc.code as category_code,
				cmp.name as company_name,
				cmp.code as company_code
			FROM dms.documents d
			LEFT JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
			LEFT JOIN dms.m_doc_category dc ON dc.id = d.category_id
			LEFT JOIN master.m_company cmp ON cmp.id = d.company_id
			LEFT JOIN master.m_customer c ON c.id = d.partner_id
			LEFT JOIN master.m_vendor v ON v.id = (CASE WHEN d.metadata->>'vendor_id' ~ '^[0-9a-fA-F-]{36}$' THEN (d.metadata->>'vendor_id')::uuid ELSE NULL END)
			LEFT JOIN fleet.unit u ON u.id = d.asset_id
			LEFT JOIN master.m_drivers drv ON drv.id = d.employee_id
			LEFT JOIN master.m_karyawan k ON k.id = drv.karyawan_id
			LEFT JOIN dms.m_filing_location fl ON fl.id = d.filing_location_id
			LEFT JOIN dms.m_issuer i ON i.id = d.issuer_id
			LEFT JOIN dms.m_notary n ON n.id = d.notary_id
			WHERE d.id = ${docId}
			LIMIT 1
		`;

		if (!doc) {
			throw error(404, 'Dokumen yang diminta tidak ditemukan di dalam arsip');
		}

		const { daysRemaining, computedStatus } = calculateExpiryGate(doc.expiry_date, doc.status);

		const documentData: DocumentItem = {
			...(doc as any),
			status: computedStatus,
			days_remaining: daysRemaining,
			current_version: doc.current_version || 1
		};

		// Ambil riwayat versi dokumen (jika ada)
		const versions = await sql<DocumentVersion[]>`
			SELECT 
				v.id,
				v.version_number,
				v.file_path,
				v.file_size,
				v.file_hash,
				v.change_notes,
				v.uploaded_by,
				to_char(v.created_at, 'YYYY-MM-DD HH24:MI') as created_at_str
			FROM dms.document_versions v
			WHERE v.document_id = ${docId}
			ORDER BY v.version_number DESC
		`;

		return {
			doc: documentData,
			versions,
			token
		};
	} catch (err: any) {
		if (err.status) throw err;
		console.error('Error fetching scoped document:', err);
		throw error(500, 'Gagal memuat dokumen digital');
	}
};
