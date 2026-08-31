<script lang="ts">
	import { formatRupiah, formatNumber } from '$lib/utils/pms';

	let { data } = $props();
	let searchQuery = $state('');
	let lowStockOnly = $state(false);

	let filteredItems = $derived.by(() => {
		let list = data.items || [];
		if (lowStockOnly) {
			list = list.filter((i: any) => parseFloat(i.stock) <= parseFloat(i.minStock));
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((i: any) =>
				(i.name && i.name.toLowerCase().includes(q)) ||
				(i.materialCode && i.materialCode.toLowerCase().includes(q)) ||
				(i.locationName && i.locationName.toLowerCase().includes(q)) ||
				(i.brand && i.brand.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>Stok On Hand Inventori | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">warehouse</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Stok On-Hand Inventori Gudang</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Ketersediaan fisik barang & suku cadang real-time di seluruh lokasi gudang & pool logistik BCS
			</p>
		</div>
	</header>

	<!-- KPI Summary Widgets -->
	<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center gap-4">
			<div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
				<span class="material-symbols-outlined text-2xl">category</span>
			</div>
			<div>
				<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Katalog Material</p>
				<p class="text-xl font-black text-on-surface font-mono mt-0.5">{formatNumber(data.summary.totalItems)} Item</p>
			</div>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center gap-4">
			<div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
				<span class="material-symbols-outlined text-2xl">inventory_2</span>
			</div>
			<div>
				<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Fisik Stok</p>
				<p class="text-xl font-black text-on-surface font-mono mt-0.5">{formatNumber(data.summary.totalStockQty)} Qty</p>
			</div>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center gap-4">
			<div class="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
				<span class="material-symbols-outlined text-2xl">payments</span>
			</div>
			<div>
				<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Nilai Aset Inventori</p>
				<p class="text-xl font-black text-amber-600 font-mono mt-0.5">{formatRupiah(data.summary.totalAssetValue)}</p>
			</div>
		</div>

		<button
			type="button"
			onclick={() => lowStockOnly = !lowStockOnly}
			class="p-5 rounded-2xl border shadow-xs flex items-center gap-4 text-left transition-all cursor-pointer {lowStockOnly
				? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700'
				: 'bg-surface-container-low border-slate-200/60 dark:border-slate-800/60 hover:bg-surface-container'}"
		>
			<div class="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
				<span class="material-symbols-outlined text-2xl">warning</span>
			</div>
			<div>
				<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Low Stock Alert</p>
				<p class="text-xl font-black text-rose-600 font-mono mt-0.5">{data.summary.lowStockCount} Item Menipis</p>
			</div>
		</button>
	</div>

	<!-- Search & Filter Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
		<div class="relative flex-1 w-full max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari kode material, nama suku cadang, brand, atau gudang..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>

		<div class="flex items-center gap-3">
			<label class="flex items-center gap-2 text-xs font-bold text-on-surface cursor-pointer">
				<input type="checkbox" bind:checked={lowStockOnly} class="rounded text-amber-600 focus:ring-amber-500" />
				<span>Tampilkan Hanya Stok Kritis (Under Min Stock)</span>
			</label>

			<span class="text-xs font-medium text-on-surface-variant whitespace-nowrap">
				Total: <strong class="text-on-surface">{filteredItems.length}</strong> item
			</span>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[950px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-4">Material ID & Nama</th>
						<th class="py-3.5 px-4">Spesifikasi & Brand</th>
						<th class="py-3.5 px-4">Lokasi Gudang</th>
						<th class="py-3.5 px-4 text-center">Stok Fisik</th>
						<th class="py-3.5 px-4 text-center">Min. Stock</th>
						<th class="py-3.5 px-4 text-right">Harga Satuan</th>
						<th class="py-3.5 px-4 text-right">Total Nilai Stok</th>
						<th class="py-3.5 px-4 text-center">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredItems.length === 0}
						<tr>
							<td colspan="8" class="py-12 text-center text-on-surface-variant">
								<p class="text-xs font-semibold">Tidak ada material yang sesuai kriteria.</p>
							</td>
						</tr>
					{:else}
						{#each filteredItems as itm}
							{@const isLow = parseFloat(itm.stock) <= parseFloat(itm.minStock)}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-4">
									<p class="font-bold text-on-surface text-sm">{itm.name}</p>
									<span class="font-mono text-amber-700 dark:text-amber-300 font-bold text-[11px]">{itm.materialCode}</span>
								</td>
								<td class="py-3.5 px-4">
									<p class="text-on-surface">{itm.spec}</p>
									<p class="text-[10px] text-on-surface-variant font-semibold">Brand: {itm.brand}</p>
								</td>
								<td class="py-3.5 px-4">
									<p class="font-semibold text-on-surface">{itm.locationName}</p>
									<p class="text-[10px] text-on-surface-variant font-mono">{itm.locationAlias}</p>
								</td>
								<td class="py-3.5 px-4 text-center">
									<span class="font-mono font-black text-sm px-2.5 py-1 rounded-lg border {isLow ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}">
										{formatNumber(itm.stock)} {itm.uom}
									</span>
								</td>
								<td class="py-3.5 px-4 text-center font-mono text-on-surface-variant">
									{formatNumber(itm.minStock)} {itm.uom}
								</td>
								<td class="py-3.5 px-4 text-right font-mono font-semibold text-on-surface">
									{formatRupiah(itm.standardPrice)}
								</td>
								<td class="py-3.5 px-4 text-right font-mono font-bold text-on-surface">
									{formatRupiah(itm.totalAssetValue)}
								</td>
								<td class="py-3.5 px-4 text-center">
									<span class="px-2 py-0.5 rounded-full text-[10px] font-bold border {isLow ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}">
										{isLow ? 'Restock Needed' : 'Aman (Safe)'}
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
