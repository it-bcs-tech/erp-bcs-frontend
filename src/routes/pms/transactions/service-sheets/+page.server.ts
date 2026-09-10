import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { formatAuditUser, verifyUserData } from '$lib/server/auth';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		// 1. Fetch Maintenance Service Sheets (Supply Slips from Work Orders)
		const maintHeaders = await sql`
			SELECT 
				h.id,
				h.dn_no as "ssNumber",
				h.wo_no as "woNo",
				to_char(h.dn_date, 'YYYY-MM-DD') as date,
				COALESCE(h.target_unit, w.unit_id, '-') as "unitNopol",
				COALESCE(u.no_rangka, '-') as "chassisNo",
				COALESCE(w.project_name, '-') as "projectName",
				'Work Order Maintenance' as tipe,
				COALESCE(w.assigned_mechanic, h.created_by, 'Mekanik Workshop') as "mekanikName",
				'-' as "helperName",
				'-' as "driverName",
				COALESCE(w.problem, w.keluhan_driver, h.note, 'Permintaan suku cadang WO') as problem,
				h.picked_by,
				k.nama_karyawan as "pickerName",
				h.note as notes,
				h.created_at as "createdAt",
				h.updated_at as "updatedAt"
			FROM fleet.maintenance_dn_header h
			LEFT JOIN fleet.work_orders w ON h.wo_no = w.wo_no
			LEFT JOIN fleet.unit u ON (u.nomor_unit = h.target_unit OR u.nomor_unit = w.unit_id)
			LEFT JOIN master.m_karyawan k ON h.picked_by = k.payroll_id
			ORDER BY h.created_at DESC
		`;

		const maintDetails = await sql`
			SELECT 
				d.id,
				d.dn_no,
				d.material_id,
				d.qty_request,
				d.qty_actual,
				d.price,
				d.total,
				m.id as m_id,
				m.name as material_name,
				m.material_code,
				m.spec,
				m.uom,
				m.stock
			FROM fleet.maintenance_dn_detail d
			LEFT JOIN master.m_materials m ON 
				CASE 
					WHEN d.material_id ~ '^[0-9]+$' THEN m.id = d.material_id::integer 
					ELSE m.material_code = d.material_id 
				END
		`;

		const maintSheets = maintHeaders.map((header: any) => {
			const details = maintDetails.filter((d: any) => d.dn_no === header.ssNumber);
			const isIssued = !!header.picked_by;
			const items = details.map((d: any) => {
				const stock = parseFloat(d.stock) || 0;
				const qtyReq = parseFloat(d.qty_request) || 0;
				const qtyAct = d.qty_actual !== null ? parseFloat(d.qty_actual) : (isIssued ? qtyReq : qtyReq);
				return {
					id: d.id,
					detail_id: d.id,
					materialId: d.m_id,
					material_db_id: d.m_id,
					materialCode: d.material_code || d.material_id,
					materialName: d.material_name || d.material_id,
					spec: d.spec || '-',
					qty: qtyReq,
					qty_request: qtyReq,
					qtyActual: qtyAct,
					qty_actual: qtyAct,
					uom: d.uom || 'Pcs',
					stock: stock,
					price: parseFloat(d.price) || 0,
					total: parseFloat(d.total) || 0,
					isShortage: qtyReq > stock,
					shortageQty: Math.max(0, qtyReq - stock),
					notes: '-'
				};
			});
			const hasShortage = items.some((i: any) => i.isShortage);

			return {
				id: 'maint_' + header.id,
				rawId: header.id,
				ssNumber: header.ssNumber,
				woNo: header.woNo,
				date: header.date,
				unitNopol: header.unitNopol,
				chassisNo: header.chassisNo,
				projectName: header.projectName,
				tipe: header.tipe,
				mekanikName: header.mekanikName,
				helperName: header.helperName,
				driverName: header.driverName,
				problem: header.problem,
				status: isIssued ? 'Issued' : 'Pending',
				isIssued,
				hasShortage,
				pickedBy: header.picked_by,
				pickerName: header.pickerName || header.picked_by,
				notes: header.notes,
				createdAt: header.createdAt,
				source: 'maintenance',
				items
			};
		});

		// 2. Fetch Direct Manual Service Sheets from procurement schema
		const directSheetsRaw = await sql`
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
				ss.created_at as "createdAt",
				COALESCE((
					SELECT json_agg(json_build_object(
						'id', ssi.id,
						'detail_id', ssi.id,
						'materialId', m.id,
						'material_db_id', m.id,
						'materialCode', m.material_code,
						'materialName', m.name,
						'spec', COALESCE(m.spec, '-'),
						'qty', ssi.qty,
						'qty_request', ssi.qty,
						'qtyActual', ssi.qty,
						'qty_actual', ssi.qty,
						'uom', ssi.uom,
						'stock', m.stock,
						'price', COALESCE(m.standard_price, 0),
						'total', 0,
						'isShortage', false,
						'shortageQty', 0,
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

		const directSheets = directSheetsRaw.map((s: any) => ({
			...s,
			status: s.status === 'OPEN' ? 'Issued' : (s.status || 'Issued'),
			isIssued: true,
			hasShortage: false,
			source: 'manual',
			pickerName: s.mekanikName,
			rawId: s.id
		}));

		// Combine both, ordered by createdAt descending
		let allSheets = [...maintSheets, ...directSheets].sort((a, b) => {
			const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
			const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
			return timeB - timeA;
		});

		// 3. Auxiliary datasets
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

		const warehouseStaff = await sql`
			SELECT k.payroll_id as id, k.nama_karyawan as name 
			FROM master.m_karyawan k
			LEFT JOIN master.m_title t ON k.title = t.title_code
			LEFT JOIN master.m_dept d ON k.dept_id = d.dept_code
			WHERE k.aktif = 'Y' 
			AND (
				t.title ILIKE '%warehouse%' OR t.title ILIKE '%gudang%' OR t.title ILIKE '%storage%' OR t.title ILIKE '%inventory%' OR
				d.dept_name ILIKE '%warehouse%' OR d.dept_name ILIKE '%gudang%' OR d.dept_name ILIKE '%storage%' OR d.dept_name ILIKE '%procurement%'
			)
			ORDER BY k.nama_karyawan ASC
		`;

		if (search) {
			allSheets = allSheets.filter((s: any) =>
				(s.ssNumber && s.ssNumber.toLowerCase().includes(search)) ||
				(s.unitNopol && s.unitNopol.toLowerCase().includes(search)) ||
				(s.woNo && s.woNo.toLowerCase().includes(search)) ||
				(s.mekanikName && s.mekanikName.toLowerCase().includes(search)) ||
				(s.pickerName && s.pickerName.toLowerCase().includes(search)) ||
				(s.driverName && s.driverName.toLowerCase().includes(search)) ||
				(s.problem && s.problem.toLowerCase().includes(search))
			);
		}

		return {
			sheets: allSheets,
			units,
			projects,
			drivers,
			materials,
			warehouseStaff
		};
	} catch (err: any) {
		console.error('Error loading Service Sheets:', err);
		return { sheets: [], units: [], projects: [], drivers: [], materials: [], warehouseStaff: [] };
	}
};

export const actions: Actions = {
	issueParts: async ({ request, cookies }) => {
		const formData = await request.formData();
		const ssNo = formData.get('ss_no')?.toString() || formData.get('ssNo')?.toString();
		const pickerName = formData.get('picker_name')?.toString();
		const issuedPartsJson = formData.get('issued_parts')?.toString();

		if (!ssNo || !pickerName || !issuedPartsJson) {
			return fail(400, { success: false, message: 'Data penyerahan tidak lengkap' });
		}

		let systemUser = 'system';
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const user = verifyUserData(userDataCookie);
				systemUser = user.username || 'system';
			} catch (e) {}
		}

		try {
			const parts = JSON.parse(issuedPartsJson);

			return await sql.begin(async (tx) => {
				const totalQty = parts.reduce((acc: number, p: any) => acc + (parseFloat(p.qty_actual || p.qtyActual) || 0), 0);
				if (totalQty <= 0) {
					throw new Error('Total barang yang diserahkan (Actual Issue) tidak boleh 0.');
				}

				// 1. Update Header in fleet.maintenance_dn_header
				await tx`
					UPDATE fleet.maintenance_dn_header
					SET picked_by = ${pickerName}, updated_by = ${systemUser}, updated_at = NOW()
					WHERE dn_no = ${ssNo}
				`;

				// 2. Process details
				for (const part of parts) {
					const qtyActual = parseFloat(part.qty_actual || part.qtyActual) || 0;
					const price = parseFloat(part.price) || 0;
					const materialDbId = parseInt(part.material_db_id || part.materialId);

					if (qtyActual > 0 && materialDbId) {
						// Validate Stock
						const stockCheck = await tx`SELECT stock, name FROM master.m_materials WHERE id = ${materialDbId} FOR UPDATE`;
						if (stockCheck.length > 0 && stockCheck[0].stock < qtyActual) {
							throw new Error(`Stok barang "${stockCheck[0].name}" tidak mencukupi (Stok: ${stockCheck[0].stock}, Diminta: ${qtyActual}).`);
						}

						// Deduct stock
						await tx`
							UPDATE master.m_materials
							SET stock = stock - ${qtyActual}, updated_at = NOW()
							WHERE id = ${materialDbId}
						`;

						// Insert inventory ledger
						await tx`
							INSERT INTO master.m_inventory_transactions (
								material_id, transaction_type, qty, reference_no, note, created_by
							) VALUES (
								${materialDbId}, 'OUT', ${qtyActual}, ${ssNo}, ${'Issued via SS to ' + pickerName}, ${systemUser}
							)
						`;
					}

					if (part.detail_id || part.id) {
						const detailId = part.detail_id || part.id;
						await tx`
							UPDATE fleet.maintenance_dn_detail
							SET 
								qty_actual = ${qtyActual},
								total = ${qtyActual * price},
								updated_at = NOW()
							WHERE id = ${detailId}
						`;
					}
				}

				return { success: true, message: `Barang untuk Service Sheet ${ssNo} berhasil diserahkan & stok telah dipotong!` };
			});
		} catch (err: any) {
			console.error('Failed to issue SS:', err);
			return fail(500, { success: false, message: err.message || 'Gagal memproses penyerahan suku cadang' });
		}
	},

	save: async ({ request, locals }) => {
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
		const createdBy = formatAuditUser(locals.user);
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
						status,
						created_by
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
						'OPEN',
						${createdBy}
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
