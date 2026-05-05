import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const authToken = cookies.get('auth_token');

	// ┌─────────────────────────────────────────────────────┐
	// │ KETIKA BACKEND SUDAH AKTIF, uncomment blok ini:     │
	// └─────────────────────────────────────────────────────┘
	// try {
	// 	const response = await apiFetch<any>(
	// 		'/api/v1/hris/dashboard-metrics',
	// 		{},
	// 		authToken
	// 	);
	// 	return { metrics: response.data };
	// } catch (error) {
	// 	console.error('Failed to fetch HRIS metrics:', error);
	// }

	// ┌─────────────────────────────────────────────────────┐
	// │ MOCK DATA — Hapus blok ini setelah backend aktif    │
	// └─────────────────────────────────────────────────────┘
	return {
		metrics: {
			totalEmployees: 142,
			presentToday: 128,
			attendanceCapacity: 90,
			totalLeaveRequests: 12,
			pendingLeaveRequests: 5,
			openPositions: 15,
			highPriorityPositions: 4
		}
	};
};
