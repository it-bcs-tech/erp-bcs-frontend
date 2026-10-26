<script lang="ts">
	let { data } = $props();
	let cashSummary = $derived(data.cashSummary);
	let pipeline = $derived(data.pipeline);
	let monthlyTrend = $derived(data.monthlyTrend);
	let outflowBreakdown = $derived(data.outflowBreakdown);
	let shiftSessions = $derived(data.shiftSessions);
	let recentUjoList = $derived(data.recentUjoList);
	let extraCostList = $derived(data.extraCostList);
	let recentTransactions = $derived(data.recentTransactions);

	let activeAnalyticsTab = $state<'trend' | 'shift'>('trend');
	let activeDisbursementTab = $state<'ujo' | 'extra'>('ujo');
	let activeMutasiTab = $state<'mutations' | 'shift_info'>('mutations');

	function formatRupiah(val: any) {
		const num = Number(val) || 0;
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(num);
	}

	function formatShortRupiah(val: any) {
		const num = Number(val) || 0;
		if (num >= 1_000_000_000) {
			return `Rp ${(num / 1_000_000_000).toFixed(2).replace('.', ',')} M`;
		}
		if (num >= 1_000_000) {
			return `Rp ${Math.round(num / 1_000_000)} Jt`;
		}
		return formatRupiah(num);
	}

	function getCategoryLabel(cat: string) {
		const s = (cat || '').toUpperCase();
		if (s === 'PENARIKAN_KAS_SHIFT') return 'Top Up & Penarikan Kas Shift';
		if (s === 'MODAL_AWAL_SHIFT') return 'Modal Awal Buka Shift';
		if (s === 'PENCAIRAN_UJO') return 'Pencairan UJO Supir';
		if (s === 'EXTRA_COST_CLOSING') return 'Klaim Biaya Extra Cost';
		return s.replace(/_/g, ' ');
	}

	function getCategoryColor(cat: string) {
		const s = (cat || '').toUpperCase();
		if (s.includes('MODAL')) return 'bg-amber-500 text-amber-600';
		if (s.includes('PENARIKAN')) return 'bg-blue-500 text-blue-600';
		if (s.includes('UJO')) return 'bg-emerald-500 text-emerald-600';
		return 'bg-purple-500 text-purple-600';
	}
</script>

<svelte:head>
	<title>Cashier Command Center | ERP BCS</title>
</svelte:head>

