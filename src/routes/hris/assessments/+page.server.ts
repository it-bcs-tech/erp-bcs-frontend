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
				COALESCE(d.dept_name, 'General') as department
			FROM master.m_karyawan k
			JOIN master.m_title t ON t.title_code = k.title
			LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
			WHERE k.aktif = 'Y'
			ORDER BY k.nama_karyawan ASC;
		`;

		// 5. Ambil Standar Kompetensi Jabatan (hris.lms_job_competencies)
		const jobStandards = await sql`
			SELECT j.*, c.name as competency_name, c.aspect as competency_aspect, cr.title as default_course_title
			FROM hris.lms_job_competencies j
			JOIN hris.lms_competency_library c ON c.code = j.competency_code
			LEFT JOIN hris.lms_courses cr ON cr.id = c.default_course_id
			ORDER BY j.department, j.position_title, j.competency_code ASC;
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
				department: e.department
			})),
			jobStandards: jobStandards.map((j: any) => ({
				id: j.id,
				positionTitle: j.position_title,
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
				period: a.period || '2026-S1',
				assessmentDate: a.assessment_date ? a.assessment_date.toISOString().split('T')[0] : '',
				notes: a.notes || ''
			})),
			assessmentPeriods: ['2026-S1', '2026-S2', '2025-Annual']
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
		const period = formData.get('period')?.toString().trim() || '2026-S1';
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
						${item.payrollId}, ${item.employeeName}, ${positionTitle}, ${department},
						${item.competencyCode}, ${item.requiredLevel}, ${item.actualLevel}, ${status},
						${assessorName}, CURRENT_DATE, ${period}, ${notes},
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

			return {
				success: true,
				message: `Direct assessment for period ${period} (${positionTitle}) successfully saved! (${qualifiedCount} Qualified, ${gapCount} Gap assigned to TNA training).`
			};
		} catch (e: any) {
			logError('DIRECT_BATCH_ASSESSMENT_FAIL', e?.message);
			return { success: false, message: `Failed to save direct assessment: ${e?.message || 'Database error'}` };
		}
	}
} satisfies Actions;
