<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let metrics = $derived(data.metrics);
	let pipeline = $derived(data.pipeline);
	let safetyTrend = $derived(data.safetyTrend || []);
	let riskBreakdown = $derived(data.riskBreakdown);
	let recentIncidents = $derived(data.recentIncidents || []);
	let recentProactive = $derived(data.recentProactive || []);
	let recentBriefings = $derived(data.recentBriefings || []);
	let recentComplaints = $derived(data.recentComplaints || []);

	// Tab states
	let activeLeftTab = $state<'incidents' | 'complaints'>('incidents');
	let activeRightTab = $state<'proactive' | 'briefings'>('proactive');
	let selectedMonthIdx = $state<number | null>(null);

	function formatRupiah(amount: number | string | null | undefined): string {
		if (amount === null || amount === undefined || isNaN(Number(amount))) return 'Rp 0';
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(Number(amount));
	}

	function formatDate(dateStr: string | null | undefined): string {
		if (!dateStr) return '-';
		try {
			const d = new Date(dateStr);
			if (isNaN(d.getTime())) return dateStr;
			return new Intl.DateTimeFormat('id-ID', {
				day: '2-digit',
				month: 'short',
				year: 'numeric'
			}).format(d);
		} catch {
			return dateStr;
		}
	}

	function getSeverityBadge(sev: string) {
		switch (sev?.toLowerCase()) {
			case 'high':
				return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
			case 'medium':
				return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
			case 'low':
			default:
				return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
		}
	}
</script>

<svelte:head>
	<title>QHSE Command Center | ERP BCS</title>
</svelte:head>

