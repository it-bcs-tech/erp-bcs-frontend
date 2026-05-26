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
				t.created_at
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
			} else if (t.status === 'AT_DESTINATION') {
				mappedStatus = 'In Transit';
				progress = 90;
			} else if (t.status === 'DISPATCHED') {
				mappedStatus = 'In Transit';
				progress = 50;
			}

			// Generate horizontal timeline history
			const history = [
				{ 
					step: 'AT_POOL', 
					label: 'Standby at Pool', 
					time: createdTime, 
					completed: true, 
					active: mappedStatus === 'Scheduled' 
				},
				{ 
					step: 'HEADING_ORIGIN', 
					label: 'Heading to Origin', 
					time: departTime, 
					completed: !!departTime || mappedStatus !== 'Scheduled', 
					active: false 
				},
				{ 
					step: 'AT_ORIGIN', 
					label: 'Loading at Origin', 
					time: null, 
					completed: mappedStatus !== 'Scheduled', 
					active: false 
				},
				{ 
					step: 'HEADING_DEST', 
					label: 'On Route to Dest', 
					time: null, 
					completed: mappedStatus === 'Completed' || t.status === 'AT_DESTINATION', 
					active: mappedStatus === 'In Transit' && t.status === 'DISPATCHED' 
				},
				{ 
					step: 'AT_DEST', 
					label: 'Unloading at Dest', 
					time: arriveTime, 
					completed: mappedStatus === 'Completed', 
					active: t.status === 'AT_DESTINATION' 
				},
				{ 
					step: 'RETURNING', 
					label: 'Returning to Pool', 
					time: null, 
					completed: mappedStatus === 'Completed', 
					active: mappedStatus === 'Completed'
				},
			];

			return {
				id: t.id || 'TRP-UNKNOWN',
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
