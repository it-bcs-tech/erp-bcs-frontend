import type { PageServerLoad, Actions } from './$types';
import { apiFetch } from '$lib/utils/api';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const authToken = cookies.get('auth_token');
	const selectedPeriod = url.searchParams.get('period') || '2026-07-01';
	const searchQuery = url.searchParams.get('search') || '';
	const divisionFilter = url.searchParams.get('division') || '';

	// Generate daftar periode bulanan standar
	const periods = [
		{ period_key: '2026-08-01', period_label: 'August 2026', period_code: '08 - 2026' },
		{ period_key: '2026-07-01', period_label: 'July 2026', period_code: '07 - 2026' },
		{ period_key: '2026-06-01', period_label: 'June 2026', period_code: '06 - 2026' },
		{ period_key: '2026-05-01', period_label: 'May 2026', period_code: '05 - 2026' },
		{ period_key: '2026-04-01', period_label: 'April 2026', period_code: '04 - 2026' }
	];

	try {
		const payrollParams = new URLSearchParams();
		if (selectedPeriod) payrollParams.set('period', selectedPeriod.slice(0, 7)); // YYYY-MM
		if (searchQuery) payrollParams.set('search', searchQuery);
		if (divisionFilter) payrollParams.set('division', divisionFilter);
		payrollParams.set('per_page', '100');

		const [payrollRes, reimbursementRes] = await Promise.all([
			apiFetch<any>(`/api/v1/hris/payroll?${payrollParams.toString()}`, {}, authToken).catch(() => ({
				data: {
					summary: { total_count: 0, total_gross: 0, total_deductions: 0, total_net_thp: 0, avg_salary: 0 },
					divisions: [],
					slips: []
				}
			})),
			apiFetch<any>(`/api/v1/hris/payroll/reimbursements?per_page=100`, {}, authToken).catch(() => ({
				data: {
					summary: { total_claims: 0, total_approved_amount: 0, pending_claims: 0, rejected_claims: 0 },
					claims: []
				}
			}))
		]);

		const payrollData = payrollRes?.data || {};
		const reimbursementData = reimbursementRes?.data || {};

		const summary = {
			total_count: payrollData.summary?.total_count || 0,
			sum_basic: 0,
			sum_gross: payrollData.summary?.total_gross || 0,
			sum_deductions: payrollData.summary?.total_deductions || 0,
			sum_net: payrollData.summary?.total_net_thp || 0,
			avg_net: payrollData.summary?.avg_salary || 0,
			sum_bpjs: 0,
			sum_tax: 0,
			sum_absence_deduction: 0
		};

		const divisions = payrollData.divisions || [];
		const salarySlips = (payrollData.slips || []).map((s: any) => ({
			...s,
			period_date: s.period || selectedPeriod,
			period_display: s.period || selectedPeriod
		}));

		const reimbursementSummary = {
			total_claims: reimbursementData.summary?.total_claims || 0,
			total_approved_amount: reimbursementData.summary?.total_approved_amount || 0,
			pending_claims: reimbursementData.summary?.pending_claims || 0,
			approved_claims: (reimbursementData.summary?.total_claims || 0) - (reimbursementData.summary?.pending_claims || 0) - (reimbursementData.summary?.rejected_claims || 0)
		};

		const reimbursements = (reimbursementData.claims || []).map((c: any) => ({
			...c,
			claim_date: c.submitted_at ? c.submitted_at.split(' ')[0] : '2026-08-18',
			approved_amount: c.amount || 0
		}));

		return {
			selectedPeriod,
			searchQuery,
			divisionFilter,
			periods,
			divisions,
			summary,
			salarySlips,
			reimbursements,
			reimbursementSummary,
			dataSource: 'laravel'
		};
	} catch (err: any) {
		console.error('❌ [HRD Payroll API] Error loading data:', err?.message);
		return {
			selectedPeriod,
			searchQuery: '',
			divisionFilter: '',
			periods,
			divisions: [],
			summary: {
				total_count: 0,
				sum_basic: 0,
				sum_gross: 0,
				sum_deductions: 0,
				sum_net: 0,
				avg_net: 0,
				sum_bpjs: 0,
				sum_tax: 0,
				sum_absence_deduction: 0
			},
			salarySlips: [],
			reimbursements: [],
			reimbursementSummary: {
				total_claims: 0,
				total_approved_amount: 0,
				pending_claims: 0,
				approved_claims: 0
			},
			dataSource: 'laravel'
		};
	}
};

