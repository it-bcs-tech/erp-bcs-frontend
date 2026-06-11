import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';
import { error } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ params, cookies }) => {
	const authToken = cookies.get('auth_token');
	const empId = params.id;

	try {
		// Attempt to fetch from API
		const response = await apiFetch<any>(
			`/api/v1/hris/employees/${empId}`,
			{},
			authToken
		);
		return { employee: response.data, dataSource: 'api' as const };
	} catch (err) {
		console.warn(`⚠️ [Employees API] Failed to fetch for ${empId}. Attempting Postgres Fallback.`);
		
		// Fallback to Svelte Native DB query using id (Strip "EMP-")
		try {
			const numericId = empId.replace('EMP-', '');
			const employeeQuery = await sql`
				SELECT 
					k.id, k.payroll_id, k.nama_karyawan, k.jenis_kelamin, k.email, k.telp1, k.telp2,
					k.tempat_lahir, k.tgl_lahir, k.agama, k.marital_status, k.pendidikan_terakhir,
					k.alamat_ktp, k.kota_ktp, k.no_ktp, k.no_npwp,
					k.tgl_masuk, k.tgl_finish_contract, k.status,
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

			const fallbackEmployee = {
				id: e.payroll_id,
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

			return { employee: fallbackEmployee, dataSource: 'db' as const };
		} catch (dbErr) {
			console.error(`Database fallback failed for ${empId}:`, dbErr);
			throw error(404, 'Employee not found');
		}
	}
};
