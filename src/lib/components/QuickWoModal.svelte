<script lang="ts">
	import { clickOutside } from '$lib/utils/clickOutside';
	import { addToast } from '$lib/stores/notifications';

	let { isOpen = $bindable(false), onClose, user, initialView = 'LIST' } = $props<{
		isOpen: boolean;
		onClose?: () => void;
		user?: any;
		initialView?: 'LIST' | 'FORM';
	}>();

	// View mode: 'LIST' (daftar tiket terkini) | 'FORM' (form lapor baru)
	let activeView = $state<'LIST' | 'FORM'>('LIST');

	$effect(() => {
		if (isOpen && initialView) {
			activeView = initialView;
		}
	});

	// Data tickets & Switcher Scope
	let tickets = $state<any[]>([]);
	let activeScope = $state<'my' | 'all'>('my');
	let myCount = $state<number>(0);
	let allCount = $state<number>(0);
	let isGaOrAdmin = $state(false);
	let isLoading = $state(false);
	let hasLoaded = $state(false);

	// Form fields
	let facilityType = $state('AC_HVAC');
	let location = $state('');
	let description = $state('');
	let urgency = $state<'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'>('MEDIUM');
	let photoFile = $state<File | null>(null);
	let photoPreview = $state<string | null>(null);
	let lightboxPhoto = $state<{ url: string; title: string } | null>(null);
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	// Fetch data saat popover dibuka
	$effect(() => {
		if (isOpen && !hasLoaded) {
			fetchTickets('my');
		}
	});

	async function fetchTickets(scope: 'my' | 'all' = activeScope) {
		isLoading = true;
		try {
			const res = await fetch(`/api/ga/work-orders?scope=${scope}`);
			if (res.ok) {
				const data = await res.json();
				if (data.success) {
					tickets = data.workOrders || [];
					activeScope = data.scope || scope;
					isGaOrAdmin = !!data.isGaOrAdmin;
					if (typeof data.myCount === 'number') myCount = data.myCount;
					if (typeof data.allCount === 'number') allCount = data.allCount;
					hasLoaded = true;
				}
			}
		} catch (err) {
			console.error('Error fetching user tickets:', err);
		} finally {
			isLoading = false;
		}
	}

	function switchScope(newScope: 'my' | 'all') {
		if (activeScope === newScope && hasLoaded) return;
		activeScope = newScope;
		fetchTickets(newScope);
	}

	function handlePhotoSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			const file = target.files[0];
			if (file.size > 10 * 1024 * 1024) {
				errorMessage = 'Ukuran berkas foto maksimal 10MB';
				return;
			}
			photoFile = file;
			photoPreview = URL.createObjectURL(file);
		}
	}

	function removePhoto() {
		photoFile = null;
		if (photoPreview) {
			URL.revokeObjectURL(photoPreview);
			photoPreview = null;
		}
	}

	function resetForm() {
		facilityType = 'AC_HVAC';
		location = '';
		description = '';
		urgency = 'MEDIUM';
		removePhoto();
		errorMessage = '';
	}

	function handleClose() {
		if (isSubmitting) return;
		resetForm();
		isOpen = false;
		if (onClose) onClose();
	}

	function openForm() {
		resetForm();
		activeView = 'FORM';
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!facilityType || !location.trim() || !description.trim()) {
			errorMessage = 'Kategori sarana, lokasi, dan deskripsi kerusakan wajib diisi!';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			const formData = new FormData();
			formData.append('facility_type', facilityType);
			formData.append('location', location.trim());
			formData.append('description', description.trim());
			formData.append('urgency', urgency);
			if (user?.name) formData.append('requester_name', user.name);
			if (user?.department || user?.division) formData.append('department', user.department || user.division);
			if (user?.payrollId) formData.append('requester_nik', user.payrollId);
			if (photoFile) formData.append('photo', photoFile);

			const res = await fetch('/api/ga/work-orders', {
				method: 'POST',
				body: formData
			});

			const result = await res.json();

			if (res.ok && result.success) {
				addToast({
					title: `Tiket ${result.woNumber} Berhasil Dibuat`,
					message: result.message || 'Laporan kerusakan telah diteruskan ke tim General Affair.',
					type: 'SUCCESS'
				});
				resetForm();
				activeView = 'LIST';
				activeScope = 'my';
				await fetchTickets('my');
			} else {
				errorMessage = result.message || 'Gagal mengirim laporan perbaikan.';
			}
		} catch (err: any) {
			console.error('Error submitting Quick WO:', err);
			errorMessage = err.message || 'Terjadi gangguan jaringan saat mengirim tiket.';
		} finally {
			isSubmitting = false;
		}
	}

	function getFacilityLabel(type: string) {
		switch (type) {
			case 'AC_HVAC': return 'AC & Pendingin Ruangan';
			case 'KELISTRIKAN': return 'Kelistrikan, Panel & Lampu';
			case 'PLUMBING_AIR': return 'Plumbing & Saluran Air';
			case 'GENSET': return 'Genset & Power Backup';
			case 'PINTU_PAGAR_POOL': return 'Pintu Gerbang & Pagar';
			case 'PENGECATAN_GEDUNG': return 'Pengecatan Gedung';
			case 'PERABOT_KANTOR': return 'Meja, Kursi & Perabot';
			case 'CIVIL_PLUMBING': return 'Sipil & Gedung';
			case 'LISTRIK_GENSET': return 'Kelistrikan & Genset';
			default: return type || 'Lainnya';
		}
	}

	function getFacilityIcon(type: string) {
		switch (type) {
			case 'AC_HVAC': return 'ac_unit';
			case 'KELISTRIKAN': return 'bolt';
			case 'PLUMBING_AIR': return 'water_drop';
			case 'GENSET': return 'power';
			case 'PINTU_PAGAR_POOL': return 'door_front';
			case 'PENGECATAN_GEDUNG': return 'format_paint';
			case 'PERABOT_KANTOR': return 'chair';
			default: return 'build';
		}
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'COMPLETED':
				return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200';
			case 'APPROVED':
				return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200';
			case 'IN_PROGRESS':
				return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200';
			case 'CANCELLED':
				return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200';
			default:
				return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200';
		}
	}

	function getStatusLabel(status: string) {
		switch (status) {
			case 'COMPLETED': return 'Selesai';
			case 'APPROVED': return 'Disetujui';
			case 'IN_PROGRESS': return 'Dikerjakan';
			case 'CANCELLED': return 'Dibatalkan';
			default: return 'Menunggu GA';
		}
	}
