import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// Get Unpaid UJO Orders
		const ujoRequests = await sql`
			SELECT 
				o.id,
				COALESCE(k.nama_karyawan, 'No Driver') as driver,
				d.karyawan_id,
				u.nomor_unit as unit,
				o.estimated_ujo as amount,
				o.ujo_makan as "ujoMakan",
				o.ujo_tol as "ujoTol",
				ori.nama_kustomer as origin,
				dest.nama_kustomer as destination,
				o.status,
				o.ujo_payment_status as "paymentStatus",
				o.tgl_muat as "loadingDate"
			FROM marketing.sales_order o
			LEFT JOIN fleet.unit u ON u.id = o.assigned_unit_id
			LEFT JOIN master.m_drivers d ON d.id = o.assigned_driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
			WHERE o.status IN ('READY_TO_DISPATCH', 'DISPATCHED', 'CLOSING', 'COMPLETED')
			ORDER BY CASE WHEN o.ujo_payment_status = 'UNPAID' THEN 1 ELSE 2 END, o.created_at ASC
		`;

		// Mock Contract UJO Requests (PO)
		const contractUjos = [
			{
				id: 'DO-PO-05001-A',
				contract_id: 'PO-2026-05-001',
				driver: 'Budi Santoso',
				unit: 'B 1234 CD',
				amount: 2500000,
				origin: 'Jakarta (Sunter)',
				destination: 'Surabaya (Rungkut)',
				status: 'READY_TO_DISPATCH',
				paymentStatus: 'UNPAID',
				loadingDate: new Date().toISOString()
			}
		];

		return {
			ujoRequests: ujoRequests as any[],
			contractUjos
		};
	} catch (error) {
		console.error("Error loading Kasir UJO:", error);
		return { ujoRequests: [], contractUjos: [] };
	}
};

export const actions: Actions = {
	payUjo: async ({ request }) => {
		const data = await request.formData();
		const orderId = data.get('orderId') as string;

		if (!orderId) {
			return fail(400, { message: 'Order ID tidak ditemukan.' });
		}

		try {
			await sql.begin(async (sql) => {
				// 1. Mark UJO as Paid
				await sql`
					UPDATE marketing.sales_order 
					SET ujo_payment_status = 'PAID'
					WHERE id = ${orderId}
				`;

				// 2. Fetch the order details to see if it needs auto-dispatching
				const orderData = await sql`
					SELECT status, assigned_unit_id, assigned_driver_id, customer_id, origin_id, destination_id, jenis_muatan, tgl_muat
					FROM marketing.sales_order
					WHERE id = ${orderId}
				`;

				if (orderData.length > 0 && orderData[0].status === 'READY_TO_DISPATCH') {
					const order = orderData[0];
					if (order.assigned_unit_id && order.assigned_driver_id) {
						// Auto-Dispatch Logic
						// Update Order Status
						await sql`
							UPDATE marketing.sales_order 
							SET status = 'DISPATCHED' 
							WHERE id = ${orderId}
						`;

						let tripId;
						
						// Try to find an existing SCHEDULED trip for this unit & date
						const scheduledTrips = await sql`
							SELECT id FROM fleet.trip 
							WHERE unit_id = ${order.assigned_unit_id} 
							  AND tgl_trip::date = ${order.tgl_muat} 
							  AND status = 'SCHEDULED'
							LIMIT 1
						`;

						if (scheduledTrips.length > 0) {
							// Update existing trip
							tripId = scheduledTrips[0].id;
							await sql`
								UPDATE fleet.trip 
								SET status = 'DISPATCHED' 
								WHERE id = ${tripId}
							`;
						} else {
							// Legacy / Fallback: Create new Trip
							const stNumber = 'ST-' + Date.now().toString().slice(-8);
							const tripResult = await sql`
								INSERT INTO fleet.trip (
									no_surat_tugas,
									tgl_trip,
									unit_id,
									driver_id,
									customer,
									origin_id,
									destination_id,
									origin,
									destination,
									cargo,
									status,
									created_by,
									pool_tujuan_id
								) VALUES (
									${stNumber},
									${order.tgl_muat},
									${order.assigned_unit_id},
									${order.assigned_driver_id},
									(SELECT nama_kustomer FROM master.m_customer WHERE id = ${order.customer_id}),
									${order.origin_id},
									${order.destination_id},
									(SELECT nama_kustomer FROM master.m_customer WHERE id = ${order.origin_id}),
									(SELECT nama_kustomer FROM master.m_customer WHERE id = ${order.destination_id}),
									${order.jenis_muatan},
									'DISPATCHED',
									'Kasir System (Auto)',
									'ded65e49-e477-47a1-aee8-a373a2485bba' -- Default ke Pool Cilegon
								)
								RETURNING id
							`;
							tripId = tripResult[0].id;
						}

						// Tambahkan log checkpoint awal
						await sql`
							INSERT INTO fleet.trip_checkpoint (trip_id, event, lat, lon, notes)
							VALUES (${tripId}, 'NOTE', 0, 0, 'Sistem Kasir: UJO Dicairkan, Unit Otomatis Berangkat (Auto-Dispatch)')
						`;

						await sql`
							INSERT INTO fleet.trip_status_log (trip_id, status)
							VALUES (${tripId}, 'DISPATCHED')
						`;

						// Update Unit Status
						await sql`
							UPDATE fleet.unit 
							SET current_state = 'ON_DUTY' 
							WHERE id = ${order.assigned_unit_id}
						`;
					}
				}
			});

			return { success: true, message: 'UJO Berhasil Dicairkan! Jika status Ready, unit otomatis ter-Dispatch.' };
		} catch (e: any) {
			console.error("Pay UJO error:", e);
			return fail(500, { error: e.message || 'Gagal menyimpan transaksi.' });
		}
	}
};
