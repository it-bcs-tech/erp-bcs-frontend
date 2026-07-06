import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
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

		return {
			invoice,
			invoiceLines
		};
	} catch (err: any) {
		console.error("Error fetching invoice print data:", err);
		throw error(500, 'Gagal mengambil data invoice');
	}
};
