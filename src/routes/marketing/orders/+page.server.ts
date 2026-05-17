import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const allOrders = [
		{ id: 'DO-260515001', customer: 'PT Indofood Sukses Makmur', origin: 'Jakarta', destination: 'Surabaya', cargoType: 'FMCG / Dry Food', weight: '12 Ton', vehicleType: 'Heavy Truck', tariff: 8500000, loadingDate: '2026-05-16', eta: '2026-05-17', status: 'Confirmed', createdAt: '2026-05-15' },
		{ id: 'DO-260515002', customer: 'PT Astra International', origin: 'Jakarta', destination: 'Semarang', cargoType: 'Auto Parts', weight: '8 Ton', vehicleType: 'Box Truck', tariff: 5200000, loadingDate: '2026-05-17', eta: '2026-05-18', status: 'Pending', createdAt: '2026-05-15' },
		{ id: 'DO-260514008', customer: 'PT Unilever Indonesia', origin: 'Bandung', destination: 'Semarang', cargoType: 'Consumer Goods', weight: '10 Ton', vehicleType: 'Heavy Truck', tariff: 6200000, loadingDate: '2026-05-14', eta: '2026-05-15', status: 'Completed', createdAt: '2026-05-13' },
		{ id: 'DO-260515003', customer: 'PT Mayora Indah', origin: 'Jakarta', destination: 'Cirebon', cargoType: 'Biscuits / Snacks', weight: '6 Ton', vehicleType: 'Box Truck', tariff: 3500000, loadingDate: '2026-05-16', eta: '2026-05-16', status: 'Pending', createdAt: '2026-05-15' },
		{ id: 'DO-260513005', customer: 'PT Kalbe Farma', origin: 'Jakarta', destination: 'Yogyakarta', cargoType: 'Pharmaceutical', weight: '4 Ton', vehicleType: 'Box Truck', tariff: 6000000, loadingDate: '2026-05-13', eta: '2026-05-14', status: 'In Transit', createdAt: '2026-05-12' },
		{ id: 'DO-260512010', customer: 'PT Semen Indonesia', origin: 'Gresik', destination: 'Surabaya', cargoType: 'Construction Material', weight: '20 Ton', vehicleType: 'Heavy Truck', tariff: 2500000, loadingDate: '2026-05-12', eta: '2026-05-12', status: 'Completed', createdAt: '2026-05-11' },
		{ id: 'DO-260515004', customer: 'CV Berkah Makmur', origin: 'Jakarta', destination: 'Bogor', cargoType: 'General Cargo', weight: '2 Ton', vehicleType: 'Pickup', tariff: 1200000, loadingDate: '2026-05-16', eta: '2026-05-16', status: 'Confirmed', createdAt: '2026-05-15' },
		{ id: 'DO-260510007', customer: 'PT Pertamina Lubricants', origin: 'Cilacap', destination: 'Jakarta', cargoType: 'Lubricants (Hazmat)', weight: '14 Ton', vehicleType: 'Heavy Truck', tariff: 9800000, loadingDate: '2026-05-10', eta: '2026-05-11', status: 'Cancelled', createdAt: '2026-05-09' },
	];

	const metrics = {
		totalOrders: allOrders.length,
		pending: allOrders.filter(o => o.status === 'Pending').length,
		confirmed: allOrders.filter(o => o.status === 'Confirmed').length,
		inTransit: allOrders.filter(o => o.status === 'In Transit').length,
		completed: allOrders.filter(o => o.status === 'Completed').length
	};

	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const statusFilter = url.searchParams.get('status') || 'All';

	let filtered = allOrders;
	if (search) {
		filtered = filtered.filter(o =>
			o.customer.toLowerCase().includes(search) ||
			o.id.toLowerCase().includes(search) ||
			o.origin.toLowerCase().includes(search) ||
			o.destination.toLowerCase().includes(search)
		);
	}
	if (statusFilter !== 'All') filtered = filtered.filter(o => o.status === statusFilter);

	const perPage = 5;
	const page = parseInt(url.searchParams.get('page') || '1');
	const total = filtered.length;
	const start = (page - 1) * perPage;
	const paginated = filtered.slice(start, start + perPage);

	return {
		orders: paginated,
		metrics,
		meta: { current_page: page, per_page: perPage, total }
	};
};
