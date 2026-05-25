import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// Get Orders for Dispatch
		const ordersResult = await sql`
			SELECT 
				o.id,
				c.nama_kustomer as customer,
				ori.nama_kustomer as origin,
				dest.nama_kustomer as destination,
				o.jenis_muatan as cargo,
				o.berat_muatan as weight,
				o.tgl_muat as "loadingDate",
				o.estimated_ujo as "estimatedUjo",
				o.ujo_makan as "ujoMakan",
				o.ujo_tol as "ujoTol",
				u.nomor_unit as "assignedUnit",
				k.nama_karyawan as "assignedDriver",
				o.status
			FROM marketing.sales_order o
			LEFT JOIN master.m_customer c ON c.id = o.customer_id
			LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
			LEFT JOIN fleet.unit u ON u.id = o.assigned_unit_id
			LEFT JOIN master.m_drivers d ON d.id = o.assigned_driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			WHERE o.status NOT IN ('COMPLETED', 'CANCELED')
			ORDER BY o.created_at DESC
		`;

		// Get Available Units (In Pool, AT_DESTINATION, or RETURNING for continuous cargo bypass)
		const unitsResult = await sql`
			SELECT 
				u.id as "unitId",
				u.nomor_unit as id,
				mu.nama_produk as brand,
				tu.nama_tipe as type,
				COALESCE(k.nama_karyawan, 'No Driver') as driver,
				d.id as "driverId",
				u.current_state,
				'Pool' as location
			FROM fleet.unit u
			LEFT JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
			LEFT JOIN master.m_tipe_unit tu ON tu.id = mu.tipe_unit_id
			LEFT JOIN fleet.unit_driver_assignment uda ON uda.unit_id = u.id AND uda.is_aktif = true AND uda.posisi = 'SUPIR_UTAMA'
			LEFT JOIN master.m_drivers d ON d.id = uda.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			WHERE u.is_active = true 
			  AND u.current_state IN ('AT_POOL')
			ORDER BY u.current_state ASC, u.nomor_unit ASC
		`;

		return {
			orders: ordersResult as any[],
			availableUnits: unitsResult as any[]
		};
	} catch (error) {
		console.error("Error loading dispatch data:", error);
		return { orders: [], availableUnits: [] };
	}
};

export const actions: Actions = {
	assignUjo: async ({ request }) => {
		const data = await request.formData();
		const orderId = data.get('orderId') as string;
		const unitId = data.get('unitId') as string; // This is the ID column of fleet.unit
		const ujoAmount = parseFloat(data.get('ujoAmount') as string) || 0;
		const ujoMakan = parseFloat(data.get('ujoMakan') as string) || 0;
		const ujoTol = parseFloat(data.get('ujoTol') as string) || 0;

		if (!orderId || !unitId) {
			return fail(400, { missing: true, message: 'Harap lengkapi Unit!' });
		}

		try {
			// Get unit_id and driver_id from unit selection
			const unitData = await sql`
				SELECT u.id, uda.driver_id 
				FROM fleet.unit u 
				LEFT JOIN fleet.unit_driver_assignment uda ON uda.unit_id = u.id AND uda.is_aktif = true 
				WHERE u.nomor_unit = ${unitId} LIMIT 1
			`;

			if (unitData.length === 0) return fail(400, { message: 'Unit tidak ditemukan.' });

			const dbUnitId = unitData[0].id;
			const dbDriverId = unitData[0].driver_id;
			const totalUjo = ujoAmount + ujoMakan + ujoTol;

			await sql`
				UPDATE marketing.sales_order 
				SET assigned_unit_id = ${dbUnitId},
					assigned_driver_id = ${dbDriverId},
					estimated_ujo = ${totalUjo},
					ujo_makan = ${ujoMakan},
					ujo_tol = ${ujoTol},
					status = 'WAITING_TARIFF'
				WHERE id = ${orderId}
			`;
			return { success: true, message: 'Berhasil assign Unit dan UJO!' };
		} catch (e: any) {
			console.error("Assign UJO error:", e);
			return fail(500, { error: e.message || 'Gagal menyimpan data.' });
		}
	},

	finalizeDispatch: async ({ request }) => {
		const data = await request.formData();
		const orderId = data.get('orderId') as string;

		if (!orderId) return fail(400, { message: 'Order ID kosong.' });

		try {
			// Start transaction
			await sql.begin(async (sql) => {
				// 1. Get Order details
				const orderData = await sql`
					SELECT * FROM marketing.sales_order WHERE id = ${orderId}
				`;
				if (orderData.length === 0) throw new Error('Order tidak ditemukan');
				const order = orderData[0];

				if (!order.assigned_unit_id || !order.assigned_driver_id) {
					throw new Error('Unit / Driver belum diassign.');
				}

				// 2. Update Order status
				await sql`
					UPDATE marketing.sales_order 
					SET status = 'DISPATCHED' 
					WHERE id = ${orderId}
				`;

				// 3. Generate Nomor Surat Tugas (ST)
				const stNumber = 'ST-' + Date.now().toString().slice(-8);

				// 4. Create Trip record in fleet.trip
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
						created_by
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
						'OCS System'
					)
					RETURNING id
				`;
				
				const tripId = tripResult[0].id;

				// Tambahkan log checkpoint awal
				await sql`
					INSERT INTO fleet.trip_checkpoint (trip_id, event, lat, lon, notes)
					VALUES (${tripId}, 'NOTE', 0, 0, 'Sistem: Surat Jalan (DO) Diterbitkan dan di-Dispatch')
				`;

				// 5. Update Unit Status
				await sql`
					UPDATE fleet.unit 
					SET current_state = 'ON_DUTY' 
					WHERE id = ${order.assigned_unit_id}
				`;
			});

			return { success: true, message: 'Dispatch berhasil! Unit segera berjalan.' };
		} catch (e: any) {
			console.error("Finalize Dispatch error:", e);
			return fail(500, { error: e.message || 'Gagal eksekusi dispatch.' });
		}
	},

	submitClosing: async ({ request }) => {
		const data = await request.formData();
		const orderId = data.get('orderId') as string;
		const closeWeight = parseFloat(data.get('closeWeight') as string) || 0;
		const closeCost = parseFloat(data.get('closeCost') as string) || 0;
		const closeDesc = data.get('closeDesc') as string || '';

		if (!orderId) return fail(400, { message: 'Order ID kosong.' });

		try {
			await sql`
				UPDATE marketing.sales_order 
				SET status = 'CLOSING',
					real_weight = ${closeWeight},
					extra_cost = ${closeCost},
					extra_cost_desc = ${closeDesc}
				WHERE id = ${orderId}
			`;
			return { success: true, message: 'Order masuk antrian Kasir.' };
		} catch (e: any) {
			console.error("Submit closing error:", e);
			return fail(500, { error: e.message || 'Gagal update status closing.' });
		}
	}
};
