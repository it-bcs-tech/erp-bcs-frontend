<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	let orders = $derived(data.orders || []);
	let availableUnits = $derived(data.availableUnits || []);
	let summary = $derived(data.summary);

	let statusFilter = $state($page.url.searchParams.get('status') || 'All');

	function handleStatusClick(s: string) {
		statusFilter = s;
		const url = new URL(window.location.href);
		if (s !== 'All') url.searchParams.set('status', s);
		else url.searchParams.delete('status');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};
</script>

<svelte:head>
	<title>Dispatch | OCS</title>
</svelte:head>

<div class="flex flex-col h-full">
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Dispatch Center</h1>
			<p class="text-on-surface-variant font-medium text-sm">Assign available units to incoming delivery orders from Marketing</p>
		</div>
		<button class="bg-sky-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-sky-700 transition-colors">
			<span class="material-symbols-outlined text-lg">auto_fix_high</span>
			Auto-Assign
		</button>
	</header>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-sm">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Orders</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-on-surface">{summary.total}</h3>
				<span class="material-symbols-outlined text-3xl text-surface-variant">receipt_long</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-amber-500/20 shadow-sm">
			<p class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Pending Assignment</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-amber-600">{summary.pending}</h3>
				<span class="material-symbols-outlined text-3xl text-amber-500/50">pending_actions</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-sky-500/20 shadow-sm">
			<p class="text-xs font-bold text-sky-600 uppercase tracking-wider mb-2">Dispatched</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-sky-600">{summary.dispatched}</h3>
				<span class="material-symbols-outlined text-3xl text-sky-500/50">local_shipping</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-emerald-500/20 shadow-sm">
			<p class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Units Available</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-emerald-600">{summary.availableUnits}</h3>
				<span class="material-symbols-outlined text-3xl text-emerald-500/50">check_circle</span>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<!-- Orders List -->
		<div class="lg:col-span-2">
			<!-- Status Tabs -->
			<div class="flex gap-2 mb-4">
				{#each ['All', 'Pending', 'Dispatched'] as tab}
					<button class="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors {statusFilter === tab ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300' : 'text-on-surface-variant hover:bg-surface-container'}"
						onclick={() => handleStatusClick(tab)}>
						{tab}
					</button>
				{/each}
			</div>

			<div class="space-y-3">
				{#each orders as order}
					<div class="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container hover:shadow-md transition-all">
						<div class="flex items-start justify-between mb-3">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-xl {order.status === 'Dispatched' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'} flex items-center justify-center">
									<span class="material-symbols-outlined text-[20px]">{order.status === 'Dispatched' ? 'local_shipping' : 'pending_actions'}</span>
								</div>
								<div>
									<p class="text-sm font-black text-on-surface">{order.id}</p>
									<p class="text-xs text-on-surface-variant font-medium">{order.customer}</p>
								</div>
							</div>
							{#if order.status === 'Dispatched'}
								<span class="inline-flex items-center gap-1.5 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider border text-sky-600 bg-sky-500/10 border-sky-500/20">
									<span class="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span> Dispatched
								</span>
							{:else}
								<span class="inline-flex items-center gap-1.5 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider border text-amber-600 bg-amber-500/10 border-amber-500/20">
									<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pending
								</span>
							{/if}
						</div>
						
						<div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
							<div>
								<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Route</p>
								<p class="font-bold text-on-surface">{order.origin} → {order.destination}</p>
							</div>
							<div>
								<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Cargo</p>
								<p class="font-medium text-on-surface">{order.cargo} ({order.weight})</p>
							</div>
							<div>
								<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Loading Date</p>
								<p class="font-medium text-on-surface">{order.loadingDate}</p>
							</div>
							<div>
								<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Tariff</p>
								<p class="font-bold text-sky-600">{formatCurrency(order.tariff)}</p>
							</div>
						</div>

						{#if order.assignedUnit}
							<div class="p-3 rounded-xl bg-sky-500/5 border border-sky-500/10 flex items-center gap-3">
								<span class="material-symbols-outlined text-sky-600 text-lg">local_shipping</span>
								<div>
									<p class="text-xs font-bold text-on-surface">{order.assignedUnit} • {order.assignedDriver}</p>
									<p class="text-[10px] text-on-surface-variant">Assigned & ready for departure</p>
								</div>
							</div>
						{:else}
							<button class="w-full p-3 rounded-xl border-2 border-dashed border-sky-500/30 text-sky-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-sky-500/5 hover:border-sky-500/50 transition-colors">
								<span class="material-symbols-outlined text-lg">add_circle</span>
								Assign Unit & Driver
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Available Units Panel -->
		<div class="bg-surface-container-lowest rounded-[24px] p-6 shadow-sm border border-surface-container h-fit sticky top-8">
			<h3 class="text-lg font-bold text-on-surface tracking-tight mb-4 flex items-center gap-2">
				<span class="material-symbols-outlined text-emerald-500">check_circle</span>
				Available Units
			</h3>
			<div class="space-y-3">
				{#each availableUnits as unit}
					<div class="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors cursor-pointer group border border-transparent hover:border-sky-500/20">
						<div class="flex items-center gap-3 mb-2">
							<div class="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
								<span class="material-symbols-outlined text-[18px]">local_shipping</span>
							</div>
							<div>
								<p class="text-sm font-black text-on-surface">{unit.id}</p>
								<p class="text-[10px] text-on-surface-variant font-medium">{unit.brand}</p>
							</div>
						</div>
						<div class="flex items-center gap-4 text-[11px] text-on-surface-variant">
							<span class="flex items-center gap-1">
								<span class="material-symbols-outlined text-[12px]">person</span>
								{unit.driver}
							</span>
							<span class="flex items-center gap-1">
								<span class="material-symbols-outlined text-[12px]">location_on</span>
								{unit.location}
							</span>
						</div>
						<div class="mt-2">
							<span class="text-[9px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded uppercase tracking-wider">{unit.type}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
