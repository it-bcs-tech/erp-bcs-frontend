import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		const projects = await sql`
			SELECT 
				p.id,
				COALESCE(p.project_code, 'PRJ-' || p.id) as "projectCode",
				p.project_name as "projectName",
				COALESCE(p.category::text, 'General') as category,
				COALESCE(p.remarks, p.description, '-') as remarks,
				l.id as site_id,
				COALESCE(l.loc_name, 'Semua Site') as "siteName",
				COALESCE(l.alias, l.loc_code, '-') as "siteAlias",
				p.is_active
			FROM master.m_project p
			LEFT JOIN master.m_lokasi l ON l.id = p.site_id
			ORDER BY p.id DESC
		`;

		const sites = await sql`
			SELECT id, loc_code, loc_name, COALESCE(alias, loc_code) as alias FROM master.m_lokasi ORDER BY loc_code
		`;

		let filtered = projects;
		if (search) {
			filtered = filtered.filter(p =>
				(p.projectName && p.projectName.toLowerCase().includes(search)) ||
				(p.projectCode && p.projectCode.toLowerCase().includes(search)) ||
				(p.siteName && p.siteName.toLowerCase().includes(search)) ||
				(p.remarks && p.remarks.toLowerCase().includes(search))
			);
		}

		return {
			projects: filtered,
			sites
		};
	} catch (err: any) {
		console.error('Error loading PMS projects:', err);
		return { projects: [], sites: [] };
	}
};

export const actions: Actions = {
	save: async ({ request }) => {
		const formData = await request.formData();
		const code = (formData.get('projectCode') as string || '').trim().toUpperCase();
		const name = (formData.get('projectName') as string || '').trim();
		const siteId = formData.get('siteId') ? parseInt(formData.get('siteId') as string) : null;
		const category = (formData.get('category') as string || '').trim();
		const remarks = (formData.get('remarks') as string || '').trim();

		if (!name) {
			return fail(400, { success: false, message: 'Nama Project wajib diisi!' });
		}

		try {
			await sql`
				INSERT INTO master.m_project (
					project_code,
					project_name,
					site_id,
					description,
					remarks,
					is_active
				) VALUES (
					${code || `PRJ-${Date.now().toString().slice(-4)}`},
					${name},
					${siteId},
					${remarks},
					${remarks},
					true
				)
			`;
			return { success: true, message: 'Project berhasil ditambahkan!' };
		} catch (err: any) {
			console.error('Error creating project:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan project' });
		}
	}
};
