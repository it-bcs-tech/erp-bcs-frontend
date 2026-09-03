import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const typeFilter = url.searchParams.get('type') || 'All';
		const statusFilter = url.searchParams.get('status') || 'All';
		const riskFilter = url.searchParams.get('risk') || 'All';

		const reports = await sql`
			SELECT 
				id,
				report_number,
				report_type,
				date,
				location,
				observer_name,
				finding_description,
				risk_level,
				immediate_action,
				capa_action,
				capa_pic,
				capa_due_date,
				status,
				photo_url,
				created_at
			FROM qhse.proactive_reports
			ORDER BY date DESC
		`;

		let filtered = reports as any[];
		if (typeFilter !== 'All') filtered = filtered.filter(r => r.report_type === typeFilter);
		if (statusFilter !== 'All') filtered = filtered.filter(r => r.status === statusFilter);
		if (riskFilter !== 'All') filtered = filtered.filter(r => r.risk_level === riskFilter);

		const summary = {
			total: reports.length,
			inspections: reports.filter((r: any) => r.report_type === 'INSPECTION_P2H').length,
			patrolAndSot: reports.filter((r: any) => r.report_type === 'SAFETY_PATROL' || r.report_type === 'SAFETY_OBSERVATION_TOUR').length,
			nearmiss: reports.filter((r: any) => r.report_type === 'NEARMISS').length,
			auditReports: reports.filter((r: any) => r.report_type === 'AUDIT_REPORT').length,
			openCapa: reports.filter((r: any) => r.status === 'OPEN' || r.status === 'IN_PROGRESS').length,
			closedCapa: reports.filter((r: any) => r.status === 'VERIFIED_CLOSED').length
		};

		return {
			reports: filtered,
			summary,
			filters: { type: typeFilter, status: statusFilter, risk: riskFilter }
		};
	} catch (error) {
		console.error("Error loading proactive reports:", error);
		return {
			reports: [],
			summary: { total: 0, inspections: 0, patrolAndSot: 0, nearmiss: 0, auditReports: 0, openCapa: 0, closedCapa: 0 },
			filters: { type: 'All', status: 'All', risk: 'All' }
		};
	}
};

export const actions: Actions = {
	createReport: async ({ request }) => {
		const data = await request.formData();
		const reportType = data.get('report_type') as string;
		const location = data.get('location') as string;
		const observerName = data.get('observer_name') as string;
		const finding = data.get('finding_description') as string;
		const riskLevel = data.get('risk_level') as string || 'Medium';
		const immediateAction = data.get('immediate_action') as string || null;
		const capaAction = data.get('capa_action') as string || null;
		const capaPic = data.get('capa_pic') as string || null;
		const capaDueDate = data.get('capa_due_date') as string || null;
		const photoUrl = data.get('photo_url') as string || null;

		if (!reportType || !location || !observerName || !finding) {
			return fail(400, { message: 'Harap lengkapi jenis observasi, lokasi, pelapor, dan deskripsi temuan!' });
		}

		try {
			const countRes = await sql`SELECT count(*) FROM qhse.proactive_reports`;
			const seq = (parseInt(countRes[0].count, 10) + 1).toString().padStart(4, '0');
			const prefix = reportType === 'NEARMISS' ? 'NMR' : reportType === 'AUDIT_REPORT' ? 'AUD' : 'OBS';
			const reportNumber = `${prefix}-${new Date().getFullYear()}-${seq}`;

			await sql`
				INSERT INTO qhse.proactive_reports (
					report_number, report_type, date, location, observer_name,
					finding_description, risk_level, immediate_action, capa_action,
					capa_pic, capa_due_date, status, photo_url
				) VALUES (
					${reportNumber}, ${reportType}, CURRENT_TIMESTAMP, ${location}, ${observerName},
					${finding}, ${riskLevel}, ${immediateAction}, ${capaAction},
					${capaPic}, ${capaDueDate ? new Date(capaDueDate) : null}, 'OPEN', ${photoUrl}
				)
			`;

			return { success: true, message: `Laporan Temuan ${reportNumber} berhasil dicatat.` };
		} catch (e: any) {
			console.error("Create proactive report error:", e);
			return fail(500, { error: e.message || 'Gagal menyimpan laporan proaktif.' });
		}
	},

	updateCapa: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const status = data.get('status') as string || 'VERIFIED_CLOSED';

		if (!id) return fail(400, { message: 'ID laporan tidak ditemukan.' });

		try {
			await sql`
				UPDATE qhse.proactive_reports
				SET status = ${status}
				WHERE id = ${id}
			`;

			return { success: true, message: `Status CAPA berhasil diperbarui (${status}).` };
		} catch (e: any) {
			console.error("Update CAPA error:", e);
			return fail(500, { error: e.message || 'Gagal update CAPA.' });
		}
	}
};
