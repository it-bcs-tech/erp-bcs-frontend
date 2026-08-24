import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { items } = body;

		if (!items || !Array.isArray(items) || items.length === 0) {
			return json({ success: false, message: 'Data ban untuk diimpor tidak boleh kosong' }, { status: 400 });
		}

		let successCount = 0;
		let skippedCount = 0;
		const errors: string[] = [];

		for (const item of items) {
			if (!item.serial_number || !item.brand) {
				skippedCount++;
				continue;
			}

			const sn = item.serial_number.toString().trim().toUpperCase();
			const brand = item.brand.toString().trim();
			const sizeSpec = item.size_spec || '11.00R20 16PR';
			const patternType = item.pattern_type || 'ALL-POSITION';
			const currentDepth = parseFloat(item.current_tread_depth_mm) || 16.0;
			const originalDepth = parseFloat(item.original_tread_depth_mm) || 16.0;
			const purchaseCost = parseFloat(item.purchase_cost) || 0;
			const retreadCount = parseInt(item.retread_count) || 0;
			const status = (item.status || (item.unit_id ? 'MOUNTED' : 'SPARE_STOCK')).toUpperCase();
			const unitId = item.unit_id ? item.unit_id.toString().trim() : null;
			const positionCode = item.position_code ? item.position_code.toString().trim().toUpperCase() : null;
			const notes = item.notes || 'Import Massal CSV/Excel';

			try {
				const [tire] = await sql`
					INSERT INTO fleet.tires (
						serial_number, brand, size_spec, pattern_type, status,
						retread_count, current_tread_depth_mm, original_tread_depth_mm,
						purchase_cost, total_km_run, cost_per_km, notes
					) VALUES (
						${sn}, ${brand}, ${sizeSpec}, ${patternType}, ${status},
						${retreadCount}, ${currentDepth}, ${originalDepth},
						${purchaseCost}, 0, 0, ${notes}
					)
					ON CONFLICT (serial_number) DO UPDATE SET
						brand = EXCLUDED.brand,
						current_tread_depth_mm = EXCLUDED.current_tread_depth_mm,
						status = EXCLUDED.status,
						updated_at = NOW()
					RETURNING id
				`;

				if (status === 'MOUNTED' && unitId && positionCode) {
					let axleIndex = 1;
					if (positionCode.includes('RL1') || positionCode.includes('RR1') || positionCode === 'RL' || positionCode === 'RR') axleIndex = 2;
					else if (positionCode.includes('RL2') || positionCode.includes('RR2')) axleIndex = 3;
					else if (positionCode.includes('TR1')) axleIndex = 4;
					else if (positionCode.includes('TR2')) axleIndex = 5;
					else if (positionCode.includes('TR3')) axleIndex = 6;
					else if (positionCode.includes('SPARE')) axleIndex = 99;

					await sql`
						INSERT INTO fleet.tire_positions (
							unit_id, axle_index, position_code, tire_id, installed_odometer_km
						) VALUES (
							${unitId}, ${axleIndex}, ${positionCode}, ${tire.id}, 0
						)
						ON CONFLICT (unit_id, position_code) DO UPDATE 
						SET tire_id = ${tire.id}, updated_at = NOW()
					`;
				}

				successCount++;
			} catch (e: any) {
				errors.push(`SN ${sn}: ${e.message}`);
				skippedCount++;
			}
		}

		return json({
			success: true,
			message: `Berhasil mengimpor ${successCount} data ban (${skippedCount} dilewati / error)`,
			data: { successCount, skippedCount, errors }
		});
	} catch (err: any) {
		console.error('Error importing tires:', err);
		return json({ success: false, message: err.message }, { status: 500 });
	}
};
