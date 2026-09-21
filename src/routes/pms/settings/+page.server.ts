import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { getModuleSetting, setModuleSetting, getFilteredEmployeesForSettings, type ApproverSetting, type EmployeeOption } from '$lib/server/settings';

const DEFAULT_PO_APPROVER: ApproverSetting = {
	name: 'Irwan Gunawan',
	position: 'Procurement Manager',
	payroll_id: ''
};

const DEFAULT_PR_APPROVER: ApproverSetting = {
	name: 'Andi Riswanto',
	position: 'Head of Operations',
	payroll_id: ''
};

export const load: PageServerLoad = async ({ locals }) => {
	try {
		// 1. Ambil setting approval PO & PR
		const approvalPo = await getModuleSetting<ApproverSetting>('pms', 'approval_po', DEFAULT_PO_APPROVER);
		const approvalPr = await getModuleSetting<ApproverSetting>('pms', 'approval_pr', DEFAULT_PR_APPROVER);

		// 2. Ambil daftar karyawan yang terfilter relevan dengan user yang sedang login
		const employees = await getFilteredEmployeesForSettings(locals.user, 'pms');

		return {
			approvalPo,
			approvalPr,
			employees
		};
	} catch (err: any) {
		console.error('Error loading PMS settings:', err);
		return {
			approvalPo: DEFAULT_PO_APPROVER,
			approvalPr: DEFAULT_PR_APPROVER,
			employees: []
		};
	}
};

export const actions: Actions = {
	saveApproval: async ({ request, locals }) => {
		const formData = await request.formData();
		const docType = (formData.get('docType') as string || '').trim().toLowerCase();
		const name = (formData.get('name') as string || '').trim();
		const position = (formData.get('position') as string || '').trim();
		const payrollId = (formData.get('payrollId') as string || '').trim();

		if (!docType || !['po', 'pr'].includes(docType)) {
			return fail(400, { success: false, message: 'Tipe dokumen tidak valid (wajib PO atau PR)' });
		}

		if (!name) {
			return fail(400, { success: false, message: 'Nama Pejabat Penandatangan wajib diisi!' });
		}

		if (!position) {
			return fail(400, { success: false, message: 'Nama Jabatan Pejabat wajib diisi!' });
		}

		const settingKey = docType === 'po' ? 'approval_po' : 'approval_pr';
		const desc = docType === 'po'
			? 'Pejabat Penandatangan Lembar Cetak Purchase Order (PO)'
			: 'Pejabat Penandatangan Lembar Cetak Purchase Request (PR)';

		const approverData: ApproverSetting = {
			name,
			position,
			payroll_id: payrollId
		};

		// Audit user
		const sessionUser = (locals as any)?.user?.name || (locals as any)?.user?.username || 'admin';

		const ok = await setModuleSetting('pms', settingKey, approverData, desc, sessionUser);
		if (!ok) {
			return fail(500, { success: false, message: 'Gagal menyimpan pengaturan ke database' });
		}

		return {
			success: true,
			docType,
			message: `Pengaturan tanda tangan Approved By untuk cetak ${docType.toUpperCase()} berhasil disimpan.`
		};
	}
};
