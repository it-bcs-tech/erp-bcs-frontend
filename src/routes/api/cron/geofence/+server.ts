import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { runGeofenceEngine } from '$lib/server/geofence';

export const GET: RequestHandler = async () => {
	try {
		const result = await runGeofenceEngine();
		return json(result);
	} catch (error: any) {
		console.error("Geofence Cron Error:", error);
		return json({ success: false, error: error.message }, { status: 500 });
	}
};
