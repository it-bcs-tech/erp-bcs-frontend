import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';

export const load: PageServerLoad = async ({ cookies }) => {
    const authToken = cookies.get('auth_token');

    try {
        const response = await apiFetch<any>(
            '/api/v1/hris/attendance',
            {},
            authToken
        );
        return { 
            attendanceLogs: response.data?.logs || response.data || [], 
            metrics: response.data?.metrics || {
                totalEmployees: 0,
                presentToday: 0,
                lateToday: 0,
                absentToday: 0
            } 
        };
    } catch (error) {
        console.error('Failed to fetch attendance:', error);
        return {
            attendanceLogs: [],
            metrics: {
                totalEmployees: 0,
                presentToday: 0,
                lateToday: 0,
                absentToday: 0
            }
        };
    }
};
