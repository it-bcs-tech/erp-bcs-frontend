import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		const [
			carpoolStatsRows,
			spdStatsRows,
			cars,
			carpools,
			carpoolPassengers,
			spds,
			spdParticipants,
			fuelPrices,
			destinations,
			mealRates,
			budgets,
			facilityTypes,
			spdRates
		] = await Promise.all([
			sql`
				SELECT
					COUNT(*)::int as total_carpool,
					COUNT(*) FILTER (WHERE status IN ('PENDING', 'APPROVED_AP'))::int as pending_carpool,
					COUNT(*) FILTER (WHERE status = 'APPROVED')::int as approved_carpool,
					COUNT(*) FILTER (WHERE city_type = 'Luar Kota')::int as out_of_town_carpool
				FROM ga.carpool_requests
			`,
			sql`
				SELECT
					COUNT(*)::int as total_spd,
					COUNT(*) FILTER (WHERE status IN ('PENDING', 'APPROVED_AP'))::int as pending_spd,
					COUNT(*) FILTER (WHERE status = 'APPROVED')::int as approved_spd
				FROM ga.spd_requests
			`,
			sql`
				SELECT c.*, f.fuel_name, f.price_per_liter
				FROM ga.cars c
				LEFT JOIN ga.travel_fuel_prices f ON c.fuel_id = f.id
				ORDER BY c.id ASC
			`,
			sql`
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
					cr.city_type,
					cr.destination,
					cr.reason,
					cr.km_start,
					cr.km_end,
					to_char(cr.time_start, 'HH24:MI') as time_start,
					to_char(cr.time_end, 'HH24:MI') as time_end,
					cr.cost_center_code,
					cr.department,
					cr.description,
					cr.passenger_count,
					cr.driver_name,
					cr.status,
					cr.raw_status,
					cr.status_desc,
					to_char(cr.approve_date_ga, 'YYYY-MM-DD HH24:MI') as approve_date_ga
				FROM ga.carpool_requests cr
				LEFT JOIN ga.cars c ON cr.car_id = c.id
				ORDER BY cr.use_date DESC NULLS LAST, cr.id DESC
				LIMIT 500
			`,
			sql`
				SELECT cp.id, cp.carpool_id, cp.passenger_nik, cp.passenger_name
				FROM ga.carpool_passengers cp
				WHERE cp.carpool_id IN (
					SELECT id FROM ga.carpool_requests ORDER BY use_date DESC NULLS LAST, id DESC LIMIT 500
				)
				ORDER BY cp.id ASC
			`,
			sql`
				SELECT
					s.id,
					s.spd_number,
					to_char(s.start_date, 'YYYY-MM-DD') as start_date,
					to_char(s.end_date, 'YYYY-MM-DD') as end_date,
					s.requester_nik,
					s.requester_name,
					s.destination,
					s.reason,
					s.cost_center_code,
					s.department,
					s.description,
					s.is_overnight,
					s.facility_type_id,
					ft.description as facility_desc,
					s.status,
					s.raw_status,
					s.status_desc,
					s.attachment,
					to_char(s.approve_date_ga, 'YYYY-MM-DD HH24:MI') as approve_date_ga
				FROM ga.spd_requests s
				LEFT JOIN ga.travel_facility_types ft ON s.facility_type_id = ft.id
				ORDER BY s.start_date DESC NULLS LAST, s.id DESC
				LIMIT 500
			`,
			sql`
				SELECT sp.id, sp.spd_id, sp.participant_nik, sp.participant_name, sp.spd_ga_id
				FROM ga.spd_participants sp
				WHERE sp.spd_id IN (
					SELECT id FROM ga.spd_requests ORDER BY start_date DESC NULLS LAST, id DESC LIMIT 500
				)
				ORDER BY sp.id ASC
			`,
			sql`
				SELECT id, fuel_name, COALESCE(price_per_liter, 0)::numeric as price_per_liter, to_char(effective_date, 'YYYY-MM-DD') as effective_date
				FROM ga.travel_fuel_prices
				ORDER BY id ASC
			`,
			sql`
				SELECT id, origin, destination_name, area, region, km_min, km_max, COALESCE(toll_cost, 0)::numeric as toll_cost
				FROM ga.travel_destinations
				ORDER BY id ASC
			`,
			sql`
				SELECT id, job_level, COALESCE(amount, 0)::numeric as amount, region, to_char(effective_date, 'YYYY-MM-DD') as effective_date, description
				FROM ga.travel_meal_rates
				ORDER BY id ASC
			`,
			sql`
				SELECT b.id, b.budget_name, b.facility_type_id, ft.description as facility_desc
				FROM ga.travel_budgets b
				LEFT JOIN ga.travel_facility_types ft ON b.facility_type_id = ft.id
				ORDER BY b.id ASC
			`,
			sql`
				SELECT id, description, value_code FROM ga.travel_facility_types ORDER BY id ASC
			`,
			sql`
				SELECT sr.id, sr.city, sr.job_level, sr.budget_id, b.budget_name, ft.description as facility_desc,
					COALESCE(sr.cost_amount, 0)::numeric as cost_amount
				FROM ga.spd_rates sr
				LEFT JOIN ga.travel_budgets b ON sr.budget_id = b.id
				LEFT JOIN ga.travel_facility_types ft ON b.facility_type_id = ft.id
				ORDER BY sr.city ASC, sr.job_level ASC, sr.id ASC
			`
		]);

		const cpPassMap = new Map<number, any[]>();
		for (const p of carpoolPassengers) {
			const cid = Number(p.carpool_id);
			if (!cpPassMap.has(cid)) cpPassMap.set(cid, []);
			cpPassMap.get(cid)!.push(p);
		}

		const spdPartMap = new Map<number, any[]>();
		for (const p of spdParticipants) {
			const sid = Number(p.spd_id);
			if (!spdPartMap.has(sid)) spdPartMap.set(sid, []);
			spdPartMap.get(sid)!.push(p);
		}

		const processedCarpools = carpools.map((c: any) => ({
			...c,
			passengers: cpPassMap.get(c.id) || []
		}));

		const processedSpds = spds.map((s: any) => ({
			...s,
			participants: spdPartMap.get(s.id) || []
		}));

		return {
			stats: {
				totalCarpool: carpoolStatsRows[0]?.total_carpool || 0,
				pendingCarpool: carpoolStatsRows[0]?.pending_carpool || 0,
				approvedCarpool: carpoolStatsRows[0]?.approved_carpool || 0,
				outOfTownCarpool: carpoolStatsRows[0]?.out_of_town_carpool || 0,
				totalSpd: spdStatsRows[0]?.total_spd || 0,
				pendingSpd: spdStatsRows[0]?.pending_spd || 0,
				approvedSpd: spdStatsRows[0]?.approved_spd || 0,
				totalCars: cars.length
			},
			cars,
			carpools: processedCarpools,
			spds: processedSpds,
			fuelPrices,
			destinations,
			mealRates,
			budgets,
			facilityTypes,
			spdRates
		};
	} catch (err) {
		console.error('Error loading travel & SPD data:', err);
		return {
			stats: {
				totalCarpool: 0,
				pendingCarpool: 0,
				approvedCarpool: 0,
				outOfTownCarpool: 0,
				totalSpd: 0,
				pendingSpd: 0,
				approvedSpd: 0,
				totalCars: 0
			},
			cars: [],
			carpools: [],
			spds: [],
			fuelPrices: [],
			destinations: [],
			mealRates: [],
			budgets: [],
			facilityTypes: [],
			spdRates: []
		};
	}
};

