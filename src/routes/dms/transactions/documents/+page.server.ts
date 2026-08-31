import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { calculateExpiryGate, logDocumentAudit } from '$lib/server/dms';
import type { DocumentItem } from '$lib/types/dms';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
		const limit = Math.max(1, Number(url.searchParams.get('limit')) || 10);
		const offset = (page - 1) * limit;

		const q = (url.searchParams.get('q') || '').trim();
		const entityType = url.searchParams.get('entity_type') || '';
		const type = url.searchParams.get('type') || '';
		const status = url.searchParams.get('status') || '';
		const gateFilter = url.searchParams.get('gate') || '';

		const conditions = [];
		if (q) {
			const pattern = `%${q}%`;
			conditions.push(sql`(
				d.doc_number ILIKE ${pattern} OR 
				d.title ILIKE ${pattern} OR 
				u.nomor_unit ILIKE ${pattern} OR 
				k.nama_karyawan ILIKE ${pattern} OR 
				c.nama_kustomer ILIKE ${pattern} OR
				d.qr_code_id ILIKE ${pattern}
			)`);
		}
		if (entityType) conditions.push(sql`d.entity_type = ${entityType}`);
		if (type) conditions.push(sql`dt.code = ${type}`);
		if (status) conditions.push(sql`d.status = ${status}`);

		const whereClause = conditions.length > 0 ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}` : sql``;

		const [{ count: totalDocs }] = await sql`
			SELECT count(*) FROM dms.documents d
			LEFT JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
			LEFT JOIN master.m_customer c ON c.id = d.partner_id
			LEFT JOIN fleet.unit u ON u.id = d.asset_id
			LEFT JOIN master.m_drivers drv ON drv.id = d.employee_id
			LEFT JOIN master.m_karyawan k ON k.id = drv.karyawan_id
			${whereClause}
		`;

		const rows = await sql`
			SELECT 
				d.*,
				to_char(d.issue_date, 'YYYY-MM-DD') as issue_date_str,
				to_char(d.expiry_date, 'YYYY-MM-DD') as expiry_date_str,
				dt.code as type_code,
				dt.name as type_name,
				c.nama_kustomer as partner_name,
				u.nomor_unit as unit_number,
				u.business_unit as unit_type,
				k.nama_karyawan as driver_name,
				k.payroll_id as driver_payroll_id,
				fl.name as filing_location_name,
				fl.code as filing_location_code
			FROM dms.documents d
			LEFT JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
			LEFT JOIN master.m_customer c ON c.id = d.partner_id
			LEFT JOIN fleet.unit u ON u.id = d.asset_id
			LEFT JOIN master.m_drivers drv ON drv.id = d.employee_id
			LEFT JOIN master.m_karyawan k ON k.id = drv.karyawan_id
			LEFT JOIN dms.m_filing_location fl ON fl.id = d.filing_location_id
			${whereClause}
			ORDER BY d.created_at DESC
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
