import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const statusFilter = url.searchParams.get('status') || 'All';
	const page = parseInt(url.searchParams.get('page') || '1');
	const perPage = 5;
	const start = (page - 1) * perPage;

	try {
		// Base conditions
		let statusCondition = sql``;
		if (statusFilter !== 'All') {
			statusCondition = sql`AND w.status = ${statusFilter}`;
		}

		let searchCondition = sql``;
		if (search) {
			searchCondition = sql`AND (
				w.wo_no ILIKE ${'%' + search + '%'} OR 
				w.unit_id ILIKE ${'%' + search + '%'} OR 
				w.keluhan_driver ILIKE ${'%' + search + '%'}
			)`;
		}

		// 1. Fetch Paginated Records
		const recordsQuery = await sql`
			SELECT 
				w.wo_no as id,
				w.unit_id as vehicle,
				w.keluhan_driver as type,
				w.maint_category as priority,
				w.status,
				w.wo_date as scheduledDate,
				w.closed_at as completedDate,
				COALESCE(u.nama_karyawan, w.mechanic_id) as mechanic,
				COALESCE(SUM(d.total), 0) as cost_numeric,
				w.problem as notes
			FROM fleet.work_orders w
			LEFT JOIN fleet.maintenance_dn_header h ON w.wo_no = h.wo_no
			LEFT JOIN fleet.maintenance_dn_detail d ON h.dn_no = d.dn_no
			LEFT JOIN master.m_karyawan u ON w.mechanic_id = u.payroll_id
			WHERE 1=1
			${statusCondition}
			${searchCondition}
			GROUP BY w.id, u.nama_karyawan
			ORDER BY w.wo_date DESC
			LIMIT ${perPage} OFFSET ${start}
		`;

		// Format mapping
		const formattedRecords = recordsQuery.map(r => ({
			id: r.id,
			vehicle: r.vehicle || 'Unknown Unit',
			type: r.type || 'General Service',
			priority: r.priority || 'Regular',
			status: r.status || 'Open',
			scheduledDate: r.scheduleddate ? new Date(r.scheduleddate).toLocaleDateString('id-ID') : '-',
			completedDate: r.completeddate ? new Date(r.completeddate).toLocaleDateString('id-ID') : '-',
			mechanic: r.mechanic || 'Unassigned',
			cost: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(r.cost_numeric),
			notes: r.notes || ''
		}));

		// 2. Fetch Total Count for Pagination
		const totalQuery = await sql`
			SELECT COUNT(*) as total
			FROM fleet.work_orders w
			WHERE 1=1
			${statusCondition}
			${searchCondition}
		`;
		const total = parseInt(totalQuery[0].total);

		// 3. Fetch Metrics globally (regardless of current search/filters)
		const metricsQuery = await sql`
			SELECT 
				COUNT(*) as total_count,
				COUNT(*) FILTER (WHERE status = 'Open' OR status ILIKE '%overdue%') as overdue,
				COUNT(*) FILTER (WHERE status ILIKE '%proses%' OR status ILIKE '%progress%') as in_progress,
				COUNT(*) FILTER (WHERE status ILIKE '%schedule%') as scheduled,
				COUNT(*) FILTER (WHERE status ILIKE '%close%' OR status ILIKE '%complete%') as completed
			FROM fleet.work_orders
		`;

		const metrics = {
			overdue: parseInt(metricsQuery[0].overdue) || 0,
			inProgress: parseInt(metricsQuery[0].in_progress) || 0,
			scheduled: parseInt(metricsQuery[0].scheduled) || 0,
			completedThisMonth: parseInt(metricsQuery[0].completed) || 0
		};

		return {
			records: formattedRecords,
			metrics,
			meta: { current_page: page, per_page: perPage, total }
		};

	} catch (error) {
		console.error("Database error in FMS Maintenance:", error);
		return {
			records: [],
			metrics: { overdue: 0, inProgress: 0, scheduled: 0, completedThisMonth: 0 },
			meta: { current_page: page, per_page: perPage, total: 0 }
		};
	}
};
