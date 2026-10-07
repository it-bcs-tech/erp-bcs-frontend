<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	let records = $derived(data.records);
	let meta = $derived(data.meta);
	let metrics = $derived(data.metrics);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let statusFilter = $state($page.url.searchParams.get('status') || 'All');

	let searchTimer: ReturnType<typeof setTimeout>;

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(updateUrl, 350);
	}

	function handleStatusChange(status: string) {
		statusFilter = status;
		updateUrl();
	}

	function updateUrl(targetPage = 1) {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');

		if (statusFilter && statusFilter !== 'All') url.searchParams.set('status', statusFilter);
		else url.searchParams.delete('status');

		url.searchParams.set('page', targetPage.toString());
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function getStatusBadge(status: string) {
		const s = (status || '').toUpperCase();
		if (s === 'PASSED' || s === 'LAYAK') {
			return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
		}
		if (s.includes('CATATAN') || s.includes('NOTE')) {
			return 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-800';
		}
		if (s.includes('DEFECT') || s.includes('FAIL') || s.includes('TIDAK')) {
			return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 dark:border-rose-800';
		}
		if (s.includes('RE_INSPECT') || s.includes('CLOSED')) {
			return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800';
		}
		return 'bg-slate-100 text-slate-700 border-slate-300';
	}

	function getStatusLabel(status: string) {
		const s = (status || '').toUpperCase();
		if (s === 'PASSED' || s === 'LAYAK') return 'Layak';
		if (s.includes('CATATAN') || s.includes('NOTE')) return 'Catatan';
		if (s.includes('DEFECT') || s.includes('FAIL') || s.includes('TIDAK')) return 'Defect (SPK)';
		if (s.includes('CLOSED') || s.includes('RE_INSPECT')) return 'Selesai';
		return status;
	}
</script>

<svelte:head>
	<title>Inspeksi Kelayakan Armada (P2H) | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<nav class="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mb-1">
				<a href="/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<span class="text-on-surface font-bold">Inspeksi Armada</span>
			</nav>
			<h1 class="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2.5">
				<span class="material-symbols-outlined text-primary text-3xl">fact_check</span>
				Inspeksi Kelayakan Armada (P2H)
			</h1>
		</div>

		<a href="/maintenance/transactions/inspections/create" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-sm hover:opacity-95 transition-all">
			<span class="material-symbols-outlined text-[18px]">add_task</span>
			<span>Inspeksi Baru</span>
		</a>
	</header>

	<!-- Metric Quick Summary Pills -->
	<div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
		<button onclick={() => handleStatusChange('All')} class="p-4 rounded-xl text-left bg-surface-container-lowest border {statusFilter === 'All' ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200/70 dark:border-slate-800/70'} transition-all">
			<div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Inspeksi</div>
			<div class="text-2xl font-black text-on-surface mt-1">{metrics.total}</div>
		</button>
		<button onclick={() => handleStatusChange('PASSED')} class="p-4 rounded-xl text-left bg-surface-container-lowest border {statusFilter === 'PASSED' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/70 dark:border-slate-800/70'} transition-all">
			<div class="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Lolos Layak</div>
			<div class="text-2xl font-black text-emerald-600 mt-1">{metrics.passed}</div>
		</button>
		<button onclick={() => handleStatusChange('LAYAK_DENGAN_CATATAN')} class="p-4 rounded-xl text-left bg-surface-container-lowest border {statusFilter === 'LAYAK_DENGAN_CATATAN' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200/70 dark:border-slate-800/70'} transition-all">
			<div class="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Dgn Catatan</div>
			<div class="text-2xl font-black text-amber-600 mt-1">{metrics.notes}</div>
		</button>
		<button onclick={() => handleStatusChange('FAILED_DEFECT')} class="p-4 rounded-xl text-left bg-surface-container-lowest border {statusFilter === 'FAILED_DEFECT' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200/70 dark:border-slate-800/70'} transition-all">
			<div class="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Ada Defect (SPK)</div>
			<div class="text-2xl font-black text-rose-600 mt-1">{metrics.defected}</div>
		</button>
		<button onclick={() => handleStatusChange('CLOSED')} class="p-4 rounded-xl text-left bg-surface-container-lowest border {statusFilter === 'CLOSED' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200/70 dark:border-slate-800/70'} transition-all">
			<div class="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Re-Inspek / Selesai</div>
			<div class="text-2xl font-black text-purple-600 mt-1">{metrics.closed}</div>
		</button>
	</div>

	<!-- Filters Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col sm:flex-row items-center justify-between gap-3">
		<div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary w-full sm:w-96">
			<span class="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
			<input 
				type="text" 
				bind:value={searchQuery} 
				oninput={handleSearchInput} 
				placeholder="Cari no. inspeksi, unit, inspector..." 
				class="bg-transparent text-sm text-on-surface outline-none w-full placeholder:text-on-surface-variant/50" 
			/>
		</div>

		<div class="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
			{#each [
				{ id: 'All', label: 'Semua' },
				{ id: 'PASSED', label: 'Layak' },
				{ id: 'LAYAK_DENGAN_CATATAN', label: 'Dgn Catatan' },
				{ id: 'FAILED_DEFECT', label: 'Defect (SPK)' },
				{ id: 'CLOSED', label: 'Selesai' }
			] as tab}
				<button 
					onclick={() => handleStatusChange(tab.id)}
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap {statusFilter === tab.id ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}"
				>
					{tab.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Table -->
	<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden">
		{#if records.length === 0}
			<div class="p-16 text-center text-on-surface-variant">
				<span class="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-2">find_in_page</span>
				<p class="text-base font-bold">Tidak ada data inspeksi</p>
				<p class="text-xs text-on-surface-variant/70 mt-1">Belum ada catatan inspeksi yang sesuai dengan pencarian atau filter saat ini.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-surface-container-low text-on-surface-variant text-[11px] font-black uppercase tracking-wider border-b border-slate-200/70 dark:border-slate-800/70">
						<tr>
							<th class="py-3 px-4">No. Inspeksi / Tanggal</th>
							<th class="py-3 px-4">Unit Armada</th>
							<th class="py-3 px-4">Driver & Kesehatan</th>
							<th class="py-3 px-4">Hasil P2H</th>
							<th class="py-3 px-4">Tindak Lanjut SPK</th>
							<th class="py-3 px-4">Status</th>
							<th class="py-3 px-4 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each records as item}
							<tr class="hover:bg-surface-container-low/50 transition-colors">
								<td class="py-3.5 px-4">
									<div class="font-bold text-on-surface font-mono text-xs">{item.inspectionNo}</div>
									<div class="text-[11px] text-on-surface-variant mt-0.5">{item.date} • {item.type}</div>
								</td>
								<td class="py-3.5 px-4">
									<div class="flex items-center gap-1.5">
										<span class="px-1.5 py-0.5 rounded text-[10px] font-black uppercase {item.unitType === 'TR' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}">
											{item.unitType}
										</span>
										<span class="font-mono font-bold text-xs text-on-surface">{item.unitId}</span>
									</div>
									<div class="text-[10px] text-on-surface-variant mt-0.5">KM: {item.odometer}</div>
								</td>
								<td class="py-3.5 px-4">
									<div class="font-medium text-xs text-on-surface">{item.driverName}</div>
									<div class="mt-1">
										{#if item.driverFit}
											<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
												<span class="material-symbols-outlined text-[11px]">health_and_safety</span> Sehat
											</span>
										{:else}
											<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
												<span class="material-symbols-outlined text-[11px]">warning</span> Perlu Cek
											</span>
										{/if}
									</div>
								</td>
								<td class="py-3.5 px-4">
									{#if item.defectCount > 0}
										<span class="inline-flex items-center gap-1 font-bold text-xs text-rose-600">
											<span class="material-symbols-outlined text-[16px]">cancel</span>
											{item.defectCount} Defect Ditemukan
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 font-bold text-xs text-emerald-600">
											<span class="material-symbols-outlined text-[16px]">check_circle</span>
											Semua Item OK
										</span>
									{/if}
									<div class="text-[10px] text-on-surface-variant mt-0.5">Inspektor: {item.inspector}</div>
								</td>
								<td class="py-3.5 px-4">
									{#if item.woNo}
										<a href="/maintenance/transactions/work-orders/{encodeURIComponent(item.woNo)}" class="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary hover:underline">
											<span class="material-symbols-outlined text-[13px]">engineering</span>
											{item.woNo}
										</a>
										{#if item.woStatus}
											<div class="text-[10px] font-bold text-on-surface-variant mt-0.5">Status: {item.woStatus}</div>
										{/if}
									{:else}
										<span class="text-xs text-on-surface-variant">-</span>
									{/if}
								</td>
								<td class="py-3.5 px-4">
									<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border {getStatusBadge(item.status)}">
										{item.status}
									</span>
								</td>
								<td class="py-3.5 px-4 text-right">
									<div class="inline-flex items-center gap-1">
										{#if item.woStatus === 'READY_FOR_REINSPECTION'}
											<a href="/maintenance/transactions/inspections/{encodeURIComponent(item.inspectionNo)}/re-inspect" class="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors" title="Uji Re-Inspeksi">
												Re-Inspeksi
											</a>
										{/if}
										<a href="/maintenance/transactions/inspections/{encodeURIComponent(item.inspectionNo)}/print" target="_blank" class="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors" title="Cetak Format Fisik">
											<span class="material-symbols-outlined text-[18px]">print</span>
										</a>
										<a href="/maintenance/transactions/inspections/{encodeURIComponent(item.inspectionNo)}" class="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors" title="Lihat Detail">
											<span class="material-symbols-outlined text-[18px]">visibility</span>
										</a>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if meta.totalPages > 1}
				<div class="p-4 border-t border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between text-xs text-on-surface-variant">
					<div>
						Menampilkan <b>{records.length}</b> dari <b>{meta.total}</b> data
					</div>
					<div class="flex items-center gap-1.5">
						<button 
							onclick={() => updateUrl(meta.currentPage - 1)} 
							disabled={meta.currentPage <= 1}
							class="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed font-medium"
						>
							Sebelumnya
						</button>
						<span class="px-2 font-bold">{meta.currentPage} / {meta.totalPages}</span>
						<button 
							onclick={() => updateUrl(meta.currentPage + 1)} 
							disabled={meta.currentPage >= meta.totalPages}
							class="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed font-medium"
						>
							Selanjutnya
						</button>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
