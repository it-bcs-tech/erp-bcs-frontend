<script lang="ts">
	import { enhance } from '$app/forms';
	import { notifySuccess, notifyError } from '$lib/stores/notifications';

	let { data } = $props();

	// Submission Feedback State
	let isSubmitting = $state(false);
	let notificationAlert = $state<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

	// Derived Master Data from Server
	const activeAssessors = $derived((data as any).activeAssessors || []);
	const directHierarchy = $derived((data as any).directHierarchy || []);
	const activeEmployees = $derived((data as any).activeEmployees || []);
	const jobStandards = $derived((data as any).jobStandards || []);
	const competencyLibrary = $derived((data as any).competencyLibrary || []);
	const existingAssessments = $derived((data as any).existingAssessments || []);
	const currentYear = new Date().getFullYear();
	const assessmentPeriods = $derived((data as any).assessmentPeriods || [String(currentYear), String(currentYear - 1), String(currentYear - 2)]);
	const currentUser = $derived((data as any).currentUser);

	// State Asesor Terpilih (Default ke user login jika terdaftar sebagai atasan)
	let selectedAssessorPayrollId = $state(
		activeAssessors.find((a: any) => a.payrollId === currentUser?.payrollId)?.payrollId ||
		activeAssessors.find((a: any) => a.positionTitle?.toUpperCase().includes('STORAGE') || a.positionTitle?.toUpperCase().includes('SPV'))?.payrollId ||
		(activeAssessors[0]?.payrollId || '')
	);

	const currentAssessor = $derived.by(() => {
		return activeAssessors.find((a: any) => a.payrollId === selectedAssessorPayrollId) || activeAssessors[0] || null;
	});

	// Semua Jabatan Bawahan Langsung untuk Asesor Terpilih
	const directSubordinateTitles = $derived.by(() => {
		if (!currentAssessor) return [];
		return directHierarchy
			.filter((h: any) => h.titleAtasan === currentAssessor.titleCode)
			.map((h: any) => ({
				code: h.titleBawahan,
				title: h.namaJabatanBawahan
			}));
	});

	// Semua Anggota Tim Bawahan Langsung (Cross-Position)
	const allDirectSubordinates = $derived.by(() => {
		if (!currentAssessor) return [];
		const allowedCodes = new Set(directSubordinateTitles.map((t: any) => t.code));
		return activeEmployees.filter((e: any) => allowedCodes.has(e.titleCode));
	});

	// State Periode Penilaian
	let selectedPeriod = $state(String(new Date().getFullYear()));

	// State Filter Bawahan di Panel Kiri
	let subordinateSearchQuery = $state('');
	let subordinatePositionFilter = $state('All');
	let subordinateStatusFilter = $state<'All' | 'Unassessed' | 'Assessed'>('All');

	// Helper Status Asesmen Karyawan
	function getEmployeeAssessmentStatus(payrollId: string, positionTitle: string) {
		const requiredComps = jobStandards.filter((s: any) => s.positionTitle.toLowerCase() === positionTitle.toLowerCase());
		const assessedComps = existingAssessments.filter((a: any) => a.payrollId === payrollId && a.period === selectedPeriod);

		const isAssessed = assessedComps.length > 0;
		const gapsCount = assessedComps.filter((a: any) => a.gap < 0).length;
		const qualifiedCount = assessedComps.filter((a: any) => a.gap >= 0).length;
		const avgScore = isAssessed
			? (assessedComps.reduce((acc: number, curr: any) => acc + Number(curr.actualLevel), 0) / assessedComps.length).toFixed(1)
			: '0';
		const totalRequired = requiredComps.length;
		const assessedCount = assessedComps.length;
		const percent = totalRequired > 0 ? Math.min(100, Math.round((assessedCount / totalRequired) * 100)) : 0;

		return {
			isAssessed,
			totalRequired,
			assessedCount,
			percent,
			gapsCount,
			qualifiedCount,
			avgScore,
			lastDate: assessedComps[0]?.assessmentDate || '-'
		};
	}

	// Filtered Subordinates untuk Panel Kiri
	const filteredSubordinates = $derived.by(() => {
		return allDirectSubordinates.filter((emp: any) => {
			const q = subordinateSearchQuery.trim().toLowerCase();
			const matchSearch = !q ||
				emp.name.toLowerCase().includes(q) ||
				emp.payrollId.toLowerCase().includes(q) ||
				emp.positionTitle.toLowerCase().includes(q);

			const matchPosition = subordinatePositionFilter === 'All' || emp.positionTitle === subordinatePositionFilter;

			const status = getEmployeeAssessmentStatus(emp.payrollId, emp.positionTitle);
			let matchStatus = true;
			if (subordinateStatusFilter === 'Unassessed') {
				matchStatus = !status.isAssessed;
			} else if (subordinateStatusFilter === 'Assessed') {
				matchStatus = status.isAssessed;
			}

			return matchSearch && matchPosition && matchStatus;
		});
	});

	// State Karyawan Aktif yang Sedang Dinilai di Panel Kanan
	let selectedEmployeePayrollId = $state('');

	$effect(() => {
		if (filteredSubordinates.length > 0) {
			if (!selectedEmployeePayrollId || !filteredSubordinates.some((e: any) => e.payrollId === selectedEmployeePayrollId)) {
				selectedEmployeePayrollId = filteredSubordinates[0].payrollId;
			}
		} else {
			selectedEmployeePayrollId = '';
		}
	});

	const selectedEmployee = $derived.by(() => {
		return allDirectSubordinates.find((e: any) => e.payrollId === selectedEmployeePayrollId) || null;
	});

	// Daftar Standar Kompetensi untuk Karyawan Terpilih
	const selectedEmployeeCompetencies = $derived.by(() => {
		if (!selectedEmployee) return [];
		return jobStandards.filter((s: any) =>
			s.positionTitle.toLowerCase() === selectedEmployee.positionTitle.toLowerCase()
		);
	});

	// Kelompokkan Kompetensi Berdasarkan Aspek
	const coreCompetencies = $derived.by(() => {
		return selectedEmployeeCompetencies.filter((c: any) => c.competencyAspect === 'Core Competency');
	});

	const behavioralCompetencies = $derived.by(() => {
		return selectedEmployeeCompetencies.filter((c: any) => c.competencyAspect === 'Behavioral Competency');
	});

	const technicalCompetencies = $derived.by(() => {
		return selectedEmployeeCompetencies.filter((c: any) =>
			c.competencyAspect === 'Technical Competency' ||
			(c.competencyAspect !== 'Core Competency' && c.competencyAspect !== 'Behavioral Competency')
		);
	});

	// Rating & Notes State (Safe Reactive Maps)
	let ratingsMap = $state<Record<string, number>>({});
	let notesMap = $state<Record<string, string>>({});
	let generalNotes = $state('Penilaian berkala bawahan langsung mengacu pada pengamatan kondisi nyata di lapangan.');

	function getRating(payrollId: string, compCode: string): number {
		const key = `${payrollId}_${compCode}`;
		if (ratingsMap[key] !== undefined) {
			return ratingsMap[key];
		}
		const existing = existingAssessments.find(
			(a: any) => a.payrollId === payrollId && a.competencyCode === compCode && a.period === selectedPeriod
		);
		if (existing) {
			return existing.actualLevel;
		}
		return 0; // 0 = belum dipilih oleh penilai
	}

	function setRating(payrollId: string, compCode: string, level: number) {
		ratingsMap[`${payrollId}_${compCode}`] = level;
	}

	function getNote(payrollId: string, compCode: string): string {
		const key = `${payrollId}_${compCode}`;
		if (notesMap[key] !== undefined) {
			return notesMap[key];
		}
		const existing = existingAssessments.find(
			(a: any) => a.payrollId === payrollId && a.competencyCode === compCode && a.period === selectedPeriod
		);
		return existing?.notes || '';
	}

	function setNote(payrollId: string, compCode: string, text: string) {
		notesMap[`${payrollId}_${compCode}`] = text;
	}

	function resetRatingsForSelected() {
		if (!selectedEmployee) return;
		selectedEmployeeCompetencies.forEach((c: any) => {
			delete ratingsMap[`${selectedEmployee.payrollId}_${c.competencyCode}`];
			delete notesMap[`${selectedEmployee.payrollId}_${c.competencyCode}`];
		});
	}

	function getLevelDescription(compCode: string, lvl: number): string {
		const compObj = competencyLibrary.find((l: any) => l.code === compCode);
		const ind = compObj?.levelIndicators?.find((i: any) => i.level === lvl || Number(i.level) === lvl);
		if (ind && ind.desc && ind.desc.trim()) {
			return ind.desc.trim();
		}
		const defaultLabels: Record<number, string> = {
			1: 'Pemahaman konsep dasar & SOP operasional rutin dengan supervisi langsung.',
			2: 'Pelaksanaan tugas secara mandiri sesuai standar mutu tanpa pengawasan konstan.',
			3: 'Kemampuan pemecahan masalah (troubleshooting), adaptif terhadap situasi kerja dan kendala operasional.',
			4: 'Mampu membimbing/mentoring rekan kerja, mengontrol kepatuhan sistem, dan koordinasi tim.',
			5: 'Ahli / rujukan strategis organisasi, mampu melakukan optimasi sistemik dan inovasi berkelanjutan.'
		};
		return defaultLabels[lvl] || `Indikator perilaku level ${lvl}`;
	}

	function getLevelLabel(lvl: number): string {
		const labels: Record<number, string> = {
			1: 'Dasar',
			2: 'Mandiri',
			3: 'Kompeten',
			4: 'Mahir',
			5: 'Ahli'
		};
		return labels[lvl] || `Level ${lvl}`;
	}

	// Modal Rubrik Indikator Level 1-5
	let isRubricModalOpen = $state(false);
	let selectedCompForRubric = $state<any>(null);

	function openRubricModal(comp: any, aspectTitle?: string) {
		const indicators = [1, 2, 3, 4, 5].map((lvl) => ({
			level: lvl,
			desc: getLevelDescription(comp.competencyCode, lvl)
		}));
		selectedCompForRubric = {
			code: comp.competencyCode,
			name: comp.competencyName,
			aspect: aspectTitle || comp.competencyAspect || 'Kompetensi Jabatan',
			levelIndicators: indicators
		};
		isRubricModalOpen = true;
	}

	// Tab View State: 6 Tab Penilaian Atasan (Asesmen Tahunan di Nomor 1 sebagai Tab Utama)
	let activeViewTab = $state<'annual' | 'history' | 'training_requests' | 'post_training_l4_pre' | 'post_training_l3' | 'post_training_l4_post'>('annual');

	// Data Evaluasi Pasca-Training Kirkpatrick (Level 3 & Level 4)
	const postTrainingEvals = $derived((data as any).postTrainingEvals || []);
	const trainingRequests = $derived((data as any).trainingRequests || []);

	// State Usulan Pelatihan Tim oleh Atasan
	let requestSearchQuery = $state('');
	let requestStatusFilter = $state<'All' | 'PENDING' | 'APPROVED' | 'HOLD'>('All');
	let isTrainingRequestModalOpen = $state(false);
	let requestFormDept = $state('');
	let requestFormTitle = $state('');
	let requestFormCategory = $state('Technical Competency');
	let requestFormUrgency = $state<'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
	let requestFormEstimatedParticipants = $state(5);
	let requestFormTargetDate = $state('');
	let requestFormJustification = $state('');

	function openCreateTrainingRequestModal(prefill?: { title?: string; dept?: string; justification?: string }) {
		requestFormDept = prefill?.dept || currentAssessor?.department || 'Operations';
		requestFormTitle = prefill?.title || '';
		requestFormCategory = 'Technical Competency';
		requestFormUrgency = 'NORMAL';
		requestFormEstimatedParticipants = 5;
		requestFormTargetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		requestFormJustification = prefill?.justification || '';
		isTrainingRequestModalOpen = true;
	}

	const myTrainingRequests = $derived.by(() => {
		return trainingRequests.filter((r: any) => {
			const assessorName = currentAssessor?.name || '';
			const currentUserName = currentUser?.nama_karyawan || currentUser?.name || '';
			const matchAuthor = !assessorName || r.requestedBy === assessorName || r.requestedBy === currentUserName || r.deptName === currentAssessor?.department;
			const q = requestSearchQuery.trim().toLowerCase();
			const matchSearch = !q || r.trainingTitle.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.deptName.toLowerCase().includes(q);
			const matchStatus = requestStatusFilter === 'All' || r.status === requestStatusFilter;
			return matchAuthor && matchSearch && matchStatus;
		});
	});

	const myPendingRequestsCount = $derived(
		trainingRequests.filter((r: any) => {
			const assessorName = currentAssessor?.name || '';
			const currentUserName = currentUser?.nama_karyawan || currentUser?.name || '';
			const matchAuthor = !assessorName || r.requestedBy === assessorName || r.requestedBy === currentUserName || r.deptName === currentAssessor?.department;
			return matchAuthor && r.status === 'PENDING';
		}).length
	);

	const assessorDirectSubordinateIds = $derived(
		new Set(allDirectSubordinates.map((e: any) => e.payrollId))
	);

	const subordinatePostTrainingEvals = $derived.by(() => {
		if (allDirectSubordinates.length === 0) return postTrainingEvals;
		return postTrainingEvals.filter((e: any) => assessorDirectSubordinateIds.has(e.payrollId));
	});

	const todayDateStr = new Date().toISOString().split('T')[0];

	// Level 3: Evaluasi Sikap & Perilaku (Kirkpatrick Level 3: Behavior - Fase H+3 Bulan)
	const l3ReadyEvals = $derived(
		subordinatePostTrainingEvals.filter(
			(e: any) => e.l3Status === 'PENDING' && (!e.dueDate || e.dueDate <= todayDateStr)
		)
	);
	const l3UpcomingEvals = $derived(
		subordinatePostTrainingEvals.filter(
			(e: any) => e.l3Status === 'PENDING' && e.dueDate && e.dueDate > todayDateStr
		)
	);
	const l3CompletedEvals = $derived(
		subordinatePostTrainingEvals.filter((e: any) => e.l3Status === 'COMPLETED')
	);
	const l3ReadyCount = $derived(l3ReadyEvals.length);

	// 15 Butir Pertanyaan Level 3 (Behavior) sesuai Master Spreadsheet
	const l3BehaviorQuestions = [
		{
			aspect: 'Sikap & Perilaku',
			description: 'Atasan melakukan evaluasi sikap & perilaku terhadap peserta pelatihan pasca mengikuti pelatihan',
			items: [
				{ id: 'b1', label: 'Pengendalian Emosi' },
				{ id: 'b2', label: 'Penghormatan/Penghargaan kepada atasan/Rekan/bawahan' },
				{ id: 'b3', label: 'Semangat tertib dan disiplin' },
				{ id: 'b4', label: 'Kerjasama dan interaksi interpersonal' },
				{ id: 'b5', label: 'Tanggung jawab terhadap tugas' }
			]
		},
		{
			aspect: 'Pengetahuan',
			description: 'Atasan melakukan evaluasi terhadap peningkatan pengetahuan peserta training paska melakukan pelatihan',
			items: [
				{ id: 'k1', label: 'Penambahan pengetahuan pada bagian yang dilatihkan' },
				{ id: 'k2', label: 'Kemampuan menganalisa dan memandang masalah' },
				{ id: 'k3', label: 'Proses dan kualitas pengambilan keputusan / penyelesaian masalah' },
				{ id: 'k4', label: 'Gagasan dan semangat perbaikan pada fungsinya' },
				{ id: 'k5', label: 'Kepercayaan diri karena pengetahuan yang dimiliki' }
			]
		},
		{
			aspect: 'Keterampilan',
			description: 'Atasan melakukan evaluasi kepada peserta pelatihan terhadap peningkatan keterampilan paska pelatihan',
			items: [
				{ id: 's1', label: 'Penguasaan proses/prosedur kerja' },
				{ id: 's2', label: 'Penggunaan sarana/prasarana' },
				{ id: 's3', label: 'Kualitas hasil pekerjaan' },
				{ id: 's4', label: 'Kecepatan penyelesaian pekerjaan' },
				{ id: 's5', label: 'Kreatifitas dalam penyelesaian pekerjaan' }
			]
		}
	];

	const l3LikertOptions = [
		{ value: 1, label: '1: Tidak Lebih Baik', desc: 'Belum ada perubahan' },
		{ value: 2, label: '2: Sedikit Berubah', desc: 'Sedikit perbaikan' },
		{ value: 3, label: '3: Lebih Baik', desc: 'Peningkatan nyata' }
	];

	// Level 4 Pre-Test: Baseline 3 Bulan Sebelum Training (SLA 10 Hari Pasca-Training)
	const l4PrePendingEvals = $derived(
		subordinatePostTrainingEvals.filter((e: any) => e.l4PreStatus === 'PENDING')
	);
	const l4PreCompletedEvals = $derived(
		subordinatePostTrainingEvals.filter((e: any) => e.l4PreStatus === 'COMPLETED')
	);
	const l4PrePendingCount = $derived(l4PrePendingEvals.length);

	function getPreRemainingDays(dueDateStr: string): { days: number; isOverdue: boolean } {
		if (!dueDateStr) return { days: 0, isOverdue: false };
		const due = new Date(dueDateStr).getTime();
		const now = new Date(todayDateStr).getTime();
		const diffDays = Math.round((due - now) / (1000 * 60 * 60 * 24));
		return {
			days: Math.abs(diffDays),
			isOverdue: diffDays < 0
		};
	}

	// Definisi 4 Kategori Skill Level 4 Pre-Test sesuai Master Spreadsheet
	const preSkillCategoryDefinitions = {
		'Technical Skill': {
			label: 'Technical Skill',
			icon: 'engineering',
			badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
			description: 'Keterampilan operasional & teknis sesuai fungsi jabatan.',
			metrics: [
				{ id: 'p1', label: 'Waktu Penyelesaian Pekerjaan Teknis', unit: 'Jam', hint: 'Total waktu penyelesaian per pekerjaan sesuai SOP (dalam 3 bulan sebelum pelatihan).' },
				{ id: 'p2', label: 'Error / Rework Teknis', unit: 'Kejadian', hint: 'Total kesalahan teknis atau pekerjaan ulang akibat ketidaksesuaian prosedur.' },
				{ id: 'p3', label: 'Penerapan Materi Teknis', unit: 'Penerapan', hint: 'Frekuensi penerapan keterampilan teknis di lingkungan kerja nyata.' },
				{ id: 'p4', label: 'Eskalasi Teknis ke Atasan', unit: 'Kasus', hint: 'Masalah teknis yang tidak dapat diselesaikan mandiri sehingga perlu eskalasi.' }
			]
		},
		'Soft Skill': {
			label: 'Soft Skill',
			icon: 'psychology',
			badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
			description: 'Komunikasi, kepemimpinan, kerjasama tim, dan inisiatif personal.',
			metrics: [
				{ id: 'p1', label: 'Keterlambatan Tugas', unit: 'Kejadian', hint: 'Jumlah keterlambatan penyelesaian tugas dari jadwal yang disepakati.' },
				{ id: 'p2', label: 'Komplain Internal / Rekan Kerja', unit: 'Komplain', hint: 'Komplain atau keluhan terkait sikap kerja, komunikasi, atau cara kerja tim.' },
				{ id: 'p3', label: 'Penerapan Soft Skill Kerja', unit: 'Kasus', hint: 'Masalah kerja atau dinamika tim yang berhasil diselesaikan dengan pendekatan positif.' },
				{ id: 'p4', label: 'Keputusan Kerja Mandiri', unit: 'Keputusan', hint: 'Keputusan kerja mandiri yang tepat tanpa harus menunggu instruksi atasan.' }
			]
		},
		'Safety': {
			label: 'Safety (K3)',
			icon: 'health_and_safety',
			badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
			description: 'Kepatuhan K3, kesadaran bahaya, dan perlindungan lingkungan kerja.',
			metrics: [
				{ id: 'p1', label: 'Insiden / Kecelakaan Kerja', unit: 'Kejadian', hint: 'Kejadian insiden atau kecelakaan kerja yang melibatkan karyawan.' },
				{ id: 'p2', label: 'Pelanggaran Prosedur Safety', unit: 'Pelanggaran', hint: 'Pelanggaran terhadap SOP K3/safety atau kelalaian pemakaian APD.' },
				{ id: 'p3', label: 'Pelaporan Potensi Bahaya (Hazard)', unit: 'Laporan', hint: 'Keaktifan membuat laporan identifikasi bahaya/unsafe condition.' },
				{ id: 'p4', label: 'Keputusan Safety Mandiri', unit: 'Keputusan', hint: 'Tindakan stop work authority atau inisiatif pencegahan bahaya secara mandiri.' }
			]
		},
		'Hard Skill': {
			label: 'Hard Skill',
			icon: 'precision_manufacturing',
			badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
			description: 'Kecepatan, akurasi, dan kapabilitas penanganan peralatan/sistem.',
			metrics: [
				{ id: 'p1', label: 'Produktivitas Output Kerja', unit: 'Output', hint: 'Jumlah output atau volume pekerjaan yang diselesaikan per periode kerja.' },
				{ id: 'p2', label: 'Waktu Per Satuan Output', unit: 'Menit', hint: 'Rata-rata waktu yang dihabiskan untuk menyelesaikan satu unit pekerjaan.' },
				{ id: 'p3', label: 'Kualitas & Akurasi Hasil Kerja', unit: 'Kejadian', hint: 'Frekuensi kesalahan atau cacat hasil kerja yang memerlukan koreksi.' },
				{ id: 'p4', label: 'Pemecahan Masalah Mandiri', unit: 'Kasus', hint: 'Kasus kendala operasional yang berhasil diselesaikan tanpa bantuan pihak lain.' }
			]
		}
	};

	// Modal State Level 4 Pre-Test
	let isL4PreModalOpen = $state(false);
	let selectedL4PreEval = $state<any>(null);
	let l4PreSkillCategory = $state<'Technical Skill' | 'Soft Skill' | 'Safety' | 'Hard Skill'>('Technical Skill');
	let l4PreMetrics = $state<Record<string, number | string>>({
		p1: '',
		p2: '',
		p3: '',
		p4: ''
	});
	let l4PreNotes = $state('');

	function openL4PreModal(item: any) {
		selectedL4PreEval = item;
		let cat: 'Technical Skill' | 'Soft Skill' | 'Safety' | 'Hard Skill' = 'Technical Skill';
		if (item.l4PreSkillCategory && preSkillCategoryDefinitions[item.l4PreSkillCategory as keyof typeof preSkillCategoryDefinitions]) {
			cat = item.l4PreSkillCategory;
		} else if (item.courseCategory?.toUpperCase().includes('SAFETY') || item.courseCategory?.toUpperCase().includes('K3')) {
			cat = 'Safety';
		} else if (item.courseCategory?.toUpperCase().includes('SOFT') || item.courseCategory?.toUpperCase().includes('LEADERSHIP')) {
			cat = 'Soft Skill';
		} else if (item.courseCategory?.toUpperCase().includes('HARD') || item.courseCategory?.toUpperCase().includes('MACHINE')) {
			cat = 'Hard Skill';
		}
		l4PreSkillCategory = cat;

		const m = item.l4PreMetrics || {};
		l4PreMetrics = {
			p1: m.p1 !== undefined && m.p1 !== null ? m.p1 : '',
			p2: m.p2 !== undefined && m.p2 !== null ? m.p2 : '',
			p3: m.p3 !== undefined && m.p3 !== null ? m.p3 : '',
			p4: m.p4 !== undefined && m.p4 !== null ? m.p4 : ''
		};
		l4PreNotes = item.l4PreNotes || '';
		isL4PreModalOpen = true;
	}

	// Level 4 Post-Test: Evaluasi Dampak Bisnis H+3 Bulan
	const l4ReadyEvals = $derived(
		subordinatePostTrainingEvals.filter(
			(e: any) => e.l4Status === 'PENDING' && (!e.dueDate || e.dueDate <= todayDateStr)
		)
	);
	const l4UpcomingEvals = $derived(
		subordinatePostTrainingEvals.filter(
			(e: any) => e.l4Status === 'PENDING' && e.dueDate && e.dueDate > todayDateStr
		)
	);
	const l4CompletedEvals = $derived(
		subordinatePostTrainingEvals.filter((e: any) => e.l4Status === 'COMPLETED')
	);
	const l4ReadyCount = $derived(l4ReadyEvals.length);

	// Modal State Level 3 (Behavior 15 Butir Skala 1-3)
	let isL3ModalOpen = $state(false);
	let selectedL3Eval = $state<any>(null);
	let l3AnswersMap = $state<Record<string, number>>({});
	let l3Feedback = $state('');

	function openL3Modal(item: any) {
		selectedL3Eval = item;
		const initial: Record<string, number> = {};
		const existing = item.l3Answers || {};
		l3BehaviorQuestions.forEach((grp) => {
			grp.items.forEach((q) => {
				initial[q.id] = existing[q.id] ? Number(existing[q.id]) : 3;
			});
		});
		l3AnswersMap = initial;
		l3Feedback = item.l3Feedback || item.l3Notes || '';
		isL3ModalOpen = true;
	}

	// Modal State Level 4 Post-Test (Dampak 3 Bulan - Komparasi Before vs After)
	let isL4ModalOpen = $state(false);
	let selectedL4Eval = $state<any>(null);
	let l4PostMetrics = $state<Record<string, number | string>>({
		p1: '',
		p2: '',
		p3: '',
		p4: ''
	});
	let l4PostNotes = $state('');

	function openL4Modal(item: any) {
		selectedL4Eval = item;
		const m = item.l4PostMetrics || {};
		l4PostMetrics = {
			p1: m.p1 !== undefined && m.p1 !== null ? m.p1 : '',
			p2: m.p2 !== undefined && m.p2 !== null ? m.p2 : '',
			p3: m.p3 !== undefined && m.p3 !== null ? m.p3 : '',
			p4: m.p4 !== undefined && m.p4 !== null ? m.p4 : ''
		};
		l4PostNotes = item.l4PostNotes || item.l4Notes || '';
		isL4ModalOpen = true;
	}

	function getDaysRemaining(dueDateStr: string): number {
		if (!dueDateStr) return 0;
		const due = new Date(dueDateStr).getTime();
		const now = new Date().getTime();
		const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
		return diff > 0 ? diff : 0;
	}

	// History Search Query
	let historySearchQuery = $state('');
	let historyPeriodFilter = $state('All');

	const filteredHistory = $derived.by(() => {
		return existingAssessments.filter((item: any) => {
			const q = historySearchQuery.trim().toLowerCase();
			const matchSearch = !q ||
				item.employeeName.toLowerCase().includes(q) ||
				item.payrollId.toLowerCase().includes(q) ||
				item.competencyName.toLowerCase().includes(q) ||
				item.competencyCode.toLowerCase().includes(q) ||
				item.positionTitle.toLowerCase().includes(q);

			const matchPeriod = historyPeriodFilter === 'All' || item.period === historyPeriodFilter;
			return matchSearch && matchPeriod;
		});
	});

	// Derived metrics untuk Progress Tim & Realtime Evaluasi Karyawan Terpilih (Blind Assessment)
	const totalTeam = $derived(allDirectSubordinates.length);
	const assessedTeamCount = $derived(
		allDirectSubordinates.filter((e: any) => getEmployeeAssessmentStatus(e.payrollId, e.positionTitle).isAssessed).length
	);

	const selectedEmployeeRatings = $derived(
		selectedEmployee
			? selectedEmployeeCompetencies.map((c: any) => getRating(selectedEmployee.payrollId, c.competencyCode))
			: []
	);
	const selectedEmployeeAssessedRatings = $derived(
		selectedEmployeeRatings.filter((r: number) => r > 0)
	);
	const selectedEmployeeAvg = $derived(
		selectedEmployeeAssessedRatings.length
			? (selectedEmployeeAssessedRatings.reduce((a: number, b: number) => a + b, 0) / selectedEmployeeAssessedRatings.length).toFixed(1)
			: '0.0'
	);
	const selectedEmployeeAssessedCount = $derived(
		selectedEmployeeAssessedRatings.length
	);
	const selectedEmployeeGapsCount = $derived(
		selectedEmployee
			? selectedEmployeeCompetencies.filter((c: any) => {
					const r = getRating(selectedEmployee.payrollId, c.competencyCode);
					return r > 0 && r < Number(c.requiredLevel);
			  }).length
			: 0
	);
	const selectedEmployeeIsComplete = $derived(
		selectedEmployeeCompetencies.length > 0 && selectedEmployeeAssessedCount === selectedEmployeeCompetencies.length
	);
