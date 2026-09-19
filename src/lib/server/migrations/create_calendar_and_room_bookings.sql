-- 1. Create table ga.facility_rooms
CREATE TABLE IF NOT EXISTS ga.facility_rooms (
    id SERIAL PRIMARY KEY,
    room_code VARCHAR(50) UNIQUE NOT NULL,
    room_name VARCHAR(150) NOT NULL,
    location VARCHAR(150) NOT NULL,
    capacity INT NOT NULL DEFAULT 6,
    facilities TEXT[] DEFAULT ARRAY['AC', 'Whiteboard'],
    color_hex VARCHAR(20) DEFAULT '#0284c7',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create table ga.facility_bookings
CREATE TABLE IF NOT EXISTS ga.facility_bookings (
    id SERIAL PRIMARY KEY,
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    room_id INT NOT NULL REFERENCES ga.facility_rooms(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    requester_id VARCHAR(100) NOT NULL,
    requester_name VARCHAR(150) NOT NULL,
    department VARCHAR(100),
    phone VARCHAR(50),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    approved_by VARCHAR(150),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    attendees_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facility_bookings_time 
ON ga.facility_bookings(room_id, start_time, end_time, status);

-- 3. Create table hris.company_events
CREATE TABLE IF NOT EXISTS hris.company_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- 'HOLIDAY', 'JOINT_LEAVE', 'COMPANY_EVENT'
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_holiday BOOLEAN DEFAULT TRUE,
    color_hex VARCHAR(20) DEFAULT '#e11d48',
    created_by VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_events_dates
ON hris.company_events(start_date, end_date);

-- 4. Initial Seeds for Rooms (if empty)
INSERT INTO ga.facility_rooms (room_code, room_name, location, capacity, facilities, color_hex)
SELECT 'R-MEET-1', 'Ruang Rapat Utama (Lt. 2)', 'Head Office Cilegon - Lt. 2', 16, ARRAY['Smart TV / Video Conf', 'Proyektor & Layar', 'AC', 'Whiteboard', 'Sound System'], '#0284c7'
WHERE NOT EXISTS (SELECT 1 FROM ga.facility_rooms WHERE room_code = 'R-MEET-1');

INSERT INTO ga.facility_rooms (room_code, room_name, location, capacity, facilities, color_hex)
SELECT 'R-MEET-2', 'Ruang Diskusi & Interview (Lt. 1)', 'Head Office Cilegon - Lt. 1', 6, ARRAY['Smart TV', 'AC', 'Whiteboard'], '#0d9488'
WHERE NOT EXISTS (SELECT 1 FROM ga.facility_rooms WHERE room_code = 'R-MEET-2');

INSERT INTO ga.facility_rooms (room_code, room_name, location, capacity, facilities, color_hex)
SELECT 'R-AUDITORIUM', 'Auditorium & Training Center', 'Head Office Cilegon - Gedung B', 40, ARRAY['Proyektor Besar', 'Sound System', 'Podium', 'Wireless Mic', 'AC Central'], '#7c3aed'
WHERE NOT EXISTS (SELECT 1 FROM ga.facility_rooms WHERE room_code = 'R-AUDITORIUM');

INSERT INTO ga.facility_rooms (room_code, room_name, location, capacity, facilities, color_hex)
SELECT 'R-MEET-MERAK', 'Ruang Rapat Pool Merak', 'Pool Merak - Ruang Operasional', 10, ARRAY['TV Display', 'Whiteboard', 'AC'], '#d97706'
WHERE NOT EXISTS (SELECT 1 FROM ga.facility_rooms WHERE room_code = 'R-MEET-MERAK');

-- 5. Initial Seeds for Holidays & HR Events 2026 (if empty)
INSERT INTO hris.company_events (event_type, title, description, start_date, end_date, is_holiday, color_hex, created_by)
SELECT 'HOLIDAY', 'Tahun Baru 2026 Masehi', 'Libur Nasional Tahun Baru', '2026-01-01', '2026-01-01', true, '#e11d48', 'HR System'
WHERE NOT EXISTS (SELECT 1 FROM hris.company_events WHERE title = 'Tahun Baru 2026 Masehi');

INSERT INTO hris.company_events (event_type, title, description, start_date, end_date, is_holiday, color_hex, created_by)
SELECT 'HOLIDAY', 'Isra Mikraj Nabi Muhammad SAW', 'Libur Nasional Keagamaan', '2026-01-16', '2026-01-16', true, '#e11d48', 'HR System'
WHERE NOT EXISTS (SELECT 1 FROM hris.company_events WHERE title = 'Isra Mikraj Nabi Muhammad SAW');

INSERT INTO hris.company_events (event_type, title, description, start_date, end_date, is_holiday, color_hex, created_by)
SELECT 'HOLIDAY', 'Tahun Baru Imlek 2577 Kongzili', 'Libur Nasional Imlek', '2026-02-17', '2026-02-17', true, '#e11d48', 'HR System'
WHERE NOT EXISTS (SELECT 1 FROM hris.company_events WHERE title = 'Tahun Baru Imlek 2577 Kongzili');

INSERT INTO hris.company_events (event_type, title, description, start_date, end_date, is_holiday, color_hex, created_by)
SELECT 'HOLIDAY', 'Hari Suci Nyepi Tahun Baru Saka 1948', 'Libur Nasional Nyepi', '2026-03-21', '2026-03-21', true, '#e11d48', 'HR System'
WHERE NOT EXISTS (SELECT 1 FROM hris.company_events WHERE title = 'Hari Suci Nyepi Tahun Baru Saka 1948');

INSERT INTO hris.company_events (event_type, title, description, start_date, end_date, is_holiday, color_hex, created_by)
SELECT 'HOLIDAY', 'Hari Raya Idul Fitri 1447 Hijriah', 'Hari Raya Idul Fitri 1447 H', '2026-03-20', '2026-03-22', true, '#059669', 'HR System'
WHERE NOT EXISTS (SELECT 1 FROM hris.company_events WHERE title = 'Hari Raya Idul Fitri 1447 Hijriah');

INSERT INTO hris.company_events (event_type, title, description, start_date, end_date, is_holiday, color_hex, created_by)
SELECT 'JOINT_LEAVE', 'Cuti Bersama Idul Fitri 1447 H', 'Cuti Bersama Pemerintah', '2026-03-23', '2026-03-24', true, '#0d9488', 'HR System'
WHERE NOT EXISTS (SELECT 1 FROM hris.company_events WHERE title = 'Cuti Bersama Idul Fitri 1447 H');

INSERT INTO hris.company_events (event_type, title, description, start_date, end_date, is_holiday, color_hex, created_by)
SELECT 'HOLIDAY', 'Wafat Yesus Kristus', 'Libur Nasional', '2026-04-03', '2026-04-03', true, '#e11d48', 'HR System'
WHERE NOT EXISTS (SELECT 1 FROM hris.company_events WHERE title = 'Wafat Yesus Kristus');

INSERT INTO hris.company_events (event_type, title, description, start_date, end_date, is_holiday, color_hex, created_by)
SELECT 'HOLIDAY', 'Hari Buruh Internasional', 'Libur Nasional', '2026-05-01', '2026-05-01', true, '#e11d48', 'HR System'
WHERE NOT EXISTS (SELECT 1 FROM hris.company_events WHERE title = 'Hari Buruh Internasional');

INSERT INTO hris.company_events (event_type, title, description, start_date, end_date, is_holiday, color_hex, created_by)
SELECT 'HOLIDAY', 'Kenaikan Yesus Kristus', 'Libur Nasional', '2026-05-14', '2026-05-14', true, '#e11d48', 'HR System'
WHERE NOT EXISTS (SELECT 1 FROM hris.company_events WHERE title = 'Kenaikan Yesus Kristus');

INSERT INTO hris.company_events (event_type, title, description, start_date, end_date, is_holiday, color_hex, created_by)
SELECT 'HOLIDAY', 'Hari Raya Waisak 2570 BE', 'Libur Nasional', '2026-05-31', '2026-05-31', true, '#e11d48', 'HR System'
WHERE NOT EXISTS (SELECT 1 FROM hris.company_events WHERE title = 'Hari Raya Waisak 2570 BE');

INSERT INTO hris.company_events (event_type, title, description, start_date, end_date, is_holiday, color_hex, created_by)
SELECT 'HOLIDAY', 'Hari Lahir Pancasila', 'Libur Nasional', '2026-06-01', '2026-06-01', true, '#e11d48', 'HR System'
WHERE NOT EXISTS (SELECT 1 FROM hris.company_events WHERE title = 'Hari Lahir Pancasila');

INSERT INTO hris.company_events (event_type, title, description, start_date, end_date, is_holiday, color_hex, created_by)
SELECT 'HOLIDAY', 'Hari Kemerdekaan Republik Indonesia', 'HUT RI ke-81', '2026-08-17', '2026-08-17', true, '#e11d48', 'HR System'
WHERE NOT EXISTS (SELECT 1 FROM hris.company_events WHERE title = 'Hari Kemerdekaan Republik Indonesia');

INSERT INTO hris.company_events (event_type, title, description, start_date, end_date, is_holiday, color_hex, created_by)
SELECT 'COMPANY_EVENT', 'Townhall & Strategic Review Q3 BCS Group', 'Pertemuan seluruh jajaran pimpinan dan staf BCS Group', '2026-09-25', '2026-09-25', false, '#4f46e5', 'Management'
WHERE NOT EXISTS (SELECT 1 FROM hris.company_events WHERE title = 'Townhall & Strategic Review Q3 BCS Group');

INSERT INTO hris.company_events (event_type, title, description, start_date, end_date, is_holiday, color_hex, created_by)
SELECT 'HOLIDAY', 'Hari Raya Natal', 'Libur Nasional Hari Raya Natal', '2026-12-25', '2026-12-25', true, '#e11d48', 'HR System'
WHERE NOT EXISTS (SELECT 1 FROM hris.company_events WHERE title = 'Hari Raya Natal');
