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
				c.polygon_points as "polygonPoints",
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
			googleMapsApiKey: env.GOOGLE_MAPS_API_KEY || '',
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
	addCustomer: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString()?.trim();
		const type = data.get('type')?.toString() || 'Corporate';
		const tier = data.get('tier')?.toString() || 'Standard';
		const contactPerson = data.get('contactPerson')?.toString() || null;
		const phone = data.get('phone')?.toString() || null;
		const email = data.get('email')?.toString() || null;
		const status = data.get('status')?.toString() || 'Active';
		const alamat = data.get('alamat')?.toString() || null;
		const latitude = data.get('latitude')?.toString() || null;
		const longitude = data.get('longitude')?.toString() || null;
		const polygonPoints = data.get('polygonPoints')?.toString() || null;
		
		if (!name) {
			return fail(400, { error: 'Nama kustomer wajib diisi.' });
		}

		try {
			// Generate kode_kustomer C-[Huruf][SEQ]
			let cleanName = name;
			if (cleanName.toUpperCase().startsWith('PT. ')) cleanName = cleanName.substring(4);
			else if (cleanName.toUpperCase().startsWith('PT ')) cleanName = cleanName.substring(3);
			else if (cleanName.toUpperCase().startsWith('CV. ')) cleanName = cleanName.substring(4);
			else if (cleanName.toUpperCase().startsWith('CV ')) cleanName = cleanName.substring(3);

			cleanName = cleanName.trim();
			const firstLetter = cleanName.charAt(0).toUpperCase();
			const prefix = `C-${firstLetter}`;

			const lastCust = await sql`
				SELECT kode_kustomer 
				FROM master.m_customer 
				WHERE kode_kustomer LIKE ${prefix + '%'}
				ORDER BY kode_kustomer DESC 
				LIMIT 1
			`;

			let nextSeq = 1;
			if (lastCust.length > 0) {
				const lastCode = lastCust[0].kode_kustomer;
				const numPart = lastCode.substring(3);
				const lastNum = parseInt(numPart, 10);
				if (!isNaN(lastNum)) nextSeq = lastNum + 1;
			}
			
			const kode_kustomer = `${prefix}${nextSeq.toString().padStart(3, '0')}`;
			const isActive = status === 'Active';

			let parsedPolygon = null;
			if (polygonPoints) {
				try { parsedPolygon = JSON.parse(polygonPoints); } catch(e) {}
			}

			await sql`
				INSERT INTO master.m_customer (
					kode_kustomer, nama_kustomer, kategori, tier, contact_person,
					phone, email, alamat, latitude, longitude, polygon_points, is_active
				) VALUES (
					${kode_kustomer}, ${name}, ${type}, ${tier}, ${contactPerson},
					${phone}, ${email}, ${alamat}, ${latitude ? parseFloat(latitude) : null}, ${longitude ? parseFloat(longitude) : null}, 
					${parsedPolygon ? sql.json(parsedPolygon) : null}, ${isActive}
				)
			`;
			
			return { success: true, message: `Berhasil menambahkan kustomer baru dengan kode ${kode_kustomer}` };
		} catch (e: any) {
			console.error("Failed adding customer:", e);
			return fail(500, { error: 'Gagal menambahkan kustomer. Server error.' });
		}
	},
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
		const polygonPoints = data.get('polygonPoints')?.toString();
		
		if (!id || !name) {
			return fail(400, { error: 'ID and Name are required' });
		}
		
		try {
			let parsedPolygon = null;
			if (polygonPoints) {
				try { parsedPolygon = JSON.parse(polygonPoints); } catch(e) {}
			}

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
					polygon_points = ${parsedPolygon ? sql.json(parsedPolygon) : null},
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
