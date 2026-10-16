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
	console.log('=== MEMULAI MIGRASI SK DIREKSI, IZIN LIMBAH B3 & PENGAYAAN AGUNAN TANAH SPI ===');

	// 1. Pastikan Doc Type 'SK_DIREKSI' dan 'IZIN_B3' tersedia di dms.m_doc_type
	const [skDocType] = await sql`
		INSERT INTO dms.m_doc_type (code, name, description, is_active)
		VALUES (
			'SK_DIREKSI',
			'Surat Keputusan Direksi',
			'Surat Keputusan Direksi & Manajemen mengenai Kebijakan Perusahaan, Struktur Organisasi, dan Ketenagakerjaan',
			true
		)
		ON CONFLICT (code) DO UPDATE 
		SET name = EXCLUDED.name,
		    description = EXCLUDED.description
		RETURNING id, code, name;
	`;

	const [b3DocType] = await sql`
		INSERT INTO dms.m_doc_type (code, name, description, is_active)
		VALUES (
			'IZIN_B3',
			'Kartu Pengawas & Rekomendasi B3',
			'Kartu Pengawas Angkutan Barang Khusus Berbahaya (B3) Kemenhub dan Rekomendasi Pengangkutan Limbah B3 KLHK',
			true
		)
		ON CONFLICT (code) DO UPDATE 
		SET name = EXCLUDED.name,
		    description = EXCLUDED.description
		RETURNING id, code, name;
	`;

	console.log(`✓ Doc Types Siap: [${skDocType.code}] (ID: ${skDocType.id}) & [${b3DocType.code}] (ID: ${b3DocType.id})`);

	// 2. Ambil Lokasi Fisik Default
	const [locLegal] = await sql`SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1`;
	const [rakA1] = await sql`SELECT id FROM dms.m_filing_location WHERE code = 'RAK-A1' LIMIT 1`;

	// 3. Ambil Master Perusahaan
	const [compBCS] = await sql`SELECT id, name FROM master.m_company WHERE code = 'CMP-01' OR legacy_id = 1 LIMIT 1`;

	// 4. Ambil Unit Armada dari fleet.unit
	const fleetUnits = await sql`SELECT id, nomor_unit, nomor_unit_lama, no_rangka, no_mesin, business_unit FROM fleet.unit`;
	const chassisMap = new Map();
	const platMap = new Map();
	fleetUnits.forEach(u => {
		if (u.no_rangka) chassisMap.set(u.no_rangka.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase(), u);
		if (u.nomor_unit) platMap.set(u.nomor_unit.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase(), u);
		if (u.nomor_unit_lama) platMap.set(u.nomor_unit_lama.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase(), u);
	});

	// 5. Baca db/gabungan_tabel.sql
	const sqlContent = fs.readFileSync('db/gabungan_tabel.sql', 'utf-8');

	// ==========================================
	// BAGIAN 1: MIGRASI 63 SK DIREKSI (sk)
	// ==========================================
	const rawSk = parseSqlInsert(sqlContent, 'sk');
	console.log(`\n--- Memproses ${rawSk.length} Berkas SK Direksi ---`);

	let skInserted = 0, skUpdated = 0;

	for (const r of rawSk) {
		const id = parseInt(r[0]);
		const noSk = (r[20] && r[20] !== 'NULL' && r[20] !== '') ? r[20].trim() : ((r[2] && r[2] !== 'NULL') ? r[2].trim() : `SK-#${id}`);
		const titleSk = r[3] !== 'NULL' ? r[3].trim() : 'Surat Keputusan Direksi';
		const signDate = parseDate(r[4]);
		const effectiveDate = parseDate(r[5]);
		const expiredDate = parseDate(r[6]);
		const remarks = r[10] !== 'NULL' ? r[10].trim() : '';
		const fileUpload = r[11] !== 'NULL' ? r[11].trim() : null;

		let title = `SK Direksi: ${titleSk} (No. ${noSk})`;
		if (title.length > 250) title = title.substring(0, 247) + '...';

		const docNumber = noSk;
		const qrCode = `BCS-DMS-SKD-${String(id).padStart(4, '0')}`;
		const filePath = fileUpload ? `uploads/sk/${fileUpload}` : null;
		let notes = `Surat Keputusan Direksi PT Buana Centra Swakarsa tentang ${titleSk}.`;
		if (remarks && remarks !== titleSk) notes += ` Keterangan: ${remarks}.`;

		const metadata = {
			legacy_source: 'sk',
			legacy_id: id,
			no_sk: noSk,
			title_sk: titleSk,
			company_name: compBCS?.name || 'PT Buana Centra Swakarsa',
			remarks: remarks,
			file_upload: fileUpload
		};

		const existing = await sql`
			SELECT id FROM dms.documents
			WHERE metadata->>'legacy_source' = 'sk' AND metadata->>'legacy_id' = ${String(id)}
			LIMIT 1
		`;

		const issueDateFinal = signDate || effectiveDate || null;

		if (existing.length > 0) {
			await sql`
				UPDATE dms.documents
				SET doc_number = ${docNumber},
				    doc_type_id = ${skDocType.id},
				    title = ${title},
				    entity_type = 'CORPORATE',
				    company_id = ${compBCS?.id || null},
				    filing_location_id = ${locLegal?.id || null},
				    physical_status = 'IN_STORAGE',
				    qr_code_id = ${qrCode},
				    file_path = ${filePath},
				    notes = ${notes},
				    metadata = ${sql.json(metadata)},
				    issue_date = ${issueDateFinal ? new Date(issueDateFinal) : null},
				    expiry_date = ${expiredDate ? new Date(expiredDate) : null},
				    updated_at = NOW()
				WHERE id = ${existing[0].id}
			`;
			skUpdated++;
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
					expiry_date,
					created_at,
					updated_at,
					created_by
				) VALUES (
					${docNumber},
					${skDocType.id},
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
					${issueDateFinal ? new Date(issueDateFinal) : null},
					${expiredDate ? new Date(expiredDate) : null},
					NOW(),
					NOW(),
					'SYSTEM_MIGRATION'
				)
			`;
			skInserted++;
		}
	}
	console.log(`✓ SK Direksi: ${skInserted} disisipkan, ${skUpdated} diperbarui.`);

	// ==========================================
	// BAGIAN 2: MIGRASI 169 IZIN LIMBAH B3 (master_lisence_b3)
	// ==========================================
	const rawB3 = parseSqlInsert(sqlContent, 'master_lisence_b3');
	console.log(`\n--- Memproses ${rawB3.length} Berkas Izin Limbah B3 Armada ---`);

	let b3Inserted = 0, b3Updated = 0;

	for (const r of rawB3) {
		const id = parseInt(r[0]);
		const companyName = r[1] !== 'NULL' ? r[1].trim() : 'PT.BUANA CENTRA SWAKARSA';
		const noPolOld = r[2] !== 'NULL' ? r[2].trim() : '';
		const noPolNew = r[3] !== 'NULL' ? r[3].trim() : '';
		const rekomKlh = r[4] !== 'NULL' ? r[4].trim() : '';
		const jenisKendaraan = r[5] !== 'NULL' ? r[5].trim() : 'Armada B3';
		const expiredRekom = parseDate(r[6]);
		const noChasis = r[7] !== 'NULL' ? r[7].trim() : '';
		const noEngine = r[8] !== 'NULL' ? r[8].trim() : '';
		const titleLic = r[9] !== 'NULL' ? r[9].trim() : 'Kartu Pengawas B3';
		const issuedBy = r[10] !== 'NULL' ? r[10].trim() : 'KEMENHUBDAT';
		const signDate = parseDate(r[11]);
		const expiredDate = parseDate(r[12]);
		const attachFile = r[14] !== 'NULL' ? r[14].trim() : null;
		const remark = r[16] !== 'NULL' ? r[16].trim() : '';

		// Resolve fleet unit
		const chasisNorm = noChasis.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
		const platNormNew = noPolNew.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
		const platNormOld = noPolOld.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
		const matchedUnit = chassisMap.get(chasisNorm) || platMap.get(platNormNew) || platMap.get(platNormOld);

		const unitCode = matchedUnit ? matchedUnit.nomor_unit : (noPolNew || noPolOld || `B3-Unit-#${id}`);
		const docNumber = rekomKlh || (noPolNew ? `B3-${noPolNew}` : `B3-#${id}`);
		let title = `${titleLic} - Unit ${unitCode} (${jenisKendaraan})`;
		if (rekomKlh) title += ` - Rekom KLHK: ${rekomKlh}`;
		if (title.length > 250) title = title.substring(0, 247) + '...';

		const qrCode = `BCS-DMS-B3-${String(id).padStart(4, '0')}`;
		const filePath = attachFile ? `uploads/b3/${attachFile}` : null;
		let notes = `${titleLic} untuk unit armada ${unitCode} (${jenisKendaraan}). Penerbit: ${issuedBy}. Rekomendasi KLHK: ${rekomKlh || '-'}. No Chasis: ${noChasis}.`;
		if (remark) notes += ` Keterangan: ${remark}.`;

		const metadata = {
			legacy_source: 'master_lisence_b3',
			legacy_id: id,
			nomor_unit: unitCode,
			nomor_polisi_lama: noPolOld,
			nomor_polisi_baru: noPolNew,
			rekom_klh: rekomKlh,
			jenis_kendaraan: jenisKendaraan,
			no_chasis: noChasis,
			no_engine: noEngine,
			title_license: titleLic,
			issued_by: issuedBy,
			expired_date_rekom: expiredRekom,
			attach_file: attachFile,
			remark: remark
		};

		const existing = await sql`
			SELECT id FROM dms.documents
			WHERE metadata->>'legacy_source' = 'master_lisence_b3' AND metadata->>'legacy_id' = ${String(id)}
			LIMIT 1
		`;

		const issueDateFinal = signDate || null;
		const expiryDateFinal = expiredDate || expiredRekom || null;

		if (existing.length > 0) {
			await sql`
				UPDATE dms.documents
				SET doc_number = ${docNumber},
				    doc_type_id = ${b3DocType.id},
				    title = ${title},
				    entity_type = 'FLEET',
				    asset_id = ${matchedUnit?.id || null},
				    filing_location_id = ${rakA1?.id || null},
				    physical_status = 'IN_STORAGE',
				    qr_code_id = ${qrCode},
				    file_path = ${filePath},
				    notes = ${notes},
				    metadata = ${sql.json(metadata)},
				    issue_date = ${issueDateFinal ? new Date(issueDateFinal) : null},
				    expiry_date = ${expiryDateFinal ? new Date(expiryDateFinal) : null},
				    updated_at = NOW()
				WHERE id = ${existing[0].id}
			`;
			b3Updated++;
		} else {
			await sql`
				INSERT INTO dms.documents (
					doc_number,
					doc_type_id,
					title,
					entity_type,
					asset_id,
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
					${b3DocType.id},
					${title},
					'FLEET',
					${matchedUnit?.id || null},
					${rakA1?.id || null},
					'IN_STORAGE',
					'ACTIVE',
					1,
					${qrCode},
					${filePath},
					${notes},
					${sql.json(metadata)},
					${issueDateFinal ? new Date(issueDateFinal) : null},
					${expiryDateFinal ? new Date(expiryDateFinal) : null},
					NOW(),
					NOW(),
					'SYSTEM_MIGRATION'
				)
			`;
			b3Inserted++;
		}
	}
	console.log(`✓ Izin Limbah B3: ${b3Inserted} disisipkan, ${b3Updated} diperbarui.`);

	// ==========================================
	// BAGIAN 3: PENGAYAAN STATUS AGUNAN TANAH SPI
	// ==========================================
	const rawSpi = parseSqlInsert(sqlContent, 'spi');
	console.log(`\n--- Memproses ${rawSpi.length} Baris Tracking Jaminan Tanah SPI ---`);

	// Ambil 70 sertifikat tanah yang ada di dms.documents
	const landDocs = await sql`
		SELECT id, doc_number, metadata, notes
		FROM dms.documents
		WHERE metadata->>'legacy_source' = 'land_certificate'
	`;

	// Buat map SPI berdasarkan certType + noCert
	const spiMap = new Map();
	for (const r of rawSpi) {
		const jenis = r[2] !== 'NULL' ? r[2].trim() : ''; // SHM, SHGB
		const noDok = r[3] !== 'NULL' ? r[3].trim() : '';
		const posisi = r[4] !== 'NULL' ? r[4].trim() : '';
		const noAjb = r[5] !== 'NULL' ? r[5].trim() : '';
		const ket = r[10] !== 'NULL' ? r[10].trim() : '';

		const key = `${jenis.toUpperCase()}_${noDok}`;
		if (!spiMap.has(key)) {
			spiMap.set(key, { posisi, noAjb, ket, jenis, noDok });
		}
	}

	let landEnrichedCount = 0;

	for (const doc of landDocs) {
		const certType = doc.metadata?.certificate_type || '';
		const noCert = doc.metadata?.no_certificate || '';
		const key = `${certType.toUpperCase()}_${noCert}`;

		const spiInfo = spiMap.get(key);
		if (spiInfo) {
			const isPledged = spiInfo.posisi && !spiInfo.posisi.toLowerCase().includes('brankas') && !spiInfo.posisi.toLowerCase().includes('kantor');
			const statusAgunan = isPledged ? `DIJAMINKAN (${spiInfo.posisi})` : 'TERSEDIA DI BRANKAS';
			const physicalStatus = isPledged ? 'LOANED_OUT' : 'IN_STORAGE';

			const updatedMeta = {
				...doc.metadata,
				status_agunan: statusAgunan,
				posisi_dokumen: spiInfo.posisi,
				no_ajb: spiInfo.noAjb,
				keterangan_agunan: spiInfo.ket,
				is_pledged: isPledged
			};

			let updatedNotes = doc.notes || '';
			if (spiInfo.ket && !updatedNotes.includes(spiInfo.ket)) {
				updatedNotes += ` | Status Jaminan: ${spiInfo.ket}`;
			}

			await sql`
				UPDATE dms.documents
				SET metadata = ${sql.json(updatedMeta)},
				    physical_status = ${physicalStatus},
				    notes = ${updatedNotes},
				    updated_at = NOW()
				WHERE id = ${doc.id}
			`;
			landEnrichedCount++;
		}
	}
	console.log(`✓ 70 Sertifikat Tanah: ${landEnrichedCount} berhasil diperkaya status agunan Bank SPI.`);

	// ==========================================
	// VERIFIKASI POSTGRESQL
	// ==========================================
	const [{ count: totalSk }] = await sql`
		SELECT count(*) FROM dms.documents WHERE metadata->>'legacy_source' = 'sk'
	`;
	const [{ count: totalB3 }] = await sql`
		SELECT count(*) FROM dms.documents WHERE metadata->>'legacy_source' = 'master_lisence_b3'
	`;
	const [{ count: totalEnrichedLand }] = await sql`
		SELECT count(*) FROM dms.documents WHERE metadata->>'legacy_source' = 'land_certificate' AND metadata->>'status_agunan' IS NOT NULL
	`;
	const [{ count: totalAllDocs }] = await sql`
		SELECT count(*) FROM dms.documents
	`;

	console.log(`\n=== VERIFIKASI HASIL DATABASE POSTGRESQL ===`);
	console.log(`- Total SK Direksi Tersimpan di DMS               : ${totalSk} berkas`);
	console.log(`- Total Izin Limbah B3 Armada Tersimpan di DMS     : ${totalB3} berkas`);
	console.log(`- Sertifikat Tanah Diperkaya Status Agunan Bank   : ${totalEnrichedLand} berkas`);
	console.log(`- TOTAL KESELURUHAN DOKUMEN AKTIF DI DMS ERP BCS  : ${totalAllDocs} berkas`);

	await sql.end();
	process.exit(0);
}

run().catch(err => {
	console.error('Migration error:', err);
	process.exit(1);
});
