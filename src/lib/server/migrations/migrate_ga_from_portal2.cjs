/**
 * migrate_ga_from_portal2.cjs
 * ETL & Schema Migration dari db/database_ga.sql (MySQL portal2) ke PostgreSQL (mybcs_db skema ga.*)
 * Mencakup 6 Domain Inti GA:
 * 1. ATK / Stationery (atk_item, atk_jenis, atk_satuan, atk_header, atk_detail, atk_item_in, atk_out)
 * 2. Booking Room (booking_room -> ga.facility_rooms & ga.facility_bookings)
 * 3. Work Order & Pemeliharaan Fasilitas (work_order, work_order_manpower, work_order_material, area)
 * 4. Carpool Kendaraan Operasional GA (car, carpool, carpool_detail, bbm, tol, tujuan)
 * 5. Surat Perjalanan Dinas / SPD GA (spd, spd_detail, spd_ga, anggaran, uang_makan, fasilitas)
 * 6. Gudang Arsip Fisik (rak, lantai, arsip)
 */

const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

const DB_URL = 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DB_URL, { max: 5, connect_timeout: 20, idle_timeout: 30 });

const sqlContent = fs.readFileSync(path.join(__dirname, '../../../../db/database_ga.sql'), 'utf8');

function parseInsertRows(tableName) {
	const re = new RegExp('INSERT INTO `' + tableName + '` \\(([^)]+)\\) VALUES\\s*([\\s\\S]*?);\\n', 'g');
	const rows = [];
	for (const m of sqlContent.matchAll(re)) {
		const cols = m[1].split(',').map((c) => c.trim().replace(/`/g, ''));
		const body = m[2].trim();
		let inStr = false,
			esc = false,
			depth = 0,
			cur = '',
			tuple = [];
		for (let i = 0; i < body.length; i++) {
			const ch = body[i];
			if (esc) {
				if (ch === 'r') cur += '\r';
				else if (ch === 'n') cur += '\n';
				else cur += ch;
				esc = false;
				continue;
			}
			if (ch === '\\') {
				esc = true;
				continue;
			}
			if (ch === "'") {
				inStr = !inStr;
				cur += ch;
				continue;
			}
			if (!inStr) {
				if (ch === '(') {
					depth++;
					if (depth === 1) {
						cur = '';
						tuple = [];
						continue;
					}
				}
				if (ch === ')') {
					depth--;
					if (depth === 0) {
						tuple.push(cur.trim());
						const obj = {};
						cols.forEach((c, idx) => {
							let v = tuple[idx];
							if (v === 'NULL' || v === undefined) obj[c] = null;
							else if (v.startsWith("'") && v.endsWith("'")) obj[c] = v.slice(1, -1);
							else obj[c] = isNaN(Number(v)) ? v : Number(v);
						});
						rows.push(obj);
						cur = '';
						continue;
					}
				}
				if (ch === ',' && depth === 1) {
					tuple.push(cur.trim());
					cur = '';
					continue;
				}
			}
			if (depth >= 1) cur += ch;
		}
	}
	return rows;
}

function cleanDate(val, fallback = null) {
	if (!val || typeof val !== 'string') return fallback;
	const s = val.trim();
	if (s.startsWith('0000-00-00') || s.length < 10) return fallback;
	const d = s.slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return fallback;
	const yr = Number(d.slice(0, 4));
	if (yr < 1990 || yr > 2100) return fallback;
	return d;
}

function cleanTimestamp(val, fallback = null) {
	if (!val || typeof val !== 'string') return fallback;
	const s = val.trim();
	if (s.startsWith('0000-00-00') || s.length < 10) return fallback;
	const yr = Number(s.slice(0, 4));
	if (yr < 1990 || yr > 2100) return fallback;
	return s;
}

function cleanTime(val, fallback = '08:00:00') {
	if (!val || typeof val !== 'string') return fallback;
	const s = val.trim();
	if (!/^\d{2}:\d{2}(:\d{2})?$/.test(s)) return fallback;
	return s.length === 5 ? s + ':00' : s;
}

async function run() {
	console.log('1. Building Lookup Dictionaries (Karyawan, Dept, Lokasi)...');
	const empMap = new Map();
	const deptMap = new Map();
	const locMap = new Map();

	// From portal2 dump
	for (const u of parseInsertRows('user')) {
		if (u.name_user && u.nama_lengkap && u.nama_lengkap !== 'noname') {
			empMap.set(String(u.name_user).trim(), String(u.nama_lengkap).trim());
		}
	}
	for (const e of parseInsertRows('employee')) {
		if (e.emp_payroll && e.emp_name) {
			empMap.set(String(e.emp_payroll).trim(), String(e.emp_name).trim());
		}
	}
	for (const d of parseInsertRows('dept')) {
		if (d.dept_code && d.dept_name) {
			deptMap.set(String(d.dept_code).trim(), String(d.dept_name).trim());
		}
	}
	for (const l of parseInsertRows('location')) {
		if (l.loc_code && l.loc_name) {
			locMap.set(String(l.loc_code).trim(), String(l.loc_name).trim());
		}
	}

	// Enrich from PostgreSQL master.*
	const pgEmps1 = await sql`SELECT payroll_id, nama_karyawan FROM master.m_karyawan_1 WHERE payroll_id IS NOT NULL AND nama_karyawan IS NOT NULL`;
	for (const r of pgEmps1) empMap.set(String(r.payroll_id).trim(), String(r.nama_karyawan).trim());

	const pgEmps = await sql`SELECT payroll_id, nama_karyawan FROM master.m_karyawan WHERE payroll_id IS NOT NULL AND nama_karyawan IS NOT NULL`;
	for (const r of pgEmps) empMap.set(String(r.payroll_id).trim(), String(r.nama_karyawan).trim());

	const pgDepts = await sql`SELECT dept_code, dept_name FROM master.m_dept WHERE dept_code IS NOT NULL AND dept_name IS NOT NULL`;
	for (const r of pgDepts) deptMap.set(String(r.dept_code).trim(), String(r.dept_name).trim());

	const pgLocs = await sql`SELECT loc_code, loc_name FROM master.m_lokasi WHERE loc_code IS NOT NULL AND loc_name IS NOT NULL`;
	for (const r of pgLocs) locMap.set(String(r.loc_code).trim(), String(r.loc_name).trim());

	console.log(`   Lookups ready: ${empMap.size} employees, ${deptMap.size} depts, ${locMap.size} locations.`);

	const resolveEmp = (nikOrName, fallbackNik) => {
		const raw = String(nikOrName || fallbackNik || '').trim();
		if (!raw) return 'Karyawan BCS';
		if (empMap.has(raw)) return empMap.get(raw);
		// Try without leading zero (e.g., 0706.0584 -> 706.0584)
		if (raw.startsWith('0') && empMap.has(raw.slice(1))) return empMap.get(raw.slice(1));
		return raw;
	};

	const resolveDept = (code) => {
		const raw = String(code || '').trim();
		if (!raw) return 'UMUM / GA';
		return deptMap.get(raw) || raw;
	};

	const resolveLoc = (code) => {
		const raw = String(code || '').trim();
		if (!raw) return 'CILEGON';
		return locMap.get(raw) || raw;
	};

	// =========================================================================
	// 2. DOMAIN 1: ATK / STATIONERY
	// =========================================================================
	const existingBookings = await sql`SELECT COUNT(*)::int as c FROM ga.facility_bookings`;
	if (existingBookings[0].c < 800) {
	console.log('2. Migrating Domain 1: ATK / Stationery...');
	await sql`
		CREATE TABLE IF NOT EXISTS ga.stationery_categories (
			id INTEGER PRIMARY KEY,
			description VARCHAR(100) NOT NULL,
			created_by VARCHAR(50),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_by VARCHAR(50),
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.stationery_units (
			id INTEGER PRIMARY KEY,
			description VARCHAR(100) NOT NULL,
			created_by VARCHAR(50),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_by VARCHAR(50),
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.stationery_stock_in (
			id SERIAL PRIMARY KEY,
			item_id INTEGER,
			item_name VARCHAR(255),
			qty INTEGER NOT NULL DEFAULT 0,
			created_by VARCHAR(50),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.stationery_stock_out (
			id SERIAL PRIMARY KEY,
			item_id INTEGER,
			item_name VARCHAR(255),
			total_item INTEGER NOT NULL DEFAULT 0
		)
	`;

	// Alter existing stationery tables to add portal2 columns if not present
	await sql`ALTER TABLE ga.stationery_items ADD COLUMN IF NOT EXISTS category_id INTEGER`;
	await sql`ALTER TABLE ga.stationery_items ADD COLUMN IF NOT EXISTS unit_id INTEGER`;
	await sql`ALTER TABLE ga.stationery_items ADD COLUMN IF NOT EXISTS notes TEXT`;
	await sql`ALTER TABLE ga.stationery_items ADD COLUMN IF NOT EXISTS created_by VARCHAR(50)`;
	await sql`ALTER TABLE ga.stationery_items ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50)`;
	await sql`ALTER TABLE ga.stationery_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;

	await sql`ALTER TABLE ga.stationery_requests ADD COLUMN IF NOT EXISTS requester_nik VARCHAR(50)`;
	await sql`ALTER TABLE ga.stationery_requests ADD COLUMN IF NOT EXISTS cost_center_code VARCHAR(50)`;
	await sql`ALTER TABLE ga.stationery_requests ADD COLUMN IF NOT EXISTS atk_jenis INTEGER`;
	await sql`ALTER TABLE ga.stationery_requests ADD COLUMN IF NOT EXISTS raw_status VARCHAR(50)`;
	await sql`ALTER TABLE ga.stationery_requests ADD COLUMN IF NOT EXISTS status_desc VARCHAR(255)`;
	await sql`ALTER TABLE ga.stationery_requests ADD COLUMN IF NOT EXISTS created_by VARCHAR(50)`;
	await sql`ALTER TABLE ga.stationery_requests ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50)`;
	await sql`ALTER TABLE ga.stationery_requests ADD COLUMN IF NOT EXISTS sent_date_app TIMESTAMP`;
	await sql`ALTER TABLE ga.stationery_requests ADD COLUMN IF NOT EXISTS approve_date_app TIMESTAMP`;
	await sql`ALTER TABLE ga.stationery_requests ADD COLUMN IF NOT EXISTS reject_date_app TIMESTAMP`;
	await sql`ALTER TABLE ga.stationery_requests ADD COLUMN IF NOT EXISTS sent_date_ga TIMESTAMP`;
	await sql`ALTER TABLE ga.stationery_requests ADD COLUMN IF NOT EXISTS approve_date_ga TIMESTAMP`;
	await sql`ALTER TABLE ga.stationery_requests ADD COLUMN IF NOT EXISTS reject_date_ga TIMESTAMP`;
	await sql`ALTER TABLE ga.stationery_requests ADD COLUMN IF NOT EXISTS cancel_date TIMESTAMP`;

	await sql`ALTER TABLE ga.stationery_request_items ADD COLUMN IF NOT EXISTS unit_id INTEGER`;
	await sql`ALTER TABLE ga.stationery_request_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0`;
	await sql`ALTER TABLE ga.stationery_request_items ADD COLUMN IF NOT EXISTS total_price NUMERIC DEFAULT 0`;
	await sql`ALTER TABLE ga.stationery_request_items ADD COLUMN IF NOT EXISTS status_flag INTEGER DEFAULT 0`;
	await sql`ALTER TABLE ga.stationery_request_items ADD COLUMN IF NOT EXISTS created_by VARCHAR(50)`;
	await sql`ALTER TABLE ga.stationery_request_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP`;
	await sql`ALTER TABLE ga.stationery_request_items ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50)`;
	await sql`ALTER TABLE ga.stationery_request_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`;

	// Clean dummy rows
	await sql`TRUNCATE TABLE ga.stationery_request_items, ga.stationery_requests, ga.stationery_items, ga.stationery_categories, ga.stationery_units, ga.stationery_stock_in, ga.stationery_stock_out RESTART IDENTITY CASCADE`;

	const atkJenis = parseInsertRows('atk_jenis');
	const jenisMap = new Map();
	for (const j of atkJenis) {
		jenisMap.set(Number(j.id), String(j.description || 'ATK').trim());
		await sql`
			INSERT INTO ga.stationery_categories (id, description, created_by, created_at, updated_by, updated_at)
			VALUES (${j.id}, ${j.description}, ${j.createby}, ${cleanTimestamp(j.createdate, new Date().toISOString())}, ${j.updateby}, ${cleanTimestamp(j.updatedate, new Date().toISOString())})
		`;
	}

	const atkSatuan = parseInsertRows('atk_satuan');
	const satuanMap = new Map();
	for (const s of atkSatuan) {
		satuanMap.set(Number(s.id), String(s.description || 'PCS').trim().toUpperCase());
		await sql`
			INSERT INTO ga.stationery_units (id, description, created_by, created_at, updated_by, updated_at)
			VALUES (${s.id}, ${s.description}, ${s.createby}, ${cleanTimestamp(s.createdate, new Date().toISOString())}, ${s.updateby}, ${cleanTimestamp(s.updatedate, new Date().toISOString())})
		`;
	}

	const atkItems = parseInsertRows('atk_item');
	const itemMap = new Map();
	const usedItemCodes = new Set();
	const itemBatch = [];
	for (const it of atkItems) {
		const id = Number(it.atk_item_id);
		let code = String(it.atk_code || '').trim();
		if (!code || usedItemCodes.has(code.toUpperCase())) {
			code = `ATK-${String(id).padStart(3, '0')}`;
		}
		usedItemCodes.add(code.toUpperCase());
		const catName = jenisMap.get(Number(it.atk_jenis)) || 'ATK';
		const unitName = satuanMap.get(Number(it.atk_satuan)) || 'PCS';
		const name = String(it.atk_nama || `Item #${id}`).trim();
		itemMap.set(id, { name, unitName, price: Number(it.atk_harga || 0) });

		itemBatch.push({
			id,
			item_code: code,
			name,
			category: catName,
			category_id: it.atk_jenis || 6,
			unit: unitName,
			unit_id: it.atk_satuan || 2,
			stock_quantity: Number(it.atk_stock || 0),
			minimum_stock: Number(it.atk_limit || 5),
			unit_price_estimate: Number(it.atk_harga || 0),
			notes: it.atk_keterangan || null,
			created_by: it.atk_createby || null,
			created_at: cleanTimestamp(it.atk_createdate, '2020-01-01 00:00:00'),
			updated_by: it.atk_updateby || null,
			updated_at: cleanTimestamp(it.atk_updatedate, '2025-01-01 00:00:00')
		});
	}
	await sql`INSERT INTO ga.stationery_items ${sql(itemBatch)}`;
	await sql`SELECT setval('ga.stationery_items_id_seq', COALESCE((SELECT MAX(id) FROM ga.stationery_items), 1))`;

	// Stock in & out
	const atkIn = parseInsertRows('atk_item_in');
	for (const r of atkIn) {
		const info = itemMap.get(Number(r.atk_item_id));
		await sql`
			INSERT INTO ga.stationery_stock_in (id, item_id, item_name, qty, created_by, created_at)
			VALUES (${r.id}, ${r.atk_item_id}, ${info ? info.name : `Item #${r.atk_item_id}`}, ${Number(r.atk_qty || 0)}, ${r.atk_createby}, ${cleanTimestamp(r.atk_createdate, new Date().toISOString())})
		`;
	}
	await sql`SELECT setval('ga.stationery_stock_in_id_seq', COALESCE((SELECT MAX(id) FROM ga.stationery_stock_in), 1))`;

	const atkOut = parseInsertRows('atk_out');
	for (const r of atkOut) {
		await sql`
			INSERT INTO ga.stationery_stock_out (id, item_id, item_name, total_item)
			VALUES (${r.id}, ${r.id_item}, ${r.nama_item}, ${Number(r.total_item || 0)})
		`;
	}
	await sql`SELECT setval('ga.stationery_stock_out_id_seq', COALESCE((SELECT MAX(id) FROM ga.stationery_stock_out), 1))`;

	// ATK Details grouped count
	const atkDetails = parseInsertRows('atk_detail');
	const detailCountByHeader = new Map();
	for (const d of atkDetails) {
		const hid = Number(d.atk_header_id);
		detailCountByHeader.set(hid, (detailCountByHeader.get(hid) || 0) + 1);
	}

	const atkHeaders = parseInsertRows('atk_header');
	const validHeaderIds = new Set();
	const headerBatch = [];
	for (const h of atkHeaders) {
		const id = Number(h.atk_id);
		validHeaderIds.add(id);
		const rawSt = String(h.atk_status || 'OPEN').trim().toUpperCase();
		let mappedStatus = 'SUBMITTED';
		if (rawSt === 'APPROVE GA') mappedStatus = 'APPROVED';
		else if (rawSt === 'REJECT GA' || rawSt === 'CANCEL') mappedStatus = 'REJECTED';

		const nik = String(h.atk_employee || h.create_by || '').trim();
		const empName = resolveEmp(h.atk_employee, h.create_by);
		const deptName = resolveDept(h.atk_costcenter);
		const reqDate = cleanDate(h.atk_tanggal) || cleanDate(h.create_date) || '2024-01-01';
		const cDate = cleanTimestamp(h.create_date) || `${reqDate} 08:00:00`;

		headerBatch.push({
			id,
			req_number: `ATK-${String(id).padStart(5, '0')}`,
			request_date: reqDate,
			department: deptName,
			cost_center_code: h.atk_costcenter || null,
			requester_nik: nik || null,
			requester_name: empName,
			atk_jenis: h.atk_jenis || 2,
			status: mappedStatus,
			raw_status: rawSt,
			status_desc: h.atk_status_desc || null,
			approved_by: mappedStatus === 'APPROVED' ? 'General Affair' : null,
			approved_at: cleanTimestamp(h.Approve_Date_GA) || cleanTimestamp(h.Approve_Date_App) || null,
			total_items_count: detailCountByHeader.get(id) || 0,
			notes: h.atk_keterangan || null,
			created_by: h.create_by || null,
			created_at: cDate,
			updated_by: h.update_by || null,
			updated_at: cleanTimestamp(h.update_date) || cDate,
			sent_date_app: cleanTimestamp(h.Sent_Date_App),
			approve_date_app: cleanTimestamp(h.Approve_Date_App),
			reject_date_app: cleanTimestamp(h.Reject_Date_App),
			sent_date_ga: cleanTimestamp(h.Sent_Date_GA),
			approve_date_ga: cleanTimestamp(h.Approve_Date_GA),
			reject_date_ga: cleanTimestamp(h.Reject_Date_GA),
			cancel_date: cleanTimestamp(h.Cancel_Date)
		});
	}

	for (let i = 0; i < headerBatch.length; i += 200) {
		const chunk = headerBatch.slice(i, i + 200);
		await sql`INSERT INTO ga.stationery_requests ${sql(chunk)}`;
	}
	await sql`SELECT setval('ga.stationery_requests_id_seq', COALESCE((SELECT MAX(id) FROM ga.stationery_requests), 1))`;

	const detailBatch = [];
	for (const d of atkDetails) {
		const hid = Number(d.atk_header_id);
		if (!validHeaderIds.has(hid)) continue;
		const itemId = Number(d.atk_item_id);
		const info = itemMap.get(itemId);
		const unitName = satuanMap.get(Number(d.atk_satuan_id)) || (info ? info.unitName : 'PCS');
		const qtyReq = Number(d.atk_qty || 1);
		const qtyReal = d.atk_qty_real !== null && d.atk_qty_real !== undefined ? Number(d.atk_qty_real) : qtyReq;
		detailBatch.push({
			id: Number(d.atk_detail_id),
			request_id: hid,
			item_id: info ? itemId : null,
			item_name: info ? info.name : `Item ATK #${itemId}`,
			quantity_requested: qtyReq,
			quantity_approved: qtyReal,
			unit: unitName,
			unit_id: d.atk_satuan_id || 2,
			unit_price: Number(d.atk_harga || 0),
			total_price: Number(d.atk_total || 0),
			status_flag: Number(d.atk_status || 0),
			notes: null,
			created_by: d.createby || null,
			created_at: cleanTimestamp(d.createdate),
			updated_by: d.updateby || null,
			updated_at: cleanTimestamp(d.updatedate)
		});
	}
	for (let i = 0; i < detailBatch.length; i += 250) {
		const chunk = detailBatch.slice(i, i + 250);
		await sql`INSERT INTO ga.stationery_request_items ${sql(chunk)}`;
	}
	await sql`SELECT setval('ga.stationery_request_items_id_seq', COALESCE((SELECT MAX(id) FROM ga.stationery_request_items), 1))`;
	console.log(`   -> Migrated ${atkItems.length} ATK items, ${headerBatch.length} headers, ${detailBatch.length} details.`);

	// =========================================================================
	// 3. DOMAIN 2: ROOM RESERVATIONS (booking_room)
	// =========================================================================
	console.log('3. Migrating Domain 2: Room Reservations...');
	await sql`ALTER TABLE ga.facility_bookings ADD COLUMN IF NOT EXISTS booking_type VARCHAR(50) DEFAULT 'Internal'`;
	await sql`ALTER TABLE ga.facility_bookings ADD COLUMN IF NOT EXISTS external_guest VARCHAR(255)`;
	await sql`ALTER TABLE ga.facility_bookings ADD COLUMN IF NOT EXISTS requested_facilities VARCHAR(255)`;
	await sql`ALTER TABLE ga.facility_bookings ADD COLUMN IF NOT EXISTS cost VARCHAR(100)`;
	await sql`ALTER TABLE ga.facility_bookings ADD COLUMN IF NOT EXISTS remark TEXT`;
	await sql`ALTER TABLE ga.facility_bookings ADD COLUMN IF NOT EXISTS create_user VARCHAR(100)`;
	await sql`ALTER TABLE ga.facility_bookings ADD COLUMN IF NOT EXISTS modify_user VARCHAR(100)`;

	await sql`TRUNCATE TABLE ga.facility_bookings, ga.facility_rooms RESTART IDENTITY CASCADE`;

	const realRooms = [
		{
			id: 1,
			room_code: 'R-MEET-A',
			room_name: 'Ruang Meeting A',
			location: 'Head Office Cilegon - Lt. 1',
			capacity: 16,
			facilities: ['Smart TV / Zoom', 'AC', 'Whiteboard', 'Sound System'],
			color_hex: '#0284c7',
			is_active: true
		},
		{
			id: 2,
			room_code: 'R-MEET-B',
			room_name: 'Ruang Meeting B',
			location: 'Head Office Cilegon - Lt. 1',
			capacity: 10,
			facilities: ['Smart TV / Zoom', 'AC', 'Whiteboard'],
			color_hex: '#0d9488',
			is_active: true
		},
		{
			id: 3,
			room_code: 'R-MEET-C',
			room_name: 'Ruang Meeting C',
			location: 'Head Office Cilegon - Lt. 2',
			capacity: 12,
			facilities: ['Smart TV / Zoom', 'AC', 'Whiteboard'],
			color_hex: '#7c3aed',
			is_active: true
		},
		{
			id: 4,
			room_code: 'R-AKADEMIK',
			room_name: 'Akademik',
			location: 'Training & Akademik Center Cilegon',
			capacity: 25,
			facilities: ['Proyektor', 'AC', 'Whiteboard', 'Sound System'],
			color_hex: '#d97706',
			is_active: true
		},
		{
			id: 5,
			room_code: 'R-BALLROOM',
			room_name: 'Ballroom',
			location: 'Head Office Cilegon - Gedung Utama',
			capacity: 60,
			facilities: ['Videotron / Proyektor', 'Sound System', 'Podium', 'Wireless Mic', 'AC Central'],
			color_hex: '#e11d48',
			is_active: true
		}
	];
	await sql`INSERT INTO ga.facility_rooms ${sql(realRooms)}`;
	await sql`SELECT setval('ga.facility_rooms_id_seq', 5)`;

	const roomNameToId = new Map([
		['Ruang Meeting A', 1],
		['Ruang Meeting B', 2],
		['Ruang Meeting C', 3],
		['Akademik', 4],
		['Ballroom', 5]
	]);

	const bookingRows = parseInsertRows('booking_room');
	const bookingBatch = [];
	for (const b of bookingRows) {
		const id = Number(b.id_booking);
		const roomId = roomNameToId.get(String(b.ruangan || '').trim()) || 1;
		const bDate = cleanDate(b.tanggal_booking) || cleanDate(b.create_date) || '2024-01-01';
		const tStart = cleanTime(b.waktu_mulai, '09:00:00');
		let tEnd = cleanTime(b.waktu_selesai, '10:00:00');
		if (tEnd <= tStart || tEnd === '00:00:00') {
			const hr = Math.min(23, Number(tStart.slice(0, 2)) + 1);
			tEnd = `${String(hr).padStart(2, '0')}:${tStart.slice(3, 5)}:00`;
		}
		const startIso = `${bDate}T${tStart}+07:00`;
		const endIso = `${bDate}T${tEnd}+07:00`;

		const stCode = String(b.status ?? '0').trim();
		let status = 'PENDING';
		if (stCode === '1') status = 'APPROVED';
		else if (stCode === '2') status = 'CANCELLED';
		else if (stCode === '3') status = 'REJECTED';

		const rawPemohon = String(b.pemohon || b.create_user || 'Staf BCS').trim();
		const pemohonParts = rawPemohon.split(' - ');
		const reqName = pemohonParts.length > 1 ? pemohonParts.slice(1).join(' - ').trim() : rawPemohon;
		const reqId = pemohonParts.length > 1 ? pemohonParts[0].trim() : (b.create_user || 'EMP');

		const attendees = parseInt(String(b.jumlah_peserta || '1').replace(/\D/g, ''), 10) || 1;
		const descParts = [];
		if (b.keperluan) descParts.push(`Keperluan: ${b.keperluan}`);
		if (b.desk) descParts.push(`Tamu/Instansi: ${b.desk}`);
		if (b.fasilitas) descParts.push(`Fasilitas: ${b.fasilitas}`);

		bookingBatch.push({
			id,
			booking_number: b.norut ? String(b.norut) : `BRM-${bDate.slice(0, 4)}-${String(id).padStart(4, '0')}`,
			room_id: roomId,
			title: String(b.agenda || 'Rapat Koordinasi').trim() || 'Rapat Koordinasi',
			description: descParts.join(' | ') || null,
			requester_id: String(reqId),
			requester_name: String(reqName || 'Staf BCS'),
			department: String(b.divisi || 'UMUM').trim(),
			phone: null,
			start_time: startIso,
			end_time: endIso,
			status,
			approved_by: status === 'APPROVED' ? (b.modify_user || 'GA Admin') : null,
			approved_at: status === 'APPROVED' ? (cleanTimestamp(b.modify_date) || cleanTimestamp(b.create_date)) : null,
			rejection_reason: (status === 'REJECTED' || status === 'CANCELLED') ? (b.remark || null) : null,
			attendees_count: attendees,
			booking_type: b.keperluan || 'Internal',
			external_guest: b.desk || null,
			requested_facilities: b.fasilitas || null,
			cost: b.biaya || null,
			remark: b.remark || null,
			create_user: b.create_user || null,
			modify_user: b.modify_user || null,
			created_at: cleanTimestamp(b.create_date, `${bDate} 08:00:00`),
			updated_at: cleanTimestamp(b.modify_date) || cleanTimestamp(b.create_date, `${bDate} 08:00:00`)
		});
	}
	for (let i = 0; i < bookingBatch.length; i += 200) {
		const chunk = bookingBatch.slice(i, i + 200);
		await sql`INSERT INTO ga.facility_bookings ${sql(chunk)}`;
	}
	await sql`SELECT setval('ga.facility_bookings_id_seq', COALESCE((SELECT MAX(id) FROM ga.facility_bookings), 1))`;
	console.log(`   -> Migrated 5 rooms and ${bookingBatch.length} room bookings.`);
	} else {
		console.log('2 & 3. Domain 1 (ATK) & Domain 2 (Room Bookings) already migrated, skipping...');
	}

	// =========================================================================
	// 4. DOMAIN 3: WORK ORDER & FACILITY MAINTENANCE (work_order, manpower, material, area)
	// =========================================================================
	console.log('4. Migrating Domain 3: Facility Maintenance & Work Orders...');
	await sql`
		CREATE TABLE IF NOT EXISTS ga.facility_areas (
			id INTEGER PRIMARY KEY,
			area_name TEXT NOT NULL
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.facility_wo_manpower (
			id SERIAL PRIMARY KEY,
			wo_id INTEGER NOT NULL,
			worker_name VARCHAR(100) NOT NULL,
			daily_wage NUMERIC DEFAULT 0,
			duration_days NUMERIC DEFAULT 1,
			total_cost NUMERIC DEFAULT 0,
			status VARCHAR(20) DEFAULT '1',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			created_by VARCHAR(50),
			updated_at TIMESTAMP,
			updated_by VARCHAR(50)
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.facility_wo_materials (
			id SERIAL PRIMARY KEY,
			wo_id INTEGER NOT NULL,
			material_name VARCHAR(150) NOT NULL,
			unit_price NUMERIC DEFAULT 0,
			quantity NUMERIC DEFAULT 1,
			total_cost NUMERIC DEFAULT 0,
			attachment VARCHAR(255),
			status VARCHAR(20) DEFAULT '1',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			created_by VARCHAR(50),
			updated_at TIMESTAMP,
			updated_by VARCHAR(50)
		)
	`;

	await sql`ALTER TABLE ga.facility_work_orders ADD COLUMN IF NOT EXISTS requester_nik VARCHAR(50)`;
	await sql`ALTER TABLE ga.facility_work_orders ADD COLUMN IF NOT EXISTS location_code VARCHAR(50)`;
	await sql`ALTER TABLE ga.facility_work_orders ADD COLUMN IF NOT EXISTS photo_condition VARCHAR(255)`;
	await sql`ALTER TABLE ga.facility_work_orders ADD COLUMN IF NOT EXISTS raw_status VARCHAR(20)`;
	await sql`ALTER TABLE ga.facility_work_orders ADD COLUMN IF NOT EXISTS manpower_cost NUMERIC DEFAULT 0`;
	await sql`ALTER TABLE ga.facility_work_orders ADD COLUMN IF NOT EXISTS material_cost NUMERIC DEFAULT 0`;
	await sql`ALTER TABLE ga.facility_work_orders ADD COLUMN IF NOT EXISTS created_by VARCHAR(50)`;
	await sql`ALTER TABLE ga.facility_work_orders ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50)`;

	await sql`TRUNCATE TABLE ga.facility_wo_manpower, ga.facility_wo_materials, ga.facility_work_orders, ga.facility_areas RESTART IDENTITY CASCADE`;

	const areaRows = parseInsertRows('area');
	if (areaRows.length > 0) {
		await sql`INSERT INTO ga.facility_areas ${sql(areaRows.map(a => ({ id: Number(a.area_id), area_name: String(a.area_name || '').trim() })))}`;
	}

	const mpRows = parseInsertRows('work_order_manpower');
	const mpByWo = new Map();
	const mpBatch = [];
	for (const mp of mpRows) {
		const wid = Number(mp.id_wo);
		const tot = Number(mp.total || 0);
		mpByWo.set(wid, (mpByWo.get(wid) || 0) + (tot > 0 ? tot : 0));
		mpBatch.push({
			id: Number(mp.id),
			wo_id: wid,
			worker_name: String(mp.pekerja || 'Teknisi'),
			daily_wage: Number(mp.upah || 0),
			duration_days: Number(mp.lama_pengerjaan || 1),
			total_cost: tot,
			status: mp.status || '1',
			created_at: cleanTimestamp(mp.create_date, new Date().toISOString()),
			created_by: mp.create_user || null,
			updated_at: cleanTimestamp(mp.modify_date),
			updated_by: mp.modify_user || null
		});
	}
	if (mpBatch.length > 0) await sql`INSERT INTO ga.facility_wo_manpower ${sql(mpBatch)}`;
	await sql`SELECT setval('ga.facility_wo_manpower_id_seq', COALESCE((SELECT MAX(id) FROM ga.facility_wo_manpower), 1))`;

	const matRows = parseInsertRows('work_order_material');
	const matByWo = new Map();
	const matBatch = [];
	for (const mt of matRows) {
		const wid = Number(mt.id_wo);
		const tot = Number(mt.total || 0);
		matByWo.set(wid, (matByWo.get(wid) || 0) + (tot > 0 ? tot : 0));
		matBatch.push({
			id: Number(mt.id),
			wo_id: wid,
			material_name: String(mt.nama_material || 'Material'),
			unit_price: Number(mt.harga || 0),
			quantity: Number(mt.jumlah || 1),
			total_cost: tot,
			attachment: mt.lampiran || null,
			status: mt.status || '1',
			created_at: cleanTimestamp(mt.create_date, new Date().toISOString()),
			created_by: mt.create_user || null,
			updated_at: cleanTimestamp(mt.modify_date),
			updated_by: mt.modify_user || null
		});
	}
	if (matBatch.length > 0) await sql`INSERT INTO ga.facility_wo_materials ${sql(matBatch)}`;
	await sql`SELECT setval('ga.facility_wo_materials_id_seq', COALESCE((SELECT MAX(id) FROM ga.facility_wo_materials), 1))`;

	const woRows = parseInsertRows('work_order');
	const usedWoNumbers = new Set();
	const woBatch = [];
	for (const w of woRows) {
		const id = Number(w.id);
		let woNo = String(w.no_wo || `WO${String(id).padStart(7, '0')}`).trim();
		if (usedWoNumbers.has(woNo)) {
			woNo = `${woNo}-${id}`;
		}
		usedWoNumbers.add(woNo);

		const rawSt = String(w.status || '1').trim();
		let status = 'PENDING';
		if (rawSt === '2') status = 'IN_PROGRESS';
		else if (rawSt === '3') status = 'COMPLETED';

		const desc = String(w.nama_perbaikan || 'Perbaikan Fasilitas').trim();
		const descLower = desc.toLowerCase();
		let facType = 'CIVIL_PLUMBING';
		if (descLower.includes('ac ') || descLower.includes('freon') || descLower.includes('exhaust')) facType = 'AC_HVAC';
		else if (descLower.includes('lampu') || descLower.includes('listrik') || descLower.includes('kabel') || descLower.includes('panel') || descLower.includes('smoke')) facType = 'LISTRIK_GENSET';
		else if (descLower.includes('cctv') || descLower.includes('lan') || descLower.includes('wifi')) facType = 'CCTV_SECURITY';

		const mpCost = mpByWo.get(id) || 0;
		const matCost = matByWo.get(id) || 0;
		const rawTotal = Number(String(w.total || '0').replace(/[^\d.-]/g, '')) || 0;
		const actualCost = rawTotal > 0 ? rawTotal : mpCost + matCost;

		const reqNik = String(w.nama_pemesanan || w.create_user || '').trim();
		const reqName = resolveEmp(reqNik);
		const locCode = String(w.lokasi || 'LOC_008').trim();
		const locName = resolveLoc(locCode);
		const oDate = cleanDate(w.tgl_order) || cleanDate(w.create_date) || '2024-01-01';

		woBatch.push({
			id,
			wo_number: woNo,
			facility_type: facType,
			location: locName,
			location_code: locCode,
			requester_nik: reqNik || null,
			requester_name: reqName,
			department: 'GENERAL AFFAIRS',
			description: desc,
			urgency: 'MEDIUM',
			status,
			raw_status: rawSt,
			technician_vendor: mpCost > 0 ? 'Tim Teknisi Internal GA' : 'Teknisi GA',
			estimated_cost: actualCost,
			actual_cost: actualCost,
			manpower_cost: mpCost,
			material_cost: matCost,
			scheduled_date: oDate,
			completion_date: status === 'COMPLETED' ? (cleanDate(w.modify_date) || oDate) : null,
			completion_notes: null,
			photo_condition: w.foto_kondisi || null,
			created_by: w.create_user || null,
			created_at: cleanTimestamp(w.create_date, `${oDate} 08:00:00`),
			updated_by: w.modify_user || null,
			updated_at: cleanTimestamp(w.modify_date, `${oDate} 08:00:00`)
		});
	}
	if (woBatch.length > 0) await sql`INSERT INTO ga.facility_work_orders ${sql(woBatch)}`;
	await sql`SELECT setval('ga.facility_work_orders_id_seq', COALESCE((SELECT MAX(id) FROM ga.facility_work_orders), 1))`;
	console.log(`   -> Migrated ${woRows.length} WOs, ${mpRows.length} manpower rows, ${matRows.length} material rows, ${areaRows.length} areas.`);

	// =========================================================================
	// 5. DOMAIN 4 & 5: CARPOOL & SPD (TRAVEL MANAGEMENT)
	// =========================================================================
	console.log('5. Migrating Domain 4 & 5: Carpool & SPD (Travel)...');
	await sql`
		CREATE TABLE IF NOT EXISTS ga.cars (
			id SERIAL PRIMARY KEY,
			car_group VARCHAR(50),
			car_user VARCHAR(100),
			car_name VARCHAR(255) NOT NULL,
			police_number VARCHAR(50) NOT NULL,
			support_id INTEGER,
			fuel_id INTEGER,
			km_per_liter NUMERIC DEFAULT 0,
			is_active BOOLEAN DEFAULT TRUE
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.carpool_requests (
			id SERIAL PRIMARY KEY,
			carpool_number VARCHAR(50) NOT NULL,
			use_date DATE,
			end_date DATE,
			car_id INTEGER,
			requester_nik VARCHAR(50),
			requester_name VARCHAR(255),
			city_type VARCHAR(50),
			destination VARCHAR(255),
			reason TEXT,
			km_start INTEGER DEFAULT 0,
			km_end INTEGER DEFAULT 0,
			time_start TIME,
			time_end TIME,
			company_group VARCHAR(50),
			cost_center_code VARCHAR(50),
			department VARCHAR(150),
			usage_type VARCHAR(100),
			description TEXT,
			passenger_count INTEGER DEFAULT 1,
			driver_name VARCHAR(255),
			status VARCHAR(30) DEFAULT 'OPEN',
			raw_status VARCHAR(50),
			status_desc TEXT,
			created_by VARCHAR(100),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_by VARCHAR(100),
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			email_app VARCHAR(255),
			sent_date_app TIMESTAMP,
			approve_date_app TIMESTAMP,
			reject_date_app TIMESTAMP,
			email_ga VARCHAR(255),
			sent_date_ga TIMESTAMP,
			approve_date_ga TIMESTAMP,
			reject_date_ga TIMESTAMP,
			cancel_date TIMESTAMP
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.carpool_passengers (
			id SERIAL PRIMARY KEY,
			carpool_id INTEGER NOT NULL,
			passenger_nik VARCHAR(50),
			passenger_name VARCHAR(255),
			created_by VARCHAR(50),
			created_at TIMESTAMP,
			updated_by VARCHAR(50),
			updated_at TIMESTAMP
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.spd_requests (
			id SERIAL PRIMARY KEY,
			spd_number VARCHAR(50) NOT NULL,
			start_date DATE,
			end_date DATE,
			requester_nik VARCHAR(50),
			requester_name VARCHAR(255),
			destination VARCHAR(255),
			reason TEXT,
			cost_center_code VARCHAR(50),
			department VARCHAR(150),
			description TEXT,
			is_overnight INTEGER DEFAULT 1,
			facility_type_id INTEGER DEFAULT 1,
			status VARCHAR(30) DEFAULT 'OPEN',
			raw_status VARCHAR(50),
			status_desc TEXT,
			attachment VARCHAR(255),
			created_by VARCHAR(100),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_by VARCHAR(100),
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			sent_date_app TIMESTAMP,
			email_app VARCHAR(255),
			approve_date_app TIMESTAMP,
			reject_date_app TIMESTAMP,
			email_ga VARCHAR(255),
			sent_date_ga TIMESTAMP,
			approve_date_ga TIMESTAMP,
			reject_date_ga TIMESTAMP,
			cancel_date TIMESTAMP
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.spd_participants (
			id SERIAL PRIMARY KEY,
			spd_id INTEGER NOT NULL,
			participant_nik VARCHAR(50),
			participant_name VARCHAR(255),
			spd_ga_id VARCHAR(50),
			created_by VARCHAR(50),
			created_at TIMESTAMP,
			updated_by VARCHAR(50),
			updated_at TIMESTAMP
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.spd_rates (
			id SERIAL PRIMARY KEY,
			city VARCHAR(255),
			job_level VARCHAR(100),
			budget_id INTEGER DEFAULT 1,
			cost_amount NUMERIC DEFAULT 0
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.travel_budgets (
			id SERIAL PRIMARY KEY,
			budget_name VARCHAR(255),
			facility_type_id INTEGER
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.travel_facility_types (
			id SERIAL PRIMARY KEY,
			description VARCHAR(255),
			value_code VARCHAR(45)
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.travel_meal_rates (
			id SERIAL PRIMARY KEY,
			job_level VARCHAR(100),
			amount NUMERIC DEFAULT 0,
			region VARCHAR(100),
			effective_date DATE,
			description VARCHAR(255)
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.travel_fuel_prices (
			id SERIAL PRIMARY KEY,
			fuel_name VARCHAR(150),
			price_per_liter NUMERIC DEFAULT 0,
			effective_date DATE
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.travel_destinations (
			id SERIAL PRIMARY KEY,
			origin VARCHAR(150),
			destination_name VARCHAR(255),
			area VARCHAR(100),
			region VARCHAR(100),
			km_min INTEGER DEFAULT 0,
			km_max INTEGER DEFAULT 0,
			toll_cost NUMERIC DEFAULT 0
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.travel_tolls (
			id SERIAL PRIMARY KEY,
			destination_id INTEGER,
			toll_amount NUMERIC DEFAULT 0,
			effective_date DATE
		)
	`;

	await sql`TRUNCATE TABLE ga.cars, ga.carpool_requests, ga.carpool_passengers, ga.spd_requests, ga.spd_participants, ga.spd_rates, ga.travel_budgets, ga.travel_facility_types, ga.travel_meal_rates, ga.travel_fuel_prices, ga.travel_destinations, ga.travel_tolls RESTART IDENTITY CASCADE`;

	// Master Cars
	const carRows = parseInsertRows('car');
	if (carRows.length > 0) {
		await sql`INSERT INTO ga.cars ${sql(carRows.map(c => ({
			id: Number(c.car_id),
			car_group: c.car_kelompok || 'R4',
			car_user: c.car_user || 'GA',
			car_name: c.car_name || 'Mobil Operasional',
			police_number: String(c.car_nopol || '-'),
			support_id: c.car_supp !== null ? Number(c.car_supp) : null,
			fuel_id: Number(c.car_bbm || 1),
			km_per_liter: Number(c.car_km_liter || 0),
			is_active: true
		})))}`;
	}
	await sql`SELECT setval('ga.cars_id_seq', COALESCE((SELECT MAX(id) FROM ga.cars), 1))`;

	// Sync 9 Physical Company Vehicles from car into ga.assets (cleaning dummy rows)
	await sql`ALTER TABLE ga.assets ADD COLUMN IF NOT EXISTS car_id INTEGER`;
	await sql`ALTER TABLE ga.assets ADD COLUMN IF NOT EXISTS vehicle_group VARCHAR(50)`;
	await sql`ALTER TABLE ga.assets ADD COLUMN IF NOT EXISTS fuel_id INTEGER DEFAULT 1`;
	await sql`ALTER TABLE ga.assets ADD COLUMN IF NOT EXISTS km_per_liter NUMERIC DEFAULT 0`;
	await sql`TRUNCATE TABLE ga.asset_mutations, ga.assets RESTART IDENTITY CASCADE`;

	const nonAssetNopol = /go\s*-\s*car|go\s*-\s*jeg|go\s*-\s*jek|pribadi/i;
	const physicalCars = carRows.filter(c => !nonAssetNopol.test(String(c.car_nopol || '')));
	let assetSeq = 1;
	for (const c of physicalCars) {
		const code = `AST-VEH-${String(assetSeq).padStart(3, '0')}`;
		assetSeq++;
		const rawName = String(c.car_name || 'Kendaraan Operasional').trim();
		const cleanName = rawName.toLowerCase() === 'other' ? 'Mobil Operasional GA' : rawName.replace(/Oprasional|Opasional/i, 'Operasional');
		const nopol = String(c.car_nopol || '').trim();
		const grp = String(c.car_kelompok || 'R4').trim().replace(/\s+/g, '-');
		const fullName = `${cleanName} (${nopol})`;

		await sql`
			INSERT INTO ga.assets (
				asset_code, name, category, brand_model, serial_number,
				acquisition_date, acquisition_cost, economic_life_months, salvage_value,
				location, room, pic_name, condition, status, barcode_qr, notes,
				car_id, vehicle_group, fuel_id, km_per_liter
			) VALUES (
				${code}, ${fullName}, 'KENDARAAN_OPERASIONAL', ${`${cleanName} • ${grp}`}, ${nopol},
				'2023-01-01', 0, 60, 0,
				'Head Office Cilegon', 'Pool Operasional GA', ${String(c.car_user || 'GA').trim()},
				'GOOD', 'ACTIVE', ${code}, ${`Unit Kendaraan Operasional Carpool GA (Nopol: ${nopol}, Rasio BBM: ${c.car_km_liter || 0} KM/L)`},
				${Number(c.car_id)}, ${grp}, ${Number(c.car_bbm || 1)}, ${Number(c.car_km_liter || 0)}
			)
		`;
	}

	// Master Fuel, Destinations, Tolls, Budgets, Facility Types, Meal Rates, SPD Rates
	const bbmRows = parseInsertRows('bbm');
	if (bbmRows.length > 0) {
		await sql`INSERT INTO ga.travel_fuel_prices ${sql(bbmRows.map(b => ({
			id: Number(b.id_bbm_harga),
			fuel_name: b.bbm_harga_nama,
			price_per_liter: Number(b.bbm_harga_nilai || 0),
			effective_date: cleanDate(b.bbm_harga_berlaku)
		})))}`;
	}
	await sql`SELECT setval('ga.travel_fuel_prices_id_seq', COALESCE((SELECT MAX(id) FROM ga.travel_fuel_prices), 1))`;

	const tujuanRows = parseInsertRows('tujuan');
	if (tujuanRows.length > 0) {
		await sql`INSERT INTO ga.travel_destinations ${sql(tujuanRows.map(t => ({
			id: Number(t.id_tujuan),
			origin: t.tujuan_asal,
			destination_name: t.tujuan_nama,
			area: t.tujuan_area,
			region: t.tujuan_region,
			km_min: Number(t.tujuan_km1 || 0),
			km_max: Number(t.tujuan_km2 || 0),
			toll_cost: Number(t.biaya_tol || 0)
		})))}`;
	}
	await sql`SELECT setval('ga.travel_destinations_id_seq', COALESCE((SELECT MAX(id) FROM ga.travel_destinations), 1))`;

	const tolRows = parseInsertRows('tol');
	if (tolRows.length > 0) {
		await sql`INSERT INTO ga.travel_tolls ${sql(tolRows.map(tl => ({
			id: Number(tl.id_tol),
			destination_id: Number(tl.id_tujuan),
			toll_amount: Number(tl.tol_nilai || 0),
			effective_date: cleanDate(tl.tol_berlaku)
		})))}`;
	}
	await sql`SELECT setval('ga.travel_tolls_id_seq', COALESCE((SELECT MAX(id) FROM ga.travel_tolls), 1))`;

	const anggaranRows = parseInsertRows('anggaran');
	if (anggaranRows.length > 0) {
		await sql`INSERT INTO ga.travel_budgets ${sql(anggaranRows.map(ag => ({
			id: Number(ag.anggaran_id),
			budget_name: ag.anggaran_nama,
			facility_type_id: Number(ag.anggaran_fas || 1)
		})))}`;
	}
	await sql`SELECT setval('ga.travel_budgets_id_seq', COALESCE((SELECT MAX(id) FROM ga.travel_budgets), 1))`;

	const fasRows = parseInsertRows('fasilitas');
	if (fasRows.length > 0) {
		await sql`INSERT INTO ga.travel_facility_types ${sql(fasRows.map(fsRow => ({
			id: Number(fsRow.id_fas),
			description: fsRow.desc_fas,
			value_code: String(fsRow.value_code || fsRow.value_fas || '1')
		})))}`;
	}
	await sql`SELECT setval('ga.travel_facility_types_id_seq', COALESCE((SELECT MAX(id) FROM ga.travel_facility_types), 1))`;

	const umRows = parseInsertRows('uang_makan');
	if (umRows.length > 0) {
		await sql`INSERT INTO ga.travel_meal_rates ${sql(umRows.map(um => ({
			id: Number(um.id_uang_makan),
			job_level: um.level_uang_makan,
			amount: Number(um.nilai_uang_makan || 0),
			region: um.region_uang_makan,
			effective_date: cleanDate(um.uang_makan_belaku),
			description: um.desc || null
		})))}`;
	}
	await sql`SELECT setval('ga.travel_meal_rates_id_seq', COALESCE((SELECT MAX(id) FROM ga.travel_meal_rates), 1))`;

	const srRows = parseInsertRows('spd_ga');
	if (srRows.length > 0) {
		await sql`INSERT INTO ga.spd_rates ${sql(srRows.map(sr => ({
			id: Number(sr.spd_ga_id),
			city: sr.spd_ga_kota,
			job_level: sr.spd_level,
			budget_id: Number(sr.spd_anggaran_id || 1),
			cost_amount: Number(sr.spd_ga_biaya || 0)
		})))}`;
	}
	await sql`SELECT setval('ga.spd_rates_id_seq', COALESCE((SELECT MAX(id) FROM ga.spd_rates), 1))`;

	// Carpool Transactions (5,284 rows)
	const cpRows = parseInsertRows('carpool');
	const cpBatch = [];
	for (const c of cpRows) {
		const id = Number(c.carpool_id);
		const rawSt = String(c.carpool_status || 'OPEN').trim().toUpperCase() || 'OPEN';
		let status = 'PENDING';
		if (rawSt === 'APPROVE GA') status = 'APPROVED';
		else if (rawSt.includes('REJECT') || rawSt === 'CANCEL') status = 'REJECTED';
		else if (rawSt === 'APPROVE AP') status = 'APPROVED_AP';

		const nik = String(c.carpool_emp || c.create_by || '').trim();
		cpBatch.push({
			id,
			carpool_number: `CRP-${String(id).padStart(5, '0')}`,
			use_date: cleanDate(c.carpool_date) || cleanDate(c.create_date) || '2024-01-01',
			end_date: cleanDate(c.carpool_date2),
			car_id: Number(c.carpool_car_id || 0) || null,
			requester_nik: nik || null,
			requester_name: resolveEmp(c.carpool_emp, c.create_by),
			city_type: c.carpool_kota || 'Dalam Kota',
			destination: c.carpool_tujuan || '-',
			reason: c.carpool_reason || null,
			km_start: Number(c.carpool_kmawal || 0),
			km_end: Number(c.carpool_kmakhir || 0),
			time_start: cleanTime(c.carpool_jamawal, '08:00:00'),
			time_end: cleanTime(c.carpool_jamakhir, '17:00:00'),
			company_group: c.carpool_group || null,
			cost_center_code: c.carpool_costcenter || null,
			department: resolveDept(c.carpool_costcenter),
			usage_type: c.carpool_type || null,
			description: c.carpool_desc || null,
			passenger_count: Number(c.carpool_penumpang || 1),
			driver_name: c.carpool_driver || null,
			status,
			raw_status: rawSt,
			status_desc: c.carpool_status_desc || null,
			created_by: c.create_by || null,
			created_at: cleanTimestamp(c.create_date, '2024-01-01 08:00:00'),
			updated_by: c.update_by || null,
			updated_at: cleanTimestamp(c.update_date, '2024-01-01 08:00:00'),
			email_app: c.email_app || null,
			sent_date_app: cleanTimestamp(c.Sent_Date_App),
			approve_date_app: cleanTimestamp(c.Approve_Date_App),
			reject_date_app: cleanTimestamp(c.Reject_Date_App),
			email_ga: c.email_ga || null,
			sent_date_ga: cleanTimestamp(c.Sent_Date_GA),
			approve_date_ga: cleanTimestamp(c.Approve_Date_GA),
			reject_date_ga: cleanTimestamp(c.Reject_Date_GA),
			cancel_date: cleanTimestamp(c.Cancel_Date)
		});
	}
	for (let i = 0; i < cpBatch.length; i += 200) {
		await sql`INSERT INTO ga.carpool_requests ${sql(cpBatch.slice(i, i + 200))}`;
	}
	await sql`SELECT setval('ga.carpool_requests_id_seq', COALESCE((SELECT MAX(id) FROM ga.carpool_requests), 1))`;

	// Carpool Passengers (4,637 rows)
	const cpdRows = parseInsertRows('carpool_detail');
	const cpdBatch = [];
	for (const d of cpdRows) {
		const nik = String(d.carpool_nik || '').trim();
		cpdBatch.push({
			id: Number(d.carpool_detail_id),
			carpool_id: Number(d.carpool_id || 0),
			passenger_nik: nik,
			passenger_name: resolveEmp(nik),
			created_by: d.createby || null,
			created_at: cleanTimestamp(d.createdate),
			updated_by: d.updateby || null,
			updated_at: cleanTimestamp(d.updatedate)
		});
	}
	for (let i = 0; i < cpdBatch.length; i += 250) {
		await sql`INSERT INTO ga.carpool_passengers ${sql(cpdBatch.slice(i, i + 250))}`;
	}
	await sql`SELECT setval('ga.carpool_passengers_id_seq', COALESCE((SELECT MAX(id) FROM ga.carpool_passengers), 1))`;

	// SPD Requests (2,574 rows)
	const spdRows = parseInsertRows('spd');
	const spdBatch = [];
	for (const s of spdRows) {
		const id = Number(s.spd_id);
		const rawSt = String(s.spd_status || 'OPEN').trim().toUpperCase() || 'OPEN';
		let status = 'PENDING';
		if (rawSt === 'APPROVE GA') status = 'APPROVED';
		else if (rawSt.includes('REJECT') || rawSt === 'CANCEL') status = 'REJECTED';
		else if (rawSt === 'APPROVE AP') status = 'APPROVED_AP';

		const nik = String(s.spd_emp || s.create_by || '').trim();
		const sDate = cleanDate(s.spd_date) || cleanDate(s.create_date) || '2024-01-01';
		spdBatch.push({
			id,
			spd_number: `SPD-${String(id).padStart(5, '0')}`,
			start_date: sDate,
			end_date: cleanDate(s.spd_date2) || sDate,
			requester_nik: nik || null,
			requester_name: resolveEmp(s.spd_emp, s.create_by),
			destination: s.spd_tujuan || '-',
			reason: s.spd_reason || null,
			cost_center_code: s.spd_costcenter || null,
			department: resolveDept(s.spd_costcenter),
			description: s.spd_desc || null,
			is_overnight: Number(s.spd_inap ?? 1),
			facility_type_id: Number(s.spd_fas ?? 1),
			status,
			raw_status: rawSt,
			status_desc: s.spd_status_desc || null,
			attachment: s.lampiran || null,
			created_by: s.create_by || null,
			created_at: cleanTimestamp(s.create_date, `${sDate} 08:00:00`),
			updated_by: s.update_by || null,
			updated_at: cleanTimestamp(s.update_date, `${sDate} 08:00:00`),
			sent_date_app: cleanTimestamp(s.Sent_Date_App),
			email_app: s.email_app || null,
			approve_date_app: cleanTimestamp(s.Approve_Date_App),
			reject_date_app: cleanTimestamp(s.Reject_Date_App),
			email_ga: s.email_ga || null,
			sent_date_ga: cleanTimestamp(s.Sent_Date_GA),
			approve_date_ga: cleanTimestamp(s.Approve_Date_GA),
			reject_date_ga: cleanTimestamp(s.Reject_Date_GA),
			cancel_date: cleanTimestamp(s.Cancel_Date)
		});
	}
	for (let i = 0; i < spdBatch.length; i += 200) {
		await sql`INSERT INTO ga.spd_requests ${sql(spdBatch.slice(i, i + 200))}`;
	}
	await sql`SELECT setval('ga.spd_requests_id_seq', COALESCE((SELECT MAX(id) FROM ga.spd_requests), 1))`;

	// SPD Participants (3,735 rows)
	const spddRows = parseInsertRows('spd_detail');
	const spddBatch = [];
	for (const d of spddRows) {
		const nik = String(d.spd_nik || '').trim();
		spddBatch.push({
			id: Number(d.spd_detail_id),
			spd_id: Number(d.spd_id || 0),
			participant_nik: nik,
			participant_name: resolveEmp(nik),
			spd_ga_id: d.spd_ga_id ? String(d.spd_ga_id) : null,
			created_by: d.createby || null,
			created_at: cleanTimestamp(d.createdate),
			updated_by: d.updateby || null,
			updated_at: cleanTimestamp(d.updatedate)
		});
	}
	for (let i = 0; i < spddBatch.length; i += 250) {
		await sql`INSERT INTO ga.spd_participants ${sql(spddBatch.slice(i, i + 250))}`;
	}
	await sql`SELECT setval('ga.spd_participants_id_seq', COALESCE((SELECT MAX(id) FROM ga.spd_participants), 1))`;
	console.log(`   -> Migrated ${carRows.length} cars, ${cpBatch.length} carpools (${cpdBatch.length} passengers), ${spdBatch.length} SPDs (${spddBatch.length} participants).`);

	// =========================================================================
	// 6. DOMAIN 6: DOCUMENT ARCHIVES (rak, lantai, arsip)
	// =========================================================================
	console.log('6. Migrating Domain 6: Document Archives (rak, lantai, arsip)...');
	await sql`
		CREATE TABLE IF NOT EXISTS ga.archive_racks (
			id SERIAL PRIMARY KEY,
			rack_name VARCHAR(100) NOT NULL
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.archive_shelves (
			id SERIAL PRIMARY KEY,
			rack_id INTEGER NOT NULL REFERENCES ga.archive_racks(id) ON DELETE CASCADE,
			shelf_name VARCHAR(100) NOT NULL
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS ga.archives (
			id SERIAL PRIMARY KEY,
			rack_id INTEGER NOT NULL REFERENCES ga.archive_racks(id) ON DELETE CASCADE,
			shelf_id INTEGER NOT NULL REFERENCES ga.archive_shelves(id) ON DELETE CASCADE,
			archive_number VARCHAR(100) NOT NULL,
			department VARCHAR(100) NOT NULL,
			document_name VARCHAR(255) NOT NULL,
			document_year INTEGER NOT NULL,
			retention_years INTEGER NOT NULL DEFAULT 10,
			destruction_date DATE,
			raw_destruction VARCHAR(100),
			status VARCHAR(50) NOT NULL DEFAULT 'aktif',
			file_path VARCHAR(255),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`;

	await sql`TRUNCATE TABLE ga.archives, ga.archive_shelves, ga.archive_racks RESTART IDENTITY CASCADE`;

	const rakRows = parseInsertRows('rak');
	if (rakRows.length > 0) {
		await sql`INSERT INTO ga.archive_racks ${sql(rakRows.map(r => ({ id: Number(r.id), rack_name: String(r.nama_rak) })))}`;
	}
	await sql`SELECT setval('ga.archive_racks_id_seq', COALESCE((SELECT MAX(id) FROM ga.archive_racks), 1))`;

	const lantaiRows = parseInsertRows('lantai');
	if (lantaiRows.length > 0) {
		await sql`INSERT INTO ga.archive_shelves ${sql(lantaiRows.map(l => ({ id: Number(l.id), rack_id: Number(l.rak_id), shelf_name: String(l.nama_lantai) })))}`;
	}
	await sql`SELECT setval('ga.archive_shelves_id_seq', COALESCE((SELECT MAX(id) FROM ga.archive_shelves), 1))`;

	const arsipRows = parseInsertRows('arsip');
	const arsipBatch = [];
	for (const a of arsipRows) {
		const yr = Number(a.tahun_dokumen || 2020);
		const ret = Number(a.lama_penyimpanan || 0);
		let destDate = cleanDate(a.pemusnahan);
		if (!destDate && yr > 1990 && ret > 0) {
			destDate = `${yr + ret}-01-01`;
		}
		arsipBatch.push({
			id: Number(a.id),
			rack_id: Number(a.rak_id),
			shelf_id: Number(a.lantai_id),
			archive_number: String(a.no_arsip || '').trim(),
			department: String(a.dept || 'FINANCE').trim(),
			document_name: String(a.nama_dokumen || '').trim(),
			document_year: yr,
			retention_years: ret,
			destruction_date: destDate,
			raw_destruction: a.pemusnahan ? String(a.pemusnahan) : null,
			status: String(a.status || 'aktif').trim(),
			file_path: a.file_path || null,
			created_at: cleanTimestamp(a.created_at, '2025-10-02 16:00:00')
		});
	}
	for (let i = 0; i < arsipBatch.length; i += 200) {
		await sql`INSERT INTO ga.archives ${sql(arsipBatch.slice(i, i + 200))}`;
	}
	await sql`SELECT setval('ga.archives_id_seq', COALESCE((SELECT MAX(id) FROM ga.archives), 1))`;
	console.log(`   -> Migrated 10 racks, 50 shelves, and ${arsipBatch.length} archive documents.`);

	// =========================================================================
	// 7. DOMAIN 7: VISITOR & GUESTBOOK (survei, survei_copy)
	// =========================================================================
	console.log('7. Migrating Domain 7: Visitor & Guestbook (survei, survei_copy)...');
	await sql`
		CREATE TABLE IF NOT EXISTS ga.visitors (
			id SERIAL PRIMARY KEY,
			visitor_name VARCHAR(150) NOT NULL,
			company VARCHAR(150),
			address VARCHAR(255),
			phone VARCHAR(50),
			purpose TEXT,
			badge_number VARCHAR(50),
			host_nik VARCHAR(50),
			host_name VARCHAR(150),
			host_department VARCHAR(150),
			check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			check_out_time TIMESTAMP,
			survey_rating INTEGER,
			photo_file VARCHAR(255),
			status VARCHAR(30) DEFAULT 'CHECKED_OUT',
			act INTEGER DEFAULT 1
		)
	`;
	await sql`TRUNCATE TABLE ga.visitors RESTART IDENTITY CASCADE`;

	const s1 = parseInsertRows('survei');
	const s2 = parseInsertRows('survei_copy');
	const combinedVisitors = [...s1, ...s2];
	const seenVisitorKeys = new Set();
	const dummyVisitorRegex = /kim jong un|korut|naruto|konoha|law dressrosa|tes\b|nuklir|bajak laut|hokage/i;
	const visitorBatch = [];

	for (const r of combinedVisitors) {
		const name = String(r.nama || '').trim();
		const company = String(r.perusahaan || '').trim();
		const address = String(r.alamat || '').trim();
		const purpose = String(r.keperluan || '').trim();
		if (!name) continue;
		if (dummyVisitorRegex.test(`${name} ${company} ${address} ${purpose}`)) continue;

		const key = `${name.toLowerCase()}|${String(r.waktu_masuk || '')}`;
		if (seenVisitorKeys.has(key)) continue;
		seenVisitorKeys.add(key);

		const rawUser = String(r.user || '').trim();
		let hostNik = null;
		let hostName = rawUser || '-';
		let hostDept = String(r.dept || '').trim() || 'UMUM';

		if (rawUser.includes('-')) {
			const parts = rawUser.split('-');
			hostNik = parts[0].trim();
			hostName = resolveEmp(hostNik, parts.slice(1).join('-').trim());
		} else if (/^\d{4}\.\d{4}$/.test(rawUser)) {
			hostNik = rawUser;
			hostName = resolveEmp(hostNik);
		} else if (rawUser) {
			hostName = resolveEmp(rawUser);
		}

		const cin = cleanTimestamp(r.waktu_masuk, '2020-02-01 09:00:00');
		const cout = cleanTimestamp(r.waktu_keluar);
		const rating = Number(r.survei || 0) || null;
		const status = cout ? 'CHECKED_OUT' : 'CHECKED_IN';

		visitorBatch.push({
			visitor_name: name,
			company: company || '-',
			address: address || '-',
			phone: String(r.telp || '-').trim(),
			purpose: purpose || '-',
			badge_number: String(r.no_kt || '-').trim(),
			host_nik: hostNik,
			host_name: hostName,
			host_department: resolveDept(hostDept),
			check_in_time: cin,
			check_out_time: cout,
			survey_rating: rating,
			photo_file: r.file || null,
			status,
			act: Number(r.act ?? 1)
		});
	}

	if (visitorBatch.length > 0) {
		await sql`INSERT INTO ga.visitors ${sql(visitorBatch)}`;
		await sql`
			UPDATE ga.visitors
			SET
				check_in_time = check_in_time + INTERVAL '7 hours',
				check_out_time = CASE WHEN check_out_time IS NOT NULL THEN check_out_time + INTERVAL '7 hours' ELSE NULL END
		`;
	}
	await sql`SELECT setval('ga.visitors_id_seq', COALESCE((SELECT MAX(id) FROM ga.visitors), 1))`;
	console.log(`   -> Migrated ${visitorBatch.length} cleaned visitor & survey records.`);

	// Add indexes for fast querying & pagination on large tables
	console.log('8. Creating indexes for fast querying...');
	await sql`CREATE INDEX IF NOT EXISTS idx_ga_stationery_req_date ON ga.stationery_requests(request_date DESC, id DESC)`;
	await sql`CREATE INDEX IF NOT EXISTS idx_ga_stationery_req_items_req ON ga.stationery_request_items(request_id)`;
	await sql`CREATE INDEX IF NOT EXISTS idx_ga_bookings_time ON ga.facility_bookings(start_time DESC)`;
	await sql`CREATE INDEX IF NOT EXISTS idx_ga_carpool_date ON ga.carpool_requests(use_date DESC, id DESC)`;
	await sql`CREATE INDEX IF NOT EXISTS idx_ga_carpool_pass_id ON ga.carpool_passengers(carpool_id)`;
	await sql`CREATE INDEX IF NOT EXISTS idx_ga_spd_date ON ga.spd_requests(start_date DESC, id DESC)`;
	await sql`CREATE INDEX IF NOT EXISTS idx_ga_spd_part_id ON ga.spd_participants(spd_id)`;
	await sql`CREATE INDEX IF NOT EXISTS idx_ga_archives_rack_shelf ON ga.archives(rack_id, shelf_id)`;

	console.log('=== MIGRATION COMPLETED SUCCESSFULLY ===');
	await sql.end();
}

run().catch(async (err) => {
	console.error('Migration failed:', err);
	await sql.end();
	process.exit(1);
});
