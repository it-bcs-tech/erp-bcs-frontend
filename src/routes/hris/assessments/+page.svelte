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

	function getRating(payrollId: string, compCode: string, defaultTargetLevel: number): number {
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
		return defaultTargetLevel;
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

	function setAllToTargetForSelected() {
		if (!selectedEmployee) return;
		selectedEmployeeCompetencies.forEach((c: any) => {
			ratingsMap[`${selectedEmployee.payrollId}_${c.competencyCode}`] = c.requiredLevel;
		});
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

	// Tab View State: 'form' | 'history'
	let activeViewTab = $state<'form' | 'history'>('form');

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

	// Derived metrics untuk Progress Tim & Realtime Evaluasi Karyawan Terpilih
	const totalTeam = $derived(allDirectSubordinates.length);
	const assessedTeamCount = $derived(
		allDirectSubordinates.filter((e: any) => getEmployeeAssessmentStatus(e.payrollId, e.positionTitle).isAssessed).length
	);

	const selectedEmployeeRatings = $derived(
		selectedEmployee
			? selectedEmployeeCompetencies.map((c: any) => getRating(selectedEmployee.payrollId, c.competencyCode, c.requiredLevel))
			: []
	);
	const selectedEmployeeAvg = $derived(
		selectedEmployeeRatings.length
			? (selectedEmployeeRatings.reduce((a: number, b: number) => a + b, 0) / selectedEmployeeRatings.length).toFixed(1)
			: '0'
	);
	const selectedEmployeeGaps = $derived(
		selectedEmployee
			? selectedEmployeeCompetencies.filter((c: any) => getRating(selectedEmployee.payrollId, c.competencyCode, c.requiredLevel) < c.requiredLevel).length
			: 0
	);
	const selectedEmployeeQualified = $derived(
		selectedEmployeeCompetencies.length - selectedEmployeeGaps
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

		<!-- Navigasi Tab Form vs Riwayat -->
		<div class="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-high border border-slate-200/60 dark:border-slate-800/60 self-start md:self-auto">
			<button
				type="button"
				onclick={() => (activeViewTab = 'form')}
				class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
				{activeViewTab === 'form' ? 'bg-primary text-on-primary shadow-xs' : 'text-slate-400 hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">assignment_ind</span>
				<span>Lembar Penilaian Individu</span>
			</button>
			<button
				type="button"
				onclick={() => (activeViewTab = 'history')}
				class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
				{activeViewTab === 'history' ? 'bg-primary text-on-primary shadow-xs' : 'text-slate-400 hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">history</span>
				<span>Riwayat Asesmen ({existingAssessments.length})</span>
			</button>
		</div>
	</div>

	{#if activeViewTab === 'form'}
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
										{#if status.isAssessed}
											{#if status.gapsCount === 0}
												<span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
													<span class="material-symbols-outlined text-[11px]">check_circle</span>
													<span>Lulus</span>
												</span>
											{:else}
												<span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
													<span class="material-symbols-outlined text-[11px]">warning</span>
													<span>{status.gapsCount} GAP</span>
												</span>
											{/if}
										{:else}
											<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
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

							<!-- Action Cepat Set Target -->
							<div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
								<button
									type="button"
									onclick={setAllToTargetForSelected}
									class="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
									title="Set semua nilai ke target standar HR"
								>
									<span class="material-symbols-outlined text-sm">task_alt</span>
									<span>Set Semua Target</span>
								</button>

								<button
									type="button"
									onclick={resetRatingsForSelected}
									class="px-2.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-slate-400 hover:text-on-surface text-xs font-bold transition-all cursor-pointer"
									title="Reset pengisian kembali ke awal"
								>
									<span class="material-symbols-outlined text-sm">restart_alt</span>
								</button>
							</div>
						</div>

						<!-- Realtime Calculation Metrics Bar -->
						<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-200/40 dark:border-slate-800/40 text-xs">
							<div class="p-2.5 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60">
								<p class="text-[10px] font-bold text-slate-400 uppercase">Total Kompetensi</p>
								<p class="text-base font-black text-on-surface mt-0.5 font-mono">{selectedEmployeeCompetencies.length} Unit</p>
							</div>
							<div class="p-2.5 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60">
								<p class="text-[10px] font-bold text-slate-400 uppercase">Rata-rata Skor</p>
								<p class="text-base font-black text-primary mt-0.5 font-mono">{selectedEmployeeAvg} <span class="text-xs text-slate-400">/ 5</span></p>
							</div>
							<div class="p-2.5 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60">
								<p class="text-[10px] font-bold text-emerald-500 uppercase">Memenuhi Syarat</p>
								<p class="text-base font-black text-emerald-500 mt-0.5 font-mono">{selectedEmployeeQualified} Unit</p>
							</div>
							<div class="p-2.5 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60">
								<p class="text-[10px] font-bold text-rose-500 uppercase">Kesenjangan (GAP)</p>
								<p class="text-base font-black text-rose-500 mt-0.5 font-mono">{selectedEmployeeGaps} Unit</p>
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

					<!-- Snippet Kartu Evaluasi Kompetensi Interaktif -->
					{#snippet competencyCard(comp: any, aspectTitle: string, aspectColor: string)}
						{@const currentVal = getRating(selectedEmployee.payrollId, comp.competencyCode, comp.requiredLevel)}
						{@const gap = currentVal - comp.requiredLevel}
						{@const isQualified = gap >= 0}
						{@const compObj = competencyLibrary.find((l: any) => l.code === comp.competencyCode)}

						<div class="p-4 sm:p-5 rounded-3xl border transition-all {isQualified ? 'bg-surface border-slate-200/80 dark:border-slate-800/80 shadow-xs' : 'bg-rose-500/[0.03] border-rose-500/30'} space-y-3.5">
							<!-- Header Kompetensi: Kode, Nama, Target, & Nilai Aktif -->
							<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
								<div class="space-y-1">
									<div class="flex items-center gap-2 flex-wrap">
										<span class="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-surface-container-high text-primary border border-slate-700/40">
											{comp.competencyCode}
										</span>
										<span class="font-bold text-sm text-on-surface">{comp.competencyName}</span>
									</div>
								</div>

								<!-- Status Target & Skor Aktif Realtime -->
								<div class="flex items-center gap-2 flex-wrap">
									<span class="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-surface-container border border-slate-200 dark:border-slate-700 text-slate-400">
										Target: <strong class="text-on-surface font-mono">Level {comp.requiredLevel}</strong>
									</span>
									<span class="px-2.5 py-1 rounded-xl text-[11px] font-black uppercase flex items-center gap-1.5 {isQualified ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}">
										<span class="material-symbols-outlined text-sm">
											{isQualified ? 'check_circle' : 'warning'}
										</span>
										<span>Nilai: L{currentVal} ({isQualified ? (gap > 0 ? `+${gap} Melebihi` : 'Sesuai Standar') : `${gap} GAP`})</span>
									</span>
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
										{@const isTarget = comp.requiredLevel === lvl}
										{@const isPassing = lvl >= comp.requiredLevel}
										{@const desc = getLevelDescription(comp.competencyCode, lvl)}

										<button
											type="button"
											onclick={() => setRating(selectedEmployee.payrollId, comp.competencyCode, lvl)}
											class="w-full text-left p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 group
											{isSelected
												? isPassing
													? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/30 shadow-xs'
													: 'bg-rose-500/10 border-rose-500 ring-1 ring-rose-500/30 shadow-xs'
												: 'bg-surface-container-low hover:bg-surface-container-high border-slate-200/60 dark:border-slate-800/60'}"
										>
											<!-- Level Badge Number -->
											<div class="shrink-0 flex items-center justify-center w-7 h-7 rounded-xl font-mono text-xs font-black transition-all
												{isSelected
													? isPassing
														? 'bg-emerald-500 text-white shadow-xs scale-105'
														: 'bg-rose-500 text-white shadow-xs scale-105'
													: 'bg-surface-container-high text-slate-400 group-hover:text-on-surface'}">
												{lvl}
											</div>

											<!-- Konten Level & Indikator Target -->
											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2 flex-wrap mb-0.5">
													<span class="font-bold text-xs {isSelected ? (isPassing ? 'text-emerald-500' : 'text-rose-500') : 'text-on-surface'}">
														Level {lvl}
													</span>
													{#if isTarget}
														<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
															Standar Jabatan
														</span>
													{/if}
													{#if isSelected}
														<span class="ml-auto inline-flex items-center gap-1 text-[10px] font-bold {isPassing ? 'text-emerald-500' : 'text-rose-500'}">
															<span class="material-symbols-outlined text-xs">
																{isPassing ? 'task_alt' : 'error'}
															</span>
															<span>{isPassing ? 'Terpilih (Lulus)' : 'Terpilih (GAP)'}</span>
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

							<!-- Rekomendasi Modul Pelatihan jika GAP < 0 -->
							{#if !isQualified}
								<div class="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-400">
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-lg text-rose-500">school</span>
										<span>Rekomendasi Pelatihan LMS: <strong class="text-rose-300">{comp.defaultCourseTitle || 'Pelatihan Penguatan Kompetensi'}</strong></span>
									</div>
									<span class="text-[10px] font-bold text-rose-300 px-2 py-0.5 rounded bg-rose-500/20 self-start sm:self-auto">
										Auto-Assign TNA
									</span>
								</div>
							{/if}

							<!-- Catatan Observasi Per Butir -->
							<div class="pt-1">
								<label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Catatan Observasi Khusus:</label>
								<input
									type="text"
									placeholder="Tuliskan catatan observasi atau bukti kinerja nyata untuk kompetensi ini..."
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
										actualLevel: getRating(selectedEmployee.payrollId, comp.competencyCode, comp.requiredLevel),
										notes: getNote(selectedEmployee.payrollId, comp.competencyCode)
									}))
								)}
							/>

							<div class="text-[11px] text-slate-400 font-medium">
								Penilaian langsung tersimpan ke sistem TNA. Jika terdapat GAP, karyawan otomatis direkomendasikan materi pelatihan terkait.
							</div>

							<button
								type="submit"
								disabled={isSubmitting}
								class="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer self-stretch sm:self-auto"
							>
								{#if isSubmitting}
									<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
									<span>Menyimpan Asesmen...</span>
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
								<th class="p-3 text-center">Standar</th>
								<th class="p-3 text-center">Aktual</th>
								<th class="p-3 text-center">GAP</th>
								<th class="p-3">Status</th>
								<th class="p-3">Catatan Observasi</th>
								<th class="p-3">Asesor</th>
								<th class="p-3">Tanggal</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
							{#each filteredHistory as a}
								<tr class="hover:bg-surface-container/40">
									<td class="p-3 font-mono font-bold text-indigo-400">{a.period}</td>
									<td class="p-3">
										<p class="font-bold text-on-surface">{a.employeeName}</p>
										<p class="font-mono text-[10px] text-slate-400">{a.payrollId}</p>
									</td>
									<td class="p-3 text-slate-400">{a.positionTitle}</td>
									<td class="p-3 font-medium">
										<span class="font-mono text-[10px] font-bold text-primary mr-1">[{a.competencyCode}]</span>
										<span>{a.competencyName}</span>
									</td>
									<td class="p-3 text-center font-mono">L{a.requiredLevel}</td>
									<td class="p-3 text-center font-mono font-black">L{a.actualLevel}</td>
									<td class="p-3 text-center font-mono font-black {a.gap < 0 ? 'text-rose-500' : 'text-emerald-500'}">
										{a.gap > 0 ? `+${a.gap}` : a.gap}
									</td>
									<td class="p-3">
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold {a.status === 'Qualified' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}">
											{a.status}
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
									<td colspan="11" class="p-8 text-center text-slate-400">
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
