const postgres = require('postgres');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/erp_bcs';
const sql = postgres(connectionString);

async function runMigration() {
	console.log('--- Migrasi: Tambah kolom sub_aspect ke hris.lms_competency_library ---');
	try {
		await sql`
			ALTER TABLE hris.lms_competency_library 
			ADD COLUMN IF NOT EXISTS sub_aspect VARCHAR(100);
		`;
		console.log('✓ Kolom sub_aspect berhasil ditambahkan atau sudah ada.');
		process.exit(0);
	} catch (err) {
		console.error('Migration error:', err);
		process.exit(1);
	}
}

runMigration();
