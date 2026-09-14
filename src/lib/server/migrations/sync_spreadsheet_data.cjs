const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL, { connect_timeout: 10 });

async function updateSchema() {
	console.log('🚀 Memperbarui skema hris.lms_* sesuai spreadsheet Project LMS...');

	await sql`
		ALTER TABLE hris.lms_courses 
		ADD COLUMN IF NOT EXISTS based VARCHAR(50) DEFAULT 'Mandatory',
		ADD COLUMN IF NOT EXISTS trainer_type VARCHAR(50) DEFAULT 'Internal',
		ADD COLUMN IF NOT EXISTS cost_trainer NUMERIC(12, 2) DEFAULT 500000,
		ADD COLUMN IF NOT EXISTS cost_trainee NUMERIC(12, 2) DEFAULT 0,
		ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Operations';
	`;
	console.log('✓ Columns added to hris.lms_courses');

	await sql`
		ALTER TABLE hris.lms_sessions 
		ADD COLUMN IF NOT EXISTS based VARCHAR(50) DEFAULT 'Mandatory',
		ADD COLUMN IF NOT EXISTS trainer_type VARCHAR(50) DEFAULT 'Internal',
		ADD COLUMN IF NOT EXISTS cost_trainer NUMERIC(12, 2) DEFAULT 500000,
		ADD COLUMN IF NOT EXISTS cost_trainee NUMERIC(12, 2) DEFAULT 0,
		ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Operations';
	`;
	console.log('✓ Columns added to hris.lms_sessions');

	// Real 2026 Training Courses from Spreadsheet Sheet 55970937 & 636429620
	const realCourses = [
		{
			id: 'CRS-2026-001',
			title: 'Re-Induksi Keselamatan & Standard Working Procedure (SWP)',
			category: 'Safety',
			based: 'Mandatory',
			level: 'Mandatory',
			status: 'Published',
			duration_hours: 2.0,
			modules_count: 3,
			enrolled_count: 35,
			completion_rate: 98.0,
			rating: 4.9,
			instructor: 'Syarochman (Safety Officer)',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'Project 4 & Operasional',
			description: 'Re-induksi wajib bagi seluruh personel operasional lapangan mengenai Standar Keselamatan Kerja BCS, identifikasi bahaya rute, dan APD wajib.',
			tags: ['Safety', 'Mandatory', 'SWP'],
			passing_grade: 80,
			thumbnail_url: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600'
		},
		{
			id: 'CRS-2026-002',
			title: 'JSA (Job Safety Analysis) & HIRADC Transportasi Logistik',
			category: 'Safety',
			based: 'Mandatory',
			level: 'Mandatory',
			status: 'Published',
			duration_hours: 2.0,
			modules_count: 4,
			enrolled_count: 41,
			completion_rate: 94.0,
			rating: 4.8,
			instructor: 'Firman Fadholi (Supervisor QHSE)',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'All Dept',
			description: 'Metodologi penyusunan Job Safety Analysis (JSA) dan matriks Hazard Identification, Risk Assessment, and Determining Control (HIRADC) untuk operasional logistik.',
			tags: ['HIRADC', 'JSA', 'QHSE'],
			passing_grade: 75,
			thumbnail_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600'
		},
		{
			id: 'CRS-2026-003',
			title: 'Material Safety Data Sheet (MSDS) & Penanganan Material B3',
			category: 'Safety',
			based: 'Mandatory',
			level: 'Intermediate',
			status: 'Published',
			duration_hours: 2.0,
			modules_count: 3,
			enrolled_count: 24,
			completion_rate: 92.0,
			rating: 4.8,
			instructor: 'Firman Fadholi (Supervisor QHSE)',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'All Dept',
			description: 'Pemahaman lembar MSDS bahan kimia industri, penggunaan spill kit penanganan ceceran B3, dan tanggap darurat kecelakaan bahan berbahaya.',
			tags: ['B3', 'MSDS', 'Safety'],
			passing_grade: 80,
			thumbnail_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600'
		},
		{
			id: 'CRS-2026-004',
			title: 'Basic First Aid (Pertolongan Pertama Pada Kecelakaan / P3K)',
			category: 'Safety',
			based: 'Mandatory',
			level: 'Beginner',
			status: 'Published',
			duration_hours: 2.0,
			modules_count: 3,
			enrolled_count: 28,
			completion_rate: 96.0,
			rating: 4.9,
			instructor: 'Dr. Zaenul Abidin (Dokter Perusahaan)',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'All Dept',
			description: 'Teknik dasar Bantuan Hidup Dasar (BHD), CPR, penanganan patah tulang, luka bakar, dan evakuasi korban kecelakaan di perjalanan angkutan barang.',
			tags: ['P3K', 'First Aid', 'Medis'],
			passing_grade: 75,
			thumbnail_url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600'
		},
		{
			id: 'CRS-2026-005',
			title: 'Fire Drill, APAR & Fire Management Lapangan',
			category: 'Safety',
			based: 'Mandatory',
			level: 'Beginner',
			status: 'Published',
			duration_hours: 2.0,
			modules_count: 3,
			enrolled_count: 30,
			completion_rate: 95.0,
			rating: 4.9,
			instructor: 'Syarochman / Firman Fadholi',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'Operations',
			description: 'Prinsip segitiga api, teknik pemadaman api menggunakan APAR (Tarik-Arahkan-Tekan-Sapukan), simulasi fire drill di area pool dan gudang.',
			tags: ['APAR', 'Fire Drill', 'Safety'],
			passing_grade: 80,
			thumbnail_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600'
		},
		{
			id: 'CRS-2026-006',
			title: 'Refreshment Fatigue Management & Jam Kerja Aman Driver',
			category: 'Safety',
			based: 'Additional',
			level: 'Intermediate',
			status: 'Published',
			duration_hours: 2.0,
			modules_count: 3,
			enrolled_count: 18,
			completion_rate: 90.0,
			rating: 4.7,
			instructor: 'Firman Fadholi / Asep / Maya',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'Driver & Transport',
			description: 'Manajemen kelelahan pengemudi jarak jauh, siklus sirkadian tubuh, batasan waktu berkendara maksimal 4 jam, dan prosedur rest area aman.',
			tags: ['Driver', 'Fatigue', 'K3'],
			passing_grade: 75,
			thumbnail_url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600'
		},
		{
			id: 'CRS-2026-007',
			title: 'Machine Troubleshooting & Preventive Maintenance Euro 4',
			category: 'Technical Skill',
			based: 'Gap Competency',
			level: 'Advanced',
			status: 'Published',
			duration_hours: 4.0,
			modules_count: 4,
			enrolled_count: 16,
			completion_rate: 87.0,
			rating: 4.8,
			instructor: 'Rahmadi Irawan (Head Mechanic) / Jayusman',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'Maintenance & Asset',
			description: 'Diagnostik injeksi common rail mesin Euro 4, pemeliharaan sistem suspensi udara dan rem angin tronton, serta pengisian digital Work Order.',
			tags: ['Mekanik', 'Euro 4', 'Troubleshooting'],
			passing_grade: 80,
			thumbnail_url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600'
		},
		{
			id: 'CRS-2026-008',
			title: 'Sertifikasi Operator SIO Forklift Kelas 2 (Kemnaker)',
			category: 'Technical Skill',
			based: 'Additional',
			level: 'Advanced',
			status: 'Published',
			duration_hours: 24.0,
			modules_count: 5,
			enrolled_count: 6,
			completion_rate: 100.0,
			rating: 5.0,
			instructor: 'Lembaga Sertifikasi K3 Eksternal',
			trainer_type: 'Eksternal',
			cost_trainer: 3000000,
			cost_trainee: 1500000,
			department: 'Labour Project 1 & Warehouse',
			description: 'Pelatihan dan uji kompetensi lisensi K3 Surat Izin Operator (SIO) Forklift resmi Kementerian Ketenagakerjaan RI.',
			tags: ['SIO', 'Forklift', 'Kemnaker', 'Eksternal'],
			passing_grade: 85,
			thumbnail_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600'
		},
		{
			id: 'CRS-2026-009',
			title: 'Finance for Non-Finance & Plan Monitoring Anggaran Operasional',
			category: 'Soft Skill',
			based: 'Additional',
			level: 'Intermediate',
			status: 'Published',
			duration_hours: 3.0,
			modules_count: 3,
			enrolled_count: 12,
			completion_rate: 91.0,
			rating: 4.7,
			instructor: 'Arnaja (Manager Finance) / Suhendar',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'Procurement & Warehouse',
			description: 'Pemahaman laporan keuangan dasar, cash flow operasional armada, efisiensi anggaran UJO, dan monitoring budget departemen.',
			tags: ['Finance', 'Budgeting', 'Monitoring'],
			passing_grade: 75,
			thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600'
		},
		{
			id: 'CRS-2026-010',
			title: 'Training of Trainer (ToT) Level 3 Badan Nasional Sertifikasi Profesi',
			category: 'Soft Skill',
			based: 'Additional',
			level: 'Advanced',
			status: 'Published',
			duration_hours: 16.0,
			modules_count: 4,
			enrolled_count: 8,
			completion_rate: 98.0,
			rating: 4.9,
			instructor: 'Jayusman / Ikhnaton (Manager QHSE)',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'Operations & Safety',
			description: 'Pengembangan kemampuan metodologi pelatihan instruktur internal, penyusunan silabus kurikulum, dan teknik presentasi efektif.',
			tags: ['ToT', 'BNSP', 'Trainer'],
			passing_grade: 80,
			thumbnail_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600'
		}
	];

	for (const c of realCourses) {
		await sql`
			INSERT INTO hris.lms_courses (
				id, title, category, based, level, status, duration_hours, modules_count,
				enrolled_count, completion_rate, rating, instructor, trainer_type, cost_trainer,
				cost_trainee, department, description, tags, passing_grade, thumbnail_url
			) VALUES (
				${c.id}, ${c.title}, ${c.category}, ${c.based}, ${c.level}, ${c.status}, ${c.duration_hours}, ${c.modules_count},
				${c.enrolled_count}, ${c.completion_rate}, ${c.rating}, ${c.instructor}, ${c.trainer_type}, ${c.cost_trainer},
				${c.cost_trainee}, ${c.department}, ${c.description}, ${c.tags}, ${c.passing_grade}, ${c.thumbnail_url}
			)
			ON CONFLICT (id) DO UPDATE SET
				title = EXCLUDED.title,
				category = EXCLUDED.category,
				based = EXCLUDED.based,
				level = EXCLUDED.level,
				status = EXCLUDED.status,
				duration_hours = EXCLUDED.duration_hours,
				modules_count = EXCLUDED.modules_count,
				enrolled_count = EXCLUDED.enrolled_count,
				completion_rate = EXCLUDED.completion_rate,
				rating = EXCLUDED.rating,
				instructor = EXCLUDED.instructor,
				trainer_type = EXCLUDED.trainer_type,
				cost_trainer = EXCLUDED.cost_trainer,
				cost_trainee = EXCLUDED.cost_trainee,
				department = EXCLUDED.department,
				description = EXCLUDED.description,
				tags = EXCLUDED.tags,
				passing_grade = EXCLUDED.passing_grade,
				thumbnail_url = EXCLUDED.thumbnail_url;
		`;

		// Ensure basic module exists for player
		await sql`
			INSERT INTO hris.lms_modules (id, course_id, sequence, title, type, duration_text, content_body)
			VALUES
				(${`${c.id}-M1`}, ${c.id}, 1, 'Pengenalan & Regulasi Utama', 'VIDEO', '30 Menit', ${`Materi video pengantar resmi mengenai: ${c.title}`}),
				(${`${c.id}-M2`}, ${c.id}, 2, 'Standar Operasional Prosedur (SOP)', 'DOCUMENT', '30 Menit', ${`Dokumen SOP tertulis PT Buana Centra Swakarsa Logistics terkait: ${c.title}`}),
				(${`${c.id}-M3`}, ${c.id}, 3, 'Evaluasi Akhir & Post-Test', 'QUIZ', '20 Menit', 'Ujian kelulusan materi.')
			ON CONFLICT (id) DO NOTHING;
		`;

		// Ensure pre & post test questions exist
		await sql`
			INSERT INTO hris.lms_quiz_questions (course_id, module_id, quiz_type, question_text, options, correct_key, explanation)
			VALUES
				(${c.id}, ${`${c.id}-M1`}, 'PRE_TEST', ${`Apakah Anda telah memahami dasar kepatuhan terkait ${c.title}?`},
				'[{"key":"A","text":"Sangat Paham"},{"key":"B","text":"Cukup Paham"},{"key":"C","text":"Belum Paham"}]'::jsonb, 'A', 'Evaluasi orientasi awal.'),
				(${c.id}, ${`${c.id}-M3`}, 'POST_TEST', ${`Tindakan utama yang harus dipatuhi sesuai standar ${c.title} adalah:`},
				'[{"key":"A","text":"Kepatuhan pada SOP, K3 & Zero Incident"},{"key":"B","text":"Mempersingkat rute tanpa izin"},{"key":"C","text":"Mengabaikan alat pelindung"}]'::jsonb, 'A', 'SOP mengutamakan keselamatan kerja.')
			ON CONFLICT DO NOTHING;
		`;
	}

	console.log(`🎉 Berhasil memasukkan ${realCourses.length} kursus riil 2026 PT BCS Logistics!`);
	process.exit(0);
}

updateSchema().catch((err) => {
	console.error('❌ Error update schema:', err);
	process.exit(1);
});
