<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	
	let orders = $derived(data.orders || []);
	let metrics = $derived(data.metrics);
	let meta = $derived(data.meta);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let statusFilter = $state($page.url.searchParams.get('status') || 'All');
	const statusTabs = ['All', 'Pending', 'Confirmed', 'In Transit', 'Completed', 'Cancelled'];
	
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

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};

	function getStatusBadge(status: string) {
		switch(status) {
			case 'Pending': return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
			case 'Confirmed': return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20';
			case 'In Transit': return 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
			case 'Completed': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
			case 'Cancelled': return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
			default: return 'text-on-surface-variant bg-surface-container-high border-surface-container';
		}
	}

	function getStatusDot(status: string) {
		switch(status) {
			case 'Pending': return 'bg-amber-500';
			case 'Confirmed': return 'bg-blue-500';
			case 'In Transit': return 'bg-indigo-500 animate-pulse';
			case 'Completed': return 'bg-emerald-500';
			case 'Cancelled': return 'bg-rose-500';
			default: return 'bg-slate-400';
		}
	}
</script>

<svelte:head>
	<title>Orders / DO | Marketing</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header & Actions -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Orders / Delivery Orders</h1>
			<p class="text-on-surface-variant font-medium text-sm">Create and manage delivery orders, assign routes, and track shipments</p>
		</div>
		<div class="flex gap-3">
			<button class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container-low transition-colors">
				<span class="material-symbols-outlined text-lg">download</span>
				Export
			</button>
			<button class="bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-rose-700 transition-colors">
				<span class="material-symbols-outlined text-lg">note_add</span>
				New Order
			</button>
		</div>
	</header>

	<!-- Metrics Cards -->
	<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container shadow-sm text-center">
			<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total</p>
			<h3 class="text-2xl font-black text-on-surface">{metrics.totalOrders}</h3>
		</div>
		<div class="bg-surface-container-lowest p-4 rounded-2xl border border-amber-500/20 shadow-sm text-center">
			<p class="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Pending</p>
			<h3 class="text-2xl font-black text-amber-600">{metrics.pending}</h3>
		</div>
		<div class="bg-surface-container-lowest p-4 rounded-2xl border border-blue-500/20 shadow-sm text-center">
			<p class="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Confirmed</p>
			<h3 class="text-2xl font-black text-blue-600">{metrics.confirmed}</h3>
		</div>
		<div class="bg-surface-container-lowest p-4 rounded-2xl border border-indigo-500/20 shadow-sm text-center">
			<p class="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">In Transit</p>
			<h3 class="text-2xl font-black text-indigo-600">{metrics.inTransit}</h3>
		</div>
		<div class="bg-surface-container-lowest p-4 rounded-2xl border border-emerald-500/20 shadow-sm text-center">
			<p class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Completed</p>
			<h3 class="text-2xl font-black text-emerald-600">{metrics.completed}</h3>
		</div>
	</div>

	<!-- Search and Tabs -->
	<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
		<div class="flex gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar max-w-full">
			{#each statusTabs as tab}
				<button 
					class="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors {statusFilter === tab ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' : 'text-on-surface-variant hover:bg-surface-container'}"
					onclick={() => handleStatusClick(tab)}>
					{tab}
				</button>
			{/each}
		</div>
		<div class="relative w-full lg:w-72 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input type="text" bind:value={searchQuery} oninput={handleSearchInput}
				placeholder="Search DO, customer, route..." 
				class="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium shadow-sm" />
		</div>
	</div>

	<!-- Data Table -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse min-w-[1200px]">
				<thead>
					<tr class="border-b border-surface-container sticky top-0 bg-surface-container-lowest z-10">
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Order Info</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Customer</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Route & Cargo</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Schedule</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Tariff</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each orders as order}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1">
									<span class="text-sm font-bold text-on-surface">{order.id}</span>
									<span class="text-[10px] font-medium text-on-surface-variant/70">{order.createdAt}</span>
								</div>
							</td>
							<td class="py-4 px-6">
								<p class="text-sm font-bold text-on-surface">{order.customer}</p>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1">
									<div class="flex items-center gap-1.5">
										<span class="material-symbols-outlined text-[14px] text-rose-500">route</span>
										<span class="text-sm font-bold text-on-surface">{order.origin} → {order.destination}</span>
									</div>
									<div class="flex items-center gap-2 mt-0.5">
										<span class="text-[10px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">{order.cargoType}</span>
										<span class="text-[10px] font-medium text-on-surface-variant">{order.weight}</span>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1">
									<span class="text-[11px] font-medium text-on-surface-variant flex items-center gap-1">
										<span class="material-symbols-outlined text-[14px]">calendar_today</span>
										Load: {order.loadingDate}
									</span>
									<span class="text-[11px] font-medium text-on-surface-variant flex items-center gap-1">
										<span class="material-symbols-outlined text-[14px]">schedule</span>
										ETA: {order.eta}
									</span>
								</div>
							</td>
							<td class="py-4 px-6">
								<span class="text-sm font-black text-rose-600 dark:text-rose-400">{formatCurrency(order.tariff)}</span>
								<p class="text-[10px] font-medium text-on-surface-variant mt-0.5">{order.vehicleType}</p>
							</td>
							<td class="py-4 px-6">
								<span class="inline-flex items-center gap-1.5 font-bold text-[11px] px-2.5 py-1 rounded-md uppercase tracking-wider border {getStatusBadge(order.status)}">
									<span class="w-1.5 h-1.5 rounded-full {getStatusDot(order.status)}"></span> {order.status}
								</span>
							</td>
							<td class="py-4 px-6 text-right">
								<div class="flex items-center justify-end gap-2">
									<button class="p-2 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors" title="View Details">
										<span class="material-symbols-outlined text-[20px]">visibility</span>
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
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				{#each Array(totalPages) as _, i}
					<button class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-colors {currentPage === i + 1 ? 'bg-rose-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}" onclick={() => goToPage(i + 1)}>
						{i + 1}
					</button>
				{/each}
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.hide-scrollbar::-webkit-scrollbar { display: none; }
	.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
