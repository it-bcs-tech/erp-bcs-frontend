import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { formatEmbedUrl } from '$lib/utils/embed';

export const load: PageServerLoad = async ({ params }) => {
	const token = params.token;
	if (!token || token.length < 10) {
		throw error(404, 'Tautan Magic Link Trainer tidak valid atau tidak ditemukan.');
	}

	try {
		// 1. Ambil data kursus berdasarkan token
		const courseRows = await sql<any[]>`
			SELECT 
				id, title, category, based, level, status, duration_hours,
				instructor, trainer_type, department, description, passing_grade,
				training_category, trainer_token, trainer_token_status, trainer_materials_url,
				created_at
			FROM hris.lms_courses
			WHERE trainer_token = ${token}
			LIMIT 1;
		`;

		if (courseRows.length === 0) {
			throw error(404, 'Program pelatihan untuk tautan trainer ini tidak ditemukan atau token telah diperbarui.');
		}

		const course = courseRows[0];

		// 2. Ambil data sesi jadwal pelatihan
		const sessionsRows = await sql<any[]>`
			SELECT 
				id, title, session_type, location_or_link, session_date, end_date,
				start_time, end_time, quota, enrolled_count, status
			FROM hris.lms_sessions
			WHERE course_id = ${course.id}
			ORDER BY session_date ASC;
		`;

		// 3. Ambil data soal kuis yang sudah ada (jika ada)
		const quizRows = await sql<any[]>`
			SELECT 
				id, quiz_type, question_type, question_text, options, correct_key, explanation
			FROM hris.lms_quiz_questions
			WHERE course_id = ${course.id}
			ORDER BY quiz_type, id ASC;
		`;

		// 4. Periksa apakah sudah ada peserta yang mengerjakan tes
		const testedRows = await sql<any[]>`
			SELECT COUNT(*)::int as tested_count
			FROM hris.lms_enrollments
			WHERE course_id = ${course.id} AND pre_test_score IS NOT NULL;
		`;
		const testedCount = testedRows[0]?.tested_count || 0;

		// Link terkunci jika di-lock oleh HR, sudah difinalisasi, atau tes sudah dikerjakan peserta
		const isManualLocked = course.trainer_token_status === 'LOCKED';
		const isCompleted = course.trainer_token_status === 'COMPLETED';
		const isExamStarted = testedCount > 0;
		const isLocked = isManualLocked || isCompleted || isExamStarted;

		return {
			course: {
				id: course.id,
				title: course.title,
				category: course.category,
				based: course.based,
				level: course.level,
				instructor: course.instructor,
				trainerType: course.trainer_type,
				department: course.department,
				description: course.description,
				passingGrade: course.passing_grade || 75,
				durationHours: Number(course.duration_hours || 2),
				trainingCategory: course.training_category || 'IN_HOUSE',
				trainerToken: course.trainer_token,
				trainerTokenStatus: course.trainer_token_status,
				trainerMaterialsUrl: course.trainer_materials_url || ''
			},
			sessions: sessionsRows.map((s) => ({
				id: s.id,
				title: s.title,
				sessionType: s.session_type,
				locationOrLink: s.location_or_link,
				sessionDate: s.session_date ? s.session_date.toISOString().split('T')[0] : '',
				sessionEndDate: s.end_date ? s.end_date.toISOString().split('T')[0] : '',
				startTime: s.start_time,
				endTime: s.end_time,
				quota: s.quota,
				enrolledCount: s.enrolled_count,
				status: s.status
			})),
			quizQuestions: quizRows.map((q) => ({
				id: q.id,
				quizType: q.quiz_type,
				questionType: q.question_type || 'MCQ',
				questionText: q.question_text,
				options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
				correctKey: q.correct_key,
				explanation: q.explanation || ''
			})),
			lockInfo: {
				isLocked,
				isManualLocked,
				isCompleted,
				isExamStarted,
				testedCount
			}
		};
	} catch (err: any) {
		if (err?.status === 404) throw err;
		console.error('Error loading Trainer Portal:', err);
		throw error(500, 'Terjadi kendala saat memuat portal instruktur.');
	}
};

