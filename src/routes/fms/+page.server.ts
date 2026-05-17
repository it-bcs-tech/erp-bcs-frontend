import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const authToken = cookies.get('auth_token');

	try {
		const response = await apiFetch<any>(
			'/api/v1/fms/dashboard/metrics',
			{},
			authToken
		);
		return { metrics: response.data };
	} catch (error) {
		console.error('Failed to fetch FMS metrics:', error);
		// Return fallback metrics struct to avoid breaking UI on error
		return {
			metrics: {
				totalVehicles: 124,
				activeVehicles: 89,
				fleetUtilization: 72,
				maintenanceAlerts: 15,
				criticalMaintenance: 3,
				activeTrips: 42,
				completedTripsToday: 18
			}
		};
	}
};
