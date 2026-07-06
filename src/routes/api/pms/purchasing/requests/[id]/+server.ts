import { json } from '@sveltejs/kit';
import sql from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const { id } = params;

	try {
		const lines = await sql`
			SELECT 
				prl.id as pr_line_id,
				prl.item_id,
				m.material_code,
				m.name as item_name,
				m.part_no,
				prl.qty_requested,
				prl.remarks
			FROM procurement.purchase_request_line prl
			JOIN master.m_materials m ON m.id = prl.item_id
			WHERE prl.pr_id = ${id}
		`;

		return json({
			success: true,
			data: lines
		});
	} catch (error: any) {
		console.error("Error fetching PR lines:", error);
		return json({
			success: false,
			message: "Gagal mengambil rincian Purchase Request."
		}, { status: 500 });
	}
};
