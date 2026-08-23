-- Schema for FMS Tire Management System (TMS)

CREATE SCHEMA IF NOT EXISTS fleet;

-- 1. Master Data Ban
CREATE TABLE IF NOT EXISTS fleet.tires (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    brand VARCHAR(100) NOT NULL, -- Bridgestone, Giti, Michelin, Gajah Tunggal, Sailun, Aeolus
    size_spec VARCHAR(50) NOT NULL DEFAULT '11.00R20', -- 11.00R20, 12R22.5, 10.00R20
    pattern_type VARCHAR(50) DEFAULT 'RIB / ALL-POSITION', -- RIB (Steer), LUG (Drive), TRAILER, ALL-POSITION
    status VARCHAR(50) NOT NULL DEFAULT 'MOUNTED', -- MOUNTED, SPARE_STOCK, RETREADING, SCRAPPED
    retread_count INT NOT NULL DEFAULT 0, -- 0 = Original Casing, 1 = Vulkanisir I, 2 = Vulkanisir II
    current_tread_depth_mm NUMERIC(4, 1) NOT NULL DEFAULT 14.0, -- Kedalaman alur saat ini (mm)
    original_tread_depth_mm NUMERIC(4, 1) NOT NULL DEFAULT 16.0, -- Kedalaman alur baru (mm)
    purchase_cost NUMERIC(15, 2) NOT NULL DEFAULT 4500000.00,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_km_run NUMERIC(10, 1) NOT NULL DEFAULT 0.0,
    cost_per_km NUMERIC(10, 2) DEFAULT 0.0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tires_status ON fleet.tires (status);
CREATE INDEX IF NOT EXISTS idx_tires_serial ON fleet.tires (serial_number);

-- 2. Posisi Ban Terpasang pada Kendaraan
CREATE TABLE IF NOT EXISTS fleet.tire_positions (
    id SERIAL PRIMARY KEY,
    unit_id VARCHAR(50) NOT NULL,
    axle_index INT NOT NULL, -- 1 = Steer, 2 = Drive 1, 3 = Drive 2 / Trailer
    position_code VARCHAR(30) NOT NULL, -- FL, FR, RL1_OUT, RL1_IN, RR1_IN, RR1_OUT, RL2_OUT, RL2_IN, RR2_IN, RR2_OUT, SPARE
    tire_id INT REFERENCES fleet.tires(id) ON DELETE SET NULL,
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    installed_odometer_km NUMERIC(10, 1) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(unit_id, position_code)
);

CREATE INDEX IF NOT EXISTS idx_tire_positions_unit ON fleet.tire_positions (unit_id);

-- 3. Riwayat Mutasi, Rotasi, dan Inspeksi Ban
CREATE TABLE IF NOT EXISTS fleet.tire_history (
    id SERIAL PRIMARY KEY,
    tire_id INT NOT NULL REFERENCES fleet.tires(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- NEW_INSTALL, ROTATION, INSPECTION, RETREAD_SENT, RETREAD_RECEIVED, SCRAPPED
    unit_id VARCHAR(50),
    from_position VARCHAR(30),
    to_position VARCHAR(30),
    tread_depth_recorded NUMERIC(4, 1),
    odometer_km NUMERIC(10, 1),
    cost NUMERIC(15, 2) DEFAULT 0.0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tire_history_tire ON fleet.tire_history (tire_id, created_at DESC);
