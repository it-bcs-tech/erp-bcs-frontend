<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	
	let vehicles = $derived(data.vehicles || []);
	let meta = $derived(data.meta);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let activeFilter = $state($page.url.searchParams.get('type') || 'All');
	const filters = ['All', 'Heavy Truck', 'Box Truck', 'Delivery Van', 'Pickup'];
	
	let searchTimer: ReturnType<typeof setTimeout>;

	function updateQueryParams() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');
		
		if (activeFilter && activeFilter !== 'All') url.searchParams.set('type', activeFilter);
		else url.searchParams.delete('type');
		
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

	let totalPages = $derived(Math.max(1, Math.ceil((meta?.total || 0) / (meta?.per_page || 5))));
	let currentPage = $derived(meta?.current_page || 1);
	let startItem = $derived(meta?.total === 0 ? 0 : ((currentPage - 1) * (meta?.per_page || 5)) + 1);
	let endItem = $derived(Math.min(currentPage * (meta?.per_page || 5), meta?.total || 0));

	function goToPage(page: number) {
		if (page < 1 || page > totalPages) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', page.toString());
		goto(url.toString(), { invalidateAll: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Vehicles | FMS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header & Actions -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Fleet Roster</h1>
			<p class="text-on-surface-variant font-medium text-sm">Manage, track, and assign vehicles across operations</p>
		</div>
		<div class="flex gap-3">
			<button class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container-low transition-colors">
				<span class="material-symbols-outlined text-lg">filter_list</span>
				Filter
			</button>
			<button class="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-blue-700 transition-colors">
				<span class="material-symbols-outlined text-lg">add_circle</span>
				Add Vehicle
			</button>
		</div>
	</header>

	<!-- Search and Tabs -->
	<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
		<!-- Tabs -->
		<div class="flex gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar max-w-full">
			{#each filters as filter}
				<button 
					class="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors {activeFilter === filter ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-on-surface-variant hover:bg-surface-container'}"
					onclick={() => handleFilterClick(filter)}
				>
					{filter}
				</button>
			{/each}
		</div>

		<!-- Search -->
		<div class="relative w-full lg:w-72 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input 
				type="text" 
				bind:value={searchQuery}
				oninput={handleSearchInput}
				placeholder="Search plate or ID..." 
				class="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium"
			/>
		</div>
	</div>

	<!-- Directory Table -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="border-b border-surface-container sticky top-0 bg-surface-container-lowest z-10">
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Vehicle Info</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Type & Spec</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each vehicles as vhc}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-4 px-6">
								<div class="flex items-center gap-4">
									<div class="w-12 h-12 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant group-hover:bg-{vhc.color}-100 group-hover:text-{vhc.color}-600 transition-colors shadow-sm">
										<span class="material-symbols-outlined text-[24px]">{vhc.type.includes('Truck') ? 'local_shipping' : 'airport_shuttle'}</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface group-hover:text-blue-600 transition-colors">{vhc.plateNumber}</p>
										<p class="text-xs text-on-surface-variant font-medium mt-0.5">{vhc.id}</p>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<p class="text-sm font-bold text-on-surface">{vhc.brand} ({vhc.year})</p>
								<div class="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
									{vhc.type}
								</div>
							</td>
							<td class="py-4 px-6">
								{#if vhc.status === 'In Transit'}
									<span class="inline-flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {vhc.status}
									</span>
								{:else if vhc.status === 'Maintenance'}
									<span class="inline-flex items-center gap-2 text-rose-600 font-bold text-xs bg-rose-100 dark:bg-rose-900/30 px-3 py-1.5 rounded-full">
										<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> {vhc.status}
									</span>
								{:else}
									<span class="inline-flex items-center gap-2 text-amber-600 font-bold text-xs bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-full">
										<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {vhc.status}
									</span>
								{/if}
							</td>
							<td class="py-4 px-6 text-right">
								<div class="flex items-center justify-end gap-2">
									<button class="p-2 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors tooltip" title="View Details">
										<span class="material-symbols-outlined text-[20px]">visibility</span>
									</button>
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

<style>
	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.hide-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
