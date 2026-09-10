import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import { formatAuditUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const projects = await sql`SELECT id, project_code, project_name FROM master.m_project WHERE is_active = true ORDER BY project_name`;
		const sites = await sql`SELECT id, loc_code, loc_name FROM master.m_lokasi ORDER BY loc_code`;
		const materials = await sql`
			SELECT id, material_code, name, spec, brand, part_no, uom, stock, standard_price 
			FROM master.m_materials 
			WHERE is_active = true 
			ORDER BY name
		`;

		const fromDn = url.searchParams.get('from_dn')?.trim();
		let prefill: any = null;

		if (fromDn) {
			const dnRows = await sql`
				SELECT h.*, w.unit_id, w.wo_no, w.problem, w.keluhan_driver, w.project_code, w.project_name, w.job_location
				FROM fleet.maintenance_dn_header h
				LEFT JOIN fleet.work_orders w ON h.wo_no = w.wo_no
				WHERE h.dn_no = ${fromDn}
				LIMIT 1
			`;

			if (dnRows.length > 0) {
				const dn = dnRows[0];
				const details = await sql`
					SELECT d.*, m.id as m_id, m.name, m.material_code, m.spec, m.uom, m.stock
					FROM fleet.maintenance_dn_detail d
					LEFT JOIN master.m_materials m ON 
						CASE 
							WHEN d.material_id ~ '^[0-9]+$' THEN m.id = d.material_id::integer 
							ELSE m.material_code = d.material_id 
						END
					WHERE d.dn_no = ${fromDn}
				`;

				// Calculate shortage for each item: qty_request - stock
				const mappedItems = details.map((d: any) => {
					const stock = parseFloat(d.stock) || 0;
					const reqQty = parseFloat(d.qty_request) || 0;
					const shortage = Math.max(0, reqQty - stock);
					return {
						material_id: d.m_id,
						material_code: d.material_code || d.material_id,
						name: d.name || d.material_id,
						spec: d.spec && d.spec !== '-' ? d.spec : '-',
						uom: d.uom || 'Pcs',
						current_stock: stock,
						requested_dn: reqQty,
						qty: shortage > 0 ? shortage : reqQty,
						is_shortage: shortage > 0,
						remarks: `Kekurangan stok DN: ${dn.dn_no} (WO: ${dn.wo_no || '-'}, Unit: ${dn.unit_id || '-'})`
					};
				}).filter((i: any) => i.material_id);

				// Prioritize items with shortage; if none, include all
				const shortageOnly = mappedItems.filter((i: any) => i.is_shortage);
				const finalItems = shortageOnly.length > 0 ? shortageOnly : mappedItems;

				// Match project if exists
				let matchedProjectId: number | null = null;
				if (dn.project_code || dn.project_name) {
					const pMatch = projects.find((p: any) => 
						(dn.project_code && p.project_code === dn.project_code) || 
						(dn.project_name && p.project_name?.toLowerCase() === dn.project_name?.toLowerCase())
					);
					if (pMatch) matchedProjectId = pMatch.id;
				}

				prefill = {
					fromDn: dn.dn_no,
					woNo: dn.wo_no,
					unitId: dn.unit_id,
					department: 'Workshop / Maintenance',
					requestedBy: dn.created_by && dn.created_by !== 'system' ? dn.created_by : 'Mekanik Workshop',
					projectId: matchedProjectId,
					notes: `Pengadaan sparepart untuk Work Order ${dn.wo_no || '-'} (Unit: ${dn.unit_id || '-'}) - Ref DN: ${dn.dn_no}`,
					items: finalItems
				};
			}
		}

		return {
			projects,
			sites,
			materials,
			prefill
		};
	} catch (err: any) {
		console.error('Error loading PR create dependencies:', err);
		return { projects: [], sites: [], materials: [], prefill: null };
	}
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const formData = await request.formData();
		const date = formData.get('date') as string || new Date().toISOString().split('T')[0];
		const requiredDate = formData.get('requiredDate') as string || null;
		const department = (formData.get('department') as string || 'General').trim();
		const requestedBy = (formData.get('requestedBy') as string || '').trim();
		const createdBy = locals.user?.payrollId || locals.user?.name || 'SYSTEM';
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
					created_by,
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
					${createdBy},
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
