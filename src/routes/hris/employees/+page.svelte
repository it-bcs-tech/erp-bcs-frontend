<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import Pagination from '$lib/components/Pagination.svelte';
	import EditEmployeeModal from '$lib/components/hris/EditEmployeeModal.svelte';
	import AddEmployeeModal from '$lib/components/hris/AddEmployeeModal.svelte';
	
	let { data }: { data: PageData } = $props();
	
	// Data berasal dari +page.server.ts
	let employees = $derived(data.employees || []);
	let directorates = $derived(data.directorates || []);
	let titles = $derived(data.titles || []);
	let divisions = $derived(data.divisions || []);
	let departments = $derived(data.departments || []);
	let supervisorMappings = $derived(data.supervisorMappings || []);
	let activePersonnel = $derived(data.activePersonnel || []);
	let locations = $derived(data.locations || []);
	let nextPayrollId = $derived(data.nextPayrollId || '');
	let meta = $derived(data.meta);

	// State yang sinkron dengan URL
	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let activeFilter = $state($page.url.searchParams.get('directorate') || $page.url.searchParams.get('department') || 'All');
	
	let searchTimer: ReturnType<typeof setTimeout>;

	function updateQueryParams() {
		const url = new URL(window.location.href);
		if (searchQuery) {
			url.searchParams.set('search', searchQuery);
		} else {
			url.searchParams.delete('search');
		}
		
		if (activeFilter && activeFilter !== 'All') {
			url.searchParams.set('directorate', activeFilter);
		} else {
			url.searchParams.delete('directorate');
			url.searchParams.delete('department');
		}
		
		// Reset to page 1 whenever search/filter changes
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(updateQueryParams, 400);
	}

	function handleFilterClick(filter: string) {
		activeFilter = filter;
		updateQueryParams();
	}

	// Modal State
	let isAddModalOpen = $state(false);
	let isEditModalOpen = $state(false);
	let selectedEmployeeForEdit = $state<any>(null);

	function openEditModal(emp: any) {
		selectedEmployeeForEdit = emp;
		isEditModalOpen = true;
	}

	// Pagination Compute
	let totalPages = $derived(Math.max(1, Math.ceil((meta?.total || 0) / (meta?.per_page || 10))));
	let currentPage = $derived(meta?.current_page || 1);
	let startItem = $derived(meta?.total === 0 ? 0 : ((currentPage - 1) * (meta?.per_page || 10)) + 1);
	let endItem = $derived(Math.min(currentPage * (meta?.per_page || 10), meta?.total || 0));

	function goToPage(page: number) {
		if (page < 1 || page > totalPages) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', page.toString());
		goto(url.toString(), { keepFocus: true, noScroll: true, invalidateAll: true });
	}
</script>

