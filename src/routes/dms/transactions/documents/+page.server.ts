import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { calculateExpiryGate, logDocumentAudit } from '$lib/server/dms';
import type { DocumentItem } from '$lib/types/dms';
import { SCOPE_CLUSTERS } from '$lib/types/dms';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
		const limit = Math.max(1, Number(url.searchParams.get('limit')) || 10);
		const offset = (page - 1) * limit;

		const q = (url.searchParams.get('q') || '').trim();
		const entityType = url.searchParams.get('entity_type') || '';
		const type = url.searchParams.get('type') || '';
		const category = url.searchParams.get('category') || '';
		const company = url.searchParams.get('company') || '';
		const status = url.searchParams.get('status') || '';
		const gateFilter = url.searchParams.get('gate') || '';
		const scope = url.searchParams.get('scope') || '';
		const sort = url.searchParams.get('sort') || 'newest';

		let orderClause = sql`ORDER BY COALESCE(d.issue_date, d.created_at::date) DESC, d.created_at DESC, d.id DESC`;
		if (sort === 'oldest') {
			orderClause = sql`ORDER BY COALESCE(d.issue_date, d.created_at::date) ASC, d.created_at ASC, d.id ASC`;
		} else if (sort === 'expiring_soon') {
			orderClause = sql`ORDER BY d.expiry_date ASC NULLS LAST, COALESCE(d.issue_date, d.created_at::date) DESC`;
		} else if (sort === 'created_recent') {
			orderClause = sql`ORDER BY d.created_at DESC, d.id DESC`;
		}

		const conditions = [];
		if (q) {
			const pattern = `%${q}%`;
			conditions.push(sql`(
				d.doc_number ILIKE ${pattern} OR 
				d.title ILIKE ${pattern} OR 
				d.notes ILIKE ${pattern} OR
				(d.metadata->>'partner_name') ILIKE ${pattern} OR
				(d.metadata->>'partner_code') ILIKE ${pattern} OR
				(d.metadata->>'scope') ILIKE ${pattern} OR
				(d.metadata->>'pic') ILIKE ${pattern} OR
				(d.metadata->>'parent_contract_number') ILIKE ${pattern} OR
				(d.metadata->>'owner_name') ILIKE ${pattern} OR
				(d.metadata->>'no_chasis') ILIKE ${pattern} OR
				(d.metadata->>'brand_name') ILIKE ${pattern} OR
				u.nomor_unit ILIKE ${pattern} OR 
				u.no_rangka ILIKE ${pattern} OR 
				k.nama_karyawan ILIKE ${pattern} OR 
				c.nama_kustomer ILIKE ${pattern} OR
				v.nama_vendor ILIKE ${pattern} OR
				cmp.name ILIKE ${pattern} OR
				cmp.code ILIKE ${pattern} OR
				n.name ILIKE ${pattern} OR
				(d.metadata->>'molhr_no') ILIKE ${pattern} OR
				(d.metadata->>'deed_no') ILIKE ${pattern} OR
				(d.metadata->>'bentuk_fisik_akta') ILIKE ${pattern} OR
				(d.metadata->>'certificate_type') ILIKE ${pattern} OR
				(d.metadata->>'no_nib') ILIKE ${pattern} OR
				(d.metadata->>'administrative_village') ILIKE ${pattern} OR
				(d.metadata->>'district') ILIKE ${pattern} OR
				(d.metadata->>'driver_name') ILIKE ${pattern} OR
				(d.metadata->>'operator_name') ILIKE ${pattern} OR
				(d.metadata->>'payroll_id') ILIKE ${pattern} OR
				(d.metadata->>'sio_no') ILIKE ${pattern} OR
				(d.metadata->>'no_license') ILIKE ${pattern} OR
				(d.metadata->>'title_license') ILIKE ${pattern} OR
				(d.metadata->>'issued_by') ILIKE ${pattern} OR
				(d.metadata->>'no_sk') ILIKE ${pattern} OR
				(d.metadata->>'title_sk') ILIKE ${pattern} OR
				(d.metadata->>'rekom_klh') ILIKE ${pattern} OR
				(d.metadata->>'status_agunan') ILIKE ${pattern} OR
				(d.metadata->>'posisi_dokumen') ILIKE ${pattern} OR
				(d.metadata->>'keterangan_agunan') ILIKE ${pattern} OR
				(d.metadata->>'no_sertifikat') ILIKE ${pattern} OR
				(d.metadata->>'nama_bank') ILIKE ${pattern} OR
				(d.metadata->>'nama_dokumen') ILIKE ${pattern} OR
				d.qr_code_id ILIKE ${pattern}
			)`);
		}
		if (entityType) conditions.push(sql`d.entity_type = ${entityType}`);
		if (type) conditions.push(sql`dt.code = ${type}`);
		if (category) conditions.push(sql`d.category_id = ${category}`);
		if (company) conditions.push(sql`d.company_id = ${company}`);
		if (status) conditions.push(sql`d.status = ${status}`);
		if (scope) {
			if (scope === 'EMPTY_SCOPE') {
				conditions.push(sql`(d.metadata->>'scope' IS NULL OR d.metadata->>'scope' = '')`);
			} else {
				const cluster = SCOPE_CLUSTERS.find(c => c.id === scope);
				if (cluster && cluster.scopes.length > 0) {
					conditions.push(sql`d.metadata->>'scope' = ANY(${cluster.scopes})`);
				} else {
					conditions.push(sql`d.metadata->>'scope' = ${scope}`);
				}
			}
		}

		const whereClause = conditions.length > 0 ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}` : sql``;

		const [{ count: totalDocs }] = await sql`
			SELECT count(*) FROM dms.documents d
			LEFT JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
			LEFT JOIN dms.m_doc_category dc ON dc.id = d.category_id
			LEFT JOIN master.m_company cmp ON cmp.id = d.company_id
			LEFT JOIN master.m_customer c ON c.id = d.partner_id
			LEFT JOIN master.m_vendor v ON v.id = (CASE WHEN d.metadata->>'vendor_id' ~ '^[0-9a-fA-F-]{36}$' THEN (d.metadata->>'vendor_id')::uuid ELSE NULL END)
			LEFT JOIN fleet.unit u ON u.id = d.asset_id
			LEFT JOIN master.m_drivers drv ON drv.id = d.employee_id
			LEFT JOIN master.m_karyawan k ON k.id = drv.karyawan_id
			LEFT JOIN dms.m_notary n ON n.id = d.notary_id
			${whereClause}
		`;

		const rows = await sql`
			SELECT 
				d.*,
				to_char(d.issue_date, 'YYYY-MM-DD') as issue_date_str,
				to_char(d.expiry_date, 'YYYY-MM-DD') as expiry_date_str,
				dt.code as type_code,
				dt.name as type_name,
				dc.name as category_name,
				dc.code as category_code,
				cmp.name as company_name,
				cmp.code as company_code,
				n.name as notary_name,
				COALESCE(c.nama_kustomer, v.nama_vendor, d.metadata->>'partner_name') as partner_name,
				u.nomor_unit as unit_number,
				u.business_unit as unit_type,
				COALESCE(k.nama_karyawan, d.metadata->>'driver_name', d.metadata->>'operator_name') as driver_name,
				COALESCE(k.payroll_id, d.metadata->>'payroll_id') as driver_payroll_id,
				fl.name as filing_location_name,
				fl.code as filing_location_code
			FROM dms.documents d
			LEFT JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
			LEFT JOIN dms.m_doc_category dc ON dc.id = d.category_id
			LEFT JOIN master.m_company cmp ON cmp.id = d.company_id
			LEFT JOIN master.m_customer c ON c.id = d.partner_id
			LEFT JOIN master.m_vendor v ON v.id = (CASE WHEN d.metadata->>'vendor_id' ~ '^[0-9a-fA-F-]{36}$' THEN (d.metadata->>'vendor_id')::uuid ELSE NULL END)
			LEFT JOIN fleet.unit u ON u.id = d.asset_id
			LEFT JOIN master.m_drivers drv ON drv.id = d.employee_id
			LEFT JOIN master.m_karyawan k ON k.id = drv.karyawan_id
			LEFT JOIN dms.m_notary n ON n.id = d.notary_id
			LEFT JOIN dms.m_filing_location fl ON fl.id = d.filing_location_id
			${whereClause}
			${orderClause}
			LIMIT ${limit} OFFSET ${offset}
		`;

		// Compute dynamic expiry gates
		let documents: DocumentItem[] = rows.map((r: any) => {
			const { daysRemaining, gateLevel, computedStatus } = calculateExpiryGate(r.expiry_date, r.status);
			return {
				...r,
				status: computedStatus,
				days_remaining: daysRemaining,
				gate_level: gateLevel
			};
		});

		// Optional filter in-memory if gate filter is specified
		if (gateFilter) {
			if (gateFilter === 'EXPIRED') {
				documents = documents.filter(d => d.gate_level === 'EXPIRED');
			} else if (gateFilter === 'URGENT_7') {
				documents = documents.filter(d => d.gate_level === 'URGENT_7');
			} else if (gateFilter === 'CRITICAL_30') {
				documents = documents.filter(d => d.gate_level === 'CRITICAL_30' || d.gate_level === 'URGENT_7');
			} else if (gateFilter === 'WARNING_60') {
				documents = documents.filter(d => d.gate_level === 'WARNING_60' || d.gate_level === 'CRITICAL_30' || d.gate_level === 'URGENT_7');
			}
		}

		const docTypes = await sql`SELECT code, name FROM dms.m_doc_type WHERE is_active = true ORDER BY name`;
		const categories = await sql`SELECT id, code, name FROM dms.m_doc_category WHERE is_active = true ORDER BY legacy_id ASC NULLS LAST, name ASC`;
		const companies = await sql`SELECT id, code, name FROM master.m_company WHERE is_active = true ORDER BY name ASC`;

		const [tabCounts] = await sql`
			SELECT 
				count(*) as total,
				count(*) FILTER (WHERE doc_type_id IN (SELECT id FROM dms.m_doc_type WHERE code = 'KONTRAK_KERJASAMA')) as contracts,
				count(*) FILTER (WHERE entity_type = 'FLEET') as fleet,
				count(*) FILTER (WHERE entity_type = 'DRIVER') as driver,
				count(*) FILTER (WHERE entity_type = 'CORPORATE') as corporate
			FROM dms.documents;
		`;

		return {
			documents,
			docTypes,
			categories,
			companies,
			scopeClusters: SCOPE_CLUSTERS,
			selectedScope: scope,
			selectedSort: sort,
			tabCounts: {
				total: Number(tabCounts?.total || 0),
				contracts: Number(tabCounts?.contracts || 0),
				fleet: Number(tabCounts?.fleet || 0),
				driver: Number(tabCounts?.driver || 0),
				corporate: Number(tabCounts?.corporate || 0)
			},
			pagination: {
				page,
				limit,
				total: Number(totalDocs),
				totalPages: Math.ceil(Number(totalDocs) / limit)
			}
		};
	} catch (err: any) {
		console.error('Error loading DMS documents:', err);
		throw error(500, 'Gagal memuat data dokumen');
	}
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return { success: false, message: 'ID dokumen wajib diberikan' };

		try {
			// Catat log sebelum hapus
			await logDocumentAudit({
				documentId: id,
				action: 'DELETE',
				userName: 'Staff ERP',
				details: { deleted_document_id: id }
			});

			await sql`DELETE FROM dms.documents WHERE id = ${id}`;
			return { success: true, message: 'Dokumen berhasil dihapus dari arsip' };
		} catch (err: any) {
			console.error('Error deleting document:', err);
			return { success: false, message: 'Gagal menghapus dokumen' };
		}
	}
};
