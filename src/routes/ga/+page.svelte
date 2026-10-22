<script lang="ts">
	let { data } = $props();

	const assets = $derived(data.assets);
	const roomBookings = $derived(data.roomBookings);
	const facilities = $derived(data.facilities);
	const stationery = $derived(data.stationery);

	function formatRupiah(val: number | string | null) {
		const num = typeof val === 'string' ? parseFloat(val) : (val || 0);
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(num);
	}

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
				return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-black animate-pulse';
			case 'HIGH':
				return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300 dark:border-orange-800 font-bold';
			case 'MEDIUM':
				return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-medium';
			default:
				return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-medium';
		}
	}

	function getWoStatusBadge(status: string) {
		switch (status) {
			case 'COMPLETED':
				return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
			case 'IN_PROGRESS':
				return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
			case 'APPROVED':
				return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
			default:
				return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
		}
	}
</script>

<svelte:head>
	<title>GA Dashboard | ERP BCS</title>
</svelte:head>

<div class="space-y-8">
	<!-- Page Header & Fast Navigation Actions -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
		<div>
			<div class="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">
				<span class="material-symbols-outlined text-sm">domain</span>
				<span>ERP BCS • General Affair & Facility Management</span>
			</div>
			<h1 class="text-3xl font-black text-on-surface tracking-tight">GA Dashboard</h1>
			<p class="text-xs text-on-surface-variant mt-1 max-w-2xl">
				Pusat komando pemantauan aset kantor/pool, reservasi ruangan & fasilitas real-time, tiket perbaikan gedung, dan stok perlengkapan operasional.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2.5">
			<a
				href="/ga/assets"
				class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold border border-slate-200 dark:border-slate-800 transition-colors shadow-2xs"
			>
				<span class="material-symbols-outlined text-base text-cyan-600">inventory_2</span>
				<span>Master Aset</span>
			</a>
			<a
				href="/ga/room-bookings"
				class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold border border-slate-200 dark:border-slate-800 transition-colors shadow-2xs"
			>
				<span class="material-symbols-outlined text-base text-amber-600">meeting_room</span>
				<span>Reservasi Ruangan</span>
			</a>
			<a
				href="/ga/facilities"
				class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition-colors"
			>
				<span class="material-symbols-outlined text-base">home_repair_service</span>
				<span>+ Buat Tiket WO</span>
			</a>
		</div>
	</div>

	<!-- Top Highlights: Bento Grid KPI Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Card 1: Nilai Aset Kantor -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-cyan-500/30 flex flex-col justify-between relative overflow-hidden">
			<div class="absolute -right-4 -bottom-4 text-cyan-500/5">
				<span class="material-symbols-outlined text-9xl">domain_verification</span>
			</div>
			<div>
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Nilai Aset</span>
					<div class="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-200/50 dark:border-cyan-800/50">
						<span class="material-symbols-outlined text-[18px]">account_balance_wallet</span>
					</div>
				</div>
				<div class="text-2xl font-black text-on-surface tracking-tight">
					{formatRupiah(assets.totals.total_asset_value)}
				</div>
			</div>
			<div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>{assets.totals.active_assets} Unit Aset Aktif</span>
				<span class="font-bold text-cyan-600 hover:underline"><a href="/ga/assets">Rincian &rarr;</a></span>
			</div>
		</div>

		<!-- Card 2: Reservasi Ruangan & Ketersediaan Real-time -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-amber-500/30 flex flex-col justify-between relative overflow-hidden">
			<div class="absolute -right-4 -bottom-4 text-amber-500/5">
				<span class="material-symbols-outlined text-9xl">meeting_room</span>
			</div>
			<div>
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Reservasi Ruangan</span>
					<div class="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50">
						<span class="material-symbols-outlined text-[18px]">event_available</span>
					</div>
				</div>
				<div class="text-2xl font-black text-on-surface tracking-tight flex items-baseline gap-1.5">
					<span>{roomBookings.stats.pending_bookings}</span>
					<span class="text-sm font-normal text-on-surface-variant">Menunggu Review</span>
				</div>
			</div>
			<div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
				<div class="flex items-center gap-1.5">
					<span class="px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
						{Math.max(0, (roomBookings.stats.active_rooms || 0) - (roomBookings.stats.in_use_now || 0))}/{roomBookings.stats.active_rooms || 0} Ruang Tersedia
					</span>
				</div>
				<span class="font-bold text-amber-600 hover:underline text-xs"><a href="/ga/room-bookings">Kelola &rarr;</a></span>
			</div>
		</div>

		<!-- Card 3: Tiket Pemeliharaan Fasilitas -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-blue-500/30 flex flex-col justify-between relative overflow-hidden">
			<div class="absolute -right-4 -bottom-4 text-blue-500/5">
				<span class="material-symbols-outlined text-9xl">engineering</span>
			</div>
			<div>
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Facility Work Orders</span>
					<div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-800/50">
						<span class="material-symbols-outlined text-[18px]">build_circle</span>
					</div>
				</div>
				<div class="text-2xl font-black text-on-surface tracking-tight">
					{facilities.stats.pending_wo + facilities.stats.in_progress_wo + facilities.stats.approved_wo}
					<span class="text-sm font-normal text-on-surface-variant">Tiket Aktif</span>
				</div>
			</div>
			<div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>{facilities.stats.pending_wo} Menunggu • {facilities.stats.in_progress_wo} Dikerjakan</span>
				<span class="font-bold text-blue-600 hover:underline"><a href="/ga/facilities">Detail &rarr;</a></span>
			</div>
		</div>

		<!-- Card 4: Stok & Permintaan ATK -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-purple-500/30 flex flex-col justify-between relative overflow-hidden">
			<div class="absolute -right-4 -bottom-4 text-purple-500/5">
				<span class="material-symbols-outlined text-9xl">edit_note</span>
			</div>
			<div>
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Request & Stok ATK</span>
					<div class="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/50 dark:border-purple-800/50">
						<span class="material-symbols-outlined text-[18px]">receipt_long</span>
					</div>
				</div>
				<div class="text-2xl font-black text-on-surface tracking-tight">
					{stationery.stats.pending_requests}
					<span class="text-sm font-normal text-on-surface-variant">Request Pending</span>
				</div>
			</div>
			<div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span class="{stationery.stats.low_stock_items > 0 ? 'text-amber-600 font-bold' : ''}">
					{stationery.stats.low_stock_items} Item Stok Menipis
				</span>
				<span class="font-bold text-purple-600 hover:underline"><a href="/ga/stationery">Katalog &rarr;</a></span>
			</div>
		</div>
	</div>

	<!-- Room Reservations & Real-Time Room Availability Section -->
	<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs space-y-5">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
			<div class="flex items-center gap-3">
				<div class="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">meeting_room</span>
				</div>
				<div>
					<h3 class="text-base font-bold text-on-surface">Status Ruangan Real-Time & Jadwal Reservasi Terkini</h3>
					<p class="text-xs text-on-surface-variant">Pantau ketersediaan ruang rapat saat ini serta daftar permohonan peminjaman ruangan yang perlu direview.</p>
				</div>
			</div>
			<div class="flex items-center gap-3">
				<a href="/calendar" class="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1">
					<span class="material-symbols-outlined text-sm">calendar_month</span>
					<span>Kalender Global</span>
				</a>
				<a href="/ga/room-bookings" class="text-xs font-bold text-cyan-600 hover:underline flex items-center gap-1">
					<span>Kelola Reservasi</span>
					<span class="material-symbols-outlined text-sm">arrow_forward</span>
				</a>
			</div>
		</div>

		<!-- Real-time Room Status Strip -->
		{#if roomBookings.rooms.length > 0}
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				{#each roomBookings.rooms as rm}
					<div class="p-3.5 rounded-xl bg-surface-container-low border {rm.currentBookingNumber ? 'border-rose-300 dark:border-rose-800/70' : 'border-emerald-200/80 dark:border-emerald-800/50'} flex flex-col justify-between gap-2">
						<div class="flex items-start justify-between gap-2">
							<div class="flex items-center gap-2 min-w-0">
								<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: {rm.colorHex || '#0284c7'};"></span>
								<div class="truncate">
									<div class="text-xs font-bold text-on-surface truncate">{rm.roomName}</div>
									<div class="text-[10px] text-on-surface-variant">{rm.location} • {rm.capacity} org</div>
								</div>
							</div>
							{#if rm.currentBookingNumber}
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

						{#if rm.currentBookingNumber}
							<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[10px] text-on-surface-variant">
								<div class="font-bold text-on-surface truncate">{rm.currentTitle}</div>
								<div>{rm.currentRequester} ({rm.currentStart} - {rm.currentEnd} WIB)</div>
							</div>
						{:else}
							<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-on-surface-variant">
								<span>Jadwal hari ini: <strong class="text-on-surface">{rm.todayCount || 0} sesi</strong></span>
								<a href="/ga/room-bookings" class="text-cyan-600 font-bold hover:underline">Pinjam &rarr;</a>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Upcoming & Pending Bookings Table -->
		{#if roomBookings.upcomingList.length === 0}
			<div class="py-6 text-center text-on-surface-variant flex flex-col items-center bg-surface-container-low rounded-xl">
				<span class="material-symbols-outlined text-3xl text-emerald-500 mb-1">event_available</span>
				<p class="text-xs font-bold text-on-surface">Belum Ada Jadwal Reservasi Mendatang</p>
				<p class="text-[11px] text-on-surface-variant">Seluruh ruang rapat tersedia untuk dipinjam.</p>
			</div>
		{:else}
			<div class="overflow-x-auto rounded-xl border border-slate-200/60 dark:border-slate-800/60">
				<table class="w-full text-left text-xs">
					<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3 px-4">No. Booking</th>
							<th class="py-3 px-4">Ruangan</th>
							<th class="py-3 px-4">Agenda / Keperluan</th>
							<th class="py-3 px-4">Pemohon & Divisi</th>
							<th class="py-3 px-4">Waktu Pelaksanaan</th>
							<th class="py-3 px-4 text-center">Status</th>
							<th class="py-3 px-4 text-center">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each roomBookings.upcomingList as bkg}
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-3 px-4 font-mono font-bold text-cyan-700 dark:text-cyan-300">
									{bkg.bookingNumber}
								</td>
								<td class="py-3 px-4">
									<div class="flex items-center gap-1.5 font-semibold text-on-surface">
										<span class="w-2 h-2 rounded-full" style="background-color: {bkg.roomColor || '#0284c7'};"></span>
										<span>{bkg.roomName}</span>
									</div>
									<div class="text-[10px] text-on-surface-variant">{bkg.roomLocation}</div>
								</td>
								<td class="py-3 px-4 font-semibold text-on-surface max-w-xs truncate">
									{bkg.title}
								</td>
								<td class="py-3 px-4">
									<div class="font-medium text-on-surface">{bkg.requesterName}</div>
									<div class="text-[10px] text-on-surface-variant">{bkg.department || 'Umum'} • {bkg.attendeesCount} org</div>
								</td>
								<td class="py-3 px-4 whitespace-nowrap">
									<div class="font-medium text-on-surface flex items-center gap-1.5">
										<span>{formatDate(bkg.bookingDate)}</span>
										{#if bkg.isToday}
											<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">Hari Ini</span>
										{/if}
									</div>
									<div class="text-[10px] font-mono text-on-surface-variant">{bkg.startTimeFormatted} - {bkg.endTimeFormatted} WIB</div>
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									{#if bkg.isInUseNow}
										<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
											<span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
											Sedang Berlangsung
										</span>
									{:else if bkg.status === 'APPROVED'}
										<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
											Disetujui
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
											Menunggu Review
										</span>
									{/if}
								</td>
								<td class="py-3 px-4 text-center">
									<a
										href="/ga/room-bookings"
										class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 transition-colors text-[11px] font-bold"
									>
										<span>{bkg.status === 'PENDING' ? 'Review' : 'Detail'}</span>
										<span class="material-symbols-outlined text-[13px]">arrow_forward</span>
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- 2-Column Grid: Facility Work Orders & Stationery Requests -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Left: Tiket Pemeliharaan Sarana Gedung/Pool -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-[18px]">build</span>
					</div>
					<div>
						<h3 class="text-sm font-bold text-on-surface">Tiket Pemeliharaan Fasilitas Terkini</h3>
						<p class="text-[11px] text-on-surface-variant">Work orders perbaikan kantor, pool & instalasi listrik</p>
					</div>
				</div>
				<a href="/ga/facilities" class="text-xs font-bold text-cyan-600 hover:underline">Kelola &rarr;</a>
			</div>

			<div class="space-y-3">
				{#each facilities.recentList as wo}
					<div class="p-3.5 rounded-xl bg-surface-container-low border border-slate-200/50 dark:border-slate-800/50 hover:border-primary/20 transition-all flex flex-col gap-2">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="font-mono text-xs font-bold text-on-surface">{wo.wo_number}</span>
								<span class="px-2 py-0.5 rounded text-[10px] {getUrgencyBadge(wo.urgency)}">
									{wo.urgency}
								</span>
							</div>
							<span class="px-2 py-0.5 rounded text-[10px] font-bold {getWoStatusBadge(wo.status)}">
								{wo.status}
							</span>
						</div>

						<p class="text-xs text-on-surface font-semibold line-clamp-1">{wo.description}</p>

						<div class="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 border-t border-slate-100 dark:border-slate-800/50">
							<div class="flex items-center gap-1.5">
								<span class="material-symbols-outlined text-xs">location_on</span>
								<span>{wo.location}</span>
							</div>
							<div class="font-medium">
								{wo.technician_vendor || 'Belum ditugaskan'}
							</div>
						</div>
					</div>
				{/each}

				{#if facilities.recentList.length === 0}
					<p class="text-xs text-on-surface-variant text-center py-6">Tidak ada tiket pemeliharaan fasilitas aktif.</p>
				{/if}
			</div>
		</div>

		<!-- Right: Stok ATK Kritis & Pengajuan Divisi -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs space-y-5">
			<!-- Peringatan Stok Minimum ATK -->
			<div>
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-2.5">
						<div class="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
							<span class="material-symbols-outlined text-[18px]">inventory</span>
						</div>
						<div>
							<h3 class="text-sm font-bold text-on-surface">Peringatan Stok Habis Pakai (ATK)</h3>
							<p class="text-[11px] text-on-surface-variant">Item dengan stok berada di bawah batas minimum</p>
						</div>
					</div>
					<a href="/ga/stationery" class="text-xs font-bold text-purple-600 hover:underline">Semua ATK &rarr;</a>
				</div>

				{#if stationery.lowStockList.length === 0}
					<p class="text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
						<span class="material-symbols-outlined text-sm">check_circle</span>
						Seluruh stok ATK & perlengkapan berada di atas batas minimum aman.
					</p>
				{:else}
					<div class="space-y-2">
						{#each stationery.lowStockList as item}
							<div class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-slate-200/40 dark:border-slate-800/40">
								<div>
									<div class="font-bold text-xs text-on-surface">{item.name}</div>
									<div class="text-[10px] text-on-surface-variant font-mono">{item.item_code} • {item.category}</div>
								</div>
								<div class="text-right">
									<span class="px-2 py-0.5 rounded text-[11px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200">
										Sisa: {item.stock_quantity} {item.unit}
									</span>
									<div class="text-[9px] text-on-surface-variant mt-0.5">Min: {item.minimum_stock} {item.unit}</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Pengajuan ATK Divisi Terkini -->
			<div class="pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
				<div class="flex items-center justify-between mb-3">
					<h4 class="text-xs font-bold text-on-surface uppercase tracking-wider">Pengajuan Permintaan Terakhir</h4>
					<a href="/ga/stationery" class="text-xs font-bold text-cyan-600 hover:underline">Approval &rarr;</a>
				</div>

				<div class="space-y-2">
					{#each stationery.recentRequests as req}
						<div class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low text-xs border border-slate-200/40 dark:border-slate-800/40">
							<div>
								<div class="font-mono font-bold text-on-surface">{req.req_number}</div>
								<div class="text-[11px] text-on-surface-variant">{req.department} • {req.requester_name}</div>
							</div>
							<div class="text-right">
								<span class="px-2 py-0.5 rounded text-[10px] font-bold {req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
									{req.status}
								</span>
								<div class="text-[10px] text-on-surface-variant mt-0.5">{req.total_items_count} item</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
