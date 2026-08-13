import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { verifyUserData } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	let userName = '';
	const userDataCookie = cookies.get('user_data');
	if (userDataCookie) {
		const user = verifyUserData(userDataCookie);
		if (user) userName = user.name;
	}

	try {
		// Fetch Vendors
		const vendors = await sql`
			SELECT id, nama_kustomer as name 
			FROM master.m_customer 
			WHERE kategori = 'Vendor' AND is_active = true
			ORDER BY nama_kustomer ASC
		`;

		// Fetch items (materials) for manual adding
		const items = await sql`
			SELECT id, material_code, name, part_no, uom 
			FROM master.m_materials 
			WHERE is_active = true
			ORDER BY name ASC
		`;

		// Fetch Taxes
		const taxes = await sql`
			SELECT id, nama_pajak as name, value as rate
			FROM master.m_pajak
			WHERE is_active = true
		`;

		// Fetch Approved PRs that are not fully ordered yet (For simplicity, just fetch all APPROVED)
		const approvedPrs = await sql`
			SELECT id, pr_number, department, requested_by, date
			FROM procurement.purchase_request
			WHERE status = 'APPROVED'
			ORDER BY created_at DESC
		`;

		return {
			vendors,
			items,
			taxes,
			approvedPrs,
			userName
		};
	} catch (err: any) {
		console.error("Error fetching PO prerequisites:", err);
		throw error(500, 'Gagal memuat data master untuk PO');
	}
};

export const actions = {
	savePO: async ({ request }) => {
		const data = await request.formData();
		const payloadStr = data.get('payload');
		if (!payloadStr) {
			return { success: false, message: 'Payload is required' };
		}

		const payload = JSON.parse(payloadStr.toString());

		if (!payload.vendor_id) {
			return { success: false, message: 'Vendor belum dipilih.' };
		}
		if (!payload.items || payload.items.length === 0) {
			return { success: false, message: 'Harus ada minimal 1 barang.' };
		}

		try {
			await sql.begin(async (sql) => {
				// 1. Generate PO Number: PO/YYYY/MM/XXXX
				const dateObj = new Date(payload.date);
				const year = dateObj.getFullYear();
				const month = String(dateObj.getMonth() + 1).padStart(2, '0');
				
				const countRes = await sql`SELECT COUNT(*) FROM procurement.purchase_order WHERE date_part('year', date) = ${year} AND date_part('month', date) = ${dateObj.getMonth() + 1}`;
				const seq = String(Number(countRes[0].count) + 1).padStart(4, '0');
				const poNumber = `PO/${year}/${month}/${seq}`;

				// 2. Insert Header
				const [po] = await sql`
					INSERT INTO procurement.purchase_order (
						po_number, date, vendor_id, created_by, status, notes, subtotal, tax_amount, total_amount
					) VALUES (
						${poNumber}, ${payload.date}, ${payload.vendor_id}, ${payload.created_by}, ${payload.action}, ${payload.notes},
						${payload.subtotal}, ${payload.tax_amount}, ${payload.total_amount}
					) RETURNING id
				`;

				// 3. Insert Lines
				for (const item of payload.items) {
					if (!item.item_id) continue;
					await sql`
						INSERT INTO procurement.purchase_order_line (
							po_id, pr_line_id, item_id, qty_ordered, unit_price, tax_id, tax_amount, total
						) VALUES (
							${po.id}, ${item.pr_line_id || null}, ${item.item_id}, ${item.qty_ordered}, ${item.unit_price}, 
							${item.tax_id || null}, ${item.tax_amount}, ${item.total}
						)
					`;
				}
			});

			return { success: true, message: 'Purchase Order berhasil disimpan!' };
		} catch (e: any) {
			console.error("Error saving PO:", e);
			return { success: false, message: e.message || 'Gagal menyimpan Purchase Order' };
		}
	}
};
