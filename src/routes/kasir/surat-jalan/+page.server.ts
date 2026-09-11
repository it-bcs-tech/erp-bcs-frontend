import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		// 1. Fetch Completed Trips that don't have DN yet (Reguler)
		const pendingTrips = await sql`
			SELECT 
				t.id as trip_id,
				t.no_surat_tugas,
				u.nomor_unit as unit,
				COALESCE(k.nama_karyawan, 'No Driver') as driver,
				t.origin,
				t.destination,
				t.cargo,
				t.tgl_trip,
				t.actual_weight,
				o.id as sales_order_id,
				c.nama_kustomer as customer
			FROM fleet.trip t
			JOIN marketing.sales_order o ON o.assigned_unit_id = t.unit_id AND o.tgl_muat::date = t.tgl_trip::date
			LEFT JOIN master.m_customer c ON c.id = o.customer_id
			LEFT JOIN fleet.unit u ON u.id = t.unit_id
			LEFT JOIN master.m_drivers d ON d.id = t.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN finance.dn_detail dn ON dn.trip_id = t.id
			WHERE (t.dispatch_mode = 'REGULER' OR t.dispatch_mode IS NULL)
			  AND t.status = 'COMPLETED' 
			  AND dn.id IS NULL
			ORDER BY t.updated_at ASC
		`;

		// 2. Fetch Recent Verified DNs (Reguler)
		const verifiedDNs = await sql`
			SELECT 
				dn.id,
				dn.no_surat_jalan,
				dn.tgl_surat_jalan,
				dn.total_berat,
				dn.tarif,
				dn.total_amount,
				dn.status,
				dn.file_upload,
				t.no_surat_tugas,
				u.nomor_unit as unit,
				COALESCE(k.nama_karyawan, 'No Driver') as driver,
				c.nama_kustomer as customer
			FROM finance.dn_detail dn
			JOIN fleet.trip t ON t.id = dn.trip_id
			JOIN marketing.sales_order o ON o.assigned_unit_id = t.unit_id AND o.tgl_muat::date = t.tgl_trip::date
			LEFT JOIN master.m_customer c ON c.id = o.customer_id
			LEFT JOIN fleet.unit u ON u.id = t.unit_id
			LEFT JOIN master.m_drivers d ON d.id = t.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			WHERE (t.dispatch_mode = 'REGULER' OR t.dispatch_mode IS NULL)
			ORDER BY dn.created_at DESC
			LIMIT 50
		`;

		// 3. Fetch Ngepok Multi-Rit Batches & Trips for Kasir
		const ngepokTrips = await sql`
			SELECT 
				t.id as trip_id,
				t.no_surat_tugas,
				t.group_id,
				t.ritase_ke,
				t.total_ritase_plan,
				t.status,
				t.tgl_trip,
				t.customer,
				t.origin,
				t.destination,
				t.cargo,
				t.no_surat_jalan_customer,
				t.actual_weight,
				t.void_reason,
				t.created_at,
				u.nomor_unit as unit,
				COALESCE(k.nama_karyawan, 'No Driver') as driver,
				ca.estimated_ujo,
				ca.payment_status as ujo_payment_status,
				dn.id as dn_id,
				dn.no_surat_jalan as dn_no_surat_jalan,
				dn.tgl_surat_jalan as dn_tgl_surat_jalan,
				dn.total_berat as dn_total_berat,
				dn.file_upload as dn_file_upload,
				dn.status as dn_status
			FROM fleet.trip t
			LEFT JOIN fleet.unit u ON u.id = t.unit_id
			LEFT JOIN master.m_drivers d ON d.id = t.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN finance.cash_advance ca ON ca.trip_id = t.id
			LEFT JOIN finance.dn_detail dn ON dn.trip_id = t.id
			WHERE t.dispatch_mode = 'NGEPOK'
			ORDER BY t.created_at DESC, t.ritase_ke ASC
		`;

		const ngepokBatchMap = new Map<string, any>();
		for (const trip of (ngepokTrips as any[])) {
			const gid = trip.group_id || `BATCH-${trip.trip_id}`;
			if (!ngepokBatchMap.has(gid)) {
				ngepokBatchMap.set(gid, {
					groupId: gid,
					unit: trip.unit,
					driver: trip.driver,
					customer: trip.customer,
					origin: trip.origin,
					destination: trip.destination,
					cargo: trip.cargo,
					tglTrip: trip.tgl_trip,
					totalPlan: trip.total_ritase_plan,
					createdAt: trip.created_at,
					trips: []
				});
			}
			ngepokBatchMap.get(gid).trips.push(trip);
		}
		const ngepokBatches = Array.from(ngepokBatchMap.values());

		return {
			pendingTrips: pendingTrips as any[],
			verifiedDNs: verifiedDNs as any[],
			ngepokBatches: ngepokBatches as any[]
		};
	} catch (error) {
		console.error("Error loading Kasir DN:", error);
		return { pendingTrips: [], verifiedDNs: [], ngepokBatches: [] };
	}
};

