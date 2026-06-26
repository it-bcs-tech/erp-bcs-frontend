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

<div class="flex flex-col h-full bg-surface relative min-h-screen">
	<!-- Header -->
	<header class="p-6 lg:p-8 bg-surface border-b border-surface-container sticky top-0 z-30">
		<div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
			<div>
				<h1 class="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight mb-1">Inspections</h1>
				<p class="text-sm font-medium text-on-surface-variant">Catat temuan & buat Work Order dari lapangan</p>
			</div>
			<a href="/maintenance/inspections/create" class="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 self-start md:self-auto">
				<span class="material-symbols-outlined text-[18px]">add</span>
				<span>New Work Order</span>
			</a>
		</div>
		
		<!-- Search & Filter Bar -->
		<div class="flex flex-col md:flex-row gap-3">
			<div class="relative flex-1 max-w-2xl">
				<span class="absolute left-3 top-2.5 material-symbols-outlined text-on-surface-variant/50 text-[20px]">search</span>
				<input 
					type="text" 
					placeholder="Cari No Unit / WO..." 
					class="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/50 font-medium transition-all"
					bind:value={searchQuery}
					onkeydown={(e) => e.key === 'Enter' && applyFilters()}
				/>
			</div>
			<select 
				bind:value={statusFilter}
				onchange={applyFilters}
				class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold transition-all min-w-[150px]"
			>
				<option value="All">Semua Status</option>
				<option value="Open">Open</option>
				<option value="In Progress">Progress</option>
				<option value="Closed">Closed</option>
			</select>
		</div>
	</header>

	<!-- Metrics Quick View -->
	<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 p-6 lg:px-8">
		<div class="bg-surface-container-lowest p-4 lg:p-5 rounded-2xl border border-surface-container shadow-sm flex flex-col justify-between">
			<p class="text-[10px] lg:text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Inspections</p>
			<h3 class="text-2xl lg:text-3xl font-black text-on-surface">{meta.total}</h3>
		</div>
		<div class="bg-amber-50 dark:bg-amber-900/10 p-4 lg:p-5 rounded-2xl border border-amber-200/50 shadow-sm flex flex-col justify-between">
			<p class="text-[10px] lg:text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">Open Issues</p>
			<h3 class="text-2xl lg:text-3xl font-black text-amber-700 dark:text-amber-400">{meta.total - metrics.completedThisMonth}</h3>
		</div>
		<div class="bg-rose-50 dark:bg-rose-900/10 p-4 lg:p-5 rounded-2xl border border-rose-200/50 shadow-sm flex flex-col justify-between">
			<p class="text-[10px] lg:text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-2">Overdue</p>
			<h3 class="text-2xl lg:text-3xl font-black text-rose-700 dark:text-rose-400">{metrics.overdue}</h3>
		</div>
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
