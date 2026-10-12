import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { verifyUserData } from '$lib/server/auth';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ cookies }) => {
	try {
		// 1. Fetch current logged-in inspector
		let currentInspector = { id: '', name: 'Inspector Workshop' };
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const user = verifyUserData(userDataCookie);
				currentInspector = { 
					id: user.payrollId || user.payroll_id || (user.id ? String(user.id) : '') || '', 
					name: user.name || user.nama || user.username || 'Inspector Workshop' 
				};
			} catch (e) {}
		}

		// 2. Fetch active units
		const units = await sql`
			SELECT 
				u.id,
				u.nomor_unit as no_unit,
				u.tahun,
				u.business_unit,
				t.nama_tipe as type_name,
				k.nama_karyawan as driver_name,
				k.payroll_id as driver_id
			FROM fleet.unit u
			LEFT JOIN master.m_model_unit m ON u.model_unit_id::text = m.id::text
			LEFT JOIN master.m_tipe_unit t ON m.tipe_unit_id::text = t.id::text
			LEFT JOIN fleet.unit_driver_assignment a ON u.id::text = a.unit_id::text AND a.is_aktif = true AND a.posisi = 'SUPIR_UTAMA'
			LEFT JOIN master.m_drivers d ON a.driver_id = d.id
			LEFT JOIN master.m_karyawan k ON d.karyawan_id = k.id
			WHERE u.is_active = true
			ORDER BY u.nomor_unit ASC
		`;

		// 3. Fetch active drivers
		const drivers = await sql`
			SELECT 
				k.payroll_id as id, 
				k.nama_karyawan as name
			FROM master.m_drivers d
			JOIN master.m_karyawan k ON d.karyawan_id = k.id
			WHERE k.aktif = 'Y'
			ORDER BY k.nama_karyawan ASC
		`;

		const formattedUnits = units.map(u => {
			const typeName = (u.type_name || '').toUpperCase();
			const bu = (u.business_unit || '').toUpperCase();
			let classifiedType: 'DT' | 'TR' | 'BULK' = 'TR';
			if (bu === 'DUMP_TRUCK' || typeName.includes('DUMP')) {
				classifiedType = 'DT';
			} else if (typeName.includes('BULK') || typeName.includes('TRONTON')) {
				classifiedType = 'BULK';
			} else {
				classifiedType = 'TR';
			}

			return {
				id: u.id,
				noUnit: u.no_unit,
				type: classifiedType,
				year: u.tahun || null,
				driverName: u.driver_name || '',
				driverId: u.driver_id || ''
			};
		});

		return {
			currentInspector,
			units: formattedUnits,
			drivers: drivers.map(d => ({
				id: d.id,
				name: d.name
			}))
		};

	} catch (err) {
		console.error("Error loading P2H mobile create form:", err);
		return {
			currentInspector: { id: '', name: 'Inspector' },
			units: [],
			drivers: []
		};
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();

		const unit_id = data.get('unit_id')?.toString();
		const driver_id = data.get('driver_id')?.toString();
		const kenek_name = data.get('kenek_name')?.toString() || '';
		const odometer = data.get('odometer') ? parseFloat(data.get('odometer')!.toString()) : null;
		const destination = data.get('destination')?.toString() || 'Area Operasional BCS';
		const inspection_type = data.get('inspection_type')?.toString() || 'P2H_RUTIN';
		const no_apar = data.get('no_apar')?.toString() || 'APAR OK';
		const police_no = data.get('police_no')?.toString() || unit_id || '';
		const driver_health = data.get('driver_health')?.toString() || 'SEHAT';
		const notes = data.get('notes')?.toString() || '';
		const checklist_data_raw = data.get('checklist_data')?.toString() || '[]';
		const tire_depth_data_raw = data.get('tire_depth_data')?.toString() || '{}';

		let inspector_name = 'Inspector Workshop';
		let inspector_id = null;
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const user = verifyUserData(userDataCookie);
				inspector_name = user.name || user.nama || user.username || 'Inspector Workshop';
				inspector_id = user.payrollId || user.payroll_id || null;
			} catch (e) {}
		}

		if (!unit_id || !driver_id) {
			return fail(400, { missing: true, message: 'Nomor Unit dan Pengemudi wajib diisi.' });
		}

		let checklist_data: any[] = [];
		try {
			checklist_data = JSON.parse(checklist_data_raw);
		} catch (e) {
			checklist_data = [];
		}

		let tire_depth_data: any = {};
		try {
			tire_depth_data = JSON.parse(tire_depth_data_raw);
		} catch (e) {
			tire_depth_data = {};
		}

		// Calculate defect count
		let defect_count = 0;
		if (Array.isArray(checklist_data)) {
			defect_count = checklist_data.filter((item: any) => item.status === 'NOT_OK').length;
		}

		// Check thin tires (< 1.0 mm)
		let hasThinTire = false;
		if (tire_depth_data && typeof tire_depth_data === 'object') {
			Object.values(tire_depth_data).forEach((val: any) => {
				const num = parseFloat(val);
				if (!isNaN(num) && num > 0 && num < 1.0) {
					hasThinTire = true;
				}
			});
		}

		let finalStatus = 'LAYAK';
		if (defect_count > 0 || hasThinTire) {
			finalStatus = 'TIDAK_LAYAK';
		}

		try {
			// Generate Inspection Number: INSP/WSP/YYYYMM/XXXX
			const now = new Date();
			const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
			const inspPrefix = `INSP/WSP/${yyyymm}/`;

			const lastInsp = await sql`
				SELECT inspection_no 
				FROM fleet.vehicle_inspections 
				WHERE inspection_no LIKE ${inspPrefix + '%'}
				ORDER BY id DESC 
				LIMIT 1
			`;

			let inspSeq = 1;
			if (lastInsp.length > 0) {
				const parts = lastInsp[0].inspection_no.split('/');
				const numStr = parts[parts.length - 1];
				const num = parseInt(numStr, 10);
				if (!isNaN(num)) inspSeq = num + 1;
			}
			const inspection_no = `${inspPrefix}${String(inspSeq).padStart(4, '0')}`;

			// If LAYAK and unit was MAINTENANCE, unlock to AT_POOL
			if (finalStatus === 'LAYAK') {
				await sql`
					UPDATE fleet.unit 
					SET current_state = CASE WHEN current_state = 'MAINTENANCE' THEN 'AT_POOL' ELSE current_state END,
					    updated_at = NOW()
					WHERE nomor_unit = ${unit_id}
				`;
			}

			// Insert into fleet.vehicle_inspections
			await sql`
				INSERT INTO fleet.vehicle_inspections (
					inspection_no,
					inspection_date,
					inspection_type,
					unit_id,
					unit_type,
					police_no,
					driver_id,
					kenek_name,
					odometer,
					checklist_data,
					defect_count,
					driver_health,
					status,
					inspector_name,
					inspector_id,
					notes,
					no_apar,
					destination,
					tire_depth_data,
					created_at,
					updated_at
				) VALUES (
					${inspection_no},
					NOW(),
					${inspection_type},
					${unit_id},
					'Truck',
					${police_no},
					${driver_id},
					${kenek_name},
					${odometer},
					${sql.json(checklist_data)},
					${defect_count},
					${driver_health},
					${finalStatus},
					${inspector_name},
					${inspector_id},
					${notes},
					${no_apar},
					${destination},
					${sql.json(tire_depth_data)},
					NOW(),
					NOW()
				)
			`;

			throw redirect(303, `/p2h/${encodeURIComponent(inspection_no)}`);

		} catch (err: any) {
			if (err?.status === 303) throw err;
			console.error("Error saving P2H mobile inspection:", err);
			return fail(500, { error: true, message: 'Gagal menyimpan hasil inspeksi P2H.' });
		}
	}
};
