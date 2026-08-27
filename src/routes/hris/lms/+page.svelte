<script lang="ts">
	import { enhance } from '$app/forms';
	import { spawnToast } from '$lib/stores/notifications';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const { metrics, courses, learningPaths, trainingMatrix, myLearning, dataSource } = data;

	// Tabs State
	let activeTab = $state<'catalog' | 'my-learning' | 'paths' | 'matrix'>('catalog');
	const tabs = [
		{ id: 'catalog', label: 'Katalog Kursus', icon: 'auto_stories' },
		{ id: 'my-learning', label: 'Portal Belajar Saya', icon: 'school' },
		{ id: 'paths', label: 'Learning Paths', icon: 'route' },
		{ id: 'matrix', label: 'Training Matrix & K3', icon: 'table_chart' }
	];

	// Filter & Search State
	let searchQuery = $state('');
	let selectedCategory = $state('All');
	const categories = ['All', 'Operations', 'QHSE & Safety', 'Technical', 'Digital Systems', 'Leadership'];

	// Modals State
	let isCreateModalOpen = $state(false);
	let isPlayerModalOpen = $state(false);
	let isCertModalOpen = $state(false);
	let activeCourseForPlayer = $state<any>(null);
	let activeCertData = $state<any>(null);
	let activeModuleIndex = $state(0);
	let activeQuizSubmitted = $state(false);
	let quizAnswers = $state<Record<number, string>>({});

	// Filtered Courses in Catalog
	let filteredCourses = $derived(
		(courses || []).filter((c: any) => {
			const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
			if (!matchesCategory) return false;
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				c.title.toLowerCase().includes(q) ||
				c.description.toLowerCase().includes(q) ||
				c.instructor.toLowerCase().includes(q) ||
				(c.tags || []).some((t: string) => t.toLowerCase().includes(q))
			);
		})
	);

	// Filtered My Learning
	let filteredMyLearning = $derived(
		(myLearning || []).filter((m: any) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
		})
	);

	function openCoursePlayer(course: any) {
		activeCourseForPlayer = course;
		activeModuleIndex = 0;
		activeQuizSubmitted = false;
		quizAnswers = {};
		isPlayerModalOpen = true;
	}

	function openCertificate(item: any) {
		activeCertData = item;
		isCertModalOpen = true;
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
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="w-10 h-10 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-xs">
					<span class="material-symbols-outlined text-2xl">school</span>
				</div>
				<div>
					<h1 class="text-2xl font-black text-on-surface tracking-tight">BCS Learning Management System (LMS)</h1>
					<p class="text-on-surface-variant font-medium text-xs mt-0.5">
						Portal Pelatihan Digital, Jalur Kompetensi Karyawan, Sertifikasi & Kepatuhan K3 Transportasi
					</p>
				</div>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full {dataSource === 'laravel' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-primary-container/40 text-primary'}">
				<span class="w-1.5 h-1.5 rounded-full {dataSource === 'laravel' ? 'bg-emerald-500' : 'bg-primary'}"></span>
				{dataSource === 'laravel' ? 'Laravel API Sync' : 'Enterprise Engine'}
			</span>

			<button 
				type="button"
				class="bg-primary text-on-primary px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 hover:bg-primary/90 transition-all cursor-pointer active:scale-95"
				onclick={() => isCreateModalOpen = true}
			>
				<span class="material-symbols-outlined text-lg">add_circle</span>
				<span>Tambah Kursus Baru</span>
			</button>
		</div>
	</header>

	<!-- Top Metric KPI Cards -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
			<div>
				<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Kursus</p>
				<h3 class="text-2xl font-black text-on-surface">{metrics.totalCourses} Modul</h3>
			</div>
			<div class="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
				<span class="material-symbols-outlined text-2xl">menu_book</span>
			</div>
		</div>

		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
			<div>
				<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Peserta Aktif</p>
				<h3 class="text-2xl font-black text-on-surface">{metrics.activeLearners} Orang</h3>
			</div>
			<div class="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
				<span class="material-symbols-outlined text-2xl">groups</span>
			</div>
		</div>

		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
			<div>
				<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Kepatuhan Wajib K3</p>
				<div class="flex items-baseline gap-1.5">
					<h3 class="text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.complianceRate}%</h3>
					<span class="text-[10px] font-bold text-emerald-600">Optimal</span>
				</div>
			</div>
			<div class="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
				<span class="material-symbols-outlined text-2xl">verified</span>
			</div>
		</div>

		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
			<div>
				<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Rata-rata Skor Kuis</p>
				<h3 class="text-2xl font-black text-primary">{metrics.avgQuizScore} / 100</h3>
			</div>
			<div class="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
				<span class="material-symbols-outlined text-2xl">workspace_premium</span>
			</div>
		</div>
	</div>

	<!-- Segmented Control Tabs & Filter Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
		<!-- Tabs -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
			{#each tabs as t}
				<button 
					class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer {activeTab === t.id ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => activeTab = t.id as any}
				>
					<span class="material-symbols-outlined text-base">{t.icon}</span>
					<span>{t.label}</span>
				</button>
			{/each}
		</div>

		<!-- Search & Category Filters -->
		<div class="flex items-center gap-3 w-full md:w-auto">
			{#if activeTab === 'catalog'}
				<select 
					bind:value={selectedCategory} 
					class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
				>
					{#each categories as cat}
						<option value={cat}>{cat}</option>
					{/each}
				</select>
			{/if}

			<div class="relative w-full md:w-64 flex-shrink-0">
				<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
				<input 
					type="text" 
					bind:value={searchQuery}
					placeholder="Cari materi, instruktur, topik..." 
					class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
				/>
			</div>
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="flex-1">
		<!-- TAB 1: KATALOG KURSUS -->
		{#if activeTab === 'catalog'}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each filteredCourses as course}
					<div class="bg-surface-container-lowest border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-300 group">
						<div>
							<!-- Header Tag & Level -->
							<div class="flex items-center justify-between mb-3.5">
								<span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider {course.category === 'Operations' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : course.category === 'QHSE & Safety' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : course.category === 'Technical' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'}">
									{course.category}
								</span>
								<span class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
									<span class="material-symbols-outlined text-sm">star</span>
									{course.rating}
								</span>
							</div>

							<h3 class="font-extrabold text-base text-on-surface group-hover:text-primary transition-colors line-clamp-2 mb-2">
								{course.title}
							</h3>
							<p class="text-xs text-on-surface-variant line-clamp-3 leading-relaxed mb-4">
								{course.description}
							</p>

							<!-- Course Meta -->
							<div class="grid grid-cols-3 gap-2 py-3 px-3.5 bg-surface-container-low rounded-2xl text-[11px] font-semibold text-on-surface-variant mb-4">
								<div class="flex items-center gap-1.5">
									<span class="material-symbols-outlined text-sm text-primary">schedule</span>
									<span>{Math.round(course.durationMinutes / 60)} Jam</span>
								</div>
								<div class="flex items-center gap-1.5">
									<span class="material-symbols-outlined text-sm text-primary">layers</span>
									<span>{course.modulesCount} Bab</span>
								</div>
								<div class="flex items-center gap-1.5">
									<span class="material-symbols-outlined text-sm text-primary">person</span>
									<span>{course.enrolledCount} Siswa</span>
								</div>
							</div>
						</div>

						<div class="pt-2 border-t border-surface-container flex items-center justify-between gap-3">
							<div class="flex items-center gap-2">
								<div class="w-7 h-7 rounded-full bg-primary-container text-on-primary-container font-black text-xs flex items-center justify-center">
									{course.instructor[0]}
								</div>
								<span class="text-[11px] font-bold text-on-surface-variant truncate max-w-[130px]">{course.instructor}</span>
							</div>

							<button 
								type="button"
								class="bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
								onclick={() => openCoursePlayer(course)}
							>
								<span>Buka Materi</span>
								<span class="material-symbols-outlined text-sm">play_arrow</span>
							</button>
						</div>
					</div>
				{/each}
			</div>

		<!-- TAB 2: PORTAL BELAJAR SAYA (MY LEARNING) -->
		{:else if activeTab === 'my-learning'}
			<div class="space-y-4">
				{#each filteredMyLearning as item}
					<div class="bg-surface-container-lowest border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
						<div class="flex-1 space-y-2">
							<div class="flex items-center gap-3">
								<span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-primary-container/50 text-primary">
									{item.category}
								</span>
								<span class="text-xs font-semibold text-on-surface-variant">Tenggat: {item.deadline}</span>
								<span class="text-xs font-medium text-on-surface-variant">• Terakhir diakses: {item.lastAccessed}</span>
							</div>
							
							<h3 class="text-lg font-extrabold text-on-surface">{item.title}</h3>
							
							<div class="flex items-center gap-4 pt-2">
								<div class="w-full max-w-md bg-surface-container rounded-full h-2.5 overflow-hidden">
									<div class="bg-primary h-full rounded-full transition-all duration-500" style="width: {item.progress}%"></div>
								</div>
								<span class="text-xs font-black text-on-surface">{item.progress}% Selesai ({item.completedModules}/{item.totalModules} Bab)</span>
							</div>
						</div>

						<div class="flex items-center gap-3 flex-shrink-0">
							{#if item.hasCertificate}
								<button 
									type="button"
									onclick={() => openCertificate(item)}
									class="border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
								>
									<span class="material-symbols-outlined text-base">verified</span>
									<span>Lihat Sertifikat</span>
								</button>
							{/if}

							<button 
								type="button"
								onclick={() => {
									const c = courses.find((x: any) => x.id === item.courseId) || courses[0];
									openCoursePlayer(c);
								}}
								class="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:bg-primary/90 transition-all flex items-center gap-2 cursor-pointer"
							>
								<span>{item.progress === 100 ? 'Review Materi' : 'Lanjutkan Belajar'}</span>
								<span class="material-symbols-outlined text-base">arrow_forward</span>
							</button>
						</div>
					</div>
				{/each}
			</div>

		<!-- TAB 3: LEARNING PATHS -->
		{:else if activeTab === 'paths'}
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				{#each learningPaths as path}
					<div class="bg-surface-container-lowest border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
						<div>
							<div class="w-12 h-12 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center mb-4">
								<span class="material-symbols-outlined text-2xl">route</span>
							</div>
							<span class="text-[10px] font-black uppercase tracking-widest text-primary mb-1 block">Jalur Jabatan</span>
							<h3 class="text-base font-extrabold text-on-surface mb-2">{path.title}</h3>
							<p class="text-xs font-bold text-on-surface-variant mb-4">Target: {path.targetRole}</p>
							
							<div class="space-y-2 py-3 border-y border-surface-container text-xs text-on-surface-variant font-medium">
								<div class="flex justify-between">
									<span>Total Kursus Terintegrasi</span>
									<span class="font-bold text-on-surface">{path.requiredCourses} Modul</span>
								</div>
								<div class="flex justify-between">
									<span>Estimasi Total Waktu</span>
									<span class="font-bold text-on-surface">{path.totalDurationHours} Jam</span>
								</div>
								<div class="flex justify-between">
									<span>Peserta Terdaftar</span>
									<span class="font-bold text-on-surface">{path.enrolledLearners} Karyawan</span>
								</div>
							</div>
						</div>

						<div class="pt-4">
							<div class="flex justify-between text-xs font-bold mb-1.5">
								<span class="text-on-surface-variant">Rata-rata Kelulusan</span>
								<span class="text-primary">{path.progressPercent}%</span>
							</div>
							<div class="w-full bg-surface-container rounded-full h-2 overflow-hidden mb-4">
								<div class="bg-primary h-full rounded-full" style="width: {path.progressPercent}%"></div>
							</div>
							<button class="w-full py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold transition-colors">
								Kelola Jalur Pelatihan
							</button>
						</div>
					</div>
				{/each}
			</div>

		<!-- TAB 4: TRAINING MATRIX -->
		{:else if activeTab === 'matrix'}
			<div class="bg-surface-container-lowest border border-slate-200/60 dark:border-slate-800/60 rounded-3xl overflow-hidden shadow-xs">
				<div class="p-6 border-b border-surface-container flex justify-between items-center">
					<div>
						<h3 class="font-extrabold text-base text-on-surface">Matrix Pelatihan & Kepatuhan Standar Industri (K3/QHSE)</h3>
						<p class="text-xs text-on-surface-variant mt-0.5">Pemetaan modul wajib berdasarkan posisi & level jabatan operasional BCS Logistics.</p>
					</div>
					<button class="px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container">
						Export Matrix (PDF/Excel)
					</button>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="bg-surface-container-low border-b border-surface-container text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">
							<tr>
								<th class="py-4 px-6">Posisi / Role</th>
								<th class="py-4 px-4">K3 & B3 Gudang</th>
								<th class="py-4 px-4">Defensive Driving</th>
								<th class="py-4 px-4">Engine Maintenance</th>
								<th class="py-4 px-4">Sistem ERP BCS</th>
								<th class="py-4 px-4">Leadership</th>
								<th class="py-4 px-6 text-right">Tingkat Kepatuhan</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-surface-container font-medium">
							{#each trainingMatrix as row}
								<tr class="hover:bg-surface-container-low transition-colors">
									<td class="py-4 px-6 font-bold text-on-surface">{row.role}</td>
									<td class="py-4 px-4">
										<span class="px-2 py-1 rounded-md text-[10px] font-bold {row.k3.includes('Wajib') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
											{row.k3}
										</span>
									</td>
									<td class="py-4 px-4">
										<span class="px-2 py-1 rounded-md text-[10px] font-bold {row.defensive.includes('Wajib') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
											{row.defensive}
										</span>
									</td>
									<td class="py-4 px-4">
										<span class="px-2 py-1 rounded-md text-[10px] font-bold {row.maintenance.includes('Wajib') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
											{row.maintenance}
										</span>
									</td>
									<td class="py-4 px-4">
										<span class="px-2 py-1 rounded-md text-[10px] font-bold {row.erp.includes('Wajib') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
											{row.erp}
										</span>
									</td>
									<td class="py-4 px-4">
										<span class="px-2 py-1 rounded-md text-[10px] font-bold {row.leadership.includes('Wajib') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
											{row.leadership}
										</span>
									</td>
									<td class="py-4 px-6 text-right font-black text-emerald-600 dark:text-emerald-400">
										{row.compliance}%
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

<!-- ============================================== -->
<!-- MODAL 1: TAMBAH KURSUS BARU                    -->
<!-- ============================================== -->
{#if isCreateModalOpen}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-lg shadow-2xl p-6 border border-surface-container max-h-[90vh] overflow-y-auto">
			<div class="flex justify-between items-center mb-4">
				<h3 class="font-extrabold text-lg text-on-surface">Tambah Kursus Baru ke LMS</h3>
				<button type="button" onclick={() => isCreateModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form method="POST" action="?/createCourse" use:enhance class="space-y-4">
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Judul Kursus</label>
					<input type="text" name="title" required placeholder="cth: SOP Keselamatan Pengemudi Angkutan Berat" class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Kategori</label>
						<select name="category" required class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm cursor-pointer">
							<option value="Operations">Operations</option>
							<option value="QHSE & Safety">QHSE & Safety</option>
							<option value="Technical">Technical</option>
							<option value="Digital Systems">Digital Systems</option>
							<option value="Leadership">Leadership</option>
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Tingkat Level</label>
						<select name="level" class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm cursor-pointer">
							<option value="Mandatory">Mandatory (Wajib)</option>
							<option value="Beginner">Beginner</option>
							<option value="Intermediate">Intermediate</option>
							<option value="Advanced">Advanced</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Estimasi Durasi (Menit)</label>
						<input type="number" name="durationMinutes" value="120" class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Instruktur / Pemateri</label>
						<input type="text" name="instructor" placeholder="cth: Ir. Bambang (QHSE)" class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Deskripsi Singkat & Target Kompetensi</label>
					<textarea name="description" rows="3" placeholder="Jelaskan silabus dan sasaran pembelajaran materi ini..." class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm"></textarea>
				</div>

				<div class="pt-4 border-t border-surface-container flex justify-end gap-3">
					<button type="button" onclick={() => isCreateModalOpen = false} class="px-5 py-2.5 rounded-full font-bold text-on-surface-variant hover:bg-surface-container text-sm">
						Batal
					</button>
					<button type="submit" class="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all text-sm">
						Simpan Kursus
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ============================================== -->
<!-- MODAL 2: COURSE PLAYER & QUIZ ASSESSMENT       -->
<!-- ============================================== -->
{#if isPlayerModalOpen && activeCourseForPlayer}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-4xl shadow-2xl border border-surface-container h-[85vh] flex flex-col overflow-hidden">
			<!-- Player Top Bar -->
			<div class="p-4 px-6 border-b border-surface-container flex justify-between items-center bg-surface-container-low">
				<div>
					<span class="text-[10px] font-black uppercase tracking-wider text-primary">{activeCourseForPlayer.category}</span>
					<h3 class="font-extrabold text-base text-on-surface">{activeCourseForPlayer.title}</h3>
				</div>
				<button type="button" onclick={() => isPlayerModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<!-- Player Body: Split Screen -->
			<div class="flex-1 flex flex-col md:flex-row overflow-hidden">
				<!-- Left: Video / Content Player Canvas -->
				<div class="flex-1 p-6 flex flex-col justify-between overflow-y-auto bg-slate-950 text-white">
					{#if activeCourseForPlayer.modules[activeModuleIndex]?.type === 'QUIZ'}
						<div class="space-y-6">
							<div class="flex items-center gap-2 text-amber-400">
								<span class="material-symbols-outlined">quiz</span>
								<h4 class="font-extrabold text-lg">Evaluasi Akhir & Post-Test Kelulusan</h4>
							</div>
							<p class="text-xs text-slate-300">Jawab pertanyaan berikut untuk menyelesaikan kursus ini dan mendapatkan sertifikat.</p>
							
							<div class="space-y-4">
								<div class="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
									<p class="text-sm font-bold mb-3">1. Apa langkah pertama yang wajib dilakukan pengemudi sebelum memulai perjalanan (P2H)?</p>
									<div class="space-y-2 text-xs">
										<label class="flex items-center gap-3 p-2.5 bg-slate-800/60 rounded-xl cursor-pointer hover:bg-slate-800">
											<input type="radio" name="q1" value="A" class="text-primary" />
											<span>A. Memeriksa tekanan ban, rem angin, level oli mesin, dan kelengkapan surat kendaraan</span>
										</label>
										<label class="flex items-center gap-3 p-2.5 bg-slate-800/60 rounded-xl cursor-pointer hover:bg-slate-800">
											<input type="radio" name="q1" value="B" class="text-primary" />
											<span>B. Langsung memacu kendaraan dengan kecepatan maksimal di jalan tol</span>
										</label>
										<label class="flex items-center gap-3 p-2.5 bg-slate-800/60 rounded-xl cursor-pointer hover:bg-slate-800">
											<input type="radio" name="q1" value="C" class="text-primary" />
											<span>C. Mengabaikan indikator peringatan dashboard jika muatan ringan</span>
										</label>
									</div>
								</div>

								<div class="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
									<p class="text-sm font-bold mb-3">2. Jarak aman minimal antar kendaraan muatan berat saat kondisi jalan basah adalah:</p>
									<div class="space-y-2 text-xs">
										<label class="flex items-center gap-3 p-2.5 bg-slate-800/60 rounded-xl cursor-pointer hover:bg-slate-800">
											<input type="radio" name="q2" value="A" class="text-primary" />
											<span>A. Minimal 50 - 100 meter (Aturan 4 Detik)</span>
										</label>
										<label class="flex items-center gap-3 p-2.5 bg-slate-800/60 rounded-xl cursor-pointer hover:bg-slate-800">
											<input type="radio" name="q2" value="B" class="text-primary" />
											<span>B. Menempel sedekat mungkin untuk memotong hambatan angin</span>
										</label>
									</div>
								</div>
							</div>

							{#if activeQuizSubmitted}
								<div class="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-center space-y-2 animate-in zoom-in-95">
									<span class="material-symbols-outlined text-3xl text-emerald-400">verified</span>
									<h4 class="font-extrabold text-base text-emerald-300">Selamat! Anda Lulus dengan Nilai 100/100</h4>
									<p class="text-xs text-slate-300">Sertifikat kelulusan digital telah diterbitkan otomatis dan tercatat di profil HRIS Anda.</p>
								</div>
							{:else}
								<button 
									type="button"
									onclick={() => activeQuizSubmitted = true}
									class="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer"
								>
									Kirim Jawaban & Selesaikan Kuis
								</button>
							{/if}
						</div>
					{:else}
						<!-- Video Screen Mockup -->
						<div class="aspect-video w-full bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-3 relative overflow-hidden">
							<div class="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center shadow-lg animate-pulse">
								<span class="material-symbols-outlined text-3xl">smart_display</span>
							</div>
							<div>
								<h4 class="font-bold text-sm text-white">{activeCourseForPlayer.modules[activeModuleIndex]?.title}</h4>
								<p class="text-[11px] text-slate-400 mt-1">Durasi: {activeCourseForPlayer.modules[activeModuleIndex]?.duration} • Format: {activeCourseForPlayer.modules[activeModuleIndex]?.type}</p>
							</div>
							<div class="flex gap-3 pt-2">
								<button class="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
									<span class="material-symbols-outlined text-sm">play_arrow</span> Putar Video
								</button>
								<button class="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
									<span class="material-symbols-outlined text-sm">download</span> Unduh PDF Modul
								</button>
							</div>
						</div>

						<div class="mt-4 flex justify-between items-center">
							<span class="text-xs text-slate-400">Instruktur: {activeCourseForPlayer.instructor}</span>
							<button 
								type="button"
								onclick={() => {
									if (activeModuleIndex < activeCourseForPlayer.modules.length - 1) {
										activeModuleIndex += 1;
									}
								}}
								class="bg-primary text-on-primary px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1.5"
							>
								<span>Bab Selanjutnya</span>
								<span class="material-symbols-outlined text-sm">arrow_forward</span>
							</button>
						</div>
					{/if}
				</div>

				<!-- Right: Module Sidebar List -->
				<div class="w-full md:w-72 bg-surface-container-low border-t md:border-t-0 md:border-l border-surface-container p-4 overflow-y-auto space-y-2">
					<h4 class="text-xs font-black uppercase tracking-wider text-on-surface-variant mb-3">Daftar Bab & Evaluasi</h4>
					{#each activeCourseForPlayer.modules as mod, i}
						<button 
							type="button"
							onclick={() => activeModuleIndex = i}
							class="w-full text-left p-3 rounded-2xl transition-all flex items-center gap-3 cursor-pointer {activeModuleIndex === i ? 'bg-primary text-on-primary shadow-xs font-bold' : 'hover:bg-surface-container text-on-surface font-medium'}"
						>
							<div class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black {activeModuleIndex === i ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant'}">
								{i + 1}
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-xs truncate">{mod.title}</p>
								<p class="text-[10px] opacity-70">{mod.duration} • {mod.type}</p>
							</div>
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- ============================================== -->
<!-- MODAL 3: DIGITAL CERTIFICATE PREVIEW           -->
<!-- ============================================== -->
{#if isCertModalOpen && activeCertData}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
		<div class="bg-white text-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl p-8 border-4 border-amber-500/30 relative overflow-hidden text-center space-y-6">
			<div class="flex justify-between items-start">
				<div class="text-left">
					<span class="text-[10px] font-black uppercase tracking-widest text-amber-600">PT Buana Centra Swakarsa</span>
					<h4 class="font-black text-xl text-slate-800">Sertifikat Kelulusan Pelatihan</h4>
				</div>
				<button type="button" onclick={() => isCertModalOpen = false} class="text-slate-400 hover:text-slate-700">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="py-4 space-y-2">
				<p class="text-xs text-slate-500 uppercase tracking-widest">Diberikan Kepada:</p>
				<h2 class="text-2xl font-black text-slate-900 tracking-tight">Karyawan PT BCS Logistics</h2>
				<p class="text-xs text-slate-600 max-w-md mx-auto">
					Telah berhasil menyelesaikan seluruh modul pembelajaran, simulasi, dan post-test kelulusan pada pelatihan:
				</p>
				<div class="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 font-extrabold text-sm max-w-md mx-auto">
					{activeCertData.title}
				</div>
			</div>

			<div class="flex justify-between items-center text-xs text-slate-500 border-t border-slate-200 pt-4">
				<div class="text-left">
					<p class="font-bold text-slate-700">No. Sertifikat: {activeCertData.certificateNumber || 'CERT-BCS-2026'}</p>
					<p class="text-[10px]">Terverifikasi di Database HRIS BCS</p>
				</div>
				<div class="flex gap-2">
					<button onclick={() => window.print()} class="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm">
						<span class="material-symbols-outlined text-sm">print</span> Cetak Sertifikat
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
