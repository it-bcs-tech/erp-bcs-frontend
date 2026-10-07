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
		const s = status.toUpperCase();
		if (s.includes('DISPENSATION')) {
			return 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border-amber-400 dark:border-amber-700 font-bold';
		}
		if (s.includes('PROGRESS') || s.includes('PROSES')) {
			return 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800';
		}
		if (s.includes('REINSPECT') || s.includes('READY')) {
			return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800';
		}
		if (s.includes('CLOSE') || s.includes('COMPLET')) {
			return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
		}
		return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800';
	}
</script>

<svelte:head>
	<title>Work Orders (SPK Bengkel) | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<nav class="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mb-1">
				<a href="/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<span class="text-on-surface font-bold">Work Orders (SPK)</span>
			</nav>
			<h1 class="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2.5">
				<span class="material-symbols-outlined text-primary text-3xl">engineering</span>
				Surat Perintah Kerja (SPK Bengkel)
			</h1>
		</div>

		<a href="/maintenance/transactions/work-orders/create" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-sm hover:opacity-95 transition-all">
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Buat SPK Manual</span>
		</a>
	</header>

	<!-- Metric Quick Summary Pills -->
	<div class="grid grid-cols-2 sm:grid-cols-6 gap-3">
		<button onclick={() => handleStatusChange('All')} class="p-4 rounded-xl text-left bg-surface-container-lowest border {statusFilter === 'All' ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200/70 dark:border-slate-800/70'} transition-all">
			<div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total SPK</div>
			<div class="text-2xl font-black text-on-surface mt-1">{metrics.total}</div>
		</button>
		<button onclick={() => handleStatusChange('Open')} class="p-4 rounded-xl text-left bg-surface-container-lowest border {statusFilter === 'Open' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200/70 dark:border-slate-800/70'} transition-all">
			<div class="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Antre / Open</div>
			<div class="text-2xl font-black text-amber-600 mt-1">{metrics.pending}</div>
		</button>
		<button onclick={() => handleStatusChange('Proses')} class="p-4 rounded-xl text-left bg-surface-container-lowest border {statusFilter === 'Proses' ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-200/70 dark:border-slate-800/70'} transition-all">
			<div class="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Dikerjakan</div>
			<div class="text-2xl font-black text-sky-600 mt-1">{metrics.progress}</div>
		</button>
		<button onclick={() => handleStatusChange('DISPENSATION_ACTIVE')} class="p-4 rounded-xl text-left bg-surface-container-lowest border {statusFilter === 'DISPENSATION_ACTIVE' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200/70 dark:border-slate-800/70'} transition-all">
			<div class="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Dispensasi</div>
			<div class="text-2xl font-black text-amber-600 mt-1">{metrics.dispensation}</div>
		</button>
		<button onclick={() => handleStatusChange('READY_FOR_REINSPECTION')} class="p-4 rounded-xl text-left bg-surface-container-lowest border {statusFilter === 'READY_FOR_REINSPECTION' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200/70 dark:border-slate-800/70'} transition-all">
			<div class="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Siap Re-Inspek</div>
			<div class="text-2xl font-black text-purple-600 mt-1">{metrics.reinspect}</div>
		</button>
		<button onclick={() => handleStatusChange('Closed')} class="p-4 rounded-xl text-left bg-surface-container-lowest border {statusFilter === 'Closed' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/70 dark:border-slate-800/70'} transition-all">
			<div class="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Selesai</div>
			<div class="text-2xl font-black text-emerald-600 mt-1">{metrics.closed}</div>
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
				placeholder="Cari no. SPK, unit, keluhan, mekanik..." 
				class="bg-transparent text-sm text-on-surface outline-none w-full placeholder:text-on-surface-variant/50" 
			/>
		</div>

		<div class="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
			{#each [
				{ id: 'All', label: 'Semua' },
				{ id: 'ACTIVE', label: 'Aktif di Bengkel' },
				{ id: 'Open', label: 'Open' },
				{ id: 'Proses', label: 'Dikerjakan' },
				{ id: 'DISPENSATION_ACTIVE', label: 'Dispensasi Jalan' },
				{ id: 'READY_FOR_REINSPECTION', label: 'Re-Inspeksi' },
				{ id: 'Closed', label: 'Closed' }
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
				<span class="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-2">build</span>
				<p class="text-base font-bold">Tidak ada data Work Order</p>
				<p class="text-xs text-on-surface-variant/70 mt-1">Belum ada catatan SPK yang sesuai dengan pencarian atau filter saat ini.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-surface-container-low text-on-surface-variant text-[11px] font-black uppercase tracking-wider border-b border-slate-200/70 dark:border-slate-800/70">
						<tr>
							<th class="py-3 px-4">No. SPK / Tanggal</th>
							<th class="py-3 px-4">Unit Armada</th>
							<th class="py-3 px-4">Keluhan & Kategori</th>
							<th class="py-3 px-4">Mekanik Penanggung Jawab</th>
							<th class="py-3 px-4">Progres Item</th>
							<th class="py-3 px-4">Biaya Sparepart</th>
							<th class="py-3 px-4">Status</th>
							<th class="py-3 px-4 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each records as item}
							<tr class="hover:bg-surface-container-low/50 transition-colors">
								<td class="py-3.5 px-4">
									<div class="font-bold text-on-surface font-mono text-xs">{item.woNo}</div>
									<div class="text-[11px] text-on-surface-variant mt-0.5">{item.date}</div>
									{#if item.inspectionNo}
										<div class="text-[10px] text-primary font-mono mt-0.5 flex items-center gap-1">
											<span class="material-symbols-outlined text-[12px]">link</span> {item.inspectionNo}
										</div>
									{/if}
								</td>
								<td class="py-3.5 px-4">
									<span class="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded bg-surface-container text-xs text-on-surface">
										<span class="material-symbols-outlined text-[13px] text-primary">local_shipping</span>
										{item.unitId}
									</span>
								</td>
								<td class="py-3.5 px-4">
									<div class="font-medium text-xs text-on-surface max-w-xs truncate" title={item.complaint}>
										{item.complaint}
									</div>
									<div class="text-[10px] text-on-surface-variant font-medium mt-0.5">{item.category}</div>
								</td>
								<td class="py-3.5 px-4">
									<div class="flex items-center gap-1.5 text-xs text-on-surface font-medium">
										<span class="material-symbols-outlined text-[15px] text-on-surface-variant">person</span>
										{item.mechanic}
									</div>
								</td>
								<td class="py-3.5 px-4">
									{#if item.itemProgress.total > 0}
										<div class="space-y-1">
											<div class="flex items-center justify-between text-[10px] font-bold text-on-surface-variant">
												<span>{item.itemProgress.resolved}/{item.itemProgress.total} Solved</span>
												<span>{Math.round((item.itemProgress.resolved / item.itemProgress.total) * 100)}%</span>
											</div>
											<div class="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
												<div 
													class="h-full bg-emerald-500 rounded-full transition-all" 
													style="width: {(item.itemProgress.resolved / item.itemProgress.total) * 100}%"
												></div>
											</div>
										</div>
									{:else}
										<span class="text-xs text-on-surface-variant">-</span>
									{/if}
								</td>
								<td class="py-3.5 px-4">
									<span class="font-mono text-xs font-semibold text-on-surface">{item.cost}</span>
								</td>
								<td class="py-3.5 px-4">
									<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border {getStatusBadge(item.status)}">
										{item.status}
									</span>
								</td>
								<td class="py-3.5 px-4 text-right">
									<div class="inline-flex items-center gap-1">
										<a href="/maintenance/transactions/work-orders/{encodeURIComponent(item.woNo)}/print" target="_blank" class="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors" title="Cetak SPK Fisik">
											<span class="material-symbols-outlined text-[18px]">print</span>
										</a>
										<a href="/maintenance/transactions/work-orders/{encodeURIComponent(item.woNo)}" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-xs font-bold transition-all">
											<span>Kerjakan</span>
											<span class="material-symbols-outlined text-[14px]">arrow_forward</span>
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
