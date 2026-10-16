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

async function run() {
	console.log('=== MEMULAI MIGRASI 70 SERTIFIKAT TANAH (SHM & SHGB) KE DMS ===');

	// 1. Daftarkan Tipe Dokumen 'SERTIFIKAT_TANAH' di dms.m_doc_type
	const [certDocType] = await sql`
		INSERT INTO dms.m_doc_type (code, name, description, is_active)
		VALUES (
			'SERTIFIKAT_TANAH',
			'Sertifikat Tanah (SHM / SHGB)',
			'Sertifikat Hak Milik (SHM) dan Hak Guna Bangunan (SHGB) Lahan dan Properti Perusahaan',
			true
		)
		ON CONFLICT (code) DO UPDATE 
		SET name = EXCLUDED.name,
		    description = EXCLUDED.description
		RETURNING id, code, name;
	`;
	console.log(`✓ Doc Type siap: [${certDocType.code}] ${certDocType.name} (ID: ${certDocType.id})`);

	// 2. Lokasi Fisik Default: Lemari A - Rak 2 (BPKB & Sertifikat Asli)
	let [rakA2] = await sql`
		SELECT id, code, name FROM dms.m_filing_location WHERE code = 'RAK-A2' LIMIT 1
	`;
	if (!rakA2) {
		[rakA2] = await sql`
			SELECT id, code, name FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' OR code = 'LOC-DEPT-LEGAL' LIMIT 1
		`;
	}
	console.log(`✓ Lokasi Fisik: [${rakA2?.code}] ${rakA2?.name}`);

	// 3. Ambil Master Perusahaan untuk Pemetaan
	const companies = await sql`SELECT id, name, code, legacy_id FROM master.m_company`;
	const compCiptaNiaga = companies.find(c => c.name.includes('CIPTA NIAGA INTERNASIONAL'));
	const compSteel = companies.find(c => c.name.includes('BUANA CENTRA STEEL INDUSTRY'));
	const compBCS = companies.find(c => c.code === 'CMP-01' || c.legacy_id === 1);

	// 4. Baca dan parse db/land_certificate.sql
	const sqlContent = fs.readFileSync('db/land_certificate.sql', 'utf-8');
	const rawLand1 = parseSqlInsert(sqlContent, 'land_certificate');
	const rawLand2 = parseSqlInsert(sqlContent, 'land_certificate2');

	// Bangun lookup dari land_certificate2 untuk nama geografis teks
	const geoMap = new Map();
	for (const r2 of rawLand2) {
		const id2 = r2[0];
		if (r2.some(f => f.toLowerCase().includes('tes'))) continue; // lewati dummy test
		geoMap.set(id2, {
			province: r2[5] !== 'NULL' ? r2[5].trim() : '',
			district: r2[7] !== 'NULL' ? r2[7].trim() : '',
			village: r2[8] !== 'NULL' ? r2[8].trim() : '',
			sizeText: r2[9] !== 'NULL' ? r2[9].trim() : ''
		});
	}

	console.log(`✓ Ditemukan ${rawLand1.length} baris di land_certificate dan ${rawLand2.length} di land_certificate2`);

	let insertedCount = 0;
	let updatedCount = 0;

	for (const r of rawLand1) {
		const id = parseInt(r[0]);
		const idCert = r[1]; // 1: SHGB, 2: SHM
		const certType = idCert === '1' ? 'SHGB' : 'SHM';
		const certTypeName = idCert === '1' ? 'Sertifikat Hak Guna Bangunan (SHGB)' : 'Sertifikat Hak Milik (SHM)';
		const noCert = r[2] !== 'NULL' ? r[2].trim() : '';
		const noTonnage = r[3] !== 'NULL' ? r[3].trim() : '';
		const noNib = r[4] !== 'NULL' ? r[4].trim() : '';
		const landSizeNum = parseFloat(r[9]) || 0;
		const ownerName = r[11] !== 'NULL' ? r[11].trim() : 'PT Buana Centra Swakarsa';
		const noAgreement = r[12] !== 'NULL' ? r[12].trim() : null;
		const dateAgreement = r[13] !== 'NULL' && r[13] !== '0000-00-00' ? r[13].trim() : null;
		const fileUpload = r[14] !== 'NULL' ? r[14].trim() : null;
		const createdDate = r[16] !== 'NULL' && r[16] !== '0000-00-00' ? r[16].trim() : null;

		// Ambil rincian geografi dari land_certificate2
		const geo = geoMap.get(r[0]) || {};
		const village = geo.village ? geo.village.charAt(0).toUpperCase() + geo.village.slice(1) : (r[8] === '2' ? 'Rawa Arum / Pulo Merak' : 'Cinangka');
		const district = geo.district ? geo.district.charAt(0).toUpperCase() + geo.district.slice(1) : (r[7] === '1' ? 'Cilegon' : (r[7] === '2' ? 'Pulo Merak' : 'Serang'));
		const province = geo.province ? geo.province.charAt(0).toUpperCase() + geo.province.slice(1) : 'Banten';

		// Luas tanah format
		const landSizeFormatted = landSizeNum > 0 ? `${landSizeNum.toLocaleString('id-ID')} m²` : (geo.sizeText || '-');

		// Judul Dokumen
		let title = `${certTypeName} No. ${noCert} - ${ownerName} - ${village} (${landSizeFormatted})`;
		if (title.length > 250) {
			title = title.substring(0, 247) + '...';
		}

		// Nomor Dokumen
		const docNumber = noTonnage ? `${certType} No. ${noCert} (${noTonnage})` : `${certType} No. ${noCert}`;

		// Pemetaan Company ID
		let targetCompany = compBCS;
		if (ownerName.includes('Cipta Niaga Internasional') && compCiptaNiaga) {
			targetCompany = compCiptaNiaga;
		} else if (ownerName.includes('Buana Centra Steel Industry') && compSteel) {
			targetCompany = compSteel;
		}

		// QR Code
		const qrCode = `BCS-DMS-LND-${String(id).padStart(4, '0')}`;

		// Notes
		let notes = `${certTypeName} atas nama ${ownerName}. Wilayah: Kel. ${village}, Kec. ${district}, ${province}. Luas Tanah: ${landSizeFormatted}.`;
		if (noNib && noNib !== '-') {
			notes += ` NIB: ${noNib}.`;
		}
		if (noTonnage) {
			notes += ` Buku Tanah BPN: ${noTonnage}.`;
		}

		// Metadata JSONB
		const metadata = {
			legacy_source: 'land_certificate',
			legacy_id: id,
			certificate_type: certType,
			no_certificate: noCert,
			no_certificate_tonnage: noTonnage,
			no_nib: noNib,
			land_size_m2: landSizeNum,
			land_size_formatted: landSizeFormatted,
			owner_name: ownerName,
			province: province,
			district: district,
			administrative_village: village,
			no_agreement: noAgreement,
			date_of_agreement: dateAgreement,
			file_upload: fileUpload,
			bentuk_fisik_sertifikat: 'ORIGINAL (Asli)',
			status_ketersediaan_fisik: 'Available'
		};

		// Path PDF
		const filePath = fileUpload ? `uploads/land_certificates/${fileUpload}` : null;

		// Periksa apakah dokumen sudah ada sebelumnya
		const existing = await sql`
			SELECT id FROM dms.documents 
			WHERE metadata->>'legacy_source' = 'land_certificate' 
			  AND metadata->>'legacy_id' = ${String(id)}
			LIMIT 1
		`;

		if (existing.length > 0) {
			await sql`
				UPDATE dms.documents
				SET doc_number = ${docNumber},
				    title = ${title},
				    doc_type_id = ${certDocType.id},
				    entity_type = 'CORPORATE',
				    company_id = ${targetCompany?.id || null},
				    filing_location_id = ${rakA2?.id || null},
				    physical_status = 'IN_STORAGE',
				    qr_code_id = ${qrCode},
				    file_path = ${filePath},
				    notes = ${notes},
				    metadata = ${sql.json(metadata)},
				    issue_date = ${createdDate ? new Date(createdDate) : null},
				    updated_at = NOW()
				WHERE id = ${existing[0].id}
			`;
			updatedCount++;
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
					${certDocType.id},
					${title},
					'CORPORATE',
					${targetCompany?.id || null},
					${rakA2?.id || null},
					'IN_STORAGE',
					'ACTIVE',
					1,
					${qrCode},
					${filePath},
					${notes},
					${sql.json(metadata)},
					${createdDate ? new Date(createdDate) : null},
					${createdDate ? new Date(createdDate) : new Date()},
					NOW(),
					'SYSTEM_MIGRATION'
				)
			`;
			insertedCount++;
		}
	}

	console.log(`\n=== MIGRASI SELESAI ===`);
	console.log(`- Berkas Baru Disisipkan : ${insertedCount}`);
	console.log(`- Berkas Diperbarui      : ${updatedCount}`);

	const [{ count: totalLandDocs }] = await sql`
		SELECT count(*) FROM dms.documents WHERE metadata->>'legacy_source' = 'land_certificate'
	`;
	const [{ count: shmCount }] = await sql`
		SELECT count(*) FROM dms.documents WHERE metadata->>'legacy_source' = 'land_certificate' AND metadata->>'certificate_type' = 'SHM'
	`;
	const [{ count: shgbCount }] = await sql`
		SELECT count(*) FROM dms.documents WHERE metadata->>'legacy_source' = 'land_certificate' AND metadata->>'certificate_type' = 'SHGB'
	`;
	const [{ count: totalDocs }] = await sql`
		SELECT count(*) FROM dms.documents
	`;

	console.log(`\n=== VERIFIKASI POSTGRESQL ===`);
	console.log(`Total Sertifikat Tanah di dms.documents : ${totalLandDocs} berkas`);
	console.log(`- SHM (Sertifikat Hak Milik)             : ${shmCount} berkas`);
	console.log(`- SHGB (Sertifikat Hak Guna Bangunan)    : ${shgbCount} berkas`);
	console.log(`Total Dokumen Keseluruhan di DMS         : ${totalDocs} berkas`);

	await sql.end();
	process.exit(0);
}

run().catch((err) => {
	console.error('Migration error:', err);
	process.exit(1);
});
