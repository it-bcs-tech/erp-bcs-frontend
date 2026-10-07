<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let unitCosts = $derived(data.unitCosts || []);
	let topParts = $derived(data.topParts || []);
	let summary = $derived(data.summary);
	let selectedYear = $state(data.year);

	function changeYear(y: string) {
		selectedYear = y;
		const url = new URL(window.location.href);
		url.searchParams.set('year', y);
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function exportToCsv() {
		if (unitCosts.length === 0) return;
		const headers = ['Nomor Unit', 'Total SPK Servis', 'Jumlah Item Sparepart', 'Total Biaya Perawatan (Rp)'];
		const rows = unitCosts.map(u => [
			`"${u.unitId}"`,
			u.totalWo,
			u.partsCount,
			u.cost
		]);

		const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `Laporan_Biaya_Perawatan_Tahun_${selectedYear}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<svelte:head>
	<title>Analisis Biaya Perawatan Armada | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<nav class="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mb-1">
				<a href="/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<span class="text-on-surface font-bold">Laporan Biaya Servis</span>
			</nav>
			<h1 class="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2.5">
				<span class="material-symbols-outlined text-primary text-3xl">payments</span>
				Analisis Biaya Perawatan & Suku Cadang
			</h1>
		</div>

		<div class="flex items-center gap-2">
			<!-- Year Selector -->
			<select 
				value={selectedYear} 
				onchange={(e) => changeYear(e.currentTarget.value)}
				class="px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface"
			>
				{#each ['2026', '2025', '2024'] as y}
					<option value={y}>Tahun {y}</option>
				{/each}
			</select>

			<button 
				onclick={exportToCsv}
				disabled={unitCosts.length === 0}
				class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
			>
				<span class="material-symbols-outlined text-[16px]">download</span>
				<span>Export CSV</span>
			</button>
		</div>
	</header>

	<!-- KPI Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Biaya Perawatan {selectedYear}</span>
			<div class="text-2xl font-black text-primary mt-2 font-mono">
				Rp {summary.totalExpenditure.toLocaleString('id-ID')}
			</div>
			<div class="text-[11px] text-on-surface-variant mt-1 font-semibold">
				Total {summary.totalWoHandled} pekerjaan SPK terealisasi
			</div>
		</div>

		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Rata-Rata Biaya per Armada</span>
			<div class="text-2xl font-black text-on-surface mt-2 font-mono">
				Rp {summary.avgPerUnit.toLocaleString('id-ID')}
			</div>
			<div class="text-[11px] text-on-surface-variant mt-1 font-semibold">
				Dari {summary.unitsCount} armada yang menjalani servis
			</div>
		</div>

		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Armada Biaya Tertinggi</span>
			{#if unitCosts.length > 0}
				<div class="text-2xl font-black text-rose-600 mt-2 font-mono">
					{unitCosts[0].unitId}
				</div>
				<div class="text-[11px] text-on-surface-variant mt-1 font-semibold">
					Total Rp {unitCosts[0].cost.toLocaleString('id-ID')} ({unitCosts[0].totalWo} SPK)
				</div>
			{:else}
				<div class="text-lg font-bold text-on-surface mt-2">-</div>
			{/if}
		</div>
	</div>

	<!-- 2 Columns: Costs per Unit Table & Top Spareparts -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left: Unit Cost Table (2 cols) -->
		<div class="lg:col-span-2 bg-surface-container-lowest rounded-2xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden">
			<div class="p-5 border-b border-slate-200/70 dark:border-slate-800/70">
				<h2 class="text-sm font-black text-on-surface uppercase tracking-wider">Rincian Biaya per Unit Armada</h2>
				<p class="text-xs text-on-surface-variant font-medium mt-0.5">Akumulasi pengeluaran suku cadang dan perbaikan</p>
			</div>

			{#if unitCosts.length === 0}
				<div class="p-12 text-center text-on-surface-variant text-xs">
					Belum ada catatan biaya perawatan pada tahun {selectedYear}.
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="bg-surface-container-low text-on-surface-variant font-black uppercase text-[10px]">
							<tr>
								<th class="py-3 px-4">Nomor Unit</th>
								<th class="py-3 px-4 text-center">Total SPK</th>
								<th class="py-3 px-4 text-center">Part Terpakai</th>
								<th class="py-3 px-4 text-right">Total Biaya (Rp)</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
							{#each unitCosts as u}
								<tr class="hover:bg-surface-container-low/40">
									<td class="py-3 px-4 font-mono font-bold text-on-surface">{u.unitId}</td>
									<td class="py-3 px-4 text-center font-mono">{u.totalWo}</td>
									<td class="py-3 px-4 text-center font-mono">{u.partsCount}</td>
									<td class="py-3 px-4 text-right font-mono font-bold text-on-surface">
										Rp {u.cost.toLocaleString('id-ID')}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		<!-- Right: Top Expensive Spareparts Used -->
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/70 dark:border-slate-800/70 p-5 space-y-4">
			<div class="border-b border-slate-200/70 dark:border-slate-800/70 pb-3">
				<h2 class="text-sm font-black text-on-surface uppercase tracking-wider">Top Suku Cadang Terbesar</h2>
				<p class="text-[11px] text-on-surface-variant font-medium mt-0.5">Part dengan total penyerapan biaya tertinggi</p>
			</div>

			{#if topParts.length === 0}
				<div class="p-8 text-center text-on-surface-variant text-xs">
					Belum ada data pemakaian sparepart.
				</div>
			{:else}
				<div class="space-y-3">
					{#each topParts as p}
						<div class="p-3 rounded-xl bg-surface-container-low space-y-1">
							<div class="flex items-center justify-between text-xs font-bold text-on-surface">
								<span class="truncate max-w-[160px]">{p.name}</span>
								<span class="font-mono text-primary">Rp {p.totalSpend.toLocaleString('id-ID')}</span>
							</div>
							<div class="flex items-center justify-between text-[10px] text-on-surface-variant">
								<span class="font-mono">{p.code}</span>
								<span>{p.qty} {p.uom} terpakai</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
