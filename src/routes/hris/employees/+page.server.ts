import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';
import { logError } from '$lib/utils/logger';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const authToken = cookies.get('auth_token');
	
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const perPage = 10;
	const searchQuery = (url.searchParams.get('search') || '').trim();
	const directorateFilter = url.searchParams.get('directorate') || url.searchParams.get('department') || 'All';

	const defaultDirectorates = [
		{ dir_code: 'DIR_OPS', dir_name: 'Operations' },
		{ dir_code: 'DIR_FIN', dir_name: 'Finance & Treasury' },
		{ dir_code: 'DIR_HC', dir_name: 'Human Capital' },
		{ dir_code: 'DIR_COMM', dir_name: 'Commercial & BD' }
	];

	try {
		const apiParams = new URLSearchParams();
		apiParams.set('page', page.toString());
		apiParams.set('per_page', perPage.toString());
		if (searchQuery) apiParams.set('search', searchQuery);
		if (directorateFilter && directorateFilter !== 'All') apiParams.set('directorate', directorateFilter);

		const response = await apiFetch<any>(
			`/api/v1/hris/employees?${apiParams.toString()}`,
			{},
			authToken
		);

		let employees = Array.isArray(response.data) ? response.data : (response.data?.employees || []);
		const directorates = response.data?.directorates || defaultDirectorates;

		return {
			employees,
			directorates,
			activeDirectorate: directorateFilter,
			meta: response.meta || {
				current_page: page,
				total: employees.length,
				per_page: perPage
			},
			dataSource: 'laravel'
		};
	} catch (err: any) {
		logError('HRIS_EMPLOYEES_API_ERROR', 'Failed to fetch employees from Laravel API', err?.message);
		return {
			employees: [],
			directorates: defaultDirectorates,
			activeDirectorate: directorateFilter,
			meta: {
				current_page: page,
				total: 0,
				per_page: perPage
			},
			dataSource: 'laravel'
		};
	}
};
