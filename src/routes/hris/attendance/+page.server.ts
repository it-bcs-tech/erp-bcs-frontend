import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { apiFetch } from '$lib/utils/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const authToken = cookies.get('auth_token');

	// 1. Ambil log presensi harian & metrics
	let attendanceLogs = [];
	let metrics = {
		totalEmployees: 648,
		presentToday: 602,
		lateToday: 24,
		absentToday: 22
	};

	try {
		const response = await apiFetch<any>('/api/v1/hris/attendance', {}, authToken);
		if (response?.data) {
			attendanceLogs = response.data.logs || response.data || [];
			if (response.data.metrics) metrics = response.data.metrics;
		}
	} catch (error) {
		console.warn('Fallback internal attendance query');
	}

	// 2. Default mock/fallback data jika API presensi belum tersedia
	if (!attendanceLogs || attendanceLogs.length === 0) {
		attendanceLogs = [
			{
				id: 'ATT-1001',
				employeeName: 'Ahmad Subagja',
				employeeId: 'EMP-010',
				department: 'Logistik & Driver',
				date: '2026-08-18',
				checkIn: '06:45 WIB',
				checkOut: '15:10 WIB',
				status: 'On Time',
				shift: 'Shift 1 (Pagi)',
				checkInLocation: 'Pool Cilegon Utama',
				checkOutLocation: 'Pool Cilegon Utama',
				avatar: 'https://ui-avatars.com/api/?name=Ahmad+Subagja&background=0284c7&color=fff'
			},
			{
				id: 'ATT-1002',
				employeeName: 'Budi Santoso',
				employeeId: 'EMP-012',
				department: 'Workshop & Mekanik',
				date: '2026-08-18',
				checkIn: '14:50 WIB',
				checkOut: '23:05 WIB',
				status: 'On Time',
				shift: 'Shift 2 (Siang)',
				checkInLocation: 'Workshop Cilegon',
				checkOutLocation: 'Workshop Cilegon',
				avatar: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=10b981&color=fff'
			},
			{
				id: 'ATT-1003',
				employeeName: 'Dedi Kurniawan',
				employeeId: 'EMP-015',
				department: 'OCS Dispatcher',
				date: '2026-08-18',
				checkIn: '23:15 WIB',
				checkOut: '07:05 WIB',
				status: 'Late',
				shift: 'Shift 3 (Malam)',
				checkInLocation: 'Control Room Cilegon',
				checkOutLocation: 'Control Room Cilegon',
				avatar: 'https://ui-avatars.com/api/?name=Dedi+Kurniawan&background=f59e0b&color=fff'
			},
			{
				id: 'ATT-1004',
				employeeName: 'Hendra Gunawan',
				employeeId: 'EMP-022',
				department: 'Operator Pool',
				date: '2026-08-18',
				checkIn: '07:00 WIB',
				checkOut: '15:30 WIB',
				status: 'On Time',
				shift: 'Shift 1 (Pagi)',
				checkInLocation: 'Pool Gunung Putri',
				checkOutLocation: 'Pool Gunung Putri',
				avatar: 'https://ui-avatars.com/api/?name=Hendra+Gunawan&background=8b5cf6&color=fff'
			}
		];
	}

	// 3. Shift Roster Schedules Data (24/7 Logistics & Workshop Matrix)
	let shiftRoster = [
		{
			employeeId: 'EMP-010',
			employeeName: 'Ahmad Subagja',
			department: 'Logistik & Driver',
			pool: 'Pool Cilegon',
			schedule: ['S1', 'S1', 'S1', 'S1', 'S1', 'OFF', 'OFF']
		},
		{
			employeeId: 'EMP-012',
			employeeName: 'Budi Santoso',
			department: 'Workshop & Mekanik',
			pool: 'Workshop Cilegon',
			schedule: ['S2', 'S2', 'S2', 'S2', 'S2', 'OFF', 'OFF']
		},
		{
			employeeId: 'EMP-015',
			employeeName: 'Dedi Kurniawan',
			department: 'OCS Dispatcher',
			pool: 'Control Room',
			schedule: ['S3', 'S3', 'S3', 'S3', 'S3', 'OFF', 'OFF']
		},
		{
			employeeId: 'EMP-022',
			employeeName: 'Hendra Gunawan',
			department: 'Operator Pool',
			pool: 'Pool Gunung Putri',
			schedule: ['S1', 'S1', 'S1', 'S1', 'S1', 'OFF', 'OFF']
		},
		{
			employeeId: 'EMP-028',
			employeeName: 'Fajar Pratama',
			department: 'Workshop & Mekanik',
			pool: 'Workshop Gunung Putri',
			schedule: ['S3', 'S3', 'S3', 'S3', 'OFF', 'OFF', 'S1']
		},
		{
			employeeId: 'EMP-031',
			employeeName: 'Rudi Hartono',
			department: 'Logistik & Driver',
			pool: 'Pool Cilegon',
			schedule: ['S2', 'S2', 'S2', 'S2', 'S2', 'OFF', 'OFF']
		}
	];

	// Coba ambil matriks roster dari API
	try {
		const rosterRes = await apiFetch<any>('/api/v1/hris/attendance/roster', {}, authToken);
		if (rosterRes?.data?.roster && Array.isArray(rosterRes.data.roster)) {
			shiftRoster = rosterRes.data.roster;
		}
	} catch (e: any) {
		// Ignore and use default roster
	}

	// 4. Query Overtime Requests & SPKL
	let overtimeRequests: any[] = [];
	let overtimeSummary = {
		totalRequests: 0,
		approvedRequests: 0,
		pendingRequests: 0,
		totalHours: 0
	};

	// Coba panggil Laravel API terlebih dahulu
	try {
		const otRes = await apiFetch<any>('/api/v1/hris/attendance/overtimes', {}, authToken);
		if (otRes?.data) {
			overtimeRequests = otRes.data.requests || [];
			if (otRes.data.summary) {
				overtimeSummary = {
					totalRequests: otRes.data.summary.totalRequests || 0,
					approvedRequests: otRes.data.summary.approvedRequests || 0,
					pendingRequests: otRes.data.summary.pendingRequests || 0,
					totalHours: (otRes.data.summary.approvedRequests || 0) * 3.5
				};
			}
		}
	} catch (apiErr: any) {
		// Fallback ke PostgreSQL direct query
		try {
			overtimeRequests = await sql`
				SELECT 
					o.id,
					o.user_id,
					TO_CHAR(o.start_date, 'YYYY-MM-DD') as start_date,
					TO_CHAR(o.end_date, 'YYYY-MM-DD') as end_date,
					TO_CHAR(o.start_time, 'HH24:MI') as start_time,
					TO_CHAR(o.end_time, 'HH24:MI') as end_time,
					o.description,
					o.attachment_path,
					o.status,
					COALESCE(u.name, 'Karyawan BCS (ID: ' || o.user_id || ')') as employee_name,
					u.email,
					TO_CHAR(o.created_at, 'YYYY-MM-DD HH24:MI') as created_at
				FROM presensi.overtime_requests o
				LEFT JOIN presensi.users u ON o.user_id = u.id
				ORDER BY o.id DESC
				LIMIT 50
			`;

			const [summary] = await sql`
				SELECT 
					COUNT(*)::int as total_requests,
					COUNT(CASE WHEN status = 'approved' OR status = 'Approved' THEN 1 END)::int as approved_requests,
					COUNT(CASE WHEN status = 'pending' OR status = 'Pending' THEN 1 END)::int as pending_requests
				FROM presensi.overtime_requests
			`;

			if (summary) {
				overtimeSummary = {
					totalRequests: summary.total_requests || 0,
					approvedRequests: summary.approved_requests || 0,
					pendingRequests: summary.pending_requests || 0,
					totalHours: (summary.approved_requests || 0) * 3.5
				};
			}
		} catch (e: any) {
			console.error('Error fetching overtime fallback:', e?.message);
		}
	}

	return {
		attendanceLogs,
		metrics,
		shiftRoster,
		overtimeRequests,
		overtimeSummary
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

		// 1. Coba via Laravel API
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
			// 2. Fallback direct SQL insert
			try {
				await sql`
					INSERT INTO presensi.overtime_requests 
					(user_id, start_date, end_date, start_time, end_time, description, status, created_at, updated_at)
					VALUES 
					(${user_id}, ${start_date}, ${start_date}, ${start_time}::time, ${end_time}::time, ${description}, 'pending', NOW(), NOW())
				`;
				return { success: true };
			} catch (e: any) {
				console.error('Failed to submit overtime request:', e);
				return fail(500, { message: e.message || 'Gagal menyimpan pengajuan lembur.' });
			}
		}
	},

	approveOvertime: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const overtimeId = formData.get('overtimeId')?.toString();
		if (!overtimeId) return fail(400, { message: 'ID lembur tidak ditemukan.' });

		// 1. Coba via Laravel API
		try {
			await apiFetch(`/api/v1/hris/attendance/overtimes/${overtimeId}/approve`, {
				method: 'POST'
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			// 2. Fallback direct SQL update
			try {
				await sql`
					UPDATE presensi.overtime_requests
					SET 
						status = 'approved',
						approved_by = 1,
						approved_at = NOW(),
						updated_at = NOW()
					WHERE id = ${overtimeId}
				`;
				return { success: true };
			} catch (e: any) {
				console.error('Failed to approve overtime:', e);
				return fail(500, { message: e.message || 'Gagal menyetujui lembur.' });
			}
		}
	},

	rejectOvertime: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const overtimeId = formData.get('overtimeId')?.toString();
		const rejection_reason = formData.get('rejection_reason')?.toString() || 'Tidak memenuhi kualifikasi SPKL dinas';

		if (!overtimeId) return fail(400, { message: 'ID lembur tidak ditemukan.' });

		// 1. Coba via Laravel API
		try {
			await apiFetch(`/api/v1/hris/attendance/overtimes/${overtimeId}/reject`, {
				method: 'POST',
				body: JSON.stringify({ rejection_reason })
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			// 2. Fallback direct SQL update
			try {
				await sql`
					UPDATE presensi.overtime_requests
					SET 
						status = 'rejected',
						rejection_reason = ${rejection_reason},
						updated_at = NOW()
					WHERE id = ${overtimeId}
				`;
				return { success: true };
			} catch (e: any) {
				console.error('Failed to reject overtime:', e);
				return fail(500, { message: e.message || 'Gagal menolak lembur.' });
			}
		}
	}
};
