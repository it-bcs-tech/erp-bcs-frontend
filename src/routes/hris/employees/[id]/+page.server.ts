import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';
import { error } from '@sveltejs/kit';
import { calculateExpiryGate } from '$lib/server/dms';
import { logError } from '$lib/utils/logger';

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

		// Ambil dokumen legalitas & lisensi DMS (SIM, SIO, KTP, MCU, Kontrak) jika ada
		let dmsDocs: any[] = [];
		if (employee.documents && Array.isArray(employee.documents)) {
			dmsDocs = employee.documents.map((doc: any) => {
				const gate = calculateExpiryGate(doc.expiry_date);
				return {
					...doc,
					gate_status: gate.status,
					gate_color: gate.color,
					days_left: gate.daysLeft
				};
			});
		}

		return {
			employee,
			dmsDocs,
			dataSource: 'laravel'
		};
	} catch (err: any) {
		logError('HRIS_EMPLOYEE_DETAIL_API_ERROR', `Failed to load employee ${empId} from Laravel API`, err?.message);
		throw error(err.status || 500, err.body?.message || 'Gagal memuat detail karyawan dari server Laravel');
	}
};
