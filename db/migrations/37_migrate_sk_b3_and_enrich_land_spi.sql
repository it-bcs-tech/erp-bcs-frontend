-- Migration: 37_migrate_sk_b3_and_enrich_land_spi.sql
-- Ingest 63 SK Direksi, 169 Izin Limbah B3 (master_lisence_b3), and enrich 62 Land Certificates with SPI Bank Collateral status

-- Doc types created/verified in dms.m_doc_type:
-- - SK_DIREKSI ('Surat Keputusan Direksi', entity: CORPORATE)
-- - IZIN_B3 ('Kartu Pengawas & Rekomendasi B3', entity: FLEET)

-- Data execution performed via src/lib/server/migrations/migrate_sk_b3_and_enrich_land_spi.cjs:
-- 1. 63 SK Direksi records from `sk` table stored in dms.documents with QR BCS-DMS-SKD-xxxx.
-- 2. 169 B3 Fleet license & recommendation records from `master_lisence_b3` stored in dms.documents, 100% mapped to fleet.unit via chassis/plate numbers with QR BCS-DMS-B3-xxxx.
-- 3. 62 of 70 Land Certificates enriched with bank mortgage / pledge tracking (BNI, Mandiri, BPRS, etc.) from `spi` table; physical_status updated to LOANED_OUT when pledged.
