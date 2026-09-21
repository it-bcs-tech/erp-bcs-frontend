import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const q = (url.searchParams.get('q') || '').trim();
		const startDate = (url.searchParams.get('startDate') || '').trim();
		const endDate = (url.searchParams.get('endDate') || '').trim();
		const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
		const limit = Math.min(100, Math.max(5, parseInt(url.searchParams.get('limit') || '15', 10)));
		const offset = (page - 1) * limit;

		const conditions = [];

		// Filter pencarian teks
		if (q) {
			const pattern = `%${q}%`;
			conditions.push(sql`(
				po.po_number ILIKE ${pattern} OR 
				m.name ILIKE ${pattern} OR 
				m.material_code ILIKE ${pattern} OR 
				p.project_name ILIKE ${pattern} OR 
				c.nama_vendor ILIKE ${pattern} OR
				m.spec ILIKE ${pattern} OR
				pol.remarks ILIKE ${pattern} OR
				po.notes ILIKE ${pattern} OR
				po.wrs_notes ILIKE ${pattern}
			)`);
		}

		// Filter tanggal antara
		if (startDate && !isNaN(new Date(startDate).getTime())) {
			conditions.push(sql`po.date >= ${startDate}::date`);
		}
		if (endDate && !isNaN(new Date(endDate).getTime())) {
			conditions.push(sql`po.date <= ${endDate}::date`);
		}

		const whereClause = conditions.length > 0 
			? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}` 
			: sql``;

		// 1. Get Summary & Total Count
		const [summary] = await sql`
			SELECT 
				count(*)::int as total_count,
				COALESCE(SUM(pol.total), 0)::numeric as total_value,
				COALESCE(SUM(pol.qty_ordered), 0)::numeric as total_qty
			FROM procurement.purchase_order_line pol
			JOIN procurement.purchase_order po ON po.id = pol.po_id
			JOIN master.m_materials m ON m.id = pol.item_id
			LEFT JOIN master.m_project p ON p.id = po.project_id
			LEFT JOIN master.m_vendor c ON c.id = po.vendor_id
			${whereClause}
		`;

		const totalCount = parseInt(summary?.total_count || '0', 10);
		const totalPages = Math.max(1, Math.ceil(totalCount / limit));
		const totalValue = parseFloat(summary?.total_value || '0');
		const totalQty = parseFloat(summary?.total_qty || '0');

		// 2. Get Paginated History Rows with remarks and wrsNotes
		const history = await sql`
			SELECT 
				pol.id,
				po.id as "poId",
				po.po_number as "poNumber",
				to_char(po.date, 'YYYY-MM-DD') as "poDate",
				p.project_name as "projectName",
				m.material_code as "materialCode",
				m.name as "materialName",
				COALESCE(m.spec, '-') as spec,
				m.uom,
				pol.qty_ordered as "qtyOrdered",
				pol.unit_price as "unitPrice",
				pol.total,
				c.nama_vendor as "vendorName",
				COALESCE(NULLIF(pol.remarks, ''), NULLIF(po.notes, ''), '-') as remarks,
				COALESCE(NULLIF(po.wrs_notes, ''), (SELECT string_agg(gr.notes, ', ') FROM procurement.goods_receipt gr WHERE gr.po_id = po.id AND gr.notes IS NOT NULL AND gr.notes != ''), '-') as "wrsNotes"
			FROM procurement.purchase_order_line pol
			JOIN procurement.purchase_order po ON po.id = pol.po_id
			JOIN master.m_materials m ON m.id = pol.item_id
			LEFT JOIN master.m_project p ON p.id = po.project_id
			LEFT JOIN master.m_vendor c ON c.id = po.vendor_id
			${whereClause}
			ORDER BY po.date DESC, pol.id DESC
			LIMIT ${limit} OFFSET ${offset}
		`;

		return {
			history,
			pagination: {
				page,
				limit,
				totalCount,
				totalPages,
				offset
			},
			summary: {
				totalCount,
				totalValue,
				totalQty
			},
			filters: {
				q,
				startDate,
				endDate
			}
		};
	} catch (err: any) {
		console.error('Error loading material history:', err);
		return {
			history: [],
			pagination: {
				page: 1,
				limit: 15,
				totalCount: 0,
				totalPages: 1,
				offset: 0
			},
			summary: {
				totalCount: 0,
				totalValue: 0,
				totalQty: 0
			},
			filters: {
				q: '',
				startDate: '',
				endDate: ''
			}
		};
	}
};
