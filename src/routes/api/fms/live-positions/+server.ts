import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import sql from '$lib/server/db';

/**
 * GET /api/fms/live-positions
 * Lightweight endpoint for client-side polling (every 10s).
 * Returns only GPS coordinates + speed + status — no full page reload needed.
 */
export const GET = async ({ fetch }) => {
	try {
		// Fetch active trip enrichment from DB (lightweight query)
		const activeTrips = await sql<{
			nomor_unit: string;
			driver_nama: string;
			status: string;
		}[]>`
			SELECT u.nomor_unit, COALESCE(k.nama_karyawan, t.driver_nama) as driver_nama, t.status
			FROM fleet.trip t
			JOIN fleet.unit u ON u.id = t.unit_id
			LEFT JOIN master.m_drivers dr ON dr.id = t.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = dr.karyawan_id
			WHERE t.status IN ('DISPATCHED', 'AT_ORIGIN', 'ON_ROUTE', 'AT_DESTINATION', 'RETURNING')
			  AND t.deleted_at IS NULL
		`;

		const tripMap = new Map<string, { driver_nama: string; status: string }>();
		for (const t of activeTrips) {
			tripMap.set(t.nomor_unit.replace(/\s+/g, '').toUpperCase(), {
				driver_nama: t.driver_nama,
				status: t.status
			});
		}

		// Fetch GPS positions from EasyGo Golang backend
		const res = await fetch(`${env.FMS_API_URL || 'http://localhost:8081'}/api/fms/live-map`);
		if (!res.ok) throw new Error('EasyGo API unavailable');

		const responseData = await res.json();
		const vehicles = responseData.records || [];

		// Map to minimal position payload only (fast & lightweight)
		const positions = vehicles.map((v: any) => {
			const nopolClean = (v.nopol || v.vehicle_id || '').replace(/\s+/g, '').toUpperCase();
			const dbTrip = tripMap.get(nopolClean);

			let lat = Number(v.lat) || 0;
			let lng = Number(v.lon) || 0;

			// Fallback to default pool if no GPS fix
			if (lat === 0 && lng === 0) {
				lat = -6.4609;
				lng = 106.8940;
			}

			let statusStr = 'Available';
			if (v.currentStatusVehicle) {
				const vs = v.currentStatusVehicle.status;
				if (vs === 2) statusStr = 'Moving';
				else if (dbTrip?.status === 'AT_ORIGIN' || dbTrip?.status === 'AT_DESTINATION') statusStr = 'Loading';
				else if (vs === 0 || vs === 1) statusStr = dbTrip ? 'Transit' : 'Available';
			}

			return {
				id: v.nopol || v.vehicle_id,
				lat,
				lng,
				speed: Math.round(v.speed || 0),
				direction: typeof v.direction === 'number' ? v.direction : parseInt(v.direction || '0') || 0,
				status: statusStr,
				driver: dbTrip?.driver_nama || v.driver_nm || '-'
			};
		});

		return json({ positions, ts: Date.now() });
	} catch (err) {
		console.error('[live-positions] Error:', err);
		return json({ positions: [], ts: Date.now(), error: true });
	}
};
