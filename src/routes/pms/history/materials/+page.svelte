<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatDateId, formatNumber } from '$lib/utils/pms';

	let { data } = $props();

	// Local state for filter inputs
	let searchQuery = $state(data.filters?.q || '');
	let startDate = $state(data.filters?.startDate || '');
	let endDate = $state(data.filters?.endDate || '');
	let limit = $state(data.pagination?.limit || 15);

	// Sync local filter state if data changes
	$effect(() => {
		searchQuery = data.filters?.q || '';
		startDate = data.filters?.startDate || '';
		endDate = data.filters?.endDate || '';
		limit = data.pagination?.limit || 15;
	});

	function applyFilters(pageNumber = 1) {
		const params = new URLSearchParams();
		if (searchQuery.trim()) params.set('q', searchQuery.trim());
		if (startDate) params.set('startDate', startDate);
		if (endDate) params.set('endDate', endDate);
		if (limit !== 15) params.set('limit', limit.toString());
		if (pageNumber > 1) params.set('page', pageNumber.toString());

		const qs = params.toString();
		goto(`/pms/history/materials${qs ? `?${qs}` : ''}`, { keepFocus: true });
	}

	function handleSearchSubmit(e: Event) {
		e.preventDefault();
		applyFilters(1);
	}

	function resetFilters() {
		searchQuery = '';
		startDate = '';
		endDate = '';
		limit = 15;
		goto('/pms/history/materials');
	}

	function setThisMonth() {
		const now = new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, '0');
		const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
		startDate = `${y}-${m}-01`;
		endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
		applyFilters(1);
	}

	function setToday() {
		const today = new Date().toISOString().split('T')[0];
		startDate = today;
		endDate = today;
		applyFilters(1);
	}

	function changePage(newPage: number) {
		if (newPage < 1 || newPage > (data.pagination?.totalPages || 1)) return;
		applyFilters(newPage);
	}

	// Calculate visible page numbers for pagination
	let pageNumbers = $derived.by(() => {
		const current = data.pagination?.page || 1;
		const total = data.pagination?.totalPages || 1;
		const pages: number[] = [];

		const delta = 2;
		const start = Math.max(1, current - delta);
		const end = Math.min(total, current + delta);

		for (let i = start; i <= end; i++) {
			pages.push(i);
		}
		return pages;
	});

	let hasActiveFilters = $derived(Boolean(data.filters?.q || data.filters?.startDate || data.filters?.endDate));
</script>

