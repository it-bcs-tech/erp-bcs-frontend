const fs = require('fs');
const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL, { max: 1 });

function parseForkliftRows(sqlText) {
	const insertStart = sqlText.indexOf('INSERT INTO `forklift_header`');
	if (insertStart === -1) return [];
	const valuesStart = sqlText.indexOf('VALUES', insertStart);
	const valuesText = sqlText.slice(valuesStart + 6);
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
	console.log('=== MEMULAI MIGRASI forklift_header DARI db/department_bulk.sql KE dms.documents ===');

	// 1. Pastikan Doc Type 'FAKTUR_ARMADA' tersedia
	const [fakturType] = await sql`
		INSERT INTO dms.m_doc_type (code, name, description, is_active)
		VALUES (
			'FAKTUR_ARMADA', 
			'Faktur & Bukti Pembelian Unit', 
			'Faktur Pembelian, Invoice ATPM/Dealer, dan Bukti Kepemilikan Alat Berat & Armada', 
			true
		)
		ON CONFLICT (code) DO UPDATE 
		SET name = EXCLUDED.name,
		    description = EXCLUDED.description
		RETURNING id, code, name;
	`;
	console.log(`✓ Doc Type siap: [${fakturType.code}] ${fakturType.name} (ID: ${fakturType.id})`);

	// 2. Ambil Lokasi Simpan Fisik Dokumen Armada (RAK-A1)
	const [rakA1] = await sql`
		SELECT id, code, name FROM dms.m_filing_location WHERE code = 'RAK-A1' LIMIT 1
	`;
	console.log(`✓ Lokasi Fisik Default: [${rakA1?.code}] ${rakA1?.name}`);

	// 3. Ambil seluruh data fleet.unit untuk pemetaan aset
	const units = await sql`SELECT id, nomor_unit, no_lambung, no_rangka, no_mesin, business_unit FROM fleet.unit;`;
	const unitMap = new Map();
	units.forEach(u => {
		if (u.nomor_unit) unitMap.set(u.nomor_unit.replace(/[\s\-_.,]+/g, '').toUpperCase(), u);
		if (u.no_lambung) unitMap.set(u.no_lambung.replace(/[\s\-_.,]+/g, '').toUpperCase(), u);
		if (u.no_rangka) unitMap.set(u.no_rangka.replace(/[\s\-_.,]+/g, '').toUpperCase(), u);
	});
	console.log(`✓ Database memuat ${units.length} unit armada.`);

	// 4. Baca dan parse db/department_bulk.sql
	const sqlContent = fs.readFileSync('db/department_bulk.sql', 'utf-8');
	const rawRows = parseForkliftRows(sqlContent);
	console.log(`✓ Ditemukan ${rawRows.length} baris faktur forklift_header di db/department_bulk.sql`);

	let insertedCount = 0;
	let updatedCount = 0;

	for (const r of rawRows) {
		const idForklift = parseInt(r[0]);
		const unitType = r[1];
		const brandId = parseInt(r[2]);
		const color = r[3];
		const modelType = r[4];
		const capacity = r[5];
		const noChasis = r[6];
		const noEngine = r[7];
		const noLambung = r[8];
		const noInvoice = r[9];
		const transType = r[11];
		const prodYear = parseInt(r[12]);
		const acqYear = parseInt(r[13]);
		const ownership = r[14];
		const fileUpload = r[16] !== 'NULL' ? r[16] : null;
		const createdDate = r[18] !== 'NULL' && r[18] !== '0000-00-00' ? r[18] : null;
		const createdUser = r[19] !== 'NULL' ? r[19] : null;
		const modifiedDate = r[20] !== 'NULL' && r[20] !== '0000-00-00' ? r[20] : null;
		const modifiedUser = r[21] !== 'NULL' ? r[21] : null;

		// Pemetaan ke fleet.unit
		const cleanLambung = noLambung.replace(/[\s\-_.,]+/g, '').toUpperCase();
		const cleanChasis = noChasis.replace(/[\s\-_.,]+/g, '').toUpperCase();
		let matchedUnit = unitMap.get(cleanLambung) || unitMap.get(cleanChasis);

		// Fallback khusus untuk FM 223 -> FM228 (chassis 161 - 20328)
		if (!matchedUnit && cleanChasis.includes('20328')) {
			matchedUnit = units.find(u => u.no_rangka && u.no_rangka.includes('20328'));
		}

		const unitLabel = matchedUnit ? matchedUnit.nomor_unit : noLambung;
		const title = `Faktur Pembelian Forklift TCM ${modelType} (${unitLabel}) - ${ownership}`;
		const docNumber = noInvoice !== 'NULL' && noInvoice !== '' ? noInvoice : `INV-FL-${idForklift}`;
		const qrCode = `BCS-DMS-FL-${String(idForklift).padStart(4, '0')}`;
		const issueDate = acqYear ? `${acqYear}-01-01` : (createdDate || null);

		const metadataObj = {
			legacy_id: idForklift,
			legacy_table: 'forklift_header',
			no_lambung: noLambung,
			unit_number_matched: matchedUnit?.nomor_unit || null,
			unit_type: unitType,
			brand_name: 'TCM',
			brand_id: brandId,
			model_type: modelType,
			capacity: capacity,
			color: color,
			no_chasis: noChasis,
			no_engine: noEngine,
			no_invoice: noInvoice,
			transmission_type: transType,
			production_year: prodYear,
			acquisition_year: acqYear,
			ownership: ownership,
			original_file_name: fileUpload,
			legacy_audit: {
				created_date: createdDate,
				created_user: createdUser,
				modified_date: modifiedDate,
				modified_user: modifiedUser
			}
		};

		// Cek apakah sudah pernah dimigrasikan
		const [existing] = await sql`
			SELECT id FROM dms.documents 
			WHERE (metadata->>'legacy_id')::int = ${idForklift} 
			  AND metadata->>'legacy_table' = 'forklift_header'
			LIMIT 1
		`;

		if (existing) {
			await sql`
				UPDATE dms.documents
				SET
					doc_number = ${docNumber},
					doc_type_id = ${fakturType.id},
					asset_id = ${matchedUnit ? matchedUnit.id : null},
					filing_location_id = ${rakA1?.id || null},
					title = ${title},
					issue_date = ${issueDate ? new Date(issueDate) : null},
					notes = ${`Faktur Invoice: ${noInvoice} | Chasis: ${noChasis} | Mesin: ${noEngine}`},
					metadata = ${sql.json(metadataObj)},
					file_path = ${fileUpload ? `/uploads/forklifts/${fileUpload}` : null},
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
					asset_id,
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
					${fakturType.id},
					NULL,
					${matchedUnit ? matchedUnit.id : null},
					NULL,
					NULL,
					NULL,
					${rakA1?.id || null},
					${title},
					'FLEET',
					${issueDate ? new Date(issueDate) : null},
					NULL,
					'ACTIVE',
					1,
					'IN_STORAGE',
					${qrCode},
					${fileUpload ? `/uploads/forklifts/${fileUpload}` : null},
					${`Faktur Invoice: ${noInvoice} | Chasis: ${noChasis} | Mesin: ${noEngine}`},
					${sql.json(metadataObj)},
					${createdDate ? new Date(createdDate) : new Date()},
					'system-migration',
					NOW()
				)
			`;
			insertedCount++;
		}
	}

	console.log(`\n=== HASIL MIGRASI FAKTUR FORKLIFT ===`);
	console.log(`✓ Dokumen baru dimasukkan: ${insertedCount}`);
	console.log(`✓ Dokumen diperbarui: ${updatedCount}`);

	// 5. Verifikasi di database
	const [{ count: totalFaktur }] = await sql`
		SELECT count(*)::int as count 
		FROM dms.documents 
		WHERE doc_type_id = ${fakturType.id}
	`;
	console.log(`✓ Total Faktur & Kepemilikan Armada di dms.documents: ${totalFaktur}`);

	const samples = await sql`
		SELECT d.doc_number, d.title, u.nomor_unit, fl.code as location_code
		FROM dms.documents d
		LEFT JOIN fleet.unit u ON u.id = d.asset_id
		LEFT JOIN dms.m_filing_location fl ON fl.id = d.filing_location_id
		WHERE d.doc_type_id = ${fakturType.id}
		ORDER BY d.created_at ASC
		LIMIT 5
	`;
	console.log('\nSample Faktur yang Telah Tertaut:');
	console.table(samples);

	await sql.end();
	process.exit(0);
}

run().catch(async (err) => {
	console.error('Error migrasi forklift_header:', err);
	await sql.end();
	process.exit(1);
});
