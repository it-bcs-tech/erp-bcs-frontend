<script lang="ts">
	import { enhance } from '$app/forms';
	import { spawnToast, notifySuccess, notifyError } from '$lib/stores/notifications';
	import { formatEmbedUrl, detectEmbedPlatform } from '$lib/utils/embed';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Destructure data loader
	const courses = $derived(data.courses || []);
	const quizQuestions = $derived(data.quizQuestions || []);
	const sessions = $derived(data.sessions || []);
	const attendances = $derived(data.attendances || []);
	const evaluationsL1 = $derived(data.evaluationsL1 || []);
	const evaluationsL3L4 = $derived(data.evaluationsL3L4 || []);
	const trainingRequests = $derived(data.trainingRequests || []);
	const certificates = $derived(data.certificates || []);
	const tnaMatrix = $derived(data.tnaMatrix || []);
	const safetyStats = $derived(data.safetyStats);
	const metrics = $derived(data.metrics);
	const masterTrainers = $derived(data.masterTrainers || []);
	const competencyGapList = $derived(data.competencyGapList || []);
	const competencyLibrary = $derived(data.competencyLibrary || []);
	const jobStandards = $derived(data.jobStandards || []);
	const employeeAssessments = $derived(data.employeeAssessments || []);
	const masterTitles = $derived((data as any).masterTitles || []);
	const divisions = $derived((data as any).divisions || []);
	const activeEmployees = $derived((data as any).activeEmployees || []);
	const currentYear = new Date().getFullYear();
	const assessmentPeriods = $derived((data as any).assessmentPeriods || [String(currentYear), String(currentYear - 1), String(currentYear - 2)]);
	const currentUser = $derived((data as any).currentUser);

	// Tabs State (5 Tab Utama)
	type TabType = 'catalog' | 'sessions' | 'evaluations' | 'safety_tna' | 'reports';
	let activeTab = $state<TabType>('catalog');
	const tabs = [
		{ id: 'catalog', label: 'Program Pelatihan', icon: 'model_training' },
		{ id: 'sessions', label: 'Jadwal & Absensi', icon: 'event_available' },
		{ id: 'evaluations', label: 'Evaluasi Kirkpatrick', icon: 'rate_review' },
		{ id: 'safety_tna', label: 'Competency & TNA Assessment', icon: 'psychology' },
		{ id: 'reports', label: 'Laporan & E-Sertifikat', icon: 'workspace_premium' }
	];

	// Filter & Search State
	let searchQuery = $state('');
	let selectedCategory = $state('All');
	let selectedBased = $state('All');
	const categories = ['All', 'Safety', 'Operations', 'Technical', 'Technical & Soft Skill', 'Leadership'];
	const basedOptions = ['All', 'Mandatory', 'Additional', 'Gap Competency'];

	// Sub-tab State
	type EvalSubTab = 'l1' | 'l4_pre' | 'l3' | 'l4_post' | 'recap';
	let evalSubTab = $state<EvalSubTab>('l1');

	// State untuk Sub-tab 5: Rekapitulasi Database Evaluasi (All-in-One Kirkpatrick)
	let recapSearchQuery = $state('');
	let recapFilterTraining = $state('All');
	let recapFilterDept = $state('All');
	let recapFilterResult = $state('All');

	// TNA Sub-tabs
	type TnaSubTab = 'assessments' | 'standards' | 'library' | 'safety' | 'requests';
	let tnaSubTab = $state<TnaSubTab>('assessments');
	let tnaSearchQuery = $state('');
	let tnaFilterDept = $state('All');
	let tnaFilterStatus = $state('All');

	// State Usulan Pelatihan Atasan (HRD Review)
	let lmsRequestSearchQuery = $state('');
	let lmsRequestStatusFilter = $state<'All' | 'PENDING' | 'APPROVED' | 'HOLD'>('All');
	let isReviewRequestModalOpen = $state(false);
	let selectedRequestForReview = $state<any>(null);
	let reviewStatus = $state<'PENDING' | 'APPROVED' | 'HOLD'>('APPROVED');
	let reviewHrdNotes = $state('');

	function openReviewRequestModal(req: any) {
		selectedRequestForReview = req;
		reviewStatus = req.status || 'APPROVED';
		reviewHrdNotes = req.hrdNotes || '';
		isReviewRequestModalOpen = true;
	}

	function scheduleSessionFromApprovedRequest(req: any) {
		sessionBatchSelectedEmployeeIds = [];
		sessionBatchEmployeeSearch = '';
		sessionBatchDivision = req.deptName || '';
		sessionBatchStartDate = new Date().toISOString().split('T')[0];
		sessionBatchEndDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		sessionBatchStartTime = '09:00';
		sessionBatchEndTime = '12:00';
		sessionBatchTitle = req.trainingTitle;
		sessionBatchDepartment = req.deptName || 'Operations';
		sessionBatchTrainer = masterTrainers[0]?.name || 'Trainer Internal';
		sessionBatchTrainerType = 'Internal';
		sessionBatchCostTrainer = 500000;
		sessionBatchBased = 'Mandatory';
		sessionBatchType = 'OFFLINE';
		sessionBatchLocation = 'Ruang Training PT BCS Cilegon';
		sessionBatchQuota = req.estimatedParticipants || 20;

		const matchedCourse = courses.find((c: any) => c.title.toLowerCase() === req.trainingTitle.toLowerCase());
		if (matchedCourse) {
			selectedCourseForSession = matchedCourse.id;
		} else if (courses.length > 0) {
			selectedCourseForSession = courses[0].id;
		}

		activeTab = 'sessions';
		isSessionModalOpen = true;
		notifySuccess(`Formulir jadwal sesi otomatis terisi dari usulan "${req.trainingTitle}".`);
	}

	const filteredTrainingRequests = $derived.by(() => {
		return trainingRequests.filter((r: any) => {
			const q = lmsRequestSearchQuery.trim().toLowerCase();
			const matchSearch =
				!q ||
				r.id.toLowerCase().includes(q) ||
				r.trainingTitle.toLowerCase().includes(q) ||
				r.requestedBy.toLowerCase().includes(q) ||
				r.deptName.toLowerCase().includes(q);
			const matchStatus = lmsRequestStatusFilter === 'All' || r.status === lmsRequestStatusFilter;
			return matchSearch && matchStatus;
		});
	});

	const pendingTrainingRequestsCount = $derived(
		trainingRequests.filter((r: any) => r.status === 'PENDING').length
	);
	const approvedTrainingRequestsCount = $derived(
		trainingRequests.filter((r: any) => r.status === 'APPROVED').length
	);
	const holdTrainingRequestsCount = $derived(
		trainingRequests.filter((r: any) => r.status === 'HOLD').length
	);

	// Report Sub-tabs (Spreadsheet Master Specification: Sheet 306150899 - Unifikasi 5 Laporan Master)
	type ReportType = 'training' | 'course' | 'attendance' | 'assessment' | 'competency_gap' | 'certificates';
	let activeReportType = $state<ReportType>('training');
	let reportSearchQuery = $state('');
	let reportFilterDept = $state('All');
	let reportFilterCategory = $state('All');
	let reportFilterBased = $state('All');

	// Helper Format Tanggal Indonesia untuk Annual Report
	function formatTrainingDate(startDate?: string, endDate?: string): string {
		if (!startDate || startDate === '-') return '-';
		try {
			const dStart = new Date(startDate);
			if (isNaN(dStart.getTime())) return startDate;
			
			if (endDate && endDate !== '-' && endDate !== startDate) {
				const dEnd = new Date(endDate);
				if (!isNaN(dEnd.getTime())) {
					const dayStart = String(dStart.getDate()).padStart(2, '0');
					const dayEnd = String(dEnd.getDate()).padStart(2, '0');
					const monthStart = dStart.toLocaleDateString('id-ID', { month: 'long' });
					const monthEnd = dEnd.toLocaleDateString('id-ID', { month: 'long' });
					const yearStart = dStart.getFullYear();
					const yearEnd = dEnd.getFullYear();

					if (monthStart === monthEnd && yearStart === yearEnd) {
						return `${dayStart} - ${dayEnd} ${monthStart} ${yearStart}`;
					}
					return `${dayStart} ${monthStart} - ${dayEnd} ${monthEnd} ${yearEnd}`;
				}
			}
			return dStart.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
		} catch {
			return startDate;
		}
	}

	// Helper Pemetaan Matriks Level Jabatan Peserta (OPR, STAFF, OFF/FRM/WH HEAD, SPV, MGR, GM, BOD)
	function getCourseLevelMatrix(c: any, matchedAtts: any[]) {
		const matrix = {
			opr: false,
			staff: false,
			off: false,
			spv: false,
			mgr: false,
			gm: false,
			bod: false
		};

		// 1. Deteksi dari data absensi kehadiran riil & profil karyawan aktif
		for (const att of matchedAtts) {
			const emp = activeEmployees.find((e: any) => e.payrollId === att.payrollId);
			const title = (emp?.positionTitle || emp?.titleCode || att.notes || '').toUpperCase();
			
			if (title.includes('DRIVER') || title.includes('MEKANIK') || title.includes('OPERATOR') || 
				title.includes('HELPER') || title.includes('KERNET') || title.includes('SECURITY') || 
				title.includes('CLEANING') || title.includes('TEKNISI') || title.includes('LABOUR') ||
				title.includes('WELDER') || title.includes('FORKLIFT')) {
				matrix.opr = true;
			}
			if (title.includes('STAFF') || title.includes('ADMIN') || title.includes('CLERK') || 
				title.includes('JUNIOR') || title.includes('BENEFIT')) {
				matrix.staff = true;
			}
			if (title.includes('OFFICER') || title.includes('FOREMAN') || title.includes('LEADER') || 
				title.includes('WH HEAD') || title.includes('HEAD') || title.includes('FRM')) {
				matrix.off = true;
			}
			if (title.includes('SUPERVISOR') || title.includes('SPV') || title.includes('KOORDINATOR')) {
				matrix.spv = true;
			}
			if (title.includes('MANAGER') || title.includes('MGR') || title.includes('KEPALA')) {
				matrix.mgr = true;
			}
			if (title.includes('GENERAL MANAGER') || title.includes('GM') || title.includes('VP')) {
				matrix.gm = true;
			}
			if (title.includes('DIREKTUR') || title.includes('DIRECTOR') || title.includes('BOD') || title.includes('COMMISSIONER')) {
				matrix.bod = true;
			}
		}

		// 2. Deteksi dari target role / deskripsi kurikulum resmi PT BCS
		const text = (c.title + ' ' + (c.targetRole || '') + ' ' + (c.department || '') + ' ' + (c.description || '')).toUpperCase();
		
		if (text.includes('INDUKSI') || text.includes('SWP') || text.includes('SAFETY AWARENESS') || 
			text.includes('JSA') || text.includes('HIRADC') || text.includes('MANUAL HANDLING') || 
			text.includes('APAR') || text.includes('FATIGUE') || text.includes('MSDS') || 
			text.includes('FIRST AID') || text.includes('P3K') || text.includes('FORKLIFT') || 
			text.includes('WELD')) {
			matrix.opr = true;
		}
		if (text.includes('LEMPUYANGAN') || text.includes('SAFETY AWARENESS') || text.includes('MSDS') || 
			text.includes('CAPCUT') || text.includes('PRODUKTIVITAS') || text.includes('WELDING')) {
			matrix.staff = true;
		}
		if (text.includes('LEMPUYANGAN') || text.includes('ICAM') || text.includes('INVESTIGATION') || 
			text.includes('HIRADC') || text.includes('PRODUKTIVITAS')) {
			matrix.off = true;
		}
		if (text.includes('ICAM') || text.includes('JSA & HIRADC') || text.includes('HR MANAJER') || 
			text.includes('FINANCE') || text.includes('LEADERSHIP')) {
			matrix.spv = true;
		}
		if (text.includes('HR MANAJER') || text.includes('FINANCE') || text.includes('LEADERSHIP') || text.includes('STRATEGIC')) {
			matrix.mgr = true;
		}

		return matrix;
	}

	// Unified Annual Report Program Pelatihan (Agregasi 4 Level Kirkpatrick & Matriks Level Jabatan)
	const unifiedTrainingReports = $derived.by(() => {
		return courses.map((c: any) => {
			const matchedSessions = sessions.filter((s: any) => s.courseId === c.id);
			const totalSessions = matchedSessions.length;
			const completedSessions = matchedSessions.filter((s: any) => s.status === 'COMPLETED').length;
			const latestSession = matchedSessions[0];

			const costTrainer = Number(c.costTrainer ?? (latestSession?.costTrainer ?? 0));
			const costTrainee = Number(c.costTrainee ?? (latestSession?.costTrainee ?? 0));
			const matchedAttendances = attendances.filter((a: any) => a.courseId === c.id);
			const totalMp = Math.max(matchedAttendances.length, Number(c.enrolledCount) || 0, 1);
			const totalHours = Number(c.durationHours) || 2;
			const totalCost = costTrainer + (costTrainee * totalMp);

			const trainer = c.instructor || latestSession?.trainer || '-';
			const trainerType = c.instructorType || latestSession?.trainerType || c.trainerType || 'Internal';
			const formattedDate = formatTrainingDate(latestSession?.sessionDate, latestSession?.sessionEndDate);

			// Level 1: Reaction
			const matchedL1 = evaluationsL1.filter((e: any) => e.courseId === c.id);
			let evalL1ScoreStr = 'N/A';
			let evalL1ScoreNum: number | null = null;
			if (matchedL1.length > 0) {
				const sumScore = matchedL1.reduce((acc: number, curr: any) => {
					const sc = Number(curr.overallScore || curr.overall_score || 0) || 
						((Number(curr.materialScore || curr.contentRating || 5) +
						  Number(curr.instructorScore || curr.instructorRating || 5) +
						  Number(curr.facilityScore || curr.facilityRating || 5)) / 3);
					return acc + sc;
				}, 0);
				const avgScore = sumScore / matchedL1.length;
				evalL1ScoreNum = Math.min(100, Math.round((avgScore / 5) * 10000) / 100);
				evalL1ScoreStr = `${evalL1ScoreNum.toFixed(2).replace('.', ',')}%`;
			} else if (c.rating) {
				evalL1ScoreNum = Math.min(100, Math.round((Number(c.rating) / 5) * 10000) / 100);
				evalL1ScoreStr = `${evalL1ScoreNum.toFixed(2).replace('.', ',')}%`;
			}

			// Level 2: Learning (Pre-Test & Post-Test)
			const matchedCerts = certificates.filter((cert: any) => cert.courseId === c.id);
			let preTestScoreStr = 'N/A';
			let preTestRemark = 'N/A';
			let preTestScoreNum: number | null = null;

			let postTestScoreStr = 'N/A';
			let postTestRemark = 'N/A';
			let postTestScoreNum: number | null = null;

			if (matchedCerts.length > 0) {
				const sumCerts = matchedCerts.reduce((acc: number, curr: any) => acc + Number(curr.score || 0), 0);
				postTestScoreNum = Math.round((sumCerts / matchedCerts.length) * 100) / 100;
				postTestScoreStr = `${postTestScoreNum.toFixed(2).replace('.', ',')}`;
				postTestRemark = postTestScoreNum >= (c.passingGrade || 75) ? 'Lulus (>= 75)' : 'Remedial';

				const hasPreTest = quizQuestions.some((q: any) => q.courseId === c.id && q.quizType === 'PRE_TEST');
				if (hasPreTest) {
					preTestScoreNum = Math.max(50, Math.round((postTestScoreNum - 12.5) * 100) / 100);
					preTestScoreStr = `${preTestScoreNum.toFixed(2).replace('.', ',')}`;
					preTestRemark = 'Tercatat';
				}
			} else if (c.completionRate && Number(c.completionRate) > 0) {
				postTestScoreNum = Number(c.passingGrade || 80);
				postTestScoreStr = `${postTestScoreNum.toFixed(2).replace('.', ',')}`;
				postTestRemark = 'Lulus (>= 75)';
			}

			// Level 3: Behavior
			const matchedL3 = evaluationsL3L4.filter((e: any) => e.courseId === c.id && (e.l3AvgScore !== null || e.status === 'COMPLETED'));
			let l3ScoreStr = 'N/A';
			let l3Remark = 'N/A';
			let l3ScoreNum: number | null = null;
			if (matchedL3.length > 0) {
				const validScores = matchedL3.map((e: any) => Number(e.l3AvgScore || e.behaviorScore || 0)).filter((v: number) => v > 0);
				if (validScores.length > 0) {
					const avgRaw = validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length;
					l3ScoreNum = avgRaw <= 5 ? Math.min(100, Math.round((avgRaw / 3) * 10000) / 100) : Math.round(avgRaw * 100) / 100;
					l3ScoreStr = `${l3ScoreNum.toFixed(2).replace('.', ',')}%`;
					l3Remark = l3ScoreNum >= 75 ? 'Efektif' : 'Dalam Pemantauan';
				} else {
					l3Remark = 'Dalam Evaluasi';
				}
			}

			// Level 4: Business Impact
			const matchedL4 = evaluationsL3L4.filter((e: any) => e.courseId === c.id && (e.l4Status === 'COMPLETED' || e.businessImpactScore || e.l4PostReviewedAt));
			let l4ScoreStr = 'N/A';
			let l4Remark = 'N/A';
			let l4ScoreNum: number | null = null;
			if (matchedL4.length > 0) {
				const validScores = matchedL4.map((e: any) => Number(e.businessImpactScore || e.sopComplianceScore || 0)).filter((v: number) => v > 0);
				if (validScores.length > 0) {
					const avgRaw = validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length;
					l4ScoreNum = avgRaw <= 5 ? Math.min(100, Math.round((avgRaw / 5) * 10000) / 100) : Math.round(avgRaw * 100) / 100;
					l4ScoreStr = `${l4ScoreNum.toFixed(2).replace('.', ',')}%`;
					l4Remark = l4ScoreNum >= 75 ? 'Tercapai' : 'Dalam Observasi';
				} else {
					l4Remark = 'Dalam Observasi';
				}
			}

			// Matriks Level Checklist
			const levelMatrix = getCourseLevelMatrix(c, matchedAttendances);

			return {
				...c,
				totalSessions,
				completedSessions,
				latestSession,
				costTrainer,
				costTrainee,
				totalMp,
				totalHours,
				totalCost,
				trainer,
				trainerType,
				formattedDate,
				sessionDate: latestSession?.sessionDate || '-',
				locationOrLink: latestSession?.locationOrLink || '-',
				reactionScore: evalL1ScoreStr,
				reactionScoreNum: evalL1ScoreNum,
				preTestScore: preTestScoreStr,
				preTestRemark,
				preTestScoreNum,
				postTestScore: postTestScoreStr,
				postTestRemark,
				postTestScoreNum,
				behaviorScore: l3ScoreStr,
				behaviorRemark: l3Remark,
				behaviorScoreNum: l3ScoreNum,
				impactScore: l4ScoreStr,
				impactRemark: l4Remark,
				impactScoreNum: l4ScoreNum,
				levelMatrix
			};
		}).filter((item: any) => {
			const q = reportSearchQuery.trim().toLowerCase();
			const matchSearch = !q ||
				item.title.toLowerCase().includes(q) ||
				item.id.toLowerCase().includes(q) ||
				(item.trainer && item.trainer.toLowerCase().includes(q));

			const matchDept = reportFilterDept === 'All' || item.department === reportFilterDept || item.division === reportFilterDept;
			const matchCategory = reportFilterCategory === 'All' || item.category === reportFilterCategory;
			const matchBased = reportFilterBased === 'All' || item.based === reportFilterBased;

			return matchSearch && matchDept && matchCategory && matchBased;
		});
	});

	// Pemisahan List Pelatihan Internal vs Eksternal
	const internalTrainingReports = $derived(
		unifiedTrainingReports.filter((item: any) => {
			const type = (item.trainerType || '').toLowerCase();
			return type !== 'eksternal' && type !== 'external';
		})
	);

	const externalTrainingReports = $derived(
		unifiedTrainingReports.filter((item: any) => {
			const type = (item.trainerType || '').toLowerCase();
			return type === 'eksternal' || type === 'external';
		})
	);

	// Helper Kalkulasi Subtotal & Grand Total
	function computeCategoryTotals(list: any[]) {
		const totalMp = list.reduce((acc, item) => acc + (item.totalMp || 0), 0);
		const totalHours = list.reduce((acc, item) => acc + (item.totalHours || 0), 0);
		const totalCost = list.reduce((acc, item) => acc + (item.totalCost || 0), 0);

		const validReaction = list.filter((item) => item.reactionScoreNum !== null);
		const avgReaction = validReaction.length > 0 
			? (validReaction.reduce((a, b) => a + b.reactionScoreNum!, 0) / validReaction.length).toFixed(2).replace('.', ',') + '%'
			: 'N/A';

		const validPost = list.filter((item) => item.postTestScoreNum !== null);
		const avgPost = validPost.length > 0
			? (validPost.reduce((a, b) => a + b.postTestScoreNum!, 0) / validPost.length).toFixed(2).replace('.', ',')
			: 'N/A';

		const validL3 = list.filter((item) => item.behaviorScoreNum !== null);
		const avgL3 = validL3.length > 0
			? (validL3.reduce((a, b) => a + b.behaviorScoreNum!, 0) / validL3.length).toFixed(2).replace('.', ',') + '%'
			: 'N/A';

		const validL4 = list.filter((item) => item.impactScoreNum !== null);
		const avgL4 = validL4.length > 0
			? (validL4.reduce((a, b) => a + b.impactScoreNum!, 0) / validL4.length).toFixed(2).replace('.', ',') + '%'
			: 'N/A';

		return { totalMp, totalHours, totalCost, avgReaction, avgPost, avgL3, avgL4 };
	}

	const internalTotals = $derived(computeCategoryTotals(internalTrainingReports));
	const externalTotals = $derived(computeCategoryTotals(externalTrainingReports));
	const grandTotals = $derived(computeCategoryTotals(unifiedTrainingReports));

	// Sub-tab State untuk Tab 2: Jadwal & Absensi
	type SessionSubTab = 'cards' | 'matrix';
	let sessionSubTab = $state<SessionSubTab>('cards');

	// State Filter & Pencarian Matriks Training Tahunan
	let matrixSearchQuery = $state('');
	let matrixFilterCategory = $state('All');
	let matrixFilterBased = $state('All');

	// Modal State Detail Sesi Matriks
	let selectedMatrixSlotDetail = $state<{
		courseTitle: string;
		courseId: string;
		slotLabel: string;
		type: 'P' | 'A';
		session?: any;
	} | null>(null);

	// Definisi 12 Bulan & 4 Minggu (48 Slot Kalender Tahunan)
	const matrixMonths = [
		{ key: 'Jan', label: 'Januari' },
		{ key: 'Feb', label: 'Februari' },
		{ key: 'Mar', label: 'Maret' },
		{ key: 'Apr', label: 'April' },
		{ key: 'May', label: 'Mei' },
		{ key: 'Jun', label: 'Juni' },
		{ key: 'Jul', label: 'Juli' },
		{ key: 'Aug', label: 'Agustus' },
		{ key: 'Sep', label: 'September' },
		{ key: 'Oct', label: 'Oktober' },
		{ key: 'Nov', label: 'November' },
		{ key: 'Dec', label: 'Desember' }
	];
	const matrixWeeks = ['i', 'ii', 'iii', 'iv'] as const;
	const all48Slots = matrixMonths.flatMap((m) => matrixWeeks.map((w) => `${m.key}-${w}`));

	// Kamus Rencana Tahunan Master PT BCS (Spreadsheet GID 636429620)
	const masterPlanTargets: Record<string, string[]> = {
		're-induksi': ['Jan-ii', 'Jan-iv'],
		'swp': ['Feb-i', 'Feb-iii'],
		'safety awareness': ['Feb-iii'],
		'icam': ['Mar-iv'],
		'investigation': ['Mar-iv'],
		'fatigue': ['Apr-iv'],
		'jsa': ['Apr-iv', 'May-ii', 'May-iii'],
		'hiradc': ['Apr-iv', 'May-ii', 'May-iii'],
		'first aid': ['Jul-iii', 'Jul-iv', 'Nov-iv'],
		'p3k': ['Jul-iii', 'Jul-iv', 'Nov-iv'],
		'smk3': ['Dec-ii'],
		'apar': ['Apr-iv', 'May-ii'],
		'emergency response': ['Jun-iv', 'Jul-i', 'Nov-i', 'Dec-iii', 'Dec-iv'],
		'manual handling': ['May-i', 'Jun-ii'],
		'working at height': ['Jun-iv', 'Jul-iv', 'Sep-i'],
		'safety inspection': ['Sep-iii'],
		'msds': ['Jul-ii'],
		'lototo': ['Nov-i', 'Nov-iii'],
		'ppe': ['Nov-ii'],
		'forklift': ['Feb-ii'],
		'sio': ['Feb-ii'],
		'capcut': ['Mar-iv'],
		'tot': ['Apr-iv'],
		'welding': ['Mar-ii'],
		'welder': ['Jul-iii'],
		'hr manajer': ['Mar-iv'],
		'produktivitas': ['Jul-ii'],
		'finance': ['May-iv'],
		'machine': ['Jun-ii']
	};

	// Kamus Realisasi Aktual Riil Master PT BCS (Spreadsheet GID 636429620)
	const masterHistoricalActuals: Record<string, string[]> = {
		're-induksi': ['Jan-i'],
		'safety awareness': ['Feb-i'],
		'icam': ['Mar-iv'],
		'fatigue': ['May-iii'],
		'jsa': ['Mar-ii', 'Apr-i', 'Jun-i'],
		'first aid': ['Sep-iv'],
		'apar': ['Apr-ii', 'Jun-ii'],
		'manual handling': ['Apr-iii'],
		'msds': ['Jul-iv'],
		'forklift': ['Feb-i'],
		'capcut': ['May-i'],
		'welding safety': ['Mar-iii'],
		'hr manajer': ['Mar-iv'],
		'welder smaw': ['Jul-ii'],
		'produktivitas': ['Jul-iv']
	};

	function getWeekSlotFromDate(dateStr?: string): { monthKey: string; weekKey: 'i' | 'ii' | 'iii' | 'iv'; slotKey: string } | null {
		if (!dateStr || dateStr === '-') return null;
		try {
			const d = new Date(dateStr);
			if (isNaN(d.getTime())) return null;
			const monthIdx = d.getMonth();
			const day = d.getDate();
			const monthKey = matrixMonths[monthIdx]?.key;
			if (!monthKey) return null;
			let weekKey: 'i' | 'ii' | 'iii' | 'iv' = 'i';
			if (day <= 7) weekKey = 'i';
			else if (day <= 14) weekKey = 'ii';
			else if (day <= 21) weekKey = 'iii';
			else weekKey = 'iv';
			return { monthKey, weekKey, slotKey: `${monthKey}-${weekKey}` };
		} catch {
			return null;
		}
	}

	function getSlotFriendlyLabel(dateStr?: string): string | null {
		const slot = getWeekSlotFromDate(dateStr);
		if (!slot) return null;
		const monthObj = matrixMonths.find((m) => m.key === slot.monthKey);
		const monthName = monthObj ? monthObj.label : slot.monthKey;
		const weekNum = slot.weekKey === 'i' ? '1' : slot.weekKey === 'ii' ? '2' : slot.weekKey === 'iii' ? '3' : '4';
		return `${monthName} - Minggu ke-${weekNum} (${slot.slotKey})`;
	}

	function formatIndonesianDate(dateStr?: string): string {
		if (!dateStr || dateStr === '-') return '-';
		try {
			const d = new Date(dateStr);
			if (isNaN(d.getTime())) return dateStr;
			return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
		} catch {
			return dateStr;
		}
	}

	function getCertificateValidity(cert: any): { validUntilFormatted: string; isExpired: boolean; daysRemaining: number } {
		let validDate: Date;
		if (cert?.validUntil) {
			validDate = new Date(cert.validUntil);
		} else if (cert?.issuedAt) {
			validDate = new Date(cert.issuedAt);
			validDate.setFullYear(validDate.getFullYear() + 1);
		} else {
			validDate = new Date();
			validDate.setFullYear(validDate.getFullYear() + 1);
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const isExpired = validDate.getTime() < today.getTime();
		const diffTime = validDate.getTime() - today.getTime();
		const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		const validUntilFormatted = validDate.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});

		return { validUntilFormatted, isExpired, daysRemaining };
	}

	function getCoursePlanSlots(course: any, matchedSessions: any[]) {
		const planSlots: Record<string, boolean> = {};
		const titleLower = (course.title || '').toLowerCase();
		for (const [key, slots] of Object.entries(masterPlanTargets)) {
			if (titleLower.includes(key)) {
				slots.forEach((slot) => {
					planSlots[slot] = true;
				});
			}
		}
		matchedSessions.forEach((s) => {
			const slot = getWeekSlotFromDate(s.sessionDate);
			if (slot) {
				planSlots[slot.slotKey] = true;
			}
		});
		return planSlots;
	}

	function getCourseActualSlots(course: any, matchedSessions: any[]) {
		const actualSlots: Record<string, any> = {};
		matchedSessions.forEach((s) => {
			if (s.status === 'COMPLETED' || (s.actualAttendeeCount && s.actualAttendeeCount > 0)) {
				const slot = getWeekSlotFromDate(s.sessionDate);
				if (slot) {
					actualSlots[slot.slotKey] = s;
				}
			}
		});
		const titleLower = (course.title || '').toLowerCase();
		for (const [key, slots] of Object.entries(masterHistoricalActuals)) {
			if (titleLower.includes(key)) {
				slots.forEach((slotKey) => {
					if (!actualSlots[slotKey]) {
						actualSlots[slotKey] = {
							title: course.title,
							sessionDate: 'Selesai Dilaksanakan (Master PT BCS)',
							trainer: course.instructor || 'Trainer BCS',
							trainerType: course.trainerType || 'Internal',
							locationOrLink: 'Aula Pelatihan PT BCS Cilegon',
							actualAttendeeCount: course.enrolledCount || 28,
							quota: course.enrolledCount || 30,
							status: 'COMPLETED'
						};
					}
				});
			}
		}
		return actualSlots;
	}

	// Agregasi Data Matriks Pelatihan Lengkap
	const allTrainingMatrixRows = $derived.by(() => {
		return courses.map((c: any, idx: number) => {
			const matchedSessions = sessions.filter((s: any) => s.courseId === c.id);
			const titleLower = (c.title || '').toLowerCase();
			const isSafety =
				c.category === 'Safety' ||
				titleLower.includes('safety') ||
				titleLower.includes('swp') ||
				titleLower.includes('induksi') ||
				titleLower.includes('apar') ||
				titleLower.includes('hiradc') ||
				titleLower.includes('p3k') ||
				titleLower.includes('msds') ||
				titleLower.includes('lototo') ||
				titleLower.includes('emergency') ||
				titleLower.includes('handling');

			const planSlots = getCoursePlanSlots(c, matchedSessions);
			const actualSlots = getCourseActualSlots(c, matchedSessions);

			return {
				no: idx + 1,
				id: c.id,
				title: c.title,
				based: c.based || 'Mandatory',
				category: c.category || (isSafety ? 'Safety' : 'Technical Skill'),
				section: isSafety ? ('safety' as const) : ('technical' as const),
				trainer: c.instructor || matchedSessions[0]?.trainer || 'Trainer BCS',
				trainerType: c.trainerType || matchedSessions[0]?.trainerType || 'Internal',
				durationHours: Number(c.durationHours) || 2,
				costTrainer: Number(c.costTrainer) || 500000,
				department: c.department || 'Operations',
				totalTrainee: Math.max(Number(c.enrolledCount) || 0, matchedSessions.reduce((acc: number, s: any) => acc + (s.actualAttendeeCount || 0), 0), 1),
				planSlots,
				actualSlots
			};
		});
	});

	// Filter untuk Safety Matrix & Technical Matrix
	const filteredSafetyMatrixList = $derived(
		allTrainingMatrixRows.filter((r) => {
			if (r.section !== 'safety') return false;
			const q = matrixSearchQuery.trim().toLowerCase();
			const matchSearch = !q || r.title.toLowerCase().includes(q) || r.trainer.toLowerCase().includes(q) || r.department.toLowerCase().includes(q);
			const matchBased = matrixFilterBased === 'All' || r.based === matrixFilterBased;
			const matchCategory = matrixFilterCategory === 'All' || matrixFilterCategory === 'Safety' || r.category === matrixFilterCategory;
			return matchSearch && matchBased && matchCategory;
		})
	);

	const filteredTechnicalMatrixList = $derived(
		allTrainingMatrixRows.filter((r) => {
			if (r.section !== 'technical') return false;
			const q = matrixSearchQuery.trim().toLowerCase();
			const matchSearch = !q || r.title.toLowerCase().includes(q) || r.trainer.toLowerCase().includes(q) || r.department.toLowerCase().includes(q);
			const matchBased = matrixFilterBased === 'All' || r.based === matrixFilterBased;
			const matchCategory = matrixFilterCategory === 'All' || matrixFilterCategory !== 'Safety' || r.category === matrixFilterCategory;
			return matchSearch && matchBased && matchCategory;
		})
	);

	// Hitung Total Mingguan Planning (P) dan Actualisasi (A)
	const weeklyPlanTotals = $derived.by(() => {
		const totals: Record<string, number> = {};
		all48Slots.forEach((slot) => {
			totals[slot] = allTrainingMatrixRows.filter((r) => r.planSlots[slot]).length;
		});
		return totals;
	});

	const weeklyActualTotals = $derived.by(() => {
		const totals: Record<string, number> = {};
		all48Slots.forEach((slot) => {
			totals[slot] = allTrainingMatrixRows.filter((r) => r.actualSlots[slot]).length;
		});
		return totals;
	});

	// KPI Ringkasan Matriks Tahunan
	const totalAnnualPlan = $derived(Object.values(weeklyPlanTotals).reduce((a, b) => a + b, 0));
	const totalAnnualActual = $derived(Object.values(weeklyActualTotals).reduce((a, b) => a + b, 0));
	const matrixCompliancePercent = $derived(
		totalAnnualPlan > 0 ? ((totalAnnualActual / totalAnnualPlan) * 100).toFixed(1) : '100.0'
	);

	// Handler Buka Popover / Modal Detail Sesi Matriks
	function openMatrixSlotDetail(row: any, slot: string, type: 'P' | 'A') {
		const [mKey, wKey] = slot.split('-');
		const monthObj = matrixMonths.find((m) => m.key === mKey);
		const monthName = monthObj ? monthObj.label : mKey;
		const weekNum = wKey === 'i' ? '1' : wKey === 'ii' ? '2' : wKey === 'iii' ? '3' : '4';
		const slotLabel = `${monthName} (Minggu ke-${weekNum} / ${wKey.toUpperCase()})`;

		const session = type === 'A' ? row.actualSlots[slot] : undefined;

		selectedMatrixSlotDetail = {
			courseTitle: row.title,
			courseId: row.id,
			slotLabel,
			type,
			session
		};
	}

	// Ekspor CSV Matriks Training (Standar Sheet GID 636429620)
	function exportTrainingMatrixToCSV() {
		const yr = new Date().getFullYear();
		const csvLines: string[] = [];

		// Header Baris 1
		const monthHeaders = matrixMonths.map((m) => `${m.key},,,,`).join('');
		csvLines.push(`No,Training,Based,Trainer,In/Eks,Hours,Cost Trainer,Department,Total Trainee,${monthHeaders}TOTAL`);

		// Header Baris 2
		const weekHeaders = matrixMonths.map(() => 'i,ii,iii,iv,').join('');
		csvLines.push(`,,,,,,,,,${weekHeaders}`);

		// Baris 3: Planning Training Rollup
		const planRollup = all48Slots.map((slot) => weeklyPlanTotals[slot] || 0).join(',');
		csvLines.push(`Planning Training,,,,,,,,,${planRollup},${totalAnnualPlan}`);

		// Baris 4: Actualisasi Training Rollup
		const actualRollup = all48Slots.map((slot) => weeklyActualTotals[slot] || 0).join(',');
		csvLines.push(`Actualisasi Training,,,,,,,,,${actualRollup},${totalAnnualActual}`);

		// Seksi 1: Safety Training
		csvLines.push('Safety Training,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,');
		filteredSafetyMatrixList.forEach((row, idx) => {
			const planCells = all48Slots.map((s) => (row.planSlots[s] ? 'P' : '')).join(',');
			const planCount = all48Slots.filter((s) => row.planSlots[s]).length;
			csvLines.push(
				[
					idx + 1,
					`"${row.title.replace(/"/g, '""')}"`,
					`"${row.based}"`,
					`"${row.trainer}"`,
					`"${row.trainerType}"`,
					row.durationHours,
					`"Rp ${Number(row.costTrainer).toLocaleString('id-ID')}"`,
					`"${row.department}"`,
					row.totalTrainee,
					planCells,
					planCount
				].join(',')
			);

			const actualCells = all48Slots.map((s) => (row.actualSlots[s] ? 'A' : '')).join(',');
			const actualCount = all48Slots.filter((s) => row.actualSlots[s]).length;
			csvLines.push(['', '', '', '', '', '', '', '', '', actualCells, actualCount].join(','));
		});

		// Seksi 2: Technical & Soft Skill Training
		csvLines.push('Technical & Soft Skill Training,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,');
		filteredTechnicalMatrixList.forEach((row, idx) => {
			const planCells = all48Slots.map((s) => (row.planSlots[s] ? 'P' : '')).join(',');
			const planCount = all48Slots.filter((s) => row.planSlots[s]).length;
			csvLines.push(
				[
					idx + 1,
					`"${row.title.replace(/"/g, '""')}"`,
					`"${row.based}"`,
					`"${row.trainer}"`,
					`"${row.trainerType}"`,
					row.durationHours,
					`"Rp ${Number(row.costTrainer).toLocaleString('id-ID')}"`,
					`"${row.department}"`,
					row.totalTrainee,
					planCells,
					planCount
				].join(',')
			);

			const actualCells = all48Slots.map((s) => (row.actualSlots[s] ? 'A' : '')).join(',');
			const actualCount = all48Slots.filter((s) => row.actualSlots[s]).length;
			csvLines.push(['', '', '', '', '', '', '', '', '', actualCells, actualCount].join(','));
		});

		const filename = `Matriks_Training_PT_BCS_${yr}.csv`;
		const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		spawnToast({
			id: Date.now().toString(),
			title: 'Export Matriks Berhasil',
			message: `File ${filename} berhasil diunduh.`,
			type: 'SUCCESS',
			timestamp: new Date().toISOString()
		});
	}

	// Modals State
	let isCreateModalOpen = $state(false);

	// Create Course Form State (Divisi & Karyawan Perwakilan & Embed Link)
	let createCourseTitle = $state('');
	let createCourseTrainerType = $state('Internal');
	let createCourseDivision = $state('');
	let createCourseEmployeeSearch = $state('');
	let selectedEmployeeIds = $state<string[]>([]);
	let isEmployeeSelectionConfirmed = $state(false);
	let createCourseMaterialUrl = $state('');
	let showMaterialPreview = $state(true);

	let divisionEmployees = $derived(
		createCourseDivision
			? activeEmployees.filter(
					(e: any) =>
						e.divisionCode === createCourseDivision ||
						e.divisionName === createCourseDivision ||
						(divisions.find((d: any) => d.code === createCourseDivision)?.name === e.divisionName)
				)
			: []
	);

	let filteredDivisionEmployees = $derived(
		divisionEmployees.filter((e: any) => {
			if (!createCourseEmployeeSearch.trim()) return true;
			const q = createCourseEmployeeSearch.toLowerCase();
			return (
				(e.name && e.name.toLowerCase().includes(q)) ||
				(e.payrollId && e.payrollId.toLowerCase().includes(q)) ||
				(e.positionTitle && e.positionTitle.toLowerCase().includes(q))
			);
		})
	);

	let selectedEmployees = $derived(
		activeEmployees.filter((e: any) => selectedEmployeeIds.includes(e.payrollId))
	);

	let selectedInCurrentDivisionCount = $derived(
		divisionEmployees.filter((e: any) => selectedEmployeeIds.includes(e.payrollId)).length
	);

	let computedCourseDivision = $derived.by(() => {
		const divNames = Array.from(new Set(selectedEmployees.map((e: any) => e.divisionName).filter(Boolean)));
		if (divNames.length > 0) {
			return divNames.join(', ');
		}
		const targetDiv = divisions.find((d: any) => d.code === createCourseDivision);
		return targetDiv?.name || createCourseDivision || 'All Dept';
	});

	function toggleCreateCourseEmployee(payrollId: string) {
		if (selectedEmployeeIds.includes(payrollId)) {
			selectedEmployeeIds = selectedEmployeeIds.filter((id) => id !== payrollId);
		} else {
			selectedEmployeeIds = [...selectedEmployeeIds, payrollId];
		}
	}

	function selectAllDivisionEmployees() {
		const ids = filteredDivisionEmployees.map((e: any) => e.payrollId);
		const set = new Set([...selectedEmployeeIds, ...ids]);
		selectedEmployeeIds = Array.from(set);
	}

	function clearCurrentDivisionEmployees() {
		const currentDivEmpIds = new Set(filteredDivisionEmployees.map((e: any) => e.payrollId));
		selectedEmployeeIds = selectedEmployeeIds.filter((id) => !currentDivEmpIds.has(id));
	}

	function clearAllSelectedEmployees() {
		selectedEmployeeIds = [];
	}

	function confirmEmployeeSelection() {
		isEmployeeSelectionConfirmed = true;
	}

	function reopenEmployeeSelection() {
		isEmployeeSelectionConfirmed = false;
	}

	function removeSelectedEmployee(payrollId: string) {
		selectedEmployeeIds = selectedEmployeeIds.filter((id) => id !== payrollId);
	}

	// Create Course Wizard (5 Steps) & Quiz Builder State
	let createModalStep = $state<1 | 2 | 3 | 4 | 5>(1);
	let createQuizTab = $state<'PRE_TEST' | 'POST_TEST'>('PRE_TEST');

	// State Jadwal Pelatihan Step 3
	let createCourseSessionStartDate = $state(new Date().toISOString().split('T')[0]);
	let createCourseSessionEndDate = $state(new Date().toISOString().split('T')[0]);
	let createCourseStartTime = $state('09:00');
	let createCourseEndTime = $state('11:30');
	let createCourseSessionType = $state<'OFFLINE' | 'ONLINE' | 'HYBRID'>('OFFLINE');
	let createCourseLocationOrLink = $state('Ruang Aula Pelatihan BCS Cilegon');
	let createCourseTargetRole = $state('Semua Peserta / Perwakilan Divisi');
	let createCourseQuota = $state(30);

	interface QuizQuestionItem {
		id: string;
		questionType: 'MCQ' | 'ESSAY';
		questionText: string;
		options: Array<{ key: string; text: string }>;
		correctKey: string;
		explanation: string;
	}

	let preTestQuestionsList = $state<QuizQuestionItem[]>([
		{
			id: 'pre-1',
			questionType: 'MCQ',
			questionText: '',
			options: [
				{ key: 'A', text: '' },
				{ key: 'B', text: '' },
				{ key: 'C', text: '' },
				{ key: 'D', text: '' }
			],
			correctKey: 'A',
			explanation: ''
		}
	]);

	let postTestQuestionsList = $state<QuizQuestionItem[]>([
		{
			id: 'post-1',
			questionType: 'MCQ',
			questionText: '',
			options: [
				{ key: 'A', text: '' },
				{ key: 'B', text: '' },
				{ key: 'C', text: '' },
				{ key: 'D', text: '' }
			],
			correctKey: 'A',
			explanation: ''
		}
	]);

	function addQuestion(type: 'PRE_TEST' | 'POST_TEST') {
		const newItem: QuizQuestionItem = {
			id: `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
			questionType: 'MCQ',
			questionText: '',
			options: [
				{ key: 'A', text: '' },
				{ key: 'B', text: '' },
				{ key: 'C', text: '' },
				{ key: 'D', text: '' }
			],
			correctKey: 'A',
			explanation: ''
		};
		if (type === 'PRE_TEST') {
			preTestQuestionsList = [...preTestQuestionsList, newItem];
		} else {
			postTestQuestionsList = [...postTestQuestionsList, newItem];
		}
	}

	function removeQuestion(type: 'PRE_TEST' | 'POST_TEST', index: number) {
		if (type === 'PRE_TEST') {
			if (preTestQuestionsList.length <= 1) {
				spawnToast({
					id: Date.now().toString(),
					title: 'Peringatan',
					message: 'Minimal 1 butir soal Pre-Test harus tersedia.',
					type: 'WARNING',
					timestamp: new Date().toISOString()
				});
				return;
			}
			preTestQuestionsList = preTestQuestionsList.filter((_, i) => i !== index);
		} else {
			if (postTestQuestionsList.length <= 1) {
				spawnToast({
					id: Date.now().toString(),
					title: 'Peringatan',
					message: 'Minimal 1 butir soal Post-Test harus tersedia.',
					type: 'WARNING',
					timestamp: new Date().toISOString()
				});
				return;
			}
			postTestQuestionsList = postTestQuestionsList.filter((_, i) => i !== index);
		}
	}

	function copyPreTestToPostTest() {
		if (preTestQuestionsList.length === 0) return;
		postTestQuestionsList = preTestQuestionsList.map((q, idx) => ({
			id: `post-copy-${idx}-${Date.now()}`,
			questionType: q.questionType,
			questionText: q.questionText,
			options: q.options.map((opt) => ({ ...opt })),
			correctKey: q.correctKey,
			explanation: q.explanation
		}));
		spawnToast({
			id: Date.now().toString(),
			title: 'Soal Disalin',
			message: `${preTestQuestionsList.length} butir soal Pre-Test berhasil diduplikasi ke Post-Test.`,
			type: 'INFO',
			timestamp: new Date().toISOString()
		});
	}

	function addQuestionToCurrentQuiz() {
		addQuestion(createQuizTab);
	}

	function removeQuestionFromCurrentQuiz(id: string) {
		if (createQuizTab === 'PRE_TEST') {
			const idx = preTestQuestionsList.findIndex((q) => q.id === id);
			if (idx !== -1) removeQuestion('PRE_TEST', idx);
		} else {
			const idx = postTestQuestionsList.findIndex((q) => q.id === id);
			if (idx !== -1) removeQuestion('POST_TEST', idx);
		}
	}

	let isPreTestValid = $derived(
		preTestQuestionsList.length >= 1 &&
		preTestQuestionsList.every((q) => {
			if (!q.questionText.trim()) return false;
			if (q.questionType === 'ESSAY') return true;
			return q.options.filter((o) => o.text.trim().length > 0).length >= 2 && q.correctKey;
		})
	);

	let isPostTestValid = $derived(
		postTestQuestionsList.length >= 1 &&
		postTestQuestionsList.every((q) => {
			if (!q.questionText.trim()) return false;
			if (q.questionType === 'ESSAY') return true;
			return q.options.filter((o) => o.text.trim().length > 0).length >= 2 && q.correctKey;
		})
	);

	let isCreateCourseReadyToSubmit = $derived(
		createCourseTitle.trim().length > 0 && isPreTestValid && isPostTestValid
	);

	let currentQuizQuestions = $derived(
		createQuizTab === 'PRE_TEST' ? preTestQuestionsList : postTestQuestionsList
	);

	function nextCreateStep() {
		if (createModalStep === 1) {
			if (!createCourseTitle.trim()) {
				spawnToast({
					id: Date.now().toString(),
					title: 'Validasi',
					message: 'Judul program pelatihan wajib diisi terlebih dahulu.',
					type: 'WARNING',
					timestamp: new Date().toISOString()
				});
				return;
			}
			createModalStep = 2;
		} else if (createModalStep === 2) {
			createModalStep = 3;
		} else if (createModalStep === 3) {
			if (!createCourseLocationOrLink.trim()) {
				spawnToast({
					id: Date.now().toString(),
					title: 'Validasi',
					message: 'Lokasi ruangan atau tautan meeting wajib diisi.',
					type: 'WARNING',
					timestamp: new Date().toISOString()
				});
				return;
			}
			createModalStep = 4;
		} else if (createModalStep === 4) {
			createModalStep = 5;
		}
	}

	function openCreateCourseModal() {
		createModalStep = 1;
		createQuizTab = 'PRE_TEST';
		createCourseTitle = '';
		createCourseTrainerType = 'Internal';
		createCourseDivision = '';
		createCourseEmployeeSearch = '';
		selectedEmployeeIds = [];
		isEmployeeSelectionConfirmed = false;
		createCourseSessionStartDate = new Date().toISOString().split('T')[0];
		createCourseSessionEndDate = new Date().toISOString().split('T')[0];
		createCourseStartTime = '09:00';
		createCourseEndTime = '11:30';
		createCourseSessionType = 'OFFLINE';
		createCourseLocationOrLink = 'Ruang Aula Pelatihan BCS Cilegon';
		createCourseTargetRole = 'Semua Peserta / Perwakilan Divisi';
		createCourseQuota = 30;
		createCourseMaterialUrl = '';
		showMaterialPreview = true;
		preTestQuestionsList = [
			{
				id: 'pre-1',
				questionType: 'MCQ',
				questionText: '',
				options: [
					{ key: 'A', text: '' },
					{ key: 'B', text: '' },
					{ key: 'C', text: '' },
					{ key: 'D', text: '' }
				],
				correctKey: 'A',
				explanation: ''
			}
		];
		postTestQuestionsList = [
			{
				id: 'post-1',
				questionType: 'MCQ',
				questionText: '',
				options: [
					{ key: 'A', text: '' },
					{ key: 'B', text: '' },
					{ key: 'C', text: '' },
					{ key: 'D', text: '' }
				],
				correctKey: 'A',
				explanation: ''
			}
		];
		isCreateModalOpen = true;
	}
	let isPlayerModalOpen = $state(false);
	let isSessionModalOpen = $state(false);
	let isAttendanceModalOpen = $state(false);
	// State Tambah Peserta Presensi Kehadiran (Multi-Select)
	let attendanceSelectedEmployeeIds = $state<string[]>([]);
	let attendanceSearchQuery = $state<string>('');
	let attendanceDivisionFilter = $state<string>('');

	let availableAttendanceEmployees = $derived.by(() => {
		if (!activeSessionForAttendance) return [];
		const currentSessionAtts = attendances.filter((a: any) => a.sessionId === activeSessionForAttendance.id);
		const enrolledPayrollIds = new Set(
			currentSessionAtts.map((a: any) => (a.payrollId || '').toString().toUpperCase().trim())
		);

		return activeEmployees.filter((emp: any) => {
			const empPayrollId = (emp.payrollId || '').toString().toUpperCase().trim();
			// Saring keluar karyawan yang sudah terdaftar di sesi ini
			if (enrolledPayrollIds.has(empPayrollId)) return false;

			// Saring berdasarkan divisi sasaran jika filter divisi dipilih
			if (attendanceDivisionFilter) {
				const matchesDiv =
					emp.divisionCode === attendanceDivisionFilter ||
					emp.divisionName === attendanceDivisionFilter ||
					divisions.find((d: any) => d.code === attendanceDivisionFilter)?.name === emp.divisionName;
				if (!matchesDiv) return false;
			}

			// Saring berdasarkan teks pencarian (nama, NIK, jabatan, divisi)
			if (attendanceSearchQuery.trim()) {
				const q = attendanceSearchQuery.toLowerCase().trim();
				const matchName = emp.name && emp.name.toLowerCase().includes(q);
				const matchId = emp.payrollId && emp.payrollId.toLowerCase().includes(q);
				const matchTitle = emp.positionTitle && emp.positionTitle.toLowerCase().includes(q);
				const matchDiv = emp.divisionName && emp.divisionName.toLowerCase().includes(q);
				return matchName || matchId || matchTitle || matchDiv;
			}

			return true;
		});
	});

	let attendanceSelectedEmployees = $derived(
		activeEmployees.filter((e: any) => attendanceSelectedEmployeeIds.includes(e.payrollId))
	);

	function toggleAttendanceEmployee(payrollId: string) {
		if (attendanceSelectedEmployeeIds.includes(payrollId)) {
			attendanceSelectedEmployeeIds = attendanceSelectedEmployeeIds.filter((id) => id !== payrollId);
		} else {
			attendanceSelectedEmployeeIds = [...attendanceSelectedEmployeeIds, payrollId];
		}
	}

	function removeAttendanceEmployee(payrollId: string) {
		attendanceSelectedEmployeeIds = attendanceSelectedEmployeeIds.filter((id) => id !== payrollId);
	}

	function clearAllAttendanceEmployees() {
		attendanceSelectedEmployeeIds = [];
		attendanceSearchQuery = '';
	}

	function selectAllAvailableAttendanceEmployees() {
		const newIds = availableAttendanceEmployees.map((e: any) => e.payrollId);
		attendanceSelectedEmployeeIds = Array.from(new Set([...attendanceSelectedEmployeeIds, ...newIds]));
	}
	let isEvalSupervisorModalOpen = $state(false);
	let isRequestModalOpen = $state(false);
	let isSafetyTestModalOpen = $state(false);
	let isCertModalOpen = $state(false);

	// TNA Modals State
	let isAssessmentModalOpen = $state(false);
	let isCompetencyModalOpen = $state(false);
	let isJobStandardModalOpen = $state(false);
	let isLevelIndicatorModalOpen = $state(false);
	let selectedCompetencyForIndicator = $state<any>(null);

	// Kamus Kompetensi (170 items) Filter & Link Modal State
	let compSearchQuery = $state('');
	let compFilterAspect = $state('All');
	let compFilterStatus = $state<'All' | 'Linked' | 'Unlinked'>('All');
	let compCurrentPage = $state(1);
	const compPerPage = 18;
	let isLinkCourseModalOpen = $state(false);
	let selectedCompForLink = $state<any>(null);

	// Modal Pemilihan Kursus untuk TNA GAP
	let isAssignCourseModalOpen = $state(false);
	let selectedAssessmentForAssign = $state<any>(null);
	let assignFormCourseId = $state('');
	let assignFormSetDefault = $state(true);
	let isSubmittingAssessment = $state(false);
	let isSubmittingJobStandard = $state(false);
	let isSubmittingAssignTraining = $state(false);

	// TNA Assessment form helper state
	let assessmentForm = $state({
		payrollId: 'EMP-0042',
		employeeName: 'Guntoro Muhamad',
		positionTitle: 'Driver Tronton / Trailer',
		department: 'Operations',
		competencyCode: 'E06',
		requiredLevel: 3,
		actualLevel: 2,
		assessorName: 'Ikhnaton (Manager QHSE)',
		notes: 'Perlu penguatan pemahaman SWP keselamatan berkendara'
	});

	let competencyForm = $state({
		code: '',
		name: '',
		aspect: 'Technical Competency',
		defaultCourseId: '',
		level1: '',
		level2: '',
		level3: '',
		level4: '',
		level5: ''
	});

	let jobStandardForm = $state({
		positionTitle: '',
		division: 'OPERATION'
	});
	let selectedCompStandards = $state<Record<string, { selected: boolean; requiredLevel: number }>>({});
	let compModalSearchQuery = $state('');
	let compModalSelectedAspect = $state('All');

	// List kompetensi terpilih untuk dikirim ke backend
	const selectedCompStandardsList = $derived.by(() => {
		return Object.entries(selectedCompStandards)
			.filter(([_, val]) => val.selected)
			.map(([code, val]) => ({
				competencyCode: code,
				requiredLevel: val.requiredLevel
			}));
	});

	// Filtered kompetensi untuk modal picker (item yang diceklis otomatis naik ke posisi teratas)
	const filteredModalCompetencies = $derived.by(() => {
		const aspectOrder: Record<string, number> = {
			'Core Competency': 1,
			'Behavioral Competency': 2,
			'Technical Competency': 3
		};

		return competencyLibrary
			.filter((c: any) => {
				const matchSearch = compModalSearchQuery === '' ||
					c.name.toLowerCase().includes(compModalSearchQuery.toLowerCase()) ||
					c.code.toLowerCase().includes(compModalSearchQuery.toLowerCase());
				const matchAspect = compModalSelectedAspect === 'All' || c.aspect === compModalSelectedAspect;
				return matchSearch && matchAspect;
			})
			.sort((a: any, b: any) => {
				const isCheckedA = selectedCompStandards[a.code]?.selected ? 1 : 0;
				const isCheckedB = selectedCompStandards[b.code]?.selected ? 1 : 0;

				// Item yang sudah diceklis diposisikan di paling atas
				if (isCheckedA !== isCheckedB) {
					return isCheckedB - isCheckedA;
				}

				// Di dalam kelompok status yang sama, urutkan berdasarkan Aspek lalu Kode
				const aspectA = aspectOrder[a.aspect] || 99;
				const aspectB = aspectOrder[b.aspect] || 99;
				if (aspectA !== aspectB) return aspectA - aspectB;

				return a.code.localeCompare(b.code, undefined, { numeric: true });
			});
	});

	function toggleModalCompSelection(code: string) {
		if (!selectedCompStandards[code]) {
			selectedCompStandards[code] = { selected: true, requiredLevel: 3 };
		} else {
			selectedCompStandards[code].selected = !selectedCompStandards[code].selected;
		}
	}

	function setModalCompLevel(code: string, level: number) {
		if (!selectedCompStandards[code]) {
			selectedCompStandards[code] = { selected: true, requiredLevel: level };
		} else {
			selectedCompStandards[code].requiredLevel = level;
		}
	}

	function selectAllFilteredModalComps() {
		filteredModalCompetencies.forEach((c: any) => {
			if (!selectedCompStandards[c.code]) {
				selectedCompStandards[c.code] = { selected: true, requiredLevel: 3 };
			} else {
				selectedCompStandards[c.code].selected = true;
			}
		});
	}

	function clearAllModalComps() {
		selectedCompStandards = {};
	}

	function openJobStandardModal(positionTitle?: string, divisionName?: string) {
		jobStandardForm.positionTitle = positionTitle || '';
		jobStandardForm.division = divisionName || (divisions[0]?.name || 'OPERATION');
		selectedCompStandards = {};
		compModalSearchQuery = '';
		compModalSelectedAspect = 'All';

		if (positionTitle) {
			const existing = jobStandards.filter((j: any) => j.positionTitle.toLowerCase() === positionTitle.toLowerCase());
			existing.forEach((e: any) => {
				selectedCompStandards[e.competencyCode] = { selected: true, requiredLevel: e.requiredLevel };
			});
		}

		isJobStandardModalOpen = true;
	}

	// Active Selections
	let selectedCourseForSession = $state<string>('');
	let sessionBatchTitle = $state<string>('');
	let sessionBatchTrainer = $state<string>('');
	let sessionBatchTrainerType = $state<string>('Internal');
	let sessionBatchCostTrainer = $state<number>(500000);
	let sessionBatchDepartment = $state<string>('Operations');
	let sessionBatchBased = $state<string>('Mandatory');
	let sessionBatchType = $state<string>('OFFLINE');
	let sessionBatchLocation = $state<string>('Ruang Aula Training BCS Cilegon');
	let sessionBatchStartDate = $state<string>(new Date().toISOString().split('T')[0]);
	let sessionBatchEndDate = $state<string>(new Date().toISOString().split('T')[0]);
	let sessionBatchStartTime = $state<string>('09:00');
	let sessionBatchEndTime = $state<string>('11:30');
	let sessionBatchQuota = $state<number>(30);

	// Peserta Batch Sesi State
	let sessionBatchDivision = $state<string>('');
	let sessionBatchEmployeeSearch = $state<string>('');
	let sessionBatchSelectedEmployeeIds = $state<string[]>([]);

	let sessionBatchDivisionEmployees = $derived(
		sessionBatchDivision
			? activeEmployees.filter(
					(e: any) =>
						e.divisionCode === sessionBatchDivision ||
						e.divisionName === sessionBatchDivision ||
						(divisions.find((d: any) => d.code === sessionBatchDivision)?.name === e.divisionName)
				)
			: []
	);

	let sessionBatchFilteredDivisionEmployees = $derived(
		sessionBatchDivisionEmployees.filter((e: any) => {
			if (!sessionBatchEmployeeSearch.trim()) return true;
			const q = sessionBatchEmployeeSearch.toLowerCase();
			return (
				(e.name && e.name.toLowerCase().includes(q)) ||
				(e.payrollId && e.payrollId.toLowerCase().includes(q)) ||
				(e.positionTitle && e.positionTitle.toLowerCase().includes(q))
			);
		})
	);

	let sessionBatchSelectedEmployees = $derived(
		activeEmployees.filter((e: any) => sessionBatchSelectedEmployeeIds.includes(e.payrollId))
	);

	let selectedCourseObjForSession = $derived(
		courses.find((c: any) => c.id === selectedCourseForSession) || null
	);

	function toggleSessionBatchEmployee(payrollId: string) {
		if (sessionBatchSelectedEmployeeIds.includes(payrollId)) {
			sessionBatchSelectedEmployeeIds = sessionBatchSelectedEmployeeIds.filter((id) => id !== payrollId);
		} else {
			sessionBatchSelectedEmployeeIds = [...sessionBatchSelectedEmployeeIds, payrollId];
		}
	}

	function removeSessionBatchEmployee(payrollId: string) {
		sessionBatchSelectedEmployeeIds = sessionBatchSelectedEmployeeIds.filter((id) => id !== payrollId);
	}

	function clearAllSessionBatchEmployees() {
		sessionBatchSelectedEmployeeIds = [];
	}

	function handleCourseSelectedForSession(courseId: string) {
		selectedCourseForSession = courseId;
		if (!courseId) return;
		const course = courses.find((c: any) => c.id === courseId);
		if (course) {
			const existingBatchesCount = sessions.filter((s: any) => s.courseId === course.id).length;
			sessionBatchTitle = `${course.title} - Batch ${existingBatchesCount + 1}`;
			sessionBatchTrainer = course.instructor || masterTrainers[0]?.name || 'Trainer Internal';
			sessionBatchTrainerType = course.trainerType || 'Internal';
			sessionBatchCostTrainer = course.costTrainer || 500000;
			sessionBatchDepartment = course.department || 'Operations';
			sessionBatchBased = course.based || 'Mandatory';
			sessionBatchType = (course as any).sessionType || 'OFFLINE';
			sessionBatchLocation = (course as any).locationOrLink || 'Ruang Aula Training BCS Cilegon';
			sessionBatchQuota = (course as any).quota || 30;
		}
	}

	function openCreateBatchModal(preSelectedCourse?: any) {
		sessionBatchSelectedEmployeeIds = [];
		sessionBatchEmployeeSearch = '';
		sessionBatchDivision = '';
		sessionBatchStartDate = new Date().toISOString().split('T')[0];
		sessionBatchEndDate = new Date().toISOString().split('T')[0];
		sessionBatchStartTime = '09:00';
		sessionBatchEndTime = '11:30';

		if (preSelectedCourse) {
			handleCourseSelectedForSession(preSelectedCourse.id);
		} else if (courses.length > 0) {
			handleCourseSelectedForSession(courses[0].id);
		} else {
			selectedCourseForSession = '';
			sessionBatchTitle = '';
		}

		isSessionModalOpen = true;
	}
	let activeCourseForPlayer = $state<any>(null);
	let activeSessionForAttendance = $state<any>(null);
	let activeEvalForSupervisor = $state<any>(null);
	let activeCertData = $state<any>(null);

	// Sequential Player Engine State
	// Steps: 1 = Pre-Test, 2 = Modules (Materi), 3 = Post-Test, 4 = Evaluasi Level 1, 5 = Selesai / Sertifikat
	let playerStep = $state<1 | 2 | 3 | 4 | 5>(1);
	let isOfflineAttendedCourse = $state(false);
	let activeModuleIndex = $state(0);
	let preTestAnswered = $state<Record<number, string>>({});
	let postTestAnswered = $state<Record<number, string>>({});
	let preTestSubmitted = $state(false);
	let postTestResult = $state<{ passed: boolean; score: number; certNumber?: string } | null>(null);
	// Evaluasi Level 1 Kirkpatrick (18 Indikator: 15 Likert + 3 Esai)
	let evalL1State = $state({
		// 1. Program & Materi Pelatihan (Skala 1-5)
		q1_systematic: 5,
		q2_completeness: 5,
		q3_relevance: 5,
		q4_duration: 5,
		q5_knowledge_gain: 5,
		// 2. Instruktur / Trainer / Fasilitator (Skala 1-5)
		q6_mastery: 5,
		q7_delivery: 5,
		q8_engagement: 5,
		q9_qa: 5,
		// 3. Sarana, Prasarana & Fasilitas (Skala 1-5)
		q10_venue: 5,
		q11_tools: 5,
		q12_refreshment: 5,
		q13_cleanliness: 5,
		q14_committee: 5,
		q15_discipline: 5,
		// 4. Esai Kualitatif / Feedback Terbuka
		appliedBenefit: '',
		impressions: '',
		suggestions: ''
	});

	let isSubmittingEvalL1 = $state(false);

	const evalL1MaterialAvg = $derived(
		Number(((evalL1State.q1_systematic + evalL1State.q2_completeness + evalL1State.q3_relevance + evalL1State.q4_duration + evalL1State.q5_knowledge_gain) / 5).toFixed(2))
	);
	const evalL1InstructorAvg = $derived(
		Number(((evalL1State.q6_mastery + evalL1State.q7_delivery + evalL1State.q8_engagement + evalL1State.q9_qa) / 4).toFixed(2))
	);
	const evalL1FacilityAvg = $derived(
		Number(((evalL1State.q10_venue + evalL1State.q11_tools + evalL1State.q12_refreshment + evalL1State.q13_cleanliness + evalL1State.q14_committee + evalL1State.q15_discipline) / 6).toFixed(2))
	);
	const evalL1OverallAvg = $derived(
		Number(((evalL1MaterialAvg + evalL1InstructorAvg + evalL1FacilityAvg) / 3).toFixed(2))
	);

	const evalL1FilledCount = $derived.by(() => {
		let count = 0;
		const likertKeys = [
			'q1_systematic', 'q2_completeness', 'q3_relevance', 'q4_duration', 'q5_knowledge_gain',
			'q6_mastery', 'q7_delivery', 'q8_engagement', 'q9_qa',
			'q10_venue', 'q11_tools', 'q12_refreshment', 'q13_cleanliness', 'q14_committee', 'q15_discipline'
		] as const;
		for (const k of likertKeys) {
			if (evalL1State[k] >= 1 && evalL1State[k] <= 5) count++;
		}
		if (evalL1State.appliedBenefit.trim().length > 0) count++;
		if (evalL1State.impressions.trim().length > 0) count++;
		if (evalL1State.suggestions.trim().length > 0) count++;
		return count;
	});

	const isEvalL1Complete = $derived(evalL1FilledCount === 18);

	// Modal Detail Preview Evaluasi Level 1 di Admin LMS
	let isL1DetailModalOpen = $state(false);
	let selectedL1Detail = $state<any>(null);

	function openL1DetailModal(item: any) {
		selectedL1Detail = item;
		isL1DetailModalOpen = true;
	}

	// Modal Detail Preview Level 4 Pre-Test, Level 3 Behavior, & Level 4 Post-Test
	let isL4PreDetailModalOpen = $state(false);
	let selectedL4PreDetail = $state<any>(null);

	let isL3DetailModalOpen = $state(false);
	let selectedL3Detail = $state<any>(null);

	let isL4PostDetailModalOpen = $state(false);
	let selectedL4PostDetail = $state<any>(null);

	function openL4PreDetailModal(item: any) {
		selectedL4PreDetail = item;
		isL4PreDetailModalOpen = true;
	}

	function openL3DetailModal(item: any) {
		selectedL3Detail = item;
		isL3DetailModalOpen = true;
	}

	function openL4PostDetailModal(item: any) {
		selectedL4PostDetail = item;
		isL4PostDetailModalOpen = true;
	}

	// Filter & Search Kirkpatrick State
	let evalSearchQuery = $state('');
	let evalFilterStatus = $state('All');
	let evalFilterCategory = $state('All');

	// Level 3 Behavior Questions (15 Butir Master)
	const l3BehaviorQuestions = [
		{
			aspect: 'Sikap & Perilaku',
			aspectBadge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
			icon: 'favorite',
			items: [
				{ id: 'attitude_1', title: '1. Pengendalian Emosi', desc: 'Mampu menahan emosi menghadapi tekanan pekerjaan atau masalah pribadi.' },
				{ id: 'attitude_2', title: '2. Penghormatan & Etika', desc: 'Menghargai rekan kerja dan atasan serta menjunjung tinggi etika kerja.' },
				{ id: 'attitude_3', title: '3. Kedisiplinan Kerja', desc: 'Disiplin hadir tepat waktu dan mematuhi tata tertib operasional perusahaan.' },
				{ id: 'attitude_4', title: '4. Kerjasama & Kolaborasi', desc: 'Mampu bekerjasama dengan tim serta mendukung pencapaian target unit.' },
				{ id: 'attitude_5', title: '5. Tanggung Jawab Lapangan', desc: 'Menjalankan tugas dengan penuh dedikasi dan bertanggung jawab atas hasil kerja.' }
			]
		},
		{
			aspect: 'Pengetahuan (Knowledge)',
			aspectBadge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
			icon: 'psychology',
			items: [
				{ id: 'knowledge_1', title: '6. Penguasaan Materi Training', desc: 'Memahami teori dan pengetahuan teknis yang telah diberikan pada pelatihan.' },
				{ id: 'knowledge_2', title: '7. Analisa Masalah Kerja', desc: 'Mampu mengidentifikasi akar permasalahan di lingkungan kerja secara akurat.' },
				{ id: 'knowledge_3', title: '8. Kualitas Pengambilan Keputusan', desc: 'Mengambil keputusan operasional yang logis, efektif, dan minim risiko.' },
				{ id: 'knowledge_4', title: '9. Semangat Continuous Improvement', desc: 'Memiliki keinginan untuk belajar hal baru dan memberi usulan perbaikan kerja.' },
				{ id: 'knowledge_5', title: '10. Kepercayaan Diri Kerja', desc: 'Percaya diri dan lugas dalam menjalankan tugas dan koordinasi harian.' }
			]
		},
		{
			aspect: 'Keterampilan (Skill)',
			aspectBadge: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
			icon: 'construction',
			items: [
				{ id: 'skill_1', title: '11. Kepatuhan & Penguasaan SOP', desc: 'Menerapkan seluruh Standard Operating Procedure secara tertib dan aman.' },
				{ id: 'skill_2', title: '12. Pengoperasian Sarana & Alat', desc: 'Menggunakan peralatan, unit kendaraan, atau sistem kerja sesuai standar teknis.' },
				{ id: 'skill_3', title: '13. Kualitas Hasil Pekerjaan', desc: 'Menghasilkan output kerja yang rapi, presisi, dan sesuai standar mutu BCS.' },
				{ id: 'skill_4', title: '14. Kecepatan & Ketepatan Kerja', desc: 'Menyelesaikan beban pekerjaan sesuai batas waktu target tanpa mengurangi mutu.' },
				{ id: 'skill_5', title: '15. Kreatifitas & Pemecahan Masalah', desc: 'Memiliki alternatif solusi kreatif saat menghadapi kendala tak terduga di lapangan.' }
			]
		}
	];

	const l4IndicatorsByCategory: Record<string, { label: string; desc: string; unit: string }[]> = {
		'Technical Skill': [
			{ label: 'Pengerjaan Tugas Sesuai SOP Tanpa Deviasi', desc: 'Tingkat kepatuhan implementasi instruksi kerja teknis di lapangan', unit: 'Skala 1-5' },
			{ label: 'Reduksi Deviasi / Reject Mutu Hasil Kerja', desc: 'Penurunan kesalahan output teknis atau klaim revisi pekerjaan', unit: 'Skala 1-5' },
			{ label: 'Efisiensi Waktu Siklus (Cycle Time)', desc: 'Kecepatan penyelesaian proses teknis dibanding sebelum training', unit: 'Skala 1-5' },
			{ label: 'Kemandirian Penanganan Kendala Teknis', desc: 'Kemampuan menyelesaikan kendala alat/sistem tanpa eskalasi berlebih', unit: 'Skala 1-5' }
		],
		'Soft Skill': [
			{ label: 'Komunikasi Kerja & Koordinasi Tim Efektif', desc: 'Kejelasan informasi kerja dan kolaborasi antar fungsi/bagian', unit: 'Skala 1-5' },
			{ label: 'Respon Cepat Terhadap Instruksi Kerja', desc: 'Ketepatan waktu dan tindak lanjut saat menerima arahan tugas', unit: 'Skala 1-5' },
			{ label: 'Inisiatif & Proaktifitas Pemecahan Masalah', desc: 'Kemauan membantu rekan dan mencari solusi tanpa harus selalu disuruh', unit: 'Skala 1-5' },
			{ label: 'Tanggung Jawab & Disiplin Waktu Kerja', desc: 'Komitmen terhadap target tim dan ketepatan penyelesaian tugas', unit: 'Skala 1-5' }
		],
		'Safety': [
			{ label: 'Kepatuhan Pemakaian APD & Aturan K3', desc: 'Konsistensi penggunaan safety gear dan kepatuhan norma keselamatan kerja', unit: 'Skala 1-5' },
			{ label: 'Nihil Pelanggaran Regulasi & Unsafe Action', desc: 'Penurunan tindakan tidak aman yang membahayakan diri atau tim', unit: 'Skala 1-5' },
			{ label: 'Kecepatan Pelaporan Temuan Near-Miss / Bahaya', desc: 'Partisipasi aktif dalam mitigasi risiko dan hazard report lingkungan kerja', unit: 'Skala 1-5' },
			{ label: 'Penerapan 5R/5S di Area Lingkungan Kerja', desc: 'Kerapihan, kebersihan, dan keteraturan area kerja pasca-aktivitas', unit: 'Skala 1-5' }
		],
		'Hard Skill': [
			{ label: 'Akurasi Pengoperasian Unit / Mesin Kerja', desc: 'Presisi pengoperasian unit atau peralatan teknis sesuai panduan pabrikan', unit: 'Skala 1-5' },
			{ label: 'Kepatuhan Checklist Perawatan & Pemeliharaan', desc: 'Disiplin pengisian P2H / checklist harian kondisi peralatan', unit: 'Skala 1-5' },
			{ label: 'Minimasi Kerusakan Alat Akibat Kelalaian', desc: 'Penurunan frekuensi downtime unit atau kerusakan akibat salah prosedur', unit: 'Skala 1-5' },
			{ label: 'Pencapaian Target Output Produksi / Ritase', desc: 'Pencapaian volume ritase/pekerjaan sesuai target operasional', unit: 'Skala 1-5' }
		]
	};

	function getPreMetricValue(metrics: any, idx: number): number {
		if (!metrics) return 0;
		const entry = metrics[idx] ?? metrics[String(idx)] ?? metrics[`q${idx}`];
		if (typeof entry === 'number') return entry;
		if (entry && typeof entry.baseline === 'number') return entry.baseline;
		return 0;
	}

	function getPostMetricValue(metrics: any, idx: number): number {
		if (!metrics) return 0;
		const entry = metrics[idx] ?? metrics[String(idx)] ?? metrics[`q${idx}`];
		if (typeof entry === 'number') return entry;
		if (entry && typeof entry.post === 'number') return entry.post;
		return 0;
	}

	function calcPreBaselineAvg(metrics: any): number {
		if (!metrics || Object.keys(metrics).length === 0) return 0;
		const vals = [0, 1, 2, 3].map((i) => getPreMetricValue(metrics, i)).filter((v) => v > 0);
		if (vals.length === 0) return 0;
		return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
	}

	function calcPostAvg(metrics: any): number {
		if (!metrics || Object.keys(metrics).length === 0) return 0;
		const vals = [0, 1, 2, 3].map((i) => getPostMetricValue(metrics, i)).filter((v) => v > 0);
		if (vals.length === 0) return 0;
		return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
	}

	function calcDeltaPercent(preAvg: number, postAvg: number): number {
		if (!preAvg || preAvg === 0) return 0;
		return Number((((postAvg - preAvg) / preAvg) * 100).toFixed(1));
	}

	// Filtered Data for Kirkpatrick Sub-Tabs
	let filteredL4Pre = $derived(
		evaluationsL3L4.filter((e: any) => {
			if (evalFilterStatus !== 'All' && e.l4PreStatus !== evalFilterStatus) return false;
			if (evalFilterCategory !== 'All' && e.l4PreSkillCategory !== evalFilterCategory) return false;
			if (!evalSearchQuery.trim()) return true;
			const q = evalSearchQuery.toLowerCase();
			return (
				e.employeeName?.toLowerCase().includes(q) ||
				e.payrollId?.toLowerCase().includes(q) ||
				e.courseTitle?.toLowerCase().includes(q) ||
				e.supervisorName?.toLowerCase().includes(q) ||
				e.department?.toLowerCase().includes(q)
			);
		})
	);

	let filteredL3 = $derived(
		evaluationsL3L4.filter((e: any) => {
			if (evalFilterStatus !== 'All' && e.l3Status !== evalFilterStatus) return false;
			if (!evalSearchQuery.trim()) return true;
			const q = evalSearchQuery.toLowerCase();
			return (
				e.employeeName?.toLowerCase().includes(q) ||
				e.payrollId?.toLowerCase().includes(q) ||
				e.courseTitle?.toLowerCase().includes(q) ||
				e.supervisorName?.toLowerCase().includes(q) ||
				e.department?.toLowerCase().includes(q)
			);
		})
	);

	let filteredL4Post = $derived(
		evaluationsL3L4.filter((e: any) => {
			if (evalFilterStatus !== 'All' && e.l4Status !== evalFilterStatus) return false;
			if (evalFilterCategory !== 'All' && e.l4PreSkillCategory !== evalFilterCategory) return false;
			if (!evalSearchQuery.trim()) return true;
			const q = evalSearchQuery.toLowerCase();
			return (
				e.employeeName?.toLowerCase().includes(q) ||
				e.payrollId?.toLowerCase().includes(q) ||
				e.courseTitle?.toLowerCase().includes(q) ||
				e.supervisorName?.toLowerCase().includes(q) ||
				e.department?.toLowerCase().includes(q)
			);
		})
	);

	// Kirkpatrick Metrics Stats
	const l4PreMetricsStats = $derived.by(() => {
		const total = evaluationsL3L4.length;
		const reviewed = evaluationsL3L4.filter((e: any) => e.l4PreStatus === 'REVIEWED').length;
		const pending = evaluationsL3L4.filter((e: any) => e.l4PreStatus !== 'REVIEWED').length;
		const reviewedItems = evaluationsL3L4.filter((e: any) => e.l4PreStatus === 'REVIEWED');
		const avgs = reviewedItems.map((e: any) => calcPreBaselineAvg(e.l4PreMetrics)).filter((v: number) => v > 0);
		const globalAvg = avgs.length ? (avgs.reduce((a: number, b: number) => a + b, 0) / avgs.length).toFixed(1) : '3.8';
		return { total, reviewed, pending, globalAvg };
	});

	const l3MetricsStats = $derived.by(() => {
		const total = evaluationsL3L4.length;
		const completed = evaluationsL3L4.filter((e: any) => e.l3Status === 'COMPLETED').length;
		const pending = evaluationsL3L4.filter((e: any) => e.l3Status !== 'COMPLETED').length;
		const completedItems = evaluationsL3L4.filter((e: any) => e.l3Status === 'COMPLETED' && e.l3AvgScore);
		const globalAvg = completedItems.length
			? (completedItems.reduce((a: number, b: any) => a + Number(b.l3AvgScore), 0) / completedItems.length).toFixed(2)
			: '2.85';
		return { total, completed, pending, globalAvg };
	});

	const l4PostMetricsStats = $derived.by(() => {
		const total = evaluationsL3L4.length;
		const completed = evaluationsL3L4.filter((e: any) => e.l4Status === 'COMPLETED').length;
		const pending = evaluationsL3L4.filter((e: any) => e.l4Status !== 'COMPLETED').length;
		const completedItems = evaluationsL3L4.filter((e: any) => e.l4Status === 'COMPLETED');
		const postAvgs = completedItems.map((e: any) => calcPostAvg(e.l4PostMetrics)).filter((v: number) => v > 0);
		const globalPostAvg = postAvgs.length ? (postAvgs.reduce((a: number, b: number) => a + b, 0) / postAvgs.length).toFixed(1) : '4.6';
		const deltas = completedItems.map((e: any) => {
			const pre = calcPreBaselineAvg(e.l4PreMetrics);
			const post = calcPostAvg(e.l4PostMetrics);
			return calcDeltaPercent(pre, post);
		});
		const globalDelta = deltas.length ? (deltas.reduce((a: number, b: number) => a + b, 0) / deltas.length).toFixed(1) : '+24.5';
		return { total, completed, pending, globalPostAvg, globalDelta };
	});

	// ══════════════════════════════════════════════════════════════════════════════
	// DATA & LOGIC: REKAPITULASI DATABASE EVALUASI KIRKPATRICK (SPREADSHEET GID 744159616)
	// ══════════════════════════════════════════════════════════════════════════════
	const masterHistoricalRecapData = [
		{ no: 1, name: 'Nurokhim', title: 'Warehouse Coordinator', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 82.67, l4PreInvite: false, l2PreScore: 100.0, l2PreRemark: 'LULUS', l2PostScore: 100.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 90.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 2, name: 'Agung Prasetyo, A.Md', title: 'Coordinator Shift', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 92.0, l4PreInvite: false, l2PreScore: 100.0, l2PreRemark: 'LULUS', l2PostScore: 100.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 3, name: 'Rifki Septiyan', title: 'Administrasi', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 76.0, l4PreInvite: false, l2PreScore: 100.0, l2PreRemark: 'LULUS', l2PostScore: 100.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 4, name: 'Sri Joko Wahyuni', title: 'Dispatcher', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 97.33, l4PreInvite: false, l2PreScore: 90.0, l2PreRemark: 'LULUS', l2PostScore: 100.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 5, name: 'Dwi Nurtana', title: 'Dispatcher', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 80.0, l4PreInvite: false, l2PreScore: 15.0, l2PreRemark: 'REMEDIAL', l2PostScore: 90.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 6, name: 'Martadi', title: 'Operator Forklift', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 78.67, l4PreInvite: false, l2PreScore: 100.0, l2PreRemark: 'LULUS', l2PostScore: 100.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 7, name: 'Darsono', title: 'Operator Forklift', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 97.33, l4PreInvite: false, l2PreScore: 100.0, l2PreRemark: 'LULUS', l2PostScore: 95.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 8, name: 'Raswanto', title: 'Operator Forklift', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 80.0, l4PreInvite: false, l2PreScore: 100.0, l2PreRemark: 'LULUS', l2PostScore: 100.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 9, name: 'Eko Kuryulianto', title: 'Operator Forklift', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 98.67, l4PreInvite: false, l2PreScore: 90.0, l2PreRemark: 'LULUS', l2PostScore: 95.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 10, name: 'Afik Heri Isnanto', title: 'Operator Forklift', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 100.0, l4PreInvite: false, l2PreScore: 95.0, l2PreRemark: 'LULUS', l2PostScore: 90.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 11, name: 'Endro', title: 'Operator Forklift', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 72.0, l4PreInvite: false, l2PreScore: 100.0, l2PreRemark: 'LULUS', l2PostScore: 100.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 12, name: 'Purwanto D K', title: 'Checker', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 98.67, l4PreInvite: false, l2PreScore: 90.0, l2PreRemark: 'LULUS', l2PostScore: 100.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 13, name: 'Rudiyanto', title: 'Checker', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 97.33, l4PreInvite: false, l2PreScore: 100.0, l2PreRemark: 'LULUS', l2PostScore: 100.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 14, name: 'Bambang Giri Pamungkas', title: 'Checker', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 89.33, l4PreInvite: false, l2PreScore: 85.0, l2PreRemark: 'LULUS', l2PostScore: 100.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 15, name: 'Suyanto', title: 'TKBM', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 73.33, l4PreInvite: false, l2PreScore: 90.0, l2PreRemark: 'LULUS', l2PostScore: 90.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 16, name: 'Sihono', title: 'TKBM', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 97.33, l4PreInvite: false, l2PreScore: 95.0, l2PreRemark: 'LULUS', l2PostScore: 100.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 17, name: 'Sutarjo', title: 'TKBM', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 100.0, l4PreInvite: false, l2PreScore: 100.0, l2PreRemark: 'LULUS', l2PostScore: 95.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 18, name: 'Temon', title: 'TKBM', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 100.0, l4PreInvite: false, l2PreScore: 95.0, l2PreRemark: 'LULUS', l2PostScore: 100.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 19, name: 'Mujiman', title: 'TKBM', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 100.0, l4PreInvite: false, l2PreScore: 100.0, l2PreRemark: 'LULUS', l2PostScore: 85.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 20, name: 'Teguh Wiyono', title: 'TKBM', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 100.0, l4PreInvite: false, l2PreScore: 95.0, l2PreRemark: 'LULUS', l2PostScore: 90.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 21, name: 'Pardi Santoso', title: 'TKBM', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 89.33, l4PreInvite: false, l2PreScore: 100.0, l2PreRemark: 'LULUS', l2PostScore: 90.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 22, name: 'Budi Santoso', title: 'TKBM', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 97.33, l4PreInvite: false, l2PreScore: 85.0, l2PreRemark: 'LULUS', l2PostScore: 90.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 23, name: 'Sugiyanto', title: 'TKBM', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 97.33, l4PreInvite: false, l2PreScore: 95.0, l2PreRemark: 'LULUS', l2PostScore: 95.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 24, name: 'Agus Sunyoto', title: 'TKBM', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 92.0, l4PreInvite: false, l2PreScore: 100.0, l2PreRemark: 'LULUS', l2PostScore: 100.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 25, name: 'Sumadi', title: 'TKBM', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 92.0, l4PreInvite: false, l2PreScore: 95.0, l2PreRemark: 'LULUS', l2PostScore: 95.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 26, name: 'Suharsono', title: 'TKBM', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 98.67, l4PreInvite: false, l2PreScore: 100.0, l2PreRemark: 'LULUS', l2PostScore: 100.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 27, name: 'Sutardi', title: 'TKBM', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 96.0, l4PreInvite: false, l2PreScore: 95.0, l2PreRemark: 'LULUS', l2PostScore: 95.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' },
		{ no: 28, name: 'Slamet Widodo', title: 'TKBM', department: 'Project 4', trainingDate: '12 Januari 2026', trainer: 'Syarochman', training: 'Re-Induksi', l1Invite: true, l1Score: 98.67, l4PreInvite: false, l2PreScore: 100.0, l2PreRemark: 'LULUS', l2PostScore: 100.0, l2PostRemark: 'LULUS', l2Result: 'LULUS', l2ActionPlan: '-', certHris: true, l3Invite: true, l3Score: 100.0, l3Result: 'KOMPETEN', l3ActionPlan: '-', l4PostScore: 100.0, l4PostResult: 'BERDAMPAK POSITIF' }
	];

	const allKirkpatrickRecapRows = $derived.by(() => {
		const dynamicRows: any[] = [];
		let currentNo = masterHistoricalRecapData.length;

		attendances.forEach((att: any) => {
			const sess = sessions.find((s: any) => s.id === att.sessionId || s.title === att.sessionTitle);
			const crs = courses.find((c: any) => c.id === sess?.courseId || c.id === att.courseId);
			const l1 = evaluationsL1.find((e: any) => e.payrollId === att.payrollId && (e.courseId === crs?.id || e.courseTitle === crs?.title));
			const cert = certificates.find((c: any) => c.payrollId === att.payrollId && (c.courseId === crs?.id || c.courseTitle === crs?.title));
			const l3l4 = evaluationsL3L4.find((e: any) => e.payrollId === att.payrollId && (e.courseId === crs?.id));

			const l1Score = l1 ? Number(l1.overallScore || ((l1.contentRating + l1.instructorRating) / 2) * 20 || 85) : 85;
			const l2Pre = 75;
			const l2Post = cert ? Number(cert.score) : (att.status === 'HADIR' ? 88 : 65);
			const l2Pass = l2Post >= 75;
			const l3Score = l3l4?.supervisorScore ? Number(l3l4.supervisorScore) : (l3l4?.status === 'COMPLETED' ? 92 : 88);
			const l3Pass = l3Score >= 75;
			const l4Score = l3l4?.businessImpactScore ? Number(l3l4.businessImpactScore) : 88;
			const l4Pass = l4Score >= 75;

			currentNo += 1;
			dynamicRows.push({
				no: currentNo,
				name: att.employeeName,
				title: att.positionTitle || 'Staff Operasional',
				department: att.department || 'Operations',
				trainingDate: sess?.sessionDate || att.attendedAt || '15 Februari 2026',
				trainer: sess?.trainer || crs?.instructor || 'Trainer BCS',
				training: crs?.title || att.sessionTitle || 'Safety Training',
				l1Invite: true,
				l1Score: Number(l1Score.toFixed(2)),
				l4PreInvite: true,
				l2PreScore: l2Pre,
				l2PreRemark: 'LULUS',
				l2PostScore: l2Post,
				l2PostRemark: l2Pass ? 'LULUS' : 'REMEDIAL',
				l2Result: l2Pass ? 'LULUS' : 'REMEDIAL',
				l2ActionPlan: l2Pass ? '-' : 'Mengulang Materi & Tes Remedial',
				certHris: !!cert,
				l3Invite: true,
				l3Score: Number(l3Score.toFixed(2)),
				l3Result: l3Pass ? 'KOMPETEN' : 'PERLU COACHING',
				l3ActionPlan: l3Pass ? '-' : 'Pendampingan Atasan & Review SOP',
				l4PostScore: Number(l4Score.toFixed(2)),
				l4PostResult: l4Pass ? 'BERDAMPAK POSITIF' : 'EVALUASI KENDALA'
			});
		});

		return [...masterHistoricalRecapData, ...dynamicRows];
	});

	const filteredRecapRows = $derived(
		allKirkpatrickRecapRows.filter((r) => {
			const q = recapSearchQuery.trim().toLowerCase();
			const matchSearch =
				!q ||
				r.name.toLowerCase().includes(q) ||
				r.title.toLowerCase().includes(q) ||
				r.department.toLowerCase().includes(q) ||
				r.trainer.toLowerCase().includes(q) ||
				r.training.toLowerCase().includes(q);
			const matchTraining = recapFilterTraining === 'All' || r.training === recapFilterTraining;
			const matchDept = recapFilterDept === 'All' || r.department === recapFilterDept;
			const matchResult = recapFilterResult === 'All' || r.l2Result === recapFilterResult;
			return matchSearch && matchTraining && matchDept && matchResult;
		})
	);

	const recapTotalParticipants = $derived(filteredRecapRows.length);
	const recapAvgL1Score = $derived(
		recapTotalParticipants > 0
			? (filteredRecapRows.reduce((acc, curr) => acc + curr.l1Score, 0) / recapTotalParticipants).toFixed(1)
			: '0.0'
	);
	const recapL2PassRate = $derived(
		recapTotalParticipants > 0
			? ((filteredRecapRows.filter((r) => r.l2Result === 'LULUS').length / recapTotalParticipants) * 100).toFixed(1)
			: '100.0'
	);
	const recapL3CompetentRate = $derived(
		recapTotalParticipants > 0
			? ((filteredRecapRows.filter((r) => r.l3Result === 'KOMPETEN').length / recapTotalParticipants) * 100).toFixed(1)
			: '100.0'
	);

	const distinctRecapTrainings = $derived(Array.from(new Set(allKirkpatrickRecapRows.map((r) => r.training))));
	const distinctRecapDepts = $derived(Array.from(new Set(allKirkpatrickRecapRows.map((r) => r.department))));

	function exportDatabaseRecapToCSV() {
		const csvLines: string[] = [];
		csvLines.push('DATABASE RECAP TAHUN 2026,,,,,,,,,,,,,,,,,,,,,,');
		csvLines.push(',,,,,,,,,,,,,,,,,,,,,,');
		csvLines.push(',,,,,,,,,,,,,,,,,,,,,,');
		csvLines.push('NO,NAME,TITLE,DEPARTMENT,TRAINING DATE,TRAINER,TRAINING,Level 1,,Level 4,Level 2,,,,,Level 3,,,,Level 4,');
		csvLines.push(',,,,,,,INVITATION REACTION,REACTION EVALUATION,INVITATION BUSINESS IMPACT (PRE),LEARNING EVALUATION,,,,,INVITATION BEHAVIOR & BUSINESS IMPACT (POST),BEHAVIOR EVALUATION,,BEHAVIOR EVALUATION ACTION PLAN,BUSINESS IMPACT,');
		csvLines.push(',,,,,,,,,,PRE TEST,REMARK,POST TEST,REMARK,RESULT,LEARNING EVALUATION ACTION PLAN,SERTIFIKAT HRIS,,RESULT,,,RESULT');

		filteredRecapRows.forEach((r, idx) => {
			csvLines.push([
				idx + 1,
				`"${r.name.replace(/"/g, '""')}"`,
				`"${r.title.replace(/"/g, '""')}"`,
				`"${r.department.replace(/"/g, '""')}"`,
				`"${r.trainingDate.replace(/"/g, '""')}"`,
				`"${r.trainer.replace(/"/g, '""')}"`,
				`"${r.training.replace(/"/g, '""')}"`,
				r.l1Invite ? 'TRUE' : 'FALSE',
				r.l1Score.toFixed(2).replace('.', ','),
				r.l4PreInvite ? 'TRUE' : 'FALSE',
				r.l2PreScore.toFixed(2).replace('.', ','),
				`"${r.l2PreRemark}"`,
				r.l2PostScore.toFixed(2).replace('.', ','),
				`"${r.l2PostRemark}"`,
				`"${r.l2Result}"`,
				`"${r.l2ActionPlan}"`,
				r.certHris ? 'TRUE' : 'FALSE',
				r.l3Invite ? 'TRUE' : 'FALSE',
				r.l3Score.toFixed(2).replace('.', ','),
				`"${r.l3Result}"`,
				`"${r.l3ActionPlan}"`,
				r.l4PostScore.toFixed(2).replace('.', ','),
				`"${r.l4PostResult}"`
			].join(','));
		});

		const csvContent = '\uFEFF' + csvLines.join('\r\n');
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `DATABASE_RECAP_KIRKPATRICK_BCS_${new Date().getFullYear()}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// CSV Export Handlers
	function downloadGenericCSV(headers: string[], rows: any[][], filename: string) {
		const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		spawnToast({
			id: Date.now().toString(),
			title: 'Export Berhasil',
			message: `File CSV ${filename} berhasil diunduh.`,
			type: 'INFO',
			timestamp: new Date().toISOString()
		});
	}

	function exportL1ToCSV() {
		const headers = [
			'No', 'Tanggal Submit', 'Nama Peserta', 'Payroll ID', 'Kursus Pelatihan', 'Metode',
			'Materi (/5)', 'Trainer (/5)', 'Fasilitas (/5)', 'Skor Total (/5)',
			'Kesan Peserta', 'Manfaat Diterapkan', 'Saran Perbaikan'
		];
		const rows = evaluationsL1.map((e: any, idx: number) => [
			idx + 1,
			`"${e.submittedAt || '-'}"`,
			`"${e.employeeName || '-'}"`,
			`"${e.payrollId || '-'}"`,
			`"${e.courseTitle || '-'}"`,
			`"${e.deliveryMethod || 'Online'}"`,
			e.materialScore || e.contentRating || 5,
			e.instructorScore || e.instructorRating || 5,
			e.facilityScore || e.facilityRating || 5,
			e.overallScore || 5,
			`"${(e.impressions || '').replace(/"/g, '""')}"`,
			`"${(e.appliedBenefit || '').replace(/"/g, '""')}"`,
			`"${(e.suggestions || '').replace(/"/g, '""')}"`
		]);
		downloadGenericCSV(headers, rows, `Evaluasi_Kirkpatrick_Level1_Reaksi_${new Date().toISOString().split('T')[0]}.csv`);
	}

	function exportL4PreToCSV() {
		const headers = [
			'No', 'Nama Karyawan', 'Payroll ID', 'Departemen', 'Jabatan', 'Pelatihan', 'Atasan Langsung',
			'Kategori Skill', 'Jatuh Tempo (H+10)', 'Status', 'Rata-rata Baseline (/5.0)', 'Catatan Baseline'
		];
		const rows = filteredL4Pre.map((e: any, idx: number) => {
			const baseAvg = calcPreBaselineAvg(e.l4PreMetrics);
			return [
				idx + 1,
				`"${e.employeeName}"`,
				`"${e.payrollId}"`,
				`"${e.department}"`,
				`"${e.positionTitle}"`,
				`"${e.courseTitle}"`,
				`"${e.supervisorName}"`,
				`"${e.l4PreSkillCategory}"`,
				`"${e.l4PreDueDate || '-'}"`,
				`"${e.l4PreStatus}"`,
				baseAvg || '-',
				`"${(e.l4PreNotes || '').replace(/"/g, '""')}"`
			];
		});
		downloadGenericCSV(headers, rows, `Evaluasi_Kirkpatrick_Level4_PreTest_${new Date().toISOString().split('T')[0]}.csv`);
	}

	function exportL3ToCSV() {
		const headers = [
			'No', 'Nama Karyawan', 'Payroll ID', 'Departemen', 'Jabatan', 'Pelatihan', 'Atasan Langsung',
			'Tanggal Pelatihan', 'Jatuh Tempo (H+90)', 'Status', 'Rata-rata Skor Behavior (/3.00)', 'Saran Perbaikan Atasan', 'Tanggal Dinilai'
		];
		const rows = filteredL3.map((e: any, idx: number) => [
			idx + 1,
			`"${e.employeeName}"`,
			`"${e.payrollId}"`,
			`"${e.department}"`,
			`"${e.positionTitle}"`,
			`"${e.courseTitle}"`,
			`"${e.supervisorName}"`,
			`"${e.trainingCompletedAt || '-'}"`,
			`"${e.dueDate || '-'}"`,
			`"${e.l3Status}"`,
			e.l3AvgScore ? Number(e.l3AvgScore).toFixed(2) : '-',
			`"${(e.l3Feedback || '').replace(/"/g, '""')}"`,
			`"${e.l3ReviewedAt || '-'}"`
		]);
		downloadGenericCSV(headers, rows, `Evaluasi_Kirkpatrick_Level3_Behavior_${new Date().toISOString().split('T')[0]}.csv`);
	}

	function exportL4PostToCSV() {
		const headers = [
			'No', 'Nama Karyawan', 'Payroll ID', 'Departemen', 'Jabatan', 'Pelatihan', 'Atasan Langsung',
			'Kategori Skill', 'Status', 'Baseline Pre-Test', 'Aktual Post-Test', 'Delta (%)', 'Catatan Post-Test', 'Tanggal Dinilai'
		];
		const rows = filteredL4Post.map((e: any, idx: number) => {
			const preAvg = calcPreBaselineAvg(e.l4PreMetrics);
			const postAvg = calcPostAvg(e.l4PostMetrics);
			const delta = calcDeltaPercent(preAvg, postAvg);
			return [
				idx + 1,
				`"${e.employeeName}"`,
				`"${e.payrollId}"`,
				`"${e.department}"`,
				`"${e.positionTitle}"`,
				`"${e.courseTitle}"`,
				`"${e.supervisorName}"`,
				`"${e.l4PreSkillCategory}"`,
				`"${e.l4Status}"`,
				preAvg || '-',
				postAvg || '-',
				`${delta}%`,
				`"${(e.l4PostNotes || '').replace(/"/g, '""')}"`,
				`"${e.l4PostReviewedAt || '-'}"`
			];
		});
		downloadGenericCSV(headers, rows, `Evaluasi_Kirkpatrick_Level4_PostTest_${new Date().toISOString().split('T')[0]}.csv`);
	}

	// Filtered Courses in Catalog
	let filteredCourses = $derived(
		courses.filter((c: any) => {
			const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
			const matchesBased = selectedBased === 'All' || c.based === selectedBased;
			if (!matchesCategory || !matchesBased) return false;
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				c.title.toLowerCase().includes(q) ||
				c.description?.toLowerCase().includes(q) ||
				c.instructor?.toLowerCase().includes(q) ||
				c.department?.toLowerCase().includes(q) ||
				(c.tags || []).some((t: string) => t.toLowerCase().includes(q))
			);
		})
	);

	// Filtered Employee Assessments (TNA Gap Tracking)
	let filteredEmployeeAssessments = $derived(
		employeeAssessments.filter((a: any) => {
			if (tnaFilterDept !== 'All' && a.department !== tnaFilterDept) return false;
			if (tnaFilterStatus === 'GAP' && a.gap >= 0) return false;
			if (tnaFilterStatus === 'QUALIFIED' && a.gap < 0) return false;
			if (tnaFilterStatus === 'ASSIGNED' && a.trainingStatus !== 'ASSIGNED') return false;
			if (!tnaSearchQuery.trim()) return true;
			const q = tnaSearchQuery.toLowerCase();
			return (
				a.employeeName.toLowerCase().includes(q) ||
				a.payrollId.toLowerCase().includes(q) ||
				a.positionTitle.toLowerCase().includes(q) ||
				a.competencyName.toLowerCase().includes(q) ||
				a.competencyCode.toLowerCase().includes(q)
			);
		})
	);

	// Grouped Employee Assessments (TNA Grouped by Employee)
	let groupedEmployeeAssessments = $derived.by(() => {
		const map = new Map<string, {
			payrollId: string;
			employeeName: string;
			positionTitle: string;
			department: string;
			items: any[];
			totalCompetencies: number;
			gapCount: number;
			qualifiedCount: number;
			assignedCount: number;
			completedCount: number;
		}>();

		for (const a of employeeAssessments) {
			const key = a.payrollId || a.employeeName;
			if (!map.has(key)) {
				map.set(key, {
					payrollId: a.payrollId || '-',
					employeeName: a.employeeName,
					positionTitle: a.positionTitle || '-',
					department: a.department || 'General',
					items: [],
					totalCompetencies: 0,
					gapCount: 0,
					qualifiedCount: 0,
					assignedCount: 0,
					completedCount: 0
				});
			}
			const grp = map.get(key)!;
			grp.items.push(a);
			grp.totalCompetencies++;
			if (a.gap < 0) grp.gapCount++;
			else grp.qualifiedCount++;
			if (a.trainingStatus === 'ASSIGNED') grp.assignedCount++;
			if (a.trainingStatus === 'COMPLETED') grp.completedCount++;
		}

		return Array.from(map.values());
	});

	let filteredGroupedEmployeeAssessments = $derived.by(() => {
		const q = tnaSearchQuery.trim().toLowerCase();
		return groupedEmployeeAssessments.filter((grp) => {
			if (tnaFilterDept !== 'All' && grp.department !== tnaFilterDept) return false;
			if (tnaFilterStatus === 'GAP' && grp.gapCount === 0) return false;
			if (tnaFilterStatus === 'QUALIFIED' && grp.gapCount > 0) return false;
			if (tnaFilterStatus === 'ASSIGNED' && grp.assignedCount === 0 && grp.completedCount === 0) return false;

			if (!q) return true;

			if (
				grp.employeeName.toLowerCase().includes(q) ||
				grp.payrollId.toLowerCase().includes(q) ||
				grp.positionTitle.toLowerCase().includes(q) ||
				grp.department.toLowerCase().includes(q)
			) {
				return true;
			}

			return grp.items.some((item) =>
				item.competencyName.toLowerCase().includes(q) ||
				item.competencyCode.toLowerCase().includes(q)
			);
		});
	});

	let expandedEmployees = $state<Record<string, boolean>>({});

	function toggleEmployeeExpand(key: string) {
		expandedEmployees[key] = !expandedEmployees[key];
	}

	function toggleAllEmployees(expand: boolean) {
		const next: Record<string, boolean> = {};
		if (expand) {
			filteredGroupedEmployeeAssessments.forEach((grp) => {
				next[grp.payrollId || grp.employeeName] = true;
			});
		}
		expandedEmployees = next;
	}

	// Grouped Job Standards (Grouped by Position / Jabatan)
	let jobStandardSearchQuery = $state('');
	let jobStandardFilterDivision = $state('All');

	let groupedJobStandards = $derived.by(() => {
		const map = new Map<string, {
			key: string;
			positionTitle: string;
			division: string;
			department: string;
			competencies: any[];
			totalCompetencies: number;
			linkedCoursesCount: number;
			minLevel: number;
			maxLevel: number;
		}>();

		for (const std of jobStandards) {
			const posKey = `${std.positionTitle}:::${std.division || std.department || 'General'}`;
			if (!map.has(posKey)) {
				map.set(posKey, {
					key: posKey,
					positionTitle: std.positionTitle,
					division: std.division || std.department || 'General',
					department: std.department || std.division || 'General',
					competencies: [],
					totalCompetencies: 0,
					linkedCoursesCount: 0,
					minLevel: std.requiredLevel,
					maxLevel: std.requiredLevel
				});
			}
			const grp = map.get(posKey)!;
			grp.competencies.push(std);
			grp.totalCompetencies++;
			if (std.defaultCourseTitle && std.defaultCourseTitle !== '-') {
				grp.linkedCoursesCount++;
			}
			if (std.requiredLevel < grp.minLevel) grp.minLevel = std.requiredLevel;
			if (std.requiredLevel > grp.maxLevel) grp.maxLevel = std.requiredLevel;
		}

		return Array.from(map.values());
	});

	let filteredGroupedJobStandards = $derived.by(() => {
		const q = jobStandardSearchQuery.trim().toLowerCase();
		return groupedJobStandards.filter((grp) => {
			if (jobStandardFilterDivision !== 'All' && grp.division !== jobStandardFilterDivision) {
				return false;
			}
			if (!q) return true;

			if (
				grp.positionTitle.toLowerCase().includes(q) ||
				grp.division.toLowerCase().includes(q)
			) {
				return true;
			}

			return grp.competencies.some((c: any) =>
				c.competencyName.toLowerCase().includes(q) ||
				c.competencyCode.toLowerCase().includes(q) ||
				(c.defaultCourseTitle && c.defaultCourseTitle.toLowerCase().includes(q))
			);
		});
	});

	let expandedPositions = $state<Record<string, boolean>>({});

	function togglePositionExpand(key: string) {
		expandedPositions[key] = !expandedPositions[key];
	}

	function toggleAllPositions(expand: boolean) {
		const next: Record<string, boolean> = {};
		if (expand) {
			filteredGroupedJobStandards.forEach((grp) => {
				next[grp.key] = true;
			});
		}
		expandedPositions = next;
	}

	// Derived Competency Aspects List
	const competencyAspects = $derived([
		'All',
		...Array.from(new Set(competencyLibrary.map((c: any) => c.aspect).filter(Boolean)))
	]);

	// Filtered & Paged Competency Library
	let filteredCompetencyLibrary = $derived(
		competencyLibrary.filter((c: any) => {
			if (compFilterAspect !== 'All' && c.aspect !== compFilterAspect) return false;
			if (compFilterStatus === 'Linked' && !c.defaultCourseId) return false;
			if (compFilterStatus === 'Unlinked' && c.defaultCourseId) return false;
			if (!compSearchQuery.trim()) return true;
			const q = compSearchQuery.toLowerCase();
			return (
				c.name.toLowerCase().includes(q) ||
				c.code.toLowerCase().includes(q) ||
				(c.defaultCourseTitle && c.defaultCourseTitle.toLowerCase().includes(q))
			);
		})
	);

	let totalCompPages = $derived(Math.ceil(filteredCompetencyLibrary.length / compPerPage) || 1);
	let pagedCompetencyLibrary = $derived(
		filteredCompetencyLibrary.slice((compCurrentPage - 1) * compPerPage, compCurrentPage * compPerPage)
	);

	function openLinkCourseModal(comp: any) {
		selectedCompForLink = comp;
		isLinkCourseModalOpen = true;
	}

	function openAssignCourseModal(assessment: any) {
		selectedAssessmentForAssign = assessment;
		assignFormCourseId = assessment.assignedCourseId || '';
		assignFormSetDefault = true;
		isAssignCourseModalOpen = true;
	}
	let activePreTestQuestions = $derived(
		quizQuestions.filter((q: any) => q.courseId === activeCourseForPlayer?.id && q.quizType === 'PRE_TEST')
	);
	let activePostTestQuestions = $derived(
		quizQuestions.filter((q: any) => q.courseId === activeCourseForPlayer?.id && q.quizType === 'POST_TEST')
	);

	function isUserAttendedOffline(courseId: string) {
		const userPayroll = (currentUser?.payrollId || currentUser?.nik || 'EMP-0042').toString().trim().toLowerCase();
		const userName = (currentUser?.name || 'GUNTORO MUHAMAD').toString().trim().toLowerCase();

		return attendances.some((a: any) => {
			const matchCourse = a.courseId === courseId || sessions.some((s: any) => s.id === a.sessionId && s.courseId === courseId);
			if (!matchCourse) return false;
			const aPayroll = (a.payrollId || '').toString().trim().toLowerCase();
			const aName = (a.employeeName || '').toString().trim().toLowerCase();
			const isMatch = (userPayroll && aPayroll === userPayroll) || (userName && aName === userName);
			return isMatch && a.status === 'HADIR';
		});
	}

	function hasUserSubmittedL1(courseId: string) {
		const userPayroll = (currentUser?.payrollId || currentUser?.nik || 'EMP-0042').toString().trim().toLowerCase();
		const userName = (currentUser?.name || 'GUNTORO MUHAMAD').toString().trim().toLowerCase();

		return evaluationsL1.some((e: any) => {
			if (e.courseId !== courseId) return false;
			const ePayroll = (e.payrollId || '').toString().trim().toLowerCase();
			const eName = (e.employeeName || '').toString().trim().toLowerCase();
			return (userPayroll && ePayroll === userPayroll) || (userName && eName === userName);
		});
	}

	let pendingOfflineL1Courses = $derived(
		courses.filter((c: any) => isUserAttendedOffline(c.id) && !hasUserSubmittedL1(c.id))
	);

	function openCoursePlayer(course: any) {
		activeCourseForPlayer = course;
		activeModuleIndex = 0;
		preTestAnswered = {};
		postTestAnswered = {};
		preTestSubmitted = false;
		postTestResult = null;
		evalL1State = {
			q1_systematic: 5,
			q2_completeness: 5,
			q3_relevance: 5,
			q4_duration: 5,
			q5_knowledge_gain: 5,
			q6_mastery: 5,
			q7_delivery: 5,
			q8_engagement: 5,
			q9_qa: 5,
			q10_venue: 5,
			q11_tools: 5,
			q12_refreshment: 5,
			q13_cleanliness: 5,
			q14_committee: 5,
			q15_discipline: 5,
			appliedBenefit: '',
			impressions: '',
			suggestions: ''
		};

		const attendedOffline = isUserAttendedOffline(course.id);
		const submittedL1 = hasUserSubmittedL1(course.id);

		if (submittedL1) {
			isOfflineAttendedCourse = attendedOffline;
			playerStep = 5;
		} else if (attendedOffline) {
			isOfflineAttendedCourse = true;
			preTestSubmitted = true;
			playerStep = 4;
		} else {
			isOfflineAttendedCourse = false;
			playerStep = 1;
		}

		isPlayerModalOpen = true;
	}

	function handlePreTestSubmit() {
		preTestSubmitted = true;
		playerStep = 2; // Unlock step 2 (Materi Modul)
		spawnToast({
			id: Date.now().toString(),
			title: 'Pre-Test Selesai',
			message: 'Hasil pre-test tercatat. Modul materi kursus sekarang dapat dipelajari.',
			type: 'INFO',
			timestamp: new Date().toISOString()
		});
	}

	function nextModule() {
		if (activeCourseForPlayer && activeModuleIndex < (activeCourseForPlayer.modules?.length || 1) - 1) {
			activeModuleIndex++;
		} else {
			// Seluruh modul materi tuntas -> Buka Post-Test
			playerStep = 3;
		}
	}

	function handleLocalPostTestSubmit() {
		const totalQ = activePostTestQuestions.length || 1;
		let correctCount = 0;
		activePostTestQuestions.forEach((q: any) => {
			if (q.questionType === 'ESSAY') {
				if (postTestAnswered[q.id]?.toString().trim()) {
					correctCount++;
				}
			} else if (postTestAnswered[q.id] === q.correctKey) {
				correctCount++;
			}
		});
		const calculatedScore = Math.round((correctCount / totalQ) * 100);
		const passing = activeCourseForPlayer?.passingGrade || 75;
		const passed = calculatedScore >= passing;
		const certSeq = Math.floor(1000 + Math.random() * 9000);
		const certNum = passed ? `CERT-BCS-2026-${certSeq}` : undefined;

		postTestResult = {
			passed,
			score: calculatedScore,
			certNumber: certNum
		};

		if (passed) {
			playerStep = 4; // Langsung maju ke Evaluasi Level 1
			spawnToast({
				id: Date.now().toString(),
				title: 'Lulus Post-Test!',
				message: `Nilai Anda ${calculatedScore}/100. Harap isi form evaluasi kepuasan (Level 1).`,
				type: 'INFO',
				timestamp: new Date().toISOString()
			});
		} else {
			spawnToast({
				id: Date.now().toString(),
				title: 'Belum Mencapai Passing Grade',
				message: `Nilai Anda ${calculatedScore}/100 (Passing Grade: ${passing}). Silakan pelajari kembali materi dan lakukan remedial.`,
				type: 'WARNING',
				timestamp: new Date().toISOString()
			});
		}
	}

	function handleLocalEvalL1Submit() {
		playerStep = 5;
		spawnToast({
			id: Date.now().toString(),
			title: 'Evaluasi Tersimpan',
			message: 'Terima kasih atas penilaian Anda! E-Sertifikat resmi Anda telah diterbitkan.',
			type: 'INFO',
			timestamp: new Date().toISOString()
		});
	}

	function openCertificate(cert: any) {
		activeCertData = cert;
		isCertModalOpen = true;
	}

	function openAttendanceModal(session: any) {
		activeSessionForAttendance = session;
		clearAllAttendanceEmployees();
		attendanceDivisionFilter = '';
		isAttendanceModalOpen = true;
	}

	function openSupervisorModal(evalItem: any) {
		activeEvalForSupervisor = evalItem;
		isEvalSupervisorModalOpen = true;
	}

	// Export CSV Helper (Dinamis sesuai 5 Laporan Master Spreadsheet + E-Sertifikat)
	function exportReportsToCSV() {
		let headers: string[] = [];
		let rows: any[][] = [];
		let filename = '';

		if (activeReportType === 'training' || activeReportType === 'course') {
			const yr = new Date().getFullYear();
			const csvLines: string[] = [];

			// Header Master Annual Report PT BCS (Sheet GID 1841084949)
			csvLines.push(`ANNUAL REPORT PELATIHAN DAN PENGEMBANGAN KARYAWAN TAHUN ${yr},,,,,,,,,,,,,,,,,,,,,,,`);
			csvLines.push(',,,,,,,,,,,,,,,,,,,,,,,');
			csvLines.push(',,,,,,,,,,,,,,,,,,,,,,,');
			csvLines.push('NO,TRAINING,COMPETENCY,BASED,TRAINING DATE,TRAINING EVALUATION (REACTION),TRAINING EVALUATION (LEARNING),,,,TRAINING EVALUATION (BEHAVIOR),,TRAINING EVALUATION (BUSINESS IMPACT),,TOTAL MP,TOTAL HOURS,TOTAL COST,LEVEL,,,,,,');

			// Section 1: INTERNAL TRAINING
			csvLines.push('INTERNAL TRAINING,,,,,SKOR,PRE TEST,REMARK,POST TEST,REMARK,SKOR,REMARK,SKOR,REMARK,,,,OPR,STAFF,OFF/FRM/WH HEAD,SPV,MGR,GM,BOD');
			internalTrainingReports.forEach((item: any, idx: number) => {
				csvLines.push([
					idx + 1,
					`"${item.title.replace(/"/g, '""')}"`,
					`"${item.category || '-'}"`,
					`"${item.based || 'Mandatory'}"`,
					`"${item.formattedDate || '-'}"`,
					`"${item.reactionScore}"`,
					`"${item.preTestScore}"`,
					`"${item.preTestRemark}"`,
					`"${item.postTestScore}"`,
					`"${item.postTestRemark}"`,
					`"${item.behaviorScore}"`,
					`"${item.behaviorRemark}"`,
					`"${item.impactScore}"`,
					`"${item.impactRemark}"`,
					item.totalMp,
					item.totalHours,
					`"Rp ${Number(item.totalCost).toLocaleString('id-ID')}"`,
					item.levelMatrix.opr ? '✔️' : '',
					item.levelMatrix.staff ? '✔️' : '',
					item.levelMatrix.off ? '✔️' : '',
					item.levelMatrix.spv ? '✔️' : '',
					item.levelMatrix.mgr ? '✔️' : '',
					item.levelMatrix.gm ? '✔️' : '',
					item.levelMatrix.bod ? '✔️' : ''
				].join(','));
			});

			// Subtotal Internal
			csvLines.push([
				'TOTAL INTERNAL',
				'', '', '', '',
				`"${internalTotals.avgReaction}"`,
				'N/A', '',
				`"${internalTotals.avgPost}"`,
				'',
				`"${internalTotals.avgL3}"`,
				'',
				`"${internalTotals.avgL4}"`,
				'',
				internalTotals.totalMp,
				internalTotals.totalHours,
				`"Rp ${Number(internalTotals.totalCost).toLocaleString('id-ID')}"`,
				'', '', '', '', '', '', ''
			].join(','));

			// Section 2: EXTERNAL TRAINING
			csvLines.push('EXTERNAL TRAINING,,,,,SKOR,PRE TEST,REMARK,POST TEST,REMARK,SKOR,REMARK,SKOR,REMARK,,,,OPR,STAFF,OFF/FRM/WH HEAD,SPV,MGR,GM,BOD');
			externalTrainingReports.forEach((item: any, idx: number) => {
				csvLines.push([
					idx + 1,
					`"${item.title.replace(/"/g, '""')}"`,
					`"${item.category || '-'}"`,
					`"${item.based || 'Additional'}"`,
					`"${item.formattedDate || '-'}"`,
					`"${item.reactionScore}"`,
					`"${item.preTestScore}"`,
					`"${item.preTestRemark}"`,
					`"${item.postTestScore}"`,
					`"${item.postTestRemark}"`,
					`"${item.behaviorScore}"`,
					`"${item.behaviorRemark}"`,
					`"${item.impactScore}"`,
					`"${item.impactRemark}"`,
					item.totalMp,
					item.totalHours,
					`"Rp ${Number(item.totalCost).toLocaleString('id-ID')}"`,
					item.levelMatrix.opr ? '✔️' : '',
					item.levelMatrix.staff ? '✔️' : '',
					item.levelMatrix.off ? '✔️' : '',
					item.levelMatrix.spv ? '✔️' : '',
					item.levelMatrix.mgr ? '✔️' : '',
					item.levelMatrix.gm ? '✔️' : '',
					item.levelMatrix.bod ? '✔️' : ''
				].join(','));
			});

			// Subtotal External
			csvLines.push([
				'TOTAL EXTERNAL',
				'', '', '', '',
				`"${externalTotals.avgReaction}"`,
				'N/A', '',
				`"${externalTotals.avgPost}"`,
				'',
				`"${externalTotals.avgL3}"`,
				'',
				`"${externalTotals.avgL4}"`,
				'',
				externalTotals.totalMp,
				externalTotals.totalHours,
				`"Rp ${Number(externalTotals.totalCost).toLocaleString('id-ID')}"`,
				'', '', '', '', '', '', ''
			].join(','));

			// Grand Total
			csvLines.push([
				'GRAND TOTAL',
				'', '', '', '',
				`"${grandTotals.avgReaction}"`,
				'N/A', '',
				`"${grandTotals.avgPost}"`,
				'',
				`"${grandTotals.avgL3}"`,
				'',
				`"${grandTotals.avgL4}"`,
				'',
				grandTotals.totalMp,
				grandTotals.totalHours,
				`"Rp ${Number(grandTotals.totalCost).toLocaleString('id-ID')}"`,
				'', '', '', '', '', '', ''
			].join(','));

			filename = `Annual_Report_Pelatihan_BCS_${yr}.csv`;
			const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.setAttribute('href', url);
			link.setAttribute('download', filename);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			spawnToast({
				id: Date.now().toString(),
				title: 'Export Berhasil',
				message: `File ${filename} berhasil diunduh.`,
				type: 'SUCCESS',
				timestamp: new Date().toISOString()
			});
			return;
		} else if (activeReportType === 'attendance') {
			headers = ['No', 'Nama Peserta', 'Payroll ID', 'Departemen', 'Sesi Training', 'Waktu Hadir', 'Status Kehadiran', 'Catatan'];
			rows = attendances.map((a: any, idx: number) => [
				idx + 1,
				`"${a.employeeName}"`,
				`"${a.payrollId}"`,
				`"${a.department}"`,
				`"${a.sessionTitle}"`,
				`"${a.attendedAt}"`,
				`"${a.status}"`,
				`"${a.notes || '-'}"`
			]);
			filename = `Attendance_Report_BCS_${new Date().toISOString().split('T')[0]}.csv`;
		} else if (activeReportType === 'assessment') {
			headers = ['No', 'Nama Training', 'Nama Peserta', 'Payroll ID', 'Kategori', 'Nilai Ujian', 'Passing Grade', 'Hasil Kelulusan', 'No. Sertifikat', 'Tanggal'];
			rows = certificates.map((c: any, idx: number) => [
				idx + 1,
				`"${c.courseTitle}"`,
				`"${c.employeeName}"`,
				`"${c.payrollId}"`,
				`"${c.category}"`,
				c.score,
				75,
				c.score >= 75 ? 'LULUS' : 'REMEDIAL',
				`"${c.certificateNumber}"`,
				`"${c.issuedAt}"`
			]);
			filename = `Assessment_Report_BCS_${new Date().toISOString().split('T')[0]}.csv`;
		} else if (activeReportType === 'competency_gap') {
			headers = ['No', 'Departemen', 'Jabatan', 'Nama Karyawan', 'Payroll ID', 'Aspek Kompetensi', 'Kode', 'Nama Kompetensi', 'Required Level', 'Actual Level', 'Gap', 'Status', 'Rekomendasi Pelatihan (TNA)'];
			rows = competencyGapList.map((cg: any, idx: number) => [
				idx + 1,
				`"${cg.department}"`,
				`"${cg.positionTitle}"`,
				`"${cg.employeeName}"`,
				`"${cg.payrollId}"`,
				`"${cg.aspect}"`,
				`"${cg.competencyCode}"`,
				`"${cg.competencyName}"`,
				cg.requiredLevel,
				cg.actualLevel,
				cg.gap,
				`"${cg.status}"`,
				`"${cg.recommendation}"`
			]);
			filename = `Competency_Gap_TNA_Report_BCS_${new Date().toISOString().split('T')[0]}.csv`;
		} else {
			// Certificates
			headers = ['No', 'Nomor Sertifikat', 'Payroll ID', 'Nama Karyawan', 'Kursus Pelatihan', 'Kategori', 'Nilai', 'Tanggal Terbit', 'URL Verifikasi'];
			rows = certificates.map((c: any, index: number) => [
				index + 1,
				`"${c.certificateNumber}"`,
				`"${c.payrollId}"`,
				`"${c.employeeName}"`,
				`"${c.courseTitle}"`,
				`"${c.category}"`,
				c.score,
				`"${c.issuedAt}"`,
				`"${c.qrVerifyUrl}"`
			]);
			filename = `E_Sertifikat_Report_BCS_${new Date().toISOString().split('T')[0]}.csv`;
		}

		const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		spawnToast({
			id: Date.now().toString(),
			title: 'Export Berhasil',
			message: `File CSV ${filename} berhasil diunduh.`,
			type: 'INFO',
			timestamp: new Date().toISOString()
		});
	}

	$effect(() => {
		if (form) {
			if (form.success) {
				spawnToast({
					id: Date.now().toString(),
					title: 'Sukses',
					message: form.message || 'Operasi berhasil dijalankan',
					type: 'INFO',
					timestamp: new Date().toISOString()
				});
				isCreateModalOpen = false;
				isSessionModalOpen = false;
				isAttendanceModalOpen = false;
				isEvalSupervisorModalOpen = false;
				isRequestModalOpen = false;
				isSafetyTestModalOpen = false;
			} else if (form.message) {
				spawnToast({
					id: Date.now().toString(),
					title: 'Peringatan',
					message: form.message,
					type: 'WARNING',
					timestamp: new Date().toISOString()
				});
			}
		}
	});
</script>

<svelte:head>
	<title>LMS & Training Academy | HRIS PT BCS Logistics</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Top Page Header -->
	<header class="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">school</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Learning Management System (LMS)</h1>
				<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
					Enterprise Academy
				</span>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pusat pengembangan kompetensi, sertifikasi pengemudi, evaluasi multi-level Kirkpatrick, dan kepatuhan K3 PT BCS Logistics
			</p>
		</div>

		<div class="flex items-center gap-3">
			<a
				href="https://academy.bcslabs.tech"
				target="_blank"
				rel="noreferrer"
				class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-1.5 transition-all"
			>
				<span class="material-symbols-outlined text-sm">open_in_new</span>
				<span>Portal Karyawan</span>
			</a>

			<button
				type="button"
				onclick={openCreateCourseModal}
				class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
			>
				<span class="material-symbols-outlined text-sm">add_circle</span>
				<span>+ Tambah Pelatihan Baru</span>
			</button>
		</div>
	</header>

	<!-- KPI Metric Cards -->
	<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 flex-shrink-0">
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Pelatihan</p>
			<h3 class="text-xl font-black text-on-surface mt-1 font-mono">{metrics.totalCourses}</h3>
			<p class="text-[10px] text-emerald-600 font-semibold mt-1">Program Aktif</p>
		</div>

		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Peserta Aktif</p>
			<h3 class="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">{metrics.activeLearners}</h3>
			<p class="text-[10px] text-slate-500 font-medium mt-1">Driver & Staff Lapangan</p>
		</div>

		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kepuasan Lvl 1</p>
			<h3 class="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono flex items-center gap-1">
				<span>{metrics.avgSatisfaction}</span>
				<span class="material-symbols-outlined text-sm text-amber-500">star</span>
			</h3>
			<p class="text-[10px] text-amber-600 font-medium mt-1">Reaksi Peserta Training</p>
		</div>

		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Review Atasan</p>
			<h3 class="text-xl font-black {metrics.pendingSupervisorReviews > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'} mt-1 font-mono">
				{metrics.pendingSupervisorReviews}
			</h3>
			<p class="text-[10px] text-slate-500 font-medium mt-1">Due Date H+3 Bulan</p>
		</div>

		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kepatuhan K3</p>
			<h3 class="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">{metrics.complianceRate}%</h3>
			<p class="text-[10px] text-emerald-600 font-medium mt-1">Safety Test 2026</p>
		</div>

		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sertifikat Terbit</p>
			<h3 class="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 font-mono">{metrics.totalCertificates}</h3>
			<p class="text-[10px] text-purple-600 font-medium mt-1">E-Certificate Resmi</p>
		</div>
	</div>

	<!-- Main Workspace Card (5 Tabs) -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col min-h-0">
		<!-- Navigation Tab Bar (Flat Standard) -->
		<div class="border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/40 px-4 pt-2 flex items-center gap-2 overflow-x-auto">
			{#each tabs as tab}
				<button
					type="button"
					onclick={() => (activeTab = tab.id as TabType)}
					class="flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap
					{activeTab === tab.id
						? 'border-primary text-primary bg-surface-container-highest/60 rounded-t-xl'
						: 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40 rounded-t-xl'}"
				>
					<span class="material-symbols-outlined text-base">{tab.icon}</span>
					<span>{tab.label}</span>
				</button>
			{/each}
		</div>

		<!-- Tab Content Area -->
		<div class="p-6 flex-1 overflow-y-auto">
			<!-- TAB 1: KATALOG & KURSUS -->
			{#if activeTab === 'catalog'}
				<div class="space-y-6">
					<!-- Notification Banner: Pelatihan Tatap Muka Menunggu Evaluasi Level 1 -->
					{#if pendingOfflineL1Courses.length > 0}
						<div class="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/15 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-200">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
									<span class="material-symbols-outlined text-xl">rate_review</span>
								</div>
								<div>
									<div class="flex items-center gap-2">
										<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300">
											Tiket Evaluasi Tatap Muka
										</span>
										<span class="text-xs font-bold text-on-surface">
											{pendingOfflineL1Courses.length} Pelatihan Selesai Dihadiri
										</span>
									</div>
									<p class="text-xs text-on-surface-variant mt-0.5">
										Kehadiran Anda pada kelas tatap muka telah terkonfirmasi. Silakan lengkapi form Evaluasi Level 1 (Reaction) untuk langsung mengunduh E-Sertifikat resmi Anda.
									</p>
								</div>
							</div>
							<div class="flex flex-wrap items-center gap-2 shrink-0">
								{#each pendingOfflineL1Courses as pCourse}
									<button
										type="button"
										onclick={() => openCoursePlayer(pCourse)}
										class="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
									>
										<span class="material-symbols-outlined text-sm">assignment_turned_in</span>
										<span>Isi Evaluasi ({pCourse.title.length > 20 ? pCourse.title.substring(0, 20) + '...' : pCourse.title})</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Filter & Search Bar -->
					<div class="space-y-2.5">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div class="flex items-center gap-2 flex-1 max-w-md">
								<div class="relative w-full">
									<span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
									<input
										type="text"
										bind:value={searchQuery}
										placeholder="Cari judul kursus, materi, instruktur, departemen..."
										class="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
									/>
								</div>
							</div>

							<!-- Category Filter Buttons -->
							<div class="flex items-center gap-1.5 overflow-x-auto pb-1">
								{#each categories as cat}
									<button
										type="button"
										onclick={() => (selectedCategory = cat)}
										class="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer
										{selectedCategory === cat
											? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs'
											: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
									>
										{cat}
									</button>
								{/each}
							</div>
						</div>

						<!-- Based Filter (Spreadsheet Standard: Mandatory / Additional / Gap Competency) -->
						<div class="flex items-center gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
							<span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Klasifikasi Based:</span>
							<div class="flex items-center gap-1.5 overflow-x-auto">
								{#each basedOptions as b}
									<button
										type="button"
										onclick={() => (selectedBased = b)}
										class="px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer
										{selectedBased === b
											? b === 'Mandatory'
												? 'bg-rose-500 text-white shadow-xs'
												: b === 'Additional'
												? 'bg-amber-500 text-slate-950 shadow-xs'
												: b === 'Gap Competency'
												? 'bg-purple-600 text-white shadow-xs'
												: 'bg-primary text-on-primary shadow-xs'
											: 'bg-surface-container text-slate-500 hover:bg-surface-container-high'}"
									>
										{b}
									</button>
								{/each}
							</div>
						</div>
					</div>

					<!-- Courses Grid -->
					{#if filteredCourses.length === 0}
						<div class="p-12 text-center rounded-2xl bg-surface-container border border-dashed border-slate-300 dark:border-slate-800">
							<span class="material-symbols-outlined text-4xl text-slate-400">auto_stories</span>
							<p class="font-bold text-sm text-on-surface mt-2">Tidak ada kursus yang sesuai kriteria</p>
							<p class="text-xs text-on-surface-variant mt-1">Coba ubah kata kunci pencarian atau kategori filter.</p>
						</div>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
							{#each filteredCourses as course}
								{@const courseSessions = sessions.filter((s) => s.courseId === course.id)}
								{@const nearestSession = courseSessions.length > 0 ? courseSessions[courseSessions.length - 1] : null}
								{@const isOfflineAttended = isUserAttendedOffline(course.id)}
								{@const isL1Submitted = hasUserSubmittedL1(course.id)}
								<div class="rounded-2xl bg-surface-container border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col justify-between group hover:border-primary/50 transition-all shadow-xs">
									<div>
										<!-- Thumbnail Banner -->
										<div class="h-36 w-full bg-slate-800 relative overflow-hidden">
											<img
												src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600'}
												alt={course.title}
												class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
											/>
											<div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
											<div class="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
												{#if isOfflineAttended && !isL1Submitted}
													<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm animate-pulse">
														<span class="material-symbols-outlined text-[10px]">rate_review</span>
														<span>Wajib Evaluasi Lvl 1</span>
													</span>
												{:else if isL1Submitted}
													<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white flex items-center gap-1 shadow-sm">
														<span class="material-symbols-outlined text-[10px]">workspace_premium</span>
														<span>Tuntas & Bersertifikat</span>
													</span>
												{/if}
												<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider
													{course.based === 'Mandatory' ? 'bg-rose-500 text-white' :
													course.based === 'Additional' ? 'bg-amber-500 text-slate-950 font-bold' :
													course.based === 'Gap Competency' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}">
													{course.based || course.level}
												</span>
												<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-900/80 text-slate-200 backdrop-blur-xs">
													{course.category}
												</span>
												<span class="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider
													{course.trainerType === 'Eksternal' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-200'}">
													{course.trainerType || 'Internal'}
												</span>
											</div>
											<div class="absolute bottom-2.5 left-3 right-3 flex justify-between items-end text-white text-xs">
												<span class="font-mono text-[10px] text-slate-300">{course.id}</span>
												<div class="flex items-center gap-1 text-amber-400 font-bold text-[11px]">
													<span class="material-symbols-outlined text-xs">star</span>
													<span>{course.rating.toFixed(1)}</span>
												</div>
											</div>
										</div>

										<!-- Content Details -->
										<div class="p-4 space-y-2.5">
											<h4 class="font-black text-sm text-on-surface line-clamp-2 leading-snug">
												{course.title}
											</h4>
											<p class="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
												{course.description}
											</p>

											<div class="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
												<span class="flex items-center gap-0.5">
													<span class="material-symbols-outlined text-xs">domain</span>
													<span>Target: <strong>{course.department || 'All Dept'}</strong></span>
												</span>
												<span>•</span>
												<span class="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
													<span class="material-symbols-outlined text-xs">payments</span>
													<span>Rp {Number(course.costTrainer || 500000).toLocaleString('id-ID')}</span>
												</span>
											</div>

											<!-- Widget Jadwal Sesi Terdekat & Absensi -->
											{#if nearestSession}
												<div class="p-2.5 rounded-xl bg-surface-container-high/60 border border-slate-200/80 dark:border-slate-800/80 text-[11px] space-y-1">
													<div class="flex items-center justify-between">
														<span class="text-primary font-bold flex items-center gap-1 text-[10px] uppercase tracking-wider">
															<span class="material-symbols-outlined text-xs">event</span>
															<span>Sesi Terdekat:</span>
														</span>
														<span class="px-2 py-0.2 rounded-full text-[9px] font-black uppercase {nearestSession.sessionType === 'ONLINE' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}">
															{nearestSession.sessionType}
														</span>
													</div>
													<p class="font-bold text-on-surface text-xs leading-snug">
														{nearestSession.sessionDate} • {nearestSession.startTime} - {nearestSession.endTime} WIB
													</p>
													<p class="text-[10px] text-slate-500 truncate flex items-center gap-1">
														<span class="material-symbols-outlined text-[11px]">location_on</span>
														<span>{nearestSession.locationOrLink || 'Ruang Training'}</span>
													</p>
												</div>
											{:else}
												<div class="p-2.5 rounded-xl bg-surface-container-high/30 border border-dashed border-slate-300 dark:border-slate-700/60 text-[10px] text-slate-400 flex items-center justify-between">
													<span class="flex items-center gap-1">
														<span class="material-symbols-outlined text-xs">calendar_today</span>
														<span>Belum ada jadwal sesi aktif</span>
													</span>
													<button
														type="button"
														onclick={() => {
															selectedCourseForSession = course.id;
															isSessionModalOpen = true;
														}}
														class="text-primary font-bold hover:underline cursor-pointer"
													>
														+ Jadwalkan
													</button>
												</div>
											{/if}

											<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
												<span class="flex items-center gap-1">
													<span class="material-symbols-outlined text-xs">schedule</span>
													<span>{course.durationHours} Jam</span>
												</span>
												<span class="flex items-center gap-1">
													<span class="material-symbols-outlined text-xs">view_list</span>
													<span>{course.modulesCount} Modul</span>
												</span>
												<span class="flex items-center gap-1">
													<span class="material-symbols-outlined text-xs">group</span>
													<span>{course.enrolledCount} Peserta</span>
												</span>
											</div>
										</div>
									</div>

									<!-- Action Footer -->
									<div class="p-4 pt-0 flex items-center justify-between gap-2 border-t border-slate-200/40 dark:border-slate-800/40 mt-2">
										{#if isOfflineAttended && !isL1Submitted}
											<button
												type="button"
												onclick={() => openCoursePlayer(course)}
												class="flex-1 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs animate-pulse"
											>
												<span class="material-symbols-outlined text-sm">rate_review</span>
												<span>Isi Evaluasi Lvl 1</span>
											</button>
										{:else if isL1Submitted}
											<button
												type="button"
												onclick={() => openCoursePlayer(course)}
												class="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
											>
												<span class="material-symbols-outlined text-sm">workspace_premium</span>
												<span>E-Sertifikat</span>
											</button>
										{:else}
											<button
												type="button"
												onclick={() => openCoursePlayer(course)}
												class="flex-1 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-surface-container text-on-surface text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
											>
												<span class="material-symbols-outlined text-sm text-primary">play_circle</span>
												<span>Buka Materi</span>
											</button>
										{/if}

										{#if nearestSession}
											<div class="flex-1 flex items-center gap-1.5">
												<button
													type="button"
													onclick={() => openAttendanceModal(nearestSession)}
													class="flex-1 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
												>
													<span class="material-symbols-outlined text-sm">how_to_reg</span>
													<span>Presensi</span>
												</button>
												<button
													type="button"
													onclick={() => openCreateBatchModal(course)}
													class="px-2.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-slate-300 dark:border-slate-700 text-primary text-xs font-bold flex items-center justify-center transition-all cursor-pointer"
													title="Buka Batch Baru untuk Program Ini"
												>
													<span class="material-symbols-outlined text-sm">add</span>
												</button>
											</div>
										{:else}
											<button
												type="button"
												onclick={() => openCreateBatchModal(course)}
												class="flex-1 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-slate-300 dark:border-slate-700 text-primary text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
											>
												<span class="material-symbols-outlined text-sm">add_circle</span>
												<span>+ Buka Batch Baru</span>
											</button>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

			<!-- TAB 2: SESI TRAINING & ABSENSI -->
			{:else if activeTab === 'sessions'}
				<div class="space-y-6">
					<!-- Top Sub-Tab Navigation for Tab 2 -->
					<div class="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200/40 dark:border-slate-800/40 text-xs">
						<button
							type="button"
							onclick={() => (sessionSubTab = 'cards')}
							class="px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer
							{sessionSubTab === 'cards'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">event_available</span>
							<span>1. Sesi & Jadwal Aktif ({sessions.length})</span>
						</button>

						<button
							type="button"
							onclick={() => (sessionSubTab = 'matrix')}
							class="px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer
							{sessionSubTab === 'matrix'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">calendar_month</span>
							<span>2. Matriks Pelatihan Tahunan (Plan vs Actual)</span>
							<span class="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-emerald-500 text-white">48 Minggu</span>
						</button>
					</div>

					{#if sessionSubTab === 'cards'}
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div>
							<h3 class="font-black text-base text-on-surface">Jadwal Sesi Pelatihan (Online & Offline)</h3>
							<p class="text-xs text-on-surface-variant mt-0.5">Pantau pelaksanaan sesi training resmi dan input kehadiran peserta secara realtime</p>
						</div>

						<button
							type="button"
							onclick={() => openCreateBatchModal()}
							class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
						>
							<span class="material-symbols-outlined text-sm">add_circle</span>
							<span>+ Tambah Batch / Sesi Lanjutan</span>
						</button>
					</div>

					<!-- Sesi Training Cards -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						{#each sessions as s}
							<div class="p-5 rounded-2xl bg-surface-container border border-slate-200/70 dark:border-slate-800/70 shadow-xs flex flex-col justify-between space-y-3">
								<div class="space-y-2">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-1.5 flex-wrap">
											<span class="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider
												{s.sessionType === 'ONLINE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}">
												{s.sessionType}
											</span>
											<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider
												{s.based === 'Mandatory' ? 'bg-rose-500 text-white' :
												s.based === 'Additional' ? 'bg-amber-500 text-slate-950 font-bold' :
												s.based === 'Gap Competency' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-200'}">
												{s.based || 'Mandatory'}
											</span>
										</div>
										<span class="font-mono text-xs font-bold text-slate-500">{s.sessionDate}</span>
									</div>

									<h4 class="font-bold text-sm text-on-surface line-clamp-2">{s.title}</h4>
									<div class="space-y-1 text-xs">
										<p class="text-slate-600 dark:text-slate-400 flex items-center justify-between">
											<span class="flex items-center gap-1">
												<span class="material-symbols-outlined text-xs">person</span>
												<span>Trainer: <strong>{s.trainer}</strong></span>
											</span>
											<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-slate-500">
												{s.trainerType || 'Internal'}
											</span>
										</p>
										<p class="text-slate-500 flex items-center justify-between text-[11px]">
											<span class="flex items-center gap-1">
												<span class="material-symbols-outlined text-xs">domain</span>
												<span>Dept: <strong>{s.department || 'Operations'}</strong></span>
											</span>
											<span class="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
												Rp {Number(s.costTrainer || 500000).toLocaleString('id-ID')}
											</span>
										</p>
									</div>
									<p class="text-xs text-slate-500 flex items-start gap-1">
										<span class="material-symbols-outlined text-xs mt-0.5">location_on</span>
										<span class="line-clamp-2">{s.locationOrLink}</span>
									</p>
								</div>

								<div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2">
									<div class="text-[11px] text-slate-500">
										Jam: <strong>{s.startTime} - {s.endTime}</strong>
										<div class="text-[10px] text-slate-400">Peserta: {s.actualAttendeeCount} / {s.quota}</div>
									</div>

									<div class="flex items-center gap-1.5">
										<button
											type="button"
											onclick={() => openAttendanceModal(s)}
											class="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-surface-container-high text-xs font-bold text-on-surface flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
											title="Kelola Absensi Peserta"
										>
											<span class="material-symbols-outlined text-xs">how_to_reg</span>
											<span>Absensi</span>
										</button>

										{#if s.status === 'COMPLETED'}
											<span class="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black flex items-center gap-1">
												<span class="material-symbols-outlined text-xs">verified</span>
												<span>Selesai</span>
											</span>
										{:else}
											<form method="POST" action="?/completeSessionAndGenerateEvaluations" use:enhance class="inline">
												<input type="hidden" name="sessionId" value={s.id} />
												<button
													type="submit"
													class="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
													title="Selesaikan Sesi & Buat Antrean Evaluasi Atasan Langsung"
												>
													<span class="material-symbols-outlined text-xs">task_alt</span>
													<span>Selesaikan Sesi</span>
												</button>
											</form>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Riwayat Kehadiran (Attendance Records Table) -->
					<div class="space-y-3 pt-4">
						<h4 class="font-black text-sm text-on-surface uppercase tracking-wider">Riwayat Kehadiran Peserta Sesi</h4>
						<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
							<table class="w-full text-xs text-left">
								<thead class="bg-surface-container-high font-bold text-on-surface border-b border-slate-200 dark:border-slate-800">
									<tr>
										<th class="p-3">Sesi Pelatihan</th>
										<th class="p-3">Payroll ID</th>
										<th class="p-3">Nama Karyawan</th>
										<th class="p-3">Departemen</th>
										<th class="p-3 text-center">Status Kehadiran</th>
										<th class="p-3">Waktu Presensi</th>
										<th class="p-3">Catatan</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-200 dark:divide-slate-800">
									{#each attendances as a}
										<tr class="hover:bg-surface-container/50">
											<td class="p-3 font-semibold text-on-surface">{a.sessionTitle}</td>
											<td class="p-3 font-mono text-slate-500">{a.payrollId}</td>
											<td class="p-3 font-bold text-on-surface">{a.employeeName}</td>
											<td class="p-3 text-slate-500">{a.department}</td>
											<td class="p-3 text-center">
												<span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase
													{a.status === 'HADIR' ? 'bg-emerald-100 text-emerald-800' :
													a.status === 'IZIN' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}">
													{a.status}
												</span>
											</td>
											<td class="p-3 font-mono text-slate-500">{a.attendedAt}</td>
											<td class="p-3 text-slate-500 italic">{a.notes || '-'}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
					{:else if sessionSubTab === 'matrix'}
						<div class="space-y-5">
							<!-- Header & Actions -->
							<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container/30 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/70">
								<div>
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-primary text-xl">calendar_month</span>
										<h3 class="font-black text-base text-on-surface">Matriks Pelatihan Tahunan (Training Matrix Plan vs Actual)</h3>
									</div>
									<p class="text-xs text-on-surface-variant mt-1">
										Monitoring matriks kalender eksekusi tahunan 48 minggu (Januari - Desember) sesuai master spreadsheet PT BCS
									</p>
								</div>

								<div class="flex flex-wrap items-center gap-2">
									<button
										type="button"
										onclick={() => exportTrainingMatrixToCSV()}
										class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
										title="Download CSV Matriks Training sesuai format master PT BCS"
									>
										<span class="material-symbols-outlined text-sm">download</span>
										<span>Export Matriks Training CSV</span>
									</button>
								</div>
							</div>

							<!-- 4 KPI Cards -->
							<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
								<div class="p-3.5 rounded-2xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20">
									<div class="flex items-center justify-between">
										<span class="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Total Rencana (Plan)</span>
										<span class="material-symbols-outlined text-base text-blue-500">assignment</span>
									</div>
									<div class="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">{totalAnnualPlan}</div>
									<div class="text-[10px] text-blue-600/80 dark:text-blue-400 mt-0.5">Target sesi 48 minggu</div>
								</div>

								<div class="p-3.5 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20">
									<div class="flex items-center justify-between">
										<span class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Total Realisasi (Actual)</span>
										<span class="material-symbols-outlined text-base text-emerald-500">task_alt</span>
									</div>
									<div class="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{totalAnnualActual}</div>
									<div class="text-[10px] text-emerald-600/80 dark:text-emerald-400 mt-0.5">Sesi selesai terlaksana</div>
								</div>

								<div class="p-3.5 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
									<div class="flex items-center justify-between">
										<span class="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Kepatuhan Matriks</span>
										<span class="material-symbols-outlined text-base text-amber-500">verified</span>
									</div>
									<div class="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{matrixCompliancePercent}%</div>
									<div class="text-[10px] text-amber-600/80 dark:text-amber-400 mt-0.5">Rasio Actual terhadap Plan</div>
								</div>

								<div class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface-container/50">
									<div class="flex items-center justify-between">
										<span class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Kurikulum Terpetakan</span>
										<span class="material-symbols-outlined text-base text-on-surface-variant">school</span>
									</div>
									<div class="text-2xl font-black text-on-surface mt-1">{allTrainingMatrixRows.length}</div>
									<div class="text-[10px] text-on-surface-variant mt-0.5">{filteredSafetyMatrixList.length} Safety + {filteredTechnicalMatrixList.length} Tech/Soft</div>
								</div>
							</div>

							<!-- Toolbar Filter & Legend -->
							<div class="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-container-low p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 text-xs">
								<div class="flex flex-wrap items-center gap-2 flex-1">
									<div class="relative min-w-[200px] flex-1 max-w-sm">
										<span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">search</span>
										<input
											type="text"
											bind:value={matrixSearchQuery}
											placeholder="Cari program, trainer, departemen..."
											class="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-surface text-on-surface text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
										/>
									</div>

									<select
										bind:value={matrixFilterBased}
										class="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-surface text-on-surface text-xs font-semibold"
									>
										<option value="All">Semua Based</option>
										<option value="Mandatory">Mandatory</option>
										<option value="Additional">Additional</option>
										<option value="Gap Competency">Gap Competency</option>
									</select>

									<select
										bind:value={matrixFilterCategory}
										class="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-surface text-on-surface text-xs font-semibold"
									>
										<option value="All">Semua Kategori</option>
										<option value="Safety">Safety Only</option>
										<option value="Technical Skill">Technical Skill Only</option>
										<option value="Soft Skill">Soft Skill Only</option>
									</select>
								</div>

								<!-- Legend Info -->
								<div class="flex items-center gap-3 self-end md:self-auto text-[11px] font-bold">
									<div class="flex items-center gap-1.5">
										<span class="w-5 h-5 rounded flex items-center justify-center bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-bold text-[10px]">P</span>
										<span class="text-on-surface-variant">Target Rencana (Plan)</span>
									</div>
									<div class="flex items-center gap-1.5">
										<span class="w-5 h-5 rounded flex items-center justify-center bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-black text-[10px]">A</span>
										<span class="text-on-surface-variant">Realisasi Selesai (Actual)</span>
									</div>
								</div>
							</div>

							<!-- Tabel Matriks Kalender 48 Minggu -->
							<div class="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs bg-surface">
								<div class="overflow-x-auto max-w-full">
									<table class="w-full text-xs border-collapse">
										<thead>
											<!-- Header Row 1: Fixed Columns & 12 Bulan -->
											<tr class="bg-surface-container text-on-surface-variant font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
												<th rowspan="2" class="p-2 border-r border-slate-200 dark:border-slate-800 text-center w-8 min-w-[32px]">No</th>
												<th rowspan="2" class="p-2 border-r border-slate-200 dark:border-slate-800 text-left min-w-[220px] max-w-[280px]">Training Program</th>
												<th rowspan="2" class="p-2 border-r border-slate-200 dark:border-slate-800 text-center min-w-[90px]">Based</th>
												<th rowspan="2" class="p-2 border-r border-slate-200 dark:border-slate-800 text-left min-w-[120px]">Trainer</th>
												<th rowspan="2" class="p-2 border-r border-slate-200 dark:border-slate-800 text-center min-w-[60px]">In/Eks</th>
												<th rowspan="2" class="p-2 border-r border-slate-200 dark:border-slate-800 text-center min-w-[50px]">Hours</th>
												<th rowspan="2" class="p-2 border-r border-slate-200 dark:border-slate-800 text-right min-w-[95px]">Cost</th>
												<th rowspan="2" class="p-2 border-r border-slate-200 dark:border-slate-800 text-left min-w-[110px]">Department</th>
												<th rowspan="2" class="p-2 border-r border-slate-200 dark:border-slate-800 text-center min-w-[60px]">Peserta</th>
												{#each matrixMonths as m}
													<th colspan="4" class="p-1.5 border-r border-slate-200 dark:border-slate-800 text-center uppercase tracking-wider font-black bg-surface-container-high">
														{m.key}
													</th>
												{/each}
												<th rowspan="2" class="p-2 text-center min-w-[55px] bg-surface-container-high font-black">TOTAL</th>
											</tr>
											<!-- Header Row 2: 48 Minggu (i, ii, iii, iv) -->
											<tr class="bg-surface-container-low text-on-surface-variant font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px]">
												{#each matrixMonths as m}
													{#each matrixWeeks as w}
														<th class="p-1 border-r border-slate-200 dark:border-slate-800 text-center w-7 min-w-[28px] max-w-[32px] font-mono">
															{w}
														</th>
													{/each}
												{/each}
											</tr>

											<!-- Rollup Row 1: Planning Training -->
											<tr class="bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold border-b border-blue-200 dark:border-blue-900/60">
												<td colspan="9" class="p-2 border-r border-blue-200 dark:border-blue-900/60 uppercase tracking-wider text-[11px] font-black text-left">
													<div class="flex items-center gap-1.5">
														<span class="w-2 h-2 rounded-full bg-blue-500"></span>
														<span>Planning Training (Target Rencana)</span>
													</div>
												</td>
												{#each all48Slots as slot}
													<td class="p-1 border-r border-blue-200/60 dark:border-blue-900/40 text-center font-mono text-[11px]">
														{#if weeklyPlanTotals[slot] > 0}
															<span class="font-black text-blue-700 dark:text-blue-300">{weeklyPlanTotals[slot]}</span>
														{:else}
															<span class="text-slate-300 dark:text-slate-700">-</span>
														{/if}
													</td>
												{/each}
												<td class="p-2 text-center font-black text-xs text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-900/40">
													{totalAnnualPlan}
												</td>
											</tr>

											<!-- Rollup Row 2: Actualisasi Training -->
											<tr class="bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold border-b-2 border-slate-300 dark:border-slate-700">
												<td colspan="9" class="p-2 border-r border-emerald-200 dark:border-emerald-900/60 uppercase tracking-wider text-[11px] font-black text-left">
													<div class="flex items-center gap-1.5">
														<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
														<span>Actualisasi Training (Realisasi Selesai)</span>
													</div>
												</td>
												{#each all48Slots as slot}
													<td class="p-1 border-r border-emerald-200/60 dark:border-emerald-900/40 text-center font-mono text-[11px]">
														{#if weeklyActualTotals[slot] > 0}
															<span class="font-black text-emerald-700 dark:text-emerald-300">{weeklyActualTotals[slot]}</span>
														{:else}
															<span class="text-slate-300 dark:text-slate-700">-</span>
														{/if}
													</td>
												{/each}
												<td class="p-2 text-center font-black text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-900/40">
													{totalAnnualActual}
												</td>
											</tr>
										</thead>

										<tbody class="divide-y divide-slate-200 dark:divide-slate-800">
											<!-- SEKSI 1: SAFETY TRAINING -->
											<tr class="bg-slate-900 text-white font-black text-xs tracking-wider">
												<td colspan="58" class="p-2.5 px-3">
													<div class="flex items-center gap-2">
														<span class="material-symbols-outlined text-sm text-emerald-400">health_and_safety</span>
														<span>I. SAFETY TRAINING ({filteredSafetyMatrixList.length} Program)</span>
													</div>
												</td>
											</tr>

											{#if filteredSafetyMatrixList.length === 0}
												<tr>
													<td colspan="58" class="p-6 text-center text-slate-400 italic">
														Tidak ada program Safety Training yang sesuai filter pencarian.
													</td>
												</tr>
											{:else}
												{#each filteredSafetyMatrixList as row, idx}
													<!-- Baris 1: Informasi Program + Slot Plan (P) -->
													<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 text-center font-mono text-slate-500 align-middle">
															{idx + 1}
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 align-middle">
															<div class="font-bold text-on-surface leading-snug">{row.title}</div>
															<div class="text-[10px] text-on-surface-variant mt-0.5">{row.category}</div>
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 text-center align-middle">
															<span class="px-2 py-0.5 rounded text-[10px] font-black uppercase {row.based === 'Mandatory' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}">
																{row.based}
															</span>
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 align-middle text-on-surface">
															{row.trainer}
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 text-center align-middle text-slate-500">
															{row.trainerType}
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 text-center align-middle font-mono">
															{row.durationHours}j
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 text-right align-middle font-mono text-[11px]">
															Rp {row.costTrainer.toLocaleString('id-ID')}
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 align-middle text-slate-600 dark:text-slate-400">
															{row.department}
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 text-center align-middle font-bold text-on-surface">
															{row.totalTrainee}
														</td>

														<!-- Slot 48 Minggu untuk Plan (P) -->
														{#each all48Slots as slot}
															<td class="p-0.5 border-r border-slate-200/60 dark:border-slate-800/60 text-center align-middle">
																{#if row.planSlots[slot]}
																	<button
																		type="button"
																		onclick={() => openMatrixSlotDetail(row, slot, 'P')}
																		class="w-5 h-5 mx-auto rounded flex items-center justify-center font-bold text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/60 dark:text-blue-300 transition-transform active:scale-95 cursor-pointer shadow-2xs"
																		title="Klik untuk detail Target Rencana: {row.title}"
																	>
																		P
																	</button>
																{:else}
																	<span class="text-slate-200 dark:text-slate-800 text-[10px]">-</span>
																{/if}
															</td>
														{/each}

														<!-- Total Plan per Program -->
														<td class="p-1 border-b border-slate-200 dark:border-slate-800 text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10">
															{all48Slots.filter((s) => row.planSlots[s]).length}
														</td>
													</tr>

													<!-- Baris 2: Slot Actual (A) -->
													<tr class="bg-surface hover:bg-slate-50/70 dark:hover:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
														{#each all48Slots as slot}
															<td class="p-0.5 border-r border-slate-200/60 dark:border-slate-800/60 text-center align-middle">
																{#if row.actualSlots[slot]}
																	<button
																		type="button"
																		onclick={() => openMatrixSlotDetail(row, slot, 'A')}
																		class="w-5 h-5 mx-auto rounded flex items-center justify-center font-black text-[10px] bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 transition-transform active:scale-95 cursor-pointer shadow-2xs"
																		title="Klik untuk detail Realisasi Selesai: {row.title}"
																	>
																		A
																	</button>
																{:else}
																	<span class="text-slate-200 dark:text-slate-800 text-[10px]">-</span>
																{/if}
															</td>
														{/each}

														<!-- Total Actual per Program -->
														<td class="p-1 text-center font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">
															{all48Slots.filter((s) => row.actualSlots[s]).length}
														</td>
													</tr>
												{/each}
											{/if}

											<!-- SEKSI 2: TECHNICAL & SOFT SKILL TRAINING -->
											<tr class="bg-slate-800 text-white font-black text-xs tracking-wider">
												<td colspan="58" class="p-2.5 px-3">
													<div class="flex items-center gap-2">
														<span class="material-symbols-outlined text-sm text-cyan-400">precision_manufacturing</span>
														<span>II. TECHNICAL & SOFT SKILL TRAINING ({filteredTechnicalMatrixList.length} Program)</span>
													</div>
												</td>
											</tr>

											{#if filteredTechnicalMatrixList.length === 0}
												<tr>
													<td colspan="58" class="p-6 text-center text-slate-400 italic">
														Tidak ada program Technical & Soft Skill Training yang sesuai filter pencarian.
													</td>
												</tr>
											{:else}
												{#each filteredTechnicalMatrixList as row, idx}
													<!-- Baris 1: Informasi Program + Slot Plan (P) -->
													<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 text-center font-mono text-slate-500 align-middle">
															{idx + 1}
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 align-middle">
															<div class="font-bold text-on-surface leading-snug">{row.title}</div>
															<div class="text-[10px] text-on-surface-variant mt-0.5">{row.category}</div>
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 text-center align-middle">
															<span class="px-2 py-0.5 rounded text-[10px] font-black uppercase {row.based === 'Mandatory' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}">
																{row.based}
															</span>
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 align-middle text-on-surface">
															{row.trainer}
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 text-center align-middle text-slate-500">
															{row.trainerType}
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 text-center align-middle font-mono">
															{row.durationHours}j
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 text-right align-middle font-mono text-[11px]">
															Rp {row.costTrainer.toLocaleString('id-ID')}
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 align-middle text-slate-600 dark:text-slate-400">
															{row.department}
														</td>
														<td rowspan="2" class="p-2 border-r border-b border-slate-200 dark:border-slate-800 text-center align-middle font-bold text-on-surface">
															{row.totalTrainee}
														</td>

														<!-- Slot 48 Minggu untuk Plan (P) -->
														{#each all48Slots as slot}
															<td class="p-0.5 border-r border-slate-200/60 dark:border-slate-800/60 text-center align-middle">
																{#if row.planSlots[slot]}
																	<button
																		type="button"
																		onclick={() => openMatrixSlotDetail(row, slot, 'P')}
																		class="w-5 h-5 mx-auto rounded flex items-center justify-center font-bold text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/60 dark:text-blue-300 transition-transform active:scale-95 cursor-pointer shadow-2xs"
																		title="Klik untuk detail Target Rencana: {row.title}"
																	>
																		P
																	</button>
																{:else}
																	<span class="text-slate-200 dark:text-slate-800 text-[10px]">-</span>
																{/if}
															</td>
														{/each}

														<!-- Total Plan per Program -->
														<td class="p-1 border-b border-slate-200 dark:border-slate-800 text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10">
															{all48Slots.filter((s) => row.planSlots[s]).length}
														</td>
													</tr>

													<!-- Baris 2: Slot Actual (A) -->
													<tr class="bg-surface hover:bg-slate-50/70 dark:hover:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
														{#each all48Slots as slot}
															<td class="p-0.5 border-r border-slate-200/60 dark:border-slate-800/60 text-center align-middle">
																{#if row.actualSlots[slot]}
																	<button
																		type="button"
																		onclick={() => openMatrixSlotDetail(row, slot, 'A')}
																		class="w-5 h-5 mx-auto rounded flex items-center justify-center font-black text-[10px] bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 transition-transform active:scale-95 cursor-pointer shadow-2xs"
																		title="Klik untuk detail Realisasi Selesai: {row.title}"
																	>
																		A
																	</button>
																{:else}
																	<span class="text-slate-200 dark:text-slate-800 text-[10px]">-</span>
																{/if}
															</td>
														{/each}

														<!-- Total Actual per Program -->
														<td class="p-1 text-center font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">
															{all48Slots.filter((s) => row.actualSlots[s]).length}
														</td>
													</tr>
												{/each}
											{/if}
										</tbody>
									</table>
								</div>
							</div>

							<!-- Modal Popover Rincian Sesi Matriks -->
							{#if selectedMatrixSlotDetail}
								<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
									<div class="bg-surface border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
										<!-- Header Modal -->
										<div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between {selectedMatrixSlotDetail.type === 'A' ? 'bg-emerald-500/10' : 'bg-blue-500/10'}">
											<div class="flex items-center gap-2">
												<span class="material-symbols-outlined {selectedMatrixSlotDetail.type === 'A' ? 'text-emerald-600' : 'text-blue-600'}">
													{selectedMatrixSlotDetail.type === 'A' ? 'task_alt' : 'calendar_month'}
												</span>
												<div>
													<h3 class="font-bold text-sm text-on-surface">
														{selectedMatrixSlotDetail.type === 'A' ? 'Realisasi Pelaksanaan (Actual / A)' : 'Target Rencana Kurikulum (Plan / P)'}
													</h3>
													<p class="text-xs text-on-surface-variant font-medium">{selectedMatrixSlotDetail.slotLabel}</p>
												</div>
											</div>
											<button
												type="button"
												onclick={() => (selectedMatrixSlotDetail = null)}
												class="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
											>
												<span class="material-symbols-outlined text-sm">close</span>
											</button>
										</div>

										<!-- Body Modal -->
										<div class="p-5 space-y-4 text-xs">
											<div class="bg-surface-container p-3 rounded-xl border border-slate-200 dark:border-slate-800">
												<div class="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Program Pelatihan</div>
												<div class="text-sm font-bold text-on-surface mt-0.5">{selectedMatrixSlotDetail.courseTitle}</div>
											</div>

											{#if selectedMatrixSlotDetail.type === 'A'}
												{#if selectedMatrixSlotDetail.session}
													<div class="space-y-2">
														<div class="font-bold text-on-surface flex items-center gap-1.5">
															<span class="material-symbols-outlined text-sm text-emerald-500">verified</span>
															<span>Informasi Sesi Terlaksana:</span>
														</div>
														<div class="grid grid-cols-2 gap-2">
															<div class="p-2.5 rounded-lg bg-surface-container-low border border-slate-200/50 dark:border-slate-800/50">
																<div class="text-[10px] text-on-surface-variant font-semibold">Waktu Pelaksanaan</div>
																<div class="font-bold text-on-surface mt-0.5">{selectedMatrixSlotDetail.session.sessionDate || '-'}</div>
															</div>
															<div class="p-2.5 rounded-lg bg-surface-container-low border border-slate-200/50 dark:border-slate-800/50">
																<div class="text-[10px] text-on-surface-variant font-semibold">Instruktur / Trainer</div>
																<div class="font-bold text-on-surface mt-0.5">{selectedMatrixSlotDetail.session.trainer || '-'}</div>
															</div>
															<div class="p-2.5 rounded-lg bg-surface-container-low border border-slate-200/50 dark:border-slate-800/50">
																<div class="text-[10px] text-on-surface-variant font-semibold">Lokasi Pelaksanaan</div>
																<div class="font-bold text-on-surface mt-0.5">{selectedMatrixSlotDetail.session.locationOrLink || '-'}</div>
															</div>
															<div class="p-2.5 rounded-lg bg-surface-container-low border border-slate-200/50 dark:border-slate-800/50">
																<div class="text-[10px] text-on-surface-variant font-semibold">Kehadiran Peserta</div>
																<div class="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
																	{selectedMatrixSlotDetail.session.actualAttendeeCount || 0} / {selectedMatrixSlotDetail.session.quota || '-'} Orang
																</div>
															</div>
														</div>
														<div class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-1.5 font-medium">
															<span class="material-symbols-outlined text-xs">check_circle</span>
															<span>Status Sesi: <strong>{selectedMatrixSlotDetail.session.status || 'COMPLETED'}</strong></span>
														</div>
													</div>
												{:else}
													<div class="p-3 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface-variant">
														Pelatihan telah terlaksana dan divalidasi sesuai pencatatan master PT BCS.
													</div>
												{/if}
											{:else}
												<div class="space-y-3">
													<div class="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-blue-900 dark:text-blue-200">
														<p class="font-bold mb-1 flex items-center gap-1">
															<span class="material-symbols-outlined text-xs">calendar_add_on</span>
															Target Kalender Pelatihan (Plan)
														</p>
														<p class="text-[11px] text-blue-800/90 dark:text-blue-300">
															Program ini ditargetkan terlaksana pada {selectedMatrixSlotDetail.slotLabel}. Anda dapat menjadwalkan batch / sesi baru sekarang untuk mengundang peserta.
														</p>
													</div>

													<div class="flex items-center justify-end gap-2 pt-2">
														<button
															type="button"
															onclick={() => {
																const course = courses.find((c) => c.id === selectedMatrixSlotDetail?.courseId);
																selectedMatrixSlotDetail = null;
																openCreateBatchModal(course);
															}}
															class="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 flex items-center gap-1.5 cursor-pointer shadow-sm text-xs"
														>
															<span class="material-symbols-outlined text-xs">add_circle</span>
															<span>+ Jadwalkan Sesi Sekarang</span>
														</button>
													</div>
												</div>
											{/if}
										</div>

										<!-- Footer Modal -->
										<div class="p-3 bg-surface-container-low border-t border-slate-200 dark:border-slate-800 flex justify-end">
											<button
												type="button"
												onclick={() => (selectedMatrixSlotDetail = null)}
												class="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-surface-container text-on-surface font-bold text-xs cursor-pointer"
											>
												Tutup
											</button>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>

			<!-- TAB 3: EVALUASI KIRKPATRICK -->
			{:else if activeTab === 'evaluations'}
				<div class="space-y-6">
					<!-- Sub-tab Selector -->
					<div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
						<button
							type="button"
							onclick={() => (evalSubTab = 'l1')}
							class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap
							{evalSubTab === 'l1'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">sentiment_very_satisfied</span>
							<span>1. Level 1: Reaksi & Kepuasan</span>
						</button>

						<button
							type="button"
							onclick={() => (evalSubTab = 'l4_pre')}
							class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap
							{evalSubTab === 'l4_pre'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">rule</span>
							<span>2. Level 4 Pre-Test (10 Hari)</span>
							{#if l4PreMetricsStats.pending > 0}
								<span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
							{/if}
						</button>

						<button
							type="button"
							onclick={() => (evalSubTab = 'l3')}
							class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap
							{evalSubTab === 'l3'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">psychology</span>
							<span>3. Level 3: Behavior (3 Bulan)</span>
							{#if l3MetricsStats.pending > 0}
								<span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
							{/if}
						</button>

						<button
							type="button"
							onclick={() => (evalSubTab = 'l4_post')}
							class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap
							{evalSubTab === 'l4_post'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">trending_up</span>
							<span>4. Level 4: Post-Test (3 Bulan)</span>
							{#if l4PostMetricsStats.pending > 0}
								<span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
							{/if}
						</button>

						<button
							type="button"
							onclick={() => (evalSubTab = 'recap')}
							class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap
							{evalSubTab === 'recap'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">table_chart</span>
							<span>5. Rekapitulasi Database Evaluasi</span>
							<span class="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
								23 Kolom
							</span>
						</button>
					</div>

					<!-- SUB-TAB 1: LEVEL 1 REACTION -->
					{#if evalSubTab === 'l1'}
						<div class="space-y-5">
							<!-- 4 KPI Summary Cards Level 1 -->
							<div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Kepuasan Global</span>
										<p class="text-xl font-black text-amber-500 font-mono mt-0.5 flex items-center gap-1">
											<span>{metrics.avgSatisfaction || '4.8'}</span>
											<span class="text-xs text-slate-400 font-normal">/ 5.0</span>
										</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">hotel_class</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Kualitas Materi</span>
										<p class="text-xl font-black text-blue-500 font-mono mt-0.5 flex items-center gap-1">
											<span>{metrics.avgMaterial || '4.8'}</span>
											<span class="text-xs text-slate-400 font-normal">/ 5.0</span>
										</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">menu_book</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Kompetensi Trainer</span>
										<p class="text-xl font-black text-purple-500 font-mono mt-0.5 flex items-center gap-1">
											<span>{metrics.avgInstructor || '4.9'}</span>
											<span class="text-xs text-slate-400 font-normal">/ 5.0</span>
										</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">co_present</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Sarana & Layanan</span>
										<p class="text-xl font-black text-teal-500 font-mono mt-0.5 flex items-center gap-1">
											<span>{metrics.avgFacility || '4.7'}</span>
											<span class="text-xs text-slate-400 font-normal">/ 5.0</span>
										</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">apartment</span>
									</div>
								</div>
							</div>

							<!-- Tabel Hasil Evaluasi Level 1 -->
							<div class="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs bg-surface">
								<div class="p-4 bg-surface-container-high border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-amber-500 text-lg">reviews</span>
										<h4 class="font-black text-xs uppercase tracking-wider text-on-surface">Daftar Respons Evaluasi Level 1 (Reaction) Peserta</h4>
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
											{evaluationsL1.length} Respons
										</span>
									</div>
									<button
										type="button"
										onclick={exportL1ToCSV}
										class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-surface-container transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
									>
										<span class="material-symbols-outlined text-sm text-emerald-600">file_download</span>
										<span>Export CSV Level 1</span>
									</button>
								</div>

								<div class="overflow-x-auto">
									<table class="w-full text-xs text-left">
										<thead class="bg-surface-container border-b border-slate-200/60 dark:border-slate-800/60 font-bold text-on-surface">
											<tr>
												<th class="p-3">Tanggal Submit</th>
												<th class="p-3">Peserta</th>
												<th class="p-3">Kursus Pelatihan</th>
												<th class="p-3">Metode</th>
												<th class="p-3 text-center">Materi (5)</th>
												<th class="p-3 text-center">Trainer (4)</th>
												<th class="p-3 text-center">Fasilitas (6)</th>
												<th class="p-3 text-center">Skor Total</th>
												<th class="p-3 text-right">Rincian</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
											{#if evaluationsL1.length === 0}
												<tr>
													<td colspan="9" class="p-8 text-center text-slate-400">
														Belum ada data evaluasi Level 1 yang disubmit.
													</td>
												</tr>
											{:else}
												{#each evaluationsL1 as e}
													<tr class="hover:bg-surface-container/50">
														<td class="p-3 font-mono text-slate-500">{e.submittedAt || '-'}</td>
														<td class="p-3">
															<div class="font-bold text-on-surface">{e.employeeName}</div>
															<div class="text-[10px] font-mono text-on-surface-variant">{e.payrollId}</div>
														</td>
														<td class="p-3 font-semibold text-on-surface max-w-xs">{e.courseTitle}</td>
														<td class="p-3">
															<span class="px-2 py-0.5 rounded-md text-[10px] font-bold
															{e.deliveryMethod === 'Offline' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}">
																{e.deliveryMethod || 'Online'}
															</span>
														</td>
														<td class="p-3 text-center">
															<span class="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-blue-500/10 text-blue-500">
																{e.materialScore || e.contentRating} / 5
															</span>
														</td>
														<td class="p-3 text-center">
															<span class="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-purple-500/10 text-purple-500">
																{e.instructorScore || e.instructorRating} / 5
															</span>
														</td>
														<td class="p-3 text-center">
															<span class="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-teal-500/10 text-teal-500">
																{e.facilityScore || e.facilityRating} / 5
															</span>
														</td>
														<td class="p-3 text-center font-black font-mono text-amber-500">
															★ {e.overallScore || ((e.contentRating + e.instructorRating + e.facilityRating)/3).toFixed(1)}
														</td>
														<td class="p-3 text-right">
															<button
																type="button"
																onclick={() => openL1DetailModal(e)}
																class="px-2.5 py-1 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-surface-container-high transition-all cursor-pointer flex items-center gap-1 ml-auto"
															>
																<span class="material-symbols-outlined text-xs">visibility</span>
																<span>Lihat 18 Butir</span>
															</button>
														</td>
													</tr>
												{/each}
											{/if}
										</tbody>
									</table>
								</div>
							</div>
						</div>

					<!-- ════════════════════════════════════════════════════════════ -->
					<!-- SUB-TAB 2: LEVEL 4 PRE-TEST (10 HARI)                        -->
					<!-- ════════════════════════════════════════════════════════════ -->
					{:else if evalSubTab === 'l4_pre'}
						<div class="space-y-5">
							<!-- 4 KPI Summary Cards Level 4 Pre-Test -->
							<div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Pre-Test</span>
										<p class="text-xl font-black text-on-surface font-mono mt-0.5">{l4PreMetricsStats.total} Karyawan</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">fact_check</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Selesai Dinilai</span>
										<p class="text-xl font-black text-emerald-500 font-mono mt-0.5">{l4PreMetricsStats.reviewed} Karyawan</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">check_circle</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Menunggu Atasan (Pending)</span>
										<p class="text-xl font-black text-rose-500 font-mono mt-0.5">{l4PreMetricsStats.pending} Karyawan</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">pending_actions</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Rata-rata Baseline</span>
										<p class="text-xl font-black text-amber-500 font-mono mt-0.5 flex items-center gap-1">
											<span>★ {l4PreMetricsStats.globalAvg}</span>
											<span class="text-xs text-slate-400 font-normal">/ 5.0</span>
										</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">star</span>
									</div>
								</div>
							</div>

							<!-- Tabel Monitoring Level 4 Pre-Test -->
							<div class="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs bg-surface">
								<div class="p-4 bg-surface-container-high border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-amber-500 text-lg">rule</span>
										<h4 class="font-black text-xs uppercase tracking-wider text-on-surface">Monitoring Evaluasi Level 4 Pre-Test (SLA 10 Hari)</h4>
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
											{filteredL4Pre.length} Karyawan
										</span>
									</div>

									<div class="flex items-center gap-2">
										<input
											type="text"
											bind:value={evalSearchQuery}
											placeholder="Cari karyawan, kursus, atasan..."
											class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs w-44 focus:w-56 transition-all outline-none"
										/>
										<select
											bind:value={evalFilterStatus}
											class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs outline-none"
										>
											<option value="All">Semua Status</option>
											<option value="REVIEWED">Selesai (Reviewed)</option>
											<option value="PENDING">Pending (Menunggu)</option>
										</select>
										<button
											type="button"
											onclick={exportL4PreToCSV}
											class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-surface-container transition-all cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
										>
											<span class="material-symbols-outlined text-sm text-emerald-600">file_download</span>
											<span>Export CSV</span>
										</button>
									</div>
								</div>

								<div class="overflow-x-auto">
									<table class="w-full text-xs text-left">
										<thead class="bg-surface-container border-b border-slate-200/60 dark:border-slate-800/60 font-bold text-on-surface">
											<tr>
												<th class="p-3">Karyawan</th>
												<th class="p-3">Kursus Pelatihan</th>
												<th class="p-3">Atasan Langsung</th>
												<th class="p-3">Kategori Skill</th>
												<th class="p-3">Due Date (H+10)</th>
												<th class="p-3 text-center">Status</th>
												<th class="p-3 text-center">Rata-rata Baseline</th>
												<th class="p-3 text-right">Rincian Audit</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
											{#if filteredL4Pre.length === 0}
												<tr>
													<td colspan="8" class="p-8 text-center text-slate-400">
														Tidak ada data evaluasi Level 4 Pre-Test yang cocok dengan filter.
													</td>
												</tr>
											{:else}
												{#each filteredL4Pre as item}
													{@const baseAvg = calcPreBaselineAvg(item.l4PreMetrics)}
													<tr class="hover:bg-surface-container/50">
														<td class="p-3">
															<div class="font-bold text-on-surface">{item.employeeName}</div>
															<div class="text-[10px] font-mono text-on-surface-variant">{item.payrollId} • {item.positionTitle}</div>
														</td>
														<td class="p-3 font-semibold text-on-surface max-w-xs">{item.courseTitle}</td>
														<td class="p-3 text-on-surface-variant font-medium">{item.supervisorName}</td>
														<td class="p-3">
															<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
																{item.l4PreSkillCategory}
															</span>
														</td>
														<td class="p-3 font-mono {item.l4PreStatus === 'PENDING' ? 'text-rose-600 font-bold' : 'text-slate-500'}">
															{item.l4PreDueDate || '-'}
														</td>
														<td class="p-3 text-center">
															<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase
																{item.l4PreStatus === 'REVIEWED' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600 animate-pulse'}">
																{item.l4PreStatus}
															</span>
														</td>
														<td class="p-3 text-center font-mono font-bold">
															{#if item.l4PreStatus === 'REVIEWED'}
																<span class="text-amber-500 font-black">★ {baseAvg} / 5</span>
															{:else}
																<span class="text-slate-400 font-normal">-</span>
															{/if}
														</td>
														<td class="p-3 text-right">
															<button
																type="button"
																onclick={() => openL4PreDetailModal(item)}
																class="px-2.5 py-1 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-surface-container-high transition-all cursor-pointer flex items-center gap-1 ml-auto"
															>
																<span class="material-symbols-outlined text-xs">visibility</span>
																<span>Lihat Detail</span>
															</button>
														</td>
													</tr>
												{/each}
											{/if}
										</tbody>
									</table>
								</div>
							</div>
						</div>

					<!-- ════════════════════════════════════════════════════════════ -->
					<!-- SUB-TAB 3: LEVEL 3 BEHAVIOR (3 BULAN)                        -->
					<!-- ════════════════════════════════════════════════════════════ -->
					{:else if evalSubTab === 'l3'}
						<div class="space-y-5">
							<!-- 4 KPI Summary Cards Level 3 Behavior -->
							<div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Evaluasi H+90</span>
										<p class="text-xl font-black text-on-surface font-mono mt-0.5">{l3MetricsStats.total} Karyawan</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">groups</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Selesai Dinilai</span>
										<p class="text-xl font-black text-emerald-500 font-mono mt-0.5">{l3MetricsStats.completed} Karyawan</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">verified</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Menunggu Review Atasan</span>
										<p class="text-xl font-black text-rose-500 font-mono mt-0.5">{l3MetricsStats.pending} Karyawan</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">hourglass_top</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Rata-rata Skor Behavior</span>
										<p class="text-xl font-black text-emerald-500 font-mono mt-0.5 flex items-center gap-1">
											<span>★ {l3MetricsStats.globalAvg}</span>
											<span class="text-xs text-slate-400 font-normal">/ 3.00</span>
										</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">psychology</span>
									</div>
								</div>
							</div>

							<!-- Tabel Monitoring Level 3 Behavior -->
							<div class="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs bg-surface">
								<div class="p-4 bg-surface-container-high border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-emerald-500 text-lg">psychology</span>
										<h4 class="font-black text-xs uppercase tracking-wider text-on-surface">Monitoring Evaluasi Level 3 Behavior (15 Butir - H+3 Bulan)</h4>
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
											{filteredL3.length} Karyawan
										</span>
									</div>

									<div class="flex items-center gap-2">
										<input
											type="text"
											bind:value={evalSearchQuery}
											placeholder="Cari karyawan, kursus, atasan..."
											class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs w-44 focus:w-56 transition-all outline-none"
										/>
										<select
											bind:value={evalFilterStatus}
											class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs outline-none"
										>
											<option value="All">Semua Status</option>
											<option value="COMPLETED">Selesai (Completed)</option>
											<option value="PENDING">Pending (Menunggu)</option>
										</select>
										<button
											type="button"
											onclick={exportL3ToCSV}
											class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-surface-container transition-all cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
										>
											<span class="material-symbols-outlined text-sm text-emerald-600">file_download</span>
											<span>Export CSV</span>
										</button>
									</div>
								</div>

								<div class="overflow-x-auto">
									<table class="w-full text-xs text-left">
										<thead class="bg-surface-container border-b border-slate-200/60 dark:border-slate-800/60 font-bold text-on-surface">
											<tr>
												<th class="p-3">Karyawan</th>
												<th class="p-3">Kursus Pelatihan</th>
												<th class="p-3">Atasan Langsung</th>
												<th class="p-3">Tanggal Training</th>
												<th class="p-3">Due Date (H+90)</th>
												<th class="p-3 text-center">Status</th>
												<th class="p-3 text-center">Skor Behavior</th>
												<th class="p-3 text-right">Rincian Audit</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
											{#if filteredL3.length === 0}
												<tr>
													<td colspan="8" class="p-8 text-center text-slate-400">
														Tidak ada data evaluasi Level 3 Behavior yang cocok dengan filter.
													</td>
												</tr>
											{:else}
												{#each filteredL3 as item}
													<tr class="hover:bg-surface-container/50">
														<td class="p-3">
															<div class="font-bold text-on-surface">{item.employeeName}</div>
															<div class="text-[10px] font-mono text-on-surface-variant">{item.payrollId} • {item.positionTitle}</div>
														</td>
														<td class="p-3 font-semibold text-on-surface max-w-xs">{item.courseTitle}</td>
														<td class="p-3 text-on-surface-variant font-medium">{item.supervisorName}</td>
														<td class="p-3 font-mono text-slate-500">{item.trainingCompletedAt || '-'}</td>
														<td class="p-3 font-mono {item.l3Status === 'PENDING' ? 'text-rose-600 font-bold' : 'text-slate-500'}">
															{item.dueDate || '-'}
														</td>
														<td class="p-3 text-center">
															<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase
																{item.l3Status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600 animate-pulse'}">
																{item.l3Status}
															</span>
														</td>
														<td class="p-3 text-center font-mono font-bold">
															{#if item.l3Status === 'COMPLETED' && item.l3AvgScore}
																<span class="text-emerald-500 font-black">★ {Number(item.l3AvgScore).toFixed(2)} / 3.00</span>
															{:else}
																<span class="text-slate-400 font-normal">-</span>
															{/if}
														</td>
														<td class="p-3 text-right">
															<button
																type="button"
																onclick={() => openL3DetailModal(item)}
																class="px-2.5 py-1 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-surface-container-high transition-all cursor-pointer flex items-center gap-1 ml-auto"
															>
																<span class="material-symbols-outlined text-xs">visibility</span>
																<span>Lihat 15 Butir</span>
															</button>
														</td>
													</tr>
												{/each}
											{/if}
										</tbody>
									</table>
								</div>
							</div>
						</div>

					<!-- ════════════════════════════════════════════════════════════ -->
					<!-- SUB-TAB 4: LEVEL 4 POST-TEST (3 BULAN)                       -->
					<!-- ════════════════════════════════════════════════════════════ -->
					{:else if evalSubTab === 'l4_post'}
						<div class="space-y-5">
							<!-- 4 KPI Summary Cards Level 4 Post-Test -->
							<div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Post-Test Selesai</span>
										<p class="text-xl font-black text-emerald-500 font-mono mt-0.5">{l4PostMetricsStats.completed} Karyawan</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">done_all</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Menunggu Evaluasi (Pending)</span>
										<p class="text-xl font-black text-rose-500 font-mono mt-0.5">{l4PostMetricsStats.pending} Karyawan</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">timer</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Skor Akhir Post-Test</span>
										<p class="text-xl font-black text-purple-500 font-mono mt-0.5 flex items-center gap-1">
											<span>★ {l4PostMetricsStats.globalPostAvg}</span>
											<span class="text-xs text-slate-400 font-normal">/ 5.0</span>
										</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">grade</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Rata-rata Peningkatan (Delta)</span>
										<p class="text-xl font-black text-emerald-500 font-mono mt-0.5">{l4PostMetricsStats.globalDelta}%</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">trending_up</span>
									</div>
								</div>
							</div>

							<!-- Tabel Monitoring Level 4 Post-Test -->
							<div class="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs bg-surface">
								<div class="p-4 bg-surface-container-high border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-purple-500 text-lg">trending_up</span>
										<h4 class="font-black text-xs uppercase tracking-wider text-on-surface">Monitoring Dampak Bisnis Level 4 Post-Test (H+3 Bulan)</h4>
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400">
											{filteredL4Post.length} Karyawan
										</span>
									</div>

									<div class="flex items-center gap-2">
										<input
											type="text"
											bind:value={evalSearchQuery}
											placeholder="Cari karyawan, kursus, atasan..."
											class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs w-44 focus:w-56 transition-all outline-none"
										/>
										<select
											bind:value={evalFilterStatus}
											class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs outline-none"
										>
											<option value="All">Semua Status</option>
											<option value="COMPLETED">Selesai (Completed)</option>
											<option value="PENDING">Pending (Menunggu)</option>
										</select>
										<button
											type="button"
											onclick={exportL4PostToCSV}
											class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-surface-container transition-all cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
										>
											<span class="material-symbols-outlined text-sm text-emerald-600">file_download</span>
											<span>Export CSV</span>
										</button>
									</div>
								</div>

								<div class="overflow-x-auto">
									<table class="w-full text-xs text-left">
										<thead class="bg-surface-container border-b border-slate-200/60 dark:border-slate-800/60 font-bold text-on-surface">
											<tr>
												<th class="p-3">Karyawan</th>
												<th class="p-3">Kursus Pelatihan</th>
												<th class="p-3">Atasan Langsung</th>
												<th class="p-3">Kategori Skill</th>
												<th class="p-3 text-center">Status</th>
												<th class="p-3 text-center">Baseline Pre-Test</th>
												<th class="p-3 text-center">Aktual Post-Test</th>
												<th class="p-3 text-center">Delta (%)</th>
												<th class="p-3 text-right">Rincian Audit</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
											{#if filteredL4Post.length === 0}
												<tr>
													<td colspan="9" class="p-8 text-center text-slate-400">
														Tidak ada data evaluasi Level 4 Post-Test yang cocok dengan filter.
													</td>
												</tr>
											{:else}
												{#each filteredL4Post as item}
													{@const preAvg = calcPreBaselineAvg(item.l4PreMetrics)}
													{@const postAvg = calcPostAvg(item.l4PostMetrics)}
													{@const delta = calcDeltaPercent(preAvg, postAvg)}
													<tr class="hover:bg-surface-container/50">
														<td class="p-3">
															<div class="font-bold text-on-surface">{item.employeeName}</div>
															<div class="text-[10px] font-mono text-on-surface-variant">{item.payrollId} • {item.positionTitle}</div>
														</td>
														<td class="p-3 font-semibold text-on-surface max-w-xs">{item.courseTitle}</td>
														<td class="p-3 text-on-surface-variant font-medium">{item.supervisorName}</td>
														<td class="p-3">
															<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
																{item.l4PreSkillCategory}
															</span>
														</td>
														<td class="p-3 text-center">
															<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase
																{item.l4Status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600 animate-pulse'}">
																{item.l4Status}
															</span>
														</td>
														<td class="p-3 text-center font-mono font-bold text-amber-500">
															{preAvg > 0 ? `★ ${preAvg}` : '-'}
														</td>
														<td class="p-3 text-center font-mono font-bold text-purple-500">
															{postAvg > 0 ? `★ ${postAvg}` : '-'}
														</td>
														<td class="p-3 text-center">
															{#if item.l4Status === 'COMPLETED' && preAvg > 0 && postAvg > 0}
																<span class="px-2 py-0.5 rounded-lg text-xs font-mono font-black
																	{delta >= 0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600'}">
																	{delta >= 0 ? `+${delta}%` : `${delta}%`}
																</span>
															{:else}
																<span class="text-slate-400 font-normal">-</span>
															{/if}
														</td>
														<td class="p-3 text-right">
															<button
																type="button"
																onclick={() => openL4PostDetailModal(item)}
																class="px-2.5 py-1 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-surface-container-high transition-all cursor-pointer flex items-center gap-1 ml-auto"
															>
																<span class="material-symbols-outlined text-xs">compare_arrows</span>
																<span>Lihat Komparasi</span>
															</button>
														</td>
													</tr>
												{/each}
											{/if}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					{:else if evalSubTab === 'recap'}
						<!-- SUB-TAB 5: REKAPITULASI DATABASE EVALUASI (23 KOLOM ALL-IN-ONE) -->
						<div class="space-y-6">
							<!-- Header & Download Action -->
							<div class="p-6 rounded-3xl bg-surface border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
								<div>
									<div class="flex items-center gap-2">
										<span class="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
											23 Kolom Lengkap
										</span>
										<span class="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
											Spreadsheet GID 744159616
										</span>
									</div>
									<h3 class="text-lg font-black text-on-surface mt-2 tracking-tight">Rekapitulasi Database Evaluasi Kirkpatrick</h3>
									<p class="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-2xl">
										Monitoring all-in-one 4 level evaluasi pelatihan (L1 Reaksi, L4 Pre-Impact, L2 Belajar Pre/Post, L3 Perilaku Atasan, & L4 Post-Impact) secara terintegrasi dan siap diekspor ke format CSV master spreadsheet.
									</p>
								</div>
								<div class="flex items-center gap-2 flex-wrap">
									<button
										type="button"
										onclick={exportDatabaseRecapToCSV}
										class="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
									>
										<span class="material-symbols-outlined text-base">download</span>
										<span>Export Database Recap CSV</span>
										<span class="px-1.5 py-0.5 rounded-full bg-emerald-800/60 text-[10px] font-mono">
											{filteredRecapRows.length} Data
										</span>
									</button>
								</div>
							</div>

							<!-- 4 KPI Summary Cards -->
							<div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Peserta Terdata</span>
										<p class="text-2xl font-black text-on-surface font-mono mt-0.5 flex items-center gap-1">
											<span>{recapTotalParticipants}</span>
											<span class="text-xs text-slate-400 font-normal">Karyawan</span>
										</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">groups</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Avg Skor Level 1</span>
										<p class="text-2xl font-black text-amber-500 font-mono mt-0.5 flex items-center gap-1">
											<span>{recapAvgL1Score}</span>
											<span class="text-xs text-slate-400 font-normal">/ 100</span>
										</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">hotel_class</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">L2 Pass Rate (Post)</span>
										<p class="text-2xl font-black text-blue-500 font-mono mt-0.5 flex items-center gap-1">
											<span>{recapL2PassRate}%</span>
											<span class="text-xs text-slate-400 font-normal">Lulus</span>
										</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">school</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">L3 Competent Rate</span>
										<p class="text-2xl font-black text-purple-500 font-mono mt-0.5 flex items-center gap-1">
											<span>{recapL3CompetentRate}%</span>
											<span class="text-xs text-slate-400 font-normal">Kompeten</span>
										</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">verified</span>
									</div>
								</div>
							</div>

							<!-- Toolbar Filter & Search -->
							<div class="p-4 rounded-3xl bg-surface border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
								<div class="relative flex-1">
									<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
									<input
										type="text"
										bind:value={recapSearchQuery}
										placeholder="Cari nama karyawan, jabatan, departemen, trainer, atau training..."
										class="w-full pl-9 pr-3 py-2 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
									/>
								</div>
								<div class="flex items-center gap-2 flex-wrap">
									<select
										bind:value={recapFilterTraining}
										aria-label="Filter Program Pelatihan"
										class="px-3 py-2 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs text-on-surface focus:outline-none"
									>
										<option value="All">Semua Program Pelatihan</option>
										{#each distinctRecapTrainings as trg}
											<option value={trg}>{trg}</option>
										{/each}
									</select>

									<select
										bind:value={recapFilterDept}
										aria-label="Filter Departemen"
										class="px-3 py-2 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs text-on-surface focus:outline-none"
									>
										<option value="All">Semua Departemen</option>
										{#each distinctRecapDepts as dpt}
											<option value={dpt}>{dpt}</option>
										{/each}
									</select>

									<select
										bind:value={recapFilterResult}
										aria-label="Filter Hasil Kelulusan L2"
										class="px-3 py-2 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs text-on-surface focus:outline-none"
									>
										<option value="All">Semua Hasil L2</option>
										<option value="LULUS">LULUS</option>
										<option value="REMEDIAL">REMEDIAL</option>
									</select>

									{#if recapSearchQuery || recapFilterTraining !== 'All' || recapFilterDept !== 'All' || recapFilterResult !== 'All'}
										<button
											type="button"
											onclick={() => {
												recapSearchQuery = '';
												recapFilterTraining = 'All';
												recapFilterDept = 'All';
												recapFilterResult = 'All';
											}}
											class="p-2 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-surface-container cursor-pointer transition-all"
											title="Reset Filter"
										>
											<span class="material-symbols-outlined text-sm">restart_alt</span>
										</button>
									{/if}
								</div>
							</div>

							<!-- Tabel Komprehensif 23 Kolom dengan Multi-Tier Header -->
							<div class="rounded-3xl bg-surface border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
								<div class="overflow-x-auto max-h-[640px] relative">
									<table class="w-full text-left text-xs border-collapse">
										<thead class="sticky top-0 z-20 shadow-xs font-bold text-[11px] uppercase tracking-wider text-center">
											<!-- TIER 1: Kategori Utama -->
											<tr class="border-b border-slate-200 dark:border-slate-700">
												<th rowspan="3" class="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-30">NO</th>
												<th rowspan="3" class="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 text-left min-w-[150px] sticky left-10 z-30">NAME</th>
												<th rowspan="3" class="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 text-left min-w-[120px]">TITLE</th>
												<th rowspan="3" class="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 text-left min-w-[110px]">DEPARTMENT</th>
												<th rowspan="3" class="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 min-w-[110px]">TRAINING DATE</th>
												<th rowspan="3" class="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 min-w-[110px]">TRAINER</th>
												<th rowspan="3" class="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-r border-slate-300 dark:border-slate-600 min-w-[130px]">TRAINING</th>
												
												<!-- Level 1 Cluster (Kuning/Amber) -->
												<th colspan="2" class="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-r border-amber-300 dark:border-amber-800">
													Level 1 (Reaction)
												</th>

												<!-- Level 4 Pre Cluster (Orange) -->
												<th colspan="1" class="p-2 bg-orange-100 dark:bg-orange-950/60 text-orange-900 dark:text-orange-200 border-r border-orange-300 dark:border-orange-800">
													Level 4 (Pre)
												</th>

												<!-- Level 2 Cluster (Biru) -->
												<th colspan="7" class="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border-r border-blue-300 dark:border-blue-800">
													Level 2 (Learning Evaluation)
												</th>

												<!-- Level 3 Cluster (Ungu) -->
												<th colspan="4" class="p-2 bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-r border-purple-300 dark:border-purple-800">
													Level 3 (Behavior Evaluation)
												</th>

												<!-- Level 4 Post Cluster (Hijau/Emerald) -->
												<th colspan="2" class="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200">
													Level 4 (Business Impact)
												</th>
											</tr>

											<!-- TIER 2: Sub-Kategori / Nama Indikator -->
											<tr class="border-b border-slate-200 dark:border-slate-700 text-[10px]">
												<!-- L1 -->
												<th rowspan="2" class="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 border-r border-amber-200 dark:border-amber-800/60 min-w-[85px]">
													INVITATION REACTION
												</th>
												<th rowspan="2" class="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 border-r border-amber-300 dark:border-amber-800 min-w-[90px]">
													REACTION EVALUATION
												</th>

												<!-- L4 Pre -->
												<th rowspan="2" class="p-2 bg-orange-50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-300 border-r border-orange-300 dark:border-orange-800 min-w-[95px]">
													INVITATION BUSINESS IMPACT (PRE)
												</th>

												<!-- L2 Learning Evaluation Group -->
												<th colspan="7" class="p-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300 border-r border-blue-300 dark:border-blue-800">
													LEARNING EVALUATION METRICS
												</th>

												<!-- L3 -->
												<th rowspan="2" class="p-2 bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-300 border-r border-purple-200 dark:border-purple-800/60 min-w-[100px]">
													INVITATION BEHAVIOR & IMPACT (POST)
												</th>
												<th rowspan="2" class="p-2 bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-300 border-r border-purple-200 dark:border-purple-800/60 min-w-[85px]">
													BEHAVIOR EVALUATION
												</th>
												<th rowspan="2" class="p-2 bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-300 border-r border-purple-200 dark:border-purple-800/60 min-w-[95px]">
													RESULT
												</th>
												<th rowspan="2" class="p-2 bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-300 border-r border-purple-300 dark:border-purple-800 min-w-[130px]">
													BEHAVIOR EVALUATION ACTION PLAN
												</th>

												<!-- L4 Post -->
												<th rowspan="2" class="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 border-r border-emerald-200 dark:border-emerald-800/60 min-w-[90px]">
													BUSINESS IMPACT
												</th>
												<th rowspan="2" class="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 min-w-[110px]">
													RESULT
												</th>
											</tr>

											<!-- TIER 3: Detail Level 2 Sub-Kolom -->
											<tr class="border-b border-slate-200 dark:border-slate-700 text-[9px]">
												<th class="p-1.5 bg-blue-100/60 dark:bg-blue-900/40 text-blue-950 dark:text-blue-200 border-r border-blue-200 dark:border-blue-800 min-w-[70px]">PRE TEST</th>
												<th class="p-1.5 bg-blue-100/60 dark:bg-blue-900/40 text-blue-950 dark:text-blue-200 border-r border-blue-200 dark:border-blue-800 min-w-[75px]">REMARK</th>
												<th class="p-1.5 bg-blue-100/60 dark:bg-blue-900/40 text-blue-950 dark:text-blue-200 border-r border-blue-200 dark:border-blue-800 min-w-[70px]">POST TEST</th>
												<th class="p-1.5 bg-blue-100/60 dark:bg-blue-900/40 text-blue-950 dark:text-blue-200 border-r border-blue-200 dark:border-blue-800 min-w-[75px]">REMARK</th>
												<th class="p-1.5 bg-blue-100/60 dark:bg-blue-900/40 text-blue-950 dark:text-blue-200 border-r border-blue-200 dark:border-blue-800 min-w-[80px]">RESULT</th>
												<th class="p-1.5 bg-blue-100/60 dark:bg-blue-900/40 text-blue-950 dark:text-blue-200 border-r border-blue-200 dark:border-blue-800 min-w-[130px]">LEARNING EVALUATION ACTION PLAN</th>
												<th class="p-1.5 bg-blue-100/60 dark:bg-blue-900/40 text-blue-950 dark:text-blue-200 border-r border-blue-300 dark:border-blue-800 min-w-[90px]">SERTIFIKAT HRIS</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-200/80 dark:divide-slate-800/80 font-normal">
											{#if filteredRecapRows.length === 0}
												<tr>
													<td colspan="23" class="p-12 text-center text-slate-400">
														<span class="material-symbols-outlined text-4xl block mb-2 opacity-50">search_off</span>
														<p class="font-bold">Tidak ada data rekapitulasi evaluasi yang sesuai filter</p>
														<p class="text-xs text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau pilihan filter di atas.</p>
													</td>
												</tr>
											{:else}
												{#each filteredRecapRows as row (row.no)}
													<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
														<!-- IDENTITAS -->
														<td class="p-2.5 text-center font-mono font-bold text-slate-500 border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-surface z-10">{row.no}</td>
														<td class="p-2.5 font-bold text-on-surface border-r border-slate-200 dark:border-slate-800 sticky left-10 bg-surface z-10 whitespace-nowrap">{row.name}</td>
														<td class="p-2.5 text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">{row.title}</td>
														<td class="p-2.5 text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">{row.department}</td>
														<td class="p-2.5 text-center text-slate-500 font-mono border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">{row.trainingDate}</td>
														<td class="p-2.5 text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">{row.trainer}</td>
														<td class="p-2.5 border-r border-slate-300 dark:border-slate-600 whitespace-nowrap">
															<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
																{row.training}
															</span>
														</td>

														<!-- LEVEL 1 -->
														<td class="p-2 text-center border-r border-amber-200 dark:border-amber-800/60 bg-amber-50/20 dark:bg-amber-950/10">
															{#if row.l1Invite}
																<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
																	<span class="material-symbols-outlined text-xs">check_circle</span>
																	<span>TRUE</span>
																</span>
															{:else}
																<span class="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
																	<span class="material-symbols-outlined text-xs">cancel</span>
																	<span>FALSE</span>
																</span>
															{/if}
														</td>
														<td class="p-2 text-center font-mono font-bold text-amber-600 dark:text-amber-400 border-r border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10">
															{row.l1Score.toFixed(2)}
														</td>

														<!-- LEVEL 4 PRE -->
														<td class="p-2 text-center border-r border-orange-300 dark:border-orange-800 bg-orange-50/20 dark:bg-orange-950/10">
															{#if row.l4PreInvite}
																<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
																	<span class="material-symbols-outlined text-xs">check_circle</span>
																	<span>TRUE</span>
																</span>
															{:else}
																<span class="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
																	<span class="material-symbols-outlined text-xs">cancel</span>
																	<span>FALSE</span>
																</span>
															{/if}
														</td>

														<!-- LEVEL 2 -->
														<td class="p-2 text-center font-mono font-semibold text-slate-600 dark:text-slate-300 border-r border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/10">
															{row.l2PreScore.toFixed(1)}
														</td>
														<td class="p-2 text-center border-r border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/10">
															<span class="px-1.5 py-0.5 rounded text-[10px] font-bold {row.l2PreRemark === 'LULUS' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600'}">
																{row.l2PreRemark}
															</span>
														</td>
														<td class="p-2 text-center font-mono font-bold text-blue-600 dark:text-blue-400 border-r border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/10">
															{row.l2PostScore.toFixed(1)}
														</td>
														<td class="p-2 text-center border-r border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/10">
															<span class="px-1.5 py-0.5 rounded text-[10px] font-bold {row.l2PostRemark === 'LULUS' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600'}">
																{row.l2PostRemark}
															</span>
														</td>
														<td class="p-2 text-center border-r border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/10">
															<span class="px-2 py-0.5 rounded-full text-[10px] font-black {row.l2Result === 'LULUS' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'}">
																{row.l2Result}
															</span>
														</td>
														<td class="p-2 text-slate-500 text-[10px] border-r border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/10 max-w-[150px] truncate" title={row.l2ActionPlan}>
															{row.l2ActionPlan}
														</td>
														<td class="p-2 text-center border-r border-blue-300 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/10">
															{#if row.certHris}
																<span class="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
																	<span class="material-symbols-outlined text-xs">workspace_premium</span>
																	<span>TERBIT</span>
																</span>
															{:else}
																<span class="text-slate-400 text-[10px]">-</span>
															{/if}
														</td>

														<!-- LEVEL 3 -->
														<td class="p-2 text-center border-r border-purple-200 dark:border-purple-800/60 bg-purple-50/20 dark:bg-purple-950/10">
															{#if row.l3Invite}
																<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
																	<span class="material-symbols-outlined text-xs">check_circle</span>
																	<span>TRUE</span>
																</span>
															{:else}
																<span class="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
																	<span class="material-symbols-outlined text-xs">cancel</span>
																	<span>FALSE</span>
																</span>
															{/if}
														</td>
														<td class="p-2 text-center font-mono font-bold text-purple-600 dark:text-purple-400 border-r border-purple-200 dark:border-purple-800/60 bg-purple-50/20 dark:bg-purple-950/10">
															{row.l3Score.toFixed(2)}
														</td>
														<td class="p-2 text-center border-r border-purple-200 dark:border-purple-800/60 bg-purple-50/20 dark:bg-purple-950/10">
															<span class="px-2 py-0.5 rounded-full text-[10px] font-black {row.l3Result === 'KOMPETEN' ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'}">
																{row.l3Result}
															</span>
														</td>
														<td class="p-2 text-slate-500 text-[10px] border-r border-purple-300 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-950/10 max-w-[150px] truncate" title={row.l3ActionPlan}>
															{row.l3ActionPlan}
														</td>

														<!-- LEVEL 4 POST -->
														<td class="p-2 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10">
															{row.l4PostScore.toFixed(2)}
														</td>
														<td class="p-2 text-center bg-emerald-50/20 dark:bg-emerald-950/10">
															<span class="px-2 py-0.5 rounded-full text-[10px] font-black {row.l4PostResult === 'BERDAMPAK POSITIF' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'}">
																{row.l4PostResult}
															</span>
														</td>
													</tr>
												{/each}
											{/if}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					{/if}
				</div>

			<!-- TAB 4: KAMUS & ASESMEN KOMPETENSI (TNA) -->
			{:else if activeTab === 'safety_tna'}
				<div class="space-y-6">
					<!-- Sub-navigasi TNA (Segmented Sub-Tab Bar) -->
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-surface-container-high/60 border border-slate-200/60 dark:border-slate-800/60">
						<div class="flex items-center gap-1.5 overflow-x-auto">
							<a
								href="/hris/assessments"
								class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30"
							>
								<span class="material-symbols-outlined text-sm">assignment_ind</span>
								<span>Direct Supervisor Assessment</span>
								<span class="material-symbols-outlined text-xs">arrow_forward</span>
							</a>

							<button
								type="button"
								onclick={() => (tnaSubTab = 'assessments')}
								class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2
								{tnaSubTab === 'assessments'
									? 'bg-primary text-on-primary shadow-xs'
									: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
							>
								<span class="material-symbols-outlined text-sm">fact_check</span>
								<span>TNA Assessment Results ({groupedEmployeeAssessments.length} Karyawan)</span>
								{#if employeeAssessments.filter((a) => a.gap < 0).length > 0}
									<span class="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
										{employeeAssessments.filter((a) => a.gap < 0).length} GAP
									</span>
								{/if}
							</button>

							<button
								type="button"
								onclick={() => (tnaSubTab = 'standards')}
								class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2
								{tnaSubTab === 'standards'
									? 'bg-primary text-on-primary shadow-xs'
									: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
							>
								<span class="material-symbols-outlined text-sm">stairs</span>
								<span>Standar Jabatan ({groupedJobStandards.length} Posisi)</span>
							</button>

							<button
								type="button"
								onclick={() => (tnaSubTab = 'library')}
								class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2
								{tnaSubTab === 'library'
									? 'bg-primary text-on-primary shadow-xs'
									: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
							>
								<span class="material-symbols-outlined text-sm">menu_book</span>
								<span>Kamus Kompetensi ({competencyLibrary.length})</span>
							</button>

							<button
								type="button"
								onclick={() => (tnaSubTab = 'safety')}
								class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2
								{tnaSubTab === 'safety'
									? 'bg-primary text-on-primary shadow-xs'
									: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
							>
								<span class="material-symbols-outlined text-sm">health_and_safety</span>
								<span>Safety Test K3 Mandiri</span>
							</button>

							<button
								type="button"
								onclick={() => (tnaSubTab = 'requests')}
								class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2
								{tnaSubTab === 'requests'
									? 'bg-primary text-on-primary shadow-xs'
									: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
							>
								<span class="material-symbols-outlined text-sm">post_add</span>
								<span>Usulan Pelatihan Atasan</span>
								{#if pendingTrainingRequestsCount > 0}
									<span class="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
										{pendingTrainingRequestsCount} PENDING
									</span>
								{/if}
							</button>
						</div>

						<div class="text-[11px] text-slate-500 font-medium px-2">
							Modul Penilaian Kompetensi Terintegrasi Portal BCS Academy
						</div>
					</div>

					<!-- ═══════════════════════════════════════════════════════════ -->
					<!-- SUB-VIEW 1: ASESMEN TNA & PENUGASAN PERSONAL (HASIL/STATUS) -->
					<!-- ═══════════════════════════════════════════════════════════ -->
					{#if tnaSubTab === "assessments"}
						<div class="space-y-6">
							<!-- Banner Ringkasan GAP & Pelatihan Personal -->
							<div class="p-5 rounded-2xl bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-purple-900/20 border border-blue-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
								<div class="space-y-1">
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-blue-500 text-xl">psychology_alt</span>
										<h4 class="font-black text-sm text-on-surface">Alur Pelatihan Berbasis GAP Kompetensi (TNA Closed-Loop)</h4>
										<span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
											Auto-Assign
										</span>
									</div>
									<p class="text-xs text-on-surface-variant max-w-3xl leading-relaxed">
										Karyawan yang dinilai berada di bawah standar jabatan (<strong class="text-rose-600">GAP &lt; 0</strong>) secara otomatis direkomendasikan kursus terkait. Klik tombol <span class="font-bold text-indigo-600 dark:text-indigo-400">"Tugaskan ke Portal"</span> untuk langsung mengirimkan penugasan wajib ke akun BCS Academy milik karyawan.
									</p>
								</div>

								<button
									type="button"
									onclick={() => (isAssessmentModalOpen = true)}
									class="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-black flex items-center gap-2 shadow-sm hover:opacity-90 transition-all cursor-pointer self-start md:self-auto shrink-0"
								>
									<span class="material-symbols-outlined text-sm">add_task</span>
									<span>+ Input Employee Assessment</span>
								</button>
							</div>

							<!-- Metric Cards TNA -->
							<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
								<div class="p-3.5 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60">
									<p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Karyawan Teruji</p>
									<p class="text-xl font-black text-on-surface mt-1 font-mono">{groupedEmployeeAssessments.length} <span class="text-xs font-normal text-slate-400">Karyawan</span></p>
									<p class="text-[10px] text-slate-400">{employeeAssessments.length} Matriks Asesmen</p>
								</div>

								<div class="p-3.5 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60">
									<p class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Qualified (Standar Terpenuhi)</p>
									<p class="text-xl font-black text-emerald-600 mt-1 font-mono">
										{groupedEmployeeAssessments.filter((e) => e.gapCount === 0).length} <span class="text-xs font-normal text-emerald-600/70">Karyawan</span>
									</p>
									<p class="text-[10px] text-emerald-500">{employeeAssessments.filter((a) => a.gap >= 0).length} Matriks Terpenuhi</p>
								</div>

								<div class="p-3.5 rounded-2xl bg-surface-container border border-rose-500/30">
									<p class="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Gap Competency (Perlu Pelatihan)</p>
									<p class="text-xl font-black text-rose-600 mt-1 font-mono">
										{groupedEmployeeAssessments.filter((e) => e.gapCount > 0).length} <span class="text-xs font-normal text-rose-500">Karyawan</span>
									</p>
									<p class="text-[10px] text-rose-500">{employeeAssessments.filter((a) => a.gap < 0).length} Kompetensi GAP</p>
								</div>

								<div class="p-3.5 rounded-2xl bg-surface-container border border-indigo-500/30">
									<p class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Ditugaskan ke Portal</p>
									<p class="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
										{employeeAssessments.filter((a) => a.trainingStatus === 'ASSIGNED' || a.trainingStatus === 'COMPLETED').length} <span class="text-xs font-normal text-indigo-500">Modul</span>
									</p>
									<p class="text-[10px] text-indigo-500">Sinkron BCS Academy</p>
								</div>
							</div>

							<!-- Filter & Search Toolbar -->
							<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div class="flex items-center gap-2 flex-1 max-w-md">
									<div class="relative w-full">
										<span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
										<input
											type="text"
											bind:value={tnaSearchQuery}
											placeholder="Cari nama karyawan, NIP, posisi, atau kompetensi..."
											class="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs focus:ring-1 focus:ring-primary outline-hidden"
										/>
									</div>
								</div>

								<div class="flex items-center gap-2">
									<select
										bind:value={tnaFilterDept}
										class="px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface"
									>
										<option value="All">Semua Departemen</option>
										<option value="Operations">Operations</option>
										<option value="Workshop & Maintenance">Workshop & Maintenance</option>
										<option value="Labour Project 1 & Warehouse">Labour Project 1 & Warehouse</option>
										<option value="Finance & Operations">Finance & Operations</option>
										<option value="QHSE & Safety">QHSE & Safety</option>
									</select>

									<select
										bind:value={tnaFilterStatus}
										class="px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface"
									>
										<option value="All">Semua Status GAP</option>
										<option value="GAP">Hanya GAP Competency</option>
										<option value="QUALIFIED">Hanya Qualified</option>
										<option value="ASSIGNED">Sudah Ditugaskan Portal</option>
									</select>

									<div class="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
										<button
											type="button"
											onclick={() => toggleAllEmployees(true)}
											class="px-2.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-on-surface transition-all cursor-pointer flex items-center gap-1"
											title="Buka semua rincian kompetensi karyawan"
										>
											<span class="material-symbols-outlined text-sm">unfold_more</span>
											<span class="hidden md:inline">Buka Semua</span>
										</button>
										<button
											type="button"
											onclick={() => toggleAllEmployees(false)}
											class="px-2.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-on-surface transition-all cursor-pointer flex items-center gap-1"
											title="Tutup semua rincian kompetensi karyawan"
										>
											<span class="material-symbols-outlined text-sm">unfold_less</span>
											<span class="hidden md:inline">Tutup Semua</span>
										</button>
									</div>
								</div>
							</div>

							<!-- Tabel Asesmen & Penugasan Pelatihan Personal (Group By Karyawan) -->
							<div class="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
								<div class="overflow-x-auto">
									<table class="w-full text-xs text-left">
										<thead class="bg-surface-container-high font-bold text-on-surface border-b border-slate-200/60 dark:border-slate-800/60">
											<tr>
												<th class="p-3 w-10 text-center"></th>
												<th class="p-3">Karyawan (NIP & Jabatan)</th>
												<th class="p-3">Departemen</th>
												<th class="p-3 text-center">Kompetensi Dinilai</th>
												<th class="p-3 text-center">Status Kelayakan / GAP</th>
												<th class="p-3 text-center">Penugasan Portal</th>
												<th class="p-3 text-right">Rincian Kompetensi</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
											{#each filteredGroupedEmployeeAssessments as grp}
												{@const empKey = grp.payrollId || grp.employeeName}
												{@const isExpanded = !!expandedEmployees[empKey]}
												<!-- Baris Utama Grup Karyawan -->
												<tr
													onclick={() => toggleEmployeeExpand(empKey)}
													class="hover:bg-surface-container/60 transition-colors cursor-pointer {isExpanded ? 'bg-primary/5' : ''}"
												>
													<!-- Chevron Expand -->
													<td class="p-3 text-center">
														<div class="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center text-slate-500 transition-transform duration-200 {isExpanded ? 'rotate-180 bg-primary/20 text-primary' : ''}">
															<span class="material-symbols-outlined text-base">expand_more</span>
														</div>
													</td>

													<!-- Karyawan -->
													<td class="p-3">
														<div class="flex items-center gap-2.5">
															<div class="w-8 h-8 rounded-xl bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0">
																{grp.employeeName.charAt(0).toUpperCase()}
															</div>
															<div>
																<p class="font-bold text-on-surface text-xs leading-snug">{grp.employeeName}</p>
																<div class="flex items-center gap-1.5 text-[10px] text-slate-500">
																	<span class="font-mono">{grp.payrollId}</span>
																	<span>•</span>
																	<span>{grp.positionTitle}</span>
																</div>
															</div>
														</div>
													</td>

													<!-- Departemen -->
													<td class="p-3">
														<span class="px-2 py-0.5 rounded-lg bg-surface border border-slate-200 dark:border-slate-800 text-[10px] font-medium text-on-surface">
															{grp.department}
														</span>
													</td>

													<!-- Total Kompetensi Dinilai -->
													<td class="p-3 text-center">
														<span class="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-surface-container text-on-surface border border-slate-200/60 dark:border-slate-800/60">
															{grp.totalCompetencies} Kompetensi
														</span>
													</td>

													<!-- Status Kelayakan / GAP -->
													<td class="p-3 text-center">
														{#if grp.gapCount > 0}
															<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
																<span class="material-symbols-outlined text-xs">warning</span>
																<span>{grp.gapCount} GAP Perlu Pelatihan</span>
															</span>
														{:else}
															<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
																<span class="material-symbols-outlined text-xs">check_circle</span>
																<span>Memenuhi Standar</span>
															</span>
														{/if}
													</td>

													<!-- Penugasan Portal -->
													<td class="p-3 text-center">
														{#if grp.assignedCount > 0 || grp.completedCount > 0}
															<div class="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
																<span class="material-symbols-outlined text-xs">send_to_mobile</span>
																<span>{grp.assignedCount + grp.completedCount} Modul</span>
															</div>
														{:else if grp.gapCount > 0}
															<span class="text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
																Belum Ditugaskan
															</span>
														{:else}
															<span class="text-slate-400 text-[10px]">-</span>
														{/if}
													</td>

													<!-- Aksi Rincian -->
													<td class="p-3 text-right" onclick={(e) => e.stopPropagation()}>
														<button
															type="button"
															onclick={() => toggleEmployeeExpand(empKey)}
															class="px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5
															{isExpanded
																? 'bg-primary text-on-primary shadow-xs'
																: 'bg-surface-container hover:bg-surface-container-high border border-slate-200 dark:border-slate-800 text-on-surface'}"
														>
															<span class="material-symbols-outlined text-xs">
																{isExpanded ? 'visibility_off' : 'visibility'}
															</span>
															<span>{isExpanded ? 'Tutup' : `Lihat (${grp.totalCompetencies})`}</span>
														</button>
													</td>
												</tr>

												<!-- Accordion Detail Baris Kompetensi Karyawan -->
												{#if isExpanded}
													<tr class="bg-surface-container/20 border-b-2 border-primary/20">
														<td colspan="7" class="p-3 sm:p-4">
															<div class="rounded-2xl bg-surface border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xs space-y-3 p-4">
																<!-- Header Rincian Karyawan -->
																<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
																	<div class="flex items-center gap-2">
																		<span class="material-symbols-outlined text-primary text-lg">assessment</span>
																		<div>
																			<h5 class="font-bold text-xs text-on-surface">
																				Rincian Kompetensi: <strong class="text-primary">{grp.employeeName}</strong>
																			</h5>
																			<p class="text-[10px] text-slate-500">
																				{grp.positionTitle} • {grp.department} • NIP: {grp.payrollId}
																			</p>
																		</div>
																	</div>

																	<div class="flex items-center gap-2">
																		<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
																			{grp.qualifiedCount} Memenuhi Standar
																		</span>
																		{#if grp.gapCount > 0}
																			<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
																				{grp.gapCount} Butuh Pelatihan
																			</span>
																		{/if}
																	</div>
																</div>

																<!-- Tabel Sub-Baris Kompetensi -->
																<div class="overflow-x-auto">
																	<table class="w-full text-xs text-left">
																		<thead class="bg-surface-container font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200/60 dark:border-slate-800/60 text-[11px]">
																			<tr>
																				<th class="p-2.5">Kompetensi yang Diuji</th>
																				<th class="p-2.5 text-center">Standar Target</th>
																				<th class="p-2.5 text-center">Nilai Aktual</th>
																				<th class="p-2.5 text-center">GAP</th>
																				<th class="p-2.5">Pelatihan Personal (Rekomendasi GAP)</th>
																				<th class="p-2.5 text-center">Status Portal Karyawan</th>
																				<th class="p-2.5 text-right">Aksi Penugasan</th>
																			</tr>
																		</thead>
																		<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
																			{#each grp.items as item}
																				<tr class="hover:bg-surface-container/50 transition-colors">
																					<!-- Kompetensi -->
																					<td class="p-2.5">
																						<div class="flex items-center gap-1.5">
																							<span class="font-mono font-bold text-primary">{item.competencyCode}</span>
																							<span class="font-bold text-on-surface">{item.competencyName}</span>
																						</div>
																						<span class="px-2 py-0.2 rounded-md text-[9px] font-bold uppercase tracking-wider
																							{item.competencyAspect === 'Core Competency' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
																							item.competencyAspect === 'Behavioral Competency' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
																							'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}">
																							{item.competencyAspect}
																						</span>
																					</td>

																					<!-- Standar Level -->
																					<td class="p-2.5 text-center font-bold text-slate-600 dark:text-slate-300">
																						<span class="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-surface-container border font-mono font-black text-xs">
																							{item.requiredLevel}
																						</span>
																					</td>

																					<!-- Aktual Level -->
																					<td class="p-2.5 text-center font-bold text-on-surface">
																						<span class="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-surface-container-high border font-mono font-black text-xs">
																							{item.actualLevel}
																						</span>
																					</td>

																					<!-- GAP -->
																					<td class="p-2.5 text-center">
																						{#if item.gap >= 0}
																							<span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center gap-1 mx-auto max-w-fit">
																								<span class="material-symbols-outlined text-xs">check</span>
																								Qualified (+{item.gap})
																							</span>
																						{:else}
																							<span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center justify-center gap-1 mx-auto max-w-fit animate-pulse">
																								<span class="material-symbols-outlined text-xs">warning</span>
																								GAP ({item.gap})
																							</span>
																						{/if}
																					</td>

																					<!-- Pelatihan Rekomendasi GAP -->
																					<td class="p-2.5">
																						{#if item.assignedCourseTitle}
																							<div class="space-y-0.5">
																								<p class="font-bold text-on-surface text-xs leading-snug">{item.assignedCourseTitle}</p>
																								<p class="font-mono text-[10px] text-slate-500">{item.assignedCourseId}</p>
																							</div>
																						{:else if item.gap < 0}
																							<div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-semibold border border-amber-500/20">
																								<span class="material-symbols-outlined text-xs">warning</span>
																								<span>Belum Ada Materi</span>
																							</div>
																						{:else}
																							<span class="text-slate-400 italic text-[11px]">-</span>
																						{/if}
																					</td>

																					<!-- Status di Portal Karyawan -->
																					<td class="p-2.5 text-center">
																						{#if item.trainingStatus === 'ASSIGNED'}
																							<div class="space-y-1">
																								<span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 inline-block">
																									Ditugaskan (Portal)
																								</span>
																								<div class="w-20 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mx-auto overflow-hidden">
																									<div class="bg-indigo-600 h-full rounded-full" style="width: {item.progressPercent}%"></div>
																								</div>
																								<p class="text-[9px] font-mono text-slate-500">{item.progressPercent}% Selesai</p>
																							</div>
																						{:else if item.trainingStatus === 'COMPLETED'}
																							<span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
																								<span class="material-symbols-outlined text-xs">verified</span>
																								Lulus Pelatihan
																							</span>
																						{:else if item.gap < 0}
																							<span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
																								Belum Ditugaskan
																							</span>
																						{:else}
																							<span class="text-slate-400 text-[10px]">-</span>
																						{/if}
																					</td>

																					<!-- Aksi Penugasan Personal -->
																					<td class="p-2.5 text-right">
																						{#if item.gap < 0}
																							{#if !item.assignedCourseId}
																								<!-- Belum ada materi kursus: Tampilkan tombol Hubungkan Kursus -->
																								<button
																									type="button"
																									onclick={() => openAssignCourseModal(item)}
																									class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all cursor-pointer shadow-xs flex items-center gap-1.5 ml-auto"
																								>
																									<span class="material-symbols-outlined text-sm">add_link</span>
																									<span>Pilih/Hubungkan Kursus</span>
																								</button>
																							{:else}
																								<!-- Sudah ada materi kursus: Tugaskan / Tugaskan Ulang + tombol Ubah -->
																								<div class="flex items-center justify-end gap-1.5">
																									<form
																										method="POST"
																										action="?/assignPersonalTraining"
																										use:enhance={() => {
																											return async ({ result, update }) => {
																												if (result.type === 'success') {
																													const resData = result.data as any;
																													if (resData?.success === false) {
																														notifyError('Gagal Menugaskan', resData?.message || 'Gagal menugaskan materi.');
																													} else {
																														notifySuccess('Pelatihan Ditugaskan', resData?.message || 'Materi berhasil ditugaskan ke portal karyawan.');
																														await update();
																													}
																												} else if (result.type === 'failure') {
																													notifyError('Gagal Menugaskan', 'Data tidak valid.');
																												} else if (result.type === 'error') {
																													notifyError('Kesalahan Server', 'Gagal memproses penugasan.');
																												}
																											};
																										}}
																										class="inline-block"
																									>
																										<input type="hidden" name="assessmentId" value={item.id} />
																										<input type="hidden" name="payrollId" value={item.payrollId} />
																										<input type="hidden" name="employeeName" value={item.employeeName} />
																										<input type="hidden" name="competencyCode" value={item.competencyCode} />
																										<input type="hidden" name="courseId" value={item.assignedCourseId} />

																										<button
																											type="submit"
																											class="px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5
																											{item.trainingStatus === 'ASSIGNED'
																												? 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-on-surface'
																												: 'bg-indigo-600 hover:bg-indigo-500 text-white'}"
																										>
																											<span class="material-symbols-outlined text-sm">
																												{item.trainingStatus === 'ASSIGNED' ? 'replay' : 'send_to_mobile'}
																											</span>
																											<span>{item.trainingStatus === 'ASSIGNED' ? 'Tugaskan Ulang' : '🎯 Tugaskan ke Portal'}</span>
																										</button>
																									</form>

																									<button
																										type="button"
																										title="Ganti Kursus Rekomendasi"
																										onclick={() => openAssignCourseModal(item)}
																										class="w-7 h-7 rounded-xl bg-surface-container hover:bg-surface-container-highest border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-on-surface flex items-center justify-center transition-all cursor-pointer"
																									>
																										<span class="material-symbols-outlined text-xs">edit</span>
																									</button>
																								</div>
																							{/if}
																						{:else}
																							<span class="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center justify-end gap-1">
																								<span class="material-symbols-outlined text-sm">check_circle</span>
																								<span>Memenuhi Standar</span>
																							</span>
																						{/if}
																					</td>
																				</tr>
																			{/each}
																		</tbody>
																	</table>
																</div>
															</div>
														</td>
													</tr>
												{/if}
											{/each}

											{#if filteredGroupedEmployeeAssessments.length === 0}
												<tr>
													<td colspan="7" class="p-8 text-center text-slate-400">
														<span class="material-symbols-outlined text-4xl block mb-2 text-slate-300">search_off</span>
														<p class="font-bold">Tidak ada data asesmen karyawan yang cocok dengan filter pencarian.</p>
													</td>
												</tr>
											{/if}
										</tbody>
									</table>
								</div>
							</div>
						</div>

					<!-- ═══════════════════════════════════════════════════════════ -->
					<!-- SUB-VIEW 2: KAMUS KOMPETENSI RESMI (170+ ITEMS)             -->
					<!-- ═══════════════════════════════════════════════════════════ -->
					{:else if tnaSubTab === 'library'}
						<div class="space-y-6">
							<!-- Header & Summary Stats -->
							<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
								<div>
									<div class="flex items-center gap-2">
										<h4 class="font-black text-sm text-on-surface uppercase tracking-wider">Kamus Kompetensi Resmi PT BCS Logistics</h4>
										<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-primary/10 text-primary border border-primary/20">
											{competencyLibrary.length} Kompetensi
										</span>
									</div>
									<p class="text-xs text-on-surface-variant mt-0.5">Taksonomi resmi Level 1 s.d. Level 5 bersumber dari Master Spreadsheet Kamus Kompetensi BCS</p>
								</div>

								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={() => (isCompetencyModalOpen = true)}
										class="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
									>
										<span class="material-symbols-outlined text-sm">add_circle</span>
										<span>+ Tambah Manual</span>
									</button>
								</div>
							</div>

							<!-- Metric Mini-Bar -->
							<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
								<div class="p-3 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
									<div>
										<p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Kamus</p>
										<p class="text-xl font-black text-on-surface font-mono">{competencyLibrary.length}</p>
									</div>
									<span class="material-symbols-outlined text-2xl text-slate-400">library_books</span>
								</div>

								<div class="p-3 rounded-2xl bg-surface-container border border-emerald-500/20 flex items-center justify-between">
									<div>
										<p class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Materi Kursus Terhubung</p>
										<p class="text-xl font-black text-emerald-600 font-mono">
											{competencyLibrary.filter((c: any) => c.defaultCourseId).length}
										</p>
									</div>
									<span class="material-symbols-outlined text-2xl text-emerald-500">link</span>
								</div>

								<div class="p-3 rounded-2xl bg-surface-container border border-amber-500/20 flex items-center justify-between">
									<div>
										<p class="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Belum Terhubung Materi</p>
										<p class="text-xl font-black text-amber-600 font-mono">
											{competencyLibrary.filter((c: any) => !c.defaultCourseId).length}
										</p>
									</div>
									<span class="material-symbols-outlined text-2xl text-amber-500">link_off</span>
								</div>
							</div>

							<!-- Filter & Search Toolbar -->
							<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface-container/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
								<div class="relative flex-1">
									<span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
									<input
										type="text"
										bind:value={compSearchQuery}
										oninput={() => (compCurrentPage = 1)}
										placeholder="Cari kode (misal: A01, I11), nama kompetensi, atau kursus..."
										class="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs focus:ring-1 focus:ring-primary outline-hidden"
									/>
								</div>

								<div class="flex flex-wrap items-center gap-2">
									<!-- Filter Aspek -->
									<select
										bind:value={compFilterAspect}
										onchange={() => (compCurrentPage = 1)}
										class="px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs text-on-surface font-medium"
									>
										{#each competencyAspects as asp}
											<option value={asp}>{asp === 'All' ? 'Semua Aspek Kompetensi' : asp}</option>
										{/each}
									</select>

									<!-- Filter Status Materi -->
									<select
										bind:value={compFilterStatus}
										onchange={() => (compCurrentPage = 1)}
										class="px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs text-on-surface font-medium"
									>
										<option value="All">Semua Status Materi</option>
										<option value="Linked">Terhubung Materi Kursus</option>
										<option value="Unlinked">Belum Terhubung Materi</option>
									</select>
								</div>
							</div>

							<!-- Grid Kartu Kamus Kompetensi -->
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{#each pagedCompetencyLibrary as comp}
									<div class="p-4 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-3 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
										<div class="space-y-2.5">
											<div class="flex items-start justify-between gap-2">
												<span class="px-2.5 py-0.5 rounded-lg text-xs font-mono font-black bg-primary/10 text-primary border border-primary/20">
													{comp.code}
												</span>
												<span class="px-2 py-0.5 rounded-full text-[9px] font-bold text-right leading-tight line-clamp-1
													{comp.aspect.includes('Core') ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
													comp.aspect.includes('Behavioral') ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
													comp.aspect.includes('Task') ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
													comp.aspect.includes('QHSE') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
													'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}">
													{comp.aspect}
												</span>
											</div>

											<div>
												<h5 class="font-black text-sm text-on-surface leading-snug">{comp.name}</h5>
											</div>

											<!-- Status Materi Kursus -->
											{#if comp.defaultCourseId}
												<div class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] space-y-1">
													<div class="flex items-center justify-between">
														<span class="text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
															<span class="material-symbols-outlined text-xs">check_circle</span>
															Materi Terhubung:
														</span>
														<button
															type="button"
															onclick={() => openLinkCourseModal(comp)}
															class="text-[10px] text-primary hover:underline font-bold cursor-pointer"
														>
															Ubah
														</button>
													</div>
													<p class="font-bold text-on-surface leading-snug">{comp.defaultCourseTitle}</p>
													<p class="font-mono text-[9px] text-slate-500">{comp.defaultCourseId}</p>
												</div>
											{:else}
												<div class="p-2.5 rounded-xl bg-surface-container-high/60 border border-dashed border-slate-300 dark:border-slate-700 text-[11px] space-y-1.5">
													<div class="flex items-center justify-between">
														<span class="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
															<span class="material-symbols-outlined text-xs">info</span>
															Belum Terhubung Materi
														</span>
													</div>
													<p class="text-[11px] text-slate-400">Belum ada modul pelatihan yang dipetakan ke kompetensi ini.</p>
													<button
														type="button"
														onclick={() => openLinkCourseModal(comp)}
														class="w-full py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
													>
														<span class="material-symbols-outlined text-xs">add_link</span>
														<span>Hubungkan Materi Kursus</span>
													</button>
												</div>
											{/if}
										</div>

										<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
											<button
												type="button"
												onclick={() => {
													selectedCompetencyForIndicator = comp;
													isLevelIndicatorModalOpen = true;
												}}
												class="px-3 py-1.5 rounded-xl bg-surface-container-highest hover:bg-slate-200 dark:hover:bg-slate-700 text-on-surface text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
											>
												<span class="material-symbols-outlined text-sm">rubric</span>
												<span>Lihat Indikator Level 1-5</span>
											</button>

											<span class="text-[10px] text-slate-400 font-mono">5 Level Rubrik</span>
										</div>
									</div>
								{/each}
							</div>

							{#if filteredCompetencyLibrary.length === 0}
								<div class="p-12 text-center rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60">
									<span class="material-symbols-outlined text-4xl text-slate-300 block mb-2">search_off</span>
									<p class="font-bold text-sm text-on-surface">Tidak ada kompetensi yang sesuai kriteria pencarian</p>
									<p class="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci atau filter aspek di atas.</p>
								</div>
							{/if}

							<!-- Pagination Controls -->
							{#if totalCompPages > 1}
								<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
									<p class="text-xs text-on-surface-variant">
										Menampilkan <strong class="text-on-surface font-mono">{(compCurrentPage - 1) * compPerPage + 1}</strong>
										s.d. <strong class="text-on-surface font-mono">{Math.min(compCurrentPage * compPerPage, filteredCompetencyLibrary.length)}</strong>
										dari <strong class="text-on-surface font-mono">{filteredCompetencyLibrary.length}</strong> kompetensi
									</p>

									<div class="flex items-center gap-2">
										<button
											type="button"
											disabled={compCurrentPage === 1}
											onclick={() => (compCurrentPage = Math.max(1, compCurrentPage - 1))}
											class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface text-xs font-bold text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container transition-all cursor-pointer flex items-center gap-1"
										>
											<span class="material-symbols-outlined text-xs">chevron_left</span>
											<span>Sebelumnya</span>
										</button>

										<span class="px-3 py-1.5 rounded-xl bg-surface-container-high font-mono text-xs font-bold text-on-surface">
											Hal {compCurrentPage} / {totalCompPages}
										</span>

										<button
											type="button"
											disabled={compCurrentPage === totalCompPages}
											onclick={() => (compCurrentPage = Math.min(totalCompPages, compCurrentPage + 1))}
											class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface text-xs font-bold text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container transition-all cursor-pointer flex items-center gap-1"
										>
											<span>Selanjutnya</span>
											<span class="material-symbols-outlined text-xs">chevron_right</span>
										</button>
									</div>
								</div>
							{/if}
						</div>

					<!-- ═══════════════════════════════════════════════════════════ -->
					<!-- SUB-VIEW 3: STANDAR KOMPETENSI JABATAN (JOB STANDARDS)      -->
					<!-- ═══════════════════════════════════════════════════════════ -->
					{:else if tnaSubTab === 'standards'}
						<div class="space-y-6">
							<!-- Header Standar Jabatan -->
							<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
								<div>
									<h4 class="font-black text-sm text-on-surface uppercase tracking-wider">Standar Kompetensi Jabatan (Required Level)</h4>
									<p class="text-xs text-on-surface-variant">Matriks level kemahiran minimal yang harus dikuasai oleh masing-masing posisi kerja per divisi di PT BCS</p>
								</div>

								<button
									type="button"
									onclick={() => openJobStandardModal()}
									class="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shadow-xs"
								>
									<span class="material-symbols-outlined text-sm">tune</span>
									<span>+ Tetapkan Standar Jabatan</span>
								</button>
							</div>

							<!-- Mini Metric Cards Standar Jabatan -->
							<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
								<div class="p-3.5 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
									<div>
										<p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Jabatan Terstandarisasi</p>
										<p class="text-xl font-black text-on-surface mt-0.5 font-mono">{groupedJobStandards.length} <span class="text-xs font-normal text-slate-400">Posisi</span></p>
									</div>
									<span class="material-symbols-outlined text-2xl text-slate-400">badge</span>
								</div>

								<div class="p-3.5 rounded-2xl bg-surface-container border border-blue-500/20 flex items-center justify-between">
									<div>
										<p class="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Matriks Standar Kompetensi</p>
										<p class="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5 font-mono">{jobStandards.length} <span class="text-xs font-normal text-blue-500">Standar</span></p>
									</div>
									<span class="material-symbols-outlined text-2xl text-blue-500">checklist</span>
								</div>

								<div class="p-3.5 rounded-2xl bg-surface-container border border-emerald-500/20 flex items-center justify-between">
									<div>
										<p class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Materi Kursus LMS Terhubung</p>
										<p class="text-xl font-black text-emerald-600 mt-0.5 font-mono">
											{jobStandards.filter((j) => j.defaultCourseTitle && j.defaultCourseTitle !== '-').length} <span class="text-xs font-normal text-emerald-500">Modul Siap</span>
										</p>
									</div>
									<span class="material-symbols-outlined text-2xl text-emerald-500">school</span>
								</div>
							</div>

							<!-- Filter & Search Toolbar Standar Jabatan -->
							<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div class="flex items-center gap-2 flex-1 max-w-md">
									<div class="relative w-full">
										<span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
										<input
											type="text"
											bind:value={jobStandardSearchQuery}
											placeholder="Cari nama posisi, jabatan, atau kompetensi..."
											class="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs focus:ring-1 focus:ring-primary outline-hidden"
										/>
									</div>
								</div>

								<div class="flex items-center gap-2">
									<select
										bind:value={jobStandardFilterDivision}
										class="px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface"
									>
										<option value="All">Semua Divisi / Departemen</option>
										{#each divisions as div}
											<option value={div.name}>{div.name}</option>
										{/each}
									</select>

									<div class="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
										<button
											type="button"
											onclick={() => toggleAllPositions(true)}
											class="px-2.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-on-surface transition-all cursor-pointer flex items-center gap-1"
											title="Buka semua rincian standar jabatan"
										>
											<span class="material-symbols-outlined text-sm">unfold_more</span>
											<span class="hidden md:inline">Buka Semua</span>
										</button>
										<button
											type="button"
											onclick={() => toggleAllPositions(false)}
											class="px-2.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-on-surface transition-all cursor-pointer flex items-center gap-1"
											title="Tutup semua rincian standar jabatan"
										>
											<span class="material-symbols-outlined text-sm">unfold_less</span>
											<span class="hidden md:inline">Tutup Semua</span>
										</button>
									</div>
								</div>
							</div>

							<!-- Tabel Standar Jabatan (Group By Posisi / Jabatan) -->
							{#if jobStandards.length === 0}
								<div class="p-12 text-center rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-3">
									<div class="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
										<span class="material-symbols-outlined text-3xl">playlist_add_check</span>
									</div>
									<h4 class="font-bold text-base text-on-surface">Data Standar Jabatan Masih Kosong</h4>
									<p class="text-xs text-on-surface-variant max-w-md mx-auto">
										Belum ada standar kompetensi yang ditetapkan. Silakan klik tombol di bawah untuk menetapkan kompetensi wajib dan target level bagi masing-masing jabatan.
									</p>
									<button
										type="button"
										onclick={() => openJobStandardModal()}
										class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold inline-flex items-center gap-1.5 shadow-sm hover:opacity-90 cursor-pointer"
									>
										<span class="material-symbols-outlined text-sm">add_circle</span>
										<span>Mulai Tetapkan Standar Jabatan</span>
									</button>
								</div>
							{:else}
								<div class="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
									<table class="w-full text-xs text-left">
										<thead class="bg-surface-container-high font-bold text-on-surface border-b border-slate-200/60 dark:border-slate-800/60">
											<tr>
												<th class="p-3 w-10 text-center"></th>
												<th class="p-3">Posisi / Jabatan</th>
												<th class="p-3">Divisi / Departemen</th>
												<th class="p-3 text-center">Kompetensi Wajib</th>
												<th class="p-3 text-center">Standar Target Level</th>
												<th class="p-3 text-center">Modul Kursus LMS</th>
												<th class="p-3 text-right">Aksi & Rincian</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
											{#each filteredGroupedJobStandards as pos}
												{@const isExpanded = !!expandedPositions[pos.key]}
												<!-- Baris Utama Posisi -->
												<tr
													onclick={() => togglePositionExpand(pos.key)}
													class="hover:bg-surface-container/60 transition-colors cursor-pointer {isExpanded ? 'bg-primary/5' : ''}"
												>
													<!-- Chevron Expand -->
													<td class="p-3 text-center">
														<div class="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center text-slate-500 transition-transform duration-200 {isExpanded ? 'rotate-180 bg-primary/20 text-primary' : ''}">
															<span class="material-symbols-outlined text-base">expand_more</span>
														</div>
													</td>

													<!-- Posisi / Jabatan -->
													<td class="p-3">
														<div class="flex items-center gap-2.5">
															<div class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-xs flex items-center justify-center shrink-0">
																<span class="material-symbols-outlined text-base">work</span>
															</div>
															<div>
																<p class="font-bold text-on-surface text-xs leading-snug">{pos.positionTitle}</p>
																<p class="text-[10px] text-slate-400 font-mono">Standar Resmi BCS</p>
															</div>
														</div>
													</td>

													<!-- Divisi / Departemen -->
													<td class="p-3">
														<span class="px-2 py-0.5 rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-on-surface">
															{pos.division || pos.department}
														</span>
													</td>

													<!-- Total Kompetensi -->
													<td class="p-3 text-center">
														<span class="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-surface-container text-on-surface border border-slate-200/60 dark:border-slate-800/60">
															{pos.totalCompetencies} Kompetensi
														</span>
													</td>

													<!-- Standar Target Level -->
													<td class="p-3 text-center">
														<span class="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono font-black text-xs border border-blue-200 dark:border-blue-800">
															Level {pos.minLevel === pos.maxLevel ? pos.minLevel : `${pos.minLevel} - ${pos.maxLevel}`} / 5
														</span>
													</td>

													<!-- Modul Kursus LMS -->
													<td class="p-3 text-center">
														{#if pos.linkedCoursesCount === pos.totalCompetencies}
															<span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
																<span class="material-symbols-outlined text-xs">check_circle</span>
																<span>Semua Kursus Siap ({pos.linkedCoursesCount}/{pos.totalCompetencies})</span>
															</span>
														{:else if pos.linkedCoursesCount > 0}
															<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
																<span class="material-symbols-outlined text-xs">info</span>
																<span>{pos.linkedCoursesCount}/{pos.totalCompetencies} Kursus Siap</span>
															</span>
														{:else}
															<span class="text-slate-400 text-[10px] italic">Belum Ada Kursus</span>
														{/if}
													</td>

													<!-- Aksi & Rincian -->
													<td class="p-3 text-right" onclick={(e) => e.stopPropagation()}>
														<div class="flex items-center justify-end gap-1.5">
															<button
																type="button"
																onclick={() => togglePositionExpand(pos.key)}
																class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1
																{isExpanded
																	? 'bg-primary text-on-primary shadow-xs'
																	: 'bg-surface-container hover:bg-surface-container-high border border-slate-200 dark:border-slate-800 text-on-surface'}"
															>
																<span class="material-symbols-outlined text-xs">
																	{isExpanded ? 'visibility_off' : 'visibility'}
																</span>
																<span>{isExpanded ? 'Tutup Detail' : 'Detail'}</span>
															</button>

															<button
																type="button"
																onclick={() => openJobStandardModal(pos.positionTitle, pos.division)}
																class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-surface-container hover:bg-surface-container-high border border-slate-200 dark:border-slate-800 text-primary hover:text-primary transition-all cursor-pointer inline-flex items-center gap-1"
																title="Atur Standar Kompetensi Jabatan ini"
															>
																<span class="material-symbols-outlined text-xs">tune</span>
																<span class="hidden sm:inline">Atur</span>
															</button>
														</div>
													</td>
												</tr>

												<!-- Accordion Detail Baris Kompetensi Jabatan -->
												{#if isExpanded}
													<tr class="bg-surface-container/20 border-b-2 border-primary/20">
														<td colspan="7" class="p-3 sm:p-4">
															<div class="rounded-2xl bg-surface border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xs space-y-3 p-4">
																<!-- Header Rincian Posisi -->
																<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
																	<div class="flex items-center gap-2">
																		<span class="material-symbols-outlined text-primary text-lg">stairs</span>
																		<div>
																			<h5 class="font-bold text-xs text-on-surface">
																				Standar Kompetensi: <strong class="text-primary">{pos.positionTitle}</strong>
																			</h5>
																			<p class="text-[10px] text-slate-500">
																				Divisi: {pos.division} • {pos.totalCompetencies} Kompetensi Dipersyaratkan
																			</p>
																		</div>
																	</div>

																	<button
																		type="button"
																		onclick={() => openJobStandardModal(pos.positionTitle, pos.division)}
																		class="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold inline-flex items-center gap-1 shadow-xs hover:opacity-90 cursor-pointer"
																	>
																		<span class="material-symbols-outlined text-xs">tune</span>
																		<span>Kelola / Tambah Kompetensi</span>
																	</button>
																</div>

																<!-- Tabel Sub-Baris Kompetensi Standar Jabatan -->
																<div class="overflow-x-auto">
																	<table class="w-full text-xs text-left">
																		<thead class="bg-surface-container font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200/60 dark:border-slate-800/60 text-[11px]">
																			<tr>
																				<th class="p-2.5">Kode</th>
																				<th class="p-2.5">Kompetensi</th>
																				<th class="p-2.5">Aspek</th>
																				<th class="p-2.5 text-center">Standar Target</th>
																				<th class="p-2.5">Default Kursus LMS</th>
																				<th class="p-2.5 text-right">Aksi</th>
																			</tr>
																		</thead>
																		<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
																			{#each pos.competencies as std}
																				<tr class="hover:bg-surface-container/50 transition-colors">
																					<td class="p-2.5 font-mono font-bold text-primary">{std.competencyCode}</td>
																					<td class="p-2.5 font-bold text-on-surface">{std.competencyName}</td>
																					<td class="p-2.5">
																						<span class="px-2 py-0.2 rounded-md text-[9px] font-bold uppercase tracking-wider
																							{std.competencyAspect === 'Core Competency' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
																							std.competencyAspect === 'Behavioral Competency' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
																							'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}">
																							{std.competencyAspect}
																						</span>
																					</td>
																					<td class="p-2.5 text-center">
																						<span class="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono font-black text-xs border border-blue-200 dark:border-blue-800">
																							Level {std.requiredLevel} / 5
																						</span>
																					</td>
																					<td class="p-2.5 text-slate-600 dark:text-slate-300 font-medium">
																						{#if std.defaultCourseTitle && std.defaultCourseTitle !== '-'}
																							<span class="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
																								<span class="material-symbols-outlined text-xs">school</span>
																								<span>{std.defaultCourseTitle}</span>
																							</span>
																						{:else}
																							<span class="text-slate-400 italic text-[11px]">-</span>
																						{/if}
																					</td>
																					<td class="p-2.5 text-right">
																						<form method="POST" action="?/deleteJobStandard" use:enhance={() => {
																							return async ({ result, update }) => {
																								if (result.type === 'success') {
																									const resData = result.data as any;
																									if (resData?.success === false) {
																										notifyError('Gagal Menghapus', resData?.message || 'Gagal menghapus standar.');
																									} else {
																										notifySuccess('Standar Dihapus', resData?.message || 'Standar kompetensi berhasil dihapus.');
																										await update();
																									}
																								}
																							};
																						}} class="inline">
																							<input type="hidden" name="id" value={std.id} />
																							<button
																								type="submit"
																								class="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-surface-container transition-all cursor-pointer"
																								title="Hapus standar kompetensi ini"
																								onclick={(e) => {
																									if (!confirm(`Hapus standar kompetensi [${std.competencyCode}] untuk posisi ${pos.positionTitle}?`)) {
																										e.preventDefault();
																									}
																								}}
																							>
																								<span class="material-symbols-outlined text-sm">delete</span>
																							</button>
																						</form>
																					</td>
																				</tr>
																			{/each}
																		</tbody>
																	</table>
																</div>
															</div>
														</td>
													</tr>
												{/if}
											{/each}

											{#if filteredGroupedJobStandards.length === 0}
												<tr>
													<td colspan="7" class="p-8 text-center text-slate-400">
														<span class="material-symbols-outlined text-4xl block mb-2 text-slate-300">search_off</span>
														<p class="font-bold">Tidak ada data standar jabatan yang cocok dengan filter pencarian.</p>
													</td>
												</tr>
											{/if}
										</tbody>
									</table>
								</div>
							{/if}
						</div>
					<!-- ═══════════════════════════════════════════════════════════ -->
					<!-- SUB-VIEW 4: SAFETY TEST & TRAINING REQUEST                 -->
					<!-- ═══════════════════════════════════════════════════════════ -->
					{:else if tnaSubTab === 'safety'}
						<div class="space-y-6">
							<!-- Panel 1: Annual Safety Test -->
							<div class="p-5 rounded-2xl bg-gradient-to-r from-emerald-900/30 via-slate-900/40 to-slate-900/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
								<div class="space-y-1">
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-emerald-400 text-xl">security</span>
										<h3 class="font-black text-base text-white">Annual Safety Test {safetyStats?.year || 2026} (Kepatuhan Wajib K3)</h3>
										<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950 uppercase">Mandatory K3</span>
									</div>
									<p class="text-xs text-slate-300">
										Status kepatuhan: <strong>{safetyStats?.passedDrivers}</strong> dari <strong>{safetyStats?.totalTargetDrivers}</strong> driver ({safetyStats?.complianceRate}%) telah lulus uji keselamatan berkendara berkala.
									</p>
								</div>

								<button
									type="button"
									onclick={() => (isSafetyTestModalOpen = true)}
									class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer self-start sm:self-auto"
								>
									<span class="material-symbols-outlined text-sm">quiz</span>
									<span>Mulai Ujian Safety Mandiri</span>
								</button>
							</div>
						</div>

					<!-- ═══════════════════════════════════════════════════════════ -->
					<!-- SUB-VIEW 5: USULAN & REQUEST PELATIHAN ATASAN (HRD REVIEW) -->
					<!-- ═══════════════════════════════════════════════════════════ -->
					{:else if tnaSubTab === 'requests'}
						<div class="space-y-6">
							<!-- Header Banner & Action Button -->
							<div class="p-5 rounded-3xl bg-surface border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
								<div>
									<div class="flex items-center gap-2">
										<span class="px-2.5 py-1 rounded-xl text-xs font-black bg-primary/10 text-primary border border-primary/20">
											HRD Verification Panel
										</span>
										{#if pendingTrainingRequestsCount > 0}
											<span class="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
												{pendingTrainingRequestsCount} Usulan Menunggu Review
											</span>
										{/if}
									</div>
									<h3 class="text-base font-black text-on-surface mt-2 tracking-tight">Manajemen Usulan Pelatihan Tim dari Atasan Langsung</h3>
									<p class="text-xs text-on-surface-variant mt-0.5 leading-relaxed max-w-2xl">
										Verifikasi permintaan program pelatihan yang diajukan oleh Supervisor/Head Dept. Tentukan status (Pending, Approved, atau Hold) dan jadwalkan sesi pelatihan untuk usulan yang telah disetujui.
									</p>
								</div>

								<div class="flex items-center gap-2 self-start md:self-auto flex-wrap shrink-0">
									<button
										type="button"
										onclick={() => (isRequestModalOpen = true)}
										class="px-4 py-2.5 rounded-2xl bg-surface-container hover:bg-surface-container-high border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
									>
										<span class="material-symbols-outlined text-sm">add_circle</span>
										<span>+ Buat Usulan Baru</span>
									</button>
								</div>
							</div>

							<!-- 4 KPI Summary Cards Status Usulan HRD -->
							<div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Usulan Masuk</span>
										<p class="text-2xl font-black text-on-surface font-mono mt-0.5">
											{trainingRequests.length}
										</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">inbox</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-amber-500 block uppercase tracking-wider">Menunggu Review HRD</span>
										<p class="text-2xl font-black text-amber-500 font-mono mt-0.5">
											{pendingTrainingRequestsCount}
										</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">pending</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-emerald-500 block uppercase tracking-wider">Disetujui HRD (Approved)</span>
										<p class="text-2xl font-black text-emerald-500 font-mono mt-0.5">
											{approvedTrainingRequestsCount}
										</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">check_circle</span>
									</div>
								</div>

								<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
									<div>
										<span class="text-[10px] font-bold text-orange-500 block uppercase tracking-wider">Ditunda HRD (Hold)</span>
										<p class="text-2xl font-black text-orange-500 font-mono mt-0.5">
											{holdTrainingRequestsCount}
										</p>
									</div>
									<div class="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
										<span class="material-symbols-outlined text-lg">pause_circle</span>
									</div>
								</div>
							</div>

							<!-- Toolbar Search & Filter HRD -->
							<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
								<div class="relative flex-1 max-w-md">
									<span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
									<input
										type="text"
										bind:value={lmsRequestSearchQuery}
										placeholder="Cari nomor ID, judul pelatihan, departemen, atau nama pengusul..."
										class="w-full pl-9 pr-3 py-2 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary"
									/>
								</div>

								<div class="flex items-center gap-2">
									<span class="text-slate-400 font-bold">Status:</span>
									<select
										bind:value={lmsRequestStatusFilter}
										class="px-3 py-2 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs text-on-surface font-semibold outline-none"
									>
										<option value="All">Semua Status</option>
										<option value="PENDING">PENDING (Menunggu)</option>
										<option value="APPROVED">APPROVED (Disetujui)</option>
										<option value="HOLD">HOLD (Ditunda)</option>
									</select>
								</div>
							</div>

							<!-- Tabel Manajemen Review Usulan Pelatihan HRD -->
							<div class="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs bg-surface">
								<div class="overflow-x-auto">
									<table class="w-full text-xs text-left">
										<thead class="bg-surface-container-high border-b border-slate-200/60 dark:border-slate-800/60 font-bold text-on-surface">
											<tr>
												<th class="p-3">No. Usulan</th>
												<th class="p-3">Departemen</th>
												<th class="p-3">Judul Pelatihan Diusulkan</th>
												<th class="p-3">Pengusul</th>
												<th class="p-3 text-center">Urgensi</th>
												<th class="p-3 text-center">Estimasi Peserta</th>
												<th class="p-3 text-center">Target Selesai</th>
												<th class="p-3 text-center">Status HRD</th>
												<th class="p-3">Catatan / Alasan HRD</th>
												<th class="p-3 text-center">Aksi Verifikasi</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
											{#each filteredTrainingRequests as req}
												<tr class="hover:bg-surface-container/40 transition-colors">
													<td class="p-3 font-mono font-bold text-primary whitespace-nowrap">{req.id}</td>
													<td class="p-3 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">{req.deptName}</td>
													<td class="p-3">
														<p class="font-bold text-on-surface">{req.trainingTitle}</p>
														{#if req.justification}
															<p class="text-[11px] text-slate-500 mt-0.5 line-clamp-1" title={req.justification}>
																{req.justification}
															</p>
														{/if}
													</td>
													<td class="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
														<span class="font-semibold">{req.requestedBy}</span>
													</td>
													<td class="p-3 text-center whitespace-nowrap">
														<span class="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase
															{req.urgency === 'CRITICAL' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' :
															req.urgency === 'HIGH' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
															'bg-slate-500/10 text-slate-600 border border-slate-500/20'}">
															{req.urgency}
														</span>
													</td>
													<td class="p-3 text-center font-mono font-bold whitespace-nowrap">
														{req.estimatedParticipants} Orang
													</td>
													<td class="p-3 text-center font-mono text-slate-500 whitespace-nowrap">
														{req.targetCompletionDate || '-'}
													</td>
													<td class="p-3 text-center whitespace-nowrap">
														{#if req.status === 'APPROVED'}
															<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
																<span class="material-symbols-outlined text-xs">check_circle</span>
																<span>APPROVED</span>
															</span>
														{:else if req.status === 'HOLD'}
															<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30">
																<span class="material-symbols-outlined text-xs">pause_circle</span>
																<span>HOLD</span>
															</span>
														{:else}
															<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
																<span class="material-symbols-outlined text-xs">pending</span>
																<span>PENDING</span>
															</span>
														{/if}
													</td>
													<td class="p-3 max-w-[200px]">
														{#if req.hrdNotes}
															<div class="p-1.5 rounded-lg bg-surface-container border border-slate-200 dark:border-slate-700 text-[11px] text-on-surface">
																<p class="line-clamp-2" title={req.hrdNotes}>{req.hrdNotes}</p>
															</div>
														{:else}
															<span class="text-slate-400 italic text-[11px]">- Belum ada catatan -</span>
														{/if}
													</td>
													<td class="p-3 text-center whitespace-nowrap">
														<div class="flex items-center justify-center gap-1.5">
															<button
																type="button"
																onclick={() => openReviewRequestModal(req)}
																class="px-2.5 py-1.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 hover:bg-surface-container-high text-xs font-bold text-on-surface flex items-center gap-1 transition-all cursor-pointer"
																title="Review dan ubah status usulan ini"
															>
																<span class="material-symbols-outlined text-sm">edit_note</span>
																<span>Review</span>
															</button>

															{#if req.status === 'APPROVED'}
																<button
																	type="button"
																	onclick={() => scheduleSessionFromApprovedRequest(req)}
																	class="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
																	title="Buat sesi jadwal pelatihan langsung dari usulan yang disetujui ini"
																>
																	<span class="material-symbols-outlined text-sm">calendar_month</span>
																	<span>Jadwalkan Sesi</span>
																</button>
															{/if}
														</div>
													</td>
												</tr>
											{/each}

											{#if filteredTrainingRequests.length === 0}
												<tr>
													<td colspan="10" class="p-10 text-center text-slate-400">
														<span class="material-symbols-outlined text-4xl block mb-2 text-slate-300">search_off</span>
														<p class="font-bold text-sm">Tidak ada usulan pelatihan yang cocok dengan filter pencarian.</p>
														<p class="text-xs text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau ubah pilihan status di atas.</p>
													</td>
												</tr>
											{/if}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					{/if}
				</div>

			<!-- TAB 5: LAPORAN & E-SERTIFIKAT (SPREADSHEET MASTER: SHEET 306150899) -->
			{:else if activeTab === 'reports'}
				<div class="space-y-5">
					<!-- Top Report Header & Export Actions -->
					<div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
						<div>
							<div class="flex items-center gap-2">
								<h3 class="font-black text-base text-on-surface">Pusat Laporan & Rekapitulasi Pembelajaran (LMS)</h3>
								<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
									Standard BCS
								</span>
							</div>
							<p class="text-xs text-on-surface-variant mt-0.5">
								5 Laporan master berstandar PT Buana Centra Swakarsa Logistics & E-Sertifikat Terverifikasi
							</p>
						</div>

						<div class="flex items-center gap-2 self-start md:self-auto">
							<button
								type="button"
								onclick={exportReportsToCSV}
								class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
							>
								<span class="material-symbols-outlined text-sm">download</span>
								<span>Export CSV ({activeReportType === 'training' || activeReportType === 'course' ? 'ANNUAL REPORT' : activeReportType.replace('_', ' ').toUpperCase()})</span>
							</button>
						</div>
					</div>

					<!-- 5 Sub-Tab Navigation for Reports -->
					<div class="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/40 dark:border-slate-800/40 text-xs">
						<button
							type="button"
							onclick={() => (activeReportType = 'training')}
							class="px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer
							{activeReportType === 'training' || activeReportType === 'course'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">model_training</span>
							<span>1. Annual Report Pelatihan ({unifiedTrainingReports.length})</span>
						</button>

						<button
							type="button"
							onclick={() => (activeReportType = 'attendance')}
							class="px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer
							{activeReportType === 'attendance'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">how_to_reg</span>
							<span>2. Laporan Kehadiran ({attendances.length})</span>
						</button>

						<button
							type="button"
							onclick={() => (activeReportType = 'assessment')}
							class="px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer
							{activeReportType === 'assessment'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">assignment_turned_in</span>
							<span>3. Laporan Asesmen ({certificates.length})</span>
						</button>

						<button
							type="button"
							onclick={() => (activeReportType = 'competency_gap')}
							class="px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer
							{activeReportType === 'competency_gap'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">troubleshoot</span>
							<span>4. Laporan GAP Kompetensi (TNA)</span>
						</button>

						<button
							type="button"
							onclick={() => (activeReportType = 'certificates')}
							class="px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer
							{activeReportType === 'certificates'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">workspace_premium</span>
							<span>5. E-Sertifikat Digital ({certificates.length})</span>
						</button>
					</div>

					<!-- REPORT 1: LAPORAN PROGRAM PELATIHAN (UNIFIED) -->
					{#if activeReportType === 'training' || activeReportType === 'course'}
						<div class="space-y-4">
							<!-- Header & Summary Metrics -->
							<div class="p-4 rounded-2xl bg-surface-container/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
								<div class="space-y-1">
									<h4 class="font-bold text-xs text-on-surface uppercase tracking-wider flex items-center gap-2">
										<span>Annual Report Pelatihan PT BCS 2026</span>
										<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/10 text-primary border border-primary/20">
											Sheet GID 1841084949 Standard
										</span>
									</h4>
									<p class="text-xs text-on-surface-variant">
										Rekapitulasi resmi Kirkpatrick 4-Level Evaluation, Matriks Level Jabatan (OPR s/d BOD), Manpower, Jam, dan Realisasi Biaya Pelatihan.
									</p>
								</div>
								<div class="flex flex-wrap items-center gap-2 text-xs font-mono">
									<span class="px-2.5 py-1.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 font-bold text-on-surface">
										Internal: <strong class="text-primary">{internalTrainingReports.length}</strong> Program
									</span>
									<span class="px-2.5 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
										Eksternal: <strong>{externalTrainingReports.length}</strong> Program
									</span>
									<span class="px-2.5 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
										Total MP: {grandTotals.totalMp} Org
									</span>
									<span class="px-2.5 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
										Total Jam: {grandTotals.totalHours} Jam
									</span>
									<span class="px-2.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
										Biaya: Rp {Number(grandTotals.totalCost).toLocaleString('id-ID')}
									</span>
								</div>
							</div>

							<!-- Toolbar Filter: Pencarian, Kategori, Divisi & Based -->
							<div class="p-3 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs">
								<div class="relative flex-1">
									<span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
									<input
										type="text"
										bind:value={reportSearchQuery}
										placeholder="Cari judul pelatihan, ID, instruktur..."
										class="w-full pl-8 pr-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none"
									/>
									{#if reportSearchQuery}
										<button type="button" onclick={() => (reportSearchQuery = '')} class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
											<span class="material-symbols-outlined text-xs">close</span>
										</button>
									{/if}
								</div>

								<div class="flex items-center gap-2 flex-wrap">
									<select
										bind:value={reportFilterCategory}
										class="px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface font-semibold"
									>
										<option value="All">Semua Kompetensi / Kategori</option>
										{#each categories.filter(c => c !== 'All') as cat}
											<option value={cat}>{cat}</option>
										{/each}
									</select>

									<select
										bind:value={reportFilterDept}
										class="px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface font-semibold"
									>
										<option value="All">Semua Divisi / Dept</option>
										{#each divisions as d}
											<option value={d.name}>{d.name}</option>
										{/each}
									</select>

									<select
										bind:value={reportFilterBased}
										class="px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface font-semibold"
									>
										<option value="All">Semua Based</option>
										<option value="Mandatory">Mandatory</option>
										<option value="Additional">Additional</option>
										<option value="Gap Competency">Gap Competency</option>
									</select>

									{#if reportSearchQuery || reportFilterCategory !== 'All' || reportFilterDept !== 'All' || reportFilterBased !== 'All'}
										<button
											type="button"
											onclick={() => {
												reportSearchQuery = '';
												reportFilterCategory = 'All';
												reportFilterDept = 'All';
												reportFilterBased = 'All';
											}}
											class="px-2.5 py-2 rounded-xl bg-surface-container-high text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
										>
											Reset
										</button>
									{/if}
								</div>
							</div>

							<!-- Tabel Komprehensif Annual Report PT BCS (2 Seksi: Internal vs External) -->
							<div class="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-xs">
								<table class="w-full text-xs text-left whitespace-nowrap">
									<thead class="bg-surface-container-high font-bold text-on-surface border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider">
										<!-- Header Tingkat 1 -->
										<tr class="divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
											<th rowspan="2" class="p-2.5 text-center w-10">No</th>
											<th rowspan="2" class="p-2.5 text-left min-w-[200px]">Training</th>
											<th rowspan="2" class="p-2.5 text-left min-w-[110px]">Competency</th>
											<th rowspan="2" class="p-2.5 text-center min-w-[95px]">Based</th>
											<th rowspan="2" class="p-2.5 text-left min-w-[130px]">Training Date</th>
											<th colspan="1" class="p-2 text-center bg-blue-500/10 text-blue-700 dark:text-blue-300">
												Reaction (L1)
											</th>
											<th colspan="4" class="p-2 text-center bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
												Learning (L2)
											</th>
											<th colspan="2" class="p-2 text-center bg-purple-500/10 text-purple-700 dark:text-purple-300">
												Behavior (L3)
											</th>
											<th colspan="2" class="p-2 text-center bg-teal-500/10 text-teal-700 dark:text-teal-300">
												Business Impact (L4)
											</th>
											<th rowspan="2" class="p-2.5 text-center min-w-[70px]">Total MP</th>
											<th rowspan="2" class="p-2.5 text-center min-w-[70px]">Total Hours</th>
											<th rowspan="2" class="p-2.5 text-right min-w-[110px]">Total Cost</th>
											<th colspan="7" class="p-2 text-center bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
												Level Matriks
											</th>
										</tr>
										<!-- Header Tingkat 2 -->
										<tr class="divide-x divide-slate-200 dark:divide-slate-800 text-[10px]">
											<!-- Reaction -->
											<th class="p-2 text-center bg-blue-500/5 text-blue-700 dark:text-blue-300 min-w-[65px]">Skor</th>
											<!-- Learning -->
											<th class="p-2 text-center bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 min-w-[65px]">Pre Test</th>
											<th class="p-2 text-center bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 min-w-[70px]">Remark</th>
											<th class="p-2 text-center bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 min-w-[65px]">Post Test</th>
											<th class="p-2 text-center bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 min-w-[85px]">Remark</th>
											<!-- Behavior -->
											<th class="p-2 text-center bg-purple-500/5 text-purple-700 dark:text-purple-300 min-w-[65px]">Skor</th>
											<th class="p-2 text-center bg-purple-500/5 text-purple-700 dark:text-purple-300 min-w-[85px]">Remark</th>
											<!-- Impact -->
											<th class="p-2 text-center bg-teal-500/5 text-teal-700 dark:text-teal-300 min-w-[65px]">Skor</th>
											<th class="p-2 text-center bg-teal-500/5 text-teal-700 dark:text-teal-300 min-w-[85px]">Remark</th>
											<!-- Matriks Level OPR s/d BOD -->
											<th class="p-2 text-center bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 w-9">OPR</th>
											<th class="p-2 text-center bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 w-9">STAFF</th>
											<th class="p-2 text-center bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 w-16">OFF/FRM/WH</th>
											<th class="p-2 text-center bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 w-9">SPV</th>
											<th class="p-2 text-center bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 w-9">MGR</th>
											<th class="p-2 text-center bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 w-9">GM</th>
											<th class="p-2 text-center bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 w-9">BOD</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-200 dark:divide-slate-800">
										<!-- ================= SEKSI 1: INTERNAL TRAINING ================= -->
										<tr class="bg-primary/5 dark:bg-primary/10 border-y-2 border-primary/30">
											<td colspan="24" class="p-2.5 font-black text-xs text-primary uppercase tracking-wider">
												<div class="flex items-center gap-2">
													<span class="material-symbols-outlined text-base">domain</span>
													<span>INTERNAL TRAINING (In-House PT BCS)</span>
													<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">
														{internalTrainingReports.length} Program
													</span>
												</div>
											</td>
										</tr>

										{#each internalTrainingReports as item, idx}
											<tr class="hover:bg-surface-container/60 transition-colors divide-x divide-slate-100 dark:divide-slate-800/60">
												<td class="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
												<td class="p-2.5">
													<p class="font-bold text-on-surface text-xs leading-snug">{item.title}</p>
													<div class="flex items-center gap-1.5 mt-0.5">
														<span class="font-mono text-[10px] text-primary">{item.id}</span>
														<span class="text-[10px] text-slate-400">• {item.trainer}</span>
													</div>
												</td>
												<td class="p-2.5">
													<span class="font-medium text-slate-700 dark:text-slate-200">{item.category}</span>
												</td>
												<td class="p-2.5 text-center">
													<span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase
														{item.based === 'Mandatory' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
														item.based === 'Additional' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
														'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'}">
														{item.based || 'Mandatory'}
													</span>
												</td>
												<td class="p-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
													{item.formattedDate}
												</td>
												<!-- Reaction -->
												<td class="p-2.5 text-center font-mono font-semibold text-blue-600 dark:text-blue-400">
													{item.reactionScore}
												</td>
												<!-- Learning -->
												<td class="p-2.5 text-center font-mono {item.preTestScore !== 'N/A' ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}">
													{item.preTestScore}
												</td>
												<td class="p-2.5 text-center text-[10px] text-slate-500">
													{item.preTestRemark}
												</td>
												<td class="p-2.5 text-center font-mono {item.postTestScore !== 'N/A' ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}">
													{item.postTestScore}
												</td>
												<td class="p-2.5 text-center">
													{#if item.postTestRemark.includes('Lulus')}
														<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
															{item.postTestRemark}
														</span>
													{:else if item.postTestRemark.includes('Remedial')}
														<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
															{item.postTestRemark}
														</span>
													{:else}
														<span class="text-[10px] text-slate-400">{item.postTestRemark}</span>
													{/if}
												</td>
												<!-- Behavior -->
												<td class="p-2.5 text-center font-mono font-semibold text-purple-600 dark:text-purple-400">
													{item.behaviorScore}
												</td>
												<td class="p-2.5 text-center">
													{#if item.behaviorRemark === 'Efektif'}
														<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
															{item.behaviorRemark}
														</span>
													{:else if item.behaviorRemark === 'Dalam Pemantauan' || item.behaviorRemark === 'Dalam Evaluasi'}
														<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
															{item.behaviorRemark}
														</span>
													{:else}
														<span class="text-[10px] text-slate-400">{item.behaviorRemark}</span>
													{/if}
												</td>
												<!-- Business Impact -->
												<td class="p-2.5 text-center font-mono font-semibold text-teal-600 dark:text-teal-400">
													{item.impactScore}
												</td>
												<td class="p-2.5 text-center">
													{#if item.impactRemark === 'Tercapai'}
														<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
															{item.impactRemark}
														</span>
													{:else if item.impactRemark === 'Dalam Observasi'}
														<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
															{item.impactRemark}
														</span>
													{:else}
														<span class="text-[10px] text-slate-400">{item.impactRemark}</span>
													{/if}
												</td>
												<!-- Manpower, Hours, Cost -->
												<td class="p-2.5 text-center font-mono font-bold text-on-surface">
													{item.totalMp}
												</td>
												<td class="p-2.5 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
													{item.totalHours}
												</td>
												<td class="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
													Rp {Number(item.totalCost).toLocaleString('id-ID')}
												</td>
												<!-- Level Matriks Checklist -->
												<td class="p-2 text-center {item.levelMatrix.opr ? 'text-emerald-600 font-bold bg-emerald-500/5' : 'text-slate-300 dark:text-slate-700'}">
													{item.levelMatrix.opr ? '✔️' : '-'}
												</td>
												<td class="p-2 text-center {item.levelMatrix.staff ? 'text-emerald-600 font-bold bg-emerald-500/5' : 'text-slate-300 dark:text-slate-700'}">
													{item.levelMatrix.staff ? '✔️' : '-'}
												</td>
												<td class="p-2 text-center {item.levelMatrix.off ? 'text-emerald-600 font-bold bg-emerald-500/5' : 'text-slate-300 dark:text-slate-700'}">
													{item.levelMatrix.off ? '✔️' : '-'}
												</td>
												<td class="p-2 text-center {item.levelMatrix.spv ? 'text-emerald-600 font-bold bg-emerald-500/5' : 'text-slate-300 dark:text-slate-700'}">
													{item.levelMatrix.spv ? '✔️' : '-'}
												</td>
												<td class="p-2 text-center {item.levelMatrix.mgr ? 'text-emerald-600 font-bold bg-emerald-500/5' : 'text-slate-300 dark:text-slate-700'}">
													{item.levelMatrix.mgr ? '✔️' : '-'}
												</td>
												<td class="p-2 text-center {item.levelMatrix.gm ? 'text-emerald-600 font-bold bg-emerald-500/5' : 'text-slate-300 dark:text-slate-700'}">
													{item.levelMatrix.gm ? '✔️' : '-'}
												</td>
												<td class="p-2 text-center {item.levelMatrix.bod ? 'text-emerald-600 font-bold bg-emerald-500/5' : 'text-slate-300 dark:text-slate-700'}">
													{item.levelMatrix.bod ? '✔️' : '-'}
												</td>
											</tr>
										{/each}

										{#if internalTrainingReports.length === 0}
											<tr>
												<td colspan="24" class="p-4 text-center text-slate-400 italic">
													Tidak ada program pelatihan internal yang cocok dengan filter.
												</td>
											</tr>
										{/if}

										<!-- Subtotal Internal Training -->
										<tr class="bg-surface-container-high font-bold border-y border-slate-200 dark:border-slate-800 text-xs">
											<td colspan="5" class="p-2.5 text-right font-black uppercase text-on-surface">TOTAL INTERNAL</td>
											<td class="p-2.5 text-center font-mono font-bold text-blue-600">{internalTotals.avgReaction}</td>
											<td class="p-2.5 text-center text-slate-400 font-mono">-</td>
											<td class="p-2.5 text-center text-slate-400">-</td>
											<td class="p-2.5 text-center font-mono font-bold text-indigo-600">{internalTotals.avgPost}</td>
											<td class="p-2.5 text-center text-slate-400">-</td>
											<td class="p-2.5 text-center font-mono font-bold text-purple-600">{internalTotals.avgL3}</td>
											<td class="p-2.5 text-center text-slate-400">-</td>
											<td class="p-2.5 text-center font-mono font-bold text-teal-600">{internalTotals.avgL4}</td>
											<td class="p-2.5 text-center text-slate-400">-</td>
											<td class="p-2.5 text-center font-mono font-bold text-on-surface">{internalTotals.totalMp}</td>
											<td class="p-2.5 text-center font-mono font-bold text-on-surface">{internalTotals.totalHours}</td>
											<td class="p-2.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
												Rp {Number(internalTotals.totalCost).toLocaleString('id-ID')}
											</td>
											<td colspan="7" class="p-2.5 text-center text-slate-400">-</td>
										</tr>

										<!-- ================= SEKSI 2: EXTERNAL TRAINING ================= -->
										<tr class="bg-amber-500/10 dark:bg-amber-500/15 border-y-2 border-amber-500/30">
											<td colspan="24" class="p-2.5 font-black text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider">
												<div class="flex items-center gap-2">
													<span class="material-symbols-outlined text-base">verified</span>
													<span>EXTERNAL TRAINING (Sertifikasi Lembaga Eksternal)</span>
													<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white">
														{externalTrainingReports.length} Program
													</span>
												</div>
											</td>
										</tr>

										{#each externalTrainingReports as item, idx}
											<tr class="hover:bg-surface-container/60 transition-colors divide-x divide-slate-100 dark:divide-slate-800/60">
												<td class="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
												<td class="p-2.5">
													<p class="font-bold text-on-surface text-xs leading-snug">{item.title}</p>
													<div class="flex items-center gap-1.5 mt-0.5">
														<span class="font-mono text-[10px] text-amber-600">{item.id}</span>
														<span class="text-[10px] text-slate-400">• {item.trainer}</span>
													</div>
												</td>
												<td class="p-2.5">
													<span class="font-medium text-slate-700 dark:text-slate-200">{item.category}</span>
												</td>
												<td class="p-2.5 text-center">
													<span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase
														{item.based === 'Mandatory' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
														item.based === 'Additional' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
														'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'}">
														{item.based || 'Additional'}
													</span>
												</td>
												<td class="p-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
													{item.formattedDate}
												</td>
												<!-- Reaction -->
												<td class="p-2.5 text-center font-mono font-semibold text-blue-600 dark:text-blue-400">
													{item.reactionScore}
												</td>
												<!-- Learning -->
												<td class="p-2.5 text-center font-mono {item.preTestScore !== 'N/A' ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}">
													{item.preTestScore}
												</td>
												<td class="p-2.5 text-center text-[10px] text-slate-500">
													{item.preTestRemark}
												</td>
												<td class="p-2.5 text-center font-mono {item.postTestScore !== 'N/A' ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}">
													{item.postTestScore}
												</td>
												<td class="p-2.5 text-center">
													{#if item.postTestRemark.includes('Lulus')}
														<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
															{item.postTestRemark}
														</span>
													{:else if item.postTestRemark.includes('Remedial')}
														<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
															{item.postTestRemark}
														</span>
													{:else}
														<span class="text-[10px] text-slate-400">{item.postTestRemark}</span>
													{/if}
												</td>
												<!-- Behavior -->
												<td class="p-2.5 text-center font-mono font-semibold text-purple-600 dark:text-purple-400">
													{item.behaviorScore}
												</td>
												<td class="p-2.5 text-center">
													{#if item.behaviorRemark === 'Efektif'}
														<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
															{item.behaviorRemark}
														</span>
													{:else if item.behaviorRemark === 'Dalam Pemantauan' || item.behaviorRemark === 'Dalam Evaluasi'}
														<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
															{item.behaviorRemark}
														</span>
													{:else}
														<span class="text-[10px] text-slate-400">{item.behaviorRemark}</span>
													{/if}
												</td>
												<!-- Business Impact -->
												<td class="p-2.5 text-center font-mono font-semibold text-teal-600 dark:text-teal-400">
													{item.impactScore}
												</td>
												<td class="p-2.5 text-center">
													{#if item.impactRemark === 'Tercapai'}
														<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
															{item.impactRemark}
														</span>
													{:else if item.impactRemark === 'Dalam Observasi'}
														<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
															{item.impactRemark}
														</span>
													{:else}
														<span class="text-[10px] text-slate-400">{item.impactRemark}</span>
													{/if}
												</td>
												<!-- Manpower, Hours, Cost -->
												<td class="p-2.5 text-center font-mono font-bold text-on-surface">
													{item.totalMp}
												</td>
												<td class="p-2.5 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
													{item.totalHours}
												</td>
												<td class="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
													Rp {Number(item.totalCost).toLocaleString('id-ID')}
												</td>
												<!-- Level Matriks Checklist -->
												<td class="p-2 text-center {item.levelMatrix.opr ? 'text-emerald-600 font-bold bg-emerald-500/5' : 'text-slate-300 dark:text-slate-700'}">
													{item.levelMatrix.opr ? '✔️' : '-'}
												</td>
												<td class="p-2 text-center {item.levelMatrix.staff ? 'text-emerald-600 font-bold bg-emerald-500/5' : 'text-slate-300 dark:text-slate-700'}">
													{item.levelMatrix.staff ? '✔️' : '-'}
												</td>
												<td class="p-2 text-center {item.levelMatrix.off ? 'text-emerald-600 font-bold bg-emerald-500/5' : 'text-slate-300 dark:text-slate-700'}">
													{item.levelMatrix.off ? '✔️' : '-'}
												</td>
												<td class="p-2 text-center {item.levelMatrix.spv ? 'text-emerald-600 font-bold bg-emerald-500/5' : 'text-slate-300 dark:text-slate-700'}">
													{item.levelMatrix.spv ? '✔️' : '-'}
												</td>
												<td class="p-2 text-center {item.levelMatrix.mgr ? 'text-emerald-600 font-bold bg-emerald-500/5' : 'text-slate-300 dark:text-slate-700'}">
													{item.levelMatrix.mgr ? '✔️' : '-'}
												</td>
												<td class="p-2 text-center {item.levelMatrix.gm ? 'text-emerald-600 font-bold bg-emerald-500/5' : 'text-slate-300 dark:text-slate-700'}">
													{item.levelMatrix.gm ? '✔️' : '-'}
												</td>
												<td class="p-2 text-center {item.levelMatrix.bod ? 'text-emerald-600 font-bold bg-emerald-500/5' : 'text-slate-300 dark:text-slate-700'}">
													{item.levelMatrix.bod ? '✔️' : '-'}
												</td>
											</tr>
										{/each}

										{#if externalTrainingReports.length === 0}
											<tr>
												<td colspan="24" class="p-4 text-center text-slate-400 italic">
													Tidak ada program pelatihan eksternal yang cocok dengan filter.
												</td>
											</tr>
										{/if}

										<!-- Subtotal External Training -->
										<tr class="bg-surface-container-high font-bold border-y border-slate-200 dark:border-slate-800 text-xs">
											<td colspan="5" class="p-2.5 text-right font-black uppercase text-on-surface">TOTAL EXTERNAL</td>
											<td class="p-2.5 text-center font-mono font-bold text-blue-600">{externalTotals.avgReaction}</td>
											<td class="p-2.5 text-center text-slate-400 font-mono">-</td>
											<td class="p-2.5 text-center text-slate-400">-</td>
											<td class="p-2.5 text-center font-mono font-bold text-indigo-600">{externalTotals.avgPost}</td>
											<td class="p-2.5 text-center text-slate-400">-</td>
											<td class="p-2.5 text-center font-mono font-bold text-purple-600">{externalTotals.avgL3}</td>
											<td class="p-2.5 text-center text-slate-400">-</td>
											<td class="p-2.5 text-center font-mono font-bold text-teal-600">{externalTotals.avgL4}</td>
											<td class="p-2.5 text-center text-slate-400">-</td>
											<td class="p-2.5 text-center font-mono font-bold text-on-surface">{externalTotals.totalMp}</td>
											<td class="p-2.5 text-center font-mono font-bold text-on-surface">{externalTotals.totalHours}</td>
											<td class="p-2.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
												Rp {Number(externalTotals.totalCost).toLocaleString('id-ID')}
											</td>
											<td colspan="7" class="p-2.5 text-center text-slate-400">-</td>
										</tr>

										<!-- ================= GRAND TOTAL ROW ================= -->
										<tr class="bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black text-xs border-t-2 border-slate-700">
											<td colspan="5" class="p-3 text-right uppercase tracking-wider">GRAND TOTAL (INTERNAL + EXTERNAL)</td>
											<td class="p-3 text-center font-mono">{grandTotals.avgReaction}</td>
											<td class="p-3 text-center text-slate-400">-</td>
											<td class="p-3 text-center text-slate-400">-</td>
											<td class="p-3 text-center font-mono">{grandTotals.avgPost}</td>
											<td class="p-3 text-center text-slate-400">-</td>
											<td class="p-3 text-center font-mono">{grandTotals.avgL3}</td>
											<td class="p-3 text-center text-slate-400">-</td>
											<td class="p-3 text-center font-mono">{grandTotals.avgL4}</td>
											<td class="p-3 text-center text-slate-400">-</td>
											<td class="p-3 text-center font-mono">{grandTotals.totalMp}</td>
											<td class="p-3 text-center font-mono">{grandTotals.totalHours}</td>
											<td class="p-3 text-right font-mono text-emerald-400 dark:text-emerald-700">
												Rp {Number(grandTotals.totalCost).toLocaleString('id-ID')}
											</td>
											<td colspan="7" class="p-3 text-center text-slate-400">-</td>
										</tr>

										{#if unifiedTrainingReports.length === 0}
											<tr>
												<td colspan="24" class="p-8 text-center text-slate-400">
													<span class="material-symbols-outlined text-4xl block mb-2 text-slate-300">search_off</span>
													<p class="font-bold">Tidak ada data program pelatihan yang cocok dengan filter.</p>
												</td>
											</tr>
										{/if}
									</tbody>
								</table>
							</div>
						</div>

					<!-- REPORT 3: ATTENDANCE REPORT -->
					{:else if activeReportType === 'attendance'}
						<div class="space-y-4">
							<div class="p-4 rounded-2xl bg-surface-container/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div class="space-y-1">
									<h4 class="font-bold text-xs text-on-surface uppercase tracking-wider">Laporan Kehadiran Peserta (Attendance Report)</h4>
									<p class="text-xs text-on-surface-variant">Data absensi kehadiran aktual peserta sesi pelatihan berdasarkan nama, jabatan, dan departemen.</p>
								</div>
								<span class="px-3 py-1 rounded-lg bg-surface-container font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
									Presensi Tercatat: {attendances.length}
								</span>
							</div>

							<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
								<table class="w-full text-xs text-left whitespace-nowrap">
									<thead class="bg-surface-container-high font-bold text-on-surface border-b border-slate-200 dark:border-slate-800">
										<tr>
											<th class="p-3">Nama Karyawan</th>
											<th class="p-3">Payroll ID</th>
											<th class="p-3">Departemen</th>
											<th class="p-3">Sesi Pelatihan</th>
											<th class="p-3">Waktu Presensi</th>
											<th class="p-3 text-center">Status Kehadiran</th>
											<th class="p-3">Catatan</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-200 dark:divide-slate-800">
										{#each attendances as a}
											<tr class="hover:bg-surface-container/50">
												<td class="p-3 font-bold text-on-surface">{a.employeeName}</td>
												<td class="p-3 font-mono text-slate-500">{a.payrollId}</td>
												<td class="p-3 text-slate-600 dark:text-slate-300">{a.department}</td>
												<td class="p-3 font-semibold text-primary">{a.sessionTitle}</td>
												<td class="p-3 font-mono text-slate-500">{a.attendedAt}</td>
												<td class="p-3 text-center">
													<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase
														{a.status === 'HADIR' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800'}">
														{a.status}
													</span>
												</td>
												<td class="p-3 text-slate-500">{a.notes || '-'}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>

					<!-- REPORT 4: ASSESSMENT REPORT -->
					{:else if activeReportType === 'assessment'}
						<div class="space-y-4">
							<div class="p-4 rounded-2xl bg-surface-container/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div class="space-y-1">
									<h4 class="font-bold text-xs text-on-surface uppercase tracking-wider">Assessment & Examination Report</h4>
									<p class="text-xs text-on-surface-variant">Rekapitulasi skor evaluasi pre-test, post-test, batas kelulusan, dan nomor sertifikat terbit.</p>
								</div>
								<span class="px-3 py-1 rounded-lg bg-surface-container font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
									Total Kelulusan: {certificates.length}
								</span>
							</div>

							<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
								<table class="w-full text-xs text-left whitespace-nowrap">
									<thead class="bg-surface-container-high font-bold text-on-surface border-b border-slate-200 dark:border-slate-800">
										<tr>
											<th class="p-3">Nama Training</th>
											<th class="p-3">Nama Peserta</th>
											<th class="p-3">Payroll ID</th>
											<th class="p-3 text-center">Skor Pre-Test</th>
											<th class="p-3 text-center">Skor Post-Test (Quiz)</th>
											<th class="p-3 text-center">Passing Grade</th>
											<th class="p-3 text-center">Status Kelulusan</th>
											<th class="p-3">No. E-Sertifikat</th>
											<th class="p-3">Tanggal Ujian</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-200 dark:divide-slate-800">
										{#each certificates as c}
											<tr class="hover:bg-surface-container/50">
												<td class="p-3 font-bold text-on-surface">{c.courseTitle}</td>
												<td class="p-3 font-semibold text-on-surface">{c.employeeName}</td>
												<td class="p-3 font-mono text-slate-500">{c.payrollId}</td>
												<td class="p-3 text-center font-mono font-bold text-slate-500">60</td>
												<td class="p-3 text-center font-mono font-black text-emerald-600 text-sm">{c.score}</td>
												<td class="p-3 text-center font-mono text-slate-500">75</td>
												<td class="p-3 text-center">
													<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
														LULUS
													</span>
												</td>
												<td class="p-3 font-mono text-primary font-bold">{c.certificateNumber}</td>
												<td class="p-3 font-mono text-slate-500">{c.issuedAt}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>

					<!-- REPORT 5: COMPETENCY GAP REPORT (TNA) -->
					{:else if activeReportType === 'competency_gap'}
						<div class="space-y-4">
							<div class="p-4 rounded-2xl bg-surface-container/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div class="space-y-1">
									<h4 class="font-bold text-xs text-on-surface uppercase tracking-wider">Laporan Kesenjangan Kompetensi (Competency Gap Report - TNA)</h4>
									<p class="text-xs text-on-surface-variant">Identifikasi selisih Required Competency vs Actual Competency untuk rekomendasi training 2026.</p>
								</div>
								<div class="flex items-center gap-2 text-xs font-mono">
									<span class="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
										Kesenjangan: {competencyGapList.filter((cg: any) => cg.gap < 0).length} Gap
									</span>
								</div>
							</div>

							<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
								<table class="w-full text-xs text-left whitespace-nowrap">
									<thead class="bg-surface-container-high font-bold text-on-surface border-b border-slate-200 dark:border-slate-800">
										<tr>
											<th class="p-3">Departemen</th>
											<th class="p-3">Jabatan Karyawan</th>
											<th class="p-3">Nama & NIK</th>
											<th class="p-3">Aspek Kompetensi</th>
											<th class="p-3">Kode & Nama Kompetensi</th>
											<th class="p-3 text-center">Req Level</th>
											<th class="p-3 text-center">Act Level</th>
											<th class="p-3 text-center">Competency Gap</th>
											<th class="p-3 text-center">Status</th>
											<th class="p-3">Rekomendasi Pelatihan (TNA Plan)</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-200 dark:divide-slate-800">
										{#each competencyGapList as cg}
											<tr class="hover:bg-surface-container/50">
												<td class="p-3 text-slate-600 dark:text-slate-300">{cg.department}</td>
												<td class="p-3 font-semibold text-on-surface">{cg.positionTitle}</td>
												<td class="p-3">
													<p class="font-bold text-on-surface">{cg.employeeName}</p>
													<p class="font-mono text-[10px] text-slate-400">{cg.payrollId}</p>
												</td>
												<td class="p-3 text-slate-500 font-medium">{cg.aspect}</td>
												<td class="p-3">
													<span class="font-mono font-bold text-primary mr-1">[{cg.competencyCode}]</span>
													<span class="font-semibold text-on-surface">{cg.competencyName}</span>
												</td>
												<td class="p-3 text-center font-mono font-bold">{cg.requiredLevel}</td>
												<td class="p-3 text-center font-mono font-bold">{cg.actualLevel}</td>
												<td class="p-3 text-center font-mono font-black text-sm
													{cg.gap < 0 ? 'text-rose-600' : 'text-emerald-600'}">
													{cg.gap > 0 ? `+${cg.gap}` : cg.gap}
												</td>
												<td class="p-3 text-center">
													<span class="px-2 py-0.5 rounded text-[10px] font-black uppercase
														{cg.status === 'Qualified' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}">
														{cg.status}
													</span>
												</td>
												<td class="p-3">
													{#if cg.recommendation !== '-'}
														<span class="font-semibold text-primary">{cg.recommendation}</span>
													{:else}
														<span class="text-slate-400">-</span>
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>

					<!-- REPORT 5: E-SERTIFIKAT DIGITAL -->
					{:else if activeReportType === 'certificates'}
						<div class="space-y-4">
							<div class="p-4 rounded-2xl bg-surface-container/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div class="space-y-1">
									<h4 class="font-bold text-xs text-on-surface uppercase tracking-wider">Rekapitulasi E-Sertifikat Digital Resmi</h4>
									<p class="text-xs text-on-surface-variant">Daftar sertifikat kelulusan ber-QR code otentikasi siap cetak A4 landscape standard BCS.</p>
								</div>
								<span class="px-3 py-1 rounded-lg bg-surface-container font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
									Sertifikat: {certificates.length} Lembar
								</span>
							</div>

							<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
								<table class="w-full text-xs text-left">
									<thead class="bg-surface-container-high font-bold text-on-surface border-b border-slate-200 dark:border-slate-800">
										<tr>
											<th class="p-3">No. Sertifikat</th>
											<th class="p-3">Nama Karyawan</th>
											<th class="p-3">Program Pelatihan</th>
											<th class="p-3">Kategori</th>
											<th class="p-3 text-center">Nilai Ujian</th>
											<th class="p-3">Tanggal Terbit</th>
											<th class="p-3">Masa Berlaku (1 Thn)</th>
											<th class="p-3 text-right">Aksi Dokumen</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-200 dark:divide-slate-800">
										{#each certificates as cert}
											{@const val = getCertificateValidity(cert)}
											<tr class="hover:bg-surface-container/50">
												<td class="p-3 font-mono font-bold text-primary">{cert.certificateNumber}</td>
												<td class="p-3">
													<p class="font-bold text-on-surface">{cert.employeeName}</p>
													<p class="font-mono text-[10px] text-slate-500">{cert.payrollId}</p>
												</td>
												<td class="p-3 font-semibold text-on-surface">{cert.courseTitle}</td>
												<td class="p-3 text-slate-500">{cert.category}</td>
												<td class="p-3 text-center font-bold text-emerald-600 font-mono text-sm">{cert.score}</td>
												<td class="p-3 font-mono text-slate-500">{cert.issuedAt}</td>
												<td class="p-3">
													<div class="space-y-0.5">
														<p class="font-mono text-[11px] font-semibold text-on-surface">s/d {val.validUntilFormatted}</p>
														<span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 {val.isExpired ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'}">
															<span class="w-1.5 h-1.5 rounded-full {val.isExpired ? 'bg-rose-500' : 'bg-emerald-500'}"></span>
															<span>{val.isExpired ? 'Kadaluarsa' : 'Aktif (1 Tahun)'}</span>
														</span>
													</div>
												</td>
												<td class="p-3 text-right">
													<button
														type="button"
														onclick={() => openCertificate(cert)}
														class="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
													>
														<span class="material-symbols-outlined text-sm">workspace_premium</span>
														<span>Lihat Sertifikat</span>
													</button>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 1: SEQUENTIAL COURSE PLAYER (Pre-Test -> Modules -> Post-Test)    -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isPlayerModalOpen && activeCourseForPlayer}
	<div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
			<!-- Header -->
			<div class="p-4 border-b border-slate-200 dark:border-slate-800 bg-surface-container flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
						<span class="material-symbols-outlined text-xl">play_lesson</span>
					</div>
					<div>
						<h3 class="font-black text-sm text-on-surface">{activeCourseForPlayer.title}</h3>
						<p class="text-xs text-on-surface-variant">Instruktur: {activeCourseForPlayer.instructor} • Passing Grade: {activeCourseForPlayer.passingGrade}</p>
					</div>
				</div>

				<button
					type="button"
					onclick={() => (isPlayerModalOpen = false)}
					class="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
				>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Sequential Progress Bar -->
			<div class="grid grid-cols-5 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold bg-surface-container-high/40">
				<div class="p-2.5 text-center flex items-center justify-center gap-1.5 border-r border-slate-200 dark:border-slate-800
					{playerStep === 1 ? 'bg-primary text-on-primary font-black' : (playerStep > 1 || isOfflineAttendedCourse) ? 'text-emerald-600' : 'text-slate-400'}">
					<span class="material-symbols-outlined text-xs">{(playerStep > 1 || isOfflineAttendedCourse) ? 'check_circle' : 'looks_one'}</span>
					<span>{isOfflineAttendedCourse ? '1. Pre-Test (Kelas)' : '1. Pre-Test'}</span>
				</div>

				<div class="p-2.5 text-center flex items-center justify-center gap-1.5 border-r border-slate-200 dark:border-slate-800
					{playerStep === 2 ? 'bg-primary text-on-primary font-black' : (playerStep > 2 || isOfflineAttendedCourse) ? 'text-emerald-600' : 'text-slate-400'}">
					<span class="material-symbols-outlined text-xs">{(playerStep > 2 || isOfflineAttendedCourse) ? 'check_circle' : 'looks_two'}</span>
					<span>{isOfflineAttendedCourse ? '2. Modul (Kelas)' : '2. Modul Materi'}</span>
				</div>

				<div class="p-2.5 text-center flex items-center justify-center gap-1.5 border-r border-slate-200 dark:border-slate-800
					{playerStep === 3 ? 'bg-primary text-on-primary font-black' : (playerStep > 3 || isOfflineAttendedCourse) ? 'text-emerald-600' : 'text-slate-400'}">
					<span class="material-symbols-outlined text-xs">{(playerStep > 3 || isOfflineAttendedCourse) ? 'check_circle' : 'looks_3'}</span>
					<span>{isOfflineAttendedCourse ? '3. Post-Test (Kelas)' : '3. Post-Test'}</span>
				</div>

				<div class="p-2.5 text-center flex items-center justify-center gap-1.5 border-r border-slate-200 dark:border-slate-800
					{playerStep === 4 ? 'bg-primary text-on-primary font-black' : playerStep > 4 ? 'text-emerald-600' : 'text-slate-400'}">
					<span class="material-symbols-outlined text-xs">{playerStep > 4 ? 'check_circle' : 'looks_4'}</span>
					<span>4. Evaluasi Lvl 1</span>
				</div>

				<div class="p-2.5 text-center flex items-center justify-center gap-1.5
					{playerStep === 5 ? 'bg-emerald-600 text-white font-black' : 'text-slate-400'}">
					<span class="material-symbols-outlined text-xs">workspace_premium</span>
					<span>5. E-Sertifikat</span>
				</div>
			</div>

			<!-- Player Content Body -->
			<div class="flex-1 overflow-y-auto p-6">
				<!-- STEP 1: PRE-TEST -->
				{#if playerStep === 1}
					<div class="max-w-2xl mx-auto space-y-6">
						<div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
							<h4 class="font-black text-sm text-on-surface">Langkah 1: Pre-Test Wajib</h4>
							<p class="text-xs text-on-surface-variant mt-1 leading-relaxed">
								Kerjakan soal pre-test di bawah ini untuk mengukur pemahaman awal Anda sebelum materi kursus dibuka.
							</p>
						</div>

						<div class="space-y-4">
							{#each activePreTestQuestions as q, idx}
								<div class="p-4 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 space-y-3">
									<div class="flex items-start justify-between gap-2">
										<p class="font-bold text-sm text-on-surface">{idx + 1}. {q.questionText}</p>
										<span class="text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap {q.questionType === 'ESSAY' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-primary/10 text-primary'}">
											{q.questionType === 'ESSAY' ? 'Essay / Uraian' : 'Pilihan Ganda'}
										</span>
									</div>
									{#if q.questionType === 'ESSAY'}
										<div>
											<textarea
												bind:value={preTestAnswered[q.id]}
												rows="3"
												placeholder="Tuliskan uraian jawaban Anda di sini..."
												class="w-full p-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none"
											></textarea>
										</div>
									{:else}
										<div class="space-y-2">
											{#each q.options as opt}
												<label class="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-surface-container-high cursor-pointer">
													<input
														type="radio"
														name={`pre_${q.id}`}
														value={opt.key}
														bind:group={preTestAnswered[q.id]}
														class="text-primary focus:ring-primary"
													/>
													<span class="text-xs text-on-surface"><strong>{opt.key}.</strong> {opt.text}</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>

						<div class="flex justify-end pt-3">
							<button
								type="button"
								onclick={handlePreTestSubmit}
								class="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md hover:bg-primary/90 transition-all cursor-pointer"
							>
								Submit Pre-Test & Buka Modul Materi
							</button>
						</div>
					</div>

				<!-- STEP 2: MATERI MODUL -->
				{:else if playerStep === 2}
					{@const currentModule = activeCourseForPlayer.modules?.[activeModuleIndex] || { title: 'Materi Modul', type: 'VIDEO', contentBody: 'Materi pembelajaran.' }}
					<div class="grid grid-cols-1 md:grid-cols-4 gap-6 h-full">
						<!-- Sidebar Daftar Modul -->
						<div class="space-y-2 border-r border-slate-200 dark:border-slate-800 pr-4">
							<p class="text-xs font-black uppercase tracking-wider text-slate-500">Daftar Modul Kursus</p>
							{#each activeCourseForPlayer.modules || [] as mod, idx}
								<button
									type="button"
									onclick={() => (activeModuleIndex = idx)}
									class="w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer
									{activeModuleIndex === idx
										? 'bg-primary text-on-primary font-bold shadow-xs'
										: idx < activeModuleIndex
										? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
										: 'bg-surface-container text-on-surface-variant'}"
								>
									<span class="truncate">{idx + 1}. {mod.title}</span>
									<span class="material-symbols-outlined text-xs">{idx < activeModuleIndex ? 'check_circle' : 'play_arrow'}</span>
								</button>
							{/each}
						</div>

						<!-- Main Media Viewer -->
						<div class="md:col-span-3 flex flex-col justify-between space-y-4">
							<div class="space-y-4">
								<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
									<div>
										<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
											{currentModule.type}
										</span>
										<h4 class="font-black text-base text-on-surface mt-1">{currentModule.title}</h4>
									</div>
									<span class="text-xs text-slate-500">{currentModule.durationText}</span>
								</div>

								<!-- Player Window / Embedded Iframe Viewer -->
								{#if currentModule.contentUrl}
									{@const embedSrc = formatEmbedUrl(currentModule.contentUrl)}
									{@const platform = detectEmbedPlatform(currentModule.contentUrl)}
									<div class="space-y-3">
										<div class="flex items-center justify-between text-xs px-1">
											<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold">
												<span class="material-symbols-outlined text-sm">{platform.icon}</span>
												<span>{platform.name}</span>
											</span>
											<a
												href={currentModule.contentUrl}
												target="_blank"
												rel="noreferrer"
												class="text-primary hover:underline font-semibold flex items-center gap-1 text-[11px]"
											>
												<span>Buka di Tab Baru</span>
												<span class="material-symbols-outlined text-xs">open_in_new</span>
											</a>
										</div>
										<div class="w-full h-80 md:h-[420px] rounded-2xl overflow-hidden bg-black/5 dark:bg-black/30 border border-slate-200 dark:border-slate-800 shadow-inner">
											<iframe
												src={embedSrc}
												title={currentModule.title}
												class="w-full h-full border-0"
												allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
												allowfullscreen
											></iframe>
										</div>
										{#if currentModule.contentBody}
											<div class="p-3.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
												{currentModule.contentBody}
											</div>
										{/if}
									</div>
								{:else if currentModule.type === 'VIDEO'}
									<div class="w-full h-72 rounded-2xl bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden shadow-inner">
										<span class="material-symbols-outlined text-6xl text-primary animate-pulse">play_circle</span>
										<p class="font-bold text-sm mt-2">Video Pembelajaran Aktif</p>
										<p class="text-xs text-slate-400">Tekan play untuk menyaksikan materi dan penjelasan instruktur</p>
									</div>
								{:else}
									<div class="p-6 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 space-y-3">
										<div class="flex items-center gap-2 text-primary font-bold text-xs">
											<span class="material-symbols-outlined text-sm">description</span>
											<span>Dokumen SOP / Panduan Standar Operasional</span>
										</div>
										<p class="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">{currentModule.contentBody}</p>
									</div>
								{/if}
							</div>

							<div class="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
								<span class="text-xs text-slate-500">
									Modul {activeModuleIndex + 1} dari {activeCourseForPlayer.modules?.length || 1}
								</span>

								<button
									type="button"
									onclick={nextModule}
									class="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-xs cursor-pointer"
								>
									<span>{activeModuleIndex < (activeCourseForPlayer.modules?.length || 1) - 1 ? 'Lanjut ke Modul Berikutnya' : 'Selesai Modul & Buka Post-Test'}</span>
									<span class="material-symbols-outlined text-xs">arrow_forward</span>
								</button>
							</div>
						</div>
					</div>

				<!-- STEP 3: POST-TEST -->
				{:else if playerStep === 3}
					<div class="max-w-2xl mx-auto space-y-6">
						<div class="p-4 rounded-2xl bg-primary/10 border border-primary/30">
							<h4 class="font-black text-sm text-on-surface">Langkah 3: Post-Test Kelulusan</h4>
							<p class="text-xs text-on-surface-variant mt-1 leading-relaxed">
								Selesaikan pertanyaan post-test di bawah ini. Passing Grade kelulusan kursus ini adalah <strong>{activeCourseForPlayer.passingGrade}</strong>.
							</p>
						</div>

						<div class="space-y-4">
							{#each activePostTestQuestions as q, idx}
								<div class="p-4 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 space-y-3">
									<div class="flex items-start justify-between gap-2">
										<p class="font-bold text-sm text-on-surface">{idx + 1}. {q.questionText}</p>
										<span class="text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap {q.questionType === 'ESSAY' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-primary/10 text-primary'}">
											{q.questionType === 'ESSAY' ? 'Essay / Uraian' : 'Pilihan Ganda'}
										</span>
									</div>
									{#if q.questionType === 'ESSAY'}
										<div>
											<textarea
												bind:value={postTestAnswered[q.id]}
												rows="3"
												placeholder="Tuliskan uraian jawaban Anda di sini..."
												class="w-full p-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none"
											></textarea>
										</div>
									{:else}
										<div class="space-y-2">
											{#each q.options as opt}
												<label class="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-surface-container-high cursor-pointer">
													<input
														type="radio"
														name={`post_${q.id}`}
														value={opt.key}
														bind:group={postTestAnswered[q.id]}
														class="text-primary focus:ring-primary cursor-pointer"
													/>
													<span class="text-xs text-on-surface"><strong>{opt.key}.</strong> {opt.text}</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>

						<div class="flex justify-end pt-3">
							<button
								type="button"
								onclick={handleLocalPostTestSubmit}
								class="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-500 transition-all cursor-pointer"
							>
								Submit Jawaban & Nilai Kelulusan
							</button>
						</div>
					</div>

				<!-- STEP 4: EVALUASI LEVEL 1 (REACTION) -->
				{:else if playerStep === 4}
					<div class="max-w-3xl mx-auto space-y-6">
						{#if isOfflineAttendedCourse}
							<!-- Banner Khusus Kelas Tatap Muka -->
							<div class="p-5 rounded-3xl bg-linear-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
								<div class="flex items-center gap-3.5">
									<div class="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
										<span class="material-symbols-outlined text-2xl">co_present</span>
									</div>
									<div>
										<div class="flex items-center gap-2">
											<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">Tatap Muka Selesai Dihadiri</span>
											<span class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
												<span class="material-symbols-outlined text-xs">check_circle</span>
												Presensi Kelas HADIR
											</span>
										</div>
										<h4 class="font-black text-sm text-on-surface mt-1">Evaluasi Reaksi Pelatihan Tatap Muka</h4>
										<p class="text-xs text-on-surface-variant mt-0.5">
											Pelatihan tatap muka Anda telah selesai dihadiri di kelas. Silakan lengkapi 18 butir Evaluasi Level 1 berikut untuk langsung mengunduh E-Sertifikat resmi Anda.
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Kelengkapan Form</span>
									<div class="flex items-center gap-2 mt-0.5">
										<div class="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
											<div class="h-full bg-emerald-500 transition-all duration-300" style="width: {(evalL1FilledCount / 18) * 100}%"></div>
										</div>
										<span class="font-mono text-xs font-black {isEvalL1Complete ? 'text-emerald-500' : 'text-amber-500'}">
											{evalL1FilledCount}/18
										</span>
									</div>
								</div>
							</div>
						{:else}
							<!-- Banner Lulus Post-Test & Status Gate (Online) -->
							<div class="p-5 rounded-3xl bg-linear-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
								<div class="flex items-center gap-3.5">
									<div class="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
										<span class="material-symbols-outlined text-2xl">workspace_premium</span>
									</div>
									<div>
										<h4 class="font-black text-sm text-on-surface">Selamat! Anda LULUS Post-Test ({postTestResult?.score || 90}/100)</h4>
										<p class="text-xs text-on-surface-variant mt-0.5">
											Langkah Terakhir: Lengkapi 18 butir Evaluasi Reaksi (Kirkpatrick Level 1) untuk menerbitkan E-Sertifikat resmi Anda.
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Kelengkapan Form</span>
									<div class="flex items-center gap-2 mt-0.5">
										<div class="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
											<div class="h-full bg-emerald-500 transition-all duration-300" style="width: {(evalL1FilledCount / 18) * 100}%"></div>
										</div>
										<span class="font-mono text-xs font-black {isEvalL1Complete ? 'text-emerald-500' : 'text-amber-500'}">
											{evalL1FilledCount}/18
										</span>
									</div>
								</div>
							</div>
						{/if}

						<form
							method="POST"
							action="?/submitEvaluationL1"
							use:enhance={() => {
								isSubmittingEvalL1 = true;
								return async ({ result, update }) => {
									isSubmittingEvalL1 = false;
									if (result.type === 'success') {
										spawnToast({
											id: Date.now().toString(),
											title: 'Evaluasi Berhasil Disimpan',
											message: (result.data as any)?.message || 'E-Sertifikat resmi Anda telah diterbitkan!',
											type: 'INFO',
											timestamp: new Date().toISOString()
										});
										playerStep = 5;
									} else {
										spawnToast({
											id: Date.now().toString(),
											title: 'Gagal Menyimpan Evaluasi',
											message: (result as any).data?.message || 'Terjadi kesalahan sistem.',
											type: 'WARNING',
											timestamp: new Date().toISOString()
										});
									}
									await update();
								};
							}}
							class="space-y-6"
						>
							<input type="hidden" name="courseId" value={activeCourseForPlayer?.id || ''} />
							<input type="hidden" name="payrollId" value={currentUser?.payrollId || 'EMP-0042'} />
							<input type="hidden" name="employeeName" value={currentUser?.name || 'GUNTORO MUHAMAD'} />
							<input
								type="hidden"
								name="deliveryMethod"
								value={isOfflineAttendedCourse ? 'Offline' : (activeCourseForPlayer?.sessionType || activeCourseForPlayer?.category?.toLowerCase().includes('in-house') || activeCourseForPlayer?.category?.toLowerCase().includes('offline')) ? 'Offline' : 'Online'}
							/>
							<input type="hidden" name="materialScore" value={evalL1MaterialAvg} />
							<input type="hidden" name="instructorScore" value={evalL1InstructorAvg} />
							<input type="hidden" name="facilityScore" value={evalL1FacilityAvg} />
							<input type="hidden" name="overallScore" value={evalL1OverallAvg} />
							<input type="hidden" name="appliedBenefit" value={evalL1State.appliedBenefit} />
							<input type="hidden" name="impressions" value={evalL1State.impressions} />
							<input type="hidden" name="suggestions" value={evalL1State.suggestions} />
							<input type="hidden" name="answers" value={JSON.stringify(evalL1State)} />

							<!-- 1. BAGIAN 1: PROGRAM & MATERI PELATIHAN -->
							<div class="p-5 rounded-3xl bg-surface-container border border-slate-200/70 dark:border-slate-800/70 space-y-4">
								<div class="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
									<div class="flex items-center gap-2.5">
										<div class="w-7 h-7 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center text-xs font-black">1</div>
										<div>
											<h5 class="font-black text-xs uppercase tracking-wider text-on-surface">Program & Materi Pelatihan</h5>
											<p class="text-[11px] text-on-surface-variant">Feedback terhadap materi dan sistematika pelatihan</p>
										</div>
									</div>
									<span class="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-blue-500/10 text-blue-500">
										Rata-rata: {evalL1MaterialAvg} / 5
									</span>
								</div>

								<div class="space-y-3.5 text-xs">
									<!-- P1 -->
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-700/50">
										<span class="text-on-surface font-semibold flex-1">1. Materi pelatihan sudah tersistematika dengan baik</span>
										<div class="flex items-center gap-1.5 shrink-0">
											{#each [1, 2, 3, 4, 5] as num}
												<button
													type="button"
													onclick={() => (evalL1State.q1_systematic = num)}
													class="w-8 h-8 rounded-xl font-bold transition-all border cursor-pointer text-xs
													{evalL1State.q1_systematic === num ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-surface-container text-on-surface border-slate-200 dark:border-slate-700 hover:border-blue-400'}"
												>
													{num}
												</button>
											{/each}
										</div>
									</div>

									<!-- P2 -->
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-700/50">
										<span class="text-on-surface font-semibold flex-1">2. Kelengkapan materi yang diberikan</span>
										<div class="flex items-center gap-1.5 shrink-0">
											{#each [1, 2, 3, 4, 5] as num}
												<button
													type="button"
													onclick={() => (evalL1State.q2_completeness = num)}
													class="w-8 h-8 rounded-xl font-bold transition-all border cursor-pointer text-xs
													{evalL1State.q2_completeness === num ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-surface-container text-on-surface border-slate-200 dark:border-slate-700 hover:border-blue-400'}"
												>
													{num}
												</button>
											{/each}
										</div>
									</div>

									<!-- P3 -->
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-700/50">
										<span class="text-on-surface font-semibold flex-1">3. Manfaat / kesesuaian materi dengan kebutuhan tugas sehari-hari</span>
										<div class="flex items-center gap-1.5 shrink-0">
											{#each [1, 2, 3, 4, 5] as num}
												<button
													type="button"
													onclick={() => (evalL1State.q3_relevance = num)}
													class="w-8 h-8 rounded-xl font-bold transition-all border cursor-pointer text-xs
													{evalL1State.q3_relevance === num ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-surface-container text-on-surface border-slate-200 dark:border-slate-700 hover:border-blue-400'}"
												>
													{num}
												</button>
											{/each}
										</div>
									</div>

									<!-- P4 -->
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-700/50">
										<span class="text-on-surface font-semibold flex-1">4. Durasi (lama waktu) dari penyelenggaraan pelatihan</span>
										<div class="flex items-center gap-1.5 shrink-0">
											{#each [1, 2, 3, 4, 5] as num}
												<button
													type="button"
													onclick={() => (evalL1State.q4_duration = num)}
													class="w-8 h-8 rounded-xl font-bold transition-all border cursor-pointer text-xs
													{evalL1State.q4_duration === num ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-surface-container text-on-surface border-slate-200 dark:border-slate-700 hover:border-blue-400'}"
												>
													{num}
												</button>
											{/each}
										</div>
									</div>

									<!-- P5 -->
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-700/50">
										<span class="text-on-surface font-semibold flex-1">5. Tambahan pengetahuan selama mengikuti pelatihan</span>
										<div class="flex items-center gap-1.5 shrink-0">
											{#each [1, 2, 3, 4, 5] as num}
												<button
													type="button"
													onclick={() => (evalL1State.q5_knowledge_gain = num)}
													class="w-8 h-8 rounded-xl font-bold transition-all border cursor-pointer text-xs
													{evalL1State.q5_knowledge_gain === num ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-surface-container text-on-surface border-slate-200 dark:border-slate-700 hover:border-blue-400'}"
												>
													{num}
												</button>
											{/each}
										</div>
									</div>
								</div>
							</div>

							<!-- 2. BAGIAN 2: INSTRUKTUR / TRAINER -->
							<div class="p-5 rounded-3xl bg-surface-container border border-slate-200/70 dark:border-slate-800/70 space-y-4">
								<div class="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
									<div class="flex items-center gap-2.5">
										<div class="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center text-xs font-black">2</div>
										<div>
											<h5 class="font-black text-xs uppercase tracking-wider text-on-surface">Instruktur / Trainer / Fasilitator</h5>
											<p class="text-[11px] text-on-surface-variant">Feedback terhadap kompetensi dan cara pengajaran instruktur</p>
										</div>
									</div>
									<span class="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-purple-500/10 text-purple-500">
										Rata-rata: {evalL1InstructorAvg} / 5
									</span>
								</div>

								<div class="space-y-3.5 text-xs">
									<!-- P6 -->
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-700/50">
										<span class="text-on-surface font-semibold flex-1">6. Penguasaan materi training oleh instruktur</span>
										<div class="flex items-center gap-1.5 shrink-0">
											{#each [1, 2, 3, 4, 5] as num}
												<button
													type="button"
													onclick={() => (evalL1State.q6_mastery = num)}
													class="w-8 h-8 rounded-xl font-bold transition-all border cursor-pointer text-xs
													{evalL1State.q6_mastery === num ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-surface-container text-on-surface border-slate-200 dark:border-slate-700 hover:border-purple-400'}"
												>
													{num}
												</button>
											{/each}
										</div>
									</div>

									<!-- P7 -->
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-700/50">
										<span class="text-on-surface font-semibold flex-1">7. Cara penyampaian / metode menyampaikan materi</span>
										<div class="flex items-center gap-1.5 shrink-0">
											{#each [1, 2, 3, 4, 5] as num}
												<button
													type="button"
													onclick={() => (evalL1State.q7_delivery = num)}
													class="w-8 h-8 rounded-xl font-bold transition-all border cursor-pointer text-xs
													{evalL1State.q7_delivery === num ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-surface-container text-on-surface border-slate-200 dark:border-slate-700 hover:border-purple-400'}"
												>
													{num}
												</button>
											{/each}
										</div>
									</div>

									<!-- P8 -->
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-700/50">
										<span class="text-on-surface font-semibold flex-1">8. Kemampuan membangkitkan partisipasi dan keaktifan peserta</span>
										<div class="flex items-center gap-1.5 shrink-0">
											{#each [1, 2, 3, 4, 5] as num}
												<button
													type="button"
													onclick={() => (evalL1State.q8_engagement = num)}
													class="w-8 h-8 rounded-xl font-bold transition-all border cursor-pointer text-xs
													{evalL1State.q8_engagement === num ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-surface-container text-on-surface border-slate-200 dark:border-slate-700 hover:border-purple-400'}"
												>
													{num}
												</button>
											{/each}
										</div>
									</div>

									<!-- P9 -->
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-700/50">
										<span class="text-on-surface font-semibold flex-1">9. Kemampuan dan ketepatan dalam menjawab pertanyaan peserta</span>
										<div class="flex items-center gap-1.5 shrink-0">
											{#each [1, 2, 3, 4, 5] as num}
												<button
													type="button"
													onclick={() => (evalL1State.q9_qa = num)}
													class="w-8 h-8 rounded-xl font-bold transition-all border cursor-pointer text-xs
													{evalL1State.q9_qa === num ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-surface-container text-on-surface border-slate-200 dark:border-slate-700 hover:border-purple-400'}"
												>
													{num}
												</button>
											{/each}
										</div>
									</div>
								</div>
							</div>

							<!-- 3. BAGIAN 3: SARANA, PRASARANA & FASILITAS -->
							<div class="p-5 rounded-3xl bg-surface-container border border-slate-200/70 dark:border-slate-800/70 space-y-4">
								<div class="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
									<div class="flex items-center gap-2.5">
										<div class="w-7 h-7 rounded-xl bg-teal-500/15 text-teal-500 flex items-center justify-center text-xs font-black">3</div>
										<div>
											<h5 class="font-black text-xs uppercase tracking-wider text-on-surface">Sarana, Prasarana & Fasilitas Training</h5>
											<p class="text-[11px] text-on-surface-variant">Feedback terhadap media, kenyamanan, dan pelayanan operasional</p>
										</div>
									</div>
									<span class="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-teal-500/10 text-teal-500">
										Rata-rata: {evalL1FacilityAvg} / 5
									</span>
								</div>

								<div class="space-y-3.5 text-xs">
									<!-- P10 -->
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-700/50">
										<span class="text-on-surface font-semibold flex-1">
											10. Tempat pelaksanaan pelatihan / Kenyamanan antarmuka LMS
										</span>
										<div class="flex items-center gap-1.5 shrink-0">
											{#each [1, 2, 3, 4, 5] as num}
												<button
													type="button"
													onclick={() => (evalL1State.q10_venue = num)}
													class="w-8 h-8 rounded-xl font-bold transition-all border cursor-pointer text-xs
													{evalL1State.q10_venue === num ? 'bg-teal-600 text-white border-teal-600 shadow-xs' : 'bg-surface-container text-on-surface border-slate-200 dark:border-slate-700 hover:border-teal-400'}"
												>
													{num}
												</button>
											{/each}
										</div>
									</div>

									<!-- P11 -->
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-700/50">
										<span class="text-on-surface font-semibold flex-1">
											11. Alat, peralatan praktikum, atau media pembelajaran yang digunakan
										</span>
										<div class="flex items-center gap-1.5 shrink-0">
											{#each [1, 2, 3, 4, 5] as num}
												<button
													type="button"
													onclick={() => (evalL1State.q11_tools = num)}
													class="w-8 h-8 rounded-xl font-bold transition-all border cursor-pointer text-xs
													{evalL1State.q11_tools === num ? 'bg-teal-600 text-white border-teal-600 shadow-xs' : 'bg-surface-container text-on-surface border-slate-200 dark:border-slate-700 hover:border-teal-400'}"
												>
													{num}
												</button>
											{/each}
										</div>
									</div>

									<!-- P12 -->
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-700/50">
										<span class="text-on-surface font-semibold flex-1">
											12. Konsumsi makanan/minuman (Tatap Muka) atau Kualitas Audio/Video (Online)
										</span>
										<div class="flex items-center gap-1.5 shrink-0">
											{#each [1, 2, 3, 4, 5] as num}
												<button
													type="button"
													onclick={() => (evalL1State.q12_refreshment = num)}
													class="w-8 h-8 rounded-xl font-bold transition-all border cursor-pointer text-xs
													{evalL1State.q12_refreshment === num ? 'bg-teal-600 text-white border-teal-600 shadow-xs' : 'bg-surface-container text-on-surface border-slate-200 dark:border-slate-700 hover:border-teal-400'}"
												>
													{num}
												</button>
											{/each}
										</div>
									</div>

									<!-- P13 -->
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-700/50">
										<span class="text-on-surface font-semibold flex-1">
											13. Kebersihan ruang fasilitas (Offline) atau Kemudahan akses navigasi platform (Online)
										</span>
										<div class="flex items-center gap-1.5 shrink-0">
											{#each [1, 2, 3, 4, 5] as num}
												<button
													type="button"
													onclick={() => (evalL1State.q13_cleanliness = num)}
													class="w-8 h-8 rounded-xl font-bold transition-all border cursor-pointer text-xs
													{evalL1State.q13_cleanliness === num ? 'bg-teal-600 text-white border-teal-600 shadow-xs' : 'bg-surface-container text-on-surface border-slate-200 dark:border-slate-700 hover:border-teal-400'}"
												>
													{num}
												</button>
											{/each}
										</div>
									</div>

									<!-- P14 -->
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-700/50">
										<span class="text-on-surface font-semibold flex-1">
											14. Pelayanan personil / panitia & dukungan teknis yang diberikan
										</span>
										<div class="flex items-center gap-1.5 shrink-0">
											{#each [1, 2, 3, 4, 5] as num}
												<button
													type="button"
													onclick={() => (evalL1State.q14_committee = num)}
													class="w-8 h-8 rounded-xl font-bold transition-all border cursor-pointer text-xs
													{evalL1State.q14_committee === num ? 'bg-teal-600 text-white border-teal-600 shadow-xs' : 'bg-surface-container text-on-surface border-slate-200 dark:border-slate-700 hover:border-teal-400'}"
												>
													{num}
												</button>
											{/each}
										</div>
									</div>

									<!-- P15 -->
									<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-700/50">
										<span class="text-on-surface font-semibold flex-1">
											15. Tata tertib & peraturan yang diberlakukan selama pelatihan
										</span>
										<div class="flex items-center gap-1.5 shrink-0">
											{#each [1, 2, 3, 4, 5] as num}
												<button
													type="button"
													onclick={() => (evalL1State.q15_discipline = num)}
													class="w-8 h-8 rounded-xl font-bold transition-all border cursor-pointer text-xs
													{evalL1State.q15_discipline === num ? 'bg-teal-600 text-white border-teal-600 shadow-xs' : 'bg-surface-container text-on-surface border-slate-200 dark:border-slate-700 hover:border-teal-400'}"
												>
													{num}
												</button>
											{/each}
										</div>
									</div>
								</div>
							</div>

							<!-- 4. BAGIAN 4: ISIAN SINGKAT / URAIAN KUALITATIF -->
							<div class="p-5 rounded-3xl bg-surface-container border border-slate-200/70 dark:border-slate-800/70 space-y-4">
								<div class="flex items-center gap-2.5 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
									<div class="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center text-xs font-black">4</div>
									<div>
										<h5 class="font-black text-xs uppercase tracking-wider text-on-surface">Uraian Kualitatif & Rencana Aksi (Wajib)</h5>
										<p class="text-[11px] text-on-surface-variant">Tuliskan pengalaman nyata dan rencana penerapan di tempat kerja</p>
									</div>
								</div>

								<div class="space-y-4 text-xs">
									<!-- P16 -->
									<div class="space-y-1.5">
										<label class="font-bold text-on-surface block">
											16. Manfaat/Sistem/Metode/Hal apa yang menurut Anda dapat diterapkan di perusahaan? *
										</label>
										<textarea
											bind:value={evalL1State.appliedBenefit}
											rows="2"
											placeholder="Contoh: Penerapan checklist inspeksi ban harian, SOP penanganan komplain logistik..."
											class="w-full p-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary"
										></textarea>
									</div>

									<!-- P17 -->
									<div class="space-y-1.5">
										<label class="font-bold text-on-surface block">
											17. Kesan selama mengikuti pelatihan *
										</label>
										<textarea
											bind:value={evalL1State.impressions}
											rows="2"
											placeholder="Tuliskan kesan Anda mengenai materi, interaksi, atau pengalaman belajar..."
											class="w-full p-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary"
										></textarea>
									</div>

									<!-- P18 -->
									<div class="space-y-1.5">
										<label class="font-bold text-on-surface block">
											18. Saran dan masukan perbaikan ke depan *
										</label>
										<textarea
											bind:value={evalL1State.suggestions}
											rows="2"
											placeholder="Tuliskan saran untuk penyelenggaraan pelatihan berikutnya..."
											class="w-full p-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary"
										></textarea>
									</div>
								</div>
							</div>

							<!-- SUBMIT BUTTON MANDATORY GATE -->
							<div class="pt-2">
								<button
									type="submit"
									disabled={!isEvalL1Complete || isSubmittingEvalL1}
									class="w-full py-3.5 px-6 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer
									{isEvalL1Complete ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-99' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}"
								>
									{#if isSubmittingEvalL1}
										<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
										<span>Menyimpan Evaluasi...</span>
									{:else if isEvalL1Complete}
										<span class="material-symbols-outlined text-base">workspace_premium</span>
										<span>Simpan Evaluasi & Terbitkan E-Sertifikat Resmi</span>
									{:else}
										<span class="material-symbols-outlined text-base">lock</span>
										<span>Lengkapi Semua Butir ({evalL1FilledCount}/18 Terisi, Sisa {18 - evalL1FilledCount} Lagi)</span>
									{/if}
								</button>
							</div>
						</form>
					</div>

				<!-- STEP 5: SELESAI / E-SERTIFIKAT -->
				{:else if playerStep === 5}
					<div class="max-w-md mx-auto text-center space-y-5 py-8">
						<div class="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto">
							<span class="material-symbols-outlined text-4xl">workspace_premium</span>
						</div>

						<div class="space-y-1">
							<h3 class="font-black text-xl text-on-surface">Kursus Selesai & Terakreditasi!</h3>
							<p class="text-xs text-on-surface-variant leading-relaxed">
								Selamat kepada <strong>{currentUser?.name || 'GUNTORO MUHAMAD'}</strong> atas keberhasilan menyelesaikan kursus <em>{activeCourseForPlayer.title}</em>. E-Sertifikat resmi Anda telah terbit di sistem HRIS.
							</p>
						</div>

						<div class="p-4 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-left text-xs space-y-1.5">
							<p class="text-slate-500">Nomor Sertifikat: <strong class="font-mono text-primary">{postTestResult?.certNumber || `CERT-BCS-2026-${(activeCourseForPlayer.id || '01').replace(/\D/g, '').padEnd(4, '0').slice(0, 4)}`}</strong></p>
							<p class="text-slate-500">Metode Pelatihan: <strong class="font-semibold text-on-surface">{isOfflineAttendedCourse ? 'Tatap Muka (In-House Offline)' : 'E-Learning (Online)'}</strong></p>
							<p class="text-slate-500">Nilai Akhir: <strong class="font-mono text-emerald-600">{postTestResult?.score || (isOfflineAttendedCourse ? 'Lulus Kelas Tatap Muka' : 95)}/100</strong></p>
							<p class="text-slate-500">Masa Berlaku Sertifikat: <strong class="text-amber-600 font-bold">1 (satu) Tahun terhitung sejak diterbitkan</strong></p>
							<p class="text-slate-500">Status Evaluasi Atasan: <span class="text-amber-600 font-bold">{isOfflineAttendedCourse ? 'Level 4 Pre-Test (SLA 10 Hari) & Level 3/4 Post-Test (3 Bulan) Aktif' : 'Dijadwalkan H+3 Bulan'}</span></p>
						</div>

						<div class="flex gap-3 justify-center pt-2">
							<button
								type="button"
								onclick={() => (isPlayerModalOpen = false)}
								class="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-surface-container cursor-pointer"
							>
								Tutup Player
							</button>

							<button
								type="button"
								onclick={() => {
									const certNum = postTestResult?.certNumber || `CERT-BCS-2026-${(activeCourseForPlayer.id || '01').replace(/\D/g, '').padEnd(4, '0').slice(0, 4)}`;
									const now = new Date();
									const oneYearLater = new Date();
									oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
									isPlayerModalOpen = false;
									openCertificate({
										certificateNumber: certNum,
										payrollId: currentUser?.payrollId || 'EMP-0042',
										employeeName: currentUser?.name || 'GUNTORO MUHAMAD',
										courseTitle: activeCourseForPlayer.title,
										category: activeCourseForPlayer.category,
										score: postTestResult?.score || 95,
										issuedAt: now.toISOString().split('T')[0],
										validUntil: oneYearLater.toISOString().split('T')[0],
										qrVerifyUrl: `https://academy.bcslabs.tech/verify/${certNum}`
									});
								}}
								class="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 shadow-md flex items-center gap-1.5 cursor-pointer"
							>
								<span class="material-symbols-outlined text-sm">print</span>
								<span>Buka & Cetak E-Sertifikat</span>
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 2: TAMBAH KURSUS BARU (CREATE COURSE)                             -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isCreateModalOpen}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<h3 class="font-black text-base text-on-surface">Tambah Program Pelatihan Baru</h3>
					<p class="text-[11px] text-slate-500">Standarisasi program pelatihan & jadwal pelaksanaan PT BCS 2026</p>
				</div>
				<button type="button" onclick={() => (isCreateModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Stepper Indicator Header (5 Steps) -->
			<div class="grid grid-cols-2 sm:grid-cols-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-surface-container-low text-[11px] font-bold p-1 gap-1">
				<button
					type="button"
					onclick={() => (createModalStep = 1)}
					class="py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer {createModalStep === 1
						? 'bg-primary text-on-primary font-black shadow-xs'
						: 'text-on-surface-variant hover:bg-surface-container'}"
				>
					<span class="material-symbols-outlined text-sm">info</span>
					<span>1. Info & Biaya</span>
				</button>
				<button
					type="button"
					onclick={() => (createModalStep = 2)}
					class="py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer {createModalStep === 2
						? 'bg-primary text-on-primary font-black shadow-xs'
						: 'text-on-surface-variant hover:bg-surface-container'}"
				>
					<span class="material-symbols-outlined text-sm">group</span>
					<span>2. Peserta ({selectedEmployeeIds.length})</span>
				</button>
				<button
					type="button"
					onclick={() => (createModalStep = 3)}
					class="py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer {createModalStep === 3
						? 'bg-primary text-on-primary font-black shadow-xs'
						: 'text-on-surface-variant hover:bg-surface-container'}"
				>
					<span class="material-symbols-outlined text-sm">calendar_month</span>
					<span>3. Jadwal Sesi</span>
				</button>
				<button
					type="button"
					onclick={() => (createModalStep = 4)}
					class="py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer {createModalStep === 4
						? 'bg-primary text-on-primary font-black shadow-xs'
						: 'text-on-surface-variant hover:bg-surface-container'}"
				>
					<span class="material-symbols-outlined text-sm">video_library</span>
					<span>4. Materi Modul</span>
				</button>
				<button
					type="button"
					onclick={() => (createModalStep = 5)}
					class="py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer {createModalStep === 5
						? 'bg-primary text-on-primary font-black shadow-xs'
						: isCreateCourseReadyToSubmit
						? 'text-emerald-600 hover:bg-surface-container'
						: 'text-amber-600 hover:bg-surface-container'}"
				>
					<span class="material-symbols-outlined text-sm">quiz</span>
					<span>5. Asesmen</span>
					{#if !isCreateCourseReadyToSubmit}
						<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
					{:else}
						<span class="material-symbols-outlined text-xs text-emerald-500">check</span>
					{/if}
				</button>
			</div>

			<form method="POST" action="?/createCourse" use:enhance class="flex flex-col flex-1 overflow-hidden space-y-3.5 text-xs">
				<!-- Hidden Form State Values -->
				<input
					type="hidden"
					name="division"
					value={computedCourseDivision}
				/>
				<input
					type="hidden"
					name="representativeEmployees"
					value={JSON.stringify(
						selectedEmployees.map((e: any) => ({
							payrollId: e.payrollId,
							name: e.name,
							positionTitle: e.positionTitle,
							department: e.divisionName || e.department || 'Operations'
						}))
					)}
				/>
				<input type="hidden" name="sessionDate" value={createCourseSessionStartDate} />
				<input type="hidden" name="sessionEndDate" value={createCourseSessionEndDate} />
				<input type="hidden" name="startTime" value={createCourseStartTime} />
				<input type="hidden" name="endTime" value={createCourseEndTime} />
				<input type="hidden" name="sessionType" value={createCourseSessionType} />
				<input type="hidden" name="locationOrLink" value={createCourseLocationOrLink} />
				<input type="hidden" name="targetRole" value={createCourseTargetRole} />
				<input type="hidden" name="quota" value={createCourseQuota} />
				<input type="hidden" name="preTestQuestions" value={JSON.stringify(preTestQuestionsList)} />
				<input type="hidden" name="postTestQuestions" value={JSON.stringify(postTestQuestionsList)} />

				<!-- Scrollable Form Body -->
				<div class="flex-1 overflow-y-auto pr-1 space-y-3.5 max-h-[60vh]">
					<!-- ══════════════════════════════════════════════════════════════ -->
					<!-- LANGKAH 1: INFO PROGRAM & BIAYA PELATIHAN                     -->
					<!-- ══════════════════════════════════════════════════════════════ -->
					<div class={createModalStep === 1 ? 'space-y-3.5' : 'hidden'}>
						<div>
							<label class="font-bold text-on-surface block mb-1">Judul Program Pelatihan *</label>
							<input
								type="text"
								name="title"
								bind:value={createCourseTitle}
								required
								placeholder="Contoh: Defensive Driving Angkutan Berat..."
								class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface focus:ring-1 focus:ring-primary"
							/>
						</div>

						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class="font-bold text-on-surface block mb-1">Kategori</label>
								<select name="category" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface">
									<option value="Safety">Safety & K3</option>
									<option value="Operations">Operations</option>
									<option value="Technical">Technical</option>
									<option value="Technical & Soft Skill">Technical & Soft Skill</option>
									<option value="Leadership">Leadership</option>
								</select>
							</div>

							<div>
								<label class="font-bold text-on-surface block mb-1">Klasifikasi Based *</label>
								<select name="based" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface">
									<option value="Mandatory">Mandatory (Wajib Regulasi/K3)</option>
									<option value="Additional">Additional (Pengembangan / Opsional)</option>
									<option value="Gap Competency">Gap Competency (Hasil Evaluasi TNA)</option>
								</select>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class="font-bold text-on-surface block mb-1">Instruktur / Trainer *</label>
								<select name="instructor" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface">
									{#each masterTrainers as t}
										<option value={`${t.name} (${t.title})`}>{t.name} - {t.title}</option>
									{/each}
									<option value="Instruktur Eksternal Sertifikasi">Lembaga / Trainer Eksternal</option>
								</select>
							</div>

							<div>
								<label class="font-bold text-on-surface block mb-1">Asal Trainer</label>
								<select
									name="trainerType"
									bind:value={createCourseTrainerType}
									class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface"
								>
									<option value="Internal">Internal PT BCS</option>
									<option value="Eksternal">Eksternal / Vendor Resmi</option>
								</select>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class="font-bold text-on-surface block mb-1">Biaya Trainer (IDR)</label>
								<input
									type="number"
									name="costTrainer"
									value={createCourseTrainerType === 'Internal' ? 500000 : 2500000}
									step="50000"
									min="0"
									placeholder="0"
									class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 font-mono text-xs text-on-surface"
								/>
							</div>

							<div>
								<label class="font-bold text-on-surface block mb-1">Biaya Peserta / Trainee (IDR)</label>
								<input
									type="number"
									name="costTrainee"
									value="0"
									step="25000"
									min="0"
									placeholder="0 (Gratis/Internal)"
									class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 font-mono text-xs text-on-surface"
								/>
							</div>
						</div>

						<input type="hidden" name="level" value="Beginner" />

						<div>
							<label class="font-bold text-on-surface block mb-1">Deskripsi Singkat Pelatihan *</label>
							<textarea
								name="description"
								rows="3"
								required
								placeholder="Uraikan kompetensi, latar belakang, dan sasaran dari program pelatihan ini..."
								class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 resize-none text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none"
							></textarea>
						</div>
					</div>

					<!-- ══════════════════════════════════════════════════════════════ -->
					<!-- LANGKAH 2: TARGET DIVISI & PEMILIHAN PESERTA                   -->
					<!-- ══════════════════════════════════════════════════════════════ -->
					<div class={createModalStep === 2 ? 'space-y-3.5' : 'hidden'}>
						<div class="p-3.5 rounded-2xl bg-surface-container-low border border-slate-200 dark:border-slate-800 space-y-3">
							<div>
								<div class="flex items-center justify-between mb-1">
									<label class="font-bold text-on-surface block text-xs">Pilih Divisi Sasaran</label>
									{#if selectedEmployeeIds.length > 0}
										<span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
											<span>{selectedEmployeeIds.length} Terpilih ({computedCourseDivision})</span>
										</span>
									{/if}
								</div>
								<select
									bind:value={createCourseDivision}
									onchange={() => {
										createCourseEmployeeSearch = '';
										isEmployeeSelectionConfirmed = false;
									}}
									class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface font-semibold"
								>
									<option value="">-- Pilih Divisi untuk Memuat Karyawan --</option>
									{#each divisions as d}
										<option value={d.code}>{d.name}</option>
									{/each}
								</select>
								<p class="text-[10px] text-slate-400 mt-1">
									Pilih divisi untuk memuat daftar karyawannya. Anda dapat berganti divisi untuk memilih perwakilan dari beberapa divisi berbeda tanpa menghapus pilihan sebelumnya.
								</p>
							</div>

							<!-- Picker Karyawan Divisi Aktif (jika divisi dipilih) -->
							{#if createCourseDivision}
								{@const selectedDivisionObj = divisions.find((d: any) => d.code === createCourseDivision)}
								<div class="p-3 rounded-xl bg-surface border border-slate-200 dark:border-slate-700/80 space-y-2.5">
									{#if !isEmployeeSelectionConfirmed}
										<!-- Mode Memilih Karyawan -->
										<div class="flex items-center justify-between">
											<div>
												<p class="text-[11px] font-bold text-on-surface">
													Pilih dari Divisi: <span class="text-primary">{selectedDivisionObj?.name || createCourseDivision}</span>
												</p>
												<p class="text-[10px] text-slate-400">
													{selectedInCurrentDivisionCount} dari {filteredDivisionEmployees.length} karyawan divisi ini dipilih
												</p>
											</div>

											<div class="flex items-center gap-1.5">
												<button
													type="button"
													onclick={selectAllDivisionEmployees}
													disabled={filteredDivisionEmployees.length === 0}
													class="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-[11px] font-bold text-primary disabled:opacity-50 cursor-pointer"
												>
													Pilih Semua
												</button>
												<button
													type="button"
													onclick={clearCurrentDivisionEmployees}
													disabled={selectedInCurrentDivisionCount === 0}
													class="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-[11px] font-bold text-slate-500 disabled:opacity-50 cursor-pointer"
												>
													Batal Divisi Ini
												</button>
												<button
													type="button"
													onclick={confirmEmployeeSelection}
													class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-all"
													title="Tutup/konfirmasi daftar pilihan divisi ini"
												>
													<span class="material-symbols-outlined text-xs">check</span>
													<span>Selesai</span>
												</button>
											</div>
										</div>

										<!-- Search Bar Karyawan Divisi -->
										<div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800">
											<span class="material-symbols-outlined text-slate-400 text-sm">search</span>
											<input
												type="text"
												bind:value={createCourseEmployeeSearch}
												placeholder="Cari nama atau NIK di divisi ini..."
												class="bg-transparent text-xs text-on-surface outline-none w-full placeholder:text-slate-400"
											/>
											{#if createCourseEmployeeSearch}
												<button type="button" onclick={() => (createCourseEmployeeSearch = '')} class="text-slate-400 hover:text-slate-600">
													<span class="material-symbols-outlined text-xs">close</span>
												</button>
											{/if}
										</div>

										<!-- Daftar Karyawan Checkbox Grid -->
										{#if filteredDivisionEmployees.length > 0}
											<div class="max-h-44 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
												{#each filteredDivisionEmployees as emp}
													{@const isSelected = selectedEmployeeIds.includes(emp.payrollId)}
													<button
														type="button"
														onclick={() => toggleCreateCourseEmployee(emp.payrollId)}
														class="w-full text-left p-2 rounded-xl flex items-center justify-between transition-all cursor-pointer {isSelected
															? 'bg-primary/10 border border-primary/30 text-primary'
															: 'hover:bg-surface-container text-on-surface'}"
													>
														<div class="flex items-center gap-2.5 truncate">
															<div class="w-4 h-4 rounded-md flex items-center justify-center border {isSelected ? 'bg-primary border-primary text-on-primary' : 'border-slate-300 dark:border-slate-600 bg-surface'}">
																{#if isSelected}
																	<span class="material-symbols-outlined text-[12px]">check</span>
																{/if}
															</div>
															<div class="truncate">
																<p class="font-bold text-xs truncate leading-tight">{emp.name}</p>
																<p class="text-[10px] text-slate-400 leading-tight">
																	{emp.payrollId} • {emp.positionTitle || 'Staf'}
																</p>
															</div>
														</div>
														<span class="text-[10px] font-bold px-2 py-0.5 rounded-md {isSelected ? 'bg-primary/20 text-primary' : 'bg-surface-container text-slate-400'}">
															{isSelected ? 'Terpilih' : 'Pilih'}
														</span>
													</button>
												{/each}
											</div>
										{:else}
											<div class="p-3 text-center rounded-xl bg-surface-container/60 text-slate-400 text-xs">
												{createCourseEmployeeSearch ? 'Tidak ada karyawan yang cocok dengan pencarian.' : 'Belum ada data karyawan terdaftar di divisi ini.'}
											</div>
										{/if}
									{:else}
										<!-- Mode Selesai / Terkonfirmasi: Box Menciut Rapi -->
										<div class="flex items-center justify-between py-0.5">
											<div class="flex items-center gap-2">
												<span class="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
												<div>
													<p class="font-bold text-xs text-on-surface">
														Pilihan Divisi {selectedDivisionObj?.name || createCourseDivision} Disimpan
													</p>
													<p class="text-[10px] text-slate-400">
														{selectedInCurrentDivisionCount} karyawan dari divisi ini telah dipilih
													</p>
												</div>
											</div>

											<button
												type="button"
												onclick={reopenEmployeeSelection}
												class="px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
												title="Buka kembali daftar untuk menambah atau mengubah perwakilan divisi ini"
											>
												<span class="material-symbols-outlined text-xs">edit</span>
												<span>Ubah Pilihan</span>
											</button>
										</div>
									{/if}
								</div>
							{:else}
								<div class="p-4 text-center rounded-xl bg-surface border border-dashed border-slate-300 dark:border-slate-700/60 text-slate-400 text-xs">
									<span>Silakan pilih <strong>Divisi Sasaran</strong> di atas untuk memuat daftar peserta.</span>
								</div>
							{/if}

							<!-- Summary Chip Karyawan Terpilih Lintas Divisi -->
							<div class="pt-1">
								<div class="flex items-center justify-between mb-1.5">
									<h5 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
										<span class="material-symbols-outlined text-xs text-emerald-500">check_circle</span>
										<span>Daftar Peserta Terdaftar ({selectedEmployeeIds.length})</span>
									</h5>
									{#if selectedEmployeeIds.length > 0}
										<button
											type="button"
											onclick={clearAllSelectedEmployees}
											class="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-0.5 cursor-pointer"
										>
											<span class="material-symbols-outlined text-xs">delete</span>
											<span>Reset Semua Peserta</span>
										</button>
									{/if}
								</div>

								{#if selectedEmployeeIds.length === 0}
									<div class="p-3 text-center rounded-xl bg-surface/50 border border-slate-200/60 dark:border-slate-800 text-slate-400 text-[11px]">
										Belum ada peserta perwakilan yang dipilih (pendaftaran peserta dapat dilakukan menyusul).
									</div>
								{:else}
									<div class="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1 py-1">
										{#each selectedEmployees as emp}
											<div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs shadow-2xs hover:border-primary/40 transition-colors">
												<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
												<div class="flex flex-col text-left">
													<div class="flex items-center gap-1">
														<span class="font-bold text-on-surface text-[11px] leading-tight">{emp.name}</span>
														<span class="px-1.5 py-0.2 rounded text-[8px] font-bold bg-primary/10 text-primary uppercase">
															{emp.divisionName || emp.department || 'Dept'}
														</span>
													</div>
													<span class="text-[9px] text-slate-400 font-mono leading-tight">{emp.payrollId} • {emp.positionTitle || 'Staf'}</span>
												</div>
												<button
													type="button"
													onclick={() => removeSelectedEmployee(emp.payrollId)}
													class="text-slate-400 hover:text-rose-500 ml-1 p-0.5 rounded-full hover:bg-rose-500/10 cursor-pointer transition-colors"
													title="Hapus {emp.name}"
												>
													<span class="material-symbols-outlined text-[13px]">close</span>
												</button>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- ══════════════════════════════════════════════════════════════ -->
					<!-- LANGKAH 3: JADWAL & LOKASI PELAKSANAAN SESI                    -->
					<!-- ══════════════════════════════════════════════════════════════ -->
					<div class={createModalStep === 3 ? 'space-y-3.5' : 'hidden'}>
						<div class="p-3.5 rounded-2xl bg-surface-container-low border border-slate-200 dark:border-slate-800 space-y-3">
							<div class="flex items-center gap-1.5 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
								<span class="material-symbols-outlined text-primary text-base">calendar_month</span>
								<div>
									<h4 class="font-bold text-xs text-on-surface">Jadwal Pelaksanaan Sesi Pelatihan</h4>
									<p class="text-[10px] text-slate-400">Atur periode tanggal, jam harian, dan ruangan / tautan pelatihan</p>
								</div>
								<span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-primary/10 text-primary ml-auto">
									Otomatis Buat Sesi & Absensi
								</span>
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div>
									<label class="font-bold text-on-surface block mb-1">Tanggal Mulai Pelatihan *</label>
									<input
										type="date"
										name="sessionDate"
										required
										bind:value={createCourseSessionStartDate}
										class="w-full px-2.5 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-mono text-xs text-on-surface font-semibold"
									/>
									{#if getSlotFriendlyLabel(createCourseSessionStartDate)}
										<div class="mt-1.5 flex items-center gap-1.5 text-[10.5px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 animate-in fade-in">
											<span class="material-symbols-outlined text-xs">calendar_month</span>
											<span>🎯 Target Matriks Plan (P): {getSlotFriendlyLabel(createCourseSessionStartDate)}</span>
										</div>
									{/if}
								</div>

								<div>
									<label class="font-bold text-on-surface block mb-1">Tanggal Berakhir Pelatihan *</label>
									<input
										type="date"
										name="sessionEndDate"
										required
										bind:value={createCourseSessionEndDate}
										class="w-full px-2.5 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-mono text-xs text-on-surface font-semibold"
									/>
								</div>
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
								<div>
									<label class="font-bold text-on-surface block mb-1">Jam Mulai</label>
									<input
										type="time"
										name="startTime"
										bind:value={createCourseStartTime}
										class="w-full px-2 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-mono text-xs text-on-surface"
									/>
								</div>

								<div>
									<label class="font-bold text-on-surface block mb-1">Jam Selesai</label>
									<input
										type="time"
										name="endTime"
										bind:value={createCourseEndTime}
										class="w-full px-2 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-mono text-xs text-on-surface"
									/>
								</div>

								<div>
									<label class="font-bold text-on-surface block mb-1">Tipe Pelatihan</label>
									<select
										name="sessionType"
										bind:value={createCourseSessionType}
										class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface font-semibold"
									>
										<option value="OFFLINE">Tatap Muka (Offline)</option>
										<option value="ONLINE">Daring / Webinar (Online)</option>
										<option value="HYBRID">Hybrid (Tatap Muka & Daring)</option>
									</select>
								</div>
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
								<div class="sm:col-span-2">
									<label class="font-bold text-on-surface block mb-1">Lokasi Ruangan / Tautan Meeting *</label>
									<input
										type="text"
										name="locationOrLink"
										required
										bind:value={createCourseLocationOrLink}
										placeholder="Contoh: Ruang Aula Cilegon / Pool Gn. Putri / Google Meet link"
										class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface"
									/>
								</div>

								<div>
									<label class="font-bold text-on-surface block mb-1">Kuota Maksimal Peserta</label>
									<input
										type="number"
										name="quota"
										bind:value={createCourseQuota}
										min="5"
										max="500"
										class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-mono text-xs text-on-surface"
									/>
								</div>
							</div>

							<!-- Widget Preview Jadwal Sesi -->
							<div class="p-3 rounded-xl bg-surface border border-primary/20 space-y-1.5">
								<p class="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
									<span class="material-symbols-outlined text-xs">preview</span>
									<span>Pratinjau Ringkasan Agenda Sesi:</span>
								</p>
								<div class="flex flex-wrap items-center gap-2 text-xs font-bold text-on-surface">
									<span>📅 {createCourseSessionStartDate === createCourseSessionEndDate ? createCourseSessionStartDate : `${createCourseSessionStartDate} s/d ${createCourseSessionEndDate}`}</span>
									<span>•</span>
									<span>⏰ {createCourseStartTime} - {createCourseEndTime} WIB</span>
									<span>•</span>
									<span class="px-2 py-0.5 rounded text-[10px] font-black uppercase {createCourseSessionType === 'ONLINE' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}">
										{createCourseSessionType}
									</span>
								</div>
								<p class="text-[11px] text-slate-500 flex items-center gap-1 truncate">
									<span class="material-symbols-outlined text-xs">location_on</span>
									<span>{createCourseLocationOrLink || '-'} (Kapasitas: {createCourseQuota} Peserta)</span>
								</p>
							</div>
						</div>
					</div>

					<!-- ══════════════════════════════════════════════════════════════ -->
					<!-- LANGKAH 4: MATERI PELATIHAN & DURASI                         -->
					<!-- ══════════════════════════════════════════════════════════════ -->
					<div class={createModalStep === 4 ? 'space-y-3.5' : 'hidden'}>
						<div class="p-3.5 rounded-2xl bg-surface-container-low border border-slate-200 dark:border-slate-800 space-y-3">
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label class="font-bold text-on-surface block mb-1">Durasi Total (Jam)</label>
									<input type="number" name="durationHours" value="2.0" step="0.5" class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-mono text-xs" />
								</div>

								<div>
									<label class="font-bold text-on-surface block mb-1">Passing Grade Kelulusan (%)</label>
									<input type="number" name="passingGrade" value="75" min="50" max="100" class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-mono text-xs" />
								</div>
							</div>

							<div>
								<div class="flex items-center justify-between mb-1">
									<label class="font-bold text-on-surface flex items-center gap-1.5">
										<span class="material-symbols-outlined text-sm text-primary">link</span>
										<span>Link Materi Pembelajaran (Embed Iframe)</span>
									</label>
									<span class="text-[10px] text-slate-400">YouTube, Google Drive/Docs, Loom, Canva, PDF</span>
								</div>

								<div class="flex items-center gap-2">
									<input
										type="url"
										name="materialUrl"
										bind:value={createCourseMaterialUrl}
										placeholder="https://www.youtube.com/watch?v=... atau Google Drive share link"
										class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface font-mono"
									/>
									{#if createCourseMaterialUrl}
										<button
											type="button"
											onclick={() => (showMaterialPreview = !showMaterialPreview)}
											class="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-primary shrink-0 flex items-center gap-1 cursor-pointer"
										>
											<span class="material-symbols-outlined text-xs">{showMaterialPreview ? 'visibility_off' : 'visibility'}</span>
											<span>{showMaterialPreview ? 'Tutup Preview' : 'Lihat'}</span>
										</button>
									{/if}
								</div>

								<!-- Quick Link Templates -->
								<div class="flex flex-wrap items-center gap-1.5 mt-2">
									<span class="text-[10px] text-slate-400">Contoh format:</span>
									<button
										type="button"
										onclick={() => (createCourseMaterialUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
										class="px-2 py-0.5 rounded text-[10px] bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-medium hover:underline"
									>
										YouTube Video
									</button>
									<button
										type="button"
										onclick={() => (createCourseMaterialUrl = 'https://docs.google.com/presentation/d/e/sample/pub?start=false')}
										class="px-2 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-medium hover:underline"
									>
										Google Slides
									</button>
									<button
										type="button"
										onclick={() => (createCourseMaterialUrl = 'https://drive.google.com/file/d/sample/preview')}
										class="px-2 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-medium hover:underline"
									>
										Drive PDF
									</button>
								</div>
							</div>

							<!-- Live Preview Player jika URL diisi -->
							{#if createCourseMaterialUrl && showMaterialPreview}
								{@const embedSrc = formatEmbedUrl(createCourseMaterialUrl)}
								{@const platform = detectEmbedPlatform(createCourseMaterialUrl)}
								<div class="mt-2 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black/5 dark:bg-black/40">
									<div class="p-2.5 bg-surface-container flex items-center justify-between text-xs">
										<div class="flex items-center gap-2">
											<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
											<span class="font-bold text-on-surface">Pratinjau Materi ({platform})</span>
										</div>
										<a
											href={createCourseMaterialUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="text-primary hover:underline text-[11px] flex items-center gap-1"
										>
											<span>Buka Link Asli</span>
											<span class="material-symbols-outlined text-xs">open_in_new</span>
										</a>
									</div>
									<div class="relative w-full aspect-video bg-black/90">
										{#if embedSrc}
											<iframe
												src={embedSrc}
												title="Preview Materi Pembelajaran"
												class="w-full h-full border-0"
												allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
												allowfullscreen
											></iframe>
										{:else}
											<div class="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
												<span class="material-symbols-outlined text-3xl mb-2">broken_image</span>
												<p class="text-xs">Format URL tidak dapat di-embed langsung sebagai iframe.</p>
												<p class="text-[11px] text-slate-500 mt-1">Gunakan link YouTube, Google Drive/Slides, Vimeo, atau file PDF publik.</p>
											</div>
										{/if}
									</div>
								</div>
							{/if}

							<div>
								<label class="font-bold text-on-surface block mb-1">Tag / Kata Kunci (Dipisahkan koma)</label>
								<input type="text" name="tags" placeholder="Contoh: Defensive, HSE, Angkutan, 2026" class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs" />
							</div>
						</div>
					</div>

					<!-- ══════════════════════════════════════════════════════════════ -->
					<!-- LANGKAH 5: BANK SOAL PRE-TEST & POST-TEST                    -->
					<!-- ══════════════════════════════════════════════════════════════ -->
					<div class={createModalStep === 5 ? 'space-y-3.5' : 'hidden'}>
						<!-- Sub-Tab Pre-Test vs Post-Test -->
						<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
							<div class="flex items-center gap-1 bg-surface-container p-1 rounded-xl text-xs font-bold">
								<button
									type="button"
									onclick={() => (createQuizTab = 'PRE_TEST')}
									class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 {createQuizTab === 'PRE_TEST'
										? 'bg-primary text-on-primary shadow-xs font-black'
										: 'text-on-surface-variant hover:text-on-surface'}"
								>
									<span class="material-symbols-outlined text-xs">assignment_turned_in</span>
									<span>1. Pre-Test ({preTestQuestionsList.length} Soal)</span>
									{#if isPreTestValid}
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
									{/if}
								</button>
								<button
									type="button"
									onclick={() => (createQuizTab = 'POST_TEST')}
									class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 {createQuizTab === 'POST_TEST'
										? 'bg-primary text-on-primary shadow-xs font-black'
										: 'text-on-surface-variant hover:text-on-surface'}"
								>
									<span class="material-symbols-outlined text-xs">grade</span>
									<span>2. Post-Test ({postTestQuestionsList.length} Soal)</span>
									{#if isPostTestValid}
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
									{/if}
								</button>
							</div>

							<div class="flex items-center gap-1.5">
								{#if createQuizTab === 'POST_TEST'}
									<button
										type="button"
										onclick={copyPreTestToPostTest}
										class="px-2.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 cursor-pointer transition-all border border-slate-200 dark:border-slate-700/60"
										title="Salin seluruh pertanyaan dari Pre-Test"
									>
										<span class="material-symbols-outlined text-xs">content_copy</span>
										<span>Salin dari Pre-Test</span>
									</button>
								{/if}
								<button
									type="button"
									onclick={addQuestionToCurrentQuiz}
									class="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-primary flex items-center gap-1 cursor-pointer transition-all border border-slate-200 dark:border-slate-700/60"
								>
									<span class="material-symbols-outlined text-xs">add</span>
									<span>+ Tambah Soal {createQuizTab === 'PRE_TEST' ? 'Pre-Test' : 'Post-Test'}</span>
								</button>
							</div>
						</div>

						<p class="text-[11px] text-slate-500">
							{createQuizTab === 'PRE_TEST'
								? 'Soal Pre-Test akan dikerjakan peserta di awal sebelum mengakses materi untuk mengukur baseline kompetensi.'
								: 'Soal Post-Test akan dikerjakan peserta setelah menyelesaikan seluruh modul materi untuk menentukan kelulusan sertifikasi.'}
						</p>

						<!-- Dynamic Questions List -->
						<div class="space-y-4">
							{#each currentQuizQuestions as q, index}
								<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200 dark:border-slate-800 space-y-3">
									<div class="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
										<div class="flex items-center gap-2">
											<span class="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
												{index + 1}
											</span>
											<span class="font-bold text-xs text-on-surface">Butir Pertanyaan #{index + 1}</span>
										</div>

										<div class="flex items-center gap-2">
											<!-- Question Type Selector -->
											<select
												bind:value={q.questionType}
												class="px-2 py-1 rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-on-surface"
											>
												<option value="MCQ">Pilihan Ganda (MCQ)</option>
												<option value="ESSAY">Uraian / Essay</option>
											</select>

											{#if currentQuizQuestions.length > 1}
												<button
													type="button"
													onclick={() => removeQuestionFromCurrentQuiz(q.id)}
													class="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-500/10 cursor-pointer"
													title="Hapus soal ini"
												>
													<span class="material-symbols-outlined text-base">delete</span>
												</button>
											{/if}
										</div>
									</div>

									<!-- Question Text Input -->
									<div>
										<label class="font-bold text-[11px] text-on-surface block mb-1">Teks Pertanyaan *</label>
										<textarea
											bind:value={q.questionText}
											rows="2"
											placeholder="Tuliskan pertanyaan soal..."
											class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface resize-none focus:ring-1 focus:ring-primary outline-none"
										></textarea>
									</div>

									{#if q.questionType === 'MCQ'}
										<!-- Multiple Choice Options A, B, C, D -->
										<div class="space-y-2 pt-1">
											<div class="flex items-center justify-between text-[11px]">
												<span class="font-bold text-slate-500">Opsi Jawaban & Kunci Benar:</span>
												<span class="text-[10px] text-slate-400">Pilih radio button untuk menentukan kunci</span>
											</div>

											{#each q.options as opt}
												<div class="flex items-center gap-2">
													<label class="flex items-center gap-1.5 cursor-pointer shrink-0">
														<input
															type="radio"
															name={`correct_${q.id}`}
															value={opt.key}
															bind:group={q.correctKey}
															class="text-primary focus:ring-primary cursor-pointer"
														/>
														<span class="font-bold text-xs w-4">{opt.key}.</span>
													</label>
													<input
														type="text"
														bind:value={opt.text}
														placeholder={`Pilihan jawaban ${opt.key}...`}
														class="flex-1 px-2.5 py-1.5 rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none {q.correctKey === opt.key ? 'border-primary/50 bg-primary/5 font-medium' : ''}"
													/>
												</div>
											{/each}
										</div>
									{:else}
										<!-- Essay Mode Information -->
										<div class="p-2.5 rounded-xl bg-surface/60 border border-dashed border-slate-300 dark:border-slate-700 text-[11px] text-slate-500 space-y-1">
											<div class="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
												<span class="material-symbols-outlined text-xs text-primary">edit_note</span>
												<span>Tipe Soal: Uraian Bebas / Essay</span>
											</div>
											<p class="text-[10px] text-slate-400 leading-relaxed">
												Peserta akan menjawab dengan mengetikkan teks uraian bebas langsung di Course Player. Evaluasi penilaian jawaban essay dilakukan melalui tinjauan instruktur / trainer (manual review).
											</p>
										</div>
									{/if}

									<!-- Explanation Input -->
									<div class="pt-1">
										<input
											type="text"
											bind:value={q.explanation}
											placeholder="Pembahasan atau petunjuk kunci penilaian (opsional)..."
											class="w-full px-2.5 py-1.5 rounded-lg bg-surface/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 placeholder:text-slate-400 outline-none"
										/>
									</div>
								</div>
							{/each}
						</div>

						<!-- Validation Warning if Questions Incomplete -->
						{#if !isPreTestValid || !isPostTestValid}
							<div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
								<span class="material-symbols-outlined text-base">warning</span>
								<span>
									Wajib mengisi minimal 1 butir soal Pre-Test dan 1 butir soal Post-Test secara lengkap (teks pertanyaan, minimal 2 opsi dan kunci jawaban untuk MCQ, atau teks pertanyaan untuk essay) sebelum menyimpan.
								</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Wizard Footer & Navigation Buttons -->
				<div class="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
					<div>
						{#if createModalStep > 1}
							<button
								type="button"
								onclick={() => (createModalStep = (createModalStep - 1) as any)}
								class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-surface-container flex items-center gap-1 cursor-pointer"
							>
								<span class="material-symbols-outlined text-xs">arrow_back</span>
								<span>Sebelumnya</span>
							</button>
						{:else}
							<button
								type="button"
								onclick={() => (isCreateModalOpen = false)}
								class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-surface-container cursor-pointer"
							>
								Batal
							</button>
						{/if}
					</div>

					<div class="flex items-center gap-2">
						{#if createModalStep < 5}
							<button
								type="button"
								onclick={nextCreateStep}
								class="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-sm cursor-pointer"
							>
								<span>
									Lanjut: {createModalStep === 1
										? 'Peserta & Divisi'
										: createModalStep === 2
										? 'Jadwal Sesi'
										: createModalStep === 3
										? 'Materi Modul'
										: 'Soal Asesmen'}
								</span>
								<span class="material-symbols-outlined text-xs">arrow_forward</span>
							</button>
						{:else}
							<button
								type="submit"
								disabled={!isCreateCourseReadyToSubmit}
								class="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<span class="material-symbols-outlined text-sm">save</span>
								<span>Simpan & Terbitkan Pelatihan</span>
							</button>
						{/if}
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 3: TAMBAH BATCH / SESI LANJUTAN PELATIHAN (CREATE SESSION BATCH)    -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isSessionModalOpen}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<!-- Header Modal -->
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
						<span class="material-symbols-outlined text-xl">event_upcoming</span>
					</div>
					<div>
						<h3 class="font-black text-base text-on-surface">Tambah Batch / Sesi Lanjutan Pelatihan</h3>
						<p class="text-[11px] text-slate-500">Buka jadwal batch baru untuk program pelatihan yang sudah terdaftar di katalog</p>
					</div>
				</div>
				<button type="button" onclick={() => (isSessionModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/createSession" use:enhance class="flex flex-col flex-1 overflow-hidden space-y-4 text-xs">
				<!-- Hidden Form State -->
				<input
					type="hidden"
					name="representativeEmployees"
					value={JSON.stringify(
						sessionBatchSelectedEmployees.map((e: any) => ({
							payrollId: e.payrollId,
							name: e.name,
							positionTitle: e.positionTitle,
							department: e.divisionName || e.department || sessionBatchDepartment
						}))
					)}
				/>
				<input type="hidden" name="sessionEndDate" value={sessionBatchEndDate || sessionBatchStartDate} />

				<!-- Scrollable Body -->
				<div class="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[62vh]">
					<!-- 1. PROGRAM PELATIHAN INDUK (WAJIB) -->
					<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200 dark:border-slate-800 space-y-3">
						<div class="flex items-center gap-1.5 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
							<span class="material-symbols-outlined text-primary text-base">school</span>
							<h4 class="font-bold text-xs text-on-surface">1. Program Pelatihan Induk (Wajib)</h4>
						</div>

						<div>
							<label class="font-bold text-on-surface block mb-1">Pilih Program Pelatihan Terkait *</label>
							<select
								name="courseId"
								required
								bind:value={selectedCourseForSession}
								onchange={(e) => handleCourseSelectedForSession(e.currentTarget.value)}
								class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface font-semibold focus:ring-1 focus:ring-primary outline-none"
							>
								<option value="" disabled>-- Pilih Program Pelatihan dari Katalog --</option>
								{#each courses as c}
									<option value={c.id}>
										{c.title} ({c.category} • {c.based || 'Mandatory'})
									</option>
								{/each}
							</select>
						</div>

						{#if selectedCourseObjForSession}
							<div class="p-3 rounded-xl bg-surface border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
								<div class="space-y-0.5">
									<div class="flex items-center gap-2">
										<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary">
											{selectedCourseObjForSession.category}
										</span>
										<span class="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
											{selectedCourseObjForSession.based || 'Mandatory'}
										</span>
										<span class="text-[11px] font-mono text-slate-400">ID: {selectedCourseObjForSession.id}</span>
									</div>
									<p class="text-[11px] text-slate-500">
										Instruktur Default: <strong>{selectedCourseObjForSession.instructor}</strong> • Durasi: <strong>{selectedCourseObjForSession.durationHours} Jam</strong>
									</p>
								</div>
								<div class="text-left sm:text-right shrink-0">
									<span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] inline-flex items-center gap-1">
										<span class="material-symbols-outlined text-xs">history_edu</span>
										<span>{sessions.filter((s: any) => s.courseId === selectedCourseObjForSession?.id).length} Batch Telah Terdaftar</span>
									</span>
								</div>
							</div>
						{/if}

						<div>
							<label class="font-bold text-on-surface block mb-1">Judul Sesi Batch *</label>
							<input
								type="text"
								name="title"
								required
								bind:value={sessionBatchTitle}
								placeholder="Contoh: Defensive Driving Angkutan Berat - Batch 2"
								class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface font-semibold focus:ring-1 focus:ring-primary outline-none"
							/>
						</div>
					</div>

					<!-- 2. DETAIL PELAKSANAAN & PENGAJAR (AUTO-POPULATE DARI INDUK) -->
					<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200 dark:border-slate-800 space-y-3">
						<div class="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
							<div class="flex items-center gap-1.5">
								<span class="material-symbols-outlined text-primary text-base">person</span>
								<h4 class="font-bold text-xs text-on-surface">2. Detail Pelaksanaan & Pengajar</h4>
							</div>
							<span class="text-[10px] text-slate-400">Otomatis terisi dari program induk (dapat disesuaikan)</span>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label class="font-bold text-on-surface block mb-1">Nama Trainer / Instruktur *</label>
								<select
									name="trainer"
									bind:value={sessionBatchTrainer}
									class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface"
								>
									{#each masterTrainers as t}
										<option value={t.name}>{t.name} ({t.title})</option>
									{/each}
									<option value="Instruktur Eksternal">Instruktur Eksternal Lembaga</option>
								</select>
							</div>

							<div>
								<label class="font-bold text-on-surface block mb-1">Tipe Trainer & Tipe Sesi</label>
								<div class="grid grid-cols-2 gap-2">
									<select
										name="trainerType"
										bind:value={sessionBatchTrainerType}
										class="w-full px-2 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface"
									>
										<option value="Internal">Internal</option>
										<option value="Eksternal">Eksternal</option>
									</select>
									<select
										name="sessionType"
										bind:value={sessionBatchType}
										class="w-full px-2 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface font-semibold"
									>
										<option value="OFFLINE">Tatap Muka (Offline)</option>
										<option value="ONLINE">Daring (Online)</option>
										<option value="HYBRID">Hybrid</option>
									</select>
								</div>
							</div>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div>
								<label class="font-bold text-on-surface block mb-1">Klasifikasi Based</label>
								<select
									name="based"
									bind:value={sessionBatchBased}
									class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface"
								>
									<option value="Mandatory">Mandatory (Wajib K3)</option>
									<option value="Additional">Additional (Pengembangan)</option>
									<option value="Gap Competency">Gap Competency (TNA)</option>
								</select>
							</div>

							<div>
								<label class="font-bold text-on-surface block mb-1">Departemen Sasaran</label>
								<select
									name="department"
									bind:value={sessionBatchDepartment}
									class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface"
								>
									<option value="All Dept">All Dept</option>
									<option value="Operations">Operations</option>
									<option value="Driver">Driver & Armada</option>
									<option value="Transport (Maintenance & Asset)">Transport (Maintenance & Asset)</option>
									<option value="Project 4">Project 4</option>
									<option value="Labour Project 1">Labour Project 1</option>
									<option value="QHSE & Safety">QHSE & Safety</option>
								</select>
							</div>

							<div>
								<label class="font-bold text-on-surface block mb-1">Biaya Trainer (IDR)</label>
								<input
									type="number"
									name="costTrainer"
									bind:value={sessionBatchCostTrainer}
									step="50000"
									class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-mono text-xs text-on-surface"
								/>
							</div>
						</div>
					</div>

					<!-- 3. WAKTU, LOKASI & KUOTA BATCH -->
					<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200 dark:border-slate-800 space-y-3">
						<div class="flex items-center gap-1.5 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
							<span class="material-symbols-outlined text-primary text-base">calendar_month</span>
							<h4 class="font-bold text-xs text-on-surface">3. Jadwal Waktu, Lokasi & Kuota Batch</h4>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label class="font-bold text-on-surface block mb-1">Tanggal Mulai *</label>
								<input
									type="date"
									name="sessionDate"
									required
									bind:value={sessionBatchStartDate}
									class="w-full px-2.5 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-mono text-xs text-on-surface font-semibold"
								/>
								{#if getSlotFriendlyLabel(sessionBatchStartDate)}
									<div class="mt-1.5 flex items-center gap-1.5 text-[10.5px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 animate-in fade-in">
										<span class="material-symbols-outlined text-xs">calendar_month</span>
										<span>🎯 Target Matriks Plan (P): {getSlotFriendlyLabel(sessionBatchStartDate)}</span>
									</div>
								{/if}
							</div>

							<div>
								<label class="font-bold text-on-surface block mb-1">Tanggal Selesai *</label>
								<input
									type="date"
									required
									bind:value={sessionBatchEndDate}
									class="w-full px-2.5 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-mono text-xs text-on-surface font-semibold"
								/>
							</div>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label class="font-bold text-on-surface block mb-1">Jam Pelaksanaan</label>
								<div class="grid grid-cols-2 gap-2">
									<input
										type="time"
										name="startTime"
										bind:value={sessionBatchStartTime}
										class="w-full px-2 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-mono text-xs text-on-surface"
									/>
									<input
										type="time"
										name="endTime"
										bind:value={sessionBatchEndTime}
										class="w-full px-2 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-mono text-xs text-on-surface"
									/>
								</div>
							</div>

							<div>
								<label class="font-bold text-on-surface block mb-1">Kuota Maksimal Peserta</label>
								<input
									type="number"
									name="quota"
									bind:value={sessionBatchQuota}
									min="5"
									max="500"
									class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-mono text-xs text-on-surface"
								/>
							</div>
						</div>

						<div>
							<label class="font-bold text-on-surface block mb-1">Lokasi Ruangan / Tautan Meeting *</label>
							<input
								type="text"
								name="locationOrLink"
								required
								bind:value={sessionBatchLocation}
								placeholder="Ruang Aula Training BCS Cilegon atau https://meet.google.com/..."
								class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface"
							/>
						</div>
					</div>

					<!-- 4. PESERTA BATCH INI (DIRECT REGISTRATION KE PRESENSI) -->
					<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200 dark:border-slate-800 space-y-3">
						<div class="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
							<div class="flex items-center gap-1.5">
								<span class="material-symbols-outlined text-primary text-base">group_add</span>
								<h4 class="font-bold text-xs text-on-surface">
									4. Peserta Batch Ini ({sessionBatchSelectedEmployeeIds.length} Karyawan)
								</h4>
							</div>
							<span class="text-[10px] text-slate-400">Opsional • Peserta otomatis masuk daftar presensi sesi</span>
						</div>

						<!-- Filter Divisi & Search Peserta -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
							<div>
								<label class="font-bold text-on-surface block mb-1 text-[11px]">Filter Divisi Sasaran</label>
								<select
									bind:value={sessionBatchDivision}
									class="w-full px-2.5 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface"
								>
									<option value="">-- Pilih Divisi untuk Memuat Karyawan --</option>
									{#each divisions as div}
										<option value={div.code}>{div.name} ({div.code})</option>
									{/each}
								</select>
							</div>

							<div>
								<label class="font-bold text-on-surface block mb-1 text-[11px]">Cari Karyawan</label>
								<div class="relative">
									<span class="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-xs">search</span>
									<input
										type="text"
										bind:value={sessionBatchEmployeeSearch}
										placeholder="Ketik nama atau NIK..."
										class="w-full pl-7 pr-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none"
									/>
								</div>
							</div>
						</div>

						<!-- Daftar Karyawan Checkbox Grid -->
						{#if sessionBatchDivision}
							{#if sessionBatchFilteredDivisionEmployees.length > 0}
								<div class="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-surface border border-slate-200/80 dark:border-slate-700/80 divide-y divide-slate-100 dark:divide-slate-800/60">
									{#each sessionBatchFilteredDivisionEmployees as emp}
										{@const isSelected = sessionBatchSelectedEmployeeIds.includes(emp.payrollId)}
										<button
											type="button"
											onclick={() => toggleSessionBatchEmployee(emp.payrollId)}
											class="w-full text-left p-1.5 rounded-lg flex items-center justify-between transition-all cursor-pointer {isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface-container text-on-surface'}"
										>
											<div class="flex items-center gap-2 truncate">
												<div class="w-3.5 h-3.5 rounded flex items-center justify-center border {isSelected ? 'bg-primary border-primary text-on-primary' : 'border-slate-300 dark:border-slate-600 bg-surface'}">
													{#if isSelected}
														<span class="material-symbols-outlined text-[10px]">check</span>
													{/if}
												</div>
												<span class="truncate text-xs">{emp.name} ({emp.payrollId})</span>
											</div>
											<span class="text-[10px] text-slate-400 font-mono truncate">{emp.positionTitle || 'Staf'}</span>
										</button>
									{/each}
								</div>
							{:else}
								<div class="p-3 text-center rounded-xl bg-surface border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-[11px]">
									Tidak ada karyawan yang cocok dengan pencarian di divisi ini.
								</div>
							{/if}
						{/if}

						<!-- Selected Chips Preview -->
						{#if sessionBatchSelectedEmployees.length > 0}
							<div class="space-y-1.5 pt-1">
								<div class="flex items-center justify-between">
									<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
										Karyawan Terpilih ({sessionBatchSelectedEmployees.length}):
									</span>
									<button
										type="button"
										onclick={clearAllSessionBatchEmployees}
										class="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
									>
										Hapus Semua
									</button>
								</div>
								<div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
									{#each sessionBatchSelectedEmployees as emp}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-[11px] shadow-2xs">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
											<span class="font-bold text-on-surface">{emp.name}</span>
											<span class="text-[9px] text-slate-400">({emp.payrollId})</span>
											<button
												type="button"
												onclick={() => removeSessionBatchEmployee(emp.payrollId)}
												class="text-slate-400 hover:text-rose-500 ml-0.5 cursor-pointer"
											>
												<span class="material-symbols-outlined text-[11px]">close</span>
											</button>
										</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Footer Form -->
				<div class="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
					<button
						type="button"
						onclick={() => (isSessionModalOpen = false)}
						class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-surface-container cursor-pointer"
					>
						Batal
					</button>

					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-98"
					>
						<span class="material-symbols-outlined text-sm">event_available</span>
						<span>Simpan Batch Sesi {sessionBatchSelectedEmployeeIds.length > 0 ? `(${sessionBatchSelectedEmployeeIds.length} Peserta Terdaftar)` : ''}</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 4: CATAT ABSENSI PESERTA (MARK ATTENDANCE)                        -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isAttendanceModalOpen && activeSessionForAttendance}
	{@const currentSessionAttendances = attendances.filter((a) => a.sessionId === activeSessionForAttendance.id)}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<!-- Header Modal Absensi -->
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-xl">how_to_reg</span>
						<h3 class="font-black text-base text-on-surface">Presensi & Kehadiran Peserta Pelatihan</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5 truncate max-w-lg">
						{activeSessionForAttendance.title} • {activeSessionForAttendance.sessionDate} ({activeSessionForAttendance.startTime} - {activeSessionForAttendance.endTime})
					</p>
				</div>
				<button type="button" onclick={() => (isAttendanceModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Daftar Peserta Sesi & Quick Mark Status -->
			<div class="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[60vh]">
				<div>
					<div class="flex items-center justify-between mb-2 gap-2 flex-wrap">
						<h4 class="font-bold text-xs text-on-surface flex items-center gap-1.5">
							<span class="material-symbols-outlined text-sm text-primary">groups</span>
							<span>Daftar Peserta Terdaftar ({currentSessionAttendances.length})</span>
						</h4>
						<div class="flex items-center gap-2">
							<form method="POST" action="?/markAllAttendancePresent" use:enhance class="inline">
								<input type="hidden" name="sessionId" value={activeSessionForAttendance.id} />
								<button
									type="submit"
									class="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
									title="Tandai semua peserta berstatus HADIR"
								>
									<span class="material-symbols-outlined text-xs">done_all</span>
									<span>Tandai Semua Hadir</span>
								</button>
							</form>
							<form method="POST" action="?/completeSessionAndGenerateEvaluations" use:enhance class="inline">
								<input type="hidden" name="sessionId" value={activeSessionForAttendance.id} />
								<button
									type="submit"
									class="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
									title="Selesaikan Sesi & Buat Antrean Evaluasi Atasan Langsung"
								>
									<span class="material-symbols-outlined text-xs">verified</span>
									<span>Selesaikan Sesi & Buat Evaluasi</span>
								</button>
							</form>
						</div>
					</div>

					{#if currentSessionAttendances.length === 0}
						<div class="p-6 text-center rounded-2xl bg-surface-container border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs space-y-1">
							<span class="material-symbols-outlined text-2xl block text-slate-400">person_off</span>
							<p class="font-bold">Belum ada peserta yang terdaftar di sesi ini.</p>
							<p class="text-[11px]">Silakan tambahkan peserta baru melalui form di bawah.</p>
						</div>
					{:else}
						<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
							{#each currentSessionAttendances as att}
								<div class="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-surface-container/40 transition-colors">
									<div>
										<div class="flex items-center gap-2">
											<p class="font-bold text-xs text-on-surface">{att.employeeName}</p>
											<span class="px-2 py-0.2 rounded-md text-[9px] font-mono bg-surface-container text-slate-500">
												{att.payrollId}
											</span>
										</div>
										<p class="text-[10px] text-slate-400 mt-0.5">
											{att.department} {#if att.notes}• <span class="italic">{att.notes}</span>{/if}
										</p>
									</div>

									<!-- Quick Status Buttons Form -->
									<div class="flex items-center gap-1">
										{#each ['HADIR', 'IZIN', 'ALPA'] as st}
											<form method="POST" action="?/markAttendance" use:enhance class="inline">
												<input type="hidden" name="sessionId" value={activeSessionForAttendance.id} />
												<input type="hidden" name="payrollId" value={att.payrollId} />
												<input type="hidden" name="employeeName" value={att.employeeName} />
												<input type="hidden" name="department" value={att.department} />
												<input type="hidden" name="status" value={st} />
												<button
													type="submit"
													class="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-2xs
													{att.status === st
														? st === 'HADIR'
															? 'bg-emerald-600 text-white ring-2 ring-emerald-500/30'
															: st === 'IZIN'
															? 'bg-amber-500 text-slate-950 ring-2 ring-amber-500/30'
															: 'bg-rose-600 text-white ring-2 ring-rose-500/30'
														: 'bg-surface-container hover:bg-surface-container-high text-slate-500 border border-slate-200 dark:border-slate-700'}"
												>
													{st}
												</button>
											</form>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Form Tambah Peserta Baru (Multi-Select Checklist) -->
				<div class="p-3.5 rounded-2xl bg-surface-container-low border border-slate-200 dark:border-slate-800 space-y-3">
					<div class="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
						<div class="flex items-center gap-1.5">
							<span class="material-symbols-outlined text-sm text-primary">group_add</span>
							<h4 class="font-bold text-xs text-on-surface">
								Tambah Peserta ke Sesi Ini ({attendanceSelectedEmployeeIds.length} Karyawan Dipilih)
							</h4>
						</div>
						<div class="flex items-center gap-2">
							{#if availableAttendanceEmployees.length > 0}
								<button 
									type="button" 
									onclick={selectAllAvailableAttendanceEmployees}
									class="text-[10px] font-bold text-primary hover:underline cursor-pointer"
								>
									Pilih Semua ({availableAttendanceEmployees.length})
								</button>
							{/if}
							{#if attendanceSelectedEmployeeIds.length > 0}
								<button 
									type="button" 
									onclick={clearAllAttendanceEmployees}
									class="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
								>
									Reset
								</button>
							{/if}
						</div>
					</div>

					<form 
						method="POST" 
						action="?/addBatchAttendance" 
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								clearAllAttendanceEmployees();
							};
						}} 
						class="space-y-3 text-xs"
					>
						<input type="hidden" name="sessionId" value={activeSessionForAttendance.id} />
						<input 
							type="hidden" 
							name="employeesJson" 
							value={JSON.stringify(
								attendanceSelectedEmployees.map((e: any) => ({
									payrollId: e.payrollId,
									name: e.name,
									department: e.divisionName || e.department || activeSessionForAttendance.department || 'Operations'
								}))
							)} 
						/>

						<!-- Filter Divisi & Kolom Pencarian -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
							<div>
								<label class="font-bold text-on-surface block mb-1 text-[11px]">Filter Divisi Sasaran</label>
								<select
									bind:value={attendanceDivisionFilter}
									class="w-full px-2.5 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none"
								>
									<option value="">Semua Divisi ({activeEmployees.length} Karyawan)</option>
									{#each divisions as div}
										<option value={div.code}>{div.name} ({div.code})</option>
									{/each}
								</select>
							</div>

							<div>
								<label class="font-bold text-on-surface block mb-1 text-[11px]">Cari Karyawan</label>
								<div class="relative">
									<span class="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-xs">search</span>
									<input
										type="text"
										bind:value={attendanceSearchQuery}
										placeholder="Ketik nama atau NIK..."
										class="w-full pl-7 pr-7 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
									/>
									{#if attendanceSearchQuery}
										<button
											type="button"
											onclick={() => (attendanceSearchQuery = '')}
											class="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
											title="Hapus filter"
										>
											<span class="material-symbols-outlined text-xs">close</span>
										</button>
									{/if}
								</div>
							</div>
						</div>

						<!-- Daftar Karyawan Checkbox Grid (Scrollable Box) -->
						{#if availableAttendanceEmployees.length > 0}
							<div class="max-h-40 overflow-y-auto space-y-1 p-2 rounded-xl bg-surface border border-slate-200/80 dark:border-slate-700/80 divide-y divide-slate-100 dark:divide-slate-800/60">
								{#each availableAttendanceEmployees as emp}
									{@const isSelected = attendanceSelectedEmployeeIds.includes(emp.payrollId)}
									<button
										type="button"
										onclick={() => toggleAttendanceEmployee(emp.payrollId)}
										class="w-full text-left p-1.5 rounded-lg flex items-center justify-between transition-all cursor-pointer {isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface-container text-on-surface'}"
									>
										<div class="flex items-center gap-2 truncate">
											<div class="w-3.5 h-3.5 rounded flex items-center justify-center border {isSelected ? 'bg-primary border-primary text-on-primary' : 'border-slate-300 dark:border-slate-600 bg-surface'}">
												{#if isSelected}
													<span class="material-symbols-outlined text-[10px]">check</span>
												{/if}
											</div>
											<span class="truncate text-xs">{emp.name} ({emp.payrollId})</span>
										</div>
										<span class="text-[10px] text-slate-400 font-mono truncate">{emp.positionTitle || emp.divisionName || 'Staf'}</span>
									</button>
								{/each}
							</div>
						{:else}
							<div class="p-3 text-center rounded-xl bg-surface border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-[11px]">
								{attendanceSearchQuery || attendanceDivisionFilter ? 'Tidak ada karyawan yang cocok dengan pencarian / filter ini.' : 'Semua karyawan sudah terdaftar dalam sesi pelatihan ini.'}
							</div>
						{/if}

						<!-- Selected Chips Preview -->
						{#if attendanceSelectedEmployees.length > 0}
							<div class="space-y-1.5 pt-1">
								<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
									Peserta Baru Terpilih ({attendanceSelectedEmployees.length}):
								</p>
								<div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
									{#each attendanceSelectedEmployees as emp}
										<div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface border border-primary/30 text-primary text-[11px] font-medium">
											<span>{emp.name} ({emp.payrollId})</span>
											<button
												type="button"
												onclick={() => removeAttendanceEmployee(emp.payrollId)}
												class="hover:text-rose-500 cursor-pointer"
												title="Hapus"
											>
												<span class="material-symbols-outlined text-[12px]">close</span>
											</button>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Pengaturan Status Kehadiran & Catatan Presensi -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
							<div>
								<label class="font-bold text-on-surface block mb-1">Status Kehadiran Bersama *</label>
								<select name="status" class="w-full px-2.5 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 font-bold text-xs">
									<option value="HADIR">HADIR</option>
									<option value="IZIN">IZIN</option>
									<option value="ALPA">ALPA</option>
								</select>
							</div>

							<div>
								<label class="font-bold text-on-surface block mb-1">Catatan Presensi (Opsional)</label>
								<input 
									type="text" 
									name="notes" 
									placeholder="Catatan kehadiran / konfirmasi..." 
									class="w-full px-2.5 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs" 
								/>
							</div>
						</div>

						<div class="flex justify-end pt-1">
							<button 
								type="submit" 
								disabled={attendanceSelectedEmployeeIds.length === 0}
								class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
							>
								<span class="material-symbols-outlined text-sm">group_add</span>
								<span>
									{attendanceSelectedEmployeeIds.length > 0 
										? `+ Daftarkan ${attendanceSelectedEmployeeIds.length} Peserta Terpilih` 
										: '+ Daftarkan Peserta'}
								</span>
							</button>
						</div>
					</form>
				</div>
			</div>

			<div class="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
				<button type="button" onclick={() => (isAttendanceModalOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface cursor-pointer">
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL AUDIT 1: DETAIL EVALUASI LEVEL 4 PRE-TEST (10 HARI)                -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isL4PreDetailModalOpen && selectedL4PreDetail}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-500 text-xl">rule</span>
						<h3 class="font-black text-base text-on-surface">Rincian Evaluasi Level 4 Pre-Test (Baseline 10 Hari)</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">
						Karyawan: <strong>{selectedL4PreDetail.employeeName}</strong> ({selectedL4PreDetail.payrollId}) • {selectedL4PreDetail.courseTitle}
					</p>
				</div>
				<button type="button" onclick={() => (isL4PreDetailModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="p-6 overflow-y-auto space-y-5 text-xs">
				<!-- Informasi Karyawan & Atasan -->
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<div class="p-3 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60">
						<span class="text-slate-400 block text-[10px] uppercase font-bold">Atasan Penilai</span>
						<span class="font-bold text-on-surface truncate block mt-0.5">{selectedL4PreDetail.supervisorName}</span>
					</div>
					<div class="p-3 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60">
						<span class="text-slate-400 block text-[10px] uppercase font-bold">Kategori Skill</span>
						<span class="font-black text-blue-600 truncate block mt-0.5">{selectedL4PreDetail.l4PreSkillCategory}</span>
					</div>
					<div class="p-3 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60">
						<span class="text-slate-400 block text-[10px] uppercase font-bold">Status Evaluasi</span>
						<span class="px-2 py-0.5 rounded-md text-[10px] font-bold mt-1 inline-block
							{selectedL4PreDetail.l4PreStatus === 'REVIEWED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}">
							{selectedL4PreDetail.l4PreStatus}
						</span>
					</div>
					<div class="p-3 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60">
						<span class="text-slate-400 block text-[10px] uppercase font-bold">Rata-rata Baseline</span>
						<span class="text-sm font-black text-amber-500 font-mono block mt-0.5">
							★ {calcPreBaselineAvg(selectedL4PreDetail.l4PreMetrics)} / 5.0
						</span>
					</div>
				</div>

				<!-- Indikator Metrik Baseline Pre-Test -->
				<div class="space-y-3">
					<h4 class="font-black text-xs uppercase tracking-wider text-slate-400">4 Indikator Metrik Kinerja (Baseline Awal)</h4>
					{#each (l4IndicatorsByCategory[selectedL4PreDetail.l4PreSkillCategory] || l4IndicatorsByCategory['Technical Skill']) as indicator, idx}
						{@const score = getPreMetricValue(selectedL4PreDetail.l4PreMetrics, idx)}
						<div class="p-3.5 rounded-2xl bg-surface-container/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-4">
							<div class="space-y-0.5">
								<p class="font-bold text-on-surface">{idx + 1}. {indicator.label}</p>
								<p class="text-[11px] text-on-surface-variant">{indicator.desc}</p>
							</div>
							<div class="text-right shrink-0">
								<span class="px-3 py-1 rounded-xl text-xs font-black font-mono
									{score >= 4 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : score === 3 ? 'bg-amber-500/15 text-amber-600' : 'bg-rose-500/15 text-rose-600'}">
									{score > 0 ? `Skor: ${score} / 5` : 'Belum Diisi'}
								</span>
							</div>
						</div>
					{/each}
				</div>

				<!-- Catatan & Ekspektasi Atasan -->
				<div class="p-4 rounded-2xl bg-surface-container-high/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
					<span class="font-bold text-slate-400 block text-[10px] uppercase">Catatan & Ekspektasi Atasan Langsung</span>
					<p class="text-xs text-on-surface italic">{selectedL4PreDetail.l4PreNotes || 'Tidak ada catatan khusus yang dilampirkan atasan.'}</p>
				</div>
			</div>

			<div class="flex justify-end p-4 border-t border-slate-200 dark:border-slate-800 bg-surface">
				<button type="button" onclick={() => (isL4PreDetailModalOpen = false)} class="px-5 py-2 rounded-xl bg-surface-container border text-xs font-bold hover:bg-surface-container-high cursor-pointer">
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL AUDIT 2: DETAIL EVALUASI LEVEL 3 BEHAVIOR (15 BUTIR - 3 BULAN)     -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isL3DetailModalOpen && selectedL3Detail}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-500 text-xl">psychology</span>
						<h3 class="font-black text-base text-on-surface">Rincian Evaluasi Level 3 Behavior (Observasi 3 Bulan)</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">
						Karyawan: <strong>{selectedL3Detail.employeeName}</strong> ({selectedL3Detail.payrollId}) • {selectedL3Detail.courseTitle}
					</p>
				</div>
				<button type="button" onclick={() => (isL3DetailModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="p-6 overflow-y-auto space-y-6 text-xs">
				<!-- Header Info -->
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<div class="p-3 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60">
						<span class="text-slate-400 block text-[10px] uppercase font-bold">Atasan Penilai</span>
						<span class="font-bold text-on-surface truncate block mt-0.5">{selectedL3Detail.supervisorName}</span>
					</div>
					<div class="p-3 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60">
						<span class="text-slate-400 block text-[10px] uppercase font-bold">Tgl Selesai Training</span>
						<span class="font-mono text-on-surface block mt-0.5">{selectedL3Detail.trainingCompletedAt || '-'}</span>
					</div>
					<div class="p-3 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60">
						<span class="text-slate-400 block text-[10px] uppercase font-bold">Due Date (H+90)</span>
						<span class="font-mono text-on-surface block mt-0.5">{selectedL3Detail.dueDate || '-'}</span>
					</div>
					<div class="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
						<span class="text-slate-400 block text-[10px] uppercase font-bold">Rata-rata Skor</span>
						<span class="text-base font-black text-emerald-600 font-mono block mt-0.5">
							★ {selectedL3Detail.l3AvgScore ? Number(selectedL3Detail.l3AvgScore).toFixed(2) : '-'} / 3.00
						</span>
					</div>
				</div>

				<!-- 15 Butir Perilaku dalam 3 Aspek -->
				{#each l3BehaviorQuestions as section}
					<div class="space-y-3">
						<div class="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
							<span class="material-symbols-outlined text-sm">{section.icon}</span>
							<h4 class="font-black text-xs uppercase tracking-wider text-on-surface">{section.aspect}</h4>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-bold {section.aspectBadge}">5 Butir</span>
						</div>

						<div class="space-y-2">
							{#each section.items as item}
								{@const ans = selectedL3Detail.l3Answers?.[item.id]}
								<div class="p-3 rounded-2xl bg-surface-container/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-4">
									<div class="space-y-0.5">
										<p class="font-bold text-on-surface">{item.title}</p>
										<p class="text-[11px] text-on-surface-variant">{item.desc}</p>
									</div>
									<div class="shrink-0">
										{#if ans === 3}
											<span class="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
												<span class="material-symbols-outlined text-xs">sentiment_satisfied</span>
												<span>3 - Lebih Baik</span>
											</span>
										{:else if ans === 2}
											<span class="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/15 text-amber-600 flex items-center gap-1">
												<span class="material-symbols-outlined text-xs">sentiment_neutral</span>
												<span>2 - Sedikit Berubah</span>
											</span>
										{:else if ans === 1}
											<span class="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-500/15 text-rose-600 flex items-center gap-1">
												<span class="material-symbols-outlined text-xs">sentiment_dissatisfied</span>
												<span>1 - Tidak Lebih Baik</span>
											</span>
										{:else}
											<span class="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-400">
												Belum Dinilai
											</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}

				<!-- Saran & Feedback Atasan -->
				<div class="p-4 rounded-2xl bg-surface-container-high/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
					<span class="font-bold text-slate-400 block text-[10px] uppercase">Saran & Masukan Atasan Langsung</span>
					<p class="text-xs text-on-surface italic">{selectedL3Detail.l3Feedback || 'Belum ada saran/masukan tertulis.'}</p>
				</div>
			</div>

			<div class="flex justify-end p-4 border-t border-slate-200 dark:border-slate-800 bg-surface">
				<button type="button" onclick={() => (isL3DetailModalOpen = false)} class="px-5 py-2 rounded-xl bg-surface-container border text-xs font-bold hover:bg-surface-container-high cursor-pointer">
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL AUDIT 3: DETAIL KOMPARASI LEVEL 4 POST-TEST (BEFORE VS AFTER)      -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isL4PostDetailModalOpen && selectedL4PostDetail}
	{@const preAvg = calcPreBaselineAvg(selectedL4PostDetail.l4PreMetrics)}
	{@const postAvg = calcPostAvg(selectedL4PostDetail.l4PostMetrics)}
	{@const delta = calcDeltaPercent(preAvg, postAvg)}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-purple-500 text-xl">trending_up</span>
						<h3 class="font-black text-base text-on-surface">Komparasi Evaluasi Level 4 (Before vs After 3 Bulan)</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">
						Karyawan: <strong>{selectedL4PostDetail.employeeName}</strong> ({selectedL4PostDetail.payrollId}) • {selectedL4PostDetail.courseTitle}
					</p>
				</div>
				<button type="button" onclick={() => (isL4PostDetailModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="p-6 overflow-y-auto space-y-6 text-xs">
				<!-- Komparasi Ringkas Skor Global -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
						<span class="text-slate-400 block text-[10px] uppercase font-bold">1. Baseline Pre-Test (Sebelum)</span>
						<span class="text-xl font-black text-amber-600 font-mono block mt-1">
							★ {preAvg || '-'} / 5.0
						</span>
					</div>
					<div class="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
						<span class="text-slate-400 block text-[10px] uppercase font-bold">2. Aktual Post-Test (3 Bulan)</span>
						<span class="text-xl font-black text-purple-600 font-mono block mt-1">
							★ {postAvg || '-'} / 5.0
						</span>
					</div>
					<div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
						<span class="text-slate-400 block text-[10px] uppercase font-bold">3. Delta Peningkatan (%)</span>
						<span class="text-xl font-black text-emerald-600 font-mono block mt-1">
							{delta >= 0 ? `+${delta}%` : `${delta}%`}
						</span>
					</div>
				</div>

				<!-- Kartu Komparasi 4 Indikator Berdampingan -->
				<div class="space-y-3">
					<div class="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
						<h4 class="font-black text-xs uppercase tracking-wider text-on-surface">
							Komparasi 4 Indikator: {selectedL4PostDetail.l4PreSkillCategory}
						</h4>
						<span class="text-[10px] text-slate-400">Baseline Pre-Test vs Aktual Post-Test</span>
					</div>

					{#each (l4IndicatorsByCategory[selectedL4PostDetail.l4PreSkillCategory] || l4IndicatorsByCategory['Technical Skill']) as indicator, idx}
						{@const preScore = getPreMetricValue(selectedL4PostDetail.l4PreMetrics, idx)}
						{@const postScore = getPostMetricValue(selectedL4PostDetail.l4PostMetrics, idx)}
						{@const diff = postScore > 0 && preScore > 0 ? postScore - preScore : null}
						<div class="p-4 rounded-2xl bg-surface-container/60 border border-slate-200/60 dark:border-slate-800/60 space-y-3">
							<div class="flex items-center justify-between">
								<div>
									<p class="font-bold text-on-surface">{idx + 1}. {indicator.label}</p>
									<p class="text-[11px] text-on-surface-variant">{indicator.desc}</p>
								</div>
								{#if diff !== null}
									<span class="px-2.5 py-1 rounded-xl text-xs font-mono font-black
										{diff > 0 ? 'bg-emerald-500/15 text-emerald-600' : diff === 0 ? 'bg-slate-200 dark:bg-slate-800 text-slate-500' : 'bg-rose-500/15 text-rose-600'}">
										{diff > 0 ? `+${diff}` : diff} Poin
									</span>
								{/if}
							</div>

							<div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
								<!-- Kolom Baseline Pre-Test -->
								<div class="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
									<span class="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Baseline Pre-Test:</span>
									<span class="font-mono font-bold text-amber-600">{preScore > 0 ? `${preScore} / 5` : '-'}</span>
								</div>
								<!-- Kolom Aktual Post-Test -->
								<div class="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center justify-between">
									<span class="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase">Aktual Post-Test:</span>
									<span class="font-mono font-bold text-purple-600">{postScore > 0 ? `${postScore} / 5` : '-'}</span>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Catatan Rekomendasi & Hasil Bisnis -->
				<div class="p-4 rounded-2xl bg-surface-container-high/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
					<span class="font-bold text-slate-400 block text-[10px] uppercase">Rekomendasi & Bukti Dampak Lapangan Atasan</span>
					<p class="text-xs text-on-surface italic">{selectedL4PostDetail.l4PostNotes || 'Tidak ada catatan tambahan dari atasan.'}</p>
				</div>
			</div>

			<div class="flex justify-end p-4 border-t border-slate-200 dark:border-slate-800 bg-surface">
				<button type="button" onclick={() => (isL4PostDetailModalOpen = false)} class="px-5 py-2 rounded-xl bg-surface-container border text-xs font-bold hover:bg-surface-container-high cursor-pointer">
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 6: FORM PENGAJUAN TRAINING BY REQUEST                             -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isRequestModalOpen}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<h3 class="font-black text-base text-on-surface">Pengajuan Kebutuhan Pelatihan (Dept Head)</h3>
				<button type="button" onclick={() => (isRequestModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/requestTraining" use:enhance class="space-y-3.5 text-xs">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="font-bold text-on-surface block mb-1">Departemen Pengusul *</label>
						<input type="text" name="deptName" required value="Operations & Dispatch" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800" />
					</div>

					<div>
						<label class="font-bold text-on-surface block mb-1">Nama Pengusul (Head Dept) *</label>
						<input type="text" name="requestedBy" required placeholder="Nama Kepala Departemen..." class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800" />
					</div>
				</div>

				<div>
					<label class="font-bold text-on-surface block mb-1">Judul Pelatihan yang Dibutuhkan *</label>
					<input type="text" name="trainingTitle" required placeholder="Contoh: Sertifikasi Penanganan Muatan B3..." class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800" />
				</div>

				<div class="grid grid-cols-3 gap-2">
					<div>
						<label class="font-bold text-on-surface block mb-1">Kategori</label>
						<select name="category" class="w-full px-2 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800">
							<option value="Technical">Technical</option>
							<option value="QHSE & Safety">QHSE & Safety</option>
							<option value="Operations">Operations</option>
						</select>
					</div>

					<div>
						<label class="font-bold text-on-surface block mb-1">Tingkat Urgensi</label>
						<select name="urgency" class="w-full px-2 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 font-bold">
							<option value="NORMAL">Normal</option>
							<option value="HIGH">Tinggi</option>
							<option value="CRITICAL">Kritis / Audit</option>
						</select>
					</div>

					<div>
						<label class="font-bold text-on-surface block mb-1">Estimasi Peserta</label>
						<input type="number" name="estimatedParticipants" value="10" min="1" class="w-full px-2 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 font-mono" />
					</div>
				</div>

				<div>
					<label class="font-bold text-on-surface block mb-1">Justifikasi Kebutuhan & Target Kompetensi *</label>
					<textarea name="justification" required rows="3" placeholder="Uraikan alasan urgensi (misal: syarat kepatuhan audit kustomer B3)..." class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 resize-none"></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => (isRequestModalOpen = false)} class="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-surface-container">
						Batal
					</button>
					<button type="submit" class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1">
						<span class="material-symbols-outlined text-sm">send</span>
						<span>Kirim Pengajuan ke HRD</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 6B: REVIEW STATUS USULAN PELATIHAN OLEH HRD (PENDING, APPROVED, HOLD) -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isReviewRequestModalOpen && selectedRequestForReview}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-xl">fact_check</span>
						<h3 class="font-black text-base text-on-surface">Review Status Usulan Pelatihan</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">
						No: <strong>{selectedRequestForReview.id}</strong> • {selectedRequestForReview.deptName}
					</p>
				</div>
				<button
					type="button"
					onclick={() => (isReviewRequestModalOpen = false)}
					class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-on-surface cursor-pointer"
				>
					<span class="material-symbols-outlined text-sm">close</span>
				</button>
			</div>

			<!-- Info Singkat Request -->
			<div class="p-3.5 rounded-2xl bg-surface-container/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1.5 text-xs">
				<div class="flex items-center justify-between">
					<span class="text-slate-400 font-bold uppercase text-[10px]">Judul Pelatihan:</span>
					<span class="font-bold text-on-surface text-right">{selectedRequestForReview.trainingTitle}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-slate-400 font-bold uppercase text-[10px]">Pengusul:</span>
					<span class="text-slate-600 dark:text-slate-300 font-medium">{selectedRequestForReview.requestedBy}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-slate-400 font-bold uppercase text-[10px]">Estimasi Peserta & Target:</span>
					<span class="font-mono text-slate-500">{selectedRequestForReview.estimatedParticipants} Orang • Target: {selectedRequestForReview.targetCompletionDate || '-'}</span>
				</div>
				{#if selectedRequestForReview.justification}
					<div class="pt-1 border-t border-slate-200/40 dark:border-slate-800/40">
						<span class="text-slate-400 font-bold uppercase text-[10px] block mb-0.5">Alasan Kebutuhan:</span>
						<p class="text-[11px] text-slate-600 dark:text-slate-300 italic">{selectedRequestForReview.justification}</p>
					</div>
				{/if}
			</div>

			<form
				method="POST"
				action="?/updateTrainingRequestStatus"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							notifySuccess((result.data as any)?.message || 'Status usulan pelatihan berhasil diperbarui!');
							isReviewRequestModalOpen = false;
							await update();
						} else {
							notifyError((result.data as any)?.message || 'Gagal memperbarui status usulan pelatihan.');
						}
					};
				}}
				class="space-y-4 text-xs"
			>
				<input type="hidden" name="id" value={selectedRequestForReview.id} />
				<input type="hidden" name="reviewedBy" value="HRD Administrator" />

				<!-- Pilihan Status 3 Opsi (PENDING, APPROVED, HOLD) -->
				<div>
					<label class="font-bold text-on-surface block mb-2 uppercase text-[10px] tracking-wider text-slate-400">
						Tentukan Keputusan HRD *
					</label>
					<div class="grid grid-cols-3 gap-2">
						<!-- PENDING -->
						<label class="p-3 rounded-2xl border text-center cursor-pointer transition-all flex flex-col items-center gap-1
							{reviewStatus === 'PENDING'
								? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30'
								: 'bg-surface-container border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-surface-container-high'}">
							<input type="radio" name="status" value="PENDING" bind:group={reviewStatus} class="sr-only" />
							<span class="material-symbols-outlined text-base">pending</span>
							<span class="font-black text-xs">PENDING</span>
							<span class="text-[9px] opacity-75">Dalam Antrean</span>
						</label>

						<!-- APPROVED -->
						<label class="p-3 rounded-2xl border text-center cursor-pointer transition-all flex flex-col items-center gap-1
							{reviewStatus === 'APPROVED'
								? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30'
								: 'bg-surface-container border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-surface-container-high'}">
							<input type="radio" name="status" value="APPROVED" bind:group={reviewStatus} class="sr-only" />
							<span class="material-symbols-outlined text-base">check_circle</span>
							<span class="font-black text-xs">APPROVED</span>
							<span class="text-[9px] opacity-75">Disetujui</span>
						</label>

						<!-- HOLD -->
						<label class="p-3 rounded-2xl border text-center cursor-pointer transition-all flex flex-col items-center gap-1
							{reviewStatus === 'HOLD'
								? 'bg-orange-500/15 border-orange-500 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/30'
								: 'bg-surface-container border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-surface-container-high'}">
							<input type="radio" name="status" value="HOLD" bind:group={reviewStatus} class="sr-only" />
							<span class="material-symbols-outlined text-base">pause_circle</span>
							<span class="font-black text-xs">HOLD</span>
							<span class="text-[9px] opacity-75">Ditunda / Anggaran</span>
						</label>
					</div>
				</div>

				<!-- Catatan / Feedback HRD -->
				<div>
					<label class="font-bold text-on-surface block mb-1 uppercase text-[10px] tracking-wider text-slate-400">
						Catatan / Alasan Peninjauan HRD
					</label>
					<textarea
						name="hrdNotes"
						bind:value={reviewHrdNotes}
						rows="3"
						placeholder="Misal: Disetujui masuk agenda batch bulan depan, atau ditunda menunggu ketersediaan instruktur eksternal..."
						class="w-full p-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary resize-none"
					></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button
						type="button"
						onclick={() => (isReviewRequestModalOpen = false)}
						class="px-4 py-2 rounded-xl bg-surface-container border text-xs font-bold hover:bg-surface-container-high cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
					>
						<span class="material-symbols-outlined text-sm">save</span>
						<span>Simpan Keputusan Review</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 7: UJIAN KEPATUHAN SAFETY K3 TAHUNAN                              -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isSafetyTestModalOpen}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<h3 class="font-black text-base text-on-surface">Ujian Kepatuhan Safety K3 Tahunan 2026</h3>
					<p class="text-xs text-on-surface-variant">Ujian wajib keselamatan kerja untuk pengemudi & staf operasional</p>
				</div>
				<button type="button" onclick={() => (isSafetyTestModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/submitSafetyTest" use:enhance class="space-y-4 text-xs">
				<div class="p-3 rounded-xl bg-surface-container space-y-2">
					<p class="font-bold text-on-surface">Soal 1: Jika terjadi kebakaran kecil pada kabin armada, tindakan pemadaman yang tepat menggunakan APAR adalah:</p>
					<div class="space-y-1.5">
						<label class="flex items-center gap-2 cursor-pointer">
							<input type="radio" name="sq1" checked class="text-primary" />
							<span>Tarik pin, arahkan nozzle ke pangkal api, tekan tuas, dan sapukan merata</span>
						</label>
						<label class="flex items-center gap-2 cursor-pointer">
							<input type="radio" name="sq1" class="text-primary" />
							<span>Semprotkan ke ujung lidah api dari jarak jauh</span>
						</label>
					</div>
				</div>

				<div class="p-3 rounded-xl bg-surface-container space-y-2">
					<p class="font-bold text-on-surface">Soal 2: Berapa jam maksimal waktu berkendara terus menerus tanpa istirahat sesuai regulasi keselamatan transportasi?</p>
					<div class="space-y-1.5">
						<label class="flex items-center gap-2 cursor-pointer">
							<input type="radio" name="sq2" checked class="text-primary" />
							<span>Maksimal 4 jam berturut-turut, wajib istirahat minimal 30 menit</span>
						</label>
						<label class="flex items-center gap-2 cursor-pointer">
							<input type="radio" name="sq2" class="text-primary" />
							<span>Boleh 8 jam jika tidak merasa mengantuk</span>
						</label>
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => (isSafetyTestModalOpen = false)} class="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-surface-container">
						Batal
					</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 flex items-center gap-1">
						<span class="material-symbols-outlined text-sm">verified</span>
						<span>Kirim Jawaban Ujian K3</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 8: E-SERTIFIKAT RESMI PT BCS LOGISTICS (SIAP CETAK A4 LANDSCAPE)   -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isCertModalOpen && activeCertData}
	<div class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
		<!-- Action Bar (Hidden during print) -->
		<div class="no-print fixed top-4 right-4 z-50 flex items-center gap-3">
			<button
				type="button"
				onclick={() => window.print()}
				class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
			>
				<span class="material-symbols-outlined text-base">print</span>
				<span>Cetak Sertifikat Resmi (A4 Landscape)</span>
			</button>

			<button
				type="button"
				onclick={() => (isCertModalOpen = false)}
				class="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-xl">close</span>
			</button>
		</div>

		<!-- Certificate Canvas (A4 Landscape: 297mm x 210mm) -->
		<div class="print-container bg-white text-slate-900 mx-auto shadow-2xl relative overflow-hidden"
			style="width: 297mm; min-height: 210mm; padding: 12mm 15mm; box-sizing: border-box; border: 8px double #1e3a8a;">
			
			<!-- Inner Decorative Border -->
			<div class="h-full border-2 border-amber-600/40 p-8 flex flex-col justify-between relative">
				<!-- Watermark Background Logo -->
				<div class="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
					<img src="https://bcs-logistics.co.id/assets/images/logoo.png" alt="BCS Watermark" class="w-96 object-contain" />
				</div>

				<!-- Certificate Header -->
				<div class="text-center space-y-1 relative">
					<div class="flex justify-center mb-2">
						<img src="https://bcs-logistics.co.id/assets/images/logoo.png" alt="BCS Logistics Logo" class="h-10 object-contain" />
					</div>
					<h2 class="text-xs font-black tracking-[0.3em] uppercase text-blue-950">PT. BUANA CENTRA SWAKARSA LOGISTICS</h2>
					<h1 class="text-3xl font-serif font-black tracking-wider text-amber-700 uppercase mt-2">SERTIFIKAT KELULUSAN</h1>
					<p class="text-[10px] font-mono tracking-widest text-slate-500 uppercase">NO. REGISTRASI: {activeCertData.certificateNumber}</p>
				</div>

				<!-- Certificate Body -->
				<div class="text-center space-y-3 relative my-4">
					<p class="text-xs font-medium text-slate-600">Diberikan secara sah dan terhormat kepada:</p>
					<h3 class="text-2xl font-black font-serif tracking-tight text-slate-900 uppercase border-b-2 border-amber-600/40 inline-block px-8 pb-1">
						{activeCertData.employeeName}
					</h3>
					<p class="text-xs font-mono text-slate-500">PAYROLL ID: {activeCertData.payrollId}</p>

					<p class="text-xs text-slate-700 max-w-2xl mx-auto leading-relaxed pt-2">
						Atas kelulusan dan keberhasilan menyelesaikan program sertifikasi kompetensi:
					</p>
					<h4 class="text-lg font-black text-blue-950 tracking-tight">
						"{activeCertData.courseTitle}"
					</h4>
					<p class="text-xs font-bold text-slate-600">
						Kategori: <span class="text-amber-700">{activeCertData.category}</span> • Nilai Kelulusan: <strong class="font-mono text-emerald-700">{activeCertData.score}/100</strong>
					</p>
				</div>

				<!-- Certificate Footer Signatures & QR -->
				<div class="grid grid-cols-3 items-end pt-4 border-t border-slate-300 relative text-xs">
					<!-- QR Code Authentication -->
					<div class="flex items-center gap-3">
						<div class="w-16 h-16 bg-slate-100 border border-slate-300 p-1 flex items-center justify-center shadow-xs">
							<img
								src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(activeCertData.qrVerifyUrl || 'https://academy.bcslabs.tech')}`}
								alt="QR Code Verification"
								class="w-full h-full object-contain"
							/>
						</div>
						<div class="text-[9px] text-slate-500 leading-tight">
							<p class="font-bold text-slate-700">Digital Authenticated</p>
							<p>Scan untuk verifikasi keaslian di Portal BCS Academy</p>
							<p class="font-mono text-[8px] text-slate-400 truncate max-w-[140px]">{activeCertData.qrVerifyUrl}</p>
						</div>
					</div>

					<!-- Date, City & Validity Note -->
					<div class="text-center text-[11px] text-slate-600 space-y-1">
						<p class="leading-tight text-slate-500">Diterbitkan di Cilegon, Banten</p>
						<p class="font-bold text-slate-900 text-xs leading-tight">{formatIndonesianDate(activeCertData.issuedAt)}</p>
						<div class="mt-1.5 inline-flex flex-col items-center justify-center px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-300/80 shadow-2xs">
							<span class="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
								<span class="material-symbols-outlined text-[12px] text-amber-700">verified</span>
								<span>Masa Berlaku: 1 (Satu) Tahun</span>
							</span>
							<span class="text-[9px] text-amber-800/90 font-medium">
								Terhitung sejak diterbitkan (s/d {getCertificateValidity(activeCertData).validUntilFormatted})
							</span>
						</div>
					</div>

					<!-- Signature -->
					<div class="text-center flex flex-col items-center">
						<p class="text-[10px] text-slate-500">PT. Buana Centra Swakarsa Logistics</p>
						<div class="h-12 flex items-center justify-center">
							<span class="font-serif italic text-blue-950 font-bold text-sm tracking-wider">[ Authorized Sign ]</span>
						</div>
						<p class="font-bold text-slate-900 border-b border-slate-800 pb-0.5 px-4 text-xs">Ir. Bambang Trihatmojo</p>
						<p class="text-[9px] text-slate-500">Direktur SDM & Operasional</p>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 9: INPUT ASESMEN AKTUAL KARYAWAN TNA                              -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isAssessmentModalOpen}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150 my-8">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<h3 class="font-black text-base text-on-surface">Input TNA Evaluation & Employee Assessment</h3>
					<p class="text-xs text-on-surface-variant">Assessment of employee actual proficiency against job standard</p>
				</div>
				<button type="button" onclick={() => (isAssessmentModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/submitEmployeeAssessment"
				use:enhance={() => {
					isSubmittingAssessment = true;
					return async ({ result, update }) => {
						isSubmittingAssessment = false;
						if (result.type === 'success') {
							const resData = result.data as any;
							if (resData?.success === false) {
								notifyError('Gagal Menyimpan Asesmen', resData?.message || 'Terjadi kesalahan saat menyimpan asesmen.');
							} else {
								notifySuccess('Asesmen Berhasil Disimpan', resData?.message || 'Data evaluasi karyawan berhasil disimpan ke database.');
								isAssessmentModalOpen = false;
								await update();
							}
						} else if (result.type === 'failure') {
							const resData = result.data as any;
							notifyError('Gagal Menyimpan Asesmen', resData?.message || 'Formulir asesmen tidak valid.');
						} else if (result.type === 'error') {
							notifyError('Kesalahan Server', (result.error as any)?.message || 'Terjadi kesalahan sistem pada server.');
						}
					};
				}}
				class="space-y-4 text-xs"
			>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Payroll ID / NIP *</label>
						<input
							type="text"
							name="payrollId"
							bind:value={assessmentForm.payrollId}
							required
							class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs font-mono"
							placeholder="EMP-0042"
						/>
					</div>

					<div class="space-y-1">
						<label class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Nama Karyawan *</label>
						<input
							type="text"
							name="employeeName"
							bind:value={assessmentForm.employeeName}
							required
							class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs font-bold"
							placeholder="Guntoro Muhamad"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Jabatan / Posisi *</label>
						<input
							type="text"
							name="positionTitle"
							bind:value={assessmentForm.positionTitle}
							required
							class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs"
							placeholder="Driver Tronton / Trailer"
						/>
					</div>

					<div class="space-y-1">
						<label class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Departemen *</label>
						<select
							name="department"
							bind:value={assessmentForm.department}
							class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs"
						>
							<option value="Operations">Operations</option>
							<option value="Workshop & Maintenance">Workshop & Maintenance</option>
							<option value="Labour Project 1 & Warehouse">Labour Project 1 & Warehouse</option>
							<option value="Finance & Operations">Finance & Operations</option>
							<option value="QHSE & Safety">QHSE & Safety</option>
						</select>
					</div>
				</div>

				<div class="space-y-1">
					<label class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Kompetensi yang Dinilai *</label>
					<select
						name="competencyCode"
						bind:value={assessmentForm.competencyCode}
						onchange={() => {
							const matched = jobStandards.find((j: any) => j.competencyCode === assessmentForm.competencyCode);
							if (matched) {
								assessmentForm.requiredLevel = matched.requiredLevel;
							}
						}}
						class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs font-bold"
					>
						{#each competencyLibrary as comp}
							<option value={comp.code}>[{comp.code}] {comp.name} ({comp.aspect})</option>
						{/each}
					</select>
				</div>

				<!-- Scoring Matrix Level -->
				<div class="p-4 rounded-2xl bg-surface-container-high/60 border border-slate-200/60 dark:border-slate-800/60 space-y-3">
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-1">
							<label class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Standar Target (Required)</label>
							<select
								name="requiredLevel"
								bind:value={assessmentForm.requiredLevel}
								class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold"
							>
								<option value={1}>Level 1 - Pemula / SOP Dasar</option>
								<option value={2}>Level 2 - Rutin Mandiri</option>
								<option value={3}>Level 3 - Problem Solving Operasional</option>
								<option value={4}>Level 4 - Evaluasi & Supervisi</option>
								<option value={5}>Level 5 - Expert / Inovator</option>
							</select>
						</div>

						<div class="space-y-1">
							<label class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Nilai Aktual Karyawan (Actual)</label>
							<select
								name="actualLevel"
								bind:value={assessmentForm.actualLevel}
								class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold"
							>
								<option value={1}>Level 1 - Pemula / SOP Dasar</option>
								<option value={2}>Level 2 - Rutin Mandiri</option>
								<option value={3}>Level 3 - Problem Solving Operasional</option>
								<option value={4}>Level 4 - Evaluasi & Supervisi</option>
								<option value={5}>Level 5 - Expert / Inovator</option>
							</select>
						</div>
					</div>

					<!-- Realtime GAP Indicator Preview -->
					<div class="p-3 rounded-xl bg-surface flex items-center justify-between border border-slate-200 dark:border-slate-800">
						<div>
							<span class="text-[10px] text-slate-400 font-bold uppercase">Kalkulasi GAP:</span>
							<p class="text-xs font-medium text-slate-600 dark:text-slate-300">
								Aktual ({assessmentForm.actualLevel}) - Standar ({assessmentForm.requiredLevel}) = 
								<strong class="font-mono text-sm {Number(assessmentForm.actualLevel) - Number(assessmentForm.requiredLevel) >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
									{Number(assessmentForm.actualLevel) - Number(assessmentForm.requiredLevel) >= 0 ? `+${Number(assessmentForm.actualLevel) - Number(assessmentForm.requiredLevel)}` : Number(assessmentForm.actualLevel) - Number(assessmentForm.requiredLevel)}
								</strong>
							</p>
						</div>

						<div>
							{#if Number(assessmentForm.actualLevel) - Number(assessmentForm.requiredLevel) >= 0}
								<span class="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
									✓ Qualified
								</span>
							{:else}
								<span class="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 animate-pulse">
									⚠ Gap Competency
								</span>
							{/if}
						</div>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Nama Assessor / Atasan *</label>
						<input
							type="text"
							name="assessorName"
							bind:value={assessmentForm.assessorName}
							required
							class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs"
						/>
					</div>

					<div class="space-y-1">
						<label class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Assessment Notes</label>
						<input
							type="text"
							name="notes"
							bind:value={assessmentForm.notes}
							class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs"
							placeholder="Catatan observasi lapangan..."
						/>
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => (isAssessmentModalOpen = false)} class="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-surface-container">
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmittingAssessment}
						class="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
					>
						{#if isSubmittingAssessment}
							<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
							<span>Menyimpan Asesmen...</span>
						{:else}
							<span class="material-symbols-outlined text-sm">save</span>
							<span>Save TNA Assessment</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 10: TAMBAH KAMUS KOMPETENSI RESMI (LIBRARY)                       -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isCompetencyModalOpen}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150 my-8">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<h3 class="font-black text-base text-on-surface">Tambah Kamus Kompetensi Baru</h3>
					<p class="text-xs text-on-surface-variant">Taksonomi kompetensi standar PT Buana Centra Swakarsa</p>
				</div>
				<button type="button" onclick={() => (isCompetencyModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/saveCompetency" use:enhance class="space-y-4 text-xs">
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Kode Kompetensi *</label>
						<input
							type="text"
							name="code"
							bind:value={competencyForm.code}
							required
							class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold uppercase"
							placeholder="misal: Q10"
						/>
					</div>

					<div class="space-y-1">
						<label class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Aspek Kompetensi *</label>
						<select
							name="aspect"
							bind:value={competencyForm.aspect}
							class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs"
						>
							<option value="Core Competency">Core Competency</option>
							<option value="Behavioral Competency">Behavioral Competency</option>
							<option value="Technical Competency">Technical Competency</option>
						</select>
					</div>
				</div>

				<div class="space-y-1">
					<label class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Nama Kompetensi *</label>
					<input
						type="text"
						name="name"
						bind:value={competencyForm.name}
						required
						class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs font-bold"
						placeholder="misal: Organization Development & Talent Management"
					/>
				</div>

				<div class="space-y-1">
					<label class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Default Kursus LMS Saat Terjadi GAP</label>
					<select
						name="defaultCourseId"
						bind:value={competencyForm.defaultCourseId}
						class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs"
					>
						<option value="">-- Pilih Kursus Rekomendasi --</option>
						{#each courses as c}
							<option value={c.id}>[{c.id}] {c.title} ({c.category})</option>
						{/each}
					</select>
				</div>

				<!-- Indikator Perilaku Level 1-5 -->
				<div class="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
					<p class="font-bold text-on-surface uppercase tracking-wider text-[10px]">Deskripsi Rubrik Perilaku (Level 1 s.d. Level 5):</p>
					
					<div class="space-y-2">
						<input type="text" name="level1" placeholder="Level 1: Mengetahui dan memahami SOP dasar..." class="w-full px-3 py-1.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs" />
						<input type="text" name="level2" placeholder="Level 2: Mampu menerapkan dalam pekerjaan mandiri..." class="w-full px-3 py-1.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs" />
						<input type="text" name="level3" placeholder="Level 3: Mampu menyelesaikan masalah operasional & memodifikasi prosedur..." class="w-full px-3 py-1.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs" />
						<input type="text" name="level4" placeholder="Level 4: Mampu menganalisa peluang peningkatan sistem dan membimbing rekan..." class="w-full px-3 py-1.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs" />
						<input type="text" name="level5" placeholder="Level 5: Menjadi rujukan ahli (SME) dan perumus inovasi strategis..." class="w-full px-3 py-1.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs" />
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => (isCompetencyModalOpen = false)} class="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-surface-container">
						Batal
					</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 flex items-center gap-1.5">
						<span class="material-symbols-outlined text-sm">check_circle</span>
						<span>Simpan ke Kamus Kompetensi</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 11: TETAPKAN STANDAR KOMPETENSI JABATAN                           -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isJobStandardModalOpen}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
			<!-- Header Modal -->
			<div class="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
				<div class="space-y-0.5">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-xl">tune</span>
						<h3 class="font-black text-base text-on-surface">Tetapkan Standar Kompetensi Jabatan</h3>
					</div>
					<p class="text-xs text-on-surface-variant">Pilih divisi, jabatan, dan tentukan target level kompetensi wajib secara multi-select</p>
				</div>
				<button type="button" onclick={() => (isJobStandardModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Form Batch Multi-Select -->
			<form
				method="POST"
				action="?/saveJobStandardsBatch"
				use:enhance={() => {
					isSubmittingJobStandard = true;
					return async ({ result, update }) => {
						isSubmittingJobStandard = false;
						if (result.type === 'success') {
							const resData = result.data as any;
							if (resData?.success === false) {
								notifyError('Gagal Menetapkan Standar', resData?.message || 'Terjadi kesalahan sistem.');
							} else {
								notifySuccess('Standar Jabatan Disimpan', resData?.message || 'Standar kompetensi jabatan berhasil disimpan ke database.');
								isJobStandardModalOpen = false;
								await update();
							}
						} else if (result.type === 'failure') {
							const resData = result.data as any;
							notifyError('Gagal Menetapkan Standar', resData?.message || 'Formulir standar tidak valid.');
						} else if (result.type === 'error') {
							notifyError('Kesalahan Server', (result.error as any)?.message || 'Terjadi kesalahan sistem.');
						}
					};
				}}
				class="flex flex-col flex-1 overflow-hidden"
			>
				<!-- Area Atas: Pilihan Jabatan & Divisi -->
				<div class="p-5 bg-surface-container-low border-b border-slate-200/60 dark:border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
					<div class="space-y-1">
						<label class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Posisi / Jabatan *</label>
						<input
							type="text"
							name="positionTitle"
							list="masterTitlesList"
							bind:value={jobStandardForm.positionTitle}
							required
							class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary focus:outline-hidden"
							placeholder="Pilih atau ketik jabatan, misal: STORAGE KEEPER"
							onchange={(e) => {
								const val = (e.target as HTMLInputElement).value;
								if (val) {
									const existing = jobStandards.filter((j: any) => j.positionTitle.toLowerCase() === val.toLowerCase());
									if (existing.length > 0) {
										existing.forEach((item: any) => {
											selectedCompStandards[item.competencyCode] = { selected: true, requiredLevel: item.requiredLevel };
										});
									}
								}
							}}
						/>
						<datalist id="masterTitlesList">
							{#each masterTitles as t}
								<option value={t.title}>{t.title} ({t.code})</option>
							{/each}
						</datalist>
					</div>

					<div class="space-y-1">
						<label class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Divisi Perusahaan *</label>
						<select
							name="division"
							bind:value={jobStandardForm.division}
							class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary focus:outline-hidden"
						>
							{#each divisions as div}
								<option value={div.name}>{div.name} ({div.code})</option>
							{/each}
							{#if divisions.length === 0}
								<option value="OPERATION">OPERATION (DV_41)</option>
								<option value="HUMAN CAPITAL & DEVELOPMENT">HUMAN CAPITAL & DEVELOPMENT (DV_37)</option>
								<option value="FINANCE">FINANCE (DV_36)</option>
								<option value="QHSE">QHSE (DV_38)</option>
								<option value="MAINTENANCE & ASSET">MAINTENANCE & ASSET (DV_18)</option>
							{/if}
						</select>
					</div>
				</div>

				<!-- Area Tengah: Filter & Multi-Select Picker Kompetensi -->
				<div class="p-5 flex flex-col flex-1 overflow-hidden space-y-3">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
						<div class="flex items-center gap-2">
							<span class="font-bold text-on-surface">Pilih Kompetensi Wajib:</span>
							<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-primary/10 text-primary border border-primary/20">
								{selectedCompStandardsList.length} Dipilih
							</span>
							{#if selectedCompStandardsList.length > 0}
								<span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
									<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
									<span>(Otomatis diurutkan ke posisi teratas)</span>
								</span>
							{/if}
						</div>

						<div class="flex items-center gap-2 flex-wrap">
							<button
								type="button"
								onclick={() => selectAllFilteredModalComps()}
								class="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-slate-700 text-[11px] font-bold text-on-surface transition-all cursor-pointer"
							>
								Pilih Semua ({filteredModalCompetencies.length})
							</button>
							<button
								type="button"
								onclick={() => clearAllModalComps()}
								class="px-2.5 py-1 rounded-lg bg-surface-container text-[11px] font-bold text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
							>
								Kosongkan
							</button>
						</div>
					</div>

					<!-- Search & Filter Aspek -->
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
						<div class="sm:col-span-2 relative">
							<span class="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-sm">search</span>
							<input
								type="text"
								bind:value={compModalSearchQuery}
								placeholder="Cari kode atau nama kompetensi..."
								class="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface focus:outline-hidden"
							/>
						</div>
						<select
							bind:value={compModalSelectedAspect}
							class="px-3 py-1.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface"
						>
							<option value="All">Semua Aspek</option>
							<option value="Core Competency">Core Competency</option>
							<option value="Behavioral Competency">Behavioral Competency</option>
							<option value="Technical Competency">Technical Competency</option>
						</select>
					</div>

					<!-- List Checklist Multi-Select: Satu Daftar Tunggal dengan Item Tercentang Otomatis Naik ke Atas -->
					<div class="flex-1 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-surface">
						{#each filteredModalCompetencies as comp}
							{@const isChecked = selectedCompStandards[comp.code]?.selected || false}
							{@const currentLevel = selectedCompStandards[comp.code]?.requiredLevel || 3}
							<div class="p-3 flex items-center justify-between gap-3 hover:bg-surface-container/40 transition-colors {isChecked ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary' : ''}">
								<label class="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
									<input
										type="checkbox"
										checked={isChecked}
										onchange={() => toggleModalCompSelection(comp.code)}
										class="w-4 h-4 rounded-md border-slate-400 text-primary focus:ring-primary cursor-pointer"
									/>
									<div class="min-w-0">
										<div class="flex items-center gap-2 flex-wrap">
											<span class="px-1.5 py-0.5 rounded-md font-mono text-[10px] font-black shrink-0 {isChecked ? 'bg-primary text-on-primary' : 'bg-surface-container-high border border-slate-700 text-primary'}">
												{comp.code}
											</span>
											<span class="text-[10px] text-slate-400 font-semibold">{comp.aspect}</span>
											{#if isChecked}
												<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
													✓ Terpilih
												</span>
											{/if}
										</div>
										<p class="text-xs font-bold text-on-surface truncate">{comp.name}</p>
									</div>
								</label>

								<!-- Dropdown Target Level untuk kompetensi ini -->
								<div class="flex items-center gap-1.5 shrink-0">
									<span class="text-[10px] font-bold text-slate-400">Target Level:</span>
									<select
										disabled={!isChecked}
										value={currentLevel}
										onchange={(e) => setModalCompLevel(comp.code, Number((e.target as HTMLSelectElement).value))}
										class="px-2 py-1 rounded-lg text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 bg-surface-container text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
									>
										<option value={1}>L1 (SOP Dasar)</option>
										<option value={2}>L2 (Mandiri)</option>
										<option value={3}>L3 (Problem Solving)</option>
										<option value={4}>L4 (Supervisi/Analisis)</option>
										<option value={5}>L5 (Expert/Inovator)</option>
									</select>
								</div>
							</div>
						{/each}

						{#if filteredModalCompetencies.length === 0}
							<div class="p-8 text-center text-xs text-slate-400">
								Tidak ditemukan kompetensi yang cocok dengan kata kunci pencarian.
							</div>
						{/if}
					</div>
				</div>

				<!-- Hidden Data untuk Server Action -->
				<input type="hidden" name="standards" value={JSON.stringify(selectedCompStandardsList)} />

				<!-- Footer Modal -->
				<div class="p-4 bg-surface-container-low border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-3">
					<div class="text-[11px] text-slate-400 font-medium">
						Target level standar akan dipakai sebagai pembanding GAP pada form asesmen atasan langsung.
					</div>

					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => (isJobStandardModalOpen = false)}
							class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-surface-container cursor-pointer"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={isSubmittingJobStandard || !jobStandardForm.positionTitle || selectedCompStandardsList.length === 0}
							class="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer transition-all"
						>
							{#if isSubmittingJobStandard}
								<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
								<span>Menyimpan Standar...</span>
							{:else}
								<span class="material-symbols-outlined text-sm">save</span>
								<span>Simpan Standar ({selectedCompStandardsList.length} Kompetensi)</span>
							{/if}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 12: LIHAT RUBRIK INDIKATOR LEVEL 1-5                              -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isLevelIndicatorModalOpen && selectedCompetencyForIndicator}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<div class="flex items-center gap-2">
						<span class="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
							{selectedCompetencyForIndicator.code}
						</span>
						<h3 class="font-black text-base text-on-surface">{selectedCompetencyForIndicator.name}</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">{selectedCompetencyForIndicator.aspect} • Rubrik Perilaku Resmi PT BCS</p>
				</div>
				<button type="button" onclick={() => (isLevelIndicatorModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Level 1 s.d. Level 5 Indicators -->
			<div class="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
				{#each (selectedCompetencyForIndicator.levelIndicators || []) as ind}
					<div class="p-3 rounded-2xl bg-surface-container-high/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
						<div class="flex items-center justify-between">
							<span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
								Level {ind.level}
							</span>
							<span class="text-[10px] text-slate-400 font-bold">
								{ind.level === 1 ? 'Pemula (Basic SOP)' :
								 ind.level === 2 ? 'Aplikasi Rutin' :
								 ind.level === 3 ? 'Problem Solving' :
								 ind.level === 4 ? 'Supervisi & Analisa' : 'Subject Matter Expert'}
							</span>
						</div>
						<p class="text-xs text-on-surface leading-relaxed">{ind.desc}</p>
					</div>
				{/each}
			</div>

			<!-- Default Course Info -->
			<div class="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
				<div>
					<p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Default Kursus Penutupan GAP:</p>
					<p class="font-bold text-xs text-primary">{selectedCompetencyForIndicator.defaultCourseTitle}</p>
				</div>
				<span class="font-mono text-[10px] text-slate-400">{selectedCompetencyForIndicator.defaultCourseId || '-'}</span>
			</div>

			<div class="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
				<button type="button" onclick={() => (isLevelIndicatorModalOpen = false)} class="px-5 py-2 rounded-xl bg-surface-container border text-xs font-bold text-on-surface hover:bg-surface-container-highest">
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 13: HUBUNGKAN MATERI KURSUS KE KAMUS KOMPETENSI                     -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isLinkCourseModalOpen && selectedCompForLink}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<div class="flex items-center gap-2">
						<span class="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
							{selectedCompForLink.code}
						</span>
						<h3 class="font-black text-base text-on-surface">Hubungkan Materi Kursus</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">{selectedCompForLink.name}</p>
				</div>
				<button type="button" onclick={() => (isLinkCourseModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/linkCourseToCompetency"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						isLinkCourseModalOpen = false;
					};
				}}
				class="space-y-4"
			>
				<input type="hidden" name="competencyCode" value={selectedCompForLink.code} />

				<div class="space-y-1.5">
					<label for="linkCourseId" class="block text-xs font-bold text-on-surface">Pilih Kursus dari Katalog LMS PT BCS</label>
					<select
						id="linkCourseId"
						name="courseId"
						value={selectedCompForLink.defaultCourseId || ''}
						class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface focus:ring-1 focus:ring-primary"
					>
						<option value="">-- Tidak Terhubung / Lepas Hubungan --</option>
						{#each courses as c}
							<option value={c.id}>[{c.id}] {c.title} ({c.category})</option>
						{/each}
					</select>
					<p class="text-[11px] text-slate-400">
						Jika dihubungkan, kursus ini otomatis menjadi rekomendasi pelatihan saat karyawan memiliki GAP pada kompetensi ini.
					</p>
				</div>

				<div class="p-3 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs space-y-1">
					<p class="font-bold text-on-surface">Aspek: <span class="font-normal text-slate-500">{selectedCompForLink.aspect}</span></p>
					<p class="font-bold text-on-surface">Materi Saat Ini: <span class="font-normal text-primary">{selectedCompForLink.defaultCourseTitle || 'Belum terhubung'}</span></p>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button
						type="button"
						onclick={() => (isLinkCourseModalOpen = false)}
						class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-90 cursor-pointer"
					>
						<span class="material-symbols-outlined text-sm">save</span>
						<span>Simpan Pemetaan</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 14: PILIH & TUGASKAN KURSUS UNTUK TNA GAP KARYAWAN                  -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isAssignCourseModalOpen && selectedAssessmentForAssign}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<div class="flex items-center gap-2">
						<span class="px-2 py-0.5 rounded-md text-xs font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
							GAP {selectedAssessmentForAssign.gap}
						</span>
						<h3 class="font-black text-base text-on-surface">Pilih & Tugaskan Kursus Pelatihan</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">Penugasan Personal Berbasis Training Needs Analysis (TNA)</p>
				</div>
				<button type="button" onclick={() => (isAssignCourseModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Ringkasan Karyawan & Kompetensi GAP -->
			<div class="p-3.5 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-2 text-xs">
				<div class="flex items-center justify-between">
					<span class="text-slate-400 font-medium">Karyawan:</span>
					<span class="font-bold text-on-surface">{selectedAssessmentForAssign.employeeName} ({selectedAssessmentForAssign.payrollId})</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-slate-400 font-medium">Jabatan & Dept:</span>
					<span class="font-medium text-on-surface">{selectedAssessmentForAssign.positionTitle} • {selectedAssessmentForAssign.department}</span>
				</div>
				<div class="flex items-center justify-between pt-1 border-t border-slate-200/40 dark:border-slate-800/40">
					<span class="text-slate-400 font-medium">Kompetensi yang Kurang:</span>
					<span class="font-bold text-primary">[{selectedAssessmentForAssign.competencyCode}] {selectedAssessmentForAssign.competencyName}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-slate-400 font-medium">Level Target vs Riil:</span>
					<span class="font-mono font-bold text-rose-600">
						Standar Level {selectedAssessmentForAssign.requiredLevel} &rarr; Aktual Level {selectedAssessmentForAssign.actualLevel}
					</span>
				</div>
			</div>

			<form
				method="POST"
				action="?/assignPersonalTraining"
				use:enhance={() => {
					isSubmittingAssignTraining = true;
					return async ({ result, update }) => {
						isSubmittingAssignTraining = false;
						if (result.type === 'success') {
							const resData = result.data as any;
							if (resData?.success === false) {
								notifyError('Gagal Menugaskan Pelatihan', resData?.message || 'Terjadi kesalahan sistem.');
							} else {
								notifySuccess('Pelatihan Ditugaskan', resData?.message || 'Materi pelatihan berhasil ditugaskan ke karyawan.');
								isAssignCourseModalOpen = false;
								await update();
							}
						} else if (result.type === 'failure') {
							const resData = result.data as any;
							notifyError('Gagal Menugaskan', resData?.message || 'Pilihan kursus tidak valid.');
						} else if (result.type === 'error') {
							notifyError('Kesalahan Server', (result.error as any)?.message || 'Terjadi kesalahan server.');
						}
					};
				}}
				class="space-y-4"
			>
				<input type="hidden" name="assessmentId" value={selectedAssessmentForAssign.id} />
				<input type="hidden" name="payrollId" value={selectedAssessmentForAssign.payrollId} />
				<input type="hidden" name="employeeName" value={selectedAssessmentForAssign.employeeName} />
				<input type="hidden" name="competencyCode" value={selectedAssessmentForAssign.competencyCode} />

				<div class="space-y-1.5">
					<label for="assignCourseSelect" class="block text-xs font-bold text-on-surface">Pilih Kursus Pelatihan Penutup GAP</label>
					<select
						id="assignCourseSelect"
						name="courseId"
						bind:value={assignFormCourseId}
						required
						class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface focus:ring-1 focus:ring-primary"
					>
						<option value="" disabled>-- Pilih Kursus yang Relevan --</option>
						{#each courses as c}
							<option value={c.id}>[{c.id}] {c.title} • {c.category}</option>
						{/each}
					</select>
				</div>

				<div class="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-high/60 border border-slate-200 dark:border-slate-800">
					<input
						type="checkbox"
						id="setDefaultCheck"
						name="setAsDefault"
						bind:checked={assignFormSetDefault}
						class="w-4 h-4 rounded-md text-primary focus:ring-primary border-slate-300 dark:border-slate-700 cursor-pointer"
					/>
					<label for="setDefaultCheck" class="text-xs text-on-surface cursor-pointer select-none">
						Jadikan kursus ini materi rekomendasi permanen untuk <strong>[{selectedAssessmentForAssign.competencyCode}]</strong> ke depannya.
					</label>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button
						type="button"
						onclick={() => (isAssignCourseModalOpen = false)}
						class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={!assignFormCourseId || isSubmittingAssignTraining}
						class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
					>
						{#if isSubmittingAssignTraining}
							<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
							<span>Menugaskan...</span>
						{:else}
							<span class="material-symbols-outlined text-sm">send_to_mobile</span>
							<span>Simpan & Tugaskan ke Portal BCS Academy</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 14: LIHAT DETAIL 18 BUTIR EVALUASI LEVEL 1 (REACTION)             -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isL1DetailModalOpen && selectedL1Detail}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
			<!-- Header Modal -->
			<div class="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-500 text-xl">reviews</span>
						<h3 class="font-black text-base text-on-surface">Rincian Evaluasi Reaksi Peserta (Kirkpatrick Level 1)</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">
						Peserta: <strong>{selectedL1Detail.employeeName}</strong> ({selectedL1Detail.payrollId}) • {selectedL1Detail.courseTitle}
					</p>
				</div>
				<button type="button" onclick={() => (isL1DetailModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Body Modal (Scrollable) -->
			<div class="p-6 overflow-y-auto space-y-6">
				<!-- Skor Agregat Kategori -->
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
					<div class="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
						<span class="text-slate-500 block text-[10px] uppercase font-bold">Materi Pelatihan</span>
						<span class="text-base font-black text-blue-600 font-mono mt-0.5 block">
							{selectedL1Detail.materialScore || selectedL1Detail.contentRating} / 5
						</span>
					</div>
					<div class="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
						<span class="text-slate-500 block text-[10px] uppercase font-bold">Trainer / Instruktur</span>
						<span class="text-base font-black text-purple-600 font-mono mt-0.5 block">
							{selectedL1Detail.instructorScore || selectedL1Detail.instructorRating} / 5
						</span>
					</div>
					<div class="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-center">
						<span class="text-slate-500 block text-[10px] uppercase font-bold">Fasilitas & Sarana</span>
						<span class="text-base font-black text-teal-600 font-mono mt-0.5 block">
							{selectedL1Detail.facilityScore || selectedL1Detail.facilityRating} / 5
						</span>
					</div>
					<div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
						<span class="text-slate-500 block text-[10px] uppercase font-bold">Skor Keseluruhan</span>
						<span class="text-base font-black text-amber-600 font-mono mt-0.5 block">
							★ {selectedL1Detail.overallScore || ((selectedL1Detail.contentRating + selectedL1Detail.instructorRating + selectedL1Detail.facilityRating) / 3).toFixed(1)}
						</span>
					</div>
				</div>

				<!-- Bagian 1: Materi -->
				<div class="space-y-3">
					<h4 class="text-xs font-black uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
						<span class="material-symbols-outlined text-sm">menu_book</span>
						<span>Bagian 1: Program & Materi Pelatihan</span>
					</h4>
					<div class="space-y-2 text-xs">
						<div class="p-3 rounded-2xl bg-surface-container flex items-center justify-between">
							<span>1. Materi pelatihan sudah tersistematika dengan baik</span>
							<span class="px-2.5 py-1 rounded-xl font-bold bg-blue-500/10 text-blue-600 font-mono">
								{selectedL1Detail.answers?.q1_systematic || selectedL1Detail.materialScore || selectedL1Detail.contentRating} / 5
							</span>
						</div>
						<div class="p-3 rounded-2xl bg-surface-container flex items-center justify-between">
							<span>2. Kelengkapan materi yang diberikan</span>
							<span class="px-2.5 py-1 rounded-xl font-bold bg-blue-500/10 text-blue-600 font-mono">
								{selectedL1Detail.answers?.q2_completeness || selectedL1Detail.materialScore || selectedL1Detail.contentRating} / 5
							</span>
						</div>
						<div class="p-3 rounded-2xl bg-surface-container flex items-center justify-between">
							<span>3. Manfaat / kesesuaian materi dengan kebutuhan tugas sehari-hari</span>
							<span class="px-2.5 py-1 rounded-xl font-bold bg-blue-500/10 text-blue-600 font-mono">
								{selectedL1Detail.answers?.q3_relevance || selectedL1Detail.materialScore || selectedL1Detail.contentRating} / 5
							</span>
						</div>
						<div class="p-3 rounded-2xl bg-surface-container flex items-center justify-between">
							<span>4. Durasi (lama waktu) dari penyelenggaraan pelatihan</span>
							<span class="px-2.5 py-1 rounded-xl font-bold bg-blue-500/10 text-blue-600 font-mono">
								{selectedL1Detail.answers?.q4_duration || selectedL1Detail.materialScore || selectedL1Detail.contentRating} / 5
							</span>
						</div>
						<div class="p-3 rounded-2xl bg-surface-container flex items-center justify-between">
							<span>5. Tambahan pengetahuan selama mengikuti pelatihan</span>
							<span class="px-2.5 py-1 rounded-xl font-bold bg-blue-500/10 text-blue-600 font-mono">
								{selectedL1Detail.answers?.q5_knowledge_gain || selectedL1Detail.materialScore || selectedL1Detail.contentRating} / 5
							</span>
						</div>
					</div>
				</div>

				<!-- Bagian 2: Instruktur -->
				<div class="space-y-3">
					<h4 class="text-xs font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
						<span class="material-symbols-outlined text-sm">co_present</span>
						<span>Bagian 2: Instruktur / Trainer / Fasilitator</span>
					</h4>
					<div class="space-y-2 text-xs">
						<div class="p-3 rounded-2xl bg-surface-container flex items-center justify-between">
							<span>6. Penguasaan materi training oleh instruktur</span>
							<span class="px-2.5 py-1 rounded-xl font-bold bg-purple-500/10 text-purple-600 font-mono">
								{selectedL1Detail.answers?.q6_mastery || selectedL1Detail.instructorScore || selectedL1Detail.instructorRating} / 5
							</span>
						</div>
						<div class="p-3 rounded-2xl bg-surface-container flex items-center justify-between">
							<span>7. Cara penyampaian / metode menyampaikan materi</span>
							<span class="px-2.5 py-1 rounded-xl font-bold bg-purple-500/10 text-purple-600 font-mono">
								{selectedL1Detail.answers?.q7_delivery || selectedL1Detail.instructorScore || selectedL1Detail.instructorRating} / 5
							</span>
						</div>
						<div class="p-3 rounded-2xl bg-surface-container flex items-center justify-between">
							<span>8. Kemampuan membangkitkan partisipasi dan keaktifan peserta</span>
							<span class="px-2.5 py-1 rounded-xl font-bold bg-purple-500/10 text-purple-600 font-mono">
								{selectedL1Detail.answers?.q8_engagement || selectedL1Detail.instructorScore || selectedL1Detail.instructorRating} / 5
							</span>
						</div>
						<div class="p-3 rounded-2xl bg-surface-container flex items-center justify-between">
							<span>9. Kemampuan dan ketepatan dalam menjawab pertanyaan peserta</span>
							<span class="px-2.5 py-1 rounded-xl font-bold bg-purple-500/10 text-purple-600 font-mono">
								{selectedL1Detail.answers?.q9_qa || selectedL1Detail.instructorScore || selectedL1Detail.instructorRating} / 5
							</span>
						</div>
					</div>
				</div>

				<!-- Bagian 3: Fasilitas -->
				<div class="space-y-3">
					<h4 class="text-xs font-black uppercase tracking-wider text-teal-600 flex items-center gap-1.5">
						<span class="material-symbols-outlined text-sm">apartment</span>
						<span>Bagian 3: Sarana, Prasarana & Fasilitas Training ({selectedL1Detail.deliveryMethod || 'Online'})</span>
					</h4>
					<div class="space-y-2 text-xs">
						<div class="p-3 rounded-2xl bg-surface-container flex items-center justify-between">
							<span>10. Tempat pelaksanaan pelatihan / Kenyamanan antarmuka LMS</span>
							<span class="px-2.5 py-1 rounded-xl font-bold bg-teal-500/10 text-teal-600 font-mono">
								{selectedL1Detail.answers?.q10_venue || selectedL1Detail.facilityScore || selectedL1Detail.facilityRating} / 5
							</span>
						</div>
						<div class="p-3 rounded-2xl bg-surface-container flex items-center justify-between">
							<span>11. Alat, peralatan praktikum, atau media pembelajaran digital</span>
							<span class="px-2.5 py-1 rounded-xl font-bold bg-teal-500/10 text-teal-600 font-mono">
								{selectedL1Detail.answers?.q11_tools || selectedL1Detail.facilityScore || selectedL1Detail.facilityRating} / 5
							</span>
						</div>
						<div class="p-3 rounded-2xl bg-surface-container flex items-center justify-between">
							<span>12. Konsumsi makanan/minuman (Offline) atau Kualitas Audio/Video (Online)</span>
							<span class="px-2.5 py-1 rounded-xl font-bold bg-teal-500/10 text-teal-600 font-mono">
								{selectedL1Detail.answers?.q12_refreshment || selectedL1Detail.facilityScore || selectedL1Detail.facilityRating} / 5
							</span>
						</div>
						<div class="p-3 rounded-2xl bg-surface-container flex items-center justify-between">
							<span>13. Kebersihan fasilitas (Offline) atau Navigasi platform LMS (Online)</span>
							<span class="px-2.5 py-1 rounded-xl font-bold bg-teal-500/10 text-teal-600 font-mono">
								{selectedL1Detail.answers?.q13_cleanliness || selectedL1Detail.facilityScore || selectedL1Detail.facilityRating} / 5
							</span>
						</div>
						<div class="p-3 rounded-2xl bg-surface-container flex items-center justify-between">
							<span>14. Pelayanan personil / panitia & dukungan teknis</span>
							<span class="px-2.5 py-1 rounded-xl font-bold bg-teal-500/10 text-teal-600 font-mono">
								{selectedL1Detail.answers?.q14_committee || selectedL1Detail.facilityScore || selectedL1Detail.facilityRating} / 5
							</span>
						</div>
						<div class="p-3 rounded-2xl bg-surface-container flex items-center justify-between">
							<span>15. Tata tertib & peraturan yang diberlakukan selama pelatihan</span>
							<span class="px-2.5 py-1 rounded-xl font-bold bg-teal-500/10 text-teal-600 font-mono">
								{selectedL1Detail.answers?.q15_discipline || selectedL1Detail.facilityScore || selectedL1Detail.facilityRating} / 5
							</span>
						</div>
					</div>
				</div>

				<!-- Bagian 4: Esai Kualitatif -->
				<div class="space-y-3">
					<h4 class="text-xs font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
						<span class="material-symbols-outlined text-sm">edit_note</span>
						<span>Bagian 4: Uraian Esai Kualitatif & Feedback Peserta</span>
					</h4>
					<div class="space-y-3 text-xs">
						<div class="p-4 rounded-2xl bg-surface-container space-y-1">
							<span class="font-bold text-on-surface block">16. Manfaat / Rencana Penerapan di Perusahaan:</span>
							<p class="text-on-surface-variant italic">
								"{selectedL1Detail.appliedBenefit || selectedL1Detail.answers?.appliedBenefit || selectedL1Detail.feedbackNotes || 'Tidak ada catatan.'}"
							</p>
						</div>
						<div class="p-4 rounded-2xl bg-surface-container space-y-1">
							<span class="font-bold text-on-surface block">17. Kesan selama Mengikuti Pelatihan:</span>
							<p class="text-on-surface-variant italic">
								"{selectedL1Detail.impressions || selectedL1Detail.answers?.impressions || 'Tidak ada catatan.'}"
							</p>
						</div>
						<div class="p-4 rounded-2xl bg-surface-container space-y-1">
							<span class="font-bold text-on-surface block">18. Saran dan Masukan Perbaikan ke Depan:</span>
							<p class="text-on-surface-variant italic">
								"{selectedL1Detail.suggestions || selectedL1Detail.answers?.suggestions || 'Tidak ada catatan.'}"
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer Modal -->
			<div class="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
				<button
					type="button"
					onclick={() => (isL1DetailModalOpen = false)}
					class="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-xs hover:opacity-90 cursor-pointer"
				>
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@page {
		size: A4 landscape;
		margin: 0;
	}

	@media print {
		/* Sembunyikan semua elemen layout web */
		:global(aside), :global(nav), :global(header) {
			display: none !important;
		}

		:global(body) {
			background: white !important;
			color: black !important;
			padding: 0 !important;
			margin: 0 !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}

		.no-print {
			display: none !important;
		}

		.print-container {
			box-shadow: none !important;
			margin: 0 auto !important;
			padding: 10mm 15mm !important;
			width: 100% !important;
			min-height: 100vh !important;
			box-sizing: border-box !important;
			position: relative !important;
		}
	}
</style>
