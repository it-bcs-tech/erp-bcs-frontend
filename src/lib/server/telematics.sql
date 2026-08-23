-- Schema for FMS Telematics IoT & CAN-bus Sensor Logs

CREATE SCHEMA IF NOT EXISTS fleet;

-- 1. Telematics Periodic Sensor Readings
CREATE TABLE IF NOT EXISTS fleet.telematics_logs (
    id SERIAL PRIMARY KEY,
    unit_id VARCHAR(50) NOT NULL,
    driver_id VARCHAR(50),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lat NUMERIC(10, 6),
    lng NUMERIC(10, 6),
    speed_kmh NUMERIC(5, 1) DEFAULT 0,
    rpm INT DEFAULT 0,
    engine_temp_c NUMERIC(5, 1) DEFAULT 85.0,
    fuel_level_liters NUMERIC(6, 1) DEFAULT 0,
    fuel_pct NUMERIC(5, 1) DEFAULT 0,
    odometer_km NUMERIC(10, 1) DEFAULT 0,
    battery_voltage NUMERIC(4, 1) DEFAULT 24.0,
    is_engine_on BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telematics_logs_unit_time ON fleet.telematics_logs (unit_id, timestamp DESC);

-- 2. Telematics Sensor Alert & Anomaly Events
CREATE TABLE IF NOT EXISTS fleet.telematics_events (
    id SERIAL PRIMARY KEY,
    unit_id VARCHAR(50) NOT NULL,
    driver_id VARCHAR(50),
    driver_name VARCHAR(100),
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    title VARCHAR(200) NOT NULL,
    description TEXT,
    value_recorded VARCHAR(50),
    lat NUMERIC(10, 6),
    lng NUMERIC(10, 6),
    location_name VARCHAR(200),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT FALSE,
    incident_ref_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telematics_events_unit_time ON fleet.telematics_events (unit_id, timestamp DESC);
