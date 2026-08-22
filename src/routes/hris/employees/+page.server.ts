import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { apiFetch } from '$lib/utils/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const authToken = cookies.get('auth_token');
	
	// Read parameters from URL
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const perPage = 10;
	const offset = (page - 1) * perPage;
	const searchQuery = (url.searchParams.get('search') || '').trim();
	const directorateFilter = url.searchParams.get('directorate') || url.searchParams.get('department') || 'All';

	try {
		// 1. Ambil Master Data Direktorat
		const directorates = await sql`
			SELECT dir_code, dir_name 
			FROM master.m_directorat 
			WHERE active = '1' OR active = 'Y' 
			ORDER BY dir_name ASC
		`;

		// 2. Filter Condition
		let filterCondition = sql`WHERE (k.aktif = 'Y' OR k.aktif = '1' OR k.aktif IS NULL)`;

		if (directorateFilter && directorateFilter !== 'All') {
			filterCondition = sql`${filterCondition} AND (k.dir_id = ${directorateFilter} OR dr.dir_code = ${directorateFilter} OR dr.dir_name ILIKE ${directorateFilter})`;
		}

		if (searchQuery) {
			const searchPattern = `%${searchQuery}%`;
			filterCondition = sql`${filterCondition} AND (k.nama_karyawan ILIKE ${searchPattern} OR k.payroll_id ILIKE ${searchPattern} OR t.title ILIKE ${searchPattern} OR d.dept_name ILIKE ${searchPattern})`;
		}

		// 3. Hitung Total Data
		const countResult = await sql`
			SELECT COUNT(*)::int as total
			FROM master.m_karyawan k
			LEFT JOIN master.m_title t ON t.title_code = k.title
			LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
			LEFT JOIN master.m_division dv ON dv.div_code = k.div_id
			LEFT JOIN master.m_directorat dr ON dr.dir_code = k.dir_id
			${filterCondition}
		`;

		const totalCount = countResult[0]?.total || 0;

		// 4. Query Karyawan Paged
		const rows = await sql`
			SELECT 
				k.id,
				k.payroll_id,
				k.nama_karyawan,
				k.title as title_code,
				COALESCE(t.title, k.title, 'Staff') as title_name,
				k.dept_id,
				d.dept_name,
				k.div_id,
				dv.div_name,
				k.dir_id,
				dr.dir_name,
				k.foto,
				k.email,
				k.telp1,
				k.aktif
			FROM master.m_karyawan k
			LEFT JOIN master.m_title t ON t.title_code = k.title
			LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
			LEFT JOIN master.m_division dv ON dv.div_code = k.div_id
			LEFT JOIN master.m_directorat dr ON dr.dir_code = k.dir_id
			${filterCondition}
			ORDER BY k.nama_karyawan ASC
			LIMIT ${perPage} OFFSET ${offset}
		`;

		const employees = rows.map((k: any) => ({
			id: k.id,
			payroll_id: k.payroll_id || `EMP-${k.id}`,
			name: k.nama_karyawan,
			role: k.title_name,
			department: k.dept_name || k.div_name || k.dir_name || 'General Operations',
			directorate: k.dir_name || 'Operations',
			dir_code: k.dir_id,
			status: (k.aktif === 'N' || k.aktif === '0') ? 'On Leave' : 'Active',
			email: k.email || `${(k.payroll_id || `emp${k.id}`).toLowerCase()}@bcs-logistics.co.id`,
			avatar: k.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(k.nama_karyawan)}&background=random`,
			phone: k.telp1 || '-'
		}));

		return {
			employees,
			directorates: directorates.map((d: any) => ({ dir_code: d.dir_code, dir_name: d.dir_name })),
			activeDirectorate: directorateFilter,
			meta: {
				current_page: page,
				total: totalCount,
				per_page: perPage
			}
		};
	} catch (error) {
		console.warn('⚠️ [Employees] Direct SQL query fallback to API/mock:', error);

		// Fallback via API Fetch
		try {
			const apiParams = new URLSearchParams();
			apiParams.set('page', page.toString());
			apiParams.set('per_page', perPage.toString());
			if (searchQuery) apiParams.set('search', searchQuery);

			const response = await apiFetch<any[]>(
				`/api/v1/hris/employees?${apiParams.toString()}`,
				{},
				authToken
			);

			const defaultDirectorates = [
				{ dir_code: 'DIR_OPS', dir_name: 'Operations' },
				{ dir_code: 'DIR_FIN', dir_name: 'Finance & Treasury' },
				{ dir_code: 'DIR_HC', dir_name: 'Human Capital' },
				{ dir_code: 'DIR_COMM', dir_name: 'Commercial & BD' }
			];

			return {
				employees: response.data || [],
				directorates: defaultDirectorates,
				activeDirectorate: directorateFilter,
				meta: response.meta || { current_page: page, total: 0, per_page: perPage }
			};
		} catch (apiErr) {
			console.error('Failed to fetch employees via API:', apiErr);
			return {
				employees: [],
				directorates: [
					{ dir_code: 'DIR_OPS', dir_name: 'Operations' },
					{ dir_code: 'DIR_FIN', dir_name: 'Finance & Treasury' },
					{ dir_code: 'DIR_HC', dir_name: 'Human Capital' },
					{ dir_code: 'DIR_COMM', dir_name: 'Commercial & BD' }
				],
				activeDirectorate: directorateFilter,
				meta: { current_page: page, total: 0, per_page: perPage }
			};
		}
	}
};
