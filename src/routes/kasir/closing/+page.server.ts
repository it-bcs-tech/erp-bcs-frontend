import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// Get Unpaid Closing Settlements
		const settlements = await sql`
			SELECT 
				o.id,
				COALESCE(k.nama_karyawan, 'No Driver') as driver,
				u.nomor_unit as unit,
				o.jenis_muatan as cargo,
				o.berat_muatan as "estWeight",
				o.real_weight as "realWeight",
				o.estimated_ujo as ujo,
				o.extra_cost as "extraCost",
				o.extra_cost_desc as desc,
				ori.nama_kustomer as origin,
				dest.nama_kustomer as destination,
				o.closing_payment_status as "paymentStatus",
				o.tgl_muat as "loadingDate"
			FROM marketing.sales_order o
			LEFT JOIN fleet.unit u ON u.id = o.assigned_unit_id
			LEFT JOIN master.m_drivers d ON d.id = o.assigned_driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
			WHERE o.status IN ('CLOSING', 'COMPLETED')
			ORDER BY CASE WHEN o.closing_payment_status = 'UNPAID' THEN 1 ELSE 2 END, o.created_at ASC
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
					SET status = 'COMPLETED',
						closing_payment_status = 'PAID'
					WHERE id = ${orderId}
					RETURNING assigned_unit_id
				`;

				if (orderData.length > 0) {
					const unitId = orderData[0].assigned_unit_id;
					
					// 2. Mark corresponding active Trip as COMPLETED
					await sql`
						UPDATE fleet.trip 
						SET status = 'COMPLETED'
						WHERE unit_id = ${unitId} AND status NOT IN ('COMPLETED', 'CANCELED')
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
