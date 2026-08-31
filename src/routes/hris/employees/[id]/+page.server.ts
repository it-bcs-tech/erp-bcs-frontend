import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';
import { error } from '@sveltejs/kit';
import sql from '$lib/server/db';
import { calculateExpiryGate } from '$lib/server/dms';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const authToken = cookies.get('auth_token');
	const empId = params.id;

	try {
		let employee: any = null;
		try {
			const response = await apiFetch<any>(
				`/api/v1/hris/employees/${empId}`,
				{},
				authToken
			);
			employee = response.data;
		} catch (apiErr) {
			// Fallback direct DB query if API is offline
			const [empRow] = await sql`
				SELECT 
					k.id,
					k.nama_karyawan as name,
					k.payroll_id as "payrollId",
					k.email,
					k.handphone as phone,
					d.dept_name as department,
					t.title as position,
					k.status_karyawan as "employmentStatus"
				FROM master.m_karyawan k
				LEFT JOIN master.m_department d ON d.dept_id = k.dept_id
				LEFT JOIN master.m_title t ON t.title_code = k.title
				WHERE k.id::text = ${empId} OR k.payroll_id = ${empId}
			`;
			if (empRow) {
				employee = empRow;
			} else {
				throw error(404, 'Employee not found');
			}
		}

		if (!employee) throw error(404, 'Employee not found');

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

		// Ambil dokumen legalitas & lisensi DMS (SIM, SIO, KTP, MCU, Kontrak)
		let dmsDocs: any[] = [];
		try {
			const rows = await sql`
				SELECT 
					d.id,
					d.title,
					d.doc_number,
					to_char(d.issue_date, 'YYYY-MM-DD') as issue_date,
					to_char(d.expiry_date, 'YYYY-MM-DD') as expiry_date,
					d.status,
					d.file_path,
					dt.name as type_name,
					dt.code as type_code
				FROM dms.documents d
				LEFT JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
				LEFT JOIN master.m_drivers drv ON drv.id = d.employee_id
				WHERE (d.employee_id::text = ${empId} OR drv.karyawan_id::text = ${empId} OR d.employee_id IN (SELECT id FROM master.m_drivers WHERE karyawan_id::text = ${empId}))
				ORDER BY d.created_at DESC
			`;

			dmsDocs = rows.map((r: any) => {
				const { daysRemaining, gateLevel, computedStatus } = calculateExpiryGate(r.expiry_date, r.status);
				return {
					...r,
					computedStatus,
					daysRemaining,
					gateLevel
				};
			});
		} catch (dmsErr) {
			console.warn('[HRIS Employee] Error fetching DMS documents:', dmsErr);
		}

		return {
			employee,
			dmsDocs,
			dataSource: 'api'
		};
	} catch (err: any) {
		console.error(`⚠️ [Employees API] Failed to fetch for ${empId}:`, err);
		throw error(404, 'Employee not found');
	}
};
