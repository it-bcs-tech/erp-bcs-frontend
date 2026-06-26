<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import DailyTargetSimulator from '$lib/components/DailyTargetSimulator.svelte';
	import DailyPlanCalendar from '$lib/components/DailyPlanCalendar.svelte';
	import MonthlyTargetModal from '$lib/components/MonthlyTargetModal.svelte';

	let { data, form }: { data: PageData, form: ActionData } = $props();
	let contracts = $derived(data.contracts || []);
	let dailyPlans = $derived(data.dailyPlans || []);
	let dispatches = $derived(data.dispatches || []);
	let monthlyTargets = $derived(data.monthlyTargets || []);
	let selectedContractId = $derived(data.selectedContractId);

	let showSimulator = $state(false);
	let selectedContract = $state<any>(null);
	let showCalendar = $state(false);
	let calendarContract = $state<any>(null);
	let showMonthlyModal = $state(false);
	let monthlyContract = $state<any>(null);

	// Hidden form binding
	let formTargetDays = $state(0);
	let formUnitCapacity = $state(0);
	let formTripsPerDay = $state(0);
	let formDailyTargetTonnage = $state(0);
	let formDailyTargetRitase = $state(0);
	let formUnitsNeededPerDay = $state(0);
	let formTargetMonthStr = $state('');
	let dynamicTargetTonnage = $state(0);
	
	let formElement: HTMLFormElement;

	let simulatorAction = $derived.by(() => {
		if (selectedContract && Number(selectedContract.targetTonnage) === 0) {
			return '?/generateDynamicPlan';
		}
		return '?/setTarget';
	});

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
	let simulatorOpenedFor = $state('');
	
	$effect(() => {
		if (form?.generateSuccess && form?.contractId) {
			goto(`?contract=${form.contractId}`, { invalidateAll: true });
		}
		if (form?.dynamicGenerateSuccess && form?.contractId) {
			goto(`?contract=${form.contractId}`, { invalidateAll: true });
		}
		if (form?.updateSuccess && form?.contractId) {
			goto(`?contract=${form.contractId}`, { invalidateAll: true });
		}
		if (form?.monthlySetSuccess && form?.contractId && contracts.length > 0) {
			const cacheKey = form.contractId + '_' + form.targetMonthStr;
			if (simulatorOpenedFor !== cacheKey) {
				const c = contracts.find((ct: any) => ct.id === form.contractId);
				if (c) {
					// Close calendar first so simulator is visible on top
					showCalendar = false;
					formTargetMonthStr = form.targetMonthStr;
					simulatorOpenedFor = cacheKey;
					openSimulator(c, form.targetMonthStr, form.targetTonnage);
				}
			}
		}
	});

	function openSimulator(contract: any, monthStr: string = '', tonnage: number = 0) {
		selectedContract = contract;
		formTargetMonthStr = monthStr;
		dynamicTargetTonnage = tonnage;
		showSimulator = true;
	}

	function openMonthlyModal(contract: any, monthStr: string = '') {
		monthlyContract = contract;
		if (monthStr) {
			formTargetMonthStr = monthStr;
		}
		showMonthlyModal = true;
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
		}, 50);
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
	{#if form?.success || form?.dynamicGenerateSuccess}
		<div class="mb-6 p-4 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm font-medium">
			Target rata-rata harian berhasil disimpan.
		</div>
	{/if}

	<!-- Hidden Form for Simulator -->
	<form method="POST" action={simulatorAction} use:enhance bind:this={formElement} class="hidden">
		<input type="hidden" name="contractId" value={selectedContract?.id} />
		<input type="hidden" name="targetDays" value={formTargetDays} />
		<input type="hidden" name="unitCapacity" value={formUnitCapacity} />
		<input type="hidden" name="tripsPerDay" value={formTripsPerDay} />
		<input type="hidden" name="dailyTargetTonnage" value={formDailyTargetTonnage} />
		<input type="hidden" name="dailyTargetRitase" value={formDailyTargetRitase} />
		<input type="hidden" name="unitsNeededPerDay" value={formUnitsNeededPerDay} />
		<input type="hidden" name="targetMonthStr" value={formTargetMonthStr} />
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
								<span class="text-on-surface-variant">
									{#if Number(c.targetTonnage) > 0}
										{formatNumber(c.targetTonnage)} Ton
									{:else}
										Dinamis
									{/if}
								</span>
							</div>
							{#if Number(c.targetTonnage) > 0}
								<div class="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
									<div class="h-full bg-emerald-500 rounded-full" style="width: {Math.min((c.deliveredTonnage/c.targetTonnage)*100, 100)}%"></div>
								</div>
							{:else}
								<div class="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full inline-block font-medium border border-amber-200 dark:border-amber-900/50">
									Berbasis Unit/Borongan
								</div>
							{/if}
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
						{#if Number(c.targetTonnage) > 0}
							<button 
								class="px-4 py-2 text-xs font-bold rounded-xl border border-surface-variant/30 hover:bg-surface hover:shadow-sm transition-all text-on-surface-variant hover:text-primary flex items-center gap-2"
								onclick={() => openSimulator(c)}
							>
								<span class="material-symbols-outlined text-[16px]">calculate</span>
								Kalkulator
							</button>
						{:else}
							<button 
								class="px-4 py-2 text-xs font-bold rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 hover:shadow-sm transition-all text-amber-700 flex items-center gap-2"
								onclick={() => openMonthlyModal(c)}
							>
								<span class="material-symbols-outlined text-[16px]">calendar_month</span>
								Target Bulanan
							</button>
						{/if}

						<button 
							class="px-4 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-sm shadow-primary/30 transition-all flex items-center gap-2"
							onclick={() => openCalendar(c)}
						>
							<span class="material-symbols-outlined text-[16px]">calendar_month</span>
							Kalender
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
	monthlyTargets={monthlyTargets}
	dynamicTargetTonnage={dynamicTargetTonnage}
	dynamicTargetMonthStr={formTargetMonthStr}
	onApply={handleSimulatorApply} 
/>

<DailyPlanCalendar
	bind:isOpen={showCalendar}
	contract={calendarContract}
	initialMonthStr={formTargetMonthStr}
	dailyPlans={dailyPlans}
	dispatches={dispatches}
	monthlyTargets={monthlyTargets}
	form={form}
	onClose={closeCalendar}
	onOpenMonthlyModal={openMonthlyModal}
/>

<MonthlyTargetModal
	bind:isOpen={showMonthlyModal}
	contract={monthlyContract}
	initialMonthStr={formTargetMonthStr}
	onClose={() => {
		monthlyContract = null;
	}}
/>
