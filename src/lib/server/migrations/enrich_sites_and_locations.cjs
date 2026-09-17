const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

async function migrate() {
	console.log('=== MEMULAI ENRICHMENT & SINKRONISASI MASTER LOKASI / SITE ===');

	// 1. Data update untuk 33 lokasi existing
	console.log('1. Memperkaya 33 data lokasi yang ada di master.m_lokasi...');
	const existingEnrichments = [
		{ id: 1, alias: 'BLI', cp: 'HUSNI', phone: '081936423587', a1: 'D/A PT. HOLCIM INDONESIA TBK.', a2: 'JL.PELABUHAN CELUKAN BAWANG, DESA CELUKAN BAWANG, KEC.GEROKGAK', city: 'SINGARAJA, BALI', state: 'INDONESIA' },
		{ id: 2, alias: 'BYW', cp: null, phone: null, a1: 'BANYUWANGI', a2: null, city: 'BANYUWANGI', state: 'INDONESIA' },
		{ id: 3, alias: 'BTG', cp: 'PURWADI', phone: '0254-570555', a1: 'BITUNG TANGERANG', a2: null, city: 'TANGERANG', state: 'INDONESIA' },
		{ id: 4, alias: 'BRB', cp: 'TRI WAHYONO', phone: '08122844459', a1: 'JL. RAYA MRANGGEN STASIUN BRUMBUNG', a2: 'BELAKANG KORAMIL MRANGGEN', city: 'SEMARANG', state: 'JAWA TENGAH' },
		{ id: 5, alias: 'CBT', cp: 'PURWONO', phone: '021-89981570, 087833376699', a1: 'WH. BLUESCOPE STEEL INDONESIA, D/A. PT. LANGGENG BAJA PRATAMA', a2: 'JL. SUMBA BLOK A2, BEKASI FAJAR INDUSTRI ESTATE, MM 2100', city: 'BEKASI', state: 'JAWA BARAT' },
		{ id: 6, alias: 'CBT-MU', cp: null, phone: null, a1: 'CIBITUNG - MORTAR UTAMA', a2: null, city: 'BEKASI', state: 'JAWA BARAT' },
		{ id: 7, alias: 'CKD', cp: null, phone: null, a1: 'GUDANG ITP CIKANDE', a2: null, city: 'SERANG', state: 'BANTEN' },
		{ id: 8, alias: 'CLG', cp: 'IRWAN GUNAWAN', phone: '0254-570555 / 085210812478', a1: 'BCS LOGISTICS CENTER', a2: 'JL. RAYA MERAK KM.115, RAWA ARUM, GROGOL', city: 'CILEGON', state: 'BANTEN' },
		{ id: 9, alias: 'PGP', cp: 'ARI PRAMONO', phone: '081323940212', a1: 'JL. RAYA GUNUNG PUTRI SELATAN', a2: 'NO RT/RW : 02/08 GUNUNG PUTRI BOGOR', city: 'BOGOR', state: 'JAWA BARAT' },
		{ id: 10, alias: 'JKT', cp: null, phone: null, a1: 'JAKARTA', a2: null, city: 'JAKARTA', state: 'DKI JAKARTA' },
		{ id: 11, alias: 'JGL', cp: 'AHMAD SAEFUDIN', phone: null, a1: 'GUDANG BCS-HOLCIM', a2: 'JL. RAYA JOGLO NO.72, RT/RW 001', city: 'JAKARTA BARAT', state: 'DKI JAKARTA' },
		{ id: 12, alias: 'KRW', cp: 'HIKMAT MUHAMMAD', phone: '081311191567', a1: 'JL.A YANI NO.02, KAWASAN BUBULAK, RT/RW05/08', a2: 'TANJUNG PURA, KARAWANG', city: 'KARAWANG', state: 'JAWA BARAT' },
		{ id: 13, alias: 'KMB', cp: null, phone: null, a1: 'KEMBANGAN', a2: null, city: 'JAKARTA BARAT', state: 'DKI JAKARTA' },
		{ id: 14, alias: 'KLT', cp: null, phone: null, a1: 'KLATEN', a2: null, city: 'KLATEN', state: 'JAWA TENGAH' },
		{ id: 15, alias: 'LBN', cp: null, phone: null, a1: 'LABUAN', a2: null, city: 'PANDEGLANG', state: 'BANTEN' },
		{ id: 16, alias: 'LPY', cp: 'NUROKHIM', phone: '087882866947', a1: 'KOMP.STASIUN LEMPUYANGAN', a2: 'BELAKANG KORAMIL DANUREJAN', city: 'YOGYAKARTA', state: 'D.I. YOGYAKARTA' },
		{ id: 17, alias: 'MDC', cp: null, phone: null, a1: 'MDC CIBITUNG', a2: null, city: 'BEKASI', state: 'JAWA BARAT' },
		{ id: 18, alias: 'NRG', cp: 'ARI PRAMONO', phone: '081323940212', a1: 'JL. RAYA GUNUNG PUTRI SELATAN', a2: 'NO RT/RW : 02/08 GUNUNG PUTRI', city: 'BOGOR', state: 'JAWA BARAT' },
		{ id: 19, alias: 'PRW', cp: null, phone: null, a1: 'PURWOSARI', a2: null, city: 'PURWOSARI', state: 'JAWA TIMUR' },
		{ id: 20, alias: 'RWL', cp: null, phone: null, a1: 'RAWALUMBU', a2: null, city: 'BEKASI', state: 'JAWA BARAT' },
		{ id: 21, alias: 'RMK', cp: 'ISDRAJAT', phone: '081908449493', a1: 'KAWASAN INDUSTRI MASPION IX NO.1', a2: 'ROMOKALISARI', city: 'SURABAYA', state: 'JAWA TIMUR' },
		{ id: 22, alias: 'SPH', cp: 'FERIYANSYAH', phone: '087771010201', a1: 'Jl. RAYA SERPONG KM. 10, KP. WATES RT/RW. 06/03', a2: 'KELURAHAN PAKULONAN, ALAM SUTERA SERPONG', city: 'TANGERANG SELATAN', state: 'BANTEN' },
		{ id: 23, alias: 'SLO', cp: 'EKO SUSANTO', phone: '0271-719773 / 085743624051', a1: 'PT HOLCIM INDONESIA TBK, SOLO SALES REPRESENTATIVE', a2: 'EMPLASEMEN PJKA, STASIUN SOLO BALAPAN', city: 'SOLO', state: 'JAWA TENGAH' },
		{ id: 24, alias: 'SRA', cp: null, phone: null, a1: 'SRAGEN', a2: null, city: 'SRAGEN', state: 'JAWA TENGAH' },
		{ id: 25, alias: 'TPK', cp: null, phone: null, a1: 'TANJUNG PRIOK', a2: null, city: 'JAKARTA UTARA', state: 'DKI JAKARTA' },
		{ id: 26, alias: 'TWPC', cp: 'MISWANTO', phone: '0819850462', a1: 'JL SANGO, RT/RW = 04/08', a2: 'KEL WONOSARI, KEC NGALIYAN', city: 'SEMARANG', state: 'JAWA TENGAH' },
		{ id: 27, alias: 'HO', cp: 'ANDI RISWANTO', phone: '0254-570555', a1: 'BCS LOGISTICS CENTER', a2: 'JL. RAYA MERAK KM.115, RAWA ARUM, GROGOL', city: 'CILEGON', state: 'BANTEN' },
		{ id: 28, alias: 'SRG', cp: 'M BUDI SUPRIANTO', phone: '081932788225', a1: 'JL.RAYA SERANG PANDEGLANG KM.09', a2: 'PALIMA, SERANG', city: 'SERANG', state: 'BANTEN' },
		{ id: 29, alias: 'SBY', cp: 'HENDI', phone: null, a1: 'D/A PT. BUANA CENTRA SWAKARSA', a2: 'JL. PANGLIMA SUDIRMAN NO.17, KLETEK, TAMAN SIDOARJO', city: 'SIDOARJO', state: 'JAWA TIMUR' },
		{ id: 30, alias: 'CDP', cp: 'IRWANSYAH', phone: '081230299232', a1: 'PT. BCS SITE OFFICE CDP', a2: 'JL. DRY PORT RAYA, KOTA JABABEKA CIKARANG', city: 'BEKASI', state: 'JAWA BARAT' },
		{ id: 31, alias: 'KRC', cp: null, phone: null, a1: 'KARAWACI', a2: null, city: 'TANGERANG', state: 'BANTEN' },
		{ id: 32, alias: 'RMP', cp: 'PANDJI TRESNA', phone: '08174895962', a1: 'JL. REMPOA RAYA NO.9 RT 001/010', a2: 'REMPOA. SEBELAH GEDUNG INDONET', city: 'TANGERANG SELATAN', state: 'BANTEN' },
		{ id: 33, alias: 'WP', cp: 'AKHMAD HARIS EFENDI', phone: '081394220377', a1: 'JL. NYIMAS GANDASARI PRUJAKAN RT. 05/07', a2: 'KEL. PEKALANGAN KEC. PEKALIPAN', city: 'CIREBON', state: 'JAWA BARAT' }
	];

	for (const e of existingEnrichments) {
		await sql`
			UPDATE master.m_lokasi SET
				alias = ${e.alias},
				contact_person = ${e.cp},
				phone = ${e.phone},
				address_1 = ${e.a1},
				address_2 = ${e.a2},
				city = ${e.city},
				state = ${e.state}
			WHERE id = ${e.id}
		`;
	}
	console.log(`Berhasil memperkaya ${existingEnrichments.length} lokasi existing.`);

	// 2. Insert 8 site operasional baru
	console.log('2. Menambahkan 8 site operasional baru ke master.m_lokasi...');
	const newSites = [
		{ id: 34, code: 'LOC_034', name: 'CILACAP', alias: 'CLP', cp: 'DWI EKO PRABOWO', phone: '087719776008', a1: 'D/A PT. WAHANA TRANSTAMA.', a2: 'JL. MT. HARYONO KM.175, LOMANIS', city: 'CILACAP', state: 'JAWA TENGAH' },
		{ id: 35, code: 'LOC_035', name: 'CIKEMBAR', alias: 'CKB', cp: 'TAUFIK RAHMATULLAH', phone: '081563883070', a1: 'JL.PERINTIS KEMERDEKAAN KM.9, KP.CIANGSANA', a2: 'SUKAMULYA, CIKEMBAR, SUKABUMI', city: 'SUKABUMI', state: 'JAWA BARAT' },
		{ id: 36, code: 'LOC_036', name: 'PONTIANAK', alias: 'PNT', cp: 'AMAN', phone: '0877-4811-9486', a1: 'POOL TRUCK TANGKI SAMUDRA', a2: 'RT07 RW03 BANGKAM, BUKIT BATU, SUNGAI KUNYIT, KAB MEMPAWAH', city: 'PONTIANAK', state: 'KALIMANTAN BARAT' },
		{ id: 37, code: 'LOC_037', name: 'WAREHOUSE CILEGON', alias: 'WCLG', cp: 'Bpk. FAJAR , T', phone: '087736517999', a1: 'D/A PT. BUANA CENTRA SWAKARSA', a2: 'JL. RAYA MERAK KM. 115 RAWA ARUM, GROGOL', city: 'CILEGON', state: 'BANTEN' },
		{ id: 38, code: 'LOC_038', name: 'WORKSHOP CILEGON', alias: 'WS-CLG', cp: 'MISRI', phone: '082113782908', a1: 'BCS LOGISTICS CENTER (WORKSHOP)', a2: 'JL. RAYA MERAK KM.115, RAWA ARUM', city: 'CILEGON', state: 'BANTEN' },
		{ id: 39, code: 'LOC_039', name: 'RAILWAY CILEGON', alias: 'KAI-CLG', cp: 'EDUARD', phone: '08191114267', a1: 'BCS LOGISTICS CENTER', a2: 'JL. RAYA MERAK KM.115 RAWA ARUM', city: 'CILEGON', state: 'BANTEN' },
		{ id: 40, code: 'LOC_040', name: 'RAILWAY SURABAYA', alias: 'RW-SBY', cp: 'ISDRAJAT', phone: '081908449493', a1: 'STASIUN BENTENG SURABAYA', a2: null, city: 'SURABAYA', state: 'JAWA TIMUR' },
		{ id: 41, code: 'LOC_041', name: 'WAREHOUSE CONCH SERANG', alias: 'WHCH', cp: 'Bpk. FAJAR. T', phone: '087736517999', a1: 'D/A PT. BUANA CENTRA SWAKARSA', a2: 'JL. RAYA MERAK KM. 115 RAWAARUM GROGOL', city: 'SERANG', state: 'BANTEN' }
	];

	for (const s of newSites) {
		await sql`
			INSERT INTO master.m_lokasi (
				id, loc_code, loc_name, alias, contact_person, phone, address_1, address_2, city, state
			) VALUES (
				${s.id}, ${s.code}, ${s.name}, ${s.alias}, ${s.cp}, ${s.phone}, ${s.a1}, ${s.a2}, ${s.city}, ${s.state}
			)
			ON CONFLICT (id) DO UPDATE SET
				loc_code = EXCLUDED.loc_code,
				loc_name = EXCLUDED.loc_name,
				alias = EXCLUDED.alias,
				contact_person = EXCLUDED.contact_person,
				phone = EXCLUDED.phone,
				address_1 = EXCLUDED.address_1,
				address_2 = EXCLUDED.address_2,
				city = EXCLUDED.city,
				state = EXCLUDED.state
		`;
	}
	console.log(`Berhasil menambahkan ${newSites.length} site operasional baru.`);

	// 3. Buat/atur sequence master.m_lokasi_id_seq
	console.log('3. Menyiapkan sequence master.m_lokasi_id_seq...');
	await sql`CREATE SEQUENCE IF NOT EXISTS master.m_lokasi_id_seq START WITH 42`;
	await sql`SELECT setval('master.m_lokasi_id_seq', (SELECT MAX(id) FROM master.m_lokasi))`;
	await sql`ALTER TABLE master.m_lokasi ALTER COLUMN id SET DEFAULT nextval('master.m_lokasi_id_seq')`;

	// 4. Update site_id di master.m_project agar lebih presisi ke site spesifik baru
	console.log('4. Menyelaraskan site_id di master.m_project ke site baru yang spesifik...');
	const projectSiteSync = [
		{ projId: 17, newSiteId: 37, note: 'Warehouse Cilegon -> WAREHOUSE CILEGON (37)' },
		{ projId: 24, newSiteId: 35, note: 'CIKEMBAR WAREHOUSE -> CIKEMBAR (35)' },
		{ projId: 92, newSiteId: 41, note: 'WAREHOUSE CONCH -> WAREHOUSE CONCH SERANG (41)' },
		{ projId: 93, newSiteId: 36, note: 'Trans Pontianak -> PONTIANAK (36)' },
		{ projId: 11, newSiteId: 39, note: 'Trans railway -> RAILWAY CILEGON (39)' },
		{ projId: 58, newSiteId: 39, note: 'TRANS RAILWAY -> RAILWAY CILEGON (39)' }
	];

	for (const ps of projectSiteSync) {
		console.log(`- Syncing ${ps.note}`);
		await sql`UPDATE master.m_project SET site_id = ${ps.newSiteId} WHERE id = ${ps.projId}`;
	}

	// 5. Verifikasi hasil
	console.log('5. Verifikasi hasil akhir master.m_lokasi...');
	const [countResult] = await sql`SELECT count(*) as total, count(alias) as with_alias, count(contact_person) as with_cp FROM master.m_lokasi`;
	console.log('Statistik Lokasi:', countResult);

	const sample = await sql`SELECT id, loc_code, loc_name, alias, contact_person, phone, city FROM master.m_lokasi ORDER BY id ASC LIMIT 10`;
	console.log('Sample 10 Lokasi Teratas:', sample);

	const sampleNew = await sql`SELECT id, loc_code, loc_name, alias, contact_person, phone, city FROM master.m_lokasi WHERE id >= 34 ORDER BY id ASC`;
	console.log('Site Baru Ditambahkan:', sampleNew);

	console.log('=== MIGRASI MASTER LOKASI SELESAI DENGAN SUKSES ===');
	process.exit(0);
}

migrate().catch(err => {
	console.error('Error saat migrasi master lokasi:', err);
	process.exit(1);
});