export const actions: Actions = {
	updateSlip: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const slipId = formData.get('slipId')?.toString();
		
		if (!slipId) return fail(400, { message: 'ID Slip Gaji tidak ditemukan' });

		const payload = {
			basic_salary: parseFloat(formData.get('basic_salary')?.toString() || '0'),
			professional_allowance: parseFloat(formData.get('professional_allowance')?.toString() || '0'),
			performance_allowance: parseFloat(formData.get('performance_allowance')?.toString() || '0'),
			position_allowance: parseFloat(formData.get('position_allowance')?.toString() || '0'),
			meal_allowance: parseFloat(formData.get('meal_allowance')?.toString() || '0'),
			transport_allowance: parseFloat(formData.get('transport_allowance')?.toString() || '0'),
			relocation_allowance: parseFloat(formData.get('relocation_allowance')?.toString() || '0'),
			skill_allowance: parseFloat(formData.get('skill_allowance')?.toString() || '0'),
			other_allowance: parseFloat(formData.get('other_allowance')?.toString() || '0'),
			incentive: parseFloat(formData.get('incentive')?.toString() || '0'),
			communication_allowance: parseFloat(formData.get('communication_allowance')?.toString() || '0'),
			overtime_allowance: parseFloat(formData.get('overtime_allowance')?.toString() || '0'),
			khk_allowance: parseFloat(formData.get('khk_allowance')?.toString() || '0'),
			zakat: parseFloat(formData.get('zakat')?.toString() || '0'),
			tax: parseFloat(formData.get('tax')?.toString() || '0'),
			bpjs: parseFloat(formData.get('bpjs')?.toString() || '0'),
			union_fee: parseFloat(formData.get('union_fee')?.toString() || '0'),
			absence_deduction: parseFloat(formData.get('absence_deduction')?.toString() || '0'),
			cooperative: parseFloat(formData.get('cooperative')?.toString() || '0'),
			bpr_installment: parseFloat(formData.get('bpr_installment')?.toString() || '0'),
			other_deduction: parseFloat(formData.get('other_deduction')?.toString() || '0')
		};

		const gross_salary = payload.basic_salary + payload.professional_allowance + payload.performance_allowance + payload.position_allowance + payload.meal_allowance + payload.transport_allowance + payload.relocation_allowance + payload.skill_allowance + payload.other_allowance + payload.incentive + payload.communication_allowance + payload.overtime_allowance + payload.khk_allowance;
		const total_deductions = payload.zakat + payload.tax + payload.bpjs + payload.union_fee + payload.absence_deduction + payload.cooperative + payload.bpr_installment + payload.other_deduction;
		const net_salary = gross_salary - total_deductions;

		try {
			await apiFetch(`/api/v1/hris/payroll/slips/${slipId}`, {
				method: 'PUT',
				body: JSON.stringify({ ...payload, net_salary })
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.error('❌ [Update Slip API] Error:', apiErr?.message);
			return fail(500, { message: apiErr.message || 'Gagal menyimpan ke backend API' });
		}
	},

	submitReimbursement: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const employee_nik = formData.get('employee_nik')?.toString() || '';
		const employee_name = formData.get('employee_name')?.toString() || '';
		const claim_type = formData.get('claim_type')?.toString() || 'Rawat Jalan & Obat';
		const amount = parseFloat(formData.get('amount')?.toString() || '0');
		const description = formData.get('description')?.toString() || '';

		if (!employee_name || amount <= 0) {
			return fail(400, { message: 'Nama karyawan dan nominal klaim valid wajib diisi.' });
		}

		try {
			await apiFetch('/api/v1/hris/payroll/reimbursements', {
				method: 'POST',
				body: JSON.stringify({
					user_id: 122,
					employee_nik,
					employee_name,
					claim_type,
					amount,
					description
				})
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.error('❌ [Submit Reimbursement API] Error:', apiErr?.message);
			return fail(500, { message: apiErr.message || 'Gagal menyimpan pengajuan klaim.' });
		}
	},

	approveReimbursement: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const claimId = formData.get('claimId')?.toString();

		if (!claimId) return fail(400, { message: 'ID klaim tidak ditemukan.' });

		try {
			await apiFetch(`/api/v1/hris/payroll/reimbursements/${claimId}/approve`, {
				method: 'POST'
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.error('❌ [Approve Reimbursement API] Error:', apiErr?.message);
			return fail(500, { message: apiErr.message || 'Gagal menyetujui klaim.' });
		}
	},

	rejectReimbursement: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const claimId = formData.get('claimId')?.toString();
		const rejection_reason = formData.get('rejection_reason')?.toString() || 'Dokumen atau kuitansi tidak memenuhi syarat';

		if (!claimId) return fail(400, { message: 'ID klaim tidak ditemukan.' });

		try {
			await apiFetch(`/api/v1/hris/payroll/reimbursements/${claimId}/reject`, {
				method: 'POST',
				body: JSON.stringify({ rejection_reason })
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.error('❌ [Reject Reimbursement API] Error:', apiErr?.message);
			return fail(500, { message: apiErr.message || 'Gagal menolak klaim.' });
		}
	}
};
