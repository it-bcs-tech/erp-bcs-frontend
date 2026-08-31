-- =========================================================
-- PMS (Procurement Management System) Migration Schema
-- ERP BCS - Industry Standard Procurement Alignment
-- =========================================================

-- 1. Extend Master Site / Lokasi
ALTER TABLE master.m_lokasi 
  ADD COLUMN IF NOT EXISTS alias VARCHAR(100),
  ADD COLUMN IF NOT EXISTS contact_person VARCHAR(150),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address_1 TEXT,
  ADD COLUMN IF NOT EXISTS address_2 TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100);

-- 2. Extend Master Materials
ALTER TABLE master.m_materials
  ADD COLUMN IF NOT EXISTS spec TEXT,
  ADD COLUMN IF NOT EXISTS location_id INT;

-- 3. Extend Master Project
ALTER TABLE master.m_project
  ADD COLUMN IF NOT EXISTS project_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS site_id INT,
  ADD COLUMN IF NOT EXISTS remarks TEXT;

-- 4. Extend Procurement Purchase Request
ALTER TABLE procurement.purchase_request
  ADD COLUMN IF NOT EXISTS project_id INT,
  ADD COLUMN IF NOT EXISTS site_id INT,
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'SUPPORTING',
  ADD COLUMN IF NOT EXISTS required_date DATE;

-- 5. Extend Procurement Purchase Order
ALTER TABLE procurement.purchase_order
  ADD COLUMN IF NOT EXISTS project_id INT,
  ADD COLUMN IF NOT EXISTS site_id INT,
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'SUPPORTING',
  ADD COLUMN IF NOT EXISTS shipment_date DATE,
  ADD COLUMN IF NOT EXISTS shipment_location TEXT,
  ADD COLUMN IF NOT EXISTS ref_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'IDR',
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_percent NUMERIC(5,2) DEFAULT 11,
  ADD COLUMN IF NOT EXISTS wrs_notes TEXT;

-- 6. Extend Procurement Goods Receipt (WRS / LPB)
ALTER TABLE procurement.goods_receipt
  ADD COLUMN IF NOT EXISTS site_id INT,
  ADD COLUMN IF NOT EXISTS supplier_id UUID,
  ADD COLUMN IF NOT EXISTS received_by_id BIGINT;

-- 7. Service Sheet (SS) linked with FMS Work Orders
CREATE TABLE IF NOT EXISTS procurement.service_sheet (
  id SERIAL PRIMARY KEY,
  ss_number VARCHAR(100) UNIQUE NOT NULL,
  wo_no VARCHAR(100),
  date DATE DEFAULT CURRENT_DATE,
  unit_id BIGINT,
  project_id INT,
  tipe VARCHAR(100),
  mekanik_name VARCHAR(150),
  problem TEXT,
  status VARCHAR(50) DEFAULT 'OPEN',
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(100)
);

-- 8. Delivery Notes
CREATE TABLE IF NOT EXISTS procurement.delivery_note (
  id SERIAL PRIMARY KEY,
  dn_number VARCHAR(100) UNIQUE NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  from_site_id INT,
  to_site_id INT,
  courier_name VARCHAR(150),
  vehicle_no VARCHAR(50),
  status VARCHAR(50) DEFAULT 'DRAFT',
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS procurement.delivery_note_item (
  id SERIAL PRIMARY KEY,
  dn_id INT REFERENCES procurement.delivery_note(id) ON DELETE CASCADE,
  material_id INT,
  qty NUMERIC(15,2) NOT NULL,
  uom VARCHAR(50),
  notes TEXT
);
