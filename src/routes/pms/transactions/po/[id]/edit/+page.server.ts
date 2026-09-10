import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { error, fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const poId = parseInt(params.id);
	if (isNaN(poId)) {
		throw error(404, 'Purchase Order ID tidak valid');
	}

	try {
		const [po] = await sql`
			SELECT 
				po.id,
				po.po_number as "poNumber",
				to_char(po.date, 'YYYY-MM-DD') as date,
				po.vendor_id as "vendorId",
				po.project_id as "projectId",
				po.site_id as "siteId",
				COALESCE(po.category, 'SUPPORTING') as category,
				po.subtotal,
				po.tax_amount as "taxAmount",
				po.total_amount as "totalAmount",
				po.currency,
				po.discount_percent as "discountPercent",
				po.vat_percent as "vatPercent",
				to_char(po.due_date, 'YYYY-MM-DD') as "dueDate",
				to_char(po.shipment_date, 'YYYY-MM-DD') as "shipmentDate",
				po.shipment_location as "shipmentLocation",
				po.ref_no as "refNo",
				po.status,
				po.notes,
				po.wrs_notes as "wrsNotes"
			FROM procurement.purchase_order po
			WHERE po.id = ${poId}
		`;

		if (!po) {
			throw error(404, 'Purchase Order tidak ditemukan');
		}

		if (po.status !== 'DRAFT') {
			throw redirect(303, `/pms/transactions/po/${poId}?error=cannot_edit_non_draft`);
		}

		const items = await sql`
			SELECT 
				pol.id,
				pol.pr_line_id,
				pol.item_id as material_id,
				m.material_code,
				m.name,
				m.spec,
				m.brand,
				m.uom,
				m.stock,
				pol.qty_ordered as qty,
				pol.unit_price,
				pr.pr_number
			FROM procurement.purchase_order_line pol
			JOIN master.m_materials m ON m.id = pol.item_id
			LEFT JOIN procurement.purchase_request_line prl ON prl.id = pol.pr_line_id
			LEFT JOIN procurement.purchase_request pr ON pr.id = prl.pr_id
			WHERE pol.po_id = ${poId}
			ORDER BY pol.id ASC
		`;

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
		const vendorPrices = await sql`SELECT material_id, vendor_id, price FROM master.m_material_prices`;

		return {
			po,
			items,
			vendors,
			projects,
			sites,
			materials,
			vendorPrices
		};
	} catch (err: any) {
		if (err?.status === 302 || err?.status === 303 || err?.location) throw err;
		console.error('Error loading PO edit:', err);
		throw error(500, 'Gagal memuat data Purchase Order untuk diedit');
	}
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const poId = parseInt(params.id);
		if (isNaN(poId)) {
			return fail(400, { success: false, message: 'ID PO tidak valid' });
		}

		const formData = await request.formData();
		const date = (formData.get('date') as string) || new Date().toISOString().split('T')[0];
		const vendorId = formData.get('vendorId') as string;
		const projectId = formData.get('projectId') ? parseInt(formData.get('projectId') as string) : null;
		const siteId = formData.get('siteId') ? parseInt(formData.get('siteId') as string) : null;
		const category = ((formData.get('category') as string) || 'SUPPORTING').trim();
		const shipmentDate = (formData.get('shipmentDate') as string) || null;
		const shipmentLocation = ((formData.get('shipmentLocation') as string) || '').trim();
		const refNo = ((formData.get('refNo') as string) || '').trim();
		const dueDate = (formData.get('dueDate') as string) || null;
		const currency = ((formData.get('currency') as string) || 'IDR').trim();
		const discountPercent = parseFloat((formData.get('discountPercent') as string) || '0');
		const vatPercent = parseFloat((formData.get('vatPercent') as string) || '11');
		const notes = ((formData.get('notes') as string) || '').trim();
		const wrsNotes = ((formData.get('wrsNotes') as string) || '').trim();
		const itemsRaw = (formData.get('items') as string) || '[]';

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
			return fail(400, { success: false, message: 'Minimal 1 item material harus ada dalam PO!' });
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
			const [existingPo] = await sql`SELECT status FROM procurement.purchase_order WHERE id = ${poId}`;
			if (!existingPo) {
				return fail(404, { success: false, message: 'PO tidak ditemukan' });
			}
			if (existingPo.status !== 'DRAFT') {
				return fail(400, { success: false, message: 'Hanya PO dengan status DRAFT yang dapat diedit!' });
			}

			// Update header
			await sql`
				UPDATE procurement.purchase_order
				SET 
					date = ${date},
					vendor_id = ${vendorId},
					project_id = ${projectId},
					site_id = ${siteId},
					category = ${category},
					shipment_date = ${shipmentDate},
					shipment_location = ${shipmentLocation},
					ref_no = ${refNo},
					due_date = ${dueDate},
					currency = ${currency},
					discount_percent = ${discountPercent},
					vat_percent = ${vatPercent},
					subtotal = ${subtotal},
					tax_amount = ${taxAmount},
					total_amount = ${totalAmount},
					notes = ${notes},
					wrs_notes = ${wrsNotes},
					updated_at = NOW()
				WHERE id = ${poId}
			`;

			// Replace line items
			await sql`DELETE FROM procurement.purchase_order_line WHERE po_id = ${poId}`;

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
						${poId},
						${itm.pr_line_id || null},
						${itm.material_id},
						${itm.qty},
						${itm.unit_price},
						${itemTotal * (vatPercent / 100)},
						${itemTotal}
					)
				`;
			}
		} catch (err: any) {
			console.error('Error updating PO:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan perubahan PO' });
		}

		throw redirect(303, `/pms/transactions/po/${poId}`);
	}
};
