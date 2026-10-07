<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { 
		DT_CHECKLIST_TEMPLATE, 
		TR_CHECKLIST_TEMPLATE, 
		BULK_CHECKLIST_TEMPLATE, 
		BLOOD_PRESSURE_REFERENCE, 
		MIN_TIRE_DEPTH_MM 
	} from '$lib/data/maintenance-checklists';

	let { data, form }: { data: PageData; form: any } = $props();

	const units = $derived(data.units || []);
	const drivers = $derived(data.drivers || []);
	const activeDispensations = $derived(data.activeDispensations || []);

	let selectedUnitId = $state('');
	let selectedUnitDispensation = $derived(
		activeDispensations.find((d: any) => d.unitId === selectedUnitId)
	);

	let selectedUnitType = $state<'DT' | 'TR' | 'BULK'>('DT');
	let policeNo = $state('');
	let selectedDriverId = $state('');
	let driverIdNo = $state('');
	let kenekName = $state('');
	let noApar = $state('');
	let destination = $state('');
	let driverAge = $state<number | null>(null);
	let odometer = $state<number | null>(null);
	let generalNotes = $state('');

	// Timestamps Masuk & Keluar
	const todayStr = new Date().toISOString().slice(0, 10);
	let entryDate = $state(todayStr);
	let entryTime = $state('08:00');
	let exitDate = $state(todayStr);
	let exitTime = $state('08:30');

	// Inspector Identity
	let inspectorName = $state(data.currentInspector?.name || 'Inspector Workshop');
	let inspectorId = $state(data.currentInspector?.id || '');

	// Driver Health State
	let systolic = $state<number | null>(null);
	let diastolic = $state<number | null>(null);
	let pulse = $state<number | null>(null);
	let alcoholVal = $state<number | null>(null);
	let measurementTime = $state('08:15');
	let driverFit = $state<boolean>(true);
	let healthNotes = $state('');

	// Tire Depth State (mm)
	// DT: 10 Head + Serep. TR/BULK: 12 Head + 12 Trailer + Serep
	let headTires = $state<(number | null)[]>(Array(12).fill(null));
	let trailerTires = $state<(number | null)[]>(Array(12).fill(null));
	let spareTire = $state<number | null>(null);

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
	function loadTemplate(type: 'DT' | 'TR' | 'BULK') {
		selectedUnitType = type;
		let template = DT_CHECKLIST_TEMPLATE;
		if (type === 'TR') template = TR_CHECKLIST_TEMPLATE;
		if (type === 'BULK') template = BULK_CHECKLIST_TEMPLATE;

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
			policeNo = found.noUnit;
			loadTemplate(found.type);
			if (found.driverId) {
				selectedDriverId = found.driverId;
				driverIdNo = found.driverId;
			}
		}
	}

	function handleDriverChange() {
		const found = drivers.find(d => d.id === selectedDriverId);
		if (found) {
			driverIdNo = found.id;
			if (found.birthDate) {
				const birthYear = new Date(found.birthDate).getFullYear();
				const currentYear = new Date().getFullYear();
				driverAge = currentYear - birthYear;
			}
		}
	}

	function setAllStatus(status: 'OK' | 'NOT_OK') {
		checklistItems = checklistItems.map(item => ({
			...item,
			status,
			remark: status === 'OK' ? '' : item.remark
		}));
	}

	// Grouping for checklist view
	let groupedChecklist = $derived.by(() => {
		const groups: { [cat: string]: typeof checklistItems } = {};
		for (const item of checklistItems) {
			if (!groups[item.category]) groups[item.category] = [];
			groups[item.category].push(item);
		}
		return groups;
	});

	let defectCount = $derived(checklistItems.filter(i => i.status === 'NOT_OK').length);

	// Count thin tires (< 1.0 mm)
	let thinTiresCount = $derived.by(() => {
		let cnt = 0;
		const maxHead = selectedUnitType === 'DT' ? 10 : 12;
		for (let i = 0; i < maxHead; i++) {
			const v = headTires[i];
			if (v !== null && v > 0 && v < MIN_TIRE_DEPTH_MM) cnt++;
		}
		if (selectedUnitType !== 'DT') {
			for (let i = 0; i < 12; i++) {
				const v = trailerTires[i];
				if (v !== null && v > 0 && v < MIN_TIRE_DEPTH_MM) cnt++;
			}
		}
		if (spareTire !== null && spareTire > 0 && spareTire < MIN_TIRE_DEPTH_MM) cnt++;
		return cnt;
	});

	// Evaluate Driver Health when alcohol >= 0.01
	$effect(() => {
		if (alcoholVal !== null && alcoholVal >= 0.01) {
			driverFit = false;
		}
	});

	// 3-Tier Recommendation Status
	let userRecommendation = $state<'LAYAK' | 'LAYAK_DENGAN_CATATAN' | 'TIDAK_LAYAK'>('LAYAK');

	// Auto compute suggested status
	let computedSuggestedStatus = $derived.by(() => {
		if (defectCount > 0 || thinTiresCount > 0 || !driverFit) {
			// Check if defects are mechanical vs minor
			return 'TIDAK_LAYAK';
		}
		return 'LAYAK';
	});

	$effect(() => {
		userRecommendation = computedSuggestedStatus;
	});
