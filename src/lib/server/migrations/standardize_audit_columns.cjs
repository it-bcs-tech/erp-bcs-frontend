const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

async function migrate() {
	console.log('=== MEMULAI MIGRASI STANDARDISASI AUDIT TRAIL (created_by & updated_by) ===\n');

	const tableAlterations = [
		// 1. Modul OCS (Operasional, Rute & Gerbang Tol)
		{
			table: 'master.m_rute_ujo',
			columns: [
				'created_by VARCHAR(100)',
				'updated_by VARCHAR(100)',
				'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
			]
		},
		{
			table: 'master.m_rute_ujo_tol',
			columns: [
				'created_by VARCHAR(100)',
				'updated_by VARCHAR(100)',
				'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
			]
		},
		{
			table: 'master.m_gerbang_tol',
			columns: [
				'created_by VARCHAR(100)',
				'updated_by VARCHAR(100)',
				'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
			]
		},
		{
			table: 'master.m_titik_gerbang_tol',
			columns: [
				'created_by VARCHAR(100)',
				'updated_by VARCHAR(100)'
			]
		},

		// 2. Modul Finance & Kasir
		{
			table: 'finance.invoice',
			columns: [
				'created_by VARCHAR(100)',
				'updated_by VARCHAR(100)',
				'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
				'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
			]
		},
		{
			table: 'finance.invoice_line',
			columns: [
				'created_by VARCHAR(100)',
				'updated_by VARCHAR(100)',
				'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
				'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
			]
		},
		{
			table: 'finance.journal_entry',
			columns: [
				'created_by VARCHAR(100)',
				'updated_by VARCHAR(100)',
				'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
				'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
			]
		},
		{
			table: 'finance.journal_line',
			columns: [
				'created_by VARCHAR(100)',
				'updated_by VARCHAR(100)',
				'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
				'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
			]
		},
		{
			table: 'finance.payment',
			columns: [
				'created_by VARCHAR(100)',
				'updated_by VARCHAR(100)',
				'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
				'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
			]
		},
		{
			table: 'finance.payment_allocation',
			columns: [
				'created_by VARCHAR(100)',
				'updated_by VARCHAR(100)'
			]
		},
		{
			table: 'finance.kasir_cash_ledger',
			columns: [
				'created_by VARCHAR(100)',
				'updated_by VARCHAR(100)'
			]
		},
		{
			table: 'finance.account',
			columns: [
				'created_by VARCHAR(100)',
				'updated_by VARCHAR(100)'
			]
		},

		// 3. Modul Master Data (Fleet & Partner)
		{
			table: 'master.m_drivers',
			columns: [
				'created_by VARCHAR(100)',
				'updated_by VARCHAR(100)'
			]
		},
		{
			table: 'master.m_vendor',
			columns: [
				'created_by VARCHAR(100)',
				'updated_by VARCHAR(100)'
			]
		},
		{
			table: 'master.m_customer',
			columns: [
				'created_by VARCHAR(100)',
				'updated_by VARCHAR(100)',
				'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
				'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
			]
		}
	];

	for (const item of tableAlterations) {
		console.log(`Menstandarisasi tabel: ${item.table}...`);
		for (const colDef of item.columns) {
			const colName = colDef.split(' ')[0];
			await sql.unsafe(`ALTER TABLE ${item.table} ADD COLUMN IF NOT EXISTS ${colDef};`);
			console.log(`  + Kolom ${colName} diverifikasi / ditambahkan.`);
		}
	}

	console.log('\n=== MIGRASI SELESAI DENGAN SUKSES ===');
	await sql.end();
	process.exit(0);
}

migrate().catch((err) => {
	console.error('Migration error:', err);
	process.exit(1);
});
