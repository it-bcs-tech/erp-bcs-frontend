<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDateId, formatRupiah, getCategoryBadge, getPOStatusBadge } from '$lib/utils/pms';

	let { data } = $props();
	let searchQuery = $state('');
	let statusFilter = $state('');
	let categoryFilter = $state('');

	let filteredOrders = $derived.by(() => {
		let list = data.orders || [];
		if (statusFilter) {
			list = list.filter((o: any) => o.status === statusFilter);
		}
		if (categoryFilter) {
			list = list.filter((o: any) => o.category === categoryFilter);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((o: any) =>
				(o.poNumber && o.poNumber.toLowerCase().includes(q)) ||
				(o.vendorName && o.vendorName.toLowerCase().includes(q)) ||
				(o.projectName && o.projectName.toLowerCase().includes(q)) ||
				(o.refNo && o.refNo.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>Purchase Orders (PO) | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">shopping_cart</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Purchase Orders (PO)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Penerbitan pesanan resmi pembelian kepada vendor & supplier dengan kalkulasi diskon & PPN 11%
			</p>
		</div>
		<a
			href="/pms/transactions/po/create"
			class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Buat PO Baru</span>
		</a>
	</header>

	<!-- Search & Filter Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
		<div class="relative flex-1 w-full max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari nomor PO, vendor, project, atau no ref..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
			<select
				bind:value={categoryFilter}
				class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			>
				<option value="">Semua Kategori</option>
				<option value="PACKAGING">Packaging</option>
				<option value="TRANSPORT">Transport</option>
				<option value="WAREHOUSE">Warehouse</option>
				<option value="SUPPORTING">Supporting</option>
			</select>

			<select
				bind:value={statusFilter}
				class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			>
				<option value="">Semua Status PO</option>
				<option value="DRAFT">Draft</option>
				<option value="CONFIRMED">Confirmed / Approved</option>
				<option value="PARTIAL_RECEIVED">Sebagian Diterima</option>
				<option value="COMPLETED">Selesai (Completed)</option>
				<option value="CANCELLED">Dibatalkan</option>
			</select>

			<span class="text-xs font-medium text-on-surface-variant whitespace-nowrap">
				Total: <strong class="text-on-surface">{filteredOrders.length}</strong> PO
			</span>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[1000px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-4">No. PO & Tanggal</th>
						<th class="py-3.5 px-4">Vendor / Supplier</th>
						<th class="py-3.5 px-4">Project & Site</th>
						<th class="py-3.5 px-4">Kategori</th>
						<th class="py-3.5 px-4">Shipment & Ref</th>
						<th class="py-3.5 px-4 text-right">Total Nilai (Inc PPN)</th>
						<th class="py-3.5 px-4 text-center">Status</th>
						<th class="py-3.5 px-4 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredOrders.length === 0}
						<tr>
							<td colspan="8" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">shopping_cart</span>
								<p class="text-xs font-semibold">Tidak ada data Purchase Order.</p>
							</td>
						</tr>
					{:else}
						{#each filteredOrders as po}
							{@const catBadge = getCategoryBadge(po.category)}
							{@const stBadge = getPOStatusBadge(po.status)}

							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-4">
									<span class="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs">
										{po.poNumber}
									</span>
									<p class="text-[10px] text-on-surface-variant mt-0.5">{formatDateId(po.date)}</p>
								</td>
								<td class="py-3.5 px-4">
									<p class="font-bold text-on-surface">{po.vendorName}</p>
									<p class="text-[10px] text-on-surface-variant font-mono">{po.vendorCode}</p>
								</td>
								<td class="py-3.5 px-4">
									<p class="font-semibold text-on-surface">{po.projectName || '-'}</p>
									<p class="text-[10px] text-on-surface-variant">{po.siteName || 'Semua Site'}</p>
								</td>
								<td class="py-3.5 px-4">
									<span class="px-2.5 py-1 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 {catBadge.badgeClass}">
										<span class="material-symbols-outlined text-xs">{catBadge.icon}</span>
										<span>{catBadge.label}</span>
									</span>
								</td>
								<td class="py-3.5 px-4">
									<p class="text-on-surface">{po.shipmentLocation || '-'}</p>
									<p class="text-[10px] text-on-surface-variant">Ref: {po.refNo || '-'}</p>
								</td>
								<td class="py-3.5 px-4 text-right font-mono font-bold text-on-surface text-sm">
									{formatRupiah(po.totalAmount)}
								</td>
								<td class="py-3.5 px-4 text-center">
									<span class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border {stBadge.badgeClass}">
										<span class="material-symbols-outlined text-xs">{stBadge.icon}</span>
										<span>{stBadge.label}</span>
									</span>
								</td>
								<td class="py-3.5 px-4 text-right">
									<div class="flex items-center justify-end gap-1.5">
										{#if po.status === 'DRAFT'}
											<form method="POST" action="?/confirmPO" use:enhance>
												<input type="hidden" name="id" value={po.id} />
												<button
													type="submit"
													title="Confirm PO"
													class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
												>
													<span class="material-symbols-outlined text-xs">check</span>
													<span>Confirm</span>
												</button>
											</form>
										{/if}
										{#if po.status === 'CONFIRMED' || po.status === 'PARTIAL_RECEIVED'}
											<a
												href="/pms/transactions/wrs/create?po_id={po.id}"
												class="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
											>
												<span class="material-symbols-outlined text-xs">receipt_long</span>
												<span>Terima LPB</span>
											</a>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
