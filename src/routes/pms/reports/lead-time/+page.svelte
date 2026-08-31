<script lang="ts">
	import { formatDateId } from '$lib/utils/pms';

	let { data } = $props();
	let searchQuery = $state('');

	let filteredLeadTimes = $derived.by(() => {
		let list = data.leadTimes || [];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((l: any) =>
				(l.poNumber && l.poNumber.toLowerCase().includes(q)) ||
				(l.prNumber && l.prNumber.toLowerCase().includes(q)) ||
				(l.grNumber && l.grNumber.toLowerCase().includes(q)) ||
				(l.vendorName && l.vendorName.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>Lead Time Tracking Pengadaan | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">timelapse</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Lead Time Tracking (PR → PO → WRS)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Analisis kecepatan siklus pengadaan barang dari request, penerbitan PO, hingga penerimaan fisik gudang
			</p>
		</div>
	</header>

	<!-- KPI Summary Widgets -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center gap-4">
			<div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
				<span class="material-symbols-outlined text-2xl">hourglass_top</span>
			</div>
			<div>
				<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Avg. PR ke PO</p>
				<p class="text-2xl font-black text-on-surface font-mono mt-0.5">{data.metrics.avgPrToPo} Hari</p>
				<p class="text-[10px] text-on-surface-variant">Durasi persetujuan & proses pesanan</p>
			</div>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center gap-4">
			<div class="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
				<span class="material-symbols-outlined text-2xl">local_shipping</span>
			</div>
			<div>
				<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Avg. PO ke WRS (LPB)</p>
				<p class="text-2xl font-black text-amber-600 font-mono mt-0.5">{data.metrics.avgPoToGr} Hari</p>
				<p class="text-[10px] text-on-surface-variant">Waktu kirim vendor ke gudang</p>
			</div>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center gap-4">
			<div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
				<span class="material-symbols-outlined text-2xl">published_with_changes</span>
			</div>
			<div>
				<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Cycle Time</p>
				<p class="text-2xl font-black text-emerald-600 font-mono mt-0.5">{data.metrics.avgTotalCycle} Hari</p>
				<p class="text-[10px] text-on-surface-variant">Rata-rata siklus pengadaan utuh</p>
			</div>
		</div>
	</div>

	<!-- Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between gap-4">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari no PO, PR, WRS, atau vendor..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Total: <strong class="text-on-surface">{filteredLeadTimes.length}</strong> transaksi pengadaan
		</span>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[950px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-4">No. PO & Tanggal</th>
						<th class="py-3.5 px-4">No. PR Ref</th>
						<th class="py-3.5 px-4">No. WRS (LPB)</th>
						<th class="py-3.5 px-4">Vendor & Project</th>
						<th class="py-3.5 px-4 text-center">Durasi PR → PO</th>
						<th class="py-3.5 px-4 text-center">Durasi PO → WRS</th>
						<th class="py-3.5 px-4 text-center">Total Lead Time</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredLeadTimes.length === 0}
						<tr>
							<td colspan="7" class="py-12 text-center text-on-surface-variant">
								<p class="text-xs font-semibold">Belum ada data riwayat siklus.</p>
							</td>
						</tr>
					{:else}
						{#each filteredLeadTimes as row}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-4">
									<a href="/pms/transactions/po" class="font-mono font-bold text-amber-700 dark:text-amber-300 hover:underline">
										{row.poNumber}
									</a>
									<p class="text-[10px] text-on-surface-variant font-mono">{formatDateId(row.poDate)}</p>
								</td>
								<td class="py-3.5 px-4">
									{#if row.prNumber}
										<span class="font-mono font-semibold text-on-surface">{row.prNumber}</span>
										<p class="text-[10px] text-on-surface-variant font-mono">{formatDateId(row.prDate)}</p>
									{:else}
										<span class="text-slate-400 font-mono">-</span>
									{/if}
								</td>
								<td class="py-3.5 px-4">
									{#if row.grNumber}
										<span class="font-mono font-bold text-emerald-700 dark:text-emerald-300">{row.grNumber}</span>
										<p class="text-[10px] text-on-surface-variant font-mono">{formatDateId(row.grDate)}</p>
									{:else}
										<span class="text-amber-600 font-semibold text-[10px]">Menunggu LPB</span>
									{/if}
								</td>
								<td class="py-3.5 px-4">
									<p class="font-bold text-on-surface">{row.vendorName}</p>
									<p class="text-[10px] text-on-surface-variant">{row.projectName || 'Non-Project'}</p>
								</td>
								<td class="py-3.5 px-4 text-center">
									<span class="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
										{row.daysPrToPo} Hari
									</span>
								</td>
								<td class="py-3.5 px-4 text-center">
									{#if row.grNumber}
										<span class="font-mono font-bold text-xs px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
											{row.daysPoToGr} Hari
										</span>
									{:else}
										<span class="text-slate-400 font-mono">-</span>
									{/if}
								</td>
								<td class="py-3.5 px-4 text-center">
									{#if row.grNumber}
										<span class="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
											{row.totalCycleDays} Hari
										</span>
									{:else}
										<span class="text-slate-400 font-mono">-</span>
									{/if}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
