import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const allTariffs = [
		{ id: 'TRF-001', routeName: 'Jakarta → Surabaya', origin: 'Jakarta', destination: 'Surabaya', zone: 'Java East', distance: 780, vehicleType: 'Heavy Truck', basePrice: 8500000, pricePerKm: 10897, status: 'Active', lastUpdated: '2026-05-01' },
		{ id: 'TRF-002', routeName: 'Jakarta → Semarang', origin: 'Jakarta', destination: 'Semarang', zone: 'Java Central', distance: 450, vehicleType: 'Heavy Truck', basePrice: 5200000, pricePerKm: 11556, status: 'Active', lastUpdated: '2026-05-01' },
		{ id: 'TRF-003', routeName: 'Jakarta → Bandung', origin: 'Jakarta', destination: 'Bandung', zone: 'Java West', distance: 150, vehicleType: 'Box Truck', basePrice: 2800000, pricePerKm: 18667, status: 'Active', lastUpdated: '2026-04-15' },
		{ id: 'TRF-004', routeName: 'Jakarta → Cirebon', origin: 'Jakarta', destination: 'Cirebon', zone: 'Java West', distance: 260, vehicleType: 'Box Truck', basePrice: 3500000, pricePerKm: 13462, status: 'Active', lastUpdated: '2026-04-15' },
		{ id: 'TRF-005', routeName: 'Surabaya → Malang', origin: 'Surabaya', destination: 'Malang', zone: 'Java East', distance: 95, vehicleType: 'Delivery Van', basePrice: 1800000, pricePerKm: 18947, status: 'Active', lastUpdated: '2026-03-20' },
		{ id: 'TRF-006', routeName: 'Jakarta → Yogyakarta', origin: 'Jakarta', destination: 'Yogyakarta', zone: 'Java Central', distance: 530, vehicleType: 'Heavy Truck', basePrice: 6000000, pricePerKm: 11321, status: 'Draft', lastUpdated: '2026-05-10' },
		{ id: 'TRF-007', routeName: 'Semarang → Surabaya', origin: 'Semarang', destination: 'Surabaya', zone: 'Java East', distance: 350, vehicleType: 'Box Truck', basePrice: 4200000, pricePerKm: 12000, status: 'Active', lastUpdated: '2026-04-01' },
		{ id: 'TRF-008', routeName: 'Jakarta → Merak', origin: 'Jakarta', destination: 'Merak', zone: 'Banten', distance: 120, vehicleType: 'Pickup', basePrice: 1500000, pricePerKm: 12500, status: 'Expired', lastUpdated: '2026-01-15' },
	];

	const metrics = {
		totalTariffs: allTariffs.length,
		activeRates: allTariffs.filter(t => t.status === 'Active').length,
		zones: new Set(allTariffs.map(t => t.zone)).size,
		avgPricePerKm: Math.round(allTariffs.reduce((sum, t) => sum + t.pricePerKm, 0) / allTariffs.length)
	};

	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const zoneFilter = url.searchParams.get('zone') || 'All';
	const vehicleFilter = url.searchParams.get('vehicle') || 'All';
	const statusFilter = url.searchParams.get('status') || 'All';

	let filtered = allTariffs;
	if (search) {
		filtered = filtered.filter(t =>
			t.routeName.toLowerCase().includes(search) ||
			t.origin.toLowerCase().includes(search) ||
			t.destination.toLowerCase().includes(search) ||
			t.id.toLowerCase().includes(search)
		);
	}
	if (zoneFilter !== 'All') filtered = filtered.filter(t => t.zone === zoneFilter);
	if (vehicleFilter !== 'All') filtered = filtered.filter(t => t.vehicleType === vehicleFilter);
	if (statusFilter !== 'All') filtered = filtered.filter(t => t.status === statusFilter);

	const perPage = 5;
	const page = parseInt(url.searchParams.get('page') || '1');
	const total = filtered.length;
	const start = (page - 1) * perPage;
	const paginated = filtered.slice(start, start + perPage);

	return {
		tariffs: paginated,
		metrics,
		meta: { current_page: page, per_page: perPage, total }
	};
};
