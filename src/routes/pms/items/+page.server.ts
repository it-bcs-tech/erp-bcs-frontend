import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const catFilter = url.searchParams.get('cat') || 'All';
	const page = parseInt(url.searchParams.get('page') || '1');
	const perPage = 8;

	// Fetch all materials from DB
	const itemsQuery = await sql`
		SELECT 
			m.material_code as code,
			m.name,
			t.name as category,
			m.uom as unit,
			m.standard_price as "buyPrice",
			m.standard_price as "sellPrice",
			m.stock,
			m.min_stock as "minStock",
			'Local Supplier' as supplier,
			m.updated_at as "lastPurchase"
		FROM master.m_materials m
		LEFT JOIN master.m_material_types t ON m.type_code = t.code
		WHERE m.is_active = true
		ORDER BY m.name ASC
	`;

	const allItems = itemsQuery.map(row => ({
		code: row.code || '',
		name: row.name || '',
		category: row.category || 'Uncategorized',
		unit: row.unit || '-',
		buyPrice: parseFloat(row.buyPrice) || 0,
		sellPrice: parseFloat(row.sellPrice) || 0,
		stock: parseFloat(row.stock) || 0,
		minStock: parseFloat(row.minStock) || 0,
		supplier: row.supplier,
		lastPurchase: row.lastPurchase
	}));

	let filtered = allItems;
	if (search) {
		filtered = filtered.filter(i => 
			i.name.toLowerCase().includes(search) || 
			i.code.toLowerCase().includes(search) || 
			i.category.toLowerCase().includes(search)
		);
	}
	if (catFilter !== 'All') {
		filtered = filtered.filter(i => i.category === catFilter);
	}

	const categories = [...new Set(allItems.map(i => i.category))];
	const total = filtered.length;
	const paginated = filtered.slice((page - 1) * perPage, page * perPage);

	return {
		items: paginated,
		categories,
		meta: { current_page: page, per_page: perPage, total }
	};
};
