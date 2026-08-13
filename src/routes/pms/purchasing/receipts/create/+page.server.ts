import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { verifyUserData } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	let userName = '';
	const userDataCookie = cookies.get('user_data');
	if (userDataCookie) {
		const user = verifyUserData(userDataCookie);
		if (user) userName = user.name;
	}

	try {
		// Fetch items (materials) for manual adding
		const items = await sql`
			SELECT id, material_code, name, part_no, uom 
			FROM master.m_materials 
			WHERE is_active = true
			ORDER BY name ASC
		`;

		// Fetch Confirmed POs to pull data from
		const confirmedPos = await sql`
			SELECT 
				po.id, 
				po.po_number, 
				po.date, 
				c.nama_kustomer as vendor_name
			FROM procurement.purchase_order po
			LEFT JOIN master.m_customer c ON c.id = po.vendor_id
			WHERE po.status = 'CONFIRMED'
			ORDER BY po.created_at DESC
		`;

		return {
			items,
			confirmedPos,
			userName
		};
	} catch (err: any) {
		console.error("Error fetching GR prerequisites:", err);
		throw error(500, 'Gagal memuat data master untuk Goods Receipt');
	}
};

export const actions = {
	saveGR: async ({ request }) => {
		const data = await request.formData();
		const payloadStr = data.get('payload');
		if (!payloadStr) {
			return { success: false, message: 'Payload is required' };
		}

		const payload = JSON.parse(payloadStr.toString());

		if (!payload.items || payload.items.length === 0) {
			return { success: false, message: 'Harus ada minimal 1 barang yang diterima.' };
		}

		try {
			await sql.begin(async (sql) => {
				// 1. Generate GR Number: GR/YYYY/MM/XXXX
				const dateObj = new Date(payload.date);
				const year = dateObj.getFullYear();
				const month = String(dateObj.getMonth() + 1).padStart(2, '0');
				
				const countRes = await sql`SELECT COUNT(*) FROM procurement.goods_receipt WHERE date_part('year', date) = ${year} AND date_part('month', date) = ${dateObj.getMonth() + 1}`;
				const seq = String(Number(countRes[0].count) + 1).padStart(4, '0');
				const grNumber = `GR/${year}/${month}/${seq}`;

				// 2. Insert Header
				const [gr] = await sql`
					INSERT INTO procurement.goods_receipt (
						gr_number, date, po_id, vendor_delivery_number, created_by, status, notes
					) VALUES (
						${grNumber}, ${payload.date}, ${payload.po_id || null}, ${payload.vendor_delivery_number}, ${payload.created_by}, ${payload.action}, ${payload.notes}
					) RETURNING id
				`;

				// 3. Insert Lines and Update Stock (if action == 'DONE')
				for (const item of payload.items) {
					if (!item.item_id) continue;
					await sql`
						INSERT INTO procurement.goods_receipt_line (
							gr_id, po_line_id, item_id, qty_received
						) VALUES (
							${gr.id}, ${item.po_line_id || null}, ${item.item_id}, ${item.qty_received}
						)
					`;

					if (payload.action === 'DONE') {
						// Increase stock in m_materials
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
								${grNumber},
								${payload.vendor_delivery_number ? 'Surat Jalan Vendor: ' + payload.vendor_delivery_number : 'Penerimaan Barang ' + grNumber},
								${payload.created_by}
							)
						`;
					}
				}

				// If action is DONE and a PO is referenced, check if we need to update PO status
				// For simplicity, we just mark PO as DONE if GR is DONE
				if (payload.action === 'DONE' && payload.po_id) {
					await sql`
						UPDATE procurement.purchase_order
						SET status = 'DONE'
						WHERE id = ${payload.po_id}
					`;
				}
			});

			return { success: true, message: 'Penerimaan Barang berhasil disimpan!' };
		} catch (e: any) {
			console.error("Error saving GR:", e);
			return { success: false, message: e.message || 'Gagal menyimpan Goods Receipt' };
		}
	}
};
