import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const allHistory = [
		{ id: 'TRP-260515001', unit: 'B 1234 CD', driver: 'Ahmad Subarkah', origin: 'Jakarta', destination: 'Surabaya', do: 'DO-260515001', customer: 'PT Indofood', startDate: '2026-05-15 06:00', endDate: '2026-05-16 14:30', distance: 780, duration: '32h 30m', avgSpeed: 48, maxSpeed: 92, fuelUsed: 210, stops: 4, status: 'Completed' },
		{ id: 'TRP-260514008', unit: 'L 9012 GH', driver: 'Cahyo Wibowo', origin: 'Bandung', destination: 'Semarang', do: 'DO-260514008', customer: 'PT Unilever', startDate: '2026-05-14 07:30', endDate: '2026-05-15 10:00', distance: 430, duration: '26h 30m', avgSpeed: 42, maxSpeed: 88, fuelUsed: 145, stops: 3, status: 'Completed' },
		{ id: 'TRP-260513006', unit: 'AB 1122 OP', driver: 'Gunawan W.', origin: 'Semarang', destination: 'Surabaya', do: 'DO-260513006', customer: 'PT Hartono', startDate: '2026-05-13 05:00', endDate: '2026-05-13 16:00', distance: 350, duration: '11h', avgSpeed: 55, maxSpeed: 95, fuelUsed: 120, stops: 2, status: 'Completed' },
		{ id: 'TRP-260512010', unit: 'D 5678 EF', driver: 'Budi Santoso', origin: 'Gresik', destination: 'Surabaya', do: 'DO-260512010', customer: 'PT Semen Indonesia', startDate: '2026-05-12 08:00', endDate: '2026-05-12 10:30', distance: 45, duration: '2h 30m', avgSpeed: 35, maxSpeed: 60, fuelUsed: 18, stops: 0, status: 'Completed' },
		{ id: 'TRP-260514012', unit: 'W 5566 ST', driver: 'Irfan Maulana', origin: 'Yogyakarta', destination: 'Surabaya', do: 'DO-260514012', customer: 'PT Sri Rejeki', startDate: '2026-05-14 04:30', endDate: '-', distance: 195, duration: '-', avgSpeed: 50, maxSpeed: 85, fuelUsed: 68, stops: 2, status: 'In Progress' },
		{ id: 'TRP-260511007', unit: 'F 7890 KL', driver: 'Eko Firmansyah', origin: 'Jakarta', destination: 'Bandung', do: 'DO-260511007', customer: 'PT Telkom', startDate: '2026-05-11 09:00', endDate: '2026-05-11 14:00', distance: 150, duration: '5h', avgSpeed: 45, maxSpeed: 78, fuelUsed: 52, stops: 1, status: 'Completed' },
		{ id: 'TRP-260510003', unit: 'H 3456 MN', driver: 'Fajar Nugroho', origin: 'Jakarta', destination: 'Cirebon', do: 'DO-260510003', customer: 'PT Mayora', startDate: '2026-05-10 06:30', endDate: '2026-05-10 14:00', distance: 260, duration: '7h 30m', avgSpeed: 52, maxSpeed: 90, fuelUsed: 85, stops: 2, status: 'Completed' },
	];

	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const statusFilter = url.searchParams.get('status') || 'All';

	let filtered = allHistory;
	if (search) {
		filtered = filtered.filter(h =>
			h.unit.toLowerCase().includes(search) ||
			h.driver.toLowerCase().includes(search) ||
			h.do.toLowerCase().includes(search) ||
			h.origin.toLowerCase().includes(search) ||
			h.destination.toLowerCase().includes(search)
		);
	}
	if (statusFilter !== 'All') filtered = filtered.filter(h => h.status === statusFilter);

	const perPage = 5;
	const page = parseInt(url.searchParams.get('page') || '1');
	const total = filtered.length;
	const start = (page - 1) * perPage;
	const paginated = filtered.slice(start, start + perPage);

	return {
		history: paginated,
		stats: {
			totalTrips: allHistory.length,
			totalDistance: allHistory.reduce((sum, h) => sum + h.distance, 0),
			avgSpeed: Math.round(allHistory.reduce((sum, h) => sum + h.avgSpeed, 0) / allHistory.length),
			totalFuel: allHistory.reduce((sum, h) => sum + h.fuelUsed, 0)
		},
		meta: { current_page: page, per_page: perPage, total }
	};
};
