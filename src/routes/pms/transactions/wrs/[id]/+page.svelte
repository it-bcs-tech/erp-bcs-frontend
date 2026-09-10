<script lang="ts">
	import { formatDateId, formatNumber } from '$lib/utils/pms';

	let { data } = $props();

	let totalQty = $derived(
		(data.items || []).reduce((sum: number, itm: any) => sum + (parseFloat(itm.qtyReceived) || 0), 0)
	);
</script>

<svelte:head>
	<title>Detail WRS {data.wrs.grNumber} | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6 max-w-6xl mx-auto">
	<!-- Top Navigation & Action Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<a
				href="/pms/transactions/wrs"
				class="p-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 hover:bg-surface-container-high text-on-surface-variant transition-colors shadow-xs"
				title="Kembali ke Daftar WRS"
			>
				<span class="material-symbols-outlined text-lg">arrow_back</span>
			</a>
			<div>
				<div class="flex flex-wrap items-center gap-2.5">
					<h1 class="text-2xl font-black text-on-surface tracking-tight font-mono">{data.wrs.grNumber}</h1>
					<span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
						<span class="material-symbols-outlined text-xs">verified</span>
						<span>Diterima di Gudang</span>
					</span>
					{#if data.wrs.poNumber}
						<a
							href="/pms/transactions/po/{data.wrs.poId}"
							class="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 hover:underline"
							title="Buka Purchase Order asal"
						>
							<span class="material-symbols-outlined text-xs">shopping_cart</span>
							<span>{data.wrs.poNumber}</span>
						</a>
					{/if}
				</div>
				<p class="text-on-surface-variant font-medium text-xs mt-0.5">
					Diterima pada {formatDateId(data.wrs.date)} • Supplier: <strong class="text-on-surface">{data.wrs.supplierName}</strong>
				</p>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={() => window.print()}
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-on-surface-variant hover:text-on-surface text-xs font-bold transition-colors shadow-xs cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">print</span>
				<span>Cetak LPB</span>
			</button>

			<a
				href="/pms/transactions/wrs/{data.wrs.id}/edit"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold transition-colors shadow-xs cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">edit</span>
				<span>Edit WRS</span>
			</a>

			{#if data.wrs.poId}
				<a
					href="/pms/transactions/po/{data.wrs.poId}"
					class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">visibility</span>
					<span>Lihat PO Asal</span>
				</a>
			{/if}
		</div>
	</header>

	<!-- Metadata Grid Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Card 1: Penerimaan & PO -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-3">
			<h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
				<span class="material-symbols-outlined text-base">receipt_long</span>
				<span>Informasi Dokumen</span>
			</h3>
			<dl class="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">No. LPB / WRS:</dt>
					<dd class="font-mono font-bold text-on-surface">{data.wrs.grNumber}</dd>
				</div>
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Tanggal Terima:</dt>
					<dd class="font-mono font-bold text-on-surface">{formatDateId(data.wrs.date)}</dd>
				</div>
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Ref Purchase Order:</dt>
					<dd class="font-mono font-bold text-amber-700 dark:text-amber-300">
						{#if data.wrs.poId}
							<a href="/pms/transactions/po/{data.wrs.poId}" class="hover:underline">{data.wrs.poNumber}</a>
						{:else}
							-
						{/if}
					</dd>
				</div>
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Diterima Oleh:</dt>
					<dd class="text-right">
						<span class="font-semibold text-on-surface">{data.wrs.receivedByName || data.wrs.receivedBy}</span>
						{#if data.wrs.receivedByPayroll}
							<span class="block text-[10px] text-on-surface-variant font-mono">{data.wrs.receivedByPayroll}</span>
						{/if}
					</dd>
				</div>
			</dl>
		</div>

		<!-- Card 2: Pengiriman & Lokasi Gudang -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-3">
			<h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
				<span class="material-symbols-outlined text-base">warehouse</span>
				<span>Vendor & Site Gudang</span>
			</h3>
			<dl class="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Supplier / Vendor:</dt>
					<dd class="font-bold text-on-surface text-right">
						<span>{data.wrs.supplierName || '-'}</span>
						{#if data.wrs.vendorCode}
							<span class="block text-[10px] text-on-surface-variant font-mono">{data.wrs.vendorCode}</span>
						{/if}
					</dd>
				</div>
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Surat Jalan Vendor:</dt>
					<dd class="font-mono font-bold text-on-surface">{data.wrs.vendorDeliveryNumber || '-'}</dd>
				</div>
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Lokasi Gudang:</dt>
					<dd class="font-semibold text-on-surface">{data.wrs.siteName ? `[${data.wrs.siteCode}] ${data.wrs.siteName}` : 'Gudang Pusat'}</dd>
				</div>
			</dl>
		</div>

		<!-- Card 3: Catatan Gudang -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-3">
			<h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
				<span class="material-symbols-outlined text-base">notes</span>
				<span>Catatan Penerimaan Fisik</span>
			</h3>
			<p class="text-xs text-on-surface leading-relaxed whitespace-pre-line bg-surface p-3 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[72px]">
				{data.wrs.notes || 'Tidak ada catatan inspeksi fisik khusus.'}
			</p>
		</div>
	</div>

	<!-- Line Items Table Card -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs space-y-0">
		<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
			<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
				<span class="material-symbols-outlined text-emerald-600">inventory_2</span>
				<span>Rincian Barang Diterima ({data.items.length} item)</span>
			</h3>
			<span class="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
				Total Masuk: {formatNumber(totalQty)} Satuan
			</span>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[750px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3 px-4 w-12 text-center">No</th>
						<th class="py-3 px-4">Kode Material</th>
						<th class="py-3 px-4">Nama Material & Spesifikasi</th>
						<th class="py-3 px-4">Brand / Merek</th>
						<th class="py-3 px-4 text-center w-28">Qty di PO</th>
						<th class="py-3 px-4 text-center w-36">Qty Diterima (LPB)</th>
						<th class="py-3 px-4 text-center w-32">Stok On-Hand</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if data.items.length === 0}
						<tr>
							<td colspan="7" class="py-8 text-center text-on-surface-variant">
								Belum ada rincian barang untuk laporan penerimaan ini.
							</td>
						</tr>
					{:else}
						{#each data.items as item, idx}
							<tr class="hover:bg-surface-container-high/30 transition-colors">
								<td class="py-3 px-4 text-center font-mono text-on-surface-variant">{idx + 1}</td>
								<td class="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-300 text-xs">
									{item.materialCode}
								</td>
								<td class="py-3 px-4">
									<p class="font-bold text-on-surface">{item.name}</p>
									<p class="text-[11px] text-on-surface-variant mt-0.5">{item.spec && item.spec !== '-' ? item.spec : ''}</p>
								</td>
								<td class="py-3 px-4 text-on-surface-variant">{item.brand || '-'}</td>
								<td class="py-3 px-4 text-center font-mono text-on-surface-variant">
									{item.qtyOrdered != null ? `${formatNumber(item.qtyOrdered)} ${item.uom}` : '-'}
								</td>
								<td class="py-3 px-4 text-center">
									<span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono font-black text-xs border border-emerald-300/40">
										{formatNumber(item.qtyReceived)} {item.uom}
									</span>
								</td>
								<td class="py-3 px-4 text-center font-mono font-semibold text-on-surface">
									{formatNumber(item.stock)} {item.uom}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
