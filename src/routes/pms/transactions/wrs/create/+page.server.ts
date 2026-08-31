import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const poIdParam = url.searchParams.get('po_id');

		const purchaseOrders = await sql`
			SELECT 
				po.id,
				po.po_number,
				to_char(po.date, 'YYYY-MM-DD') as date,
				po.vendor_id,
				po.site_id,
				c.nama_kustomer as vendor_name,
				l.loc_name as site_name
			FROM procurement.purchase_order po
			LEFT JOIN master.m_customer c ON c.id = po.vendor_id
			LEFT JOIN master.m_lokasi l ON l.id = po.site_id
			WHERE po.status IN ('CONFIRMED', 'PARTIAL_RECEIVED', 'APPROVED')
			ORDER BY po.id DESC
		`;

		const sites = await sql`SELECT id, loc_code, loc_name FROM master.m_lokasi ORDER BY loc_code`;

		let initialPO: any = null;
		let poLines: any[] = [];

		if (poIdParam) {
			const [foundPO] = await sql`
				SELECT 
					po.id, po.po_number, po.vendor_id, po.site_id, 
					c.nama_kustomer as vendor_name, l.loc_name as site_name,
					po.wrs_notes
				FROM procurement.purchase_order po
				LEFT JOIN master.m_customer c ON c.id = po.vendor_id
				LEFT JOIN master.m_lokasi l ON l.id = po.site_id
				WHERE po.id = ${poIdParam}
			`;
			if (foundPO) {
				initialPO = foundPO;
				poLines = await sql`
					SELECT 
						pol.id as po_line_id,
						pol.item_id,
						pol.qty_ordered,
						COALESCE((
							SELECT SUM(grl.qty_received)
							FROM procurement.goods_receipt_line grl
							WHERE grl.po_line_id = pol.id
						), 0) as qty_previously_received,
						m.material_code,
						m.name,
						m.spec,
						m.uom,
						m.stock
					FROM procurement.purchase_order_line pol
					JOIN master.m_materials m ON m.id = pol.item_id
					WHERE pol.po_id = ${foundPO.id}
				`;
			}
		}

		return {
			purchaseOrders,
			sites,
			initialPO,
			poLines
		};
	} catch (err: any) {
		console.error('Error loading WRS create dependencies:', err);
		return { purchaseOrders: [], sites: [], initialPO: null, poLines: [] };
	}
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const date = formData.get('date') as string || new Date().toISOString().split('T')[0];
		const poId = parseInt(formData.get('poId') as string);
		const siteId = formData.get('siteId') ? parseInt(formData.get('siteId') as string) : null;
		const vendorDeliveryNumber = (formData.get('vendorDeliveryNumber') as string || '').trim();
		const receivedBy = (formData.get('receivedBy') as string || 'Petugas Gudang').trim();
		const notes = (formData.get('notes') as string || '').trim();
		const itemsRaw = formData.get('items') as string || '[]';

		if (!poId) {
			return fail(400, { success: false, message: 'Purchase Order wajib dipilih!' });
		}

		let items: any[] = [];
		try {
			items = JSON.parse(itemsRaw);
		} catch {
			items = [];
		}

		if (items.length === 0) {
			return fail(400, { success: false, message: 'Tidak ada item yang diterima!' });
		}

		try {
			// Auto Generate WRS Number: WRS-YYMM-XXXX
			const now = new Date();
			const yymm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
			const [seqRow] = await sql`SELECT COUNT(*) as count FROM procurement.goods_receipt`;
			const seq = (parseInt(seqRow?.count || '0') + 1).toString().padStart(4, '0');
			const grNumber = `WRS-${yymm}-${seq}`;

			// Get PO info
			const [po] = await sql`SELECT vendor_id, site_id FROM procurement.purchase_order WHERE id = ${poId}`;

			const [gr] = await sql`
				INSERT INTO procurement.goods_receipt (
					gr_number,
					date,
					po_id,
					vendor_delivery_number,
					status,
					notes,
					site_id,
					supplier_id,
					created_by
				) VALUES (
					${grNumber},
					${date},
					${poId},
					${vendorDeliveryNumber},
					'RECEIVED',
					${notes},
					${siteId || po?.site_id},
					${po?.vendor_id},
					${receivedBy}
				) RETURNING id
			`;

			// Process each line & Auto Sync Stok
			for (const itm of items) {
				const qtyReceived = parseFloat(itm.qty_received) || 0;
				if (qtyReceived > 0) {
					await sql`
						INSERT INTO procurement.goods_receipt_line (
							gr_id,
							po_line_id,
							item_id,
							qty_received
						) VALUES (
							${gr.id},
							${itm.po_line_id || null},
							${itm.item_id},
							${qtyReceived}
						)
					`;

					// 1. Update On-Hand Stock in master.m_materials
					await sql`
						UPDATE master.m_materials
						SET stock = COALESCE(stock, 0) + ${qtyReceived},
						    updated_at = NOW()
						WHERE id = ${itm.item_id}
					`;

					// 2. Log Inventory Transaction
					await sql`
						INSERT INTO master.m_inventory_transactions (
							material_id,
							transaction_type,
							qty,
							reference_no,
							note,
							created_by,
							created_at
						) VALUES (
							${itm.item_id},
							'IN_PURCHASE',
							${qtyReceived},
							${grNumber},
							${'Penerimaan PO ' + (itm.po_number || '') + ' - Ref: ' + vendorDeliveryNumber},
							${receivedBy},
							NOW()
						)
					`;
				}
			}

			// Check if all items in PO are completely fulfilled
			const poLinesSummary = await sql`
				SELECT 
					SUM(pol.qty_ordered) as total_ordered,
					COALESCE((
						SELECT SUM(grl.qty_received)
						FROM procurement.goods_receipt_line grl
						JOIN procurement.goods_receipt r ON r.id = grl.gr_id
						WHERE r.po_id = ${poId}
					), 0) as total_received
				FROM procurement.purchase_order_line pol
				WHERE pol.po_id = ${poId}
			`;

			const totalOrdered = parseFloat(poLinesSummary[0]?.total_ordered || '0');
			const totalReceived = parseFloat(poLinesSummary[0]?.total_received || '0');

			const newPOStatus = totalReceived >= totalOrdered ? 'COMPLETED' : 'PARTIAL_RECEIVED';
			await sql`UPDATE procurement.purchase_order SET status = ${newPOStatus}, updated_at = NOW() WHERE id = ${poId}`;
		} catch (err: any) {
			console.error('Error creating WRS:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan penerimaan barang' });
		}

		throw redirect(303, '/pms/transactions/wrs');
	}
};
