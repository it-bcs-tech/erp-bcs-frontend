import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		// Get Unpaid Closing Settlements
		const settlements = await sql`
			SELECT 
				o.id,
				o.id as "soId",
				COALESCE(k.nama_karyawan, 'No Driver') as driver,
				u.nomor_unit as unit,
				o.jenis_muatan as cargo,
				o.berat_muatan as "estWeight",
				t.actual_weight as "realWeight",
				ca.estimated_ujo as ujo,
				ca.extra_cost as "extraCost",
				ca.extra_cost_desc as desc,
				ori.nama_kustomer as origin,
				dest.nama_kustomer as destination,
				ca.extra_cost_payment_status as "paymentStatus",
				o.tgl_muat as "loadingDate"
			FROM finance.cash_advance ca
			JOIN marketing.sales_order o ON o.id = ca.sales_order_id
			LEFT JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date
			LEFT JOIN fleet.unit u ON u.id = o.assigned_unit_id
			LEFT JOIN master.m_drivers d ON d.id = o.assigned_driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
			WHERE o.status IN ('CLOSING', 'COMPLETED')
			ORDER BY CASE WHEN ca.extra_cost_payment_status = 'UNPAID' THEN 1 ELSE 2 END, o.created_at ASC
		`;

		return {
			settlements: settlements as any[]
		};
	} catch (error) {
		console.error("Error loading Kasir Closing:", error);
		return { settlements: [] };
	}
};

export const actions: Actions = {
	settleClosing: async ({ request }) => {
		const data = await request.formData();
		const orderId = data.get('orderId') as string;

		if (!orderId) {
			return fail(400, { message: 'Order ID tidak ditemukan.' });
		}

		try {
			// Update Sales Order and Trip in transaction
			await sql.begin(async (sql) => {
				// 1. Mark Sales Order as Completed and Paid
				const orderData = await sql`
					UPDATE marketing.sales_order 
					SET status = 'COMPLETED'
					WHERE id = ${orderId}
					RETURNING assigned_unit_id, contract_id, tgl_muat, berat_muatan
				`;

				await sql`
					UPDATE finance.cash_advance
					SET extra_cost_payment_status = 'PAID'
					WHERE sales_order_id = ${orderId}
				`;

				if (orderData.length > 0) {
					const unitId = orderData[0].assigned_unit_id;
					const contractId = orderData[0].contract_id;
					const tglMuat = orderData[0].tgl_muat;

					const tripRes = await sql`SELECT actual_weight FROM fleet.trip WHERE unit_id = ${unitId} AND tgl_trip::date = ${tglMuat}::date LIMIT 1`;
					const finalWeight = tripRes.length > 0 && tripRes[0].actual_weight ? tripRes[0].actual_weight : orderData[0].berat_muatan;

					// 1.b. Update Contract delivered_tonnage if it's a contract order
					if (contractId) {
						await sql`
							UPDATE marketing.contract
							SET delivered_tonnage = COALESCE(delivered_tonnage, 0) + ${finalWeight}
							WHERE id = ${contractId}
						`;
					}
					
					// 2. Mark corresponding active Trip as COMPLETED (match by date to avoid completing wrong active trip)
					await sql`
						UPDATE fleet.trip 
						SET status = 'COMPLETED', arrive_time = COALESCE(arrive_time, NOW())
						WHERE unit_id = ${unitId} 
						  AND tgl_trip::date = ${tglMuat}::date
						  AND status NOT IN ('COMPLETED', 'CANCELED')
					`;

					// 3. Mark Unit state back to AT_POOL
					await sql`
						UPDATE fleet.unit
						SET current_state = 'AT_POOL'
						WHERE id = ${unitId}
					`;
				}
			});
			return { success: true, message: 'Settlement Berhasil! Order ditutup.' };
		} catch (e: any) {
			console.error("Settle closing error:", e);
			return fail(500, { error: e.message || 'Gagal menyelesaikan settlement.' });
		}
	}
};
