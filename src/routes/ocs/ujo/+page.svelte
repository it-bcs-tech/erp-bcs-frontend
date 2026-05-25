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

<div class="flex flex-col h-full">
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">UJO — Uang Jalan Operasional</h1>
			<p class="text-on-surface-variant font-medium text-sm">Pengelolaan uang jalan supir per perjalanan (BBM, Tol, Makan)</p>
		</div>
		<button class="bg-sky-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-sky-700 transition-colors shadow-sm">
			<span class="material-symbols-outlined text-lg">add</span>
			Buat UJO Baru
		</button>
	</header>

	<!-- Summary -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-sky-500/20 shadow-sm">
			<p class="text-xs font-bold text-sky-600 uppercase tracking-wider mb-2">Total UJO</p>
			<h3 class="text-xl font-black text-sky-600">{formatCurrency(summary.totalUJO)}</h3>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-emerald-500/20 shadow-sm">
			<p class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Sudah Dibayar</p>
			<h3 class="text-3xl font-black text-emerald-600">{summary.paid}</h3>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-amber-500/20 shadow-sm">
			<p class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Belum Dibayar</p>
			<h3 class="text-3xl font-black text-amber-600">{summary.pending}</h3>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-orange-500/20 shadow-sm">
			<p class="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Total BBM</p>
			<h3 class="text-xl font-black text-orange-600">{formatCurrency(summary.totalBBM)}</h3>
		</div>
	</div>

	<!-- Filter -->
	<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
		<div class="flex gap-2">
			{#each ['All', 'Paid', 'Pending'] as tab}
				<button class="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors {statusFilter === tab ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300' : 'text-on-surface-variant hover:bg-surface-container'}"
					onclick={() => handleStatus(tab)}>{tab}</button>
			{/each}
		</div>
		<div class="relative w-full lg:w-72 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input type="text" bind:value={searchQuery} oninput={handleSearch}
				placeholder="Cari supir, unit, nomor DO..."
				class="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-sky-500/50 text-sm font-medium shadow-sm" />
		</div>
	</div>

	<!-- Table -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse min-w-[900px]">
				<thead>
					<tr class="border-b border-surface-container">
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">No. UJO</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Supir & Unit</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Rute</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Rincian</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Total</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each paginatedList as ujo}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-4 px-6">
								<p class="text-sm font-bold text-on-surface">{ujo.id}</p>
								<p class="text-[10px] text-sky-600 font-bold">{ujo.do}</p>
								<p class="text-[10px] text-on-surface-variant">{ujo.tripDate}</p>
							</td>
							<td class="py-4 px-6">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600">
										<span class="material-symbols-outlined text-[18px]">person</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{ujo.driver}</p>
										<p class="text-[10px] text-on-surface-variant font-medium">{ujo.unit}</p>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<p class="text-sm font-bold text-on-surface">{ujo.route}</p>
							</td>
							<td class="py-4 px-6">
								<div class="text-[11px] space-y-1">
									<div class="flex items-center gap-1.5 text-orange-600">
										<span class="material-symbols-outlined text-[12px]">local_gas_station</span>
										<span class="font-bold">UJO Dasar:</span> {formatCurrency(ujo.bbm)}
									</div>
									<div class="flex items-center gap-1.5 text-blue-600">
										<span class="material-symbols-outlined text-[12px]">toll</span>
										<span class="font-bold">Tol:</span> {formatCurrency(ujo.tol)}
									</div>
									<div class="flex items-center gap-1.5 text-emerald-600">
										<span class="material-symbols-outlined text-[12px]">restaurant</span>
										<span class="font-bold">Makan:</span> {formatCurrency(ujo.makan)}
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<p class="text-base font-black text-on-surface">{formatCurrency(ujo.amount)}</p>
							</td>
							<td class="py-4 px-6">
								{#if ujo.status === 'Paid'}
									<span class="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] bg-emerald-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Paid
									</span>
									<p class="text-[9px] text-on-surface-variant mt-1">{ujo.paidAt}</p>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-amber-600 font-bold text-[10px] bg-amber-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Unpaid
									</span>
									<p class="text-[9px] text-amber-600/70 mt-1">Menunggu Kasir</p>
								{/if}
							</td>
							<td class="py-4 px-6 text-right">
								<button class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors opacity-0 group-hover:opacity-100">
									<span class="material-symbols-outlined text-[20px]">print</span>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<!-- Pagination -->
		<div class="px-6 py-4 border-t border-surface-container flex items-center justify-between bg-surface-container-lowest">
			<p class="text-xs text-on-surface-variant font-medium">Total {data.meta.total} data</p>
			<div class="flex gap-1">
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				{#each Array(totalPages) as _, i}
					<button class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors {currentPage === i + 1 ? 'bg-sky-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}" onclick={() => goToPage(i + 1)}>
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
