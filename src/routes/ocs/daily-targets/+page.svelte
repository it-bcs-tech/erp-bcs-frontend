<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import DailyTargetSimulator from '$lib/components/DailyTargetSimulator.svelte';
	import DailyPlanCalendar from '$lib/components/DailyPlanCalendar.svelte';
	import MonthlyTargetModal from '$lib/components/MonthlyTargetModal.svelte';
	import CargoPacking3D from '$lib/components/CargoPacking3D.svelte';

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

	// 3D Cargo Packing Modal state
	let show3DCargoModal = $state(false);

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
	
	const currentMonthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date());
</script>

<svelte:head>
	<title>Target Harian Kontrak | OCS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">track_changes</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Target Harian & Perencanaan Ritase</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pecah total target kontrak menjadi ritase harian, estimasi unit armada, dan simulasi jadwal pengiriman
			</p>
		</div>
		<button
			class="px-4 py-2.5 text-xs font-bold rounded-xl border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 transition-all text-blue-600 dark:text-blue-400 flex items-center gap-2 shadow-xs cursor-pointer"
			onclick={() => (show3DCargoModal = true)}
			title="Simulasi 3D Cargo Packing Kontainer"
		>
			<span class="material-symbols-outlined text-base">view_in_ar</span>
			<span>Simulasi 3D Kontainer</span>
		</button>
	</header>

	{#if form?.error}
		<div class="p-4 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shadow-xs font-medium text-xs">
			{form.error}
		</div>
	{/if}
	{#if form?.success || form?.dynamicGenerateSuccess}
		<div class="p-4 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs font-medium text-xs">
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
			<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-xs hover:border-blue-500/30 transition-all">
				<div class="flex flex-wrap items-center justify-between gap-4">
					<!-- Left: Contract Info -->
					<div class="flex-1 min-w-[220px]">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-blue-600 text-lg">contract</span>
							<p class="font-bold text-on-surface text-sm">{c.project}</p>
						</div>
						<p class="text-xs text-on-surface-variant font-medium mt-1">{c.customer}</p>
						<p class="text-[10px] text-on-surface-variant/70 mt-0.5">{c.startDate} → {c.endDate}</p>
					</div>

					<!-- Center: Progress + Target -->
					<div class="flex items-center gap-6 flex-wrap">
						<!-- Progress -->
						<div class="w-[180px]">
							{#if Number(c.targetTonnage) > 0}
								<!-- Fixed Contract Target -->
								<div class="flex justify-between text-[10px] font-bold mb-1">
									<span class="text-emerald-600">{formatNumber(c.deliveredTonnage)} Ton</span>
									<span class="text-on-surface-variant">{formatNumber(c.targetTonnage)} Ton</span>
								</div>
								<div class="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden mb-1">
									<div class="h-full bg-emerald-500 rounded-full" style="width: {Math.min((c.deliveredTonnage/c.targetTonnage)*100, 100)}%"></div>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-[9px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-md">Total Keseluruhan</span>
									<span class="text-[9px] font-medium text-on-surface-variant">Sisa: {formatNumber(Math.max(0, c.targetTonnage - c.deliveredTonnage))} T</span>
								</div>
							{:else if Number(c.current_month_target) > 0}
								<!-- Monthly Dynamic Target -->
								<div class="flex justify-between text-[10px] font-bold mb-1">
									<span class="text-blue-600">{formatNumber(c.current_month_delivered)} Ton</span>
									<span class="text-on-surface-variant">{formatNumber(c.current_month_target)} Ton</span>
								</div>
								<div class="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden mb-1">
									<div class="h-full bg-blue-500 rounded-full" style="width: {Math.min((c.current_month_delivered/c.current_month_target)*100, 100)}%"></div>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-[9px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md">Bulan {currentMonthName}</span>
									<span class="text-[9px] font-medium text-on-surface-variant">Sisa: {formatNumber(Math.max(0, c.current_month_target - c.current_month_delivered))} T</span>
								</div>
							{:else}
								<!-- Not set -->
								<div class="flex justify-between text-[10px] font-bold mb-1">
									<span class="text-emerald-600">{formatNumber(c.deliveredTonnage)} Ton</span>
									<span class="text-on-surface-variant">Belum Set</span>
								</div>
								<div class="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md inline-block font-medium border border-amber-200 dark:border-amber-900/50 mt-0.5">
									Berbasis Unit/Borongan
								</div>
							{/if}
						</div>

						<!-- Target -->
						{#if Number(c.today_target_tonnage) > 0 || Number(c.daily_target_tonnage) > 0}
							<div class="text-center px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
								<p class="font-black text-emerald-700 dark:text-emerald-400 text-sm">{formatNumber(c.today_target_tonnage || c.daily_target_tonnage)} Ton</p>
								<p class="text-[10px] font-bold text-emerald-600 mt-0.5">{c.today_target_ritase || c.daily_target_ritase} Rit/Hari</p>
							</div>
						{:else}
							<span class="text-[10px] text-on-surface-variant italic py-1.5 px-3 bg-surface-container rounded-xl">Target Harian Belum Diatur</span>
						{/if}

						<!-- Units -->
						{#if Number(c.today_target_units) > 0 || Number(c.units_needed_per_day) > 0}
							<div class="text-center px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
								<p class="font-black text-indigo-600 dark:text-indigo-400 text-sm">{c.today_target_units || c.units_needed_per_day}</p>
								<p class="text-[10px] font-bold text-indigo-600 mt-0.5">Unit/Hari</p>
							</div>
						{/if}
					</div>

					<!-- Right: Actions -->
					<div class="flex items-center gap-2 flex-shrink-0">
						{#if Number(c.targetTonnage) > 0}
							<button 
								class="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container hover:bg-surface-container-high transition-all text-on-surface flex items-center gap-1.5 cursor-pointer"
								onclick={() => openSimulator(c)}
							>
								<span class="material-symbols-outlined text-[16px]">calculate</span>
								<span>Kalkulator</span>
							</button>
						{:else}
							<button 
								class="px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 transition-all text-amber-700 dark:text-amber-300 flex items-center gap-1.5 cursor-pointer"
								onclick={() => openMonthlyModal(c)}
							>
								<span class="material-symbols-outlined text-[16px]">calendar_month</span>
								<span>Target Bulanan</span>
							</button>
						{/if}

						<button 
							class="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
							onclick={() => openCalendar(c)}
						>
							<span class="material-symbols-outlined text-[16px]">calendar_month</span>
							<span>Kalender Target</span>
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

<!-- Modal 3D Cargo Packing -->
{#if show3DCargoModal}
	<div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
			<!-- Modal Header -->
			<div class="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
						<span class="material-symbols-outlined text-2xl">view_in_ar</span>
					</div>
					<div>
						<h2 class="text-lg font-black text-white flex items-center gap-2">
							<span>SIMULASI 3D CARGO PACKING KONTAINER</span>
							<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-500/20 text-sky-400 border border-sky-500/30">THREE.JS WEBGL</span>
						</h2>
						<p class="text-xs text-slate-400">Estimasi Efisiensi Ruang Muat Kontainer 40ft High Cube</p>
					</div>
				</div>
				<button onclick={() => (show3DCargoModal = false)} class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer">
					<span class="material-symbols-outlined text-xl">close</span>
				</button>
			</div>

			<!-- Modal Body -->
			<div class="p-6">
				<CargoPacking3D />
			</div>
		</div>
	</div>
{/if}
