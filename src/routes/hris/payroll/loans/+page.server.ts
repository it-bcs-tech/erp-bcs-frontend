import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { apiFetch } from '$lib/utils/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const authToken = cookies.get('auth_token');
	const statusFilter = url.searchParams.get('status') || '';
	const searchQuery = url.searchParams.get('search') || '';

	// 1. Coba panggil Laravel API (Issue #17)
	try {
		const queryParams = new URLSearchParams();
		if (statusFilter) queryParams.set('status', statusFilter);
		if (searchQuery) queryParams.set('search', searchQuery);
		queryParams.set('per_page', '50');

		const response = await apiFetch<any>(`/api/v1/hris/payroll/loans?${queryParams.toString()}`, {}, authToken);

		if (response?.data) {
			const summary = response.data.summary || {
				total_loans: 0,
				total_amount: 0,
				total_remaining: 0,
				active_loans: 0,
				pending_loans: 0
			};
			const loans = response.data.loans || [];

			return {
				statusFilter,
				searchQuery,
				summary,
				loans,
				dataSource: 'laravel'
			};
		}
	} catch (apiErr: any) {
		// Fallback ke PostgreSQL direct query jika API belum siap
	}

	// 2. Direct PostgreSQL Fallback
	try {
		const [summary] = await sql`
			SELECT 
				COUNT(*)::int as total_loans,
				COALESCE(SUM(amount), 0)::float as total_amount,
				COALESCE(SUM(remaining_amount), 0)::float as total_remaining,
				COUNT(*) FILTER (WHERE status IN ('approved', 'active'))::int as active_loans,
				COUNT(*) FILTER (WHERE status = 'pending_approval' OR status = 'pending')::int as pending_loans
			FROM presensi.loans
		`;

		let filterCondition = sql`WHERE 1=1`;

		if (statusFilter) {
			filterCondition = sql`${filterCondition} AND l.status = ${statusFilter}`;
		}

		if (searchQuery) {
			const searchPattern = `%${searchQuery}%`;
			filterCondition = sql`${filterCondition} AND (u.name ILIKE ${searchPattern} OR l.reason ILIKE ${searchPattern} OR l.reason_detail ILIKE ${searchPattern})`;
		}

		const loans = await sql`
			SELECT 
				l.id,
				l.user_id,
				COALESCE(u.name, 'Karyawan ID #' || l.user_id) as employee_name,
				l.amount::float,
				l.tenor_months,
				l.monthly_installment::float,
				l.total_repayment::float,
				l.remaining_amount::float,
				l.reason,
				l.reason_detail,
				l.status,
				l.bank_account_number,
				l.bank_name,
				TO_CHAR(l.created_at, 'YYYY-MM-DD') as request_date,
				TO_CHAR(l.start_date, 'YYYY-MM-DD') as start_date
			FROM presensi.loans l
			LEFT JOIN presensi.users u ON u.id = l.user_id
			${filterCondition}
			ORDER BY l.created_at DESC
			LIMIT 50
		`;

		return {
			statusFilter,
			searchQuery,
			summary: summary || {
				total_loans: 0,
				total_amount: 0,
				total_remaining: 0,
				active_loans: 0,
				pending_loans: 0
			},
			loans,
			dataSource: 'database_fallback'
		};
	} catch (err: any) {
		console.error('❌ [HRD Loans] Error loading employee loans:', err?.message);
		return {
			statusFilter: '',
			searchQuery: '',
			summary: {
				total_loans: 0,
				total_amount: 0,
				total_remaining: 0,
				active_loans: 0,
				pending_loans: 0
			},
			loans: [],
			dataSource: 'database_fallback'
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

		// 1. Coba via Laravel API
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
			// 2. Fallback direct SQL insert
			try {
				const interest_rate_percent = 1.00;
				const interest_amount_per_month = amount * 0.01;
				const admin_fee = 25000;
				const monthly_installment = (amount / tenor_months) + interest_amount_per_month;
				const total_repayment = monthly_installment * tenor_months;
				const disbursement_amount = amount - admin_fee;
				const remaining_amount = total_repayment;

				await sql`
					INSERT INTO presensi.loans 
					(user_id, amount, tenor_months, interest_rate_percent, interest_amount_per_month, admin_fee, monthly_installment, total_repayment, disbursement_amount, remaining_amount, reason, reason_detail, status, bank_name, bank_account_number, created_at, updated_at)
					VALUES 
					(${user_id}, ${amount}, ${tenor_months}, ${interest_rate_percent}, ${interest_amount_per_month}, ${admin_fee}, ${monthly_installment}, ${total_repayment}, ${disbursement_amount}, ${remaining_amount}, ${reason}, ${reason_detail}, 'pending_approval', ${bank_name}, ${bank_account_number}, NOW(), NOW())
				`;
				return { success: true };
			} catch (e: any) {
				console.error('Failed to submit loan request:', e);
				return fail(500, { message: e.message || 'Gagal menyimpan pengajuan pinjaman.' });
			}
		}
	},

	approveLoan: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const loanId = formData.get('loanId')?.toString();
		if (!loanId) return fail(400, { message: 'ID pinjaman tidak ditemukan.' });

		// 1. Coba via Laravel API
		try {
			await apiFetch(`/api/v1/hris/payroll/loans/${loanId}/approve`, {
				method: 'POST'
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			// 2. Fallback direct SQL update
			try {
				await sql`
					UPDATE presensi.loans
					SET 
						status = 'approved',
						approved_by = 1,
						approved_at = NOW(),
						start_date = CURRENT_DATE,
						disbursement_date = CURRENT_DATE,
						updated_at = NOW()
					WHERE id = ${loanId}
				`;
				return { success: true };
			} catch (e: any) {
				console.error('Failed to approve loan:', e);
				return fail(500, { message: e.message || 'Gagal menyetujui pinjaman.' });
			}
		}
	},

	rejectLoan: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const loanId = formData.get('loanId')?.toString();
		const rejection_reason = formData.get('rejection_reason')?.toString() || 'Plafond pinjaman tidak disetujui';

		if (!loanId) return fail(400, { message: 'ID pinjaman tidak ditemukan.' });

		// 1. Coba via Laravel API
		try {
			await apiFetch(`/api/v1/hris/payroll/loans/${loanId}/reject`, {
				method: 'POST',
				body: JSON.stringify({ rejection_reason })
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			// 2. Fallback direct SQL update
			try {
				await sql`
					UPDATE presensi.loans
					SET 
						status = 'rejected',
						rejection_reason = ${rejection_reason},
						updated_at = NOW()
					WHERE id = ${loanId}
				`;
				return { success: true };
			} catch (e: any) {
				console.error('Failed to reject loan:', e);
				return fail(500, { message: e.message || 'Gagal menolak pinjaman.' });
			}
		}
	}
};
