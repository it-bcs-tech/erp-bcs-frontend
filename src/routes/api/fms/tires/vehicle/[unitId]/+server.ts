import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const unitId = params.unitId;

		const positions = await sql<{
			position_code: string;
			axle_index: number;
			installed_at: string;
			installed_odometer_km: string;
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
			notes: string;
		}[]>`
			SELECT 
				tp.position_code,
				tp.axle_index,
				tp.installed_at,
				tp.installed_odometer_km,
				t.id AS tire_id,
				t.serial_number,
				t.brand,
				t.size_spec,
				t.pattern_type,
				t.retread_count,
				t.current_tread_depth_mm,
				t.original_tread_depth_mm,
				t.total_km_run,
				t.cost_per_km,
				t.notes
			FROM fleet.tire_positions tp
			LEFT JOIN fleet.tires t ON t.id = tp.tire_id
			WHERE tp.unit_id = ${unitId}
			   OR tp.unit_id IN (SELECT id::text FROM fleet.unit WHERE nomor_unit = ${unitId} OR no_lambung = ${unitId})
			   OR tp.unit_id IN (SELECT nomor_unit FROM fleet.unit WHERE id::text = ${unitId})
			ORDER BY tp.axle_index ASC, tp.position_code ASC
		`;

		return json({
			success: true,
			data: {
				unit_id: unitId,
				positions
			}
		});
	} catch (err: any) {
		console.error('Error fetching vehicle tires layout:', err);
		return json({ success: false, message: err.message }, { status: 500 });
	}
};
