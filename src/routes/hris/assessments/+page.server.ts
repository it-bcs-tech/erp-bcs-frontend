import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { logError } from '$lib/utils/logger';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		// 1. Ambil Semua Pemetaan Atasan-Bawahan dari master.m_atasan
		const rawHierarchy = await sql`
			SELECT DISTINCT 
				a.title_atasan, 
				t_atasan.title as nama_jabatan_atasan,
				a.title_bawahan, 
				t_bawahan.title as nama_jabatan_bawahan,
				a.approver
			FROM master.m_atasan a
			JOIN master.m_title t_atasan ON t_atasan.title_code = a.title_atasan
			JOIN master.m_title t_bawahan ON t_bawahan.title_code = a.title_bawahan
			WHERE a.status = '0' OR a.status = 'Y' OR a.status IS NULL;
		`;

		// 2. Terapkan Aturan Atasan Langsung (Strict Direct Supervisor Elimination)
		// Jika ada relasi (P, S), tapi ada perantara M di mana (P, M) dan (M, S) ada,
		// maka (P, S) adalah relasi berjenjang (kakek-cucu) -> eleminasi dari direct!
		const parentChildPairs = new Set<string>();
		rawHierarchy.forEach((r: any) => {
			parentChildPairs.add(`${r.title_atasan}->${r.title_bawahan}`);
		});

		const directHierarchy = rawHierarchy.filter((r: any) => {
			const P = r.title_atasan;
			const S = r.title_bawahan;

			// Cek apakah ada M di mana (P, M) dan (M, S) ada
			for (const other of rawHierarchy) {
				const M = other.title_bawahan;
				if (other.title_atasan === P && M !== S) {
					if (parentChildPairs.has(`${M}->${S}`)) {
						// P adalah kakek dari S melalui M -> bukan atasan langsung!
						return false;
					}
				}
			}
			return true;
		});

		// 3. Ambil Karyawan Aktif yang Memiliki Jabatan Sebagai Atasan
		const atasanTitles = Array.from(new Set(directHierarchy.map((h: any) => h.title_atasan)));
		const activeAssessors = atasanTitles.length > 0
			? await sql`
				SELECT 
					k.payroll_id, 
					k.nama_karyawan, 
					k.title as title_code, 
					t.title as position_title,
					COALESCE(d.dept_name, 'General') as department
				FROM master.m_karyawan k
				JOIN master.m_title t ON t.title_code = k.title
				LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
				WHERE k.aktif = 'Y' AND k.title IN ${sql(atasanTitles)}
				ORDER BY k.nama_karyawan ASC;
			`
			: [];

		// 4. Ambil Semua Karyawan Aktif untuk Memetakan Anggota Tim Bawahan
		const activeEmployees = await sql`
			SELECT 
				k.payroll_id, 
				k.nama_karyawan, 
				k.title as title_code, 
				t.title as position_title,
				COALESCE(md.div_name, d.dept_name, 'General') as division_name,
				COALESCE(d.dept_name, 'General') as department
			FROM master.m_karyawan k
			JOIN master.m_title t ON t.title_code = k.title
			LEFT JOIN master.m_division md ON md.div_code = k.div_id
			LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
			WHERE k.aktif = 'Y'
			ORDER BY k.nama_karyawan ASC;
		`;

		// 5. Ambil Standar Kompetensi Jabatan (hris.lms_job_competencies)
		const jobStandards = await sql`
			SELECT j.*, COALESCE(j.division, j.department, 'General') as division_name, c.name as competency_name, c.aspect as competency_aspect, cr.title as default_course_title
			FROM hris.lms_job_competencies j
			JOIN hris.lms_competency_library c ON c.code = j.competency_code
			LEFT JOIN hris.lms_courses cr ON cr.id = c.default_course_id
			ORDER BY COALESCE(j.division, j.department), j.position_title, j.competency_code ASC;
		`;

		// 6. Ambil Kamus Kompetensi Lengkap (171 items) untuk Rubrik Indikator Level 1-5
		const competencyLibrary = await sql`
			SELECT code, name, aspect, level_indicators, default_course_id
			FROM hris.lms_competency_library
			ORDER BY code ASC;
		`;

		// 7. Ambil Riwayat Penilaian Asesmen yang Sudah Ada
		const existingAssessments = await sql`
			SELECT a.*, c.name as competency_name
			FROM hris.lms_employee_assessments a
			JOIN hris.lms_competency_library c ON c.code = a.competency_code
			ORDER BY a.assessment_date DESC;
		`;

		// 8. Ambil Evaluasi Pasca-Training Kirkpatrick (Level 3 & Level 4)
		const postTrainingEvals = await sql`
			SELECT 
				e.*, 
				c.title as course_title,
				c.category as course_category,
				k.title as position_title,
				t.title as position_name,
				COALESCE(d.dept_name, 'General') as department
			FROM hris.lms_evaluations_l3_l4 e
			JOIN hris.lms_courses c ON c.id = e.course_id
			LEFT JOIN master.m_karyawan k ON k.payroll_id = e.payroll_id
			LEFT JOIN master.m_title t ON t.title_code = k.title
			LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
			ORDER BY e.id DESC;
		`;

		// 9. Ambil Seluruh Request Pelatihan dari Atasan (Status: PENDING, APPROVED, HOLD)
		const trainingRequests = await sql`
			SELECT * FROM hris.lms_training_requests
			ORDER BY created_at DESC;
		`;

		return {
			currentUser: locals.user || null,
			activeAssessors: activeAssessors.map((a: any) => ({
				payrollId: a.payroll_id,
				name: a.nama_karyawan,
				titleCode: a.title_code,
				positionTitle: a.position_title,
				department: a.department
			})),
			directHierarchy: directHierarchy.map((h: any) => ({
				titleAtasan: h.title_atasan,
				namaJabatanAtasan: h.nama_jabatan_atasan,
				titleBawahan: h.title_bawahan,
				namaJabatanBawahan: h.nama_jabatan_bawahan
			})),
			activeEmployees: activeEmployees.map((e: any) => ({
				payrollId: e.payroll_id,
				name: e.nama_karyawan,
				titleCode: e.title_code,
				positionTitle: e.position_title,
				division: e.division_name || e.department || 'General',
				department: e.department
			})),
			jobStandards: jobStandards.map((j: any) => ({
				id: j.id,
				positionTitle: j.position_title,
				division: j.division_name || j.division || j.department || 'General',
				department: j.department,
				competencyCode: j.competency_code,
				competencyName: j.competency_name,
				competencyAspect: j.competency_aspect,
				requiredLevel: Number(j.required_level),
				defaultCourseTitle: j.default_course_title || '-'
			})),
			competencyLibrary: competencyLibrary.map((c: any) => ({
				code: c.code,
				name: c.name,
				aspect: c.aspect,
				levelIndicators: (() => {
					let raw = typeof c.level_indicators === 'string' ? JSON.parse(c.level_indicators) : c.level_indicators;
					if (Array.isArray(raw)) return raw;
					if (raw && typeof raw === 'object') {
						return [1, 2, 3, 4, 5].map((lvl) => ({
							level: lvl,
							desc: raw[lvl] || raw[String(lvl)] || ''
						}));
					}
					return [];
				})()
			})),
			existingAssessments: existingAssessments.map((a: any) => ({
				id: a.id,
				payrollId: a.payroll_id,
				employeeName: a.employee_name,
				positionTitle: a.position_title,
				department: a.department,
				competencyCode: a.competency_code,
				competencyName: a.competency_name,
				requiredLevel: Number(a.required_level),
				actualLevel: Number(a.actual_level),
				gap: Number(a.gap),
				status: a.status,
				assessorName: a.assessor_name,
				period: a.period || String(new Date().getFullYear()),
				assessmentDate: a.assessment_date ? a.assessment_date.toISOString().split('T')[0] : '',
				notes: a.notes || ''
			})),
			postTrainingEvals: postTrainingEvals.map((e: any) => ({
				id: e.id,
				courseId: e.course_id,
				courseTitle: e.course_title,
				courseCategory: e.course_category || 'Training',
				payrollId: e.payroll_id,
				employeeName: e.employee_name,
				supervisorName: e.supervisor_name,
				positionTitle: e.position_name || e.position_title || 'Staff',
				department: e.department,
				dueDate: e.due_date ? new Date(e.due_date).toISOString().split('T')[0] : '',
				trainingCompletedAt: e.training_completed_at ? new Date(e.training_completed_at).toISOString().split('T')[0] : (e.due_date ? new Date(new Date(e.due_date).getTime() - 90*24*60*60*1000).toISOString().split('T')[0] : ''),
				// Level 3 Fields (Behavior H+3 Bulan)
				l3Status: e.l3_status || 'PENDING',
				l3Answers: e.l3_answers || {},
				l3Feedback: e.l3_feedback || '',
				l3AvgScore: e.l3_avg_score ? Number(e.l3_avg_score) : null,
				l3MaterialScore: e.l3_material_absorption_score || 3,
				l3BehaviorScore: e.behavior_score || 3,
				l3SopScore: e.sop_compliance_score || 3,
				l3Notes: e.l3_notes || e.supervisor_notes || '',
				l3ReviewedAt: e.l3_reviewed_at ? new Date(e.l3_reviewed_at).toISOString().split('T')[0] : '',
				// Level 4 Pre-Test Fields (Baseline 3 Bulan Sebelum Training - SLA 10 Hari)
				l4PreStatus: e.l4_pre_status || 'PENDING',
				l4PreDueDate: e.l4_pre_due_date ? new Date(e.l4_pre_due_date).toISOString().split('T')[0] : (e.training_completed_at ? new Date(new Date(e.training_completed_at).getTime() + 10*24*60*60*1000).toISOString().split('T')[0] : ''),
				l4PreSkillCategory: e.l4_pre_skill_category || 'Technical Skill',
				l4PreMetrics: e.l4_pre_metrics || {},
				l4PreNotes: e.l4_pre_notes || '',
				l4PreReviewedAt: e.l4_pre_reviewed_at ? new Date(e.l4_pre_reviewed_at).toISOString().split('T')[0] : '',
				// Level 4 Post-Test Fields (Dampak Nyata H+3 Bulan)
				l4Status: e.l4_status || 'PENDING',
				l4PostMetrics: e.l4_post_metrics || {},
				l4PostNotes: e.l4_post_notes || '',
				l4PostReviewedAt: e.l4_post_reviewed_at ? new Date(e.l4_post_reviewed_at).toISOString().split('T')[0] : '',
				l4BusinessScore: e.business_impact_score || 4,
				l4ProductivityScore: e.l4_productivity_score || 4,
				l4IncidentNotes: e.incident_reduction_notes || '',
				l4Notes: e.l4_notes || e.supervisor_notes || '',
				l4ReviewedAt: e.l4_reviewed_at ? new Date(e.l4_reviewed_at).toISOString().split('T')[0] : ''
			})),
			trainingRequests: trainingRequests.map((r: any) => ({
				id: r.id,
				deptName: r.dept_name,
				requestedBy: r.requested_by,
				trainingTitle: r.training_title,
				category: r.category,
				urgency: r.urgency || 'NORMAL',
				estimatedParticipants: Number(r.estimated_participants || 1),
				targetCompletionDate: r.target_completion_date ? new Date(r.target_completion_date).toISOString().split('T')[0] : '',
				justification: r.justification || '',
				status: (r.status === 'APPROVED' ? 'APPROVED' : r.status === 'HOLD' ? 'HOLD' : 'PENDING'),
				hrdNotes: r.hrd_notes || '',
				reviewedBy: r.reviewed_by || '',
				reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString().split('T')[0] : '',
				createdAt: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : ''
			})),
			assessmentPeriods: [
				String(new Date().getFullYear()),
				String(new Date().getFullYear() - 1),
				String(new Date().getFullYear() - 2)
			]
		};
	} catch (err: any) {
		logError('DIRECT_ASSESSMENT_LOAD_ERROR', err?.message);
		throw err;
	}
};

