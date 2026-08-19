import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { apiFetch } from '$lib/utils/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const authToken = cookies.get('auth_token');
	const statusFilter = url.searchParams.get('status') || '';
	const searchQuery = url.searchParams.get('search') || '';

	try {
		const queryParams = new URLSearchParams();
		if (statusFilter) queryParams.set('status', statusFilter);
		if (searchQuery) queryParams.set('search', searchQuery);
		queryParams.set('per_page', '50');

		const response = await apiFetch<any>(`/api/v1/hris/payroll/loans?${queryParams.toString()}`, {}, authToken);

		const summary = response?.data?.summary || {
			total_loans: 0,
			total_amount: 0,
			total_remaining: 0,
			active_loans: 0,
			pending_loans: 0
		};
		const loans = response?.data?.loans || [];

		return {
			statusFilter,
			searchQuery,
			summary,
			loans,
			dataSource: 'laravel'
		};
	} catch (apiErr: any) {
		console.error('❌ [HRD Loans API] Error loading loans:', apiErr?.message);
		return {
			statusFilter,
			searchQuery,
			summary: {
				total_loans: 0,
				total_amount: 0,
				total_remaining: 0,
				active_loans: 0,
				pending_loans: 0
			},
			loans: [],
			dataSource: 'laravel'
		};
	}
};

export const actions: Actions = {
	submitLoan: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const user_id = parseInt(formData.get('user_id')?.toString() || '122');
		const amount = parseFloat(formData.get('amount')?.toString() || '0');
		const tenor_months = parseInt(formData.get('tenor_months')?.toString() || '12');
		const reason = formData.get('reason')?.toString() || 'other';
		const reason_detail = formData.get('reason_detail')?.toString() || '';
		const bank_name = formData.get('bank_name')?.toString() || 'BCA';
		const bank_account_number = formData.get('bank_account_number')?.toString() || '';

		if (amount <= 0 || !user_id) {
			return fail(400, { message: 'Nominal pinjaman dan karyawan wajib diisi.' });
		}

		try {
			await apiFetch('/api/v1/hris/payroll/loans', {
				method: 'POST',
				body: JSON.stringify({
					user_id,
					amount,
					tenor_months,
					reason,
					reason_detail,
					bank_name,
					bank_account_number
				})
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.error('❌ [Submit Loan API] Error:', apiErr?.message);
			return fail(500, { message: apiErr.message || 'Gagal menyimpan pengajuan pinjaman.' });
		}
	},

	approveLoan: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const loanId = formData.get('loanId')?.toString();
		if (!loanId) return fail(400, { message: 'ID pinjaman tidak ditemukan.' });

		try {
			await apiFetch(`/api/v1/hris/payroll/loans/${loanId}/approve`, {
				method: 'POST'
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.error('❌ [Approve Loan API] Error:', apiErr?.message);
			return fail(500, { message: apiErr.message || 'Gagal menyetujui pinjaman.' });
		}
	},

	rejectLoan: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const loanId = formData.get('loanId')?.toString();
		const rejection_reason = formData.get('rejection_reason')?.toString() || 'Plafond pinjaman tidak disetujui';

		if (!loanId) return fail(400, { message: 'ID pinjaman tidak ditemukan.' });

		try {
			await apiFetch(`/api/v1/hris/payroll/loans/${loanId}/reject`, {
				method: 'POST',
				body: JSON.stringify({ rejection_reason })
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.error('❌ [Reject Loan API] Error:', apiErr?.message);
			return fail(500, { message: apiErr.message || 'Gagal menolak pinjaman.' });
		}
	}
};
