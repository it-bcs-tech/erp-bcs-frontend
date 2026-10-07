<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { DT_CHECKLIST_TEMPLATE, TR_CHECKLIST_TEMPLATE, BLOOD_PRESSURE_REFERENCE } from '$lib/data/maintenance-checklists';

	let { data, form }: { data: PageData; form: any } = $props();

	const units = $derived(data.units || []);
	const drivers = $derived(data.drivers || []);
	const activeDispensations = $derived(data.activeDispensations || []);

	let selectedUnitId = $state('');
	let selectedUnitDispensation = $derived(
		activeDispensations.find((d: any) => d.unitId === selectedUnitId)
	);
	let selectedUnitType = $state<'DT' | 'TR'>('DT');
	let inspectionType = $state('MASUK');
	let selectedDriverId = $state('');
	let kenekName = $state('');
	let odometer = $state<number | null>(null);
	let generalNotes = $state('');

	// Driver Health State
	let systolic = $state<number | null>(null);
	let diastolic = $state<number | null>(null);
	let pulse = $state<number | null>(null);
	let alcoholVal = $state<number | null>(null);
	let driverFit = $state<boolean>(true);
	let healthNotes = $state('');

	// Active Checklist State
	let checklistItems = $state<{
		id: string;
		category: string;
		code?: string;
		name: string;
		status: 'OK' | 'NOT_OK';
		remark: string;
	}[]>([]);

	let isSubmitting = $state(false);

	// Initialize checklist based on unit type
	function loadTemplate(type: 'DT' | 'TR') {
		selectedUnitType = type;
		const template = type === 'DT' ? DT_CHECKLIST_TEMPLATE : TR_CHECKLIST_TEMPLATE;
		checklistItems = template.map(t => ({
			id: t.id,
			category: t.category,
			code: t.code,
			name: t.name,
			status: 'OK',
			remark: ''
		}));
	}

	// Initial load
	loadTemplate('DT');

	function handleUnitChange() {
		const found = units.find(u => u.noUnit === selectedUnitId);
		if (found) {
			if (found.type === 'TR') {
				loadTemplate('TR');
			} else {
				loadTemplate('DT');
			}
			if (found.driverId) selectedDriverId = found.driverId;
			if (found.odometer) odometer = found.odometer;
		}
	}

	function setAllStatus(status: 'OK' | 'NOT_OK') {
		checklistItems = checklistItems.map(item => ({
			...item,
			status,
			remark: status === 'OK' ? '' : item.remark
		}));
	}

	// Grouping for accordion or section view
	let groupedChecklist = $derived.by(() => {
		const groups: { [cat: string]: typeof checklistItems } = {};
		for (const item of checklistItems) {
			if (!groups[item.category]) groups[item.category] = [];
			groups[item.category].push(item);
		}
		return groups;
	});

	let defectCount = $derived(checklistItems.filter(i => i.status === 'NOT_OK').length);

	// Evaluate Driver Health when values change
	$effect(() => {
		if (alcoholVal !== null && alcoholVal >= 0.01) {
			driverFit = false;
		}
	});
</script>

<svelte:head>
	<title>Formulir Inspeksi Kendaraan (P2H) | ERP BCS</title>
</svelte:head>

