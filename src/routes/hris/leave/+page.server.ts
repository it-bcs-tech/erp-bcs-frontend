import type { PageServerLoad, Actions } from './$types';
import { apiFetch } from '$lib/utils/api';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, url }) => {
    const authToken = cookies.get('auth_token');

    const page = Number(url.searchParams.get('page')) || 1;
    const perPage = 10;
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
                    leaveRequests = leaveRequests.filter((r: any) => r.status?.toLowerCase() === statusFilter.toLowerCase());
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

export const actions: Actions = {
    approveLeave: async ({ request, cookies }) => {
        const authToken = cookies.get('auth_token');
        const formData = await request.formData();
        const leaveId = formData.get('leaveId')?.toString();

        if (!leaveId) return fail(400, { message: 'ID pengajuan cuti tidak ditemukan.' });

        const targetId = leaveId.includes('-') ? leaveId.split('-').pop() : leaveId;

        try {
            await apiFetch(`/api/v1/hris/leaves/${targetId}/approve`, {
                method: 'POST'
            }, authToken);

            return { success: true, message: `Pengajuan cuti ${leaveId} berhasil disetujui.` };
        } catch (apiErr: any) {
            console.error('❌ [Approve Leave Action Error]:', apiErr?.message);
            return fail(500, { message: apiErr.message || 'Gagal menyetujui pengajuan cuti.' });
        }
    },

    rejectLeave: async ({ request, cookies }) => {
        const authToken = cookies.get('auth_token');
        const formData = await request.formData();
        const leaveId = formData.get('leaveId')?.toString();
        const rejection_reason = formData.get('rejection_reason')?.toString() || 'Pengajuan cuti tidak disetujui atasan/HRD';

        if (!leaveId) return fail(400, { message: 'ID pengajuan cuti tidak ditemukan.' });

        const targetId = leaveId.includes('-') ? leaveId.split('-').pop() : leaveId;

        try {
            await apiFetch(`/api/v1/hris/leaves/${targetId}/reject`, {
                method: 'POST',
                body: JSON.stringify({ rejection_reason })
            }, authToken);

            return { success: true, message: `Pengajuan cuti ${leaveId} berhasil ditolak.` };
        } catch (apiErr: any) {
            console.error('❌ [Reject Leave Action Error]:', apiErr?.message);
            return fail(500, { message: apiErr.message || 'Gagal menolak pengajuan cuti.' });
        }
    }
};
