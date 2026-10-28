<script lang="ts">
	import { enhance } from '$app/forms';
	import { addToast } from '$lib/stores/notifications';
	import Pagination from '$lib/components/Pagination.svelte';

	let { data, form } = $props();

	let activeTab = $state<'BOOKINGS' | 'ROOMS'>('BOOKINGS');
	let statusFilter = $state<string>('ALL');
	let roomFilter = $state<string>('ALL');
	let onlyTodayFilter = $state<boolean>(false);
	let searchQuery = $state<string>('');

	// Modal Create Booking State
	let isCreateBookingModalOpen = $state(false);
	let newBookingRoomId = $state('');
	let newBookingTitle = $state('');
	let newBookingDate = $state(new Date().toISOString().slice(0, 10));
	let newBookingStartTime = $state('09:00');
	let newBookingEndTime = $state('10:30');
	let newBookingAttendees = $state(6);
	let newBookingRequesterName = $state('');
	let newBookingDepartment = $state('General Affair');
	let newBookingPhone = $state('');
	let newBookingDescription = $state('');
	let newBookingAutoApprove = $state(true);

	// Modal Reschedule Booking State
	let isRescheduleModalOpen = $state(false);
	let reschedBooking = $state<any>(null);
	let reschedRoomId = $state('');
	let reschedTitle = $state('');
	let reschedDate = $state('');
	let reschedStartTime = $state('');
	let reschedEndTime = $state('');
	let reschedAttendees = $state(4);
	let reschedDescription = $state('');

	// Modal Reject / Cancel State
	let isRejectModalOpen = $state(false);
	let rejectMode = $state<'REJECT' | 'CANCEL'>('REJECT');
	let rejectBookingId = $state<number | null>(null);
	let rejectBookingNumber = $state<string>('');
	let rejectionReason = $state<string>('');

	// Modal Room State
	let isRoomModalOpen = $state(false);
	let editingRoomId = $state<number>(0);
	let roomCode = $state<string>('');
	let roomName = $state<string>('');
	let roomLocation = $state<string>('');
	let roomCapacity = $state<number>(8);
	let roomColorHex = $state<string>('#0284c7');
	let roomFacilities = $state<string>('AC, Whiteboard, Smart TV');
	let roomIsActive = $state<boolean>(true);

	const activeRooms = $derived((data.rooms || []).filter((r: any) => r.isActive));

	// Filtered Bookings
	let filteredBookings = $derived.by(() => {
		return (data.bookings || []).filter((b: any) => {
			if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
			if (roomFilter !== 'ALL' && b.roomId.toString() !== roomFilter) return false;
			if (onlyTodayFilter && !b.isToday) return false;
			if (searchQuery) {
				const q = searchQuery.toLowerCase();
				const matchNum = b.bookingNumber?.toLowerCase().includes(q);
				const matchTitle = b.title?.toLowerCase().includes(q);
				const matchReq = b.requesterName?.toLowerCase().includes(q);
				const matchDept = b.department?.toLowerCase().includes(q);
				const matchRoom = b.roomName?.toLowerCase().includes(q);
				if (!matchNum && !matchTitle && !matchReq && !matchDept && !matchRoom) return false;
			}
			return true;
		});
	});

	// Pagination State
	let currentPage = $state(1);
	const perPage = 10;
	const totalPages = $derived(Math.max(1, Math.ceil(filteredBookings.length / perPage)));
	const paginatedBookings = $derived(
		filteredBookings.slice((currentPage - 1) * perPage, currentPage * perPage)
	);

	$effect(() => {
		const _ = [statusFilter, roomFilter, onlyTodayFilter, searchQuery, data.bookings];
		currentPage = 1;
	});

	function openCreateBookingModal(preselectRoomId?: number) {
		const firstActive = activeRooms[0]?.id?.toString() || data.rooms?.[0]?.id?.toString() || '';
		newBookingRoomId = preselectRoomId ? preselectRoomId.toString() : firstActive;
		newBookingTitle = '';
		newBookingDate = new Date().toISOString().slice(0, 10);
		newBookingStartTime = '09:00';
		newBookingEndTime = '10:30';
		newBookingAttendees = 6;
		newBookingRequesterName = data.user?.name || '';
		newBookingDepartment = data.user?.department || data.user?.division || 'General Affair';
		newBookingPhone = '';
		newBookingDescription = '';
		newBookingAutoApprove = true;
		isCreateBookingModalOpen = true;
	}

	function openRescheduleModal(b: any) {
		reschedBooking = b;
		reschedRoomId = b.roomId.toString();
		reschedTitle = b.title;
		reschedDate = b.bookingDate;
		reschedStartTime = b.startTimeFormatted;
		reschedEndTime = b.endTimeFormatted;
		reschedAttendees = b.attendeesCount || 4;
		reschedDescription = b.description || '';
		isRescheduleModalOpen = true;
	}

	function openRejectModal(id: number, bkgNum: string, mode: 'REJECT' | 'CANCEL' = 'REJECT') {
		rejectMode = mode;
		rejectBookingId = id;
		rejectBookingNumber = bkgNum;
		rejectionReason = '';
		isRejectModalOpen = true;
	}

	function openRoomModal(room?: any) {
		if (room) {
			editingRoomId = room.id;
			roomCode = room.roomCode;
			roomName = room.roomName;
			roomLocation = room.location;
			roomCapacity = room.capacity;
			roomColorHex = room.colorHex || '#0284c7';
			roomFacilities = (room.facilities || []).join(', ');
			roomIsActive = room.isActive !== false;
		} else {
			editingRoomId = 0;
			roomCode = '';
			roomName = '';
			roomLocation = 'Head Office Cilegon';
			roomCapacity = 8;
			roomColorHex = '#0284c7';
			roomFacilities = 'AC, Whiteboard, Smart TV';
			roomIsActive = true;
		}
		isRoomModalOpen = true;
	}

	// Feedback toasts
	$effect(() => {
		if (form?.success) {
			addToast({
				title: 'Berhasil!',
				message: form.message,
				type: 'SUCCESS'
			});
			isCreateBookingModalOpen = false;
			isRescheduleModalOpen = false;
			isRejectModalOpen = false;
			isRoomModalOpen = false;
		} else if (form?.message) {
			addToast({
				title: 'Gagal / Perhatian',
				message: form.message,
				type: 'WARNING'
			});
		}
	});
