<script lang="ts">
	import { clickOutside } from '$lib/utils/clickOutside';
	import { addToast } from '$lib/stores/notifications';

	let { isOpen = $bindable(false), onClose, user } = $props<{
		isOpen: boolean;
		onClose?: () => void;
		user?: any;
	}>();

	// Loading state
	let isLoading = $state(false);
	let hasLoaded = $state(false);

	// Data from API
	let rooms = $state<any[]>([]);
	let bookings = $state<any[]>([]);
	let events = $state<any[]>([]);

	// Current month view state
	const initialDate = new Date();
	let currentYear = $state(initialDate.getFullYear());
	let currentMonth = $state(initialDate.getMonth()); // 0-11
	let selectedDateStr = $state(formatDateToIso(initialDate));

	// Popover View Mode: 'VIEW' (calendar) | 'FORM' (booking form)
	let activeView = $state<'VIEW' | 'FORM'>('VIEW');

	// Booking form state
	let formRoomId = $state<string>('');
	let formTitle = $state<string>('');
	let formDate = $state<string>(formatDateToIso(initialDate));
	let formStartTime = $state<string>('09:00');
	let formEndTime = $state<string>('10:00');
	let formAttendees = $state<number>(4);
	let formPhone = $state<string>('');
	let formDepartment = $state<string>(user?.department || '');
	let formDescription = $state<string>('');
	let isSubmitting = $state(false);

	const monthNamesId = [
		'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
		'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
	];
	const dayNamesId = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

	let currentDisplayTitle = $derived(`${monthNamesId[currentMonth]} ${currentYear}`);

	// Fetch data on open
	$effect(() => {
		if (isOpen && !hasLoaded) {
			fetchCalendarData();
		}
	});

	async function fetchCalendarData() {
		isLoading = true;
		try {
			const res = await fetch('/api/calendar/events');
			if (res.ok) {
				const data = await res.json();
				if (data.success) {
					rooms = data.rooms || [];
					bookings = data.bookings || [];
					events = data.events || [];
					if (rooms.length > 0 && !formRoomId) {
						formRoomId = rooms[0].id.toString();
					}
					hasLoaded = true;
				}
			}
		} catch (e) {
			console.error('Failed to load calendar events for popover:', e);
		} finally {
			isLoading = false;
		}
	}

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
		selectedDateStr = formatDateToIso(now);
	}

	// Calendar grid days
	let calendarDays = $derived.by(() => {
		const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
		const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

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

		// Current month
		for (let d = 1; d <= totalDaysInMonth; d++) {
			const dateObj = new Date(currentYear, currentMonth, d);
			const dateStr = formatDateToIso(dateObj);
			days.push({
				date: dateStr,
				dayNumber: d,
				isCurrentMonth: true,
				isToday: isSameDate(dateObj, new Date()),
				isSelected: dateStr === selectedDateStr,
				events: []
			});
		}

		// Next month filler
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

		// Attach events
		for (const day of days) {
			const dayBookings = bookings.filter((b: any) => b.bookingDate === day.date);
			const dayHolidays = events.filter((ev: any) => day.date >= ev.startDate && day.date <= ev.endDate);
			day.events = [...dayBookings, ...dayHolidays];
			day.hasHolidays = dayHolidays.length > 0;
			day.hasBookings = dayBookings.length > 0;
		}

		return days;
	});

	// Selected Date Events List
	let selectedDateEvents = $derived.by(() => {
		const dayBookings = bookings.filter((b: any) => b.bookingDate === selectedDateStr);
		const dayHolidays = events.filter((ev: any) => selectedDateStr >= ev.startDate && selectedDateStr <= ev.endDate);
		return {
			bookings: dayBookings,
			holidays: dayHolidays
		};
	});

	function handleSelectDay(dateStr: string) {
		selectedDateStr = dateStr;
	}

	function openBookingForm(prefillDate?: string) {
		formDate = prefillDate || selectedDateStr;
		activeView = 'FORM';
	}

	async function submitBooking(e: Event) {
		e.preventDefault();
		isSubmitting = true;
		try {
			const res = await fetch('/api/calendar/bookings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					roomId: formRoomId,
					title: formTitle,
					date: formDate,
					startTime: formStartTime,
					endTime: formEndTime,
					attendeesCount: formAttendees,
					phone: formPhone,
					department: formDepartment,
					description: formDescription,
					requesterName: user?.name || 'Karyawan BCS'
				})
			});

			const data = await res.json();
			if (res.ok && data.success) {
				addToast({
					title: 'Pengajuan Terkirim!',
					message: data.message,
					type: 'SUCCESS'
				});
				// Reset form & reload data
				formTitle = '';
				formDescription = '';
				activeView = 'VIEW';
				await fetchCalendarData();
			} else {
				addToast({
					title: 'Gagal Mengajukan',
					message: data.message || 'Terjadi kesalahan sistem',
					type: 'WARNING'
				});
			}
		} catch (err: any) {
			addToast({
				title: 'Error',
				message: err?.message || 'Gagal menghubungi server',
				type: 'CRITICAL'
			});
		} finally {
			isSubmitting = false;
		}
	}

	function handleClose() {
		isOpen = false;
		if (onClose) onClose();
	}
