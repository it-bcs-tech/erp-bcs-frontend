import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ url }) => {
	const unitFilter = url.searchParams.get('unit') || '';
	const categoryFilter = url.searchParams.get('category') || 'All';
	const startDate = url.searchParams.get('startDate') || '';
	const endDate = url.searchParams.get('endDate') || '';

	try {
		let unitCondition = sql``;
		if (unitFilter) {
			unitCondition = sql`AND w.unit_id ILIKE ${'%' + unitFilter + '%'}`;
		}

		let catCondition = sql``;
		if (categoryFilter !== 'All') {
			catCondition = sql`AND w.maint_category = ${categoryFilter}`;
		}

		let dateCondition = sql``;
		if (startDate && endDate) {
			dateCondition = sql`AND w.wo_date::date BETWEEN ${startDate}::date AND ${endDate}::date`;
		}

		const records = await sql`
			SELECT 
				w.id,
				w.wo_no,
				w.unit_id,
				w.maint_category,
				w.keluhan_driver,
				w.status,
				w.wo_date,
				w.closed_at,
				w.kilometer,
				w.inspection_no,
				COALESCE(u.nama_karyawan, w.mechanic_id) as mechanic_name,
				COALESCE((
					SELECT SUM(d.total)
					FROM fleet.maintenance_dn_header h
					JOIN fleet.maintenance_dn_detail d ON h.dn_no = d.dn_no
					WHERE h.wo_no = w.wo_no
				), 0) as cost_numeric
			FROM fleet.work_orders w
			LEFT JOIN master.m_karyawan u ON w.mechanic_id = u.payroll_id
			WHERE 1=1
			${unitCondition}
			${catCondition}
			${dateCondition}
			ORDER BY w.wo_date DESC
			LIMIT 100
		`;

		// Distinct units for filter dropdown
		const units = await sql`SELECT DISTINCT unit_id FROM fleet.work_orders WHERE unit_id IS NOT NULL ORDER BY unit_id ASC`;

		const formatted = records.map(r => ({
			id: r.id,
			woNo: r.wo_no,
			unitId: r.unit_id || '-',
			category: r.maint_category || 'General Repair',
			complaint: r.keluhan_driver || '-',
			status: r.status,
			date: r.wo_date ? new Date(r.wo_date).toLocaleDateString('id-ID') : '-',
			closedDate: r.closed_at ? new Date(r.closed_at).toLocaleDateString('id-ID') : '-',
			mechanic: r.mechanic_name || '-',
			inspectionNo: r.inspection_no || '-',
			cost: Number(r.cost_numeric)
		}));

		return {
			records: formatted,
			units: units.map(u => u.unit_id),
			filters: { unitFilter, categoryFilter, startDate, endDate }
		};

	} catch (error) {
		console.error("Database error loading maintenance history report:", error);
		return { records: [], units: [], filters: { unitFilter: '', categoryFilter: 'All', startDate: '', endDate: '' } };
	}
};
