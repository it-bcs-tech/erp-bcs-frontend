<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import DailyTargetSimulator from '$lib/components/DailyTargetSimulator.svelte';

	let { data, form }: { data: PageData, form: ActionData } = $props();
	let contracts = $derived(data.contracts || []);

	let showSimulator = $state(false);
	let selectedContract = $state<any>(null);

	// Hidden form binding
	let formTargetDays = $state(0);
	let formUnitCapacity = $state(0);
	let formTripsPerDay = $state(0);
	let formDailyTargetTonnage = $state(0);
	let formDailyTargetRitase = $state(0);
	let formUnitsNeededPerDay = $state(0);
	
	let formElement: HTMLFormElement;

	function openSimulator(contract: any) {
		selectedContract = contract;
		showSimulator = true;
	}

	function handleSimulatorApply(simData: any) {
		formTargetDays = simData.targetDays;
		formUnitCapacity = simData.unitCapacity;
		formTripsPerDay = simData.tripsPerDay;
		formDailyTargetTonnage = simData.dailyTargetTonnage;
		formDailyTargetRitase = simData.dailyTargetRitase;
		formUnitsNeededPerDay = simData.unitsNeededPerDay;

		// Trigger form submit
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
			Target harian berhasil disimpan.
		</div>
	{/if}

	<!-- Hidden Form -->
	<form method="POST" action="?/setTarget" use:enhance bind:this={formElement} class="hidden">
		<input type="hidden" name="contractId" value={selectedContract?.id} />
		<input type="hidden" name="targetDays" value={formTargetDays} />
		<input type="hidden" name="unitCapacity" value={formUnitCapacity} />
		<input type="hidden" name="tripsPerDay" value={formTripsPerDay} />
		<input type="hidden" name="dailyTargetTonnage" value={formDailyTargetTonnage} />
		<input type="hidden" name="dailyTargetRitase" value={formDailyTargetRitase} />
		<input type="hidden" name="unitsNeededPerDay" value={formUnitsNeededPerDay} />
	</form>

	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm border border-surface-container overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm whitespace-nowrap">
				<thead>
					<tr class="bg-surface-container-low border-b border-surface-container">
						<th class="px-6 py-4 font-bold text-on-surface-variant">Kontrak / Customer</th>
						<th class="px-6 py-4 font-bold text-on-surface-variant">Progress Tonase</th>
						<th class="px-6 py-4 font-bold text-on-surface-variant text-center">Target Tonase Harian</th>
						<th class="px-6 py-4 font-bold text-on-surface-variant text-center">Kebutuhan Armada</th>
						<th class="px-6 py-4 font-bold text-on-surface-variant text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each contracts as c}
						<tr class="hover:bg-surface-container-low/50 transition-colors">
							<td class="px-6 py-4">
								<div class="font-bold text-on-surface">{c.project}</div>
								<div class="text-xs text-on-surface-variant mt-1">{c.customer}</div>
							</td>
							<td class="px-6 py-4">
								<div class="w-full max-w-[200px]">
									<div class="flex justify-between text-xs mb-1">
										<span class="font-medium text-emerald-600">{formatNumber(c.deliveredTonnage)} Ton</span>
										<span class="font-bold text-on-surface-variant">{formatNumber(c.targetTonnage)} Ton</span>
									</div>
									<div class="h-2 w-full bg-surface-container rounded-full overflow-hidden">
										<div class="h-full bg-emerald-500 rounded-full" style="width: {Math.min((c.deliveredTonnage/c.targetTonnage)*100, 100)}%"></div>
									</div>
								</div>
							</td>
							<td class="px-6 py-4 text-center">
								{#if c.daily_target_tonnage > 0}
									<div class="inline-flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50">
										<span class="font-black text-emerald-700 dark:text-emerald-400 text-lg">{formatNumber(c.daily_target_tonnage)} <span class="text-xs font-medium">Ton</span></span>
										<span class="text-[10px] text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">{c.daily_target_ritase} Rit/Hari</span>
									</div>
								{:else}
									<span class="text-xs text-on-surface-variant italic py-1 px-3 bg-surface-container rounded-full">Belum Diatur</span>
								{/if}
							</td>
							<td class="px-6 py-4 text-center">
								{#if c.units_needed_per_day > 0}
									<div class="font-black text-indigo-600 dark:text-indigo-400 text-lg">
										{c.units_needed_per_day} <span class="text-xs font-medium text-on-surface-variant">Unit/Hari</span>
									</div>
								{:else}
									<span class="text-xs text-on-surface-variant">-</span>
								{/if}
							</td>
							<td class="px-6 py-4 text-right">
								<button 
									onclick={() => openSimulator(c)}
									class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
									<span class="material-symbols-outlined text-[18px]">edit_calendar</span>
									{c.daily_target_tonnage > 0 ? 'Edit Target' : 'Set Target'}
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<DailyTargetSimulator 
	bind:isOpen={showSimulator} 
	contract={selectedContract} 
	onApply={handleSimulatorApply} 
/>