</script>

<div class="space-y-6">
	<!-- ═══════════════════════════════════════════════════════════════════ -->
	<!-- PAGE HEADER: IDENTITAS & ASESOR AKTIF                                -->
	<!-- ═══════════════════════════════════════════════════════════════════ -->
	<div class="p-6 rounded-3xl bg-surface border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div class="flex items-center gap-3.5">
			<div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
				<span class="material-symbols-outlined text-2xl">fact_check</span>
			</div>
			<div>
				<div class="flex items-center gap-2">
					<h2 class="text-xl font-black text-on-surface tracking-tight">Penilaian Kompetensi Tim</h2>
					<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
						Direct Supervisor
					</span>
				</div>
				<p class="text-xs text-on-surface-variant mt-0.5 font-medium leading-relaxed max-w-2xl">
					Evaluasi kemampuan bawahan langsung mengacu pada Standar Jabatan & Kamus Kompetensi PT Buana Centra Swakarsa
				</p>
			</div>
		</div>

		<!-- Badge Profil Asesor Aktif (Kanan) -->
		{#if currentAssessor}
			<div class="flex items-center gap-3 p-2.5 pr-4 rounded-2xl bg-surface-container/70 border border-slate-200/60 dark:border-slate-800/60 self-start md:self-auto shrink-0">
				<div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 text-on-primary font-black text-xs flex items-center justify-center shadow-xs">
					{currentAssessor.name.charAt(0)}
				</div>
				<div class="min-w-0">
					<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Atasan Penilai</span>
					<p class="text-xs font-black text-on-surface truncate leading-tight">{currentAssessor.name}</p>
					<p class="text-[10px] text-slate-500 font-medium truncate">{currentAssessor.positionTitle} • {currentAssessor.department}</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- ═══════════════════════════════════════════════════════════════════ -->
	<!-- SEGMENTED NAVIGATION BAR (TERORGANISIR: TNA UTAMA & KIRKPATRICK)   -->
	<!-- ═══════════════════════════════════════════════════════════════════ -->
	<div class="p-1.5 rounded-2xl bg-surface border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2 overflow-x-auto">
		<div class="flex items-center gap-1.5 flex-nowrap shrink-0">
			<!-- GRUP 1: TNA & ASESMEN UTAMA -->
			<button
				type="button"
				onclick={() => (activeViewTab = 'annual')}
				class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap
				{activeViewTab === 'annual'
					? 'bg-primary text-on-primary shadow-xs'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
			>
				<span class="material-symbols-outlined text-base">assignment_ind</span>
				<span>1. Asesmen Tahunan</span>
			</button>

			<button
				type="button"
				onclick={() => (activeViewTab = 'history')}
				class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap
				{activeViewTab === 'history'
					? 'bg-primary text-on-primary shadow-xs'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
			>
				<span class="material-symbols-outlined text-base">history</span>
				<span>2. Riwayat Asesmen</span>
			</button>

			<button
				type="button"
				onclick={() => (activeViewTab = 'training_requests')}
				class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap
				{activeViewTab === 'training_requests'
					? 'bg-primary text-on-primary shadow-xs'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
			>
				<span class="material-symbols-outlined text-base">post_add</span>
				<span>3. Usulan Pelatihan Tim</span>
				{#if myPendingRequestsCount > 0}
					<span class="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950">
						{myPendingRequestsCount} PENDING
					</span>
				{/if}
			</button>

			<!-- Divider Vertikal Halus -->
			<div class="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>

			<!-- GRUP 2: EVALUASI PASCA-PELATIHAN (KIRKPATRICK) -->
			<button
				type="button"
				onclick={() => (activeViewTab = 'post_training_l4_pre')}
				class="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap
				{activeViewTab === 'post_training_l4_pre'
					? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
			>
				<span class="material-symbols-outlined text-base">history_edu</span>
				<span>4. Level 4 Pre-Test (10 Hari)</span>
				{#if l4PrePendingCount > 0}
					<span class="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-500 text-white">
						{l4PrePendingCount}
					</span>
				{/if}
			</button>

			<button
				type="button"
				onclick={() => (activeViewTab = 'post_training_l3')}
				class="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap
				{activeViewTab === 'post_training_l3'
					? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
			>
				<span class="material-symbols-outlined text-base">psychology</span>
				<span>5. Level 3 Behavior (3 Bulan)</span>
				{#if l3ReadyCount > 0}
					<span class="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white">
						{l3ReadyCount}
					</span>
				{/if}
			</button>

			<button
				type="button"
				onclick={() => (activeViewTab = 'post_training_l4_post')}
				class="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap
				{activeViewTab === 'post_training_l4_post'
					? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
			>
				<span class="material-symbols-outlined text-base">trending_up</span>
				<span>6. Level 4 Post-Test (3 Bulan)</span>
				{#if l4ReadyCount > 0}
					<span class="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white">
						{l4ReadyCount}
					</span>
				{/if}
			</button>
		</div>

		<div class="text-[11px] text-slate-400 font-medium px-2 hidden lg:block whitespace-nowrap">
			Siklus Tertutup TNA & Evaluasi Kirkpatrick BCS
		</div>
	</div>

	{#if activeViewTab === 'annual'}
		<!-- Top Assessor & Period Toolbar -->
		<div class="p-4 rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
			<div class="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
				<!-- Pilihan Asesor (Atasan) -->
				<div class="space-y-1 min-w-[280px]">
					<label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
						Atasan Penilai (Asesor) *
					</label>
					<select
						bind:value={selectedAssessorPayrollId}
						class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary focus:outline-hidden"
					>
						{#each activeAssessors as a}
							<option value={a.payrollId}>
								{a.name} — {a.positionTitle} ({a.department})
							</option>
						{/each}
					</select>
				</div>

				<!-- Periode Penilaian -->
				<div class="space-y-1 w-36">
					<label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
						Periode *
					</label>
					<select
						bind:value={selectedPeriod}
						class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary focus:outline-hidden"
					>
						{#each assessmentPeriods as prd}
							<option value={prd}>{prd}</option>
						{/each}
					</select>
				</div>

				<!-- Departemen Kerja -->
				<div class="space-y-1 w-48">
					<label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
						Departemen
					</label>
					<div class="px-3 py-2 rounded-xl bg-surface-container-high border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 truncate">
						{currentAssessor?.department || 'General'}
					</div>
				</div>
			</div>

			<!-- Ringkasan Progress Asesmen Tim -->
			<div class="flex items-center gap-3 p-2.5 rounded-2xl bg-surface-container-high/80 border border-slate-200/40 dark:border-slate-800/40">
				<div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
					<span class="material-symbols-outlined text-xl">groups</span>
				</div>
				<div>
					<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress Tim Periode {selectedPeriod}</p>
					<p class="text-xs font-bold text-on-surface mt-0.5">
						<strong class="text-emerald-500 text-sm font-mono">{assessedTeamCount}</strong> dari {totalTeam} Bawahan Dinilai
					</p>
				</div>
			</div>
		</div>

		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- LAYOUT MASTER-DETAIL (2 PANEL BERDAMPINGAN)                     -->
		<!-- ═══════════════════════════════════════════════════════════════ -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
			
			<!-- ─── PANEL KIRI: DAFTAR BAWAHAN LANGSUNG (col-span-4) ─────── -->
			<div class="lg:col-span-4 lg:sticky lg:top-4 lg:self-start space-y-3 z-10">
				<div class="p-4 rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 flex flex-col max-h-[calc(100vh-2.5rem)] shadow-xs">
					<div class="flex items-center justify-between shrink-0 mb-3">
						<div class="flex items-center gap-1.5">
							<span class="material-symbols-outlined text-sm text-primary">diversity_3</span>
							<h3 class="font-bold text-xs text-on-surface uppercase tracking-wider">Anggota Tim Bawahan</h3>
						</div>
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-slate-400">
							{filteredSubordinates.length} Orang
						</span>
					</div>

					<!-- Search & Position Filter -->
					<div class="space-y-2 shrink-0 mb-3">
						<div class="relative">
							<span class="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-sm">search</span>
							<input
								type="text"
								bind:value={subordinateSearchQuery}
								placeholder="Cari nama atau NIK..."
								class="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none"
							/>
							{#if subordinateSearchQuery}
								<button type="button" onclick={() => (subordinateSearchQuery = '')} class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600">
									<span class="material-symbols-outlined text-xs">close</span>
								</button>
							{/if}
						</div>

						<!-- Filter Status Chips -->
						<div class="flex items-center gap-1 text-[11px] overflow-x-auto pb-0.5">
							<button
								type="button"
								onclick={() => (subordinateStatusFilter = 'All')}
								class="px-2 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap
								{subordinateStatusFilter === 'All' ? 'bg-primary text-on-primary' : 'bg-surface text-slate-400 hover:text-on-surface'}"
							>
								Semua ({allDirectSubordinates.length})
							</button>
							<button
								type="button"
								onclick={() => (subordinateStatusFilter = 'Unassessed')}
								class="px-2 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap
								{subordinateStatusFilter === 'Unassessed' ? 'bg-amber-600 text-white' : 'bg-surface text-slate-400 hover:text-amber-500'}"
							>
								Belum ({allDirectSubordinates.filter((e: any) => !getEmployeeAssessmentStatus(e.payrollId, e.positionTitle).isAssessed).length})
							</button>
							<button
								type="button"
								onclick={() => (subordinateStatusFilter = 'Assessed')}
								class="px-2 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap
								{subordinateStatusFilter === 'Assessed' ? 'bg-emerald-600 text-white' : 'bg-surface text-slate-400 hover:text-emerald-500'}"
							>
								Selesai ({allDirectSubordinates.filter((e: any) => getEmployeeAssessmentStatus(e.payrollId, e.positionTitle).isAssessed).length})
							</button>
						</div>
					</div>

					<!-- List Kartu Bawahan Langsung (Scroll Internal Mandiri) -->
					<div class="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
						{#each filteredSubordinates as emp}
							{@const isSelected = emp.payrollId === selectedEmployeePayrollId}
							{@const status = getEmployeeAssessmentStatus(emp.payrollId, emp.positionTitle)}
							<button
								type="button"
								onclick={() => (selectedEmployeePayrollId = emp.payrollId)}
								class="w-full text-left p-3 rounded-2xl transition-all cursor-pointer border {isSelected
									? 'bg-primary/10 border-primary shadow-xs'
									: 'bg-surface hover:bg-surface-container border-slate-200 dark:border-slate-800'}"
							>
								<div class="flex items-start justify-between gap-2">
									<div class="flex items-center gap-2.5 min-w-0">
										<div class="w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 {isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-primary'}">
											{emp.name.charAt(0)}
										</div>
										<div class="min-w-0">
											<p class="font-bold text-xs text-on-surface truncate leading-tight">{emp.name}</p>
											<p class="text-[10px] text-slate-400 font-mono mt-0.5">{emp.payrollId}</p>
										</div>
									</div>

									<!-- Badge Status Asesmen -->
									<div class="shrink-0 text-right">
										{#if status.percent === 100}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
												<span class="material-symbols-outlined text-[11px]">check_circle</span>
												<span>Selesai</span>
											</span>
										{:else if status.assessedCount > 0}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
												<span class="material-symbols-outlined text-[11px]">pending</span>
												<span>{status.assessedCount}/{status.totalRequired}</span>
											</span>
										{:else}
											<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-surface-container-high text-slate-400 border border-slate-200 dark:border-slate-700">
												Belum Dinilai
											</span>
										{/if}
									</div>
								</div>

								<!-- Info Jabatan & Mini Visual Progress Bar -->
								<div class="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-1.5">
									<div class="flex items-center justify-between text-[10px]">
										<span class="font-semibold truncate max-w-[150px] text-on-surface-variant">
											{emp.positionTitle}
										</span>
										{#if status.isAssessed}
											<span class="font-mono font-bold text-primary">Avg: ★ {status.avgScore}</span>
										{:else}
											<span class="text-slate-400 font-mono">{status.totalRequired} Unit Standar</span>
										{/if}
									</div>

									<div class="space-y-0.5">
										<div class="flex items-center justify-between text-[9px] text-slate-400 font-mono">
											<span>Kelengkapan</span>
											<span class="font-bold {status.percent === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}">
												{status.percent}% ({status.assessedCount}/{status.totalRequired} Unit)
											</span>
										</div>
										<div class="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
											<div
												class="h-full rounded-full transition-all duration-300 {status.percent === 100 ? 'bg-emerald-500' : status.percent > 0 ? 'bg-primary' : 'bg-transparent'}"
												style="width: {status.percent}%"
											></div>
										</div>
									</div>
								</div>
							</button>
						{/each}

						{#if filteredSubordinates.length === 0}
							<div class="p-8 text-center text-xs text-slate-400 rounded-2xl bg-surface border border-dashed border-slate-200 dark:border-slate-800">
								<span class="material-symbols-outlined text-3xl text-slate-300 block mb-1">person_search</span>
								<p class="font-bold">Tidak ada bawahan yang cocok</p>
								<p class="text-[10px] mt-0.5">Ubah kata kunci pencarian atau filter status Anda.</p>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- ─── PANEL KANAN: FORM ASESMEN INDIVIDU KARYAWAN (col-span-8) ─── -->
			<div class="lg:col-span-8 space-y-4">
				{#if !selectedEmployee}
					<div class="p-12 text-center rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-3">
						<span class="material-symbols-outlined text-5xl text-slate-400">touch_app</span>
						<h4 class="font-bold text-base text-on-surface">Pilih Karyawan Bawahan</h4>
						<p class="text-xs text-on-surface-variant max-w-sm mx-auto">
							Silakan pilih salah satu anggota tim bawahan langsung di panel kiri untuk membuka lembar kerja evaluasi kompetensi.
						</p>
					</div>
				{:else if selectedEmployeeCompetencies.length === 0}
					<div class="p-10 text-center rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-3">
						<span class="material-symbols-outlined text-5xl text-amber-500">rule_settings</span>
						<h4 class="font-bold text-base text-on-surface">Standar Kompetensi Belum Ditetapkan</h4>
						<p class="text-xs text-on-surface-variant max-w-md mx-auto">
							Posisi <strong>"{selectedEmployee.positionTitle}"</strong> belum memiliki standar kompetensi wajib yang ditetapkan oleh tim HR.
						</p>
						<a
							href="/hris/lms"
							class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90"
						>
							<span class="material-symbols-outlined text-sm">tune</span>
							<span>Tetapkan Standar di Modul LMS</span>
						</a>
					</div>
				{:else}
					<!-- Card Header Profil Karyawan Terpilih & Live Metrik -->
					<div class="p-5 rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-4 shadow-sm">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div class="flex items-center gap-3">
								<div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-on-primary font-black text-lg flex items-center justify-center shadow-sm">
									{selectedEmployee.name.charAt(0)}
								</div>
								<div>
									<div class="flex items-center gap-2">
										<h3 class="font-black text-base text-on-surface">{selectedEmployee.name}</h3>
										<span class="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-surface-container-high text-primary border border-slate-700">
											{selectedEmployee.payrollId}
										</span>
									</div>
									<p class="text-xs text-on-surface-variant font-medium mt-0.5">
										{selectedEmployee.positionTitle} • {selectedEmployee.department || currentAssessor?.department}
									</p>
								</div>
							</div>

							<!-- Action Buttons -->
							<div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
								<button
									type="button"
									onclick={() => openCreateTrainingRequestModal({
										title: `Pelatihan Kompetensi ${selectedEmployee.positionTitle}`,
										dept: selectedEmployee.department || currentAssessor?.department,
										justification: `Diusulkan berdasarkan evaluasi performa kerja dan pemenuhan standar kompetensi untuk ${selectedEmployee.name} (${selectedEmployee.payrollId}) pada posisi ${selectedEmployee.positionTitle}.`
									})}
									class="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
									title="Ajukan usulan pelatihan tim ke HRD berdasarkan karyawan ini"
								>
									<span class="material-symbols-outlined text-sm">post_add</span>
									<span>Usulkan Training</span>
								</button>

								<button
									type="button"
									onclick={resetRatingsForSelected}
									class="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-slate-400 hover:text-on-surface text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
									title="Reset semua pengisian lembar evaluasi karyawan ini"
								>
									<span class="material-symbols-outlined text-sm">restart_alt</span>
									<span>Reset Pengisian</span>
								</button>
							</div>
						</div>

						<!-- Realtime Calculation Metrics Bar (Netral & Objektif) -->
						<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-200/40 dark:border-slate-800/40 text-xs">
							<div class="p-2.5 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60">
								<p class="text-[10px] font-bold text-slate-400 uppercase">Total Kompetensi</p>
								<p class="text-base font-black text-on-surface mt-0.5 font-mono">{selectedEmployeeCompetencies.length} Unit</p>
							</div>
							<div class="p-2.5 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60">
								<p class="text-[10px] font-bold text-slate-400 uppercase">Progres Penilaian</p>
								<p class="text-base font-black text-primary mt-0.5 font-mono">
									{selectedEmployeeAssessedCount} <span class="text-xs text-slate-400 font-normal">/ {selectedEmployeeCompetencies.length} Unit</span>
								</p>
							</div>
							<div class="p-2.5 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60">
								<p class="text-[10px] font-bold text-slate-400 uppercase">Rata-rata Skor</p>
								<p class="text-base font-black text-on-surface mt-0.5 font-mono">
									{selectedEmployeeAvg} <span class="text-xs text-slate-400 font-normal">/ 5.0</span>
								</p>
							</div>
							<div class="p-2.5 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60">
								<p class="text-[10px] font-bold text-slate-400 uppercase">Kesenjangan (GAP)</p>
								{#if selectedEmployeeAssessedCount === 0}
									<p class="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1">
										<span class="material-symbols-outlined text-sm">schedule</span>
										<span>Belum Dinilai</span>
									</p>
								{:else if selectedEmployeeGapsCount > 0}
									<p class="text-base font-black text-rose-500 mt-0.5 font-mono flex items-center gap-1">
										<span>{selectedEmployeeGapsCount} Unit GAP</span>
									</p>
									<p class="text-[10px] text-rose-400 font-semibold truncate">Perlu usulan training</p>
								{:else}
									<p class="text-base font-black text-emerald-500 mt-0.5 font-mono flex items-center gap-1">
										<span>0 GAP</span>
									</p>
									<p class="text-[10px] text-emerald-500 font-semibold truncate">Memenuhi standar</p>
								{/if}
							</div>
						</div>
					</div>

					<!-- Panduan Skala Kemahiran Ringkas -->
					<div class="p-3 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
						<div class="flex items-center gap-2 text-[11px] text-on-surface-variant flex-wrap">
							<span class="material-symbols-outlined text-sm text-primary">info</span>
							<span class="font-bold text-on-surface">Skala Penilaian:</span>
							<span class="font-medium text-slate-400">1: Dasar • 2: Mandiri • 3: Kompeten • 4: Mahir • 5: Ahli</span>
						</div>
						<div class="text-[10px] text-slate-400 flex items-center gap-1.5">
							<span class="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
							<span>Badge <strong>Standar</strong> menandai level minimal posisi jabatan</span>
						</div>
					</div>

					<!-- Snippet Kartu Evaluasi Kompetensi Objektif (Horizontal Step Selector Pills 1-5) -->
					{#snippet competencyCard(comp: any, aspectTitle: string, aspectColor: string)}
						{@const currentVal = getRating(selectedEmployee.payrollId, comp.competencyCode)}
						{@const reqLevel = Number(comp.requiredLevel) || 3}
						{@const gap = currentVal > 0 ? currentVal - reqLevel : null}
						{@const activeLevelDesc = currentVal > 0 ? getLevelDescription(comp.competencyCode, currentVal) : getLevelDescription(comp.competencyCode, reqLevel)}

						<div class="p-4 sm:p-5 rounded-3xl border bg-surface border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3.5 transition-all">
							<!-- Header Kompetensi: Kode, Nama, Target Standar, & Badge Status Nilai -->
							<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
								<div class="space-y-1">
									<div class="flex items-center gap-2 flex-wrap">
										<span class="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-surface-container-high text-primary border border-slate-700/40">
											{comp.competencyCode}
										</span>
										<span class="font-bold text-sm text-on-surface">{comp.competencyName}</span>
									</div>
									<div class="flex items-center gap-2 text-xs text-on-surface-variant flex-wrap">
										<span class="inline-flex items-center gap-1 font-semibold text-[11px]">
											<span class="material-symbols-outlined text-xs text-amber-500">flag</span>
											<span>Standar Wajib: <strong>Level {reqLevel}</strong> ({getLevelLabel(reqLevel)})</span>
										</span>
										{#if comp.defaultCourseTitle && comp.defaultCourseTitle !== '-'}
											<span class="text-slate-400">•</span>
											<span class="text-[11px] text-slate-400 truncate max-w-xs" title="Modul Training Terkait">
												📚 {comp.defaultCourseTitle}
											</span>
										{/if}
									</div>
								</div>

								<!-- Status Nilai & Tombol Bantuan Rubrik -->
								<div class="flex items-center gap-2 flex-wrap">
									<button
										type="button"
										onclick={() => openRubricModal(comp, aspectTitle)}
										class="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-surface-container-high hover:bg-surface-container-highest text-slate-400 hover:text-on-surface transition-all cursor-pointer flex items-center gap-1"
										title="Buka panduan rubrik indikator level 1-5"
									>
										<span class="material-symbols-outlined text-xs">help</span>
										<span>Panduan Rubrik</span>
									</button>

									{#if currentVal > 0}
										{#if gap !== null && gap < 0}
											<span class="px-2.5 py-1 rounded-xl text-[11px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
												<span class="material-symbols-outlined text-xs">warning</span>
												<span>GAP {gap} (Lvl {currentVal})</span>
											</span>
										{:else}
											<span class="px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
												<span class="material-symbols-outlined text-xs">verified</span>
												<span>{gap === 0 ? 'MEMENUHI' : `UNGGUL (+${gap})`} (Lvl {currentVal})</span>
											</span>
										{/if}
									{:else}
										<span class="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-surface-container border border-slate-200 dark:border-slate-700 text-slate-400">
											Belum Dinilai
										</span>
									{/if}
								</div>
							</div>

							<!-- Horizontal Step Selector (Pills 1-5) -->
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
										Pilih Level Observasi Perilaku:
									</span>
									<span class="text-[10px] text-slate-400 font-medium">Klik salah satu pill untuk memilih skor</span>
								</div>

								<div class="grid grid-cols-5 gap-1.5 sm:gap-2">
									{#each [
										{ lvl: 1, label: 'Dasar' },
										{ lvl: 2, label: 'Mandiri' },
										{ lvl: 3, label: 'Kompeten' },
										{ lvl: 4, label: 'Mahir' },
										{ lvl: 5, label: 'Ahli' }
									] as item}
										{@const isSelected = currentVal === item.lvl}
										{@const isRequired = reqLevel === item.lvl}

										<button
											type="button"
											onclick={() => setRating(selectedEmployee.payrollId, comp.competencyCode, item.lvl)}
											class="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border transition-all cursor-pointer relative group text-center
											{isSelected
												? 'bg-primary text-on-primary border-primary shadow-sm scale-[1.02] ring-2 ring-primary/40'
												: 'bg-surface-container-low hover:bg-surface-container border-slate-200/70 dark:border-slate-800/70 text-on-surface'}"
										>
											{#if isRequired}
												<span
													class="absolute -top-1.5 px-1.5 py-0.2 rounded-full font-mono text-[8px] font-black uppercase tracking-wider border
													{isSelected ? 'bg-amber-400 text-slate-900 border-amber-300' : 'bg-surface-container-highest text-amber-500 border-amber-500/40'}"
													title="Standar minimal posisi ini"
												>
													Standar
												</span>
											{/if}

											<div class="w-6 h-6 rounded-lg font-mono text-xs font-black flex items-center justify-center mb-0.5
												{isSelected ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container text-primary group-hover:bg-surface-container-high'}">
												{item.lvl}
											</div>

											<span class="font-bold text-[11px] leading-tight {isSelected ? 'text-on-primary' : 'text-on-surface'}">
												{item.label}
											</span>
										</button>
									{/each}
								</div>
							</div>

							<!-- Dynamic Rubric Box: Deskripsi Perilaku Aktif Sesuai Pilihan -->
							<div class="p-3 sm:p-3.5 rounded-2xl border transition-all text-xs
								{currentVal > 0
									? (gap !== null && gap < 0
										? 'bg-rose-500/5 border-rose-500/20 text-on-surface'
										: 'bg-primary/5 border-primary/20 text-on-surface')
									: 'bg-surface-container-low border-slate-200/50 dark:border-slate-800/50 text-slate-400'}">
								<div class="flex items-start gap-2.5">
									<span class="material-symbols-outlined text-base shrink-0 mt-0.5
										{currentVal > 0 ? (gap !== null && gap < 0 ? 'text-rose-500' : 'text-primary') : 'text-slate-400'}">
										{currentVal > 0 ? (gap !== null && gap < 0 ? 'report' : 'verified_user') : 'info'}
									</span>
									<div class="space-y-1 flex-1 min-w-0">
										<div class="flex items-center justify-between gap-2 flex-wrap">
											<span class="font-bold text-xs {currentVal > 0 ? 'text-on-surface' : 'text-slate-400'}">
												{#if currentVal > 0}
													Indikator Level {currentVal} ({getLevelLabel(currentVal)}):
													{#if gap !== null && gap < 0}
														<span class="text-rose-500 font-bold ml-1 text-[11px]">⚠️ Di bawah standar jabatan ({gap})</span>
													{:else}
														<span class="text-emerald-500 font-bold ml-1 text-[11px]">✓ Memenuhi standar jabatan</span>
													{/if}
												{:else}
													Standar Minimal Jabatan: Level {reqLevel} ({getLevelLabel(reqLevel)})
												{/if}
											</span>
											{#if currentVal === 0}
												<span class="text-[10px] text-amber-500 font-semibold">Pilih salah satu tombol di atas untuk menilai</span>
											{/if}
										</div>
										<p class="leading-relaxed {currentVal > 0 ? 'text-on-surface' : 'text-slate-400'}">
											{activeLevelDesc}
										</p>
									</div>
								</div>
							</div>

							<!-- Catatan Observasi Per Butir (Ringkas) -->
							<div class="pt-0.5">
								<div class="flex items-center justify-between mb-1">
									<label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
										Catatan Observasi Bukti Perilaku (Opsional):
									</label>
								</div>
								<input
									type="text"
									placeholder="Tuliskan contoh kejadian nyata atau bukti perilaku karyawan untuk kompetensi ini..."
									value={getNote(selectedEmployee.payrollId, comp.competencyCode)}
									oninput={(e) => setNote(selectedEmployee.payrollId, comp.competencyCode, (e.target as HTMLInputElement).value)}
									class="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-slate-200/80 dark:border-slate-800 text-xs text-on-surface placeholder:text-slate-400 outline-none focus:border-primary transition-all"
								/>
							</div>
						</div>
					{/snippet}

					<!-- Form Penilaian Kompetensi Individu -->
					<div class="space-y-4">
						
						<!-- SEKSI 1: CORE COMPETENCY -->
						{#if coreCompetencies.length > 0}
							<div class="space-y-2.5">
								<div class="flex items-center gap-2">
									<span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
									<h4 class="font-black text-xs text-on-surface uppercase tracking-wider">
										Core Competency ({coreCompetencies.length} Unit)
									</h4>
								</div>

								<div class="space-y-3">
									{#each coreCompetencies as comp (comp.competencyCode)}
										{@render competencyCard(comp, 'Core Competency', 'indigo')}
									{/each}
								</div>
							</div>
						{/if}

						<!-- SEKSI 2: BEHAVIORAL COMPETENCY -->
						{#if behavioralCompetencies.length > 0}
							<div class="space-y-2.5 pt-2">
								<div class="flex items-center gap-2">
									<span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
									<h4 class="font-black text-xs text-on-surface uppercase tracking-wider">
										Behavioral Competency ({behavioralCompetencies.length} Unit)
									</h4>
								</div>

								<div class="space-y-3">
									{#each behavioralCompetencies as comp (comp.competencyCode)}
										{@render competencyCard(comp, 'Behavioral Competency', 'amber')}
									{/each}
								</div>
							</div>
						{/if}

						<!-- SEKSI 3: TECHNICAL COMPETENCY -->
						{#if technicalCompetencies.length > 0}
							<div class="space-y-2.5 pt-2">
								<div class="flex items-center gap-2">
									<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
									<h4 class="font-black text-xs text-on-surface uppercase tracking-wider">
										Technical Competency ({technicalCompetencies.length} Unit)
									</h4>
								</div>

								<div class="space-y-3">
									{#each technicalCompetencies as comp (comp.competencyCode)}
										{@render competencyCard(comp, 'Technical Competency', 'emerald')}
									{/each}
								</div>
							</div>
						{/if}
					</div>

					<!-- Form Submit Lembar Penilaian Individu -->
					<div class="p-6 rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-4">
						<div class="space-y-1.5">
							<label class="text-xs font-bold text-on-surface flex items-center gap-1.5">
								<span class="material-symbols-outlined text-sm text-primary">rate_review</span>
								<span>Catatan Observasi Evaluasi untuk {selectedEmployee.name}</span>
							</label>
							<textarea
								bind:value={generalNotes}
								rows={2}
								placeholder="Tuliskan catatan apresiasi, evaluasi perilaku, atau arahan kerja khusus bagi karyawan ini..."
								class="w-full p-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none"
							></textarea>
						</div>

						{#if notificationAlert}
							<div class="p-4 rounded-2xl flex items-start justify-between gap-3 text-xs transition-all {notificationAlert.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400'}">
								<div class="flex items-start gap-2.5">
									<span class="material-symbols-outlined text-lg mt-0.5">
										{notificationAlert.type === 'success' ? 'check_circle' : 'error'}
									</span>
									<div>
										<h5 class="font-bold text-sm">{notificationAlert.title}</h5>
										<p class="mt-0.5 leading-relaxed">{notificationAlert.message}</p>
									</div>
								</div>
								<button 
									type="button" 
									onclick={() => (notificationAlert = null)}
									class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
								>
									<span class="material-symbols-outlined text-base">close</span>
								</button>
							</div>
						{/if}

						<form
							method="POST"
							action="?/submitBatchAssessment"
							use:enhance={() => {
								isSubmitting = true;
								notificationAlert = null;
								return async ({ result, update }) => {
									isSubmitting = false;
									if (result.type === 'success') {
										const resData = result.data as any;
										if (resData?.success === false) {
											const msg = resData?.message || 'Gagal menyimpan hasil asesmen.';
											notifyError('Gagal Menyimpan', msg);
											notificationAlert = {
												type: 'error',
												title: 'Gagal Menyimpan',
												message: msg
											};
										} else {
											const msg = resData?.message || `Asesmen untuk ${selectedEmployee.name} berhasil disimpan!`;
											notifySuccess('Asesmen Tersimpan', msg);
											notificationAlert = {
												type: 'success',
												title: 'Asesmen Tersimpan',
												message: msg
											};
											await update();
										}
									} else if (result.type === 'failure') {
										const msg = (result.data as any)?.message || 'Formulir penilaian tidak valid.';
										notifyError('Gagal Menyimpan', msg);
										notificationAlert = {
											type: 'error',
											title: 'Gagal Menyimpan',
											message: msg
										};
									} else if (result.type === 'error') {
										const msg = (result.error as any)?.message || 'Terjadi kesalahan sistem server.';
										notifyError('Kesalahan Server', msg);
										notificationAlert = {
											type: 'error',
											title: 'Kesalahan Sistem',
											message: msg
										};
									}
								};
							}}
							class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-200/40 dark:border-slate-800/40"
						>
							<input type="hidden" name="assessorName" value={currentAssessor?.name} />
							<input type="hidden" name="period" value={selectedPeriod} />
							<input type="hidden" name="positionTitle" value={selectedEmployee.positionTitle} />
							<input type="hidden" name="department" value={selectedEmployee.department || currentAssessor?.department} />
							<input type="hidden" name="notes" value={generalNotes} />
							<input
								type="hidden"
								name="evaluations"
								value={JSON.stringify(
									selectedEmployeeCompetencies.map((comp: any) => ({
										payrollId: selectedEmployee.payrollId,
										employeeName: selectedEmployee.name,
										positionTitle: selectedEmployee.positionTitle,
										department: selectedEmployee.department || currentAssessor?.department || 'General',
										competencyCode: comp.competencyCode,
										requiredLevel: comp.requiredLevel,
										actualLevel: getRating(selectedEmployee.payrollId, comp.competencyCode) || 3,
										notes: getNote(selectedEmployee.payrollId, comp.competencyCode)
									}))
								)}
							/>

							<div class="text-[11px] text-slate-400 font-medium">
								Penilaian objektif akan tersimpan ke basis data evaluasi kompetensi SDM PT BCS.
							</div>

							<button
								type="submit"
								disabled={isSubmitting || !selectedEmployeeIsComplete}
								class="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer self-stretch sm:self-auto"
							>
								{#if isSubmitting}
									<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
									<span>Menyimpan Asesmen...</span>
								{:else if !selectedEmployeeIsComplete}
									<span class="material-symbols-outlined text-sm">edit_note</span>
									<span>Lengkapi Semua Nilai ({selectedEmployeeAssessedCount}/{selectedEmployeeCompetencies.length})</span>
								{:else}
									<span class="material-symbols-outlined text-sm">save</span>
									<span>Simpan Penilaian {selectedEmployee.name}</span>
								{/if}
							</button>
						</form>
					</div>
				{/if}
			</div>
		</div>

	{:else if activeViewTab === 'post_training_l3'}
		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- TAB 2: PASCA-TRAINING 3 BULAN (LEVEL 3 KIRKPATRICK: BEHAVIOR)    -->
		<!-- ═══════════════════════════════════════════════════════════════ -->
		<div class="space-y-6">
			<!-- Banner Panduan Level 3 -->
			<div class="p-5 rounded-3xl bg-linear-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div class="flex items-start gap-3.5">
					<div class="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
						<span class="material-symbols-outlined text-xl">psychology</span>
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h3 class="text-sm font-black text-on-surface">Evaluasi Perilaku Kerja 3 Bulan (Kirkpatrick Level 3: Behavior)</h3>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white">Fase H+3 Bulan (Bersamaan L4 Post-Test)</span>
						</div>
						<p class="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-3xl">
							Diisi oleh atasan langsung setelah masa observasi kerja 3 bulan pasca-pelatihan. Mengevaluasi perubahan riil dalam 3 aspek: <strong>Sikap & Perilaku</strong>, <strong>Pengetahuan</strong>, serta <strong>Keterampilan kerja</strong> di tempat tugas mengacu pada 15 butir skala 1–3.
						</p>
					</div>
				</div>
				<div class="flex items-center gap-3 shrink-0">
					<div class="text-right">
						<div class="text-xs text-on-surface-variant font-medium">Jatuh Tempo Hari Ini</div>
						<div class="text-lg font-black text-blue-500">{l3ReadyCount} Karyawan</div>
					</div>
				</div>
			</div>

			<!-- Bagian 1: Antrean Siap Dinilai (Jatuh Tempo >= 3 Bulan) -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-blue-500 text-base">notifications_active</span>
						<h4 class="text-xs font-black uppercase tracking-wider text-on-surface">Siap Dinilai (Masa Observasi 3 Bulan Terpenuhi)</h4>
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
							{l3ReadyEvals.length} Jatuh Tempo
						</span>
					</div>
				</div>

				{#if l3ReadyEvals.length === 0}
					<div class="p-8 rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 text-center space-y-2">
						<span class="material-symbols-outlined text-4xl text-emerald-500">task_alt</span>
						<h5 class="text-sm font-black text-on-surface">Semua Karyawan Sudah Dievaluasi Level 3</h5>
						<p class="text-xs text-on-surface-variant max-w-md mx-auto">
							Tidak ada antrean evaluasi Level 3 (Behavior 3 Bulan) yang jatuh tempo saat ini.
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{#each l3ReadyEvals as item}
							<div class="p-5 rounded-3xl bg-surface border-2 border-blue-500/30 dark:border-blue-500/20 shadow-xs flex flex-col justify-between space-y-4">
								<div class="space-y-3">
									<div class="flex items-start justify-between gap-2">
										<div class="flex items-center gap-3">
											<div class="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 font-black text-sm flex items-center justify-center shrink-0">
												{item.employeeName.charAt(0)}
											</div>
											<div>
												<h5 class="text-xs font-black text-on-surface line-clamp-1">{item.employeeName}</h5>
												<p class="text-[11px] text-on-surface-variant font-mono">{item.payrollId} • {item.positionTitle}</p>
											</div>
										</div>
										<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 whitespace-nowrap">
											Jatuh Tempo
										</span>
									</div>

									<div class="p-3 rounded-2xl bg-surface-container space-y-1.5 border border-slate-200/40 dark:border-slate-800/40">
										<div class="flex items-center justify-between text-[11px]">
											<span class="text-on-surface-variant font-medium">Training:</span>
											<span class="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/10 text-blue-600">{item.courseCategory}</span>
										</div>
										<p class="text-xs font-bold text-on-surface line-clamp-2">{item.courseTitle}</p>
										<div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/40 dark:border-slate-700/40 text-[10px]">
											<div>
												<span class="text-on-surface-variant block">Selesai Training:</span>
												<span class="font-mono font-bold text-on-surface">{item.trainingCompletedAt || '-'}</span>
											</div>
											<div>
												<span class="text-on-surface-variant block">Target Evaluasi:</span>
												<span class="font-mono font-black text-blue-600 dark:text-blue-400">{item.dueDate || '-'}</span>
											</div>
										</div>
									</div>
								</div>

								<button
									type="button"
									onclick={() => openL3Modal(item)}
									class="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-98 transition-all cursor-pointer"
								>
									<span class="material-symbols-outlined text-sm">rate_review</span>
									<span>Beri Penilaian Behavior (15 Butir)</span>
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Bagian 2: Jadwal Mendatang (Masa Observasi Masih Berjalan) -->
			<div class="space-y-3 pt-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-slate-400 text-base">hourglass_top</span>
						<h4 class="text-xs font-black uppercase tracking-wider text-on-surface">Jadwal Mendatang (Masa Observasi Berjalan)</h4>
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400">
							{l3UpcomingEvals.length} Berjalan
						</span>
					</div>
				</div>

				{#if l3UpcomingEvals.length > 0}
					<div class="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs bg-surface">
						<div class="overflow-x-auto">
							<table class="w-full text-xs text-left">
								<thead class="bg-surface-container-high border-b border-slate-200/60 dark:border-slate-800/60 font-bold text-on-surface">
									<tr>
										<th class="p-3">Karyawan</th>
										<th class="p-3">Pelatihan</th>
										<th class="p-3">Tgl Selesai Training</th>
										<th class="p-3">Jadwal Penilaian Level 3</th>
										<th class="p-3 text-center">Hitung Mundur</th>
										<th class="p-3 text-right">Status Form</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
									{#each l3UpcomingEvals as item}
										<tr class="hover:bg-surface-container/50">
											<td class="p-3">
												<div class="font-bold text-on-surface">{item.employeeName}</div>
												<div class="text-[10px] font-mono text-on-surface-variant">{item.payrollId} • {item.positionTitle}</div>
											</td>
											<td class="p-3">
												<div class="font-bold text-on-surface">{item.courseTitle}</div>
												<div class="text-[10px] text-on-surface-variant">{item.courseCategory}</div>
											</td>
											<td class="p-3 font-mono text-on-surface-variant">
												{item.trainingCompletedAt || '-'}
											</td>
											<td class="p-3 font-mono font-bold text-on-surface">
												{item.dueDate || '-'}
											</td>
											<td class="p-3 text-center">
												<span class="px-2.5 py-1 rounded-xl text-xs font-black bg-blue-500/10 text-blue-500">
													{getDaysRemaining(item.dueDate)} hari lagi
												</span>
											</td>
											<td class="p-3 text-right">
												<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-500/10 text-slate-400">
													Observasi Berjalan
												</span>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</div>

			<!-- Bagian 3: Riwayat Evaluasi Selesai (Level 3) -->
			<div class="space-y-3 pt-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-500 text-base">check_circle</span>
						<h4 class="text-xs font-black uppercase tracking-wider text-on-surface">Riwayat Penilaian Selesai (Level 3 Behavior)</h4>
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
							{l3CompletedEvals.length} Selesai
						</span>
					</div>
				</div>

				{#if l3CompletedEvals.length > 0}
					<div class="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs bg-surface">
						<div class="overflow-x-auto">
							<table class="w-full text-xs text-left">
								<thead class="bg-surface-container-high border-b border-slate-200/60 dark:border-slate-800/60 font-bold text-on-surface">
									<tr>
										<th class="p-3">Karyawan</th>
										<th class="p-3">Pelatihan</th>
										<th class="p-3 text-center">Rata-rata Skor</th>
										<th class="p-3">Saran & Masukan Atasan</th>
										<th class="p-3">Tgl Review</th>
										<th class="p-3 text-right">Aksi</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
									{#each l3CompletedEvals as item}
										<tr class="hover:bg-surface-container/50">
											<td class="p-3">
												<div class="font-bold text-on-surface">{item.employeeName}</div>
												<div class="text-[10px] font-mono text-on-surface-variant">{item.payrollId} • {item.positionTitle}</div>
											</td>
											<td class="p-3">
												<div class="font-bold text-on-surface">{item.courseTitle}</div>
												<div class="text-[10px] text-on-surface-variant">{item.courseCategory}</div>
											</td>
											<td class="p-3 text-center">
												<span class="px-2.5 py-1 rounded-xl text-xs font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
													{item.l3AvgScore ? `${item.l3AvgScore} / 3.0` : `${item.l3BehaviorScore || 3} / 3.0`}
												</span>
											</td>
											<td class="p-3 text-on-surface-variant max-w-sm truncate text-xs">
												{item.l3Feedback || item.l3Notes || '-'}
											</td>
											<td class="p-3 text-on-surface-variant font-mono text-[11px]">
												{item.l3ReviewedAt || '-'}
											</td>
											<td class="p-3 text-right">
												<button
													type="button"
													onclick={() => openL3Modal(item)}
													class="px-2.5 py-1 rounded-lg bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-surface-container-high cursor-pointer"
												>
													Edit
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
		</div>

	{:else if activeViewTab === 'post_training_l4_pre'}
		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- TAB 3: LEVEL 4 PRE-TEST (BASELINE 3 BULAN SEBELUM TRAINING)      -->
		<!-- ═══════════════════════════════════════════════════════════════ -->
		<div class="space-y-6">
			<!-- Banner Panduan Level 4 Pre-Test -->
			<div class="p-5 rounded-3xl bg-linear-to-r from-indigo-500/10 via-blue-500/5 to-transparent border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div class="flex items-start gap-3.5">
					<div class="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
						<span class="material-symbols-outlined text-xl">history_edu</span>
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h3 class="text-sm font-black text-on-surface">Evaluasi Baseline Kondisi 3 Bulan Sebelum Training (Level 4 Pre-Test)</h3>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500 text-white">Masa Pengisian: 10 Hari</span>
						</div>
						<p class="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-3xl">
							Diisi oleh atasan langsung segera setelah karyawan menyelesaikan pelatihan (berbarengan pengisian Level 1). Berfungsi sebagai <strong>data dasar (baseline)</strong> performa karyawan dalam 3 bulan <em>sebelum</em> training untuk dikomparasikan dengan dampak nyata pada Level 4 Post-Test (setelah 3 bulan kerja di lapangan).
						</p>
					</div>
				</div>
				<div class="flex items-center gap-3 shrink-0">
					<div class="text-right">
						<div class="text-xs text-on-surface-variant font-medium">Antrean Menunggu</div>
						<div class="text-lg font-black text-indigo-500">{l4PrePendingCount} Karyawan</div>
					</div>
				</div>
			</div>

			<!-- Bagian 1: Antrean Pengisian Pre-Test (SLA 10 Hari) -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-indigo-500 text-base">pending_actions</span>
						<h4 class="text-xs font-black uppercase tracking-wider text-on-surface">Antrean Pengisian Baseline (Tenggat 10 Hari)</h4>
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
							{l4PrePendingEvals.length} Perlu Dinilai
						</span>
					</div>
				</div>

				{#if l4PrePendingEvals.length === 0}
					<div class="p-8 rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 text-center space-y-2">
						<span class="material-symbols-outlined text-4xl text-emerald-500">task_alt</span>
						<h5 class="text-sm font-black text-on-surface">Semua Evaluasi Pre-Test Selesai</h5>
						<p class="text-xs text-on-surface-variant max-w-md mx-auto">
							Tidak ada antrean Level 4 Pre-Test yang tertunda. Seluruh data baseline kondisi 3 bulan sebelum training telah terisi lengkap.
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{#each l4PrePendingEvals as item}
							{@const remaining = getPreRemainingDays(item.l4PreDueDate)}
							<div class="p-5 rounded-3xl bg-surface border-2 {remaining.isOverdue ? 'border-rose-500/40 dark:border-rose-500/30' : 'border-indigo-500/30 dark:border-indigo-500/20'} shadow-xs flex flex-col justify-between space-y-4">
								<div class="space-y-3">
									<div class="flex items-start justify-between gap-2">
										<div class="flex items-center gap-3">
											<div class="w-10 h-10 rounded-2xl {remaining.isOverdue ? 'bg-rose-500/10 text-rose-600' : 'bg-indigo-500/10 text-indigo-600'} font-black text-sm flex items-center justify-center shrink-0">
												{item.employeeName.charAt(0)}
											</div>
											<div>
												<h5 class="text-xs font-black text-on-surface line-clamp-1">{item.employeeName}</h5>
												<p class="text-[11px] text-on-surface-variant font-mono">{item.payrollId} • {item.positionTitle}</p>
											</div>
										</div>
										{#if remaining.isOverdue}
											<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 whitespace-nowrap animate-pulse">
												Overdue ({remaining.days} hr)
											</span>
										{:else}
											<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
												Sisa {remaining.days} hr
											</span>
										{/if}
									</div>

									<div class="p-3 rounded-2xl bg-surface-container space-y-1.5 border border-slate-200/40 dark:border-slate-800/40">
										<div class="flex items-center justify-between text-[11px]">
											<span class="text-on-surface-variant font-medium">Training:</span>
											<span class="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/10 text-indigo-600">{item.courseCategory}</span>
										</div>
										<p class="text-xs font-bold text-on-surface line-clamp-2">{item.courseTitle}</p>
										<div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/40 dark:border-slate-700/40 text-[10px]">
											<div>
												<span class="text-on-surface-variant block">Selesai Training:</span>
												<span class="font-mono font-bold text-on-surface">{item.trainingCompletedAt || '-'}</span>
											</div>
											<div>
												<span class="text-on-surface-variant block">Batas Waktu (SLA):</span>
												<span class="font-mono font-black {remaining.isOverdue ? 'text-rose-600' : 'text-indigo-600'}">{item.l4PreDueDate || '-'}</span>
											</div>
										</div>
									</div>
								</div>

								<button
									type="button"
									onclick={() => openL4PreModal(item)}
									class="w-full py-2.5 px-4 rounded-xl {remaining.isOverdue ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-98 transition-all cursor-pointer"
								>
									<span class="material-symbols-outlined text-sm">edit_note</span>
									<span>Isi Evaluasi Pre-Test (Baseline)</span>
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Bagian 2: Riwayat Evaluasi Selesai (Level 4 Pre-Test) -->
			<div class="space-y-3 pt-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-500 text-base">verified</span>
						<h4 class="text-xs font-black uppercase tracking-wider text-on-surface">Riwayat Baseline Selesai (Level 4 Pre-Test)</h4>
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
							{l4PreCompletedEvals.length} Selesai
						</span>
					</div>
				</div>

				{#if l4PreCompletedEvals.length > 0}
					<div class="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs bg-surface">
						<div class="overflow-x-auto">
							<table class="w-full text-xs text-left">
								<thead class="bg-surface-container-high border-b border-slate-200/60 dark:border-slate-800/60 font-bold text-on-surface">
									<tr>
										<th class="p-3">Karyawan</th>
										<th class="p-3">Pelatihan</th>
										<th class="p-3">Kategori Skill</th>
										<th class="p-3">Metrik Baseline (3 Bln Pra-Training)</th>
										<th class="p-3">Tgl Review</th>
										<th class="p-3">Catatan</th>
										<th class="p-3 text-right">Aksi</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
									{#each l4PreCompletedEvals as item}
										{@const catConfig = preSkillCategoryDefinitions[item.l4PreSkillCategory as keyof typeof preSkillCategoryDefinitions] || preSkillCategoryDefinitions['Technical Skill']}
										<tr class="hover:bg-surface-container/50">
											<td class="p-3">
												<div class="font-bold text-on-surface">{item.employeeName}</div>
												<div class="text-[10px] font-mono text-on-surface-variant">{item.payrollId} • {item.positionTitle}</div>
											</td>
											<td class="p-3">
												<div class="font-bold text-on-surface">{item.courseTitle}</div>
												<div class="text-[10px] text-on-surface-variant">{item.courseCategory}</div>
											</td>
											<td class="p-3">
												<span class="px-2 py-0.5 rounded-lg text-xs font-bold border {catConfig.badgeColor}">
													{item.l4PreSkillCategory || 'Technical Skill'}
												</span>
											</td>
											<td class="p-3">
												<div class="grid grid-cols-2 gap-1 text-[11px]">
													<div class="flex items-center gap-1 font-mono">
														<span class="text-slate-400">P1:</span>
														<strong class="text-on-surface">{item.l4PreMetrics?.p1 ?? '-'}</strong>
														<span class="text-[9px] text-slate-400">({catConfig.metrics[0].unit})</span>
													</div>
													<div class="flex items-center gap-1 font-mono">
														<span class="text-slate-400">P2:</span>
														<strong class="text-on-surface">{item.l4PreMetrics?.p2 ?? '-'}</strong>
														<span class="text-[9px] text-slate-400">({catConfig.metrics[1].unit})</span>
													</div>
													<div class="flex items-center gap-1 font-mono">
														<span class="text-slate-400">P3:</span>
														<strong class="text-on-surface">{item.l4PreMetrics?.p3 ?? '-'}</strong>
														<span class="text-[9px] text-slate-400">({catConfig.metrics[2].unit})</span>
													</div>
													<div class="flex items-center gap-1 font-mono">
														<span class="text-slate-400">P4:</span>
														<strong class="text-on-surface">{item.l4PreMetrics?.p4 ?? '-'}</strong>
														<span class="text-[9px] text-slate-400">({catConfig.metrics[3].unit})</span>
													</div>
												</div>
											</td>
											<td class="p-3 text-on-surface-variant font-mono text-[11px]">
												{item.l4PreReviewedAt || '-'}
											</td>
											<td class="p-3 text-on-surface-variant max-w-xs truncate">
												{item.l4PreNotes || '-'}
											</td>
											<td class="p-3 text-right">
												<button
													type="button"
													onclick={() => openL4PreModal(item)}
													class="px-2.5 py-1 rounded-lg bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-surface-container-high cursor-pointer"
												>
													Edit
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
		</div>

	{:else if activeViewTab === 'post_training_l4_post'}
		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- TAB 4: PASCA-TRAINING 3 BULAN (LEVEL 4 KIRKPATRICK: POST-TEST)   -->
		<!-- ═══════════════════════════════════════════════════════════════ -->
		<div class="space-y-6">
			<!-- Banner Panduan Level 4 -->
			<div class="p-5 rounded-3xl bg-linear-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div class="flex items-start gap-3.5">
					<div class="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
						<span class="material-symbols-outlined text-xl">trending_up</span>
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h3 class="text-sm font-black text-on-surface">Evaluasi Dampak Bisnis 3 Bulan (Kirkpatrick Level 4: Business Results)</h3>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white">Fase 2 Pasca-Training (H+90 Hari)</span>
						</div>
						<p class="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-3xl">
							Diisi oleh atasan langsung setelah masa observasi kerja 3 bulan pasca-training. Tujuannya membuktikan dampak nyata terhadap efisiensi unit kerja, produktivitas harian, serta penurunan angka komplain/insiden kerja.
						</p>
					</div>
				</div>
				<div class="flex items-center gap-3 shrink-0">
					<div class="text-right">
						<div class="text-xs text-on-surface-variant font-medium">Jatuh Tempo Hari Ini</div>
						<div class="text-lg font-black text-amber-500">{l4ReadyCount} Karyawan</div>
					</div>
				</div>
			</div>

			<!-- Bagian 1: Antrean Siap Dinilai (Jatuh Tempo >= 3 Bulan) -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-500 text-base">notifications_active</span>
						<h4 class="text-xs font-black uppercase tracking-wider text-on-surface">Siap Dinilai (Masa Observasi 3 Bulan Terpenuhi)</h4>
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
							{l4ReadyEvals.length} Jatuh Tempo
						</span>
					</div>
				</div>

				{#if l4ReadyEvals.length === 0}
					<div class="p-8 rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 text-center space-y-2">
						<span class="material-symbols-outlined text-4xl text-emerald-500">verified</span>
						<h5 class="text-sm font-black text-on-surface">Tidak Ada Evaluasi Jatuh Tempo</h5>
						<p class="text-xs text-on-surface-variant max-w-md mx-auto">
							Semua evaluasi Level 4 yang jatuh tempo sudah Anda lengkapi. Periksa daftar jadwal mendatang di bawah untuk pelatihan yang sedang berjalan.
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{#each l4ReadyEvals as item}
							<div class="p-5 rounded-3xl bg-surface border-2 border-amber-500/30 dark:border-amber-500/20 shadow-xs flex flex-col justify-between space-y-4">
								<div class="space-y-3">
									<div class="flex items-start justify-between gap-2">
										<div class="flex items-center gap-3">
											<div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 font-black text-sm flex items-center justify-center shrink-0">
												{item.employeeName.charAt(0)}
											</div>
											<div>
												<h5 class="text-xs font-black text-on-surface line-clamp-1">{item.employeeName}</h5>
												<p class="text-[11px] text-on-surface-variant font-mono">{item.payrollId} • {item.positionTitle}</p>
											</div>
										</div>
										<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 whitespace-nowrap">
											Jatuh Tempo
										</span>
									</div>

									<div class="p-3 rounded-2xl bg-surface-container space-y-1.5 border border-slate-200/40 dark:border-slate-800/40">
										<div class="flex items-center justify-between text-[11px]">
											<span class="text-on-surface-variant font-medium">Training:</span>
											<span class="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-600">{item.courseCategory}</span>
										</div>
										<p class="text-xs font-bold text-on-surface line-clamp-2">{item.courseTitle}</p>
										<div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/40 dark:border-slate-700/40 text-[10px]">
											<div>
												<span class="text-on-surface-variant block">Selesai Training:</span>
												<span class="font-mono font-bold text-on-surface">{item.trainingCompletedAt || '-'}</span>
											</div>
											<div>
												<span class="text-on-surface-variant block">Target Evaluasi:</span>
												<span class="font-mono font-black text-amber-600 dark:text-amber-400">{item.dueDate || '-'}</span>
											</div>
										</div>
									</div>
								</div>

								<button
									type="button"
									onclick={() => openL4Modal(item)}
									class="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-98 transition-all cursor-pointer"
								>
									<span class="material-symbols-outlined text-sm">checklist</span>
									<span>Evaluasi Hasil 3 Bulan</span>
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Bagian 2: Jadwal Mendatang (Masa Observasi Masih Berjalan) -->
			<div class="space-y-3 pt-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-slate-400 text-base">hourglass_top</span>
						<h4 class="text-xs font-black uppercase tracking-wider text-on-surface">Jadwal Mendatang (Masa Observasi 3 Bulan Berjalan)</h4>
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400">
							{l4UpcomingEvals.length} Berjalan
						</span>
					</div>
				</div>

				{#if l4UpcomingEvals.length > 0}
					<div class="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs bg-surface">
						<div class="overflow-x-auto">
							<table class="w-full text-xs text-left">
								<thead class="bg-surface-container-high border-b border-slate-200/60 dark:border-slate-800/60 font-bold text-on-surface">
									<tr>
										<th class="p-3">Karyawan</th>
										<th class="p-3">Pelatihan</th>
										<th class="p-3">Tgl Selesai Training</th>
										<th class="p-3">Jadwal Penilaian Level 4</th>
										<th class="p-3 text-center">Hitung Mundur</th>
										<th class="p-3 text-right">Status Form</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
									{#each l4UpcomingEvals as item}
										<tr class="hover:bg-surface-container/50">
											<td class="p-3">
												<div class="font-bold text-on-surface">{item.employeeName}</div>
												<div class="text-[10px] font-mono text-on-surface-variant">{item.payrollId} • {item.positionTitle}</div>
											</td>
											<td class="p-3">
												<div class="font-bold text-on-surface">{item.courseTitle}</div>
												<div class="text-[10px] text-on-surface-variant">{item.courseCategory}</div>
											</td>
											<td class="p-3 font-mono text-on-surface-variant">
												{item.trainingCompletedAt || '-'}
											</td>
											<td class="p-3 font-mono font-bold text-on-surface">
												{item.dueDate || '-'}
											</td>
											<td class="p-3 text-center">
												<span class="px-2.5 py-1 rounded-xl text-xs font-black bg-blue-500/10 text-blue-500">
													{getDaysRemaining(item.dueDate)} hari lagi
												</span>
											</td>
											<td class="p-3 text-right">
												<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-500/10 text-slate-400">
													Observasi Berjalan
												</span>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</div>

			<!-- Bagian 3: Riwayat Penilaian Selesai Level 4 -->
			<div class="space-y-3 pt-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-500 text-base">verified</span>
						<h4 class="text-xs font-black uppercase tracking-wider text-on-surface">Riwayat Penilaian Selesai (Level 4)</h4>
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
							{l4CompletedEvals.length} Selesai
						</span>
					</div>
				</div>

				{#if l4CompletedEvals.length > 0}
					<div class="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs bg-surface">
						<div class="overflow-x-auto">
							<table class="w-full text-xs text-left">
								<thead class="bg-surface-container-high border-b border-slate-200/60 dark:border-slate-800/60 font-bold text-on-surface">
									<tr>
										<th class="p-3">Karyawan</th>
										<th class="p-3">Pelatihan</th>
										<th class="p-3">Kategori Skill</th>
										<th class="p-3">Komparasi Hasil (Sebelum ➔ Sesudah)</th>
										<th class="p-3">Rekomendasi / Catatan</th>
										<th class="p-3">Tgl Review</th>
										<th class="p-3 text-right">Aksi</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
									{#each l4CompletedEvals as item}
										{@const catKey = item.l4PreSkillCategory || 'Technical Skill'}
										{@const catConfig = preSkillCategoryDefinitions[catKey as keyof typeof preSkillCategoryDefinitions] || preSkillCategoryDefinitions['Technical Skill']}
										<tr class="hover:bg-surface-container/50">
											<td class="p-3">
												<div class="font-bold text-on-surface">{item.employeeName}</div>
												<div class="text-[10px] font-mono text-on-surface-variant">{item.payrollId} • {item.positionTitle}</div>
											</td>
											<td class="p-3">
												<div class="font-bold text-on-surface">{item.courseTitle}</div>
												<div class="text-[10px] text-on-surface-variant">{item.courseCategory}</div>
											</td>
											<td class="p-3">
												<span class="px-2 py-0.5 rounded-lg text-xs font-bold border {catConfig.badgeColor}">
													{catConfig.label}
												</span>
											</td>
											<td class="p-3">
												<div class="grid grid-cols-2 gap-1 text-[11px]">
													{#each catConfig.metrics as m}
														{@const pre = item.l4PreMetrics?.[m.id]}
														{@const post = item.l4PostMetrics?.[m.id]}
														<div class="flex items-center gap-1 font-mono">
															<span class="text-slate-400">{m.id.toUpperCase()}:</span>
															<span class="text-slate-400">{pre !== undefined && pre !== '' ? pre : '-'}</span>
															<span class="text-slate-400 text-[10px]">➔</span>
															<strong class="text-on-surface">{post !== undefined && post !== '' ? post : '-'}</strong>
															<span class="text-[9px] text-slate-400">({m.unit})</span>
														</div>
													{/each}
												</div>
											</td>
											<td class="p-3 text-on-surface-variant max-w-xs truncate text-xs">
												{item.l4PostNotes || item.l4Notes || '-'}
											</td>
											<td class="p-3 text-on-surface-variant font-mono text-[11px]">
												{item.l4PostReviewedAt || item.l4ReviewedAt || '-'}
											</td>
											<td class="p-3 text-right">
												<button
													type="button"
													onclick={() => openL4Modal(item)}
													class="px-2.5 py-1 rounded-lg bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-surface-container-high cursor-pointer"
												>
													Edit
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
		</div>

	{:else if activeViewTab === 'history'}
		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- TAB RIWAYAT ASESMEN (HISTORY VIEW)                              -->
		<!-- ═══════════════════════════════════════════════════════════════ -->
		<div class="space-y-4">
			<!-- Toolbar Pencarian & Filter Riwayat -->
			<div class="p-4 rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
				<div class="relative flex-1 max-w-md">
					<span class="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-sm">search</span>
					<input
						type="text"
						bind:value={historySearchQuery}
						placeholder="Cari nama karyawan, NIK, jabatan, atau kode kompetensi..."
						class="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none"
					/>
				</div>

				<div class="flex items-center gap-2">
					<span class="text-slate-400 font-bold">Periode:</span>
					<select
						bind:value={historyPeriodFilter}
						class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface font-semibold"
					>
						<option value="All">Semua Periode</option>
						{#each assessmentPeriods as prd}
							<option value={prd}>{prd}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Tabel Riwayat -->
			<div class="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xl bg-surface">
				<div class="overflow-x-auto">
					<table class="w-full text-xs text-left">
						<thead class="bg-surface-container-high border-b border-slate-200/60 dark:border-slate-800/60 font-bold text-on-surface">
							<tr>
								<th class="p-3">Periode</th>
								<th class="p-3">Nama Karyawan</th>
								<th class="p-3">Posisi Jabatan</th>
								<th class="p-3">Kompetensi</th>
								<th class="p-3 text-center">Nilai Diberikan</th>
								<th class="p-3">Catatan Observasi</th>
								<th class="p-3">Asesor</th>
								<th class="p-3">Tanggal</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
							{#each filteredHistory as a}
								<tr class="hover:bg-surface-container/40">
									<td class="p-3 font-mono font-bold text-primary">{a.period}</td>
									<td class="p-3">
										<p class="font-bold text-on-surface">{a.employeeName}</p>
										<p class="font-mono text-[10px] text-slate-400">{a.payrollId}</p>
									</td>
									<td class="p-3 text-slate-400">{a.positionTitle}</td>
									<td class="p-3 font-medium">
										<span class="font-mono text-[10px] font-bold text-primary mr-1">[{a.competencyCode}]</span>
										<span>{a.competencyName}</span>
									</td>
									<td class="p-3 text-center">
										<span class="inline-flex items-center px-2.5 py-1 rounded-xl font-mono text-xs font-black bg-primary/10 text-primary border border-primary/20">
											Level {a.actualLevel}
										</span>
									</td>
									<td class="p-3 text-slate-500 max-w-[200px] truncate" title={a.notes}>
										{a.notes || '-'}
									</td>
									<td class="p-3 text-slate-400">{a.assessorName}</td>
									<td class="p-3 text-slate-500 font-mono text-[10px]">{a.assessmentDate}</td>
								</tr>
							{/each}

							{#if filteredHistory.length === 0}
								<tr>
									<td colspan="8" class="p-8 text-center text-slate-400">
										<span class="material-symbols-outlined text-4xl block mb-2 text-slate-300">search_off</span>
										<p class="font-bold">Tidak ada riwayat asesmen yang cocok dengan filter pencarian.</p>
									</td>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{:else if activeViewTab === 'training_requests'}
		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- TAB USULAN & REQUEST PELATIHAN TIM (SUPERVISOR TO HRD)         -->
		<!-- ═══════════════════════════════════════════════════════════════ -->
		<div class="space-y-5">
			<!-- Header Banner & Action Button -->
			<div class="p-5 rounded-3xl bg-surface border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<div class="flex items-center gap-2">
						<span class="px-2.5 py-1 rounded-xl text-xs font-black bg-primary/10 text-primary border border-primary/20">
							Supervisor Request
						</span>
						<span class="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
							{currentAssessor?.department || 'Operations'}
						</span>
					</div>
					<h3 class="text-base font-black text-on-surface mt-2 tracking-tight">Usulan & Kebutuhan Pelatihan Tim ke HRD</h3>
					<p class="text-xs text-on-surface-variant mt-0.5 leading-relaxed max-w-2xl">
						Ajukan rekomendasi pelatihan tim bawahan langsung berdasarkan evaluasi performa kerja dan kebutuhan operasional. Permintaan akan diverifikasi oleh HRD (Pending, Approved, atau Hold).
					</p>
				</div>
				<button
					type="button"
					onclick={() => openCreateTrainingRequestModal()}
					class="px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto shrink-0"
				>
					<span class="material-symbols-outlined text-base">post_add</span>
					<span>+ Ajukan Pelatihan Baru</span>
				</button>
			</div>

			<!-- 4 KPI Summary Cards Status Usulan -->
			<div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
				<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
					<div>
						<span class="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Usulan Diajukan</span>
						<p class="text-2xl font-black text-on-surface font-mono mt-0.5">
							{myTrainingRequests.length}
						</p>
					</div>
					<div class="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">list_alt</span>
					</div>
				</div>

				<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
					<div>
						<span class="text-[10px] font-bold text-amber-500 block uppercase tracking-wider">Menunggu Review HRD</span>
						<p class="text-2xl font-black text-amber-500 font-mono mt-0.5">
							{myTrainingRequests.filter((r) => r.status === 'PENDING').length}
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
							{myTrainingRequests.filter((r) => r.status === 'APPROVED').length}
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
							{myTrainingRequests.filter((r) => r.status === 'HOLD').length}
						</p>
					</div>
					<div class="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">pause_circle</span>
					</div>
				</div>
			</div>

			<!-- Toolbar Search & Filter -->
			<div class="p-4 rounded-3xl bg-surface border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
				<div class="relative flex-1 max-w-md">
					<span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
					<input
						type="text"
						bind:value={requestSearchQuery}
						placeholder="Cari nomor usulan, judul pelatihan, atau departemen..."
						class="w-full pl-9 pr-3 py-2 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary"
					/>
				</div>

				<div class="flex items-center gap-2">
					<span class="text-slate-400 font-bold">Status:</span>
					<select
						bind:value={requestStatusFilter}
						class="px-3 py-2 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs text-on-surface font-semibold outline-none"
					>
						<option value="All">Semua Status</option>
						<option value="PENDING">PENDING (Menunggu Review)</option>
						<option value="APPROVED">APPROVED (Disetujui)</option>
						<option value="HOLD">HOLD (Ditunda)</option>
					</select>
				</div>
			</div>

			<!-- Tabel Tracking Request Atasan -->
			<div class="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs bg-surface">
				<div class="overflow-x-auto">
					<table class="w-full text-xs text-left">
						<thead class="bg-surface-container-high border-b border-slate-200/60 dark:border-slate-800/60 font-bold text-on-surface">
							<tr>
								<th class="p-3">No. Usulan</th>
								<th class="p-3">Judul Pelatihan Diusulkan</th>
								<th class="p-3">Departemen</th>
								<th class="p-3">Kategori</th>
								<th class="p-3 text-center">Urgensi</th>
								<th class="p-3 text-center">Estimasi Peserta</th>
								<th class="p-3 text-center">Target Selesai</th>
								<th class="p-3 text-center">Status HRD</th>
								<th class="p-3">Catatan / Alasan HRD</th>
								<th class="p-3 text-right">Tanggal Usulan</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
							{#each myTrainingRequests as req}
								<tr class="hover:bg-surface-container/40 transition-colors">
									<td class="p-3 font-mono font-bold text-primary whitespace-nowrap">{req.id}</td>
									<td class="p-3">
										<p class="font-bold text-on-surface">{req.trainingTitle}</p>
										{#if req.justification}
											<p class="text-[11px] text-slate-500 mt-0.5 line-clamp-1" title={req.justification}>
												{req.justification}
											</p>
										{/if}
									</td>
									<td class="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{req.deptName}</td>
									<td class="p-3 text-slate-500 whitespace-nowrap">{req.category}</td>
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
									<td class="p-3 max-w-[220px]">
										{#if req.hrdNotes}
											<div class="p-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-[11px] text-on-surface">
												<p class="font-bold text-[10px] text-slate-400 mb-0.5">Catatan HRD:</p>
												<p class="line-clamp-2" title={req.hrdNotes}>{req.hrdNotes}</p>
											</div>
										{:else}
											<span class="text-slate-400 italic text-[11px]">- Menunggu feedback -</span>
										{/if}
									</td>
									<td class="p-3 text-right font-mono text-slate-500 text-[11px] whitespace-nowrap">
										{req.createdAt || '-'}
									</td>
								</tr>
							{/each}

							{#if myTrainingRequests.length === 0}
								<tr>
									<td colspan="10" class="p-10 text-center text-slate-400">
										<span class="material-symbols-outlined text-4xl block mb-2 text-slate-300">playlist_remove</span>
										<p class="font-bold text-sm">Belum ada usulan pelatihan yang diajukan.</p>
										<p class="text-xs text-slate-500 mt-1">Gunakan tombol "+ Ajukan Pelatihan Baru" di atas untuk merekomendasikan program ke HRD.</p>
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

<!-- Modal Rubrik Indikator Level 1-5 -->
{#if isRubricModalOpen && selectedCompForRubric}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<div class="flex items-center gap-2">
						<span class="font-mono text-xs font-black text-indigo-400">[{selectedCompForRubric.code}]</span>
						<h3 class="font-black text-base text-on-surface">{selectedCompForRubric.name}</h3>
					</div>
					<p class="text-xs text-on-surface-variant">{selectedCompForRubric.aspect} — Kamus Kompetensi PT BCS</p>
				</div>
				<button type="button" onclick={() => (isRubricModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
				{#each selectedCompForRubric.levelIndicators as ind}
					<div class="p-3.5 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 flex items-start gap-3">
						<span class="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-indigo-500 text-white shadow-xs">
							Lvl {ind.level}
						</span>
						<p class="text-xs text-on-surface leading-relaxed flex-1">{ind.desc || 'Indikator perilaku standar.'}</p>
					</div>
				{/each}
			</div>

			<div class="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
				<button type="button" onclick={() => (isRubricModalOpen = false)} class="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer">
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Form Evaluasi Pasca-Training 3 Bulan (Level 3: Behavior) -->
{#if isL3ModalOpen && selectedL3Eval}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150 my-8 max-h-[92vh] flex flex-col">
			<!-- Header Modal -->
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-blue-500 text-xl">psychology</span>
						<h3 class="font-black text-base text-on-surface">Evaluasi Perilaku Kerja 3 Bulan (Level 3: Behavior)</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">
						Observasi perubahan sikap, pengetahuan, dan keterampilan kerja setelah 3 bulan di lapangan pasca-training
					</p>
				</div>
				<button type="button" onclick={() => (isL3ModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/submitEvaluationL3"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							notifySuccess(result.data?.message || 'Evaluasi Level 3 Behavior berhasil disimpan!');
							isL3ModalOpen = false;
						} else {
							notifyError(result.data?.message || 'Gagal menyimpan evaluasi.');
						}
						await update();
					};
				}}
				class="space-y-5 overflow-y-auto pr-1 flex-1"
			>
				<input type="hidden" name="evalId" value={selectedL3Eval.id} />
				<input type="hidden" name="assessorName" value={currentAssessor?.name || currentUser?.name || 'Supervisor'} />
				<input type="hidden" name="answers" value={JSON.stringify(l3AnswersMap)} />

				<!-- Info Box Karyawan & Kursus -->
				<div class="p-3.5 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-1">
					<div class="flex justify-between items-start">
						<div>
							<h4 class="text-xs font-black text-on-surface">{selectedL3Eval.employeeName}</h4>
							<p class="text-[11px] font-mono text-on-surface-variant">{selectedL3Eval.payrollId} • {selectedL3Eval.positionTitle} ({selectedL3Eval.department})</p>
						</div>
						<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-500">
							Fase Observasi H+3 Bulan
						</span>
					</div>
					<div class="pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-xs">
						<p class="font-semibold text-primary">{selectedL3Eval.courseTitle}</p>
						<span class="text-slate-400 font-mono text-[11px]">Selesai: {selectedL3Eval.trainingCompletedAt || '-'}</span>
					</div>
				</div>

				<!-- Panduan Skala Penilaian -->
				<div class="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-center justify-between text-xs">
					<div class="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
						<span class="material-symbols-outlined text-base">info</span>
						<span>Panduan Skala Penilaian (1–3):</span>
					</div>
					<div class="flex items-center gap-3 text-[11px]">
						<span class="px-2 py-0.5 rounded bg-surface border border-slate-200 text-slate-600 dark:text-slate-300"><strong>1</strong>: Tidak Lebih Baik</span>
						<span class="px-2 py-0.5 rounded bg-surface border border-slate-200 text-slate-600 dark:text-slate-300"><strong>2</strong>: Sedikit Berubah</span>
						<span class="px-2 py-0.5 rounded bg-surface border border-slate-200 text-slate-600 dark:text-slate-300"><strong>3</strong>: Lebih Baik</span>
					</div>
				</div>

				<!-- 15 Butir Pertanyaan (3 Aspek) -->
				{#each l3BehaviorQuestions as grp, gIdx}
					<div class="space-y-3 p-4 rounded-2xl bg-surface-container-high/60 border border-slate-200/60 dark:border-slate-800/60">
						<div class="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
							<div>
								<h5 class="text-xs font-black uppercase tracking-wider text-on-surface">
									{gIdx + 1}. Aspek {grp.aspect}
								</h5>
								<p class="text-[11px] text-slate-400">{grp.description}</p>
							</div>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
								5 Indikator
							</span>
						</div>

						<div class="space-y-2.5">
							{#each grp.items as q, qIdx}
								<div class="p-3 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
									<div class="text-xs font-bold text-on-surface flex-1">
										<span class="text-primary font-mono mr-1.5">{qIdx + 1}.</span> {q.label}
									</div>
									<div class="flex items-center gap-1.5 shrink-0">
										{#each l3LikertOptions as opt}
											<button
												type="button"
												onclick={() => (l3AnswersMap[q.id] = opt.value)}
												class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer whitespace-nowrap
												{l3AnswersMap[q.id] === opt.value
													? 'bg-blue-600 text-white border-blue-600 shadow-xs scale-102'
													: 'bg-surface-container border-slate-200 dark:border-slate-700 text-slate-400 hover:text-on-surface'}"
												title={opt.desc}
											>
												{opt.label}
											</button>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}

				<!-- Saran & Masukan Atasan -->
				<div class="space-y-1.5">
					<label class="text-xs font-bold text-on-surface block">
						Saran & Masukan Atasan Terhadap Program Pelatihan di Atas
					</label>
					<textarea
						name="feedback"
						bind:value={l3Feedback}
						rows="3"
						placeholder="Berikan saran masukan konstruktif untuk penyelenggaraan judul pelatihan terkait di masa depan..."
						class="w-full p-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-blue-500"
					></textarea>
				</div>

				<div class="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
					<button
						type="button"
						onclick={() => (isL3ModalOpen = false)}
						class="px-4 py-2 rounded-xl bg-surface-container text-xs font-bold hover:bg-surface-container-high cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
					>
						<span class="material-symbols-outlined text-sm">save</span>
						<span>{isSubmitting ? 'Menyimpan...' : 'Simpan Evaluasi Level 3'}</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Form Evaluasi Dampak Bisnis 3 Bulan (Level 4 Post-Test - Komparasi Before vs After) -->
{#if isL4ModalOpen && selectedL4Eval}
	{@const preCategory = selectedL4Eval.l4PreSkillCategory || 'Technical Skill'}
	{@const catConfig = preSkillCategoryDefinitions[preCategory as keyof typeof preSkillCategoryDefinitions] || preSkillCategoryDefinitions['Technical Skill']}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150 my-8 max-h-[92vh] flex flex-col">
			<!-- Header Modal -->
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-500 text-xl">trending_up</span>
						<h3 class="font-black text-base text-on-surface">Evaluasi Hasil Bisnis 3 Bulan (Level 4 Post-Test)</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">
						Komparasi langsung hasil nyata kondisi Sebelum (Pre-Test) vs Sesudah (Post-Test) 3 bulan pelatihan
					</p>
				</div>
				<button type="button" onclick={() => (isL4ModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/submitEvaluationL4"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							notifySuccess(result.data?.message || 'Evaluasi Level 4 Post-Test berhasil disimpan!');
							isL4ModalOpen = false;
						} else {
							notifyError(result.data?.message || 'Gagal menyimpan evaluasi.');
						}
						await update();
					};
				}}
				class="space-y-5 overflow-y-auto pr-1 flex-1"
			>
				<input type="hidden" name="evalId" value={selectedL4Eval.id} />
				<input type="hidden" name="assessorName" value={currentAssessor?.name || currentUser?.name || 'Supervisor'} />
				<input type="hidden" name="metrics" value={JSON.stringify(l4PostMetrics)} />

				<!-- Info Box Karyawan & Kursus -->
				<div class="p-3.5 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-1">
					<div class="flex justify-between items-start">
						<div>
							<h4 class="text-xs font-black text-on-surface">{selectedL4Eval.employeeName}</h4>
							<p class="text-[11px] font-mono text-on-surface-variant">{selectedL4Eval.payrollId} • {selectedL4Eval.positionTitle} ({selectedL4Eval.department})</p>
						</div>
						<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600">
							H+90 Hari Observasi Lapangan
						</span>
					</div>
					<div class="pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-xs">
						<p class="font-semibold text-primary">{selectedL4Eval.courseTitle}</p>
						<span class="text-slate-400 font-mono text-[11px]">Selesai: {selectedL4Eval.trainingCompletedAt || '-'}</span>
					</div>
				</div>

				<!-- Kategori Keahlian Terkunci Otomatis Sesuai Pre-Test -->
				<div class="p-3.5 rounded-2xl bg-surface border border-slate-200 dark:border-slate-700 flex items-center justify-between">
					<div class="flex items-center gap-2.5">
						<span class="material-symbols-outlined text-amber-500 text-xl">{catConfig.icon}</span>
						<div>
							<div class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Kategori Keahlian (Terkunci Sesuai Pre-Test)</div>
							<div class="text-xs font-black text-on-surface">{catConfig.label}</div>
						</div>
					</div>
					<span class="px-2.5 py-1 rounded-xl text-xs font-bold border {catConfig.badgeColor}">
						{catConfig.label}
					</span>
				</div>

				<!-- Kartu Komparasi 4 Indikator P1–P4 (Sebelum vs Sesudah) -->
				<div class="space-y-3 p-4 rounded-2xl bg-surface-container-high/60 border border-slate-200/60 dark:border-slate-800/60">
					<div class="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
						<div>
							<h5 class="text-xs font-black uppercase tracking-wider text-on-surface">
								Komparasi 4 Indikator Hasil Nyata
							</h5>
							<p class="text-[11px] text-slate-400">Bandingkan kondisi baseline sebelum pelatihan vs pencapaian aktual selama 3 bulan terakhir.</p>
						</div>
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600">
							Before vs After
						</span>
					</div>

					<div class="space-y-3.5">
						{#each catConfig.metrics as metric, idx}
							{@const preVal = selectedL4Eval.l4PreMetrics?.[metric.id]}
							{@const postVal = l4PostMetrics[metric.id]}
							<div class="p-3.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 space-y-2">
								<div class="flex items-start justify-between gap-2">
									<div>
										<h6 class="text-xs font-black text-on-surface">
											<span class="text-amber-500 font-mono mr-1">P{idx + 1}.</span> {metric.label}
										</h6>
										<p class="text-[10px] text-slate-400 mt-0.5">{metric.hint}</p>
									</div>
									<span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-surface-container text-slate-400 shrink-0">
										{metric.unit}
									</span>
								</div>

								<!-- 2 Kolom Komparasi: Sebelum vs Sesudah -->
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
									<!-- Kolom Kiri: Sebelum Pelatihan (Pre-Test) -->
									<div class="p-2.5 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-700/60 space-y-1">
										<div class="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
											<span>Sebelum Training (Baseline)</span>
											<span class="material-symbols-outlined text-xs">history</span>
										</div>
										<div class="flex items-baseline gap-1 font-mono">
											<span class="text-base font-black text-on-surface">
												{preVal !== undefined && preVal !== '' ? preVal : '-'}
											</span>
											<span class="text-xs font-semibold text-slate-400">{metric.unit}</span>
										</div>
									</div>

									<!-- Kolom Kanan: Sesudah 3 Bulan (Post-Test Input) -->
									<div class="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
										<div class="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center justify-between">
											<span>Hasil Sesudah (3 Bulan) *</span>
											<span class="material-symbols-outlined text-xs">update</span>
										</div>
										<div class="relative">
											<input
												type="number"
												step="any"
												min="0"
												bind:value={l4PostMetrics[metric.id]}
												required
												placeholder="Masukkan angka..."
												class="w-full px-3 py-1.5 pr-14 rounded-lg bg-surface border border-slate-300 dark:border-slate-600 text-xs font-black text-on-surface font-mono outline-none focus:ring-2 focus:ring-amber-500"
											/>
											<span class="absolute right-3 top-2 text-[11px] font-bold text-slate-400 pointer-events-none">
												{metric.unit}
											</span>
										</div>
									</div>
								</div>

								<!-- Delta Indikator Perubahan -->
								{#if preVal !== undefined && preVal !== '' && postVal !== '' && !isNaN(Number(postVal)) && !isNaN(Number(preVal))}
									{@const diff = Number(postVal) - Number(preVal)}
									<div class="flex items-center gap-1.5 text-[11px] font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
										<span class="text-slate-400">Perubahan:</span>
										<span class="font-mono font-black {diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-blue-500' : 'text-slate-400'}">
											{diff > 0 ? `+${diff}` : diff} {metric.unit}
										</span>
										<span class="text-[10px] text-slate-400">
											(Dari {preVal} menjadi {postVal})
										</span>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Catatan & Rekomendasi Evaluasi Akhir -->
				<div class="space-y-1.5">
					<label class="text-xs font-bold text-on-surface block">
						Rekomendasi / Catatan Evaluasi Dampak Akhir
					</label>
					<textarea
						name="notes"
						bind:value={l4PostNotes}
						rows="2"
						placeholder="Tuliskan evaluasi komprehensif, rekomendasi penugasan baru, atau kelanjutan jenjang karir bawahan..."
						class="w-full p-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-amber-500"
					></textarea>
				</div>

				<div class="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
					<button
						type="button"
						onclick={() => (isL4ModalOpen = false)}
						class="px-4 py-2 rounded-xl bg-surface-container text-xs font-bold hover:bg-surface-container-high cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
					>
						<span class="material-symbols-outlined text-sm">save</span>
						<span>{isSubmitting ? 'Menyimpan...' : 'Simpan Evaluasi Level 4 Post-Test'}</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Form Evaluasi Baseline 3 Bulan Sebelum Training (Level 4 Pre-Test) -->
{#if isL4PreModalOpen && selectedL4PreEval}
	{@const catConfig = preSkillCategoryDefinitions[l4PreSkillCategory] || preSkillCategoryDefinitions['Technical Skill']}
	{@const remaining = getPreRemainingDays(selectedL4PreEval.l4PreDueDate)}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150 my-8 max-h-[92vh] flex flex-col">
			<!-- Header Modal -->
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-indigo-500 text-xl">history_edu</span>
						<h3 class="font-black text-base text-on-surface">Evaluasi Baseline 3 Bulan Pra-Training (Level 4 Pre-Test)</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">
						Data kondisi kerja riil karyawan dalam 3 bulan <em>sebelum</em> mengikuti pelatihan (Tenggat SLA: 10 Hari)
					</p>
				</div>
				<button type="button" onclick={() => (isL4PreModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Body Modal (Scrollable) -->
			<form
				method="POST"
				action="?/submitEvaluationL4PreTest"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							notifySuccess(result.data?.message || 'Evaluasi Level 4 Pre-Test berhasil disimpan!');
							isL4PreModalOpen = false;
						} else {
							notifyError(result.data?.message || 'Gagal menyimpan evaluasi Pre-Test.');
						}
						await update();
					};
				}}
				class="space-y-5 overflow-y-auto pr-1 flex-1"
			>
				<input type="hidden" name="evalId" value={selectedL4PreEval.id} />
				<input type="hidden" name="assessorName" value={currentAssessor?.name || currentUser?.name || 'Supervisor'} />
				<input type="hidden" name="skillCategory" value={l4PreSkillCategory} />
				<input type="hidden" name="metrics" value={JSON.stringify(l4PreMetrics)} />

				<!-- Info Box Karyawan & Training -->
				<div class="p-4 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-2">
					<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
						<div>
							<h4 class="text-sm font-black text-on-surface">{selectedL4PreEval.employeeName}</h4>
							<p class="text-xs font-mono text-on-surface-variant">{selectedL4PreEval.payrollId} • {selectedL4PreEval.positionTitle} ({selectedL4PreEval.department})</p>
						</div>
						<div>
							{#if remaining.isOverdue}
								<span class="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 animate-pulse">
									<span class="material-symbols-outlined text-sm">warning</span>
									<span>Terlambat {remaining.days} Hari</span>
								</span>
							{:else}
								<span class="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">
									<span class="material-symbols-outlined text-sm">schedule</span>
									<span>Sisa {remaining.days} Hari</span>
								</span>
							{/if}
						</div>
					</div>
					<div class="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-2 text-xs">
						<div class="text-primary font-semibold">
							<span class="text-slate-400">Pelatihan:</span> {selectedL4PreEval.courseTitle}
						</div>
						<div class="text-slate-400 font-mono text-[11px]">
							Selesai: <strong class="text-on-surface">{selectedL4PreEval.trainingCompletedAt || '-'}</strong> | Jatuh Tempo: <strong class="text-indigo-600">{selectedL4PreEval.l4PreDueDate || '-'}</strong>
						</div>
					</div>
				</div>

				<!-- Kategori Skill Switcher (4 Tab Kategori Sesuai Spreadsheet) -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<label class="text-xs font-black uppercase tracking-wider text-on-surface">Pilih Kategori Keahlian (Skill Category) *</label>
						<span class="text-[11px] text-slate-400">Pilih kategori yang paling dominan dalam pelatihan ini</span>
					</div>
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{#each (Object.keys(preSkillCategoryDefinitions) as Array<'Technical Skill' | 'Soft Skill' | 'Safety' | 'Hard Skill'>) as catKey}
							{@const itemCat = preSkillCategoryDefinitions[catKey]}
							<button
								type="button"
								onclick={() => (l4PreSkillCategory = catKey)}
								class="p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-start gap-1.5
								{l4PreSkillCategory === catKey
									? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
									: 'bg-surface border-slate-200 dark:border-slate-700 text-on-surface hover:bg-surface-container'}"
							>
								<div class="flex items-center gap-1.5">
									<span class="material-symbols-outlined text-base {l4PreSkillCategory === catKey ? 'text-white' : 'text-indigo-500'}">
										{itemCat.icon}
									</span>
									<span class="text-xs font-black leading-tight">{itemCat.label}</span>
								</div>
								<span class="text-[10px] {l4PreSkillCategory === catKey ? 'text-indigo-100' : 'text-slate-400'} line-clamp-1">
									{itemCat.description}
								</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- 4 Indikator Metrik P1–P4 Sesuai Master Spreadsheet -->
				<div class="space-y-3 p-4 rounded-2xl bg-surface-container-high/60 border border-slate-200/60 dark:border-slate-800/60">
					<div class="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
						<span class="material-symbols-outlined text-indigo-500 text-lg">{catConfig.icon}</span>
						<div>
							<h5 class="text-xs font-black text-on-surface">4 Indikator Pengukuran Baseline: {catConfig.label}</h5>
							<p class="text-[11px] text-slate-400">Kondisi aktual rata-rata dalam rentang 3 bulan <em>sebelum</em> training dimulai.</p>
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
						{#each catConfig.metrics as metric, idx}
							<div class="p-3 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 space-y-1.5">
								<div class="flex items-start justify-between gap-1">
									<label class="text-xs font-bold text-on-surface leading-snug">
										<span class="text-indigo-600 font-mono mr-1">P{idx + 1}.</span> {metric.label}
									</label>
									<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-container text-slate-400 font-mono shrink-0">
										{metric.unit}
									</span>
								</div>
								<p class="text-[10px] text-slate-400 leading-tight">
									{metric.hint}
								</p>
								<div class="relative pt-1">
									<input
										type="number"
										step="any"
										min="0"
										bind:value={l4PreMetrics[metric.id]}
										required
										placeholder={`Angka numerik (contoh: 0, 2, 5.5)...`}
										class="w-full px-3 py-1.5 pr-14 rounded-lg bg-surface-container-low border border-slate-300 dark:border-slate-600 text-xs font-black text-on-surface font-mono outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<span class="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400 pointer-events-none">
										{metric.unit}
									</span>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Catatan Observasi Tambahan -->
				<div class="space-y-1.5">
					<label class="text-xs font-bold text-on-surface block">
						Catatan Observasi Kondisi Pra-Pelatihan (Opsional)
					</label>
					<textarea
						name="notes"
						bind:value={l4PreNotes}
						rows="2"
						placeholder="Uraikan catatan kondisi kerja spesifik karyawan sebelum mengikuti pelatihan ini..."
						class="w-full p-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-indigo-500"
					></textarea>
				</div>

				<!-- Action Buttons -->
				<div class="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
					<button
						type="button"
						onclick={() => (isL4PreModalOpen = false)}
						class="px-4 py-2 rounded-xl bg-surface-container text-xs font-bold hover:bg-surface-container-high cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
					>
						<span class="material-symbols-outlined text-sm">save</span>
						<span>{isSubmitting ? 'Menyimpan Baseline...' : 'Simpan Evaluasi Level 4 Pre-Test'}</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Form Pengajuan Kebutuhan Pelatihan oleh Atasan -->
{#if isTrainingRequestModalOpen}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-xl">post_add</span>
						<h3 class="font-black text-base text-on-surface">Form Pengajuan Pelatihan Tim ke HRD</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">
						Usulkan materi pelatihan yang dibutuhkan bawahan langsung untuk ditinjau HRD
					</p>
				</div>
				<button
					type="button"
					onclick={() => (isTrainingRequestModalOpen = false)}
					class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-on-surface cursor-pointer"
				>
					<span class="material-symbols-outlined text-sm">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/submitTrainingRequest"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							notifySuccess((result.data as any)?.message || 'Usulan pelatihan berhasil dikirimkan ke HRD!');
							isTrainingRequestModalOpen = false;
							await update();
						} else {
							notifyError((result.data as any)?.message || 'Gagal mengirim usulan pelatihan.');
						}
					};
				}}
				class="space-y-4"
			>
				<input type="hidden" name="requestedBy" value={currentAssessor?.name || currentUser?.nama_karyawan || currentUser?.name || 'Supervisor'} />

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pengusul</label>
						<input
							type="text"
							value={currentAssessor?.name || currentUser?.nama_karyawan || currentUser?.name || 'Supervisor'}
							disabled
							class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 cursor-not-allowed"
						/>
					</div>
					<div>
						<label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Departemen *</label>
						<input
							type="text"
							name="deptName"
							bind:value={requestFormDept}
							required
							class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>
				</div>

				<div>
					<label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Judul Pelatihan yang Diusulkan *</label>
					<input
						type="text"
						name="trainingTitle"
						bind:value={requestFormTitle}
						placeholder="Misal: Sertifikasi Operator Forklift / Defensive Driving Euro 4"
						required
						class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kategori Pelatihan</label>
						<select
							name="category"
							bind:value={requestFormCategory}
							class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary font-semibold"
						>
							<option value="Technical Competency">Technical Competency</option>
							<option value="Safety & K3 Compliance">Safety & K3 Compliance</option>
							<option value="Soft Skills & Service">Soft Skills & Service</option>
							<option value="Leadership & SPV">Leadership & SPV</option>
							<option value="Operasional Lapangan">Operasional Lapangan</option>
						</select>
					</div>
					<div>
						<label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tingkat Urgensi</label>
						<select
							name="urgency"
							bind:value={requestFormUrgency}
							class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary font-semibold"
						>
							<option value="NORMAL">NORMAL (Jadwal Reguler)</option>
							<option value="HIGH">HIGH (Mendesak)</option>
							<option value="CRITICAL">CRITICAL (Wajib Segera)</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estimasi Jumlah Peserta *</label>
						<input
							type="number"
							name="estimatedParticipants"
							bind:value={requestFormEstimatedParticipants}
							min="1"
							max="200"
							required
							class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary font-mono font-bold"
						/>
					</div>
					<div>
						<label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Tanggal Selesai</label>
						<input
							type="date"
							name="targetCompletionDate"
							bind:value={requestFormTargetDate}
							class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary font-mono"
						/>
					</div>
				</div>

				<div>
					<label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Justifikasi & Alasan Kebutuhan *</label>
					<textarea
						name="justification"
						bind:value={requestFormJustification}
						rows="3"
						placeholder="Jelaskan kendala di lapangan, gap kompetensi bawahan, atau standar kepatuhan yang memerlukan pelatihan ini..."
						required
						class="w-full p-3 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary"
					></textarea>
				</div>

				<div class="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button
						type="button"
						onclick={() => (isTrainingRequestModalOpen = false)}
						class="px-4 py-2 rounded-xl bg-surface-container text-xs font-bold hover:bg-surface-container-high cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
					>
						<span class="material-symbols-outlined text-sm">send</span>
						<span>{isSubmitting ? 'Mengirim...' : 'Kirim Usulan ke HRD'}</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
