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

	// Wizard Step State (1 s/d 5)
	let currentStep = $state(1);
	let step1Error = $state('');

	const STEPS = [
		{ id: 1, title: 'Identitas & Waktu', short: 'Unit & Waktu', icon: 'local_shipping' },
		{ id: 2, title: 'Ketebalan Ban', short: 'Ban (mm)', icon: 'tire_repair' },
		{ id: 3, title: 'Kesehatan Driver', short: 'Driver', icon: 'ecg_heart' },
		{ id: 4, title: 'Checklist Fisik', short: 'Checklist', icon: 'checklist' },
		{ id: 5, title: 'Kesimpulan & Simpan', short: 'Rekomendasi', icon: 'fact_check' }
	];

	// Section 1 State: Unit & Petugas
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

	// Inspector Identity (Otomatis dari login session)
	let inspectorName = $state(data.currentInspector?.name || 'Inspector Workshop');
	let inspectorId = $state(data.currentInspector?.id || '');

	// Section 2 State: Ketebalan Ban (mm)
	// DT: 10 Head + Serep. TR/BULK: 12 Head + 12 Trailer + Serep
	let headTires = $state<(number | null)[]>(Array(12).fill(null));
	let trailerTires = $state<(number | null)[]>(Array(12).fill(null));
	let spareTire = $state<number | null>(null);

	// Section 3 State: Kesehatan Driver
	let systolic = $state<number | null>(null);
	let diastolic = $state<number | null>(null);
	let pulse = $state<number | null>(null);
	let alcoholVal = $state<number | null>(null);
	let measurementTime = $state('08:15');
	let driverFit = $state<boolean>(true);
	let healthNotes = $state('');

	// Section 4 State: Active Checklist State & Accordion
	let checklistItems = $state<{
		id: string;
		category: string;
		code?: string;
		name: string;
		status: 'OK' | 'NOT_OK';
		remark: string;
	}[]>([]);

	let expandedCategories = $state<Record<string, boolean>>({});

	// Section 5 State: 3-Tier Recommendation Status
	let userRecommendation = $state<'LAYAK' | 'LAYAK_DENGAN_CATATAN' | 'TIDAK_LAYAK'>('LAYAK');
	let isSubmitting = $state(false);

	// Grouping for checklist view
	let groupedChecklist = $derived.by(() => {
		const groups: { [cat: string]: typeof checklistItems } = {};
		for (const item of checklistItems) {
			if (!groups[item.category]) groups[item.category] = [];
			groups[item.category].push(item);
		}
		return groups;
	});

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

		// Expand all categories by default for smooth experience
		const initialOpen: Record<string, boolean> = {};
		template.forEach(t => {
			initialOpen[t.category] = true;
		});
		expandedCategories = initialOpen;
	}

	// Initial load
	loadTemplate('DT');

	// Handler Unit Change: Mengisi Driver ID dan Umur Otomatis
	function handleUnitChange() {
		const found = units.find(u => u.noUnit === selectedUnitId);
		if (found) {
			policeNo = found.noUnit;
			loadTemplate(found.type);
			if (found.driverId) {
				selectedDriverId = found.driverId;
				driverIdNo = found.driverId;

				// Hitung umur otomatis dari tanggal lahir driver
				const dFound = drivers.find(d => d.id === found.driverId);
				if (dFound && dFound.birthDate) {
					const birthYear = new Date(dFound.birthDate).getFullYear();
					const currentYear = new Date().getFullYear();
					driverAge = currentYear - birthYear;
				} else {
					driverAge = null;
				}
			} else {
				selectedDriverId = '';
				driverIdNo = '';
				driverAge = null;
			}
			step1Error = '';
		}
	}

	// Handler Driver Manual Change
	function handleDriverChange() {
		const found = drivers.find(d => d.id === selectedDriverId);
		if (found) {
			driverIdNo = found.id;
			if (found.birthDate) {
				const birthYear = new Date(found.birthDate).getFullYear();
				const currentYear = new Date().getFullYear();
				driverAge = currentYear - birthYear;
			} else {
				driverAge = null;
			}
		} else {
			driverIdNo = '';
			driverAge = null;
		}
	}

	function setAllStatus(status: 'OK' | 'NOT_OK') {
		checklistItems = checklistItems.map(item => ({
			...item,
			status,
			remark: status === 'OK' ? '' : item.remark
		}));
	}

	function toggleCategory(cat: string) {
		expandedCategories[cat] = !expandedCategories[cat];
	}

	function expandAllCategories() {
		const updated: Record<string, boolean> = {};
		Object.keys(groupedChecklist).forEach(c => { updated[c] = true; });
		expandedCategories = updated;
	}

	function collapseAllCategories() {
		const updated: Record<string, boolean> = {};
		Object.keys(groupedChecklist).forEach(c => { updated[c] = false; });
		expandedCategories = updated;
	}

	// Computations for issues & defects
	let defectCount = $derived(checklistItems.filter(i => i.status === 'NOT_OK').length);
	let defectItems = $derived(checklistItems.filter(i => i.status === 'NOT_OK'));

	// Count thin tires (< 1.0 mm)
	let thinTires = $derived.by(() => {
		const list: { position: string; depth: number }[] = [];
		const maxHead = selectedUnitType === 'DT' ? 10 : 12;
		for (let i = 0; i < maxHead; i++) {
			const v = headTires[i];
			if (v !== null && v > 0 && v < MIN_TIRE_DEPTH_MM) {
				list.push({ position: `Ban Head #${i + 1}`, depth: v });
			}
		}
		if (selectedUnitType !== 'DT') {
			for (let i = 0; i < 12; i++) {
				const v = trailerTires[i];
				if (v !== null && v > 0 && v < MIN_TIRE_DEPTH_MM) {
					list.push({ position: `Ban Trailer #${i + 1}`, depth: v });
				}
			}
		}
		if (spareTire !== null && spareTire > 0 && spareTire < MIN_TIRE_DEPTH_MM) {
			list.push({ position: 'Ban Cadangan (Serep)', depth: spareTire });
		}
		return list;
	});

	let thinTiresCount = $derived(thinTires.length);

	// Evaluate Driver Health when alcohol >= 0.01
	$effect(() => {
		if (alcoholVal !== null && alcoholVal >= 0.01) {
			driverFit = false;
		}
	});

	// Auto compute suggested status
	let computedSuggestedStatus = $derived.by(() => {
		if (defectCount > 0 || thinTiresCount > 0 || !driverFit) {
			return 'TIDAK_LAYAK';
		}
		return 'LAYAK';
	});

	$effect(() => {
		userRecommendation = computedSuggestedStatus;
	});

	// Wizard Navigation Handlers
	function nextStep() {
		if (currentStep === 1) {
			if (!selectedUnitId.trim()) {
				step1Error = 'Nomor Unit Armada wajib dipilih sebelum melanjutkan!';
				return;
			}
			step1Error = '';
		}
		if (currentStep < 5) {
			currentStep += 1;
			if (typeof window !== 'undefined') {
				window.scrollTo({ top: 0, behavior: 'smooth' });
			}
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep -= 1;
			if (typeof window !== 'undefined') {
				window.scrollTo({ top: 0, behavior: 'smooth' });
			}
		}
	}

	function goToStep(target: number) {
		if (target > 1 && !selectedUnitId.trim()) {
			step1Error = 'Nomor Unit Armada wajib dipilih sebelum berpindah langkah!';
			return;
		}
		step1Error = '';
		currentStep = target;
		if (typeof window !== 'undefined') {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}
</script>

<svelte:head>
	<title>Formulir P2H Multi-Step | ERP BCS</title>
</svelte:head>

<div class="max-w-5xl mx-auto space-y-4 pb-16 px-0 sm:px-2">
	<!-- Breadcrumb & Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div>
			<nav class="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mb-1">
				<a href="/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<a href="/maintenance/transactions/inspections" class="hover:text-primary transition-colors">Inspeksi</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<span class="text-on-surface font-bold">Formulir P2H</span>
			</nav>
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="text-lg sm:text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
					<span class="material-symbols-outlined text-primary text-2xl sm:text-3xl">playlist_add_check</span>
					Pemeriksaan Kelayakan Armada (P2H)
				</h1>
				<span class="text-[10px] sm:text-xs px-2 py-0.5 rounded-lg bg-surface-container font-mono font-bold text-on-surface-variant border border-slate-200 dark:border-slate-800">
					{#if selectedUnitType === 'DT'}NO. FM-HSE-67 Rev.12
					{:else if selectedUnitType === 'TR'}No. FM-HSE-66 Rev.12
					{:else}No. FM-HSE-02 Rev.04{/if}
				</span>
			</div>
		</div>

		<!-- Switch Template DT / TR / BULK (Kompak & Touch-Friendly) -->
		<div class="inline-flex p-1 rounded-xl bg-surface-container border border-slate-200/80 dark:border-slate-800/80 self-start sm:self-auto">
			<button 
				type="button" 
				onclick={() => loadTemplate('DT')}
				class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 {selectedUnitType === 'DT' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface hover:text-primary'}"
			>
				<span class="material-symbols-outlined text-[14px]">local_shipping</span>
				<span>DT</span>
			</button>
			<button 
				type="button" 
				onclick={() => loadTemplate('TR')}
				class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 {selectedUnitType === 'TR' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface hover:text-primary'}"
			>
				<span class="material-symbols-outlined text-[14px]">rv_hookup</span>
				<span>Trailer</span>
			</button>
			<button 
				type="button" 
				onclick={() => loadTemplate('BULK')}
				class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 {selectedUnitType === 'BULK' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface hover:text-primary'}"
			>
				<span class="material-symbols-outlined text-[14px]">factory</span>
				<span>Bulk</span>
			</button>
		</div>
	</header>

	<!-- Stepper Ringkas + Progress Bar (Mobile & Tablet Friendly) -->
	<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-3.5 sm:p-4 shadow-xs space-y-3">
		<!-- Step Indicators (Connected with Progress Line) -->
		<div class="relative flex items-center justify-between px-2 sm:px-4">
			<!-- Background Progress Line -->
			<div class="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 z-0"></div>
			<!-- Active Progress Line -->
			<div 
				class="absolute top-1/2 left-4 -translate-y-1/2 h-0.5 bg-primary transition-all duration-300 z-0"
				style="width: calc({((currentStep - 1) / (STEPS.length - 1)) * 100}% - 16px)"
			></div>

			{#each STEPS as step}
				{@const isCompleted = step.id < currentStep && (step.id !== 1 || selectedUnitId)}
				{@const isActive = step.id === currentStep}
				{@const hasIssue = (step.id === 2 && thinTiresCount > 0) || (step.id === 4 && defectCount > 0) || (step.id === 3 && !driverFit)}

				<button 
					type="button"
					onclick={() => goToStep(step.id)}
					class="relative z-10 flex flex-col items-center group focus:outline-none"
				>
					<div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs {isActive ? 'bg-primary text-on-primary ring-4 ring-primary/20 scale-110' : isCompleted ? (hasIssue ? 'bg-rose-500 text-white ring-2 ring-rose-300' : 'bg-emerald-600 text-white') : 'bg-surface-container text-on-surface-variant border border-slate-300 dark:border-slate-700'}">
						{#if isCompleted && !hasIssue}
							<span class="material-symbols-outlined text-[18px]">check</span>
						{:else if hasIssue}
							<span class="material-symbols-outlined text-[16px]">priority_high</span>
						{:else}
							<span>{step.id}</span>
						{/if}
					</div>
					<span class="text-[10px] font-bold mt-1 tracking-tight text-center hidden sm:block {isActive ? 'text-primary font-black' : isCompleted ? 'text-on-surface' : 'text-on-surface-variant'}">
						{step.short}
					</span>
				</button>
			{/each}
		</div>

		<!-- Active Step Sub-Bar -->
		<div class="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
			<div class="flex items-center gap-2">
				<span class="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-black text-[11px]">
					Langkah {currentStep} / 5
				</span>
				<span class="font-bold text-on-surface text-xs sm:text-sm">
					{STEPS[currentStep - 1].title}
				</span>
			</div>

			<div class="flex items-center gap-2">
				{#if defectCount + thinTiresCount > 0}
					<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 flex items-center gap-1">
						<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
						{defectCount + thinTiresCount} Cacat
					</span>
				{:else if currentStep > 1}
					<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
						Aman
					</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Error Alert Messages -->
	{#if form?.message}
		<div class="p-3.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
			<span class="material-symbols-outlined text-[18px]">error</span>
			{form.message}
		</div>
	{/if}

	{#if step1Error}
		<div class="p-3 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-bold flex items-center gap-2">
			<span class="material-symbols-outlined text-[18px]">warning</span>
			{step1Error}
		</div>
	{/if}

	<form method="POST" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			isSubmitting = false;
			await update();
		};
	}} class="space-y-4">

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

		<!-- ========================================================================= -->
		<!-- SECTION 1: Identitas Unit, Masuk/Keluar & Petugas Inspeksi (Langkah 1)    -->
		<!-- ========================================================================= -->
		<div class={currentStep === 1 ? 'space-y-4' : 'hidden'}>
			<div class="p-4 sm:p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 dark:border-slate-800 pb-3">
					<div>
						<h2 class="text-xs sm:text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
							<span class="material-symbols-outlined text-primary text-[18px]">badge</span>
							Identitas Armada, Waktu Masuk / Keluar & Petugas
						</h2>
						<p class="text-[11px] text-on-surface-variant mt-0.5">
							Pilih nomor unit armada untuk memuat data pengemudi dan spesifikasinya secara otomatis.
						</p>
					</div>
					<span class="text-[10px] font-mono font-bold text-on-surface-variant self-start sm:self-auto px-2 py-0.5 rounded bg-surface-container">
						Form: {selectedUnitType}
					</span>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
					<!-- Nomor Unit -->
					<div class="sm:col-span-2">
						<label for="unit_id" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
							Nomor Unit Armada <span class="text-rose-500">*</span>
						</label>
						<input 
							id="unit_id"
							name="unit_id" 
							list="units-list"
							bind:value={selectedUnitId}
							onchange={handleUnitChange}
							placeholder="Pilih atau ketik No. Unit..." 
							required
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
						/>
						<datalist id="units-list">
							{#each units as u}
								<option value={u.noUnit}>{u.noUnit} ({u.type}) {u.year ? `• ${u.year}` : ''} - {u.driverName || 'No Driver'}</option>
							{/each}
						</datalist>
					</div>

					<!-- Nomor Polisi -->
					<div>
						<label for="police_no_input" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Nomor Polisi</label>
						<input 
							id="police_no_input"
							type="text" 
							bind:value={policeNo} 
							placeholder="Contoh: B 9123 BCS" 
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
						/>
					</div>

					<!-- Odometer (KM) -->
					<div>
						<label for="odometer" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Odometer (KM)</label>
						<input 
							id="odometer"
							type="number" 
							name="odometer" 
							bind:value={odometer}
							placeholder="Contoh: 125400" 
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
						/>
					</div>

					<!-- No APAR (Jika DT/TR) -->
					<div>
						<label for="no_apar" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">No. APAR Unit</label>
						<input 
							id="no_apar"
							type="text" 
							name="no_apar" 
							bind:value={noApar}
							placeholder="Nomor tabung APAR..." 
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
						/>
					</div>

					<!-- Driver Selection (Auto-filled saat unit dipilih) -->
					<div>
						<label for="driver_id" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Pengemudi (Driver)</label>
						<select 
							id="driver_id"
							name="driver_id" 
							bind:value={selectedDriverId}
							onchange={handleDriverChange}
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
						>
							<option value="">-- Pilih Pengemudi --</option>
							{#each drivers as d}
								<option value={d.id}>{d.name} ({d.id})</option>
							{/each}
						</select>
					</div>

					<!-- Umur Driver (Auto-filled dari tanggal lahir) -->
					<div>
						<label for="driver_age" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
							Umur Driver (Tahun)
						</label>
						<div class="relative">
							<input 
								id="driver_age"
								type="number" 
								name="driver_age" 
								bind:value={driverAge} 
								placeholder="Otomatis terisi..." 
								class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
							/>
							{#if driverAge !== null}
								<span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
									Auto
								</span>
							{/if}
						</div>
					</div>

					<!-- Kenek -->
					<div>
						<label for="kenek_name" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Kenek (Opsional)</label>
						<input 
							id="kenek_name"
							type="text" 
							name="kenek_name" 
							bind:value={kenekName} 
							placeholder="Nama kenek..." 
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none"
						/>
					</div>

					<!-- Waktu Masuk (Tanggal & Jam) -->
					<div>
						<label for="entry_date" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tanggal & Jam Masuk</label>
						<div class="flex items-center gap-1.5">
							<input 
								id="entry_date"
								type="date" 
								name="entry_date" 
								bind:value={entryDate} 
								class="w-full px-2 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none"
							/>
							<input 
								type="time" 
								name="entry_time" 
								bind:value={entryTime} 
								class="w-20 px-1.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-center text-on-surface outline-none"
							/>
						</div>
					</div>

					<!-- Waktu Keluar (Tanggal & Jam) -->
					<div>
						<label for="exit_date" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tanggal & Jam Keluar</label>
						<div class="flex items-center gap-1.5">
							<input 
								id="exit_date"
								type="date" 
								name="exit_date" 
								bind:value={exitDate} 
								class="w-full px-2 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none"
							/>
							<input 
								type="time" 
								name="exit_time" 
								bind:value={exitTime} 
								class="w-20 px-1.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-center text-on-surface outline-none"
							/>
						</div>
					</div>

					<!-- Tujuan / Destinasi Trip -->
					<div class="sm:col-span-2">
						<label for="destination" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tujuan / Rute Trip</label>
						<input 
							id="destination"
							type="text" 
							name="destination" 
							bind:value={destination} 
							placeholder="Contoh: Merak / Cirebon / Narogong..." 
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none"
						/>
					</div>

					<!-- Petugas Inspektor (Otomatis dari Sesi Login Terverifikasi) -->
					<div class="sm:col-span-2">
						<span class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
							Petugas Inspeksi
						</span>
						<div class="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800">
							<div class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
								<span class="material-symbols-outlined text-[16px]">verified_user</span>
							</div>
							<div class="min-w-0 flex-1">
								<div class="text-xs font-bold text-on-surface truncate">{inspectorName}</div>
								<div class="text-[10px] text-on-surface-variant font-mono">
									{#if inspectorId}
										ID/NIK: {inspectorId} • Terverifikasi
									{:else}
										Sesi Petugas Aktif
									{/if}
								</div>
							</div>
							<span class="text-[9px] px-2 py-0.5 rounded-md font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
								Auto Login
							</span>
						</div>
						<input type="hidden" name="inspector_name" value={inspectorName} />
						<input type="hidden" name="inspector_id" value={inspectorId} />
					</div>
				</div>

				<!-- Dispensation Alert Banner if selected unit is in dispensation -->
				{#if selectedUnitDispensation}
					<div class="mt-4 p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-on-surface text-xs space-y-1.5">
						<div class="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
							<span class="material-symbols-outlined text-[18px]">warning</span>
							<span>Unit Sedang dalam Masa Dispensasi Jalan (SPK: {selectedUnitDispensation.woNo})</span>
						</div>
						<p class="text-on-surface-variant text-[11px]">
							Unit diizinkan beroperasi sementara.
							{#if selectedUnitDispensation.commitmentDate}
								Komitmen kembali ke bengkel: <b>{new Date(selectedUnitDispensation.commitmentDate).toLocaleDateString('id-ID', { dateStyle: 'long' })}</b>.
							{/if}
						</p>
						{#if selectedUnitDispensation.recommendation}
							<div class="text-[10px] bg-surface-container/60 p-2 rounded-lg">
								<span class="font-bold text-on-surface">Catatan Mekanik:</span> <i>{selectedUnitDispensation.recommendation}</i>
							</div>
						{/if}
						<div class="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
							<a 
								href="/maintenance/transactions/work-orders/{encodeURIComponent(selectedUnitDispensation.woNo)}"
								target="_blank"
								class="inline-flex items-center gap-1 font-bold text-primary hover:underline"
							>
								<span>Buka SPK Bengkel</span>
								<span class="material-symbols-outlined text-[12px]">open_in_new</span>
							</a>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- ========================================================================= -->
		<!-- SECTION 2: Pemeriksaan Ketebalan Ban (Langkah 2)                          -->
		<!-- ========================================================================= -->
		<div class={currentStep === 2 ? 'space-y-4' : 'hidden'}>
			<div class="p-4 sm:p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 dark:border-slate-800 pb-3">
					<div>
						<h2 class="text-xs sm:text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
							<span class="material-symbols-outlined text-primary text-[18px]">tire_repair</span>
							Ketebalan Alur Ban (Milimeter)
						</h2>
						<p class="text-[11px] text-on-surface-variant mt-0.5">
							Standar minimal kedalaman: <b>1.0 mm</b> (SK.523/AJ.402/DRJD/2015). Angka &lt; 1.0 mm otomatis terdeteksi cacat (merah).
						</p>
					</div>
					{#if thinTiresCount > 0}
						<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 flex items-center gap-1 self-start sm:self-auto">
							<span class="material-symbols-outlined text-[14px]">warning</span>
							{thinTiresCount} Ban di Bawah Standar
						</span>
					{:else}
						<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 flex items-center gap-1 self-start sm:self-auto">
							<span class="material-symbols-outlined text-[14px]">check</span>
							Semua Ban Memenuhi Standar
						</span>
					{/if}
				</div>

				<!-- Ban Head (1..10 untuk DT, 1..12 untuk TR/BULK) -->
				<!-- Grid: 4 kolom di HP, 6 kolom di Tablet, 12 kolom di Desktop -->
				<div class="space-y-2">
					<div class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center justify-between">
						<span class="flex items-center gap-1.5">
							<span class="material-symbols-outlined text-primary text-[15px]">directions_car</span>
							1. Ban Head / Penggerak Utama ({selectedUnitType === 'DT' ? '10 Ban' : '12 Ban'}):
						</span>
						<span class="text-[10px] text-on-surface-variant font-mono">Min. 1.0 mm</span>
					</div>
					<div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
						{#each Array(selectedUnitType === 'DT' ? 10 : 12) as _, idx}
							<div class="p-1.5 sm:p-2 rounded-xl border text-center transition-all {headTires[idx] !== null && headTires[idx]! < MIN_TIRE_DEPTH_MM ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-900 dark:text-rose-200 ring-1 ring-rose-400' : 'bg-surface-container-low border-slate-200 dark:border-slate-800'}">
								<span class="text-[9px] sm:text-[10px] font-bold block text-on-surface-variant">#{idx + 1}</span>
								<input 
									type="number" 
									step="0.1" 
									min="0" 
									max="30" 
									placeholder="mm"
									bind:value={headTires[idx]}
									class="w-full text-xs font-mono font-bold text-center bg-transparent outline-none mt-0.5"
								/>
							</div>
						{/each}
					</div>
				</div>

				<!-- Ban Trailer (Hanya untuk TR & BULK, 12 Ban) -->
				{#if selectedUnitType !== 'DT'}
					<div class="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
						<div class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center justify-between">
							<span class="flex items-center gap-1.5">
								<span class="material-symbols-outlined text-primary text-[15px]">rv_hookup</span>
								2. Ban Gandengan / Trailer (12 Ban):
							</span>
							<span class="text-[10px] text-on-surface-variant font-mono">Min. 1.0 mm</span>
						</div>
						<div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
							{#each Array(12) as _, idx}
								<div class="p-1.5 sm:p-2 rounded-xl border text-center transition-all {trailerTires[idx] !== null && trailerTires[idx]! < MIN_TIRE_DEPTH_MM ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-900 dark:text-rose-200 ring-1 ring-rose-400' : 'bg-surface-container-low border-slate-200 dark:border-slate-800'}">
									<span class="text-[9px] sm:text-[10px] font-bold block text-on-surface-variant">Trl #{idx + 1}</span>
									<input 
										type="number" 
										step="0.1" 
										min="0" 
										max="30" 
										placeholder="mm"
										bind:value={trailerTires[idx]}
										class="w-full text-xs font-mono font-bold text-center bg-transparent outline-none mt-0.5"
									/>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Ban Serep -->
				<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
					<div class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
						<span class="material-symbols-outlined text-primary text-[15px]">change_circle</span>
						Ban Cadangan (Serep):
					</div>
					<div class="w-32 p-1.5 sm:p-2 rounded-xl border text-center {spareTire !== null && spareTire < MIN_TIRE_DEPTH_MM ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-900 dark:text-rose-200' : 'bg-surface-container-low border-slate-200 dark:border-slate-800'}">
						<input 
							type="number" 
							step="0.1" 
							min="0" 
							max="30" 
							placeholder="mm serep"
							bind:value={spareTire}
							class="w-full text-xs font-mono font-bold text-center bg-transparent outline-none"
						/>
					</div>
					<span class="text-[11px] text-on-surface-variant">Isi ketebalan ban cadangan unit.</span>
				</div>
			</div>
		</div>

		<!-- ========================================================================= -->
		<!-- SECTION 3: Pemeriksaan Kesehatan Driver (Langkah 3)                       -->
		<!-- ========================================================================= -->
		<div class={currentStep === 3 ? 'space-y-4' : 'hidden'}>
			<div class="p-4 sm:p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 dark:border-slate-800 pb-3">
					<div>
						<h2 class="text-xs sm:text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
							<span class="material-symbols-outlined text-rose-500 text-[18px]">ecg_heart</span>
							Pemeriksaan Tekanan Darah & Tes Alkohol Pengemudi
						</h2>
						<p class="text-[11px] text-on-surface-variant mt-0.5">
							Standar batas alkohol: <b>&lt; 0.01 BAC</b>. Pengemudi harus dinyatakan fit untuk mengemudikan armada.
						</p>
					</div>
					<div class="flex items-center gap-2 self-start sm:self-auto">
						<button 
							type="button"
							onclick={() => driverFit = !driverFit}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 {driverFit ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'}"
						>
							<span class="material-symbols-outlined text-[14px]">{driverFit ? 'check' : 'close'}</span>
							<span>{driverFit ? 'FIT TO WORK' : 'UNFIT (TIDAK FIT)'}</span>
						</button>
					</div>
				</div>

				<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<div>
						<label for="systolic" class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Systolik (mmHg)</label>
						<input 
							id="systolic"
							type="number" 
							bind:value={systolic} 
							placeholder="120" 
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
						/>
					</div>
					<div>
						<label for="diastolic" class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Diastolik (mmHg)</label>
						<input 
							id="diastolic"
							type="number" 
							bind:value={diastolic} 
							placeholder="80" 
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
						/>
					</div>
					<div>
						<label for="pulse" class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Pulse (x/mnt)</label>
						<input 
							id="pulse"
							type="number" 
							bind:value={pulse} 
							placeholder="75" 
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
						/>
					</div>
					<div>
						<label for="alcohol_val" class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Tes Alkohol (BAC)</label>
						<input 
							id="alcohol_val"
							type="number" 
							step="0.01" 
							bind:value={alcoholVal} 
							placeholder="0.00" 
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none {alcoholVal !== null && alcoholVal >= 0.01 ? 'border-rose-500 text-rose-600 font-bold bg-rose-50/50' : 'focus:ring-2 focus:ring-primary/20 focus:border-primary'}"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label for="measurement_time" class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Jam Pengukuran Medis</label>
						<input 
							id="measurement_time"
							type="time" 
							bind:value={measurementTime} 
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none"
						/>
					</div>
					<div>
						<label for="health_notes" class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Catatan Keluhan Medis Driver</label>
						<input 
							id="health_notes"
							type="text" 
							bind:value={healthNotes} 
							placeholder="Keluhan medis atau aman..." 
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none"
						/>
					</div>
				</div>

				<!-- Rujukan Usia Tekanan Darah -->
				<div class="p-3 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5">
					<span class="font-bold text-on-surface flex items-center gap-1.5">
						<span class="material-symbols-outlined text-[15px] text-primary">info</span>
						Batas Normal Tekanan Darah Berdasarkan Usia:
					</span>
					<div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-on-surface-variant">
						{#each BLOOD_PRESSURE_REFERENCE as ref}
							<div class="p-1.5 rounded-lg bg-surface-container border border-slate-200/50 dark:border-slate-800/50">
								<b class="text-on-surface text-[10px]">{ref.ageRange}</b>
								<div class="font-mono text-[10px]">Sys: {ref.systolic}</div>
								<div class="font-mono text-[10px]">Dia: {ref.diastolic}</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- ========================================================================= -->
		<!-- SECTION 4: Checklist Pemeriksaan Fisik Lengkap (Langkah 4)                -->
		<!-- ========================================================================= -->
		<div class={currentStep === 4 ? 'space-y-4' : 'hidden'}>
			<div class="p-4 sm:p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-3">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
					<div>
						<h2 class="text-xs sm:text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
							<span class="material-symbols-outlined text-primary text-[18px]">checklist</span>
							Checklist Fisik ({checklistItems.length} Item)
						</h2>
						<p class="text-[11px] text-on-surface-variant mt-0.5">
							Tandai <b>OK</b> jika kondisi baik / normal, atau <b>NOT OK</b> jika ada cacat.
						</p>
					</div>

					<div class="flex flex-wrap items-center gap-1.5">
						<button 
							type="button" 
							onclick={expandAllCategories}
							class="px-2 py-1 rounded-lg bg-surface-container text-on-surface text-[11px] font-bold hover:bg-surface-container-high transition-colors"
						>
							Buka Semua
						</button>
						<button 
							type="button" 
							onclick={collapseAllCategories}
							class="px-2 py-1 rounded-lg bg-surface-container text-on-surface text-[11px] font-bold hover:bg-surface-container-high transition-colors"
						>
							Tutup Semua
						</button>
						<button 
							type="button" 
							onclick={() => setAllStatus('OK')}
							class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 transition-colors"
						>
							Set Semua OK
						</button>
						<button 
							type="button" 
							onclick={() => setAllStatus('NOT_OK')}
							class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 text-[11px] font-bold hover:bg-rose-100 transition-colors"
						>
							Set Semua Not OK
						</button>
					</div>
				</div>

				<!-- Accordion Group by Category -->
				<div class="space-y-2.5">
					{#each Object.entries(groupedChecklist) as [category, items]}
						{@const isExpanded = expandedCategories[category] ?? true}
						{@const okCount = items.filter(i => i.status === 'OK').length}
						{@const notOkCount = items.length - okCount}

						<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-surface-container-low">
							<!-- Category Header with Accordion Toggle -->
							<button 
								type="button"
								onclick={() => toggleCategory(category)}
								class="w-full p-2.5 sm:p-3 bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-between text-left"
							>
								<div class="flex items-center gap-2 font-black text-xs text-on-surface uppercase tracking-wider">
									<span class="material-symbols-outlined text-[16px] text-primary transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}">
										expand_more
									</span>
									<span>{category}</span>
								</div>

								<div class="flex items-center gap-2">
									{#if notOkCount > 0}
										<span class="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200 border border-rose-300">
											{notOkCount} Cacat
										</span>
									{/if}
									<span class="text-[10px] sm:text-[11px] text-on-surface-variant font-mono font-bold">
										{okCount}/{items.length} OK
									</span>
								</div>
							</button>

							<!-- Category Content List -->
							{#if isExpanded}
								<div class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
									{#each items as item}
										<div class="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors {item.status === 'NOT_OK' ? 'bg-rose-50/40 dark:bg-rose-950/20' : 'hover:bg-surface-container/50'}">
											<div class="space-y-0.5 flex-1">
												<div class="flex items-center gap-1.5 text-xs">
													{#if item.code}
														<span class="font-mono font-bold text-on-surface-variant bg-surface-container px-1 py-0.5 rounded text-[10px]">[{item.code}]</span>
													{/if}
													<span class="font-bold text-on-surface">{item.name}</span>
												</div>
												{#if item.status === 'NOT_OK'}
													<input 
														type="text" 
														placeholder="Catatan kerusakan..." 
														bind:value={item.remark}
														class="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 outline-none mt-1 focus:ring-1 focus:ring-rose-400"
													/>
												{/if}
											</div>

											<!-- Action OK / NOT OK Buttons -->
											<div class="inline-flex rounded-xl p-0.5 bg-surface-container border border-slate-200 dark:border-slate-800 shrink-0 self-end sm:self-center">
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
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- ========================================================================= -->
		<!-- SECTION 5: Kesimpulan, Status Rekomendasi & Ringkasan Akhir (Langkah 5)   -->
		<!-- ========================================================================= -->
		<div class={currentStep === 5 ? 'space-y-4' : 'hidden'}>
			<div class="p-4 sm:p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 dark:border-slate-800 pb-3">
					<div>
						<h2 class="text-xs sm:text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
							<span class="material-symbols-outlined text-primary text-[18px]">fact_check</span>
							Kesimpulan Temuan & Rekomendasi Kelayakan
						</h2>
						<p class="text-[11px] text-on-surface-variant mt-0.5">
							Evaluasi menyeluruh data identitas, ketebalan ban, kesehatan supir, dan temuan fisik.
						</p>
					</div>
					<div class="text-xs font-bold font-mono self-start sm:self-auto">
						Total Cacat: <span class="{defectCount + thinTiresCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}">{defectCount + thinTiresCount} Item</span>
					</div>
				</div>

				<!-- Ringkasan Unit Mini Card -->
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-surface-container-low text-xs border border-slate-200 dark:border-slate-800">
					<div>
						<span class="text-[9px] font-bold text-on-surface-variant block uppercase">Nomor Unit:</span>
						<span class="font-black font-mono text-on-surface">{selectedUnitId || '-'} ({selectedUnitType})</span>
					</div>
					<div>
						<span class="text-[9px] font-bold text-on-surface-variant block uppercase">Pengemudi:</span>
						<span class="font-bold text-on-surface">{drivers.find(d => d.id === selectedDriverId)?.name || selectedDriverId || '-'}</span>
					</div>
					<div>
						<span class="text-[9px] font-bold text-on-surface-variant block uppercase">Waktu:</span>
						<span class="font-mono text-on-surface">{entryTime} s/d {exitTime}</span>
					</div>
					<div>
						<span class="text-[9px] font-bold text-on-surface-variant block uppercase">Petugas:</span>
						<span class="font-bold text-on-surface">{inspectorName}</span>
					</div>
				</div>

				<!-- Rincian Temuan Defect List -->
				{#if defectCount > 0 || thinTiresCount > 0 || !driverFit}
					<div class="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800/80 space-y-2.5">
						<div class="font-black text-xs text-rose-800 dark:text-rose-300 flex items-center gap-1.5 uppercase">
							<span class="material-symbols-outlined text-[16px]">warning</span>
							Daftar Temuan Cacat & Peringatan Kelayakan:
						</div>

						<ul class="space-y-1.5 text-xs text-rose-900 dark:text-rose-200 divide-y divide-rose-200 dark:divide-rose-900/50">
							{#if !driverFit}
								<li class="pt-1 flex items-start gap-2">
									<span class="material-symbols-outlined text-[15px] text-rose-500 shrink-0">emergency</span>
									<span><b>Kondisi Driver Unfit:</b> Tes Alkohol BAC = {alcoholVal ?? 0} atau tekanan darah abnormal.</span>
								</li>
							{/if}

							{#each thinTires as tire}
								<li class="pt-1 flex items-start gap-2">
									<span class="material-symbols-outlined text-[15px] text-rose-500 shrink-0">tire_repair</span>
									<span><b>Ban Tipis:</b> {tire.position} kedalaman {tire.depth} mm (&lt; 1.0 mm).</span>
								</li>
							{/each}

							{#each defectItems as item}
								<li class="pt-1 flex items-start gap-2">
									<span class="material-symbols-outlined text-[15px] text-rose-500 shrink-0">cancel</span>
									<div>
										<b>[{item.category}] {item.name}:</b>
										<span class="italic text-rose-800 dark:text-rose-300">{item.remark || 'Tidak ada catatan temuan'}</span>
									</div>
								</li>
							{/each}
						</ul>
					</div>
				{:else}
					<div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
						<span class="material-symbols-outlined text-emerald-600 text-xl">verified</span>
						<div>
							<div class="font-black uppercase">Seluruh Komponen Lulus Inspeksi!</div>
							<div class="text-on-surface-variant text-[11px] mt-0.5">Tidak ditemukan cacat fisik, ban &ge; 1.0 mm, dan supir dalam kondisi prima.</div>
						</div>
					</div>
				{/if}

				<!-- 3 Status Recommendation Buttons -->
				<div class="space-y-2 pt-1">
					<span class="block text-xs font-bold text-on-surface uppercase tracking-wider">
						Rekomendasi Kelayakan Operasional:
					</span>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
						<button 
							type="button" 
							onclick={() => userRecommendation = 'LAYAK'}
							class="p-3 sm:p-3.5 rounded-xl border text-left transition-all {userRecommendation === 'LAYAK' ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30' : 'bg-surface-container-low border-slate-200 dark:border-slate-800 hover:border-slate-300'}"
						>
							<div class="flex items-center gap-1.5 font-black text-xs text-emerald-700 dark:text-emerald-300 uppercase">
								<span class="material-symbols-outlined text-[16px]">verified</span>
								LAYAK BEROPERASI
							</div>
							<p class="text-[10px] text-on-surface-variant mt-1">
								Kondisi fisik aman, ban standar, dan supir prima. Siap bertugas (STANDBY).
							</p>
						</button>

						<button 
							type="button" 
							onclick={() => userRecommendation = 'LAYAK_DENGAN_CATATAN'}
							class="p-3 sm:p-3.5 rounded-xl border text-left transition-all {userRecommendation === 'LAYAK_DENGAN_CATATAN' ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30' : 'bg-surface-container-low border-slate-200 dark:border-slate-800 hover:border-slate-300'}"
						>
							<div class="flex items-center gap-1.5 font-black text-xs text-amber-700 dark:text-amber-300 uppercase">
								<span class="material-symbols-outlined text-[16px]">rule</span>
								LAYAK DENGAN CATATAN
							</div>
							<p class="text-[10px] text-on-surface-variant mt-1">
								Catatan minor (APD/kebersihan/surat). Unit boleh jalan, tanpa SPK bengkel.
							</p>
						</button>

						<button 
							type="button" 
							onclick={() => userRecommendation = 'TIDAK_LAYAK'}
							class="p-3 sm:p-3.5 rounded-xl border text-left transition-all {userRecommendation === 'TIDAK_LAYAK' ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30' : 'bg-surface-container-low border-slate-200 dark:border-slate-800 hover:border-slate-300'}"
						>
							<div class="flex items-center gap-1.5 font-black text-xs text-rose-700 dark:text-rose-300 uppercase">
								<span class="material-symbols-outlined text-[16px]">report_problem</span>
								TIDAK LAYAK BEROPERASI
							</div>
							<p class="text-[10px] text-on-surface-variant mt-1">
								Cacat rem/ban/mesin. Otomatis terbit tiket SPK Work Order & unit MAINTENANCE.
							</p>
						</button>
					</div>
				</div>

				<!-- Catatan Tambahan Inspektor -->
				<div>
					<label for="general_notes" class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Catatan Tambahan Inspektor</label>
					<textarea 
						id="general_notes"
						name="notes" 
						bind:value={generalNotes} 
						rows="2"
						placeholder="Catatan inspeksi umum atau arahan bengkel..."
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					></textarea>
				</div>
			</div>
		</div>

		<!-- ========================================================================= -->
		<!-- INLINE NAVIGATION BAR (Langsung di bawah card formulir, bukan sticky)      -->
		<!-- ========================================================================= -->
		<div class="p-3.5 sm:p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between gap-3">
			<!-- Tombol Sebelumnya -->
			<button 
				type="button" 
				onclick={prevStep}
				disabled={currentStep === 1}
				class="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-surface-container text-on-surface font-bold text-xs hover:bg-surface-container-high transition-all flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none"
			>
				<span class="material-symbols-outlined text-[16px]">chevron_left</span>
				<span>Sebelumnya</span>
			</button>

			<!-- Indikator Tengah -->
			<div class="text-center">
				<div class="text-xs font-black text-on-surface">
					Langkah {currentStep} / 5
				</div>
				{#if defectCount + thinTiresCount > 0}
					<div class="text-[10px] font-bold text-rose-600 dark:text-rose-400">
						{defectCount + thinTiresCount} Cacat
					</div>
				{/if}
			</div>

			<!-- Tombol Lanjut / Simpan -->
			{#if currentStep < 5}
				<button 
					type="button" 
					onclick={nextStep}
					class="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-primary hover:opacity-95 text-on-primary font-bold text-xs shadow-md transition-all flex items-center gap-1"
				>
					<span>Lanjut</span>
					<span class="material-symbols-outlined text-[16px]">chevron_right</span>
				</button>
			{:else}
				<button 
					type="submit" 
					disabled={isSubmitting || !selectedUnitId}
					class="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-primary hover:opacity-95 text-on-primary font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
				>
					<span class="material-symbols-outlined text-[16px]">save</span>
					<span>{isSubmitting ? 'Menyimpan...' : 'Simpan P2H'}</span>
				</button>
			{/if}
		</div>
	</form>
</div>
