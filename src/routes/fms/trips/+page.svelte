<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	
	let trips = $derived(data.trips || []);
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
	<title>Trips & Routes | FMS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header & Actions -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Trips & Routes</h1>
			<p class="text-on-surface-variant font-medium text-sm">Monitor trip progress, dispatches, and delivery routes in real-time</p>
		</div>
		<div class="flex gap-3">
			<button class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container-low transition-colors">
				<span class="material-symbols-outlined text-lg">download</span>
				Export
			</button>
			<button class="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-blue-700 transition-colors">
				<span class="material-symbols-outlined text-lg">add_circle</span>
				New Trip
			</button>
		</div>
	</header>

	<!-- Metrics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-blue-500/20 shadow-sm relative overflow-hidden group">
			<div class="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
			<p class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 relative z-10">Active Trips</p>
			<div class="flex items-end justify-between relative z-10">
				<h3 class="text-3xl font-black text-blue-600">{metrics.activeTrips}</h3>
				<span class="material-symbols-outlined text-3xl text-blue-500/50">near_me</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-emerald-500/20 shadow-sm">
			<p class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Completed</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-emerald-600">{metrics.completedToday}</h3>
				<span class="material-symbols-outlined text-3xl text-emerald-500/50">check_circle</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-amber-500/20 shadow-sm">
			<p class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Scheduled</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-amber-600">{metrics.scheduled}</h3>
				<span class="material-symbols-outlined text-3xl text-amber-500/50">schedule</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-rose-500/20 shadow-sm">
			<p class="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">Delayed</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-rose-600">{metrics.delayed}</h3>
				<span class="material-symbols-outlined text-3xl text-rose-500/50">warning</span>
			</div>
		</div>
	</div>

	<!-- Filters & Search -->
	<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
		<div class="flex gap-3">
			<select 
				bind:value={statusFilter} 
				onchange={handleStatusChange}
				class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium shadow-sm appearance-none cursor-pointer"
			>
				<option value="All">All Status</option>
				<option value="In Transit">In Transit</option>
				<option value="Completed">Completed</option>
				<option value="Scheduled">Scheduled</option>
				<option value="Delayed">Delayed</option>
			</select>
		</div>

		<div class="relative w-full lg:w-72 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input 
				type="text" 
				bind:value={searchQuery}
				oninput={handleSearchInput}
				placeholder="Search trip, vehicle, driver..." 
				class="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium shadow-sm"
			/>
		</div>
	</div>

	<!-- Data Table -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse min-w-[1000px]">
				<thead>
					<tr class="border-b border-surface-container sticky top-0 bg-surface-container-lowest z-10">
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Trip & Vehicle</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Route</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Progress</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each trips as trip}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-4 px-6">
								<div class="flex flex-col gap-2">
									<span class="text-[10px] font-black tracking-widest uppercase text-on-surface-variant/70">{trip.id}</span>
									<div class="flex items-center gap-3">
										<div class="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
											<span class="material-symbols-outlined text-[18px]">local_shipping</span>
										</div>
										<div>
											<p class="text-sm font-bold text-on-surface">{trip.vehicle}</p>
											<p class="text-[11px] font-medium text-on-surface-variant">{trip.driver}</p>
										</div>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1.5">
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-[14px] text-emerald-500">trip_origin</span>
										<span class="text-xs font-medium text-on-surface truncate max-w-[180px]" title={trip.origin}>{trip.origin}</span>
									</div>
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-[14px] text-rose-500">location_on</span>
										<span class="text-xs font-medium text-on-surface truncate max-w-[180px]" title={trip.destination}>{trip.destination}</span>
									</div>
									<span class="text-[10px] font-medium text-on-surface-variant">{trip.distance} • {trip.cargo}</span>
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col gap-2 w-32">
									<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
										{#if trip.status === 'Delayed'}
											<div class="bg-rose-500 h-full rounded-full transition-all duration-500" style="width: {trip.progress}%"></div>
										{:else if trip.status === 'Completed'}
											<div class="bg-emerald-500 h-full rounded-full transition-all duration-500" style="width: {trip.progress}%"></div>
										{:else}
											<div class="bg-blue-500 h-full rounded-full transition-all duration-500" style="width: {trip.progress}%"></div>
										{/if}
									</div>
									<div class="flex items-center justify-between">
										<span class="text-[10px] font-bold text-on-surface-variant">{trip.progress}%</span>
										<span class="text-[10px] font-medium text-on-surface-variant">ETA: {trip.eta.split(' ')[1]}</span>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								{#if trip.status === 'In Transit'}
									<span class="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[11px] bg-blue-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-blue-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> In Transit
									</span>
								{:else if trip.status === 'Completed'}
									<span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Completed
									</span>
								{:else if trip.status === 'Delayed'}
									<span class="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-[11px] bg-rose-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-rose-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Delayed
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px] bg-amber-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Scheduled
									</span>
								{/if}
							</td>
							<td class="py-4 px-6 text-right">
								<div class="flex items-center justify-end gap-2">
									<button class="p-2 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors" title="Track Live">
										<span class="material-symbols-outlined text-[20px]">my_location</span>
									</button>
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
