import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';
import { error } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ params, cookies }) => {
	const authToken = cookies.get('auth_token');
	const empId = params.id;
	const numericId = empId.replace('EMP-', '');

	let baseEmployee: any = null;
	let dataSource = 'api';

	try {
		// Attempt to fetch base employee from API
		const response = await apiFetch<any>(
			`/api/v1/hris/employees/${empId}`,
			{},
			authToken
		);
		baseEmployee = response.data;
		baseEmployee.rawId = empId;
	} catch (err) {
		console.warn(`⚠️ [Employees API] Failed to fetch for ${empId}. Attempting Postgres Fallback.`);
		dataSource = 'db';
		
		try {
			const employeeQuery = await sql`
				SELECT 
					k.id, k.payroll_id, k.nama_karyawan, k.jenis_kelamin, k.email, k.telp1, k.telp2,
					k.tempat_lahir, k.tgl_lahir, k.agama, k.marital_status, k.pendidikan_terakhir,
					k.alamat_ktp, k.kota_ktp, k.no_ktp, k.no_npwp,
					k.tgl_masuk, k.tgl_finish_contract, k.status, k.title,
					d.dept_name, t.title as role, l.loc_name as location,
					k.foto, k.aktif
				FROM master.m_karyawan k
				LEFT JOIN master.m_dept d ON k.dept_id = d.dept_code
				LEFT JOIN master.m_title t ON k.title = t.title_code
				LEFT JOIN master.m_lokasi l ON k.lokasi = l.loc_code
				WHERE k.id = ${numericId}
				LIMIT 1
			`;

			if (employeeQuery.length === 0) {
				throw error(404, 'Employee not found');
			}

			const e = employeeQuery[0];

			baseEmployee = {
				rawId: empId,
				id: e.payroll_id,
				dbId: e.id,
				titleCode: e.title,
				name: e.nama_karyawan,
				email: e.email || '',
				phone: e.telp1 || e.telp2 || '',
				role: e.role || 'Unknown Role',
				department: e.dept_name || 'Unknown Dept',
				location: e.location || 'HQ',
				businessUnit: 'BCS Group',
				joinDate: e.tgl_masuk ? new Date(e.tgl_masuk).toISOString().split('T')[0] : 'N/A',
				status: e.aktif === 'Y' ? 'Active' : 'Inactive',
				type: e.status || 'Contract',
				avatar: e.foto ? `/storage/${e.foto}` : null,
				
				// Personal Info
				gender: e.jenis_kelamin,
				birthPlace: e.tempat_lahir,
				birthDate: e.tgl_lahir ? new Date(e.tgl_lahir).toISOString().split('T')[0] : '',
				religion: e.agama,
				maritalStatus: e.marital_status,
				education: e.pendidikan_terakhir,
				address: e.alamat_ktp,
				city: e.kota_ktp,
				nik: e.no_ktp,
				npwp: e.no_npwp
			};
		} catch (dbErr) {
			console.error(`Database fallback failed for ${empId}:`, dbErr);
			throw error(404, 'Employee not found');
		}
	}

	// ==========================================
	// INJECT LIVE DATA FROM POSTGRESQL
	// ==========================================
	try {
		// If API succeeded, we might not have `id` (numeric dbId) or `titleCode` in baseEmployee.
		// Let's explicitly fetch them if missing.
		let targetNumericId = baseEmployee.dbId;
		let titleCode = baseEmployee.titleCode;
		let payrollId = baseEmployee.id || baseEmployee.payroll_id;

		if (!targetNumericId || !titleCode) {
			const numId = empId.replace('EMP-', '');
			const fetchMissing = await sql`SELECT id, payroll_id, title FROM master.m_karyawan WHERE id = ${numId} LIMIT 1`;
			if (fetchMissing.length > 0) {
				targetNumericId = fetchMissing[0].id;
				titleCode = fetchMissing[0].title;
				payrollId = fetchMissing[0].payroll_id;
			}
		}

		// 1. Performance KPI (Average Score)
		const kpiQuery = await sql`SELECT AVG(score) as avg_score FROM hris.performance_kpi WHERE payroll_id = ${payrollId}`;
		const avgScore = kpiQuery[0]?.avg_score ? parseFloat(kpiQuery[0].avg_score).toFixed(1) : '0.0';
		baseEmployee.performance = avgScore;

		// 2. Leave Balances (from m_presensi)
		const leaveQuery = await sql`
			SELECT (quota - used) as balance 
			FROM presensi.leave_balances 
			WHERE year = 2026 
			AND user_id = (SELECT id FROM master.m_presensi WHERE karyawan_id = ${targetNumericId} LIMIT 1)
			LIMIT 1
		`;
		baseEmployee.leaveBalance = leaveQuery.length > 0 ? leaveQuery[0].balance : 0;

		// 3. Manager from m_atasan
		let managerName = 'No Manager Assigned';
		if (titleCode) {
			const managerQuery = await sql`
				SELECT m_karyawan.nama_karyawan
				FROM master.m_atasan
				JOIN master.m_karyawan ON master.m_atasan.title_atasan = master.m_karyawan.title
				WHERE master.m_atasan.title_bawahan = ${titleCode}
				AND master.m_karyawan.aktif = 'Y'
				LIMIT 1
			`;
			if (managerQuery.length > 0) {
				managerName = managerQuery[0].nama_karyawan;
			}
		}
		baseEmployee.manager = managerName;

		// 4. Competencies (Training Programs)
		const trainingQuery = await sql`
			SELECT DISTINCT p.category 
			FROM hris.training_programs p
			JOIN hris.training_participants tp ON p.id = tp.program_id
			WHERE tp.payroll_id = ${payrollId} AND p.category IS NOT NULL
		`;
		baseEmployee.skills = trainingQuery.length > 0 ? trainingQuery.map(t => t.category) : [];

		// 5. Employee Lifecycle Timeline
		const timelineQuery = await sql`
			SELECT action_type, action_description, start_date 
			FROM hris.employee_lifecycle 
			WHERE payroll_id = ${payrollId} 
			ORDER BY start_date DESC NULLS LAST 
			LIMIT 5
		`;
		baseEmployee.timeline = timelineQuery.map(t => ({
			type: t.action_type || 'Update',
			desc: t.action_description || 'Record updated.',
			date: t.start_date ? new Date(t.start_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'
		}));

	} catch (injectErr) {
		console.error('Failed to inject live auxiliary data:', injectErr);
		// Provide safe defaults if injection crashes
		baseEmployee.performance = '0.0';
		baseEmployee.leaveBalance = 0;
		baseEmployee.manager = 'Unknown';
		baseEmployee.skills = [];
		baseEmployee.timeline = [];
	}

	return { employee: baseEmployee, dataSource };
};
