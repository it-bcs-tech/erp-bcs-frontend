import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Mock Data for Vehicles
	const vehicles = [
		{ id: 'VHC-001', plateNumber: 'B 1234 CD', type: 'Heavy Truck', status: 'In Transit', brand: 'Hino', year: 2021, color: 'emerald' },
		{ id: 'VHC-002', plateNumber: 'D 5678 EF', type: 'Delivery Van', status: 'Maintenance', brand: 'Isuzu', year: 2020, color: 'rose' },
		{ id: 'VHC-003', plateNumber: 'L 9012 GH', type: 'Box Truck', status: 'Idle', brand: 'Mitsubishi', year: 2022, color: 'amber' },
		{ id: 'VHC-004', plateNumber: 'B 3456 IJ', type: 'Heavy Truck', status: 'In Transit', brand: 'Hino', year: 2023, color: 'emerald' },
		{ id: 'VHC-005', plateNumber: 'F 7890 KL', type: 'Pickup', status: 'Idle', brand: 'Toyota', year: 2019, color: 'amber' },
	];

	// Extract search and filters
	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const typeFilter = url.searchParams.get('type') || 'All';

	// Filter data
	let filteredVehicles = vehicles;
	
	if (search) {
		filteredVehicles = filteredVehicles.filter(v => 
			v.plateNumber.toLowerCase().includes(search) || 
			v.id.toLowerCase().includes(search)
		);
	}

	if (typeFilter !== 'All') {
		filteredVehicles = filteredVehicles.filter(v => v.type === typeFilter);
	}

	// Mock pagination
	const perPage = 5;
	const page = parseInt(url.searchParams.get('page') || '1');
	const total = filteredVehicles.length;
	const start = (page - 1) * perPage;
	const paginatedVehicles = filteredVehicles.slice(start, start + perPage);

	return {
		vehicles: paginatedVehicles,
		meta: {
			current_page: page,
			per_page: perPage,
			total: total
		}
	};
};
