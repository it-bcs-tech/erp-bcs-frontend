<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	
	// Data berasal dari +page.server.ts
	let employees = $derived(data.employees || []);
	let directorates = $derived(data.directorates || []);
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

	// Pagination Compute
	let totalPages = $derived(Math.max(1, Math.ceil((meta?.total || 0) / (meta?.per_page || 10))));
	let currentPage = $derived(meta?.current_page || 1);
	let startItem = $derived(meta?.total === 0 ? 0 : ((currentPage - 1) * (meta?.per_page || 10)) + 1);
	let endItem = $derived(Math.min(currentPage * (meta?.per_page || 10), meta?.total || 0));

	function goToPage(page: number) {
		if (page < 1 || page > totalPages) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', page.toString());
		goto(url.toString(), { invalidateAll: true, noScroll: true });
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
								{#if emp.status === 'Active'}
									<span class="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs bg-emerald-500/15 px-3 py-1 rounded-full">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
									</span>
								{:else}
									<span class="inline-flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs bg-amber-500/15 px-3 py-1 rounded-full">
										<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> On Leave
									</span>
								{/if}
							</td>
							<td class="py-4 px-6">
								<p class="text-sm font-medium text-on-surface flex items-center gap-2">
									<span class="material-symbols-outlined text-base text-on-surface-variant">mail</span>
									{emp.email}
								</p>
							</td>
							<td class="py-4 px-6 text-right">
								<div class="flex items-center justify-end gap-2">
									<a href={`/hris/employees/${emp.id}`} class="p-2 rounded-lg text-primary hover:bg-primary-container/20 transition-colors tooltip" title="View Profile">
										<span class="material-symbols-outlined text-[20px]">visibility</span>
									</a>
									<button class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors tooltip" title="More Options">
										<span class="material-symbols-outlined text-[20px]">more_vert</span>
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		
		<!-- Pagination Footer -->
		<div class="px-6 py-4 border-t border-surface-container flex items-center justify-between bg-surface-container-lowest">
			<p class="text-xs text-on-surface-variant font-medium">Showing {startItem} to {endItem} of {meta?.total || 0} entries</p>
			<div class="flex gap-1">
				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" 
					disabled={currentPage <= 1}
					onclick={() => goToPage(currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				
				{#each Array(totalPages) as _, i}
					{#if Math.abs(currentPage - (i + 1)) <= 2 || i === 0 || i === totalPages - 1}
						<button 
							class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-colors {currentPage === i + 1 ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container-high'}"
							onclick={() => goToPage(i + 1)}>
							{i + 1}
						</button>
					{:else if Math.abs(currentPage - (i + 1)) === 3}
						<span class="w-8 h-8 flex items-center justify-center text-on-surface-variant text-sm font-bold">...</span>
					{/if}
				{/each}

				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors"
					disabled={currentPage >= totalPages}
					onclick={() => goToPage(currentPage + 1)}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Add Employee Modal -->
{#if isAddModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick={() => isAddModalOpen = false}></div>
		
		<!-- Modal Content -->
		<div class="relative bg-surface-container-lowest rounded-[24px] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
			<!-- Modal Header -->
			<div class="px-8 py-6 border-b border-surface-container flex items-center justify-between bg-surface-container-lowest z-10">
				<div>
					<h2 class="text-xl font-bold text-on-surface">Add New Employee</h2>
					<p class="text-sm text-on-surface-variant mt-1">Enter the details for the new team member.</p>
				</div>
				<button class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors" onclick={() => isAddModalOpen = false}>
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<!-- Modal Body (Scrollable) -->
			<div class="p-8 overflow-y-auto flex-1">
				<form id="add-employee-form" class="space-y-6">
					
					<!-- Personal Information -->
					<div>
						<h3 class="text-sm font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
							<span class="material-symbols-outlined text-lg">person</span>
							Personal Information
						</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="space-y-1.5">
								<label class="text-sm font-bold text-on-surface">First Name</label>
								<input type="text" placeholder="John" class="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
							</div>
							<div class="space-y-1.5">
								<label class="text-sm font-bold text-on-surface">Last Name</label>
								<input type="text" placeholder="Doe" class="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
							</div>
							<div class="space-y-1.5 md:col-span-2">
								<label class="text-sm font-bold text-on-surface">Email Address</label>
								<input type="email" placeholder="john.doe@company.com" class="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
							</div>
						</div>
					</div>

					<div class="h-px bg-surface-container w-full"></div>

					<!-- Employment Details -->
					<div>
						<h3 class="text-sm font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
							<span class="material-symbols-outlined text-lg">work</span>
							Employment Details
						</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="space-y-1.5">
								<label class="text-sm font-bold text-on-surface">Employee ID</label>
								<input type="text" placeholder="EMP-2026..." class="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
							</div>
							<div class="space-y-1.5">
								<label class="text-sm font-bold text-on-surface">Department</label>
								<select class="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-on-surface appearance-none cursor-pointer">
									<option value="" disabled selected>Select Department</option>
									<option value="Engineering">Engineering</option>
									<option value="Design">Design</option>
									<option value="Management">Management</option>
									<option value="Marketing">Marketing</option>
									<option value="Product">Product</option>
								</select>
							</div>
							<div class="space-y-1.5 md:col-span-2">
								<label class="text-sm font-bold text-on-surface">Job Title / Role</label>
								<input type="text" placeholder="e.g. Senior Frontend Developer" class="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm" />
							</div>
							<div class="space-y-1.5 md:col-span-2">
								<label class="text-sm font-bold text-on-surface">Employment Status</label>
								<select class="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-on-surface appearance-none cursor-pointer">
									<option value="Active">Active (Full-Time)</option>
									<option value="Contract">Contract</option>
									<option value="Probation">Probation</option>
								</select>
							</div>
						</div>
					</div>

				</form>
			</div>

			<!-- Modal Footer -->
			<div class="px-8 py-5 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3 z-10">
				<button class="px-6 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors" onclick={() => isAddModalOpen = false}>
					Cancel
				</button>
				<button form="add-employee-form" class="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 shadow-sm transition-colors flex items-center gap-2">
					<span class="material-symbols-outlined text-sm">save</span>
					Save Employee
				</button>
			</div>
		</div>
	</div>
{/if}

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
