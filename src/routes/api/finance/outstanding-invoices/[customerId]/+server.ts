import { json } from '@sveltejs/kit';
import sql from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const customerId = params.customerId;

	try {
		const outstandingInvoices = await sql`
			SELECT 
				i.id,
				i.invoice_number,
				i.date,
				i.due_date,
				i.total_amount,
				COALESCE(SUM(pa.amount), 0) as paid_amount,
				(i.total_amount - COALESCE(SUM(pa.amount), 0)) as due_amount
			FROM finance.invoice i
			LEFT JOIN finance.payment_allocation pa ON pa.invoice_id = i.id 
				AND pa.payment_id IN (SELECT id FROM finance.payment WHERE status != 'CANCELLED')
			WHERE i.partner_id = ${customerId}
			  AND i.status = 'POSTED'
			GROUP BY i.id
			HAVING (i.total_amount - COALESCE(SUM(pa.amount), 0)) > 0
			ORDER BY i.date ASC
		`;

		return json({
			success: true,
			data: outstandingInvoices
		});
	} catch (error: any) {
		console.error("Error fetching outstanding invoices:", error);
		return json({ success: false, message: error.message }, { status: 500 });
	}
};
