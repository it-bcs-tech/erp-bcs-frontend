import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const allIncidents = [
		{ id: 'INC-260501', date: '2026-05-12', vehicle: 'B 1234 CD', driver: 'Ahmad Subarkah', type: 'Accident', severity: 'Major', location: 'Tol Cikampek KM 42', status: 'Under Investigation', description: 'Rear-ended by another truck. Significant damage to rear bumper and tail lights.' },
		{ id: 'INC-260428', date: '2026-04-28', vehicle: 'L 9012 GH', driver: 'Budi Santoso', type: 'Breakdown', severity: 'Moderate', location: 'Jl. Pantura, Batang', status: 'Resolved', description: 'Engine overheated. Towed to nearest workshop.' },
		{ id: 'INC-260415', date: '2026-04-15', vehicle: 'D 5678 EF', driver: 'Dian Prasetyo', type: 'Traffic Violation', severity: 'Minor', location: 'Jl. Sudirman, Jakarta', status: 'Resolved', description: 'Speeding ticket received.' },
		{ id: 'INC-260310', date: '2026-03-10', vehicle: 'F 7890 KL', driver: 'Eko Firmansyah', type: 'Cargo Damage', severity: 'Moderate', location: 'Warehouse PIK', status: 'Resolved', description: 'Water leak damaged 5 boxes of electronics during heavy rain.' },
		{ id: 'INC-260205', date: '2026-02-05', vehicle: 'B 3456 IJ', driver: 'Cahyo Wibowo', type: 'Accident', severity: 'Minor', location: 'Surabaya Port', status: 'Resolved', description: 'Scraped side mirror against a pole while parking.' },
	];

	const metrics = {
		totalIncidents: allIncidents.length,
		openCases: allIncidents.filter(i => i.status !== 'Resolved').length,
		accidents: allIncidents.filter(i => i.type === 'Accident').length,
		breakdowns: allIncidents.filter(i => i.type === 'Breakdown').length
	};

	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const typeFilter = url.searchParams.get('type') || 'All';
	const statusFilter = url.searchParams.get('status') || 'All';

	let filtered = allIncidents;
	if (search) {
		filtered = filtered.filter(i =>
			i.vehicle.toLowerCase().includes(search) ||
			i.driver.toLowerCase().includes(search) ||
			i.id.toLowerCase().includes(search) ||
			i.location.toLowerCase().includes(search)
		);
	}
	if (typeFilter !== 'All') {
		filtered = filtered.filter(i => i.type === typeFilter);
	}
	if (statusFilter !== 'All') {
		filtered = filtered.filter(i => i.status === statusFilter);
	}

	const perPage = 5;
	const page = parseInt(url.searchParams.get('page') || '1');
	const total = filtered.length;
	const start = (page - 1) * perPage;
	const paginated = filtered.slice(start, start + perPage);

	return {
		incidents: paginated,
		metrics,
		meta: { current_page: page, per_page: perPage, total }
	};
};
