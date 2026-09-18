const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

async function migrate() {
	console.log('=== MEMULAI MIGRATION: PR & PO NUMBERING, ORDER TYPE, PROJECT & DEPT ALIASES ===');

	// 1. Tambahkan kolom order_type di purchase_request
	console.log('1. Memastikan kolom order_type di procurement.purchase_request...');
	await sql`
		ALTER TABLE procurement.purchase_request 
		ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'RO';
	`;

	// 2. Tambahkan kolom payment_term di purchase_order
	console.log('2. Memastikan kolom payment_term di procurement.purchase_order...');
	await sql`
		ALTER TABLE procurement.purchase_order 
		ADD COLUMN IF NOT EXISTS payment_term VARCHAR(50) DEFAULT '30 Hari';
	`;

	// 3. Tambahkan alias dan cat_code di master.m_project
	console.log('3. Memastikan kolom alias dan cat_code di master.m_project...');
	await sql`
		ALTER TABLE master.m_project 
		ADD COLUMN IF NOT EXISTS alias VARCHAR(20),
		ADD COLUMN IF NOT EXISTS cat_code VARCHAR(10);
	`;

	// 4. Tambahkan alias di master.m_dept
	console.log('4. Memastikan kolom alias di master.m_dept...');
	await sql`
		ALTER TABLE master.m_dept 
		ADD COLUMN IF NOT EXISTS alias VARCHAR(20);
	`;

	console.log('=== MIGRATION SELESAI DENGAN SUKSES ===');
	await sql.end();
}

migrate().catch((err) => {
	console.error('Migration error:', err);
	process.exit(1);
});
