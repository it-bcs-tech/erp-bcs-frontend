import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { error, fail, redirect } from '@sveltejs/kit';

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
				pr.department,
				pr.requested_by as "requestedBy",
				COALESCE(pr.category, 'SUPPORTING') as category,
				pr.status,
				pr.notes,
				pr.project_id as "projectId",
				pr.site_id as "siteId"
			FROM procurement.purchase_request pr
			WHERE pr.id = ${prId}
		`;

		if (!pr) {
			throw error(404, 'Purchase Request tidak ditemukan');
		}

		if (pr.status === 'PROCESSED') {
			throw redirect(303, `/pms/transactions/pr/${prId}?error=already_processed`);
		}

		const items = await sql`
			SELECT 
				prl.id as line_id,
				prl.item_id as material_id,
				m.material_code,
				m.name,
				m.spec,
				m.brand,
				m.uom,
				m.stock,
				prl.qty_requested as qty,
				prl.remarks
			FROM procurement.purchase_request_line prl
			JOIN master.m_materials m ON m.id = prl.item_id
			WHERE prl.pr_id = ${prId}
			ORDER BY prl.id ASC
		`;

		const projects = await sql`SELECT id, project_code, project_name FROM master.m_project WHERE is_active = true ORDER BY project_name`;
		const sites = await sql`SELECT id, loc_code, loc_name FROM master.m_lokasi ORDER BY loc_code`;
		const materials = await sql`
			SELECT id, material_code, name, spec, brand, part_no, uom, standard_price, stock 
			FROM master.m_materials 
			WHERE is_active = true 
			ORDER BY name
		`;

		return {
			pr,
			items,
			projects,
			sites,
			materials
		};
	} catch (err: any) {
		if (err?.status === 302 || err?.status === 303 || err?.location) throw err;
		console.error('Error loading PR edit:', err);
		throw error(500, 'Gagal memuat data Purchase Request untuk diedit');
	}
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const prId = parseInt(params.id);
		if (isNaN(prId)) {
			return fail(400, { success: false, message: 'ID tidak valid' });
		}

		const formData = await request.formData();
		const date = (formData.get('date') as string) || new Date().toISOString().split('T')[0];
		const requiredDate = (formData.get('requiredDate') as string) || null;
		const department = ((formData.get('department') as string) || 'General').trim();
		const requestedBy = ((formData.get('requestedBy') as string) || '').trim();
		const projectId = formData.get('projectId') ? parseInt(formData.get('projectId') as string) : null;
		const siteId = formData.get('siteId') ? parseInt(formData.get('siteId') as string) : null;
		const category = ((formData.get('category') as string) || 'SUPPORTING').trim();
		const notes = ((formData.get('notes') as string) || '').trim();
		const itemsRaw = (formData.get('items') as string) || '[]';

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
			return fail(400, { success: false, message: 'Minimal 1 item material harus ada dalam PR!' });
		}

		try {
			const [existingPr] = await sql`SELECT status FROM procurement.purchase_request WHERE id = ${prId}`;
			if (!existingPr) {
				return fail(404, { success: false, message: 'PR tidak ditemukan' });
			}
			if (existingPr.status === 'PROCESSED') {
				return fail(400, { success: false, message: 'PR ini sudah diproses ke Purchase Order dan tidak dapat diedit!' });
			}

			// Update header
			await sql`
				UPDATE procurement.purchase_request
				SET 
					date = ${date},
					required_date = ${requiredDate},
					department = ${department},
					requested_by = ${requestedBy},
					project_id = ${projectId},
					site_id = ${siteId},
					category = ${category},
					notes = ${notes},
					updated_at = NOW()
				WHERE id = ${prId}
			`;

			// Replace line items
			await sql`DELETE FROM procurement.purchase_request_line WHERE pr_id = ${prId}`;

			for (const itm of items) {
				await sql`
					INSERT INTO procurement.purchase_request_line (
						pr_id,
						item_id,
						qty_requested,
						remarks
					) VALUES (
						${prId},
						${itm.material_id},
						${parseFloat(itm.qty) || 1},
						${itm.remarks || ''}
					)
				`;
			}
		} catch (err: any) {
			console.error('Error updating PR:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan perubahan PR' });
		}

		throw redirect(303, `/pms/transactions/pr/${prId}`);
	}
};
