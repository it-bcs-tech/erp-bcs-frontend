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
		return { employee: response.data };
	} catch (err) {
		console.error(`Failed to fetch employee details for ${empId}:`, err);
		throw error(404, 'Employee not found');
	}
};
