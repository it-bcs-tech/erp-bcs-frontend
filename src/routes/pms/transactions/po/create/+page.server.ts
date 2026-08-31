import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const prIdParam = url.searchParams.get('pr_id');

		const vendors = await sql`
			SELECT id, kode_kustomer, nama_kustomer, COALESCE(alamat, '') as alamat 
			FROM master.m_customer 
			WHERE UPPER(kategori) = 'VENDOR' OR kode_kustomer LIKE 'V%' OR kode_kustomer LIKE 'VND-%'
			ORDER BY nama_kustomer
		`;
		const projects = await sql`SELECT id, project_code, project_name FROM master.m_project WHERE is_active = true ORDER BY project_name`;
		const sites = await sql`SELECT id, loc_code, loc_name FROM master.m_lokasi ORDER BY loc_code`;
		const materials = await sql`
			SELECT id, material_code, name, spec, brand, part_no, uom, standard_price, stock 
			FROM master.m_materials 
			WHERE is_active = true 
			ORDER BY name
		`;

		let initialPR: any = null;
		let initialItems: any[] = [];

		if (prIdParam) {
			const [pr] = await sql`
				SELECT id, pr_number, project_id, site_id, category, notes 
				FROM procurement.purchase_request 
				WHERE id = ${prIdParam}
			`;
			if (pr) {
				initialPR = pr;
				initialItems = await sql`
					SELECT 
						prl.id as pr_line_id,
						prl.item_id,
						m.material_code,
						m.name,
						m.spec,
						m.brand,
						m.uom,
						m.stock,
						m.standard_price as unit_price,
						prl.qty_requested as qty_ordered
					FROM procurement.purchase_request_line prl
					JOIN master.m_materials m ON m.id = prl.item_id
					WHERE prl.pr_id = ${pr.id}
				`;
			}
		}

		return {
			vendors,
			projects,
			sites,
			materials,
			initialPR,
			initialItems
		};
	} catch (err: any) {
		console.error('Error loading PO create dependencies:', err);
		return { vendors: [], projects: [], sites: [], materials: [], initialPR: null, initialItems: [] };
	}
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const date = formData.get('date') as string || new Date().toISOString().split('T')[0];
		const vendorId = formData.get('vendorId') as string;
		const projectId = formData.get('projectId') ? parseInt(formData.get('projectId') as string) : null;
		const siteId = formData.get('siteId') ? parseInt(formData.get('siteId') as string) : null;
		const category = (formData.get('category') as string || 'SUPPORTING').trim();
		const shipmentDate = formData.get('shipmentDate') as string || null;
		const shipmentLocation = (formData.get('shipmentLocation') as string || '').trim();
		const refNo = (formData.get('refNo') as string || '').trim();
		const dueDate = formData.get('dueDate') as string || null;
		const currency = (formData.get('currency') as string || 'IDR').trim();
		const discountPercent = parseFloat(formData.get('discountPercent') as string || '0');
		const vatPercent = parseFloat(formData.get('vatPercent') as string || '11');
		const notes = (formData.get('notes') as string || '').trim();
		const wrsNotes = (formData.get('wrsNotes') as string || '').trim();
		const prId = formData.get('prId') ? parseInt(formData.get('prId') as string) : null;
		const itemsRaw = formData.get('items') as string || '[]';

		if (!vendorId) {
			return fail(400, { success: false, message: 'Vendor / Supplier wajib dipilih!' });
		}

		let items: any[] = [];
		try {
			items = JSON.parse(itemsRaw);
		} catch {
			items = [];
		}

		if (items.length === 0) {
			return fail(400, { success: false, message: 'Minimal 1 item material harus dimasukkan!' });
		}

		// Kalkulasi total
		let subtotal = 0;
		for (const itm of items) {
			const itemSubtotal = (parseFloat(itm.qty) || 0) * (parseFloat(itm.unit_price) || 0);
			subtotal += itemSubtotal;
		}

		const discountAmount = subtotal * (discountPercent / 100);
		const netSubtotal = subtotal - discountAmount;
		const taxAmount = netSubtotal * (vatPercent / 100);
		const totalAmount = netSubtotal + taxAmount;

		try {
			// Auto Generate PO Number: PO-YYMM-XXXX
			const now = new Date();
			const yymm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
			const [seqRow] = await sql`SELECT COUNT(*) as count FROM procurement.purchase_order`;
			const seq = (parseInt(seqRow?.count || '0') + 1).toString().padStart(4, '0');
			const poNumber = `PO-${yymm}-${seq}`;

			const [po] = await sql`
				INSERT INTO procurement.purchase_order (
					po_number,
					date,
					vendor_id,
					project_id,
					site_id,
					category,
					shipment_date,
					shipment_location,
					ref_no,
					due_date,
					currency,
					discount_percent,
					vat_percent,
					subtotal,
					tax_amount,
					total_amount,
					status,
					notes,
					wrs_notes
				) VALUES (
					${poNumber},
					${date},
					${vendorId},
					${projectId},
					${siteId},
					${category},
					${shipmentDate},
					${shipmentLocation},
					${refNo},
					${dueDate},
					${currency},
					${discountPercent},
					${vatPercent},
					${subtotal},
					${taxAmount},
					${totalAmount},
					'DRAFT',
					${notes},
					${wrsNotes}
				) RETURNING id
			`;

			for (const itm of items) {
				const itemTotal = (parseFloat(itm.qty) || 0) * (parseFloat(itm.unit_price) || 0);
				await sql`
					INSERT INTO procurement.purchase_order_line (
						po_id,
						pr_line_id,
						item_id,
						qty_ordered,
						unit_price,
						tax_amount,
						total
					) VALUES (
						${po.id},
						${itm.pr_line_id || null},
						${itm.material_id},
						${itm.qty},
						${itm.unit_price},
						${itemTotal * (vatPercent / 100)},
						${itemTotal}
					)
				`;
			}

			// Update PR status if source was PR
			if (prId) {
				await sql`UPDATE procurement.purchase_request SET status = 'PROCESSED', updated_at = NOW() WHERE id = ${prId}`;
			}
		} catch (err: any) {
			console.error('Error creating PO:', err);
			return fail(500, { success: false, message: err.message || 'Gagal membuat Purchase Order' });
		}

		throw redirect(303, '/pms/transactions/po');
	}
};
