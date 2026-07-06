import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { error, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		const [customers, contracts, banks, departments, projects, accounts, taxes] = await Promise.all([
			sql`SELECT id, kode_kustomer as code, nama_kustomer as name FROM master.m_customer WHERE is_active = true ORDER BY name ASC`,
			sql`SELECT c.id, c.customer_id, c.project_id, p.project_name FROM marketing.contract c LEFT JOIN master.m_project p ON c.project_id = p.id WHERE c.status = 'Active'`,
			sql`SELECT id, account_number, account_name, bank_name as name FROM master.m_bank_account WHERE is_active = true ORDER BY name ASC`,
			sql`SELECT id, dept_code as code, dept_name as name FROM master.m_dept WHERE active = 'Y' ORDER BY name ASC`,
			sql`SELECT id, project_name as name FROM master.m_project WHERE is_active = true ORDER BY name ASC`,
			sql`SELECT id, code, name FROM finance.account WHERE account_type = 'REVENUE' AND is_active = true ORDER BY code ASC`,
			sql`SELECT id, nama_pajak as name, value as rate FROM master.m_pajak WHERE is_active = true ORDER BY name ASC`
		]);

		return { customers, contracts, banks, departments, projects, accounts, taxes };
	} catch (err) {
		console.error("Error fetching master data for Customer Invoices:", err);
		throw error(500, 'Internal Server Error fetching master data');
	}
};

