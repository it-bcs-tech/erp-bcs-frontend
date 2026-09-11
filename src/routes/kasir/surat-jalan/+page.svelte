<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData, form: ActionData } = $props();
	let pendingTrips = $derived(data.pendingTrips || []);
	let verifiedDNs = $derived(data.verifiedDNs || []);
	let ngepokBatches = $derived(data.ngepokBatches || []);

	let activeTab = $state<'REGULER' | 'NGEPOK'>('REGULER');

	let pendingNgepokCount = $derived.by(() => {
		let count = 0;
		for (const b of ngepokBatches) {
			for (const t of (b.trips || [])) {
				if (t.status === 'SCHEDULED') count++;
			}
		}
		return count;
	});

	let isSubmitting = $state(false);
	let selectedTrip: any = $state(null);
	let selectedDocForPreview: any = $state(null);

	let inputNoSuratJalan = $state('');
	let inputTglSuratJalan = $state(new Date().toISOString().split('T')[0]);
	let inputBerat = $state(0);
	let inputFileUrl = $state('');

	const selectTrip = (trip: any) => {
		selectedTrip = trip;
		inputBerat = trip.actual_weight || 0;
		inputNoSuratJalan = '';
		inputFileUrl = '';
		inputTglSuratJalan = new Date().toISOString().split('T')[0];
	};

	// State Modal Input Surat Jalan Ngepok
	let showNgepokModal = $state(false);
	let selectedNgepokTrip = $state<any>(null);
	let selectedNgepokBatch = $state<any>(null);
	let inputNgepokNoSj = $state('');
	let inputNgepokTgl = $state(new Date().toISOString().split('T')[0]);
	let inputNgepokBerat = $state<number | string>('');
	let inputNgepokFileUrl = $state('');

	function openNgepokModal(trip: any, batch: any) {
		selectedNgepokTrip = trip;
		selectedNgepokBatch = batch;
		inputNgepokNoSj = trip.no_surat_jalan_customer || trip.dn_no_surat_jalan || '';
		inputNgepokTgl = trip.dn_tgl_surat_jalan ? new Date(trip.dn_tgl_surat_jalan).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
		inputNgepokBerat = trip.actual_weight || trip.dn_total_berat || '';
		inputNgepokFileUrl = trip.dn_file_upload || '';
		showNgepokModal = true;
	}

	function closeNgepokModal() {
		showNgepokModal = false;
		selectedNgepokTrip = null;
		selectedNgepokBatch = null;
	}

	$effect(() => {
		if (form?.success || form?.error) {
			isSubmitting = false;
			if (form.success) {
				selectedTrip = null;
				closeNgepokModal();
			}
		}
	});

	const formatCurrency = (val: number) =>
		new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
</script>

