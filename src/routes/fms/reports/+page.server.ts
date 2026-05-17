import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// In a real application, this would fetch complex aggregated data
	const summaryData = {
		totalDistance: 124500, // km
		totalFuelCost: 145000000, // IDR
		totalMaintenanceCost: 35000000, // IDR
		avgUtilization: 78, // %
		tripsCompleted: 452,
		onTimeDeliveryRate: 94.5 // %
	};

	const costBreakdown = [
		{ category: 'Fuel', amount: 145000000, percentage: 65 },
		{ category: 'Maintenance', amount: 35000000, percentage: 16 },
		{ category: 'Driver Allowance (UJO)', amount: 28000000, percentage: 12 },
		{ category: 'Tolls & Parking', amount: 15000000, percentage: 7 }
	];

	const vehiclePerformance = [
		{ vehicle: 'B 1234 CD', type: 'Heavy Truck', distance: 12400, trips: 18, efficiency: 'High', costPerKm: 1800 },
		{ vehicle: 'L 9012 GH', type: 'Box Truck', distance: 9800, trips: 24, efficiency: 'Medium', costPerKm: 2100 },
		{ vehicle: 'B 3456 IJ', type: 'Heavy Truck', distance: 15200, trips: 15, efficiency: 'High', costPerKm: 1750 },
		{ vehicle: 'D 5678 EF', type: 'Delivery Van', distance: 6500, trips: 45, efficiency: 'Low', costPerKm: 2500 },
		{ vehicle: 'F 7890 KL', type: 'Pickup', distance: 8100, trips: 32, efficiency: 'Medium', costPerKm: 1950 }
	];

	const monthFilter = url.searchParams.get('month') || 'Current Month';

	return {
		summaryData,
		costBreakdown,
		vehiclePerformance,
		monthFilter
	};
};
