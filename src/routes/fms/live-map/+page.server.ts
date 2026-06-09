import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		// 1. Fetch active trips from PostgreSQL to enrich the GPS data
		const activeTrips = await sql<{
			nomor_unit: string;
			no_surat_tugas: string;
			driver_nama: string;
			origin: string;
			destination: string;
			cargo: string;
			customer: string;
			status: string;
		}[]>`
			SELECT 
				t.id,
				u.nomor_unit, 
				t.no_surat_tugas, 
				COALESCE(k.nama_karyawan, t.driver_nama) as driver_nama,
				t.origin, 
				t.destination, 
				t.cargo,
				t.customer,
				t.status,
				c_ori.latitude as origin_lat,
				c_ori.longitude as origin_lng,
				c_dest.latitude as dest_lat,
				c_dest.longitude as dest_lng
			FROM fleet.trip t
			JOIN fleet.unit u ON u.id = t.unit_id
			LEFT JOIN master.m_drivers dr ON dr.id = t.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = dr.karyawan_id
			LEFT JOIN master.m_customer c_ori ON c_ori.id = t.origin_id
			LEFT JOIN master.m_customer c_dest ON c_dest.id = t.destination_id
			WHERE t.status IN ('DISPATCHED', 'AT_ORIGIN', 'ON_ROUTE', 'AT_DESTINATION', 'RETURNING')
			  AND t.deleted_at IS NULL
		`;

		// Fetch last checkpoint per trip to check for deviation
		const checkpoints = await sql`
			SELECT DISTINCT ON (trip_id) trip_id, notes 
			FROM fleet.trip_checkpoint 
			ORDER BY trip_id, id DESC
		`;
		const checkpointMap = new Map();
		for (const chk of checkpoints) {
			checkpointMap.set(String(chk.trip_id), chk.notes);
		}

		// Build a lookup map by nopol
		const tripMap = new Map();
		for (const t of activeTrips) {
			tripMap.set(t.nomor_unit.replace(/\s+/g, '').toUpperCase(), t);
		}

		// Helper Haversine
		function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
			const R = 6371;
			const dLat = (lat2 - lat1) * Math.PI / 180;
			const dLon = (lon2 - lon1) * Math.PI / 180;
			const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
					  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
					  Math.sin(dLon/2) * Math.sin(dLon/2);
			const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
			return R * c;
		}

		function getBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
			const toRad = (deg: number) => deg * Math.PI / 180;
			const toDeg = (rad: number) => rad * 180 / Math.PI;
			const dLon = toRad(lon2 - lon1);
			const y = Math.sin(dLon) * Math.cos(toRad(lat2));
			const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
					  Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
			let brng = toDeg(Math.atan2(y, x));
			return (brng + 360) % 360;
		}

		function getAngleDiff(a1: number, a2: number) {
			let diff = Math.abs(a1 - a2) % 360;
			return diff > 180 ? 360 - diff : diff;
		}

		// Definisi Geofence Pool Resmi
		const POOLS = [
			{ id: 'cilegon', name: 'Pool Cilegon', lat: -5.9794663, lng: 106.0079733, radiusKm: 0.35 },
			{ id: 'bogor', name: 'Pool Bogor', lat: -6.4618702, lng: 106.8941709, radiusKm: 0.15 }
		];

		// 2. Fetch unified GPS data from our Golang Backend
		const res = await fetch(`${env.FMS_API_URL || 'http://localhost:8081'}/api/fms/live-map`);
		
		if (!res.ok) throw new Error('Failed to fetch from Golang FMS API');
		
		const responseData = await res.json();
		const vehicles = responseData.records || [];
		
		// Map the EasyGo vehicle data to our UI structure
		const mappedUnits = vehicles.map((v: any, index: number) => {
			let statusStr = 'Maintenance';
			if (v.currentStatusVehicle) {
				if (v.currentStatusVehicle.status === 0) statusStr = 'Available'; // Parking
				else if (v.currentStatusVehicle.status === 1) statusStr = 'Loading'; // Idle
				else if (v.currentStatusVehicle.status === 2) statusStr = 'Moving'; // Driving
			}

			// Some fallback if lat/lon is 0
			let lat = v.lat;
			let lon = v.lon;
			if (lat === 0 && lon === 0) {
				lat = -6.4609;
				lon = 106.8940; // Default pool Bogor
			}
			
			const nopolClean = (v.nopol || v.vehicle_id || '').replace(/\s+/g, '').toUpperCase();
			const dbTrip = tripMap.get(nopolClean);
			
			// Prioritize database planned coordinates for drawing route lines
			let originLat = dbTrip?.origin_lat ? parseFloat(dbTrip.origin_lat) : null;
			let originLng = dbTrip?.origin_lng ? parseFloat(dbTrip.origin_lng) : null;
			let destLat = dbTrip?.dest_lat ? parseFloat(dbTrip.dest_lat) : null;
			let destLng = dbTrip?.dest_lng ? parseFloat(dbTrip.dest_lng) : null;
			
			// Fallback to EasyGo GPS start/stop detail if DB coordinates are missing
			if (v.currentStatusVehicle) {
				if (v.currentStatusVehicle.driving && v.currentStatusVehicle.driving.start_detail) {
					const start = v.currentStatusVehicle.driving.start_detail;
					if (start.lat !== 0 && start.lon !== 0 && !originLat) {
						originLat = start.lat;
						originLng = start.lon;
					}
					const stop = v.currentStatusVehicle.driving.stop_detail;
					if (stop && stop.lat !== 0 && stop.lon !== 0 && !destLat) {
						destLat = stop.lat;
						destLng = stop.lon;
					}
				} else if (v.currentStatusVehicle.parking) {
					// If parking, start and current location are the same
					const p = v.currentStatusVehicle.parking;
					if (p.lat !== 0 && p.lon !== 0 && !originLat) {
						originLat = p.lat;
						originLng = p.lon;
					}
				}
			}

			// Geofence & Status Logic
			let geofenceStatus = statusStr;
			let finalDestination = dbTrip?.destination || v.kota || '-';
			let isAtPool = false;

			// Cek apakah di dalam pool
			for (const pool of POOLS) {
				const dist = getDistanceKm(lat, lon, pool.lat, pool.lng);
				if (dist <= pool.radiusKm) {
					geofenceStatus = `Di ${pool.name}`;
					finalDestination = pool.name;
					isAtPool = true;
					break;
				}
			}

			// Jika sedang RETURNING atau (tidak ada cargo dan sedang bergerak), arahkan ke Pool
			if (dbTrip?.status === 'RETURNING' || (!isAtPool && (!dbTrip || !dbTrip.cargo) && v.speed > 0)) {
				let nearestPool = POOLS[0];
				let vehicleHeading = typeof v.direction === 'number' ? v.direction : parseInt(v.direction || '0') || 0;
				
				// Hitung selisih sudut (heading) unit saat ini terhadap titik kordinat Pool
				let minAngleDiff = 360;
				
				for (const pool of POOLS) {
					// Hitung arah ideal dari lokasi unit saat ini ke pool tersebut
					const idealBearing = getBearing(lat, lon, pool.lat, pool.lng);
					// Bandingkan arah ideal dengan arah jalan unit saat ini (heading)
					const angleDiff = getAngleDiff(vehicleHeading, idealBearing);
					
					if (angleDiff < minAngleDiff) {
						minAngleDiff = angleDiff;
						nearestPool = pool;
					}
				}
				
				geofenceStatus = `Menuju ${nearestPool.name}`;
				finalDestination = nearestPool.name;
				
				// Rute di peta: dari destinasi kustomer (atau lokasi saat ini) ke pool
				if (dbTrip?.status === 'RETURNING') {
					originLat = dbTrip?.dest_lat ? parseFloat(dbTrip.dest_lat) : lat;
					originLng = dbTrip?.dest_lng ? parseFloat(dbTrip.dest_lng) : lon;
				}
				destLat = nearestPool.lat;
				destLng = nearestPool.lng;
			}
			
			return {
				id: v.nopol || v.vehicle_id,
				driver: dbTrip?.driver_nama || v.driver_nm || 'System Assigner',
				status: geofenceStatus,
				speed: Math.round(v.speed || 0),
				lat: lat,
				lng: lon,
				location: v.addr || v.currentStatusVehicle?.driving?.start_detail?.addr || v.currentStatusVehicle?.parking?.addr || '-',
				streetName: (v.addr || '').split(',')[0]?.trim() || '-',
				direction: typeof v.direction === 'number' ? v.direction : parseInt(v.direction || '0') || 0,
				originLat, originLng,
				destLat, destLng,
				origin: dbTrip?.origin || v.currentGeoAreaStatus?.geo_nm || v.provinsi || 'Pool',
				destination: finalDestination,
				do: dbTrip?.no_surat_tugas || `DO-EGO-${(v.vehicle_id || '').substring(3, 9)}`,
				cargo: dbTrip?.cargo || v.car_type || 'General Cargo',
				customer: dbTrip?.customer || v.company_nm || '-',
				isDeviated: dbTrip != null && checkpointMap.get(String(dbTrip.id)) != null && (checkpointMap.get(String(dbTrip.id)).includes('ANOMALI') || checkpointMap.get(String(dbTrip.id)).includes('shortcut') || checkpointMap.get(String(dbTrip.id)).includes('alternatif')),
				aiNote: dbTrip != null ? checkpointMap.get(String(dbTrip.id)) : null,
				progress: v.speed > 0 ? Math.floor(Math.random() * 80) + 10 : 0,
				eta: v.speed > 0 ? 'In Transit' : 'Standby'
			};
		});

		return {
			units: mappedUnits
		};
	} catch (error) {
		console.error("EasyGo API Error:", error);
		// Fallback data if API fails
		return {
			units: [
				{ id: 'ERROR', driver: '-', status: 'Maintenance', speed: 0, lat: -6.22, lng: 106.85, origin: '-', destination: '-', do: '-', cargo: '-', customer: '-', progress: 0, eta: '-' }
			]
		};
	}
};
