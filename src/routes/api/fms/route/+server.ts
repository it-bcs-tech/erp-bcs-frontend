import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ url, fetch }) => {
	try {
		// Gunakan FMS_API_URL dari environment (atau localhost jika di lokal)
		const fmsUrl = env.FMS_API_URL || 'http://localhost:8081';
		
		// Teruskan request lengkap dengan query params (?startLat=...&endLng=...)
		const res = await fetch(`${fmsUrl}/api/fms/route${url.search}`);
		
		if (!res.ok) {
			const errorData = await res.json().catch(() => ({}));
			return json({ error: 'FMS API Error', details: errorData }, { status: res.status });
		}
		
		const data = await res.json();
		return json(data);
	} catch (error: any) {
		console.error("Proxy FMS Route Error:", error);
		return json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
	}
};
