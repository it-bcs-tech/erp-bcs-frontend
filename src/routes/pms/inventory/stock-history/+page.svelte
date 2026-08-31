<script lang="ts">
	import { formatNumber } from '$lib/utils/pms';

	let { data } = $props();
	let searchQuery = $state('');
	let filterType = $state<'ALL' | 'IN' | 'OUT'>('ALL');

	let filteredTransactions = $derived.by(() => {
		let list = data.transactions || [];
		if (filterType === 'IN') {
			list = list.filter((t: any) => t.transactionType?.startsWith('IN'));
		} else if (filterType === 'OUT') {
			list = list.filter((t: any) => t.transactionType?.startsWith('OUT'));
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((t: any) =>
				(t.materialName && t.materialName.toLowerCase().includes(q)) ||
				(t.materialCode && t.materialCode.toLowerCase().includes(q)) ||
				(t.referenceNo && t.referenceNo.toLowerCase().includes(q)) ||
				(t.createdBy && t.createdBy.toLowerCase().includes(q)) ||
				(t.note && t.note.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>Kartu Stok & Mutasi Inventori | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">swap_horiz</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Kartu Stok & Riwayat Mutasi Barang</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Pencatatan keluar-masuk barang fisik gudang otomatis berdasarkan penerimaan WRS & pengeluaran service
			</p>
		</div>
	</header>

	<!-- Tabs & Search -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="inline-flex p-1.5 rounded-2xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 gap-1 shadow-xs">
			<button
				type="button"
				onclick={() => filterType = 'ALL'}
				class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {filterType === 'ALL'
					? 'bg-amber-600 text-white shadow-xs'
					: 'text-on-surface-variant hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">sync_alt</span>
				<span>Semua Mutasi</span>
			</button>

			<button
				type="button"
				onclick={() => filterType = 'IN'}
				class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {filterType === 'IN'
					? 'bg-emerald-600 text-white shadow-xs'
					: 'text-on-surface-variant hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">arrow_downward</span>
				<span>Barang Masuk (IN)</span>
			</button>

			<button
				type="button"
				onclick={() => filterType = 'OUT'}
				class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {filterType === 'OUT'
					? 'bg-rose-600 text-white shadow-xs'
					: 'text-on-surface-variant hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">arrow_upward</span>
				<span>Barang Keluar (OUT)</span>
			</button>
		</div>

		<div class="relative w-full sm:w-80">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari referensi WRS, material, petugas..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-4">Waktu Transaksi</th>
						<th class="py-3.5 px-4">Tipe Mutasi</th>
						<th class="py-3.5 px-4">No. Referensi (WRS/DN)</th>
						<th class="py-3.5 px-4">Material & Kode</th>
						<th class="py-3.5 px-4 text-center">Jumlah Mutasi</th>
						<th class="py-3.5 px-4">Petugas Gudang</th>
						<th class="py-3.5 px-4">Keterangan</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredTransactions.length === 0}
						<tr>
							<td colspan="7" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">swap_horiz</span>
								<p class="text-xs font-semibold">Tidak ada data transaksi mutasi.</p>
							</td>
						</tr>
					{:else}
						{#each filteredTransactions as tx}
							{@const isIncoming = tx.transactionType?.startsWith('IN')}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-4 font-mono text-on-surface">{tx.date}</td>
								<td class="py-3.5 px-4">
									<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border {isIncoming ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}">
										<span class="material-symbols-outlined text-xs">{isIncoming ? 'arrow_downward' : 'arrow_upward'}</span>
										<span>{isIncoming ? 'Penerimaan (IN)' : 'Pengeluaran (OUT)'}</span>
									</span>
								</td>
								<td class="py-3.5 px-4 font-mono font-bold text-on-surface">{tx.referenceNo}</td>
								<td class="py-3.5 px-4">
									<p class="font-bold text-on-surface">{tx.materialName}</p>
									<p class="text-[10px] font-mono text-amber-700 dark:text-amber-300 font-bold">{tx.materialCode}</p>
								</td>
								<td class="py-3.5 px-4 text-center">
									<span class="font-mono font-black text-xs {isIncoming ? 'text-emerald-600' : 'text-rose-600'}">
										{isIncoming ? '+' : '-'}{formatNumber(tx.qty)} {tx.uom}
									</span>
								</td>
								<td class="py-3.5 px-4 text-on-surface font-semibold">{tx.createdBy}</td>
								<td class="py-3.5 px-4 text-on-surface-variant max-w-xs truncate">{tx.note || '-'}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
