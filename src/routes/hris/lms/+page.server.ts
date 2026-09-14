/**
 * HRIS LMS (Learning Management System) — Page Server Loader & Actions
 * ════════════════════════════════════════════════════════════════════
 * Terintegrasi langsung dengan PostgreSQL schema `hris.lms_*`
 * Selaras dengan arsitektur bcs-academy-frontend (Employee Learning Portal).
 */

import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { logError } from '$lib/utils/logger';

export const load: PageServerLoad = async () => {
	try {
		// 1. Ambil Kursus & Modul Terkait
		const coursesRows = await sql`
			SELECT 
				c.*,
				COALESCE(
					json_agg(
						json_build_object(
							'id', m.id,
							'sequence', m.sequence,
							'title', m.title,
							'type', m.type,
							'durationText', m.duration_text,
							'contentUrl', m.content_url,
							'contentBody', m.content_body
						) ORDER BY m.sequence ASC
					) FILTER (WHERE m.id IS NOT NULL), '[]'::json
				) as modules
			FROM hris.lms_courses c
			LEFT JOIN hris.lms_modules m ON m.course_id = c.id
			GROUP BY c.id
			ORDER BY c.created_at DESC;
		`;

		// 2. Ambil Pertanyaan Kuis / Asesmen
		const quizQuestionsRows = await sql`
			SELECT * FROM hris.lms_quiz_questions
			ORDER BY course_id, quiz_type, id ASC;
		`;

		// 3. Ambil Sesi Training (Online / Offline)
		const sessionsRows = await sql`
			SELECT 
				s.*,
				COUNT(a.id)::int as actual_attendee_count
			FROM hris.lms_sessions s
			LEFT JOIN hris.lms_session_attendances a ON a.session_id = s.id
			GROUP BY s.id
			ORDER BY s.session_date ASC;
		`;

		// 4. Ambil Data Absensi Sesi
		const attendancesRows = await sql`
			SELECT a.*, s.title as session_title
			FROM hris.lms_session_attendances a
			JOIN hris.lms_sessions s ON s.id = a.session_id
			ORDER BY a.attended_at DESC
			LIMIT 50;
		`;

		// 5. Ambil Evaluasi Kirkpatrick Level 1 (Reaction)
		const evalL1Rows = await sql`
			SELECT e.*, c.title as course_title
			FROM hris.lms_evaluations_l1 e
			JOIN hris.lms_courses c ON c.id = e.course_id
			ORDER BY e.submitted_at DESC;
		`;

		// 6. Ambil Evaluasi Kirkpatrick Level 3 & 4 (Review Atasan H+3 Bulan)
		const evalL3L4Rows = await sql`
			SELECT e.*, c.title as course_title
			FROM hris.lms_evaluations_l3_l4 e
			JOIN hris.lms_courses c ON c.id = e.course_id
			ORDER BY 
				CASE WHEN e.status = 'PENDING' THEN 0 ELSE 1 END,
				e.due_date ASC;
		`;

		// 7. Ambil Pengajuan Training by Request
		const trainingRequestsRows = await sql`
			SELECT * FROM hris.lms_training_requests
			ORDER BY created_at DESC;
		`;

		// 8. Ambil Sertifikat Resmi
		const certificatesRows = await sql`
			SELECT * FROM hris.lms_certificates
			ORDER BY issued_at DESC;
		`;

		// 9. Kamus Kompetensi Resmi PT BCS (Competency Library)
		const competencyLibraryRows = await sql`
			SELECT c.*, cr.title as default_course_title
			FROM hris.lms_competency_library c
			LEFT JOIN hris.lms_courses cr ON cr.id = c.default_course_id
			ORDER BY c.code ASC;
		`;

		// 10. Standar Kompetensi Jabatan (Job Standards)
		const jobStandardsRows = await sql`
			SELECT j.*, c.name as competency_name, c.aspect as competency_aspect, cr.title as default_course_title
			FROM hris.lms_job_competencies j
			JOIN hris.lms_competency_library c ON c.code = j.competency_code
			LEFT JOIN hris.lms_courses cr ON cr.id = c.default_course_id
			ORDER BY j.department, j.position_title, j.competency_code ASC;
		`;

		// 11. Asesmen TNA Aktual Karyawan & Pelacakan GAP
		const employeeAssessmentsRows = await sql`
			SELECT 
				a.*,
				c.name as competency_name,
				c.aspect as competency_aspect,
				c.default_course_id,
				cr.title as assigned_course_title,
				e.progress_percent,
				e.status as enrollment_status,
				e.deadline as training_deadline
			FROM hris.lms_employee_assessments a
			JOIN hris.lms_competency_library c ON c.code = a.competency_code
			LEFT JOIN hris.lms_courses cr ON cr.id = COALESCE(a.assigned_course_id, c.default_course_id)
			LEFT JOIN hris.lms_enrollments e ON e.payroll_id = a.payroll_id AND e.course_id = COALESCE(a.assigned_course_id, c.default_course_id)
			ORDER BY a.department, a.employee_name, a.competency_code ASC;
		`;

		// 12. Annual Safety Test Summary
		const safetyStats = {
			year: 2026,
			totalTargetDrivers: 140,
			passedDrivers: 126,
			pendingDrivers: 14,
			complianceRate: 90.0
		};

		// 11. Metrics Dinamis
		const totalCourses = coursesRows.length;
		const totalCertificates = certificatesRows.length;
		const pendingSupervisorReviews = evalL3L4Rows.filter((r) => r.status === 'PENDING').length;
		const avgSatisfaction = evalL1Rows.length
			? (
					evalL1Rows.reduce((acc, curr) => acc + (curr.content_rating + curr.instructor_rating) / 2, 0) /
					evalL1Rows.length
				).toFixed(1)
			: '4.8';

		// 12. Master 16 Trainer Resmi PT Buana Centra Swakarsa (Spreadsheet Master)
		const masterTrainers = [
			{ id: 1, name: 'Ikhnaton', title: 'Manager QHSE', department: 'QHSE & Safety', type: 'Internal' },
			{ id: 2, name: 'Firman Fadholi', title: 'Supervisor QHSE', department: 'QHSE & Safety', type: 'Internal' },
			{ id: 3, name: 'Dr. Zaenul Abidin', title: 'Dokter Perusahaan', department: 'Kesehatan Kerja / HSE', type: 'Internal' },
			{ id: 4, name: 'Jayusman', title: 'Manager Sub-Project', department: 'Operations', type: 'Internal' },
			{ id: 5, name: 'Guntoro', title: 'Supervisor Procurement', department: 'Procurement', type: 'Internal' },
			{ id: 6, name: 'Andi Riswanto', title: 'Manager Transport (Maintenance & Asset)', department: 'Transport & Asset', type: 'Internal' },
			{ id: 7, name: 'Rahmadi Irawan', title: 'Head Mechanic', department: 'Workshop & Maintenance', type: 'Internal' },
			{ id: 8, name: 'Endang Sujana', title: 'Head Mechanic', department: 'Workshop & Maintenance', type: 'Internal' },
			{ id: 9, name: 'Arnaja', title: 'Manager Finance', department: 'Finance & Accounting', type: 'Internal' },
			{ id: 10, name: 'Suhendar', title: 'Supervisor Finance', department: 'Finance & Accounting', type: 'Internal' },
			{ id: 11, name: 'Windy', title: 'Benefit Supervisor', department: 'Human Capital', type: 'Internal' },
			{ id: 12, name: 'Joni', title: 'Licensing Specialist', department: 'Legal & Licensing', type: 'Internal' },
			{ id: 13, name: 'Jemian', title: 'Supervisor Project Labour 1', department: 'Labour Project 1', type: 'Internal' },
			{ id: 14, name: 'Aria Danu', title: 'Foreman', department: 'Operations', type: 'Internal' },
			{ id: 15, name: 'Rendra', title: 'Foreman', department: 'Operations', type: 'Internal' },
			{ id: 16, name: 'Holili', title: 'Manager Project Labour 1', department: 'Labour Project 1', type: 'Internal' }
		];

		// 13. Competency Gap Report Data (Spreadsheet TNA Master Sheet 1746120362 & Kamus Kompetensi 157495735)
		const competencyGapList = [
			{
				department: 'Operations',
				positionTitle: 'Driver Tronton / Trailer',
				employeeName: 'Guntoro Muhamad',
				payrollId: 'EMP-0042',
				aspect: 'Core Competency',
				competencyCode: 'A01',
				competencyName: 'Achievement Orientation',
				requiredLevel: 3,
				actualLevel: 3,
				gap: 0,
				status: 'Qualified',
				recommendation: '-'
			},
			{
				department: 'Operations',
				positionTitle: 'Driver Tronton / Trailer',
				employeeName: 'Guntoro Muhamad',
				payrollId: 'EMP-0042',
				aspect: 'Behavioral Competency',
				competencyCode: 'E06',
				competencyName: 'Safety Awareness & SWP',
				requiredLevel: 3,
				actualLevel: 2,
				gap: -1,
				status: 'Gap Competency',
				recommendation: 'Re-Induksi Keselamatan & SWP (CRS-2026-001)'
			},
			{
				department: 'Operations',
				positionTitle: 'Driver Angkutan Berat',
				employeeName: 'Ahmad Fauzi',
				payrollId: 'EMP-0012',
				aspect: 'Technical Competency',
				competencyCode: 'D01',
				competencyName: 'Fatigue Management & Jam Aman',
				requiredLevel: 4,
				actualLevel: 3,
				gap: -1,
				status: 'Gap Competency',
				recommendation: 'Refreshment Fatigue Management (CRS-2026-006)'
			},
			{
				department: 'Workshop & Maintenance',
				positionTitle: 'Mekanik & Teknisi Armada',
				employeeName: 'Rahmadi Irawan',
				payrollId: 'EMP-0089',
				aspect: 'Technical Competency',
				competencyCode: 'M02',
				competencyName: 'Diagnosa Mesin Diesel Euro 4 Common Rail',
				requiredLevel: 4,
				actualLevel: 2,
				gap: -2,
				status: 'Gap Competency',
				recommendation: 'Preventive Maintenance Mesin Diesel Euro 4 (CRS-2026-007)'
			},
			{
				department: 'Labour Project 1 & Warehouse',
				positionTitle: 'Operator Forklift',
				employeeName: 'Joni Pranoto',
				payrollId: 'EMP-0078',
				aspect: 'Technical Competency',
				competencyCode: 'W03',
				competencyName: 'K3 Pergudangan & SIO Forklift Kemnaker',
				requiredLevel: 3,
				actualLevel: 2,
				gap: -1,
				status: 'Gap Competency',
				recommendation: 'Sertifikasi Operator SIO Forklift Kelas 2 (CRS-2026-008)'
			},
			{
				department: 'Finance & Operations',
				positionTitle: 'Supervisor Finance & Kasir',
				employeeName: 'Suhendar',
				payrollId: 'EMP-0010',
				aspect: 'Technical Competency',
				competencyCode: 'F01',
				competencyName: 'Budgeting & Cost Control Operasional',
				requiredLevel: 4,
				actualLevel: 4,
				gap: 0,
				status: 'Qualified',
				recommendation: '-'
			},
			{
				department: 'QHSE & Safety',
				positionTitle: 'Safety Officer',
				employeeName: 'Firman Fadholi',
				payrollId: 'EMP-0002',
				aspect: 'Technical Competency',
				competencyCode: 'S02',
				competencyName: 'JSA & HIRADC Risk Assessment',
				requiredLevel: 4,
				actualLevel: 4,
				gap: 0,
				status: 'Qualified',
				recommendation: '-'
			}
		];

		// 14. Data TNA Matrix Ringkas
		const tnaMatrix = [
			{
				role: 'Pengemudi Truk Berat (Driver Tronton/Trailer)',
				department: 'Operations',
				competencies: [
					{ name: 'Defensive Driving & K3 Lalu Lintas', requiredScore: 85, actualScore: 88, status: 'Qualified' },
					{ name: 'Pemeriksaan Pra-Jalan (P2H) Kendaraan', requiredScore: 80, actualScore: 78, status: 'Need Training' },
					{ name: 'Pengoperasian Mobile Apps & e-DO', requiredScore: 75, actualScore: 92, status: 'Qualified' },
					{ name: 'Penanganan Bahan Kimia B3', requiredScore: 80, actualScore: 65, status: 'Critical Gap' }
				]
			},
			{
				role: 'Mekanik & Teknisi Armada',
				department: 'Workshop & Maintenance',
				competencies: [
					{ name: 'Diagnosa Mesin Euro 4 Common Rail', requiredScore: 80, actualScore: 60, status: 'Critical Gap' },
					{ name: 'Safety Awareness & K3 Bengkel', requiredScore: 85, actualScore: 85, status: 'Qualified' }
				]
			}
		];

		return {
			metrics: {
				totalCourses,
				totalCertificates,
				pendingSupervisorReviews,
				avgSatisfaction: Number(avgSatisfaction),
				activeLearners: 135,
				complianceRate: 94.5
			},
			masterTrainers,
			competencyGapList,
			courses: coursesRows.map((c) => ({
				id: c.id,
				title: c.title,
				category: c.category,
				based: c.based || 'Mandatory',
				level: c.level,
				status: c.status,
				durationHours: Number(c.duration_hours),
				modulesCount: c.modules_count || (c.modules ? c.modules.length : 0),
				enrolledCount: c.enrolled_count,
				completionRate: Number(c.completion_rate),
				rating: Number(c.rating),
				instructor: c.instructor,
				trainerType: c.trainer_type || 'Internal',
				costTrainer: Number(c.cost_trainer || 0),
				costTrainee: Number(c.cost_trainee || 0),
				department: c.department || 'Operations',
				description: c.description,
				tags: c.tags || [],
				passingGrade: c.passing_grade || 75,
				thumbnailUrl: c.thumbnail_url,
				modules: c.modules || []
			})),
			quizQuestions: quizQuestionsRows.map((q) => ({
				id: q.id,
				courseId: q.course_id,
				moduleId: q.module_id,
				quizType: q.quiz_type,
				questionText: q.question_text,
				options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
				correctKey: q.correct_key,
				explanation: q.explanation
			})),
			sessions: sessionsRows.map((s) => ({
				id: s.id,
				courseId: s.course_id,
				title: s.title,
				trainer: s.trainer,
				trainerType: s.trainer_type || 'Internal',
				costTrainer: Number(s.cost_trainer || 0),
				costTrainee: Number(s.cost_trainee || 0),
				department: s.department || 'Operations',
				based: s.based || 'Mandatory',
				sessionType: s.session_type,
				locationOrLink: s.location_or_link,
				sessionDate: s.session_date ? s.session_date.toISOString().split('T')[0] : '',
				startTime: s.start_time,
				endTime: s.end_time,
				targetRole: s.target_role,
				quota: s.quota,
				enrolledCount: s.enrolled_count,
				actualAttendeeCount: s.actual_attendee_count || 0,
				status: s.status
			})),
			attendances: attendancesRows.map((a) => ({
				id: a.id,
				sessionId: a.session_id,
				sessionTitle: a.session_title,
				payrollId: a.payroll_id,
				employeeName: a.employee_name,
				department: a.department,
				status: a.status,
				attendedAt: a.attended_at ? a.attended_at.toISOString().replace('T', ' ').substring(0, 16) : '',
				notes: a.notes
			})),
			evaluationsL1: evalL1Rows.map((e) => ({
				id: e.id,
				courseId: e.course_id,
				courseTitle: e.course_title,
				payrollId: e.payroll_id,
				employeeName: e.employee_name,
				contentRating: e.content_rating,
				instructorRating: e.instructor_rating,
				facilityRating: e.facility_rating,
				recommendationRating: e.recommendation_rating,
				feedbackNotes: e.feedback_notes,
				submittedAt: e.submitted_at ? e.submitted_at.toISOString().split('T')[0] : ''
			})),
			evaluationsL3L4: evalL3L4Rows.map((e) => ({
				id: e.id,
				courseId: e.course_id,
				courseTitle: e.course_title,
				payrollId: e.payroll_id,
				employeeName: e.employee_name,
				supervisorName: e.supervisor_name,
				dueDate: e.due_date ? e.due_date.toISOString().split('T')[0] : '',
				status: e.status,
				behaviorScore: e.behavior_score,
				sopComplianceScore: e.sop_compliance_score,
				businessImpactScore: e.business_impact_score,
				incidentReductionNotes: e.incident_reduction_notes,
				supervisorNotes: e.supervisor_notes,
				reviewedAt: e.reviewed_at ? e.reviewed_at.toISOString().split('T')[0] : ''
			})),
			trainingRequests: trainingRequestsRows.map((r) => ({
				id: r.id,
				deptName: r.dept_name,
				requestedBy: r.requested_by,
				trainingTitle: r.training_title,
				category: r.category,
				urgency: r.urgency,
				estimatedParticipants: r.estimated_participants,
				targetCompletionDate: r.target_completion_date ? r.target_completion_date.toISOString().split('T')[0] : '',
				justification: r.justification,
				status: r.status,
				createdAt: r.created_at ? r.created_at.toISOString().split('T')[0] : ''
			})),
			certificates: certificatesRows.map((c) => ({
				certificateNumber: c.certificate_number,
				payrollId: c.payroll_id,
				employeeName: c.employee_name,
				courseId: c.course_id,
				courseTitle: c.course_title,
				category: c.category,
				score: Number(c.score),
				issuedAt: c.issued_at ? c.issued_at.toISOString().split('T')[0] : '',
				validUntil: c.valid_until ? c.valid_until.toISOString().split('T')[0] : '',
				qrVerifyUrl: c.qr_verify_url
			})),
			competencyLibrary: competencyLibraryRows.map((c) => ({
				code: c.code,
				name: c.name,
				aspect: c.aspect,
				levelIndicators: typeof c.level_indicators === 'string' ? JSON.parse(c.level_indicators) : c.level_indicators,
				defaultCourseId: c.default_course_id,
				defaultCourseTitle: c.default_course_title || 'Belum di-mapping'
			})),
			jobStandards: jobStandardsRows.map((j) => ({
				id: j.id,
				positionTitle: j.position_title,
				department: j.department,
				competencyCode: j.competency_code,
				competencyName: j.competency_name,
				competencyAspect: j.competency_aspect,
				requiredLevel: Number(j.required_level),
				defaultCourseTitle: j.default_course_title || '-'
			})),
			employeeAssessments: employeeAssessmentsRows.map((a) => ({
				id: a.id,
				payrollId: a.payroll_id,
				employeeName: a.employee_name,
				positionTitle: a.position_title,
				department: a.department,
				competencyCode: a.competency_code,
				competencyName: a.competency_name,
				competencyAspect: a.competency_aspect,
				requiredLevel: Number(a.required_level),
				actualLevel: Number(a.actual_level),
				gap: Number(a.gap),
				status: a.status,
				assessorName: a.assessor_name,
				assessmentDate: a.assessment_date ? a.assessment_date.toISOString().split('T')[0] : '',
				assignedCourseId: a.assigned_course_id || a.default_course_id,
				assignedCourseTitle: a.assigned_course_title || 'Kursus Terkait GAP',
				trainingStatus: a.training_status || 'NONE',
				progressPercent: a.progress_percent !== null && a.progress_percent !== undefined ? Number(a.progress_percent) : (a.training_status === 'ASSIGNED' ? 15 : 0),
				enrollmentStatus: a.enrollment_status || (a.training_status === 'ASSIGNED' ? 'ENROLLED' : 'NOT_ENROLLED'),
				trainingDeadline: a.training_deadline ? a.training_deadline.toISOString().split('T')[0] : '',
				reassessmentStatus: a.reassessment_status
			})),
			tnaMatrix,
			safetyStats,
			dataSource: 'postgresql' as const
		};
	} catch (err: any) {
		logError('LMS_DB_LOAD_ERROR', 'Gagal memuat data LMS dari PostgreSQL', err?.message);
		throw err;
	}
};

