import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString());
		const groupBy = url.searchParams.get('groupBy') || 'PROJECT'; // PROJECT, SITE, VENDOR, MATERIAL

		let rawData: any[] = [];

		if (groupBy === 'PROJECT') {
			rawData = await sql`
				SELECT 
					COALESCE(p.project_name, 'Non-Project / General') as entity_name,
					COALESCE(p.project_code, 'PRJ-GEN') as entity_code,
					EXTRACT(MONTH FROM po.date)::int as month,
					SUM(po.total_amount) as total
				FROM procurement.purchase_order po
				LEFT JOIN master.m_project p ON p.id = po.project_id
				WHERE EXTRACT(YEAR FROM po.date) = ${year}
				GROUP BY p.project_name, p.project_code, EXTRACT(MONTH FROM po.date)
				ORDER BY entity_name
			`;
		} else if (groupBy === 'VENDOR') {
			rawData = await sql`
				SELECT 
					c.nama_kustomer as entity_name,
					c.kode_kustomer as entity_code,
					EXTRACT(MONTH FROM po.date)::int as month,
					SUM(po.total_amount) as total
				FROM procurement.purchase_order po
				LEFT JOIN master.m_customer c ON c.id = po.vendor_id
				WHERE EXTRACT(YEAR FROM po.date) = ${year}
				GROUP BY c.nama_kustomer, c.kode_kustomer, EXTRACT(MONTH FROM po.date)
				ORDER BY entity_name
			`;
		} else if (groupBy === 'SITE') {
			rawData = await sql`
				SELECT 
					COALESCE(l.loc_name, 'Gudang Pusat') as entity_name,
					COALESCE(l.alias, l.loc_code, 'WHS') as entity_code,
					EXTRACT(MONTH FROM po.date)::int as month,
					SUM(po.total_amount) as total
				FROM procurement.purchase_order po
				LEFT JOIN master.m_lokasi l ON l.id = po.site_id
				WHERE EXTRACT(YEAR FROM po.date) = ${year}
				GROUP BY l.loc_name, l.alias, l.loc_code, EXTRACT(MONTH FROM po.date)
				ORDER BY entity_name
			`;
		} else { // MATERIAL
			rawData = await sql`
				SELECT 
					m.name as entity_name,
					m.material_code as entity_code,
					EXTRACT(MONTH FROM po.date)::int as month,
					SUM(pol.total) as total
				FROM procurement.purchase_order_line pol
				JOIN procurement.purchase_order po ON po.id = pol.po_id
				JOIN master.m_materials m ON m.id = pol.item_id
				WHERE EXTRACT(YEAR FROM po.date) = ${year}
				GROUP BY m.name, m.material_code, EXTRACT(MONTH FROM po.date)
				ORDER BY entity_name
			`;
		}

		// Pivot month 1..12 into structured map
		const matrixMap = new Map<string, {
			name: string;
			code: string;
			months: number[];
			total: number;
		}>();

		for (const r of rawData) {
			const key = r.entity_name;
			if (!matrixMap.has(key)) {
				matrixMap.set(key, {
					name: r.entity_name,
					code: r.entity_code || '-',
					months: Array(12).fill(0),
					total: 0
				});
			}
			const entry = matrixMap.get(key)!;
			const mIdx = (parseInt(r.month) || 1) - 1;
			const amount = parseFloat(r.total) || 0;
			if (mIdx >= 0 && mIdx < 12) {
				entry.months[mIdx] = amount;
			}
			entry.total += amount;
		}

		const rows = Array.from(matrixMap.values());

		// Calculate Column Totals for 12 months + grand total
		const monthTotals = Array(12).fill(0);
		let grandTotal = 0;
		for (const r of rows) {
			for (let i = 0; i < 12; i++) {
				monthTotals[i] += r.months[i];
			}
			grandTotal += r.total;
		}

		return {
			year,
			groupBy,
			rows,
			monthTotals,
			grandTotal
		};
	} catch (err: any) {
		console.error('Error loading Yearly Matrix Report:', err);
		return {
			year: new Date().getFullYear(),
			groupBy: 'PROJECT',
			rows: [],
			monthTotals: Array(12).fill(0),
			grandTotal: 0
		};
	}
};
