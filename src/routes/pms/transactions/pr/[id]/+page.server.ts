import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const prId = parseInt(params.id);
	if (isNaN(prId)) {
		throw error(404, 'Purchase Request ID tidak valid');
	}

	try {
		const [pr] = await sql`
			SELECT 
				pr.id,
				pr.pr_number as "prNumber",
				to_char(pr.date, 'YYYY-MM-DD') as date,
				to_char(pr.required_date, 'YYYY-MM-DD') as "requiredDate",
				to_char(pr.created_at, 'YYYY-MM-DD HH24:MI') as "createdAt",
				pr.department,
				pr.requested_by as "requestedBy",
				pr.created_by as "createdBy",
				COALESCE(mk.nama_karyawan, 
					CASE 
						WHEN pr.created_by LIKE '%(%)%' THEN TRIM(SUBSTRING(pr.created_by FROM '^[^(]+'))
						ELSE pr.created_by 
					END
				) as "createdByName",
				COALESCE(mk.payroll_id, 
					CASE 
						WHEN pr.created_by LIKE '%(%)%' THEN SUBSTRING(pr.created_by FROM '\\(([^)]+)\\)')
						ELSE NULL 
					END
				) as "createdByPayroll",
				COALESCE(pr.category, 'SUPPORTING') as category,
				pr.status,
				pr.notes,
				pr.project_id as "projectId",
				p.project_name as "projectName",
				COALESCE(p.project_code, 'PRJ-' || p.id) as "projectCode",
				pr.site_id as "siteId",
				l.loc_name as "siteName",
				l.loc_code as "siteCode"
			FROM procurement.purchase_request pr
			LEFT JOIN master.m_karyawan mk ON mk.payroll_id = pr.created_by OR mk.payroll_id = SUBSTRING(pr.created_by FROM '\\(([^)]+)\\)') OR mk.nama_karyawan = pr.created_by
			LEFT JOIN master.m_project p ON p.id = pr.project_id
			LEFT JOIN master.m_lokasi l ON l.id = pr.site_id
			WHERE pr.id = ${prId}
		`;

		if (!pr) {
			throw error(404, 'Purchase Request tidak ditemukan');
		}

		const items = await sql`
			SELECT 
				prl.id,
				prl.pr_id as "prId",
				prl.item_id as "materialId",
				m.material_code as "materialCode",
				m.name,
				m.spec,
				m.brand,
				m.uom,
				m.stock,
				prl.qty_requested as "qtyRequested",
				prl.remarks
			FROM procurement.purchase_request_line prl
			JOIN master.m_materials m ON m.id = prl.item_id
			WHERE prl.pr_id = ${prId}
			ORDER BY prl.id ASC
		`;

		// Check for linked POs
		const linkedPOs = await sql`
			SELECT DISTINCT 
				po.id,
				po.po_number as "poNumber",
				to_char(po.date, 'YYYY-MM-DD') as date,
				po.status,
				c.nama_kustomer as "vendorName"
			FROM procurement.purchase_order po
			LEFT JOIN master.m_customer c ON c.id = po.vendor_id
			JOIN procurement.purchase_order_line pol ON pol.po_id = po.id
			JOIN procurement.purchase_request_line prl ON prl.id = pol.pr_line_id
			WHERE prl.pr_id = ${prId}
			ORDER BY po.id DESC
		`;

		return {
			pr,
			items,
			linkedPOs
		};
	} catch (err: any) {
		if (err?.status) throw err;
		console.error('Error loading PR detail:', err);
		throw error(500, 'Gagal memuat detail Purchase Request');
	}
};
