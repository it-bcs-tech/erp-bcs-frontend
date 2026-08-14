import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	const statusFilter = url.searchParams.get('status') || '';
	const searchQuery = url.searchParams.get('search') || '';

	try {
		// 1. Ringkasan Kasbon & Pinjaman Karyawan
		const [summary] = await sql`
			SELECT 
				COUNT(*)::int as total_loans,
				COALESCE(SUM(amount), 0)::float as total_amount,
				COALESCE(SUM(remaining_amount), 0)::float as total_remaining,
				COUNT(*) FILTER (WHERE status IN ('approved', 'active'))::int as active_loans,
				COUNT(*) FILTER (WHERE status = 'pending')::int as pending_loans
			FROM presensi.loans
		`;

		// 2. Daftar Pinjaman Karyawan
		let filterCondition = sql`WHERE 1=1`;

		if (statusFilter) {
			filterCondition = sql`${filterCondition} AND l.status = ${statusFilter}`;
		}

		if (searchQuery) {
			const searchPattern = `%${searchQuery}%`;
			filterCondition = sql`${filterCondition} AND (u.name ILIKE ${searchPattern} OR l.reason ILIKE ${searchPattern})`;
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
			loans
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
			loans: []
		};
	}
};
