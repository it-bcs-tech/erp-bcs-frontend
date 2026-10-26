<script lang="ts">
	import { formatRupiah, formatNumber, formatDateId, getCategoryBadge, getPOStatusBadge } from '$lib/utils/pms';

	let { data } = $props();
	let pipeline = $derived(data.pipeline);
	let categoryResume = $derived(data.categoryResume);
	let matrixRows = $derived(data.matrixRows);
	let monthlyTrend = $derived(data.monthlyTrend);
	let categoryShare = $derived(data.categoryShare);
	let topVendors = $derived(data.topVendors);
	let lowStockAlerts = $derived(data.lowStockAlerts);
	let recentPOs = $derived(data.recentPOs);

	let activeAnalyticsTab = $state<'trend' | 'matrix'>('trend');
	let activePOTab = $state<'all' | 'draft'>('all');
	let activeVendorStockTab = $state<'vendors' | 'stock'>('vendors');

	let displayedPOs = $derived(
		activePOTab === 'draft'
			? recentPOs.filter((po: any) => (po.status || '').toUpperCase() === 'DRAFT')
			: recentPOs
	);

	function formatShortRupiah(val: any) {
		const num = Number(val) || 0;
		if (num >= 1_000_000_000) {
			return `Rp ${(num / 1_000_000_000).toFixed(2).replace('.', ',')} M`;
		}
		if (num >= 1_000_000) {
			return `Rp ${Math.round(num / 1_000_000)} Jt`;
		}
		return formatRupiah(num);
	}

	function getCategoryColor(cat: string) {
		const s = (cat || '').toUpperCase();
		if (s.includes('TRANSPORT')) return 'bg-emerald-500 text-emerald-600';
		if (s.includes('SUPPORT')) return 'bg-purple-500 text-purple-600';
		if (s.includes('GENERAL') || s.includes('WAREHOUSE')) return 'bg-amber-500 text-amber-600';
		return 'bg-blue-500 text-blue-600';
	}
</script>

<svelte:head>
	<title>Procurement Command Center | ERP BCS</title>
</svelte:head>

