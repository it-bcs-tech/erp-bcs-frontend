<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDateId, formatNumber, formatRupiah, getCategoryBadge, getPOStatusBadge } from '$lib/utils/pms';

	let { data } = $props();

	let catBadge = $derived(getCategoryBadge(data.po.category));
	let stBadge = $derived(getPOStatusBadge(data.po.status));

	let totalQty = $derived(
		(data.items || []).reduce((sum: number, itm: any) => sum + (parseFloat(itm.qtyOrdered) || 0), 0)
	);
</script>

<svelte:head>
	<title>Detail PO {data.po.poNumber} | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6 max-w-6xl mx-auto">
	<!-- Top Navigation & Action Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<a
				href="/pms/transactions/po"
				class="p-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 hover:bg-surface-container-high text-on-surface-variant transition-colors shadow-xs"
				title="Kembali ke Daftar PO"
			>
				<span class="material-symbols-outlined text-lg">arrow_back</span>
			</a>
			<div>
				<div class="flex flex-wrap items-center gap-2.5">
					<h1 class="text-2xl font-black text-on-surface tracking-tight font-mono">{data.po.poNumber}</h1>
					<span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border {stBadge.badgeClass}">
						<span class="material-symbols-outlined text-xs">{stBadge.icon}</span>
						<span>{stBadge.label}</span>
					</span>
					<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border {catBadge.badgeClass}">
						<span class="material-symbols-outlined text-xs">{catBadge.icon}</span>
						<span>{catBadge.label}</span>
					</span>
				</div>
				<p class="text-on-surface-variant font-medium text-xs mt-0.5">
					Diterbitkan: {formatDateId(data.po.date)} • Vendor: <strong class="text-on-surface">{data.po.vendorName}</strong>
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
				<span>Cetak PO</span>
			</button>

			{#if data.po.status === 'DRAFT'}
				<a
					href="/pms/transactions/po/{data.po.id}/edit"
					class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-bold transition-colors shadow-xs cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">edit</span>
					<span>Edit PO</span>
				</a>
				<form method="POST" action="?/confirmPO" use:enhance>
					<button
						type="submit"
						class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
					>
						<span class="material-symbols-outlined text-base">check</span>
						<span>Confirm PO</span>
					</button>
				</form>
			{:else}
				{#if data.po.status === 'CONFIRMED' || data.po.status === 'PARTIAL_RECEIVED'}
					<a
						href="/pms/transactions/wrs/create?po_id={data.po.id}"
						class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
					>
						<span class="material-symbols-outlined text-base">receipt_long</span>
						<span>Terima LPB (WRS)</span>
					</a>
				{/if}
			{/if}
		</div>
	</header>

	<!-- Linked WRS Banner if receipts exist -->
	{#if data.linkedWrs && data.linkedWrs.length > 0}
		<div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
			<div class="flex items-center gap-3">
				<div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
					<span class="material-symbols-outlined text-lg">verified</span>
				</div>
				<div>
					<p class="font-bold text-on-surface">Penerimaan Gudang (WRS/LPB) Terkait:</p>
					<div class="flex flex-wrap items-center gap-2 mt-1">
						{#each data.linkedWrs as wrs}
							<a
								href="/pms/transactions/wrs/{wrs.id}"
								class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-mono font-bold hover:underline"
							>
								<span>{wrs.grNumber}</span>
								<span class="text-[10px] font-sans font-medium">({wrs.item_count} item • {formatNumber(wrs.total_qty_received)} qty)</span>
							</a>
						{/each}
					</div>
				</div>
			</div>
			<span class="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium self-start sm:self-auto">
				Barang telah diterima di gudang BCS.
			</span>
		</div>
	{/if}

	<!-- Metadata Grid Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Card 1: Vendor & Tagihan -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-3">
			<h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
				<span class="material-symbols-outlined text-base">store</span>
				<span>Vendor & Pembayaran</span>
			</h3>
			<dl class="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Vendor:</dt>
					<dd class="font-bold text-on-surface text-right">
						<span>{data.po.vendorName}</span>
						<span class="block text-[10px] text-on-surface-variant font-mono">{data.po.vendorCode}</span>
					</dd>
				</div>
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Jatuh Tempo:</dt>
					<dd class="font-mono font-bold text-on-surface">{data.po.dueDate ? formatDateId(data.po.dueDate) : '-'}</dd>
				</div>
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Mata Uang:</dt>
					<dd class="font-bold font-mono text-on-surface">{data.po.currency || 'IDR'}</dd>
				</div>
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Dibuat Oleh:</dt>
					<dd class="text-right">
						<span class="font-semibold text-on-surface">{data.po.createdByName || data.po.createdBy}</span>
						{#if data.po.createdByPayroll}
							<span class="block text-[10px] text-on-surface-variant font-mono">{data.po.createdByPayroll}</span>
						{/if}
					</dd>
				</div>
			</dl>
		</div>

		<!-- Card 2: Pengiriman & Alokasi -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-3">
			<h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
				<span class="material-symbols-outlined text-base">local_shipping</span>
				<span>Pengiriman & Project</span>
			</h3>
			<dl class="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Project:</dt>
					<dd class="font-bold text-on-surface">{data.po.projectName || '-'}</dd>
				</div>
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Site Penerima:</dt>
					<dd class="font-semibold text-on-surface">{data.po.siteName || 'Semua Site'}</dd>
				</div>
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Tgl Pengiriman:</dt>
					<dd class="font-mono font-bold text-on-surface">{data.po.shipmentDate ? formatDateId(data.po.shipmentDate) : '-'}</dd>
				</div>
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">No. Referensi / PR:</dt>
					<dd class="font-mono text-[11px] font-semibold text-amber-700 dark:text-amber-300 text-right max-w-[180px] truncate" title={data.po.refNo}>
						{data.po.refNo || '-'}
					</dd>
				</div>
			</dl>
		</div>

		<!-- Card 3: Catatan Pengadaan -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-3">
			<h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
				<span class="material-symbols-outlined text-base">notes</span>
				<span>Catatan Transaksi</span>
			</h3>
			<div class="space-y-2 text-xs">
				<div>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase">Catatan Pembelian (PO):</span>
					<p class="text-on-surface leading-relaxed whitespace-pre-line bg-surface p-2 rounded-lg border border-slate-200 dark:border-slate-800 mt-1 min-h-[44px]">
						{data.po.notes || '-'}
					</p>
				</div>
				{#if data.po.wrsNotes}
					<div>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase">Catatan Gudang (WRS):</span>
						<p class="text-on-surface leading-relaxed whitespace-pre-line bg-surface p-2 rounded-lg border border-slate-200 dark:border-slate-800 mt-1">
							{data.po.wrsNotes}
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Line Items Table Card -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs space-y-0">
		<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
			<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
				<span class="material-symbols-outlined text-amber-600">format_list_bulleted</span>
				<span>Rincian Barang & Biaya ({data.items.length} item)</span>
			</h3>
			<span class="text-xs font-mono font-bold text-on-surface-variant bg-surface px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
				Total: {formatNumber(totalQty)} Satuan
			</span>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[850px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3 px-4 w-12 text-center">No</th>
						<th class="py-3 px-4">Nama Material & Asal PR</th>
						<th class="py-3 px-4">Spesifikasi</th>
						<th class="py-3 px-4 text-center w-28">Qty Order</th>
						<th class="py-3 px-4">Satuan</th>
						<th class="py-3 px-4 text-right w-36">Harga Satuan (Rp)</th>
						<th class="py-3 px-4 text-right w-40">Total (Rp)</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if data.items.length === 0}
						<tr>
							<td colspan="7" class="py-8 text-center text-on-surface-variant">
								Belum ada rincian barang untuk Purchase Order ini.
							</td>
						</tr>
					{:else}
						{#each data.items as item, idx}
							<tr class="hover:bg-surface-container-high/30 transition-colors">
								<td class="py-3 px-4 text-center font-mono text-on-surface-variant">{idx + 1}</td>
								<td class="py-3 px-4">
									<div class="flex items-center gap-1.5 flex-wrap">
										{#if item.prNumber}
											<a
												href="/pms/transactions/pr/{item.prId}"
												class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40 dark:border-amber-800/40 hover:underline shrink-0"
												title="Klik untuk membuka PR asal"
											>
												{item.prNumber}
											</a>
										{/if}
										<span class="font-bold text-on-surface">{item.name}</span>
									</div>
									<p class="text-[10px] text-on-surface-variant font-mono mt-0.5">{item.materialCode}</p>
								</td>
								<td class="py-3 px-4 text-on-surface-variant">{item.spec && item.spec !== '-' ? item.spec : '-'}</td>
								<td class="py-3 px-4 text-center">
									<span class="font-mono font-bold text-on-surface">
										{formatNumber(item.qtyOrdered)}
									</span>
								</td>
								<td class="py-3 px-4 font-semibold">{item.uom}</td>
								<td class="py-3 px-4 text-right font-mono text-on-surface">
									{formatRupiah(item.unitPrice)}
								</td>
								<td class="py-3 px-4 text-right font-mono font-bold text-on-surface">
									{formatRupiah(item.total)}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		<!-- Financial Calculation Footer Box -->
		<div class="border-t border-slate-200/60 dark:border-slate-800/60 p-5 bg-surface-container-lowest flex justify-end">
			<div class="w-full sm:w-80 space-y-2 text-xs font-medium">
				<div class="flex justify-between">
					<span class="text-on-surface-variant">Subtotal:</span>
					<span class="font-mono font-bold text-on-surface">{formatRupiah(data.po.subtotal)}</span>
				</div>
				<div class="flex justify-between text-rose-600">
					<span>Diskon ({data.po.discountPercent || 0}%):</span>
					<span class="font-mono font-bold">- {formatRupiah((data.po.subtotal * (data.po.discountPercent || 0)) / 100)}</span>
				</div>
				<div class="flex justify-between text-on-surface-variant">
					<span>PPN ({data.po.vatPercent || 11}%):</span>
					<span class="font-mono font-bold text-on-surface">+ {formatRupiah(data.po.taxAmount)}</span>
				</div>
				<div class="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center text-sm font-black text-on-surface">
					<span>Total Nilai PO:</span>
					<span class="text-amber-600 dark:text-amber-400 font-mono text-base">{formatRupiah(data.po.totalAmount)}</span>
				</div>
			</div>
		</div>
	</div>
</div>
