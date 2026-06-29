import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';
import { logError } from '$lib/utils/logger';

export const load: PageServerLoad = async ({ cookies }) => {
    const authToken = cookies.get('auth_token');

    try {
        const response = await apiFetch<any>(
            `/api/v1/hris/lifecycle`,
            {},
            authToken
        );
        
        const json = response;
        return {
            actions: json.data?.actions || [],
            metrics: json.data?.metrics || { activeMutations: 0, activeWarnings: 0, pendingTerminations: 0 },
            dataSource: 'laravel'
        };
    } catch (error: any) {
        logError('LIFECYCLE_API_FAIL', 'Laravel API unreachable or failed', error?.message);
        return {
            actions: [],
            metrics: { activeMutations: 0, activeWarnings: 0, pendingTerminations: 0 },
            dataSource: 'api'
        };
    }
};

export const actions = {
    addAction: async ({ request, cookies }) => {
        const authToken = cookies.get('auth_token');
        const formData = await request.formData();
        
        const type = formData.get('actionType')?.toString();
        const employeeId = formData.get('employeeId')?.toString();
        
        if (!type || !employeeId) {
            return { success: false, message: 'Missing required fields' };
        }
        
        const payload: any = {
            actionType: type,
            employeeId: employeeId,
            reason: formData.get('reason')?.toString()
        };

        if (['Mutation', 'Promotion', 'Demotion'].includes(type)) {
            payload.effectiveDate = formData.get('effectiveDate')?.toString();
            payload.newDept = formData.get('newDept')?.toString();
            payload.newTitle = formData.get('newTitle')?.toString();
            payload.newLoc = formData.get('newLoc')?.toString();
        } else if (type === 'Warning') {
            payload.warningLevel = formData.get('warningLevel')?.toString();
        } else if (type === 'Termination') {
            payload.termType = formData.get('termType')?.toString();
        }

        try {
            await apiFetch<any>(
                `/api/v1/hris/lifecycle`,
                {
                    method: 'POST',
                    body: JSON.stringify(payload)
                },
                authToken
            );
            return { success: true };
        } catch (error: any) {
            console.error('Failed to insert action via API:', error);
            return { success: false, message: error.message || 'API error' };
        }
    }
};
