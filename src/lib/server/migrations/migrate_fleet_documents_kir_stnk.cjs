const postgres = require('postgres');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

async function run() {
  console.log('=== MEMULAI HARMONISASI DOKUMEN ARMADA & RESTORASI KE DATA ASLI LAMA ===');

  // 1. Ambil Doc Type BPKB
  const [bpkbDocType] = await sql`SELECT id, code, name FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1`;

  // 2. Hapus 2 Record Dummy Seed Awal (B 9012 BCS di unit 801)
  const deletedSeeds = await sql`
    DELETE FROM dms.documents 
    WHERE id IN ('e88af2b1-5a5f-46e1-9a5d-1503bd99aa75', '08f49223-5b8a-4598-a2df-755ca672f2b1')
    RETURNING id, doc_number, title;
  `;
  console.log(`✓ 1. Membersihkan ${deletedSeeds.length} data seed mockup lama (B 9012 BCS).`);

  // 3. Hapus Dokumen STNK & KIR Hasil Generate agar kembali murni 100% ke data fisik lama
  const deletedGen = await sql`
    DELETE FROM dms.documents
    WHERE metadata->>'legacy_source' = 'fleet.unit'
    RETURNING id, doc_number, title;
  `;
  console.log(`✓ 2. Membersihkan ${deletedGen.length} dokumen STNK & KIR hasil generate (kembali murni ke data fisik lama).`);

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
  console.log(`✓ 3. Berhasil mengharmonisasi ${bpkbUpdated} judul BPKB plat lama dengan plat aktif.`);

  // 5. Verifikasi Statistik Akhir
  const [{ count: totalFleetDocs }] = await sql`SELECT count(*) FROM dms.documents WHERE entity_type = 'FLEET';`;
  const [{ count: totalBpkb }] = await sql`SELECT count(*) FROM dms.documents WHERE doc_type_id = ${bpkbDocType.id};`;

  console.log('\n=== STATISTIK DOKUMEN ARMADA PASCA RESTORASI ===');
  console.log(`Total Dokumen Armada (FLEET): ${totalFleetDocs} berkas`);
  console.log(`- BPKB Kendaraan Asli: ${totalBpkb} berkas`);

  process.exit(0);
}

run().catch(err => {
  console.error('Error saat eksekusi:', err);
  process.exit(1);
});
