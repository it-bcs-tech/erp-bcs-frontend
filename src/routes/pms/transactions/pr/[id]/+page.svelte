<script lang="ts">
	import { formatDateId, formatNumber, getCategoryBadge, getPRStatusBadge } from '$lib/utils/pms';

	let { data } = $props();

	let catBadge = $derived(getCategoryBadge(data.pr.category));
	let stBadge = $derived(getPRStatusBadge(data.pr.status));

	let totalQty = $derived(
		(data.items || []).reduce((sum: number, itm: any) => sum + (parseFloat(itm.qtyRequested) || 0), 0)
	);
</script>

<svelte:head>
	<title>Detail PR {data.pr.prNumber} | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6 max-w-6xl mx-auto">
	<!-- Top Navigation & Action Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<a
				href="/pms/transactions/pr"
				class="p-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 hover:bg-surface-container-high text-on-surface-variant transition-colors shadow-xs"
				title="Kembali ke Daftar PR"
			>
				<span class="material-symbols-outlined text-lg">arrow_back</span>
			</a>
			<div>
				<div class="flex flex-wrap items-center gap-2.5">
					<h1 class="text-2xl font-black text-on-surface tracking-tight font-mono">{data.pr.prNumber}</h1>
					<span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border {stBadge.badgeClass}">
						<span class="material-symbols-outlined text-xs">{stBadge.icon}</span>
						<span>{stBadge.label}</span>
					</span>
					<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border {catBadge.badgeClass}">
						<span class="material-symbols-outlined text-xs">{catBadge.icon}</span>
						<span>{catBadge.label}</span>
					</span>
				</div>
				<p class="text-on-surface-variant font-medium text-xs mt-0.5">
					Diajukan pada {formatDateId(data.pr.date)} • Pemohon: <strong class="text-on-surface">{data.pr.requestedBy}</strong> ({data.pr.department || 'General'})
				</p>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={() => window.print()}
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-on-surface-variant hover:text-on-surface text-xs font-bold transition-colors shadow-xs cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">print</span>
				<span>Cetak</span>
			</button>

			{#if data.pr.status === 'PROCESSED'}
				<span
					class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-semibold cursor-not-allowed border border-slate-200 dark:border-slate-700"
					title="PR sudah diproses ke PO dan tidak dapat diedit secara langsung"
				>
					<span class="material-symbols-outlined text-base">lock</span>
					<span>Sudah Jadi PO</span>
				</span>
			{:else}
				<a
					href="/pms/transactions/pr/{data.pr.id}/edit"
					class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-bold transition-colors shadow-xs cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">edit</span>
					<span>Edit PR</span>
				</a>
				<a
					href="/pms/transactions/po/create?pr_ids={data.pr.id}"
					class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">shopping_cart</span>
					<span>Buat PO</span>
				</a>
			{/if}
		</div>
	</header>

	<!-- Linked PO Banner if processed -->
	{#if data.linkedPOs && data.linkedPOs.length > 0}
		<div class="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
			<div class="flex items-center gap-3">
				<div class="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
					<span class="material-symbols-outlined text-lg">shopping_bag</span>
				</div>
				<div>
					<p class="font-bold text-on-surface">Purchase Order Terkait:</p>
					<div class="flex flex-wrap items-center gap-2 mt-1">
						{#each data.linkedPOs as lpo}
							<a
								href="/pms/transactions/po/{lpo.id}"
								class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-mono font-bold hover:underline"
							>
								<span>{lpo.poNumber}</span>
								{#if lpo.vendorName}
									<span class="text-[10px] font-sans font-medium text-blue-600 dark:text-blue-400">({lpo.vendorName})</span>
								{/if}
							</a>
						{/each}
					</div>
				</div>
			</div>
			<span class="text-[11px] text-blue-700 dark:text-blue-300 font-medium self-start sm:self-auto">
				Item PR ini telah masuk ke dalam PO di atas.
			</span>
		</div>
	{/if}

	<!-- Metadata Grid Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Card 1: Informasi Pengajuan -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-3">
			<h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
				<span class="material-symbols-outlined text-base">person</span>
				<span>Informasi Pemohon</span>
			</h3>
			<dl class="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Pemohon:</dt>
					<dd class="font-bold text-on-surface">{data.pr.requestedBy}</dd>
				</div>
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Departemen:</dt>
					<dd class="font-semibold text-on-surface">{data.pr.department || 'General'}</dd>
				</div>
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Dibuat Oleh:</dt>
					<dd class="text-right">
						<span class="font-semibold text-on-surface">{data.pr.createdByName || data.pr.createdBy}</span>
						{#if data.pr.createdByPayroll}
							<span class="block text-[10px] text-on-surface-variant font-mono">{data.pr.createdByPayroll}</span>
						{/if}
					</dd>
				</div>
			</dl>
		</div>

		<!-- Card 2: Alokasi & Tanggal -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-3">
			<h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
				<span class="material-symbols-outlined text-base">apartment</span>
				<span>Alokasi & Jadwal</span>
			</h3>
			<dl class="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Project:</dt>
					<dd class="font-bold text-on-surface">{data.pr.projectName || '-'}</dd>
				</div>
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Site Tujuan:</dt>
					<dd class="font-semibold text-on-surface">{data.pr.siteName ? `[${data.pr.siteCode}] ${data.pr.siteName}` : 'Semua Site'}</dd>
				</div>
				<div class="py-2 flex justify-between">
					<dt class="text-on-surface-variant font-medium">Tgl Dibutuhkan:</dt>
					<dd class="font-mono font-bold text-on-surface">{data.pr.requiredDate ? formatDateId(data.pr.requiredDate) : 'Segera'}</dd>
				</div>
			</dl>
		</div>

		<!-- Card 3: Catatan & Remarks -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-3">
			<h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
				<span class="material-symbols-outlined text-base">notes</span>
				<span>Catatan Pengadaan</span>
			</h3>
			<p class="text-xs text-on-surface leading-relaxed whitespace-pre-line bg-surface p-3 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[72px]">
				{data.pr.notes || 'Tidak ada catatan khusus untuk PR ini.'}
			</p>
		</div>
	</div>

	<!-- Line Items Table Card -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs space-y-0">
		<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
			<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
				<span class="material-symbols-outlined text-amber-600">format_list_bulleted</span>
				<span>Daftar Material Diminta ({data.items.length} item)</span>
			</h3>
			<span class="text-xs font-mono font-bold text-on-surface-variant bg-surface px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
				Total: {formatNumber(totalQty)} Satuan
			</span>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[750px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3 px-4 w-12 text-center">No</th>
						<th class="py-3 px-4">Kode Material</th>
						<th class="py-3 px-4">Nama Material & Spesifikasi</th>
						<th class="py-3 px-4">Brand / Merek</th>
						<th class="py-3 px-4 text-center w-28">Stok Saat Ini</th>
						<th class="py-3 px-4 text-center w-32">Qty Diminta</th>
						<th class="py-3 px-4">Catatan Item</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if data.items.length === 0}
						<tr>
							<td colspan="7" class="py-8 text-center text-on-surface-variant">
								Belum ada rincian material untuk Purchase Request ini.
							</td>
						</tr>
					{:else}
						{#each data.items as item, idx}
							<tr class="hover:bg-surface-container-high/30 transition-colors">
								<td class="py-3 px-4 text-center font-mono text-on-surface-variant">{idx + 1}</td>
								<td class="py-3 px-4 font-mono font-bold text-amber-700 dark:text-amber-300 text-xs">
									{item.materialCode}
								</td>
								<td class="py-3 px-4">
									<p class="font-bold text-on-surface">{item.name}</p>
									<p class="text-[11px] text-on-surface-variant mt-0.5">{item.spec && item.spec !== '-' ? item.spec : ''}</p>
								</td>
								<td class="py-3 px-4 text-on-surface-variant">{item.brand || '-'}</td>
								<td class="py-3 px-4 text-center font-mono text-on-surface-variant">
									{formatNumber(item.stock)} {item.uom}
								</td>
								<td class="py-3 px-4 text-center">
									<span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-500/15 font-mono font-black text-amber-800 dark:text-amber-300 text-xs">
										{formatNumber(item.qtyRequested)} {item.uom}
									</span>
								</td>
								<td class="py-3 px-4 text-on-surface-variant text-[11px] italic">
									{item.remarks || '-'}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
