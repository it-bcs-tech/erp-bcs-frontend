/**
 * Routing & Real Driving Distance Utility for ERP BCS
 * Mengkalkulasi jarak tempuh berkendara nyata (driving distance) mengikuti jaringan jalan raya & tol,
 * bukan garis lurus (Haversine/burung terbang).
 */

export interface LatLng {
	lat: number;
	lng: number;
}

/**
 * Formula Haversine (jarak garis lurus referensi)
 */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371; // radius bumi dalam KM
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
			  Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Mengambil jarak berkendara riil menggunakan OSRM (Open Source Routing Machine)
 * atau fallback ke faktor kelokan jalan darat (~1.25x haversine).
 */
export async function getDrivingDistanceKm(
	origin: LatLng,
	destination: LatLng,
	waypoints: LatLng[] = []
): Promise<{ distance_km: number; duration_minutes: number; source: 'osrm' | 'google' | 'fallback' }> {
	const allPoints: LatLng[] = [origin, ...waypoints, destination];

	// Format OSRM: lon1,lat1;lon2,lat2;...
	const coordString = allPoints.map(p => `${p.lng},${p.lat}`).join(';');
	const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=false`;

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

		const res = await fetch(osrmUrl, {
			signal: controller.signal,
			headers: { 'User-Agent': 'ERP-BCS-Logistics/1.0' }
		});
		clearTimeout(timeoutId);

		if (res.ok) {
			const data = await res.json();
			if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
				const route = data.routes[0];
				const distKm = Math.round((route.distance / 1000) * 10) / 10;
				const durMins = Math.round(route.duration / 60);
				return {
					distance_km: distKm,
					duration_minutes: durMins,
					source: 'osrm'
				};
			}
		}
	} catch (err: any) {
		console.warn('OSRM routing fetch failed or timed out:', err.message);
	}

	// Fallback jika API routing offline:
	// Akumulasikan jarak antar waypoint dengan faktor kelokan jalan tol/arteri Jawa (~1.25)
	let totalHaversine = 0;
	for (let i = 0; i < allPoints.length - 1; i++) {
		totalHaversine += haversineKm(
			allPoints[i].lat, allPoints[i].lng,
			allPoints[i + 1].lat, allPoints[i + 1].lng
		);
	}
	const estimatedDrivingKm = Math.round(totalHaversine * 1.25 * 10) / 10;
	return {
		distance_km: estimatedDrivingKm,
		duration_minutes: Math.round(estimatedDrivingKm / 50 * 60), // estimasi 50 km/jam rata-rata truk
		source: 'fallback'
	};
}
