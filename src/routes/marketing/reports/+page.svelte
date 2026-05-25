<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	
	let search = $state(data.filters.search);
	let statusFilter = $state(data.filters.status);
	let startDate = $state(data.filters.startDate);
	let endDate = $state(data.filters.endDate);
	
	function applyFilters() {
		const url = new URL(window.location.href);
		if (search) url.searchParams.set('search', search);
		else url.searchParams.delete('search');
		
		if (statusFilter && statusFilter !== 'All') url.searchParams.set('status', statusFilter);
		else url.searchParams.delete('status');
		
		if (startDate) url.searchParams.set('startDate', startDate);
		else url.searchParams.delete('startDate');
		
		if (endDate) url.searchParams.set('endDate', endDate);
		else url.searchParams.delete('endDate');
		
		goto(url.toString(), { keepFocus: true });
	}

	function clearFilters() {
		search = '';
		statusFilter = 'All';
		startDate = '';
		endDate = '';
		applyFilters();
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};
</script>

<svelte:head>
	<title>Reports | Marketing</title>
</svelte:head>

<div class="flex flex-col h-full">
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Marketing Reports</h1>
			<p class="text-on-surface-variant font-medium text-sm">Analyze sales performance, revenue, and margins.</p>
		</div>
		<div class="flex gap-3">
			<button class="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-emerald-700 transition-colors">
				<span class="material-symbols-outlined text-lg">download</span>
				Export CSV
			</button>
		</div>
	</header>

	<!-- Filters -->
	<div class="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm mb-8">
		<h3 class="text-sm font-bold text-on-surface mb-4">Filter Reports</h3>
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div>
				<label class="block text-xs font-bold text-on-surface-variant mb-1">Search</label>
				<input type="text" bind:value={search} placeholder="DO or Customer..." class="w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
			</div>
			<div>
				<label class="block text-xs font-bold text-on-surface-variant mb-1">Status</label>
				<select bind:value={statusFilter} class="w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
					<option value="All">All Status</option>
					<option value="COMPLETED">Completed</option>
					<option value="READY_TO_DISPATCH">Ready / Confirmed</option>
					<option value="WAITING_UJO">Pending UJO</option>
					<option value="WAITING_TARIFF">Pending Tariff</option>
				</select>
			</div>
			<div>
				<label class="block text-xs font-bold text-on-surface-variant mb-1">Start Date</label>
				<input type="date" bind:value={startDate} class="w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
			</div>
			<div>
				<label class="block text-xs font-bold text-on-surface-variant mb-1">End Date</label>
				<input type="date" bind:value={endDate} class="w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
			</div>
		</div>
		<div class="flex justify-end gap-3 mt-4">
			<button onclick={clearFilters} class="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors">Clear</button>
			<button onclick={applyFilters} class="px-4 py-2 text-sm font-bold bg-rose-600 text-white rounded-lg shadow-sm hover:bg-rose-700 transition-colors">Apply Filters</button>
		</div>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-sm">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Orders</p>
			<h3 class="text-3xl font-black text-on-surface">{data.summary.totalOrders}</h3>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-emerald-500/20 shadow-sm">
			<p class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Total Revenue</p>
			<h3 class="text-2xl font-black text-emerald-600">{formatCurrency(data.summary.totalRevenue)}</h3>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-amber-500/20 shadow-sm">
			<p class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Est. Cost (UJO)</p>
			<h3 class="text-2xl font-black text-amber-600">{formatCurrency(data.summary.totalUjo)}</h3>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-blue-500/20 shadow-sm">
			<p class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Est. Margin</p>
			<h3 class="text-2xl font-black text-blue-600">{formatCurrency(data.summary.margin)}</h3>
		</div>
	</div>

	<!-- Data Table -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse min-w-[1200px]">
				<thead>
					<tr class="border-b border-surface-container bg-surface-container-lowest">
						<th class="py-4 px-6 text-[10px] font-black uppercase text-on-surface-variant">Order ID</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase text-on-surface-variant">Date</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase text-on-surface-variant">Customer</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase text-on-surface-variant">Route & Cargo</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase text-on-surface-variant">Tariff</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase text-on-surface-variant">Est. UJO</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase text-on-surface-variant">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#if data.reports.length === 0}
						<tr>
							<td colspan="7" class="py-12 text-center text-on-surface-variant font-medium">Data tidak ditemukan dengan filter yang dipilih.</td>
						</tr>
					{/if}
					{#each data.reports as row}
						<tr class="hover:bg-surface-container-low transition-colors">
							<td class="py-3 px-6 text-sm font-bold">{row.orderId}</td>
							<td class="py-3 px-6 text-sm">{row.loadDate ? new Date(row.loadDate).toLocaleDateString('id-ID') : '-'}</td>
							<td class="py-3 px-6 text-sm font-bold">{row.customer}</td>
							<td class="py-3 px-6">
								<p class="text-sm font-bold">{row.origin} → {row.destination}</p>
								<p class="text-[10px] text-on-surface-variant uppercase mt-0.5">{row.cargoType} • {row.vehicle}</p>
							</td>
							<td class="py-3 px-6 text-sm font-bold text-emerald-600">{formatCurrency(parseFloat(row.tariff))}</td>
							<td class="py-3 px-6 text-sm font-medium text-amber-600">{formatCurrency(parseFloat(row.ujo))}</td>
							<td class="py-3 px-6 text-xs font-bold">{row.status}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
