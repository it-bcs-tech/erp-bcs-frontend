import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		// Fetch Vendors (from m_customer where kategori = 'Vendor')
		const vendors = await sql`
			SELECT id, nama_kustomer as name 
			FROM master.m_customer 
			WHERE kategori = 'Vendor' AND is_active = true
			ORDER BY nama_kustomer ASC
		`;

		// Fetch COA (Only expenses or payables usually, but we fetch all for now, maybe type='EXPENSE')
		const accounts = await sql`
			SELECT id, code, name, account_type 
			FROM finance.account 
			WHERE is_active = true 
			ORDER BY code ASC
		`;

		// Fetch Taxes
		const taxes = await sql`
			SELECT id, nama_pajak as name, value as rate
			FROM master.m_pajak
			WHERE is_active = true
		`;

		return {
			vendors,
			accounts,
			taxes
		};
	} catch (err: any) {
		console.error("Error fetching vendor bill prerequisites:", err);
		throw error(500, 'Gagal memuat data master untuk vendor bill');
	}
};

export const actions = {
	saveBill: async ({ request }) => {
		const data = await request.formData();
		const payloadStr = data.get('payload');
		if (!payloadStr) {
			return { success: false, message: 'Payload is required' };
		}

		const payload = JSON.parse(payloadStr.toString());

		if (!payload.partner_id) {
			return { success: false, message: 'Vendor belum dipilih.' };
		}
		if (!payload.items || payload.items.length === 0) {
			return { success: false, message: 'Harus ada minimal 1 rincian tagihan.' };
		}

		try {
			await sql.begin(async (sql) => {
				// 1. Generate Bill Number: BILL/YYYY/MM/XXXX
				const dateObj = new Date(payload.date);
				const year = dateObj.getFullYear();
				const month = String(dateObj.getMonth() + 1).padStart(2, '0');
				
				const countRes = await sql`SELECT COUNT(*) FROM finance.invoice WHERE type = 'VENDOR_BILL' AND date_part('year', date) = ${year} AND date_part('month', date) = ${dateObj.getMonth() + 1}`;
				const seq = String(Number(countRes[0].count) + 1).padStart(4, '0');
				const billNumber = `BILL/${year}/${month}/${seq}`;

				// 2. Insert Header
				const [bill] = await sql`
					INSERT INTO finance.invoice (
						type, invoice_number, partner_id, date, due_date, 
						reference, notes, status, subtotal, tax_amount, total_amount
					) VALUES (
						'VENDOR_BILL', ${billNumber}, ${payload.partner_id}, ${payload.date}, ${payload.due_date}, 
						${payload.reference}, ${payload.notes}, ${payload.action}, 
						${payload.subtotal}, ${payload.tax_amount}, ${payload.total_amount}
					) RETURNING id
				`;

				// 3. Insert Lines
				for (const item of payload.items) {
					await sql`
						INSERT INTO finance.invoice_line (
							invoice_id, account_id, description, quantity, unit_price, tax_id, tax_amount, total
						) VALUES (
							${bill.id}, ${item.account_id || null}, ${item.description}, ${item.qty}, ${item.price}, 
							${item.tax_id || null}, ${item.tax_amount}, ${item.total}
						)
					`;
				}
			});

			return { success: true, message: 'Vendor Bill berhasil disimpan!' };
		} catch (e: any) {
			console.error("Error saving vendor bill:", e);
			return { success: false, message: e.message || 'Gagal menyimpan vendor bill' };
		}
	}
};
