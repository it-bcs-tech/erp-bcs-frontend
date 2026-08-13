import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		// Fetch Goods Receipts
		const receipts = await sql`
			SELECT 
				gr.id,
				gr.gr_number,
				gr.date,
				po.po_number,
				gr.vendor_delivery_number,
				gr.status,
				COUNT(grl.id) as item_count
			FROM procurement.goods_receipt gr
			LEFT JOIN procurement.purchase_order po ON po.id = gr.po_id
			LEFT JOIN procurement.goods_receipt_line grl ON grl.gr_id = gr.id
			GROUP BY gr.id, po.po_number
			ORDER BY gr.created_at DESC
		`;

		return {
			receipts
		};
	} catch (err: any) {
		console.error("Error fetching goods receipts:", err);
		throw error(500, 'Gagal mengambil data Goods Receipt');
	}
};

export const actions = {
	approveGR: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');

		if (!id) {
			return { success: false, message: 'ID GR tidak valid' };
		}

		try {
			await sql.begin(async (sql) => {
				// 1. Get GR Header
				const [gr] = await sql`
					SELECT id, gr_number, vendor_delivery_number, po_id, status 
					FROM procurement.goods_receipt 
					WHERE id = ${id}
				`;

				if (!gr) throw new Error('Data GR tidak ditemukan');
				if (gr.status === 'DONE') throw new Error('GR sudah berstatus DONE');

				// 2. Get GR Lines
				const lines = await sql`
					SELECT item_id, qty_received 
					FROM procurement.goods_receipt_line 
					WHERE gr_id = ${gr.id}
				`;

				// 3. Update GR Status
				await sql`
					UPDATE procurement.goods_receipt
					SET status = 'DONE'
					WHERE id = ${gr.id}
				`;

				// 4. Stock & Transactions
				for (const item of lines) {
					if (!item.item_id) continue;
					
					// Increase stock
					await sql`
						UPDATE master.m_materials 
						SET stock = COALESCE(stock, 0) + ${item.qty_received}
						WHERE id = ${item.item_id}
					`;

					// Record Inventory Transaction
					await sql`
						INSERT INTO master.m_inventory_transactions (
							material_id,
							transaction_type,
							qty,
							reference_no,
							note,
							created_by
						) VALUES (
							${item.item_id},
							'IN',
							${item.qty_received},
							${gr.gr_number},
							${gr.vendor_delivery_number ? 'Surat Jalan Vendor: ' + gr.vendor_delivery_number : 'Penerimaan Barang'},
							'System'
						)
					`;
				}

				// 5. Update PO if exists
				if (gr.po_id) {
					await sql`
						UPDATE procurement.purchase_order
						SET status = 'DONE'
						WHERE id = ${gr.po_id}
					`;
				}
			});

			return { success: true, message: 'Penerimaan Barang berhasil dikonfirmasi! Stok gudang telah bertambah.' };
		} catch (e: any) {
			console.error("Error approving GR:", e);
			return { success: false, message: e.message || 'Gagal mengonfirmasi Goods Receipt' };
		}
	}
};
