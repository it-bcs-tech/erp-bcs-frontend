const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const postgres = require('postgres');

const DATABASE_URL =
	process.env.DATABASE_URL ||
	'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL, { connect_timeout: 10 });

const CSV_PATH = '/tmp/lms_sheets/sheet_157495735.csv';

// Pemetaan awal 15 kursus yang telah terdaftar ke kode kompetensi relevan
const INITIAL_COURSE_MAPPING = {
	I11: 'CRS-LOG-001', // Defensive Driving Technique -> Defensive Driving & Road Safety
	F02: 'CRS-ERP-004', // Computer Skills -> Panduan Operasional Mobile Apps Driver & ERP Core BCS
	R17: 'CRS-K3-002', // Risk Management -> K3 Pergudangan & Penanganan Material B3
	I13: 'CRS-MTC-003', // Diesel Engine -> Preventive Maintenance Mesin Truk Diesel Euro 4
	D03: 'CRS-LDR-005', // Leadership -> Effective Field Leadership & Incident Resolution
	E06: 'CRS-2026-001', // Safety Awareness -> Re-Induksi Keselamatan & SWP
	R20: 'CRS-2026-002', // Safety Management System -> JSA & HIRADC Transportasi Logistik
	R09: 'CRS-2026-004', // First Aid -> Basic First Aid (P3K)
	R08: 'CRS-2026-005', // Fire Management -> Fire Drill, APAR & Fire Management
	I15: 'CRS-2026-006', // Fatigue Management -> Refreshment Fatigue Management
	I16: 'CRS-2026-008', // Forklift Operation -> Sertifikasi SIO Forklift Kelas 2
	K06: 'CRS-2026-009', // Cost Accounting / Finance -> Finance for Non-Finance
	Q13: 'CRS-2026-010' // Training & Development -> Training of Trainer (ToT) Level 3 BNSP
};

async function seed170Competencies() {
	console.log('🚀 Memulai migrasi 170 Kamus Kompetensi...');

	// 1. Perlebar kolom aspect agar muat hingga 150 karakter
	await sql`
		ALTER TABLE hris.lms_competency_library 
		ALTER COLUMN aspect TYPE VARCHAR(150);
	`;
	console.log('✓ Kolom aspect berhasil diperlebar menjadi VARCHAR(150).');

	if (!fs.existsSync(CSV_PATH)) {
		throw new Error(`File master CSV tidak ditemukan di: ${CSV_PATH}`);
	}

	const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
	const records = parse(fileContent, { relax_quotes: true, skip_empty_lines: true });

	let currentAspect = 'Core Competency';
	let insertedCount = 0;

	for (let i = 2; i < records.length; i++) {
		const row = records[i];
		const aspectCol = (row[0] || '').trim();
		if (aspectCol) {
			currentAspect = aspectCol;
		}

		const code = (row[1] || '').trim();
		const name = (row[2] || '').trim();
		const l1 = (row[3] || '').trim();
		const l2 = (row[4] || '').trim();
		const l3 = (row[5] || '').trim();
		const l4 = (row[6] || '').trim();
		const l5 = (row[7] || '').trim();

		if (!code || !name) continue;

		const levelIndicators = {
			1: l1,
			2: l2,
			3: l3,
			4: l4,
			5: l5
		};

		const defaultCourseId = INITIAL_COURSE_MAPPING[code] || null;

		await sql`
			INSERT INTO hris.lms_competency_library (code, name, aspect, level_indicators, default_course_id)
			VALUES (
				${code},
				${name},
				${currentAspect},
				${sql.json(levelIndicators)},
				${defaultCourseId}
			)
			ON CONFLICT (code) DO UPDATE SET
				name = EXCLUDED.name,
				aspect = EXCLUDED.aspect,
				level_indicators = EXCLUDED.level_indicators,
				default_course_id = COALESCE(hris.lms_competency_library.default_course_id, EXCLUDED.default_course_id);
		`;

		insertedCount++;
	}

	console.log(`✓ Berhasil memproses ${insertedCount} kompetensi ke database.`);

	// 2. Verifikasi total di database
	const totalRes = await sql`SELECT count(*) FROM hris.lms_competency_library`;
	console.log(`📊 Total kompetensi di hris.lms_competency_library sekarang: ${totalRes[0].count}`);

	// 3. Tampilkan rangkuman per aspek
	const aspectRes = await sql`
		SELECT aspect, count(*) as cnt, count(default_course_id) as mapped_cnt
		FROM hris.lms_competency_library
		GROUP BY aspect
		ORDER BY cnt DESC;
	`;
	console.log('📈 Rangkuman per Aspek:');
	console.table(aspectRes);

	await sql.end();
	console.log('🎉 Migrasi & Seeding 170 Kamus Kompetensi Selesai Sukses!');
}

seed170Competencies().catch((err) => {
	console.error('❌ Terjadi kesalahan saat migrasi:', err);
	process.exit(1);
});
