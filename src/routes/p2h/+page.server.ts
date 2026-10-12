import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('q')?.toLowerCase() || '';

	try {
		// 1. Fetch Today's Stats
		const stats = await sql`
			SELECT 
				COUNT(*) as total_today,
				COUNT(*) FILTER (WHERE i.status = 'LAYAK' OR i.status = 'PASSED' OR i.status = 'CLOSED') as passed_today,
				COUNT(*) FILTER (WHERE i.status = 'TIDAK_LAYAK' OR i.status = 'FAILED_DEFECT') as failed_today,
				COUNT(*) FILTER (WHERE w.status = 'READY_FOR_REINSPECTION') as ready_reinspect
			FROM fleet.vehicle_inspections i
			LEFT JOIN fleet.work_orders w ON i.wo_no = w.wo_no
			WHERE i.created_at::date = CURRENT_DATE
		`;

		// 2. Fetch Recent Inspections
		let searchCondition = sql``;
		if (search) {
			searchCondition = sql`AND (
				i.inspection_no ILIKE ${'%' + search + '%'} OR 
				i.unit_id ILIKE ${'%' + search + '%'} OR 
				i.police_no ILIKE ${'%' + search + '%'} OR
				i.wo_no ILIKE ${'%' + search + '%'}
			)`;
		}

		const recentInspections = await sql`
			SELECT 
				i.id,
				i.inspection_no,
				i.inspection_date,
				i.unit_id,
				i.unit_type,
				i.police_no,
				k.nama_karyawan as driver_name,
				i.odometer,
				i.defect_count,
				i.status,
				i.wo_no,
				w.status as wo_status
			FROM fleet.vehicle_inspections i
			LEFT JOIN master.m_karyawan k ON i.driver_id = k.payroll_id
			LEFT JOIN fleet.work_orders w ON i.wo_no = w.wo_no
			WHERE true ${searchCondition}
			ORDER BY i.id DESC
			LIMIT 20
		`;

		return {
			stats: {
				total: Number(stats[0]?.total_today || 0),
				passed: Number(stats[0]?.passed_today || 0),
				failed: Number(stats[0]?.failed_today || 0),
				readyReinspect: Number(stats[0]?.ready_reinspect || 0)
			},
			inspections: recentInspections.map(r => ({
				id: r.id,
				inspectionNo: r.inspection_no,
				date: r.inspection_date ? new Date(r.inspection_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-',
				unitId: r.unit_id,
				unitType: r.unit_type || 'Truck',
				policeNo: r.police_no || r.unit_id,
				driverName: r.driver_name || 'Tanpa Driver',
				odometer: r.odometer ? Number(r.odometer).toLocaleString('id-ID') : '-',
				defectCount: Number(r.defect_count || 0),
				status: r.status,
				woNo: r.wo_no,
				woStatus: r.wo_status
			}))
		};
	} catch (err) {
		console.error("Error loading P2H mobile dashboard:", err);
		return {
			stats: { total: 0, passed: 0, failed: 0, readyReinspect: 0 },
			inspections: []
		};
	}
};
