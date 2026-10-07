<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let metrics = $derived(data.metrics);
	let activeWorkOrders = $derived(data.activeWorkOrders);
	let recentInspections = $derived(data.recentInspections);
	let dueSchedules = $derived(data.dueSchedules);

	function getStatusBadge(status: string) {
		const s = status.toUpperCase();
		if (s.includes('PROGRESS') || s.includes('PROSES')) {
			return 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800';
		}
		if (s.includes('REINSPECT') || s.includes('READY')) {
			return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800';
		}
		if (s.includes('CLOSE') || s.includes('COMPLET') || s.includes('PASS')) {
			return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
		}
		if (s.includes('DEFECT') || s.includes('FAIL') || s.includes('OVERDUE')) {
			return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800';
		}
		return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800';
	}
</script>

<svelte:head>
	<title>Maintenance Overview | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header & Quick Actions -->
	<header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
				<span>Workshop Management</span>
				<span>•</span>
				<span>Closed-Loop Maintenance</span>
			</div>
			<h1 class="text-2xl font-black text-on-surface tracking-tight">Bengkel & Inspeksi Armada</h1>
		</div>

		<div class="flex items-center gap-2.5 flex-wrap">
			<a href="/maintenance/transactions/inspections/create" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-sm hover:opacity-95 transition-all">
				<span class="material-symbols-outlined text-[18px]">add_task</span>
				<span>Mulai Inspeksi Kendaraan</span>
			</a>
			<a href="/maintenance/transactions/work-orders/create" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-sm border border-slate-200/80 dark:border-slate-800/80 transition-all">
				<span class="material-symbols-outlined text-[18px]">note_add</span>
				<span>Buat SPK Manual</span>
			</a>
		</div>
	</header>

	<!-- KPI Metric Cards (Standard 4 Columns) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- KPI 1: Active Work Orders -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-primary/30">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Work Orders Aktif</span>
				<div class="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">engineering</span>
				</div>
			</div>
			<div class="text-3xl font-black text-on-surface">{metrics.inProgress + metrics.pendingAssign + metrics.readyForReinspection}</div>
			<div class="flex items-center gap-3 text-[11px] font-semibold text-on-surface-variant mt-2">
				<span class="text-amber-600 font-bold">{metrics.pendingAssign} Antre</span>
				<span>•</span>
				<span class="text-sky-600 font-bold">{metrics.inProgress} Dikerjakan</span>
				<span>•</span>
				<span class="text-purple-600 font-bold">{metrics.readyForReinspection} Re-Inspeksi</span>
			</div>
		</div>

		<!-- KPI 2: Units in Workshop -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-primary/30">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Armada di Bengkel</span>
				<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">car_repair</span>
				</div>
			</div>
			<div class="text-3xl font-black text-on-surface">{metrics.unitsInWorkshop}</div>
			<p class="text-xs text-amber-600 font-bold mt-2 flex items-center gap-1">
				<span class="material-symbols-outlined text-[14px]">lock</span> Status terkunci di OCS Dispatcher
			</p>
		</div>

		<!-- KPI 3: Inspections Today -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-primary/30">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Inspeksi Hari Ini</span>
				<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">fact_check</span>
				</div>
			</div>
			<div class="text-3xl font-black text-on-surface">{metrics.inspectionsToday}</div>
			<div class="flex items-center gap-3 text-[11px] font-semibold mt-2">
				<span class="text-emerald-600 font-bold">{metrics.passedInspections} Layak (Pass)</span>
				<span>•</span>
				<span class="text-rose-600 font-bold">{metrics.defectedInspections} Defect (SPK)</span>
			</div>
		</div>

		<!-- KPI 4: PM Schedules Due/Overdue -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-primary/30">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Servis Rutin (PM)</span>
				<div class="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">event_repeat</span>
				</div>
			</div>
			<div class="text-3xl font-black text-on-surface">{metrics.pmDue + metrics.pmOverdue}</div>
			<div class="flex items-center gap-2 text-[11px] font-semibold mt-2">
				{#if metrics.pmOverdue > 0}
					<span class="text-rose-600 font-bold flex items-center gap-1">
						<span class="material-symbols-outlined text-[13px]">warning</span> {metrics.pmOverdue} Overdue
					</span>
				{:else}
					<span class="text-emerald-600 font-bold">Semua jadwal terkendali</span>
				{/if}
				{#if metrics.pmDue > 0}
					<span class="text-amber-600 font-bold">• {metrics.pmDue} Due</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Closed-Loop Process Banner -->
	<div class="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-sky-500/5 to-transparent border border-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
		<div class="space-y-1">
			<div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary">
				<span class="material-symbols-outlined text-[12px]">autorenew</span> Alur Kerja Standar BCS
			</div>
			<p class="text-sm font-bold text-on-surface">1. Inspeksi (P2H) → 2. Defect Jadi SPK → 3. Mekanik Selesaikan Item by Item → 4. Re-Inspeksi & Close</p>
			<p class="text-xs text-on-surface-variant">Unit secara otomatis dikunci saat masuk bengkel dan baru dibuka kembali ke OCS setelah lolos uji re-inspeksi.</p>
		</div>
		<div class="flex items-center gap-2">
			<a href="/maintenance/transactions/inspections" class="text-xs font-bold text-primary hover:underline flex items-center gap-1">
				Buka Antrean Inspeksi <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
			</a>
		</div>
	</div>

	<!-- Section: Active Work Orders in Workshop -->
	<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden">
		<div class="p-5 border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">build</span>
				</div>
				<div>
					<h2 class="text-base font-black text-on-surface tracking-tight">Antrean Work Orders Bengkel</h2>
					<p class="text-xs text-on-surface-variant font-medium">Daftar perbaikan aktif yang sedang dikerjakan mekanik</p>
				</div>
			</div>
			<a href="/maintenance/transactions/work-orders" class="text-xs font-bold text-primary hover:underline flex items-center gap-1">
				Lihat Semua SPK <span class="material-symbols-outlined text-[14px]">chevron_right</span>
			</a>
		</div>

		{#if activeWorkOrders.length === 0}
			<div class="p-12 text-center text-on-surface-variant">
				<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-2">task_alt</span>
				<p class="text-sm font-bold">Tidak ada antrean Work Order yang aktif</p>
				<p class="text-xs text-on-surface-variant/70 mt-1">Seluruh unit saat ini siap beroperasi atau seluruh perbaikan telah selesai.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-surface-container-low text-on-surface-variant text-[11px] font-black uppercase tracking-wider border-b border-slate-200/70 dark:border-slate-800/70">
						<tr>
							<th class="py-3 px-4">No. SPK / Tanggal</th>
							<th class="py-3 px-4">Unit Armada</th>
							<th class="py-3 px-4">Keluhan / Jenis Kerusakan</th>
							<th class="py-3 px-4">Mekanik Penanggung Jawab</th>
							<th class="py-3 px-4">Status & Progres</th>
							<th class="py-3 px-4 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each activeWorkOrders as wo}
							<tr class="hover:bg-surface-container-low/50 transition-colors">
								<td class="py-3 px-4">
									<div class="font-bold text-on-surface font-mono text-xs">{wo.woNo}</div>
									<div class="text-[11px] text-on-surface-variant">{wo.date}</div>
								</td>
								<td class="py-3 px-4">
									<span class="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded bg-surface-container text-xs">
										<span class="material-symbols-outlined text-[13px] text-primary">local_shipping</span>
										{wo.unitId}
									</span>
								</td>
								<td class="py-3 px-4">
									<div class="font-medium text-on-surface max-w-xs truncate" title={wo.complaint}>{wo.complaint}</div>
									<div class="text-[10px] text-on-surface-variant font-medium">{wo.category}</div>
								</td>
								<td class="py-3 px-4">
									<div class="flex items-center gap-1.5 text-xs text-on-surface font-medium">
										<span class="material-symbols-outlined text-[15px] text-on-surface-variant">person</span>
										{wo.mechanic}
									</div>
								</td>
								<td class="py-3 px-4">
									<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border {getStatusBadge(wo.status)}">
										{wo.status}
									</span>
								</td>
								<td class="py-3 px-4 text-right">
									<a href="/maintenance/transactions/work-orders/{encodeURIComponent(wo.woNo)}" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-xs font-bold transition-all">
										<span>Kerjakan</span>
										<span class="material-symbols-outlined text-[14px]">arrow_forward</span>
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- 2 Columns: Recent Inspections & Preventive Maintenance -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Left: Recent Inspections -->
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/70 dark:border-slate-800/70 p-5 space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-[18px]">fact_check</span>
					</div>
					<div>
						<h3 class="text-sm font-black text-on-surface">Inspeksi Kendaraan Terbaru</h3>
						<p class="text-[11px] text-on-surface-variant">Pemeriksaan fisik armada masuk / keluar</p>
					</div>
				</div>
				<a href="/maintenance/transactions/inspections" class="text-xs font-bold text-primary hover:underline">Semua</a>
			</div>

			{#if recentInspections.length === 0}
				<div class="p-8 text-center text-on-surface-variant text-xs font-medium">
					Belum ada riwayat inspeksi hari ini.
				</div>
			{:else}
				<div class="space-y-2.5">
					{#each recentInspections as insp}
						<div class="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between gap-3">
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<span class="px-1.5 py-0.5 rounded text-[10px] font-black uppercase {insp.unitType === 'TR' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}">
										{insp.unitType || 'DT'}
									</span>
									<span class="font-bold text-xs font-mono text-on-surface">{insp.unitId}</span>
									<span class="text-[11px] text-on-surface-variant">• {insp.date}</span>
								</div>
								<div class="text-[11px] text-on-surface-variant flex items-center gap-2">
									<span>Inspektor: <b>{insp.inspector}</b></span>
									{#if insp.defects > 0}
										<span>•</span>
										<span class="text-rose-600 font-bold">{insp.defects} Defect Ditemukan</span>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-2">
								<span class="px-2.5 py-1 rounded-full text-[10px] font-black border {getStatusBadge(insp.status)}">
									{insp.status}
								</span>
								<a href="/maintenance/transactions/inspections/{encodeURIComponent(insp.inspectionNo)}" class="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors" title="Lihat Detail">
									<span class="material-symbols-outlined text-[16px]">chevron_right</span>
								</a>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Right: Preventive Maintenance Alerts -->
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/70 dark:border-slate-800/70 p-5 space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-[18px]">event_repeat</span>
					</div>
					<div>
						<h3 class="text-sm font-black text-on-surface">Jadwal Servis Berkala (PM)</h3>
						<p class="text-[11px] text-on-surface-variant">Armada yang mendekati atau melewati target KM / Tanggal</p>
					</div>
				</div>
				<a href="/maintenance/transactions/schedules" class="text-xs font-bold text-primary hover:underline">Semua</a>
			</div>

			{#if dueSchedules.length === 0}
				<div class="p-8 text-center text-on-surface-variant text-xs font-medium">
					Tidak ada armada dengan jadwal servis due / overdue saat ini.
				</div>
			{:else}
				<div class="space-y-2.5">
					{#each dueSchedules as sch}
						<div class="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between gap-3">
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<span class="font-bold text-xs font-mono text-on-surface">{sch.unitId}</span>
									<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container-high text-on-surface">{sch.serviceType}</span>
								</div>
								<div class="text-[11px] text-on-surface-variant">
									Target KM: <b>{sch.targetKm?.toLocaleString('id-ID') || '-'}</b> (Saat ini: {sch.currentKm?.toLocaleString('id-ID') || '-'}) • Target: {sch.targetDate}
								</div>
							</div>
							<div class="flex items-center gap-2">
								<span class="px-2.5 py-1 rounded-full text-[10px] font-black border {sch.status === 'OVERDUE' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}">
									{sch.status}
								</span>
								<a href="/maintenance/transactions/work-orders/create?unit={encodeURIComponent(sch.unitId)}&category={encodeURIComponent(sch.serviceType)}" class="px-2.5 py-1 rounded-lg bg-primary text-on-primary text-[11px] font-bold hover:opacity-90 transition-all">
									Buat SPK
								</a>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
