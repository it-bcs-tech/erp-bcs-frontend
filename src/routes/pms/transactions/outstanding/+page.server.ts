import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		// 1. OS Order: PR yang belum memiliki PO atau berstatus APPROVED/PENDING
		const osOrders = await sql`
			SELECT 
				pr.id,
				pr.pr_number as "prNumber",
				to_char(pr.date, 'YYYY-MM-DD') as date,
				pr.requested_by as "requestedBy",
				pr.department,
				p.project_name as "projectName",
				l.loc_name as "siteName",
				m.material_code as "materialCode",
				m.name as "materialName",
				COALESCE(m.spec, '-') as spec,
				m.uom,
				prl.qty_requested as "qtyRequested",
				pr.status
			FROM procurement.purchase_request_line prl
			JOIN procurement.purchase_request pr ON pr.id = prl.pr_id
			JOIN master.m_materials m ON m.id = prl.item_id
			LEFT JOIN master.m_project p ON p.id = pr.project_id
			LEFT JOIN master.m_lokasi l ON l.id = pr.site_id
			WHERE pr.status IN ('PENDING', 'APPROVED')
			ORDER BY pr.date ASC
		`;

		// 2. OS WRS: PO vs WRS (PO Qty - Received Qty > 0)
		const osWrs = await sql`
			SELECT 
				po.id as po_id,
				po.po_number as "poNumber",
				to_char(po.date, 'YYYY-MM-DD') as "poDate",
				c.nama_kustomer as "vendorName",
				p.project_name as "projectName",
				l.loc_name as "siteName",
				m.material_code as "materialCode",
				m.name as "materialName",
				COALESCE(m.spec, '-') as spec,
				m.uom,
				pol.qty_ordered as "qtyOrdered",
				COALESCE((
					SELECT SUM(grl.qty_received)
					FROM procurement.goods_receipt_line grl
					WHERE grl.po_line_id = pol.id
				), 0) as "qtyReceived",
				pol.unit_price as "unitPrice",
				po.currency,
				po.notes as remarks
			FROM procurement.purchase_order_line pol
			JOIN procurement.purchase_order po ON po.id = pol.po_id
			JOIN master.m_materials m ON m.id = pol.item_id
			LEFT JOIN master.m_customer c ON c.id = po.vendor_id
			LEFT JOIN master.m_project p ON p.id = po.project_id
			LEFT JOIN master.m_lokasi l ON l.id = po.site_id
			WHERE po.status IN ('CONFIRMED', 'PARTIAL_RECEIVED', 'APPROVED')
			ORDER BY po.date ASC
		`;

		const processedOsWrs = osWrs.map((r: any) => {
			const ordered = parseFloat(r.qtyOrdered) || 0;
			const received = parseFloat(r.qtyReceived) || 0;
			const outstanding = Math.max(0, ordered - received);
			const price = parseFloat(r.unitPrice) || 0;
			return {
				...r,
				qtyOutstanding: outstanding,
				totalOutstanding: outstanding * price
			};
		}).filter((r: any) => r.qtyOutstanding > 0);

		// 3. OS History: PO history with pricing and fulfillment
		const osHistory = await sql`
			SELECT 
				po.po_number as "poNumber",
				to_char(po.date, 'YYYY-MM-DD') as "poDate",
				c.nama_kustomer as "vendorName",
				m.material_code as "materialCode",
				m.name as "materialName",
				m.uom,
				pol.qty_ordered as "qtyOrdered",
				pol.unit_price as "unitPrice",
				pol.total,
				po.status
			FROM procurement.purchase_order_line pol
			JOIN procurement.purchase_order po ON po.id = pol.po_id
			JOIN master.m_materials m ON m.id = pol.item_id
			LEFT JOIN master.m_customer c ON c.id = po.vendor_id
			ORDER BY po.id DESC
			LIMIT 50
		`;

		return {
			osOrders,
			osWrs: processedOsWrs,
			osHistory
		};
	} catch (err: any) {
		console.error('Error loading Outstanding Hub:', err);
		return { osOrders: [], osWrs: [], osHistory: [] };
	}
};