<div class="space-y-6 pb-12">
	<!-- 1. Executive Header & Quick Action Buttons -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">point_of_sale</span>
				</div>
				<div>
					<h1 class="text-2xl font-black text-on-surface tracking-tight">Cashier Command Center</h1>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5 flex items-center gap-1.5">
						<span class="material-symbols-outlined text-sm">calendar_today</span>
						<span>{data.today} • Manajemen pencairan UJO supir, klaim ritase surat jalan & closing kasir PT BCS</span>
					</p>
				</div>
			</div>
		</div>

		<!-- Action Shortcuts -->
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/kasir/ujo"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all"
			>
				<span class="material-symbols-outlined text-base">payments</span>
				<span>Proses UJO</span>
				{#if cashSummary.pendingUjo > 0}
					<span class="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-mono font-black">
						{cashSummary.pendingUjo}
					</span>
				{/if}
			</a>
			<a
				href="/kasir/kas-operasional"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base text-emerald-600">account_balance_wallet</span>
				<span>Kas Operasional</span>
			</a>
			<a
				href="/kasir/shift"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base text-blue-600">schedule</span>
				<span>Buka / Tutup Shift</span>
			</a>
			<a
				href="/kasir/closing"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base text-purple-600">assignment_turned_in</span>
				<span>Closing Ritase</span>
			</a>
		</div>
	</div>

	<!-- 2. Top Bento KPI Executive Metric Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Saldo Kas Operasional (Net) -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Saldo Kas Operasional</span>
				<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">account_balance_wallet</span>
				</div>
			</div>
			<h3 class="text-2xl font-black {cashSummary.netCash >= 0 ? 'text-emerald-600' : 'text-rose-600'} font-mono tracking-tight">
				{formatRupiah(cashSummary.netCash)}
			</h3>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				Tersedia di brankas kasir operasional
			</p>
		</div>

		<!-- Drop Dana Masuk (Finance) -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-blue-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Drop Dana Masuk</span>
				<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">arrow_downward</span>
				</div>
			</div>
			<h3 class="text-2xl font-black text-blue-600 font-mono tracking-tight">{formatRupiah(cashSummary.cashIn)}</h3>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				Alokasi modal & top up dari Divisi Keuangan
			</p>
		</div>

		<!-- Realisasi Pencairan UJO -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Realisasi UJO Supir</span>
				<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">payments</span>
				</div>
			</div>
			<h3 class="text-2xl font-black text-amber-600 font-mono tracking-tight">{formatRupiah(cashSummary.totalUjoPaid)}</h3>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				{cashSummary.totalUjoCount} Pencairan UJO supir armada berjalan
			</p>
		</div>

		<!-- Klaim Biaya Ritase / Extra Cost -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-purple-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Klaim Biaya Extra Cost</span>
				<div class="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">receipt_long</span>
				</div>
			</div>
			<h3 class="text-2xl font-black text-purple-600 font-mono tracking-tight">{formatRupiah(cashSummary.totalExtraCost)}</h3>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				Klaim tambahan tol, parkir & pengeluaran rute
			</p>
		</div>
	</div>

	<!-- 3. Cashier Operational Lifecycle Pipeline Strip (NEW) -->
	<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-emerald-600 text-xl">timeline</span>
				<h2 class="text-sm font-black text-on-surface tracking-tight uppercase">
					Cashier Operational Lifecycle Pipeline
				</h2>
			</div>
			<div class="flex items-center gap-2 text-[11px] font-mono text-on-surface-variant">
				<span>Status Likuiditas:</span>
				<span class="font-black text-emerald-600">Kas Aman ({formatShortRupiah(cashSummary.netCash)})</span>
			</div>
		</div>

		<!-- Continuous Horizontal Pipeline Strip -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
			<!-- Stage 1: Permohonan UJO (Request) -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-amber-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">hourglass_top</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">1. Permohonan UJO</p>
						<p class="text-sm font-black text-on-surface">{pipeline.pendingUjo} DO Pending</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full {pipeline.pendingUjo > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'} text-[10px] font-mono font-bold">
					{pipeline.pendingUjo > 0 ? 'Pending' : 'Terkontrol'}
				</span>
			</div>

			<!-- Stage 2: Pencairan Kasir (Disbursement) -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-emerald-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">payments</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">2. Pencairan UJO</p>
						<p class="text-sm font-black text-emerald-600">{pipeline.paidUjoCount} Terbayar</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-mono font-bold">
					{formatShortRupiah(pipeline.paidUjoAmount)}
				</span>
			</div>

			<!-- Stage 3: Klaim Extra Cost (In-Transit) -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-blue-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">local_shipping</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">3. Klaim Extra Cost</p>
						<p class="text-sm font-black text-on-surface">{pipeline.extraCostCount} Klaim Ritase</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-mono font-bold">
					{formatShortRupiah(pipeline.extraCostAmount)}
				</span>
			</div>

			<!-- Stage 4: Rekonsiliasi & Closing Shift -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-purple-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">task_alt</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">4. Closing Shift</p>
						<p class="text-sm font-black text-purple-600">{pipeline.closedShifts} Sesi Selesai</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 text-[10px] font-mono font-bold">
					Balanced
				</span>
			</div>
		</div>
	</div>

	<!-- 4. Visual Analytics Zone (Grid 12-col: 8 vs 4) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- Left: Multi-Tab Analytics (8 Kolom) -->
		<div class="lg:col-span-8 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Tab Switcher -->
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
					<div>
						{#if activeAnalyticsTab === 'trend'}
							<h3 class="text-base font-black text-on-surface tracking-tight">Tren Arus Kas Masuk vs Keluar (6 Bulan Terakhir)</h3>
							<p class="text-xs text-on-surface-variant font-medium mt-0.5">
								Perbandingan pergerakan Drop Dana Masuk vs Pengeluaran Operasional Kasir
							</p>
						{:else}
							<h3 class="text-base font-black text-on-surface tracking-tight">Riwayat Sesi Shift & Rekonsiliasi Kasir</h3>
							<p class="text-xs text-on-surface-variant font-medium mt-0.5">
								Pencatatan modal awal shift, serah terima uang fisik, dan rekonsiliasi kasir
							</p>
						{/if}
					</div>

					<!-- Segmented Switcher -->
					<div class="inline-flex items-center p-1 rounded-2xl bg-surface border border-slate-200/70 dark:border-slate-800/70 self-start">
						<button
							type="button"
							onclick={() => (activeAnalyticsTab = 'trend')}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeAnalyticsTab === 'trend'
								? 'bg-emerald-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">insights</span>
							<span>Arus Kas</span>
						</button>
						<button
							type="button"
							onclick={() => (activeAnalyticsTab = 'shift')}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeAnalyticsTab === 'shift'
								? 'bg-emerald-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">schedule</span>
							<span>Sesi Shift ({shiftSessions.length})</span>
						</button>
					</div>
				</div>

				<!-- TAB 1: TREN ARUS KAS BULANAN -->
				{#if activeAnalyticsTab === 'trend'}
					<div class="flex items-center justify-end gap-4 mb-2">
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
							<span class="text-[11px] font-bold text-on-surface-variant">Drop Masuk</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
							<span class="text-[11px] font-bold text-on-surface-variant">Pengeluaran Kas</span>
						</div>
					</div>

					<div class="h-56 w-full flex items-end justify-between px-2 gap-3 pt-6 border-b border-slate-200 dark:border-slate-800 pb-2">
						{#each monthlyTrend as item}
							<div class="flex flex-col items-center flex-1 gap-2 h-full group cursor-pointer">
								<div class="w-full flex items-end justify-center gap-1.5 h-full relative">
									<!-- Cash In Bar -->
									<div
										class="w-5 sm:w-8 bg-emerald-500/80 group-hover:bg-emerald-500 rounded-t-lg transition-all duration-300"
										style="height: {item.inPct}%"
									></div>
									<!-- Cash Out Bar -->
									<div
										class="w-5 sm:w-8 bg-rose-500/80 group-hover:bg-rose-500 rounded-t-lg transition-all duration-300"
										style="height: {item.outPct}%"
									></div>

									<!-- Tooltip -->
									<div class="absolute -top-16 bg-slate-900 text-white px-3 py-2 rounded-xl text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-20 space-y-0.5">
										<p class="font-black text-emerald-300">{item.month} ({item.period_key})</p>
										<p>Masuk: <span class="font-mono font-bold text-emerald-400">{formatRupiah(item.inVal)}</span></p>
										<p>Keluar: <span class="font-mono font-bold text-rose-400">{formatRupiah(item.outVal)}</span></p>
									</div>
								</div>
								<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-emerald-600 transition-colors">
									{item.month}
								</span>
							</div>
						{/each}
					</div>

				<!-- TAB 2: RIWAYAT SESI SHIFT KASIR -->
				{:else}
					<div class="space-y-2.5">
						{#each shiftSessions as sh}
							<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0">
										<span class="material-symbols-outlined text-base">person</span>
									</div>
									<div>
										<div class="flex items-center gap-2">
											<p class="text-xs font-black text-on-surface">{sh.session_number}</p>
											<span class="px-1.5 py-0.2 rounded border text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
												{sh.status}
											</span>
										</div>
										<p class="text-[11px] text-slate-400 mt-0.5">
											{sh.shift_name} • Kasir: <span class="font-bold text-on-surface-variant">{sh.cashier_name}</span> → Serah ke: {sh.handover_to || '-'}
										</p>
									</div>
								</div>
								<div class="flex items-center sm:flex-col sm:items-end justify-between text-right shrink-0">
									<span class="text-xs font-mono font-bold text-emerald-600">
										Saldo Akhir: {formatRupiah(sh.actual_closing_cash)}
									</span>
									<span class="text-[10px] text-slate-400 font-mono">
										Modal: {formatShortRupiah(sh.opening_cash)} • {sh.total_ujo_count} UJO
									</span>
								</div>
							</div>
						{/each}

						{#if shiftSessions.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada catatan sesi shift.</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Context Action -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Mutasi buku kas tersinkron otomatis dengan brankas kasir</span>
				<a href="/kasir/kas-operasional" class="font-bold text-emerald-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Buku Kas Harian</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>

		<!-- Right: Komposisi Pengeluaran Kasir (4 Kolom) -->
		<div class="lg:col-span-4 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-4">
					<div>
						<h3 class="text-base font-black text-on-surface tracking-tight">Komposisi Pengeluaran Kas</h3>
						<p class="text-xs text-on-surface-variant font-medium mt-0.5">Distribusi Arus Kas Keluar Operasional</p>
					</div>
					<span class="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-mono font-bold">
						{outflowBreakdown.length} Pos
					</span>
				</div>

				<!-- Outflow Breakdown Bars -->
				<div class="space-y-3.5 my-2">
					{#each outflowBreakdown as item}
						<div class="p-2.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 space-y-1.5">
							<div class="flex items-center justify-between text-xs">
								<span class="font-bold text-on-surface truncate max-w-[170px]" title={getCategoryLabel(item.category)}>
									{getCategoryLabel(item.category)}
								</span>
								<span class="font-mono font-bold text-on-surface-variant">
									{formatShortRupiah(item.amount)} <span class="text-[10px] text-slate-400 font-normal">({item.percentage}%)</span>
								</span>
							</div>
							<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
								<div
									class="h-full rounded-full transition-all duration-500 {getCategoryColor(item.category).split(' ')[0]}"
									style="width: {item.percentage}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<a
				href="/kasir/kas-operasional"
				class="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container text-center transition-all inline-block mt-4"
			>
				Total Pengeluaran ({formatShortRupiah(cashSummary.cashOut)})
			</a>
		</div>
	</div>

	<!-- 5. Balanced Bottom Operational Section (Grid 12-col: 7 vs 5) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- Left: Pencairan UJO & Extra Cost (7 Kolom) -->
		<div class="lg:col-span-7 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Tab Switcher -->
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-600 text-xl">payments</span>
						<div>
							<h3 class="font-black text-base text-on-surface tracking-tight">Monitoring UJO & Klaim Ritase</h3>
							<p class="text-xs text-on-surface-variant font-medium">Realisasi pencairan uang jalan dan penggantian biaya armada</p>
						</div>
					</div>

					<!-- Segmented Switcher -->
					<div class="inline-flex items-center p-1 rounded-2xl bg-surface border border-slate-200/70 dark:border-slate-800/70 self-start">
						<button
							type="button"
							onclick={() => (activeDisbursementTab = 'ujo')}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeDisbursementTab === 'ujo'
								? 'bg-emerald-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span>Pencairan UJO ({recentUjoList.length})</span>
						</button>
						<button
							type="button"
							onclick={() => (activeDisbursementTab = 'extra')}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeDisbursementTab === 'extra'
								? 'bg-purple-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span>Klaim Extra Cost ({extraCostList.length})</span>
						</button>
					</div>
				</div>

				<!-- TAB 1: PENCAIRAN UJO LIST -->
				{#if activeDisbursementTab === 'ujo'}
					<div class="space-y-2.5">
						{#each recentUjoList as ujo}
							<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-500/40 transition-all">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
										<span class="material-symbols-outlined text-base">local_shipping</span>
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<p class="text-xs font-black text-on-surface truncate">{ujo.driver}</p>
											<span class="px-1.5 py-0.2 rounded border text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
												{ujo.payment_status}
											</span>
										</div>
										<p class="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
											{ujo.unit} · {ujo.sales_order_id} · {ujo.route}
										</p>
									</div>
								</div>
								<div class="flex items-center sm:flex-col sm:items-end justify-between text-right shrink-0">
									<span class="text-xs font-mono font-bold text-emerald-600">
										{formatRupiah(ujo.amount)}
									</span>
									<span class="text-[10px] text-slate-400 font-mono">
										{ujo.created_at}
									</span>
								</div>
							</div>
						{/each}

						{#if recentUjoList.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada riwayat pencairan UJO.</p>
						{/if}
					</div>

				<!-- TAB 2: EXTRA COST LIST -->
				{:else}
					<div class="space-y-2.5">
						{#each extraCostList as extra}
							<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-purple-500/40 transition-all">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0">
										<span class="material-symbols-outlined text-base">receipt_long</span>
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<p class="text-xs font-black text-on-surface truncate">{extra.driver}</p>
											<span class="px-1.5 py-0.2 rounded border text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 border-purple-500/20">
												{extra.extra_cost_payment_status}
											</span>
										</div>
										<p class="text-[11px] text-slate-400 truncate mt-0.5">
											{extra.unit} · {extra.sales_order_id} · "{extra.extra_cost_desc}"
										</p>
									</div>
								</div>
								<div class="flex items-center sm:flex-col sm:items-end justify-between text-right shrink-0">
									<span class="text-xs font-mono font-bold text-purple-600">
										{formatRupiah(extra.extra_cost)}
									</span>
									<span class="text-[10px] text-slate-400 font-mono">
										{extra.created_at}
									</span>
								</div>
							</div>
						{/each}

						{#if extraCostList.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Tidak ada klaim extra cost tertunda.</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Link -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Pencairan UJO otomatis memotong saldo brankas kasir operasional</span>
				<a href="/kasir/ujo" class="font-bold text-emerald-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Modul Pencairan UJO</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>

		<!-- Right: Mutasi Buku Kas & Sesi Shift Aktif (5 Kolom) -->
		<div class="lg:col-span-5 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Tab Switcher -->
				<div class="flex items-center justify-between gap-2 mb-4">
					<div class="flex items-center gap-2">
						{#if activeMutasiTab === 'mutations'}
							<span class="material-symbols-outlined text-blue-500 text-xl">receipt_long</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Mutasi Kas Terakhir</h3>
						{:else}
							<span class="material-symbols-outlined text-purple-500 text-xl">badge</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Info Shift Aktif</h3>
						{/if}
					</div>

					<!-- Segmented Switcher -->
					<div class="inline-flex items-center p-0.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70">
						<button
							type="button"
							onclick={() => (activeMutasiTab = 'mutations')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeMutasiTab === 'mutations'
								? 'bg-blue-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Mutasi ({recentTransactions.length})
						</button>
						<button
							type="button"
							onclick={() => (activeMutasiTab = 'shift_info')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeMutasiTab === 'shift_info'
								? 'bg-purple-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Shift
						</button>
					</div>
				</div>

				<!-- TAB 1: MUTASI KAS LIST -->
				{#if activeMutasiTab === 'mutations'}
					<div class="space-y-2.5">
						{#each recentTransactions as tx}
							<div class="flex items-center justify-between p-2.5 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-2.5 min-w-0">
									<div class="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 {tx.direction === 'IN' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}">
										<span class="material-symbols-outlined text-base">
											{tx.direction === 'IN' ? 'arrow_downward' : 'arrow_upward'}
										</span>
									</div>
									<div class="min-w-0">
										<p class="text-xs font-bold text-on-surface truncate">{tx.description}</p>
										<p class="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
											{tx.date} · Oleh: {tx.by || 'Kasir'}
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<span class="text-xs font-black font-mono {tx.direction === 'IN' ? 'text-emerald-600' : 'text-rose-600'}">
										{tx.direction === 'IN' ? '+' : '-'}{formatShortRupiah(tx.amount)}
									</span>
								</div>
							</div>
						{/each}

						{#if recentTransactions.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada catatan mutasi kas.</p>
						{/if}
					</div>

				<!-- TAB 2: SHIFT INFO -->
				{:else}
					<div class="space-y-3">
						{#if shiftSessions.length > 0}
							{@const latest = shiftSessions[0]}
							<div class="p-4 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 space-y-2">
								<div class="flex items-center justify-between">
									<span class="text-xs font-black text-on-surface">{latest.session_number}</span>
									<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-mono font-bold uppercase">
										{latest.status}
									</span>
								</div>
								<p class="text-xs text-slate-400">Kasir Bertugas: <span class="font-bold text-on-surface">{latest.cashier_name}</span></p>
								<div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-[11px] font-mono">
									<div>
										<p class="text-slate-400 text-[10px]">Modal Awal:</p>
										<p class="font-bold text-on-surface">{formatRupiah(latest.opening_cash)}</p>
									</div>
									<div>
										<p class="text-slate-400 text-[10px]">Saldo Akhir:</p>
										<p class="font-bold text-emerald-600">{formatRupiah(latest.actual_closing_cash)}</p>
									</div>
								</div>
							</div>
						{/if}

						<a
							href="/kasir/shift"
							class="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold text-center transition-all inline-block shadow-xs"
						>
							Buka / Tutup Sesi Shift Baru
						</a>
					</div>
				{/if}
			</div>

			<!-- Footer Action -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Audit buku kas & serah terima fisik kasir</span>
				<a href="/kasir/shift" class="font-bold text-purple-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Shift</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>
	</div>
</div>
