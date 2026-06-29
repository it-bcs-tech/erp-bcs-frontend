import type { PageServerLoad, Actions } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// Get all active and disabled assignments
		const assignments = await sql`
			SELECT 
				a.id as assignment_id,
				u.id as unit_id,
				u.nomor_unit,
				u.business_unit as unit_type,
				d.id as driver_id,
				k.nama_karyawan as driver_name,
				a.posisi,
				a.tgl_mulai,
				a.assignment_status,
				a.is_aktif
			FROM fleet.unit_driver_assignment a
			JOIN fleet.unit u ON u.id = a.unit_id
			JOIN master.m_drivers d ON d.id = a.driver_id
			JOIN master.m_karyawan k ON k.id = d.karyawan_id
			WHERE a.assignment_status IN ('ACTIVE', 'DISABLED')
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
				) as has_supir_utama,
				(
					SELECT count(*) FROM fleet.unit_driver_assignment uda 
					WHERE uda.unit_id = u.id AND uda.assignment_status IN ('ACTIVE', 'DISABLED')
				) as total_assigned_drivers
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

		const totalAssignedData = await sql`
			SELECT count(*) as total_drivers
			FROM fleet.unit_driver_assignment
			WHERE unit_id = ${unitId} AND assignment_status IN ('ACTIVE', 'DISABLED')
		`;
		const totalDrivers = Number(totalAssignedData[0]?.total_drivers || 0);

		if (totalDrivers >= 2 && posisi !== 'HELPER') {
			return fail(400, { error: 'Unit ini sudah memiliki 2 sopir terdaftar (aktif/non-aktif). Sopir tambahan harus berposisi sebagai HELPER.' });
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
			return fail(400, { error: `Posisi ${posName} sudah terisi untuk unit ini. Silakan pilih posisi lain (misal: SUPIR CADANGAN) agar keduanya aktif, atau Hapus/Disable penugasan sopir lama terlebih dahulu.` });
		}
		
		try {
			await sql.begin(async (tx) => {
				// 1. Deactivate any existing assignment for this Driver
				await tx`
					UPDATE fleet.unit_driver_assignment
					SET is_aktif = false, tgl_selesai = CURRENT_DATE, assignment_status = 'ENDED', updated_by = 'SYSTEM', updated_at = NOW()
					WHERE driver_id = ${driverId} AND is_aktif = true
				`;

				// 3. Insert new assignment
				await tx`
					INSERT INTO fleet.unit_driver_assignment 
					(unit_id, driver_id, posisi, tgl_mulai, is_aktif, assignment_status, created_by, created_at)
					VALUES 
					(${unitId}, ${driverId}, ${posisi}, CURRENT_DATE, true, 'ACTIVE', 'SYSTEM', NOW())
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
				SET is_aktif = false, tgl_selesai = CURRENT_DATE, assignment_status = 'ENDED', updated_by = 'SYSTEM', updated_at = NOW()
				WHERE id = ${assignmentId}
			`;
			return { success: true, message: 'Assignment ended successfully.' };
		} catch (error: any) {
			console.error("Error unassigning driver:", error);
			return fail(500, { error: 'Failed to end assignment.' });
		}
	},

	disableDriver: async ({ request }) => {
		const data = await request.formData();
		const assignmentId = data.get('assignmentId')?.toString();
		
		if (!assignmentId) return fail(400, { error: 'Assignment ID is required' });
		
		try {
			await sql`
				UPDATE fleet.unit_driver_assignment
				SET is_aktif = false, assignment_status = 'DISABLED', updated_by = 'SYSTEM', updated_at = NOW()
				WHERE id = ${assignmentId}
			`;
			return { success: true, message: 'Driver disabled temporarily.' };
		} catch (error: any) {
			console.error("Error disabling driver:", error);
			return fail(500, { error: 'Failed to disable driver.' });
		}
	},

	enableDriver: async ({ request }) => {
		const data = await request.formData();
		const assignmentId = data.get('assignmentId')?.toString();
		
		if (!assignmentId) return fail(400, { error: 'Assignment ID is required' });
		
		try {
			// Get current assignment info
			const assignmentInfo = await sql`
				SELECT a.driver_id, a.unit_id, a.posisi 
				FROM fleet.unit_driver_assignment a 
				WHERE a.id = ${assignmentId}
			`;
			if (assignmentInfo.length === 0) return fail(400, { error: 'Assignment not found.' });
			const { driver_id, unit_id, posisi } = assignmentInfo[0];

			// 1. Validate: Has this driver worked 14 days?
			const driverData = await sql`
				SELECT COUNT(DISTINCT tgl_trip) as days_worked
				FROM fleet.trip
				WHERE driver_id = ${driver_id}
				  AND tgl_trip >= date_trunc('month', CURRENT_DATE)
			`;
			const daysWorked = Number(driverData[0]?.days_worked || 0);
			if (daysWorked >= 14) {
				return fail(400, { error: `Sopir sudah mencapai batas maksimal 14 hari kerja bulan ini (Saat ini: ${daysWorked} hari). Tidak dapat di-Enable.` });
			}

			// 2. Check if another driver is currently ACTIVE in this position
			const activeReplacement = await sql`
				SELECT id, driver_id 
				FROM fleet.unit_driver_assignment
				WHERE unit_id = ${unit_id} AND posisi = ${posisi} AND is_aktif = true
			`;

			if (activeReplacement.length > 0) {
				const replacement = activeReplacement[0];
				
				// 3. Check if the replacement driver is currently on a trip
				const activeTrips = await sql`
					SELECT id FROM fleet.trip
					WHERE driver_id = ${replacement.driver_id} AND status != 'COMPLETED'
				`;
				
				if (activeTrips.length > 0) {
					return fail(400, { error: `Gagal Enable: Sopir pengganti sedang dalam perjalanan (Trip aktif).` });
				}

				// Disabling the replacement driver so the original can take the spot
				await sql`
					UPDATE fleet.unit_driver_assignment
					SET is_aktif = false, assignment_status = 'DISABLED', updated_by = 'SYSTEM', updated_at = NOW()
					WHERE id = ${replacement.id}
				`;
			}

			// End any current active assignment this driver might have elsewhere
			await sql`
				UPDATE fleet.unit_driver_assignment
				SET is_aktif = false, tgl_selesai = CURRENT_DATE, assignment_status = 'ENDED', updated_by = 'SYSTEM', updated_at = NOW()
				WHERE driver_id = ${driver_id} AND is_aktif = true
			`;

			// Enable the original driver
			await sql`
				UPDATE fleet.unit_driver_assignment
				SET is_aktif = true, assignment_status = 'ACTIVE', updated_by = 'SYSTEM', updated_at = NOW()
				WHERE id = ${assignmentId}
			`;
			return { success: true, message: 'Driver enabled successfully.' };
		} catch (error: any) {
			console.error("Error enabling driver:", error);
			return fail(500, { error: 'Failed to enable driver.' });
		}
	}
};
