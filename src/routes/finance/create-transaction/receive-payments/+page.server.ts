import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		// Fetch active customers
		const customers = await sql`
			SELECT id, kode_kustomer as code, nama_kustomer as name 
			FROM master.m_customer 
			ORDER BY nama_kustomer ASC
		`;

		// Fetch bank/cash accounts for receiving payments
		// Assuming finance.account has some 'type' like 'Bank' or 'Cash' or we just fetch all for now
		// Let's check master.m_bank_account or finance.account. We added account_id referencing finance.account.
		// Usually a chart of accounts has a code starting with 1 (Assets) -> 11 (Cash/Bank).
		const accounts = await sql`
			SELECT id, code, name 
			FROM finance.account 
			WHERE code LIKE '11%' OR code LIKE '12%'
			ORDER BY code ASC
		`;

		// If finance.account is not populated yet with Banks, maybe we fetch them anyway or let the user choose from any asset account.

		return {
			customers,
			accounts
		};
	} catch (err: any) {
		console.error("Error loading receive payment data:", err);
		throw error(500, 'Gagal mengambil data referensi');
	}
};

export const actions = {
	savePayment: async ({ request }) => {
		const data = await request.formData();
		const payloadStr = data.get('payload');
		
		if (!payloadStr) {
			return { success: false, message: 'Data tidak lengkap' };
		}

		const payload = JSON.parse(payloadStr.toString());

		if (!payload.account_id) {
			return { success: false, message: 'Harap pilih Rekening Penerima (Akun Kas/Bank)' };
		}
		if (payload.amount <= 0) {
			return { success: false, message: 'Jumlah Diterima harus lebih besar dari 0' };
		}

		try {
			// Start transaction
			await sql.begin(async (sql) => {
				// 1. Generate Payment Number
				const dateObj = new Date(payload.date);
				const year = dateObj.getFullYear();
				const month = String(dateObj.getMonth() + 1).padStart(2, '0');
				
				const countRes = await sql`SELECT COUNT(*) FROM finance.payment WHERE type = 'RECEIVE' AND date_part('year', date) = ${year} AND date_part('month', date) = ${dateObj.getMonth() + 1}`;
				const seq = String(Number(countRes[0].count) + 1).padStart(4, '0');
				const paymentNumber = `RCV/${year}/${month}/${seq}`;

				// 2. Insert Payment
				const [payment] = await sql`
					INSERT INTO finance.payment (
						type, payment_number, date, partner_id, account_id, amount, reference, notes, status
					) VALUES (
						'RECEIVE', ${paymentNumber}, ${payload.date}, ${payload.partner_id}, ${payload.account_id}, ${payload.amount}, ${payload.reference}, ${payload.notes}, 'POSTED'
					) RETURNING id
				`;

				// 3. Insert Allocations & Update Invoice Status
				for (const alloc of payload.allocations) {
					if (alloc.payment_amount > 0) {
						// 3a. Verify due amount directly from DB (Backend Validation)
						const checkRes = await sql`
							SELECT 
								i.total_amount,
								COALESCE(SUM(pa.amount), 0) as paid_amount
							FROM finance.invoice i
							LEFT JOIN finance.payment_allocation pa ON pa.invoice_id = i.id
								AND pa.payment_id IN (SELECT id FROM finance.payment WHERE status != 'CANCELLED')
							WHERE i.id = ${alloc.invoice_id}
							GROUP BY i.id
						`;
						
						if (!checkRes || checkRes.length === 0) {
							throw new Error(`Invoice ${alloc.invoice_number} tidak ditemukan.`);
						}
						
						const invData = checkRes[0];
						const currentDue = Number(invData.total_amount) - Number(invData.paid_amount);
						
						if (Number(alloc.payment_amount) > currentDue) {
							throw new Error(`Alokasi pada invoice ${alloc.invoice_number} melebihi sisa tagihan. Sisa tagihan saat ini: ${currentDue}, yang coba dialokasikan: ${alloc.payment_amount}.`);
						}
						
						// 3b. Insert allocation
						await sql`
							INSERT INTO finance.payment_allocation (
								payment_id, invoice_id, amount
							) VALUES (
								${payment.id}, ${alloc.invoice_id}, ${alloc.payment_amount}
							)
						`;

						// 3c. If fully paid, update status to PAID
						if (Number(alloc.payment_amount) === currentDue) {
							await sql`
								UPDATE finance.invoice 
								SET status = 'PAID', updated_at = NOW() 
								WHERE id = ${alloc.invoice_id}
							`;
						}
					}
				}
			});

			return { success: true, message: 'Pembayaran berhasil disimpan' };
		} catch (e: any) {
			console.error("Failed to save payment:", e);
			return { success: false, message: 'Gagal menyimpan pembayaran: ' + e.message };
		}
	}
};
