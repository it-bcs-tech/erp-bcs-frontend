require('dotenv').config();
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

if (!process.env.DATABASE_URL) {
	console.error('ERROR: process.env.DATABASE_URL belum diset.');
	console.error('Pastikan variabel DATABASE_URL telah didefinisikan di lingkungan sistem atau file .env.');
	process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

async function run() {
	console.log('===============================================================');
	console.log('=== MEMULAI MIGRASI KONTRAK LEGACY KE MODUL DMS (DOCUMENTS) ===');
	console.log('===============================================================');

	const migrationPath = path.join(process.cwd(), 'db/migrations/30_migrate_contracts_to_dms.sql');
	if (!fs.existsSync(migrationPath)) {
		throw new Error('File migrasi tidak ditemukan di: ' + migrationPath);
	}

	console.log('Membaca file migrasi: ' + migrationPath);
	const start = Date.now();
	await sql.file(migrationPath);
	const duration = ((Date.now() - start) / 1000).toFixed(2);
	console.log(`Eksekusi migrasi selesai dalam ${duration} detik.`);

	console.log('\n--- 1. Verifikasi Tipe Dokumen KONTRAK_KERJASAMA ---');
	const [docType] = await sql`
		SELECT id, code, name 
		FROM dms.m_doc_type 
		WHERE code = 'KONTRAK_KERJASAMA'
	`;
	console.log(`Tipe Dokumen Terdaftar: [${docType.code}] ${docType.name} (UUID: ${docType.id})`);

	console.log('\n--- 2. Total Dokumen Kontrak Dimigrasikan ---');
	const [{ count: totalContracts }] = await sql`
		SELECT count(*)::int as count 
		FROM dms.documents 
		WHERE doc_type_id = ${docType.id}
	`;
	console.log(`Total Dokumen Kontrak di dms.documents: ${totalContracts}`);

	console.log('\n--- 3. Rincian Berdasarkan Jenis Entitas (entity_type) ---');
	const byEntity = await sql`
		SELECT entity_type, count(*)::int as count 
		FROM dms.documents 
		WHERE doc_type_id = ${docType.id}
		GROUP BY entity_type 
		ORDER BY count DESC
	`;
	byEntity.forEach((r) => {
		console.log(`- ${r.entity_type}: ${r.count} dokumen`);
	});

	console.log('\n--- 4. Rincian Berdasarkan Anak Perusahaan BCS (company_id) ---');
	const byCompany = await sql`
		SELECT c.code, c.name, count(d.id)::int as count 
		FROM dms.documents d
		JOIN master.m_company c ON c.id = d.company_id
		WHERE d.doc_type_id = ${docType.id}
		GROUP BY c.code, c.name
		ORDER BY count DESC
	`;
	byCompany.forEach((r) => {
		console.log(`- [${r.code}] ${r.name}: ${r.count} dokumen`);
	});

	console.log('\n--- 5. Rincian Berdasarkan Status Masa Berlaku ---');
	const byStatus = await sql`
		SELECT status, count(*)::int as count 
		FROM dms.documents 
		WHERE doc_type_id = ${docType.id}
		GROUP BY status 
		ORDER BY count DESC
	`;
	byStatus.forEach((r) => {
		console.log(`- ${r.status}: ${r.count} dokumen`);
	});

	console.log('\n--- 6. Header vs Adendum (Metadata) ---');
	const [{ count: headerCount }] = await sql`
		SELECT count(*)::int as count 
		FROM dms.documents 
		WHERE doc_type_id = ${docType.id} AND (metadata->>'is_addendum')::boolean = false
	`;
	const [{ count: addendumCount }] = await sql`
		SELECT count(*)::int as count 
		FROM dms.documents 
		WHERE doc_type_id = ${docType.id} AND (metadata->>'is_addendum')::boolean = true
	`;
	console.log(`- Kontrak Header Utama: ${headerCount} dokumen`);
	console.log(`- Kontrak Detail / Adendum: ${addendumCount} dokumen`);

	console.log('\n--- 7. Dokumen dengan Berkas PDF Digital ---');
	const [{ count: pdfCount }] = await sql`
		SELECT count(*)::int as count 
		FROM dms.documents 
		WHERE doc_type_id = ${docType.id} AND file_path IS NOT NULL
	`;
	console.log(`- Dokumen dengan file_path: ${pdfCount} berkas`);

	console.log('\n===============================================================');
	console.log('=== MIGRASI SELESAI DENGAN SUKSES! ===');
	console.log('===============================================================');

	await sql.end();
	process.exit(0);
}

run().catch((err) => {
	console.error('ERROR saat menjalankan migrasi kontrak:', err);
	process.exit(1);
});
