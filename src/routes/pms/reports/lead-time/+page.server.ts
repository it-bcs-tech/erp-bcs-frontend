import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		const leadTimes = await sql`
			SELECT 
				po.id as po_id,
				po.po_number as "poNumber",
				to_char(po.date, 'YYYY-MM-DD') as "poDate",
				pr.pr_number as "prNumber",
				to_char(pr.date, 'YYYY-MM-DD') as "prDate",
				gr.gr_number as "grNumber",
				to_char(gr.date, 'YYYY-MM-DD') as "grDate",
				c.nama_kustomer as "vendorName",
				p.project_name as "projectName",
				COALESCE(po.date - pr.date, 0) as "daysPrToPo",
				COALESCE(gr.date - po.date, 0) as "daysPoToGr",
				COALESCE(gr.date - pr.date, 0) as "totalCycleDays"
			FROM procurement.purchase_order po
			LEFT JOIN procurement.purchase_order_line pol ON pol.po_id = po.id
			LEFT JOIN procurement.purchase_request_line prl ON prl.id = pol.pr_line_id
			LEFT JOIN procurement.purchase_request pr ON pr.id = prl.pr_id
			LEFT JOIN procurement.goods_receipt gr ON gr.po_id = po.id
			LEFT JOIN master.m_customer c ON c.id = po.vendor_id
			LEFT JOIN master.m_project p ON p.id = po.project_id
			GROUP BY po.id, po.po_number, po.date, pr.pr_number, pr.date, gr.gr_number, gr.date, c.nama_kustomer, p.project_name
			ORDER BY po.date DESC
		`;

		// Average calculations
		const withPrToPo = leadTimes.filter((l: any) => l.daysPrToPo >= 0 && l.prNumber);
		const avgPrToPo = withPrToPo.length > 0 ? Math.round(withPrToPo.reduce((s: number, l: any) => s + l.daysPrToPo, 0) / withPrToPo.length) : 2;

		const withPoToGr = leadTimes.filter((l: any) => l.daysPoToGr >= 0 && l.grNumber);
		const avgPoToGr = withPoToGr.length > 0 ? Math.round(withPoToGr.reduce((s: number, l: any) => s + l.daysPoToGr, 0) / withPoToGr.length) : 4;

		const avgTotalCycle = avgPrToPo + avgPoToGr;

		return {
			leadTimes,
			metrics: {
				avgPrToPo,
				avgPoToGr,
				avgTotalCycle
			}
		};
	} catch (err: any) {
		console.error('Error loading Lead Time report:', err);
		return { leadTimes: [], metrics: { avgPrToPo: 0, avgPoToGr: 0, avgTotalCycle: 0 } };
	}
};
