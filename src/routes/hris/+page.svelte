<script lang="ts">
	import { systemSettings, formatCurrencyPrivacy } from '$lib/stores/settings';

	let { data } = $props();
	let metrics = $derived(data.metrics);
	let latestPayroll = $derived(data.latestPayroll);

	function formatRupiah(val: number) {
		return formatCurrencyPrivacy(val, $systemSettings.hideSalaryNominals);
	}
</script>

<svelte:head>
	<title>Executive HR Overview | ERP BCS</title>
</svelte:head>

<div class="space-y-8 pb-10">
	<!-- Top Bar / Executive Header -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">dashboard</span>
				</div>
				<div>
					<h1 class="text-2xl font-black text-on-surface tracking-tight">Executive HR Overview</h1>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">
						Ringkasan Manajemen SDM, Kehadiran, Payroll & Benefit PT Buana Centra Swakarsa
					</p>
				</div>
			</div>
		</div>

		<!-- Quick Action Shortcuts -->
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/hris/payroll"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-xs hover:shadow-md hover:brightness-105 transition-all"
			>
				<span class="material-symbols-outlined text-base">bolt</span>
				<span>Hitung Payroll</span>
			</a>
			<a
				href="/hris/employees"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base">group</span>
				<span>Direktori Karyawan</span>
			</a>
			<a
				href="/hris/attendance"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base">schedule</span>
				<span>Log Presensi</span>
			</a>
			<a
				href="/hris/payroll/loans"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base">credit_score</span>
				<span>Kasbon & Pinjaman</span>
			</a>
		</div>
	</div>

	<!-- Top KPI Executive Metric Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Total Karyawan Aktif -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-primary/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Total Karyawan Aktif</span>
				<div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">diversity_3</span>
				</div>
			</div>
			<h3 class="text-3xl font-black text-on-surface tracking-tight">{metrics.totalEmployees}</h3>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				Terdaftar di Master Data PT BCS
			</p>
		</div>

		<!-- Tingkat Kehadiran Bulan Ini -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Tingkat Tepat Waktu</span>
				<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">how_to_reg</span>
				</div>
			</div>
			<div class="flex items-baseline gap-2">
				<h3 class="text-3xl font-black text-emerald-600 tracking-tight">{metrics.onTimePercentage}%</h3>
				<span class="text-xs font-semibold text-slate-400">Bulan Berjalan</span>
			</div>
			<div class="w-full bg-surface-container-high h-2 rounded-full mt-2.5 overflow-hidden">
				<div class="bg-emerald-500 h-full rounded-full" style="width: {metrics.onTimePercentage}%"></div>
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1.5">
				{metrics.totalClockinsThisMonth} Total Clock-in tercatat
			</p>
		</div>

		<!-- Pengeluaran Payroll Terkini -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-blue-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Payroll ({latestPayroll.period_label})</span>
				<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">payments</span>
				</div>
			</div>
			<h3 class="text-2xl font-black text-blue-600 font-mono tracking-tight">{formatRupiah(latestPayroll.total_net)}</h3>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				{latestPayroll.total_slips} Slip Gaji • Rata-rata: {formatRupiah(latestPayroll.avg_net)}
			</p>
		</div>

		<!-- Kasbon & Lembur -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Total Jam Lembur</span>
				<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">more_time</span>
				</div>
			</div>
			<h3 class="text-3xl font-black text-amber-600 font-mono tracking-tight">{metrics.totalOvertimeHours} <span class="text-lg font-bold text-slate-500">Jam</span></h3>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				{metrics.pendingLeaveRequests > 0 ? `${metrics.pendingLeaveRequests} Klaim menunggu persetujuan` : 'Semua klaim terkontrol'}
			</p>
		</div>
	</div>

	<!-- Middle Section: Asymmetric Visual Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Attendance Trend Chart (2 Kolom) -->
		<div class="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
				<div>
					<h3 class="text-lg font-black text-on-surface tracking-tight">Tren Kehadiran Bulanan (2026)</h3>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">Rasio Tepat Waktu vs Terlambat Karyawan</p>
				</div>
				<div class="flex items-center gap-4">
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 rounded-full bg-emerald-500"></span>
						<span class="text-[11px] font-bold text-on-surface-variant">Tepat Waktu</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 rounded-full bg-rose-400"></span>
						<span class="text-[11px] font-bold text-on-surface-variant">Terlambat</span>
					</div>
				</div>
			</div>

			<!-- Visual Bar Representation -->
			<div class="h-60 w-full flex items-end justify-between px-2 gap-3 pt-6 border-b border-slate-200 dark:border-slate-800 pb-2">
				{#each data.attendanceTrend as trend}
					<div class="flex flex-col items-center flex-1 gap-2 h-full group cursor-pointer">
						<div class="w-full flex items-end justify-center gap-1.5 h-full relative">
							<!-- On-Time Bar -->
							<div class="w-6 sm:w-8 bg-emerald-500/80 group-hover:bg-emerald-500 rounded-t-lg transition-all duration-200" style="height: {trend.onTime}"></div>
							<!-- Late Bar -->
							<div class="w-6 sm:w-8 bg-rose-400/80 group-hover:bg-rose-500 rounded-t-lg transition-all duration-200" style="height: {trend.late}"></div>

							<!-- Tooltip -->
							<div class="absolute -top-10 bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-20">
								Tepat: {trend.onTime} | Terlambat: {trend.late} ({trend.totalPresent} log)
							</div>
						</div>
						<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-primary transition-colors">{trend.month}</span>
					</div>
				{/each}
			</div>

			<div class="mt-4 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Log presensi harian otomatis terintegrasi dari modul Attendance</span>
				<a href="/hris/attendance" class="font-bold text-primary hover:underline inline-flex items-center gap-1">
					<span>Buka Rekap Presensi</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>

		<!-- Distribusi Karyawan per Divisi (1 Kolom) -->
		<div class="p-6 sm:p-8 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-4">
					<div>
						<h3 class="text-lg font-black text-on-surface tracking-tight">Komposisi Divisi</h3>
						<p class="text-xs text-on-surface-variant font-medium mt-0.5">Distribusi Penempatan Tenaga Kerja</p>
					</div>
					<span class="material-symbols-outlined text-slate-400">pie_chart</span>
				</div>

				<div class="space-y-4 my-4">
					{#each data.divisions as div}
						<div class="space-y-1.5">
							<div class="flex items-center justify-between text-xs">
								<span class="font-bold text-on-surface truncate max-w-[180px]">{div.division}</span>
								<span class="font-mono font-bold text-slate-500">{div.count} staf ({div.percentage}%)</span>
							</div>
							<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
								<div
									class="h-full rounded-full transition-all duration-500 {div.division.includes('OPERATION') ? 'bg-primary' : div.division.includes('HUMAN') ? 'bg-indigo-500' : 'bg-blue-400'}"
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
				Lihat Semua Master Karyawan ({metrics.totalEmployees})
			</a>
		</div>
	</div>

	<!-- Bottom Section (3 Kolom: Ulang Tahun, Masa Kerja / Anniversaries, dan Aktivitas Terkini) -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<!-- Ulang Tahun Bulan Ini -->
		<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-pink-500 text-xl">cake</span>
						<h3 class="font-black text-base text-on-surface tracking-tight">Ulang Tahun Bulan Ini</h3>
					</div>
					<span class="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 text-[10px] font-bold font-mono">Agustus</span>
				</div>

				<div class="space-y-3">
					{#each data.birthdays as bday}
						<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
							<div class="flex items-center gap-3">
								<div class="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-600 flex items-center justify-center font-black text-xs">
									{bday.name.substring(0, 2).toUpperCase()}
								</div>
								<div>
									<p class="text-xs font-bold text-on-surface truncate max-w-[130px]">{bday.name}</p>
									<p class="text-[10px] text-slate-400 truncate max-w-[130px]">{bday.division}</p>
								</div>
							</div>
							<div class="text-right">
								<span class="text-xs font-bold font-mono text-on-surface">{bday.day_of_month} Agu</span>
							</div>
						</div>
					{/each}
					{#if data.birthdays.length === 0}
						<p class="text-xs text-slate-400 italic py-4 text-center">Tidak ada jadwal ulang tahun bulan ini.</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Masa Kerja & Dedikasi Karyawan (Anniversaries) -->
		<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-500 text-xl">military_tech</span>
						<h3 class="font-black text-base text-on-surface tracking-tight">Masa Kerja (Anniversary)</h3>
					</div>
					<span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold font-mono">Dedikasi</span>
				</div>

				<div class="space-y-3">
					{#each data.anniversaries as ann}
						<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
							<div class="flex items-center gap-3">
								<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">
									{ann.years}th
								</div>
								<div>
									<p class="text-xs font-bold text-on-surface truncate max-w-[130px]">{ann.name}</p>
									<p class="text-[10px] text-slate-400 truncate max-w-[130px]">{ann.division}</p>
								</div>
							</div>
							<div class="text-right">
								<span class="text-xs font-black font-mono text-amber-600">{ann.years} Tahun</span>
							</div>
						</div>
					{/each}
					{#if data.anniversaries.length === 0}
						<p class="text-xs text-slate-400 italic py-4 text-center">Tidak ada perayaan masa kerja bulan ini.</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Aktivitas Presensi & Audit Terkini -->
		<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-blue-500 text-xl">history</span>
						<h3 class="font-black text-base text-on-surface tracking-tight">Aktivitas Terkini</h3>
					</div>
					<span class="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-bold font-mono">Live Feed</span>
				</div>

				<div class="space-y-3">
					{#each data.recentActivity as act}
						<div class="p-3 rounded-2xl bg-surface border border-slate-100 dark:border-slate-800/60 text-xs">
							<div class="flex items-center justify-between mb-1">
								<span class="font-bold text-[10px] uppercase px-1.5 py-0.5 rounded {act.event === 'warning' ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'} font-mono">
									{act.log_name}
								</span>
								<span class="text-[10px] text-slate-400 font-mono">
									{new Date(act.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
								</span>
							</div>
							<p class="text-on-surface font-medium text-[11px] leading-snug line-clamp-2">
								{act.description}
							</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
