import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';

export const load: PageServerLoad = async ({ cookies }) => {
    const authToken = cookies.get('auth_token');

    try {
        const response = await apiFetch<any>(
            '/api/v1/hris/performance',
            {},
            authToken
        );
        return { 
            kpiRecords: response.data?.kpiRecords || [], 
            trainingPrograms: response.data?.trainingPrograms || [],
            metrics: response.data?.metrics || {
                avgKpiScore: 0,
                totalEvaluated: 0,
                upcomingTrainings: 0
            }
        };
    } catch (error) {
        console.error('Failed to fetch performance & training data:', error);
        return {
            kpiRecords: [],
            trainingPrograms: [],
            metrics: {
                avgKpiScore: 0,
                totalEvaluated: 0,
                upcomingTrainings: 0
            }
        };
    }
};