</script>

<svelte:head>
	<title>Formulir Inspeksi Kelayakan Armada (P2H) | ERP BCS</title>
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
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2.5">
					<span class="material-symbols-outlined text-primary text-3xl">playlist_add_check</span>
					Pemeriksaan Kelayakan Armada (P2H)
				</h1>
				<span class="text-xs px-2.5 py-1 rounded-lg bg-surface-container font-mono font-bold text-on-surface-variant border border-slate-200 dark:border-slate-800">
					{#if selectedUnitType === 'DT'}NO. FM-HSE-67 Rev.12
					{:else if selectedUnitType === 'TR'}No. FM-HSE-66 Rev.12
					{:else}No. FM-HSE-02 Rev.04{/if}
				</span>
			</div>
		</div>

		<!-- Switch Template DT / TR / BULK -->
		<div class="inline-flex p-1 rounded-xl bg-surface-container border border-slate-200/80 dark:border-slate-800/80">
			<button 
				type="button" 
				onclick={() => loadTemplate('DT')}
				class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 {selectedUnitType === 'DT' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface hover:text-primary'}"
			>
				<span class="material-symbols-outlined text-[15px]">local_shipping</span>
				<span>Dumptruck (DT)</span>
			</button>
			<button 
				type="button" 
				onclick={() => loadTemplate('TR')}
				class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 {selectedUnitType === 'TR' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface hover:text-primary'}"
			>
				<span class="material-symbols-outlined text-[15px]">rv_hookup</span>
				<span>Trailer (TR)</span>
			</button>
			<button 
				type="button" 
				onclick={() => loadTemplate('BULK')}
				class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 {selectedUnitType === 'BULK' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface hover:text-primary'}"
			>
				<span class="material-symbols-outlined text-[15px]">factory</span>
				<span>Bulk (Tronton / Semen)</span>
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
		<input type="hidden" name="police_no" value={policeNo} />
		<input type="hidden" name="driver_id_no" value={driverIdNo} />
		<input type="hidden" name="recommendation" value={userRecommendation} />
		<input type="hidden" name="checklist_data" value={JSON.stringify(checklistItems)} />
		<input type="hidden" name="driver_health" value={JSON.stringify({
			systolic,
			diastolic,
			pulse,
			alcohol_test: alcoholVal,
			measurement_time: measurementTime,
			is_fit: driverFit,
			notes: healthNotes
		})} />
		<input type="hidden" name="tire_depth_data" value={JSON.stringify({
			head: selectedUnitType === 'DT' ? headTires.slice(0, 10) : headTires,
			trailer: selectedUnitType === 'DT' ? [] : trailerTires,
			spare: spareTire
		})} />

		<!-- Section 1: Informasi Unit, Waktu Masuk/Keluar & Inspektor -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
					<span class="material-symbols-outlined text-primary text-[20px]">badge</span>
					Identitas Armada, Waktu Masuk / Keluar & Petugas Inspeksi
				</h2>
				<span class="text-xs text-on-surface-variant font-mono">Form: {selectedUnitType}</span>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<!-- Nomor Unit -->
				<div>
					<label for="unit_id" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Nomor Unit Armada *</label>
					<input 
						id="unit_id"
						name="unit_id" 
						list="units-list"
						bind:value={selectedUnitId}
						onchange={handleUnitChange}
						placeholder="Pilih No. Unit..." 
						required
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
					<datalist id="units-list">
						{#each units as u}
							<option value={u.noUnit}>{u.noUnit} ({u.type}) {u.year ? `• ${u.year}` : ''} - {u.driverName || 'No Driver'}</option>
						{/each}
					</datalist>
				</div>

				<!-- Nomor Polisi -->
				<div>
					<label for="police_no_input" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Nomor Polisi</label>
					<input 
						id="police_no_input"
						type="text" 
						bind:value={policeNo} 
						placeholder="Contoh: B 9123 BCS" 
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-mono text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
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

				<!-- No APAR (Jika DT/TR) -->
				<div>
					<label for="no_apar" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">No. APAR Unit</label>
					<input 
						id="no_apar"
						type="text" 
						name="no_apar" 
						bind:value={noApar}
						placeholder="Nomor tabung APAR..." 
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
				</div>

				<!-- Waktu Masuk (Tanggal & Jam) -->
				<div>
					<label for="entry_date" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Tanggal & Jam Masuk</label>
					<div class="flex items-center gap-1.5">
						<input 
							id="entry_date"
							type="date" 
							name="entry_date" 
							bind:value={entryDate} 
							class="w-full px-2.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none"
						/>
						<input 
							type="time" 
							name="entry_time" 
							bind:value={entryTime} 
							class="w-24 px-2 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-center text-on-surface outline-none"
						/>
					</div>
				</div>

				<!-- Waktu Keluar (Tanggal & Jam) -->
				<div>
					<label for="exit_date" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Tanggal & Jam Keluar</label>
					<div class="flex items-center gap-1.5">
						<input 
							id="exit_date"
							type="date" 
							name="exit_date" 
							bind:value={exitDate} 
							class="w-full px-2.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none"
						/>
						<input 
							type="time" 
							name="exit_time" 
							bind:value={exitTime} 
							class="w-24 px-2 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-center text-on-surface outline-none"
						/>
					</div>
				</div>

				<!-- Petugas Inspektor (Nama & ID) -->
				<div class="sm:col-span-2">
					<label for="inspector_name" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Petugas Inspektor (Nama & ID)</label>
					<div class="flex items-center gap-2">
						<input 
							id="inspector_name"
							type="text" 
							name="inspector_name" 
							bind:value={inspectorName} 
							placeholder="Nama Inspektor..." 
							class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface outline-none"
						/>
						<input 
							type="text" 
							name="inspector_id" 
							bind:value={inspectorId} 
							placeholder="No. ID Inspector" 
							class="w-36 px-2.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-center text-on-surface outline-none"
						/>
					</div>
				</div>

				<!-- Driver Selection -->
				<div>
					<label for="driver_id" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Pengemudi (Driver)</label>
					<select 
						id="driver_id"
						name="driver_id" 
						bind:value={selectedDriverId}
						onchange={handleDriverChange}
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none"
					/>
				</div>

				<!-- Tujuan / Destinasi Trip -->
				<div>
					<label for="destination" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Tujuan / Rute Trip</label>
					<input 
						id="destination"
						type="text" 
						name="destination" 
						bind:value={destination} 
						placeholder="Contoh: Merak / Narogong / Cirebon..." 
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none"
					/>
				</div>

				<!-- Umur Driver -->
				<div>
					<label for="driver_age" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Umur Driver (Tahun)</label>
					<input 
						id="driver_age"
						type="number" 
						name="driver_age" 
						bind:value={driverAge} 
						placeholder="Contoh: 35" 
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none"
					/>
				</div>
			</div>

			<!-- Dispensation Alert Banner if selected unit is in dispensation -->
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

		<!-- Section 2: Pemeriksaan Ketebalan Ban (Tire Tread Depth dalam MM) -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
				<div>
					<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-[20px]">tire_repair</span>
						Pemeriksaan Ketebalan Ban (Milimeter)
					</h2>
					<p class="text-xs text-on-surface-variant mt-0.5">
						Standar kedalaman alur ban minimal: <b>1.0 mm</b> (SK.523/AJ.402/DRJD/2015). Angka &lt; 1.0 mm otomatis terdeteksi cacat (kuning/merah).
					</p>
				</div>
				{#if thinTiresCount > 0}
					<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300">
						{thinTiresCount} Ban di Bawah Standar (&lt; 1mm)
					</span>
				{:else}
					<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300">
						Semua Ban Memenuhi Standar
					</span>
				{/if}
			</div>

			<!-- Ban Head (1..10 untuk DT, 1..12 untuk TR/BULK) -->
			<div class="space-y-2">
				<div class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
					<span class="material-symbols-outlined text-primary text-[16px]">directions_car</span>
					1. Ban Head / Penggerak Utama ({selectedUnitType === 'DT' ? '10 Ban' : '12 Ban'}):
				</div>
				<div class="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
					{#each Array(selectedUnitType === 'DT' ? 10 : 12) as _, idx}
						<div class="p-2 rounded-xl border text-center {headTires[idx] !== null && headTires[idx]! < MIN_TIRE_DEPTH_MM ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-400 text-rose-900' : 'bg-surface-container-low border-slate-200 dark:border-slate-800'}">
							<span class="text-[10px] font-bold block text-on-surface-variant">Ban #{idx + 1}</span>
							<input 
								type="number" 
								step="0.1" 
								min="0" 
								max="30"
								placeholder="mm"
								bind:value={headTires[idx]}
								class="w-full text-xs font-mono font-bold text-center bg-transparent outline-none mt-1"
							/>
						</div>
					{/each}
				</div>
			</div>

			<!-- Ban Trailer (Hanya untuk TR & BULK, 12 Ban) -->
			{#if selectedUnitType !== 'DT'}
				<div class="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
					<div class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-[16px]">rv_hookup</span>
						2. Ban Gandengan / Trailer (12 Ban):
					</div>
					<div class="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
						{#each Array(12) as _, idx}
							<div class="p-2 rounded-xl border text-center {trailerTires[idx] !== null && trailerTires[idx]! < MIN_TIRE_DEPTH_MM ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-400 text-rose-900' : 'bg-surface-container-low border-slate-200 dark:border-slate-800'}">
								<span class="text-[10px] font-bold block text-on-surface-variant">Trl #{idx + 1}</span>
								<input 
									type="number" 
									step="0.1" 
									min="0" 
									max="30"
									placeholder="mm"
									bind:value={trailerTires[idx]}
									class="w-full text-xs font-mono font-bold text-center bg-transparent outline-none mt-1"
								/>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Ban Serep -->
			<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-4">
				<div class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
					<span class="material-symbols-outlined text-primary text-[16px]">change_circle</span>
					Ban Cadangan (Serep):
				</div>
				<div class="w-32 p-2 rounded-xl border text-center {spareTire !== null && spareTire < MIN_TIRE_DEPTH_MM ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-400' : 'bg-surface-container-low border-slate-200 dark:border-slate-800'}">
					<input 
						type="number" 
						step="0.1" 
						min="0" 
						max="30"
						placeholder="Kedalaman mm"
						bind:value={spareTire}
						class="w-full text-xs font-mono font-bold text-center bg-transparent outline-none"
					/>
				</div>
			</div>
		</div>

		<!-- Section 3: Pemeriksaan Kesehatan Driver (Tensi & Alkohol) -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
					<span class="material-symbols-outlined text-rose-500 text-[20px]">ecg_heart</span>
					Pemeriksaan Tekanan Darah & Tes Alkohol Pengemudi
				</h2>
				<span class="text-xs text-on-surface-variant font-medium">Standar Alkohol: &lt; 0.01 BAC</span>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div>
					<label for="systolic" class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Systolik (mmHg)</label>
					<input 
						id="systolic"
						type="number" 
						bind:value={systolic} 
						placeholder="Contoh: 120" 
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none"
					/>
				</div>
				<div>
					<label for="diastolic" class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Diastolik (mmHg)</label>
					<input 
						id="diastolic"
						type="number" 
						bind:value={diastolic} 
						placeholder="Contoh: 80" 
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none"
					/>
				</div>
				<div>
					<label for="pulse" class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Pulse / Nadi (x/mnt)</label>
					<input 
						id="pulse"
						type="number" 
						bind:value={pulse} 
						placeholder="Contoh: 75" 
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none"
					/>
				</div>
				<div>
					<label for="alcohol_val" class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Tes Alkohol (BAC)</label>
					<input 
						id="alcohol_val"
						type="number" 
						step="0.01" 
						bind:value={alcoholVal} 
						placeholder="Contoh: 0.00" 
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none {alcoholVal !== null && alcoholVal >= 0.01 ? 'border-rose-500 text-rose-600' : ''}"
					/>
				</div>
			</div>

			<!-- Rujukan Usia Tekanan Darah -->
			<div class="p-3 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
				<span class="font-bold text-on-surface">Tabel Parameter Batas Normal Tekanan Darah Berdasarkan Usia:</span>
				<div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-on-surface-variant pt-1">
					{#each BLOOD_PRESSURE_REFERENCE as ref}
						<div class="p-1.5 rounded-lg bg-surface-container">
							<b>{ref.ageRange}</b>
							<div>Sys: {ref.systolic}</div>
							<div>Dia: {ref.diastolic}</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Section 4: Checklist Pemeriksaan Fisik Lengkap (DT, TR, atau BULK) -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
				<div>
					<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-[20px]">checklist</span>
						Daftar Rincian Checklist Pemeriksaan ({checklistItems.length} Item)
					</h2>
					<p class="text-xs text-on-surface-variant mt-0.5">
						Tandai <b>OK</b> jika kondisi baik / lengkap, atau <b>NOT OK</b> jika ada temuan rusak / hilang.
					</p>
				</div>
				<div class="flex items-center gap-2">
					<button 
						type="button" 
						onclick={() => setAllStatus('OK')}
						class="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 text-xs font-bold hover:bg-emerald-100"
					>
						Set Semua OK
					</button>
					<button 
						type="button" 
						onclick={() => setAllStatus('NOT_OK')}
						class="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 text-xs font-bold hover:bg-rose-100"
					>
						Set Semua Not OK
					</button>
				</div>
			</div>

			<!-- Accordion Group by Category -->
			<div class="space-y-4">
				{#each Object.entries(groupedChecklist) as [category, items]}
					<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
						<div class="p-3 bg-surface-container font-black text-xs text-on-surface uppercase tracking-wider flex items-center justify-between">
							<span>{category}</span>
							<span class="text-[10px] text-on-surface-variant font-mono">
								{items.filter(i => i.status === 'OK').length}/{items.length} OK
							</span>
						</div>
						<div class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
							{#each items as item}
								<div class="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-low/40 transition-colors {item.status === 'NOT_OK' ? 'bg-rose-50/20' : ''}">
									<div class="space-y-0.5 flex-1">
										<div class="flex items-center gap-2 text-xs">
											{#if item.code}
												<span class="font-mono font-bold text-on-surface-variant">[{item.code}]</span>
											{/if}
											<span class="font-bold text-on-surface">{item.name}</span>
										</div>
										{#if item.status === 'NOT_OK'}
											<input 
												type="text" 
												placeholder="Catatan kerusakan / temuan..." 
												bind:value={item.remark}
												class="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface-container border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 outline-none mt-1"
											/>
										{/if}
									</div>

									<div class="inline-flex rounded-xl p-1 bg-surface-container border border-slate-200 dark:border-slate-800 flex-shrink-0 self-end sm:self-center">
										<button 
											type="button" 
											onclick={() => { item.status = 'OK'; item.remark = ''; }}
											class="px-3 py-1 rounded-lg text-xs font-bold transition-all {item.status === 'OK' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
										>
											OK
										</button>
										<button 
											type="button" 
											onclick={() => item.status = 'NOT_OK'}
											class="px-3 py-1 rounded-lg text-xs font-bold transition-all {item.status === 'NOT_OK' ? 'bg-rose-600 text-white shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
										>
											NOT OK
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Section 5: Status Rekomendasi Kelayakan Operasional (3-Tier Status) -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<div>
					<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-[20px]">fact_check</span>
						Kesimpulan & Status Rekomendasi Kelayakan
					</h2>
					<p class="text-xs text-on-surface-variant mt-0.5">
						Pilih status kelayakan resmi sesuai standar lembar formulir fisik operasional.
					</p>
				</div>
				<div class="text-xs font-bold font-mono">
					Total Temuan: <span class="text-rose-600">{defectCount + thinTiresCount} Item</span>
				</div>
			</div>

			<!-- 3 Status Buttons -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
				<button 
					type="button" 
					onclick={() => userRecommendation = 'LAYAK'}
					class="p-4 rounded-xl border text-left transition-all {userRecommendation === 'LAYAK' ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30' : 'bg-surface-container-low border-slate-200 dark:border-slate-800'}"
				>
					<div class="flex items-center gap-2 font-black text-xs text-emerald-700 dark:text-emerald-300 uppercase">
						<span class="material-symbols-outlined text-[18px]">verified</span>
						LAYAK BEROPERASI
					</div>
					<p class="text-[11px] text-on-surface-variant mt-1">
						Seluruh sistem fisik, ban, mesin, dan tensi driver aman. Unit siap bertugas (STANDBY).
					</p>
				</button>

				<button 
					type="button" 
					onclick={() => userRecommendation = 'LAYAK_DENGAN_CATATAN'}
					class="p-4 rounded-xl border text-left transition-all {userRecommendation === 'LAYAK_DENGAN_CATATAN' ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30' : 'bg-surface-container-low border-slate-200 dark:border-slate-800'}"
				>
					<div class="flex items-center gap-2 font-black text-xs text-amber-700 dark:text-amber-300 uppercase">
						<span class="material-symbols-outlined text-[18px]">rule</span>
						LAYAK DENGAN CATATAN
					</div>
					<p class="text-[11px] text-on-surface-variant mt-1">
						Ada catatan minor (APD/kebersihan/surat). Unit boleh jalan, tanpa terbit SPK bengkel.
					</p>
				</button>

				<button 
					type="button" 
					onclick={() => userRecommendation = 'TIDAK_LAYAK'}
					class="p-4 rounded-xl border text-left transition-all {userRecommendation === 'TIDAK_LAYAK' ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30' : 'bg-surface-container-low border-slate-200 dark:border-slate-800'}"
				>
					<div class="flex items-center gap-2 font-black text-xs text-rose-700 dark:text-rose-300 uppercase">
						<span class="material-symbols-outlined text-[18px]">report_problem</span>
						TIDAK LAYAK BEROPERASI
					</div>
					<p class="text-[11px] text-on-surface-variant mt-1">
						Ada cacat mesin/rem/ban &lt; 1mm. Otomatis terbit tiket SPK Work Order & unit MAINTENANCE.
					</p>
				</button>
			</div>

			<!-- Catatan Tambahan -->
			<div>
				<label for="general_notes" class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Catatan Tambahan Inspektor</label>
				<textarea 
					id="general_notes"
					name="notes" 
					bind:value={generalNotes} 
					rows="2"
					placeholder="Catatan inspeksi umum atau disposisi khusus..."
					class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none"
				></textarea>
			</div>
		</div>

		<!-- Submit Bar -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col sm:flex-row items-center justify-between gap-4">
			<div class="text-xs text-on-surface-variant">
				Pastikan seluruh data pemeriksaan telah sesuai sebelum menyimpan ke sistem.
			</div>

			<div class="flex items-center gap-3">
				<a 
					href="/maintenance/transactions/inspections" 
					class="px-5 py-2.5 rounded-xl bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high transition-all"
				>
					Batal
				</a>
				<button 
					type="submit" 
					disabled={isSubmitting || !selectedUnitId}
					class="px-7 py-2.5 rounded-xl bg-primary hover:opacity-95 text-on-primary font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
				>
					<span class="material-symbols-outlined text-[18px]">save</span>
					<span>{isSubmitting ? 'Menyimpan...' : 'Simpan Hasil Inspeksi (P2H)'}</span>
				</button>
			</div>
		</div>
	</form>
</div>
