import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371e3; // meters
	const phi1 = lat1 * Math.PI / 180;
	const phi2 = lat2 * Math.PI / 180;
	const deltaPhi = (lat2 - lat1) * Math.PI / 180;
	const deltaLambda = (lon2 - lon1) * Math.PI / 180;

	const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
		Math.cos(phi1) * Math.cos(phi2) *
		Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return R * c; // in meters
}

function pointInPolygon(point: {lat: number, lon: number}, polygon: {lat: number, lng: number}[]): boolean {
	let x = point.lat, y = point.lon;
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		let xi = polygon[i].lat, yi = polygon[i].lng;
		let xj = polygon[j].lat, yj = polygon[j].lng;
		
		let intersect = ((yi > y) !== (yj > y))
			&& (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
		if (intersect) inside = !inside;
	}
	return inside;
}

export const GET: RequestHandler = async ({ fetch }) => {
	try {
		// 1. Fetch active trips that are subject to geofence auto-pilot
		const activeTrips = await sql`
			SELECT 
				t.id, 
				t.unit_id, 
				t.status, 
				u.nomor_unit, 
				o.latitude as o_lat, 
				o.longitude as o_lon, 
				COALESCE(o.geofence_radius, 2000) as o_rad, 
				d.latitude as d_lat, 
				d.longitude as d_lon, 
				COALESCE(d.geofence_radius, 2000) as d_rad,
				t.last_lat,
				t.last_lon,
				COALESCE(t.distance_km, 0) as distance_km,
				COALESCE(t.max_speed_kmh, 0) as max_speed_kmh,
				COALESCE(t.avg_speed_kmh, 0) as avg_speed_kmh,
				COALESCE(t.stop_count, 0) as stop_count,
				t.depart_time
			FROM fleet.trip t
			JOIN fleet.unit u ON u.id = t.unit_id
			LEFT JOIN master.m_customer o ON o.id = t.origin_id
			LEFT JOIN master.m_customer d ON d.id = t.destination_id
			WHERE t.status IN ('DISPATCHED', 'AT_ORIGIN', 'ON_ROUTE') 
			  AND t.deleted_at IS NULL
		`;

		if (activeTrips.length === 0) {
			return json({ success: true, message: 'No active trips to monitor.', logs: [] });
		}

		// 2. Fetch active Rest Areas
		const restAreas = await sql`SELECT id, nama_rest_area, polygon_points FROM master.m_rest_area WHERE is_active = true`;

		// 3. Fetch latest GPS coordinates from EasyGo API wrapper
		const res = await fetch(`${env.FMS_API_URL || 'http://localhost:8081'}/api/fms/live-map`);
		if (!res.ok) throw new Error('Failed to fetch EasyGo GPS data');
		const gpsData = await res.json();
		const vehicles = gpsData.records || [];

		// Create lookup dictionary for fast access
		const gpsMap = new Map();
		for (const v of vehicles) {
			const nopol = (v.nopol || v.vehicle_id || '').replace(/\s+/g, '').toUpperCase();
			let lat = v.lat || 0;
			let lon = v.lon || 0;
			let speed = v.speed || 0;
			
			// Fallback parsing if currentStatusVehicle has more accurate coords
			if (v.currentStatusVehicle) {
				if (v.currentStatusVehicle.driving && v.currentStatusVehicle.driving.start_detail?.lat) {
					// Use current live lat/lon
				}
			}
			if (lat !== 0 && lon !== 0) {
				gpsMap.set(nopol, { lat, lon, speed });
			}
		}

		// 3. Evaluate Geofence Rules
		const logs: string[] = [];
		let updatedCount = 0;

		for (const trip of activeTrips) {
			const nopolClean = trip.nomor_unit.replace(/\s+/g, '').toUpperCase();
			const gps = gpsMap.get(nopolClean);
			if (!gps) continue; // No GPS signal for this truck

			// Update last_seen and calculate metrics if ON_ROUTE
			let newDistance = parseFloat(trip.distance_km);
			let newMaxSpeed = parseInt(trip.max_speed_kmh);
			let newAvgSpeed = parseInt(trip.avg_speed_kmh);
			let newStopCount = parseInt(trip.stop_count);
			
			if (['DISPATCHED', 'AT_ORIGIN', 'ON_ROUTE'].includes(trip.status)) {
				const currentSpeed = Math.round(gps.speed || 0);
				let shouldLogPath = false;

				if (trip.last_lat && trip.last_lon) {
					const deltaMeters = haversine(parseFloat(trip.last_lat), parseFloat(trip.last_lon), gps.lat, gps.lon);
					if (deltaMeters > 20 && deltaMeters < 5000) { // filter out GPS jumps
						newDistance += (deltaMeters / 1000);
						shouldLogPath = true;
					}
				} else {
					shouldLogPath = true; // first ping
				}
				
				if (currentSpeed > newMaxSpeed) newMaxSpeed = currentSpeed;
				
				// Very basic cumulative average
				if (currentSpeed > 0) {
					newAvgSpeed = newAvgSpeed === 0 ? currentSpeed : Math.round((newAvgSpeed + currentSpeed) / 2);
				} else if (currentSpeed === 0) {
					newStopCount += 1;
				}

				// Log path for playback
				if (shouldLogPath || currentSpeed > 0) {
					await sql`
						INSERT INTO fleet.trip_path (trip_id, lat, lon, speed) 
						VALUES (${trip.id}, ${gps.lat}, ${gps.lon}, ${currentSpeed})
					`;
				}
			}
			
			const fuelUsed = newDistance / 3.0; // 1:3 ratio
			
			await sql`
				UPDATE fleet.trip 
				SET 
					last_lat = ${gps.lat}, 
					last_lon = ${gps.lon}, 
					last_seen = NOW(),
					distance_km = ${newDistance},
					max_speed_kmh = ${newMaxSpeed},
					avg_speed_kmh = ${newAvgSpeed},
					stop_count = ${newStopCount},
					fuel_used_l = ${fuelUsed}
				WHERE id = ${trip.id}
			`;
			updatedCount++;

			// Rule A: Arriving at Origin -> AT_ORIGIN
			if (trip.status === 'DISPATCHED' && trip.o_lat && trip.o_lon) {
				const distance = haversine(gps.lat, gps.lon, parseFloat(trip.o_lat), parseFloat(trip.o_lon));
				if (distance <= trip.o_rad) {
					await sql`UPDATE fleet.trip SET status = 'AT_ORIGIN' WHERE id = ${trip.id}`;
					await sql`INSERT INTO fleet.trip_checkpoint (trip_id, event, lat, lon, notes) VALUES (${trip.id}, 'AT_ORIGIN', ${gps.lat}, ${gps.lon}, 'Auto-pilot: Tiba di Origin')`;
					logs.push(`[GEOFENCE-ARRIVE-ORIGIN] Truk ${trip.nomor_unit} tiba di Origin (${distance.toFixed(0)}m). Status -> AT_ORIGIN`);
					updatedCount++;
				}
			}

			// Rule B: Leaving Origin -> ON_ROUTE
			if (trip.status === 'AT_ORIGIN' && trip.o_lat && trip.o_lon) {
				const distance = haversine(gps.lat, gps.lon, parseFloat(trip.o_lat), parseFloat(trip.o_lon));
				if (distance > trip.o_rad) {
					await sql`UPDATE fleet.trip SET status = 'ON_ROUTE', depart_time = NOW() WHERE id = ${trip.id}`;
					await sql`INSERT INTO fleet.trip_checkpoint (trip_id, event, lat, lon, notes) VALUES (${trip.id}, 'ON_ROUTE', ${gps.lat}, ${gps.lon}, 'Auto-pilot: Berangkat dari Origin')`;
					logs.push(`[GEOFENCE-LEAVE] Truk ${trip.nomor_unit} telah keluar radius origin (${distance.toFixed(0)}m). Status -> ON_ROUTE`);
					updatedCount++;
				}
			}

			// Rule C: Rest Area Monitoring (Polygon & Speed & Dwell Time)
			if (restAreas.length > 0) {
				for (const ra of restAreas) {
					// Check Polygon
					const inPolygon = pointInPolygon({lat: gps.lat, lon: gps.lon}, ra.polygon_points);
					
					// Check if there is an active log for this rest area
					const activeLog = await sql`
						SELECT id, enter_time 
						FROM fleet.trip_rest_area_log 
						WHERE trip_id = ${trip.id} AND rest_area_id = ${ra.id} AND exit_time IS NULL
						LIMIT 1
					`;

					if (inPolygon) {
						// Inside box
						if (activeLog.length === 0 && currentSpeed < 10) {
							// Just entered and slowed down -> log it
							await sql`
								INSERT INTO fleet.trip_rest_area_log (trip_id, rest_area_id, enter_time) 
								VALUES (${trip.id}, ${ra.id}, NOW())
							`;
							logs.push(`[REST-AREA] Truk ${trip.nomor_unit} memasuki Rest Area ${ra.nama_rest_area} (Speed: ${currentSpeed}km/h).`);
						}
					} else {
						// Outside box
						if (activeLog.length > 0) {
							// Just left -> set exit_time and duration
							const logId = activeLog[0].id;
							
							const exitRes = await sql`
								UPDATE fleet.trip_rest_area_log 
								SET exit_time = NOW(),
									duration_minutes = EXTRACT(EPOCH FROM (NOW() - enter_time)) / 60
								WHERE id = ${logId}
								RETURNING duration_minutes
							`;
							
							const duration = exitRes[0]?.duration_minutes || 0;
							
							// If duration < 3 mins, delete it (fly-by or traffic jam)
							if (duration < 3) {
								await sql`DELETE FROM fleet.trip_rest_area_log WHERE id = ${logId}`;
								logs.push(`[REST-AREA-FLYBY] Truk ${trip.nomor_unit} keluar dari Rest Area ${ra.nama_rest_area}. Durasi: ${Math.round(duration)}m (<3m, Dihapus).`);
							} else {
								logs.push(`[REST-AREA-STOP] Truk ${trip.nomor_unit} selesai istirahat di Rest Area ${ra.nama_rest_area}. Durasi: ${Math.round(duration)}m.`);
							}
						}
					}
				}
			}

			// Rule D: Arriving at Destination -> AT_DESTINATION
			if (trip.status === 'ON_ROUTE' && trip.d_lat && trip.d_lon) {
				const distance = haversine(gps.lat, gps.lon, parseFloat(trip.d_lat), parseFloat(trip.d_lon));
				if (distance <= trip.d_rad) {
					await sql`UPDATE fleet.trip SET status = 'AT_DESTINATION', arrive_time = NOW() WHERE id = ${trip.id}`;
					await sql`INSERT INTO fleet.trip_checkpoint (trip_id, event, lat, lon, notes) VALUES (${trip.id}, 'AT_DESTINATION', ${gps.lat}, ${gps.lon}, 'Auto-pilot: Tiba di Destination')`;
					logs.push(`[GEOFENCE-ARRIVE] Truk ${trip.nomor_unit} telah masuk radius tujuan (${distance.toFixed(0)}m). Status -> AT_DESTINATION`);
					updatedCount++;
					continue;
				}

				// Rule D: Route Deviation Alert (only if ON_ROUTE and hasn't arrived)
				if (trip.o_lat && trip.o_lon) {
					try {
						const routeRes = await fetch(`${env.FMS_API_URL || 'http://localhost:8081'}/api/fms/route?startLat=${trip.o_lat}&startLng=${trip.o_lon}&endLat=${trip.d_lat}&endLng=${trip.d_lon}`);
						if (routeRes.ok) {
							const routeData = await routeRes.json();
							if (routeData.coordinates && routeData.coordinates.length > 0) {
								let minDist = Infinity;
								for (const coord of routeData.coordinates) {
									// routeData.coordinates is [lat, lng]
									const d = haversine(gps.lat, gps.lon, coord[0], coord[1]);
									if (d < minDist) minDist = d;
								}
								
								// If deviated by more than 500m
								if (minDist > 500) {
									// Check if last checkpoint was already an anomaly to avoid spam
									const lastChk = await sql`SELECT notes FROM fleet.trip_checkpoint WHERE trip_id = ${trip.id} ORDER BY id DESC LIMIT 1`;
									const isAlreadyDeviated = lastChk.length > 0 && (lastChk[0].notes.includes('ANOMALI') || lastChk[0].notes.includes('shortcut'));
									
									if (!isAlreadyDeviated) {
										// Call AI Bridge for Intelligent Analysis
										let aiStatus = 'INCIDENT';
										let aiNotes = 'ANOMALI: KELUAR JALUR';
										
										try {
											const aiRes = await fetch(`${env.AI_BRIDGE_URL || 'http://localhost:8000'}/fms/anomaly-analysis`, {
												method: 'POST',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify({
													trip_id: trip.id,
													vehicle_plate: trip.nomor_unit,
													current_lat: gps.lat,
													current_lon: gps.lon,
													destination_lat: parseFloat(trip.d_lat),
													destination_lon: parseFloat(trip.d_lon)
												})
											});
											
											if (aiRes.ok) {
												const aiData = await aiRes.json();
												if (aiData.status) aiStatus = aiData.status;
												if (aiData.notes) aiNotes = aiData.notes;
											}
										} catch (err) {
											console.error("Failed to reach AI Bridge for Anomaly Analysis:", err);
										}

										await sql`INSERT INTO fleet.trip_checkpoint (trip_id, event, lat, lon, notes) VALUES (${trip.id}, ${aiStatus}, ${gps.lat}, ${gps.lon}, ${aiNotes})`;
										logs.push(`[GEOFENCE-DEVIATION-AI] Truk ${trip.nomor_unit} keluar jalur sejauh ${(minDist/1000).toFixed(1)}km! AI: ${aiStatus}`);
										updatedCount++;
									}
								} else {
									// If they returned to route, and last was anomaly, we could log a recovery, but optional.
								}
							}
						}
					} catch (e) {
						// silently ignore route fetch errors to not break cron
					}
				}
			}
		}

		return json({ 
			success: true, 
			message: `Geofence check completed. Updated ${updatedCount} trips.`,
			logs
		});

	} catch (error: any) {
		console.error("Geofence Cron Error:", error);
		return json({ success: false, error: error.message }, { status: 500 });
	}
};
