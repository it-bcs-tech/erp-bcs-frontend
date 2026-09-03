import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const typeFilter = url.searchParams.get('type') || 'All';
		const severityFilter = url.searchParams.get('severity') || 'All';
		const statusFilter = url.searchParams.get('status') || 'All';

		const [incidents, units, drivers] = await Promise.all([
			sql`
				SELECT 
					i.id,
					i.incident_number,
					i.incident_date,
					i.incident_type,
					i.severity,
					i.unit_id,
					i.driver_id,
					i.location,
					i.description,
					i.root_cause_analysis,
					i.car_number,
					i.corrective_action,
					i.preventive_action,
					i.pic_followup,
					i.due_date,
					i.status,
					COALESCE(i.financial_loss, 0) as financial_loss,
					COALESCE(i.lost_work_days, 0) as lost_work_days,
					i.consequence,
					i.is_human_factor,
					i.is_equipment_factor,
					i.is_method_factor,
					i.is_environment_factor,
					i.analysis_data,
					u.nomor_unit as unit_number,
					COALESCE(k.nama_karyawan, 'No Driver') as driver_name
				FROM qhse.incidents i
				LEFT JOIN fleet.unit u ON u.id = i.unit_id
				LEFT JOIN master.m_drivers d ON d.id = i.driver_id
				LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
				ORDER BY i.incident_date DESC
			`,
			sql`SELECT id, nomor_unit FROM fleet.unit WHERE is_active = true ORDER BY nomor_unit ASC`,
			sql`SELECT d.id, k.nama_karyawan as name FROM master.m_drivers d JOIN master.m_karyawan k ON k.id = d.karyawan_id WHERE d.is_active = true ORDER BY k.nama_karyawan ASC`,
			sql`
				SELECT 
					a.unit_id::text,
					a.driver_id::text,
					u.nomor_unit,
					k.nama_karyawan as driver_name
				FROM fleet.unit_driver_assignment a
				JOIN fleet.unit u ON u.id = a.unit_id
				JOIN master.m_drivers d ON d.id = a.driver_id
				JOIN master.m_karyawan k ON k.id = d.karyawan_id
				WHERE a.is_aktif = true
			`
		]);

		let filtered = incidents as any[];
		if (typeFilter !== 'All') filtered = filtered.filter(i => i.incident_type === typeFilter);
		if (severityFilter !== 'All') filtered = filtered.filter(i => i.severity === severityFilter);
		if (statusFilter !== 'All') filtered = filtered.filter(i => i.status === statusFilter);

		const totalLoss = incidents.reduce((acc: number, cur: any) => acc + parseFloat(cur.financial_loss || '0'), 0);
		const totalLtiDays = incidents.reduce((acc: number, cur: any) => acc + parseInt(cur.lost_work_days || '0', 10), 0);

		const summary = {
			total: incidents.length,
			accidents: incidents.filter((i: any) => i.incident_type === 'Accident').length,
			violations: incidents.filter((i: any) => i.incident_type === 'Pelanggaran Prosedur').length,
			openCar: incidents.filter((i: any) => i.status === 'CAR_ISSUED' || i.status === 'OPEN').length,
			closed: incidents.filter((i: any) => i.status === 'CLOSED').length,
			totalLoss,
			totalLtiDays
		};

		return {
			incidents: filtered,
			summary,
			units: units as any[],
			drivers: drivers as any[],
			assignments: assignments as any[],
			filters: { type: typeFilter, severity: severityFilter, status: statusFilter }
		};
	} catch (error) {
		console.error("Error loading QHSE incidents:", error);
		return {
			incidents: [],
			summary: { total: 0, accidents: 0, violations: 0, openCar: 0, closed: 0, totalLoss: 0, totalLtiDays: 0 },
			units: [],
			drivers: [],
			assignments: [],
			filters: { type: 'All', severity: 'All', status: 'All' }
		};
	}
};

