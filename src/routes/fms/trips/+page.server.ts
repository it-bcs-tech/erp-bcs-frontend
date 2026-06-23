import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ url }) => {
	try {
		// Fetch trips from database
		const dbTrips = await sql`
			SELECT 
				t.id as trip_db_id,
				t.no_surat_tugas as id,
				u.nomor_unit as vehicle,
				k.nama_karyawan as driver,
				t.origin,
				t.destination,
				t.cargo,
				t.status,
				t.depart_time,
				t.arrive_time,
				t.created_at,
				COALESCE(
					(SELECT json_agg(json_build_object('status', sl.status, 'created_at', sl.created_at) ORDER BY sl.created_at ASC)
					 FROM fleet.trip_status_log sl WHERE sl.trip_id = t.id),
					'[]'::json
				) as status_logs,
				COALESCE(
					(SELECT json_agg(json_build_object('point', tn.point, 'note', tn.note, 'created_by', tn.created_by, 'created_at', tn.created_at))
					 FROM fleet.trip_notes tn WHERE tn.trip_id = t.id),
					'[]'::json
				) as notes
			FROM fleet.trip t
			LEFT JOIN fleet.unit u ON t.unit_id = u.id
			LEFT JOIN master.m_drivers d ON d.id = t.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			ORDER BY t.created_at DESC
		`;

		// Format trips and build history timeline
		const allTrips = dbTrips.map(t => {
			const formatTime = (dateStr: any) => {
				if (!dateStr) return null;
				const d = new Date(dateStr);
				return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
			};

			const createdTime = formatTime(t.created_at);
			const departTime = formatTime(t.depart_time);
			const arriveTime = formatTime(t.arrive_time);

			let mappedStatus = 'Scheduled';
			let progress = 0;

			// Base status mapping
			if (t.status === 'COMPLETED') {
				mappedStatus = 'Completed';
				progress = 100;
			} else if (t.status === 'RETURNING') {
				mappedStatus = 'In Transit';
				progress = 90;
			} else if (t.status === 'AT_DESTINATION') {
				mappedStatus = 'In Transit';
				progress = 75;
			} else if (t.status === 'ON_ROUTE') {
				mappedStatus = 'In Transit';
				progress = 60;
			} else if (t.status === 'AT_ORIGIN') {
				mappedStatus = 'In Transit';
				progress = 40;
			} else if (t.status === 'DISPATCHED') {
				mappedStatus = 'In Transit';
				progress = 20;
			} else if (t.status === 'CANCELED') {
				mappedStatus = 'Canceled';
				progress = 0;
			}

			const completedStatuses = {
				'AT_POOL': true,
				'HEADING_ORIGIN': ['AT_ORIGIN', 'ON_ROUTE', 'AT_DESTINATION', 'RETURNING', 'COMPLETED'].includes(t.status),
				'AT_ORIGIN': ['ON_ROUTE', 'AT_DESTINATION', 'RETURNING', 'COMPLETED'].includes(t.status),
				'HEADING_DEST': ['AT_DESTINATION', 'RETURNING', 'COMPLETED'].includes(t.status),
				'AT_DEST': ['RETURNING', 'COMPLETED'].includes(t.status),
				'RETURNING': t.status === 'COMPLETED'
			};

			const logs = Array.isArray(t.status_logs) ? t.status_logs : [];
			const logMap = new Map();
			logs.forEach((l: any) => {
				if (!logMap.has(l.status)) {
					logMap.set(l.status, l.created_at);
				}
			});

			const calcDuration = (startStatus: string, endStatus: string) => {
				const start = logMap.get(startStatus);
				let end = logMap.get(endStatus);
				let isOngoing = false;
				
				if (!start) return null;

				if (!end) {
					end = new Date().toISOString();
					isOngoing = true;
				}
				
				const diffMs = new Date(end).getTime() - new Date(start).getTime();
				const totalMins = Math.floor(diffMs / 60000);
				const h = Math.floor(totalMins / 60);
				const m = totalMins % 60;
				let str = h > 0 ? `${h}j ${m}m` : `${m}m`;
				
				const startFmt = formatTime(start);
				const endFmt = isOngoing ? 'Sekarang' : formatTime(end);
				
				return {
					value: str,
					tooltip: `${startFmt} s/d ${endFmt}`
				};
			};

			const notesList = Array.isArray(t.notes) ? t.notes : [];
			const notesMap = new Map();
			notesList.forEach((n: any) => notesMap.set(n.point, n));

			// Generate horizontal timeline history
			const history = [
				{ 
					step: 'AT_POOL', 
					label: 'Standby at Pool', 
					time: createdTime, 
					completed: completedStatuses['AT_POOL'], 
					active: t.status === 'SCHEDULED',
					duration: null,
					note: notesMap.get('AT_POOL') || null
				},
				{ 
					step: 'HEADING_ORIGIN', 
					label: 'Heading to Origin', 
					time: logMap.get('DISPATCHED') ? formatTime(logMap.get('DISPATCHED')) : departTime, 
					completed: completedStatuses['HEADING_ORIGIN'], 
					active: t.status === 'DISPATCHED',
					duration: calcDuration('DISPATCHED', 'AT_ORIGIN'),
					note: notesMap.get('HEADING_ORIGIN') || null
				},
				{ 
					step: 'AT_ORIGIN', 
					label: 'Loading at Origin', 
					time: logMap.get('AT_ORIGIN') ? formatTime(logMap.get('AT_ORIGIN')) : null, 
					completed: completedStatuses['AT_ORIGIN'], 
					active: t.status === 'AT_ORIGIN',
					duration: calcDuration('AT_ORIGIN', 'ON_ROUTE'),
					note: notesMap.get('AT_ORIGIN') || null
				},
				{ 
					step: 'HEADING_DEST', 
					label: 'On Route to Dest', 
					time: logMap.get('ON_ROUTE') ? formatTime(logMap.get('ON_ROUTE')) : null, 
					completed: completedStatuses['HEADING_DEST'], 
					active: t.status === 'ON_ROUTE',
					duration: calcDuration('ON_ROUTE', 'AT_DESTINATION'),
					note: notesMap.get('HEADING_DEST') || null
				},
				{ 
					step: 'AT_DEST', 
					label: 'Unloading at Dest', 
					time: logMap.get('AT_DESTINATION') ? formatTime(logMap.get('AT_DESTINATION')) : null, 
					completed: completedStatuses['AT_DEST'], 
					active: t.status === 'AT_DESTINATION',
					duration: calcDuration('AT_DESTINATION', 'RETURNING'),
					note: notesMap.get('AT_DEST') || null
				},
				{ 
					step: 'RETURNING', 
					label: 'Returning to Pool', 
					time: logMap.get('RETURNING') ? formatTime(logMap.get('RETURNING')) : null, 
					completed: completedStatuses['RETURNING'], 
					active: t.status === 'RETURNING',
					duration: calcDuration('RETURNING', 'COMPLETED'),
					note: notesMap.get('RETURNING') || null
				}
			];

			return {
				id: t.id || 'TRP-UNKNOWN',
				db_id: t.trip_db_id,
				vehicle: t.vehicle || '-',
				driver: t.driver || '-',
				origin: t.origin || '-',
				destination: t.destination || '-',
				status: mappedStatus,
				progress,
				departedAt: t.depart_time ? new Date(t.depart_time).toLocaleString('id-ID') : '-',
				eta: '-',
				distance: '-',
				cargo: t.cargo || '-',
				history
			};
		});

		const metrics = {
			activeTrips: allTrips.filter(t => t.status === 'In Transit').length,
			completedToday: allTrips.filter(t => t.status === 'Completed').length,
			scheduled: allTrips.filter(t => t.status === 'Scheduled').length,
			delayed: allTrips.filter(t => t.status === 'Delayed').length
		};

		// Extract search and filters
		const search = url.searchParams.get('search')?.toLowerCase() || '';
		const statusFilter = url.searchParams.get('status') || 'All';

		let filteredTrips = allTrips;

		if (search) {
			filteredTrips = filteredTrips.filter(t =>
				t.id.toLowerCase().includes(search) ||
				t.vehicle.toLowerCase().includes(search) ||
				t.driver.toLowerCase().includes(search) ||
				t.destination.toLowerCase().includes(search)
			);
		}

		if (statusFilter !== 'All') {
			filteredTrips = filteredTrips.filter(t => t.status === statusFilter);
		}

		const perPage = 5;
		const page = parseInt(url.searchParams.get('page') || '1');
		const total = filteredTrips.length;
		const start = (page - 1) * perPage;
		const paginatedTrips = filteredTrips.slice(start, start + perPage);

		return {
			trips: paginatedTrips,
			metrics,
			meta: {
				current_page: page,
				per_page: perPage,
				total: total
			}
		};
	} catch (error) {
		console.error("Error loading trips from database:", error);
		return { 
			trips: [], 
			metrics: { activeTrips: 0, completedToday: 0, scheduled: 0, delayed: 0 }, 
			meta: { current_page: 1, per_page: 5, total: 0 } 
		};
	}
};

import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	saveNote: async ({ request, cookies }) => {
		const data = await request.formData();
		const tripId = data.get('trip_id')?.toString();
		const point = data.get('point')?.toString();
		const note = data.get('note')?.toString() || '';

		if (!tripId || !point) {
			return fail(400, { success: false, message: 'Invalid data' });
		}

		let createdBy = 'Unknown';
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const u = JSON.parse(userDataCookie);
				createdBy = u.name || u.email || 'Unknown';
			} catch (e) { /* silent */ }
		}

		try {
			// UPSERT the note
			await sql`
				INSERT INTO fleet.trip_notes (trip_id, point, note, created_by)
				VALUES (${tripId}, ${point}, ${note}, ${createdBy})
				ON CONFLICT (trip_id, point) DO UPDATE SET 
					note = EXCLUDED.note,
					created_by = EXCLUDED.created_by,
					updated_at = CURRENT_TIMESTAMP
			`;
			return { success: true };
		} catch (error) {
			console.error("Failed to save note:", error);
			return fail(500, { success: false, message: 'Failed to save note' });
		}
	}
};
