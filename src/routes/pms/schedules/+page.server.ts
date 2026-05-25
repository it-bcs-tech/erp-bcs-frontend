import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const allSchedules = [
		{ id: 'SCH-001', unit: 'B 1234 CD', type: 'Ganti Oli Mesin', interval: '5,000 km / 3 bulan', lastDone: '2026-02-20', lastKm: 145000, nextDue: '2026-05-20', nextKm: 150000, status: 'Upcoming', items: ['Oli Mesin SAE 40 - 10L', 'Filter Oli'], estimatedCost: 500000, mechanic: 'Hendra Wijaya' },
		{ id: 'SCH-002', unit: 'D 5678 EF', type: 'Ganti Ban Belakang', interval: 'Per kondisi / 80,000 km', lastDone: '2025-12-01', lastKm: 98000, nextDue: '2026-05-18', nextKm: 120000, status: 'Due Today', items: ['Ban Truk 10.00-20 x4', 'Ban Dalam x4'], estimatedCost: 12800000, mechanic: 'Rudi Hartono' },
		{ id: 'SCH-003', unit: 'L 9012 GH', type: 'Service Berkala 100K', interval: '100,000 km', lastDone: '-', lastKm: 0, nextDue: '2026-05-22', nextKm: 100000, status: 'Upcoming', items: ['Filter Udara', 'Filter Solar', 'Oli Mesin 10L', 'V-Belt'], estimatedCost: 2800000, mechanic: 'Agus Salim' },
		{ id: 'SCH-004', unit: 'F 7890 KL', type: 'Ganti Kampas Rem', interval: 'Per kondisi', lastDone: '2025-11-20', lastKm: 28000, nextDue: '2026-05-16', nextKm: null, status: 'Overdue', items: ['Kampas Rem Depan 1 Set', 'Kampas Rem Belakang 1 Set'], estimatedCost: 1350000, mechanic: 'Hendra Wijaya' },
		{ id: 'SCH-005', unit: 'H 3456 MN', type: 'Ganti Oli Gardan', interval: '20,000 km / 6 bulan', lastDone: '2025-12-10', lastKm: 41000, nextDue: '2026-06-10', nextKm: 61000, status: 'Scheduled', items: ['Oli Gardan SAE 90 - 6L'], estimatedCost: 250000, mechanic: 'Rudi Hartono' },
		{ id: 'SCH-006', unit: 'AB 1122 OP', type: 'Cek & Isi Ulang AC', interval: '6 bulan', lastDone: '2025-11-15', lastKm: null, nextDue: '2026-05-28', nextKm: null, status: 'Scheduled', items: ['Freon R134a - 1 kg'], estimatedCost: 350000, mechanic: 'Agus Salim' },
		{ id: 'SCH-007', unit: 'B 1234 CD', type: 'Ganti Aki', interval: 'Per kondisi / 2 tahun', lastDone: '2024-06-01', lastKm: null, nextDue: '2026-06-01', nextKm: null, status: 'Scheduled', items: ['Aki Truk 12V 120Ah x2'], estimatedCost: 2800000, mechanic: 'Hendra Wijaya' },
		{ id: 'SCH-008', unit: 'W 5566 ST', type: 'Ganti Oli + Service', interval: '5,000 km / 3 bulan', lastDone: '2026-02-01', lastKm: 67000, nextDue: '2026-05-01', nextKm: 72000, status: 'Overdue', items: ['Oli Mesin SAE 40 - 10L', 'Filter Oli', 'Filter Udara'], estimatedCost: 600000, mechanic: 'Agus Salim' },
	];

	const statusFilter = url.searchParams.get('status') || 'All';
	const search = url.searchParams.get('search')?.toLowerCase() || '';
	let filtered = allSchedules;
	if (search) filtered = filtered.filter(s => s.unit.toLowerCase().includes(search) || s.type.toLowerCase().includes(search));
	if (statusFilter !== 'All') filtered = filtered.filter(s => s.status === statusFilter);

	const stats = {
		overdue: allSchedules.filter(s => s.status === 'Overdue').length,
		dueToday: allSchedules.filter(s => s.status === 'Due Today').length,
		upcoming: allSchedules.filter(s => s.status === 'Upcoming').length,
		scheduled: allSchedules.filter(s => s.status === 'Scheduled').length,
	};

	return { schedules: filtered, stats };
};
