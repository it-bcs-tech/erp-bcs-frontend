import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// Metrics
		const totalCustomersResult = await sql`SELECT COUNT(*) FROM master.m_customer WHERE is_active = true`;
		const activeCustomersResult = await sql`SELECT COUNT(DISTINCT customer_id) FROM marketing.sales_order WHERE status NOT IN ('CANCELED', 'COMPLETED')`;
		const ordersThisMonthResult = await sql`SELECT COUNT(*) FROM marketing.sales_order WHERE date_trunc('month', created_at) = date_trunc('month', current_date)`;
		const pendingOrdersResult = await sql`SELECT COUNT(*) FROM marketing.sales_order WHERE status IN ('WAITING_UJO', 'WAITING_TARIFF', 'WAITING_CUSTOMER')`;
		
		const revenueResult = await sql`
			SELECT SUM(tariff) as total 
			FROM marketing.sales_order 
			WHERE status IN ('READY_TO_DISPATCH', 'DISPATCHED', 'COMPLETED')
			AND date_trunc('month', created_at) = date_trunc('month', current_date)
		`;

		const metrics = {
			totalCustomers: parseInt(totalCustomersResult[0].count),
			newCustomersThisMonth: 12, // Mock for now until we have created_at filter
			activeCustomers: parseInt(activeCustomersResult[0].count),
			ordersThisMonth: parseInt(ordersThisMonthResult[0].count),
			pendingOrders: parseInt(pendingOrdersResult[0].count),
			revenue: parseFloat(revenueResult[0].total) || 0,
			revenueGrowth: 15
		};

		// Fleet Availability (Mocked or simple count)
		const fleetResult = await sql`
			SELECT current_state, count(*) as count 
			FROM fleet.unit 
			WHERE is_active = true 
			GROUP BY current_state
		`;
		
		let available = 0;
		let moving = 0;
		let maintenance = 0;
		let totalFleet = 0;

		fleetResult.forEach(row => {
			const count = parseInt(row.count);
			totalFleet += count;
			if (row.current_state === 'STANDBY') available += count;
			else if (row.current_state === 'MOVING') moving += count;
			else maintenance += count; // MAINTENANCE
		});

		const fleetAvailability = { available, moving, maintenance, total: totalFleet };

		// Recent Orders
		const recentOrders = await sql`
			SELECT 
				o.id as do,
				c.nama_kustomer as customer,
				ori.nama_kustomer as origin,
				dest.nama_kustomer as destination,
				o.status
			FROM marketing.sales_order o
			LEFT JOIN master.m_customer c ON c.id = o.customer_id
			LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
			ORDER BY o.created_at DESC
			LIMIT 3
		`;

		const topCustomers = await sql`
			SELECT 
				c.nama_kustomer as name,
				COUNT(o.id) as orders,
				COALESCE(SUM(o.tariff), 0) as revenue,
				c.tier
			FROM master.m_customer c
			JOIN marketing.sales_order o ON c.id = o.customer_id
			WHERE o.status IN ('READY_TO_DISPATCH', 'DISPATCHED', 'COMPLETED')
			GROUP BY c.id, c.nama_kustomer, c.tier
			ORDER BY revenue DESC
			LIMIT 3
		`;

		// Pipeline Counts
		const pipelineResult = await sql`
			SELECT stage, count(*) as count 
			FROM marketing.deals 
			GROUP BY stage
		`;
		let pipelineCounts = {
			PROSPECTING: 0,
			QUOTATION: 0,
			NEGOTIATION: 0,
			WON: 0,
			LOST: 0
		};
		pipelineResult.forEach(row => {
			const st = row.stage;
			if (pipelineCounts.hasOwnProperty(st)) {
				pipelineCounts[st as keyof typeof pipelineCounts] = parseInt(row.count);
			} else if (st === 'CLOSED_WON') {
				pipelineCounts.WON += parseInt(row.count);
			} else if (st === 'CLOSED_LOST') {
				pipelineCounts.LOST += parseInt(row.count);
			}
		});

		return {
			metrics,
			fleetAvailability,
			recentOrders: recentOrders as any[],
			topCustomers: topCustomers as any[],
			pipelineCounts
		};
	} catch (error) {
		console.error("Error loading marketing overview:", error);
		return { 
			metrics: { totalCustomers: 0, newCustomersThisMonth: 0, activeCustomers: 0, ordersThisMonth: 0, pendingOrders: 0, revenue: 0, revenueGrowth: 0 },
			fleetAvailability: { available: 0, moving: 0, maintenance: 0, total: 0 },
			recentOrders: [],
			topCustomers: [],
			pipelineCounts: { PROSPECTING: 0, QUOTATION: 0, NEGOTIATION: 0, WON: 0, LOST: 0 }
		};
	}
};
