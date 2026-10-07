<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let records = $derived(data.records);
	let units = $derived(data.units || []);

	let unitFilter = $state(data.filters.unitFilter || '');
	let categoryFilter = $state(data.filters.categoryFilter || 'All');
	let startDate = $state(data.filters.startDate || '');
	let endDate = $state(data.filters.endDate || '');

	function applyFilter() {
		const url = new URL(window.location.href);
		if (unitFilter) url.searchParams.set('unit', unitFilter);
		else url.searchParams.delete('unit');

		if (categoryFilter !== 'All') url.searchParams.set('category', categoryFilter);
		else url.searchParams.delete('category');

		if (startDate) url.searchParams.set('startDate', startDate);
		else url.searchParams.delete('startDate');

		if (endDate) url.searchParams.set('endDate', endDate);
		else url.searchParams.delete('endDate');

		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function exportToCsv() {
		if (records.length === 0) return;
		const headers = ['No. SPK', 'Unit', 'Kategori', 'Keluhan / Masalah', 'Tanggal Masuk', 'Tanggal Selesai', 'Mekanik', 'Biaya Sparepart (Rp)', 'Status', 'Ref P2H'];
		const rows = records.map(r => [
			`"${r.woNo}"`,
			`"${r.unitId}"`,
			`"${r.category}"`,
			`"${r.complaint.replace(/"/g, '""')}"`,
			`"${r.date}"`,
			`"${r.closedDate}"`,
			`"${r.mechanic}"`,
			r.cost,
			`"${r.status}"`,
			`"${r.inspectionNo}"`
		]);

		const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `Laporan_Riwayat_Servis_${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<svelte:head>
	<title>Laporan Riwayat Servis Armada | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<nav class="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mb-1">
				<a href="/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<span class="text-on-surface font-bold">Laporan Riwayat Servis</span>
			</nav>
			<h1 class="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2.5">
				<span class="material-symbols-outlined text-primary text-3xl">history</span>
				Laporan Riwayat Servis Armada
			</h1>
		</div>

		<button 
			onclick={exportToCsv}
			disabled={records.length === 0}
			class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
		>
			<span class="material-symbols-outlined text-[18px]">download</span>
			<span>Export CSV / Excel</span>
		</button>
	</header>

	<!-- Filters Card -->
	<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
		<div>
			<label for="filter_unit" class="block font-bold text-on-surface-variant uppercase mb-1">Pilih Unit Armada</label>
			<select id="filter_unit" bind:value={unitFilter} onchange={applyFilter} class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface">
				<option value="">Semua Unit</option>
				{#each units as u}
					<option value={u}>{u}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="filter_category" class="block font-bold text-on-surface-variant uppercase mb-1">Kategori Servis</label>
			<select id="filter_category" bind:value={categoryFilter} onchange={applyFilter} class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface">
				<option value="All">Semua Kategori</option>
				<option value="Regular Repair">Regular Repair</option>
				<option value="Breakdown Repair">Breakdown Repair</option>
				<option value="Preventive Maintenance">Preventive Maintenance</option>
				<option value="Overhaul Engine">Overhaul</option>
				<option value="Tire & Wheel Service">Ban & Kaki-kaki</option>
			</select>
		</div>

		<div>
			<label for="filter_start_date" class="block font-bold text-on-surface-variant uppercase mb-1">Dari Tanggal</label>
			<input id="filter_start_date" type="date" bind:value={startDate} onchange={applyFilter} class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface" />
		</div>

		<div>
			<label for="filter_end_date" class="block font-bold text-on-surface-variant uppercase mb-1">Sampai Tanggal</label>
			<input id="filter_end_date" type="date" bind:value={endDate} onchange={applyFilter} class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface" />
		</div>
	</div>

	<!-- Results Table -->
	<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden">
		{#if records.length === 0}
			<div class="p-16 text-center text-on-surface-variant">
				<span class="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-2">manage_search</span>
				<p class="text-base font-bold">Tidak ada riwayat servis ditemukan</p>
				<p class="text-xs text-on-surface-variant/70 mt-1">Coba sesuaikan filter unit atau rentang tanggal.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="bg-surface-container-low text-on-surface-variant font-black uppercase text-[10px] border-b border-slate-200/70 dark:border-slate-800/70">
						<tr>
							<th class="py-3 px-4">No. SPK</th>
							<th class="py-3 px-4">Unit</th>
							<th class="py-3 px-4">Kategori & Masalah</th>
							<th class="py-3 px-4">Tgl Masuk</th>
							<th class="py-3 px-4">Tgl Selesai</th>
							<th class="py-3 px-4">Mekanik</th>
							<th class="py-3 px-4 text-right">Biaya Sparepart</th>
							<th class="py-3 px-4">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each records as r}
							<tr class="hover:bg-surface-container-low/40">
								<td class="py-3 px-4 font-mono font-bold text-on-surface">
									<a href="/maintenance/transactions/work-orders/{encodeURIComponent(r.woNo)}" class="hover:underline text-primary">
										{r.woNo}
									</a>
								</td>
								<td class="py-3 px-4 font-mono font-bold text-on-surface">{r.unitId}</td>
								<td class="py-3 px-4">
									<div class="font-semibold text-on-surface">{r.category}</div>
									<div class="text-[10px] text-on-surface-variant max-w-xs truncate">{r.complaint}</div>
								</td>
								<td class="py-3 px-4">{r.date}</td>
								<td class="py-3 px-4">{r.closedDate}</td>
								<td class="py-3 px-4">{r.mechanic}</td>
								<td class="py-3 px-4 text-right font-mono font-bold">
									Rp {r.cost.toLocaleString('id-ID')}
								</td>
								<td class="py-3 px-4">
									<span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border {r.status === 'Closed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-sky-50 text-sky-700 border-sky-200'}">
										{r.status}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
