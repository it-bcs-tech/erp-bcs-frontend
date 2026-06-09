import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// Get Orders
		const orders = await sql`
			SELECT 
				o.id,
				c.nama_kustomer as customer,
				ori.nama_kustomer as origin_name,
				dest.nama_kustomer as destination_name,
				tu.nama_tipe as vehicle_type,
				p.project_name as project,
				p.category as project_category,
				o.jenis_muatan,
				o.berat_muatan,
				o.tgl_muat,
				o.status,
				o.estimated_ujo,
				o.tariff,
				r.tarif_customer as recommended_tariff
			FROM marketing.sales_order o
			LEFT JOIN master.m_customer c ON c.id = o.customer_id
			LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
			LEFT JOIN master.m_tipe_unit tu ON tu.id = o.tipe_unit_id
			LEFT JOIN master.m_project p ON p.id = o.project_id
			LEFT JOIN master.m_rute_ujo r ON r.origin_id = o.origin_id AND r.destination_id = o.destination_id AND r.tipe_unit_id = o.tipe_unit_id
			ORDER BY o.created_at DESC
		`;

		// Get Customers for Dropdown
		const customers = await sql`
			SELECT id, nama_kustomer 
			FROM master.m_customer 
			WHERE is_active = true 
			ORDER BY nama_kustomer ASC
		`;

		// Get Vehicle Types for Dropdown
		const vehicleTypes = await sql`
			SELECT id, nama_tipe 
			FROM master.m_tipe_unit 
			ORDER BY nama_tipe ASC
		`;

		// Get Projects for Dropdown
		const projects = await sql`
			SELECT id, project_name, category 
			FROM master.m_project 
			WHERE is_active = true 
			ORDER BY project_name ASC
		`;

		return {
			orders: orders as any[],
			customers: customers as {id: string, nama_kustomer: string}[],
			vehicleTypes: vehicleTypes as {id: string, nama_tipe: string}[],
			projects: projects as {id: string, project_name: string, category: string}[]
		};
	} catch (error) {
		console.error("Error loading marketing orders:", error);
		return { orders: [], customers: [], vehicleTypes: [] };
	}
};

export const actions: Actions = {
	createOrder: async ({ request }) => {
		const data = await request.formData();
		const customerId = data.get('customerId') as string;
		const originId = data.get('originId') as string;
		const destinationId = data.get('destinationId') as string;
		const vehicleTypeId = data.get('vehicleTypeId') as string;
		const projectId = data.get('projectId') as string;
		const cargoType = data.get('cargoType') as string;
		const weight = parseFloat(data.get('weight') as string) || null;
		const loadDate = data.get('loadDate') as string;
		const unloadDate = data.get('unloadDate') as string;

		if (!customerId || !originId || !destinationId || !vehicleTypeId || !projectId || !cargoType || !loadDate) {
			return fail(400, { missing: true, message: 'Harap lengkapi semua field wajib!' });
		}

		try {
			// Generate SO Number (Format: SO-YYYYMMDD-XXXX)
			const today = new Date();
			const yyyymmdd = today.toISOString().split('T')[0].replace(/-/g, '');
			const counterQuery = await sql`SELECT count(*) FROM marketing.sales_order WHERE id LIKE ${'SO-' + yyyymmdd + '-%'}`;
			const count = parseInt(counterQuery[0].count) + 1;
			const soId = `SO-${yyyymmdd}-${count.toString().padStart(3, '0')}`;

			await sql`
				INSERT INTO marketing.sales_order (
					id, customer_id, origin_id, destination_id, tipe_unit_id, project_id,
					jenis_muatan, berat_muatan, tgl_muat, tgl_bongkar, status
				) VALUES (
					${soId}, ${customerId}, ${originId}, ${destinationId}, ${vehicleTypeId}, ${projectId},
					${cargoType}, ${weight}, ${loadDate}, ${unloadDate || null}, 'WAITING_UJO'
				)
			`;
			return { success: true, message: 'Order berhasil dibuat.' };
		} catch (e: any) {
			console.error("Create order error:", e);
			return fail(500, { error: e.message || 'Gagal menyimpan data.' });
		}
	},

	updateOrder: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const customerId = data.get('customerId') as string;
		const originId = data.get('originId') as string;
		const destinationId = data.get('destinationId') as string;
		const vehicleTypeId = data.get('vehicleTypeId') as string;
		const cargoType = data.get('cargoType') as string;
		const weight = parseFloat(data.get('weight') as string) || null;
		const loadDate = data.get('loadDate') as string;
		const unloadDate = data.get('unloadDate') as string;
		const status = data.get('status') as string; // Optional manual override

		if (!id || !customerId || !originId || !destinationId || !vehicleTypeId || !cargoType || !loadDate) {
			return fail(400, { missing: true, message: 'Harap lengkapi semua field wajib!' });
		}

		try {
			if (status) {
				await sql`
					UPDATE marketing.sales_order 
					SET customer_id = ${customerId}, origin_id = ${originId}, destination_id = ${destinationId},
						tipe_unit_id = ${vehicleTypeId}, jenis_muatan = ${cargoType}, berat_muatan = ${weight},
						tgl_muat = ${loadDate}, tgl_bongkar = ${unloadDate || null}, status = ${status}
					WHERE id = ${id}
				`;
			} else {
				await sql`
					UPDATE marketing.sales_order 
					SET customer_id = ${customerId}, origin_id = ${originId}, destination_id = ${destinationId},
						tipe_unit_id = ${vehicleTypeId}, jenis_muatan = ${cargoType}, berat_muatan = ${weight},
						tgl_muat = ${loadDate}, tgl_bongkar = ${unloadDate || null}
					WHERE id = ${id}
				`;
			}
			return { success: true, message: 'Order berhasil diupdate.' };
		} catch (e: any) {
			console.error("Update order error:", e);
			return fail(500, { error: e.message || 'Gagal menyimpan data.' });
		}
	},

	submitTariff: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const tariff = parseFloat(data.get('tariff') as string);

		if (!id || isNaN(tariff)) {
			return fail(400, { missing: true, message: 'Tarif tidak valid!' });
		}

		try {
			// Update tariff and change status to WAITING_CUSTOMER or READY_TO_DISPATCH
			// Assuming READY_TO_DISPATCH right away since it's confirmed.
			await sql`
				UPDATE marketing.sales_order 
				SET tariff = ${tariff}, status = 'READY_TO_DISPATCH'
				WHERE id = ${id}
			`;
			return { success: true, message: 'Tarif berhasil diinput.' };
		} catch (e: any) {
			console.error("Submit tariff error:", e);
			return fail(500, { error: e.message || 'Gagal menyimpan tarif.' });
		}
	}
};
