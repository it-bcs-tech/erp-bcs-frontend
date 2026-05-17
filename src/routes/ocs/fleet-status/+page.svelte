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

<div class="flex flex-col h-full">
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Fleet Status</h1>
			<p class="text-on-surface-variant font-medium text-sm">Unit availability, location tracking, and operational readiness</p>
		</div>
		<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
			<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
			<span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Live Data</span>
		</div>
	</header>

	<!-- Status Summary Cards -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
		{#each [
			{ label: 'Available', count: summary.available, color: 'emerald', icon: 'check_circle' },
			{ label: 'Moving', count: summary.moving, color: 'sky', icon: 'local_shipping' },
			{ label: 'Transit', count: summary.transit, color: 'amber', icon: 'pause_circle' },
			{ label: 'Loading', count: summary.loading, color: 'indigo', icon: 'forklift' },
			{ label: 'Maintenance', count: summary.maintenance, color: 'orange', icon: 'build' },
			{ label: 'Overhaul', count: summary.overhaul, color: 'rose', icon: 'engineering' },
			{ label: 'Accident', count: summary.accident, color: 'red', icon: 'car_crash' },
			{ label: 'Total', count: summary.total, color: 'slate', icon: 'grid_view' },
		] as item}
			<div class="bg-surface-container-lowest p-4 rounded-2xl border border-{item.color}-500/20 shadow-sm hover:scale-[1.02] transition-transform duration-300 cursor-pointer text-center">
				<span class="material-symbols-outlined text-xl text-{item.color}-500 mb-1 block">{item.icon}</span>
				<p class="text-xl font-black text-on-surface">{item.count}</p>
				<p class="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">{item.label}</p>
			</div>
		{/each}
	</div>

	<!-- Filters -->
	<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
		<div class="flex gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar max-w-full">
			{#each statusTabs as tab}
				<button 
					class="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors {statusFilter === tab ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300' : 'text-on-surface-variant hover:bg-surface-container'}"
					onclick={() => handleStatusClick(tab)}>
					{tab}
				</button>
			{/each}
		</div>
		<div class="relative w-full lg:w-72 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input type="text" bind:value={searchQuery} oninput={handleSearchInput}
				placeholder="Search unit, driver, location..." 
				class="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-sky-500/50 text-sm font-medium shadow-sm" />
		</div>
	</div>

	<!-- Unit Cards Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
		{#each units as unit}
			<div class="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-pointer group">
				<div class="flex items-start justify-between mb-4">
					<div class="flex items-center gap-3">
						<div class="w-11 h-11 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
							<span class="material-symbols-outlined text-xl">local_shipping</span>
						</div>
						<div>
							<p class="text-sm font-black text-on-surface">{unit.id}</p>
							<p class="text-[10px] text-on-surface-variant font-medium">{unit.brand}</p>
						</div>
					</div>
					<span class="inline-flex items-center gap-1.5 font-bold text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider border {getStatusBadge(unit.status)}">
						<span class="w-1.5 h-1.5 rounded-full {getStatusDot(unit.status)}"></span> {unit.status}
					</span>
				</div>
				
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-[14px] text-on-surface-variant/50">person</span>
						<span class="text-xs font-medium text-on-surface">{unit.driver !== '-' ? unit.driver : 'No Driver Assigned'}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-[14px] text-on-surface-variant/50">location_on</span>
						<span class="text-xs font-medium text-on-surface">{unit.location}</span>
					</div>
					{#if unit.speed > 0}
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-[14px] text-sky-500">speed</span>
							<span class="text-xs font-bold text-sky-600">{unit.speed} km/h</span>
						</div>
					{/if}
					{#if unit.do !== '-'}
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-[14px] text-on-surface-variant/50">receipt_long</span>
							<span class="text-xs font-bold text-sky-600">{unit.do}</span>
						</div>
					{/if}
				</div>

				<div class="mt-4 pt-3 border-t border-surface-container/50 flex items-center justify-between">
					<span class="text-[10px] text-on-surface-variant font-medium">Updated {unit.lastUpdate}</span>
					<button class="p-1.5 rounded-lg text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors opacity-0 group-hover:opacity-100" title="Track Unit">
						<span class="material-symbols-outlined text-[18px]">gps_fixed</span>
					</button>
				</div>
			</div>
		{/each}
	</div>

	<!-- Pagination -->
	<div class="flex items-center justify-center gap-1">
		<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
			<span class="material-symbols-outlined text-lg">chevron_left</span>
		</button>
		{#each Array(totalPages) as _, i}
			<button class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-colors {currentPage === i + 1 ? 'bg-sky-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}" onclick={() => goToPage(i + 1)}>
				{i + 1}
			</button>
		{/each}
		<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>
			<span class="material-symbols-outlined text-lg">chevron_right</span>
		</button>
	</div>
</div>

<style>
	.hide-scrollbar::-webkit-scrollbar { display: none; }
	.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
