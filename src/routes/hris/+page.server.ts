import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';
import { logError } from '$lib/utils/logger';

export const load: PageServerLoad = async ({ cookies }) => {
	const authToken = cookies.get('auth_token');

	try {
		const res = await apiFetch<any>('/api/v1/hris/dashboard/overview', {}, authToken);

		if (res && res.data) {
			return {
				metrics: res.data.metrics || {
					totalEmployees: 0,
					totalAllEmployees: 0,
					activeUsersPresentThisMonth: 0,
					totalClockinsThisMonth: 0,
					onTimePercentage: 0,
					totalOvertimeHours: 0,
					pendingLeaveRequests: 0,
					totalActiveLoans: 0,
					totalLoanAmount: 0
				},
				divisions: res.data.divisions || [],
				attendanceTrend: res.data.attendanceTrend || [],
				latestPayroll: res.data.latestPayroll || {
					period_key: '2026-07-01',
					period_label: 'Juli 2026',
					total_slips: 0,
					total_gross: 0,
					total_net: 0,
					avg_net: 0
				},
				anniversaries: res.data.anniversaries || [],
				birthdays: res.data.birthdays || [],
				recentActivity: res.data.recentActivity || [],
				dataSource: 'laravel'
			};
		}

		throw new Error('Invalid response structure from Laravel API');
	} catch (err: any) {
		logError('HRIS_OVERVIEW_API_FAIL', 'Failed to load HRIS dashboard overview from Laravel API', err?.message);
		return {
			metrics: {
				totalEmployees: 0,
				totalAllEmployees: 0,
				activeUsersPresentThisMonth: 0,
				totalClockinsThisMonth: 0,
				onTimePercentage: 0,
				totalOvertimeHours: 0,
				pendingLeaveRequests: 0,
				totalActiveLoans: 0,
				totalLoanAmount: 0
			},
			divisions: [],
			attendanceTrend: [],
			latestPayroll: {
				period_key: '2026-07-01',
				period_label: 'Juli 2026',
				total_slips: 0,
				total_gross: 0,
				total_net: 0,
				avg_net: 0
			},
			anniversaries: [],
			birthdays: [],
			recentActivity: [],
			dataSource: 'api_error'
		};
	}
};
