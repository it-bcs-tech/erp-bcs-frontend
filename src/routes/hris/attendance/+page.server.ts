import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { apiFetch } from '$lib/utils/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const authToken = cookies.get('auth_token');

	// 1. Ambil log presensi harian
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

	// 2. Default mock/database data jika API belum tersedia
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
	const shiftRoster = [
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

	return {
		attendanceLogs,
		metrics,
		shiftRoster
	};
};

