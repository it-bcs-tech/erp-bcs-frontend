import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

// Helper: Kalkulasi Tarif Efektif Rata-Rata (TER) PPh 21 Bulanan (PP 58/2023)
function calculatePPh21TER(grossSalary: number, ptkpStatus: string = 'TK/0'): { terCategory: string; terRate: number; taxAmount: number } {
	// Tentukan Kategori TER
	let terCategory = 'A';
	const status = ptkpStatus.toUpperCase().trim();
	if (['TK/0', 'TK/1', 'K/0'].includes(status)) {
		terCategory = 'A';
	} else if (['TK/2', 'TK/3', 'K/1', 'K/2'].includes(status)) {
		terCategory = 'B';
	} else if (status === 'K/3') {
		terCategory = 'C';
	}

	let rate = 0;
	if (terCategory === 'A') {
		if (grossSalary <= 5400000) rate = 0;
		else if (grossSalary <= 5650000) rate = 0.0025;
		else if (grossSalary <= 5950000) rate = 0.005;
		else if (grossSalary <= 6300000) rate = 0.0075;
		else if (grossSalary <= 6750000) rate = 0.01;
		else if (grossSalary <= 7500000) rate = 0.0125;
		else if (grossSalary <= 8550000) rate = 0.015;
		else if (grossSalary <= 9650000) rate = 0.0175;
		else if (grossSalary <= 10050000) rate = 0.02;
		else if (grossSalary <= 10350000) rate = 0.0225;
		else if (grossSalary <= 10700000) rate = 0.025;
		else if (grossSalary <= 11050000) rate = 0.03;
		else if (grossSalary <= 11600000) rate = 0.035;
		else if (grossSalary <= 12500000) rate = 0.04;
		else if (grossSalary <= 13750000) rate = 0.05;
		else rate = 0.06;
	} else if (terCategory === 'B') {
		if (grossSalary <= 6200000) rate = 0;
		else if (grossSalary <= 6500000) rate = 0.0025;
		else if (grossSalary <= 6850000) rate = 0.005;
		else if (grossSalary <= 7300000) rate = 0.0075;
		else if (grossSalary <= 9200000) rate = 0.01;
		else if (grossSalary <= 10750000) rate = 0.015;
		else if (grossSalary <= 11250000) rate = 0.02;
		else if (grossSalary <= 12300000) rate = 0.03;
		else if (grossSalary <= 13350000) rate = 0.04;
		else rate = 0.05;
	} else {
		// Kategori C
		if (grossSalary <= 6600000) rate = 0;
		else if (grossSalary <= 6950000) rate = 0.0025;
		else if (grossSalary <= 7350000) rate = 0.005;
		else if (grossSalary <= 7800000) rate = 0.0075;
		else if (grossSalary <= 9550000) rate = 0.01;
		else if (grossSalary <= 11150000) rate = 0.015;
		else if (grossSalary <= 12300000) rate = 0.02;
		else if (grossSalary <= 13450000) rate = 0.03;
		else rate = 0.04;
	}

	return {
		terCategory,
		terRate: Number((rate * 100).toFixed(2)),
		taxAmount: Math.round(grossSalary * rate)
	};
}

// Helper: Kalkulasi Rincian BPJS Ketenagakerjaan & BPJS Kesehatan
function calculateBPJSBreakdown(basicSalary: number) {
	const jkkRate = 0.0127; // 1.27% (Tingkat Risiko Sedang-Tinggi Transportasi)
	const jkmRate = 0.003;  // 0.30%
	const jhtEmpRate = 0.02; // 2% Karyawan
	const jhtCompRate = 0.037; // 3.7% Perusahaan
	const jpCap = Math.min(basicSalary, 10042300);
	const jpEmpRate = 0.01; // 1% Karyawan
	const jpCompRate = 0.02; // 2% Perusahaan

	const bpjsKesCap = Math.min(basicSalary, 12000000);
	const bpjsKesEmpRate = 0.01; // 1% Karyawan
	const bpjsKesCompRate = 0.04; // 4% Perusahaan

	const bpjs_tk_jkk_company = Math.round(basicSalary * jkkRate);
	const bpjs_tk_jkm_company = Math.round(basicSalary * jkmRate);
	const bpjs_tk_jht_company = Math.round(basicSalary * jhtCompRate);
	const bpjs_tk_jp_company = Math.round(jpCap * jpCompRate);
	const bpjs_kes_company = Math.round(bpjsKesCap * bpjsKesCompRate);

	const bpjs_tk_jht_employee = Math.round(basicSalary * jhtEmpRate);
	const bpjs_tk_jp_employee = Math.round(jpCap * jpEmpRate);
	const bpjs_kes_employee = Math.round(bpjsKesCap * bpjsKesEmpRate);

	const total_employee_bpjs = bpjs_tk_jht_employee + bpjs_tk_jp_employee + bpjs_kes_employee;
	const total_company_bpjs = bpjs_tk_jkk_company + bpjs_tk_jkm_company + bpjs_tk_jht_company + bpjs_tk_jp_company + bpjs_kes_company;

	return {
		bpjs_tk_jkk_company,
		bpjs_tk_jkm_company,
		bpjs_tk_jht_company,
		bpjs_tk_jp_company,
		bpjs_kes_company,
		bpjs_tk_jht_employee,
		bpjs_tk_jp_employee,
		bpjs_kes_employee,
		total_employee_bpjs,
		total_company_bpjs
	};
}

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

		const rawSalarySlips = await sql`
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

		// Enrich each slip with PTKP status, PPh 21 TER, BPJS Breakdown, and Driver Ritase info
		const salarySlips = rawSalarySlips.map((s, idx) => {
			const isDriver = (s.employee_position || '').toLowerCase().includes('driver') ||
							 (s.employee_division || '').toLowerCase().includes('operasi') ||
							 (s.employee_division || '').toLowerCase().includes('logistik');
			
			// Mocked or deterministic PTKP status based on index for realistic diversity
			const ptkpOptions = ['TK/0', 'K/0', 'K/1', 'K/2', 'TK/1', 'K/3'];
			const ptkpStatus = ptkpOptions[idx % ptkpOptions.length];

			// Kalkulasi PPh 21 TER
			const terInfo = calculatePPh21TER(s.gross_salary, ptkpStatus);
			
			// Kalkulasi BPJS
			const bpjsInfo = calculateBPJSBreakdown(s.basic_salary);

			// Komponen Khusus Driver Logistik
			const ritase_count = isDriver ? 14 + (idx % 12) : 0;
			const tonnage_total = isDriver ? ritase_count * 25 : 0;
			const ritase_allowance = isDriver ? ritase_count * 150000 : 0;
			const safety_bonus = isDriver ? 350000 : 0;
			const waiting_fee = isDriver ? 150000 : 0;

			return {
				...s,
				isDriver,
				ptkpStatus,
				terCategory: terInfo.terCategory,
				terRate: terInfo.terRate,
				calculatedTax: terInfo.taxAmount,
				bpjsDetails: bpjsInfo,
				logisticsDetails: {
					ritase_count,
					tonnage_total,
					ritase_allowance,
					safety_bonus,
					waiting_fee,
					total_driver_incentive: ritase_allowance + safety_bonus + waiting_fee
				}
			};
		});

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

