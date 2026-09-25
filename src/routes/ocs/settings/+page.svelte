<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	// Active tab
	let activeTab = $state<'general' | 'units'>('general');

	// General settings state
	let solarKmPerLiter = $state(data.settings?.solar_km_per_liter ?? 3.0);
	let solarPricePerLiter = $state(data.settings?.solar_price_per_liter ?? 6800);

	// Unit overrides state (mapping unit_id -> ratio string/number)
	let unitOverrides = $state<Record<string, number | ''>>({
		...(data.settings?.solar_ratio_by_unit_type || {})
	});

	// Search filter for unit types
	let unitSearchQuery = $state('');

	// Simulation calculator state
	let testDistance = $state(150);
	let testSelectedUnitId = $state('');

	let isSaving = $state(false);
	let saveMessage = $state('');
	let errorMessage = $state('');

	// Sync local state if data updates
	$effect(() => {
		if (data.settings) {
			solarKmPerLiter = data.settings.solar_km_per_liter ?? 3.0;
			solarPricePerLiter = data.settings.solar_price_per_liter ?? 6800;
			unitOverrides = { ...(data.settings.solar_ratio_by_unit_type || {}) };
		}
	});

	// Toast message handler
	$effect(() => {
		if (form?.message) {
			if (form?.success) {
				saveMessage = form.message;
				errorMessage = '';
			} else {
				errorMessage = form.message;
				saveMessage = '';
			}
			const timer = setTimeout(() => {
				saveMessage = '';
				errorMessage = '';
			}, 4500);
			return () => clearTimeout(timer);
		}
	});

	// Filtered unit types
	let filteredUnits = $derived.by(() => {
		const list = data.tipeUnits || [];
		if (!unitSearchQuery.trim()) return list;
		const q = unitSearchQuery.toLowerCase().trim();
		return list.filter((u: any) => 
			u.nama_tipe?.toLowerCase().includes(q) || 
			String(u.golongan_tol)?.toLowerCase().includes(q)
		);
	});

	// Unit metrics
	let overrideCount = $derived.by(() => {
		return Object.values(unitOverrides).filter((v) => typeof v === 'number' && v > 0).length;
	});

	let totalUnitsCount = $derived(data.tipeUnits?.length || 0);

	// Simulation derived calculation
	let effectiveTestRatio = $derived.by(() => {
		if (testSelectedUnitId && unitOverrides[testSelectedUnitId]) {
			const custom = Number(unitOverrides[testSelectedUnitId]);
			if (custom > 0) return custom;
		}
		return Number(solarKmPerLiter) || 3.0;
	});

	let simulatedLiter = $derived.by(() => {
		if (!testDistance || testDistance <= 0 || effectiveTestRatio <= 0) return 0;
		return Math.round((testDistance / effectiveTestRatio) * 10) / 10;
	});

	let simulatedCost = $derived.by(() => {
		return Math.round(simulatedLiter * (Number(solarPricePerLiter) || 6800));
	});

	function formatCurrency(val: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
	}

	function handleOverrideChange(unitId: string | number, value: string) {
		const strId = String(unitId);
		const num = parseFloat(value);
		if (isNaN(num) || num <= 0) {
			const updated = { ...unitOverrides };
			delete updated[strId];
			unitOverrides = updated;
		} else {
			unitOverrides = {
				...unitOverrides,
				[strId]: Math.round(num * 100) / 100
			};
		}
	}

	function clearOverride(unitId: string | number) {
		const strId = String(unitId);
		const updated = { ...unitOverrides };
		delete updated[strId];
		unitOverrides = updated;
	}

	function clearAllOverrides() {
		if (confirm('Apakah Anda yakin ingin menghapus semua override rasio tipe unit dan kembali menggunakan rasio global?')) {
			unitOverrides = {};
		}
	}
</script>

