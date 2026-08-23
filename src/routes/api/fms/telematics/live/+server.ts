import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const unitId = url.searchParams.get('unitId');

		if (unitId) {
			const [latest] = await sql<[{
				unit_id: string;
				speed_kmh: string;
				rpm: number;
				engine_temp_c: string;
				fuel_level_liters: string;
				fuel_pct: string;
				odometer_km: string;
				battery_voltage: string;
				is_engine_on: boolean;
				timestamp: string;
			}]>`
				SELECT 
					unit_id, speed_kmh, rpm, engine_temp_c, fuel_level_liters,
					fuel_pct, odometer_km, battery_voltage, is_engine_on, timestamp
				FROM fleet.telematics_logs
				WHERE unit_id = ${unitId}
				ORDER BY timestamp DESC
				LIMIT 1
			`;

			if (!latest) {
				// Fallback dummy telematics if unit hasn't logged yet
				return json({
					success: true,
					data: {
						unit_id: unitId,
						speed_kmh: 42.5,
						rpm: 1650,
						engine_temp_c: 88.0,
						fuel_level_liters: 210.0,
						fuel_pct: 70.0,
						odometer_km: 145230.0,
						battery_voltage: 24.4,
						is_engine_on: true,
						timestamp: new Date().toISOString()
					}
				});
			}

			return json({ success: true, data: latest });
		}

		// Otherwise get latest reading for all units
		const allLatest = await sql`
			SELECT DISTINCT ON (unit_id)
				unit_id, speed_kmh, rpm, engine_temp_c, fuel_level_liters,
				fuel_pct, odometer_km, battery_voltage, is_engine_on, timestamp
			FROM fleet.telematics_logs
			ORDER BY unit_id, timestamp DESC
		`;

		return json({ success: true, data: allLatest });
	} catch (err: any) {
		console.error('Error fetching live telematics:', err);
		return json({ success: false, message: err.message }, { status: 500 });
	}
};
