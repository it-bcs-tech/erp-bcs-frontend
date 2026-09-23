const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db";
const sql = postgres(DATABASE_URL);

async function run() {
	console.log("=== MEMULAI MIGRASI BPKB & BRAND KE DMS.DOCUMENTS & FLEET.UNIT ===");

	const migrationPath = path.join(process.cwd(), "db/migrations/25_dms_bpkb_fleet_migration.sql");
	if (!fs.existsSync(migrationPath)) {
		throw new Error("File migrasi tidak ditemukan di " + migrationPath);
	}

	console.log("Membaca dan mengeksekusi file migrasi: " + migrationPath);
	await sql.file(migrationPath);
	console.log("Eksekusi migration script selesai.");

	const [{ count: totalBpkbDocs }] = await sql`SELECT count(*) FROM dms.documents WHERE metadata->>'legacy_source' = 'bpkb_header'`;
	const [{ count: linkedToFleet }] = await sql`SELECT count(*) FROM dms.documents WHERE metadata->>'legacy_source' = 'bpkb_header' AND asset_id IS NOT NULL`;
	const [{ count: unlinkedDocs }] = await sql`SELECT count(*) FROM dms.documents WHERE metadata->>'legacy_source' = 'bpkb_header' AND asset_id IS NULL`;
	const [{ count: unitsWithBpkb }] = await sql`SELECT count(*) FROM fleet.unit WHERE no_bpkb IS NOT NULL AND trim(no_bpkb) != ''`;

	console.log("Total BPKB di dms.documents:", totalBpkbDocs);
	console.log("BPKB tertaut ke unit armada (asset_id):", linkedToFleet);
	console.log("BPKB tanpa unit armada (asset_id = NULL):", unlinkedDocs);
	console.log("Total unit armada di fleet.unit yang memiliki no_bpkb:", unitsWithBpkb);

	process.exit(0);
}

run().catch((err) => {
	console.error("Error saat menjalankan migrasi:", err);
	process.exit(1);
});
