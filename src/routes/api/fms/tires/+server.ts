import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const status = url.searchParams.get('status');
		const search = url.searchParams.get('search');
		const limit = parseInt(url.searchParams.get('limit') || '50', 10);
		const offset = parseInt(url.searchParams.get('offset') || '0', 10);

		// Dynamic query
		let tires;
		if (status && status !== 'All' && search) {
			const s = `%${search.toLowerCase()}%`;
			tires = await sql`
				SELECT 
					t.*, 
					tp.unit_id, 
					tp.position_code,
					COALESCE(u.nomor_unit, u.no_lambung, tp.unit_id) AS unit_display_name
				FROM fleet.tires t
				LEFT JOIN fleet.tire_positions tp ON tp.tire_id = t.id
				LEFT JOIN fleet.unit u ON (u.id::text = tp.unit_id OR u.nomor_unit = tp.unit_id)
				WHERE t.status = ${status}
				  AND (LOWER(t.serial_number) LIKE ${s} OR LOWER(t.brand) LIKE ${s} OR LOWER(COALESCE(u.nomor_unit, tp.unit_id, '')) LIKE ${s})
				ORDER BY t.id DESC
				LIMIT ${limit} OFFSET ${offset}
			`;
		} else if (status && status !== 'All') {
			tires = await sql`
				SELECT 
					t.*, 
					tp.unit_id, 
					tp.position_code,
					COALESCE(u.nomor_unit, u.no_lambung, tp.unit_id) AS unit_display_name
				FROM fleet.tires t
				LEFT JOIN fleet.tire_positions tp ON tp.tire_id = t.id
				LEFT JOIN fleet.unit u ON (u.id::text = tp.unit_id OR u.nomor_unit = tp.unit_id)
				WHERE t.status = ${status}
				ORDER BY t.id DESC
				LIMIT ${limit} OFFSET ${offset}
			`;
		} else if (search) {
			const s = `%${search.toLowerCase()}%`;
			tires = await sql`
				SELECT 
					t.*, 
					tp.unit_id, 
					tp.position_code,
					COALESCE(u.nomor_unit, u.no_lambung, tp.unit_id) AS unit_display_name
				FROM fleet.tires t
				LEFT JOIN fleet.tire_positions tp ON tp.tire_id = t.id
				LEFT JOIN fleet.unit u ON (u.id::text = tp.unit_id OR u.nomor_unit = tp.unit_id)
				WHERE (LOWER(t.serial_number) LIKE ${s} OR LOWER(t.brand) LIKE ${s} OR LOWER(COALESCE(u.nomor_unit, tp.unit_id, '')) LIKE ${s})
				ORDER BY t.id DESC
				LIMIT ${limit} OFFSET ${offset}
			`;
		} else {
			tires = await sql`
				SELECT 
					t.*, 
					tp.unit_id, 
					tp.position_code,
					COALESCE(u.nomor_unit, u.no_lambung, tp.unit_id) AS unit_display_name
				FROM fleet.tires t
				LEFT JOIN fleet.tire_positions tp ON tp.tire_id = t.id
				LEFT JOIN fleet.unit u ON (u.id::text = tp.unit_id OR u.nomor_unit = tp.unit_id)
				ORDER BY t.id DESC
				LIMIT ${limit} OFFSET ${offset}
			`;
		}

		// Calculate metrics summary
		const [metrics] = await sql<[{
			total_tires: string;
			mounted_count: string;
			spare_stock_count: string;
			retreading_count: string;
			scrapped_count: string;
			critical_tread_count: string;
		}]>`
			SELECT
				COUNT(*)                                                      AS total_tires,
				COUNT(*) FILTER (WHERE status = 'MOUNTED')                   AS mounted_count,
				COUNT(*) FILTER (WHERE status = 'SPARE_STOCK')               AS spare_stock_count,
				COUNT(*) FILTER (WHERE status = 'RETREADING')               AS retreading_count,
				COUNT(*) FILTER (WHERE status = 'SCRAPPED')                  AS scrapped_count,
				COUNT(*) FILTER (WHERE current_tread_depth_mm < 4.0 AND status = 'MOUNTED') AS critical_tread_count
			FROM fleet.tires
		`;

		return json({
			success: true,
			data: tires,
			metrics: {
				total: Number(metrics?.total_tires || 0),
				mounted: Number(metrics?.mounted_count || 0),
				spareStock: Number(metrics?.spare_stock_count || 0),
				retreading: Number(metrics?.retreading_count || 0),
				scrapped: Number(metrics?.scrapped_count || 0),
				criticalTread: Number(metrics?.critical_tread_count || 0)
			}
		});
	} catch (err: any) {
		console.error('Error fetching tires:', err);
		return json({ success: false, message: err.message }, { status: 500 });
	}
};
