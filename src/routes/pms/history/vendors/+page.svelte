<script lang="ts">
	import { formatRupiah, formatNumber } from '$lib/utils/pms';

	let { data } = $props();
	let searchQuery = $state('');

	let filteredVendors = $derived.by(() => {
		let list = data.vendorsHistory || [];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((v: any) =>
				(v.vendorName && v.vendorName.toLowerCase().includes(q)) ||
				(v.vendorCode && v.vendorCode.toLowerCase().includes(q)) ||
				(v.alamat && v.alamat.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>Riwayat Pengadaan by Vendor | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">person_pin</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Riwayat Pengadaan by Vendor</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Akumulasi total pesanan (PO) dan nilai transaksi per mitra supplier
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
				placeholder="Cari nama vendor, kode, kota, atau alamat..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Total: <strong class="text-on-surface">{filteredVendors.length}</strong> vendor
		</span>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-4">Kode Vendor</th>
						<th class="py-3.5 px-4">Nama Vendor / Supplier</th>
						<th class="py-3.5 px-4">Kontak & Email</th>
						<th class="py-3.5 px-4">Alamat Kantor</th>
						<th class="py-3.5 px-4 text-center">Total PO Diterbitkan</th>
						<th class="py-3.5 px-4 text-right">Akumulasi Nilai Transaksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredVendors.length === 0}
						<tr>
							<td colspan="6" class="py-12 text-center text-on-surface-variant">
								<p class="text-xs font-semibold">Tidak ada data vendor.</p>
							</td>
						</tr>
					{:else}
						{#each filteredVendors as v}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-4">
									<span class="font-mono text-amber-700 dark:text-amber-300 font-bold text-xs bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200">
										{v.vendorCode}
									</span>
								</td>
								<td class="py-3.5 px-4 font-bold text-on-surface text-sm">{v.vendorName}</td>
								<td class="py-3.5 px-4 font-mono text-[11px] text-on-surface">{v.phone}</td>
								<td class="py-3.5 px-4 text-on-surface-variant max-w-xs truncate">{v.alamat}</td>
								<td class="py-3.5 px-4 text-center font-mono font-bold text-on-surface">
									{v.totalPO} PO
								</td>
								<td class="py-3.5 px-4 text-right font-mono font-black text-on-surface text-sm">
									{formatRupiah(v.totalValue)}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
