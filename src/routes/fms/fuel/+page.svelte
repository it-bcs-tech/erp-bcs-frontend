<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	
	let logs = $derived(data.logs || []);
	let metrics = $derived(data.metrics);
	let meta = $derived(data.meta);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let fuelFilter = $state($page.url.searchParams.get('fuel') || 'All');
	
	let searchTimer: ReturnType<typeof setTimeout>;

	function updateQueryParams() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');
		if (fuelFilter && fuelFilter !== 'All') url.searchParams.set('fuel', fuelFilter);
		else url.searchParams.delete('fuel');
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(updateQueryParams, 400);
	}

	function handleFuelChange() {
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
</script>

<svelte:head>
	<title>Fuel Management | FMS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">local_gas_station</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Fuel Management & Bahan Bakar</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Monitoring konsumsi BBM, efisiensi rasio km/liter armada, dan rekonsiliasi pengisian SPBU
			</p>
		</div>
		<div class="flex gap-2.5">
			<button class="bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container transition-colors shadow-xs">
				<span class="material-symbols-outlined text-lg">download</span>
				<span>Export</span>
			</button>
			<button class="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-blue-700 transition-colors cursor-pointer">
				<span class="material-symbols-outlined text-lg">local_gas_station</span>
				<span>Catat Pengisian BBM</span>
			</button>
		</div>
	</header>

	<!-- Metrics Cards (Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Biaya BBM</p>
					<h3 class="text-2xl font-black text-rose-600 mt-1">{formatCurrency(metrics.totalCost)}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">payments</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2">Berdasarkan voucher & struk</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Konsumsi BBM</p>
					<h3 class="text-2xl font-black text-blue-600 mt-1">{metrics.totalLiters} L</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">water_drop</span>
				</div>
			</div>
			<p class="text-xs text-blue-600 font-medium mt-2">Volume BBM terpakai</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Rata-rata Harga / Liter</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{formatCurrency(metrics.avgCostPerLiter)}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">price_change</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 font-medium mt-2">Solar & Dexlite mix</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Frekuensi Pengisian</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">{metrics.fillUpsThisMonth} Transaksi</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">ev_station</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 font-medium mt-2">Refueling log bulan ini</p>
		</div>
	</div>

	<!-- Unified Filter & Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
		<!-- Tabs (Segmented Control Jenis BBM) -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
			{#each ['All', 'Solar', 'Pertamax', 'Pertalite', 'Dexlite'] as ft}
				<button
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {fuelFilter === ft
						? 'bg-surface text-blue-600 dark:text-blue-400 shadow-xs'
						: 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => { fuelFilter = ft; handleFuelChange(); }}
				>
					{ft === 'All' ? 'Semua Jenis BBM' : ft}
				</button>
			{/each}
		</div>

		<!-- Search Input -->
		<div class="relative w-full md:w-80 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input 
				type="text" 
				bind:value={searchQuery}
				oninput={handleSearchInput}
				placeholder="Cari nopol unit, driver, SPBU..." 
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-slate-400"
			/>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[1000px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">ID Log / Tanggal</th>
						<th class="py-3.5 px-5">Unit & Driver</th>
						<th class="py-3.5 px-5">SPBU & Odometer</th>
						<th class="py-3.5 px-5">Detail BBM</th>
						<th class="py-3.5 px-5">Total Biaya</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each logs as log}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-3.5 px-5">
								<div class="flex flex-col gap-0.5">
									<span class="text-[10px] font-black tracking-widest uppercase text-on-surface-variant/70 font-mono">{log.id}</span>
									<span class="text-sm font-bold text-on-surface">{log.date}</span>
									{#if log.tripId !== '-'}
										<span class="text-[10px] font-medium text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded w-fit mt-0.5">{log.tripId}</span>
									{/if}
								</div>
							</td>
							<td class="py-3.5 px-5">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
										<span class="material-symbols-outlined text-[18px]">local_shipping</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{log.vehicle}</p>
										<p class="text-[11px] font-medium text-on-surface-variant mt-0.5 uppercase tracking-wider">{log.driver}</p>
									</div>
								</div>
							</td>
							<td class="py-3.5 px-5">
								<div class="flex flex-col gap-1">
									<span class="text-sm font-bold text-on-surface flex items-center gap-1.5">
										<span class="material-symbols-outlined text-[14px] text-amber-500">ev_station</span>
										{log.station}
									</span>
									<span class="text-[11px] font-medium text-on-surface-variant flex items-center gap-1.5 font-mono">
										<span class="material-symbols-outlined text-[14px] text-slate-400">speed</span>
										{log.odometer.toLocaleString('id-ID')} KM
									</span>
								</div>
							</td>
							<td class="py-3.5 px-5">
								<div class="flex flex-col gap-1">
									<div class="flex items-center gap-2">
										<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
											{log.fuelType}
										</span>
										<span class="text-xs font-black text-on-surface font-mono">{log.liters} L</span>
									</div>
									<span class="text-[11px] font-medium text-on-surface-variant">@{formatCurrency(log.pricePerLiter)}/L</span>
								</div>
							</td>
							<td class="py-3.5 px-5">
								<span class="text-sm font-black text-on-surface font-mono">{formatCurrency(log.totalCost)}</span>
							</td>
							<td class="py-3.5 px-5 text-right">
								<button class="p-2 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer" title="Lihat Detail Log">
									<span class="material-symbols-outlined text-[20px]">receipt_long</span>
								</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="py-20 text-center">
								<span class="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">local_gas_station</span>
								<p class="text-on-surface-variant font-semibold">Tidak ada log pengisian BBM</p>
								<p class="text-xs text-on-surface-variant/60 mt-1">Coba ubah filter atau kata kunci pencarian</p>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination Footer -->
		<div class="px-5 py-3.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
			<p class="text-xs text-on-surface-variant font-medium">
				Menampilkan <span class="font-bold text-on-surface">{startItem}–{endItem}</span> dari <span class="font-bold text-on-surface">{meta?.total || 0}</span> log pengisian
			</p>
			<div class="flex gap-1">
				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors" 
					disabled={currentPage <= 1}
					onclick={() => goToPage(currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				{#each Array(totalPages) as _, i}
					<button 
						class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition-colors {currentPage === i + 1 ? 'bg-blue-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}"
						onclick={() => goToPage(i + 1)}>
						{i + 1}
					</button>
				{/each}
				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors" 
					disabled={currentPage >= totalPages}
					onclick={() => goToPage(currentPage + 1)}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>
