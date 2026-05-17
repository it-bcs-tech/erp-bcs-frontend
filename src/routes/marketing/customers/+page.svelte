<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	
	let customers = $derived(data.customers || []);
	let metrics = $derived(data.metrics);
	let meta = $derived(data.meta);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let typeFilter = $state($page.url.searchParams.get('type') || 'All');
	let tierFilter = $state($page.url.searchParams.get('tier') || 'All');
	
	let searchTimer: ReturnType<typeof setTimeout>;

	function updateQueryParams() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');
		if (typeFilter && typeFilter !== 'All') url.searchParams.set('type', typeFilter);
		else url.searchParams.delete('type');
		if (tierFilter && tierFilter !== 'All') url.searchParams.set('tier', tierFilter);
		else url.searchParams.delete('tier');
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

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};

	function getTierColor(tier: string) {
		switch(tier) {
			case 'Platinum': return 'bg-violet-500/10 text-violet-600 border-violet-500/20';
			case 'Gold': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
			case 'Silver': return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
			default: return 'bg-surface-container-high text-on-surface-variant border-surface-container';
		}
	}
</script>

<svelte:head>
	<title>Customers | Marketing</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header & Actions -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Customer Management</h1>
			<p class="text-on-surface-variant font-medium text-sm">Manage client profiles, contracts, and payment terms</p>
		</div>
		<div class="flex gap-3">
			<button class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container-low transition-colors">
				<span class="material-symbols-outlined text-lg">download</span>
				Export
			</button>
			<button class="bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-rose-700 transition-colors">
				<span class="material-symbols-outlined text-lg">person_add</span>
				Add Customer
			</button>
		</div>
	</header>

	<!-- Metrics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-sm">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Customers</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-on-surface">{metrics.total}</h3>
				<span class="material-symbols-outlined text-3xl text-surface-variant">groups</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-emerald-500/20 shadow-sm">
			<p class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Active</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-emerald-600">{metrics.active}</h3>
				<span class="material-symbols-outlined text-3xl text-emerald-500/50">check_circle</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-blue-500/20 shadow-sm">
			<p class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Corporate</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-blue-600">{metrics.corporate}</h3>
				<span class="material-symbols-outlined text-3xl text-blue-500/50">domain</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-amber-500/20 shadow-sm">
			<p class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">SME / Retail</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-amber-600">{metrics.sme}</h3>
				<span class="material-symbols-outlined text-3xl text-amber-500/50">storefront</span>
			</div>
		</div>
	</div>

	<!-- Filters & Search -->
	<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
		<div class="flex gap-3">
			<select bind:value={typeFilter} onchange={handleFilterChange}
				class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium shadow-sm appearance-none cursor-pointer">
				<option value="All">All Types</option>
				<option value="Corporate">Corporate</option>
				<option value="SME">SME</option>
			</select>
			<select bind:value={tierFilter} onchange={handleFilterChange}
				class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium shadow-sm appearance-none cursor-pointer">
				<option value="All">All Tiers</option>
				<option value="Platinum">Platinum</option>
				<option value="Gold">Gold</option>
				<option value="Silver">Silver</option>
				<option value="Standard">Standard</option>
			</select>
		</div>
		<div class="relative w-full lg:w-72 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input type="text" bind:value={searchQuery} oninput={handleSearchInput}
				placeholder="Search customer or contact..." 
				class="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium shadow-sm" />
		</div>
	</div>

	<!-- Data Table -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse min-w-[1100px]">
				<thead>
					<tr class="border-b border-surface-container sticky top-0 bg-surface-container-lowest z-10">
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Customer</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Contact Person</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Terms & Tier</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Performance</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each customers as cust}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-4 px-6">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
										<span class="material-symbols-outlined text-[20px]">{cust.type === 'Corporate' ? 'domain' : 'storefront'}</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{cust.name}</p>
										<div class="flex items-center gap-2 mt-0.5">
											<span class="text-[10px] font-medium text-on-surface-variant/70 uppercase tracking-widest">{cust.id}</span>
											<span class="text-[9px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">{cust.sector}</span>
										</div>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<p class="text-sm font-bold text-on-surface">{cust.contactPerson}</p>
								<p class="text-[11px] text-on-surface-variant mt-0.5">{cust.email}</p>
								<p class="text-[11px] text-on-surface-variant mt-0.5">{cust.phone}</p>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1.5">
									<span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border w-fit {getTierColor(cust.tier)}">
										{#if cust.tier === 'Platinum'}<span class="material-symbols-outlined text-[12px]">diamond</span>{/if}
										{#if cust.tier === 'Gold'}<span class="material-symbols-outlined text-[12px]">stars</span>{/if}
										{cust.tier}
									</span>
									<span class="text-[11px] font-medium text-on-surface-variant">{cust.term}</span>
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1">
									<span class="text-sm font-bold text-on-surface">{cust.totalOrders} Orders</span>
									<span class="text-[11px] font-medium text-on-surface-variant">{formatCurrency(cust.totalRevenue)}</span>
								</div>
							</td>
							<td class="py-4 px-6">
								{#if cust.status === 'Active'}
									<span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px] bg-slate-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-slate-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
									</span>
								{/if}
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
