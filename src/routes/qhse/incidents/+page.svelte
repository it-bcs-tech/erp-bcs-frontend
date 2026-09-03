<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let summary = $derived(data.summary);
	let incidents = $derived(data.incidents || []);
	let units = $derived(data.units || []);
	let drivers = $derived(data.drivers || []);

	let showCreateModal = $state(false);
	let showCarModal = $state(false);
	let selectedIncident = $state<any>(null);

	function openCarModal(inc: any) {
		selectedIncident = inc;
		showCarModal = true;
	}
</script>

<svelte:head>
	<title>Insiden & CAR (Lagging) | QHSE ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-rose-600 dark:text-rose-400 text-2xl">emergency</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Insiden & CAR (Lagging Indicator)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pencatatan kecelakaan, analisis akar masalah (Root Cause), dan pelaporan tindakan korektif (CAR)
			</p>
		</div>

		<button
			onclick={() => showCreateModal = true}
			class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-lg">add_alert</span>
			<span>Lapor Insiden Baru</span>
		</button>
	</div>

	{#if form?.error}
		<div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5">
			<span class="material-symbols-outlined text-rose-500 text-lg">error</span>
			<span>{form.error}</span>
		</div>
	{/if}
	{#if form?.message}
		<div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
			<span class="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- Metric Cards (Bento Style) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Kasus Tercatat</p>
					<h3 class="text-2xl font-black text-on-surface mt-1">{summary.total}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-slate-500/10 text-slate-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">report</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2 font-medium">Rekapitulasi seluruh kejadian K3</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Kecelakaan (Accident)</p>
					<h3 class="text-2xl font-black text-rose-600 mt-1">{summary.accidents}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">car_crash</span>
				</div>
			</div>
			<p class="text-xs text-rose-600 mt-2 font-bold">Kecelakaan armada di jalan/lokasi</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pelanggaran Prosedur</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{summary.violations}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">warning</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 mt-2 font-bold">Pelanggaran SOP & Ketidaksesuaian APD</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Open CAR (Tindak Lanjut)</p>
					<h3 class="text-2xl font-black text-orange-600 mt-1">{summary.openCar}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">assignment_late</span>
				</div>
			</div>
			<p class="text-xs text-orange-600 mt-2 font-bold">Menunggu penyelesaian perbaikan</p>
		</div>
	</div>

	<!-- Main Filter & Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden">
		<!-- Table Filter Toolbar -->
		<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
			<div class="flex items-center gap-2 w-full sm:w-auto">
				<a
					href="?status=All"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('status') === 'All' || !$page.url.searchParams.get('status') ? 'bg-rose-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Semua ({summary.total})
				</a>
				<a
					href="?status=OPEN"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('status') === 'OPEN' ? 'bg-rose-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Perlu Investigasi ({summary.total - summary.closed - summary.openCar})
				</a>
				<a
					href="?status=CAR_ISSUED"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('status') === 'CAR_ISSUED' ? 'bg-orange-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					CAR Aktif ({summary.openCar})
				</a>
				<a
					href="?status=CLOSED"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('status') === 'CLOSED' ? 'bg-emerald-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Closed ({summary.closed})
				</a>
			</div>
		</div>

		<!-- Table View -->
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[850px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">No. Insiden & Tanggal</th>
						<th class="py-3.5 px-5">Tipe & Keparahan</th>
						<th class="py-3.5 px-5">Unit / Driver</th>
						<th class="py-3.5 px-5">Lokasi & Uraian Kejadian</th>
						<th class="py-3.5 px-5">Status CAR & Tindak Lanjut</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if incidents.length === 0}
						<tr>
							<td colspan="6" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 block mb-2">verified</span>
								<p class="font-bold text-sm">Tidak ada insiden pada kategori filter ini.</p>
							</td>
						</tr>
					{:else}
						{#each incidents as inc}
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-4 px-5">
									<p class="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">{inc.incident_number}</p>
									<p class="text-[10px] text-on-surface-variant mt-0.5">{new Date(inc.incident_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
								</td>
								<td class="py-4 px-5">
									<p class="text-xs font-bold text-on-surface">{inc.incident_type}</p>
									<span class="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold {inc.severity === 'High' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : inc.severity === 'Medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}">
										Severity: {inc.severity}
									</span>
								</td>
								<td class="py-4 px-5">
									<p class="text-xs font-bold text-on-surface">{inc.unit_number || 'Tanpa Unit'}</p>
									<p class="text-[11px] text-on-surface-variant mt-0.5">{inc.driver_name || '-'}</p>
								</td>
								<td class="py-4 px-5 max-w-xs">
									<p class="text-xs font-semibold text-on-surface truncate">{inc.description}</p>
									<p class="text-[10px] text-on-surface-variant mt-0.5 flex items-center gap-1">
										<span class="material-symbols-outlined text-xs">location_on</span>
										<span class="truncate">{inc.location}</span>
									</p>
								</td>
								<td class="py-4 px-5">
									{#if inc.car_number}
										<div class="space-y-0.5">
											<span class="text-xs font-mono font-bold text-orange-600">{inc.car_number}</span>
											<p class="text-[10px] text-on-surface-variant">PIC: {inc.pic_followup || '-'}</p>
											{#if inc.status === 'CLOSED'}
												<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
													<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Closed
												</span>
											{:else}
												<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
													<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> In Progress
												</span>
											{/if}
										</div>
									{:else}
										<span class="text-xs text-rose-600 font-medium italic">Belum Ada CAR</span>
									{/if}
								</td>
								<td class="py-4 px-5 text-right">
									<div class="flex items-center justify-end gap-2">
										<button
											onclick={() => openCarModal(inc)}
											class="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
										>
											<span class="material-symbols-outlined text-sm">psychology</span>
											<span>{inc.car_number ? 'Edit CAR' : 'Analisis Akar & CAR'}</span>
										</button>

										{#if inc.status !== 'CLOSED' && inc.car_number}
											<form action="?/closeIncident" method="POST" use:enhance>
												<input type="hidden" name="id" value={inc.id} />
												<button
													type="submit"
													class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
													title="Tutup Kasus (Resolved & Closed)"
												>
													Close
												</button>
											</form>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Modal: Lapor Insiden Baru -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<h3 class="text-base font-bold text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-rose-600 text-xl">report_problem</span>
					<span>Lapor Insiden K3 / Pelanggaran Baru</span>
				</h3>
				<button onclick={() => showCreateModal = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form action="?/createIncident" method="POST" use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') showCreateModal = false;
				};
			}} class="p-6 space-y-4">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="inc_type">
							Jenis Kejadian
						</label>
						<select id="inc_type" name="incident_type" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">
							<option value="Accident">Accident (Kecelakaan Jalan)</option>
							<option value="Pelanggaran Prosedur">Pelanggaran Prosedur / APD</option>
							<option value="Kerusakan Properti/Muatan">Kerusakan Properti / Muatan</option>
							<option value="Kecelakaan Kerja">Kecelakaan Kerja Bengkel/Pool</option>
						</select>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="inc_sev">
							Tingkat Keparahan
						</label>
						<select id="inc_sev" name="severity" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">
							<option value="Low">Low (Ringan / Tanpa Kerugian)</option>
							<option value="Medium">Medium (Kerusakan Ringan/Sedang)</option>
							<option value="High">High (Kerusakan Parah / Rawat Inap)</option>
							<option value="Critical / Fatal">Critical / Fatal</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="inc_unit">
							Unit Terlibat (Opsional)
						</label>
						<select id="inc_unit" name="unit_id" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">
							<option value="">-- Tanpa Unit --</option>
							{#each units as u}
								<option value={u.id}>{u.nomor_unit}</option>
							{/each}
						</select>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="inc_driver">
							Driver Terlibat (Opsional)
						</label>
						<select id="inc_driver" name="driver_id" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">
							<option value="">-- Tanpa Driver --</option>
							{#each drivers as d}
								<option value={d.id}>{d.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="inc_loc">
						Lokasi Kejadian
					</label>
					<input id="inc_loc" type="text" name="location" placeholder="Cth: Tol Cipularang KM 90 / Pool Cilegon" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="inc_desc">
						Uraian Kronologis Kejadian
					</label>
					<textarea id="inc_desc" name="description" rows="3" placeholder="Jelaskan secara ringkas urutan peristiwa insiden..." required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium"></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => showCreateModal = false} class="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container">
						Batal
					</button>
					<button type="submit" class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs">
						Kirim Laporan Insiden
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Analisis Akar Masalah (Root Cause) & CAR -->
{#if showCarModal && selectedIncident}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<div>
					<h3 class="text-base font-bold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-orange-600 text-xl">psychology</span>
						<span>Analisis Akar Masalah (Root Cause) & CAR</span>
					</h3>
					<p class="text-xs text-on-surface-variant font-mono mt-0.5">{selectedIncident.incident_number} — {selectedIncident.incident_type}</p>
				</div>
				<button onclick={() => showCarModal = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form action="?/updateCar" method="POST" use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') showCarModal = false;
				};
			}} class="p-6 space-y-4">
				<input type="hidden" name="id" value={selectedIncident.id} />

				<!-- Uraian Kasus Singkat -->
				<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
					<p class="font-bold text-on-surface">Kronologi:</p>
					<p class="text-on-surface-variant mt-0.5">{selectedIncident.description}</p>
				</div>

				<!-- Root Cause Analysis -->
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="car_rc">
						Analisis Akar Masalah (5-Why / Faktor Manusia-Alat-Metode)
					</label>
					<textarea id="car_rc" name="root_cause_analysis" rows="2" placeholder="Contoh: Mengapa? Pengemudi lelah karena kurang tidur. Mengapa? Tidak istirahat di rest area." required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">{selectedIncident.root_cause_analysis || ''}</textarea>
				</div>

				<!-- Corrective Action (Tindakan Korektif Langsung) -->
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="car_ca">
						Tindakan Korektif (Corrective Action)
					</label>
					<textarea id="car_ca" name="corrective_action" rows="2" placeholder="Tindakan langsung perbaikan kerusakan / sanksi disiplin..." required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">{selectedIncident.corrective_action || ''}</textarea>
				</div>

				<!-- Preventive Action (Tindakan Pencegahan Masa Depan) -->
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="car_pa">
						Tindakan Pencegahan (Preventive Action)
					</label>
					<textarea id="car_pa" name="preventive_action" rows="2" placeholder="Pelatihan defensive driving berkala, checklist P2H lebih ketat..." class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">{selectedIncident.preventive_action || ''}</textarea>
				</div>

				<!-- PIC & Due Date -->
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="car_pic">
							PIC Penanggung Jawab
						</label>
						<input id="car_pic" type="text" name="pic_followup" value={selectedIncident.pic_followup || ''} placeholder="Nama HSE Officer / Kepala Pool" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="car_due">
							Target Penyelesaian (Due Date)
						</label>
						<input id="car_due" type="date" name="due_date" value={selectedIncident.due_date ? new Date(selectedIncident.due_date).toISOString().split('T')[0] : ''} class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => showCarModal = false} class="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container">
						Batal
					</button>
					<button type="submit" class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs">
						Terbitkan / Simpan CAR
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
