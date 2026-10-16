const fs = require('fs');
const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL, { max: 1 });

function parseSqlInsert(sqlText, tableName) {
	const marker = 'INSERT INTO `' + tableName + '`';
	const start = sqlText.indexOf(marker);
	if (start === -1) return [];
	const valuesIdx = sqlText.indexOf('VALUES', start);
	const endIdx = sqlText.indexOf(';\n', valuesIdx);
	const valuesText = sqlText.substring(valuesIdx + 6, endIdx !== -1 ? endIdx : sqlText.length);

	const rows = [];
	let inString = false, escape = false, currentTuple = null, currentField = '';
	for (let i = 0; i < valuesText.length; i++) {
		const ch = valuesText[i];
		if (escape) { currentField += ch; escape = false; continue; }
		if (ch === '\\') { escape = true; continue; }
		if (ch === "'") { inString = !inString; continue; }
		if (!inString) {
			if (ch === '(') { currentTuple = []; currentField = ''; continue; }
			else if (ch === ',') { if (currentTuple) { currentTuple.push(currentField.trim()); currentField = ''; } continue; }
			else if (ch === ')') { if (currentTuple) { currentTuple.push(currentField.trim()); rows.push(currentTuple); currentTuple = null; currentField = ''; } continue; }
		}
		currentField += ch;
	}
	return rows;
}

function parseDate(dateStr) {
	if (!dateStr || dateStr === 'NULL' || dateStr.startsWith('0000-00-00')) return null;
	const clean = dateStr.trim();
	const d = new Date(clean);
	return isNaN(d.getTime()) ? null : clean;
}

