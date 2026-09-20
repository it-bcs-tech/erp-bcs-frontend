import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const roomId = parseInt(body.roomId, 10);
		const title = (body.title || '').trim();
		const date = (body.date || '').trim();
		const startTimeStr = (body.startTime || '').trim();
		const endTimeStr = (body.endTime || '').trim();
		const description = (body.description || '').trim();
		const attendeesCount = parseInt(body.attendeesCount || '1', 10);
		const department = (body.department || 'Umum').trim();
		const phone = (body.phone || '').trim();
		const requesterName = (body.requesterName || 'Karyawan BCS').trim();
		const requesterId = (locals as any)?.user?.payroll_id || (locals as any)?.user?.email || 'EMP-GUEST';

		if (!roomId || isNaN(roomId)) {
			return json({ success: false, message: 'Ruangan wajib dipilih!' }, { status: 400 });
		}
		if (!title) {
			return json({ success: false, message: 'Keperluan / judul acara wajib diisi!' }, { status: 400 });
		}
		if (!date || !startTimeStr || !endTimeStr) {
			return json({ success: false, message: 'Tanggal dan rentang jam wajib diisi!' }, { status: 400 });
		}

		const startIso = `${date} ${startTimeStr}:00`;
		const endIso = `${date} ${endTimeStr}:00`;
		const startTimestamp = new Date(startIso).getTime();
		const endTimestamp = new Date(endIso).getTime();

		if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
			return json({ success: false, message: 'Format tanggal atau waktu tidak valid!' }, { status: 400 });
		}
		if (endTimestamp <= startTimestamp) {
			return json({ success: false, message: 'Jam selesai harus lebih akhir dari jam mulai!' }, { status: 400 });
		}
		if ((endTimestamp - startTimestamp) < 15 * 60 * 1000) {
			return json({ success: false, message: 'Durasi minimal peminjaman adalah 15 menit!' }, { status: 400 });
		}

		// 1. Cek Ruangan
		const [room] = await sql`SELECT id, room_name FROM ga.facility_rooms WHERE id = ${roomId} AND is_active = true`;
		if (!room) {
			return json({ success: false, message: 'Ruangan tidak aktif atau tidak ditemukan!' }, { status: 404 });
		}

		// 2. Anti-double-booking overlap check
		const conflicts = await sql`
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

		if (conflicts.length > 0) {
			const c = conflicts[0];
			const statusLabel = c.status === 'APPROVED' ? 'Disetujui/Terkunci' : 'Dalam Proses Review';
			return json({
				success: false,
				message: `Jadwal bentrok! ${c.room_name} sudah dipesan (${c.start_fmt} - ${c.end_fmt}) untuk "${c.title}" [${statusLabel}]. Silakan pilih jam atau ruangan lain.`
			}, { status: 400 });
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

		// 4. Insert
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

		return json({
			success: true,
			message: `Peminjaman ${room.room_name} (${bookingNumber}) berhasil diajukan! Menunggu persetujuan GA.`
		});
	} catch (err: any) {
		console.error('Error submitting room booking via API:', err);
		return json({ success: false, message: err?.message || 'Gagal menyimpan pengajuan booking' }, { status: 500 });
	}
};
