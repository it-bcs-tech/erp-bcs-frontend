const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db";
const sql = postgres(DATABASE_URL);

async function run() {
	console.log("=== MEMULAI MIGRASI TITIK GERBANG TOL & TOLL LOG ===");

	const migrationPath = path.join(process.cwd(), "db/migrations/27_ocs_titik_gerbang_tol.sql");
	if (!fs.existsSync(migrationPath)) {
		throw new Error("File migrasi tidak ditemukan di " + migrationPath);
	}

	console.log("Membaca dan mengeksekusi file migrasi: " + migrationPath);
	await sql.file(migrationPath);
	console.log("Eksekusi migration script selesai.");

	const titikList = await sql`
		SELECT id, kode_gerbang, nama_gerbang, ruas_tol, km_pos, latitude, longitude, 
		       jsonb_array_length(polygon_points) as polygon_points_count, is_active
		FROM master.m_titik_gerbang_tol
		ORDER BY id ASC
	`;
	console.log("Daftar Titik Gerbang Tol di master.m_titik_gerbang_tol (" + titikList.length + " titik):");
	console.table(titikList);

	const [{ count: totalTitik }] = await sql`SELECT count(*) FROM master.m_titik_gerbang_tol`;
	console.log("=== HASIL VERIFIKASI ===");
	console.log("Total Titik Gerbang Tol:", totalTitik);

	// Periksa kolom di master.m_gerbang_tol
	const cols = await sql`
		SELECT column_name, data_type 
		FROM information_schema.columns 
		WHERE table_schema = 'master' AND table_name = 'm_gerbang_tol'
		  AND column_name IN ('gerbang_asal_id', 'gerbang_tujuan_id', 'jarak_ruas_km')
	`;
	console.log("Kolom baru di master.m_gerbang_tol:", cols);

	// Periksa tabel fleet.trip_toll_log
	const tollLogExists = await sql`
		SELECT to_regclass('fleet.trip_toll_log') as regclass
	`;
	console.log("Tabel fleet.trip_toll_log exists:", tollLogExists[0].regclass);

	process.exit(0);
}

run().catch((err) => {
	console.error("Migration error:", err);
	process.exit(1);
});
