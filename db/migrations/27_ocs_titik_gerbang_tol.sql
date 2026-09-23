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

-- 3. (Pre-Seeder removed per user request: data titik fisik akan diinput manual/kustom)

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
