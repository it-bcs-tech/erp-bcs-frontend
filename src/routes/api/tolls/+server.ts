import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { origin_id, destination_id } = await request.json();

		if (!origin_id || !destination_id) {
			return json({ success: false, error: 'Origin dan Destination harus dipilih.' }, { status: 400 });
		}

		// Ambil koordinat dari database
		const originData = await sql`SELECT latitude, longitude FROM master.m_customer WHERE id = ${origin_id}`;
		const destData = await sql`SELECT latitude, longitude FROM master.m_customer WHERE id = ${destination_id}`;

		if (originData.length === 0 || destData.length === 0) {
			return json({ success: false, error: 'Origin atau Destination tidak ditemukan di database.' }, { status: 404 });
		}

		const originLat = parseFloat(originData[0].latitude);
		const originLng = parseFloat(originData[0].longitude);
		const destLat = parseFloat(destData[0].latitude);
		const destLng = parseFloat(destData[0].longitude);

		if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
			return json({ success: false, error: 'Koordinat lokasi (Latitude/Longitude) belum lengkap.' }, { status: 400 });
		}

		const apiKey = env.GOOGLE_MAPS_API_KEY;
		if (!apiKey) {
			console.warn("GOOGLE_MAPS_API_KEY is not set in .env. Returning Mock Data.");
			return json({
				success: true,
				distance_km: 152.4,
				toll_fee: 145000,
				mock: true,
				message: "Google Maps API Key tidak ditemukan. Menampilkan data simulasi."
			});
		}

		// Memanggil Google Maps Routes API v2
		const requestBody = {
			origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
			destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
			travelMode: "DRIVE",
			routingPreference: "TRAFFIC_AWARE",
			computeAlternativeRoutes: false,
			routeModifiers: { avoidTolls: false },
			extraComputations: ["TOLLS"]
		};

		const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask': 'routes.distanceMeters,routes.travelAdvisory.tollInfo,routes.legs.steps.navigationInstruction'
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error("Google Routes API Error:", errorData);
			return json({ success: false, error: 'Gagal terhubung ke Google Maps API.' }, { status: 502 });
		}

		const responseData = await response.json();
		
		if (!responseData.routes || responseData.routes.length === 0) {
			return json({ success: false, error: 'Rute tidak ditemukan oleh Google Maps.' }, { status: 404 });
		}

		const route = responseData.routes[0];
		const distance_km = route.distanceMeters ? route.distanceMeters / 1000 : 0;
		
		let toll_fee = 0;
		if (route.travelAdvisory && route.travelAdvisory.tollInfo && route.travelAdvisory.tollInfo.estimatedPrice) {
			const priceList = route.travelAdvisory.tollInfo.estimatedPrice;
			const idrPrice = priceList.find((p: any) => p.currencyCode === 'IDR');
			if (idrPrice) {
				toll_fee = parseInt(idrPrice.units || "0", 10);
			} else if (priceList.length > 0) {
				toll_fee = parseInt(priceList[0].units || "0", 10); 
			}
		}

		// Parse Toll Instructions to help internal filtering
		let toll_instructions: string[] = [];
		if (route.legs && route.legs.length > 0) {
			const steps = route.legs[0].steps || [];
			for (const step of steps) {
				if (step.navigationInstruction && step.navigationInstruction.instructions) {
					const text = step.navigationInstruction.instructions;
					// Text from Google Maps often contains <b> tags and mentions "Toll" or "Tol"
					if (text.toLowerCase().includes('toll') || text.toLowerCase().includes('tol')) {
						// Clean HTML tags
						const cleanText = text.replace(/<[^>]*>?/gm, '');
						toll_instructions.push(cleanText);
					}
				}
			}
		}

		let message = "Kalkulasi jarak dan tol berhasil ditarik dari Google Maps.";
		if (toll_fee === 0) {
			message = "Jarak berhasil dihitung. Namun, Google Maps tidak menyediakan data Tarif Tol untuk rute ini, silakan isi manual.";
		}

		return json({
			success: true,
			distance_km: parseFloat(distance_km.toFixed(1)),
			toll_fee: toll_fee,
			toll_instructions: toll_instructions,
			mock: false,
			message: message
		});

	} catch (error: any) {
		console.error("API Tolls Error:", error);
		return json({ success: false, error: 'Terjadi kesalahan pada server.' }, { status: 500 });
	}
};
