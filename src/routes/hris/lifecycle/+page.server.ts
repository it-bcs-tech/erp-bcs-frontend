import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';

export const load: PageServerLoad = async ({ cookies }) => {
    const authToken = cookies.get('auth_token');

    try {
        const response = await apiFetch<any>(
            '/api/v1/hris/lifecycle',
            {},
            authToken
        );
        return { 
            actions: response.data?.actions || response.data || [], 
            metrics: response.data?.metrics || {
                activeMutations: 0,
                activeWarnings: 0,
                pendingTerminations: 0
            }
        };
    } catch (error) {
        console.error('Failed to fetch lifecycle actions:', error);
        return {
            actions: [],
            metrics: {
                activeMutations: 0,
                activeWarnings: 0,
                pendingTerminations: 0
            }
        };
    }
};
