import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();
		const lowStockOnly = url.searchParams.get('lowStock') === 'true';

		const items = await sql`
			SELECT 
				m.id,
				m.material_code as "materialCode",
				m.name,
				COALESCE(m.spec, '-') as spec,
				COALESCE(m.brand, '-') as brand,
				m.uom,
				COALESCE(m.stock, 0) as stock,
				COALESCE(m.min_stock, 0) as "minStock",
				COALESCE(m.standard_price, 0) as "standardPrice",
				COALESCE(m.stock, 0) * COALESCE(m.standard_price, 0) as "totalAssetValue",
				COALESCE(l.loc_name, 'Gudang Utama') as "locationName",
				COALESCE(l.alias, l.loc_code, 'WHS-01') as "locationAlias",
				to_char(COALESCE(m.updated_at, m.created_at, NOW()), 'YYYY-MM-DD HH24:MI') as "lastUpdated"
			FROM master.m_materials m
			LEFT JOIN master.m_lokasi l ON l.id = m.location_id
			WHERE m.is_active = true
			ORDER BY m.stock ASC, m.name ASC
		`;

		let filtered = items;
		if (search) {
			filtered = filtered.filter(i =>
				(i.name && i.name.toLowerCase().includes(search)) ||
				(i.materialCode && i.materialCode.toLowerCase().includes(search)) ||
				(i.locationName && i.locationName.toLowerCase().includes(search)) ||
				(i.brand && i.brand.toLowerCase().includes(search))
			);
		}
		if (lowStockOnly) {
			filtered = filtered.filter(i => parseFloat(i.stock) <= parseFloat(i.minStock));
		}

		// Summary Stats
		const totalStockQty = items.reduce((sum, i) => sum + (parseFloat(i.stock) || 0), 0);
		const totalAssetValue = items.reduce((sum, i) => sum + (parseFloat(i.totalAssetValue) || 0), 0);
		const lowStockCount = items.filter(i => parseFloat(i.stock) <= parseFloat(i.minStock)).length;

		return {
			items: filtered,
			summary: {
				totalItems: items.length,
				totalStockQty,
				totalAssetValue,
				lowStockCount
			}
		};
	} catch (err: any) {
		console.error('Error loading inventory on hand:', err);
		return { items: [], summary: { totalItems: 0, totalStockQty: 0, totalAssetValue: 0, lowStockCount: 0 } };
	}
};
