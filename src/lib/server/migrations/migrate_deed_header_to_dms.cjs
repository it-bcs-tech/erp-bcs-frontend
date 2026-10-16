const fs = require('fs');
const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

function parseSqlInsert(sqlText) {
	const insertStart = sqlText.indexOf('VALUES');
	const valuesText = sqlText.slice(insertStart + 6);
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
	console.log('=== MEMULAI MIGRASI db/deed_header.sql KE dms.documents ===');

	// 1. Pastikan Doc Type 'AKTA_NOTARIS' tersedia dan kolom title cukup panjang
	await sql`
		ALTER TABLE dms.documents 
		ALTER COLUMN title TYPE VARCHAR(500);
	`;

	const [aktaType] = await sql`
		INSERT INTO dms.m_doc_type (code, name, description, is_active)
		VALUES (
			'AKTA_NOTARIS', 
			'Akta Notaris & SK Kemenkumham', 
			'Akta Notaris Pendirian, Perubahan Anggaran Dasar, RUPS, dan SK Menkumham Perusahaan', 
			true
		)
		ON CONFLICT (code) DO UPDATE 
		SET name = EXCLUDED.name,
		    description = EXCLUDED.description
		RETURNING id, code, name;
	`;
	console.log(`✓ Doc Type siap: [${aktaType.code}] ${aktaType.name} (ID: ${aktaType.id})`);

	// 2. Ambil master data pendukung: Perusahaan, Notaris, Lokasi Fisik
	const companies = await sql`SELECT id, legacy_id, name, code FROM master.m_company`;
	const companyMap = new Map();
	companies.forEach(c => companyMap.set(c.legacy_id, c));

	const notaries = await sql`SELECT id, legacy_id, name FROM dms.m_notary`;
	const notaryMap = new Map();
	notaries.forEach(n => notaryMap.set(n.legacy_id, n));

	const [legalDeptLoc] = await sql`
		SELECT id, code, name FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1
	`;

	console.log(`✓ Mapped: ${companyMap.size} Perusahaan, ${notaryMap.size} Notaris.`);
	console.log(`✓ Lokasi Fisik Default: [${legalDeptLoc?.code}] ${legalDeptLoc?.name}`);

	// 3. Baca dan parse db/deed_header.sql
	const sqlContent = fs.readFileSync('db/deed_header.sql', 'utf-8');
	const rawRows = parseSqlInsert(sqlContent);
	console.log(`✓ Ditemukan ${rawRows.length} baris data akta legal di db/deed_header.sql`);

	let insertedCount = 0;
	let updatedCount = 0;

	for (const r of rawRows) {
		const idDeed = parseInt(r[0]);
		const deedNo = r[1] !== 'NULL' ? r[1] : '';
		const deedDated = r[2] !== 'NULL' && r[2] !== '0000-00-00' ? r[2] : null;
		const notId = parseInt(r[3]);
		const compId = parseInt(r[4]);
		const molhrNo = r[7] !== 'NULL' ? r[7] : null;
		const molhrDate = r[8] !== 'NULL' && r[8] !== '0000-00-00' ? r[8] : null;
		const locationStr = r[10] !== 'NULL' ? r[10] : '';
		const fileUpload = r[11] !== 'NULL' ? r[11] : null;
		const remarks = r[12] !== 'NULL' ? r[12] : null;
		const createdUser = r[13] !== 'NULL' ? r[13] : null;
		const createdDate = r[14] !== 'NULL' && r[14] !== '0000-00-00 00:00:00' ? r[14] : null;
		const modifiedUser = r[15] !== 'NULL' ? r[15] : null;
		const modifiedDate = r[16] !== 'NULL' && r[16] !== '0000-00-00 00:00:00' ? r[16] : null;

		const companyObj = companyMap.get(compId);
		const notaryObj = notaryMap.get(notId);

		const companyName = companyObj ? companyObj.name : `Perusahaan Legacy #${compId}`;
		const firstLineRemark = remarks ? remarks.split(/[\r\n]+/)[0].replace(/\\n/g, ' ').trim() : '';
		const hasRemarks = firstLineRemark && firstLineRemark !== '';
		const hasDeedNo = deedNo && deedNo.trim() !== '';

		let title = '';
		if (hasRemarks) {
			title = `${firstLineRemark} ${hasDeedNo ? `(Akta No. ${deedNo})` : ''} - ${companyName}`;
		} else if (hasDeedNo) {
			title = `Akta Notaris No. ${deedNo} - ${companyName}`;
		} else {
			title = `Akta Notaris - ${companyName}`;
		}

		if (title.length > 250) {
			title = title.substring(0, 247) + '...';
		}

		const docNumber = hasDeedNo ? `Akta No. ${deedNo}` : `Akta Legacy #${idDeed}`;

		let notes = '';
		if (molhrNo && molhrNo !== '-') {
			notes = `SK Menkumham: ${molhrNo}${molhrDate ? ` (${molhrDate})` : ''}`;
		}
		if (remarks && !hasRemarks) {
			notes += (notes ? ' | ' : '') + remarks;
		}

		// Filing Location
		let locId = null;
		if (locationStr.toLowerCase().includes('legal') && legalDeptLoc) {
			locId = legalDeptLoc.id;
		}

		// QR code unik
		const qrCode = `BCS-DMS-AKTA-${String(idDeed).padStart(4, '0')}`;

		const metadataObj = {
			legacy_id: idDeed,
			legacy_table: 'deed_header',
			deed_no: deedNo,
			deed_date: deedDated,
			notary_id_legacy: notId,
			notary_name_legacy: notaryObj?.name || null,
			company_id_legacy: compId,
			company_name_legacy: companyName,
			molhr_no: molhrNo,
			molhr_date: molhrDate,
			molhr_filing: r[9] !== 'NULL' ? r[9] : null,
			filing_status: r[6] !== 'NULL' ? r[6] : null,
			legacy_location: locationStr || null,
			original_file_name: fileUpload,
			remarks: remarks,
			legacy_audit: {
				created_user: createdUser,
				created_date: createdDate,
				modified_user: modifiedUser,
				modified_date: modifiedDate
			}
		};

		// Cek apakah dokumen ini sudah pernah dimigrasikan
		const [existing] = await sql`
			SELECT id FROM dms.documents 
			WHERE (metadata->>'legacy_id')::int = ${idDeed} 
			  AND metadata->>'legacy_table' = 'deed_header'
			LIMIT 1
		`;

		if (existing) {
			await sql`
				UPDATE dms.documents
				SET
					doc_number = ${docNumber},
					doc_type_id = ${aktaType.id},
					company_id = ${companyObj?.id || null},
					notary_id = ${notaryObj?.id || null},
					filing_location_id = ${locId},
					title = ${title},
					issue_date = ${deedDated ? deedDated : null},
					notes = ${notes || null},
					metadata = ${sql.json(metadataObj)},
					file_path = ${fileUpload ? `/uploads/deeds/${fileUpload}` : null},
					updated_at = NOW()
				WHERE id = ${existing.id}
			`;
			updatedCount++;
		} else {
			await sql`
				INSERT INTO dms.documents (
					doc_number,
					doc_type_id,
					category_id,
					company_id,
					partner_id,
					notary_id,
					filing_location_id,
					title,
					entity_type,
					issue_date,
					expiry_date,
					status,
					current_version,
					physical_status,
					qr_code_id,
					file_path,
					notes,
					metadata,
					created_at,
					created_by,
					updated_at
				) VALUES (
					${docNumber},
					${aktaType.id},
					NULL,
					${companyObj?.id || null},
					NULL,
					${notaryObj?.id || null},
					${locId},
					${title},
					'CORPORATE',
					${deedDated ? deedDated : null},
					NULL,
					'ACTIVE',
					1,
					'IN_STORAGE',
					${qrCode},
					${fileUpload ? `/uploads/deeds/${fileUpload}` : null},
					${notes || null},
					${sql.json(metadataObj)},
					${createdDate ? new Date(createdDate) : new Date()},
					'system-migration',
					NOW()
				)
			`;
			insertedCount++;
		}
	}

	console.log(`\n=== HASIL MIGRASI AKTA NOTARIS ===`);
	console.log(`✓ Dokumen baru dimasukkan: ${insertedCount}`);
	console.log(`✓ Dokumen diperbarui: ${updatedCount}`);

	// 4. Verifikasi di database
	const [{ count: totalAkta }] = await sql`
		SELECT count(*)::int as count 
		FROM dms.documents 
		WHERE doc_type_id = ${aktaType.id}
	`;
	console.log(`✓ Total Akta Notaris di dms.documents: ${totalAkta}`);

	// Cek agregasi notaris
	const notaryAgg = await sql`
		SELECT n.name, count(d.id)::int as doc_count
		FROM dms.m_notary n
		JOIN dms.documents d ON d.notary_id = n.id
		GROUP BY n.name
		ORDER BY doc_count DESC
		LIMIT 5
	`;
	console.log('\nTop 5 Notaris dengan Akta Terbanyak:');
	console.table(notaryAgg);

	process.exit(0);
}

run().catch((err) => {
	console.error('Error migrasi deed_header:', err);
	process.exit(1);
});
