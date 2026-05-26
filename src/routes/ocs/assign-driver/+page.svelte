<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	
	let { data, form }: { data: PageData, form: ActionData } = $props();
	
	let assignments = $derived(data.assignments || []);
	let units = $derived(data.units || []);
	let drivers = $derived(data.drivers || []);

	// Modal State
	let showModal = $state(false);
	let isSubmitting = $state(false);
	let tableSearch = $state('');

	let filteredAssignments = $derived(
		tableSearch.trim() === '' 
			? assignments 
			: assignments.filter((a: any) => 
				(a.nomor_unit && a.nomor_unit.toLowerCase().includes(tableSearch.toLowerCase())) ||
				(a.driver_name && a.driver_name.toLowerCase().includes(tableSearch.toLowerCase())) ||
				(a.posisi && a.posisi.toLowerCase().includes(tableSearch.toLowerCase()))
			)
	);

	// Form State
	let selectedUnitId = $state('');
	let selectedDriverId = $state('');
	let selectedPosisi = $state('SUPIR_UTAMA');
	let isException = $state(false);

	// Unit Combobox
	let unitSearch = $state('');
	let showUnitDropdown = $state(false);
	let filteredUnits = $derived(units.filter((u: any) => 
		(u.nomor_unit && u.nomor_unit.toLowerCase().includes(unitSearch.toLowerCase())) || 
		(u.type && u.type.toLowerCase().includes(unitSearch.toLowerCase()))
	));

	// Driver Combobox
	let driverSearch = $state('');
	let showDriverDropdown = $state(false);
	let filteredDrivers = $derived(drivers.filter((d: any) => 
		(d.name && d.name.toLowerCase().includes(driverSearch.toLowerCase()))
	));

	function openModal() {
		selectedUnitId = '';
		selectedDriverId = '';
		selectedPosisi = 'SUPIR_UTAMA';
		isException = false;
		unitSearch = '';
		driverSearch = '';
		showModal = true;
	}

	function closeModal() {
		showModal = false;
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
	<title>Assign Driver | OCS</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header & Actions -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Driver Assignment</h1>
			<p class="text-on-surface-variant font-medium text-sm">Kelola pasangan Supir dan Unit Kendaraan secara real-time</p>
		</div>
		<div class="flex flex-col md:flex-row gap-3">
			<div class="relative w-full md:w-64">
				<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-lg">search</span>
				<input type="text" bind:value={tableSearch} placeholder="Cari unit atau sopir..." class="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-surface-container rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50">
			</div>
			<button onclick={openModal} class="bg-sky-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center justify-center gap-2 hover:bg-sky-700 transition-colors whitespace-nowrap">
				<span class="material-symbols-outlined text-lg">person_add</span>
				Assign New Driver
			</button>
		</div>
	</header>

	{#if form?.error}
		<div class="mb-6 p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-medium">
			{form.error}
		</div>
	{/if}
	
	{#if form?.success}
		<div class="mb-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium">
			{form.message}
		</div>
	{/if}

	<!-- Active Assignments List -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm border border-surface-container flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="border-b border-surface-container sticky top-0 bg-surface-container-lowest z-10">
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Unit Kendaraan</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Tipe Unit</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Nama Sopir</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Posisi</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Tanggal Mulai</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#if filteredAssignments.length === 0}
						<tr>
							<td colspan="6" class="py-12 text-center text-on-surface-variant text-sm font-medium">
								Tidak ada data penugasan yang sesuai.
							</td>
						</tr>
					{/if}
					{#each filteredAssignments as item}
						<tr class="hover:bg-surface-container-low/50 transition-colors group">
							<td class="py-4 px-6">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 text-sky-600 flex items-center justify-center">
										<span class="material-symbols-outlined text-[20px]">local_shipping</span>
									</div>
									<span class="text-sm font-black text-on-surface">{item.nomor_unit}</span>
								</div>
							</td>
							<td class="py-4 px-6">
								<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container px-2.5 py-1 rounded-md">{item.unit_type}</span>
							</td>
							<td class="py-4 px-6">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
										<span class="material-symbols-outlined text-[16px]">person</span>
									</div>
									<span class="text-sm font-bold text-on-surface">{item.driver_name}</span>
								</div>
							</td>
							<td class="py-4 px-6">
								<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider {item.posisi === 'SUPIR_UTAMA' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}">
									{item.posisi.replace('_', ' ')}
								</span>
							</td>
							<td class="py-4 px-6">
								<span class="text-sm font-medium text-on-surface-variant">{formatDate(item.tgl_mulai)}</span>
							</td>
							<td class="py-4 px-6 text-right">
								<form method="POST" action="?/unassignDriver" use:enhance={() => { return async ({ update }) => { await update(); }; }}>
									<input type="hidden" name="assignmentId" value={item.assignment_id}>
									<button type="submit" class="p-2 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors" title="End Assignment">
										<span class="material-symbols-outlined text-[20px]">person_remove</span>
									</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Modal Assign Driver -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeModal}></div>
		<div class="relative w-full max-w-lg bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-xl font-bold text-on-surface">Assign New Driver</h3>
						<p class="text-xs text-on-surface-variant mt-1">Pasangkan sopir ke unit kendaraan yang tersedia</p>
					</div>
					<button onclick={closeModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>
			
			<form method="POST" action="?/assignDriver" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); }; }}>
				<div class="p-6 overflow-y-auto space-y-5">
					
					<div class="relative">
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Pilih Unit Kendaraan</label>
						<input type="hidden" name="unitId" bind:value={selectedUnitId} required />
						<input type="text" bind:value={unitSearch} onfocus={() => showUnitDropdown = true} onblur={() => setTimeout(() => showUnitDropdown = false, 200)} placeholder="Cari Nopol atau Tipe Unit..." class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-sky-500/50" autocomplete="off" required />
						{#if showUnitDropdown && filteredUnits.length > 0}
							<ul class="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg max-h-48 overflow-y-auto hide-scrollbar">
								{#each filteredUnits as u}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
									<li class="px-4 py-3 text-sm text-on-surface cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors border-b border-surface-container last:border-0" onclick={() => { selectedUnitId = u.id; unitSearch = `${u.nomor_unit} (${u.type})`; showUnitDropdown = false; selectedPosisi = u.has_supir_utama ? 'SUPIR_CADANGAN' : 'SUPIR_UTAMA'; }}>
										<span class="font-bold">{u.nomor_unit}</span> 
										<span class="text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded ml-1 text-on-surface-variant">{u.type}</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<div class="relative">
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Pilih Sopir</label>
						<input type="hidden" name="driverId" bind:value={selectedDriverId} required />
						<input type="text" bind:value={driverSearch} onfocus={() => showDriverDropdown = true} onblur={() => setTimeout(() => showDriverDropdown = false, 200)} placeholder="Cari Nama Sopir..." class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-sky-500/50" autocomplete="off" required />
						{#if showDriverDropdown && filteredDrivers.length > 0}
							<ul class="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg max-h-48 overflow-y-auto hide-scrollbar">
								{#each filteredDrivers as d}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
									<li class="px-4 py-3 text-sm flex items-center justify-between cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors border-b border-surface-container last:border-0" onclick={() => { selectedDriverId = d.id; driverSearch = d.name; showDriverDropdown = false; }}>
										<span class="font-bold text-on-surface">{d.name}</span>
										<span class="text-[10px] px-2 py-0.5 rounded-full font-bold {d.working_days_this_month >= 14 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}" title="{d.working_days_this_month} hari kerja bulan ini">
											{d.working_days_this_month} Hari
										</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Posisi Sopir</label>
						<select name="posisi" bind:value={selectedPosisi} required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-sky-500/50 appearance-none cursor-pointer">
							<option value="SUPIR_UTAMA">Supir Utama</option>
							<option value="SUPIR_CADANGAN">Supir Cadangan</option>
							<option value="KENEK">Kenek</option>
							<option value="HELPER">Helper</option>
						</select>
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
					<button type="button" onclick={closeModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">
						Batal
					</button>
					<button type="submit" disabled={isSubmitting || !selectedUnitId || !selectedDriverId} class="px-5 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-sky-700 transition-colors flex items-center gap-2 disabled:opacity-50">
						<span class="material-symbols-outlined text-[18px]">check_circle</span>
						Assign Driver
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
