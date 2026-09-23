-- Migration 26: Create Master Document Category and add category_id to dms.documents
-- Date: 2026-09-23
-- Source: db/category.sql (legacy database: dms)

-- 1. Create table dms.m_doc_category
CREATE TABLE IF NOT EXISTS dms.m_doc_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    legacy_id INT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compatibility view
CREATE OR REPLACE VIEW dms.doc_categories AS 
SELECT * FROM dms.m_doc_category;

-- 2. Seed 7 Business Categories from category.sql
INSERT INTO dms.m_doc_category (code, name, description, legacy_id, is_active)
VALUES
    ('CAT-ANGKUTAN', 'Angkutan', 'Layanan transportasi darat & armada logistik umum', 4, true),
    ('CAT-PACKAGING', 'Packaging', 'Layanan pengemasan & packaging material', 5, true),
    ('CAT-BARCODE', 'Barcode', 'Sistem pelabelan, barcode & penandaan barang logistik', 6, true),
    ('CAT-TINPLATE', 'Angkutan Tinplate', 'Layanan transportasi khusus komoditas pelat timah / tinplate', 7, true),
    ('CAT-TMBP', 'TMBP', 'Fasilitas Tempat Menimbun Berikat Pabean / Kepabeanan', 8, true),
    ('CAT-GUDANG', 'Pergudangan', 'Manajemen gudang, penyimpanan & distribusi inventaris', 9, true),
    ('CAT-KEPABEANAN', 'Pengurusan Kepabeanan', 'Layanan PPJK (Perusahaan Pengurusan Jasa Kepabeanan / Bea Cukai)', 10, true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    legacy_id = EXCLUDED.legacy_id,
    updated_at = CURRENT_TIMESTAMP;

-- 3. Add category_id column to dms.documents
ALTER TABLE dms.documents 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES dms.m_doc_category(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_category_id ON dms.documents(category_id);

-- 4. Auto-backfill FLEET documents (BPKB, STNK, KIR) with CAT-ANGKUTAN
UPDATE dms.documents 
SET category_id = (SELECT id FROM dms.m_doc_category WHERE code = 'CAT-ANGKUTAN')
WHERE entity_type = 'FLEET' AND category_id IS NULL;
