import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// 1. Fetch Completed Trips that don't have DN yet
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
			WHERE t.status = 'COMPLETED' 
			  AND dn.id IS NULL
			ORDER BY t.updated_at ASC
		`;

		// 2. Fetch Recent Verified DNs
		const verifiedDNs = await sql`
			SELECT 
				dn.id,
				dn.no_surat_jalan,
				dn.tgl_surat_jalan,
				dn.total_berat,
				dn.status,
				t.no_surat_tugas,
				u.nomor_unit as unit,
				c.nama_kustomer as customer
			FROM finance.dn_detail dn
			JOIN fleet.trip t ON t.id = dn.trip_id
			JOIN marketing.sales_order o ON o.assigned_unit_id = t.unit_id AND o.tgl_muat::date = t.tgl_trip::date
			LEFT JOIN master.m_customer c ON c.id = o.customer_id
			LEFT JOIN fleet.unit u ON u.id = t.unit_id
			ORDER BY dn.created_at DESC
			LIMIT 50
		`;

		return {
			pendingTrips: pendingTrips as any[],
			verifiedDNs: verifiedDNs as any[]
		};
	} catch (error) {
		console.error("Error loading Kasir DN:", error);
		return { pendingTrips: [], verifiedDNs: [] };
	}
};

export const actions: Actions = {
	submitDN: async ({ request }) => {
		const data = await request.formData();
		const tripId = data.get('tripId') as string;
		const noSuratJalan = data.get('noSuratJalan') as string;
		const tglSuratJalan = data.get('tglSuratJalan') as string;
		const totalBerat = parseFloat(data.get('totalBerat') as string);
		// const fileUpload = data.get('fileUpload') as File; // Can handle file upload later

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
				const customerId = tripInfoRes.length > 0 ? tripInfoRes[0].customer_id : null;
				const tariff = tripInfoRes.length > 0 ? tripInfoRes[0].tariff || 0 : 0;
				const dnValue = totalBerat * tariff;

				// 3. Insert into finance.dn_detail
				// Note: dn_header_id is deliberately set to null. 
				// Finance will group and create the dn_header when making an invoice.
				await sql`
					INSERT INTO finance.dn_detail (
						trip_id,
						dn_header_id,
						no_surat_jalan,
						tgl_surat_jalan,
						total_berat,
						status,
						file_upload
					) VALUES (
						${tripId},
						null,
						${noSuratJalan},
						${tglSuratJalan},
						${totalBerat},
						'VERIFIED',
						'-'
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
	}
};
