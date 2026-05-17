import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		summary: {
			totalRevenue: 2450000000,
			totalOrders: 342,
			avgOrderValue: 28500000,
			topZone: 'Java East',
			customerRetention: 88.5,
			newCustomers: 12
		},
		zoneBreakdown: [
			{ zone: 'Java East', orders: 125, revenue: 980000000, percentage: 40 },
			{ zone: 'Java Central', orders: 85, revenue: 620000000, percentage: 25 },
			{ zone: 'Java West', orders: 72, revenue: 510000000, percentage: 21 },
			{ zone: 'Banten', orders: 60, revenue: 340000000, percentage: 14 }
		],
		topCustomers: [
			{ name: 'PT Indofood Sukses Makmur', orders: 48, revenue: 580000000 },
			{ name: 'PT Astra International', orders: 42, revenue: 520000000 },
			{ name: 'PT Unilever Indonesia', orders: 35, revenue: 420000000 },
			{ name: 'PT Mayora Indah Tbk', orders: 28, revenue: 310000000 },
			{ name: 'PT Kalbe Farma', orders: 18, revenue: 210000000 }
		]
	};
};
