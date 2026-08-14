import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	const selectedPeriod = url.searchParams.get('period') || '2026-07-01';
	const searchQuery = url.searchParams.get('search') || '';
	const divisionFilter = url.searchParams.get('division') || '';

	try {
		// 1. Ambil daftar semua periode payroll yang tersedia untuk dropdown selector
		const periods = await sql`
			SELECT 
				TO_CHAR(period, 'YYYY-MM-DD') as period_key,
				TO_CHAR(period, 'FMMonth YYYY') as period_label,
				COUNT(*)::int as total_employees,
				COALESCE(SUM(gross_salary), 0)::float as total_gross,
				COALESCE(SUM(total_deductions), 0)::float as total_deductions,
				COALESCE(SUM(net_salary), 0)::float as total_net
			FROM presensi.salary_slips
			GROUP BY period
			ORDER BY period DESC
		`;

		// 2. Ambil daftar divisi unik untuk filter
		const divisions = await sql`
			SELECT DISTINCT employee_division 
			FROM presensi.salary_slips 
			WHERE employee_division IS NOT NULL AND employee_division != ''
			ORDER BY employee_division ASC
		`;

		// 3. Ringkasan statistik untuk periode yang dipilih
		const [summary] = await sql`
			SELECT 
				COUNT(*)::int as total_count,
				COALESCE(SUM(basic_salary), 0)::float as sum_basic,
				COALESCE(SUM(gross_salary), 0)::float as sum_gross,
				COALESCE(SUM(total_deductions), 0)::float as sum_deductions,
				COALESCE(SUM(net_salary), 0)::float as sum_net,
				COALESCE(AVG(net_salary), 0)::float as avg_net,
				COALESCE(SUM(bpjs), 0)::float as sum_bpjs,
				COALESCE(SUM(tax), 0)::float as sum_tax,
				COALESCE(SUM(absence_deduction), 0)::float as sum_absence_deduction
			FROM presensi.salary_slips
			WHERE TO_CHAR(period, 'YYYY-MM-DD') = ${selectedPeriod}
		`;

		// 4. Query daftar slip gaji karyawan sesuai filter
		let filterCondition = sql`WHERE TO_CHAR(s.period, 'YYYY-MM-DD') = ${selectedPeriod}`;

		if (searchQuery) {
			const searchPattern = `%${searchQuery}%`;
			filterCondition = sql`${filterCondition} AND (s.employee_name ILIKE ${searchPattern} OR s.employee_nik ILIKE ${searchPattern} OR s.employee_position ILIKE ${searchPattern})`;
		}

		if (divisionFilter) {
			filterCondition = sql`${filterCondition} AND s.employee_division = ${divisionFilter}`;
		}

		const salarySlips = await sql`
			SELECT 
				s.id,
				s.employee_nik,
				s.employee_name,
				s.employee_position,
				s.employee_division,
				s.bank_name,
				s.account_number,
				s.basic_salary::float,
				s.position_allowance::float,
				s.meal_allowance::float,
				s.transport_allowance::float,
				s.overtime_allowance::float,
				s.other_allowance::float,
				s.gross_salary::float,
				s.tax::float,
				s.bpjs::float,
				s.absence_deduction::float,
				s.other_deduction::float,
				s.total_deductions::float,
				s.net_salary::float,
				TO_CHAR(s.period, 'YYYY-MM-DD') as period_date
			FROM presensi.salary_slips s
			${filterCondition}
			ORDER BY s.employee_name ASC
			LIMIT 100
		`;

		return {
			selectedPeriod,
			searchQuery,
			divisionFilter,
			periods,
			divisions: divisions.map(d => d.employee_division),
			summary: summary || {
				total_count: 0,
				sum_basic: 0,
				sum_gross: 0,
				sum_deductions: 0,
				sum_net: 0,
				avg_net: 0,
				sum_bpjs: 0,
				sum_tax: 0,
				sum_absence_deduction: 0
			},
			salarySlips
		};
	} catch (err: any) {
		console.error('❌ [HRD Payroll] Error loading salary slips:', err?.message);
		return {
			selectedPeriod,
			searchQuery: '',
			divisionFilter: '',
			periods: [],
			divisions: [],
			summary: {
				total_count: 0,
				sum_basic: 0,
				sum_gross: 0,
				sum_deductions: 0,
				sum_net: 0,
				avg_net: 0,
				sum_bpjs: 0,
				sum_tax: 0,
				sum_absence_deduction: 0
			},
			salarySlips: []
		};
	}
};
