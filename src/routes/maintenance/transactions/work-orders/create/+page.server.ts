import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { verifyUserData } from '$lib/server/auth';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ url }) => {
	const fromInspection = url.searchParams.get('from_inspection') || url.searchParams.get('inspection_id') || '';
	let prefillUnit = url.searchParams.get('unit') || '';
	let prefillCategory = url.searchParams.get('category') || 'Regular Repair';
	let prefillDriver = '';
	let prefillOdometer: number | null = null;
	let prefillComplaint = '';
	let inspectionRef: any = null;
	let importedTasks: { item: string; category: string; remark: string }[] = [];

	try {
		// 1. If from_inspection is provided, fetch inspection data & defects
		if (fromInspection) {
			const inspRows = await sql`
				SELECT * FROM fleet.vehicle_inspections 
				WHERE inspection_no = ${fromInspection} 
				LIMIT 1
			`;

			if (inspRows.length > 0) {
				const insp = inspRows[0];
				prefillUnit = insp.unit_id || prefillUnit;
				prefillDriver = insp.driver_id || '';
				prefillOdometer = insp.odometer || null;
				prefillCategory = 'Corrective Repair (P2H)';

				// Extract checklist defects (status === 'NOT_OK')
				let checklist: any[] = [];
				try {
					checklist = typeof insp.checklist_data === 'string' ? JSON.parse(insp.checklist_data) : (insp.checklist_data || []);
				} catch (e) {}

				checklist.filter((i: any) => i.status === 'NOT_OK').forEach((i: any) => {
					importedTasks.push({
						item: i.name || i.item || 'Item Perbaikan',
						category: i.category || 'PEMERIKSAAN FISIK',
						remark: i.remark || 'Temuan cacat saat inspeksi P2H'
					});
				});

				// Extract thin tires (< 1.0 mm)
				let tires: any = {};
				try {
					tires = typeof insp.tire_depth_data === 'string' ? JSON.parse(insp.tire_depth_data) : (insp.tire_depth_data || {});
				} catch (e) {}

				if (Array.isArray(tires.head)) {
					tires.head.forEach((v: any, idx: number) => {
						const num = parseFloat(v);
						if (!isNaN(num) && num > 0 && num < 1.0) {
							importedTasks.push({
								item: `Penggantian/Perbaikan Ban Head #${idx + 1} (${num} mm)`,
								category: 'BAN',
								remark: `Kedalaman alur ban ${num} mm < standar 1.0 mm (SK.523)`
							});
						}
					});
				}

				if (Array.isArray(tires.trailer)) {
					tires.trailer.forEach((v: any, idx: number) => {
						const num = parseFloat(v);
						if (!isNaN(num) && num > 0 && num < 1.0) {
							importedTasks.push({
								item: `Penggantian/Perbaikan Ban Trailer #${idx + 1} (${num} mm)`,
								category: 'BAN',
								remark: `Kedalaman alur ban ${num} mm < standar 1.0 mm (SK.523)`
							});
						}
					});
				}

				if (tires.spare !== null && !isNaN(parseFloat(tires.spare))) {
					const sNum = parseFloat(tires.spare);
					if (sNum > 0 && sNum < 1.0) {
						importedTasks.push({
							item: `Penggantian/Perbaikan Ban Cadangan / Serep (${sNum} mm)`,
							category: 'BAN',
							remark: `Kedalaman alur ban serep ${sNum} mm < standar 1.0 mm`
						});
					}
				}

				prefillComplaint = `Temuan Hasil Inspeksi P2H ${insp.inspection_no} (${importedTasks.length} item perbaikan)`;

				inspectionRef = {
					inspectionNo: insp.inspection_no,
					unitId: insp.unit_id,
					unitType: insp.unit_type,
					inspectorName: insp.inspector_name,
					defectCount: insp.defect_count,
					policeNo: insp.police_no
				};
			}
		}

		// 2. Units
		const units = await sql`
			SELECT u.nomor_unit as no_unit, u.tipe_kendaraan, u.odometer
			FROM fleet.unit u
			WHERE u.is_active = true
			ORDER BY u.nomor_unit ASC
		`;

		// 3. Mechanics
		const mechanics = await sql`
			SELECT payroll_id as id, nama_karyawan as name
			FROM master.m_karyawan
			WHERE aktif = 'Y'
			ORDER BY nama_karyawan ASC
		`;

		// 4. Drivers
		const drivers = await sql`
			SELECT k.payroll_id as id, k.nama_karyawan as name
			FROM master.m_drivers d
			JOIN master.m_karyawan k ON d.karyawan_id = k.id
			WHERE k.aktif = 'Y'
			ORDER BY k.nama_karyawan ASC
		`;

		return {
			units: units.map(u => ({
				noUnit: u.no_unit,
				type: u.tipe_kendaraan,
				odometer: u.odometer || 0
			})),
			mechanics,
			drivers,
			initialUnit: prefillUnit,
			initialCategory: prefillCategory,
			initialDriver: prefillDriver,
			initialOdometer: prefillOdometer,
			initialComplaint: prefillComplaint,
			inspectionRef,
			importedTasks
		};
	} catch (error) {
		console.error("Database error loading WO create data:", error);
		return { 
			units: [], 
			mechanics: [], 
			drivers: [], 
			initialUnit: prefillUnit, 
			initialCategory: prefillCategory,
			initialDriver: '',
			initialOdometer: null,
			initialComplaint: '',
			inspectionRef: null,
			importedTasks: []
		};
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();

		const unit_id = data.get('unit_id')?.toString();
		const driver_id = data.get('driver_id')?.toString() || null;
		const mechanic_id = data.get('mechanic_id')?.toString() || null;
		const helper_mechanic_id = data.get('helper_mechanic_id')?.toString() || null;
		const maint_category = data.get('maint_category')?.toString() || 'Regular Repair';
		const keluhan_driver = data.get('keluhan_driver')?.toString();
		const kilometer = parseInt(data.get('kilometer')?.toString() || '0') || null;
		const hourmeter = parseInt(data.get('hourmeter')?.toString() || '0') || null;
		const job_location = data.get('job_location')?.toString() || 'Workshop Pool Utama';
		const inspection_no = data.get('inspection_no')?.toString() || null;
		const items_raw = data.get('items')?.toString() || '[]';

		let parsedItems: any[] = [];
		try {
			parsedItems = JSON.parse(items_raw);
		} catch (e) {
			parsedItems = [];
		}

		let createdBy = 'system';
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const user = verifyUserData(userDataCookie);
				createdBy = user.nama || user.name || user.username || 'system';
			} catch (e) {}
		}

		if (!unit_id || !keluhan_driver) {
			return fail(400, { missing: true, message: 'Nomor Unit dan Keluhan/Pekerjaan wajib diisi!' });
		}

		try {
			// Generate WO Number
			const now = new Date();
			const month = String(now.getMonth() + 1).padStart(2, '0');
			const year = now.getFullYear();
			const suffix = `/WO/WSP/${month}/${year}`;

			const lastWo = await sql`
				SELECT wo_no FROM fleet.work_orders 
				WHERE wo_no LIKE ${'%' + suffix} 
				ORDER BY wo_no DESC LIMIT 1
			`;

			let seq = 1;
			if (lastWo.length > 0) {
				const lastSeqStr = lastWo[0].wo_no.split('/')[0];
				seq = parseInt(lastSeqStr, 10) + 1;
			}
			const newWoNo = `${String(seq).padStart(5, '0')}${suffix}`;

			// Build repaired_items array
			const repairedItems = parsedItems.length > 0
				? parsedItems.map((entry, idx) => {
					if (typeof entry === 'object' && entry !== null) {
						return {
							id: `wo_item_${idx + 1}`,
							category: entry.category || maint_category,
							item: entry.item || `Pekerjaan #${idx + 1}`,
							remark: entry.remark || 'Pekerjaan perbaikan',
							status: 'PENDING',
							mechanic_notes: '',
							repaired_at: null
						};
					} else {
						return {
							id: `wo_item_${idx + 1}`,
							category: maint_category,
							item: String(entry),
							remark: 'Pekerjaan perbaikan',
							status: 'PENDING',
							mechanic_notes: '',
							repaired_at: null
						};
					}
				})
				: [{
					id: 'wo_item_1',
					category: maint_category,
					item: keluhan_driver,
					remark: 'Pekerjaan perbaikan utama',
					status: 'PENDING',
					mechanic_notes: '',
					repaired_at: null
				}];

			const initialStatus = mechanic_id ? 'Proses' : 'Open';

			// Insert into fleet.work_orders
			await sql`
				INSERT INTO fleet.work_orders (
					wo_no,
					unit_id,
					driver_id,
					mechanic_id,
					helper_mechanic_id,
					keluhan_driver,
					maint_category,
					kilometer,
					hourmeter,
					job_location,
					status,
					wo_date,
					checklist_items,
					repaired_items,
					inspection_no,
					created_at,
					created_by
				) VALUES (
					${newWoNo},
					${unit_id},
					${driver_id},
					${mechanic_id},
					${helper_mechanic_id},
					${keluhan_driver},
					${maint_category},
					${kilometer},
					${hourmeter},
					${job_location},
					${initialStatus},
					NOW(),
					${JSON.stringify(repairedItems.map(r => ({ item: r.item, status: 'Not Yet' })))},
					${JSON.stringify(repairedItems)},
					${inspection_no},
					NOW(),
					${createdBy}
				)
			`;

			// Lock vehicle state to MAINTENANCE (transisi resmi saat SPK diterbitkan)
			await sql`
				UPDATE fleet.unit
				SET current_state = 'MAINTENANCE',
				    odometer = COALESCE(${kilometer}, odometer),
				    updated_at = NOW()
				WHERE nomor_unit = ${unit_id}
			`;

			// Link work order to inspection if created from inspection
			if (inspection_no) {
				await sql`
					UPDATE fleet.vehicle_inspections
					SET wo_no = ${newWoNo},
					    updated_at = NOW()
					WHERE inspection_no = ${inspection_no}
				`;
			}

			throw redirect(303, `/maintenance/transactions/work-orders/${encodeURIComponent(newWoNo)}`);

		} catch (error: any) {
			if (error?.status === 303) throw error;
			console.error("Failed to create manual WO:", error);
			return fail(500, { error: true, message: 'Gagal membuat Work Order ke database.' });
		}
	}
};
