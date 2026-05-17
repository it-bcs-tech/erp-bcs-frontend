<script lang="ts">
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	let summary = $derived(data.summary);
	let zoneBreakdown = $derived(data.zoneBreakdown || []);
	let topCustomers = $derived(data.topCustomers || []);

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};

	const zoneColors: Record<string, string> = {
		'Java East': 'bg-rose-500',
		'Java Central': 'bg-blue-500',
		'Java West': 'bg-amber-500',
		'Banten': 'bg-emerald-500'
	};
</script>

<svelte:head>
	<title>Reports | Marketing</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Marketing Reports</h1>
			<p class="text-on-surface-variant font-medium text-sm">Revenue analytics, zone performance, and customer insights</p>
		</div>
		<button class="bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-rose-700 transition-colors">
			<span class="material-symbols-outlined text-lg">download</span>
			Download Report
		</button>
	</header>

	<!-- KPI Summary -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-sm">
			<div class="flex items-center gap-3 mb-2">
				<span class="material-symbols-outlined text-rose-500">payments</span>
				<p class="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Total Revenue</p>
			</div>
			<h3 class="text-2xl font-black text-on-surface">{formatCurrency(summary.totalRevenue)}</h3>
		</div>
		<div class="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-sm">
			<div class="flex items-center gap-3 mb-2">
				<span class="material-symbols-outlined text-blue-500">receipt_long</span>
				<p class="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Total Orders</p>
			</div>
			<h3 class="text-3xl font-black text-on-surface">{summary.totalOrders}</h3>
		</div>
		<div class="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-sm">
			<div class="flex items-center gap-3 mb-2">
				<span class="material-symbols-outlined text-emerald-500">loyalty</span>
				<p class="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Customer Retention</p>
			</div>
			<h3 class="text-3xl font-black text-on-surface">{summary.customerRetention}%</h3>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
		<!-- Zone Revenue Breakdown -->
		<div class="lg:col-span-1 bg-surface-container-lowest rounded-[24px] p-8 shadow-sm">
			<h3 class="text-xl font-bold text-on-surface tracking-tight mb-6">Revenue by Zone</h3>
			<div class="space-y-5">
				{#each zoneBreakdown as zone}
					<div>
						<div class="flex justify-between text-sm mb-2">
							<span class="font-bold text-on-surface">{zone.zone}</span>
							<span class="font-bold text-on-surface-variant">{zone.percentage}%</span>
						</div>
						<div class="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden">
							<div class="h-full rounded-full {zoneColors[zone.zone] || 'bg-slate-500'}" style="width: {zone.percentage}%"></div>
						</div>
						<div class="flex justify-between mt-1">
							<p class="text-[11px] text-on-surface-variant">{zone.orders} orders</p>
							<p class="text-[11px] text-on-surface-variant font-medium">{formatCurrency(zone.revenue)}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Top Customers Table -->
		<div class="lg:col-span-2 bg-surface-container-lowest rounded-[24px] p-8 shadow-sm flex flex-col">
			<h3 class="text-xl font-bold text-on-surface tracking-tight mb-6">Top Customers by Revenue</h3>
			<div class="overflow-x-auto flex-1">
				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="border-b border-surface-container">
							<th class="pb-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">#</th>
							<th class="pb-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Customer</th>
							<th class="pb-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Orders</th>
							<th class="pb-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Revenue</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-container/50">
						{#each topCustomers as cust, i}
							<tr class="hover:bg-surface-container-low transition-colors">
								<td class="py-3 px-2">
									<div class="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-700 dark:text-rose-300 font-black text-xs border-2 {i === 0 ? 'border-amber-400' : 'border-transparent'}">
										{i + 1}
									</div>
								</td>
								<td class="py-3 px-2">
									<p class="text-sm font-bold text-on-surface">{cust.name}</p>
								</td>
								<td class="py-3 px-2 text-right font-medium text-sm text-on-surface">{cust.orders}</td>
								<td class="py-3 px-2 text-right font-black text-sm text-rose-600 dark:text-rose-400">{formatCurrency(cust.revenue)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>
