-- Migration 24: Direct Migration of biodata_village.sql to dms.documents
-- Generated Idempotent Migration Script
-- Date: 2026-09-21

-- 1. Ensure master doc_types in dms.m_doc_type
INSERT INTO dms.m_doc_type (code, name, description, is_active)
VALUES 
  ('KTP', 'Kartu Tanda Penduduk', 'Identitas Kependudukan / KTP Pribadi atau Organ Perusahaan', true),
  ('NPWP', 'Nomor Pokok Wajib Pajak', 'Kartu / Surat Keterangan Pajak (NPWP Pribadi & Badan)', true),
  ('KK', 'Kartu Keluarga', 'Kartu Keluarga (KK) Eksekutif & Karyawan', true),
  ('PASPOR', 'Paspor', 'Dokumen Perjalanan / Paspor Pribadi', true),
  ('BUKU_NIKAH', 'Buku / Akta Nikah', 'Buku Nikah / Dokumen Perkawinan', true),
  ('AKTA', 'Akta Kelahiran / Akta Sipil', 'Akta Kelahiran atau Dokumen Catatan Sipil', true),
  ('LEGAL_ORGAN', 'Legalitas Organ Perusahaan', 'Dokumen Legalitas Jabatan Direksi, Komisaris, dan Pemegang Saham', true)
ON CONFLICT (code) DO NOTHING;

-- 2. Ensure adm_village mapped to dms.m_filing_location
INSERT INTO dms.m_filing_location (code, name, description, is_active)
VALUES
  ('LOC-SWH', 'Kantor / Arsip Sawangan', 'Lokasi Wilayah Sawangan (adm_village)', true),
  ('LOC-PLM', 'Kantor / Arsip Pulo Merak', 'BCS Logistics Center Pulo Merak (adm_village)', true)
ON CONFLICT (code) DO NOTHING;

-- 3. Compatibility views for dms.doc_types and dms.filing_locations
CREATE OR REPLACE VIEW dms.doc_types AS SELECT * FROM dms.m_doc_type;

CREATE OR REPLACE VIEW dms.filing_locations AS SELECT * FROM dms.m_filing_location;

