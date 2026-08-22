<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	
	let { data }: { data: PageData } = $props();
	
	let attendanceLogs = $derived(data.attendanceLogs);
	let metrics = $derived(data.metrics);
	let shiftRoster = $derived(data.shiftRoster);
	let paginationMeta = $derived(data.paginationMeta || { current_page: 1, total: 0, per_page: 50 });

	// Ambil daftar lokasi yang tersedia secara dinamis dari data log
	let availableLocations = $derived.by(() => {
		const set = new Set<string>();
		(attendanceLogs || []).forEach((log: any) => {
			if (log.checkInLocation && log.checkInLocation !== '-') set.add(log.checkInLocation);
		});
		return ['All', ...Array.from(set)];
	});

	let activeTab = $state<'logs' | 'roster' | 'overtime'>('logs');
	let searchQuery = $state(data.searchParam || '');
	let dateFilter = $state(data.dateParam || '');
	let selectedPoolFilter = $state(data.poolParam || 'All');

	// Modal Shift Assignment state
	let showShiftModal = $state(false);
	let showUploadRosterModal = $state(false);
	let selectedEmployeeForShift = $state<any>(null);
	let selectedShiftType = $state('S1');
	let selectedDayIndex = $state(0);

	// Overtime / SPKL State
	let showOvertimeModal = $state(false);
	let selectedOvertimeForPrint = $state<any>(null);
	let showPrintSPKLModal = $state(false);

	let otStartTime = $state('17:00');
	let otEndTime = $state('21:00');
	let otDayType = $state<'workday' | 'holiday'>('workday');

	const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

	function handleFilterChange(page: number | Event = 1) {
		const query = new URLSearchParams();
		if (dateFilter) query.set('date', dateFilter);
		if (selectedPoolFilter && selectedPoolFilter !== 'All') query.set('pool', selectedPoolFilter);
		if (searchQuery.trim()) query.set('search', searchQuery.trim());
		
		const pageNum = typeof page === 'number' ? page : 1;
		if (pageNum > 1) query.set('page', pageNum.toString());

		goto(`/hris/attendance?${query.toString()}`, { keepFocus: true, noScroll: true });
	}

	function resetFilters() {
		dateFilter = '';
		searchQuery = '';
		selectedPoolFilter = 'All';
		goto('/hris/attendance', { keepFocus: true, noScroll: true });
	}

	// ── REAKTIF FILTERING PRESENSI ──
	let filteredLogs = $derived.by(() => {
		return (attendanceLogs || []).filter((log: any) => {
			// 1. Filter Tanggal (jika diisi)
			if (dateFilter) {
				const logDate = log.date ? String(log.date).split('T')[0] : '';
				if (logDate && logDate !== dateFilter) {
					return false;
				}
			}

			// 2. Filter Lokasi / Pool
			if (selectedPoolFilter && selectedPoolFilter !== 'All') {
				const searchPool = selectedPoolFilter.toLowerCase();
				const inLoc = (log.checkInLocation || '').toLowerCase();
				const outLoc = (log.checkOutLocation || '').toLowerCase();
				const dept = (log.department || '').toLowerCase();
				if (!inLoc.includes(searchPool) && !outLoc.includes(searchPool) && !dept.includes(searchPool)) {
					return false;
				}
			}

			// 3. Filter Pencarian Teks (Nama Karyawan, NIK / ID, Departemen, Shift, Lokasi)
			if (searchQuery && searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const name = (log.employeeName || '').toLowerCase();
				const empId = (log.employeeId || '').toLowerCase();
				const dept = (log.department || '').toLowerCase();
				const shift = (log.shift || '').toLowerCase();
				const inLoc = (log.checkInLocation || '').toLowerCase();
				const outLoc = (log.checkOutLocation || '').toLowerCase();
				const status = (log.status || '').toLowerCase();
				if (!name.includes(q) && !empId.includes(q) && !dept.includes(q) && !shift.includes(q) && !inLoc.includes(q) && !outLoc.includes(q) && !status.includes(q)) {
					return false;
				}
			}

			return true;
		});
	});

	function openShiftEdit(emp: any, dayIdx: number) {
		selectedEmployeeForShift = emp;
		selectedDayIndex = dayIdx;
		selectedShiftType = emp.schedule[dayIdx] || 'S1';
		showShiftModal = true;
	}

	function saveShiftAssignment() {
		if (selectedEmployeeForShift) {
			selectedEmployeeForShift.schedule[selectedDayIndex] = selectedShiftType;
		}
		showShiftModal = false;
	}

	function openPrintSPKL(ot: any) {
		selectedOvertimeForPrint = ot;
		showPrintSPKLModal = true;
	}

	function getShiftBadgeClass(shiftCode: string) {
		switch (shiftCode) {
			case 'S1':
				return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
			case 'S2':
				return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
			case 'S3':
				return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
			case 'OFF':
				return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
			default:
				return 'bg-slate-100 text-slate-700 border-slate-200';
		}
	}

	function getShiftLabel(shiftCode: string) {
		switch (shiftCode) {
			case 'S1': return 'Shift 1 (07-15)';
			case 'S2': return 'Shift 2 (15-23)';
			case 'S3': return 'Shift 3 (23-07)';
			case 'OFF': return 'Libur (OFF)';
			default: return shiftCode;
		}
	}

	function calculateEffectiveHours(start: string, end: string) {
		const [sH, sM] = start.split(':').map(Number);
		const [eH, eM] = end.split(':').map(Number);
		let hours = (eH + eM/60) - (sH + sM/60);
		if (hours < 0) hours += 24;
		return Math.max(0, hours);
	}