<div class="space-y-6 pb-12">
	<!-- 1. Executive Header & Action Buttons -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">shopping_cart</span>
				</div>
				<div>
					<h1 class="text-2xl font-black text-on-surface tracking-tight">Procurement Command Center</h1>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">
						Monitoring Terpadu Siklus Pengadaan PR/PO, Serapan Anggaran Belanja, Penerimaan WRS & Manajemen Suplier PT BCS
					</p>
				</div>
			</div>
		</div>

		<!-- Action Quick Links -->
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/pms/transactions/pr/create"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base text-blue-600">assignment</span>
				<span>Buat PR</span>
			</a>
			<a
				href="/pms/transactions/po/create"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all"
			>
				<span class="material-symbols-outlined text-base">shopping_cart</span>
				<span>Buat PO</span>
			</a>
			<a
				href="/pms/transactions/wrs/create"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base text-emerald-600">receipt_long</span>
				<span>Terima WRS</span>
			</a>
			<a
				href="/pms/master/vendors"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base text-purple-600">store</span>
				<span>Vendor</span>
			</a>
		</div>
	</div>

	<!-- 2. Top Bento KPI Metric Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Total Belanja PO -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Total Komitmen Belanja (PO)</span>
				<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">shopping_bag</span>
				</div>
			</div>
			<h3 class="text-2xl font-black text-amber-600 font-mono tracking-tight">{formatRupiah(data.totalPOValue)}</h3>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				{pipeline.total_po} Purchase Order diterbitkan di sistem
			</p>
		</div>

		<!-- Realisasi Penerimaan WRS -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Realisasi Fisik (WRS / LPB)</span>
				<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">inventory_2</span>
				</div>
			</div>
			<h3 class="text-2xl font-black text-emerald-600 font-mono tracking-tight">{formatRupiah(data.totalWRSValue)}</h3>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				{pipeline.wrs_done} Penerimaan WRS masuk stok gudang
			</p>
		</div>

		<!-- Permintaan Pembelian (PR) -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-blue-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Permintaan Pembelian (PR)</span>
				<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">assignment</span>
				</div>
			</div>
			<div class="flex items-baseline gap-2">
				<h3 class="text-3xl font-black text-blue-600 tracking-tight">{pipeline.total_pr}</h3>
				<span class="text-xs font-semibold text-slate-400">Berkas PR</span>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				{pipeline.pr_processed} Telah Dibuat PO • {pipeline.pr_partial} Sebagian
			</p>
		</div>

		<!-- Peringatan Stok Menipis -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-rose-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Stok Kritis Gudang</span>
				<div class="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">warning</span>
				</div>
			</div>
			<div class="flex items-baseline gap-2">
				<h3 class="text-3xl font-black text-rose-600 tracking-tight">{lowStockAlerts.length}</h3>
				<span class="text-xs font-semibold text-slate-400">Item Kritis</span>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				Mencapai atau di bawah batas minimum stok
			</p>
		</div>
	</div>

	<!-- 3. Procurement Operational Lifecycle Pipeline Strip (NEW) -->
	<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-amber-600 text-xl">conversion_path</span>
				<h2 class="text-sm font-black text-on-surface tracking-tight uppercase">
					Procurement Operational Lifecycle Pipeline
				</h2>
			</div>
			<div class="flex items-center gap-2 text-[11px] font-mono text-on-surface-variant">
				<span>Efisiensi Alur Pengadaan:</span>
				<span class="font-black text-emerald-600">Terintegrasi Gudang</span>
			</div>
		</div>

		<!-- Continuous Horizontal Pipeline Strip -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
			<!-- Stage 1: Permintaan Pembelian (PR) -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-blue-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">assignment</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">1. Purchase Request</p>
						<p class="text-sm font-black text-on-surface">{pipeline.total_pr} PR Masuk</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-mono font-bold">
					{pipeline.pr_processed} Processed
				</span>
			</div>

			<!-- Stage 2: Penerbitan PO (Purchase Order) -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-amber-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">shopping_cart</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">2. Purchase Order</p>
						<p class="text-sm font-black text-on-surface">{pipeline.total_po} PO Terbit</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-mono font-bold">
					{pipeline.po_confirmed} Approved
				</span>
			</div>

			<!-- Stage 3: Surat Jalan / Pengiriman Vendor -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-indigo-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">local_shipping</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">3. Delivery Note</p>
						<p class="text-sm font-black text-on-surface">Vendor Delivery</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-[10px] font-mono font-bold">
					In-Transit
				</span>
			</div>

			<!-- Stage 4: Penerimaan Gudang (WRS / LPB) -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-emerald-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">inventory_2</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">4. WRS / LPB Selesai</p>
						<p class="text-sm font-black text-emerald-600">{pipeline.wrs_done} Penerimaan</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-mono font-bold">
					Stock In
				</span>
			</div>
		</div>
	</div>

	<!-- 4. Visual Analytics Zone (Grid 12-col: 8 vs 4) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- Left: Multi-Tab Analytics (8 Kolom) -->
		<div class="lg:col-span-8 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Tab Switcher -->
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
					<div>
						{#if activeAnalyticsTab === 'trend'}
							<h3 class="text-base font-black text-on-surface tracking-tight">Tren Pengeluaran Belanja PO (6 Bulan Terakhir)</h3>
							<p class="text-xs text-on-surface-variant font-medium mt-0.5">
								Realisasi penerbitan Purchase Order dan nilai nominal belanja komitmen bulanan
							</p>
						{:else}
							<h3 class="text-base font-black text-on-surface tracking-tight">Matriks Efisiensi Pengadaan (PR vs PO vs WRS)</h3>
							<p class="text-xs text-on-surface-variant font-medium mt-0.5">
								Perbandingan volume kuantitas order dan rasio pemenuhan serapan fisik gudang
							</p>
						{/if}
					</div>

					<!-- Segmented Switcher -->
					<div class="inline-flex items-center p-1 rounded-2xl bg-surface border border-slate-200/70 dark:border-slate-800/70 self-start">
						<button
							type="button"
							onclick={() => (activeAnalyticsTab = 'trend')}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeAnalyticsTab === 'trend'
								? 'bg-amber-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">trending_up</span>
							<span>Tren Belanja</span>
						</button>
						<button
							type="button"
							onclick={() => (activeAnalyticsTab = 'matrix')}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeAnalyticsTab === 'matrix'
								? 'bg-amber-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">tune</span>
							<span>Matriks Volume</span>
						</button>
					</div>
				</div>

				<!-- TAB 1: TREN PENGADAAN BULANAN -->
				{#if activeAnalyticsTab === 'trend'}
					<div class="flex items-center justify-end gap-4 mb-2">
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
							<span class="text-[11px] font-bold text-on-surface-variant">Nilai Belanja PO</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
							<span class="text-[11px] font-bold text-on-surface-variant">Jumlah Order PO</span>
						</div>
					</div>

					<div class="h-56 w-full flex items-end justify-between px-2 gap-3 pt-6 border-b border-slate-200 dark:border-slate-800 pb-2">
						{#each monthlyTrend as item}
							<div class="flex flex-col items-center flex-1 gap-2 h-full group cursor-pointer">
								<div class="w-full flex items-end justify-center gap-1.5 h-full relative">
									<!-- PO Count Label -->
									<span class="absolute -top-6 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
										{item.po_count} PO
									</span>

									<!-- PO Value Bar -->
									<div
										class="w-5 sm:w-8 bg-amber-500/80 group-hover:bg-amber-500 rounded-t-lg transition-all duration-300"
										style="height: {item.valuePct}%"
									></div>
									<!-- PO Count Bar -->
									<div
										class="w-5 sm:w-8 bg-blue-500/80 group-hover:bg-blue-500 rounded-t-lg transition-all duration-300"
										style="height: {item.countPct}%"
									></div>

									<!-- Tooltip -->
									<div class="absolute -top-16 bg-slate-900 text-white px-3 py-2 rounded-xl text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-20 space-y-0.5">
										<p class="font-black text-amber-300">{item.month} ({item.period_key})</p>
										<p>Total PO: <span class="font-mono font-bold">{item.po_count} Order</span></p>
										<p>Nilai Belanja: <span class="font-mono font-bold text-emerald-300">{formatRupiah(item.valueNum)}</span></p>
									</div>
								</div>
								<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-amber-600 transition-colors">
									{item.month}
								</span>
							</div>
						{/each}
					</div>

				<!-- TAB 2: MATRIKS EFISIENSI PENGADAAN -->
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-left text-sm min-w-[650px]">
							<thead class="bg-surface text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
								<tr>
									<th class="py-3 px-4">Kategori Pengadaan</th>
									<th class="py-3 px-4 text-center">PR Volume (Qty)</th>
									<th class="py-3 px-4 text-center">PO Volume (Qty)</th>
									<th class="py-3 px-4 text-center">WRS / LPB (Qty)</th>
									<th class="py-3 px-4 text-center">% PO/PR (Order Ratio)</th>
									<th class="py-3 px-4 text-center">% WRS/PO (Serapan)</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
								{#each matrixRows as row}
									{@const badge = getCategoryBadge(row.category)}
									<tr class="hover:bg-surface-container-high/40 transition-colors">
										<td class="py-3 px-4">
											<span class="px-2.5 py-1 rounded-lg border text-xs font-bold inline-flex items-center gap-1.5 {badge.badgeClass}">
												<span class="material-symbols-outlined text-xs">{badge.icon}</span>
												<span>{row.label}</span>
											</span>
										</td>
										<td class="py-3 px-4 text-center font-mono font-bold text-on-surface">
											{formatNumber(row.prQty)}
										</td>
										<td class="py-3 px-4 text-center font-mono font-bold text-amber-600">
											{formatNumber(row.poQty)}
										</td>
										<td class="py-3 px-4 text-center font-mono font-bold text-emerald-600">
											{formatNumber(row.wrsQty)}
										</td>
										<td class="py-3 px-4 text-center">
											<span class="font-mono font-black text-xs px-2.5 py-0.5 rounded-full border {row.ratioPoPr >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}">
												{row.ratioPoPr}%
											</span>
										</td>
										<td class="py-3 px-4 text-center">
											<span class="font-mono font-black text-xs px-2.5 py-0.5 rounded-full border {row.ratioWrsPo >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'}">
												{row.ratioWrsPo}%
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

			<!-- Footer Context Action -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Data pengadaan sinkron real-time dengan modul inventori gudang</span>
				<a href="/pms/reports/yearly-matrix" class="font-bold text-amber-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Matriks Laporan Pengadaan Tahunan</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>

		<!-- Right: Komposisi Belanja Kategori (4 Kolom) -->
		<div class="lg:col-span-4 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-4">
					<div>
						<h3 class="text-base font-black text-on-surface tracking-tight">Komposisi Belanja Kategori</h3>
						<p class="text-xs text-on-surface-variant font-medium mt-0.5">Distribusi Alokasi Anggaran Belanja PO</p>
					</div>
					<span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-mono font-bold">
						{data.categoryResume.length} Kategori
					</span>
				</div>

				<!-- Category Breakdown Cards -->
				<div class="space-y-3.5 my-2">
					{#each categoryShare as cat}
						<div class="p-2.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 space-y-1.5">
							<div class="flex items-center justify-between text-xs">
								<span class="font-bold text-on-surface truncate max-w-[170px]">
									{cat.label}
								</span>
								<span class="font-mono font-bold text-on-surface-variant">
									{formatShortRupiah(cat.poInclude)} <span class="text-[10px] text-slate-400 font-normal">({cat.percentage}%)</span>
								</span>
							</div>
							<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
								<div
									class="h-full rounded-full transition-all duration-500 {getCategoryColor(cat.category).split(' ')[0]}"
									style="width: {cat.percentage}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<a
				href="/pms/transactions/po"
				class="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container text-center transition-all inline-block mt-4"
			>
				Lihat Semua Transaksi Belanja ({formatShortRupiah(data.totalPOValue)})
			</a>
		</div>
	</div>

	<!-- 5. Balanced Bottom Operational Section (Grid 12-col: 7 vs 5) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- Left: Purchase Orders Terkini (7 Kolom) -->
		<div class="lg:col-span-7 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Tab Switcher -->
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-600 text-xl">shopping_cart</span>
						<div>
							<h3 class="font-black text-base text-on-surface tracking-tight">Purchase Order (PO) Terkini</h3>
							<p class="text-xs text-on-surface-variant font-medium">Monitoring status penerbitan PO ke suplier</p>
						</div>
					</div>

					<!-- Segmented PO Switcher -->
					<div class="inline-flex items-center p-1 rounded-2xl bg-surface border border-slate-200/70 dark:border-slate-800/70 self-start">
						<button
							type="button"
							onclick={() => (activePOTab = 'all')}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activePOTab === 'all'
								? 'bg-amber-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span>Semua ({recentPOs.length})</span>
						</button>
						<button
							type="button"
							onclick={() => (activePOTab = 'draft')}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activePOTab === 'draft'
								? 'bg-amber-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span>Draft ({pipeline.po_draft})</span>
						</button>
					</div>
				</div>

				<!-- PO List Cards -->
				<div class="space-y-2.5">
					{#each displayedPOs as po}
						{@const stBadge = getPOStatusBadge(po.status)}
						<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-500/40 transition-all">
							<div class="flex items-center gap-3 min-w-0">
								<div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
									<span class="material-symbols-outlined text-base">receipt</span>
								</div>
								<div class="min-w-0">
									<div class="flex items-center gap-2">
										<p class="text-xs font-black text-on-surface truncate">{po.vendor}</p>
										<span class="px-1.5 py-0.2 rounded border text-[10px] font-mono font-bold uppercase tracking-wider {stBadge.badgeClass}">
											{stBadge.label}
										</span>
									</div>
									<p class="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
										{po.po_number} • {formatDateId(po.date)}
									</p>
								</div>
							</div>
							<div class="flex items-center sm:flex-col sm:items-end justify-between text-right shrink-0">
								<span class="text-xs font-mono font-bold text-emerald-600">
									{formatRupiah(po.total_amount)}
								</span>
								<span class="text-[10px] text-slate-400 font-mono">
									{po.item_count} Item
								</span>
							</div>
						</div>
					{/each}

					{#if displayedPOs.length === 0}
						<div class="p-8 text-center bg-surface rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
							<span class="material-symbols-outlined text-3xl text-emerald-500">task_alt</span>
							<p class="text-xs font-bold text-on-surface mt-2">Tidak Ada PO Tertunda</p>
							<p class="text-[11px] text-slate-400">Semua pesanan PO berada dalam status normal.</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer Link -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Kelola pesanan pembelian barang dan approval</span>
				<a href="/pms/transactions/po" class="font-bold text-amber-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Semua Purchase Order</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>

		<!-- Right: Suplier Utama & Peringatan Stok Kritis (5 Kolom) -->
		<div class="lg:col-span-5 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Tab Switcher -->
				<div class="flex items-center justify-between gap-2 mb-4">
					<div class="flex items-center gap-2">
						{#if activeVendorStockTab === 'vendors'}
							<span class="material-symbols-outlined text-purple-500 text-xl">store</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Top Suplier / Vendor</h3>
						{:else}
							<span class="material-symbols-outlined text-rose-500 text-xl">warning</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Stok Kritis Gudang</h3>
						{/if}
					</div>

					<!-- Segmented Vendor/Stock Switcher -->
					<div class="inline-flex items-center p-0.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70">
						<button
							type="button"
							onclick={() => (activeVendorStockTab = 'vendors')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeVendorStockTab === 'vendors'
								? 'bg-purple-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Top Vendor
						</button>
						<button
							type="button"
							onclick={() => (activeVendorStockTab = 'stock')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeVendorStockTab === 'stock'
								? 'bg-rose-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Stok Kritis ({lowStockAlerts.length})
						</button>
					</div>
				</div>

				<!-- TAB 1: TOP VENDORS -->
				{#if activeVendorStockTab === 'vendors'}
					<div class="space-y-2.5">
						{#each topVendors as v, i}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-black text-xs shrink-0">
										#{i + 1}
									</div>
									<div class="min-w-0">
										<p class="text-xs font-bold text-on-surface truncate">{v.vendor_name}</p>
										<p class="text-[10px] text-slate-400 truncate mt-0.5">
											{v.po_count} Transaksi PO
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<span class="text-xs font-black font-mono text-amber-600">
										{formatShortRupiah(v.total_spent)}
									</span>
								</div>
							</div>
						{/each}

						{#if topVendors.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada transaksi vendor tercatat.</p>
						{/if}
					</div>

				<!-- TAB 2: LOW STOCK ALERTS -->
				{:else}
					<div class="space-y-2.5">
						{#each lowStockAlerts as item}
							<div class="p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center justify-between mb-1">
									<span class="font-mono font-bold text-xs text-amber-700 dark:text-amber-400 truncate max-w-[170px]">{item.code}</span>
									<span class="px-2 py-0.5 rounded font-mono font-black text-xs bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
										{formatNumber(item.stock)} / {formatNumber(item.minStock)} {item.unit}
									</span>
								</div>
								<p class="text-xs font-medium text-on-surface truncate">{item.name}</p>
								<div class="flex items-center justify-between mt-2 text-[10px] text-on-surface-variant font-mono">
									<span>Lokasi: {item.supplier}</span>
									<a href="/pms/transactions/pr/create" class="font-bold text-amber-600 hover:underline">Buat PR +</a>
								</div>
							</div>
						{/each}

						{#if lowStockAlerts.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Semua persediaan material dalam batas aman.</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Action -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Integrasi Master Suplier & Inventori</span>
				<a href="/pms/inventory/on-hand" class="font-bold text-purple-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Stok Gudang</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>
	</div>
</div>
