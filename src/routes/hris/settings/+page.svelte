<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { fly, fade } from 'svelte/transition';
	import { addToast } from '$lib/stores/notifications';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Active Tab State
	type TabType = 'titles' | 'departments' | 'divisions' | 'directorates';
	let activeTab = $state<TabType>('titles');

	// Search & Filter State
	let searchQuery = $state('');
	let statusFilter = $state<'ALL' | 'Y' | 'N'>('ALL');

	// Modal State
	let isModalOpen = $state(false);
	let modalMode = $state<'create' | 'edit'>('create');
	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	// Delete Confirmation Modal State
	let isDeleteModalOpen = $state(false);
	let deleteTarget = $state<{ type: TabType; code: string; name: string; employeeCount: number } | null>(null);

	// Form Input State
	let formId = $state<number | undefined>(undefined);
	let formCode = $state('');
	let formName = $state('');
	let formDesc = $state('');
	let formParentCode = $state('');
	let formActive = $state('Y');

	// Notifikasi hasil server action
	$effect(() => {
		if (form) {
			if (form.success && form.message) {
				addToast({ type: 'success', message: form.message });
				isModalOpen = false;
				isDeleteModalOpen = false;
			} else if (form.message) {
				errorMessage = form.message;
				addToast({ type: 'error', message: form.message });
			}
		}
	});

	// Data Derivations
	const summary = $derived(data.summary || {
		totalTitles: 0,
		activeTitles: 0,
		totalDepts: 0,
		activeDepts: 0,
		totalDivs: 0,
		activeDivs: 0,
		totalDirs: 0,
		activeDirs: 0
	});

	// Filtered Titles
	const filteredTitles = $derived(
		(data.titles || []).filter((t: any) => {
			const q = searchQuery.toLowerCase().trim();
			const matchSearch = !q || t.title.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
			const matchStatus = statusFilter === 'ALL' || t.active === statusFilter;
			return matchSearch && matchStatus;
		})
	);

	// Filtered Departments
	const filteredDepts = $derived(
		(data.departments || []).filter((d: any) => {
			const q = searchQuery.toLowerCase().trim();
			const matchSearch = !q || d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || (d.divName && d.divName.toLowerCase().includes(q));
			const matchStatus = statusFilter === 'ALL' || d.active === statusFilter;
			return matchSearch && matchStatus;
		})
	);

	// Filtered Divisions
	const filteredDivs = $derived(
		(data.divisions || []).filter((v: any) => {
			const q = searchQuery.toLowerCase().trim();
			const matchSearch = !q || v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q) || (v.dirName && v.dirName.toLowerCase().includes(q));
			const matchStatus = statusFilter === 'ALL' || v.active === statusFilter;
			return matchSearch && matchStatus;
		})
	);

	// Filtered Directorates
	const filteredDirs = $derived(
		(data.directorates || []).filter((r: any) => {
			const q = searchQuery.toLowerCase().trim();
			const matchSearch = !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q);
			const matchStatus = statusFilter === 'ALL' || r.active === statusFilter;
			return matchSearch && matchStatus;
		})
	);

	function openCreateModal() {
		errorMessage = '';
		successMessage = '';
		modalMode = 'create';
		formId = undefined;
		formName = '';
		formDesc = '';
		formParentCode = '';
		formActive = 'Y';

		// Prefill kode otomatis sesuai tab aktif
		if (activeTab === 'titles') {
			formCode = data.nextCodes?.title || 'JB_408';
		} else if (activeTab === 'departments') {
			formCode = data.nextCodes?.dept || 'D_72';
			formParentCode = data.parentLookups?.divisions[0]?.code || '';
		} else if (activeTab === 'divisions') {
			formCode = data.nextCodes?.div || 'DV_47';
			formParentCode = data.parentLookups?.directorates[0]?.code || '';
		} else if (activeTab === 'directorates') {
			formCode = data.nextCodes?.dir || 'DR_16';
		}

		isModalOpen = true;
	}

	function openEditModal(item: any) {
		errorMessage = '';
		successMessage = '';
		modalMode = 'edit';
		formId = item.id;
		formCode = item.code;
		formName = item.name || item.title;
		formDesc = item.jobDesc || '';
		formParentCode = item.divCode || item.dirCode || '';
		formActive = item.active || 'Y';
		isModalOpen = true;
	}

	function openDeleteConfirm(item: any) {
		deleteTarget = {
			type: activeTab,
			code: item.code,
			name: item.name || item.title,
			employeeCount: item.employeeCount || 0
		};
		isDeleteModalOpen = true;
	}

	// Action URL untuk tab aktif
	const currentActionUrl = $derived.by(() => {
		if (activeTab === 'titles') return modalMode === 'create' ? '?/saveTitle' : '?/saveTitle';
		if (activeTab === 'departments') return modalMode === 'create' ? '?/saveDepartment' : '?/saveDepartment';
		if (activeTab === 'divisions') return modalMode === 'create' ? '?/saveDivision' : '?/saveDivision';
		return modalMode === 'create' ? '?/saveDirectorate' : '?/saveDirectorate';
	});

	const currentToggleAction = $derived.by(() => {
		if (activeTab === 'titles') return '?/toggleTitleStatus';
		if (activeTab === 'departments') return '?/toggleDepartmentStatus';
		if (activeTab === 'divisions') return '?/toggleDivisionStatus';
		return '?/toggleDirectorateStatus';
	});

	const currentDeleteAction = $derived.by(() => {
		if (deleteTarget?.type === 'titles') return '?/deleteTitle';
		if (deleteTarget?.type === 'departments') return '?/deleteDepartment';
		if (deleteTarget?.type === 'divisions') return '?/deleteDivision';
		return '?/deleteDirectorate';
	});
