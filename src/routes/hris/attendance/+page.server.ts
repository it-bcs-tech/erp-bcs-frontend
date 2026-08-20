import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { apiFetch } from '$lib/utils/api';

function resolveLocationName(rawLocation?: string): string {
	if (!rawLocation) return 'Pool Cilegon';
	if (rawLocation.includes(',')) {
		const [latStr, lngStr] = rawLocation.split(',').map((s) => s.trim());
		const lat = parseFloat(latStr);
		const lng = parseFloat(lngStr);
		if (lat <= -5.8 && lat >= -6.1 && lng >= 105.8 && lng <= 106.3) {
			return 'Pool Cilegon';
		}
		if (lat <= -6.3 && lat >= -6.6 && lng >= 106.7 && lng <= 107.1) {
			return 'Pool Gunung Putri';
		}
		if (!isNaN(lat) && !isNaN(lng)) {
			return 'Area Operasional (GPS)';
		}
	}
	if (rawLocation === 'Kantor') return 'Pool Cilegon';
	return rawLocation;
}

export const load: PageServerLoad = async ({ cookies, url }) => {
	const authToken = cookies.get('auth_token');
	const dateParam = url.searchParams.get('date') || '';
	const poolParam = url.searchParams.get('pool') || 'All';
	const statusParam = url.searchParams.get('status') || '';
	const searchParam = url.searchParams.get('search') || '';
	const pageParam = url.searchParams.get('page') || '1';

	// 1. Ambil data presensi riil 100% dari tabel presensi.presences di PostgreSQL via Laravel API
	let attendanceLogs: any[] = [];
	let metrics = {
		totalEmployees: 648,
		presentToday: 0,
		lateToday: 0,
		absentToday: 0
	};
	let paginationMeta = {
		current_page: 1,
		total: 0,
		per_page: 50
	};
	let shiftRoster: any[] = [];
	let overtimeRequests: any[] = [];
	let overtimeSummary = {
		totalRequests: 0,
		approvedRequests: 0,
		pendingRequests: 0,
		totalHours: 0
	};

	try {
		const attendanceQueryParams = new URLSearchParams();
		attendanceQueryParams.set('limit', '50');
		attendanceQueryParams.set('page', pageParam);
		if (dateParam) attendanceQueryParams.set('date', dateParam);
		if (statusParam && statusParam !== 'All') attendanceQueryParams.set('status', statusParam);
		if (searchParam) attendanceQueryParams.set('search', searchParam);

		const overtimeQueryParams = new URLSearchParams();
		overtimeQueryParams.set('per_page', '100');
		if (searchParam) overtimeQueryParams.set('search', searchParam);

		const [attendanceRes, overtimeRes, rosterRes] = await Promise.all([
			apiFetch<any>(`/api/v1/hris/attendance?${attendanceQueryParams.toString()}`, {}, authToken).catch((err) => {
				console.error('❌ [Attendance API Error]:', err?.message);
				return { data: null };
			}),
			apiFetch<any>(`/api/v1/hris/attendance/overtimes?${overtimeQueryParams.toString()}`, {}, authToken).catch((err) => {
				console.error('❌ [Overtime API Error]:', err?.message);
				return { data: null };
			}),
			apiFetch<any>('/api/v1/hris/attendance/roster', {}, authToken).catch((err) => {
				console.error('❌ [Roster API Error]:', err?.message);
				return { data: null };
			})
		]);

		// Parse attendance logs & metrics murni dari database PostgreSQL
		if (attendanceRes?.data) {
			const rawLogs = attendanceRes.data.logs || attendanceRes.data || [];
			attendanceLogs = rawLogs.map((log: any) => {
				const inLoc = resolveLocationName(log.checkInLocation);
				const outLoc = log.checkOutLocation ? resolveLocationName(log.checkOutLocation) : inLoc;
				return {
					...log,
					checkInLocation: inLoc,
					checkOutLocation: outLoc
				};
			});

			if (attendanceRes.data.metrics) {
				metrics = attendanceRes.data.metrics;
			}

			if ((attendanceRes as any).meta) {
				paginationMeta = (attendanceRes as any).meta;
			}
		}

		// Parse overtime SPKL
		if (overtimeRes?.data) {
			overtimeRequests = overtimeRes.data.requests || [];
			if (overtimeRes.data.summary) {
				overtimeSummary = {
					totalRequests: overtimeRes.data.summary.totalRequests || 0,
					approvedRequests: overtimeRes.data.summary.approvedRequests || 0,
					pendingRequests: overtimeRes.data.summary.pendingRequests || 0,
					totalHours: overtimeRes.data.summary.totalHours || 0
				};
			}
		}

		// Parse shift roster
		if (rosterRes?.data?.roster) {
			const rosterData = rosterRes.data.roster;
			shiftRoster = Array.isArray(rosterData) ? rosterData : Object.values(rosterData);
		} else if (rosterRes?.data && Array.isArray(rosterRes.data)) {
			shiftRoster = rosterRes.data;
		} else if (rosterRes?.data && typeof rosterRes.data === 'object') {
			shiftRoster = Object.values(rosterRes.data);
		}
	} catch (error: any) {
		console.error('❌ [HRD Attendance API] Error loading data:', error?.message);
	}

	return {
		dateParam,
		poolParam,
		statusParam,
		searchParam,
		pageParam,
		attendanceLogs,
		metrics,
		paginationMeta,
		shiftRoster,
		overtimeRequests,
		overtimeSummary,
		dataSource: 'laravel'
	};
};

export const actions: Actions = {
	submitOvertime: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const user_id = parseInt(formData.get('user_id')?.toString() || '122');
		const start_date = formData.get('start_date')?.toString() || new Date().toISOString().split('T')[0];
		const start_time = formData.get('start_time')?.toString() || '17:00';
		const end_time = formData.get('end_time')?.toString() || '21:00';
		const description = formData.get('description')?.toString() || '';

		try {
			await apiFetch('/api/v1/hris/attendance/overtimes', {
				method: 'POST',
				body: JSON.stringify({
					user_id,
					start_date,
					end_date: start_date,
					start_time,
					end_time,
					description
				})
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.error('❌ [Submit Overtime API] Error:', apiErr?.message);
			return fail(500, { message: apiErr.message || 'Gagal menyimpan pengajuan lembur.' });
		}
	},

	approveOvertime: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const overtimeId = formData.get('overtimeId')?.toString();
		if (!overtimeId) return fail(400, { message: 'ID lembur tidak ditemukan.' });

		try {
			await apiFetch(`/api/v1/hris/attendance/overtimes/${overtimeId}/approve`, {
				method: 'POST'
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.error('❌ [Approve Overtime API] Error:', apiErr?.message);
			return fail(500, { message: apiErr.message || 'Gagal menyetujui lembur.' });
		}
	},

	rejectOvertime: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const overtimeId = formData.get('overtimeId')?.toString();
		const rejection_reason = formData.get('rejection_reason')?.toString() || 'Tidak memenuhi kualifikasi SPKL dinas';

		if (!overtimeId) return fail(400, { message: 'ID lembur tidak ditemukan.' });

		try {
			await apiFetch(`/api/v1/hris/attendance/overtimes/${overtimeId}/reject`, {
				method: 'POST',
				body: JSON.stringify({ rejection_reason })
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.error('❌ [Reject Overtime API] Error:', apiErr?.message);
			return fail(500, { message: apiErr.message || 'Gagal menolak lembur.' });
		}
	}
};
