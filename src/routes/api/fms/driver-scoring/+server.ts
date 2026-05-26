import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async () => {
	try {
		// Fetch drivers who had trips in the last 30 days
		const driverStatsQuery = await sql`
			SELECT 
				d.id as driver_id,
				k.nama_karyawan as name,
				COUNT(DISTINCT t.id) as total_trips_30d,
				COUNT(c.id) FILTER (WHERE c.notes LIKE '%INCIDENT%' OR c.notes LIKE '%CRITICAL%') as total_incidents_30d,
				COUNT(c.id) FILTER (WHERE c.notes LIKE '%NOTE%') as total_notes_30d
			FROM master.m_drivers d
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			JOIN fleet.trip t ON t.driver_id = d.id AND t.tgl_trip >= CURRENT_DATE - INTERVAL '30 days' AND t.deleted_at IS NULL
			LEFT JOIN fleet.trip_checkpoint c ON c.trip_id = t.id
			GROUP BY d.id, k.nama_karyawan
			ORDER BY total_trips_30d DESC
			LIMIT 25
		`;

		if (driverStatsQuery.length === 0) {
			return json({ leaderboard: [] });
		}

		const formattedDrivers = driverStatsQuery.map((d: any) => ({
			driver_id: String(d.driver_id),
			name: d.name || 'Unknown',
			total_trips_30d: parseInt(d.total_trips_30d) || 0,
			total_incidents_30d: parseInt(d.total_incidents_30d) || 0,
			total_notes_30d: parseInt(d.total_notes_30d) || 0
		}));

		const aiPayload = {
			drivers: formattedDrivers
		};

		const aiUrl = `${env.AI_BRIDGE_URL || 'http://localhost:8000'}/fms/driver-scoring`;
		
		const aiRes = await fetch(aiUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(aiPayload)
		});

		if (!aiRes.ok) {
			throw new Error(`AI Bridge error: ${aiRes.status}`);
		}

		const result = await aiRes.json();
		return json(result);

	} catch (error: any) {
		console.error('Driver Scoring Error:', error);
		return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
	}
};
