import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';
import { env } from '$env/dynamic/private';
import { getDrivingDistanceKm, haversineKm } from '$lib/server/routing';

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

		// 1. Ambil data gerbang tol terpilih dan titik GPS waypoints jika ada toll_gate_ids
		const waypoints: { name: string; lat: number; lng: number }[] = [];
		let internal_toll_fee = 0;
		const internal_instructions: string[] = [];

		const numericGateIds = Array.isArray(toll_gate_ids) 
			? toll_gate_ids.map(Number).filter(n => !isNaN(n) && n > 0) 
			: [];

		if (numericGateIds.length > 0) {
			// Query ruas gerbang tol beserta koordinat titik asal & tujuan dari master.m_titik_gerbang_tol
			const gateRows = await sql`
				SELECT 
					gt.id, gt.ruas, gt.asal, gt.tujuan, gt.tarif_gol_1, gt.tarif_gol_2_3, gt.tarif_gol_4_5,
					ta.id as asal_titik_id, ta.nama_gerbang as asal_titik_nama, ta.latitude as asal_lat, ta.longitude as asal_lng,
					tt.id as tujuan_titik_id, tt.nama_gerbang as tujuan_titik_nama, tt.latitude as tujuan_lat, tt.longitude as tujuan_lng
				FROM master.m_gerbang_tol gt
				LEFT JOIN master.m_titik_gerbang_tol ta 
					ON ta.id = gt.gerbang_asal_id 
					OR lower(trim(ta.nama_gerbang)) = lower(trim(gt.asal))
					OR lower(trim(ta.nama_gerbang)) = lower('gerbang tol ' || trim(gt.asal))
					OR lower(trim(ta.nama_gerbang)) = lower('gt ' || trim(gt.asal))
					OR lower(trim(gt.asal)) = lower('gerbang tol ' || trim(ta.nama_gerbang))
				LEFT JOIN master.m_titik_gerbang_tol tt 
					ON tt.id = gt.gerbang_tujuan_id 
					OR lower(trim(tt.nama_gerbang)) = lower(trim(gt.tujuan))
					OR lower(trim(tt.nama_gerbang)) = lower('gerbang tol ' || trim(gt.tujuan))
					OR lower(trim(tt.nama_gerbang)) = lower('gt ' || trim(gt.tujuan))
					OR lower(trim(gt.tujuan)) = lower('gerbang tol ' || trim(tt.nama_gerbang))
				WHERE gt.id = ANY(${numericGateIds})
			`;

			// Validasi kelengkapan koordinat GPS untuk setiap gerbang tol yang dipilih
			const missingGpsGates: string[] = [];
			for (const row of gateRows) {
				if (!row.asal_lat || !row.asal_lng) {
					missingGpsGates.push(row.asal);
				}
				if (!row.tujuan_lat || !row.tujuan_lng) {
					missingGpsGates.push(row.tujuan);
				}
			}

			const uniqueMissing = [...new Set(missingGpsGates.filter(Boolean))];
			if (uniqueMissing.length > 0) {
				return json({
					success: false,
					error: `Titik GPS gerbang tol belum lengkap: [${uniqueMissing.join(', ')}]. Silakan lengkapi titik koordinatnya terlebih dahulu di Master Peta Titik Gerbang Tol.`
				}, { status: 400 });
			}

			// Tentukan kolom tarif sesuai tipe unit kendaraan
			let golCol = 'tarif_gol_2_3';
			if (tipe_unit_id) {
				const unit = await sql`SELECT golongan_tol FROM master.m_tipe_unit WHERE id = ${tipe_unit_id}`;
				if (unit.length > 0) {
					if (unit[0].golongan_tol === '1') golCol = 'tarif_gol_1';
					else if (unit[0].golongan_tol === '4_5') golCol = 'tarif_gol_4_5';
				}
			}

			for (const r of gateRows) {
				const fee = parseFloat(r[golCol]) || 0;
				internal_toll_fee += fee;
				internal_instructions.push(`Tol ${r.ruas}: ${r.asal} → ${r.tujuan} (${golCol})`);
			}

			// Urutkan titik waypoints secara geografis mengikuti arah perjalanan Origin -> Destination
			const dLat = destLat - originLat;
			const dLng = destLng - originLng;
			const den = (dLat * dLat) + (dLng * dLng);

			const rawWaypoints: { name: string; lat: number; lng: number; t: number }[] = [];
			for (const row of gateRows) {
				if (row.asal_lat && row.asal_lng) {
					const lat = parseFloat(row.asal_lat);
					const lng = parseFloat(row.asal_lng);
					const t = den > 0 ? (((lat - originLat) * dLat) + ((lng - originLng) * dLng)) / den : 0;
					rawWaypoints.push({ name: row.asal_titik_nama || row.asal, lat, lng, t });
				}
				if (row.tujuan_lat && row.tujuan_lng) {
					const lat = parseFloat(row.tujuan_lat);
					const lng = parseFloat(row.tujuan_lng);
					const t = den > 0 ? (((lat - originLat) * dLat) + ((lng - originLng) * dLng)) / den : 0;
					rawWaypoints.push({ name: row.tujuan_titik_nama || row.tujuan, lat, lng, t });
				}
			}

			// Sort waypoints searah vektor Origin -> Destination
			rawWaypoints.sort((a, b) => a.t - b.t);

			// Deduplikasi titik waypoints yang terlalu berdekatan (< 150 meter) atau dekat dengan Origin/Destination
			for (const wp of rawWaypoints) {
				if (haversineKm(originLat, originLng, wp.lat, wp.lng) < 0.15) continue;
				if (haversineKm(destLat, destLng, wp.lat, wp.lng) < 0.15) continue;
				if (waypoints.length > 0) {
					const last = waypoints[waypoints.length - 1];
					if (haversineKm(last.lat, last.lng, wp.lat, wp.lng) < 0.15) continue;
				}
				waypoints.push({ name: wp.name, lat: wp.lat, lng: wp.lng });
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
						let toll_fee = internal_toll_fee;

						if (toll_fee === 0 && route.travelAdvisory?.tollInfo?.estimatedPrice) {
							const priceList = route.travelAdvisory.tollInfo.estimatedPrice;
							const idrPrice = priceList.find((p: any) => p.currencyCode === 'IDR');
							if (idrPrice) toll_fee = parseInt(idrPrice.units || "0", 10);
							else if (priceList.length > 0) toll_fee = parseInt(priceList[0].units || "0", 10);
						}

						const toll_instructions: string[] = internal_instructions.length > 0 ? [...internal_instructions] : [];
						if (route.legs && route.legs.length > 0) {
							for (const leg of route.legs) {
								const steps = leg.steps || [];
								for (const step of steps) {
									if (step.navigationInstruction?.instructions) {
										const text = step.navigationInstruction.instructions;
										if (text.toLowerCase().includes('toll') || text.toLowerCase().includes('tol')) {
											toll_instructions.push(text.replace(/<[^>]*>?/gm, ''));
										}
									}
								}
							}
						}

						return json({
							success: true,
							distance_km: parseFloat(distance_km.toFixed(1)),
							toll_fee,
							toll_instructions,
							waypoints,
							source: 'google',
							message: waypoints.length > 0
								? `Jarak berkendara riil (${distance_km.toFixed(1)} KM) berhasil dihitung melintasi ${waypoints.length} gerbang tol via Google Routes API.`
								: `Jarak berkendara riil (${distance_km.toFixed(1)} KM) berhasil dihitung via Google Routes API.`
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
			waypoints.map(w => ({ lat: w.lat, lng: w.lng }))
		);

		return json({
			success: true,
			distance_km: drivingResult.distance_km,
			duration_minutes: drivingResult.duration_minutes,
			toll_fee: internal_toll_fee,
			toll_instructions: internal_instructions,
			waypoints,
			source: drivingResult.source,
			message: waypoints.length > 0
				? `Jarak berkendara riil (${drivingResult.distance_km} KM) berhasil dihitung melintasi ${waypoints.length} gerbang tol.`
				: `Jarak berkendara riil (${drivingResult.distance_km} KM) berhasil dihitung mengikuti jalan tol & jalan raya (bukan garis lurus).`
		});

	} catch (error: any) {
		console.error("API Tolls Error:", error);
		return json({ success: false, error: 'Terjadi kesalahan saat mengkalkulasi jarak rute.' }, { status: 500 });
	}
};
