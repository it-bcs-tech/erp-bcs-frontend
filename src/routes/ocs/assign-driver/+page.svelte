<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import SearchableSelect from '$lib/components/SearchableSelect.svelte';
	import DriverSimAiScannerModal from '$lib/components/DriverSimAiScannerModal.svelte';
	import { invalidateAll } from '$app/navigation';
	
	let { data, form }: { data: PageData, form: any } = $props();
	
	let assignments = $derived(data.assignments || []);
	let units = $derived(data.units || []);
	let drivers = $derived(data.drivers || []);

	// Modal State
	let showModal = $state(false);
	let isSubmitting = $state(false);
	let tableSearch = $state('');

	// AI SIM Scanner Modal State
	let showSimModal = $state(false);
	let selectedDriverForSim = $state<any>(null);

	let filteredAssignments = $derived(
		tableSearch.trim() === '' 
			? assignments 
			: assignments.filter((a: any) => 
				(a.nomor_unit && a.nomor_unit.toLowerCase().includes(tableSearch.toLowerCase())) ||
				(a.driver_name && a.driver_name.toLowerCase().includes(tableSearch.toLowerCase())) ||
				(a.posisi && a.posisi.toLowerCase().includes(tableSearch.toLowerCase())) ||
				(a.sim_type && a.sim_type.toLowerCase().includes(tableSearch.toLowerCase()))
			)
	);

	// Pagination State
	let currentPage = $state(1);
	let itemsPerPage = $state(10);
	let totalPages = $derived(Math.max(1, Math.ceil(filteredAssignments.length / itemsPerPage)));
	let paginatedAssignments = $derived(
		filteredAssignments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	$effect(() => {
		if (tableSearch !== undefined) {
			currentPage = 1;
		}
	});

	// Form State
	let selectedUnitId = $state('');
	let selectedDriverId = $state('');
	let selectedPosisi = $state('SUPIR_UTAMA');
	let isException = $state(false);

	let selectedDriverObj = $derived(
		drivers.find((d: any) => String(d.id) === String(selectedDriverId)) || null
	);

	let isSelectedDriverExpired = $derived(
		selectedDriverObj?.sim_gate_status === 'EXPIRED'
	);

	let unitOpts = $derived(units.map((u: any) => ({
		value: String(u.id),
		label: `${u.nomor_unit} (${u.type || '-'})`,
		sublabel: `${u.total_assigned_drivers || 0} sopir terdaftar`,
		searchTerms: `${u.nomor_unit} ${u.type || ''}`
	})));

	let driverOpts = $derived(drivers.map((d: any) => {
		let statusText = '✅ Valid';
		if (d.sim_gate_status === 'EXPIRED') statusText = '❌ SIM EXPIRED';
		else if (d.sim_gate_status === 'WARNING_30') statusText = `⚠️ H-${d.sim_days_remaining}`;
		else if (d.sim_gate_status === 'NO_DATE') statusText = '⚠️ Belum Ada Tanggal';

		return {
			value: String(d.id),
			label: d.name,
			sublabel: `${d.sim_type || 'SIM'} (${statusText}) • ${d.working_days_this_month || 0} hari kerja`,
			searchTerms: `${d.name} ${d.sim_type || ''}`
		};
	}));

	function handleUnitSelect(uId: string) {
		selectedUnitId = String(uId || '');
		const u = units.find((x: any) => String(x.id) === String(uId));
		if (u) {
			if (u.total_assigned_drivers >= 2) {
				selectedPosisi = 'HELPER';
			} else {
				selectedPosisi = u.has_supir_utama ? 'SUPIR_CADANGAN' : 'SUPIR_UTAMA';
			}
		}
	}

	function openModal() {
		selectedUnitId = '';
		selectedDriverId = '';
		selectedPosisi = 'SUPIR_UTAMA';
		isException = false;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	function triggerSimScan(driver?: any) {
		if (driver) {
			selectedDriverForSim = {
				id: driver.id || driver.driver_id,
				name: driver.name || driver.driver_name,
				karyawan_id: driver.karyawan_id,
				sim_type: driver.sim_type,
				sim_expiry_date: driver.sim_expiry_date
			};
		} else {
			selectedDriverForSim = null;
		}
		showSimModal = true;
	}

	function handleSimScanSuccess(result: any) {
		invalidateAll();
	}

	$effect(() => {
		if (form?.success) {
			closeModal();
			isSubmitting = false;
		}
		if (form?.error) {
			isSubmitting = false;
		}
	});

	function formatDate(dateString: string) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Driver Assignment & SIM Gate | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">person_pin</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Driver Assignment</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Kelola penugasan sopir ke unit armada di pool dengan validasi gate SIM otomatis
			</p>
		</div>
		<div class="flex flex-col md:flex-row gap-2.5">
			<div class="relative w-full md:w-64">
				<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
				<input 
					type="text" 
					bind:value={tableSearch} 
					placeholder="Cari unit atau sopir..." 
					class="w-full bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-medium shadow-xs"
				/>
			</div>

			<!-- Tombol Quick Action Scan SIM AI -->
			<button 
				type="button"
				onclick={() => triggerSimScan()} 
				class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 hover:opacity-95 transition-all whitespace-nowrap cursor-pointer">
				<span class="material-symbols-outlined text-base">auto_awesome</span>
				<span>Scan SIM AI</span>
			</button>

			<button 
				type="button"
				onclick={openModal} 
				class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer">
				<span class="material-symbols-outlined text-base">person_add</span>
				<span>Tugaskan Driver</span>
			</button>
		</div>
	</header>

	{#if form?.error}
		<div class="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl text-xs font-medium shadow-xs flex items-start gap-3">
			<span class="material-symbols-outlined text-xl text-rose-600 mt-0.5">error</span>
			<div class="flex-1 space-y-2">
				<p class="font-bold">{form.error}</p>
				{#if form.isSimExpired}
					<button 
						type="button"
						onclick={() => triggerSimScan({ id: form.driverId, name: form.driverName, sim_type: form.simType })}
						class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs">
						<span class="material-symbols-outlined text-sm">auto_awesome</span>
						<span>Buka Kamera & Scan SIM Baru ({form.driverName})</span>
					</button>
				{/if}
			</div>
		</div>
	{/if}
	
	{#if form?.success}
		<div class="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-medium shadow-xs flex items-center gap-2">
			<span class="material-symbols-outlined text-lg text-emerald-600">check_circle</span>
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- Active Assignments List -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[950px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Unit Kendaraan</th>
						<th class="py-3.5 px-5">Tipe Unit</th>
						<th class="py-3.5 px-5">Nama Sopir</th>
						<th class="py-3.5 px-5">Status SIM</th>
						<th class="py-3.5 px-5">Posisi</th>
						<th class="py-3.5 px-5">Tanggal Mulai</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if paginatedAssignments.length === 0}
						<tr>
							<td colspan="7" class="py-16 text-center text-on-surface-variant text-sm font-medium">
								<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 block mb-2">person_off</span>
								<p class="font-bold text-on-surface">Tidak ada data penugasan yang sesuai</p>
							</td>
						</tr>
					{/if}
					{#each paginatedAssignments as item}
						<tr class="hover:bg-surface-container transition-colors group">
							<td class="py-4 px-5">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
										<span class="material-symbols-outlined text-lg">local_shipping</span>
									</div>
									<span class="text-sm font-bold text-on-surface">{item.nomor_unit}</span>
								</div>
							</td>
							<td class="py-4 px-5">
								<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-high px-2.5 py-1 rounded-md">{item.unit_type}</span>
							</td>
							<td class="py-4 px-5">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0">
										<span class="material-symbols-outlined text-base">person</span>
									</div>
									<div class="flex flex-col">
										<span class="text-sm font-bold text-on-surface">{item.driver_name}</span>
										{#if item.assignment_status === 'DISABLED'}
											<span class="text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded w-fit mt-0.5 uppercase tracking-wider">Nonaktif Sementara</span>
										{/if}
									</div>
								</div>
							</td>
							<!-- Kolom Status SIM dengan Gate Indicator -->
							<td class="py-4 px-5">
								<div class="flex items-center gap-1.5 flex-wrap">
									<span class="text-xs font-mono font-bold text-on-surface">{item.sim_type || 'SIM'}</span>
									{#if item.sim_gate_status === 'EXPIRED'}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
											<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Expired
										</span>
									{:else if item.sim_gate_status === 'WARNING_30'}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
											<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> H-{item.sim_days_remaining}
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Valid
										</span>
									{/if}
								</div>
								{#if item.sim_expiry_date}
									<p class="text-[10px] text-slate-400 font-mono mt-0.5">Exp: {formatDate(item.sim_expiry_date)}</p>
								{/if}
							</td>
							<td class="py-4 px-5">
								<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider {item.posisi === 'SUPIR_UTAMA' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}">
									{item.posisi.replace('_', ' ')}
								</span>
							</td>
							<td class="py-4 px-5">
								<span class="text-xs font-medium text-on-surface-variant">{formatDate(item.tgl_mulai)}</span>
							</td>
							<td class="py-4 px-5 text-right">
								<div class="flex items-center justify-end gap-1">
									<!-- Tombol Scan SIM AI untuk pengemudi ini -->
									<button 
										type="button" 
										onclick={() => triggerSimScan(item)} 
										class="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" 
										title="Scan & Perbarui SIM Pengemudi Ini (AI)">
										<span class="material-symbols-outlined text-lg">auto_awesome</span>
									</button>

									{#if item.assignment_status === 'ACTIVE'}
										<form method="POST" action="?/disableDriver" use:enhance={() => { return async ({ update }) => { await update(); }; }}>
											<input type="hidden" name="assignmentId" value={item.assignment_id}>
											<button type="submit" class="p-2 rounded-lg text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors" title="Nonaktifkan Sementara (Disable)">
												<span class="material-symbols-outlined text-lg">person_off</span>
											</button>
										</form>
									{:else if item.assignment_status === 'DISABLED'}
										<form method="POST" action="?/enableDriver" use:enhance={() => { return async ({ update }) => { await update(); }; }}>
											<input type="hidden" name="assignmentId" value={item.assignment_id}>
											<button type="submit" class="p-2 rounded-lg text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors" title="Aktifkan Kembali (Enable)">
												<span class="material-symbols-outlined text-lg">how_to_reg</span>
											</button>
										</form>
									{/if}

									<form method="POST" action="?/unassignDriver" use:enhance={() => { return async ({ update }) => { await update(); }; }}>
										<input type="hidden" name="assignmentId" value={item.assignment_id}>
										<button type="submit" class="p-2 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors" title="Pemberhentian Permanen (End Assignment)">
											<span class="material-symbols-outlined text-lg">person_remove</span>
										</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		
		<!-- Pagination Footer -->
		<div class="px-5 py-3.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
			<p class="text-xs text-on-surface-variant font-medium">Total <span class="font-bold text-on-surface">{filteredAssignments.length}</span> data penugasan</p>
			<div class="flex gap-1">
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors cursor-pointer" disabled={currentPage <= 1} onclick={() => currentPage = Math.max(1, currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				{#each Array(totalPages) as _, i}
					<button class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition-colors cursor-pointer {currentPage === i + 1 ? 'bg-blue-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}" onclick={() => currentPage = i + 1}>
						{i + 1}
					</button>
				{/each}
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors cursor-pointer" disabled={currentPage >= totalPages} onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Modal Assign Driver -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onclick={closeModal}></div>
		<div class="relative w-full max-w-lg bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-slate-200 dark:border-slate-800">
			<div class="p-6 border-b border-surface-container">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-xl font-bold text-on-surface">Assign New Driver</h3>
						<p class="text-xs text-on-surface-variant mt-1">Pasangkan sopir ke unit kendaraan yang tersedia</p>
					</div>
					<button onclick={closeModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>
			
			<form method="POST" action="?/assignDriver" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); }; }}>
				<div class="p-6 overflow-y-auto space-y-5">
					
					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Pilih Unit Kendaraan</label>
						<SearchableSelect
							options={unitOpts}
							bind:value={selectedUnitId}
							placeholder="-- Cari Nopol atau Tipe Unit --"
							onchange={(val) => handleUnitSelect(String(val || ''))}
						/>
						<input type="hidden" name="unitId" value={selectedUnitId} required />
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Pilih Sopir</label>
						<SearchableSelect
							options={driverOpts}
							bind:value={selectedDriverId}
							placeholder="-- Cari Nama Sopir --"
						/>
						<input type="hidden" name="driverId" value={selectedDriverId} required />
					</div>

					<!-- Gate Check Status Display jika sopir terpilih -->
					{#if selectedDriverObj}
						<div class="p-3.5 rounded-2xl {isSelectedDriverExpired ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50' : selectedDriverObj.sim_gate_status === 'WARNING_30' ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50' : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50'} space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold {isSelectedDriverExpired ? 'text-rose-700 dark:text-rose-400' : selectedDriverObj.sim_gate_status === 'WARNING_30' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'} flex items-center gap-1.5">
									<span class="material-symbols-outlined text-base">{isSelectedDriverExpired ? 'block' : selectedDriverObj.sim_gate_status === 'WARNING_30' ? 'warning' : 'verified'}</span>
									<span>Pemeriksaan Masa Berlaku SIM (Gate Check)</span>
								</span>
								<span class="text-[10px] font-mono font-bold {isSelectedDriverExpired ? 'text-rose-600' : 'text-on-surface-variant'}">
									Exp: {formatDate(selectedDriverObj.sim_expiry_date)}
								</span>
							</div>

							{#if isSelectedDriverExpired}
								<p class="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
									❌ <strong>DITOLAK:</strong> {selectedDriverObj.sim_type || 'SIM'} telah kedaluwarsa. Sistem memblokir penugasan untuk mencegah pelanggaran hukum dan keselamatan jalan.
								</p>
								<button 
									type="button" 
									onclick={() => triggerSimScan(selectedDriverObj)}
									class="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs cursor-pointer">
									<span class="material-symbols-outlined text-sm">auto_awesome</span>
									<span>Pindai SIM Baru via AI (Buka Blokir)</span>
								</button>
							{:else if selectedDriverObj.sim_gate_status === 'WARNING_30'}
								<p class="text-[11px] text-amber-700 dark:text-amber-300">
									⚠️ <strong>Peringatan:</strong> SIM akan kedaluwarsa dalam {selectedDriverObj.sim_days_remaining} hari. Penugasan tetap diizinkan, harap ingatkan sopir untuk perpanjangan.
								</p>
							{:else}
								<p class="text-[11px] text-emerald-700 dark:text-emerald-300">
									✅ SIM {selectedDriverObj.sim_type || ''} valid dan memenuhi syarat operasional.
								</p>
							{/if}
						</div>
					{/if}

					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Posisi Sopir</label>
						{#if (units.find(u => u.id === selectedUnitId)?.total_assigned_drivers || 0) >= 2}
							<input type="hidden" name="posisi" value="HELPER" />
							<select disabled class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface opacity-50 cursor-not-allowed appearance-none">
								<option value="HELPER">Helper (Sopir Bantuan Sementara)</option>
							</select>
							<p class="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 font-medium leading-relaxed">
								Unit ini sudah memiliki {units.find(u => u.id === selectedUnitId)?.total_assigned_drivers} sopir terdaftar. Penugasan baru otomatis diarahkan sebagai Helper.
							</p>
						{:else}
							<select name="posisi" bind:value={selectedPosisi} required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-sky-500/50 appearance-none cursor-pointer">
								<option value="SUPIR_UTAMA">Supir Utama</option>
								<option value="SUPIR_CADANGAN">Supir Cadangan</option>
								<option value="KENEK">Kenek</option>
								<option value="HELPER">Helper</option>
							</select>
						{/if}
					</div>

					<div>
						<label class="flex items-center gap-3 cursor-pointer bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-3.5 rounded-xl hover:bg-amber-100/50 transition-colors">
							<input type="checkbox" name="isException" value="true" bind:checked={isException} class="w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500/50">
							<div class="flex flex-col">
								<span class="text-xs font-extrabold text-amber-800 dark:text-amber-500">Izinkan Pengecualian (Force Assign)</span>
								<span class="text-[10px] text-amber-700/90 dark:text-amber-400/80 mt-0.5 leading-relaxed">Abaikan aturan batas 14 hari kerja dan batas 2 sopir per unit jika ini adalah keadaan darurat atau sopir pengganti.</span>
							</div>
						</label>
					</div>

					<div class="bg-sky-50/50 dark:bg-sky-900/10 p-3 rounded-xl border border-sky-100 dark:border-sky-900/30 flex items-start gap-2">
						<span class="material-symbols-outlined text-[16px] text-sky-600 mt-0.5">info</span>
						<p class="text-[10px] text-sky-700 dark:text-sky-400">
							Jika sopir ini sedang ditugaskan di unit lain, maka status penugasannya di unit sebelumnya akan otomatis dihentikan (Non-aktif).
						</p>
					</div>
					
				</div>
				
				<div class="p-6 border-t border-surface-container bg-surface-container-low/50 flex justify-end gap-3">
					<button type="button" onclick={closeModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer">
						Batal
					</button>
					<button 
						type="submit" 
						disabled={isSubmitting || !selectedUnitId || !selectedDriverId || isSelectedDriverExpired} 
						class="px-5 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-sky-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer">
						<span class="material-symbols-outlined text-[18px]">check_circle</span>
						Assign Driver
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Reusable AI SIM Scanner Modal -->
<DriverSimAiScannerModal
	isOpen={showSimModal}
	selectedDriver={selectedDriverForSim}
	driversList={drivers}
	onClose={() => showSimModal = false}
	onSuccess={handleSimScanSuccess}
/>
