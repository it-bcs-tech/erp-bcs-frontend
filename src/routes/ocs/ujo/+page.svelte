<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let statusFilter = $state($page.url.searchParams.get('status') || 'All');
	let searchTimer: ReturnType<typeof setTimeout>;

	let ujoList = $derived(data.ujoList || []);
	let summary = $derived(data.summary);
	let totalPages = $derived(Math.max(1, Math.ceil(data.meta.total / data.meta.per_page)));
	let currentPage = $derived(data.meta.current_page);
	let paginatedList = $derived(ujoList);

	function updateParams() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');
		if (statusFilter !== 'All') url.searchParams.set('status', statusFilter);
		else url.searchParams.delete('status');
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(updateParams, 400); }
	function handleStatus(s: string) { statusFilter = s; updateParams(); }

	function goToPage(p: number) {
		if (p < 1 || p > totalPages) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { invalidateAll: true, noScroll: true });
	}

	const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
</script>

<svelte:head>
	<title>UJO | OCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">payments</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">UJO — Uang Jalan Operasional</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pengelolaan rincian uang jalan supir per perjalanan (BBM, Tol, Uang Makan, dan Kasir Pencairan)
			</p>
		</div>
		<button class="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-blue-700 transition-colors cursor-pointer">
			<span class="material-symbols-outlined text-lg">add</span>
			<span>Buat UJO Baru</span>
		</button>
	</header>

	<!-- Summary (Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total UJO</p>
					<h3 class="text-xl font-black text-blue-600 mt-1">{formatCurrency(summary.totalUJO)}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">account_balance_wallet</span>
				</div>
			</div>
			<p class="text-xs text-blue-600 font-medium mt-2">Semua pengajuan UJO</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Sudah Dibayar</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">{summary.paid}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">check_circle</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 font-medium mt-2">Telah dicairkan kasir</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Belum Dibayar</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{summary.pending}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">pending</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 font-medium mt-2">Menunggu pencairan kasir</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total BBM</p>
					<h3 class="text-xl font-black text-orange-600 mt-1">{formatCurrency(summary.totalBBM)}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">local_gas_station</span>
				</div>
			</div>
			<p class="text-xs text-orange-600 font-medium mt-2">Alokasi BBM operasional</p>
		</div>
	</div>

	<!-- Unified Filter Bar -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<!-- Segmented Control Tabs -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800">
			{#each ['All', 'Paid', 'Pending'] as tab}
				<button class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all {statusFilter === tab ? 'bg-blue-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
					onclick={() => handleStatus(tab)}>
					{tab === 'All' ? 'Semua UJO' : tab === 'Paid' ? 'Sudah Cair' : 'Menunggu Kasir'}
				</button>
			{/each}
		</div>

		<!-- Search Box -->
		<div class="relative w-full md:w-72">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input 
				type="text" 
				bind:value={searchQuery} 
				oninput={handleSearch}
				placeholder="Cari supir, unit, nomor DO..."
				class="w-full bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-medium shadow-xs" 
			/>
		</div>
	</div>

	<!-- Table Container -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">No. UJO & DO</th>
						<th class="py-3.5 px-5">Supir & Unit</th>
						<th class="py-3.5 px-5">Rute Perjalanan</th>
						<th class="py-3.5 px-5">Rincian Komponen</th>
						<th class="py-3.5 px-5">Total Nominal</th>
						<th class="py-3.5 px-5">Status</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each paginatedList as ujo}
						<tr class="group hover:bg-surface-container transition-colors">
							<td class="py-4 px-5">
								<p class="text-sm font-bold text-on-surface font-mono">{ujo.id}</p>
								<p class="text-xs text-blue-600 font-bold font-mono mt-0.5">{ujo.do}</p>
								<p class="text-[10px] text-on-surface-variant mt-0.5">{ujo.tripDate}</p>
							</td>
							<td class="py-4 px-5">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
										<span class="material-symbols-outlined text-lg">person</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{ujo.driver}</p>
										<p class="text-xs text-on-surface-variant font-medium mt-0.5 font-mono">{ujo.unit}</p>
									</div>
								</div>
							</td>
							<td class="py-4 px-5">
								<p class="text-sm font-bold text-on-surface">{ujo.route}</p>
							</td>
							<td class="py-4 px-5">
								<div class="text-xs space-y-1">
									<div class="flex items-center gap-1.5 text-orange-600">
										<span class="material-symbols-outlined text-sm">local_gas_station</span>
										<span class="font-bold">UJO Dasar:</span> {formatCurrency(ujo.bbm)}
									</div>
									<div class="flex items-center gap-1.5 text-blue-600">
										<span class="material-symbols-outlined text-sm">toll</span>
										<span class="font-bold">Tol:</span> {formatCurrency(ujo.tol)}
									</div>
									<div class="flex items-center gap-1.5 text-emerald-600">
										<span class="material-symbols-outlined text-sm">restaurant</span>
										<span class="font-bold">Makan:</span> {formatCurrency(ujo.makan)}
									</div>
								</div>
							</td>
							<td class="py-4 px-5">
								<p class="text-base font-black text-on-surface">{formatCurrency(ujo.amount)}</p>
							</td>
							<td class="py-4 px-5">
								{#if ujo.status === 'Paid'}
									<span class="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] bg-emerald-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Sudah Cair
									</span>
									<p class="text-[10px] text-on-surface-variant mt-1">{ujo.paidAt}</p>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-amber-600 font-bold text-[10px] bg-amber-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Menunggu Kasir
									</span>
								{/if}
							</td>
							<td class="py-4 px-5 text-right">
								<button class="p-2 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors" title="Cetak Voucher UJO">
									<span class="material-symbols-outlined text-lg">print</span>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination Footer -->
		<div class="px-5 py-3.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
			<p class="text-xs text-on-surface-variant font-medium">
				Total <span class="font-bold text-on-surface">{data.meta.total}</span> data UJO
			</p>
			<div class="flex gap-1">
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				{#each Array(totalPages) as _, i}
					<button class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition-colors {currentPage === i + 1 ? 'bg-blue-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}" onclick={() => goToPage(i + 1)}>
						{i + 1}
					</button>
				{/each}
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>
