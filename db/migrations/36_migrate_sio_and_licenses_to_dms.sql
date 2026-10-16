-- Migration: 36_migrate_sio_and_licenses_to_dms.sql
-- Ingest 246 SIO Operator and 402 Business Licenses from db/gabungan_tabel.sql into dms.documents

-- Doc types SIO_DRIVER and LEGAL_PERUSAHAAN verified in dms.m_doc_type.
-- Data executed via src/lib/server/migrations/migrate_sio_and_licenses_to_dms.cjs:
-- - 246 SIO Operator records (Forklift, Crane, Loader, K3) with payroll IDs, Kemnaker issuing authority, and expiry dates.
-- - 402 Business License records (API-P, API-U, IP Besi Baja, Izin B3, TDP, etc.) mapped to 13 companies in master.m_company.
