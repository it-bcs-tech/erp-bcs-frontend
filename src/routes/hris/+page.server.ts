import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ cookies }) => {
	const authToken = cookies.get('auth_token');

	try {
		// Fetch high level metrics from existing API
		const metricsResponse = await apiFetch<any>(
			'/api/v1/hris/dashboard/metrics',
			{},
			authToken
		).catch(() => ({
			data: {
				totalEmployees: 0,
				presentToday: 0,
				attendanceCapacity: 0,
				totalLeaveRequests: 0,
				pendingLeaveRequests: 0,
				openPositions: 0,
				highPriorityPositions: 0
			}
		}));

		// 1. Anniversaries (This month)
		const anniversaries = await sql`
			SELECT 
				nama_karyawan as name, 
				tgl_masuk as join_date,
				(EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM tgl_masuk)) as years
			FROM master.m_karyawan
			WHERE aktif = 'Y' 
			  AND tgl_masuk IS NOT NULL
			  AND EXTRACT(MONTH FROM tgl_masuk) = EXTRACT(MONTH FROM CURRENT_DATE)
			ORDER BY EXTRACT(DAY FROM tgl_masuk) ASC
			LIMIT 3
		`;

		// 2. Upcoming Birthdays (This month)
		const birthdays = await sql`
			SELECT 
				nama_karyawan as name, 
				tgl_lahir as birth_date,
				dept_id as department
			FROM master.m_karyawan
			WHERE aktif = 'Y'
			  AND tgl_lahir IS NOT NULL
			  AND EXTRACT(MONTH FROM tgl_lahir) = EXTRACT(MONTH FROM CURRENT_DATE)
			  AND EXTRACT(DAY FROM tgl_lahir) >= EXTRACT(DAY FROM CURRENT_DATE)
			ORDER BY EXTRACT(DAY FROM tgl_lahir) ASC
			LIMIT 3
		`;

		// 3. Monthly Attendance Trend (Current Year)
		const attendanceTrend = await sql`
			SELECT 
				TO_CHAR(date, 'Mon') as month,
				EXTRACT(MONTH FROM date) as month_num,
				COUNT(*) FILTER (WHERE status ILIKE '%Terlambat%' OR status ILIKE '%late%') as remote_count,
				COUNT(*) FILTER (WHERE status ILIKE '%Tepat Waktu%' OR status ILIKE '%present%') as onsite_count,
				COUNT(*) as total
			FROM presensi.presences
			WHERE EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
			GROUP BY 1, 2
			ORDER BY 2 ASC
		`;

		// Format trend data for UI
		const trendData = attendanceTrend.map((t: any) => {
			const total = Number(t.total) || 1;
			// We map 'remote' to Late and 'onsite' to On-Time as a proxy since real WFH isn't tracked
			return {
				month: t.month,
				remote: Math.round((Number(t.remote_count) / total) * 100) + '%',
				onsite: Math.round((Number(t.onsite_count) / total) * 100) + '%'
			};
		});

		// 4. Recent Activity (from activity_log or leaves)
		const recentActivity = await sql`
			SELECT 
				'Leave Request' as log_name,
				u.name || ' requested ' || l.type || ' leave' as description,
				l.created_at,
				'leave' as event
			FROM presensi.leaves l
			JOIN presensi.users u ON u.id = l.user_id
			UNION ALL
			SELECT 
				'Attendance' as log_name,
				u.name || ' checked ' || CASE WHEN p.clock_out IS NOT NULL THEN 'out' ELSE 'in' END as description,
				p.created_at,
				'presence' as event
			FROM presensi.presences p
			JOIN presensi.users u ON u.id = p.user_id
			ORDER BY created_at DESC
			LIMIT 4
		`;

		return { 
			metrics: metricsResponse.data,
			anniversaries,
			birthdays,
			attendanceTrend: trendData.length > 0 ? trendData : [
				{ month: 'Jan', remote: '0%', onsite: '0%' } // fallback
			],
			recentActivity
		};
	} catch (error) {
		console.error('Failed to fetch HRIS metrics:', error);
		return {
			metrics: {
				totalEmployees: 0,
				presentToday: 0,
				attendanceCapacity: 0,
				totalLeaveRequests: 0,
				pendingLeaveRequests: 0,
				openPositions: 0,
				highPriorityPositions: 0
			},
			anniversaries: [],
			birthdays: [],
			attendanceTrend: [{ month: 'Jan', remote: '0%', onsite: '0%' }],
			recentActivity: []
		};
	}
};
