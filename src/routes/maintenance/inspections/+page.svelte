<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data } = $props();
	
	let records = $derived(data.records);
	let metrics = $derived(data.metrics);
	let meta = $derived(data.meta);
	
	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let statusFilter = $state($page.url.searchParams.get('status') || 'All');
	
	function applyFilters() {
		const url = new URL($page.url);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');
		
		if (statusFilter !== 'All') url.searchParams.set('status', statusFilter);
		else url.searchParams.delete('status');
		
		url.searchParams.delete('page');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}
	
	function changePage(newPage: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', newPage.toString());
		goto(url.toString());
	}

	function getStatusColor(status: string) {
		const s = status.toLowerCase();
		if (s.includes('open')) return 'bg-amber-100 text-amber-800 border-amber-200';
		if (s.includes('proses') || s.includes('progress')) return 'bg-blue-100 text-blue-800 border-blue-200';
		if (s.includes('close') || s.includes('complete')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
		if (s.includes('cancel')) return 'bg-slate-100 text-slate-800 border-slate-200';
		if (s.includes('overdue')) return 'bg-rose-100 text-rose-800 border-rose-200';
		return 'bg-slate-100 text-slate-800 border-slate-200';
	}
	
	function getPriorityIcon(priority: string) {
		const p = priority.toLowerCase();
		if (p.includes('high') || p.includes('urgent') || p.includes('breakdown')) return 'error';
		if (p.includes('medium')) return 'warning';
		return 'info';
	}
</script>

<svelte:head>
	<title>Inspections | Maintenance</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-sky-600 dark:text-sky-400 text-2xl">fact_check</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Inspeksi Kelayakan Armada</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pencatatan hasil cek fisik kendaraan, temuan kerusakan supir di lapangan, dan penerbitan WO
			</p>
		</div>
		<div class="flex gap-3">
			<a href="/maintenance/inspections/create" class="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors">
				<span class="material-symbols-outlined text-lg">add</span>
				<span>Catat Temuan Baru</span>
			</a>
		</div>
	</header>

	<!-- Metrics Quick View (Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Inspeksi</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-on-surface font-mono">{meta.total}</h3>
				<span class="material-symbols-outlined text-3xl text-on-surface-variant/40">fact_check</span>
			</div>
		</div>
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Temuan Terbuka (Open)</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-amber-600 font-mono">{meta.total - metrics.completedThisMonth}</h3>
				<span class="material-symbols-outlined text-3xl text-amber-500/40">warning</span>
			</div>
		</div>
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Overdue (Terlewat)</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-rose-600 font-mono">{metrics.overdue}</h3>
				<span class="material-symbols-outlined text-3xl text-rose-500/40">error</span>
			</div>
		</div>
	</div>

	<!-- Search & Filter Bar -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
		<div class="relative flex-1">
			<span class="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-base">search</span>
			<input 
				type="text" 
				placeholder="Cari nomor unit / ID inspeksi..." 
				class="w-full bg-surface border border-slate-200 dark:border-slate-800 text-on-surface rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-xs"
				bind:value={searchQuery}
				onkeydown={(e) => e.key === 'Enter' && applyFilters()}
			/>
		</div>
		<select 
			bind:value={statusFilter}
			onchange={applyFilters}
			class="bg-surface border border-slate-200 dark:border-slate-800 text-on-surface rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-xs min-w-[150px] cursor-pointer"
		>
			<option value="All">Semua Status</option>
			<option value="Open">Open</option>
			<option value="In Progress">Progress</option>
			<option value="Closed">Closed</option>
		</select>
	</div>

	<!-- Cards List -->
	<div class="flex-1 px-6 lg:px-8 pb-8">
		{#if records.length === 0}
			<div class="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-surface-container rounded-3xl">
				<div class="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-4">
					<span class="material-symbols-outlined text-4xl text-on-surface-variant/50">search_off</span>
				</div>
				<p class="text-lg text-on-surface font-bold">Tidak ada data ditemukan</p>
				<p class="text-sm text-on-surface-variant mt-2 max-w-md">Tidak ada inspeksi yang cocok dengan filter atau kata kunci yang Anda masukkan.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{#each records as rec}
				<a href={`/maintenance/inspections/${encodeURIComponent(rec.id)}`} class="block bg-surface p-4 rounded-3xl border border-surface-container shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
					<div class="absolute right-0 top-0 w-16 h-16 bg-gradient-to-bl from-surface-container-high to-transparent opacity-50 rounded-bl-full"></div>
					
					<div class="flex justify-between items-start mb-3 relative z-10">
						<div>
							<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider {getStatusColor(rec.status)} mb-2">
								{rec.status}
							</span>
							<h3 class="text-lg font-black text-on-surface leading-tight">{rec.vehicle}</h3>
							<p class="text-[10px] font-bold text-primary mt-0.5">{rec.id}</p>
						</div>
						<div class="flex flex-col items-end">
							<span class="material-symbols-outlined text-[18px] text-on-surface-variant mb-1">{getPriorityIcon(rec.priority)}</span>
							<p class="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">{rec.priority}</p>
						</div>
					</div>
					
					<p class="text-sm text-on-surface-variant line-clamp-2 mb-3 bg-surface-container-lowest p-2 rounded-xl">
						<span class="font-bold text-on-surface">Keluhan:</span> {rec.type}
					</p>
					
					<div class="flex items-center justify-between text-xs text-on-surface-variant border-t border-surface-container pt-3">
						<div class="flex items-center gap-1.5">
							<span class="material-symbols-outlined text-[14px]">calendar_today</span>
							<span class="font-medium">{rec.scheduledDate}</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="material-symbols-outlined text-[14px]">engineering</span>
							<span class="font-medium line-clamp-1 max-w-[100px]">{rec.mechanic}</span>
						</div>
					</div>
				</a>
			{/each}
			</div>
		{/if}
	</div>

	<!-- Mobile Pagination -->
	{#if meta.total > meta.per_page}
		<div class="p-4 border-t border-surface-container bg-surface flex items-center justify-between">
			<p class="text-xs text-on-surface-variant font-medium">Hal {meta.current_page} dari {Math.ceil(meta.total / meta.per_page)}</p>
			<div class="flex gap-2">
				<button 
					disabled={meta.current_page === 1}
					onclick={() => changePage(meta.current_page - 1)}
					class="w-8 h-8 rounded-full border border-surface-container flex items-center justify-center text-on-surface disabled:opacity-30 active:bg-surface-container"
				>
					<span class="material-symbols-outlined text-sm">chevron_left</span>
				</button>
				<button 
					disabled={meta.current_page >= Math.ceil(meta.total / meta.per_page)}
					onclick={() => changePage(meta.current_page + 1)}
					class="w-8 h-8 rounded-full border border-surface-container flex items-center justify-center text-on-surface disabled:opacity-30 active:bg-surface-container"
				>
					<span class="material-symbols-outlined text-sm">chevron_right</span>
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Hide scrollbar for horizontal scrolling metrics but keep functionality */
	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.hide-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
