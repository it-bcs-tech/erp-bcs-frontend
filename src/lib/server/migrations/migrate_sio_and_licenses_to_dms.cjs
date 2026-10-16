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

function extractNameFromFilename(filename) {
	if (!filename || filename === 'NULL') return '';
	// Contoh: A.MASRIBI.expire__MARET_2028_Gd.LATINUSA.pdf -> A.MASRIBI
	// ADE_IRAWAN.NSBI.Desember_2022.pdf -> ADE IRAWAN
	const base = filename.replace(/\.pdf$/i, '');
	const firstPart = base.split('.')[0] || '';
	const clean = firstPart.replace(/[_\-]+/g, ' ').trim();
	if (clean.length > 2 && !clean.toLowerCase().startsWith('sio')) {
		return clean;
	}
	return '';
}

async function run() {
	console.log('=== MEMULAI MIGRASI SIO OPERATOR & IZIN LEGALITAS PERUSAHAAN KE DMS ===');

	// 1. Pastikan Doc Type 'SIO_DRIVER' dan 'LEGAL_PERUSAHAAN' siap
	const [sioDocType] = await sql`
		INSERT INTO dms.m_doc_type (code, name, description, is_active)
		VALUES (
			'SIO_DRIVER',
			'SIO Operator',
			'Surat Izin Operator Forklift / Crane / Excavator / Loader / K3',
			true
		)
		ON CONFLICT (code) DO UPDATE 
		SET name = EXCLUDED.name,
		    description = EXCLUDED.description
		RETURNING id, code, name;
	`;

	const [licDocType] = await sql`
		INSERT INTO dms.m_doc_type (code, name, description, is_active)
		VALUES (
			'LEGAL_PERUSAHAAN',
			'Dokumen Legalitas Perusahaan',
			'Izin Usaha, Izin Operasional, Angka Pengenal Importir, Rekomendasi KLHK, Sertifikat dan Legalitas Badan',
			true
		)
		ON CONFLICT (code) DO UPDATE 
		SET name = EXCLUDED.name,
		    description = EXCLUDED.description
		RETURNING id, code, name;
	`;

	console.log(`✓ Doc Types Siap: [${sioDocType.code}] (ID: ${sioDocType.id}) & [${licDocType.code}] (ID: ${licDocType.id})`);

	// 2. Lokasi Fisik Default
	const [rakB1] = await sql`SELECT id FROM dms.m_filing_location WHERE code = 'RAK-B1' LIMIT 1`;
	const [locLegal] = await sql`SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1`;

	// 3. Ambil Master Perusahaan
	const companies = await sql`SELECT id, legacy_id, name, code FROM master.m_company`;
	const companyMap = new Map();
	companies.forEach(c => companyMap.set(c.legacy_id, c));

	// 4. Ambil Master Karyawan & Drivers
	const allKaryawan = await sql`
		SELECT payroll_id, nama_karyawan FROM master.m_karyawan_1
		UNION
		SELECT payroll_id, nama_karyawan FROM master.m_karyawan
	`;
	const karyawanMap = new Map();
	allKaryawan.forEach(k => {
		if (k.payroll_id) karyawanMap.set(k.payroll_id.trim(), k.nama_karyawan.trim());
	});

	const allDrivers = await sql`
		SELECT d.id, k.payroll_id 
		FROM master.m_drivers d
		JOIN master.m_karyawan_1 k ON k.id = d.karyawan_id
	`;
	const driverMap = new Map();
	allDrivers.forEach(d => {
		if (d.payroll_id) driverMap.set(d.payroll_id.trim(), d.id);
	});

	// 5. Baca dan parse db/gabungan_tabel.sql
	const sqlContent = fs.readFileSync('db/gabungan_tabel.sql', 'utf-8');

	// Lookup Judul Izin & Instansi Penerbit
	const rawTitles = parseSqlInsert(sqlContent, 'master_title_license');
	const titleLookup = new Map();
	rawTitles.forEach(r => titleLookup.set(r[0], r[1]));

	const rawIssuers = parseSqlInsert(sqlContent, 'master_issued');
	const issuerLookup = new Map();
	rawIssuers.forEach(r => issuerLookup.set(r[0], r[1]));

	// ==========================================
	// BAGIAN A: MIGRASI 246 SIO OPERATOR
	// ==========================================
	const rawSio = parseSqlInsert(sqlContent, 'sio_operator');
	console.log(`\n--- Memproses ${rawSio.length} Berkas SIO Operator ---`);

	let sioInserted = 0, sioUpdated = 0;

	for (const r of rawSio) {
		const id = parseInt(r[0]);
		const sioNo = r[1] !== 'NULL' ? r[1].trim() : `SIO-#${id}`;
		const tipe = r[2] !== 'NULL' ? r[2].trim() : 'Operator';
		const payrollId = r[3] !== 'NULL' ? r[3].trim() : '';
		const jobDesc = r[4] !== 'NULL' ? r[4].trim() : 'Operator';
		const workLocation = r[5] !== 'NULL' ? r[5].trim() : '';
		const issuedBy = r[6] !== 'NULL' ? r[6].trim() : 'Kementerian Ketenagakerjaan RI';
		const signedDate = parseDate(r[7]);
		const expireDate = parseDate(r[8]);
		const pic = r[9] !== 'NULL' ? r[9].trim() : '';
		const picEmail = r[10] !== 'NULL' ? r[10].trim() : '';
		const fileUpload = r[11] !== 'NULL' ? r[11].trim() : null;
		const aktif = r[18] !== 'NULL' ? r[18].trim() : 'Active';

		// Resolve operator name
		let operatorName = karyawanMap.get(payrollId) || extractNameFromFilename(fileUpload) || `Operator ${payrollId}`;

		// Resolve driver_id for strict FK
		const driverId = driverMap.get(payrollId) || null;

		// Judul Dokumen
		let title = `SIO ${tipe} (${jobDesc}) - ${operatorName}${payrollId ? ` (${payrollId})` : ''} - ${sioNo}`;
		if (title.length > 250) title = title.substring(0, 247) + '...';

		const docNumber = sioNo;
		const qrCode = `BCS-DMS-SIO-${String(id).padStart(4, '0')}`;
		const filePath = fileUpload ? `uploads/sio/${fileUpload}` : null;
		const notes = `Surat Izin Operator ${tipe} (${jobDesc}) untuk ${operatorName} (NIK: ${payrollId}). Lokasi Kerja: ${workLocation || '-'}. Diterbitkan oleh: ${issuedBy}.`;

		const metadata = {
			legacy_source: 'sio_operator',
			legacy_id: id,
			sio_no: sioNo,
			tipe: tipe,
			job_desc: jobDesc,
			payroll_id: payrollId,
			driver_name: operatorName,
			operator_name: operatorName,
			work_location: workLocation,
			issued_by: issuedBy,
			pic: pic,
			pic_email: picEmail,
			file_upload: fileUpload,
			aktif: aktif
		};

		const existing = await sql`
			SELECT id FROM dms.documents
			WHERE metadata->>'legacy_source' = 'sio_operator' AND metadata->>'legacy_id' = ${String(id)}
			LIMIT 1
		`;

		if (existing.length > 0) {
			await sql`
				UPDATE dms.documents
				SET doc_number = ${docNumber},
				    doc_type_id = ${sioDocType.id},
				    title = ${title},
				    entity_type = 'DRIVER',
				    employee_id = ${driverId},
				    filing_location_id = ${rakB1?.id || null},
				    physical_status = 'IN_STORAGE',
				    qr_code_id = ${qrCode},
				    file_path = ${filePath},
				    notes = ${notes},
				    metadata = ${sql.json(metadata)},
				    issue_date = ${signedDate ? new Date(signedDate) : null},
				    expiry_date = ${expireDate ? new Date(expireDate) : null},
				    updated_at = NOW()
				WHERE id = ${existing[0].id}
			`;
			sioUpdated++;
		} else {
			await sql`
				INSERT INTO dms.documents (
					doc_number,
					doc_type_id,
					title,
					entity_type,
					employee_id,
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
					${sioDocType.id},
					${title},
					'DRIVER',
					${driverId},
					${rakB1?.id || null},
					'IN_STORAGE',
					'ACTIVE',
					1,
					${qrCode},
					${filePath},
					${notes},
					${sql.json(metadata)},
					${signedDate ? new Date(signedDate) : null},
					${expireDate ? new Date(expireDate) : null},
					NOW(),
					NOW(),
					'SYSTEM_MIGRATION'
				)
			`;
			sioInserted++;
		}
	}
	console.log(`✓ SIO Operator: ${sioInserted} disisipkan, ${sioUpdated} diperbarui.`);

	// ==========================================
	// BAGIAN B: MIGRASI 402 IZIN LEGALITAS PERUSAHAAN
	// ==========================================
	const rawLh = parseSqlInsert(sqlContent, 'license_header');
	console.log(`\n--- Memproses ${rawLh.length} Berkas Izin Legalitas Perusahaan ---`);

	let licInserted = 0, licUpdated = 0;

	for (const r of rawLh) {
		const id = parseInt(r[0]);
		const idCompany = parseInt(r[1]);
		const noLicenseHelp = r[3] !== 'NULL' ? r[3].trim() : '';
		const mstrTitleId = r[4] !== 'NULL' ? r[4].trim() : '';
		let titleLicense = r[5] !== 'NULL' && r[5] !== '' ? r[5].trim() : (titleLookup.get(mstrTitleId) || 'Dokumen Izin Usaha / Operasional');
		const mstrIssuedId = r[6] !== 'NULL' ? r[6].trim() : '';
		let issuedText = r[7] !== 'NULL' && r[7] !== '' ? r[7].trim() : (issuerLookup.get(mstrIssuedId) || 'Instansi Pemerintah Terkait');

		const signDate = parseDate(r[8]);
		const effectiveDate = parseDate(r[9]);
		const expiredDate = parseDate(r[10]);
		const filingStatus = r[14] !== 'NULL' ? r[14].trim() : 'Available';
		const location = r[15] !== 'NULL' ? r[15].trim() : 'Legal Department';
		const remarks = r[18] !== 'NULL' ? r[18].trim() : '';
		const fileUpload = r[19] !== 'NULL' ? r[19].trim() : null;
		const noLicense = (r[28] && r[28] !== 'NULL' && r[28] !== '') ? r[28].trim() : (noLicenseHelp || `LIC-#${id}`);
		const capacity = r[29] !== 'NULL' && r[29] !== '-' ? r[29].trim() : null;

		const compObj = companyMap.get(idCompany);
		const compName = compObj ? compObj.name : 'PT Buana Centra Swakarsa';

		// Judul Dokumen
		let title = `${titleLicense} - ${compName}`;
		if (noLicense && !noLicense.startsWith('LIC-#')) {
			title = `${titleLicense} (No. ${noLicense}) - ${compName}`;
		}
		if (title.length > 250) title = title.substring(0, 247) + '...';

		const docNumber = noLicense;
		const qrCode = `BCS-DMS-LIC-${String(id).padStart(4, '0')}`;
		const filePath = fileUpload ? `uploads/licenses/${fileUpload}` : null;
		let notes = `${titleLicense} milik ${compName}. Instansi Penerbit: ${issuedText}. Lokasi Arsip: ${location}.`;
		if (capacity) notes += ` Kapasitas: ${capacity}.`;
		if (remarks) notes += ` Keterangan: ${remarks}.`;

		const metadata = {
			legacy_source: 'license_header',
			legacy_id: id,
			no_license: noLicense,
			title_license: titleLicense,
			issued_by: issuedText,
			company_name: compName,
			company_legacy_id: idCompany,
			location: location,
			capacity: capacity,
			filing_status: filingStatus,
			file_upload: fileUpload,
			remarks: remarks
		};

		const existing = await sql`
			SELECT id FROM dms.documents
			WHERE metadata->>'legacy_source' = 'license_header' AND metadata->>'legacy_id' = ${String(id)}
			LIMIT 1
		`;

		const issueDateFinal = signDate || effectiveDate || null;

		if (existing.length > 0) {
			await sql`
				UPDATE dms.documents
				SET doc_number = ${docNumber},
				    doc_type_id = ${licDocType.id},
				    title = ${title},
				    entity_type = 'CORPORATE',
				    company_id = ${compObj?.id || null},
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
			licUpdated++;
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
					${licDocType.id},
					${title},
					'CORPORATE',
					${compObj?.id || null},
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
			licInserted++;
		}
	}
	console.log(`✓ Izin Legalitas: ${licInserted} disisipkan, ${licUpdated} diperbarui.`);

	// ==========================================
	// VERIFIKASI POSTGRESQL
	// ==========================================
	const [{ count: totalSioInDb }] = await sql`
		SELECT count(*) FROM dms.documents WHERE metadata->>'legacy_source' = 'sio_operator'
	`;
	const [{ count: totalLicInDb }] = await sql`
		SELECT count(*) FROM dms.documents WHERE metadata->>'legacy_source' = 'license_header'
	`;
	const [{ count: totalDriverDocs }] = await sql`
		SELECT count(*) FROM dms.documents WHERE entity_type = 'DRIVER'
	`;
	const [{ count: totalCorporateDocs }] = await sql`
		SELECT count(*) FROM dms.documents WHERE entity_type = 'CORPORATE'
	`;
	const [{ count: totalAllDocs }] = await sql`
		SELECT count(*) FROM dms.documents
	`;

	console.log(`\n=== VERIFIKASI DATABASE POSTGRESQL ===`);
	console.log(`Total SIO Operator di DMS             : ${totalSioInDb} berkas`);
	console.log(`Total Izin Legalitas Perusahaan di DMS : ${totalLicInDb} berkas`);
	console.log(`Total Dokumen Tab DRIVER              : ${totalDriverDocs} berkas (sebelumnya: 1)`);
	console.log(`Total Dokumen Tab CORPORATE           : ${totalCorporateDocs} berkas (sebelumnya: 357)`);
	console.log(`TOTAL KESELURUHAN DOKUMEN DI DMS      : ${totalAllDocs} berkas`);

	await sql.end();
	process.exit(0);
}

run().catch(err => {
	console.error('Migration error:', err);
	process.exit(1);
});
