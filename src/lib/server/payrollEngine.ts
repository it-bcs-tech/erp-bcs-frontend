import sql from '$lib/server/db';

export interface PayrollCalculationItem {
	id?: number;
	user_id: number | null;
	employee_nik: string;
	employee_name: string;
	employee_position: string;
	employee_division: string;
	bank_name: string;
	account_number: string;
	work_days: number;
	basic_salary: number;
	professional_allowance: number;
	performance_allowance: number;
	position_allowance: number;
	meal_allowance: number;
	transport_allowance: number;
	relocation_allowance: number;
	skill_allowance: number;
	other_allowance: number;
	incentive_10th: number;
	communication_allowance: number;
	incentive: number;
	shift_allowance: number;
	shift_count: number;
	overtime_allowance: number;
	overtime_hours: number;
	khk_allowance: number;
	khk_count: number;
	zakat: number;
	tax: number;
	bpjs: number;
	union_fee: number;
	absence_deduction: number;
	absence_days: number;
	cooperative: number;
	bpr_installment: number;
	other_deduction: number;
	gross_salary: number;
	total_deductions: number;
	net_salary: number;
	salary_in_words?: string;
	notes?: string;
}

export interface PayrollBatchSummary {
	period: string;
	total_employees: number;
	total_gross: number;
	total_deductions: number;
	total_net: number;
	total_overtime_hours: number;
	total_overtime_amount: number;
	total_absence_days: number;
	total_absence_deduction: number;
	total_loan_deduction: number;
	total_bpjs: number;
	total_tax: number;
	items: PayrollCalculationItem[];
}

/**
 * Kalkulasi PPh 21 menggunakan skema Tarif Efektif Rata-rata (TER) Bulanan
 */
export function calculateTerTax(gross: number): number {
	if (gross <= 5400000) return 0;
	if (gross <= 5650000) return Math.round(gross * 0.0025);
	if (gross <= 5950000) return Math.round(gross * 0.005);
	if (gross <= 6300000) return Math.round(gross * 0.0075);
	if (gross <= 6750000) return Math.round(gross * 0.01);
	if (gross <= 7500000) return Math.round(gross * 0.0125);
	if (gross <= 8550000) return Math.round(gross * 0.015);
	if (gross <= 9650000) return Math.round(gross * 0.0175);
	if (gross <= 10050000) return Math.round(gross * 0.02);
	if (gross <= 12000000) return Math.round(gross * 0.025);
	if (gross <= 15000000) return Math.round(gross * 0.03);
	if (gross <= 20000000) return Math.round(gross * 0.04);
	return Math.round(gross * 0.05);
}

/**
 * Kalkulasi BPJS Kesehatan (1% max cap 12jt) + Ketenagakerjaan (JHT 2% + JP 1% max cap 10jt)
 */
export function calculateBpjs(basicSalary: number): number {
	const capKes = Math.min(basicSalary, 12000000);
	const capJp = Math.min(basicSalary, 10042300);
	const kes = capKes * 0.01;
	const jht = basicSalary * 0.02;
	const jp = capJp * 0.01;
	return Math.round(kes + jht + jp);
}

/**
 * Hitung Uang Lembur sesuai jam aktual
 */
export function calculateOvertimeAllowance(overtimeHours: number, basicSalary: number): number {
	if (overtimeHours <= 0) return 0;
	// Formula 1.5x upah sejam (1/173 x Gaji Pokok)
	const hourlyRate = (basicSalary || 4800000) / 173;
	return Math.round(overtimeHours * hourlyRate * 1.5);
}

/**
 * Hitung Potongan Alpa / Absen pro-rata hari kerja (25 hari)
 */
export function calculateAbsenceDeduction(absenceDays: number, basicSalary: number): number {
	if (absenceDays <= 0) return 0;
	const dailyRate = (basicSalary || 4800000) / 25;
	return Math.round(dailyRate * absenceDays);
}

/**
 * Jalankan Automated Payroll Engine untuk periode tertentu
 */
