import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	const dirFilter = url.searchParams.get('dir') || '';
	const divFilter = url.searchParams.get('div') || '';
	const deptFilter = url.searchParams.get('dept') || '';
	const searchQuery = url.searchParams.get('search') || '';

	try {
		// 1. Ambil Master Data Struktur (Direktorat, Divisi, Departemen)
		const directorates = await sql`
			SELECT dir_code, dir_name FROM master.m_directorat WHERE active = '1' OR active = 'Y' ORDER BY dir_name ASC
		`;

		const divisions = await sql`
			SELECT div_code, div_name, dir_code FROM master.m_division WHERE active = '1' OR active = 'Y' ORDER BY div_name ASC
		`;

		const departments = await sql`
			SELECT dept_code, dept_name, div_code FROM master.m_dept WHERE active = '1' OR active = 'Y' ORDER BY dept_name ASC
		`;

		const titles = await sql`
			SELECT title_code, title FROM master.m_title ORDER BY title ASC
		`;

		// 2. Ambil Semua Pemetaan Atasan-Bawahan
		const supervisorMappings = await sql`
			SELECT id, title_atasan, title_bawahan, approver, status 
			FROM master.m_atasan
		`;

		// Map title_bawahan -> list of title_atasan
		const atasanByBawahanMap = new Map<string, string[]>();
		supervisorMappings.forEach((m: any) => {
			if (m.title_bawahan && m.title_atasan) {
				const existing = atasanByBawahanMap.get(m.title_bawahan) || [];
				if (!existing.includes(m.title_atasan)) {
					existing.push(m.title_atasan);
				}
				atasanByBawahanMap.set(m.title_bawahan, existing);
			}
		});

		// 3. Ambil Karyawan Aktif
		let filterCondition = sql`WHERE k.aktif = 'Y'`;

		if (dirFilter) {
			filterCondition = sql`${filterCondition} AND k.dir_id = ${dirFilter}`;
		}
		if (divFilter) {
			filterCondition = sql`${filterCondition} AND k.div_id = ${divFilter}`;
		}
		if (deptFilter) {
			filterCondition = sql`${filterCondition} AND k.dept_id = ${deptFilter}`;
		}
		if (searchQuery) {
			const searchPattern = `%${searchQuery}%`;
			filterCondition = sql`${filterCondition} AND (k.nama_karyawan ILIKE ${searchPattern} OR k.payroll_id ILIKE ${searchPattern} OR t.title ILIKE ${searchPattern})`;
		}

		const employees = await sql`
			SELECT 
				k.id,
				k.payroll_id,
				k.nama_karyawan,
				k.title as title_code,
				COALESCE(t.title, k.title) as title_name,
				k.dept_id,
				d.dept_name,
				k.div_id,
				dv.div_name,
				k.dir_id,
				dr.dir_name,
				k.foto,
				k.email,
				k.telp1
			FROM master.m_karyawan k
			LEFT JOIN master.m_title t ON t.title_code = k.title
			LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
			LEFT JOIN master.m_division dv ON dv.div_code = k.div_id
			LEFT JOIN master.m_directorat dr ON dr.dir_code = k.dir_id
			${filterCondition}
			ORDER BY k.nama_karyawan ASC
			LIMIT 1500
		`;

		// Helper untuk menentukan tier level jabatan secara presisi
		function getTierLevel(titleName: string, titleCode: string): number {
			const upper = (titleName || '').toUpperCase();
			// Tier 1: Direktur Utama / President Director
			if (upper.includes('PRESIDENT DIRECTOR') || upper.includes('DIRUT') || titleCode === 'JB_363') return 1;
			
			// Tier 2: Direktur Bagian (BOD)
			if ((upper.includes('DIRECTOR') || upper.includes('DIREKTUR')) && !upper.includes('GENERAL MANAGER') && !upper.includes(' GM')) return 2;
			
			// Tier 3: General Manager (GM)
			if (upper.includes('GENERAL MANAGER') || upper.includes(' GM')) return 3;
			
			// Tier 4: Manager, Head of Dept, Chief
			if (upper.includes('MANAGER') || upper.includes('HEAD') || upper.includes('CHIEF') || upper.includes('ACT. MANAGER')) return 4;
			
			// Tier 5: Supervisor, Foreman, Coordinator, Leader, Danru
			if (upper.includes('SUPERVISOR') || upper.includes('SPV') || upper.includes('FOREMAN') || upper.includes('COORDINATOR') || upper.includes('LEADER') || upper.includes('DANRU')) return 5;
			
			// Tier 6: Staff, Officer, Operator, Driver, Helper, Mechanic, dll.
			return 6;
		}

		// Transform karyawan dengan atasan_titles & tier level
		const employeesWithAtasan = employees.map((emp: any) => {
			const atasanTitleCodes = atasanByBawahanMap.get(emp.title_code) || [];
			const tier = getTierLevel(emp.title_name, emp.title_code);
			return {
				...emp,
				tier,
				atasan_title_codes: atasanTitleCodes
			};
		});

		return {
			dirFilter,
			divFilter,
			deptFilter,
			searchQuery,
			directorates,
			divisions,
			departments,
			titles,
			employees: employeesWithAtasan,
			supervisorMappings,
			dataSource: 'direct-db'
		};
	} catch (err: any) {
		console.error('❌ [HRD Org Chart] Error loading data:', err?.message);
		return {
			dirFilter: '',
			divFilter: '',
			deptFilter: '',
			searchQuery: '',
			directorates: [],
			divisions: [],
			departments: [],
			titles: [],
			employees: [],
			supervisorMappings: [],
			dataSource: 'direct-db'
		};
	}
};

export const actions: Actions = {
	updateSupervisor: async ({ request }) => {
		const formData = await request.formData();
		const titleBawahan = formData.get('title_bawahan')?.toString();
		const titleAtasan = formData.get('title_atasan')?.toString();

		if (!titleBawahan || !titleAtasan) {
			return fail(400, { message: 'Title atasan dan bawahan wajib diisi' });
		}

		try {
			// Periksa apakah relasi m_atasan sudah ada
			const existing = await sql`
				SELECT id FROM master.m_atasan 
				WHERE title_bawahan = ${titleBawahan} AND title_atasan = ${titleAtasan}
			`;

			if (existing.length === 0) {
				await sql`
					INSERT INTO master.m_atasan (title_atasan, title_bawahan, status, create_date)
					VALUES (${titleAtasan}, ${titleBawahan}, '1', NOW())
				`;
			}

			return { success: true, message: 'Berhasil mengaitkan hirarki atasan' };
		} catch (err: any) {
			console.error('❌ Error updating supervisor mapping:', err?.message);
			return fail(500, { message: 'Gagal memperbarui hirarki atasan' });
		}
	}
};
