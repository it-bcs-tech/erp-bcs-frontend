<script lang="ts">
	import { clickOutside } from '$lib/utils/clickOutside';
	import { addToast } from '$lib/stores/notifications';

	let { isOpen = $bindable(false), onClose, user, initialView = 'LIST', initialType = 'CARPOOL' } = $props<{
		isOpen: boolean;
		onClose?: () => void;
		user?: any;
		initialView?: 'LIST' | 'FORM';
		initialType?: 'CARPOOL' | 'SPD';
	}>();

	// View mode: 'LIST' (daftar pengajuan terkini) | 'FORM' (form ajukan baru)
	let activeView = $state<'LIST' | 'FORM'>('LIST');

	// Sub-type form: 'CARPOOL' | 'SPD'
	let formType = $state<'CARPOOL' | 'SPD'>('CARPOOL');

	$effect(() => {
		if (isOpen) {
			if (initialView) activeView = initialView;
			if (initialType) formType = initialType;
		}
	});

	// Filter tab di tampilan LIST: 'ALL' | 'CARPOOL' | 'SPD'
	let listFilterType = $state<'ALL' | 'CARPOOL' | 'SPD'>('ALL');

	// Data requests & Switcher Scope (my vs all)
	let carpools = $state<any[]>([]);
	let spds = $state<any[]>([]);
	let cars = $state<any[]>([]);
	let facilityTypes = $state<any[]>([]);

	let activeScope = $state<'my' | 'all'>('my');
	let isGaOrAdmin = $state(false);
	let stats = $state<{
		myCarpoolCount: number;
		allCarpoolCount: number;
		mySpdCount: number;
		allSpdCount: number;
		totalMy: number;
		totalAll: number;
	}>({
		myCarpoolCount: 0,
		allCarpoolCount: 0,
		mySpdCount: 0,
		allSpdCount: 0,
		totalMy: 0,
		totalAll: 0
	});

	let isLoading = $state(false);
	let hasLoaded = $state(false);
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	// Form Carpool state
	const todayIso = new Date().toISOString().split('T')[0];
	let cpUseDate = $state(todayIso);
	let cpTimeStart = $state('08:00');
	let cpTimeEnd = $state('17:00');
	let cpCityType = $state('Dalam Kota');
	let cpCarId = $state('');
	let cpDestination = $state('');
	let cpPassengers = $state('');
	let cpDescription = $state('');

	// Form SPD state
	let spdStartDate = $state(todayIso);
	let spdEndDate = $state(todayIso);
	let spdDestination = $state('');
	let spdFacilityTypeId = $state('1');
	let spdReason = $state('DINAS LUAR');
	let spdParticipants = $state('');
	let spdDescription = $state('');

	// User derived info
	const userName = $derived(user?.name || 'Karyawan BCS');
	const userDepartment = $derived(user?.department || user?.division || 'Umum');
	const userNik = $derived(user?.payrollId || '-');

	// Fetch data saat popover dibuka
	$effect(() => {
		if (isOpen && !hasLoaded) {
			fetchTravelData('my');
		}
	});

	async function fetchTravelData(scope: 'my' | 'all' = activeScope) {
		isLoading = true;
		try {
			const res = await fetch(`/api/ga/travel?scope=${scope}`);
			if (res.ok) {
				const data = await res.json();
				if (data.success) {
					carpools = data.carpools || [];
					spds = data.spds || [];
					cars = data.cars || [];
					facilityTypes = data.facilityTypes || [];
					activeScope = data.scope || scope;
					isGaOrAdmin = !!data.isGaOrAdmin;
					if (data.stats) stats = data.stats;
					hasLoaded = true;
				}
			}
		} catch (err) {
			console.error('Error fetching travel data:', err);
		} finally {
			isLoading = false;
		}
	}

	function switchScope(newScope: 'my' | 'all') {
		if (activeScope === newScope && hasLoaded) return;
		activeScope = newScope;
		fetchTravelData(newScope);
	}

	function openForm(type: 'CARPOOL' | 'SPD' = 'CARPOOL') {
		formType = type;
		activeView = 'FORM';
		errorMessage = '';
		if (!cpPassengers) cpPassengers = userName;
		if (!spdParticipants) spdParticipants = userName;
	}

	function resetForms() {
		cpUseDate = todayIso;
		cpTimeStart = '08:00';
		cpTimeEnd = '17:00';
		cpCityType = 'Dalam Kota';
		cpCarId = '';
		cpDestination = '';
		cpPassengers = userName;
		cpDescription = '';

		spdStartDate = todayIso;
		spdEndDate = todayIso;
		spdDestination = '';
		spdFacilityTypeId = facilityTypes[0]?.id ? String(facilityTypes[0].id) : '1';
		spdReason = 'DINAS LUAR';
		spdParticipants = userName;
		spdDescription = '';
		errorMessage = '';
	}

	function handleClose() {
		if (isSubmitting) return;
		isOpen = false;
		if (onClose) onClose();
	}

	// Gabungan item untuk list
	const combinedItems = $derived.by(() => {
		const list: any[] = [];
		if (listFilterType === 'ALL' || listFilterType === 'CARPOOL') {
			list.push(...carpools);
		}
		if (listFilterType === 'ALL' || listFilterType === 'SPD') {
			list.push(...spds);
		}
		// Sort descending by date / id
		return list.sort((a, b) => {
			const dateA = a.use_date || a.start_date || '';
			const dateB = b.use_date || b.start_date || '';
			if (dateA !== dateB) return dateB.localeCompare(dateA);
			return (b.id || 0) - (a.id || 0);
		});
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		errorMessage = '';

		if (formType === 'CARPOOL') {
			if (!cpDestination.trim()) {
				errorMessage = 'Tempat tujuan peminjaman mobil wajib diisi!';
				return;
			}
		} else {
			if (!spdDestination.trim()) {
				errorMessage = 'Kota tujuan perjalanan dinas wajib diisi!';
				return;
			}
			if (!spdReason.trim()) {
				errorMessage = 'Alasan / keperluan dinas wajib diisi!';
				return;
			}
		}

		isSubmitting = true;
		try {
			let payload: any = {};
			if (formType === 'CARPOOL') {
				payload = {
					type: 'carpool',
					use_date: cpUseDate,
					time_start: cpTimeStart,
					time_end: cpTimeEnd,
					city_type: cpCityType,
					car_id: cpCarId || null,
					destination: cpDestination.trim(),
					passengers: cpPassengers.trim(),
					description: cpDescription.trim(),
					requester_name: userName,
					department: userDepartment,
					requester_nik: userNik !== '-' ? userNik : null
				};
			} else {
				payload = {
					type: 'spd',
					start_date: spdStartDate,
					end_date: spdEndDate,
					destination: spdDestination.trim(),
					facility_type_id: spdFacilityTypeId,
					reason: spdReason.trim(),
					participants: spdParticipants.trim(),
					description: spdDescription.trim(),
					requester_name: userName,
					department: userDepartment,
					requester_nik: userNik !== '-' ? userNik : null
				};
			}

			const res = await fetch('/api/ga/travel', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.message || 'Gagal mengirim pengajuan perjalanan dinas.');
			}

			addToast({
				type: 'success',
				message: data.message || `Pengajuan ${data.number} berhasil dibuat!`
			});

			resetForms();
			activeView = 'LIST';
			await fetchTravelData(activeScope);
		} catch (err: any) {
			console.error('Submit error:', err);
			errorMessage = err.message || 'Terjadi kesalahan sistem saat mengirim pengajuan.';
		} finally {
			isSubmitting = false;
		}
	}

	function getStatusBadge(status: string, rawStatus?: string) {
		if (status === 'APPROVED' || rawStatus === 'APPROVE GA') {
			return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
		}
		if (status === 'APPROVED_AP' || rawStatus === 'APPROVE AP') {
			return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800';
		}
		if (status === 'REJECTED') {
			return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800';
		}
		return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800';
	}

	function formatDate(d: string | null) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

