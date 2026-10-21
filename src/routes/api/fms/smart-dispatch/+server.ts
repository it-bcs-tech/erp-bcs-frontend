import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const payload = await request.json();
		const { orderId } = payload;
		
		if (!orderId) {
			return json({ error: 'Order ID is required' }, { status: 400 });
		}

		// 1. Fetch Order Details
		const orderQuery = await sql`
			SELECT 
				o.id,
				o.jenis_muatan as cargo,
				o.berat_muatan as weight,
				ori.nama_kustomer as origin,
				dest.nama_kustomer as destination,
				o.tgl_muat as loading_date
			FROM marketing.sales_order o
			LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
			WHERE o.id = ${orderId}
			LIMIT 1
		`;
		
		if (orderQuery.length === 0) {
			return json({ error: 'Order not found' }, { status: 404 });
		}
		
		const order = orderQuery[0];

		// 2. Fetch Available Units (AT_POOL with valid compliance)
		const unitsQuery = await sql`
			SELECT 
				u.nomor_unit as nopol,
				tu.nama_tipe as type,
				k.nama_karyawan as driver
			FROM fleet.unit u
			LEFT JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
			LEFT JOIN master.m_tipe_unit tu ON tu.id = mu.tipe_unit_id
			JOIN fleet.unit_driver_assignment uda ON uda.unit_id = u.id AND uda.is_aktif = true AND uda.posisi = 'SUPIR_UTAMA'
			JOIN master.m_drivers d ON d.id = uda.driver_id
			JOIN master.m_karyawan k ON k.id = d.karyawan_id
			WHERE u.is_active = true 
			  AND u.current_state IN ('AT_POOL')
			  -- Unit doc compliance
			  AND NOT EXISTS (
			  	SELECT 1 FROM dms.documents doc 
			  	WHERE doc.asset_id = u.id AND (doc.expiry_date < CURRENT_DATE OR doc.status = 'EXPIRED')
			  )
			  -- Driver SIM compliance
			  AND (d.sim_expiry_date IS NULL OR d.sim_expiry_date >= CURRENT_DATE)
			  AND NOT EXISTS (
			  	SELECT 1 FROM dms.documents doc 
			  	WHERE (doc.employee_id = d.id OR (k.id IS NOT NULL AND doc.employee_id = k.id)) AND (doc.expiry_date < CURRENT_DATE OR doc.status = 'EXPIRED')
			  )
			LIMIT 15
		`;

		if (unitsQuery.length === 0) {
			return json({ 
				recommended_unit: '', 
				reason: 'Tidak ada unit yang tersedia di Pool saat ini.' 
			});
		}

		// 3. Send to AI Bridge
		const aiPayload = {
			order: {
				cargo: order.cargo || 'General Cargo',
				weight: parseFloat(order.weight) || 0,
				origin: order.origin || 'Unknown',
				destination: order.destination || 'Unknown',
				loading_date: order.loading_date ? new Date(order.loading_date).toISOString().split('T')[0] : 'TBD'
			},
			available_units: unitsQuery
		};

		const aiUrl = `${env.AI_BRIDGE_URL || 'http://localhost:8000'}/fms/smart-dispatch`;
		
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
		console.error('Smart Dispatch Error:', error);
		return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
	}
};
