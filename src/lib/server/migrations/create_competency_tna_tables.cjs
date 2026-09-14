const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL, { connect_timeout: 10 });

async function migrateCompetencyTNA() {
	console.log('🚀 Membuat tabel Kamus Kompetensi & Asesmen TNA...');

	// 1. Kamus Kompetensi (Competency Library)
	await sql`
		CREATE TABLE IF NOT EXISTS hris.lms_competency_library (
			code VARCHAR(20) PRIMARY KEY,
			name VARCHAR(200) NOT NULL,
			aspect VARCHAR(50) NOT NULL,
			level_indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
			default_course_id VARCHAR(50),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`;
	console.log('✓ Tabel hris.lms_competency_library siap.');

	// 2. Standar Kompetensi Jabatan (Job Competencies)
	await sql`
		CREATE TABLE IF NOT EXISTS hris.lms_job_competencies (
			id SERIAL PRIMARY KEY,
			position_title VARCHAR(150) NOT NULL,
			department VARCHAR(100) NOT NULL,
			competency_code VARCHAR(20) REFERENCES hris.lms_competency_library(code) ON DELETE CASCADE,
			required_level INT NOT NULL CHECK (required_level BETWEEN 1 AND 5),
			CONSTRAINT uq_pos_comp UNIQUE (position_title, competency_code)
		);
	`;
	console.log('✓ Tabel hris.lms_job_competencies siap.');

	// 3. Asesmen Kompetensi Karyawan & Penugasan TNA
	await sql`
		CREATE TABLE IF NOT EXISTS hris.lms_employee_assessments (
			id SERIAL PRIMARY KEY,
			payroll_id VARCHAR(50) NOT NULL,
			employee_name VARCHAR(150) NOT NULL,
			position_title VARCHAR(150) NOT NULL,
			department VARCHAR(100) NOT NULL,
			competency_code VARCHAR(20) REFERENCES hris.lms_competency_library(code) ON DELETE CASCADE,
			required_level INT NOT NULL,
			actual_level INT NOT NULL CHECK (actual_level BETWEEN 1 AND 5),
			gap INT GENERATED ALWAYS AS (actual_level - required_level) STORED,
			status VARCHAR(50) NOT NULL,
			assessor_name VARCHAR(150) NOT NULL,
			assessment_date DATE DEFAULT CURRENT_DATE,
			assigned_course_id VARCHAR(50),
			enrollment_id INT,
			training_status VARCHAR(50) DEFAULT 'NONE',
			reassessment_status VARCHAR(50) DEFAULT 'PENDING',
			notes TEXT,
			CONSTRAINT uq_emp_comp UNIQUE (payroll_id, competency_code)
		);
	`;
	console.log('✓ Tabel hris.lms_employee_assessments siap.');

	// 4. Pastikan tabel hris.lms_enrollments memiliki kolom pelacak TNA
	await sql`
		ALTER TABLE hris.lms_enrollments
		ADD COLUMN IF NOT EXISTS is_tna_gap BOOLEAN DEFAULT FALSE,
		ADD COLUMN IF NOT EXISTS competency_code VARCHAR(20);
	`;
	console.log('✓ Kolom TNA ditambahkan ke hris.lms_enrollments.');

	// 5. Seed Kamus Kompetensi PT BCS (Berdasarkan Spreadsheet Sheet 157495735 & 1746120362)
	const competencies = [
		{
			code: 'A01',
			name: 'Achievement Orientation',
			aspect: 'Core Competency',
			defaultCourseId: 'CRS-2026-001',
			indicators: [
				{ level: 1, desc: 'Melakukan pekerjaan sesuai SOP & mempertahankan kinerja maksimal' },
				{ level: 2, desc: 'Menerapkan cara baru, meningkatkan kemampuan & mengembangkan target kerja' },
				{ level: 3, desc: 'Modifikasi prosedur kerja, memperbaiki kinerja pribadi & tim' },
				{ level: 4, desc: 'Mengembangkan ide baru, analisa peluang peningkatan hasil kerja' },
				{ level: 5, desc: 'Merubah strategi kerja, mendorong inovasi kualitas jasa/produk' }
			]
		},
		{
			code: 'A02',
			name: 'Collaboration & Teamwork',
			aspect: 'Core Competency',
			defaultCourseId: 'CRS-LDR-005',
			indicators: [
				{ level: 1, desc: 'Ikut serta dalam diskusi tim dan mendengarkan masukan rekan kerja' },
				{ level: 2, desc: 'Berpendapat dalam diskusi dan melibatkan orang lain dalam problem solving' },
				{ level: 3, desc: 'Menyatukan perbedaan pendapat dan saling membantu anggota tim' },
				{ level: 4, desc: 'Memfasilitasi berbagai pandangan dan mengenali kendala lintas unit' },
				{ level: 5, desc: 'Menyatukan kepentingan tim lintas fungsi dan merumuskan solusi strategis' }
			]
		},
		{
			code: 'A03',
			name: 'Customer Focus & Service Excellence',
			aspect: 'Core Competency',
			defaultCourseId: 'CRS-2026-001',
			indicators: [
				{ level: 1, desc: 'Mengumpulkan info kebutuhan customer, ramah dan memenuhi kepuasan' },
				{ level: 2, desc: 'Merespon keluhan dan menjaga hubungan baik dengan customer' },
				{ level: 3, desc: 'Memastikan layanan tepat waktu sesuai ekspektasi konsumen' },
				{ level: 4, desc: 'Mengantisipasi kebutuhan pasar dan memberikan solusi nilai tambah' },
				{ level: 5, desc: 'Menyusun strategi respon cepat dan memperluas jaringan relasi bisnis' }
			]
		},
		{
			code: 'A04',
			name: 'Integrity & Ethic Compliance',
			aspect: 'Core Competency',
			defaultCourseId: 'CRS-2026-001',
			indicators: [
				{ level: 1, desc: 'Menyelesaikan tugas sendiri dengan hormat dan patuh aturan perusahaan' },
				{ level: 2, desc: 'Memprioritaskan kewajiban unit kerja secara konsisten' },
				{ level: 3, desc: 'Konsisten menjalankan SOP dan bertanggung jawab penuh' },
				{ level: 4, desc: 'Menjadi teladan etika kerja dan membimbing rekan kerja' },
				{ level: 5, desc: 'Membudayakan nilai kejujuran dan menjaga reputasi perusahaan' }
			]
		},
		{
			code: 'E06',
			name: 'Safety Awareness & Zero Incident',
			aspect: 'Behavioral Competency',
			defaultCourseId: 'CRS-2026-001',
			indicators: [
				{ level: 1, desc: 'Memakai APD wajib dan mematuhi rambu-rambu keselamatan dasar' },
				{ level: 2, desc: 'Melakukan P2H kendaraan/peralatan sebelum mulai operasi' },
				{ level: 3, desc: 'Mampu menyusun JSA dan mengidentifikasi potensi bahaya rute' },
				{ level: 4, desc: 'Melakukan investigasi insiden dan mengaudit kepatuhan K3 unit kerja' },
				{ level: 5, desc: 'Merancang kebijakan keselamatan kerja dan memimpin safety culture' }
			]
		},
		{
			code: 'D01',
			name: 'Defensive Driving & Fatigue Management',
			aspect: 'Technical Competency',
			defaultCourseId: 'CRS-2026-006',
			indicators: [
				{ level: 1, desc: 'Memiliki SIM yang sesuai dan memahami rambu lalu lintas' },
				{ level: 2, desc: 'Menerapkan jarak aman pengereman dan disiplin jam istirahat' },
				{ level: 3, desc: 'Mengendalikan kendaraan saat cuaca ekstrem dan jalur berbukit' },
				{ level: 4, desc: 'Mencegah microsleep secara mandiri dan menguasai eco-driving' },
				{ level: 5, desc: 'Menjadi instruktur pendamping bagi pengemudi junior/baru' }
			]
		},
		{
			code: 'M02',
			name: 'Diagnosa Mesin Diesel Euro 4 Common Rail',
			aspect: 'Technical Competency',
			defaultCourseId: 'CRS-2026-007',
			indicators: [
				{ level: 1, desc: 'Mengetahui komponen dasar mesin diesel dan jadwal servis berkala' },
				{ level: 2, desc: 'Mampu melakukan penggantian filter oli, bahan bakar, dan air cleaner' },
				{ level: 3, desc: 'Mampu menggunakan scanner OBD/DTC untuk membaca kode error mesin' },
				{ level: 4, desc: 'Melakukan kalibrasi injektor common rail dan overhaul turbocharger' },
				{ level: 5, desc: 'Ahli troubleshooting sistem EMS dan emisi gas buang Euro 4' }
			]
		},
		{
			code: 'W03',
			name: 'K3 Pergudangan & SIO Operator Forklift',
			aspect: 'Technical Competency',
			defaultCourseId: 'CRS-2026-008',
			indicators: [
				{ level: 1, desc: 'Mengetahui prosedur keselamatan kerja di area racking gudang' },
				{ level: 2, desc: 'Mampu mengoperasikan hand pallet dan stacker manual' },
				{ level: 3, desc: 'Memiliki SIO Kemnaker dan mengoperasikan forklift diesel/electric' },
				{ level: 4, desc: 'Mengatur stacking muatan berat bertingkat secara stabil dan aman' },
				{ level: 5, desc: 'Mengaudit keselamatan operasional warehouse dan melatih operator baru' }
			]
		},
		{
			code: 'S02',
			name: 'JSA & HIRADC Risk Assessment',
			aspect: 'Technical Competency',
			defaultCourseId: 'CRS-2026-002',
			indicators: [
				{ level: 1, desc: 'Memahami konsep dasar bahaya (hazard) dan risiko kerja' },
				{ level: 2, desc: 'Mampu mengisi form Job Safety Analysis sederhana di lapangan' },
				{ level: 3, desc: 'Mampu memetakan matriks HIRADC pada rute dan aktivitas logistik' },
				{ level: 4, desc: 'Mengevaluasi efektivitas tindakan pengendalian risiko bahaya' },
				{ level: 5, desc: 'Menetapkan standar keselamatan kerja tingkat korporat' }
			]
		},
		{
			code: 'F01',
			name: 'Budgeting & Cost Control Operasional',
			aspect: 'Technical Competency',
			defaultCourseId: 'CRS-2026-009',
			indicators: [
				{ level: 1, desc: 'Memahami pos pengeluaran operasional dasar dan bukti kas bon' },
				{ level: 2, desc: 'Mampu memverifikasi voucher uang jalan dan struk BBM' },
				{ level: 3, desc: 'Menganalisa efisiensi biaya per kilometer (Cost/Km) rute armada' },
				{ level: 4, desc: 'Menyusun rencana anggaran operasional tahunan unit kerja' },
				{ level: 5, desc: 'Mengendalikan cash flow dan strategi optimasi profit margin' }
			]
		}
	];

	for (const comp of competencies) {
		await sql`
			INSERT INTO hris.lms_competency_library (code, name, aspect, level_indicators, default_course_id)
			VALUES (${comp.code}, ${comp.name}, ${comp.aspect}, ${JSON.stringify(comp.indicators)}::jsonb, ${comp.defaultCourseId})
			ON CONFLICT (code) DO UPDATE SET
				name = EXCLUDED.name,
				aspect = EXCLUDED.aspect,
				level_indicators = EXCLUDED.level_indicators,
				default_course_id = EXCLUDED.default_course_id;
		`;
	}
	console.log(`✓ Seeded ${competencies.length} kompetensi ke library.`);

	// 6. Seed Standar Kompetensi Jabatan (Job Standards)
	const jobStandards = [
		// Driver Tronton / Trailer
		{ pos: 'Pengemudi Truk Berat (Driver Tronton/Trailer)', dept: 'Operations', comp: 'A01', req: 3 },
		{ pos: 'Pengemudi Truk Berat (Driver Tronton/Trailer)', dept: 'Operations', comp: 'A04', req: 4 },
		{ pos: 'Pengemudi Truk Berat (Driver Tronton/Trailer)', dept: 'Operations', comp: 'E06', req: 4 },
		{ pos: 'Pengemudi Truk Berat (Driver Tronton/Trailer)', dept: 'Operations', comp: 'D01', req: 4 },

		// Mekanik & Teknisi Armada
		{ pos: 'Mekanik & Teknisi Armada', dept: 'Workshop & Maintenance', comp: 'A01', req: 3 },
		{ pos: 'Mekanik & Teknisi Armada', dept: 'Workshop & Maintenance', comp: 'A04', req: 3 },
		{ pos: 'Mekanik & Teknisi Armada', dept: 'Workshop & Maintenance', comp: 'E06', req: 3 },
		{ pos: 'Mekanik & Teknisi Armada', dept: 'Workshop & Maintenance', comp: 'M02', req: 4 },

		// Operator Forklift & Staff Gudang
		{ pos: 'Operator Forklift & Staff Gudang', dept: 'Labour Project 1', comp: 'A01', req: 3 },
		{ pos: 'Operator Forklift & Staff Gudang', dept: 'Labour Project 1', comp: 'E06', req: 3 },
		{ pos: 'Operator Forklift & Staff Gudang', dept: 'Labour Project 1', comp: 'W03', req: 3 },

		// Supervisor Finance & Kasir
		{ pos: 'Supervisor Finance & Kasir', dept: 'Finance & Operations', comp: 'A01', req: 4 },
		{ pos: 'Supervisor Finance & Kasir', dept: 'Finance & Operations', comp: 'A04', req: 4 },
		{ pos: 'Supervisor Finance & Kasir', dept: 'Finance & Operations', comp: 'F01', req: 4 },

		// Safety Officer (QHSE)
		{ pos: 'Safety Officer', dept: 'QHSE & Safety', comp: 'A01', req: 4 },
		{ pos: 'Safety Officer', dept: 'QHSE & Safety', comp: 'E06', req: 5 },
		{ pos: 'Safety Officer', dept: 'QHSE & Safety', comp: 'S02', req: 4 }
	];

	for (const js of jobStandards) {
		await sql`
			INSERT INTO hris.lms_job_competencies (position_title, department, competency_code, required_level)
			VALUES (${js.pos}, ${js.dept}, ${js.comp}, ${js.req})
			ON CONFLICT (position_title, competency_code) DO UPDATE SET
				department = EXCLUDED.department,
				required_level = EXCLUDED.required_level;
		`;
	}
	console.log(`✓ Seeded ${jobStandards.length} standar jabatan.`);

	// 7. Seed Asesmen Awal Karyawan (TNA Matrix)
	const employeeAssessments = [
		// Guntoro Muhamad (Driver Tronton/Trailer) -> GAP di E06 Safety Awareness
		{
			payrollId: 'EMP-0042',
			name: 'GUNTORO MUHAMAD',
			pos: 'Pengemudi Truk Berat (Driver Tronton/Trailer)',
			dept: 'Operations',
			comp: 'A01',
			req: 3,
			act: 3,
			status: 'Qualified',
			assessor: 'Hadi Sucipto (Spv Operasional)',
			courseId: null,
			trainingStatus: 'NONE'
		},
		{
			payrollId: 'EMP-0042',
			name: 'GUNTORO MUHAMAD',
			pos: 'Pengemudi Truk Berat (Driver Tronton/Trailer)',
			dept: 'Operations',
			comp: 'E06',
			req: 4,
			act: 2,
			status: 'Gap Competency',
			assessor: 'Hadi Sucipto (Spv Operasional)',
			courseId: 'CRS-2026-001',
			trainingStatus: 'ASSIGNED'
		},
		{
			payrollId: 'EMP-0042',
			name: 'GUNTORO MUHAMAD',
			pos: 'Pengemudi Truk Berat (Driver Tronton/Trailer)',
			dept: 'Operations',
			comp: 'D01',
			req: 4,
			act: 4,
			status: 'Qualified',
			assessor: 'Hadi Sucipto (Spv Operasional)',
			courseId: null,
			trainingStatus: 'NONE'
		},

		// Ahmad Fauzi (Driver Angkutan Berat) -> GAP di D01 Fatigue Mgmt
		{
			payrollId: 'EMP-0012',
			name: 'AHMAD FAUZI',
			pos: 'Pengemudi Truk Berat (Driver Tronton/Trailer)',
			dept: 'Operations',
			comp: 'D01',
			req: 4,
			act: 3,
			status: 'Gap Competency',
			assessor: 'Hadi Sucipto (Spv Operasional)',
			courseId: 'CRS-2026-006',
			trainingStatus: 'ASSIGNED'
		},

		// Rahmadi Irawan (Mekanik Armada) -> GAP di M02 Diagnosa Euro 4
		{
			payrollId: 'EMP-0089',
			name: 'RAHMADI IRAWAN',
			pos: 'Mekanik & Teknisi Armada',
			dept: 'Workshop & Maintenance',
			comp: 'M02',
			req: 4,
			act: 2,
			status: 'Gap Competency',
			assessor: 'Andi Riswanto (Manager Transport)',
			courseId: 'CRS-2026-007',
			trainingStatus: 'ASSIGNED'
		},

		// Joni Pranoto (Operator Forklift) -> GAP di W03 SIO Forklift
		{
			payrollId: 'EMP-0078',
			name: 'JONI PRANOTO',
			pos: 'Operator Forklift & Staff Gudang',
			dept: 'Labour Project 1',
			comp: 'W03',
			req: 3,
			act: 2,
			status: 'Gap Competency',
			assessor: 'Jemian (Supervisor Labour)',
			courseId: 'CRS-2026-008',
			trainingStatus: 'ASSIGNED'
		}
	];

	for (const ea of employeeAssessments) {
		await sql`
			INSERT INTO hris.lms_employee_assessments (
				payroll_id, employee_name, position_title, department,
				competency_code, required_level, actual_level, status,
				assessor_name, assigned_course_id, training_status
			) VALUES (
				${ea.payrollId}, ${ea.name}, ${ea.pos}, ${ea.dept},
				${ea.comp}, ${ea.req}, ${ea.act}, ${ea.status},
				${ea.assessor}, ${ea.courseId}, ${ea.trainingStatus}
			)
			ON CONFLICT (payroll_id, competency_code) DO UPDATE SET
				actual_level = EXCLUDED.actual_level,
				status = EXCLUDED.status,
				assessor_name = EXCLUDED.assessor_name,
				assigned_course_id = EXCLUDED.assigned_course_id,
				training_status = EXCLUDED.training_status;
		`;

		// Jika trainingStatus === 'ASSIGNED', pastikan masuk juga ke hris.lms_enrollments
		if (ea.trainingStatus === 'ASSIGNED' && ea.courseId) {
			await sql`
				INSERT INTO hris.lms_enrollments (
					payroll_id, employee_name, course_id, status, progress_percent,
					completed_modules_count, total_modules_count, enrolled_at, deadline, is_tna_gap, competency_code
				) VALUES (
					${ea.payrollId}, ${ea.name}, ${ea.courseId}, 'ENROLLED', 0,
					0, 3, CURRENT_TIMESTAMP, CURRENT_DATE + INTERVAL '30 days', TRUE, ${ea.comp}
				)
				ON CONFLICT DO NOTHING;
			`;
		}
	}
	console.log(`✓ Seeded ${employeeAssessments.length} asesmen TNA karyawan.`);

	console.log('🎉 Migrasi & Seeding Kamus Kompetensi dan TNA selesai 100%!');
	process.exit(0);
}

migrateCompetencyTNA().catch((err) => {
	console.error('❌ Error migrasi kompetensi TNA:', err);
	process.exit(1);
});
