import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';
import { error } from '@sveltejs/kit';
import { calculateExpiryGate } from '$lib/server/dms';
import { logError } from '$lib/utils/logger';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const authToken = cookies.get('auth_token');
	const empId = params.id;

	try {
		const response = await apiFetch<any>(
			`/api/v1/hris/employees/${empId}`,
			{},
			authToken
		);

		const employee = response.data;
		if (!employee) {
			throw error(404, 'Employee not found');
		}

		employee.skills = employee.skills || [];
		employee.timeline = employee.timeline || [];

		// Map timeline dates
		if (employee.timeline.length > 0) {
			employee.timeline = employee.timeline.map((t: any) => ({
				...t,
				date: t.date ? new Date(t.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'
			}));
		}

		// Ambil dokumen legalitas & lisensi DMS (SIM, SIO, KTP, B3, MCU, Kontrak) dari PostgreSQL dms.documents
		let dmsDocs: any[] = [];
		try {
			const empNumericId = Number(employee.id || empId);
			const isValidNum = !isNaN(empNumericId) && empNumericId > 0;
			const payrollId = String(employee.payroll_id || employee.nik || '').trim();

			const orConditions = [];
			if (payrollId) {
				orConditions.push(sql`(d.metadata->>'payroll_id' = ${payrollId} OR d.metadata->>'driver_payroll' = ${payrollId})`);
			}
			if (isValidNum) {
				orConditions.push(sql`(d.employee_id = ${empNumericId} OR d.employee_id IN (SELECT id FROM master.m_drivers WHERE karyawan_id = ${empNumericId}))`);
			}

			if (orConditions.length > 0) {
				const whereClause = orConditions.reduce((acc, curr) => sql`${acc} OR ${curr}`);
				const docs = await sql`
					SELECT 
						d.id,
						d.doc_number,
						d.title,
						to_char(d.expiry_date, 'YYYY-MM-DD') as expiry_date,
						dt.code as type_code,
						dt.name as type_name,
						d.status,
						(d.expiry_date::date - CURRENT_DATE)::int as days_remaining
					FROM dms.documents d
					JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
					WHERE ${whereClause}
					ORDER BY d.expiry_date ASC NULLS LAST
				`;

				dmsDocs = docs.map((doc: any) => {
					const gate = calculateExpiryGate(doc.expiry_date, doc.status);
					return {
						...doc,
						daysRemaining: gate.daysRemaining,
						gateLevel: gate.gateLevel,
						computedStatus: gate.computedStatus
					};
				});
			}
		} catch (dbErr: any) {
			console.warn('[HRIS Employee Detail] Direct DMS lookup failed:', dbErr?.message);
			if (employee.documents && Array.isArray(employee.documents)) {
				dmsDocs = employee.documents.map((doc: any) => {
					const gate = calculateExpiryGate(doc.expiry_date);
					return {
						...doc,
						daysRemaining: gate.daysRemaining,
						gateLevel: gate.gateLevel,
						computedStatus: gate.computedStatus
					};
				});
			}
		}

		return {
			employee,
			dmsDocs,
			dataSource: dmsDocs.length > 0 ? 'dms-postgres' : 'laravel'
		};
	} catch (err: any) {
		logError('HRIS_EMPLOYEE_DETAIL_API_ERROR', `Failed to load employee ${empId} from Laravel API`, err?.message);
		throw error(err.status || 500, err.body?.message || 'Gagal memuat detail karyawan dari server Laravel');
	}
};