export const actions: Actions = {
	// New action: fetch dn_detail filtered by customer_id and date range
	getDnDetails: async ({ request }) => {
		const data = await request.formData();
		const customerId = data.get('customerId') as string;
		const startDate = data.get('startDate') as string;
		const endDate = data.get('endDate') as string;

		if (!customerId) {
			return fail(400, { message: 'Customer harus dipilih terlebih dahulu.' });
		}

		const hasStart = startDate && startDate.trim() !== '';
		const hasEnd = endDate && endDate.trim() !== '';

		const startD = hasStart ? new Date(startDate) : null;
		const endD = hasEnd ? new Date(endDate) : null;

		try {
			const details = await sql`
				SELECT 
					d.id,
					d.no_surat_jalan,
					d.tgl_surat_jalan,
					d.total_berat,
					d.total_amount,
					d.tarif,
					d.dn_header_id,
					o.customer_id,
					o.jenis_muatan,
					mc.nama_kustomer,
					c.project_id,
					mp.project_name,
					o.contract_id
				FROM finance.dn_detail d
				LEFT JOIN fleet.trip t ON t.id = d.trip_id
				LEFT JOIN marketing.sales_order o ON o.assigned_unit_id = t.unit_id AND o.tgl_muat::date = t.tgl_trip::date
				LEFT JOIN master.m_customer mc ON mc.id = o.customer_id
				LEFT JOIN marketing.contract c ON c.id = o.contract_id
				LEFT JOIN master.m_project mp ON mp.id = c.project_id
				WHERE o.customer_id = ${customerId}
				  AND d.dn_header_id IS NULL
				  ${hasStart ? sql`AND d.tgl_surat_jalan >= ${startD}` : sql``}
				  ${hasEnd ? sql`AND d.tgl_surat_jalan <= ${endD}` : sql``}
				ORDER BY d.tgl_surat_jalan ASC, d.no_surat_jalan ASC
			`;
			return { success: true, details };
		} catch (e: any) {
			console.error("getDnDetails error:", e);
			return fail(500, { message: e.message });
		}
	},


	saveInvoice: async ({ request }) => {
		const data = await request.formData();
		const invoiceJson = data.get('invoice')?.toString();
		const selectedDnIdsJson = data.get('selectedDnIds')?.toString();
		
		if (!invoiceJson) {
			return { success: false, message: 'Missing invoice data' };
		}
		
		try {
			const invoice = JSON.parse(invoiceJson);
			const selectedDnIds: string[] = selectedDnIdsJson ? JSON.parse(selectedDnIdsJson) : [];
			
			// Generate invoice number from placeholder
			if (invoice.no_inv && invoice.no_inv.startsWith('*****')) {
				const randomId = Math.floor(Math.random() * 90000) + 10000; 
				invoice.no_inv = invoice.no_inv.replace('*****', randomId.toString());
			}

			// Calculate due date from tgl_kirim_inv + term_pembayaran
			let dueDate = invoice.tgl_inv;
			const termDays = parseInt(invoice.term_pembayaran) || 0;
			const baseDateStr = invoice.tgl_kirim_inv || invoice.tgl_inv;
			
			if (baseDateStr && termDays > 0) {
				const d = new Date(baseDateStr);
				d.setDate(d.getDate() + termDays);
				dueDate = d.toISOString().split('T')[0];
			}

			const reference = invoice.no_po_spk || '';
			
			// Calculate totals from items
			let subtotal = 0;
			let taxAmount = 0;
			for (const item of invoice.items) {
				subtotal += item.qty * item.harga;
			}
			const totalAmount = subtotal + taxAmount - (invoice.uang_muka || 0);
			
			let savedInvoiceNumber = invoice.no_inv;

			await sql.begin(async (tx) => {
				// 1. Create dn_header from selected DN details (if any are selected)
				let dnHeaderId: string | null = null;
				if (selectedDnIds.length > 0) {
					const totalDnAmount = invoice.items.reduce((sum: number, item: any) => sum + (item.qty * item.harga), 0);
					const noDnHeader = `DN-${new Date().toISOString().slice(0,7).replace('-','')}-${Date.now().toString().slice(-4)}`;
					
					const [newDnHeader] = await tx`
						INSERT INTO finance.dn_header (dn_header_no, customer_id, total_amount, status)
						VALUES (${noDnHeader}, ${invoice.customer_id}, ${totalDnAmount}, 'INVOICED')
						RETURNING id
					`;
					dnHeaderId = newDnHeader.id;

					// Link selected dn_details to this new dn_header
					for (const dnDetailId of selectedDnIds) {
						await tx`
							UPDATE finance.dn_detail 
							SET dn_header_id = ${dnHeaderId}
							WHERE id = ${dnDetailId} AND dn_header_id IS NULL
						`;
					}
				}

				// 2. Insert Invoice Header
				const [newInvoice] = await tx`
					INSERT INTO finance.invoice (
						type, invoice_number, partner_id, date, due_date, 
						currency, subtotal, tax_amount, total_amount, status, reference, notes,
						contract_id, po_spk_number, bank_account_id, activity_period, delivery_date, payment_term_days, advance_payment
					) VALUES (
						'SALES', ${invoice.no_inv}, ${invoice.customer_id}, ${invoice.tgl_inv}, ${dueDate},
						'IDR', ${subtotal}, ${taxAmount}, ${totalAmount}, ${invoice.status}, ${reference}, ${invoice.remark},
						${invoice.no_kontrak || null}, ${invoice.no_po_spk}, ${invoice.bank_id || null}, ${invoice.periode_kegiatan}, 
						${invoice.tgl_kirim_inv || null}, ${invoice.term_pembayaran}, ${invoice.uang_muka}
					) RETURNING id, invoice_number
				`;

				savedInvoiceNumber = newInvoice.invoice_number;

				// 3. Link dn_header to invoice if created
				if (dnHeaderId) {
					await tx`UPDATE finance.dn_header SET invoice_id = ${newInvoice.id} WHERE id = ${dnHeaderId}`;
				}

				// 4. Insert Invoice Lines
				for (const item of invoice.items) {
					await tx`
						INSERT INTO finance.invoice_line (
							invoice_id, account_id, description, quantity, unit_price, total,
							department_id, project_id, uom, tax_id
						) VALUES (
							${newInvoice.id}, ${item.akun_pendapatan || null}, ${item.deskripsi}, ${item.qty}, ${item.harga}, ${item.qty * item.harga},
							${item.department_id || null}, ${item.project_id || null}, ${item.satuan}, ${item.pajak_id || null}
						)
					`;
				}
			});

			return { success: true, message: 'Invoice berhasil disimpan!', invoice_number: savedInvoiceNumber };
		} catch (e: any) {
			console.error("Error saving customer invoice:", e);
			return fail(500, { success: false, message: `Gagal menyimpan invoice: ${e.message}` });
		}
	}
};
