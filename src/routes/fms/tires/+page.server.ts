import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = url.searchParams.get('search') || '';
		const status = url.searchParams.get('status') || 'All';
		const selectedUnitId = url.searchParams.get('unit') || 'DT-01';

		// 1. Fetch KPI metrics
		const [metricsRow] = await sql<[{
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

		// 2. Fetch list of units that have tires mounted
		const units = await sql<{ id: string; nomor_polisi: string; nama_tipe: string }[]>`
			SELECT DISTINCT u.id, u.id AS nomor_polisi, tu.nama_tipe
			FROM fleet.tire_positions tp
			JOIN fleet.unit u ON u.id = tp.unit_id
			JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
			JOIN master.m_tipe_unit tu ON tu.id = mu.tipe_unit_id
			ORDER BY u.id ASC
		`;

		// 3. Fetch current wheel layout for the selected unit
		const activeUnit = selectedUnitId || (units[0]?.id ?? 'DT-01');
		const unitWheelPositions = await sql<{
			position_code: string;
			axle_index: number;
			tire_id: number;
			serial_number: string;
			brand: string;
			size_spec: string;
			pattern_type: string;
			retread_count: number;
			current_tread_depth_mm: string;
			original_tread_depth_mm: string;
			total_km_run: string;
			cost_per_km: string;
		}[]>`
			SELECT 
				tp.position_code,
				tp.axle_index,
				t.id AS tire_id,
				t.serial_number,
				t.brand,
				t.size_spec,
				t.pattern_type,
				t.retread_count,
				t.current_tread_depth_mm,
				t.original_tread_depth_mm,
				t.total_km_run,
				t.cost_per_km
			FROM fleet.tire_positions tp
			LEFT JOIN fleet.tires t ON t.id = tp.tire_id
			WHERE tp.unit_id = ${activeUnit}
			ORDER BY tp.axle_index ASC, tp.position_code ASC
		`;

		// 4. Fetch master table list
		let tires;
		if (status !== 'All' && search) {
			const s = `%${search.toLowerCase()}%`;
			tires = await sql`
				SELECT t.*, tp.unit_id, tp.position_code
				FROM fleet.tires t
				LEFT JOIN fleet.tire_positions tp ON tp.tire_id = t.id
				WHERE t.status = ${status}
				  AND (LOWER(t.serial_number) LIKE ${s} OR LOWER(t.brand) LIKE ${s} OR LOWER(COALESCE(tp.unit_id, '')) LIKE ${s})
				ORDER BY t.id DESC
				LIMIT 50
			`;
		} else if (status !== 'All') {
			tires = await sql`
				SELECT t.*, tp.unit_id, tp.position_code
				FROM fleet.tires t
				LEFT JOIN fleet.tire_positions tp ON tp.tire_id = t.id
				WHERE t.status = ${status}
				ORDER BY t.id DESC
				LIMIT 50
			`;
		} else if (search) {
			const s = `%${search.toLowerCase()}%`;
			tires = await sql`
				SELECT t.*, tp.unit_id, tp.position_code
				FROM fleet.tires t
				LEFT JOIN fleet.tire_positions tp ON tp.tire_id = t.id
				WHERE (LOWER(t.serial_number) LIKE ${s} OR LOWER(t.brand) LIKE ${s} OR LOWER(COALESCE(tp.unit_id, '')) LIKE ${s})
				ORDER BY t.id DESC
				LIMIT 50
			`;
		} else {
			tires = await sql`
				SELECT t.*, tp.unit_id, tp.position_code
				FROM fleet.tires t
				LEFT JOIN fleet.tire_positions tp ON tp.tire_id = t.id
				ORDER BY t.id DESC
				LIMIT 50
			`;
		}

		return {
			metrics: {
				total: Number(metricsRow?.total_tires || 0),
				mounted: Number(metricsRow?.mounted_count || 0),
				spareStock: Number(metricsRow?.spare_stock_count || 0),
				retreading: Number(metricsRow?.retreading_count || 0),
				scrapped: Number(metricsRow?.scrapped_count || 0),
				criticalTread: Number(metricsRow?.critical_tread_count || 0)
			},
			units,
			selectedUnitId: activeUnit,
			wheelPositions: unitWheelPositions,
			tires
		};
	} catch (err: any) {
		console.error('Error loading TMS page:', err);
		return {
			metrics: { total: 0, mounted: 0, spareStock: 0, retreading: 0, scrapped: 0, criticalTread: 0 },
			units: [],
			selectedUnitId: '',
			wheelPositions: [],
			tires: []
		};
	}
};
