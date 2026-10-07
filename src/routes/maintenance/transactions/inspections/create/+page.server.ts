import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { verifyUserData } from '$lib/server/auth';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// 1. Fetch active units
		const units = await sql`
			SELECT 
				u.id,
				u.nomor_unit as no_unit,
				u.tipe_kendaraan as type,
				u.odometer,
				k.nama_karyawan as driver_name,
				k.payroll_id as driver_id
			FROM fleet.unit u
			LEFT JOIN fleet.unit_driver_assignment a ON u.id = a.unit_id AND a.is_aktif = true AND a.posisi = 'SUPIR_UTAMA'
			LEFT JOIN master.m_drivers d ON a.driver_id = d.id
			LEFT JOIN master.m_karyawan k ON d.karyawan_id = k.id
			WHERE u.is_active = true
			ORDER BY u.nomor_unit ASC
		`;

		// 2. Fetch active drivers for selection
		const drivers = await sql`
			SELECT 
				k.payroll_id as id, 
				k.nama_karyawan as name,
				k.tgl_lahir
			FROM master.m_drivers d
			JOIN master.m_karyawan k ON d.karyawan_id = k.id
			WHERE k.aktif = 'Y'
			ORDER BY k.nama_karyawan ASC
		`;

		// 3. Fetch active dispensations
		const activeDispensations = await sql`
			SELECT 
				w.wo_no, 
				w.unit_id, 
				w.recommendation, 
				w.operational_reason,
				w.commitment_date,
				w.dispensation_data
			FROM fleet.work_orders w
			WHERE w.status = 'DISPENSATION_ACTIVE'
		`;

		return {
			units: units.map(u => ({
				id: u.id,
				noUnit: u.no_unit,
				type: u.type?.toLowerCase().includes('trailer') ? 'TR' : 'DT',
				odometer: u.odometer || 0,
				driverName: u.driver_name || '',
				driverId: u.driver_id || ''
			})),
			drivers: drivers.map(d => ({
				id: d.id,
				name: d.name,
				birthDate: d.tgl_lahir
			})),
			activeDispensations: activeDispensations.map(d => ({
				woNo: d.wo_no,
				unitId: d.unit_id,
				recommendation: d.recommendation || '',
				operationalReason: d.operational_reason || '',
				commitmentDate: d.commitment_date ? new Date(d.commitment_date).toISOString().slice(0, 10) : null,
				deferredItems: (d.dispensation_data?.deferred_items || []) as any[]
			}))
		};
	} catch (error) {
		console.error("Database error loading inspection form data:", error);
		return { units: [], drivers: [], activeDispensations: [] };
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();

		const unit_id = data.get('unit_id')?.toString();
		const unit_type = (data.get('unit_type')?.toString() || 'DT').toUpperCase();
		const inspection_type = data.get('inspection_type')?.toString() || 'MASUK';
		const driver_id = data.get('driver_id')?.toString() || null;
		const kenek_name = data.get('kenek_name')?.toString() || null;
		const odometer = parseInt(data.get('odometer')?.toString() || '0') || null;
		const notes = data.get('notes')?.toString() || '';

		const checklist_data_raw = data.get('checklist_data')?.toString() || '[]';
		const driver_health_raw = data.get('driver_health')?.toString() || '{}';

		let checklist_data: any[] = [];
		try {
			checklist_data = JSON.parse(checklist_data_raw);
		} catch (e) {
			checklist_data = [];
		}

		let driver_health: any = {};
		try {
			driver_health = JSON.parse(driver_health_raw);
		} catch (e) {
			driver_health = { is_fit: true };
		}

		// Inspector name from user session
		let inspectorName = 'Inspector Workshop';
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const user = verifyUserData(userDataCookie);
				inspectorName = user.nama || user.username || 'Inspector Workshop';
			} catch (e) {}
		}

		if (!unit_id) {
			return fail(400, { missing: true, message: 'Nomor Unit armada wajib dipilih!' });
		}

		try {
			// 1. Calculate defect items
			const defectItems = checklist_data.filter((item: any) => item.status === 'NOT_OK');
			const defectCount = defectItems.length;
			const inspectionStatus = defectCount > 0 ? 'FAILED_DEFECT' : 'PASSED';

			// 2. Generate Inspection Number: INSP/WSP/YYYYMM/XXXX
			const now = new Date();
			const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
			const inspPrefix = `INSP/WSP/${yearMonth}/`;

			const lastInsp = await sql`
				SELECT inspection_no FROM fleet.vehicle_inspections 
				WHERE inspection_no LIKE ${inspPrefix + '%'} 
				ORDER BY inspection_no DESC LIMIT 1
			`;

			let inspSeq = 1;
			if (lastInsp.length > 0) {
				const parts = lastInsp[0].inspection_no.split('/');
				const lastNum = parseInt(parts[parts.length - 1], 10);
				if (!isNaN(lastNum)) inspSeq = lastNum + 1;
			}
			const inspection_no = `${inspPrefix}${String(inspSeq).padStart(4, '0')}`;

			let generatedWoNo: string | null = null;

			// 3. If there are defects, automatically generate Work Order (SPK)
			if (defectCount > 0) {
				const month = String(now.getMonth() + 1).padStart(2, '0');
				const year = now.getFullYear();
				const woSuffix = `/WO/WSP/${month}/${year}`;

				const lastWo = await sql`
					SELECT wo_no FROM fleet.work_orders 
					WHERE wo_no LIKE ${'%' + woSuffix} 
					ORDER BY wo_no DESC LIMIT 1
				`;

				let woSeq = 1;
				if (lastWo.length > 0) {
					const lastSeqStr = lastWo[0].wo_no.split('/')[0];
					woSeq = parseInt(lastSeqStr, 10) + 1;
				}
				generatedWoNo = `${String(woSeq).padStart(5, '0')}${woSuffix}`;

				// Format repaired_items for per-item resolution
				const repairedItemsList = defectItems.map((d: any) => ({
					id: d.id,
					category: d.category,
					item: d.name || d.item,
					remark: d.remark || 'Temuan P2H tidak layak',
					status: 'PENDING', // PENDING -> IN_PROGRESS -> RESOLVED
					mechanic_notes: '',
					repaired_at: null
				}));

				const checklistItemsForWo = defectItems.map((d: any) => ({
					item: d.name || d.item,
					remark: d.remark || 'P2H Defect',
					status: 'Not Yet'
				}));

				// Insert into fleet.work_orders
				await sql`
					INSERT INTO fleet.work_orders (
						wo_no,
						unit_id,
						driver_id,
						keluhan_driver,
						maint_category,
						kilometer,
						status,
						wo_date,
						checklist_items,
						repaired_items,
						inspection_no,
						created_at,
						created_by
					) VALUES (
						${generatedWoNo},
						${unit_id},
						${driver_id},
						${`Temuan Inspeksi P2H (${defectCount} item defect perlu perbaikan)`},
						${'Corrective Repair (P2H)'},
						${odometer},
						${'Open'},
						NOW(),
						${JSON.stringify(checklistItemsForWo)},
						${JSON.stringify(repairedItemsList)},
						${inspection_no},
						NOW(),
						${inspectorName}
					)
				`;

				// 4. Update fleet.unit status to MAINTENANCE (Locked from OCS dispatch)
				await sql`
					UPDATE fleet.unit 
					SET current_state = 'MAINTENANCE',
					    odometer = COALESCE(${odometer}, odometer),
					    updated_at = NOW()
					WHERE nomor_unit = ${unit_id}
				`;
			} else {
				// If PASSED, ensure unit current_state is AVAILABLE / STANDBY
				await sql`
					UPDATE fleet.unit 
					SET current_state = CASE WHEN current_state = 'MAINTENANCE' THEN 'STANDBY' ELSE current_state END,
					    odometer = COALESCE(${odometer}, odometer),
					    updated_at = NOW()
					WHERE nomor_unit = ${unit_id}
				`;
			}

			// 5. Insert record into fleet.vehicle_inspections
			await sql`
				INSERT INTO fleet.vehicle_inspections (
					inspection_no,
					inspection_date,
					inspection_type,
					unit_id,
					unit_type,
					driver_id,
					kenek_name,
					odometer,
					checklist_data,
					defect_count,
					driver_health,
					status,
					wo_no,
					inspector_name,
					notes,
					created_at,
					updated_at
				) VALUES (
					${inspection_no},
					NOW(),
					${inspection_type},
					${unit_id},
					${unit_type},
					${driver_id},
					${kenek_name},
					${odometer},
					${JSON.stringify(checklist_data)},
					${defectCount},
					${JSON.stringify(driver_health)},
					${inspectionStatus},
					${generatedWoNo},
					${inspectorName},
					${notes},
					NOW(),
					NOW()
				)
			`;

			// Redirect to inspection detail
			throw redirect(303, `/maintenance/transactions/inspections/${encodeURIComponent(inspection_no)}`);

		} catch (error: any) {
			if (error?.status === 303) throw error;
			console.error("Error saving inspection:", error);
			return fail(500, { error: true, message: 'Gagal menyimpan hasil inspeksi ke database.' });
		}
	}
};
