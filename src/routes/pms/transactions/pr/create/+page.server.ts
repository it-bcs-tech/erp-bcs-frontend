import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		const projects = await sql`SELECT id, project_code, project_name FROM master.m_project WHERE is_active = true ORDER BY project_name`;
		const sites = await sql`SELECT id, loc_code, loc_name FROM master.m_lokasi ORDER BY loc_code`;
		const materials = await sql`
			SELECT id, material_code, name, spec, brand, part_no, uom, stock, standard_price 
			FROM master.m_materials 
			WHERE is_active = true 
			ORDER BY name
		`;

		return {
			projects,
			sites,
			materials
		};
	} catch (err: any) {
		console.error('Error loading PR create dependencies:', err);
		return { projects: [], sites: [], materials: [] };
	}
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const date = formData.get('date') as string || new Date().toISOString().split('T')[0];
		const requiredDate = formData.get('requiredDate') as string || null;
		const department = (formData.get('department') as string || 'General').trim();
		const requestedBy = (formData.get('requestedBy') as string || '').trim();
		const projectId = formData.get('projectId') ? parseInt(formData.get('projectId') as string) : null;
		const siteId = formData.get('siteId') ? parseInt(formData.get('siteId') as string) : null;
		const category = (formData.get('category') as string || 'SUPPORTING').trim();
		const notes = (formData.get('notes') as string || '').trim();
		const itemsRaw = formData.get('items') as string || '[]';

		if (!requestedBy) {
			return fail(400, { success: false, message: 'Nama Pemohon wajib diisi!' });
		}

		let items: any[] = [];
		try {
			items = JSON.parse(itemsRaw);
		} catch {
			items = [];
		}

		if (items.length === 0) {
			return fail(400, { success: false, message: 'Minimal 1 item material harus dipilih!' });
		}

		try {
			// Auto Generate PR Number: PR-YYMM-XXXX
			const now = new Date();
			const yymm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
			const [seqRow] = await sql`SELECT COUNT(*) as count FROM procurement.purchase_request`;
			const seq = (parseInt(seqRow?.count || '0') + 1).toString().padStart(4, '0');
			const prNumber = `PR-${yymm}-${seq}`;

			const [pr] = await sql`
				INSERT INTO procurement.purchase_request (
					pr_number,
					date,
					department,
					requested_by,
					project_id,
					site_id,
					category,
					required_date,
					status,
					notes
				) VALUES (
					${prNumber},
					${date},
					${department},
					${requestedBy},
					${projectId},
					${siteId},
					${category},
					${requiredDate},
					'PENDING',
					${notes}
				) RETURNING id
			`;

			for (const itm of items) {
				await sql`
					INSERT INTO procurement.purchase_request_line (
						pr_id,
						item_id,
						qty_requested,
						remarks
					) VALUES (
						${pr.id},
						${itm.material_id},
						${itm.qty},
						${itm.remarks || ''}
					)
				`;
			}
		} catch (err: any) {
			console.error('Error creating PR:', err);
			return fail(500, { success: false, message: err.message || 'Gagal membuat Purchase Request' });
		}

		throw redirect(303, '/pms/transactions/pr');
	}
};
