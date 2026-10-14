const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL missing");
}
const sql = postgres(process.env.DATABASE_URL);

async function run() {
	console.log("=== MEMULAI MIGRASI MASTER PERUSAHAAN (COMPANY) KE DATABASE ===");

	const migrationPath = path.join(process.cwd(), "db/migrations/28_master_company_and_dms_integration.sql");
	if (!fs.existsSync(migrationPath)) {
		throw new Error("File migrasi tidak ditemukan di " + migrationPath);
	}

	console.log("Membaca dan mengeksekusi file migrasi: " + migrationPath);
	await sql.file(migrationPath);
	console.log("Eksekusi migration script selesai.");

	const companies = await sql`
		SELECT id, code, name, address, legacy_id, is_active,
		(SELECT count(*) FROM dms.documents WHERE company_id = c.id) as doc_count
		FROM master.m_company c
		ORDER BY legacy_id ASC NULLS LAST;
	`;
	console.log("Daftar Perusahaan di master.m_company (Total: " + companies.length + "):");
	companies.forEach((c) => {
		console.log(`- [${c.code}] ${c.name} (Legacy ID: ${c.legacy_id}, Kota: ${c.address || '-'})`);
	});

	const [{ count: totalDocsWithCompany }] = await sql`SELECT count(*) FROM dms.documents WHERE company_id IS NOT NULL`;
	const [{ count: totalDocs }] = await sql`SELECT count(*) FROM dms.documents`;

	console.log("=== HASIL VERIFIKASI ===");
	console.log("Total Perusahaan di master.m_company:", companies.length);
	console.log("Total Dokumen di dms.documents:", totalDocs);
	console.log("Total Dokumen ber-Perusahaan:", totalDocsWithCompany);

	await sql.end();
	process.exit(0);
}

run().catch((err) => {
	console.error("Migration error:", err);
	process.exit(1);
});
