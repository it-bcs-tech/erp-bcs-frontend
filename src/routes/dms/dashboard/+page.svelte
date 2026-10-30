<script lang="ts">
	import { formatDateId, getStatusInfo, getEntityTypeInfo } from '$lib/utils/dms';
	import DmsSecureViewer from '$lib/components/DmsSecureViewer.svelte';

	let { data } = $props();
	let stats = $derived(data.stats);
	let pipeline = $derived(data.pipeline);
	let upcomingExpiringDocs = $derived(data.upcomingExpiringDocs || []);
	let expiredDocs = $derived(data.expiredDocs || []);
	let borrowedDocs = $derived(data.borrowedDocs || []);
	let topDocTypes = $derived(data.topDocTypes || []);
	let expiryHorizon = $derived(data.expiryHorizon || []);
	let entityHealth = $derived(data.entityHealth || {});

	// Tab states
	let activeDocTab = $state<'upcoming' | 'expired'>('upcoming');
	let activeRightTab = $state<'types' | 'borrowed'>('types');
	let horizonRange = $state<'6' | '12'>('12');

	let displayedHorizon = $derived(
		expiryHorizon.slice(0, horizonRange === '6' ? 6 : 12)
	);
	let maxDisplayedTotal = $derived(
		Math.max(1, ...displayedHorizon.map((m: any) => m.total || 0))
	);

	let isViewerOpen = $state(false);
	let selectedDoc = $state<any>(null);

	function openViewer(doc: any) {
		selectedDoc = doc;
		isViewerOpen = true;
	}
</script>

<svelte:head>
	<title>DMS Command Center | ERP BCS</title>
</svelte:head>

