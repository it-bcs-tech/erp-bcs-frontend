<script lang="ts">
	let { data } = $props();

	// Tab states
	let activeLeftTab = $state<'wo' | 'atk'>('wo');
	let activeRightTab = $state<'rooms' | 'carpool'>('rooms');
	let selectedMonthIdx = $state<number | null>(null);

	function formatDate(d: string | null) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function getUrgencyBadge(urgency: string) {
		switch (urgency) {
			case 'EMERGENCY':
				return 'bg-rose-500/10 text-rose-600 border border-rose-500/20 font-black animate-pulse';
			case 'HIGH':
				return 'bg-orange-500/10 text-orange-600 border border-orange-500/20 font-bold';
			case 'MEDIUM':
				return 'bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium';
			default:
				return 'bg-slate-500/10 text-slate-600 border border-slate-500/20 font-medium';
		}
	}

	function getWoStatusBadge(status: string) {
		switch (status) {
			case 'COMPLETED':
				return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
			case 'IN_PROGRESS':
				return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
			case 'APPROVED':
				return 'bg-purple-500/10 text-purple-600 border border-purple-500/20';
			default:
				return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
		}
	}
</script>

<svelte:head>
	<title>GA Command Center | ERP BCS</title>
</svelte:head>

<div class="space-y-6 pb-8">
	<!-- HEADER SECTION -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">domain</span>
				</div>
				<div>
					<h1 class="text-2xl font-black text-on-surface tracking-tight">GA Command Center</h1>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">
						Pusat kendali operasional fasilitas, reservasi ruang rapat, armada carpool &amp; SPD dinas, tiket perbaikan gedung, dan stok ATK
					</p>
				</div>
			</div>
		</div>

		<!-- Action CTAs -->
		<div class="flex flex-wrap items-center gap-2.5">
			<a
				href="/ga/room-bookings"
				class="px-3.5 py-2 rounded-xl bg-surface border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-on-surface hover:bg-surface-container transition-all flex items-center gap-1.5 shadow-xs"
			>
				<span class="material-symbols-outlined text-base text-amber-600">meeting_room</span>
				<span>Reservasi Ruangan</span>
			</a>
			<a
				href="/ga/visitors"
				class="px-3.5 py-2 rounded-xl bg-surface border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-on-surface hover:bg-surface-container transition-all flex items-center gap-1.5 shadow-xs"
			>
				<span class="material-symbols-outlined text-base text-emerald-600">badge</span>
				<span>Buku Tamu ({data.visitors.total_visitors})</span>
			</a>
			<a
				href="/ga/facilities"
				class="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">home_repair_service</span>
				<span>+ Buat Tiket WO</span>
			</a>
		</div>
	</header>

	<!-- ZONA 1: 4 EXECUTIVE BENTO KPI CARDS -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- 1. Throughput Layanan Internal -->
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Layanan Internal GA</span>
					<h2 class="text-2xl font-black text-cyan-600 mt-1 font-mono tracking-tight">
						{(data.serviceStats?.totalServices ?? 0).toLocaleString('id-ID')} <span class="text-sm font-bold">Request</span>
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">domain</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">
					<strong class="text-on-surface">{(data.serviceStats?.inProgressServices ?? data.serviceStats?.inProgressRequests ?? 0).toLocaleString('id-ID')}</strong> Berjalan
				</span>
				<span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold font-mono text-[10px]">
					{(data.serviceStats?.pendingServices ?? data.serviceStats?.pendingRequests ?? 0).toLocaleString('id-ID')} Review
				</span>
			</div>
		</div>

		<!-- 2. Utilisasi Ruang Rapat & Fasilitas -->
		<a
			href="/ga/room-bookings"
			class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between hover:border-amber-500/40 transition-colors"
		>
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Ruang Pertemuan</span>
					<h2 class="text-2xl font-black text-amber-600 mt-1 font-mono tracking-tight">
						{data.roomBookings?.stats?.active_rooms ?? 0} <span class="text-sm font-bold">Ruangan</span>
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">meeting_room</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">
					<strong class="text-emerald-600 font-bold">{Math.max(0, (data.roomBookings?.stats?.active_rooms || 0) - (data.roomBookings?.stats?.in_use_now || 0))}/{data.roomBookings?.stats?.active_rooms || 0}</strong> Tersedia Hari Ini
				</span>
				<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold font-mono text-[10px]">
					{data.roomBookings?.stats?.pending_bookings ?? 0} Pending
				</span>
			</div>
		</a>

		<!-- 3. Work Order Pemeliharaan Gedung -->
		<a
			href="/ga/facilities"
			class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between hover:border-blue-500/40 transition-colors"
		>
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Work Order Gedung</span>
					<h2 class="text-2xl font-black text-blue-600 mt-1 font-mono tracking-tight">
						{data.facilities?.stats?.total_wo ?? 0} <span class="text-sm font-bold">Tiket WO</span>
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">home_repair_service</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">
					<strong class="text-emerald-600 font-bold">{data.facilities?.stats?.completed_wo ?? 0}</strong> Selesai
				</span>
				<span class="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-bold font-mono text-[10px]">
					{data.facilities?.stats?.in_progress_wo ?? 0} Dikerjakan
				</span>
			</div>
		</a>

		<!-- 4. Perlengkapan Kantor & Dokumen Arsip -->
		<a
			href="/ga/stationery"
			class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between hover:border-purple-500/40 transition-colors"
		>
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Perlengkapan &amp; Arsip</span>
					<h2 class="text-2xl font-black text-purple-600 mt-1 font-mono tracking-tight">
						{data.archives?.total_docs ?? 0} <span class="text-sm font-bold">Arsip</span>
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">inventory_2</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">
					<strong class="text-on-surface">{data.stationery?.stats?.total_items ?? 0}</strong> Katalog ATK
				</span>
				<span class="px-2 py-0.5 rounded-full {(data.stationery?.stats?.low_stock_items ?? 0) > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'} font-bold font-mono text-[10px]">
					{data.stationery?.stats?.low_stock_items ?? 0} Stok Menipis
				</span>
			</div>
		</a>
	</div>

	<!-- ZONA 2: CONTINUOUS INTERNAL SERVICE LIFECYCLE PIPELINE STRIP -->
	<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-cyan-600 text-lg">timeline</span>
				<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Siklus Layanan Internal GA (Service Delivery Flow)</h3>
			</div>
			<span class="text-[11px] font-mono text-slate-400">Permohonan Masuk → Approval → Penugasan → Selesai</span>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
			<!-- Stage 1: Permohonan Masuk -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">1. PERMOHONAN MASUK</span>
					<span class="material-symbols-outlined text-blue-500 text-base">assignment</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{(data.pipeline?.stage1_intake?.count ?? 0).toLocaleString('id-ID')} Pengajuan
				</p>
				<p class="text-[11px] font-bold text-blue-600 mt-0.5 font-mono">100% Tercatat</p>
				<p class="text-[10px] text-slate-400 mt-1">Carpool, SPD, ATK &amp; WO Gedung</p>
			</div>

			<!-- Stage 2: Verifikasi & Approval -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">2. VERIFIKASI &amp; APPROVAL</span>
					<span class="material-symbols-outlined text-amber-500 text-base">pending_actions</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{(data.pipeline?.stage2_approval?.count ?? 0).toLocaleString('id-ID')} Menunggu
				</p>
				<p class="text-[11px] font-bold text-amber-600 mt-0.5 font-mono">Review Atasan &amp; GA</p>
				<p class="text-[10px] text-slate-400 mt-1">Validasi kebutuhan operasional</p>
			</div>

			<!-- Stage 3: Penugasan & Pengerjaan -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">3. PENUGASAN &amp; BERJALAN</span>
					<span class="material-symbols-outlined text-purple-500 text-base">commute</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{(data.pipeline?.stage3_assigned?.count ?? 0).toLocaleString('id-ID')} Berjalan
				</p>
				<p class="text-[11px] font-bold text-purple-600 mt-0.5 font-mono">Aktif Terdisposisi</p>
				<p class="text-[10px] text-slate-400 mt-1">Mobil dinas jalan &amp; teknisi bertugas</p>
			</div>

			<!-- Stage 4: Selesai & Terpenuhi -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">4. SELESAI &amp; TERARSIP</span>
					<span class="material-symbols-outlined text-emerald-500 text-base">task_alt</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{(data.pipeline?.stage4_completed?.count ?? data.facilities?.stats?.completed_wo ?? 0).toLocaleString('id-ID')} WO Selesai
				</p>
				<p class="text-[11px] font-bold text-emerald-600 mt-0.5 font-mono">Layanan Tuntas</p>
				<p class="text-[10px] text-slate-400 mt-1">Fasilitas terpelihara &amp; terarsip</p>
			</div>
		</div>
	</div>

	<!-- ZONA 3: STRATEGIC SERVICE ANALYTICS (12-COLUMN BALANCED GRID) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- 7 Kolom Kiri: Tren Permohonan Layanan 6 Bulan (Grafik Batang) -->
		<div class="lg:col-span-7 p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-2">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-cyan-600">bar_chart</span>
						<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Tren Permohonan Layanan Mobil Dinas &amp; SPD (6 Bulan)</h3>
					</div>
					<div class="flex items-center gap-3 text-[11px]">
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block"></span>
							<span class="text-slate-400 font-medium">Carpool ({data.serviceStats?.carpoolCount ?? 0})</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block"></span>
							<span class="text-slate-400 font-medium">SPD ({data.serviceStats?.spdCount ?? 0})</span>
						</div>
					</div>
				</div>
				<p class="text-xs text-on-surface-variant font-medium mb-6">
					Perbandingan frekuensi mobilisasi operasional kantor dan perjalanan dinas karyawan
				</p>

				<!-- Grafik Batang CSS/SVG -->
				<div class="h-44 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
					{#each (data.monthlyTrend || []) as item, idx}
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
								<p class="text-cyan-300">Carpool: {item.carpool} trip</p>
								<p class="text-indigo-300">SPD: {item.spd} request</p>
							</div>

							<!-- Multi-Bar Container -->
							<div class="w-full flex items-end justify-center gap-1.5 h-32">
								<!-- Bar 1: Carpool (Cyan) -->
								<div
									class="w-1/3 rounded-t-md bg-cyan-500 transition-all duration-300 group-hover:brightness-110"
									style="height: {Math.max(item.carpoolPct, 4)}%"
								></div>
								<!-- Bar 2: SPD (Indigo) -->
								<div
									class="w-1/3 rounded-t-md bg-indigo-500 transition-all duration-300 group-hover:brightness-110"
									style="height: {Math.max(item.spdPct, 4)}%"
								></div>
							</div>

							<!-- Month Label -->
							<span class="text-[10px] font-mono font-bold mt-2 text-on-surface-variant group-hover:text-cyan-600">
								{item.month}
							</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="mt-4 pt-2 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Monitoring mobilitas kendaraan dinas pool &amp; kantor</span>
				<a href="/ga/travel" class="font-bold text-cyan-600 hover:underline">
					Buka Kelola Travel &rarr;
				</a>
			</div>
		</div>

		<!-- 5 Kolom Kanan: Distribusi Permohonan per Divisi (Top 5 Departments) -->
		<div class="lg:col-span-5 p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-2">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-indigo-600">pie_chart</span>
						<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Distribusi Permohonan Divisi</h3>
					</div>
					<span class="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 font-mono font-bold text-[10px]">
						Top 5 Departemen
					</span>
				</div>
				<p class="text-xs text-on-surface-variant font-medium mb-4">
					Proporsi permohonan mobil dinas dan SPD antar unit kerja
				</p>

				<!-- Department Progress List -->
				<div class="space-y-3">
					{#each (data.deptBreakdown || []) as d}
						<div class="p-2.5 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50 space-y-1.5">
							<div class="flex items-center justify-between text-xs">
								<span class="font-bold text-on-surface truncate">{d.department}</span>
								<div class="flex items-center gap-2 shrink-0">
									<span class="font-mono text-[11px] text-slate-400">{(d.count ?? 0).toLocaleString('id-ID')} req</span>
									<span class="px-1.5 py-0.2 rounded text-[10px] font-black font-mono bg-cyan-500/10 text-cyan-600">
										{d.pct}%
									</span>
								</div>
							</div>
							<div class="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
								<div class="bg-cyan-500 h-full rounded-full transition-all duration-500" style="width: {d.pct}%;"></div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="mt-4 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Alokasi anggaran layanan internal berkeadilan</span>
				<a href="/ga/travel" class="font-bold text-indigo-600 hover:underline">
					Rekap Departemen &rarr;
				</a>
			</div>
		</div>
	</div>

	<!-- ZONA 4: OPERATIONAL LOG & REQUESTS (2-COLUMN BALANCED GRID WITH TAB SWITCHERS) -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Kolom Kiri: Pemeliharaan Fasilitas (WO) vs Pengajuan ATK Divisi -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Segmented Switcher -->
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						{#if activeLeftTab === 'wo'}
							<span class="material-symbols-outlined text-blue-600 text-xl">build</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Tiket Pemeliharaan Fasilitas</h3>
						{:else}
							<span class="material-symbols-outlined text-purple-600 text-xl">edit_note</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Pengajuan Permintaan ATK</h3>
						{/if}
					</div>

					<!-- Segmented Switcher -->
					<div class="inline-flex items-center p-0.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70">
						<button
							type="button"
							onclick={() => (activeLeftTab = 'wo')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeLeftTab === 'wo'
								? 'bg-blue-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							WO ({data.facilities?.recentList?.length || 0})
						</button>
						<button
							type="button"
							onclick={() => (activeLeftTab = 'atk')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeLeftTab === 'atk'
								? 'bg-purple-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							ATK ({data.stationery?.recentRequests?.length || 0})
						</button>
					</div>
				</div>

				<!-- TAB 1: WORK ORDERS -->
				{#if activeLeftTab === 'wo'}
					<div class="space-y-2.5">
						{#each (data.facilities?.recentList || []) as wo}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-blue-500/10 text-blue-600">
										<span class="material-symbols-outlined text-base">engineering</span>
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-xs font-bold text-on-surface truncate">{wo.wo_number}</span>
											<span class="px-1.5 py-0.2 rounded text-[9px] font-bold {getUrgencyBadge(wo.urgency)}">
												{wo.urgency}
											</span>
										</div>
										<p class="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
											{wo.description}
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border {getWoStatusBadge(wo.status)}">
										{wo.status}
									</span>
									<p class="text-[10px] font-mono text-slate-400 mt-0.5">{wo.location}</p>
								</div>
							</div>
						{/each}

						{#if (data.facilities?.recentList || []).length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Tidak ada tiket pemeliharaan fasilitas aktif.</p>
						{/if}
					</div>

				<!-- TAB 2: ATK REQUESTS -->
				{:else}
					<div class="space-y-2.5">
						{#each (data.stationery?.recentRequests || []) as req}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-purple-500/10 text-purple-600">
										<span class="material-symbols-outlined text-base">receipt_long</span>
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-xs font-bold text-on-surface truncate">{req.req_number}</span>
											<span class="text-[10px] text-slate-400 font-mono">({req.request_date_str})</span>
										</div>
										<p class="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
											{req.department} · Oleh: {req.requester_name}
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border {req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}">
										{req.status}
									</span>
									<p class="text-[10px] font-mono text-slate-400 mt-0.5">{req.total_items_count} item</p>
								</div>
							</div>
						{/each}

						{#if (data.stationery?.recentRequests || []).length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada pengajuan ATK baru.</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Action -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Seluruh catatan pemeliharaan dan pengadaan ATK</span>
				<a href="/ga/facilities" class="font-bold text-cyan-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Fasilitas</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>

		<!-- Kolom Kanan: Reservasi Ruang Rapat Real-Time vs Permohonan Mobil Dinas -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Segmented Switcher -->
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						{#if activeRightTab === 'rooms'}
							<span class="material-symbols-outlined text-amber-600 text-xl">meeting_room</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Status Ruang Rapat Real-Time</h3>
						{:else}
							<span class="material-symbols-outlined text-cyan-600 text-xl">directions_car</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Permohonan Mobil Dinas (Carpool)</h3>
						{/if}
					</div>

					<!-- Segmented Switcher -->
					<div class="inline-flex items-center p-0.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70">
						<button
							type="button"
							onclick={() => (activeRightTab = 'rooms')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeRightTab === 'rooms'
								? 'bg-amber-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Ruangan ({data.roomBookings?.rooms?.length || 0})
						</button>
						<button
							type="button"
							onclick={() => (activeRightTab = 'carpool')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeRightTab === 'carpool'
								? 'bg-cyan-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Mobil ({data.recentCarpool?.length || 0})
						</button>
					</div>
				</div>

				<!-- TAB 1: ROOMS STATUS -->
				{#if activeRightTab === 'rooms'}
					<div class="space-y-2.5">
						{#each (data.roomBookings?.rooms || []) as rm}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 {rm.currentBookingNumber ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'}">
										<span class="material-symbols-outlined text-base">
											{rm.currentBookingNumber ? 'meeting_room' : 'meeting_room'}
										</span>
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-xs font-bold text-on-surface truncate">{rm.roomName}</span>
											<span class="text-[10px] text-slate-400 font-mono">({rm.capacity} org)</span>
										</div>
										<p class="text-[10px] text-slate-400 truncate mt-0.5">
											{#if rm.currentBookingNumber}
												Dipakai: <strong class="text-on-surface">{rm.currentTitle}</strong> ({rm.currentRequester})
											{:else}
												Lokasi: {rm.location} · Jadwal hari ini: {rm.todayCount || 0} sesi
											{/if}
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									{#if rm.currentBookingNumber}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
											<span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
											Dipakai
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
											Tersedia
										</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>

				<!-- TAB 2: CARPOOL -->
				{:else}
					<div class="space-y-2.5">
						{#each (data.recentCarpool || []) as cp}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-cyan-500/10 text-cyan-600">
										<span class="material-symbols-outlined text-base">directions_car</span>
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-xs font-bold text-on-surface truncate">{cp.carpool_number}</span>
											<span class="text-[10px] text-slate-400 font-mono">({cp.use_date_str})</span>
										</div>
										<p class="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
											Tujuan: {cp.destination} · Pemohon: {cp.requester_name} ({cp.department})
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border {cp.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}">
										{cp.status}
									</span>
								</div>
							</div>
						{/each}

						{#if (data.recentCarpool || []).length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada permohonan carpool.</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Action -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Kelola jadwal peminjaman ruangan dan mobil dinas</span>
				<a href="/ga/room-bookings" class="font-bold text-amber-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Reservasi</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>
	</div>
</div>
