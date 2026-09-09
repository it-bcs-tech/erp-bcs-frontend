<script lang="ts">
	import { formatDateId, formatRupiah, formatNumber } from '$lib/utils/pms';

	let { data } = $props();
	let activeTab = $state<'ORDER' | 'WRS' | 'HISTORY'>('WRS');
	let searchQuery = $state('');
	let selectedHistoryItem = $state<any | null>(null);

	let filteredOsOrders = $derived.by(() => {
		let list = data.osOrders || [];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((r: any) =>
				(r.prNumber && r.prNumber.toLowerCase().includes(q)) ||
				(r.materialName && r.materialName.toLowerCase().includes(q)) ||
				(r.projectName && r.projectName.toLowerCase().includes(q)) ||
				(r.requestedBy && r.requestedBy.toLowerCase().includes(q))
			);
		}
		return list;
	});

	let filteredOsWrs = $derived.by(() => {
		let list = data.osWrs || [];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((r: any) =>
				(r.poNumber && r.poNumber.toLowerCase().includes(q)) ||
				(r.materialName && r.materialName.toLowerCase().includes(q)) ||
				(r.vendorName && r.vendorName.toLowerCase().includes(q)) ||
				(r.projectName && r.projectName.toLowerCase().includes(q))
			);
		}
		return list;
	});

	let filteredOsHistory = $derived.by(() => {
		let list = data.osHistory || [];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((r: any) =>
				(r.poNumber && r.poNumber.toLowerCase().includes(q)) ||
				(r.materialName && r.materialName.toLowerCase().includes(q)) ||
				(r.vendorName && r.vendorName.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>Outstanding (OS) Hub | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">pending_actions</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Outstanding (OS) Hub</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Monitoring backlog pengadaan: PR belum diproses PO & PO yang belum selesai diterima di gudang (WRS)
			</p>
		</div>
	</header>

	<!-- Tabs Selector -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="inline-flex p-1.5 rounded-2xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 gap-1 shadow-xs">
			<button
				type="button"
				onclick={() => activeTab = 'WRS'}
				class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {activeTab === 'WRS'
					? 'bg-amber-600 text-white shadow-xs'
					: 'text-on-surface-variant hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">receipt_long</span>
				<span>OS WRS / LPB ({data.osWrs.length})</span>
			</button>

			<button
				type="button"
				onclick={() => activeTab = 'ORDER'}
				class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {activeTab === 'ORDER'
					? 'bg-amber-600 text-white shadow-xs'
					: 'text-on-surface-variant hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">assignment</span>
				<span>OS PR / Order ({data.osOrders.length})</span>
			</button>

			<button
				type="button"
				onclick={() => activeTab = 'HISTORY'}
				class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {activeTab === 'HISTORY'
					? 'bg-amber-600 text-white shadow-xs'
					: 'text-on-surface-variant hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">history</span>
				<span>OS History Tracking</span>
			</button>
		</div>

		<!-- Search Input -->
		<div class="relative w-full sm:w-80">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari nomor dokumen, material, atau vendor..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>
	</div>

	<!-- Tab 1: OS WRS (PO belum selesai diterima gudang) -->
	{#if activeTab === 'WRS'}
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm min-w-[950px]">
					<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3.5 px-4">No. PO & Tanggal</th>
							<th class="py-3.5 px-4">Vendor</th>
							<th class="py-3.5 px-4">Material & Spec</th>
							<th class="py-3.5 px-4 text-center">Qty Dipesan</th>
							<th class="py-3.5 px-4 text-center">Telah Diterima</th>
							<th class="py-3.5 px-4 text-center">Outstanding Qty</th>
							<th class="py-3.5 px-4 text-right">Nilai Outstanding (Rp)</th>
							<th class="py-3.5 px-4 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
						{#if filteredOsWrs.length === 0}
							<tr>
								<td colspan="8" class="py-12 text-center text-on-surface-variant">
									<span class="material-symbols-outlined text-4xl text-emerald-500 mb-2">task_alt</span>
									<p class="text-xs font-semibold">Semua pesanan PO telah selesai diterima lengkap di gudang.</p>
								</td>
							</tr>
						{:else}
							{#each filteredOsWrs as item}
								<tr class="hover:bg-surface-container-high/40 transition-colors">
									<td class="py-3.5 px-4">
										<a href="/pms/transactions/po" class="font-mono font-bold text-amber-700 dark:text-amber-300 hover:underline">
											{item.poNumber}
										</a>
										<p class="text-[10px] text-on-surface-variant">{formatDateId(item.poDate)}</p>
									</td>
									<td class="py-3.5 px-4 font-bold text-on-surface">{item.vendorName}</td>
									<td class="py-3.5 px-4">
										<p class="font-bold text-on-surface">{item.materialName}</p>
										<p class="text-[10px] text-on-surface-variant font-mono">{item.materialCode} • {item.spec}</p>
									</td>
									<td class="py-3.5 px-4 text-center font-mono font-semibold">
										{formatNumber(item.qtyOrdered)} {item.uom}
									</td>
									<td class="py-3.5 px-4 text-center font-mono text-on-surface-variant">
										{formatNumber(item.qtyReceived)} {item.uom}
									</td>
									<td class="py-3.5 px-4 text-center">
										<span class="px-2 py-0.5 rounded font-mono font-black text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200">
											{formatNumber(item.qtyOutstanding)} {item.uom}
										</span>
									</td>
									<td class="py-3.5 px-4 text-right font-mono font-bold text-on-surface">
										{formatRupiah(item.totalOutstanding)}
									</td>
									<td class="py-3.5 px-4 text-right">
										<a
											href="/pms/transactions/wrs/create?po_id={item.po_id}"
											class="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
										>
											<span class="material-symbols-outlined text-xs">receipt_long</span>
											<span>Terima WRS</span>
										</a>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Tab 2: OS Order (PR belum dibuatkan PO) -->
	{#if activeTab === 'ORDER'}
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm min-w-[1050px]">
					<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3.5 px-4">No. PR & Tanggal</th>
							<th class="py-3.5 px-4">Departemen</th>
							<th class="py-3.5 px-4">Project & Site</th>
							<th class="py-3.5 px-4">Material & Spec</th>
							<th class="py-3.5 px-3 text-right">Qty</th>
							<th class="py-3.5 px-3 text-left">Satuan</th>
							<th class="py-3.5 px-4">Riwayat Terakhir</th>
							<th class="py-3.5 px-3 text-center">Status PR</th>
							<th class="py-3.5 px-4 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
						{#if filteredOsOrders.length === 0}
							<tr>
								<td colspan="9" class="py-12 text-center text-on-surface-variant">
									<span class="material-symbols-outlined text-4xl text-emerald-500 mb-2">task_alt</span>
									<p class="text-xs font-semibold">Tidak ada PR yang tertunda. Semua permintaan telah diproses PO.</p>
								</td>
							</tr>
						{:else}
							{#each filteredOsOrders as pr}
								<tr class="hover:bg-surface-container-high/40 transition-colors">
									<td class="py-3.5 px-4">
										<div class="flex items-center gap-2 whitespace-nowrap">
											<span class="font-mono font-bold text-amber-700 dark:text-amber-400">
												{pr.prNumber}
											</span>
											<span class="text-slate-300 dark:text-slate-700">•</span>
											<span class="text-[11px] text-on-surface-variant font-medium">{formatDateId(pr.date)}</span>
										</div>
									</td>
									<td class="py-3.5 px-4 font-semibold text-on-surface whitespace-nowrap">
										{pr.department || '-'}
									</td>
									<td class="py-3.5 px-4">
										<div class="flex items-center gap-1.5 whitespace-nowrap text-xs">
											<span class="font-semibold text-on-surface">{pr.projectName || '-'}</span>
											<span class="text-slate-400">/</span>
											<span class="text-on-surface-variant text-[11px]">{pr.siteName || 'Semua Site'}</span>
										</div>
									</td>
									<td class="py-3.5 px-4">
										<div>
											<div class="flex items-center gap-1.5">
												<span class="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{pr.materialCode}</span>
												<span class="font-bold text-on-surface text-xs">{pr.materialName}</span>
											</div>
											{#if pr.spec && pr.spec !== '-'}
												<p class="text-[11px] text-on-surface-variant mt-0.5 italic">{pr.spec}</p>
											{/if}
										</div>
									</td>
									<td class="py-3.5 px-3 text-right font-mono font-bold text-amber-600 text-xs">
										{formatNumber(pr.qtyRequested)}
									</td>
									<td class="py-3.5 px-3 font-semibold text-on-surface-variant text-xs">
										{pr.uom}
									</td>
									<td class="py-3.5 px-4">
										{#if pr.lastPo}
											<button
												type="button"
												onclick={() => selectedHistoryItem = pr}
												class="text-left group cursor-pointer hover:bg-amber-500/10 p-1.5 rounded-lg transition-colors border border-dashed border-amber-500/30 w-full min-w-[130px]"
												title="Klik untuk melihat 3 riwayat PO terakhir"
											>
												<div class="flex items-center justify-between gap-1">
													<span class="font-mono font-bold text-xs text-on-surface group-hover:text-amber-600">{formatRupiah(pr.lastPo.unitPrice)}</span>
													<span class="material-symbols-outlined text-[14px] text-amber-600 opacity-60 group-hover:opacity-100">history</span>
												</div>
												<p class="text-[10px] text-on-surface-variant truncate max-w-[140px]">{pr.lastPo.vendorName}</p>
											</button>
										{:else}
											<span class="text-[10px] text-slate-400 italic">Belum ada PO</span>
										{/if}
									</td>
									<td class="py-3.5 px-3 text-center">
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold border {pr.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}">
											{pr.status}
										</span>
									</td>
									<td class="py-3.5 px-4 text-right">
										<a
											href="/pms/transactions/po/create?pr_id={pr.id}"
											class="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
										>
											<span class="material-symbols-outlined text-xs">shopping_cart</span>
											<span>Proses PO</span>
										</a>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Tab 3: OS History -->
	{#if activeTab === 'HISTORY'}
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm min-w-[900px]">
					<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3.5 px-4">No. PO & Tanggal</th>
							<th class="py-3.5 px-4">Vendor</th>
							<th class="py-3.5 px-4">Material</th>
							<th class="py-3.5 px-4 text-center">Qty Order</th>
							<th class="py-3.5 px-4 text-right">Harga Satuan</th>
							<th class="py-3.5 px-4 text-right">Total Nilai</th>
							<th class="py-3.5 px-4 text-center">Status PO</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
						{#if filteredOsHistory.length === 0}
							<tr>
								<td colspan="7" class="py-12 text-center text-on-surface-variant">
									<p class="text-xs font-semibold">Tidak ada riwayat.</p>
								</td>
							</tr>
						{:else}
							{#each filteredOsHistory as h}
								<tr class="hover:bg-surface-container-high/40 transition-colors">
									<td class="py-3.5 px-4 font-mono font-bold text-on-surface">
										{h.poNumber}
										<p class="text-[10px] text-on-surface-variant font-sans">{formatDateId(h.poDate)}</p>
									</td>
									<td class="py-3.5 px-4 font-bold text-on-surface">{h.vendorName}</td>
									<td class="py-3.5 px-4">
										<p class="font-bold text-on-surface">{h.materialName}</p>
										<p class="text-[10px] text-on-surface-variant font-mono">{h.materialCode}</p>
									</td>
									<td class="py-3.5 px-4 text-center font-mono font-semibold">
										{formatNumber(h.qtyOrdered)} {h.uom}
									</td>
									<td class="py-3.5 px-4 text-right font-mono">
										{formatRupiah(h.unitPrice)}
									</td>
									<td class="py-3.5 px-4 text-right font-mono font-bold text-on-surface">
										{formatRupiah(h.total)}
									</td>
									<td class="py-3.5 px-4 text-center">
										<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 dark:bg-slate-800 text-on-surface-variant">
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
	{/if}

	<!-- Modal Riwayat Pembelian PO -->
	{#if selectedHistoryItem}
		<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="bg-surface-container-lowest border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
					<div>
						<h3 class="text-sm font-bold text-on-surface flex items-center gap-2">
							<span class="material-symbols-outlined text-amber-600 text-lg">history</span>
							<span>Riwayat Pembelian PO Terakhir</span>
						</h3>
						<p class="text-xs text-on-surface-variant mt-0.5">
							<span class="font-mono font-bold text-amber-700 dark:text-amber-400">[{selectedHistoryItem.materialCode}]</span>
							{selectedHistoryItem.materialName}
						</p>
					</div>
					<button
						type="button"
						onclick={() => selectedHistoryItem = null}
						class="p-1 rounded-lg text-slate-400 hover:text-on-surface hover:bg-surface-container transition-colors"
					>
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>

				{#if selectedHistoryItem.purchaseHistory && selectedHistoryItem.purchaseHistory.length > 0}
					<div class="overflow-x-auto">
						<table class="w-full text-left text-xs">
							<thead class="bg-surface-container text-on-surface-variant font-bold border-b border-slate-200/60 dark:border-slate-800">
								<tr>
									<th class="py-2.5 px-3">No. PO & Tgl</th>
									<th class="py-2.5 px-3">Vendor / Supplier</th>
									<th class="py-2.5 px-3 text-right">Qty</th>
									<th class="py-2.5 px-3 text-right">Harga Satuan</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium">
								{#each selectedHistoryItem.purchaseHistory as po}
									<tr class="hover:bg-surface-container-high/30 transition-colors">
										<td class="py-2.5 px-3">
											<p class="font-mono font-bold text-amber-700 dark:text-amber-400">{po.poNumber}</p>
											<p class="text-[10px] text-on-surface-variant">{formatDateId(po.poDate)}</p>
										</td>
										<td class="py-2.5 px-3 font-semibold text-on-surface">{po.vendorName}</td>
										<td class="py-2.5 px-3 text-right font-mono">{formatNumber(po.qtyOrdered)} {selectedHistoryItem.uom}</td>
										<td class="py-2.5 px-3 text-right font-mono font-bold text-on-surface">{formatRupiah(po.unitPrice)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="py-8 text-center text-on-surface-variant text-xs">
						<span class="material-symbols-outlined text-3xl text-slate-400 mb-1">info</span>
						<p>Belum ada riwayat transaksi Purchase Order (PO) sebelumnya untuk material ini.</p>
					</div>
				{/if}

				<div class="flex justify-end pt-2 border-t border-slate-200/80 dark:border-slate-800">
					<button
						type="button"
						onclick={() => selectedHistoryItem = null}
						class="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded-xl transition-colors cursor-pointer"
					>
						Tutup
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
