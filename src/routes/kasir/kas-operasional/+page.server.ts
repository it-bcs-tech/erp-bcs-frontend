import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		// 1. Overall Balance
		const totals = await sql`
			SELECT 
				COALESCE(SUM(CASE WHEN direction = 'IN' THEN amount ELSE 0 END), 0) as "totalIn",
				COALESCE(SUM(CASE WHEN direction = 'OUT' THEN amount ELSE 0 END), 0) as "totalOut"
			FROM finance.kasir_cash_ledger
		`;
		const totalIn = parseFloat(totals[0].totalIn) || 0;
		const totalOut = parseFloat(totals[0].totalOut) || 0;
		const currentBalance = totalIn - totalOut;

		// 2. This Month Stats
		const monthTotals = await sql`
			SELECT 
				COALESCE(SUM(CASE WHEN direction = 'IN' THEN amount ELSE 0 END), 0) as "monthIn",
				COALESCE(SUM(CASE WHEN direction = 'OUT' THEN amount ELSE 0 END), 0) as "monthOut"
			FROM finance.kasir_cash_ledger
			WHERE DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
		`;
		const monthIn = parseFloat(monthTotals[0].monthIn) || 0;
		const monthOut = parseFloat(monthTotals[0].monthOut) || 0;

		// 3. Pending Fund Requests Stats
		const pendingReqStats = await sql`
			SELECT 
				COUNT(*) as count,
				COALESCE(SUM(amount_requested), 0) as total
			FROM finance.kasir_fund_request
			WHERE status = 'PENDING'
		`;
		const pendingCount = parseInt(pendingReqStats[0].count) || 0;
		const pendingTotal = parseFloat(pendingReqStats[0].total) || 0;

		// 4. Fund Requests List
		const fundRequests = await sql`
			SELECT 
				id,
				request_number as "requestNumber",
				request_date as "requestDate",
				amount_requested as "amountRequested",
				amount_received as "amountReceived",
				purpose,
				status,
				payment_method as "paymentMethod",
				reference_no as "referenceNo",
				notes,
				received_at as "receivedAt",
				received_by as "receivedBy",
				created_at as "createdAt",
				created_by as "createdBy"
			FROM finance.kasir_fund_request
			ORDER BY created_at DESC
			LIMIT 100
		`;

		// 5. Cash Ledger History with Running Balance
		const rawLedger = await sql`
			SELECT 
				id,
				transaction_date as "transactionDate",
				direction,
				category,
				amount,
				reference_id as "referenceId",
				reference_type as "referenceType",
				description,
				performed_by as "performedBy",
				created_at as "createdAt"
			FROM finance.kasir_cash_ledger
			ORDER BY transaction_date ASC, created_at ASC
		`;

		// Calculate cumulative balance forward
		let runningBal = 0;
		const ledgerWithBalance = rawLedger.map((row: any) => {
			const amt = parseFloat(row.amount) || 0;
			if (row.direction === 'IN') {
				runningBal += amt;
			} else {
				runningBal -= amt;
			}
			return {
				...row,
				amount: amt,
				balanceAfter: runningBal
			};
		});

		// Sort newest first for display
		ledgerWithBalance.reverse();

		// 6. Shifts pending Daily Closing
		const pendingShifts = await sql`
			SELECT 
				id,
				session_number as "sessionNumber",
				shift_name as "shiftName",
				shift_date as "shiftDate",
				cashier_name as "cashierName",
				opened_at as "openedAt",
				closed_at as "closedAt",
				opening_cash as "openingCash",
				total_cash_in as "totalCashIn",
				total_cash_out as "totalCashOut",
				expected_closing_cash as "expectedClosingCash",
				actual_closing_cash as "actualClosingCash",
				cash_difference as "cashDifference",
				handover_to as "handoverTo",
				total_ujo_count as "totalUjoCount",
				total_ujo_amount as "totalUjoAmount",
				total_dn_count as "totalDnCount",
				closing_notes as "closingNotes"
			FROM finance.kasir_shift_sessions
			WHERE status = 'CLOSED' AND daily_closing_id IS NULL
			ORDER BY opened_at ASC
		`;

		// Calculate daily reconciliation summary if there are pending shifts
		let reconciliationSummary: any = null;
		if (pendingShifts.length > 0) {
			const shiftIds = pendingShifts.map((s: any) => s.id);
			const initialOpeningCash = parseFloat(pendingShifts[0].openingCash) || 0;
			const latestActualClosingCash = parseFloat(pendingShifts[pendingShifts.length - 1].actualClosingCash) || 0;

			const totalUjoPaid = pendingShifts.reduce((acc: number, s: any) => acc + (parseFloat(s.totalUjoAmount) || 0), 0);
			const totalUjoCount = pendingShifts.reduce((acc: number, s: any) => acc + (parseInt(s.totalUjoCount) || 0), 0);
			const totalDnCount = pendingShifts.reduce((acc: number, s: any) => acc + (parseInt(s.totalDnCount) || 0), 0);

			// Query ledger mutations linked to these shifts
			const shiftLedger = await sql`
				SELECT 
					direction,
					category,
					COALESCE(SUM(amount), 0) as total
				FROM finance.kasir_cash_ledger
				WHERE shift_session_id = ANY(${shiftIds})
				GROUP BY direction, category
			`;

			let totalFundDropped = 0;
			let totalRefundReceived = 0;
			let totalDnClaimPaid = 0;
			let totalOtherExpenses = 0;

			for (const row of shiftLedger) {
				const amt = parseFloat(row.total) || 0;
				if (row.direction === 'IN') {
					if (['DROP_DANA_FINANCE', 'TOPUP_KAS_SHIFT', 'PENARIKAN_KAS_SHIFT'].includes(row.category)) {
						totalFundDropped += amt;
					} else {
						totalRefundReceived += amt;
					}
				} else if (row.direction === 'OUT') {
					if (['SETTLEMENT_DN_EXTRA', 'KLAIM_SURAT_JALAN'].includes(row.category)) {
						totalDnClaimPaid += amt;
					} else if (row.category !== 'PENGELUARAN_UJO') {
						totalOtherExpenses += amt;
					}
				}
			}

			const totalCashOutFromShifts = pendingShifts.reduce((acc: number, s: any) => acc + (parseFloat(s.totalCashOut) || 0), 0);
			const totalCashOut = Math.max(totalCashOutFromShifts, totalUjoPaid + totalDnClaimPaid + totalOtherExpenses);
			const totalCashAvailable = initialOpeningCash + totalFundDropped;
			const expectedClosingCash = totalCashAvailable - totalCashOut + totalRefundReceived;
			const actualClosingCash = latestActualClosingCash;
			const cashDifference = actualClosingCash - expectedClosingCash;
			const status = Math.abs(cashDifference) < 1 ? 'BALANCED' : 'DISCREPANCY';

			reconciliationSummary = {
				shiftCount: pendingShifts.length,
				shiftIds,
				periodStart: pendingShifts[0].openedAt,
				periodEnd: pendingShifts[pendingShifts.length - 1].closedAt,
				openingCash: initialOpeningCash,
				totalFundDropped,
				totalCashAvailable,
				totalUjoPaid,
				totalUjoCount,
				totalDnClaimPaid,
				totalDnCount,
				totalOtherExpenses,
				totalRefundReceived,
				totalCashOut,
				expectedClosingCash,
				actualClosingCash,
				cashDifference,
				status
			};
		}

		// 7. Daily Closing History
		const dailyClosingHistory = await sql`
			SELECT 
				id,
				closing_number as "closingNumber",
				closing_date as "closingDate",
				period_start as "periodStart",
				period_end as "periodEnd",
				opening_cash as "openingCash",
				total_fund_dropped as "totalFundDropped",
				total_cash_available as "totalCashAvailable",
				total_ujo_paid as "totalUjoPaid",
				total_dn_claim_paid as "totalDnClaimPaid",
				total_other_expenses as "totalOtherExpenses",
				total_refund_received as "totalRefundReceived",
				total_cash_out as "totalCashOut",
				expected_closing_cash as "expectedClosingCash",
				actual_closing_cash as "actualClosingCash",
				cash_difference as "cashDifference",
				difference_reason as "differenceReason",
				status,
				shift_session_ids as "shiftSessionIds",
				closed_by as "closedBy",
				notes,
				created_at as "createdAt"
			FROM finance.kasir_daily_closing
			ORDER BY closing_date DESC, created_at DESC
			LIMIT 30
		`;

		return {
			stats: {
				currentBalance,
				totalIn,
				totalOut,
				monthIn,
				monthOut,
				pendingCount,
				pendingTotal
			},
			fundRequests: fundRequests as any[],
			ledger: ledgerWithBalance.slice(0, 100) as any[],
			pendingShifts: pendingShifts as any[],
			reconciliationSummary,
			dailyClosingHistory: dailyClosingHistory as any[]
		};
	} catch (error) {
		console.error("Error loading Kas Operasional:", error);
		return {
			stats: {
				currentBalance: 0,
				totalIn: 0,
				totalOut: 0,
				monthIn: 0,
				monthOut: 0,
				pendingCount: 0,
				pendingTotal: 0
			},
			fundRequests: [],
			ledger: [],
			pendingShifts: [],
			reconciliationSummary: null,
			dailyClosingHistory: []
		};
	}
};

