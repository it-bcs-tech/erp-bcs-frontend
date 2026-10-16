-- Migration: 38_migrate_driver_b3_and_bank_facilities.sql
-- Ingest 130 Driver B3 Certificates (monitoring_sertifikat_b3) and 24 Bank Credit Agreements (red_bank)

-- Doc types created/verified in dms.m_doc_type:
-- - SERTIFIKAT_B3_DRIVER ('Sertifikat Pengemudi Angkutan B3', entity: DRIVER)
-- - KREDIT_PERBANKAN ('Perjanjian Kredit & Pembiayaan Bank', entity: CORPORATE)

-- Data execution performed via src/lib/server/migrations/migrate_driver_b3_and_bank_facilities.cjs:
-- 1. 130 driver B3 certificate records from `monitoring_sertifikat_b3` stored in dms.documents with QR BCS-DMS-DRVB3-xxxx, linked to master.m_karyawan / master.m_drivers via payroll IDs and extracted driver names.
-- 2. 24 bank credit & financing agreement records from `red_bank` (BNI, BMI, BSM, Bukopin) with 28 attached documents from `red_bank_detail` stored in dms.documents with QR BCS-DMS-BNK-xxxx.
