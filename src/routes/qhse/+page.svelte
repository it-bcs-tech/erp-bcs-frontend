<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let metrics = $derived(data.metrics);
	let recentIncidents = $derived(data.recentIncidents || []);
	let recentProactive = $derived(data.recentProactive || []);
</script>

<svelte:head>
	<title>Overview & Safety KPI | QHSE ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-orange-600 dark:text-orange-400 text-2xl">verified_user</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">QHSE & Safety Control Tower</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pemantauan terpadu Indikator K3 (Lagging vs Leading), Zero Accident, Manajemen APD, dan Sistem Mutu ISO
			</p>
		</div>

		<div class="flex items-center gap-3">
			<a
				href="/qhse/incidents"
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors"
			>
				<span class="material-symbols-outlined text-lg">add_alert</span>
				<span>Lapor Insiden / Near-Miss</span>
			</a>
		</div>
	</div>

	<!-- Top Highlights: Zero Accident & Safe Man-Hours (Bento Banner) -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Safe Man-Hours Card -->
		<div class="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md relative overflow-hidden">
			<div class="absolute right-3 -bottom-3 text-white/10">
				<span class="material-symbols-outlined text-9xl">shield</span>
			</div>
			<div class="relative z-10">
				<div class="flex items-center gap-2 text-emerald-100 text-xs font-bold uppercase tracking-wider">
					<span class="material-symbols-outlined text-base">timer</span>
					<span>Jam Kerja Selamat (Safe Man-Hours)</span>
				</div>
				<h3 class="text-3xl font-black mt-2 tracking-tight">
					{new Intl.NumberFormat('id-ID').format(metrics.safeManHours)} <span class="text-base font-normal text-emerald-100">Jam</span>
				</h3>
				<p class="text-xs text-emerald-100/80 mt-2 font-medium">
					Akumulasi jam kerja {metrics.totalEmployees} karyawan aktif & armada logistik
				</p>
			</div>
		</div>

		<!-- Zero Accident Tracker -->
		<div class="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md relative overflow-hidden">
			<div class="absolute right-3 -bottom-3 text-white/10">
				<span class="material-symbols-outlined text-9xl">health_and_safety</span>
			</div>
			<div class="relative z-10">
				<div class="flex items-center gap-2 text-blue-100 text-xs font-bold uppercase tracking-wider">
					<span class="material-symbols-outlined text-base">verified</span>
					<span>Zero Accident Target</span>
				</div>
				<h3 class="text-3xl font-black mt-2 tracking-tight">
					{metrics.zeroAccidentDays} <span class="text-base font-normal text-blue-100">Hari Berturut-turut</span>
				</h3>
				<p class="text-xs text-blue-100/80 mt-2 font-medium">
					Tanpa insiden kecelakaan fatal (*Zero Lost Time Injury*)
				</p>
			</div>
		</div>

		<!-- Open Actions / CAPA Status -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status Tindak Lanjut (CAPA & CAR)</p>
					<div class="flex items-baseline gap-2 mt-1">
						<span class="text-2xl font-black text-amber-600">{metrics.lagging.openCar + metrics.leading.openCapa}</span>
						<span class="text-xs text-on-surface-variant font-medium">Tindakan Terbuka</span>
					</div>
				</div>
				<div class="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">pending_actions</span>
				</div>
			</div>
			<div class="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-xs text-on-surface-variant font-medium">
				<span class="inline-flex items-center gap-1 font-bold text-rose-600">
					<span class="w-2 h-2 rounded-full bg-rose-500"></span> {metrics.lagging.openCar} CAR Insiden
				</span>
				<span>•</span>
				<span class="inline-flex items-center gap-1 font-bold text-amber-600">
					<span class="w-2 h-2 rounded-full bg-amber-500"></span> {metrics.leading.openCapa} CAPA Proaktif
				</span>
			</div>
		</div>
	</div>

	<!-- 4 Pillar KPI Scorecard -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- #1. Lagging Indicators Card -->
		<a
			href="/qhse/incidents"
			class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs hover:border-rose-400 dark:hover:border-rose-600 transition-all group cursor-pointer block"
		>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">
					<span class="material-symbols-outlined text-lg">emergency</span>
					<span>#1. Lagging Indicator</span>
				</div>
				<span class="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
			</div>
			<div class="mt-3 space-y-1.5">
				<div class="flex justify-between text-xs">
					<span class="text-on-surface-variant">Total Insiden / Accident:</span>
					<span class="font-bold text-on-surface">{metrics.lagging.totalIncidents}</span>
				</div>
				<div class="flex justify-between text-xs">
					<span class="text-on-surface-variant">Kerugian Finansial:</span>
					<span class="font-bold text-rose-600">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(metrics.lagging.totalLoss || 0)}</span>
				</div>
				<div class="flex justify-between text-xs">
					<span class="text-on-surface-variant">Open CAR (Tindak Lanjut):</span>
					<span class="font-bold text-amber-600">{metrics.lagging.openCar}</span>
				</div>
			</div>
		</a>

		<!-- #2. Leading Indicators Card -->
		<a
			href="/qhse/inspections"
			class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-600 transition-all group cursor-pointer block"
		>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
					<span class="material-symbols-outlined text-lg">fact_check</span>
					<span>#2. Leading Indicator</span>
				</div>
				<span class="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
			</div>
			<div class="mt-3 space-y-1.5">
				<div class="flex justify-between text-xs">
					<span class="text-on-surface-variant">Laporan Near-Miss:</span>
					<span class="font-bold text-on-surface">{metrics.leading.nearmiss}</span>
				</div>
				<div class="flex justify-between text-xs">
					<span class="text-on-surface-variant">Safety Patrol & SOT:</span>
					<span class="font-bold text-on-surface">{metrics.leading.patrolAndSot}</span>
				</div>
				<div class="flex justify-between text-xs">
					<span class="text-on-surface-variant">Open CAPA Register:</span>
					<span class="font-bold text-amber-600">{metrics.leading.openCapa}</span>
				</div>
			</div>
		</a>

		<!-- #3. Enablement & APD Card -->
		<a
			href="/qhse/safety-enablement"
			class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all group cursor-pointer block"
		>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
					<span class="material-symbols-outlined text-lg">health_and_safety</span>
					<span>#3. Briefing & APD</span>
				</div>
				<span class="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
			</div>
			<div class="mt-3 space-y-1.5">
				<div class="flex justify-between text-xs">
					<span class="text-on-surface-variant">Toolbox / FGD Selesai:</span>
					<span class="font-bold text-on-surface">{metrics.enablement.totalBriefings}</span>
				</div>
				<div class="flex justify-between text-xs">
					<span class="text-on-surface-variant">Peserta Terdidik K3:</span>
					<span class="font-bold text-on-surface">{metrics.enablement.totalParticipants} Orang</span>
				</div>
				<div class="flex justify-between text-xs">
					<span class="text-on-surface-variant">Distribusi APD Tercatat:</span>
					<span class="font-bold text-emerald-600">{metrics.enablement.apdDistributed} Item</span>
				</div>
			</div>
		</a>

		<!-- #4. Quality Management System Card -->
		<a
			href="/qhse/quality"
			class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-all group cursor-pointer block"
		>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
					<span class="material-symbols-outlined text-lg">policy</span>
					<span>#4. SOP & Quality</span>
				</div>
				<span class="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
			</div>
			<div class="mt-3 space-y-1.5">
				<div class="flex justify-between text-xs">
					<span class="text-on-surface-variant">SOP & WI K3 Aktif:</span>
					<span class="font-bold text-on-surface">{metrics.management.activeSops} Dokumen</span>
				</div>
				<div class="flex justify-between text-xs">
					<span class="text-on-surface-variant">Customer Complaint:</span>
					<span class="font-bold text-amber-600">{metrics.management.openComplaints} Open</span>
				</div>
				<div class="flex justify-between text-xs">
					<span class="text-on-surface-variant">Standar Mutu:</span>
					<span class="font-bold text-indigo-600">ISO 45001 & 9001</span>
				</div>
			</div>
		</a>
	</div>

	<!-- Split Feeds: Recent Incidents & Proactive Observations -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Left: Recent Incidents (Lagging Feed) -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden">
			<div class="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-rose-500 text-lg">report_problem</span>
					<h3 class="text-sm font-bold text-on-surface">Insiden & Pelanggaran Terakhir (Lagging)</h3>
				</div>
				<a href="/qhse/incidents" class="text-xs font-bold text-orange-600 hover:underline">Lihat Semua &rarr;</a>
			</div>
			<div class="p-4 divide-y divide-slate-100 dark:divide-slate-800/80">
				{#if recentIncidents.length === 0}
					<div class="py-8 text-center text-xs text-on-surface-variant">Belum ada data insiden tercatat.</div>
				{:else}
					{#each recentIncidents as inc}
						<div class="py-3 first:pt-0 last:pb-0 space-y-1.5">
							<div class="flex items-center justify-between">
								<span class="text-xs font-mono font-bold text-orange-600">{inc.incident_number}</span>
								<span class="px-2 py-0.5 rounded-full text-[10px] font-bold {inc.severity === 'High' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : inc.severity === 'Medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}">
									{inc.severity}
								</span>
							</div>
							<p class="text-xs font-bold text-on-surface">{inc.incident_type}: {inc.description}</p>
							<div class="flex items-center justify-between text-[11px] text-on-surface-variant">
								<span>📍 {inc.location}</span>
								<span>{new Date(inc.incident_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Right: Recent Proactive Observations (Leading Feed) -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden">
			<div class="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-500 text-lg">visibility</span>
					<h3 class="text-sm font-bold text-on-surface">Temuan Proaktif & Near-Miss (Leading)</h3>
				</div>
				<a href="/qhse/inspections" class="text-xs font-bold text-orange-600 hover:underline">Lihat Semua &rarr;</a>
			</div>
			<div class="p-4 divide-y divide-slate-100 dark:divide-slate-800/80">
				{#if recentProactive.length === 0}
					<div class="py-8 text-center text-xs text-on-surface-variant">Belum ada temuan proaktif tercatat.</div>
				{:else}
					{#each recentProactive as rep}
						<div class="py-3 first:pt-0 last:pb-0 space-y-1.5">
							<div class="flex items-center justify-between">
								<span class="text-xs font-mono font-bold text-emerald-600">{rep.report_number}</span>
								<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
									{rep.report_type.replace('_', ' ')}
								</span>
							</div>
							<p class="text-xs font-bold text-on-surface">{rep.finding_description}</p>
							<div class="flex items-center justify-between text-[11px] text-on-surface-variant">
								<span>Observer: {rep.observer_name} ({rep.location})</span>
								<span class="font-bold {rep.status === 'VERIFIED_CLOSED' ? 'text-emerald-600' : 'text-amber-600'}">{rep.status}</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>
