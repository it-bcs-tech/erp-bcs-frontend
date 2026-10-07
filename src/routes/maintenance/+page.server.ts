import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// 1. Metric: Active Work Orders
		const woMetrics = await sql`
			SELECT 
				COUNT(*) as total_active,
				COUNT(*) FILTER (WHERE status = 'Open' OR status = 'PENDING_ASSIGNMENT') as pending_assign,
				COUNT(*) FILTER (WHERE status ILIKE '%proses%' OR status ILIKE '%progress%') as in_progress,
				COUNT(*) FILTER (WHERE status = 'READY_FOR_REINSPECTION' OR status ILIKE '%reinspect%') as ready_for_reinspection,
				COUNT(*) FILTER (WHERE status ILIKE '%close%' OR status ILIKE '%complete%') as closed_total
			FROM fleet.work_orders
		`;

		// 2. Metric: Units currently in workshop/maintenance
		const unitInWorkshopQuery = await sql`
			SELECT COUNT(DISTINCT unit_id) as count 
			FROM fleet.work_orders 
			WHERE status NOT IN ('Closed', 'CLOSED', 'Cancelled', 'CANCELLED', 'Batal')
		`;

		// 3. Metric: Inspections Today & Defect Count
		const inspectionMetrics = await sql`
			SELECT 
				COUNT(*) as total_inspections,
				COUNT(*) FILTER (WHERE status = 'PASSED') as passed,
				COUNT(*) FILTER (WHERE status = 'FAILED_DEFECT') as failed_defect
			FROM fleet.vehicle_inspections
			WHERE inspection_date >= CURRENT_DATE
		`;

		// 4. Metric: PM Schedules Overdue/Due
		const pmMetrics = await sql`
			SELECT 
				COUNT(*) FILTER (WHERE status = 'DUE') as due,
				COUNT(*) FILTER (WHERE status = 'OVERDUE') as overdue,
				COUNT(*) FILTER (WHERE status = 'ACTIVE') as active
			FROM fleet.maintenance_schedules
		`;

		// 5. Active Work Orders in Workshop (Limit 6)
		const activeWorkOrders = await sql`
			SELECT 
				w.id,
				w.wo_no,
				w.unit_id,
				w.maint_category,
				w.keluhan_driver,
				w.status,
				w.wo_date,
				COALESCE(u.nama_karyawan, w.mechanic_id) as mechanic_name,
				w.inspection_no,
				w.repaired_items,
				COALESCE((
					SELECT SUM(d.total) 
					FROM fleet.maintenance_dn_header h
					JOIN fleet.maintenance_dn_detail d ON h.dn_no = d.dn_no
					WHERE h.wo_no = w.wo_no
				), 0) as cost_numeric
			FROM fleet.work_orders w
			LEFT JOIN master.m_karyawan u ON w.mechanic_id = u.payroll_id
			WHERE w.status NOT IN ('Closed', 'CLOSED', 'Cancelled', 'CANCELLED')
			ORDER BY w.wo_date DESC
			LIMIT 6
		`;

		// 6. Recent Inspections (Limit 5)
		const recentInspections = await sql`
			SELECT 
				i.id,
				i.inspection_no,
				i.inspection_date,
				i.unit_id,
				i.unit_type,
				i.driver_id,
				i.defect_count,
				i.status,
				i.wo_no,
				i.inspector_name
			FROM fleet.vehicle_inspections i
			ORDER BY i.inspection_date DESC
			LIMIT 5
		`;

		// 7. PM Overdue / Due list (Limit 5)
		const dueSchedules = await sql`
			SELECT 
				s.id,
				s.unit_id,
				s.service_type,
				s.target_km,
				s.target_date,
				s.status,
				u.odometer as current_km
			FROM fleet.maintenance_schedules s
			LEFT JOIN fleet.unit u ON s.unit_id = u.nomor_unit
			WHERE s.status IN ('DUE', 'OVERDUE')
			ORDER BY s.target_date ASC NULLS LAST
			LIMIT 5
		`;

		return {
			metrics: {
				totalActiveWO: parseInt(woMetrics[0]?.total_active || '0'),
				pendingAssign: parseInt(woMetrics[0]?.pending_assign || '0'),
				inProgress: parseInt(woMetrics[0]?.in_progress || '0'),
				readyForReinspection: parseInt(woMetrics[0]?.ready_for_reinspection || '0'),
				closedTotal: parseInt(woMetrics[0]?.closed_total || '0'),
				unitsInWorkshop: parseInt(unitInWorkshopQuery[0]?.count || '0'),
				inspectionsToday: parseInt(inspectionMetrics[0]?.total_inspections || '0'),
				passedInspections: parseInt(inspectionMetrics[0]?.passed || '0'),
				defectedInspections: parseInt(inspectionMetrics[0]?.failed_defect || '0'),
				pmDue: parseInt(pmMetrics[0]?.due || '0'),
				pmOverdue: parseInt(pmMetrics[0]?.overdue || '0')
			},
			activeWorkOrders: activeWorkOrders.map(r => ({
				id: r.id,
				woNo: r.wo_no,
				unitId: r.unit_id || '-',
				category: r.maint_category || 'General Repair',
				complaint: r.keluhan_driver || '-',
				status: r.status || 'Open',
				date: r.wo_date ? new Date(r.wo_date).toLocaleDateString('id-ID') : '-',
				mechanic: r.mechanic_name || 'Belum Ditugaskan',
				inspectionNo: r.inspection_no || null,
				repairedItems: r.repaired_items || [],
				cost: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(r.cost_numeric)
			})),
			recentInspections: recentInspections.map(r => ({
				id: r.id,
				inspectionNo: r.inspection_no,
				unitId: r.unit_id,
				unitType: r.unit_type,
				date: r.inspection_date ? new Date(r.inspection_date).toLocaleDateString('id-ID') : '-',
				defects: r.defect_count || 0,
				status: r.status,
				woNo: r.wo_no,
				inspector: r.inspector_name
			})),
			dueSchedules: dueSchedules.map(r => ({
				id: r.id,
				unitId: r.unit_id,
				serviceType: r.service_type,
				targetKm: r.target_km,
				targetDate: r.target_date ? new Date(r.target_date).toLocaleDateString('id-ID') : '-',
				status: r.status,
				currentKm: r.current_km || 0
			}))
		};
	} catch (error) {
		console.error("Database error loading Maintenance Dashboard:", error);
		return {
			metrics: {
				totalActiveWO: 0,
				pendingAssign: 0,
				inProgress: 0,
				readyForReinspection: 0,
				closedTotal: 0,
				unitsInWorkshop: 0,
				inspectionsToday: 0,
				passedInspections: 0,
				defectedInspections: 0,
				pmDue: 0,
				pmOverdue: 0
			},
			activeWorkOrders: [],
			recentInspections: [],
			dueSchedules: []
		};
	}
};
