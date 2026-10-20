const sql = require('../db.ts').default;

async function syncKaryawanDriversToMDrivers() {
	console.log('=== MEMULAI SINKRONISASI 109 DRIVER AKTIF DARI master.m_karyawan KE master.m_drivers ===');

	// 1. Sinkronkan baris m_karyawan yang belum ada di m_karyawan_1 agar FK constraint terpenuhi
	console.log('Menyelaraskan data induk karyawan ke m_karyawan_1...');
	const syncK1Result = await sql`
		INSERT INTO master.m_karyawan_1 
		SELECT k.* 
		FROM master.m_karyawan k 
		LEFT JOIN master.m_karyawan_1 k1 ON k1.id = k.id 
		WHERE k1.id IS NULL
		ON CONFLICT (id) DO NOTHING
	`;
	console.log(`Baris disinkronkan ke m_karyawan_1: ${syncK1Result.count}`);

	// 2. Reset sequence auto-increment master.m_drivers_id_seq ke max ID saat ini
	const [maxIdRow] = await sql`SELECT COALESCE(MAX(id::int), 0) as max_id FROM master.m_drivers`;
	const currentMaxId = maxIdRow.max_id;
	console.log(`Max ID saat ini di master.m_drivers: ${currentMaxId}`);

	await sql`SELECT setval('master.m_drivers_id_seq', ${currentMaxId})`;
	console.log(`Sequence master.m_drivers_id_seq berhasil direset ke ${currentMaxId}.`);

	// 3. Ambil seluruh driver aktif di master.m_karyawan yang belum terdaftar di master.m_drivers
	const driversToEnroll = await sql`
		SELECT 
			k.id as karyawan_id,
			k.payroll_id,
			k.nama_karyawan,
			k.title as title_code,
			t.title as job_title,
			CASE 
				WHEN t.title ILIKE '%DUMP%' THEN 'DUMPTRUCK'
				WHEN t.title ILIKE '%SLAB%' THEN 'PROJECT'
				ELSE 'TRAILER'
			END as driver_category,
			CASE 
				WHEN NULLIF(TRIM(k.no_sim_b2_umum), '') IS NOT NULL THEN 'SIM B2 UMUM'
				WHEN NULLIF(TRIM(k.no_sim_b1), '') IS NOT NULL THEN 'SIM B1'
				WHEN NULLIF(TRIM(k.no_sim_a), '') IS NOT NULL THEN 'SIM A'
				ELSE NULL
			END as sim_type,
			COALESCE(
				k.no_sim_b2_umum_expiredate,
				CASE WHEN NULLIF(TRIM(k.no_sim_b1_expiredate), '') ~ '^\d{4}-\d{2}-\d{2}' THEN k.no_sim_b1_expiredate::date ELSE NULL END,
				k.no_sim_a_expiredate
			) as sim_expiry_date
		FROM master.m_karyawan k
		JOIN master.m_title t ON t.title_code = k.title
		LEFT JOIN master.m_drivers drv ON drv.karyawan_id = k.id
		WHERE drv.id IS NULL
		  AND (
			t.title = 'DRIVER' OR 
			t.title = 'DRIVER DUMP TRUCK' OR 
			t.title = 'DRIVER - SLAB' OR 
			t.title = 'MASTER DRIVER'
		  )
		  AND k.aktif = 'Y'
		ORDER BY k.nama_karyawan ASC
	`;

	console.log(`Ditemukan ${driversToEnroll.length} pengemudi aktif di master karyawan yang akan didaftarkan.`);

	let enrolledCount = 0;
	for (const d of driversToEnroll) {
		await sql`
			INSERT INTO master.m_drivers (
				karyawan_id,
				driver_category,
				sim_type,
				sim_expiry_date,
				status,
				created_by,
				created_at,
				updated_at
			) VALUES (
				${d.karyawan_id},
				${d.driver_category},
				${d.sim_type},
				${d.sim_expiry_date ? new Date(d.sim_expiry_date).toISOString().slice(0, 10) : null},
				'ACTIVE',
				'System Migration',
				CURRENT_TIMESTAMP,
				CURRENT_TIMESTAMP
			)
		`;
		enrolledCount++;
	}

	console.log(`Berhasil mendaftarkan ${enrolledCount} driver baru ke master.m_drivers.`);

	// 4. Hubungkan dokumen di dms.documents yang belum terhubung ke employee_id
	console.log('Menautkan dokumen legalitas DMS ke driver ID yang baru didaftarkan...');
	const linkedDmsResult = await sql`
		UPDATE dms.documents d
		SET 
			employee_id = drv.id,
			updated_at = CURRENT_TIMESTAMP
		FROM master.m_drivers drv
		WHERE d.employee_id IS NULL
		  AND d.metadata->>'karyawan_id' = drv.karyawan_id::text
	`;
	console.log(`Dokumen DMS yang berhasil ditautkan ke driver ID baru: ${linkedDmsResult.count} berkas.`);

	// 5. Verifikasi akhir status data di database
	const [totalAfter] = await sql`SELECT count(*) FROM master.m_drivers WHERE deleted_at IS NULL`;
	const categoryStats = await sql`
		SELECT driver_category, count(*) 
		FROM master.m_drivers 
		WHERE deleted_at IS NULL 
		GROUP BY driver_category 
		ORDER BY count(*) DESC
	`;

	console.log('=== HASIL AKHIR SINKRONISASI PENGEMUDI FMS ===');
	console.log(`Total driver terdaftar di FMS: ${totalAfter.count} orang`);
	for (const cat of categoryStats) {
		console.log(`- ${cat.driver_category}: ${cat.count} orang`);
	}

	process.exit(0);
}

syncKaryawanDriversToMDrivers().catch(err => {
	console.error('Error sinkronisasi driver:', err);
	process.exit(1);
});
