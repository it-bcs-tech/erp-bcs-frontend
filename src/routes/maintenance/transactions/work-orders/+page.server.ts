import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

function parseJsonSafe<T>(val: any, fallback: T): T {
	if (!val) return fallback;
	let curr = val;
	while (typeof curr === 'string') {
		try {
			curr = JSON.parse(curr);
		} catch {
			break;
		}
	}
	return (curr ?? fallback) as T;
}

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const statusFilter = url.searchParams.get('status') || 'All';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const perPage = 10;
	const offset = (page - 1) * perPage;

	try {
		let statusCondition = sql``;
		if (statusFilter !== 'All') {
			if (statusFilter === 'ACTIVE') {
				statusCondition = sql`AND w.status NOT IN ('Closed', 'CLOSED', 'Cancelled', 'CANCELLED')`;
			} else if (statusFilter === 'READY_FOR_REINSPECTION') {
				statusCondition = sql`AND (w.status = 'READY_FOR_REINSPECTION' OR w.status ILIKE '%reinspect%')`;
			} else {
				statusCondition = sql`AND w.status = ${statusFilter}`;
			}
		}

		let searchCondition = sql``;
		if (search) {
			searchCondition = sql`AND (
				w.wo_no ILIKE ${'%' + search + '%'} OR 
				w.unit_id ILIKE ${'%' + search + '%'} OR 
				w.keluhan_driver ILIKE ${'%' + search + '%'} OR
				u.nama_karyawan ILIKE ${'%' + search + '%'} OR
				w.inspection_no ILIKE ${'%' + search + '%'}
			)`;
		}

		// 1. Fetch Records
		const records = await sql`
			SELECT 
				w.id,
				w.wo_no,
				w.unit_id,
				w.keluhan_driver,
				w.maint_category,
				w.status,
				w.wo_date,
				w.closed_at,
				w.mechanic_id,
				COALESCE(u.nama_karyawan, w.mechanic_id) as mechanic_name,
				w.inspection_no,
				w.repaired_items,
				w.checklist_items,
				COALESCE((
					SELECT SUM(d.total)
					FROM fleet.maintenance_dn_header h
					JOIN fleet.maintenance_dn_detail d ON h.dn_no = d.dn_no
					WHERE h.wo_no = w.wo_no
				), 0) as cost_numeric
			FROM fleet.work_orders w
			LEFT JOIN master.m_karyawan u ON w.mechanic_id = u.payroll_id
			WHERE 1=1
			${statusCondition}
			${searchCondition}
			ORDER BY w.wo_date DESC
			LIMIT ${perPage} OFFSET ${offset}
		`;

		// 2. Fetch Total Count
		const totalCountQuery = await sql`
			SELECT COUNT(*) as total
			FROM fleet.work_orders w
			LEFT JOIN master.m_karyawan u ON w.mechanic_id = u.payroll_id
			WHERE 1=1
			${statusCondition}
			${searchCondition}
		`;
		const total = parseInt(totalCountQuery[0]?.total || '0');

		// 3. Global Metrics
		const metricsQuery = await sql`
			SELECT 
				COUNT(*) as total_count,
				COUNT(*) FILTER (WHERE status = 'Open' OR status = 'PENDING_ASSIGNMENT') as pending_count,
				COUNT(*) FILTER (WHERE status ILIKE '%proses%' OR status ILIKE '%progress%') as progress_count,
				COUNT(*) FILTER (WHERE status = 'DISPENSATION_ACTIVE') as dispensation_count,
				COUNT(*) FILTER (WHERE status = 'READY_FOR_REINSPECTION' OR status ILIKE '%reinspect%') as reinspect_count,
				COUNT(*) FILTER (WHERE status ILIKE '%close%' OR status ILIKE '%complete%') as closed_count
			FROM fleet.work_orders
		`;

		const formattedRecords = records.map(r => {
			const rawRepaired = parseJsonSafe(r.repaired_items, []);
			const rawChecklist = parseJsonSafe(r.checklist_items, []);
			let items: any[] = Array.isArray(rawRepaired) && rawRepaired.length > 0
				? rawRepaired
				: (Array.isArray(rawChecklist) ? rawChecklist : []);

			const totalItems = items.length;
			const resolvedItems = items.filter((i: any) => i.status === 'RESOLVED' || i.status === 'OK').length;

			return {
				id: r.id,
				woNo: r.wo_no,
				unitId: r.unit_id || 'Tanpa Unit',
				complaint: r.keluhan_driver || '-',
				category: r.maint_category || 'Regular Repair',
				status: r.status || 'Open',
				date: r.wo_date ? new Date(r.wo_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
				closedDate: r.closed_at ? new Date(r.closed_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
				mechanic: r.mechanic_name || 'Belum Ditugaskan',
				inspectionNo: r.inspection_no || null,
				itemProgress: { total: totalItems, resolved: resolvedItems },
				cost: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(r.cost_numeric)
			};
		});

		return {
			records: formattedRecords,
			meta: {
				currentPage: page,
				perPage,
				total,
				totalPages: Math.max(1, Math.ceil(total / perPage))
			},
			metrics: {
				total: parseInt(metricsQuery[0]?.total_count || '0'),
				pending: parseInt(metricsQuery[0]?.pending_count || '0'),
				progress: parseInt(metricsQuery[0]?.progress_count || '0'),
				dispensation: parseInt(metricsQuery[0]?.dispensation_count || '0'),
				reinspect: parseInt(metricsQuery[0]?.reinspect_count || '0'),
				closed: parseInt(metricsQuery[0]?.closed_count || '0')
			}
		};

	} catch (error) {
		console.error("Database error loading work orders:", error);
		return {
			records: [],
			meta: { currentPage: 1, perPage: 10, total: 0, totalPages: 1 },
			metrics: { total: 0, pending: 0, progress: 0, dispensation: 0, reinspect: 0, closed: 0 }
		};
	}
};
