import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';
import { error } from '@sveltejs/kit';

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
	} catch (err) {
		console.error(`⚠️ [Employees API] Failed to fetch for ${empId}:`, err);
		throw error(404, 'Employee not found');
	}
};
