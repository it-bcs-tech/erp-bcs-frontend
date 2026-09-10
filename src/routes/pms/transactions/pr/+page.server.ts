import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();
		const statusFilter = url.searchParams.get('status') || '';

		const requests = await sql`
			SELECT 
				pr.id,
				pr.pr_number as "prNumber",
				to_char(pr.date, 'YYYY-MM-DD') as date,
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
				p.project_name as "projectName",
				COALESCE(p.project_code, 'PRJ-' || p.id) as "projectCode",
				l.loc_name as "siteName",
				COUNT(prl.id) as item_count,
				COALESCE(SUM(prl.qty_requested), 0) as total_qty
			FROM procurement.purchase_request pr
			LEFT JOIN master.m_karyawan mk ON mk.payroll_id = pr.created_by OR mk.payroll_id = SUBSTRING(pr.created_by FROM '\\(([^)]+)\\)') OR mk.nama_karyawan = pr.created_by
			LEFT JOIN master.m_project p ON p.id = pr.project_id
			LEFT JOIN master.m_lokasi l ON l.id = pr.site_id
			LEFT JOIN procurement.purchase_request_line prl ON prl.pr_id = pr.id
			GROUP BY pr.id, pr.pr_number, pr.date, pr.department, pr.requested_by, pr.created_by, mk.nama_karyawan, mk.payroll_id, pr.category, pr.status, pr.notes, p.project_name, p.project_code, p.id, l.loc_name
			ORDER BY pr.id DESC
		`;

		let filtered = requests;
		if (search) {
			filtered = filtered.filter(r =>
				(r.prNumber && r.prNumber.toLowerCase().includes(search)) ||
				(r.requestedBy && r.requestedBy.toLowerCase().includes(search)) ||
				(r.projectName && r.projectName.toLowerCase().includes(search)) ||
				(r.department && r.department.toLowerCase().includes(search)) ||
				(r.createdByName && r.createdByName.toLowerCase().includes(search)) ||
				(r.createdByPayroll && r.createdByPayroll.toLowerCase().includes(search))
			);
		}
		if (statusFilter) {
			if (statusFilter === 'OPEN') {
				filtered = filtered.filter(r => !r.status || r.status === 'PENDING' || r.status === 'OPEN' || r.status === 'DRAFT' || r.status === 'APPROVED');
			} else {
				filtered = filtered.filter(r => r.status === statusFilter);
			}
		}

		return {
			requests: filtered
		};
	} catch (err: any) {
		console.error('Error loading PR list:', err);
		return { requests: [] };
	}
};
