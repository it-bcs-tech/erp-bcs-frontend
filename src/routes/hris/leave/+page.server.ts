import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
    const authToken = cookies.get('auth_token');

    const page = Number(url.searchParams.get('page')) || 1;
    const perPage = 5;
    const searchQuery = url.searchParams.get('search') || '';
    const statusFilter = url.searchParams.get('status') || '';

    try {
        const apiParams = new URLSearchParams();
        apiParams.set('page', page.toString());
        apiParams.set('per_page', perPage.toString());
        if (searchQuery) apiParams.set('search', searchQuery);
        if (statusFilter) apiParams.set('status', statusFilter);

        const response = await apiFetch<any>(
            `/api/v1/hris/leaves?${apiParams.toString()}`,
            {},
            authToken
        );
        
        let leaveRequests = response.data?.requests || response.data || [];
        const rawMetrics = response.data?.metrics || {};
        const metrics = {
            pendingApprovals: rawMetrics.pendingApprovals ?? rawMetrics.pending_approvals ?? rawMetrics.pending ?? 0,
            approvedThisMonth: rawMetrics.approvedThisMonth ?? rawMetrics.approved_this_month ?? rawMetrics.approved ?? 0,
            rejectedThisMonth: rawMetrics.rejectedThisMonth ?? rawMetrics.rejected_this_month ?? rawMetrics.rejected ?? 0,
            employeesOnLeaveToday: rawMetrics.employeesOnLeaveToday ?? rawMetrics.employees_on_leave_today ?? rawMetrics.employees_on_leave ?? 0
        };
        let meta = response.meta;

        // Fallback filtering & pagination
        if (!meta || typeof meta.total === 'undefined') {
            if (Array.isArray(leaveRequests)) {
                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    leaveRequests = leaveRequests.filter((r: any) => 
                        (r.employeeName?.toLowerCase() || '').includes(q) || 
                        (r.employeeId?.toLowerCase() || '').includes(q)
                    );
                }

                if (statusFilter && statusFilter !== 'All') {
                    leaveRequests = leaveRequests.filter((r: any) => r.status === statusFilter);
                }

                const total = leaveRequests.length;
                const startIndex = (page - 1) * perPage;
                leaveRequests = leaveRequests.slice(startIndex, startIndex + perPage);
                meta = {
                    current_page: page,
                    total: total,
                    per_page: perPage
                };
            } else {
                leaveRequests = [];
                meta = { current_page: page, total: 0, per_page: perPage };
            }
        }

        return { leaveRequests, metrics, meta };
    } catch (error) {
        console.error('Failed to fetch leaves:', error);
        return {
            leaveRequests: [],
            metrics: {
                pendingApprovals: 0,
                approvedThisMonth: 0,
                rejectedThisMonth: 0,
                employeesOnLeaveToday: 0
            },
            meta: { current_page: page, total: 0, per_page: perPage }
        };
    }
};
