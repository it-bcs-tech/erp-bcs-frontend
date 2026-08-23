import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { unit_id, event_type } = body;

		if (!unit_id) {
			return json({ success: false, message: 'unit_id is required' }, { status: 400 });
		}

		let title = 'Telematics Alert';
		let description = 'Simulated telematics event';
		let severity = 'MEDIUM';
		let value_recorded = 'N/A';

		if (event_type === 'HARSH_BRAKING') {
			title = 'Pengereman Mendadak Ekstrem (Harsh Braking)';
			description = 'Deselerasi -0.65 G terdeteksi pada kecepatan 72 km/jam.';
			severity = 'HIGH';
			value_recorded = '-0.65 G';
		} else if (event_type === 'FUEL_DRAIN_ANOMALY') {
			title = 'Penurunan BBM Cepat (Indikasi Kencing Solar)';
			description = 'Volume tangki BBM drop 35 Liter dalam 5 menit saat mesin tidak menyala.';
			severity = 'CRITICAL';
			value_recorded = '-35 Liter / 5 mnt';
		} else if (event_type === 'OVER_SPEED') {
			title = 'Pelanggaran Batas Kecepatan (Over-speeding)';
			description = 'Armada melaju 96 km/jam (Batas toleransi maksimal 80 km/jam).';
			severity = 'MEDIUM';
			value_recorded = '96 km/h';
		} else if (event_type === 'ENGINE_OVERHEAT') {
			title = 'Peringatan Suhu Mesin Kritis (Engine Overheating)';
			description = 'Suhu coolant radiator mencapai 109 °C. Risiko kerusakan kepala silinder.';
			severity = 'HIGH';
			value_recorded = '109 °C';
		}

		// Insert the event
		const [event] = await sql`
			INSERT INTO fleet.telematics_events (
				unit_id, driver_id, driver_name, event_type, severity, title,
				description, value_recorded, lat, lng, location_name, timestamp, is_resolved
			) VALUES (
				${unit_id}, 'DRV-SIM', 'Supir Bertugas', ${event_type || 'HARSH_BRAKING'}, ${severity}, ${title},
				${description}, ${value_recorded}, -6.2146, 106.8451, 'Ruas Tol Jakarta - Cikampek KM 38',
				NOW(), FALSE
			)
			RETURNING *
		`;

		// Also insert current telematics log point
		await sql`
			INSERT INTO fleet.telematics_logs (
				unit_id, driver_id, timestamp, lat, lng, speed_kmh, rpm,
				engine_temp_c, fuel_level_liters, fuel_pct, odometer_km, battery_voltage, is_engine_on
			) VALUES (
				${unit_id}, 'DRV-SIM', NOW(), -6.2146, 106.8451, 65.0, 1850,
				${event_type === 'ENGINE_OVERHEAT' ? 109.0 : 88.5},
				${event_type === 'FUEL_DRAIN_ANOMALY' ? 120.0 : 210.0},
				${event_type === 'FUEL_DRAIN_ANOMALY' ? 40.0 : 70.0},
				145320.0, 24.2, TRUE
			)
		`;

		return json({
			success: true,
			message: `Event ${title} berhasil disimulasikan untuk unit ${unit_id}!`,
			data: event
		});
	} catch (err: any) {
		console.error('Error simulating telematics event:', err);
		return json({ success: false, message: err.message }, { status: 500 });
	}
};
