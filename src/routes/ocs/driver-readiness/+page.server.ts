import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		// Ambil seluruh 234 pengemudi aktif dengan rincian SIM, unit penugasan, dan trip
		const drivers = await sql`
			SELECT 
				d.id,
				d.karyawan_id,
				k.payroll_id,
				k.nama_karyawan as name,
				d.driver_category,
				d.sim_type,
				COALESCE(
					NULLIF(TRIM(k.no_sim_b2_umum), ''),
					NULLIF(TRIM(k.no_sim_b1), ''),
					NULLIF(TRIM(k.no_sim_a), ''),
					NULLIF(TRIM(k.no_sim_c), ''),
					'-'
				) as sim_number,
				TO_CHAR(d.sim_expiry_date, 'YYYY-MM-DD') as sim_expiry_date,
				(d.sim_expiry_date - CURRENT_DATE)::int as days_remaining,
				CASE 
					WHEN d.sim_expiry_date IS NULL THEN 'NO_DATE'
					WHEN d.sim_expiry_date < CURRENT_DATE THEN 'EXPIRED'
					WHEN d.sim_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'WARNING_30'
					ELSE 'VALID'
				END as gate_status,
				u.nomor_unit as assigned_unit,
				u.business_unit as unit_type,
				uda.posisi as assignment_posisi,
				COALESCE(trip_stats.total_trips_month, 0) as trips_this_month
			FROM master.m_drivers d
			JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN fleet.unit_driver_assignment uda ON uda.driver_id = d.id AND uda.is_aktif = true
			LEFT JOIN fleet.unit u ON u.id = uda.unit_id
			LEFT JOIN (
				SELECT driver_id, COUNT(id) as total_trips_month
				FROM fleet.trip
				WHERE tgl_trip >= date_trunc('month', CURRENT_DATE)
				GROUP BY driver_id
			) trip_stats ON trip_stats.driver_id = d.id
			WHERE d.status = 'ACTIVE'
			ORDER BY 
				CASE 
					WHEN d.sim_expiry_date < CURRENT_DATE THEN 0
					WHEN d.sim_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1
					ELSE 2
				END ASC,
				d.sim_expiry_date ASC NULLS LAST,
				k.nama_karyawan ASC
		`;

		const totalDrivers = drivers.length;
		const expiredCount = drivers.filter(d => d.gate_status === 'EXPIRED').length;
		const warningCount = drivers.filter(d => d.gate_status === 'WARNING_30').length;
		const validCount = drivers.filter(d => d.gate_status === 'VALID').length;
		const noDateCount = drivers.filter(d => d.gate_status === 'NO_DATE').length;
		const assignedCount = drivers.filter(d => d.assigned_unit !== null).length;
		const standbyCount = totalDrivers - assignedCount;

		return {
			drivers: drivers as any[],
			summary: {
				totalDrivers,
				expiredCount,
				warningCount,
				validCount,
				noDateCount,
				assignedCount,
				standbyCount
			}
		};
	} catch (err: any) {
		console.error('[OCS Driver Readiness] Load error:', err);
		return {
			drivers: [],
			summary: {
				totalDrivers: 0,
				expiredCount: 0,
				warningCount: 0,
				validCount: 0,
				noDateCount: 0,
				assignedCount: 0,
				standbyCount: 0
			}
		};
	}
};
