import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { runPayrollCalculation } from "$lib/server/payrollEngine";

export const POST: RequestHandler = async ({ request }) => {
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

		// Jalankan Payroll Engine langsung ke PostgreSQL agar Hari Kerja (HK), Tunjangan Makan (Rp 10.000/HK),
		// dan Tunjangan Transport (Rp 7.000/HK) terhubung riil dengan log presensi aktual
		const summary = await runPayrollCalculation(period, { mode, commit: false });

		return json({
			success: true,
			status: "success",
			summary,
			source: 'internal-engine'
		});
	} catch (err: any) {
		console.error("❌ [API Payroll Calculate Error]:", err);
		return json(
			{
				success: false,
				status: "error",
				message: err?.message || "Gagal menjalankan simulasi kalkulasi payroll."
			},
			{ status: 500 }
		);
	}
};
