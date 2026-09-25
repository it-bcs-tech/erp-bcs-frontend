import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ parent }) => {
	const layoutData = await parent();
	const activeShift = layoutData.activeShift;

	try {
		// 1. Dapatkan shift terakhir yang sudah ditutup (untuk rollover modal kas awal)
		const lastClosedShift = await sql`
			SELECT 
				id,
				session_number as "sessionNumber",
				shift_name as "shiftName",
				cashier_name as "cashierName",
				closed_at as "closedAt",
				actual_closing_cash as "actualClosingCash",
				handover_to as "handoverTo"
			FROM finance.kasir_shift_sessions
			WHERE status = 'CLOSED'
			ORDER BY closed_at DESC
			LIMIT 1
		`;

		// 2. Daftar karyawan untuk pilihan kasir / penerima serah terima
		const employees = await sql`
			SELECT id, nama_karyawan as name, jabatan as role
			FROM master.m_karyawan
			WHERE status_aktif = true
			ORDER BY nama_karyawan ASC
		`;

		// 3. Jika ada shift aktif, ambil transaksi yang terjadi selama shift ini
		let shiftUjoList: any[] = [];
		let shiftDnList: any[] = [];
		let shiftLedgerList: any[] = [];

		if (activeShift) {
			const shiftId = activeShift.id;

			// List UJO dicairkan di shift ini
			shiftUjoList = await sql`
				SELECT 
					ca.id,
					o.id as "soId",
					COALESCE(k.nama_karyawan, 'No Driver') as driver,
					u.nomor_unit as unit,
					ca.estimated_ujo as amount,
					ca.ujo_makan as "ujoMakan",
					ca.ujo_tol as "ujoTol",
					ori.nama_kustomer as origin,
					dest.nama_kustomer as destination,
					ca.updated_at as "disbursedAt"
				FROM finance.cash_advance ca
				JOIN marketing.sales_order o ON o.id = ca.sales_order_id
				LEFT JOIN fleet.unit u ON u.id = ca.unit_id
				LEFT JOIN master.m_drivers d ON d.id = ca.driver_id
				LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
				LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
				LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
				WHERE ca.disbursed_shift_session_id = ${shiftId}
				ORDER BY ca.updated_at DESC
			`;

			// List DN / Surat Jalan diterima di shift ini
			shiftDnList = await sql`
				SELECT 
					dn.id,
					dn.no_surat_jalan as "noSuratJalan",
					dn.tgl_surat_jalan as "tglSuratJalan",
					dn.total_berat as "totalBerat",
					dn.created_at as "receivedAt",
					dn.file_upload as "fileUpload",
					t.no_surat_tugas as "noSuratTugas",
					u.nomor_unit as unit,
					COALESCE(k.nama_karyawan, 'No Driver') as driver,
					c.nama_kustomer as customer
				FROM finance.dn_detail dn
				LEFT JOIN fleet.trip t ON t.id = dn.trip_id
				LEFT JOIN marketing.sales_order o ON o.assigned_unit_id = t.unit_id AND o.tgl_muat::date = t.tgl_trip::date
				LEFT JOIN master.m_customer c ON c.id = o.customer_id
				LEFT JOIN fleet.unit u ON u.id = t.unit_id
				LEFT JOIN master.m_drivers d ON d.id = t.driver_id
				LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
				WHERE dn.received_shift_session_id = ${shiftId}
				ORDER BY dn.created_at DESC
			`;

			// List mutasi kasir selama shift ini
			shiftLedgerList = await sql`
				SELECT 
					id,
					transaction_date as "transactionDate",
					direction,
					category,
					amount,
					reference_id as "referenceId",
					description,
					performed_by as "performedBy",
					created_at as "createdAt"
				FROM finance.kasir_cash_ledger
				WHERE shift_session_id = ${shiftId}
				ORDER BY created_at DESC
			`;
		}

		// 4. Riwayat Shift yang lalu (History)
		const shiftHistory = await sql`
			SELECT 
				id,
				session_number as "sessionNumber",
				shift_name as "shiftName",
				shift_date as "shiftDate",
				cashier_name as "cashierName",
				opened_at as "openedAt",
				closed_at as "closedAt",
				status,
				opening_cash as "openingCash",
				total_cash_in as "totalCashIn",
				total_cash_out as "totalCashOut",
				expected_closing_cash as "expectedClosingCash",
				actual_closing_cash as "actualClosingCash",
				cash_difference as "cashDifference",
				total_ujo_count as "totalUjoCount",
				total_ujo_amount as "totalUjoAmount",
				total_dn_count as "totalDnCount",
				handover_to as "handoverTo",
				closing_notes as "closingNotes"
			FROM finance.kasir_shift_sessions
			WHERE status = 'CLOSED'
			ORDER BY closed_at DESC
			LIMIT 30
		`;

		return {
			activeShift,
			lastClosedShift: lastClosedShift.length > 0 ? lastClosedShift[0] : null,
			employees: employees as any[],
			shiftUjoList,
			shiftDnList,
			shiftLedgerList,
			shiftHistory
		};
	} catch (error) {
		console.error("Error loading Kasir Shift:", error);
		return {
			activeShift: null,
			lastClosedShift: null,
			employees: [],
			shiftUjoList: [],
			shiftDnList: [],
			shiftLedgerList: [],
			shiftHistory: []
		};
	}
};