export const actions: Actions = {
	createFundRequest: async ({ request, locals }) => {
		const data = await request.formData();
		const amount = parseFloat(data.get('amount') as string);
		const purpose = (data.get('purpose') as string)?.trim();
		const requestDate = (data.get('requestDate') as string) || new Date().toISOString().split('T')[0];
		const notes = (data.get('notes') as string)?.trim() || null;
		const user = locals?.user?.name || 'Kasir Operasional';

		if (!amount || amount <= 0) {
			return fail(400, { message: 'Nominal pengajuan dana harus lebih besar dari 0.' });
		}
		if (!purpose) {
			return fail(400, { message: 'Keperluan pengajuan dana wajib diisi.' });
		}

		try {
			// Generate Request Number: REQ-YYMMDD-XXX
			const now = new Date();
			const yy = String(now.getFullYear()).slice(-2);
			const mm = String(now.getMonth() + 1).padStart(2, '0');
			const dd = String(now.getDate()).padStart(2, '0');
			const prefix = `REQ-${yy}${mm}${dd}-`;

			const countRes = await sql`
				SELECT COUNT(*) as count 
				FROM finance.kasir_fund_request 
				WHERE request_number LIKE ${prefix + '%'}
			`;
			const seq = parseInt(countRes[0].count) + 1;
			const reqNumber = `${prefix}${String(seq).padStart(3, '0')}`;
			const reqId = reqNumber;

			await sql`
				INSERT INTO finance.kasir_fund_request (
					id,
					request_number,
					request_date,
					amount_requested,
					amount_received,
					purpose,
					status,
					notes,
					created_by
				) VALUES (
					${reqId},
					${reqNumber},
					${requestDate},
					${amount},
					0,
					${purpose},
					'PENDING',
					${notes},
					${user}
				)
			`;

			return { success: true, message: `Pengajuan dana ${reqNumber} sebesar Rp ${amount.toLocaleString('id-ID')} berhasil diajukan ke Finance!` };
		} catch (e: any) {
			console.error("Create fund request error:", e);
			return fail(500, { error: e.message || 'Gagal membuat pengajuan dana.' });
		}
	},

	confirmReceiveFund: async ({ request, locals }) => {
		const data = await request.formData();
		const requestId = data.get('requestId') as string;
		const amountReceived = parseFloat(data.get('amountReceived') as string);
		const paymentMethod = (data.get('paymentMethod') as string) || 'TRANSFER';
		const referenceNo = (data.get('referenceNo') as string)?.trim() || null;
		const notes = (data.get('notes') as string)?.trim() || null;
		const user = locals?.user?.name || 'Kasir Operasional';

		if (!requestId) {
			return fail(400, { message: 'ID Pengajuan tidak valid.' });
		}
		if (!amountReceived || amountReceived <= 0) {
			return fail(400, { message: 'Nominal dana yang diterima harus lebih dari 0.' });
		}

		try {
			await sql.begin(async (sql) => {
				// 1. Get request
				const existing = await sql`
					SELECT id, request_number, purpose, status 
					FROM finance.kasir_fund_request 
					WHERE id = ${requestId} FOR UPDATE
				`;

				if (existing.length === 0) {
					throw new Error('Pengajuan dana tidak ditemukan.');
				}
				if (existing[0].status === 'RECEIVED') {
					throw new Error('Pengajuan dana ini sudah dikonfirmasi sebelumnya.');
				}

				// 2. Update request status
				await sql`
					UPDATE finance.kasir_fund_request
					SET 
						status = 'RECEIVED',
						amount_received = ${amountReceived},
						payment_method = ${paymentMethod},
						reference_no = ${referenceNo},
						received_at = NOW(),
						received_by = ${user},
						notes = COALESCE(${notes}, notes)
					WHERE id = ${requestId}
				`;

				// 3. Insert IN mutation to Cash Ledger
				const activeShiftRows = await sql`
					SELECT id FROM finance.kasir_shift_sessions WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1
				`;
				const shiftSessionId = activeShiftRows.length > 0 ? activeShiftRows[0].id : null;

				const desc = `Drop Dana dari Finance (${existing[0].request_number}) - ${existing[0].purpose}${notes ? ' - ' + notes : ''}`;
				await sql`
					INSERT INTO finance.kasir_cash_ledger (
						direction,
						category,
						amount,
						reference_id,
						reference_type,
						description,
						performed_by,
						shift_session_id
					) VALUES (
						'IN',
						'DROP_DANA_FINANCE',
						${amountReceived},
						${existing[0].request_number},
						'FUND_REQUEST',
						${desc},
						${user},
						${shiftSessionId}
					)
				`;

				if (shiftSessionId) {
					await sql`
						UPDATE finance.kasir_shift_sessions
						SET 
							total_cash_in = total_cash_in + ${amountReceived},
							expected_closing_cash = expected_closing_cash + ${amountReceived},
							updated_at = CURRENT_TIMESTAMP
						WHERE id = ${shiftSessionId}
					`;
				}
			});

			return { success: true, message: `Penerimaan dana ${requestId} sebesar Rp ${amountReceived.toLocaleString('id-ID')} berhasil dicatat ke saldo kasir!` };
		} catch (e: any) {
			console.error("Confirm receive fund error:", e);
			return fail(500, { error: e.message || 'Gagal mengonfirmasi penerimaan dana.' });
		}
	},

	cancelFundRequest: async ({ request }) => {
		const data = await request.formData();
		const requestId = data.get('requestId') as string;

		if (!requestId) {
			return fail(400, { message: 'ID Pengajuan tidak ditemukan.' });
		}

		try {
			await sql`
				UPDATE finance.kasir_fund_request
				SET status = 'CANCELED'
				WHERE id = ${requestId} AND status = 'PENDING'
			`;
			return { success: true, message: `Pengajuan dana ${requestId} berhasil dibatalkan.` };
		} catch (e: any) {
			console.error("Cancel fund request error:", e);
			return fail(500, { error: e.message || 'Gagal membatalkan pengajuan dana.' });
		}
	},

	directTopup: async ({ request, locals }) => {
		const data = await request.formData();
		const amount = parseFloat(data.get('amount') as string);
		const category = (data.get('category') as string) || 'DROP_DANA_FINANCE';
		const referenceNo = (data.get('referenceNo') as string)?.trim() || null;
		const description = (data.get('description') as string)?.trim() || 'Drop Kas Operasional';
		const user = locals?.user?.name || 'Kasir Operasional';

		if (!amount || amount <= 0) {
			return fail(400, { message: 'Nominal dana masuk harus lebih besar dari 0.' });
		}

		try {
			// Kategori penyesuaian saldo buku besar / saldo awal adalah level makro ledger, tidak boleh dikaitkan ke shift laci kasir aktif
			const isAdjustment = category === 'PENYESUAIAN_SALDO' || category === 'SALDO_AWAL';

			let shiftSessionId: number | null = null;
			if (!isAdjustment) {
				const activeShiftRows = await sql`
					SELECT id FROM finance.kasir_shift_sessions WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1
				`;
				shiftSessionId = activeShiftRows.length > 0 ? activeShiftRows[0].id : null;
			}

			await sql`
				INSERT INTO finance.kasir_cash_ledger (
					direction,
					category,
					amount,
					reference_id,
					reference_type,
					description,
					performed_by,
					shift_session_id
				) VALUES (
					'IN',
					${category},
					${amount},
					${referenceNo || 'DIRECT-TOPUP'},
					'MANUAL',
					${description},
					${user},
					${shiftSessionId}
				)
			`;

			if (shiftSessionId && !isAdjustment) {
				await sql`
					UPDATE finance.kasir_shift_sessions
					SET 
						total_cash_in = total_cash_in + ${amount},
						expected_closing_cash = expected_closing_cash + ${amount},
						updated_at = CURRENT_TIMESTAMP
					WHERE id = ${shiftSessionId}
				`;
			}

			return { success: true, message: `Kas masuk sebesar Rp ${amount.toLocaleString('id-ID')} berhasil dicatat ke saldo operasional!` };
		} catch (e: any) {
			console.error("Direct topup error:", e);
			return fail(500, { error: e.message || 'Gagal mencatat dana masuk.' });
		}
	},

	directExpense: async ({ request, locals }) => {
		const data = await request.formData();
		const amount = parseFloat(data.get('amount') as string);
		const category = (data.get('category') as string) || 'BIAYA_OPERASIONAL_LAIN';
		const referenceNo = (data.get('referenceNo') as string)?.trim() || null;
		const description = (data.get('description') as string)?.trim() || 'Pengeluaran Kas Operasional';
		const user = locals?.user?.name || 'Kasir Operasional';

		if (!amount || amount <= 0) {
			return fail(400, { message: 'Nominal pengeluaran harus lebih besar dari 0.' });
		}

		try {
			const activeShiftRows = await sql`
				SELECT id FROM finance.kasir_shift_sessions WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1
			`;
			const shiftSessionId = activeShiftRows.length > 0 ? activeShiftRows[0].id : null;

			await sql`
				INSERT INTO finance.kasir_cash_ledger (
					direction,
					category,
					amount,
					reference_id,
					reference_type,
					description,
					performed_by,
					shift_session_id
				) VALUES (
					'OUT',
					${category},
					${amount},
					${referenceNo || 'DIRECT-OUT'},
					'MANUAL',
					${description},
					${user},
					${shiftSessionId}
				)
			`;

			if (shiftSessionId) {
				await sql`
					UPDATE finance.kasir_shift_sessions
					SET 
						total_cash_out = total_cash_out + ${amount},
						expected_closing_cash = expected_closing_cash - ${amount},
						updated_at = CURRENT_TIMESTAMP
					WHERE id = ${shiftSessionId}
				`;
			}

			return { success: true, message: `Pengeluaran kas sebesar Rp ${amount.toLocaleString('id-ID')} berhasil dicatat!` };
		} catch (e: any) {
			console.error("Direct expense error:", e);
			return fail(500, { error: e.message || 'Gagal mencatat pengeluaran kas.' });
		}
	},

	finalizeDailyClosing: async ({ request, locals }) => {
		const data = await request.formData();
		const shiftIdsRaw = data.get('shiftIds') as string;
		const shiftIds: number[] = shiftIdsRaw 
			? shiftIdsRaw.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) 
			: [];

		if (shiftIds.length === 0) {
			return fail(400, { message: 'Tidak ada shift session yang dipilih untuk di-closing.' });
		}

		const openingCash = parseFloat(data.get('openingCash') as string) || 0;
		const totalFundDropped = parseFloat(data.get('totalFundDropped') as string) || 0;
		const totalCashAvailable = parseFloat(data.get('totalCashAvailable') as string) || (openingCash + totalFundDropped);
		const totalUjoPaid = parseFloat(data.get('totalUjoPaid') as string) || 0;
		const totalDnClaimPaid = parseFloat(data.get('totalDnClaimPaid') as string) || 0;
		const totalOtherExpenses = parseFloat(data.get('totalOtherExpenses') as string) || 0;
		const totalRefundReceived = parseFloat(data.get('totalRefundReceived') as string) || 0;
		const totalCashOut = parseFloat(data.get('totalCashOut') as string) || (totalUjoPaid + totalDnClaimPaid + totalOtherExpenses);
		const expectedClosingCash = parseFloat(data.get('expectedClosingCash') as string) || (totalCashAvailable - totalCashOut + totalRefundReceived);
		const actualClosingCash = parseFloat(data.get('actualClosingCash') as string) || 0;
		const cashDifference = parseFloat(data.get('cashDifference') as string) || (actualClosingCash - expectedClosingCash);
		const differenceReason = (data.get('differenceReason') as string)?.trim() || null;
		const notes = (data.get('notes') as string)?.trim() || null;
		const periodStart = data.get('periodStart') as string || null;
		const periodEnd = data.get('periodEnd') as string || null;
		const user = locals?.user?.name || 'Petugas Keuangan';

		const status = Math.abs(cashDifference) < 1 ? 'BALANCED' : 'DISCREPANCY';

		try {
			let createdClosing: any = null;
			await sql.begin(async (sql) => {
				const now = new Date();
				const yy = String(now.getFullYear()).slice(-2);
				const mm = String(now.getMonth() + 1).padStart(2, '0');
				const dd = String(now.getDate()).padStart(2, '0');
				const prefix = `DCL-${yy}${mm}${dd}-`;

				const countRes = await sql`
					SELECT COUNT(*) as count 
					FROM finance.kasir_daily_closing 
					WHERE closing_number LIKE ${prefix + '%'}
				`;
				const seq = parseInt(countRes[0].count) + 1;
				const closingNumber = `${prefix}${String(seq).padStart(3, '0')}`;
				const closingDate = now.toISOString().split('T')[0];

				const insertRes = await sql`
					INSERT INTO finance.kasir_daily_closing (
						closing_number,
						closing_date,
						period_start,
						period_end,
						opening_cash,
						total_fund_dropped,
						total_cash_available,
						total_ujo_paid,
						total_dn_claim_paid,
						total_other_expenses,
						total_refund_received,
						total_cash_out,
						expected_closing_cash,
						actual_closing_cash,
						cash_difference,
						difference_reason,
						status,
						shift_session_ids,
						closed_by,
						notes
					) VALUES (
						${closingNumber},
						${closingDate},
						${periodStart ? new Date(periodStart) : null},
						${periodEnd ? new Date(periodEnd) : null},
						${openingCash},
						${totalFundDropped},
						${totalCashAvailable},
						${totalUjoPaid},
						${totalDnClaimPaid},
						${totalOtherExpenses},
						${totalRefundReceived},
						${totalCashOut},
						${expectedClosingCash},
						${actualClosingCash},
						${cashDifference},
						${differenceReason},
						${status},
						${shiftIds},
						${user},
						${notes}
					)
					RETURNING id, closing_number, closing_date, expected_closing_cash, actual_closing_cash, cash_difference, status
				`;

				createdClosing = insertRes[0];

				// Link closed shifts to this daily closing
				await sql`
					UPDATE finance.kasir_shift_sessions
					SET daily_closing_id = ${createdClosing.id},
					    updated_at = CURRENT_TIMESTAMP
					WHERE id = ANY(${shiftIds})
				`;
			});

			return {
				success: true,
				action: 'finalizeDailyClosing',
				closingId: createdClosing?.id,
				closingNumber: createdClosing?.closing_number,
				message: `Closing Harian ${createdClosing?.closing_number} berhasil difinalisasi!`
			};
		} catch (e: any) {
			console.error("Error finalizing daily closing:", e);
			return fail(500, { error: e.message || 'Gagal memfinalisasi Closing Harian.' });
		}
	}
};

