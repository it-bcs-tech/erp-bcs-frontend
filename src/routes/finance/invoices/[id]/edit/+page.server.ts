import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { error, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const invoiceId = params.id;
	
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

		// Fetch the invoice
		const [invoice] = await sql`SELECT * FROM finance.invoice WHERE id = ${invoiceId}`;
		if (!invoice) throw error(404, 'Invoice not found');

		// Fetch Invoice Lines
		const invoiceLines = await sql`
			SELECT 
				il.*,
				p.project_name,
				d.dept_name,
				a.code as account_code,
				t.value as tax_rate
			FROM finance.invoice_line il
			LEFT JOIN master.m_project p ON p.id = il.project_id
			LEFT JOIN master.m_dept d ON d.id = il.department_id
			LEFT JOIN finance.account a ON a.id = il.account_id
			LEFT JOIN master.m_pajak t ON t.id = il.tax_id
			WHERE il.invoice_id = ${invoiceId}
		`;

		// Fetch currently selected DN details
		const selectedDns = await sql`
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
			JOIN finance.dn_header dh ON dh.id = d.dn_header_id
			LEFT JOIN fleet.trip t ON t.id = d.trip_id
			LEFT JOIN marketing.sales_order o ON o.assigned_unit_id = t.unit_id AND o.tgl_muat::date = t.tgl_trip::date
			LEFT JOIN master.m_customer mc ON mc.id = o.customer_id
			LEFT JOIN marketing.contract c ON c.id = o.contract_id
			LEFT JOIN master.m_project mp ON mp.id = c.project_id
			WHERE dh.invoice_id = ${invoiceId}
		`;

		return { customers, contracts, banks, departments, projects, accounts, taxes, invoice, invoiceLines, selectedDns };
	} catch (err) {
		console.error("Error fetching invoice data:", err);
		throw error(500, 'Internal Server Error fetching invoice data');
	}
};

export const actions: Actions = {
	getDnDetails: async ({ request, params }) => {
		const data = await request.formData();
		const customerId = data.get('customerId') as string;
		const startDate = data.get('startDate') as string;
		const endDate = data.get('endDate') as string;
		const invoiceId = params.id;

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
				LEFT JOIN finance.dn_header dh ON dh.id = d.dn_header_id
				LEFT JOIN fleet.trip t ON t.id = d.trip_id
				LEFT JOIN marketing.sales_order o ON o.assigned_unit_id = t.unit_id AND o.tgl_muat::date = t.tgl_trip::date
				LEFT JOIN master.m_customer mc ON mc.id = o.customer_id
				LEFT JOIN marketing.contract c ON c.id = o.contract_id
				LEFT JOIN master.m_project mp ON mp.id = c.project_id
				WHERE o.customer_id = ${customerId}
				  AND (d.dn_header_id IS NULL OR dh.invoice_id = ${invoiceId})
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

	updateInvoice: async ({ request, params }) => {
		const invoiceId = params.id;
		const data = await request.formData();
		const invoiceJson = data.get('invoice')?.toString();
		const selectedDnIdsJson = data.get('selectedDnIds')?.toString();
		
		if (!invoiceJson) {
			return { success: false, message: 'Missing invoice data' };
		}
		
		try {
			const invoiceData = JSON.parse(invoiceJson);
			const selectedDnIds: string[] = selectedDnIdsJson ? JSON.parse(selectedDnIdsJson) : [];
			
			let dueDate = invoiceData.tgl_inv;
			const termDays = parseInt(invoiceData.term_pembayaran) || 0;
			const baseDateStr = invoiceData.tgl_kirim_inv || invoiceData.tgl_inv;
			
			if (baseDateStr && termDays > 0) {
				const d = new Date(baseDateStr);
				d.setDate(d.getDate() + termDays);
				dueDate = d.toISOString().split('T')[0];
			}

			const reference = invoiceData.no_po_spk || '';
			
			let subtotal = 0;
			let taxAmount = 0;
			for (const item of invoiceData.items) {
				subtotal += item.qty * item.harga;
			}
			const totalAmount = subtotal + taxAmount - (invoiceData.uang_muka || 0);

			await sql.begin(async (tx) => {
				// 1. Unlink removed DN details
				const existingDnHeader = await tx`SELECT id FROM finance.dn_header WHERE invoice_id = ${invoiceId}`;
				let dnHeaderId = existingDnHeader.length > 0 ? existingDnHeader[0].id : null;

				if (dnHeaderId) {
					// Unlink all DN details from this header first
					await tx`UPDATE finance.dn_detail SET dn_header_id = NULL WHERE dn_header_id = ${dnHeaderId}`;
				}

				if (selectedDnIds.length > 0) {
					if (!dnHeaderId) {
						// Create dn_header if doesn't exist
						const totalDnAmount = invoiceData.items.reduce((sum: number, item: any) => sum + (item.qty * item.harga), 0);
						const noDnHeader = `DN-${new Date().toISOString().slice(0,7).replace('-','')}-${Date.now().toString().slice(-4)}`;
						const [newDnHeader] = await tx`
							INSERT INTO finance.dn_header (dn_header_no, customer_id, total_amount, status, invoice_id)
							VALUES (${noDnHeader}, ${invoiceData.customer_id}, ${totalDnAmount}, 'INVOICED', ${invoiceId})
							RETURNING id
						`;
						dnHeaderId = newDnHeader.id;
					}

					// Link selected dn_details to this dn_header
					for (const dnDetailId of selectedDnIds) {
						await tx`UPDATE finance.dn_detail SET dn_header_id = ${dnHeaderId} WHERE id = ${dnDetailId}`;
					}
				} else if (dnHeaderId) {
					// If no DNs selected, delete the dn_header entirely
					await tx`DELETE FROM finance.dn_header WHERE id = ${dnHeaderId}`;
				}

				// 2. Update Invoice Header
				await tx`
					UPDATE finance.invoice SET
						date = ${invoiceData.tgl_inv},
						due_date = ${dueDate},
						subtotal = ${subtotal},
						tax_amount = ${taxAmount},
						total_amount = ${totalAmount},
						reference = ${reference},
						notes = ${invoiceData.remark},
						contract_id = ${invoiceData.no_kontrak || null},
						po_spk_number = ${invoiceData.no_po_spk},
						bank_account_id = ${invoiceData.bank_id || null},
						activity_period = ${invoiceData.periode_kegiatan},
						delivery_date = ${invoiceData.tgl_kirim_inv || null},
						payment_term_days = ${invoiceData.term_pembayaran},
						advance_payment = ${invoiceData.uang_muka},
						updated_at = NOW()
					WHERE id = ${invoiceId}
				`;

				// 3. Delete old Invoice Lines
				await tx`DELETE FROM finance.invoice_line WHERE invoice_id = ${invoiceId}`;

				// 4. Insert new Invoice Lines
				for (const item of invoiceData.items) {
					await tx`
						INSERT INTO finance.invoice_line (
							invoice_id, account_id, description, quantity, unit_price, total,
							department_id, project_id, uom, tax_id
						) VALUES (
							${invoiceId}, ${item.akun_pendapatan || null}, ${item.deskripsi}, ${item.qty}, ${item.harga}, ${item.qty * item.harga},
							${item.department_id || null}, ${item.project_id || null}, ${item.satuan}, ${item.pajak_id || null}
						)
					`;
				}
			});

			return { success: true, message: 'Invoice berhasil diperbarui!', invoice_number: invoiceData.no_inv };
		} catch (e: any) {
			console.error("Error updating customer invoice:", e);
			return fail(500, { success: false, message: `Gagal memperbarui invoice: ${e.message}` });
		}
	}
};
