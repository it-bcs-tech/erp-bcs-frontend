<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { DT_CHECKLIST_TEMPLATE } from '$lib/data/maintenance-checklists';

	let { data, form }: { data: PageData; form: any } = $props();

	let currentStep = $state(1); // 1: Unit & Driver, 2: Checklist, 3: Ban, 4: Ringkasan

	// Step 1: Unit & Driver
	let unitSearch = $state('');
	let selectedUnitId = $state('');
	let selectedUnit = $derived(data.units.find(u => u.noUnit === selectedUnitId));
	let selectedDriverId = $state('');
	let kenekName = $state('');
	let odometer = $state('');
	let inspectionType = $state('KEBERANGKATAN');
	let noApar = $state('ADA_OK');
	let destination = $state('');

	let filteredUnits = $derived(
		data.units.filter(u => !unitSearch.trim() || u.noUnit.toLowerCase().includes(unitSearch.toLowerCase()))
	);

	function selectUnit(u: any) {
		selectedUnitId = u.noUnit;
		unitSearch = u.noUnit;
		if (u.driverId) {
			selectedDriverId = u.driverId;
		}
	}

	// Step 2: 70 Checklists
	interface MobileCheckItem {
		id: string;
		code: string;
		category: string;
		name: string;
		status: 'OK' | 'NOT_OK';
		remark: string;
	}

	let checklistItems = $state<MobileCheckItem[]>(
		DT_CHECKLIST_TEMPLATE.map(t => ({
			id: t.id,
			code: t.code || '',
			category: t.category,
			name: t.name,
			status: 'OK',
			remark: ''
		}))
	);

	// Group checklist items by category
	let categories = $derived.by(() => {
		const groups: { [cat: string]: MobileCheckItem[] } = {};
		checklistItems.forEach(item => {
			if (!groups[item.category]) groups[item.category] = [];
			groups[item.category].push(item);
		});
		return Object.entries(groups).map(([name, items]) => ({ name, items }));
	});

	function markCategoryAllOk(catName: string) {
		checklistItems = checklistItems.map(item => {
			if (item.category === catName) {
				return { ...item, status: 'OK', remark: '' };
			}
			return item;
		});
	}

	function setItemStatus(id: string, status: 'OK' | 'NOT_OK') {
		checklistItems = checklistItems.map(item => {
			if (item.id === id) {
				return { ...item, status };
			}
			return item;
		});
	}

	// Step 3: Tire Depths
	let tireDepths = $state<{ [pos: string]: number | string }>({
		'head_1_fl': '',
		'head_1_fr': '',
		'head_2_rl_out': '',
		'head_2_rl_in': '',
		'head_2_rr_out': '',
		'head_2_rr_in': '',
		'head_3_rl_out': '',
		'head_3_rl_in': '',
		'head_3_rr_out': '',
		'head_3_rr_in': '',
		'spare_1': ''
	});

	let thinTiresCount = $derived(
		Object.values(tireDepths).filter(v => {
			const n = parseFloat(String(v));
			return !isNaN(n) && n > 0 && n < 1.0;
		}).length
	);

	// Step 4: Summary & Evaluation
	let defectItems = $derived(checklistItems.filter(i => i.status === 'NOT_OK'));
	let defectCount = $derived(defectItems.length);
	let isPass = $derived(defectCount === 0 && thinTiresCount === 0);
	let generalNotes = $state('');

	let isSubmitting = $state(false);

	// Navigation validation
	function goToStep(s: number) {
		if (s === 2 && (!selectedUnitId || !selectedDriverId)) {
			alert('Pilih nomor unit dan pengemudi terlebih dahulu.');
			return;
		}
		currentStep = s;
		if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<div class="p-4 space-y-4">
	
	<!-- Top Step Wizard Header -->
	<div class="p-3.5 rounded-2xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 space-y-2">
		<div class="flex items-center justify-between text-xs font-black text-on-surface">
			<span>Langkah {currentStep} dari 4</span>
			<span class="text-primary">
				{#if currentStep === 1}Data Unit & Driver
				{:else if currentStep === 2}Pemeriksaan Fisik
				{:else if currentStep === 3}Kondisi Ban
				{:else}Ringkasan & Terbitkan{/if}
			</span>
		</div>

		<!-- Progress Bar -->
		<div class="w-full h-2 rounded-full bg-surface-container overflow-hidden flex">
			<div 
				class="h-full bg-primary transition-all duration-300"
				style="width: {currentStep * 25}%"
			></div>
		</div>

		<!-- Quick Step Dots -->
		<div class="grid grid-cols-4 gap-1 pt-1 text-[10px] font-bold text-center">
			<button type="button" onclick={() => goToStep(1)} class="p-1 rounded-lg transition-colors {currentStep === 1 ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'}">
				1. Unit
			</button>
			<button type="button" onclick={() => goToStep(2)} class="p-1 rounded-lg transition-colors {currentStep === 2 ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'}">
				2. Fisik
			</button>
			<button type="button" onclick={() => goToStep(3)} class="p-1 rounded-lg transition-colors {currentStep === 3 ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'}">
				3. Ban
			</button>
			<button type="button" onclick={() => goToStep(4)} class="p-1 rounded-lg transition-colors {currentStep === 4 ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'}">
				4. Review
			</button>
		</div>
	</div>

	{#if form?.message}
		<div class="p-4 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-2">
			<span class="material-symbols-outlined text-[18px]">error</span>
			{form.message}
		</div>
	{/if}

	<!-- FORM CONTAINER -->
	<form method="POST" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			isSubmitting = false;
			await update();
		};
	}} class="space-y-4">

		<input type="hidden" name="unit_id" value={selectedUnitId} />
		<input type="hidden" name="driver_id" value={selectedDriverId} />
		<input type="hidden" name="kenek_name" value={kenekName} />
		<input type="hidden" name="odometer" value={odometer} />
		<input type="hidden" name="inspection_type" value={inspectionType} />
		<input type="hidden" name="no_apar" value={noApar} />
		<input type="hidden" name="destination" value={destination} />
		<input type="hidden" name="notes" value={generalNotes} />
		<input type="hidden" name="checklist_data" value={JSON.stringify(checklistItems)} />
		<input type="hidden" name="tire_depth_data" value={JSON.stringify(tireDepths)} />

		<!-- ================= STEP 1: UNIT & DRIVER ================= -->
		{#if currentStep === 1}
			<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 space-y-4">
				<div class="border-b border-slate-200/70 dark:border-slate-800/70 pb-3">
					<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-[20px]">directions_bus</span>
						Identitas Armada & Pengemudi
					</h2>
					<p class="text-xs text-on-surface-variant mt-0.5">Pilih unit armada yang akan diperiksa di pool.</p>
				</div>

				<!-- Unit Selection -->
				<div class="space-y-1.5">
					<label for="p2h_unit" class="block text-xs font-bold text-on-surface-variant uppercase">Pilih Nomor Unit *</label>
					<div class="relative">
						<input 
							id="p2h_unit"
							type="text" 
							bind:value={unitSearch}
							placeholder="Ketik nomor unit (cth: A9047R)..." 
							class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
						/>
						<span class="material-symbols-outlined absolute left-2.5 top-2.5 text-on-surface-variant text-[18px]">search</span>
					</div>

					<!-- Quick selection chips -->
					{#if unitSearch && !selectedUnit}
						<div class="max-h-40 overflow-y-auto divide-y divide-slate-200/50 dark:divide-slate-800/50 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800">
							{#each filteredUnits.slice(0, 10) as u}
								<button 
									type="button" 
									onclick={() => selectUnit(u)}
									class="w-full p-2.5 text-left text-xs hover:bg-surface-container-high transition-colors flex items-center justify-between"
								>
									<span class="font-mono font-bold text-on-surface">{u.noUnit}</span>
									<span class="text-[10px] text-on-surface-variant">{u.type} {u.driverName ? `• ${u.driverName}` : ''}</span>
								</button>
							{/each}
						</div>
					{/if}

					{#if selectedUnit}
						<div class="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="material-symbols-outlined text-primary text-[20px]">check_circle</span>
								<div>
									<div class="font-mono font-black text-sm text-on-surface">{selectedUnit.noUnit}</div>
									<div class="text-[10px] text-on-surface-variant">Tipe: {selectedUnit.type} {selectedUnit.year ? `• Th ${selectedUnit.year}` : ''}</div>
								</div>
							</div>
							<button type="button" onclick={() => { selectedUnitId = ''; unitSearch = ''; }} class="text-[10px] text-primary font-bold hover:underline">Ganti Unit</button>
						</div>
					{/if}
				</div>

				<!-- Driver Selection -->
				<div class="space-y-1.5">
					<label for="p2h_driver" class="block text-xs font-bold text-on-surface-variant uppercase">Nama Pengemudi (Driver) *</label>
					<select 
						id="p2h_driver"
						bind:value={selectedDriverId}
						class="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none"
					>
						<option value="">-- Pilih Pengemudi --</option>
						{#each data.drivers as d}
							<option value={d.id}>{d.name} ({d.id})</option>
						{/each}
					</select>
				</div>

				<!-- Kenek / Co-Driver -->
				<div class="space-y-1.5">
					<label for="p2h_kenek" class="block text-xs font-bold text-on-surface-variant uppercase">Nama Kenek (Opsional)</label>
					<input 
						id="p2h_kenek"
						type="text" 
						bind:value={kenekName}
						placeholder="Nama kenek bila ada..."
						class="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none"
					/>
				</div>

				<!-- Odometer & Tipe -->
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1.5">
						<label for="p2h_odo" class="block text-xs font-bold text-on-surface-variant uppercase">Kilometer (Odo) *</label>
						<input 
							id="p2h_odo"
							type="number" 
							bind:value={odometer}
							placeholder="Contoh: 145000"
							class="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="p2h_apar" class="block text-xs font-bold text-on-surface-variant uppercase">Status APAR</label>
						<select 
							id="p2h_apar"
							bind:value={noApar}
							class="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none"
						>
							<option value="ADA_OK">Ada & Bertekanan</option>
							<option value="EXPIRED">Perlu Isi Ulang / Expired</option>
							<option value="TIDAK_ADA">Tidak Ada APAR</option>
						</select>
					</div>
				</div>

				<!-- Inspection Type Radio Pills -->
				<div class="space-y-1.5">
					<span class="block text-xs font-bold text-on-surface-variant uppercase">Jenis Pemeriksaan</span>
					<div class="grid grid-cols-3 gap-2">
						{#each ['KEBERANGKATAN', 'KEPULANGAN', 'P2H_RUTIN'] as type}
							<button 
								type="button" 
								onclick={() => inspectionType = type}
								class="py-2 px-1 text-center rounded-xl text-[11px] font-bold border transition-all {inspectionType === type ? 'bg-primary text-on-primary border-primary shadow-xs' : 'bg-surface-container text-on-surface-variant border-transparent'}"
							>
								{type === 'KEBERANGKATAN' ? 'Berangkat' : type === 'KEPULANGAN' ? 'Pulang' : 'Rutin'}
							</button>
						{/each}
					</div>
				</div>

				<!-- Step 1 Button -->
				<div class="pt-2">
					<button 
						type="button" 
						onclick={() => goToStep(2)}
						disabled={!selectedUnitId || !selectedDriverId}
						class="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
					>
						<span>Lanjut ke Checklist Fisik (70 Item)</span>
						<span class="material-symbols-outlined text-[18px]">arrow_forward</span>
					</button>
				</div>
			</div>
		{/if}

		<!-- ================= STEP 2: CHECKLIST FISIK ================= -->
		{#if currentStep === 2}
			<div class="space-y-4">
				
				<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
					<div>
						<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5">
							<span class="material-symbols-outlined text-primary text-[20px]">checklist</span>
							Pemeriksaan Fisik ({checklistItems.length} Item)
						</h2>
						<p class="text-xs text-on-surface-variant mt-0.5">Ketuk tombol per kategori untuk mempercepat pengisian.</p>
					</div>
					<div class="text-right">
						<span class="px-2 py-0.5 rounded text-[11px] font-mono font-black {defectCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">
							{defectCount} Defect
						</span>
					</div>
				</div>

				<!-- Accordion / Category Cards -->
				<div class="space-y-4">
					{#each categories as cat}
						{@const catDefects = cat.items.filter(i => i.status === 'NOT_OK').length}
						<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-2xs">
							
							<!-- Category Header with Bulk OK Button -->
							<div class="p-3.5 bg-surface-container-low border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2">
								<div>
									<h3 class="text-xs font-black text-on-surface uppercase tracking-wider">{cat.name}</h3>
									<span class="text-[10px] text-on-surface-variant">{cat.items.length} item diperiksa {catDefects > 0 ? `• ${catDefects} NOT OK` : ''}</span>
								</div>

								<button 
									type="button" 
									onclick={() => markCategoryAllOk(cat.name)}
									class="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95"
									title="Tandai seluruh item di kategori ini OK"
								>
									<span class="material-symbols-outlined text-[14px]">done_all</span>
									<span>Semua OK</span>
								</button>
							</div>

							<!-- Items List -->
							<div class="p-3 divide-y divide-slate-200/50 dark:divide-slate-800/50 space-y-2">
								{#each cat.items as item}
									<div class="pt-2 first:pt-0 space-y-2">
										<div class="flex items-center justify-between gap-2">
											<div class="space-y-0.5 flex-1 pr-2">
												<div class="flex items-center gap-1.5">
													{#if item.code}
														<span class="font-mono text-[10px] font-bold text-on-surface-variant bg-surface-container px-1 rounded">{item.code}</span>
													{/if}
													<span class="text-xs font-bold text-on-surface leading-tight">{item.name}</span>
												</div>
											</div>

											<!-- OK / NOT OK Buttons -->
											<div class="flex items-center gap-1 shrink-0">
												<button 
													type="button" 
													onclick={() => setItemStatus(item.id, 'OK')}
													class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-0.5 {item.status === 'OK' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
												>
													<span class="material-symbols-outlined text-[15px]">check</span>
													<span>OK</span>
												</button>

												<button 
													type="button" 
													onclick={() => setItemStatus(item.id, 'NOT_OK')}
													class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-0.5 {item.status === 'NOT_OK' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
												>
													<span class="material-symbols-outlined text-[15px]">close</span>
													<span>NOT OK</span>
												</button>
											</div>
										</div>

										<!-- Remark input if NOT OK -->
										{#if item.status === 'NOT_OK'}
											<div class="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 space-y-1">
												<label for="cat_{item.id}" class="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase">Catatan Kerusakan *</label>
												<input 
													id="cat_{item.id}"
													type="text" 
													bind:value={item.remark}
													required
													placeholder="Jelaskan kondisi kerusakan / gejala..."
													class="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-rose-300 dark:border-rose-800 text-xs text-on-surface outline-none"
												/>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>

				<!-- Navigation Buttons -->
				<div class="flex items-center gap-3 pt-2">
					<button 
						type="button" 
						onclick={() => goToStep(1)}
						class="w-1/3 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs transition-all"
					>
						Kembali
					</button>
					<button 
						type="button" 
						onclick={() => goToStep(3)}
						class="w-2/3 py-3 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
					>
						<span>Lanjut ke Pengukuran Ban</span>
						<span class="material-symbols-outlined text-[18px]">arrow_forward</span>
					</button>
				</div>
			</div>
		{/if}

		<!-- ================= STEP 3: UKUR BAN ================= -->
		{#if currentStep === 3}
			<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 space-y-4">
				<div class="border-b border-slate-200/70 dark:border-slate-800/70 pb-3">
					<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-[20px]">tire_repair</span>
						Pengukuran Ketebalan Tapak Ban (mm)
					</h2>
					<p class="text-xs text-on-surface-variant mt-0.5">Masukkan ketebalan tapak ban armada. Batas aman minimal 1.0 mm.</p>
				</div>

				{#if thinTiresCount > 0}
					<div class="p-3 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 border border-rose-300 text-xs font-bold flex items-center gap-2">
						<span class="material-symbols-outlined text-[18px]">warning</span>
						<span>Terdeteksi {thinTiresCount} ban tipis di bawah 1.0 mm (Wajib diganti).</span>
					</div>
				{/if}

				<!-- Axle 1: Depan -->
				<div class="p-3.5 rounded-xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70 space-y-2">
					<span class="text-xs font-black text-on-surface uppercase tracking-wider">Axle 1 (Roda Depan Head)</span>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="head_1_fl" class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Depan Kiri (FL)</label>
							<input id="head_1_fl" type="number" step="0.1" bind:value={tireDepths['head_1_fl']} placeholder="mm" class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-on-surface" />
						</div>
						<div>
							<label for="head_1_fr" class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Depan Kanan (FR)</label>
							<input id="head_1_fr" type="number" step="0.1" bind:value={tireDepths['head_1_fr']} placeholder="mm" class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-on-surface" />
						</div>
					</div>
				</div>

				<!-- Axle 2: Belakang -->
				<div class="p-3.5 rounded-xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70 space-y-2">
					<span class="text-xs font-black text-on-surface uppercase tracking-wider">Axle 2 (Roda Belakang Head)</span>
					<div class="grid grid-cols-2 gap-3">
						<div class="space-y-2">
							<span class="text-[10px] font-bold text-on-surface-variant uppercase">Sisi Kiri (RL)</span>
							<input type="number" step="0.1" bind:value={tireDepths['head_2_rl_out']} placeholder="Luar (mm)" class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface" />
							<input type="number" step="0.1" bind:value={tireDepths['head_2_rl_in']} placeholder="Dalam (mm)" class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface" />
						</div>
						<div class="space-y-2">
							<span class="text-[10px] font-bold text-on-surface-variant uppercase">Sisi Kanan (RR)</span>
							<input type="number" step="0.1" bind:value={tireDepths['head_2_rr_out']} placeholder="Luar (mm)" class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface" />
							<input type="number" step="0.1" bind:value={tireDepths['head_2_rr_in']} placeholder="Dalam (mm)" class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface" />
						</div>
					</div>
				</div>

				<!-- Ban Serep -->
				<div class="p-3.5 rounded-xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70 space-y-2">
					<span class="text-xs font-black text-on-surface uppercase tracking-wider">Ban Serep / Cadangan</span>
					<div>
						<label for="spare_1" class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Ketebalan Ban Serep (mm)</label>
						<input id="spare_1" type="number" step="0.1" bind:value={tireDepths['spare_1']} placeholder="mm" class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface" />
					</div>
				</div>

				<!-- Navigation Buttons -->
				<div class="flex items-center gap-3 pt-2">
					<button 
						type="button" 
						onclick={() => goToStep(2)}
						class="w-1/3 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs transition-all"
					>
						Kembali
					</button>
					<button 
						type="button" 
						onclick={() => goToStep(4)}
						class="w-2/3 py-3 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
					>
						<span>Lanjut ke Review & Simpan</span>
						<span class="material-symbols-outlined text-[18px]">arrow_forward</span>
					</button>
				</div>
			</div>
		{/if}

		<!-- ================= STEP 4: RINGKASAN & SUBMIT ================= -->
		{#if currentStep === 4}
			<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 space-y-4">
				<div class="border-b border-slate-200/70 dark:border-slate-800/70 pb-3">
					<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-[20px]">verified</span>
						Ringkasan & Terbitkan Hasil P2H
					</h2>
					<p class="text-xs text-on-surface-variant mt-0.5">Tinjau kesimpulan pemeriksaan sebelum mengirim ke sistem.</p>
				</div>

				<!-- Conclusion Banner -->
				<div class="p-4 rounded-xl border-2 {isPass ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-100' : 'bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-100'} space-y-1">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-2xl {isPass ? 'text-emerald-600' : 'text-rose-600'}">
							{isPass ? 'check_circle' : 'warning'}
						</span>
						<span class="text-sm font-black uppercase tracking-wider">
							{isPass ? 'Status: LAYAK OPERASI' : 'Status: TIDAK LAYAK (Wajib SPK Bengkel)'}
						</span>
					</div>
					<p class="text-xs text-on-surface-variant">
						{isPass 
							? 'Seluruh 70 item pemeriksaan fisik & kondisi ban dinyatakan aman beroperasi.' 
							: `Ditemukan ${defectCount} item cacat / kerusakan fisik dan ${thinTiresCount} ban tipis. Unit wajib diperbaiki sebelum jalan.`}
					</p>
				</div>

				<!-- Defect List Summary if any -->
				{#if defectItems.length > 0}
					<div class="space-y-2">
						<span class="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
							Daftar Kerusakan / Temuan ({defectItems.length}):
						</span>
						<div class="divide-y divide-slate-200/60 dark:divide-slate-800/60 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 p-2">
							{#each defectItems as d}
								<div class="py-2 first:pt-1 text-xs space-y-0.5">
									<div class="font-bold text-on-surface flex items-center gap-1.5">
										<span class="text-rose-600">•</span>
										<span>{d.name}</span>
										<span class="px-1.5 py-0.2 rounded text-[9px] bg-surface-container text-on-surface-variant">{d.category}</span>
									</div>
									<div class="text-[11px] text-rose-700 dark:text-rose-300 pl-3 italic">
										Catatan: "{d.remark || 'Kondisi Not OK'}"
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Unit Details Card -->
				<div class="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-surface-container-low">
					<div>
						<span class="text-[10px] text-on-surface-variant uppercase font-medium">Nomor Unit:</span>
						<p class="font-mono font-bold text-on-surface">{selectedUnitId}</p>
					</div>
					<div>
						<span class="text-[10px] text-on-surface-variant uppercase font-medium">Pengemudi:</span>
						<p class="font-bold text-on-surface">{data.drivers.find(d => d.id === selectedDriverId)?.name || '-'}</p>
					</div>
					<div>
						<span class="text-[10px] text-on-surface-variant uppercase font-medium">Odometer:</span>
						<p class="font-mono text-on-surface">{odometer ? `${odometer} KM` : '-'}</p>
					</div>
					<div>
						<span class="text-[10px] text-on-surface-variant uppercase font-medium">Inspektor:</span>
						<p class="font-bold text-on-surface">{data.currentInspector.name}</p>
					</div>
				</div>

				<!-- General Notes -->
				<div class="space-y-1">
					<label for="p2h_notes" class="block text-xs font-bold text-on-surface-variant uppercase">Catatan Tambahan Inspektor (Opsional)</label>
					<textarea 
						id="p2h_notes"
						bind:value={generalNotes}
						rows="2"
						placeholder="Catatan umum inspeksi atau kondisi cuaca/pool..."
						class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none"
					></textarea>
				</div>

				<!-- Action Buttons -->
				<div class="flex items-center gap-3 pt-2">
					<button 
						type="button" 
						onclick={() => goToStep(3)}
						class="w-1/3 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs transition-all"
					>
						Kembali
					</button>
					<button 
						type="submit" 
						disabled={isSubmitting}
						class="w-2/3 py-3 rounded-xl {isPass ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
							<span>Menyimpan...</span>
						{:else}
							<span class="material-symbols-outlined text-[18px]">send</span>
							<span>Simpan & Terbitkan P2H</span>
						{/if}
					</button>
				</div>
			</div>
		{/if}

	</form>

</div>
