import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';
import { logError } from '$lib/utils/logger';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const authToken = cookies.get('auth_token');
	
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const perPage = 10;
	const searchQuery = (url.searchParams.get('search') || '').trim();
	const directorateFilter = url.searchParams.get('directorate') || url.searchParams.get('department') || 'All';

	// 1. Ambil daftar divisi riil dari master.m_division yang memiliki karyawan aktif
	let directorates: any[] = [];
	try {
		const divRows = await sql`
			SELECT DISTINCT md.div_code, md.div_name
			FROM master.m_karyawan k
			JOIN master.m_division md ON md.div_code = k.div_id
			WHERE k.aktif = 'Y'
			ORDER BY md.div_name ASC
		`;
		directorates = divRows.map((d: any) => ({
			dir_code: d.div_code,
			dir_name: d.div_name
		}));
	} catch {
		directorates = [
			{ dir_code: 'DV_41', dir_name: 'OPERATION' },
			{ dir_code: 'DV_36', dir_name: 'FINANCE' },
			{ dir_code: 'DV_37', dir_name: 'HUMAN CAPITAL & DEVELOPMENT' },
			{ dir_code: 'DV_35', dir_name: 'COMMERCIAL AND OPERATIONS' }
		];
	}

	// 2. Coba ambil data dari API Laravel terlebih dahulu
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

		if (response && response.status === 'success' && response.data) {
			const rawList = Array.isArray(response.data) ? response.data : (response.data?.employees || []);
			if (rawList.length > 0) {
				const total = response.meta?.total || rawList.length;
				// Jika Laravel belum memotong halaman secara server-side, potong secara presisi di sini
				const paginatedEmployees = response.meta ? rawList : rawList.slice((page - 1) * perPage, page * perPage);

				return {
					employees: paginatedEmployees,
					directorates: response.data?.directorates || directorates,
					activeDirectorate: directorateFilter,
					meta: response.meta || {
						current_page: page,
						total: total,
						per_page: perPage
					},
					dataSource: 'laravel'
				};
			}
		}
	} catch (err: any) {
		logError('HRIS_EMPLOYEES_API_ERROR', 'Laravel API unreachable/error, falling back to PostgreSQL', err?.message);
	}

	// 3. Fallback PostgreSQL Langsung (Direct Database 100% Riil & Cepat)
	try {
		const countResult = await sql`
			SELECT COUNT(*)::int as total
			FROM master.m_karyawan k
			LEFT JOIN master.m_title t ON t.title_code = k.title
			LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
			LEFT JOIN master.m_division md ON md.div_code = k.div_id
			WHERE k.aktif = 'Y'
				AND (${searchQuery} = '' OR k.nama_karyawan ILIKE ${'%' + searchQuery + '%'} OR k.payroll_id ILIKE ${'%' + searchQuery + '%'} OR t.title ILIKE ${'%' + searchQuery + '%'})
				AND (${directorateFilter} = 'All' OR k.div_id = ${directorateFilter} OR md.div_name ILIKE ${directorateFilter})
		`;
		const total = countResult[0]?.total || 0;

		const rows = await sql`
			SELECT 
				k.id,
				k.payroll_id,
				k.nama_karyawan as name,
				COALESCE(t.title, k.title, 'Staff') as role,
				COALESCE(d.dept_name, 'General') as department,
				COALESCE(md.div_name, 'Operations') as directorate,
				COALESCE(NULLIF(TRIM(k.email), ''), LOWER(REPLACE(k.nama_karyawan, ' ', '.')) || '@bcslabs.tech') as email,
				COALESCE(NULLIF(TRIM(k.telp1), ''), NULLIF(TRIM(k.telp2), ''), '-') as phone,
				CASE WHEN k.aktif = 'Y' THEN 'Active' ELSE 'Inactive' END as status,
				k.foto as avatar
			FROM master.m_karyawan k
			LEFT JOIN master.m_title t ON t.title_code = k.title
			LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
			LEFT JOIN master.m_division md ON md.div_code = k.div_id
			WHERE k.aktif = 'Y'
				AND (${searchQuery} = '' OR k.nama_karyawan ILIKE ${'%' + searchQuery + '%'} OR k.payroll_id ILIKE ${'%' + searchQuery + '%'} OR t.title ILIKE ${'%' + searchQuery + '%'})
				AND (${directorateFilter} = 'All' OR k.div_id = ${directorateFilter} OR md.div_name ILIKE ${directorateFilter})
			ORDER BY k.nama_karyawan ASC
			LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
		`;

		const employees = rows.map((r: any) => ({
			id: `EMP-${String(r.id).padStart(3, '0')}`,
			payroll_id: r.payroll_id,
			name: r.name,
			role: r.role,
			department: r.department,
			directorate: r.directorate,
			email: r.email,
			phone: r.phone,
			status: r.status,
			avatar: r.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name || 'User')}&background=0D8ABC&color=fff`
		}));

		return {
			employees,
			directorates,
			activeDirectorate: directorateFilter,
			meta: {
				current_page: page,
				total: total,
				per_page: perPage
			},
			dataSource: 'postgresql'
		};
	} catch (dbErr: any) {
		logError('HRIS_EMPLOYEES_DB_ERROR', 'Failed to fetch employees from PostgreSQL database', dbErr?.message);
		return {
			employees: [],
			directorates,
			activeDirectorate: directorateFilter,
			meta: {
				current_page: page,
				total: 0,
				per_page: perPage
			},
			dataSource: 'error'
		};
	}
};
