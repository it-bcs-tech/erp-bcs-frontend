const fs = require('fs');
const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL, { max: 1 });

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

const FILING_MAP = {
	'1': 'ORIGINAL (Asli)',
	'2': 'PHOTOCOPY (Salinan)',
	'3': 'SCANCOPY (Digital Scan)',
	'4': 'NOT SCAN (Belum Scan)'
};

const STATUS_MAP = {
	'1': 'Available (Tersedia di Lemari)',
	'2': 'N/A (Tidak Tersedia / Di Luar)'
};

async function run() {
	console.log('=== MEMPERKAYA METADATA FILING 209 AKTA DARI db/department_bulk.sql ===');

	const sqlContent = fs.readFileSync('db/deed_header.sql', 'utf-8');
	const rawRows = parseSqlInsert(sqlContent);
	console.log(`✓ Memproses ${rawRows.length} baris data akta legal...`);

	let updatedCount = 0;

	for (const r of rawRows) {
		const idDeed = parseInt(r[0]);
		const filingCode = r[5] !== 'NULL' ? r[5] : null;
		const statusFilingCode = r[6] !== 'NULL' ? r[6] : null;
		const molhrFilingCode = r[9] !== 'NULL' ? r[9] : null;

		const bentukFisikAkta = filingCode ? FILING_MAP[filingCode] || `Kode ${filingCode}` : null;
		const statusKetersediaan = statusFilingCode ? STATUS_MAP[statusFilingCode] || `Kode ${statusFilingCode}` : null;
		const bentukFisikSK = molhrFilingCode ? FILING_MAP[molhrFilingCode] || `Kode ${molhrFilingCode}` : null;

		// Ambil dokumen di database
		const [doc] = await sql`
			SELECT id, metadata, physical_status
			FROM dms.documents
			WHERE (metadata->>'legacy_id')::int = ${idDeed}
			  AND metadata->>'legacy_table' = 'deed_header'
			LIMIT 1
		`;

		if (doc) {
			const updatedMeta = {
				...doc.metadata,
				filing_code: filingCode,
				bentuk_fisik_akta: bentukFisikAkta,
				status_ketersediaan_fisik: statusKetersediaan,
				bentuk_fisik_sk_menkumham: bentukFisikSK,
				is_original: filingCode === '1'
			};

			let physicalStatus = doc.physical_status;
			if (statusFilingCode === '2') {
				physicalStatus = 'ARCHIVED';
			} else if (statusFilingCode === '1') {
				physicalStatus = 'IN_STORAGE';
			}

			await sql`
				UPDATE dms.documents
				SET 
					metadata = ${sql.json(updatedMeta)},
					physical_status = ${physicalStatus},
					updated_at = NOW()
				WHERE id = ${doc.id}
			`;
			updatedCount++;
		}
	}

	console.log(`✓ Sukses memperkaya metadata ${updatedCount} berkas akta di dms.documents.`);

	// Verifikasi sampel data
	const samples = await sql`
		SELECT 
			doc_number,
			title,
			physical_status,
			metadata->>'bentuk_fisik_akta' as fisik_akta,
			metadata->>'status_ketersediaan_fisik' as ketersediaan,
			metadata->>'bentuk_fisik_sk_menkumham' as fisik_sk
		FROM dms.documents
		WHERE metadata->>'legacy_table' = 'deed_header'
		LIMIT 5;
	`;
	console.log('\nSample Metadata Akta Setelah Diperkaya:');
	console.table(samples);

	await sql.end();
	process.exit(0);
}

run().catch(async (err) => {
	console.error('Error memperkaya metadata akta:', err);
	await sql.end();
	process.exit(1);
});
