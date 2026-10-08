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

		// 2. Fetch active units with model & type info
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

		// 3. Fetch active drivers for selection
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

		// 4. Fetch active dispensations
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
		return { 
			currentInspector: { id: '', name: 'Inspector Workshop' }, 
			units: [], 
			drivers: [], 
			activeDispensations: [] 
		};
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();

		const unit_id = data.get('unit_id')?.toString();
		const unit_type = (data.get('unit_type')?.toString() || 'DT').toUpperCase(); // 'DT' | 'TR' | 'BULK'
		const police_no = data.get('police_no')?.toString() || unit_id || '';
		const driver_id = data.get('driver_id')?.toString() || null;
		const driver_id_no = data.get('driver_id_no')?.toString() || driver_id || '';
		const kenek_name = data.get('kenek_name')?.toString() || null;
		const no_apar = data.get('no_apar')?.toString() || '';
		const destination = data.get('destination')?.toString() || '';
		const driver_age = parseInt(data.get('driver_age')?.toString() || '0') || null;
		const odometer = parseInt(data.get('odometer')?.toString() || '0') || null;
		const notes = data.get('notes')?.toString() || '';

		// Timestamps Masuk & Keluar
		const entry_date = data.get('entry_date')?.toString() || new Date().toISOString().slice(0, 10);
		const entry_time = data.get('entry_time')?.toString() || '08:00';
		const exit_date = data.get('exit_date')?.toString() || new Date().toISOString().slice(0, 10);
		const exit_time = data.get('exit_time')?.toString() || '08:30';

		const entryTimestamp = new Date(`${entry_date}T${entry_time}:00`);
		const exitTimestamp = new Date(`${exit_date}T${exit_time}:00`);

		// Inspector Identity
		let inspector_name = data.get('inspector_name')?.toString() || 'Inspector Workshop';
		let inspector_id = data.get('inspector_id')?.toString() || '';
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie && !inspector_id) {
			try {
				const user = verifyUserData(userDataCookie);
				inspector_name = user.name || user.nama || user.username || inspector_name;
				inspector_id = user.payrollId || user.payroll_id || (user.id ? String(user.id) : '') || inspector_id;
			} catch (e) {}
		}

		// Structured Data
		const checklist_data_raw = data.get('checklist_data')?.toString() || '[]';
		const driver_health_raw = data.get('driver_health')?.toString() || '{}';
		const tire_depth_data_raw = data.get('tire_depth_data')?.toString() || '{}';
		const user_recommendation = data.get('recommendation')?.toString(); // 'LAYAK' | 'LAYAK_DENGAN_CATATAN' | 'TIDAK_LAYAK'

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

		let tire_depth_data: any = { head: [], trailer: [], spare: null };
		try {
			tire_depth_data = JSON.parse(tire_depth_data_raw);
		} catch (e) {
			tire_depth_data = { head: [], trailer: [], spare: null };
		}

		if (!unit_id) {
			return fail(400, { missing: true, message: 'Nomor Unit armada wajib dipilih!' });
		}

		try {
			// 1. Check for tire depth defects (< 1.0 mm)
			let tireDefects: string[] = [];
			const checkTireList = (list: any[], label: string) => {
				if (Array.isArray(list)) {
					list.forEach((val, idx) => {
						const num = parseFloat(val);
						if (!isNaN(num) && num > 0 && num < 1.0) {
							tireDefects.push(`Ban ${label} #${idx + 1} (${num} mm < 1.0 mm)`);
						}
					});
				}
			};
			checkTireList(tire_depth_data.head, 'Head');
			checkTireList(tire_depth_data.trailer, 'Trailer');
			if (tire_depth_data.spare !== null && !isNaN(parseFloat(tire_depth_data.spare))) {
				const sNum = parseFloat(tire_depth_data.spare);
				if (sNum > 0 && sNum < 1.0) {
					tireDefects.push(`Ban Serep (${sNum} mm < 1.0 mm)`);
				}
			}

			// 2. Identify checklist defects
			const defectItems = checklist_data.filter((item: any) => item.status === 'NOT_OK');
			
			// Categorize whether defects are mechanical / critical or just minor administrative
			const criticalCategories = [
				'MESIN', 'REM', 'BAN', 'KOPLING & TRANSMISI', 'BAK & HYDROLIC', 'SPION', 'BAN & KAKI-KAKI',
				'PENGECEKAN KEBOCORAN', 'PENGECEKAN KAKI-KAKI', 'PENGECEKAN LAMPU LAMPU',
				'FUNCTION: CEK KEBOCORAN', 'FUNCTION: CHECK UNDER CARRIAGE', 'FUNCTION: CHECK UNDER THE HOOD',
				'FUNCTION: BULK TANK TOOLS', 'SAFETY: CHECK WHEELS', 'SAFETY: OPERATION OF LAMP'
			];

			const hasMechanicalDefects = defectItems.some((d: any) => 
				criticalCategories.some(cat => (d.category || '').toUpperCase().includes(cat))
			) || tireDefects.length > 0;

			// 3. Determine 3-Tier Status
			let finalStatus: 'LAYAK' | 'LAYAK_DENGAN_CATATAN' | 'TIDAK_LAYAK' = 'LAYAK';
			if (user_recommendation) {
				finalStatus = user_recommendation as any;
			} else if (hasMechanicalDefects || (driver_health.is_fit === false)) {
				finalStatus = 'TIDAK_LAYAK';
			} else if (defectItems.length > 0) {
				finalStatus = 'LAYAK_DENGAN_CATATAN';
			} else {
				finalStatus = 'LAYAK';
			}

			// Total defect count
			const defectCount = defectItems.length + tireDefects.length;

			// 4. Generate Inspection Number: INSP/WSP/YYYYMM/XXXX
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

			// Jika status LAYAK atau LAYAK_DENGAN_CATATAN dan unit sebelumnya MAINTENANCE, kembalikan ke STANDBY
			if (finalStatus === 'LAYAK' || finalStatus === 'LAYAK_DENGAN_CATATAN') {
				await sql`
					UPDATE fleet.unit 
					SET current_state = CASE WHEN current_state = 'MAINTENANCE' THEN 'STANDBY' ELSE current_state END,
					    updated_at = NOW()
					WHERE nomor_unit = ${unit_id}
				`;
			}

			// 6. Insert record into fleet.vehicle_inspections
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
					inspector_id,
					police_no,
					no_apar,
					destination,
					entry_time,
					exit_time,
					tire_depth_data,
					notes,
					created_at,
					updated_at
				) VALUES (
					${inspection_no},
					NOW(),
					${'MASUK_KELUAR'},
					${unit_id},
					${unit_type},
					${driver_id},
					${kenek_name},
					${odometer},
					${JSON.stringify(checklist_data)},
					${defectCount},
					${JSON.stringify({
						...driver_health,
						driver_age,
						driver_id_no,
						destination
					})},
					${finalStatus},
					${generatedWoNo},
					${inspector_name},
					${inspector_id},
					${police_no},
					${no_apar},
					${destination},
					${entryTimestamp},
					${exitTimestamp},
					${JSON.stringify(tire_depth_data)},
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
