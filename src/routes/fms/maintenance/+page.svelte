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
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">build</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Maintenance & Perbaikan Armada</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Monitor unit armada yang sedang dalam perbaikan, jadwal servis berkala, dan riwayat work order
			</p>
		</div>
		<div class="flex gap-2.5">
			<button class="bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container transition-colors shadow-xs">
				<span class="material-symbols-outlined text-lg">download</span>
				<span>Export</span>
			</button>
		</div>
	</header>

	<!-- Metrics Cards (Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Overdue</p>
					<h3 class="text-2xl font-black text-rose-600 mt-1">{metrics.overdue}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">error</span>
				</div>
			</div>
			<p class="text-xs text-rose-600 font-medium mt-2">Melewati batas estimasi</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">In Progress</p>
					<h3 class="text-2xl font-black text-blue-600 mt-1">{metrics.inProgress}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">autorenew</span>
				</div>
			</div>
			<p class="text-xs text-blue-600 font-medium mt-2">Sedang dikerjakan mekanik</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Scheduled</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{metrics.scheduled}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">event</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 font-medium mt-2">Jadwal servis preventif</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Selesai Bulan Ini</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">{metrics.completedThisMonth}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">task_alt</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 font-medium mt-2">Unit siap operasi kembali</p>
		</div>
	</div>

	<!-- Unified Filter & Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
		<!-- Tabs (Segmented Control Status Perbaikan) -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
			{#each ['All', 'Overdue', 'In Progress', 'Scheduled', 'Completed'] as st}
				<button
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {statusFilter === st
						? 'bg-surface text-blue-600 dark:text-blue-400 shadow-xs'
						: 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => { statusFilter = st; handleStatusChange(); }}
				>
					{st === 'All' ? 'Semua Status' : st}
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
				placeholder="Cari nopol unit, mekanik, jenis servis..." 
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-slate-400"
			/>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[1000px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Detail Work Order</th>
						<th class="py-3.5 px-5">Unit & Mekanik</th>
						<th class="py-3.5 px-5">Timeline & Estimasi</th>
						<th class="py-3.5 px-5">Prioritas</th>
						<th class="py-3.5 px-5">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each records as rec}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-3.5 px-5">
								<div class="flex flex-col gap-0.5">
									<span class="text-[10px] font-black tracking-widest uppercase text-on-surface-variant/70 font-mono">{rec.id}</span>
									<p class="text-sm font-bold text-on-surface">{rec.type}</p>
									<p class="text-[11px] font-medium text-on-surface-variant truncate max-w-[200px]" title={rec.notes}>{rec.notes}</p>
								</div>
							</td>
							<td class="py-3.5 px-5">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
										<span class="material-symbols-outlined text-[18px]">local_shipping</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{rec.vehicle}</p>
										<p class="text-[11px] font-medium text-on-surface-variant mt-0.5">{rec.mechanic}</p>
									</div>
								</div>
							</td>
							<td class="py-3.5 px-5">
								<div class="flex flex-col gap-0.5">
									<span class="text-sm font-bold text-on-surface">{rec.scheduledDate}</span>
									{#if rec.completedDate !== '-'}
										<span class="text-[11px] font-medium text-emerald-600 mt-0.5">Selesai: {rec.completedDate}</span>
									{:else}
										<span class="text-[11px] font-medium text-on-surface-variant mt-0.5">Est. {rec.cost}</span>
									{/if}
								</div>
							</td>
							<td class="py-3.5 px-5">
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
							<td class="py-3.5 px-5">
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
						</tr>
					{:else}
						<tr>
							<td colspan="5" class="py-20 text-center">
								<span class="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">build</span>
								<p class="text-on-surface-variant font-semibold">Tidak ada catatan perbaikan armada</p>
								<p class="text-xs text-on-surface-variant/60 mt-1">Coba ubah filter atau kata kunci pencarian</p>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		
		<!-- Pagination Footer -->
		<div class="px-5 py-3.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
			<p class="text-xs text-on-surface-variant font-medium">
				Menampilkan <span class="font-bold text-on-surface">{startItem}–{endItem}</span> dari <span class="font-bold text-on-surface">{meta?.total || 0}</span> catatan servis
			</p>
			<div class="flex gap-1">
				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors" 
					disabled={currentPage <= 1}
					onclick={() => goToPage(currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				{#each Array(totalPages) as _, i}
					<button 
						class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition-colors {currentPage === i + 1 ? 'bg-blue-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}"
						onclick={() => goToPage(i + 1)}>
						{i + 1}
					</button>
				{/each}
				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors" 
					disabled={currentPage >= totalPages}
					onclick={() => goToPage(currentPage + 1)}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>
