<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import DailyTargetSimulator from '$lib/components/DailyTargetSimulator.svelte';
	import DailyPlanCalendar from '$lib/components/DailyPlanCalendar.svelte';

	let { data, form }: { data: PageData, form: ActionData } = $props();
	let contracts = $derived(data.contracts || []);
	let dailyPlans = $derived(data.dailyPlans || []);
	let dispatches = $derived(data.dispatches || []);
	let selectedContractId = $derived(data.selectedContractId);

	let showSimulator = $state(false);
	let selectedContract = $state<any>(null);
	let showCalendar = $state(false);
	let calendarContract = $state<any>(null);

	// Hidden form binding
	let formTargetDays = $state(0);
	let formUnitCapacity = $state(0);
	let formTripsPerDay = $state(0);
	let formDailyTargetTonnage = $state(0);
	let formDailyTargetRitase = $state(0);
	let formUnitsNeededPerDay = $state(0);
	
	let formElement: HTMLFormElement;

	// Auto-open calendar if contract selected via URL
	$effect(() => {
		if (selectedContractId && contracts.length > 0) {
			const c = contracts.find((ct: any) => ct.id === selectedContractId);
			if (c) {
				calendarContract = c;
				showCalendar = true;
			}
		}
	});

	// Re-open calendar after generate/update success
	$effect(() => {
		if (form?.generateSuccess && form?.contractId) {
			goto(`?contract=${form.contractId}`, { invalidateAll: true });
		}
		if (form?.updateSuccess && form?.contractId) {
			goto(`?contract=${form.contractId}`, { invalidateAll: true });
		}
	});

	function openSimulator(contract: any) {
		selectedContract = contract;
		showSimulator = true;
	}

	function openCalendar(contract: any) {
		calendarContract = contract;
		goto(`?contract=${contract.id}`, { invalidateAll: true });
	}

	function closeCalendar() {
		showCalendar = false;
		calendarContract = null;
		goto('?', { invalidateAll: true });
	}

	function handleSimulatorApply(simData: any) {
		formTargetDays = simData.targetDays;
		formUnitCapacity = simData.unitCapacity;
		formTripsPerDay = simData.tripsPerDay;
		formDailyTargetTonnage = simData.dailyTargetTonnage;
		formDailyTargetRitase = simData.dailyTargetRitase;
		formUnitsNeededPerDay = simData.unitsNeededPerDay;

		setTimeout(() => {
			if (formElement) formElement.requestSubmit();
		}, 100);
	}

	const formatNumber = (num: number) => {
		return new Intl.NumberFormat('id-ID').format(num || 0);
	};
</script>

<svelte:head>
	<title>Target Harian Kontrak | OCS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full">
	<header class="mb-8">
		<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Target Harian Kontrak</h1>
		<p class="text-on-surface-variant font-medium text-sm">Pecah total kontrak menjadi target ritase harian dan kalkulasi kebutuhan armada</p>
	</header>

	{#if form?.error}
		<div class="mb-6 p-4 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shadow-sm font-medium">
			{form.error}
		</div>
	{/if}
	{#if form?.success}
		<div class="mb-6 p-4 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm font-medium">
			Target rata-rata harian berhasil disimpan.
		</div>
	{/if}

	<!-- Hidden Form for Simulator -->
	<form method="POST" action="?/setTarget" use:enhance bind:this={formElement} class="hidden">
		<input type="hidden" name="contractId" value={selectedContract?.id} />
		<input type="hidden" name="targetDays" value={formTargetDays} />
		<input type="hidden" name="unitCapacity" value={formUnitCapacity} />
		<input type="hidden" name="tripsPerDay" value={formTripsPerDay} />
		<input type="hidden" name="dailyTargetTonnage" value={formDailyTargetTonnage} />
		<input type="hidden" name="dailyTargetRitase" value={formDailyTargetRitase} />
		<input type="hidden" name="unitsNeededPerDay" value={formUnitsNeededPerDay} />
	</form>

	<div class="space-y-4">
		{#each contracts as c}
			<div class="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container p-5 hover:shadow-md transition-shadow">
				<div class="flex flex-wrap items-start justify-between gap-4">
					<!-- Left: Contract Info -->
					<div class="flex-1 min-w-[200px]">
						<p class="font-bold text-on-surface text-sm">{c.project}</p>
						<p class="text-xs text-on-surface-variant mt-0.5">{c.customer}</p>
						<p class="text-[10px] text-on-surface-variant/70 mt-0.5">{c.startDate} → {c.endDate}</p>
					</div>

					<!-- Center: Progress + Target -->
					<div class="flex items-center gap-6 flex-wrap">
						<!-- Progress -->
						<div class="w-[160px]">
							<div class="flex justify-between text-[10px] font-bold mb-1">
								<span class="text-emerald-600">{formatNumber(c.deliveredTonnage)} Ton</span>
								<span class="text-on-surface-variant">{formatNumber(c.targetTonnage)} Ton</span>
							</div>
							<div class="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
								<div class="h-full bg-emerald-500 rounded-full" style="width: {Math.min((c.deliveredTonnage/c.targetTonnage)*100, 100)}%"></div>
							</div>
						</div>

						<!-- Target -->
						{#if c.daily_target_tonnage > 0}
							<div class="text-center px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50">
								<span class="font-black text-emerald-700 dark:text-emerald-400 text-sm">{formatNumber(c.daily_target_tonnage)} Ton</span>
								<span class="text-[10px] text-emerald-600 ml-1">{c.daily_target_ritase} Rit/Hari</span>
							</div>
						{:else}
							<span class="text-[10px] text-on-surface-variant italic py-1 px-3 bg-surface-container rounded-full">Belum Diatur</span>
						{/if}

						<!-- Units -->
						{#if c.units_needed_per_day > 0}
							<div class="text-center">
								<span class="font-black text-indigo-600 dark:text-indigo-400">{c.units_needed_per_day}</span>
								<span class="text-[10px] text-on-surface-variant ml-1">Unit/Hari</span>
							</div>
						{/if}
					</div>

					<!-- Right: Actions -->
					<div class="flex gap-2 flex-shrink-0">
						<button 
							onclick={() => openCalendar(c)}
							class="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 font-bold text-xs rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors">
							<span class="material-symbols-outlined text-[16px]">calendar_month</span>
							Kalender
						</button>
						<button 
							onclick={() => openSimulator(c)}
							class="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
							<span class="material-symbols-outlined text-[16px]">calculate</span>
							{c.daily_target_tonnage > 0 ? 'Edit' : 'Set'}
						</button>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

<DailyTargetSimulator 
	bind:isOpen={showSimulator} 
	contract={selectedContract} 
	onApply={handleSimulatorApply} 
/>

<DailyPlanCalendar
	bind:isOpen={showCalendar}
	contract={calendarContract}
	dailyPlans={dailyPlans}
	dispatches={dispatches}
	onClose={closeCalendar}
/>
