<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	
	let summaryData = $derived(data.summaryData);
	let costBreakdown = $derived(data.costBreakdown || []);
	let vehiclePerformance = $derived(data.vehiclePerformance || []);

	let monthFilter = $state(data.monthFilter);

	function handleMonthChange() {
		const url = new URL(window.location.href);
		if (monthFilter && monthFilter !== 'Current Month') url.searchParams.set('month', monthFilter);
		else url.searchParams.delete('month');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};
</script>

<svelte:head>
	<title>Fleet Reports | FMS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">analytics</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Fleet Analytics & Reports</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Laporan komprehensif performa operasional armada, efisiensi konsumsi BBM, dan breakdown biaya OPEX
			</p>
		</div>
		<div class="flex gap-2.5">
			<button class="bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container transition-colors shadow-xs">
				<span class="material-symbols-outlined text-lg">download</span>
				<span>Download Report</span>
			</button>
		</div>
	</header>

	<!-- Unified Filter Bar (Segmented Control Periode) -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
			{#each [
				{ label: 'Bulan Ini', value: 'Current Month' },
				{ label: 'Bulan Lalu', value: 'Last Month' },
				{ label: 'Q1 2026', value: 'Q1 2026' },
				{ label: 'YTD 2026', value: 'YTD 2026' }
			] as opt}
				<button
					class="px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {monthFilter === opt.value
						? 'bg-surface text-blue-600 dark:text-blue-400 shadow-xs'
						: 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => { monthFilter = opt.value; handleMonthChange(); }}
				>
					{opt.label}
				</button>
			{/each}
		</div>

		<p class="text-xs text-on-surface-variant font-medium">
			Periode Aktif: <span class="font-bold text-on-surface">{monthFilter}</span>
		</p>
	</div>

	<!-- KPI Summary (Bento Grid) -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Jarak Tempuh</p>
					<h3 class="text-2xl font-black text-blue-600 mt-1">{summaryData.totalDistance.toLocaleString('id-ID')} <span class="text-sm font-medium text-on-surface-variant">km</span></h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">route</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2">Akumulasi rute pengiriman</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total OPEX Armada</p>
					<h3 class="text-2xl font-black text-rose-600 mt-1">{formatCurrency(summaryData.totalFuelCost + summaryData.totalMaintenanceCost)}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">payments</span>
				</div>
			</div>
			<p class="text-xs text-rose-600 font-medium mt-2">BBM + Servis & Perbaikan</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">On-Time Delivery (OTD)</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">{summaryData.onTimeDeliveryRate}%</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">task_alt</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 font-medium mt-2">Ketepatan waktu tiba di tujuan</p>
		</div>
	</div>

	<!-- Analytics Bento Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Cost Breakdown Chart Area -->
		<div class="lg:col-span-1 p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col">
			<div class="flex items-center gap-2 mb-6">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">pie_chart</span>
				<h3 class="text-base font-bold text-on-surface tracking-tight">Proporsi Biaya OPEX</h3>
			</div>
			
			<div class="space-y-5 flex-1">
				{#each costBreakdown as cost}
					<div>
						<div class="flex justify-between text-xs mb-1.5">
							<span class="font-bold text-on-surface">{cost.category}</span>
							<span class="font-bold text-on-surface-variant">{cost.percentage}%</span>
						</div>
						<div class="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
							<div class="h-full rounded-full {cost.category === 'Fuel' ? 'bg-rose-500' : cost.category === 'Maintenance' ? 'bg-amber-500' : cost.category === 'Driver Allowance (UJO)' ? 'bg-blue-500' : 'bg-emerald-500'}" style="width: {cost.percentage}%"></div>
						</div>
						<p class="text-[11px] text-on-surface-variant mt-1 text-right font-medium">{formatCurrency(cost.amount)}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- Vehicle Performance Table -->
		<div class="lg:col-span-2 p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col">
			<div class="flex items-center gap-2 mb-6">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">leaderboard</span>
				<h3 class="text-base font-bold text-on-surface tracking-tight">Performa Kendaraan Tertinggi</h3>
			</div>
			
			<div class="overflow-x-auto flex-1">
				<table class="w-full text-left text-sm min-w-[500px]">
					<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3 px-4">Unit Armada</th>
							<th class="py-3 px-4 text-right">Jarak</th>
							<th class="py-3 px-4 text-right">Trips</th>
							<th class="py-3 px-4 text-right">Cost/KM</th>
							<th class="py-3 px-4 text-center">Efisiensi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each vehiclePerformance as vp}
							<tr class="hover:bg-surface-container-low transition-colors">
								<td class="py-3.5 px-4">
									<p class="text-sm font-bold text-on-surface">{vp.vehicle}</p>
									<p class="text-[11px] text-on-surface-variant mt-0.5">{vp.type}</p>
								</td>
								<td class="py-3.5 px-4 text-right font-bold text-sm text-on-surface">{vp.distance.toLocaleString('id-ID')} km</td>
								<td class="py-3.5 px-4 text-right font-medium text-sm text-on-surface">{vp.trips}</td>
								<td class="py-3.5 px-4 text-right font-bold text-xs text-on-surface font-mono">{formatCurrency(vp.costPerKm)}</td>
								<td class="py-3.5 px-4 text-center">
									{#if vp.efficiency === 'High'}
										<span class="inline-flex items-center px-2.5 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded-md uppercase tracking-wider border border-emerald-500/20">Tinggi</span>
									{:else if vp.efficiency === 'Medium'}
										<span class="inline-flex items-center px-2.5 py-1 bg-amber-500/10 text-amber-600 text-[10px] font-bold rounded-md uppercase tracking-wider border border-amber-500/20">Sedang</span>
									{:else}
										<span class="inline-flex items-center px-2.5 py-1 bg-rose-500/10 text-rose-600 text-[10px] font-bold rounded-md uppercase tracking-wider border border-rose-500/20">Rendah</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>
