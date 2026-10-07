<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: any } = $props();

	let schedules = $derived(data.schedules);
	let units = $derived(data.units || []);
	let metrics = $derived(data.metrics);

	let isModalOpen = $state(false);
	let selectedUnit = $state('');
	let serviceType = $state('PM1 - Servis Ringan (5.000 KM)');
	let targetKm = $state<number | null>(null);
	let targetDate = $state('');
	let notes = $state('');
	let isSubmitting = $state(false);

	function handleUnitChange() {
		const found = units.find(u => u.noUnit === selectedUnit);
		if (found && found.odometer) {
			// Auto suggest next target KM (+ 5000 KM)
			targetKm = found.odometer + 5000;
		}
	}
</script>

<svelte:head>
	<title>Jadwal Servis Berkala (PM) | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<nav class="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mb-1">
				<a href="/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<span class="text-on-surface font-bold">Jadwal Servis Berkala (PM)</span>
			</nav>
			<h1 class="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2.5">
				<span class="material-symbols-outlined text-primary text-3xl">event_repeat</span>
				Jadwal Servis Berkala (Preventive Maintenance)
			</h1>
		</div>

		<button 
			onclick={() => isModalOpen = true}
			class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-sm hover:opacity-95 transition-all"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Tambah Jadwal Servis</span>
		</button>
	</header>

	{#if form?.message}
		<div class="p-4 rounded-xl {form.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'} text-xs font-bold flex items-center gap-2">
			<span class="material-symbols-outlined text-[18px]">{form.success ? 'check_circle' : 'error'}</span>
			{form.message}
		</div>
	{/if}

	<!-- Metric Quick Summary Cards -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<div class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Jadwal PM</div>
			<div class="text-2xl font-black text-on-surface mt-1">{metrics.total}</div>
		</div>
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<div class="text-xs font-bold text-rose-600 uppercase tracking-wider">Overdue (Lewat Jadwal)</div>
			<div class="text-2xl font-black text-rose-600 mt-1">{metrics.overdue}</div>
		</div>
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<div class="text-xs font-bold text-amber-600 uppercase tracking-wider">Due (Segera Servis)</div>
			<div class="text-2xl font-black text-amber-600 mt-1">{metrics.due}</div>
		</div>
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<div class="text-xs font-bold text-emerald-600 uppercase tracking-wider">Terkendali / Aktif</div>
			<div class="text-2xl font-black text-emerald-600 mt-1">{metrics.active}</div>
		</div>
	</div>

	<!-- Add PM Schedule Modal -->
	{#if isModalOpen}
		<div class="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
			<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-xl">
				<div class="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800/70 pb-3">
					<h3 class="text-base font-black text-on-surface">Tambah Jadwal Servis Rutin Armada</h3>
					<button onclick={() => isModalOpen = false} class="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant">
						<span class="material-symbols-outlined text-[18px]">close</span>
					</button>
				</div>

				<form method="POST" action="?/create" use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						isModalOpen = false;
						await update();
					};
				}} class="space-y-4 text-xs">
					<div>
						<label for="schedule_unit_id" class="block font-bold text-on-surface-variant uppercase mb-1">Nomor Unit Armada *</label>
						<select id="schedule_unit_id" name="unit_id" bind:value={selectedUnit} onchange={handleUnitChange} required class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-mono text-on-surface">
							<option value="">-- Pilih Unit Armada --</option>
							{#each units as u}
								<option value={u.noUnit}>{u.noUnit} ({u.type || 'Truck'}) - KM: {u.odometer?.toLocaleString('id-ID')}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="schedule_service_type" class="block font-bold text-on-surface-variant uppercase mb-1">Paket / Jenis Servis *</label>
						<select id="schedule_service_type" name="service_type" bind:value={serviceType} class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm text-on-surface">
							<option value="PM1 - Servis Ringan (5.000 KM)">PM1 - Servis Ringan (5.000 KM / Ganti Oli & Filter)</option>
							<option value="PM2 - Servis Sedang (10.000 KM)">PM2 - Servis Sedang (10.000 KM / Tune Up & Cek Rem)</option>
							<option value="PM3 - Servis Besar (20.000 KM)">PM3 - Servis Besar (20.000 KM / Kuras Gardan & Transmisi)</option>
							<option value="Servis Khusus Ban & Kaki-kaki">Servis Khusus Ban & Kaki-kaki (Spooring/Balancing)</option>
							<option value="Kalibrasi & Uji KIR Rutin">Kalibrasi & Uji KIR Rutin</option>
						</select>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="schedule_target_km" class="block font-bold text-on-surface-variant uppercase mb-1">Target Odometer (KM)</label>
							<input id="schedule_target_km" type="number" name="target_km" bind:value={targetKm} placeholder="130000" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-mono text-on-surface" />
						</div>
						<div>
							<label for="schedule_target_date" class="block font-bold text-on-surface-variant uppercase mb-1">Target Jatuh Tempo</label>
							<input id="schedule_target_date" type="date" name="target_date" bind:value={targetDate} class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm text-on-surface" />
						</div>
					</div>

					<div>
						<label for="schedule_notes" class="block font-bold text-on-surface-variant uppercase mb-1">Catatan Khusus</label>
						<input id="schedule_notes" type="text" name="notes" bind:value={notes} placeholder="Catatan part khusus atau instruksi..." class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm text-on-surface" />
					</div>

					<div class="flex justify-end gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800/70">
						<button type="button" onclick={() => isModalOpen = false} class="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-bold">
							Batal
						</button>
						<button type="submit" disabled={isSubmitting || !selectedUnit} class="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold disabled:opacity-50">
							Simpan Jadwal
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Schedules Table -->
	<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden">
		{#if schedules.length === 0}
			<div class="p-16 text-center text-on-surface-variant">
				<span class="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-2">event_available</span>
				<p class="text-base font-bold">Belum ada jadwal servis berkala</p>
				<p class="text-xs text-on-surface-variant/70 mt-1">Klik tombol 'Tambah Jadwal Servis' untuk mendaftarkan target perawatan unit armada.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-surface-container-low text-on-surface-variant text-[11px] font-black uppercase tracking-wider border-b border-slate-200/70 dark:border-slate-800/70">
						<tr>
							<th class="py-3 px-4">Unit Armada</th>
							<th class="py-3 px-4">Paket Servis</th>
							<th class="py-3 px-4">Target KM vs Saat Ini</th>
							<th class="py-3 px-4">Jatuh Tempo</th>
							<th class="py-3 px-4">Status</th>
							<th class="py-3 px-4 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each schedules as s}
							<tr class="hover:bg-surface-container-low/50 transition-colors">
								<td class="py-3.5 px-4">
									<div class="font-mono font-bold text-sm text-on-surface">{s.unitId}</div>
									<div class="text-[11px] text-on-surface-variant">{s.unitType}</div>
								</td>
								<td class="py-3.5 px-4">
									<div class="font-semibold text-xs text-on-surface">{s.serviceType}</div>
									{#if s.notes}
										<div class="text-[10px] text-on-surface-variant mt-0.5">{s.notes}</div>
									{/if}
								</td>
								<td class="py-3.5 px-4">
									<div class="text-xs font-mono">
										<b>{s.currentKm?.toLocaleString('id-ID')}</b> / {s.targetKm?.toLocaleString('id-ID') || '-'} KM
									</div>
									{#if s.targetKm}
										<div class="w-32 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
											<div 
												class="h-full rounded-full transition-all {s.status === 'OVERDUE' ? 'bg-rose-500' : s.status === 'DUE' ? 'bg-amber-500' : 'bg-emerald-500'}"
												style="width: {Math.min(100, Math.round((s.currentKm / s.targetKm) * 100))}%"
											></div>
										</div>
									{/if}
								</td>
								<td class="py-3.5 px-4 font-mono text-xs">
									{s.targetDate}
								</td>
								<td class="py-3.5 px-4">
									<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border {s.status === 'OVERDUE' ? 'bg-rose-50 text-rose-700 border-rose-200' : s.status === 'DUE' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}">
										{s.status}
									</span>
								</td>
								<td class="py-3.5 px-4 text-right">
									<div class="inline-flex items-center gap-2">
										<a 
											href="/maintenance/transactions/work-orders/create?unit={encodeURIComponent(s.unitId)}&category={encodeURIComponent(s.serviceType)}"
											class="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1"
										>
											<span class="material-symbols-outlined text-[15px]">engineering</span>
											<span>Buat SPK</span>
										</a>
										<form method="POST" action="?/delete" use:enhance>
											<input type="hidden" name="id" value={s.id} />
											<button type="submit" class="p-1.5 rounded-lg hover:bg-rose-50 text-on-surface-variant hover:text-rose-600 transition-colors" title="Hapus Jadwal">
												<span class="material-symbols-outlined text-[16px]">delete</span>
											</button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
