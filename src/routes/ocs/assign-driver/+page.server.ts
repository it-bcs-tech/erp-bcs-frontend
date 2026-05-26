import type { PageServerLoad, Actions } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// Get all active assignments
		const assignments = await sql`
			SELECT 
				a.id as assignment_id,
				u.id as unit_id,
				u.nomor_unit,
				u.business_unit as unit_type,
				d.id as driver_id,
				k.nama_karyawan as driver_name,
				a.posisi,
				a.tgl_mulai
			FROM fleet.unit_driver_assignment a
			JOIN fleet.unit u ON u.id = a.unit_id
			JOIN master.m_drivers d ON d.id = a.driver_id
			JOIN master.m_karyawan k ON k.id = d.karyawan_id
			WHERE a.is_aktif = true
			ORDER BY a.tgl_mulai DESC, u.nomor_unit ASC
		`;

		// Get available units
		const units = await sql`
			SELECT 
				u.id, 
				u.nomor_unit, 
				u.business_unit as type,
				EXISTS (
					SELECT 1 FROM fleet.unit_driver_assignment uda 
					WHERE uda.unit_id = u.id AND uda.is_aktif = true AND uda.posisi = 'SUPIR_UTAMA'
				) as has_supir_utama
			FROM fleet.unit u
			WHERE u.is_active = true
			ORDER BY u.nomor_unit ASC
		`;

		// Get available drivers
		const drivers = await sql`
			SELECT 
				d.id, 
				k.nama_karyawan as name,
				COALESCE(wd.days_worked, 0) as working_days_this_month
			FROM master.m_drivers d
			JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN (
				SELECT 
					driver_id,
					COUNT(DISTINCT tgl_trip) as days_worked
				FROM fleet.trip
				WHERE tgl_trip >= date_trunc('month', CURRENT_DATE)
				GROUP BY driver_id
			) wd ON wd.driver_id = d.id
			WHERE d.status = 'ACTIVE'
			  AND d.id NOT IN (
				  SELECT driver_id 
				  FROM fleet.unit_driver_assignment 
				  WHERE is_aktif = true
			  )
			ORDER BY k.nama_karyawan ASC
		`;

		return {
			assignments: assignments as any[],
			units: units as any[],
			drivers: drivers as any[]
		};
	} catch (error) {
		console.error("Error loading assign driver data:", error);
		return { assignments: [], units: [], drivers: [] };
	}
};

export const actions: Actions = {
	assignDriver: async ({ request }) => {
		const data = await request.formData();
		const unitId = data.get('unitId')?.toString();
		const driverId = data.get('driverId')?.toString();
		const posisi = data.get('posisi')?.toString() || 'SUPIR_UTAMA';
		const isException = data.get('isException') === 'true';
		
		if (!unitId || !driverId || !posisi) {
			return fail(400, { error: 'Unit, Driver, and Position are required' });
		}

		if (!isException) {
			// Validate 1: Max 14 days
			const driverData = await sql`
				SELECT COUNT(DISTINCT tgl_trip) as days_worked
				FROM fleet.trip
				WHERE driver_id = ${driverId}
				  AND tgl_trip >= date_trunc('month', CURRENT_DATE)
			`;
			const daysWorked = Number(driverData[0]?.days_worked || 0);
			if (daysWorked >= 14) {
				return fail(400, { error: `Sopir sudah mencapai batas maksimal 14 hari kerja bulan ini (Saat ini: ${daysWorked} hari). Gunakan Pengecualian jika darurat.` });
			}

			// Validate 2: Max 2 active drivers per unit
			const unitData = await sql`
				SELECT count(*) as active_drivers
				FROM fleet.unit_driver_assignment
				WHERE unit_id = ${unitId} AND is_aktif = true
			`;
			const activeDrivers = Number(unitData[0]?.active_drivers || 0);
			if (activeDrivers >= 2) {
				return fail(400, { error: 'Unit ini sudah memiliki maksimal 2 sopir aktif. Gunakan Pengecualian jika ini adalah penggantian darurat di luar kuota.' });
			}
		}

		// Check for position conflict to prevent database constraint error (uk_uda_unit_posisi)
		const posConflict = await sql`
			SELECT id FROM fleet.unit_driver_assignment 
			WHERE unit_id = ${unitId} AND posisi = ${posisi} AND is_aktif = true
		`;
		if (posConflict.length > 0) {
			const posName = posisi.replace('_', ' ');
			return fail(400, { error: `Posisi ${posName} sudah terisi untuk unit ini. Silakan pilih posisi lain (misal: SUPIR CADANGAN) agar keduanya aktif, atau Hapus penugasan sopir lama terlebih dahulu jika ingin menggantikan posisinya.` });
		}
		
		try {
			await sql.begin(async (tx) => {
				// 1. Deactivate any existing assignment for this Driver (a driver can only be active in one unit)
				await tx`
					UPDATE fleet.unit_driver_assignment
					SET is_aktif = false, tgl_selesai = CURRENT_DATE, updated_by = 'SYSTEM', updated_at = NOW()
					WHERE driver_id = ${driverId} AND is_aktif = true
				`;

				// Removed automatic deactivation by position. If a unit needs a replacement, 
				// the admin should unassign the old driver first, or just add the new one up to the limit.

				// 3. Insert new assignment
				await tx`
					INSERT INTO fleet.unit_driver_assignment 
					(unit_id, driver_id, posisi, tgl_mulai, is_aktif, created_by, created_at)
					VALUES 
					(${unitId}, ${driverId}, ${posisi}, CURRENT_DATE, true, 'SYSTEM', NOW())
				`;
			});
			
			return { success: true, message: 'Driver successfully assigned to Unit.' };
		} catch (error: any) {
			console.error("Error assigning driver:", error);
			return fail(500, { error: 'Failed to assign driver: ' + error.message });
		}
	},
	
	unassignDriver: async ({ request }) => {
		const data = await request.formData();
		const assignmentId = data.get('assignmentId')?.toString();
		
		if (!assignmentId) return fail(400, { error: 'Assignment ID is required' });
		
		try {
			await sql`
				UPDATE fleet.unit_driver_assignment
				SET is_aktif = false, tgl_selesai = CURRENT_DATE, updated_by = 'SYSTEM', updated_at = NOW()
				WHERE id = ${assignmentId}
			`;
			return { success: true, message: 'Assignment ended successfully.' };
		} catch (error: any) {
			console.error("Error unassigning driver:", error);
			return fail(500, { error: 'Failed to end assignment.' });
		}
	}
};
