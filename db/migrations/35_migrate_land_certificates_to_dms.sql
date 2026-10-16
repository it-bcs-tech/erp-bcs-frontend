-- Migration: 35_migrate_land_certificates_to_dms.sql
-- Ingest 70 land certificates (SHM & SHGB) from db/land_certificate.sql into dms.documents

INSERT INTO dms.m_doc_type (code, name, description, is_active)
VALUES (
    'SERTIFIKAT_TANAH',
    'Sertifikat Tanah (SHM / SHGB)',
    'Sertifikat Hak Milik (SHM) dan Hak Guna Bangunan (SHGB) Lahan dan Properti Perusahaan',
    true
)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Data executed via src/lib/server/migrations/migrate_land_certificates_to_dms.cjs
-- Verified 70 land certificates (63 SHM, 7 SHGB) mapped with metadata, filing_location RAK-A2, and company holding.
