import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const user = parentData?.user;

	try {
		// 1. Fetch Active Rooms
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

		// 2. Fetch Bookings (Active and recent history)
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
				r.facilities as "roomFacilities",
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
			WHERE b.status != 'CANCELLED'
			ORDER BY b.start_time ASC
		`;

		// 3. Fetch Company Events & Holidays
		const events = await sql`
			SELECT 
				id,
				event_type as "eventType",
				title,
				description,
				to_char(start_date, 'YYYY-MM-DD') as "startDate",
				to_char(end_date, 'YYYY-MM-DD') as "endDate",
				is_holiday as "isHoliday",
				color_hex as "colorHex",
				created_by as "createdBy"
			FROM hris.company_events
			ORDER BY start_date ASC
		`;

		return {
			user,
			rooms,
			bookings: rawBookings,
			events
		};
	} catch (err) {
		console.error('Error loading calendar data:', err);
		return {
			user,
			rooms: [],
			bookings: [],
			events: []
		};
	}
};

export const actions: Actions = {
	createBooking: async ({ request, parent }) => {
		const parentData = await parent();
		const user = parentData?.user;

		const formData = await request.formData();
		const roomId = parseInt((formData.get('roomId') as string) || '0', 10);
		const title = ((formData.get('title') as string) || '').trim();
		const date = ((formData.get('date') as string) || '').trim();
		const startTimeStr = ((formData.get('startTime') as string) || '').trim();
		const endTimeStr = ((formData.get('endTime') as string) || '').trim();
		const description = ((formData.get('description') as string) || '').trim();
		const attendeesCount = parseInt((formData.get('attendeesCount') as string) || '1', 10);
		const phone = ((formData.get('phone') as string) || '').trim();
		const department = ((formData.get('department') as string) || (user?.department || 'Umum')).trim();
		const requesterName = ((formData.get('requesterName') as string) || (user?.name || 'Karyawan BCS')).trim();
		const requesterId = user?.payroll_id || user?.email || 'EMP-GUEST';

		if (!roomId || isNaN(roomId)) {
			return fail(400, { success: false, message: 'Ruangan wajib dipilih!' });
		}
		if (!title) {
			return fail(400, { success: false, message: 'Keperluan / judul acara wajib diisi!' });
		}
		if (!date || !startTimeStr || !endTimeStr) {
			return fail(400, { success: false, message: 'Tanggal, jam mulai, dan jam selesai wajib ditentukan!' });
		}

		// Validasi format waktu (start vs end)
		const startIso = `${date} ${startTimeStr}:00`;
		const endIso = `${date} ${endTimeStr}:00`;
		const startTimestamp = new Date(startIso).getTime();
		const endTimestamp = new Date(endIso).getTime();

		if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
			return fail(400, { success: false, message: 'Format tanggal atau waktu tidak valid!' });
		}

		if (endTimestamp <= startTimestamp) {
			return fail(400, { success: false, message: 'Jam selesai harus setelah jam mulai!' });
		}

		// Hitung durasi minimal 15 menit
		if ((endTimestamp - startTimestamp) < 15 * 60 * 1000) {
			return fail(400, { success: false, message: 'Durasi peminjaman minimal 15 menit!' });
		}

		try {
			// 1. Cek ketersediaan Ruangan
			const [room] = await sql`SELECT id, room_name, capacity FROM ga.facility_rooms WHERE id = ${roomId} AND is_active = true`;
			if (!room) {
				return fail(404, { success: false, message: 'Ruangan yang dipilih tidak ditemukan atau sedang dinonaktifkan!' });
			}

			// 2. Proteksi Validasi Bentrok (Anti-Double-Booking)
			// Overlap terjadi jika: existing.start < new.end AND existing.end > new.start
			const conflictingBookings = await sql`
				SELECT 
					b.id, 
					b.booking_number, 
					b.title, 
					b.status,
					to_char(b.start_time, 'HH24:MI') as start_fmt,
					to_char(b.end_time, 'HH24:MI') as end_fmt,
					r.room_name
				FROM ga.facility_bookings b
				JOIN ga.facility_rooms r ON r.id = b.room_id
				WHERE b.room_id = ${roomId}
				  AND b.status IN ('PENDING', 'APPROVED')
				  AND (
					b.start_time < ${endIso}::timestamptz 
					AND b.end_time > ${startIso}::timestamptz
				  )
				LIMIT 1;
			`;

			if (conflictingBookings.length > 0) {
				const conflict = conflictingBookings[0];
				const statusLabel = conflict.status === 'APPROVED' ? 'Terkunci/Disetujui' : 'Dalam Proses Review';
				return fail(400, {
					success: false,
					message: `Jadwal bentrok! ${conflict.room_name} sudah dipesan (${conflict.start_fmt} - ${conflict.end_fmt}) untuk: "${conflict.title}" [Status: ${statusLabel}]. Silakan pilih jam atau ruangan lain.`
				});
			}

			// 3. Generate Booking Number: BKG-YYMM-XXXX
			const yearMonth = new Date(date).toISOString().slice(2, 7).replace('-', '');
			const [seqRow] = await sql`
				SELECT COUNT(*) as count 
				FROM ga.facility_bookings 
				WHERE booking_number LIKE ${'BKG-' + yearMonth + '-%'}
			`;
			const nextSeq = (parseInt(seqRow?.count || '0', 10) + 1).toString().padStart(4, '0');
			const bookingNumber = `BKG-${yearMonth}-${nextSeq}`;

			// 4. Insert ke database (status PENDING)
			await sql`
				INSERT INTO ga.facility_bookings (
					booking_number,
					room_id,
					title,
					description,
					requester_id,
					requester_name,
					department,
					phone,
					start_time,
					end_time,
					status,
					attendees_count
				) VALUES (
					${bookingNumber},
					${roomId},
					${title},
					${description || null},
					${requesterId},
					${requesterName},
					${department},
					${phone || null},
					${startIso}::timestamptz,
					${endIso}::timestamptz,
					'PENDING',
					${attendeesCount}
				)
			`;

			return {
				success: true,
				message: `Pengajuan booking ${room.room_name} berhasil dikirim dengan no: ${bookingNumber}! Menunggu persetujuan dari tim General Affair.`
			};
		} catch (err: any) {
			console.error('Error creating facility booking:', err);
			return fail(500, { success: false, message: err?.message || 'Gagal menyimpan pengajuan peminjaman ruangan' });
		}
	},

	cancelBooking: async ({ request, parent }) => {
		const parentData = await parent();
		const user = parentData?.user;

		const formData = await request.formData();
		const bookingId = parseInt((formData.get('bookingId') as string) || '0', 10);

		if (!bookingId || isNaN(bookingId)) {
			return fail(400, { success: false, message: 'ID booking tidak valid' });
		}

		try {
			const [booking] = await sql`
				SELECT id, booking_number, requester_id, status 
				FROM ga.facility_bookings 
				WHERE id = ${bookingId}
			`;

			if (!booking) {
				return fail(404, { success: false, message: 'Data peminjaman tidak ditemukan' });
			}

			// Admin or the requester can cancel
			const isAdmin = user && ['superadmin', 'administrator', 'superhyperadmin', 'admin'].some(r => user.role?.toLowerCase()?.includes(r));
			const isOwner = user && (user.payroll_id === booking.requester_id || user.email === booking.requester_id);

			if (!isAdmin && !isOwner) {
				return fail(403, { success: false, message: 'Anda tidak memiliki hak untuk membatalkan booking ini!' });
			}

			await sql`
				UPDATE ga.facility_bookings 
				SET status = 'CANCELLED', updated_at = NOW() 
				WHERE id = ${bookingId}
			`;

			return { success: true, message: `Booking ${booking.booking_number} berhasil dibatalkan.` };
		} catch (err: any) {
			console.error('Error cancelling booking:', err);
			return fail(500, { success: false, message: err?.message || 'Gagal membatalkan booking' });
		}
	}
};
