<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { authUser } from '$lib/stores/auth';

	let { data }: { data: PageData } = $props();

	let currentUser = $derived($page.data?.user || $authUser);

	let isMaintenance = $derived.by(() => {
		if (!currentUser) return false;
		const r = (currentUser.role || '').toLowerCase();
		const t = (currentUser.titleName || '').toLowerCase();
		const d = (currentUser.division || '').toLowerCase();
		return (
			['superadmin', 'administrator', 'superhyperadmin', 'super_admin', 'kepala_mekanik', 'admin_maintenance', 'manager_maintenance'].includes(r) ||
			r.includes('maintenance') ||
			r.includes('mekanik') ||
			t.includes('mekanik') ||
			t.includes('maintenance') ||
			d.includes('maintenance')
		);
	});

	let isInspector = $derived.by(() => {
		if (!currentUser) return false;
		const r = (currentUser.role || '').toLowerCase();
		const t = (currentUser.titleName || '').toLowerCase();
		const d = (currentUser.division || '').toLowerCase();
		return r === 'inspector' || r.includes('inspect') || t.includes('inspector') || t.includes('inspeksi') || d.includes('inspeksi');
	});

	let metrics = $derived(data.metrics);
	let activeWorkOrders = $derived(data.activeWorkOrders);
	let recentInspections = $derived(data.recentInspections);
	let dueSchedules = $derived(data.dueSchedules);
	let categoryBreakdown = $derived(data.categoryBreakdown || []);

	// Donut Chart State & Derived Math
	let hoveredCategory = $state<{ label: string; count: number; pct: number; color: string } | null>(null);

	const categoryPalette = [
		{ color: '#0284c7', bg: 'bg-sky-500' },
		{ color: '#f59e0b', bg: 'bg-amber-500' },
		{ color: '#8b5cf6', bg: 'bg-purple-500' },
		{ color: '#10b981', bg: 'bg-emerald-500' },
		{ color: '#ec4899', bg: 'bg-pink-500' },
		{ color: '#64748b', bg: 'bg-slate-500' }
	];

	const donutData = $derived.by(() => {
		const total = categoryBreakdown.reduce((acc: number, it: any) => acc + (it.count || 0), 0) || 1;
		const C = 251.327; // 2 * PI * 40
		let offset = 0;

		return categoryBreakdown.map((it: any, idx: number) => {
			const pal = categoryPalette[idx % categoryPalette.length];
			const pct = Math.round(((it.count || 0) / total) * 100);
			const strokeLength = Math.max(0, ((it.count || 0) / total) * C);
			const dashArray = `${strokeLength} ${C - strokeLength}`;
			const dashOffset = -offset;
			offset += strokeLength;
			return {
				label: it.category,
				count: it.count || 0,
				color: pal.color,
				bgCls: pal.bg,
				pct,
				dashArray,
				dashOffset
			};
		});
	});

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
	<title>Maintenance Command Center | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header & Quick Actions -->
	<header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
				<span>Workshop Management</span>
				<span>•</span>
				<span>Closed-Loop Safety System</span>
			</div>
			<div class="flex items-center gap-2.5">
				<div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">build_circle</span>
				</div>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Maintenance Command Center</h1>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-0.5">
				Sistem perawatan terpadu armada, alokasi penugasan montir bengkel, dan jaminan kelaikan unit sebelum beroperasi
			</p>
		</div>

		<div class="flex items-center gap-2.5 flex-wrap">
			<a 
				href="/maintenance/transactions/inspections/create" 
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-xs hover:opacity-95 transition-all"
			>
				<span class="material-symbols-outlined text-[18px]">add_task</span>
				<span>Mulai Inspeksi (P2H)</span>
			</a>
			<a 
				href="/maintenance/transactions/work-orders/create" 
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs border border-slate-200/80 dark:border-slate-800/80 transition-all shadow-2xs"
			>
				<span class="material-symbols-outlined text-[18px]">note_add</span>
				<span>Buat SPK Manual</span>
			</a>
		</div>
	</header>

	<!-- Zona 1: KPI Metric Cards (Standard 4 Columns Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- KPI 1: Active Work Orders -->
		<a 
			href="/maintenance/transactions/work-orders"
			class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs hover:border-sky-500/40 hover:bg-surface-container/70 transition-all group block"
		>
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-sky-600 transition-colors">Work Orders Aktif</span>
				<div class="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
					<span class="material-symbols-outlined text-[20px]">engineering</span>
				</div>
			</div>
			<div class="text-3xl font-black text-on-surface">{metrics.totalActiveWO}</div>
			<div class="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
				<span class="text-amber-600">{metrics.pendingAssign} Antre</span>
				<span>·</span>
				<span class="text-sky-600">{metrics.inProgress} Dikerjakan</span>
				<span>·</span>
				<span class="text-purple-600">{metrics.readyForReinspection} Re-Inspeksi</span>
			</div>
		</a>

		<!-- KPI 2: Units in Workshop -->
		<a 
			href="/maintenance/transactions/work-orders?status=Proses"
			class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs hover:border-amber-500/40 hover:bg-surface-container/70 transition-all group block"
		>
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-amber-600 transition-colors">Armada di Bengkel</span>
				<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
					<span class="material-symbols-outlined text-[20px]">car_repair</span>
				</div>
			</div>
			<div class="text-3xl font-black text-on-surface">{metrics.unitsInWorkshop}</div>
			<div class="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-bold mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
				<span class="flex items-center gap-1 text-[11px]">
					<span class="material-symbols-outlined text-[14px]">lock</span> Terkunci di OCS Dispatcher
				</span>
				<span class="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Detail →</span>
			</div>
		</a>

		<!-- KPI 3: Inspections Today & Pass Rate -->
		<a 
			href="/maintenance/transactions/inspections"
			class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs hover:border-emerald-500/40 hover:bg-surface-container/70 transition-all group block"
		>
			<div class="flex items-center justify-between mb-2">
				<div class="flex items-center gap-1.5">
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-emerald-600 transition-colors">Inspeksi Hari Ini</span>
					<span class="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 font-bold text-[9px] rounded">
						{metrics.passRate}% Lolos
					</span>
				</div>
				<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
					<span class="material-symbols-outlined text-[20px]">fact_check</span>
				</div>
			</div>
			<div class="text-3xl font-black text-on-surface">{metrics.inspectionsToday}</div>
			<div class="flex items-center gap-2 text-[10px] font-bold mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
				<span class="text-emerald-600">{metrics.passedInspections} Layak Jalan</span>
				<span>·</span>
				<span class="text-rose-600">{metrics.defectedInspections} Defect (SPK)</span>
			</div>
		</a>

		<!-- KPI 4: PM Schedules Due/Overdue -->
		<a 
			href="/maintenance/transactions/schedules"
			class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs hover:border-rose-500/40 hover:bg-surface-container/70 transition-all group block"
		>
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-rose-600 transition-colors">Servis Rutin (PM)</span>
				<div class="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
					<span class="material-symbols-outlined text-[20px]">event_repeat</span>
				</div>
			</div>
			<div class="text-3xl font-black text-on-surface">{metrics.pmDue + metrics.pmOverdue}</div>
			<div class="flex items-center justify-between text-[11px] font-bold mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
				{#if metrics.pmOverdue > 0}
					<span class="text-rose-600 flex items-center gap-1">
						<span class="material-symbols-outlined text-[13px]">warning</span> {metrics.pmOverdue} Unit Overdue
					</span>
				{:else}
					<span class="text-emerald-600">Jadwal Terkendali</span>
				{/if}
				{#if metrics.pmDue > 0}
					<span class="text-amber-600">· {metrics.pmDue} Due</span>
				{/if}
			</div>
		</a>
	</div>

	<!-- Zona 2: Interactive Closed-Loop Workflow Stepper (Executive Assurance) -->
	<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
			<div class="flex items-center gap-2">
				<div class="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
				<h2 class="text-xs font-bold text-on-surface uppercase tracking-wider">Alur Kerja Standar Closed-Loop BCS</h2>
				<span class="text-[11px] text-on-surface-variant font-medium">· Unit terkunci otomatis dan baru dibuka ke OCS setelah re-inspeksi</span>
			</div>
			<span class="text-xs font-bold text-primary flex items-center gap-1">
				<span class="material-symbols-outlined text-sm">verified_user</span> Jaminan Kelaikan Operasional
			</span>
		</div>

		<!-- 4 Stepper Cards with Flow Direction -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
			<!-- Stage 1: Inspeksi Masuk -->
			<a 
				href="/maintenance/transactions/inspections"
				class="p-3.5 rounded-xl bg-surface hover:bg-surface-container border border-slate-200/50 dark:border-slate-800/50 hover:border-emerald-500/50 transition-all group flex flex-col justify-between cursor-pointer"
			>
				<div>
					<div class="flex items-center justify-between mb-2">
						<span class="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
							Tahap 1
						</span>
						<div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
							<span class="material-symbols-outlined text-base">fact_check</span>
						</div>
					</div>
					<h3 class="text-xs font-black text-on-surface group-hover:text-emerald-600 transition-colors">1. Inspeksi Fisik (P2H)</h3>
					<p class="text-[11px] text-on-surface-variant mt-1 leading-snug">Pemeriksaan fisik harian armada masuk dan keluar pool.</p>
				</div>
				<div class="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40 flex items-baseline justify-between">
					<span class="text-lg font-black text-on-surface">{metrics.inspectionsToday} <span class="text-[10px] font-normal text-on-surface-variant">Unit Diuji</span></span>
					<span class="text-[10px] font-bold text-emerald-600">{metrics.passedInspections} Pass</span>
				</div>
			</a>

			<!-- Stage 2: Penerbitan SPK -->
			<a 
				href="/maintenance/transactions/work-orders?status=Open"
				class="p-3.5 rounded-xl bg-surface hover:bg-surface-container border border-slate-200/50 dark:border-slate-800/50 hover:border-amber-500/50 transition-all group flex flex-col justify-between cursor-pointer"
			>
				<div>
					<div class="flex items-center justify-between mb-2">
						<span class="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
							Tahap 2
						</span>
						<div class="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
							<span class="material-symbols-outlined text-base">assignment_late</span>
						</div>
					</div>
					<h3 class="text-xs font-black text-on-surface group-hover:text-amber-600 transition-colors">2. Penerbitan SPK</h3>
					<p class="text-[11px] text-on-surface-variant mt-1 leading-snug">Defect otomatis menjadi Work Order dan antre penugasan montir.</p>
				</div>
				<div class="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40 flex items-baseline justify-between">
					<span class="text-lg font-black text-on-surface">{metrics.pendingAssign} <span class="text-[10px] font-normal text-on-surface-variant">SPK Antre</span></span>
					<span class="text-[10px] font-bold text-amber-600">Siap Dikerjakan</span>
				</div>
			</a>

			<!-- Stage 3: Pengerjaan Bengkel -->
			<a 
				href="/maintenance/transactions/work-orders?status=Proses"
				class="p-3.5 rounded-xl bg-surface hover:bg-surface-container border border-slate-200/50 dark:border-slate-800/50 hover:border-sky-500/50 transition-all group flex flex-col justify-between cursor-pointer"
			>
				<div>
					<div class="flex items-center justify-between mb-2">
						<span class="text-[10px] font-black uppercase tracking-wider text-sky-600 bg-sky-500/10 px-2 py-0.5 rounded">
							Tahap 3
						</span>
						<div class="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
							<span class="material-symbols-outlined text-base">build</span>
						</div>
					</div>
					<h3 class="text-xs font-black text-on-surface group-hover:text-sky-600 transition-colors">3. Pengerjaan Montir</h3>
					<p class="text-[11px] text-on-surface-variant mt-1 leading-snug">Montir menyelesaikan item perbaikan; unit status terkunci.</p>
				</div>
				<div class="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40 flex items-baseline justify-between">
					<span class="text-lg font-black text-on-surface">{metrics.inProgress} <span class="text-[10px] font-normal text-on-surface-variant">SPK Berjalan</span></span>
					<span class="text-[10px] font-bold text-sky-600">{metrics.unitsInWorkshop} Unit Terkunci</span>
				</div>
			</a>

			<!-- Stage 4: Re-Inspeksi & Rilis -->
			<a 
				href="/maintenance/transactions/work-orders?status=READY_FOR_REINSPECTION"
				class="p-3.5 rounded-xl bg-surface hover:bg-surface-container border border-slate-200/50 dark:border-slate-800/50 hover:border-purple-500/50 transition-all group flex flex-col justify-between cursor-pointer"
			>
				<div>
					<div class="flex items-center justify-between mb-2">
						<span class="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded">
							Tahap 4
						</span>
						<div class="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
							<span class="material-symbols-outlined text-base">verified</span>
						</div>
					</div>
					<h3 class="text-xs font-black text-on-surface group-hover:text-purple-600 transition-colors">4. Uji Re-Inspeksi & Rilis</h3>
					<p class="text-[11px] text-on-surface-variant mt-1 leading-snug">Inspektor memverifikasi kelayakan akhir sebelum unit kembali ke OCS.</p>
				</div>
				<div class="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40 flex items-baseline justify-between">
					<span class="text-lg font-black text-on-surface">{metrics.readyForReinspection} <span class="text-[10px] font-normal text-on-surface-variant">Siap Diuji</span></span>
					<span class="text-[10px] font-bold text-purple-600">Kunci Dibuka</span>
				</div>
			</a>
		</div>
	</div>

	<!-- Zona 3: Analytics & SPK Command (2 Kolom Seimbang) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- Left: Donut Chart Kategori Kerusakan (5 Cols) -->
		<div class="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-xl">pie_chart</span>
						<h3 class="text-base font-bold text-on-surface tracking-tight">Kategori Perbaikan / Kerusakan</h3>
					</div>
					<a href="/maintenance/reports/costs" class="text-xs font-bold text-primary hover:underline">Laporan Biaya</a>
				</div>
				<p class="text-xs text-on-surface-variant mb-4">Distribusi jenis perbaikan pada armada aktif bengkel</p>

				<!-- SVG Donut Chart -->
				<div class="relative flex items-center justify-center my-2">
					<svg class="w-40 h-40 -rotate-90" viewBox="0 0 100 100">
						<!-- Background Ring -->
						<circle
							cx="50"
							cy="50"
							r="40"
							class="stroke-slate-100 dark:stroke-slate-800"
							stroke-width="12"
							fill="transparent"
						/>
						<!-- Dynamic Segments -->
						{#each donutData as slice}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<circle
								cx="50"
								cy="50"
								r="40"
								stroke={slice.color}
								stroke-width={hoveredCategory?.label === slice.label ? "14" : "12"}
								stroke-dasharray={slice.dashArray}
								stroke-dashoffset={slice.dashOffset}
								stroke-linecap="butt"
								fill="transparent"
								class="transition-all duration-300 cursor-pointer hover:opacity-90"
								onmouseenter={() => hoveredCategory = slice}
								onmouseleave={() => hoveredCategory = null}
							/>
						{/each}
					</svg>

					<!-- Center Hole Info -->
					<div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
						{#if hoveredCategory}
							<span class="text-sm font-black text-on-surface truncate max-w-[80px]">{hoveredCategory.count} SPK</span>
							<span class="text-[10px] font-bold text-primary">{hoveredCategory.pct}%</span>
							<span class="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider truncate max-w-[85px]">{hoveredCategory.label}</span>
						{:else}
							<span class="text-base font-black text-on-surface">{metrics.totalActiveWO}</span>
							<span class="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Total SPK Aktif</span>
						{/if}
					</div>
				</div>

				<!-- Interactive Category Legend -->
				<div class="space-y-1.5 pt-3 border-t border-slate-200/40 dark:border-slate-800/40">
					{#each donutData as slice}
						<a 
							href="/maintenance/transactions/work-orders?category={encodeURIComponent(slice.label)}"
							class="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-container transition-colors group cursor-pointer"
							onmouseenter={() => hoveredCategory = slice}
							onmouseleave={() => hoveredCategory = null}
						>
							<div class="flex items-center gap-2 min-w-0">
								<span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: {slice.color}"></span>
								<span class="text-xs font-medium text-on-surface-variant group-hover:text-on-surface truncate">{slice.label}</span>
							</div>
							<div class="flex items-center gap-1.5 flex-shrink-0">
								<span class="text-xs font-bold text-on-surface">{slice.count}</span>
								<span class="text-[10px] font-semibold text-on-surface-variant/70">({slice.pct}%)</span>
							</div>
						</a>
					{/each}
				</div>
			</div>

			<div class="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Integrasi suku cadang & servis</span>
				<a href="/maintenance/reports/history" class="font-bold text-primary hover:underline flex items-center gap-0.5">
					<span>Riwayat Servis</span>
					<span class="material-symbols-outlined text-sm">arrow_forward</span>
				</a>
			</div>
		</div>

		<!-- Right: Antrean Work Order Prioritas Bengkel (7 Cols) -->
		<div class="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-4">
					<div>
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-sky-600 dark:text-sky-400 text-lg">engineering</span>
							<h3 class="text-base font-bold text-on-surface tracking-tight">Antrean Work Order Prioritas</h3>
						</div>
						<p class="text-xs text-on-surface-variant mt-0.5">Surat Perintah Kerja armada yang sedang dalam penanganan mekanik</p>
					</div>
					<a href="/maintenance/transactions/work-orders" class="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
						<span>Semua SPK</span>
						<span class="material-symbols-outlined text-sm">arrow_forward</span>
					</a>
				</div>

				<div class="space-y-3">
					{#if activeWorkOrders.length === 0}
						<div class="py-12 text-center text-on-surface-variant">
							<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-1">task_alt</span>
							<p class="text-xs font-bold text-on-surface">Tidak Ada Antrean SPK</p>
							<p class="text-[11px] text-on-surface-variant/70 mt-0.5">Seluruh armada saat ini prima dan siap beroperasi.</p>
						</div>
					{:else}
						{#each activeWorkOrders.slice(0, 4) as wo}
							<div class="p-3.5 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50 hover:bg-surface-container hover:border-sky-500/30 transition-all flex flex-col gap-2">
								<div class="flex items-start justify-between gap-2">
									<div class="flex items-center gap-2 min-w-0">
										<span class="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-md bg-surface-container text-xs text-on-surface">
											<span class="material-symbols-outlined text-[14px] text-primary">local_shipping</span>
											{wo.unitId}
										</span>
										<span class="text-xs font-bold font-mono text-on-surface truncate">{wo.woNo}</span>
										<span class="text-[10px] text-on-surface-variant/70">· {wo.date}</span>
									</div>
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border {getStatusBadge(wo.status)} flex-shrink-0">
										{wo.status}
									</span>
								</div>

								<!-- Keluhan & Kategori -->
								<div>
									<p class="text-xs font-bold text-on-surface truncate" title={wo.complaint}>{wo.complaint}</p>
									<p class="text-[10px] text-on-surface-variant font-medium mt-0.5 uppercase tracking-wider">{wo.category}</p>
								</div>

								<!-- Footer card: Montir & Quick Action -->
								<div class="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between text-xs">
									<div class="flex items-center gap-1.5 text-on-surface-variant text-[11px]">
										<span class="material-symbols-outlined text-sm">person</span>
										<span>{wo.mechanic}</span>
									</div>

									<div>
										{#if isInspector && (wo.status === 'READY_FOR_REINSPECTION' || (wo.status || '').toUpperCase().includes('REINSPECT'))}
											<a 
												href="/maintenance/transactions/inspections/{encodeURIComponent(wo.inspectionNo || wo.woNo)}/re-inspect" 
												class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold shadow-xs transition-all"
											>
												<span class="material-symbols-outlined text-[13px]">verified</span>
												<span>Uji Re-Inspeksi</span>
											</a>
										{:else if isMaintenance && wo.status !== 'Closed' && !wo.status.toUpperCase().includes('CLOSE')}
											<a 
												href="/maintenance/transactions/work-orders/{encodeURIComponent(wo.woNo)}" 
												class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-on-primary text-[11px] font-bold hover:opacity-90 transition-all"
											>
												<span>Kerjakan</span>
												<span class="material-symbols-outlined text-[13px]">arrow_forward</span>
											</a>
										{:else}
											<a 
												href="/maintenance/transactions/work-orders/{encodeURIComponent(wo.woNo)}" 
												class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-bold transition-all"
											>
												<span>Detail</span>
												<span class="material-symbols-outlined text-[13px]">chevron_right</span>
											</a>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<div class="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Pemberian suku cadang via Delivery Note (DN)</span>
				<a href="/maintenance/work-orders" class="font-bold text-primary hover:underline flex items-center gap-0.5">
					<span>Buka Papan Kanban</span>
					<span class="material-symbols-outlined text-sm">view_kanban</span>
				</a>
			</div>
		</div>
	</div>

	<!-- Zona 4: Field Operations & Preventive Monitoring (2 Kolom Seimbang) -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Left: Recent Inspections -->
		<div class="p-5 sm:p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-4">
					<div>
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg">fact_check</span>
							<h3 class="text-base font-bold text-on-surface tracking-tight">Inspeksi Kendaraan Terbaru</h3>
						</div>
						<p class="text-xs text-on-surface-variant mt-0.5">Pemeriksaan kelaikan fisik armada masuk / keluar pool</p>
					</div>
					<a href="/maintenance/transactions/inspections" class="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
						<span>Semua</span>
						<span class="material-symbols-outlined text-sm">arrow_forward</span>
					</a>
				</div>

				{#if recentInspections.length === 0}
					<div class="py-10 text-center text-on-surface-variant text-xs font-medium">
						Belum ada riwayat inspeksi hari ini.
					</div>
				{:else}
					<div class="space-y-2.5">
						{#each recentInspections as insp}
							<div class="p-3 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between gap-3 hover:bg-surface-container transition-colors">
								<div class="space-y-1 min-w-0">
									<div class="flex items-center gap-2">
										<span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase {insp.unitType === 'TR' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}">
											{insp.unitType || 'DT'}
										</span>
										<span class="font-bold text-xs font-mono text-on-surface">{insp.unitId}</span>
										<span class="text-[10px] text-on-surface-variant">· {insp.date}</span>
									</div>
									<div class="text-[11px] text-on-surface-variant flex items-center gap-2">
										<span>Inspektor: <b>{insp.inspector}</b></span>
										{#if insp.defects > 0}
											<span>·</span>
											<span class="text-rose-600 font-bold">{insp.defects} Defect</span>
										{/if}
									</div>
								</div>
								<div class="flex items-center gap-2 flex-shrink-0">
									<span class="px-2 py-0.5 rounded-md text-[10px] font-black border {getStatusBadge(insp.status)}">
										{insp.status}
									</span>
									<a 
										href="/maintenance/transactions/inspections/{encodeURIComponent(insp.inspectionNo)}" 
										class="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors" 
										title="Lihat Detail Lembar Uji"
									>
										<span class="material-symbols-outlined text-base">chevron_right</span>
									</a>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs text-on-surface-variant">
				<span>P2H & Digital Checklist</span>
				<a href="/maintenance/transactions/inspections/create" class="font-bold text-primary hover:underline flex items-center gap-1">
					<span class="material-symbols-outlined text-sm">add_task</span>
					<span>Uji Fisik Baru</span>
				</a>
			</div>
		</div>

		<!-- Right: Preventive Maintenance Alerts -->
		<div class="p-5 sm:p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-4">
					<div>
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-rose-600 dark:text-rose-400 text-lg">event_repeat</span>
							<h3 class="text-base font-bold text-on-surface tracking-tight">Jadwal Servis Berkala (PM)</h3>
						</div>
						<p class="text-xs text-on-surface-variant mt-0.5">Armada mendekati atau melewati target KM / Tanggal servis</p>
					</div>
					<a href="/maintenance/transactions/schedules" class="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
						<span>Semua</span>
						<span class="material-symbols-outlined text-sm">arrow_forward</span>
					</a>
				</div>

				{#if dueSchedules.length === 0}
					<div class="py-10 text-center text-on-surface-variant text-xs font-medium">
						Tidak ada armada dengan jadwal servis due / overdue saat ini.
					</div>
				{:else}
					<div class="space-y-2.5">
						{#each dueSchedules as sch}
							<div class="p-3 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between gap-3 hover:bg-surface-container transition-colors">
								<div class="space-y-1 min-w-0">
									<div class="flex items-center gap-2">
										<span class="font-bold text-xs font-mono text-on-surface">{sch.unitId}</span>
										<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-surface-container text-on-surface">{sch.serviceType}</span>
									</div>
									<div class="text-[10px] text-on-surface-variant truncate">
										Target KM: <b>{sch.targetKm?.toLocaleString('id-ID') || '-'}</b> · Target: {sch.targetDate}
									</div>
								</div>
								<div class="flex items-center gap-2 flex-shrink-0">
									<span class="px-2 py-0.5 rounded-md text-[10px] font-black border {sch.status === 'OVERDUE' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}">
										{sch.status}
									</span>
									<a 
										href="/maintenance/transactions/work-orders/create?unit={encodeURIComponent(sch.unitId)}&category={encodeURIComponent(sch.serviceType)}" 
										class="px-2.5 py-1 rounded-lg bg-primary text-on-primary text-[10px] font-bold hover:opacity-90 transition-all flex items-center gap-0.5"
									>
										<span>Buat SPK</span>
										<span class="material-symbols-outlined text-xs">arrow_forward</span>
									</a>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Pencegahan downtime armada</span>
				<a href="/maintenance/transactions/schedules" class="font-bold text-primary hover:underline flex items-center gap-1">
					<span class="material-symbols-outlined text-sm">calendar_month</span>
					<span>Kelola Jadwal PM</span>
				</a>
			</div>
		</div>
	</div>
</div>
