import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		const [
			assetStats,
			assetCategories,
			roomStats,
			roomsWithRealtimeStatus,
			upcomingRoomBookings,
			facilityStats,
			recentWorkOrders,
			stationeryStats,
			criticalStockItems,
			recentStationeryRequests,
			travelStats,
			archiveStats,
			visitorStats
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
			// 3. Room Reservations stats
			sql`
				SELECT
					(SELECT COUNT(*)::int FROM ga.facility_rooms WHERE is_active = true) as active_rooms,
					(SELECT COUNT(*)::int FROM ga.facility_bookings WHERE status = 'PENDING') as pending_bookings,
					(SELECT COUNT(*)::int FROM ga.facility_bookings WHERE status = 'APPROVED' AND start_time::date = CURRENT_DATE) as today_approved,
					(SELECT COUNT(*)::int FROM ga.facility_bookings WHERE status = 'APPROVED' AND NOW() BETWEEN start_time AND end_time) as in_use_now
			`,
			// 4. Rooms with real-time availability status
			sql`
				SELECT 
					r.id,
					r.room_code as "roomCode",
					r.room_name as "roomName",
					r.location,
					r.capacity,
					r.facilities,
					r.color_hex as "colorHex",
					r.is_active as "isActive",
					(
						SELECT COUNT(*)::int 
						FROM ga.facility_bookings b 
						WHERE b.room_id = r.id 
						  AND b.status IN ('APPROVED', 'PENDING') 
						  AND b.start_time::date = CURRENT_DATE
					) as "todayCount",
					cur.booking_number as "currentBookingNumber",
					cur.title as "currentTitle",
					cur.requester_name as "currentRequester",
					cur.department as "currentDepartment",
					to_char(cur.start_time, 'HH24:MI') as "currentStart",
					to_char(cur.end_time, 'HH24:MI') as "currentEnd"
				FROM ga.facility_rooms r
				LEFT JOIN LATERAL (
					SELECT booking_number, title, requester_name, department, start_time, end_time
					FROM ga.facility_bookings b
					WHERE b.room_id = r.id
					  AND b.status = 'APPROVED'
					  AND NOW() BETWEEN b.start_time AND b.end_time
					ORDER BY b.start_time ASC
					LIMIT 1
				) cur ON true
				WHERE r.is_active = true
				ORDER BY r.id ASC
			`,
			// 5. Today's & Pending Room Bookings
			sql`
				SELECT 
					b.id,
					b.booking_number as "bookingNumber",
					b.room_id as "roomId",
					r.room_name as "roomName",
					r.room_code as "roomCode",
					r.location as "roomLocation",
					r.color_hex as "roomColor",
					b.title,
					b.requester_name as "requesterName",
					b.department,
					b.attendees_count as "attendeesCount",
					to_char(b.start_time, 'YYYY-MM-DD') as "bookingDate",
					to_char(b.start_time, 'HH24:MI') as "startTimeFormatted",
					to_char(b.end_time, 'HH24:MI') as "endTimeFormatted",
					b.status,
					(NOW() BETWEEN b.start_time AND b.end_time AND b.status = 'APPROVED') as "isInUseNow",
					(b.start_time::date = CURRENT_DATE) as "isToday"
				FROM ga.facility_bookings b
				JOIN ga.facility_rooms r ON r.id = b.room_id
				WHERE b.status IN ('PENDING', 'APPROVED')
				  AND b.end_time >= CURRENT_DATE
				ORDER BY 
					CASE WHEN b.status = 'PENDING' THEN 0 ELSE 1 END,
					b.start_time ASC
				LIMIT 6
			`,
			// 6. Facility WO stats
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
			// 7. Recent Work Orders
			sql`
				SELECT 
					id, wo_number, facility_type, location, requester_name, department,
					description, urgency, status, technician_vendor, estimated_cost, actual_cost,
					to_char(created_at, 'YYYY-MM-DD HH24:MI') as created_at_str
				FROM ga.facility_work_orders
				ORDER BY created_at DESC
				LIMIT 5
			`,
			// 8. Stationery Stats
			sql`
				SELECT
					(SELECT COUNT(*)::int FROM ga.stationery_items) as total_items,
					(SELECT COUNT(*)::int FROM ga.stationery_items WHERE stock_quantity <= minimum_stock) as low_stock_items,
					(SELECT COUNT(*)::int FROM ga.stationery_requests WHERE status = 'SUBMITTED') as pending_requests,
					(SELECT COUNT(*)::int FROM ga.stationery_requests WHERE status = 'APPROVED') as approved_requests
			`,
			// 9. Low Stock Stationery Items
			sql`
				SELECT id, item_code, name, category, unit, stock_quantity, minimum_stock
				FROM ga.stationery_items
				WHERE stock_quantity <= minimum_stock
				ORDER BY stock_quantity ASC
				LIMIT 5
			`,
			// 10. Recent Stationery Requests
			sql`
				SELECT 
					id, req_number, to_char(request_date, 'YYYY-MM-DD') as request_date_str,
					department, requester_name, status, total_items_count, notes
				FROM ga.stationery_requests
				ORDER BY request_date DESC, created_at DESC
				LIMIT 5
			`,
			// 11. Carpool & Travel (SPD) Stats
			sql`
				SELECT
					(SELECT COUNT(*)::int FROM ga.carpool_requests) as total_carpool,
					(SELECT COUNT(*)::int FROM ga.carpool_requests WHERE status IN ('PENDING', 'APPROVED_AP')) as pending_carpool,
					(SELECT COUNT(*)::int FROM ga.spd_requests) as total_spd,
					(SELECT COUNT(*)::int FROM ga.spd_requests WHERE status IN ('PENDING', 'APPROVED_AP')) as pending_spd,
					(SELECT COUNT(*)::int FROM ga.cars WHERE is_active = true) as total_cars
			`,
			// 12. Document Archives Stats
			sql`
				SELECT
					(SELECT COUNT(*)::int FROM ga.archives) as total_docs,
					(SELECT COUNT(*)::int FROM ga.archives WHERE status = 'aktif' AND destruction_date <= CURRENT_DATE) as due_destruction_docs,
					(SELECT COUNT(*)::int FROM ga.archive_racks) as total_racks
			`,
			// 13. Visitor & Guestbook Stats
			sql`
				SELECT
					COUNT(*)::int as total_visitors,
					COUNT(CASE WHEN status = 'CHECKED_IN' THEN 1 END)::int as active_visitors,
					ROUND(AVG(survey_rating)::numeric, 2) as avg_rating
				FROM ga.visitors
			`
		]);

		return {
			assets: {
				totals: assetStats[0] || { total_assets: 0, active_assets: 0, total_asset_value: 0, damaged_assets: 0 },
				categories: assetCategories || []
			},
			roomBookings: {
				stats: roomStats[0] || { active_rooms: 0, pending_bookings: 0, today_approved: 0, in_use_now: 0 },
				rooms: roomsWithRealtimeStatus || [],
				upcomingList: upcomingRoomBookings || []
			},
			facilities: {
				stats: facilityStats[0] || { total_wo: 0, pending_wo: 0, in_progress_wo: 0, approved_wo: 0, completed_wo: 0, emergency_active_wo: 0 },
				recentList: recentWorkOrders || []
			},
			stationery: {
				stats: stationeryStats[0] || { total_items: 0, low_stock_items: 0, pending_requests: 0, approved_requests: 0 },
				lowStockList: criticalStockItems || [],
				recentRequests: recentStationeryRequests || []
			},
			travel: travelStats[0] || { total_carpool: 0, pending_carpool: 0, total_spd: 0, pending_spd: 0, total_cars: 0 },
			archives: archiveStats[0] || { total_docs: 0, due_destruction_docs: 0, total_racks: 0 },
			visitors: visitorStats[0] || { total_visitors: 0, active_visitors: 0, avg_rating: 0 }
		};
	} catch (error) {
		console.error('Error loading GA dashboard data:', error);
		return {
			assets: {
				totals: { total_assets: 0, active_assets: 0, total_asset_value: 0, damaged_assets: 0 },
				categories: []
			},
			roomBookings: {
				stats: { active_rooms: 0, pending_bookings: 0, today_approved: 0, in_use_now: 0 },
				rooms: [],
				upcomingList: []
			},
			facilities: {
				stats: { total_wo: 0, pending_wo: 0, in_progress_wo: 0, approved_wo: 0, completed_wo: 0, emergency_active_wo: 0 },
				recentList: []
			},
			stationery: {
				stats: { total_items: 0, low_stock_items: 0, pending_requests: 0, approved_requests: 0 },
				lowStockList: [],
				recentRequests: []
			},
			travel: { total_carpool: 0, pending_carpool: 0, total_spd: 0, pending_spd: 0, total_cars: 0 },
			archives: { total_docs: 0, due_destruction_docs: 0, total_racks: 0 }
		};
	}
};
