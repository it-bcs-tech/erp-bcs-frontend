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

<div class="flex flex-col h-full">
	<!-- Header & Actions -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Fleet Analytics</h1>
			<p class="text-on-surface-variant font-medium text-sm">Comprehensive performance, cost, and utilization reports</p>
		</div>
		<div class="flex gap-3 items-center">
			<select 
				bind:value={monthFilter} 
				onchange={handleMonthChange}
				class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium shadow-sm appearance-none cursor-pointer"
			>
				<option value="Current Month">This Month</option>
				<option value="Last Month">Last Month</option>
				<option value="Q1 2026">Q1 2026</option>
				<option value="YTD 2026">YTD 2026</option>
			</select>
			<button class="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-blue-700 transition-colors">
				<span class="material-symbols-outlined text-lg">download</span>
				Download Report
			</button>
		</div>
	</header>

	<!-- KPI Summary -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-sm">
			<div class="flex items-center gap-3 mb-2">
				<span class="material-symbols-outlined text-blue-500">route</span>
				<p class="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Total Distance</p>
			</div>
			<h3 class="text-3xl font-black text-on-surface">{summaryData.totalDistance.toLocaleString()} <span class="text-lg text-on-surface-variant font-bold">km</span></h3>
		</div>
		<div class="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-sm">
			<div class="flex items-center gap-3 mb-2">
				<span class="material-symbols-outlined text-rose-500">payments</span>
				<p class="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Total OPEX</p>
			</div>
			<h3 class="text-3xl font-black text-on-surface">{formatCurrency(summaryData.totalFuelCost + summaryData.totalMaintenanceCost)}</h3>
		</div>
		<div class="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-sm">
			<div class="flex items-center gap-3 mb-2">
				<span class="material-symbols-outlined text-emerald-500">check_circle</span>
				<p class="text-sm font-bold text-on-surface-variant uppercase tracking-wider">On-Time Delivery</p>
			</div>
			<h3 class="text-3xl font-black text-on-surface">{summaryData.onTimeDeliveryRate}%</h3>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
		<!-- Cost Breakdown Chart Area -->
		<div class="lg:col-span-1 bg-surface-container-lowest rounded-[24px] p-8 shadow-sm">
			<h3 class="text-xl font-bold text-on-surface tracking-tight mb-6">OPEX Breakdown</h3>
			
			<div class="space-y-5">
				{#each costBreakdown as cost}
					<div>
						<div class="flex justify-between text-sm mb-2">
							<span class="font-bold text-on-surface">{cost.category}</span>
							<span class="font-bold text-on-surface-variant">{cost.percentage}%</span>
						</div>
						<div class="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden">
							<div class="h-full rounded-full {cost.category === 'Fuel' ? 'bg-rose-500' : cost.category === 'Maintenance' ? 'bg-amber-500' : cost.category === 'Driver Allowance (UJO)' ? 'bg-blue-500' : 'bg-emerald-500'}" style="width: {cost.percentage}%"></div>
						</div>
						<p class="text-xs text-on-surface-variant mt-1 text-right">{formatCurrency(cost.amount)}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- Vehicle Performance Table -->
		<div class="lg:col-span-2 bg-surface-container-lowest rounded-[24px] p-8 shadow-sm flex flex-col">
			<h3 class="text-xl font-bold text-on-surface tracking-tight mb-6">Top Vehicle Performance</h3>
			
			<div class="overflow-x-auto flex-1">
				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="border-b border-surface-container">
							<th class="pb-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Vehicle</th>
							<th class="pb-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Distance</th>
							<th class="pb-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Trips</th>
							<th class="pb-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Cost/KM</th>
							<th class="pb-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-center">Efficiency</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-container/50">
						{#each vehiclePerformance as vp}
							<tr class="hover:bg-surface-container-low transition-colors">
								<td class="py-3 px-2">
									<p class="text-sm font-bold text-on-surface">{vp.vehicle}</p>
									<p class="text-[11px] text-on-surface-variant">{vp.type}</p>
								</td>
								<td class="py-3 px-2 text-right font-medium text-sm text-on-surface">{vp.distance.toLocaleString()} km</td>
								<td class="py-3 px-2 text-right font-medium text-sm text-on-surface">{vp.trips}</td>
								<td class="py-3 px-2 text-right font-medium text-sm text-on-surface">{formatCurrency(vp.costPerKm)}</td>
								<td class="py-3 px-2 text-center">
									{#if vp.efficiency === 'High'}
										<span class="inline-block px-2 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded uppercase tracking-wider">High</span>
									{:else if vp.efficiency === 'Medium'}
										<span class="inline-block px-2 py-1 bg-amber-500/10 text-amber-600 text-[10px] font-bold rounded uppercase tracking-wider">Med</span>
									{:else}
										<span class="inline-block px-2 py-1 bg-rose-500/10 text-rose-600 text-[10px] font-bold rounded uppercase tracking-wider">Low</span>
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
