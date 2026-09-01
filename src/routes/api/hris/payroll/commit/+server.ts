import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { apiFetch } from "$lib/utils/api";
import { runPayrollCalculation } from "$lib/server/payrollEngine";

export const POST: RequestHandler = async ({ request, cookies }) => {
	const authToken = cookies.get('auth_token');

	try {
		let period = "2026-08-01";
		let mode: "all" | "new_only" = "all";

		const contentType = request.headers.get("content-type") || "";
		if (contentType.includes("application/json")) {
			const body = await request.json();
			if (body.period) period = body.period;
			if (body.mode) mode = body.mode;
		} else {
			const formData = await request.formData();
			const p = formData.get("period")?.toString();
			const m = formData.get("mode")?.toString();
			if (p) period = p;
			if (m === "new_only" || m === "all") mode = m;
		}

		// 1. Panggil Laravel API Endpoint
		try {
			const res = await apiFetch<any>('/api/v1/hris/payroll/commit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ period, mode })
			}, authToken);

			if (res && (res.status === 'success' || res.data)) {
				return json({
					success: true,
					status: "success",
					message: res.message || "Payroll berhasil dikunci via Laravel API.",
					summary: res.data?.summary || res.data || res,
					source: 'laravel'
				});
			}
		} catch (apiErr: any) {
			console.warn("⚠️ [Laravel Commit API]:", apiErr?.message);
		}

		// 2. Engine internal
		const summary = await runPayrollCalculation(period, { mode, commit: true });

		return json({
			success: true,
			status: "success",
			message: "Kalkulasi payroll berhasil dihitung dan dikunci ke database.",
			summary,
			source: 'internal-engine'
		});
	} catch (err: any) {
		console.error("❌ [API Payroll Commit Error]:", err);
		return json(
			{
				success: false,
				status: "error",
				message: err?.message || "Gagal mengunci kalkulasi payroll."
			},
			{ status: 500 }
		);
	}
};
