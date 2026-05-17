import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const allCustomers = [
		{ id: 'CUST-001', name: 'PT Indofood Sukses Makmur', type: 'Corporate', sector: 'FMCG', contactPerson: 'Hendro Wijaya', phone: '+62 21 5795-8888', email: 'hendro@indofood.co.id', address: 'Sudirman Plaza, Jakarta', term: 'NET 30', tier: 'Platinum', status: 'Active', totalOrders: 48, totalRevenue: 580000000 },
		{ id: 'CUST-002', name: 'PT Unilever Indonesia', type: 'Corporate', sector: 'FMCG', contactPerson: 'Sari Dewi', phone: '+62 21 5260-882', email: 'sari.dewi@unilever.com', address: 'Grha Unilever, BSD', term: 'NET 45', tier: 'Gold', status: 'Active', totalOrders: 35, totalRevenue: 420000000 },
		{ id: 'CUST-003', name: 'PT Mayora Indah Tbk', type: 'Corporate', sector: 'FMCG', contactPerson: 'Budi Hartono', phone: '+62 21 5210-788', email: 'budi.h@mayora.co.id', address: 'Daan Mogot, Tangerang', term: 'NET 30', tier: 'Gold', status: 'Active', totalOrders: 28, totalRevenue: 310000000 },
		{ id: 'CUST-004', name: 'PT Semen Indonesia', type: 'Corporate', sector: 'Construction', contactPerson: 'Agus Prasetyo', phone: '+62 31 398-1732', email: 'agus.p@semenindonesia.com', address: 'Gresik, Jawa Timur', term: 'NET 60', tier: 'Silver', status: 'Active', totalOrders: 15, totalRevenue: 195000000 },
		{ id: 'CUST-005', name: 'PT Astra International', type: 'Corporate', sector: 'Automotive', contactPerson: 'Rina Saptari', phone: '+62 21 508-9999', email: 'rina.s@astra.co.id', address: 'Sunter, Jakarta', term: 'NET 30', tier: 'Platinum', status: 'Active', totalOrders: 42, totalRevenue: 520000000 },
		{ id: 'CUST-006', name: 'CV Berkah Makmur', type: 'SME', sector: 'Retail', contactPerson: 'Adi Nugroho', phone: '+62 813-1234-5678', email: 'adi@berkahmakmur.id', address: 'Pasar Minggu, Jakarta', term: 'COD', tier: 'Standard', status: 'Active', totalOrders: 8, totalRevenue: 45000000 },
		{ id: 'CUST-007', name: 'PT Pertamina Lubricants', type: 'Corporate', sector: 'Oil & Gas', contactPerson: 'Yusuf Rachman', phone: '+62 21 7251-4700', email: 'yusuf.r@pertamina.com', address: 'Cilacap, Jawa Tengah', term: 'NET 45', tier: 'Gold', status: 'Inactive', totalOrders: 12, totalRevenue: 180000000 },
		{ id: 'CUST-008', name: 'PT Kalbe Farma', type: 'Corporate', sector: 'Pharmaceutical', contactPerson: 'Dewi Lestari', phone: '+62 21 4288-0111', email: 'dewi.l@kalbe.co.id', address: 'Pulomas, Jakarta', term: 'NET 30', tier: 'Silver', status: 'Active', totalOrders: 18, totalRevenue: 210000000 },
	];

	const metrics = {
		total: allCustomers.length,
		active: allCustomers.filter(c => c.status === 'Active').length,
		corporate: allCustomers.filter(c => c.type === 'Corporate').length,
		sme: allCustomers.filter(c => c.type === 'SME').length
	};

	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const typeFilter = url.searchParams.get('type') || 'All';
	const tierFilter = url.searchParams.get('tier') || 'All';
	const statusFilter = url.searchParams.get('status') || 'All';

	let filtered = allCustomers;
	if (search) {
		filtered = filtered.filter(c =>
			c.name.toLowerCase().includes(search) ||
			c.contactPerson.toLowerCase().includes(search) ||
			c.id.toLowerCase().includes(search) ||
			c.sector.toLowerCase().includes(search)
		);
	}
	if (typeFilter !== 'All') filtered = filtered.filter(c => c.type === typeFilter);
	if (tierFilter !== 'All') filtered = filtered.filter(c => c.tier === tierFilter);
	if (statusFilter !== 'All') filtered = filtered.filter(c => c.status === statusFilter);

	const perPage = 5;
	const page = parseInt(url.searchParams.get('page') || '1');
	const total = filtered.length;
	const start = (page - 1) * perPage;
	const paginated = filtered.slice(start, start + perPage);

	return {
		customers: paginated,
		metrics,
		meta: { current_page: page, per_page: perPage, total }
	};
};
