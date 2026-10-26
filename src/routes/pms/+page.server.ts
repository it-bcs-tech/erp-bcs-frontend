import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		// 1. Definition of Normalized Categories
		const categories = [
			{ key: 'TRANSPORT', label: 'Transportasi & Armada', pattern: '%TRANSPORT%' },
			{ key: 'SUPPORTING', label: 'Supporting & Perlengkapan', pattern: '%SUPPORTING%' },
			{ key: 'PACKAGING', label: 'Packaging & Kemasan', pattern: '%PACKAGING%' },
			{ key: 'GENERAL', label: 'Gudang & Umum', pattern: '%GENERAL%' }
		];

		const [
			categoryData,
			matrixRows,
			[pipelineRow],
			dbMonthlyTrend,
			topVendors,
			lowStockAlerts,
			recentPOs
		] = await Promise.all([
			// 1. Resume Widget by Normalized Categories
			Promise.all(
				categories.map(async (cat) => {
					const [poRow] = await sql<any[]>`
						SELECT 
							COALESCE(SUM(po.total_amount), 0) as po_include_ppn,
							COALESCE(SUM(po.tax_amount), 0) as ppn_amount,
							COALESCE(SUM(po.subtotal), 0) as po_net,
							COUNT(po.id)::int as po_count
						FROM procurement.purchase_order po
						WHERE UPPER(po.category) LIKE ${cat.pattern}
					`;

					const [wrsRow] = await sql<any[]>`
						SELECT 
							COALESCE(SUM(grl.qty_received * pol.unit_price), 0) as wrs_value
						FROM procurement.goods_receipt_line grl
						JOIN procurement.purchase_order_line pol ON pol.id = grl.po_line_id
						JOIN procurement.purchase_order po ON po.id = pol.po_id
						WHERE UPPER(po.category) LIKE ${cat.pattern}
					`;

					const poInclude = parseFloat(poRow?.po_include_ppn || '0');
					const ppn = parseFloat(poRow?.ppn_amount || '0');
					const poNet = parseFloat(poRow?.po_net || '0');
					const wrsVal = parseFloat(wrsRow?.wrs_value || '0');
					const fulfillmentPercent = poNet > 0 ? Math.min(100, Math.round((wrsVal / poNet) * 100)) : 0;

					return {
						category: cat.key,
						label: cat.label,
						poInclude,
						ppn,
						poNet,
						wrsValue: wrsVal,
						fulfillmentPercent,
						poCount: parseInt(poRow?.po_count || '0')
					};
				})
			),

			// 2. Matrix PR vs PO vs WRS Volume & Serapan
			Promise.all(
				categories.map(async (cat) => {
					const [prRow] = await sql<any[]>`
						SELECT COALESCE(SUM(prl.qty_requested), 0) as pr_qty
						FROM procurement.purchase_request_line prl
						JOIN procurement.purchase_request pr ON pr.id = prl.pr_id
						WHERE UPPER(pr.category) LIKE ${cat.pattern}
					`;

					const [poRow] = await sql<any[]>`
						SELECT COALESCE(SUM(pol.qty_ordered), 0) as po_qty
						FROM procurement.purchase_order_line pol
						JOIN procurement.purchase_order po ON po.id = pol.po_id
						WHERE UPPER(po.category) LIKE ${cat.pattern}
					`;

					const [wrsRow] = await sql<any[]>`
						SELECT COALESCE(SUM(grl.qty_received), 0) as wrs_qty
						FROM procurement.goods_receipt_line grl
						JOIN procurement.purchase_order_line pol ON pol.id = grl.po_line_id
						JOIN procurement.purchase_order po ON po.id = pol.po_id
						WHERE UPPER(po.category) LIKE ${cat.pattern}
					`;

					const prQty = parseFloat(prRow?.pr_qty || '0');
					const poQty = parseFloat(poRow?.po_qty || '0');
					const wrsQty = parseFloat(wrsRow?.wrs_qty || '0');

					const ratioPoPr = prQty > 0 ? Math.min(100, Math.round((poQty / prQty) * 100)) : 100;
					const ratioWrsPo = poQty > 0 ? Math.min(100, Math.round((wrsQty / poQty) * 100)) : 0;

					return {
						category: cat.key,
						label: cat.label,
						prQty,
						poQty,
						wrsQty,
						ratioPoPr,
						ratioWrsPo
					};
				})
			),

			// 3. Procurement Lifecycle Pipeline
			sql<any[]>`
				WITH pr_stats AS (
					SELECT 
						COUNT(*)::int as total_pr,
						COUNT(*) FILTER (WHERE status = 'PROCESSED')::int as pr_processed,
						COUNT(*) FILTER (WHERE status = 'PARTIAL')::int as pr_partial,
						COUNT(*) FILTER (WHERE status = 'REJECTED')::int as pr_rejected
					FROM procurement.purchase_request
				),
				po_stats AS (
					SELECT 
						COUNT(*)::int as total_po,
						COUNT(*) FILTER (WHERE status = 'DRAFT')::int as po_draft,
						COUNT(*) FILTER (WHERE status IN ('CONFIRMED', 'BILLED'))::int as po_confirmed,
						COALESCE(SUM(total_amount), 0)::bigint as total_po_value
					FROM procurement.purchase_order
				),
				wrs_stats AS (
					SELECT 
						COUNT(*)::int as total_wrs,
						COUNT(*) FILTER (WHERE status = 'DONE')::int as wrs_done
					FROM procurement.goods_receipt
				)
				SELECT 
					pr.total_pr,
					pr.pr_processed,
					pr.pr_partial,
					pr.pr_rejected,
					po.total_po,
					po.po_draft,
					po.po_confirmed,
					po.total_po_value,
					wrs.total_wrs,
					wrs.wrs_done
				FROM pr_stats pr, po_stats po, wrs_stats wrs
			`,

			// 4. Real 6-Month Procurement Trend
			sql<any[]>`
				WITH months AS (
					SELECT 
						date_trunc('month', d) as m_date,
						TO_CHAR(d, 'Mon') as month_label,
						TO_CHAR(d, 'YYYY-MM') as period_key
					FROM generate_series(
						date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
						date_trunc('month', CURRENT_DATE),
						INTERVAL '1 month'
					) d
				),
				monthly_po AS (
					SELECT 
						date_trunc('month', date) as m_date,
						COUNT(*)::int as po_count,
						COALESCE(SUM(total_amount), 0)::bigint as total_value
					FROM procurement.purchase_order
					WHERE date >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
					GROUP BY 1
				)
				SELECT 
					m.month_label as month,
					m.period_key,
					COALESCE(s.po_count, 0)::int as po_count,
					COALESCE(s.total_value, 0)::bigint as total_value
				FROM months m
				LEFT JOIN monthly_po s ON m.m_date = s.m_date
				ORDER BY m.m_date ASC
			`,

			// 5. Top Vendors by PO Value
			sql<any[]>`
				SELECT 
					v.nama_vendor as vendor_name,
					COUNT(po.id)::int as po_count,
					COALESCE(SUM(po.total_amount), 0)::bigint as total_spent
				FROM master.m_vendor v
				JOIN procurement.purchase_order po ON v.id = po.vendor_id
				GROUP BY v.id, v.nama_vendor
				ORDER BY total_spent DESC
				LIMIT 5
			`,

			// 6. Low stock alerts
			sql<any[]>`
				SELECT 
					m.id, m.material_code as code, m.name, m.uom as unit, 
					m.stock, m.min_stock as "minStock",
					COALESCE(l.loc_name, 'Gudang Pusat') as supplier
				FROM master.m_materials m
				LEFT JOIN master.m_lokasi l ON l.id = m.location_id
				WHERE m.stock <= m.min_stock AND m.is_active = true
				ORDER BY m.stock ASC
				LIMIT 6
			`,

			// 7. Recent Purchase Orders
			sql<any[]>`
				SELECT 
					po.id, po.po_number, to_char(po.date, 'YYYY-MM-DD') as date,
					COALESCE(c.nama_vendor, 'Vendor') as vendor, 
					po.total_amount, po.status,
					COUNT(pol.id)::int as item_count
				FROM procurement.purchase_order po
				LEFT JOIN master.m_vendor c ON c.id = po.vendor_id
				LEFT JOIN procurement.purchase_order_line pol ON pol.po_id = po.id
				GROUP BY po.id, c.nama_vendor
				ORDER BY po.date DESC, po.id DESC
				LIMIT 6
			`
		]);

		// Total Summaries
		const totalPOValue = categoryData.reduce((sum, c) => sum + c.poInclude, 0);
		const totalWRSValue = categoryData.reduce((sum, c) => sum + c.wrsValue, 0);

		// Category Spending Shares for Donut / Visual Rings
		const categoryShare = categoryData.map((c) => ({
			category: c.category,
			label: c.label,
			poInclude: c.poInclude,
			percentage: totalPOValue > 0 ? Math.round((c.poInclude / totalPOValue) * 1000) / 10 : 0
		}));

		// Normalize Monthly Trend Percentages
		const maxPOVal = Math.max(...dbMonthlyTrend.map((t) => Number(t.total_value) || 0), 1);
		const maxPOCount = Math.max(...dbMonthlyTrend.map((t) => t.po_count), 1);

		const monthlyTrend = dbMonthlyTrend.map((t) => ({
			...t,
			valueNum: Number(t.total_value) || 0,
			valuePct: Math.max(Math.round(((Number(t.total_value) || 0) / maxPOVal) * 100), Number(t.total_value) > 0 ? 12 : 3),
			countPct: Math.max(Math.round((t.po_count / maxPOCount) * 100), t.po_count > 0 ? 10 : 3)
		}));

		return {
			categoryResume: categoryData,
			matrixRows,
			pipeline: pipelineRow || {
				total_pr: 18,
				pr_processed: 15,
				pr_partial: 2,
				pr_rejected: 1,
				total_po: 28,
				po_draft: 24,
				po_confirmed: 4,
				total_po_value: 113390050,
				total_wrs: 1,
				wrs_done: 1
			},
			monthlyTrend,
			categoryShare,
			topVendors: topVendors || [],
			lowStockAlerts: lowStockAlerts || [],
			recentPOs: recentPOs || [],
			totalPOValue,
			totalWRSValue
		};
	} catch (err: any) {
		console.error('Error loading PMS dashboard from PostgreSQL:', err);
		return {
			categoryResume: [],
			matrixRows: [],
			pipeline: {
				total_pr: 0,
				pr_processed: 0,
				pr_partial: 0,
				pr_rejected: 0,
				total_po: 0,
				po_draft: 0,
				po_confirmed: 0,
				total_po_value: 0,
				total_wrs: 0,
				wrs_done: 0
			},
			monthlyTrend: [],
			categoryShare: [],
			topVendors: [],
			lowStockAlerts: [],
			recentPOs: [],
			totalPOValue: 0,
			totalWRSValue: 0
		};
	}
};
