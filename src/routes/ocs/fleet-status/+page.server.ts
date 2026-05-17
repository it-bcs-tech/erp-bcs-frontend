import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const allUnits = [
		{ id: 'B 1234 CD', type: 'Heavy Truck', brand: 'Hino 500', driver: 'Ahmad Subarkah', status: 'Moving', location: 'Semarang Area', speed: 65, lastUpdate: '2 min ago', do: 'DO-260515001' },
		{ id: 'D 5678 EF', type: 'Box Truck', brand: 'Mitsubishi Colt Diesel', driver: 'Budi Santoso', status: 'Transit', location: 'Rest Area KM 315', speed: 0, lastUpdate: '15 min ago', do: 'DO-260515002' },
		{ id: 'L 9012 GH', type: 'Heavy Truck', brand: 'Hino 700', driver: 'Cahyo Wibowo', status: 'Loading', location: 'Gudang Bandung', speed: 0, lastUpdate: '5 min ago', do: 'DO-260514008' },
		{ id: 'F 7890 KL', type: 'Box Truck', brand: 'Isuzu Giga', driver: 'Eko Firmansyah', status: 'Moving', location: 'Cirebon Bypass', speed: 72, lastUpdate: '1 min ago', do: 'DO-260515003' },
		{ id: 'H 3456 MN', type: 'Heavy Truck', brand: 'Hino 500', driver: 'Fajar Nugroho', status: 'Available', location: 'Pool Jakarta', speed: 0, lastUpdate: '30 min ago', do: '-' },
		{ id: 'AB 1122 OP', type: 'Heavy Truck', brand: 'UD Trucks Quester', driver: 'Gunawan W.', status: 'Moving', location: 'Solo-Ngawi Toll', speed: 58, lastUpdate: '3 min ago', do: 'DO-260513006' },
		{ id: 'AG 3344 QR', type: 'Box Truck', brand: 'Mitsubishi Colt Diesel', driver: '-', status: 'Maintenance', location: 'Bengkel BCS Jakarta', speed: 0, lastUpdate: '2 hours ago', do: '-' },
		{ id: 'W 5566 ST', type: 'Heavy Truck', brand: 'Hino 700', driver: 'Irfan Maulana', status: 'Transit', location: 'SPBU KM 412', speed: 0, lastUpdate: '8 min ago', do: 'DO-260514012' },
		{ id: 'B 7788 UV', type: 'Delivery Van', brand: 'Daihatsu Gran Max', driver: 'Joko Purnomo', status: 'Available', location: 'Pool Jakarta', speed: 0, lastUpdate: '45 min ago', do: '-' },
		{ id: 'L 9900 WX', type: 'Heavy Truck', brand: 'Hino 500', driver: '-', status: 'Overhaul', location: 'Bengkel Rekanan Surabaya', speed: 0, lastUpdate: '1 day ago', do: '-' },
		{ id: 'F 2233 YZ', type: 'Pickup', brand: 'Toyota Hilux', driver: 'Kemal Fauzi', status: 'Available', location: 'Pool Jakarta', speed: 0, lastUpdate: '1 hour ago', do: '-' },
		{ id: 'H 4455 AB', type: 'Box Truck', brand: 'Isuzu Elf', driver: '-', status: 'Accident', location: 'Tol Cipali KM 128', speed: 0, lastUpdate: '3 hours ago', do: 'DO-260512015' },
	];

	const statusFilter = url.searchParams.get('status') || 'All';
	const search = url.searchParams.get('search')?.toLowerCase() || '';

	let filtered = allUnits;
	if (search) {
		filtered = filtered.filter(u =>
			u.id.toLowerCase().includes(search) ||
			u.driver.toLowerCase().includes(search) ||
			u.location.toLowerCase().includes(search)
		);
	}
	if (statusFilter !== 'All') filtered = filtered.filter(u => u.status === statusFilter);

	const summary = {
		total: allUnits.length,
		available: allUnits.filter(u => u.status === 'Available').length,
		moving: allUnits.filter(u => u.status === 'Moving').length,
		transit: allUnits.filter(u => u.status === 'Transit').length,
		loading: allUnits.filter(u => u.status === 'Loading').length,
		maintenance: allUnits.filter(u => u.status === 'Maintenance').length,
		overhaul: allUnits.filter(u => u.status === 'Overhaul').length,
		accident: allUnits.filter(u => u.status === 'Accident').length
	};

	const perPage = 6;
	const page = parseInt(url.searchParams.get('page') || '1');
	const total = filtered.length;
	const start = (page - 1) * perPage;
	const paginated = filtered.slice(start, start + perPage);

	return { units: paginated, summary, meta: { current_page: page, per_page: perPage, total } };
};
