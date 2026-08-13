import { json } from '@sveltejs/kit';
import sql from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const { id } = params;

	try {
		const lines = await sql`
			SELECT 
				pol.id as po_line_id,
				pol.item_id,
				m.material_code,
				m.name as item_name,
				m.part_no,
				pol.qty_ordered,
				pol.unit_price,
				pol.tax_id,
				pol.tax_amount,
				pol.total,
				0 as qty_received_so_far
			FROM procurement.purchase_order_line pol
			JOIN master.m_materials m ON m.id = pol.item_id
			WHERE pol.po_id = ${id}
		`;

		return json({
			success: true,
			data: lines
		});
	} catch (error: any) {
		console.error("Error fetching PO lines:", error);
		return json({
			success: false,
			message: "Gagal mengambil rincian Purchase Order."
		}, { status: 500 });
	}
};
