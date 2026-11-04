import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { apiFetch } from '$lib/utils/api';
import { logError } from '$lib/utils/logger';
import sql from '$lib/server/db';
import { getEmployeeMasterLookups, updateEmployeeRecord, type UpdateEmployeeData } from '$lib/server/hris/employeeService';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const authToken = cookies.get('auth_token');
	
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const perPage = 10;
	const searchQuery = (url.searchParams.get('search') || '').trim();
	const directorateFilter = url.searchParams.get('directorate') || url.searchParams.get('department') || 'All';

	// 1. Ambil master data lookups (jabatan, divisi, departemen)
	const lookups = await getEmployeeMasterLookups();
	const directorates = lookups.divisions.length > 0 
		? lookups.divisions.map(d => ({ dir_code: d.code, dir_name: d.name }))
		: [
			{ dir_code: 'DV_41', dir_name: 'OPERATION' },
			{ dir_code: 'DV_36', dir_name: 'FINANCE' },
			{ dir_code: 'DV_37', dir_name: 'HUMAN CAPITAL & DEVELOPMENT' },
			{ dir_code: 'DV_35', dir_name: 'COMMERCIAL AND OPERATIONS' }
		];

	// 2. Coba ambil data dari API Laravel terlebih dahulu (jika ada)
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
				const paginatedEmployees = response.meta ? rawList : rawList.slice((page - 1) * perPage, page * perPage);

				return {
					employees: paginatedEmployees,
					directorates: response.data?.directorates || directorates,
					activeDirectorate: directorateFilter,
					titles: lookups.titles,
					divisions: lookups.divisions,
					departments: lookups.departments,
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
				k.foto as avatar,
				k.title as title_code,
				k.div_id,
				k.dept_id,
				k.status_karyawan,
				k.lokasi,
				k.aktif,
				k.no_ktp,
				k.no_npwp,
				k.tempat_lahir,
				k.tgl_lahir,
				k.jenis_kelamin,
				k.agama,
				k.marital_status,
				k.alamat_ktp,
				k.kota_ktp,
				k.pendidikan_terakhir,
				k.jurusan,
				k.tgl_masuk
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
			rawId: r.id,
			dbId: r.id,
			payroll_id: r.payroll_id,
			payrollId: r.payroll_id,
			name: r.name,
			nama_karyawan: r.name,
			role: r.role,
			title: r.title_code,
			job_title: r.role,
			department: r.department,
			dept_id: r.dept_id,
			directorate: r.directorate,
			div_id: r.div_id,
			email: r.email,
			phone: r.phone,
			telp1: r.phone,
			status: r.status,
			aktif: r.aktif,
			status_karyawan: r.status_karyawan || 'TETAP',
			lokasi: r.lokasi || 'Head Office Cilegon',
			location: r.lokasi || 'Head Office Cilegon',
			tgl_masuk: r.tgl_masuk,
			no_ktp: r.no_ktp,
			nik: r.no_ktp,
			no_npwp: r.no_npwp,
			npwp: r.no_npwp,
			tempat_lahir: r.tempat_lahir,
			birthPlace: r.tempat_lahir,
			tgl_lahir: r.tgl_lahir,
			jenis_kelamin: r.jenis_kelamin || 'L',
			gender: r.jenis_kelamin || 'L',
			agama: r.agama || 'ISLAM',
			religion: r.agama || 'ISLAM',
			marital_status: r.marital_status || 'TK-0',
			maritalStatus: r.marital_status || 'TK-0',
			alamat_ktp: r.alamat_ktp,
			address: r.alamat_ktp,
			kota_ktp: r.kota_ktp || 'Cilegon',
			city: r.kota_ktp || 'Cilegon',
			pendidikan_terakhir: r.pendidikan_terakhir || 'S1',
			education: r.pendidikan_terakhir || 'S1',
			jurusan: r.jurusan || '',
			major: r.jurusan || '',
			avatar: r.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name || 'User')}&background=0D8ABC&color=fff`
		}));

		return {
			employees,
			directorates,
			activeDirectorate: directorateFilter,
			titles: lookups.titles,
			divisions: lookups.divisions,
			departments: lookups.departments,
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
			titles: lookups.titles,
			divisions: lookups.divisions,
			departments: lookups.departments,
			meta: {
				current_page: page,
				total: 0,
				per_page: perPage
			},
			dataSource: 'error'
		};
	}
};

export const actions: Actions = {
	updateEmployee: async ({ request }) => {
		const formData = await request.formData();
		const rawId = Number(formData.get('id'));
		const nama_karyawan = formData.get('nama_karyawan')?.toString() || '';

		if (!rawId || !nama_karyawan) {
			return fail(400, { success: false, message: 'ID dan Nama Karyawan wajib diisi.' });
		}

		try {
			const updateData: UpdateEmployeeData = {
				id: rawId,
				nama_karyawan,
				email: formData.get('email')?.toString() || null,
				telp1: formData.get('telp1')?.toString() || null,
				title: formData.get('title')?.toString() || null,
				div_id: formData.get('div_id')?.toString() || null,
				dept_id: formData.get('dept_id')?.toString() || null,
				lokasi: formData.get('lokasi')?.toString() || null,
				status_karyawan: formData.get('status_karyawan')?.toString() || null,
				aktif: formData.get('aktif')?.toString() || 'Y',
				tgl_masuk: formData.get('tgl_masuk')?.toString() || null,
				no_ktp: formData.get('no_ktp')?.toString() || null,
				no_npwp: formData.get('no_npwp')?.toString() || null,
				tempat_lahir: formData.get('tempat_lahir')?.toString() || null,
				tgl_lahir: formData.get('tgl_lahir')?.toString() || null,
				jenis_kelamin: formData.get('jenis_kelamin')?.toString() || null,
				agama: formData.get('agama')?.toString() || null,
				marital_status: formData.get('marital_status')?.toString() || null,
				alamat_ktp: formData.get('alamat_ktp')?.toString() || null,
				kota_ktp: formData.get('kota_ktp')?.toString() || null,
				pendidikan_terakhir: formData.get('pendidikan_terakhir')?.toString() || null,
				jurusan: formData.get('jurusan')?.toString() || null
			};

			const result = await updateEmployeeRecord(updateData);
			return { success: true, message: result.message, employee: result.employee };
		} catch (e: any) {
			return fail(500, { success: false, message: `Gagal memperbarui data karyawan: ${e?.message || 'Kesalahan database'}` });
		}
	}
};