-- 4. Migrate documents from biodata_doc and biodata_doc_legal into dms.documents

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - H. Muhamad Mardiono',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-3',
  'KTP_Mardiono_Bintaro_New.pdf',
  'KTP Elektronik New',
  '{"legacy_source": "biodata_doc", "legacy_id": 3, "owner_name": "H. Muhamad Mardiono", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}, "keterangan_tambahan": "KTP Elektronik New"}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 3
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KK' LIMIT 1),
  'Kartu Keluarga (KK) - H. Muhamad Mardiono',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-4',
  'KK_Pa_Mardiono_Istora_Utama_NEW.pdf',
  'Kartu Keluarga (Istora)',
  '{"legacy_source": "biodata_doc", "legacy_id": 4, "owner_name": "H. Muhamad Mardiono", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}, "keterangan_tambahan": "Kartu Keluarga (Istora)"}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 4
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - H. Muhamad Mardiono',
  'CORPORATE',
  '2019-01-18'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-5',
  'NPWP_HMM.pdf',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 5, "owner_name": "H. Muhamad Mardiono", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2019-01-18'::timestamp,
  'Dwi Hardianto',
  '2019-01-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 5
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Heri Iswahjudi',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-6',
  '10.KTP_Heri_Iswahjudi.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 6, "owner_name": "Heri Iswahjudi", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 6
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Heri Iswahjudi',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-7',
  '11.NPWP_Heri_Iswahjudi.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 7, "owner_name": "Heri Iswahjudi", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 7
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - H. Maskawi',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-8',
  'KTP_H._Maskawi_bp3g5vqyeg8o.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 8, "owner_name": "H. Maskawi", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 8
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - H. Maskawi',
  'CORPORATE',
  '2021-08-02'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-9',
  'NPWP_H._Maskawi.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 9, "owner_name": "H. Maskawi", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2021-08-02'::timestamp,
  'Dwi Hardianto',
  '2021-08-02'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 9
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KK' LIMIT 1),
  'Kartu Keluarga (KK) - H. Maskawi',
  'CORPORATE',
  '2022-09-21'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-10',
  'Kartu_Keluarga_H.Kawi.pdf',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 10, "owner_name": "H. Maskawi", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2022-09-21'::timestamp,
  'Dwi Hardianto',
  '2022-09-21'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 10
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Farjuni Sofiyanto',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-11',
  'ktp_Pa_Jujun.png',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 11, "owner_name": "Farjuni Sofiyanto", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 11
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Farjuni Sofiyanto',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-12',
  'NPWP_Pa_Jujun.png',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 12, "owner_name": "Farjuni Sofiyanto", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 12
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KK' LIMIT 1),
  'Kartu Keluarga (KK) - Farjuni Sofiyanto',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-13',
  'kartu_keluarga_Pa_Jujun.png',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 13, "owner_name": "Farjuni Sofiyanto", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 13
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - H. Embay Mulya Syarief',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-14',
  '04.KTP_H._EMBAY.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 14, "owner_name": "H. Embay Mulya Syarief", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 14
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - H. Embay Mulya Syarief',
  'CORPORATE',
  '2021-08-02'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-15',
  'WhatsApp_Image_2021-08-02_at_12.47.32.jpeg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 15, "owner_name": "H. Embay Mulya Syarief", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2021-08-02'::timestamp,
  'Dwi Hardianto',
  '2021-08-02'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 15
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - H. Panji Tresna',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-16',
  'KTP_Pa_Panji.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 16, "owner_name": "H. Panji Tresna", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 16
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - H. Panji Tresna',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-17',
  'NPWP_Pa_Panji.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 17, "owner_name": "H. Panji Tresna", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 17
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Dian Pratiwi',
  'CORPORATE',
  '2019-02-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-18',
  'KTP_Tiwi.png',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 18, "owner_name": "Dian Pratiwi", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2019-02-04'::timestamp,
  'Dwi Hardianto',
  '2019-02-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 18
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Dian Pratiwi',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-19',
  'NPWP-dian_pratiwi.JPG',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 19, "owner_name": "Dian Pratiwi", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 19
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Fajar Hadi Prabowo',
  'CORPORATE',
  '2020-05-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-20',
  'KTP_Mas_Bowo_New.jpeg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 20, "owner_name": "Fajar Hadi Prabowo", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2020-05-04'::timestamp,
  'Dwi Hardianto',
  '2020-05-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 20
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Fajar Hadi Prabowo',
  'CORPORATE',
  '2018-10-16'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-21',
  'NPWP_MAs_Bowo.png',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 21, "owner_name": "Fajar Hadi Prabowo", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2018-10-16'::timestamp,
  'Dwi Hardianto',
  '2018-10-16'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 21
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Tita Mardiyani',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-22',
  'KTP_Bu_Tita.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 22, "owner_name": "Tita Mardiyani", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 22
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Tita Mardiyani',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-23',
  'tm-NPWP_IBU_TITA.JPG',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 23, "owner_name": "Tita Mardiyani", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 23
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Much Tamam Faisal',
  'CORPORATE',
  '2019-10-16'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-24',
  'KTP_TAMAM',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 24, "owner_name": "Much Tamam Faisal", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2019-10-16'::timestamp,
  'Dwi Hardianto',
  '2019-10-16'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 24
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Much Tamam Faisal',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-25',
  'NPWP_Pa_Tamam.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 25, "owner_name": "Much Tamam Faisal", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 25
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KK' LIMIT 1),
  'Kartu Keluarga (KK) - Much Tamam Faisal',
  'CORPORATE',
  '2018-10-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-26',
  'KK_Pa_Tamam.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 26, "owner_name": "Much Tamam Faisal", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-15'::timestamp,
  'Dwi Hardianto',
  '2018-10-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 26
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Warsita Cipta Utama',
  'CORPORATE',
  '2018-10-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-27',
  '08.KTP_Warsita.pdf',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 27, "owner_name": "Warsita Cipta Utama", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-17'::timestamp,
  'Dwi Hardianto',
  '2018-10-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 27
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Warsita Cipta Utama',
  'CORPORATE',
  '2018-10-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-28',
  '09.npwp_ir_warsita.pdf',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 28, "owner_name": "Warsita Cipta Utama", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-17'::timestamp,
  'Dwi Hardianto',
  '2018-10-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 28
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Wira Lazuardi',
  'CORPORATE',
  '2018-10-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-29',
  'KTP_Pak_Wira.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 29, "owner_name": "Wira Lazuardi", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-17'::timestamp,
  'Dwi Hardianto',
  '2018-10-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 29
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Wira Lazuardi',
  'CORPORATE',
  '2018-10-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-30',
  'NPWP_Pak_Wira.pdf',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 30, "owner_name": "Wira Lazuardi", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-17'::timestamp,
  'Dwi Hardianto',
  '2018-10-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 30
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Wahyu Denyanto',
  'CORPORATE',
  '2018-10-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-31',
  'KTP_Pa_Deny.png',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 31, "owner_name": "Wahyu Denyanto", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-17'::timestamp,
  'Dwi Hardianto',
  '2018-10-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 31
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Wahyu Denyanto',
  'CORPORATE',
  '2018-10-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-32',
  'NPWP_Pa_Deny.png',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 32, "owner_name": "Wahyu Denyanto", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:55.0) Gecko/20100101 Firefox/55.0", "ip_address": "10.2.2.144", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2018-10-17'::timestamp,
  'Dwi Hardianto',
  '2018-10-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 32
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Moenawar Djojo Soemarto (Munawar)',
  'CORPORATE',
  '2020-03-13'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-48',
  'WhatsApp_Image_2020-03-06_at_13.38.27.jpeg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 48, "owner_name": "Moenawar Djojo Soemarto (Munawar)", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.197", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2020-03-13'::timestamp,
  'Dwi Hardianto',
  '2020-03-13'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 48
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Moenawar Djojo Soemarto (Munawar)',
  'CORPORATE',
  '2019-01-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-49',
  'npwp_munawar.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 49, "owner_name": "Moenawar Djojo Soemarto (Munawar)", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.197", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2019-01-17'::timestamp,
  'Dwi Hardianto',
  '2019-01-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 49
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Ari Stuali',
  'CORPORATE',
  '2019-01-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-50',
  'ktp_Ari_Stuali.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 50, "owner_name": "Ari Stuali", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.197", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2019-01-17'::timestamp,
  'Dwi Hardianto',
  '2019-01-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 50
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Ari Stuali',
  'CORPORATE',
  '2019-01-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-51',
  'npwp_Ari_Stuali.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 51, "owner_name": "Ari Stuali", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.197", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2019-01-17'::timestamp,
  'Dwi Hardianto',
  '2019-01-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 51
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - JA Ferdyansyah',
  'CORPORATE',
  '2019-01-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-52',
  'ktp_JA._Ferdyansyah.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 52, "owner_name": "JA Ferdyansyah", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.197", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2019-01-17'::timestamp,
  'Dwi Hardianto',
  '2019-01-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 52
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - JA Ferdyansyah',
  'CORPORATE',
  '2019-01-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-53',
  'npwp_JA._Ferdyansyah.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 53, "owner_name": "JA Ferdyansyah", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.197", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2019-01-17'::timestamp,
  'Dwi Hardianto',
  '2019-01-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 53
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Deny Yanuarto',
  'CORPORATE',
  '2019-01-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-54',
  'KTP_Deny_Yanuarto.png',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 54, "owner_name": "Deny Yanuarto", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.140", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2019-01-17'::timestamp,
  'Dwi Hardianto',
  '2019-01-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 54
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Deny Yanuarto',
  'CORPORATE',
  '2019-01-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-55',
  'NPWP_Deny_Yanuarto.png',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 55, "owner_name": "Deny Yanuarto", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.140", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2019-01-17'::timestamp,
  'Dwi Hardianto',
  '2019-01-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 55
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Didi Sunardi',
  'CORPORATE',
  '2019-02-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-56',
  'KTP_Didi.png',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 56, "owner_name": "Didi Sunardi", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.140", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2019-02-04'::timestamp,
  'Dwi Hardianto',
  '2019-02-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 56
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Didi Sunardi',
  'CORPORATE',
  '2019-02-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-57',
  'NPWP_Didi_S.png',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 57, "owner_name": "Didi Sunardi", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.140", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2019-02-04'::timestamp,
  'Dwi Hardianto',
  '2019-02-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 57
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Subroto',
  'CORPORATE',
  '2019-01-18'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-58',
  'KTP_Subroto.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 58, "owner_name": "Subroto", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.197", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2019-01-18'::timestamp,
  'Dwi Hardianto',
  '2019-01-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 58
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Subroto',
  'CORPORATE',
  '2019-01-18'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-59',
  'NPWP_Subroto.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 59, "owner_name": "Subroto", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.197", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2019-01-18'::timestamp,
  'Dwi Hardianto',
  '2019-01-18'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 59
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Ibu Rumiah',
  'CORPORATE',
  '2023-01-12'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-60',
  'Ibu_Rumiah.jpeg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 60, "owner_name": "Ibu Rumiah", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.130", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2023-01-12'::timestamp,
  'Dwi Hardianto',
  '2023-01-12'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 60
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Ibu Rumiah',
  'CORPORATE',
  '2023-01-12'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-61',
  'NPWP_Bu_Rumiah.jpeg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 61, "owner_name": "Ibu Rumiah", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.130", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2023-01-12'::timestamp,
  'Dwi Hardianto',
  '2023-01-12'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 61
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'BUKU_NIKAH' LIMIT 1),
  'Akta / Buku Nikah Mas Bowo - Fajar Hadi Prabowo',
  'CORPORATE',
  '2019-10-08'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-62',
  'Akta_Nikah_Mas_Bowo.20_20190715155630',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 62, "owner_name": "Fajar Hadi Prabowo", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.178", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2019-10-08'::timestamp,
  'Dwi Hardianto',
  '2019-10-08'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 62
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'LEGAL_PERUSAHAAN' LIMIT 1),
  'Kartu Tanda Penduduk Istri Mas Bowo - Nur Kusuma Ngarasati',
  'CORPORATE',
  '2020-05-04'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-63',
  'KTP_Istri_Mas_Bowo_New.jpeg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 63, "owner_name": "Nur Kusuma Ngarasati", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.164", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2020-05-04'::timestamp,
  'Dwi Hardianto',
  '2020-05-04'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 63
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KK' LIMIT 1),
  'Kartu Keluarga Nur Kusuma Ngarasati (Istri Mas Bowo) - Nur Kusuma Ngarasati',
  'CORPORATE',
  '2019-07-17'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-64',
  'KK_-Nur_Kusuma_Ngarasati.pdf',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 64, "owner_name": "Nur Kusuma Ngarasati", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.164", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2019-07-17'::timestamp,
  'Dwi Hardianto',
  '2019-07-17'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 64
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'PASPOR' LIMIT 1),
  'Pasport Bu Tita - Tita Mardiyani',
  'CORPORATE',
  '2019-10-14'::date,
  '2024-01-21'::date,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-65',
  'WhatsApp_Image_2019-10-14_at_16.08.03.jpeg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 65, "owner_name": "Tita Mardiyani", "doc_category": "PERSONAL", "is_lifetime": false, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:63.0) Gecko/20100101 Firefox/63.0", "ip_address": "10.2.2.167", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2019-10-14'::timestamp,
  'Dwi Hardianto',
  '2019-10-14'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 65
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'AKTA' LIMIT 1),
  'Akta Kelahiran Bowo - Fajar Hadi Prabowo',
  'CORPORATE',
  '2020-03-03'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-66',
  'AKTA_LAHIR_BOWO.jpg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 66, "owner_name": "Fajar Hadi Prabowo", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:72.0) Gecko/20100101 Firefox/72.0", "ip_address": "10.2.2.150", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2020-03-03'::timestamp,
  'Dwi Hardianto',
  '2020-03-03'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 66
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KK' LIMIT 1),
  'Kartu Keluarga (KK) Mas Bowo - Fajar Hadi Prabowo',
  'CORPORATE',
  '2026-02-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-67',
  'KK.pdf',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 67, "owner_name": "Fajar Hadi Prabowo", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [{"file_name": "KK_FHP_NEW.pdf", "create_date": null, "create_user": null}], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:72.0) Gecko/20100101 Firefox/72.0", "ip_address": "10.2.2.169", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2026-02-24'::timestamp,
  'Dwi Hardianto',
  '2026-02-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 67
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Aunur Rofiq',
  'CORPORATE',
  '2020-12-22'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-68',
  'KTP_Aunur_Rofiq.pdf',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 68, "owner_name": "Aunur Rofiq", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:77.0) Gecko/20100101 Firefox/77.0", "ip_address": "10.2.3.1", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2020-12-22'::timestamp,
  'Dwi Hardianto',
  '2020-12-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 68
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Aunur Rofiq',
  'CORPORATE',
  '2020-12-22'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-69',
  'NPWP_Aunur_Rofdiq.pdf',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 69, "owner_name": "Aunur Rofiq", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:77.0) Gecko/20100101 Firefox/77.0", "ip_address": "10.2.3.1", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2020-12-22'::timestamp,
  'Dwi Hardianto',
  '2020-12-22'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 69
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'Kartu Tanda Penduduk (KTP) - Ujang Akbari',
  'CORPORATE',
  '2023-03-24'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-70',
  'KTP_Pa_Ujang.jpeg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 70, "owner_name": "Ujang Akbari", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:77.0) Gecko/20100101 Firefox/77.0", "ip_address": "10.2.3.1", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}}'::jsonb,
  '2023-03-24'::timestamp,
  'Dwi Hardianto',
  '2023-03-24'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 70
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'Nomor Pokok Wajib Pajak (NPWP) - Ujang Akbari',
  'CORPORATE',
  '2021-01-05'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-71',
  'npwp_p_uj.pdf',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 71, "owner_name": "Ujang Akbari", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:77.0) Gecko/20100101 Firefox/77.0", "ip_address": "10.2.3.1", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2021-01-05'::timestamp,
  'Dwi Hardianto',
  '2021-01-05'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 71
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KK' LIMIT 1),
  'Kartu Keluarga (KK) - Heri Iswahjudi',
  'CORPORATE',
  '2022-09-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-72',
  'KK_Pak_Yudi.pdf',
  'Kartu Keluarga',
  '{"legacy_source": "biodata_doc", "legacy_id": 72, "owner_name": "Heri Iswahjudi", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:88.0) Gecko/20100101 Firefox/88.0", "ip_address": "10.2.3.1", "created_user": "Dwi Hardianto", "modified_user": "Dwi Hardianto"}, "keterangan_tambahan": "Kartu Keluarga"}'::jsonb,
  '2022-09-15'::timestamp,
  'Dwi Hardianto',
  '2022-09-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 72
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'BUKU_NIKAH' LIMIT 1),
  'Buku Nikah - H. Maskawi',
  'CORPORATE',
  '2022-09-21'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-73',
  'Buku_Nikah_H._Kawi.pdf',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 73, "owner_name": "H. Maskawi", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:88.0) Gecko/20100101 Firefox/88.0", "ip_address": "10.2.3.1", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2022-09-21'::timestamp,
  'Dwi Hardianto',
  '2022-09-21'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 73
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'KTP Mas Gema - Mas Gema',
  'CORPORATE',
  '2025-12-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-74',
  'KTP_Mas_Gema.jpeg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 74, "owner_name": "Mas Gema", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [{"file_name": "KTP_Mas_Gema.jpeg", "create_date": null, "create_user": "Dwi Hardianto"}], "legacy_audit": {"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", "ip_address": "36.75.6.72", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2025-12-15'::timestamp,
  'Dwi Hardianto',
  '2025-12-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 74
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KK' LIMIT 1),
  'KK Mas Gema - Mas Gema',
  'CORPORATE',
  '2025-12-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-75',
  'KK_Mas_Gema.jpeg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 75, "owner_name": "Mas Gema", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [{"file_name": "KK_Mas_Gema.jpeg", "create_date": null, "create_user": "Dwi Hardianto"}], "legacy_audit": {"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", "ip_address": "36.75.6.72", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2025-12-15'::timestamp,
  'Dwi Hardianto',
  '2025-12-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 75
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'KTP Mas Agus - Agus Budi Pratopo',
  'CORPORATE',
  '2026-03-02'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-76',
  'WhatsApp_Image_2026-02-05_at_11.28.21_1.jpeg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 76, "owner_name": "Agus Budi Pratopo", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [{"file_name": "WhatsApp_Image_2026-02-05_at_11.28.21_1.jpeg", "create_date": null, "create_user": "Dwi Hardianto"}], "legacy_audit": {"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", "ip_address": "140.213.251.71", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2026-03-02'::timestamp,
  'Dwi Hardianto',
  '2026-03-02'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 76
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KK' LIMIT 1),
  'KK Mas Agus - Agus Budi Pratopo',
  'CORPORATE',
  '2026-03-02'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-77',
  'KK_Mas_Agus_Old.jpeg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 77, "owner_name": "Agus Budi Pratopo", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [{"file_name": "KK_Mas_Agus_Old.jpeg", "create_date": null, "create_user": "Dwi Hardianto"}], "legacy_audit": {"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", "ip_address": "140.213.251.71", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2026-03-02'::timestamp,
  'Dwi Hardianto',
  '2026-03-02'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 77
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'KTP Mas Edi - Edi Kusbiyantoro',
  'CORPORATE',
  '2026-03-02'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-PERS-78',
  'WhatsApp_Image_2026-02-05_at_11.32.08.jpeg',
  NULL,
  '{"legacy_source": "biodata_doc", "legacy_id": 78, "owner_name": "Edi Kusbiyantoro", "doc_category": "PERSONAL", "is_lifetime": true, "additional_files": [{"file_name": "WhatsApp_Image_2026-02-05_at_11.32.08.jpeg", "create_date": null, "create_user": "Dwi Hardianto"}], "legacy_audit": {"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", "ip_address": "140.213.251.71", "created_user": "Dwi Hardianto", "modified_user": null}}'::jsonb,
  '2026-03-02'::timestamp,
  'Dwi Hardianto',
  '2026-03-02'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc'
    AND (metadata->>'legacy_id')::int = 78
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '3603281107570003',
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'KTP KOMISARIS UTAMA - H. MUHAMAD MARDIONO,BA',
  'CORPORATE',
  '2025-12-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-5',
  'KTP_MUHAMAD_MARDIONO.pdf',
  '3603281107570003',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 5, "owner_name": "H. MUHAMAD MARDIONO,BA", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:68.0) Gecko/20100101 Firefox/68.0", "ip_address": "10.2.2.54", "created_user": "Herry Arisyam", "modified_user": "Joni Sutopo"}, "id_number": "3603281107570003"}'::jsonb,
  '2025-12-10'::timestamp,
  'Herry Arisyam',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 5
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '3604050304590002',
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'KTP DIREKTUR UTAMA - H. MASKAWI',
  'CORPORATE',
  '2025-12-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-6',
  'KTP_H_MASKAWI.pdf',
  '3604050304590002',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 6, "owner_name": "H. MASKAWI", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:68.0) Gecko/20100101 Firefox/68.0", "ip_address": "10.2.2.54", "created_user": "Herry Arisyam", "modified_user": "Joni Sutopo"}, "id_number": "3604050304590002"}'::jsonb,
  '2025-12-10'::timestamp,
  'Herry Arisyam',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 6
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '3672060406700002',
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'KTP DIREKTUR KEUANGAN - FARJUNI SOFIYANTO',
  'CORPORATE',
  '2025-12-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-7',
  'KTP_FARJUNI_SOFIYANTO.pdf',
  '3672060406700002',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 7, "owner_name": "FARJUNI SOFIYANTO", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:68.0) Gecko/20100101 Firefox/68.0", "ip_address": "10.2.2.54", "created_user": "Herry Arisyam", "modified_user": "Joni Sutopo"}, "id_number": "3672060406700002"}'::jsonb,
  '2025-12-10'::timestamp,
  'Herry Arisyam',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 7
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '3175081907700004',
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'KTP DIREKTUR OPERASIONAL - HERI ISWAHJUDI',
  'CORPORATE',
  '2025-12-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-8',
  'KTP_HERI_ISWAHJUDI.pdf',
  '3175081907700004',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 8, "owner_name": "HERI ISWAHJUDI", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:68.0) Gecko/20100101 Firefox/68.0", "ip_address": "10.2.2.54", "created_user": "Herry Arisyam", "modified_user": "Joni Sutopo"}, "id_number": "3175081907700004"}'::jsonb,
  '2025-12-10'::timestamp,
  'Herry Arisyam',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 8
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '3674031411890012',
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'KTP DIREKTUR HUMAN CAPITAL - FAJAR HADI PRABOWO',
  'CORPORATE',
  '2025-12-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-9',
  'KTP_FAJAR_HADI_PRABOWO.pdf',
  '3674031411890012',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 9, "owner_name": "FAJAR HADI PRABOWO", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:68.0) Gecko/20100101 Firefox/68.0", "ip_address": "10.2.2.54", "created_user": "Herry Arisyam", "modified_user": "Joni Sutopo"}, "id_number": "3674031411890012"}'::jsonb,
  '2025-12-10'::timestamp,
  'Herry Arisyam',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 9
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '3271021902440001',
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'KTP KOMISARIS - HAJI MOENAWAR DJOJO SOEMARTO',
  'CORPORATE',
  '2025-12-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-11',
  'KTP_MOENAWAR_DJOJO_SOEMARTOSE.pdf',
  '3271021902440001',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 11, "owner_name": "HAJI MOENAWAR DJOJO SOEMARTO", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:68.0) Gecko/20100101 Firefox/68.0", "ip_address": "10.2.2.54", "created_user": "Herry Arisyam", "modified_user": "Joni Sutopo"}, "id_number": "3271021902440001"}'::jsonb,
  '2025-12-10'::timestamp,
  'Herry Arisyam',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 11
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '3604010403520004',
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'KTP KOMISARIS - H. EMBAY MULYA SYARIEF',
  'CORPORATE',
  '2025-12-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-12',
  'KTP_EMBAY_MULYA_SYARIF.pdf',
  '3604010403520004',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 12, "owner_name": "H. EMBAY MULYA SYARIEF", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:68.0) Gecko/20100101 Firefox/68.0", "ip_address": "10.2.2.161", "created_user": "Herry Arisyam", "modified_user": "Joni Sutopo"}, "id_number": "3604010403520004"}'::jsonb,
  '2025-12-10'::timestamp,
  'Herry Arisyam',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 12
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '3275052112620012',
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'KTP  DIREKTUR BAHARI CARAKA INDONESIA - PANDJI TRESNA',
  'CORPORATE',
  '2025-12-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-13',
  'KTP_PANDJI_TRESNA.pdf',
  '3275052112620012',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 13, "owner_name": "PANDJI TRESNA", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:68.0) Gecko/20100101 Firefox/68.0", "ip_address": "10.2.2.161", "created_user": "Herry Arisyam", "modified_user": "Joni Sutopo"}, "id_number": "3275052112620012"}'::jsonb,
  '2025-12-10'::timestamp,
  'Herry Arisyam',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 13
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '3674034108940009',
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'KTP DIREKTUR - DIAN PRATIWI',
  'CORPORATE',
  '2025-12-10'::date,
  '2017-08-01'::date,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-14',
  'KTP_DIAN_PRATIWI.pdf',
  '3674034108940009',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 14, "owner_name": "DIAN PRATIWI", "doc_category": "LEGAL_ORGAN", "is_lifetime": false, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:68.0) Gecko/20100101 Firefox/68.0", "ip_address": "10.2.2.161", "created_user": "Herry Arisyam", "modified_user": "Joni Sutopo"}, "id_number": "3674034108940009"}'::jsonb,
  '2025-12-10'::timestamp,
  'Herry Arisyam',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 14
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  NULL,
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'KTP - AUNUR ROFIQ',
  'CORPORATE',
  '2025-12-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-15',
  'KTP_AUNUR_ROFIQ.pdf',
  'KOMISARIS PT_CNI',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 15, "owner_name": "AUNUR ROFIQ", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:66.0) Gecko/20100101 Firefox/66.0", "ip_address": "10.2.3.1", "created_user": "Herry Arisyam", "modified_user": "Joni Sutopo"}, "keterangan_tambahan": "KOMISARIS PT_CNI"}'::jsonb,
  '2025-12-10'::timestamp,
  'Herry Arisyam',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 15
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '01.892.301.1-415.000',
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'NPWP ELEKTRONIK_PT_BCS - BUANA CENTRA SWAKARSA',
  'CORPORATE',
  '2025-12-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-16',
  'NPWP_PT_BUANA_CENTRA_SWAKARSA.pdf',
  '01.892.301.1-415.000',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 16, "owner_name": "BUANA CENTRA SWAKARSA", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:66.0) Gecko/20100101 Firefox/66.0", "ip_address": "10.2.3.1", "created_user": "Herry Arisyam", "modified_user": "Joni Sutopo"}, "id_number": "01.892.301.1-415.000"}'::jsonb,
  '2025-12-10'::timestamp,
  'Herry Arisyam',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 16
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '09.162.810.7-401.000',
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'NPWP - H. MASKAWI',
  'CORPORATE',
  '2025-12-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-17',
  'NPWP_H.MASKAWI.pdf',
  '09.162.810.7-401.000',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 17, "owner_name": "H. MASKAWI", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/65.0.3325.181 Chrome/65.0.3325.181 Safari/537.36", "ip_address": "10.2.3.1", "created_user": "Herry Arisyam", "modified_user": "Joni Sutopo"}, "id_number": "09.162.810.7-401.000"}'::jsonb,
  '2025-12-10'::timestamp,
  'Herry Arisyam',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 17
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '07.088.251.9-417.00',
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'NPWP KOMISARIS UTAMA - H.MUHAMAD MARDIONO.BA',
  'CORPORATE',
  '2025-12-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-18',
  'NPWP_MUHAMAD_MARDIONO.pdf',
  '07.088.251.9-417.00',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 18, "owner_name": "H.MUHAMAD MARDIONO.BA", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (Windows NT 6.1; rv:109.0) Gecko/20100101 Firefox/110.0", "ip_address": "10.2.3.1", "created_user": "Joni Sutopo", "modified_user": "Joni Sutopo"}, "id_number": "07.088.251.9-417.00"}'::jsonb,
  '2025-12-10'::timestamp,
  'Joni Sutopo',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 18
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '46.891.704.2-451.000',
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'NPWP - Fajar Hadi Prabowo',
  'CORPORATE',
  '2025-12-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-19',
  'NPWP_FAJAR_HADI_PRABOWO.pdf',
  '46.891.704.2-451.000',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 19, "owner_name": "Fajar Hadi Prabowo", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36", "ip_address": "10.2.3.1", "created_user": "Joni Sutopo", "modified_user": "Joni Sutopo"}, "id_number": "46.891.704.2-451.000"}'::jsonb,
  '2025-12-10'::timestamp,
  'Joni Sutopo',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 19
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '06.415.133.5-401.000',
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'NPWP - H Embay Mulya Syarief',
  'CORPORATE',
  '2025-12-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-20',
  'NPWP_EMBAY_MULYA_SYARIEF.pdf',
  '06.415.133.5-401.000',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 20, "owner_name": "H Embay Mulya Syarief", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36", "ip_address": "10.2.3.1", "created_user": "Joni Sutopo", "modified_user": "Joni Sutopo"}, "id_number": "06.415.133.5-401.000"}'::jsonb,
  '2025-12-10'::timestamp,
  'Joni Sutopo',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 20
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '79.010.661.1-005.000',
  (SELECT id FROM dms.m_doc_type WHERE code = 'NPWP' LIMIT 1),
  'NPWP - HERI ISWAHJUDI',
  'CORPORATE',
  '2025-12-10'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-21',
  'NPWP_HERI_ISWAHJUDI.pdf',
  '79.010.661.1-005.000',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 21, "owner_name": "HERI ISWAHJUDI", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36", "ip_address": "10.2.3.1", "created_user": "Joni Sutopo", "modified_user": "Joni Sutopo"}, "id_number": "79.010.661.1-005.000"}'::jsonb,
  '2025-12-10'::timestamp,
  'Joni Sutopo',
  '2025-12-10'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 21
);

