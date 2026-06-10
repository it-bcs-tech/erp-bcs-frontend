import type { PageServerLoad } from './$types';
import type { Employee } from '$lib/types/hris';
import { apiFetch } from '$lib/utils/api';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ cookies, url }) => {
	const authToken = cookies.get('auth_token');
	
	// Read parameters from URL, default to 1
	const page = Number(url.searchParams.get('page')) || 1;
	const perPage = 5;
	const searchQuery = url.searchParams.get('search') || '';
	const departmentFilter = url.searchParams.get('department') || '';

	try {
		// Pass parameters to backend API
		const apiParams = new URLSearchParams();
		apiParams.set('page', page.toString());
		apiParams.set('per_page', perPage.toString());
		if (searchQuery) apiParams.set('search', searchQuery);
		if (departmentFilter) apiParams.set('department', departmentFilter);

		const response = await apiFetch<Employee[]>(
			`/api/v1/hris/employees?${apiParams.toString()}`,
			{},
			authToken
		);
		
		let employees = response.data;
		let meta = response.meta;
		
		// Fallback manual pagination & filtering in case backend returns all data without meta
		if (!meta || typeof meta.total === 'undefined') {
			if (Array.isArray(employees)) {
				// Apply manual search
				if (searchQuery) {
					const q = searchQuery.toLowerCase();
					employees = employees.filter(e => 
						(e.name?.toLowerCase() || '').includes(q) || 
						(e.role?.toLowerCase() || '').includes(q) || 
						(e.id?.toLowerCase() || '').includes(q)
					);
				}
				
				// Apply manual filter
				if (departmentFilter && departmentFilter !== 'All') {
					employees = employees.filter(e => e.department === departmentFilter);
				}

				const total = employees.length;
				const startIndex = (page - 1) * perPage;
				employees = employees.slice(startIndex, startIndex + perPage);
				meta = {
					current_page: page,
					total: total,
					per_page: perPage
				};
			} else {
				employees = [];
				meta = { current_page: page, total: 0, per_page: perPage };
			}
		}

		return { employees, meta };
	} catch (error) {
		console.error('Failed to fetch employees:', error);
		return { 
			employees: [], 
			meta: { current_page: page, total: 0, per_page: perPage }
		};
	}
};
