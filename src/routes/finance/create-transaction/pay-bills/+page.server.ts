import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		// Fetch Vendors
		const vendors = await sql`
			SELECT id, kode_kustomer as code, nama_kustomer as name 
			FROM master.m_customer 
			WHERE UPPER(kategori) = 'VENDOR' OR kode_kustomer LIKE 'V%' OR kode_kustomer LIKE 'VND-%'
			ORDER BY nama_kustomer ASC
		`;

		// Fetch Bank / Cash accounts
		const accounts = await sql`
			SELECT id, code, name 
			FROM finance.account 
			WHERE is_active = true
			ORDER BY code ASC
		`;

		// Fetch Unpaid Vendor Bills
		const unpaidBills = await sql`
			SELECT 
				i.id,
				i.invoice_number as bill_number,
				i.partner_id as vendor_id,
				to_char(i.date, 'YYYY-MM-DD') as date,
				to_char(i.due_date, 'YYYY-MM-DD') as due_date,
				i.total_amount,
				COALESCE((
					SELECT SUM(pa.amount) 
					FROM finance.payment_allocation pa 
					JOIN finance.payment p ON p.id = pa.payment_id
					WHERE pa.invoice_id = i.id AND p.status != 'CANCELLED'
				), 0) as paid_amount,
				c.nama_kustomer as vendor_name
			FROM finance.invoice i
			LEFT JOIN master.m_customer c ON c.id = i.partner_id
			WHERE i.type = 'IN_INVOICE' AND i.status != 'PAID' AND i.status != 'CANCELLED'
			ORDER BY i.due_date ASC
		`;

		return {
			vendors,
			accounts,
			unpaidBills
		};
	} catch (err: any) {
		console.error('Error loading pay-bills data:', err);
		return { vendors: [], accounts: [], unpaidBills: [] };
	}
};

export const actions: Actions = {
	savePayment: async ({ request }) => {
		const data = await request.formData();
		const date = data.get('date') as string || new Date().toISOString().split('T')[0];
		const vendorId = data.get('vendorId') as string;
		const accountId = data.get('accountId') ? parseInt(data.get('accountId') as string) : null;
		const amount = parseFloat(data.get('amount') as string || '0');
		const reference = (data.get('reference') as string || '').trim();
		const notes = (data.get('notes') as string || '').trim();
		const billId = data.get('billId') ? parseInt(data.get('billId') as string) : null;

		if (!vendorId) {
			return fail(400, { success: false, message: 'Harap pilih Vendor / Pemasok!' });
		}
		if (amount <= 0) {
			return fail(400, { success: false, message: 'Jumlah Pembayaran harus lebih besar dari 0!' });
		}

		try {
			await sql.begin(async (sql) => {
				const dateObj = new Date(date);
				const year = dateObj.getFullYear();
				const month = String(dateObj.getMonth() + 1).padStart(2, '0');

				const countRes = await sql`
					SELECT COUNT(*) FROM finance.payment 
					WHERE type = 'PAY' AND date_part('year', date) = ${year} AND date_part('month', date) = ${dateObj.getMonth() + 1}
				`;
				const seq = String(Number(countRes[0].count) + 1).padStart(4, '0');
				const paymentNumber = `PAY/${year}/${month}/${seq}`;

				const [payment] = await sql`
					INSERT INTO finance.payment (
						type, payment_number, date, partner_id, account_id, amount, reference, notes, status
					) VALUES (
						'PAY', ${paymentNumber}, ${date}, ${vendorId}, ${accountId}, ${amount}, ${reference}, ${notes}, 'POSTED'
					) RETURNING id
				`;

				if (billId) {
					await sql`
						INSERT INTO finance.payment_allocation (
							payment_id, invoice_id, amount
						) VALUES (
							${payment.id}, ${billId}, ${amount}
						)
					`;

					// Check if bill is fully paid
					const [billCheck] = await sql`
						SELECT 
							i.total_amount,
							COALESCE(SUM(pa.amount), 0) as total_paid
						FROM finance.invoice i
						LEFT JOIN finance.payment_allocation pa ON pa.invoice_id = i.id
						WHERE i.id = ${billId}
						GROUP BY i.id
					`;

					if (billCheck && Number(billCheck.total_paid) >= Number(billCheck.total_amount)) {
						await sql`UPDATE finance.invoice SET status = 'PAID', updated_at = NOW() WHERE id = ${billId}`;
					}
				}
			});
		} catch (err: any) {
			console.error('Error saving pay bill:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan pembayaran tagihan' });
		}

		throw redirect(303, '/finance/payments');
	}
};
