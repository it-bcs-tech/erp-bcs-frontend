<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const insp = $derived(data.inspection);

	function getStatusBadge(status: string) {
		const s = status.toUpperCase();
		if (s === 'PASSED') {
			return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
		}
		if (s.includes('DEFECT') || s.includes('FAIL')) {
			return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800';
		}
		if (s.includes('RE_INSPECT') || s.includes('CLOSED')) {
			return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800';
		}
		return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800';
	}
</script>

<svelte:head>
	<title>{insp.inspectionNo} - Detail Inspeksi | ERP BCS</title>
</svelte:head>

<div class="max-w-5xl mx-auto space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<nav class="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mb-1">
				<a href="/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<a href="/maintenance/transactions/inspections" class="hover:text-primary transition-colors">Inspeksi</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<span class="text-on-surface font-bold">{insp.inspectionNo}</span>
			</nav>
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-black text-on-surface tracking-tight font-mono">
					{insp.inspectionNo}
				</h1>
				<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black border {getStatusBadge(insp.status)}">
					{insp.status}
				</span>
			</div>
		</div>

		<div class="flex items-center gap-2">
			{#if insp.woStatus === 'READY_FOR_REINSPECTION'}
				<a href="/maintenance/transactions/inspections/{encodeURIComponent(insp.inspectionNo)}/re-inspect" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 shadow-sm transition-all">
					<span class="material-symbols-outlined text-[18px]">verified</span>
					<span>Lakukan Re-Inspeksi</span>
				</a>
			{/if}
			<a href="/maintenance/transactions/inspections/{encodeURIComponent(insp.inspectionNo)}/print" target="_blank" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-xs border border-slate-200/80 dark:border-slate-800/80 transition-all">
				<span class="material-symbols-outlined text-[16px]">print</span>
				<span>Cetak Lembar Fisik</span>
			</a>
		</div>
	</header>

	<!-- Closed-Loop Link to Work Order Banner -->
	{#if insp.woNo}
		<div class="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
			<div class="flex items-center gap-3">
				<div class="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
					<span class="material-symbols-outlined text-[20px]">engineering</span>
				</div>
				<div>
					<div class="text-xs font-bold text-sky-800 dark:text-sky-200">
						Terhubung ke Work Order (SPK): <span class="font-mono">{insp.woNo}</span>
					</div>
					<div class="text-[11px] text-sky-700 dark:text-sky-300">
						Status SPK: <b>{insp.woStatus || 'Open'}</b> • Mekanik: <b>{insp.mechanicName}</b>
					</div>
				</div>
			</div>
			<a href="/maintenance/transactions/work-orders/{encodeURIComponent(insp.woNo)}" class="px-3.5 py-1.5 rounded-lg bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition-all text-center">
				Buka Lembar SPK Bengkel →
			</a>
		</div>
	{/if}

	<!-- Overview Info Card -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Unit & Driver -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-3">
			<div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Unit & Operasional</div>
			<div class="space-y-1.5 text-xs">
				<div class="flex justify-between">
					<span class="text-on-surface-variant">Nomor Unit:</span>
					<span class="font-mono font-bold text-on-surface">{insp.unitId} ({insp.unitType})</span>
				</div>
				<div class="flex justify-between">
					<span class="text-on-surface-variant">Odometer:</span>
					<span class="font-mono font-bold text-on-surface">{insp.odometer} KM</span>
				</div>
				<div class="flex justify-between">
					<span class="text-on-surface-variant">Pengemudi:</span>
					<span class="font-bold text-on-surface">{insp.driverName}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-on-surface-variant">Kenek:</span>
					<span class="font-medium text-on-surface">{insp.kenekName}</span>
				</div>
			</div>
		</div>

		<!-- Waktu & Tim -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-3">
			<div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Waktu & Inspektor</div>
			<div class="space-y-1.5 text-xs">
				<div class="flex justify-between">
					<span class="text-on-surface-variant">Tanggal:</span>
					<span class="font-semibold text-on-surface">{insp.date}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-on-surface-variant">Waktu:</span>
					<span class="font-semibold text-on-surface">{insp.type}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-on-surface-variant">Inspektor:</span>
					<span class="font-bold text-on-surface">{insp.inspectorName}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-on-surface-variant">Defect Ditemukan:</span>
					<span class="font-bold {insp.defectCount > 0 ? 'text-rose-600' : 'text-emerald-600'}">{insp.defectCount} Item</span>
				</div>
			</div>
		</div>

		<!-- Kesehatan Driver -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-3">
			<div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Kesehatan Driver (Tensi/Alkohol)</div>
			<div class="space-y-1.5 text-xs">
				<div class="flex justify-between">
					<span class="text-on-surface-variant">Tekanan Darah:</span>
					<span class="font-mono font-bold text-on-surface">
						{insp.driverHealth?.systolic || '-'}/{insp.driverHealth?.diastolic || '-'} mmHg
					</span>
				</div>
				<div class="flex justify-between">
					<span class="text-on-surface-variant">Pulse / Nadi:</span>
					<span class="font-mono font-bold text-on-surface">{insp.driverHealth?.pulse || '-'} bpm</span>
				</div>
				<div class="flex justify-between">
					<span class="text-on-surface-variant">Tes Alkohol (BAC):</span>
					<span class="font-mono font-bold text-on-surface">{insp.driverHealth?.alcohol_test ?? '0.000'}%</span>
				</div>
				<div class="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
					<span class="text-on-surface-variant">Kesimpulan:</span>
					<span class="px-2 py-0.5 rounded text-[10px] font-bold {insp.driverHealth?.is_fit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
						{insp.driverHealth?.is_fit ? '✓ Sehat' : '✗ Tidak Sehat'}
					</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Checklist Results Table -->
	<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
		<div class="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800/70 pb-3">
			<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
				<span class="material-symbols-outlined text-primary text-[20px]">fact_check</span>
				Hasil Pemeriksaan Lembar Fisik ({insp.unitType === 'DT' ? 'Dumptruck' : 'Trailer'})
			</h2>
			<span class="text-xs text-on-surface-variant font-medium">Total: {insp.checklistData.length} Item Diperiksa</span>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead class="bg-surface-container-low text-on-surface-variant text-[11px] font-black uppercase tracking-wider border-b border-slate-200/70 dark:border-slate-800/70">
					<tr>
						<th class="py-2.5 px-3">Kode</th>
						<th class="py-2.5 px-3">Kategori</th>
						<th class="py-2.5 px-3">Item Pemeriksaan</th>
						<th class="py-2.5 px-3">Kondisi / Status</th>
						<th class="py-2.5 px-3">Catatan / Temuan Kerusakan</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each insp.checklistData as item}
						<tr class="hover:bg-surface-container-low/40 transition-colors {item.status === 'NOT_OK' ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''}">
							<td class="py-2.5 px-3 font-mono text-xs text-on-surface-variant">{item.code || '-'}</td>
							<td class="py-2.5 px-3 text-xs font-semibold text-on-surface-variant">{item.category}</td>
							<td class="py-2.5 px-3 font-medium text-on-surface">{item.name}</td>
							<td class="py-2.5 px-3">
								{#if item.status === 'OK'}
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
										<span class="material-symbols-outlined text-[12px]">check</span> OK
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
										<span class="material-symbols-outlined text-[12px]">close</span> TIDAK OK
									</span>
								{/if}
							</td>
							<td class="py-2.5 px-3 text-xs font-medium text-rose-600 dark:text-rose-400">
								{item.remark || '-'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
