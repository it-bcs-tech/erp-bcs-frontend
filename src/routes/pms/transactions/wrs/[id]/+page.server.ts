import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

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
				to_char(gr.created_at, 'YYYY-MM-DD HH24:MI') as "createdAt",
				gr.po_id as "poId",
				po.po_number as "poNumber",
				to_char(po.date, 'YYYY-MM-DD') as "poDate",
				po.status as "poStatus",
				c.id as "vendorId",
				c.nama_kustomer as "supplierName",
				COALESCE(c.kode_kustomer, '-') as "vendorCode",
				c.alamat as "vendorAddress",
				l.loc_name as "siteName",
				l.loc_code as "siteCode",
				gr.vendor_delivery_number as "vendorDeliveryNumber",
				gr.status,
				gr.notes,
				gr.created_by as "receivedBy",
				COALESCE(mk.nama_karyawan, 
					CASE 
						WHEN gr.created_by LIKE '%(%)%' THEN TRIM(SUBSTRING(gr.created_by FROM '^[^(]+'))
						ELSE gr.created_by 
					END
				) as "receivedByName",
				COALESCE(mk.payroll_id, 
					CASE 
						WHEN gr.created_by LIKE '%(%)%' THEN SUBSTRING(gr.created_by FROM '\\(([^)]+)\\)')
						ELSE NULL 
					END
				) as "receivedByPayroll"
			FROM procurement.goods_receipt gr
			LEFT JOIN procurement.purchase_order po ON po.id = gr.po_id
			LEFT JOIN master.m_customer c ON c.id = COALESCE(gr.supplier_id, po.vendor_id)
			LEFT JOIN master.m_lokasi l ON l.id = COALESCE(gr.site_id, po.site_id)
			LEFT JOIN master.m_karyawan mk ON mk.payroll_id = gr.created_by OR mk.payroll_id = SUBSTRING(gr.created_by FROM '\\(([^)]+)\\)') OR mk.nama_karyawan = gr.created_by
			WHERE gr.id = ${wrsId}
		`;

		if (!wrs) {
			throw error(404, 'Laporan Penerimaan Barang (WRS) tidak ditemukan');
		}

		const items = await sql`
			SELECT 
				grl.id,
				grl.gr_id as "grId",
				grl.po_line_id as "poLineId",
				grl.item_id as "materialId",
				m.material_code as "materialCode",
				m.name,
				m.spec,
				m.brand,
				m.uom,
				m.stock,
				grl.qty_received as "qtyReceived",
				pol.qty_ordered as "qtyOrdered"
			FROM procurement.goods_receipt_line grl
			JOIN master.m_materials m ON m.id = grl.item_id
			LEFT JOIN procurement.purchase_order_line pol ON pol.id = grl.po_line_id
			WHERE grl.gr_id = ${wrsId}
			ORDER BY grl.id ASC
		`;

		return {
			wrs,
			items
		};
	} catch (err: any) {
		if (err?.status) throw err;
		console.error('Error loading WRS detail:', err);
		throw error(500, 'Gagal memuat detail penerimaan gudang (WRS)');
	}
};