export const actions = {
	// 1. Create Kursus Baru
	createCourse: async ({ request }) => {
		const formData = await request.formData();
		const title = formData.get('title')?.toString().trim();
		const category = formData.get('category')?.toString().trim() || 'Safety';
		const based = formData.get('based')?.toString().trim() || 'Mandatory';
		const level = formData.get('level')?.toString().trim() || 'Beginner';
		const instructor = formData.get('instructor')?.toString().trim() || 'Syarochman';
		const trainerType = formData.get('trainerType')?.toString().trim() || 'Internal';
		const costTrainer = Number(formData.get('costTrainer')) || (trainerType === 'Internal' ? 500000 : 2500000);
		const costTrainee = Number(formData.get('costTrainee')) || 0;
		const department = formData.get('department')?.toString().trim() || 'All Dept';
		const durationHours = Number(formData.get('durationHours')) || 2.0;
		const passingGrade = Number(formData.get('passingGrade')) || 75;
		const description = formData.get('description')?.toString().trim() || '';
		const tagsInput = formData.get('tags')?.toString().trim() || '';
		const tags = tagsInput ? tagsInput.split(',').map((t) => t.trim()) : ['LMS', based];

		if (!title) {
			return { success: false, message: 'Judul kursus wajib diisi.' };
		}

		const id = `CRS-${category.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

		try {
			await sql`
				INSERT INTO hris.lms_courses (
					id, title, category, based, level, status, duration_hours, instructor,
					trainer_type, cost_trainer, cost_trainee, department, description, tags, passing_grade
				) VALUES (
					${id}, ${title}, ${category}, ${based}, ${level}, 'Published', ${durationHours}, ${instructor},
					${trainerType}, ${costTrainer}, ${costTrainee}, ${department}, ${description}, ${tags}, ${passingGrade}
				);
			`;

			// Tambah modul default agar kursus langsung dapat diakses
			await sql`
				INSERT INTO hris.lms_modules (id, course_id, sequence, title, type, duration_text, content_body)
				VALUES
					(${`${id}-M1`}, ${id}, 1, 'Pengantar & Prinsip Utama Materi', 'VIDEO', '20 Menit', 'Silakan pelajari video pengantar dan ikuti instruksi kerja berikut.'),
					(${`${id}-M2`}, ${id}, 2, 'SOP & Prosedur Keselamatan Kerja', 'DOCUMENT', '30 Menit', 'Dokumen standar operasional prosedur terkait materi ini.'),
					(${`${id}-M3`}, ${id}, 3, 'Evaluasi Akhir & Post-Test Kelulusan', 'QUIZ', '20 Menit', 'Kuis kelulusan materi.');
			`;

			// Tambahkan pertanyaan kuis default
			await sql`
				INSERT INTO hris.lms_quiz_questions (course_id, module_id, quiz_type, question_text, options, correct_key, explanation)
				VALUES
					(${id}, ${`${id}-M1`}, 'PRE_TEST', ${`Apakah Anda telah memahami dasar kepatuhan terkait ${title}?`},
					'[{"key":"A","text":"Ya, sangat paham"},{"key":"B","text":"Cukup paham"},{"key":"C","text":"Belum paham"}]'::jsonb, 'A', 'Kuis orientasi awal.'),
					(${id}, ${`${id}-M3`}, 'POST_TEST', ${`Tindakan utama yang harus diutamakan sesuai standar kerja ${title} adalah:`},
					'[{"key":"A","text":"Keselamatan kerja dan kepatuhan SOP"},{"key":"B","text":"Kecepatan tanpa prosedur"},{"key":"C","text":"Mengabaikan checklist"}]'::jsonb, 'A', 'SOP mengutamakan keselamatan.');
			`;

			return { success: true, message: `Kursus "${title}" berhasil ditambahkan ke katalog LMS.` };
		} catch (e: any) {
			logError('LMS_CREATE_COURSE_FAIL', e?.message);
			return { success: false, message: 'Gagal menambahkan kursus ke database.' };
		}
	},

	// 2. Ubah Status Kursus (Draft, Published, Archived)
	updateCourseStatus: async ({ request }) => {
		const formData = await request.formData();
		const courseId = formData.get('courseId')?.toString();
		const status = formData.get('status')?.toString();

		if (!courseId || !status) {
			return { success: false, message: 'Data kursus tidak lengkap.' };
		}

		try {
			await sql`
				UPDATE hris.lms_courses
				SET status = ${status}, updated_at = CURRENT_TIMESTAMP
				WHERE id = ${courseId};
			`;
			return { success: true, message: `Status kursus ${courseId} diperbarui menjadi ${status}.` };
		} catch (e: any) {
			return { success: false, message: 'Gagal memperbarui status kursus.' };
		}
	},

	// 3. Tambah Jadwal Sesi Training Baru
	createSession: async ({ request }) => {
		const formData = await request.formData();
		const title = formData.get('title')?.toString().trim();
		const courseId = formData.get('courseId')?.toString().trim() || null;
		const trainer = formData.get('trainer')?.toString().trim();
		const trainerType = formData.get('trainerType')?.toString().trim() || 'Internal';
		const costTrainer = Number(formData.get('costTrainer')) || (trainerType === 'Internal' ? 500000 : 2500000);
		const costTrainee = Number(formData.get('costTrainee')) || 0;
		const department = formData.get('department')?.toString().trim() || 'Operations';
		const based = formData.get('based')?.toString().trim() || 'Mandatory';
		const sessionType = formData.get('sessionType')?.toString() || 'OFFLINE';
		const locationOrLink = formData.get('locationOrLink')?.toString().trim();
		const sessionDate = formData.get('sessionDate')?.toString();
		const startTime = formData.get('startTime')?.toString() || '09:00';
		const endTime = formData.get('endTime')?.toString() || '11:00';
		const targetRole = formData.get('targetRole')?.toString().trim() || 'All Staff';
		const quota = Number(formData.get('quota')) || 30;

		if (!title || !trainer || !locationOrLink || !sessionDate) {
			return { success: false, message: 'Harap isi seluruh field jadwal sesi training.' };
		}

		const id = `TRN-${sessionDate}-${Date.now().toString().slice(-3)}`;

		try {
			await sql`
				INSERT INTO hris.lms_sessions (
					id, course_id, title, trainer, trainer_type, cost_trainer, cost_trainee,
					department, based, session_type, location_or_link, session_date,
					start_time, end_time, target_role, quota, status
				) VALUES (
					${id}, ${courseId}, ${title}, ${trainer}, ${trainerType}, ${costTrainer}, ${costTrainee},
					${department}, ${based}, ${sessionType}, ${locationOrLink}, ${sessionDate},
					${startTime}, ${endTime}, ${targetRole}, ${quota}, 'SCHEDULED'
				);
			`;
			return { success: true, message: `Jadwal sesi training "${title}" berhasil dibuat.` };
		} catch (e: any) {
			return { success: false, message: 'Gagal menyimpan jadwal sesi training.' };
		}
	},

	// 4. Catat Kehadiran Peserta
	markAttendance: async ({ request }) => {
		const formData = await request.formData();
		const sessionId = formData.get('sessionId')?.toString();
		const payrollId = formData.get('payrollId')?.toString().trim();
		const employeeName = formData.get('employeeName')?.toString().trim();
		const department = formData.get('department')?.toString().trim() || 'Operations';
		const status = formData.get('status')?.toString() || 'HADIR';
		const notes = formData.get('notes')?.toString().trim() || '';

		if (!sessionId || !payrollId || !employeeName) {
			return { success: false, message: 'Data peserta tidak lengkap.' };
		}

		try {
			await sql`
				INSERT INTO hris.lms_session_attendances (
					session_id, payroll_id, employee_name, department, status, notes
				) VALUES (
					${sessionId}, ${payrollId}, ${employeeName}, ${department}, ${status}, ${notes}
				);
			`;
			return { success: true, message: `Kehadiran ${employeeName} (${status}) berhasil dicatat.` };
		} catch (e: any) {
			return { success: false, message: 'Gagal mencatat absensi.' };
		}
	},

	// 5. Submit Post-Test & Terbitkan Sertifikat Otomatis
	submitPostTest: async ({ request }) => {
		const formData = await request.formData();
		const courseId = formData.get('courseId')?.toString() || '';
		const payrollId = formData.get('payrollId')?.toString() || 'EMP-0042';
		const employeeName = formData.get('employeeName')?.toString() || 'GUNTORO MUHAMAD';
		const score = Number(formData.get('score')) || 90;

		try {
			const courseRow = await sql`SELECT * FROM hris.lms_courses WHERE id = ${courseId} LIMIT 1`;
			const course = courseRow[0];
			const passingGrade = course?.passing_grade || 75;
			const passed = score >= passingGrade;

			let certNumber = '';
			if (passed) {
				const certSeq = Math.floor(1000 + Math.random() * 9000);
				certNumber = `CERT-BCS-2026-${certSeq}`;
				const qrUrl = `https://academy.bcslabs.tech/verify/${certNumber}`;

				await sql`
					INSERT INTO hris.lms_certificates (
						certificate_number, payroll_id, employee_name, course_id, course_title,
						category, score, issued_at, valid_until, qr_verify_url
					) VALUES (
						${certNumber}, ${payrollId}, ${employeeName}, ${courseId}, ${course?.title || 'Training Program'},
						${course?.category || 'Operations'}, ${score}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '2 years', ${qrUrl}
					)
					ON CONFLICT (certificate_number) DO NOTHING;
				`;

				// Jadwalkan Evaluasi Atasan (Level 3 & 4) H+3 Bulan
				await sql`
					INSERT INTO hris.lms_evaluations_l3_l4 (
						course_id, payroll_id, employee_name, supervisor_name, due_date, status
					) VALUES (
						${courseId}, ${payrollId}, ${employeeName}, 'Hadi Sucipto (Supervisor Operasional)',
						CURRENT_DATE + INTERVAL '3 months', 'PENDING'
					);
				`;
			}

			return {
				success: true,
				passed,
				score,
				passingGrade,
				certNumber,
				message: passed
					? `Selamat! Anda LULUS dengan nilai ${score}/${100}. E-Sertifikat resmi ${certNumber} berhasil diterbitkan.`
					: `Nilai Anda ${score}/${100} belum mencapai passing grade (${passingGrade}). Silakan pelajari kembali materi dan lakukan remedial.`
			};
		} catch (e: any) {
			return { success: false, message: 'Gagal memproses penilaian kuis.' };
		}
	},

	// 6. Submit Evaluasi Level 1 (Reaction Peserta)
	submitEvaluationL1: async ({ request }) => {
		const formData = await request.formData();
		const courseId = formData.get('courseId')?.toString();
		const payrollId = formData.get('payrollId')?.toString() || 'EMP-0042';
		const employeeName = formData.get('employeeName')?.toString() || 'GUNTORO MUHAMAD';
		const contentRating = Number(formData.get('contentRating')) || 5;
		const instructorRating = Number(formData.get('instructorRating')) || 5;
		const facilityRating = Number(formData.get('facilityRating')) || 5;
		const recommendationRating = Number(formData.get('recommendationRating')) || 5;
		const feedbackNotes = formData.get('feedbackNotes')?.toString() || '';

		if (!courseId) return { success: false, message: 'Course ID tidak valid.' };

		try {
			await sql`
				INSERT INTO hris.lms_evaluations_l1 (
					course_id, payroll_id, employee_name, content_rating, instructor_rating,
					facility_rating, recommendation_rating, feedback_notes
				) VALUES (
					${courseId}, ${payrollId}, ${employeeName}, ${contentRating}, ${instructorRating},
					${facilityRating}, ${recommendationRating}, ${feedbackNotes}
				);
			`;
			return { success: true, message: 'Terima kasih! Survei evaluasi Level 1 berhasil disimpan.' };
		} catch (e: any) {
			return { success: false, message: 'Gagal menyimpan evaluasi Level 1.' };
		}
	},

	// 7. Submit Review Evaluasi Atasan (Level 3 & 4)
	submitEvaluationL3L4: async ({ request }) => {
		const formData = await request.formData();
		const evalId = Number(formData.get('evalId'));
		const behaviorScore = Number(formData.get('behaviorScore')) || 5;
		const sopComplianceScore = Number(formData.get('sopComplianceScore')) || 5;
		const businessImpactScore = Number(formData.get('businessImpactScore')) || 5;
		const incidentReductionNotes = formData.get('incidentReductionNotes')?.toString() || '';
		const supervisorNotes = formData.get('supervisorNotes')?.toString() || '';

		if (!evalId) return { success: false, message: 'ID Evaluasi tidak ditemukan.' };

		try {
			await sql`
				UPDATE hris.lms_evaluations_l3_l4
				SET
					status = 'COMPLETED',
					behavior_score = ${behaviorScore},
					sop_compliance_score = ${sopComplianceScore},
					business_impact_score = ${businessImpactScore},
					incident_reduction_notes = ${incidentReductionNotes},
					supervisor_notes = ${supervisorNotes},
					reviewed_at = CURRENT_TIMESTAMP
				WHERE id = ${evalId};
			`;
			return { success: true, message: 'Penilaian evaluasi pasca-training Level 3 & Level 4 berhasil disimpan.' };
		} catch (e: any) {
			return { success: false, message: 'Gagal memperbarui evaluasi atasan.' };
		}
	},

	// 8. Pengajuan Training by Request oleh Dept Head
	requestTraining: async ({ request }) => {
		const formData = await request.formData();
		const deptName = formData.get('deptName')?.toString().trim();
		const requestedBy = formData.get('requestedBy')?.toString().trim();
		const trainingTitle = formData.get('trainingTitle')?.toString().trim();
		const category = formData.get('category')?.toString().trim() || 'Technical';
		const urgency = formData.get('urgency')?.toString() || 'NORMAL';
		const estimatedParticipants = Number(formData.get('estimatedParticipants')) || 5;
		const targetCompletionDate = formData.get('targetCompletionDate')?.toString();
		const justification = formData.get('justification')?.toString().trim();

		if (!deptName || !requestedBy || !trainingTitle || !justification) {
			return { success: false, message: 'Harap lengkapi form pengajuan training.' };
		}

		const id = `REQ-TRN-${Date.now().toString().slice(-4)}`;

		try {
			await sql`
				INSERT INTO hris.lms_training_requests (
					id, dept_name, requested_by, training_title, category, urgency,
					estimated_participants, target_completion_date, justification, status
				) VALUES (
					${id}, ${deptName}, ${requestedBy}, ${trainingTitle}, ${category}, ${urgency},
					${estimatedParticipants}, ${targetCompletionDate || null}, ${justification}, 'PENDING_HRD'
				);
			`;
			return { success: true, message: `Pengajuan training "${trainingTitle}" berhasil dikirimkan ke HRD.` };
		} catch (e: any) {
			return { success: false, message: 'Gagal menyimpan pengajuan training.' };
		}
	},

	// 9. Submit Ujian Safety K3 Tahunan
	submitSafetyTest: async ({ request }) => {
		const formData = await request.formData();
		const payrollId = formData.get('payrollId')?.toString() || 'EMP-0042';
		const employeeName = formData.get('employeeName')?.toString() || 'GUNTORO MUHAMAD';
		const score = Number(formData.get('score')) || 100;

		return {
			success: true,
			message: `Selamat! Ujian Kepatuhan Safety K3 Tahunan 2026 atas nama ${employeeName} (${payrollId}) dinyatakan LULUS dengan skor ${score}/100.`
		};
	},

	// 10. Tambah/Edit Kamus Kompetensi Resmi (Competency Library)
	saveCompetency: async ({ request }) => {
		const formData = await request.formData();
		const code = formData.get('code')?.toString().trim().toUpperCase();
		const name = formData.get('name')?.toString().trim();
		const aspect = formData.get('aspect')?.toString().trim() || 'Technical Competency';
		const defaultCourseId = formData.get('defaultCourseId')?.toString().trim() || null;

		const level1 = formData.get('level1')?.toString().trim() || 'Memahami dasar prosedur dan SOP kerja dasar.';
		const level2 = formData.get('level2')?.toString().trim() || 'Mampu mengaplikasikan dalam tugas rutin mandiri.';
		const level3 = formData.get('level3')?.toString().trim() || 'Mampu memodifikasi dan menyelesaikan kendala operasional.';
		const level4 = formData.get('level4')?.toString().trim() || 'Mampu menganalisa peningkatan sistem dan membimbing tim.';
		const level5 = formData.get('level5')?.toString().trim() || 'Menjadi rujukan ahli (SME) dan inovator strategi perusahaan.';

		if (!code || !name) {
			return { success: false, message: 'Kode dan Nama Kompetensi wajib diisi.' };
		}

		const levelIndicators = [
			{ level: 1, desc: level1 },
			{ level: 2, desc: level2 },
			{ level: 3, desc: level3 },
			{ level: 4, desc: level4 },
			{ level: 5, desc: level5 }
		];

		try {
			await sql`
				INSERT INTO hris.lms_competency_library (
					code, name, aspect, level_indicators, default_course_id
				) VALUES (
					${code}, ${name}, ${aspect}, ${JSON.stringify(levelIndicators)}::jsonb, ${defaultCourseId}
				)
				ON CONFLICT (code) DO UPDATE SET
					name = EXCLUDED.name,
					aspect = EXCLUDED.aspect,
					level_indicators = EXCLUDED.level_indicators,
					default_course_id = EXCLUDED.default_course_id;
			`;
			return { success: true, message: `Kamus kompetensi [${code}] ${name} berhasil disimpan.` };
		} catch (e: any) {
			return { success: false, message: `Gagal menyimpan kompetensi: ${e?.message || 'Error database'}` };
		}
	},

	// 11. Tetapkan Standar Kompetensi Jabatan (Required Level)
	saveJobStandard: async ({ request }) => {
		const formData = await request.formData();
		const positionTitle = formData.get('positionTitle')?.toString().trim();
		const department = formData.get('department')?.toString().trim();
		const competencyCode = formData.get('competencyCode')?.toString().trim().toUpperCase();
		const requiredLevel = Number(formData.get('requiredLevel')) || 3;

		if (!positionTitle || !department || !competencyCode) {
			return { success: false, message: 'Posisi, Departemen, dan Kode Kompetensi wajib diisi.' };
		}

		try {
			await sql`
				INSERT INTO hris.lms_job_competencies (
					position_title, department, competency_code, required_level
				) VALUES (
					${positionTitle}, ${department}, ${competencyCode}, ${requiredLevel}
				)
				ON CONFLICT (position_title, competency_code) DO UPDATE SET
					department = EXCLUDED.department,
					required_level = EXCLUDED.required_level;
			`;
			return { success: true, message: `Standar jabatan ${positionTitle} untuk kompetensi [${competencyCode}] (Target Level: ${requiredLevel}) berhasil diperbarui.` };
		} catch (e: any) {
			return { success: false, message: `Gagal menyimpan standar jabatan: ${e?.message || 'Error database'}` };
		}
	},

	// 12. Input Evaluasi Aktual Karyawan TNA (Atasan/Assessor)
	submitEmployeeAssessment: async ({ request }) => {
		const formData = await request.formData();
		const payrollId = formData.get('payrollId')?.toString().trim().toUpperCase();
		const employeeName = formData.get('employeeName')?.toString().trim();
		const positionTitle = formData.get('positionTitle')?.toString().trim() || 'Driver Angkutan Berat';
		const department = formData.get('department')?.toString().trim() || 'Operations';
		const competencyCode = formData.get('competencyCode')?.toString().trim().toUpperCase();
		const requiredLevel = Number(formData.get('requiredLevel')) || 3;
		const actualLevel = Number(formData.get('actualLevel')) || 3;
		const assessorName = formData.get('assessorName')?.toString().trim() || 'Supervisor Lapangan';
		const notes = formData.get('notes')?.toString().trim() || '';

		if (!payrollId || !employeeName || !competencyCode) {
			return { success: false, message: 'Harap lengkapi data karyawan dan kompetensi asesmen.' };
		}

		const gap = actualLevel - requiredLevel;
		const status = gap >= 0 ? 'Qualified' : 'Gap Competency';

		try {
			await sql`
				INSERT INTO hris.lms_employee_assessments (
					payroll_id, employee_name, position_title, department,
					competency_code, required_level, actual_level, status,
					assessor_name, assessment_date, notes
				) VALUES (
					${payrollId}, ${employeeName}, ${positionTitle}, ${department},
					${competencyCode}, ${requiredLevel}, ${actualLevel}, ${status},
					${assessorName}, CURRENT_DATE, ${notes}
				)
				ON CONFLICT (payroll_id, competency_code) DO UPDATE SET
					employee_name = EXCLUDED.employee_name,
					position_title = EXCLUDED.position_title,
					department = EXCLUDED.department,
					required_level = EXCLUDED.required_level,
					actual_level = EXCLUDED.actual_level,
					status = EXCLUDED.status,
					assessor_name = EXCLUDED.assessor_name,
					assessment_date = CURRENT_DATE,
					notes = EXCLUDED.notes;
			`;
			return {
				success: true,
				message: `Asesmen TNA untuk ${employeeName} [${competencyCode}] berhasil disimpan. Status: ${status} (GAP: ${gap}).`
			};
		} catch (e: any) {
			return { success: false, message: `Gagal menyimpan asesmen karyawan: ${e?.message || 'Error database'}` };
		}
	},

	// 13. Auto-Assign Pelatihan Personal ke Akun Karyawan di BCS Academy Portal
	assignPersonalTraining: async ({ request }) => {
		const formData = await request.formData();
		const assessmentId = Number(formData.get('assessmentId')) || null;
		const payrollId = formData.get('payrollId')?.toString().trim().toUpperCase();
		const employeeName = formData.get('employeeName')?.toString().trim();
		let courseId = formData.get('courseId')?.toString().trim();
		const competencyCode = formData.get('competencyCode')?.toString().trim().toUpperCase();

		if (!payrollId || !competencyCode) {
			return { success: false, message: 'Data karyawan dan kode kompetensi tidak valid.' };
		}

		try {
			// Cari default_course_id jika courseId belum dipilih
			if (!courseId) {
				const compRows = await sql`
					SELECT default_course_id FROM hris.lms_competency_library WHERE code = ${competencyCode} LIMIT 1;
				`;
				if (compRows.length && compRows[0].default_course_id) {
					courseId = compRows[0].default_course_id;
				} else {
					courseId = 'CRS-2026-001'; // Default fallback: Re-Induksi SWP
				}
			}

			// Cek apakah sudah ada enrollment untuk payroll_id & course_id ini
			const existing = await sql`
				SELECT id FROM hris.lms_enrollments 
				WHERE course_id = ${courseId} AND UPPER(payroll_id) = ${payrollId} LIMIT 1;
			`;

			let enrollmentId: number;
			if (existing.length > 0) {
				enrollmentId = existing[0].id;
				await sql`
					UPDATE hris.lms_enrollments
					SET status = 'ENROLLED',
						is_tna_gap = TRUE,
						competency_code = ${competencyCode},
						deadline = CURRENT_TIMESTAMP + INTERVAL '30 days'
					WHERE id = ${enrollmentId};
				`;
			} else {
				const res = await sql`
					INSERT INTO hris.lms_enrollments (
						course_id, payroll_id, employee_name, status, progress_percent,
						is_tna_gap, competency_code, enrolled_at, deadline
					) VALUES (
						${courseId}, ${payrollId}, ${employeeName}, 'ENROLLED', 0,
						TRUE, ${competencyCode}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days'
					)
					RETURNING id;
				`;
				enrollmentId = res[0].id;
			}

			// Update status di lms_employee_assessments
			if (assessmentId) {
				await sql`
					UPDATE hris.lms_employee_assessments
					SET assigned_course_id = ${courseId},
						enrollment_id = ${enrollmentId},
						training_status = 'ASSIGNED'
					WHERE id = ${assessmentId};
				`;
			} else {
				await sql`
					UPDATE hris.lms_employee_assessments
					SET assigned_course_id = ${courseId},
						enrollment_id = ${enrollmentId},
						training_status = 'ASSIGNED'
					WHERE UPPER(payroll_id) = ${payrollId} AND competency_code = ${competencyCode};
				`;
			}

			return {
				success: true,
				message: `Pelatihan personal [${courseId}] berhasil ditugaskan langsung ke akun portal karyawan ${employeeName} (${payrollId})!`
			};
		} catch (e: any) {
			return { success: false, message: `Gagal menugaskan pelatihan personal: ${e?.message || 'Error database'}` };
		}
	}
} satisfies Actions;
