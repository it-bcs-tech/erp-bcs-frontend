const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db";
const sql = postgres(DATABASE_URL);

async function run() {
	console.log("=== MEMULAI MIGRASI MASTER KATEGORI DOKUMEN KE DMS ===");

	const migrationPath = path.join(process.cwd(), "db/migrations/26_dms_category_migration.sql");
	if (!fs.existsSync(migrationPath)) {
		throw new Error("File migrasi tidak ditemukan di " + migrationPath);
	}

	console.log("Membaca dan mengeksekusi file migrasi: " + migrationPath);
	await sql.file(migrationPath);
	console.log("Eksekusi migration script selesai.");

	const categories = await sql`
		SELECT id, code, name, legacy_id, is_active,
		(SELECT count(*) FROM dms.documents WHERE category_id = c.id) as doc_count
		FROM dms.m_doc_category c
		ORDER BY legacy_id ASC
	`;
	console.log("Daftar Kategori di dms.m_doc_category:", categories);

	const [{ count: totalDocsWithCategory }] = await sql`SELECT count(*) FROM dms.documents WHERE category_id IS NOT NULL`;
	const [{ count: fleetDocsWithCategory }] = await sql`SELECT count(*) FROM dms.documents WHERE category_id IS NOT NULL AND entity_type = 'FLEET'`;
	const [{ count: totalDocs }] = await sql`SELECT count(*) FROM dms.documents`;

	console.log("=== HASIL VERIFIKASI ===");
	console.log("Total Dokumen di dms.documents:", totalDocs);
	console.log("Total Dokumen ber-Kategori:", totalDocsWithCategory);
	console.log("Total Dokumen FLEET ber-Kategori (Angkutan):", fleetDocsWithCategory);

	process.exit(0);
}

run().catch((err) => {
	console.error("Migration error:", err);
	process.exit(1);
});
