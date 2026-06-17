import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// Fetch all Work Orders with their assigned mechanics
		const workOrders = await sql`
			SELECT 
				w.*, 
				u.nama_karyawan as mechanic_name,
				d.nama_karyawan as driver_name
			FROM fleet.work_orders w
			LEFT JOIN master.m_karyawan u ON w.mechanic_id = u.payroll_id
			LEFT JOIN master.m_karyawan d ON w.driver_id = d.payroll_id
			ORDER BY w.wo_date DESC
		`;

		return {
			workOrders
		};

	} catch (err) {
		console.error("Error fetching mechanic dashboard data:", err);
		throw error(500, 'Internal Server Error');
	}
};
