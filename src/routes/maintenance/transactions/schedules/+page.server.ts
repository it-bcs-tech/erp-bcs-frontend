import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// 1. Fetch all schedules joined with fleet.unit current odometer
		const schedules = await sql`
			SELECT 
				s.*,
				COALESCE(s.last_service_km, s.target_km, 0) as current_odometer,
				COALESCE(tu.nama_tipe, u.business_unit::text, 'Truck') as unit_type
			FROM fleet.maintenance_schedules s
			LEFT JOIN fleet.unit u ON s.unit_id = u.nomor_unit
			LEFT JOIN master.m_model_unit mu ON u.model_unit_id::text = mu.id::text
			LEFT JOIN master.m_tipe_unit tu ON mu.tipe_unit_id::text = tu.id::text
			ORDER BY s.target_date ASC NULLS LAST, s.id DESC
		`;

		// 2. Fetch active units for dropdown
		const units = await sql`
			SELECT 
				u.nomor_unit as no_unit, 
				COALESCE(tu.nama_tipe, u.business_unit::text, 'Truck') as type
			FROM fleet.unit u
			LEFT JOIN master.m_model_unit mu ON u.model_unit_id::text = mu.id::text
			LEFT JOIN master.m_tipe_unit tu ON mu.tipe_unit_id::text = tu.id::text
			WHERE u.is_active = true
			ORDER BY u.nomor_unit ASC
		`;

		// Format and compute live status
		const now = new Date();
		const formatted = schedules.map(s => {
			const currentKm = s.current_odometer || 0;
			const targetKm = s.target_km || 0;
			const targetDate = s.target_date ? new Date(s.target_date) : null;

			let liveStatus = s.status || 'ACTIVE';
			if (liveStatus !== 'COMPLETED') {
				const isKmOverdue = targetKm > 0 && currentKm >= targetKm;
				const isDateOverdue = targetDate && targetDate < now;
				const isKmNear = targetKm > 0 && currentKm >= (targetKm - 500);

				if (isKmOverdue || isDateOverdue) {
					liveStatus = 'OVERDUE';
				} else if (isKmNear) {
					liveStatus = 'DUE';
				} else {
					liveStatus = 'ACTIVE';
				}
			}

			return {
				id: s.id,
				unitId: s.unit_id,
				unitType: s.unit_type || 'Truck',
				serviceType: s.service_type,
				targetKm: s.target_km,
				currentKm,
				targetDate: s.target_date ? new Date(s.target_date).toLocaleDateString('id-ID') : '-',
				rawTargetDate: s.target_date,
				lastKm: s.last_service_km,
				status: liveStatus,
				notes: s.notes || ''
			};
		});

		const metrics = {
			total: formatted.length,
			overdue: formatted.filter(s => s.status === 'OVERDUE').length,
			due: formatted.filter(s => s.status === 'DUE').length,
			active: formatted.filter(s => s.status === 'ACTIVE').length
		};

		return {
			schedules: formatted,
			units: units.map(u => ({
				noUnit: u.no_unit,
				type: u.type,
				odometer: 0
			})),
			metrics
		};

	} catch (error) {
		console.error("Database error loading PM schedules:", error);
		return {
			schedules: [],
			units: [],
			metrics: { total: 0, overdue: 0, due: 0, active: 0 }
		};
	}
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const unit_id = data.get('unit_id')?.toString();
		const service_type = data.get('service_type')?.toString() || 'PM1 (Servis Ringan)';
		const target_km = parseInt(data.get('target_km')?.toString() || '0') || null;
		const target_date = data.get('target_date')?.toString() || null;
		const notes = data.get('notes')?.toString() || '';

		if (!unit_id) {
			return fail(400, { missing: true, message: 'Nomor unit wajib dipilih.' });
		}

		try {
			await sql`
				INSERT INTO fleet.maintenance_schedules (
					unit_id,
					service_type,
					target_km,
					target_date,
					status,
					notes,
					created_at,
					updated_at
				) VALUES (
					${unit_id},
					${service_type},
					${target_km},
					${target_date},
					'ACTIVE',
					${notes},
					NOW(),
					NOW()
				)
			`;
			return { success: true, message: 'Jadwal servis berkala berhasil ditambahkan.' };
		} catch (e) {
			console.error("Error creating PM schedule:", e);
			return fail(500, { error: true, message: 'Gagal menyimpan jadwal servis.' });
		}
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { message: 'ID tidak valid.' });

		try {
			await sql`DELETE FROM fleet.maintenance_schedules WHERE id = ${id}`;
			return { success: true, message: 'Jadwal servis berhasil dihapus.' };
		} catch (e) {
			console.error("Error deleting schedule:", e);
			return fail(500, { error: true, message: 'Gagal menghapus jadwal.' });
		}
	}
};
