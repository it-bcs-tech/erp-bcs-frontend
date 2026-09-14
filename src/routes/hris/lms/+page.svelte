<script lang="ts">
	import { enhance } from '$app/forms';
	import { spawnToast } from '$lib/stores/notifications';
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

	// Tabs State (5 Tab Utama)
	type TabType = 'catalog' | 'sessions' | 'evaluations' | 'safety_tna' | 'reports';
	let activeTab = $state<TabType>('catalog');
	const tabs = [
		{ id: 'catalog', label: 'Katalog & Kursus', icon: 'auto_stories' },
		{ id: 'sessions', label: 'Sesi Training & Absensi', icon: 'event_available' },
		{ id: 'evaluations', label: 'Evaluasi Kirkpatrick', icon: 'rate_review' },
		{ id: 'safety_tna', label: 'Safety & TNA', icon: 'health_and_safety' },
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

	// Report Sub-tabs (Spreadsheet Master Specification: Sheet 306150899)
	type ReportType = 'training' | 'course' | 'attendance' | 'assessment' | 'competency_gap' | 'certificates';
	let activeReportType = $state<ReportType>('training');
	let reportSearchQuery = $state('');
	let reportFilterDept = $state('All');
	let reportFilterBased = $state('All');

	// Modals State
	let isCreateModalOpen = $state(false);
	let isPlayerModalOpen = $state(false);
	let isSessionModalOpen = $state(false);
	let isAttendanceModalOpen = $state(false);
	let isEvalSupervisorModalOpen = $state(false);
	let isRequestModalOpen = $state(false);
	let isSafetyTestModalOpen = $state(false);
	let isCertModalOpen = $state(false);

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

	// Filtered Questions for Active Course
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
			if (postTestAnswered[q.id] === q.correctKey) {
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
				onclick={() => isCreateModalOpen = true}
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

			<!-- TAB 4: SAFETY K3 & TRAINING NEED ANALYSIS (TNA) -->
			{:else if activeTab === 'safety_tna'}
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
							onclick={() => isSafetyTestModalOpen = true}
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
								onclick={() => isRequestModalOpen = true}
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

					<!-- Panel 3: TNA Matrix -->
					<div class="space-y-3 pt-2">
						<h4 class="font-black text-sm text-on-surface uppercase tracking-wider">Matrix Training Need Analysis (TNA) & Competency Gap</h4>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each tnaMatrix as roleGroup}
								<div class="p-4 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 space-y-3">
									<div class="border-b border-slate-200 dark:border-slate-800 pb-2">
										<h5 class="font-black text-sm text-on-surface">{roleGroup.role}</h5>
										<p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{roleGroup.department}</p>
									</div>

									<div class="space-y-2 text-xs">
										{#each roleGroup.competencies as comp}
											<div class="p-2.5 rounded-xl bg-surface-container-high/60 flex items-center justify-between gap-3">
												<div class="space-y-0.5">
													<p class="font-bold text-on-surface">{comp.name}</p>
													<p class="text-[10px] text-slate-500">Target: {comp.requiredScore} | Aktual: <strong class="text-on-surface">{comp.actualScore}</strong></p>
												</div>

												<span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase
													{comp.status === 'Qualified' ? 'bg-emerald-100 text-emerald-800' :
													comp.status === 'Need Training' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}">
													{comp.status}
												</span>
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
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
									<h4 class="font-bold text-xs text-on-surface uppercase tracking-wider">Laporan Hasil Asesmen & Ujian (Assessment Report)</h4>
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
									<p class="font-bold text-sm text-on-surface">{idx + 1}. {q.questionText}</p>
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

								<!-- Player Window Mockup -->
								{#if currentModule.type === 'VIDEO'}
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
									<p class="font-bold text-sm text-on-surface">{idx + 1}. {q.questionText}</p>
									<div class="space-y-2">
										{#each q.options as opt}
											<label class="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-surface-container-high cursor-pointer">
												<input
													type="radio"
													name={`post_${q.id}`}
													value={opt.key}
													bind:group={postTestAnswered[q.id]}
													class="text-primary focus:ring-primary"
												/>
												<span class="text-xs text-on-surface"><strong>{opt.key}.</strong> {opt.text}</span>
											</label>
										{/each}
									</div>
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
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<h3 class="font-black text-base text-on-surface">Tambah Kursus Baru ke Katalog</h3>
					<p class="text-[11px] text-slate-500">Standarisasi kurikulum LMS PT Buana Centra Swakarsa 2026</p>
				</div>
				<button type="button" onclick={() => (isCreateModalOpen = false)} class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/createCourse" use:enhance class="space-y-3.5 text-xs overflow-y-auto pr-1">
				<div>
					<label class="font-bold text-on-surface block mb-1">Judul Kursus Pelatihan *</label>
					<input type="text" name="title" required placeholder="Contoh: Defensive Driving Angkutan Berat..." class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface focus:ring-1 focus:ring-primary" />
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
						<select name="trainerType" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface">
							<option value="Internal">Internal PT BCS (Rp500.000)</option>
							<option value="Eksternal">Eksternal / Vendor Resmi (Rp2.500.000 - Rp3.000.000)</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="font-bold text-on-surface block mb-1">Departemen Target</label>
						<select name="department" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface">
							<option value="All Dept">All Dept (Seluruh Departemen)</option>
							<option value="Operations">Operations</option>
							<option value="Project 4">Project 4</option>
							<option value="Driver">Driver & Armada</option>
							<option value="Transport (Maintenance & Asset)">Transport (Maintenance & Asset)</option>
							<option value="Labour Project 1">Labour Project 1</option>
							<option value="QHSE & Safety">QHSE & Safety</option>
							<option value="Finance & Accounting">Finance & Accounting</option>
							<option value="General Affairs">General Affairs</option>
						</select>
					</div>

					<div>
						<label class="font-bold text-on-surface block mb-1">Biaya Trainer (IDR)</label>
						<input type="number" name="costTrainer" value="500000" step="50000" class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 font-mono text-xs" />
					</div>
				</div>

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

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => (isCreateModalOpen = false)} class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-surface-container cursor-pointer">
						Batal
					</button>
					<button type="submit" class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1 shadow-sm cursor-pointer">
						<span class="material-symbols-outlined text-sm">save</span>
						<span>Simpan ke Database</span>
					</button>
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
