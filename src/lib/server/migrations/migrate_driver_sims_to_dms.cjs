const sql = require('../db.ts').default;

async function migrateDriverSims() {
	console.log('=== MEMULAI MIGRASI 202 SIM PENGEMUDI DARI master.m_karyawan KE dms.documents ===');

	// 1. Ambil data master lookup
	const [docType] = await sql`SELECT id FROM dms.m_doc_type WHERE code = 'SIM_DRIVER'`;
	if (!docType) throw new Error('Doc type SIM_DRIVER tidak ditemukan di dms.m_doc_type');

	const [filingLoc] = await sql`SELECT id FROM dms.m_filing_location WHERE code = 'RAK-B1' OR name ILIKE '%Lemari B%' LIMIT 1`;
	const [issuer] = await sql`SELECT id FROM dms.m_issuer WHERE name ILIKE '%POLDA%' OR name ILIKE '%POLRI%' LIMIT 1`;

	console.log('Doc Type ID:', docType.id);
	console.log('Filing Location ID:', filingLoc?.id);
	console.log('Issuer ID:', issuer?.id);

	// 2. Ambil seluruh data karyawan yang memiliki SIM kendaraan
	const karyawanList = await sql`
		SELECT 
			k.id as karyawan_id,
			k.payroll_id,
			k.nama_karyawan,
			NULLIF(TRIM(k.no_sim_b2_umum), '') as no_sim_b2_umum,
			k.no_sim_b2_umum_expiredate,
			NULLIF(TRIM(k.no_sim_b1), '') as no_sim_b1,
			NULLIF(TRIM(k.no_sim_b1_expiredate), '') as no_sim_b1_expiredate,
			NULLIF(TRIM(k.no_sim_a), '') as no_sim_a,
			k.no_sim_a_expiredate,
			drv.id as driver_id
		FROM master.m_karyawan k
		LEFT JOIN master.m_drivers drv ON drv.karyawan_id = k.id
		WHERE 
			NULLIF(TRIM(k.no_sim_b2_umum), '') IS NOT NULL OR
			NULLIF(TRIM(k.no_sim_b1), '') IS NOT NULL OR
			NULLIF(TRIM(k.no_sim_a), '') IS NOT NULL
		ORDER BY k.nama_karyawan ASC
	`;

	console.log(`Ditemukan ${karyawanList.length} karyawan dengan data SIM di master.m_karyawan.`);

	// 3. Susun daftar SIM item terstruktur
	const simItems = [];
	for (const k of karyawanList) {
		// Prioritas SIM B2 Umum
		if (k.no_sim_b2_umum) {
			simItems.push({
				karyawan_id: k.karyawan_id,
				driver_id: k.driver_id,
				payroll_id: k.payroll_id,
				nama_karyawan: k.nama_karyawan,
				golongan: 'B2 UMUM',
				sim_number: k.no_sim_b2_umum,
				expiry_date: k.no_sim_b2_umum_expiredate ? new Date(k.no_sim_b2_umum_expiredate).toISOString().slice(0, 10) : null
			});
		}

		// SIM B1
		if (k.no_sim_b1) {
			let exp = null;
			if (k.no_sim_b1_expiredate && k.no_sim_b1_expiredate.match(/^\d{4}-\d{2}-\d{2}/)) {
				exp = k.no_sim_b1_expiredate.slice(0, 10);
			}
			simItems.push({
				karyawan_id: k.karyawan_id,
				driver_id: k.driver_id,
				payroll_id: k.payroll_id,
				nama_karyawan: k.nama_karyawan,
				golongan: 'B1',
				sim_number: k.no_sim_b1,
				expiry_date: exp
			});
		}

		// SIM A
		if (k.no_sim_a) {
			simItems.push({
				karyawan_id: k.karyawan_id,
				driver_id: k.driver_id,
				payroll_id: k.payroll_id,
				nama_karyawan: k.nama_karyawan,
				golongan: 'A',
				sim_number: k.no_sim_a,
				expiry_date: k.no_sim_a_expiredate ? new Date(k.no_sim_a_expiredate).toISOString().slice(0, 10) : null
			});
		}
	}

	console.log(`Total dokumen SIM fisik yang akan diproses: ${simItems.length} berkas.`);

	// 4. Update data ABET in-place jika dokumen seed lama ada
	const abetItem = simItems.find(s => s.nama_karyawan === 'ABET' && s.golongan === 'B2 UMUM');
	let abetProcessed = false;

	const [existingAbetDoc] = await sql`
		SELECT id FROM dms.documents 
		WHERE id = '5b40610b-d4e0-4eb5-8238-d08f83b277a8' OR doc_number = 'SIM-B2-9901823'
	`;

	if (existingAbetDoc && abetItem) {
		console.log('Memperbarui dokumen seed lama ABET dengan data SIM asli...');
		const today = new Date().toISOString().slice(0, 10);
		let status = 'ACTIVE';
		if (abetItem.expiry_date) {
			if (abetItem.expiry_date < today) status = 'EXPIRED';
			else {
				const diffDays = Math.ceil((new Date(abetItem.expiry_date) - new Date(today)) / (1000 * 60 * 60 * 24));
				if (diffDays <= 30) status = 'EXPIRING_SOON';
			}
		}

		await sql`
			UPDATE dms.documents
			SET 
				doc_number = ${abetItem.sim_number},
				title = ${'SIM B2 Umum Pengemudi - ABET'},
				expiry_date = ${abetItem.expiry_date},
				status = ${status},
				qr_code_id = 'BCS-DMS-SIM-0001',
				filing_location_id = ${filingLoc?.id || null},
				issuer_id = ${issuer?.id || null},
				metadata = ${sql.json({
					golongan: abetItem.golongan,
					payroll_id: abetItem.payroll_id,
					driver_name: abetItem.nama_karyawan,
					karyawan_id: abetItem.karyawan_id,
					legacy_source: 'master.m_karyawan'
				})},
				updated_at = CURRENT_TIMESTAMP
			WHERE id = ${existingAbetDoc.id}
		`;

		await sql`
			UPDATE dms.document_versions
			SET 
				doc_number = ${abetItem.sim_number},
				title = ${'SIM B2 Umum Pengemudi - ABET'},
				expiry_date = ${abetItem.expiry_date},
				change_summary = 'Pembaruan Data Otentik SIM Driver dari Master Karyawan'
			WHERE document_id = ${existingAbetDoc.id} AND version_number = 1
		`;

		abetProcessed = true;
		console.log(`Dokumen ABET berhasil diperbarui: No. SIM ${abetItem.sim_number}, Exp: ${abetItem.expiry_date}, Status: ${status}`);
	}

	// 5. Ingest seluruh SIM pengemudi lainnya ke dms.documents
	let insertedCount = 0;
	let updatedCount = 0;
	const today = new Date().toISOString().slice(0, 10);

	let qrIndex = 2; // SIM-0001 untuk ABET

	for (const item of simItems) {
		// Lewati ABET jika sudah di-update in-place
		if (item.nama_karyawan === 'ABET' && item.golongan === 'B2 UMUM' && abetProcessed) {
			continue;
		}

		const qrCode = `BCS-DMS-SIM-${String(qrIndex).padStart(4, '0')}`;
		qrIndex++;

		const title = `SIM ${item.golongan} Pengemudi - ${item.nama_karyawan}`;

		let status = 'ACTIVE';
		if (item.expiry_date) {
			if (item.expiry_date < today) status = 'EXPIRED';
			else {
				const diffDays = Math.ceil((new Date(item.expiry_date) - new Date(today)) / (1000 * 60 * 60 * 24));
				if (diffDays <= 30) status = 'EXPIRING_SOON';
			}
		}

		const metadata = {
			golongan: item.golongan,
			payroll_id: item.payroll_id,
			driver_name: item.nama_karyawan,
			karyawan_id: item.karyawan_id,
			legacy_source: 'master.m_karyawan'
		};

		// Periksa apakah dokumen sudah ada
		const [existing] = await sql`
			SELECT id FROM dms.documents 
			WHERE doc_number = ${item.sim_number} AND entity_type = 'DRIVER'
		`;

		let docId;
		if (existing) {
			docId = existing.id;
			await sql`
				UPDATE dms.documents
				SET 
					title = ${title},
					expiry_date = ${item.expiry_date},
					status = ${status},
					employee_id = ${item.driver_id ? String(item.driver_id) : null},
					filing_location_id = ${filingLoc?.id || null},
					issuer_id = ${issuer?.id || null},
					metadata = ${sql.json(metadata)},
					updated_at = CURRENT_TIMESTAMP
				WHERE id = ${docId}
			`;
			updatedCount++;
		} else {
			const [inserted] = await sql`
				INSERT INTO dms.documents (
					doc_number,
					doc_type_id,
					title,
					entity_type,
					employee_id,
					issuer_id,
					filing_location_id,
					expiry_date,
					status,
					current_version,
					physical_status,
					qr_code_id,
					metadata,
					created_by,
					created_at,
					updated_at
				) VALUES (
					${item.sim_number},
					${docType.id},
					${title},
					'DRIVER',
					${item.driver_id ? String(item.driver_id) : null},
					${issuer?.id || null},
					${filingLoc?.id || null},
					${item.expiry_date},
					${status},
					1,
					'IN_STORAGE',
					${qrCode},
					${sql.json(metadata)},
					'System Migration',
					CURRENT_TIMESTAMP,
					CURRENT_TIMESTAMP
				)
				RETURNING id
			`;
			docId = inserted.id;
			insertedCount++;
		}

		// Tambahkan versi baseline v1 jika belum ada
		const [existingVer] = await sql`
			SELECT id FROM dms.document_versions
			WHERE document_id = ${docId} AND version_number = 1
		`;

		if (!existingVer) {
			await sql`
				INSERT INTO dms.document_versions (
					document_id,
					version_number,
					doc_number,
					title,
					expiry_date,
					file_path,
					change_summary,
					metadata,
					created_by,
					created_at
				) VALUES (
					${docId},
					1,
					${item.sim_number},
					${title},
					${item.expiry_date},
					NULL,
					${`Registrasi Dokumen Legalitas Awal (${title})`},
					${sql.json(metadata)},
					'System Migration',
					CURRENT_TIMESTAMP
				)
			`;
		}
	}

	// 6. Sinkronisasikan kolom sim_type & sim_expiry_date di master.m_drivers
	console.log('Menyelaraskan data sim_type dan sim_expiry_date di master.m_drivers...');
	const syncDriversResult = await sql`
		UPDATE master.m_drivers drv
		SET 
			sim_type = CASE 
				WHEN NULLIF(TRIM(k.no_sim_b2_umum), '') IS NOT NULL THEN 'SIM B2 UMUM'
				WHEN NULLIF(TRIM(k.no_sim_b1), '') IS NOT NULL THEN 'SIM B1'
				WHEN NULLIF(TRIM(k.no_sim_a), '') IS NOT NULL THEN 'SIM A'
				ELSE drv.sim_type
			END,
			sim_expiry_date = COALESCE(
				k.no_sim_b2_umum_expiredate,
				CASE WHEN NULLIF(TRIM(k.no_sim_b1_expiredate), '') ~ '^\d{4}-\d{2}-\d{2}' THEN k.no_sim_b1_expiredate::date ELSE NULL END,
				k.no_sim_a_expiredate
			),
			updated_at = CURRENT_TIMESTAMP
		FROM master.m_karyawan k
		WHERE k.id = drv.karyawan_id
		  AND (
			NULLIF(TRIM(k.no_sim_b2_umum), '') IS NOT NULL OR
			NULLIF(TRIM(k.no_sim_b1), '') IS NOT NULL OR
			NULLIF(TRIM(k.no_sim_a), '') IS NOT NULL
		  )
	`;
	console.log('Driver operasional di master.m_drivers yang diselaraskan:', syncDriversResult.count);

	// 7. Verifikasi hasil akhir di database
	const [simStats] = await sql`
		SELECT 
			count(*) as total_sim,
			count(*) FILTER (WHERE metadata->>'golongan' = 'B2 UMUM') as b2_umum,
			count(*) FILTER (WHERE metadata->>'golongan' = 'B1') as b1,
			count(*) FILTER (WHERE metadata->>'golongan' = 'A') as a,
			count(*) FILTER (WHERE status = 'ACTIVE') as active,
			count(*) FILTER (WHERE status = 'EXPIRING_SOON') as expiring_soon,
			count(*) FILTER (WHERE status = 'EXPIRED') as expired
		FROM dms.documents
		WHERE doc_type_id = ${docType.id} AND entity_type = 'DRIVER'
	`;

	console.log('=== HASIL AKHIR VERIFIKASI DOKUMEN SIM DI DMS ===');
	console.log(`Total Dokumen SIM di DMS: ${simStats.total_sim} berkas`);
	console.log(`- SIM B2 Umum: ${simStats.b2_umum}`);
	console.log(`- SIM B1: ${simStats.b1}`);
	console.log(`- SIM A: ${simStats.a}`);
	console.log(`- Status Active: ${simStats.active}`);
	console.log(`- Status Expiring Soon: ${simStats.expiring_soon}`);
	console.log(`- Status Expired: ${simStats.expired}`);
	console.log(`Dokumen baru dimasukkan: ${insertedCount}`);
	console.log(`Dokumen diperbarui: ${updatedCount + (abetProcessed ? 1 : 0)}`);

	process.exit(0);
}

migrateDriverSims().catch(err => {
	console.error('Error saat migrasi SIM driver:', err);
	process.exit(1);
});
