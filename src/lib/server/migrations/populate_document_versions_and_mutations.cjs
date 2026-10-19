const postgres = require('postgres');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

async function run() {
  console.log('=== MEMULAI POPULASI RIWAYAT VERSI DOKUMEN & MUTASI NOPOL ARMADA ===\n');

  // 1. Ambil seluruh unit yang memiliki nomor_unit_lama valid
  console.log('1. Memuat unit armada yang memiliki riwayat nopol lama (mutasi)...');
  const unitsWithOld = await sql`
    SELECT id, nomor_unit, nomor_unit_lama, no_rangka, no_mesin, created_at, created_by, updated_at, updated_by
    FROM fleet.unit
    WHERE nomor_unit_lama IS NOT NULL 
      AND trim(nomor_unit_lama) != '' 
      AND trim(nomor_unit_lama) != '-'
      AND trim(nomor_unit_lama) != nomor_unit;
  `;
  console.log(`   ✓ Ditemukan ${unitsWithOld.length} unit armada yang mengalami mutasi plat nomor.`);

  const unitMap = new Map();
  unitsWithOld.forEach(u => unitMap.set(String(u.id), u));
  const mutatedUnitIds = new Set(unitsWithOld.map(u => String(u.id)));

  // 2. Ambil snapshot versi yang sudah ada di dms.document_versions
  console.log('2. Memeriksa riwayat versi yang sudah ada di dms.document_versions...');
  const existingVersions = await sql`SELECT document_id, version_number FROM dms.document_versions;`;
  const existingVersionKey = new Set(existingVersions.map(v => `${v.document_id}_v${v.version_number}`));
  console.log(`   ✓ Ditemukan ${existingVersions.length} versi yang sudah ada.`);

  // 3. Ambil seluruh dokumen di dms.documents
  console.log('3. Memuat seluruh dokumen dari dms.documents...');
  const allDocs = await sql`
    SELECT 
      d.id, d.doc_number, d.title, d.entity_type, d.asset_id, 
      d.issue_date, d.expiry_date, d.file_path, d.current_version,
      d.metadata, d.created_at, d.created_by, d.updated_at,
      dt.code as doc_type_code, dt.name as doc_type_name
    FROM dms.documents d
    JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id;
  `;
  console.log(`   ✓ Total dokumen: ${allDocs.length}`);

  const versionsToInsert = [];
  const docsToUpdateVersion2 = [];

  for (const d of allDocs) {
    const isMutatedUnit = d.asset_id && mutatedUnitIds.has(String(d.asset_id));

    if (isMutatedUnit) {
      const u = unitMap.get(String(d.asset_id));
      const oldPlate = u.nomor_unit_lama.trim();
      const newPlate = u.nomor_unit.trim();

      // Buat v1 (Nopol Lama) jika belum ada
      if (!existingVersionKey.has(`${d.id}_v1`)) {
        let v1Title = d.title.replace(new RegExp(newPlate, 'gi'), oldPlate);
        if (!v1Title.includes(oldPlate)) {
          v1Title = `${d.doc_type_name} - Unit ${oldPlate}`;
        }
        if (d.doc_type_code === 'BPKB') {
          v1Title = `BPKB - ${oldPlate} - (${d.metadata?.brand_name || 'Kendaraan'})`;
        }

        // Cari file pindaian lama jika tersimpan di metadata
        let v1File = d.file_path;
        if (d.metadata?.attachment_3 && d.metadata.attachment_3.includes(oldPlate)) {
          v1File = d.metadata.attachment_3;
        }

        versionsToInsert.push({
          document_id: d.id,
          version_number: 1,
          doc_number: d.doc_number,
          title: v1Title,
          issue_date: d.issue_date || u.created_at || '2016-01-08',
          expiry_date: d.expiry_date,
          file_path: v1File,
          change_summary: `Registrasi Awal Kendaraan (Nomor Polisi Lama: ${oldPlate})`,
          metadata: {
            stage: 'INITIAL_REGISTRATION',
            unit_plate: oldPlate,
            unit_id: u.id,
            brand_name: d.metadata?.brand_name || null
          },
          created_at: u.created_at || d.created_at,
          created_by: u.created_by || d.created_by || 'system'
        });
      }

      // Buat v2 (Nopol Baru Terkini - Aktif) jika belum ada
      if (!existingVersionKey.has(`${d.id}_v2`)) {
        versionsToInsert.push({
          document_id: d.id,
          version_number: 2,
          doc_number: d.doc_number,
          title: d.title,
          issue_date: d.issue_date,
          expiry_date: d.expiry_date,
          file_path: d.file_path,
          change_summary: `Mutasi / Perubahan Nomor Polisi dari ${oldPlate} ke ${newPlate}`,
          metadata: {
            stage: 'PLATE_MUTATION',
            previous_plate: oldPlate,
            current_plate: newPlate,
            unit_id: u.id,
            brand_name: d.metadata?.brand_name || null
          },
          created_at: u.updated_at || d.updated_at || d.created_at,
          created_by: u.updated_by || 'Joni Sutopo'
        });
      }

      docsToUpdateVersion2.push(d.id);

    } else {
      // Dokumen non-mutasi: buatkan baseline v1 jika belum ada
      if (!existingVersionKey.has(`${d.id}_v1`)) {
        versionsToInsert.push({
          document_id: d.id,
          version_number: 1,
          doc_number: d.doc_number,
          title: d.title,
          issue_date: d.issue_date,
          expiry_date: d.expiry_date,
          file_path: d.file_path,
          change_summary: 'Registrasi Dokumen Legalitas Awal',
          metadata: d.metadata || {},
          created_at: d.created_at,
          created_by: d.created_by || 'system'
        });
      }
    }
  }

  console.log(`\n4. Mempersiapkan batch insert ${versionsToInsert.length} baris riwayat versi...`);

  // Batch insert ke dms.document_versions
  if (versionsToInsert.length > 0) {
    const batchSize = 250;
    let insertedTotal = 0;
    for (let i = 0; i < versionsToInsert.length; i += batchSize) {
      const batch = versionsToInsert.slice(i, i + batchSize);
      await sql`
        INSERT INTO dms.document_versions ${sql(
          batch,
          'document_id',
          'version_number',
          'doc_number',
          'title',
          'issue_date',
          'expiry_date',
          'file_path',
          'change_summary',
          'metadata',
          'created_at',
          'created_by'
        )}
      `;
      insertedTotal += batch.length;
      process.stdout.write(`\r   Menginsert versi... ${insertedTotal}/${versionsToInsert.length}`);
    }
    console.log(`\n   ✓ Berhasil menginsert ${insertedTotal} record ke dms.document_versions.`);
  }

  // Update current_version = 2 untuk unit armada mutasi
  if (docsToUpdateVersion2.length > 0) {
    console.log(`5. Memperbarui current_version = 2 untuk ${docsToUpdateVersion2.length} dokumen mutasi...`);
    const batchSize = 250;
    for (let i = 0; i < docsToUpdateVersion2.length; i += batchSize) {
      const batch = docsToUpdateVersion2.slice(i, i + batchSize);
      await sql`
        UPDATE dms.documents 
        SET current_version = 2, updated_at = CURRENT_TIMESTAMP
        WHERE id IN ${sql(batch)};
      `;
    }
    console.log(`   ✓ Berhasil memperbarui current_version.`);
  }

  // 6. Verifikasi Statistik Akhir
  const [{ count: totalVersions }] = await sql`SELECT count(*) FROM dms.document_versions;`;
  const v2Count = await sql`SELECT count(*) FROM dms.document_versions WHERE version_number = 2;`;

  console.log('\n=== STATISTIK RIWAYAT VERSI PASCA POPULASI ===');
  console.log(`Total Versi Tersimpan di dms.document_versions: ${totalVersions}`);
  console.log(`Total Dokumen Bermutasi (Mempunyai v1 & v2): ${v2Count[0].count}`);

  // Cek spesifik Unit A9732TX (ID 489)
  const a9732Versions = await sql`
    SELECT v.version_number, v.doc_number, v.title, v.change_summary, v.file_path, to_char(v.created_at, 'YYYY-MM-DD') as date
    FROM dms.document_versions v
    JOIN dms.documents d ON d.id = v.document_id
    WHERE d.asset_id = '489'
    ORDER BY d.title, v.version_number ASC;
  `;
  console.log('\nSampel Riwayat Versi Unit A9732TX (Eks A9078Y):');
  console.table(a9732Versions.slice(0, 10));

  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
