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
			await sql`
				UPDATE marketing.sales_order 
				SET ujo_payment_status = 'PAID'
				WHERE id = ${orderId}
			`;
			return { success: true, message: 'UJO Berhasil Dicairkan!' };
		} catch (e: any) {
			console.error("Pay UJO error:", e);
			return fail(500, { error: e.message || 'Gagal menyimpan transaksi.' });
		}
	}
};
