<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatRupiah } from '$lib/utils/pms';

	let { data } = $props();
	let selectedYear = $state(data.year.toString());
	let selectedGroup = $state(data.groupBy);

	const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

	function handleFilterChange() {
		goto(`/pms/reports/yearly-matrix?year=${selectedYear}&groupBy=${selectedGroup}`);
	}

	function exportToCSV() {
		const headers = ['Kode', 'Nama Entitas', ...monthNames, 'Total'];
		const rowsData = (data.rows || []).map((r: any) => [
			`"${r.code}"`,
			`"${r.name}"`,
			...r.months.map((m: number) => m || 0),
			r.total || 0
		]);

		const totalRow = [
			'"-"',
			'"TOTAL SUMMARY"',
			...data.monthTotals.map((m: number) => m || 0),
			data.grandTotal || 0
		];

		const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rowsData.map(e => e.join(',')), totalRow.join(',')].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `PMS_Yearly_Matrix_${selectedGroup}_${selectedYear}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<svelte:head>
	<title>Yearly Matrix Reports (Jan-Dec) | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">calendar_month</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Yearly Matrix Report (Jan–Dec)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Matriks periodik realisasi biaya pengadaan bulanan beserta akumulasi total tahunan
			</p>
		</div>

		<!-- Export Button -->
		<button
			type="button"
			onclick={exportToCSV}
			class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">download</span>
			<span>Ekspor Laporan (CSV)</span>
		</button>
	</header>

	<!-- Filter Dimensions & Year Picker -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
		<div class="flex flex-wrap items-center gap-3">
			<label class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
				Kelompokkan Berdasarkan:
			</label>
			<select
				bind:value={selectedGroup}
				onchange={handleFilterChange}
				class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
			>
				<option value="PROJECT">by Project</option>
				<option value="SITE">by Site / Gudang</option>
				<option value="VENDOR">by Vendor / Supplier</option>
				<option value="MATERIAL">by Material Suku Cadang</option>
				<option value="WRS">by WRS / Penerimaan Gudang</option>
			</select>
		</div>

		<div class="flex items-center gap-3">
			<label class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
				Tahun Buku:
			</label>
			<select
				bind:value={selectedYear}
				onchange={handleFilterChange}
				class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2 text-xs font-black font-mono focus:ring-2 focus:ring-amber-500 outline-none"
			>
				<option value="2026">2026</option>
				<option value="2025">2025</option>
				<option value="2024">2024</option>
			</select>
		</div>
	</div>

	<!-- Yearly Matrix Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs min-w-[1200px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3 px-3 w-44 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">Nama / Kode</th>
						{#each monthNames as m}
							<th class="py-3 px-2 text-right">{m}</th>
						{/each}
						<th class="py-3 px-3 text-right bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">Total {selectedYear}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if data.rows.length === 0}
						<tr>
							<td colspan="14" class="py-12 text-center text-on-surface-variant">
								<p class="text-xs font-semibold">Tidak ada transaksi tercatat pada tahun {selectedYear}.</p>
							</td>
						</tr>
					{:else}
						{#each data.rows as row}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3 px-3 sticky left-0 bg-surface-container-low z-10 border-r border-slate-200/40 dark:border-slate-800/40">
									<p class="font-bold text-on-surface text-xs">{row.name}</p>
									<span class="text-[10px] font-mono text-amber-700 dark:text-amber-300">{row.code}</span>
								</td>
								{#each row.months as val}
									<td class="py-3 px-2 text-right font-mono {val > 0 ? 'text-on-surface font-semibold' : 'text-slate-300 dark:text-slate-700'}">
										{val > 0 ? formatRupiah(val).replace('Rp', '').trim() : '-'}
									</td>
								{/each}
								<td class="py-3 px-3 text-right font-mono font-black text-amber-700 dark:text-amber-300 bg-amber-50/40 dark:bg-amber-950/20">
									{formatRupiah(row.total)}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
				<!-- Summary Row Footer -->
				<tfoot class="bg-slate-100/90 dark:bg-slate-800/80 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700">
					<tr>
						<td class="py-3.5 px-3 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 uppercase tracking-wider text-on-surface">
							TOTAL KESELURUHAN
						</td>
						{#each data.monthTotals as mTotal}
							<td class="py-3.5 px-2 text-right font-mono text-on-surface">
								{mTotal > 0 ? formatRupiah(mTotal).replace('Rp', '').trim() : '-'}
							</td>
						{/each}
						<td class="py-3.5 px-3 text-right font-mono font-black text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/40 text-sm">
							{formatRupiah(data.grandTotal)}
						</td>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>
</div>
