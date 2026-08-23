import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { action, tire_id, unit_id, from_pos, to_pos, tread_depth, notes, odometer_km } = body;

		if (action === 'INSPECT') {
			if (!tire_id || tread_depth === undefined) {
				return json({ success: false, message: 'tire_id dan tread_depth wajib diisi' }, { status: 400 });
			}

			const [updated] = await sql`
				UPDATE fleet.tires
				SET 
					current_tread_depth_mm = ${tread_depth},
					updated_at = NOW()
				WHERE id = ${tire_id}
				RETURNING *
			`;

			await sql`
				INSERT INTO fleet.tire_history (
					tire_id, action_type, unit_id, from_position, tread_depth_recorded, odometer_km, notes
				) VALUES (
					${tire_id}, 'INSPECTION', ${unit_id || null}, ${from_pos || null}, ${tread_depth}, ${odometer_km || 0}, ${notes || 'Pemeriksaan rutin ketebalan alur ban'}
				)
			`;

			return json({ success: true, message: `Inspeksi ban ${updated.serial_number} berhasil dicatat!`, data: updated });
		}

		if (action === 'ROTATE') {
			if (!unit_id || !from_pos || !to_pos) {
				return json({ success: false, message: 'unit_id, from_pos, dan to_pos wajib diisi' }, { status: 400 });
			}

			// Get current tires at from_pos and to_pos
			const [posA] = await sql`SELECT * FROM fleet.tire_positions WHERE unit_id = ${unit_id} AND position_code = ${from_pos}`;
			const [posB] = await sql`SELECT * FROM fleet.tire_positions WHERE unit_id = ${unit_id} AND position_code = ${to_pos}`;

			const tireA = posA ? posA.tire_id : null;
			const tireB = posB ? posB.tire_id : null;

			// Swap them
			if (posA) {
				await sql`UPDATE fleet.tire_positions SET tire_id = ${tireB}, updated_at = NOW() WHERE id = ${posA.id}`;
			}
			if (posB) {
				await sql`UPDATE fleet.tire_positions SET tire_id = ${tireA}, updated_at = NOW() WHERE id = ${posB.id}`;
			}

			// Log history
			if (tireA) {
				await sql`
					INSERT INTO fleet.tire_history (tire_id, action_type, unit_id, from_position, to_position, notes)
					VALUES (${tireA}, 'ROTATION', ${unit_id}, ${from_pos}, ${to_pos}, ${notes || 'Rotasi posisi ban'})
				`;
			}
			if (tireB) {
				await sql`
					INSERT INTO fleet.tire_history (tire_id, action_type, unit_id, from_position, to_position, notes)
					VALUES (${tireB}, 'ROTATION', ${unit_id}, ${to_pos}, ${from_pos}, ${notes || 'Rotasi posisi ban'})
				`;
			}

			return json({ success: true, message: `Rotasi ban dari posisi ${from_pos} ke ${to_pos} berhasil!` });
		}

		if (action === 'RETREAD') {
			if (!tire_id) {
				return json({ success: false, message: 'tire_id wajib diisi' }, { status: 400 });
			}

			const [updated] = await sql`
				UPDATE fleet.tires
				SET 
					status = 'RETREADING',
					updated_at = NOW()
				WHERE id = ${tire_id}
				RETURNING *
			`;

			// Remove from position if mounted
			await sql`UPDATE fleet.tire_positions SET tire_id = NULL WHERE tire_id = ${tire_id}`;

			await sql`
				INSERT INTO fleet.tire_history (tire_id, action_type, notes)
				VALUES (${tire_id}, 'RETREAD_SENT', ${notes || 'Ban dikirim ke pabrik vulkanisir'})
			`;

			return json({ success: true, message: `Ban ${updated.serial_number} berhasil dikirim ke antrean vulkanisir!` });
		}

		return json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });
	} catch (err: any) {
		console.error('Error handling tire action:', err);
		return json({ success: false, message: err.message }, { status: 500 });
	}
};
