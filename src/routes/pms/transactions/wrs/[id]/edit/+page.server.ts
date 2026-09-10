import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { error, fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const wrsId = parseInt(params.id);
	if (isNaN(wrsId)) {
		throw error(404, 'WRS ID tidak valid');
	}

	try {
		const [wrs] = await sql`
			SELECT 
				gr.id,
				gr.gr_number as "grNumber",
				to_char(gr.date, 'YYYY-MM-DD') as date,
				gr.po_id as "poId",
				po.po_number as "poNumber",
				c.nama_kustomer as "supplierName",
				gr.site_id as "siteId",
				gr.vendor_delivery_number as "vendorDeliveryNumber",
				gr.notes
			FROM procurement.goods_receipt gr
			LEFT JOIN procurement.purchase_order po ON po.id = gr.po_id
			LEFT JOIN master.m_customer c ON c.id = COALESCE(gr.supplier_id, po.vendor_id)
			WHERE gr.id = ${wrsId}
		`;

		if (!wrs) {
			throw error(404, 'WRS tidak ditemukan');
		}

		const items = await sql`
			SELECT 
				grl.id as line_id,
				grl.item_id as material_id,
				m.material_code,
				m.name,
				m.spec,
				m.brand,
				m.uom,
				m.stock,
				grl.qty_received as qty,
				pol.qty_ordered as "qtyOrdered"
			FROM procurement.goods_receipt_line grl
			JOIN master.m_materials m ON m.id = grl.item_id
			LEFT JOIN procurement.purchase_order_line pol ON pol.id = grl.po_line_id
			WHERE grl.gr_id = ${wrsId}
			ORDER BY grl.id ASC
		`;

		const sites = await sql`SELECT id, loc_code, loc_name FROM master.m_lokasi ORDER BY loc_code`;

		return {
			wrs,
			items,
			sites
		};
	} catch (err: any) {
		if (err?.status === 302 || err?.status === 303 || err?.location) throw err;
		console.error('Error loading WRS edit:', err);
		throw error(500, 'Gagal memuat data WRS untuk diedit');
	}
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const wrsId = parseInt(params.id);
		if (isNaN(wrsId)) {
			return fail(400, { success: false, message: 'ID WRS tidak valid' });
		}

		const formData = await request.formData();
		const date = (formData.get('date') as string) || new Date().toISOString().split('T')[0];
		const vendorDeliveryNumber = ((formData.get('vendorDeliveryNumber') as string) || '').trim();
		const siteId = formData.get('siteId') ? parseInt(formData.get('siteId') as string) : null;
		const notes = ((formData.get('notes') as string) || '').trim();
		const itemsRaw = (formData.get('items') as string) || '[]';

		let submittedItems: any[] = [];
		try {
			submittedItems = JSON.parse(itemsRaw);
		} catch {
			submittedItems = [];
		}

		try {
			// Query existing lines for accurate delta calculation
			const existingLines = await sql`
				SELECT id, item_id, qty_received 
				FROM procurement.goods_receipt_line 
				WHERE gr_id = ${wrsId}
			`;

			// Update header
			await sql`
				UPDATE procurement.goods_receipt
				SET 
					date = ${date},
					vendor_delivery_number = ${vendorDeliveryNumber},
					site_id = ${siteId},
					notes = ${notes},
					updated_at = NOW()
				WHERE id = ${wrsId}
			`;

			// Process each submitted line
			for (const subItem of submittedItems) {
				const lineId = parseInt(subItem.line_id);
				const newQty = Math.max(0, parseFloat(subItem.qty) || 0);

				const existing = existingLines.find((l: any) => l.id === lineId);
				if (existing) {
					const oldQty = parseFloat(existing.qty_received) || 0;
					const delta = newQty - oldQty;

					if (delta !== 0) {
						// 1. Update on-hand stock in master.m_materials
						await sql`
							UPDATE master.m_materials 
							SET stock = stock + ${delta}, updated_at = NOW() 
							WHERE id = ${existing.item_id}
						`;
					}

					// 2. Update line item
					await sql`
						UPDATE procurement.goods_receipt_line
						SET qty_received = ${newQty}
						WHERE id = ${lineId}
					`;
				}
			}
		} catch (err: any) {
			console.error('Error updating WRS:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan perubahan WRS' });
		}

		throw redirect(303, `/pms/transactions/wrs/${wrsId}`);
	}
};
