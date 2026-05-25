import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const allItems = [
		{ code: 'ITM-001', name: 'Oli Mesin SAE 40', category: 'Oli & Pelumas', unit: 'Liter', buyPrice: 45000, sellPrice: 52000, stock: 15, minStock: 50, supplier: 'PT Pertamina Lubricants', lastPurchase: '2026-04-20' },
		{ code: 'ITM-002', name: 'Oli Gardan SAE 90', category: 'Oli & Pelumas', unit: 'Liter', buyPrice: 38000, sellPrice: 44000, stock: 30, minStock: 40, supplier: 'PT Pertamina Lubricants', lastPurchase: '2026-05-01' },
		{ code: 'ITM-003', name: 'Filter Udara Hino 500', category: 'Sparepart', unit: 'Pcs', buyPrice: 285000, sellPrice: 320000, stock: 3, minStock: 10, supplier: 'CV Sumber Jaya Parts', lastPurchase: '2026-03-15' },
		{ code: 'ITM-004', name: 'Filter Oli Isuzu Giga', category: 'Sparepart', unit: 'Pcs', buyPrice: 195000, sellPrice: 230000, stock: 8, minStock: 10, supplier: 'PT Isuzu Astra', lastPurchase: '2026-05-10' },
		{ code: 'ITM-005', name: 'Kampas Rem Depan', category: 'Sparepart', unit: 'Set', buyPrice: 650000, sellPrice: 750000, stock: 12, minStock: 8, supplier: 'CV Sumber Jaya Parts', lastPurchase: '2026-05-08' },
		{ code: 'ITM-006', name: 'Kampas Rem Belakang', category: 'Sparepart', unit: 'Set', buyPrice: 580000, sellPrice: 680000, stock: 4, minStock: 8, supplier: 'CV Sumber Jaya Parts', lastPurchase: '2026-04-12' },
		{ code: 'ITM-007', name: 'Ban Truk 10.00-20', category: 'Ban', unit: 'Pcs', buyPrice: 2800000, sellPrice: 3200000, stock: 6, minStock: 16, supplier: 'PT Bridgestone', lastPurchase: '2026-04-05' },
		{ code: 'ITM-008', name: 'Ban Dalam 10.00-20', category: 'Ban', unit: 'Pcs', buyPrice: 350000, sellPrice: 420000, stock: 10, minStock: 16, supplier: 'PT Bridgestone', lastPurchase: '2026-04-05' },
		{ code: 'ITM-009', name: 'Aki Truk 12V 120Ah', category: 'Sparepart', unit: 'Pcs', buyPrice: 1200000, sellPrice: 1400000, stock: 5, minStock: 4, supplier: 'PT GS Battery', lastPurchase: '2026-05-02' },
		{ code: 'ITM-010', name: 'Baut & Mur Assorted', category: 'Konsumabel', unit: 'Set', buyPrice: 85000, sellPrice: 100000, stock: 25, minStock: 10, supplier: 'Toko Besi Murah', lastPurchase: '2026-05-12' },
	];

	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const catFilter = url.searchParams.get('cat') || 'All';

	let filtered = allItems;
	if (search) filtered = filtered.filter(i => i.name.toLowerCase().includes(search) || i.code.toLowerCase().includes(search) || i.category.toLowerCase().includes(search));
	if (catFilter !== 'All') filtered = filtered.filter(i => i.category === catFilter);

	const categories = [...new Set(allItems.map(i => i.category))];
	const perPage = 8;
	const page = parseInt(url.searchParams.get('page') || '1');
	const total = filtered.length;
	const paginated = filtered.slice((page - 1) * perPage, page * perPage);

	return {
		items: paginated,
		categories,
		meta: { current_page: page, per_page: perPage, total }
	};
};