</script>

{#if isOpen}
	<div
		class="absolute right-0 mt-2 w-96 sm:w-[420px] max-h-[88vh] bg-surface-container-lowest rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200"
		use:clickOutside={handleClose}
	>
		<!-- Popover Header -->
		<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low/70 sticky top-0 z-10 backdrop-blur-xs">
			<div class="flex items-center gap-2.5">
				<div class="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-[19px]">home_repair_service</span>
				</div>
				<div>
					<h3 class="text-xs font-black text-on-surface leading-tight">Tiket & Perbaikan</h3>
					<p class="text-[10px] text-on-surface-variant">Layanan fasilitas & sarana GA</p>
				</div>
			</div>

			<div class="flex items-center gap-1.5">
				{#if activeView === 'LIST'}
					<button
						type="button"
						onclick={openForm}
						class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
						title="Buat Laporan Kerusakan Baru"
					>
						<span class="material-symbols-outlined text-[14px]">add</span>
						<span>Lapor</span>
					</button>
				{:else}
					<button
						type="button"
						onclick={() => (activeView = 'LIST')}
						class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-on-surface text-[11px] font-bold transition-all hover:bg-surface-container cursor-pointer"
					>
						<span class="material-symbols-outlined text-[14px]">arrow_back</span>
						<span>Tiket Saya</span>
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
		<div class="overflow-y-auto flex-1 p-3.5 space-y-3 scrollbar-thin">
			{#if activeView === 'LIST'}
				<!-- VIEW 1: DAFTAR TIKET (DENGAN SWITCHER UNTUK ADMIN/GA) -->
				<div class="flex items-center justify-between px-1 gap-2">
					{#if isGaOrAdmin}
						<!-- Admin Segmented Switcher -->
						<div class="inline-flex items-center p-0.5 rounded-xl bg-surface-container border border-slate-200/80 dark:border-slate-800/80 text-[11px] font-bold">
							<button
								type="button"
								onclick={() => switchScope('my')}
								class="px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 {activeScope === 'my'
									? 'bg-surface text-blue-600 font-extrabold shadow-2xs'
									: 'text-on-surface-variant hover:text-on-surface'}"
							>
								<span>Tiket Saya</span>
								<span class="px-1.5 py-0.2 rounded-full {activeScope === 'my' ? 'bg-blue-500/15 text-blue-600' : 'bg-surface-container-high text-on-surface-variant'} text-[10px] font-mono font-bold">
									{myCount}
								</span>
							</button>
							<button
								type="button"
								onclick={() => switchScope('all')}
								class="px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 {activeScope === 'all'
									? 'bg-surface text-blue-600 font-extrabold shadow-2xs'
									: 'text-on-surface-variant hover:text-on-surface'}"
							>
								<span>Semua Tiket GA</span>
								<span class="px-1.5 py-0.2 rounded-full {activeScope === 'all' ? 'bg-blue-500/15 text-blue-600' : 'bg-surface-container-high text-on-surface-variant'} text-[10px] font-mono font-bold">
									{allCount}
								</span>
							</button>
						</div>
					{:else}
						<div class="flex items-center gap-1.5">
							<span class="text-xs font-black text-on-surface font-mono">Riwayat Laporan Saya</span>
							<span class="px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold">
								{tickets.length}
							</span>
						</div>
					{/if}

					<button
						type="button"
						onclick={() => fetchTickets(activeScope)}
						disabled={isLoading}
						class="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
						title="Segarkan data"
					>
						<span class="material-symbols-outlined text-xs {isLoading ? 'animate-spin' : ''}">refresh</span>
					</button>
				</div>

				{#if isLoading && tickets.length === 0}
					<div class="py-8 text-center text-on-surface-variant text-xs flex flex-col items-center gap-2">
						<span class="w-5 h-5 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></span>
						<span class="text-[11px]">Memuat tiket perbaikan...</span>
					</div>
				{:else if tickets.length === 0}
					<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 p-6 text-center text-on-surface-variant space-y-2.5">
						<div class="w-10 h-10 rounded-2xl bg-surface-container mx-auto flex items-center justify-center text-on-surface-variant opacity-60">
							<span class="material-symbols-outlined text-2xl">build_circle</span>
						</div>
						<div>
							<p class="font-bold text-on-surface text-xs">
								{activeScope === 'my' ? 'Belum Ada Tiket Laporan Anda' : 'Belum Ada Tiket Masuk GA'}
							</p>
							<p class="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
								{activeScope === 'my'
									? 'Semua sarana kerja di ruangan Anda dalam kondisi baik. Jika terjadi kendala seperti AC bocor atau lampu mati, laporkan di sini.'
									: 'Seluruh sarana dan fasilitas kantor sedang dalam kondisi baik tanpa tiket perbaikan yang tertunda.'}
							</p>
						</div>
						<button
							type="button"
							onclick={openForm}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
						>
							<span class="material-symbols-outlined text-[15px]">add</span>
							<span>Buat Laporan Baru</span>
						</button>
					</div>
				{:else}
					<div class="space-y-2">
						{#each tickets as t (t.id)}
							<div class="p-3 rounded-2xl bg-surface border border-slate-200/70 dark:border-slate-800/70 text-xs shadow-2xs hover:border-blue-400/50 transition-all space-y-2">
								<div class="flex items-start justify-between gap-2">
									<div class="flex items-center gap-2">
										<div class="w-7 h-7 rounded-xl bg-surface-container-high text-blue-600 flex items-center justify-center shrink-0">
											<span class="material-symbols-outlined text-[16px]">{getFacilityIcon(t.facility_type)}</span>
										</div>
										<div>
											<span class="font-mono font-bold text-on-surface text-xs">{t.wo_number}</span>
											<div class="text-[10px] text-on-surface-variant font-medium">
												{getFacilityLabel(t.facility_type)}
											</div>
										</div>
									</div>

									<div class="flex flex-col items-end gap-1">
										<span class="px-2 py-0.5 rounded-md text-[9px] font-bold border {getStatusBadge(t.status)}">
											{getStatusLabel(t.status)}
										</span>
										{#if t.urgency === 'EMERGENCY'}
											<span class="text-[9px] font-bold text-rose-600 bg-rose-500/10 px-1.5 py-0.2 rounded font-mono">
												Darurat
											</span>
										{:else if t.urgency === 'HIGH'}
											<span class="text-[9px] font-bold text-orange-600 bg-orange-500/10 px-1.5 py-0.2 rounded font-mono">
												Mendesak
											</span>
										{/if}
									</div>
								</div>

								<p class="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2 bg-surface-container-low/50 p-2 rounded-xl">
									{t.description}
								</p>

								{#if t.photo_condition || t.photo_completion}
									<div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
										{#if t.photo_condition}
											<button
												type="button"
												onclick={() => lightboxPhoto = { url: `/api/uploads/${t.photo_condition}`, title: `Kondisi Sebelum (Before) • ${t.wo_number}` }}
												class="relative rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-700 h-14 group cursor-pointer text-left block"
											>
												<img src={`/api/uploads/${t.photo_condition}`} alt="Before" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
												<span class="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/70 text-white text-[9px] font-bold">
													Sebelum
												</span>
											</button>
										{:else}
											<div class="h-14 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-[10px] text-slate-400">
												Tanpa Foto Sebelum
											</div>
										{/if}

										{#if t.photo_completion}
											<button
												type="button"
												onclick={() => lightboxPhoto = { url: `/api/uploads/${t.photo_completion}`, title: `Hasil Pekerjaan (After) • ${t.wo_number}` }}
												class="relative rounded-xl overflow-hidden border border-emerald-500/50 h-14 group cursor-pointer text-left block"
											>
												<img src={`/api/uploads/${t.photo_completion}`} alt="After" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
												<span class="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-emerald-700/80 text-white text-[9px] font-bold">
													Sesudah
												</span>
											</button>
										{:else}
											<div class="h-14 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-[10px] text-slate-400">
												Menunggu Selesai
											</div>
										{/if}
									</div>
								{/if}

								<div class="flex items-center justify-between text-[10px] text-on-surface-variant pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
									<div class="flex items-center gap-1 truncate max-w-[200px]" title={t.location}>
										<span class="material-symbols-outlined text-[12px] text-blue-600 shrink-0">location_on</span>
										<span class="truncate">{t.location}</span>
									</div>
									<div class="font-mono shrink-0 text-right">
										{#if activeScope === 'all' && t.requester_name}
											<span class="text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[110px] inline-block align-bottom">{t.requester_name}</span> · 
										{/if}
										<span>{t.created_at_str || '-'}</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Footer link -->
				<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
					<a
						href="/ga/facilities"
						onclick={handleClose}
						class="w-full inline-flex items-center justify-center gap-1 py-1.5 text-center text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-surface-container-low rounded-xl transition-colors cursor-pointer"
					>
						<span>Buka Modul Pemeliharaan Fasilitas</span>
						<span class="material-symbols-outlined text-sm">arrow_forward</span>
					</a>
				</div>
			{:else}
				<!-- VIEW 2: FORM LAPOR KERUSAKAN CEPAT -->
				<form onsubmit={handleSubmit} class="space-y-3 text-xs">
					{#if errorMessage}
						<div class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
							<span class="material-symbols-outlined text-sm">error</span>
							<span>{errorMessage}</span>
						</div>
					{/if}

					<!-- Info Pelapor Badge -->
					<div class="p-2.5 rounded-2xl bg-surface-container-low border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs">
						<div class="flex items-center gap-2">
							<div class="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold text-xs">
								<span class="material-symbols-outlined text-[14px]">person</span>
							</div>
							<div>
								<div class="text-[9px] uppercase font-bold text-on-surface-variant">Pelapor</div>
								<div class="font-bold text-on-surface text-[11px]">{user?.name || 'Karyawan BCS'}</div>
							</div>
						</div>
						<div class="text-right">
							<div class="text-[9px] uppercase font-bold text-on-surface-variant">Departemen</div>
							<div class="font-mono text-on-surface text-[11px] font-semibold">
								{user?.department || user?.division || 'Umum'}
							</div>
						</div>
					</div>

					<!-- Kategori Sarana -->
					<div>
						<label for="popover_fac_type" class="block font-bold text-on-surface mb-1">
							Kategori Sarana / Fasilitas <span class="text-rose-500">*</span>
						</label>
						<select
							id="popover_fac_type"
							bind:value={facilityType}
							required
							class="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-blue-500/30 text-on-surface cursor-pointer font-medium transition-all"
						>
							<option value="AC_HVAC">AC & Pendingin Ruangan</option>
							<option value="KELISTRIKAN">Kelistrikan, Panel & Lampu</option>
							<option value="PLUMBING_AIR">Plumbing, Keran & Air</option>
							<option value="GENSET">Genset & Power Backup</option>
							<option value="PINTU_PAGAR_POOL">Pintu, Gerbang & Pagar</option>
							<option value="PENGECATAN_GEDUNG">Pengecatan & Fisik Gedung</option>
							<option value="PERABOT_KANTOR">Meja, Kursi & Perabot Kantor</option>
							<option value="LAINNYA">Kerusakan Fasilitas Lainnya</option>
						</select>
					</div>

					<!-- Urgensi Segments -->
					<div>
						<label for="popover_urgency_group" class="block font-bold text-on-surface mb-1">
							Tingkat Urgensi <span class="text-rose-500">*</span>
						</label>
						<div class="grid grid-cols-3 gap-1.5" id="popover_urgency_group">
							<button
								type="button"
								onclick={() => (urgency = 'LOW')}
								class="py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer text-center {urgency === 'LOW' ? 'bg-slate-700 text-white shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}"
							>
								Rendah
							</button>
							<button
								type="button"
								onclick={() => (urgency = 'MEDIUM')}
								class="py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer text-center {urgency === 'MEDIUM' ? 'bg-amber-600 text-white shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}"
							>
								Sedang
							</button>
							<button
								type="button"
								onclick={() => (urgency = 'EMERGENCY')}
								class="py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer text-center {urgency === 'EMERGENCY' ? 'bg-rose-600 text-white shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}"
							>
								Darurat
							</button>
						</div>
					</div>

					<!-- Lokasi Detail -->
					<div>
						<label for="popover_fac_location" class="block font-bold text-on-surface mb-1">
							Lokasi Detail / Ruangan <span class="text-rose-500">*</span>
						</label>
						<input
							id="popover_fac_location"
							type="text"
							bind:value={location}
							required
							placeholder="Misal: Kantor Lt. 2 - Ruang Finance / Pool Cilegon"
							class="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-blue-500/30 text-on-surface transition-all placeholder:text-on-surface-variant/40"
						/>
					</div>

					<!-- Deskripsi Kerusakan -->
					<div>
						<label for="popover_fac_desc" class="block font-bold text-on-surface mb-1">
							Deskripsi Kerusakan <span class="text-rose-500">*</span>
						</label>
						<textarea
							id="popover_fac_desc"
							bind:value={description}
							required
							rows="3"
							placeholder="Jelaskan kondisi kerusakan (misal: AC bocor air menetes, lampu neon padam, atau handel pintu macet)..."
							class="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-blue-500/30 text-on-surface transition-all placeholder:text-on-surface-variant/40 resize-none"
						></textarea>
					</div>

					<!-- Foto Kondisi Kerusakan (Before) - Opsional -->
					<div>
						<span class="block font-bold text-on-surface mb-1">
							Foto Kerusakan <span class="text-on-surface-variant font-normal text-[10px]">(Opsional - Before)</span>
						</span>
						{#if photoPreview}
							<div class="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-surface-container-low max-h-36 flex items-center justify-center group">
								<img src={photoPreview} alt="Pratinjau Foto" class="w-full h-32 object-cover" />
								<button
									type="button"
									onclick={removePhoto}
									class="absolute top-2 right-2 p-1 rounded-full bg-slate-900/70 text-white hover:bg-rose-600 transition-colors cursor-pointer"
									title="Hapus Foto"
								>
									<span class="material-symbols-outlined text-sm">close</span>
								</button>
							</div>
						{:else}
							<label
								class="flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-surface-container-low border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-on-surface-variant hover:text-blue-600 text-xs font-semibold cursor-pointer transition-all"
							>
								<span class="material-symbols-outlined text-base">add_a_photo</span>
								<span>Lampirkan Foto Kerusakan (JPG, PNG)</span>
								<input
									type="file"
									accept="image/*"
									onchange={handlePhotoSelect}
									class="hidden"
								/>
							</label>
						{/if}
					</div>

					<!-- Form Footer Actions -->
					<div class="pt-2 flex items-center justify-end gap-2 border-t border-slate-200/50 dark:border-slate-800/50">
						<button
							type="button"
							onclick={() => (activeView = 'LIST')}
							disabled={isSubmitting}
							class="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
						>
							{#if isSubmitting}
								<span class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
								<span>Mengirim...</span>
							{:else}
								<span class="material-symbols-outlined text-[15px]">send</span>
								<span>Kirim Laporan</span>
							{/if}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}

<!-- Lightbox Modal untuk Pratinjau Foto Penuh -->
{#if lightboxPhoto}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
		role="dialog"
	>
		<button
			type="button"
			class="absolute inset-0 w-full h-full cursor-default bg-transparent border-0 outline-none"
			aria-label="Tutup Pratinjau"
			onclick={() => (lightboxPhoto = null)}
		></button>

		<div class="relative max-w-2xl max-h-[85vh] bg-surface-container-lowest rounded-3xl overflow-hidden shadow-2xl z-10 border border-slate-200 dark:border-slate-800 flex flex-col">
			<div class="p-3.5 bg-surface-container-low flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50">
				<span class="text-xs font-bold text-on-surface truncate">{lightboxPhoto.title}</span>
				<button
					type="button"
					onclick={() => (lightboxPhoto = null)}
					class="p-1 rounded-xl text-on-surface-variant hover:bg-surface-container cursor-pointer"
					title="Tutup"
				>
					<span class="material-symbols-outlined text-base">close</span>
				</button>
			</div>
			<div class="p-3 flex items-center justify-center bg-black/40 overflow-auto">
				<img src={lightboxPhoto.url} alt={lightboxPhoto.title} class="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg" />
			</div>
		</div>
	</div>
{/if}
