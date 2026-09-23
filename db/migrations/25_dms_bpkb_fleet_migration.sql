-- Migration 25: Direct Migration of bpkb_brand.sql into dms.documents & fleet.unit
-- Generated Idempotent Migration Script
-- Date: 2026-09-22

-- 0. Allow non-unique doc_number across different documents (identified by UUID id)
ALTER TABLE dms.documents DROP CONSTRAINT IF EXISTS documents_doc_number_key;
CREATE INDEX IF NOT EXISTS idx_documents_doc_number ON dms.documents (doc_number);

-- 1. Insert filing locations for BPKB
INSERT INTO dms.m_filing_location (code, name, description, is_active)
VALUES
  ('LOC-LEAS-CIMB', 'CIMB Niaga', 'Lembaga Pembiayaan / Leasing BPKB (CIMB Niaga)', true),
  ('LOC-LEAS-DIPO', 'Dipo Star Finance', 'Lembaga Pembiayaan / Leasing BPKB (Dipo Star Finance)', true),
  ('LOC-LEAS-MTF', 'Mandiri Tunas Finance', 'Lembaga Pembiayaan / Leasing BPKB (Mandiri Tunas Finance)', true),
  ('LOC-LEAS-MUFJ', 'Mitshubishi UFJ Lease & Finance', 'Lembaga Pembiayaan / Leasing BPKB (MUFJ)', true),
  ('LOC-DEPT-LEGAL', 'Legal Dept - PT Buana Centra Swakarsa', 'Penyimpanan Internal Legal Dept BCS', true),
  ('LOC-LEAS-SMFL', 'SMFL Leasing Indonesia', 'Lembaga Pembiayaan / Leasing BPKB (SMFL)', true),
  ('LOC-NOT-AVAIL', 'Not-Available', 'Lokasi BPKB Tidak Tersedia / Belum Terdata', true),
  ('LOC-BANK-BPRS', 'BPRS Muamalah', 'Bank / Lembaga Pembiayaan (BPRS Muamalah)', true),
  ('LOC-DEPT-AUDIT', 'Internal Audit Dept - PT Buana Centra Swakarsa', 'Penyimpanan Internal Audit Dept BCS', true),
  ('LOC-DISPOSAL', 'Disposal Asset', 'Arsip Dokumen Unit Disposal / Afkir', true),
  ('LOC-BRANKAS-HO', 'Brankas Office', 'Brankas Besi Tahan Api Kantor Pusat', true),
  ('LOC-SAMSAT', 'Samsat-Polres', 'Proses Pengurusan Samsat / Polres', true),
  ('LOC-BANK-BPR', 'Bank BPR Hariarta Sedana Tangerang', 'Bank / Penjamin BPR Hariarta Sedana', true),
  ('LOC-KPP-TAX', 'KPP Pajak Madya 2 Tangerang', 'Penjaminan / Keperluan KPP Pajak Madya 2', true),
  ('LOC-LEAS-MNC', 'MNC Finance Serang', 'Lembaga Pembiayaan / Leasing BPKB (MNC Finance)', true),
  ('LOC-DIJUAL', 'Disposal/dijual', 'Arsip Unit yang Telah Dijual / Dilepas', true),
  ('LOC-DEPT-GA', 'GA', 'General Affairs Dept - PT Buana Centra Swakarsa', true)
ON CONFLICT (code) DO NOTHING;

