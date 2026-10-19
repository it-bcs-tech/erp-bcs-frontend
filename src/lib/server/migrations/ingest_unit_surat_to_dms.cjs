const fs = require('fs');
const postgres = require('postgres');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

function cleanVal(v) {
  if (!v || v === 'NULL') return null;
  return v.replace(/^['"]|['"]$/g, '').trim();
}

function parseSqlInsert(sqlText, tableName) {
  const marker = 'INSERT INTO `' + tableName + '`';
  let idx = 0;
  const allRows = [];
  while ((idx = sqlText.indexOf(marker, idx)) !== -1) {
    const valuesIdx = sqlText.indexOf('VALUES', idx);
    const endIdx = sqlText.indexOf(';\n', valuesIdx);
    const valuesText = sqlText.substring(valuesIdx + 6, endIdx !== -1 ? endIdx : sqlText.length);

    let inString = false, escape = false, currentTuple = null, currentField = '';
    for (let i = 0; i < valuesText.length; i++) {
      const ch = valuesText[i];
      if (escape) { currentField += ch; escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === "'") { inString = !inString; continue; }
      if (!inString) {
        if (ch === '(') { currentTuple = []; currentField = ''; continue; }
        else if (ch === ',') { if (currentTuple) { currentTuple.push(cleanVal(currentField)); currentField = ''; } continue; }
        else if (ch === ')') { if (currentTuple) { currentTuple.push(cleanVal(currentField)); allRows.push(currentTuple); currentTuple = null; currentField = ''; } continue; }
      }
      currentField += ch;
    }
    idx = endIdx !== -1 ? endIdx : idx + marker.length;
  }
  return allRows;
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === 'NULL' || dateStr.startsWith('0000-00-00')) return null;
  const clean = dateStr.trim();
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : clean;
}

async function run() {
  console.log('=== MEMULAI INGEST SURAT KENDARAAN (trans_mstr_unit_surat) KE DMS ===\n');

  // 1. Pastikan Doc Types Lengkap di dms.m_doc_type
  console.log('1. Memeriksa & mendaftarkan tipe dokumen armada di dms.m_doc_type...');
  await sql`
    INSERT INTO dms.m_doc_type (code, name, description, is_active)
    VALUES
      ('PAJAK_STNK', 'Pajak STNK Tahunan', 'Surat Ketetapan Pajak Daerah & Tanda Bukti Pelunasan Kewajiban Pembayaran STNK', true),
      ('KIU', 'Kartu Izin Usaha / Trayek', 'Kartu Izin Penyelenggaraan Angkutan Barang Khusus / Trayek Dishub', true),
      ('IBM', 'Izin Bongkar Muat', 'Surat Izin Bongkar Muat / Masuk Kawasan Khusus Pelabuhan / Industri', true),
      ('UJI_EMISI', 'Sertifikat Uji Emisi', 'Sertifikat / Tanda Bukti Hasil Pengujian Emisi Gas Buang Kendaraan', true)
    ON CONFLICT (code) DO NOTHING;
  `;

  const allDocTypes = await sql`SELECT id, code, name FROM dms.m_doc_type;`;
  const docTypeUuidMap = new Map();
  allDocTypes.forEach(dt => docTypeUuidMap.set(dt.code, dt.id));

  const docTypeMapping = {
    'STNK': docTypeUuidMap.get('STNK'),
    'Pajak STNK': docTypeUuidMap.get('PAJAK_STNK'),
    'KIR': docTypeUuidMap.get('KIR'),
    'KIU': docTypeUuidMap.get('KIU'),
    'Ijin B3': docTypeUuidMap.get('IZIN_B3'),
    'IBM': docTypeUuidMap.get('IBM'),
    'Uji Emisi': docTypeUuidMap.get('UJI_EMISI')
  };

  const titlePrefix = {
    'STNK': 'STNK',
    'Pajak STNK': 'Pajak STNK',
    'KIR': 'Uji Berkala (KIR)',
    'KIU': 'Kartu Izin Usaha (KIU)',
    'Ijin B3': 'Izin Pengangkutan B3',
    'IBM': 'Izin Bongkar Muat (IBM)',
    'Uji Emisi': 'Sertifikat Uji Emisi'
  };

  // 2. Ambil Master Unit dari fleet.unit
  console.log('2. Memuat master unit dari PostgreSQL fleet.unit...');
  const pgUnits = await sql`
    SELECT id, nomor_unit, nomor_unit_lama, no_lambung, no_rangka, no_mesin, no_uji, no_bpkb 
    FROM fleet.unit;
  `;
  const pgByNopol = new Map();
  const pgByRangka = new Map();
  const pgByMesin = new Map();
  const pgByLambung = new Map();

  for (const p of pgUnits) {
    const n = (p.nomor_unit || '').replace(/\s+/g, '').toUpperCase();
    const r = (p.no_rangka || '').replace(/\s+/g, '').toUpperCase();
    const m = (p.no_mesin || '').replace(/\s+/g, '').toUpperCase();
    const l = (p.no_lambung || '').replace(/\s+/g, '').toUpperCase();
    if (n) pgByNopol.set(n, p);
    if (r) pgByRangka.set(r, p);
    if (m) pgByMesin.set(m, p);
    if (l) pgByLambung.set(l, p);
  }

  // 3. Baca db/units.sql dan petakan trans_mstr_unit ke fleet.unit
  console.log('3. Membaca db/units.sql dan memetakan unit legacy ke fleet.unit...');
  const content = fs.readFileSync('db/units.sql', 'latin1');
  const sqlUnits = parseSqlInsert(content, 'trans_mstr_unit');

  const legacyIdToPgUnit = new Map();
  for (const u of sqlUnits) {
    const legacyId = u[0];
    const nopol = (u[1] || '').replace(/\s+/g, '').toUpperCase();
    const rangka = (u[22] || '').replace(/\s+/g, '').toUpperCase();
    const mesin = (u[23] || '').replace(/\s+/g, '').toUpperCase();
    const lambung = (u[21] || '').replace(/\s+/g, '').toUpperCase();

    let target = null;
    if (nopol && pgByNopol.has(nopol)) target = pgByNopol.get(nopol);
    else if (rangka && pgByRangka.has(rangka)) target = pgByRangka.get(rangka);
    else if (mesin && pgByMesin.has(mesin)) target = pgByMesin.get(mesin);
    else if (lambung && pgByLambung.has(lambung)) target = pgByLambung.get(lambung);

    if (target) legacyIdToPgUnit.set(legacyId, target);
  }
  console.log(`   ✓ Berhasil memetakan ${legacyIdToPgUnit.size} dari ${sqlUnits.length} master unit.`);

  // 4. Parse trans_mstr_unit_surat
  console.log('4. Memproses berkas surat aktif (is_current=Y) dari trans_mstr_unit_surat...');
  const suratRows = parseSqlInsert(content, 'trans_mstr_unit_surat');
  const activeSurat = suratRows.filter(r => r[13] === 'Y' && r[2] !== 'Photo');
  console.log(`   ✓ Total baris surat legalitas aktif: ${activeSurat.length}`);

  // 5. Cek ID yang sudah ada di database untuk Idempotensi
  const existingDocs = await sql`
    SELECT (metadata->>'legacy_id')::int as legacy_id
    FROM dms.documents 
    WHERE metadata->>'legacy_source' = 'trans_mstr_unit_surat';
  `;
  const existingLegacyIds = new Set(existingDocs.map(d => d.legacy_id));
  console.log(`   ✓ Dokumen unit_surat yang sudah ada di DB: ${existingLegacyIds.size}`);

  const today = new Date();
  const sixtyDaysAhead = new Date();
  sixtyDaysAhead.setDate(today.getDate() + 60);

  const docsToInsert = [];
  let skippedExisting = 0;
  let unmappedUnits = 0;

  for (const r of activeSurat) {
    const legacyId = parseInt(r[0]);
    if (existingLegacyIds.has(legacyId)) {
      skippedExisting++;
      continue;
    }

    const legacyUnitId = r[1];
    const jenis = r[2];
    const rawNoDoc = r[3];
    const expDate = parseDate(r[4]);
    const att3 = r[7] && r[7] !== 'NULL' ? r[7].trim() : null;
    const createUser = r[9] && r[9] !== 'NULL' ? r[9].trim() : 'system';
    const createDate = parseDate(r[10]) || new Date();
    const modifyUser = r[11] && r[11] !== 'NULL' ? r[11].trim() : null;
    const modifyDate = parseDate(r[12]) || createDate;
    const pic = r[14] && r[14] !== 'NULL' ? r[14].trim() : null;

    const u = legacyIdToPgUnit.get(legacyUnitId);
    if (!u) {
      unmappedUnits++;
      continue;
    }

    const docTypeId = docTypeMapping[jenis];
    if (!docTypeId) {
      console.warn(`Doc type ID tidak ditemukan untuk jenis: ${jenis}`);
      continue;
    }

    let docNumber = rawNoDoc || null;
    if (!docNumber && jenis === 'KIR' && u.no_uji) {
      docNumber = u.no_uji;
    }

    let status = 'ACTIVE';
    if (expDate) {
      const d = new Date(expDate);
      if (d < today) status = 'EXPIRED';
      else if (d <= sixtyDaysAhead) status = 'EXPIRING_SOON';
      else status = 'ACTIVE';
    }

    const prefix = titlePrefix[jenis] || jenis;
    const title = `${prefix} - Unit ${u.nomor_unit}`;
    const qrCode = `BCS-DMS-SRT-${String(legacyId).padStart(5, '0')}`;

    const metadata = {
      legacy_source: 'trans_mstr_unit_surat',
      legacy_id: legacyId,
      legacy_unit_id: parseInt(legacyUnitId),
      jenis_surat: jenis,
      unit_number: u.nomor_unit,
      nomor_unit_lama: u.nomor_unit_lama || null,
      legacy_audit: {
        created_user: createUser,
        created_date: createDate,
        modified_user: modifyUser,
        modified_date: modifyDate
      },
      pic,
      attachment_1: r[5] !== 'NULL' ? r[5] : null,
      attachment_2: r[6] !== 'NULL' ? r[6] : null,
      attachment_3: att3
    };

    docsToInsert.push({
      doc_number: docNumber,
      doc_type_id: docTypeId,
      title,
      entity_type: 'FLEET',
      asset_id: String(u.id),
      expiry_date: expDate,
      status,
      physical_status: 'IN_STORAGE',
      current_version: 1,
      qr_code_id: qrCode,
      file_path: att3,
      company_id: 'd9639ef9-e184-45b6-a35a-0a3645b1ca35',
      metadata,
      created_at: createDate,
      updated_at: modifyDate,
      created_by: createUser
    });
  }

  console.log(`   ✓ Dokumen baru yang siap di-insert: ${docsToInsert.length}`);
  console.log(`   (Sudah ada: ${skippedExisting}, Unit unmapped: ${unmappedUnits})`);

  // 6. Batch Insert ke dms.documents
  if (docsToInsert.length > 0) {
    const batchSize = 100;
    let insertedTotal = 0;
    for (let i = 0; i < docsToInsert.length; i += batchSize) {
      const batch = docsToInsert.slice(i, i + batchSize);
      await sql`
        INSERT INTO dms.documents ${sql(
          batch,
          'doc_number',
          'doc_type_id',
          'title',
          'entity_type',
          'asset_id',
          'expiry_date',
          'status',
          'physical_status',
          'current_version',
          'qr_code_id',
          'file_path',
          'company_id',
          'metadata',
          'created_at',
          'updated_at',
          'created_by'
        )}
      `;
      insertedTotal += batch.length;
      process.stdout.write(`\r   Menginsert... ${insertedTotal}/${docsToInsert.length} berkas`);
    }
    console.log(`\n✓ Selesai menginsert ${insertedTotal} dokumen ke dms.documents.`);
  }

  // 7. Verifikasi Hasil Akhir
  const [{ count: totalDocs }] = await sql`SELECT count(*) FROM dms.documents;`;
  const [{ count: fleetDocs }] = await sql`SELECT count(*) FROM dms.documents WHERE entity_type = 'FLEET';`;
  const typeCounts = await sql`
    SELECT dt.name, dt.code, count(*) as count
    FROM dms.documents d
    JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
    WHERE d.entity_type = 'FLEET'
    GROUP BY dt.name, dt.code
    ORDER BY count DESC;
  `;

  console.log('\n=== STATISTIK DOKUMEN FLEET PASCA MIGRASI ===');
  console.log(`Total Semua Dokumen di DMS: ${totalDocs}`);
  console.log(`Total Dokumen Armada (FLEET): ${fleetDocs}`);
  console.log('\nRincian per Tipe Dokumen Armada:');
  console.table(typeCounts);

  // Verifikasi khusus Unit 801 (A9176R)
  const a9176Docs = await sql`
    SELECT d.id, dt.name as doc_type, d.title, d.doc_number, to_char(d.expiry_date, 'YYYY-MM-DD') as expiry, d.status, d.file_path
    FROM dms.documents d
    JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
    WHERE d.asset_id = '801'
    ORDER BY dt.name;
  `;
  console.log('\nDokumen untuk Unit A9176R (ID 801):');
  console.table(a9176Docs);

  process.exit(0);
}

run().catch(err => {
  console.error('Error migrasi:', err);
  process.exit(1);
});
