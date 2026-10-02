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

		return {
			isAssessed,
			totalRequired: requiredComps.length,
			assessedCount: assessedComps.length,
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

	// Modal Rubrik Indikator Level 1-5
	let isRubricModalOpen = $state(false);
	let selectedCompForRubric = $state<any>(null);

	// Tab View State: 'annual' | 'post_training_l3' | 'post_training_l4' | 'history'
	let activeViewTab = $state<'annual' | 'post_training_l3' | 'post_training_l4' | 'history'>('annual');

	// Data Evaluasi Pasca-Training Kirkpatrick (Level 3 & Level 4)
	const postTrainingEvals = $derived((data as any).postTrainingEvals || []);

	const assessorDirectSubordinateIds = $derived(
		new Set(allDirectSubordinates.map((e: any) => e.payrollId))
	);

	const subordinatePostTrainingEvals = $derived.by(() => {
		if (allDirectSubordinates.length === 0) return postTrainingEvals;
		return postTrainingEvals.filter((e: any) => assessorDirectSubordinateIds.has(e.payrollId));
	});

	// Level 3: Evaluasi Segera Pasca-Training
	const l3PendingEvals = $derived(
		subordinatePostTrainingEvals.filter((e: any) => e.l3Status === 'PENDING')
	);
	const l3CompletedEvals = $derived(
		subordinatePostTrainingEvals.filter((e: any) => e.l3Status === 'COMPLETED')
	);
	const l3PendingCount = $derived(l3PendingEvals.length);

	// Level 4: Evaluasi Dampak Bisnis H+3 Bulan
	const todayDateStr = new Date().toISOString().split('T')[0];
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

	// Modal State Level 3
	let isL3ModalOpen = $state(false);
	let selectedL3Eval = $state<any>(null);
	let l3MaterialScore = $state(4);
	let l3BehaviorScore = $state(4);
	let l3SopScore = $state(4);
	let l3Notes = $state('');

	function openL3Modal(item: any) {
		selectedL3Eval = item;
		l3MaterialScore = item.l3MaterialScore || 4;
		l3BehaviorScore = item.l3BehaviorScore || 4;
		l3SopScore = item.l3SopScore || 4;
		l3Notes = item.l3Notes || '';
		isL3ModalOpen = true;
	}

	// Modal State Level 4
	let isL4ModalOpen = $state(false);
	let selectedL4Eval = $state<any>(null);
	let l4BusinessScore = $state(4);
	let l4ProductivityScore = $state(4);
	let l4IncidentNotes = $state('');
	let l4Notes = $state('');

	function openL4Modal(item: any) {
		selectedL4Eval = item;
		l4BusinessScore = item.l4BusinessScore || 4;
		l4ProductivityScore = item.l4ProductivityScore || 4;
		l4IncidentNotes = item.l4IncidentNotes || '';
		l4Notes = item.l4Notes || '';
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
	const selectedEmployeeIsComplete = $derived(
		selectedEmployeeCompetencies.length > 0 && selectedEmployeeAssessedCount === selectedEmployeeCompetencies.length
	);
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
		<div class="space-y-1">
			<div class="flex items-center gap-2">
				<div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">fact_check</span>
				</div>
				<div>
					<h2 class="text-xl font-black text-on-surface tracking-tight">Penilaian Kompetensi Tim (Atasan Langsung)</h2>
					<p class="text-xs text-on-surface-variant font-medium">
						Evaluasi kemampuan individu bawahan langsung mengacu pada Standar Jabatan & Kamus Kompetensi PT BCS Logistics
					</p>
				</div>
			</div>
		</div>

		<!-- Navigasi 4 Tab Penilaian Atasan -->
		<div class="flex items-center gap-1.5 p-1 rounded-2xl bg-surface-container-high border border-slate-200/60 dark:border-slate-800/60 self-start md:self-auto overflow-x-auto max-w-full">
			<button
				type="button"
				onclick={() => (activeViewTab = 'annual')}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap
				{activeViewTab === 'annual' ? 'bg-primary text-on-primary shadow-xs' : 'text-slate-400 hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">assignment_ind</span>
				<span>1. Asesmen Tahunan (Annual)</span>
			</button>
			<button
				type="button"
				onclick={() => (activeViewTab = 'post_training_l3')}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap
				{activeViewTab === 'post_training_l3' ? 'bg-primary text-on-primary shadow-xs' : 'text-slate-400 hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">school</span>
				<span>2. Pasca-Training Segera (L3)</span>
				{#if l3PendingCount > 0}
					<span class="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white">
						{l3PendingCount}
					</span>
				{/if}
			</button>
			<button
				type="button"
				onclick={() => (activeViewTab = 'post_training_l4')}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap
				{activeViewTab === 'post_training_l4' ? 'bg-primary text-on-primary shadow-xs' : 'text-slate-400 hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">trending_up</span>
				<span>3. Pasca-Training 3 Bulan (L4)</span>
				{#if l4ReadyCount > 0}
					<span class="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white">
						{l4ReadyCount}
					</span>
				{/if}
			</button>
			<button
				type="button"
				onclick={() => (activeViewTab = 'history')}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap
				{activeViewTab === 'history' ? 'bg-primary text-on-primary shadow-xs' : 'text-slate-400 hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">history</span>
				<span>Riwayat Penilaian</span>
			</button>
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

									<!-- Badge Status Asesmen Netral -->
									<div class="shrink-0 text-right">
										{#if status.isAssessed}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase bg-primary/10 text-primary border border-primary/20">
												<span class="material-symbols-outlined text-[11px]">task_alt</span>
												<span>Sudah Dinilai</span>
											</span>
										{:else}
											<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase bg-surface-container-high text-slate-400 border border-slate-200 dark:border-slate-700">
												Belum Dinilai
											</span>
										{/if}
									</div>
								</div>

								<div class="mt-2.5 pt-2 border-t border-slate-100 dark:divide-slate-800/40 flex items-center justify-between text-[10px] text-slate-400">
									<span class="font-semibold truncate max-w-[160px] text-on-surface-variant">
										{emp.positionTitle}
									</span>
									{#if status.isAssessed}
										<span class="font-mono font-bold text-primary">Rata-rata: {status.avgScore}</span>
									{:else}
										<span>{status.totalRequired} Kompetensi</span>
									{/if}
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

							<!-- Action Reset Pengisian -->
							<div class="flex items-center gap-2 self-start sm:self-auto">
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
								<p class="text-[10px] font-bold text-slate-400 uppercase">Status Lembar Evaluasi</p>
								<p class="text-xs font-bold mt-1.5 flex items-center gap-1 {selectedEmployeeIsComplete ? 'text-primary' : 'text-amber-500'}">
									<span class="material-symbols-outlined text-sm">
										{selectedEmployeeIsComplete ? 'check_circle' : 'pending'}
									</span>
									<span>{selectedEmployeeIsComplete ? 'Siap Disimpan' : 'Belum Lengkap'}</span>
								</p>
							</div>
						</div>
					</div>

					<!-- Panduan Skala Kemahiran -->
					<div class="p-3 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-400">
						<span class="font-bold text-on-surface flex items-center gap-1.5 text-[11px]">
							<span class="material-symbols-outlined text-sm text-primary">info</span>
							<span>Leveling: 1 (SOP Dasar) • 2 (Mandiri) • 3 (Problem Solving) • 4 (Supervisi) • 5 (Inovator/Ahli)</span>
						</span>
						<span class="text-[10px] font-semibold text-primary">Klik baris deskripsi level untuk langsung menilai</span>
					</div>

					<!-- Snippet Kartu Evaluasi Kompetensi Objektif (Blind Assessment) -->
					{#snippet competencyCard(comp: any, aspectTitle: string, aspectColor: string)}
						{@const currentVal = getRating(selectedEmployee.payrollId, comp.competencyCode)}

						<div class="p-4 sm:p-5 rounded-3xl border bg-surface border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3.5">
							<!-- Header Kompetensi: Kode, Nama, & Nilai Terpilih -->
							<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
								<div class="space-y-1">
									<div class="flex items-center gap-2 flex-wrap">
										<span class="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-surface-container-high text-primary border border-slate-700/40">
											{comp.competencyCode}
										</span>
										<span class="font-bold text-sm text-on-surface">{comp.competencyName}</span>
									</div>
								</div>

								<!-- Status Nilai Terpilih -->
								<div class="flex items-center gap-2 flex-wrap">
									{#if currentVal > 0}
										<span class="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
											<span class="material-symbols-outlined text-sm">check_circle</span>
											<span>Level {currentVal} Terpilih</span>
										</span>
									{:else}
										<span class="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-surface-container border border-slate-200 dark:border-slate-700 text-slate-400">
											Belum Dinilai
										</span>
									{/if}
								</div>
							</div>

							<!-- 5 Baris Leveling Interaktif (Klik Baris untuk Memilih Nilai Langsung) -->
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
										Pilih Level Perilaku Karyawan:
									</span>
									<span class="text-[10px] text-slate-400 font-medium">Klik pada baris level untuk memberi nilai</span>
								</div>
								
								<div class="grid grid-cols-1 gap-1.5">
									{#each [1, 2, 3, 4, 5] as lvl}
										{@const isSelected = currentVal === lvl}
										{@const desc = getLevelDescription(comp.competencyCode, lvl)}

										<button
											type="button"
											onclick={() => setRating(selectedEmployee.payrollId, comp.competencyCode, lvl)}
											class="w-full text-left p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 group
											{isSelected
												? 'bg-primary/10 border-primary ring-1 ring-primary/30 shadow-xs'
												: 'bg-surface-container-low hover:bg-surface-container-high border-slate-200/60 dark:border-slate-800/60'}"
										>
											<!-- Level Badge Number -->
											<div class="shrink-0 flex items-center justify-center w-7 h-7 rounded-xl font-mono text-xs font-black transition-all
												{isSelected
													? 'bg-primary text-on-primary shadow-xs scale-105'
													: 'bg-surface-container-high text-slate-400 group-hover:text-on-surface'}">
												{lvl}
											</div>

											<!-- Konten Level -->
											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2 flex-wrap mb-0.5">
													<span class="font-bold text-xs {isSelected ? 'text-primary' : 'text-on-surface'}">
														Level {lvl}
													</span>
													{#if isSelected}
														<span class="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-primary">
															<span class="material-symbols-outlined text-xs">check_circle</span>
															<span>Level Terpilih</span>
														</span>
													{/if}
												</div>
												<p class="text-xs {isSelected ? 'text-on-surface font-medium' : 'text-slate-400 group-hover:text-slate-300'} leading-relaxed">
													{desc}
												</p>
											</div>
										</button>
									{/each}
								</div>
							</div>

							<!-- Catatan Observasi Per Butir -->
							<div class="pt-1">
								<label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Catatan Observasi Khusus (Opsional):</label>
								<input
									type="text"
									placeholder="Tuliskan catatan observasi atau bukti perilaku nyata untuk kompetensi ini..."
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
		<!-- TAB 2: PASCA-TRAINING SEGERA (LEVEL 3 KIRKPATRICK)               -->
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
							<h3 class="text-sm font-black text-on-surface">Evaluasi Pasca-Training Segera (Kirkpatrick Level 3: Behavior & Perilaku Kerja)</h3>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white">Fase 1 Pasca-Training</span>
						</div>
						<p class="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-3xl">
							Diisi oleh atasan langsung segera setelah karyawan menyelesaikan sesi pelatihan & mengisi kuesioner reaksi (Level 1). Fokus pada serapan materi pelatihan, kepatuhan SOP baru di tempat kerja, serta kesiapan menerapkan ilmu yang diperoleh.
						</p>
					</div>
				</div>
				<div class="flex items-center gap-3 shrink-0">
					<div class="text-right">
						<div class="text-xs text-on-surface-variant font-medium">Antrean Menunggu Review</div>
						<div class="text-lg font-black text-blue-500">{l3PendingCount} Karyawan</div>
					</div>
				</div>
			</div>

			<!-- Daftar Butuh Penilaian Segera -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-base">pending_actions</span>
						<h4 class="text-xs font-black uppercase tracking-wider text-on-surface">Antrean Butuh Penilaian Segera</h4>
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
							{l3PendingEvals.length} Menunggu
						</span>
					</div>
				</div>

				{#if l3PendingEvals.length === 0}
					<div class="p-8 rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 text-center space-y-2">
						<span class="material-symbols-outlined text-4xl text-emerald-500">task_alt</span>
						<h5 class="text-sm font-black text-on-surface">Semua Karyawan Sudah Dievaluasi Level 3</h5>
						<p class="text-xs text-on-surface-variant max-w-md mx-auto">
							Tidak ada antrean penilaian pasca-training segera yang tertunda untuk bawahan Anda saat ini.
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{#each l3PendingEvals as item}
							<div class="p-5 rounded-3xl bg-surface border border-slate-200/70 dark:border-slate-800/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
								<div class="space-y-3">
									<div class="flex items-start justify-between gap-2">
										<div class="flex items-center gap-3">
											<div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center shrink-0">
												{item.employeeName.charAt(0)}
											</div>
											<div>
												<h5 class="text-xs font-black text-on-surface line-clamp-1">{item.employeeName}</h5>
												<p class="text-[11px] text-on-surface-variant font-mono">{item.payrollId} • {item.positionTitle}</p>
											</div>
										</div>
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 whitespace-nowrap">
											Pending Review
										</span>
									</div>

									<div class="p-3 rounded-2xl bg-surface-container space-y-1.5 border border-slate-200/40 dark:border-slate-800/40">
										<div class="flex items-center justify-between text-[11px]">
											<span class="text-on-surface-variant font-medium">Kursus/Training:</span>
											<span class="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/10 text-indigo-500">{item.courseCategory}</span>
										</div>
										<p class="text-xs font-bold text-on-surface line-clamp-2">{item.courseTitle}</p>
										<div class="flex items-center gap-1.5 text-[10px] text-on-surface-variant pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
											<span class="material-symbols-outlined text-xs">event_available</span>
											<span>Selesai: {item.trainingCompletedAt || '-'}</span>
										</div>
									</div>
								</div>

								<button
									type="button"
									onclick={() => openL3Modal(item)}
									class="w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer"
								>
									<span class="material-symbols-outlined text-sm">rate_review</span>
									<span>Beri Penilaian Level 3</span>
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Riwayat Evaluasi Selesai (Level 3) -->
			<div class="space-y-3 pt-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-500 text-base">check_circle</span>
						<h4 class="text-xs font-black uppercase tracking-wider text-on-surface">Riwayat Penilaian Selesai (Level 3)</h4>
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
										<th class="p-3 text-center">Serapan Materi</th>
										<th class="p-3 text-center">Perilaku</th>
										<th class="p-3 text-center">Kepatuhan SOP</th>
										<th class="p-3">Tgl Review</th>
										<th class="p-3">Catatan Review</th>
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
												<span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-500">
													{item.l3MaterialScore} / 5
												</span>
											</td>
											<td class="p-3 text-center">
												<span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-500">
													{item.l3BehaviorScore} / 5
												</span>
											</td>
											<td class="p-3 text-center">
												<span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-teal-500/10 text-teal-500">
													{item.l3SopScore} / 5
												</span>
											</td>
											<td class="p-3 text-on-surface-variant font-mono text-[11px]">
												{item.l3ReviewedAt || '-'}
											</td>
											<td class="p-3 text-on-surface-variant max-w-xs truncate">
												{item.l3Notes || '-'}
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

	{:else if activeViewTab === 'post_training_l4'}
		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- TAB 3: PASCA-TRAINING 3 BULAN (LEVEL 4 KIRKPATRICK)              -->
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
										<th class="p-3 text-center">Dampak Bisnis</th>
										<th class="p-3 text-center">Produktivitas</th>
										<th class="p-3">Reduksi Insiden/Error</th>
										<th class="p-3">Tgl Review</th>
										<th class="p-3 text-right">Aksi</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
									{#each l4CompletedEvals as item}
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
												<span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600">
													{item.l4BusinessScore} / 5
												</span>
											</td>
											<td class="p-3 text-center">
												<span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600">
													{item.l4ProductivityScore} / 5
												</span>
											</td>
											<td class="p-3 text-on-surface-variant max-w-xs truncate">
												{item.l4IncidentNotes || '-'}
											</td>
											<td class="p-3 text-on-surface-variant font-mono text-[11px]">
												{item.l4ReviewedAt || '-'}
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

<!-- Modal Form Evaluasi Pasca-Training Segera (Level 3) -->
{#if isL3ModalOpen && selectedL3Eval}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-blue-500 text-lg">psychology</span>
						<h3 class="font-black text-base text-on-surface">Penilaian Pasca-Training Segera (Level 3)</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">Evaluasi serapan materi & perilaku kerja awal</p>
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
							notifySuccess(result.data?.message || 'Evaluasi Level 3 berhasil disimpan!');
							isL3ModalOpen = false;
						} else {
							notifyError(result.data?.message || 'Gagal menyimpan evaluasi.');
						}
						await update();
					};
				}}
				class="space-y-4"
			>
				<input type="hidden" name="evalId" value={selectedL3Eval.id} />
				<input type="hidden" name="assessorName" value={currentAssessor?.name || currentUser?.name || 'Supervisor'} />

				<!-- Info Box Karyawan & Kursus -->
				<div class="p-3.5 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-1">
					<div class="flex justify-between items-start">
						<div>
							<h4 class="text-xs font-black text-on-surface">{selectedL3Eval.employeeName}</h4>
							<p class="text-[11px] font-mono text-on-surface-variant">{selectedL3Eval.payrollId} • {selectedL3Eval.positionTitle}</p>
						</div>
						<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-500">
							{selectedL3Eval.courseCategory}
						</span>
					</div>
					<p class="text-xs font-semibold text-primary pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
						{selectedL3Eval.courseTitle}
					</p>
				</div>

				<!-- Butir Penilaian 1: Serapan Materi -->
				<div class="space-y-2">
					<div class="flex justify-between items-center text-xs">
						<span class="font-bold text-on-surface">1. Serapan & Penguasaan Materi</span>
						<span class="font-mono font-black text-blue-500">Skor: {l3MaterialScore} / 5</span>
					</div>
					<p class="text-[11px] text-on-surface-variant">Seberapa baik karyawan memahami konsep teori dan petunjuk teknis yang diajarkan.</p>
					<div class="grid grid-cols-5 gap-1.5">
						{#each [1, 2, 3, 4, 5] as lvl}
							<button
								type="button"
								onclick={() => (l3MaterialScore = lvl)}
								class="py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer
								{l3MaterialScore === lvl ? 'bg-blue-500 text-white border-blue-500 shadow-xs' : 'bg-surface border-slate-200 dark:border-slate-700 text-on-surface hover:bg-surface-container'}"
							>
								{lvl}
							</button>
						{/each}
					</div>
					<input type="hidden" name="materialAbsorptionScore" value={l3MaterialScore} />
				</div>

				<!-- Butir Penilaian 2: Perilaku Kerja -->
				<div class="space-y-2">
					<div class="flex justify-between items-center text-xs">
						<span class="font-bold text-on-surface">2. Perubahan Sikap & Perilaku Kerja</span>
						<span class="font-mono font-black text-blue-500">Skor: {l3BehaviorScore} / 5</span>
					</div>
					<p class="text-[11px] text-on-surface-variant">Inisiatif dan motivasi positif karyawan dalam menerapkan materi di tim kerja.</p>
					<div class="grid grid-cols-5 gap-1.5">
						{#each [1, 2, 3, 4, 5] as lvl}
							<button
								type="button"
								onclick={() => (l3BehaviorScore = lvl)}
								class="py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer
								{l3BehaviorScore === lvl ? 'bg-blue-500 text-white border-blue-500 shadow-xs' : 'bg-surface border-slate-200 dark:border-slate-700 text-on-surface hover:bg-surface-container'}"
							>
								{lvl}
							</button>
						{/each}
					</div>
					<input type="hidden" name="behaviorScore" value={l3BehaviorScore} />
				</div>

				<!-- Butir Penilaian 3: Kepatuhan SOP Baru -->
				<div class="space-y-2">
					<div class="flex justify-between items-center text-xs">
						<span class="font-bold text-on-surface">3. Kepatuhan terhadap SOP Baru / Standar Operasional</span>
						<span class="font-mono font-black text-blue-500">Skor: {l3SopScore} / 5</span>
					</div>
					<p class="text-[11px] text-on-surface-variant">Tingkat disiplin dan konsistensi menerapkan metode kerja baru pasca-training.</p>
					<div class="grid grid-cols-5 gap-1.5">
						{#each [1, 2, 3, 4, 5] as lvl}
							<button
								type="button"
								onclick={() => (l3SopScore = lvl)}
								class="py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer
								{l3SopScore === lvl ? 'bg-blue-500 text-white border-blue-500 shadow-xs' : 'bg-surface border-slate-200 dark:border-slate-700 text-on-surface hover:bg-surface-container'}"
							>
								{lvl}
							</button>
						{/each}
					</div>
					<input type="hidden" name="sopComplianceScore" value={l3SopScore} />
				</div>

				<!-- Catatan Atasan -->
				<div class="space-y-1.5">
					<label class="text-xs font-bold text-on-surface block">Catatan & Arahan Atasan Langsung</label>
					<textarea
						name="notes"
						bind:value={l3Notes}
						rows="3"
						placeholder="Tuliskan catatan observasi awal atau arahan bimbingan pasca-training..."
						class="w-full p-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary"
					></textarea>
				</div>

				<div class="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
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

<!-- Modal Form Evaluasi Pasca-Training 3 Bulan (Level 4) -->
{#if isL4ModalOpen && selectedL4Eval}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-500 text-lg">trending_up</span>
						<h3 class="font-black text-base text-on-surface">Penilaian Dampak Bisnis 3 Bulan (Level 4)</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">Evaluasi hasil nyata & produktivitas kerja setelah masa observasi 3 bulan</p>
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
							notifySuccess(result.data?.message || 'Evaluasi Level 4 berhasil disimpan!');
							isL4ModalOpen = false;
						} else {
							notifyError(result.data?.message || 'Gagal menyimpan evaluasi.');
						}
						await update();
					};
				}}
				class="space-y-4"
			>
				<input type="hidden" name="evalId" value={selectedL4Eval.id} />
				<input type="hidden" name="assessorName" value={currentAssessor?.name || currentUser?.name || 'Supervisor'} />

				<!-- Info Box Karyawan & Kursus -->
				<div class="p-3.5 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-1">
					<div class="flex justify-between items-start">
						<div>
							<h4 class="text-xs font-black text-on-surface">{selectedL4Eval.employeeName}</h4>
							<p class="text-[11px] font-mono text-on-surface-variant">{selectedL4Eval.payrollId} • {selectedL4Eval.positionTitle}</p>
						</div>
						<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600">
							H+90 Hari Observasi
						</span>
					</div>
					<p class="text-xs font-semibold text-primary pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
						{selectedL4Eval.courseTitle}
					</p>
				</div>

				<!-- Butir Penilaian 1: Dampak Efisiensi Bisnis -->
				<div class="space-y-2">
					<div class="flex justify-between items-center text-xs">
						<span class="font-bold text-on-surface">1. Dampak terhadap Efisiensi & Hasil Bisnis Unit Kerja</span>
						<span class="font-mono font-black text-amber-500">Skor: {l4BusinessScore} / 5</span>
					</div>
					<p class="text-[11px] text-on-surface-variant">Penghematan waktu, biaya, atau peningkatan kualitas layanan di departemen.</p>
					<div class="grid grid-cols-5 gap-1.5">
						{#each [1, 2, 3, 4, 5] as lvl}
							<button
								type="button"
								onclick={() => (l4BusinessScore = lvl)}
								class="py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer
								{l4BusinessScore === lvl ? 'bg-amber-500 text-white border-amber-500 shadow-xs' : 'bg-surface border-slate-200 dark:border-slate-700 text-on-surface hover:bg-surface-container'}"
							>
								{lvl}
							</button>
						{/each}
					</div>
					<input type="hidden" name="businessImpactScore" value={l4BusinessScore} />
				</div>

				<!-- Butir Penilaian 2: Peningkatan Produktivitas -->
				<div class="space-y-2">
					<div class="flex justify-between items-center text-xs">
						<span class="font-bold text-on-surface">2. Peningkatan Produktivitas / Output Kerja</span>
						<span class="font-mono font-black text-amber-500">Skor: {l4ProductivityScore} / 5</span>
					</div>
					<p class="text-[11px] text-on-surface-variant">Kecepatan penyelesaian tugas operasional dan pencapaian target kerja bawahan.</p>
					<div class="grid grid-cols-5 gap-1.5">
						{#each [1, 2, 3, 4, 5] as lvl}
							<button
								type="button"
								onclick={() => (l4ProductivityScore = lvl)}
								class="py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer
								{l4ProductivityScore === lvl ? 'bg-amber-500 text-white border-amber-500 shadow-xs' : 'bg-surface border-slate-200 dark:border-slate-700 text-on-surface hover:bg-surface-container'}"
							>
								{lvl}
							</button>
						{/each}
					</div>
					<input type="hidden" name="productivityScore" value={l4ProductivityScore} />
				</div>

				<!-- Butir Penilaian 3: Penurunan Insiden / Kesalahan Kerja -->
				<div class="space-y-1.5">
					<label class="text-xs font-bold text-on-surface block">3. Reduksi Insiden, Kerusakan, atau Kesalahan Kerja (Opsional)</label>
					<textarea
						name="incidentReductionNotes"
						bind:value={l4IncidentNotes}
						rows="2"
						placeholder="Contoh: Mengurangi kesalahan salah hitung stok di gudang, komplain pelanggan berkurang 50%..."
						class="w-full p-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary"
					></textarea>
				</div>

				<!-- Catatan Jangka Panjang -->
				<div class="space-y-1.5">
					<label class="text-xs font-bold text-on-surface block">Rekomendasi / Catatan Evaluasi Akhir</label>
					<textarea
						name="notes"
						bind:value={l4Notes}
						rows="2"
						placeholder="Tuliskan rekomendasi jenjang karir, penugasan proyek baru, atau evaluasi akhir..."
						class="w-full p-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary"
					></textarea>
				</div>

				<div class="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
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
						<span>{isSubmitting ? 'Menyimpan...' : 'Simpan Evaluasi Level 4'}</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
