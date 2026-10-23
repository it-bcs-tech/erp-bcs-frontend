<script lang="ts">
	import { formatDateId, getStatusInfo, getPhysicalStatusInfo, getEntityTypeInfo } from '$lib/utils/dms';
	import DmsSecureViewer from '$lib/components/DmsSecureViewer.svelte';

	let { data } = $props();
	let stats = $derived(data.stats);
	let upcomingExpiringDocs = $derived(data.upcomingExpiringDocs || []);
	let borrowedDocs = $derived(data.borrowedDocs || []);
	let expiryHorizon = $derived(data.expiryHorizon || []);
	let entityHealth = $derived(data.entityHealth || {});

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
	<title>DMS Dashboard | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-2xl">folder_open</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">DMS Dashboard</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pemantauan kepatuhan legalitas logistik, gerbang masa berlaku (H-60, H-30, H-7), dan pelacakan arsip fisik.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<a
				href="/dms/transactions/documents"
				class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-on-surface hover:bg-surface-container-high text-xs font-bold transition-colors flex items-center gap-1.5"
			>
				<span class="material-symbols-outlined text-lg">folder_shared</span>
				<span>Semua Dokumen</span>
			</a>
			<a
				href="/dms/transactions/documents/create"
				class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs flex items-center gap-2 transition-colors"
			>
				<span class="material-symbols-outlined text-lg">upload_file</span>
				<span>Tambah Dokumen Baru</span>
			</a>
		</div>
	</header>

	<!-- Metric Cards (Bento Expiry Gate) -->
	<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
		<!-- Total Docs -->
		<a
			href="/dms/transactions/documents"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-indigo-400 transition-colors flex flex-col justify-between"
		>
			<div class="flex items-center justify-between">
				<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Dokumen</p>
				<span class="material-symbols-outlined text-indigo-600 text-xl">description</span>
			</div>
			<h3 class="text-2xl font-black text-on-surface mt-2">{stats.total}</h3>
			<p class="text-[10px] text-on-surface-variant mt-1">Seluruh arsip</p>
		</a>

		<!-- Valid Docs -->
		<a
			href="/dms/transactions/documents"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-emerald-400 transition-colors flex flex-col justify-between"
		>
			<div class="flex items-center justify-between">
				<p class="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Aktif & Valid</p>
				<span class="material-symbols-outlined text-emerald-600 text-xl">verified</span>
			</div>
			<h3 class="text-2xl font-black text-emerald-600 mt-2">{stats.valid}</h3>
			<p class="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1">> 60 hari aman</p>
		</a>

		<!-- Warning H-60 -->
		<a
			href="/dms/transactions/documents?gate=WARNING_60"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-amber-400 transition-colors flex flex-col justify-between"
		>
			<div class="flex items-center justify-between">
				<p class="text-[11px] font-bold text-amber-600 uppercase tracking-wider">H-60 Warning</p>
				<span class="material-symbols-outlined text-amber-600 text-xl">schedule</span>
			</div>
			<h3 class="text-2xl font-black text-amber-600 mt-2">{stats.warning60}</h3>
			<p class="text-[10px] text-amber-700 dark:text-amber-400 mt-1">Jatuh tempo 31-60 hari</p>
		</a>

		<!-- Critical H-30 -->
		<a
			href="/dms/transactions/documents?gate=CRITICAL_30"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-orange-400 transition-colors flex flex-col justify-between"
		>
			<div class="flex items-center justify-between">
				<p class="text-[11px] font-bold text-orange-600 uppercase tracking-wider">H-30 Kritis</p>
				<span class="material-symbols-outlined text-orange-600 text-xl">notification_important</span>
			</div>
			<h3 class="text-2xl font-black text-orange-600 mt-2">{stats.critical30}</h3>
			<p class="text-[10px] text-orange-700 dark:text-orange-400 mt-1">Jatuh tempo 8-30 hari</p>
		</a>

		<!-- Urgent H-7 -->
		<a
			href="/dms/transactions/documents?gate=URGENT_7"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-rose-400 transition-colors flex flex-col justify-between {stats.urgent7 > 0 ? 'ring-2 ring-rose-500/30' : ''}"
		>
			<div class="flex items-center justify-between">
				<p class="text-[11px] font-bold text-rose-600 uppercase tracking-wider">H-7 Urgent</p>
				<span class="material-symbols-outlined text-rose-600 text-xl {stats.urgent7 > 0 ? 'animate-pulse' : ''}">warning</span>
			</div>
			<h3 class="text-2xl font-black text-rose-600 mt-2">{stats.urgent7}</h3>
			<p class="text-[10px] text-rose-700 dark:text-rose-400 mt-1">Segera tindak lanjuti</p>
		</a>

		<!-- Expired -->
		<a
			href="/dms/transactions/documents?gate=EXPIRED"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-rose-700 transition-colors flex flex-col justify-between"
		>
			<div class="flex items-center justify-between">
				<p class="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Kadaluarsa</p>
				<span class="material-symbols-outlined text-rose-700 text-xl">error</span>
			</div>
			<h3 class="text-2xl font-black text-rose-700 mt-2">{stats.expired}</h3>
			<p class="text-[10px] text-rose-800 dark:text-rose-400 mt-1">Masa berlaku habis</p>
		</a>
	</div>

	<!-- Entity Breakdown Chips (4 Kategori Inti) -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
		<a
			href="/dms/transactions/documents?type=KONTRAK_KERJASAMA"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between hover:border-amber-400 transition-colors shadow-xs"
		>
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">history_edu</span>
				</div>
				<div>
					<h4 class="text-xs font-black text-on-surface">Kontrak Legal & PKS</h4>
					<p class="text-[10px] text-on-surface-variant">PKS, Sewa, Rekanan</p>
				</div>
			</div>
			<span class="text-lg font-black text-amber-600">{stats.entities.contracts || 0}</span>
		</a>

		<a
			href="/dms/transactions/documents?entity_type=FLEET"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between hover:border-sky-400 transition-colors shadow-xs"
		>
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">local_shipping</span>
				</div>
				<div>
					<h4 class="text-xs font-black text-on-surface">Armada (FMS)</h4>
					<p class="text-[10px] text-on-surface-variant">KIR, STNK, BPKB</p>
				</div>
			</div>
			<span class="text-lg font-black text-sky-600">{stats.entities.fleet}</span>
		</a>

		<a
			href="/dms/transactions/documents?entity_type=DRIVER"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between hover:border-indigo-400 transition-colors shadow-xs"
		>
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">airline_seat_recline_normal</span>
				</div>
				<div>
					<h4 class="text-xs font-black text-on-surface">Driver (HRIS)</h4>
					<p class="text-[10px] text-on-surface-variant">SIM, SIO, KTP</p>
				</div>
			</div>
			<span class="text-lg font-black text-indigo-600">{stats.entities.driver}</span>
		</a>

		<a
			href="/dms/transactions/documents?entity_type=CORPORATE"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between hover:border-violet-400 transition-colors shadow-xs"
		>
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">corporate_fare</span>
				</div>
				<div>
					<h4 class="text-xs font-black text-on-surface">Korporat & ISO</h4>
					<p class="text-[10px] text-on-surface-variant">Legal Perusahaan</p>
				</div>
			</div>
			<span class="text-lg font-black text-violet-600">{stats.entities.corporate}</span>
		</a>
	</div>

	<!-- Visual Analytics Section (Horizon Bar Chart & Entity Compliance Health) -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left (2 cols): Interactive Expiry Horizon Bar Chart -->
		<div class="lg:col-span-2 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-xs flex flex-col justify-between space-y-6">
			<!-- Chart Header & Range Toggle -->
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-indigo-600 text-xl">bar_chart</span>
						<h3 class="text-base font-extrabold text-on-surface">Proyeksi Dokumen Jatuh Tempo (Expiry Horizon)</h3>
					</div>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">
						Estimasi beban perpanjangan berkas logistik per bulan untuk mitigasi risiko operasional
					</p>
				</div>

				<div class="flex items-center gap-3 self-start sm:self-auto">
					<!-- Range Toggle -->
					<div class="inline-flex items-center p-1 rounded-xl bg-surface-container border border-slate-200/70 dark:border-slate-800/70 text-xs">
						<button
							type="button"
							onclick={() => (horizonRange = '6')}
							class="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer {horizonRange === '6' ? 'bg-indigo-600 text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
						>
							6 Bulan
						</button>
						<button
							type="button"
							onclick={() => (horizonRange = '12')}
							class="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer {horizonRange === '12' ? 'bg-indigo-600 text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
						>
							12 Bulan
						</button>
					</div>
				</div>
			</div>

			<!-- Color Legend -->
			<div class="flex flex-wrap items-center justify-between gap-4 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
				<div class="flex flex-wrap items-center gap-4">
					<div class="flex items-center gap-1.5">
						<span class="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
						<span class="text-[11px] font-bold text-on-surface-variant">Armada</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
						<span class="text-[11px] font-bold text-on-surface-variant">Driver</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
						<span class="text-[11px] font-bold text-on-surface-variant">Kontrak</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
						<span class="text-[11px] font-bold text-on-surface-variant">Korporat</span>
					</div>
				</div>
				<span class="text-[10px] text-slate-400 font-medium">💡 Klik batang untuk melihat daftar dokumen per bulan</span>
			</div>

			<!-- Chart Canvas -->
			<div class="overflow-x-auto pb-1">
				<div class="h-60 w-full min-w-[500px] flex items-end justify-between gap-2.5 sm:gap-4 px-2 border-b border-slate-200 dark:border-slate-800 pb-2 pt-8">
					{#each displayedHorizon as mItem}
						{@const heightPercent = mItem.total > 0 ? Math.max(12, Math.round((mItem.total / maxDisplayedTotal) * 100)) : 4}
						{@const fleetHeight = mItem.total > 0 ? Math.round((mItem.fleet / mItem.total) * 100) : 0}
						{@const driverHeight = mItem.total > 0 ? Math.round((mItem.driver / mItem.total) * 100) : 0}
						{@const contractsHeight = mItem.total > 0 ? Math.round((mItem.contracts / mItem.total) * 100) : 0}
						{@const corporateHeight = mItem.total > 0 ? Math.round((mItem.corporate / mItem.total) * 100) : 0}

						<a
							href="/dms/transactions/documents?expiry_month={mItem.key}"
							class="flex flex-col items-center flex-1 h-full group cursor-pointer relative"
							title="Klik untuk melihat {mItem.total} dokumen jatuh tempo di {mItem.fullName}"
						>
							<div class="w-full flex flex-col justify-end items-center h-full relative">
								<!-- Number Label Above Bar -->
								<span class="absolute -top-6 text-[10px] font-mono font-bold {mItem.total > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} group-hover:scale-110 transition-transform">
									{mItem.total}
								</span>

								<!-- Stacked Vertical Bar -->
								{#if mItem.total > 0}
									<div
										class="w-full max-w-[36px] rounded-t-lg overflow-hidden flex flex-col justify-end group-hover:ring-2 group-hover:ring-indigo-500/50 transition-all duration-300 shadow-xs"
										style="height: {heightPercent}%;"
									>
										{#if mItem.corporate > 0}
											<div class="w-full bg-violet-500/90 group-hover:bg-violet-500 transition-colors" style="height: {corporateHeight}%;"></div>
										{/if}
										{#if mItem.contracts > 0}
											<div class="w-full bg-amber-500/90 group-hover:bg-amber-500 transition-colors" style="height: {contractsHeight}%;"></div>
										{/if}
										{#if mItem.driver > 0}
											<div class="w-full bg-indigo-500/90 group-hover:bg-indigo-500 transition-colors" style="height: {driverHeight}%;"></div>
										{/if}
										{#if mItem.fleet > 0}
											<div class="w-full bg-sky-500/90 group-hover:bg-sky-500 transition-colors" style="height: {fleetHeight}%;"></div>
										{/if}
									</div>
								{:else}
									<div class="w-full max-w-[36px] h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
								{/if}

								<!-- Detailed Floating Tooltip on Hover -->
								<div class="absolute -top-32 bg-slate-900/95 text-white p-3 rounded-2xl text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-2xl z-30 space-y-1 backdrop-blur-xs border border-slate-700">
									<div class="flex items-center justify-between gap-3 border-b border-slate-700/80 pb-1">
										<span class="font-black text-indigo-300">{mItem.fullName}</span>
										<span class="font-mono font-bold text-emerald-400">{mItem.total} Total</span>
									</div>
									<div class="space-y-0.5 pt-0.5 text-slate-200 font-medium">
										<p class="flex items-center justify-between gap-3">
											<span class="text-sky-400">Armada (FMS):</span>
											<span class="font-mono font-bold">{mItem.fleet}</span>
										</p>
										<p class="flex items-center justify-between gap-3">
											<span class="text-indigo-400">Driver (HRIS):</span>
											<span class="font-mono font-bold">{mItem.driver}</span>
										</p>
										<p class="flex items-center justify-between gap-3">
											<span class="text-amber-400">Kontrak Legal:</span>
											<span class="font-mono font-bold">{mItem.contracts}</span>
										</p>
										<p class="flex items-center justify-between gap-3">
											<span class="text-violet-400">Korporat:</span>
											<span class="font-mono font-bold">{mItem.corporate}</span>
										</p>
									</div>
									<p class="text-[9px] text-slate-400 italic pt-1 border-t border-slate-700/60">Klik untuk filter direktori</p>
								</div>
							</div>
							<!-- Month Label Bottom -->
							<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mt-2 group-hover:text-indigo-600 transition-colors">
								{mItem.label}
							</span>
						</a>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right (1 col): Compliance Health Ratio per Entity -->
		<div class="rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-xs flex flex-col justify-between space-y-4">
			<div>
				<div class="flex items-center justify-between mb-1">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-600 text-xl">health_and_safety</span>
						<h3 class="text-base font-extrabold text-on-surface">Kesehatan Kepatuhan</h3>
					</div>
					<span class="px-2.5 py-1 rounded-full text-xs font-black {stats.overallComplianceScore >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : stats.overallComplianceScore >= 50 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'}">
						{stats.overallComplianceScore}% Aman
					</span>
				</div>
				<p class="text-xs text-on-surface-variant">
					Rasio perbandingan dokumen valid vs mendekati jatuh tempo dan kadaluarsa per departemen
				</p>
			</div>

			<!-- Entity Health Progress List -->
			<div class="space-y-4 pt-1">
				{#each Object.entries(entityHealth) as [catKey, eh]}
					{@const safePct = eh.total > 0 ? Math.round((eh.safe / eh.total) * 100) : 0}
					{@const warnPct = eh.total > 0 ? Math.round(((eh.warning + eh.critical + eh.urgent) / eh.total) * 100) : 0}
					{@const expPct = eh.total > 0 ? Math.round((eh.expired / eh.total) * 100) : 0}
					{@const filterLink = catKey === 'CONTRACTS' ? '/dms/transactions/documents?type=KONTRAK_KERJASAMA' : `/dms/transactions/documents?entity_type=${catKey}`}

					<div class="p-3.5 rounded-2xl bg-surface-container-low dark:bg-surface-container-low/50 border border-slate-200/60 dark:border-slate-800/60 space-y-2">
						<div class="flex items-center justify-between text-xs">
							<a href={filterLink} class="font-extrabold text-on-surface hover:text-indigo-600 transition-colors flex items-center gap-1.5">
								<span class="w-2 h-2 rounded-full {eh.bg}"></span>
								<span>{eh.label}</span>
							</a>
							<div class="flex items-center gap-2">
								<span class="font-mono text-[11px] font-bold text-on-surface-variant">
									{eh.safe + eh.warning}/{eh.total}
								</span>
								<span class="px-1.5 py-0.5 rounded text-[10px] font-black font-mono {eh.score >= 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : eh.score >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}">
									{eh.score}%
								</span>
							</div>
						</div>

						<!-- Multi-segment Progress Bar -->
						<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden flex">
							{#if safePct > 0}
								<div class="bg-emerald-500 h-full transition-all duration-500" style="width: {safePct}%;" title="Aman: {eh.safe} dok"></div>
							{/if}
							{#if warnPct > 0}
								<div class="bg-amber-500 h-full transition-all duration-500" style="width: {warnPct}%;" title="Perhatian (H ≤ 60): {eh.warning + eh.critical + eh.urgent} dok"></div>
							{/if}
							{#if expPct > 0}
								<div class="bg-rose-500 h-full transition-all duration-500" style="width: {expPct}%;" title="Kadaluarsa: {eh.expired} dok"></div>
							{/if}
						</div>

						<!-- Micro Details -->
						<div class="flex items-center justify-between text-[10px] text-on-surface-variant font-medium pt-0.5">
							<span class="text-emerald-600 dark:text-emerald-400 font-bold">{eh.safe} Aman</span>
							{#if (eh.warning + eh.critical + eh.urgent) > 0}
								<a href="{filterLink}&gate=WARNING_60" class="text-amber-600 dark:text-amber-400 hover:underline">
									{eh.warning + eh.critical + eh.urgent} Waspada
								</a>
							{/if}
							{#if eh.expired > 0}
								<a href="{filterLink}&gate=EXPIRED" class="text-rose-600 dark:text-rose-400 font-bold hover:underline">
									{eh.expired} Expired
								</a>
							{:else}
								<span class="text-slate-400">0 Expired</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Main Two-Column Layout: Horizon Table & Borrowed Physical Tracker -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left (2 cols): Expiry Horizon Pipeline Table -->
		<div class="lg:col-span-2 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-xs space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-indigo-600 text-xl">event_upcoming</span>
					<h3 class="text-base font-extrabold text-on-surface">Pipeline Dokumen Mendekati Jatuh Tempo (H ≤ 60)</h3>
				</div>
				<a href="/dms/transactions/documents" class="text-xs font-bold text-indigo-600 hover:underline">
					Buka Semua
				</a>
			</div>

			{#if upcomingExpiringDocs.length === 0}
				<div class="p-8 text-center bg-surface-container-low rounded-2xl text-on-surface-variant">
					<span class="material-symbols-outlined text-4xl text-emerald-500 mb-1">check_circle</span>
					<p class="text-xs font-bold">Semua dokumen dalam kondisi valid dan aman!</p>
					<p class="text-[11px] text-slate-400 mt-0.5">Tidak ada dokumen yang jatuh tempo dalam 60 hari ke depan.</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs border-collapse">
						<thead>
							<tr class="border-b border-slate-200 dark:border-slate-800 text-on-surface-variant font-bold uppercase tracking-wider">
								<th class="py-3 px-3">Dokumen</th>
								<th class="py-3 px-3">Entitas</th>
								<th class="py-3 px-3">Jatuh Tempo</th>
								<th class="py-3 px-3">Status Alert</th>
								<th class="py-3 px-3 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
							{#each upcomingExpiringDocs as doc}
								{@const sInfo = getStatusInfo(doc.status, doc.gate_level, doc.days_remaining)}
								{@const eInfo = getEntityTypeInfo(doc.entity_type)}
								<tr class="hover:bg-surface-container-high/40 transition-colors">
									<td class="py-3 px-3">
										<a href="/dms/transactions/documents/{doc.id}" class="font-bold text-on-surface hover:text-indigo-600 line-clamp-1">
											{doc.title}
										</a>
										<p class="text-[10px] font-mono text-slate-400">{doc.doc_number || doc.type_name}</p>
									</td>
									<td class="py-3 px-3">
										<span class="font-bold text-on-surface">
											{#if doc.entity_type === 'FLEET'}
												{doc.unit_number || 'Armada'}
											{:else if doc.entity_type === 'DRIVER'}
												{doc.driver_name || 'Driver'}
											{:else if doc.entity_type === 'CUSTOMER'}
												{doc.partner_name || 'Customer'}
											{:else}
												Korporat
											{/if}
										</span>
									</td>
									<td class="py-3 px-3 font-bold text-on-surface">{formatDateId(doc.expiry_date)}</td>
									<td class="py-3 px-3">
										<span class="px-2 py-0.5 rounded-full text-[10px] font-black border inline-flex items-center gap-1 {sInfo.badgeClass}">
											<span class="material-symbols-outlined text-xs">{sInfo.icon}</span>
											<span>{sInfo.label}</span>
										</span>
									</td>
									<td class="py-3 px-3 text-right">
										<a
											href="/dms/transactions/documents/{doc.id}"
											class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] transition-colors"
										>
											Perpanjang
										</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		<!-- Right (1 col): Physical Custody Tracker -->
		<div class="rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-xs space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-orange-600 text-xl">inventory_2</span>
					<h3 class="text-base font-extrabold text-on-surface">Berkas Sedang Dipinjam ({stats.borrowedCount})</h3>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant">
				Monitoring berkas fisik asli yang saat ini berada di luar lemari/rak arsip.
			</p>

			{#if borrowedDocs.length === 0}
				<div class="p-6 text-center bg-surface-container-low rounded-2xl text-on-surface-variant">
					<span class="material-symbols-outlined text-3xl text-emerald-500 mb-1">lock</span>
					<p class="text-xs font-bold">Semua berkas fisik berada di lemari arsip.</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each borrowedDocs as bDoc}
						<div class="p-3.5 rounded-2xl bg-orange-50/50 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/40 space-y-1.5">
							<div class="flex items-center justify-between">
								<h5 class="text-xs font-bold text-on-surface line-clamp-1">{bDoc.title}</h5>
								<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200">DIPINJAM</span>
							</div>
							<p class="text-[11px] text-on-surface-variant font-mono">No: {bDoc.doc_number || '-'}</p>
							<div class="flex items-center justify-between pt-1 border-t border-orange-200/50 dark:border-orange-900/30">
								<span class="text-[10px] text-slate-500">Rak: {bDoc.filing_location_code || 'A1'}</span>
								<a href="/dms/transactions/documents/{bDoc.id}" class="text-[11px] font-bold text-orange-700 dark:text-orange-300 hover:underline">
									Kembalikan
								</a>
							</div>
						</div>
					{/each}
				</div>
			{/if}
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
