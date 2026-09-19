import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const user = parentData?.user;

	try {
		// 1. Fetch Rooms
		const rooms = await sql`
			SELECT 
				id,
				room_code as "roomCode",
				room_name as "roomName",
				location,
				capacity,
				facilities,
				color_hex as "colorHex",
				is_active as "isActive",
				(SELECT COUNT(*) FROM ga.facility_bookings WHERE room_id = ga.facility_rooms.id AND status = 'APPROVED') as "totalApprovedBookings"
			FROM ga.facility_rooms
			ORDER BY id ASC
		`;

		// 2. Fetch All Bookings
		const rawBookings = await sql`
			SELECT 
				b.id,
				b.booking_number as "bookingNumber",
				b.room_id as "roomId",
				r.room_name as "roomName",
				r.room_code as "roomCode",
				r.location as "roomLocation",
				r.color_hex as "roomColor",
				r.capacity as "roomCapacity",
				b.title,
				b.description,
				b.requester_id as "requesterId",
				b.requester_name as "requesterName",
				b.department,
				b.phone,
				to_char(b.start_time, 'YYYY-MM-DD"T"HH24:MI:SS') as "startTime",
				to_char(b.end_time, 'YYYY-MM-DD"T"HH24:MI:SS') as "endTime",
				to_char(b.start_time, 'YYYY-MM-DD') as "bookingDate",
				to_char(b.start_time, 'HH24:MI') as "startTimeFormatted",
				to_char(b.end_time, 'HH24:MI') as "endTimeFormatted",
				b.status,
				b.approved_by as "approvedBy",
				to_char(b.approved_at, 'YYYY-MM-DD HH24:MI') as "approvedAt",
				b.rejection_reason as "rejectionReason",
				b.attendees_count as "attendeesCount",
				to_char(b.created_at, 'YYYY-MM-DD HH24:MI') as "createdAt"
			FROM ga.facility_bookings b
			JOIN ga.facility_rooms r ON r.id = b.room_id
			ORDER BY 
				CASE 
					WHEN b.status = 'PENDING' THEN 1
					WHEN b.status = 'APPROVED' THEN 2
					ELSE 3
				END,
				b.start_time DESC
		`;

		// Stats
		const totalBookings = rawBookings.length;
		const pendingCount = rawBookings.filter(b => b.status === 'PENDING').length;
		const approvedCount = rawBookings.filter(b => b.status === 'APPROVED').length;
		const rejectedCount = rawBookings.filter(b => b.status === 'REJECTED').length;

		return {
			user,
			rooms,
			bookings: rawBookings,
			stats: {
				totalBookings,
				pendingCount,
				approvedCount,
				rejectedCount
			}
		};
	} catch (err) {
		console.error('Error loading GA room bookings:', err);
		return {
			user,
			rooms: [],
			bookings: [],
			stats: {
				totalBookings: 0,
				pendingCount: 0,
				approvedCount: 0,
				rejectedCount: 0
			}
		};
	}
};

