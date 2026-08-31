<script lang="ts">
	import { formatRupiah, formatNumber, formatDateId, getCategoryBadge, getPOStatusBadge } from '$lib/utils/pms';

	let { data } = $props();
</script>

<svelte:head>
	<title>Procurement Management System (PMS) | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Top Bar -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">dashboard</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Dashboard Procurement & Logistik</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Monitoring terpadu Purchase Request (PR), Purchase Order (PO), dan Penerimaan Barang Gudang (WRS / LPB)
			</p>
		</div>

		<!-- Action Quick Links -->
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/pms/transactions/pr/create"
				class="inline-flex items-center gap-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-xs"
			>
				<span class="material-symbols-outlined text-sm">assignment</span>
				<span>Buat PR</span>
			</a>
			<a
				href="/pms/transactions/po/create"
				class="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-xs"
			>
				<span class="material-symbols-outlined text-sm">shopping_cart</span>
				<span>Buat PO</span>
			</a>
			<a
				href="/pms/transactions/wrs/create"
				class="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-xs"
			>
				<span class="material-symbols-outlined text-sm">receipt_long</span>
				<span>Terima WRS</span>
			</a>
		</div>
	</div>

	<!-- Section 1: Resume Widget 4 Kategori (Packaging, Transport, Warehouse, Supporting) -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		{#each data.categoryResume as cat}
			{@const badge = getCategoryBadge(cat.category)}
			<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between space-y-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="p-2 rounded-xl {badge.badgeClass}">
							<span class="material-symbols-outlined text-lg">{badge.icon}</span>
						</span>
						<div>
							<h3 class="font-extrabold text-sm text-on-surface">PO {badge.label}</h3>
							<p class="text-[10px] text-on-surface-variant font-mono">{cat.poCount} Order</p>
						</div>
					</div>
					<div class="text-right">
						<span class="text-xs font-black font-mono {cat.fulfillmentPercent >= 80 ? 'text-emerald-600' : 'text-amber-600'}">
							{cat.fulfillmentPercent}%
						</span>
						<p class="text-[9px] text-on-surface-variant uppercase font-bold">Fulfillment</p>
					</div>
				</div>

				<!-- Metric Breakdown -->
				<div class="space-y-1.5 text-xs font-medium border-t border-slate-200/60 dark:border-slate-800/60 pt-3">
					<div class="flex justify-between">
						<span class="text-on-surface-variant text-[11px]">PO Include PPN:</span>
						<span class="font-mono font-bold text-on-surface">{formatRupiah(cat.poInclude)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-on-surface-variant text-[11px]">PPN (11%):</span>
						<span class="font-mono text-on-surface-variant">{formatRupiah(cat.ppn)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-on-surface-variant text-[11px]">PO Net:</span>
						<span class="font-mono font-semibold text-on-surface">{formatRupiah(cat.poNet)}</span>
					</div>
					<div class="flex justify-between pt-1 border-t border-slate-200/40 dark:border-slate-800/40">
						<span class="text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">Realisasi WRS:</span>
						<span class="font-mono font-bold text-emerald-700 dark:text-emerald-400">{formatRupiah(cat.wrsValue)}</span>
					</div>
				</div>

				<!-- Progress bar -->
				<div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
					<div
						class="h-full rounded-full transition-all duration-500 {cat.fulfillmentPercent >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}"
						style="width: {cat.fulfillmentPercent}%"
					></div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Section 2: Matrix PR vs PO vs WRS Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-amber-600">tune</span>
				<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Matrix PR vs PO vs WRS (Rasio Efisiensi Pengadaan)</h3>
			</div>
			<span class="text-[11px] font-medium text-on-surface-variant">Perbandingan volume kuantitas & persentase serapan order</span>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[700px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Kategori Pengadaan</th>
						<th class="py-3.5 px-5 text-center">PR Volume (Qty)</th>
						<th class="py-3.5 px-5 text-center">PO Volume (Qty)</th>
						<th class="py-3.5 px-5 text-center">WRS / LPB (Qty)</th>
						<th class="py-3.5 px-5 text-center">% PO / PR (Order Ratio)</th>
						<th class="py-3.5 px-5 text-center">% WRS / PO (Receipt Ratio)</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#each data.matrixRows as row}
						{@const badge = getCategoryBadge(row.category)}
						<tr class="hover:bg-surface-container-high/40 transition-colors">
							<td class="py-3.5 px-5">
								<span class="px-2.5 py-1 rounded-lg border text-xs font-bold inline-flex items-center gap-1.5 {badge.badgeClass}">
									<span class="material-symbols-outlined text-xs">{badge.icon}</span>
									<span>{badge.label}</span>
								</span>
							</td>
							<td class="py-3.5 px-5 text-center font-mono font-bold text-on-surface">
								{formatNumber(row.prQty)}
							</td>
							<td class="py-3.5 px-5 text-center font-mono font-bold text-amber-600">
								{formatNumber(row.poQty)}
							</td>
							<td class="py-3.5 px-5 text-center font-mono font-bold text-emerald-600">
								{formatNumber(row.wrsQty)}
							</td>
							<td class="py-3.5 px-5 text-center">
								<span class="font-mono font-black text-xs px-2.5 py-0.5 rounded-full border {row.ratioPoPr >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-300'}">
									{row.ratioPoPr}%
								</span>
							</td>
							<td class="py-3.5 px-5 text-center">
								<span class="font-mono font-black text-xs px-2.5 py-0.5 rounded-full border {row.ratioWrsPo >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}">
									{row.ratioWrsPo}%
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Section 3: Dual Column - Recent POs & Low Stock Alerts -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Recent Purchase Orders -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
			<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">shopping_cart</span>
					<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Purchase Order Terbaru</h3>
				</div>
				<a href="/pms/transactions/po" class="text-xs font-bold text-amber-600 hover:underline">Lihat Semua →</a>
			</div>

			<div class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
				{#if data.recentPOs.length === 0}
					<div class="py-8 text-center text-on-surface-variant">Belum ada Purchase Order.</div>
				{:else}
					{#each data.recentPOs as po}
						{@const stBadge = getPOStatusBadge(po.status)}
						<div class="p-3.5 hover:bg-surface-container-high/40 transition-colors flex items-center justify-between gap-3">
							<div>
								<div class="flex items-center gap-2">
									<a href="/pms/transactions/po" class="font-mono font-bold text-amber-700 dark:text-amber-300">
										{po.po_number}
									</a>
									<span class="text-[10px] text-on-surface-variant font-mono">({formatDateId(po.date)})</span>
								</div>
								<p class="font-bold text-on-surface text-xs mt-0.5">{po.vendor}</p>
							</div>

							<div class="text-right">
								<p class="font-mono font-bold text-on-surface text-xs">{formatRupiah(po.total_amount)}</p>
								<span class="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border mt-0.5 {stBadge.badgeClass}">
									{stBadge.label}
								</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Low Stock Alerts -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
			<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-rose-600">warning</span>
					<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Peringatan Stok Menipis</h3>
				</div>
				<a href="/pms/inventory/on-hand?lowStock=true" class="text-xs font-bold text-rose-600 hover:underline">Lihat Semua →</a>
			</div>

			<div class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
				{#if data.lowStockAlerts.length === 0}
					<div class="py-8 text-center text-on-surface-variant">Semua stok barang berada dalam level aman.</div>
				{:else}
					{#each data.lowStockAlerts as item}
						<div class="p-3.5 hover:bg-surface-container-high/40 transition-colors flex items-center justify-between gap-3">
							<div>
								<div class="flex items-center gap-2">
									<span class="font-mono text-xs font-bold text-amber-700 dark:text-amber-300">{item.code}</span>
									<span class="text-[10px] text-on-surface-variant">({item.supplier})</span>
								</div>
								<p class="font-bold text-on-surface text-xs mt-0.5">{item.name}</p>
							</div>

							<div class="text-right">
								<span class="px-2 py-0.5 rounded font-mono font-black text-xs bg-rose-50 text-rose-700 border border-rose-200">
									{formatNumber(item.stock)} / {formatNumber(item.minStock)} {item.unit}
								</span>
								<div class="mt-1">
									<a href="/pms/transactions/pr/create" class="text-[10px] font-bold text-amber-600 hover:underline">Buat PR +</a>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>
