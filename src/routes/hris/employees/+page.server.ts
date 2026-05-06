import type { PageServerLoad } from './$types';
import type { Employee } from '$lib/types/hris';
import { apiFetch } from '$lib/utils/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const authToken = cookies.get('auth_token');

	try {
		const response = await apiFetch<Employee[]>(
			'/api/v1/hris/employees',
			{},
			authToken
		);
		return { employees: response.data };
	} catch (error) {
		console.error('Failed to fetch employees:', error);
		return { employees: [] };
	}
};