<svelte:head>
	<title>Employee Directory | HRIS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header & Actions -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-primary text-2xl">badge</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Employee Directory</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Kelola Direktori Karyawan, Data Jabatan, Direktorat & Profil Personel Perusahaan
			</p>
		</div>
		<div class="flex gap-2.5">
			<button 
				class="bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-primary/90 transition-colors cursor-pointer"
				onclick={() => isAddModalOpen = true}
			>
				<span class="material-symbols-outlined text-lg">person_add</span>
				<span>Tambah Karyawan Baru</span>
			</button>
		</div>
	</header>

	<!-- Unified Filter & Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs mb-6">
		<!-- Tabs (Segmented Control berdasarkan Direktorat) -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
			<button 
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {activeFilter === 'All' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
				onclick={() => handleFilterClick('All')}
			>
				Semua Direktorat (All)
			</button>
			{#each directorates as dir}
				<button 
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {activeFilter === dir.dir_code || activeFilter === dir.dir_name ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => handleFilterClick(dir.dir_code)}
				>
					{dir.dir_name}
				</button>
			{/each}
		</div>

		<!-- Search Input -->
		<div class="relative w-full md:w-80 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input 
				type="text" 
				bind:value={searchQuery}
				oninput={handleSearchInput}
				placeholder="Cari nama, jabatan, NIK..." 
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
			/>
		</div>
	</div>

	<!-- Directory Table -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="border-b border-surface-container sticky top-0 bg-surface-container-lowest z-10">
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Employee</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Role & Dept</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Contact</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#if employees.length === 0}
						<tr>
							<td colspan="5" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl block mb-2 opacity-40">person_search</span>
								<p class="font-bold text-sm">Tidak ada data karyawan yang ditemukan</p>
								<p class="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter direktorat.</p>
							</td>
						</tr>
					{:else}
						{#each employees as emp}
							<tr class="group hover:bg-surface-container-low transition-colors">
								<td class="py-4 px-6">
									<a href={`/hris/employees/${emp.id}`} class="flex items-center gap-4 cursor-pointer">
										<div class="w-12 h-12 rounded-xl overflow-hidden border-2 border-surface-container-high group-hover:border-{emp.color}-container transition-colors shadow-sm">
											<img src={emp.avatar} alt={emp.name} class="w-full h-full object-cover" />
										</div>
										<div>
											<p class="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{emp.name}</p>
											<p class="text-xs text-on-surface-variant font-mono font-medium mt-0.5">{emp.payroll_id || emp.id}</p>
										</div>
									</a>
								</td>
								<td class="py-4 px-6">
									<p class="text-sm font-bold text-on-surface">{emp.role}</p>
									<div class="flex items-center gap-1.5 mt-1 flex-wrap">
										<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
											{emp.directorate || 'Operations'}
										</span>
										{#if emp.department && emp.department !== emp.directorate}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[10px] font-medium">
												{emp.department}
											</span>
										{/if}
									</div>
								</td>
								<td class="py-4 px-6">
									<div class="space-y-1">
										{#if emp.status === 'Active'}
											<span class="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs bg-emerald-500/15 px-3 py-1 rounded-full">
												<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
											</span>
										{:else}
											<span class="inline-flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs bg-amber-500/15 px-3 py-1 rounded-full">
												<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> On Leave
											</span>
										{/if}
										{#if emp.status_karyawan}
											<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{emp.status_karyawan}</p>
										{/if}
									</div>
								</td>
								<td class="py-4 px-6">
									<p class="text-sm font-medium text-on-surface flex items-center gap-2">
										<span class="material-symbols-outlined text-base text-on-surface-variant">mail</span>
										{emp.email}
									</p>
								</td>
								<td class="py-4 px-6 text-right">
									<div class="flex items-center justify-end gap-1.5">
										<a href={`/hris/employees/${emp.id}`} class="p-2 rounded-xl text-primary hover:bg-primary/10 transition-colors tooltip cursor-pointer" title="Lihat Profil Lengkap">
											<span class="material-symbols-outlined text-[20px]">visibility</span>
										</a>
										<button 
											type="button"
											onclick={() => openEditModal(emp)}
											class="p-2 rounded-xl text-amber-600 hover:bg-amber-500/10 transition-colors tooltip cursor-pointer" 
											title="Edit Data Karyawan"
										>
											<span class="material-symbols-outlined text-[20px]">edit</span>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
		
		<!-- Pagination Footer -->
		{#if meta && meta.total > 0}
			<Pagination
				currentPage={currentPage}
				totalPages={totalPages}
				totalItems={meta?.total || 0}
				perPage={meta?.per_page || 10}
				itemLabel="karyawan"
				onPageChange={(p) => goToPage(p)}
			/>
		{/if}
	</div>
</div>

<!-- Add Employee Modal -->
<AddEmployeeModal
	bind:isOpen={isAddModalOpen}
	defaultPayrollId={nextPayrollId}
	{titles}
	{divisions}
	{departments}
	{supervisorMappings}
	{activePersonnel}
	{locations}
	onSaved={async () => {
		await invalidateAll();
	}}
/>

<!-- Edit Employee Modal -->
<EditEmployeeModal
	bind:isOpen={isEditModalOpen}
	employee={selectedEmployeeForEdit}
	{titles}
	{divisions}
	{departments}
	{supervisorMappings}
	{activePersonnel}
	{locations}
	onSaved={async () => {
		await invalidateAll();
	}}
/>

<style>
	/* Hide scrollbar for tabs */
	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.hide-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
