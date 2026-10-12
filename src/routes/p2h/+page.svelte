<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');

	let filteredInspections = $derived(
		(data.inspections || []).filter(i => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				i.unitId.toLowerCase().includes(q) ||
				i.policeNo.toLowerCase().includes(q) ||
				i.inspectionNo.toLowerCase().includes(q) ||
				i.driverName.toLowerCase().includes(q)
			);
		})
	);

	function getStatusBadge(status: string) {
		const s = status.toUpperCase();
		if (s === 'LAYAK' || s === 'PASSED') {
			return { bg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800', label: 'LAYAK JALAN', icon: 'check_circle' };
		}
		if (s === 'TIDAK_LAYAK' || s === 'FAILED_DEFECT') {
			return { bg: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800', label: 'TIDAK LAYAK', icon: 'cancel' };
		}
		if (s === 'CLOSED') {
			return { bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700', label: 'SELESAI (CLOSED)', icon: 'task_alt' };
		}
		return { bg: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800', label: s, icon: 'info' };
	}
</script>

<div class="p-4 space-y-4">
	
	<!-- Hero Action Card -->
	<div class="p-5 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md space-y-3">
		<div class="flex items-start justify-between">
			<div>
				<span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/20 text-white">Inspeksi Harian</span>
				<h1 class="text-lg font-black tracking-tight mt-1">Pemeriksaan Kelayakan Armada (P2H)</h1>
				<p class="text-xs text-white/80 mt-0.5 leading-relaxed">Pastikan seluruh armada aman beroperasi sebelum keberangkatan.</p>
			</div>
			<div class="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
				<span class="material-symbols-outlined text-2xl">local_shipping</span>
			</div>
		</div>

		<a 
			href="/p2h/create" 
			class="w-full py-3 px-4 rounded-xl bg-surface text-on-surface font-black text-xs shadow-md hover:bg-surface-container transition-all flex items-center justify-center gap-2 active:scale-98"
		>
			<span class="material-symbols-outlined text-[18px] text-primary">add_circle</span>
			<span>Mulai Inspeksi P2H Baru</span>
		</a>
	</div>

	<!-- Quick Stats 4-Grid -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
		<div class="p-3 rounded-xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between">
			<span class="text-[10px] font-bold text-on-surface-variant uppercase">Diperiksa Hari Ini</span>
			<div class="text-xl font-black text-on-surface mt-1">{data.stats.total}</div>
		</div>

		<div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
			<span class="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Layak Jalan</span>
			<div class="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{data.stats.passed}</div>
		</div>

		<div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col justify-between">
			<span class="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase">Tidak Layak</span>
			<div class="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{data.stats.failed}</div>
		</div>

		<div class="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col justify-between">
			<span class="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase">Siap Re-Inspeksi</span>
			<div class="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">{data.stats.readyReinspect}</div>
		</div>
	</div>

	<!-- Search & Filter Bar -->
	<div class="relative">
		<input 
			type="text" 
			bind:value={searchQuery}
			placeholder="Cari nomor unit / nopol / supir..."
			class="w-full pl-9 pr-9 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
		/>
		<span class="material-symbols-outlined absolute left-2.5 top-2.5 text-on-surface-variant text-[18px]">search</span>
		{#if searchQuery}
			<button onclick={() => searchQuery = ''} class="material-symbols-outlined absolute right-2.5 top-2.5 text-on-surface-variant text-[18px]">close</button>
		{/if}
	</div>

	<!-- List of Inspection Cards -->
	<div class="space-y-3">
		<div class="flex items-center justify-between px-1">
			<span class="text-xs font-black uppercase tracking-wider text-on-surface">Pemeriksaan Terkini</span>
			<span class="text-[10px] text-on-surface-variant font-medium">({filteredInspections.length} unit)</span>
		</div>

		{#if filteredInspections.length === 0}
			<div class="p-8 text-center bg-surface-container-low rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-2">
				<span class="material-symbols-outlined text-4xl text-on-surface-variant">search_off</span>
				<p class="text-xs text-on-surface-variant">Tidak ada pemeriksaan P2H yang cocok dengan pencarian.</p>
			</div>
		{:else}
			{#each filteredInspections as insp}
				{@const badge = getStatusBadge(insp.status)}
				<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs space-y-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="font-mono text-base font-black text-on-surface tracking-tight">{insp.unitId}</span>
							<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-surface-container text-on-surface-variant">{insp.unitType}</span>
						</div>
						<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border {badge.bg}">
							<span class="material-symbols-outlined text-[13px]">{badge.icon}</span>
							<span>{badge.label}</span>
						</span>
					</div>

					<div class="grid grid-cols-2 gap-2 text-xs">
						<div>
							<span class="text-[10px] text-on-surface-variant uppercase font-medium">Pengemudi:</span>
							<p class="font-bold text-on-surface truncate mt-0.2">{insp.driverName}</p>
						</div>
						<div>
							<span class="text-[10px] text-on-surface-variant uppercase font-medium">Waktu P2H:</span>
							<p class="font-medium text-on-surface truncate mt-0.2">{insp.date}</p>
						</div>
					</div>

					{#if insp.defectCount > 0}
						<div class="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1.5 border border-rose-200 dark:border-rose-900">
							<span class="material-symbols-outlined text-[15px]">warning</span>
							<span>Ditemukan {insp.defectCount} item cacat / NOT OK</span>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="pt-1 flex items-center justify-between gap-2 border-t border-slate-200/50 dark:border-slate-800/50">
						<span class="font-mono text-[10px] text-on-surface-variant truncate">{insp.inspectionNo}</span>

						<div class="flex items-center gap-1.5">
							{#if insp.woStatus === 'READY_FOR_REINSPECTION'}
								<a 
									href="/p2h/{encodeURIComponent(insp.inspectionNo)}/re-inspect" 
									class="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-xs hover:bg-purple-700 transition-all flex items-center gap-1"
								>
									<span class="material-symbols-outlined text-[14px]">verified</span>
									<span>Uji QC</span>
								</a>
							{:else if (insp.status === 'TIDAK_LAYAK' || insp.status === 'FAILED_DEFECT') && !insp.woNo}
								<a 
									href="/maintenance/transactions/work-orders/create?from_inspection={encodeURIComponent(insp.inspectionNo)}" 
									class="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-xs hover:bg-rose-700 transition-all flex items-center gap-1"
								>
									<span class="material-symbols-outlined text-[14px]">build</span>
									<span>Buat SPK</span>
								</a>
							{/if}

							<a 
								href="/p2h/{encodeURIComponent(insp.inspectionNo)}" 
								class="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs transition-colors flex items-center gap-1"
							>
								<span>Detail</span>
								<span class="material-symbols-outlined text-[14px]">chevron_right</span>
							</a>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>

</div>
