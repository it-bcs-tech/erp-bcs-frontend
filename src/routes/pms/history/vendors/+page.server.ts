import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		const vendorsHistory = await sql`
			SELECT 
				v.id,
				v.kode_vendor as "vendorCode",
				v.nama_vendor as "vendorName",
				COALESCE(v.alamat, '-') as alamat,
				COALESCE(v.phone, '-') as phone,
				COALESCE(v.email, '-') as email,
				COUNT(po.id) as "totalPO",
				COALESCE(SUM(po.total_amount), 0) as "totalValue"
			FROM master.m_vendor v
			LEFT JOIN procurement.purchase_order po ON po.vendor_id = v.id
			GROUP BY v.id, v.kode_vendor, v.nama_vendor, v.alamat, v.phone, v.email
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
