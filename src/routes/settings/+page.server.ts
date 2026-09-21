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

		// 3. Ambil daftar karyawan untuk dropdown yang relevan
		const employees = await getFilteredEmployeesForSettings(user, 'global');

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
	},

	saveDocTypes: async ({ request, locals }) => {
		const formData = await request.formData();
		const moduleName = (formData.get('module') as string || 'finance').trim().toLowerCase();
		const settingKey = (formData.get('settingKey') as string || '').trim();
		const docTypesRaw = (formData.get('docTypes') as string || '').trim();
		const description = (formData.get('description') as string || '').trim();

		if (!settingKey) {
			return fail(400, { success: false, message: 'Setting Key wajib disertakan' });
		}

		let docTypesList: string[] = [];
		try {
			if (docTypesRaw.startsWith('[')) {
				docTypesList = JSON.parse(docTypesRaw);
			} else {
				docTypesList = docTypesRaw.split(',').map(s => s.trim()).filter(Boolean);
			}
		} catch {
			docTypesList = docTypesRaw.split(',').map(s => s.trim()).filter(Boolean);
		}

		if (docTypesList.length === 0) {
			return fail(400, { success: false, message: 'Minimal harus ada 1 tipe dokumen!' });
		}

		const sessionUser = (locals as any)?.user?.name || (locals as any)?.user?.username || 'admin';
		const ok = await setModuleSetting(moduleName, settingKey, docTypesList, description, sessionUser);
		if (!ok) {
			return fail(500, { success: false, message: 'Gagal menyimpan preset tipe dokumen' });
		}

		return {
			success: true,
			moduleName,
			settingKey,
			message: `Preset tipe dokumen ${settingKey === 'customer_invoice_order_doc_types' ? 'Order / Kontrak' : 'Penerimaan / Pengiriman'} berhasil diperbarui.`
		};
	}
};
