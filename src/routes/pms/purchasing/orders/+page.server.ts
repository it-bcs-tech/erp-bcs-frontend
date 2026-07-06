import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		// Fetch Purchase Orders
		const orders = await sql`
			SELECT 
				po.id,
				po.po_number,
				po.date,
				c.nama_kustomer as vendor_name,
				po.status,
				po.total_amount,
				COUNT(pol.id) as item_count
			FROM procurement.purchase_order po
			LEFT JOIN master.m_customer c ON c.id = po.vendor_id
			LEFT JOIN procurement.purchase_order_line pol ON pol.po_id = po.id
			GROUP BY po.id, c.nama_kustomer
			ORDER BY po.created_at DESC
		`;

		return {
			orders
		};
	} catch (err: any) {
		console.error("Error fetching purchase orders:", err);
		throw error(500, 'Gagal mengambil data Purchase Order');
	}
};
