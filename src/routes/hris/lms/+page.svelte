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

	// Tabs State (5 Tab Utama)
	type TabType = 'catalog' | 'sessions' | 'evaluations' | 'safety_tna' | 'reports';
	let activeTab = $state<TabType>('catalog');
	const tabs = [
		{ id: 'catalog', label: 'Katalog & Kursus', icon: 'auto_stories' },
		{ id: 'sessions', label: 'Sesi Training & Absensi', icon: 'event_available' },
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
	let evalSubTab = $state<'l1' | 'l3l4'>('l1');

	// TNA Sub-tabs
	type TnaSubTab = 'assessments' | 'standards' | 'library' | 'safety';
	let tnaSubTab = $state<TnaSubTab>('assessments');
	let tnaSearchQuery = $state('');
	let tnaFilterDept = $state('All');
	let tnaFilterStatus = $state('All');

	// Report Sub-tabs (Spreadsheet Master Specification: Sheet 306150899)
	type ReportType = 'training' | 'course' | 'attendance' | 'assessment' | 'competency_gap' | 'certificates';
	let activeReportType = $state<ReportType>('training');
	let reportSearchQuery = $state('');
	let reportFilterDept = $state('All');
	let reportFilterBased = $state('All');

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

	function clearAllDivisionEmployees() {
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

	// Create Course Wizard & Quiz Builder State
	let createModalStep = $state<1 | 2 | 3>(1);
	let createQuizTab = $state<'PRE_TEST' | 'POST_TEST'>('PRE_TEST');

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
					message: 'Judul kursus pelatihan wajib diisi terlebih dahulu.',
					type: 'WARNING',
					timestamp: new Date().toISOString()
				});
				return;
			}
			createModalStep = 2;
		} else if (createModalStep === 2) {
			createModalStep = 3;
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

	// Filtered kompetensi untuk modal picker
	const filteredModalCompetencies = $derived.by(() => {
		return competencyLibrary.filter((c: any) => {
			const matchSearch = compModalSearchQuery === '' ||
				c.name.toLowerCase().includes(compModalSearchQuery.toLowerCase()) ||
				c.code.toLowerCase().includes(compModalSearchQuery.toLowerCase());
			const matchAspect = compModalSelectedAspect === 'All' || c.aspect === compModalSelectedAspect;
			return matchSearch && matchAspect;
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
	let activeCourseForPlayer = $state<any>(null);
	let activeSessionForAttendance = $state<any>(null);
	let activeEvalForSupervisor = $state<any>(null);
	let activeCertData = $state<any>(null);

	// Sequential Player Engine State
	// Steps: 1 = Pre-Test, 2 = Modules (Materi), 3 = Post-Test, 4 = Evaluasi Level 1, 5 = Selesai / Sertifikat
	let playerStep = $state<1 | 2 | 3 | 4 | 5>(1);
	let activeModuleIndex = $state(0);
	let preTestAnswered = $state<Record<number, string>>({});
	let postTestAnswered = $state<Record<number, string>>({});
	let preTestSubmitted = $state(false);
	let postTestResult = $state<{ passed: boolean; score: number; certNumber?: string } | null>(null);
	let evalL1Ratings = $state({ content: 5, instructor: 5, facility: 5, recommendation: 5, notes: '' });

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

	function openCoursePlayer(course: any) {
		activeCourseForPlayer = course;
		playerStep = 1;
		activeModuleIndex = 0;
		preTestAnswered = {};
		postTestAnswered = {};
		preTestSubmitted = false;
		postTestResult = null;
		evalL1Ratings = { content: 5, instructor: 5, facility: 5, recommendation: 5, notes: '' };
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

		if (activeReportType === 'training') {
			headers = ['No', 'ID Sesi', 'Nama Training', 'Kategori', 'Based', 'Tanggal Sesi', 'Trainer', 'Tipe Trainer', 'Departemen', 'Biaya Trainer', 'Biaya Trainee', 'Total Biaya', 'Lokasi / Link', 'Status'];
			rows = sessions.map((s: any, idx: number) => [
				idx + 1,
				`"${s.id}"`,
				`"${s.title}"`,
				`"${courses.find((c: any) => c.id === s.courseId)?.category || 'Safety'}"`,
				`"${s.based || 'Mandatory'}"`,
				`"${s.sessionDate}"`,
				`"${s.trainer}"`,
				`"${s.trainerType || 'Internal'}"`,
				`"${s.department || 'Operations'}"`,
				s.costTrainer || 500000,
				s.costTrainee || 0,
				(s.costTrainer || 500000) + (s.costTrainee || 0),
				`"${s.locationOrLink}"`,
				`"${s.status}"`
			]);
			filename = `Training_Report_BCS_${new Date().toISOString().split('T')[0]}.csv`;
		} else if (activeReportType === 'course') {
			headers = ['No', 'ID Kursus', 'Judul Kursus', 'Kategori', 'Based', 'Level', 'Durasi (Jam)', 'Modul', 'Passing Grade', 'Peserta', 'Completion Rate (%)', 'Rating', 'Trainer', 'Tipe Trainer', 'Biaya Trainer', 'Departemen'];
			rows = courses.map((c: any, idx: number) => [
				idx + 1,
				`"${c.id}"`,
				`"${c.title}"`,
				`"${c.category}"`,
				`"${c.based || 'Mandatory'}"`,
				`"${c.level}"`,
				c.durationHours,
				c.modulesCount,
				c.passingGrade,
				c.enrolledCount,
				`${c.completionRate}%`,
				c.rating,
				`"${c.instructor}"`,
				`"${c.trainerType || 'Internal'}"`,
				c.costTrainer || 500000,
				`"${c.department || 'Operations'}"`
			]);
			filename = `Course_Report_BCS_${new Date().toISOString().split('T')[0]}.csv`;
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
				<span>Tambah Kursus Baru</span>
			</button>
		</div>
	</header>

	<!-- KPI Metric Cards -->
	<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 flex-shrink-0">
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Kursus</p>
			<h3 class="text-xl font-black text-on-surface mt-1 font-mono">{metrics.totalCourses}</h3>
			<p class="text-[10px] text-emerald-600 font-semibold mt-1">Aktif di Katalog</p>
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
					<!-- Filter & Search Bar -->
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
										<span class="text-[10px] text-slate-400 truncate max-w-[130px]">
											Instruktur: <strong class="text-slate-600 dark:text-slate-300">{course.instructor}</strong>
										</span>

										<button
											type="button"
											onclick={() => openCoursePlayer(course)}
											class="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
										>
											<span class="material-symbols-outlined text-sm">play_circle</span>
											<span>Buka Player</span>
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

			<!-- TAB 2: SESI TRAINING & ABSENSI -->
			{:else if activeTab === 'sessions'}
				<div class="space-y-6">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div>
							<h3 class="font-black text-base text-on-surface">Jadwal Sesi Pelatihan (Online & Offline)</h3>
							<p class="text-xs text-on-surface-variant mt-0.5">Pantau pelaksanaan sesi training resmi dan input kehadiran peserta secara realtime</p>
						</div>

						<button
							type="button"
							onclick={() => isSessionModalOpen = true}
							class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
						>
							<span class="material-symbols-outlined text-sm">event</span>
							<span>Jadwalkan Sesi Baru</span>
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

								<div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
									<div class="text-[11px] text-slate-500">
										Jam: <strong>{s.startTime} - {s.endTime}</strong>
										<div class="text-[10px] text-slate-400">Kuota: {s.actualAttendeeCount} / {s.quota} Peserta</div>
									</div>

									<button
										type="button"
										onclick={() => openAttendanceModal(s)}
										class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-surface-container-high text-xs font-bold text-on-surface flex items-center gap-1 transition-all cursor-pointer"
									>
										<span class="material-symbols-outlined text-xs">how_to_reg</span>
										<span>Absensi</span>
									</button>
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
				</div>

			<!-- TAB 3: EVALUASI KIRKPATRICK -->
			{:else if activeTab === 'evaluations'}
				<div class="space-y-6">
					<!-- Sub-tab Selector -->
					<div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
						<button
							type="button"
							onclick={() => (evalSubTab = 'l1')}
							class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
							{evalSubTab === 'l1'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">sentiment_very_satisfied</span>
							<span>Level 1: Reaksi & Kepuasan Peserta</span>
						</button>

						<button
							type="button"
							onclick={() => (evalSubTab = 'l3l4')}
							class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
							{evalSubTab === 'l3l4'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">supervisor_account</span>
							<span>Level 3 & 4: Review Atasan Pasca-Training (H+3 Bulan)</span>
						</button>
					</div>

					<!-- SUB-TAB 1: LEVEL 1 REACTION -->
					{#if evalSubTab === 'l1'}
						<div class="space-y-4">
							<div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
								<div class="flex items-center gap-3">
									<span class="material-symbols-outlined text-amber-500 text-2xl">insights</span>
									<div>
										<h4 class="font-black text-sm text-on-surface">Evaluasi Level 1 (Reaction) Kirkpatrick</h4>
										<p class="text-xs text-on-surface-variant">Survei kepuasan peserta wajib diisi tepat setelah lulus post-test</p>
									</div>
								</div>
								<div class="text-right">
									<span class="text-xs text-slate-500">Skor Rata-rata:</span>
									<p class="font-black text-lg text-amber-600 font-mono flex items-center justify-end gap-1">
										<span>{metrics.avgSatisfaction}</span>
										<span class="material-symbols-outlined text-sm">star</span>
									</p>
								</div>
							</div>

							<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
								<table class="w-full text-xs text-left">
									<thead class="bg-surface-container-high font-bold text-on-surface border-b border-slate-200 dark:border-slate-800">
										<tr>
											<th class="p-3">Tanggal</th>
											<th class="p-3">Nama Peserta</th>
											<th class="p-3">Kursus Pelatihan</th>
											<th class="p-3 text-center">Materi</th>
											<th class="p-3 text-center">Instruktur</th>
											<th class="p-3 text-center">Fasilitas</th>
											<th class="p-3 text-center">Rekomendasi</th>
											<th class="p-3">Catatan Feedback Peserta</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-200 dark:divide-slate-800">
										{#each evaluationsL1 as e}
											<tr class="hover:bg-surface-container/50">
												<td class="p-3 font-mono text-slate-500">{e.submittedAt}</td>
												<td class="p-3 font-bold text-on-surface">{e.employeeName}</td>
												<td class="p-3 font-semibold text-on-surface">{e.courseTitle}</td>
												<td class="p-3 text-center font-bold text-amber-500">★ {e.contentRating}</td>
												<td class="p-3 text-center font-bold text-amber-500">★ {e.instructorRating}</td>
												<td class="p-3 text-center font-bold text-amber-500">★ {e.facilityRating}</td>
												<td class="p-3 text-center font-bold text-amber-500">★ {e.recommendationRating}</td>
												<td class="p-3 text-slate-600 dark:text-slate-300 italic max-w-xs truncate">"{e.feedbackNotes}"</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>

					<!-- SUB-TAB 2: LEVEL 3 & 4 ATASAN -->
					{:else}
						<div class="space-y-4">
							<div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
								<div class="flex items-center gap-3">
									<span class="material-symbols-outlined text-blue-500 text-2xl">verified_user</span>
									<div>
										<h4 class="font-black text-sm text-on-surface">Evaluasi Level 3 (Behavior) & Level 4 (Business Impact)</h4>
										<p class="text-xs text-on-surface-variant">Penilaian efektivitas pelatihan di lapangan oleh atasan langsung pada H+3 bulan</p>
									</div>
								</div>
								<div class="text-right">
									<span class="text-xs text-slate-500">Antrian Pending:</span>
									<p class="font-black text-lg text-rose-600 font-mono">{metrics.pendingSupervisorReviews} Karyawan</p>
								</div>
							</div>

							<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
								<table class="w-full text-xs text-left">
									<thead class="bg-surface-container-high font-bold text-on-surface border-b border-slate-200 dark:border-slate-800">
										<tr>
											<th class="p-3">Nama Karyawan</th>
											<th class="p-3">Kursus Pelatihan</th>
											<th class="p-3">Atasan Penilai</th>
											<th class="p-3">Due Date (H+3 Bln)</th>
											<th class="p-3 text-center">Status</th>
											<th class="p-3 text-center">Skor Lvl 3 (SOP)</th>
											<th class="p-3 text-center">Skor Lvl 4 (Bisnis)</th>
											<th class="p-3 text-right">Aksi</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-200 dark:divide-slate-800">
										{#each evaluationsL3L4 as rev}
											<tr class="hover:bg-surface-container/50">
												<td class="p-3">
													<p class="font-bold text-on-surface">{rev.employeeName}</p>
													<p class="font-mono text-[10px] text-slate-500">{rev.payrollId}</p>
												</td>
												<td class="p-3 font-semibold text-on-surface">{rev.courseTitle}</td>
												<td class="p-3 text-slate-600 dark:text-slate-300">{rev.supervisorName}</td>
												<td class="p-3 font-mono {rev.status === 'PENDING' ? 'text-rose-600 font-bold' : 'text-slate-500'}">{rev.dueDate}</td>
												<td class="p-3 text-center">
													<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase
														{rev.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 animate-pulse'}">
														{rev.status}
													</span>
												</td>
												<td class="p-3 text-center font-bold text-blue-600">
													{rev.sopComplianceScore ? `${rev.sopComplianceScore}/5` : '-'}
												</td>
												<td class="p-3 text-center font-bold text-purple-600">
													{rev.businessImpactScore ? `${rev.businessImpactScore}/5` : '-'}
												</td>
												<td class="p-3 text-right">
													{#if rev.status === 'PENDING'}
														<button
															type="button"
															onclick={() => openSupervisorModal(rev)}
															class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
														>
															Beri Penilaian
														</button>
													{:else}
														<span class="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
															<span class="material-symbols-outlined text-xs">check_circle</span>
															<span>Ternilai</span>
														</span>
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
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
								<span>Safety Test & Request</span>
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

							<!-- Panel 2: Training by Request -->
							<div class="space-y-3 pt-2">
								<div class="flex items-center justify-between">
									<div>
										<h4 class="font-black text-sm text-on-surface uppercase tracking-wider">Training by Request (Pengajuan Kebutuhan Pelatihan)</h4>
										<p class="text-xs text-on-surface-variant">Formulir pengajuan usulan pelatihan tahunan oleh Head Department ke HRD</p>
									</div>

									<button
										type="button"
										onclick={() => (isRequestModalOpen = true)}
										class="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-surface-container text-xs font-bold text-on-surface flex items-center gap-1.5 transition-all cursor-pointer"
									>
										<span class="material-symbols-outlined text-sm">post_add</span>
										<span>+ Ajukan Kebutuhan Training</span>
									</button>
								</div>

								<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
									<table class="w-full text-xs text-left">
										<thead class="bg-surface-container-high font-bold text-on-surface border-b border-slate-200 dark:border-slate-800">
											<tr>
												<th class="p-3">No. Request</th>
												<th class="p-3">Departemen</th>
												<th class="p-3">Judul Pelatihan Diusulkan</th>
												<th class="p-3">Pengusul</th>
												<th class="p-3 text-center">Urgensi</th>
												<th class="p-3 text-center">Target Selesai</th>
												<th class="p-3 text-center">Status HRD</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-200 dark:divide-slate-800">
											{#each trainingRequests as req}
												<tr class="hover:bg-surface-container/50">
													<td class="p-3 font-mono font-bold text-on-surface">{req.id}</td>
													<td class="p-3 font-medium text-slate-500">{req.deptName}</td>
													<td class="p-3 font-bold text-on-surface">{req.trainingTitle}</td>
													<td class="p-3 text-slate-600 dark:text-slate-300">{req.requestedBy}</td>
													<td class="p-3 text-center">
														<span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase
															{req.urgency === 'CRITICAL' ? 'bg-rose-100 text-rose-800 font-bold' :
															req.urgency === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}">
															{req.urgency}
														</span>
													</td>
													<td class="p-3 text-center font-mono text-slate-500">{req.targetCompletionDate || '-'}</td>
													<td class="p-3 text-center">
														<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase
															{req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
															{req.status}
														</span>
													</td>
												</tr>
											{/each}
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
								<span>Export CSV ({activeReportType.replace('_', ' ').toUpperCase()})</span>
							</button>
						</div>
					</div>

					<!-- 6 Sub-Tab Navigation for Reports -->
					<div class="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/40 dark:border-slate-800/40 text-xs">
						<button
							type="button"
							onclick={() => (activeReportType = 'training')}
							class="px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer
							{activeReportType === 'training'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">model_training</span>
							<span>1. Training Report</span>
						</button>

						<button
							type="button"
							onclick={() => (activeReportType = 'course')}
							class="px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer
							{activeReportType === 'course'
								? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
								: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-sm">menu_book</span>
							<span>2. Course Report</span>
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
							<span>3. Attendance Report</span>
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
							<span>4. Assessment Report</span>
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
							<span>5. Competency Gap Report (TNA)</span>
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
							<span>6. E-Sertifikat Digital</span>
						</button>
					</div>

					<!-- REPORT 1: TRAINING REPORT -->
					{#if activeReportType === 'training'}
						<div class="space-y-4">
							<div class="p-4 rounded-2xl bg-surface-container/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div class="space-y-1">
									<h4 class="font-bold text-xs text-on-surface uppercase tracking-wider">Laporan Pelaksanaan Training (Training Report)</h4>
									<p class="text-xs text-on-surface-variant">Menampilkan status sesi, klasifikasi Based, evaluasi Kirkpatrick L1/L3/L4, serta rincian biaya.</p>
								</div>
								<div class="flex items-center gap-2 text-xs font-mono">
									<span class="px-2.5 py-1 rounded-lg bg-surface-container font-bold text-slate-600 dark:text-slate-300">
										Total Sesi: {sessions.length}
									</span>
									<span class="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
										Selesai: {sessions.filter((s: any) => s.status === 'COMPLETED').length}
									</span>
								</div>
							</div>

							<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
								<table class="w-full text-xs text-left whitespace-nowrap">
									<thead class="bg-surface-container-high font-bold text-on-surface border-b border-slate-200 dark:border-slate-800">
										<tr>
											<th class="p-3">ID & Judul Training</th>
											<th class="p-3">Kategori</th>
											<th class="p-3">Based</th>
											<th class="p-3">Tanggal Pelaksanaan</th>
											<th class="p-3">Trainer & Asal</th>
											<th class="p-3 text-center">Eval L1 (Reaksi)</th>
											<th class="p-3 text-center">Eval L3 (Perilaku)</th>
											<th class="p-3 text-center">Eval L4 (Dampak)</th>
											<th class="p-3 text-right">Biaya Trainer</th>
											<th class="p-3 text-right">Total Biaya</th>
											<th class="p-3">Lokasi / Format</th>
											<th class="p-3 text-center">Status</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-200 dark:divide-slate-800">
										{#each sessions as s}
											{@const courseMatch = courses.find((c: any) => c.id === s.courseId)}
											<tr class="hover:bg-surface-container/50">
												<td class="p-3">
													<p class="font-bold text-on-surface">{s.title}</p>
													<p class="font-mono text-[10px] text-slate-400">{s.id}</p>
												</td>
												<td class="p-3 text-slate-600 dark:text-slate-300">{courseMatch?.category || 'Safety'}</td>
												<td class="p-3">
													<span class="px-2 py-0.5 rounded text-[9.5px] font-black uppercase
														{s.based === 'Mandatory' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
														s.based === 'Additional' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
														'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'}">
														{s.based || 'Mandatory'}
													</span>
												</td>
												<td class="p-3 font-mono text-slate-500">{s.sessionDate}</td>
												<td class="p-3">
													<p class="font-semibold text-on-surface">{s.trainer}</p>
													<span class="text-[10px] font-bold text-slate-400 uppercase">{s.trainerType || 'Internal'}</span>
												</td>
												<td class="p-3 text-center font-mono font-bold text-amber-600">4.9 ★</td>
												<td class="p-3 text-center font-mono font-bold text-blue-600">4.8 / 5</td>
												<td class="p-3 text-center font-mono font-bold text-emerald-600">4.9 / 5</td>
												<td class="p-3 text-right font-mono font-semibold">Rp {Number(s.costTrainer || 500000).toLocaleString('id-ID')}</td>
												<td class="p-3 text-right font-mono font-bold text-emerald-600">Rp {Number(s.costTrainer || 500000).toLocaleString('id-ID')}</td>
												<td class="p-3 text-slate-500 truncate max-w-[150px]">{s.locationOrLink}</td>
												<td class="p-3 text-center">
													<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase
														{s.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-800'}">
														{s.status}
													</span>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>

					<!-- REPORT 2: COURSE REPORT -->
					{:else if activeReportType === 'course'}
						<div class="space-y-4">
							<div class="p-4 rounded-2xl bg-surface-container/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div class="space-y-1">
									<h4 class="font-bold text-xs text-on-surface uppercase tracking-wider">Laporan Katalog Kursus (Course Report)</h4>
									<p class="text-xs text-on-surface-variant">Rincian status kursus, passing grade, rasio penyelesaian peserta, dan departemen target.</p>
								</div>
								<span class="px-3 py-1 rounded-lg bg-surface-container font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
									Total Kursus: {courses.length}
								</span>
							</div>

							<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
								<table class="w-full text-xs text-left whitespace-nowrap">
									<thead class="bg-surface-container-high font-bold text-on-surface border-b border-slate-200 dark:border-slate-800">
										<tr>
											<th class="p-3">ID Kursus</th>
											<th class="p-3">Judul Kursus</th>
											<th class="p-3">Kategori</th>
											<th class="p-3">Based</th>
											<th class="p-3">Departemen Target</th>
											<th class="p-3 text-center">Durasi</th>
											<th class="p-3 text-center">Modul</th>
											<th class="p-3 text-center">Passing Grade</th>
											<th class="p-3 text-center">Peserta</th>
											<th class="p-3 text-center">Completion Rate</th>
											<th class="p-3 text-center">Rating</th>
											<th class="p-3 text-center">Status</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-200 dark:divide-slate-800">
										{#each courses as c}
											<tr class="hover:bg-surface-container/50">
												<td class="p-3 font-mono font-bold text-primary">{c.id}</td>
												<td class="p-3 font-bold text-on-surface">{c.title}</td>
												<td class="p-3 text-slate-600 dark:text-slate-300">{c.category}</td>
												<td class="p-3">
													<span class="px-2 py-0.5 rounded text-[9.5px] font-black uppercase
														{c.based === 'Mandatory' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
														c.based === 'Additional' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
														'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'}">
														{c.based || 'Mandatory'}
													</span>
												</td>
												<td class="p-3 font-medium text-slate-500">{c.department || 'All Dept'}</td>
												<td class="p-3 text-center font-mono">{c.durationHours} Jam</td>
												<td class="p-3 text-center font-mono">{c.modulesCount}</td>
												<td class="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-200">{c.passingGrade}</td>
												<td class="p-3 text-center font-mono font-bold text-blue-600">{c.enrolledCount} Org</td>
												<td class="p-3 text-center font-mono font-bold text-emerald-600">{c.completionRate}%</td>
												<td class="p-3 text-center font-mono font-bold text-amber-500">{c.rating.toFixed(1)} ★</td>
												<td class="p-3 text-center">
													<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
														{c.status}
													</span>
												</td>
											</tr>
										{/each}
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

					<!-- REPORT 6: E-SERTIFIKAT DIGITAL -->
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
											<th class="p-3">Kursus Pelatihan</th>
											<th class="p-3">Kategori</th>
											<th class="p-3 text-center">Nilai Ujian</th>
											<th class="p-3">Tanggal Terbit</th>
											<th class="p-3 text-right">Aksi Dokumen</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-200 dark:divide-slate-800">
										{#each certificates as cert}
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
					{playerStep === 1 ? 'bg-primary text-on-primary font-black' : playerStep > 1 ? 'text-emerald-600' : 'text-slate-400'}">
					<span class="material-symbols-outlined text-xs">{playerStep > 1 ? 'check_circle' : 'looks_one'}</span>
					<span>1. Pre-Test</span>
				</div>

				<div class="p-2.5 text-center flex items-center justify-center gap-1.5 border-r border-slate-200 dark:border-slate-800
					{playerStep === 2 ? 'bg-primary text-on-primary font-black' : playerStep > 2 ? 'text-emerald-600' : 'text-slate-400'}">
					<span class="material-symbols-outlined text-xs">{playerStep > 2 ? 'check_circle' : 'looks_two'}</span>
					<span>2. Modul Materi</span>
				</div>

				<div class="p-2.5 text-center flex items-center justify-center gap-1.5 border-r border-slate-200 dark:border-slate-800
					{playerStep === 3 ? 'bg-primary text-on-primary font-black' : playerStep > 3 ? 'text-emerald-600' : 'text-slate-400'}">
					<span class="material-symbols-outlined text-xs">{playerStep > 3 ? 'check_circle' : 'looks_3'}</span>
					<span>3. Post-Test</span>
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
					<div class="max-w-xl mx-auto space-y-6">
						<div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
							<span class="material-symbols-outlined text-emerald-600 text-4xl">check_circle</span>
							<h4 class="font-black text-base text-on-surface">Selamat! Anda LULUS Post-Test</h4>
							<p class="text-xs text-on-surface-variant">
								Nilai Post-Test: <strong class="text-emerald-600 font-mono text-sm">{postTestResult?.score || 90}/100</strong>. Harap lengkapi evaluasi reaksi sebelum mengunduh sertifikat.
							</p>
						</div>

						<div class="p-5 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 space-y-4">
							<h5 class="font-black text-xs uppercase tracking-wider text-slate-500">Evaluasi Kepuasan Pelatihan (Kirkpatrick Level 1)</h5>

							<div class="space-y-3 text-xs">
								<div class="flex justify-between items-center">
									<span>Kualitas & Manfaat Materi:</span>
									<select bind:value={evalL1Ratings.content} class="px-3 py-1 rounded-lg bg-surface border border-slate-300 dark:border-slate-700">
										<option value={5}>5 - Sangat Baik</option>
										<option value={4}>4 - Baik</option>
										<option value={3}>3 - Cukup</option>
									</select>
								</div>

								<div class="flex justify-between items-center">
									<span>Kompetensi & Cara Mengajar Instruktur:</span>
									<select bind:value={evalL1Ratings.instructor} class="px-3 py-1 rounded-lg bg-surface border border-slate-300 dark:border-slate-700">
										<option value={5}>5 - Sangat Baik</option>
										<option value={4}>4 - Baik</option>
										<option value={3}>3 - Cukup</option>
									</select>
								</div>

								<div class="flex justify-between items-center">
									<span>Kemudahan Akses Platform LMS / Fasilitas:</span>
									<select bind:value={evalL1Ratings.facility} class="px-3 py-1 rounded-lg bg-surface border border-slate-300 dark:border-slate-700">
										<option value={5}>5 - Sangat Baik</option>
										<option value={4}>4 - Baik</option>
										<option value={3}>3 - Cukup</option>
									</select>
								</div>

								<div class="space-y-1 pt-2">
									<label class="font-bold text-on-surface block">Komentar & Masukan Kualitatif:</label>
									<textarea
										bind:value={evalL1Ratings.notes}
										rows="3"
										placeholder="Uraikan saran perbaikan atau materi yang sangat bermanfaat bagi pekerjaan Anda..."
										class="w-full p-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 resize-none text-xs"
									></textarea>
								</div>
							</div>

							<button
								type="button"
								onclick={handleLocalEvalL1Submit}
								class="w-full py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md hover:bg-primary/90 transition-all cursor-pointer"
							>
								Simpan Evaluasi & Terbitkan E-Sertifikat
							</button>
						</div>
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
								Selamat kepada <strong>GUNTORO MUHAMAD</strong> atas keberhasilan menyelesaikan kursus <em>{activeCourseForPlayer.title}</em>. E-Sertifikat resmi Anda telah terbit di sistem HRIS.
							</p>
						</div>

						<div class="p-4 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-left text-xs space-y-1">
							<p class="text-slate-500">Nomor Sertifikat: <strong class="font-mono text-primary">{postTestResult?.certNumber || 'CERT-BCS-2026-0889'}</strong></p>
							<p class="text-slate-500">Nilai Akhir: <strong class="font-mono text-emerald-600">{postTestResult?.score || 95}/100</strong></p>
							<p class="text-slate-500">Status Evaluasi Atasan: <span class="text-amber-600 font-bold">Dijadwalkan H+3 Bulan</span></p>
						</div>

						<div class="flex gap-3 justify-center pt-2">
							<button
								type="button"
								onclick={() => (isPlayerModalOpen = false)}
								class="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-surface-container"
							>
								Tutup Player
							</button>

							<button
								type="button"
								onclick={() => {
									isPlayerModalOpen = false;
									openCertificate({
										certificateNumber: postTestResult?.certNumber || 'CERT-BCS-2026-0889',
										payrollId: 'EMP-0042',
										employeeName: 'GUNTORO MUHAMAD',
										courseTitle: activeCourseForPlayer.title,
										category: activeCourseForPlayer.category,
										score: postTestResult?.score || 95,
										issuedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
										qrVerifyUrl: `https://academy.bcslabs.tech/verify/${postTestResult?.certNumber || 'CERT-BCS-2026-0889'}`
									});
								}}
								class="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 shadow-md flex items-center gap-1.5"
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
					<h3 class="font-black text-base text-on-surface">Tambah Kursus Baru ke Katalog</h3>
					<p class="text-[11px] text-slate-500">Standarisasi kurikulum LMS PT Buana Centra Swakarsa 2026</p>
				</div>
				<button type="button" onclick={() => (isCreateModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Stepper Indicator Header -->
			<div class="grid grid-cols-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-surface-container-low text-[11px] font-bold p-1 gap-1">
				<button
					type="button"
					onclick={() => (createModalStep = 1)}
					class="py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer {createModalStep === 1
						? 'bg-primary text-on-primary font-black shadow-xs'
						: 'text-on-surface-variant hover:bg-surface-container'}"
				>
					<span class="material-symbols-outlined text-sm">info</span>
					<span>1. Info & Divisi</span>
				</button>
				<button
					type="button"
					onclick={() => (createModalStep = 2)}
					class="py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer {createModalStep === 2
						? 'bg-primary text-on-primary font-black shadow-xs'
						: 'text-on-surface-variant hover:bg-surface-container'}"
				>
					<span class="material-symbols-outlined text-sm">link</span>
					<span>2. Link Materi</span>
				</button>
				<button
					type="button"
					onclick={() => (createModalStep = 3)}
					class="py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer {createModalStep === 3
						? 'bg-primary text-on-primary font-black shadow-xs'
						: isCreateCourseReadyToSubmit
						? 'text-emerald-600 hover:bg-surface-container'
						: 'text-amber-600 hover:bg-surface-container'}"
				>
					<span class="material-symbols-outlined text-sm">quiz</span>
					<span>3. Soal Asesmen</span>
					{#if !isCreateCourseReadyToSubmit}
						<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
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
					value={divisions.find((d: any) => d.code === createCourseDivision)?.name || createCourseDivision || 'All Dept'}
				/>
				<input
					type="hidden"
					name="representativeEmployees"
					value={JSON.stringify(
						activeEmployees
							.filter((e: any) => selectedEmployeeIds.includes(e.payrollId))
							.map((e: any) => ({ payrollId: e.payrollId, name: e.name, positionTitle: e.positionTitle }))
					)}
				/>
				<input type="hidden" name="preTestQuestions" value={JSON.stringify(preTestQuestionsList)} />
				<input type="hidden" name="postTestQuestions" value={JSON.stringify(postTestQuestionsList)} />

				<!-- Scrollable Form Body -->
				<div class="flex-1 overflow-y-auto pr-1 space-y-3.5 max-h-[60vh]">
					<!-- ══════════════════════════════════════════════════════════════ -->
					<!-- LANGKAH 1: INFO KURSUS & DIVISI SASARAN                       -->
					<!-- ══════════════════════════════════════════════════════════════ -->
					<div class={createModalStep === 1 ? 'space-y-3.5' : 'hidden'}>
						<div>
							<label class="font-bold text-on-surface block mb-1">Judul Kursus Pelatihan *</label>
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

						<div>
							<label class="font-bold text-on-surface block mb-1">Divisi Sasaran *</label>
							<select
								bind:value={createCourseDivision}
								onchange={() => {
									selectedEmployeeIds = [];
									isEmployeeSelectionConfirmed = false;
									createCourseEmployeeSearch = '';
								}}
								class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface font-semibold"
							>
								<option value="">-- Pilih Divisi Sasaran --</option>
								{#each divisions as d}
									<option value={d.code}>{d.name}</option>
								{/each}
							</select>
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

						<!-- SEKSI MULTI-SELECT KARYAWAN PERWAKILAN PER DIVISI -->
						{#if createCourseDivision}
							{@const selectedDivisionObj = divisions.find((d: any) => d.code === createCourseDivision)}
							<div class="p-3.5 rounded-2xl bg-surface-container-low border border-slate-200 dark:border-slate-800 space-y-2.5">
								{#if !isEmployeeSelectionConfirmed}
									<!-- Mode Memilih Karyawan (Picker Aktif) -->
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-1.5">
											<span class="material-symbols-outlined text-primary text-base">group</span>
											<label class="font-bold text-on-surface">Karyawan Perwakilan Divisi</label>
											<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/10 text-primary">
												{selectedEmployeeIds.length} Dipilih
											</span>
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
												onclick={clearAllDivisionEmployees}
												disabled={selectedEmployeeIds.length === 0}
												class="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-[11px] font-bold text-slate-500 disabled:opacity-50 cursor-pointer"
											>
												Reset
											</button>
											<button
												type="button"
												onclick={confirmEmployeeSelection}
												class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-all"
											>
												<span class="material-symbols-outlined text-xs">check</span>
												<span>Selesai</span>
											</button>
										</div>
									</div>

									<p class="text-[11px] text-slate-500">
										Pilih perwakilan dari <strong>{selectedDivisionObj?.name || createCourseDivision}</strong> yang didaftarkan ke kursus ini:
									</p>

									<!-- Search Bar Karyawan Divisi -->
									<div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800">
										<span class="material-symbols-outlined text-slate-400 text-sm">search</span>
										<input
											type="text"
											bind:value={createCourseEmployeeSearch}
											placeholder="Cari nama atau NIK perwakilan..."
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
										<div class="max-h-36 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
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
									<!-- Mode Selesai: Form Pilihan Sembunyi, Tampilkan Karyawan Terpilih -->
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-base">check_circle</span>
											<div>
												<h4 class="font-bold text-xs text-on-surface">Karyawan Perwakilan Terpilih</h4>
												<p class="text-[10px] text-slate-500">Divisi {selectedDivisionObj?.name || createCourseDivision}</p>
											</div>
											<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
												{selectedEmployeeIds.length} Karyawan
											</span>
										</div>

										<button
											type="button"
											onclick={reopenEmployeeSelection}
											class="px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
											title="Buka kembali daftar untuk menambah atau mengubah karyawan perwakilan"
										>
											<span class="material-symbols-outlined text-xs">edit</span>
											<span>Ubah Pilihan</span>
										</button>
									</div>

									{#if selectedEmployeeIds.length === 0}
										<div class="p-3 text-center rounded-xl bg-surface-container/50 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-xs">
											<span>Belum ada karyawan yang dipilih sebagai perwakilan.</span>
											<button type="button" onclick={reopenEmployeeSelection} class="text-primary font-bold hover:underline ml-1 cursor-pointer">
												Pilih Karyawan
											</button>
										</div>
									{:else}
										<div class="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1 py-1">
											{#each activeEmployees.filter((e: any) => selectedEmployeeIds.includes(e.payrollId)) as emp}
												<div class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs shadow-2xs hover:border-primary/40 transition-colors">
													<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
													<div class="flex flex-col text-left">
														<span class="font-bold text-on-surface text-[11px] leading-tight">{emp.name}</span>
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
								{/if}
							</div>
						{/if}

						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class="font-bold text-on-surface block mb-1">Durasi (Jam)</label>
								<input type="number" name="durationHours" value="2.0" step="0.5" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 font-mono text-xs" />
							</div>

							<div>
								<label class="font-bold text-on-surface block mb-1">Passing Grade (%)</label>
								<input type="number" name="passingGrade" value="75" min="50" max="100" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 font-mono text-xs" />
							</div>
						</div>

						<div>
							<label class="font-bold text-on-surface block mb-1">Deskripsi Singkat Kursus</label>
							<textarea name="description" rows="2" placeholder="Uraikan kompetensi dan hasil belajar dari kursus ini..." class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 resize-none text-xs"></textarea>
						</div>
					</div>

					<!-- ══════════════════════════════════════════════════════════════ -->
					<!-- LANGKAH 2: LINK MATERI EMBED & LIVE PREVIEW                   -->
					<!-- ══════════════════════════════════════════════════════════════ -->
					<div class={createModalStep === 2 ? 'space-y-3' : 'hidden'}>
						<div class="flex items-center justify-between">
							<label class="font-bold text-on-surface flex items-center gap-1.5">
								<span class="material-symbols-outlined text-sm text-primary">link</span>
								<span>Link Materi Pembelajaran (Embed Iframe)</span>
							</label>
							<span class="text-[10px] text-slate-400">YouTube, Google Slides/Docs/Drive, Loom, Canva, Vimeo, PDF</span>
						</div>

						<div class="flex gap-2">
							<input
								type="url"
								name="materialUrl"
								bind:value={createCourseMaterialUrl}
								placeholder="Contoh: https://www.youtube.com/watch?v=... atau https://docs.google.com/presentation/d/..."
								class="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface font-mono focus:ring-1 focus:ring-primary outline-none"
							/>
							{#if createCourseMaterialUrl.trim()}
								<button
									type="button"
									onclick={() => (showMaterialPreview = !showMaterialPreview)}
									class="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-surface-container flex items-center gap-1 whitespace-nowrap cursor-pointer"
								>
									<span class="material-symbols-outlined text-sm">{showMaterialPreview ? 'visibility_off' : 'visibility'}</span>
									<span>{showMaterialPreview ? 'Sembunyikan' : 'Preview'}</span>
								</button>
							{/if}
						</div>

						{#if createCourseMaterialUrl.trim() && showMaterialPreview}
							{@const embedSrc = formatEmbedUrl(createCourseMaterialUrl)}
							{@const platform = detectEmbedPlatform(createCourseMaterialUrl)}
							<div class="p-3.5 rounded-2xl bg-surface-container-high border border-primary/20 space-y-2 animate-in fade-in duration-200">
								<div class="flex items-center justify-between text-[11px]">
									<div class="flex items-center gap-1.5 font-bold text-primary">
										<span class="material-symbols-outlined text-sm">{platform.icon}</span>
										<span>Live Preview ({platform.name}):</span>
									</div>
									<span class="text-[10px] text-slate-400 truncate max-w-xs font-mono">{embedSrc}</span>
								</div>
								<div class="w-full h-64 rounded-xl overflow-hidden bg-black/10 border border-slate-200 dark:border-slate-800 shadow-inner">
									<iframe
										src={embedSrc}
										title="Preview Materi Pelatihan"
										class="w-full h-full border-0"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
										allowfullscreen
									></iframe>
								</div>
								<p class="text-[10px] text-slate-400 italic">
									* Materi ini akan langsung ter-embed di Modul 1 Course Player tanpa perlu membuka tab baru / keluar dari aplikasi.
								</p>
							</div>
						{/if}

						<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200 dark:border-slate-800 space-y-2">
							<div class="flex items-center gap-2 text-xs font-bold text-on-surface">
								<span class="material-symbols-outlined text-primary text-sm">integration_instructions</span>
								<span>Struktur Kurikulum Otomatis:</span>
							</div>
							<ul class="text-[11px] text-slate-500 space-y-1 pl-4 list-disc">
								<li><strong>Modul 1:</strong> Materi Utama Pelatihan (Embed video / slide presentasi).</li>
								<li><strong>Modul 2:</strong> SOP & Prosedur Keselamatan Kerja Terkait.</li>
								<li><strong>Modul 3:</strong> Evaluasi Post-Test Kelulusan Kursus.</li>
							</ul>
						</div>
					</div>

					<!-- ══════════════════════════════════════════════════════════════ -->
					<!-- LANGKAH 3: ASESMEN PRE-TEST & POST-TEST BUILDER              -->
					<!-- ══════════════════════════════════════════════════════════════ -->
					<div class={createModalStep === 3 ? 'space-y-3.5' : 'hidden'}>
						<!-- Sub-tab Switcher Pre-Test vs Post-Test -->
						<div class="flex items-center justify-between p-2.5 rounded-2xl bg-surface-container-low border border-slate-200 dark:border-slate-800">
							<div class="flex items-center gap-1.5">
								<button
									type="button"
									onclick={() => (createQuizTab = 'PRE_TEST')}
									class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 {createQuizTab === 'PRE_TEST'
										? 'bg-primary text-on-primary shadow-xs'
										: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
								>
									<span>Pre-Test ({preTestQuestionsList.length} Soal)</span>
									{#if isPreTestValid}
										<span class="material-symbols-outlined text-[14px] text-emerald-400">check_circle</span>
									{/if}
								</button>
								<button
									type="button"
									onclick={() => (createQuizTab = 'POST_TEST')}
									class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 {createQuizTab === 'POST_TEST'
										? 'bg-primary text-on-primary shadow-xs'
										: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
								>
									<span>Post-Test ({postTestQuestionsList.length} Soal)</span>
									{#if isPostTestValid}
										<span class="material-symbols-outlined text-[14px] text-emerald-400">check_circle</span>
									{/if}
								</button>
							</div>

							<div class="flex items-center gap-2">
								{#if createQuizTab === 'POST_TEST'}
									<button
										type="button"
										onclick={copyPreTestToPostTest}
										class="px-2.5 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
										title="Salin seluruh butir pertanyaan dan opsi jawaban dari Pre-Test"
									>
										<span class="material-symbols-outlined text-xs">content_copy</span>
										<span>Salin dari Pre-Test</span>
									</button>
								{/if}
								<button
									type="button"
									onclick={() => addQuestion(createQuizTab)}
									class="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-[11px] font-bold hover:bg-primary/90 flex items-center gap-1 shadow-xs cursor-pointer"
								>
									<span class="material-symbols-outlined text-xs">add</span>
									<span>Tambah Soal</span>
								</button>
							</div>
						</div>

						<p class="text-[11px] text-slate-500 px-1">
							{createQuizTab === 'PRE_TEST'
								? 'Soal Pre-Test akan dikerjakan peserta di Langkah 1 Player untuk mengukur pemahaman awal sebelum membuka modul materi.'
								: 'Soal Post-Test akan dikerjakan di Langkah 3 Player untuk penentuan kelulusan peserta (Passing Grade) dan penerbitan sertifikat.'}
						</p>

						<!-- Dynamic Question Cards List -->
						<div class="space-y-3 max-h-72 overflow-y-auto pr-1">
							{#each currentQuizQuestions as q, qIdx (q.id)}
								<div class="p-3.5 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-xs">
									<div class="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
										<span class="font-bold text-xs text-primary flex items-center gap-1">
											<span class="material-symbols-outlined text-sm">help</span>
											<span>Soal #{qIdx + 1} ({createQuizTab === 'PRE_TEST' ? 'Pre-Test' : 'Post-Test'})</span>
										</span>
										<div class="flex items-center gap-2">
											<select
												bind:value={q.questionType}
												class="text-[11px] font-bold px-2 py-1 rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-on-surface focus:ring-1 focus:ring-primary outline-none cursor-pointer"
											>
												<option value="MCQ">Pilihan Ganda (MCQ)</option>
												<option value="ESSAY">Essay / Uraian Bebas</option>
											</select>
											{#if currentQuizQuestions.length > 1}
												<button
													type="button"
													onclick={() => removeQuestion(createQuizTab, qIdx)}
													class="text-rose-500 hover:text-rose-700 text-[11px] font-bold flex items-center gap-0.5 cursor-pointer ml-1"
												>
													<span class="material-symbols-outlined text-sm">delete</span>
													<span>Hapus</span>
												</button>
											{/if}
										</div>
									</div>

									<!-- Question Text Input -->
									<div>
										<label class="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Pertanyaan *</label>
										<input
											type="text"
											bind:value={q.questionText}
											placeholder={`Ketik teks pertanyaan nomor ${qIdx + 1}...`}
											class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none"
										/>
									</div>

									{#if q.questionType === 'MCQ'}
										<!-- Options A, B, C, D -->
										<div class="space-y-1.5 pt-1">
											<label class="font-semibold text-slate-600 dark:text-slate-400 block">
												Pilihan Jawaban (Pilih radio untuk Kunci Jawaban Benar) *
											</label>
											{#each q.options as opt}
												<div class="flex items-center gap-2">
													<label class="flex items-center gap-1 cursor-pointer">
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
						{#if createModalStep < 3}
							<button
								type="button"
								onclick={nextCreateStep}
								class="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-sm cursor-pointer"
							>
								<span>Lanjut: {createModalStep === 1 ? 'Materi & Embed' : 'Soal Pre/Post Test'}</span>
								<span class="material-symbols-outlined text-xs">arrow_forward</span>
							</button>
						{:else}
							<button
								type="submit"
								disabled={!isCreateCourseReadyToSubmit}
								class="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<span class="material-symbols-outlined text-sm">save</span>
								<span>Simpan Kursus ke Database</span>
							</button>
						{/if}
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 3: JADWAL SESI TRAINING BARU (CREATE SESSION)                     -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isSessionModalOpen}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<h3 class="font-black text-base text-on-surface">Jadwalkan Sesi Training Baru</h3>
					<p class="text-[11px] text-slate-500">Input jadwal sesi training resmi internal maupun sertifikasi</p>
				</div>
				<button type="button" onclick={() => (isSessionModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/createSession" use:enhance class="space-y-3.5 text-xs overflow-y-auto pr-1">
				<div>
					<label class="font-bold text-on-surface block mb-1">Judul Sesi Pelatihan *</label>
					<input type="text" name="title" required placeholder="Contoh: Re-Induksi Keselamatan & SWP Batch 2..." class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface" />
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="font-bold text-on-surface block mb-1">Pilih Kursus Terkait</label>
						<select name="courseId" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface">
							<option value="">-- Tanpa Kursus Online --</option>
							{#each courses as c}
								<option value={c.id}>{c.title}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="font-bold text-on-surface block mb-1">Klasifikasi Based *</label>
						<select name="based" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface">
							<option value="Mandatory">Mandatory (Wajib K3)</option>
							<option value="Additional">Additional (Pengembangan)</option>
							<option value="Gap Competency">Gap Competency (TNA Plan)</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="font-bold text-on-surface block mb-1">Nama Trainer *</label>
						<select name="trainer" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface">
							{#each masterTrainers as t}
								<option value={t.name}>{t.name} ({t.title})</option>
							{/each}
							<option value="Instruktur Eksternal">Instruktur Eksternal Lembaga</option>
						</select>
					</div>

					<div>
						<label class="font-bold text-on-surface block mb-1">Tipe Trainer & Sesi</label>
						<div class="grid grid-cols-2 gap-2">
							<select name="trainerType" class="w-full px-2 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface">
								<option value="Internal">Internal</option>
								<option value="Eksternal">Eksternal</option>
							</select>
							<select name="sessionType" class="w-full px-2 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface">
								<option value="OFFLINE">Offline</option>
								<option value="ONLINE">Online</option>
							</select>
						</div>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="font-bold text-on-surface block mb-1">Departemen Peserta</label>
						<select name="department" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface">
							<option value="All Dept">All Dept</option>
							<option value="Project 4">Project 4</option>
							<option value="Operations">Operations</option>
							<option value="Driver">Driver & Armada</option>
							<option value="Transport (Maintenance & Asset)">Transport (Maintenance & Asset)</option>
							<option value="Labour Project 1">Labour Project 1</option>
							<option value="QHSE & Safety">QHSE & Safety</option>
						</select>
					</div>

					<div>
						<label class="font-bold text-on-surface block mb-1">Biaya Trainer (IDR)</label>
						<input type="number" name="costTrainer" value="500000" step="50000" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 font-mono text-xs" />
					</div>
				</div>

				<div>
					<label class="font-bold text-on-surface block mb-1">Lokasi / Tautan Meeting *</label>
					<input type="text" name="locationOrLink" required placeholder="Ruang Aula Training BCS Cilegon atau https://meet.google.com/..." class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface" />
				</div>

				<div class="grid grid-cols-3 gap-2">
					<div>
						<label class="font-bold text-on-surface block mb-1">Tanggal *</label>
						<input type="date" name="sessionDate" required class="w-full px-2.5 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 font-mono text-xs text-on-surface" />
					</div>

					<div>
						<label class="font-bold text-on-surface block mb-1">Jam Mulai</label>
						<input type="time" name="startTime" value="09:00" class="w-full px-2 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 font-mono text-xs text-on-surface" />
					</div>

					<div>
						<label class="font-bold text-on-surface block mb-1">Jam Selesai</label>
						<input type="time" name="endTime" value="11:30" class="w-full px-2 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 font-mono text-xs text-on-surface" />
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => (isSessionModalOpen = false)} class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-surface-container cursor-pointer">
						Batal
					</button>
					<button type="submit" class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1 shadow-sm cursor-pointer">
						<span class="material-symbols-outlined text-sm">event</span>
						<span>Simpan Jadwal Sesi</span>
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
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<h3 class="font-black text-base text-on-surface">Input Kehadiran Peserta</h3>
					<p class="text-xs text-on-surface-variant truncate max-w-xs">{activeSessionForAttendance.title}</p>
				</div>
				<button type="button" onclick={() => (isAttendanceModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/markAttendance" use:enhance class="space-y-3.5 text-xs">
				<input type="hidden" name="sessionId" value={activeSessionForAttendance.id} />

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="font-bold text-on-surface block mb-1">Payroll ID *</label>
						<input type="text" name="payrollId" required placeholder="EMP-0042" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 font-mono" />
					</div>

					<div>
						<label class="font-bold text-on-surface block mb-1">Departemen</label>
						<input type="text" name="department" value="Operations" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800" />
					</div>
				</div>

				<div>
					<label class="font-bold text-on-surface block mb-1">Nama Lengkap Peserta *</label>
					<input type="text" name="employeeName" required placeholder="Nama karyawan / driver..." class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800" />
				</div>

				<div>
					<label class="font-bold text-on-surface block mb-1">Status Kehadiran</label>
					<select name="status" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 font-bold">
						<option value="HADIR">HADIR</option>
						<option value="IZIN">IZIN</option>
						<option value="ALPA">ALPA</option>
					</select>
				</div>

				<div>
					<label class="font-bold text-on-surface block mb-1">Catatan Kehadiran</label>
					<input type="text" name="notes" placeholder="Hadir tepat waktu / alasan izin..." class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800" />
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => (isAttendanceModalOpen = false)} class="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-surface-container">
						Batal
					</button>
					<button type="submit" class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1">
						<span class="material-symbols-outlined text-sm">check</span>
						<span>Simpan Absensi</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- MODAL 5: EVALUASI ATASAN (KIRKPATRICK LEVEL 3 & LEVEL 4)                 -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if isEvalSupervisorModalOpen && activeEvalForSupervisor}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<h3 class="font-black text-base text-on-surface">Penilaian Pasca-Training Atasan (H+3 Bulan)</h3>
					<p class="text-xs text-on-surface-variant">{activeEvalForSupervisor.employeeName} ({activeEvalForSupervisor.payrollId})</p>
				</div>
				<button type="button" onclick={() => (isEvalSupervisorModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/submitEvaluationL3L4" use:enhance class="space-y-3.5 text-xs">
				<input type="hidden" name="evalId" value={activeEvalForSupervisor.id} />

				<div class="p-3 rounded-xl bg-surface-container text-xs space-y-1">
					<p class="text-slate-500">Pelatihan: <strong class="text-on-surface">{activeEvalForSupervisor.courseTitle}</strong></p>
					<p class="text-slate-500">Due Date Evaluasi: <strong class="font-mono text-rose-600">{activeEvalForSupervisor.dueDate}</strong></p>
				</div>

				<div class="space-y-3">
					<div>
						<label class="font-bold text-on-surface block mb-1">Level 3: Penerapan SOP & Kedisiplinan Kerja (1-5)</label>
						<select name="sopComplianceScore" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800">
							<option value={5}>5 - Sangat Patuh & Selalu Mengikuti SOP</option>
							<option value={4}>4 - Patuh dengan Pengawasan Minimal</option>
							<option value={3}>3 - Cukup, Masih Perlu Diingatkan</option>
						</select>
					</div>

					<div>
						<label class="font-bold text-on-surface block mb-1">Level 3: Perubahan Perilaku Positif di Lapangan (1-5)</label>
						<select name="behaviorScore" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800">
							<option value={5}>5 - Menunjukkan Inisiatif & Teladan bagi Rekan Kerja</option>
							<option value={4}>4 - Terlihat Peningkatan Perilaku Kerja</option>
							<option value={3}>3 - Perubahan Standar</option>
						</select>
					</div>

					<div>
						<label class="font-bold text-on-surface block mb-1">Level 4: Dampak Nyata pada Efisiensi & Bisnis (1-5)</label>
						<select name="businessImpactScore" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800">
							<option value={5}>5 - Zero Incident & Penghematan Biaya/Waktu Signifikan</option>
							<option value={4}>4 - Penurunan Klaim & Tidak Ada Pelanggaran SLA</option>
							<option value={3}>3 - Dampak Normal</option>
						</select>
					</div>

					<div>
						<label class="font-bold text-on-surface block mb-1">Catatan Bukti Lapangan (Penurunan Insiden / Efisiensi)</label>
						<textarea name="incidentReductionNotes" rows="2" placeholder="Contoh: Kepatuhan rute 100%, nihil klaim selisih muatan selama 3 bulan..." class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 resize-none"></textarea>
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => (isEvalSupervisorModalOpen = false)} class="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-surface-container">
						Batal
					</button>
					<button type="submit" class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1">
						<span class="material-symbols-outlined text-sm">verified</span>
						<span>Simpan Penilaian Atasan</span>
					</button>
				</div>
			</form>
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

					<!-- Date and City -->
					<div class="text-center text-[11px] text-slate-600">
						<p>Diterbitkan di Cilegon, Banten</p>
						<p class="font-bold text-slate-900">{activeCertData.issuedAt}</p>
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

					<!-- List Checklist Multi-Select dengan Pengaturan Level per Baris -->
					<div class="flex-1 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-surface">
						{#each filteredModalCompetencies as comp}
							{@const isChecked = selectedCompStandards[comp.code]?.selected || false}
							{@const currentLevel = selectedCompStandards[comp.code]?.requiredLevel || 3}
							<div class="p-3 flex items-center justify-between gap-3 hover:bg-surface-container/40 transition-colors {isChecked ? 'bg-primary/5' : ''}">
								<label class="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
									<input
										type="checkbox"
										checked={isChecked}
										onchange={() => toggleModalCompSelection(comp.code)}
										class="w-4 h-4 rounded-md border-slate-400 text-primary focus:ring-primary cursor-pointer"
									/>
									<div class="min-w-0">
										<div class="flex items-center gap-2 flex-wrap">
											<span class="px-1.5 py-0.5 rounded-md font-mono text-[10px] font-black bg-surface-container-high border border-slate-700 text-primary">
												{comp.code}
											</span>
											<span class="text-[10px] text-slate-400 font-semibold">{comp.aspect}</span>
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
