import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Mock Data for Trips
	const allTrips = [
		{ id: 'TRP-20260501', vehicle: 'B 1234 CD', driver: 'Ahmad Subarkah', origin: 'Jakarta (PIK Warehouse)', destination: 'Surabaya (Tanjung Perak)', status: 'In Transit', progress: 65, departedAt: '2026-05-15 06:00', eta: '2026-05-15 18:30', distance: '785 km', cargo: 'Container 40ft' },
		{ id: 'TRP-20260502', vehicle: 'L 9012 GH', driver: 'Budi Santoso', origin: 'Semarang (Bonded Zone)', destination: 'Jakarta (Sunter)', status: 'Completed', progress: 100, departedAt: '2026-05-14 08:00', eta: '2026-05-14 16:00', distance: '440 km', cargo: 'Electronics' },
		{ id: 'TRP-20260503', vehicle: 'B 3456 IJ', driver: 'Cahyo Wibowo', origin: 'Jakarta (Cakung)', destination: 'Bandung (Gedebage)', status: 'In Transit', progress: 40, departedAt: '2026-05-15 09:30', eta: '2026-05-15 14:00', distance: '150 km', cargo: 'FMCG Goods' },
		{ id: 'TRP-20260504', vehicle: 'D 5678 EF', driver: 'Dian Prasetyo', origin: 'Surabaya (SIER)', destination: 'Malang (Singosari)', status: 'Scheduled', progress: 0, departedAt: '2026-05-16 07:00', eta: '2026-05-16 10:00', distance: '90 km', cargo: 'Spare Parts' },
		{ id: 'TRP-20260505', vehicle: 'F 7890 KL', driver: 'Eko Firmansyah', origin: 'Jakarta (Marunda)', destination: 'Cirebon (Palimanan)', status: 'Delayed', progress: 25, departedAt: '2026-05-15 05:00', eta: '2026-05-15 12:00', distance: '260 km', cargo: 'Raw Materials' },
		{ id: 'TRP-20260506', vehicle: 'B 1234 CD', driver: 'Ahmad Subarkah', origin: 'Surabaya (Tanjung Perak)', destination: 'Bali (Gilimanuk)', status: 'Scheduled', progress: 0, departedAt: '2026-05-17 04:00', eta: '2026-05-17 12:00', distance: '320 km', cargo: 'Container 20ft' },
		{ id: 'TRP-20260507', vehicle: 'L 9012 GH', driver: 'Budi Santoso', origin: 'Jakarta (Sunter)', destination: 'Bekasi (MM2100)', status: 'Completed', progress: 100, departedAt: '2026-05-13 10:00', eta: '2026-05-13 11:30', distance: '35 km', cargo: 'Documents' },
	];

	const metrics = {
		activeTrips: allTrips.filter(t => t.status === 'In Transit').length,
		completedToday: allTrips.filter(t => t.status === 'Completed').length,
		scheduled: allTrips.filter(t => t.status === 'Scheduled').length,
		delayed: allTrips.filter(t => t.status === 'Delayed').length
	};

	// Extract search and filters
	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const statusFilter = url.searchParams.get('status') || 'All';

	let filteredTrips = allTrips;

	if (search) {
		filteredTrips = filteredTrips.filter(t =>
			t.id.toLowerCase().includes(search) ||
			t.vehicle.toLowerCase().includes(search) ||
			t.driver.toLowerCase().includes(search) ||
			t.destination.toLowerCase().includes(search)
		);
	}

	if (statusFilter !== 'All') {
		filteredTrips = filteredTrips.filter(t => t.status === statusFilter);
	}

	const perPage = 5;
	const page = parseInt(url.searchParams.get('page') || '1');
	const total = filteredTrips.length;
	const start = (page - 1) * perPage;
	const paginatedTrips = filteredTrips.slice(start, start + perPage);

	return {
		trips: paginatedTrips,
		metrics,
		meta: {
			current_page: page,
			per_page: perPage,
			total: total
		}
	};
};
