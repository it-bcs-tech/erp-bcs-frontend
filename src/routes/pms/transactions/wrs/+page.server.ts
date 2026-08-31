import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		const receipts = await sql`
			SELECT 
				gr.id,
				gr.gr_number as "grNumber",
				to_char(gr.date, 'YYYY-MM-DD') as date,
				po.po_number as "poNumber",
				po.id as po_id,
				c.nama_kustomer as "supplierName",
				l.loc_name as "siteName",
				gr.vendor_delivery_number as "vendorDeliveryNumber",
				gr.status,
				gr.notes,
				gr.created_by as "receivedBy",
				COUNT(grl.id) as item_count,
				COALESCE(SUM(grl.qty_received), 0) as total_qty_received
			FROM procurement.goods_receipt gr
			LEFT JOIN procurement.purchase_order po ON po.id = gr.po_id
			LEFT JOIN master.m_customer c ON c.id = COALESCE(gr.supplier_id, po.vendor_id)
			LEFT JOIN master.m_lokasi l ON l.id = COALESCE(gr.site_id, po.site_id)
			LEFT JOIN procurement.goods_receipt_line grl ON grl.gr_id = gr.id
			GROUP BY gr.id, po.po_number, po.id, c.nama_kustomer, l.loc_name
			ORDER BY gr.id DESC
		`;

		let filtered = receipts;
		if (search) {
			filtered = filtered.filter(r =>
				(r.grNumber && r.grNumber.toLowerCase().includes(search)) ||
				(r.poNumber && r.poNumber.toLowerCase().includes(search)) ||
				(r.supplierName && r.supplierName.toLowerCase().includes(search)) ||
				(r.vendorDeliveryNumber && r.vendorDeliveryNumber.toLowerCase().includes(search))
			);
		}

		return {
			receipts: filtered
		};
	} catch (err: any) {
		console.error('Error loading WRS list:', err);
		return { receipts: [] };
	}
};
