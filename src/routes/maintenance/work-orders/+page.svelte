<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	
	let records = $derived(data.records || []);
	let metrics = $derived(data.metrics);
	let meta = $derived(data.meta);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let statusFilter = $state($page.url.searchParams.get('status') || 'All');
	
	let searchTimer: ReturnType<typeof setTimeout>;

	function updateQueryParams() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');
		if (statusFilter && statusFilter !== 'All') url.searchParams.set('status', statusFilter);
		else url.searchParams.delete('status');
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(updateQueryParams, 400);
	}

	function handleStatusChange() {
		updateQueryParams();
	}

	let totalPages = $derived(Math.max(1, Math.ceil((meta?.total || 0) / (meta?.per_page || 5))));
	let currentPage = $derived(meta?.current_page || 1);
	let startItem = $derived(meta?.total === 0 ? 0 : ((currentPage - 1) * (meta?.per_page || 5)) + 1);
	let endItem = $derived(Math.min(currentPage * (meta?.per_page || 5), meta?.total || 0));

	function goToPage(p: number) {
		if (p < 1 || p > totalPages) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { invalidateAll: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Maintenance | FMS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-sky-600 dark:text-sky-400 text-2xl">engineering</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Perawatan & Work Orders (SPK)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Jadwalkan servis berkala, catat perbaikan kerusakan armada, dan evaluasi riwayat perawatan kendaraan
			</p>
		</div>
		<div class="flex gap-3">
			<a href="/maintenance/work-orders/create" class="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors">
				<span class="material-symbols-outlined text-lg">add</span>
				<span>Buat SPK / WO</span>
			</a>
		</div>
	</header>

	<!-- Metrics Cards (Bento) -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Overdue (Terlewat)</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-rose-600 font-mono">{metrics.overdue}</h3>
				<span class="material-symbols-outlined text-3xl text-rose-500/40">error</span>
			</div>
		</div>
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-xs font-bold text-sky-600 uppercase tracking-wider mb-1">Sedang Dikerjakan</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-sky-600 font-mono">{metrics.inProgress}</h3>
				<span class="material-symbols-outlined text-3xl text-sky-500/40">autorenew</span>
			</div>
		</div>
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Terjadwal</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-amber-600 font-mono">{metrics.scheduled}</h3>
				<span class="material-symbols-outlined text-3xl text-amber-500/40">event</span>
			</div>
		</div>
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Selesai Bulan Ini</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-emerald-600 font-mono">{metrics.completedThisMonth}</h3>
				<span class="material-symbols-outlined text-3xl text-emerald-500/40">task_alt</span>
			</div>
		</div>
	</div>

	<!-- Table Container with Filter Header -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<!-- Filters & Search Bar -->
		<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-3">
			<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
				{#each ['All', 'Overdue', 'In Progress', 'Scheduled', 'Completed'] as st}
					<button
						onclick={() => { statusFilter = st; handleStatusChange(); }}
						class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all {statusFilter === st ? 'bg-sky-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
					>
						{st === 'All' ? 'Semua Status' : st}
					</button>
				{/each}
			</div>

			<div class="relative w-full sm:w-72 flex-shrink-0">
				<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">search</span>
				<input 
					type="text" 
					bind:value={searchQuery}
					oninput={handleSearchInput}
					placeholder="Cari armada, jenis servis..." 
					class="w-full bg-surface border border-slate-200 dark:border-slate-800 text-on-surface rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-xs"
				/>
			</div>
		</div>

		<!-- Data Table -->
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Informasi Servis (WO)</th>
						<th class="py-3.5 px-5">Kendaraan & Montir</th>
						<th class="py-3.5 px-5">Jadwal & Biaya</th>
						<th class="py-3.5 px-5">Prioritas</th>
						<th class="py-3.5 px-5 text-center">Status</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each records as rec}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1.5">
									<span class="text-[10px] font-black tracking-widest uppercase text-on-surface-variant/70">{rec.id}</span>
									<p class="text-sm font-bold text-on-surface">{rec.type}</p>
									<p class="text-[11px] font-medium text-on-surface-variant truncate max-w-[200px]" title={rec.notes}>{rec.notes}</p>
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
										<span class="material-symbols-outlined text-[18px]">local_shipping</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{rec.vehicle}</p>
										<p class="text-[11px] font-medium text-on-surface-variant">{rec.mechanic}</p>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col">
									<span class="text-sm font-bold text-on-surface">{rec.scheduledDate}</span>
									{#if rec.completedDate !== '-'}
										<span class="text-[11px] font-medium text-emerald-600 mt-0.5">Done: {rec.completedDate}</span>
									{:else}
										<span class="text-[11px] font-medium text-on-surface-variant mt-0.5">Est. {rec.cost}</span>
									{/if}
								</div>
							</td>
							<td class="py-4 px-6">
								{#if rec.priority === 'High'}
									<span class="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-[11px] bg-rose-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-rose-500/20">
										<span class="material-symbols-outlined text-[12px]">arrow_upward</span> High
									</span>
								{:else if rec.priority === 'Medium'}
									<span class="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px] bg-amber-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-500/20">
										<span class="material-symbols-outlined text-[12px]">remove</span> Medium
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px] bg-slate-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-slate-500/20">
										<span class="material-symbols-outlined text-[12px]">arrow_downward</span> Low
									</span>
								{/if}
							</td>
							<td class="py-4 px-6">
								{#if rec.status?.toLowerCase().includes('open') || rec.status?.toLowerCase().includes('overdue')}
									<span class="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-[11px] bg-rose-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-rose-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> {rec.status}
									</span>
								{:else if rec.status?.toLowerCase().includes('proses') || rec.status?.toLowerCase().includes('progress')}
									<span class="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[11px] bg-blue-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-blue-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> {rec.status}
									</span>
								{:else if rec.status?.toLowerCase().includes('close') || rec.status?.toLowerCase().includes('complete')}
									<span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {rec.status}
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px] bg-slate-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-slate-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span> {rec.status}
									</span>
								{/if}
							</td>
							<td class="py-4 px-6 text-right">
								<div class="flex items-center justify-end gap-2">
									<a href={`/maintenance/work-orders/${encodeURIComponent(rec.id)}`} class="inline-block p-2 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors" title="View Details">
										<span class="material-symbols-outlined text-[20px]">visibility</span>
									</a>
									<button class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors" title="More Options">
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
					<button 
						class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-colors {currentPage === i + 1 ? 'bg-blue-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}"
						onclick={() => goToPage(i + 1)}>
						{i + 1}
					</button>
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
