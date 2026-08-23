<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData, form: ActionData } = $props();
	let pendingTrips = $derived(data.pendingTrips || []);
	let verifiedDNs = $derived(data.verifiedDNs || []);

	let isSubmitting = $state(false);
	let selectedTrip: any = $state(null);

	let inputNoSuratJalan = $state('');
	let inputTglSuratJalan = $state(new Date().toISOString().split('T')[0]);
	let inputBerat = $state(0);

	const selectTrip = (trip: any) => {
		selectedTrip = trip;
		inputBerat = trip.actual_weight || 0;
		inputNoSuratJalan = '';
		inputTglSuratJalan = new Date().toISOString().split('T')[0];
	};

	$effect(() => {
		if (form?.success || form?.error) {
			isSubmitting = false;
			if (form.success) {
				selectedTrip = null; // reset form
			} else if (form.error) {
				alert(form.error);
			}
		}
	});
</script>

<svelte:head>
	<title>Verifikasi Surat Jalan | Kasir</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">description</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Verifikasi Surat Jalan (DN)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pencatatan nomor Surat Jalan fisik, validasi tanggal muat/bongkar, dan penyesuaian timbangan pabrik
			</p>
		</div>
	</header>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left: Form Input -->
		<div class="lg:col-span-1">
			<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs p-6 sticky top-6">
				<h2 class="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600 text-lg">edit_document</span>
					<span>Input Surat Jalan Fisik</span>
				</h2>

				{#if selectedTrip}
					<div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 mb-4">
						<div class="flex justify-between items-start mb-1">
							<span class="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Trip Terpilih</span>
							<button class="text-amber-600 hover:text-amber-800" onclick={() => selectedTrip = null}>
								<span class="material-symbols-outlined text-base">close</span>
							</button>
						</div>
						<p class="font-bold text-xs text-on-surface font-mono">{selectedTrip.no_surat_tugas}</p>
						<p class="text-xs text-on-surface-variant mt-0.5">{selectedTrip.customer}</p>
						<div class="flex justify-between mt-2 pt-2 border-t border-amber-500/20 text-xs text-on-surface font-medium">
							<span>{selectedTrip.origin} → {selectedTrip.destination}</span>
							<span class="font-bold">{selectedTrip.unit}</span>
						</div>
					</div>

					<form method="POST" action="?/submitDN" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); } }} class="space-y-3.5">
						<input type="hidden" name="tripId" value={selectedTrip.trip_id}>
						
						<div>
							<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">No. Surat Jalan Fisik</label>
							<input type="text" name="noSuratJalan" bind:value={inputNoSuratJalan} class="w-full bg-surface border border-slate-200 dark:border-slate-800 text-on-surface text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Contoh: SJ-001/ABC/2026" required>
						</div>
						
						<div>
							<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tanggal Surat Jalan</label>
							<input type="date" name="tglSuratJalan" bind:value={inputTglSuratJalan} class="w-full bg-surface border border-slate-200 dark:border-slate-800 text-on-surface text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500" required>
						</div>

						<div>
							<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 flex justify-between">
								<span>Total Berat (Kg)</span>
								<span class="text-amber-600 lowercase font-medium">Timbangan Pabrik</span>
							</label>
							<div class="relative">
								<input type="number" step="0.01" name="totalBerat" bind:value={inputBerat} class="w-full bg-surface border border-slate-200 dark:border-slate-800 text-on-surface text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500" required>
								<span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs font-bold">Kg</span>
							</div>
							<p class="text-[10px] text-on-surface-variant mt-1">Berat awal dari OCS: {selectedTrip.actual_weight || 0} Kg</p>
						</div>

						<div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
							<button type="submit" disabled={isSubmitting} class="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-xs cursor-pointer">
								{#if isSubmitting}
									<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Menyimpan...
								{:else}
									<span class="material-symbols-outlined text-base">save</span> Simpan Verifikasi DN
								{/if}
							</button>
						</div>
					</form>
				{:else}
					<div class="text-center py-10 bg-surface rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4">
						<span class="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-1 block">touch_app</span>
						<p class="text-xs font-medium text-on-surface-variant">Pilih Trip dari daftar sebelah kanan untuk verifikasi Surat Jalan.</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Right: Lists -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Pending Trips List -->
			<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden flex flex-col max-h-[400px]">
				<div class="px-5 py-3.5 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
					<h3 class="text-xs font-bold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-500 text-base">pending_actions</span>
						<span>Menunggu Verifikasi</span>
						<span class="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] py-0.5 px-2 rounded-full font-bold">{pendingTrips.length}</span>
					</h3>
				</div>
				<div class="overflow-y-auto flex-1">
					<table class="w-full text-left border-collapse">
						<thead class="sticky top-0 bg-surface-container-lowest shadow-sm z-10">
							<tr class="border-b border-surface-container bg-surface-container-low/50">
								<th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">DO / Pelanggan</th>
								<th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Unit / Supir</th>
								<th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Berat OCS</th>
								<th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-surface-container">
							{#if pendingTrips.length === 0}
								<tr><td colspan="4" class="py-8 text-center text-sm font-medium text-on-surface-variant">Tidak ada trip yang menunggu verifikasi.</td></tr>
							{/if}
							{#each pendingTrips as trip}
								<tr class="hover:bg-surface-container-low/30 transition-colors {selectedTrip?.trip_id === trip.trip_id ? 'bg-indigo-50/50' : ''}">
									<td class="py-3 px-4">
										<p class="text-xs font-bold text-on-surface">{trip.no_surat_tugas}</p>
										<p class="text-[10px] text-on-surface-variant truncate w-[150px]">{trip.customer}</p>
									</td>
									<td class="py-3 px-4">
										<p class="text-xs font-bold text-on-surface">{trip.unit}</p>
										<p class="text-[10px] text-on-surface-variant">{trip.driver}</p>
									</td>
									<td class="py-3 px-4 text-right">
										<p class="text-xs font-bold text-on-surface">{trip.actual_weight || 0} Kg</p>
									</td>
									<td class="py-3 px-4 text-right">
										<button class="px-3 py-1.5 bg-white border border-surface-container shadow-sm hover:border-indigo-300 hover:text-indigo-600 text-on-surface-variant text-xs font-bold rounded-lg transition-colors" onclick={() => selectTrip(trip)}>
											Pilih
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Verified DNs List -->
			<div class="bg-surface-container-lowest rounded-[24px] shadow-sm border border-surface-container overflow-hidden flex flex-col max-h-[400px]">
				<div class="p-6 border-b border-surface-container bg-surface-container-low/20 flex justify-between items-center">
					<h3 class="text-base font-black text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-500">task_alt</span> Riwayat Terverifikasi
					</h3>
				</div>
				<div class="overflow-y-auto flex-1">
					<table class="w-full text-left border-collapse">
						<thead class="sticky top-0 bg-surface-container-lowest shadow-sm z-10">
							<tr class="border-b border-surface-container bg-surface-container-low/50">
								<th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">No. Surat Jalan</th>
								<th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">DO / Unit</th>
								<th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Berat Final</th>
								<th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-center">Status</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-surface-container">
							{#if verifiedDNs.length === 0}
								<tr><td colspan="4" class="py-8 text-center text-sm font-medium text-on-surface-variant">Belum ada Surat Jalan yang diverifikasi.</td></tr>
							{/if}
							{#each verifiedDNs as dn}
								<tr class="hover:bg-surface-container-low/30 transition-colors">
									<td class="py-3 px-4">
										<p class="text-xs font-bold text-on-surface">{dn.no_surat_jalan}</p>
										<p class="text-[10px] text-on-surface-variant">{new Date(dn.tgl_surat_jalan).toLocaleDateString('id-ID')}</p>
									</td>
									<td class="py-3 px-4">
										<p class="text-xs font-bold text-on-surface">{dn.no_surat_tugas}</p>
										<p class="text-[10px] text-on-surface-variant">{dn.unit} - {dn.customer}</p>
									</td>
									<td class="py-3 px-4 text-right">
										<p class="text-xs font-black text-emerald-600">{dn.total_berat} Kg</p>
									</td>
									<td class="py-3 px-4 text-center">
										<span class="inline-flex px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-[9px] font-bold text-emerald-700 uppercase">
											{dn.status}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>
