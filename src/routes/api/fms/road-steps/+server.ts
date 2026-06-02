import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Proxy ke OSRM public / internal dengan steps=true untuk mendapat nama jalan per segmen
export const GET: RequestHandler = async ({ url, fetch }) => {
	try {
		const lat = url.searchParams.get('lat');
		const lng = url.searchParams.get('lng');
		const destLat = url.searchParams.get('destLat');
		const destLng = url.searchParams.get('destLng');

		if (!lat || !lng || !destLat || !destLng) {
			return json({ error: 'Missing params' }, { status: 400 });
		}

		const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${destLng},${destLat}?steps=true&overview=false`;

		const res = await fetch(osrmUrl, {
			headers: { 'Accept': 'application/json' }
		});

		if (!res.ok) return json({ currentRoad: null, nextRoad: null });

		const data = await res.json();
		const steps: any[] = data?.routes?.[0]?.legs?.[0]?.steps ?? [];

		// Ambil nama jalan dari step yang punya nama (bukan kosong)
		const namedSteps = steps
			.map((s: any) => s.name?.trim())
			.filter((name: string) => name && name.length > 1);

		const currentRoad = namedSteps[0] ?? null;
		const nextRoad = namedSteps[1] ?? null;

		return json({ currentRoad, nextRoad });
	} catch (err) {
		return json({ currentRoad: null, nextRoad: null });
	}
};