export const actions = {
	// Submit Hasil Asesmen Tim Kolektif oleh Atasan Langsung
	submitBatchAssessment: async ({ request }) => {
		const formData = await request.formData();
		const assessorName = formData.get('assessorName')?.toString().trim() || 'Atasan Langsung';
		const period = formData.get('period')?.toString().trim() || String(new Date().getFullYear());
		const positionTitle = formData.get('positionTitle')?.toString().trim();
		const department = formData.get('department')?.toString().trim() || 'General';
		const notes = formData.get('notes')?.toString().trim() || '';
		const evaluationsRaw = formData.get('evaluations')?.toString();

		if (!positionTitle || !evaluationsRaw) {
			return { success: false, message: 'Posisi jabatan dan butir penilaian wajib diisi.' };
		}

		try {
			const evaluations: Array<{
				payrollId: string;
				employeeName: string;
				competencyCode: string;
				requiredLevel: number;
				actualLevel: number;
			}> = JSON.parse(evaluationsRaw);

			if (!Array.isArray(evaluations) || evaluations.length === 0) {
				return { success: false, message: 'Tidak ada data penilaian yang dikirim.' };
			}

			// Ambil mapping default course untuk kompetensi-kompetensi ini
			const libraryRows = await sql`
				SELECT code, default_course_id 
				FROM hris.lms_competency_library;
			`;
			const courseMap = new Map<string, string | null>();
			for (const r of libraryRows) {
				courseMap.set(r.code, r.default_course_id || null);
			}

			let gapCount = 0;
			let qualifiedCount = 0;

			for (const item of evaluations) {
				const gap = Number(item.actualLevel) - Number(item.requiredLevel);
				const status = gap < 0 ? 'Gap Competency' : 'Qualified';
				const defaultCourseId = courseMap.get(item.competencyCode) || null;
				const currentPosTitle = (item as any).positionTitle || positionTitle;
				const currentDept = (item as any).department || department;
				const currentNotes = (item as any).notes?.trim() || notes;

				let trainingStatus = 'NONE';
				let enrollmentId: number | null = null;

				// Jika ada GAP negatif dan ada kursus materi, langsung auto-assign ke lms_enrollments
				if (gap < 0 && defaultCourseId) {
					gapCount++;
					const enrolled = await sql`
						INSERT INTO hris.lms_enrollments (
							course_id, payroll_id, employee_name, status, progress_percent,
							is_tna_gap, competency_code, enrolled_at, deadline
						) VALUES (
							${defaultCourseId}, ${item.payrollId}, ${item.employeeName}, 'ENROLLED', 0,
							TRUE, ${item.competencyCode}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days'
						)
						ON CONFLICT (course_id, payroll_id)
						DO UPDATE SET 
							is_tna_gap = TRUE,
							competency_code = EXCLUDED.competency_code
						RETURNING id;
					`;
					enrollmentId = enrolled[0]?.id || null;
					trainingStatus = 'ASSIGNED';
				} else if (gap >= 0) {
					qualifiedCount++;
				}

				// UPSERT ke hris.lms_employee_assessments dengan constraint uq_emp_comp_period
				await sql`
					INSERT INTO hris.lms_employee_assessments (
						payroll_id, employee_name, position_title, department,
						competency_code, required_level, actual_level, status,
						assessor_name, assessment_date, period, notes,
						assigned_course_id, enrollment_id, training_status
					) VALUES (
						${item.payrollId}, ${item.employeeName}, ${currentPosTitle}, ${currentDept},
						${item.competencyCode}, ${item.requiredLevel}, ${item.actualLevel}, ${status},
						${assessorName}, CURRENT_DATE, ${period}, ${currentNotes},
						${defaultCourseId}, ${enrollmentId}, ${trainingStatus}
					)
					ON CONFLICT (payroll_id, competency_code, period)
					DO UPDATE SET
						actual_level = EXCLUDED.actual_level,
						required_level = EXCLUDED.required_level,
						status = EXCLUDED.status,
						assessor_name = EXCLUDED.assessor_name,
						assessment_date = CURRENT_DATE,
						notes = EXCLUDED.notes,
						assigned_course_id = COALESCE(EXCLUDED.assigned_course_id, hris.lms_employee_assessments.assigned_course_id),
						enrollment_id = COALESCE(EXCLUDED.enrollment_id, hris.lms_employee_assessments.enrollment_id),
						training_status = CASE 
							WHEN EXCLUDED.status = 'Gap Competency' AND EXCLUDED.assigned_course_id IS NOT NULL THEN 'ASSIGNED'
							ELSE hris.lms_employee_assessments.training_status
						END;
				`;
			}

			const targetName = evaluations[0]?.employeeName;
			return {
				success: true,
				message: `Penilaian untuk ${targetName || positionTitle} (Periode ${period}) berhasil disimpan! (${qualifiedCount} Sesuai Standar, ${gapCount} Kesenjangan/GAP otomatis direkomendasikan kursus TNA).`
			};
		} catch (e: any) {
			logError('DIRECT_BATCH_ASSESSMENT_FAIL', e?.message);
			return { success: false, message: `Failed to save direct assessment: ${e?.message || 'Database error'}` };
		}
	},

	// 2. Submit Evaluasi Pasca-Training Level 3 (Behavior 3 Bulan Pasca-Pelatihan - 15 Butir Skala 1-3)
	submitEvaluationL3: async ({ request }) => {
		const formData = await request.formData();
		const evalId = Number(formData.get('evalId'));
		const answersRaw = formData.get('answers')?.toString() || '{}';
		const feedback = formData.get('feedback')?.toString() || '';
		const assessorName = formData.get('assessorName')?.toString() || 'Supervisor';

		if (!evalId) return { success: false, message: 'ID Evaluasi tidak ditemukan.' };

		let answers: Record<string, number> = {};
		try {
			answers = JSON.parse(answersRaw);
		} catch (err) {
			answers = {};
		}

		const values = Object.values(answers).filter((v) => typeof v === 'number' && v > 0);
		const avgScore = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : '3.00';

		try {
			await sql`
				UPDATE hris.lms_evaluations_l3_l4
				SET
					l3_status = 'COMPLETED',
					l3_answers = ${JSON.stringify(answers)}::jsonb,
					l3_feedback = ${feedback},
					l3_avg_score = ${avgScore},
					l3_notes = ${feedback},
					supervisor_notes = COALESCE(supervisor_notes, ${feedback}),
					l3_reviewed_at = CURRENT_TIMESTAMP,
					supervisor_name = ${assessorName}
				WHERE id = ${evalId};
			`;
			return { success: true, message: 'Evaluasi Pasca-Training Level 3 (Behavior 3 Bulan) berhasil disimpan!' };
		} catch (e: any) {
			logError('DIRECT_EVAL_L3_FAIL', e?.message);
			return { success: false, message: 'Gagal menyimpan evaluasi Level 3.' };
		}
	},

	// 3. Submit Evaluasi Pasca-Training Level 4 Post-Test (Dampak Bisnis & Hasil Nyata H+3 Bulan)
	submitEvaluationL4: async ({ request }) => {
		const formData = await request.formData();
		const evalId = Number(formData.get('evalId'));
		const metricsRaw = formData.get('metrics')?.toString() || '{}';
		const notes = formData.get('notes')?.toString() || '';
		const assessorName = formData.get('assessorName')?.toString() || 'Supervisor';

		if (!evalId) return { success: false, message: 'ID Evaluasi tidak ditemukan.' };

		let metrics: Record<string, any> = {};
		try {
			metrics = JSON.parse(metricsRaw);
		} catch (err) {
			metrics = {};
		}

		try {
			await sql`
				UPDATE hris.lms_evaluations_l3_l4
				SET
					l4_status = 'COMPLETED',
					l4_post_metrics = ${JSON.stringify(metrics)}::jsonb,
					l4_post_notes = ${notes},
					l4_post_reviewed_at = CURRENT_TIMESTAMP,
					l4_notes = ${notes},
					l4_reviewed_at = CURRENT_TIMESTAMP,
					status = 'COMPLETED',
					reviewed_at = CURRENT_TIMESTAMP,
					supervisor_name = ${assessorName}
				WHERE id = ${evalId};
			`;
			return { success: true, message: 'Evaluasi Level 4 Post-Test (Dampak 3 Bulan) berhasil disimpan!' };
		} catch (e: any) {
			logError('DIRECT_EVAL_L4_FAIL', e?.message);
			return { success: false, message: 'Gagal menyimpan evaluasi Level 4 Post-Test.' };
		}
	},

	// 4. Submit Evaluasi Pasca-Training Level 4 Pre-Test (Baseline 3 Bulan Sebelum Pelatihan - SLA 10 Hari)
	submitEvaluationL4PreTest: async ({ request }) => {
		const formData = await request.formData();
		const evalId = Number(formData.get('evalId'));
		const skillCategory = formData.get('skillCategory')?.toString() || 'Technical Skill';
		const metricsRaw = formData.get('metrics')?.toString() || '{}';
		const notes = formData.get('notes')?.toString() || '';
		const assessorName = formData.get('assessorName')?.toString() || 'Supervisor';

		if (!evalId) return { success: false, message: 'ID Evaluasi tidak ditemukan.' };

		let metrics: Record<string, any> = {};
		try {
			metrics = JSON.parse(metricsRaw);
		} catch (err) {
			metrics = {};
		}

		try {
			await sql`
				UPDATE hris.lms_evaluations_l3_l4
				SET
					l4_pre_status = 'COMPLETED',
					l4_pre_skill_category = ${skillCategory},
					l4_pre_metrics = ${JSON.stringify(metrics)}::jsonb,
					l4_pre_notes = ${notes},
					l4_pre_reviewed_at = CURRENT_TIMESTAMP,
					supervisor_name = ${assessorName}
				WHERE id = ${evalId};
			`;
			return { success: true, message: 'Evaluasi Level 4 Pre-Test (Baseline 3 Bulan Sebelum Training) berhasil disimpan!' };
		} catch (e: any) {
			logError('DIRECT_EVAL_L4_PRE_FAIL', e?.message);
			return { success: false, message: 'Gagal menyimpan evaluasi Level 4 Pre-Test.' };
		}
	},

	// 5. Submit Request Pelatihan dari Atasan ke LMS (Status: PENDING)
	submitTrainingRequest: async ({ request }) => {
		const formData = await request.formData();
		const deptName = formData.get('deptName')?.toString().trim();
		const requestedBy = formData.get('requestedBy')?.toString().trim();
		const trainingTitle = formData.get('trainingTitle')?.toString().trim();
		const category = formData.get('category')?.toString().trim() || 'Technical Competency';
		const urgency = formData.get('urgency')?.toString().trim() || 'NORMAL';
		const estimatedParticipants = Number(formData.get('estimatedParticipants')) || 1;
		const targetCompletionDate = formData.get('targetCompletionDate')?.toString().trim() || null;
		const justification = formData.get('justification')?.toString().trim();

		if (!deptName || !requestedBy || !trainingTitle || !justification) {
			return { success: false, message: 'Harap lengkapi semua kolom wajib usulan pelatihan.' };
		}

		const id = `REQ-TRN-${Date.now().toString().slice(-4)}`;

		try {
			await sql`
				INSERT INTO hris.lms_training_requests (
					id, dept_name, requested_by, training_title, category, urgency,
					estimated_participants, target_completion_date, justification, status, created_at
				) VALUES (
					${id}, ${deptName}, ${requestedBy}, ${trainingTitle}, ${category}, ${urgency},
					${estimatedParticipants}, ${targetCompletionDate || null}, ${justification}, 'PENDING', CURRENT_TIMESTAMP
				);
			`;
			return {
				success: true,
				message: `Usulan pelatihan "${trainingTitle}" (${id}) berhasil dikirimkan ke HRD dengan status PENDING.`
			};
		} catch (e: any) {
			logError('SUBMIT_TRAINING_REQUEST_FAIL', e?.message);
			return { success: false, message: `Gagal mengirim usulan pelatihan: ${e?.message || 'Database error'}` };
		}
	}
} satisfies Actions;
