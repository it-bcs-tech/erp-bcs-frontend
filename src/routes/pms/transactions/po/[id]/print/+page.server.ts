import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

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
				to_char(po.created_at, 'YYYY-MM-DD HH24:MI') as "createdAt",
				po.vendor_id as "vendorId",
				c.nama_kustomer as "vendorName",
				COALESCE(c.kode_kustomer, '-') as "vendorCode",
				c.alamat as "vendorAddress",
				po.project_id as "projectId",
				p.project_name as "projectName",
				COALESCE(p.project_code, 'PRJ-' || p.id) as "projectCode",
				po.site_id as "siteId",
				l.loc_name as "siteName",
				l.loc_code as "siteCode",
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
				po.created_by as "createdBy",
				COALESCE(mk.nama_karyawan, 
					CASE 
						WHEN po.created_by LIKE '%(%)%' THEN TRIM(SUBSTRING(po.created_by FROM '^[^(]+'))
						ELSE po.created_by 
					END
				) as "createdByName",
				COALESCE(mk.payroll_id, 
					CASE 
						WHEN po.created_by LIKE '%(%)%' THEN SUBSTRING(po.created_by FROM '\\(([^)]+)\\)')
						ELSE NULL 
					END
				) as "createdByPayroll"
			FROM procurement.purchase_order po
			LEFT JOIN master.m_karyawan mk ON mk.payroll_id = po.created_by OR mk.payroll_id = SUBSTRING(po.created_by FROM '\\(([^)]+)\\)') OR mk.nama_karyawan = po.created_by
			LEFT JOIN master.m_customer c ON c.id = po.vendor_id
			LEFT JOIN master.m_project p ON p.id = po.project_id
			LEFT JOIN master.m_lokasi l ON l.id = po.site_id
			WHERE po.id = ${poId}
		`;

		if (!po) {
			throw error(404, 'Purchase Order tidak ditemukan');
		}

		const items = await sql`
			SELECT 
				pol.id,
				pol.po_id as "poId",
				pol.item_id as "materialId",
				m.material_code as "materialCode",
				m.name,
				m.spec,
				m.brand,
				m.uom,
				m.stock,
				pol.qty_ordered as "qtyOrdered",
				pol.unit_price as "unitPrice",
				pol.tax_amount as "taxAmount",
				pol.total,
				pr.pr_number as "prNumber",
				pr.id as "prId"
			FROM procurement.purchase_order_line pol
			JOIN master.m_materials m ON m.id = pol.item_id
			LEFT JOIN procurement.purchase_request_line prl ON prl.id = pol.pr_line_id
			LEFT JOIN procurement.purchase_request pr ON pr.id = prl.pr_id
			WHERE pol.po_id = ${poId}
			ORDER BY pol.id ASC
		`;

		return {
			po,
			items
		};
	} catch (err: any) {
		if (err?.status) throw err;
		console.error('Error loading PO print data:', err);
		throw error(500, 'Gagal memuat data cetak Purchase Order');
	}
};
