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
			SELECT id, nomor_unit, business_unit as type
			FROM fleet.unit
			WHERE is_active = true
			ORDER BY nomor_unit ASC
		`;

		// Get available drivers
		const drivers = await sql`
			SELECT d.id, k.nama_karyawan as name
			FROM master.m_drivers d
			JOIN master.m_karyawan k ON k.id = d.karyawan_id
			WHERE d.status = 'ACTIVE'
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
		
		if (!unitId || !driverId || !posisi) {
			return fail(400, { error: 'Unit, Driver, and Position are required' });
		}
		
		try {
			await sql.begin(async (tx) => {
				// 1. Deactivate any existing assignment for this Driver (a driver can only be active in one unit)
				await tx`
					UPDATE fleet.unit_driver_assignment
					SET is_aktif = false, tgl_selesai = CURRENT_DATE, updated_by = 'SYSTEM', updated_at = NOW()
					WHERE driver_id = ${driverId} AND is_aktif = true
				`;

				// 2. Deactivate any existing assignment for this Unit at this specific Position (e.g. replacing the Supir Utama)
				await tx`
					UPDATE fleet.unit_driver_assignment
					SET is_aktif = false, tgl_selesai = CURRENT_DATE, updated_by = 'SYSTEM', updated_at = NOW()
					WHERE unit_id = ${unitId} AND posisi = ${posisi} AND is_aktif = true
				`;

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
