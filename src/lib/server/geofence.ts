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

export async function runGeofenceEngine() {
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
				o.polygon_points as o_polygon,
				d.latitude as d_lat, 
				d.longitude as d_lon, 
				d.polygon_points as d_polygon,
				t.last_lat,
				t.last_lon,
				COALESCE(t.distance_km, 0) as distance_km,
				COALESCE(t.max_speed_kmh, 0) as max_speed_kmh,
				COALESCE(t.avg_speed_kmh, 0) as avg_speed_kmh,
				COALESCE(t.stop_count, 0) as stop_count,
				t.depart_time,
				t.current_stop_lat,
				t.current_stop_lon,
				t.current_stop_start_time
			FROM fleet.trip t
			JOIN fleet.unit u ON u.id = t.unit_id
			LEFT JOIN master.m_customer o ON o.id = t.origin_id
			LEFT JOIN master.m_customer d ON d.id = t.destination_id
			WHERE t.status IN ('DISPATCHED', 'AT_ORIGIN', 'ON_ROUTE', 'AT_DESTINATION', 'RETURNING') 
			  AND t.deleted_at IS NULL
		`;

		if (activeTrips.length === 0) {
			return { success: true, message: 'No active trips to monitor.', logs: [] };
		}

		// 2. Fetch active Rest Areas and Pools
		const restAreas = await sql`SELECT id, nama_rest_area, polygon_points FROM master.m_rest_area WHERE is_active = true`;
		const poolsList = await sql`SELECT id, nama_pool, latitude, longitude, COALESCE(geofence_radius, 500) as radius FROM master.m_pool`;

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
			
			if (v.currentStatusVehicle && v.currentStatusVehicle.driving && v.currentStatusVehicle.driving.start_detail?.lat) {
				// Use current live lat/lon if needed
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
			let gps = gpsMap.get(nopolClean);
			if (!gps) {
				if (trip.last_lat && trip.last_lon) {
					gps = { lat: parseFloat(trip.last_lat), lon: parseFloat(trip.last_lon), speed: 0 };
				} else {
					continue;
				}
			}

			let newDistance = parseFloat(trip.distance_km);
			let newMaxSpeed = parseInt(trip.max_speed_kmh);
			let newAvgSpeed = parseInt(trip.avg_speed_kmh);
			let newStopCount = parseInt(trip.stop_count);
			
			if (['DISPATCHED', 'AT_ORIGIN', 'ON_ROUTE', 'AT_DESTINATION', 'RETURNING'].includes(trip.status)) {
				const currentSpeed = Math.round(gps.speed || 0);

				// 1. Calculate new distance based on trip.last_lat
				if (trip.last_lat && trip.last_lon) {
					const deltaMeters = haversine(parseFloat(trip.last_lat), parseFloat(trip.last_lon), gps.lat, gps.lon);
					if (deltaMeters > 20 && deltaMeters < 5000) { 
						newDistance += (deltaMeters / 1000);
					}
				}
				
				// 2. Smart Logging: Check distance from the last ACTUALLY SAVED point in trip_path
				let shouldLogPath = false;
				const lastPathRes = await sql`SELECT lat, lon FROM fleet.trip_path WHERE trip_id = ${trip.id} ORDER BY id DESC LIMIT 1`;
				
				if (lastPathRes.length > 0) {
					const savedDeltaMeters = haversine(parseFloat(lastPathRes[0].lat), parseFloat(lastPathRes[0].lon), gps.lat, gps.lon);
					if (savedDeltaMeters > 20) {
						shouldLogPath = true;
					}
				} else {
					shouldLogPath = true; // First log
				}
				
				if (currentSpeed > newMaxSpeed) newMaxSpeed = currentSpeed;
				
				if (currentSpeed > 0) {
					newAvgSpeed = newAvgSpeed === 0 ? currentSpeed : Math.round((newAvgSpeed + currentSpeed) / 2);
				} else if (currentSpeed === 0) {
					newStopCount += 1;
				}

				if (shouldLogPath) {
					await sql`
						INSERT INTO fleet.trip_path (trip_id, lat, lon, speed) 
						VALUES (${trip.id}, ${gps.lat}, ${gps.lon}, ${currentSpeed})
					`;
				}
			}
			
			const fuelUsed = newDistance / 3.0; 

			// 3. Ad-hoc Stop Detection Logic
			let newStopLat = trip.current_stop_lat ? parseFloat(trip.current_stop_lat) : null;
			let newStopLon = trip.current_stop_lon ? parseFloat(trip.current_stop_lon) : null;
			let newStopStartTime = trip.current_stop_start_time ? new Date(trip.current_stop_start_time).getTime() : null;

			if (!newStopLat || !newStopLon || !newStopStartTime) {
				newStopLat = gps.lat;
				newStopLon = gps.lon;
				newStopStartTime = Date.now();
			} else {
				const stopDist = haversine(newStopLat, newStopLon, gps.lat, gps.lon);
				if (stopDist > 50) { // Moved > 50m
					const durationMs = Date.now() - newStopStartTime;
					if (durationMs >= 15 * 60000) { // Stopped for >= 15 minutes
						let nearPOI = false;
						if (trip.o_lat && trip.o_lon && haversine(newStopLat, newStopLon, parseFloat(trip.o_lat), parseFloat(trip.o_lon)) < 200) nearPOI = true;
						if (!nearPOI && trip.d_lat && trip.d_lon && haversine(newStopLat, newStopLon, parseFloat(trip.d_lat), parseFloat(trip.d_lon)) < 200) nearPOI = true;
						
						if (!nearPOI) {
							for (const ra of restAreas) {
								if (ra.polygon_points && Array.isArray(ra.polygon_points) && ra.polygon_points.length > 0) {
									const raLat = ra.polygon_points[0].lat;
									const raLon = ra.polygon_points[0].lng || ra.polygon_points[0].lon;
									if (raLat && raLon && haversine(newStopLat, newStopLon, raLat, raLon) < 200) { nearPOI = true; break; }
								}
							}
						}

						if (!nearPOI) {
							for (const pool of poolsList) {
								if (pool.latitude && pool.longitude && haversine(newStopLat, newStopLon, parseFloat(pool.latitude), parseFloat(pool.longitude)) <= parseFloat(pool.radius)) { nearPOI = true; break; }
							}
						}

						if (!nearPOI) {
							const notes = `Ad-hoc Stop. Durasi: ${Math.round(durationMs/60000)} menit`;
							await sql`
								INSERT INTO fleet.trip_checkpoint (trip_id, event, lat, lon, notes, recorded_at)
								VALUES (${trip.id}, 'STOP', ${newStopLat}, ${newStopLon}, ${notes}, to_timestamp(${newStopStartTime}/1000.0))
							`;
							logs.push(`[STOP DETECTED] Truk ${trip.nomor_unit} diam >15m. Logged STOP.`);
						}
					}
					
					// Reset tracker to new location
					newStopLat = gps.lat;
					newStopLon = gps.lon;
					newStopStartTime = Date.now();
				}
			}
			
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
					fuel_used_l = ${fuelUsed},
					current_stop_lat = ${newStopLat},
					current_stop_lon = ${newStopLon},
					current_stop_start_time = to_timestamp(${newStopStartTime}/1000.0)
				WHERE id = ${trip.id}
			`;
			updatedCount++;

			// Rule A: Arriving at Origin -> AT_ORIGIN
			if (trip.status === 'DISPATCHED' && trip.o_lat && trip.o_lon) {
				let isInside = false;
				let distance = 0;
				if (trip.o_polygon && trip.o_polygon.length > 2) {
					isInside = pointInPolygon({lat: gps.lat, lon: gps.lon}, trip.o_polygon);
				} else {
					distance = haversine(gps.lat, gps.lon, parseFloat(trip.o_lat), parseFloat(trip.o_lon));
					isInside = distance <= trip.o_rad;
				}

				if (isInside) {
					await sql`UPDATE fleet.trip SET status = 'AT_ORIGIN' WHERE id = ${trip.id}`;
					await sql`INSERT INTO fleet.trip_status_log (trip_id, status) VALUES (${trip.id}, 'AT_ORIGIN')`;
					await sql`INSERT INTO fleet.trip_checkpoint (trip_id, event, lat, lon, notes) VALUES (${trip.id}, 'AT_ORIGIN', ${gps.lat}, ${gps.lon}, 'Auto-pilot: Tiba di Origin')`;
					logs.push(`[GEOFENCE-ARRIVE-ORIGIN] Truk ${trip.nomor_unit} tiba di Origin. Status -> AT_ORIGIN`);
					updatedCount++;
				}
			}

			// Rule B: Leaving Origin -> ON_ROUTE
			if (trip.status === 'AT_ORIGIN' && trip.o_lat && trip.o_lon) {
				let isOutside = false;
				let distance = 0;
				if (trip.o_polygon && trip.o_polygon.length > 2) {
					isOutside = !pointInPolygon({lat: gps.lat, lon: gps.lon}, trip.o_polygon);
				} else {
					distance = haversine(gps.lat, gps.lon, parseFloat(trip.o_lat), parseFloat(trip.o_lon));
					isOutside = distance > trip.o_rad;
				}

				if (isOutside) {
					await sql`UPDATE fleet.trip SET status = 'ON_ROUTE', depart_time = NOW() WHERE id = ${trip.id}`;
					await sql`INSERT INTO fleet.trip_status_log (trip_id, status) VALUES (${trip.id}, 'ON_ROUTE')`;
					await sql`INSERT INTO fleet.trip_checkpoint (trip_id, event, lat, lon, notes) VALUES (${trip.id}, 'ON_ROUTE', ${gps.lat}, ${gps.lon}, 'Auto-pilot: Berangkat dari Origin')`;
					logs.push(`[GEOFENCE-LEAVE] Truk ${trip.nomor_unit} telah keluar geofence origin. Status -> ON_ROUTE`);
					updatedCount++;
				}
			}

			// Rule C: Rest Area Monitoring
			if (restAreas.length > 0) {
				for (const ra of restAreas) {
					const inPolygon = pointInPolygon({lat: gps.lat, lon: gps.lon}, ra.polygon_points);
					const activeLog = await sql`
						SELECT id, enter_time 
						FROM fleet.trip_rest_area_log 
						WHERE trip_id = ${trip.id} AND rest_area_id = ${ra.id} AND exit_time IS NULL
						LIMIT 1
					`;

					if (inPolygon) {
						if (activeLog.length === 0 && gps.speed < 10) {
							await sql`
								INSERT INTO fleet.trip_rest_area_log (trip_id, rest_area_id, enter_time) 
								VALUES (${trip.id}, ${ra.id}, NOW())
							`;
							logs.push(`[REST-AREA] Truk ${trip.nomor_unit} memasuki Rest Area ${ra.nama_rest_area} (Speed: ${gps.speed}km/h).`);
						}
					} else {
						if (activeLog.length > 0) {
							const logId = activeLog[0].id;
							const exitRes = await sql`
								UPDATE fleet.trip_rest_area_log 
								SET exit_time = NOW(),
									duration_minutes = EXTRACT(EPOCH FROM (NOW() - enter_time)) / 60
								WHERE id = ${logId}
								RETURNING duration_minutes
							`;
							
							const duration = exitRes[0]?.duration_minutes || 0;
							
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
				let isInside = false;
				let distance = 0;
				if (trip.d_polygon && trip.d_polygon.length > 2) {
					isInside = pointInPolygon({lat: gps.lat, lon: gps.lon}, trip.d_polygon);
				} else {
					distance = haversine(gps.lat, gps.lon, parseFloat(trip.d_lat), parseFloat(trip.d_lon));
					isInside = distance <= trip.d_rad;
				}

				if (isInside) {
					await sql`UPDATE fleet.trip SET status = 'AT_DESTINATION', arrive_time = NOW() WHERE id = ${trip.id}`;
					await sql`INSERT INTO fleet.trip_status_log (trip_id, status) VALUES (${trip.id}, 'AT_DESTINATION')`;
					await sql`INSERT INTO fleet.trip_checkpoint (trip_id, event, lat, lon, notes) VALUES (${trip.id}, 'AT_DESTINATION', ${gps.lat}, ${gps.lon}, 'Auto-pilot: Tiba di Destination')`;
					logs.push(`[GEOFENCE-ARRIVE] Truk ${trip.nomor_unit} telah masuk geofence tujuan. Status -> AT_DESTINATION`);
					updatedCount++;
					continue;
				}

				if (trip.o_lat && trip.o_lon) {
					try {
						const routeRes = await fetch(`${env.FMS_API_URL || 'http://localhost:8081'}/api/fms/route?startLat=${trip.o_lat}&startLng=${trip.o_lon}&endLat=${trip.d_lat}&endLng=${trip.d_lon}`);
						if (routeRes.ok) {
							const routeData = await routeRes.json();
							if (routeData.coordinates && routeData.coordinates.length > 0) {
								let minDist = Infinity;
								for (const coord of routeData.coordinates) {
									const d = haversine(gps.lat, gps.lon, coord[0], coord[1]);
									if (d < minDist) minDist = d;
								}
								
								if (minDist > 500) {
									const lastChk = await sql`SELECT notes FROM fleet.trip_checkpoint WHERE trip_id = ${trip.id} ORDER BY id DESC LIMIT 1`;
									const isAlreadyDeviated = lastChk.length > 0 && (lastChk[0].notes.includes('ANOMALI') || lastChk[0].notes.includes('shortcut'));
									
									if (!isAlreadyDeviated) {
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
											// Ignore
										}

										await sql`INSERT INTO fleet.trip_checkpoint (trip_id, event, lat, lon, notes, is_anomaly) VALUES (${trip.id}, ${aiStatus}, ${gps.lat}, ${gps.lon}, ${aiNotes}, true)`;
										logs.push(`[ANOMALY] Truk ${trip.nomor_unit} terdeteksi keluar dari rute resmi (${Math.round(minDist)}m). Event dicatat.`);
									}
								}
							}
						}
					} catch (err) {
						console.error("Route check error:", err);
					}
				}
			}

			// Rule D2: Leaving Destination -> RETURNING
			if (trip.status === 'AT_DESTINATION' && trip.d_lat && trip.d_lon) {
				let isOutside = false;
				let distance = 0;
				if (trip.d_polygon && trip.d_polygon.length > 2) {
					isOutside = !pointInPolygon({lat: gps.lat, lon: gps.lon}, trip.d_polygon);
				} else {
					distance = haversine(gps.lat, gps.lon, parseFloat(trip.d_lat), parseFloat(trip.d_lon));
					isOutside = distance > trip.d_rad;
				}

				if (isOutside) {
					await sql`UPDATE fleet.trip SET status = 'RETURNING' WHERE id = ${trip.id}`;
					await sql`INSERT INTO fleet.trip_status_log (trip_id, status) VALUES (${trip.id}, 'RETURNING')`;
					await sql`INSERT INTO fleet.trip_checkpoint (trip_id, event, lat, lon, notes) VALUES (${trip.id}, 'RETURNING', ${gps.lat}, ${gps.lon}, 'Auto-pilot: Keluar dari Destination (Returning)')`;
					logs.push(`[GEOFENCE-LEAVE] Truk ${trip.nomor_unit} telah keluar dari tujuan. Status -> RETURNING`);
					updatedCount++;
					continue;
				}
			}

			// Rule E: Arriving at Pool -> COMPLETED & CLOSING
			if (trip.status === 'RETURNING') {
				let arrivedAtDestinationPool = false;
				let minDistance = Infinity;
				let matchedPoolName = '';

				for (const pool of poolsList) {
					if (pool.latitude && pool.longitude) {
						const dist = haversine(gps.lat, gps.lon, parseFloat(pool.latitude), parseFloat(pool.longitude));
						if (dist <= pool.radius) {
							// Apakah ini pool tujuan yang sebenarnya?
							if (String(pool.id) === String(trip.pool_tujuan_id)) {
								arrivedAtDestinationPool = true;
								minDistance = dist;
								matchedPoolName = pool.nama_pool;
								break;
							} else {
								// Mampir di pool lain (Transit)
								logs.push(`[TRANSIT] Truk ${trip.nomor_unit} terdeteksi di dalam ${pool.nama_pool}. (Bukan Pool Tujuan)`);
							}
						}
					}
				}

				if (arrivedAtDestinationPool) {
					// Update Trip Status
					await sql`UPDATE fleet.trip SET status = 'COMPLETED', arrive_time = NOW() WHERE id = ${trip.id}`;
					await sql`INSERT INTO fleet.trip_status_log (trip_id, status) VALUES (${trip.id}, 'COMPLETED')`;
					await sql`INSERT INTO fleet.trip_checkpoint (trip_id, event, lat, lon, notes) VALUES (${trip.id}, 'COMPLETED', ${gps.lat}, ${gps.lon}, 'Auto-pilot: Tiba di Pool Tujuan (${matchedPoolName})')`;
					
					// Auto Update Sales Order to CLOSING
					try {
						await sql`
							UPDATE marketing.sales_order 
							SET status = 'CLOSING'
							WHERE assigned_unit_id = ${trip.unit_id}
							  AND status = 'DISPATCHED'
						`;
					} catch (err) {
						console.error("Auto closing update error:", err);
					}

					logs.push(`[GEOFENCE-ARRIVE-POOL] Truk ${trip.nomor_unit} tiba di Pool Tujuan (${matchedPoolName}, ${minDistance.toFixed(0)}m). Status -> COMPLETED & CLOSING`);
					updatedCount++;
				}
			}

		}

		return { success: true, message: `Geofence check completed. Updated ${updatedCount} trips.`, logs };
	} catch (error: any) {
		console.error("Geofence Engine Error:", error);
		throw error;
	}
}
