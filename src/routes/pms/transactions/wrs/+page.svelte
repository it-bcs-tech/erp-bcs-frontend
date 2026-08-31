<script lang="ts">
	import { formatDateId, formatNumber } from '$lib/utils/pms';

	let { data } = $props();
	let searchQuery = $state('');

	let filteredReceipts = $derived.by(() => {
		let list = data.receipts || [];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((r: any) =>
				(r.grNumber && r.grNumber.toLowerCase().includes(q)) ||
				(r.poNumber && r.poNumber.toLowerCase().includes(q)) ||
				(r.supplierName && r.supplierName.toLowerCase().includes(q)) ||
				(r.vendorDeliveryNumber && r.vendorDeliveryNumber.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>WRS / LPB Penerimaan Gudang | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">receipt_long</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">WRS / LPB Penerimaan Barang</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Warehouse Receiving Slip (Laporan Penerimaan Barang) fisik di gudang BCS secara real-time
			</p>
		</div>
		<a
			href="/pms/transactions/wrs/create"
			class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Terima Barang Baru (LPB)</span>
		</a>
	</header>

	<!-- Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between gap-4">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari no WRS, no PO, supplier, atau no surat jalan vendor..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Total: <strong class="text-on-surface">{filteredReceipts.length}</strong> WRS
		</span>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-4">No. WRS (LPB)</th>
						<th class="py-3.5 px-4">No. Purchase Order</th>
						<th class="py-3.5 px-4">Tanggal Terima</th>
						<th class="py-3.5 px-4">Supplier / Vendor</th>
						<th class="py-3.5 px-4">Surat Jalan / Delivery No</th>
						<th class="py-3.5 px-4">Site Gudang</th>
						<th class="py-3.5 px-4 text-center">Total Item Diterima</th>
						<th class="py-3.5 px-4 text-center">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredReceipts.length === 0}
						<tr>
							<td colspan="8" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">receipt_long</span>
								<p class="text-xs font-semibold">Tidak ada data penerimaan gudang (WRS).</p>
							</td>
						</tr>
					{:else}
						{#each filteredReceipts as wrs}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-4">
									<span class="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-xs bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200">
										{wrs.grNumber}
									</span>
								</td>
								<td class="py-3.5 px-4">
									<a href="/pms/transactions/po" class="font-mono font-bold text-amber-700 dark:text-amber-300 hover:underline">
										{wrs.poNumber}
									</a>
								</td>
								<td class="py-3.5 px-4 font-mono text-on-surface">{formatDateId(wrs.date)}</td>
								<td class="py-3.5 px-4 font-bold text-on-surface">{wrs.supplierName || '-'}</td>
								<td class="py-3.5 px-4 font-mono text-on-surface-variant">{wrs.vendorDeliveryNumber || '-'}</td>
								<td class="py-3.5 px-4 text-on-surface font-semibold">{wrs.siteName || 'Gudang Pusat'}</td>
								<td class="py-3.5 px-4 text-center font-mono font-bold text-on-surface">
									{wrs.item_count} item ({formatNumber(wrs.total_qty_received)} qty)
								</td>
								<td class="py-3.5 px-4 text-center">
									<span class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300">
										<span class="material-symbols-outlined text-xs">verified</span>
										<span>Diterima</span>
									</span>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
