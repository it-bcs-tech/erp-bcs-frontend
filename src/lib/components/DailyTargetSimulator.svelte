<script lang="ts">
	// Props
	let {
		isOpen = $bindable(false),
		contract = null,
		onApply = () => {}
	} = $props<{
		isOpen: boolean;
		contract: any;
		onApply?: (data: { 
			targetDays: number, 
			unitCapacity: number, 
			tripsPerDay: number,
			dailyTargetTonnage: number,
			dailyTargetRitase: number,
			unitsNeededPerDay: number
		}) => void;
	}>();

	// Simulation Variables
	let simTargetDays = $state(30);
	let simUnitCapacity = $state(25);
	let simTripsPerDay = $state(2);

	$effect(() => {
		if (isOpen && contract) {
			simTargetDays = contract.target_days || 30;
			simUnitCapacity = contract.master_capacity || contract.unit_capacity || 25;
			simTripsPerDay = contract.trips_per_day || 2;
		}
	});

	// Derived AI Calculations
	let simTargetTonnage = $derived(contract?.targetTonnage || 0);
	
	let simTotalRit = $derived(Math.ceil(simTargetTonnage / simUnitCapacity));
	let simDailyTargetRitase = $derived(Math.ceil(simTotalRit / simTargetDays));
	let simDailyTargetTonnage = $derived(simDailyTargetRitase * simUnitCapacity);
	let simUnitsNeededPerDay = $derived(Math.ceil(simDailyTargetRitase / simTripsPerDay));

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};

	function closeSimulator() {
		isOpen = false;
	}

	function handleApply() {
		onApply({
			targetDays: simTargetDays,
			unitCapacity: simUnitCapacity,
			tripsPerDay: simTripsPerDay,
			dailyTargetTonnage: simDailyTargetTonnage,
			dailyTargetRitase: simDailyTargetRitase,
			unitsNeededPerDay: simUnitsNeededPerDay
		});
		closeSimulator();
	}
</script>

{#if isOpen && contract}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeSimulator}></div>
		<div class="relative w-full max-w-4xl bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			
			<div class="p-6 border-b border-surface-container bg-indigo-50/50 dark:bg-indigo-900/10 flex items-start justify-between">
				<div>
					<h3 class="text-xl font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
						<span class="material-symbols-outlined">track_changes</span> Set Target Harian
					</h3>
					<p class="text-xs text-on-surface-variant mt-1">Atur target harian (ritase & tonase) untuk {contract.project} - {contract.customer}</p>
				</div>
				<button onclick={closeSimulator} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>
			
			<div class="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
				
				<!-- Left Column: Inputs -->
				<div class="space-y-6">
					<h4 class="text-sm font-black text-on-surface border-b border-surface-container pb-2">Parameter Perencanaan</h4>
					
					<div>
						<label class="flex justify-between text-xs font-bold text-on-surface-variant mb-2">
							<span>Total Tonase Kontrak</span>
						</label>
						<input type="text" value="{new Intl.NumberFormat('id-ID').format(simTargetTonnage)} Ton" disabled class="w-full bg-surface-container border border-surface-container rounded-lg px-3 py-2 text-sm text-on-surface-variant font-bold cursor-not-allowed" />
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Target Waktu (Hari)</label>
							<div class="flex items-center gap-2">
								<input type="number" bind:value={simTargetDays} min="1" max="365" class="w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
							</div>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Kapasitas Truk (Ton) <span class="text-[10px] font-normal text-indigo-500">(dari Data Master)</span></label>
							<div class="flex items-center gap-2">
								<input type="number" bind:value={simUnitCapacity} min="1" max="100" class="w-full bg-surface-container border border-surface-container rounded-lg px-3 py-2 text-sm font-bold text-on-surface cursor-not-allowed" disabled />
							</div>
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Target Trip/Rit per Hari per Truk</label>
						<div class="flex items-center gap-2">
							<input type="number" bind:value={simTripsPerDay} min="1" max="10" class="w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
						</div>
					</div>

				</div>

				<!-- Right Column: Results & AI Insights -->
				<div class="space-y-6">
					<h4 class="text-sm font-black text-on-surface border-b border-surface-container pb-2">Hasil Kalkulasi Target</h4>
					
					<div class="grid grid-cols-2 gap-4">
						<div class="bg-surface-container-low p-4 rounded-xl border border-surface-container">
							<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Ritase Dibutuhkan</p>
							<p class="text-2xl font-black text-on-surface">{new Intl.NumberFormat('id-ID').format(simTotalRit)} <span class="text-sm text-on-surface-variant font-medium">Rit</span></p>
						</div>
						<div class="bg-surface-container-low p-4 rounded-xl border border-surface-container">
							<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Target Ritase per Hari</p>
							<p class="text-2xl font-black text-indigo-600">{new Intl.NumberFormat('id-ID').format(simDailyTargetRitase)} <span class="text-sm text-indigo-400 font-medium">Rit/Hari</span></p>
						</div>
					</div>

					<div class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col items-center justify-center py-6 text-center">
						<p class="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">Unit/Truk Dibutuhkan per Hari</p>
						<p class="text-4xl font-black text-indigo-700 dark:text-indigo-400">{simUnitsNeededPerDay} <span class="text-lg font-bold text-indigo-500">Unit</span></p>
						<p class="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-2 font-medium">Untuk mencapai target {simDailyTargetRitase} rit/hari dengan {simTripsPerDay} trip/unit/hari</p>
					</div>

					<div class="bg-surface-container-low p-4 rounded-xl border border-surface-container flex items-center justify-between">
						<div>
							<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Estimasi Target Tonase / Hari</p>
							<p class="text-xl font-black text-emerald-600 dark:text-emerald-400">{new Intl.NumberFormat('id-ID').format(simDailyTargetTonnage)} <span class="text-sm text-emerald-500 font-medium">Ton/Hari</span></p>
						</div>
						<div class="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
							<span class="material-symbols-outlined">weight</span>
						</div>
					</div>
				</div>

			</div>
			
			<div class="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
				<button onclick={closeSimulator} class="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">Batal</button>
				<button onclick={handleApply} class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
					<span class="material-symbols-outlined text-lg">save</span> Simpan Target
				</button>
			</div>
		</div>
	</div>
{/if}
