import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ url }) => {
	const year = url.searchParams.get('year') || new Date().getFullYear().toString();

	try {
		// 1. Costs aggregated by unit
		const unitCosts = await sql`
			SELECT 
				COALESCE(h.target_unit, w.unit_id, 'Other') as unit_id,
				COUNT(DISTINCT h.wo_no) as total_wo,
				COUNT(d.id) as total_parts_used,
				COALESCE(SUM(d.total), 0) as total_cost
			FROM fleet.maintenance_dn_header h
			JOIN fleet.maintenance_dn_detail d ON h.dn_no = d.dn_no
			LEFT JOIN fleet.work_orders w ON h.wo_no = w.wo_no
			WHERE EXTRACT(YEAR FROM h.dn_date) = ${year}
			GROUP BY COALESCE(h.target_unit, w.unit_id, 'Other')
			ORDER BY total_cost DESC
		`;

		// 2. Costs aggregated by month
		const monthlyCosts = await sql`
			SELECT 
				EXTRACT(MONTH FROM h.dn_date) as month_num,
				COALESCE(SUM(d.total), 0) as monthly_total
			FROM fleet.maintenance_dn_header h
			JOIN fleet.maintenance_dn_detail d ON h.dn_no = d.dn_no
			WHERE EXTRACT(YEAR FROM h.dn_date) = ${year}
			GROUP BY EXTRACT(MONTH FROM h.dn_date)
			ORDER BY month_num ASC
		`;

		// 3. Top expensive spareparts used
		const topParts = await sql`
			SELECT 
				COALESCE(m.name, 'Item ' || d.material_id) as item_name,
				COALESCE(m.material_code, d.material_id) as material_code,
				SUM(COALESCE(d.qty_actual, d.qty_request, 0)) as total_qty,
				COALESCE(m.uom, 'PCS') as uom,
				SUM(d.total) as total_spend
			FROM fleet.maintenance_dn_detail d
			JOIN fleet.maintenance_dn_header h ON d.dn_no = h.dn_no
			LEFT JOIN master.m_materials m ON 
				CASE 
					WHEN d.material_id ~ '^[0-9]+$' THEN m.id = d.material_id::integer 
					ELSE m.material_code = d.material_id 
				END
			WHERE EXTRACT(YEAR FROM h.dn_date) = ${year}
			GROUP BY COALESCE(m.name, 'Item ' || d.material_id), COALESCE(m.material_code, d.material_id), COALESCE(m.uom, 'PCS')
			ORDER BY total_spend DESC
			LIMIT 8
		`;

		const totalExpenditure = unitCosts.reduce((acc, u) => acc + Number(u.total_cost || 0), 0);
		const totalWoHandled = unitCosts.reduce((acc, u) => acc + parseInt(u.total_wo || '0'), 0);

		return {
			year,
			unitCosts: unitCosts.map(u => ({
				unitId: u.unit_id,
				totalWo: parseInt(u.total_wo || '0'),
				partsCount: parseInt(u.total_parts_used || '0'),
				cost: Number(u.total_cost)
			})),
			topParts: topParts.map(p => ({
				name: p.item_name,
				code: p.material_code || '-',
				qty: Number(p.total_qty),
				uom: p.uom,
				totalSpend: Number(p.total_spend)
			})),
			summary: {
				totalExpenditure,
				totalWoHandled,
				avgPerUnit: unitCosts.length > 0 ? Math.round(totalExpenditure / unitCosts.length) : 0,
				unitsCount: unitCosts.length
			}
		};

	} catch (error) {
		console.error("Database error loading cost report:", error);
		return {
			year,
			unitCosts: [],
			topParts: [],
			summary: { totalExpenditure: 0, totalWoHandled: 0, avgPerUnit: 0, unitsCount: 0 }
		};
	}
};
