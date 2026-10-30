import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { verifyScopedDocToken, createScopedDocToken } from '$lib/server/dmsToken';
import { calculateExpiryGate } from '$lib/server/dms';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!token) {
		throw error(403, 'Akses ditolak: Token otorisasi armada tidak ditemukan');
	}

	const payload = verifyScopedDocToken(token);
	if (!payload || payload.type !== 'fleet' || (!payload.unitId && !payload.nomorUnit)) {
		throw error(403, 'Akses ditolak: Tautan berkas armada tidak valid atau masa berlakunya telah berakhir');
	}

	try {
		// Cari data kendaraan
		const units = await sql`
			SELECT 
				u.id,
				u.nomor_unit,
				u.nomor_unit_lama,
				u.business_unit,
				u.no_proyek,
				u.project_area,
				u.is_active,
				u.no_rangka,
				u.no_mesin,
				u.brand,
				u.model
			FROM fleet.unit u
			WHERE ${payload.unitId ? sql`u.id = ${payload.unitId}` : sql`u.nomor_unit = ${payload.nomorUnit}`}
			LIMIT 1
		`;

		const vehicle = units[0];
		if (!vehicle) {
			throw error(404, 'Armada kendaraan tidak ditemukan');
		}

		// Ambil seluruh dokumen kendaraan dari DMS
		const rawDocs = await sql`
			SELECT 
				d.id,
				d.doc_number,
				d.title,
				d.file_path,
				d.status,
				d.notes,
				d.metadata,
				to_char(d.issue_date, 'YYYY-MM-DD') as issue_date_str,
				to_char(d.expiry_date, 'YYYY-MM-DD') as expiry_date_str,
				d.expiry_date,
				dt.name as type_name,
				dt.code as type_code,
				dc.name as category_name,
				cmp.name as company_name,
				fl.name as filing_location_name,
				fl.code as filing_location_code
			FROM dms.documents d
			LEFT JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
			LEFT JOIN dms.m_doc_category dc ON dc.id = d.category_id
			LEFT JOIN master.m_company cmp ON cmp.id = d.company_id
			LEFT JOIN dms.m_filing_location fl ON fl.id = d.filing_location_id
			WHERE d.asset_id = ${vehicle.id}
			ORDER BY 
				CASE 
					WHEN dt.code = 'STNK' THEN 1
					WHEN dt.code = 'BPKB' THEN 2
					WHEN dt.code = 'KIR' THEN 3
					WHEN dt.code = 'IZIN_B3' THEN 4
					ELSE 5
				END,
				COALESCE(d.issue_date, d.created_at::date) DESC
		`;

		const documents = rawDocs.map((doc: any) => {
			const { daysRemaining, computedStatus } = calculateExpiryGate(doc.expiry_date, doc.status);
			return {
				...doc,
				status: computedStatus,
				days_remaining: daysRemaining,
				view_token: createScopedDocToken({ type: 'single', docId: doc.id })
			};
		});

		return {
			vehicle,
			documents,
			token
		};
	} catch (err: any) {
		if (err.status) throw err;
		console.error('Error fetching fleet documents dossier:', err);
		throw error(500, 'Gagal memuat dossier dokumen armada');
	}
};
