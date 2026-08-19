<script lang="ts">
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	const { attendanceLogs, metrics, shiftRoster } = data;

	const todayStr = new Date().toISOString().split('T')[0];

	// Ambil daftar tanggal yang tersedia dari data riil
	let availableDates = $derived.by(() => {
		const set = new Set<string>();
		(attendanceLogs || []).forEach((log: any) => {
			if (log.date) set.add(String(log.date).split('T')[0]);
		});
		const list = Array.from(set).sort().reverse();
		return list;
	});

	// Ambil daftar lokasi yang tersedia secara dinamis
	let availableLocations = $derived.by(() => {
		const set = new Set<string>();
		(attendanceLogs || []).forEach((log: any) => {
			if (log.checkInLocation && log.checkInLocation !== '-') set.add(log.checkInLocation);
		});
		return ['All', ...Array.from(set)];
	});

	let activeTab = $state<'logs' | 'roster' | 'overtime'>('logs');
	let searchQuery = $state(data.searchParam || '');
	// Default ke tanggal data terkini yang ada di database agar data langsung tampil, atau hari ini
	let dateFilter = $state(
		data.dateParam || 
		(attendanceLogs && attendanceLogs.length > 0 && attendanceLogs[0].date ? String(attendanceLogs[0].date).split('T')[0] : todayStr)
	);
	let selectedPoolFilter = $state('All');

	// Modal Shift Assignment state
	let showShiftModal = $state(false);
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

	// ── REAKTIF FILTERING PRESENSI ──
	let filteredLogs = $derived.by(() => {
		return (attendanceLogs || []).filter((log: any) => {
			// 1. Filter Tanggal
			if (dateFilter && dateFilter !== 'all') {
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

	function resetFilters() {
		dateFilter = '';
		searchQuery = '';
		selectedPoolFilter = 'All';
	}

	function setTodayFilter() {
		dateFilter = todayStr;
	}

	function setLatestDataDate() {
		if (availableDates.length > 0) {
			dateFilter = availableDates[0];
		}
	}

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
	<title>Presensi, Roster Shift & Lembur SPKL | HRIS BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-primary text-2xl">more_time</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Presensi, Roster 24/7 & Lembur SPKL</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Monitoring Kehadiran, Penjadwalan Roster Pool & Surat Perintah Kerja Lembur (SPKL)
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

	<!-- Tab Switcher -->
	<div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
		<button
			onclick={() => (activeTab = 'logs')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeTab === 'logs' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">how_to_reg</span>
			<span>Log Presensi Harian & GPS</span>
			<span class="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-bold font-mono">{filteredLogs.length}</span>
		</button>
		<button
			onclick={() => (activeTab = 'roster')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeTab === 'roster' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">schedule</span>
			<span>Jadwal Roster Shift 24/7 (Pool & Workshop)</span>
			<span class="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold font-mono">24/7</span>
		</button>
		<button
			onclick={() => (activeTab = 'overtime')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeTab === 'overtime' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
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
		<!-- Filters & Search (Tanggal, Lokasi/Pool, dan Pencarian Teks) -->
		<div class="space-y-3 bg-surface-container-low p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
				<!-- Filter Controls (Tanggal & Lokasi) -->
				<div class="flex flex-wrap items-center gap-3">
					<!-- Dropdown / Selector Tanggal -->
					<div class="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
						<span class="material-symbols-outlined text-primary text-base">event</span>
						<label class="text-xs font-bold text-on-surface-variant mr-1">Tanggal:</label>
						<select
							bind:value={dateFilter}
							class="bg-transparent text-on-surface font-semibold text-xs focus:outline-none cursor-pointer"
						>
							<option value="">Semua Tanggal</option>
							{#each availableDates as d}
								<option value={d}>{d} {d === todayStr ? '(Hari Ini)' : ''}</option>
							{/each}
						</select>
						<input 
							type="date" 
							bind:value={dateFilter}
							class="bg-transparent text-on-surface text-xs focus:outline-none cursor-pointer border-l border-slate-200 dark:border-slate-700 pl-2 ml-1"
							title="Pilih tanggal khusus dari kalender"
						/>
					</div>

					<!-- Quick Date Toggles -->
					<div class="flex items-center gap-1">
						{#if availableDates.length > 0 && availableDates[0] !== todayStr}
							<button
								type="button"
								onclick={setLatestDataDate}
								class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer {dateFilter === availableDates[0] ? 'bg-primary text-on-primary shadow-2xs' : 'bg-surface border border-slate-200 dark:border-slate-800 text-on-surface hover:bg-surface-container'}"
								title="Tampilkan tanggal terkini dengan data ({availableDates[0]})"
							>
								Tgl Terkini ({availableDates[0]})
							</button>
						{/if}
						<button
							type="button"
							onclick={setTodayFilter}
							class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer {dateFilter === todayStr ? 'bg-primary text-on-primary shadow-2xs' : 'bg-surface border border-slate-200 dark:border-slate-800 text-on-surface hover:bg-surface-container'}"
							title="Filter Hari Ini ({todayStr})"
						>
							Hari Ini
						</button>
						<button
							type="button"
							onclick={() => (dateFilter = '')}
							class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer {!dateFilter ? 'bg-primary text-on-primary shadow-2xs' : 'bg-surface border border-slate-200 dark:border-slate-800 text-on-surface hover:bg-surface-container'}"
							title="Tampilkan semua tanggal"
						>
							Semua Tanggal
						</button>
					</div>

					<!-- Dropdown Lokasi / Pool -->
					<div class="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
						<span class="material-symbols-outlined text-primary text-base">location_on</span>
						<label class="text-xs font-bold text-on-surface-variant mr-1">Lokasi:</label>
						<select
							bind:value={selectedPoolFilter}
							class="bg-transparent text-on-surface font-semibold text-xs focus:outline-none cursor-pointer"
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
				<div class="relative w-full lg:w-72 flex-shrink-0">
					<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
					<input 
						type="text" 
						bind:value={searchQuery}
						placeholder="Cari nama / NIK / lokasi..." 
						class="w-full bg-surface border border-slate-200 dark:border-slate-800 text-on-surface rounded-full py-2 pl-11 pr-8 focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs font-medium shadow-xs"
					/>
					{#if searchQuery}
						<button 
							type="button" 
							onclick={() => (searchQuery = '')}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
						>
							<span class="material-symbols-outlined text-sm">close</span>
						</button>
					{/if}
				</div>
			</div>

			<!-- Active Filters Summary Bar -->
			{#if dateFilter || (selectedPoolFilter && selectedPoolFilter !== 'All') || searchQuery}
				<div class="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs text-on-surface-variant">
					<div class="flex items-center gap-2 flex-wrap">
						<span class="font-bold">Filter Aktif:</span>
						{#if dateFilter}
							<span class="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium flex items-center gap-1">
								<span>Tanggal: {dateFilter}</span>
								<button onclick={() => (dateFilter = '')} class="hover:text-primary/70">×</button>
							</span>
						{/if}
						{#if selectedPoolFilter && selectedPoolFilter !== 'All'}
							<span class="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-medium flex items-center gap-1">
								<span>Lokasi: {selectedPoolFilter}</span>
								<button onclick={() => (selectedPoolFilter = 'All')} class="hover:text-blue-800">×</button>
							</span>
						{/if}
						{#if searchQuery}
							<span class="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-medium flex items-center gap-1">
								<span>Pencarian: "{searchQuery}"</span>
								<button onclick={() => (searchQuery = '')} class="hover:text-amber-800">×</button>
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
		</div>

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
									{log.date || todayStr}
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
		</div>
	{:else if activeTab === 'roster'}
		<!-- TAB 2: 24/7 SHIFT ROSTER MATRIX -->
		<div class="space-y-4">
			<!-- Shift Legend Bar -->
			<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
				<div class="flex items-center gap-2">
					<span class="font-bold text-on-surface">Keterangan Shift:</span>
					<span class="px-2.5 py-1 rounded-lg border font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">S1: Pagi (07:00 - 15:00)</span>
					<span class="px-2.5 py-1 rounded-lg border font-mono font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">S2: Siang (15:00 - 23:00)</span>
					<span class="px-2.5 py-1 rounded-lg border font-mono font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30">S3: Malam (23:00 - 07:00)</span>
					<span class="px-2.5 py-1 rounded-lg border font-mono font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30">OFF: Libur Roster</span>
				</div>
				<p class="text-slate-400 text-[11px]">*Klik kotak shift pada jadwal untuk mengubah penugasan shift karyawan.</p>
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
						<input type="date" name="start_date" value={todayStr} class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800" />
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
