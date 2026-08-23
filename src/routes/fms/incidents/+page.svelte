<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	
	let incidents = $derived(data.incidents || []);
	let metrics = $derived(data.metrics);
	let meta = $derived(data.meta);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let typeFilter = $state($page.url.searchParams.get('type') || 'All');
	let statusFilter = $state($page.url.searchParams.get('status') || 'All');
	
	let searchTimer: ReturnType<typeof setTimeout>;

	function updateQueryParams() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');
		
		if (typeFilter && typeFilter !== 'All') url.searchParams.set('type', typeFilter);
		else url.searchParams.delete('type');

		if (statusFilter && statusFilter !== 'All') url.searchParams.set('status', statusFilter);
		else url.searchParams.delete('status');
		
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(updateQueryParams, 400);
	}

	function handleFilterChange() {
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
	<title>Incident Log | FMS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">report</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Incident Log & Keselamatan</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pelaporan dan pemantauan insiden kecelakaan, kendala armada (breakdown), dan mitigasi risiko logistik
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
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Recorded</p>
					<h3 class="text-2xl font-black text-on-surface mt-1">{metrics.totalIncidents}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">list_alt</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2">Seluruh insiden tercatat</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Open Cases</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{metrics.openCases}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">pending_actions</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 font-medium mt-2">Dalam tahap investigasi</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Accidents</p>
					<h3 class="text-2xl font-black text-rose-600 mt-1">{metrics.accidents}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">car_crash</span>
				</div>
			</div>
			<p class="text-xs text-rose-600 font-medium mt-2">Kejadian laka lantas</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Breakdowns</p>
					<h3 class="text-2xl font-black text-orange-600 mt-1">{metrics.breakdowns}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">car_repair</span>
				</div>
			</div>
			<p class="text-xs text-orange-600 font-medium mt-2">Mogok / kendala teknis</p>
		</div>
	</div>

	<!-- Unified Filter & Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-4 shadow-xs">
		<!-- Row 1: Type Tabs & Search -->
		<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
			<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
				{#each ['All', 'Accident', 'Breakdown', 'Traffic Violation', 'Cargo Damage'] as tf}
					<button
						class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {typeFilter === tf
							? 'bg-surface text-blue-600 dark:text-blue-400 shadow-xs'
							: 'text-on-surface-variant hover:text-on-surface'}"
						onclick={() => { typeFilter = tf; handleFilterChange(); }}
					>
						{tf === 'All' ? 'Semua Jenis Insiden' : tf}
					</button>
				{/each}
			</div>

			<!-- Search Input -->
			<div class="relative w-full lg:w-80 flex-shrink-0">
				<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
				<input 
					type="text" 
					bind:value={searchQuery}
					oninput={handleSearchInput}
					placeholder="Cari ID insiden, driver, lokasi..." 
					class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-slate-400"
				/>
			</div>
		</div>

		<!-- Row 2: Status Tabs -->
		<div class="flex items-center gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
			<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto">
				{#each ['All', 'Under Investigation', 'Resolved'] as sf}
					<button
						class="px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {statusFilter === sf
							? 'bg-surface text-blue-600 dark:text-blue-400 shadow-xs'
							: 'text-on-surface-variant hover:text-on-surface'}"
						onclick={() => { statusFilter = sf; handleFilterChange(); }}
					>
						{sf === 'All' ? 'Semua Status' : sf}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[1000px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Informasi Insiden</th>
						<th class="py-3.5 px-5">Unit & Pengemudi</th>
						<th class="py-3.5 px-5">Lokasi Kejadian</th>
						<th class="py-3.5 px-5">Tingkat Keparahan</th>
						<th class="py-3.5 px-5">Status</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each incidents as inc}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-3.5 px-5">
								<div class="flex flex-col gap-0.5">
									<div class="flex items-center gap-2">
										<span class="text-[10px] font-black tracking-widest uppercase text-on-surface-variant/70 font-mono">{inc.id}</span>
										<span class="text-[10px] font-medium text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">{inc.date}</span>
									</div>
									<p class="text-sm font-bold text-on-surface">{inc.type}</p>
									<p class="text-[11px] font-medium text-on-surface-variant truncate max-w-[250px]" title={inc.description}>{inc.description}</p>
								</div>
							</td>
							<td class="py-3.5 px-5">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
										<span class="material-symbols-outlined text-[18px]">local_shipping</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{inc.vehicle}</p>
										<p class="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider mt-0.5">{inc.driver}</p>
									</div>
								</div>
							</td>
							<td class="py-3.5 px-5">
								<div class="flex items-center gap-2">
									<span class="material-symbols-outlined text-[16px] text-slate-400">location_on</span>
									<span class="text-xs font-medium text-on-surface">{inc.location}</span>
								</div>
							</td>
							<td class="py-3.5 px-5">
								{#if inc.severity === 'Major'}
									<span class="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-[11px] bg-rose-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-rose-500/20">
										<span class="material-symbols-outlined text-[12px]">keyboard_double_arrow_up</span> Major
									</span>
								{:else if inc.severity === 'Moderate'}
									<span class="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px] bg-amber-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-500/20">
										<span class="material-symbols-outlined text-[12px]">keyboard_arrow_up</span> Moderate
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[11px] bg-blue-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-blue-500/20">
										<span class="material-symbols-outlined text-[12px]">remove</span> Minor
									</span>
								{/if}
							</td>
							<td class="py-3.5 px-5">
								{#if inc.status === 'Under Investigation'}
									<span class="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px] bg-amber-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Under Investigation
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Resolved
									</span>
								{/if}
							</td>
							<td class="py-3.5 px-5 text-right">
								<button class="p-2 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer" title="Lihat Detail Insiden">
									<span class="material-symbols-outlined text-[20px]">visibility</span>
								</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="py-20 text-center">
								<span class="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">report</span>
								<p class="text-on-surface-variant font-semibold">Tidak ada log insiden armada</p>
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
				Menampilkan <span class="font-bold text-on-surface">{startItem}–{endItem}</span> dari <span class="font-bold text-on-surface">{meta?.total || 0}</span> insiden
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
