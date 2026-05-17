import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const pendingOrders = [
		{ id: 'DO-260515001', customer: 'PT Indofood Sukses Makmur', origin: 'Jakarta', destination: 'Surabaya', cargo: 'FMCG / Dry Food', weight: '12 Ton', vehicleReq: 'Heavy Truck', loadingDate: '2026-05-16', tariff: 8500000, assignedUnit: 'B 1234 CD', assignedDriver: 'Ahmad Subarkah', status: 'Dispatched' },
		{ id: 'DO-260515002', customer: 'PT Astra International', origin: 'Jakarta', destination: 'Semarang', cargo: 'Auto Parts', weight: '8 Ton', vehicleReq: 'Box Truck', loadingDate: '2026-05-17', tariff: 5200000, assignedUnit: null, assignedDriver: null, status: 'Pending' },
		{ id: 'DO-260515003', customer: 'PT Mayora Indah', origin: 'Jakarta', destination: 'Cirebon', cargo: 'Biscuits / Snacks', weight: '6 Ton', vehicleReq: 'Box Truck', loadingDate: '2026-05-16', tariff: 3500000, assignedUnit: 'F 7890 KL', assignedDriver: 'Eko Firmansyah', status: 'Dispatched' },
		{ id: 'DO-260516004', customer: 'PT Kalbe Farma', origin: 'Jakarta', destination: 'Yogyakarta', cargo: 'Pharmaceutical', weight: '4 Ton', vehicleReq: 'Box Truck', loadingDate: '2026-05-18', tariff: 6000000, assignedUnit: null, assignedDriver: null, status: 'Pending' },
		{ id: 'DO-260516005', customer: 'CV Berkah Makmur', origin: 'Jakarta', destination: 'Bogor', cargo: 'General Cargo', weight: '2 Ton', vehicleReq: 'Pickup', loadingDate: '2026-05-17', tariff: 1200000, assignedUnit: null, assignedDriver: null, status: 'Pending' },
		{ id: 'DO-260514008', customer: 'PT Unilever Indonesia', origin: 'Bandung', destination: 'Semarang', cargo: 'Consumer Goods', weight: '10 Ton', vehicleReq: 'Heavy Truck', loadingDate: '2026-05-14', tariff: 6200000, assignedUnit: 'L 9012 GH', assignedDriver: 'Cahyo Wibowo', status: 'Dispatched' },
	];

	const availableUnits = [
		{ id: 'H 3456 MN', type: 'Heavy Truck', brand: 'Hino 500', driver: 'Fajar Nugroho', location: 'Pool Jakarta' },
		{ id: 'B 7788 UV', type: 'Delivery Van', brand: 'Daihatsu Gran Max', driver: 'Joko Purnomo', location: 'Pool Jakarta' },
		{ id: 'F 2233 YZ', type: 'Pickup', brand: 'Toyota Hilux', driver: 'Kemal Fauzi', location: 'Pool Jakarta' },
	];

	const statusFilter = url.searchParams.get('status') || 'All';
	let filtered = pendingOrders;
	if (statusFilter !== 'All') filtered = filtered.filter(o => o.status === statusFilter);

	return {
		orders: filtered,
		availableUnits,
		summary: {
			total: pendingOrders.length,
			pending: pendingOrders.filter(o => o.status === 'Pending').length,
			dispatched: pendingOrders.filter(o => o.status === 'Dispatched').length,
			availableUnits: availableUnits.length
		}
	};
};