</script>

<svelte:head>
	<title>Attendance & Shift Rosters | HRIS BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-primary text-2xl">more_time</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Attendance & Shift Rosters</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Monitoring Presensi Harian GPS, Penjadwalan Roster Pool 24/7 & Lembur SPKL
			</p>
		</div>
		<div class="flex gap-2">
			{#if activeTab === 'overtime'}
				<button
					onclick={() => (showOvertimeModal = true)}
					class="bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-primary/90 transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-lg">post_add</span>
					<span>Buat SPKL Baru</span>
				</button>
			{:else}
				<button
					onclick={() => { activeTab = 'roster'; }}
					class="bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-primary/90 transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-lg">calendar_month</span>
					<span>Atur Roster Shift</span>
				</button>
			{/if}
		</div>
	</header>

	<!-- Tab Switcher (Segmented Control) -->
	<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 flex-wrap gap-1">
		<button
			onclick={() => (activeTab = 'logs')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeTab === 'logs' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-sm">how_to_reg</span>
			<span>Log Presensi Harian & GPS</span>
			<span class="px-2 py-0.5 rounded-full text-[10px] {activeTab === 'logs' ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'} font-bold font-mono">{filteredLogs.length}</span>
		</button>
		<button
			onclick={() => (activeTab = 'roster')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeTab === 'roster' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-sm">schedule</span>
			<span>Jadwal Roster Shift 24/7 (Pool & Workshop)</span>
			<span class="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold font-mono">24/7</span>
		</button>
		<button
			onclick={() => (activeTab = 'overtime')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeTab === 'overtime' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-sm">alarm_on</span>
			<span>Lembur & SPKL Depnaker</span>
			{#if data.overtimeSummary.pendingRequests > 0}
				<span class="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold font-mono">{data.overtimeSummary.pendingRequests} Pending</span>
			{/if}
		</button>
	</div>

	<!-- Metrics Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="bg-surface-container-low p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Tenaga Kerja</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-on-surface">{metrics.totalEmployees}</h3>
				<span class="material-symbols-outlined text-3xl text-slate-400">group</span>
			</div>
		</div>
		<div class="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 shadow-xs">
			<p class="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-2">Hadir Hari Ini</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-emerald-700 dark:text-emerald-300">{metrics.presentToday}</h3>
				<span class="material-symbols-outlined text-3xl text-emerald-600">how_to_reg</span>
			</div>
		</div>
		<div class="bg-amber-500/10 p-5 rounded-2xl border border-amber-500/20 shadow-xs">
			<p class="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-2">Terlambat (Late)</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-amber-700 dark:text-amber-300">{metrics.lateToday}</h3>
				<span class="material-symbols-outlined text-3xl text-amber-600">schedule</span>
			</div>
		</div>
		<div class="bg-rose-500/10 p-5 rounded-2xl border border-rose-500/20 shadow-xs">
			<p class="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider mb-2">Tidak Hadir / Alpha</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-rose-700 dark:text-rose-300">{metrics.absentToday}</h3>
				<span class="material-symbols-outlined text-3xl text-rose-600">person_off</span>
			</div>
		</div>
	</div>

	<!-- TAB 1: DAILY PRESENCE LOGS -->
	{#if activeTab === 'logs'}
		<!-- Filters & Search Bar (Tanggal, Lokasi/Pool, dan Pencarian Teks) -->
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
			<div class="flex flex-wrap items-center gap-4 w-full md:w-auto">
				<!-- Filter Tanggal -->
				<div class="flex items-center gap-2">
					<div class="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant">
						<span class="material-symbols-outlined text-slate-400 text-sm">calendar_today</span>
						<span>Tanggal:</span>
					</div>
					<div class="relative flex items-center">
						<input 
							type="date" 
							bind:value={dateFilter}
							onchange={handleFilterChange}
							class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-1.5 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-2xs"
						/>
						{#if dateFilter}
							<button 
								type="button" 
								onclick={() => { dateFilter = ''; handleFilterChange(); }} 
								class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1.5 cursor-pointer"
								title="Reset tanggal"
							>
								<span class="material-symbols-outlined text-xs">close</span>
							</button>
						{/if}
					</div>
				</div>

				<!-- Filter Lokasi / Pool -->
				<div class="flex items-center gap-2">
					<div class="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant">
						<span class="material-symbols-outlined text-slate-400 text-sm">location_on</span>
						<span>Lokasi:</span>
					</div>
					<select
						bind:value={selectedPoolFilter}
						onchange={handleFilterChange}
						class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-1.5 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-2xs"
					>
						<option value="All">Semua Lokasi / Pool</option>
						{#each availableLocations as loc}
							{#if loc !== 'All'}
								<option value={loc}>{loc}</option>
							{/if}
						{/each}
					</select>
				</div>
			</div>

			<!-- Pencarian Teks (Nama, NIK, Departemen) -->
			<div class="relative w-full md:w-80 flex-shrink-0">
				<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
				<input 
					type="text" 
					bind:value={searchQuery}
					onkeydown={(e) => e.key === 'Enter' && handleFilterChange()}
					placeholder="Cari nama, NIK, shift, lokasi..." 
					class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-8 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-2xs"
				/>
				{#if searchQuery}
					<button 
						type="button" 
						onclick={() => { searchQuery = ''; handleFilterChange(); }} 
						class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
					>
						<span class="material-symbols-outlined text-sm">close</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Active Filters Summary Bar -->
		{#if dateFilter || (selectedPoolFilter && selectedPoolFilter !== 'All') || searchQuery}
			<div class="flex items-center justify-between px-2 text-xs text-on-surface-variant">
				<div class="flex items-center gap-2 flex-wrap">
					<span class="font-bold">Filter Aktif:</span>
					{#if dateFilter}
						<span class="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium flex items-center gap-1">
							<span>Tanggal: {dateFilter}</span>
							<button onclick={() => { dateFilter = ''; handleFilterChange(); }} class="hover:text-primary/70 cursor-pointer">×</button>
						</span>
					{/if}
					{#if selectedPoolFilter && selectedPoolFilter !== 'All'}
						<span class="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-medium flex items-center gap-1">
							<span>Lokasi: {selectedPoolFilter}</span>
							<button onclick={() => { selectedPoolFilter = 'All'; handleFilterChange(); }} class="hover:text-blue-800 cursor-pointer">×</button>
						</span>
					{/if}
					{#if searchQuery}
						<span class="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-medium flex items-center gap-1">
							<span>Pencarian: "{searchQuery}"</span>
							<button onclick={() => { searchQuery = ''; handleFilterChange(); }} class="hover:text-amber-800 cursor-pointer">×</button>
						</span>
					{/if}
					<span class="text-slate-400">({filteredLogs.length} hasil ditemukan)</span>
				</div>
				<button 
					type="button" 
					onclick={resetFilters} 
					class="text-primary font-bold hover:underline cursor-pointer flex items-center gap-1 text-xs"
				>
					<span class="material-symbols-outlined text-xs">filter_alt_off</span>
					<span>Reset Semua Filter</span>
				</button>
			</div>
		{/if}

		<!-- Data Table -->
		<div class="bg-surface-container-low rounded-2xl shadow-xs border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-left border-collapse min-w-[900px]">
					<thead>
						<tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
							<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Karyawan</th>
							<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Tanggal</th>
							<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Shift Ditugaskan</th>
							<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
							<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Check In</th>
							<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Check Out</th>
							<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Lokasi (GPS / Geofence)</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-sm">
						{#each filteredLogs as log}
							<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
								<td class="py-4 px-6">
									<div class="flex items-center gap-3">
										<div class="w-10 h-10 rounded-full overflow-hidden bg-slate-200 border border-slate-300 flex-shrink-0">
											<img src={log.avatar} alt={log.employeeName} class="w-full h-full object-cover" />
										</div>
										<div>
											<p class="font-bold text-on-surface">{log.employeeName}</p>
											<p class="text-xs text-on-surface-variant font-mono mt-0.5">{log.employeeId} • {log.department}</p>
										</div>
									</div>
								</td>
								<td class="py-4 px-6 font-mono font-medium text-xs text-on-surface">
									{log.date || '-'}
								</td>
								<td class="py-4 px-6">
									<span class="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
										{log.shift || 'Shift 1 (Pagi)'}
									</span>
								</td>
								<td class="py-4 px-6">
									{#if log.status === 'On Time' || log.status === 'present' || log.status === 'Tepat Waktu'}
										<span class="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> On Time
										</span>
									{:else if log.status === 'Late' || log.status === 'late' || log.status === 'Terlambat'}
										<span class="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold text-xs bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
											<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Late
										</span>
									{:else}
										<span class="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold text-xs bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
											<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> {log.status || 'Absent'}
										</span>
									{/if}
								</td>
								<td class="py-4 px-6 font-mono font-bold text-on-surface">{log.checkIn || '-'}</td>
								<td class="py-4 px-6 font-mono font-bold text-on-surface">{log.checkOut || '-'}</td>
								<td class="py-4 px-6">
									<div class="flex items-center gap-1.5 text-xs text-on-surface-variant">
										<span class="material-symbols-outlined text-sm text-primary">location_on</span>
										<span>{log.checkInLocation || 'Pool Cilegon'}</span>
									</div>
								</td>
							</tr>
						{/each}

						{#if filteredLogs.length === 0}
							<tr>
								<td colspan="7" class="py-12 text-center text-on-surface-variant">
									<div class="flex flex-col items-center justify-center gap-2">
										<span class="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">person_search</span>
										<p class="font-bold text-base text-on-surface">Tidak ada log presensi yang cocok</p>
										<p class="text-xs text-slate-400 max-w-md">
											{#if dateFilter}
												Tidak ada data log pada tanggal <strong>{dateFilter}</strong> dengan filter lokasi <strong>{selectedPoolFilter}</strong>.
											{:else}
												Tidak ditemukan hasil untuk kata kunci "{searchQuery}".
											{/if}
										</p>
										<div class="flex items-center gap-2 mt-3">
											<button 
												type="button"
												onclick={resetFilters}
												class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
											>
												Tampilkan Semua Log Presensi
											</button>
										</div>
									</div>
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
			
			<!-- Pagination Controls -->
			{#if paginationMeta && paginationMeta.total > 0}
				<div class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/20">
					<div class="text-sm text-slate-500 dark:text-slate-400">
						Menampilkan <span class="font-bold text-slate-700 dark:text-slate-200">{(paginationMeta.current_page - 1) * paginationMeta.per_page + 1}</span> 
						sampai <span class="font-bold text-slate-700 dark:text-slate-200">{Math.min(paginationMeta.current_page * paginationMeta.per_page, paginationMeta.total)}</span> 
						dari <span class="font-bold text-slate-700 dark:text-slate-200">{paginationMeta.total}</span> total data
					</div>
					
					<div class="flex items-center gap-1.5">
						<button 
							type="button"
							disabled={paginationMeta.current_page <= 1}
							onclick={() => handleFilterChange(paginationMeta.current_page - 1)}
							class="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<span class="material-symbols-outlined text-sm">chevron_left</span>
						</button>
						
						<!-- Simplified page numbers -->
						<div class="px-3 text-sm font-bold text-slate-700 dark:text-slate-200">
							Halaman {paginationMeta.current_page}
						</div>
						
						<button 
							type="button"
							disabled={paginationMeta.current_page * paginationMeta.per_page >= paginationMeta.total}
							onclick={() => handleFilterChange(paginationMeta.current_page + 1)}
							class="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<span class="material-symbols-outlined text-sm">chevron_right</span>
						</button>
					</div>
				</div>
			{/if}
		</div>
	{:else if activeTab === 'roster'}
		<!-- TAB 2: 24/7 SHIFT ROSTER MATRIX -->
		<div class="space-y-4">
			<!-- Shift Legend Bar -->
			<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-4 text-xs">
				<div class="flex flex-col gap-2">
					<div class="flex items-center gap-2 flex-wrap">
						<span class="font-bold text-on-surface">Keterangan Shift:</span>
						<span class="px-2.5 py-1 rounded-lg border font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">S1: Pagi (07:00 - 15:00)</span>
						<span class="px-2.5 py-1 rounded-lg border font-mono font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">S2: Siang (15:00 - 23:00)</span>
						<span class="px-2.5 py-1 rounded-lg border font-mono font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30">S3: Malam (23:00 - 07:00)</span>
						<span class="px-2.5 py-1 rounded-lg border font-mono font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30">OFF: Libur Roster</span>
					</div>
					<p class="text-slate-400 text-[11px]">*Klik kotak shift pada jadwal untuk mengubah penugasan shift karyawan secara individual.</p>
				</div>
				
				<button 
					type="button"
					onclick={() => showUploadRosterModal = true}
					class="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
				>
					<span class="material-symbols-outlined text-sm">upload_file</span>
					Upload Roster (Excel)
				</button>
			</div>

			<!-- Roster Grid Table -->
			<div class="bg-surface-container-low rounded-2xl shadow-xs border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse min-w-[950px] text-xs">
						<thead>
							<tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
								<th class="py-4 px-5 font-bold uppercase text-on-surface-variant">Karyawan & Unit</th>
								<th class="py-4 px-3 font-bold uppercase text-on-surface-variant">Penempatan</th>
								{#each daysOfWeek as day, dIdx}
									<th class="py-4 px-3 font-bold uppercase text-center text-on-surface-variant">
										<div>{day}</div>
										<div class="text-[10px] font-normal text-slate-400">Tgl {18 + dIdx}</div>
									</th>
								{/each}
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
							{#each shiftRoster as emp}
								<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
									<td class="py-3.5 px-5">
										<p class="font-bold text-sm text-on-surface">{emp.employeeName}</p>
										<p class="text-[11px] text-on-surface-variant font-mono mt-0.5">{emp.employeeId} • {emp.department}</p>
									</td>
									<td class="py-3.5 px-3 font-semibold text-slate-600 dark:text-slate-400">
										{emp.pool}
									</td>
									{#each emp.schedule as shiftCode, dIdx}
										<td class="py-3.5 px-3 text-center">
											<button
												onclick={() => openShiftEdit(emp, dIdx)}
												class="w-full py-1.5 px-2 rounded-lg border font-mono font-bold text-xs transition-transform hover:scale-105 cursor-pointer shadow-2xs {getShiftBadgeClass(shiftCode)}"
												title="Klik untuk ubah shift {emp.employeeName} di hari {daysOfWeek[dIdx]}"
											>
												{shiftCode}
											</button>
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{:else}
		<!-- TAB 3: LEMBUR & SPKL (DEPNAKER) -->
		<div class="space-y-6">
			<!-- Overtime Summary Metrics -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Permohonan Lembur</p>
					<div class="flex items-end justify-between">
						<h3 class="text-2xl font-black text-on-surface">{data.overtimeSummary.totalRequests} SPKL</h3>
						<span class="material-symbols-outlined text-2xl text-slate-400">history_edu</span>
					</div>
				</div>
				<div class="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
					<p class="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-1">Lembur Disetujui (Approved)</p>
					<div class="flex items-end justify-between">
						<h3 class="text-2xl font-black text-emerald-700 dark:text-emerald-300">{data.overtimeSummary.approvedRequests} Permohonan</h3>
						<span class="material-symbols-outlined text-2xl text-emerald-600">verified</span>
					</div>
				</div>
				<div class="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xs">
					<p class="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">Menunggu Persetujuan HRD</p>
					<div class="flex items-end justify-between">
						<h3 class="text-2xl font-black text-amber-700 dark:text-amber-300">{data.overtimeSummary.pendingRequests} Permohonan</h3>
						<span class="material-symbols-outlined text-2xl text-amber-600">pending_actions</span>
					</div>
				</div>
			</div>

			<!-- Overtime Request List -->
			<div class="bg-surface-container-low rounded-2xl shadow-xs border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse min-w-[900px]">
						<thead>
							<tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
								<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Karyawan / Mekanik</th>
								<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Tanggal Lembur</th>
								<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Jam & Durasi</th>
								<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Uraian Pekerjaan / Unit</th>
								<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
								<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-sm">
							{#each data.overtimeRequests as ot}
								<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
									<td class="py-4 px-6">
										<p class="font-bold text-on-surface">{ot.employee_name || 'Karyawan ID #' + ot.user_id}</p>
										<p class="text-xs text-on-surface-variant font-mono mt-0.5">{ot.email || 'Staff Operasional'}</p>
									</td>
									<td class="py-4 px-6 font-mono text-xs text-on-surface">
										{ot.start_date}
									</td>
									<td class="py-4 px-6">
										<p class="font-mono font-bold text-xs text-blue-700 dark:text-blue-300">{ot.start_time} - {ot.end_time} WIB</p>
										<p class="text-[11px] text-slate-400 mt-0.5">{calculateEffectiveHours(ot.start_time, ot.end_time).toFixed(1)} Jam Efektif</p>
									</td>
									<td class="py-4 px-6 max-w-xs">
										<p class="text-xs font-medium line-clamp-2 text-on-surface">{ot.description || 'Pekerjaan perbaikan unit dan operasional'}</p>
									</td>
									<td class="py-4 px-6">
										{#if ot.status === 'approved' || ot.status === 'Approved'}
											<span class="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
												<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Approved
											</span>
										{:else if ot.status === 'pending' || ot.status === 'Pending'}
											<span class="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold text-xs bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
												<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pending HRD
											</span>
										{:else}
											<span class="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold text-xs bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
												<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Ditolak
											</span>
										{/if}
									</td>
									<td class="py-4 px-6 text-right">
										<div class="flex items-center justify-end gap-1.5">
											<button
												onclick={() => openPrintSPKL(ot)}
												class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
												title="Cetak SPKL Resmi (A4)"
											>
												<span class="material-symbols-outlined text-lg">print</span>
											</button>
											
											{#if ot.status === 'pending' || ot.status === 'Pending'}
												<form method="POST" action="?/approveOvertime" class="inline">
													<input type="hidden" name="overtimeId" value={ot.id} />
													<button
														type="submit"
														class="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
													>
														Setujui
													</button>
												</form>
												<form method="POST" action="?/rejectOvertime" class="inline">
													<input type="hidden" name="overtimeId" value={ot.id} />
													<input type="hidden" name="rejection_reason" value="Tidak memenuhi kualifikasi SPKL dinas" />
													<button
														type="submit"
														class="px-3 py-1 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition-colors border border-rose-200 dark:border-rose-800 cursor-pointer"
													>
														Tolak
													</button>
												</form>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- MODAL PENGAJUAN SPKL LEMBUR BARU -->
{#if showOvertimeModal}
	<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
						<span class="material-symbols-outlined text-base">post_add</span>
					</div>
					<h3 class="font-bold text-sm text-on-surface">Penerbitan SPKL Lembur Baru</h3>
				</div>
				<button onclick={() => (showOvertimeModal = false)} class="text-slate-400 hover:text-slate-600 cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/submitOvertime" class="space-y-4 text-xs">
				<div>
					<label class="font-bold text-on-surface block mb-1">Pilih Karyawan / Staf</label>
					<select name="user_id" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800">
						<option value="122">Ahmad Subagja (EMP-010) - Driver Trailer</option>
						<option value="141">Budi Santoso (EMP-012) - Senior Mekanik</option>
						<option value="150">Taufik Abdul Gani (EMP-018) - Bengkel Workshop</option>
						<option value="178">Ahmad Rofiqi (EMP-025) - Operator Pool</option>
					</select>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="font-bold text-on-surface block mb-1">Tanggal Lembur</label>
						<input type="date" name="start_date" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800" />
					</div>
					<div>
						<label class="font-bold text-on-surface block mb-1">Tipe Hari</label>
						<select bind:value={otDayType} class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800">
							<option value="workday">Hari Kerja Reguler</option>
							<option value="holiday">Hari Libur / Tanggal Merah</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="font-bold text-on-surface block mb-1">Jam Mulai</label>
						<input type="time" name="start_time" bind:value={otStartTime} class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 font-mono" />
					</div>
					<div>
						<label class="font-bold text-on-surface block mb-1">Jam Selesai</label>
						<input type="time" name="end_time" bind:value={otEndTime} class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 font-mono" />
					</div>
				</div>

				<!-- Kalkulasi Jam Efektif Depnaker Preview -->
				<div class="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-900 dark:text-blue-200 flex justify-between items-center">
					<span>Estimasi Jam Lembur Efektif:</span>
					<span class="font-bold font-mono text-sm text-blue-700 dark:text-blue-300">
						{calculateEffectiveHours(otStartTime, otEndTime).toFixed(1)} Jam
					</span>
				</div>

				<div>
					<label class="font-bold text-on-surface block mb-1">Uraian Tugas & Keperluan Lembur</label>
					<textarea name="description" rows="3" placeholder="Contoh: Overhaul gearbox unit truk Volvo A 9115 R / Closing payroll bulanan..." required class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 resize-none"></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => (showOvertimeModal = false)} class="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-slate-100 cursor-pointer">
						Batal
					</button>
					<button type="submit" class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 cursor-pointer shadow-xs flex items-center gap-1">
						<span class="material-symbols-outlined text-sm">send</span>
						<span>Terbitkan SPKL</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL CETAK LEMBAR SPKL RESMI (A4) -->
{#if showPrintSPKLModal && selectedOvertimeForPrint}
	<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden p-8 space-y-6 print:p-0 print:border-none print:shadow-none print:w-full animate-in zoom-in-95 duration-150">
			<!-- Header Kop Perusahaan -->
			<div class="flex items-center justify-between border-b-2 border-black pb-4 text-black">
				<div class="flex items-center gap-4">
					<div class="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center font-black text-2xl">
						BCS
					</div>
					<div>
						<h2 class="text-lg font-black tracking-tight uppercase">PT. BUANA CENTRA SWAKARSA</h2>
						<p class="text-xs text-slate-600 font-medium">Jl. Raya Merak KM 115, Gerem, Grogol, Kota Cilegon, Banten 42438</p>
					</div>
				</div>
				<button onclick={() => (showPrintSPKLModal = false)} class="text-slate-400 hover:text-black print:hidden">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<!-- Judul Dokumen -->
			<div class="text-center space-y-1">
				<h3 class="text-base font-black uppercase underline tracking-wider">SURAT PERINTAH KERJA LEMBUR (SPKL)</h3>
				<p class="text-xs font-mono text-slate-500">Nomor: SPKL/BCS-HRD/{selectedOvertimeForPrint.id}/VIII/2026</p>
			</div>

			<!-- Isi Dokumen -->
			<div class="space-y-4 text-xs leading-relaxed text-black">
				<p>Yang bertanda tangan di bawah ini memberikan perintah pelaksanaan kerja lembur kepada:</p>
				
				<div class="grid grid-cols-3 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
					<span class="text-slate-500">Nama Tenaga Kerja:</span>
					<span class="col-span-2 font-bold">{selectedOvertimeForPrint.employee_name}</span>

					<span class="text-slate-500">Tanggal Pelaksanaan:</span>
					<span class="col-span-2 font-mono font-semibold">{selectedOvertimeForPrint.start_date}</span>

					<span class="text-slate-500">Jam Lembur:</span>
					<span class="col-span-2 font-mono font-bold text-blue-700">{selectedOvertimeForPrint.start_time} s/d {selectedOvertimeForPrint.end_time} WIB</span>

					<span class="text-slate-500">Uraian Tugas & Unit:</span>
					<span class="col-span-2 font-medium">{selectedOvertimeForPrint.description || 'Pekerjaan perbaikan unit dan operasional pool'}</span>
				</div>

				<p class="text-[11px] text-slate-600 italic">
					Pelaksanaan kerja lembur ini diperhitungkan upahnya sesuai dengan Peraturan Pemerintah No. 35 Tahun 2021 dan dimasukkan ke dalam slip gaji periode berjalan.
				</p>
			</div>

			<!-- Tanda Tangan -->
			<div class="grid grid-cols-2 gap-8 pt-8 text-xs text-black border-t border-slate-200">
				<div class="text-center space-y-12">
					<p>Penerima Tugas (Karyawan),</p>
					<p class="font-bold underline">{selectedOvertimeForPrint.employee_name}</p>
				</div>
				<div class="text-center space-y-12">
					<p>Cilegon, {selectedOvertimeForPrint.start_date}<br />Pemberi Tugas / Kepala Pool,</p>
					<p class="font-bold underline">SUPERVISOR WORKSHOP & HRD</p>
				</div>
			</div>

			<!-- Footer Modal Action -->
			<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800 print:hidden">
				<button onclick={() => (showPrintSPKLModal = false)} class="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-slate-100 cursor-pointer">
					Tutup
				</button>
				<button onclick={() => window.print()} class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 cursor-pointer shadow-xs flex items-center gap-1">
					<span class="material-symbols-outlined text-sm">print</span>
					<span>Cetak SPKL Resmi</span>
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL EDIT PENUGASAN SHIFT -->
{#if showShiftModal && selectedEmployeeForShift}
	<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
						<span class="material-symbols-outlined text-base">schedule</span>
					</div>
					<div>
						<h3 class="font-bold text-sm text-on-surface">Ubah Penugasan Shift</h3>
						<p class="text-[11px] text-on-surface-variant">{selectedEmployeeForShift.employeeName} ({daysOfWeek[selectedDayIndex]})</p>
					</div>
				</div>
				<button onclick={() => (showShiftModal = false)} class="text-slate-400 hover:text-slate-600 cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="space-y-2 text-xs">
				<p class="font-bold text-on-surface mb-2">Pilih Shift Kerja:</p>
				
				<label class="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer {selectedShiftType === 'S1' ? 'border-primary bg-primary/5' : ''}">
					<div class="flex items-center gap-2.5">
						<input type="radio" bind:group={selectedShiftType} value="S1" class="text-primary" />
						<div>
							<span class="font-bold block text-amber-600">Shift 1 (Pagi)</span>
							<span class="text-[10px] text-slate-400">07:00 WIB - 15:00 WIB</span>
						</div>
					</div>
					<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 font-mono">S1</span>
				</label>

				<label class="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer {selectedShiftType === 'S2' ? 'border-primary bg-primary/5' : ''}">
					<div class="flex items-center gap-2.5">
						<input type="radio" bind:group={selectedShiftType} value="S2" class="text-primary" />
						<div>
							<span class="font-bold block text-blue-600">Shift 2 (Siang/Sore)</span>
							<span class="text-[10px] text-slate-400">15:00 WIB - 23:00 WIB</span>
						</div>
					</div>
					<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 font-mono">S2</span>
				</label>

				<label class="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer {selectedShiftType === 'S3' ? 'border-primary bg-primary/5' : ''}">
					<div class="flex items-center gap-2.5">
						<input type="radio" bind:group={selectedShiftType} value="S3" class="text-primary" />
						<div>
							<span class="font-bold block text-purple-600">Shift 3 (Malam)</span>
							<span class="text-[10px] text-slate-400">23:00 WIB - 07:00 WIB</span>
						</div>
					</div>
					<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 font-mono">S3</span>
				</label>

				<label class="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer {selectedShiftType === 'OFF' ? 'border-primary bg-primary/5' : ''}">
					<div class="flex items-center gap-2.5">
						<input type="radio" bind:group={selectedShiftType} value="OFF" class="text-primary" />
						<div>
							<span class="font-bold block text-slate-600">Libur Roster (Day-Off)</span>
							<span class="text-[10px] text-slate-400">Hari Bebas Tugas</span>
						</div>
					</div>
					<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-600 font-mono">OFF</span>
				</label>
			</div>

			<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
				<button
					onclick={() => (showShiftModal = false)}
					class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
				>
					Batal
				</button>
				<button
					onclick={saveShiftAssignment}
					class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 cursor-pointer shadow-xs"
				>
					Simpan Perubahan
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL UPLOAD ROSTER (EXCEL/CSV) -->
{#if showUploadRosterModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
		<div class="bg-surface w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
				<h2 class="text-lg font-black text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">upload_file</span>
					Upload Data Roster
				</h2>
				<button onclick={() => (showUploadRosterModal = false)} class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<!-- Body -->
			<div class="p-6 space-y-6">
				<!-- Alert Info -->
				<div class="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-2xl text-sm border border-blue-200 dark:border-blue-800/50">
					<p class="font-bold mb-1">Ketentuan Upload:</p>
					<ul class="list-disc ml-5 space-y-1 text-xs opacity-90">
						<li>File harus berformat <b>.xlsx</b> atau <b>.csv</b></li>
						<li>Kolom wajib: ID Karyawan, Nama, dan kolom jadwal harian (S1, S2, S3, OFF).</li>
						<li>Data yang di-upload akan <b>menimpa (overwrite)</b> jadwal sebelumnya untuk karyawan yang bersangkutan di minggu yang sama.</li>
					</ul>
				</div>

				<!-- Drag and Drop Area Mockup -->
				<div class="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group">
					<div class="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
						<span class="material-symbols-outlined text-3xl">cloud_upload</span>
					</div>
					<h3 class="font-bold text-on-surface mb-1">Klik atau Drag & Drop File</h3>
					<p class="text-xs text-slate-500 dark:text-slate-400">Maksimal ukuran file: 5MB</p>
					
					<!-- Simulated Progress/Status (Hidden by default in mockup) -->
					<!-- <div class="w-full mt-4 bg-slate-200 rounded-full h-1.5 dark:bg-slate-700 overflow-hidden">
						<div class="bg-primary h-1.5 rounded-full" style="width: 45%"></div>
					</div> -->
				</div>
				
				<div class="flex items-center justify-between text-xs">
					<a href="#" class="text-primary font-bold hover:underline flex items-center gap-1">
						<span class="material-symbols-outlined text-[14px]">download</span> Download Template Excel
					</a>
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
				<button type="button" onclick={() => (showUploadRosterModal = false)} class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors">
					Batal
				</button>
				<button type="button" class="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:bg-primary/90 cursor-not-allowed opacity-50 flex items-center gap-2 transition-colors" title="Fitur upload masih dalam pengembangan Backend">
					Mulai Proses Upload
				</button>
			</div>
		</div>
	</div>
{/if}
