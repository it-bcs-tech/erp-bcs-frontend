import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ url }) => {
	try {
		// Read filters from URL params
		const search = url.searchParams.get('search') || '';
		const status = url.searchParams.get('status') || 'All';
		const startDate = url.searchParams.get('startDate') || '';
		const endDate = url.searchParams.get('endDate') || '';

		// Dynamic Query
		let conditions = [];
		let params = [];

		if (search) {
			params.push(`%${search.toLowerCase()}%`);
			conditions.push(`(lower(o.id) LIKE $${params.length} OR lower(c.nama_kustomer) LIKE $${params.length})`);
		}

		if (status !== 'All') {
			params.push(status);
			conditions.push(`o.status = $${params.length}`);
		}

		if (startDate) {
			params.push(startDate);
			conditions.push(`o.tgl_muat >= $${params.length}::date`);
		}

		if (endDate) {
			params.push(endDate);
			conditions.push(`o.tgl_muat <= $${params.length}::date`);
		}

		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

		const query = `
			SELECT 
				o.id as "orderId",
				c.nama_kustomer as customer,
				ori.nama_kustomer as origin,
				dest.nama_kustomer as destination,
				tu.nama_tipe as vehicle,
				o.jenis_muatan as "cargoType",
				o.berat_muatan as weight,
				o.tgl_muat as "loadDate",
				o.tgl_bongkar as "unloadDate",
				COALESCE(o.tariff, 0) as tariff,
				COALESCE(o.estimated_ujo, 0) as ujo,
				o.status
			FROM marketing.sales_order o
			LEFT JOIN master.m_customer c ON c.id = o.customer_id
			LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
			LEFT JOIN master.m_tipe_unit tu ON tu.id = o.tipe_unit_id
			${whereClause}
			ORDER BY o.created_at DESC
		`;

		const reportsResult = await sql.unsafe(query, params);

		// Calculate Totals
		let totalRevenue = 0;
		let totalUjo = 0;
		let totalOrders = reportsResult.length;
		
		reportsResult.forEach(row => {
			totalRevenue += parseFloat(row.tariff) || 0;
			totalUjo += parseFloat(row.ujo) || 0;
		});

		const summary = {
			totalOrders,
			totalRevenue,
			totalUjo,
			margin: totalRevenue - totalUjo
		};

		return {
			reports: reportsResult as any[],
			summary,
			filters: { search, status, startDate, endDate }
		};
	} catch (error) {
		console.error("Error loading marketing reports:", error);
		return { 
			reports: [],
			summary: { totalOrders: 0, totalRevenue: 0, totalUjo: 0, margin: 0 },
			filters: { search: '', status: 'All', startDate: '', endDate: '' }
		};
	}
};