export const actions: Actions = {
	submitDN: async ({ request }) => {
		const data = await request.formData();
		const tripId = data.get('tripId') as string;
		const noSuratJalan = data.get('noSuratJalan') as string;
		const tglSuratJalan = data.get('tglSuratJalan') as string;
		const totalBerat = parseFloat(data.get('totalBerat') as string);
		const fileUploadUrl = (data.get('fileUploadUrl') as string) || '';

		if (!tripId || !noSuratJalan || !tglSuratJalan || isNaN(totalBerat)) {
			return fail(400, { message: 'Harap lengkapi semua field wajib!' });
		}

		try {
			await sql.begin(async (sql) => {
				// 1. In case the kasir corrected the weight, update the actual_weight in trip
				await sql`
					UPDATE fleet.trip
					SET actual_weight = ${totalBerat}
					WHERE id = ${tripId}
				`;

				// 2. Fetch Customer ID and Tariff from Sales Order
				const tripInfoRes = await sql`
					SELECT o.customer_id, o.tariff 
					FROM fleet.trip t
					JOIN marketing.sales_order o ON o.assigned_unit_id = t.unit_id AND o.tgl_muat::date = t.tgl_trip::date
					WHERE t.id = ${tripId}
				`;
				const tariff = tripInfoRes.length > 0 ? parseFloat(tripInfoRes[0].tariff || '0') : 0;
				const dnValue = totalBerat * tariff;

				// 3. Insert into finance.dn_detail
				await sql`
					INSERT INTO finance.dn_detail (
						trip_id,
						dn_header_id,
						no_surat_jalan,
						tgl_surat_jalan,
						total_berat,
						tarif,
						total_amount,
						status,
						file_upload
					) VALUES (
						${tripId},
						null,
						${noSuratJalan},
						${tglSuratJalan},
						${totalBerat},
						${tariff},
						${dnValue},
						'VERIFIED',
						${fileUploadUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=60'}
					)
				`;
			});

			return { success: true, message: 'Surat Jalan berhasil diverifikasi dan disimpan.' };
		} catch (e: any) {
			console.error("Submit DN error:", e);
			if (e.message.includes('unique constraint')) {
				return fail(400, { error: 'Nomor Surat Jalan ini mungkin sudah pernah diinput.' });
			}
			return fail(500, { error: e.message || 'Gagal menyimpan Surat Jalan.' });
		}
	},

	submitNgepokDN: async ({ request }) => {
		const data = await request.formData();
		const tripId = data.get('tripId') as string;
		const noSuratJalan = (data.get('noSuratJalan') as string || '').trim();
		const tglSuratJalan = (data.get('tglSuratJalan') as string || '').trim();
		const totalBerat = parseFloat(data.get('totalBerat') as string);
		const fileUploadUrl = (data.get('fileUploadUrl') as string || '').trim();

		if (!tripId || !noSuratJalan || !tglSuratJalan || isNaN(totalBerat)) {
			return fail(400, { message: 'Harap lengkapi semua field wajib (No. SJ, Tanggal, Tonase Riil)!' });
		}

		try {
			await sql.begin(async (sql) => {
				// 1. Update fleet.trip: status COMPLETED, no_surat_jalan_customer, actual_weight
				await sql`
					UPDATE fleet.trip
					SET status = 'COMPLETED',
					    no_surat_jalan_customer = ${noSuratJalan},
					    actual_weight = ${totalBerat},
					    arrive_time = NOW()
					WHERE id = ${tripId}
				`;

				// 2. Insert into fleet.trip_status_log
				await sql`
					INSERT INTO fleet.trip_status_log (trip_id, status)
					VALUES (${tripId}, 'COMPLETED')
				`;

				// 3. Ambil tarif dari sales order terkait
				const tripData = await sql`
					SELECT t.group_id, o.tariff
					FROM fleet.trip t
					LEFT JOIN marketing.sales_order o ON o.id = 'DO-' || t.group_id
					WHERE t.id = ${tripId}
				`;
				let tariff = 0;
				if (tripData.length > 0 && tripData[0].tariff) {
					tariff = parseFloat(tripData[0].tariff);
				}
				const totalAmount = totalBerat * tariff;

				// 4. Insert or Update finance.dn_detail
				const existingDn = await sql`
					SELECT id FROM finance.dn_detail WHERE trip_id = ${tripId} LIMIT 1
				`;
				if (existingDn.length > 0) {
					await sql`
						UPDATE finance.dn_detail
						SET no_surat_jalan = ${noSuratJalan},
						    tgl_surat_jalan = ${tglSuratJalan},
						    total_berat = ${totalBerat},
						    tarif = ${tariff},
						    total_amount = ${totalAmount},
						    status = 'VERIFIED',
						    file_upload = ${fileUploadUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=60'}
						WHERE id = ${existingDn[0].id}
					`;
				} else {
					await sql`
						INSERT INTO finance.dn_detail (
							trip_id,
							dn_header_id,
							no_surat_jalan,
							tgl_surat_jalan,
							total_berat,
							tarif,
							total_amount,
							status,
							file_upload
						) VALUES (
							${tripId},
							null,
							${noSuratJalan},
							${tglSuratJalan},
							${totalBerat},
							${tariff},
							${totalAmount},
							'VERIFIED',
							${fileUploadUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=60'}
						)
					`;
				}
			});

			return { success: true, message: `Surat Jalan ${noSuratJalan} berhasil diverifikasi dan ritase diselesaikan.` };
		} catch (e: any) {
			console.error("Submit Ngepok DN error:", e);
			return fail(500, { error: e.message || 'Gagal menyimpan Surat Jalan ritase Ngepok.' });
		}
	}
};