<svelte:head>
	<title>Pengaturan Modul OCS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Page Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20 shadow-xs">
				<span class="material-symbols-outlined text-2xl">local_gas_station</span>
			</div>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-2xl font-black text-on-surface tracking-tight">Pengaturan Operasional OCS</h1>
					<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
						Operations Control
					</span>
				</div>
				<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
					Konfigurasi acuan rasio konsumsi solar (KM/L), harga acuan solar per liter, dan rasio spesifik per tipe unit armada
				</p>
			</div>
		</div>

		<!-- Toast Feedback Alerts -->
		{#if saveMessage}
			<div class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs font-bold shadow-xs">
				<span class="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
				<span>{saveMessage}</span>
			</div>
		{/if}
		{#if errorMessage}
			<div class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-300 dark:border-rose-800 text-xs font-bold shadow-xs">
				<span class="material-symbols-outlined text-rose-600 text-base">error</span>
				<span>{errorMessage}</span>
			</div>
		{/if}
	</header>

	<!-- Tabs Navigation -->
	<div class="inline-flex p-1.5 rounded-2xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 gap-1 shadow-xs w-fit">
		<button
			type="button"
			onclick={() => activeTab = 'general'}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeTab === 'general'
				? 'bg-sky-600 text-white shadow-xs'
				: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">tune</span>
			<span>Acuan Solar Global</span>
		</button>

		<button
			type="button"
			onclick={() => activeTab = 'units'}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeTab === 'units'
				? 'bg-sky-600 text-white shadow-xs'
				: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">local_shipping</span>
			<span>Rasio per Tipe Unit</span>
			{#if overrideCount > 0}
				<span class="px-1.5 py-0.2 rounded-full text-[10px] {activeTab === 'units' ? 'bg-sky-700 text-sky-100' : 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300'} font-bold">
					{overrideCount}
				</span>
			{/if}
		</button>
	</div>

	<!-- TAB 1: ACUAN SOLAR GLOBAL -->
	{#if activeTab === 'general'}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Form Utama Acuan Solar -->
			<div class="lg:col-span-2 bg-surface-container-low p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
				<div class="border-b border-surface-container/60 pb-4">
					<h2 class="text-base font-bold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-sky-600 text-lg">oil_barrel</span>
						Konfigurasi Nilai Dasar Solar
					</h2>
					<p class="text-xs text-on-surface-variant mt-1">
						Nilai acuan standar yang digunakan untuk mengkalkulasi estimasi liter dan biaya solar pada pembuatan Master Rute & UJO baru.
					</p>
				</div>

				<form
					method="POST"
					action="?/saveGeneral"
					use:enhance={() => {
						isSaving = true;
						return async ({ update }) => {
							await update();
							isSaving = false;
						};
					}}
					class="space-y-5"
				>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
						<!-- Rasio KM/L Default -->
						<div class="space-y-2">
							<label for="solar_km_per_liter" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
								Rasio Standar Konsumsi Solar (KM / Liter) <span class="text-rose-500">*</span>
							</label>
							<div class="relative flex items-center rounded-xl bg-surface border border-slate-200/80 dark:border-slate-800/80 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 px-3 py-2.5 shadow-2xs">
								<span class="material-symbols-outlined text-slate-400 text-lg mr-2">speed</span>
								<input
									id="solar_km_per_liter"
									name="solar_km_per_liter"
									type="number"
									step="0.05"
									min="0.5"
									max="20"
									bind:value={solarKmPerLiter}
									required
									placeholder="Contoh: 3.0"
									class="bg-transparent text-sm font-bold text-on-surface outline-none w-full"
								/>
								<span class="text-xs font-bold text-slate-400 font-mono ml-2">KM/L</span>
							</div>
							<p class="text-[11px] text-on-surface-variant/80">
								Setiap <strong>{solarKmPerLiter || 0} KM</strong> rute diasumsikan menghabiskan <strong>1 Liter</strong> solar jika tipe unit tidak di-override.
							</p>
						</div>

						<!-- Harga Solar Default -->
						<div class="space-y-2">
							<label for="solar_price_per_liter" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
								Harga Acuan Solar per Liter (Rp) <span class="text-rose-500">*</span>
							</label>
							<div class="relative flex items-center rounded-xl bg-surface border border-slate-200/80 dark:border-slate-800/80 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 px-3 py-2.5 shadow-2xs">
								<span class="text-xs font-bold text-slate-400 mr-2 font-mono">Rp</span>
								<input
									id="solar_price_per_liter"
									name="solar_price_per_liter"
									type="number"
									step="50"
									min="1000"
									max="100000"
									bind:value={solarPricePerLiter}
									required
									placeholder="Contoh: 6800"
									class="bg-transparent text-sm font-bold text-on-surface outline-none w-full"
								/>
								<span class="text-xs font-bold text-slate-400 font-mono ml-2">/ Liter</span>
							</div>
							<p class="text-[11px] text-on-surface-variant/80">
								Harga acuan resmi (contoh Biosolar B35 nasional: <strong>Rp 6.800</strong> per liter).
							</p>
						</div>
					</div>

					<!-- Tombol Simpan -->
					<div class="pt-4 border-t border-surface-container/60 flex items-center justify-between">
						<div class="text-[11px] text-on-surface-variant">
							Perubahan akan langsung berlaku untuk pembuatan Master Rute UJO baru.
						</div>
						<button
							type="submit"
							disabled={isSaving}
							class="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
						>
							{#if isSaving}
								<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
								<span>Menyimpan...</span>
							{:else}
								<span class="material-symbols-outlined text-sm">save</span>
								<span>Simpan Pengaturan Global</span>
							{/if}
						</button>
					</div>
				</form>
			</div>

			<!-- Live Simulation & Formula Card -->
			<div class="space-y-6">
				<!-- Simulator Box -->
				<div class="bg-surface-container-low p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
					<div class="flex items-center gap-2 border-b border-surface-container/60 pb-3">
						<span class="material-symbols-outlined text-amber-500 text-lg">calculate</span>
						<h3 class="text-sm font-bold text-on-surface">Simulasi Real-Time</h3>
					</div>

					<div class="space-y-3">
						<div>
							<label for="sim_distance" class="text-[11px] font-bold text-on-surface-variant uppercase">Jarak Tempuh Uji (KM)</label>
							<input
								id="sim_distance"
								type="number"
								bind:value={testDistance}
								min="1"
								class="mt-1 w-full px-3 py-2 rounded-xl bg-surface border border-slate-200/80 dark:border-slate-800/80 text-sm font-bold text-on-surface outline-none"
							/>
						</div>

						<div>
							<label for="sim_unit" class="text-[11px] font-bold text-on-surface-variant uppercase">Pilih Tipe Truk Uji</label>
							<select
								id="sim_unit"
								bind:value={testSelectedUnitId}
								class="mt-1 w-full px-3 py-2 rounded-xl bg-surface border border-slate-200/80 dark:border-slate-800/80 text-xs font-medium text-on-surface outline-none"
							>
								<option value="">(Default Global - Tanpa Override)</option>
								{#each data.tipeUnits || [] as unit}
									{@const hasOverride = unitOverrides[String(unit.id)]}
									<option value={String(unit.id)}>
										{unit.nama_tipe} {hasOverride ? `[Khusus: 1:${hasOverride}]` : ''}
									</option>
								{/each}
							</select>
						</div>

						<div class="p-4 rounded-xl bg-surface border border-amber-200/60 dark:border-amber-900/40 space-y-2 mt-2">
							<div class="flex items-center justify-between text-xs">
								<span class="text-on-surface-variant">Rasio Digunakan:</span>
								<span class="font-bold text-amber-700 dark:text-amber-400 font-mono">1 : {effectiveTestRatio} KM/L</span>
							</div>
							<div class="flex items-center justify-between text-xs">
								<span class="text-on-surface-variant">Kebutuhan Solar:</span>
								<span class="font-black text-on-surface font-mono">{simulatedLiter.toFixed(1)} Liter</span>
							</div>
							<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
								<span class="text-xs font-bold text-on-surface">Biaya Solar:</span>
								<span class="text-sm font-black text-sky-600 dark:text-sky-400 font-mono">{formatCurrency(simulatedCost)}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Formula Guide Card -->
				<div class="p-5 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/40 space-y-3">
					<div class="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-bold text-xs">
						<span class="material-symbols-outlined text-base">info</span>
						<span>Rumus Kalkulasi Standar</span>
					</div>
					<div class="text-[11px] text-sky-900/80 dark:text-sky-200/80 space-y-1.5 font-mono">
						<p>• <strong>Liter Solar:</strong> Jarak (KM) ÷ Rasio (KM/L)</p>
						<p>• <strong>Biaya Solar:</strong> Liter Solar × Harga Solar</p>
					</div>
					<p class="text-[10px] text-on-surface-variant leading-relaxed">
						Saat pembuatan rute baru, rasio akan otomatis mengutamakan rasio khusus tipe unit terpilih. Jika tidak ada rasio khusus, sistem akan menggunakan rasio standar global di atas.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- TAB 2: OVERRIDE PER TIPE UNIT -->
	{#if activeTab === 'units'}
		<div class="space-y-5">
			<!-- Header & Search Bar -->
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-low p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
				<div class="flex items-center gap-3">
					<!-- Search Input -->
					<div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-slate-200/80 dark:border-slate-800/80 text-xs w-64 sm:w-80 shadow-2xs">
						<span class="material-symbols-outlined text-slate-400 text-sm">search</span>
						<input
							type="text"
							bind:value={unitSearchQuery}
							placeholder="Cari armada / golongan tol..."
							class="bg-transparent text-xs text-on-surface outline-none w-full placeholder:text-slate-400"
						/>
						{#if unitSearchQuery}
							<button onclick={() => unitSearchQuery = ''} class="text-slate-400 hover:text-slate-600 cursor-pointer">
								<span class="material-symbols-outlined text-xs">close</span>
							</button>
						{/if}
					</div>

					<div class="text-xs text-on-surface-variant font-medium">
						Total: <strong>{filteredUnits.length}</strong> tipe unit
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="flex items-center gap-2">
					{#if overrideCount > 0}
						<button
							type="button"
							onclick={clearAllOverrides}
							class="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-100 transition-all cursor-pointer flex items-center gap-1.5"
						>
							<span class="material-symbols-outlined text-sm">restart_alt</span>
							<span>Reset Semua Override</span>
						</button>
					{/if}

					<form
						method="POST"
						action="?/saveUnitOverrides"
						use:enhance={() => {
							isSaving = true;
							return async ({ update }) => {
								await update();
								isSaving = false;
							};
						}}
					>
						<input type="hidden" name="unit_ratios_json" value={JSON.stringify(unitOverrides)} />
						<button
							type="submit"
							disabled={isSaving}
							class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
						>
							{#if isSaving}
								<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
								<span>Menyimpan...</span>
							{:else}
								<span class="material-symbols-outlined text-sm">save</span>
								<span>Simpan Semua Rasio Khusus ({overrideCount})</span>
							{/if}
						</button>
					</form>
				</div>
			</div>

			<!-- Units Table -->
			<div class="bg-surface-container-low rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead>
							<tr class="bg-surface-container/60 border-b border-surface-container text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">
								<th class="py-3 px-4 w-12 text-center">No</th>
								<th class="py-3 px-4">Nama Tipe Unit Kendaraan</th>
								<th class="py-3 px-4 w-28 text-center">Golongan Tol</th>
								<th class="py-3 px-4 w-40 text-center">Status Rasio</th>
								<th class="py-3 px-4 w-52">Rasio Khusus (KM / Liter)</th>
								<th class="py-3 px-4 w-24 text-center">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-surface-container/40">
							{#if filteredUnits.length === 0}
								<tr>
									<td colspan="6" class="py-10 text-center text-on-surface-variant">
										<div class="flex flex-col items-center justify-center gap-2">
											<span class="material-symbols-outlined text-3xl text-slate-400">search_off</span>
											<p class="font-medium text-xs">Tidak ada tipe unit kendaraan yang cocok dengan pencarian "{unitSearchQuery}".</p>
										</div>
									</td>
								</tr>
							{:else}
								{#each filteredUnits as unit, idx}
									{@const unitIdStr = String(unit.id)}
									{@const hasCustomRatio = unitOverrides[unitIdStr] !== undefined && unitOverrides[unitIdStr] !== '' && Number(unitOverrides[unitIdStr]) > 0}
									{@const currentVal = hasCustomRatio ? unitOverrides[unitIdStr] : ''}
									<tr class="hover:bg-surface/50 transition-colors">
										<td class="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
											{idx + 1}
										</td>
										<td class="py-3 px-4 font-bold text-on-surface">
											<div class="flex items-center gap-2">
												<span class="material-symbols-outlined text-slate-400 text-sm">local_shipping</span>
												<span>{unit.nama_tipe}</span>
											</div>
										</td>
										<td class="py-3 px-4 text-center">
											<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
												Gol {unit.golongan_tol || '1'}
											</span>
										</td>
										<td class="py-3 px-4 text-center">
											{#if hasCustomRatio}
												<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
													<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
													Rasio Khusus
												</span>
											{:else}
												<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
													Standar Global ({solarKmPerLiter} KM/L)
												</span>
											{/if}
										</td>
										<td class="py-2.5 px-4">
											<div class="flex items-center gap-2">
												<div class="relative flex items-center rounded-xl bg-surface border {hasCustomRatio ? 'border-amber-300 dark:border-amber-800 ring-2 ring-amber-500/10' : 'border-slate-200/80 dark:border-slate-800/80'} px-2.5 py-1.5 w-36 shadow-2xs">
													<input
														type="number"
														step="0.05"
														min="0.5"
														max="20"
														value={currentVal}
														placeholder={`${solarKmPerLiter}`}
														oninput={(e) => handleOverrideChange(unit.id, (e.target as HTMLInputElement).value)}
														class="bg-transparent text-xs font-bold text-on-surface outline-none w-full"
													/>
													<span class="text-[10px] text-slate-400 font-mono ml-1">KM/L</span>
												</div>
											</div>
										</td>
										<td class="py-3 px-4 text-center">
											{#if hasCustomRatio}
												<button
													type="button"
													onclick={() => clearOverride(unit.id)}
													title="Kembalikan ke standar global"
													class="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
												>
													<span class="material-symbols-outlined text-base">backspace</span>
												</button>
											{:else}
												<span class="text-slate-300 dark:text-slate-600 text-xs">—</span>
											{/if}
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}
</div>
