const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL, { connect_timeout: 10 });

async function seedReportsData() {
	console.log('🚀 Seeding realistic sessions, attendances, and evaluations from spreadsheet...');

	const sessions = [
		{
			id: 'TRN-2026-01-01',
			course_id: 'CRS-2026-001',
			title: 'Re-Induksi Keselamatan & SWP Batch 1 (Project 4)',
			trainer: 'Syarochman',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'Project 4',
			based: 'Mandatory',
			session_type: 'OFFLINE',
			location_or_link: 'Aula Safety Training BCS Cilegon',
			session_date: '2026-01-15',
			start_time: '08:30',
			end_time: '10:30',
			target_role: 'Driver & Kru Operasional',
			quota: 35,
			enrolled_count: 35,
			status: 'COMPLETED'
		},
		{
			id: 'TRN-2026-02-01',
			course_id: 'CRS-2026-001',
			title: 'Refreshment Standard Working Procedure (SWP)',
			trainer: 'Syarochman',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'Project 4',
			based: 'Mandatory',
			session_type: 'OFFLINE',
			location_or_link: 'Ruang Briefing Pool Cilegon',
			session_date: '2026-02-10',
			start_time: '09:00',
			end_time: '11:00',
			target_role: 'Driver Tronton & Trailer',
			quota: 28,
			enrolled_count: 28,
			status: 'COMPLETED'
		},
		{
			id: 'TRN-2026-03-01',
			course_id: 'CRS-2026-002',
			title: 'JSA (Job Safety Analysis) & HIRADC Logistik',
			trainer: 'Firman Fadholi',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'All Dept',
			based: 'Mandatory',
			session_type: 'OFFLINE',
			location_or_link: 'Ruang Meeting Utama Lantai 2',
			session_date: '2026-03-12',
			start_time: '08:30',
			end_time: '11:30',
			target_role: 'Foreman, Spv, & Safety Officer',
			quota: 41,
			enrolled_count: 41,
			status: 'COMPLETED'
		},
		{
			id: 'TRN-2026-04-01',
			course_id: 'CRS-2026-004',
			title: 'Basic First Aid (P3K Lapangan & CPR Terapan)',
			trainer: 'Dr. Zaenul Abidin',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'All Dept',
			based: 'Mandatory',
			session_type: 'OFFLINE',
			location_or_link: 'Klinik Kesehatan PT BCS',
			session_date: '2026-04-18',
			start_time: '09:00',
			end_time: '12:00',
			target_role: 'Kru Lapangan & Staff Gudang',
			quota: 28,
			enrolled_count: 28,
			status: 'COMPLETED'
		},
		{
			id: 'TRN-2026-05-01',
			course_id: 'CRS-2026-006',
			title: 'Refreshment Fatigue Management & Driver Wellness',
			trainer: 'Firman Fadholi',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'Driver',
			based: 'Additional',
			session_type: 'OFFLINE',
			location_or_link: 'Rest Area & Training Center Pool B',
			session_date: '2026-05-20',
			start_time: '13:30',
			end_time: '15:30',
			target_role: 'Driver Angkutan Berat',
			quota: 18,
			enrolled_count: 18,
			status: 'COMPLETED'
		},
		{
			id: 'TRN-2026-06-01',
			course_id: 'CRS-2026-008',
			title: 'Sertifikasi SIO Operator Forklift Kelas 2 Kemnaker',
			trainer: 'Bambang Suryono (Lembaga Eksternal)',
			trainer_type: 'Eksternal',
			cost_trainer: 3000000,
			cost_trainee: 0,
			department: 'Labour Project 1',
			based: 'Additional',
			session_type: 'OFFLINE',
			location_or_link: 'Warehouse Cikande & Training Center Kemnaker',
			session_date: '2026-06-15',
			start_time: '08:00',
			end_time: '17:00',
			target_role: 'Operator Forklift & Gudang',
			quota: 10,
			enrolled_count: 10,
			status: 'COMPLETED'
		},
		{
			id: 'TRN-2026-07-01',
			course_id: 'CRS-2026-007',
			title: 'Diagnosa Mesin Diesel Euro 4 Common Rail & EMS',
			trainer: 'Andi Riswanto',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'Transport (Maintenance & Asset)',
			based: 'Gap Competency',
			session_type: 'OFFLINE',
			location_or_link: 'Workshop Armada Pusat Cilegon',
			session_date: '2026-07-22',
			start_time: '09:00',
			end_time: '12:00',
			target_role: 'Mekanik & Teknisi Armada',
			quota: 15,
			enrolled_count: 14,
			status: 'COMPLETED'
		},
		{
			id: 'TRN-2026-08-01',
			course_id: 'CRS-2026-003',
			title: 'Material Safety Data Sheet (MSDS) & Spill Kit B3',
			trainer: 'Firman Fadholi',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'All Dept',
			based: 'Mandatory',
			session_type: 'OFFLINE',
			location_or_link: 'Gudang Material B3 & Workshop',
			session_date: '2026-08-14',
			start_time: '09:00',
			end_time: '11:00',
			target_role: 'Mekanik, Driver Kimia, & Foreman',
			quota: 25,
			enrolled_count: 24,
			status: 'COMPLETED'
		},
		{
			id: 'TRN-2026-09-04',
			course_id: 'CRS-2026-005',
			title: 'Fire Drill, APAR & Emergency Response Drill',
			trainer: 'Syarochman',
			trainer_type: 'Internal',
			cost_trainer: 500000,
			cost_trainee: 0,
			department: 'Project 4',
			based: 'Mandatory',
			session_type: 'OFFLINE',
			location_or_link: 'Lapangan Terbuka Pool Cilegon',
			session_date: '2026-09-29',
			start_time: '09:00',
			end_time: '11:30',
			target_role: 'All Operational Staff',
			quota: 30,
			enrolled_count: 18,
			status: 'SCHEDULED'
		}
	];

	for (const s of sessions) {
		await sql`
			INSERT INTO hris.lms_sessions (
				id, course_id, title, trainer, trainer_type, cost_trainer, cost_trainee,
				department, based, session_type, location_or_link, session_date,
				start_time, end_time, target_role, quota, enrolled_count, status
			) VALUES (
				${s.id}, ${s.course_id}, ${s.title}, ${s.trainer}, ${s.trainer_type},
				${s.cost_trainer}, ${s.cost_trainee}, ${s.department}, ${s.based},
				${s.session_type}, ${s.location_or_link}, ${s.session_date},
				${s.start_time}, ${s.end_time}, ${s.target_role}, ${s.quota},
				${s.enrolled_count}, ${s.status}
			)
			ON CONFLICT (id) DO UPDATE SET
				course_id = EXCLUDED.course_id,
				title = EXCLUDED.title,
				trainer = EXCLUDED.trainer,
				trainer_type = EXCLUDED.trainer_type,
				cost_trainer = EXCLUDED.cost_trainer,
				cost_trainee = EXCLUDED.cost_trainee,
				department = EXCLUDED.department,
				based = EXCLUDED.based,
				session_type = EXCLUDED.session_type,
				location_or_link = EXCLUDED.location_or_link,
				session_date = EXCLUDED.session_date,
				start_time = EXCLUDED.start_time,
				end_time = EXCLUDED.end_time,
				target_role = EXCLUDED.target_role,
				quota = EXCLUDED.quota,
				enrolled_count = EXCLUDED.enrolled_count,
				status = EXCLUDED.status;
		`;
	}
	console.log(`✓ Seeded ${sessions.length} sessions`);

	// Seed Sample Attendances
	const attendees = [
		{ sessionId: 'TRN-2026-01-01', payrollId: 'EMP-0012', name: 'AHMAD FAUZI', dept: 'Project 4', status: 'HADIR' },
		{ sessionId: 'TRN-2026-01-01', payrollId: 'EMP-0024', name: 'BAMBANG HERMANTO', dept: 'Project 4', status: 'HADIR' },
		{ sessionId: 'TRN-2026-01-01', payrollId: 'EMP-0035', name: 'DEDI SURYADI', dept: 'Project 4', status: 'HADIR' },
		{ sessionId: 'TRN-2026-01-01', payrollId: 'EMP-0042', name: 'GUNTORO MUHAMAD', dept: 'Project 4', status: 'HADIR' },
		{ sessionId: 'TRN-2026-02-01', payrollId: 'EMP-0042', name: 'GUNTORO MUHAMAD', dept: 'Project 4', status: 'HADIR' },
		{ sessionId: 'TRN-2026-02-01', payrollId: 'EMP-0056', name: 'HENDRA WIJAYA', dept: 'Project 4', status: 'HADIR' },
		{ sessionId: 'TRN-2026-03-01', payrollId: 'EMP-0042', name: 'GUNTORO MUHAMAD', dept: 'Operasional', status: 'HADIR' },
		{ sessionId: 'TRN-2026-03-01', payrollId: 'EMP-0067', name: 'IRWAN SETIAWAN', dept: 'Transport', status: 'HADIR' },
		{ sessionId: 'TRN-2026-04-01', payrollId: 'EMP-0042', name: 'GUNTORO MUHAMAD', dept: 'Operasional', status: 'HADIR' },
		{ sessionId: 'TRN-2026-04-01', payrollId: 'EMP-0078', name: 'JONI PRANOTO', dept: 'Gudang', status: 'HADIR' },
		{ sessionId: 'TRN-2026-05-01', payrollId: 'EMP-0012', name: 'AHMAD FAUZI', dept: 'Driver', status: 'HADIR' },
		{ sessionId: 'TRN-2026-05-01', payrollId: 'EMP-0035', name: 'DEDI SURYADI', dept: 'Driver', status: 'HADIR' },
		{ sessionId: 'TRN-2026-07-01', payrollId: 'EMP-0089', name: 'RAHMADI IRAWAN', dept: 'Workshop & Maintenance', status: 'HADIR' },
		{ sessionId: 'TRN-2026-07-01', payrollId: 'EMP-0091', name: 'SUBANDI', dept: 'Workshop & Maintenance', status: 'HADIR' },
		{ sessionId: 'TRN-2026-08-01', payrollId: 'EMP-0042', name: 'GUNTORO MUHAMAD', dept: 'Operasional', status: 'HADIR' },
		{ sessionId: 'TRN-2026-08-01', payrollId: 'EMP-0089', name: 'RAHMADI IRAWAN', dept: 'Workshop & Maintenance', status: 'HADIR' }
	];

	for (const a of attendees) {
		await sql`
			INSERT INTO hris.lms_session_attendances (
				session_id, payroll_id, employee_name, department, status, attended_at, notes
			) VALUES (
				${a.sessionId}, ${a.payrollId}, ${a.name}, ${a.dept}, ${a.status}, CURRENT_TIMESTAMP - INTERVAL '10 days', 'Hadir tepat waktu & mengikuti sesi hingga selesai'
			);
		`;
	}
	console.log(`✓ Seeded ${attendees.length} attendances`);

	// Seed Kirkpatrick Level 1 Evaluations
	const evalL1 = [
		{ courseId: 'CRS-2026-001', payrollId: 'EMP-0042', name: 'GUNTORO MUHAMAD', content: 5, instructor: 5, facility: 4, rec: 5, notes: 'Materi SWP sangat jelas dan langsung diaplikasikan di lapangan.' },
		{ courseId: 'CRS-2026-002', payrollId: 'EMP-0042', name: 'GUNTORO MUHAMAD', content: 5, instructor: 5, facility: 5, rec: 5, notes: 'Penjelasan JSA & HIRADC oleh Pak Firman sangat praktikal.' },
		{ courseId: 'CRS-2026-004', payrollId: 'EMP-0042', name: 'GUNTORO MUHAMAD', content: 5, instructor: 5, facility: 4, rec: 5, notes: 'Praktik CPR dan balut bidai oleh dr. Zaenul sangat membantu penanganan darurat.' },
		{ courseId: 'CRS-2026-006', payrollId: 'EMP-0012', name: 'AHMAD FAUZI', content: 4, instructor: 5, facility: 4, rec: 5, notes: 'Sangat bermanfaat untuk menjaga stamina saat trip malam hari.' },
		{ courseId: 'CRS-2026-007', payrollId: 'EMP-0089', name: 'RAHMADI IRAWAN', content: 5, instructor: 5, facility: 5, rec: 5, notes: 'Troubleshooting Common Rail Euro 4 mempermudah diagnosa DTC scanner.' }
	];

	for (const e of evalL1) {
		await sql`
			INSERT INTO hris.lms_evaluations_l1 (
				course_id, payroll_id, employee_name, content_rating, instructor_rating,
				facility_rating, recommendation_rating, feedback_notes, submitted_at
			) VALUES (
				${e.courseId}, ${e.payrollId}, ${e.name}, ${e.content}, ${e.instructor},
				${e.facility}, ${e.rec}, ${e.notes}, CURRENT_TIMESTAMP - INTERVAL '7 days'
			);
		`;
	}
	console.log(`✓ Seeded ${evalL1.length} evaluations L1`);

	// Seed Kirkpatrick Level 3 & Level 4 Evaluations
	const evalL3L4 = [
		{
			courseId: 'CRS-2026-001',
			payrollId: 'EMP-0042',
			name: 'GUNTORO MUHAMAD',
			supervisor: 'Hadi Sucipto (Spv Operasional)',
			status: 'COMPLETED',
			behavior: 5,
			sop: 5,
			impact: 5,
			notes: 'Driver konsisten melakukan inspeksi P2H dan mematuhi checklist SWP sebelum jalan.',
			incident: 'Zero near-miss dan zero incident selama 90 hari pasca training.'
		},
		{
			courseId: 'CRS-2026-002',
			payrollId: 'EMP-0042',
			name: 'GUNTORO MUHAMAD',
			supervisor: 'Hadi Sucipto (Spv Operasional)',
			status: 'COMPLETED',
			behavior: 5,
			sop: 5,
			impact: 4,
			notes: 'JSA terisi lengkap pada setiap rute berisiko tinggi.',
			incident: 'Penurunan temuan unsafe condition hingga 100% pada rute logistik Cilegon-Jakarta.'
		},
		{
			courseId: 'CRS-2026-007',
			payrollId: 'EMP-0089',
			name: 'RAHMADI IRAWAN',
			supervisor: 'Andi Riswanto (Manager Transport)',
			status: 'COMPLETED',
			behavior: 5,
			sop: 5,
			impact: 5,
			notes: 'Mekanik berhasil memprogram ulang injector Euro 4 tanpa kendala.',
			incident: 'Waktu breakdown mesin berkurang dari rata-rata 8 jam menjadi 2 jam.'
		}
	];

	for (const el of evalL3L4) {
		await sql`
			INSERT INTO hris.lms_evaluations_l3_l4 (
				course_id, payroll_id, employee_name, supervisor_name, due_date, status,
				behavior_score, sop_compliance_score, business_impact_score,
				incident_reduction_notes, supervisor_notes, reviewed_at
			) VALUES (
				${el.courseId}, ${el.payrollId}, ${el.name}, ${el.supervisor}, CURRENT_DATE - INTERVAL '15 days',
				${el.status}, ${el.behavior}, ${el.sop}, ${el.impact},
				${el.incident}, ${el.notes}, CURRENT_TIMESTAMP - INTERVAL '10 days'
			);
		`;
	}
	console.log(`✓ Seeded ${evalL3L4.length} evaluations L3/L4`);

	console.log('🎉 Seeding report data selesai dengan sukses!');
	process.exit(0);
}

seedReportsData().catch((err) => {
	console.error('❌ Error seeding report data:', err);
	process.exit(1);
});