</script>

<svelte:head>
	<title>Pengaturan Struktur Organisasi — HRIS ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2 mb-1">
				<span class="material-symbols-outlined text-primary text-[28px]">domain</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Pengaturan Struktur Organisasi</h1>
			</div>
			<p class="text-xs text-on-surface-variant font-medium">
				Kelola data master Jabatan, Departemen, Divisi, dan Direktorat secara terintegrasi dengan database PostgreSQL.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={openCreateModal}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs tracking-wide shadow-md shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer"
			>
				<span class="material-symbols-outlined text-[18px]">add_circle</span>
				<span>
					Tambah {activeTab === 'titles' ? 'Jabatan' : activeTab === 'departments' ? 'Departemen' : activeTab === 'divisions' ? 'Divisi' : 'Direktorat'} Baru
				</span>
			</button>
		</div>
	</div>

	<!-- KPI Summary Metrics -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Card 1: Jabatan -->
		<div 
			role="button"
			tabindex="0"
			onclick={() => activeTab = 'titles'}
			onkeydown={(e) => { if (e.key === 'Enter') activeTab = 'titles'; }}
			class="p-5 rounded-2xl bg-surface-container-lowest border transition-all cursor-pointer {activeTab === 'titles' ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200/70 dark:border-slate-800/70 hover:border-primary/40'}"
		>
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Jabatan / Posisi</span>
				<div class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">badge</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface">{summary.activeTitles}</div>
			<p class="text-[11px] text-slate-500 font-medium mt-1">
				Aktif dari <span class="font-bold text-on-surface">{summary.totalTitles}</span> total posisi
			</p>
		</div>

		<!-- Card 2: Departemen -->
		<div 
			role="button"
			tabindex="0"
			onclick={() => activeTab = 'departments'}
			onkeydown={(e) => { if (e.key === 'Enter') activeTab = 'departments'; }}
			class="p-5 rounded-2xl bg-surface-container-lowest border transition-all cursor-pointer {activeTab === 'departments' ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200/70 dark:border-slate-800/70 hover:border-primary/40'}"
		>
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Departemen</span>
				<div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">corporate_fare</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface">{summary.activeDepts}</div>
			<p class="text-[11px] text-slate-500 font-medium mt-1">
				Aktif dari <span class="font-bold text-on-surface">{summary.totalDepts}</span> departemen
			</p>
		</div>

		<!-- Card 3: Divisi -->
		<div 
			role="button"
			tabindex="0"
			onclick={() => activeTab = 'divisions'}
			onkeydown={(e) => { if (e.key === 'Enter') activeTab = 'divisions'; }}
			class="p-5 rounded-2xl bg-surface-container-lowest border transition-all cursor-pointer {activeTab === 'divisions' ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200/70 dark:border-slate-800/70 hover:border-primary/40'}"
		>
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Divisi</span>
				<div class="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">lan</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface">{summary.activeDivs}</div>
			<p class="text-[11px] text-slate-500 font-medium mt-1">
				Aktif dari <span class="font-bold text-on-surface">{summary.totalDivs}</span> divisi
			</p>
		</div>

		<!-- Card 4: Direktorat -->
		<div 
			role="button"
			tabindex="0"
			onclick={() => activeTab = 'directorates'}
			onkeydown={(e) => { if (e.key === 'Enter') activeTab = 'directorates'; }}
			class="p-5 rounded-2xl bg-surface-container-lowest border transition-all cursor-pointer {activeTab === 'directorates' ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200/70 dark:border-slate-800/70 hover:border-primary/40'}"
		>
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Direktorat</span>
				<div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">domain</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface">{summary.activeDirs}</div>
			<p class="text-[11px] text-slate-500 font-medium mt-1">
				Aktif dari <span class="font-bold text-on-surface">{summary.totalDirs}</span> direktorat
			</p>
		</div>
	</div>

	<!-- Tab Switcher Navigation -->
	<div class="flex border-b border-slate-200/80 dark:border-slate-800 gap-1 overflow-x-auto hide-scrollbar">
		<button
			type="button"
			onclick={() => { activeTab = 'titles'; searchQuery = ''; }}
			class="flex items-center gap-2 py-3 px-4 font-bold text-xs tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap {activeTab === 'titles' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[18px]">badge</span>
			<span>Jabatan ({filteredTitles.length})</span>
		</button>

		<button
			type="button"
			onclick={() => { activeTab = 'departments'; searchQuery = ''; }}
			class="flex items-center gap-2 py-3 px-4 font-bold text-xs tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap {activeTab === 'departments' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[18px]">corporate_fare</span>
			<span>Departemen ({filteredDepts.length})</span>
		</button>

		<button
			type="button"
			onclick={() => { activeTab = 'divisions'; searchQuery = ''; }}
			class="flex items-center gap-2 py-3 px-4 font-bold text-xs tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap {activeTab === 'divisions' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[18px]">lan</span>
			<span>Divisi ({filteredDivs.length})</span>
		</button>

		<button
			type="button"
			onclick={() => { activeTab = 'directorates'; searchQuery = ''; }}
			class="flex items-center gap-2 py-3 px-4 font-bold text-xs tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap {activeTab === 'directorates' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[18px]">domain</span>
			<span>Direktorat ({filteredDirs.length})</span>
		</button>
	</div>

	<!-- Filter & Search Controls Bar -->
	<div class="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
		<div class="w-full sm:w-96 flex items-center gap-3 px-3.5 py-2 rounded-xl bg-surface-container-low transition-all">
			<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
			<input 
				type="text" 
				bind:value={searchQuery} 
				placeholder="Cari kode atau nama {activeTab === 'titles' ? 'jabatan' : activeTab === 'departments' ? 'departemen' : activeTab === 'divisions' ? 'divisi' : 'direktorat'}..." 
				class="bg-transparent text-xs text-on-surface border-0 outline-none w-full placeholder:text-on-surface-variant/50 focus:ring-0" 
			/>
			{#if searchQuery}
				<button type="button" onclick={() => searchQuery = ''} class="text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined text-sm">close</span>
				</button>
			{/if}
		</div>

		<!-- Status Filter Pills -->
		<div class="flex items-center gap-1.5 self-start sm:self-auto">
			<span class="text-[11px] font-bold text-on-surface-variant mr-1">Status:</span>
			<button
				type="button"
				onclick={() => statusFilter = 'ALL'}
				class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {statusFilter === 'ALL' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
			>
				Semua
			</button>
			<button
				type="button"
				onclick={() => statusFilter = 'Y'}
				class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {statusFilter === 'Y' ? 'bg-emerald-600 text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
			>
				Aktif
			</button>
			<button
				type="button"
				onclick={() => statusFilter = 'N'}
				class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {statusFilter === 'N' ? 'bg-slate-600 text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
			>
				Nonaktif
			</button>
		</div>
	</div>

	<!-- TABEL KONTEN SESUAI TAB AKTIF -->
	<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse text-xs">
				<thead>
					<tr class="border-b border-slate-200/80 dark:border-slate-800 bg-surface-container-low/50">
						<th class="py-3 px-4 font-black text-on-surface uppercase tracking-wider text-[10px]">Kode</th>
						<th class="py-3 px-4 font-black text-on-surface uppercase tracking-wider text-[10px]">Nama Entitas</th>
						{#if activeTab === 'departments'}
							<th class="py-3 px-4 font-black text-on-surface uppercase tracking-wider text-[10px]">Induk Divisi</th>
						{:else if activeTab === 'divisions'}
							<th class="py-3 px-4 font-black text-on-surface uppercase tracking-wider text-[10px]">Induk Direktorat</th>
							<th class="py-3 px-4 font-black text-on-surface uppercase tracking-wider text-[10px] text-center">Jml Dept</th>
						{:else if activeTab === 'directorates'}
							<th class="py-3 px-4 font-black text-on-surface uppercase tracking-wider text-[10px] text-center">Jml Divisi</th>
						{:else if activeTab === 'titles'}
							<th class="py-3 px-4 font-black text-on-surface uppercase tracking-wider text-[10px]">Deskripsi Pekerjaan</th>
						{/if}
						<th class="py-3 px-4 font-black text-on-surface uppercase tracking-wider text-[10px] text-center">Karyawan Aktif</th>
						<th class="py-3 px-4 font-black text-on-surface uppercase tracking-wider text-[10px] text-center">Status</th>
						<th class="py-3 px-4 font-black text-on-surface uppercase tracking-wider text-[10px] text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					<!-- TAB 1: JABATAN -->
					{#if activeTab === 'titles'}
						{#if filteredTitles.length === 0}
							<tr>
								<td colspan="6" class="py-12 text-center text-slate-400">Tidak ada data jabatan yang cocok dengan pencarian.</td>
							</tr>
						{:else}
							{#each filteredTitles as item}
								<tr class="hover:bg-surface-container-low/40 transition-colors">
									<td class="py-3 px-4 font-mono font-bold text-primary">{item.code}</td>
									<td class="py-3 px-4 font-bold text-on-surface">{item.title}</td>
									<td class="py-3 px-4 text-on-surface-variant max-w-xs truncate">{item.jobDesc || '-'}</td>
									<td class="py-3 px-4 text-center">
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold {item.employeeCount > 0 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}">
											<span class="material-symbols-outlined text-[13px]">person</span>
											{item.employeeCount}
										</span>
									</td>
									<td class="py-3 px-4 text-center">
										<span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider {item.active === 'Y' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}">
											{item.active === 'Y' ? 'Aktif' : 'Nonaktif'}
										</span>
									</td>
									<td class="py-3 px-4 text-right">
										<div class="flex items-center justify-end gap-1">
											<button
												type="button"
												onclick={() => openEditModal(item)}
												class="p-1.5 rounded-lg text-slate-600 hover:text-primary hover:bg-surface-container transition-all"
												title="Edit Jabatan"
											>
												<span class="material-symbols-outlined text-[16px]">edit</span>
											</button>
											<form method="POST" action="?/toggleTitleStatus" use:enhance class="inline">
												<input type="hidden" name="code" value={item.code} />
												<button
													type="submit"
													class="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-surface-container transition-all"
													title={item.active === 'Y' ? 'Nonaktifkan' : 'Aktifkan'}
												>
													<span class="material-symbols-outlined text-[16px]">{item.active === 'Y' ? 'toggle_on' : 'toggle_off'}</span>
												</button>
											</form>
											<button
												type="button"
												onclick={() => openDeleteConfirm(item)}
												class="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-surface-container transition-all"
												title="Hapus"
											>
												<span class="material-symbols-outlined text-[16px]">delete</span>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						{/if}

					<!-- TAB 2: DEPARTEMEN -->
					{:else if activeTab === 'departments'}
						{#if filteredDepts.length === 0}
							<tr>
								<td colspan="6" class="py-12 text-center text-slate-400">Tidak ada data departemen yang cocok dengan pencarian.</td>
							</tr>
						{:else}
							{#each filteredDepts as item}
								<tr class="hover:bg-surface-container-low/40 transition-colors">
									<td class="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{item.code}</td>
									<td class="py-3 px-4 font-bold text-on-surface">{item.name}</td>
									<td class="py-3 px-4">
										{#if item.divName}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
												<span class="material-symbols-outlined text-[12px]">lan</span>
												{item.divName} ({item.divCode})
											</span>
										{:else}
											<span class="text-slate-400 italic">Belum ditentukan</span>
										{/if}
									</td>
									<td class="py-3 px-4 text-center">
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold {item.employeeCount > 0 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}">
											<span class="material-symbols-outlined text-[13px]">person</span>
											{item.employeeCount}
										</span>
									</td>
									<td class="py-3 px-4 text-center">
										<span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider {item.active === 'Y' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}">
											{item.active === 'Y' ? 'Aktif' : 'Nonaktif'}
										</span>
									</td>
									<td class="py-3 px-4 text-right">
										<div class="flex items-center justify-end gap-1">
											<button
												type="button"
												onclick={() => openEditModal(item)}
												class="p-1.5 rounded-lg text-slate-600 hover:text-primary hover:bg-surface-container transition-all"
												title="Edit Departemen"
											>
												<span class="material-symbols-outlined text-[16px]">edit</span>
											</button>
											<form method="POST" action="?/toggleDepartmentStatus" use:enhance class="inline">
												<input type="hidden" name="code" value={item.code} />
												<button
													type="submit"
													class="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-surface-container transition-all"
													title={item.active === 'Y' ? 'Nonaktifkan' : 'Aktifkan'}
												>
													<span class="material-symbols-outlined text-[16px]">{item.active === 'Y' ? 'toggle_on' : 'toggle_off'}</span>
												</button>
											</form>
											<button
												type="button"
												onclick={() => openDeleteConfirm(item)}
												class="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-surface-container transition-all"
												title="Hapus"
											>
												<span class="material-symbols-outlined text-[16px]">delete</span>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						{/if}

					<!-- TAB 3: DIVISI -->
					{:else if activeTab === 'divisions'}
						{#if filteredDivs.length === 0}
							<tr>
								<td colspan="7" class="py-12 text-center text-slate-400">Tidak ada data divisi yang cocok dengan pencarian.</td>
							</tr>
						{:else}
							{#each filteredDivs as item}
								<tr class="hover:bg-surface-container-low/40 transition-colors">
									<td class="py-3 px-4 font-mono font-bold text-violet-600 dark:text-violet-400">{item.code}</td>
									<td class="py-3 px-4 font-bold text-on-surface">{item.name}</td>
									<td class="py-3 px-4">
										{#if item.dirName}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
												<span class="material-symbols-outlined text-[12px]">domain</span>
												{item.dirName} ({item.dirCode})
											</span>
										{:else}
											<span class="text-slate-400 italic">Belum ditentukan</span>
										{/if}
									</td>
									<td class="py-3 px-4 text-center font-bold text-slate-600 dark:text-slate-300">{item.deptCount}</td>
									<td class="py-3 px-4 text-center">
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold {item.employeeCount > 0 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}">
											<span class="material-symbols-outlined text-[13px]">person</span>
											{item.employeeCount}
										</span>
									</td>
									<td class="py-3 px-4 text-center">
										<span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider {item.active === 'Y' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}">
											{item.active === 'Y' ? 'Aktif' : 'Nonaktif'}
										</span>
									</td>
									<td class="py-3 px-4 text-right">
										<div class="flex items-center justify-end gap-1">
											<button
												type="button"
												onclick={() => openEditModal(item)}
												class="p-1.5 rounded-lg text-slate-600 hover:text-primary hover:bg-surface-container transition-all"
												title="Edit Divisi"
											>
												<span class="material-symbols-outlined text-[16px]">edit</span>
											</button>
											<form method="POST" action="?/toggleDivisionStatus" use:enhance class="inline">
												<input type="hidden" name="code" value={item.code} />
												<button
													type="submit"
													class="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-surface-container transition-all"
													title={item.active === 'Y' ? 'Nonaktifkan' : 'Aktifkan'}
												>
													<span class="material-symbols-outlined text-[16px]">{item.active === 'Y' ? 'toggle_on' : 'toggle_off'}</span>
												</button>
											</form>
											<button
												type="button"
												onclick={() => openDeleteConfirm(item)}
												class="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-surface-container transition-all"
												title="Hapus"
											>
												<span class="material-symbols-outlined text-[16px]">delete</span>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						{/if}

					<!-- TAB 4: DIREKTORAT -->
					{:else if activeTab === 'directorates'}
						{#if filteredDirs.length === 0}
							<tr>
								<td colspan="6" class="py-12 text-center text-slate-400">Tidak ada data direktorat yang cocok dengan pencarian.</td>
							</tr>
						{:else}
							{#each filteredDirs as item}
								<tr class="hover:bg-surface-container-low/40 transition-colors">
									<td class="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">{item.code}</td>
									<td class="py-3 px-4 font-bold text-on-surface">{item.name}</td>
									<td class="py-3 px-4 text-center font-bold text-slate-600 dark:text-slate-300">{item.divCount}</td>
									<td class="py-3 px-4 text-center">
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold {item.employeeCount > 0 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}">
											<span class="material-symbols-outlined text-[13px]">person</span>
											{item.employeeCount}
										</span>
									</td>
									<td class="py-3 px-4 text-center">
										<span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider {item.active === 'Y' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}">
											{item.active === 'Y' ? 'Aktif' : 'Nonaktif'}
										</span>
									</td>
									<td class="py-3 px-4 text-right">
										<div class="flex items-center justify-end gap-1">
											<button
												type="button"
												onclick={() => openEditModal(item)}
												class="p-1.5 rounded-lg text-slate-600 hover:text-primary hover:bg-surface-container transition-all"
												title="Edit Direktorat"
											>
												<span class="material-symbols-outlined text-[16px]">edit</span>
											</button>
											<form method="POST" action="?/toggleDirectorateStatus" use:enhance class="inline">
												<input type="hidden" name="code" value={item.code} />
												<button
													type="submit"
													class="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-surface-container transition-all"
													title={item.active === 'Y' ? 'Nonaktifkan' : 'Aktifkan'}
												>
													<span class="material-symbols-outlined text-[16px]">{item.active === 'Y' ? 'toggle_on' : 'toggle_off'}</span>
												</button>
											</form>
											<button
												type="button"
												onclick={() => openDeleteConfirm(item)}
												class="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-surface-container transition-all"
												title="Hapus"
											>
												<span class="material-symbols-outlined text-[16px]">delete</span>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- ========================================== -->
<!-- MODAL TAMBAH / EDIT ENTITAS ORGANISASI     -->
<!-- ========================================== -->
{#if isModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
		<!-- Backdrop -->
		<button
			type="button"
			aria-label="Tutup Modal"
			onclick={() => isModalOpen = false}
			class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-default"
			tabindex="-1"
		></button>

		<!-- Modal Container -->
		<div
			transition:fly={{ y: 20, duration: 250 }}
			class="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden z-10"
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-slate-800 bg-surface-container-low/40">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
						<span class="material-symbols-outlined text-[18px]">
							{activeTab === 'titles' ? 'badge' : activeTab === 'departments' ? 'corporate_fare' : activeTab === 'divisions' ? 'lan' : 'domain'}
						</span>
					</div>
					<div>
						<h3 class="text-sm font-black text-on-surface">
							{modalMode === 'create' ? 'Tambah' : 'Edit'} {activeTab === 'titles' ? 'Jabatan' : activeTab === 'departments' ? 'Departemen' : activeTab === 'divisions' ? 'Divisi' : 'Direktorat'}
						</h3>
						<p class="text-[10px] text-on-surface-variant font-medium">Lengkapi rincian formulir di bawah ini</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => isModalOpen = false}
					class="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-surface-container flex items-center justify-center transition-all cursor-pointer"
				>
					<span class="material-symbols-outlined text-[18px]">close</span>
				</button>
			</div>

			<!-- Modal Form Content -->
			<form
				method="POST"
				action={currentActionUrl}
				use:enhance={() => {
					isSubmitting = true;
					errorMessage = '';
					return async ({ update }) => {
						isSubmitting = false;
						await update();
					};
				}}
				class="p-6 space-y-4"
			>
				<input type="hidden" name="isEdit" value={modalMode === 'edit'} />
				{#if formId}
					<input type="hidden" name="id" value={formId} />
				{/if}

				{#if errorMessage}
					<div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs font-semibold">
						{errorMessage}
					</div>
				{/if}

				<!-- Kode Entitas -->
				<div class="space-y-1.5">
					<label for="modal-form-code" class="block text-xs font-bold text-on-surface uppercase tracking-wider">
						Kode {activeTab === 'titles' ? 'Jabatan' : activeTab === 'departments' ? 'Departemen' : activeTab === 'divisions' ? 'Divisi' : 'Direktorat'} *
					</label>
					<div class="relative">
						<input
							id="modal-form-code"
							type="text"
							name="code"
							bind:value={formCode}
							readonly={modalMode === 'edit'}
							placeholder="Misal: {activeTab === 'titles' ? 'JB_408' : activeTab === 'departments' ? 'D_72' : activeTab === 'divisions' ? 'DV_47' : 'DR_16'}"
							class="w-full bg-surface-container-low text-on-surface rounded-xl px-4 py-2.5 text-xs font-mono font-bold border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all {modalMode === 'edit' ? 'opacity-70 cursor-not-allowed' : ''}"
							required
						/>
					</div>
					{#if modalMode === 'create'}
						<p class="text-[10px] text-slate-400">Kode otomatis ter-generate dari nomor tertinggi. Anda tetap bisa menyesuaikannya jika ada kode khusus.</p>
					{/if}
				</div>

				<!-- Nama Entitas -->
				<div class="space-y-1.5">
					<label for="modal-form-name" class="block text-xs font-bold text-on-surface uppercase tracking-wider">
						Nama Lengkap {activeTab === 'titles' ? 'Jabatan' : activeTab === 'departments' ? 'Departemen' : activeTab === 'divisions' ? 'Divisi' : 'Direktorat'} *
					</label>
					<input
						id="modal-form-name"
						type="text"
						name={activeTab === 'titles' ? 'title' : 'name'}
						bind:value={formName}
						placeholder="Misal: {activeTab === 'titles' ? 'PACKAGING OPERATOR LEADER' : activeTab === 'departments' ? 'QUALITY ASSURANCE' : activeTab === 'divisions' ? 'LOGISTICS OPERATION' : 'COMMERCIAL & BUSINESS'}"
						class="w-full bg-surface-container-low text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
						required
					/>
				</div>

				<!-- Khusus Departemen: Induk Divisi -->
				{#if activeTab === 'departments'}
					<div class="space-y-1.5">
						<label for="modal-form-div" class="block text-xs font-bold text-on-surface uppercase tracking-wider">
							Induk Divisi
						</label>
						<select
							id="modal-form-div"
							name="divCode"
							bind:value={formParentCode}
							class="w-full bg-surface-container-low text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
						>
							<option value="">-- Tanpa Induk Divisi --</option>
							{#each (data.parentLookups?.divisions || []) as div}
								<option value={div.code}>{div.name} ({div.code})</option>
							{/each}
						</select>
					</div>
				{/if}

				<!-- Khusus Divisi: Induk Direktorat -->
				{#if activeTab === 'divisions'}
					<div class="space-y-1.5">
						<label for="modal-form-dir" class="block text-xs font-bold text-on-surface uppercase tracking-wider">
							Induk Direktorat
						</label>
						<select
							id="modal-form-dir"
							name="dirCode"
							bind:value={formParentCode}
							class="w-full bg-surface-container-low text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
						>
							<option value="">-- Tanpa Induk Direktorat --</option>
							{#each (data.parentLookups?.directorates || []) as dir}
								<option value={dir.code}>{dir.name} ({dir.code})</option>
							{/each}
						</select>
					</div>
				{/if}

				<!-- Khusus Jabatan: Deskripsi Tugas / Job Desc -->
				{#if activeTab === 'titles'}
					<div class="space-y-1.5">
						<label for="modal-form-desc" class="block text-xs font-bold text-on-surface uppercase tracking-wider">
							Deskripsi Tugas (Job Description)
						</label>
						<textarea
							id="modal-form-desc"
							name="jobDesc"
							rows="3"
							bind:value={formDesc}
							placeholder="Uraian ringkas tanggung jawab dan wewenang posisi ini..."
							class="w-full bg-surface-container-low text-on-surface rounded-xl px-4 py-2.5 text-xs border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
						></textarea>
					</div>
				{/if}

				<!-- Status Keaktifan -->
				<div class="space-y-1.5">
					<label for="modal-form-active" class="block text-xs font-bold text-on-surface uppercase tracking-wider">
						Status Data
					</label>
					<select
						id="modal-form-active"
						name="active"
						bind:value={formActive}
						class="w-full bg-surface-container-low text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
					>
						<option value="Y">Aktif (Dapat dipilih di form karyawan & asesmen)</option>
						<option value="N">Nonaktif (Diarsipkan, tidak tampil di dropdown pilihan)</option>
					</select>
				</div>

				<!-- Modal Actions Footer -->
				<div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200/70 dark:border-slate-800">
					<button
						type="button"
						onclick={() => isModalOpen = false}
						class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs tracking-wide shadow-md shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
							<span>Menyimpan...</span>
						{:else}
							<span class="material-symbols-outlined text-sm">save</span>
							<span>{modalMode === 'create' ? 'Tambah Data' : 'Simpan Perubahan'}</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ========================================== -->
<!-- MODAL KONFIRMASI HAPUS PERMANEN            -->
<!-- ========================================== -->
{#if isDeleteModalOpen && deleteTarget}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
		<button
			type="button"
			aria-label="Tutup Konfirmasi"
			onclick={() => isDeleteModalOpen = false}
			class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-default"
			tabindex="-1"
		></button>

		<div
			transition:fly={{ y: 20, duration: 250 }}
			class="relative w-full max-w-md rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 space-y-4 z-10"
		>
			<div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
				<span class="material-symbols-outlined text-[24px]">warning</span>
			</div>

			<div>
				<h3 class="text-base font-black text-on-surface">Konfirmasi Penghapusan</h3>
				<p class="text-xs text-on-surface-variant mt-1 leading-relaxed">
					Apakah Anda yakin ingin menghapus data <strong class="text-on-surface">{deleteTarget.name} ({deleteTarget.code})</strong>?
				</p>
			</div>

			{#if deleteTarget.employeeCount > 0}
				<div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-200 text-xs">
					<p class="font-bold flex items-center gap-1.5 mb-1">
						<span class="material-symbols-outlined text-sm">shield</span>
						Proteksi Integritas Database
					</p>
					<p class="text-[11px] leading-relaxed">
						Data ini saat ini masih digunakan oleh <strong>{deleteTarget.employeeCount} karyawan aktif</strong>. Untuk menjaga integritas data riwayat kepegawaian, gunakan opsi <strong>Nonaktifkan</strong> status sebagai gantinya.
					</p>
				</div>
			{/if}

			<div class="flex items-center justify-end gap-2 pt-2">
				<button
					type="button"
					onclick={() => isDeleteModalOpen = false}
					class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
				>
					Batal
				</button>
				{#if deleteTarget.employeeCount === 0}
					<form method="POST" action={currentDeleteAction} use:enhance class="inline">
						<input type="hidden" name="code" value={deleteTarget.code} />
						<button
							type="submit"
							class="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs tracking-wide hover:bg-rose-700 transition-all cursor-pointer"
						>
							Hapus Permanen
						</button>
					</form>
				{:else}
					<form method="POST" action={currentToggleAction} use:enhance class="inline">
						<input type="hidden" name="code" value={deleteTarget.code} />
						<button
							type="submit"
							class="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs tracking-wide hover:bg-amber-700 transition-all cursor-pointer"
						>
							Nonaktifkan Saja
						</button>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.hide-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
