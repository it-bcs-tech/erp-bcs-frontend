const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

async function migrate() {
	console.log('=== MEMULAI MIGRASI finance.kasir_shift_sessions ===');

	// 1. Buat tabel finance.kasir_shift_sessions
	await sql`
		CREATE TABLE IF NOT EXISTS finance.kasir_shift_sessions (
			id SERIAL PRIMARY KEY,
			session_number VARCHAR(50) UNIQUE NOT NULL,
			shift_name VARCHAR(20) NOT NULL,
			shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
			cashier_name VARCHAR(100) NOT NULL,
			opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			closed_at TIMESTAMP WITH TIME ZONE,
			status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
			
			opening_cash NUMERIC(15,2) NOT NULL DEFAULT 0,
			total_cash_in NUMERIC(15,2) NOT NULL DEFAULT 0,
			total_cash_out NUMERIC(15,2) NOT NULL DEFAULT 0,
			expected_closing_cash NUMERIC(15,2) NOT NULL DEFAULT 0,
			actual_closing_cash NUMERIC(15,2),
			cash_difference NUMERIC(15,2) DEFAULT 0,
			
			total_ujo_count INTEGER NOT NULL DEFAULT 0,
			total_ujo_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
			total_dn_count INTEGER NOT NULL DEFAULT 0,
			
			handover_to VARCHAR(100),
			closing_notes TEXT,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);
	`;
	console.log('Tabel finance.kasir_shift_sessions berhasil dibuat / diverifikasi.');

	// 2. Tambah shift_session_id ke finance.kasir_cash_ledger
	await sql`
		ALTER TABLE finance.kasir_cash_ledger 
		ADD COLUMN IF NOT EXISTS shift_session_id INTEGER;
	`;
	console.log('Kolom shift_session_id pada finance.kasir_cash_ledger berhasil diverifikasi.');

	// 3. Tambah disbursed_shift_session_id ke finance.cash_advance
	await sql`
		ALTER TABLE finance.cash_advance 
		ADD COLUMN IF NOT EXISTS disbursed_shift_session_id INTEGER;
	`;
	console.log('Kolom disbursed_shift_session_id pada finance.cash_advance berhasil diverifikasi.');

	// 4. Tambah received_shift_session_id ke finance.dn_detail
	await sql`
		ALTER TABLE finance.dn_detail 
		ADD COLUMN IF NOT EXISTS received_shift_session_id INTEGER;
	`;
	console.log('Kolom received_shift_session_id pada finance.dn_detail berhasil diverifikasi.');

	// 5. Index untuk performa query
	await sql`
		CREATE INDEX IF NOT EXISTS idx_kasir_shift_status ON finance.kasir_shift_sessions(status);
	`;
	await sql`
		CREATE INDEX IF NOT EXISTS idx_kasir_shift_date ON finance.kasir_shift_sessions(shift_date);
	`;
	await sql`
		CREATE INDEX IF NOT EXISTS idx_kasir_cash_ledger_shift ON finance.kasir_cash_ledger(shift_session_id);
	`;
	await sql`
		CREATE INDEX IF NOT EXISTS idx_cash_advance_shift ON finance.cash_advance(disbursed_shift_session_id);
	`;
	await sql`
		CREATE INDEX IF NOT EXISTS idx_dn_detail_shift ON finance.dn_detail(received_shift_session_id);
	`;
	console.log('Index berhasil dibuat / diverifikasi.');

	console.log('=== MIGRASI SELESAI DENGAN SUKSES ===');
	await sql.end();
}

migrate().catch((err) => {
	console.error('Error saat migrasi:', err);
	process.exit(1);
});
