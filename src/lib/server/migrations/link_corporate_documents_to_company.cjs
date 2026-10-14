const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

async function run() {
	console.log('=== MEMULAI PENAUTAN DOKUMEN KORPORAT KE MASTER COMPANY ===');

	const migrationPath = path.join(process.cwd(), 'db/migrations/29_link_corporate_documents_to_company.sql');
	if (!fs.existsSync(migrationPath)) {
		throw new Error('File migrasi tidak ditemukan di ' + migrationPath);
	}

	console.log('Membaca file migrasi: ' + migrationPath);
	await sql.file(migrationPath);
	console.log('Eksekusi migration script selesai.');

	const mappedByCompany = await sql`
		SELECT 
			c.code, 
			c.name, 
			count(d.id)::int as doc_count 
		FROM master.m_company c
		JOIN dms.documents d ON d.company_id = c.id
		GROUP BY c.id, c.code, c.name
		ORDER BY doc_count DESC
	`;

	console.log('--- Ringkasan Dokumen Tertaut per Perusahaan ---');
	mappedByCompany.forEach((r) => {
		console.log(`[${r.code}] ${r.name}: ${r.doc_count} dokumen`);
	});

	const [{ count: unlinkedCount }] = await sql`
		SELECT count(*)::int as count 
		FROM dms.documents 
		WHERE entity_type = 'CORPORATE' AND company_id IS NULL
	`;

	console.log('Total dokumen CORPORATE tanpa company_id (sisa): ' + unlinkedCount);

	await sql.end();
	process.exit(0);
}

run().catch((err) => {
	console.error('Error saat menjalankan penautan dokumen:', err);
	process.exit(1);
});
