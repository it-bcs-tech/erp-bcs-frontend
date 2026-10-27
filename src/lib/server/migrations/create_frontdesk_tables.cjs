const postgres = require('postgres');

const sql = postgres('postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db', {
	connect_timeout: 10
});

async function runMigration() {
	console.log('🚀 Starting Front Desk & Reception Hub database migration...');

	try {
		// 1. ga.frontdesk_documents (Dokumen & Paket Masuk / Keluar)
		await sql`
			CREATE TABLE IF NOT EXISTS ga.frontdesk_documents (
				id SERIAL PRIMARY KEY,
				direction VARCHAR(10) NOT NULL DEFAULT 'INCOMING',
				doc_type VARCHAR(50) DEFAULT 'SURAT_DINAS',
				tracking_number VARCHAR(100),
				courier_name VARCHAR(100),
				sender_name VARCHAR(150) NOT NULL,
				sender_company VARCHAR(150),
				recipient_name VARCHAR(150) NOT NULL,
				recipient_department VARCHAR(100),
				recipient_phone VARCHAR(50),
				received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
				handed_over_at TIMESTAMP WITH TIME ZONE,
				handed_over_to VARCHAR(150),
				status VARCHAR(30) DEFAULT 'DITERIMA',
				file_path VARCHAR(255),
				notes TEXT,
				created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)
		`;
		console.log('✅ Table ga.frontdesk_documents ready');

		// 2. ga.frontdesk_invoices (Tanda Terima Tagihan / Invoice Masuk)
		await sql`
			CREATE TABLE IF NOT EXISTS ga.frontdesk_invoices (
				id SERIAL PRIMARY KEY,
				receipt_number VARCHAR(50) UNIQUE NOT NULL,
				vendor_name VARCHAR(150) NOT NULL,
				invoice_number VARCHAR(100) NOT NULL,
				po_number VARCHAR(100),
				amount NUMERIC(15, 2) DEFAULT 0,
				received_date DATE NOT NULL DEFAULT CURRENT_DATE,
				due_date DATE,
				courier_sender VARCHAR(100),
				received_by_receptionist VARCHAR(100) DEFAULT 'Resepsionis GA',
				handed_to_finance_by VARCHAR(100),
				finance_recipient_name VARCHAR(100),
				handed_to_finance_at TIMESTAMP WITH TIME ZONE,
				status VARCHAR(30) DEFAULT 'DITERIMA',
				file_path VARCHAR(255),
				notes TEXT,
				created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)
		`;
		console.log('✅ Table ga.frontdesk_invoices ready');

		// 3. ga.frontdesk_proposals (Proposal & Penawaran Masuk)
		await sql`
			CREATE TABLE IF NOT EXISTS ga.frontdesk_proposals (
				id SERIAL PRIMARY KEY,
				proposal_number VARCHAR(50) UNIQUE,
				sender_organization VARCHAR(150) NOT NULL,
				contact_person VARCHAR(100),
				contact_phone VARCHAR(50),
				title VARCHAR(255) NOT NULL,
				category VARCHAR(50) DEFAULT 'PENAWARAN_HARGA',
				target_recipient VARCHAR(150) NOT NULL,
				received_date DATE NOT NULL DEFAULT CURRENT_DATE,
				status VARCHAR(30) DEFAULT 'MENUNGGU_REVIEW',
				disposition_notes TEXT,
				disposition_by VARCHAR(100),
				file_path VARCHAR(255),
				created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)
		`;
		console.log('✅ Table ga.frontdesk_proposals ready');

		// 4. ga.frontdesk_calls (Log Panggilan Telepon)
		await sql`
			CREATE TABLE IF NOT EXISTS ga.frontdesk_calls (
				id SERIAL PRIMARY KEY,
				caller_name VARCHAR(150) NOT NULL,
				caller_company VARCHAR(150),
				caller_phone VARCHAR(50),
				target_employee_name VARCHAR(150) NOT NULL,
				target_department VARCHAR(100),
				call_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
				urgency VARCHAR(20) DEFAULT 'NORMAL',
				call_type VARCHAR(20) DEFAULT 'INCOMING',
				action_taken VARCHAR(50) DEFAULT 'TITIP_PESAN',
				message_content TEXT,
				status VARCHAR(30) DEFAULT 'PENDING',
				created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)
		`;
		console.log('✅ Table ga.frontdesk_calls ready');

		// Create indices for fast lookup
		await sql`CREATE INDEX IF NOT EXISTS idx_frontdesk_docs_status ON ga.frontdesk_documents(status)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_frontdesk_docs_date ON ga.frontdesk_documents(received_at DESC)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_frontdesk_inv_status ON ga.frontdesk_invoices(status)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_frontdesk_prop_status ON ga.frontdesk_proposals(status)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_frontdesk_calls_status ON ga.frontdesk_calls(status)`;
		console.log('✅ Indices created');

		console.log('🎉 All Front Desk tables and indices migrated successfully!');
	} catch (err) {
		console.error('❌ Migration failed:', err);
		process.exit(1);
	} finally {
		await sql.end();
	}
}

runMigration();