export const actions: Actions = {
	saveQuestions: async ({ request, params }) => {
		const token = params.token;
		const formData = await request.formData();

		const preTestRaw = formData.get('preTestQuestions')?.toString() || '[]';
		const postTestRaw = formData.get('postTestQuestions')?.toString() || '[]';
		const materialsUrl = formData.get('materialsUrl')?.toString().trim() || '';
		const isFinalize = formData.get('finalize')?.toString() === 'true';

		try {
			// Verifikasi kursus & status penguncian
			const courseRows = await sql<any[]>`
				SELECT id, title, trainer_token_status 
				FROM hris.lms_courses 
				WHERE trainer_token = ${token}
				LIMIT 1;
			`;

			if (courseRows.length === 0) {
				return { success: false, message: 'Kursus tidak valid atau token salah.' };
			}

			const course = courseRows[0];

			// Cek apakah sudah terkunci
			const testedRows = await sql<any[]>`
				SELECT COUNT(*)::int as tested_count
				FROM hris.lms_enrollments
				WHERE course_id = ${course.id} AND pre_test_score IS NOT NULL;
			`;
			if ((testedRows[0]?.tested_count || 0) > 0) {
				return { success: false, message: 'Soal tidak dapat diubah karena peserta sudah mulai mengerjakan tes.' };
			}

			if (course.trainer_token_status === 'LOCKED') {
				return { success: false, message: 'Tautan ini telah dikunci oleh administrator HR.' };
			}

			let preQuestions: any[] = [];
			let postQuestions: any[] = [];
			try {
				preQuestions = JSON.parse(preTestRaw);
				postQuestions = JSON.parse(postTestRaw);
			} catch {
				preQuestions = [];
				postQuestions = [];
			}

			// Validasi jika finalisasi
			const validPre = preQuestions.filter((q) => {
				if (!q.questionText?.trim()) return false;
				if (q.questionType === 'ESSAY') return true;
				return Array.isArray(q.options) && q.options.filter((o: any) => o.text?.trim()).length >= 2 && q.correctKey;
			});

			const validPost = postQuestions.filter((q) => {
				if (!q.questionText?.trim()) return false;
				if (q.questionType === 'ESSAY') return true;
				return Array.isArray(q.options) && q.options.filter((o: any) => o.text?.trim()).length >= 2 && q.correctKey;
			});

			if (isFinalize && (validPre.length === 0 || validPost.length === 0)) {
				return {
					success: false,
					message: 'Untuk finalisasi, minimal 1 butir soal Pre-Test dan 1 butir soal Post-Test wajib diisi secara lengkap.'
				};
			}

			// Simpan ke database: Hapus soal lama untuk kursus ini lalu masukkan yang baru
			await sql`
				DELETE FROM hris.lms_quiz_questions
				WHERE course_id = ${course.id};
			`;

			// Insert Pre-Test
			for (const q of validPre) {
				const isEssay = q.questionType === 'ESSAY';
				const cleanOptions = isEssay ? [] : (q.options || []).filter((o: any) => o.text?.trim());
				await sql`
					INSERT INTO hris.lms_quiz_questions (
						course_id, module_id, quiz_type, question_type, question_text, options, correct_key, explanation
					) VALUES (
						${course.id}, ${`${course.id}-M1`}, 'PRE_TEST', ${isEssay ? 'ESSAY' : 'MCQ'}, ${q.questionText.trim()},
						${JSON.stringify(cleanOptions)}::jsonb, ${isEssay ? 'ESSAY' : (q.correctKey || 'A')}, ${q.explanation?.trim() || ''}
					);
				`;
			}

			// Insert Post-Test
			for (const q of validPost) {
				const isEssay = q.questionType === 'ESSAY';
				const cleanOptions = isEssay ? [] : (q.options || []).filter((o: any) => o.text?.trim());
				await sql`
					INSERT INTO hris.lms_quiz_questions (
						course_id, module_id, quiz_type, question_type, question_text, options, correct_key, explanation
					) VALUES (
						${course.id}, ${`${course.id}-M1`}, 'POST_TEST', ${isEssay ? 'ESSAY' : 'MCQ'}, ${q.questionText.trim()},
						${JSON.stringify(cleanOptions)}::jsonb, ${isEssay ? 'ESSAY' : (q.correctKey || 'A')}, ${q.explanation?.trim() || ''}
					);
				`;
			}

			// Update materi & status token
			const formattedMaterials = materialsUrl ? formatEmbedUrl(materialsUrl) : null;
			const newStatus = isFinalize ? 'COMPLETED' : 'ACTIVE';

			await sql`
				UPDATE hris.lms_courses 
				SET 
					trainer_materials_url = COALESCE(${formattedMaterials}, trainer_materials_url),
					trainer_token_status = ${newStatus},
					updated_at = NOW()
				WHERE id = ${course.id};
			`;

			return {
				success: true,
				message: isFinalize
					? 'Soal kuis dan materi berhasil difinalisasi! Status kuis kini siap dikerjakan peserta.'
					: 'Draf soal kuis dan materi berhasil disimpan.',
				isFinalize
			};
		} catch (e: any) {
			console.error('Error in saveQuestions action:', e);
			return { success: false, message: `Gagal menyimpan data soal: ${e?.message || 'Error database'}` };
		}
	}
};
