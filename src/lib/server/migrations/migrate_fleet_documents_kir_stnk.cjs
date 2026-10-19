const postgres = require('postgres');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

async function run() {
  console.log('=== MEMULAI STANDARISASI DOKUMEN ARMADA: KIR, STNK & HARMONISASI BPKB ===');

  // 1. Ambil Doc Type KIR & STNK
  const [kirDocType] = await sql`SELECT id, code, name FROM dms.m_doc_type WHERE code = 'KIR' LIMIT 1`;
  const [stnkDocType] = await sql`SELECT id, code, name FROM dms.m_doc_type WHERE code = 'STNK' LIMIT 1`;
  const [bpkbDocType] = await sql`SELECT id, code, name FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1`;

  if (!kirDocType || !stnkDocType) {
    throw new Error('Doc Type KIR atau STNK tidak ditemukan di dms.m_doc_type');
  }

  // 2. Ambil Lokasi Fisik RAK-A1 (Lemari A - Rak 1: Dokumen Kendaraan)
  const [rakA1] = await sql`SELECT id FROM dms.m_filing_location WHERE code = 'RAK-A1' LIMIT 1`;

  // 3. Hapus 2 Record Dummy Seed Awal (B 9012 BCS di unit 801)
  const deletedSeeds = await sql`
    DELETE FROM dms.documents 
    WHERE id IN ('e88af2b1-5a5f-46e1-9a5d-1503bd99aa75', '08f49223-5b8a-4598-a2df-755ca672f2b1')
    RETURNING id, doc_number, title;
  `;
  console.log(`✓ 1. Membersihkan ${deletedSeeds.length} data seed mockup lama (B 9012 BCS).`);

  // 4. Harmonisasi Judul 43 Berkas BPKB yang Menggunakan Plat Lama
  const bpkbToFix = await sql`
    SELECT 
      d.id, 
      d.title as current_title, 
      u.nomor_unit, 
      u.nomor_unit_lama,
      d.metadata->>'brand_name' as brand_name
    FROM dms.documents d
    JOIN fleet.unit u ON d.asset_id = u.id
    WHERE d.doc_type_id = ${bpkbDocType.id}
      AND u.nomor_unit_lama IS NOT NULL 
      AND TRIM(u.nomor_unit_lama) != ''
      AND d.title ILIKE '%' || TRIM(u.nomor_unit_lama) || '%'
      AND d.title NOT ILIKE '%' || TRIM(u.nomor_unit) || '%';
  `;

  let bpkbUpdated = 0;
  for (const b of bpkbToFix) {
    const brand = b.brand_name || 'Kendaraan';
    const newTitle = `BPKB - ${b.nomor_unit} (Eks ${b.nomor_unit_lama}) - (${brand})`;
    await sql`
      UPDATE dms.documents
      SET title = ${newTitle},
          updated_at = NOW()
      WHERE id = ${b.id};
    `;
    bpkbUpdated++;
  }
  console.log(`✓ 2. Berhasil mengharmonisasi ${bpkbUpdated} judul BPKB plat lama dengan plat aktif.`);

  // 5. Ambil 141 Unit Aktif dari fleet.unit
  const activeUnits = await sql`
    SELECT id, nomor_unit, nomor_unit_lama, no_rangka, no_mesin, no_bpkb, no_uji, plat_color, business_unit, expire_date_asuransi, tahun
    FROM fleet.unit
    WHERE is_active = true
    ORDER BY nomor_unit;
  `;
  console.log(`\n--- Memproses 141 Unit Armada Aktif untuk Penerbitan KIR & STNK ---`);

  let kirCreated = 0, kirUpdated = 0;
  let stnkCreated = 0, stnkUpdated = 0;

  for (const u of activeUnits) {
    const unitPlate = u.nomor_unit.trim();
    const unitId = u.id;

    // --- A. DOKUMEN KIR (Buku Uji Berkala Dishub) ---
    if (u.no_uji && u.no_uji.trim() !== '') {
      const kirNo = u.no_uji.trim();
      const kirTitle = `Buku Uji Berkala (KIR) Dishub - Unit ${unitPlate}`;
      const kirQr = `BCS-DMS-KIR-${unitId}`;
      const kirMeta = {
        legacy_source: 'fleet.unit',
        nomor_unit: unitPlate,
        nomor_unit_lama: u.nomor_unit_lama || null,
        no_uji: kirNo,
        no_rangka: u.no_rangka || null,
        no_mesin: u.no_mesin || null,
        plat_color: u.plat_color || null,
        business_unit: u.business_unit || null,
        notes: `Buku Uji Berkala Dishub untuk unit ${unitPlate} (${u.business_unit || 'Armada Logistik'}). No Uji: ${kirNo}.`
      };

      const existingKir = await sql`
        SELECT id FROM dms.documents 
        WHERE doc_type_id = ${kirDocType.id} AND asset_id = ${unitId}
        LIMIT 1;
      `;

      if (existingKir.length > 0) {
        await sql`
          UPDATE dms.documents
          SET doc_number = ${kirNo},
              title = ${kirTitle},
              metadata = ${sql.json(kirMeta)},
              filing_location_id = ${rakA1?.id || null},
              physical_status = 'IN_STORAGE',
              status = 'ACTIVE',
              updated_at = NOW()
          WHERE id = ${existingKir[0].id};
        `;
        kirUpdated++;
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
            notes,
            metadata,
            created_at,
            updated_at,
            created_by
          ) VALUES (
            ${kirNo},
            ${kirDocType.id},
            ${kirTitle},
            'FLEET',
            ${unitId},
            ${rakA1?.id || null},
            'IN_STORAGE',
            'ACTIVE',
            1,
            ${kirQr},
            ${kirMeta.notes},
            ${sql.json(kirMeta)},
            NOW(),
            NOW(),
            'SYSTEM_MIGRATION'
          );
        `;
        kirCreated++;
      }
    }

    // --- B. DOKUMEN STNK (Surat Tanda Nomor Kendaraan) ---
    const stnkDocNo = `STNK-${unitPlate}`;
    const stnkTitle = `STNK Kendaraan - Unit ${unitPlate}`;
    const stnkQr = `BCS-DMS-STNK-${unitId}`;
    const stnkMeta = {
      legacy_source: 'fleet.unit',
      nomor_unit: unitPlate,
      nomor_unit_lama: u.nomor_unit_lama || null,
      no_bpkb: u.no_bpkb || null,
      no_rangka: u.no_rangka || null,
      no_mesin: u.no_mesin || null,
      plat_color: u.plat_color || null,
      tahun: u.tahun || null,
      business_unit: u.business_unit || null,
      notes: `STNK Kendaraan Bermotor untuk armada operasional ${unitPlate} (${u.business_unit || 'Armada Logistik'}). No Rangka: ${u.no_rangka || '-'}. No Mesin: ${u.no_mesin || '-'}.`
    };

    const existingStnk = await sql`
      SELECT id FROM dms.documents 
      WHERE doc_type_id = ${stnkDocType.id} AND asset_id = ${unitId}
      LIMIT 1;
    `;

    if (existingStnk.length > 0) {
      await sql`
        UPDATE dms.documents
        SET doc_number = ${stnkDocNo},
            title = ${stnkTitle},
            metadata = ${sql.json(stnkMeta)},
            filing_location_id = ${rakA1?.id || null},
            physical_status = 'IN_STORAGE',
            status = 'ACTIVE',
            updated_at = NOW()
        WHERE id = ${existingStnk[0].id};
      `;
      stnkUpdated++;
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
          notes,
          metadata,
          created_at,
          updated_at,
          created_by
        ) VALUES (
          ${stnkDocNo},
          ${stnkDocType.id},
          ${stnkTitle},
          'FLEET',
          ${unitId},
          ${rakA1?.id || null},
          'IN_STORAGE',
          'ACTIVE',
          1,
          ${stnkQr},
          ${stnkMeta.notes},
          ${sql.json(stnkMeta)},
          NOW(),
          NOW(),
          'SYSTEM_MIGRATION'
        );
      `;
      stnkCreated++;
    }
  }

  console.log(`✓ 3. Dokumen KIR Dishub: ${kirCreated} baru dibuat, ${kirUpdated} diperbarui.`);
  console.log(`✓ 4. Dokumen STNK Kendaraan: ${stnkCreated} baru dibuat, ${stnkUpdated} diperbarui.`);

  // 6. Verifikasi Statistik Akhir
  const [{ count: totalFleetDocs }] = await sql`SELECT count(*) FROM dms.documents WHERE entity_type = 'FLEET';`;
  const [{ count: totalKir }] = await sql`SELECT count(*) FROM dms.documents WHERE doc_type_id = ${kirDocType.id};`;
  const [{ count: totalStnk }] = await sql`SELECT count(*) FROM dms.documents WHERE doc_type_id = ${stnkDocType.id};`;
  const [{ count: totalBpkb }] = await sql`SELECT count(*) FROM dms.documents WHERE doc_type_id = ${bpkbDocType.id};`;

  console.log('\n=== STATISTIK DOKUMEN ARMADA PASCA STANDARISASI ===');
  console.log(`Total Dokumen Armada (FLEET): ${totalFleetDocs} berkas`);
  console.log(`- BPKB Kendaraan: ${totalBpkb} berkas`);
  console.log(`- KIR Dishub: ${totalKir} berkas`);
  console.log(`- STNK Kendaraan: ${totalStnk} berkas`);

  // Verifikasi Unit 801 (A9176R)
  const unit801Docs = await sql`
    SELECT d.doc_number, d.title, t.code as type_code
    FROM dms.documents d
    JOIN dms.m_doc_type t ON d.doc_type_id = t.id
    WHERE d.asset_id = 801;
  `;
  console.log('\nDokumen Unit 801 (A9176R) Terkini:');
  console.log(unit801Docs);

  process.exit(0);
}

run().catch(err => {
  console.error('Error saat eksekusi:', err);
  process.exit(1);
});
