<script lang="ts">
	import { systemSettings, formatCurrencyPrivacy } from '$lib/stores/settings';

	let { data } = $props();
	let metrics = $derived(data.metrics);
	let latestPayroll = $derived(data.latestPayroll);
	let pipeline = $derived(data.workforcePipeline);

	let activeChartTab = $state<'attendance' | 'payroll' | 'workforce'>('attendance');
	let activeApprovalTab = $state<'leaves' | 'overtime'>('leaves');
	let activeEngagementTab = $state<'birthdays' | 'anniversaries' | 'activity'>('birthdays');

	function formatRupiah(val: any) {
		return formatCurrencyPrivacy(Number(val) || 0, $systemSettings.hideSalaryNominals);
	}

	function formatShortRupiah(val: any) {
		if ($systemSettings.hideSalaryNominals) return 'Rp •••';
		const num = Number(val) || 0;
		if (num >= 1_000_000_000) {
			return `Rp ${(num / 1_000_000_000).toFixed(2).replace('.', ',')} M`;
		}
		if (num >= 1_000_000) {
			return `Rp ${Math.round(num / 1_000_000)} Jt`;
		}
		return formatRupiah(num);
	}

	function getStatusColor(status: string) {
		const s = (status || '').toUpperCase();
		if (s.includes('PERMANENT') || s.includes('TETAP')) return 'bg-emerald-500';
		if (s.includes('CONTRACT') || s.includes('KONTRAK') || s.includes('PKWT')) return 'bg-blue-500';
		if (s.includes('MITRA')) return 'bg-indigo-500';
		if (s.includes('BORONGAN')) return 'bg-amber-500';
		if (s.includes('HARIAN')) return 'bg-cyan-500';
		return 'bg-slate-400';
	}

	function getDivisionColor(divName: string) {
		const s = (divName || '').toUpperCase();
		if (s.includes('OPERATION')) return 'bg-primary text-primary';
		if (s.includes('HUMAN') || s.includes('HC')) return 'bg-indigo-500 text-indigo-500';
		if (s.includes('BUSINESS')) return 'bg-amber-500 text-amber-500';
		if (s.includes('FINANCE')) return 'bg-blue-500 text-blue-500';
		if (s.includes('DIREKTORAT')) return 'bg-purple-500 text-purple-500';
		return 'bg-slate-400 text-slate-400';
	}

	function formatDateLabel(dateStr: string | null | undefined) {
		if (!dateStr) return '-';
		try {
			return new Date(dateStr).toLocaleDateString('id-ID', {
				day: 'numeric',
				month: 'short'
			});
		} catch {
			return dateStr;
		}
	}
</script>

<svelte:head>
	<title>HR Dashboard | ERP BCS</title>
</svelte:head>

