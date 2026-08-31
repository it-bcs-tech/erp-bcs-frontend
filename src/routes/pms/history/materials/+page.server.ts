import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		const history = await sql`
			SELECT 
				pol.id,
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
				c.nama_kustomer as "vendorName",
				COALESCE(po.notes, '-') as remarks
			FROM procurement.purchase_order_line pol
			JOIN procurement.purchase_order po ON po.id = pol.po_id
			JOIN master.m_materials m ON m.id = pol.item_id
			LEFT JOIN master.m_project p ON p.id = po.project_id
			LEFT JOIN master.m_customer c ON c.id = po.vendor_id
			ORDER BY po.date DESC, pol.id DESC
		`;

		let filtered = history;
		if (search) {
			filtered = filtered.filter(h =>
				(h.materialName && h.materialName.toLowerCase().includes(search)) ||
				(h.materialCode && h.materialCode.toLowerCase().includes(search)) ||
				(h.projectName && h.projectName.toLowerCase().includes(search)) ||
				(h.vendorName && h.vendorName.toLowerCase().includes(search))
			);
		}

		return {
			history: filtered
		};
	} catch (err: any) {
		console.error('Error loading material history:', err);
		return { history: [] };
	}
};
