import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async () => {
	try {
		// Fetch Top 20 units that need attention (oldest maintenance dates or most active)
		const unitsQuery = await sql`
			SELECT 
				u.nomor_unit as nopol,
				tu.nama_tipe as type,
				COALESCE(u.tgl_maintenance_prevent, CURRENT_DATE) as next_maintenance_date,
				(COALESCE(u.tgl_maintenance_prevent, CURRENT_DATE) - CURRENT_DATE) as days_until_maintenance,
				(
					SELECT COUNT(id) 
					FROM fleet.trip t 
					WHERE t.unit_id = u.id 
					  AND t.tgl_trip >= CURRENT_DATE - INTERVAL '30 days'
					  AND t.deleted_at IS NULL
				) as trips_last_30_days
			FROM fleet.unit u
			LEFT JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
			LEFT JOIN master.m_tipe_unit tu ON tu.id = mu.tipe_unit_id
			WHERE u.is_active = true 
			ORDER BY 
				(COALESCE(u.tgl_maintenance_prevent, CURRENT_DATE) - CURRENT_DATE) ASC, 
				trips_last_30_days DESC
			LIMIT 20
		`;

		if (unitsQuery.length === 0) {
			return json({ alerts: [], summary: "Tidak ada unit aktif." });
		}

		// Convert Postgres interval/bigint to standard formats
		const formattedUnits = unitsQuery.map((u: any) => ({
			nopol: u.nopol,
			type: u.type,
			next_maintenance_date: new Date(u.next_maintenance_date).toISOString().split('T')[0],
			days_until_maintenance: parseInt(u.days_until_maintenance),
			trips_last_30_days: parseInt(u.trips_last_30_days)
		}));

		const aiPayload = {
			units: formattedUnits
		};

		const aiUrl = `${env.AI_BRIDGE_URL || 'http://localhost:8000'}/fms/predict-maintenance`;
		
		const aiRes = await fetch(aiUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(aiPayload)
		});

		if (!aiRes.ok) {
			throw new Error(`AI Bridge error: ${aiRes.status}`);
		}

		const result = await aiRes.json();
		return json(result);

	} catch (error: any) {
		console.error('Predictive Maintenance Error:', error);
		return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
	}
};
