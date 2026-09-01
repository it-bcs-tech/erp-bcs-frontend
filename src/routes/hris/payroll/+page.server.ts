import type { PageServerLoad, Actions } from "./$types";
import { apiFetch } from "$lib/utils/api";
import { fail } from "@sveltejs/kit";
import sql from "$lib/server/db";
import { runPayrollCalculation } from "$lib/server/payrollEngine";

export const load: PageServerLoad = async ({ cookies, url }) => {
	const authToken = cookies.get("auth_token");
	const selectedPeriod = url.searchParams.get("period") || "2026-08-01";
	const searchQuery = url.searchParams.get("search") || "";
	const divisionFilter = url.searchParams.get("division") || "";

	// Format tanggal lengkap YYYY-MM-DD
	const formattedPeriod = selectedPeriod.length === 7 ? `${selectedPeriod}-01` : selectedPeriod;

	try {
		// 1. Ambil daftar periode riil dari tabel presensi.salary_slips
		let dbPeriods: any[] = [];
		try {
			dbPeriods = await sql`
				SELECT 
					TO_CHAR(period, 'YYYY-MM-DD') as period_key,
					TO_CHAR(period, 'FMMonth YYYY') as period_label,
					TO_CHAR(period, 'MM - YYYY') as period_code,
					COUNT(*)::int as total_employees
				FROM presensi.salary_slips
				GROUP BY period
				ORDER BY period DESC
			`;
		} catch (dbErr) {
			console.error("❌ [DB Periods Query Error]:", dbErr);
		}

		// Pastikan periode aktif saat ini (August 2026, July 2026, etc) selalu tersedia di dropdown
		const defaultPeriods = [
			{ period_key: "2026-08-01", period_label: "August 2026", period_code: "08 - 2026", total_employees: 0 },
			{ period_key: "2026-07-01", period_label: "July 2026", period_code: "07 - 2026", total_employees: 0 },
			{ period_key: "2026-06-01", period_label: "June 2026", period_code: "06 - 2026", total_employees: 0 },
			{ period_key: "2026-05-01", period_label: "May 2026", period_code: "05 - 2026", total_employees: 0 },
			{ period_key: "2026-04-01", period_label: "April 2026", period_code: "04 - 2026", total_employees: 0 },
			{ period_key: "2026-03-01", period_label: "March 2026", period_code: "03 - 2026", total_employees: 0 }
		];

		const periodMap = new Map<string, any>();
		for (const dp of defaultPeriods) {
			periodMap.set(dp.period_key, dp);
		}
		for (const p of dbPeriods) {
			periodMap.set(p.period_key, {
				period_key: p.period_key,
				period_label: p.period_label,
				period_code: p.period_code,
				total_employees: p.total_employees
			});
		}
		const periods = Array.from(periodMap.values()).sort((a, b) => b.period_key.localeCompare(a.period_key));

		// 2. Coba fetch dari Laravel API, fallback ke PostgreSQL direct query
		const payrollParams = new URLSearchParams();
		if (formattedPeriod) payrollParams.set("period", formattedPeriod);
		if (searchQuery) payrollParams.set("search", searchQuery);
		if (divisionFilter) payrollParams.set("division", divisionFilter);
		payrollParams.set("per_page", "500");

		const [payrollRes, reimbursementRes] = await Promise.all([
			apiFetch<any>(`/api/v1/hris/payroll?${payrollParams.toString()}`, {}, authToken).catch((err) => {
				console.error("⚠️ [Payroll API Warning - will fallback to DB]:", err?.message);
				return { data: null };
			}),
			apiFetch<any>(`/api/v1/hris/payroll/reimbursements?per_page=100`, {}, authToken).catch((err) => {
				console.error("❌ [Reimbursement API Error]:", err?.message);
				return {
					data: {
						summary: { total_claims: 0, total_approved_amount: 0, pending_claims: 0, rejected_claims: 0 },
						claims: []
					}
				};
			})
		]);

		let salarySlips: any[] = [];
		let summary = {
			total_count: 0,
			sum_basic: 0,
			sum_gross: 0,
			sum_deductions: 0,
			sum_net: 0,
			avg_net: 0,
			sum_bpjs: 0,
			sum_tax: 0,
			sum_absence_deduction: 0
		};
		let divisions: string[] = [];

		if (payrollRes?.data?.slips && payrollRes.data.slips.length > 0) {
			salarySlips = payrollRes.data.slips.map((s: any) => ({
				...s,
				period_date: s.period || selectedPeriod,
				period_display: s.period || selectedPeriod
			}));
			summary = {
				total_count: payrollRes.data.summary?.total_count || salarySlips.length,
				sum_basic: 0,
				sum_gross: Number(payrollRes.data.summary?.total_gross) || 0,
				sum_deductions: Number(payrollRes.data.summary?.total_deductions) || 0,
				sum_net: Number(payrollRes.data.summary?.total_net_thp) || 0,
				avg_net: Number(payrollRes.data.summary?.avg_salary) || 0,
				sum_bpjs: 0,
				sum_tax: 0,
				sum_absence_deduction: 0
			};
			divisions = payrollRes.data.divisions || [];
		}

		const reimbursementData = reimbursementRes?.data || {};
		const reimbursementSummary = {
			total_claims: reimbursementData.summary?.total_claims || 0,
			total_approved_amount: reimbursementData.summary?.total_approved_amount || 0,
			pending_claims: reimbursementData.summary?.pending_claims || 0,
			approved_claims: (reimbursementData.summary?.total_claims || 0) - (reimbursementData.summary?.pending_claims || 0) - (reimbursementData.summary?.rejected_claims || 0)
		};

		const reimbursements = (reimbursementData.claims || []).map((c: any) => ({
			...c,
			claim_date: c.submitted_at ? c.submitted_at.split(" ")[0] : "2026-08-18",
			approved_amount: c.amount || 0
		}));

		return {
			selectedPeriod,
			searchQuery,
			divisionFilter,
			periods,
			divisions,
			summary,
			salarySlips,
			reimbursements,
			reimbursementSummary,
			dataSource: "postgres_laravel"
		};
	} catch (err: any) {
		console.error("❌ [HRD Payroll Load Error]:", err?.message);
		return {
			selectedPeriod,
			searchQuery: "",
			divisionFilter: "",
			periods: [
				{ period_key: "2026-08-01", period_label: "August 2026", period_code: "08 - 2026", total_employees: 0 },
				{ period_key: "2026-07-01", period_label: "July 2026", period_code: "07 - 2026", total_employees: 0 }
			],
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
			salarySlips: [],
			reimbursements: [],
			reimbursementSummary: {
				total_claims: 0,
				total_approved_amount: 0,
				pending_claims: 0,
				approved_claims: 0
			},
			dataSource: "error_fallback"
		};
	}
};