{#if isOpen}
	<div
		class="absolute right-0 mt-2 w-96 sm:w-[440px] max-h-[88vh] bg-surface-container-lowest rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200"
		use:clickOutside={handleClose}
	>
		<!-- Popover Header -->
		<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low/70 sticky top-0 z-10 backdrop-blur-xs">
			<div class="flex items-center gap-2.5">
				<div class="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">commute</span>
				</div>
				<div>
					<h3 class="text-xs font-black text-on-surface leading-tight">Perjalanan Dinas & Carpool</h3>
					<p class="text-[10px] text-on-surface-variant">Layanan mobilitas & SPD karyawan</p>
				</div>
			</div>

			<div class="flex items-center gap-1.5">
				{#if activeView === 'LIST'}
					<button
						type="button"
						onclick={() => openForm('CARPOOL')}
						class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
						title="Buat Pengajuan Baru"
					>
						<span class="material-symbols-outlined text-[14px]">add</span>
						<span>Ajukan</span>
					</button>
				{:else}
					<button
						type="button"
						onclick={() => (activeView = 'LIST')}
						class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-on-surface text-[11px] font-bold transition-all hover:bg-surface-container cursor-pointer"
					>
						<span class="material-symbols-outlined text-[14px]">arrow_back</span>
						<span>Riwayat</span>
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
				<!-- VIEW 1: DAFTAR PENGAJUAN (DENGAN FILTER & SCOPE SWITCHER) -->
				<div class="space-y-2.5">
					<!-- Top Controls: Scope Switcher (jika GA/Admin) & Filter Type -->
					<div class="flex flex-col gap-2">
						{#if isGaOrAdmin}
							<div class="p-0.5 rounded-xl bg-surface-container-low flex items-center">
								<button
									type="button"
									onclick={() => switchScope('my')}
									class="flex-1 py-1 text-center rounded-lg text-[10px] font-bold transition-all cursor-pointer {activeScope === 'my' ? 'bg-surface text-cyan-600 shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
								>
									Pengajuan Saya ({stats.totalMy})
								</button>
								<button
									type="button"
									onclick={() => switchScope('all')}
									class="flex-1 py-1 text-center rounded-lg text-[10px] font-bold transition-all cursor-pointer {activeScope === 'all' ? 'bg-surface text-cyan-600 shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
								>
									Semua Pengajuan ({stats.totalAll})
								</button>
							</div>
						{/if}

						<!-- Filter Type: ALL, CARPOOL, SPD -->
						<div class="flex items-center gap-1.5 overflow-x-auto pb-0.5">
							<button
								type="button"
								onclick={() => (listFilterType = 'ALL')}
								class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0 {listFilterType === 'ALL' ? 'bg-cyan-600 text-white' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
							>
								Semua ({carpools.length + spds.length})
							</button>
							<button
								type="button"
								onclick={() => (listFilterType = 'CARPOOL')}
								class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0 {listFilterType === 'CARPOOL' ? 'bg-cyan-600 text-white' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
							>
								<span class="material-symbols-outlined text-[13px]">directions_car</span>
								<span>Mobil ({carpools.length})</span>
							</button>
							<button
								type="button"
								onclick={() => (listFilterType = 'SPD')}
								class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0 {listFilterType === 'SPD' ? 'bg-indigo-600 text-white' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
							>
								<span class="material-symbols-outlined text-[13px]">flight_takeoff</span>
								<span>SPD ({spds.length})</span>
							</button>
						</div>
					</div>

					<!-- Content List -->
					{#if isLoading && !hasLoaded}
						<div class="p-8 text-center flex flex-col items-center justify-center">
							<span class="material-symbols-outlined animate-spin text-cyan-600 text-2xl mb-1">progress_activity</span>
							<p class="text-xs text-on-surface-variant font-medium">Memuat riwayat pengajuan...</p>
						</div>
					{:else if combinedItems.length === 0}
						<div class="p-8 text-center flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-surface-container-low/40">
							<div class="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center mb-2.5">
								<span class="material-symbols-outlined text-2xl">commute</span>
							</div>
							<p class="text-xs font-bold text-on-surface">Belum ada pengajuan perjalanan</p>
							<p class="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed max-w-[280px]">
								{activeScope === 'my'
									? 'Anda belum memiliki permohonan Carpool atau SPD. Klik tombol di bawah untuk mengajukan mobil kantor atau surat dinas.'
									: 'Tidak ada permohonan perjalanan yang tercatat.'}
							</p>
							<div class="flex items-center gap-2 mt-3.5">
								<button
									type="button"
									onclick={() => openForm('CARPOOL')}
									class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
								>
									<span class="material-symbols-outlined text-[14px]">directions_car</span>
									<span>Pesan Mobil</span>
								</button>
								<button
									type="button"
									onclick={() => openForm('SPD')}
									class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
								>
									<span class="material-symbols-outlined text-[14px]">flight_takeoff</span>
									<span>Buat SPD</span>
								</button>
							</div>
						</div>
					{:else}
						<div class="space-y-2">
							{#each combinedItems as item (item.item_type + '_' + item.id)}
								<div class="p-3 rounded-2xl bg-surface border border-slate-200/70 dark:border-slate-800/70 text-xs shadow-2xs hover:border-cyan-400/50 transition-all space-y-2">
									<!-- Item Header: Type & Code & Status -->
									<div class="flex items-start justify-between gap-2">
										<div class="flex items-center gap-2">
											<div class="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 {item.item_type === 'CARPOOL' ? 'bg-cyan-500/15 text-cyan-600' : 'bg-indigo-500/15 text-indigo-600'}">
												<span class="material-symbols-outlined text-[16px]">
													{item.item_type === 'CARPOOL' ? 'directions_car' : 'flight_takeoff'}
												</span>
											</div>
											<div>
												<div class="flex items-center gap-1.5">
													<span class="font-mono font-bold text-on-surface text-xs">
														{item.carpool_number || item.spd_number}
													</span>
													<span class="text-[9px] font-bold px-1.5 py-0.2 rounded {item.item_type === 'CARPOOL' ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'}">
														{item.item_type === 'CARPOOL' ? 'CARPOOL' : 'SPD'}
													</span>
												</div>
												<div class="text-[10px] text-on-surface-variant font-medium">
													{item.requester_name} • {item.department}
												</div>
											</div>
										</div>

										<span class="px-2 py-0.5 rounded-md text-[9px] font-bold border shrink-0 {getStatusBadge(item.status, item.raw_status)}">
											{item.raw_status || item.status}
										</span>
									</div>

									<!-- Item Info Body -->
									<div class="p-2.5 rounded-xl bg-surface-container-low/60 space-y-1.5 text-[11px]">
										<div class="flex items-center justify-between text-on-surface">
											<div class="flex items-center gap-1.5 font-bold">
												<span class="material-symbols-outlined text-[14px] text-cyan-600">location_on</span>
												<span class="truncate max-w-[200px]">{item.destination}</span>
											</div>
											<span class="text-[10px] font-mono text-on-surface-variant">
												{item.item_type === 'CARPOOL' ? formatDate(item.use_date) : `${formatDate(item.start_date)} - ${formatDate(item.end_date)}`}
											</span>
										</div>

										{#if item.item_type === 'CARPOOL'}
											<div class="flex items-center justify-between text-[10px] text-on-surface-variant pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
												<span>
													{item.city_type} • {item.time_start || '08:00'} - {item.time_end || '17:00'}
												</span>
												<span class="font-semibold text-cyan-700 dark:text-cyan-400">
													{item.car_name ? `${item.car_name} (${item.police_number})` : 'Unit ditentukan GA'}
												</span>
											</div>
										{:else}
											<div class="flex items-center justify-between text-[10px] text-on-surface-variant pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
												<span class="font-medium text-indigo-700 dark:text-indigo-400">
													{item.reason || 'Dinas Luar'}
												</span>
												<span>{item.facility_desc || 'Fasilitas Perusahaan'}</span>
											</div>
										{/if}

										{#if item.description}
											<p class="text-[10px] text-on-surface-variant line-clamp-1 italic pt-0.5">
												"{item.description}"
											</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else}
				<!-- VIEW 2: FORM PENGAJUAN BARU -->
				<form onsubmit={handleSubmit} class="space-y-3.5 text-xs">
					<!-- Switcher Jenis Form: Carpool vs SPD -->
					<div class="p-1 rounded-2xl bg-surface-container-low flex items-center gap-1">
						<button
							type="button"
							onclick={() => (formType = 'CARPOOL')}
							class="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer {formType === 'CARPOOL' ? 'bg-cyan-600 text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-[16px]">directions_car</span>
							<span>Mobil Operasional (Carpool)</span>
						</button>
						<button
							type="button"
							onclick={() => (formType = 'SPD')}
							class="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer {formType === 'SPD' ? 'bg-indigo-600 text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-[16px]">flight_takeoff</span>
							<span>Perjalanan Dinas (SPD)</span>
						</button>
					</div>

					<!-- Badge Identitas Pemohon (Auto-filled & Read-only) -->
					<div class="p-3 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200/60 dark:border-cyan-800/60 flex items-center justify-between text-xs">
						<div class="flex items-center gap-2">
							<div class="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-600 flex items-center justify-center shrink-0">
								<span class="material-symbols-outlined text-[16px]">badge</span>
							</div>
							<div>
								<div class="font-bold text-on-surface text-[11px] leading-tight">
									{userName}
								</div>
								<div class="text-[10px] text-on-surface-variant">
									NIK: <span class="font-mono">{userNik}</span> • Departemen: <span class="font-semibold text-cyan-700 dark:text-cyan-300">{userDepartment}</span>
								</div>
							</div>
						</div>
						<span class="text-[9px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full">
							Pemohon Terkunci
						</span>
					</div>

					{#if errorMessage}
						<div class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
							<span class="material-symbols-outlined text-sm shrink-0">error</span>
							<span>{errorMessage}</span>
						</div>
					{/if}

					{#if formType === 'CARPOOL'}
						<!-- FORM FIELDS: CARPOOL -->
						<div class="space-y-3">
							<div class="grid grid-cols-3 gap-2">
								<div>
									<label for="cp_date" class="block text-[10px] font-bold text-on-surface mb-1">Tanggal Pakai *</label>
									<input
										id="cp_date"
										type="date"
										bind:value={cpUseDate}
										required
										class="w-full px-2.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-xs font-mono outline-none focus:ring-2 focus:ring-cyan-500/20"
									/>
								</div>
								<div>
									<label for="cp_t1" class="block text-[10px] font-bold text-on-surface mb-1">Mulai</label>
									<input
										id="cp_t1"
										type="time"
										bind:value={cpTimeStart}
										class="w-full px-2 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-xs font-mono outline-none focus:ring-2 focus:ring-cyan-500/20"
									/>
								</div>
								<div>
									<label for="cp_t2" class="block text-[10px] font-bold text-on-surface mb-1">Selesai</label>
									<input
										id="cp_t2"
										type="time"
										bind:value={cpTimeEnd}
										class="w-full px-2 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-xs font-mono outline-none focus:ring-2 focus:ring-cyan-500/20"
									/>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-2">
								<div>
									<label for="cp_city" class="block text-[10px] font-bold text-on-surface mb-1">Area Perjalanan</label>
									<select
										id="cp_city"
										bind:value={cpCityType}
										class="w-full px-2.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-cyan-500/20"
									>
										<option value="Dalam Kota">Dalam Kota</option>
										<option value="Luar Kota">Luar Kota</option>
									</select>
								</div>
								<div>
									<label for="cp_car" class="block text-[10px] font-bold text-on-surface mb-1">Pilihan Unit Mobil</label>
									<select
										id="cp_car"
										bind:value={cpCarId}
										class="w-full px-2.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-cyan-500/20 truncate"
									>
										<option value="">-- Ditentukan GA --</option>
										{#each cars as car (car.id)}
											<option value={String(car.id)}>{car.car_name} ({car.police_number})</option>
										{/each}
									</select>
								</div>
							</div>

							<div>
								<label for="cp_dest" class="block text-[10px] font-bold text-on-surface mb-1">Tempat Tujuan *</label>
								<input
									id="cp_dest"
									type="text"
									bind:value={cpDestination}
									required
									placeholder="Misal: Krakatau Steel / KPP Pratama Cilegon / Vendor Narogong"
									class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-cyan-500/20"
								/>
							</div>

							<div>
								<label for="cp_pass" class="block text-[10px] font-bold text-on-surface mb-1">Daftar Penumpang (pisahkan koma)</label>
								<input
									id="cp_pass"
									type="text"
									bind:value={cpPassengers}
									placeholder="Nama-nama penumpang mobil"
									class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-cyan-500/20"
								/>
							</div>

							<div>
								<label for="cp_desc" class="block text-[10px] font-bold text-on-surface mb-1">Keperluan / Keterangan Tambahan</label>
								<textarea
									id="cp_desc"
									bind:value={cpDescription}
									rows="2"
									placeholder="Uraikan agenda atau keperluan perjalanan..."
									class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-cyan-500/20"
								></textarea>
							</div>
						</div>
					{:else}
						<!-- FORM FIELDS: SPD -->
						<div class="space-y-3">
							<div class="grid grid-cols-2 gap-2">
								<div>
									<label for="spd_d1" class="block text-[10px] font-bold text-on-surface mb-1">Tanggal Berangkat *</label>
									<input
										id="spd_d1"
										type="date"
										bind:value={spdStartDate}
										required
										class="w-full px-2.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/20"
									/>
								</div>
								<div>
									<label for="spd_d2" class="block text-[10px] font-bold text-on-surface mb-1">Tanggal Kembali *</label>
									<input
										id="spd_d2"
										type="date"
										bind:value={spdEndDate}
										required
										class="w-full px-2.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/20"
									/>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-2">
								<div>
									<label for="spd_dest" class="block text-[10px] font-bold text-on-surface mb-1">Kota Tujuan *</label>
									<input
										id="spd_dest"
										type="text"
										bind:value={spdDestination}
										required
										placeholder="Misal: JAKARTA / BANDUNG / SURABAYA"
										class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase"
									/>
								</div>
								<div>
									<label for="spd_fac" class="block text-[10px] font-bold text-on-surface mb-1">Jenis Fasilitas</label>
									<select
										id="spd_fac"
										bind:value={spdFacilityTypeId}
										class="w-full px-2.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 truncate"
									>
										{#each facilityTypes as ft (ft.id)}
											<option value={String(ft.id)}>{ft.description}</option>
										{/each}
									</select>
								</div>
							</div>

							<div>
								<label for="spd_reason" class="block text-[10px] font-bold text-on-surface mb-1">Alasan / Judul Penugasan *</label>
								<input
									id="spd_reason"
									type="text"
									bind:value={spdReason}
									required
									placeholder="Misal: AUDIT TAHUNAN / MEETING KLIEN / SURVEY LOKASI"
									class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase"
								/>
							</div>

							<div>
								<label for="spd_part" class="block text-[10px] font-bold text-on-surface mb-1">Daftar Peserta SPD (pisahkan koma)</label>
								<input
									id="spd_part"
									type="text"
									bind:value={spdParticipants}
									placeholder="Nama-nama peserta dinas"
									class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
								/>
							</div>

							<div>
								<label for="spd_desc" class="block text-[10px] font-bold text-on-surface mb-1">Agenda / Rincian Penugasan</label>
								<textarea
									id="spd_desc"
									bind:value={spdDescription}
									rows="2"
									placeholder="Uraikan agenda kegiatan dinas secara detail..."
									class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
								></textarea>
							</div>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
						<button
							type="button"
							onclick={() => (activeView = 'LIST')}
							class="px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold transition-all cursor-pointer"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 {formType === 'CARPOOL' ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-indigo-600 hover:bg-indigo-700'}"
						>
							{#if isSubmitting}
								<span class="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
								<span>Mengirim...</span>
							{:else}
								<span class="material-symbols-outlined text-[16px]">send</span>
								<span>{formType === 'CARPOOL' ? 'Kirim Permohonan Carpool' : 'Kirim Pengajuan SPD'}</span>
							{/if}
						</button>
					</div>
				</form>
			{/if}
		</div>

		<!-- Popover Footer -->
		<div class="p-3 border-t border-slate-200/60 dark:border-slate-800/60 bg-surface-container-low/50 flex items-center justify-between text-[11px]">
			<span class="text-on-surface-variant font-medium">Perlu detail biaya tol/BBM?</span>
			<a
				href="/ga/travel"
				onclick={handleClose}
				class="text-cyan-700 dark:text-cyan-300 font-bold hover:underline inline-flex items-center gap-0.5"
			>
				<span>Buka Modul Carpool & SPD</span>
				<span class="material-symbols-outlined text-[13px]">arrow_forward</span>
			</a>
		</div>
	</div>
{/if}