<div class="space-y-6 pb-8">
	<!-- HEADER SECTION -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">verified_user</span>
				</div>
				<div>
					<h1 class="text-2xl font-black text-on-surface tracking-tight">QHSE Command Center</h1>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">
						Pemantauan terpadu Indikator K3 (Lagging vs Leading), Zero Accident, Manajemen APD, dan Sistem Mutu ISO 45001 & 9001
					</p>
				</div>
			</div>
		</div>

		<!-- Action CTAs -->
		<div class="flex flex-wrap items-center gap-2.5">
			<a
				href="/qhse/inspections"
				class="px-3.5 py-2 rounded-xl bg-surface border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-on-surface hover:bg-surface-container transition-all flex items-center gap-1.5 shadow-xs"
			>
				<span class="material-symbols-outlined text-base text-emerald-600">fact_check</span>
				<span>Inspeksi & Near-Miss</span>
			</a>
			<a
				href="/qhse/safety-enablement"
				class="px-3.5 py-2 rounded-xl bg-surface border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-on-surface hover:bg-surface-container transition-all flex items-center gap-1.5 shadow-xs"
			>
				<span class="material-symbols-outlined text-base text-blue-600">health_and_safety</span>
				<span>Briefing & APD</span>
			</a>
			<a
				href="/qhse/incidents"
				class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">add_alert</span>
				<span>Lapor Insiden / Temuan</span>
			</a>
		</div>
	</header>

	<!-- ZONA 1: 4 EXECUTIVE BENTO KPI CARDS -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- 1. Zero Accident & Safe Man-Hours -->
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Jam Kerja Selamat</span>
					<h2 class="text-2xl font-black text-emerald-600 mt-1 font-mono tracking-tight">
						{new Intl.NumberFormat('id-ID').format(metrics.safeManHours)} <span class="text-sm font-bold">Jam</span>
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">shield</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">
					<strong class="text-emerald-600 font-bold">{metrics.zeroAccidentDays} Hari</strong> Berturut-turut
				</span>
				<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold font-mono text-[10px]">
					Zero LTI
				</span>
			</div>
		</div>

		<!-- 2. Rasio K3 Leading vs Lagging -->
		<a
			href="/qhse/incidents"
			class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between hover:border-blue-500/40 transition-colors"
		>
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Rasio Leading : Lagging</span>
					<h2 class="text-2xl font-black text-blue-600 mt-1 font-mono tracking-tight">
						{metrics.leading.totalReports} : {metrics.lagging.totalIncidents}
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">fact_check</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">
					Proaktif: <strong class="text-emerald-600">{metrics.leading.nearmiss} Near-miss</strong>
				</span>
				<span class="text-slate-400">
					Insiden: <strong class="text-rose-600">{metrics.lagging.totalIncidents}</strong>
				</span>
			</div>
		</a>

		<!-- 3. Status Tindak Lanjut CAR & CAPA -->
		<a
			href="/qhse/incidents"
			class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between hover:border-amber-500/40 transition-colors"
		>
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Tindakan Korektif (CAPA)</span>
					<h2 class="text-2xl font-black text-amber-600 mt-1 font-mono tracking-tight">
						{metrics.lagging.openCar + metrics.leading.openCapa} Tindakan
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">pending_actions</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">
					<strong class="text-rose-600 font-bold">{metrics.lagging.openCar} CAR</strong> Insiden
				</span>
				<span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold font-mono text-[10px]">
					{metrics.leading.openCapa} CAPA Proaktif
				</span>
			</div>
		</a>

		<!-- 4. Edukasi APD & Sistem Mutu ISO -->
		<a
			href="/qhse/quality"
			class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between hover:border-purple-500/40 transition-colors"
		>
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Standar Mutu & APD</span>
					<h2 class="text-xl font-black text-purple-600 mt-1 font-mono tracking-tight">
						ISO 45001 &amp; 9001
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">policy</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">
					<strong class="text-on-surface">{metrics.enablement.totalParticipants} Peserta</strong> Briefing
				</span>
				<span class="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-bold font-mono text-[10px]">
					{metrics.management.activeSops} SOP Aktif
				</span>
			</div>
		</a>
	</div>

	<!-- ZONA 2: CONTINUOUS SAFETY OPERATIONAL LIFECYCLE PIPELINE STRIP -->
	<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-orange-600 text-lg">timeline</span>
				<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Siklus Manajemen Keselamatan (Safety & Incident Flow)</h3>
			</div>
			<span class="text-[11px] font-mono text-slate-400">Pelaporan → Tindakan Lapangan → Investigasi → Verifikasi Closed</span>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
			<!-- Stage 1: Temuan & Insiden Masuk -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">1. TEMUAN & INSIDEN</span>
					<span class="material-symbols-outlined text-blue-500 text-base">add_alert</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{pipeline.stage1_reported.count} Kasus
				</p>
				<p class="text-[11px] font-bold text-blue-600 mt-0.5 font-mono">100% Tercatat</p>
				<p class="text-[10px] text-slate-400 mt-1">Laporan masuk dari armada & pool</p>
			</div>

			<!-- Stage 2: Tanggap Lapangan -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">2. TANGGAP LAPANGAN</span>
					<span class="material-symbols-outlined text-amber-500 text-base">emergency</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{pipeline.stage2_response.count} Respons
				</p>
				<p class="text-[11px] font-bold text-amber-600 mt-0.5 font-mono">Tindakan Cepat</p>
				<p class="text-[10px] text-slate-400 mt-1">Isolasi area & penanganan pertama</p>
			</div>

			<!-- Stage 3: Investigasi & CAR/CAPA -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">3. INVESTIGASI & CAR</span>
					<span class="material-symbols-outlined text-purple-500 text-base">troubleshoot</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{pipeline.stage3_investigation.count} Tindakan
				</p>
				<p class="text-[11px] font-bold text-purple-600 mt-0.5 font-mono">Analisis Akar Masalah</p>
				<p class="text-[10px] text-slate-400 mt-1">Penerbitan perbaikan korektif</p>
			</div>

			<!-- Stage 4: Selesai & Terverifikasi -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">4. CLOSED OUT & AUDIT</span>
					<span class="material-symbols-outlined text-emerald-500 text-base">check_circle</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{pipeline.stage4_closed.count} Selesai
				</p>
				<p class="text-[11px] font-bold text-emerald-600 mt-0.5 font-mono">Terverifikasi Tuntas</p>
				<p class="text-[10px] text-slate-400 mt-1">Audit kepatuhan & evaluasi K3</p>
			</div>
		</div>
	</div>

	<!-- ZONA 3: STRATEGIC SAFETY ANALYTICS (12-COLUMN BALANCED GRID) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- 7 Kolom Kiri: Tren Keselamatan Kerja 6 Bulan (Grafik Batang) -->
		<div class="lg:col-span-7 p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-2">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-orange-600">bar_chart</span>
						<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Tren Kinerja Keselamatan (Insiden vs Proaktif)</h3>
					</div>
					<div class="flex items-center gap-3 text-[11px]">
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block"></span>
							<span class="text-slate-400 font-medium">Insiden (Lagging)</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
							<span class="text-slate-400 font-medium">Observasi (Leading)</span>
						</div>
					</div>
				</div>
				<p class="text-xs text-on-surface-variant font-medium mb-6">
					Perbandingan jumlah temuan proaktif pencegahan kecelakaan terhadap kejadian insiden riil
				</p>

				<!-- Grafik Batang CSS/SVG -->
				<div class="h-44 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
					{#each safetyTrend as item, idx}
						{@const isSelected = selectedMonthIdx === idx}
						<button
							type="button"
							onclick={() => (selectedMonthIdx = selectedMonthIdx === idx ? null : idx)}
							class="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
						>
							<!-- Tooltip Hover/Select -->
							<div
								class="absolute -top-12 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-[10px] font-mono whitespace-nowrap shadow-lg pointer-events-none transition-all z-20 {isSelected
									? 'opacity-100 scale-100'
									: 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'}"
							>
								<p class="font-bold text-amber-400">{item.period}</p>
								<p class="text-rose-300">Insiden: {item.incidents} kasus</p>
								<p class="text-emerald-300">Proaktif: {item.proactive} observasi</p>
							</div>

							<!-- Multi-Bar Container -->
							<div class="w-full flex items-end justify-center gap-1.5 h-32">
								<!-- Bar 1: Incidents (Rose) -->
								<div
									class="w-1/3 rounded-t-md bg-rose-500 transition-all duration-300 group-hover:brightness-110"
									style="height: {Math.max(item.incidentsPct, 4)}%"
								></div>
								<!-- Bar 2: Proactive (Emerald) -->
								<div
									class="w-1/3 rounded-t-md bg-emerald-500 transition-all duration-300 group-hover:brightness-110"
									style="height: {Math.max(item.proactivePct, 4)}%"
								></div>
							</div>

							<!-- Month Label -->
							<span class="text-[10px] font-mono font-bold mt-2 text-on-surface-variant group-hover:text-orange-600">
								{item.month}
							</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="mt-4 pt-2 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Target: Mengutamakan rasio laporan leading untuk mencegah kecelakaan fatal</span>
				<a href="/qhse/inspections" class="font-bold text-orange-600 hover:underline">
					Buka Inspeksi K3 →
				</a>
			</div>
		</div>

		<!-- 5 Kolom Kanan: Distribusi Tingkat Keparahan Risiko (Risk Severity Matrix) -->
		<div class="lg:col-span-5 p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-2">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-600">pie_chart</span>
						<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Tingkat Keparahan Risiko</h3>
					</div>
					<span class="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 font-mono font-bold text-[10px]">
						{riskBreakdown.total} Temuan Kasus
					</span>
				</div>
				<p class="text-xs text-on-surface-variant font-medium mb-4">
					Distribusi profil risiko K3 operasional armada dan workshop
				</p>

				<!-- Stacked Progress Bar Tingkat Risiko -->
				<div class="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex mb-5">
					<div style="width: {riskBreakdown.high.pct}%" class="bg-rose-500 transition-all" title="Risiko Tinggi"></div>
					<div style="width: {riskBreakdown.medium.pct}%" class="bg-amber-400 transition-all" title="Risiko Sedang"></div>
					<div style="width: {riskBreakdown.low.pct}%" class="bg-emerald-500 transition-all" title="Risiko Rendah"></div>
				</div>

				<!-- 3 Risk Buckets -->
				<div class="space-y-2.5">
					<!-- Bucket 1: High Risk -->
					<div class="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50">
						<div class="flex items-center gap-2.5">
							<span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
							<div>
								<p class="text-xs font-bold text-rose-600">Tinggi (High / Fatal Potential)</p>
								<p class="text-[10px] text-slate-400 font-mono">Memerlukan mitigasi &amp; isolasi segera</p>
							</div>
						</div>
						<div class="text-right">
							<p class="text-xs font-black font-mono text-rose-600">{riskBreakdown.high.count} Kasus</p>
							<p class="text-[10px] text-slate-400 font-mono">{riskBreakdown.high.pct}%</p>
						</div>
					</div>

					<!-- Bucket 2: Medium Risk -->
					<div class="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50">
						<div class="flex items-center gap-2.5">
							<span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
							<div>
								<p class="text-xs font-bold text-amber-600">Sedang (Medium / Minor Damage)</p>
								<p class="text-[10px] text-slate-400 font-mono">Kerusakan ringan atau tumpahan oli</p>
							</div>
						</div>
						<div class="text-right">
							<p class="text-xs font-black font-mono text-amber-600">{riskBreakdown.medium.count} Kasus</p>
							<p class="text-[10px] text-slate-400 font-mono">{riskBreakdown.medium.pct}%</p>
						</div>
					</div>

					<!-- Bucket 3: Low Risk -->
					<div class="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50">
						<div class="flex items-center gap-2.5">
							<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
							<div>
								<p class="text-xs font-bold text-emerald-600">Rendah (Low / Safe Environment)</p>
								<p class="text-[10px] text-slate-400 font-mono">Pencegahan dan pemeliharaan fasilitas</p>
							</div>
						</div>
						<div class="text-right">
							<p class="text-xs font-black font-mono text-emerald-600">{riskBreakdown.low.count} Kasus</p>
							<p class="text-[10px] text-slate-400 font-mono">{riskBreakdown.low.pct}%</p>
						</div>
					</div>
				</div>
			</div>

			<div class="mt-4 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Total kerugian insiden: <strong class="text-rose-600">{formatRupiah(metrics.lagging.totalLoss)}</strong></span>
				<a href="/qhse/incidents" class="font-bold text-orange-600 hover:underline">
					Evaluasi CAPA →
				</a>
			</div>
		</div>
	</div>

	<!-- ZONA 4: OPERATIONAL LOG & FEEDS (2-COLUMN BALANCED GRID WITH TAB SWITCHERS) -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Kolom Kiri: Insiden Lapangan (Lagging) vs Keluhan Pelanggan -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Segmented Switcher -->
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						{#if activeLeftTab === 'incidents'}
							<span class="material-symbols-outlined text-rose-500 text-xl">report_problem</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Insiden &amp; Pelanggaran (Lagging)</h3>
						{:else}
							<span class="material-symbols-outlined text-amber-500 text-xl">sentiment_dissatisfied</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Keluhan Mutu Pelanggan (QMS)</h3>
						{/if}
					</div>

					<!-- Segmented Switcher -->
					<div class="inline-flex items-center p-0.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70">
						<button
							type="button"
							onclick={() => (activeLeftTab = 'incidents')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeLeftTab === 'incidents'
								? 'bg-rose-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Insiden ({recentIncidents.length})
						</button>
						<button
							type="button"
							onclick={() => (activeLeftTab = 'complaints')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeLeftTab === 'complaints'
								? 'bg-amber-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Keluhan ({recentComplaints.length})
						</button>
					</div>
				</div>

				<!-- TAB 1: INCIDENTS -->
				{#if activeLeftTab === 'incidents'}
					<div class="space-y-2.5">
						{#each recentIncidents as inc}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-rose-500/10 text-rose-600">
										<span class="material-symbols-outlined text-base">emergency</span>
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-xs font-bold text-on-surface truncate">{inc.incident_number}</span>
											<span class="text-[10px] text-slate-400 font-mono">({formatDate(inc.incident_date)})</span>
										</div>
										<p class="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
											{inc.incident_type}: {inc.description}
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border {getSeverityBadge(inc.severity)}">
										{inc.severity}
									</span>
									<p class="text-[10px] font-mono font-bold text-slate-400 mt-0.5">
										{inc.location}
									</p>
								</div>
							</div>
						{/each}

						{#if recentIncidents.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada data insiden tercatat.</p>
						{/if}
					</div>

				<!-- TAB 2: COMPLAINTS -->
				{:else}
					<div class="space-y-2.5">
						{#each recentComplaints as comp}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-amber-500/10 text-amber-600">
										<span class="material-symbols-outlined text-base">feedback</span>
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-xs font-bold text-on-surface truncate">{comp.complaint_number}</span>
											<span class="text-[10px] text-slate-400 font-mono">({formatDate(comp.date)})</span>
										</div>
										<p class="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
											{comp.customer_name}: {comp.description}
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border {comp.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}">
										{comp.status}
									</span>
									<p class="text-[10px] font-mono text-slate-400 mt-0.5">
										{comp.issue_category}
									</p>
								</div>
							</div>
						{/each}

						{#if recentComplaints.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada keluhan mutu pelanggan.</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Action -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Seluruh catatan investigasi insiden dan keluhan</span>
				<a href="/qhse/incidents" class="font-bold text-orange-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Semua Insiden</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>

		<!-- Kolom Kanan: Observasi Proaktif (Leading) vs Safety Briefing -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Segmented Switcher -->
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						{#if activeRightTab === 'proactive'}
							<span class="material-symbols-outlined text-emerald-500 text-xl">visibility</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Temuan Proaktif &amp; Near-Miss</h3>
						{:else}
							<span class="material-symbols-outlined text-blue-500 text-xl">groups</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Safety Briefing &amp; Toolbox</h3>
						{/if}
					</div>

					<!-- Segmented Switcher -->
					<div class="inline-flex items-center p-0.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70">
						<button
							type="button"
							onclick={() => (activeRightTab = 'proactive')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeRightTab === 'proactive'
								? 'bg-emerald-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Temuan ({recentProactive.length})
						</button>
						<button
							type="button"
							onclick={() => (activeRightTab = 'briefings')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeRightTab === 'briefings'
								? 'bg-blue-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Briefing ({recentBriefings.length})
						</button>
					</div>
				</div>

				<!-- TAB 1: PROACTIVE REPORTS -->
				{#if activeRightTab === 'proactive'}
					<div class="space-y-2.5">
						{#each recentProactive as rep}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-emerald-500/10 text-emerald-600">
										<span class="material-symbols-outlined text-base">fact_check</span>
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-xs font-bold text-on-surface truncate">{rep.report_number}</span>
											<span class="text-[10px] text-slate-400 font-mono">({formatDate(rep.date)})</span>
										</div>
										<p class="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
											{rep.finding_description}
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border {getSeverityBadge(rep.risk_level)}">
										{rep.risk_level}
									</span>
									<p class="text-[10px] font-mono text-slate-400 mt-0.5">
										{rep.location}
									</p>
								</div>
							</div>
						{/each}

						{#if recentProactive.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada temuan proaktif tercatat.</p>
						{/if}
					</div>

				<!-- TAB 2: BRIEFINGS -->
				{:else}
					<div class="space-y-2.5">
						{#each recentBriefings as b}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-blue-500/10 text-blue-600">
										<span class="material-symbols-outlined text-base">co_present</span>
									</div>
									<div class="min-w-0">
										<p class="text-xs font-bold text-on-surface truncate">{b.topic}</p>
										<p class="text-[10px] text-slate-400 font-mono mt-0.5">
											{b.leader_name} · Lokasi: {b.location}
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 font-mono">
										{b.participant_count} Peserta
									</span>
									<p class="text-[10px] font-mono text-slate-400 mt-0.5">
										{formatDate(b.date)}
									</p>
								</div>
							</div>
						{/each}

						{#if recentBriefings.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada sesi briefing tercatat.</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Action -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Pengawasan inspeksi harian dan sosialisasi K3</span>
				<a href="/qhse/inspections" class="font-bold text-emerald-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Inspeksi</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>
	</div>
</div>