export async function runPayrollCalculation(
	periodStr: string,
	options: { mode?: 'all' | 'new_only'; commit?: boolean } = { mode: 'all', commit: false }
): Promise<PayrollBatchSummary> {
	// Pastikan format YYYY-MM-01
	const formattedPeriod = periodStr.length === 7 ? `${periodStr}-01` : periodStr;
	const [year, month] = formattedPeriod.split('-');
	const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
	const startDate = `${year}-${month}-01`;
	const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

	// 1. Ambil data master karyawan aktif beserta baseline salary dari slip periode terakhir
	const baselines = await sql<any[]>`
		WITH latest_slips AS (
			SELECT DISTINCT ON (COALESCE(s.employee_nik, ''))
				s.*
			FROM presensi.salary_slips s
			ORDER BY COALESCE(s.employee_nik, ''), s.period DESC
		)
		SELECT 
			k.id as karyawan_id,
			k.payroll_id as nik,
			k.nama_karyawan as name,
			COALESCE(t.title, k.title, 'Staff') as position,
			COALESCE(d.dept_name, dv.div_name, dr.dir_name, 'General Operations') as division,
			COALESCE(k.nama_bank, ls.bank_name, 'BCA') as bank_name,
			COALESCE(k.no_account_bank, ls.account_number, '-') as account_number,
			COALESCE(ls.user_id, k.id) as user_id,
			COALESCE(ls.basic_salary, 4800000) as basic_salary,
			COALESCE(ls.professional_allowance, 0) as professional_allowance,
			COALESCE(ls.performance_allowance, 0) as performance_allowance,
			COALESCE(ls.position_allowance, 0) as position_allowance,
			COALESCE(ls.meal_allowance, 0) as meal_allowance,
			COALESCE(ls.transport_allowance, 0) as transport_allowance,
			COALESCE(ls.relocation_allowance, 0) as relocation_allowance,
			COALESCE(ls.skill_allowance, 0) as skill_allowance,
			COALESCE(ls.other_allowance, 0) as other_allowance,
			COALESCE(ls.incentive_10th, 0) as incentive_10th,
			COALESCE(ls.communication_allowance, 0) as communication_allowance,
			COALESCE(ls.incentive, 0) as incentive,
			COALESCE(ls.shift_allowance, 0) as shift_allowance,
			COALESCE(ls.khk_allowance, 0) as khk_allowance,
			COALESCE(ls.zakat, 0) as zakat,
			COALESCE(ls.union_fee, 0) as union_fee,
			COALESCE(ls.cooperative, 0) as cooperative,
			COALESCE(ls.other_deduction, 0) as other_deduction
		FROM master.m_karyawan k
		LEFT JOIN master.m_title t ON t.title_code = k.title
		LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
		LEFT JOIN master.m_division dv ON dv.div_code = k.div_id
		LEFT JOIN master.m_directorat dr ON dr.dir_code = k.dir_id
		LEFT JOIN latest_slips ls ON ls.employee_nik = k.payroll_id OR ls.employee_name ILIKE k.nama_karyawan
		WHERE (k.aktif = 'Y' OR k.aktif = '1' OR k.aktif IS NULL)
		ORDER BY k.nama_karyawan ASC
	`;

	// 2. Ambil data slip yang sudah ada pada periode yang dipilih
	const existingSlips = await sql<any[]>`
		SELECT id, employee_nik, employee_name, user_id
		FROM presensi.salary_slips
		WHERE period = ${formattedPeriod}::date
	`;
	const existingNikSet = new Set(existingSlips.map((s) => s.employee_nik));

	// 3. Ambil data presensi aktual pada bulan tersebut
	const presences = await sql<any[]>`
		SELECT 
			user_id,
			COUNT(*) FILTER (WHERE status ILIKE '%hadir%' OR status ILIKE '%present%' OR status ILIKE '%tepat%' OR status ILIKE '%terlambat%' OR status ILIKE '%late%') as present_days,
			COUNT(*) FILTER (WHERE status ILIKE '%alpa%' OR status ILIKE '%absent%' OR status ILIKE '%tidak hadir%') as absent_days,
			COALESCE(SUM(overtime_minutes), 0) as ot_minutes
		FROM presensi.presences
		WHERE date >= ${startDate}::date AND date <= ${endDate}::date
		GROUP BY user_id
	`;
	const presenceMap = new Map<string, any>();
	for (const p of presences) {
		presenceMap.set(String(p.user_id), p);
	}

	// 4. Ambil data angsuran pinjaman (loans) yang aktif
	const activeLoans = await sql<any[]>`
		SELECT 
			user_id,
			COALESCE(SUM(monthly_installment), 0) as installment
		FROM presensi.loans
		WHERE status IN ('approved', 'active', 'disbursed')
		  AND (start_date IS NULL OR start_date <= ${endDate}::date)
		  AND (end_date IS NULL OR end_date >= ${startDate}::date)
		  AND (remaining_amount > 0 OR remaining_amount IS NULL)
		GROUP BY user_id
	`;
	const loanMap = new Map<string, number>();
	for (const l of activeLoans) {
		loanMap.set(String(l.user_id), Number(l.installment));
	}

	// 5. Kalkulasi Batch
	const items: PayrollCalculationItem[] = [];
	let sumGross = 0;
	let sumDeductions = 0;
	let sumNet = 0;
	let sumOtHours = 0;
	let sumOtAmount = 0;
	let sumAbsenceDays = 0;
	let sumAbsenceDeduction = 0;
	let sumLoanDeduction = 0;
	let sumBpjs = 0;
	let sumTax = 0;

	for (const emp of baselines) {
		// Jika mode new_only dan sudah ada slipnya, skip
		if (options.mode === 'new_only' && existingNikSet.has(emp.nik)) {
			continue;
		}

		const basicSalary = Number(emp.basic_salary) || 4800000;
		const pres = presenceMap.get(String(emp.user_id)) || { present_days: 22, absent_days: 0, ot_minutes: 0 };
		const workDays = Number(pres.present_days) || 22;
		const absenceDays = Number(pres.absent_days) || 0;
		const overtimeHours = Math.round((Number(pres.ot_minutes) / 60) * 100) / 100;

		const overtimeAllowance = calculateOvertimeAllowance(overtimeHours, basicSalary);
		const absenceDeduction = calculateAbsenceDeduction(absenceDays, basicSalary);
		const loanInstallment = loanMap.get(String(emp.user_id)) || 0;

		const prof = Number(emp.professional_allowance) || 0;
		const perf = Number(emp.performance_allowance) || 0;
		const pos = Number(emp.position_allowance) || 0;
		const meal = Number(emp.meal_allowance) || 0;
		const trans = Number(emp.transport_allowance) || 0;
		const reloc = Number(emp.relocation_allowance) || 0;
		const skill = Number(emp.skill_allowance) || 0;
		const comm = Number(emp.communication_allowance) || 0;
		const inc = Number(emp.incentive) || 0;
		const inc10 = Number(emp.incentive_10th) || 0;
		const shift = Number(emp.shift_allowance) || 0;
		const khk = Number(emp.khk_allowance) || 0;
		const otherAll = Number(emp.other_allowance) || 0;

		const gross =
			basicSalary +
			prof +
			perf +
			pos +
			meal +
			trans +
			reloc +
			skill +
			comm +
			inc +
			inc10 +
			shift +
			khk +
			otherAll +
			overtimeAllowance;

		const bpjs = calculateBpjs(basicSalary);
		const tax = calculateTerTax(gross);
		const zakat = Number(emp.zakat) || 0;
		const union = Number(emp.union_fee) || 0;
		const coop = Number(emp.cooperative) || 0;
		const otherDed = Number(emp.other_deduction) || 0;

		const totalDeductions =
			zakat + tax + bpjs + union + absenceDeduction + coop + loanInstallment + otherDed;
		const netSalary = gross - totalDeductions;

		const calcItem: PayrollCalculationItem = {
			user_id: emp.user_id,
			employee_nik: emp.nik,
			employee_name: emp.name,
			employee_position: emp.position,
			employee_division: emp.division,
			bank_name: emp.bank_name,
			account_number: emp.account_number,
			work_days: workDays,
			basic_salary: basicSalary,
			professional_allowance: prof,
			performance_allowance: perf,
			position_allowance: pos,
			meal_allowance: meal,
			transport_allowance: trans,
			relocation_allowance: reloc,
			skill_allowance: skill,
			other_allowance: otherAll,
			incentive_10th: inc10,
			communication_allowance: comm,
			incentive: inc,
			shift_allowance: shift,
			shift_count: 0,
			overtime_allowance: overtimeAllowance,
			overtime_hours: overtimeHours,
			khk_allowance: khk,
			khk_count: 0,
			zakat,
			tax,
			bpjs,
			union_fee: union,
			absence_deduction: absenceDeduction,
			absence_days: absenceDays,
			cooperative: coop,
			bpr_installment: loanInstallment,
			other_deduction: otherDed,
			gross_salary: gross,
			total_deductions: totalDeductions,
			net_salary: netSalary,
			notes: 'Dihitung otomatis oleh Payroll Engine ERP BCS.'
		};

		items.push(calcItem);

		sumGross += gross;
		sumDeductions += totalDeductions;
		sumNet += netSalary;
		sumOtHours += overtimeHours;
		sumOtAmount += overtimeAllowance;
		sumAbsenceDays += absenceDays;
		sumAbsenceDeduction += absenceDeduction;
		sumLoanDeduction += loanInstallment;
		sumBpjs += bpjs;
		sumTax += tax;
	}

	// 6. Jika opsi commit = true, simpan ke database presensi.salary_slips
	if (options.commit && items.length > 0) {
		// Jika mode 'all', hapus slip pada periode tersebut sebelum insert batch
		if (options.mode === 'all') {
			await sql`
				DELETE FROM presensi.salary_slips
				WHERE period = ${formattedPeriod}::date
			`;
		}

		// Insert batch
		for (const item of items) {
			await sql`
				INSERT INTO presensi.salary_slips (
					user_id, period, work_days, employee_nik, employee_name,
					employee_position, employee_division, bank_name, account_number,
					basic_salary, professional_allowance, performance_allowance,
					position_allowance, meal_allowance, transport_allowance,
					relocation_allowance, skill_allowance, other_allowance,
					incentive_10th, communication_allowance, incentive,
					shift_allowance, shift_count, overtime_allowance, overtime_hours,
					khk_allowance, khk_count, zakat, tax, bpjs, union_fee,
					absence_deduction, absence_days, cooperative, bpr_installment,
					other_deduction, gross_salary, total_deductions, net_salary,
					notes, created_at, updated_at
				) VALUES (
					${item.user_id}, ${formattedPeriod}::date, ${item.work_days},
					${item.employee_nik}, ${item.employee_name}, ${item.employee_position},
					${item.employee_division}, ${item.bank_name}, ${item.account_number},
					${item.basic_salary}, ${item.professional_allowance}, ${item.performance_allowance},
					${item.position_allowance}, ${item.meal_allowance}, ${item.transport_allowance},
					${item.relocation_allowance}, ${item.skill_allowance}, ${item.other_allowance},
					${item.incentive_10th}, ${item.communication_allowance}, ${item.incentive},
					${item.shift_allowance}, ${item.shift_count}, ${item.overtime_allowance},
					${item.overtime_hours}, ${item.khk_allowance}, ${item.khk_count},
					${item.zakat}, ${item.tax}, ${item.bpjs}, ${item.union_fee},
					${item.absence_deduction}, ${item.absence_days}, ${item.cooperative},
					${item.bpr_installment}, ${item.other_deduction}, ${item.gross_salary},
					${item.total_deductions}, ${item.net_salary}, ${item.notes},
					NOW(), NOW()
				)
			`;
		}
	}

	return {
		period: formattedPeriod,
		total_employees: items.length,
		total_gross: sumGross,
		total_deductions: sumDeductions,
		total_net: sumNet,
		total_overtime_hours: Math.round(sumOtHours * 100) / 100,
		total_overtime_amount: sumOtAmount,
		total_absence_days: sumAbsenceDays,
		total_absence_deduction: sumAbsenceDeduction,
		total_loan_deduction: sumLoanDeduction,
		total_bpjs: sumBpjs,
		total_tax: sumTax,
		items
	};
}