-- 2. Migrate BPKB Documents into dms.documents

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-01460617',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9261VL - (Isuzu)',
  'FLEET',
  155,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-9',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_9261_VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":9,"no_polisi":"A9261VL","no_chasis":"MHCNH55EY5J012746","no_machine":"MO12746","brand_id":17,"brand_name":"Isuzu","cabinet_slot":"A2","production_year":2005,"acquisition_year":2005,"color_code":"16","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/47.0.2526.106 Chrome/47.0.2526.106 Safari/537.36","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"J-01460617"}'::jsonb,
  '2022-03-15'::timestamp,
  'Anggi Wijaya',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 9
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '01793755',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A1301VH - (Toyota)',
  'FLEET',
  689,
  '2024-03-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-11',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A_1301_VH.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":11,"no_polisi":"A1301VH","no_chasis":"MHKM1BA3JDK133983","no_machine":"MA88668","brand_id":7,"brand_name":"Toyota","cabinet_slot":"A1","production_year":2013,"acquisition_year":2013,"color_code":"2","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:26.0) Gecko/20100101 Firefox/26.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"01793755"}'::jsonb,
  '2024-03-08'::timestamp,
  'Bayu Herlambang',
  '2024-03-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 11
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793756',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A1302VH - (Toyota)',
  'FLEET',
  690,
  '2016-04-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-12',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_1302_VH.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":12,"no_polisi":"A1302VH","no_chasis":"MHKM1BA3JDK134003","no_machine":"MA87288","brand_id":7,"brand_name":"Toyota","cabinet_slot":"A1","production_year":2013,"acquisition_year":2013,"color_code":"2","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:26.0) Gecko/20100101 Firefox/26.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"K-01793756"}'::jsonb,
  '2016-04-15'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 12
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-4020359',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A2429UC - (Honda)',
  'FLEET',
  NULL,
  '2016-04-15'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-13',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_2429_UC.pdf',
  'Ownership Code: 4',
  '{"legacy_source":"bpkb_header","legacy_id":13,"no_polisi":"A2429UC","no_chasis":"MH1NFG00TTK000395","no_machine":"NFGE-1000436","brand_id":1,"brand_name":"Honda","cabinet_slot":"A1","production_year":1996,"acquisition_year":1996,"color_code":"1","ownership_code":"4","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:26.0) Gecko/20100101 Firefox/26.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"A-4020359"}'::jsonb,
  '2016-04-15'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 13
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-2064005',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A4264UB - (Honda)',
  'FLEET',
  NULL,
  '2016-04-15'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-15',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_4264_UB.pdf',
  'Ownership Code: 4',
  '{"legacy_source":"bpkb_header","legacy_id":15,"no_polisi":"A4264UB","no_chasis":"MH1NA000RRK102016","no_machine":"HAE-2201221","brand_id":1,"brand_name":"Honda","cabinet_slot":"A1","production_year":1994,"acquisition_year":1994,"color_code":"1","ownership_code":"4","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:26.0) Gecko/20100101 Firefox/26.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"A-2064005"}'::jsonb,
  '2016-04-15'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 15
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'I-11010058',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A4771U - (Suzuki)',
  'FLEET',
  NULL,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-18',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_4771_U.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":18,"no_polisi":"A4771U","no_chasis":"MH8RC100N1J-264500","no_machine":"E108-ID-264404","brand_id":15,"brand_name":"Suzuki","cabinet_slot":"A1","production_year":2001,"acquisition_year":2001,"color_code":"1","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:26.0) Gecko/20100101 Firefox/26.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"I-11010058"}'::jsonb,
  '2019-07-19'::timestamp,
  'Bayu Herlambang',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 18
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '7652249',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A5505UD - (Mahator)',
  'FLEET',
  NULL,
  '2016-04-15'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-19',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_5505_UD.pdf',
  'Ownership Code: 5',
  '{"legacy_source":"bpkb_header","legacy_id":19,"no_polisi":"A5505UD","no_chasis":"MHGTC2252VK-000183","no_machine":"9726070","brand_id":16,"brand_name":"Mahator","cabinet_slot":"A1","production_year":1999,"acquisition_year":1999,"color_code":"10","ownership_code":"5","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:26.0) Gecko/20100101 Firefox/26.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"7652249"}'::jsonb,
  '2016-04-15'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 19
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-7652250',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A5506UD - (Mahator)',
  'FLEET',
  NULL,
  '2016-04-15'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-20',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_5506_UD.pdf',
  'Ownership Code: 3',
  '{"legacy_source":"bpkb_header","legacy_id":20,"no_polisi":"A5506UD","no_chasis":"MHGTC2252VK-00809","no_machine":"9726534","brand_id":16,"brand_name":"Mahator","cabinet_slot":"A1","production_year":1999,"acquisition_year":1999,"color_code":"3","ownership_code":"3","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:26.0) Gecko/20100101 Firefox/26.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"A-7652250"}'::jsonb,
  '2016-04-15'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 20
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-2632421',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8117UC - (Mitshubishi)',
  'FLEET',
  216,
  '2020-05-05'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-21',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_8117_UC.pdf',
  'Ownership Code: 4',
  '{"legacy_source":"bpkb_header","legacy_id":21,"no_polisi":"A8117UC","no_chasis":"FM517H-034976","no_machine":"6D16C-516032","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A1","production_year":1994,"acquisition_year":1995,"color_code":"4","ownership_code":"4","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:26.0) Gecko/20100101 Firefox/26.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"A-2632421"}'::jsonb,
  '2020-05-05'::timestamp,
  'Bayu Herlambang',
  '2020-05-05'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 21
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-02730325',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8508Y/ A8629TZ - (Toyota)',
  'FLEET',
  223,
  '2022-09-20'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-22',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A8629TZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":22,"no_polisi":"A8508Y/ A8629TZ","no_chasis":"MHFC1JU41C5060311","no_machine":"B04GTPJ31290","brand_id":7,"brand_name":"Toyota","cabinet_slot":"A1","production_year":2012,"acquisition_year":2012,"color_code":"3","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:26.0) Gecko/20100101 Firefox/26.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"J-02730325"}'::jsonb,
  '2022-09-20'::timestamp,
  'Bayu Herlambang',
  '2022-09-20'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 22
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'F-0442578',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8679W/ A8976TZ - (Toyota)',
  'FLEET',
  442,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-24',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_8679_W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":24,"no_polisi":"A8679W/ A8976TZ","no_chasis":"MR0AW12G780008807","no_machine":"1TR-6525098","brand_id":7,"brand_name":"Toyota","cabinet_slot":"A1","production_year":2008,"acquisition_year":2008,"color_code":"1","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:26.0) Gecko/20100101 Firefox/26.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"F-0442578"}'::jsonb,
  '2019-07-19'::timestamp,
  'Bayu Herlambang',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 24
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'D-2447637',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8807V/A8023TX - (Isuzu)',
  'FLEET',
  480,
  '2023-12-13'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-25',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A8023TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":25,"no_polisi":"A8807V/A8023TX","no_chasis":"JUHC1BR54BSK12236","no_machine":"E122367","brand_id":17,"brand_name":"Isuzu","cabinet_slot":"A1","production_year":2005,"acquisition_year":2005,"color_code":"1","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:26.0) Gecko/20100101 Firefox/26.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"D-2447637"}'::jsonb,
  '2023-12-13'::timestamp,
  'Bayu Herlambang',
  '2023-12-13'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 25
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'I-07572322',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8847U - (Toyota)',
  'FLEET',
  159,
  '2016-04-15'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-26',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_8847_U.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":26,"no_polisi":"A8847U","no_chasis":"MHF31LF6010004481","no_machine":"2L-9663714","brand_id":7,"brand_name":"Toyota","cabinet_slot":"A1","production_year":2001,"acquisition_year":2001,"color_code":"1","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:26.0) Gecko/20100101 Firefox/26.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"I-07572322"}'::jsonb,
  '2016-04-15'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 26
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'I-07575349',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8861U - (Toyota)',
  'FLEET',
  192,
  '2016-04-15'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-28',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_8861_U.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":28,"no_polisi":"A8861U","no_chasis":"MHF31BY3410006220","no_machine":"14B-1662829","brand_id":7,"brand_name":"Toyota","cabinet_slot":"A1","production_year":2001,"acquisition_year":2001,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:26.0) Gecko/20100101 Firefox/26.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"I-07575349"}'::jsonb,
  '2016-04-15'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 28
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'I-06819192',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8916UC - (Toyota)',
  'FLEET',
  177,
  '2019-08-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-29',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A_8916_UC.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":29,"no_polisi":"A8916UC","no_chasis":"MHF31BY4300032940","no_machine":"14B-1494500","brand_id":7,"brand_name":"Toyota","cabinet_slot":"A1","production_year":1997,"acquisition_year":1997,"color_code":"3","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:26.0) Gecko/20100101 Firefox/26.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"I-06819192"}'::jsonb,
  '2019-08-09'::timestamp,
  'Bayu Herlambang',
  '2019-08-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 29
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'E-5253116',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9242W/ A9328TZ - (Mitshubishi)',
  'FLEET',
  160,
  '2019-08-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-30',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A_9242_W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":30,"no_polisi":"A9242W/ A9328TZ","no_chasis":"MHMFE74P47K003787","no_machine":"4D34T-C60761","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A1","production_year":2007,"acquisition_year":2007,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"E-5253116"}'::jsonb,
  '2019-08-09'::timestamp,
  'Bayu Herlambang',
  '2019-08-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 30
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01794572',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9284VL/A9415TZ - (Mitshubishi)',
  'FLEET',
  161,
  '2023-12-13'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-32',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9415TZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":32,"no_polisi":"A9284VL/A9415TZ","no_chasis":"MHMFE349E5R083826","no_machine":"4D34A57741","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A2","production_year":2005,"acquisition_year":2005,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-01794572"}'::jsonb,
  '2023-12-13'::timestamp,
  'Bayu Herlambang',
  '2023-12-13'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 32
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01794573',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9285VL - (Volvo)',
  'FLEET',
  62,
  '2016-04-15'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-33',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_9285_VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":33,"no_polisi":"A9285VL","no_chasis":"SCVF2B3D15C910133","no_machine":"268807","brand_id":9,"brand_name":"Volvo","cabinet_slot":"A2","production_year":1994,"acquisition_year":1995,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"K-01794573"}'::jsonb,
  '2016-04-15'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 33
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-04957547',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9336VL/A9823TZ - (Volvo)',
  'FLEET',
  63,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-34',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'BPKB_A9823TZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":34,"no_polisi":"A9336VL/A9823TZ","no_chasis":"YV2J4JMC81A533090","no_machine":"D12C237380A","brand_id":9,"brand_name":"Volvo","cabinet_slot":"A2","production_year":2001,"acquisition_year":2006,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-04957547"}'::jsonb,
  '2026-02-23'::timestamp,
  'Bayu Herlambang',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 34
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-04957551',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9337VL/A9822TZ - (Volvo)',
  'FLEET',
  657,
  '2024-05-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-35',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9822TZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":35,"no_polisi":"A9337VL/A9822TZ","no_chasis":"YV2JADMC91A532014","no_machine":"D12C234453A","brand_id":9,"brand_name":"Volvo","cabinet_slot":"A2","production_year":2001,"acquisition_year":2006,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-04957551"}'::jsonb,
  '2024-05-17'::timestamp,
  'Bayu Herlambang',
  '2024-05-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 35
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-04957548',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9338VL/A9821TZ - (Volvo)',
  'FLEET',
  238,
  '2024-05-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-36',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9821TZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":36,"no_polisi":"A9338VL/A9821TZ","no_chasis":"YV2J4DMC414524497","no_machine":"D12C21A383A","brand_id":9,"brand_name":"Volvo","cabinet_slot":"A2","production_year":2001,"acquisition_year":2005,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-04957548"}'::jsonb,
  '2024-05-17'::timestamp,
  'Bayu Herlambang',
  '2024-05-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 36
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-04652212',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9657W - (Volvo)',
  'FLEET',
  115,
  '2016-04-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-37',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_9657_W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":37,"no_polisi":"A9657W","no_chasis":"YV2J4CMC63A558177","no_machine":"D12.317212","brand_id":9,"brand_name":"Volvo","cabinet_slot":"A2","production_year":2003,"acquisition_year":2007,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"K-04652212"}'::jsonb,
  '2016-04-15'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 37
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-00280950',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9760W - (Mitshubishi)',
  'FLEET',
  143,
  '2016-04-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-38',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BANK-BPRS' LIMIT 1),
  'BPKB_A_9760_W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":38,"no_polisi":"A9760W","no_chasis":"MHMFE74P4CKO59461","no_machine":"4D34TH49878","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":null,"production_year":2012,"acquisition_year":2012,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"J-00280950"}'::jsonb,
  '2016-04-15'::timestamp,
  'Bayu Herlambang',
  '2016-06-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 38
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-00280951',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9761W/ A9312TZ - (Mitshubishi)',
  'FLEET',
  163,
  '2019-08-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-39',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A_9761_W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":39,"no_polisi":"A9761W/ A9312TZ","no_chasis":"MHMFE74P4CKO60845","no_machine":"4D34TH57818","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A2","production_year":2012,"acquisition_year":2012,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"J-00280951"}'::jsonb,
  '2019-08-09'::timestamp,
  'Bayu Herlambang',
  '2019-08-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 39
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-00280952',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9762W - (Mitshubishi)',
  'FLEET',
  164,
  '2016-04-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-40',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BANK-BPRS' LIMIT 1),
  'BPKB_A_9762_W_33d392hmewu84.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":40,"no_polisi":"A9762W","no_chasis":"MHMFE74PACK059433","no_machine":"4D34TH49891","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":null,"production_year":2012,"acquisition_year":2012,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"J-00280952"}'::jsonb,
  '2016-04-15'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 40
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-00280953',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9763W/ A9329TZ - (Mitshubishi)',
  'FLEET',
  165,
  '2019-08-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-41',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A_9763_W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":41,"no_polisi":"A9763W/ A9329TZ","no_chasis":"MHMFE74TACK059786","no_machine":"4D34TH42173","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A2","production_year":2012,"acquisition_year":2012,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"J-00280953"}'::jsonb,
  '2019-08-09'::timestamp,
  'Bayu Herlambang',
  '2019-08-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 41
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-00280954',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9764W - (Mitshubishi)',
  'FLEET',
  166,
  '2019-08-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-42',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A_9764_W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":42,"no_polisi":"A9764W","no_chasis":"MHMFE74T4CK059212","no_machine":"4D34TH37259","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A2","production_year":2012,"acquisition_year":2012,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"J-00280954"}'::jsonb,
  '2019-08-09'::timestamp,
  'Bayu Herlambang',
  '2019-08-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 42
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-00281845',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9771W/ A9311TZ - (Mitshubishi)',
  'FLEET',
  172,
  '2019-08-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-43',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A_9771_W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":43,"no_polisi":"A9771W/ A9311TZ","no_chasis":"MHMFE74P5CK076330","no_machine":"4D34TH64361","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A2","production_year":2012,"acquisition_year":2012,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"J-00281845"}'::jsonb,
  '2019-08-09'::timestamp,
  'Bayu Herlambang',
  '2019-08-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 43
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'C-00281846',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9772W - (Mitshubishi)',
  'FLEET',
  173,
  '2019-08-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-44',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A_9772_W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":44,"no_polisi":"A9772W","no_chasis":"MHMFE74P5CKO76167","no_machine":"4D34TH75366","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A2","production_year":2012,"acquisition_year":2012,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"C-00281846"}'::jsonb,
  '2019-08-09'::timestamp,
  'Bayu Herlambang',
  '2019-08-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 44
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'C-00281847',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9773W - (Mitshubishi)',
  'FLEET',
  181,
  '2019-08-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-45',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A_9773_W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":45,"no_polisi":"A9773W","no_chasis":"MHMFE74P5CK076376","no_machine":"4D34TH75274","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A2","production_year":2012,"acquisition_year":2012,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"C-00281847"}'::jsonb,
  '2019-08-09'::timestamp,
  'Bayu Herlambang',
  '2019-08-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 45
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'C-00281848',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9774W/ A9309TZ - (Mitshubishi)',
  'FLEET',
  174,
  '2019-07-18'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-46',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A_9774_W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":46,"no_polisi":"A9774W/ A9309TZ","no_chasis":"MHMFE74P5CK076329","no_machine":"4D34TH64358","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A2","production_year":2012,"acquisition_year":2012,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"C-00281848"}'::jsonb,
  '2019-07-18'::timestamp,
  'Bayu Herlambang',
  '2019-07-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 46
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-00281849',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9775W/ A9308TZ - (Mitshubishi)',
  'FLEET',
  162,
  '2019-07-30'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-47',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A_9775_W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":47,"no_polisi":"A9775W/ A9308TZ","no_chasis":"MHMFE74P5CK076145","no_machine":"4D34TH75176","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A2","production_year":2012,"acquisition_year":2012,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"J-00281849"}'::jsonb,
  '2019-07-30'::timestamp,
  'Bayu Herlambang',
  '2019-07-30'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 47
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-6517963',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9471BX - (Volvo)',
  'FLEET',
  26,
  '2016-04-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-48',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'B_9471_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":48,"no_polisi":"B9471BX","no_chasis":"YV2F2CBD6VA268435","no_machine":"292219","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"A-6517963"}'::jsonb,
  '2016-04-15'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 48
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-6517453',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9473BX - (Volvo)',
  'FLEET',
  28,
  '2019-07-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-49',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'B_9473_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":49,"no_polisi":"B9473BX","no_chasis":"YV2F2CBDXVA269880","no_machine":"293149","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"A-6517453"}'::jsonb,
  '2019-07-23'::timestamp,
  'Bayu Herlambang',
  '2019-07-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 49
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-6517037',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9474BX - (Volvo)',
  'FLEET',
  29,
  '2019-07-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-50',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'B_9474_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":50,"no_polisi":"B9474BX","no_chasis":"YV2F2CBDIVA269881","no_machine":"293150","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"A-6517037"}'::jsonb,
  '2019-07-23'::timestamp,
  'Bayu Herlambang',
  '2019-07-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 50
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-6517029',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9697BX - (Volvo)',
  'FLEET',
  30,
  '2016-04-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-51',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'B_9697_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":51,"no_polisi":"B9697BX","no_chasis":"YV2F2CBDIVA-267676","no_machine":"291624","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B2","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"A-6517029"}'::jsonb,
  '2016-04-15'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 51
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-6517039',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9703BX - (Volvo)',
  'FLEET',
  31,
  '2016-04-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-52',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'B_9703_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":52,"no_polisi":"B9703BX","no_chasis":"YV2F2CBD8VA.267674","no_machine":"291622","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B2","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"A-6517039"}'::jsonb,
  '2016-04-15'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 52
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-4411884',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - E4442PF - (Honda)',
  'FLEET',
  NULL,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-53',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_E_5884_PF_E_4442_PM.pdf',
  'Ownership Code: 12',
  '{"legacy_source":"bpkb_header","legacy_id":53,"no_polisi":"E4442PF","no_chasis":"MH1NFG00TTK048418","no_machine":"NFGE-1046578","brand_id":1,"brand_name":"Honda","cabinet_slot":"E1","production_year":1999,"acquisition_year":1999,"color_code":"1","ownership_code":"12","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.114","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"A-4411884"}'::jsonb,
  '2019-07-19'::timestamp,
  'Bayu Herlambang',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 53
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9065107',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1920DB - (Volvo)',
  'FLEET',
  34,
  '2019-07-22'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-55',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_R_2000_AX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":55,"no_polisi":"R1920DB","no_chasis":"YV2F2CBDVIVA","no_machine":"291576","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"9065107"}'::jsonb,
  '2019-07-22'::timestamp,
  'Bayu Herlambang',
  '2019-07-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 55
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-9065719',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1912DB - (Volvo)',
  'FLEET',
  68,
  '2016-04-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-56',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_R_2017_AX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":56,"no_polisi":"R1912DB","no_chasis":"YV2F2CBDOVA267619","no_machine":"291605","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"A-9065719"}'::jsonb,
  '2016-04-19'::timestamp,
  'Bayu Herlambang',
  '2017-01-16'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 56
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9065730',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1921DB - (Volvo)',
  'FLEET',
  430,
  '2016-04-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-58',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_R_2028_AX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":58,"no_polisi":"R1921DB","no_chasis":"YV2FCBDOVA268379","no_machine":"292181","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R1","production_year":1997,"acquisition_year":2000,"color_code":"15","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"9065730"}'::jsonb,
  '2016-04-19'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 58
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-9065732',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1938EB - (Volvo)',
  'FLEET',
  661,
  '2016-04-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-59',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'R_2030_AX_-_R_1938_EB_34cc3ra0uzuok.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":59,"no_polisi":"R1938EB","no_chasis":"YV2F2CBD6VA268306","no_machine":"292086","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"A-9065732"}'::jsonb,
  '2016-04-19'::timestamp,
  'Bayu Herlambang',
  '2016-11-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 59
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-9065733',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1916DB - (Volvo)',
  'FLEET',
  431,
  '2016-04-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-60',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_R_2031_AX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":60,"no_polisi":"R1916DB","no_chasis":"YV2F2CBD5VA26837","no_machine":"292129","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R1","production_year":1997,"acquisition_year":2000,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"A-9065733"}'::jsonb,
  '2016-04-19'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 60
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-9065742',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1918DB/R2040AX - (Volvo)',
  'FLEET',
  421,
  '2019-07-22'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-62',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_R_2040_AX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":62,"no_polisi":"R1918DB/R2040AX","no_chasis":"YV2F2CBDXVA26975i","no_machine":"292989","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"A-9065742"}'::jsonb,
  '2019-07-22'::timestamp,
  'Bayu Herlambang',
  '2019-07-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 62
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-9065743',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1924DB - (Volvo)',
  'FLEET',
  69,
  '2016-04-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-63',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_R_2041_AX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":63,"no_polisi":"R1924DB","no_chasis":"YV2F2CBD9VA268381","no_machine":"292183","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R1","production_year":1997,"acquisition_year":2000,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"A-9065743"}'::jsonb,
  '2016-04-19'::timestamp,
  'Bayu Herlambang',
  '2016-10-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 63
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-9066040',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1883DB/R2047AX - (Volvo)',
  'FLEET',
  422,
  '2019-07-22'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-64',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_R_2047_AX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":64,"no_polisi":"R1883DB/R2047AX","no_chasis":"YV2F2CBD7VA269755","no_machine":"293032","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"A-9066040"}'::jsonb,
  '2019-07-22'::timestamp,
  'Bayu Herlambang',
  '2019-07-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 64
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-9065751',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1929DB/R2050AX - (Volvo)',
  'FLEET',
  474,
  '2019-07-22'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-65',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_R_2050_AX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":65,"no_polisi":"R1929DB/R2050AX","no_chasis":"YV2F2CBDXVA268308","no_machine":"292088","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"A-9065751"}'::jsonb,
  '2019-07-22'::timestamp,
  'Bayu Herlambang',
  '2019-07-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 65
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-9065775',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1941DB - (Volvo)',
  'FLEET',
  472,
  '2019-07-23'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-69',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_R_2074_AX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":69,"no_polisi":"R1941DB","no_chasis":"YV2F2BDXVA268311","no_machine":"292091","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R2","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"A-9065775"}'::jsonb,
  '2019-07-23'::timestamp,
  'Bayu Herlambang',
  '2019-07-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 69
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-9065778',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1914DB - (Volvo)',
  'FLEET',
  NULL,
  '2016-04-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-70',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_R_2077_AX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":70,"no_polisi":"R1914DB","no_chasis":"YV2F2BDIVA269816","no_machine":"293056","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R2","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"A-9065778"}'::jsonb,
  '2016-04-19'::timestamp,
  'Bayu Herlambang',
  '2016-11-01'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 70
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-9065725',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1937EB - (Volvo)',
  'FLEET',
  NULL,
  '2016-04-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-75',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'R_2023_AX_-_R_1937_EB.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":75,"no_polisi":"R1937EB","no_chasis":"YV2F2CBDXVA267627","no_machine":"291613","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R1","production_year":1997,"acquisition_year":1997,"color_code":"13","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"A-9065725"}'::jsonb,
  '2016-04-19'::timestamp,
  'Bayu Herlambang',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 75
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'F-6172921',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A1148AE - (Toyota)',
  'FLEET',
  NULL,
  '2016-04-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-76',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A_1148_AE_3304tj23gaask.pdf',
  'Ownership Code: 9',
  '{"legacy_source":"bpkb_header","legacy_id":76,"no_polisi":"A1148AE","no_chasis":"MHFM1DA3J9K143445","no_machine":"DD92919","brand_id":7,"brand_name":"Toyota","cabinet_slot":null,"production_year":2009,"acquisition_year":2009,"color_code":"2","ownership_code":"9","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Bayu Herlambang"},"id_number":"F-6172921"}'::jsonb,
  '2016-04-19'::timestamp,
  'Bayu Herlambang',
  '2016-06-20'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 76
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'I-07099779',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B1140NAB - (Toyota)',
  'FLEET',
  NULL,
  '2016-04-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-77',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_B_1140_NAB.pdf',
  'Ownership Code: 4',
  '{"legacy_source":"bpkb_header","legacy_id":77,"no_polisi":"B1140NAB","no_chasis":"MRO53REE284301571","no_machine":"2ZAXI34217","brand_id":7,"brand_name":"Toyota","cabinet_slot":null,"production_year":2011,"acquisition_year":2011,"color_code":"2","ownership_code":"4","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"I-07099779"}'::jsonb,
  '2016-04-19'::timestamp,
  'Bayu Herlambang',
  '2016-06-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 77
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'I-07475433',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B1163NKG - (Toyota)',
  'FLEET',
  NULL,
  '2016-04-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-78',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_B_1163_NKG.pdf',
  'Ownership Code: 4',
  '{"legacy_source":"bpkb_header","legacy_id":78,"no_polisi":"B1163NKG","no_chasis":"MHKM1CA3JCK0001079","no_machine":"DCL6485","brand_id":7,"brand_name":"Toyota","cabinet_slot":null,"production_year":2012,"acquisition_year":2012,"color_code":"2","ownership_code":"4","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Bayu Herlambang"},"id_number":"I-07475433"}'::jsonb,
  '2016-04-19'::timestamp,
  'Bayu Herlambang',
  '2016-06-20'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 78
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'I-07813860',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B1693NKG - (Toyota)',
  'FLEET',
  NULL,
  '2016-04-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-79',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_B_1693_NKG.pdf',
  'Ownership Code: 4',
  '{"legacy_source":"bpkb_header","legacy_id":79,"no_polisi":"B1693NKG","no_chasis":"MHKMICAJCK001768","no_machine":"DCM6869","brand_id":7,"brand_name":"Toyota","cabinet_slot":null,"production_year":2012,"acquisition_year":2012,"color_code":"2","ownership_code":"4","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:45.0) Gecko/20100101 Firefox/45.0","ip_address":"10.2.2.57","created_user":"Bayu Herlambang","modified_user":"Bayu Herlambang"},"id_number":"I-07813860"}'::jsonb,
  '2016-04-19'::timestamp,
  'Bayu Herlambang',
  '2016-06-20'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 79
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6392410H',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A3069VL - (Honda)',
  'FLEET',
  886,
  '2019-07-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-83',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A_6972_F_A_3069_VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":83,"no_polisi":"A3069VL","no_chasis":"MH1KGVA113K570896","no_machine":"KEVAE-1561165","brand_id":1,"brand_name":"Honda","cabinet_slot":"A1","production_year":2003,"acquisition_year":2003,"color_code":"1","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Herry Arisyam"},"id_number":"6392410H"}'::jsonb,
  '2019-07-23'::timestamp,
  'Anggi Wijaya',
  '2019-07-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 83
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '1638860H',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8190U - (Toyota)',
  'FLEET',
  705,
  '2016-06-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-84',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_8190_U.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":84,"no_polisi":"A8190U","no_chasis":"MHF31LF602006412","no_machine":"BL-9730572","brand_id":7,"brand_name":"Toyota","cabinet_slot":"A1","production_year":2002,"acquisition_year":2002,"color_code":"1","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"1638860H"}'::jsonb,
  '2016-06-08'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 84
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9065753I',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1884DB - (Volvo)',
  'FLEET',
  543,
  '2016-06-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-86',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_R_2025_AX_R_1984_DB.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":86,"no_polisi":"R1884DB","no_chasis":"YV2F2CBDXVA268373","no_machine":"292126","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R1","production_year":1997,"acquisition_year":2000,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"9065753I"}'::jsonb,
  '2016-06-08'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 86
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A90657261',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1664BK - (Volvo)',
  'FLEET',
  NULL,
  '2016-06-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-87',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'R_1864_BK_-_R_1909_DB.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":87,"no_polisi":"R1664BK","no_chasis":"YV2F2CBD1VA26762","no_machine":"291614","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":2012,"color_code":"15","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"A90657261"}'::jsonb,
  '2016-06-08'::timestamp,
  'Anggi Wijaya',
  '2016-10-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 87
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9065710I',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - F8625AX - (Volvo)',
  'FLEET',
  33,
  '2016-06-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-90',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'F_8625_AX_R_2007_AX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":90,"no_polisi":"F8625AX","no_chasis":"YV2F2CBDXVA267630","no_machine":"291616","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":2000,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"9065710I"}'::jsonb,
  '2016-06-08'::timestamp,
  'Anggi Wijaya',
  '2016-07-25'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 90
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9065760I',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - F8626AX - (Volvo)',
  'FLEET',
  370,
  '2021-03-22'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-91',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'F_8626_AX_R_2059_AX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":91,"no_polisi":"F8626AX","no_chasis":"YV2F2CBD1VA269752","no_machine":"292990","brand_id":9,"brand_name":"Volvo","cabinet_slot":"F1","production_year":1997,"acquisition_year":2000,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"9065760I"}'::jsonb,
  '2021-03-22'::timestamp,
  'Anggi Wijaya',
  '2021-03-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 91
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9065729I',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - F8623AX - (Volvo)',
  'FLEET',
  32,
  '2016-06-08'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-92',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'F_8623_AX_R_2027_AX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":92,"no_polisi":"F8623AX","no_chasis":"YV2F2CBD9VA269756","no_machine":"293033","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":2000,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Bayu Herlambang"},"id_number":"9065729I"}'::jsonb,
  '2016-06-08'::timestamp,
  'Anggi Wijaya',
  '2016-06-20'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 92
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3095560G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B1464SFZ - (Daihatsu)',
  'FLEET',
  509,
  '2016-06-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-96',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'B_1464_SFZ_albantani.pdf',
  'Ownership Code: 7',
  '{"legacy_source":"bpkb_header","legacy_id":96,"no_polisi":"B1464SFZ","no_chasis":"MHK62CJ1J9K010076","no_machine":"DBK0399","brand_id":20,"brand_name":"Daihatsu","cabinet_slot":null,"production_year":2009,"acquisition_year":2010,"color_code":"11","ownership_code":"7","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Bayu Herlambang"},"id_number":"3095560G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-06-16'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 96
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9854504G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9348XA - (Mercedes Benz)',
  'FLEET',
  NULL,
  '2016-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-97',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_B_9723_RD.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":97,"no_polisi":"B9348XA","no_chasis":"68401526004573","no_machine":"38695060051312","brand_id":4,"brand_name":"Mercedes Benz","cabinet_slot":"B2","production_year":1991,"acquisition_year":1991,"color_code":"17","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"9854504G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 97
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6174520',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9392NX - (Volvo)',
  'FLEET',
  NULL,
  '2016-06-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-98',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'B_9392_NX.pdf',
  'Ownership Code: 6',
  '{"legacy_source":"bpkb_header","legacy_id":98,"no_polisi":"B9392NX","no_chasis":"YV2J4DMC41A524497","no_machine":"D12C214388A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2001,"acquisition_year":2005,"color_code":"12","ownership_code":"6","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Bayu Herlambang"},"id_number":"6174520"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-06-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 98
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6517965G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9460BX - (Volvo)',
  'FLEET',
  363,
  '2016-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-99',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'B_9460_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":99,"no_polisi":"B9460BX","no_chasis":"YV2F2CBD4VA268434","no_machine":"292218","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"6517965G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 99
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6517961G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9462BX - (Volvo)',
  'FLEET',
  70,
  '2016-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-101',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'B_9462_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":101,"no_polisi":"B9462BX","no_chasis":"YV2F2CBD2VA268433","no_machine":"292217","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B2","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"6517961G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 101
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6555429G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9464BX - (Volvo)',
  'FLEET',
  25,
  '2021-03-22'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-103',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'B_9464_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":103,"no_polisi":"B9464BX","no_chasis":"YV2F2CB27VA268430","no_machine":"292214","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"6555429G"}'::jsonb,
  '2021-03-22'::timestamp,
  'Anggi Wijaya',
  '2021-03-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 103
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6555431G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9465BX - (Volvo)',
  'FLEET',
  555,
  '2016-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-104',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'B_9465_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":104,"no_polisi":"B9465BX","no_chasis":"YV2F2CBD4VA268384","no_machine":"292213","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"6555431G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 104
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6555433G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9466BX - (Volvo)',
  'FLEET',
  402,
  '2016-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-105',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'B_9466_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":105,"no_polisi":"B9466BX","no_chasis":"YV2F2CBD2VA268383","no_machine":"292212","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"6555433G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 105
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6516932G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9467BX - (Volvo)',
  'FLEET',
  552,
  '2021-03-22'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-106',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'B_9467_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":106,"no_polisi":"B9467BX","no_chasis":"YV2F2CBD0VA269886","no_machine":"293155","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"6516932G"}'::jsonb,
  '2021-03-22'::timestamp,
  'Anggi Wijaya',
  '2021-03-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 106
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6517452',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9468BX - (Volvo)',
  'FLEET',
  66,
  '2016-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-107',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_B_9468_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":107,"no_polisi":"B9468BX","no_chasis":"YV2F2CBD4VA269888","no_machine":"293157","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"6517452"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 107
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6517454G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9469BX - (Volvo)',
  'FLEET',
  67,
  '2016-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-108',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'B_9669_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":108,"no_polisi":"B9469BX","no_chasis":"YV2F2CBD6VA269889","no_machine":"293158","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"6517454G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 108
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6555435G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9470BX - (Volvo)',
  'FLEET',
  364,
  '2016-06-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-109',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'B_9470_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":109,"no_polisi":"B9470BX","no_chasis":"YV2F2CBD0VA268382","no_machine":"292184","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"6555435G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 109
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6516960G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9475BX - (Volvo)',
  'FLEET',
  71,
  '2016-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-111',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'B_9475_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":111,"no_polisi":"B9475BX","no_chasis":"YV2F2CBD3VA269882","no_machine":"293151","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"6516960G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 111
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6516958G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9476BX - (Volvo)',
  'FLEET',
  365,
  '2021-03-22'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-112',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'B_9476_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":112,"no_polisi":"B9476BX","no_chasis":"YV2F2CBD5VA269883","no_machine":"293152","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"6516958G"}'::jsonb,
  '2021-03-22'::timestamp,
  'Anggi Wijaya',
  '2021-03-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 112
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6516954',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9477BX - (Volvo)',
  'FLEET',
  366,
  '2021-03-22'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-113',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'B_9477_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":113,"no_polisi":"B9477BX","no_chasis":"YV2F2CBD9VA269885","no_machine":"293154","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"6516954"}'::jsonb,
  '2021-03-22'::timestamp,
  'Anggi Wijaya',
  '2021-03-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 113
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6517456',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9478BX - (Volvo)',
  'FLEET',
  403,
  '2021-03-22'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-114',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'B_9478_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":114,"no_polisi":"B9478BX","no_chasis":"YV2F2CBD2VA269887","no_machine":"293156","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"6517456"}'::jsonb,
  '2021-03-22'::timestamp,
  'Anggi Wijaya',
  '2021-03-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 114
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4606780',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9505BX - (Renault)',
  'FLEET',
  286,
  '2016-06-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-116',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'B_9505_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":116,"no_polisi":"B9505BX","no_chasis":"VF6B002E400000323","no_machine":"83M0239297","brand_id":3,"brand_name":"Renault","cabinet_slot":"B1","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"4606780"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 116
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4646956G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9518BX - (Renault)',
  'FLEET',
  675,
  '2016-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-117',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'B_9518_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":117,"no_polisi":"B9518BX","no_chasis":"VF6BD02E400000311","no_machine":"83M0238967","brand_id":3,"brand_name":"Renault","cabinet_slot":"B3","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"4646956G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-11-01'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 117
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4653892G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9524BX - (Renault)',
  'FLEET',
  287,
  '2016-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-119',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'B_9524_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":119,"no_polisi":"B9524BX","no_chasis":"VF6BD02E400000322","no_machine":"83M0239291","brand_id":3,"brand_name":"Renault","cabinet_slot":"B2","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"4653892G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 119
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4606760',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9554BX - (Renault)',
  'FLEET',
  289,
  '2019-07-22'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-123',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9554_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":123,"no_polisi":"B9554BX","no_chasis":"VF6BD02E400000348","no_machine":"83M0239731","brand_id":3,"brand_name":"Renault","cabinet_slot":"B2","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Herry Arisyam"},"id_number":"4606760"}'::jsonb,
  '2019-07-22'::timestamp,
  'Anggi Wijaya',
  '2019-07-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 123
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4902982G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9616BX - (Renault)',
  'FLEET',
  672,
  '2016-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-130',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_B_9616_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":130,"no_polisi":"B9616BX","no_chasis":"VF6BD02E400000444","no_machine":"83M0242618","brand_id":3,"brand_name":"Renault","cabinet_slot":"B3","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"4902982G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-11-01'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 130
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4902988',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9633BX - (Renault)',
  'FLEET',
  NULL,
  '2016-06-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-133',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'B_9633_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":133,"no_polisi":"B9633BX","no_chasis":"VF6B002E400000464","no_machine":"83M0243276","brand_id":3,"brand_name":"Renault","cabinet_slot":"B3","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"4902988"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-11-01'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 133
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5011357G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9653BX - (Renault)',
  'FLEET',
  290,
  '2016-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-137',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_B_9653_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":137,"no_polisi":"B9653BX","no_chasis":"VF6BD02E400000525","no_machine":"83M0244039","brand_id":3,"brand_name":"Renault","cabinet_slot":"B2","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"5011357G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-11-01'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 137
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5057612G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9658BX - (Renault)',
  'FLEET',
  291,
  '2016-06-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-138',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'B_9658_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":138,"no_polisi":"B9658BX","no_chasis":"VF6BD02E400000531","no_machine":"83M0244175","brand_id":3,"brand_name":"Renault","cabinet_slot":"B2","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"5057612G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 138
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5003186G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9665BX - (Renault)',
  'FLEET',
  292,
  '2016-06-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-139',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'B_9665_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":139,"no_polisi":"B9665BX","no_chasis":"VF6BD02E400000521","no_machine":"83M0243742","brand_id":3,"brand_name":"Renault","cabinet_slot":"B2","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"5003186G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-11-01'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 139
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5104188G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9671BX - (Renault)',
  'FLEET',
  728,
  '2016-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-142',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_B_9671_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":142,"no_polisi":"B9671BX","no_chasis":"VF6BD02E400000539","no_machine":"83M0244304","brand_id":3,"brand_name":"Renault","cabinet_slot":"B3","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"5104188G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 142
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5100790G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9688BX - (Renault)',
  'FLEET',
  730,
  '2016-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-146',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_B_9688_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":146,"no_polisi":"B9688BX","no_chasis":"VF6BD02E400000556","no_machine":"83M0244691","brand_id":3,"brand_name":"Renault","cabinet_slot":"B3","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"5100790G"}'::jsonb,
  '2016-06-09'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 146
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6527458G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9695BX - (Volvo)',
  'FLEET',
  59,
  '2016-06-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-147',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_B_9695_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":147,"no_polisi":"B9695BX","no_chasis":"YV2F2CBDNA267682","no_machine":"291657","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B2","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"6527458G"}'::jsonb,
  '2016-06-10'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 147
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6517035G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9696BX - (Volvo)',
  'FLEET',
  553,
  '2016-06-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-148',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_B_9696_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":148,"no_polisi":"B9696BX","no_chasis":"YV2F2CBD5VA267681","no_machine":"291656","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B2","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"6517035G"}'::jsonb,
  '2016-06-10'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 148
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6517457G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9700BX - (Volvo)',
  'FLEET',
  368,
  '2016-06-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-150',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_B_9700_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":150,"no_polisi":"B9700BX","no_chasis":"YV2F2CBD5VA267678","no_machine":"291626","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B2","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"6517457G"}'::jsonb,
  '2016-06-10'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 150
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6517455G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9701BX - (Volvo)',
  'FLEET',
  72,
  '2016-06-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-151',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_B_9701_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":151,"no_polisi":"B9701BX","no_chasis":"YV2F2CBV3VA267677","no_machine":"291625","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B2","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"6517455G"}'::jsonb,
  '2016-06-10'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 151
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6555427G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9704BX - (Volvo)',
  'FLEET',
  554,
  '2021-03-22'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-152',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_B_9704_BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":152,"no_polisi":"B9704BX","no_chasis":"YV2F2CBD9VA267683","no_machine":"291658","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B2","production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"6555427G"}'::jsonb,
  '2021-03-22'::timestamp,
  'Anggi Wijaya',
  '2021-03-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 152
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0042431G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9730RD - (Mercedes Benz)',
  'FLEET',
  NULL,
  '2016-06-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-153',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_B_9730_RD.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":153,"no_polisi":"B9730RD","no_chasis":"68401526004645","no_machine":"38695060051391","brand_id":4,"brand_name":"Mercedes Benz","cabinet_slot":"B2","production_year":1991,"acquisition_year":1991,"color_code":"17","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"0042431G"}'::jsonb,
  '2016-06-10'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 153
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '01478759',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B88LDH - (Toyota)',
  'FLEET',
  NULL,
  '2016-06-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-155',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_B_88_LDH.pdf',
  'Ownership Code: 4',
  '{"legacy_source":"bpkb_header","legacy_id":155,"no_polisi":"B88LDH","no_chasis":"ANH208176633","no_machine":"2AZH664792","brand_id":7,"brand_name":"Toyota","cabinet_slot":null,"production_year":2011,"acquisition_year":2011,"color_code":"1","ownership_code":"4","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Bayu Herlambang"},"id_number":"01478759"}'::jsonb,
  '2016-06-10'::timestamp,
  'Anggi Wijaya',
  '2016-06-16'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 155
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '8303323G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B5251BI - (Mahator)',
  'FLEET',
  NULL,
  '2025-09-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-156',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_B_5251_BI.pdf',
  'Ownership Code: 4',
  '{"legacy_source":"bpkb_header","legacy_id":156,"no_polisi":"B5251BI","no_chasis":"MH6TC252VK000272","no_machine":"9726304","brand_id":16,"brand_name":"Mahator","cabinet_slot":"B1","production_year":1999,"acquisition_year":1999,"color_code":"10","ownership_code":"4","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"8303323G"}'::jsonb,
  '2025-09-17'::timestamp,
  'Anggi Wijaya',
  '2025-09-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 156
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '8737843G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B6693HI - (Mahator)',
  'FLEET',
  NULL,
  '2016-06-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-157',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_B_6693_HI.pdf',
  'Ownership Code: 4',
  '{"legacy_source":"bpkb_header","legacy_id":157,"no_polisi":"B6693HI","no_chasis":"MHGTC2252VK000488","no_machine":"9726179","brand_id":16,"brand_name":"Mahator","cabinet_slot":"B1","production_year":1999,"acquisition_year":1999,"color_code":"10","ownership_code":"4","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"8737843G"}'::jsonb,
  '2016-06-10'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 157
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2958500G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9026JN - (Hino)',
  'FLEET',
  14,
  '2023-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-158',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_B_9026_JN.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":158,"no_polisi":"B9026JN","no_chasis":"PDEPM1JNP5JD1D82","no_machine":"J08CTGJ11775","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2005,"acquisition_year":2005,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"2958500G"}'::jsonb,
  '2023-06-09'::timestamp,
  'Anggi Wijaya',
  '2023-06-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 158
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2958530G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9049JN - (Hino)',
  'FLEET',
  17,
  '2023-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-159',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'bpkb_B_9049_JN.jpg',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":159,"no_polisi":"B9049JN","no_chasis":"MJEFM1JNPSJ11792","no_machine":"J08CT9J11789","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2005,"acquisition_year":2005,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"2958530G"}'::jsonb,
  '2023-06-09'::timestamp,
  'Anggi Wijaya',
  '2023-06-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 159
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0712370',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9230TF - (Volvo)',
  'FLEET',
  307,
  '2016-06-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-161',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_B_9230_TF.pdf',
  'Ownership Code: 10',
  '{"legacy_source":"bpkb_header","legacy_id":161,"no_polisi":"B9230TF","no_chasis":"YV2F2B3D1PA377378","no_machine":"250838","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1992,"acquisition_year":1992,"color_code":"14","ownership_code":"10","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"0712370"}'::jsonb,
  '2016-06-10'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 161
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0712368G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9231TF - (Volvo)',
  'FLEET',
  308,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-162',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'BPKB_B_9231_TF.pdf',
  'Ownership Code: 10',
  '{"legacy_source":"bpkb_header","legacy_id":162,"no_polisi":"B9231TF","no_chasis":"YV2F2B3DXDA377377","no_machine":"250837","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1992,"acquisition_year":1992,"color_code":"12","ownership_code":"10","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"0712368G"}'::jsonb,
  '2026-02-23'::timestamp,
  'Anggi Wijaya',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 162
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '02583022',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9336RL - (Volvo)',
  'FLEET',
  NULL,
  '2016-06-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-163',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_B_9336_RL.pdf',
  'Ownership Code: 1',
  '{"legacy_source":"bpkb_header","legacy_id":163,"no_polisi":"B9336RL","no_chasis":"SCVF2CC04RC908232","no_machine":"263970","brand_id":9,"brand_name":"Volvo","cabinet_slot":"B1","production_year":1994,"acquisition_year":1994,"color_code":"12","ownership_code":"1","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"02583022"}'::jsonb,
  '2016-06-10'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 163
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3319928G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9082VL - (Isuzu)',
  'FLEET',
  176,
  '2016-06-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-164',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_B_9453_LI_A_9082_VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":164,"no_polisi":"A9082VL","no_chasis":"MHCNKR66LSC000639","no_machine":"W950639","brand_id":17,"brand_name":"Isuzu","cabinet_slot":"A2","production_year":1995,"acquisition_year":1995,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"3319928G"}'::jsonb,
  '2016-06-10'::timestamp,
  'Anggi Wijaya',
  '2016-11-01'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 164
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4964666G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9844AK - (Isuzu)',
  'FLEET',
  NULL,
  '2016-06-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-165',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_B_9844_AK.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":165,"no_polisi":"B9844AK","no_chasis":"MHCTB1254B314110945","no_machine":"E110945","brand_id":17,"brand_name":"Isuzu","cabinet_slot":"B2","production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Anggi Wijaya"},"id_number":"4964666G"}'::jsonb,
  '2016-06-10'::timestamp,
  'Anggi Wijaya',
  '2016-10-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 165
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2958502G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9025JN - (Hino)',
  'FLEET',
  13,
  '2023-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-166',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_NO_POL_B_9025_JN.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":166,"no_polisi":"B9025JN","no_chasis":"MJEFM1JNP5JD11830","no_machine":"J08CTAJ11823","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2005,"acquisition_year":2005,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"2958502G"}'::jsonb,
  '2023-06-09'::timestamp,
  'Anggi Wijaya',
  '2023-06-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 166
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2958532G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9003JN - (Hino)',
  'FLEET',
  10,
  '2023-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-167',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_NO_POL_B_9003_JN.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":167,"no_polisi":"B9003JN","no_chasis":"MJEFM1JNP5JD11795","no_machine":"JD8CTQJ11788","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2005,"acquisition_year":2005,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"2958532G"}'::jsonb,
  '2023-06-09'::timestamp,
  'Anggi Wijaya',
  '2023-06-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 167
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2958531G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9046JN - (Hino)',
  'FLEET',
  1,
  '2023-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-168',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_NO_POL_B_9046_JN.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":168,"no_polisi":"B9046JN","no_chasis":"MJEFM1JNP5JD11796","no_machine":"J08CTGJ11789","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2005,"acquisition_year":2005,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"2958531G"}'::jsonb,
  '2023-06-09'::timestamp,
  'Anggi Wijaya',
  '2023-06-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 168
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '11610999',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9026UI - (Mercedes Benz)',
  'FLEET',
  40,
  '2016-06-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-169',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_9026_UI.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":169,"no_polisi":"A9026UI","no_chasis":"WDB9341612L555951","no_machine":"54192300760357","brand_id":4,"brand_name":"Mercedes Benz","cabinet_slot":"A2","production_year":2011,"acquisition_year":2011,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Bayu Herlambang"},"id_number":"11610999"}'::jsonb,
  '2016-06-10'::timestamp,
  'Anggi Wijaya',
  '2018-03-21'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 169
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '11611000',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9027UI - (Mercedes Benz)',
  'FLEET',
  41,
  '2023-12-13'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-170',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_9027_UI.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":170,"no_polisi":"A9027UI","no_chasis":"WDB93416121555952","no_machine":"54192300760150","brand_id":4,"brand_name":"Mercedes Benz","cabinet_slot":"A2","production_year":2011,"acquisition_year":2011,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"11611000"}'::jsonb,
  '2023-12-13'::timestamp,
  'Anggi Wijaya',
  '2023-12-13'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 170
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '11008780',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9721W - (Hino)',
  'FLEET',
  396,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-171',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A_9721_W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":171,"no_polisi":"A9721W","no_chasis":"MJEFLBJTLCJM13830","no_machine":"J0BEUFJ42774","brand_id":2,"brand_name":"Hino","cabinet_slot":"A2","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:43.0) Gecko/20100101 Firefox/43.0","ip_address":"10.2.2.127","created_user":"Anggi Wijaya","modified_user":"Joni Sutopo"},"id_number":"11008780"}'::jsonb,
  '2022-02-24'::timestamp,
  'Anggi Wijaya',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 171
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9961922',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9112XQ - (Volvo)',
  'FLEET',
  82,
  '2023-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-177',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'B_9112_XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":177,"no_polisi":"B9112XQ","no_chasis":"YV2J4CMC73A558303","no_machine":"D12317621","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"9961922"}'::jsonb,
  '2023-06-09'::timestamp,
  'Bayu Herlambang',
  '2023-06-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 177
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9952960',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9119XQ - (Volvo)',
  'FLEET',
  89,
  '2025-05-05'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-178',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'B_9119_XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":178,"no_polisi":"B9119XQ","no_chasis":"YV2J4CMC93A557329","no_machine":"D12313765","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"9952960"}'::jsonb,
  '2025-05-05'::timestamp,
  'Bayu Herlambang',
  '2025-05-05'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 178
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0745427',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9131XQ - (Volvo)',
  'FLEET',
  100,
  '2021-10-14'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-179',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_B9131XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":179,"no_polisi":"B9131XQ","no_chasis":"YV2J4DMC3YC763J82","no_machine":"D12C171873A","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"0745427"}'::jsonb,
  '2021-10-14'::timestamp,
  'Bayu Herlambang',
  '2021-10-14'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 179
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0749982',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9141XQ - (Volvo)',
  'FLEET',
  105,
  '2023-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-180',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'B_9141_XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":180,"no_polisi":"B9141XQ","no_chasis":"YV2J4DAC8YA5111153","no_machine":"D12C176491A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"0749982"}'::jsonb,
  '2023-06-09'::timestamp,
  'Bayu Herlambang',
  '2023-06-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 180
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4198248G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9317QZ - (Volvo)',
  'FLEET',
  81,
  '2023-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-181',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'B_9317_QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":181,"no_polisi":"B9317QZ","no_chasis":"YV2AHDMC4XC762H27","no_machine":"C12C.152026.A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"4198248G"}'::jsonb,
  '2023-06-09'::timestamp,
  'Bayu Herlambang',
  '2023-06-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 181
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '7325947',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9921WX - (Hino)',
  'FLEET',
  19,
  '2023-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-182',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'B_9921_WX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":182,"no_polisi":"B9921WX","no_chasis":"MJEFM8JNK7JR11676","no_machine":"J08EUFJ12174","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2007,"acquisition_year":2007,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"7325947"}'::jsonb,
  '2023-06-09'::timestamp,
  'Bayu Herlambang',
  '2023-06-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 182
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '7325738',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9922WX - (Hino)',
  'FLEET',
  20,
  '2023-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-183',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-CIMB' LIMIT 1),
  'B_9922_WX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":183,"no_polisi":"B9922WX","no_chasis":"MJEFM8JNK7JR11679","no_machine":"J08EUFJ12177","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2007,"acquisition_year":2007,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"7325738"}'::jsonb,
  '2023-06-09'::timestamp,
  'Bayu Herlambang',
  '2023-06-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 183
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '7326093',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9923WX - (Hino)',
  'FLEET',
  21,
  '2023-06-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-184',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'B_9923_WX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":184,"no_polisi":"B9923WX","no_chasis":"MJEFM8JNK7JB11712","no_machine":"J08EUFJ12210","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2007,"acquisition_year":2007,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"7326093"}'::jsonb,
  '2023-06-09'::timestamp,
  'Bayu Herlambang',
  '2023-06-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 184
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '7325818',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9924WX - (Hino)',
  'FLEET',
  22,
  '2016-06-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-185',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-CIMB' LIMIT 1),
  'B_9924_WX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":185,"no_polisi":"B9924WX","no_chasis":"MJEFM8JNK7JR11675","no_machine":"J08EUFJ12173","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2007,"acquisition_year":2007,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"7325818"}'::jsonb,
  '2016-06-15'::timestamp,
  'Bayu Herlambang',
  '2017-02-06'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 185
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0123772G',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9773UY - (Volvo)',
  'FLEET',
  NULL,
  '2016-06-16'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-186',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'B_9773_UY.pdf',
  'Ownership Code: 6',
  '{"legacy_source":"bpkb_header","legacy_id":186,"no_polisi":"B9773UY","no_chasis":"YV234DMC81A533090","no_machine":"D12C237380A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2001,"acquisition_year":2001,"color_code":"12","ownership_code":"6","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"0123772G"}'::jsonb,
  '2016-06-16'::timestamp,
  'Bayu Herlambang',
  '2016-10-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 186
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '598315',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B2973CI - (Nissan)',
  'FLEET',
  NULL,
  '2016-06-16'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-187',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKBSTNK_GRAND_LIVINA_B_2973_CI.pdf',
  'Ownership Code: 4',
  '{"legacy_source":"bpkb_header","legacy_id":187,"no_polisi":"B2973CI","no_chasis":"MHGBICGIF7J001491","no_machine":"HRI5902541A","brand_id":6,"brand_name":"Nissan","cabinet_slot":null,"production_year":2007,"acquisition_year":2007,"color_code":"5","ownership_code":"4","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":null},"id_number":"598315"}'::jsonb,
  '2016-06-16'::timestamp,
  'Bayu Herlambang',
  '2016-06-16'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 187
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '03781947',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1864BK - (Volvo)',
  'FLEET',
  562,
  '2016-06-17'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-188',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'R_1864_BK_-_R_1909_DB_33e1noeafds08.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":188,"no_polisi":"R1864BK","no_chasis":"YV2F2CBD1VA26762","no_machine":"291614","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":2012,"color_code":"15","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":"Anggi Wijaya"},"id_number":"03781947"}'::jsonb,
  '2016-06-17'::timestamp,
  'Bayu Herlambang',
  '2017-02-06'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 188
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '06412855',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A88DH - (Hyundai)',
  'FLEET',
  NULL,
  '2016-06-20'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-190',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A_88_DH.pdf',
  'Ownership Code: 9',
  '{"legacy_source":"bpkb_header","legacy_id":190,"no_polisi":"A88DH","no_chasis":"MHXWF31JMAJ200487","no_machine":"D4CBA666069","brand_id":18,"brand_name":"Hyundai","cabinet_slot":null,"production_year":2010,"acquisition_year":2010,"color_code":"1","ownership_code":"9","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":null},"id_number":"06412855"}'::jsonb,
  '2016-06-20'::timestamp,
  'Bayu Herlambang',
  '2016-06-20'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 190
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '10652615',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A3634CM - (Viar)',
  'FLEET',
  NULL,
  '2016-06-20'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-191',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A_3634_CM.pdf',
  'Ownership Code: 9',
  '{"legacy_source":"bpkb_header","legacy_id":191,"no_polisi":"A3634CM","no_chasis":"MGRVR20TAEL000786","no_machine":"YX200FMG14000795","brand_id":19,"brand_name":"Viar","cabinet_slot":null,"production_year":2014,"acquisition_year":2015,"color_code":"12","ownership_code":"9","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":null},"id_number":"10652615"}'::jsonb,
  '2016-06-20'::timestamp,
  'Bayu Herlambang',
  '2016-06-20'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 191
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '10652616',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A3635CM - (Viar)',
  'FLEET',
  NULL,
  '2016-06-20'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-192',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A_3635_CM.pdf',
  'Ownership Code: 9',
  '{"legacy_source":"bpkb_header","legacy_id":192,"no_polisi":"A3635CM","no_chasis":"MGRVR20TAEL000527","no_machine":"YX200FMG14000322","brand_id":19,"brand_name":"Viar","cabinet_slot":null,"production_year":2014,"acquisition_year":2015,"color_code":"12","ownership_code":"9","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":null},"id_number":"10652616"}'::jsonb,
  '2016-06-20'::timestamp,
  'Bayu Herlambang',
  '2016-06-20'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 192
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '06459080',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8397AF - (Daihatsu)',
  'FLEET',
  NULL,
  '2016-06-20'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-193',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A_8397_AF.pdf',
  'Ownership Code: 9',
  '{"legacy_source":"bpkb_header","legacy_id":193,"no_polisi":"A8397AF","no_chasis":"MHK3BBA1JDK020038","no_machine":"MC63399","brand_id":20,"brand_name":"Daihatsu","cabinet_slot":null,"production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"9","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:47.0) Gecko/20100101 Firefox/47.0","ip_address":"10.2.2.97","created_user":"Bayu Herlambang","modified_user":null},"id_number":"06459080"}'::jsonb,
  '2016-06-20'::timestamp,
  'Bayu Herlambang',
  '2016-06-20'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 193
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01796599',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9220X/ A9603TZ - (Mitshubishi)',
  'FLEET',
  167,
  '2019-07-24'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-194',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A_9220_X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":194,"no_polisi":"A9220X/ A9603TZ","no_chasis":"MHMFE74P4DK069191","no_machine":"4D34TJ68115","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A1","production_year":2013,"acquisition_year":2013,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:49.0) Gecko/20100101 Firefox/49.0","ip_address":"10.2.2.210","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01796599"}'::jsonb,
  '2019-07-24'::timestamp,
  'Bayu Herlambang',
  '2019-07-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 194
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01796600',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9221X/ A9604TZ - (Mitshubishi)',
  'FLEET',
  168,
  '2019-08-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-195',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A_9221_X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":195,"no_polisi":"A9221X/ A9604TZ","no_chasis":"MHMFE74P4DK061190","no_machine":"4034TJ68116","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A1","production_year":2013,"acquisition_year":2013,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:49.0) Gecko/20100101 Firefox/49.0","ip_address":"10.2.2.210","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01796600"}'::jsonb,
  '2019-08-09'::timestamp,
  'Bayu Herlambang',
  '2019-08-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 195
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01796601',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9223X/ A9606TZ - (Mitshubishi)',
  'FLEET',
  169,
  '2019-08-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-196',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A_9223_X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":196,"no_polisi":"A9223X/ A9606TZ","no_chasis":"MHMFE74P4DK069122","no_machine":"4D3ITJ68133","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A1","production_year":2013,"acquisition_year":2013,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:49.0) Gecko/20100101 Firefox/49.0","ip_address":"10.2.2.210","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01796601"}'::jsonb,
  '2019-08-09'::timestamp,
  'Bayu Herlambang',
  '2019-08-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 196
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01796602',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9224X/ A9607TZ - (Mitshubishi)',
  'FLEET',
  170,
  '2019-08-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-197',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A_9224_X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":197,"no_polisi":"A9224X/ A9607TZ","no_chasis":"MHMFE74P4DK069189","no_machine":"4D34TJ68127","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A1","production_year":2013,"acquisition_year":2013,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:49.0) Gecko/20100101 Firefox/49.0","ip_address":"10.2.2.210","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01796602"}'::jsonb,
  '2019-08-09'::timestamp,
  'Bayu Herlambang',
  '2019-08-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 197
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-017966003',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9225X/ A9605TZ - (Mitshubishi)',
  'FLEET',
  171,
  '2019-08-09'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-198',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A_9225_X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":198,"no_polisi":"A9225X/ A9605TZ","no_chasis":"MHMFE74P4DK069188","no_machine":"4D34TJ68125","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A1","production_year":2013,"acquisition_year":2013,"color_code":"17","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:49.0) Gecko/20100101 Firefox/49.0","ip_address":"10.2.2.210","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-017966003"}'::jsonb,
  '2019-08-09'::timestamp,
  'Bayu Herlambang',
  '2019-08-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 198
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-03647107',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B18TWL - (Mini Cooper)',
  'FLEET',
  NULL,
  '2016-10-06'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-199',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-AUDIT' LIMIT 1),
  'BPKB_B_18_TWL.pdf',
  'Ownership Code: 2',
  '{"legacy_source":"bpkb_header","legacy_id":199,"no_polisi":"B18TWL","no_chasis":"WMW5V32010T150638","no_machine":"A691J066","brand_id":21,"brand_name":"Mini Cooper","cabinet_slot":null,"production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"2","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:49.0) Gecko/20100101 Firefox/49.0","ip_address":"10.2.2.210","created_user":"Bayu Herlambang","modified_user":null},"id_number":"J-03647107"}'::jsonb,
  '2016-10-06'::timestamp,
  'Bayu Herlambang',
  '2016-10-06'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 199
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-10733',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B757BS - (Lexus)',
  'FLEET',
  NULL,
  '2024-09-27'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-200',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-AUDIT' LIMIT 1),
  'BPKB_B2108RFD.pdf',
  'Ownership Code: 2',
  '{"legacy_source":"bpkb_header","legacy_id":200,"no_polisi":"B757BS","no_chasis":"JTJTH00WX0352290","no_machine":"ZUZ9058021","brand_id":23,"brand_name":"Lexus","cabinet_slot":"NonBrankas","production_year":2002,"acquisition_year":2002,"color_code":"1","ownership_code":"2","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:51.0) Gecko/20100101 Firefox/51.0","ip_address":"10.2.2.133","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-10733"}'::jsonb,
  '2024-09-27'::timestamp,
  'Bayu Herlambang',
  '2024-09-27'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 200
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-06782699',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B715BP - (Toyota)',
  'FLEET',
  NULL,
  '2024-03-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-201',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_B715BP.pdf',
  'Ownership Code: 13',
  '{"legacy_source":"bpkb_header","legacy_id":201,"no_polisi":"B715BP","no_chasis":"MR053AK50D4501910","no_machine":"2AR0791090","brand_id":7,"brand_name":"Toyota","cabinet_slot":null,"production_year":2013,"acquisition_year":2013,"color_code":"2","ownership_code":"13","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:51.0) Gecko/20100101 Firefox/51.0","ip_address":"10.2.2.133","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"J-06782699"}'::jsonb,
  '2024-03-08'::timestamp,
  'Bayu Herlambang',
  '2024-03-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 201
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-06154513',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9008X - (Hino)',
  'FLEET',
  644,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-202',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9008X_35nshckxw5c00.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":202,"no_polisi":"A9008X","no_chasis":"MJEFM8JNKDJM37351","no_machine":"J08EUFJ49947","brand_id":2,"brand_name":"Hino","cabinet_slot":"A3","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"J-06154513"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 202
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-06154507',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9895W - (Hino)',
  'FLEET',
  413,
  '2019-07-16'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-203',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9895W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":203,"no_polisi":"A9895W","no_chasis":"MJEFM8JNKDJM37447","no_machine":"J08EUFJ50289","brand_id":2,"brand_name":"Hino","cabinet_slot":"A5","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"J-06154507"}'::jsonb,
  '2019-07-16'::timestamp,
  'Bayu Herlambang',
  '2019-07-16'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 203
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01800272',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9106X/ A9501TZ - (Hino)',
  'FLEET',
  383,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-204',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9106X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":204,"no_polisi":"A9106X/ A9501TZ","no_chasis":"MJEFL8JTLDJM15444","no_machine":"J08EUFJ52202","brand_id":2,"brand_name":"Hino","cabinet_slot":"A4","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-01800272"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 204
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01794713',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9292VL - (Hino)',
  'FLEET',
  175,
  '2019-07-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-205',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A9292VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":205,"no_polisi":"A9292VL","no_chasis":"MJEC1JG43C5049998","no_machine":"W04DTRJ52880","brand_id":2,"brand_name":"Hino","cabinet_slot":"A4","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01794713"}'::jsonb,
  '2019-07-23'::timestamp,
  'Bayu Herlambang',
  '2019-07-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 205
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793886',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9061X - (Hino)',
  'FLEET',
  408,
  '2022-02-24'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-206',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9061X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":206,"no_polisi":"A9061X","no_chasis":"MJEFM8JNKDJM37724","no_machine":"J08EUFJ52800","brand_id":2,"brand_name":"Hino","cabinet_slot":"A3","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-01793886"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 206
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793718',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9041X - (Hino)',
  'FLEET',
  377,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-207',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9041X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":207,"no_polisi":"A9041X","no_chasis":"MJEFL8JTLDJM15264","no_machine":"J08EUFJ51596","brand_id":2,"brand_name":"Hino","cabinet_slot":"A3","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-01793718"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 207
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793720',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9043X - (Hino)',
  'FLEET',
  379,
  '2017-05-29'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-208',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9043X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":208,"no_polisi":"A9043X","no_chasis":"MJEFL8JTLDJM15263","no_machine":"J08EUFJ51595","brand_id":2,"brand_name":"Hino","cabinet_slot":"A3","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Bayu Herlambang"},"id_number":"K-01793720"}'::jsonb,
  '2017-05-29'::timestamp,
  'Bayu Herlambang',
  '2018-05-14'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 208
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01794708',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9293VL - (Hino)',
  'FLEET',
  152,
  '2019-07-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-209',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A9293VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":209,"no_polisi":"A9293VL","no_chasis":"MJEC1JG43C5049536","no_machine":"W04DTRJ52466","brand_id":2,"brand_name":"Hino","cabinet_slot":"A4","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01794708"}'::jsonb,
  '2019-07-23'::timestamp,
  'Bayu Herlambang',
  '2019-07-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 209
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793719',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9042X - (Hino)',
  'FLEET',
  378,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-210',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9042X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":210,"no_polisi":"A9042X","no_chasis":"MJEFL8JTLDJM15262","no_machine":"J08EUFJ51594","brand_id":2,"brand_name":"Hino","cabinet_slot":"A3","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-01793719"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 210
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01800274',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9108X/ A9502TZ - (Hino)',
  'FLEET',
  390,
  '2019-07-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-211',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9108X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":211,"no_polisi":"A9108X/ A9502TZ","no_chasis":"MJEFL8JTLDJM15541","no_machine":"J08EUFJ52233","brand_id":2,"brand_name":"Hino","cabinet_slot":"A4","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01800274"}'::jsonb,
  '2019-07-19'::timestamp,
  'Bayu Herlambang',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 211
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01794712',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9291VL - (Hino)',
  'FLEET',
  156,
  '2019-07-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-212',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A9291VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":212,"no_polisi":"A9291VL","no_chasis":"MJEC1JG43C5049541","no_machine":"W04DTRJ52499","brand_id":2,"brand_name":"Hino","cabinet_slot":"A4","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01794712"}'::jsonb,
  '2019-07-23'::timestamp,
  'Bayu Herlambang',
  '2019-07-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 212
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01794710',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9295VL - (Hino)',
  'FLEET',
  251,
  '2017-05-29'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-213',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9295VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":213,"no_polisi":"A9295VL","no_chasis":"MJEC1JG4365049735","no_machine":"W04DTRJ52734","brand_id":2,"brand_name":"Hino","cabinet_slot":"A5","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Bayu Herlambang"},"id_number":"K-01794710"}'::jsonb,
  '2017-05-29'::timestamp,
  'Bayu Herlambang',
  '2018-03-21'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 213
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01794702',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9300VL/A9490TZ - (Hino)',
  'FLEET',
  157,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-214',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A9300VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":214,"no_polisi":"A9300VL/A9490TZ","no_chasis":"MJEC1JG43C5049648","no_machine":"W04DTRJ52599","brand_id":2,"brand_name":"Hino","cabinet_slot":"A5","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01794702"}'::jsonb,
  '2019-07-19'::timestamp,
  'Bayu Herlambang',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 214
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01794951',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9307VL/A9584TZ - (Hino)',
  'FLEET',
  151,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-215',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A9307VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":215,"no_polisi":"A9307VL/A9584TZ","no_chasis":"MJE61JG4365049890","no_machine":"W04DTRJ52812","brand_id":2,"brand_name":"Hino","cabinet_slot":"A5","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01794951"}'::jsonb,
  '2019-07-19'::timestamp,
  'Bayu Herlambang',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 215
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793487',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9088X/ A9478TZ - (Hino)',
  'FLEET',
  412,
  '2019-07-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-216',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9088X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":216,"no_polisi":"A9088X/ A9478TZ","no_chasis":"MJEFM8JNKDJM37126","no_machine":"J08EUFJ52802","brand_id":2,"brand_name":"Hino","cabinet_slot":"A4","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01793487"}'::jsonb,
  '2019-07-19'::timestamp,
  'Bayu Herlambang',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 216
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01800276',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9110X/ A9502TZ - (Hino)',
  'FLEET',
  387,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-217',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9110X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":217,"no_polisi":"A9110X/ A9502TZ","no_chasis":"MJEFL8JTLDJM15426","no_machine":"J08EUFJ52136","brand_id":2,"brand_name":"Hino","cabinet_slot":"A4","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-01800276"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 217
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01794703',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9301VL/A9487TZ - (Hino)',
  'FLEET',
  154,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-218',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A9301VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":218,"no_polisi":"A9301VL/A9487TZ","no_chasis":"MJE61JG4365049543","no_machine":"W04DTRJ52501","brand_id":2,"brand_name":"Hino","cabinet_slot":"A5","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01794703"}'::jsonb,
  '2019-07-19'::timestamp,
  'Bayu Herlambang',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 218
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793717',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9040X - (Hino)',
  'FLEET',
  406,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-219',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9040X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":219,"no_polisi":"A9040X","no_chasis":"MJEFM8JNKDJM37600","no_machine":"J08EUFJ52166","brand_id":2,"brand_name":"Hino","cabinet_slot":"A3","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-01793717"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 219
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01794701',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9299VL/A9489VL - (Hino)',
  'FLEET',
  158,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-220',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A9299VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":220,"no_polisi":"A9299VL/A9489VL","no_chasis":"MJE61JG4365049997","no_machine":"W04DTRJ52878","brand_id":2,"brand_name":"Hino","cabinet_slot":"A5","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01794701"}'::jsonb,
  '2019-07-19'::timestamp,
  'Bayu Herlambang',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 220
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793715',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9038X - (Hino)',
  'FLEET',
  404,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-221',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9038X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":221,"no_polisi":"A9038X","no_chasis":"MJEFM8JNKDJM37613","no_machine":"J08EUFJ52287","brand_id":2,"brand_name":"Hino","cabinet_slot":"A3","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-01793715"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 221
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793716',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9039X - (Hino)',
  'FLEET',
  405,
  '2017-05-29'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-222',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9039X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":222,"no_polisi":"A9039X","no_chasis":"MJFEM8JNKDJM37614","no_machine":"J08EUFJ52288","brand_id":2,"brand_name":"Hino","cabinet_slot":"A3","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Bayu Herlambang"},"id_number":"K-01793716"}'::jsonb,
  '2017-05-29'::timestamp,
  'Bayu Herlambang',
  '2018-05-14'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 222
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793887',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9062X - (Hino)',
  'FLEET',
  409,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-223',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9062X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":223,"no_polisi":"A9062X","no_chasis":"MJEFM8JNKDJM37615","no_machine":"J08EUFJ52289","brand_id":2,"brand_name":"Hino","cabinet_slot":"A3","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-01793887"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 223
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793486',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9087X/ A9479TZ - (Hino)',
  'FLEET',
  411,
  '2019-07-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-224',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9087X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":224,"no_polisi":"A9087X/ A9479TZ","no_chasis":"MJEFM8JNKDJM37725","no_machine":"J08EUFJ52801","brand_id":2,"brand_name":"Hino","cabinet_slot":"A4","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01793486"}'::jsonb,
  '2019-07-19'::timestamp,
  'Bayu Herlambang',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 224
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793485',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9086X/ A9480TZ - (Hino)',
  'FLEET',
  382,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-225',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9086X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":225,"no_polisi":"A9086X/ A9480TZ","no_chasis":"MJEFL8JTLDJM15443","no_machine":"J08EUFJ52201","brand_id":2,"brand_name":"Hino","cabinet_slot":"A4","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-01793485"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 225
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793885',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9060X - (Hino)',
  'FLEET',
  407,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-226',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9060X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":226,"no_polisi":"A9060X","no_chasis":"MJEFM8JNKDJM37617","no_machine":"J08EUFJ52291","brand_id":2,"brand_name":"Hino","cabinet_slot":"A3","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-01793885"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 226
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793888',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9063X - (Hino)',
  'FLEET',
  410,
  '2017-05-29'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-227',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9063X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":227,"no_polisi":"A9063X","no_chasis":"MJEFM8JNKDJM37616","no_machine":"J08EUFJ52290","brand_id":2,"brand_name":"Hino","cabinet_slot":"A3","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Bayu Herlambang"},"id_number":"K-01793888"}'::jsonb,
  '2017-05-29'::timestamp,
  'Bayu Herlambang',
  '2018-05-14'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 227
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01800275',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9109X/ A9501TZ - (Hino)',
  'FLEET',
  386,
  '2019-07-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-228',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9109X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":228,"no_polisi":"A9109X/ A9501TZ","no_chasis":"MJEFL8JTLDJM15440","no_machine":"J08EUFJ52198","brand_id":2,"brand_name":"Hino","cabinet_slot":"A4","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01800275"}'::jsonb,
  '2019-07-19'::timestamp,
  'Bayu Herlambang',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 228
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793483',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9074X/ A9484TZ - (Hino)',
  'FLEET',
  380,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-229',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9074X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":229,"no_polisi":"A9074X/ A9484TZ","no_chasis":"MJEFL8JTLDJM15378","no_machine":"J08EUFJ51974","brand_id":2,"brand_name":"Hino","cabinet_slot":"A3","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-01793483"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 229
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01794711',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9296VL/A9481TZ - (Hino)',
  'FLEET',
  150,
  '2022-03-15'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-230',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A9296VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":230,"no_polisi":"A9296VL/A9481TZ","no_chasis":"MJE61JG4365049535","no_machine":"W04DTRJ52462","brand_id":2,"brand_name":"Hino","cabinet_slot":"A5","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-01794711"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 230
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01800273',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9107X/ A9498TZ - (Hino)',
  'FLEET',
  384,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-231',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9107X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":231,"no_polisi":"A9107X/ A9498TZ","no_chasis":"MJEFL8JTLDJM15439","no_machine":"J08EUFJ52197","brand_id":2,"brand_name":"Hino","cabinet_slot":"A4","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-01800273"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 231
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01794709',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9294VL/A9483TZ - (Hino)',
  'FLEET',
  153,
  '2019-07-18'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-232',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A9294VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":232,"no_polisi":"A9294VL/A9483TZ","no_chasis":"MJE61JG4365049542","no_machine":"W04DTRJ52464","brand_id":2,"brand_name":"Hino","cabinet_slot":"A5","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-01794709"}'::jsonb,
  '2019-07-18'::timestamp,
  'Bayu Herlambang',
  '2019-07-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 232
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-01793484',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9085X/ A9482TZ - (Hino)',
  'FLEET',
  381,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-233',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9085X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":233,"no_polisi":"A9085X/ A9482TZ","no_chasis":"MJEFL8JTLDJM15408","no_machine":"J08EUFJ52070","brand_id":2,"brand_name":"Hino","cabinet_slot":"A4","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-01793484"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 233
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'N-01924886',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B86BCS - (Lexus)',
  'FLEET',
  NULL,
  '2024-08-27'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-234',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-AUDIT' LIMIT 1),
  'BPKB_B86BCS.pdf',
  'Ownership Code: 4',
  '{"legacy_source":"bpkb_header","legacy_id":234,"no_polisi":"B86BCS","no_chasis":"JTJHY00W1E4147814","no_machine":"3UR3196447","brand_id":23,"brand_name":"Lexus","cabinet_slot":"NonBrankas","production_year":2014,"acquisition_year":2014,"color_code":"1","ownership_code":"4","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:53.0) Gecko/20100101 Firefox/53.0","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"N-01924886"}'::jsonb,
  '2024-08-27'::timestamp,
  'Bayu Herlambang',
  '2024-08-27'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 234
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-06453072',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9140X/ A9520TZ - (Hino)',
  'FLEET',
  391,
  '2019-07-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-235',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A9140X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":235,"no_polisi":"A9140X/ A9520TZ","no_chasis":"MJEFL8JTLDJM15452","no_machine":"J08EUFJ52234","brand_id":2,"brand_name":"Hino","cabinet_slot":"A1","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K-06453072"}'::jsonb,
  '2019-07-19'::timestamp,
  'Bayu Herlambang',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 235
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-06453075',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9143X/ A9523TZ - (Hino)',
  'FLEET',
  394,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-236',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A9143X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":236,"no_polisi":"A9143X/ A9523TZ","no_chasis":"MJEFL8JTLDJM15543","no_machine":"JO8EUFJ52523","brand_id":2,"brand_name":"Hino","cabinet_slot":"A1","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-06453075"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 236
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-06453079',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9144X/ A9524TZ - (Hino)',
  'FLEET',
  395,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-238',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A9144X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":238,"no_polisi":"A9144X/ A9524TZ","no_chasis":"MJEFL8JTLDJM15542","no_machine":"J08EUFJ52522","brand_id":2,"brand_name":"Hino","cabinet_slot":"A1","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-06453079"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 238
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-06453073',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9141X/ A9521TZ - (Hino)',
  'FLEET',
  392,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-239',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A9141X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":239,"no_polisi":"A9141X/ A9521TZ","no_chasis":"MJEFL8JTLDJM15465","no_machine":"J08EUFJ52265","brand_id":2,"brand_name":"Hino","cabinet_slot":"A1","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-06453073"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 239
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-06453069',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9137X/ A9519TZ - (Hino)',
  'FLEET',
  388,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-240',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9137X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":240,"no_polisi":"A9137X/ A9519TZ","no_chasis":"MJEFL8JTLDJM15466","no_machine":"J08EUFJ52266","brand_id":2,"brand_name":"Hino","cabinet_slot":"A1","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-06453069"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 240
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-06453074',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9142X/ A9522TZ - (Hino)',
  'FLEET',
  393,
  '2026-04-20'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-242',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A9522TZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":242,"no_polisi":"A9142X/ A9522TZ","no_chasis":"MJEFL8JTLDJM15453","no_machine":"J08EUFJ52235","brand_id":2,"brand_name":"Hino","cabinet_slot":"A1","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K-06453074"}'::jsonb,
  '2026-04-20'::timestamp,
  'Bayu Herlambang',
  '2026-04-20'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 242
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660564',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9758X - (Hino)',
  'FLEET',
  141,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-243',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'A9758X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":243,"no_polisi":"A9758X","no_chasis":"MJEC1JG43F5124885","no_machine":"W04DTRR20734","brand_id":2,"brand_name":"Hino","cabinet_slot":"A5","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660564"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 243
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660565',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9759X - (Hino)',
  'FLEET',
  142,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-244',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'A9759X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":244,"no_polisi":"A9759X","no_chasis":"MJEC1JG43F5124894","no_machine":"W04DTRR20750","brand_id":2,"brand_name":"Hino","cabinet_slot":"A5","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660565"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 244
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660566',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9760X - (Hino)',
  'FLEET',
  666,
  '2018-04-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-245',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'A9760X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":245,"no_polisi":"A9760X","no_chasis":"MJEC1JG43F5124893","no_machine":"W04DTRR20749","brand_id":2,"brand_name":"Hino","cabinet_slot":"A5","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":null},"id_number":"L-10660566"}'::jsonb,
  '2018-04-24'::timestamp,
  'Bayu Herlambang',
  '2018-04-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 245
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660575',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9762X - (Hino)',
  'FLEET',
  144,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-246',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'A9762X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":246,"no_polisi":"A9762X","no_chasis":"MJEC1JG43F5124886","no_machine":"W04DTRR20735","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660575"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 246
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660575',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9763X - (Hino)',
  'FLEET',
  145,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-247',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'A9763X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":247,"no_polisi":"A9763X","no_chasis":"MJEC1JG43F5124884","no_machine":"W04DTRR20735","brand_id":2,"brand_name":"Hino","cabinet_slot":"A5","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660575"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 247
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660577',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9764X - (Hino)',
  'FLEET',
  146,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-248',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'A9764X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":248,"no_polisi":"A9764X","no_chasis":"MJEC1JG43F5124888","no_machine":"W04DTRR20747","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660577"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 248
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660578',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9765X - (Hino)',
  'FLEET',
  147,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-249',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'A9765X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":249,"no_polisi":"A9765X","no_chasis":"MJEC1JG43F5124954","no_machine":"W04DTRR20773","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660578"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 249
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-01660579',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9766X - (Hino)',
  'FLEET',
  148,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-250',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'A9766X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":250,"no_polisi":"A9766X","no_chasis":"MJEC1JG43F5124892","no_machine":"W04DTRR20748","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-01660579"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 250
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660594',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9781X - (Hino)',
  'FLEET',
  149,
  '2018-04-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-251',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'A9781X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":251,"no_polisi":"A9781X","no_chasis":"MJEC1JG43F5124955","no_machine":"W04DTRR20774","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":null},"id_number":"L-10660594"}'::jsonb,
  '2018-04-24'::timestamp,
  'Bayu Herlambang',
  '2018-04-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 251
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660595',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9782X - (Hino)',
  'FLEET',
  444,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-252',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'A9782X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":252,"no_polisi":"A9782X","no_chasis":"MJEC1JG43F5124887","no_machine":"W04DTRR20746","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660595"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 252
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660917',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9806X/A9507TX - (Hino)',
  'FLEET',
  182,
  '2020-05-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-253',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9507TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":253,"no_polisi":"A9806X/A9507TX","no_chasis":"MJEFM8JNKEJM44124","no_machine":"J08EUFJ67568","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2014,"acquisition_year":2014,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660917"}'::jsonb,
  '2020-05-04'::timestamp,
  'Bayu Herlambang',
  '2020-05-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 253
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660978',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9807X/A9508TX - (Hino)',
  'FLEET',
  183,
  '2022-10-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-254',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9508TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":254,"no_polisi":"A9807X/A9508TX","no_chasis":"MJEFM8JNKEJM44123","no_machine":"J08EUFJ67567","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2014,"acquisition_year":2014,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660978"}'::jsonb,
  '2022-10-17'::timestamp,
  'Bayu Herlambang',
  '2022-10-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 254
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660919',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9808X/A9509TX - (Hino)',
  'FLEET',
  184,
  '2020-05-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-255',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9509TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":255,"no_polisi":"A9808X/A9509TX","no_chasis":"MJEFM8JNKEJM44122","no_machine":"J08EUFJ67566","brand_id":2,"brand_name":"Hino","cabinet_slot":"R2","production_year":2014,"acquisition_year":2014,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660919"}'::jsonb,
  '2020-05-04'::timestamp,
  'Bayu Herlambang',
  '2020-05-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 255
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660920',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9809X/A9510TX - (Hino)',
  'FLEET',
  185,
  '2025-06-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-256',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9510TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":256,"no_polisi":"A9809X/A9510TX","no_chasis":"MJEFM8JNKEJM44121","no_machine":"J08EUFJ67565","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2014,"acquisition_year":2014,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660920"}'::jsonb,
  '2025-06-10'::timestamp,
  'Bayu Herlambang',
  '2025-06-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 256
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660923',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9812X/A9512TX - (Hino)',
  'FLEET',
  126,
  '2025-06-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-257',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9512TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":257,"no_polisi":"A9812X/A9512TX","no_chasis":"MJEFM8JNKEJM44526","no_machine":"J08EUFJ68288","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2014,"acquisition_year":2014,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660923"}'::jsonb,
  '2025-06-10'::timestamp,
  'Bayu Herlambang',
  '2025-06-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 257
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660924',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9813X/A9514TX - (Hino)',
  'FLEET',
  128,
  '2020-05-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-258',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9514TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":258,"no_polisi":"A9813X/A9514TX","no_chasis":"MJEFM8JNKEJM44525","no_machine":"J08EUFJ68287","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2014,"acquisition_year":2014,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660924"}'::jsonb,
  '2020-05-04'::timestamp,
  'Bayu Herlambang',
  '2020-05-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 258
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660925',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9814X/A9522TX - (Hino)',
  'FLEET',
  129,
  '2020-05-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-259',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9522TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":259,"no_polisi":"A9814X/A9522TX","no_chasis":"MJEFM8JNKEJM44125","no_machine":"J08EUFJ67569","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2014,"acquisition_year":2014,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660925"}'::jsonb,
  '2020-05-04'::timestamp,
  'Bayu Herlambang',
  '2020-05-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 259
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660926',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9815X/A9523TX - (Hino)',
  'FLEET',
  127,
  '2020-05-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-260',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9523TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":260,"no_polisi":"A9815X/A9523TX","no_chasis":"MJEFM8JNKEJM44108","no_machine":"J08EUFJ67540","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2014,"acquisition_year":2014,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660926"}'::jsonb,
  '2020-05-04'::timestamp,
  'Bayu Herlambang',
  '2020-05-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 260
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660927',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9816X/A9524TX - (Hino)',
  'FLEET',
  188,
  '2025-06-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-261',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9524TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":261,"no_polisi":"A9816X/A9524TX","no_chasis":"MJEFM8JNKEJM44106","no_machine":"J08EUFJ67538","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2014,"acquisition_year":2014,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660927"}'::jsonb,
  '2025-06-10'::timestamp,
  'Bayu Herlambang',
  '2025-06-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 261
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660928',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9817X/A9526TX - (Hino)',
  'FLEET',
  130,
  '2025-06-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-262',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9526TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":262,"no_polisi":"A9817X/A9526TX","no_chasis":"MJEFM8JNKEJM44107","no_machine":"J08EUFJ67539","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2014,"acquisition_year":2014,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660928"}'::jsonb,
  '2025-06-10'::timestamp,
  'Bayu Herlambang',
  '2025-06-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 262
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660532',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9746X - (Hino)',
  'FLEET',
  131,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-263',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-NOT-AVAIL' LIMIT 1),
  'BPKB_A9746X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":263,"no_polisi":"A9746X","no_chasis":"MJEC1JG43F5123050","no_machine":"W04DTRR19203","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660532"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 263
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660533',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9747X - (Hino)',
  'FLEET',
  132,
  '2018-04-30'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-264',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9747X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":264,"no_polisi":"A9747X","no_chasis":"MJEC1JG43F5123124","no_machine":"W04DTRR19251","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":null},"id_number":"L-10660533"}'::jsonb,
  '2018-04-30'::timestamp,
  'Bayu Herlambang',
  '2018-04-30'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 264
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660534',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9748X - (Hino)',
  'FLEET',
  133,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-265',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9748X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":265,"no_polisi":"A9748X","no_chasis":"MJEC1JG43F5123122","no_machine":"W04DTRR19249","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660534"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 265
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660535',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9749X - (Hino)',
  'FLEET',
  134,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-266',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9749X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":266,"no_polisi":"A9749X","no_chasis":"MJEC1JG43F5123050","no_machine":"WO4DTRR19248","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660535"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 266
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660536',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9750X - (Hino)',
  'FLEET',
  135,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-267',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9750X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":267,"no_polisi":"A9750X","no_chasis":"MJEC1JG43F5123123","no_machine":"W04DTRR19250","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660536"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 267
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660537',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9751X - (Hino)',
  'FLEET',
  136,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-268',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9751X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":268,"no_polisi":"A9751X","no_chasis":"MJEC1JG43F5123120","no_machine":"W04DTRR19247","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660537"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 268
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660538',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9752X - (Hino)',
  'FLEET',
  137,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-269',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9752X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":269,"no_polisi":"A9752X","no_chasis":"MJEC1JG43F5123119","no_machine":"W04DTRR19246","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660538"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 269
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660539',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9753X - (Hino)',
  'FLEET',
  138,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-270',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9753X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":270,"no_polisi":"A9753X","no_chasis":"MJEC1JG43F5123118","no_machine":"W04DTRR19245","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10660539"}'::jsonb,
  '2022-03-15'::timestamp,
  'Bayu Herlambang',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 270
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660540',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9754X - (Hino)',
  'FLEET',
  139,
  '2019-09-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-271',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_A9754X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":271,"no_polisi":"A9754X","no_chasis":"MJEC1JG43F5123117","no_machine":"W04DTRR19244","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":"Fri A"},"id_number":"L-10660540"}'::jsonb,
  '2019-09-23'::timestamp,
  'Bayu Herlambang',
  '2019-09-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 271
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10660541',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9755X - (Hino)',
  'FLEET',
  140,
  '2018-05-02'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-272',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9755X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":272,"no_polisi":"A9755X","no_chasis":"MJEC1JG43F5123116","no_machine":"W04DTRR19243","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36","ip_address":"10.2.2.33","created_user":"Bayu Herlambang","modified_user":null},"id_number":"L-10660541"}'::jsonb,
  '2018-05-02'::timestamp,
  'Bayu Herlambang',
  '2018-05-02'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 272
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K - 01794833',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8627VL/A8149TY - (Mitshubishi)',
  'FLEET',
  123,
  '2019-07-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-274',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A8627VL_-_A8149TY.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":274,"no_polisi":"A8627VL/A8149TY","no_chasis":"MHML300DP3R300462","no_machine":"4D56C310745","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A1","production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36","ip_address":"10.2.2.186","created_user":"Bayu Herlambang","modified_user":"Herry Arisyam"},"id_number":"K - 01794833"}'::jsonb,
  '2019-07-23'::timestamp,
  'Bayu Herlambang',
  '2019-07-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 274
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K - 06453070',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9138X/ A9517TZ - (Hino)',
  'FLEET',
  389,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-275',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9138X_-_A9517TZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":275,"no_polisi":"A9138X/ A9517TZ","no_chasis":"MJEFL8JTLDJM15464","no_machine":"J08EUFJ52264","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36","ip_address":"10.2.2.186","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K - 06453070"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 275
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K - 06453071',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9139X/ A9518TZ - (Hino)',
  'FLEET',
  390,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-276',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9139X_-_A9518TZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":276,"no_polisi":"A9139X/ A9518TZ","no_chasis":"MJEFL8JTLDJM15541","no_machine":"J08EUFJ52521","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36","ip_address":"10.2.2.186","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"K - 06453071"}'::jsonb,
  '2022-02-24'::timestamp,
  'Bayu Herlambang',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 276
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L - 10660921',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9810X/A9521TX - (Hino)',
  'FLEET',
  186,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-277',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'BPKB_A9521TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":277,"no_polisi":"A9810X/A9521TX","no_chasis":"MJEFM8JNKEJM44119","no_machine":"J08EUFJ67563","brand_id":2,"brand_name":"Hino","cabinet_slot":"R2","production_year":2014,"acquisition_year":2014,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36","ip_address":"10.2.2.186","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L - 10660921"}'::jsonb,
  '2026-02-23'::timestamp,
  'Bayu Herlambang',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 277
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L - 10660922',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9811X/A9511TX - (Hino)',
  'FLEET',
  187,
  '2025-06-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-278',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9511TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":278,"no_polisi":"A9811X/A9511TX","no_chasis":"MJEFM8JNKEJM44120","no_machine":"J08EUFJ67564","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2014,"acquisition_year":2014,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36","ip_address":"10.2.2.186","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L - 10660922"}'::jsonb,
  '2025-06-10'::timestamp,
  'Bayu Herlambang',
  '2025-06-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 278
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-04957934',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9046UI - (Volvo)',
  'FLEET',
  116,
  '2024-08-28'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-280',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9046UI.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":280,"no_polisi":"A9046UI","no_chasis":"YV2JM3ODOEB688547","no_machine":"D11319380","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R2","production_year":2014,"acquisition_year":2014,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36","ip_address":"10.2.2.158","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-04957934"}'::jsonb,
  '2024-08-28'::timestamp,
  'Bayu Herlambang',
  '2024-08-28'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 280
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-04957935',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9047UI - (Volvo)',
  'FLEET',
  117,
  '2024-08-28'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-281',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9047UI.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":281,"no_polisi":"A9047UI","no_chasis":"YV2JM30D8EB688134","no_machine":"D11319097","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R2","production_year":2014,"acquisition_year":2014,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36","ip_address":"10.2.2.158","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-04957935"}'::jsonb,
  '2024-08-28'::timestamp,
  'Bayu Herlambang',
  '2024-08-28'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 281
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-04957936',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9048UI - (Volvo)',
  'FLEET',
  903,
  '2023-12-13'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-282',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9048UI.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":282,"no_polisi":"A9048UI","no_chasis":"YV2JM30D9EB688207","no_machine":"D11319188","brand_id":9,"brand_name":"Volvo","cabinet_slot":"R2","production_year":2014,"acquisition_year":2014,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36","ip_address":"10.2.2.158","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-04957936"}'::jsonb,
  '2023-12-13'::timestamp,
  'Bayu Herlambang',
  '2023-12-13'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 282
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10700763',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9869X-A9586TX - (Hino)',
  'FLEET',
  262,
  '2025-07-01'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-283',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BANK-BPR' LIMIT 1),
  'BPKB_A9869X-A9586TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":283,"no_polisi":"A9869X-A9586TX","no_chasis":"MJEFM8JNKFJM45250","no_machine":"J08EUFJ69592","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36","ip_address":"10.2.2.158","created_user":"Bayu Herlambang","modified_user":"Joni Sutopo"},"id_number":"L-10700763"}'::jsonb,
  '2025-07-01'::timestamp,
  'Bayu Herlambang',
  '2025-07-01'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 283
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '7831358',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8427UD/ A9732U - (Volvo)',
  'FLEET',
  303,
  '2026-02-23'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-286',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'A8427UD.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":286,"no_polisi":"A8427UD/ A9732U","no_chasis":"YV2F2B3C5TA255951","no_machine":"283954","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"7831358"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 286
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '7831359',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8428UD/ A9733U - (Volvo)',
  'FLEET',
  304,
  '2026-02-23'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-287',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'A8428UD.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":287,"no_polisi":"A8428UD/ A9733U","no_chasis":"YV2F2B3C5TA 255950","no_machine":"283953","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"7831359"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 287
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '7831360',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8429UD/ A9734U - (Volvo)',
  'FLEET',
  305,
  '2026-02-23'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-288',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'A8429UD.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":288,"no_polisi":"A8429UD/ A9734U","no_chasis":"YV2F2B3C5TA 255947","no_machine":"283550","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"7831360"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 288
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '8915093',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8430UD/ A9735U - (Volvo)',
  'FLEET',
  306,
  '2026-02-23'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-289',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'A8430UD.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":289,"no_polisi":"A8430UD/ A9735U","no_chasis":"YV2F2B3CXTA 255944","no_machine":"283947","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"8915093"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 289
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0188131',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8677U/ A9674U - (Mitshubishi)',
  'FLEET',
  45,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-290',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'A8677U.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":290,"no_polisi":"A8677U/ A9674U","no_chasis":"MHMFN927MR000535","no_machine":"120535","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":null,"production_year":2001,"acquisition_year":2001,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"0188131"}'::jsonb,
  '2019-07-19'::timestamp,
  'Herry Arisyam',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 290
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0188147',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8678/  A9673U - (Mitshubishi)',
  'FLEET',
  44,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-291',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'A8678U.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":291,"no_polisi":"A8678/  A9673U","no_chasis":"MHMFN527N1R000506","no_machine":"120506","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":null,"production_year":2001,"acquisition_year":2001,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"0188147"}'::jsonb,
  '2019-07-19'::timestamp,
  'Herry Arisyam',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 291
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0280119',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8712/  A9756U - (Mitshubishi)',
  'FLEET',
  48,
  '2022-03-15'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-292',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'A8712U.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":292,"no_polisi":"A8712/  A9756U","no_chasis":"MHMFN527N1R000508","no_machine":"120508","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"NonBrankas","production_year":2001,"acquisition_year":2001,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"0280119"}'::jsonb,
  '2022-03-15'::timestamp,
  'Herry Arisyam',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 292
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0280120',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8713U / A9130W - (Mitshubishi)',
  'FLEET',
  43,
  '2021-03-22'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-293',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'A8713U.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":293,"no_polisi":"A8713U / A9130W","no_chasis":"MHMFN527N527N1R00051","no_machine":"120510","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":null,"production_year":2001,"acquisition_year":2001,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"0280120"}'::jsonb,
  '2021-03-22'::timestamp,
  'Herry Arisyam',
  '2021-03-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 293
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0026189',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8726U/  A9752U - (Mitshubishi)',
  'FLEET',
  47,
  '2019-07-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-294',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'A8726UD.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":294,"no_polisi":"A8726U/  A9752U","no_chasis":"MMTFN527EVC001021","no_machine":"6D16 GA1021","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"0026189"}'::jsonb,
  '2019-07-19'::timestamp,
  'Herry Arisyam',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 294
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'I-11008783',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9724W-A9239TY - (Hino)',
  'FLEET',
  399,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-295',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'BPKB_A9724W-A9239TY.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":295,"no_polisi":"A9724W-A9239TY","no_chasis":"MJEFL8JTLCJM14012","no_machine":"J08EUFJ44206","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"I-11008783"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 295
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6271425',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9411UA - (Volvo)',
  'FLEET',
  298,
  '2026-02-23'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-296',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'A9411UA.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":296,"no_polisi":"A9411UA","no_chasis":"YV2F2B3D9TA 244491","no_machine":"277005","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1997,"acquisition_year":1997,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"6271425"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 296
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3369436',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9572U - (Volvo)',
  'FLEET',
  58,
  '2019-07-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-297',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'A9572U.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":297,"no_polisi":"A9572U","no_chasis":"YV2F5A6AITC 751991","no_machine":"TD103ES 384 277035","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"3369436"}'::jsonb,
  '2019-07-10'::timestamp,
  'Herry Arisyam',
  '2019-07-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 297
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '7114784',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9681U - (Volvo)',
  'FLEET',
  119,
  '2019-07-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-298',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'A9681U.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":298,"no_polisi":"A9681U","no_chasis":"YV2J4CJD13A561128","no_machine":"D9 0044403 A2 A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2002,"acquisition_year":2002,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"7114784"}'::jsonb,
  '2019-07-10'::timestamp,
  'Herry Arisyam',
  '2019-07-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 298
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '11008781',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9722W-A9236TY - (Hino)',
  'FLEET',
  397,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-299',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'BPKB_A9722W-A9236TY.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":299,"no_polisi":"A9722W-A9236TY","no_chasis":"MJEFL8JTLCJM13995","no_machine":"J08EUFJ44051","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"11008781"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 299
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '11008782',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9723W-A9237TY - (Hino)',
  'FLEET',
  398,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-300',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'BPKB_A9723W-A9237TY.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":300,"no_polisi":"A9723W-A9237TY","no_chasis":"MJEFL8JTLCJM13986","no_machine":"J08EUFJ44000","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"11008782"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 300
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '11010795',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9730W-A9238TY - (Hino)',
  'FLEET',
  254,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-301',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'BPKB_A9730W-A9238TY.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":301,"no_polisi":"A9730W-A9238TY","no_chasis":"MJEFL8JTLCJM14048","no_machine":"J08EUF744488","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"11010795"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 301
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '11010796',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9731W-A9240TY - (Hino)',
  'FLEET',
  400,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-302',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'BPKB_A9731W-A9240TY.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":302,"no_polisi":"A9731W-A9240TY","no_chasis":"MJEFL8JTLCJM14114","no_machine":"J08EUFJ45056","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"11010796"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 302
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-04652212',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9754TZ - (Volvo)',
  'FLEET',
  115,
  '2023-12-12'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-303',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'A9754TZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":303,"no_polisi":"A9754TZ","no_chasis":"YV2J4CMC643558177","no_machine":"D12 317121","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"K-04652212"}'::jsonb,
  '2023-12-12'::timestamp,
  'Herry Arisyam',
  '2023-12-12'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 303
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '8241268',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9011HU/B9049VL - (Hino)',
  'FLEET',
  NULL,
  '2019-07-18'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-304',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9011HU.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":304,"no_polisi":"B9011HU/B9049VL","no_chasis":"MJEFMIJNP5JD 13698","no_machine":"J08CTGJ 13767","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2005,"acquisition_year":2005,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"8241268"}'::jsonb,
  '2019-07-18'::timestamp,
  'Herry Arisyam',
  '2019-07-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 304
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2958533',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9011JN - (Hino)',
  'FLEET',
  11,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-305',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9011JN.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":305,"no_polisi":"B9011JN","no_chasis":"MJFMIJNP5JD","no_machine":"J08CTGJ 11821","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2005,"acquisition_year":2005,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"2958533"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 305
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '8240670',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9012HU/B9048VL - (Hino)',
  'FLEET',
  NULL,
  '2019-07-18'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-306',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9012HU.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":306,"no_polisi":"B9012HU/B9048VL","no_chasis":"MJEFMIJNP5JD 13654","no_machine":"J08CTGJ 13763","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2005,"acquisition_year":2005,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"8240670"}'::jsonb,
  '2019-07-18'::timestamp,
  'Herry Arisyam',
  '2019-07-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 306
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '8240671',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9013HU/B9041VL - (Hino)',
  'FLEET',
  NULL,
  '2019-07-18'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-307',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9013HU.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":307,"no_polisi":"B9013HU/B9041VL","no_chasis":"MJEFMIJNP5JD 13656","no_machine":"J08CTGJ 13765","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2005,"acquisition_year":2005,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"8240671"}'::jsonb,
  '2019-07-18'::timestamp,
  'Herry Arisyam',
  '2019-07-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 307
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '8241470',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9016HU/B9045VL - (Hino)',
  'FLEET',
  NULL,
  '2019-07-18'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-308',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9016HU.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":308,"no_polisi":"B9016HU/B9045VL","no_chasis":"MJEFMIJNP5JD 13666","no_machine":"J08CTGJ 13773","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2005,"acquisition_year":2005,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"8241470"}'::jsonb,
  '2019-07-18'::timestamp,
  'Herry Arisyam',
  '2019-07-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 308
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '8241063',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9019HU/B9044VL - (Hino)',
  'FLEET',
  NULL,
  '2019-07-18'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-309',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9019HU.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":309,"no_polisi":"B9019HU/B9044VL","no_chasis":"MJEFMIJNP5JD 13659","no_machine":"J08CTGJ 13769","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2005,"acquisition_year":2005,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"8241063"}'::jsonb,
  '2019-07-18'::timestamp,
  'Herry Arisyam',
  '2019-07-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 309
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2958501',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9051JN - (Hino)',
  'FLEET',
  NULL,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-310',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9051JN.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":310,"no_polisi":"B9051JN","no_chasis":"MJEFMIJNP5JD 11829","no_machine":"J08CTGJ 11822","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2005,"acquisition_year":2005,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"2958501"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 310
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2031767',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9071DS - (Honda)',
  'FLEET',
  542,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-311',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9071DS.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":311,"no_polisi":"B9071DS","no_chasis":"MJEFM22M2KD 17473","no_machine":"EM100 J 17876","brand_id":1,"brand_name":"Honda","cabinet_slot":null,"production_year":2002,"acquisition_year":2002,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"2031767"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 311
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2031766',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9072DS - (Hino)',
  'FLEET',
  NULL,
  '2020-03-02'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-312',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9072DS.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":312,"no_polisi":"B9072DS","no_chasis":"MJEFM226M2KD 17468","no_machine":"EM100 J 17784","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2002,"acquisition_year":2002,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"2031766"}'::jsonb,
  '2020-03-02'::timestamp,
  'Herry Arisyam',
  '2020-03-02'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 312
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2032075',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9077AG - (Hino)',
  'FLEET',
  670,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-313',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9077AG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":313,"no_polisi":"B9077AG","no_chasis":"MJEFM226M2KD 17483","no_machine":"EM100J 17883","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2002,"acquisition_year":2002,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"2032075"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 313
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2032274',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9078AG - (Hino)',
  'FLEET',
  NULL,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-314',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9078AG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":314,"no_polisi":"B9078AG","no_chasis":"MJEFM226M2KD 17497","no_machine":"EM100 J 17897","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2002,"acquisition_year":2002,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"2032274"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 314
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2031768',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9079AG - (Hino)',
  'FLEET',
  42,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-315',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9079AG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":315,"no_polisi":"B9079AG","no_chasis":"MJEFM266M2KD 17487","no_machine":"EMI100 J 17887","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2002,"acquisition_year":2002,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"2031768"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 315
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2031945',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9080AG - (Hino)',
  'FLEET',
  NULL,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-316',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9080AG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":316,"no_polisi":"B9080AG","no_chasis":"MJEFM266M2KD 17482","no_machine":"EMI100 J 17882","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2002,"acquisition_year":2002,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"2031945"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 316
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2032973',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9081AG - (Hino)',
  'FLEET',
  252,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-317',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9081AG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":317,"no_polisi":"B9081AG","no_chasis":"MJEFM266M2KD 17481","no_machine":"EMI100 J 17881","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2002,"acquisition_year":2002,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"2032973"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 317
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9961922',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9112XQ/A9062RM - (Volvo)',
  'FLEET',
  82,
  '2019-07-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-318',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9112XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":318,"no_polisi":"B9112XQ/A9062RM","no_chasis":"YV2J4CMC73A558303","no_machine":"D12317621","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"9961922"}'::jsonb,
  '2019-07-19'::timestamp,
  'Herry Arisyam',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 318
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9959354',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9113XQ - (Volvo)',
  'FLEET',
  83,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-319',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9113XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":319,"no_polisi":"B9113XQ","no_chasis":"YV2J4CMC53A555917","no_machine":"D12309658","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"9959354"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 319
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9949373',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9114XQ - (Volvo)',
  'FLEET',
  84,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-320',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9114XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":320,"no_polisi":"B9114XQ","no_chasis":"YV2J4CMC73A557331","no_machine":"D12313767","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"9949373"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 320
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '07425425',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9135XQ - (Volvo)',
  'FLEET',
  356,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-321',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9115XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":321,"no_polisi":"B9135XQ","no_chasis":"YV2J4CMC9YC763171","no_machine":"D12C171708A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"07425425"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 321
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0408312',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9116XQ - (Volvo)',
  'FLEET',
  86,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-322',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9116XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":322,"no_polisi":"B9116XQ","no_chasis":"YV2J4CMC63A555747","no_machine":"D12309330","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"0408312"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 322
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9952985',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9117XQ - (Volvo)',
  'FLEET',
  87,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-323',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9117XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":323,"no_polisi":"B9117XQ","no_chasis":"YV2J4CMC03A558305","no_machine":"D12317624","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"9952985"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 323
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9952961',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9118XQ - (Volvo)',
  'FLEET',
  88,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-324',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9118XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":324,"no_polisi":"B9118XQ","no_chasis":"YV2J4CMC83A558178","no_machine":"D12317211","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"9952961"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 324
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9952960',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9119XQ - (Volvo)',
  'FLEET',
  89,
  '2025-06-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-325',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9119XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":325,"no_polisi":"B9119XQ","no_chasis":"YV2J4CMC93A557329","no_machine":"D12313765","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"9952960"}'::jsonb,
  '2025-06-17'::timestamp,
  'Herry Arisyam',
  '2025-06-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 325
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9952984',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9120XQ - (Volvo)',
  'FLEET',
  90,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-326',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9120XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":326,"no_polisi":"B9120XQ","no_chasis":"YV2J4CMC73A558186","no_machine":"D12317202","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"9952984"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 326
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9961873',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9122XQ - (Volvo)',
  'FLEET',
  92,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-327',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9122XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":327,"no_polisi":"B9122XQ","no_chasis":"YV2J4CMCX3A558182","no_machine":"D12317207","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"9961873"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 327
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9959383',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9124XQ - (Volvo)',
  'FLEET',
  93,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-328',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9124XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":328,"no_polisi":"B9124XQ","no_chasis":"YV2J4CMC93A558304","no_machine":"D12317622","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"9959383"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 328
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9946258',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9125XQ - (Volvo)',
  'FLEET',
  94,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-329',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9125XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":329,"no_polisi":"B9125XQ","no_chasis":"YV2J4CMC63A557529","no_machine":"D12314700","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"9946258"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 329
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9952959',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9126XQ - (Volvo)',
  'FLEET',
  95,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-330',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9126XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":330,"no_polisi":"B9126XQ","no_chasis":"YV2J4CMC53A558185","no_machine":"D12317205","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"9952959"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 330
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9947589',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9127XQ - (Volvo)',
  'FLEET',
  469,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-331',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9127XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":331,"no_polisi":"B9127XQ","no_chasis":"YVJ4CMC03A557526","no_machine":"D12314694","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"9947589"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 331
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9959389',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9128XQ - (Volvo)',
  'FLEET',
  97,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-333',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9128XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":333,"no_polisi":"B9128XQ","no_chasis":"YV2J4CMCX3A558408","no_machine":"D12317797","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"9959389"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 333
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9959355',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9129XQ - (Volvo)',
  'FLEET',
  485,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-334',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9129XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":334,"no_polisi":"B9129XQ","no_chasis":"YV2J4CMC63A55082","no_machine":"D12317021","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"9959355"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 334
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '995250',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9130XQ - (Volvo)',
  'FLEET',
  99,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-335',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9130XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":335,"no_polisi":"B9130XQ","no_chasis":"YV2J4CMC13A558183","no_machine":"D12317208","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"995250"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 335
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0745428',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9132XQ - (Volvo)',
  'FLEET',
  355,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-336',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9132XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":336,"no_polisi":"B9132XQ","no_chasis":"YV2J4DMC4YC763255","no_machine":"D12C174908A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"0745428"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 336
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0753434',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9133XQ - (Volvo)',
  'FLEET',
  101,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-337',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9133XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":337,"no_polisi":"B9133XQ","no_chasis":"YV2J4DMC0YC762894","no_machine":"D12C161289A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"0753434"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 337
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0408322',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9137XQ - (Volvo)',
  'FLEET',
  357,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-338',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9137XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":338,"no_polisi":"B9137XQ","no_chasis":"YV2J4DMC4YA514515","no_machine":"D12C185706A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"0408322"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 338
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9904705',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9134XQ - (Volvo)',
  'FLEET',
  102,
  '2019-07-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-339',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9134XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":339,"no_polisi":"B9134XQ","no_chasis":"YV2J4DMC5YA507330","no_machine":"D12C166720A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"9904705"}'::jsonb,
  '2019-07-03'::timestamp,
  'Herry Arisyam',
  '2019-07-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 339
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9959356',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9139XQ - (Volvo)',
  'FLEET',
  104,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-340',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9139XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":340,"no_polisi":"B9139XQ","no_chasis":"YV2J4DAC3YA511156","no_machine":"D12C176494A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"9959356"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 340
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '04083232',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9140XQ - (Volvo)',
  'FLEET',
  111,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-341',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9140XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":341,"no_polisi":"B9140XQ","no_chasis":"YV2J4DMC0YA515130","no_machine":"D12C187550A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"04083232"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 341
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0745421',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9142XQ - (Volvo)',
  'FLEET',
  550,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-342',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9142XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":342,"no_polisi":"B9142XQ","no_chasis":"YV2J4DMC4YA5J8354","no_machine":"D12C197032A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"0745421"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 342
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9961887',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9143XQ - (Volvo)',
  'FLEET',
  359,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-343',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9143XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":343,"no_polisi":"B9143XQ","no_chasis":"YV2J4DAC1YA511155","no_machine":"D12C176493A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"9961887"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 343
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9904755',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9144XQ - (Volvo)',
  'FLEET',
  106,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-344',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9144XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":344,"no_polisi":"B9144XQ","no_chasis":"YV2J4DMC5YC763250","no_machine":"D12C174903A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"9904755"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 344
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0745426',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9145XQ - (Volvo)',
  'FLEET',
  360,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-345',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9145XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":345,"no_polisi":"B9145XQ","no_chasis":"YV234DACXYC762874","no_machine":"D12C16155A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"0745426"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 345
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0753430',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9146XQ - (Volvo)',
  'FLEET',
  217,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-346',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9146XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":346,"no_polisi":"B9146XQ","no_chasis":"YV2J4DPC7YC763357","no_machine":"D12C178659A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"0753430"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 346
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0828722',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9147XQ - (Volvo)',
  'FLEET',
  361,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-347',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9147XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":347,"no_polisi":"B9147XQ","no_chasis":"YV2A4DMC8XC761605","no_machine":"D12C140179A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"0828722"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 347
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '1118780',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9148XQ - (Volvo)',
  'FLEET',
  112,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-348',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9148XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":348,"no_polisi":"B9148XQ","no_chasis":"YV2J4DMC7XC761658","no_machine":"D12C141080A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"1118780"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 348
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '1107333',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9149XQ - (Volvo)',
  'FLEET',
  417,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-349',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9149XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":349,"no_polisi":"B9149XQ","no_chasis":"YV2A4DMC2XC761325","no_machine":"D12C136193A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"1107333"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 349
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '1107447',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9150XQ - (Volvo)',
  'FLEET',
  418,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-350',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9150XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":350,"no_polisi":"B9150XQ","no_chasis":"YV2A40MC5XC761268","no_machine":"D12C135518A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"1107447"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 350
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '1107060',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9151XQ - (Volvo)',
  'FLEET',
  107,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-351',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9151XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":351,"no_polisi":"B9151XQ","no_chasis":"YV2J4DMCXXC762027","no_machine":"D12C146752A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"1107060"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 351
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0745433',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9153XQ - (Volvo)',
  'FLEET',
  108,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-352',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9153XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":352,"no_polisi":"B9153XQ","no_chasis":"YV2A4DMC4XC761813","no_machine":"D12C142874A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"0745433"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 352
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '1107271',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9152XQ - (Volvo)',
  'FLEET',
  433,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-353',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9152XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":353,"no_polisi":"B9152XQ","no_chasis":"YV2A4MDC7XC762132","no_machine":"D12C148119A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"1107271"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 353
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '1107307',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9154XQ - (Volvo)',
  'FLEET',
  109,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-354',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9154XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":354,"no_polisi":"B9154XQ","no_chasis":"YV2A4DMC0XC762327","no_machine":"D12C150453A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"1107307"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 354
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '1442503',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9162XQ - (Volvo)',
  'FLEET',
  110,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-355',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9162XQ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":355,"no_polisi":"B9162XQ","no_chasis":"YV2A4DMC5XC761996","no_machine":"D12C146025A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"1442503"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 355
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5786544',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B91727ZO/A9578U - (Volvo)',
  'FLEET',
  301,
  '2023-12-11'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-356',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9172ZO.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":356,"no_polisi":"B91727ZO/A9578U","no_chasis":"YV2F2B3D45A 237009","no_machine":"271542","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1997,"acquisition_year":1997,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5786544"}'::jsonb,
  '2023-12-11'::timestamp,
  'Herry Arisyam',
  '2023-12-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 356
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5786546',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9174ZO - (Volvo)',
  'FLEET',
  NULL,
  '2026-02-23'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-357',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9174ZOLA9579UB.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":357,"no_polisi":"B9174ZO","no_chasis":"YV2F2B3DXSA 2411562","no_machine":"274166","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5786546"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 357
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0937330',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9216LB - (Volvo)',
  'FLEET',
  NULL,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-358',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9216LB.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":358,"no_polisi":"B9216LB","no_chasis":"YV2F2B3D3RA 377401","no_machine":"250855","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1992,"acquisition_year":1992,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"0937330"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 358
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0937332',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9217LB/ A9553U - (Volvo)',
  'FLEET',
  299,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-359',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9217LB.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":359,"no_polisi":"B9217LB/ A9553U","no_chasis":"YV2F2B3D5PA 377383","no_machine":"250843","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1992,"acquisition_year":1992,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"0937332"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 359
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '1440067',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9246TL/ A9569U - (Volvo)',
  'FLEET',
  NULL,
  '2019-07-18'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-360',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9246TLLA9569UB.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":360,"no_polisi":"B9246TL/ A9569U","no_chasis":"SCVF2B3DXRC907 001","no_machine":"259981","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1993,"acquisition_year":1993,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"1440067"}'::jsonb,
  '2019-07-18'::timestamp,
  'Herry Arisyam',
  '2019-07-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 360
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '1440069',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9247TL/ A9568U - (Volvo)',
  'FLEET',
  300,
  '2026-02-23'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-361',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9247TLLA9568UB.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":361,"no_polisi":"B9247TL/ A9568U","no_chasis":"SCVF2B3D0RC 907010","no_machine":"260052","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1993,"acquisition_year":1993,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"1440069"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 361
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3829450',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9276QZ - (Volvo)',
  'FLEET',
  551,
  '2023-12-12'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-362',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9276QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":362,"no_polisi":"B9276QZ","no_chasis":"V2A4DMC4XC762069","no_machine":"D12C147083A","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"3829450"}'::jsonb,
  '2023-12-12'::timestamp,
  'Herry Arisyam',
  '2023-12-12'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 362
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '383075',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9278QZ - (Volvo)',
  'FLEET',
  NULL,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-363',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9278QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":363,"no_polisi":"B9278QZ","no_chasis":"YV244DMC6XC 762218","no_machine":"D12C148911A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"383075"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 363
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3830750',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9279QZ - (Volvo)',
  'FLEET',
  73,
  '2020-10-14'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-364',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9279QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":364,"no_polisi":"B9279QZ","no_chasis":"YV2J4DMC4XC 762072","no_machine":"D12C1487086A","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"3830750"}'::jsonb,
  '2020-10-14'::timestamp,
  'Herry Arisyam',
  '2020-10-14'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 364
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3830482',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9280QZ - (Volvo)',
  'FLEET',
  113,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-365',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9280QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":365,"no_polisi":"B9280QZ","no_chasis":"YV2J4DMC4XC 761956","no_machine":"D12C145392A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"3830482"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 365
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'H-04677713',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9281XA - (Scania)',
  'FLEET',
  294,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-366',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9281XA.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":366,"no_polisi":"B9281XA","no_chasis":"4378019","no_machine":"4118266","brand_id":8,"brand_name":"Scania","cabinet_slot":"NonBrankas","production_year":1997,"acquisition_year":1997,"color_code":"13","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"H-04677713"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 366
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3830881',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9282QZ - (Volvo)',
  'FLEET',
  452,
  '2023-12-12'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-367',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9282QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":367,"no_polisi":"B9282QZ","no_chasis":"YV2A4DMCOXC 761985","no_machine":"D12C145587A","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"3830881"}'::jsonb,
  '2023-12-12'::timestamp,
  'Herry Arisyam',
  '2023-12-12'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 367
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3830481',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9283QZ - (Volvo)',
  'FLEET',
  338,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-368',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9283QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":368,"no_polisi":"B9283QZ","no_chasis":"YV2A4DMC4XC 762007","no_machine":"D12C1486162A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"3830481"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 368
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'H-04684866',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9283XA - (Scania)',
  'FLEET',
  295,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-369',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9283XA.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":369,"no_polisi":"B9283XA","no_chasis":"4376427","no_machine":"4117524","brand_id":8,"brand_name":"Scania","cabinet_slot":"NonBrankas","production_year":1997,"acquisition_year":1997,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"H-04684866"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 369
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'H-04673812',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9284XA - (Scania)',
  'FLEET',
  296,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-370',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9284XA.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":370,"no_polisi":"B9284XA","no_chasis":"4376673","no_machine":"4117636","brand_id":8,"brand_name":"Scania","cabinet_slot":"NonBrankas","production_year":1997,"acquisition_year":1997,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"H-04673812"}'::jsonb,
  '2022-02-24'::timestamp,
  'Herry Arisyam',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 370
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'H-04673813',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9287XA - (Volvo)',
  'FLEET',
  NULL,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-371',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9283XA_3aov1qvhkc00o.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":371,"no_polisi":"B9287XA","no_chasis":"4376465","no_machine":"4117534","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"H-04673813"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 371
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'H-04684867',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9288XA - (Scania)',
  'FLEET',
  NULL,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-372',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9288XA.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":372,"no_polisi":"B9288XA","no_chasis":"4376484","no_machine":"4117536","brand_id":8,"brand_name":"Scania","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"13","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"H-04684867"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 372
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4198981',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9300QZ - (Volvo)',
  'FLEET',
  340,
  '2023-12-12'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-373',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9300QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":373,"no_polisi":"B9300QZ","no_chasis":"YV2A4DMC2XC 762409","no_machine":"D12C152013A","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"4198981"}'::jsonb,
  '2023-12-12'::timestamp,
  'Herry Arisyam',
  '2023-12-12'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 373
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4198802',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9302QZ - (Volvo)',
  'FLEET',
  75,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-374',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9302QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":374,"no_polisi":"B9302QZ","no_chasis":"YV2A4DMC5XC 762419","no_machine":"D12C152021A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"4198802"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 374
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4199498',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9303QZ - (Volvo)',
  'FLEET',
  76,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-375',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9303QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":375,"no_polisi":"B9303QZ","no_chasis":"YV2A4DMC9XC 762357","no_machine":"D12C151367A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"4199498"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 375
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4198523',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9304QZ - (Volvo)',
  'FLEET',
  341,
  '2019-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-376',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9304QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":376,"no_polisi":"B9304QZ","no_chasis":"YV2A4DMC6XC 762428","no_machine":"D12C152027A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":null},"id_number":"4198523"}'::jsonb,
  '2019-07-04'::timestamp,
  'Herry Arisyam',
  '2019-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 376
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4198249',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9306QZ - (Volvo)',
  'FLEET',
  343,
  '2023-12-12'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-377',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9306QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":377,"no_polisi":"B9306QZ","no_chasis":"YV2A4DMC8XC 762429","no_machine":"D12C152028A","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.142","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"4198249"}'::jsonb,
  '2023-12-12'::timestamp,
  'Herry Arisyam',
  '2023-12-12'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 377
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4198251',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9307QZ - (Volvo)',
  'FLEET',
  77,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-379',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9307QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":379,"no_polisi":"B9307QZ","no_chasis":"YV2A4DMC2XC 762412","no_machine":"D12C152016A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"4198251"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 379
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4198979',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9308QZ - (Volvo)',
  'FLEET',
  344,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-380',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9308QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":380,"no_polisi":"B9308QZ","no_chasis":"YV2A4DMC0XC 762408","no_machine":"D12C152012A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"4198979"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 380
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4198526',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9309QZ - (Volvo)',
  'FLEET',
  78,
  '2019-07-08'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-381',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9309QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":381,"no_polisi":"B9309QZ","no_chasis":"YV2A4DMC1XC 762420","no_machine":"D12C152022A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"4198526"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 381
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4199700',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9311QZ - (Volvo)',
  'FLEET',
  79,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-382',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9311QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":382,"no_polisi":"B9311QZ","no_chasis":"YV2A4DMC0XC 762070","no_machine":"D12C147085A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"4199700"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 382
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4198524',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9312QZ - (Volvo)',
  'FLEET',
  345,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-383',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9312QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":383,"no_polisi":"B9312QZ","no_chasis":"YV2A4DMC3XC 761978","no_machine":"D120145409A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"4198524"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 383
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4198024',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9313QZ - (Volvo)',
  'FLEET',
  346,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-384',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9313QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":384,"no_polisi":"B9313QZ","no_chasis":"YV2A4DMC8XC 761975","no_machine":"D12C145406A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"4198024"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 384
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4198023',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9314QZ - (Volvo)',
  'FLEET',
  347,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-385',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9314QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":385,"no_polisi":"B9314QZ","no_chasis":"YV2A4DMC2XC 762006","no_machine":"D12C146161A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":199,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"4198023"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 385
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4198250',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9315QZ - (Volvo)',
  'FLEET',
  416,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-386',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9315QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":386,"no_polisi":"B9315QZ","no_chasis":"YV2A4DMC9XC 762424","no_machine":"D12C152024A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"4198250"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 386
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4197793',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9316QZ - (Volvo)',
  'FLEET',
  80,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-387',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9316QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":387,"no_polisi":"B9316QZ","no_chasis":"YV2A4DMC0XC 762019","no_machine":"D12C146173A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"4197793"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 387
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4198248',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9317QZ - (Volvo)',
  'FLEET',
  81,
  '2023-12-12'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-388',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9317QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":388,"no_polisi":"B9317QZ","no_chasis":"YV2A4DMC4XC 762427","no_machine":"C12C152026A","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"4198248"}'::jsonb,
  '2023-12-12'::timestamp,
  'Herry Arisyam',
  '2023-12-12'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 388
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3533934',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9432TU - (Nissan)',
  'FLEET',
  49,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-389',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9432TU.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":389,"no_polisi":"B9432TU","no_chasis":"MHPCKA12B2P000197","no_machine":"NEG 025237TX","brand_id":6,"brand_name":"Nissan","cabinet_slot":null,"production_year":2002,"acquisition_year":2002,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"3533934"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 389
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3533933',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9433TU - (Nissan)',
  'FLEET',
  50,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-390',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9433TU.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":390,"no_polisi":"B9433TU","no_chasis":"MHPCKA12B2P000159","no_machine":"NEG 025151TX","brand_id":6,"brand_name":"Nissan","cabinet_slot":null,"production_year":2002,"acquisition_year":2002,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"3533933"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 390
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '7012896',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9450UZ - (Hino)',
  'FLEET',
  281,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-391',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9450UZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":391,"no_polisi":"B9450UZ","no_chasis":"MJEFM2PKK8JR10900","no_machine":"P11CUBJ10984","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2008,"acquisition_year":2008,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"7012896"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 391
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '7016182',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9451UZ - (Hino)',
  'FLEET',
  282,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-392',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9451UZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":392,"no_polisi":"B9451UZ","no_chasis":"MJEFM2PKKBJR10899","no_machine":"P11CUBJ10983","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2008,"acquisition_year":2008,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"7016182"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 392
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '7003361',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9453UZ - (Hino)',
  'FLEET',
  284,
  '2019-07-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-394',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9453UZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":394,"no_polisi":"B9453UZ","no_chasis":"MJEFM2PKK8JR10901","no_machine":"P11CUBJ10985","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2008,"acquisition_year":2008,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"7003361"}'::jsonb,
  '2019-07-19'::timestamp,
  'Herry Arisyam',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 394
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '7033638',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9452UZ - (Hino)',
  'FLEET',
  283,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-395',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9452UZ_3aproglsijy88.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":395,"no_polisi":"B9452UZ","no_chasis":"MJEFM2PKK8JRI10863","no_machine":"P11CUNBJ10947","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2008,"acquisition_year":2008,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"7033638"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 395
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '7033872',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9454UZ - (Hino)',
  'FLEET',
  285,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-396',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9454UZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":396,"no_polisi":"B9454UZ","no_chasis":"MJEFM2PKK8JR10848","no_machine":"P11CUBJ10932","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2008,"acquisition_year":2008,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"7033872"}'::jsonb,
  '2022-02-24'::timestamp,
  'Herry Arisyam',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 396
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'H-06349163',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9455EG - (Volvo)',
  'FLEET',
  309,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-397',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9455EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":397,"no_polisi":"B9455EG","no_chasis":"YV2F2B3CXTA 249741","no_machine":"280344","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"H-06349163"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 397
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '7033636',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9455UZ - (Hino)',
  'FLEET',
  530,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-398',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9455UZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":398,"no_polisi":"B9455UZ","no_chasis":"MJEFM2PKK8JR10862","no_machine":"P11CUBJ109346","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2008,"acquisition_year":2008,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"7033636"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 398
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'H-06619816',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9456EG - (Volvo)',
  'FLEET',
  310,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-399',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9456EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":399,"no_polisi":"B9456EG","no_chasis":"YV2F283C6TA254080","no_machine":"282850","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"H-06619816"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 399
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'H-07119911',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9457EG - (Volvo)',
  'FLEET',
  311,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-400',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9457EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":400,"no_polisi":"B9457EG","no_chasis":"YV2F283C9TA 249746","no_machine":"280389","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"H-07119911"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 400
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'H-07266022',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9458EG - (Volvo)',
  'FLEET',
  60,
  '2019-07-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-401',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9458EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":401,"no_polisi":"B9458EG","no_chasis":"YV2F2B30XTA IA254079","no_machine":"282849","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"H-07266022"}'::jsonb,
  '2019-07-10'::timestamp,
  'Herry Arisyam',
  '2019-07-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 401
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'H-05959766',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9459EG - (Volvo)',
  'FLEET',
  312,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-402',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9459EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":402,"no_polisi":"B9459EG","no_chasis":"YV2F2B3C5TA 249744","no_machine":"280387","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"H-05959766"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 402
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'H-05958738',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9460EG/A9468RM - (Volvo)',
  'FLEET',
  313,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-403',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'BPKB_B9460EG-A9468RM.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":403,"no_polisi":"B9460EG/A9468RM","no_chasis":"YV2F2B3C8TA 253674","no_machine":"282594","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1499,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"H-05958738"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 403
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'H-06349105',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9461EG/A9467RM - (Volvo)',
  'FLEET',
  314,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-404',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'BPKB_B9461EG-A9467RM.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":404,"no_polisi":"B9461EG/A9467RM","no_chasis":"YV2F283CXTA 253675","no_machine":"232595","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"H-06349105"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 404
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'H-05953901',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9462EG/A9469RM - (Volvo)',
  'FLEET',
  70,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-405',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'BPKB_B9462EG-A9469RM.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":405,"no_polisi":"B9462EG/A9469RM","no_chasis":"YV2F2B3C7TA 249745","no_machine":"280388","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"H-05953901"}'::jsonb,
  '2022-02-24'::timestamp,
  'Herry Arisyam',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 405
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240101',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9463EG - (Volvo)',
  'FLEET',
  316,
  '2023-12-11'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-406',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9463EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":406,"no_polisi":"B9463EG","no_chasis":"YV2F2B3C1TA 25376","no_machine":"282596","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5240101"}'::jsonb,
  '2023-12-11'::timestamp,
  'Herry Arisyam',
  '2023-12-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 406
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240100',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9465EG - (Volvo)',
  'FLEET',
  317,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-407',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9465EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":407,"no_polisi":"B9465EG","no_chasis":"YV2F2B3C1TA 254083","no_machine":"282853","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5240100"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 407
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3533900',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9502TU - (Nissan)',
  'FLEET',
  51,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-408',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9502TU.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":408,"no_polisi":"B9502TU","no_chasis":"MHPCKA12B2P000198","no_machine":"NEG 025407 TX","brand_id":6,"brand_name":"Nissan","cabinet_slot":null,"production_year":2002,"acquisition_year":2002,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"3533900"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 408
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3533932',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9503TU - (Nissan)',
  'FLEET',
  52,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-409',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9503TU.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":409,"no_polisi":"B9503TU","no_chasis":"MHPCKA12B2P00019","no_machine":"NEG 025408 TX","brand_id":6,"brand_name":"Nissan","cabinet_slot":null,"production_year":2002,"acquisition_year":2002,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"3533932"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 409
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '353395',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9504TU - (Nissan)',
  'FLEET',
  53,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-410',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9504TU.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":410,"no_polisi":"B9504TU","no_chasis":"MHPCKA12B2P000197","no_machine":"NEG 025409TX","brand_id":6,"brand_name":"Nissan","cabinet_slot":"NonBrankas","production_year":2002,"acquisition_year":2002,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"353395"}'::jsonb,
  '2022-02-24'::timestamp,
  'Herry Arisyam',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 410
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4545844',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9505KP - (Renault)',
  'FLEET',
  NULL,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-411',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9505KP.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":411,"no_polisi":"B9505KP","no_chasis":"YVFGBD02E40000310","no_machine":"86MO238965","brand_id":3,"brand_name":"Renault","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"4545844"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 411
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0944833',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9561JV - (Volvo)',
  'FLEET',
  349,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-412',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9561JV.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":412,"no_polisi":"B9561JV","no_chasis":"YV2J4DMC6YA514919","no_machine":"D12C186680A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"0944833"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 412
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0943729',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9562JV - (Volvo)',
  'FLEET',
  350,
  '2019-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-413',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9562JV.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":413,"no_polisi":"B9562JV","no_chasis":"YV2J4DMCOYA514981","no_machine":"D12C187064A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"0943729"}'::jsonb,
  '2019-07-08'::timestamp,
  'Herry Arisyam',
  '2019-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 413
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2581186',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9598JS/ A9577U - (Volvo)',
  'FLEET',
  535,
  '2019-07-18'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-414',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9598JS.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":414,"no_polisi":"B9598JS/ A9577U","no_chasis":"SCVF5A4D3SC 910540","no_machine":"1728817","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1995,"acquisition_year":1995,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"2581186"}'::jsonb,
  '2019-07-18'::timestamp,
  'Herry Arisyam',
  '2019-07-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 414
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4838346',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B960BX - (Renault)',
  'FLEET',
  NULL,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-415',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9601BX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":415,"no_polisi":"B960BX","no_chasis":"VFGBD02E400000428","no_machine":"83M0242110","brand_id":3,"brand_name":"Renault","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"4838346"}'::jsonb,
  '2019-07-19'::timestamp,
  'Herry Arisyam',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 415
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4838356',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9628BX - (Renault)',
  'FLEET',
  727,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-416',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9628BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":416,"no_polisi":"B9628BX","no_chasis":"VF6B002E400000452","no_machine":"83M00242553","brand_id":3,"brand_name":"Renault","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"4838356"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 416
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4241126',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9551U - (Volvo)',
  'FLEET',
  56,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-417',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9644BZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":417,"no_polisi":"A9551U","no_chasis":"YV2F2B3D9SA 236955","no_machine":"271507","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"4241126"}'::jsonb,
  '2019-07-19'::timestamp,
  'Herry Arisyam',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 417
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5050750',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9652BX - (Renault)',
  'FLEET',
  NULL,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-418',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9652BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":418,"no_polisi":"B9652BX","no_chasis":"VFGBD02E400000523","no_machine":"83M0244018","brand_id":3,"brand_name":"Renault","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"5050750"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 418
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240111',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9744EG - (Volvo)',
  'FLEET',
  319,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-419',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9744EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":419,"no_polisi":"B9744EG","no_chasis":"YV2F2B3C5TA 253678","no_machine":"282633","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5240111"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 419
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240109',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9746EG - (Volvo)',
  'FLEET',
  321,
  '2023-12-11'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-420',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'BPKB_B9746EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":420,"no_polisi":"B9746EG","no_chasis":"YV2F2B3C4TA 253672","no_machine":"282592","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5240109"}'::jsonb,
  '2023-12-11'::timestamp,
  'Herry Arisyam',
  '2023-12-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 420
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240115',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9747EG - (Volvo)',
  'FLEET',
  322,
  '2021-03-22'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-421',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'B9747EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":421,"no_polisi":"B9747EG","no_chasis":"YV2F2B3C1TA 249739","no_machine":"280342","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5240115"}'::jsonb,
  '2021-03-22'::timestamp,
  'Herry Arisyam',
  '2021-03-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 421
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240118',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9748EG - (Volvo)',
  'FLEET',
  549,
  '2022-02-24'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-422',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9748EG_16qmwj9rjcsg.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":422,"no_polisi":"B9748EG","no_chasis":"YV2F2B3C7TA 254086","no_machine":"282856","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5240118"}'::jsonb,
  '2022-02-24'::timestamp,
  'Herry Arisyam',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 422
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240112',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9750 EG - (Volvo)',
  'FLEET',
  324,
  '2023-12-11'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-424',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9750EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":424,"no_polisi":"B9750 EG","no_chasis":"YV2F2B3C3TA 253677","no_machine":"282587","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5240112"}'::jsonb,
  '2023-12-11'::timestamp,
  'Herry Arisyam',
  '2023-12-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 424
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240122',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9751EG - (Volvo)',
  'FLEET',
  325,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-425',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9751EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":425,"no_polisi":"B9751EG","no_chasis":"YV2F2B3C3TA 249743","no_machine":"280386","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5240122"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 425
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3829308',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B928QZ - (Volvo)',
  'FLEET',
  NULL,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-426',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9285_QZ_20190626_0001.pdf',
  'Ownership Code: 7',
  '{"legacy_source":"bpkb_header","legacy_id":426,"no_polisi":"B928QZ","no_chasis":"YV2A4DMC1XC 761980","no_machine":"D12C145411A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"7","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"3829308"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 426
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '24495598',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9020LG - (Hino)',
  'FLEET',
  NULL,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-427',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9020_LG_20190626_0001.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":427,"no_polisi":"B9020LG","no_chasis":"MJEFM226M2KD 17488","no_machine":"EMI100 J 17888","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2002,"acquisition_year":2002,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"24495598"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 427
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '995935',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9121XQ - (Volvo)',
  'FLEET',
  91,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-428',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9121_XQ_20190626_0001.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":428,"no_polisi":"B9121XQ","no_chasis":"YV2J4CMC33A557794","no_machine":"D12315844","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"995935"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 428
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '040836',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9136XQ - (Volvo)',
  'FLEET',
  103,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-429',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9136_XQ_20190626_0001.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":429,"no_polisi":"B9136XQ","no_chasis":"YV2J4DMC2YA518255","no_machine":"D12C196774A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"040836"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 429
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '074542',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9138XQ - (Volvo)',
  'FLEET',
  358,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-430',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9138_XQ_20190626_0001.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":430,"no_polisi":"B9138XQ","no_chasis":"YV2J4DMC9YC762778","no_machine":"D12C158655A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"074542"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 430
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3830884',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9277QZ - (Volvo)',
  'FLEET',
  534,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-431',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9277_QZ_20190626_0001.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":431,"no_polisi":"B9277QZ","no_chasis":"YV2A4DMC4XC 761987","no_machine":"D12C145589A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"3830884"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 431
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9282XA - (Scania)',
  'FLEET',
  667,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-432',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9282_XA_20190626_0001.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":432,"no_polisi":"B9282XA","no_chasis":"4378005","no_machine":"4J18257","brand_id":8,"brand_name":"Scania","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"}}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 432
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3829308',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9285QZ - (Volvo)',
  'FLEET',
  537,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-433',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9285_QZ_20190626_0001_3aq0gz3ssyeck.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":433,"no_polisi":"B9285QZ","no_chasis":"YV2A4DMC1XC 761980","no_machine":"D12C145411A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"3829308"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 433
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9285XA - (Scania)',
  'FLEET',
  297,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-434',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9285_XA_20190626_0001.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":434,"no_polisi":"B9285XA","no_chasis":"4376616","no_machine":"4117603","brand_id":8,"brand_name":"Scania","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null}}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 434
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '41994499',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9298QZ - (Volvo)',
  'FLEET',
  NULL,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-435',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9298_QZ_20190626_0001.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":435,"no_polisi":"B9298QZ","no_chasis":"YV244DMC4XC 762220","no_machine":"D12C1489134","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"41994499"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 435
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '419950',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9301QZ - (Volvo)',
  'FLEET',
  671,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-436',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9310_QZ_20190626_0001.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":436,"no_polisi":"B9301QZ","no_chasis":"YV2A4DMC3XC 761981","no_machine":"D12C145412C","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"419950"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 436
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '419898',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9305QZ - (Volvo)',
  'FLEET',
  342,
  '2019-07-15'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-437',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9305_QZ_20190626_0001.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":437,"no_polisi":"B9305QZ","no_chasis":"YV2A4DMC7XC 762629","no_machine":"D12C152023A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"419898"}'::jsonb,
  '2019-07-15'::timestamp,
  'Herry Arisyam',
  '2019-07-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 437
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '953211',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9665SU - (Volvo)',
  'FLEET',
  NULL,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-438',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9695_SU_20190626_0001.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":438,"no_polisi":"B9665SU","no_chasis":"YV2F5A6A6TC 753252","no_machine":"TD103ES 384280588","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"953211"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 438
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240121',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9743EG - (Volvo)',
  'FLEET',
  120,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-439',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9743_EG_20190626_0001.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":439,"no_polisi":"B9743EG","no_chasis":"YV2F2B3C3TA 254084","no_machine":"282854","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"5240121"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 439
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '419802',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9310QZ - (Volvo)',
  'FLEET',
  533,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-440',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9310_QZ_20190626_0001_3aq1f7tbaxc0w.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":440,"no_polisi":"B9310QZ","no_chasis":"YV2A4DMC7XC 762629","no_machine":"D12C146174A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"419802"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 440
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240096',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B755EG - (Volvo)',
  'FLEET',
  NULL,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-441',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9755EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":441,"no_polisi":"B755EG","no_chasis":"YV2F2B3C6TA 253673","no_machine":"28593","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"5240096"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 441
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240095',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9756EG - (Volvo)',
  'FLEET',
  328,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-442',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9756EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":442,"no_polisi":"B9756EG","no_chasis":"YV2F2B3C4TA 253671","no_machine":"282553","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5240095"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 442
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '524011',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9757EG - (Volvo)',
  'FLEET',
  329,
  '2019-07-09'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-443',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9757EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":443,"no_polisi":"B9757EG","no_chasis":"YV2F2B3C4TA 250088","no_machine":"280580","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"524011"}'::jsonb,
  '2019-07-09'::timestamp,
  'Herry Arisyam',
  '2019-07-09'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 443
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240116',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9758EG - (Volvo)',
  'FLEET',
  330,
  '2023-12-11'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-444',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9758EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":444,"no_polisi":"B9758EG","no_chasis":"YV2F2B3C4TA 254078","no_machine":"282848","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"7","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5240116"}'::jsonb,
  '2023-12-11'::timestamp,
  'Herry Arisyam',
  '2023-12-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 444
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240107',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9759EG - (Volvo)',
  'FLEET',
  331,
  '2023-12-11'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-445',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9759EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":445,"no_polisi":"B9759EG","no_chasis":"YV2F2B3C6TA 254077","no_machine":"282847","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5240107"}'::jsonb,
  '2023-12-11'::timestamp,
  'Herry Arisyam',
  '2023-12-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 445
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '280341',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9762EG - (Volvo)',
  'FLEET',
  333,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-446',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9762EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":446,"no_polisi":"B9762EG","no_chasis":"YV2F2B3CTA 255947","no_machine":"280341","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"280341"}'::jsonb,
  '2022-02-24'::timestamp,
  'Herry Arisyam',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 446
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240104',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9764EG - (Volvo)',
  'FLEET',
  334,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-447',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9764EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":447,"no_polisi":"B9764EG","no_chasis":"YV2F2B3C8TA 254081","no_machine":"282851","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5240104"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 447
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240114',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9767EG - (Volvo)',
  'FLEET',
  335,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-448',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9767EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":448,"no_polisi":"B9767EG","no_chasis":"YV2F2B3C5TA 254085","no_machine":"282855","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5240114"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 448
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '6468071',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9878RJ - (Volvo)',
  'FLEET',
  354,
  '2023-12-12'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-449',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9878RJ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":449,"no_polisi":"B9878RJ","no_chasis":"YV2J4DMC1YC762774","no_machine":"D12C158651A","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"6468071"}'::jsonb,
  '2023-12-12'::timestamp,
  'Herry Arisyam',
  '2023-12-12'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 449
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0026342',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8727UD - (Mitshubishi)',
  'FLEET',
  46,
  '2022-03-15'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-450',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'A8727UD.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":450,"no_polisi":"A8727UD","no_chasis":"MHMFN527NYR000335","no_machine":"0X0335","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"NonBrankas","production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"0026342"}'::jsonb,
  '2022-03-15'::timestamp,
  'Herry Arisyam',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 450
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2794080',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9955BN/ A9567Q - (Volvo)',
  'FLEET',
  57,
  '2019-07-18'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-451',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9955BN.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":451,"no_polisi":"B9955BN/ A9567Q","no_chasis":"SCVF2B3D8SC 910033","no_machine":"268427","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1994,"acquisition_year":1994,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"2794080"}'::jsonb,
  '2019-07-18'::timestamp,
  'Herry Arisyam',
  '2019-07-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 451
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-03781497',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R1864BK - (Volvo)',
  'FLEET',
  562,
  '2019-07-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-452',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'R1864BK.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":452,"no_polisi":"R1864BK","no_chasis":"YV2F2CBD1VA26762","no_machine":"291614","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"J-03781497"}'::jsonb,
  '2019-07-10'::timestamp,
  'Herry Arisyam',
  '2019-07-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 452
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9065736',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R2034AX/R1917DB - (Volvo)',
  'FLEET',
  557,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-453',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'R2034AXLR1917DBB.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":453,"no_polisi":"R2034AX/R1917DB","no_chasis":"YV2F2CBD2VA 268304","no_machine":"292084","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"9065736"}'::jsonb,
  '2019-07-19'::timestamp,
  'Herry Arisyam',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 453
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9065739',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R2037AX/R1915DB - (Volvo)',
  'FLEET',
  560,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-454',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'R2037AX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":454,"no_polisi":"R2037AX/R1915DB","no_chasis":"YV2F2CBD0VA 268317","no_machine":"292097","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"9065739"}'::jsonb,
  '2019-07-19'::timestamp,
  'Herry Arisyam',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 454
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9065470',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R2038AX/R1913DB - (Volvo)',
  'FLEET',
  558,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-455',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'R2038AX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":455,"no_polisi":"R2038AX/R1913DB","no_chasis":"YV2F2CBD3VA 269753","no_machine":"292991","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"9065470"}'::jsonb,
  '2019-07-19'::timestamp,
  'Herry Arisyam',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 455
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9065748',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R2046AX/R1923DB - (Volvo)',
  'FLEET',
  561,
  '2019-07-18'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-456',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'R2046AXLR1931DBB.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":456,"no_polisi":"R2046AX/R1923DB","no_chasis":"YV2F2CBD8VA 269747","no_machine":"292985","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"9065748"}'::jsonb,
  '2019-07-18'::timestamp,
  'Herry Arisyam',
  '2019-07-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 456
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'B-0352791',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8848U - (Toyota)',
  'FLEET',
  201,
  '2019-07-23'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-457',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'A8848U.pdf',
  'Ownership Code: 4',
  '{"legacy_source":"bpkb_header","legacy_id":457,"no_polisi":"A8848U","no_chasis":"MHF31KF6010010891","no_machine":"7K-0405079","brand_id":7,"brand_name":"Toyota","cabinet_slot":null,"production_year":2001,"acquisition_year":2001,"color_code":"12","ownership_code":"4","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"B-0352791"}'::jsonb,
  '2019-07-23'::timestamp,
  'Herry Arisyam',
  '2019-07-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 457
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'I-07575349',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8861U - (Toyota)',
  'FLEET',
  192,
  '2019-07-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-458',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'A8861U.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":458,"no_polisi":"A8861U","no_chasis":"MHF31BY3410006220","no_machine":"14B-1662829","brand_id":7,"brand_name":"Toyota","cabinet_slot":null,"production_year":2001,"acquisition_year":2001,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"I-07575349"}'::jsonb,
  '2019-07-10'::timestamp,
  'Herry Arisyam',
  '2019-07-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 458
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9752EG - (Volvo)',
  'FLEET',
  218,
  '2019-07-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-459',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9752_EG.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":459,"no_polisi":"B9752EG","no_chasis":"YV2F2B3C8TA 249740","no_machine":"280343","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null}}'::jsonb,
  '2019-07-10'::timestamp,
  'Herry Arisyam',
  '2019-07-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 459
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9013LG - (Hino)',
  'FLEET',
  NULL,
  '2019-07-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-460',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9013_LG_20190626_0001.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":460,"no_polisi":"B9013LG","no_chasis":"MJEFM266M2KD 17498","no_machine":"EMI100 J 17858","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2002,"acquisition_year":2002,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null}}'::jsonb,
  '2019-07-10'::timestamp,
  'Herry Arisyam',
  '2019-07-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 460
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '2031765',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9073DS - (Hino)',
  'FLEET',
  669,
  '2019-07-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-461',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9073DS.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":461,"no_polisi":"B9073DS","no_chasis":"MJEFM266M2KD 17480","no_machine":"EMI100 J 17880","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2002,"acquisition_year":200,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"2031765"}'::jsonb,
  '2019-07-10'::timestamp,
  'Herry Arisyam',
  '2019-07-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 461
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9952951',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9115XQ - (Volvo)',
  'FLEET',
  85,
  '2019-07-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-462',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9115XQ_3aq8hc4e96sks.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":462,"no_polisi":"B9115XQ","no_chasis":"YV2J4CMC73A557328","no_machine":"D12313763","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2003,"acquisition_year":2003,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"9952951"}'::jsonb,
  '2019-07-10'::timestamp,
  'Herry Arisyam',
  '2019-07-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 462
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '3829449',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9281QZ - (Volvo)',
  'FLEET',
  74,
  '2019-07-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-463',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9281QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":463,"no_polisi":"B9281QZ","no_chasis":"YV2A4DMC8XC 762219","no_machine":"D12C148912A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"3829449"}'::jsonb,
  '2019-07-10'::timestamp,
  'Herry Arisyam',
  '2019-07-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 463
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4198525',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9299QZ - (Volvo)',
  'FLEET',
  339,
  '2019-07-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-464',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9299QZ.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":464,"no_polisi":"B9299QZ","no_chasis":"YV2A4DMC6XC 762221","no_machine":"D12C148914A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1999,"acquisition_year":1999,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"4198525"}'::jsonb,
  '2019-07-10'::timestamp,
  'Herry Arisyam',
  '2019-07-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 464
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '0942989',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9560JV - (Volvo)',
  'FLEET',
  348,
  '2019-07-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-465',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9560JV.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":465,"no_polisi":"B9560JV","no_chasis":"YV2J4DMC4YA514921","no_machine":"D12C186681A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"0942989"}'::jsonb,
  '2019-07-10'::timestamp,
  'Herry Arisyam',
  '2019-07-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 465
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4838350',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9623BX - (Renault)',
  'FLEET',
  54,
  '2019-07-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-466',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9623BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":466,"no_polisi":"B9623BX","no_chasis":"VF6B002E400000456","no_machine":"83M0242798","brand_id":3,"brand_name":"Renault","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"4838350"}'::jsonb,
  '2019-07-10'::timestamp,
  'Herry Arisyam',
  '2019-07-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 466
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5154427',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9692BX - (Renault)',
  'FLEET',
  556,
  '2019-07-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-467',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9692BX.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":467,"no_polisi":"B9692BX","no_chasis":"VF6B002E400000560","no_machine":"83M0244929","brand_id":3,"brand_name":"Renault","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"5154427"}'::jsonb,
  '2019-07-10'::timestamp,
  'Herry Arisyam',
  '2019-07-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 467
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9065737',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R2035AX/R1885DB - (Volvo)',
  'FLEET',
  NULL,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-468',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'R1885DB.pdf',
  'Ownership Code: 11',
  '{"legacy_source":"bpkb_header","legacy_id":468,"no_polisi":"R2035AX/R1885DB","no_chasis":"YV2F2CBD4VA 268305","no_machine":"292085","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"11","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"9065737"}'::jsonb,
  '2019-07-19'::timestamp,
  'Herry Arisyam',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 468
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '9065734',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - R2032AX/R1922DB - (Volvo)',
  'FLEET',
  428,
  '2019-07-19'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-469',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'R2032AXLR1922DBB.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":469,"no_polisi":"R2032AX/R1922DB","no_chasis":"YV2F2CBD8VA 269750","no_machine":"292988","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"15","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"9065734"}'::jsonb,
  '2019-07-19'::timestamp,
  'Herry Arisyam',
  '2019-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 469
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'N-02423262',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A2625HW - (Honda)',
  'FLEET',
  885,
  '2023-12-13'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-470',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'A2625HW_3aqrbo37cha88.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":470,"no_polisi":"A2625HW","no_chasis":"MH1JBK319HK188686","no_machine":"JBK31187464","brand_id":1,"brand_name":"Honda","cabinet_slot":"NonBrankas","production_year":2017,"acquisition_year":2017,"color_code":"1","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"N-02423262"}'::jsonb,
  '2023-12-13'::timestamp,
  'Herry Arisyam',
  '2023-12-13'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 470
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '953211',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9695SU - (Volvo)',
  'FLEET',
  536,
  '2019-07-12'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-471',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B_9695_SU_20190626_0001_3aqrcnb478kkg.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":471,"no_polisi":"B9695SU","no_chasis":"YV2F5A6A6TC 753252","no_machine":"TD103ES384280","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"953211"}'::jsonb,
  '2019-07-12'::timestamp,
  'Herry Arisyam',
  '2019-07-12'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 471
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4196409',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9747WV - (Volvo)',
  'FLEET',
  351,
  '2019-07-12'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-473',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9747WV_3aqree3jo9ick.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":473,"no_polisi":"B9747WV","no_chasis":"YV2J4DMC8YC763128","no_machine":"D12C170638A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"4196409"}'::jsonb,
  '2019-07-12'::timestamp,
  'Herry Arisyam',
  '2019-07-12'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 473
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4196690',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9748WV - (Volvo)',
  'FLEET',
  352,
  '2026-02-23'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-474',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9748WV.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":474,"no_polisi":"B9748WV","no_chasis":"YV2J4DMC8YC763257","no_machine":"D12C174910A","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"4196690"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 474
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4196672',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9749WV - (Volvo)',
  'FLEET',
  353,
  '2019-07-12'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-475',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9749WV.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":475,"no_polisi":"B9749WV","no_chasis":"YV2J4DMC6YC763130","no_machine":"D12C170640A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.168","created_user":"Herry Arisyam","modified_user":null},"id_number":"4196672"}'::jsonb,
  '2019-07-12'::timestamp,
  'Herry Arisyam',
  '2019-07-12'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 475
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4685960',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9876WV - (Volvo)',
  'FLEET',
  114,
  '2019-07-10'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-476',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9876WV.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":476,"no_polisi":"B9876WV","no_chasis":"YV2J4DMC8YC762898","no_machine":"D12C161302A","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":2000,"acquisition_year":2000,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.135","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"4685960"}'::jsonb,
  '2019-07-10'::timestamp,
  'Herry Arisyam',
  '2019-07-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 476
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240107',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - L3262DC/B9745EG - (Volvo)',
  'FLEET',
  320,
  '2019-07-18'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-477',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'L3262DC.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":477,"no_polisi":"L3262DC/B9745EG","no_chasis":"YV2F2B3CXTA 254082","no_machine":"282852","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.135","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"5240107"}'::jsonb,
  '2019-07-18'::timestamp,
  'Herry Arisyam',
  '2019-07-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 477
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240124',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - L3276DC/B9741EG - (Volvo)',
  'FLEET',
  318,
  '2026-02-23'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-478',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'L3276DC.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":478,"no_polisi":"L3276DC/B9741EG","no_chasis":"YV2FB3CTA253679","no_machine":"282634","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.135","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5240124"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 478
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '5240120',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - L3280DC/B9760EG - (Volvo)',
  'FLEET',
  332,
  '2023-12-11'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-479',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'L3280DC.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":479,"no_polisi":"L3280DC/B9760EG","no_chasis":"YV2F2B3CXTA 249742","no_machine":"280385","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.135","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"5240120"}'::jsonb,
  '2023-12-11'::timestamp,
  'Herry Arisyam',
  '2023-12-11'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 479
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  '4241126',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9644BZ/ A9551U - (Volvo)',
  'FLEET',
  56,
  '2019-07-18'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-480',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'B9644BZLA_9551_UB.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":480,"no_polisi":"B9644BZ/ A9551U","no_chasis":"YV2F2B3D9SA 236955","no_machine":"271507","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.157","created_user":"Herry Arisyam","modified_user":null},"id_number":"4241126"}'::jsonb,
  '2019-07-18'::timestamp,
  'Herry Arisyam',
  '2019-07-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 480
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10700762',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9868X-A9585TX - (Hino)',
  'FLEET',
  258,
  '2026-02-06'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-482',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BANK-BPR' LIMIT 1),
  'BPKB_A9868X-A9585TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":482,"no_polisi":"A9868X-A9585TX","no_chasis":"MJEFM8JNKFJM4536","no_machine":"J08EUFJ69566","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.139","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"L-10700762"}'::jsonb,
  '2026-02-06'::timestamp,
  'Herry Arisyam',
  '2026-02-06'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 482
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10700757',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9863X-A9581TX - (Hino)',
  'FLEET',
  266,
  '2026-02-06'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-483',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BANK-BPR' LIMIT 1),
  'BPKB_A9863X-A9581TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":483,"no_polisi":"A9863X-A9581TX","no_chasis":"MJEFM8JNKFJM45253","no_machine":"J08EUFJ69595","brand_id":2,"brand_name":"Hino","cabinet_slot":"A6","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.139","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"L-10700757"}'::jsonb,
  '2026-02-06'::timestamp,
  'Herry Arisyam',
  '2026-02-06'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 483
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'A-5240096',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - L3273DC/B9755EG - (Volvo)',
  'FLEET',
  327,
  '2026-02-23'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-487',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'B9755EG_3at42do1qq04k.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":487,"no_polisi":"L3273DC/B9755EG","no_chasis":"YV2F2B3C6TA 253673","no_machine":"282593","brand_id":9,"brand_name":"Volvo","cabinet_slot":"NonBrankas","production_year":1996,"acquisition_year":1996,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.139","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"A-5240096"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 487
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'C-3369436',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9572U - (Volvo)',
  'FLEET',
  58,
  '2019-07-24'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-488',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'A9572U_3atjtbvy46ckg.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":488,"no_polisi":"A9572U","no_chasis":"YV2F5A6AITC 751991","no_machine":"TD103ES384 277035","brand_id":9,"brand_name":"Volvo","cabinet_slot":null,"production_year":1997,"acquisition_year":1997,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.139","created_user":"Herry Arisyam","modified_user":null},"id_number":"C-3369436"}'::jsonb,
  '2019-07-24'::timestamp,
  'Herry Arisyam',
  '2019-07-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 488
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10700762',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A95868X - (Hino)',
  'FLEET',
  258,
  '2019-08-02'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-489',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'A9868X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":489,"no_polisi":"A95868X","no_chasis":"MJEFM8JNKFJM45236","no_machine":"J08EUFJ69566","brand_id":2,"brand_name":"Hino","cabinet_slot":null,"production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.160","created_user":"Herry Arisyam","modified_user":null},"id_number":"L-10700762"}'::jsonb,
  '2019-08-02'::timestamp,
  'Herry Arisyam',
  '2019-08-02'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 489
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10700765',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9871X-A9588TX - (Hino)',
  'FLEET',
  260,
  '2025-07-01'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-490',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BANK-BPR' LIMIT 1),
  'BPKB_A9871X-A9588TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":490,"no_polisi":"A9871X-A9588TX","no_chasis":"MJEFM8JNKFJM45235","no_machine":"J08EUFJ69596","brand_id":2,"brand_name":"Hino","cabinet_slot":"A2","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/537.86.7","ip_address":"10.2.2.160","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"L-10700765"}'::jsonb,
  '2025-07-01'::timestamp,
  'Herry Arisyam',
  '2025-07-01'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 490
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-049575',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A 9281 TZ - (Volvo)',
  'FLEET',
  NULL,
  '2019-08-30'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-491',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'A_9281_TZ_AWAL_A9338VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":491,"no_polisi":"A 9281 TZ","no_chasis":"YV2J4DMC41A524497","no_machine":"D12C2143835A","brand_id":9,"brand_name":"Volvo","cabinet_slot":"A1","production_year":2001,"acquisition_year":2001,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:66.0) Gecko/20100101 Firefox/66.0","ip_address":"10.2.2.169","created_user":"Herry Arisyam","modified_user":"Herry Arisyam"},"id_number":"L-049575"}'::jsonb,
  '2019-08-30'::timestamp,
  'Herry Arisyam',
  '2019-08-30'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 491
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-04957551',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A 9282 TZ - (Volvo)',
  'FLEET',
  NULL,
  '2019-08-30'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-492',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A_9822_TZ_DARI_A9337VL.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":492,"no_polisi":"A 9282 TZ","no_chasis":"YV2J4DMC91A532014","no_machine":"D126234453A","brand_id":9,"brand_name":"Volvo","cabinet_slot":"A1","production_year":2001,"acquisition_year":2001,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:66.0) Gecko/20100101 Firefox/66.0","ip_address":"10.2.2.169","created_user":"Herry Arisyam","modified_user":null},"id_number":"L-04957551"}'::jsonb,
  '2019-08-30'::timestamp,
  'Herry Arisyam',
  '2019-08-30'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 492
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-04957547',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9823TZ - (Volvo)',
  'FLEET',
  63,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-493',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'BPKB_A9823TZ_3md9n7d2lg4ko.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":493,"no_polisi":"A9823TZ","no_chasis":"YV2J4DMC81A533090","no_machine":"D12C2373804","brand_id":9,"brand_name":"Volvo","cabinet_slot":"A2","production_year":2001,"acquisition_year":2001,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:66.0) Gecko/20100101 Firefox/66.0","ip_address":"10.2.2.169","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"L-04957547"}'::jsonb,
  '2026-02-23'::timestamp,
  'Herry Arisyam',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 493
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'P-05516104',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B9669S - (Mercedes Benz)',
  'FLEET',
  NULL,
  '2019-09-20'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-494',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9699S.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":494,"no_polisi":"B9669S","no_chasis":"MEC5719CAKPO77531","no_machine":"457991C0360551","brand_id":4,"brand_name":"Mercedes Benz","cabinet_slot":"A1","production_year":2019,"acquisition_year":2019,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:66.0) Gecko/20100101 Firefox/66.0","ip_address":"10.2.2.144","created_user":"Herry Arisyam","modified_user":null},"id_number":"P-05516104"}'::jsonb,
  '2019-09-20'::timestamp,
  'Herry Arisyam',
  '2019-09-20'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 494
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'P-05516105',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9701S - (Mercedes Benz)',
  'FLEET',
  890,
  '2024-07-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-495',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9701S.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":495,"no_polisi":"A9701S","no_chasis":"MEC5719CAKP077662","no_machine":"457991C0360535","brand_id":4,"brand_name":"Mercedes Benz","cabinet_slot":"R2","production_year":2019,"acquisition_year":2019,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:66.0) Gecko/20100101 Firefox/66.0","ip_address":"10.2.2.144","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"P-05516105"}'::jsonb,
  '2024-07-19'::timestamp,
  'Herry Arisyam',
  '2024-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 495
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'P-05516102',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9697S - (Mercedes Benz)',
  'FLEET',
  887,
  '2022-07-20'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-496',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9697S.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":496,"no_polisi":"A9697S","no_chasis":"MEC5719CAKPO77576","no_machine":"457991C0360539","brand_id":4,"brand_name":"Mercedes Benz","cabinet_slot":"R2","production_year":2019,"acquisition_year":2019,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:66.0) Gecko/20100101 Firefox/66.0","ip_address":"10.2.2.144","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"P-05516102"}'::jsonb,
  '2022-07-20'::timestamp,
  'Herry Arisyam',
  '2022-07-20'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 496
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'P-05516101',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9695S - (Mercedes Benz)',
  'FLEET',
  884,
  '2024-07-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-497',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9695S.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":497,"no_polisi":"A9695S","no_chasis":"MEC5719CAKP077524","no_machine":"457991C0359373","brand_id":4,"brand_name":"Mercedes Benz","cabinet_slot":"R2","production_year":2019,"acquisition_year":2019,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:66.0) Gecko/20100101 Firefox/66.0","ip_address":"10.2.2.144","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"P-05516101"}'::jsonb,
  '2024-07-19'::timestamp,
  'Herry Arisyam',
  '2024-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 497
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'P-05516103',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9698S - (Mercedes Benz)',
  'FLEET',
  888,
  '2024-07-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-498',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9698S.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":498,"no_polisi":"A9698S","no_chasis":"MEC5719CAKPO77544","no_machine":"457991C0360547","brand_id":4,"brand_name":"Mercedes Benz","cabinet_slot":"R2","production_year":2019,"acquisition_year":2019,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:66.0) Gecko/20100101 Firefox/66.0","ip_address":"10.2.2.144","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"P-05516103"}'::jsonb,
  '2024-07-19'::timestamp,
  'Herry Arisyam',
  '2024-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 498
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'P-05516104',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9699S - (Mercedes Benz)',
  'FLEET',
  889,
  '2024-07-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-499',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9699S_bxd14cr2uj48.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":499,"no_polisi":"A9699S","no_chasis":"MEC5719CAKP077531","no_machine":"457991C0360551","brand_id":4,"brand_name":"Mercedes Benz","cabinet_slot":"R2","production_year":2019,"acquisition_year":2019,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36","ip_address":"10.2.2.115","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"P-05516104"}'::jsonb,
  '2024-07-19'::timestamp,
  'Joni Sutopo',
  '2024-07-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 499
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10700766',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9872X-A9589TX - (Hino)',
  'FLEET',
  263,
  '2025-10-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-500',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BANK-BPRS' LIMIT 1),
  'BPKB_A9872X-A9589TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":500,"no_polisi":"A9872X-A9589TX","no_chasis":"MJEFM8JNKFJM45251","no_machine":"J08EUFJ69593","brand_id":2,"brand_name":"Hino","cabinet_slot":"B2","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:66.0) Gecko/20100101 Firefox/66.0","ip_address":"10.2.2.198","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"L-10700766"}'::jsonb,
  '2025-10-23'::timestamp,
  'Herry Arisyam',
  '2025-10-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 500
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10700758',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9864X-A9582TX - (Hino)',
  'FLEET',
  267,
  '2025-07-01'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-501',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9864X-A9582TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":501,"no_polisi":"A9864X-A9582TX","no_chasis":"MJEFM8JNKFJM45254","no_machine":"J08EUFJ69596","brand_id":2,"brand_name":"Hino","cabinet_slot":"B2","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:66.0) Gecko/20100101 Firefox/66.0","ip_address":"10.2.2.198","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"L-10700758"}'::jsonb,
  '2025-07-01'::timestamp,
  'Herry Arisyam',
  '2025-07-01'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 501
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10700761',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9867X-A9584TX - (Hino)',
  'FLEET',
  264,
  '2025-07-01'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-502',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9867X-A9584TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":502,"no_polisi":"A9867X-A9584TX","no_chasis":"MJEFM8JNKFJM45252","no_machine":"J08EUFJ69594","brand_id":2,"brand_name":"Hino","cabinet_slot":"B2","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:66.0) Gecko/20100101 Firefox/66.0","ip_address":"10.2.2.198","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"L-10700761"}'::jsonb,
  '2025-07-01'::timestamp,
  'Herry Arisyam',
  '2025-07-01'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 502
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10700759',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9865X-A9583TX - (Hino)',
  'FLEET',
  259,
  '2025-07-01'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-503',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9865X-A9583TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":503,"no_polisi":"A9865X-A9583TX","no_chasis":"MJEFM8JNKFJM45256","no_machine":"J08EUFJ69598","brand_id":2,"brand_name":"Hino","cabinet_slot":"B2","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:66.0) Gecko/20100101 Firefox/66.0","ip_address":"10.2.2.198","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"L-10700759"}'::jsonb,
  '2025-07-01'::timestamp,
  'Herry Arisyam',
  '2025-07-01'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 503
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-10700764',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9870X-A9587TX - (Hino)',
  'FLEET',
  265,
  '2025-07-01'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-504',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9870X-A9587TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":504,"no_polisi":"A9870X-A9587TX","no_chasis":"MJEFM8JNKFJM45234","no_machine":"J08EUFJ69564","brand_id":2,"brand_name":"Hino","cabinet_slot":"B2","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:66.0) Gecko/20100101 Firefox/66.0","ip_address":"10.2.2.198","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"L-10700764"}'::jsonb,
  '2025-07-01'::timestamp,
  'Herry Arisyam',
  '2025-07-01'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 504
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'H-04835268',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B1088SKR - (Toyota)',
  'FLEET',
  NULL,
  '2020-10-22'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-505',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'B1088SKR_3bnmaly5i16o8.pdf',
  'Ownership Code: 14',
  '{"legacy_source":"bpkb_header","legacy_id":505,"no_polisi":"B1088SKR","no_chasis":"MHFM18A3JAK263157","no_machine":"DG32106","brand_id":7,"brand_name":"Toyota","cabinet_slot":"B2","production_year":2010,"acquisition_year":2010,"color_code":"11","ownership_code":"14","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:66.0) Gecko/20100101 Firefox/66.0","ip_address":"10.2.2.199","created_user":"Herry Arisyam","modified_user":"Joni Sutopo"},"id_number":"H-04835268"}'::jsonb,
  '2020-10-22'::timestamp,
  'Herry Arisyam',
  '2020-10-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 505
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-12011796',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8905UE - (Mitshubishi)',
  'FLEET',
  765,
  '2021-11-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-506',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'scan0077.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":506,"no_polisi":"A8905UE","no_chasis":"MHMFE71P1GK059013","no_machine":"4D34TP83369","brand_id":5,"brand_name":"Mitshubishi","cabinet_slot":"A4","production_year":2016,"acquisition_year":2016,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36","ip_address":"10.2.2.50","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-12011796"}'::jsonb,
  '2021-11-17'::timestamp,
  'Joni Sutopo',
  '2021-11-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 506
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-05969732',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9007X - (Hino)',
  'FLEET',
  376,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-507',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9007X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":507,"no_polisi":"A9007X","no_chasis":"MJEFL8JTLDJM15261","no_machine":"J08EUFJ51593","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36","ip_address":"10.2.2.50","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"J-05969732"}'::jsonb,
  '2022-02-24'::timestamp,
  'Joni Sutopo',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 507
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-06154508',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9896W - (Hino)',
  'FLEET',
  414,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-508',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9896W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":508,"no_polisi":"A9896W","no_chasis":"MJEFM8JNKDJM37345","no_machine":"J08EUFJ49941","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36","ip_address":"10.2.2.50","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"J-06154508"}'::jsonb,
  '2022-02-24'::timestamp,
  'Joni Sutopo',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 508
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-06154510',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9898W - (Hino)',
  'FLEET',
  415,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-509',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9898W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":509,"no_polisi":"A9898W","no_chasis":"MJEFM8JNKDJM37350","no_machine":"J08EUFJ49946","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36","ip_address":"10.2.2.50","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"J-06154510"}'::jsonb,
  '2022-02-24'::timestamp,
  'Joni Sutopo',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 509
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-06154512',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9002X - (Hino)',
  'FLEET',
  371,
  '2019-12-18'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-510',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9002X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":510,"no_polisi":"A9002X","no_chasis":"MJEFL8JTLCJM13985","no_machine":"J08EUFJ43999","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2012,"acquisition_year":2012,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36","ip_address":"10.2.2.50","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"J-06154512"}'::jsonb,
  '2019-12-18'::timestamp,
  'Joni Sutopo',
  '2019-12-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 510
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-06154514',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9003X - (Hino)',
  'FLEET',
  372,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-511',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9003X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":511,"no_polisi":"A9003X","no_chasis":"MJEFL8JTLDJM15217","no_machine":"J08EUFJ51501","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36","ip_address":"10.2.2.50","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"J-06154514"}'::jsonb,
  '2022-02-24'::timestamp,
  'Joni Sutopo',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 511
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-06154515',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9004X - (Hino)',
  'FLEET',
  373,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-512',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9004X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":512,"no_polisi":"A9004X","no_chasis":"MJEFL8JTLDJM15222","no_machine":"J08EUFJ51506","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36","ip_address":"10.2.2.50","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"J-06154515"}'::jsonb,
  '2022-02-24'::timestamp,
  'Joni Sutopo',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 512
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-06154516',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9005X - (Hino)',
  'FLEET',
  374,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-513',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9005X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":513,"no_polisi":"A9005X","no_chasis":"MJEFL8JTLDJM15223","no_machine":"J08EUFJ51507","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36","ip_address":"10.2.2.50","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"J-06154516"}'::jsonb,
  '2022-02-24'::timestamp,
  'Joni Sutopo',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 513
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-06154509',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9897W - (Hino)',
  'FLEET',
  645,
  '2022-03-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-514',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9897W.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":514,"no_polisi":"A9897W","no_chasis":"MJEFM8JNKDJM37349","no_machine":"J08EUFJ49945","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36","ip_address":"10.2.2.50","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"J-06154509"}'::jsonb,
  '2022-03-15'::timestamp,
  'Joni Sutopo',
  '2022-03-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 514
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'J-06154517',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9006X - (Hino)',
  'FLEET',
  375,
  '2019-12-18'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-515',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-LEAS-MTF' LIMIT 1),
  'BPKB_A9006X.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":515,"no_polisi":"A9006X","no_chasis":"MJEFL8JTLDJM15224","no_machine":"J08EUFJ51508","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36","ip_address":"10.2.2.50","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"J-06154517"}'::jsonb,
  '2019-12-18'::timestamp,
  'Joni Sutopo',
  '2019-12-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 515
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-05896155',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9059Y-A9716TX - (Hino)',
  'FLEET',
  655,
  '2020-12-21'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-516',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9059Y-A9716TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":516,"no_polisi":"A9059Y-A9716TX","no_chasis":"MJEFM8JK1FJX10704","no_machine":"J08EWKJ10242","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2015,"acquisition_year":2015,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36","ip_address":"10.2.2.152","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-05896155"}'::jsonb,
  '2020-12-21'::timestamp,
  'Joni Sutopo',
  '2020-12-21'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 516
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-05896154',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9058Y-A9712TX - (Hino)',
  'FLEET',
  654,
  '2020-12-18'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-517',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9058Y-A9712TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":517,"no_polisi":"A9058Y-A9712TX","no_chasis":"MJEFM8JK1FJX10705","no_machine":"J08EWKJ10243","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2015,"acquisition_year":2015,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36","ip_address":"10.2.2.152","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-05896154"}'::jsonb,
  '2020-12-18'::timestamp,
  'Joni Sutopo',
  '2020-12-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 517
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-05896156',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9060Y-A9711TX - (Hino)',
  'FLEET',
  656,
  '2023-12-13'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-518',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9060Y-A9711TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":518,"no_polisi":"A9060Y-A9711TX","no_chasis":"MJEFM8JK1FJX10717","no_machine":"J08EWKJ10279","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2015,"acquisition_year":2015,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36","ip_address":"10.2.2.152","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-05896156"}'::jsonb,
  '2023-12-13'::timestamp,
  'Joni Sutopo',
  '2023-12-13'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 518
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-05896153',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9057Y-A9714TX - (Hino)',
  'FLEET',
  653,
  '2020-12-21'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-519',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9057Y-A9714TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":519,"no_polisi":"A9057Y-A9714TX","no_chasis":"MJEFM8JK1FJX10706","no_machine":"J08EWKJ10244","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2015,"acquisition_year":2015,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36","ip_address":"10.2.2.152","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-05896153"}'::jsonb,
  '2020-12-21'::timestamp,
  'Joni Sutopo',
  '2020-12-21'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 519
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-05896152',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9056Y-A9713TX - (Hino)',
  'FLEET',
  652,
  '2020-12-21'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-520',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9056Y-A9713TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":520,"no_polisi":"A9056Y-A9713TX","no_chasis":"MJEFM8JK1FJX10703","no_machine":"J08EWKJ10241","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2015,"acquisition_year":2015,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36","ip_address":"10.2.2.152","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-05896152"}'::jsonb,
  '2020-12-21'::timestamp,
  'Joni Sutopo',
  '2020-12-21'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 520
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-05896292',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9078Y/A9732TX - (Hino)',
  'FLEET',
  489,
  '2023-06-07'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-521',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BANK-BPR' LIMIT 1),
  'BPKB_A9732TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":521,"no_polisi":"A9078Y/A9732TX","no_chasis":"MJEFM8JN1FJE10228","no_machine":"J08EUFJ71756","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36","ip_address":"10.2.2.152","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-05896292"}'::jsonb,
  '2023-06-07'::timestamp,
  'Joni Sutopo',
  '2023-06-07'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 521
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-05896288',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9074Y-A9728TX - (Hino)',
  'FLEET',
  499,
  '2021-07-13'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-522',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9074Y-A9728TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":522,"no_polisi":"A9074Y-A9728TX","no_chasis":"MJEFM8JN1FJE10236","no_machine":"J08EUFJ71800","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36","ip_address":"10.2.2.152","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-05896288"}'::jsonb,
  '2021-07-13'::timestamp,
  'Joni Sutopo',
  '2021-07-13'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 522
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-05896291',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9077Y-A9731TX - (Hino)',
  'FLEET',
  491,
  '2026-05-06'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-523',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BANK-BPR' LIMIT 1),
  'BPKB_A9077Y-A9731TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":523,"no_polisi":"A9077Y-A9731TX","no_chasis":"MJEFM8JN1FJE10227","no_machine":"J08EUFJ71755","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36","ip_address":"10.2.2.152","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-05896291"}'::jsonb,
  '2026-05-06'::timestamp,
  'Joni Sutopo',
  '2026-05-06'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 523
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-05896290',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9076Y-A9730TX - (Hino)',
  'FLEET',
  490,
  '2026-05-06'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-524',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'BPKB_A9076Y-A9730TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":524,"no_polisi":"A9076Y-A9730TX","no_chasis":"MJEFM8JN1FJE10235","no_machine":"J08EUFJ71799","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36","ip_address":"10.2.2.152","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-05896290"}'::jsonb,
  '2026-05-06'::timestamp,
  'Joni Sutopo',
  '2026-05-06'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 524
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-05896289',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9075Y-A9729TX - (Hino)',
  'FLEET',
  488,
  '2023-06-07'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-525',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BANK-BPR' LIMIT 1),
  'BPKB_A9075Y-A9729TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":525,"no_polisi":"A9075Y-A9729TX","no_chasis":"MJEFM8JN1FJE10203","no_machine":"J08EUFJ71677","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36","ip_address":"10.2.2.152","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-05896289"}'::jsonb,
  '2023-06-07'::timestamp,
  'Joni Sutopo',
  '2023-06-07'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 525
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-06857064',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A1502VS-A1620TH - (Toyota)',
  'FLEET',
  810,
  '2021-04-21'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-526',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A1502VS-A1620TH.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":526,"no_polisi":"A1502VS-A1620TH","no_chasis":"MHKM5EA3JGJ028501","no_machine":"1NRF102565","brand_id":7,"brand_name":"Toyota","cabinet_slot":"NonBrankas","production_year":2016,"acquisition_year":2016,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:75.0) Gecko/20100101 Firefox/75.0","ip_address":"10.2.2.135","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-06857064"}'::jsonb,
  '2021-04-21'::timestamp,
  'Joni Sutopo',
  '2021-04-21'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 526
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-05896287',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9073Y-A9723TX - (Hino)',
  'FLEET',
  647,
  '2022-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-527',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9073Y-A9723TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":527,"no_polisi":"A9073Y-A9723TX","no_chasis":"MJEFL8JT1FJE10653","no_machine":"J08EUFJ74737","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:75.0) Gecko/20100101 Firefox/75.0","ip_address":"10.2.2.135","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-05896287"}'::jsonb,
  '2022-02-24'::timestamp,
  'Joni Sutopo',
  '2022-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 527
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-05896286',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9072Y-A9722TX - (Hino)',
  'FLEET',
  646,
  '2026-02-23'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-528',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DIJUAL' LIMIT 1),
  'BPKB_A9072Y-A9722TX.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":528,"no_polisi":"A9072Y-A9722TX","no_chasis":"MJEFL8JT1FJE10654","no_machine":"J08EUFJ74738","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2015,"acquisition_year":2015,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:75.0) Gecko/20100101 Firefox/75.0","ip_address":"10.2.2.135","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-05896286"}'::jsonb,
  '2026-02-23'::timestamp,
  'Joni Sutopo',
  '2026-02-23'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 528
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-06857063',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A1501VS-A1611TH - (Toyota)',
  'FLEET',
  808,
  '2022-04-13'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-529',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-AUDIT' LIMIT 1),
  'BPKB_A1501VS-A1611TH.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":529,"no_polisi":"A1501VS-A1611TH","no_chasis":"MHFJW8EM4G2306635","no_machine":"1TRA067838","brand_id":7,"brand_name":"Toyota","cabinet_slot":"NonBrankas","production_year":2016,"acquisition_year":2016,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:75.0) Gecko/20100101 Firefox/75.0","ip_address":"10.2.2.135","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-06857063"}'::jsonb,
  '2022-04-13'::timestamp,
  'Joni Sutopo',
  '2022-04-13'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 529
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-07591857',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B757HMM - (Toyota)',
  'FLEET',
  NULL,
  '2020-08-31'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-530',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-AUDIT' LIMIT 1),
  'BPKB_B757HMM.pdf',
  'Ownership Code: 4',
  '{"legacy_source":"bpkb_header","legacy_id":530,"no_polisi":"B757HMM","no_chasis":"JTNGK30H968007613","no_machine":"26RK190441","brand_id":7,"brand_name":"Toyota","cabinet_slot":null,"production_year":2016,"acquisition_year":2016,"color_code":"1","ownership_code":"4","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:80.0) Gecko/20100101 Firefox/80.0","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":null},"id_number":"M-07591857"}'::jsonb,
  '2020-08-31'::timestamp,
  'Joni Sutopo',
  '2020-08-31'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 530
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-00822170',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - B757MAR - (Toyota)',
  'FLEET',
  NULL,
  '2020-08-31'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-531',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DISPOSAL' LIMIT 1),
  'BPKB_B757MAR.pdf',
  'Ownership Code: 4',
  '{"legacy_source":"bpkb_header","legacy_id":531,"no_polisi":"B757MAR","no_chasis":"AGH300029792","no_machine":"2ARH600797","brand_id":7,"brand_name":"Toyota","cabinet_slot":null,"production_year":2015,"acquisition_year":2015,"color_code":"1","ownership_code":"4","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:80.0) Gecko/20100101 Firefox/80.0","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":null},"id_number":"M-00822170"}'::jsonb,
  '2020-08-31'::timestamp,
  'Joni Sutopo',
  '2020-08-31'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 531
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-08581694',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9091TY - (Hino)',
  'FLEET',
  39,
  '2023-01-05'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-532',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9091TY.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":532,"no_polisi":"A9091TY","no_chasis":"MJEFM8JNKEJM43996","no_machine":"J08EUFJ67308","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2014,"acquisition_year":2022,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:108.0) Gecko/20100101 Firefox/108.0","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":null},"id_number":"L-08581694"}'::jsonb,
  '2023-01-05'::timestamp,
  'Joni Sutopo',
  '2023-01-05'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 532
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-08581690',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9088TY - (Hino)',
  'FLEET',
  35,
  '2023-01-05'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-533',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9088TY.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":533,"no_polisi":"A9088TY","no_chasis":"MJEFM8JNKEJM44000","no_machine":"J08EUFJ67312","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2014,"acquisition_year":2022,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:108.0) Gecko/20100101 Firefox/108.0","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"L-08581690"}'::jsonb,
  '2023-01-05'::timestamp,
  'Joni Sutopo',
  '2023-01-05'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 533
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-08581691',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9086TY - (Hino)',
  'FLEET',
  36,
  '2023-01-05'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-534',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9086TY.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":534,"no_polisi":"A9086TY","no_chasis":"MJEFM8JNKEJM43999","no_machine":"J08EUFJ67311","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2014,"acquisition_year":2022,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:108.0) Gecko/20100101 Firefox/108.0","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":null},"id_number":"L-08581691"}'::jsonb,
  '2023-01-05'::timestamp,
  'Joni Sutopo',
  '2023-01-05'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 534
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-08581693',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9089TY - (Hino)',
  'FLEET',
  38,
  '2023-01-05'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-535',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9089TY.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":535,"no_polisi":"A9089TY","no_chasis":"MJEFM8JNKEJM43997","no_machine":"J08EUFJ67309","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2014,"acquisition_year":2022,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:108.0) Gecko/20100101 Firefox/108.0","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":null},"id_number":"L-08581693"}'::jsonb,
  '2023-01-05'::timestamp,
  'Joni Sutopo',
  '2023-01-05'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 535
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'L-08581692',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9087TY - (Hino)',
  'FLEET',
  37,
  '2023-01-05'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-536',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9087TY.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":536,"no_polisi":"A9087TY","no_chasis":"MJEFM8JNKEJM43998","no_machine":"J08EUFJ67310","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2014,"acquisition_year":2022,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:108.0) Gecko/20100101 Firefox/108.0","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":null},"id_number":"L-08581692"}'::jsonb,
  '2023-01-05'::timestamp,
  'Joni Sutopo',
  '2023-01-05'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 536
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-09374234',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9047R - (Hino)',
  'FLEET',
  701,
  '2023-01-06'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-537',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9047R.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":537,"no_polisi":"A9047R","no_chasis":"MJEFM8JN1GJE12282","no_machine":"J08EUFJ78304","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2016,"acquisition_year":2023,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:108.0) Gecko/20100101 Firefox/108.0","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":null},"id_number":"M-09374234"}'::jsonb,
  '2023-01-06'::timestamp,
  'Joni Sutopo',
  '2023-01-06'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 537
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-09374306',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9051R - (Hino)',
  'FLEET',
  702,
  '2023-01-06'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-538',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9051R.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":538,"no_polisi":"A9051R","no_chasis":"MJEFM8JN1GJE12296","no_machine":"J08EUFJ78330","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2016,"acquisition_year":2023,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:108.0) Gecko/20100101 Firefox/108.0","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":null},"id_number":"M-09374306"}'::jsonb,
  '2023-01-06'::timestamp,
  'Joni Sutopo',
  '2023-01-06'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 538
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-09374307',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9052R - (Hino)',
  'FLEET',
  703,
  '2025-06-12'::date,
  NULL,
  'REVOKED',
  1,
  'ARCHIVED_OFFSITE',
  'BCS-DMS-BPKB-539',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9052R.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":539,"no_polisi":"A9052R","no_chasis":"MJEFM8JN1GJE12297","no_machine":"J08EUFJ78331","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2016,"acquisition_year":2023,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:108.0) Gecko/20100101 Firefox/108.0","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-09374307"}'::jsonb,
  '2025-06-12'::timestamp,
  'Joni Sutopo',
  '2025-06-12'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 539
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-09374233',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9046R - (Hino)',
  'FLEET',
  700,
  '2025-06-12'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-540',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9046R.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":540,"no_polisi":"A9046R","no_chasis":"MJEFM8JN1GJE12281","no_machine":"J08EUFJ78309","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2016,"acquisition_year":2023,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:108.0) Gecko/20100101 Firefox/108.0","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"M-09374233"}'::jsonb,
  '2025-06-12'::timestamp,
  'Joni Sutopo',
  '2025-06-12'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 540
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'M-09374235',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9048R - (Hino)',
  'FLEET',
  699,
  '2023-01-06'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-541',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9048R.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":541,"no_polisi":"A9048R","no_chasis":"MJEFM8JN1GJE12283","no_machine":"J08EUFJ78305","brand_id":2,"brand_name":"Hino","cabinet_slot":"NonBrankas","production_year":2016,"acquisition_year":2023,"color_code":"6","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 6.1; rv:108.0) Gecko/20100101 Firefox/108.0","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":null},"id_number":"M-09374235"}'::jsonb,
  '2023-01-06'::timestamp,
  'Joni Sutopo',
  '2023-01-06'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 541
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'Q-06418002',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8393T - (Daihatsu)',
  'FLEET',
  898,
  '2025-09-25'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-542',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A8393T.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":542,"no_polisi":"A8393T","no_chasis":"MHKP3BA1JLK156167","no_machine":"K3MH71762","brand_id":20,"brand_name":"Daihatsu","cabinet_slot":"B2","production_year":2020,"acquisition_year":2024,"color_code":"1","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"Q-06418002"}'::jsonb,
  '2025-09-25'::timestamp,
  'Joni Sutopo',
  '2025-09-25'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 542
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'Q03245770',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A8347T - (Isuzu)',
  'FLEET',
  896,
  '2024-10-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-543',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A8347T.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":543,"no_polisi":"A8347T","no_chasis":"MHCTBR54FLK179047","no_machine":"E179047","brand_id":17,"brand_name":"Isuzu","cabinet_slot":"B2","production_year":2020,"acquisition_year":2024,"color_code":"1","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"Q03245770"}'::jsonb,
  '2024-10-08'::timestamp,
  'Joni Sutopo',
  '2024-10-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 543
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'P-05576328',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A7080S - (Mercedes Benz)',
  'FLEET',
  895,
  '2024-11-22'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-544',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-AUDIT' LIMIT 1),
  'BPKB_A7080S.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":544,"no_polisi":"A7080S","no_chasis":"MEC0014EBKP034667","no_machine":"400926D0021287","brand_id":4,"brand_name":"Mercedes Benz","cabinet_slot":null,"production_year":2019,"acquisition_year":2019,"color_code":"4","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":null},"id_number":"P-05576328"}'::jsonb,
  '2024-11-22'::timestamp,
  'Joni Sutopo',
  '2024-11-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 544
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'V-07026789',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A 1289 SB - (Toyota)',
  'FLEET',
  920,
  '2025-07-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-545',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-GA' LIMIT 1),
  'BPKB_BYD_A_1289_SB.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":545,"no_polisi":"A 1289 SB","no_chasis":"LCOCE4CB150045055","no_machine":"TZZOOXSQ4D4103158","brand_id":7,"brand_name":"Toyota","cabinet_slot":"NonBrankas","production_year":2025,"acquisition_year":2025,"color_code":"1","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"V-07026789"}'::jsonb,
  '2025-07-08'::timestamp,
  'Joni Sutopo',
  '2025-07-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 545
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-10777668',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A 6620 DT - (Honda)',
  'FLEET',
  NULL,
  '2025-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-546',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'bpkb_motor_a6620dt.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":546,"no_polisi":"A 6620 DT","no_chasis":"MH1JF8117DK807435","no_machine":"JF81E1801583","brand_id":1,"brand_name":"Honda","cabinet_slot":"NonBrankas","production_year":2013,"acquisition_year":2013,"color_code":"10","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"K-10777668"}'::jsonb,
  '2025-07-04'::timestamp,
  'Joni Sutopo',
  '2025-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 546
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'K-11889606',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A 3012 GQ - (Honda)',
  'FLEET',
  894,
  '2025-07-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-547',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-BRANKAS-HO' LIMIT 1),
  'bpkb_motor_a3012gq_3p2svhqn4mo0o.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":547,"no_polisi":"A 3012 GQ","no_chasis":"MH31KPOOBDJ545818","no_machine":"JKP-546022","brand_id":1,"brand_name":"Honda","cabinet_slot":null,"production_year":2013,"acquisition_year":2013,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":null},"id_number":"K-11889606"}'::jsonb,
  '2025-07-04'::timestamp,
  'Joni Sutopo',
  '2025-07-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 547
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'R-02136140',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A 9904 RM - (Daihatsu)',
  'FLEET',
  900,
  '2026-05-19'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-548',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9904RM.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":548,"no_polisi":"A 9904 RM","no_chasis":"MHKV3BA3JFK039649","no_machine":"K3MG56030","brand_id":20,"brand_name":"Daihatsu","cabinet_slot":"R1","production_year":2015,"acquisition_year":2015,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36","ip_address":"10.2.3.1","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"R-02136140"}'::jsonb,
  '2026-05-19'::timestamp,
  'Joni Sutopo',
  '2026-05-19'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 548
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'R-02184373',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9481U - (Hino)',
  'FLEET',
  907,
  '2026-03-26'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-549',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9481U.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":549,"no_polisi":"A9481U","no_chasis":"MJEFM2PK1MJM11248","no_machine":"P11CVPJ11888","brand_id":2,"brand_name":"Hino","cabinet_slot":"B2","production_year":2021,"acquisition_year":2022,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36","ip_address":"103.140.130.220","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"R-02184373"}'::jsonb,
  '2026-03-26'::timestamp,
  'Joni Sutopo',
  '2026-03-26'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 549
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
  title,
  entity_type,
  asset_id,
  issue_date,
  expiry_date,
  status,
  current_version,
  physical_status,
  qr_code_id,
  filing_location_id,
  file_path,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
)
SELECT
  gen_random_uuid(),
  'R-02184372',
  (SELECT id FROM dms.m_doc_type WHERE code = 'BPKB' LIMIT 1),
  'BPKB - A9480U - (Hino)',
  'FLEET',
  906,
  '2026-03-26'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-BPKB-550',
  (SELECT id FROM dms.m_filing_location WHERE code = 'LOC-DEPT-LEGAL' LIMIT 1),
  'BPKB_A9480U.pdf',
  'Ownership Code: 8',
  '{"legacy_source":"bpkb_header","legacy_id":550,"no_polisi":"A9480U","no_chasis":"MJEFM2PK1MJM11247","no_machine":"P11CVPJ11887","brand_id":2,"brand_name":"Hino","cabinet_slot":"B2","production_year":2021,"acquisition_year":2022,"color_code":"12","ownership_code":"8","foto_upload":null,"is_lifetime":true,"legacy_audit":{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36","ip_address":"103.140.130.220","created_user":"Joni Sutopo","modified_user":"Joni Sutopo"},"id_number":"R-02184372"}'::jsonb,
  '2026-03-26'::timestamp,
  'Joni Sutopo',
  '2026-03-26'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'bpkb_header'
    AND (metadata->>'legacy_id')::int = 550
);

