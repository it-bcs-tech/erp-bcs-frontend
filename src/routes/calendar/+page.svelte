<script lang="ts">
	import { enhance } from '$app/forms';
	import { addToast } from '$lib/stores/notifications';

	let { data, form } = $props();

	// Active Layer Filter: 'ALL' | 'ROOMS' | 'HR'
	let activeLayer = $state<'ALL' | 'ROOMS' | 'HR'>('ALL');
	// Selected Room Filter: 'ALL' or roomId
	let selectedRoomFilter = $state<string>('ALL');
	// Status Filter: 'ALL' | 'APPROVED' | 'PENDING'
	let selectedStatusFilter = $state<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
	// Calendar View Mode: 'MONTH' | 'WEEK' | 'AGENDA'
	let viewMode = $state<'MONTH' | 'WEEK' | 'AGENDA'>('MONTH');

	// Current View Date state (defaults to current date / September 2026)
	const initialDate = new Date();
	let currentYear = $state(initialDate.getFullYear());
	let currentMonth = $state(initialDate.getMonth()); // 0-11

	// Modals
	let isBookingModalOpen = $state(false);
	let isDetailModalOpen = $state(false);
	let selectedEventDetail = $state<any>(null);
	let isSubmitting = $state(false);

	// Form States for new booking
	let newBookingRoomId = $state(data.rooms?.[0]?.id?.toString() || '');
	let newBookingTitle = $state('');
	let newBookingDate = $state(new Date().toISOString().slice(0, 10));
	let newBookingStartTime = $state('09:00');
	let newBookingEndTime = $state('10:00');
	let newBookingAttendees = $state(4);
	let newBookingPhone = $state('');
	let newBookingDepartment = $state(data.user?.department || '');
	let newBookingDescription = $state('');

	// Month names in Indonesian
	const monthNamesId = [
		'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
		'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
	];
	const dayNamesId = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

	// Derived current display title
	let currentDisplayTitle = $derived(`${monthNamesId[currentMonth]} ${currentYear}`);

	// Filtered Events
	let filteredEvents = $derived.by(() => {
		const result: any[] = [];

		// 1. Add Room Bookings if layer allows
		if (activeLayer === 'ALL' || activeLayer === 'ROOMS') {
			for (const b of data.bookings || []) {
				// Filter room
				if (selectedRoomFilter !== 'ALL' && b.roomId.toString() !== selectedRoomFilter) {
					continue;
				}
				// Filter status
				if (selectedStatusFilter !== 'ALL' && b.status !== selectedStatusFilter) {
					continue;
				}

				result.push({
					id: `bkg-${b.id}`,
					originalId: b.id,
					type: 'ROOM_BOOKING',
					title: b.title,
					roomName: b.roomName,
					roomCode: b.roomCode,
					roomColor: b.roomColor || '#0284c7',
					location: b.roomLocation,
					facilities: b.roomFacilities || [],
					date: b.bookingDate,
					startTime: b.startTimeFormatted,
					endTime: b.endTimeFormatted,
					status: b.status,
					requesterName: b.requesterName,
					requesterId: b.requesterId,
					department: b.department,
					phone: b.phone,
					description: b.description,
					attendeesCount: b.attendeesCount,
					bookingNumber: b.bookingNumber,
					rejectionReason: b.rejectionReason,
					approvedBy: b.approvedBy,
					approvedAt: b.approvedAt
				});
			}
		}

		// 2. Add Holidays & HR Events if layer allows
		if (activeLayer === 'ALL' || activeLayer === 'HR') {
			for (const ev of data.events || []) {
				// If date range, expand or treat as single
				result.push({
					id: `hr-${ev.id}`,
					originalId: ev.id,
					type: ev.eventType, // 'HOLIDAY' | 'JOINT_LEAVE' | 'COMPANY_EVENT'
					title: ev.title,
					description: ev.description,
					startDate: ev.startDate,
					endDate: ev.endDate,
					date: ev.startDate,
					isHoliday: ev.isHoliday,
					color: ev.colorHex || (ev.eventType === 'HOLIDAY' ? '#e11d48' : '#4f46e5'),
					createdBy: ev.createdBy
				});
			}
		}

		return result;
	});

	// Monthly Grid Builder
	let calendarDays = $derived.by(() => {
		const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
		const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

		// In JS, 0 is Sunday, 1 is Monday ...
		// We want Monday as start (0: Mon, 1: Tue ... 6: Sun)
		let startDayIndex = firstDayOfMonth.getDay() - 1;
		if (startDayIndex === -1) startDayIndex = 6;

		const totalDaysInMonth = lastDayOfMonth.getDate();

		const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

		const days: any[] = [];

		// Prev month filler
		for (let i = startDayIndex - 1; i >= 0; i--) {
			const dayNum = prevMonthLastDay - i;
			const dateObj = new Date(currentYear, currentMonth - 1, dayNum);
			const dateStr = formatDateToIso(dateObj);
			days.push({
				date: dateStr,
				dayNumber: dayNum,
				isCurrentMonth: false,
				events: []
			});
		}

		// Current month days
		for (let d = 1; d <= totalDaysInMonth; d++) {
			const dateObj = new Date(currentYear, currentMonth, d);
			const dateStr = formatDateToIso(dateObj);
			days.push({
				date: dateStr,
				dayNumber: d,
				isCurrentMonth: true,
				isToday: isSameDate(dateObj, new Date()),
				events: []
			});
		}

		// Next month filler up to multiple of 7
		const remaining = 7 - (days.length % 7);
		if (remaining < 7) {
			for (let i = 1; i <= remaining; i++) {
				const dateObj = new Date(currentYear, currentMonth + 1, i);
				const dateStr = formatDateToIso(dateObj);
				days.push({
					date: dateStr,
					dayNumber: i,
					isCurrentMonth: false,
					events: []
				});
			}
		}

		// Attach events to days
		for (const day of days) {
			day.events = filteredEvents.filter(ev => {
				if (ev.type === 'ROOM_BOOKING') {
					return ev.date === day.date;
				} else {
					// HR Event / Holiday check range: ev.startDate <= day.date <= ev.endDate
					return day.date >= ev.startDate && day.date <= ev.endDate;
				}
			});
		}

		return days;
	});

	// Helpers
	function formatDateToIso(d: Date): string {
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function isSameDate(d1: Date, d2: Date): boolean {
		return (
			d1.getFullYear() === d2.getFullYear() &&
			d1.getMonth() === d2.getMonth() &&
			d1.getDate() === d2.getDate()
		);
	}

	function prevMonth() {
		if (currentMonth === 0) {
			currentMonth = 11;
			currentYear -= 1;
		} else {
			currentMonth -= 1;
		}
	}

	function nextMonth() {
		if (currentMonth === 11) {
			currentMonth = 0;
			currentYear += 1;
		} else {
			currentMonth += 1;
		}
	}

	function goToToday() {
		const now = new Date();
		currentYear = now.getFullYear();
		currentMonth = now.getMonth();
	}

	function openBookingModal(defaultDate?: string) {
		if (defaultDate) {
			newBookingDate = defaultDate;
		}
		isBookingModalOpen = true;
	}

	function openEventDetail(event: any) {
		selectedEventDetail = event;
		isDetailModalOpen = true;
	}

	// Feedback toasts from form actions
	$effect(() => {
		if (form?.success) {
			addToast({
				title: 'Berhasil!',
				message: form.message,
				type: 'SUCCESS'
			});
			isBookingModalOpen = false;
			isDetailModalOpen = false;
			// Reset form
			newBookingTitle = '';
			newBookingDescription = '';
		} else if (form?.message) {
			addToast({
				title: 'Perhatian',
				message: form.message,
				type: 'WARNING'
			});
		}
	});
</script>

<svelte:head>
	<title>Kalender Perusahaan & Booking Ruangan | ERP BCS</title>
</svelte:head>

<div class="flex flex-col min-h-full space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
	<!-- Top Navigation & Header -->
	<header class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low p-6 rounded-3xl border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
		<div class="flex items-center gap-4">
			<div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs shrink-0">
				<span class="material-symbols-outlined text-2xl">calendar_month</span>
			</div>
			<div>
				<div class="flex items-center gap-2.5">
					<h1 class="text-xl sm:text-2xl font-black text-on-surface tracking-tight">Kalender Perusahaan & Peminjaman Ruangan</h1>
					<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
						Unified Hub
					</span>
				</div>
				<p class="text-xs text-on-surface-variant font-medium mt-0.5">
					Pusat informasi jadwal fasilitas kantor, agenda kerja, serta hari libur resmi seluruh modul BCS Group.
				</p>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex flex-wrap items-center gap-2.5">
			<a
				href="/ga/room-bookings"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface-variant hover:text-on-surface text-xs font-bold transition-all shadow-xs"
				title="Kelola & Review Booking Ruangan (Khusus GA)"
			>
				<span class="material-symbols-outlined text-base">manage_accounts</span>
				<span>Menu Review GA</span>
			</a>
			<button
				type="button"
				onclick={() => openBookingModal()}
				class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">add</span>
				<span>Pinjam Ruangan</span>
			</button>
		</div>
	</header>

	<!-- Filter & Controls Toolbar -->
	<div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
		<!-- Left: Layers Selector -->
		<div class="flex flex-wrap items-center gap-1.5 p-1 bg-surface-container rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs">
			<button
				type="button"
				onclick={() => activeLayer = 'ALL'}
				class="px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer {activeLayer === 'ALL' ? 'bg-surface text-on-surface shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
			>
				Semua Acara
			</button>
			<button
				type="button"
				onclick={() => activeLayer = 'ROOMS'}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer {activeLayer === 'ROOMS' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
			>
				<span class="w-2 h-2 rounded-full bg-cyan-500"></span>
				<span>Booking Ruangan (GA)</span>
			</button>
			<button
				type="button"
				onclick={() => activeLayer = 'HR'}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer {activeLayer === 'HR' ? 'bg-surface text-rose-600 dark:text-rose-400 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
			>
				<span class="w-2 h-2 rounded-full bg-rose-500"></span>
				<span>Hari Libur & Agenda HR</span>
			</button>
		</div>

		<!-- Middle: Room & Status Sub-filters -->
		<div class="flex flex-wrap items-center gap-2.5">
			{#if activeLayer !== 'HR'}
				<!-- Room Filter -->
				<select
					bind:value={selectedRoomFilter}
					class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
				>
					<option value="ALL">🏢 Semua Ruangan ({data.rooms?.length || 0})</option>
					{#each data.rooms || [] as r}
						<option value={r.id.toString()}>{r.roomName} ({r.capacity} org)</option>
					{/each}
				</select>

				<!-- Status Filter -->
				<select
					bind:value={selectedStatusFilter}
					class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
				>
					<option value="ALL">Status: Semua</option>
					<option value="APPROVED">🔒 Terkunci (Disetujui GA)</option>
					<option value="PENDING">⏳ Menunggu Review GA</option>
				</select>
			{/if}
		</div>

		<!-- Right: View Switcher -->
		<div class="flex items-center gap-1 p-1 bg-surface-container rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs">
			<button
				type="button"
				onclick={() => viewMode = 'MONTH'}
				class="px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer {viewMode === 'MONTH' ? 'bg-surface text-on-surface shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
			>
				Bulan
			</button>
			<button
				type="button"
				onclick={() => viewMode = 'AGENDA'}
				class="px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer {viewMode === 'AGENDA' ? 'bg-surface text-on-surface shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
			>
				Daftar Agenda
			</button>
		</div>
	</div>

	<!-- Month Navigation Header -->
	<div class="flex items-center justify-between px-2">
		<div class="flex items-center gap-3">
			<h2 class="text-lg sm:text-xl font-black text-on-surface font-mono">
				{currentDisplayTitle}
			</h2>
			<button
				type="button"
				onclick={goToToday}
				class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-surface-container border border-slate-200 dark:border-slate-700 text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
			>
				Hari Ini
			</button>
		</div>

		<div class="flex items-center gap-1.5">
			<button
				type="button"
				onclick={prevMonth}
				class="p-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
				title="Bulan Sebelumnya"
			>
				<span class="material-symbols-outlined text-base">chevron_left</span>
			</button>
			<button
				type="button"
				onclick={nextMonth}
				class="p-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
				title="Bulan Berikutnya"
			>
				<span class="material-symbols-outlined text-base">chevron_right</span>
			</button>
		</div>
	</div>

	<!-- Legend Bar -->
	<div class="flex flex-wrap items-center gap-4 px-3 py-2 text-xs font-semibold text-on-surface-variant">
		<span class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Petunjuk Warna:</span>
		<div class="flex items-center gap-1.5">
			<span class="w-3 h-3 rounded-full bg-cyan-500 shadow-2xs"></span>
			<span>Ruangan (Disetujui/Terkunci)</span>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="w-3 h-3 rounded-full border-2 border-amber-500 bg-amber-500/20 shadow-2xs"></span>
			<span>Peminjaman (Menunggu GA)</span>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="w-3 h-3 rounded-full bg-rose-500 shadow-2xs"></span>
			<span>Libur Nasional</span>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="w-3 h-3 rounded-full bg-teal-500 shadow-2xs"></span>
			<span>Cuti Bersama</span>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="w-3 h-3 rounded-full bg-indigo-600 shadow-2xs"></span>
			<span>Agenda Perusahaan</span>
		</div>
	</div>

	<!-- CALENDAR CONTENT -->
	{#if viewMode === 'MONTH'}
		<!-- Month Grid View -->
		<div class="rounded-3xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70 overflow-hidden shadow-xs">
			<!-- Day Name Headers -->
			<div class="grid grid-cols-7 border-b border-slate-200/60 dark:border-slate-800/60 bg-surface-container/50 text-center py-2.5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
				{#each dayNamesId as dayName, idx}
					<div class="{idx >= 5 ? 'text-rose-500 dark:text-rose-400' : ''}">
						{dayName}
					</div>
				{/each}
			</div>

			<!-- Dates Grid -->
			<div class="grid grid-cols-7 divide-x divide-y divide-slate-200/50 dark:divide-slate-800/50">
				{#each calendarDays as day}
					<div
						class="min-h-[110px] sm:min-h-[135px] p-2 flex flex-col justify-between transition-colors group relative {day.isCurrentMonth ? 'bg-surface hover:bg-surface-container-lowest/70' : 'bg-surface-container-lowest/30 opacity-40'} {day.isToday ? 'ring-2 ring-inset ring-amber-500/50' : ''}"
					>
						<!-- Date Header & Quick Add -->
						<div class="flex items-center justify-between mb-1">
							<span
								class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold font-mono {day.isToday ? 'bg-amber-600 text-white font-black shadow-xs' : 'text-on-surface'}"
							>
								{day.dayNumber}
							</span>

							<!-- Quick add button for current month days -->
							{#if day.isCurrentMonth}
								<button
									type="button"
									onclick={() => openBookingModal(day.date)}
									class="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-amber-600 transition-all text-xs cursor-pointer"
									title="Pinjam ruangan di tanggal ini"
								>
									<span class="material-symbols-outlined text-[15px]">add</span>
								</button>
							{/if}
						</div>

						<!-- Events in Day -->
						<div class="space-y-1 flex-1 overflow-y-auto max-h-[85px] scrollbar-thin">
							{#each day.events as ev}
								{#if ev.type === 'ROOM_BOOKING'}
									<button
										type="button"
										onclick={() => openEventDetail(ev)}
										class="w-full text-left px-1.5 py-1 rounded-lg text-[10px] font-semibold truncate transition-transform hover:scale-[1.02] flex items-center gap-1 cursor-pointer {ev.status === 'APPROVED' ? 'text-white shadow-2xs' : 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-dashed border-amber-500/50'}"
										style={ev.status === 'APPROVED' ? `background-color: ${ev.roomColor};` : ''}
										title="{ev.startTime} - {ev.endTime}: {ev.title} ({ev.roomName})"
									>
										<span class="material-symbols-outlined text-[12px] shrink-0">
											{ev.status === 'APPROVED' ? 'lock' : 'hourglass_top'}
										</span>
										<span class="font-mono font-bold shrink-0">{ev.startTime}</span>
										<span class="truncate">{ev.title}</span>
									</button>
								{:else}
									<!-- Holiday / HR Event -->
									<button
										type="button"
										onclick={() => openEventDetail(ev)}
										class="w-full text-left px-1.5 py-0.5 rounded-lg text-[10px] font-bold truncate transition-transform hover:scale-[1.02] flex items-center gap-1 cursor-pointer {ev.type === 'HOLIDAY' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300/40 dark:border-rose-800/40' : ev.type === 'JOINT_LEAVE' ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-300/40 dark:border-teal-800/40' : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-300/40 dark:border-indigo-800/40'}"
										title="{ev.title} ({ev.type})"
									>
										<span class="material-symbols-outlined text-[12px] shrink-0">
											{ev.type === 'HOLIDAY' ? 'celebration' : ev.type === 'JOINT_LEAVE' ? 'beach_access' : 'event'}
										</span>
										<span class="truncate">{ev.title}</span>
									</button>
								{/if}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<!-- Agenda List View -->
		<div class="rounded-3xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70 overflow-hidden shadow-xs divide-y divide-slate-200/60 dark:divide-slate-800/60">
			{#if filteredEvents.length === 0}
				<div class="py-16 text-center text-on-surface-variant flex flex-col items-center">
					<span class="material-symbols-outlined text-5xl mb-3 opacity-40">event_busy</span>
					<p class="text-sm font-bold text-on-surface">Tidak ada agenda atau jadwal booking</p>
					<p class="text-xs mt-1">Gunakan tombol "Pinjam Ruangan" di atas untuk membuat reservasi ruangan baru.</p>
				</div>
			{:else}
				{#each filteredEvents as ev}
					<div class="p-4 sm:p-5 hover:bg-surface-container/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div class="flex items-start gap-4">
							<div
								class="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 font-mono text-white shadow-2xs"
								style="background-color: {ev.type === 'ROOM_BOOKING' ? ev.roomColor : ev.color};"
							>
								{#if ev.type === 'ROOM_BOOKING'}
									<span class="material-symbols-outlined text-lg">meeting_room</span>
									<span class="text-[9px] font-bold">{ev.startTime}</span>
								{:else}
									<span class="material-symbols-outlined text-lg">
										{ev.type === 'HOLIDAY' ? 'celebration' : 'event'}
									</span>
									<span class="text-[9px] font-bold">HR</span>
								{/if}
							</div>

							<div>
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="text-sm font-bold text-on-surface">{ev.title}</h3>
									{#if ev.type === 'ROOM_BOOKING'}
										<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold border {ev.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200'}">
											{ev.status === 'APPROVED' ? 'Disetujui / Terkunci' : 'Menunggu Review GA'}
										</span>
									{:else}
										<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold border {ev.type === 'HOLIDAY' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200'}">
											{ev.type === 'HOLIDAY' ? 'Libur Nasional' : ev.type === 'JOINT_LEAVE' ? 'Cuti Bersama' : 'Agenda Kantor'}
										</span>
									{/if}
								</div>

								<div class="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-on-surface-variant mt-1 font-medium">
									<span class="flex items-center gap-1">
										<span class="material-symbols-outlined text-xs">calendar_today</span>
										<strong class="font-mono text-on-surface">{ev.date}</strong>
									</span>
									{#if ev.type === 'ROOM_BOOKING'}
										<span class="flex items-center gap-1">
											<span class="material-symbols-outlined text-xs">schedule</span>
											<span>{ev.startTime} - {ev.endTime}</span>
										</span>
										<span class="flex items-center gap-1">
											<span class="material-symbols-outlined text-xs">location_on</span>
											<span>{ev.roomName} ({ev.location})</span>
										</span>
										<span class="flex items-center gap-1">
											<span class="material-symbols-outlined text-xs">person</span>
											<span>{ev.requesterName} ({ev.department || 'Umum'})</span>
										</span>
									{:else if ev.description}
										<span>{ev.description}</span>
									{/if}
								</div>
							</div>
						</div>

						<button
							type="button"
							onclick={() => openEventDetail(ev)}
							class="self-end sm:self-center px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
						>
							Lihat Detail
						</button>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<!-- MODAL: AJUKAN BOOKING RUANGAN -->
{#if isBookingModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="w-full max-w-lg bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
			<!-- Modal Header -->
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">add_box</span>
					</div>
					<div>
						<h3 class="text-base font-black text-on-surface">Ajukan Peminjaman Ruangan</h3>
						<p class="text-[11px] text-on-surface-variant">Slot akan direview oleh GA untuk verifikasi anti-bentrok.</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => isBookingModalOpen = false}
					class="p-1.5 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Modal Form -->
			<form
				method="POST"
				action="?/createBooking"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						await update();
					};
				}}
				class="p-5 overflow-y-auto space-y-4 text-xs"
			>
				<!-- Pilih Ruangan -->
				<div>
					<label for="roomId" class="block font-bold text-on-surface mb-1">Ruangan / Fasilitas Rapat *</label>
					<select
						id="roomId"
						name="roomId"
						bind:value={newBookingRoomId}
						required
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
					>
						{#each data.rooms || [] as rm}
							<option value={rm.id.toString()}>
								{rm.roomName} — Kapasitas {rm.capacity} orang ({rm.location})
							</option>
						{/each}
					</select>
				</div>

				<!-- Judul Pertemuan -->
				<div>
					<label for="title" class="block font-bold text-on-surface mb-1">Keperluan / Judul Pertemuan *</label>
					<input
						type="text"
						id="title"
						name="title"
						bind:value={newBookingTitle}
						placeholder="Misal: Rapat Koordinasi Pengadaan & Finance"
						required
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
					/>
				</div>

				<!-- Tanggal & Jam (Grid) -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div>
						<label for="date" class="block font-bold text-on-surface mb-1">Tanggal *</label>
						<input
							type="date"
							id="date"
							name="date"
							bind:value={newBookingDate}
							required
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
						/>
					</div>
					<div>
						<label for="startTime" class="block font-bold text-on-surface mb-1">Jam Mulai *</label>
						<input
							type="time"
							id="startTime"
							name="startTime"
							bind:value={newBookingStartTime}
							required
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
						/>
					</div>
					<div>
						<label for="endTime" class="block font-bold text-on-surface mb-1">Jam Selesai *</label>
						<input
							type="time"
							id="endTime"
							name="endTime"
							bind:value={newBookingEndTime}
							required
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
						/>
					</div>
				</div>

				<!-- Info Pemohon & Jumlah Peserta -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label for="attendeesCount" class="block font-bold text-on-surface mb-1">Estimasi Peserta</label>
						<input
							type="number"
							id="attendeesCount"
							name="attendeesCount"
							bind:value={newBookingAttendees}
							min="1"
							max="100"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
						/>
					</div>
					<div>
						<label for="phone" class="block font-bold text-on-surface mb-1">No. WhatsApp / HP</label>
						<input
							type="text"
							id="phone"
							name="phone"
							bind:value={newBookingPhone}
							placeholder="Misal: 081234567890"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
						/>
					</div>
				</div>

				<!-- Departemen -->
				<div>
					<label for="department" class="block font-bold text-on-surface mb-1">Departemen / Unit Pemohon</label>
					<input
						type="text"
						id="department"
						name="department"
						bind:value={newBookingDepartment}
						placeholder="Misal: Procurement / Operasional"
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
					/>
				</div>

				<!-- Deskripsi / Catatan Fasilitas Tambahan -->
				<div>
					<label for="description" class="block font-bold text-on-surface mb-1">Keterangan / Kebutuhan Tambahan (Opsional)</label>
					<textarea
						id="description"
						name="description"
						bind:value={newBookingDescription}
						rows="2"
						placeholder="Misal: Mohon disiapkan kabel HDMI dan sound system wireless"
						class="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none"
					></textarea>
				</div>

				<!-- Submit Buttons -->
				<div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-end gap-2.5">
					<button
						type="button"
						onclick={() => isBookingModalOpen = false}
						class="px-4 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface font-bold hover:bg-surface-container transition-colors cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined text-base animate-spin">progress_activity</span>
							<span>Memvalidasi...</span>
						{:else}
							<span class="material-symbols-outlined text-base">send</span>
							<span>Kirim Pengajuan</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: DETAIL EVENT / BOOKING -->
{#if isDetailModalOpen && selectedEventDetail}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="w-full max-w-md bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden flex flex-col">
			<!-- Header -->
			<div
				class="p-5 text-white flex items-center justify-between"
				style="background-color: {selectedEventDetail.type === 'ROOM_BOOKING' ? selectedEventDetail.roomColor : selectedEventDetail.color};"
			>
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">
							{selectedEventDetail.type === 'ROOM_BOOKING' ? 'meeting_room' : selectedEventDetail.type === 'HOLIDAY' ? 'celebration' : 'event'}
						</span>
					</div>
					<div>
						<span class="text-[10px] font-bold uppercase tracking-wider opacity-85">
							{selectedEventDetail.type === 'ROOM_BOOKING' ? 'Peminjaman Ruangan GA' : selectedEventDetail.type === 'HOLIDAY' ? 'Libur Nasional' : 'Agenda Perusahaan'}
						</span>
						<h3 class="text-base font-black leading-tight">{selectedEventDetail.title}</h3>
					</div>
				</div>
				<button
					type="button"
					onclick={() => isDetailModalOpen = false}
					class="p-1.5 rounded-xl hover:bg-white/20 transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Body -->
			<div class="p-5 space-y-4 text-xs">
				{#if selectedEventDetail.type === 'ROOM_BOOKING'}
					<!-- Booking Info -->
					<div class="p-3 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 space-y-2">
						<div class="flex justify-between items-center">
							<span class="text-on-surface-variant font-medium">Status:</span>
							<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border {selectedEventDetail.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200'}">
								{selectedEventDetail.status === 'APPROVED' ? 'Disetujui / Terkunci' : 'Menunggu Persetujuan GA'}
							</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-on-surface-variant font-medium">No. Booking:</span>
							<span class="font-mono font-bold text-on-surface">{selectedEventDetail.bookingNumber}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-on-surface-variant font-medium">Ruangan:</span>
							<span class="font-bold text-on-surface">{selectedEventDetail.roomName}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-on-surface-variant font-medium">Lokasi:</span>
							<span class="text-on-surface">{selectedEventDetail.location}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-on-surface-variant font-medium">Jadwal:</span>
							<span class="font-mono font-bold text-on-surface">
								{selectedEventDetail.date} ({selectedEventDetail.startTime} - {selectedEventDetail.endTime})
							</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-on-surface-variant font-medium">Pemohon:</span>
							<span class="font-bold text-on-surface">{selectedEventDetail.requesterName} ({selectedEventDetail.department || 'Umum'})</span>
						</div>
						{#if selectedEventDetail.phone}
							<div class="flex justify-between items-center">
								<span class="text-on-surface-variant font-medium">Kontak HP:</span>
								<span class="font-mono text-on-surface">{selectedEventDetail.phone}</span>
							</div>
						{/if}
						{#if selectedEventDetail.facilities && selectedEventDetail.facilities.length > 0}
							<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
								<span class="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Fasilitas Tersedia:</span>
								<div class="flex flex-wrap gap-1">
									{#each selectedEventDetail.facilities as f}
										<span class="px-2 py-0.5 rounded-md bg-surface border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-on-surface">
											{f}
										</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>

					{#if selectedEventDetail.description}
						<div>
							<span class="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Catatan Tambahan:</span>
							<p class="p-3 rounded-xl bg-surface-container-low text-on-surface border border-slate-200/60 dark:border-slate-800/60 leading-relaxed">
								{selectedEventDetail.description}
							</p>
						</div>
					{/if}

					<!-- Cancel Option if permitted -->
					<div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
						<form method="POST" action="?/cancelBooking" use:enhance>
							<input type="hidden" name="bookingId" value={selectedEventDetail.originalId} />
							<button
								type="submit"
								class="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
								onclick={(e) => {
									if (!confirm('Apakah Anda yakin ingin membatalkan booking ruangan ini?')) {
										e.preventDefault();
									}
								}}
							>
								Batalkan Booking
							</button>
						</form>
						<button
							type="button"
							onclick={() => isDetailModalOpen = false}
							class="px-4 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface font-bold hover:bg-surface-container transition-colors cursor-pointer"
						>
							Tutup
						</button>
					</div>
				{:else}
					<!-- HR Event Info -->
					<div class="space-y-3">
						<div class="p-3 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 space-y-2">
							<div class="flex justify-between items-center">
								<span class="text-on-surface-variant font-medium">Tanggal:</span>
								<span class="font-mono font-bold text-on-surface">
									{selectedEventDetail.startDate} {selectedEventDetail.endDate && selectedEventDetail.endDate !== selectedEventDetail.startDate ? `s/d ${selectedEventDetail.endDate}` : ''}
								</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-on-surface-variant font-medium">Status Kerja:</span>
								<span class="font-bold {selectedEventDetail.isHoliday ? 'text-rose-600' : 'text-indigo-600'}">
									{selectedEventDetail.isHoliday ? 'Hari Libur / Cuti' : 'Hari Kerja / Agenda Aktif'}
								</span>
							</div>
						</div>

						{#if selectedEventDetail.description}
							<p class="p-3 rounded-xl bg-surface-container-low text-on-surface border border-slate-200/60 dark:border-slate-800/60 leading-relaxed">
								{selectedEventDetail.description}
							</p>
						{/if}

						<div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-end">
							<button
								type="button"
								onclick={() => isDetailModalOpen = false}
								class="px-4 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface font-bold hover:bg-surface-container transition-colors cursor-pointer"
							>
								Tutup
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