</script>

<svelte:head>
	<title>Review & Approval Booking Ruangan | General Affair | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Top Navigation Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
		<div>
			<div class="flex items-center gap-2.5">
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Manajemen & Approval Peminjaman Ruangan</h1>
				<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
					GA Facility Control
				</span>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-0.5">
				Pantau ketersediaan ruang rapat secara real-time, buat reservasi baru, kelola jadwal (reschedule/approval), dan atur fasilitas ruangan.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2.5">
			<a
				href="/calendar"
				class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all shadow-2xs"
			>
				<span class="material-symbols-outlined text-base text-amber-600">calendar_month</span>
				<span>Buka Kalender Global</span>
			</a>
			<button
				type="button"
				onclick={() => openCreateBookingModal()}
				class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">add_box</span>
				<span>+ Buat Reservasi</span>
			</button>
			{#if activeTab === 'ROOMS'}
				<button
					type="button"
					onclick={() => openRoomModal()}
					class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">meeting_room</span>
					<span>+ Tambah Ruangan</span>
				</button>
			{/if}
		</div>
	</header>

	<!-- KPI Metric Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Card 1: Menunggu Persetujuan (Pending) -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-amber-500/30 shadow-2xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Menunggu Review GA</span>
				<div class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">hourglass_top</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface font-mono">{data.stats.pendingCount}</div>
			<p class="text-[11px] text-amber-600 font-bold mt-1">Permohonan menunggu approval</p>
		</div>

		<!-- Card 2: Status Ketersediaan Ruangan Real-Time -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-emerald-500/30 shadow-2xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Ketersediaan Saat Ini</span>
				<div class="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">sensor_door</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface font-mono">
				{Math.max(0, (data.stats.activeRoomsCount || 0) - (data.stats.occupiedRoomsCount || 0))} <span class="text-sm font-normal text-on-surface-variant">/ {data.stats.activeRoomsCount || 0} ruang kosong</span>
			</div>
			<p class="text-[11px] text-emerald-600 font-bold mt-1">
				{data.stats.occupiedRoomsCount || 0} ruang sedang dipakai rapat
			</p>
		</div>

		<!-- Card 3: Jadwal Hari Ini -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Jadwal Hari Ini</span>
				<div class="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">today</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface font-mono">{data.stats.todayCount || 0} <span class="text-sm font-normal text-on-surface-variant">sesi</span></div>
			<p class="text-[11px] text-on-surface-variant font-medium mt-1">Total {data.stats.approvedCount} booking aktif terkunci</p>
		</div>

		<!-- Card 4: Total Fasilitas Ruangan -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Master Ruang Rapat</span>
				<div class="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">meeting_room</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface font-mono">{data.rooms?.length || 0}</div>
			<p class="text-[11px] text-purple-600 font-bold mt-1">{data.stats.activeRoomsCount || 0} ruang berstatus aktif</p>
		</div>
	</div>

	<!-- Real-Time Room Status Strip -->
	{#if (data.rooms || []).length > 0}
		<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs space-y-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 text-xs font-bold text-on-surface">
					<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
					<span>Monitor Ketersediaan Ruangan Real-Time</span>
				</div>
				<button
					type="button"
					onclick={() => {
						activeTab = 'BOOKINGS';
						onlyTodayFilter = !onlyTodayFilter;
					}}
					class="text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer {onlyTodayFilter ? 'bg-cyan-600 text-white' : 'bg-surface-container-low text-cyan-600 hover:bg-surface-container'}"
				>
					{onlyTodayFilter ? '✓ Menampilkan Jadwal Hari Ini' : 'Filter Jadwal Hari Ini'}
				</button>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				{#each data.rooms || [] as rm (rm.id)}
					<div class="p-3.5 rounded-xl bg-surface-container-low border {!rm.isActive ? 'border-slate-300 dark:border-slate-700 opacity-60' : rm.currentBookingId ? 'border-rose-300 dark:border-rose-800/70' : 'border-emerald-200/80 dark:border-emerald-800/50'} flex flex-col justify-between gap-2">
						<div class="flex items-start justify-between gap-2">
							<div class="flex items-center gap-2 min-w-0">
								<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: {rm.colorHex || '#0284c7'};"></span>
								<div class="truncate">
									<div class="text-xs font-bold text-on-surface truncate">{rm.roomName}</div>
									<div class="text-[10px] text-on-surface-variant">{rm.location} • {rm.capacity} org</div>
								</div>
							</div>

							{#if !rm.isActive}
								<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0">
									Nonaktif
								</span>
							{:else if rm.currentBookingId}
								<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
									<span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
									Dipakai
								</span>
							{:else}
								<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
									<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
									Tersedia
								</span>
							{/if}
						</div>

						{#if !rm.isActive}
							<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[10px] text-on-surface-variant italic">
								Sedang dinonaktifkan / pemeliharaan
							</div>
						{:else if rm.currentBookingId}
							<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[10px] text-on-surface-variant">
								<div class="font-bold text-on-surface truncate">{rm.currentTitle}</div>
								<div>{rm.currentRequester} ({rm.currentStart} - {rm.currentEnd} WIB)</div>
							</div>
						{:else}
							<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-on-surface-variant">
								<span>Hari ini: <strong class="text-on-surface">{rm.todayBookingsCount || 0} sesi</strong></span>
								<button
									type="button"
									onclick={() => openCreateBookingModal(rm.id)}
									class="text-cyan-600 font-bold hover:underline cursor-pointer"
								>
									+ Pinjam Ruang
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Tabs Navigation -->
	<div class="flex items-center gap-2 border-b border-slate-200/70 dark:border-slate-800/70">
		<button
			type="button"
			onclick={() => activeTab = 'BOOKINGS'}
			class="px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 {activeTab === 'BOOKINGS' ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400' : 'border-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-base">checklist</span>
			<span>Daftar Permohonan & Approval ({filteredBookings.length})</span>
		</button>
		<button
			type="button"
			onclick={() => activeTab = 'ROOMS'}
			class="px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 {activeTab === 'ROOMS' ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400' : 'border-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-base">meeting_room</span>
			<span>Master Fasilitas Ruangan ({data.rooms?.length || 0})</span>
		</button>
	</div>

	{#if activeTab === 'BOOKINGS'}
		<!-- Filters & Search Toolbar (Borderless Standard) -->
		<div class="flex flex-col md:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low w-full md:w-80 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
				<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari no booking, judul, nama pemohon..."
					class="w-full bg-transparent border-0 outline-none text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0"
				/>
			</div>

			<div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
				<!-- Status Filter -->
				<select
					bind:value={statusFilter}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs font-semibold text-on-surface cursor-pointer transition-all"
				>
					<option value="ALL">Semua Status</option>
					<option value="PENDING">⏳ Menunggu Review GA</option>
					<option value="APPROVED">🔒 Disetujui (Terkunci)</option>
					<option value="REJECTED">❌ Ditolak</option>
					<option value="CANCELLED">🚫 Dibatalkan</option>
				</select>

				<!-- Room Filter -->
				<select
					bind:value={roomFilter}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs font-semibold text-on-surface cursor-pointer transition-all"
				>
					<option value="ALL">Semua Ruangan</option>
					{#each data.rooms || [] as rm}
						<option value={rm.id.toString()}>{rm.roomName}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Table Bookings -->
		<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 overflow-hidden shadow-2xs">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs min-w-[900px]">
					<thead class="bg-surface-container-low font-bold text-on-surface-variant uppercase text-[10px] tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3 px-4">No. Booking & Tanggal</th>
							<th class="py-3 px-4">Ruangan & Jam</th>
							<th class="py-3 px-4">Keperluan & Pemohon</th>
							<th class="py-3 px-4 text-center">Status</th>
							<th class="py-3 px-4 text-right">Aksi & Kontrol Jadwal</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium">
						{#if paginatedBookings.length === 0}
							<tr>
								<td colspan="5" class="py-12 text-center text-on-surface-variant">
									Tidak ditemukan data booking yang sesuai dengan kriteria filter.
								</td>
							</tr>
						{:else}
							{#each paginatedBookings as b (b.id)}
								<tr class="hover:bg-surface-container transition-colors">
									<td class="py-3.5 px-4 font-mono">
										<span class="font-bold text-cyan-700 dark:text-cyan-300 block">{b.bookingNumber}</span>
										<div class="flex items-center gap-1.5 mt-0.5 font-sans">
											<span class="text-[10px] text-on-surface-variant">{b.bookingDate}</span>
											{#if b.isToday}
												<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">Hari Ini</span>
											{/if}
										</div>
									</td>
									<td class="py-3.5 px-4">
										<div class="flex items-center gap-1.5">
											<span class="w-2 h-2 rounded-full shrink-0" style="background-color: {b.roomColor};"></span>
											<span class="font-bold text-on-surface">{b.roomName}</span>
										</div>
										<p class="text-[10px] text-on-surface-variant font-mono mt-0.5">
											Jam: {b.startTimeFormatted} - {b.endTimeFormatted} WIB ({b.attendeesCount || 1} org)
										</p>
									</td>
									<td class="py-3.5 px-4 max-w-xs">
										<p class="font-bold text-on-surface truncate" title={b.title}>{b.title}</p>
										<p class="text-[10px] text-on-surface-variant mt-0.5">
											Oleh: <strong class="text-on-surface">{b.requesterName}</strong> ({b.department || 'Umum'})
											{#if b.phone} • Telp: {b.phone}{/if}
										</p>
										{#if b.description}
											<p class="text-[10px] italic text-slate-500 mt-1 line-clamp-1">"{b.description}"</p>
										{/if}
										{#if (b.status === 'REJECTED' || b.status === 'CANCELLED') && b.rejectionReason}
											<div class="mt-1 p-1.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px]">
												<strong>Keterangan:</strong> {b.rejectionReason}
											</div>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-center whitespace-nowrap">
										{#if b.isInUseNow}
											<span class="px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800">
												<span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
												<span>Sedang Dipakai</span>
											</span>
										{:else}
											<span class="px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 {b.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : b.status === 'PENDING' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800'}">
												<span class="material-symbols-outlined text-xs">
													{b.status === 'APPROVED' ? 'lock' : b.status === 'PENDING' ? 'hourglass_top' : 'cancel'}
												</span>
												<span>{b.status === 'APPROVED' ? 'Disetujui' : b.status === 'PENDING' ? 'Pending' : b.status === 'CANCELLED' ? 'Dibatalkan' : 'Ditolak'}</span>
											</span>
										{/if}
										{#if b.approvedBy}
											<span class="block text-[9px] text-on-surface-variant mt-0.5">Oleh: {b.approvedBy}</span>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-right whitespace-nowrap">
										<div class="flex items-center justify-end gap-1">
											{#if b.status === 'PENDING'}
												<!-- Button Approve -->
												<form method="POST" action="?/approveBooking" class="inline" use:enhance>
													<input type="hidden" name="bookingId" value={b.id} />
													<button
														type="submit"
														class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
														title="Setujui dan Kunci Jadwal"
													>
														<span class="material-symbols-outlined text-xs">check</span>
														<span>Setujui</span>
													</button>
												</form>

												<!-- Button Reschedule -->
												<button
													type="button"
													onclick={() => openRescheduleModal(b)}
													class="px-2 py-1 bg-surface-container-low hover:bg-surface-container text-cyan-700 dark:text-cyan-300 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
													title="Reschedule / Ubah Jadwal"
												>
													<span class="material-symbols-outlined text-xs">edit_calendar</span>
													<span>Ubah</span>
												</button>

												<!-- Button Reject -->
												<button
													type="button"
													onclick={() => openRejectModal(b.id, b.bookingNumber, 'REJECT')}
													class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
													title="Tolak Peminjaman"
												>
													<span class="material-symbols-outlined text-xs">close</span>
													<span>Tolak</span>
												</button>
											{:else if b.status === 'APPROVED'}
												<button
													type="button"
													onclick={() => openRescheduleModal(b)}
													class="px-2.5 py-1 bg-surface-container-low hover:bg-surface-container text-cyan-700 dark:text-cyan-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
													title="Reschedule / Pindah Jam & Ruangan"
												>
													<span class="material-symbols-outlined text-xs">edit_calendar</span>
													<span>Reschedule</span>
												</button>
												<button
													type="button"
													onclick={() => openRejectModal(b.id, b.bookingNumber, 'CANCEL')}
													class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
													title="Batalkan Booking Terkunci"
												>
													<span class="material-symbols-outlined text-xs">event_busy</span>
													<span>Batal</span>
												</button>
											{:else}
												<span class="text-[10px] text-slate-400 italic">Tidak aktif</span>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			{#if filteredBookings.length > 0}
				<Pagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={filteredBookings.length}
					perPage={perPage}
					itemLabel="reservasi ruangan"
					onPageChange={(p) => (currentPage = p)}
				/>
			{/if}
		</div>
	{:else}
		<!-- Tab: Master Ruangan -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each data.rooms || [] as rm (rm.id)}
				<div class="p-5 rounded-2xl bg-surface-container-lowest border {rm.isActive ? 'border-slate-200/70 dark:border-slate-800/70' : 'border-rose-300/60 dark:border-rose-900/50 opacity-75'} shadow-2xs flex flex-col justify-between">
					<div>
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center gap-2">
								<span class="w-3.5 h-3.5 rounded-full" style="background-color: {rm.colorHex};"></span>
								<span class="font-mono text-xs font-bold text-on-surface-variant">{rm.roomCode}</span>
							</div>
							<div class="flex items-center gap-1.5">
								<span class="px-2 py-0.5 rounded-md text-[10px] font-bold {rm.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'}">
									{rm.isActive ? 'Aktif' : 'Nonaktif'}
								</span>
								<span class="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold">
									{rm.capacity} Orang
								</span>
							</div>
						</div>

						<h3 class="text-base font-black text-on-surface">{rm.roomName}</h3>
						<p class="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
							<span class="material-symbols-outlined text-xs">location_on</span>
							<span>{rm.location}</span>
						</p>

						<!-- Facilities Badges -->
						<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
							<span class="text-[10px] uppercase font-bold text-on-surface-variant block mb-1.5">Fasilitas:</span>
							<div class="flex flex-wrap gap-1">
								{#each rm.facilities || [] as f}
									<span class="px-2 py-0.5 rounded-md bg-surface-container-low text-[10px] font-medium text-on-surface">
										{f}
									</span>
								{/each}
							</div>
						</div>
					</div>

					<div class="mt-5 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2">
						<span class="text-[11px] text-on-surface-variant font-medium">
							Digunakan: <strong class="text-on-surface font-mono">{rm.totalApprovedBookings || 0}x</strong>
						</span>
						<div class="flex items-center gap-1.5">
							<form method="POST" action="?/toggleRoomActive" use:enhance class="inline">
								<input type="hidden" name="roomId" value={rm.id} />
								<button
									type="submit"
									class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer {rm.isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'}"
								>
									{rm.isActive ? 'Nonaktifkan' : 'Aktifkan'}
								</button>
							</form>
							<button
								type="button"
								onclick={() => openRoomModal(rm)}
								class="px-3 py-1.5 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
							>
								Edit
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- MODAL: BUAT RESERVASI RUANGAN LANGSUNG -->
{#if isCreateBookingModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="w-full max-w-lg bg-surface-container-lowest rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">add_box</span>
					</div>
					<div>
						<h3 class="text-base font-black text-on-surface">Buat Reservasi Ruangan Baru</h3>
						<p class="text-[11px] text-on-surface-variant">Input peminjaman ruangan langsung melalui kontrol General Affair.</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => isCreateBookingModalOpen = false}
					class="p-1.5 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/createBooking" use:enhance class="p-5 overflow-y-auto space-y-4 text-xs">
				<!-- Info Peminjam & Departemen (Auto-filled dari login, persis seperti form WO) -->
				<div class="p-3.5 rounded-2xl bg-surface-container-low border border-slate-200/50 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-2 text-xs">
					<div class="flex items-center gap-2">
						<div class="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-600 flex items-center justify-center font-bold text-xs">
							<span class="material-symbols-outlined text-[15px]">person</span>
						</div>
						<div>
							<div class="text-[10px] uppercase font-bold text-on-surface-variant">Peminjam</div>
							<div class="font-bold text-on-surface">{data.user?.name || 'Karyawan BCS'}</div>
						</div>
					</div>
					<div class="text-right">
						<div class="text-[10px] uppercase font-bold text-on-surface-variant">Departemen</div>
						<div class="font-mono text-on-surface text-[11px] font-semibold">
							{data.user?.department || data.user?.division || 'General Affair'}
						</div>
					</div>
				</div>

				<input type="hidden" name="requesterName" value={data.user?.name || 'Karyawan BCS'} />
				<input type="hidden" name="department" value={data.user?.department || data.user?.division || 'General Affair'} />

				<div>
					<label for="ga_roomId" class="block font-bold text-on-surface mb-1.5">Pilih Ruangan Rapat <span class="text-rose-500">*</span></label>
					<select
						id="ga_roomId"
						name="roomId"
						bind:value={newBookingRoomId}
						required
						class="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-medium cursor-pointer"
					>
						{#each activeRooms as rm}
							<option value={rm.id.toString()}>
								{rm.roomName} — Kapasitas {rm.capacity} org ({rm.location})
							</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="ga_title" class="block font-bold text-on-surface mb-1.5">Judul / Agenda Pertemuan <span class="text-rose-500">*</span></label>
					<input
						type="text"
						id="ga_title"
						name="title"
						bind:value={newBookingTitle}
						required
						placeholder="Misal: Rapat Evaluasi Operasional Mingguan"
						class="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface"
					/>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div>
						<label for="ga_date" class="block font-bold text-on-surface mb-1.5">Tanggal <span class="text-rose-500">*</span></label>
						<input
							type="date"
							id="ga_date"
							name="date"
							bind:value={newBookingDate}
							required
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono font-bold"
						/>
					</div>
					<div>
						<label for="ga_startTime" class="block font-bold text-on-surface mb-1.5">Jam Mulai <span class="text-rose-500">*</span></label>
						<input
							type="time"
							id="ga_startTime"
							name="startTime"
							bind:value={newBookingStartTime}
							required
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono font-bold"
						/>
					</div>
					<div>
						<label for="ga_endTime" class="block font-bold text-on-surface mb-1.5">Jam Selesai <span class="text-rose-500">*</span></label>
						<input
							type="time"
							id="ga_endTime"
							name="endTime"
							bind:value={newBookingEndTime}
							required
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono font-bold"
						/>
					</div>
				</div>


				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label for="ga_attendees" class="block font-bold text-on-surface mb-1.5">Estimasi Peserta</label>
						<input
							type="number"
							id="ga_attendees"
							name="attendeesCount"
							bind:value={newBookingAttendees}
							min="1"
							max="200"
							class="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono"
						/>
					</div>
					<div>
						<label for="ga_phone" class="block font-bold text-on-surface mb-1.5">Kontak HP / WhatsApp</label>
						<input
							type="text"
							id="ga_phone"
							name="phone"
							bind:value={newBookingPhone}
							placeholder="0812..."
							class="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface"
						/>
					</div>
				</div>

				<div>
					<label for="ga_description" class="block font-bold text-on-surface mb-1.5">Kebutuhan Tambahan / Catatan</label>
					<textarea
						id="ga_description"
						name="description"
						bind:value={newBookingDescription}
						rows="2"
						placeholder="Misal: Persiapan snack rapat, proyektor, kabel HDMI..."
						class="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface resize-none"
					></textarea>
				</div>

				<label class="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 cursor-pointer">
					<input
						type="checkbox"
						name="autoApprove"
						bind:checked={newBookingAutoApprove}
						class="rounded border border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500/20"
					/>
					<span class="text-xs font-bold text-emerald-800 dark:text-emerald-300">
						Langsung Setujui & Kunci Slot di Kalender Global (APPROVED)
					</span>
				</label>

				<div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-end gap-2.5">
					<button
						type="button"
						onclick={() => isCreateBookingModalOpen = false}
						class="px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-bold hover:bg-surface-container transition-colors cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition-all shadow-xs cursor-pointer"
					>
						Simpan Reservasi
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: RESCHEDULE / UBAH JADWAL BOOKING -->
{#if isRescheduleModalOpen && reschedBooking}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="w-full max-w-lg bg-surface-container-lowest rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">edit_calendar</span>
					</div>
					<div>
						<h3 class="text-base font-black text-on-surface">Reschedule / Ubah Jadwal Ruangan</h3>
						<p class="text-[11px] font-mono text-on-surface-variant">{reschedBooking.bookingNumber} • Pemohon: {reschedBooking.requesterName}</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => isRescheduleModalOpen = false}
					class="p-1.5 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/rescheduleBooking" use:enhance class="p-5 space-y-4 text-xs">
				<input type="hidden" name="bookingId" value={reschedBooking.id} />

				<div>
					<label for="resched_roomId" class="block font-bold text-on-surface mb-1.5">Ruangan Rapat <span class="text-rose-500">*</span></label>
					<select
						id="resched_roomId"
						name="roomId"
						bind:value={reschedRoomId}
						required
						class="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-medium cursor-pointer"
					>
						{#each data.rooms || [] as rm}
							<option value={rm.id.toString()}>{rm.roomName} ({rm.location})</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="resched_title" class="block font-bold text-on-surface mb-1.5">Agenda Pertemuan <span class="text-rose-500">*</span></label>
					<input
						type="text"
						id="resched_title"
						name="title"
						bind:value={reschedTitle}
						required
						class="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface"
					/>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div>
						<label for="resched_date" class="block font-bold text-on-surface mb-1.5">Tanggal Baru <span class="text-rose-500">*</span></label>
						<input
							type="date"
							id="resched_date"
							name="date"
							bind:value={reschedDate}
							required
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono font-bold"
						/>
					</div>
					<div>
						<label for="resched_start" class="block font-bold text-on-surface mb-1.5">Jam Mulai <span class="text-rose-500">*</span></label>
						<input
							type="time"
							id="resched_start"
							name="startTime"
							bind:value={reschedStartTime}
							required
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono font-bold"
						/>
					</div>
					<div>
						<label for="resched_end" class="block font-bold text-on-surface mb-1.5">Jam Selesai <span class="text-rose-500">*</span></label>
						<input
							type="time"
							id="resched_end"
							name="endTime"
							bind:value={reschedEndTime}
							required
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono font-bold"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label for="resched_attendees" class="block font-bold text-on-surface mb-1.5">Jumlah Peserta</label>
						<input
							type="number"
							id="resched_attendees"
							name="attendeesCount"
							bind:value={reschedAttendees}
							min="1"
							class="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono"
						/>
					</div>
					<div>
						<label for="resched_desc" class="block font-bold text-on-surface mb-1.5">Catatan Tambahan</label>
						<input
							type="text"
							id="resched_desc"
							name="description"
							bind:value={reschedDescription}
							class="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface"
						/>
					</div>
				</div>

				<div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-end gap-2.5">
					<button
						type="button"
						onclick={() => isRescheduleModalOpen = false}
						class="px-4 py-2 rounded-xl bg-surface-container-low text-on-surface font-bold hover:bg-surface-container transition-colors cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition-all shadow-xs cursor-pointer"
					>
						Simpan Jadwal Baru
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: REJECT / CANCEL BOOKING -->
{#if isRejectModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="w-full max-w-md bg-surface-container-lowest rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">{rejectMode === 'CANCEL' ? 'event_busy' : 'block'}</span>
					</div>
					<div>
						<h3 class="text-base font-black text-on-surface">
							{rejectMode === 'CANCEL' ? 'Batalkan Booking Ruangan' : 'Tolak Permohonan Ruangan'}
						</h3>
						<p class="text-[11px] text-on-surface-variant font-mono">{rejectBookingNumber}</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => isRejectModalOpen = false}
					class="p-1.5 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form
				method="POST"
				action={rejectMode === 'CANCEL' ? '?/cancelBooking' : '?/rejectBooking'}
				use:enhance
				class="p-5 space-y-4 text-xs"
			>
				<input type="hidden" name="bookingId" value={rejectBookingId} />
				<div>
					<label for="rejectionReason" class="block font-bold text-on-surface mb-1.5">
						{rejectMode === 'CANCEL' ? 'Alasan Pembatalan' : 'Alasan Penolakan'} <span class="text-rose-500">*</span>
					</label>
					<textarea
						id="rejectionReason"
						name={rejectMode === 'CANCEL' ? 'cancelReason' : 'rejectionReason'}
						bind:value={rejectionReason}
						required
						rows="3"
						placeholder="Misal: Ruangan sedang dialokasikan untuk audit internal atau agenda mendadak direksi."
						class="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-rose-500/20 text-on-surface resize-none"
					></textarea>
				</div>

				<div class="pt-2 flex justify-end gap-2.5">
					<button
						type="button"
						onclick={() => isRejectModalOpen = false}
						class="px-4 py-2 rounded-xl bg-surface-container-low text-on-surface font-bold hover:bg-surface-container transition-colors cursor-pointer"
					>
						Kembali
					</button>
					<button
						type="submit"
						class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-xs cursor-pointer"
					>
						{rejectMode === 'CANCEL' ? 'Konfirmasi Batalkan' : 'Konfirmasi Tolak'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: ADD / EDIT ROOM -->
{#if isRoomModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="w-full max-w-md bg-surface-container-lowest rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">meeting_room</span>
					</div>
					<div>
						<h3 class="text-base font-black text-on-surface">
							{editingRoomId ? 'Edit Ruangan Rapat' : 'Tambah Ruangan Rapat'}
						</h3>
						<p class="text-[11px] text-on-surface-variant">Atur kapasitas dan fasilitas ruangan kantor.</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => isRoomModalOpen = false}
					class="p-1.5 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/saveRoom" use:enhance class="p-5 space-y-3.5 text-xs">
				<input type="hidden" name="roomId" value={editingRoomId} />
				<input type="hidden" name="isActive" value={roomIsActive.toString()} />
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="roomCode" class="block font-bold text-on-surface mb-1.5">Kode Ruang <span class="text-rose-500">*</span></label>
						<input
							type="text"
							id="roomCode"
							name="roomCode"
							bind:value={roomCode}
							required
							placeholder="R-MEET-01"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono font-bold"
						/>
					</div>
					<div>
						<label for="colorHex" class="block font-bold text-on-surface mb-1.5">Warna Kalender</label>
						<div class="flex items-center gap-2">
							<input
								type="color"
								id="colorHex"
								name="colorHex"
								bind:value={roomColorHex}
								class="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent"
							/>
							<input
								type="text"
								bind:value={roomColorHex}
								class="w-full px-3 py-2 rounded-xl bg-surface-container-low border-0 outline-none font-mono text-[11px] text-on-surface"
							/>
						</div>
					</div>
				</div>

				<div>
					<label for="roomName" class="block font-bold text-on-surface mb-1.5">Nama Ruangan <span class="text-rose-500">*</span></label>
					<input
						type="text"
						id="roomName"
						name="roomName"
						bind:value={roomName}
						required
						placeholder="Misal: Ruang Rapat Utama (Lt. 2)"
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-medium"
					/>
				</div>

				<div class="grid grid-cols-3 gap-3">
					<div class="col-span-2">
						<label for="location" class="block font-bold text-on-surface mb-1.5">Lokasi Gedung <span class="text-rose-500">*</span></label>
						<input
							type="text"
							id="location"
							name="location"
							bind:value={roomLocation}
							required
							placeholder="Head Office Cilegon - Lt. 2"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-medium"
						/>
					</div>
					<div>
						<label for="capacity" class="block font-bold text-on-surface mb-1.5">Kapasitas</label>
						<input
							type="number"
							id="capacity"
							name="capacity"
							bind:value={roomCapacity}
							min="1"
							max="200"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono font-bold"
						/>
					</div>
				</div>

				<div>
					<label for="facilities" class="block font-bold text-on-surface mb-1.5">
						Daftar Fasilitas (Pisahkan dengan koma)
					</label>
					<input
						type="text"
						id="facilities"
						name="facilities"
						bind:value={roomFacilities}
						placeholder="AC, Whiteboard, Smart TV, Proyektor"
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-medium"
					/>
				</div>

				<div class="pt-3 flex justify-end gap-2.5">
					<button
						type="button"
						onclick={() => isRoomModalOpen = false}
						class="px-4 py-2 rounded-xl bg-surface-container-low text-on-surface font-bold hover:bg-surface-container transition-colors cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition-all shadow-xs cursor-pointer"
					>
						Simpan Ruangan
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
