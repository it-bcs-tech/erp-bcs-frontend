<script lang="ts">
	// Props
	let {
		isOpen = $bindable(false),
		availableUnits = 0,
		onApply = () => {}
	} = $props<{
		isOpen: boolean;
		availableUnits: number;
		onApply?: (data: { tonnage: number, value: number, days: number, unitsNeeded: number }) => void;
	}>();

	// Simulation Variables
	let simTargetTonnage = $state(1000); // ton
	let simTariffPerRit = $state(2000000); // Rp
	let simTargetDays = $state(30); // hari
	let simUnitCapacity = $state(25); // ton per truk
	let simTripPerDay = $state(2); // ritase per hari per truk

	// Derived AI Calculations
	let simTotalRit = $derived(Math.ceil(simTargetTonnage / simUnitCapacity));
	let simTariffPerTon = $derived(simTariffPerRit / simUnitCapacity);
	let simTotalContractValue = $derived(simTotalRit * simTariffPerRit);
	
	// Fleet Check Calculations
	let simRitPerDay = $derived(Math.ceil(simTotalRit / simTargetDays));
	let simUnitsNeeded = $derived(Math.ceil(simRitPerDay / simTripPerDay));
	let simIsFeasible = $derived(simUnitsNeeded <= availableUnits);

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};

	function closeSimulator() {
		isOpen = false;
	}

	function handleApply() {
		onApply({
			tonnage: simTargetTonnage,
			value: simTotalContractValue,
			days: simTargetDays,
			unitsNeeded: simUnitsNeeded
		});
		closeSimulator();
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeSimulator}></div>
		<div class="relative w-full max-w-4xl bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			
			<div class="p-6 border-b border-surface-container bg-indigo-50/50 dark:bg-indigo-900/10 flex items-start justify-between">
				<div>
					<h3 class="text-xl font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
						<span class="material-symbols-outlined">calculate</span> Contract Simulator
					</h3>
					<p class="text-xs text-on-surface-variant mt-1">Simulasikan margin kontrak dan periksa kesiapan armada secara instan.</p>
				</div>
				<button onclick={closeSimulator} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>
			
			<div class="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
				
				<!-- Left Column: Inputs -->
				<div class="space-y-6">
					<h4 class="text-sm font-black text-on-surface border-b border-surface-container pb-2">Parameter Negosiasi</h4>
					
					<div>
						<label class="flex justify-between text-xs font-bold text-on-surface-variant mb-2">
							<span>Target Total Tonase (Ton)</span>
							<span class="text-indigo-600">{new Intl.NumberFormat('id-ID').format(simTargetTonnage)} Ton</span>
						</label>
						<input type="range" bind:value={simTargetTonnage} min="100" max="10000" step="100" class="w-full accent-indigo-600" />
						<input type="number" bind:value={simTargetTonnage} class="w-full mt-2 bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
					</div>

					<div>
						<label class="flex justify-between text-xs font-bold text-on-surface-variant mb-2">
							<span>Penawaran Tarif per Rit/Unit (Rp)</span>
							<span class="text-indigo-600">{formatCurrency(simTariffPerRit)}</span>
						</label>
						<input type="range" bind:value={simTariffPerRit} min="500000" max="10000000" step="100000" class="w-full accent-indigo-600" />
						<input type="number" bind:value={simTariffPerRit} class="w-full mt-2 bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Target Waktu (Hari)</label>
							<div class="flex items-center gap-2">
								<input type="number" bind:value={simTargetDays} min="1" max="365" class="w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
							</div>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Kapasitas Truk (Ton)</label>
							<div class="flex items-center gap-2">
								<input type="number" bind:value={simUnitCapacity} min="5" max="50" class="w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
							</div>
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Estimasi Kemampuan 1 Unit (Rit/Hari)</label>
						<input type="number" bind:value={simTripPerDay} min="1" max="10" class="w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
						<p class="text-[10px] text-on-surface-variant mt-1">Seberapa sering 1 unit bisa bolak-balik origin-destinasi dalam 1 hari.</p>
					</div>

				</div>

				<!-- Right Column: Outputs -->
				<div class="bg-surface-container-low rounded-2xl p-6 border border-surface-container">
					<h4 class="text-sm font-black text-on-surface border-b border-surface-container-high pb-2 mb-4">Hasil Kalkulasi AI</h4>
					
					<div class="space-y-4 mb-6">
						<div class="flex justify-between items-center">
							<span class="text-xs font-medium text-on-surface-variant">Kalkulasi Total Rit</span>
							<span class="text-sm font-bold text-on-surface">{simTotalRit} Rit/Trip</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-xs font-medium text-on-surface-variant">Ekuivalen Tarif per Ton</span>
							<span class="text-sm font-bold text-on-surface">{formatCurrency(simTariffPerTon)} / Ton</span>
						</div>
						<div class="flex justify-between items-center pt-3 border-t border-surface-container-high">
							<span class="text-xs font-black uppercase text-on-surface">Total Nilai Penawaran</span>
							<span class="text-xl font-black text-indigo-600">{formatCurrency(simTotalContractValue)}</span>
						</div>
					</div>

					<h4 class="text-sm font-black text-on-surface border-b border-surface-container-high pb-2 mb-4 mt-6">AI Fleet Check</h4>
					
					<div class="space-y-4 mb-4">
						<div class="flex justify-between items-center">
							<span class="text-xs font-medium text-on-surface-variant">Target Kecepatan Pemuatan</span>
							<span class="text-sm font-bold text-on-surface">{simRitPerDay} Rit / Hari</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-xs font-medium text-on-surface-variant">Unit Aktif di Pool Saat Ini</span>
							<span class="text-sm font-bold text-sky-600">{availableUnits} Unit</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-xs font-black uppercase text-on-surface">Kebutuhan Pengerahan Armada</span>
							<span class="text-lg font-black text-on-surface">{simUnitsNeeded} Unit / Hari</span>
						</div>
					</div>

					<div class="mt-6 p-4 rounded-xl border {simIsFeasible ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}">
						<div class="flex items-start gap-3">
							<span class="material-symbols-outlined {simIsFeasible ? 'text-emerald-600' : 'text-rose-600'}">
								{simIsFeasible ? 'check_circle' : 'warning'}
							</span>
							<div>
								<p class="text-sm font-bold {simIsFeasible ? 'text-emerald-700' : 'text-rose-700'}">
									{simIsFeasible ? 'SANGAT VISIBEL (LOW RISK)' : 'RISIKO TINGGI: Kekurangan Armada'}
								</p>
								<p class="text-[11px] mt-1 {simIsFeasible ? 'text-emerald-600' : 'text-rose-600'}">
									{#if simIsFeasible}
										Jumlah armada *ready* di Pool ({availableUnits}) melebihi kebutuhan harian kontrak ini ({simUnitsNeeded}). Proyek aman untuk dijalankan.
									{:else}
										Kebutuhan armada harian ({simUnitsNeeded}) melebihi jumlah unit yang *ready* di Pool saat ini ({availableUnits}). Mohon negosiasikan waktu yang lebih longgar.
									{/if}
								</p>
							</div>
						</div>
					</div>

				</div>
			</div>

			<div class="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
				<button type="button" class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors" onclick={closeSimulator}>
					Tutup
				</button>
				<button type="button" onclick={handleApply} class="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-2">
					<span class="material-symbols-outlined text-[18px]">check</span> Terapkan Nilai ke Form
				</button>
			</div>

		</div>
	</div>
{/if}
