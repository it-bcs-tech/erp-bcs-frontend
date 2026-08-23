<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	
	let search = $state(data.filters.search);
	let statusFilter = $state(data.filters.status);
	let startDate = $state(data.filters.startDate);
	let endDate = $state(data.filters.endDate);
	let projectIdFilter = $state(data.filters.projectId || 'All');
	
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

		if (projectIdFilter && projectIdFilter !== 'All') url.searchParams.set('projectId', projectIdFilter);
		else url.searchParams.delete('projectId');
		
		goto(url.toString(), { keepFocus: true });
	}

	function clearFilters() {
		search = '';
		statusFilter = 'All';
		startDate = '';
		endDate = '';
		projectIdFilter = 'All';
		applyFilters();
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};
</script>

<svelte:head>
	<title>Reports | Marketing</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-rose-600 dark:text-rose-400 text-2xl">assessment</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Laporan Marketing & Pendapatan</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Analitik performa penjualan, rincian omzet Delivery Order, perbandingan biaya UJO, dan profit margin
			</p>
		</div>
		<div class="flex gap-3">
			<button class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer">
				<span class="material-symbols-outlined text-lg">download</span>
				<span>Export CSV</span>
			</button>
		</div>
	</header>

	<!-- Filter Card -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-xs">
		<h3 class="text-xs font-bold text-on-surface uppercase tracking-wider mb-3">Filter Parameter Laporan</h3>
		<div class="grid grid-cols-1 md:grid-cols-5 gap-3">
			<div>
				<label class="block text-[11px] font-bold text-on-surface-variant mb-1">Pencarian</label>
				<input type="text" bind:value={search} placeholder="DO atau Customer..." class="w-full bg-surface border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50">
			</div>
			<div>
				<label class="block text-[11px] font-bold text-on-surface-variant mb-1">Unit Bisnis / Proyek</label>
				<select bind:value={projectIdFilter} class="w-full bg-surface border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50">
					<option value="All">Semua Proyek</option>
					{#each data.projects as p}
						<option value={p.id}>{p.project_name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="block text-[11px] font-bold text-on-surface-variant mb-1">Status Order</label>
				<select bind:value={statusFilter} class="w-full bg-surface border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50">
					<option value="All">Semua Status</option>
					<option value="COMPLETED">Completed</option>
					<option value="READY_TO_DISPATCH">Ready / Confirmed</option>
					<option value="WAITING_UJO">Pending UJO</option>
					<option value="WAITING_TARIFF">Pending Tarif</option>
				</select>
			</div>
			<div>
				<label class="block text-[11px] font-bold text-on-surface-variant mb-1">Tanggal Mulai</label>
				<input type="date" bind:value={startDate} class="w-full bg-surface border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50">
			</div>
			<div>
				<label class="block text-[11px] font-bold text-on-surface-variant mb-1">Tanggal Akhir</label>
				<input type="date" bind:value={endDate} class="w-full bg-surface border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50">
			</div>
		</div>
		<div class="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
			<button onclick={clearFilters} class="px-3.5 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors cursor-pointer">Reset Filter</button>
			<button onclick={applyFilters} class="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer">Terapkan Filter</button>
		</div>
	</div>

	<!-- Summary Cards (Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Orders</p>
			<h3 class="text-3xl font-black text-on-surface mt-1">{data.summary.totalOrders}</h3>
		</div>
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Revenue</p>
			<h3 class="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(data.summary.totalRevenue)}</h3>
		</div>
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-xs font-bold text-amber-600 uppercase tracking-wider">Total Cost (UJO)</p>
			<h3 class="text-2xl font-black text-amber-600 mt-1">{formatCurrency(data.summary.totalUjo)}</h3>
		</div>
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-xs font-bold text-blue-600 uppercase tracking-wider">Gross Margin</p>
			<h3 class="text-2xl font-black text-blue-600 mt-1">{formatCurrency(data.summary.margin)}</h3>
		</div>
	</div>

	<!-- Report Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[1000px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">No. DO & Tanggal</th>
						<th class="py-3.5 px-5">Customer</th>
						<th class="py-3.5 px-5">Rute Perjalanan</th>
						<th class="py-3.5 px-5">Tarif Kontrak</th>
						<th class="py-3.5 px-5">Biaya UJO</th>
						<th class="py-3.5 px-5">Margin Profit</th>
						<th class="py-3.5 px-5 text-center">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if data.reports.length === 0}
						<tr>
							<td colspan="7" class="py-16 text-center text-on-surface-variant font-medium">
								<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 block mb-2">assessment</span>
								<p class="font-bold text-on-surface">Tidak ada data transaksi yang sesuai filter.</p>
							</td>
						</tr>
					{/if}
					{#each data.reports as row}
						<tr class="hover:bg-surface-container transition-colors">
							<td class="py-4 px-5">
								<p class="text-sm font-bold text-on-surface font-mono">{row.orderId}</p>
								<p class="text-[10px] text-on-surface-variant mt-0.5">{row.loadDate ? new Date(row.loadDate).toLocaleDateString('id-ID') : '-'}</p>
							</td>
							<td class="py-4 px-5 font-bold text-on-surface">{row.customer}</td>
							<td class="py-4 px-5">
								<div class="flex items-center gap-1 text-xs font-bold text-on-surface">
									<span>{row.origin}</span>
									<span class="text-rose-500">→</span>
									<span>{row.destination}</span>
								</div>
								<p class="text-[10px] text-on-surface-variant font-medium mt-0.5">{row.cargoType} • {row.vehicle} ({row.weight ? row.weight + ' Ton' : '-'})</p>
							</td>
							<td class="py-4 px-5 font-bold text-emerald-600 font-mono">{formatCurrency(parseFloat(row.tariff))}</td>
							<td class="py-4 px-5 font-medium text-amber-600 font-mono">{formatCurrency(parseFloat(row.ujo))}</td>
							<td class="py-4 px-5 font-black text-blue-600 font-mono">{formatCurrency(parseFloat(row.tariff) - parseFloat(row.ujo))}</td>
							<td class="py-4 px-5 text-center">
								<span class="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border {row.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-slate-500/10 text-slate-600 border-slate-500/20'}">
									{row.status}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
