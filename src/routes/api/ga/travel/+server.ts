import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const user = (locals as any)?.user;
		const payrollId = user?.payrollId;
		const userName = user?.name;
		const userEmail = user?.email;
		const isGaOrAdmin =
			user?.role === 'superadmin' ||
			user?.allowedModules?.includes('ga') ||
			user?.allowedModules?.includes('*');

		const requestedScope = url.searchParams.get('scope') || 'my';
		const scope = requestedScope === 'all' && isGaOrAdmin ? 'all' : 'my';

		// 1. Fetch available Cars & Facility Types for form select options
		const [cars, facilityTypes] = await Promise.all([
			sql`
				SELECT id, car_name, police_number
				FROM ga.cars
				WHERE is_active = true OR is_active IS NULL
				ORDER BY car_name ASC
			`,
			sql`
				SELECT id, description, value_code
				FROM ga.travel_facility_types
				ORDER BY id ASC
			`
		]);

		// 2. Fetch Carpool Requests
		let carpoolRows: any[] = [];
		let myCarpoolCount = 0;
		let allCarpoolCount = 0;

		const [cpCounts] = await sql`
			SELECT
				(SELECT COUNT(*)::int FROM ga.carpool_requests) as all_count,
				(SELECT COUNT(*)::int FROM ga.carpool_requests 
				 WHERE 
					(${payrollId || null} IS NOT NULL AND requester_nik = ${payrollId || ''})
					OR (${userName || null} IS NOT NULL AND requester_name ILIKE ${'%' + (userName || '') + '%'})
					OR (${userName || null} IS NOT NULL AND created_by = ${userName || ''})
					OR (${userEmail || null} IS NOT NULL AND created_by = ${userEmail || ''})) as my_count
		`;
		allCarpoolCount = cpCounts?.all_count || 0;
		myCarpoolCount = cpCounts?.my_count || 0;

		if (scope === 'all') {
			carpoolRows = await sql`
				SELECT
					cr.id,
					cr.carpool_number,
					to_char(cr.use_date, 'YYYY-MM-DD') as use_date,
					to_char(cr.end_date, 'YYYY-MM-DD') as end_date,
					cr.car_id,
					c.car_name,
					c.police_number,
					cr.requester_nik,
					cr.requester_name,
					cr.department,
					cr.city_type,
					cr.destination,
					cr.reason,
					to_char(cr.time_start, 'HH24:MI') as time_start,
					to_char(cr.time_end, 'HH24:MI') as time_end,
					cr.driver_name,
					cr.passenger_count,
					cr.description,
					cr.status,
					cr.raw_status,
					cr.status_desc,
					to_char(cr.created_at, 'YYYY-MM-DD HH24:MI') as created_at_str
				FROM ga.carpool_requests cr
				LEFT JOIN ga.cars c ON cr.car_id = c.id
				ORDER BY cr.use_date DESC NULLS LAST, cr.id DESC
				LIMIT 25
			`;
		} else {
			carpoolRows = await sql`
				SELECT
					cr.id,
					cr.carpool_number,
					to_char(cr.use_date, 'YYYY-MM-DD') as use_date,
					to_char(cr.end_date, 'YYYY-MM-DD') as end_date,
					cr.car_id,
					c.car_name,
					c.police_number,
					cr.requester_nik,
					cr.requester_name,
					cr.department,
					cr.city_type,
					cr.destination,
					cr.reason,
					to_char(cr.time_start, 'HH24:MI') as time_start,
					to_char(cr.time_end, 'HH24:MI') as time_end,
					cr.driver_name,
					cr.passenger_count,
					cr.description,
					cr.status,
					cr.raw_status,
					cr.status_desc,
					to_char(cr.created_at, 'YYYY-MM-DD HH24:MI') as created_at_str
				FROM ga.carpool_requests cr
				LEFT JOIN ga.cars c ON cr.car_id = c.id
				WHERE 
					(${payrollId || null} IS NOT NULL AND cr.requester_nik = ${payrollId || ''})
					OR (${userName || null} IS NOT NULL AND cr.requester_name ILIKE ${'%' + (userName || '') + '%'})
					OR (${userName || null} IS NOT NULL AND cr.created_by = ${userName || ''})
					OR (${userEmail || null} IS NOT NULL AND cr.created_by = ${userEmail || ''})
				ORDER BY cr.use_date DESC NULLS LAST, cr.id DESC
				LIMIT 25
			`;
		}

		// 3. Fetch SPD Requests
		let spdRows: any[] = [];
		let mySpdCount = 0;
		let allSpdCount = 0;

		const [spdCounts] = await sql`
			SELECT
				(SELECT COUNT(*)::int FROM ga.spd_requests) as all_count,
				(SELECT COUNT(*)::int FROM ga.spd_requests 
				 WHERE 
					(${payrollId || null} IS NOT NULL AND requester_nik = ${payrollId || ''})
					OR (${userName || null} IS NOT NULL AND requester_name ILIKE ${'%' + (userName || '') + '%'})
					OR (${userName || null} IS NOT NULL AND created_by = ${userName || ''})
					OR (${userEmail || null} IS NOT NULL AND created_by = ${userEmail || ''})) as my_count
		`;
		allSpdCount = spdCounts?.all_count || 0;
		mySpdCount = spdCounts?.my_count || 0;

		if (scope === 'all') {
			spdRows = await sql`
				SELECT
					s.id,
					s.spd_number,
					to_char(s.start_date, 'YYYY-MM-DD') as start_date,
					to_char(s.end_date, 'YYYY-MM-DD') as end_date,
					s.requester_nik,
					s.requester_name,
					s.department,
					s.destination,
					s.reason,
					s.description,
					s.is_overnight,
					s.facility_type_id,
					ft.description as facility_desc,
					s.status,
					s.raw_status,
					s.status_desc,
					to_char(s.created_at, 'YYYY-MM-DD HH24:MI') as created_at_str
				FROM ga.spd_requests s
				LEFT JOIN ga.travel_facility_types ft ON s.facility_type_id = ft.id
				ORDER BY s.start_date DESC NULLS LAST, s.id DESC
				LIMIT 25
			`;
		} else {
			spdRows = await sql`
				SELECT
					s.id,
					s.spd_number,
					to_char(s.start_date, 'YYYY-MM-DD') as start_date,
					to_char(s.end_date, 'YYYY-MM-DD') as end_date,
					s.requester_nik,
					s.requester_name,
					s.department,
					s.destination,
					s.reason,
					s.description,
					s.is_overnight,
					s.facility_type_id,
					ft.description as facility_desc,
					s.status,
					s.raw_status,
					s.status_desc,
					to_char(s.created_at, 'YYYY-MM-DD HH24:MI') as created_at_str
				FROM ga.spd_requests s
				LEFT JOIN ga.travel_facility_types ft ON s.facility_type_id = ft.id
				WHERE 
					(${payrollId || null} IS NOT NULL AND s.requester_nik = ${payrollId || ''})
					OR (${userName || null} IS NOT NULL AND s.requester_name ILIKE ${'%' + (userName || '') + '%'})
					OR (${userName || null} IS NOT NULL AND s.created_by = ${userName || ''})
					OR (${userEmail || null} IS NOT NULL AND s.created_by = ${userEmail || ''})
				ORDER BY s.start_date DESC NULLS LAST, s.id DESC
				LIMIT 25
			`;
		}

		// 4. Fetch Passengers & Participants for retrieved IDs
		const cpIds = carpoolRows.map((r: any) => r.id);
		let cpPassengers: any[] = [];
		if (cpIds.length > 0) {
			cpPassengers = await sql`
				SELECT carpool_id, passenger_name, passenger_nik
				FROM ga.carpool_passengers
				WHERE carpool_id IN ${sql(cpIds)}
				ORDER BY id ASC
			`;
		}
		const cpPassMap = new Map<number, string[]>();
		for (const p of cpPassengers) {
			const cid = Number(p.carpool_id);
			if (!cpPassMap.has(cid)) cpPassMap.set(cid, []);
			cpPassMap.get(cid)!.push(p.passenger_name);
		}

		const spdIds = spdRows.map((r: any) => r.id);
		let spdParticipants: any[] = [];
		if (spdIds.length > 0) {
			spdParticipants = await sql`
				SELECT spd_id, participant_name, participant_nik
				FROM ga.spd_participants
				WHERE spd_id IN ${sql(spdIds)}
				ORDER BY id ASC
			`;
		}
		const spdPartMap = new Map<number, string[]>();
		for (const p of spdParticipants) {
			const sid = Number(p.spd_id);
			if (!spdPartMap.has(sid)) spdPartMap.set(sid, []);
			spdPartMap.get(sid)!.push(p.participant_name);
		}

		// Attach passenger lists
		const enrichedCarpools = carpoolRows.map((c: any) => ({
			...c,
			item_type: 'CARPOOL',
			passengers: cpPassMap.get(c.id) || []
		}));

		const enrichedSpds = spdRows.map((s: any) => ({
			...s,
			item_type: 'SPD',
			participants: spdPartMap.get(s.id) || []
		}));

		return json({
			success: true,
			carpools: enrichedCarpools,
			spds: enrichedSpds,
			cars,
			facilityTypes,
			scope,
			isGaOrAdmin,
			stats: {
				myCarpoolCount,
				allCarpoolCount,
				mySpdCount,
				allSpdCount,
				totalMy: myCarpoolCount + mySpdCount,
				totalAll: allCarpoolCount + allSpdCount
			}
		});
	} catch (err: any) {
		console.error('Error in GET /api/ga/travel:', err);
		return json(
			{
				success: false,
				message: err.message || 'Gagal memuat data perjalanan dinas & carpool.',
				carpools: [],
				spds: [],
				cars: [],
				facilityTypes: [],
				scope: 'my',
				isGaOrAdmin: false,
				stats: { myCarpoolCount: 0, allCarpoolCount: 0, mySpdCount: 0, allSpdCount: 0, totalMy: 0, totalAll: 0 }
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const user = (locals as any)?.user;
		const contentType = request.headers.get('content-type') || '';

		let payload: any = {};
		if (contentType.includes('multipart/form-data')) {
			const formData = await request.formData();
			for (const [key, value] of formData.entries()) {
				payload[key] = value.toString();
			}
		} else {
			payload = await request.json();
		}

		const requestType = (payload.type || 'carpool').toLowerCase();
		const requester_name = (user?.name || payload.requester_name || 'Karyawan BCS').trim();
		const department = (user?.department || user?.division || payload.department || 'Umum').trim();
		const requester_nik = user?.payrollId || payload.requester_nik || null;
		const created_by = user?.name || user?.email || requester_name;

		if (requestType === 'carpool') {
			const use_date = payload.use_date || new Date().toISOString().split('T')[0];
			const end_date = payload.end_date || use_date;
			const car_id = payload.car_id ? Number(payload.car_id) : null;
			const city_type = payload.city_type || 'Dalam Kota';
			const destination = (payload.destination || '').trim();
			const time_start = payload.time_start || '08:00';
			const time_end = payload.time_end || '17:00';
			const driver_name = (payload.driver_name || '').trim() || null;
			const description = (payload.description || payload.reason || '').trim() || null;
			const passengersRaw = (payload.passengers || '').trim();

			if (!destination) {
				return json({ success: false, message: 'Tempat tujuan carpool wajib diisi!' }, { status: 400 });
			}

			// Generate sequential carpool_number
			const [seq] = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_seq FROM ga.carpool_requests`;
			const carpool_number = `CRP-${String(seq.next_seq).padStart(5, '0')}`;

			const passList = passengersRaw
				? passengersRaw.split(',').map((s: string) => s.trim()).filter(Boolean)
				: [requester_name];

			const [inserted] = await sql`
				INSERT INTO ga.carpool_requests (
					carpool_number,
					use_date,
					end_date,
					car_id,
					requester_nik,
					requester_name,
					department,
					city_type,
					destination,
					time_start,
					time_end,
					driver_name,
					description,
					passenger_count,
					status,
					raw_status,
					created_by,
					created_at
				) VALUES (
					${carpool_number},
					${use_date},
					${end_date},
					${car_id},
					${requester_nik},
					${requester_name},
					${department},
					${city_type},
					${destination},
					${time_start},
					${time_end},
					${driver_name},
					${description},
					${passList.length},
					'PENDING',
					'OPEN',
					${created_by},
					NOW()
				)
				RETURNING id, carpool_number
			`;

			for (const pName of passList) {
				await sql`
					INSERT INTO ga.carpool_passengers (carpool_id, passenger_name, passenger_nik, created_by, created_at)
					VALUES (${inserted.id}, ${pName}, ${pName === requester_name ? requester_nik : null}, ${created_by}, NOW())
				`;
			}

			return json({
				success: true,
				message: `Permohonan Carpool ${carpool_number} berhasil dibuat!`,
				number: carpool_number,
				id: inserted.id,
				type: 'carpool'
			});
		} else if (requestType === 'spd') {
			const start_date = payload.start_date || new Date().toISOString().split('T')[0];
			const end_date = payload.end_date || start_date;
			const destination = (payload.destination || '').trim();
			const reason = (payload.reason || 'DINAS LUAR').trim();
			const description = (payload.description || '').trim() || null;
			const is_overnight = payload.is_overnight !== undefined ? Number(payload.is_overnight) : 1;
			const facility_type_id = Number(payload.facility_type_id || 1);
			const participantsRaw = (payload.participants || '').trim();

			if (!destination) {
				return json({ success: false, message: 'Kota tujuan perjalanan dinas (SPD) wajib diisi!' }, { status: 400 });
			}

			// Generate sequential spd_number
			const [seq] = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_seq FROM ga.spd_requests`;
			const spd_number = `SPD-${String(seq.next_seq).padStart(5, '0')}`;

			const partList = participantsRaw
				? participantsRaw.split(',').map((s: string) => s.trim()).filter(Boolean)
				: [requester_name];

			const [inserted] = await sql`
				INSERT INTO ga.spd_requests (
					spd_number,
					start_date,
					end_date,
					requester_nik,
					requester_name,
					department,
					destination,
					reason,
					description,
					is_overnight,
					facility_type_id,
					status,
					raw_status,
					created_by,
					created_at
				) VALUES (
					${spd_number},
					${start_date},
					${end_date},
					${requester_nik},
					${requester_name},
					${department},
					${destination},
					${reason},
					${description},
					${is_overnight},
					${facility_type_id},
					'PENDING',
					'OPEN',
					${created_by},
					NOW()
				)
				RETURNING id, spd_number
			`;

			for (const pName of partList) {
				await sql`
					INSERT INTO ga.spd_participants (spd_id, participant_name, participant_nik, created_by, created_at)
					VALUES (${inserted.id}, ${pName}, ${pName === requester_name ? requester_nik : null}, ${created_by}, NOW())
				`;
			}

			return json({
				success: true,
				message: `Surat Perjalanan Dinas ${spd_number} berhasil diajukan!`,
				number: spd_number,
				id: inserted.id,
				type: 'spd'
			});
		} else {
			return json({ success: false, message: 'Jenis pengajuan tidak valid. Pilih Carpool atau SPD.' }, { status: 400 });
		}
	} catch (err: any) {
		console.error('Error in POST /api/ga/travel:', err);
		return json(
			{
				success: false,
				message: err.message || 'Gagal menyimpan pengajuan perjalanan dinas.'
			},
			{ status: 500 }
		);
	}
};
