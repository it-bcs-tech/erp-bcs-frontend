import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	// In production, fetch from backend API
	try {
		return {
			metrics: {
				totalCustomers: 87,
				activeCustomers: 64,
				newCustomersThisMonth: 5,
				totalOrders: 342,
				ordersThisMonth: 48,
				pendingOrders: 12,
				revenue: 2450000000,
				revenueGrowth: 12.5,
				avgOrderValue: 28500000
			}
		};
	} catch (error) {
		console.error('Failed to fetch marketing metrics:', error);
		return {
			metrics: {
				totalCustomers: 0,
				activeCustomers: 0,
				newCustomersThisMonth: 0,
				totalOrders: 0,
				ordersThisMonth: 0,
				pendingOrders: 0,
				revenue: 0,
				revenueGrowth: 0,
				avgOrderValue: 0
			}
		};
	}
};
