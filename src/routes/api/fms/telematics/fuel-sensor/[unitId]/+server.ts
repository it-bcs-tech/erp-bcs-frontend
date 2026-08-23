import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const unitId = params.unitId;

		const logs = await sql<{
			timestamp: string;
			fuel_level_liters: string;
			fuel_pct: string;
			speed_kmh: string;
			odometer_km: string;
			is_engine_on: boolean;
		}[]>`
			SELECT 
				timestamp, fuel_level_liters, fuel_pct, speed_kmh, odometer_km, is_engine_on
			FROM fleet.telematics_logs
			WHERE unit_id = ${unitId}
			ORDER BY timestamp ASC
			LIMIT 48
		`;

		// Check for sudden drop anomalies (e.g. drop > 15% between consecutive readings when engine was off / stationary)
		const anomalies = [];
		for (let i = 1; i < logs.length; i++) {
			const prev = parseFloat(logs[i - 1].fuel_pct);
			const curr = parseFloat(logs[i].fuel_pct);
			const drop = prev - curr;

			if (drop > 10.0) {
				anomalies.push({
					timestamp: logs[i].timestamp,
					previous_level: prev,
					current_level: curr,
					drop_liters: parseFloat(logs[i - 1].fuel_level_liters) - parseFloat(logs[i].fuel_level_liters),
					drop_percentage: drop,
					speed: logs[i].speed_kmh,
					type: 'POSSIBLE_THEFT_OR_LEAK'
				});
			}
		}

		return json({
			success: true,
			data: {
				unit_id: unitId,
				logs,
				anomalies
			}
		});
	} catch (err: any) {
		console.error('Error fetching fuel sensor logs:', err);
		return json({ success: false, message: err.message }, { status: 500 });
	}
};
