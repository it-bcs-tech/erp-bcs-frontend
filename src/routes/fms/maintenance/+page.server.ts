import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const allRecords = [
		{ id: 'MNT-001', vehicle: 'B 1234 CD', type: 'Oil Change', priority: 'High', status: 'Overdue', scheduledDate: '2026-05-10', completedDate: '-', mechanic: 'Hendra Wijaya', cost: 'Rp 2.500.000', notes: 'Engine oil + filter replacement' },
		{ id: 'MNT-002', vehicle: 'D 5678 EF', type: 'Tire Replacement', priority: 'Medium', status: 'In Progress', scheduledDate: '2026-05-15', completedDate: '-', mechanic: 'Rudi Hartono', cost: 'Rp 8.400.000', notes: 'Replace 4 rear tires' },
		{ id: 'MNT-003', vehicle: 'L 9012 GH', type: 'Brake Inspection', priority: 'High', status: 'Scheduled', scheduledDate: '2026-05-18', completedDate: '-', mechanic: 'Hendra Wijaya', cost: 'Rp 1.200.000', notes: 'Front & rear brake pads check' },
		{ id: 'MNT-004', vehicle: 'B 3456 IJ', type: 'Full Service', priority: 'Low', status: 'Completed', scheduledDate: '2026-05-05', completedDate: '2026-05-06', mechanic: 'Agus Salim', cost: 'Rp 5.800.000', notes: '50,000 km routine service' },
		{ id: 'MNT-005', vehicle: 'F 7890 KL', type: 'Battery Check', priority: 'Medium', status: 'Completed', scheduledDate: '2026-05-08', completedDate: '2026-05-08', mechanic: 'Rudi Hartono', cost: 'Rp 950.000', notes: 'Battery load test + terminal cleaning' },
		{ id: 'MNT-006', vehicle: 'B 1234 CD', type: 'AC Repair', priority: 'Low', status: 'Scheduled', scheduledDate: '2026-05-20', completedDate: '-', mechanic: 'Agus Salim', cost: 'Rp 3.200.000', notes: 'Compressor replacement' },
		{ id: 'MNT-007', vehicle: 'D 5678 EF', type: 'Suspension Check', priority: 'High', status: 'Overdue', scheduledDate: '2026-05-12', completedDate: '-', mechanic: 'Hendra Wijaya', cost: 'Rp 4.100.000', notes: 'Shock absorber + bushings' },
	];

	const metrics = {
		overdue: allRecords.filter(r => r.status === 'Overdue').length,
		inProgress: allRecords.filter(r => r.status === 'In Progress').length,
		scheduled: allRecords.filter(r => r.status === 'Scheduled').length,
		completedThisMonth: allRecords.filter(r => r.status === 'Completed').length
	};

	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const statusFilter = url.searchParams.get('status') || 'All';

	let filtered = allRecords;
	if (search) {
		filtered = filtered.filter(r =>
			r.id.toLowerCase().includes(search) ||
			r.vehicle.toLowerCase().includes(search) ||
			r.type.toLowerCase().includes(search)
		);
	}
	if (statusFilter !== 'All') {
		filtered = filtered.filter(r => r.status === statusFilter);
	}

	const perPage = 5;
	const page = parseInt(url.searchParams.get('page') || '1');
	const total = filtered.length;
	const start = (page - 1) * perPage;
	const paginated = filtered.slice(start, start + perPage);

	return {
		records: paginated,
		metrics,
		meta: { current_page: page, per_page: perPage, total }
	};
};