async function run() {
	console.log('=== MEMULAI MIGRASI 130 SERTIFIKAT DRIVER B3 & 24 PERJANJIAN KREDIT BANK ===');

	// 1. Pastikan Doc Types tersedia di dms.m_doc_type
	const [b3DriverDocType] = await sql`
		INSERT INTO dms.m_doc_type (code, name, description, is_active)
		VALUES (
			'SERTIFIKAT_B3_DRIVER',
			'Sertifikat Pengemudi Angkutan B3',
			'Sertifikat Kompetensi Pengemudi Angkutan Barang Khusus/Berbahaya (B3) Kemenhub & BCS Academy',
			true
		)
		ON CONFLICT (code) DO UPDATE 
		SET name = EXCLUDED.name,
		    description = EXCLUDED.description
		RETURNING id, code, name;
	`;

	const [bankDocType] = await sql`
		INSERT INTO dms.m_doc_type (code, name, description, is_active)
		VALUES (
			'KREDIT_PERBANKAN',
			'Perjanjian Kredit & Pembiayaan Bank',
			'Perjanjian Kredit Investasi (KI), Modal Kerja (KMK), ROYA Hak Tanggungan, dan Dokumen Agunan Perbankan',
			true
		)
		ON CONFLICT (code) DO UPDATE 
		SET name = EXCLUDED.name,
		    description = EXCLUDED.description
		RETURNING id, code, name;
	`;

	console.log(`✓ Doc Types Siap: [${b3DriverDocType.code}] (ID: ${b3DriverDocType.id}) & [${bankDocType.code}] (ID: ${bankDocType.id})`);

	// 2. Ambil Lokasi Fisik Default
	const [locLegal] = await sql`SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1`;
	const [rakB1] = await sql`SELECT id FROM dms.m_filing_location WHERE code = 'RAK-B1' LIMIT 1`;

	// 3. Ambil Master Perusahaan
	const [compBCS] = await sql`SELECT id, name FROM master.m_company WHERE code = 'CMP-01' OR legacy_id = 1 LIMIT 1`;

	// 4. Ambil Karyawan & Drivers
	const karyawanList = await sql`SELECT id, payroll_id, nama_karyawan FROM master.m_karyawan`;
	const karyawanMap = new Map();
	karyawanList.forEach(k => {
		if (k.payroll_id) karyawanMap.set(k.payroll_id.trim(), k);
	});

	const driverList = await sql`
		SELECT d.id, d.karyawan_id, k.payroll_id, k.nama_karyawan
		FROM master.m_drivers d
		JOIN master.m_karyawan k ON k.id = d.karyawan_id
	`;
	const driverMap = new Map();
	driverList.forEach(d => {
		if (d.payroll_id) driverMap.set(d.payroll_id.trim(), d);
	});

	// 5. Baca db/gabungan_tabel.sql
	const sqlContent = fs.readFileSync('db/gabungan_tabel.sql', 'utf-8');

	// ==========================================
	// BAGIAN 1: MIGRASI 130 SERTIFIKAT DRIVER B3
	// ==========================================
	const rawB3Drivers = parseSqlInsert(sqlContent, 'monitoring_sertifikat_b3');
	console.log(`\n--- Memproses ${rawB3Drivers.length} Berkas Sertifikat Pengemudi B3 ---`);

	let drvInserted = 0, drvUpdated = 0;

	for (const r of rawB3Drivers) {
		const id = parseInt(r[0]);
		const payrollId = r[1] !== 'NULL' ? r[1].trim() : '';
		const companyName = r[2] !== 'NULL' ? r[2].trim() : 'PT. BCS Logistics';
		const noSertifikat = r[3] !== 'NULL' ? r[3].trim() : `SRT-B3-#${id}`;
		const jenisKendaraan = r[4] !== 'NULL' ? r[4].trim() : 'Angkutan B3';
		const dilaksanakan = r[5] !== 'NULL' ? r[5].trim() : 'BCS Academy';
		const project = r[6] !== 'NULL' ? r[6].trim() : 'Transport B3';
		const ygMengeluarkan = r[7] !== 'NULL' ? r[7].trim() : 'Kemenhubdar';
		const issueDate = parseDate(r[8]);
		const expiryDate = parseDate(r[9]);
		const lampiran = r[10] !== 'NULL' ? r[10].trim() : null;
		const statusRaw = r[11] !== 'NULL' ? r[11].trim() : 'aktif';

		// Driver matching
		const matchedKaryawan = payrollId ? karyawanMap.get(payrollId) : null;
		const matchedDriver = payrollId ? driverMap.get(payrollId) : null;

		let driverName = matchedKaryawan ? matchedKaryawan.nama_karyawan : '';
		if (!driverName && lampiran) {
			let extracted = lampiran.split('_-_')[0].replace(/_/g, ' ').trim();
			if (extracted.includes('-')) extracted = extracted.split('-')[0].trim();
			driverName = extracted;
		}
		if (!driverName) driverName = `Driver NIK ${payrollId}`;

		let title = `Sertifikat B3: ${driverName} (${noSertifikat}) - ${jenisKendaraan}`;
		if (title.length > 250) title = title.substring(0, 247) + '...';

		const docNumber = noSertifikat;
		const qrCode = `BCS-DMS-DRVB3-${String(id).padStart(4, '0')}`;
		const filePath = lampiran ? `uploads/sertifikat_b3/${lampiran}` : null;
		let notes = `Sertifikat Pengemudi Angkutan Barang Khusus/Berbahaya (B3) a.n. ${driverName} (NIK: ${payrollId || '-'}). Jenis Kendaraan: ${jenisKendaraan}. Lembaga: ${dilaksanakan}. Proyek: ${project}. Penerbit: ${ygMengeluarkan}.`;

		const metadata = {
			legacy_source: 'monitoring_sertifikat_b3',
			legacy_id: id,
			driver_name: driverName,
			payroll_id: payrollId,
			no_sertifikat: noSertifikat,
			jenis_kendaraan: jenisKendaraan,
			dilaksanakan: dilaksanakan,
			project: project,
			yg_mengeluarkan: ygMengeluarkan,
			company_name: companyName,
			status_legacy: statusRaw,
			lampiran: lampiran
		};

		const existing = await sql`
			SELECT id FROM dms.documents
			WHERE metadata->>'legacy_source' = 'monitoring_sertifikat_b3' AND metadata->>'legacy_id' = ${String(id)}
			LIMIT 1
		`;

		if (existing.length > 0) {
			await sql`
				UPDATE dms.documents
				SET doc_number = ${docNumber},
				    doc_type_id = ${b3DriverDocType.id},
				    title = ${title},
				    entity_type = 'DRIVER',
				    employee_id = ${matchedDriver ? matchedDriver.id : null},
				    company_id = ${compBCS?.id || null},
				    filing_location_id = ${rakB1?.id || null},
				    physical_status = 'IN_STORAGE',
				    qr_code_id = ${qrCode},
				    file_path = ${filePath},
				    notes = ${notes},
				    metadata = ${sql.json(metadata)},
				    issue_date = ${issueDate ? new Date(issueDate) : null},
				    expiry_date = ${expiryDate ? new Date(expiryDate) : null},
				    updated_at = NOW()
				WHERE id = ${existing[0].id}
			`;
			drvUpdated++;
		} else {
			await sql`
				INSERT INTO dms.documents (
					doc_number,
					doc_type_id,
					title,
					entity_type,
					employee_id,
					company_id,
					filing_location_id,
					physical_status,
					status,
					current_version,
					qr_code_id,
					file_path,
					notes,
					metadata,
					issue_date,
					expiry_date,
					created_at,
					updated_at,
					created_by
				) VALUES (
					${docNumber},
					${b3DriverDocType.id},
					${title},
					'DRIVER',
					${matchedDriver ? matchedDriver.id : null},
					${compBCS?.id || null},
					${rakB1?.id || null},
					'IN_STORAGE',
					'ACTIVE',
					1,
					${qrCode},
					${filePath},
					${notes},
					${sql.json(metadata)},
					${issueDate ? new Date(issueDate) : null},
					${expiryDate ? new Date(expiryDate) : null},
					NOW(),
					NOW(),
					'SYSTEM_MIGRATION'
				)
			`;
			drvInserted++;
		}
	}
	console.log(`✓ Sertifikat Pengemudi B3: ${drvInserted} disisipkan, ${drvUpdated} diperbarui.`);

	// ==========================================
	// BAGIAN 2: MIGRASI 24 DOKUMEN PERBANKAN (red_bank)
	// ==========================================
	const rawBanks = parseSqlInsert(sqlContent, 'red_bank');
	const rawBankDetails = parseSqlInsert(sqlContent, 'red_bank_detail');

	// Group details by id_header
	const bankDetailMap = new Map();
	for (const d of rawBankDetails) {
		const headerId = parseInt(d[1]);
		const file = d[2] !== 'NULL' ? d[2].trim() : '';
		const rem = d[4] !== 'NULL' ? d[4].trim() : '';
		if (!bankDetailMap.has(headerId)) bankDetailMap.set(headerId, []);
		bankDetailMap.get(headerId).push({ file, remarks: rem });
	}

	console.log(`\n--- Memproses ${rawBanks.length} Berkas Perjanjian Kredit & Pembiayaan Bank ---`);

	let bnkInserted = 0, bnkUpdated = 0;

	for (const b of rawBanks) {
		const id = parseInt(b[0]);
		const namaDokumen = b[1] !== 'NULL' ? b[1].trim() : 'Perjanjian Fasilitas Pembiayaan Bank';
		const namaBank = b[2] !== 'NULL' ? b[2].trim() : 'Bank Rekanan';
		const keterangan = (b[3] && b[3] !== 'NULL') ? b[3].trim() : '';
		const createdDate = parseDate(b[4]);

		const details = bankDetailMap.get(id) || [];
		const primaryFile = details.length > 0 ? details[0].file : null;
		const filePath = primaryFile ? `uploads/bank/${primaryFile}` : null;

		let title = `${namaDokumen} - [${namaBank}]`;
		if (title.length > 250) title = title.substring(0, 247) + '...';

		const docNumber = `BNK-${namaBank}-${String(id).padStart(3, '0')}`;
		const qrCode = `BCS-DMS-BNK-${String(id).padStart(4, '0')}`;
		let notes = `Dokumen Perbankan: ${namaDokumen}. Nama Bank: ${namaBank}.`;
		if (keterangan) notes += ` Keterangan: ${keterangan}.`;
		if (details.length > 1) {
			notes += ` Berkas Terlampir (${details.length}): ${details.map(d => d.file).join(', ')}.`;
		}

		const metadata = {
			legacy_source: 'red_bank',
			legacy_id: id,
			nama_dokumen: namaDokumen,
			nama_bank: namaBank,
			keterangan: keterangan,
			attachments: details
		};

		const existing = await sql`
			SELECT id FROM dms.documents
			WHERE metadata->>'legacy_source' = 'red_bank' AND metadata->>'legacy_id' = ${String(id)}
			LIMIT 1
		`;

		if (existing.length > 0) {
			await sql`
				UPDATE dms.documents
				SET doc_number = ${docNumber},
				    doc_type_id = ${bankDocType.id},
				    title = ${title},
				    entity_type = 'CORPORATE',
				    company_id = ${compBCS?.id || null},
				    filing_location_id = ${locLegal?.id || null},
				    physical_status = 'IN_STORAGE',
				    qr_code_id = ${qrCode},
				    file_path = ${filePath},
				    notes = ${notes},
				    metadata = ${sql.json(metadata)},
				    issue_date = ${createdDate ? new Date(createdDate) : null},
				    updated_at = NOW()
				WHERE id = ${existing[0].id}
			`;
			bnkUpdated++;
		} else {
			await sql`
				INSERT INTO dms.documents (
					doc_number,
					doc_type_id,
					title,
					entity_type,
					company_id,
					filing_location_id,
					physical_status,
					status,
					current_version,
					qr_code_id,
					file_path,
					notes,
					metadata,
					issue_date,
					created_at,
					updated_at,
					created_by
				) VALUES (
					${docNumber},
					${bankDocType.id},
					${title},
					'CORPORATE',
					${compBCS?.id || null},
					${locLegal?.id || null},
					'IN_STORAGE',
					'ACTIVE',
					1,
					${qrCode},
					${filePath},
					${notes},
					${sql.json(metadata)},
					${createdDate ? new Date(createdDate) : null},
					NOW(),
					NOW(),
					'SYSTEM_MIGRATION'
				)
			`;
			bnkInserted++;
		}
	}
	console.log(`✓ Perjanjian Kredit & Bank: ${bnkInserted} disisipkan, ${bnkUpdated} diperbarui.`);

	// ==========================================
	// VERIFIKASI POSTGRESQL
	// ==========================================
	const [{ count: totalDrvB3 }] = await sql`
		SELECT count(*) FROM dms.documents WHERE metadata->>'legacy_source' = 'monitoring_sertifikat_b3'
	`;
	const [{ count: totalBank }] = await sql`
		SELECT count(*) FROM dms.documents WHERE metadata->>'legacy_source' = 'red_bank'
	`;
	const [{ count: totalAllDocs }] = await sql`
		SELECT count(*) FROM dms.documents
	`;

	console.log(`\n=== VERIFIKASI HASIL DATABASE POSTGRESQL ===`);
	console.log(`- Total Sertifikat Pengemudi B3 Tersimpan di DMS: ${totalDrvB3} berkas`);
	console.log(`- Total Perjanjian Kredit Bank Tersimpan di DMS : ${totalBank} berkas`);
	console.log(`- TOTAL KESELURUHAN DOKUMEN AKTIF DI DMS ERP BCS : ${totalAllDocs} berkas`);

	await sql.end();
	process.exit(0);
}

run().catch(err => {
	console.error('Migration error:', err);
	process.exit(1);
});