export const actions: Actions = {
	openShift: async ({ request, locals }) => {
		const data = await request.formData();
		const shiftName = (data.get('shiftName') as string) || 'Shift 1';
		const cashierName = (data.get('cashierName') as string)?.trim() || locals?.user?.name || 'Kasir Operasional';
		const openingCash = parseFloat(data.get('openingCash') as string) || 0;

		try {
			// Cek apakah sudah ada shift yang sedang OPEN
			const existingOpen = await sql`
				SELECT id, session_number, cashier_name 
				FROM finance.kasir_shift_sessions 
				WHERE status = 'OPEN' 
				LIMIT 1
			`;

			if (existingOpen.length > 0) {
				return fail(400, {
					error: `Shift ${existingOpen[0].session_number} masih aktif dibuka oleh ${existingOpen[0].cashier_name}. Tutup shift tersebut terlebih dahulu.`
				});
			}

			// Generate session number: SHF-YYYYMMDD-S{1|2|3}-SEQ
			const now = new Date();
			const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
			const shiftCode = shiftName.includes('2') ? 'S2' : shiftName.includes('3') ? 'S3' : 'S1';
			
			const countToday = await sql`
				SELECT COUNT(*) as count 
				FROM finance.kasir_shift_sessions 
				WHERE shift_date = CURRENT_DATE
			`;
			const seq = String(parseInt(countToday[0].count) + 1).padStart(3, '0');
			const sessionNumber = `SHF-${yyyymmdd}-${shiftCode}-${seq}`;

			await sql`
				INSERT INTO finance.kasir_shift_sessions (
					session_number,
					shift_name,
					shift_date,
					cashier_name,
					opened_at,
					status,
					opening_cash,
					expected_closing_cash
				) VALUES (
					${sessionNumber},
					${shiftName},
					CURRENT_DATE,
					${cashierName},
					CURRENT_TIMESTAMP,
					'OPEN',
					${openingCash},
					${openingCash}
				)
			`;

			return { success: true, message: `Shift ${shiftName} berhasil dibuka dengan modal Rp ${openingCash.toLocaleString('id-ID')}` };
		} catch (err: any) {
			console.error("Error opening shift:", err);
			return fail(500, { error: err.message || 'Gagal membuka shift kasir.' });
		}
	},

	closeShift: async ({ request, locals }) => {
		const data = await request.formData();
		const shiftId = parseInt(data.get('shiftId') as string);
		const actualClosingCash = parseFloat(data.get('actualClosingCash') as string) || 0;
		const handoverTo = (data.get('handoverTo') as string)?.trim() || null;
		const closingNotes = (data.get('closingNotes') as string)?.trim() || null;

		if (!shiftId) {
			return fail(400, { error: 'ID sesi shift tidak valid.' });
		}

		try {
			await sql.begin(async (sql) => {
				// 1. Ambil data sesi shift
				const shiftRows = await sql`
					SELECT id, opening_cash, session_number, status
					FROM finance.kasir_shift_sessions
					WHERE id = ${shiftId} AND status = 'OPEN'
					FOR UPDATE
				`;

				if (shiftRows.length === 0) {
					throw new Error('Sesi shift tidak ditemukan atau sudah ditutup sebelumnya.');
				}

				const openingCash = parseFloat(shiftRows[0].opening_cash) || 0;

				// 2. Hitung statistik kas ledger selama shift ini
				const ledgerStats = await sql`
					SELECT 
						COALESCE(SUM(CASE WHEN direction = 'IN' THEN amount ELSE 0 END), 0) as "cashIn",
						COALESCE(SUM(CASE WHEN direction = 'OUT' THEN amount ELSE 0 END), 0) as "cashOut"
					FROM finance.kasir_cash_ledger
					WHERE shift_session_id = ${shiftId}
				`;
				const totalCashIn = parseFloat(ledgerStats[0]?.cashIn) || 0;
				const totalCashOut = parseFloat(ledgerStats[0]?.cashOut) || 0;

				// 3. Hitung statistik UJO dicairkan
				const ujoStats = await sql`
					SELECT 
						COUNT(*) as count,
						COALESCE(SUM(estimated_ujo), 0) as total
					FROM finance.cash_advance
					WHERE disbursed_shift_session_id = ${shiftId}
				`;
				const totalUjoCount = parseInt(ujoStats[0]?.count) || 0;
				const totalUjoAmount = parseFloat(ujoStats[0]?.total) || 0;

				// 4. Hitung statistik Surat Jalan (DN) diterima
				const dnStats = await sql`
					SELECT COUNT(*) as count
					FROM finance.dn_detail
					WHERE received_shift_session_id = ${shiftId}
				`;
				const totalDnCount = parseInt(dnStats[0]?.count) || 0;

				// 5. Hitung expected cash & varian selisih
				const expectedClosingCash = openingCash + totalCashIn - totalCashOut;
				const cashDifference = actualClosingCash - expectedClosingCash;

				// 6. Update status sesi shift menjadi CLOSED
				await sql`
					UPDATE finance.kasir_shift_sessions
					SET 
						status = 'CLOSED',
						closed_at = CURRENT_TIMESTAMP,
						total_cash_in = ${totalCashIn},
						total_cash_out = ${totalCashOut},
						expected_closing_cash = ${expectedClosingCash},
						actual_closing_cash = ${actualClosingCash},
						cash_difference = ${cashDifference},
						total_ujo_count = ${totalUjoCount},
						total_ujo_amount = ${totalUjoAmount},
						total_dn_count = ${totalDnCount},
						handover_to = ${handoverTo},
						closing_notes = ${closingNotes},
						updated_at = CURRENT_TIMESTAMP
					WHERE id = ${shiftId}
				`;
			});

			return { success: true, message: 'Shift berhasil ditutup dan Berita Acara Serah Terima diterbitkan.' };
		} catch (err: any) {
			console.error("Error closing shift:", err);
			return fail(500, { error: err.message || 'Gagal menutup shift kasir.' });
		}
	}
};
