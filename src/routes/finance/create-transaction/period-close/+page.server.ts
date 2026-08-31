import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		const [stats] = await sql`
			SELECT 
				COUNT(CASE WHEN status = 'DRAFT' THEN 1 END) as unposted_invoices,
				COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'PAID' THEN 1 END) as overdue_invoices,
				(SELECT COUNT(*) FROM finance.journal_entry WHERE status != 'POSTED') as unposted_journals
			FROM finance.invoice
		`;

		return {
			stats: {
				unpostedInvoices: parseInt(stats?.unposted_invoices || '0'),
				overdueInvoices: parseInt(stats?.overdue_invoices || '0'),
				unpostedJournals: parseInt(stats?.unposted_journals || '0')
			}
		};
	} catch (err: any) {
		console.error('Error loading period close stats:', err);
		return { stats: { unpostedInvoices: 0, overdueInvoices: 0, unpostedJournals: 0 } };
	}
};