INSERT INTO dms.documents (
  id,
  doc_number,
  doc_type_id,
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
)
SELECT
  gen_random_uuid(),
  '3174052212920003',
  (SELECT id FROM dms.m_doc_type WHERE code = 'KTP' LIMIT 1),
  'KTP GEMA SATRIO WIBOWO - GEMA SATRIO WIBOWO',
  'CORPORATE',
  '2025-12-15'::date,
  NULL,
  'ACTIVE',
  1,
  'IN_STORAGE',
  'BCS-DMS-LEGL-22',
  'KTP_GEMA_SATRIO_WIBOWO.pdf',
  '3174052212920003',
  '{"legacy_source": "biodata_doc_legal", "legacy_id": 22, "owner_name": "GEMA SATRIO WIBOWO", "doc_category": "LEGAL_ORGAN", "is_lifetime": true, "additional_files": [], "legacy_audit": {"browser": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0", "ip_address": "10.2.3.1", "created_user": "Joni Sutopo", "modified_user": null}, "id_number": "3174052212920003"}'::jsonb,
  '2025-12-15'::timestamp,
  'Joni Sutopo',
  '2025-12-15'::timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM dms.documents
  WHERE metadata->>'legacy_source' = 'biodata_doc_legal'
    AND (metadata->>'legacy_id')::int = 22
);
