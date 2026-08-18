import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ url, fetch }) => {
	try {
		const startLat = url.searchParams.get('startLat');
		const startLng = url.searchParams.get('startLng');
		const endLat = url.searchParams.get('endLat');
		const endLng = url.searchParams.get('endLng');

		if (!startLat || !startLng || !endLat || !endLng) {
			return json({ error: 'Missing coordinates' }, { status: 400 });
		}

		// 1. Try internal Golang FMS API if available
		const fmsUrl = env.FMS_API_URL || 'http://localhost:8081';
		try {
			const res = await fetch(`${fmsUrl}/api/fms/route${url.search}`);
			if (res.ok) {
				const data = await res.json();
				if (data.coordinates && data.coordinates.length > 1) {
					return json(data);
				}
			}
		} catch (_) {
			// Fallback to public OSRM router
		}

		// 2. Direct OSRM Public Routing API fallback for real highway curves
		const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
		const osrmRes = await fetch(osrmUrl, {
			headers: { 'Accept': 'application/json' }
		});

		if (osrmRes.ok) {
			const osrmData = await osrmRes.json();
			const route = osrmData.routes?.[0];
			if (route && route.geometry?.coordinates) {
				// Convert [lng, lat] to [lat, lng] for Leaflet
				const coordinates = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
				return json({
					coordinates,
					distance: route.distance,
					duration: route.duration
				});
			}
		}

		return json({ coordinates: [], distance: 0, duration: 0 });
	} catch (error: any) {
		console.error("Proxy FMS Route Error:", error);
		return json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
	}
};

