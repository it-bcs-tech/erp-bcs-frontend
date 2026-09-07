import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		const [
			assetStats,
			assetCategories,
			permitStats,
			criticalPermits,
			facilityStats,
			recentWorkOrders,
			stationeryStats,
			criticalStockItems,
			recentStationeryRequests
		] = await Promise.all([
			// 1. Asset totals
			sql`
				SELECT 
					COUNT(*)::int as total_assets,
					COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::int as active_assets,
					COALESCE(SUM(acquisition_cost), 0)::numeric as total_asset_value,
					COUNT(CASE WHEN condition IN ('MAJOR_DAMAGE', 'SCRAP') THEN 1 END)::int as damaged_assets
				FROM ga.assets
			`,
			// 2. Asset categories
			sql`
				SELECT 
					category,
					COUNT(*)::int as count,
					COALESCE(SUM(acquisition_cost), 0)::numeric as total_value
				FROM ga.assets
				GROUP BY category
				ORDER BY total_value DESC
			`,
			// 3. Permit EWS stats
			sql`
				SELECT
					COUNT(*)::int as total_permits,
					COUNT(CASE WHEN expiry_date < CURRENT_DATE THEN 1 END)::int as expired_count,
					COUNT(CASE WHEN expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1 END)::int as urgent_7_count,
					COUNT(CASE WHEN expiry_date > CURRENT_DATE + INTERVAL '7 days' AND expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END)::int as critical_30_count,
					COUNT(CASE WHEN expiry_date > CURRENT_DATE + INTERVAL '30 days' THEN 1 END)::int as valid_count
				FROM ga.fleet_legal_permits
			`,
			// 4. Critical & Expiring Permits
			sql`
				SELECT 
					id, unit_number, police_number, permit_type, document_number, institution,
					to_char(expiry_date, 'YYYY-MM-DD') as expiry_date_str,
					expiry_date,
					(expiry_date - CURRENT_DATE)::int as days_remaining,
					status, renewal_cost
				FROM ga.fleet_legal_permits
				WHERE expiry_date <= CURRENT_DATE + INTERVAL '60 days'
				ORDER BY expiry_date ASC
				LIMIT 6
			`,
			// 5. Facility WO stats
			sql`
				SELECT
					COUNT(*)::int as total_wo,
					COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::int as pending_wo,
					COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END)::int as in_progress_wo,
					COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)::int as approved_wo,
					COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::int as completed_wo,
					COUNT(CASE WHEN urgency = 'EMERGENCY' AND status != 'COMPLETED' THEN 1 END)::int as emergency_active_wo
				FROM ga.facility_work_orders
			`,
			// 6. Recent Work Orders
			sql`
				SELECT 
					id, wo_number, facility_type, location, requester_name, department,
					description, urgency, status, technician_vendor, estimated_cost, actual_cost,
					to_char(created_at, 'YYYY-MM-DD HH24:MI') as created_at_str
				FROM ga.facility_work_orders
				ORDER BY created_at DESC
				LIMIT 5
			`,
			// 7. Stationery Stats
			sql`
				SELECT
					(SELECT COUNT(*)::int FROM ga.stationery_items) as total_items,
					(SELECT COUNT(*)::int FROM ga.stationery_items WHERE stock_quantity <= minimum_stock) as low_stock_items,
					(SELECT COUNT(*)::int FROM ga.stationery_requests WHERE status = 'SUBMITTED') as pending_requests,
					(SELECT COUNT(*)::int FROM ga.stationery_requests WHERE status = 'APPROVED') as approved_requests
			`,
			// 8. Low Stock Stationery Items
			sql`
				SELECT id, item_code, name, category, unit, stock_quantity, minimum_stock
				FROM ga.stationery_items
				WHERE stock_quantity <= minimum_stock
				ORDER BY stock_quantity ASC
				LIMIT 5
			`,
			// 9. Recent Stationery Requests
			sql`
				SELECT 
					id, req_number, to_char(request_date, 'YYYY-MM-DD') as request_date_str,
					department, requester_name, status, total_items_count, notes
				FROM ga.stationery_requests
				ORDER BY request_date DESC, created_at DESC
				LIMIT 5
			`
		]);

		return {
			assets: {
				totals: assetStats[0] || { total_assets: 0, active_assets: 0, total_asset_value: 0, damaged_assets: 0 },
				categories: assetCategories || []
			},
			permits: {
				stats: permitStats[0] || { total_permits: 0, expired_count: 0, urgent_7_count: 0, critical_30_count: 0, valid_count: 0 },
				criticalList: criticalPermits || []
			},
			facilities: {
				stats: facilityStats[0] || { total_wo: 0, pending_wo: 0, in_progress_wo: 0, approved_wo: 0, completed_wo: 0, emergency_active_wo: 0 },
				recentList: recentWorkOrders || []
			},
			stationery: {
				stats: stationeryStats[0] || { total_items: 0, low_stock_items: 0, pending_requests: 0, approved_requests: 0 },
				lowStockList: criticalStockItems || [],
				recentRequests: recentStationeryRequests || []
			}
		};
	} catch (error) {
		console.error('Error loading GA dashboard data:', error);
		return {
			assets: {
				totals: { total_assets: 0, active_assets: 0, total_asset_value: 0, damaged_assets: 0 },
				categories: []
			},
			permits: {
				stats: { total_permits: 0, expired_count: 0, urgent_7_count: 0, critical_30_count: 0, valid_count: 0 },
				criticalList: []
			},
			facilities: {
				stats: { total_wo: 0, pending_wo: 0, in_progress_wo: 0, approved_wo: 0, completed_wo: 0, emergency_active_wo: 0 },
				recentList: []
			},
			stationery: {
				stats: { total_items: 0, low_stock_items: 0, pending_requests: 0, approved_requests: 0 },
				lowStockList: [],
				recentRequests: []
			}
		};
	}
};
