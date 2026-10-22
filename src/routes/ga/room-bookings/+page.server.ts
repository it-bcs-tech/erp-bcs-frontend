import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const user = parentData?.user;

	try {
		// 1. Fetch Rooms with Real-Time Occupancy & Today's Count
		const rooms = await sql`
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
					FROM ga.facility_bookings 
					WHERE room_id = r.id AND status = 'APPROVED'
				) as "totalApprovedBookings",
				(
					SELECT COUNT(*)::int 
					FROM ga.facility_bookings 
					WHERE room_id = r.id 
					  AND status IN ('APPROVED', 'PENDING') 
					  AND start_time::date = CURRENT_DATE
				) as "todayBookingsCount",
				cur.id as "currentBookingId",
				cur.booking_number as "currentBookingNumber",
				cur.title as "currentTitle",
				cur.requester_name as "currentRequester",
				cur.department as "currentDepartment",
				to_char(cur.start_time, 'HH24:MI') as "currentStart",
				to_char(cur.end_time, 'HH24:MI') as "currentEnd"
			FROM ga.facility_rooms r
			LEFT JOIN LATERAL (
				SELECT id, booking_number, title, requester_name, department, start_time, end_time
				FROM ga.facility_bookings b
				WHERE b.room_id = r.id
				  AND b.status = 'APPROVED'
				  AND NOW() BETWEEN b.start_time AND b.end_time
				ORDER BY b.start_time ASC
				LIMIT 1
			) cur ON true
			ORDER BY r.id ASC
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
				(NOW() BETWEEN b.start_time AND b.end_time AND b.status = 'APPROVED') as "isInUseNow",
				(b.start_time::date = CURRENT_DATE) as "isToday",
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
		const rejectedCount = rawBookings.filter(b => b.status === 'REJECTED' || b.status === 'CANCELLED').length;
		const todayCount = rawBookings.filter(b => b.isToday && (b.status === 'APPROVED' || b.status === 'PENDING')).length;
		const activeRoomsCount = rooms.filter(r => r.isActive).length;
		const occupiedRoomsCount = rooms.filter(r => r.isActive && r.currentBookingId).length;

		return {
			user,
			rooms,
			bookings: rawBookings,
			stats: {
				totalBookings,
				pendingCount,
				approvedCount,
				rejectedCount,
				todayCount,
				activeRoomsCount,
				occupiedRoomsCount
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
				rejectedCount: 0,
				todayCount: 0,
				activeRoomsCount: 0,
				occupiedRoomsCount: 0
			}
		};
	}
};

export const actions: Actions = {
	createBooking: async ({ request, locals }) => {
		const user = locals.user;
		const formData = await request.formData();

		const roomId = parseInt((formData.get('roomId') as string) || '0', 10);
		const title = ((formData.get('title') as string) || '').trim();
		const date = ((formData.get('date') as string) || '').trim();
		const startTimeStr = ((formData.get('startTime') as string) || '').trim();
		const endTimeStr = ((formData.get('endTime') as string) || '').trim();
		const description = ((formData.get('description') as string) || '').trim();
		const attendeesCount = parseInt((formData.get('attendeesCount') as string) || '1', 10);
		const phone = ((formData.get('phone') as string) || '').trim();
		const department = ((formData.get('department') as string) || (user?.division || (user as any)?.department || 'General Affair')).trim();
		const requesterName = ((formData.get('requesterName') as string) || (user?.name || 'Staf GA')).trim();
		const requesterId = user?.payrollId || (user as any)?.payroll_id || user?.email || 'EMP-GA';
		const autoApprove = formData.get('autoApprove') === 'on' || formData.get('autoApprove') === 'true';

		if (!roomId || isNaN(roomId)) {
			return fail(400, { success: false, message: 'Ruangan wajib dipilih!' });
		}
		if (!title) {
			return fail(400, { success: false, message: 'Keperluan / judul pertemuan wajib diisi!' });
		}
		if (!date || !startTimeStr || !endTimeStr) {
			return fail(400, { success: false, message: 'Tanggal, jam mulai, dan jam selesai wajib diisi!' });
		}

		const startIso = `${date} ${startTimeStr}:00`;
		const endIso = `${date} ${endTimeStr}:00`;
		const startTimestamp = new Date(startIso).getTime();
		const endTimestamp = new Date(endIso).getTime();

		if (isNaN(startTimestamp) || isNaN(endTimestamp) || endTimestamp <= startTimestamp) {
			return fail(400, { success: false, message: 'Jam selesai harus setelah jam mulai!' });
		}
		if ((endTimestamp - startTimestamp) < 15 * 60 * 1000) {
			return fail(400, { success: false, message: 'Durasi peminjaman minimal 15 menit!' });
		}

		try {
			const [room] = await sql`SELECT id, room_name, is_active FROM ga.facility_rooms WHERE id = ${roomId}`;
			if (!room || !room.is_active) {
				return fail(400, { success: false, message: 'Ruangan tidak ditemukan atau sedang dinonaktifkan (maintenance)!' });
			}

			const conflicts = await sql`
				SELECT booking_number, title, status, to_char(start_time, 'HH24:MI') as start_fmt, to_char(end_time, 'HH24:MI') as end_fmt
				FROM ga.facility_bookings
				WHERE room_id = ${roomId}
				  AND status IN ('PENDING', 'APPROVED')
				  AND (start_time < ${endIso}::timestamptz AND end_time > ${startIso}::timestamptz)
				LIMIT 1
			`;

			if (conflicts.length > 0) {
				const c = conflicts[0];
				return fail(400, {
					success: false,
					message: `Jadwal bentrok di ${room.room_name} (${c.start_fmt} - ${c.end_fmt}) dengan "${c.title}" (${c.booking_number})!`
				});
			}

			const yearMonth = new Date(date).toISOString().slice(2, 7).replace('-', '');
			const [seqRow] = await sql`
				SELECT COUNT(*) as count 
				FROM ga.facility_bookings 
				WHERE booking_number LIKE ${'BKG-' + yearMonth + '-%'}
			`;
			const nextSeq = (parseInt(seqRow?.count || '0', 10) + 1).toString().padStart(4, '0');
			const bookingNumber = `BKG-${yearMonth}-${nextSeq}`;

			const initialStatus = autoApprove ? 'APPROVED' : 'PENDING';
			const approvedBy = autoApprove ? (user?.name || 'Admin GA') : null;

			await sql`
				INSERT INTO ga.facility_bookings (
					booking_number, room_id, title, description,
					requester_id, requester_name, department, phone,
					start_time, end_time, status, approved_by, approved_at, attendees_count
				) VALUES (
					${bookingNumber}, ${roomId}, ${title}, ${description || null},
					${requesterId}, ${requesterName}, ${department}, ${phone || null},
					${startIso}::timestamptz, ${endIso}::timestamptz,
					${initialStatus}, ${approvedBy}, ${autoApprove ? sql`NOW()` : null}, ${attendeesCount}
				)
			`;

			return {
				success: true,
				message: autoApprove
					? `Reservasi ${bookingNumber} (${room.room_name}) berhasil dibuat dan langsung DISETUJUI di kalender!`
					: `Reservasi ${bookingNumber} (${room.room_name}) berhasil diajukan dengan status PENDING.`
			};
		} catch (err: any) {
			console.error('Error creating booking in GA:', err);
			return fail(500, { success: false, message: err?.message || 'Gagal membuat reservasi ruangan' });
		}
	},

	rescheduleBooking: async ({ request, locals }) => {
		const user = locals.user;
		const formData = await request.formData();

		const bookingId = parseInt((formData.get('bookingId') as string) || '0', 10);
		const roomId = parseInt((formData.get('roomId') as string) || '0', 10);
		const title = ((formData.get('title') as string) || '').trim();
		const date = ((formData.get('date') as string) || '').trim();
		const startTimeStr = ((formData.get('startTime') as string) || '').trim();
		const endTimeStr = ((formData.get('endTime') as string) || '').trim();
		const attendeesCount = parseInt((formData.get('attendeesCount') as string) || '1', 10);
		const description = ((formData.get('description') as string) || '').trim();

		if (!bookingId || !roomId || !title || !date || !startTimeStr || !endTimeStr) {
			return fail(400, { success: false, message: 'Data perubahan jadwal belum lengkap!' });
		}

		const startIso = `${date} ${startTimeStr}:00`;
		const endIso = `${date} ${endTimeStr}:00`;
		const startTimestamp = new Date(startIso).getTime();
		const endTimestamp = new Date(endIso).getTime();

		if (isNaN(startTimestamp) || isNaN(endTimestamp) || endTimestamp <= startTimestamp) {
			return fail(400, { success: false, message: 'Jam selesai harus setelah jam mulai!' });
		}

		try {
			const [existing] = await sql`SELECT id, booking_number FROM ga.facility_bookings WHERE id = ${bookingId}`;
			if (!existing) {
				return fail(404, { success: false, message: 'Data booking tidak ditemukan!' });
			}

			const conflicts = await sql`
				SELECT booking_number, title, to_char(start_time, 'HH24:MI') as start_fmt, to_char(end_time, 'HH24:MI') as end_fmt
				FROM ga.facility_bookings
				WHERE room_id = ${roomId}
				  AND id != ${bookingId}
				  AND status IN ('PENDING', 'APPROVED')
				  AND (start_time < ${endIso}::timestamptz AND end_time > ${startIso}::timestamptz)
				LIMIT 1
			`;

			if (conflicts.length > 0) {
				const c = conflicts[0];
				return fail(400, {
					success: false,
					message: `Gagal reschedule: Bentrok dengan jadwal ${c.booking_number} ("${c.title}" jam ${c.start_fmt} - ${c.end_fmt})!`
				});
			}

			const editorName = user?.name || 'Admin GA';
			await sql`
				UPDATE ga.facility_bookings
				SET
					room_id = ${roomId},
					title = ${title},
					start_time = ${startIso}::timestamptz,
					end_time = ${endIso}::timestamptz,
					attendees_count = ${attendeesCount},
					description = ${description || null},
					approved_by = COALESCE(approved_by, ${editorName}),
					updated_at = NOW()
				WHERE id = ${bookingId}
			`;

			return {
				success: true,
				message: `Jadwal booking ${existing.booking_number} berhasil diperbarui!`
			};
		} catch (err: any) {
			console.error('Error rescheduling booking:', err);
			return fail(500, { success: false, message: err?.message || 'Gagal mengubah jadwal booking' });
		}
	},

	cancelBooking: async ({ request, locals }) => {
		const user = locals.user;
		const formData = await request.formData();
		const bookingId = parseInt((formData.get('bookingId') as string) || '0', 10);
		const cancelReason = ((formData.get('cancelReason') as string) || 'Dibatalkan oleh Admin GA').trim();

		if (!bookingId || isNaN(bookingId)) {
			return fail(400, { success: false, message: 'ID booking tidak valid' });
		}

		try {
			const [booking] = await sql`SELECT id, booking_number FROM ga.facility_bookings WHERE id = ${bookingId}`;
			if (!booking) {
				return fail(404, { success: false, message: 'Peminjaman tidak ditemukan' });
			}

			const actorName = user?.name || 'Admin GA';
			await sql`
				UPDATE ga.facility_bookings
				SET 
					status = 'CANCELLED',
					rejection_reason = ${cancelReason},
					approved_by = ${actorName},
					updated_at = NOW()
				WHERE id = ${bookingId}
			`;

			return {
				success: true,
				message: `Booking ${booking.booking_number} telah DIBATALKAN dan slot waktu kembali terbuka.`
			};
		} catch (err: any) {
			console.error('Error cancelling booking:', err);
			return fail(500, { success: false, message: err?.message || 'Gagal membatalkan booking' });
		}
	},

	approveBooking: async ({ request, locals }) => {
		const user = locals.user;

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

	rejectBooking: async ({ request, locals }) => {
		const user = locals.user;

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
		const isActive = formData.get('isActive') !== 'false';

		if (!roomCode || !roomName || !location) {
			return fail(400, { success: false, message: 'Kode ruangan, nama ruangan, dan lokasi wajib diisi!' });
		}

		const facilitiesArray = facilitiesRaw
			? facilitiesRaw.split(',').map(s => s.trim()).filter(Boolean)
			: ['AC', 'Whiteboard'];

		try {
			if (roomId > 0) {
				await sql`
					UPDATE ga.facility_rooms
					SET 
						room_code = ${roomCode},
						room_name = ${roomName},
						location = ${location},
						capacity = ${capacity},
						color_hex = ${colorHex},
						facilities = ${facilitiesArray},
						is_active = ${isActive},
						updated_at = NOW()
					WHERE id = ${roomId}
				`;
				return { success: true, message: `Ruangan ${roomName} berhasil diperbarui!` };
			} else {
				await sql`
					INSERT INTO ga.facility_rooms (
						room_code,
						room_name,
						location,
						capacity,
						color_hex,
						facilities,
						is_active
					) VALUES (
						${roomCode},
						${roomName},
						${location},
						${capacity},
						${colorHex},
						${facilitiesArray},
						true
					)
				`;
				return { success: true, message: `Ruangan baru ${roomName} berhasil ditambahkan!` };
			}
		} catch (err: any) {
			console.error('Error saving facility room:', err);
			return fail(500, { success: false, message: err?.message || 'Gagal menyimpan data ruangan' });
		}
	},

	toggleRoomActive: async ({ request }) => {
		const formData = await request.formData();
		const roomId = parseInt((formData.get('roomId') as string) || '0', 10);

		if (!roomId || isNaN(roomId)) {
			return fail(400, { success: false, message: 'ID ruangan tidak valid' });
		}

		try {
			const [room] = await sql`SELECT id, room_name, is_active FROM ga.facility_rooms WHERE id = ${roomId}`;
			if (!room) {
				return fail(404, { success: false, message: 'Ruangan tidak ditemukan' });
			}

			const nextActive = !room.is_active;
			await sql`
				UPDATE ga.facility_rooms
				SET is_active = ${nextActive}, updated_at = NOW()
				WHERE id = ${roomId}
			`;

			return {
				success: true,
				message: `Status ruangan ${room.room_name} diubah menjadi ${nextActive ? 'AKTIF (Dapat Dipinjam)' : 'NONAKTIF (Maintenance)'}.`
			};
		} catch (err: any) {
			console.error('Error toggling room active state:', err);
			return fail(500, { success: false, message: err?.message || 'Gagal mengubah status ruangan' });
		}
	}
};
