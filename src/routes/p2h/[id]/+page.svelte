<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let insp = $derived(data.inspection);

	let activeFilter = $state<'ALL' | 'NOT_OK' | 'OK'>('ALL');

	let filteredChecklist = $derived.by(() => {
		const list = insp.checklistData || [];
		if (activeFilter === 'NOT_OK') {
			return list.filter((i: any) => i.status === 'NOT_OK');
		}
		if (activeFilter === 'OK') {
			return list.filter((i: any) => i.status === 'OK');
		}
		return list;
	});

	let notOkCount = $derived(
		(insp.checklistData || []).filter((i: any) => i.status === 'NOT_OK').length
	);
	let okCount = $derived(
		(insp.checklistData || []).filter((i: any) => i.status === 'OK').length
	);

	function getStatusBadge(status: string) {
		const s = status.toUpperCase();
		if (s === 'LAYAK' || s === 'PASSED') {
			return { bg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800', label: 'LAYAK OPERASI', icon: 'check_circle' };
		}
		if (s === 'TIDAK_LAYAK' || s === 'FAILED_DEFECT') {
			return { bg: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800', label: 'TIDAK LAYAK (DEFECT)', icon: 'cancel' };
		}
		if (s === 'CLOSED') {
			return { bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700', label: 'SELESAI (CLOSED)', icon: 'task_alt' };
		}
		return { bg: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800', label: s, icon: 'info' };
	}

	let badge = $derived(getStatusBadge(insp.status));
</script>

<div class="p-4 space-y-4">
	
	<!-- Top Bar Navigation -->
	<div class="flex items-center justify-between">
		<a href="/p2h" class="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-on-surface">
			<span class="material-symbols-outlined text-[18px]">arrow_back</span>
			<span>Daftar P2H</span>
		</a>
		<span class="font-mono text-xs font-bold text-on-surface-variant">{insp.inspectionNo}</span>
	</div>

	<!-- Status Card -->
	<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="font-mono text-2xl font-black text-on-surface">{insp.unitId}</span>
				<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-surface-container text-on-surface-variant">{insp.unitType}</span>
			</div>
			<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border {badge.bg}">
				<span class="material-symbols-outlined text-[16px]">{badge.icon}</span>
				<span>{badge.label}</span>
			</span>
		</div>

		<!-- Meta details -->
		<div class="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
			<div>
				<span class="text-[10px] text-on-surface-variant uppercase font-medium">Pengemudi:</span>
				<p class="font-bold text-on-surface mt-0.5">{insp.driverName}</p>
			</div>
			<div>
				<span class="text-[10px] text-on-surface-variant uppercase font-medium">Kilometer:</span>
				<p class="font-mono font-bold text-on-surface mt-0.5">{insp.odometer} KM</p>
			</div>
			<div>
				<span class="text-[10px] text-on-surface-variant uppercase font-medium">Inspektor:</span>
				<p class="font-bold text-on-surface mt-0.5">{insp.inspectorName}</p>
			</div>
			<div>
				<span class="text-[10px] text-on-surface-variant uppercase font-medium">Waktu Pemeriksaan:</span>
				<p class="text-on-surface font-medium mt-0.5">{insp.date}</p>
			</div>
		</div>
	</div>

	<!-- Action Banner if Re-inspection or WO is needed -->
	{#if insp.woStatus === 'READY_FOR_REINSPECTION'}
		<div class="p-4 rounded-2xl bg-purple-500/10 border-2 border-purple-500/40 space-y-2">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-purple-600 text-2xl">verified</span>
					<div>
						<h3 class="text-xs font-black text-on-surface uppercase">Siap Re-Inspeksi QC</h3>
						<p class="text-[11px] text-on-surface-variant">Mekanik telah menyelesaikan perbaikan (SPK: {insp.woNo}).</p>
					</div>
				</div>
			</div>
			<a 
				href="/p2h/{encodeURIComponent(insp.inspectionNo)}/re-inspect" 
				class="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
			>
				<span class="material-symbols-outlined text-[16px]">verified</span>
				<span>Buka Lembar Verifikasi QC Sekarang</span>
			</a>
		</div>
	{:else if (insp.status === 'TIDAK_LAYAK' || insp.status === 'FAILED_DEFECT') && !insp.woNo}
		<div class="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 space-y-2">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-rose-600 text-2xl">build</span>
				<div>
					<h3 class="text-xs font-black text-on-surface uppercase">Unit Memerlukan Perbaikan Bengkel</h3>
					<p class="text-[11px] text-on-surface-variant">Ditemukan {insp.defectCount} kerusakan yang wajib diterbitkan Surat Perintah Kerja (SPK).</p>
				</div>
			</div>
			<a 
				href="/maintenance/transactions/work-orders/create?from_inspection={encodeURIComponent(insp.inspectionNo)}" 
				class="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
			>
				<span class="material-symbols-outlined text-[16px]">assignment_add</span>
				<span>Buat SPK Bengkel Sekarang</span>
			</a>
		</div>
	{/if}

	<!-- Checklist Tabs & Items -->
	<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 space-y-3">
		<div class="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
			<h3 class="text-xs font-black uppercase tracking-wider text-on-surface">Hasil Pemeriksaan Fisik</h3>
			<span class="text-[10px] text-on-surface-variant font-medium">({insp.checklistData.length} item)</span>
		</div>

		<!-- Filter Pill Tabs -->
		<div class="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-surface-container">
			<button 
				type="button" 
				onclick={() => activeFilter = 'ALL'} 
				class="py-1.5 text-center rounded-lg text-xs font-bold transition-all {activeFilter === 'ALL' ? 'bg-surface text-on-surface shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
			>
				Semua ({insp.checklistData.length})
			</button>
			<button 
				type="button" 
				onclick={() => activeFilter = 'NOT_OK'} 
				class="py-1.5 text-center rounded-lg text-xs font-bold transition-all {activeFilter === 'NOT_OK' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-600 dark:text-rose-400'}"
			>
				Tidak OK ({notOkCount})
			</button>
			<button 
				type="button" 
				onclick={() => activeFilter = 'OK'} 
				class="py-1.5 text-center rounded-lg text-xs font-bold transition-all {activeFilter === 'OK' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-600 dark:text-emerald-400'}"
			>
				OK ({okCount})
			</button>
		</div>

		<!-- Item List -->
		<div class="divide-y divide-slate-200/60 dark:divide-slate-800/60 max-h-96 overflow-y-auto space-y-1">
			{#if filteredChecklist.length === 0}
				<div class="p-6 text-center text-xs text-on-surface-variant">
					Tidak ada item untuk filter ini.
				</div>
			{:else}
				{#each filteredChecklist as item}
					<div class="py-2.5 first:pt-1 space-y-1">
						<div class="flex items-center justify-between gap-2">
							<div class="space-y-0.5 flex-1 pr-2">
								<div class="flex items-center gap-1.5">
									{#if item.code}
										<span class="font-mono text-[10px] font-bold text-on-surface-variant bg-surface-container px-1 rounded">{item.code}</span>
									{/if}
									<span class="text-xs font-bold text-on-surface">{item.name}</span>
								</div>
								<div class="text-[10px] text-on-surface-variant font-medium">{item.category}</div>
							</div>

							{#if item.status === 'OK'}
								<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 flex items-center gap-0.5 shrink-0">
									<span class="material-symbols-outlined text-[12px]">check</span>
									<span>OK</span>
								</span>
							{:else}
								<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 flex items-center gap-0.5 shrink-0">
									<span class="material-symbols-outlined text-[12px]">close</span>
									<span>NOT OK</span>
								</span>
							{/if}
						</div>

						{#if item.remark}
							<div class="p-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/20 text-[11px] text-rose-800 dark:text-rose-300 italic border border-rose-200 dark:border-rose-900">
								Catatan: {item.remark}
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>

</div>
