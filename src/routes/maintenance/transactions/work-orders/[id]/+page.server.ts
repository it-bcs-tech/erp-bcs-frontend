import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { verifyUserData } from '$lib/server/auth';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ params }) => {
	const idOrNo = decodeURIComponent(params.id);

	try {
		// 1. Fetch Work Order
		const workOrders = await sql`
			SELECT 
				w.*,
				m.nama_karyawan as mechanic_name,
				h.nama_karyawan as helper_mechanic_name,
				d.nama_karyawan as driver_name,
				w.kilometer as current_unit_km,
				COALESCE(tu.nama_tipe, u.business_unit::text, 'Truck') as unit_type
			FROM fleet.work_orders w
			LEFT JOIN master.m_karyawan m ON w.mechanic_id = m.payroll_id
			LEFT JOIN master.m_karyawan h ON w.helper_mechanic_id = h.payroll_id
			LEFT JOIN master.m_karyawan d ON w.driver_id = d.payroll_id
			LEFT JOIN fleet.unit u ON w.unit_id = u.nomor_unit
			LEFT JOIN master.m_model_unit mu ON u.model_unit_id::text = mu.id::text
			LEFT JOIN master.m_tipe_unit tu ON mu.tipe_unit_id::text = tu.id::text
			WHERE w.wo_no = ${idOrNo} OR w.id::text = ${idOrNo}
			LIMIT 1
		`;

		if (workOrders.length === 0) {
			throw error(404, 'Work Order tidak ditemukan.');
		}

		const wo = workOrders[0];

		// 2. Fetch linked Delivery Note / Spareparts from PMS if any
		const pmsParts = await sql`
			SELECT 
				d.id,
				COALESCE(m.material_code, d.material_id) as material_code,
				COALESCE(m.name, 'Item ' || d.material_id) as item_name,
				COALESCE(d.qty_actual, d.qty_request, 0) as qty,
				COALESCE(m.uom, 'PCS') as uom,
				COALESCE(d.price, 0) as unit_price,
				COALESCE(d.total, 0) as total,
				COALESCE(d.location, '') as keterangan
			FROM fleet.maintenance_dn_header h
			JOIN fleet.maintenance_dn_detail d ON h.dn_no = d.dn_no
			LEFT JOIN master.m_materials m ON 
				CASE 
					WHEN d.material_id ~ '^[0-9]+$' THEN m.id = d.material_id::integer 
					ELSE m.material_code = d.material_id 
				END
			WHERE h.wo_no = ${wo.wo_no}
			ORDER BY d.id ASC
		`;

		// 3. Materials catalog from PMS master.m_materials (Limit 100 active items)
		const materials = await sql`
			SELECT 
				id,
				material_code,
				name,
				brand,
				part_no,
				uom,
				COALESCE(standard_price, 0) as price,
				COALESCE(stock, 0) as stock
			FROM master.m_materials
			WHERE is_active = true
			ORDER BY name ASC
			LIMIT 150
		`;

		// 4. Mechanics list
		const mechanics = await sql`
			SELECT payroll_id as id, nama_karyawan as name
			FROM master.m_karyawan
			WHERE aktif = 'Y'
			ORDER BY nama_karyawan ASC
		`;

		// Format repaired_items
		let repairedItems = Array.isArray(wo.repaired_items) ? wo.repaired_items : [];
		if (repairedItems.length === 0 && Array.isArray(wo.checklist_items)) {
			// Fallback: if repaired_items is empty, migrate checklist_items
			repairedItems = wo.checklist_items.map((c: any, idx: number) => ({
				id: `item_${idx + 1}`,
				category: wo.maint_category || 'General',
				item: c.item,
				remark: c.remark || '',
				status: c.status === 'OK' ? 'RESOLVED' : 'PENDING',
				mechanic_notes: '',
				repaired_at: null
			}));
		}

		return {
			wo: {
				id: wo.id,
				woNo: wo.wo_no,
				date: wo.wo_date ? new Date(wo.wo_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
				closedDate: wo.closed_at ? new Date(wo.closed_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : null,
				unitId: wo.unit_id,
				unitType: wo.unit_type || 'Truck',
				kilometer: wo.kilometer ? wo.kilometer.toLocaleString('id-ID') : (wo.current_unit_km?.toLocaleString('id-ID') || '-'),
				driverName: wo.driver_name || 'Tanpa Driver',
				driverId: wo.driver_id,
				mechanicId: wo.mechanic_id,
				mechanicName: wo.mechanic_name || 'Belum Ditugaskan',
				helperMechanicId: wo.helper_mechanic_id,
				helperMechanicName: wo.helper_mechanic_name || '-',
				category: wo.maint_category || 'Regular Repair',
				complaint: wo.keluhan_driver || '-',
				status: wo.status || 'Open',
				location: wo.job_location || 'Workshop Pool Utama',
				inspectionNo: wo.inspection_no || null,
				repairedItems,
				sparepartsUsed: Array.isArray(wo.spareparts_used) ? wo.spareparts_used : [],
				pmsParts: pmsParts.map(p => ({
					id: p.id,
					code: p.material_code,
					name: p.item_name,
					qty: p.qty,
					uom: p.uom,
					price: Number(p.unit_price || 0),
					total: Number(p.total || 0),
					remark: p.keterangan
				})),
				conclusion: wo.conclusion || '',
				createdBy: wo.created_by,
				recommendation: wo.recommendation || '',
				operationalReason: wo.operational_reason || '',
				commitmentDate: wo.commitment_date ? new Date(wo.commitment_date).toISOString().slice(0, 10) : null,
				dispensationData: wo.dispensation_data || {
					is_requested: false,
					recommendation: wo.recommendation || '',
					operational_reason: wo.operational_reason || '',
					commitment_date: wo.commitment_date ? new Date(wo.commitment_date).toISOString().slice(0, 10) : null,
					deferred_items: [],
					approval_maintenance: { approved: false, by: null, at: null, notes: '' },
					approval_inspek: { approved: false, by: null, at: null, notes: '' },
					approval_operational: { approved: false, by: null, at: null, notes: '' }
				}
			},
			materials: materials.map(m => ({
				id: m.id,
				code: m.material_code,
				name: m.name,
				brand: m.brand || '',
				partNo: m.part_no || '',
				uom: m.uom || 'PCS',
				price: Number(m.price),
				stock: Number(m.stock)
			})),
			mechanics
		};

	} catch (err: any) {
		if (err?.status === 404) throw err;
		console.error("Error fetching Work Order detail:", err);
		throw error(500, 'Gagal memuat detail Work Order.');
	}
};

export const actions: Actions = {
	// 1. Assign Mechanic
	assignMechanic: async ({ request, params }) => {
		const idOrNo = decodeURIComponent(params.id);
		const data = await request.formData();
		const mechanic_id = data.get('mechanic_id')?.toString();
		const helper_mechanic_id = data.get('helper_mechanic_id')?.toString() || null;

		if (!mechanic_id) {
			return fail(400, { missing: true, message: 'Mekanik utama wajib dipilih.' });
		}

		try {
			await sql`
				UPDATE fleet.work_orders
				SET mechanic_id = ${mechanic_id},
				    helper_mechanic_id = ${helper_mechanic_id},
				    status = CASE WHEN status = 'Open' OR status = 'PENDING_ASSIGNMENT' THEN 'Proses' ELSE status END,
				    updated_at = NOW()
				WHERE wo_no = ${idOrNo} OR id::text = ${idOrNo}
			`;
			return { success: true, message: 'Penugasan mekanik berhasil diperbarui.' };
		} catch (e) {
			console.error("Error assigning mechanic:", e);
			return fail(500, { error: true, message: 'Gagal memperbarui penugasan mekanik.' });
		}
	},

	// 2. Update Resolution Status for a single Item
	updateItemStatus: async ({ request, params }) => {
		const idOrNo = decodeURIComponent(params.id);
		const data = await request.formData();
		const item_id = data.get('item_id')?.toString();
		const item_status = data.get('item_status')?.toString(); // 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'
		const mechanic_notes = data.get('mechanic_notes')?.toString() || '';

		try {
			const woRes = await sql`SELECT repaired_items FROM fleet.work_orders WHERE wo_no = ${idOrNo} OR id::text = ${idOrNo}`;
			if (woRes.length === 0) return fail(404, { message: 'WO tidak ditemukan.' });

			let items: any[] = Array.isArray(woRes[0].repaired_items) ? woRes[0].repaired_items : [];
			items = items.map(item => {
				if (item.id === item_id) {
					return {
						...item,
						status: item_status,
						mechanic_notes: mechanic_notes || item.mechanic_notes,
						repaired_at: item_status === 'RESOLVED' ? new Date().toISOString() : item.repaired_at
					};
				}
				return item;
			});

			await sql`
				UPDATE fleet.work_orders
				SET repaired_items = ${JSON.stringify(items)},
				    updated_at = NOW()
				WHERE wo_no = ${idOrNo} OR id::text = ${idOrNo}
			`;

			return { success: true };
		} catch (e) {
			console.error("Error updating item status:", e);
			return fail(500, { error: true, message: 'Gagal memperbarui status item.' });
		}
	},

	// 3. Add Sparepart (Integrate into spareparts_used & fleet.maintenance_dn_detail)
	addSparepart: async ({ request, params, cookies }) => {
		const idOrNo = decodeURIComponent(params.id);
		const data = await request.formData();
		const material_code = data.get('material_code')?.toString();
		const material_name = data.get('material_name')?.toString();
		const qty = parseFloat(data.get('qty')?.toString() || '1') || 1;
		const uom = data.get('uom')?.toString() || 'PCS';
		const price = parseFloat(data.get('price')?.toString() || '0') || 0;
		const item_ref = data.get('item_ref')?.toString() || '';

		let createdBy = 'mechanic';
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const user = verifyUserData(userDataCookie);
				createdBy = user.nama || user.username || 'mechanic';
			} catch (e) {}
		}

		try {
			const woRes = await sql`SELECT wo_no, unit_id, spareparts_used FROM fleet.work_orders WHERE wo_no = ${idOrNo} OR id::text = ${idOrNo}`;
			if (woRes.length === 0) return fail(404, { message: 'WO tidak ditemukan.' });

			const targetWoNo = woRes[0].wo_no;
			const targetUnit = woRes[0].unit_id;
			let parts: any[] = Array.isArray(woRes[0].spareparts_used) ? woRes[0].spareparts_used : [];

			const newPart = {
				id: `sp_${Date.now()}`,
				material_code,
				material_name,
				qty,
				uom,
				unit_price: price,
				total: qty * price,
				item_ref,
				added_at: new Date().toISOString()
			};
			parts.push(newPart);

			// Update WO
			await sql`
				UPDATE fleet.work_orders
				SET spareparts_used = ${JSON.stringify(parts)},
				    updated_at = NOW()
				WHERE wo_no = ${targetWoNo}
			`;

			// Check / Create DN Header
			let dnHeader = await sql`SELECT dn_no FROM fleet.maintenance_dn_header WHERE wo_no = ${targetWoNo} LIMIT 1`;
			let dn_no = dnHeader.length > 0 ? dnHeader[0].dn_no : null;

			if (!dn_no) {
				const now = new Date();
				const month = String(now.getMonth() + 1).padStart(2, '0');
				const year = now.getFullYear();
				const dnSuffix = `/DN/MNT/${month}/${year}`;
				const lastDn = await sql`SELECT dn_no FROM fleet.maintenance_dn_header WHERE dn_no LIKE ${'%' + dnSuffix} ORDER BY dn_no DESC LIMIT 1`;
				let seq = 1;
				if (lastDn.length > 0) {
					seq = parseInt(lastDn[0].dn_no.split('/')[0], 10) + 1;
				}
				dn_no = `${String(seq).padStart(5, '0')}${dnSuffix}`;

				await sql`
					INSERT INTO fleet.maintenance_dn_header (
						dn_no,
						dn_date,
						wo_no,
						target_unit,
						created_by,
						created_at
					) VALUES (
						${dn_no},
						NOW(),
						${targetWoNo},
						${targetUnit},
						${createdBy},
						NOW()
					)
				`;
			}

			// Insert Detail
			await sql`
				INSERT INTO fleet.maintenance_dn_detail (
					dn_no,
					material_id,
					qty_request,
					qty_supply,
					qty_actual,
					price,
					total,
					location,
					created_by,
					created_at
				) VALUES (
					${dn_no},
					${material_code},
					${qty},
					${qty},
					${qty},
					${price},
					${qty * price},
					${item_ref ? 'Item: ' + item_ref : 'Pemakaian perbaikan bengkel'},
					${createdBy},
					NOW()
				)
			`;

			return { success: true };
		} catch (e) {
			console.error("Error adding sparepart:", e);
			return fail(500, { error: true, message: 'Gagal mencatat pemakaian suku cadang.' });
		}
	},

	// 4. Send to Re-Inspection
	sendToReinspection: async ({ params }) => {
		const idOrNo = decodeURIComponent(params.id);

		try {
			const woRes = await sql`SELECT wo_no, repaired_items, inspection_no FROM fleet.work_orders WHERE wo_no = ${idOrNo} OR id::text = ${idOrNo}`;
			if (woRes.length === 0) return fail(404, { message: 'WO tidak ditemukan.' });

			const wo = woRes[0];
			const items: any[] = Array.isArray(wo.repaired_items) ? wo.repaired_items : [];

			const hasPending = items.some(i => i.status !== 'RESOLVED');
			if (hasPending) {
				return fail(400, { incomplete: true, message: 'Seluruh item perbaikan wajib diselesaikan (RESOLVED) sebelum dikirim ke Re-Inspeksi.' });
			}

			// Update WO status
			await sql`
				UPDATE fleet.work_orders
				SET status = 'READY_FOR_REINSPECTION',
				    updated_at = NOW()
				WHERE wo_no = ${wo.wo_no}
			`;

			return { success: true, message: 'Perbaikan telah selesai dan tiket berhasil dikirim ke antrean Re-Inspeksi!' };
		} catch (e) {
			console.error("Error sending to reinspection:", e);
			return fail(500, { error: true, message: 'Gagal mengirim ke Re-Inspeksi.' });
		}
	},

	// 5. Request Dispensation (Mekanik mengajukan izin jalan sementara sebelum perbaikan tuntas)
	requestDispensation: async ({ request, params, cookies }) => {
		const idOrNo = decodeURIComponent(params.id);
		const data = await request.formData();
		const recommendation = data.get('recommendation')?.toString() || '';
		const operational_reason = data.get('operational_reason')?.toString() || '';
		const commitment_date = data.get('commitment_date')?.toString() || null;

		let applicantName = 'Mekanik / Workshop';
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const user = verifyUserData(userDataCookie);
				applicantName = user.nama || user.username || 'Mekanik / Workshop';
			} catch (e) {}
		}

		if (!recommendation || !operational_reason) {
			return fail(400, { missing: true, message: 'Rekomendasi teknis dan alasan operasional wajib diisi.' });
		}

		try {
			const woRes = await sql`SELECT wo_no, repaired_items, dispensation_data FROM fleet.work_orders WHERE wo_no = ${idOrNo} OR id::text = ${idOrNo}`;
			if (woRes.length === 0) return fail(404, { message: 'WO tidak ditemukan.' });

			const wo = woRes[0];
			const items: any[] = Array.isArray(wo.repaired_items) ? wo.repaired_items : [];
			const deferredItems = items.filter(i => i.status !== 'RESOLVED');

			const dispensationData = {
				is_requested: true,
				requested_by: applicantName,
				requested_at: new Date().toISOString(),
				recommendation,
				operational_reason,
				commitment_date,
				deferred_items: deferredItems.map(d => ({ id: d.id, item: d.item, category: d.category })),
				approval_maintenance: { approved: false, by: null, at: null, notes: '' },
				approval_inspek: { approved: false, by: null, at: null, notes: '' },
				approval_operational: { approved: false, by: null, at: null, notes: '' }
			};

			await sql`
				UPDATE fleet.work_orders
				SET recommendation = ${recommendation},
				    operational_reason = ${operational_reason},
				    commitment_date = ${commitment_date},
				    dispensation_data = ${JSON.stringify(dispensationData)},
				    updated_at = NOW()
				WHERE wo_no = ${wo.wo_no}
			`;

			return { success: true, message: 'Pengajuan dispensasi jalan berhasil dikirim untuk persetujuan 3 pihak.' };
		} catch (e) {
			console.error("Error requesting dispensation:", e);
			return fail(500, { error: true, message: 'Gagal mengajukan dispensasi jalan.' });
		}
	},

	// 6. Approve Dispensation (Persetujuan bertingkat Maintenance, Inspek, dan Operational)
	approveDispensation: async ({ request, params, cookies }) => {
		const idOrNo = decodeURIComponent(params.id);
		const data = await request.formData();
		const role_type = data.get('role_type')?.toString(); // 'maintenance' | 'inspek' | 'operational'
		const notes = data.get('notes')?.toString() || '';

		let approverName = 'Approver';
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const user = verifyUserData(userDataCookie);
				approverName = user.nama || user.username || 'Approver';
			} catch (e) {}
		}

		if (!role_type || !['maintenance', 'inspek', 'operational'].includes(role_type)) {
			return fail(400, { message: 'Pihak approval tidak valid.' });
		}

		try {
			const woRes = await sql`SELECT wo_no, unit_id, dispensation_data FROM fleet.work_orders WHERE wo_no = ${idOrNo} OR id::text = ${idOrNo}`;
			if (woRes.length === 0) return fail(404, { message: 'WO tidak ditemukan.' });

			const wo = woRes[0];
			let disp = wo.dispensation_data || {};

			const approvalKey = `approval_${role_type}`;
			disp[approvalKey] = {
				approved: true,
				by: approverName,
				at: new Date().toISOString(),
				notes
			};

			// Check if all 3 approvals are now true
			const allApproved = 
				disp.approval_maintenance?.approved === true &&
				disp.approval_inspek?.approved === true &&
				disp.approval_operational?.approved === true;

			if (allApproved) {
				// 1. Set WO status to DISPENSATION_ACTIVE
				await sql`
					UPDATE fleet.work_orders
					SET status = 'DISPENSATION_ACTIVE',
					    dispensation_data = ${JSON.stringify(disp)},
					    updated_at = NOW()
					WHERE wo_no = ${wo.wo_no}
				`;

				// 2. Unlock vehicle in fleet.unit (Set to STANDBY so OCS Dispatcher can assign trip)
				if (wo.unit_id) {
					await sql`
						UPDATE fleet.unit
						SET current_state = 'STANDBY',
						    updated_at = NOW()
						WHERE nomor_unit = ${wo.unit_id}
					`;
				}

				return { success: true, message: 'Dispensasi jalan telah disetujui lengkap oleh 3 pihak! Unit kini siap operasi (STANDBY).' };
			} else {
				// Save partial approval
				await sql`
					UPDATE fleet.work_orders
					SET dispensation_data = ${JSON.stringify(disp)},
					    updated_at = NOW()
					WHERE wo_no = ${wo.wo_no}
				`;

				return { success: true, message: `Persetujuan dari pihak ${role_type.toUpperCase()} berhasil dicatat.` };
			}

		} catch (e) {
			console.error("Error approving dispensation:", e);
			return fail(500, { error: true, message: 'Gagal memproses persetujuan dispensasi.' });
		}
	},

	// 7. Return to Workshop (Unit kembali dari trip dispensasi ke pool bengkel)
	returnToWorkshop: async ({ params }) => {
		const idOrNo = decodeURIComponent(params.id);

		try {
			const woRes = await sql`SELECT wo_no, unit_id FROM fleet.work_orders WHERE wo_no = ${idOrNo} OR id::text = ${idOrNo}`;
			if (woRes.length === 0) return fail(404, { message: 'WO tidak ditemukan.' });

			const wo = woRes[0];

			// 1. Revert WO status to 'Proses'
			await sql`
				UPDATE fleet.work_orders
				SET status = 'Proses',
				    updated_at = NOW()
				WHERE wo_no = ${wo.wo_no}
			`;

			// 2. Lock vehicle back to 'MAINTENANCE' in fleet.unit
			if (wo.unit_id) {
				await sql`
					UPDATE fleet.unit
					SET current_state = 'MAINTENANCE',
					    updated_at = NOW()
					WHERE nomor_unit = ${wo.unit_id}
				`;
			}

			return { success: true, message: 'Unit telah ditandai kembali ke bengkel. Status unit terkunci (MAINTENANCE) untuk melanjutkan sisa perbaikan.' };
		} catch (e) {
			console.error("Error returning to workshop:", e);
			return fail(500, { error: true, message: 'Gagal mengembalikan status unit ke bengkel.' });
		}
	}
};
