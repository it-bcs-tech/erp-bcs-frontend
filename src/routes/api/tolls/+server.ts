import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';
import { env } from '$env/dynamic/private';
import { getDrivingDistanceKm } from '$lib/server/routing';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { origin_id, destination_id, toll_gate_ids, tipe_unit_id } = await request.json();

		if (!origin_id || !destination_id) {
			return json({ success: false, error: 'Origin dan Destination harus dipilih.' }, { status: 400 });
		}

		// Ambil koordinat dari database master.m_customer
		const originData = await sql`SELECT id, nama_kustomer, latitude, longitude FROM master.m_customer WHERE id = ${origin_id}`;
		const destData = await sql`SELECT id, nama_kustomer, latitude, longitude FROM master.m_customer WHERE id = ${destination_id}`;

		if (originData.length === 0 || destData.length === 0) {
			return json({ success: false, error: 'Origin atau Destination tidak ditemukan di database.' }, { status: 404 });
		}

		const originLat = parseFloat(originData[0].latitude);
		const originLng = parseFloat(originData[0].longitude);
		const destLat = parseFloat(destData[0].latitude);
		const destLng = parseFloat(destData[0].longitude);

		if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
			return json({ success: false, error: 'Koordinat lokasi (Latitude/Longitude) belum lengkap di Master Customer.' }, { status: 400 });
		}

		// Ambil koordinat waypoints jika ada toll_gate_ids (master.m_titik_gerbang_tol)
		const waypoints: { lat: number; lng: number }[] = [];
		if (Array.isArray(toll_gate_ids) && toll_gate_ids.length > 0) {
			const gates = await sql`
				SELECT id, nama_gerbang, latitude, longitude 
				FROM master.m_titik_gerbang_tol 
				WHERE id = ANY(${toll_gate_ids})
			`;
			for (const g of gates) {
				const lat = parseFloat(g.latitude);
				const lng = parseFloat(g.longitude);
				if (!isNaN(lat) && !isNaN(lng)) {
					waypoints.push({ lat, lng });
				}
			}
		}

		// Coba Google Routes API jika API KEY tersedia
		const apiKey = env.GOOGLE_MAPS_API_KEY;
		if (apiKey) {
			try {
				const requestBody: any = {
					origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
					destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
					travelMode: "DRIVE",
					routingPreference: "TRAFFIC_AWARE",
					computeAlternativeRoutes: false,
					routeModifiers: { avoidTolls: false },
					extraComputations: ["TOLLS"]
				};

				if (waypoints.length > 0) {
					requestBody.intermediates = waypoints.map(w => ({
						location: { latLng: { latitude: w.lat, longitude: w.lng } }
					}));
				}

				const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-Goog-Api-Key': apiKey,
						'X-Goog-FieldMask': 'routes.distanceMeters,routes.travelAdvisory.tollInfo,routes.legs.steps.navigationInstruction'
					},
					body: JSON.stringify(requestBody)
				});

				if (response.ok) {
					const responseData = await response.json();
					if (responseData.routes && responseData.routes.length > 0) {
						const route = responseData.routes[0];
						const distance_km = route.distanceMeters ? route.distanceMeters / 1000 : 0;
						let toll_fee = 0;
						if (route.travelAdvisory?.tollInfo?.estimatedPrice) {
							const priceList = route.travelAdvisory.tollInfo.estimatedPrice;
							const idrPrice = priceList.find((p: any) => p.currencyCode === 'IDR');
							if (idrPrice) toll_fee = parseInt(idrPrice.units || "0", 10);
							else if (priceList.length > 0) toll_fee = parseInt(priceList[0].units || "0", 10);
						}

						const toll_instructions: string[] = [];
						if (route.legs && route.legs.length > 0) {
							const steps = route.legs[0].steps || [];
							for (const step of steps) {
								if (step.navigationInstruction?.instructions) {
									const text = step.navigationInstruction.instructions;
									if (text.toLowerCase().includes('toll') || text.toLowerCase().includes('tol')) {
										toll_instructions.push(text.replace(/<[^>]*>?/gm, ''));
									}
								}
							}
						}

						return json({
							success: true,
							distance_km: parseFloat(distance_km.toFixed(1)),
							toll_fee,
							toll_instructions,
							source: 'google',
							message: "Jarak berkendara riil dan estimasi tol berhasil dihitung via Google Routes API."
						});
					}
				}
			} catch (err) {
				console.warn('Google Routes API failed, falling back to OSRM driving engine:', err);
			}
		}

		// Kalkulasi Driving Distance via OSRM (mengikuti rute jalan tol & arteri riil)
		const drivingResult = await getDrivingDistanceKm(
			{ lat: originLat, lng: originLng },
			{ lat: destLat, lng: destLng },
			waypoints
		);

		// Rekomendasi tarif tol internal dari master.m_gerbang_tol jika ada
		let toll_fee = 0;
		const instructions: string[] = [];

		if (Array.isArray(toll_gate_ids) && toll_gate_ids.length > 0) {
			let golCol = 'tarif_gol_2_3';
			if (tipe_unit_id) {
				const unit = await sql`SELECT golongan_tol FROM master.m_tipe_unit WHERE id = ${tipe_unit_id}`;
				if (unit.length > 0) {
					if (unit[0].golongan_tol === '1') golCol = 'tarif_gol_1';
					else if (unit[0].golongan_tol === '4_5') golCol = 'tarif_gol_4_5';
				}
			}

			const tollRates = await sql`
				SELECT id, ruas, asal, tujuan, tarif_gol_1, tarif_gol_2_3, tarif_gol_4_5
				FROM master.m_gerbang_tol
				WHERE gerbang_asal_id = ANY(${toll_gate_ids}) 
				   OR gerbang_tujuan_id = ANY(${toll_gate_ids})
			`;

			for (const r of tollRates) {
				const fee = parseFloat(r[golCol]) || 0;
				toll_fee += fee;
				instructions.push(`Tol ${r.ruas}: ${r.asal} → ${r.tujuan} (${golCol})`);
			}
		}

		return json({
			success: true,
			distance_km: drivingResult.distance_km,
			duration_minutes: drivingResult.duration_minutes,
			toll_fee,
			toll_instructions: instructions,
			source: drivingResult.source,
			message: `Jarak berkendara riil (${drivingResult.distance_km} KM) berhasil dihitung mengikuti jalan tol & jalan raya (bukan garis lurus).`
		});

	} catch (error: any) {
		console.error("API Tolls Error:", error);
		return json({ success: false, error: 'Terjadi kesalahan saat mengkalkulasi jarak rute.' }, { status: 500 });
	}
};
