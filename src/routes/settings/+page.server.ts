import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { ADMIN_ROLES } from '$lib/types/auth';
import { getAllModuleSettings, setModuleSetting, type ApproverSetting } from '$lib/server/settings';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	// Proteksi ketat: Hanya Super Admin / Administrator yang diizinkan mengakses halaman Settings
	const isSuperAdmin = user && (ADMIN_ROLES.includes(user.role) || ['superadmin', 'superhyperadmin', 'super_admin', 'administrator'].includes(user.role));

	if (!isSuperAdmin) {
		throw redirect(303, '/');
	}
	try {
		// 1. Ambil status pool logistik & database health
		const poolList = await sql`
			SELECT id, pool_name, lokasi_pool, status_operasional 
			FROM master.m_pool 
			ORDER BY id ASC
			LIMIT 10
		`;

		// 2. Ambil seluruh setting approval dari master.module_settings
		const moduleSettings = await getAllModuleSettings();

		// 3. Ambil daftar karyawan untuk dropdown
		let employees: Array<{ payrollId: string; name: string; position: string }> = [];
		try {
			const empRows = await sql`
				SELECT 
					k.payroll_id as "payrollId", 
					k.nama_karyawan as name, 
					COALESCE(t.title_name, k.title, '') as position
				FROM master.m_karyawan k
				LEFT JOIN master.m_title t ON t.title_code = k.title
				WHERE (k.aktif = 'Y' OR k.aktif = '1' OR k.aktif IS NULL)
				ORDER BY k.nama_karyawan ASC
			`;
			employees = empRows.map((r: any) => ({
				payrollId: r.payrollId || '',
				name: r.name || '',
				position: r.position || ''
			}));
		} catch (e) {
			console.warn('Fallback loading employees in /settings:', e);
		}

		return {
			pools: poolList || [],
			moduleSettings,
			employees
		};
	} catch (e: any) {
		console.warn('Fallback settings load:', e?.message);
		return {
			pools: [
				{ id: 1, pool_name: 'Pool Cilegon Utama', lokasi_pool: 'Gerem, Cilegon, Banten', status_operasional: 'Active' },
				{ id: 2, pool_name: 'Pool Gunung Putri', lokasi_pool: 'Wanaherang, Gunung Putri, Bogor', status_operasional: 'Active' }
			],
			moduleSettings: [],
			employees: []
		};
	}
};

export const actions: Actions = {
	saveModuleApproval: async ({ request, locals }) => {
		const formData = await request.formData();
		const moduleName = (formData.get('module') as string || '').trim().toLowerCase();
		const settingKey = (formData.get('settingKey') as string || '').trim();
		const name = (formData.get('name') as string || '').trim();
		const position = (formData.get('position') as string || '').trim();
		const payrollId = (formData.get('payrollId') as string || '').trim();
		const description = (formData.get('description') as string || '').trim();

		if (!moduleName || !settingKey) {
			return fail(400, { success: false, message: 'Modul dan Setting Key wajib disertakan' });
		}

		if (!name || !position) {
			return fail(400, { success: false, message: 'Nama Pejabat dan Jabatan wajib diisi!' });
		}

		const approverData: ApproverSetting = {
			name,
			position,
			payroll_id: payrollId
		};

		const sessionUser = (locals as any)?.user?.name || (locals as any)?.user?.username || 'admin';

		const ok = await setModuleSetting(moduleName, settingKey, approverData, description, sessionUser);
		if (!ok) {
			return fail(500, { success: false, message: 'Gagal menyimpan pengaturan approval' });
		}

		return {
			success: true,
			moduleName,
			settingKey,
			message: `Pengaturan tanda tangan Approved By untuk ${moduleName.toUpperCase()} (${settingKey}) berhasil disimpan.`
		};
	}
};
