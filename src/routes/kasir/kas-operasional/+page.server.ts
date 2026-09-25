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
			ledger: ledgerWithBalance.slice(0, 100) as any[]
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
			ledger: []
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

			if (shiftSessionId) {
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
	}
};
