import { json } from '@sveltejs/kit';
import sql from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const invoiceId = params.id;

	try {
		// Fetch Invoice and Customer details
		const [invoice] = await sql`
			SELECT 
				i.*,
				c.kode_kustomer as customer_code,
				c.nama_kustomer as customer_name,
				c.alamat as customer_address,
				b.bank_name,
				b.account_number,
				b.account_name
			FROM finance.invoice i
			LEFT JOIN master.m_customer c ON c.id = i.partner_id
			LEFT JOIN master.m_bank_account b ON b.id = i.bank_account_id
			WHERE i.id = ${invoiceId}
		`;

		if (!invoice) {
			return json({ success: false, message: 'Invoice not found' }, { status: 404 });
		}

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
		const dnDetails = await sql`
			SELECT 
				d.no_surat_jalan,
				d.tgl_surat_jalan,
				d.total_berat,
				d.total_amount,
				d.tarif,
				o.jenis_muatan,
				mp.project_name
			FROM finance.dn_detail d
			JOIN finance.dn_header dh ON dh.id = d.dn_header_id
			LEFT JOIN fleet.trip t ON t.id = d.trip_id
			LEFT JOIN marketing.sales_order o ON o.assigned_unit_id = t.unit_id AND o.tgl_muat::date = t.tgl_trip::date
			LEFT JOIN marketing.contract c ON c.id = o.contract_id
			LEFT JOIN master.m_project mp ON mp.id = c.project_id
			WHERE dh.invoice_id = ${invoiceId}
			ORDER BY d.tgl_surat_jalan ASC, d.no_surat_jalan ASC
		`;

		return json({
			success: true,
			invoice,
			invoiceLines,
			dnDetails
		});
	} catch (error: any) {
		console.error("Error fetching invoice api:", error);
		return json({ success: false, message: error.message }, { status: 500 });
	}
};
