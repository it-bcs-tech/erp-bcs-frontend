import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';
import { logError } from '$lib/utils/logger';

export const load: PageServerLoad = async ({ cookies }) => {
    const authToken = cookies.get('auth_token');

    try {
        const response = await apiFetch<any>(
            `/api/v1/hris/performance`,
            {},
            authToken
        );

        const json = response;
        return {
            kpiRecords: json.data?.kpiRecords || [],
            trainingPrograms: json.data?.trainingPrograms || [],
            metrics: json.data?.metrics || { avgKpiScore: 0, totalEvaluated: 0, upcomingTrainings: 0 },
            dataSource: 'laravel'
        };
    } catch (error: any) {
        logError('PERF_API_FAIL', 'Laravel API unreachable or failed', error?.message);
        return {
            kpiRecords: [],
            trainingPrograms: [],
            metrics: { avgKpiScore: 0, totalEvaluated: 0, upcomingTrainings: 0 },
            dataSource: 'laravel'
        };
    }
};

export const actions = {
    addKpi: async ({ request, cookies }) => {
        const authToken = cookies.get('auth_token');
        const formData = await request.formData();
        
        const payload = {
            kpiType: formData.get('kpiType')?.toString(),
            targetId: formData.get('targetId')?.toString(),
            activePeriod: formData.get('activePeriod')?.toString(),
            score: parseFloat(formData.get('score')?.toString() || '0'),
            remarks: formData.get('remarks')?.toString()
        };

        if (!payload.kpiType || !payload.targetId || !payload.activePeriod) {
            return { success: false, message: 'Missing required fields' };
        }

        try {
            await apiFetch<any>(
                `/api/v1/hris/performance/kpi`,
                {
                    method: 'POST',
                    body: JSON.stringify(payload)
                },
                authToken
            );
            return { success: true };
        } catch (error: any) {
            console.error('Failed to insert KPI via API:', error);
            return { success: false, message: error.message || 'API error' };
        }
    },

    addTraining: async ({ request, cookies }) => {
        const authToken = cookies.get('auth_token');
        const formData = await request.formData();
        
        const payload = {
            title: formData.get('title')?.toString(),
            category: formData.get('category')?.toString(),
            startDate: formData.get('startDate')?.toString(),
            endDate: formData.get('endDate')?.toString(),
            trainer: formData.get('trainer')?.toString()
        };

        if (!payload.title || !payload.startDate) {
            return { success: false, message: 'Missing required fields' };
        }

        try {
            await apiFetch<any>(
                `/api/v1/hris/performance/training`,
                {
                    method: 'POST',
                    body: JSON.stringify(payload)
                },
                authToken
            );
            return { success: true };
        } catch (error: any) {
            console.error('Failed to insert training via API:', error);
            return { success: false, message: error.message || 'API error' };
        }
    }
};
