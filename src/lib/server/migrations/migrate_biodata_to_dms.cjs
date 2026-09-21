const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db";
const sql = postgres(DATABASE_URL);

async function run() {
	console.log("=== MEMULAI MIGRASI BIODATA & VILLAGE KE DMS.DOCUMENTS ===");

	const migrationPath = path.join(process.cwd(), "db/migrations/24_dms_biodata_village_to_documents.sql");
	if (!fs.existsSync(migrationPath)) {
		throw new Error("File migrasi tidak ditemukan di " + migrationPath);
	}

	console.log("Membaca file migrasi: " + migrationPath);
	await sql.file(migrationPath);
	console.log("Eksekusi migration script selesai.");

	const [{ count: totalCorporate }] = await sql`SELECT count(*) FROM dms.documents WHERE entity_type = 'CORPORATE'`;
	const [{ count: totalLegacy }] = await sql`SELECT count(*) FROM dms.documents WHERE metadata->>'legacy_source' IS NOT NULL`;

	console.log("Total dokumen CORPORATE: " + totalCorporate);
	console.log("Total dokumen warisan (biodata/legal): " + totalLegacy);

	process.exit(0);
}

run().catch((err) => {
	console.error("Error saat menjalankan migrasi:", err);
	process.exit(1);
});
