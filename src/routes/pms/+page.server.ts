import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		summary: {
			totalItems: 248,
			lowStock: 12,
			pendingPO: 5,
			totalPOValue: 87500000,
			scheduledService: 8,
			overdueService: 3,
		},
		lowStockAlerts: [
			{ code: 'ITM-045', name: 'Oli Mesin SAE 40', unit: 'Liter', stock: 15, minStock: 50, supplier: 'PT Pertamina Lubricants', category: 'Oli & Pelumas' },
			{ code: 'ITM-089', name: 'Filter Udara Hino 500', unit: 'Pcs', stock: 3, minStock: 10, supplier: 'CV Sumber Jaya Parts', category: 'Sparepart' },
			{ code: 'ITM-112', name: 'Kampas Rem Belakang', unit: 'Set', stock: 4, minStock: 8, supplier: 'PT Isuzu Astra', category: 'Sparepart' },
			{ code: 'ITM-067', name: 'Ban Truk 10.00-20', unit: 'Pcs', stock: 6, minStock: 16, supplier: 'PT Bridgestone', category: 'Ban' },
		],
		recentPOs: [
			{ id: 'PO-260515001', supplier: 'PT Pertamina Lubricants', items: 3, totalValue: 8500000, status: 'Approved', date: '2026-05-15' },
			{ id: 'PO-260514002', supplier: 'CV Sumber Jaya Parts', items: 7, totalValue: 12300000, status: 'Received', date: '2026-05-14' },
			{ id: 'PO-260513003', supplier: 'PT Bridgestone', items: 2, totalValue: 24000000, status: 'Pending', date: '2026-05-13' },
		],
		upcomingSchedules: [
			{ unit: 'B 1234 CD', type: 'Ganti Oli', dueDate: '2026-05-20', dueKm: '150,000 km', status: 'Upcoming' },
			{ unit: 'D 5678 EF', type: 'Ganti Ban', dueDate: '2026-05-18', dueKm: '-', status: 'Due Today' },
			{ unit: 'L 9012 GH', type: 'Service Berkala', dueDate: '2026-05-22', dueKm: '100,000 km', status: 'Upcoming' },
			{ unit: 'F 7890 KL', type: 'Ganti Kampas Rem', dueDate: '2026-05-16', dueKm: '-', status: 'Overdue' },
		],
		categoryBreakdown: [
			{ name: 'Sparepart', count: 98, value: 45200000, icon: 'build', color: 'blue' },
			{ name: 'Oli & Pelumas', count: 45, value: 12800000, icon: 'oil_barrel', color: 'amber' },
			{ name: 'Ban', count: 32, value: 28000000, icon: 'tire_repair', color: 'emerald' },
			{ name: 'Konsumabel', count: 73, value: 8100000, icon: 'cleaning_services', color: 'violet' },
		]
	};
};
