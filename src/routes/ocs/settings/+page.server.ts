import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import { getModuleSettings, setModuleSetting } from '$lib/server/settings';

const DEFAULT_SOLAR_KM_PER_LITER = 3.0;
const DEFAULT_SOLAR_PRICE_PER_LITER = 6800;

export const load: PageServerLoad = async ({ locals }) => {
	// Proteksi route: Superadmin atau user yang memiliki akses modul OCS
	const user = (locals as any)?.user;
	const isAdmin = user && (
		['superadmin', 'administrator', 'superhyperadmin', 'super_admin'].includes(user.role?.toLowerCase()) ||
		user.role?.toLowerCase()?.includes('admin') ||
		user.email === 'superhyperadmin@bcs-logistics.co.id'
	);

	const hasOcsAccess = user && (
		isAdmin ||
		(Array.isArray(user.allowedModules) && (
			user.allowedModules.includes('ocs') ||
			user.allowedModules.includes('ocs.settings')
		))
	);

	if (!hasOcsAccess && !isAdmin) {
		throw redirect(303, '/ocs');
	}

	try {
		// 1. Ambil pengaturan modul OCS dari database
		const ocsSettings = await getModuleSettings('ocs');

		const solar_km_per_liter = typeof ocsSettings.solar_km_per_liter === 'number'
			? ocsSettings.solar_km_per_liter
			: parseFloat(ocsSettings.solar_km_per_liter) || DEFAULT_SOLAR_KM_PER_LITER;

		const solar_price_per_liter = typeof ocsSettings.solar_price_per_liter === 'number'
			? ocsSettings.solar_price_per_liter
			: parseFloat(ocsSettings.solar_price_per_liter) || DEFAULT_SOLAR_PRICE_PER_LITER;

		let solar_ratio_by_unit_type: Record<string, number> = {};
		if (ocsSettings.solar_ratio_by_unit_type) {
			if (typeof ocsSettings.solar_ratio_by_unit_type === 'string') {
				try {
					solar_ratio_by_unit_type = JSON.parse(ocsSettings.solar_ratio_by_unit_type);
				} catch (e) {
					solar_ratio_by_unit_type = {};
				}
			} else if (typeof ocsSettings.solar_ratio_by_unit_type === 'object') {
				solar_ratio_by_unit_type = ocsSettings.solar_ratio_by_unit_type;
			}
		}

		// 2. Ambil daftar master tipe unit kendaraan
		const tipeUnits = await sql`
			SELECT id, nama_tipe, golongan_tol 
			FROM master.m_tipe_unit 
			ORDER BY nama_tipe ASC
		`;

		return {
			settings: {
				solar_km_per_liter,
				solar_price_per_liter,
				solar_ratio_by_unit_type
			},
			tipeUnits: tipeUnits as Array<{ id: string | number; nama_tipe: string; golongan_tol: string }>
		};
	} catch (err: any) {
		console.error('Error loading OCS settings:', err);
		return {
			settings: {
				solar_km_per_liter: DEFAULT_SOLAR_KM_PER_LITER,
				solar_price_per_liter: DEFAULT_SOLAR_PRICE_PER_LITER,
				solar_ratio_by_unit_type: {}
			},
			tipeUnits: []
		};
	}
};

export const actions: Actions = {
	saveGeneral: async ({ request, locals }) => {
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
			return fail(500, { success: false, message: 'Gagal menyimpan pengaturan umum solar ke database.' });
		}

		return {
			success: true,
			action: 'general',
			message: 'Pengaturan umum rasio solar & harga solar berhasil disimpan.'
		};
	},

	saveUnitOverrides: async ({ request, locals }) => {
		const formData = await request.formData();
		const jsonOverrides = formData.get('unit_ratios_json') as string;

		if (!jsonOverrides) {
			return fail(400, { success: false, message: 'Data rasio per tipe unit tidak ditemukan.' });
		}

		let parsed: Record<string, any> = {};
		try {
			parsed = JSON.parse(jsonOverrides);
		} catch (e) {
			return fail(400, { success: false, message: 'Format data rasio unit tidak valid JSON.' });
		}

		// Filter hanya yang valid angka positif
		const cleanOverrides: Record<string, number> = {};
		for (const [unitId, val] of Object.entries(parsed)) {
			const num = parseFloat(val as any);
			if (!isNaN(num) && num > 0) {
				cleanOverrides[unitId] = Math.round(num * 100) / 100;
			}
		}

		const sessionUser = (locals as any)?.user?.name || (locals as any)?.user?.username || 'admin';

		const ok = await setModuleSetting(
			'ocs',
			'solar_ratio_by_unit_type',
			cleanOverrides,
			'Override rasio KM/Liter solar khusus per Tipe Unit Kendaraan',
			sessionUser
		);

		if (!ok) {
			return fail(500, { success: false, message: 'Gagal menyimpan daftar override rasio tipe unit.' });
		}

		return {
			success: true,
			action: 'unit_overrides',
			message: `Berhasil memperbarui rasio solar khusus untuk ${Object.keys(cleanOverrides).length} tipe unit armada.`
		};
	},

	resetDefaults: async ({ locals }) => {
		const sessionUser = (locals as any)?.user?.name || (locals as any)?.user?.username || 'admin';

		await setModuleSetting('ocs', 'solar_km_per_liter', DEFAULT_SOLAR_KM_PER_LITER, 'Rasio konsumsi solar default (KM per Liter)', sessionUser);
		await setModuleSetting('ocs', 'solar_price_per_liter', DEFAULT_SOLAR_PRICE_PER_LITER, 'Harga acuan solar per liter (Rp)', sessionUser);
		await setModuleSetting('ocs', 'solar_ratio_by_unit_type', {}, 'Override rasio KM/Liter solar khusus per Tipe Unit Kendaraan', sessionUser);

		return {
			success: true,
			action: 'reset',
			message: 'Pengaturan OCS berhasil dikembalikan ke standar bawaan pabrik (3.0 KM/L & Rp 6.800).'
		};
	}
};
