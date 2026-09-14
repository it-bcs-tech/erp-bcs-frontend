const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL, { connect_timeout: 10 });

async function seed() {
	console.log('🌱 Seeding data LMS yang sinkron dengan bcs-academy-frontend...');

	// 1. Seed Courses
	const courses = [
		{
			id: 'CRS-LOG-001',
			title: 'Defensive Driving & Road Safety Certification',
			category: 'Operations',
			level: 'Mandatory',
			status: 'Published',
			duration_hours: 3.5,
			modules_count: 5,
			enrolled_count: 86,
			completion_rate: 95.0,
			rating: 4.9,
			instructor: 'Capt. Rahmat Hidayat (Head of Safety)',
			description: 'Standar keselamatan berkendara angkutan berat jarak jauh, identifikasi titik buta (blind spot), teknik pengereman beban berat di turunan terjal, dan tanggap darurat kecelakaan.',
			tags: ['Driver', 'K3', 'Mandatory'],
			passing_grade: 80,
			thumbnail_url: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600'
		},
		{
			id: 'CRS-ERP-004',
			title: 'Panduan Operasional Mobile Apps Driver & ERP Core BCS',
			category: 'Digital Systems',
			level: 'Mandatory',
			status: 'Published',
			duration_hours: 1.5,
			modules_count: 3,
			enrolled_count: 110,
			completion_rate: 98.0,
			rating: 4.9,
			instructor: 'Tim IT & Transformasi Digital',
			description: 'Tata cara login aplikasi mobile driver, pembaruan status surat jalan, foto bukti POD (Proof of Delivery), pelaporan kendala rute, dan klaim kasbon uang jalan (UJO).',
			tags: ['All Staff', 'ERP', 'Driver'],
			passing_grade: 75,
			thumbnail_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600'
		},
		{
			id: 'CRS-K3-002',
			title: 'K3 Pergudangan & Penanganan Material B3',
			category: 'QHSE & Safety',
			level: 'Mandatory',
			status: 'Published',
			duration_hours: 2.0,
			modules_count: 4,
			enrolled_count: 54,
			completion_rate: 91.0,
			rating: 4.8,
			instructor: 'Ir. Dewi Lestari, ST (QHSE Manager)',
			description: 'Pedoman keselamatan di gudang logistik, penggunaan APD wajib, identifikasi simbol B3 (MSDS), pengoperasian forklift aman, serta penanganan tumpahan kimia.',
			tags: ['Warehouse', 'B3', 'QHSE'],
			passing_grade: 75,
			thumbnail_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600'
		},
		{
			id: 'CRS-MTC-003',
			title: 'Preventive Maintenance Mesin Truk Diesel Euro 4',
			category: 'Technical',
			level: 'Intermediate',
			status: 'Published',
			duration_hours: 4.0,
			modules_count: 5,
			enrolled_count: 24,
			completion_rate: 85.0,
			rating: 4.7,
			instructor: 'Miswanto (Workshop Head)',
			description: 'SOP perawatan berkala mesin diesel common rail Euro 4, diagnosis kelistrikan, sistem suspensi udara, dan integrasi pengisian tiket Work Order digital.',
			tags: ['Mechanic', 'Maintenance'],
			passing_grade: 80,
			thumbnail_url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600'
		},
		{
			id: 'CRS-LDR-005',
			title: 'Effective Field Leadership & Incident Resolution',
			category: 'Leadership',
			level: 'Advanced',
			status: 'Published',
			duration_hours: 2.5,
			modules_count: 4,
			enrolled_count: 19,
			completion_rate: 88.0,
			rating: 4.6,
			instructor: 'Agus Subroto (Head of Operations)',
			description: 'Kepemimpinan lapangan, manajemen konflik rute pengemudi, teknik negosiasi bongkar muat pelanggan, dan pelaporan SLA pengiriman.',
			tags: ['Supervisor', 'Management'],
			passing_grade: 75,
			thumbnail_url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600'
		}
	];

	for (const c of courses) {
		await sql`
			INSERT INTO hris.lms_courses (
				id, title, category, level, status, duration_hours, modules_count,
				enrolled_count, completion_rate, rating, instructor, description, tags, passing_grade, thumbnail_url
			) VALUES (
				${c.id}, ${c.title}, ${c.category}, ${c.level}, ${c.status}, ${c.duration_hours}, ${c.modules_count},
				${c.enrolled_count}, ${c.completion_rate}, ${c.rating}, ${c.instructor}, ${c.description}, ${c.tags}, ${c.passing_grade}, ${c.thumbnail_url}
			)
			ON CONFLICT (id) DO UPDATE SET
				title = EXCLUDED.title,
				category = EXCLUDED.category,
				level = EXCLUDED.level,
				status = EXCLUDED.status,
				duration_hours = EXCLUDED.duration_hours,
				modules_count = EXCLUDED.modules_count,
				enrolled_count = EXCLUDED.enrolled_count,
				completion_rate = EXCLUDED.completion_rate,
				rating = EXCLUDED.rating,
				instructor = EXCLUDED.instructor,
				description = EXCLUDED.description,
				tags = EXCLUDED.tags,
				passing_grade = EXCLUDED.passing_grade,
				thumbnail_url = EXCLUDED.thumbnail_url;
		`;
	}
	console.log(`✓ ${courses.length} courses seeded`);

	// 2. Seed Modules for CRS-LOG-001
	const modulesLog001 = [
		{ id: 'CRS-LOG-001-M1', course_id: 'CRS-LOG-001', sequence: 1, title: 'Prinsip Dasar Defensive Driving & Titik Buta (Blind Spot)', type: 'VIDEO', duration_text: '25 Menit', content_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', content_body: 'Materi video teknik pandangan jauh ke depan (15 detik), pemindaian kaca spion setiap 5-8 detik, dan pencegahan tabrakan beruntun di tol.' },
		{ id: 'CRS-LOG-001-M2', course_id: 'CRS-LOG-001', sequence: 2, title: 'Pemeriksaan Pra-Jalan (P2H) Kendaraan Berat & Rem Angin', type: 'INTERACTIVE', duration_text: '30 Menit', content_url: '', content_body: 'Checklist wajib P2H: Tekanan ban (110-120 PSI), kondisi selang air brake tidak bocor, level oli mesin Euro 4, dan kelengkapan segitiga pengaman.' },
		{ id: 'CRS-LOG-001-M3', course_id: 'CRS-LOG-001', sequence: 3, title: 'Prosedur Kecepatan Maksimum & Jarak Aman di Jalan Tol', type: 'DOCUMENT', duration_text: '25 Menit', content_url: '', content_body: 'Dokumen SOP: Kecepatan maksimal truk gandeng/tronton di tol adalah 60 km/jam, jarak aman minimal 100 meter pada kecepatan 60 km/jam.' },
		{ id: 'CRS-LOG-001-M4', course_id: 'CRS-LOG-001', sequence: 4, title: 'Penanganan Kondisi Darurat (Rem Blong & Pecah Ban)', type: 'VIDEO', duration_text: '40 Menit', content_url: '', content_body: 'SOP darurat: Jangan rem mendadak saat pecah ban, pertahankan kemudi lurus, lepaskan pedal gas secara bertahap, dan cari jalur penyelamat darurat.' },
		{ id: 'CRS-LOG-001-M5', course_id: 'CRS-LOG-001', sequence: 5, title: 'Evaluasi Akhir & Post-Test Kelulusan', type: 'QUIZ', duration_text: '30 Menit', content_url: '', content_body: 'Kuis akhir untuk menguji kelulusan Defensive Driving. Ambang batas nilai: 80.' }
	];

	for (const m of modulesLog001) {
		await sql`
			INSERT INTO hris.lms_modules (id, course_id, sequence, title, type, duration_text, content_url, content_body)
			VALUES (${m.id}, ${m.course_id}, ${m.sequence}, ${m.title}, ${m.type}, ${m.duration_text}, ${m.content_url}, ${m.content_body})
			ON CONFLICT (id) DO UPDATE SET
				title = EXCLUDED.title,
				type = EXCLUDED.type,
				duration_text = EXCLUDED.duration_text,
				content_url = EXCLUDED.content_url,
				content_body = EXCLUDED.content_body;
		`;
	}

	// 3. Seed Quiz Questions (Pre-Test & Post-Test)
	const questions = [
		{
			course_id: 'CRS-LOG-001',
			module_id: 'CRS-LOG-001-M1',
			quiz_type: 'PRE_TEST',
			question_text: 'Berapa detik sekali seorang pengemudi kendaraan berat disarankan memindai kaca spion saat berkendara di jalan tol?',
			options: JSON.stringify([
				{ key: 'A', text: 'Setiap 2-3 detik' },
				{ key: 'B', text: 'Setiap 5-8 detik' },
				{ key: 'C', text: 'Setiap 20 detik' },
				{ key: 'D', text: 'Hanya saat akan berpindah lajur' }
			]),
			correct_key: 'B',
			explanation: 'Rekomendasi standar Defensive Driving internasional adalah memindai kaca spion setiap 5 hingga 8 detik.'
		},
		{
			course_id: 'CRS-LOG-001',
			module_id: 'CRS-LOG-001-M5',
			quiz_type: 'POST_TEST',
			question_text: 'Apa tindakan pertama yang WAJIB dilakukan pengemudi jika armada tronton mengalami pecah ban depan kanan saat melaju 50 km/jam?',
			options: JSON.stringify([
				{ key: 'A', text: 'Injak pedal rem sekuat tenaga untuk segera berhenti' },
				{ key: 'B', text: 'Tarik rem tangan (handbrake) secara mendadak' },
				{ key: 'C', text: 'Pegang kemudi kuat-kuat agar lurus dan lepaskan gas perlahan, jangan rem mendadak' },
				{ key: 'D', text: 'Putar kemudi ke bahu jalan kiri seketika' }
			]),
			correct_key: 'C',
			explanation: 'Mengerem mendadak saat ban pecah akan menyebabkan rollover / truk terbalik. Pertahankan arah lurus dan kurangi laju bertahap.'
		},
		{
			course_id: 'CRS-LOG-001',
			module_id: 'CRS-LOG-001-M5',
			quiz_type: 'POST_TEST',
			question_text: 'Berapakah batas kecepatan maksimum yang diizinkan untuk armada truk angkutan berat BCS di jalan tol sesuai SOP K3 Perusahaan?',
			options: JSON.stringify([
				{ key: 'A', text: '60 km/jam' },
				{ key: 'B', text: '80 km/jam' },
				{ key: 'C', text: '90 km/jam' },
				{ key: 'D', text: '100 km/jam' }
			]),
			correct_key: 'A',
			explanation: 'SOP Kecepatan Maksimum Armada BCS membatasi kecepatan kendaraan berat pada 60 km/jam demi keselamatan beban dan rem.'
		},
		{
			course_id: 'CRS-LOG-001',
			module_id: 'CRS-LOG-001-M5',
			quiz_type: 'POST_TEST',
			question_text: 'Berapa jarak aman minimal (following distance) yang harus dijaga dari kendaraan di depan saat melaju dengan beban berat?',
			options: JSON.stringify([
				{ key: 'A', text: 'Minimal 20 meter' },
				{ key: 'B', text: 'Minimal 50 meter' },
				{ key: 'C', text: 'Minimal 100 meter (atau aturan 4 detik)' },
				{ key: 'D', text: 'Cukup 1 panjang mobil' }
			]),
			correct_key: 'C',
			explanation: 'Untuk beban berat di atas 20 ton, jarak aman pengereman minimal 100 meter atau rentang waktu 4 detik.'
		}
	];

	await sql`DELETE FROM hris.lms_quiz_questions WHERE course_id = 'CRS-LOG-001'`;
	for (const q of questions) {
		await sql`
			INSERT INTO hris.lms_quiz_questions (course_id, module_id, quiz_type, question_text, options, correct_key, explanation)
			VALUES (${q.course_id}, ${q.module_id}, ${q.quiz_type}, ${q.question_text}, ${q.options}::jsonb, ${q.correct_key}, ${q.explanation});
		`;
	}
	console.log(`✓ ${questions.length} quiz questions seeded`);

	// 4. Seed Training Sessions (Online & Offline)
	const sessions = [
		{
			id: 'TRN-2026-09-01',
			course_id: 'CRS-LOG-001',
			title: 'Defensive Driving Workshop - Batch September 2026',
			trainer: 'Capt. Rahmat Hidayat',
			session_type: 'OFFLINE',
			location_or_link: 'Ruang Aula Training Center - BCS Logistics Center Cilegon',
			session_date: '2026-09-25',
			start_time: '08:30',
			end_time: '12:00',
			target_role: 'Driver Tronton & Trailer',
			quota: 35,
			enrolled_count: 28,
			status: 'SCHEDULED'
		},
		{
			id: 'TRN-2026-09-02',
			course_id: 'CRS-ERP-004',
			title: 'Sosialisasi Fitur e-DO Mobile & Live Tracking Driver',
			trainer: 'Tim IT Transformasi Digital (Bpk. Andre)',
			session_type: 'ONLINE',
			location_or_link: 'https://meet.google.com/bcs-academy-edo',
			session_date: '2026-09-28',
			start_time: '14:00',
			end_time: '16:00',
			target_role: 'Seluruh Driver & Petugas Checker',
			quota: 100,
			enrolled_count: 74,
			status: 'SCHEDULED'
		},
		{
			id: 'TRN-2026-09-03',
			course_id: 'CRS-K3-002',
			title: 'Simulasi Tanggap Darurat Tumpahan Material B3 & Pemadaman APAR',
			trainer: 'Ir. Dewi Lestari, ST (QHSE)',
			session_type: 'OFFLINE',
			location_or_link: 'Halaman Workshop & Gudang B3 Gerem Cilegon',
			session_date: '2026-10-05',
			start_time: '09:00',
			end_time: '11:30',
			target_role: 'Staff Gudang & Leader K3',
			quota: 25,
			enrolled_count: 22,
			status: 'SCHEDULED'
		}
	];

	for (const s of sessions) {
		await sql`
			INSERT INTO hris.lms_sessions (
				id, course_id, title, trainer, session_type, location_or_link, session_date,
				start_time, end_time, target_role, quota, enrolled_count, status
			) VALUES (
				${s.id}, ${s.course_id}, ${s.title}, ${s.trainer}, ${s.session_type}, ${s.location_or_link}, ${s.session_date},
				${s.start_time}, ${s.end_time}, ${s.target_role}, ${s.quota}, ${s.enrolled_count}, ${s.status}
			)
			ON CONFLICT (id) DO UPDATE SET
				title = EXCLUDED.title,
				trainer = EXCLUDED.trainer,
				session_type = EXCLUDED.session_type,
				location_or_link = EXCLUDED.location_or_link,
				session_date = EXCLUDED.session_date,
				target_role = EXCLUDED.target_role,
				quota = EXCLUDED.quota,
				enrolled_count = EXCLUDED.enrolled_count;
		`;
	}
	console.log(`✓ ${sessions.length} training sessions seeded`);

	// 5. Seed Attendances for TRN-2026-09-01
	const attendances = [
		{ session_id: 'TRN-2026-09-01', payroll_id: 'EMP-0042', employee_name: 'GUNTORO MUHAMAD', department: 'Operations / Driver', status: 'HADIR', notes: 'Hadir tepat waktu, aktif simulasi P2H' },
		{ session_id: 'TRN-2026-09-01', payroll_id: 'EMP-0112', employee_name: 'BAMBANG HERMAWAN', department: 'Operations / Driver', status: 'HADIR', notes: 'Hadir, kelengkapan APD lengkap' },
		{ session_id: 'TRN-2026-09-01', payroll_id: 'EMP-0089', employee_name: 'SURYA WIJAYA', department: 'Operations / Driver', status: 'IZIN', notes: 'Penugasan trip darurat ke Merak' },
		{ session_id: 'TRN-2026-09-01', payroll_id: 'EMP-0145', employee_name: 'DEDI SETIAWAN', department: 'Operations / Driver', status: 'HADIR', notes: 'Lulus pre-test 85' }
	];

	for (const a of attendances) {
		await sql`
			INSERT INTO hris.lms_session_attendances (session_id, payroll_id, employee_name, department, status, notes)
			VALUES (${a.session_id}, ${a.payroll_id}, ${a.employee_name}, ${a.department}, ${a.status}, ${a.notes});
		`;
	}
	console.log(`✓ ${attendances.length} session attendances seeded`);

	// 6. Seed Kirkpatrick Level 1 (Reaction)
	const evalL1 = [
		{
			course_id: 'CRS-LOG-001',
			payroll_id: 'EMP-0042',
			employee_name: 'GUNTORO MUHAMAD',
			content_rating: 5,
			instructor_rating: 5,
			facility_rating: 4,
			recommendation_rating: 5,
			feedback_notes: 'Penjelasan titik buta dan studi kasus rem blong sangat bermanfaat untuk rute tanjakan Cilegon-Merak.'
		},
		{
			course_id: 'CRS-ERP-004',
			payroll_id: 'EMP-0112',
			employee_name: 'BAMBANG HERMAWAN',
			content_rating: 5,
			instructor_rating: 4,
			facility_rating: 5,
			recommendation_rating: 5,
			feedback_notes: 'Aplikasi e-DO mempermudah proses upload bukti timbang tanpa harus bolak-balik ke pool.'
		}
	];

	for (const e of evalL1) {
		await sql`
			INSERT INTO hris.lms_evaluations_l1 (
				course_id, payroll_id, employee_name, content_rating, instructor_rating,
				facility_rating, recommendation_rating, feedback_notes
			) VALUES (
				${e.course_id}, ${e.payroll_id}, ${e.employee_name}, ${e.content_rating}, ${e.instructor_rating},
				${e.facility_rating}, ${e.recommendation_rating}, ${e.feedback_notes}
			);
		`;
	}
	console.log(`✓ ${evalL1.length} Kirkpatrick L1 evaluations seeded`);

	// 7. Seed Kirkpatrick Level 3 & 4 (Review Atasan H+3 Bulan)
	const evalL3L4 = [
		{
			course_id: 'CRS-LOG-001',
			payroll_id: 'EMP-0042',
			employee_name: 'GUNTORO MUHAMAD',
			supervisor_name: 'Hadi Sucipto (Supervisor Operasional)',
			due_date: '2026-11-22',
			status: 'PENDING',
			behavior_score: null,
			sop_compliance_score: null,
			business_impact_score: null,
			incident_reduction_notes: null,
			supervisor_notes: null
		},
		{
			course_id: 'CRS-ERP-004',
			payroll_id: 'EMP-0112',
			employee_name: 'BAMBANG HERMAWAN',
			supervisor_name: 'Hadi Sucipto (Supervisor Operasional)',
			due_date: '2026-09-10',
			status: 'COMPLETED',
			behavior_score: 5,
			sop_compliance_score: 5,
			business_impact_score: 4,
			incident_reduction_notes: 'Kepatuhan upload POD tepat waktu mencapai 100%, klaim selisih muatan nihil selama 3 bulan.',
			supervisor_notes: 'Driver sangat disiplin menggunakan modul aplikasi di lapangan.',
			reviewed_at: '2026-09-11 10:30:00'
		}
	];

	for (const e of evalL3L4) {
		await sql`
			INSERT INTO hris.lms_evaluations_l3_l4 (
				course_id, payroll_id, employee_name, supervisor_name, due_date, status,
				behavior_score, sop_compliance_score, business_impact_score, incident_reduction_notes,
				supervisor_notes, reviewed_at
			) VALUES (
				${e.course_id}, ${e.payroll_id}, ${e.employee_name}, ${e.supervisor_name}, ${e.due_date}, ${e.status},
				${e.behavior_score}, ${e.sop_compliance_score}, ${e.business_impact_score}, ${e.incident_reduction_notes},
				${e.supervisor_notes}, ${e.reviewed_at ? sql`${e.reviewed_at}::timestamp` : null}
			);
		`;
	}
	console.log(`✓ ${evalL3L4.length} Kirkpatrick L3/L4 evaluations seeded`);

	// 8. Seed Training by Request
	const requests = [
		{
			id: 'REQ-TRN-001',
			dept_name: 'Workshop & Maintenance',
			requested_by: 'Miswanto (Head of Workshop)',
			training_title: 'Sertifikasi Kalibrasi Injector Common Rail Bosch Euro 4',
			category: 'Technical',
			urgency: 'HIGH',
			estimated_participants: 6,
			target_completion_date: '2026-10-30',
			justification: 'Armada baru Euro 4 membutuhkan penanganan kalibrasi injector internal untuk memangkas biaya perbaikan pihak ketiga.',
			status: 'PENDING_HRD'
		},
		{
			id: 'REQ-TRN-002',
			dept_name: 'Operations & Dispatch',
			requested_by: 'Agus Subroto (Operations Head)',
			training_title: 'Pelatihan Sertifikasi Petugas Muatan B3 (Dangerous Goods Logistik)',
			category: 'QHSE & Safety',
			urgency: 'CRITICAL',
			estimated_participants: 12,
			target_completion_date: '2026-10-15',
			justification: 'Syarat kepatuhan audit kustomer industri kimia PT Chandra Asri & Krakatau Steel.',
			status: 'APPROVED'
		}
	];

	for (const r of requests) {
		await sql`
			INSERT INTO hris.lms_training_requests (
				id, dept_name, requested_by, training_title, category, urgency,
				estimated_participants, target_completion_date, justification, status
			) VALUES (
				${r.id}, ${r.dept_name}, ${r.requested_by}, ${r.training_title}, ${r.category}, ${r.urgency},
				${r.estimated_participants}, ${r.target_completion_date}, ${r.justification}, ${r.status}
			)
			ON CONFLICT (id) DO UPDATE SET
				training_title = EXCLUDED.training_title,
				status = EXCLUDED.status,
				urgency = EXCLUDED.urgency;
		`;
	}
	console.log(`✓ ${requests.length} training requests seeded`);

	// 9. Seed Official Certificates (Matching bcs-academy-frontend)
	const certificates = [
		{
			certificate_number: 'CERT-BCS-2026-0889',
			payroll_id: 'EMP-0042',
			employee_name: 'GUNTORO MUHAMAD',
			course_id: 'CRS-ERP-004',
			course_title: 'Panduan Operasional Mobile Apps Driver & ERP Core BCS',
			category: 'Digital Systems',
			score: 95.0,
			issued_at: '2026-08-22 15:30:00',
			valid_until: '2028-08-22 15:30:00',
			qr_verify_url: 'https://academy.bcslabs.tech/verify/CERT-BCS-2026-0889'
		},
		{
			certificate_number: 'CERT-BCS-2026-0892',
			payroll_id: 'EMP-0112',
			employee_name: 'BAMBANG HERMAWAN',
			course_id: 'CRS-LOG-001',
			course_title: 'Defensive Driving & Road Safety Certification',
			category: 'Operations',
			score: 92.0,
			issued_at: '2026-08-29 11:00:00',
			valid_until: '2027-08-29 11:00:00',
			qr_verify_url: 'https://academy.bcslabs.tech/verify/CERT-BCS-2026-0892'
		}
	];

	for (const cert of certificates) {
		await sql`
			INSERT INTO hris.lms_certificates (
				certificate_number, payroll_id, employee_name, course_id, course_title,
				category, score, issued_at, valid_until, qr_verify_url
			) VALUES (
				${cert.certificate_number}, ${cert.payroll_id}, ${cert.employee_name}, ${cert.course_id}, ${cert.course_title},
				${cert.category}, ${cert.score}, ${cert.issued_at}::timestamp, ${cert.valid_until}::timestamp, ${cert.qr_verify_url}
			)
			ON CONFLICT (certificate_number) DO UPDATE SET
				score = EXCLUDED.score,
				issued_at = EXCLUDED.issued_at;
		`;
	}
	console.log(`✓ ${certificates.length} certificates seeded`);

	console.log('🎉 Seeding LMS selesai sukses!');
	process.exit(0);
}

seed().catch((err) => {
	console.error('❌ Error seeding LMS:', err);
	process.exit(1);
});
