<script lang="ts">
	import { enhance } from '$app/forms';
	import { notifySuccess, notifyError } from '$lib/stores/notifications';

	let { data } = $props();

	// Submission Feedback State
	let isSubmitting = $state(false);
	let notificationAlert = $state<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

	// Derived Data
	const activeAssessors = $derived((data as any).activeAssessors || []);
	const directHierarchy = $derived((data as any).directHierarchy || []);
	const activeEmployees = $derived((data as any).activeEmployees || []);
	const jobStandards = $derived((data as any).jobStandards || []);
	const competencyLibrary = $derived((data as any).competencyLibrary || []);
	const existingAssessments = $derived((data as any).existingAssessments || []);
	const currentYear = new Date().getFullYear();
	const assessmentPeriods = $derived((data as any).assessmentPeriods || [String(currentYear), String(currentYear - 1), String(currentYear - 2)]);
	const currentUser = $derived((data as any).currentUser);

	// State Asesor Terpilih
	// Default ke user login jika ada dan terdaftar sebagai atasan, atau default ke atasan pertama
	let selectedAssessorPayrollId = $state(
		activeAssessors.find((a: any) => a.payrollId === currentUser?.payrollId)?.payrollId ||
		activeAssessors.find((a: any) => a.positionTitle?.toUpperCase().includes('STORAGE') || a.positionTitle?.toUpperCase().includes('SPV'))?.payrollId ||
		(activeAssessors[0]?.payrollId || '')
	);

	const currentAssessor = $derived.by(() => {
		return activeAssessors.find((a: any) => a.payrollId === selectedAssessorPayrollId) || activeAssessors[0] || null;
	});

	// Daftar Jabatan Bawahan Langsung (Strict Direct Subordinates Level 1)
	const directSubordinatePositions = $derived.by(() => {
		if (!currentAssessor) return [];
		const allowedTitles = directHierarchy
			.filter((h: any) => h.titleAtasan === currentAssessor.titleCode)
			.map((h: any) => ({
				code: h.titleBawahan,
				title: h.namaJabatanBawahan
			}));

		// Unikkan berdasarkan code
		const map = new Map<string, string>();
		allowedTitles.forEach((t: any) => map.set(t.code, t.title));
		return Array.from(map.entries()).map(([code, title]) => ({ code, title }));
	});

	// State Jabatan Bawahan yang Sedang Dinilai
	let selectedSubordinateTitleCode = $state('');

	$effect(() => {
		if (directSubordinatePositions.length > 0 && !selectedSubordinateTitleCode) {
			selectedSubordinateTitleCode = directSubordinatePositions[0].code;
		} else if (directSubordinatePositions.length > 0 && !directSubordinatePositions.some((p: any) => p.code === selectedSubordinateTitleCode)) {
			selectedSubordinateTitleCode = directSubordinatePositions[0].code;
		}
	});

	const selectedSubordinatePosition = $derived.by(() => {
		return directSubordinatePositions.find((p: any) => p.code === selectedSubordinateTitleCode) || null;
	});

	// State Periode
	let selectedPeriod = $state(String(new Date().getFullYear()));
	let assessmentNotes = $state('Penilaian berkala bawahan langsung mengacu pada pengamatan kondisi nyata di lapangan.');
	let compSearchQuery = $state('');

	// Kompetensi untuk Jabatan Bawahan yang Dipilih
	const currentCompetencies = $derived.by(() => {
		if (!selectedSubordinatePosition) return [];
		return jobStandards.filter((s: any) =>
			s.positionTitle.toLowerCase() === selectedSubordinatePosition.title.toLowerCase()
		);
	});

	// Karyawan Bawahan Langsung yang Memegang Jabatan Tersebut
	const currentSubordinateEmployees = $derived.by(() => {
		if (!selectedSubordinatePosition) return [];
		return activeEmployees.filter((e: any) => e.titleCode === selectedSubordinatePosition.code);
	});

	// Rating State (Safe Pure Function & Event Handler Mutation)
	let ratingsMap = $state<Record<string, number>>({});

	function getRating(payrollId: string, compCode: string, defaultLevel: number): number {
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
		return defaultLevel;
	}

	function setRating(payrollId: string, compCode: string, level: number) {
		ratingsMap[`${payrollId}_${compCode}`] = level;
	}

	function setAllToTarget(payrollId: string) {
		currentCompetencies.forEach((c: any) => {
			ratingsMap[`${payrollId}_${c.competencyCode}`] = c.requiredLevel;
		});
	}

	// Modal Rubrik Indikator Level 1-5
	let isRubricModalOpen = $state(false);
	let selectedCompForRubric = $state<any>(null);

	// Tab View State: 'form' | 'history'
	let activeViewTab = $state<'form' | 'history'>('form');
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
					<h2 class="text-xl font-black text-on-surface tracking-tight">Team Competency Assessment (Direct Supervisor)</h2>
					<p class="text-xs text-on-surface-variant font-medium">
						Evaluation of direct subordinates (Level 1) based on PT BCS Competency Dictionary
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
				<span class="material-symbols-outlined text-sm">grid_view</span>
				<span>Assessment Grid Form</span>
			</button>
			<button
				type="button"
				onclick={() => (activeViewTab = 'history')}
				class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5
				{activeViewTab === 'history' ? 'bg-primary text-on-primary shadow-xs' : 'text-slate-400 hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">history</span>
				<span>Assessment History ({existingAssessments.length})</span>
			</button>
		</div>
	</div>

	{#if activeViewTab === 'form'}
		<!-- Banner Penegasan Atasan Langsung (Direct Supervisor Rule) -->
		<div class="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 flex items-start gap-3 text-xs">
			<span class="material-symbols-outlined text-indigo-400 text-lg mt-0.5">verified_user</span>
			<div class="space-y-0.5">
				<p class="font-bold text-indigo-300">Ketentuan Penilai: Atasan Langsung (Direct Supervisor)</p>
				<p class="text-slate-400 leading-relaxed">
					Bawahan hanya dapat dinilai oleh atasan langsung pada tingkat 1. Pada jabatan berjenjang (misal Staff di bawah Supervisor, dan Supervisor di bawah Manager), Manager hanya menilai Supervisor, dan Supervisor yang menilai Staff.
				</p>
			</div>
		</div>

		<!-- Panel Parameter & Identifikasi Asesor -->
		<div class="p-6 rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-5 shadow-sm">
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<!-- 1. Pilihan Asesor (Atasan) -->
				<div class="space-y-1.5">
					<label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
						Pilih Atasan Penilai (Asesor) *
					</label>
					<select
						bind:value={selectedAssessorPayrollId}
						class="w-full px-3 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary focus:outline-hidden"
					>
						{#each activeAssessors as a}
							<option value={a.payrollId}>
								{a.name} — {a.positionTitle} ({a.department})
							</option>
						{/each}
					</select>
				</div>

				<!-- 2. Pilihan Jabatan Bawahan Langsung (Strict Direct Subordinates) -->
				<div class="space-y-1.5">
					<label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
						Jabatan Bawahan Langsung *
					</label>
					{#if directSubordinatePositions.length === 0}
						<div class="p-2.5 rounded-xl bg-surface border border-amber-500/30 text-[11px] text-amber-400 font-medium">
							Tidak ada bawahan langsung tercatat untuk jabatan ini.
						</div>
					{:else}
						<select
							bind:value={selectedSubordinateTitleCode}
							class="w-full px-3 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary focus:outline-hidden"
						>
							{#each directSubordinatePositions as p}
								<option value={p.code}>{p.title}</option>
							{/each}
						</select>
					{/if}
				</div>

				<!-- 3. Periode Penilaian -->
				<div class="space-y-1.5">
					<label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
						Assessment Period *
					</label>
					<select
						bind:value={selectedPeriod}
						class="w-full px-3 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary focus:outline-hidden"
					>
						{#each assessmentPeriods as prd}
							<option value={prd}>{prd}</option>
						{/each}
					</select>
				</div>

				<!-- 4. Departemen / Unit Kerja -->
				<div class="space-y-1.5">
					<label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
						Departemen Kerja
					</label>
					<input
						type="text"
						value={currentAssessor?.department || 'Workshop & Maintenance'}
						readonly
						class="w-full px-3 py-2.5 rounded-xl bg-surface-container-high border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-400 cursor-not-allowed"
					/>
				</div>
			</div>

			<!-- Status Info Hierarchy -->
			{#if currentAssessor && selectedSubordinatePosition}
				<div class="pt-3 border-t border-slate-200/40 dark:border-slate-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
					<div class="flex items-center gap-2">
						<span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">
							✓ Valid Direct Supervisor
						</span>
						<span class="text-on-surface-variant font-medium">
							<strong>{currentAssessor.name}</strong> ({currentAssessor.positionTitle}) menilai langsung posisi <strong>{selectedSubordinatePosition.title}</strong>
						</span>
					</div>

					<button
						type="button"
						onclick={() => {
							currentSubordinateEmployees.forEach((emp: any) => setAllToTarget(emp.payrollId));
						}}
						class="px-3 py-1.5 rounded-xl bg-surface-container-highest hover:bg-slate-700 text-on-surface text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700"
					>
						<span class="material-symbols-outlined text-sm text-emerald-400">task_alt</span>
						<span>Set Semua Bawahan ke Target Standar HR</span>
					</button>
				</div>
			{/if}
		</div>

		<!-- Legend Skala 1 s.d. 5 -->
		<div class="p-3.5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
			<div class="flex items-center gap-2 font-bold text-on-surface text-[11px]">
				<span class="material-symbols-outlined text-base text-primary">rubric</span>
				<span>Skala Kemahiran:</span>
			</div>
			<div class="flex items-center gap-2 flex-wrap text-[11px]">
				<span class="px-2 py-0.5 rounded-lg bg-surface border border-slate-700 text-slate-300 font-mono"><strong>1</strong>: SOP Dasar</span>
				<span class="px-2 py-0.5 rounded-lg bg-surface border border-slate-700 text-slate-300 font-mono"><strong>2</strong>: Rutin Mandiri</span>
				<span class="px-2 py-0.5 rounded-lg bg-surface border border-slate-700 text-slate-300 font-mono"><strong>3</strong>: Problem Solving</span>
				<span class="px-2 py-0.5 rounded-lg bg-surface border border-slate-700 text-slate-300 font-mono"><strong>4</strong>: Supervisi & Analisis</span>
				<span class="px-2 py-0.5 rounded-lg bg-surface border border-slate-700 text-slate-300 font-mono"><strong>5</strong>: Inovator / Ahli</span>
			</div>
			<div class="flex items-center gap-3 text-[11px]">
				<span class="flex items-center gap-1 text-emerald-400 font-bold">
					<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
					<span>≥ Target (Qualified)</span>
				</span>
				<span class="flex items-center gap-1 text-rose-400 font-bold">
					<span class="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
					<span>&lt; Target (Gap TNA)</span>
				</span>
			</div>
		</div>

		<!-- Konten Utama: Tabel Matriks Grid Penilaian -->
		{#if !selectedSubordinatePosition}
			<div class="p-12 text-center rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60">
				<p class="text-sm font-bold text-slate-400">Pilih atasan dan jabatan bawahan langsung di atas untuk memulai evaluasi.</p>
			</div>
		{:else if currentCompetencies.length === 0}
			<div class="p-12 text-center rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-3">
				<span class="material-symbols-outlined text-5xl text-slate-400">rule_settings</span>
				<h4 class="font-bold text-base text-on-surface">Belum ada Standar Kompetensi untuk Jabatan ini</h4>
				<p class="text-xs text-on-surface-variant max-w-md mx-auto">
					Tim HR belum menetapkan standar kompetensi untuk posisi "{selectedSubordinatePosition.title}". Standar dapat dikelola di modul LMS.
				</p>
			</div>
		{:else if currentSubordinateEmployees.length === 0}
			<div class="p-12 text-center rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-3">
				<span class="material-symbols-outlined text-5xl text-slate-400">group_off</span>
				<h4 class="font-bold text-base text-on-surface">Tidak ada bawahan aktif pada jabatan ini</h4>
				<p class="text-xs text-on-surface-variant max-w-md mx-auto">
					Tidak ditemukan karyawan aktif yang menjabat sebagai "{selectedSubordinatePosition.title}" di bawah supervisi langsung Anda.
				</p>
			</div>
		{:else}
			<!-- Search Bar Kompetensi -->
			<div class="flex items-center justify-between gap-3">
				<div class="text-xs font-bold text-on-surface">
					Menilai {currentSubordinateEmployees.length} Bawahan Langsung pada {currentCompetencies.length} Unit Kompetensi
				</div>
				<div class="relative w-64">
					<span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
					<input
						type="text"
						bind:value={compSearchQuery}
						placeholder="Cari kompetensi..."
						class="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface focus:outline-hidden"
					/>
				</div>
			</div>

			<!-- Tabel Matriks Grid Kolektif -->
			<div class="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xl bg-surface">
				<div class="overflow-x-auto max-h-[600px]">
					<table class="w-full text-xs text-left border-collapse">
						<thead class="sticky top-0 z-20 bg-surface-container-high border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
							<tr>
								<th class="p-3.5 font-black text-on-surface w-10 text-center border-r border-slate-200/40 dark:border-slate-800/40">#</th>
								<th class="p-3.5 font-black text-on-surface min-w-[260px] border-r border-slate-200/40 dark:border-slate-800/40">
									Unit Kompetensi & Aspek
								</th>
								<th class="p-3.5 font-black text-on-surface text-center w-28 border-r border-slate-200/40 dark:border-slate-800/40">
									Standar HR
								</th>
								{#each currentSubordinateEmployees as emp}
									<th class="p-3.5 font-bold text-on-surface text-center min-w-[190px] border-r border-slate-200/40 dark:border-slate-800/40 last:border-r-0 bg-surface-container/60">
										<div class="space-y-1">
											<div class="font-black text-xs text-on-surface leading-snug">{emp.name}</div>
											<div class="text-[10px] text-slate-400 font-mono">{emp.payrollId}</div>
											<button
												type="button"
												onclick={() => setAllToTarget(emp.payrollId)}
												class="px-2 py-0.5 rounded-md bg-surface-container-highest hover:bg-slate-700 text-[9px] font-bold text-slate-300 transition-all cursor-pointer"
												title="Set semua nilai karyawan ini ke target standar"
											>
												Set Target
											</button>
										</div>
									</th>
								{/each}
							</tr>
						</thead>

						<tbody class="divide-y divide-slate-200/40 dark:divide-slate-800/40">
							{#each currentCompetencies.filter((c: any) => !compSearchQuery || c.competencyName.toLowerCase().includes(compSearchQuery.toLowerCase()) || c.competencyCode.toLowerCase().includes(compSearchQuery.toLowerCase())) as comp, idx}
								{@const compObj = competencyLibrary.find((l: any) => l.code === comp.competencyCode)}
								<tr class="hover:bg-surface-container/30 transition-colors">
									<td class="p-3 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200/40 dark:border-slate-800/40">
										{idx + 1}
									</td>

									<!-- Nama Kompetensi & Tombol Info Rubrik -->
									<td class="p-3 border-r border-slate-200/40 dark:border-slate-800/40">
										<div class="space-y-0.5">
											<div class="flex items-center gap-2">
												<span class="font-mono text-[10px] font-black text-indigo-400">{comp.competencyCode}</span>
												<span class="font-bold text-xs text-on-surface">{comp.competencyName}</span>
												{#if compObj}
													<button
														type="button"
														onclick={() => {
															selectedCompForRubric = compObj;
															isRubricModalOpen = true;
														}}
														class="w-5 h-5 rounded-full bg-surface-container hover:bg-primary/20 hover:text-primary flex items-center justify-center text-slate-400 transition-all cursor-pointer"
														title="Lihat Indikator Level 1 s.d. 5"
													>
														<span class="material-symbols-outlined text-xs">info</span>
													</button>
												{/if}
											</div>
											<div class="text-[10px] text-slate-500 font-medium">
												{comp.competencyAspect || 'Kompetensi Jabatan'}
											</div>
										</div>
									</td>

									<!-- Target Level HR -->
									<td class="p-3 text-center border-r border-slate-200/40 dark:border-slate-800/40">
										<span class="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 inline-block">
											Level {comp.requiredLevel}
										</span>
									</td>

									<!-- Kolom Penilaian Per Bawahan -->
									{#each currentSubordinateEmployees as emp}
										{@const currentVal = getRating(emp.payrollId, comp.competencyCode, comp.requiredLevel)}
										{@const isQualified = currentVal >= comp.requiredLevel}
										<td class="p-2.5 text-center border-r border-slate-200/40 dark:border-slate-800/40 last:border-r-0 {isQualified ? 'bg-emerald-950/5' : 'bg-rose-950/10'}">
											<div class="inline-flex items-center justify-center p-1 rounded-2xl bg-surface-container border {isQualified ? 'border-emerald-500/30' : 'border-rose-500/40'} gap-1 shadow-2xs">
												{#each [1, 2, 3, 4, 5] as lvl}
													<button
														type="button"
														onclick={() => setRating(emp.payrollId, comp.competencyCode, lvl)}
														class="w-6 h-6 rounded-xl font-mono text-[11px] font-black transition-all cursor-pointer flex items-center justify-center
														{currentVal === lvl
															? lvl >= comp.requiredLevel
																? 'bg-emerald-500 text-white shadow-xs scale-105'
																: 'bg-rose-500 text-white shadow-xs scale-105'
															: 'text-slate-400 hover:text-on-surface hover:bg-surface-container-highest'}"
													>
														{lvl}
													</button>
												{/each}
											</div>
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>

						<!-- Summary Realtime Footer -->
						<tfoot class="sticky bottom-0 z-20 bg-surface-container-highest border-t-2 border-slate-700 shadow-md">
							<tr class="font-bold">
								<td colspan="3" class="p-3 text-right text-xs uppercase tracking-wider text-slate-300 border-r border-slate-700">
									Ringkasan Hasil Evaluasi:
								</td>
								{#each currentSubordinateEmployees as emp}
									{@const scores = currentCompetencies.map((c: any) => getRating(emp.payrollId, c.competencyCode, c.requiredLevel))}
									{@const avg = scores.length ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) : 0}
									{@const gaps = currentCompetencies.filter((c: any) => getRating(emp.payrollId, c.competencyCode, c.requiredLevel) < c.requiredLevel).length}
									{@const qual = currentCompetencies.length - gaps}
									<td class="p-2.5 text-center border-r border-slate-700 last:border-r-0">
										<div class="space-y-1">
											<div class="text-xs font-mono font-black text-on-surface">
												Rata-rata: <span class="text-primary">{avg}</span>
											</div>
											<div class="flex items-center justify-center gap-1.5 text-[10px]">
												<span class="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 font-bold">
													{qual} Sesuai
												</span>
												{#if gaps > 0}
													<span class="px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-400 font-black">
														{gaps} Gap TNA
													</span>
												{/if}
											</div>
										</div>
									</td>
								{/each}
							</tr>
						</tfoot>
					</table>
				</div>
			</div>

			<!-- Catatan & Form Submit Batch -->
			<div class="p-6 rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-4">
				<div class="space-y-1">
					<label class="text-xs font-bold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-sm text-primary">notes</span>
						<span>Catatan Observasi Atasan Langsung (Opsional)</span>
					</label>
					<textarea
						bind:value={assessmentNotes}
						rows={3}
						placeholder="Tuliskan catatan pengamatan kerja, kendala operasional, atau area yang perlu ditingkatkan..."
						class="w-full p-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 text-xs text-on-surface focus:ring-2 focus:ring-primary focus:outline-hidden"
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
									notifyError('Submission Failed', msg);
									notificationAlert = {
										type: 'error',
										title: 'Submission Error',
										message: msg
									};
								} else {
									const msg = resData?.message || 'Hasil asesmen bawahan langsung berhasil disimpan ke database!';
									notifySuccess('Assessment Saved', msg);
									notificationAlert = {
										type: 'success',
										title: 'Assessment Saved Successfully',
										message: msg
									};
									await update();
								}
							} else if (result.type === 'failure') {
								const msg = (result.data as any)?.message || 'Gagal menyimpan hasil asesmen. Silakan periksa kembali data Anda.';
								notifyError('Submission Failed', msg);
								notificationAlert = {
									type: 'error',
									title: 'Submission Error',
									message: msg
								};
							} else if (result.type === 'error') {
								const msg = (result.error as any)?.message || 'Terjadi kesalahan sistem saat menyimpan asesmen.';
								notifyError('Server Error', msg);
								notificationAlert = {
									type: 'error',
									title: 'System Error',
									message: msg
								};
							}
						};
					}}
					class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-200/40 dark:border-slate-800/40"
				>
					<input type="hidden" name="assessorName" value={currentAssessor?.name} />
					<input type="hidden" name="period" value={selectedPeriod} />
					<input type="hidden" name="positionTitle" value={selectedSubordinatePosition.title} />
					<input type="hidden" name="department" value={currentAssessor?.department} />
					<input type="hidden" name="notes" value={assessmentNotes} />
					<input
						type="hidden"
						name="evaluations"
						value={JSON.stringify(
							currentSubordinateEmployees.flatMap((emp: any) =>
								currentCompetencies.map((comp: any) => ({
									payrollId: emp.payrollId,
									employeeName: emp.name,
									competencyCode: comp.competencyCode,
									requiredLevel: comp.requiredLevel,
									actualLevel: getRating(emp.payrollId, comp.competencyCode, comp.requiredLevel)
								}))
							)
						)}
					/>

					<div class="text-xs text-slate-400">
						Data tersimpan ke sistem TNA terpusat. Karyawan dengan gap otomatis ditugaskan kursus penunjang.
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						class="px-6 py-3 rounded-2xl bg-primary text-on-primary text-xs font-black shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer self-stretch sm:self-auto"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined text-base animate-spin">progress_activity</span>
							<span>Menyimpan Assessment...</span>
						{:else}
							<span class="material-symbols-outlined text-base">send</span>
							<span>Submit Direct Assessment</span>
						{/if}
					</button>
				</form>
			</div>
		{/if}

	{:else if activeViewTab === 'history'}
		<!-- View Riwayat Asesmen -->
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
							<th class="p-3">Asesor</th>
							<th class="p-3">Tanggal</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each existingAssessments as a}
							<tr class="hover:bg-surface-container/40">
								<td class="p-3 font-mono font-bold text-indigo-400">{a.period}</td>
								<td class="p-3 font-bold text-on-surface">{a.employeeName} ({a.payrollId})</td>
								<td class="p-3 text-slate-400">{a.positionTitle}</td>
								<td class="p-3 font-medium">[{a.competencyCode}] {a.competencyName}</td>
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
								<td class="p-3 text-slate-400">{a.assessorName}</td>
								<td class="p-3 text-slate-500 font-mono text-[10px]">{a.assessmentDate}</td>
							</tr>
						{/each}
					</tbody>
				</table>
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
