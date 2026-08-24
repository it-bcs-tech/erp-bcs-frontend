import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const {
			serial_number,
			material_code,
			brand,
			size_spec = '11.00R20 16PR',
			pattern_type = 'ALL-POSITION',
			current_tread_depth_mm = 16.0,
			original_tread_depth_mm = 16.0,
			purchase_cost = 0,
			retread_count = 0,
			status = 'SPARE_STOCK',
			unit_id,
			position_code,
			installed_odometer_km = 0,
			notes = ''
		} = body;

		if (!serial_number || !brand) {
			return json({ success: false, message: 'Serial Number dan Merk Ban wajib diisi' }, { status: 400 });
		}

		const sn = serial_number.trim().toUpperCase();

		// Check if serial number already exists
		const [existing] = await sql`SELECT id FROM fleet.tires WHERE UPPER(serial_number) = ${sn}`;
		if (existing) {
			return json({ success: false, message: `Ban dengan Serial Number ${sn} sudah terdaftar di sistem` }, { status: 400 });
		}

		// Insert new tire record
		const [newTire] = await sql`
			INSERT INTO fleet.tires (
				serial_number, brand, size_spec, pattern_type, status,
				retread_count, current_tread_depth_mm, original_tread_depth_mm,
				purchase_cost, total_km_run, cost_per_km, notes
			) VALUES (
				${sn}, ${brand}, ${size_spec}, ${pattern_type}, ${status},
				${Number(retread_count)}, ${Number(current_tread_depth_mm)}, ${Number(original_tread_depth_mm)},
				${Number(purchase_cost)}, 0, 0, ${notes || (material_code ? `Katalog: ${material_code}` : 'Pendaftaran Manual')}
			)
			RETURNING id, serial_number, brand, status
		`;

		// If mounted to a unit vehicle
		if (status === 'MOUNTED' && unit_id && position_code) {
			// Find axle index based on position_code
			let axleIndex = 1;
			if (position_code.includes('RL1') || position_code.includes('RR1') || position_code === 'RL' || position_code === 'RR') axleIndex = 2;
			else if (position_code.includes('RL2') || position_code.includes('RR2')) axleIndex = 3;
			else if (position_code.includes('TR1')) axleIndex = 4;
			else if (position_code.includes('TR2')) axleIndex = 5;
			else if (position_code.includes('TR3')) axleIndex = 6;
			else if (position_code.includes('SPARE')) axleIndex = 99;

			await sql`
				INSERT INTO fleet.tire_positions (
					unit_id, axle_index, position_code, tire_id, installed_odometer_km
				) VALUES (
					${unit_id.toString()}, ${axleIndex}, ${position_code}, ${newTire.id}, ${Number(installed_odometer_km)}
				)
				ON CONFLICT (unit_id, position_code) DO UPDATE 
				SET tire_id = ${newTire.id}, installed_at = NOW(), installed_odometer_km = ${Number(installed_odometer_km)}, updated_at = NOW()
			`;

			await sql`
				INSERT INTO fleet.tire_history (
					tire_id, action_type, to_unit_id, to_position_code, tread_depth_mm, odometer_km, notes
				) VALUES (
					${newTire.id}, 'INSTALL', ${unit_id.toString()}, ${position_code}, ${Number(current_tread_depth_mm)}, ${Number(installed_odometer_km)}, 'Pemasangan awal saat registrasi ban'
				)
			`;
		}

		return json({
			success: true,
			message: `Ban ${sn} (${brand}) berhasil didaftarkan ke sistem`,
			data: newTire
		});
	} catch (err: any) {
		console.error('Error creating tire:', err);
		return json({ success: false, message: err.message }, { status: 500 });
	}
};
