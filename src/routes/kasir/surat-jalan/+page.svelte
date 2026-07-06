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

<div class="flex flex-col h-full gap-6">
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<a href="/kasir" class="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 mb-2">
				<span class="material-symbols-outlined text-[14px]">arrow_back</span> Kembali ke Dashboard
			</a>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Verifikasi Surat Jalan (DN)</h1>
			<p class="text-on-surface-variant font-medium text-sm">Input data Surat Jalan fisik dari driver yang telah menyelesaikan Trip.</p>
		</div>
	</header>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left: Form Input -->
		<div class="lg:col-span-1">
			<div class="bg-surface-container-lowest rounded-[24px] shadow-sm border border-surface-container p-6 sticky top-6">
				<h2 class="text-lg font-black text-on-surface mb-6 flex items-center gap-2">
					<span class="material-symbols-outlined text-indigo-600">edit_document</span> Input Surat Jalan
				</h2>

				{#if selectedTrip}
					<div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
						<div class="flex justify-between items-start mb-2">
							<span class="text-xs font-black text-indigo-800 uppercase tracking-wider">Trip Terpilih</span>
							<button class="text-indigo-600 hover:text-indigo-800" onclick={() => selectedTrip = null}>
								<span class="material-symbols-outlined text-[16px]">close</span>
							</button>
						</div>
						<p class="font-bold text-sm text-indigo-950 mb-1">{selectedTrip.no_surat_tugas}</p>
						<p class="text-xs text-indigo-700">{selectedTrip.customer}</p>
						<div class="flex justify-between mt-2 pt-2 border-t border-indigo-200/50 text-xs text-indigo-800">
							<span>{selectedTrip.origin} &rarr; {selectedTrip.destination}</span>
							<span class="font-bold">{selectedTrip.unit}</span>
						</div>
					</div>

					<form method="POST" action="?/submitDN" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); } }} class="space-y-4">
						<input type="hidden" name="tripId" value={selectedTrip.trip_id}>
						
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">No. Surat Jalan Fisik</label>
							<input type="text" name="noSuratJalan" bind:value={inputNoSuratJalan} class="w-full bg-surface-container-low border border-surface-container text-on-surface text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Contoh: SJ-001/ABC/2026" required>
						</div>
						
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tanggal Surat Jalan</label>
							<input type="date" name="tglSuratJalan" bind:value={inputTglSuratJalan} class="w-full bg-surface-container-low border border-surface-container text-on-surface text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
						</div>

						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex justify-between">
								<span>Total Berat (Tonnage)</span>
								<span class="text-indigo-600 lowercase normal-case">Timbangan Pabrik</span>
							</label>
							<div class="relative">
								<input type="number" step="0.01" name="totalBerat" bind:value={inputBerat} class="w-full bg-surface-container-low border border-surface-container text-on-surface text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
								<span class="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-bold">Kg</span>
							</div>
							<p class="text-[10px] text-on-surface-variant mt-1.5">Berat awal dari OCS (Estimasi): {selectedTrip.actual_weight || 0} Kg</p>
						</div>

						<div class="pt-4 mt-4 border-t border-surface-container">
							<button type="submit" disabled={isSubmitting} class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
								{#if isSubmitting}
									<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Menyimpan...
								{:else}
									<span class="material-symbols-outlined text-[18px]">save</span> Simpan Verifikasi DN
								{/if}
							</button>
						</div>
					</form>
				{:else}
					<div class="text-center py-10 bg-surface-container-low/30 border border-dashed border-surface-container rounded-xl">
						<span class="material-symbols-outlined text-4xl text-on-surface-variant/50 mb-2">touch_app</span>
						<p class="text-sm font-medium text-on-surface-variant">Pilih Trip dari daftar di sebelah kanan untuk mulai memverifikasi Surat Jalan.</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Right: Lists -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Pending Trips List -->
			<div class="bg-surface-container-lowest rounded-[24px] shadow-sm border border-surface-container overflow-hidden flex flex-col max-h-[400px]">
				<div class="p-6 border-b border-surface-container bg-surface-container-low/20 flex justify-between items-center">
					<h3 class="text-base font-black text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-500">pending_actions</span> Menunggu Verifikasi
						<span class="bg-amber-100 text-amber-700 text-xs py-0.5 px-2 rounded-full">{pendingTrips.length}</span>
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