<svelte:head>
	<title>Verifikasi Surat Jalan (DN) | Kasir ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">description</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Verifikasi Surat Jalan Balik (DN)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pencatatan nomor Surat Jalan fisik, validasi timbangan riil pembeli, dan upload bukti fisik lembar SJB berstempel
			</p>
		</div>
	</header>

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

	<!-- Mode Tab Switcher -->
	<div class="flex items-center gap-2 border-b border-surface-container pb-3 flex-shrink-0">
		<button 
			type="button" 
			onclick={() => activeTab = 'REGULER'} 
			class="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer {activeTab === 'REGULER' ? 'bg-amber-600 text-white shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-[18px]">local_shipping</span>
			<span>Trip Reguler</span>
			<span class="px-2 py-0.5 rounded-full text-[10px] font-black {activeTab === 'REGULER' ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'}">
				{pendingTrips.length}
			</span>
		</button>
		<button 
			type="button" 
			onclick={() => activeTab = 'NGEPOK'} 
			class="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer {activeTab === 'NGEPOK' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-[18px]">cached</span>
			<span>Shuttle / Ngepok Multi-Rit</span>
			{#if pendingNgepokCount > 0}
				<span class="px-2 py-0.5 rounded-full text-[10px] font-black {activeTab === 'NGEPOK' ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}">
					{pendingNgepokCount} Menunggu
				</span>
			{/if}
		</button>
	</div>

	{#if activeTab === 'REGULER'}
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
								<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1" for="noSuratJalan_input">
									No. Surat Jalan Fisik
								</label>
								<input
									id="noSuratJalan_input"
									type="text"
									name="noSuratJalan"
									bind:value={inputNoSuratJalan}
									class="w-full bg-surface border border-slate-200 dark:border-slate-800 text-on-surface text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
									placeholder="Contoh: SJ-001/ABC/2026"
									required
								/>
							</div>
							
							<div>
								<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1" for="tglSuratJalan_input">
									Tanggal Surat Jalan
								</label>
								<input
									id="tglSuratJalan_input"
									type="date"
									name="tglSuratJalan"
									bind:value={inputTglSuratJalan}
									class="w-full bg-surface border border-slate-200 dark:border-slate-800 text-on-surface text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
									required
								/>
							</div>

							<div>
								<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 flex justify-between" for="totalBerat_input">
									<span>Total Berat (Kg)</span>
									<span class="text-amber-600 lowercase font-medium">Timbangan Pabrik</span>
								</label>
								<div class="relative">
									<input
									id="totalBerat_input"
									type="number"
									step="0.01"
									name="totalBerat"
									bind:value={inputBerat}
									class="w-full bg-surface border border-slate-200 dark:border-slate-800 text-on-surface text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
									required
								/>
								<span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs font-bold">Kg</span>
							</div>
							<p class="text-[10px] text-on-surface-variant mt-1">Berat awal dari OCS: {selectedTrip.actual_weight || 0} Kg</p>
						</div>

						<div>
							<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1" for="fileUploadUrl_input">
								Bukti Scan / Foto Lembar Fisik SJB
							</label>
							<input
								id="fileUploadUrl_input"
								type="url"
								name="fileUploadUrl"
								bind:value={inputFileUrl}
								placeholder="https://..."
								class="w-full bg-surface border border-slate-200 dark:border-slate-800 text-on-surface text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
							/>
							<p class="text-[10px] text-on-surface-variant mt-1">Lampiran foto ini akan otomatis tampil pada Modul Finance saat proses Invoicing.</p>
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
			<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden flex flex-col max-h-[380px]">
				<div class="px-5 py-3.5 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
					<h3 class="text-xs font-bold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-500 text-base">pending_actions</span>
						<span>Trip Menunggu Verifikasi SJB</span>
						<span class="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] py-0.5 px-2 rounded-full font-bold">{pendingTrips.length}</span>
					</h3>
				</div>
				<div class="overflow-y-auto flex-1">
					<table class="w-full text-left border-collapse">
						<thead class="sticky top-0 bg-surface-container-lowest shadow-xs z-10">
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
								<tr class="hover:bg-surface-container-low/30 transition-colors {selectedTrip?.trip_id === trip.trip_id ? 'bg-amber-50/50 dark:bg-amber-950/30' : ''}">
									<td class="py-3 px-4">
										<p class="text-xs font-bold text-on-surface font-mono">{trip.no_surat_tugas}</p>
										<p class="text-[11px] text-on-surface-variant mt-0.5">{trip.customer}</p>
										<p class="text-[10px] text-on-surface-variant/70">{trip.origin} → {trip.destination}</p>
									</td>
									<td class="py-3 px-4">
										<p class="text-xs font-bold text-on-surface">{trip.unit}</p>
										<p class="text-[11px] text-on-surface-variant mt-0.5">{trip.driver}</p>
									</td>
									<td class="py-3 px-4 text-right">
										<span class="text-xs font-bold text-on-surface">{trip.actual_weight || 0}</span>
										<span class="text-[10px] text-on-surface-variant"> Kg</span>
									</td>
									<td class="py-3 px-4 text-right">
										<button
											onclick={() => selectTrip(trip)}
											class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
										>
											<span class="material-symbols-outlined text-xs">edit</span>
											<span>Verifikasi</span>
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Verified DNs Table -->
			<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden flex flex-col max-h-[380px]">
				<div class="px-5 py-3.5 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
					<h3 class="text-xs font-bold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-500 text-base">verified</span>
						<span>Riwayat Surat Jalan Terverifikasi (Siap Invoice)</span>
						<span class="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] py-0.5 px-2 rounded-full font-bold">{verifiedDNs.length}</span>
					</h3>
				</div>
				<div class="overflow-y-auto flex-1">
					<table class="w-full text-left border-collapse">
						<thead class="sticky top-0 bg-surface-container-lowest shadow-xs z-10">
							<tr class="border-b border-surface-container bg-surface-container-low/50">
								<th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">No. SJ & Tanggal</th>
								<th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Customer & Unit</th>
								<th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Tonase Riil</th>
								<th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Lampiran Scan</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-surface-container">
							{#if verifiedDNs.length === 0}
								<tr><td colspan="4" class="py-8 text-center text-sm font-medium text-on-surface-variant">Belum ada Surat Jalan yang diverifikasi.</td></tr>
							{/if}
							{#each verifiedDNs as dn}
								<tr class="hover:bg-surface-container-low/30 transition-colors">
									<td class="py-3 px-4">
										<p class="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">{dn.no_surat_jalan}</p>
										<p class="text-[10px] text-on-surface-variant mt-0.5">{dn.tgl_surat_jalan}</p>
										<p class="text-[10px] text-on-surface-variant/70 font-mono">Tugas: {dn.no_surat_tugas}</p>
									</td>
									<td class="py-3 px-4">
										<p class="text-xs font-bold text-on-surface">{dn.customer}</p>
										<p class="text-[10px] text-on-surface-variant mt-0.5">{dn.unit} • {dn.driver || '-'}</p>
									</td>
									<td class="py-3 px-4 text-right">
										<span class="text-xs font-bold text-on-surface">{dn.total_berat}</span>
										<span class="text-[10px] text-on-surface-variant"> Kg</span>
										{#if dn.total_amount > 0}
											<p class="text-[10px] font-bold text-emerald-600">{formatCurrency(dn.total_amount)}</p>
										{/if}
									</td>
									<td class="py-3 px-4 text-right">
										{#if dn.file_upload && dn.file_upload !== '-'}
											<button
												onclick={() => selectedDocForPreview = dn}
												class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition-colors"
												title="Lihat Foto Surat Jalan Balik"
											>
												<span class="material-symbols-outlined text-sm">image</span>
												<span>Scan SJB</span>
											</button>
										{:else}
											<span class="text-[10px] text-on-surface-variant/60 italic">Tidak ada file</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
	{:else}
		<!-- Tab Shuttle / Ngepok Multi-Rit -->
		<div class="space-y-6">
			<!-- Header Info -->
			<div class="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div class="flex items-center gap-3.5">
					<div class="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
						<span class="material-symbols-outlined text-2xl">cached</span>
					</div>
					<div>
						<h2 class="text-base font-bold text-on-surface">Pencatatan Surat Jalan Shuttle / Ngepok Multi-Rit</h2>
						<p class="text-xs text-on-surface-variant mt-0.5">
							Validasi fisik Surat Jalan customer dan tonase riil timbangan per ritase. Menyimpan Surat Jalan otomatis menyelesaikan ritase (COMPLETED).
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2 self-end md:self-auto">
					<div class="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs font-bold text-on-surface flex items-center gap-2">
						<span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
						<span>Total Batch: {ngepokBatches.length}</span>
					</div>
				</div>
			</div>

			{#if ngepokBatches.length === 0}
				<div class="text-center py-16 bg-surface-container-low rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
					<div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
						<span class="material-symbols-outlined text-3xl">cached</span>
					</div>
					<h3 class="text-sm font-bold text-on-surface">Belum Ada Penugasan Ngepok</h3>
					<p class="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
						Saat ini belum ada batch penugasan Ngepok yang diterbitkan oleh Dispatcher.
					</p>
				</div>
			{:else}
				<div class="space-y-6">
					{#each ngepokBatches as batch}
						{@const bTrips = batch.trips || []}
						{@const bCompleted = bTrips.filter((t: any) => t.status === 'COMPLETED').length}
						{@const bPending = bTrips.filter((t: any) => t.status === 'SCHEDULED').length}
						{@const bVoid = bTrips.filter((t: any) => t.status === 'VOID').length}

						<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden">
							<!-- Card Header -->
							<div class="p-5 border-b border-surface-container flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low/80">
								<div class="flex items-start gap-3.5">
									<div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
										<span class="material-symbols-outlined text-xl">local_shipping</span>
									</div>
									<div>
										<div class="flex items-center gap-2.5 flex-wrap">
											<span class="text-xs font-black px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 font-mono">
												{batch.groupId}
											</span>
											<h3 class="text-base font-black text-on-surface tracking-tight">
												{batch.unit || 'Unit Belum Ditentukan'}
											</h3>
											<span class="text-xs font-medium text-on-surface-variant">
												• Supir: <strong class="text-on-surface">{batch.driver || '-'}</strong>
											</span>
											<span class="text-xs font-medium text-on-surface-variant">
												• Customer: <strong class="text-on-surface">{batch.customer || '-'}</strong>
											</span>
										</div>
										<div class="flex items-center gap-4 text-xs text-on-surface-variant mt-1.5 flex-wrap">
											<span>Rute: <strong class="text-on-surface">{batch.origin || '-'}</strong> → <strong class="text-on-surface">{batch.destination || '-'}</strong></span>
											<span>Muatan: <strong class="text-on-surface">{batch.cargo || '-'}</strong></span>
											<span>Tgl: <strong class="text-on-surface">{batch.tglTrip ? new Date(batch.tglTrip).toLocaleDateString('id-ID') : '-'}</strong></span>
										</div>
									</div>
								</div>

								<!-- Progress stats -->
								<div class="flex items-center gap-2 self-end md:self-auto">
									<div class="flex items-center gap-2 bg-surface-container px-3.5 py-2 rounded-xl text-xs font-bold text-on-surface border border-surface-container">
										<span class="text-emerald-600 dark:text-emerald-400">{bCompleted} Selesai</span>
										{#if bPending > 0}
											<span class="text-amber-600 dark:text-amber-400">({bPending} Antre SJ)</span>
										{/if}
										{#if bVoid > 0}
											<span class="text-rose-600 dark:text-rose-400">({bVoid} Void)</span>
										{/if}
										<span class="text-on-surface-variant">/ {batch.totalPlan || bTrips.length} Plan</span>
									</div>
								</div>
							</div>

							<!-- Table of Ritase -->
							<div class="overflow-x-auto">
								<table class="w-full text-left text-xs">
									<thead class="bg-surface-container/40 text-on-surface-variant font-bold border-b border-surface-container uppercase text-[10px] tracking-wider">
										<tr>
											<th class="py-3 px-5">Rit Ke</th>
											<th class="py-3 px-4">No. Surat Tugas</th>
											<th class="py-3 px-4">Status UJO</th>
											<th class="py-3 px-4">Surat Jalan Customer</th>
											<th class="py-3 px-4 text-right">Tonase Riil</th>
											<th class="py-3 px-4">Status Rit</th>
											<th class="py-3 px-5 text-right">Aksi Kasir</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-surface-container">
										{#each bTrips as trip}
											<tr class="hover:bg-surface-container-low/40 transition-colors">
												<td class="py-3.5 px-5 font-bold text-on-surface">
													<span class="w-6 h-6 rounded-full bg-surface-container inline-flex items-center justify-center text-xs font-black">
														{trip.ritase_ke}
													</span>
												</td>
												<td class="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
													{trip.no_surat_tugas}
												</td>
												<td class="py-3.5 px-4">
													{#if trip.ujo_payment_status === 'PAID'}
														<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-md">
															<span class="material-symbols-outlined text-[12px]">check</span>
															<span>UJO PAID</span>
														</span>
													{:else}
														<span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded-md">
															<span class="material-symbols-outlined text-[12px]">pending</span>
															<span>UJO UNPAID</span>
														</span>
													{/if}
													{#if trip.estimated_ujo}
														<span class="text-[10px] text-on-surface-variant ml-1 font-mono">
															Rp {Number(trip.estimated_ujo).toLocaleString('id-ID')}
														</span>
													{/if}
												</td>
												<td class="py-3.5 px-4">
													{#if trip.no_surat_jalan_customer || trip.dn_no_surat_jalan}
														<div class="flex items-center gap-2">
															<span class="font-mono font-bold text-on-surface bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 px-2.5 py-1 rounded-lg inline-block">
																{trip.no_surat_jalan_customer || trip.dn_no_surat_jalan}
															</span>
															{#if trip.dn_file_upload}
																<button
																	type="button"
																	onclick={() => selectedDocForPreview = {
																		no_surat_jalan: trip.no_surat_jalan_customer || trip.dn_no_surat_jalan,
																		customer: trip.customer || batch.customer,
																		unit: batch.unit,
																		file_upload: trip.dn_file_upload,
																		tgl_surat_jalan: trip.dn_tgl_surat_jalan || trip.tgl_trip,
																		total_berat: trip.actual_weight || trip.dn_total_berat
																	}}
																	class="text-indigo-600 hover:text-indigo-800 cursor-pointer"
																	title="Lihat Foto Bukti SJ"
																>
																	<span class="material-symbols-outlined text-base">image</span>
																</button>
															{/if}
														</div>
													{:else if trip.status === 'SCHEDULED'}
														<span class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
															<span class="material-symbols-outlined text-[13px]">hourglass_empty</span>
															<span>Belum Ada SJ</span>
														</span>
													{:else}
														<span class="text-on-surface-variant/40">-</span>
													{/if}
												</td>
												<td class="py-3.5 px-4 text-right font-mono font-bold text-on-surface">
													{trip.actual_weight || trip.dn_total_berat ? `${trip.actual_weight || trip.dn_total_berat} Ton` : '-'}
												</td>
												<td class="py-3.5 px-4">
													{#if trip.status === 'COMPLETED'}
														<span class="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
															Completed
														</span>
													{:else if trip.status === 'VOID'}
														<span class="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300" title={trip.void_reason || ''}>
															Void
														</span>
													{:else}
														<span class="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
															Scheduled
														</span>
													{/if}
												</td>
												<td class="py-3.5 px-5 text-right">
													{#if trip.status === 'SCHEDULED'}
														<button 
															type="button" 
															onclick={() => openNgepokModal(trip, batch)}
															class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
															title="Input Surat Jalan Fisik dan Selesaikan Ritase"
														>
															<span class="material-symbols-outlined text-[15px]">edit_document</span>
															<span>Input SJ</span>
														</button>
													{:else if trip.status === 'COMPLETED'}
														<button 
															type="button" 
															onclick={() => openNgepokModal(trip, batch)}
															class="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
															title="Koreksi / Perbarui Surat Jalan"
														>
															<span class="material-symbols-outlined text-[14px]">edit</span>
															<span>Koreksi</span>
														</button>
													{:else}
														<span class="text-xs text-on-surface-variant/40 italic">Hangus</span>
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal Input Surat Jalan Ritase Ngepok -->
{#if showNgepokModal && selectedNgepokTrip && selectedNgepokBatch}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onclick={closeNgepokModal}></div>
		<div class="relative w-full max-w-lg bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden">
			<!-- Modal Header -->
			<div class="p-6 border-b border-surface-container bg-amber-50/50 dark:bg-amber-950/20">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center">
							<span class="material-symbols-outlined text-2xl">description</span>
						</div>
						<div>
							<h3 class="text-lg font-bold text-amber-800 dark:text-amber-300">Input Surat Jalan Ritase #{selectedNgepokTrip.ritase_ke}</h3>
							<p class="text-xs text-on-surface-variant font-mono mt-0.5">{selectedNgepokTrip.no_surat_tugas} • {selectedNgepokBatch.unit} ({selectedNgepokBatch.driver})</p>
						</div>
					</div>
					<button type="button" onclick={closeNgepokModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>

			<!-- Form -->
			<form method="POST" action="?/submitNgepokDN" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; }; }}>
				<input type="hidden" name="tripId" value={selectedNgepokTrip.trip_id}>
				
				<div class="p-6 space-y-4">
					<!-- Info Ringkas -->
					<div class="p-3 bg-surface-container/60 rounded-xl text-xs space-y-1 border border-surface-container">
						<div class="flex justify-between">
							<span class="text-on-surface-variant">Customer:</span>
							<span class="font-bold text-on-surface">{selectedNgepokTrip.customer || selectedNgepokBatch.customer || '-'}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-on-surface-variant">Rute:</span>
							<span class="font-bold text-on-surface">{selectedNgepokTrip.origin || selectedNgepokBatch.origin} → {selectedNgepokTrip.destination || selectedNgepokBatch.destination}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-on-surface-variant">Muatan:</span>
							<span class="font-bold text-on-surface">{selectedNgepokTrip.cargo || selectedNgepokBatch.cargo}</span>
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1" for="ngepok_no_sj">
							No. Surat Jalan Customer (Fisik) <span class="text-error">*</span>
						</label>
						<input
							id="ngepok_no_sj"
							type="text"
							name="noSuratJalan"
							bind:value={inputNgepokNoSj}
							placeholder="Contoh: SJ-CUST-98214"
							class="w-full bg-surface-container-lowest border border-surface-container rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-on-surface outline-none focus:ring-2 focus:ring-amber-500"
							required
						/>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1" for="ngepok_tgl_sj">
								Tanggal Surat Jalan <span class="text-error">*</span>
							</label>
							<input
								id="ngepok_tgl_sj"
								type="date"
								name="tglSuratJalan"
								bind:value={inputNgepokTgl}
								class="w-full bg-surface-container-lowest border border-surface-container rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-amber-500"
								required
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1" for="ngepok_berat">
								Tonase Riil (Timbang) <span class="text-error">*</span>
							</label>
							<div class="relative">
								<input
									id="ngepok_berat"
									type="number"
									step="0.01"
									name="totalBerat"
									bind:value={inputNgepokBerat}
									placeholder="32.5"
									class="w-full bg-surface-container-lowest border border-surface-container rounded-xl pl-4 pr-12 py-2.5 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-amber-500 font-mono"
									required
								/>
								<span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">Ton</span>
							</div>
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1" for="ngepok_file_url">
							Bukti Foto / Scan Surat Jalan (Opsional)
						</label>
						<input
							id="ngepok_file_url"
							type="url"
							name="fileUploadUrl"
							bind:value={inputNgepokFileUrl}
							placeholder="https://... (Foto berkas SJB berstempel)"
							class="w-full bg-surface-container-lowest border border-surface-container rounded-xl px-4 py-2.5 text-xs text-on-surface outline-none focus:ring-2 focus:ring-amber-500"
						/>
						<p class="text-[10px] text-on-surface-variant mt-1">Bukti lampiran akan otomatis terhubung ke modul Finance untuk penagihan/invoicing.</p>
					</div>

					<div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300">
						<p class="leading-relaxed text-[11px]">
							Menyimpan form ini akan menandai Ritase #{selectedNgepokTrip.ritase_ke} menjadi <strong>COMPLETED (Selesai)</strong> dan memperbarui status Surat Jalan pada halaman OCS Dispatch secara otomatis.
						</p>
					</div>
				</div>

				<div class="p-6 border-t border-surface-container bg-surface-container-low/40 flex justify-end gap-3">
					<button type="button" onclick={closeNgepokModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
						Batal
					</button>
					<button type="submit" disabled={isSubmitting || !inputNgepokNoSj.trim() || !inputNgepokBerat} class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer">
						{#if isSubmitting}
							<span class="material-symbols-outlined text-[18px] animate-spin">sync</span>
							<span>Menyimpan...</span>
						{:else}
							<span class="material-symbols-outlined text-[18px]">verified</span>
							<span>Verifikasi & Selesaikan Ritase</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Preview Surat Jalan Balik -->
{#if selectedDocForPreview}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<div>
					<h3 class="text-base font-bold text-on-surface font-mono">{selectedDocForPreview.no_surat_jalan}</h3>
					<p class="text-xs text-on-surface-variant">{selectedDocForPreview.customer} ({selectedDocForPreview.unit})</p>
				</div>
				<button onclick={() => selectedDocForPreview = null} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 space-y-4">
				<img
					src={selectedDocForPreview.file_upload}
					alt="Bukti Surat Jalan Balik"
					class="w-full h-64 object-cover rounded-xl border border-slate-200 dark:border-slate-800"
				/>
				<div class="text-xs space-y-1">
					<p><strong class="text-on-surface">Tanggal SJ:</strong> {selectedDocForPreview.tgl_surat_jalan}</p>
					<p><strong class="text-on-surface">Tonase Riil:</strong> {selectedDocForPreview.total_berat} Kg</p>
					<p><strong class="text-on-surface">Status:</strong> <span class="font-bold text-emerald-600">VERIFIED (Siap Tagih)</span></p>
				</div>
			</div>
		</div>
	</div>
{/if}