</script>

{#if isOpen}
	<div
		class="absolute right-0 mt-2 w-96 sm:w-[410px] max-h-[88vh] bg-surface-container-lowest rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200"
		use:clickOutside={handleClose}
	>
		<!-- Popover Header -->
		<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low/70 sticky top-0 z-10 backdrop-blur-xs">
			<div class="flex items-center gap-2.5">
				<div class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-[19px]">calendar_month</span>
				</div>
				<div>
					<h3 class="text-xs font-black text-on-surface leading-tight">Kalender & Ruangan</h3>
					<p class="text-[10px] text-on-surface-variant">Jadwal kantor & ketersediaan fasilitas</p>
				</div>
			</div>

			<div class="flex items-center gap-1.5">
				{#if activeView === 'VIEW'}
					<button
						type="button"
						onclick={() => openBookingForm()}
						class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
						title="Ajukan Peminjaman Ruangan"
					>
						<span class="material-symbols-outlined text-[14px]">add</span>
						<span>Pinjam</span>
					</button>
				{:else}
					<button
						type="button"
						onclick={() => activeView = 'VIEW'}
						class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-on-surface text-[11px] font-bold transition-all hover:bg-surface-container cursor-pointer"
					>
						<span class="material-symbols-outlined text-[14px]">arrow_back</span>
						<span>Kalender</span>
					</button>
				{/if}

				<button
					type="button"
					onclick={handleClose}
					class="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
					title="Tutup"
				>
					<span class="material-symbols-outlined text-base">close</span>
				</button>
			</div>
		</div>

		<!-- Popover Body -->
		<div class="overflow-y-auto flex-1 p-3.5 space-y-3.5 scrollbar-thin">
			{#if activeView === 'VIEW'}
				<!-- VIEW 1: MINI CALENDAR & AGENDA -->
				<!-- Month Controls -->
				<div class="flex items-center justify-between px-1">
					<div class="flex items-center gap-2">
						<span class="text-xs font-black text-on-surface font-mono">{currentDisplayTitle}</span>
						<button
							type="button"
							onclick={goToToday}
							class="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-bold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
						>
							Hari Ini
						</button>
					</div>

					<div class="flex items-center gap-1">
						<button
							type="button"
							onclick={prevMonth}
							class="p-1 rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
						>
							<span class="material-symbols-outlined text-xs">chevron_left</span>
						</button>
						<button
							type="button"
							onclick={nextMonth}
							class="p-1 rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
						>
							<span class="material-symbols-outlined text-xs">chevron_right</span>
						</button>
					</div>
				</div>

				<!-- Calendar 7-col Grid -->
				<div class="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 p-2 bg-surface">
					<!-- Day Header -->
					<div class="grid grid-cols-7 text-center pb-1 text-[10px] font-bold text-on-surface-variant uppercase">
						{#each dayNamesId as dn, i}
							<div class="{i >= 5 ? 'text-rose-500' : ''}">{dn}</div>
						{/each}
					</div>

					<!-- Day Cells -->
					<div class="grid grid-cols-7 gap-1 pt-1">
						{#each calendarDays as day}
							<button
								type="button"
								onclick={() => handleSelectDay(day.date)}
								class="h-8 rounded-xl flex flex-col items-center justify-center relative transition-all text-xs cursor-pointer {day.isSelected ? 'bg-amber-600 text-white font-black shadow-xs' : day.isToday ? 'border border-amber-500 text-amber-600 dark:text-amber-400 font-bold' : day.isCurrentMonth ? 'text-on-surface hover:bg-surface-container-high' : 'text-slate-300 dark:text-slate-700 opacity-40'}"
							>
								<span class="text-[11px] leading-none font-mono">{day.dayNumber}</span>
								<!-- Event Indicator Dots -->
								<div class="flex items-center gap-0.5 mt-0.5 h-1">
									{#if day.hasHolidays}
										<span class="w-1 h-1 rounded-full {day.isSelected ? 'bg-white' : 'bg-rose-500'}"></span>
									{/if}
									{#if day.hasBookings}
										<span class="w-1 h-1 rounded-full {day.isSelected ? 'bg-white' : 'bg-cyan-500'}"></span>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Selected Date Schedule Box -->
				<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 p-3 space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
							<span class="material-symbols-outlined text-[15px] text-amber-600">event</span>
							<span>Jadwal: <strong class="font-mono">{selectedDateStr}</strong></span>
						</span>
						<button
							type="button"
							onclick={() => openBookingForm(selectedDateStr)}
							class="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-0.5 cursor-pointer"
						>
							<span class="material-symbols-outlined text-xs">add</span>
							<span>Pinjam Ruangan</span>
						</button>
					</div>

					<!-- Holidays on selected date -->
					{#if selectedDateEvents.holidays.length > 0}
						{#each selectedDateEvents.holidays as hol}
							<div class="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-[11px] flex items-center gap-2">
								<span class="material-symbols-outlined text-[15px] text-rose-600 shrink-0">
									{hol.eventType === 'HOLIDAY' ? 'celebration' : 'event'}
								</span>
								<div class="truncate">
									<p class="font-bold truncate">{hol.title}</p>
									<p class="text-[9px] text-rose-600/80">{hol.eventType === 'HOLIDAY' ? 'Libur Nasional' : 'Agenda Perusahaan'}</p>
								</div>
							</div>
						{/each}
					{/if}

					<!-- Bookings on selected date -->
					{#if selectedDateEvents.bookings.length > 0}
						<div class="space-y-1.5">
							{#each selectedDateEvents.bookings as bkg}
								<div class="p-2 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 text-[11px] flex items-start justify-between gap-2 shadow-2xs">
									<div class="flex items-start gap-2 truncate">
										<span class="w-2 h-2 rounded-full mt-1 shrink-0" style="background-color: {bkg.roomColor || '#0284c7'};"></span>
										<div class="truncate">
											<p class="font-bold text-on-surface truncate">{bkg.title}</p>
											<p class="text-[10px] text-on-surface-variant font-medium">
												{bkg.roomName} • <span class="font-mono font-bold text-on-surface">{bkg.startTimeFormatted} - {bkg.endTimeFormatted}</span>
											</p>
											<p class="text-[9px] text-slate-500">Oleh: {bkg.requesterName} ({bkg.department || 'Umum'})</p>
										</div>
									</div>
									<span class="px-2 py-0.5 rounded text-[9px] font-bold shrink-0 {bkg.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200'}">
										{bkg.status === 'APPROVED' ? 'Disetujui' : 'Pending'}
									</span>
								</div>
							{/each}
						</div>
					{/if}

					{#if selectedDateEvents.holidays.length === 0 && selectedDateEvents.bookings.length === 0}
						<div class="py-4 text-center text-on-surface-variant text-[11px]">
							<span class="material-symbols-outlined text-2xl opacity-40 block mb-1">meeting_room</span>
							<p class="font-semibold text-on-surface">Tidak ada jadwal pada tanggal ini</p>
							<p class="text-[10px] text-slate-500 mt-0.5">Semua ruangan rapat kantor saat ini kosong.</p>
						</div>
					{/if}
				</div>
			{:else}
				<!-- VIEW 2: QUICK BOOKING FORM -->
				<form onsubmit={submitBooking} class="space-y-3 text-xs">
					<div>
						<label for="popoverRoomId" class="block font-bold text-on-surface mb-1">Ruangan *</label>
						<select
							id="popoverRoomId"
							bind:value={formRoomId}
							required
							class="w-full px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface text-xs focus:ring-2 focus:ring-amber-500/20 outline-none"
						>
							{#each rooms as rm}
								<option value={rm.id.toString()}>{rm.roomName} ({rm.capacity} org)</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="popoverTitle" class="block font-bold text-on-surface mb-1">Keperluan Pertemuan *</label>
						<input
							type="text"
							id="popoverTitle"
							bind:value={formTitle}
							required
							placeholder="Misal: Diskusi Mingguan Tim"
							class="w-full px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface text-xs focus:ring-2 focus:ring-amber-500/20 outline-none"
						/>
					</div>

					<div class="grid grid-cols-3 gap-2">
						<div>
							<label for="popoverDate" class="block font-bold text-on-surface mb-1">Tanggal *</label>
							<input
								type="date"
								id="popoverDate"
								bind:value={formDate}
								required
								class="w-full px-2 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface text-[11px] font-mono focus:ring-2 focus:ring-amber-500/20 outline-none"
							/>
						</div>
						<div>
							<label for="popoverStart" class="block font-bold text-on-surface mb-1">Mulai *</label>
							<input
								type="time"
								id="popoverStart"
								bind:value={formStartTime}
								required
								class="w-full px-2 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface text-[11px] font-mono focus:ring-2 focus:ring-amber-500/20 outline-none"
							/>
						</div>
						<div>
							<label for="popoverEnd" class="block font-bold text-on-surface mb-1">Selesai *</label>
							<input
								type="time"
								id="popoverEnd"
								bind:value={formEndTime}
								required
								class="w-full px-2 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface text-[11px] font-mono focus:ring-2 focus:ring-amber-500/20 outline-none"
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-2">
						<div>
							<label for="popoverDept" class="block font-bold text-on-surface mb-1">Departemen</label>
							<input
								type="text"
								id="popoverDept"
								bind:value={formDepartment}
								placeholder="Misal: Operasional"
								class="w-full px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface text-xs focus:ring-2 focus:ring-amber-500/20 outline-none"
							/>
						</div>
						<div>
							<label for="popoverPhone" class="block font-bold text-on-surface mb-1">No. WhatsApp</label>
							<input
								type="text"
								id="popoverPhone"
								bind:value={formPhone}
								placeholder="081234567890"
								class="w-full px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface text-xs focus:ring-2 focus:ring-amber-500/20 outline-none"
							/>
						</div>
					</div>

					<div>
						<label for="popoverDesc" class="block font-bold text-on-surface mb-1">Catatan Tambahan (Opsional)</label>
						<textarea
							id="popoverDesc"
							bind:value={formDescription}
							rows="2"
							placeholder="Kebutuhan proyektor, kabel, dsb."
							class="w-full px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface text-xs focus:ring-2 focus:ring-amber-500/20 outline-none resize-none"
						></textarea>
					</div>

					<div class="pt-2 flex justify-end gap-2">
						<button
							type="button"
							onclick={() => activeView = 'VIEW'}
							class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface font-bold hover:bg-surface-container transition-colors cursor-pointer"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							class="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
						>
							{#if isSubmitting}
								<span class="material-symbols-outlined text-xs animate-spin">progress_activity</span>
								<span>Memvalidasi...</span>
							{:else}
								<span>Kirim Pengajuan</span>
							{/if}
						</button>
					</div>
				</form>
			{/if}
		</div>

		<!-- Popover Footer -->
		<div class="p-3 border-t border-slate-200/60 dark:border-slate-800/60 bg-surface-container-low/70 flex items-center justify-between text-xs sticky bottom-0">
			<a
				href="/calendar"
				onclick={handleClose}
				class="font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
			>
				<span class="material-symbols-outlined text-sm">open_in_new</span>
				<span>Buka Kalender Penuh</span>
			</a>

			{#if user && ['superadmin', 'administrator', 'superhyperadmin', 'admin'].some(r => user.role?.toLowerCase()?.includes(r))}
				<a
					href="/ga/room-bookings"
					onclick={handleClose}
					class="font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
				>
					<span class="material-symbols-outlined text-sm">meeting_room</span>
					<span>Menu Review GA</span>
				</a>
			{/if}
		</div>
	</div>
{/if}
