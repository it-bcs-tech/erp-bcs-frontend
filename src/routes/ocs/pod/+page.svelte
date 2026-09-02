<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	let summary = $derived(data.summary);
	let trips = $derived(data.trips || []);

	let selectedDocForPreview: any = $state(null);

	const formatCurrency = (val: number) =>
		new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
</script>

<svelte:head>
	<title>Monitoring Surat Jalan Balik (SJB) | OCS ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-sky-600 dark:text-sky-400 text-2xl">visibility</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Monitoring Surat Jalan Balik (SJB)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pemantauan status serah terima lembar fisik Surat Jalan di Loket Kasir & verifikasi timbangan pabrik
			</p>
		</div>

		<div class="flex items-center gap-2 text-xs font-bold text-on-surface-variant bg-surface-container-low px-3.5 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
			<span class="material-symbols-outlined text-emerald-600 text-base">info</span>
			<span>Verifikasi fisik dilakukan oleh Kasir di menu Kasir &gt; Surat Jalan</span>
		</div>
	</div>

	<!-- Metric Cards (Bento Style) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Trip Selesai</p>
					<h3 class="text-2xl font-black text-on-surface mt-1">{summary.totalTrips}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">local_shipping</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2 font-medium">Trip armada dengan status COMPLETED</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Terverifikasi Kasir</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">{summary.verifiedByKasir}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">check_circle</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 mt-2 font-bold">Fisik SJB diterima & Siap Invoice</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Menunggu Loket Kasir</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{summary.pendingKasir}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">pending_actions</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 mt-2 font-bold">Sopir belum serahkan lembar fisik</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Tonase Terverifikasi</p>
					<h3 class="text-2xl font-black text-indigo-600 mt-1">{(summary.totalVerifiedWeight / 1000).toFixed(2)} Ton</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">scale</span>
				</div>
			</div>
			<p class="text-xs text-indigo-600 mt-2 font-bold">Basis perhitungan Invoicing</p>
		</div>
	</div>

	<!-- Main Filter & Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden">
		<!-- Table Filter Toolbar -->
		<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
			<div class="flex items-center gap-2 w-full sm:w-auto">
				<a
					href="?status=All"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('status') === 'All' || !$page.url.searchParams.get('status') ? 'bg-sky-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Semua ({summary.totalTrips})
				</a>
				<a
					href="?status=VERIFIED"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('status') === 'VERIFIED' ? 'bg-emerald-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Terverifikasi Kasir ({summary.verifiedByKasir})
				</a>
				<a
					href="?status=PENDING_KASIR"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('status') === 'PENDING_KASIR' ? 'bg-amber-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Menunggu Loket Kasir ({summary.pendingKasir})
				</a>
			</div>
		</div>

		<!-- Table View -->
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[850px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Surat Tugas & Tanggal</th>
						<th class="py-3.5 px-5">Customer & Rute</th>
						<th class="py-3.5 px-5">Unit & Driver</th>
						<th class="py-3.5 px-5">No. SJ Fisik (Kasir)</th>
						<th class="py-3.5 px-5">Tonase (OCS vs Kasir)</th>
						<th class="py-3.5 px-5">Status SJB</th>
						<th class="py-3.5 px-5 text-right">Lampiran Scan</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if trips.length === 0}
						<tr>
							<td colspan="7" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 block mb-2">description</span>
								<p class="font-bold text-sm">Tidak ada trip pada status filter ini.</p>
							</td>
						</tr>
					{:else}
						{#each trips as t}
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-4 px-5">
									<p class="text-xs font-mono font-bold text-on-surface">{t.no_surat_tugas}</p>
									<p class="text-[10px] text-on-surface-variant mt-0.5">{t.tgl_trip}</p>
									<span class="text-[10px] text-on-surface-variant font-mono">{t.sales_order_id}</span>
								</td>
								<td class="py-4 px-5">
									<p class="text-xs font-bold text-on-surface">{t.customer_name || 'Customer'}</p>
									<p class="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-1">
										<span>{t.origin || '-'}</span>
										<span class="material-symbols-outlined text-[12px]">arrow_forward</span>
										<span>{t.destination || '-'}</span>
									</p>
								</td>
								<td class="py-4 px-5">
									<p class="text-xs font-bold text-on-surface">{t.unit_number || 'Unit -'}</p>
									<p class="text-[11px] text-on-surface-variant mt-0.5">{t.driver_name || 'Driver -'}</p>
								</td>
								<td class="py-4 px-5">
									{#if t.no_surat_jalan}
										<p class="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{t.no_surat_jalan}</p>
										<p class="text-[10px] text-on-surface-variant mt-0.5">{t.tgl_surat_jalan}</p>
									{:else}
										<span class="text-[11px] text-amber-600 font-medium italic">Belum diserahkan</span>
									{/if}
								</td>
								<td class="py-4 px-5">
									<div class="text-xs">
										<p class="font-bold text-on-surface">{t.verified_weight ? `${t.verified_weight} Kg` : '-'}</p>
										<p class="text-[10px] text-on-surface-variant">OCS: {t.ocs_weight || 0} Kg</p>
									</div>
								</td>
								<td class="py-4 px-5">
									{#if t.status === 'VERIFIED'}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
											Terverifikasi Kasir
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200">
											<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
											Menunggu Loket Kasir
										</span>
									{/if}
								</td>
								<td class="py-4 px-5 text-right">
									{#if t.file_upload && t.file_upload !== '-'}
										<button
											onclick={() => selectedDocForPreview = t}
											class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 text-xs font-bold hover:bg-sky-100 transition-colors cursor-pointer"
											title="Lihat Foto Surat Jalan Balik"
										>
											<span class="material-symbols-outlined text-sm">image</span>
											<span>Scan SJB</span>
										</button>
									{:else}
										<span class="text-[10px] text-on-surface-variant/60 italic">-</span>
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

<!-- Modal: Preview Surat Jalan Balik -->
{#if selectedDocForPreview}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<div>
					<h3 class="text-base font-bold text-on-surface font-mono">{selectedDocForPreview.no_surat_jalan}</h3>
					<p class="text-xs text-on-surface-variant">{selectedDocForPreview.customer_name} ({selectedDocForPreview.unit_number})</p>
				</div>
				<button onclick={() => selectedDocForPreview = null} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 space-y-4">
				<img
					src={selectedDocForPreview.file_upload}
					alt="Bukti Surat Jalan Balik"
					class="w-full h-64 object-cover rounded-xl border border-slate-200 dark:border-slate-800"
				/>
				<div class="text-xs space-y-1">
					<p><strong class="text-on-surface">Surat Tugas:</strong> {selectedDocForPreview.no_surat_tugas}</p>
					<p><strong class="text-on-surface">Tanggal SJ:</strong> {selectedDocForPreview.tgl_surat_jalan}</p>
					<p><strong class="text-on-surface">Tonase Riil Kasir:</strong> {selectedDocForPreview.verified_weight} Kg</p>
					<p><strong class="text-on-surface">Status:</strong> <span class="font-bold text-emerald-600">VERIFIED oleh Kasir</span></p>
				</div>
			</div>
		</div>
	</div>
{/if}
