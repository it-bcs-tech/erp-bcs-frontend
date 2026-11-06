import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { ADMIN_ROLES } from '$lib/types/auth';
import { getAllModuleSettings, setModuleSetting, getFilteredEmployeesForSettings, type ApproverSetting } from '$lib/server/settings';
import {
	getAICatalogConfig,
	saveAICatalogConfig,
	DEFAULT_AI_CATALOG,
	type AIModelProfile,
	type AICatalogConfig
} from '$lib/server/aiConfig';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { user } = await parent();

	// Proteksi ketat: Hanya Super Admin / Administrator yang diizinkan mengakses halaman Settings
	const isSuperAdmin = user && (ADMIN_ROLES.includes(user.role) || ['superadmin', 'superhyperadmin', 'super_admin', 'administrator'].includes(user.role));

	if (!isSuperAdmin) {
		throw redirect(303, '/');
	}

	const tabParam = url.searchParams.get('tab');
	const initialTab =
		tabParam && ['privacy', 'company', 'preferences', 'security', 'approvals', 'email', 'ai'].includes(tabParam)
			? tabParam
			: 'privacy';

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

		// 4. Ambil master tipe unit armada untuk OCS
		const tipeUnits = await sql`
			SELECT id, nama_tipe, golongan_tol 
			FROM master.m_tipe_unit 
			ORDER BY nama_tipe ASC
		`;

		// 5. Ambil katalog profil model & custom endpoint AI
		const aiCatalog = await getAICatalogConfig();

		return {
			pools: poolList || [],
			moduleSettings,
			employees,
			tipeUnits: tipeUnits || [],
			aiCatalog,
			initialTab
		};
	} catch (e: any) {
		console.warn('Fallback settings load:', e?.message);
		return {
			pools: [
				{ id: 1, pool_name: 'Pool Cilegon Utama', lokasi_pool: 'Gerem, Cilegon, Banten', status_operasional: 'Active' },
				{ id: 2, pool_name: 'Pool Gunung Putri', lokasi_pool: 'Wanaherang, Gunung Putri, Bogor', status_operasional: 'Active' }
			],
			moduleSettings: [],
			employees: [],
			tipeUnits: [],
			aiCatalog: DEFAULT_AI_CATALOG,
			initialTab: 'privacy'
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
	},

	saveOcsSolar: async ({ request, locals }) => {
		const formData = await request.formData();
		const kmPerLiterRaw = formData.get('solar_km_per_liter') as string;
		const pricePerLiterRaw = formData.get('solar_price_per_liter') as string;

		const kmPerLiter = parseFloat(kmPerLiterRaw);
		const pricePerLiter = parseFloat(pricePerLiterRaw);

		if (isNaN(kmPerLiter) || kmPerLiter <= 0) {
			return fail(400, { success: false, message: 'Rasio KM per Liter harus berupa angka lebih dari 0!' });
		}

		if (isNaN(pricePerLiter) || pricePerLiter <= 0) {
			return fail(400, { success: false, message: 'Harga Solar per Liter harus berupa angka lebih dari 0!' });
		}

		const sessionUser = (locals as any)?.user?.name || (locals as any)?.user?.username || 'admin';

		const okRatio = await setModuleSetting(
			'ocs',
			'solar_km_per_liter',
			Math.round(kmPerLiter * 100) / 100,
			'Rasio konsumsi solar default (KM per Liter)',
			sessionUser
		);

		const okPrice = await setModuleSetting(
			'ocs',
			'solar_price_per_liter',
			Math.round(pricePerLiter),
			'Harga acuan solar per liter (Rp)',
			sessionUser
		);

		if (!okRatio || !okPrice) {
			return fail(500, { success: false, message: 'Gagal menyimpan pengaturan solar OCS ke database.' });
		}

		return {
			success: true,
			moduleName: 'ocs',
			settingKey: 'solar_general',
			message: 'Pengaturan acuan solar modul OCS berhasil diperbarui dari Admin Settings.'
		};
	},

	savePrivacySettings: async ({ request, locals }) => {
		const formData = await request.formData();
		const hideSalaryNominals = formData.get('hideSalaryNominals') === 'true' || formData.get('hideSalaryNominals') === '1';
		const maskSensitiveInfo = formData.get('maskSensitiveInfo') === 'true' || formData.get('maskSensitiveInfo') === '1';

		const sessionUser = (locals as any)?.user?.name || (locals as any)?.user?.username || 'admin';

		const privacyValue = {
			hideSalaryNominals,
			maskSensitiveInfo
		};

		const ok = await setModuleSetting(
			'system',
			'privacy',
			privacyValue,
			'Pengaturan Privasi Global & Sensor Nominal Gaji / Data Finansial ERP BCS',
			sessionUser
		);

		if (!ok) {
			return fail(500, { success: false, message: 'Gagal menyimpan pengaturan privasi ke database.' });
		}

		return {
			success: true,
			privacyValue,
			message: 'Pengaturan Privasi Global berhasil disimpan ke database dan aktif di seluruh akun.'
		};
	},

	saveAIProfile: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = (formData.get('id') as string || '').trim();
		const name = (formData.get('name') as string || '').trim();
		const provider = (formData.get('provider') as string || 'custom').trim();
		const baseUrl = (formData.get('baseUrl') as string || '').trim();
		const apiKey = (formData.get('apiKey') as string || '').trim();
		const model = (formData.get('model') as string || '').trim();
		const temperature = parseFloat((formData.get('temperature') as string) || '0.7');
		const maxTokens = parseInt((formData.get('maxTokens') as string) || '2048', 10);
		const makeActive = formData.get('makeActive') === 'true' || formData.get('makeActive') === 'on';

		if (!name) {
			return fail(400, { success: false, message: 'Label / Nama Profil Model wajib diisi!' });
		}
		if (!baseUrl) {
			return fail(400, { success: false, message: 'Custom Base URL / Endpoint wajib diisi!' });
		}
		if (!model) {
			return fail(400, { success: false, message: 'Nama Model Identifier wajib diisi!' });
		}

		const sessionUser = (locals as any)?.user?.name || (locals as any)?.user?.username || 'admin';
		const catalog = await getAICatalogConfig();
		const profileId = id || `prof_${Date.now()}`;

		const updatedProfile: AIModelProfile = {
			id: profileId,
			name,
			provider,
			baseUrl,
			apiKey,
			model,
			temperature: isNaN(temperature) ? 0.7 : Math.min(1.0, Math.max(0.0, temperature)),
			maxTokens: isNaN(maxTokens) ? 2048 : Math.max(128, maxTokens),
			updatedAt: new Date().toISOString()
		};

		const existingIndex = catalog.profiles.findIndex((p) => p.id === profileId);
		if (existingIndex >= 0) {
			catalog.profiles[existingIndex] = {
				...catalog.profiles[existingIndex],
				...updatedProfile,
				isDefault: catalog.profiles[existingIndex].isDefault
			};
		} else {
			catalog.profiles.push(updatedProfile);
		}

		if (makeActive || catalog.profiles.length === 1) {
			catalog.activeProfileId = profileId;
		}

		const ok = await saveAICatalogConfig(catalog, sessionUser);
		if (!ok) {
			return fail(500, { success: false, message: 'Gagal menyimpan profil model ke database.' });
		}

		return {
			success: true,
			savedProfileId: profileId,
			aiCatalog: catalog,
			message: `Profil model "${name}" (${model}) berhasil disimpan.`
		};
	},

	deleteAIProfile: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = (formData.get('id') as string || '').trim();

		if (!id) {
			return fail(400, { success: false, message: 'ID Profil model tidak valid.' });
		}

		const sessionUser = (locals as any)?.user?.name || (locals as any)?.user?.username || 'admin';
		const catalog = await getAICatalogConfig();

		if (catalog.profiles.length <= 1) {
			return fail(400, { success: false, message: 'Tidak dapat menghapus satu-satunya profil model di sistem.' });
		}

		const targetIndex = catalog.profiles.findIndex((p) => p.id === id);
		if (targetIndex === -1) {
			return fail(404, { success: false, message: 'Profil model tidak ditemukan.' });
		}

		const deletedName = catalog.profiles[targetIndex].name;
		catalog.profiles.splice(targetIndex, 1);

		if (catalog.activeProfileId === id) {
			catalog.activeProfileId = catalog.profiles[0].id;
		}

		const ok = await saveAICatalogConfig(catalog, sessionUser);
		if (!ok) {
			return fail(500, { success: false, message: 'Gagal menghapus profil model dari database.' });
		}

		return {
			success: true,
			aiCatalog: catalog,
			message: `Profil model "${deletedName}" berhasil dihapus.`
		};
	},

	setActiveAIProfile: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = (formData.get('id') as string || '').trim();

		if (!id) {
			return fail(400, { success: false, message: 'ID Profil model tidak valid.' });
		}

		const sessionUser = (locals as any)?.user?.name || (locals as any)?.user?.username || 'admin';
		const catalog = await getAICatalogConfig();
		const target = catalog.profiles.find((p) => p.id === id);

		if (!target) {
			return fail(404, { success: false, message: 'Profil model tidak ditemukan di katalog.' });
		}

		catalog.activeProfileId = id;
		const ok = await saveAICatalogConfig(catalog, sessionUser);
		if (!ok) {
			return fail(500, { success: false, message: 'Gagal mengaktifkan profil model.' });
		}

		return {
			success: true,
			activeProfileId: id,
			aiCatalog: catalog,
			message: `Model "${target.name}" (${target.model}) sekarang aktif untuk seluruh modul ERP.`
		};
	},

	saveAISettings: async ({ request, locals }) => {
		const formData = await request.formData();
		const model = (formData.get('model') as string || '').trim();
		const provider = (formData.get('provider') as string || 'openclaw').trim();
		const temperature = parseFloat((formData.get('temperature') as string) || '0.7');
		const maxTokens = parseInt((formData.get('maxTokens') as string) || '2048', 10);

		if (!model) {
			return fail(400, { success: false, message: 'Nama model AI wajib diisi!' });
		}

		const sessionUser = (locals as any)?.user?.name || (locals as any)?.user?.username || 'admin';

		const aiConfig = {
			model,
			provider,
			temperature: isNaN(temperature) ? 0.7 : Math.min(1.0, Math.max(0.0, temperature)),
			maxTokens: isNaN(maxTokens) ? 2048 : Math.max(128, maxTokens)
		};

		const ok = await setModuleSetting(
			'ai',
			'global_config',
			aiConfig,
			'Konfigurasi Global LLM Engine & Parameter AI Chat ERP BCS',
			sessionUser
		);

		if (!ok) {
			return fail(500, { success: false, message: 'Gagal menyimpan konfigurasi AI ke database.' });
		}

		return {
			success: true,
			aiConfig,
			message: `Konfigurasi model AI (${model}) berhasil disimpan dan aktif serentak di seluruh modul ERP.`
		};
	}
};
