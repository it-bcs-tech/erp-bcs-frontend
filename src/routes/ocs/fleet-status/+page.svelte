<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	let units = $derived(data.units || []);
	let summary = $derived(data.summary);
	let meta = $derived(data.meta);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let statusFilter = $state($page.url.searchParams.get('status') || 'All');
	const statusTabs = ['All', 'Available', 'Moving', 'Transit', 'Loading', 'Maintenance', 'Overhaul', 'Accident'];

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

	function handleStatusClick(s: string) {
		statusFilter = s;
		updateQueryParams();
	}

	let totalPages = $derived(Math.max(1, Math.ceil((meta?.total || 0) / (meta?.per_page || 6))));
	let currentPage = $derived(meta?.current_page || 1);

	function goToPage(p: number) {
		if (p < 1 || p > totalPages) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { invalidateAll: true, noScroll: true });
	}

	function getStatusBadge(status: string) {
		switch(status) {
			case 'Moving': return 'text-sky-600 bg-sky-500/10 border-sky-500/20';
			case 'Transit': return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
			case 'Loading': return 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20';
			case 'Available': return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
			case 'Maintenance': return 'text-orange-600 bg-orange-500/10 border-orange-500/20';
			case 'Overhaul': return 'text-rose-600 bg-rose-500/10 border-rose-500/20';
			case 'Accident': return 'text-red-600 bg-red-500/10 border-red-500/20';
			default: return 'text-slate-600 bg-slate-500/10 border-slate-500/20';
		}
	}

	function getStatusDot(status: string) {
		switch(status) {
			case 'Moving': return 'bg-sky-500 animate-pulse';
			case 'Transit': return 'bg-amber-500';
			case 'Loading': return 'bg-indigo-500 animate-pulse';
			case 'Available': return 'bg-emerald-500';
			case 'Maintenance': return 'bg-orange-500';
			case 'Overhaul': return 'bg-rose-500';
			case 'Accident': return 'bg-red-500';
			default: return 'bg-slate-400';
		}
	}
</script>

<svelte:head>
	<title>Fleet Status | OCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">local_shipping</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Live Fleet Status & Kesiapan Armada</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pemantauan ketersediaan unit, status pergerakan live GPS, dan kesiapan operasional seluruh armada
			</p>
		</div>
		<div class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold text-xs">
			<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
			<span>GPS Live Telemetry</span>
		</div>
	</header>

	<!-- Status Summary Cards (Bento) -->
	<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
		{#each [
			{ label: 'Available', count: summary.available, color: 'emerald', icon: 'check_circle' },
			{ label: 'Moving', count: summary.moving, color: 'blue', icon: 'local_shipping' },
			{ label: 'Transit', count: summary.transit, color: 'amber', icon: 'pause_circle' },
			{ label: 'Loading', count: summary.loading, color: 'indigo', icon: 'forklift' },
			{ label: 'Maintenance', count: summary.maintenance, color: 'orange', icon: 'build' },
			{ label: 'Overhaul', count: summary.overhaul, color: 'rose', icon: 'engineering' },
			{ label: 'Accident', count: summary.accident, color: 'red', icon: 'car_crash' },
			{ label: 'Total', count: summary.total, color: 'slate', icon: 'grid_view' },
		] as item}
			<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs hover:border-blue-500/30 transition-all cursor-pointer text-center"
				onclick={() => handleStatusClick(item.label === 'Total' ? 'All' : item.label)}>
				<span class="material-symbols-outlined text-xl text-{item.color}-500 mb-1 block">{item.icon}</span>
				<p class="text-xl font-black text-on-surface">{item.count}</p>
				<p class="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">{item.label}</p>
			</div>
		{/each}
	</div>

	<!-- Unified Filter Bar -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<!-- Segmented Control Status Tabs -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
			{#each statusTabs as tab}
				<button 
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all {statusFilter === tab ? 'bg-blue-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
					onclick={() => handleStatusClick(tab)}>
					{tab}
				</button>
			{/each}
		</div>

		<!-- Search Input -->
		<div class="relative w-full md:w-72">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input 
				type="text" 
				bind:value={searchQuery} 
				oninput={handleSearchInput}
				placeholder="Cari nomor unit, driver, lokasi..." 
				class="w-full bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-medium shadow-xs" 
			/>
		</div>
	</div>

	<!-- Unit Cards Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each units as unit}
			<div class="rounded-2xl bg-surface-container-low p-5 shadow-xs border border-slate-200/60 dark:border-slate-800/60 hover:border-blue-500/30 transition-all cursor-pointer group">
				<div class="flex items-start justify-between mb-4">
					<div class="flex items-center gap-3">
						<div class="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
							<span class="material-symbols-outlined text-xl">local_shipping</span>
						</div>
						<div>
							<p class="text-sm font-bold text-on-surface">{unit.id}</p>
							<p class="text-[11px] text-on-surface-variant font-medium mt-0.5">{unit.brand}</p>
						</div>
					</div>
					<span class="inline-flex items-center gap-1.5 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider border {getStatusBadge(unit.status)}">
						<span class="w-1.5 h-1.5 rounded-full {getStatusDot(unit.status)}"></span> {unit.status}
					</span>
				</div>
				
				<div class="space-y-2 text-xs">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-slate-400 text-sm">person</span>
						<span class="font-medium text-on-surface">{unit.driver !== '-' ? unit.driver : 'Belum Ada Driver'}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-slate-400 text-sm">location_on</span>
						<span class="font-medium text-on-surface truncate">{unit.location}</span>
					</div>
					{#if unit.speed > 0}
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-blue-500 text-sm">speed</span>
							<span class="font-bold text-blue-600">{unit.speed} km/h</span>
						</div>
					{/if}
					{#if unit.do !== '-'}
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-slate-400 text-sm">receipt_long</span>
							<span class="font-bold text-blue-600 font-mono">{unit.do}</span>
						</div>
					{/if}
				</div>

				<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
					<span class="text-[10px] text-on-surface-variant font-medium">Update: {unit.lastUpdate}</span>
					<a href="/fms/live-map?unit={encodeURIComponent(unit.id)}" class="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1 text-[11px] font-bold" title="Lacak di Live Map">
						<span class="material-symbols-outlined text-base">gps_fixed</span>
						<span>Lacak</span>
					</a>
				</div>
			</div>
		{/each}
	</div>

	<!-- Pagination -->
	<div class="flex items-center justify-center gap-1 py-4">
		<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
			<span class="material-symbols-outlined text-lg">chevron_left</span>
		</button>
		{#each Array(totalPages) as _, i}
			<button class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition-colors {currentPage === i + 1 ? 'bg-blue-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}" onclick={() => goToPage(i + 1)}>
				{i + 1}
			</button>
		{/each}
		<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>
			<span class="material-symbols-outlined text-lg">chevron_right</span>
		</button>
	</div>
</div>

<style>
	.hide-scrollbar::-webkit-scrollbar { display: none; }
	.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