export const actions: Actions = {
	approveBooking: async ({ request, parent }) => {
		const parentData = await parent();
		const user = parentData?.user;

		const formData = await request.formData();
		const bookingId = parseInt((formData.get('bookingId') as string) || '0', 10);

		if (!bookingId || isNaN(bookingId)) {
			return fail(400, { success: false, message: 'ID booking tidak valid' });
		}

		try {
			const [booking] = await sql`
				SELECT id, room_id, title, booking_number, start_time, end_time, status 
				FROM ga.facility_bookings 
				WHERE id = ${bookingId}
			`;

			if (!booking) {
				return fail(404, { success: false, message: 'Peminjaman tidak ditemukan' });
			}

			// Validasi anti-double-booking ulang terhadap booking yang sudah APPROVED
			const conflicts = await sql`
				SELECT id, booking_number, title, to_char(start_time, 'HH24:MI') as start_fmt, to_char(end_time, 'HH24:MI') as end_fmt
				FROM ga.facility_bookings
				WHERE room_id = ${booking.room_id}
				  AND status = 'APPROVED'
				  AND id != ${bookingId}
				  AND (start_time < ${booking.end_time} AND end_time > ${booking.start_time})
				LIMIT 1;
			`;

			if (conflicts.length > 0) {
				const c = conflicts[0];
				return fail(400, {
					success: false,
					message: `Tidak dapat menyetujui: Bentrok dengan jadwal APPROVED (${c.booking_number} - "${c.title}" jam ${c.start_fmt} - ${c.end_fmt})!`
				});
			}

			const approverName = user?.name || 'Admin GA';
			await sql`
				UPDATE ga.facility_bookings
				SET 
					status = 'APPROVED',
					approved_by = ${approverName},
					approved_at = NOW(),
					rejection_reason = NULL,
					updated_at = NOW()
				WHERE id = ${bookingId}
			`;

			return {
				success: true,
				message: `Booking ${booking.booking_number} berhasil DISETUJUI dan slot waktu telah terkunci di kalender!`
			};
		} catch (err: any) {
			console.error('Error approving booking:', err);
			return fail(500, { success: false, message: err?.message || 'Gagal menyetujui booking' });
		}
	},

	rejectBooking: async ({ request, parent }) => {
		const parentData = await parent();
		const user = parentData?.user;

		const formData = await request.formData();
		const bookingId = parseInt((formData.get('bookingId') as string) || '0', 10);
		const rejectionReason = ((formData.get('rejectionReason') as string) || '').trim();

		if (!bookingId || isNaN(bookingId)) {
			return fail(400, { success: false, message: 'ID booking tidak valid' });
		}
		if (!rejectionReason) {
			return fail(400, { success: false, message: 'Alasan penolakan wajib diisi agar pemohon mengetahuinya!' });
		}

		try {
			const [booking] = await sql`SELECT id, booking_number FROM ga.facility_bookings WHERE id = ${bookingId}`;
			if (!booking) {
				return fail(404, { success: false, message: 'Peminjaman tidak ditemukan' });
			}

			const approverName = user?.name || 'Admin GA';
			await sql`
				UPDATE ga.facility_bookings
				SET 
					status = 'REJECTED',
					rejection_reason = ${rejectionReason},
					approved_by = ${approverName},
					approved_at = NOW(),
					updated_at = NOW()
				WHERE id = ${bookingId}
			`;

			return {
				success: true,
				message: `Booking ${booking.booking_number} telah DITOLAK dengan alasan yang tercatat.`
			};
		} catch (err: any) {
			console.error('Error rejecting booking:', err);
			return fail(500, { success: false, message: err?.message || 'Gagal menolak booking' });
		}
	},

	saveRoom: async ({ request }) => {
		const formData = await request.formData();
		const roomId = parseInt((formData.get('roomId') as string) || '0', 10);
		const roomCode = ((formData.get('roomCode') as string) || '').trim().toUpperCase();
		const roomName = ((formData.get('roomName') as string) || '').trim();
		const location = ((formData.get('location') as string) || '').trim();
		const capacity = parseInt((formData.get('capacity') as string) || '6', 10);
		const colorHex = ((formData.get('colorHex') as string) || '#0284c7').trim();
		const facilitiesRaw = ((formData.get('facilities') as string) || '').trim();

		if (!roomCode || !roomName || !location) {
			return fail(400, { success: false, message: 'Kode ruangan, nama ruangan, dan lokasi wajib diisi!' });
		}

		const facilitiesArray = facilitiesRaw
			? facilitiesRaw.split(',').map(s => s.trim()).filter(Boolean)
			: ['AC', 'Whiteboard'];

		try {
			if (roomId > 0) {
				// Update
				await sql`
					UPDATE ga.facility_rooms
					SET 
						room_code = ${roomCode},
						room_name = ${roomName},
						location = ${location},
						capacity = ${capacity},
						color_hex = ${colorHex},
						facilities = ${facilitiesArray},
						updated_at = NOW()
					WHERE id = ${roomId}
				`;
				return { success: true, message: `Ruangan ${roomName} berhasil diperbarui!` };
			} else {
				// Insert
				await sql`
					INSERT INTO ga.facility_rooms (
						room_code,
						room_name,
						location,
						capacity,
						color_hex,
						facilities
					) VALUES (
						${roomCode},
						${roomName},
						${location},
						${capacity},
						${colorHex},
						${facilitiesArray}
					)
				`;
				return { success: true, message: `Ruangan baru ${roomName} berhasil ditambahkan!` };
			}
		} catch (err: any) {
			console.error('Error saving facility room:', err);
			return fail(500, { success: false, message: err?.message || 'Gagal menyimpan data ruangan' });
		}
	}
};
