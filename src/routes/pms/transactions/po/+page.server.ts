import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();
		const statusFilter = url.searchParams.get('status') || '';
		const categoryFilter = url.searchParams.get('category') || '';

		const orders = await sql`
			SELECT 
				po.id,
				po.po_number as "poNumber",
				to_char(po.date, 'YYYY-MM-DD') as date,
				COALESCE(po.category, 'SUPPORTING') as category,
				c.nama_kustomer as "vendorName",
				COALESCE(c.kode_kustomer, '-') as "vendorCode",
				p.project_name as "projectName",
				l.loc_name as "siteName",
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
				po.wrs_notes as "wrsNotes",
				COUNT(pol.id) as item_count,
				COALESCE(SUM(pol.qty_ordered), 0) as total_qty_ordered
			FROM procurement.purchase_order po
			LEFT JOIN master.m_customer c ON c.id = po.vendor_id
			LEFT JOIN master.m_project p ON p.id = po.project_id
			LEFT JOIN master.m_lokasi l ON l.id = po.site_id
			LEFT JOIN procurement.purchase_order_line pol ON pol.po_id = po.id
			GROUP BY po.id, c.nama_kustomer, c.kode_kustomer, p.project_name, l.loc_name
			ORDER BY po.id DESC
		`;

		let filtered = orders;
		if (search) {
			filtered = filtered.filter(o =>
				(o.poNumber && o.poNumber.toLowerCase().includes(search)) ||
				(o.vendorName && o.vendorName.toLowerCase().includes(search)) ||
				(o.projectName && o.projectName.toLowerCase().includes(search)) ||
				(o.refNo && o.refNo.toLowerCase().includes(search))
			);
		}
		if (statusFilter) {
			filtered = filtered.filter(o => o.status === statusFilter);
		}
		if (categoryFilter) {
			filtered = filtered.filter(o => o.category === categoryFilter);
		}

		return {
			orders: filtered
		};
	} catch (err: any) {
		console.error('Error loading PO list:', err);
		return { orders: [] };
	}
};

export const actions: Actions = {
	confirmPO: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		if (!id) return fail(400, { success: false, message: 'ID PO tidak valid' });

		try {
			await sql`UPDATE procurement.purchase_order SET status = 'CONFIRMED', updated_at = NOW() WHERE id = ${id}`;
			return { success: true, message: 'Purchase Order berhasil di-Confirm!' };
		} catch (e: any) {
			return fail(500, { success: false, message: 'Gagal meng-confirm PO' });
		}
	},
	cancelPO: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id');
		if (!id) return fail(400, { success: false, message: 'ID PO tidak valid' });

		try {
			await sql`UPDATE procurement.purchase_order SET status = 'CANCELLED', updated_at = NOW() WHERE id = ${id}`;
			return { success: true, message: 'PO telah dibatalkan' };
		} catch (e: any) {
			return fail(500, { success: false, message: 'Gagal membatalkan PO' });
		}
	}
};
