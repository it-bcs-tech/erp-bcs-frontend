<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let summary = $derived(data.summary);
	let pendingDOs = $derived(data.pendingDOs || []);
	let activeJourneys = $derived(data.activeJourneys || []);
	let recentCompletions = $derived(data.recentCompletions || []);
	let dailyTargets = $derived(data.dailyTargets || []);

	let journeyTab = $state<'active' | 'completed'>('active');

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
</script>

<svelte:head>
	<title>Operational Command System | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Quick Actions -->
	<header class="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
				<span>Logistics Dispatch</span>
				<span>•</span>
				<span>Fleet Operations Control</span>
			</div>
			<div class="flex items-center gap-2.5">
				<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">hub</span>
				</div>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Operational Command System (OCS)</h1>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-0.5">
				Pusat kendali dispatching surat jalan, uang jalan (UJO), target ritase harian, dan monitoring perjalanan armada
			</p>
		</div>

		<div class="flex items-center gap-2.5 flex-wrap">
			<a 
				href="/ocs/gerbang-tol" 
				class="bg-surface-container-low hover:bg-surface-container border border-slate-200/80 dark:border-slate-800 text-on-surface px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
			>
				<span class="material-symbols-outlined text-sky-600 dark:text-sky-400 text-[18px]">toll</span>
				<span>Master Gerbang Tol</span>
			</a>
			<a 
				href="/ocs/rute" 
				class="bg-surface-container-low hover:bg-surface-container border border-slate-200/80 dark:border-slate-800 text-on-surface px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
			>
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px]">route</span>
				<span>Master Rute & UJO</span>
			</a>
			<a 
				href="/ocs/dispatch" 
				class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
			>
				<span class="material-symbols-outlined text-[18px]">add_task</span>
				<span>Proses Dispatch</span>
			</a>
		</div>
	</header>

	<!-- Zona 1: 4 Executive KPI Cards (Bento Grid) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Card 1: Pending Dispatch -->
		<a 
			href="/ocs/dispatch"
			class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs hover:border-amber-500/40 hover:bg-surface-container/70 transition-all group block"
		>
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-amber-600 transition-colors">Pending Dispatch</span>
				<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
					<span class="material-symbols-outlined text-2xl">pending_actions</span>
				</div>
			</div>
			<div class="text-3xl font-black text-amber-600 mt-1">{summary.pendingDispatch}</div>
			<div class="flex items-center justify-between text-xs text-amber-600 font-bold mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
				<span>Surat jalan menunggu rilis</span>
				<span class="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Proses →</span>
			</div>
		</a>

		<!-- Card 2: Active Journeys -->
		<a 
			href="/fms/live-map"
			class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs hover:border-sky-500/40 hover:bg-surface-container/70 transition-all group block"
		>
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-sky-600 transition-colors">Armada Dalam Rute</span>
				<div class="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
					<span class="material-symbols-outlined text-2xl">local_shipping</span>
				</div>
			</div>
			<div class="text-3xl font-black text-sky-600 dark:text-sky-400 mt-1">{summary.activeJourneys}</div>
			<div class="flex items-center justify-between text-xs text-sky-600 dark:text-sky-400 font-bold mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
				<span>Unit sedang bergerak</span>
				<span class="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Live Map →</span>
			</div>
		</a>

		<!-- Card 3: Selesai Hari Ini -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ritase Selesai Hari Ini</span>
				<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">check_circle</span>
				</div>
			</div>
			<div class="text-3xl font-black text-emerald-600 mt-1">{summary.completedToday}</div>
			<div class="flex items-center justify-between text-xs text-emerald-600 font-bold mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
				<span>Pengiriman tuntas</span>
				<span class="text-[10px] text-on-surface-variant/70 font-semibold">Siap Klaim Kasir</span>
			</div>
		</div>

		<!-- Card 4: Total UJO Hari Ini -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Perputaran UJO Hari Ini</span>
				<div class="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">payments</span>
				</div>
			</div>
			<div class="text-2xl font-black text-violet-600 mt-1 font-mono">{formatCurrency(summary.totalUJO)}</div>
			<div class="flex items-center justify-between text-xs text-violet-600 font-bold mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
				<span>Uang jalan operasional</span>
				<span class="text-[10px] text-on-surface-variant/70 font-semibold">Tercatat Kasir</span>
			</div>
		</div>
	</div>

	<!-- Zona 2: Horizontal Delivery Pipeline Strip (Alur 4 Tahap) -->
	<div class="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
			<div class="flex items-center gap-2">
				<div class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
				<h2 class="text-xs font-bold text-on-surface uppercase tracking-wider">Alur Siklus Dispatching & Pengiriman</h2>
				<span class="text-[11px] text-on-surface-variant font-medium">· Monitoring terpadu surat jalan dari order hingga POD</span>
			</div>
			<span class="text-xs font-bold text-blue-600 flex items-center gap-1">
				<span class="material-symbols-outlined text-sm">local_shipping</span> OCS Live Command
			</span>
		</div>

		<!-- 4 Stepper Cards with Flow Direction -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
			<!-- Stage 1: DO Masuk -->
			<a 
				href="/ocs/dispatch"
				class="p-3.5 rounded-xl bg-surface hover:bg-surface-container border border-slate-200/50 dark:border-slate-800/50 hover:border-amber-500/50 transition-all group flex flex-col justify-between cursor-pointer"
			>
				<div>
					<div class="flex items-center justify-between mb-2">
						<span class="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
							Tahap 1
						</span>
						<div class="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
							<span class="material-symbols-outlined text-base">receipt_long</span>
						</div>
					</div>
					<h3 class="text-xs font-black text-on-surface group-hover:text-amber-600 transition-colors">1. DO Masuk & Validasi</h3>
					<p class="text-[11px] text-on-surface-variant mt-1 leading-snug">Order kustomer terverifikasi, menunggu penentuan rute & tarif UJO.</p>
				</div>
				<div class="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40 flex items-baseline justify-between">
					<span class="text-lg font-black text-on-surface">{summary.pendingDispatch} <span class="text-[10px] font-normal text-on-surface-variant">Order</span></span>
					<span class="text-[10px] font-bold text-amber-600">Pending UJO</span>
				</div>
			</a>

			<!-- Stage 2: Penugasan Unit -->
			<a 
				href="/ocs/assign-driver"
				class="p-3.5 rounded-xl bg-surface hover:bg-surface-container border border-slate-200/50 dark:border-slate-800/50 hover:border-purple-500/50 transition-all group flex flex-col justify-between cursor-pointer"
			>
				<div>
					<div class="flex items-center justify-between mb-2">
						<span class="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded">
							Tahap 2
						</span>
						<div class="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
							<span class="material-symbols-outlined text-base">assignment_ind</span>
						</div>
					</div>
					<h3 class="text-xs font-black text-on-surface group-hover:text-purple-600 transition-colors">2. Penugasan Unit & Supir</h3>
					<p class="text-[11px] text-on-surface-variant mt-1 leading-snug">Alokasi armada standby, verifikasi SIM supir & pencairan UJO.</p>
				</div>
				<div class="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40 flex items-baseline justify-between">
					<span class="text-lg font-black text-on-surface">Siap Dispatch</span>
					<span class="text-[10px] font-bold text-purple-600">Verifikasi Pool</span>
				</div>
			</a>

			<!-- Stage 3: Dalam Perjalanan -->
			<a 
				href="/fms/live-map"
				class="p-3.5 rounded-xl bg-surface hover:bg-surface-container border border-slate-200/50 dark:border-slate-800/50 hover:border-sky-500/50 transition-all group flex flex-col justify-between cursor-pointer"
			>
				<div>
					<div class="flex items-center justify-between mb-2">
						<span class="text-[10px] font-black uppercase tracking-wider text-sky-600 bg-sky-500/10 px-2 py-0.5 rounded">
							Tahap 3
						</span>
						<div class="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
							<span class="material-symbols-outlined text-base">local_shipping</span>
						</div>
					</div>
					<h3 class="text-xs font-black text-on-surface group-hover:text-sky-600 transition-colors">3. Dalam Perjalanan (In-Transit)</h3>
					<p class="text-[11px] text-on-surface-variant mt-1 leading-snug">Pelacakan rute tol & posisi GPS armada menuju lokasi bongkar.</p>
				</div>
				<div class="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40 flex items-baseline justify-between">
					<span class="text-lg font-black text-on-surface">{summary.activeJourneys} <span class="text-[10px] font-normal text-on-surface-variant">Armada</span></span>
					<span class="text-[10px] font-bold text-sky-600">Live Tracking</span>
				</div>
			</a>

			<!-- Stage 4: Selesai Terkirim -->
			<a 
				href="/ocs/pod"
				class="p-3.5 rounded-xl bg-surface hover:bg-surface-container border border-slate-200/50 dark:border-slate-800/50 hover:border-emerald-500/50 transition-all group flex flex-col justify-between cursor-pointer"
			>
				<div>
					<div class="flex items-center justify-between mb-2">
						<span class="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
							Tahap 4
						</span>
						<div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
							<span class="material-symbols-outlined text-base">task_alt</span>
						</div>
					</div>
					<h3 class="text-xs font-black text-on-surface group-hover:text-emerald-600 transition-colors">4. Selesai Terkirim (POD)</h3>
					<p class="text-[11px] text-on-surface-variant mt-1 leading-snug">Bukti tanda terima ditandatangani; surat jalan siap klaim kasir.</p>
				</div>
				<div class="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40 flex items-baseline justify-between">
					<span class="text-lg font-black text-on-surface">{summary.completedToday} <span class="text-[10px] font-normal text-on-surface-variant">Rit Selesai</span></span>
					<span class="text-[10px] font-bold text-emerald-600">Klaim UJO Kasir</span>
				</div>
			</a>
		</div>
	</div>

	<!-- Zona 3: Target Pengiriman & Ritase Proyek Harian -->
	{#if dailyTargets.length > 0}
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden p-5 sm:p-6 flex flex-col gap-4">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">track_changes</span>
						<h2 class="text-base font-bold text-on-surface tracking-tight">Target Pengiriman & Ritase Proyek Harian</h2>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">Pemantauan realisasi volume tonase dan ritase armada terhadap target operasional hari ini</p>
				</div>
				<a href="/ocs/daily-targets" class="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 self-start sm:self-auto">
					<span>Kelola Target Proyek</span>
					<span class="material-symbols-outlined text-sm">arrow_forward</span>
				</a>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{#each dailyTargets as t}
					{@const pctTonnage = t.targetTonnage > 0 ? Math.min(100, Math.round((t.achievedTonnage / t.targetTonnage) * 100)) : 0}
					{@const pctRitase = t.targetRitase > 0 ? Math.min(100, Math.round((t.achievedRitase / t.targetRitase) * 100)) : 0}
					<div class="p-4 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50 hover:border-blue-500/30 transition-all flex flex-col justify-between gap-3">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0">
								<h3 class="text-xs font-black text-on-surface truncate" title={t.project}>{t.project}</h3>
								<p class="text-[10px] text-on-surface-variant font-medium truncate mt-0.5">{t.customer}</p>
							</div>
							<span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase {pctTonnage >= 100 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'}">
								{pctTonnage}% Capaian
							</span>
						</div>

						<div class="space-y-3">
							<!-- Tonnage Progress -->
							<div>
								<div class="flex justify-between text-[10px] font-bold mb-1">
									<span class="text-emerald-600">{new Intl.NumberFormat('id-ID').format(t.achievedTonnage)} Ton</span>
									<span class="text-on-surface-variant">Target {new Intl.NumberFormat('id-ID').format(t.targetTonnage)} Ton</span>
								</div>
								<div class="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
									<div class="h-full bg-emerald-500 rounded-full transition-all duration-500" style="width: {pctTonnage}%"></div>
								</div>
							</div>

							<!-- Ritase Progress -->
							<div>
								<div class="flex justify-between text-[10px] font-bold mb-1">
									<span class="text-blue-600">{t.achievedRitase} Rit</span>
									<span class="text-on-surface-variant">Target {t.targetRitase} Rit</span>
								</div>
								<div class="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
									<div class="h-full bg-blue-500 rounded-full transition-all duration-500" style="width: {pctRitase}%"></div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Zona 4: 2 Kolom Seimbang (Antrean Dispatch vs Monitoring Perjalanan) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- Left Column: DO Pending Dispatch (5 Cols) -->
		<div class="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-4">
					<div>
						<div class="flex items-center gap-2">
							<span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
							<h3 class="text-base font-bold text-on-surface tracking-tight">DO Pending Dispatch</h3>
						</div>
						<p class="text-xs text-on-surface-variant mt-0.5">Surat jalan menunggu penetapan rute & pencairan UJO</p>
					</div>
					<a href="/ocs/dispatch" class="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5">
						<span>Semua</span>
						<span class="material-symbols-outlined text-sm">arrow_forward</span>
					</a>
				</div>

				<div class="space-y-3">
					{#if pendingDOs.length === 0}
						<div class="py-12 text-center text-on-surface-variant">
							<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-1">task_alt</span>
							<p class="text-xs font-bold text-on-surface">Tidak Ada DO Pending</p>
							<p class="text-[11px] text-on-surface-variant/70 mt-0.5">Seluruh order penjualan telah berhasil diproses dispatch.</p>
						</div>
					{:else}
						{#each pendingDOs as order}
							<div class="p-3.5 rounded-xl bg-surface hover:bg-surface-container border border-slate-200/50 dark:border-slate-800/50 hover:border-amber-500/30 transition-all flex flex-col gap-2">
								<div class="flex items-start justify-between gap-2">
									<div>
										<p class="text-xs font-black text-on-surface font-mono">{order.id}</p>
										<p class="text-xs text-on-surface-variant font-medium mt-0.5">{order.customer}</p>
									</div>
									<span class="text-[10px] font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-md uppercase border border-amber-500/20">
										Pending UJO
									</span>
								</div>

								<div class="text-xs text-on-surface-variant space-y-1">
									<p class="flex items-center gap-1.5">
										<span class="material-symbols-outlined text-[15px] text-blue-500">route</span>
										<strong class="text-on-surface">{order.origin} → {order.destination}</strong>
									</p>
									<p class="flex items-center gap-1.5 text-[11px]">
										<span class="material-symbols-outlined text-[14px] text-slate-400">inventory_2</span>
										<span>{order.cargo} · {order.weight} Ton</span>
										<span>·</span>
										<span>{order.vehicleReq}</span>
									</p>
								</div>

								<div class="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between">
									<span class="text-xs font-black text-sky-600 font-mono">{formatCurrency(order.tariff)}</span>
									<a 
										href="/ocs/dispatch" 
										class="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs transition-colors"
									>
										<span>Assign Unit</span>
										<span class="material-symbols-outlined text-xs">arrow_forward</span>
									</a>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<div class="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Alokasi armada & driver</span>
				<a href="/ocs/assign-driver" class="font-bold text-blue-600 hover:underline flex items-center gap-0.5">
					<span>Kesiapan Supir</span>
					<span class="material-symbols-outlined text-sm">arrow_forward</span>
				</a>
			</div>
		</div>

		<!-- Right Column: Monitoring Perjalanan Armada (Tab Switcher) (7 Cols) -->
		<div class="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Tab Header Switcher -->
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
					<div>
						<h3 class="text-base font-bold text-on-surface tracking-tight">
							{journeyTab === 'active' ? 'Perjalanan Armada Aktif' : 'Baru Selesai Terkirim Hari Ini'}
						</h3>
						<p class="text-xs text-on-surface-variant mt-0.5">
							{journeyTab === 'active' ? 'Monitoring real-time pergerakan surat jalan di rute' : 'Riwayat pengiriman yang telah tuntas dan terbit POD'}
						</p>
					</div>

					<!-- Segmented Tab Controls -->
					<div class="inline-flex p-0.5 rounded-xl bg-surface-container border border-slate-200/50 dark:border-slate-800/50 text-xs self-start sm:self-auto">
						<button 
							type="button"
							onclick={() => journeyTab = 'active'}
							class="px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 {journeyTab === 'active' ? 'bg-surface text-blue-600 shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">local_shipping</span>
							<span>Aktif ({summary.activeJourneys})</span>
						</button>
						<button 
							type="button"
							onclick={() => journeyTab = 'completed'}
							class="px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 {journeyTab === 'completed' ? 'bg-surface text-blue-600 shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">check_circle</span>
							<span>Selesai ({summary.completedToday})</span>
						</button>
					</div>
				</div>

				<!-- Tab Content 1: Perjalanan Aktif -->
				{#if journeyTab === 'active'}
					<div class="space-y-3">
						{#if activeJourneys.length === 0}
							<div class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-1">local_shipping</span>
								<p class="text-xs font-bold text-on-surface">Tidak Ada Armada di Rute</p>
								<p class="text-[11px] text-on-surface-variant/70 mt-0.5">Seluruh armada saat ini berada di pool atau standby.</p>
							</div>
						{:else}
							{#each activeJourneys as j}
								<div class="p-3.5 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50 hover:bg-surface-container hover:border-blue-500/30 transition-all flex flex-col gap-2">
									<div class="flex items-start justify-between gap-2">
										<div class="flex items-center gap-2.5 min-w-0">
											<div class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
												<span class="material-symbols-outlined text-lg">local_shipping</span>
											</div>
											<div class="min-w-0">
												<div class="flex items-center gap-2">
													<p class="text-xs font-black text-on-surface font-mono">{j.unit}</p>
													<span class="text-[10px] text-blue-600 font-bold font-mono">DO: {j.do}</span>
												</div>
												<p class="text-[11px] text-on-surface-variant font-medium mt-0.5 truncate">{j.driver}</p>
											</div>
										</div>

										<div class="text-right flex-shrink-0">
											<p class="text-xs font-black text-on-surface font-mono">{formatCurrency(j.ujo)}</p>
											<span class="text-[9px] font-bold uppercase {j.ujoStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}">
												{j.ujoStatus === 'PAID' ? '● UJO Cair' : '● Menunggu Kasir'}
											</span>
										</div>
									</div>

									<!-- Rute & Progress Bar -->
									<div class="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 space-y-1">
										<div class="flex items-center justify-between text-[11px] font-bold">
											<span class="text-on-surface truncate">{j.origin} → {j.destination}</span>
											<span class="text-blue-600">{j.progress}%</span>
										</div>
										<div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
											<div class="bg-blue-500 h-full rounded-full transition-all duration-500" style="width: {j.progress}%"></div>
										</div>
									</div>
								</div>
							{/each}
						{/if}
					</div>

				<!-- Tab Content 2: Baru Selesai Terkirim -->
				{:else}
					<div class="space-y-3">
						{#if recentCompletions.length === 0}
							<div class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-1">check_circle</span>
								<p class="text-xs font-bold text-on-surface">Belum Ada Trip Selesai</p>
								<p class="text-[11px] text-on-surface-variant/70 mt-0.5">Pengiriman yang tuntas hari ini akan tampil di sini.</p>
							</div>
						{:else}
							{#each recentCompletions as c}
								<div class="p-3.5 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50 hover:bg-surface-container hover:border-emerald-500/30 transition-all flex items-center justify-between gap-3">
									<div class="flex items-center gap-3 min-w-0">
										<div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
											<span class="material-symbols-outlined text-lg">check_circle</span>
										</div>
										<div class="min-w-0">
											<div class="flex items-center gap-2">
												<p class="text-xs font-black text-on-surface font-mono">{c.unit}</p>
												<span class="text-[10px] text-on-surface-variant font-mono">DO: {c.do}</span>
											</div>
											<p class="text-[11px] text-on-surface-variant font-medium mt-0.5 truncate">{c.driver} · {c.route}</p>
										</div>
									</div>

									<div class="text-right flex-shrink-0">
										<p class="text-xs font-black text-emerald-600 font-mono">{formatCurrency(c.ujo)}</p>
										<p class="text-[10px] text-on-surface-variant mt-0.5">{c.completedAt}</p>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				{/if}
			</div>

			<div class="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Integrasi GPS & pelacakan armada</span>
				<a href="/fms/live-map" class="font-bold text-blue-600 hover:underline flex items-center gap-1">
					<span class="material-symbols-outlined text-sm">map</span>
					<span>Buka Live Map Armada</span>
				</a>
			</div>
		</div>
	</div>
</div>
