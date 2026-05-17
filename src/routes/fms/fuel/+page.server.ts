import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const allLogs = [
		{ id: 'FUEL-001', vehicle: 'B 1234 CD', driver: 'Ahmad Subarkah', date: '2026-05-15', station: 'Shell Cakung', fuelType: 'Solar', liters: 120, pricePerLiter: 6800, totalCost: 816000, odometer: 145230, tripId: 'TRP-20260501' },
		{ id: 'FUEL-002', vehicle: 'L 9012 GH', driver: 'Budi Santoso', date: '2026-05-14', station: 'Pertamina Sunter', fuelType: 'Solar', liters: 95, pricePerLiter: 6500, totalCost: 617500, odometer: 98450, tripId: 'TRP-20260502' },
		{ id: 'FUEL-003', vehicle: 'B 3456 IJ', driver: 'Cahyo Wibowo', date: '2026-05-15', station: 'Pertamina Cakung', fuelType: 'Solar', liters: 80, pricePerLiter: 6500, totalCost: 520000, odometer: 67890, tripId: 'TRP-20260503' },
		{ id: 'FUEL-004', vehicle: 'D 5678 EF', driver: 'Dian Prasetyo', date: '2026-05-13', station: 'BP Kelapa Gading', fuelType: 'Pertamax', liters: 45, pricePerLiter: 13300, totalCost: 598500, odometer: 54200, tripId: '-' },
		{ id: 'FUEL-005', vehicle: 'F 7890 KL', driver: 'Eko Firmansyah', date: '2026-05-15', station: 'Shell Marunda', fuelType: 'Solar', liters: 65, pricePerLiter: 6800, totalCost: 442000, odometer: 32100, tripId: 'TRP-20260505' },
		{ id: 'FUEL-006', vehicle: 'B 1234 CD', driver: 'Ahmad Subarkah', date: '2026-05-12', station: 'Pertamina Cikarang', fuelType: 'Solar', liters: 130, pricePerLiter: 6500, totalCost: 845000, odometer: 144500, tripId: 'TRP-20260407' },
		{ id: 'FUEL-007', vehicle: 'L 9012 GH', driver: 'Budi Santoso', date: '2026-05-10', station: 'Shell Semarang', fuelType: 'Solar', liters: 110, pricePerLiter: 6800, totalCost: 748000, odometer: 97800, tripId: 'TRP-20260410' },
		{ id: 'FUEL-008', vehicle: 'B 3456 IJ', driver: 'Cahyo Wibowo', date: '2026-05-09', station: 'Pertamina Bekasi', fuelType: 'Solar', liters: 75, pricePerLiter: 6500, totalCost: 487500, odometer: 67200, tripId: 'TRP-20260408' },
	];

	// Calculate metrics
	const thisMonthLogs = allLogs; // All mock data is this month
	const totalLiters = thisMonthLogs.reduce((sum, l) => sum + l.liters, 0);
	const totalCost = thisMonthLogs.reduce((sum, l) => sum + l.totalCost, 0);
	const avgCostPerLiter = totalCost / totalLiters;
	const uniqueVehicles = new Set(thisMonthLogs.map(l => l.vehicle)).size;

	const metrics = {
		totalLiters,
		totalCost,
		avgCostPerLiter: Math.round(avgCostPerLiter),
		vehiclesRefueled: uniqueVehicles,
		fillUpsThisMonth: thisMonthLogs.length
	};

	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const fuelFilter = url.searchParams.get('fuel') || 'All';

	let filtered = allLogs;
	if (search) {
		filtered = filtered.filter(l =>
			l.vehicle.toLowerCase().includes(search) ||
			l.driver.toLowerCase().includes(search) ||
			l.station.toLowerCase().includes(search) ||
			l.id.toLowerCase().includes(search)
		);
	}
	if (fuelFilter !== 'All') {
		filtered = filtered.filter(l => l.fuelType === fuelFilter);
	}

	const perPage = 5;
	const page = parseInt(url.searchParams.get('page') || '1');
	const total = filtered.length;
	const start = (page - 1) * perPage;
	const paginated = filtered.slice(start, start + perPage);

	return {
		logs: paginated,
		metrics,
		meta: { current_page: page, per_page: perPage, total }
	};
};
