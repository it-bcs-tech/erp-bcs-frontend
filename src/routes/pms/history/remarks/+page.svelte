<script lang="ts">
	import { formatDateId, formatRupiah } from '$lib/utils/pms';

	let { data } = $props();
	let searchQuery = $state('');

	let filteredHistory = $derived.by(() => {
		let list = data.history || [];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((h: any) =>
				(h.poNumber && h.poNumber.toLowerCase().includes(q)) ||
				(h.vendorName && h.vendorName.toLowerCase().includes(q)) ||
				(h.remarks && h.remarks.toLowerCase().includes(q)) ||
				(h.wrsNotes && h.wrsNotes.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>Riwayat PO by Remarks | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">notes</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Riwayat Pengadaan by Remarks</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Penelusuran catatan khusus, instruksi penagihan, dan catatan inspeksi penerimaan gudang
			</p>
		</div>
	</header>

	<!-- Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between gap-4">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari no PO, vendor, atau teks catatan..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Total: <strong class="text-on-surface">{filteredHistory.length}</strong> catatan
		</span>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-4">No. PO & Tanggal</th>
						<th class="py-3.5 px-4">Vendor</th>
						<th class="py-3.5 px-4">Catatan Pembelian (PO Remarks)</th>
						<th class="py-3.5 px-4">Catatan Gudang (WRS Notes)</th>
						<th class="py-3.5 px-4 text-right">Total PO</th>
						<th class="py-3.5 px-4 text-center">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredHistory.length === 0}
						<tr>
							<td colspan="6" class="py-12 text-center text-on-surface-variant">
								<p class="text-xs font-semibold">Tidak ada catatan yang cocok.</p>
							</td>
						</tr>
					{:else}
						{#each filteredHistory as h}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-4">
									<span class="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs">
										{h.poNumber}
									</span>
									<p class="text-[10px] text-on-surface-variant">{formatDateId(h.poDate)}</p>
								</td>
								<td class="py-3.5 px-4 font-bold text-on-surface">{h.vendorName}</td>
								<td class="py-3.5 px-4 text-on-surface max-w-sm">{h.remarks}</td>
								<td class="py-3.5 px-4 text-on-surface-variant max-w-xs">{h.wrsNotes}</td>
								<td class="py-3.5 px-4 text-right font-mono font-bold text-on-surface">
									{formatRupiah(h.totalAmount)}
								</td>
								<td class="py-3.5 px-4 text-center">
									<span class="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 dark:bg-slate-800 text-on-surface-variant">
										{h.status}
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