<div class="space-y-6 pb-12">
	<!-- 1. Executive Header & Quick Action Buttons -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">groups</span>
				</div>
				<div>
					<h1 class="text-2xl font-black text-on-surface tracking-tight">HR Command Center</h1>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">
						Manajemen SDM, Kesiapan Personel Operasional, Presensi & Analitik Payroll PT BCS
					</p>
				</div>
			</div>
		</div>

		<!-- Action Shortcuts -->
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/hris/payroll"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base text-blue-600">payments</span>
				<span>Hitung Payroll</span>
			</a>
			<a
				href="/hris/leave"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base text-amber-600">event_available</span>
				<span>Verifikasi Cuti</span>
				{#if metrics.pendingLeaveRequests > 0}
					<span class="px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-mono font-bold">
						{metrics.pendingLeaveRequests}
					</span>
				{/if}
			</a>
			<a
				href="/hris/attendance"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base text-emerald-600">how_to_reg</span>
				<span>Log Presensi</span>
			</a>
			<a
				href="/hris/employees"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base text-purple-600">badge</span>
				<span>Direktori Staf</span>
			</a>
		</div>
	</div>

	<!-- 2. Top Bento KPI Executive Metric Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Total Karyawan Aktif -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-primary/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Total Karyawan Aktif</span>
				<div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">diversity_3</span>
				</div>
			</div>
			<div class="flex items-baseline gap-2">
				<h3 class="text-3xl font-black text-on-surface tracking-tight">{metrics.totalEmployees}</h3>
				<span class="text-xs font-semibold text-on-surface-variant">Staf</span>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				Terdata aktif di Master Data PT BCS
			</p>
		</div>

		<!-- Tingkat Tepat Waktu -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Tingkat Tepat Waktu</span>
				<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">how_to_reg</span>
				</div>
			</div>
			<div class="flex items-baseline gap-2">
				<h3 class="text-3xl font-black text-emerald-600 tracking-tight">{metrics.onTimePercentage}%</h3>
				<span class="text-xs font-semibold text-slate-400">Presensi Shift Aktif</span>
			</div>
			<div class="w-full bg-surface-container-high h-2 rounded-full mt-2.5 overflow-hidden">
				<div class="bg-emerald-500 h-full rounded-full transition-all duration-500" style="width: {metrics.onTimePercentage}%"></div>
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1.5">
				{pipeline.onTime} tepat waktu dari {pipeline.totalPresent} personil check-in
			</p>
		</div>

		<!-- Pengeluaran Payroll Terkini -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-blue-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Realisasi Payroll ({latestPayroll.period_label})</span>
				<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">payments</span>
				</div>
			</div>
			<h3 class="text-2xl font-black text-blue-600 font-mono tracking-tight">{formatRupiah(latestPayroll.total_net)}</h3>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				{latestPayroll.total_slips} Slip • Rata-rata: {formatRupiah(latestPayroll.avg_net)}
			</p>
		</div>

		<!-- Antrean Approval & Tindakan SDM -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Antrean Verifikasi SDM</span>
				<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">pending_actions</span>
				</div>
			</div>
			<div class="flex items-baseline gap-2">
				<h3 class="text-3xl font-black text-amber-600 font-mono tracking-tight">{metrics.totalPendingActions}</h3>
				<span class="text-xs font-semibold text-slate-400">Berkas Pending</span>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				{metrics.pendingLeaveRequests} Cuti & {metrics.pendingOvertimeRequests} Lembur butuh approval
			</p>
		</div>
	</div>

	<!-- 3. Operational Workforce Pipeline Strip (NEW) -->
	<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-primary text-xl">alt_route</span>
				<h2 class="text-sm font-black text-on-surface tracking-tight uppercase">
					Workforce Operational Readiness Pipeline
				</h2>
			</div>
			<div class="flex items-center gap-2 text-[11px] font-mono text-on-surface-variant">
				<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
				<span>Update Presensi: {formatDateLabel(pipeline.reportDate)}</span>
			</div>
		</div>

		<!-- Continuous Horizontal Pipeline Strip -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
			<!-- Stage 1: Hadir On-Duty -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-emerald-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">check_circle</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">1. Hadir On-Duty</p>
						<p class="text-sm font-black text-on-surface">{pipeline.onTime} Staf</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-mono font-bold">
					{pipeline.onTimeRatio}%
				</span>
			</div>

			<!-- Stage 2: Terlambat Masuk -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-amber-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">schedule</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">2. Terlambat Masuk</p>
						<p class="text-sm font-black text-on-surface">{pipeline.late} Staf</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-mono font-bold">
					{pipeline.lateRatio}%
				</span>
			</div>

			<!-- Stage 3: Cuti Resmi Disetujui -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-blue-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">event_available</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">3. Cuti Disetujui</p>
						<p class="text-sm font-black text-on-surface">{pipeline.approvedLeaves} Staf</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-mono font-bold">
					{data.currentMonthName}
				</span>
			</div>

			<!-- Stage 4: Menunggu Approval HR -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-rose-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">rule</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">4. Perlu Tindakan</p>
						<p class="text-sm font-black text-rose-600">{pipeline.totalPending} Berkas</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-mono font-bold">
					Action Needed
				</span>
			</div>
		</div>
	</div>

	<!-- 4. Visual Analytics Zone (Grid 12-col: 8 vs 4) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- Left: Interactive Multi-Tab Analytics Panel (8 Kolom) -->
		<div class="lg:col-span-8 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header & Tab Controls -->
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
					<div>
						{#if activeChartTab === 'attendance'}
							<h3 class="text-base font-black text-on-surface tracking-tight">Tren Kehadiran Bulanan (2026)</h3>
							<p class="text-xs text-on-surface-variant font-medium mt-0.5">Rasio Kehadiran Tepat Waktu vs Terlambat Staf Lapangan & Kantor</p>
						{:else if activeChartTab === 'payroll'}
							<h3 class="text-base font-black text-on-surface tracking-tight">Tren Biaya Payroll & Variabel (2026)</h3>
							<p class="text-xs text-on-surface-variant font-medium mt-0.5">Komposisi Take Home Pay (THP) vs Tunjangan Variabel (Lembur & Makan/Transport)</p>
						{:else}
							<h3 class="text-base font-black text-on-surface tracking-tight">Profil Ikatan Kerja & Loyalitas Masa Kerja</h3>
							<p class="text-xs text-on-surface-variant font-medium mt-0.5">Komposisi PKWT/PKWTT/Mitra & Distribusi Masa Kerja (Tenure) Staf Aktif</p>
						{/if}
					</div>

					<!-- Segmented Tab Switcher -->
					<div class="inline-flex items-center p-1 rounded-2xl bg-surface border border-slate-200/70 dark:border-slate-800/70 self-start">
						<button
							type="button"
							onclick={() => (activeChartTab = 'attendance')}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeChartTab === 'attendance'
								? 'bg-primary text-on-primary shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">how_to_reg</span>
							<span>Kehadiran</span>
						</button>
						<button
							type="button"
							onclick={() => (activeChartTab = 'payroll')}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeChartTab === 'payroll'
								? 'bg-primary text-on-primary shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">payments</span>
							<span>Payroll</span>
						</button>
						<button
							type="button"
							onclick={() => (activeChartTab = 'workforce')}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeChartTab === 'workforce'
								? 'bg-primary text-on-primary shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">badge</span>
							<span>Ikatan & Masa Kerja</span>
						</button>
					</div>
				</div>

				<!-- TAB 1: TREN KEHADIRAN BULANAN -->
				{#if activeChartTab === 'attendance'}
					<div class="flex items-center justify-end gap-4 mb-2">
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
							<span class="text-[11px] font-bold text-on-surface-variant">Tepat Waktu</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
							<span class="text-[11px] font-bold text-on-surface-variant">Terlambat</span>
						</div>
					</div>

					<div class="h-56 w-full flex items-end justify-between px-2 gap-3 pt-6 border-b border-slate-200 dark:border-slate-800 pb-2">
						{#each data.attendanceTrend as trend}
							<div class="flex flex-col items-center flex-1 gap-2 h-full group cursor-pointer">
								<div class="w-full flex items-end justify-center gap-1.5 h-full relative">
									<!-- On-Time Ratio -->
									<span class="absolute -top-6 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
										{trend.onTimeRatio ?? 0}%
									</span>

									<!-- On-Time Bar -->
									<div
										class="w-5 sm:w-7 bg-emerald-500/85 group-hover:bg-emerald-500 rounded-t-lg transition-all duration-300"
										style="height: {trend.onTimePct ?? 10}%"
									></div>
									<!-- Late Bar -->
									<div
										class="w-5 sm:w-7 bg-rose-400/85 group-hover:bg-rose-500 rounded-t-lg transition-all duration-300"
										style="height: {trend.latePct ?? 5}%"
									></div>

									<!-- Tooltip -->
									<div class="absolute -top-14 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-20">
										Tepat: {trend.onTime} | Terlambat: {trend.late} ({trend.totalPresent} log)
									</div>
								</div>
								<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-primary transition-colors">{trend.month}</span>
							</div>
						{/each}
					</div>

				<!-- TAB 2: TREN BIAYA PAYROLL -->
				{:else if activeChartTab === 'payroll'}
					<div class="flex items-center justify-end gap-4 mb-2">
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
							<span class="text-[11px] font-bold text-on-surface-variant">Net THP</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
							<span class="text-[11px] font-bold text-on-surface-variant">Variabel (Lembur + UJO)</span>
						</div>
					</div>

					<div class="h-56 w-full flex items-end justify-between px-2 gap-3 pt-6 border-b border-slate-200 dark:border-slate-800 pb-2">
						{#each data.payrollTrend || [] as item}
							<div class="flex flex-col items-center flex-1 gap-2 h-full group cursor-pointer">
								<div class="w-full flex items-end justify-center gap-1.5 h-full relative">
									<!-- THP Label -->
									<span class="absolute -top-6 text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
										{formatShortRupiah(item.total_net)}
									</span>

									<!-- Net THP Bar -->
									<div
										class="w-6 sm:w-8 bg-blue-600/85 group-hover:bg-blue-600 rounded-t-lg transition-all duration-300"
										style="height: {item.netPct}%"
									></div>
									<!-- Variable Allowance Bar -->
									<div
										class="w-6 sm:w-8 bg-amber-500/85 group-hover:bg-amber-500 rounded-t-lg transition-all duration-300"
										style="height: {item.varPct}%"
									></div>

									<!-- Tooltip -->
									<div class="absolute -top-22 bg-slate-900 text-white px-3 py-2 rounded-xl text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-20 space-y-0.5">
										<p class="font-black text-blue-300">{item.month_label} ({item.total_slips} Slip)</p>
										<p>Net THP: <span class="font-mono font-bold">{formatRupiah(item.total_net)}</span></p>
										<p>Lembur: <span class="font-mono font-bold text-amber-300">{formatRupiah(item.total_ot)}</span></p>
										<p>Makan & Trans: <span class="font-mono font-bold text-emerald-300">{formatRupiah(item.total_meal_trans)}</span></p>
									</div>
								</div>
								<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-primary transition-colors">{item.month}</span>
							</div>
						{/each}
					</div>

				<!-- TAB 3: IKATAN KERJA & SEBARAN MASA KERJA -->
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 py-1">
						<!-- Sub-panel: Status Ikatan Kerja -->
						<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-xs font-black text-on-surface uppercase tracking-wider">Status Hubungan Kerja</span>
								<span class="text-[10px] font-mono font-bold text-slate-400">{metrics.totalEmployees} Staf Aktif</span>
							</div>
							<div class="space-y-2.5">
								{#each data.employmentStatus || [] as st}
									<div class="space-y-1">
										<div class="flex items-center justify-between text-xs">
											<div class="flex items-center gap-2">
												<span class="w-2.5 h-2.5 rounded-full {getStatusColor(st.status)}"></span>
												<span class="font-bold text-on-surface">{st.status}</span>
											</div>
											<span class="font-mono font-bold text-slate-500">{st.count} ({st.percentage}%)</span>
										</div>
										<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
											<div class="h-full rounded-full {getStatusColor(st.status)} transition-all duration-500" style="width: {st.percentage}%"></div>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- Sub-panel: Masa Kerja (Tenure) -->
						<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-xs font-black text-on-surface uppercase tracking-wider">Sebaran Masa Kerja (Tenure)</span>
								<span class="text-[10px] font-mono font-bold text-amber-600">Loyalitas Organisasi</span>
							</div>
							<div class="space-y-2.5">
								{#each data.tenureDistribution || [] as tn}
									<div class="space-y-1">
										<div class="flex items-center justify-between text-xs">
											<span class="font-bold text-on-surface">{tn.label}</span>
											<span class="font-mono font-bold text-slate-500">{tn.count} staf ({tn.percentage}%)</span>
										</div>
										<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
											<div class="h-full rounded-full bg-primary transition-all duration-500" style="width: {tn.percentage}%"></div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Footer Context Action -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				{#if activeChartTab === 'attendance'}
					<span>Data presensi harian otomatis terintegrasi dari modul Attendance</span>
					<a href="/hris/attendance" class="font-bold text-primary hover:underline inline-flex items-center gap-1">
						<span>Buka Rekap Presensi Lengkap</span>
						<span class="material-symbols-outlined text-xs">arrow_forward</span>
					</a>
				{:else if activeChartTab === 'payroll'}
					<span>Real-time slip gaji dari database <code class="font-mono text-[11px]">presensi.salary_slips</code></span>
					<a href="/hris/payroll" class="font-bold text-primary hover:underline inline-flex items-center gap-1">
						<span>Kelola Payroll & Saldo Pinjaman</span>
						<span class="material-symbols-outlined text-xs">arrow_forward</span>
					</a>
				{:else}
					<span>Data kepegawaian sinkron dengan <code class="font-mono text-[11px]">master.m_karyawan</code></span>
					<a href="/hris/employees" class="font-bold text-primary hover:underline inline-flex items-center gap-1">
						<span>Buka Direktori Karyawan</span>
						<span class="material-symbols-outlined text-xs">arrow_forward</span>
					</a>
				{/if}
			</div>
		</div>

		<!-- Right: Komposisi Divisi (4 Kolom) -->
		<div class="lg:col-span-4 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-4">
					<div>
						<h3 class="text-base font-black text-on-surface tracking-tight">Komposisi Divisi</h3>
						<p class="text-xs text-on-surface-variant font-medium mt-0.5">Penempatan Staf Operasional & Korporat</p>
					</div>
					<span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-bold">
						{data.divisions.length} Unit
					</span>
				</div>

				<!-- Division Bars -->
				<div class="space-y-3.5 my-2">
					{#each data.divisions as div}
						<div class="p-2.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 space-y-1.5">
							<div class="flex items-center justify-between text-xs">
								<span class="font-bold text-on-surface truncate max-w-[170px]" title={div.division}>
									{div.division}
								</span>
								<span class="font-mono font-bold text-on-surface-variant">
									{div.count} <span class="text-[10px] text-slate-400 font-normal">({div.percentage}%)</span>
								</span>
							</div>
							<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
								<div
									class="h-full rounded-full transition-all duration-500 {getDivisionColor(div.division).split(' ')[0]}"
									style="width: {div.percentage}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<a
				href="/hris/employees"
				class="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container text-center transition-all inline-block mt-4"
			>
				Lihat Direktori Seluruh Staf ({metrics.totalEmployees})
			</a>
		</div>
	</div>

	<!-- 5. Balanced Bottom Operational Section (Grid 12-col: 7 vs 5) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- Left: Actionable Approval Queue (7 Kolom) -->
		<div class="lg:col-span-7 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Tab Switcher -->
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-500 text-xl">fact_check</span>
						<div>
							<h3 class="font-black text-base text-on-surface tracking-tight">Antrean Persetujuan SDM</h3>
							<p class="text-xs text-on-surface-variant font-medium">Permohonan Izin/Cuti & Lembur Menunggu Verifikasi</p>
						</div>
					</div>

					<!-- Segmented Approval Switcher -->
					<div class="inline-flex items-center p-1 rounded-2xl bg-surface border border-slate-200/70 dark:border-slate-800/70 self-start">
						<button
							type="button"
							onclick={() => (activeApprovalTab = 'leaves')}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeApprovalTab === 'leaves'
								? 'bg-amber-500 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">event_busy</span>
							<span>Cuti ({data.pendingLeaves.length})</span>
						</button>
						<button
							type="button"
							onclick={() => (activeApprovalTab = 'overtime')}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeApprovalTab === 'overtime'
								? 'bg-amber-500 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">schedule</span>
							<span>Lembur ({data.pendingOvertime.length})</span>
						</button>
					</div>
				</div>

				<!-- CONTENT TAB 1: PENDING LEAVES -->
				{#if activeApprovalTab === 'leaves'}
					<div class="space-y-2.5">
						{#each data.pendingLeaves as leave}
							<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-500/40 transition-all">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs shrink-0">
										{leave.employee_name ? leave.employee_name.substring(0, 2).toUpperCase() : 'ST'}
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<p class="text-xs font-black text-on-surface truncate">{leave.employee_name || 'Karyawan'}</p>
											<span class="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
												{leave.type}
											</span>
										</div>
										<p class="text-[11px] text-slate-400 truncate mt-0.5">
											{leave.division} • Alasan: <span class="italic text-on-surface-variant">"{leave.reason || 'Keperluan pribadi'}"</span>
										</p>
									</div>
								</div>
								<div class="flex items-center sm:flex-col sm:items-end justify-between text-right shrink-0">
									<span class="text-xs font-mono font-bold text-on-surface">
										{formatDateLabel(leave.start_date)}
										{#if leave.end_date && leave.end_date !== leave.start_date}
											- {formatDateLabel(leave.end_date)}
										{/if}
									</span>
									<span class="text-[10px] font-mono text-amber-600 font-bold uppercase tracking-wider">
										Menunggu Approval
									</span>
								</div>
							</div>
						{/each}

						{#if data.pendingLeaves.length === 0}
							<div class="p-8 text-center bg-surface rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
								<span class="material-symbols-outlined text-3xl text-emerald-500">task_alt</span>
								<p class="text-xs font-bold text-on-surface mt-2">Semua Pengajuan Cuti Telah Diverifikasi</p>
								<p class="text-[11px] text-slate-400">Tidak ada pengajuan cuti yang tertunda saat ini.</p>
							</div>
						{/if}
					</div>

				<!-- CONTENT TAB 2: PENDING OVERTIME -->
				{:else}
					<div class="space-y-2.5">
						{#each data.pendingOvertime as ot}
							<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-500/40 transition-all">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black text-xs shrink-0">
										{ot.employee_name ? ot.employee_name.substring(0, 2).toUpperCase() : 'OT'}
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<p class="text-xs font-black text-on-surface truncate">{ot.employee_name || 'Karyawan'}</p>
											<span class="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-mono font-bold">
												{ot.start_time?.substring(0, 5)} - {ot.end_time?.substring(0, 5)}
											</span>
										</div>
										<p class="text-[11px] text-slate-400 truncate mt-0.5">
											{ot.division} • Uraian: <span class="italic text-on-surface-variant">"{ot.reason || 'Tugas operasional'}"</span>
										</p>
									</div>
								</div>
								<div class="flex items-center sm:flex-col sm:items-end justify-between text-right shrink-0">
									<span class="text-xs font-mono font-bold text-on-surface">
										{formatDateLabel(ot.start_date)}
									</span>
									<span class="text-[10px] font-mono text-blue-600 font-bold uppercase tracking-wider">
										Review Mandor/HR
									</span>
								</div>
							</div>
						{/each}

						{#if data.pendingOvertime.length === 0}
							<div class="p-8 text-center bg-surface rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
								<span class="material-symbols-outlined text-3xl text-emerald-500">task_alt</span>
								<p class="text-xs font-bold text-on-surface mt-2">Semua Pengajuan Lembur Telah Diverifikasi</p>
								<p class="text-[11px] text-slate-400">Tidak ada pengajuan lembur yang menunggu persetujuan.</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Quick Action to Full Workflow -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				{#if activeApprovalTab === 'leaves'}
					<span>Terdapat total {metrics.pendingLeaveRequests} permohonan cuti aktif di database</span>
					<a href="/hris/leave" class="font-bold text-amber-600 hover:underline inline-flex items-center gap-1">
						<span>Buka Modul Cuti & Approval</span>
						<span class="material-symbols-outlined text-xs">arrow_forward</span>
					</a>
				{:else}
					<span>Terdapat total {metrics.pendingOvertimeRequests} permohonan lembur aktif di database</span>
					<a href="/hris/attendance" class="font-bold text-amber-600 hover:underline inline-flex items-center gap-1">
						<span>Buka Log Presensi & Lembur</span>
						<span class="material-symbols-outlined text-xs">arrow_forward</span>
					</a>
				{/if}
			</div>
		</div>

		<!-- Right: Employee Engagement & Live Audit Stream (5 Kolom) -->
		<div class="lg:col-span-5 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Tab Switcher -->
				<div class="flex items-center justify-between gap-2 mb-4">
					<div class="flex items-center gap-2">
						{#if activeEngagementTab === 'birthdays'}
							<span class="material-symbols-outlined text-pink-500 text-xl">cake</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Ulang Tahun</h3>
						{:else if activeEngagementTab === 'anniversaries'}
							<span class="material-symbols-outlined text-amber-500 text-xl">military_tech</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Masa Kerja (Anniversary)</h3>
						{:else}
							<span class="material-symbols-outlined text-blue-500 text-xl">history</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Audit Trail</h3>
						{/if}
					</div>

					<!-- Segmented Engagement Switcher -->
					<div class="inline-flex items-center p-0.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70">
						<button
							type="button"
							onclick={() => (activeEngagementTab = 'birthdays')}
							title="Ulang Tahun Bulan Ini"
							class="p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer {activeEngagementTab === 'birthdays'
								? 'bg-pink-500 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">cake</span>
						</button>
						<button
							type="button"
							onclick={() => (activeEngagementTab = 'anniversaries')}
							title="Dedikasi Masa Kerja"
							class="p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer {activeEngagementTab === 'anniversaries'
								? 'bg-amber-500 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">military_tech</span>
						</button>
						<button
							type="button"
							onclick={() => (activeEngagementTab = 'activity')}
							title="Log Aktivitas & Audit"
							class="p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer {activeEngagementTab === 'activity'
								? 'bg-blue-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">history</span>
						</button>
					</div>
				</div>

				<!-- TAB 1: ULANG TAHUN BULAN INI (Dinamis: {data.currentMonthName}) -->
				{#if activeEngagementTab === 'birthdays'}
					<div class="flex items-center justify-between mb-3 text-[11px]">
						<span class="text-slate-400 font-medium">Jadwal Perayaan Bulan:</span>
						<span class="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 font-mono font-bold">
							{data.currentMonthName}
						</span>
					</div>

					<div class="space-y-2.5">
						{#each data.birthdays as bday}
							<div class="flex items-center justify-between p-2.5 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-2.5 min-w-0">
									<div class="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 flex items-center justify-center font-black text-xs shrink-0">
										{bday.name.substring(0, 2).toUpperCase()}
									</div>
									<div class="min-w-0">
										<p class="text-xs font-bold text-on-surface truncate">{bday.name}</p>
										<p class="text-[10px] text-slate-400 truncate">{bday.division}</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<span class="text-xs font-bold font-mono text-pink-600">
										{bday.day_of_month} {data.currentMonthName.substring(0, 3)}
									</span>
								</div>
							</div>
						{/each}

						{#if data.birthdays.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Tidak ada jadwal ulang tahun di bulan {data.currentMonthName}.</p>
						{/if}
					</div>

				<!-- TAB 2: MASA KERJA / DEDIKASI ANNIVERSARY -->
				{:else if activeEngagementTab === 'anniversaries'}
					<div class="flex items-center justify-between mb-3 text-[11px]">
						<span class="text-slate-400 font-medium">Dedikasi Karyawan Bulan:</span>
						<span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-mono font-bold">
							{data.currentMonthName}
						</span>
					</div>

					<div class="space-y-2.5">
						{#each data.anniversaries as ann}
							<div class="flex items-center justify-between p-2.5 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-2.5 min-w-0">
									<div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs shrink-0">
										{ann.years}th
									</div>
									<div class="min-w-0">
										<p class="text-xs font-bold text-on-surface truncate">{ann.name}</p>
										<p class="text-[10px] text-slate-400 truncate">{ann.division}</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<span class="text-xs font-black font-mono text-amber-600">{ann.years} Tahun</span>
								</div>
							</div>
						{/each}

						{#if data.anniversaries.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Tidak ada perayaan masa kerja di bulan {data.currentMonthName}.</p>
						{/if}
					</div>

				<!-- TAB 3: AUDIT TRAIL / LOG AKTIVITAS -->
				{:else}
					<div class="flex items-center justify-between mb-3 text-[11px]">
						<span class="text-slate-400 font-medium">Riwayat Akses Modul:</span>
						<span class="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-mono font-bold">
							Live Stream
						</span>
					</div>

					<div class="space-y-2.5">
						{#each data.recentActivity as act}
							<div class="p-2.5 rounded-2xl bg-surface border border-slate-100 dark:border-slate-800/60 text-xs">
								<div class="flex items-center justify-between mb-1">
									<span class="font-bold text-[10px] uppercase px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 font-mono">
										{act.module_code || 'HRIS'}
									</span>
									<span class="text-[10px] text-slate-400 font-mono">
										{new Date(act.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
									</span>
								</div>
								<p class="text-on-surface font-medium text-[11px] leading-snug line-clamp-1">
									{act.description}
								</p>
							</div>
						{/each}

						{#if data.recentActivity.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada riwayat aktivitas yang tercatat.</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Info -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Apresiasi loyalitas & retensi SDM BCS</span>
				<span class="font-mono text-[10px] text-slate-400">{data.metrics.totalEmployees} Anggota</span>
			</div>
		</div>
	</div>
</div>
