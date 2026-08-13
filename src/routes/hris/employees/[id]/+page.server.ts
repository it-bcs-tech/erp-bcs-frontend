import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';
import { error } from '@sveltejs/kit';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const authToken = cookies.get('auth_token');
	const empId = params.id;

	// PRIORITAS 1: coba Laravel API terlebih dahulu
	try {
		const response = await apiFetch<any>(
			`/api/v1/hris/employees/${empId}`,
			{},
			authToken
		);
		
		const employee = response.data;
		
		// Fallback for UI if arrays/objects are null
		employee.skills = employee.skills || [];
		employee.timeline = employee.timeline || [];
		
		// Map timeline dates
		if (employee.timeline.length > 0) {
			employee.timeline = employee.timeline.map((t: any) => ({
				...t,
				date: t.date ? new Date(t.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'
			}));
		}

		return { employee, dataSource: 'api' };
	} catch (err: any) {
		console.warn(`⚠️ [Employees API] Backend API failed for ${empId}, falling back to DB:`, err?.message);
	}

	// PRIORITAS 2: Fallback langsung ke PostgreSQL
	try {
		const numericId = empId.replace('EMP-', '');

		const [emp] = await sql`
			SELECT 
				k.id, k.payroll_id, k.nama_karyawan, k.title, k.dept_id, k.aktif, 
				k.email, k.telp1, k.telp2, k.tgl_masuk, k.tgl_lahir, k.alamat_ktp,
				k.no_sim_a, k.no_sim_a_expiredate,
				k.no_sim_b1, k.no_sim_b1_expiredate,
				k.no_sim_b2_umum, k.no_sim_b2_umum_expiredate,
				k.foto,
				t.title as title_name,
				d.dept_name
			FROM master.m_karyawan k
			LEFT JOIN master.m_title t ON t.title_code = k.title
			LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
			WHERE k.id = ${numericId}
			LIMIT 1
		`;

		if (!emp) {
			throw error(404, 'Employee not found');
		}

		// Resolve SIM license
		let licenseType = '-';
		let licenseExpiry = null;
		if (emp.no_sim_b2_umum) {
			licenseType = 'SIM B2 Umum';
			licenseExpiry = emp.no_sim_b2_umum_expiredate;
		} else if (emp.no_sim_b1) {
			licenseType = 'SIM B1';
			licenseExpiry = emp.no_sim_b1_expiredate;
		} else if (emp.no_sim_a) {
			licenseType = 'SIM A';
			licenseExpiry = emp.no_sim_a_expiredate;
		}

		const employee = {
			id:             `EMP-${String(emp.id).padStart(3, '0')}`,
			dbId:           emp.id,
			titleCode:      emp.title,
			name:           emp.nama_karyawan || 'Unknown',
			role:           emp.title_name || emp.title || 'Staff',
			department: {
				id:   emp.dept_id || '',
				name: emp.dept_name || 'General'
			},
			email:          emp.email || `${(emp.nama_karyawan || 'user').toLowerCase().replace(/\s+/g, '.')}@bcslabs.tech`,
			phone:          emp.telp1 || emp.telp2 || '-',
			status:         emp.aktif === 'Y' ? 'Active' : 'Inactive',
			join_date:      emp.tgl_masuk ? new Date(emp.tgl_masuk).toISOString().split('T')[0] : '2020-01-15',
			joinDate:       emp.tgl_masuk ? new Date(emp.tgl_masuk).toISOString().split('T')[0] : '2020-01-15',
			birth_date:     emp.tgl_lahir ? new Date(emp.tgl_lahir).toISOString().split('T')[0] : null,
			birthDate:      emp.tgl_lahir ? new Date(emp.tgl_lahir).toISOString().split('T')[0] : null,
			address:        emp.alamat_ktp || '-',
			avatar:         emp.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.nama_karyawan || 'User')}`,
			licenseType,
			licenseExpiry,
			leave_used:     0,
			leave_balance:  12,
			leave_remaining: 12,
			manager:        null,
			subordinates:   [],
			skills:         [],
			timeline:       [],
		};

		return { employee, dataSource: 'db' };
	} catch (err: any) {
		console.error(`❌ [Employees DB] Failed to fetch for ${empId}:`, err?.message);
		throw error(500, 'Failed to load employee data');
	}
};