<svelte:head>
	<title>Riwayat Pembelian by Material | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
					<span class="material-symbols-outlined text-2xl">history</span>
				</div>
				<div>
					<h1 class="text-2xl font-black text-on-surface tracking-tight">Riwayat Pengadaan by Material</h1>
					<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
						Lacak historis pembelian material, harga satuan bersih, serta catatan keterangan & WRS antar tanggal
					</p>
				</div>
			</div>
		</div>

		<!-- Date presets shortcut -->
		<div class="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs">
			<button
				type="button"
				onclick={setToday}
				class="px-2.5 py-1 rounded-lg font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
			>
				Hari Ini
			</button>
			<button
				type="button"
				onclick={setThisMonth}
				class="px-2.5 py-1 rounded-lg font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
			>
				Bulan Ini
			</button>
			{#if hasActiveFilters}
				<button
					type="button"
					onclick={resetFilters}
					class="px-2.5 py-1 rounded-lg font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-1"
				>
					<span class="material-symbols-outlined text-xs">restart_alt</span>
					<span>Reset</span>
				</button>
			{/if}
		</div>
	</header>

	<!-- KPI Summary Metric Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Item Pengadaan</span>
				<div class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">inventory_2</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface font-mono">{formatNumber(data.summary.totalCount)}</div>
			<p class="text-[11px] text-on-surface-variant font-medium mt-1">Baris material tercatat</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Kuantitas</span>
				<div class="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">shopping_cart</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface font-mono">{formatNumber(data.summary.totalQty)}</div>
			<p class="text-[11px] text-blue-600 font-bold mt-1">Akumulasi seluruh unit</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Nilai Pembelian</span>
				<div class="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">payments</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface font-mono">{formatNumber(data.summary.totalValue)}</div>
			<p class="text-[11px] text-emerald-600 font-bold mt-1">Total pengeluaran riwayat</p>
		</div>
	</div>

	<!-- Filter & Search Toolbar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
		<!-- Left: Search input -->
		<form onsubmit={handleSearchSubmit} class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari kode, material, project, vendor, keterangan..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</form>

		<!-- Right: Date Range & Limit Filters -->
		<div class="flex flex-wrap items-center gap-2.5">
			<!-- Start Date -->
			<div class="flex items-center gap-1.5">
				<span class="text-xs font-bold text-on-surface-variant whitespace-nowrap">Dari:</span>
				<input
					type="date"
					bind:value={startDate}
					onchange={() => applyFilters(1)}
					class="px-2.5 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
				/>
			</div>

			<!-- End Date -->
			<div class="flex items-center gap-1.5">
				<span class="text-xs font-bold text-on-surface-variant whitespace-nowrap">Sampai:</span>
				<input
					type="date"
					bind:value={endDate}
					onchange={() => applyFilters(1)}
					class="px-2.5 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
				/>
			</div>

			<!-- Limit -->
			<div class="flex items-center gap-1.5">
				<select
					bind:value={limit}
					onchange={() => applyFilters(1)}
					class="px-2.5 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
				>
					<option value={15}>15 / hal</option>
					<option value={25}>25 / hal</option>
					<option value={50}>50 / hal</option>
					<option value={100}>100 / hal</option>
				</select>
			</div>

			<button
				type="button"
				onclick={() => applyFilters(1)}
				class="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
			>
				<span class="material-symbols-outlined text-xs">filter_alt</span>
				<span>Filter</span>
			</button>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs space-y-0">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[1250px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-3 w-12 text-center">No</th>
						<th class="py-3.5 px-4">No. PO</th>
						<th class="py-3.5 px-4">Tanggal PO</th>
						<th class="py-3.5 px-4">Material & Kode</th>
						<th class="py-3.5 px-4">Spesifikasi</th>
						<th class="py-3.5 px-4">Vendor</th>
						<th class="py-3.5 px-4">Project</th>
						<th class="py-3.5 px-3 text-right">Qty</th>
						<th class="py-3.5 px-3 text-left">Satuan</th>
						<th class="py-3.5 px-4 text-right">Harga Satuan</th>
						<th class="py-3.5 px-4 text-right">Total Transaksi</th>
						<th class="py-3.5 px-4">Keterangan</th>
						<th class="py-3.5 px-4">WRS Note</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if data.history.length === 0}
						<tr>
							<td colspan="13" class="py-16 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl opacity-30 block mb-2">search_off</span>
								<p class="text-xs font-bold text-on-surface">Tidak ada data riwayat pengadaan material</p>
								<p class="text-[11px] text-slate-500 mt-0.5">
									Coba sesuaikan rentang tanggal atau kata kunci pencarian Anda.
								</p>
							</td>
						</tr>
					{:else}
						{#each data.history as h, idx}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-3 text-center font-mono text-on-surface-variant">
									{data.pagination.offset + idx + 1}
								</td>
								<td class="py-3.5 px-4 whitespace-nowrap">
									<a
										href="/pms/transactions/po/{h.poId}"
										class="font-mono font-bold text-amber-700 dark:text-amber-400 hover:underline"
										title="Lihat Detail Purchase Order"
									>
										{h.poNumber}
									</a>
								</td>
								<td class="py-3.5 px-4 whitespace-nowrap text-on-surface-variant text-xs font-mono">
									{formatDateId(h.poDate)}
								</td>
								<td class="py-3.5 px-4">
									<p class="font-bold text-on-surface text-sm">{h.materialName}</p>
									<span class="font-mono text-amber-700 dark:text-amber-300 font-bold text-[11px]">{h.materialCode}</span>
								</td>
								<td class="py-3.5 px-4 text-on-surface-variant">{h.spec}</td>
								<td class="py-3.5 px-4 font-semibold text-on-surface">{h.vendorName}</td>
								<td class="py-3.5 px-4 text-on-surface">{h.projectName || '-'}</td>
								<td class="py-3.5 px-3 text-right font-mono font-bold text-on-surface">
									{formatNumber(h.qtyOrdered)}
								</td>
								<td class="py-3.5 px-3 font-semibold text-on-surface-variant text-xs">
									{h.uom}
								</td>
								<td class="py-3.5 px-4 text-right font-mono font-semibold text-on-surface">
									{formatNumber(h.unitPrice)}
								</td>
								<td class="py-3.5 px-4 text-right font-mono font-black text-on-surface">
									{formatNumber(h.total)}
								</td>
								<td class="py-3.5 px-4 text-on-surface text-xs max-w-xs truncate" title={h.remarks}>
									{h.remarks || '-'}
								</td>
								<td class="py-3.5 px-4 text-on-surface-variant text-xs max-w-xs truncate" title={h.wrsNotes}>
									{h.wrsNotes || '-'}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		<!-- Pagination Footer -->
		<div class="border-t border-slate-200/60 dark:border-slate-800/60 p-4 bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
			<div class="text-on-surface-variant">
				{#if data.pagination.totalCount > 0}
					Menampilkan <strong class="text-on-surface font-mono">{data.pagination.offset + 1}</strong>
					sampai <strong class="text-on-surface font-mono">{Math.min(data.pagination.offset + data.history.length, data.pagination.totalCount)}</strong>
					dari <strong class="text-on-surface font-mono">{formatNumber(data.pagination.totalCount)}</strong> total transaksi
				{:else}
					0 transaksi
				{/if}
			</div>

			<!-- Page Navigation Buttons -->
			{#if data.pagination.totalPages > 1}
				<div class="flex items-center gap-1">
					<button
						type="button"
						disabled={data.pagination.page <= 1}
						onclick={() => changePage(data.pagination.page - 1)}
						class="px-3 py-1.5 rounded-lg bg-surface border border-slate-200 dark:border-slate-700 font-bold text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
					>
						<span class="material-symbols-outlined text-xs">chevron_left</span>
						<span>Sebelumnya</span>
					</button>

					{#each pageNumbers as pNum}
						<button
							type="button"
							onclick={() => changePage(pNum)}
							class="w-8 h-8 rounded-lg font-bold font-mono transition-colors cursor-pointer {pNum === data.pagination.page ? 'bg-amber-600 text-white shadow-2xs' : 'bg-surface border border-slate-200 dark:border-slate-700 text-on-surface hover:bg-surface-container'}"
						>
							{pNum}
						</button>
					{/each}

					<button
						type="button"
						disabled={data.pagination.page >= data.pagination.totalPages}
						onclick={() => changePage(data.pagination.page + 1)}
						class="px-3 py-1.5 rounded-lg bg-surface border border-slate-200 dark:border-slate-700 font-bold text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
					>
						<span>Selanjutnya</span>
						<span class="material-symbols-outlined text-xs">chevron_right</span>
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
