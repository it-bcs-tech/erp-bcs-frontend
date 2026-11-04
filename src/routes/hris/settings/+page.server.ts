import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import {
	getOrganizationSettingsData,
	saveTitle,
	toggleTitleStatus,
	deleteTitle,
	saveDepartment,
	toggleDepartmentStatus,
	deleteDepartment,
	saveDivision,
	toggleDivisionStatus,
	deleteDivision,
	saveDirectorate,
	toggleDirectorateStatus,
	deleteDirectorate
} from '$lib/server/hris/organizationService';

export const load: PageServerLoad = async () => {
	try {
		const orgData = await getOrganizationSettingsData();
		return {
			...orgData
		};
	} catch (err: any) {
		console.error('[HRIS Settings] Error loading organization data:', err);
		return {
			summary: {
				totalTitles: 0,
				activeTitles: 0,
				totalDepts: 0,
				activeDepts: 0,
				totalDivs: 0,
				activeDivs: 0,
				totalDirs: 0,
				activeDirs: 0
			},
			nextCodes: { title: 'JB_001', dept: 'D_01', div: 'DV_01', dir: 'DR_01' },
			titles: [],
			departments: [],
			divisions: [],
			directorates: [],
			parentLookups: { directorates: [], divisions: [] },
			error: err?.message || 'Gagal memuat data master struktur organisasi.'
		};
	}
};

export const actions: Actions = {
	// ===========================
	// AKSI JABATAN (TITLES)
	// ===========================
	saveTitle: async ({ request }) => {
		const formData = await request.formData();
		const code = formData.get('code')?.toString() || '';
		const title = formData.get('title')?.toString() || '';
		const jobDesc = formData.get('jobDesc')?.toString() || '';
		const active = formData.get('active')?.toString() || 'Y';
		const isEdit = formData.get('isEdit')?.toString() === 'true';

		try {
			const res = await saveTitle({ code, title, jobDesc, active, isEdit });
			return { success: true, message: res.message };
		} catch (e: any) {
			return fail(400, { success: false, message: e?.message || 'Gagal menyimpan data jabatan.' });
		}
	},

	toggleTitleStatus: async ({ request }) => {
		const formData = await request.formData();
		const code = formData.get('code')?.toString() || '';
		try {
			const res = await toggleTitleStatus(code);
			return { success: true, message: res.message };
		} catch (e: any) {
			return fail(400, { success: false, message: e?.message || 'Gagal mengubah status jabatan.' });
		}
	},

	deleteTitle: async ({ request }) => {
		const formData = await request.formData();
		const code = formData.get('code')?.toString() || '';
		try {
			const res = await deleteTitle(code);
			return { success: true, message: res.message };
		} catch (e: any) {
			return fail(400, { success: false, message: e?.message || 'Gagal menghapus jabatan.' });
		}
	},

	// ===========================
	// AKSI DEPARTEMEN (DEPTS)
	// ===========================
	saveDepartment: async ({ request }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id')) || undefined;
		const code = formData.get('code')?.toString() || '';
		const name = formData.get('name')?.toString() || '';
		const divCode = formData.get('divCode')?.toString() || '';
		const active = formData.get('active')?.toString() || 'Y';
		const isEdit = formData.get('isEdit')?.toString() === 'true';

		try {
			const res = await saveDepartment({ id, code, name, divCode, active, isEdit });
			return { success: true, message: res.message };
		} catch (e: any) {
			return fail(400, { success: false, message: e?.message || 'Gagal menyimpan data departemen.' });
		}
	},

	toggleDepartmentStatus: async ({ request }) => {
		const formData = await request.formData();
		const code = formData.get('code')?.toString() || '';
		try {
			const res = await toggleDepartmentStatus(code);
			return { success: true, message: res.message };
		} catch (e: any) {
			return fail(400, { success: false, message: e?.message || 'Gagal mengubah status departemen.' });
		}
	},

	deleteDepartment: async ({ request }) => {
		const formData = await request.formData();
		const code = formData.get('code')?.toString() || '';
		try {
			const res = await deleteDepartment(code);
			return { success: true, message: res.message };
		} catch (e: any) {
			return fail(400, { success: false, message: e?.message || 'Gagal menghapus departemen.' });
		}
	},

	// ===========================
	// AKSI DIVISI (DIVISIONS)
	// ===========================
	saveDivision: async ({ request }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id')) || undefined;
		const code = formData.get('code')?.toString() || '';
		const name = formData.get('name')?.toString() || '';
		const dirCode = formData.get('dirCode')?.toString() || '';
		const active = formData.get('active')?.toString() || 'Y';
		const isEdit = formData.get('isEdit')?.toString() === 'true';

		try {
			const res = await saveDivision({ id, code, name, dirCode, active, isEdit });
			return { success: true, message: res.message };
		} catch (e: any) {
			return fail(400, { success: false, message: e?.message || 'Gagal menyimpan data divisi.' });
		}
	},

	toggleDivisionStatus: async ({ request }) => {
		const formData = await request.formData();
		const code = formData.get('code')?.toString() || '';
		try {
			const res = await toggleDivisionStatus(code);
			return { success: true, message: res.message };
		} catch (e: any) {
			return fail(400, { success: false, message: e?.message || 'Gagal mengubah status divisi.' });
		}
	},

	deleteDivision: async ({ request }) => {
		const formData = await request.formData();
		const code = formData.get('code')?.toString() || '';
		try {
			const res = await deleteDivision(code);
			return { success: true, message: res.message };
		} catch (e: any) {
			return fail(400, { success: false, message: e?.message || 'Gagal menghapus divisi.' });
		}
	},

	// ===========================
	// AKSI DIREKTORAT (DIRECTORATES)
	// ===========================
	saveDirectorate: async ({ request }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id')) || undefined;
		const code = formData.get('code')?.toString() || '';
		const name = formData.get('name')?.toString() || '';
		const active = formData.get('active')?.toString() || 'Y';
		const isEdit = formData.get('isEdit')?.toString() === 'true';

		try {
			const res = await saveDirectorate({ id, code, name, active, isEdit });
			return { success: true, message: res.message };
		} catch (e: any) {
			return fail(400, { success: false, message: e?.message || 'Gagal menyimpan data direktorat.' });
		}
	},

	toggleDirectorateStatus: async ({ request }) => {
		const formData = await request.formData();
		const code = formData.get('code')?.toString() || '';
		try {
			const res = await toggleDirectorateStatus(code);
			return { success: true, message: res.message };
		} catch (e: any) {
			return fail(400, { success: false, message: e?.message || 'Gagal mengubah status direktorat.' });
		}
	},

	deleteDirectorate: async ({ request }) => {
		const formData = await request.formData();
		const code = formData.get('code')?.toString() || '';
		try {
			const res = await deleteDirectorate(code);
			return { success: true, message: res.message };
		} catch (e: any) {
			return fail(400, { success: false, message: e?.message || 'Gagal menghapus direktorat.' });
		}
	}
};
