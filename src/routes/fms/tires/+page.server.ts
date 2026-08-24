import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = url.searchParams.get('search') || '';
		const status = url.searchParams.get('status') || 'All';
		const selectedUnitParam = url.searchParams.get('unit');

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
		const units = await sql<{ id: string; nomor_unit: string; display_name: string; nama_tipe: string; axle_config: string }[]>`
			SELECT DISTINCT 
				u.id, 
				u.nomor_unit, 
				COALESCE(u.no_lambung, u.nomor_unit, u.id::text) AS display_name, 
				tu.nama_tipe, 
				COALESCE(mu.axle_config, '6x4') AS axle_config
			FROM fleet.tire_positions tp
			JOIN fleet.unit u ON (u.id::text = tp.unit_id OR u.nomor_unit = tp.unit_id OR u.no_lambung = tp.unit_id)
			JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
			JOIN master.m_tipe_unit tu ON tu.id = mu.tipe_unit_id
			ORDER BY u.id ASC
		`;

		// 3. Fetch all active fleet units for assignment dropdown
		const allFleetUnits = await sql<{ id: string; nomor_unit: string; display_name: string; nama_tipe: string; axle_config: string }[]>`
			SELECT 
				u.id, 
				u.nomor_unit, 
				COALESCE(u.no_lambung, u.nomor_unit, u.id::text) AS display_name, 
				tu.nama_tipe, 
				COALESCE(mu.axle_config, '6x4') AS axle_config
			FROM fleet.unit u
			JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
			JOIN master.m_tipe_unit tu ON tu.id = mu.tipe_unit_id
			WHERE u.deleted_at IS NULL
			ORDER BY u.nomor_unit ASC
			LIMIT 50
		`;

		// 4. Fetch tire materials catalog from master.m_materials
		const materialCatalog = await sql<{
			id: number;
			material_code: string;
			name: string;
			type_code: string;
			type_name: string;
			uom: string;
			standard_price: string;
		}[]>`
			SELECT 
				m.id,
				m.material_code,
				m.name,
				m.type_code,
				COALESCE(t.name, m.type_code, 'TIRE') AS type_name,
				m.uom,
				COALESCE(m.standard_price, 0) AS standard_price
			FROM master.m_materials m
			LEFT JOIN master.m_material_types t ON m.type_code = t.code
			WHERE LOWER(m.name) LIKE '%ban%' 
			   OR LOWER(m.name) LIKE '%tire%' 
			   OR LOWER(m.name) LIKE '%tyre%'
			   OR LOWER(m.name) LIKE '%radial%'
			   OR LOWER(COALESCE(m.type_code, '')) LIKE '%ban%'
			   OR LOWER(COALESCE(m.type_code, '')) LIKE '%tire%'
			   OR LOWER(COALESCE(m.type_code, '')) LIKE '%retread%'
			ORDER BY m.name ASC
			LIMIT 100
		`;

		// 5. Determine active selected unit
		const activeUnitObj = units.find(u => 
			u.id.toString() === selectedUnitParam || 
			u.nomor_unit === selectedUnitParam ||
			u.display_name === selectedUnitParam
		) || units[0];

		const activeUnitId = activeUnitObj ? activeUnitObj.id.toString() : (selectedUnitParam || '40');
		const activeUnitNomor = activeUnitObj ? activeUnitObj.nomor_unit : '';

		// 6. Fetch current wheel layout for the selected unit
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
			WHERE tp.unit_id = ${activeUnitId} OR tp.unit_id = ${activeUnitNomor}
			ORDER BY tp.axle_index ASC, tp.position_code ASC
		`;

		// 7. Fetch master table list
		let tires;
		if (status !== 'All' && search) {
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
				LIMIT 50
			`;
		} else if (status !== 'All') {
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
				LIMIT 50
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
				LIMIT 50
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
			allFleetUnits,
			materialCatalog,
			selectedUnitId: activeUnitId,
			activeUnit: activeUnitObj,
			wheelPositions: unitWheelPositions,
			tires
		};
	} catch (err: any) {
		console.error('Error loading TMS page:', err);
		return {
			metrics: { total: 0, mounted: 0, spareStock: 0, retreading: 0, scrapped: 0, criticalTread: 0 },
			units: [],
			allFleetUnits: [],
			materialCatalog: [],
			selectedUnitId: '',
			activeUnit: null,
			wheelPositions: [],
			tires: []
		};
	}
};