<div class="space-y-6 pb-8">
	<!-- HEADER SECTION -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">folder_open</span>
				</div>
				<div>
					<h1 class="text-2xl font-black text-on-surface tracking-tight">DMS Command Center</h1>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">
						Pusat pengawasan legalitas logistik, gerbang masa berlaku berkas (H-60, H-30, H-7), dan kepatuhan audit perusahaan
					</p>
				</div>
			</div>
		</div>

		<!-- Action CTAs -->
		<div class="flex flex-wrap items-center gap-2.5">
			<a
				href="/dms/transactions/documents"
				class="px-3.5 py-2 rounded-xl bg-surface border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-on-surface hover:bg-surface-container transition-all flex items-center gap-1.5 shadow-xs"
			>
				<span class="material-symbols-outlined text-base text-indigo-600">folder_shared</span>
				<span>Direktori Dokumen</span>
			</a>
			<a
				href="/dms/master/types"
				class="px-3.5 py-2 rounded-xl bg-surface border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-on-surface hover:bg-surface-container transition-all flex items-center gap-1.5 shadow-xs"
			>
				<span class="material-symbols-outlined text-base text-amber-600">category</span>
				<span>Tipe Dokumen</span>
			</a>
			<a
				href="/dms/transactions/documents/create"
				class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">upload_file</span>
				<span>Upload Dokumen</span>
			</a>
		</div>
	</header>

	<!-- ZONA 1: 4 EXECUTIVE BENTO KPI CARDS -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- 1. Total Dokumen Terdaftar -->
		<a
			href="/dms/transactions/documents"
			class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between hover:border-indigo-500/40 transition-colors"
		>
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Dokumen</span>
					<h2 class="text-2xl font-black text-indigo-600 mt-1 font-mono tracking-tight">
						{stats.total.toLocaleString('id-ID')}
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">folder_open</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">
					<strong class="text-emerald-600 font-bold">{stats.valid.toLocaleString('id-ID')}</strong> Valid & Aktif
				</span>
				<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold font-mono text-[10px]">
					{Math.round((stats.valid / stats.total) * 100)}% Aman
				</span>
			</div>
		</a>

		<!-- 2. Gate Peringatan Kritis (H-60 s/d H-7) -->
		<a
			href="/dms/transactions/documents?gate=WARNING_60"
			class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between hover:border-amber-500/40 transition-colors"
		>
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Gate Peringatan</span>
					<h2 class="text-2xl font-black text-amber-600 mt-1 font-mono tracking-tight">
						{(stats.warning60 + stats.critical30 + stats.urgent7).toLocaleString('id-ID')}
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">schedule</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">
					H-7: <strong class="text-rose-600">{stats.urgent7}</strong> · H-30: <strong class="text-orange-600">{stats.critical30}</strong>
				</span>
				<span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold font-mono text-[10px]">
					H-60: {stats.warning60}
				</span>
			</div>
		</a>

		<!-- 3. Dokumen Kadaluarsa (Expired Alert) -->
		<a
			href="/dms/transactions/documents?gate=EXPIRED"
			class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between hover:border-rose-500/40 transition-colors"
		>
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Dokumen Kadaluarsa</span>
					<h2 class="text-2xl font-black text-rose-600 mt-1 font-mono tracking-tight">
						{stats.expired.toLocaleString('id-ID')}
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">error</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">Masa berlaku habis</span>
				<span class="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold font-mono text-[10px]">
					Perlu Perpanjangan
				</span>
			</div>
		</a>

		<!-- 4. Skor Kepatuhan Legalitas -->
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Kepatuhan Legalitas</span>
					<h2 class="text-2xl font-black text-emerald-600 mt-1 font-mono tracking-tight">
						{stats.overallComplianceScore}%
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">health_and_safety</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">Fisik Dipinjam: <strong class="text-on-surface">{stats.borrowedCount}</strong></span>
				<span class="text-emerald-600 font-bold">Status Aman</span>
			</div>
		</div>
	</div>

	<!-- ZONA 2: CONTINUOUS DOCUMENT LIFECYCLE PIPELINE STRIP -->
	<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-indigo-600 text-lg">timeline</span>
				<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Siklus Hidup Dokumen & Kepatuhan Legalitas</h3>
			</div>
			<span class="text-[11px] font-mono text-slate-400">Registrasi → Validasi → Peringatan → Perpanjangan</span>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
			<!-- Stage 1: Perekaman Arsip -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">1. PEREKAMAN ARSIP</span>
					<span class="material-symbols-outlined text-blue-500 text-base">upload_file</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{pipeline.stage1_recorded.count.toLocaleString('id-ID')} Dokumen
				</p>
				<p class="text-[11px] font-bold text-blue-600 mt-0.5 font-mono">100% Terindeks</p>
				<p class="text-[10px] text-slate-400 mt-1">Registrasi digital & fisik lemari rak</p>
			</div>

			<!-- Stage 2: Aktif & Terlindungi -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">2. AKTIF & TERLINDUNGI</span>
					<span class="material-symbols-outlined text-emerald-500 text-base">verified</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{pipeline.stage2_valid.count.toLocaleString('id-ID')} Dokumen
				</p>
				<p class="text-[11px] font-bold text-emerald-600 mt-0.5 font-mono">&gt; 60 Hari Aman</p>
				<p class="text-[10px] text-slate-400 mt-1">Masa berlaku aktif tanpa risiko</p>
			</div>

			<!-- Stage 3: Gate Peringatan -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">3. GATE PERINGATAN</span>
					<span class="material-symbols-outlined text-amber-500 text-base">warning</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{pipeline.stage3_warning.count.toLocaleString('id-ID')} Berkas
				</p>
				<p class="text-[11px] font-bold text-amber-600 mt-0.5 font-mono">H-60 s/d H-7</p>
				<p class="text-[10px] text-slate-400 mt-1">Pemberitahuan bertahap PIC</p>
			</div>

			<!-- Stage 4: Perpanjangan / Review -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">4. PERPANJANGAN / REVIEW</span>
					<span class="material-symbols-outlined text-rose-500 text-base">autorenew</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{pipeline.stage4_expired.count.toLocaleString('id-ID')} Berkas
				</p>
				<p class="text-[11px] font-bold text-rose-600 mt-0.5 font-mono">Perlu Tindakan</p>
				<p class="text-[10px] text-slate-400 mt-1">Perpanjangan STNK/KIR/PKS & review</p>
			</div>
		</div>
	</div>

	<!-- ZONA 3: STRATEGIC VISUAL ANALYTICS (12-COLUMN BALANCED GRID) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- 7 Kolom Kiri: Proyeksi Dokumen Jatuh Tempo (Expiry Horizon Bar Chart) -->
		<div class="lg:col-span-7 p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-indigo-600">bar_chart</span>
						<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Proyeksi Dokumen Jatuh Tempo (Expiry Horizon)</h3>
					</div>

					<!-- Range Toggle -->
					<div class="inline-flex items-center p-0.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 text-xs">
						<button
							type="button"
							onclick={() => (horizonRange = '6')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {horizonRange === '6'
								? 'bg-indigo-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							6 Bulan
						</button>
						<button
							type="button"
							onclick={() => (horizonRange = '12')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {horizonRange === '12'
								? 'bg-indigo-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							12 Bulan
						</button>
					</div>
				</div>

				<div class="flex flex-wrap items-center justify-between gap-4 text-xs mb-4">
					<div class="flex items-center gap-3">
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block"></span>
							<span class="text-slate-400 font-medium">Armada</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block"></span>
							<span class="text-slate-400 font-medium">Driver</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block"></span>
							<span class="text-slate-400 font-medium">Kontrak</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-sm bg-violet-500 inline-block"></span>
							<span class="text-slate-400 font-medium">Korporat</span>
						</div>
					</div>
					<span class="text-[10px] text-slate-400">💡 Klik batang untuk filter dokumen</span>
				</div>

				<!-- Chart Canvas -->
				<div class="h-44 flex items-end justify-between gap-2.5 sm:gap-3.5 pt-6 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
					{#each displayedHorizon as mItem}
						{@const heightPercent = mItem.total > 0 ? Math.max(12, Math.round((mItem.total / maxDisplayedTotal) * 100)) : 4}
						{@const fleetHeight = mItem.total > 0 ? Math.round((mItem.fleet / mItem.total) * 100) : 0}
						{@const driverHeight = mItem.total > 0 ? Math.round((mItem.driver / mItem.total) * 100) : 0}
						{@const contractsHeight = mItem.total > 0 ? Math.round((mItem.contracts / mItem.total) * 100) : 0}
						{@const corporateHeight = mItem.total > 0 ? Math.round((mItem.corporate / mItem.total) * 100) : 0}

						<a
							href="/dms/transactions/documents?expiry_month={mItem.key}"
							class="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
						>
							<!-- Floating Tooltip -->
							<div
								class="absolute -top-28 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-[10px] font-mono whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-30 space-y-0.5 border border-slate-700"
							>
								<p class="font-bold text-amber-400">{mItem.fullName} ({mItem.total} Total)</p>
								<p class="text-sky-300">Armada: {mItem.fleet} dok</p>
								<p class="text-indigo-300">Driver: {mItem.driver} dok</p>
								<p class="text-amber-300">Kontrak: {mItem.contracts} dok</p>
								<p class="text-violet-300">Korporat: {mItem.corporate} dok</p>
							</div>

							<!-- Total Label Above Bar -->
							<span class="text-[10px] font-mono font-bold mb-1 {mItem.total > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}">
								{mItem.total}
							</span>

							<!-- Stacked Bar -->
							{#if mItem.total > 0}
								<div
									class="w-full max-w-[28px] rounded-t-md overflow-hidden flex flex-col justify-end group-hover:ring-2 group-hover:ring-indigo-500/50 transition-all duration-300 shadow-xs"
									style="height: {heightPercent}%;"
								>
									{#if mItem.corporate > 0}
										<div class="w-full bg-violet-500" style="height: {corporateHeight}%;"></div>
									{/if}
									{#if mItem.contracts > 0}
										<div class="w-full bg-amber-500" style="height: {contractsHeight}%;"></div>
									{/if}
									{#if mItem.driver > 0}
										<div class="w-full bg-indigo-500" style="height: {driverHeight}%;"></div>
									{/if}
									{#if mItem.fleet > 0}
										<div class="w-full bg-sky-500" style="height: {fleetHeight}%;"></div>
									{/if}
								</div>
							{:else}
								<div class="w-full max-w-[28px] h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
							{/if}

							<!-- Month Label Bottom -->
							<span class="text-[10px] font-mono font-bold mt-2 text-on-surface-variant group-hover:text-indigo-600">
								{mItem.label}
							</span>
						</a>
					{/each}
				</div>
			</div>

			<div class="mt-4 pt-2 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Mitigasi beban perpanjangan berkas logistik per bulan</span>
				<a href="/dms/transactions/documents" class="font-bold text-indigo-600 hover:underline">
					Buka Semua Dokumen →
				</a>
			</div>
		</div>

		<!-- 5 Kolom Kanan: Kesehatan Kepatuhan per Entitas (Entity Compliance Health) -->
		<div class="lg:col-span-5 p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-2">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-600">health_and_safety</span>
						<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Kesehatan Kepatuhan per Entitas</h3>
					</div>
					<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-mono font-bold text-[10px]">
						{stats.overallComplianceScore}% Aman
					</span>
				</div>
				<p class="text-xs text-on-surface-variant font-medium mb-4">
					Rasio dokumen valid vs mendekati jatuh tempo dan kadaluarsa per departemen
				</p>

				<!-- Entity Health List -->
				<div class="space-y-3">
					{#each Object.entries(entityHealth) as [catKey, eh]}
						{@const safePct = eh.total > 0 ? Math.round((eh.safe / eh.total) * 100) : 0}
						{@const warnPct = eh.total > 0 ? Math.round(((eh.warning + eh.critical + eh.urgent) / eh.total) * 100) : 0}
						{@const expPct = eh.total > 0 ? Math.round((eh.expired / eh.total) * 100) : 0}
						{@const filterLink = catKey === 'CONTRACTS' ? '/dms/transactions/documents?type=KONTRAK_KERJASAMA' : `/dms/transactions/documents?entity_type=${catKey}`}

						<div class="p-3 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50 space-y-1.5">
							<div class="flex items-center justify-between text-xs">
								<a href={filterLink} class="font-bold text-on-surface hover:text-indigo-600 transition-colors flex items-center gap-1.5">
									<span class="w-2.5 h-2.5 rounded-full {eh.bg}"></span>
									<span>{eh.label}</span>
								</a>
								<div class="flex items-center gap-2">
									<span class="font-mono text-[11px] text-slate-400">
										{eh.safe + eh.warning}/{eh.total}
									</span>
									<span class="px-1.5 py-0.2 rounded text-[10px] font-black font-mono {eh.score >= 80 ? 'bg-emerald-500/10 text-emerald-600' : eh.score >= 50 ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'}">
										{eh.score}%
									</span>
								</div>
							</div>

							<!-- Multi-segment Progress Bar -->
							<div class="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
								{#if safePct > 0}
									<div class="bg-emerald-500 h-full transition-all" style="width: {safePct}%;" title="Aman: {eh.safe}"></div>
								{/if}
								{#if warnPct > 0}
									<div class="bg-amber-400 h-full transition-all" style="width: {warnPct}%;" title="Peringatan: {eh.warning + eh.critical + eh.urgent}"></div>
								{/if}
								{#if expPct > 0}
									<div class="bg-rose-500 h-full transition-all" style="width: {expPct}%;" title="Kadaluarsa: {eh.expired}"></div>
								{/if}
							</div>

							<div class="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
								<span class="text-emerald-600 font-bold">{eh.safe} Aman</span>
								{#if (eh.warning + eh.critical + eh.urgent) > 0}
									<span class="text-amber-600 font-bold">{eh.warning + eh.critical + eh.urgent} Waspada</span>
								{/if}
								<span class="{eh.expired > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}">{eh.expired} Expired</span>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="mt-4 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Audit kepatuhan legalitas logistik</span>
				<a href="/dms/transactions/documents" class="font-bold text-emerald-600 hover:underline">
					Kirim Notifikasi PIC →
				</a>
			</div>
		</div>
	</div>

	<!-- ZONA 4: OPERATIONAL TRACKING & DOCUMENTS (2-COLUMN BALANCED GRID WITH TAB SWITCHERS) -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Kolom Kiri: Dokumen Perlu Tindakan Segera (Upcoming vs Expired) -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Segmented Switcher -->
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						{#if activeDocTab === 'upcoming'}
							<span class="material-symbols-outlined text-amber-600 text-xl">event_upcoming</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Segera Jatuh Tempo (H ≤ 60)</h3>
						{:else}
							<span class="material-symbols-outlined text-rose-600 text-xl">error</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Dokumen Kadaluarsa Terkini</h3>
						{/if}
					</div>

					<!-- Segmented Switcher -->
					<div class="inline-flex items-center p-0.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70">
						<button
							type="button"
							onclick={() => (activeDocTab = 'upcoming')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeDocTab === 'upcoming'
								? 'bg-amber-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							H ≤ 60 ({upcomingExpiringDocs.length})
						</button>
						<button
							type="button"
							onclick={() => (activeDocTab = 'expired')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeDocTab === 'expired'
								? 'bg-rose-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Expired ({expiredDocs.length})
						</button>
					</div>
				</div>

				<!-- TAB 1: UPCOMING EXPIRING DOCS -->
				{#if activeDocTab === 'upcoming'}
					<div class="space-y-2.5">
						{#each upcomingExpiringDocs as doc}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 {doc.gate_level === 'URGENT_7' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'}">
										<span class="material-symbols-outlined text-base">
											{doc.gate_level === 'URGENT_7' ? 'warning' : 'schedule'}
										</span>
									</div>
									<div class="min-w-0">
										<a href="/dms/transactions/documents/{doc.id}" class="text-xs font-bold text-on-surface truncate block hover:text-indigo-600">
											{doc.title}
										</a>
										<p class="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
											No: {doc.doc_number || '-'} · Entitas: <strong class="text-on-surface">{doc.entity_name}</strong>
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<p class="text-xs font-black font-mono {doc.gate_level === 'URGENT_7' ? 'text-rose-600' : 'text-amber-600'}">
										H-{doc.days_remaining} Hari
									</p>
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 {doc.gate_level === 'URGENT_7' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}">
										{formatDateId(doc.expiry_date)}
									</span>
								</div>
							</div>
						{/each}

						{#if upcomingExpiringDocs.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Tidak ada dokumen jatuh tempo dalam 60 hari.</p>
						{/if}
					</div>

				<!-- TAB 2: EXPIRED DOCS -->
				{:else}
					<div class="space-y-2.5">
						{#each expiredDocs as doc}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-rose-500/10 text-rose-600">
										<span class="material-symbols-outlined text-base">error</span>
									</div>
									<div class="min-w-0">
										<a href="/dms/transactions/documents/{doc.id}" class="text-xs font-bold text-on-surface truncate block hover:text-rose-600">
											{doc.title}
										</a>
										<p class="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
											No: {doc.doc_number || '-'} · Entitas: <strong class="text-on-surface">{doc.entity_name}</strong>
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<p class="text-xs font-black font-mono text-rose-600">
										+{doc.days_overdue} Hari Terlewat
									</p>
									<a
										href="/dms/transactions/documents/{doc.id}"
										class="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors mt-0.5"
									>
										Perpanjang
									</a>
								</div>
							</div>
						{/each}

						{#if expiredDocs.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Tidak ada dokumen kadaluarsa.</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Action -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Seluruh daftar dokumen peringatan</span>
				<a href="/dms/transactions/documents" class="font-bold text-indigo-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Semua Dokumen</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>

		<!-- Kolom Kanan: Pengawasan Berkas & Sebaran Kategori (Types vs Borrowed) -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Segmented Switcher -->
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						{#if activeRightTab === 'types'}
							<span class="material-symbols-outlined text-indigo-600 text-xl">category</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Kategori & Tipe Dokumen Teratas</h3>
						{:else}
							<span class="material-symbols-outlined text-orange-600 text-xl">inventory_2</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Pelacakan Berkas Fisik Dipinjam</h3>
						{/if}
					</div>

					<!-- Segmented Switcher -->
					<div class="inline-flex items-center p-0.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70">
						<button
							type="button"
							onclick={() => (activeRightTab = 'types')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeRightTab === 'types'
								? 'bg-indigo-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Tipe ({topDocTypes.length})
						</button>
						<button
							type="button"
							onclick={() => (activeRightTab = 'borrowed')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeRightTab === 'borrowed'
								? 'bg-orange-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Dipinjam ({borrowedDocs.length})
						</button>
					</div>
				</div>

				<!-- TAB 1: TOP DOCUMENT TYPES -->
				{#if activeRightTab === 'types'}
					<div class="space-y-2.5">
						{#each topDocTypes as t}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-indigo-500/10 text-indigo-600">
										<span class="material-symbols-outlined text-base">description</span>
									</div>
									<div class="min-w-0">
										<p class="text-xs font-bold text-on-surface truncate">{t.type_name}</p>
										<p class="text-[10px] text-slate-400 font-mono mt-0.5">Klasifikasi Legalitas DMS</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<span class="text-xs font-black font-mono text-indigo-600">
										{t.count.toLocaleString('id-ID')} Berkas
									</span>
								</div>
							</div>
						{/each}
					</div>

				<!-- TAB 2: BORROWED DOCS -->
				{:else}
					<div class="space-y-2.5">
						{#each borrowedDocs as bDoc}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-orange-500/10 text-orange-600">
										<span class="material-symbols-outlined text-base">lock_open</span>
									</div>
									<div class="min-w-0">
										<p class="text-xs font-bold text-on-surface truncate">{bDoc.title}</p>
										<p class="text-[10px] text-slate-400 font-mono mt-0.5">
											No: {bDoc.doc_number || '-'} · Rak: {bDoc.filing_location_code || 'A1'}
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<a
										href="/dms/transactions/documents/{bDoc.id}"
										class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-orange-600 text-white hover:bg-orange-700 transition-colors inline-block"
									>
										Kembalikan
									</a>
								</div>
							</div>
						{/each}

						{#if borrowedDocs.length === 0}
							<div class="p-6 text-center bg-surface rounded-2xl text-on-surface-variant space-y-1">
								<span class="material-symbols-outlined text-3xl text-emerald-500">lock</span>
								<p class="text-xs font-bold text-on-surface">Seluruh Berkas Fisik Berada di Lemari Arsip</p>
								<p class="text-[11px] text-slate-400">Tidak ada peminjaman berkas fisik aktif saat ini.</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Action -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Kelola master tipe & lokasi filing fisik</span>
				<a href="/dms/master/types" class="font-bold text-indigo-600 hover:underline inline-flex items-center gap-1">
					<span>Master Tipe</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>
	</div>
</div>

{#if selectedDoc}
	<DmsSecureViewer
		bind:isOpen={isViewerOpen}
		filePath={selectedDoc.file_path || ''}
		docTitle={selectedDoc.title}
		docNumber={selectedDoc.doc_number || ''}
		userName="Staff ERP BCS"
	/>
{/if}
