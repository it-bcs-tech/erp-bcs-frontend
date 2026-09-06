import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		const sheets = await sql`
			SELECT 
				ss.id,
				ss.ss_number as "ssNumber",
				COALESCE(ss.wo_no, '-') as "woNo",
				to_char(ss.date, 'YYYY-MM-DD') as date,
				COALESCE(u.nomor_unit, u.no_lambung, 'Unit-' || ss.unit_id) as "unitNopol",
				COALESCE(ss.chassis_no, u.no_rangka, '-') as "chassisNo",
				p.project_name as "projectName",
				COALESCE(ss.tipe, 'Perawatan Rutin') as tipe,
				COALESCE(ss.mekanik_name, 'Mekanik Workshop') as "mekanikName",
				COALESCE(ss.helper_name, '-') as "helperName",
				COALESCE(ss.driver_name, '-') as "driverName",
				COALESCE(ss.problem, '-') as problem,
				ss.status,
				ss.notes,
				COALESCE((
					SELECT json_agg(json_build_object(
						'materialCode', m.material_code,
						'materialName', m.name,
						'qty', ssi.qty,
						'uom', ssi.uom,
						'notes', ssi.notes
					))
					FROM procurement.service_sheet_item ssi
					JOIN master.m_materials m ON m.id = ssi.material_id
					WHERE ssi.service_sheet_id = ss.id
				), '[]'::json) as items
			FROM procurement.service_sheet ss
			LEFT JOIN fleet.unit u ON u.id = ss.unit_id
			LEFT JOIN master.m_project p ON p.id = ss.project_id
			ORDER BY ss.id DESC
		`;

		const units = await sql`
			SELECT id, nomor_unit as nopol, no_lambung as hull_number, COALESCE(no_rangka, '-') as chassis_no 
			FROM fleet.unit 
			WHERE is_active = true 
			ORDER BY nomor_unit ASC 
			LIMIT 200
		`;
		const projects = await sql`SELECT id, project_name FROM master.m_project WHERE is_active = true ORDER BY project_name`;
		const drivers = await sql`SELECT id, name FROM master.m_drivers WHERE is_active = true ORDER BY name ASC`;
		const materials = await sql`
			SELECT id, material_code, name, uom, stock, standard_price 
			FROM master.m_materials 
			WHERE is_active = true 
			ORDER BY name ASC
		`;

		let filtered = sheets;
		if (search) {
			filtered = filtered.filter(s =>
				(s.ssNumber && s.ssNumber.toLowerCase().includes(search)) ||
				(s.unitNopol && s.unitNopol.toLowerCase().includes(search)) ||
				(s.woNo && s.woNo.toLowerCase().includes(search)) ||
				(s.mekanikName && s.mekanikName.toLowerCase().includes(search)) ||
				(s.driverName && s.driverName.toLowerCase().includes(search)) ||
				(s.problem && s.problem.toLowerCase().includes(search))
			);
		}

		return {
			sheets: filtered,
			units,
			projects,
			drivers,
			materials
		};
	} catch (err: any) {
		console.error('Error loading Service Sheets:', err);
		return { sheets: [], units: [], projects: [], drivers: [], materials: [] };
	}
};

export const actions: Actions = {
	save: async ({ request }) => {
		const formData = await request.formData();
		const date = (formData.get('date') as string) || new Date().toISOString().split('T')[0];
		const woNo = ((formData.get('woNo') as string) || '').trim();
		const unitId = formData.get('unitId') ? parseInt(formData.get('unitId') as string) : null;
		const projectId = formData.get('projectId') ? parseInt(formData.get('projectId') as string) : null;
		const tipe = ((formData.get('tipe') as string) || 'Perawatan Rutin').trim();
		const mekanikName = ((formData.get('mekanikName') as string) || '').trim();
		const helperName = ((formData.get('helperName') as string) || '').trim();
		const driverName = ((formData.get('driverName') as string) || '').trim();
		const chassisNo = ((formData.get('chassisNo') as string) || '').trim();
		const problem = ((formData.get('problem') as string) || '').trim();
		const notes = ((formData.get('notes') as string) || '').trim();
		const itemsJson = (formData.get('itemsJson') as string) || '[]';

		if (!problem) {
			return fail(400, { success: false, message: 'Deskripsi Masalah/Problem perbaikan wajib diisi!' });
		}

		try {
			let parsedItems: Array<{ materialId: number; qty: number; uom: string; notes?: string }> = [];
			try {
				parsedItems = JSON.parse(itemsJson);
			} catch {
				parsedItems = [];
			}

			const now = new Date();
			const yymm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
			const [seqRow] = await sql`SELECT COUNT(*) as count FROM procurement.service_sheet`;
			const seq = (parseInt(seqRow?.count || '0') + 1).toString().padStart(4, '0');
			const ssNumber = `SS-${yymm}-${seq}`;

			await sql.begin(async tx => {
				const [newSS] = await tx`
					INSERT INTO procurement.service_sheet (
						ss_number,
						wo_no,
						date,
						unit_id,
						project_id,
						tipe,
						mekanik_name,
						helper_name,
						driver_name,
						chassis_no,
						problem,
						notes,
						status
					) VALUES (
						${ssNumber},
						${woNo || `WO-${Date.now().toString().slice(-4)}`},
						${date},
						${unitId},
						${projectId},
						${tipe},
						${mekanikName},
						${helperName},
						${driverName},
						${chassisNo},
						${problem},
						${notes},
						'OPEN'
					)
					RETURNING id
				`;

				for (const itm of parsedItems) {
					if (!itm.materialId || !itm.qty || itm.qty <= 0) continue;

					// 1. Insert detail item
					await tx`
						INSERT INTO procurement.service_sheet_item (
							service_sheet_id,
							material_id,
							qty,
							uom,
							notes
						) VALUES (
							${newSS.id},
							${itm.materialId},
							${itm.qty},
							${itm.uom || 'Pcs'},
							${itm.notes || '-'}
						)
					`;

					// 2. Potong stok master material
					await tx`
						UPDATE master.m_materials 
						SET stock = GREATEST(0, stock - ${itm.qty}),
						    updated_at = NOW()
						WHERE id = ${itm.materialId}
					`;

					// 3. Catat mutasi kartu stok keluar
					await tx`
						INSERT INTO master.m_inventory_transactions (
							material_id,
							transaction_type,
							qty,
							reference_no,
							note,
							created_at
						) VALUES (
							${itm.materialId},
							'OUT',
							${itm.qty},
							${ssNumber},
							${'Supply Slip pemakaian perbaikan armada (' + (woNo || ssNumber) + ')'},
							NOW()
						)
					`;
				}
			});

			return { success: true, message: `Supply Slip ${ssNumber} berhasil dicatat & stok sparepart telah dipotong!` };
		} catch (err: any) {
			console.error('Error creating supply slip:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan Supply Slip' });
		}
	}
};
