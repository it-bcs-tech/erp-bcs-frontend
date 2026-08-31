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
				COALESCE(pr.category, 'SUPPORTING') as category,
				pr.status,
				pr.notes,
				p.project_name as "projectName",
				COALESCE(p.project_code, 'PRJ-' || p.id) as "projectCode",
				l.loc_name as "siteName",
				COUNT(prl.id) as item_count,
				COALESCE(SUM(prl.qty_requested), 0) as total_qty
			FROM procurement.purchase_request pr
			LEFT JOIN master.m_project p ON p.id = pr.project_id
			LEFT JOIN master.m_lokasi l ON l.id = pr.site_id
			LEFT JOIN procurement.purchase_request_line prl ON prl.pr_id = pr.id
			GROUP BY pr.id, pr.pr_number, pr.date, pr.department, pr.requested_by, pr.category, pr.status, pr.notes, p.project_name, p.project_code, p.id, l.loc_name
			ORDER BY pr.id DESC
		`;

		let filtered = requests;
		if (search) {
			filtered = filtered.filter(r =>
				(r.prNumber && r.prNumber.toLowerCase().includes(search)) ||
				(r.requestedBy && r.requestedBy.toLowerCase().includes(search)) ||
				(r.projectName && r.projectName.toLowerCase().includes(search)) ||
				(r.department && r.department.toLowerCase().includes(search))
			);
		}
		if (statusFilter) {
			filtered = filtered.filter(r => r.status === statusFilter);
		}

		return {
			requests: filtered
		};
	} catch (err: any) {
		console.error('Error loading PR list:', err);
		return { requests: [] };
	}
};

export const actions: Actions = {
	approvePR: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		if (!id) return fail(400, { success: false, message: 'ID PR tidak valid' });

		try {
			await sql`UPDATE procurement.purchase_request SET status = 'APPROVED', updated_at = NOW() WHERE id = ${id}`;
			return { success: true, message: 'PR berhasil disetujui (Approved)!' };
		} catch (e: any) {
			return fail(500, { success: false, message: 'Gagal menyetujui PR' });
		}
	},
	rejectPR: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		if (!id) return fail(400, { success: false, message: 'ID PR tidak valid' });

		try {
			await sql`UPDATE procurement.purchase_request SET status = 'REJECTED', updated_at = NOW() WHERE id = ${id}`;
			return { success: true, message: 'PR telah ditolak' };
		} catch (e: any) {
			return fail(500, { success: false, message: 'Gagal menolak PR' });
		}
	}
};
