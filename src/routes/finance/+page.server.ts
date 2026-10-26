import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		const [
			[invoicesSummary],
			[billsSummary],
			[dnSummary],
			[ledgerSummary],
			[ujoSummary],
			[agingSummary],
			dbMonthlyTrend,
			recentInvoices,
			recentBills,
			recentPayments,
			recentUjo
		] = await Promise.all([
			// 1. Total Customer Invoices (Receivables / Piutang - type = 'SALES')
			sql<any[]>`
				SELECT 
					COALESCE(SUM(total_amount), 0)::bigint as total_invoiced,
					COALESCE(SUM(advance_payment), 0)::bigint as total_advance,
					COUNT(id)::int as total_count,
					COUNT(CASE WHEN status = 'DRAFT' THEN 1 END)::int as draft_count,
					COALESCE(SUM(CASE WHEN status = 'DRAFT' THEN total_amount ELSE 0 END), 0)::bigint as draft_amount,
					COUNT(CASE WHEN status = 'POSTED' THEN 1 END)::int as posted_count,
					COALESCE(SUM(CASE WHEN status = 'POSTED' THEN total_amount ELSE 0 END), 0)::bigint as posted_amount,
					COUNT(CASE WHEN status = 'PAID' THEN 1 END)::int as paid_count,
					COALESCE(SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END), 0)::bigint as paid_amount,
					COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'PAID' THEN 1 END)::int as overdue_count,
					COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND status != 'PAID' THEN total_amount ELSE 0 END), 0)::bigint as overdue_amount
				FROM finance.invoice
				WHERE type = 'SALES'
			`,

			// 2. Total Vendor Bills (Payables / Hutang - type = 'VENDOR_BILL')
			sql<any[]>`
				SELECT 
					COALESCE(SUM(total_amount), 0)::bigint as total_bills,
					COUNT(id)::int as total_count,
					COUNT(CASE WHEN status = 'DRAFT' THEN 1 END)::int as draft_count,
					COALESCE(SUM(CASE WHEN status = 'DRAFT' THEN total_amount ELSE 0 END), 0)::bigint as draft_amount,
					COUNT(CASE WHEN status = 'POSTED' THEN 1 END)::int as posted_count,
					COALESCE(SUM(CASE WHEN status = 'POSTED' THEN total_amount ELSE 0 END), 0)::bigint as posted_amount,
					COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'PAID' THEN 1 END)::int as overdue_count,
					COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND status != 'PAID' THEN total_amount ELSE 0 END), 0)::bigint as overdue_amount
				FROM finance.invoice
				WHERE type = 'VENDOR_BILL'
			`,

			// 3. Delivery Notes (DN Siap Tagih dari Operasional Logistik)
			sql<any[]>`
				SELECT 
					COUNT(id)::int as total_count,
					COALESCE(SUM(total_amount), 0)::bigint as total_amount,
					COUNT(CASE WHEN status = 'INVOICED' THEN 1 END)::int as invoiced_count,
					COALESCE(SUM(CASE WHEN status = 'INVOICED' THEN total_amount ELSE 0 END), 0)::bigint as invoiced_amount,
					COUNT(CASE WHEN status != 'INVOICED' THEN 1 END)::int as unbilled_count,
					COALESCE(SUM(CASE WHEN status != 'INVOICED' THEN total_amount ELSE 0 END), 0)::bigint as unbilled_amount
				FROM finance.dn_header
			`,

			// 4. Kasir Cash Ledger (Buku Kas & Likuiditas)
			sql<any[]>`
				SELECT 
					COALESCE(SUM(CASE WHEN direction = 'IN' THEN amount ELSE 0 END), 0)::bigint as cash_in,
					COALESCE(SUM(CASE WHEN direction = 'OUT' THEN amount ELSE 0 END), 0)::bigint as cash_out
				FROM finance.kasir_cash_ledger
			`,

			// 5. Total Cash Advances (UJO Kasir Operasional)
			sql<any[]>`
				SELECT 
					COUNT(id)::int as total_count,
					COALESCE(SUM(estimated_ujo), 0)::bigint as total_ujo,
					COALESCE(SUM(extra_cost), 0)::bigint as total_extra
				FROM finance.cash_advance
				WHERE payment_status = 'PAID'
			`,

			// 6. AR Aging Schedule (Klasifikasi Usia Piutang Belum Lunas)
			sql<any[]>`
				SELECT 
					COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN total_amount ELSE 0 END), 0)::bigint as current_amount,
					COUNT(CASE WHEN due_date >= CURRENT_DATE THEN 1 END)::int as current_count,
					COALESCE(SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 1 AND 30 THEN total_amount ELSE 0 END), 0)::bigint as days_1_30_amount,
					COUNT(CASE WHEN CURRENT_DATE - due_date BETWEEN 1 AND 30 THEN 1 END)::int as days_1_30_count,
					COALESCE(SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN total_amount ELSE 0 END), 0)::bigint as days_31_60_amount,
					COUNT(CASE WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN 1 END)::int as days_31_60_count,
					COALESCE(SUM(CASE WHEN CURRENT_DATE - due_date > 60 THEN total_amount ELSE 0 END), 0)::bigint as over_60_amount,
					COUNT(CASE WHEN CURRENT_DATE - due_date > 60 THEN 1 END)::int as over_60_count
				FROM finance.invoice
				WHERE type = 'SALES' AND status != 'PAID'
			`,

			// 7. Monthly Trend 6 Bulan (Nilai Faktur Penjualan vs Perputaran Kas)
			sql<any[]>`
				WITH months AS (
					SELECT 
						date_trunc('month', d) as m_date,
						TO_CHAR(d, 'Mon') as month_label,
						TO_CHAR(d, 'YYYY-MM') as period_key
					FROM generate_series(
						date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
						date_trunc('month', CURRENT_DATE),
						INTERVAL '1 month'
					) d
				),
				inv AS (
					SELECT 
						date_trunc('month', date) as m_date,
						COALESCE(SUM(total_amount), 0)::bigint as total_inv
					FROM finance.invoice
					WHERE type = 'SALES'
					GROUP BY date_trunc('month', date)
				),
				cash_in AS (
					SELECT 
						date_trunc('month', created_at) as m_date,
						COALESCE(SUM(amount), 0)::bigint as total_in
					FROM finance.kasir_cash_ledger
					WHERE direction = 'IN'
					GROUP BY date_trunc('month', created_at)
				),
				cash_out AS (
					SELECT 
						date_trunc('month', created_at) as m_date,
						COALESCE(SUM(amount), 0)::bigint as total_out
					FROM finance.kasir_cash_ledger
					WHERE direction = 'OUT'
					GROUP BY date_trunc('month', created_at)
				)
				SELECT 
					m.month_label,
					m.period_key,
					COALESCE(i.total_inv, 0)::bigint as invoice_amount,
					COALESCE(ci.total_in, 0)::bigint as cash_in,
					COALESCE(co.total_out, 0)::bigint as cash_out
				FROM months m
				LEFT JOIN inv i ON i.m_date = m.m_date
				LEFT JOIN cash_in ci ON ci.m_date = m.m_date
				LEFT JOIN cash_out co ON co.m_date = m.m_date
				ORDER BY m.m_date ASC
			`,

			// 8. Recent Invoices List (Faktur Penjualan - SALES)
			sql<any[]>`
				SELECT 
					i.id,
					i.invoice_number,
					to_char(i.date, 'YYYY-MM-DD') as date,
					to_char(i.due_date, 'YYYY-MM-DD') as due_date,
					COALESCE(c.nama_kustomer, '-') as partner_name,
					i.total_amount,
					i.status,
					i.type
				FROM finance.invoice i
				LEFT JOIN master.m_customer c ON c.id = i.partner_id
				WHERE i.type = 'SALES'
				ORDER BY i.date DESC, i.id DESC
				LIMIT 6
			`,

			// 9. Recent Vendor Bills List (Tagihan Pembelian - VENDOR_BILL)
			sql<any[]>`
				SELECT 
					i.id,
					i.invoice_number,
					to_char(i.date, 'YYYY-MM-DD') as date,
					to_char(i.due_date, 'YYYY-MM-DD') as due_date,
					COALESCE(v.nama_vendor, '-') as partner_name,
					i.total_amount,
					i.status,
					i.type
				FROM finance.invoice i
				LEFT JOIN master.m_vendor v ON v.id = i.partner_id
				WHERE i.type = 'VENDOR_BILL'
				ORDER BY i.date DESC, i.id DESC
				LIMIT 6
			`,

			// 10. Recent Payments List (Kas & Bank)
			sql<any[]>`
				SELECT 
					p.id,
					p.payment_number,
					to_char(p.date, 'YYYY-MM-DD') as date,
					COALESCE(c.nama_kustomer, v.nama_vendor, '-') as partner_name,
					p.amount,
					p.type,
					p.status
				FROM finance.payment p
				LEFT JOIN master.m_customer c ON c.id = p.partner_id
				LEFT JOIN master.m_vendor v ON v.id = p.partner_id
				ORDER BY p.date DESC, p.id DESC
				LIMIT 6
			`,

			// 11. Recent Cash Advances (UJO Operasional Kasir)
			sql<any[]>`
				SELECT 
					ca.id,
					ca.sales_order_id,
					COALESCE(k.nama_karyawan, 'No Driver') as driver_name,
					COALESCE(u.nomor_unit, 'No Unit') as unit_no,
					ca.estimated_ujo as ujo_amount,
					ca.extra_cost,
					ca.payment_status,
					to_char(ca.created_at, 'YYYY-MM-DD') as date
				FROM finance.cash_advance ca
				LEFT JOIN fleet.unit u ON u.id = ca.unit_id
				LEFT JOIN master.m_drivers d ON d.id = ca.driver_id
				LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
				ORDER BY ca.created_at DESC
				LIMIT 6
			`
		]);

		const totalInvoiced = parseFloat(invoicesSummary?.total_invoiced || '0');
		const postedInvoiced = parseFloat(invoicesSummary?.posted_amount || '0');
		const draftInvoiced = parseFloat(invoicesSummary?.draft_amount || '0');
		const totalBills = parseFloat(billsSummary?.total_bills || '0');
		const cashIn = parseFloat(ledgerSummary?.cash_in || '0');
		const cashOut = parseFloat(ledgerSummary?.cash_out || '0');
		const netCash = cashIn - cashOut;

		// Hitung skala maksimum untuk grafik batang bulanan
		const maxMonthlyVal = Math.max(
			...dbMonthlyTrend.map((m: any) =>
				Math.max(
					parseFloat(m.invoice_amount || 0),
					parseFloat(m.cash_in || 0),
					parseFloat(m.cash_out || 0)
				)
			),
			1
		);

		const monthlyTrend = dbMonthlyTrend.map((m: any) => {
			const inv = parseFloat(m.invoice_amount || 0);
			const cin = parseFloat(m.cash_in || 0);
			const cout = parseFloat(m.cash_out || 0);
			return {
				month: m.month_label,
				period: m.period_key,
				invoiceAmount: inv,
				invoicePct: Math.min(100, Math.round((inv / maxMonthlyVal) * 100)),
				cashIn: cin,
				cashInPct: Math.min(100, Math.round((cin / maxMonthlyVal) * 100)),
				cashOut: cout,
				cashOutPct: Math.min(100, Math.round((cout / maxMonthlyVal) * 100))
			};
		});

		// AR Aging Calculation
		const curAmt = parseFloat(agingSummary?.current_amount || '0');
		const d1Amt = parseFloat(agingSummary?.days_1_30_amount || '0');
		const d31Amt = parseFloat(agingSummary?.days_31_60_amount || '0');
		const d60Amt = parseFloat(agingSummary?.over_60_amount || '0');
		const totalAging = curAmt + d1Amt + d31Amt + d60Amt || 1;

		const aging = {
			current: {
				amount: curAmt,
				count: parseInt(agingSummary?.current_count || '0'),
				pct: Math.round((curAmt / totalAging) * 100)
			},
			days_1_30: {
				amount: d1Amt,
				count: parseInt(agingSummary?.days_1_30_count || '0'),
				pct: Math.round((d1Amt / totalAging) * 100)
			},
			days_31_60: {
				amount: d31Amt,
				count: parseInt(agingSummary?.days_31_60_count || '0'),
				pct: Math.round((d31Amt / totalAging) * 100)
			},
			over_60: {
				amount: d60Amt,
				count: parseInt(agingSummary?.over_60_count || '0'),
				pct: Math.round((d60Amt / totalAging) * 100)
			},
			totalReceivable: totalAging === 1 && curAmt === 0 ? 0 : totalAging
		};

		return {
			summary: {
				totalInvoiced,
				postedInvoiced,
				draftInvoiced,
				totalInvoicedCount: parseInt(invoicesSummary?.total_count || '0'),
				postedInvoicedCount: parseInt(invoicesSummary?.posted_count || '0'),
				draftInvoicedCount: parseInt(invoicesSummary?.draft_count || '0'),
				totalBills,
				totalBillsCount: parseInt(billsSummary?.total_count || '0'),
				draftBillsCount: parseInt(billsSummary?.draft_count || '0'),
				overdueCount: parseInt(invoicesSummary?.overdue_count || '0'),
				overdueAmount: parseFloat(invoicesSummary?.overdue_amount || '0'),
				cashIn,
				cashOut,
				netCash,
				totalUjoPaid: parseFloat(ujoSummary?.total_ujo || '0'),
				totalUjoCount: parseInt(ujoSummary?.total_count || '0')
			},
			pipeline: {
				stage1_dn: {
					count: parseInt(dnSummary?.total_count || '0'),
					amount: parseFloat(dnSummary?.total_amount || '0'),
					unbilledCount: parseInt(dnSummary?.unbilled_count || '0'),
					invoicedCount: parseInt(dnSummary?.invoiced_count || '0')
				},
				stage2_draft: {
					count: parseInt(invoicesSummary?.draft_count || '0'),
					amount: draftInvoiced
				},
				stage3_posted: {
					count: parseInt(invoicesSummary?.posted_count || '0'),
					amount: postedInvoiced
				},
				stage4_settled: {
					count: parseInt(invoicesSummary?.paid_count || '0'),
					amount: parseFloat(invoicesSummary?.paid_amount || '0')
				}
			},
			aging,
			monthlyTrend,
			recentInvoices,
			recentBills,
			recentPayments,
			recentUjo
		};
	} catch (err: any) {
		console.error('Error loading Finance dashboard:', err);
		return {
			summary: {
				totalInvoiced: 0,
				postedInvoiced: 0,
				draftInvoiced: 0,
				totalInvoicedCount: 0,
				postedInvoicedCount: 0,
				draftInvoicedCount: 0,
				totalBills: 0,
				totalBillsCount: 0,
				draftBillsCount: 0,
				overdueCount: 0,
				overdueAmount: 0,
				cashIn: 0,
				cashOut: 0,
				netCash: 0,
				totalUjoPaid: 0,
				totalUjoCount: 0
			},
			pipeline: {
				stage1_dn: { count: 0, amount: 0, unbilledCount: 0, invoicedCount: 0 },
				stage2_draft: { count: 0, amount: 0 },
				stage3_posted: { count: 0, amount: 0 },
				stage4_settled: { count: 0, amount: 0 }
			},
			aging: {
				current: { amount: 0, count: 0, pct: 0 },
				days_1_30: { amount: 0, count: 0, pct: 0 },
				days_31_60: { amount: 0, count: 0, pct: 0 },
				over_60: { amount: 0, count: 0, pct: 0 },
				totalReceivable: 0
			},
			monthlyTrend: [],
			recentInvoices: [],
			recentBills: [],
			recentPayments: [],
			recentUjo: []
		};
	}
};
