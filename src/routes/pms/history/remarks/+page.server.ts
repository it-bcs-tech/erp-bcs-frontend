import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		const history = await sql`
			SELECT 
				po.id,
				po.po_number as "poNumber",
				to_char(po.date, 'YYYY-MM-DD') as "poDate",
				c.nama_kustomer as "vendorName",
				COALESCE(po.notes, '-') as remarks,
				COALESCE(po.wrs_notes, '-') as "wrsNotes",
				po.total_amount as "totalAmount",
				po.status
			FROM procurement.purchase_order po
			LEFT JOIN master.m_customer c ON c.id = po.vendor_id
			WHERE po.notes IS NOT NULL AND po.notes != ''
			ORDER BY po.date DESC
		`;

		let filtered = history;
		if (search) {
			filtered = filtered.filter(h =>
				(h.poNumber && h.poNumber.toLowerCase().includes(search)) ||
				(h.vendorName && h.vendorName.toLowerCase().includes(search)) ||
				(h.remarks && h.remarks.toLowerCase().includes(search)) ||
				(h.wrsNotes && h.wrsNotes.toLowerCase().includes(search))
			);
		}

		return {
			history: filtered
		};
	} catch (err: any) {
		console.error('Error loading remarks history:', err);
		return { history: [] };
	}
};
