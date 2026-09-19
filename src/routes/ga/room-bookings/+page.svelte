<script lang="ts">
	import { enhance } from '$app/forms';
	import { addToast } from '$lib/stores/notifications';

	let { data, form } = $props();

	let activeTab = $state<'BOOKINGS' | 'ROOMS'>('BOOKINGS');
	let statusFilter = $state<string>('ALL');
	let roomFilter = $state<string>('ALL');
	let searchQuery = $state<string>('');

	// Modal Reject State
	let isRejectModalOpen = $state(false);
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

	// Filtered Bookings
	let filteredBookings = $derived.by(() => {
		return (data.bookings || []).filter((b: any) => {
			if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
			if (roomFilter !== 'ALL' && b.roomId.toString() !== roomFilter) return false;
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

	function openRejectModal(id: number, bkgNum: string) {
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
		} else {
			editingRoomId = 0;
			roomCode = '';
			roomName = '';
			roomLocation = 'Head Office Cilegon';
			roomCapacity = 8;
			roomColorHex = '#0284c7';
			roomFacilities = 'AC, Whiteboard, Smart TV';
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
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Manajemen & Approval Peminjaman Ruangan</h1>
				<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
					GA Facility Control
				</span>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-0.5">
				Tinjau permohonan peminjaman ruangan dari seluruh karyawan, kelola persetujuan (approval), dan atur fasilitas kantor.
			</p>
		</div>

		<div class="flex items-center gap-2.5">
			<a
				href="/calendar"
				class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface hover:bg-surface-container text-xs font-bold transition-all shadow-xs"
			>
				<span class="material-symbols-outlined text-base text-amber-600">calendar_month</span>
				<span>Buka Kalender Global</span>
			</a>
			{#if activeTab === 'ROOMS'}
				<button
					type="button"
					onclick={() => openRoomModal()}
					class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">add</span>
					<span>Tambah Ruangan</span>
				</button>
			{/if}
		</div>
	</header>

	<!-- KPI Metric Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Card 1: Menunggu Persetujuan (Pending) -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-amber-500/30 shadow-xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Menunggu Review GA</span>
				<div class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">hourglass_top</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface font-mono">{data.stats.pendingCount}</div>
			<p class="text-[11px] text-amber-600 font-bold mt-1">Perlu tindakan review</p>
		</div>

		<!-- Card 2: Disetujui (Approved) -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-emerald-500/30 shadow-xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Disetujui / Terkunci</span>
				<div class="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">lock</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface font-mono">{data.stats.approvedCount}</div>
			<p class="text-[11px] text-emerald-600 font-bold mt-1">Slot aktif di kalender</p>
		</div>

		<!-- Card 3: Total Permohonan -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Reservasi</span>
				<div class="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">history</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface font-mono">{data.stats.totalBookings}</div>
			<p class="text-[11px] text-on-surface-variant font-medium mt-1">Seluruh riwayat booking</p>
		</div>

		<!-- Card 4: Total Fasilitas Ruangan -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Master Ruang Rapat</span>
				<div class="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-[18px]">meeting_room</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface font-mono">{data.rooms?.length || 0}</div>
			<p class="text-[11px] text-purple-600 font-bold mt-1">Ruangan terdaftar aktif</p>
		</div>
	</div>

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
		<!-- Filters & Search Toolbar -->
		<div class="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center gap-3 w-full sm:w-80">
				<div class="relative w-full">
					<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">search</span>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Cari no booking, judul, nama pemohon..."
						class="w-full bg-surface border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 pl-9 pr-3 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
					/>
				</div>
			</div>

			<div class="flex items-center gap-2.5 w-full sm:w-auto">
				<!-- Status Filter -->
				<select
					bind:value={statusFilter}
					class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
				>
					<option value="ALL">Semua Status</option>
					<option value="PENDING">⏳ Menunggu Review GA</option>
					<option value="APPROVED">🔒 Disetujui (Terkunci)</option>
					<option value="REJECTED">❌ Ditolak</option>
				</select>

				<!-- Room Filter -->
				<select
					bind:value={roomFilter}
					class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
				>
					<option value="ALL">Semua Ruangan</option>
					{#each data.rooms || [] as rm}
						<option value={rm.id.toString()}>{rm.roomName}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Table Bookings -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs min-w-[900px]">
					<thead class="bg-slate-100/70 dark:bg-slate-800/50 font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3 px-4">No. Booking & Tanggal</th>
							<th class="py-3 px-4">Ruangan & Jam</th>
							<th class="py-3 px-4">Keperluan & Pemohon</th>
							<th class="py-3 px-4 text-center">Status</th>
							<th class="py-3 px-4 text-right">Aksi Review</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium">
						{#if filteredBookings.length === 0}
							<tr>
								<td colspan="5" class="py-12 text-center text-on-surface-variant">
									Tidak ditemukan data booking yang sesuai dengan kriteria filter.
								</td>
							</tr>
						{:else}
							{#each filteredBookings as b}
								<tr class="hover:bg-surface-container/40 transition-colors">
									<td class="py-3.5 px-4 font-mono">
										<span class="font-bold text-cyan-700 dark:text-cyan-300 block">{b.bookingNumber}</span>
										<span class="text-[10px] text-on-surface-variant font-sans">{b.bookingDate}</span>
									</td>
									<td class="py-3.5 px-4">
										<div class="flex items-center gap-1.5">
											<span class="w-2 h-2 rounded-full shrink-0" style="background-color: {b.roomColor};"></span>
											<span class="font-bold text-on-surface">{b.roomName}</span>
										</div>
										<p class="text-[10px] text-on-surface-variant font-mono mt-0.5">
											Jam: {b.startTimeFormatted} - {b.endTimeFormatted} WIB
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
										{#if b.status === 'REJECTED' && b.rejectionReason}
											<div class="mt-1 p-1.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px]">
												<strong>Alasan Ditolak:</strong> {b.rejectionReason}
											</div>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-center">
										<span class="px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 {b.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200' : b.status === 'PENDING' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200'}">
											<span class="material-symbols-outlined text-xs">
												{b.status === 'APPROVED' ? 'lock' : b.status === 'PENDING' ? 'hourglass_top' : 'cancel'}
											</span>
											<span>{b.status === 'APPROVED' ? 'Disetujui' : b.status === 'PENDING' ? 'Pending' : 'Ditolak'}</span>
										</span>
										{#if b.approvedBy}
											<span class="block text-[9px] text-on-surface-variant mt-0.5">Oleh: {b.approvedBy}</span>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-right space-x-1">
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

											<!-- Button Reject -->
											<button
												type="button"
												onclick={() => openRejectModal(b.id, b.bookingNumber)}
												class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
												title="Tolak Peminjaman"
											>
												<span class="material-symbols-outlined text-xs">close</span>
												<span>Tolak</span>
											</button>
										{:else if b.status === 'APPROVED'}
											<span class="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
												<span class="material-symbols-outlined text-xs">verified</span>
												<span>Terkunci di Kalender</span>
											</span>
										{:else}
											<span class="text-[10px] text-slate-400 italic">Selesai</span>
										{/if}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<!-- Tab: Master Ruangan -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each data.rooms || [] as rm}
				<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
					<div>
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center gap-2">
								<span class="w-3.5 h-3.5 rounded-full" style="background-color: {rm.colorHex};"></span>
								<span class="font-mono text-xs font-bold text-on-surface-variant">{rm.roomCode}</span>
							</div>
							<span class="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold">
								Kapasitas {rm.capacity} Orang
							</span>
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
									<span class="px-2 py-0.5 rounded-md bg-surface border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-on-surface">
										{f}
									</span>
								{/each}
							</div>
						</div>
					</div>

					<div class="mt-5 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
						<span class="text-[11px] text-on-surface-variant font-medium">
							Total Digunakan: <strong class="text-on-surface font-mono">{rm.totalApprovedBookings || 0}x</strong>
						</span>
						<button
							type="button"
							onclick={() => openRoomModal(rm)}
							class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
						>
							Edit Ruangan
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- MODAL: REJECT BOOKING -->
{#if isRejectModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="w-full max-w-md bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">block</span>
					</div>
					<div>
						<h3 class="text-base font-black text-on-surface">Tolak Permohonan Ruangan</h3>
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

			<form method="POST" action="?/rejectBooking" use:enhance class="p-5 space-y-4 text-xs">
				<input type="hidden" name="bookingId" value={rejectBookingId} />
				<div>
					<label for="rejectionReason" class="block font-bold text-on-surface mb-1">
						Alasan Penolakan *
					</label>
					<textarea
						id="rejectionReason"
						name="rejectionReason"
						bind:value={rejectionReason}
						required
						rows="3"
						placeholder="Misal: Ruangan sedang dialokasikan untuk audit internal atau waktu bentrok dengan agenda direksi."
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none resize-none"
					></textarea>
				</div>

				<div class="pt-2 flex justify-end gap-2.5">
					<button
						type="button"
						onclick={() => isRejectModalOpen = false}
						class="px-4 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface font-bold hover:bg-surface-container transition-colors cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-xs cursor-pointer"
					>
						Konfirmasi Tolak
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: ADD / EDIT ROOM -->
{#if isRoomModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="w-full max-w-md bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden">
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
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="roomCode" class="block font-bold text-on-surface mb-1">Kode Ruang *</label>
						<input
							type="text"
							id="roomCode"
							name="roomCode"
							bind:value={roomCode}
							required
							placeholder="R-MEET-01"
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
						/>
					</div>
					<div>
						<label for="colorHex" class="block font-bold text-on-surface mb-1">Warna Kalender</label>
						<div class="flex items-center gap-2">
							<input
								type="color"
								id="colorHex"
								name="colorHex"
								bind:value={roomColorHex}
								class="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700"
							/>
							<input
								type="text"
								bind:value={roomColorHex}
								class="w-full px-2 py-1.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
							/>
						</div>
					</div>
				</div>

				<div>
					<label for="roomName" class="block font-bold text-on-surface mb-1">Nama Ruangan *</label>
					<input
						type="text"
						id="roomName"
						name="roomName"
						bind:value={roomName}
						required
						placeholder="Misal: Ruang Rapat Utama (Lt. 2)"
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
					/>
				</div>

				<div class="grid grid-cols-3 gap-3">
					<div class="col-span-2">
						<label for="location" class="block font-bold text-on-surface mb-1">Lokasi Gedung *</label>
						<input
							type="text"
							id="location"
							name="location"
							bind:value={roomLocation}
							required
							placeholder="Head Office Cilegon - Lt. 2"
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
						/>
					</div>
					<div>
						<label for="capacity" class="block font-bold text-on-surface mb-1">Kapasitas</label>
						<input
							type="number"
							id="capacity"
							name="capacity"
							bind:value={roomCapacity}
							min="1"
							max="200"
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
						/>
					</div>
				</div>

				<div>
					<label for="facilities" class="block font-bold text-on-surface mb-1">
						Daftar Fasilitas (Pisahkan dengan koma)
					</label>
					<input
						type="text"
						id="facilities"
						name="facilities"
						bind:value={roomFacilities}
						placeholder="AC, Whiteboard, Smart TV, Proyektor"
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
					/>
				</div>

				<div class="pt-3 flex justify-end gap-2.5">
					<button
						type="button"
						onclick={() => isRoomModalOpen = false}
						class="px-4 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-on-surface font-bold hover:bg-surface-container transition-colors cursor-pointer"
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
