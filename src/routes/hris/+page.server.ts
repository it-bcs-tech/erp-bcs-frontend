import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const authToken = cookies.get('auth_token');

	try {
		const response = await apiFetch<any>(
			'/api/v1/hris/dashboard/metrics',
			{},
			authToken
		);
		return { metrics: response.data };
	} catch (error) {
		console.error('Failed to fetch HRIS metrics:', error);
		// Return empty metrics struct to avoid breaking UI on error
		return {
			metrics: {
				totalEmployees: 0,
				presentToday: 0,
				attendanceCapacity: 0,
				totalLeaveRequests: 0,
				pendingLeaveRequests: 0,
				openPositions: 0,
				highPriorityPositions: 0
			}
		};
	}
};
