import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		// 1. Resume Widget by 4 Categories: PACKAGING, TRANSPORT, WAREHOUSE, SUPPORTING
		const categories = ['PACKAGING', 'TRANSPORT', 'WAREHOUSE', 'SUPPORTING'];
		const categoryData = await Promise.all(
			categories.map(async (cat) => {
				const [poRow] = await sql`
					SELECT 
						COALESCE(SUM(po.total_amount), 0) as po_include_ppn,
						COALESCE(SUM(po.tax_amount), 0) as ppn_amount,
						COALESCE(SUM(po.subtotal), 0) as po_net,
						COUNT(po.id) as po_count
					FROM procurement.purchase_order po
					WHERE UPPER(po.category) = ${cat}
				`;

				const [wrsRow] = await sql`
					SELECT 
						COALESCE(SUM(grl.qty_received * pol.unit_price), 0) as wrs_value
					FROM procurement.goods_receipt_line grl
					JOIN procurement.purchase_order_line pol ON pol.id = grl.po_line_id
					JOIN procurement.purchase_order po ON po.id = pol.po_id
					WHERE UPPER(po.category) = ${cat}
				`;

				const poInclude = parseFloat(poRow?.po_include_ppn || '0');
				const ppn = parseFloat(poRow?.ppn_amount || '0');
				const poNet = parseFloat(poRow?.po_net || '0');
				const wrsVal = parseFloat(wrsRow?.wrs_value || '0');
				const fulfillmentPercent = poNet > 0 ? Math.min(100, Math.round((wrsVal / poNet) * 100)) : 0;

				return {
					category: cat,
					poInclude,
					ppn,
					poNet,
					wrsValue: wrsVal,
					fulfillmentPercent,
					poCount: parseInt(poRow?.po_count || '0')
				};
			})
		);

		// 2. Matrix PR vs PO vs WRS Qty & Ratios
		const matrixRows = await Promise.all(
			categories.map(async (cat) => {
				const [prRow] = await sql`
					SELECT COALESCE(SUM(prl.qty_requested), 0) as pr_qty
					FROM procurement.purchase_request_line prl
					JOIN procurement.purchase_request pr ON pr.id = prl.pr_id
					WHERE UPPER(pr.category) = ${cat}
				`;

				const [poRow] = await sql`
					SELECT COALESCE(SUM(pol.qty_ordered), 0) as po_qty
					FROM procurement.purchase_order_line pol
					JOIN procurement.purchase_order po ON po.id = pol.po_id
					WHERE UPPER(po.category) = ${cat}
				`;

				const [wrsRow] = await sql`
					SELECT COALESCE(SUM(grl.qty_received), 0) as wrs_qty
					FROM procurement.goods_receipt_line grl
					JOIN procurement.purchase_order_line pol ON pol.id = grl.po_line_id
					JOIN procurement.purchase_order po ON po.id = pol.po_id
					WHERE UPPER(po.category) = ${cat}
				`;

				const prQty = parseFloat(prRow?.pr_qty || '0');
				const poQty = parseFloat(poRow?.po_qty || '0');
				const wrsQty = parseFloat(wrsRow?.wrs_qty || '0');

				const ratioPoPr = prQty > 0 ? Math.min(100, Math.round((poQty / prQty) * 100)) : 100;
				const ratioWrsPo = poQty > 0 ? Math.min(100, Math.round((wrsQty / poQty) * 100)) : 0;

				return {
					category: cat,
					prQty,
					poQty,
					wrsQty,
					ratioPoPr,
					ratioWrsPo
				};
			})
		);

		// 3. Low stock alerts
		const lowStockAlerts = await sql`
			SELECT 
				m.id, m.material_code as code, m.name, m.uom as unit, 
				m.stock, m.min_stock as "minStock",
				COALESCE(l.loc_name, 'Gudang Pusat') as supplier
			FROM master.m_materials m
			LEFT JOIN master.m_lokasi l ON l.id = m.location_id
			WHERE m.stock <= m.min_stock AND m.is_active = true
			ORDER BY m.stock ASC
			LIMIT 5
		`;

		// 4. Recent Purchase Orders
		const recentPOs = await sql`
			SELECT 
				po.id, po.po_number, to_char(po.date, 'YYYY-MM-DD') as date,
				c.nama_kustomer as vendor, po.total_amount, po.status,
				COUNT(pol.id) as item_count
			FROM procurement.purchase_order po
			LEFT JOIN master.m_customer c ON c.id = po.vendor_id
			LEFT JOIN procurement.purchase_order_line pol ON pol.po_id = po.id
			GROUP BY po.id, c.nama_kustomer
			ORDER BY po.date DESC, po.id DESC
			LIMIT 5
		`;

		// 5. Total Summaries
		const totalPOValue = categoryData.reduce((sum, c) => sum + c.poInclude, 0);
		const totalWRSValue = categoryData.reduce((sum, c) => sum + c.wrsValue, 0);

		return {
			categoryResume: categoryData,
			matrixRows,
			lowStockAlerts,
			recentPOs,
			totalPOValue,
			totalWRSValue
		};
	} catch (err: any) {
		console.error('Error loading PMS dashboard:', err);
		return {
			categoryResume: [],
			matrixRows: [],
			lowStockAlerts: [],
			recentPOs: [],
			totalPOValue: 0,
			totalWRSValue: 0
		};
	}
};
