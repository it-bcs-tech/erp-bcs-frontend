import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';
import { logError } from '$lib/utils/logger';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ cookies }) => {
	const authToken = cookies.get('auth_token');

	// Ambil data analitik grafik langsung dari PostgreSQL secara paralel
	const [
		apiRes,
		dbAttendanceRows,
		dbPayrollRows,
		dbStatusRows,
		dbTenureRows
	] = await Promise.all([
		apiFetch<any>('/api/v1/hris/dashboard/overview', {}, authToken).catch((err) => {
			logError('HRIS_OVERVIEW_API_FAIL', 'Failed to load HRIS dashboard overview from Laravel API', err?.message);
			return null;
		}),
		sql<any[]>`
			SELECT 
				TO_CHAR(date, 'Mon') as month,
				DATE_TRUNC('month', date) as m_date,
				COUNT(*) FILTER (WHERE status ILIKE '%tepat%' OR status ILIKE '%hadir%' OR status ILIKE '%present%')::int as on_time,
				COUNT(*) FILTER (WHERE status ILIKE '%terlambat%' OR status ILIKE '%late%')::int as late,
				COUNT(*)::int as total_present
			FROM presensi.presences
			WHERE date >= '2026-04-01'
			GROUP BY 1, 2
			ORDER BY 2 ASC
		`.catch(() => []),
		sql<any[]>`
			SELECT 
				TO_CHAR(period, 'Mon') as month_short,
				TO_CHAR(period, 'FMMonth YYYY') as month_label,
				TO_CHAR(period, 'YYYY-MM-DD') as period_key,
				COUNT(*)::int as total_slips,
				COALESCE(SUM(net_salary), 0)::bigint as total_net,
				COALESCE(SUM(gross_salary), 0)::bigint as total_gross,
				COALESCE(SUM(overtime_allowance), 0)::bigint as total_ot,
				COALESCE(SUM(meal_allowance + transport_allowance), 0)::bigint as total_meal_trans
			FROM presensi.salary_slips
			WHERE period >= '2026-04-01'
			GROUP BY period
			ORDER BY period ASC
		`.catch(() => []),
		sql<any[]>`
			SELECT 
				COALESCE(NULLIF(TRIM(status), ''), 'LAINNYA') as status,
				COUNT(*)::int as count
			FROM master.m_karyawan
			WHERE aktif = 'Y'
			GROUP BY 1
			ORDER BY count DESC
		`.catch(() => []),
		sql<any[]>`
			SELECT 
				CASE 
					WHEN tgl_masuk IS NULL THEN 'Belum Tercatat'
					WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, tgl_masuk)) < 1 THEN '< 1 Tahun'
					WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, tgl_masuk)) BETWEEN 1 AND 3 THEN '1 - 3 Tahun'
					WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, tgl_masuk)) BETWEEN 4 AND 7 THEN '4 - 7 Tahun'
					WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, tgl_masuk)) BETWEEN 8 AND 15 THEN '8 - 15 Tahun'
					ELSE '> 15 Tahun'
				END as label,
				CASE 
					WHEN tgl_masuk IS NULL THEN 6
					WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, tgl_masuk)) < 1 THEN 1
					WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, tgl_masuk)) BETWEEN 1 AND 3 THEN 2
					WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, tgl_masuk)) BETWEEN 4 AND 7 THEN 3
					WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, tgl_masuk)) BETWEEN 8 AND 15 THEN 4
					ELSE 5
				END as sort_order,
				COUNT(*)::int as count
			FROM master.m_karyawan
			WHERE aktif = 'Y'
			GROUP BY 1, 2
			ORDER BY sort_order ASC
		`.catch(() => [])
	]);

	// 1. Olah Tren Kehadiran Bulanan (dengan persentase tinggi bar proporsional)
	const rawAttendance =
		dbAttendanceRows.length > 0
			? dbAttendanceRows.map((r) => ({
					month: r.month,
					onTime: Number(r.on_time) || 0,
					late: Number(r.late) || 0,
					totalPresent: Number(r.total_present) || 0
				}))
			: (apiRes?.data?.attendanceTrend || []).map((r: any) => ({
					month: r.month,
					onTime: Number(r.onTime) || 0,
					late: Number(r.late) || 0,
					totalPresent: Number(r.totalPresent) || 0
				}));

	const maxAttVal = Math.max(
		...rawAttendance.map((r: any) => Math.max(r.onTime, r.late)),
		1
	);
	const attendanceTrend = rawAttendance.map((r: any) => ({
		...r,
		onTimePct: Math.max(Math.round((r.onTime / maxAttVal) * 100), r.onTime > 0 ? 8 : 2),
		latePct: Math.max(Math.round((r.late / maxAttVal) * 100), r.late > 0 ? 8 : 2),
		onTimeRatio: r.totalPresent > 0 ? Math.round((r.onTime / r.totalPresent) * 100) : 0
	}));

	// 2. Olah Tren Biaya Payroll & Komponen Variabel (Lembur + Makan & Transport)
	const rawPayroll = dbPayrollRows.map((r) => {
		const totalNet = Number(r.total_net) || 0;
		const totalGross = Number(r.total_gross) || 0;
		const totalOt = Number(r.total_ot) || 0;
		const totalMealTrans = Number(r.total_meal_trans) || 0;
		const totalVariable = totalOt + totalMealTrans;
		return {
			month: r.month_short,
			month_label: r.month_label,
			period_key: r.period_key,
			total_slips: Number(r.total_slips) || 0,
			total_net: totalNet,
			total_gross: totalGross,
			total_ot: totalOt,
			total_meal_trans: totalMealTrans,
			total_variable: totalVariable
		};
	});

	const maxPayrollNet = Math.max(...rawPayroll.map((p) => p.total_net), 1);
	const maxPayrollVar = Math.max(...rawPayroll.map((p) => p.total_variable), 1);
	const payrollTrend = rawPayroll.map((p) => ({
		...p,
		netPct: Math.max(Math.round((p.total_net / maxPayrollNet) * 100), p.total_net > 0 ? 12 : 2),
		varPct: Math.max(Math.round((p.total_variable / maxPayrollVar) * 100), p.total_variable > 0 ? 10 : 2)
	}));

	// 3. Olah Distribusi Status Kepegawaian & Masa Kerja (Tenure)
	const totalActiveFromStatus = dbStatusRows.reduce((acc, r) => acc + (Number(r.count) || 0), 0) || 1;
	const employmentStatus = dbStatusRows.map((r) => {
		const count = Number(r.count) || 0;
		return {
			status: r.status,
			count,
			percentage: Math.round((count / totalActiveFromStatus) * 1000) / 10
		};
	});

	const totalActiveFromTenure = dbTenureRows.reduce((acc, r) => acc + (Number(r.count) || 0), 0) || 1;
	const tenureDistribution = dbTenureRows.map((r) => {
		const count = Number(r.count) || 0;
		return {
			label: r.label,
			count,
			percentage: Math.round((count / totalActiveFromTenure) * 1000) / 10
		};
	});

	// Sinkronkan kartu KPI Payroll Terkini dengan periode terbaru di database
	const latestDbPayroll = rawPayroll.length > 0 ? rawPayroll[rawPayroll.length - 1] : null;
	const latestPayroll = latestDbPayroll
		? {
				period_key: latestDbPayroll.period_key,
				period_label: latestDbPayroll.month_label,
				total_slips: latestDbPayroll.total_slips,
				total_gross: latestDbPayroll.total_gross,
				total_net: latestDbPayroll.total_net,
				avg_net:
					latestDbPayroll.total_slips > 0
						? Math.round(latestDbPayroll.total_net / latestDbPayroll.total_slips)
						: 0
			}
		: apiRes?.data?.latestPayroll || {
				period_key: '2026-08-01',
				period_label: 'August 2026',
				total_slips: 0,
				total_gross: 0,
				total_net: 0,
				avg_net: 0
			};

	return {
		metrics: apiRes?.data?.metrics || {
			totalEmployees: totalActiveFromStatus > 1 ? totalActiveFromStatus : 634,
			totalAllEmployees: totalActiveFromStatus > 1 ? totalActiveFromStatus : 634,
			activeUsersPresentThisMonth: 0,
			totalClockinsThisMonth: 0,
			onTimePercentage: 0,
			totalOvertimeHours: 0,
			pendingLeaveRequests: 0,
			totalActiveLoans: 0,
			totalLoanAmount: 0
		},
		divisions: apiRes?.data?.divisions || [],
		attendanceTrend,
		payrollTrend,
		employmentStatus,
		tenureDistribution,
		latestPayroll,
		anniversaries: apiRes?.data?.anniversaries || [],
		birthdays: apiRes?.data?.birthdays || [],
		recentActivity: apiRes?.data?.recentActivity || [],
		dataSource: apiRes?.data ? 'postgres_and_laravel' : 'postgres_fallback'
	};
};