export const actions: Actions = {
	createIncident: async ({ request }) => {
		const data = await request.formData();
		const incidentType = data.get('incident_type') as string;
		const severity = data.get('severity') as string;
		const location = data.get('location') as string;
		const description = data.get('description') as string;
		const incidentDate = data.get('incident_date') as string || new Date().toISOString();
		
		const rawUnit = data.get('unit_id') as string;
		const rawDriver = data.get('driver_id') as string;
		const unitId = rawUnit && rawUnit !== 'null' ? parseInt(rawUnit, 10) : null;
		const driverId = rawDriver && rawDriver !== 'null' ? parseInt(rawDriver, 10) : null;

		const financialLoss = parseFloat(data.get('financial_loss') as string || '0');
		const lostWorkDays = parseInt(data.get('lost_work_days') as string || '0', 10);
		const consequence = data.get('consequence') as string || null;

		if (!incidentType || !severity || !location || !description) {
			return fail(400, { message: 'Harap lengkapi semua field wajib laporan insiden!' });
		}

		try {
			const countRes = await sql`SELECT count(*) FROM qhse.incidents`;
			const seq = (parseInt(countRes[0].count, 10) + 1).toString().padStart(4, '0');
			const incNumber = `INC-${new Date().getFullYear()}-${seq}`;

			await sql`
				INSERT INTO qhse.incidents (
					incident_number, incident_date, incident_type, severity,
					unit_id, driver_id, location, description, status,
					financial_loss, lost_work_days, consequence
				) VALUES (
					${incNumber}, ${new Date(incidentDate)}, ${incidentType}, ${severity},
					${unitId}, ${driverId}, ${location}, ${description}, 'OPEN',
					${financialLoss}, ${lostWorkDays}, ${consequence}
				)
			`;

			return { success: true, message: `Laporan Insiden ${incNumber} berhasil dibuat.` };
		} catch (e: any) {
			console.error("Create incident error:", e);
			return fail(500, { error: e.message || 'Gagal membuat laporan insiden.' });
		}
	},

	updateCar: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const rootCause = data.get('root_cause_analysis') as string;
		const correctiveAction = data.get('corrective_action') as string;
		const preventiveAction = data.get('preventive_action') as string;
		const picFollowup = data.get('pic_followup') as string;
		const dueDate = data.get('due_date') as string;
		const carNumber = data.get('car_number') as string || `CAR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

		// 4M + 1E Factors
		const isHuman = data.get('is_human_factor') === 'on';
		const isEquipment = data.get('is_equipment_factor') === 'on';
		const isMethod = data.get('is_method_factor') === 'on';
		const isEnvironment = data.get('is_environment_factor') === 'on';

		// 5-Why Analysis
		const analysisData = {
			why1: data.get('why1') as string || '',
			why2: data.get('why2') as string || '',
			why3: data.get('why3') as string || '',
			why4: data.get('why4') as string || '',
			why5: data.get('why5') as string || ''
		};

		if (!id || !rootCause || !correctiveAction || !picFollowup) {
			return fail(400, { message: 'Harap lengkapi analisis akar masalah, tindakan korektif, dan PIC!' });
		}

		try {
			await sql`
				UPDATE qhse.incidents
				SET root_cause_analysis = ${rootCause},
					car_number = ${carNumber},
					corrective_action = ${correctiveAction},
					preventive_action = ${preventiveAction || null},
					pic_followup = ${picFollowup},
					due_date = ${dueDate ? new Date(dueDate) : null},
					status = 'CAR_ISSUED',
					is_human_factor = ${isHuman},
					is_equipment_factor = ${isEquipment},
					is_method_factor = ${isMethod},
					is_environment_factor = ${isEnvironment},
					analysis_data = ${JSON.stringify(analysisData)}::jsonb
				WHERE id = ${id}
			`;

			return { success: true, message: `Analisis Akar Masalah & ${carNumber} berhasil diterbitkan.` };
		} catch (e: any) {
			console.error("Update CAR error:", e);
			return fail(500, { error: e.message || 'Gagal menerbitkan CAR.' });
		}
	},

	closeIncident: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;

		if (!id) return fail(400, { message: 'ID Insiden tidak ditemukan.' });

		try {
			await sql`
				UPDATE qhse.incidents
				SET status = 'CLOSED'
				WHERE id = ${id}
			`;

			return { success: true, message: 'Insiden & CAR resmi ditutup (Closed).' };
		} catch (e: any) {
			console.error("Close incident error:", e);
			return fail(500, { error: e.message || 'Gagal menutup status insiden.' });
		}
	}
};
