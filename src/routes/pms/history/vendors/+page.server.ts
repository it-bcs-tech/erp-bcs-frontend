import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		const vendorsHistory = await sql`
			SELECT 
				c.id,
				c.kode_kustomer as "vendorCode",
				c.nama_kustomer as "vendorName",
				COALESCE(c.alamat, '-') as alamat,
				COALESCE(c.phone, c.tlp, '-') as phone,
				COALESCE(c.email, '-') as email,
				COUNT(po.id) as "totalPO",
				COALESCE(SUM(po.total_amount), 0) as "totalValue"
			FROM master.m_customer c
			LEFT JOIN procurement.purchase_order po ON po.vendor_id = c.id
			WHERE UPPER(c.kategori) = 'VENDOR' OR c.kode_kustomer LIKE 'V%' OR c.kode_kustomer LIKE 'VND-%'
			GROUP BY c.id, c.kode_kustomer, c.nama_kustomer, c.alamat, c.phone, c.tlp, c.email
			ORDER BY "totalValue" DESC
		`;

		let filtered = vendorsHistory;
		if (search) {
			filtered = filtered.filter(v =>
				(v.vendorName && v.vendorName.toLowerCase().includes(search)) ||
				(v.vendorCode && v.vendorCode.toLowerCase().includes(search)) ||
				(v.alamat && v.alamat.toLowerCase().includes(search))
			);
		}

		return {
			vendorsHistory: filtered
		};
	} catch (err: any) {
		console.error('Error loading vendor history:', err);
		return { vendorsHistory: [] };
	}
};
