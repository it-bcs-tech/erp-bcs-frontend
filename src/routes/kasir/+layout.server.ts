import type { LayoutServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: LayoutServerLoad = async ({ locals }) => {
	try {
		// 1. Query active shift session
		const activeShiftRows = await sql`
			SELECT 
				s.id,
				s.session_number as "sessionNumber",
				s.shift_name as "shiftName",
				s.shift_date as "shiftDate",
				s.cashier_name as "cashierName",
				s.opened_at as "openedAt",
				s.status,
				s.opening_cash as "openingCash",
				s.total_cash_in as "totalCashIn",
				s.total_cash_out as "totalCashOut",
				s.expected_closing_cash as "expectedClosingCash",
				s.total_ujo_count as "totalUjoCount",
				s.total_ujo_amount as "totalUjoAmount",
				s.total_dn_count as "totalDnCount"
			FROM finance.kasir_shift_sessions s
			WHERE s.status = 'OPEN'
			ORDER BY s.opened_at DESC
			LIMIT 1
		`;

		let activeShift = activeShiftRows.length > 0 ? activeShiftRows[0] : null;

		// 2. If active shift exists, compute live counters
		if (activeShift) {
			const shiftId = activeShift.id;

			const ujoStats = await sql`
				SELECT 
					COUNT(*) as count,
					COALESCE(SUM(estimated_ujo), 0) as total
				FROM finance.cash_advance
				WHERE disbursed_shift_session_id = ${shiftId}
			`;

			const dnStats = await sql`
				SELECT COUNT(*) as count
				FROM finance.dn_detail
				WHERE received_shift_session_id = ${shiftId}
			`;

			// 1. Total uang masuk ke laci shift (Top Up dari Brankas / Drop Finance)
			const topupRows = await sql`
				SELECT COALESCE(SUM(amount), 0) as "cashIn"
				FROM finance.kasir_cash_ledger
				WHERE shift_session_id = ${shiftId} 
				  AND category IN ('PENARIKAN_KAS_SHIFT', 'TOPUP_KAS_SHIFT', 'DROP_DANA_FINANCE', 'KAS_MASUK_LAIN')
			`;
			const cashIn = parseFloat(topupRows[0]?.cashIn) || 0;

			// 2. Total uang keluar dari laci shift (Total UJO dicairkan ke supir)
			const ujoCount = parseInt(ujoStats[0]?.count) || 0;
			const ujoTotal = parseFloat(ujoStats[0]?.total) || 0;
			const cashOut = ujoTotal;

			const dnCount = parseInt(dnStats[0]?.count) || 0;
			const openingCash = parseFloat(activeShift.openingCash) || 0;
			const currentExpectedCash = openingCash + cashIn - cashOut;

			activeShift = {
				...activeShift,
				openingCash,
				totalCashIn: cashIn,
				totalCashOut: cashOut,
				expectedClosingCash: currentExpectedCash,
				totalUjoCount: ujoCount,
				totalUjoAmount: ujoTotal,
				totalDnCount: dnCount
			};
		}

		// 3. Global sidebar badge counters
		const pendingUjo = await sql`
			SELECT COUNT(*) as count 
			FROM finance.cash_advance ca
			JOIN marketing.sales_order o ON o.id = ca.sales_order_id
			WHERE o.status IN ('READY_TO_DISPATCH', 'DISPATCHED') AND ca.payment_status = 'UNPAID'
		`;
		const pendingDN = await sql`
			SELECT COUNT(*) as count 
			FROM fleet.trip t
			LEFT JOIN finance.dn_detail dn ON dn.trip_id = t.id
			WHERE t.status = 'COMPLETED' AND dn.id IS NULL
		`;
		const pendingClosing = await sql`
			SELECT COUNT(*) as count 
			FROM finance.cash_advance ca
			JOIN marketing.sales_order o ON o.id = ca.sales_order_id
			WHERE o.status IN ('CLOSING', 'COMPLETED') AND ca.extra_cost_payment_status = 'UNPAID'
		`;

		return {
			activeShift,
			user: locals?.user || { name: 'Kasir Operasional' },
			counts: {
				pendingUjo: parseInt(pendingUjo[0]?.count) || 0,
				pendingDN: parseInt(pendingDN[0]?.count) || 0,
				pendingClosing: parseInt(pendingClosing[0]?.count) || 0
			}
		};
	} catch (err) {
		console.error('Error loading Kasir layout:', err);
		return {
			activeShift: null,
			user: locals?.user || { name: 'Kasir Operasional' },
			counts: { pendingUjo: 0, pendingDN: 0, pendingClosing: 0 }
		};
	}
};
