import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		// 1. Rooms
		const rooms = await sql`
			SELECT 
				id,
				room_code as "roomCode",
				room_name as "roomName",
				location,
				capacity,
				facilities,
				color_hex as "colorHex",
				is_active as "isActive"
			FROM ga.facility_rooms
			WHERE is_active = true
			ORDER BY id ASC
		`;

		// 2. Bookings
		const bookings = await sql`
			SELECT 
				b.id,
				b.booking_number as "bookingNumber",
				b.room_id as "roomId",
				r.room_name as "roomName",
				r.room_code as "roomCode",
				r.location as "roomLocation",
				r.color_hex as "roomColor",
				b.title,
				b.description,
				b.requester_name as "requesterName",
				b.department,
				to_char(b.start_time, 'YYYY-MM-DD') as "bookingDate",
				to_char(b.start_time, 'HH24:MI') as "startTimeFormatted",
				to_char(b.end_time, 'HH24:MI') as "endTimeFormatted",
				b.status,
				b.attendees_count as "attendeesCount"
			FROM ga.facility_bookings b
			JOIN ga.facility_rooms r ON r.id = b.room_id
			WHERE b.status != 'CANCELLED'
			ORDER BY b.start_time ASC
		`;

		// 3. Holidays & HR events
		const events = await sql`
			SELECT 
				id,
				event_type as "eventType",
				title,
				description,
				to_char(start_date, 'YYYY-MM-DD') as "startDate",
				to_char(end_date, 'YYYY-MM-DD') as "endDate",
				is_holiday as "isHoliday",
				color_hex as "colorHex"
			FROM hris.company_events
			ORDER BY start_date ASC
		`;

		return json({
			success: true,
			rooms,
			bookings,
			events
		});
	} catch (err: any) {
		console.error('Error fetching calendar events:', err);
		return json({ success: false, message: err?.message || 'Gagal memuat jadwal kalender' }, { status: 500 });
	}
};
