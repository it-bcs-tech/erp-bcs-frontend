import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// Metrics
		const totalResult = await sql`SELECT COUNT(*) FROM master.m_customer WHERE is_active = true`;
		const activeResult = await sql`
			SELECT COUNT(DISTINCT customer_id) 
			FROM marketing.sales_order 
			WHERE status NOT IN ('CANCELED', 'COMPLETED')
		`;
		const corporateResult = await sql`SELECT COUNT(*) FROM master.m_customer WHERE kategori = 'Corporate' AND is_active = true`;
		const smeResult = await sql`SELECT COUNT(*) FROM master.m_customer WHERE kategori = 'SME' AND is_active = true`;

		const metrics = {
			total: parseInt(totalResult[0].count),
			active: parseInt(activeResult[0].count),
			corporate: parseInt(corporateResult[0].count),
			sme: parseInt(smeResult[0].count)
		};

		// Customers List
		const customers = await sql`
			SELECT 
				c.id,
				c.nama_kustomer as name,
				c.kategori as type,
				c.contact_person as "contactPerson",
				c.email,
				c.phone,
				c.tier,
				c.alamat,
				c.latitude,
				c.longitude,
				'30 Days' as term, -- Mock term
				c.is_active,
				COUNT(o.id) as "totalOrders",
				COALESCE(SUM(o.tariff), 0) as "totalRevenue",
				CASE WHEN c.is_active THEN 'Active' ELSE 'Inactive' END as status,
				'Logistics' as sector -- Mock sector
			FROM master.m_customer c
			LEFT JOIN marketing.sales_order o ON c.id = o.customer_id
			GROUP BY c.id, c.nama_kustomer, c.kategori, c.contact_person, c.email, c.phone, c.tier, c.alamat, c.latitude, c.longitude, c.is_active
			ORDER BY "totalRevenue" DESC, c.nama_kustomer ASC
		`;

		return {
			metrics,
			customers: customers as any[],
			meta: {
				total: customers.length,
				per_page: 5,
				current_page: 1
			}
		};
	} catch (error) {
		console.error("Error loading marketing customers:", error);
		return { 
			metrics: { total: 0, active: 0, corporate: 0, sme: 0 },
			customers: [],
			meta: { total: 0, per_page: 5, current_page: 1 }
		};
	}
};

export const actions: Actions = {
	editCustomer: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString();
		const type = data.get('type')?.toString();
		const tier = data.get('tier')?.toString();
		const contactPerson = data.get('contactPerson')?.toString();
		const phone = data.get('phone')?.toString();
		const email = data.get('email')?.toString();
		const status = data.get('status')?.toString();
		const alamat = data.get('alamat')?.toString();
		const latitude = data.get('latitude')?.toString();
		const longitude = data.get('longitude')?.toString();
		
		if (!id || !name) {
			return fail(400, { error: 'ID and Name are required' });
		}
		
		try {
			await sql`
				UPDATE master.m_customer
				SET 
					nama_kustomer = ${name},
					kategori = ${type || null},
					tier = ${tier || null},
					contact_person = ${contactPerson || null},
					phone = ${phone || null},
					email = ${email || null},
					alamat = ${alamat || null},
					latitude = ${latitude ? parseFloat(latitude) : null},
					longitude = ${longitude ? parseFloat(longitude) : null},
					is_active = ${status === 'Active'}
				WHERE id = ${id}
			`;
			return { success: true, message: 'Customer updated successfully.' };
		} catch (error: any) {
			console.error("Error updating customer:", error);
			return fail(500, { error: 'Failed to update customer' });
		}
	}
};