<div class="max-w-5xl mx-auto space-y-6 pb-20">
	<!-- Breadcrumb & Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<nav class="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mb-1">
				<a href="/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<a href="/maintenance/transactions/inspections" class="hover:text-primary transition-colors">Inspeksi</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<span class="text-on-surface font-bold">Formulir P2H</span>
			</nav>
			<h1 class="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2.5">
				<span class="material-symbols-outlined text-primary text-3xl">playlist_add_check</span>
				Pemeriksaan Kelayakan Armada (P2H)
			</h1>
		</div>

		<!-- Switch Template DT / TR -->
		<div class="inline-flex p-1 rounded-xl bg-surface-container border border-slate-200/80 dark:border-slate-800/80">
			<button 
				type="button"
				onclick={() => loadTemplate('DT')}
				class="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 {selectedUnitType === 'DT' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface hover:text-primary'}"
			>
				<span class="material-symbols-outlined text-[16px]">local_shipping</span>
				<span>Form Dumptruck (DT)</span>
			</button>
			<button 
				type="button"
				onclick={() => loadTemplate('TR')}
				class="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 {selectedUnitType === 'TR' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface hover:text-primary'}"
			>
				<span class="material-symbols-outlined text-[16px]">rv_hookup</span>
				<span>Form Trailer (TR)</span>
			</button>
		</div>
	</header>

	{#if form?.message}
		<div class="p-4 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-sm font-semibold flex items-center gap-2">
			<span class="material-symbols-outlined text-[20px]">error</span>
			{form.message}
		</div>
	{/if}

	<form method="POST" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			isSubmitting = false;
			await update();
		};
	}} class="space-y-6">

		<!-- Hidden Inputs for Form Data -->
		<input type="hidden" name="unit_type" value={selectedUnitType} />
		<input type="hidden" name="checklist_data" value={JSON.stringify(checklistItems)} />
		<input type="hidden" name="driver_health" value={JSON.stringify({
			systolic,
			diastolic,
			pulse,
			alcohol_test: alcoholVal,
			is_fit: driverFit,
			notes: healthNotes
		})} />

		<!-- Section 1: Informasi Armada & Driver -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
			<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
				<span class="material-symbols-outlined text-primary text-[20px]">badge</span>
				Informasi Unit & Pengemudi
			</h2>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				<!-- Nomor Unit -->
				<div>
					<label for="unit_id" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Nomor Unit Armada *</label>
					<input 
						id="unit_id"
						name="unit_id" 
						list="units-list"
						bind:value={selectedUnitId}
						onchange={handleUnitChange}
						placeholder="Pilih atau ketik No. Unit..." 
						required
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
					<datalist id="units-list">
						{#each units as u}
							<option value={u.noUnit}>{u.noUnit} ({u.type}) - {u.driverName || 'No Driver'}</option>
						{/each}
					</datalist>
				</div>

				<!-- Jenis Pemeriksaan -->
				<div>
					<label for="inspection_type" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Waktu Inspeksi</label>
					<select 
						id="inspection_type"
						name="inspection_type" 
						bind:value={inspectionType}
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					>
						<option value="MASUK">Masuk Pool / Garasi</option>
						<option value="KELUAR">Keluar Pool (Pre-Trip)</option>
						<option value="RUTIN">Inspeksi Rutin Berkala</option>
					</select>
				</div>

				<!-- Odometer (KM) -->
				<div>
					<label for="odometer" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Odometer (KM Saat Ini)</label>
					<input 
						id="odometer"
						type="number" 
						name="odometer" 
						bind:value={odometer}
						placeholder="Contoh: 125400" 
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-mono text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
				</div>

				<!-- Driver -->
				<div>
					<label for="driver_id" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Pengemudi (Driver)</label>
					<select 
						id="driver_id"
						name="driver_id" 
						bind:value={selectedDriverId}
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					>
						<option value="">-- Pilih Pengemudi --</option>
						{#each drivers as d}
							<option value={d.id}>{d.name} ({d.id})</option>
						{/each}
					</select>
				</div>

				<!-- Kenek -->
				<div>
					<label for="kenek_name" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Kenek (Opsional)</label>
					<input 
						id="kenek_name"
						type="text" 
						name="kenek_name" 
						bind:value={kenekName}
						placeholder="Nama kenek..." 
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
				</div>

				<!-- Catatan Umum -->
				<div>
					<label for="notes" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Catatan Tambahan</label>
					<input 
						id="notes"
						type="text" 
						name="notes" 
						bind:value={generalNotes}
						placeholder="Catatan inspeksi umum..." 
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
				</div>
			</div>

			{#if selectedUnitDispensation}
				<div class="mt-4 p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-on-surface text-xs space-y-2">
					<div class="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
						<span class="material-symbols-outlined text-[20px]">warning</span>
						<span>Peringatan: Unit Sedang dalam Masa Dispensasi Jalan (SPK: {selectedUnitDispensation.woNo})</span>
					</div>
					<p class="text-on-surface-variant">
						Unit ini diizinkan beroperasi sementara meskipun ada item perbaikan yang belum tuntas.
						{#if selectedUnitDispensation.commitmentDate}
							Komitmen kembali ke bengkel: <b>{new Date(selectedUnitDispensation.commitmentDate).toLocaleDateString('id-ID', { dateStyle: 'long' })}</b>.
						{/if}
					</p>
					{#if selectedUnitDispensation.recommendation}
						<div class="text-[11px] bg-surface-container/60 p-2 rounded-lg">
							<span class="font-bold text-on-surface">Catatan Mekanik:</span> <i>{selectedUnitDispensation.recommendation}</i>
						</div>
					{/if}
					{#if selectedUnitDispensation.deferredItems && selectedUnitDispensation.deferredItems.length > 0}
						<div class="text-[11px]">
							<span class="font-bold text-on-surface">Item tertunda:</span> {selectedUnitDispensation.deferredItems.map((i: any) => i.item).join(', ')}
						</div>
					{/if}
					<div class="pt-1 flex flex-wrap items-center gap-2">
						<a 
							href="/maintenance/transactions/work-orders/{encodeURIComponent(selectedUnitDispensation.woNo)}"
							target="_blank"
							class="inline-flex items-center gap-1 font-bold text-primary hover:underline"
						>
							<span>Buka Lembar SPK Bengkel</span>
							<span class="material-symbols-outlined text-[13px]">open_in_new</span>
						</a>
						<span class="text-on-surface-variant">• Apabila unit masuk untuk menyelesaikan sisa perbaikan, pastikan klik "Kembali ke Bengkel" pada SPK!</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Section 2: Pemeriksaan Kesehatan Driver (Tensi & Alkohol) -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
					<span class="material-symbols-outlined text-rose-500 text-[20px]">ecg_heart</span>
					Pemeriksaan Tekanan Darah & Tes Alkohol Pengemudi
				</h2>
				<span class="text-xs text-on-surface-variant font-medium">Standar Alkohol: &lt; 0.01 = OK</span>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div>
					<label for="systolic" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Systolik (mmHg)</label>
					<input 
						id="systolic"
						type="number" 
						bind:value={systolic} 
						placeholder="120" 
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-mono text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
				</div>
				<div>
					<label for="diastolic" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Diastolik (mmHg)</label>
					<input 
						id="diastolic"
						type="number" 
						bind:value={diastolic} 
						placeholder="80" 
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-mono text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
				</div>
				<div>
					<label for="pulse" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Pulse (Detak/Menit)</label>
					<input 
						id="pulse"
						type="number" 
						bind:value={pulse} 
						placeholder="75" 
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-mono text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
				</div>
				<div>
					<label for="alcoholVal" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Tes Alkohol (BAC %)</label>
					<input 
						id="alcoholVal"
						type="number" 
						step="0.001" 
						bind:value={alcoholVal} 
						placeholder="0.000" 
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-mono text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
				</div>
			</div>

			<!-- Status Kelayakan Driver -->
			<div class="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between gap-4">
				<div class="text-xs">
					<span class="font-bold text-on-surface">Kesimpulan Kesehatan:</span>
					<span class="text-on-surface-variant ml-1">Driver dinyatakan layak/tidak layak melakukan aktivitas mengemudi.</span>
				</div>
				<div class="flex items-center gap-2">
					<button 
						type="button" 
						onclick={() => driverFit = true}
						class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all {driverFit ? 'bg-emerald-600 text-white' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}"
					>
						✓ Sehat / Siap Jalan
					</button>
					<button 
						type="button" 
						onclick={() => driverFit = false}
						class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all {!driverFit ? 'bg-rose-600 text-white' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}"
					>
						✗ Tidak Sehat (Istirahat)
					</button>
				</div>
			</div>
		</div>

		<!-- Section 3: Checklist Pemeriksaan Fisik Kendaraan -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-5">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 dark:border-slate-800/70 pb-4">
				<div>
					<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-[20px]">fact_check</span>
						Lembar Checklist Fisik: {selectedUnitType === 'DT' ? 'Dumptruck (DT)' : 'Trailer (TR)'}
					</h2>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">Tandai 'OK' jika layak atau 'TIDAK OK' jika ditemukan kerusakan/cacat.</p>
				</div>

				<!-- Quick Set All OK / NOT OK -->
				<div class="flex items-center gap-2">
					<button 
						type="button" 
						onclick={() => setAllStatus('OK')}
						class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center gap-1"
					>
						<span class="material-symbols-outlined text-[15px]">done_all</span>
						Set Semua OK
					</button>
				</div>
			</div>

			<!-- Render Checklist per Category -->
			<div class="space-y-6">
				{#each Object.entries(groupedChecklist) as [categoryName, items]}
					<div class="space-y-2">
						<div class="px-3 py-1.5 rounded-lg bg-surface-container-low text-xs font-black uppercase tracking-wider text-on-surface flex items-center justify-between">
							<span>{categoryName}</span>
							<span class="text-[10px] text-on-surface-variant">{items.length} Item</span>
						</div>

						<div class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
							{#each items as item}
								<div class="py-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-low/30 rounded-lg transition-colors">
									<div class="flex items-start gap-2.5 flex-1">
										{#if item.code}
											<span class="font-mono text-xs font-bold text-on-surface-variant min-w-[32px]">{item.code}</span>
										{/if}
										<div>
											<span class="text-sm font-semibold text-on-surface">{item.name}</span>
											{#if item.status === 'NOT_OK'}
												<input 
													type="text" 
													bind:value={item.remark} 
													placeholder="Tuliskan detail temuan kerusakan..." 
													class="mt-1.5 w-full text-xs px-2.5 py-1.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 placeholder:text-rose-400 outline-none"
												/>
											{/if}
										</div>
									</div>

									<div class="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
										<button 
											type="button" 
											onclick={() => item.status = 'OK'}
											class="px-3 py-1 rounded-lg text-xs font-bold transition-all {item.status === 'OK' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}"
										>
											OK
										</button>
										<button 
											type="button" 
											onclick={() => item.status = 'NOT_OK'}
											class="px-3 py-1 rounded-lg text-xs font-bold transition-all {item.status === 'NOT_OK' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}"
										>
											TIDAK OK
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Sticky Bottom Action Bar -->
		<div class="sticky bottom-4 p-4 rounded-2xl bg-surface-container-lowest/95 backdrop-blur border border-slate-200/80 dark:border-slate-800/80 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 z-30">
			<div class="flex items-center gap-3">
				{#if defectCount > 0}
					<div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center flex-shrink-0">
						<span class="material-symbols-outlined text-[24px]">warning</span>
					</div>
					<div>
						<div class="text-xs font-bold text-rose-600 uppercase tracking-wider">Hasil: TIDAK LAYAK JALAN ({defectCount} Defect)</div>
						<div class="text-[11px] text-on-surface-variant font-medium">Sistem akan otomatis membuat tiket Work Order (SPK) bengkel & mengunci status unit.</div>
					</div>
				{:else}
					<div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
						<span class="material-symbols-outlined text-[24px]">verified</span>
					</div>
					<div>
						<div class="text-xs font-bold text-emerald-600 uppercase tracking-wider">Hasil: LAYAK JALAN (PASSED)</div>
						<div class="text-[11px] text-on-surface-variant font-medium">Semua item pemeriksaan fisik memenuhi standar operasional.</div>
					</div>
				{/if}
			</div>

			<div class="flex items-center gap-3 w-full sm:w-auto">
				<a href="/maintenance/transactions/inspections" class="px-4 py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-bold text-sm transition-all text-center flex-1 sm:flex-initial">
					Batal
				</a>
				<button 
					type="submit" 
					disabled={isSubmitting || !selectedUnitId}
					class="px-6 py-2.5 rounded-xl {defectCount > 0 ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary hover:opacity-95'} text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
						<span>Menyimpan...</span>
					{:else if defectCount > 0}
						<span class="material-symbols-outlined text-[18px]">engineering</span>
						<span>Simpan & Terbitkan SPK Bengkel</span>
					{:else}
						<span class="material-symbols-outlined text-[18px]">check_circle</span>
						<span>Simpan Hasil Inspeksi (Layak)</span>
					{/if}
				</button>
			</div>
		</div>

	</form>
</div>