export const actions: Actions = {
	createCarpool: async ({ request }) => {
		const data = await request.formData();
		const use_date = data.get('use_date')?.toString() || new Date().toISOString().split('T')[0];
		const car_id = Number(data.get('car_id')) || null;
		const requester_name = data.get('requester_name')?.toString().trim();
		const department = data.get('department')?.toString().trim() || 'UMUM';
		const city_type = data.get('city_type')?.toString() || 'Dalam Kota';
		const destination = data.get('destination')?.toString().trim();
		const time_start = data.get('time_start')?.toString() || '08:00';
		const time_end = data.get('time_end')?.toString() || '17:00';
		const driver_name = data.get('driver_name')?.toString().trim() || null;
		const description = data.get('description')?.toString().trim() || null;
		const passengersRaw = data.get('passengers')?.toString().trim() || '';

		if (!requester_name || !destination) {
			return fail(400, { message: 'Nama pemohon dan tempat tujuan wajib diisi!' });
		}

		try {
			const [seq] = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_seq FROM ga.carpool_requests`;
			const carpool_number = `CRP-${String(seq.next_seq).padStart(5, '0')}`;
			const passList = passengersRaw
				? passengersRaw.split(',').map((s) => s.trim()).filter(Boolean)
				: [requester_name];

			const [inserted] = await sql`
				INSERT INTO ga.carpool_requests (
					carpool_number, use_date, car_id, requester_name, department,
					city_type, destination, time_start, time_end, driver_name,
					description, passenger_count, status, raw_status, created_by
				) VALUES (
					${carpool_number}, ${use_date}, ${car_id}, ${requester_name}, ${department},
					${city_type}, ${destination}, ${time_start}, ${time_end}, ${driver_name},
					${description}, ${passList.length}, 'PENDING', 'OPEN', ${requester_name}
				)
				RETURNING id
			`;

			for (const pName of passList) {
				await sql`
					INSERT INTO ga.carpool_passengers (carpool_id, passenger_name, created_at)
					VALUES (${inserted.id}, ${pName}, NOW())
				`;
			}

			return { success: true, message: `Permohonan Carpool ${carpool_number} berhasil dibuat` };
		} catch (e: any) {
			console.error('Error creating carpool:', e);
			return fail(500, { message: e.message || 'Gagal membuat permohonan Carpool' });
		}
	},

	approveCarpool: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const car_id = Number(data.get('car_id')) || null;
		const driver_name = data.get('driver_name')?.toString().trim() || null;
		const km_start = Number(data.get('km_start') || 0);
		const km_end = Number(data.get('km_end') || 0);

		if (!id) return fail(400, { message: 'ID Carpool tidak valid' });

		try {
			await sql`
				UPDATE ga.carpool_requests SET
					status = 'APPROVED',
					raw_status = 'APPROVE GA',
					car_id = COALESCE(${car_id}, car_id),
					driver_name = COALESCE(${driver_name}, driver_name),
					km_start = ${km_start},
					km_end = ${km_end},
					approve_date_ga = NOW(),
					updated_at = NOW()
				WHERE id = ${id}
			`;
			return { success: true, message: 'Permohonan Carpool disetujui oleh GA' };
		} catch (e: any) {
			console.error('Error approving carpool:', e);
			return fail(500, { message: 'Gagal menyetujui Carpool' });
		}
	},

	rejectCarpool: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const status_desc = data.get('status_desc')?.toString().trim() || 'Ditolak oleh GA';
		if (!id) return fail(400, { message: 'ID Carpool tidak valid' });

		try {
			await sql`
				UPDATE ga.carpool_requests SET
					status = 'REJECTED',
					raw_status = 'REJECT GA',
					status_desc = ${status_desc},
					reject_date_ga = NOW(),
					updated_at = NOW()
				WHERE id = ${id}
			`;
			return { success: true, message: 'Permohonan Carpool telah ditolak' };
		} catch (e: any) {
			console.error('Error rejecting carpool:', e);
			return fail(500, { message: 'Gagal menolak Carpool' });
		}
	},

	createSpd: async ({ request }) => {
		const data = await request.formData();
		const start_date = data.get('start_date')?.toString() || new Date().toISOString().split('T')[0];
		const end_date = data.get('end_date')?.toString() || start_date;
		const requester_name = data.get('requester_name')?.toString().trim();
		const department = data.get('department')?.toString().trim() || 'UMUM';
		const destination = data.get('destination')?.toString().trim();
		const reason = data.get('reason')?.toString().trim() || 'DINAS LUAR';
		const description = data.get('description')?.toString().trim() || null;
		const is_overnight = Number(data.get('is_overnight') ?? 1);
		const facility_type_id = Number(data.get('facility_type_id') || 1);
		const participantsRaw = data.get('participants')?.toString().trim() || '';

		if (!requester_name || !destination) {
			return fail(400, { message: 'Nama pemohon dan kota tujuan SPD wajib diisi!' });
		}

		try {
			const [seq] = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_seq FROM ga.spd_requests`;
			const spd_number = `SPD-${String(seq.next_seq).padStart(5, '0')}`;
			const partList = participantsRaw
				? participantsRaw.split(',').map((s) => s.trim()).filter(Boolean)
				: [requester_name];

			const [inserted] = await sql`
				INSERT INTO ga.spd_requests (
					spd_number, start_date, end_date, requester_name, department,
					destination, reason, description, is_overnight, facility_type_id,
					status, raw_status, created_by
				) VALUES (
					${spd_number}, ${start_date}, ${end_date}, ${requester_name}, ${department},
					${destination}, ${reason}, ${description}, ${is_overnight}, ${facility_type_id},
					'PENDING', 'OPEN', ${requester_name}
				)
				RETURNING id
			`;

			for (const pName of partList) {
				await sql`
					INSERT INTO ga.spd_participants (spd_id, participant_name, created_at)
					VALUES (${inserted.id}, ${pName}, NOW())
				`;
			}

			return { success: true, message: `Surat Perjalanan Dinas ${spd_number} berhasil dibuat` };
		} catch (e: any) {
			console.error('Error creating SPD:', e);
			return fail(500, { message: e.message || 'Gagal membuat SPD' });
		}
	},

	approveSpd: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const status_desc = data.get('status_desc')?.toString().trim() || 'Disetujui GA';
		if (!id) return fail(400, { message: 'ID SPD tidak valid' });

		try {
			await sql`
				UPDATE ga.spd_requests SET
					status = 'APPROVED',
					raw_status = 'APPROVE GA',
					status_desc = ${status_desc},
					approve_date_ga = NOW(),
					updated_at = NOW()
				WHERE id = ${id}
			`;
			return { success: true, message: 'SPD berhasil disetujui oleh GA' };
		} catch (e: any) {
			console.error('Error approving SPD:', e);
			return fail(500, { message: 'Gagal menyetujui SPD' });
		}
	},

	rejectSpd: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const status_desc = data.get('status_desc')?.toString().trim() || 'Ditolak oleh GA';
		if (!id) return fail(400, { message: 'ID SPD tidak valid' });

		try {
			await sql`
				UPDATE ga.spd_requests SET
					status = 'REJECTED',
					raw_status = 'REJECT GA',
					status_desc = ${status_desc},
					reject_date_ga = NOW(),
					updated_at = NOW()
				WHERE id = ${id}
			`;
			return { success: true, message: 'SPD telah ditolak' };
		} catch (e: any) {
			console.error('Error rejecting SPD:', e);
			return fail(500, { message: 'Gagal menolak SPD' });
		}
	},

	createCar: async ({ request }) => {
		const data = await request.formData();
		const car_name = data.get('car_name')?.toString().trim();
		const police_number = data.get('police_number')?.toString().trim();
		const car_group = data.get('car_group')?.toString().trim() || 'R4';
		const car_user = data.get('car_user')?.toString().trim() || 'Ops GA';
		const fuel_id = Number(data.get('fuel_id') || 1);
		const km_per_liter = parseFloat(data.get('km_per_liter')?.toString() || '10');

		if (!car_name || !police_number) {
			return fail(400, { message: 'Nama kendaraan dan nomor polisi wajib diisi!' });
		}

		try {
			const [newCar] = await sql`
				INSERT INTO ga.cars (car_group, car_user, car_name, police_number, fuel_id, km_per_liter, is_active)
				VALUES (${car_group}, ${car_user}, ${car_name}, ${police_number}, ${fuel_id}, ${km_per_liter}, true)
				RETURNING id
			`;

			const isNonAsset = /go\s*-\s*car|go\s*-\s*jeg|go\s*-\s*jek|pribadi/i.test(police_number);
			if (!isNonAsset && newCar?.id) {
				const [seq] = await sql`SELECT count(*) + 1 as next_seq FROM ga.assets`;
				const code = `AST-VEH-${String(seq.next_seq).padStart(3, '0')}`;
				await sql`
					INSERT INTO ga.assets (
						asset_code, name, category, brand_model, serial_number,
						acquisition_date, acquisition_cost, economic_life_months, salvage_value,
						location, room, pic_name, condition, status, barcode_qr, notes,
						car_id, vehicle_group, fuel_id, km_per_liter
					) VALUES (
						${code}, ${`${car_name} (${police_number})`}, 'KENDARAAN_OPERASIONAL', ${`${car_name} • ${car_group}`}, ${police_number},
						CURRENT_DATE, 0, 60, 0,
						'Head Office Cilegon', 'Pool Operasional GA', ${car_user},
						'GOOD', 'ACTIVE', ${code}, ${`Unit Kendaraan Operasional Carpool GA (Nopol: ${police_number}, Rasio BBM: ${km_per_liter} KM/L)`},
						${newCar.id}, ${car_group}, ${fuel_id}, ${km_per_liter}
					)
				`;
			}

			return { success: true, message: `Kendaraan ${car_name} (${police_number}) berhasil ditambahkan & disinkronkan ke Master Assets` };
		} catch (e: any) {
			console.error('Error creating car:', e);
			return fail(500, { message: 'Gagal menambahkan kendaraan GA' });
		}
	},

	createSpdRate: async ({ request }) => {
		const data = await request.formData();
		const city = data.get('city')?.toString().trim();
		const job_level = data.get('job_level')?.toString().trim();
		const budget_id = Number(data.get('budget_id') || 1);
		const cost_amount = parseFloat(data.get('cost_amount')?.toString() || '0');

		if (!city || !job_level) {
			return fail(400, { message: 'Kota tujuan dan level jabatan wajib diisi!' });
		}

		try {
			await sql`
				INSERT INTO ga.spd_rates (city, job_level, budget_id, cost_amount)
				VALUES (${city}, ${job_level}, ${budget_id}, ${cost_amount})
			`;
			return { success: true, message: 'Matriks tarif SPD berhasil ditambahkan' };
		} catch (e: any) {
			console.error('Error creating SPD rate:', e);
			return fail(500, { message: 'Gagal menambahkan matriks tarif SPD' });
		}
	}
};
