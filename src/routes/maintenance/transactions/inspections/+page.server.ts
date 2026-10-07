import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const statusFilter = url.searchParams.get('status') || 'All';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const perPage = 10;
	const offset = (page - 1) * perPage;

	try {
		let statusCondition = sql``;
		if (statusFilter !== 'All') {
			if (statusFilter === 'PASSED') {
				statusCondition = sql`AND (i.status = 'PASSED' OR i.status = 'LAYAK')`;
			} else if (statusFilter === 'LAYAK_DENGAN_CATATAN') {
				statusCondition = sql`AND i.status = 'LAYAK_DENGAN_CATATAN'`;
			} else if (statusFilter === 'FAILED_DEFECT') {
				statusCondition = sql`AND (i.status = 'FAILED_DEFECT' OR i.status = 'TIDAK_LAYAK')`;
			} else {
				statusCondition = sql`AND i.status = ${statusFilter}`;
			}
		}

		let searchCondition = sql``;
		if (search) {
			searchCondition = sql`AND (
				i.inspection_no ILIKE ${'%' + search + '%'} OR 
				i.unit_id ILIKE ${'%' + search + '%'} OR 
				i.police_no ILIKE ${'%' + search + '%'} OR
				i.inspector_name ILIKE ${'%' + search + '%'} OR
				i.wo_no ILIKE ${'%' + search + '%'}
			)`;
		}

		// 1. Fetch paginated records
		const records = await sql`
			SELECT 
				i.id,
				i.inspection_no,
				i.inspection_date,
				i.inspection_type,
				i.unit_id,
				i.unit_type,
				i.police_no,
				i.driver_id,
				k.nama_karyawan as driver_name,
				i.odometer,
				i.defect_count,
				i.status,
				i.wo_no,
				i.inspector_name,
				i.driver_health,
				w.status as wo_status
			FROM fleet.vehicle_inspections i
			LEFT JOIN master.m_karyawan k ON i.driver_id = k.payroll_id
			LEFT JOIN fleet.work_orders w ON i.wo_no = w.wo_no
			WHERE 1=1
			${statusCondition}
			${searchCondition}
			ORDER BY i.inspection_date DESC
			LIMIT ${perPage} OFFSET ${offset}
		`;

		// 2. Fetch total count
		const totalCountQuery = await sql`
			SELECT COUNT(*) as total
			FROM fleet.vehicle_inspections i
			WHERE 1=1
			${statusCondition}
			${searchCondition}
		`;
		const total = parseInt(totalCountQuery[0]?.total || '0');

		// 3. Global inspection metrics
		const metricsQuery = await sql`
			SELECT 
				COUNT(*) as total_count,
				COUNT(*) FILTER (WHERE status = 'PASSED' OR status = 'LAYAK') as passed_count,
				COUNT(*) FILTER (WHERE status = 'LAYAK_DENGAN_CATATAN') as notes_count,
				COUNT(*) FILTER (WHERE status = 'FAILED_DEFECT' OR status = 'TIDAK_LAYAK') as defect_count,
				COUNT(*) FILTER (WHERE status = 'RE_INSPECTED' OR status = 'CLOSED') as closed_count
			FROM fleet.vehicle_inspections
		`;

		return {
			records: records.map(r => ({
				id: r.id,
				inspectionNo: r.inspection_no,
				date: r.inspection_date ? new Date(r.inspection_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
				type: r.inspection_type || 'MASUK_KELUAR',
				unitId: r.unit_id,
				unitType: r.unit_type || 'DT',
				policeNo: r.police_no || r.unit_id,
				driverName: r.driver_name || r.driver_id || 'Tanpa Driver',
				odometer: r.odometer ? r.odometer.toLocaleString('id-ID') : '-',
				defectCount: r.defect_count || 0,
				status: r.status,
				woNo: r.wo_no,
				woStatus: r.wo_status,
				inspector: r.inspector_name,
				driverFit: r.driver_health?.is_fit ?? true
			})),
			meta: {
				currentPage: page,
				perPage,
				total,
				totalPages: Math.max(1, Math.ceil(total / perPage))
			},
			metrics: {
				total: parseInt(metricsQuery[0]?.total_count || '0'),
				passed: parseInt(metricsQuery[0]?.passed_count || '0'),
				notes: parseInt(metricsQuery[0]?.notes_count || '0'),
				defected: parseInt(metricsQuery[0]?.defect_count || '0'),
				closed: parseInt(metricsQuery[0]?.closed_count || '0')
			}
		};

	} catch (error) {
		console.error("Database error loading inspections:", error);
		return {
			records: [],
			meta: { currentPage: 1, perPage: 10, total: 0, totalPages: 1 },
			metrics: { total: 0, passed: 0, notes: 0, defected: 0, closed: 0 }
		};
	}
};
