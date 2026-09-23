-- Migration 27: Master Titik Fisik Gerbang Tol & Toll Checkpoint Logs
-- Date: 2026-09-23

-- 1. Tabel Master Titik Fisik Gerbang Tol
CREATE TABLE IF NOT EXISTS master.m_titik_gerbang_tol (
    id SERIAL PRIMARY KEY,
    kode_gerbang VARCHAR(50) UNIQUE NOT NULL,
    nama_gerbang VARCHAR(100) NOT NULL,
    ruas_tol VARCHAR(150),
    km_pos NUMERIC(6,1),
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(10,7) NOT NULL,
    polygon_points JSONB,
    radius_m INT DEFAULT 300,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_titik_gerbang_tol_coords 
ON master.m_titik_gerbang_tol(latitude, longitude);

-- 2. Tambah relasi ke master.m_gerbang_tol (Tarif Ruas)
ALTER TABLE master.m_gerbang_tol 
ADD COLUMN IF NOT EXISTS gerbang_asal_id INT REFERENCES master.m_titik_gerbang_tol(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS gerbang_tujuan_id INT REFERENCES master.m_titik_gerbang_tol(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS jarak_ruas_km NUMERIC(8,2);

-- 3. Pre-Seeder Gerbang Tol Utama Koridor BCS (Banten - Jabodetabek - Trans Jawa)
INSERT INTO master.m_titik_gerbang_tol 
(kode_gerbang, nama_gerbang, ruas_tol, km_pos, latitude, longitude, radius_m, polygon_points, is_active)
VALUES
('GT-MRK', 'Gerbang Tol Merak', 'Tangerang - Merak', 98.0, -5.9288000, 106.0028000, 300, 
 '[{"lat": -5.9275, "lng": 106.0015}, {"lat": -5.9275, "lng": 106.0041}, {"lat": -5.9301, "lng": 106.0041}, {"lat": -5.9301, "lng": 106.0015}]'::jsonb, true),

('GT-CLG-B', 'Gerbang Tol Cilegon Barat', 'Tangerang - Merak', 92.0, -5.9866000, 106.0232000, 300, 
 '[{"lat": -5.9853, "lng": 106.0219}, {"lat": -5.9853, "lng": 106.0245}, {"lat": -5.9879, "lng": 106.0245}, {"lat": -5.9879, "lng": 106.0219}]'::jsonb, true),

('GT-CLG-T', 'Gerbang Tol Cilegon Timur', 'Tangerang - Merak', 87.0, -6.0275000, 106.0718000, 300, 
 '[{"lat": -6.0262, "lng": 106.0705}, {"lat": -6.0262, "lng": 106.0731}, {"lat": -6.0288, "lng": 106.0731}, {"lat": -6.0288, "lng": 106.0705}]'::jsonb, true),

('GT-SRG-B', 'Gerbang Tol Serang Barat', 'Tangerang - Merak', 77.0, -6.1154000, 106.1287000, 300, 
 '[{"lat": -6.1141, "lng": 106.1274}, {"lat": -6.1141, "lng": 106.1300}, {"lat": -6.1167, "lng": 106.1300}, {"lat": -6.1167, "lng": 106.1274}]'::jsonb, true),

('GT-SRG-T', 'Gerbang Tol Serang Timur', 'Tangerang - Merak', 72.0, -6.1172000, 106.1824000, 300, 
 '[{"lat": -6.1159, "lng": 106.1811}, {"lat": -6.1159, "lng": 106.1837}, {"lat": -6.1185, "lng": 106.1837}, {"lat": -6.1185, "lng": 106.1811}]'::jsonb, true),

('GT-CIW', 'Gerbang Tol Ciwandan', 'Akses Industri Cilegon', 90.0, -6.0350000, 105.9850000, 300, 
 '[{"lat": -6.0337, "lng": 105.9837}, {"lat": -6.0337, "lng": 105.9863}, {"lat": -6.0363, "lng": 105.9863}, {"lat": -6.0363, "lng": 105.9837}]'::jsonb, true),

('GT-BLR-B', 'Gerbang Tol Balaraja Barat', 'Tangerang - Merak', 39.0, -6.1950000, 106.4250000, 300, 
 '[{"lat": -6.1937, "lng": 106.4237}, {"lat": -6.1937, "lng": 106.4263}, {"lat": -6.1963, "lng": 106.4263}, {"lat": -6.1963, "lng": 106.4237}]'::jsonb, true),

('GT-BLR-T', 'Gerbang Tol Balaraja Timur', 'Tangerang - Merak', 36.0, -6.2025000, 106.4678000, 300, 
 '[{"lat": -6.2012, "lng": 106.4665}, {"lat": -6.2012, "lng": 106.4691}, {"lat": -6.2038, "lng": 106.4691}, {"lat": -6.2038, "lng": 106.4665}]'::jsonb, true),

('GT-CKP', 'Gerbang Tol Cikupa', 'Tangerang - Merak', 31.0, -6.2166000, 106.5147000, 300, 
 '[{"lat": -6.2153, "lng": 106.5134}, {"lat": -6.2153, "lng": 106.5160}, {"lat": -6.2179, "lng": 106.5160}, {"lat": -6.2179, "lng": 106.5134}]'::jsonb, true),

('GT-KRW', 'Gerbang Tol Karawaci', 'Jakarta - Tangerang', 21.0, -6.2255000, 106.6083000, 300, 
 '[{"lat": -6.2242, "lng": 106.6070}, {"lat": -6.2242, "lng": 106.6096}, {"lat": -6.2268, "lng": 106.6096}, {"lat": -6.2268, "lng": 106.6070}]'::jsonb, true),

('GT-CKR-B', 'Gerbang Tol Cikarang Barat', 'Jakarta - Cikampek', 29.0, -6.3072000, 107.1278000, 300, 
 '[{"lat": -6.3059, "lng": 107.1265}, {"lat": -6.3059, "lng": 107.1291}, {"lat": -6.3085, "lng": 107.1291}, {"lat": -6.3085, "lng": 107.1265}]'::jsonb, true),

('GT-KRW-B', 'Gerbang Tol Karawang Barat', 'Jakarta - Cikampek', 47.0, -6.3392000, 107.2725000, 300, 
 '[{"lat": -6.3379, "lng": 107.2712}, {"lat": -6.3379, "lng": 107.2738}, {"lat": -6.3405, "lng": 107.2738}, {"lat": -6.3405, "lng": 107.2712}]'::jsonb, true),

('GT-KRW-T', 'Gerbang Tol Karawang Timur', 'Jakarta - Cikampek', 54.0, -6.3688000, 107.3522000, 300, 
 '[{"lat": -6.3675, "lng": 107.3509}, {"lat": -6.3675, "lng": 107.3535}, {"lat": -6.3701, "lng": 107.3535}, {"lat": -6.3701, "lng": 107.3509}]'::jsonb, true),

('GT-CKP-U', 'Gerbang Tol Cikampek Utama', 'Jakarta - Cikampek', 70.0, -6.4022000, 107.4583000, 300, 
 '[{"lat": -6.4009, "lng": 107.4570}, {"lat": -6.4009, "lng": 107.4596}, {"lat": -6.4035, "lng": 107.4596}, {"lat": -6.4035, "lng": 107.4570}]'::jsonb, true),

('GT-KLK', 'Gerbang Tol Kalikangkung', 'Batang - Semarang', 414.0, -6.9930000, 110.3150000, 350, 
 '[{"lat": -6.9915, "lng": 110.3135}, {"lat": -6.9915, "lng": 110.3165}, {"lat": -6.9945, "lng": 110.3165}, {"lat": -6.9945, "lng": 110.3135}]'::jsonb, true),

('GT-WRG', 'Gerbang Tol Warugunung', 'Surabaya - Mojokerto', 741.0, -7.3450000, 112.6780000, 350, 
 '[{"lat": -7.3435, "lng": 112.6765}, {"lat": -7.3435, "lng": 112.6795}, {"lat": -7.3465, "lng": 112.6795}, {"lat": -7.3465, "lng": 112.6765}]'::jsonb, true)
ON CONFLICT (kode_gerbang) DO UPDATE SET
    nama_gerbang = EXCLUDED.nama_gerbang,
    ruas_tol = EXCLUDED.ruas_tol,
    km_pos = EXCLUDED.km_pos,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    polygon_points = EXCLUDED.polygon_points,
    updated_at = CURRENT_TIMESTAMP;

-- 4. Tabel Log Checkpoint Tol Otomatis saat Trip Berjalan
CREATE TABLE IF NOT EXISTS fleet.trip_toll_log (
    id SERIAL PRIMARY KEY,
    trip_id BIGINT REFERENCES fleet.trip(id) ON DELETE CASCADE,
    titik_gerbang_id INT REFERENCES master.m_titik_gerbang_tol(id) ON DELETE SET NULL,
    nama_gerbang VARCHAR(100),
    tipe_event VARCHAR(20) NOT NULL, -- 'ENTER_TOLL', 'EXIT_TOLL', 'PASS_TOLL'
    waktu TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    lat NUMERIC(10,7),
    lon NUMERIC(10,7),
    odometer_km NUMERIC(10,2),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_trip_toll_log_trip ON fleet.trip_toll_log(trip_id);
