<script lang="ts">
	import { formatDateId, formatRupiah, formatNumber } from '$lib/utils/pms';

	let { data } = $props();
	let activeTab = $state<'ORDER' | 'WRS' | 'HISTORY'>('WRS');
	let searchQuery = $state('');

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
				<table class="w-full text-left text-sm min-w-[900px]">
					<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3.5 px-4">No. PR & Tanggal</th>
							<th class="py-3.5 px-4">Pemohon & Dept</th>
							<th class="py-3.5 px-4">Project & Site</th>
							<th class="py-3.5 px-4">Material & Spec</th>
							<th class="py-3.5 px-4 text-center">Qty Request</th>
							<th class="py-3.5 px-4 text-center">Status PR</th>
							<th class="py-3.5 px-4 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
						{#if filteredOsOrders.length === 0}
							<tr>
								<td colspan="7" class="py-12 text-center text-on-surface-variant">
									<span class="material-symbols-outlined text-4xl text-emerald-500 mb-2">task_alt</span>
									<p class="text-xs font-semibold">Tidak ada PR yang tertunda. Semua permintaan telah diproses PO.</p>
								</td>
							</tr>
						{:else}
							{#each filteredOsOrders as pr}
								<tr class="hover:bg-surface-container-high/40 transition-colors">
									<td class="py-3.5 px-4">
										<span class="font-mono font-bold text-amber-700 dark:text-amber-300">
											{pr.prNumber}
										</span>
										<p class="text-[10px] text-on-surface-variant">{formatDateId(pr.date)}</p>
									</td>
									<td class="py-3.5 px-4">
										<p class="font-bold text-on-surface">{pr.requestedBy}</p>
										<p class="text-[10px] text-on-surface-variant">{pr.department}</p>
									</td>
									<td class="py-3.5 px-4">
										<p class="font-semibold text-on-surface">{pr.projectName || '-'}</p>
										<p class="text-[10px] text-on-surface-variant">{pr.siteName || 'Semua Site'}</p>
									</td>
									<td class="py-3.5 px-4">
										<p class="font-bold text-on-surface">{pr.materialName}</p>
										<p class="text-[10px] text-on-surface-variant font-mono">{pr.materialCode} • {pr.spec}</p>
									</td>
									<td class="py-3.5 px-4 text-center font-mono font-bold text-amber-600">
										{formatNumber(pr.qtyRequested)} {pr.uom}
									</td>
									<td class="py-3.5 px-4 text-center">
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
</div>
