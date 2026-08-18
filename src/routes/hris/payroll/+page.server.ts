import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

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
				TO_CHAR(period, 'FMmm - YYYY') as period_code,
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
				s.user_id,
				s.employee_nik,
				s.employee_name,
				s.employee_position,
				s.employee_division,
				s.bank_name,
				s.account_number,
				s.basic_salary::float,
				s.professional_allowance::float,
				s.performance_allowance::float,
				s.position_allowance::float,
				s.meal_allowance::float,
				s.transport_allowance::float,
				s.relocation_allowance::float,
				s.skill_allowance::float,
				s.other_allowance::float,
				s.incentive::float,
				s.communication_allowance::float,
				s.overtime_allowance::float,
				s.overtime_hours::float,
				s.khk_allowance::float,
				s.khk_count::int,
				s.gross_salary::float,
				s.zakat::float,
				s.tax::float,
				s.bpjs::float,
				s.union_fee::float,
				s.absence_deduction::float,
				s.absence_days::int,
				s.cooperative::float,
				s.bpr_installment::float,
				s.other_deduction::float,
				s.total_deductions::float,
				s.net_salary::float,
				TO_CHAR(s.period, 'YYYY-MM-DD') as period_date,
				TO_CHAR(s.period, 'FMmm - YYYY') as period_display,
				s.notes
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

export const actions: Actions = {
	updateSlip: async ({ request }) => {
		const formData = await request.formData();
		const slipId = formData.get('slipId')?.toString();
		
		if (!slipId) return fail(400, { message: 'ID Slip Gaji tidak ditemukan' });

		const basic_salary = parseFloat(formData.get('basic_salary')?.toString() || '0');
		const professional_allowance = parseFloat(formData.get('professional_allowance')?.toString() || '0');
		const performance_allowance = parseFloat(formData.get('performance_allowance')?.toString() || '0');
		const position_allowance = parseFloat(formData.get('position_allowance')?.toString() || '0');
		const meal_allowance = parseFloat(formData.get('meal_allowance')?.toString() || '0');
		const transport_allowance = parseFloat(formData.get('transport_allowance')?.toString() || '0');
		const relocation_allowance = parseFloat(formData.get('relocation_allowance')?.toString() || '0');
		const skill_allowance = parseFloat(formData.get('skill_allowance')?.toString() || '0');
		const other_allowance = parseFloat(formData.get('other_allowance')?.toString() || '0');
		const incentive = parseFloat(formData.get('incentive')?.toString() || '0');
		const communication_allowance = parseFloat(formData.get('communication_allowance')?.toString() || '0');
		const overtime_allowance = parseFloat(formData.get('overtime_allowance')?.toString() || '0');
		const khk_allowance = parseFloat(formData.get('khk_allowance')?.toString() || '0');

		const zakat = parseFloat(formData.get('zakat')?.toString() || '0');
		const tax = parseFloat(formData.get('tax')?.toString() || '0');
		const bpjs = parseFloat(formData.get('bpjs')?.toString() || '0');
		const union_fee = parseFloat(formData.get('union_fee')?.toString() || '0');
		const absence_deduction = parseFloat(formData.get('absence_deduction')?.toString() || '0');
		const cooperative = parseFloat(formData.get('cooperative')?.toString() || '0');
		const bpr_installment = parseFloat(formData.get('bpr_installment')?.toString() || '0');
		const other_deduction = parseFloat(formData.get('other_deduction')?.toString() || '0');

		const gross_salary = basic_salary + professional_allowance + performance_allowance + position_allowance + meal_allowance + transport_allowance + relocation_allowance + skill_allowance + other_allowance + incentive + communication_allowance + overtime_allowance + khk_allowance;
		const total_deductions = zakat + tax + bpjs + union_fee + absence_deduction + cooperative + bpr_installment + other_deduction;
		const net_salary = gross_salary - total_deductions;

		try {
			await sql`
				UPDATE presensi.salary_slips
				SET 
					basic_salary = ${basic_salary},
					professional_allowance = ${professional_allowance},
					performance_allowance = ${performance_allowance},
					position_allowance = ${position_allowance},
					meal_allowance = ${meal_allowance},
					transport_allowance = ${transport_allowance},
					relocation_allowance = ${relocation_allowance},
					skill_allowance = ${skill_allowance},
					other_allowance = ${other_allowance},
					incentive = ${incentive},
					communication_allowance = ${communication_allowance},
					overtime_allowance = ${overtime_allowance},
					khk_allowance = ${khk_allowance},
					gross_salary = ${gross_salary},
					zakat = ${zakat},
					tax = ${tax},
					bpjs = ${bpjs},
					union_fee = ${union_fee},
					absence_deduction = ${absence_deduction},
					cooperative = ${cooperative},
					bpr_installment = ${bpr_installment},
					other_deduction = ${other_deduction},
					total_deductions = ${total_deductions},
					net_salary = ${net_salary},
					updated_at = NOW()
				WHERE id = ${slipId}
			`;
			return { success: true };
		} catch (e: any) {
			console.error('Failed to update salary slip:', e);
			return fail(500, { message: e.message || 'Gagal menyimpan ke database' });
		}
	}
};


