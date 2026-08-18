import type { PageServerLoad, Actions } from './$types';
import { apiFetch } from '$lib/utils/api';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const authToken = cookies.get('auth_token');
	const selectedPeriod = url.searchParams.get('period') || '2026-07-01';
	const searchQuery = url.searchParams.get('search') || '';
	const divisionFilter = url.searchParams.get('division') || '';

	let periods: any[] = [];
	let divisions: string[] = [];
	let summary: any = null;
	let salarySlips: any[] = [];
	let reimbursements: any[] = [];
	let reimbursementSummary: any = null;
	let dataSource: 'laravel' | 'database_fallback' = 'laravel';

	// 1. Ambil daftar semua periode payroll yang tersedia untuk dropdown selector
	try {
		periods = await sql`
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
	} catch (e: any) {
		console.warn('⚠️ [Payroll Periods SQL] Error loading periods:', e?.message);
	}

	// 2. Coba fetch data Payroll & Reimbursement dari Backend Laravel API (apiFetch)
	try {
		const payrollParams = new URLSearchParams();
		if (selectedPeriod) payrollParams.set('period', selectedPeriod.slice(0, 7)); // YYYY-MM
		if (searchQuery) payrollParams.set('search', searchQuery);
		if (divisionFilter) payrollParams.set('division', divisionFilter);
		payrollParams.set('per_page', '100');

		const [payrollRes, reimbursementRes] = await Promise.all([
			apiFetch<any>(`/api/v1/hris/payroll?${payrollParams.toString()}`, {}, authToken),
			apiFetch<any>(`/api/v1/hris/payroll/reimbursements?per_page=100`, {}, authToken)
		]);

		if (payrollRes?.data) {
			summary = {
				total_count: payrollRes.data.summary?.total_count || 0,
				sum_basic: 0,
				sum_gross: payrollRes.data.summary?.total_gross || 0,
				sum_deductions: payrollRes.data.summary?.total_deductions || 0,
				sum_net: payrollRes.data.summary?.total_net_thp || 0,
				avg_net: payrollRes.data.summary?.avg_salary || 0,
				sum_bpjs: 0,
				sum_tax: 0,
				sum_absence_deduction: 0
			};
			divisions = payrollRes.data.divisions || [];
			salarySlips = (payrollRes.data.slips || []).map((s: any) => ({
				...s,
				period_date: s.period || selectedPeriod,
				period_display: s.period || selectedPeriod
			}));
		}

		if (reimbursementRes?.data) {
			reimbursementSummary = {
				total_claims: reimbursementRes.data.summary?.total_claims || 0,
				total_approved_amount: reimbursementRes.data.summary?.total_approved_amount || 0,
				pending_claims: reimbursementRes.data.summary?.pending_claims || 0,
				approved_claims: (reimbursementRes.data.summary?.total_claims || 0) - (reimbursementRes.data.summary?.pending_claims || 0) - (reimbursementRes.data.summary?.rejected_claims || 0)
			};
			reimbursements = reimbursementRes.data.claims || [];
		}

		dataSource = 'laravel';
	} catch (apiErr: any) {
		console.warn('⚠️ [Payroll API] Laravel backend unreachable, switching to Direct PostgreSQL Fallback:', apiErr?.message);
		dataSource = 'database_fallback';

		// 3. Fallback ke Direct SQL jika Laravel API belum aktif atau offline
		try {
			const divisionList = await sql`
				SELECT DISTINCT employee_division 
				FROM presensi.salary_slips 
				WHERE employee_division IS NOT NULL AND employee_division != ''
				ORDER BY employee_division ASC
			`;
			divisions = divisionList.map(d => d.employee_division);

			const [sqlSummary] = await sql`
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
			summary = sqlSummary;

			let filterCondition = sql`WHERE TO_CHAR(s.period, 'YYYY-MM-DD') = ${selectedPeriod}`;
			if (searchQuery) {
				const searchPattern = `%${searchQuery}%`;
				filterCondition = sql`${filterCondition} AND (s.employee_name ILIKE ${searchPattern} OR s.employee_nik ILIKE ${searchPattern} OR s.employee_position ILIKE ${searchPattern})`;
			}
			if (divisionFilter) {
				filterCondition = sql`${filterCondition} AND s.employee_division = ${divisionFilter}`;
			}

			salarySlips = await sql`
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

			reimbursements = await sql`
				SELECT 
					id,
					employee_nik,
					employee_name,
					employee_division,
					claim_type,
					invoice_number,
					merchant_name,
					TO_CHAR(claim_date, 'YYYY-MM-DD') as claim_date,
					amount::float,
					approved_amount::float,
					description,
					status,
					approved_by,
					TO_CHAR(approved_at, 'YYYY-MM-DD HH24:MI') as approved_at,
					rejection_reason
				FROM presensi.reimbursements
				ORDER BY claim_date DESC, id DESC
				LIMIT 100
			`;

			const [sqlReimburseSummary] = await sql`
				SELECT 
					COUNT(*)::int as total_claims,
					COALESCE(SUM(CASE WHEN status = 'Approved' THEN approved_amount ELSE 0 END), 0)::float as total_approved_amount,
					COUNT(CASE WHEN status = 'Pending' THEN 1 END)::int as pending_claims,
					COUNT(CASE WHEN status = 'Approved' THEN 1 END)::int as approved_claims
				FROM presensi.reimbursements
			`;
			reimbursementSummary = sqlReimburseSummary;
		} catch (sqlErr: any) {
			console.error('❌ [HRD Payroll SQL Fallback] Error:', sqlErr?.message);
		}
	}

	return {
		selectedPeriod,
		searchQuery,
		divisionFilter,
		periods: periods || [],
		divisions: divisions || [],
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
		salarySlips: salarySlips || [],
		reimbursements: reimbursements || [],
		reimbursementSummary: reimbursementSummary || {
			total_claims: 0,
			total_approved_amount: 0,
			pending_claims: 0,
			approved_claims: 0
		},
		dataSource
	};
};

export const actions: Actions = {
	updateSlip: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const slipId = formData.get('slipId')?.toString();
		
		if (!slipId) return fail(400, { message: 'ID Slip Gaji tidak ditemukan' });

		const payload = {
			basic_salary: parseFloat(formData.get('basic_salary')?.toString() || '0'),
			professional_allowance: parseFloat(formData.get('professional_allowance')?.toString() || '0'),
			performance_allowance: parseFloat(formData.get('performance_allowance')?.toString() || '0'),
			position_allowance: parseFloat(formData.get('position_allowance')?.toString() || '0'),
			meal_allowance: parseFloat(formData.get('meal_allowance')?.toString() || '0'),
			transport_allowance: parseFloat(formData.get('transport_allowance')?.toString() || '0'),
			relocation_allowance: parseFloat(formData.get('relocation_allowance')?.toString() || '0'),
			skill_allowance: parseFloat(formData.get('skill_allowance')?.toString() || '0'),
			other_allowance: parseFloat(formData.get('other_allowance')?.toString() || '0'),
			incentive: parseFloat(formData.get('incentive')?.toString() || '0'),
			communication_allowance: parseFloat(formData.get('communication_allowance')?.toString() || '0'),
			overtime_allowance: parseFloat(formData.get('overtime_allowance')?.toString() || '0'),
			khk_allowance: parseFloat(formData.get('khk_allowance')?.toString() || '0'),
			zakat: parseFloat(formData.get('zakat')?.toString() || '0'),
			tax: parseFloat(formData.get('tax')?.toString() || '0'),
			bpjs: parseFloat(formData.get('bpjs')?.toString() || '0'),
			union_fee: parseFloat(formData.get('union_fee')?.toString() || '0'),
			absence_deduction: parseFloat(formData.get('absence_deduction')?.toString() || '0'),
			cooperative: parseFloat(formData.get('cooperative')?.toString() || '0'),
			bpr_installment: parseFloat(formData.get('bpr_installment')?.toString() || '0'),
			other_deduction: parseFloat(formData.get('other_deduction')?.toString() || '0')
		};

		const gross_salary = payload.basic_salary + payload.professional_allowance + payload.performance_allowance + payload.position_allowance + payload.meal_allowance + payload.transport_allowance + payload.relocation_allowance + payload.skill_allowance + payload.other_allowance + payload.incentive + payload.communication_allowance + payload.overtime_allowance + payload.khk_allowance;
		const total_deductions = payload.zakat + payload.tax + payload.bpjs + payload.union_fee + payload.absence_deduction + payload.cooperative + payload.bpr_installment + payload.other_deduction;
		const net_salary = gross_salary - total_deductions;

		// 1. Coba update via Laravel API
		try {
			await apiFetch(`/api/v1/hris/payroll/slips/${slipId}`, {
				method: 'PUT',
				body: JSON.stringify({ ...payload, net_salary })
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.warn('⚠️ [Update Slip API] Laravel API error, fallback to Direct SQL:', apiErr?.message);
			
			// 2. Fallback direct SQL update
			try {
				await sql`
					UPDATE presensi.salary_slips
					SET 
						basic_salary = ${payload.basic_salary},
						professional_allowance = ${payload.professional_allowance},
						performance_allowance = ${payload.performance_allowance},
						position_allowance = ${payload.position_allowance},
						meal_allowance = ${payload.meal_allowance},
						transport_allowance = ${payload.transport_allowance},
						relocation_allowance = ${payload.relocation_allowance},
						skill_allowance = ${payload.skill_allowance},
						other_allowance = ${payload.other_allowance},
						incentive = ${payload.incentive},
						communication_allowance = ${payload.communication_allowance},
						overtime_allowance = ${payload.overtime_allowance},
						khk_allowance = ${payload.khk_allowance},
						gross_salary = ${gross_salary},
						zakat = ${payload.zakat},
						tax = ${payload.tax},
						bpjs = ${payload.bpjs},
						union_fee = ${payload.union_fee},
						absence_deduction = ${payload.absence_deduction},
						cooperative = ${payload.cooperative},
						bpr_installment = ${payload.bpr_installment},
						other_deduction = ${payload.other_deduction},
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
	},

	submitReimbursement: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const employee_nik = formData.get('employee_nik')?.toString() || '';
		const employee_name = formData.get('employee_name')?.toString() || '';
		const employee_division = formData.get('employee_division')?.toString() || 'General';
		const claim_type = formData.get('claim_type')?.toString() || 'Rawat Jalan & Obat';
		const invoice_number = formData.get('invoice_number')?.toString() || '';
		const merchant_name = formData.get('merchant_name')?.toString() || '';
		const claim_date = formData.get('claim_date')?.toString() || new Date().toISOString().split('T')[0];
		const amount = parseFloat(formData.get('amount')?.toString() || '0');
		const description = formData.get('description')?.toString() || '';

		if (!employee_name || amount <= 0) {
			return fail(400, { message: 'Nama karyawan dan nominal klaim valid wajib diisi.' });
		}

		// 1. Coba POST via Laravel API
		try {
			await apiFetch('/api/v1/hris/payroll/reimbursements', {
				method: 'POST',
				body: JSON.stringify({
					user_id: 122,
					employee_nik,
					employee_name,
					claim_type,
					amount,
					description
				})
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.warn('⚠️ [Submit Reimbursement API] Fallback to SQL:', apiErr?.message);
			
			// 2. Fallback direct SQL insert
			try {
				await sql`
					INSERT INTO presensi.reimbursements 
					(employee_nik, employee_name, employee_division, claim_type, invoice_number, merchant_name, claim_date, amount, approved_amount, description, status)
					VALUES 
					(${employee_nik}, ${employee_name}, ${employee_division}, ${claim_type}, ${invoice_number}, ${merchant_name}, ${claim_date}, ${amount}, ${amount}, ${description}, 'Pending')
				`;
				return { success: true };
			} catch (e: any) {
				console.error('Failed to submit reimbursement:', e);
				return fail(500, { message: e.message || 'Gagal menyimpan pengajuan klaim.' });
			}
		}
	},

	approveReimbursement: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const claimId = formData.get('claimId')?.toString();
		const approved_amount = parseFloat(formData.get('approved_amount')?.toString() || '0');
		const approved_by = formData.get('approved_by')?.toString() || 'HRD Manager';

		if (!claimId) return fail(400, { message: 'ID klaim tidak ditemukan.' });

		// 1. Coba approve via Laravel API
		try {
			await apiFetch(`/api/v1/hris/payroll/reimbursements/${claimId}/approve`, {
				method: 'POST'
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.warn('⚠️ [Approve Reimbursement API] Fallback to SQL:', apiErr?.message);

			// 2. Fallback direct SQL update
			try {
				await sql`
					UPDATE presensi.reimbursements
					SET 
						status = 'Approved',
						approved_amount = ${approved_amount},
						approved_by = ${approved_by},
						approved_at = NOW(),
						updated_at = NOW()
					WHERE id = ${claimId}
				`;
				return { success: true };
			} catch (e: any) {
				console.error('Failed to approve reimbursement:', e);
				return fail(500, { message: e.message || 'Gagal menyetujui klaim.' });
			}
		}
	},

	rejectReimbursement: async ({ request, cookies }) => {
		const authToken = cookies.get('auth_token');
		const formData = await request.formData();
		const claimId = formData.get('claimId')?.toString();
		const rejection_reason = formData.get('rejection_reason')?.toString() || 'Dokumen atau kuitansi tidak memenuhi syarat';

		if (!claimId) return fail(400, { message: 'ID klaim tidak ditemukan.' });

		// 1. Coba reject via Laravel API
		try {
			await apiFetch(`/api/v1/hris/payroll/reimbursements/${claimId}/reject`, {
				method: 'POST',
				body: JSON.stringify({ rejection_reason })
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.warn('⚠️ [Reject Reimbursement API] Fallback to SQL:', apiErr?.message);

			// 2. Fallback direct SQL update
			try {
				await sql`
					UPDATE presensi.reimbursements
					SET 
						status = 'Rejected',
						rejection_reason = ${rejection_reason},
						updated_at = NOW()
					WHERE id = ${claimId}
				`;
				return { success: true };
			} catch (e: any) {
				console.error('Failed to reject reimbursement:', e);
				return fail(500, { message: e.message || 'Gagal menolak klaim.' });
			}
		}
	}
};
