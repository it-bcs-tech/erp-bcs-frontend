import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		// Fetch items (materials)
		const items = await sql`
			SELECT id, material_code, name, part_no, uom 
			FROM master.m_materials 
			WHERE is_active = true
			ORDER BY name ASC
		`;

		return {
			items
		};
	} catch (err: any) {
		console.error("Error fetching PR prerequisites:", err);
		throw error(500, 'Gagal memuat data master untuk PR');
	}
};

export const actions = {
	savePR: async ({ request }) => {
		const data = await request.formData();
		const payloadStr = data.get('payload');
		if (!payloadStr) {
			return { success: false, message: 'Payload is required' };
		}

		const payload = JSON.parse(payloadStr.toString());

		if (!payload.items || payload.items.length === 0) {
			return { success: false, message: 'Harus ada minimal 1 barang.' };
		}

		try {
			await sql.begin(async (sql) => {
				// 1. Generate PR Number: PR/YYYY/MM/XXXX
				const dateObj = new Date(payload.date);
				const year = dateObj.getFullYear();
				const month = String(dateObj.getMonth() + 1).padStart(2, '0');
				
				const countRes = await sql`SELECT COUNT(*) FROM procurement.purchase_request WHERE date_part('year', date) = ${year} AND date_part('month', date) = ${dateObj.getMonth() + 1}`;
				const seq = String(Number(countRes[0].count) + 1).padStart(4, '0');
				const prNumber = `PR/${year}/${month}/${seq}`;

				// 2. Insert Header
				const [pr] = await sql`
					INSERT INTO procurement.purchase_request (
						pr_number, date, department, requested_by, status, notes
					) VALUES (
						${prNumber}, ${payload.date}, ${payload.department}, ${payload.requested_by}, ${payload.action}, ${payload.notes}
					) RETURNING id
				`;

				// 3. Insert Lines
				for (const item of payload.items) {
					if (!item.item_id) continue;
					await sql`
						INSERT INTO procurement.purchase_request_line (
							pr_id, item_id, qty_requested, remarks
						) VALUES (
							${pr.id}, ${item.item_id}, ${item.qty_requested}, ${item.remarks}
						)
					`;
				}
			});

			return { success: true, message: 'Purchase Request berhasil disimpan!' };
		} catch (e: any) {
			console.error("Error saving PR:", e);
			return { success: false, message: e.message || 'Gagal menyimpan Purchase Request' };
		}
	}
};