export const actions: Actions = {
	calculatePayrollPreview: async ({ request }) => {
		const formData = await request.formData();
		const period = formData.get("period")?.toString() || "2026-08-01";
		const mode = (formData.get("mode")?.toString() || "all") as "all" | "new_only";

		try {
			const summary = await runPayrollCalculation(period, { mode, commit: false });
			return {
				success: true,
				actionType: "preview",
				summary
			};
		} catch (err: any) {
			console.error("❌ [calculatePayrollPreview Action Error]:", err);
			return fail(500, { message: err.message || "Gagal menghitung pratinjau payroll." });
		}
	},

	commitPayrollCalculation: async ({ request }) => {
		const formData = await request.formData();
		const period = formData.get("period")?.toString() || "2026-08-01";
		const mode = (formData.get("mode")?.toString() || "all") as "all" | "new_only";

		try {
			const summary = await runPayrollCalculation(period, { mode, commit: true });
			return {
				success: true,
				actionType: "committed",
				totalEmployees: summary.total_employees,
				period: summary.period,
				summary
			};
		} catch (err: any) {
			console.error("❌ [commitPayrollCalculation Action Error]:", err);
			return fail(500, { message: err.message || "Gagal menyimpan hasil perhitungan payroll ke database." });
		}
	},

	updateSlip: async ({ request, cookies }) => {
		const authToken = cookies.get("auth_token");
		const formData = await request.formData();
		const slipId = formData.get("slipId")?.toString();
		
		if (!slipId) return fail(400, { message: "ID Slip Gaji tidak ditemukan" });

		const payload = {
			work_days: parseInt(formData.get("work_days")?.toString() || "0"),
			absence_days: parseInt(formData.get("absence_days")?.toString() || "0"),
			overtime_hours: parseFloat(formData.get("overtime_hours")?.toString() || "0"),
			basic_salary: parseFloat(formData.get("basic_salary")?.toString() || "0"),
			professional_allowance: parseFloat(formData.get("professional_allowance")?.toString() || "0"),
			performance_allowance: parseFloat(formData.get("performance_allowance")?.toString() || "0"),
			position_allowance: parseFloat(formData.get("position_allowance")?.toString() || "0"),
			meal_allowance: parseFloat(formData.get("meal_allowance")?.toString() || "0"),
			transport_allowance: parseFloat(formData.get("transport_allowance")?.toString() || "0"),
			relocation_allowance: parseFloat(formData.get("relocation_allowance")?.toString() || "0"),
			skill_allowance: parseFloat(formData.get("skill_allowance")?.toString() || "0"),
			other_allowance: parseFloat(formData.get("other_allowance")?.toString() || "0"),
			incentive: parseFloat(formData.get("incentive")?.toString() || "0"),
			communication_allowance: parseFloat(formData.get("communication_allowance")?.toString() || "0"),
			overtime_allowance: parseFloat(formData.get("overtime_allowance")?.toString() || "0"),
			khk_allowance: parseFloat(formData.get("khk_allowance")?.toString() || "0"),
			zakat: parseFloat(formData.get("zakat")?.toString() || "0"),
			tax: parseFloat(formData.get("tax")?.toString() || "0"),
			bpjs: parseFloat(formData.get("bpjs")?.toString() || "0"),
			union_fee: parseFloat(formData.get("union_fee")?.toString() || "0"),
			absence_deduction: parseFloat(formData.get("absence_deduction")?.toString() || "0"),
			cooperative: parseFloat(formData.get("cooperative")?.toString() || "0"),
			bpr_installment: parseFloat(formData.get("bpr_installment")?.toString() || "0"),
			other_deduction: parseFloat(formData.get("other_deduction")?.toString() || "0")
		};

		const gross_salary = payload.basic_salary + payload.professional_allowance + payload.performance_allowance + payload.position_allowance + payload.meal_allowance + payload.transport_allowance + payload.relocation_allowance + payload.skill_allowance + payload.other_allowance + payload.incentive + payload.communication_allowance + payload.overtime_allowance + payload.khk_allowance;
		const total_deductions = payload.zakat + payload.tax + payload.bpjs + payload.union_fee + payload.absence_deduction + payload.cooperative + payload.bpr_installment + payload.other_deduction;
		const net_salary = gross_salary - total_deductions;

		try {
			// Update direct to PostgreSQL
			await sql`
				UPDATE presensi.salary_slips
				SET
					work_days = ${payload.work_days},
					absence_days = ${payload.absence_days},
					overtime_hours = ${payload.overtime_hours},
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
					zakat = ${payload.zakat},
					tax = ${payload.tax},
					bpjs = ${payload.bpjs},
					union_fee = ${payload.union_fee},
					absence_deduction = ${payload.absence_deduction},
					cooperative = ${payload.cooperative},
					bpr_installment = ${payload.bpr_installment},
					other_deduction = ${payload.other_deduction},
					gross_salary = ${gross_salary},
					total_deductions = ${total_deductions},
					net_salary = ${net_salary},
					updated_at = NOW()
				WHERE id = ${slipId}
			`;

			// Juga coba sync ke Laravel API jika tersedia
			apiFetch(`/api/v1/hris/payroll/slips/${slipId}`, {
				method: "PUT",
				body: JSON.stringify({ ...payload, net_salary })
			}, authToken).catch((e) => console.log("Laravel sync notice:", e?.message));

			return { success: true };
		} catch (apiErr: any) {
			console.error("❌ [Update Slip Error]:", apiErr?.message);
			return fail(500, { message: apiErr.message || "Gagal menyimpan ke database" });
		}
	},

	submitReimbursement: async ({ request, cookies }) => {
		const authToken = cookies.get("auth_token");
		const formData = await request.formData();
		const employee_nik = formData.get("employee_nik")?.toString() || "";
		const employee_name = formData.get("employee_name")?.toString() || "";
		const claim_type = formData.get("claim_type")?.toString() || "Rawat Jalan & Obat";
		const amount = parseFloat(formData.get("amount")?.toString() || "0");
		const description = formData.get("description")?.toString() || "";

		if (!employee_name || amount <= 0) {
			return fail(400, { message: "Nama karyawan dan nominal klaim valid wajib diisi." });
		}

		try {
			await apiFetch("/api/v1/hris/payroll/reimbursements", {
				method: "POST",
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
			console.error("❌ [Submit Reimbursement API] Error:", apiErr?.message);
			return fail(500, { message: apiErr.message || "Gagal menyimpan pengajuan klaim." });
		}
	},

	approveReimbursement: async ({ request, cookies }) => {
		const authToken = cookies.get("auth_token");
		const formData = await request.formData();
		const claimId = formData.get("claimId")?.toString();

		if (!claimId) return fail(400, { message: "ID klaim tidak ditemukan." });

		try {
			await apiFetch(`/api/v1/hris/payroll/reimbursements/${claimId}/approve`, {
				method: "POST"
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.error("❌ [Approve Reimbursement API] Error:", apiErr?.message);
			return fail(500, { message: apiErr.message || "Gagal menyetujui klaim." });
		}
	},

	rejectReimbursement: async ({ request, cookies }) => {
		const authToken = cookies.get("auth_token");
		const formData = await request.formData();
		const claimId = formData.get("claimId")?.toString();
		const rejection_reason = formData.get("rejection_reason")?.toString() || "Dokumen atau kuitansi tidak memenuhi syarat";

		if (!claimId) return fail(400, { message: "ID klaim tidak ditemukan." });

		try {
			await apiFetch(`/api/v1/hris/payroll/reimbursements/${claimId}/reject`, {
				method: "POST",
				body: JSON.stringify({ rejection_reason })
			}, authToken);
			return { success: true };
		} catch (apiErr: any) {
			console.error("❌ [Reject Reimbursement API] Error:", apiErr?.message);
			return fail(500, { message: apiErr.message || "Gagal menolak klaim." });
		}
	}
};
