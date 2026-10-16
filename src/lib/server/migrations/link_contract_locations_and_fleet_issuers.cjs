const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

async function run() {
	console.log('=== MEMULAI PENAUTAN LOKASI FISIK KONTRAK & PENERBIT DOKUMEN ARMADA ===');

	// 1. Ambil ID RAK-C1 dari dms.m_filing_location
	const [rakC1] = await sql`
		SELECT id, code, name 
		FROM dms.m_filing_location 
		WHERE code = 'RAK-C1'
	`;
	if (!rakC1) {
		throw new Error('Lokasi RAK-C1 tidak ditemukan di dms.m_filing_location!');
	}
	console.log(`Lokasi target kontrak: [${rakC1.code}] ${rakC1.name} (ID: ${rakC1.id})`);

	// 2. Tautkan seluruh 1.706 kontrak ke RAK-C1
	console.log('\n--- 1. Menautkan Lokasi Fisik Kontrak Legal & PKS ke RAK-C1 ---');
	const contractResult = await sql`
		UPDATE dms.documents d
		SET 
			filing_location_id = ${rakC1.id},
			updated_at = NOW()
		FROM dms.m_doc_type dt
		WHERE dt.id = d.doc_type_id
		  AND (dt.code = 'KONTRAK_KERJASAMA' OR d.metadata->>'legacy_table' IN ('contract_header', 'contract_detail'))
		RETURNING d.id
	`;
	console.log(`Berhasil menautkan ${contractResult.length} berkas kontrak ke ${rakC1.name}.`);

	// 3. Ambil Master Issuer: DISHUB & SAMSAT POLDA
	console.log('\n--- 2. Menautkan Penerbit (Issuer) Dokumen Armada & Driver ---');
	const [samsat] = await sql`SELECT id, name FROM dms.m_issuer WHERE name ILIKE '%SAMSAT%' LIMIT 1`;
	const [dishub] = await sql`SELECT id, name FROM dms.m_issuer WHERE name ILIKE '%DISHUB%' LIMIT 1`;

	if (!samsat || !dishub) {
		throw new Error('Penerbit SAMSAT atau DISHUB tidak ditemukan di dms.m_issuer!');
	}
	console.log(`Penerbit SAMSAT: ${samsat.name} (ID: ${samsat.id})`);
	console.log(`Penerbit DISHUB: ${dishub.name} (ID: ${dishub.id})`);

	// Update BPKB & STNK armada -> SAMSAT POLDA
	const bpkbStnkResult = await sql`
		UPDATE dms.documents d
		SET 
			issuer_id = ${samsat.id},
			updated_at = NOW()
		FROM dms.m_doc_type dt
		WHERE dt.id = d.doc_type_id
		  AND d.entity_type = 'FLEET'
		  AND dt.code IN ('BPKB', 'STNK')
		RETURNING d.id
	`;
	console.log(`Berhasil menautkan ${bpkbStnkResult.length} dokumen BPKB & STNK ke ${samsat.name}.`);

	// Update KIR armada -> DISHUB
	const kirResult = await sql`
		UPDATE dms.documents d
		SET 
			issuer_id = ${dishub.id},
			updated_at = NOW()
		FROM dms.m_doc_type dt
		WHERE dt.id = d.doc_type_id
		  AND d.entity_type = 'FLEET'
		  AND dt.code = 'KIR'
		RETURNING d.id
	`;
	console.log(`Berhasil menautkan ${kirResult.length} dokumen KIR ke ${dishub.name}.`);

	// Update SIM Driver -> SAMSAT POLDA / POLRI
	const simResult = await sql`
		UPDATE dms.documents d
		SET 
			issuer_id = ${samsat.id},
			updated_at = NOW()
		FROM dms.m_doc_type dt
		WHERE dt.id = d.doc_type_id
		  AND d.entity_type = 'DRIVER'
		  AND dt.code = 'SIM_DRIVER'
		RETURNING d.id
	`;
	console.log(`Berhasil menautkan ${simResult.length} dokumen SIM Driver ke ${samsat.name}.`);

	// 4. Verifikasi Akhir
	console.log('\n=== REKAPITULASI PENAUTAN MASTER DATA ===');
	const summaryFiling = await sql`
		SELECT 
			COALESCE(fl.name, 'Tanpa Lokasi') as location_name,
			count(d.id)::int as doc_count
		FROM dms.documents d
		LEFT JOIN dms.m_filing_location fl ON fl.id = d.filing_location_id
		GROUP BY fl.name
		ORDER BY doc_count DESC
	`;
	console.log('Distribusi Dokumen per Lokasi Simpan Fisik:');
	console.table(summaryFiling);

	const summaryIssuer = await sql`
		SELECT 
			COALESCE(i.name, 'Tanpa Penerbit') as issuer_name,
			count(d.id)::int as doc_count
		FROM dms.documents d
		LEFT JOIN dms.m_issuer i ON i.id = d.issuer_id
		GROUP BY i.name
		ORDER BY doc_count DESC
	`;
	console.log('Distribusi Dokumen per Instansi Penerbit:');
	console.table(summaryIssuer);

	await sql.end();
}

run().catch(err => {
	console.error('Fatal error saat penautan master data:', err);
	process.exit(1);
});
