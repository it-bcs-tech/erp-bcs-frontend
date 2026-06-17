import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const GET: RequestHandler = async ({ params }) => {
	try {
		const tripId = params.id;
		if (!tripId) {
			return json({ success: false, error: 'Missing trip ID' }, { status: 400 });
		}

		// Also fetch origin and destination for completeness
		const tripData = await sql`
			SELECT 
				t.id, u.nomor_unit as unit, t.status,
				o.latitude as origin_lat, o.longitude as origin_lon, o.nama_kustomer as origin_name,
				d.latitude as dest_lat, d.longitude as dest_lon, d.nama_kustomer as dest_name
			FROM fleet.trip t
			LEFT JOIN fleet.unit u ON u.id = t.unit_id
			LEFT JOIN master.m_customer o ON o.id = t.origin_id
			LEFT JOIN master.m_customer d ON d.id = t.destination_id
			WHERE t.id = ${tripId}
		`;

		if (tripData.length === 0) {
			return json({ success: false, error: 'Trip not found' }, { status: 404 });
		}

		const paths = await sql`
			SELECT lat, lon, speed, recorded_at 
			FROM fleet.trip_path 
			WHERE trip_id = ${tripId}
			ORDER BY recorded_at ASC
		`;

		const restAreaLogs = await sql`
			SELECT r.nama_rest_area, r.polygon_points, l.enter_time, l.exit_time, l.duration_minutes
			FROM fleet.trip_rest_area_log l
			JOIN master.m_rest_area r ON r.id = l.rest_area_id
			WHERE l.trip_id = ${tripId}
			ORDER BY l.enter_time ASC
		`;

		const checkpoints = await sql`
			SELECT event, lat, lon, notes, recorded_at
			FROM fleet.trip_checkpoint
			WHERE trip_id = ${tripId} AND lat IS NOT NULL AND lon IS NOT NULL
			ORDER BY recorded_at ASC
		`;

		const pools = await sql`
			SELECT nama_pool, latitude, longitude, geofence_radius
			FROM master.m_pool
		`;

		return json({
			success: true,
			trip: tripData[0],
			rest_areas: restAreaLogs,
			checkpoints: checkpoints,
			pools: pools,
			path: paths.map(p => ({
				lat: parseFloat(p.lat),
				lon: parseFloat(p.lon),
				speed: p.speed,
				time: p.recorded_at
			}))
		});

	} catch (error: any) {
		console.error("Trip Path API Error:", error);
		return json({ success: false, error: error.message }, { status: 500 });
	}
};