-- 3. Back-synchronize no_bpkb to fleet.unit

UPDATE fleet.unit SET no_bpkb = '01793755', updated_at = NOW() WHERE id = 689 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793756', updated_at = NOW() WHERE id = 690 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'J-02730325', updated_at = NOW() WHERE id = 223 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'F-0442578', updated_at = NOW() WHERE id = 442 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'D-2447637', updated_at = NOW() WHERE id = 480 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'I-07572322', updated_at = NOW() WHERE id = 159 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'I-07575349', updated_at = NOW() WHERE id = 192 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-04957551', updated_at = NOW() WHERE id = 657 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-04957548', updated_at = NOW() WHERE id = 238 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-04652212', updated_at = NOW() WHERE id = 115 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'A-9065719', updated_at = NOW() WHERE id = 68 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '9065730', updated_at = NOW() WHERE id = 430 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'A-9065733', updated_at = NOW() WHERE id = 431 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'A-9065743', updated_at = NOW() WHERE id = 69 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '6392410H', updated_at = NOW() WHERE id = 886 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '9065753I', updated_at = NOW() WHERE id = 543 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '3095560G', updated_at = NOW() WHERE id = 509 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '6555433G', updated_at = NOW() WHERE id = 402 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '6516958G', updated_at = NOW() WHERE id = 365 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '6517456', updated_at = NOW() WHERE id = 403 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '4646956G', updated_at = NOW() WHERE id = 675 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '5057612G', updated_at = NOW() WHERE id = 291 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '3319928G', updated_at = NOW() WHERE id = 176 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01796599', updated_at = NOW() WHERE id = 167 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01796600', updated_at = NOW() WHERE id = 168 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01796601', updated_at = NOW() WHERE id = 169 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01796602', updated_at = NOW() WHERE id = 170 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-017966003', updated_at = NOW() WHERE id = 171 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01800272', updated_at = NOW() WHERE id = 383 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01794713', updated_at = NOW() WHERE id = 175 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793886', updated_at = NOW() WHERE id = 408 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793718', updated_at = NOW() WHERE id = 377 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793720', updated_at = NOW() WHERE id = 379 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01794708', updated_at = NOW() WHERE id = 152 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793719', updated_at = NOW() WHERE id = 378 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01800274', updated_at = NOW() WHERE id = 390 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01794712', updated_at = NOW() WHERE id = 156 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01794710', updated_at = NOW() WHERE id = 251 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01794702', updated_at = NOW() WHERE id = 157 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01794951', updated_at = NOW() WHERE id = 151 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793487', updated_at = NOW() WHERE id = 412 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01800276', updated_at = NOW() WHERE id = 387 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01794703', updated_at = NOW() WHERE id = 154 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793717', updated_at = NOW() WHERE id = 406 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01794701', updated_at = NOW() WHERE id = 158 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793715', updated_at = NOW() WHERE id = 404 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793716', updated_at = NOW() WHERE id = 405 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793887', updated_at = NOW() WHERE id = 409 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793486', updated_at = NOW() WHERE id = 411 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793485', updated_at = NOW() WHERE id = 382 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793885', updated_at = NOW() WHERE id = 407 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793888', updated_at = NOW() WHERE id = 410 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01800275', updated_at = NOW() WHERE id = 386 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793483', updated_at = NOW() WHERE id = 380 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01794711', updated_at = NOW() WHERE id = 150 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01800273', updated_at = NOW() WHERE id = 384 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01794709', updated_at = NOW() WHERE id = 153 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-01793484', updated_at = NOW() WHERE id = 381 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-06453072', updated_at = NOW() WHERE id = 391 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-06453075', updated_at = NOW() WHERE id = 394 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-06453079', updated_at = NOW() WHERE id = 395 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-06453073', updated_at = NOW() WHERE id = 392 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-06453069', updated_at = NOW() WHERE id = 388 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-06453074', updated_at = NOW() WHERE id = 393 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660564', updated_at = NOW() WHERE id = 141 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660565', updated_at = NOW() WHERE id = 142 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660566', updated_at = NOW() WHERE id = 666 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660575', updated_at = NOW() WHERE id = 144 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660575', updated_at = NOW() WHERE id = 145 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660577', updated_at = NOW() WHERE id = 146 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660578', updated_at = NOW() WHERE id = 147 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-01660579', updated_at = NOW() WHERE id = 148 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660594', updated_at = NOW() WHERE id = 149 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660595', updated_at = NOW() WHERE id = 444 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660917', updated_at = NOW() WHERE id = 182 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660978', updated_at = NOW() WHERE id = 183 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660919', updated_at = NOW() WHERE id = 184 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660920', updated_at = NOW() WHERE id = 185 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660923', updated_at = NOW() WHERE id = 126 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660924', updated_at = NOW() WHERE id = 128 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660925', updated_at = NOW() WHERE id = 129 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660926', updated_at = NOW() WHERE id = 127 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660927', updated_at = NOW() WHERE id = 188 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660928', updated_at = NOW() WHERE id = 130 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660532', updated_at = NOW() WHERE id = 131 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660533', updated_at = NOW() WHERE id = 132 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660534', updated_at = NOW() WHERE id = 133 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660535', updated_at = NOW() WHERE id = 134 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660536', updated_at = NOW() WHERE id = 135 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660537', updated_at = NOW() WHERE id = 136 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660538', updated_at = NOW() WHERE id = 137 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660539', updated_at = NOW() WHERE id = 138 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660540', updated_at = NOW() WHERE id = 139 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10660541', updated_at = NOW() WHERE id = 140 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K - 01794833', updated_at = NOW() WHERE id = 123 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K - 06453070', updated_at = NOW() WHERE id = 389 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K - 06453071', updated_at = NOW() WHERE id = 390 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L - 10660921', updated_at = NOW() WHERE id = 186 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L - 10660922', updated_at = NOW() WHERE id = 187 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-04957934', updated_at = NOW() WHERE id = 116 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-04957935', updated_at = NOW() WHERE id = 117 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-04957936', updated_at = NOW() WHERE id = 903 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10700763', updated_at = NOW() WHERE id = 262 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '0188131', updated_at = NOW() WHERE id = 45 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '0188147', updated_at = NOW() WHERE id = 44 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '0280119', updated_at = NOW() WHERE id = 48 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '0280120', updated_at = NOW() WHERE id = 43 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '0026189', updated_at = NOW() WHERE id = 47 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-04652212', updated_at = NOW() WHERE id = 115 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '2031767', updated_at = NOW() WHERE id = 542 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '2032075', updated_at = NOW() WHERE id = 670 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '2032973', updated_at = NOW() WHERE id = 252 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '07425425', updated_at = NOW() WHERE id = 356 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '9947589', updated_at = NOW() WHERE id = 469 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '9959355', updated_at = NOW() WHERE id = 485 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '0408322', updated_at = NOW() WHERE id = 357 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '04083232', updated_at = NOW() WHERE id = 111 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '0745421', updated_at = NOW() WHERE id = 550 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '9961887', updated_at = NOW() WHERE id = 359 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '0745426', updated_at = NOW() WHERE id = 360 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '0753430', updated_at = NOW() WHERE id = 217 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '0828722', updated_at = NOW() WHERE id = 361 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '1118780', updated_at = NOW() WHERE id = 112 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '1107333', updated_at = NOW() WHERE id = 417 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '1107447', updated_at = NOW() WHERE id = 418 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '1107271', updated_at = NOW() WHERE id = 433 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '3830482', updated_at = NOW() WHERE id = 113 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '3830881', updated_at = NOW() WHERE id = 452 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '3830481', updated_at = NOW() WHERE id = 338 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '4198249', updated_at = NOW() WHERE id = 343 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '7012896', updated_at = NOW() WHERE id = 281 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '7016182', updated_at = NOW() WHERE id = 282 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '7003361', updated_at = NOW() WHERE id = 284 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '7033638', updated_at = NOW() WHERE id = 283 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '7033872', updated_at = NOW() WHERE id = 285 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '7033636', updated_at = NOW() WHERE id = 530 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '2581186', updated_at = NOW() WHERE id = 535 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '074542', updated_at = NOW() WHERE id = 358 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '3830884', updated_at = NOW() WHERE id = 534 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '3829308', updated_at = NOW() WHERE id = 537 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '419950', updated_at = NOW() WHERE id = 671 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '419802', updated_at = NOW() WHERE id = 533 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '0026342', updated_at = NOW() WHERE id = 46 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'B-0352791', updated_at = NOW() WHERE id = 201 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'I-07575349', updated_at = NOW() WHERE id = 192 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '2031765', updated_at = NOW() WHERE id = 669 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '9065734', updated_at = NOW() WHERE id = 428 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'N-02423262', updated_at = NOW() WHERE id = 885 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '953211', updated_at = NOW() WHERE id = 536 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '4196409', updated_at = NOW() WHERE id = 351 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '4196690', updated_at = NOW() WHERE id = 352 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = '4685960', updated_at = NOW() WHERE id = 114 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10700762', updated_at = NOW() WHERE id = 258 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10700757', updated_at = NOW() WHERE id = 266 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10700762', updated_at = NOW() WHERE id = 258 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10700765', updated_at = NOW() WHERE id = 260 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10700766', updated_at = NOW() WHERE id = 263 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10700758', updated_at = NOW() WHERE id = 267 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10700761', updated_at = NOW() WHERE id = 264 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10700759', updated_at = NOW() WHERE id = 259 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-10700764', updated_at = NOW() WHERE id = 265 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'M-12011796', updated_at = NOW() WHERE id = 765 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'M-05896155', updated_at = NOW() WHERE id = 655 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'M-05896154', updated_at = NOW() WHERE id = 654 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'M-05896156', updated_at = NOW() WHERE id = 656 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'M-05896153', updated_at = NOW() WHERE id = 653 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'M-05896152', updated_at = NOW() WHERE id = 652 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'M-05896292', updated_at = NOW() WHERE id = 489 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'M-05896288', updated_at = NOW() WHERE id = 499 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'M-05896291', updated_at = NOW() WHERE id = 491 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'M-05896290', updated_at = NOW() WHERE id = 490 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'M-05896289', updated_at = NOW() WHERE id = 488 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'M-05896287', updated_at = NOW() WHERE id = 647 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'M-05896286', updated_at = NOW() WHERE id = 646 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-08581694', updated_at = NOW() WHERE id = 39 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-08581690', updated_at = NOW() WHERE id = 35 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-08581691', updated_at = NOW() WHERE id = 36 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-08581693', updated_at = NOW() WHERE id = 38 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'L-08581692', updated_at = NOW() WHERE id = 37 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'M-09374306', updated_at = NOW() WHERE id = 702 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'M-09374307', updated_at = NOW() WHERE id = 703 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'Q03245770', updated_at = NOW() WHERE id = 896 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'K-11889606', updated_at = NOW() WHERE id = 894 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');
UPDATE fleet.unit SET no_bpkb = 'R-02136140', updated_at = NOW() WHERE id = 900 AND (no_bpkb IS NULL OR trim(no_bpkb) = '');