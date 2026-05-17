<script lang="ts">
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	const { kpiRecords, trainingPrograms, metrics } = data;

	let activeTab = $state('KPI Evaluations');
    const tabs = ['KPI Evaluations', 'Training Programs'];
</script>

<svelte:head>
	<title>Performance & Training | HRIS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header & Actions -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Performance & Training</h1>
			<p class="text-on-surface-variant font-medium text-sm">Track employee KPIs and manage educational programs</p>
		</div>
		<div class="flex gap-3">
			<button class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container-low transition-colors">
				<span class="material-symbols-outlined text-lg">assessment</span>
				KPI Report
			</button>
		</div>
	</header>

	<!-- Metrics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-primary/20 shadow-sm flex items-center justify-between">
            <div>
                <p class="text-xs font-bold text-primary uppercase tracking-wider mb-1">Company Avg KPI</p>
                <div class="flex items-end gap-2">
                    <h3 class="text-3xl font-black text-on-surface">{metrics.avgKpiScore}</h3>
                    <span class="text-sm font-bold text-on-surface-variant mb-1">/ 100</span>
                </div>
            </div>
            <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span class="material-symbols-outlined text-2xl">trending_up</span>
            </div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-sm flex items-center justify-between">
			<div>
                <p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Evaluated Employees</p>
                <h3 class="text-3xl font-black text-on-surface">{metrics.totalEvaluated}</h3>
            </div>
            <div class="w-12 h-12 rounded-full bg-surface-variant/10 flex items-center justify-center text-on-surface-variant">
                <span class="material-symbols-outlined text-2xl">fact_check</span>
            </div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-tertiary/20 shadow-sm flex items-center justify-between">
			<div>
                <p class="text-xs font-bold text-tertiary uppercase tracking-wider mb-1">Upcoming Trainings</p>
                <h3 class="text-3xl font-black text-on-surface">{metrics.upcomingTrainings}</h3>
            </div>
            <div class="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
                <span class="material-symbols-outlined text-2xl">school</span>
            </div>
		</div>
	</div>

	<!-- Tabs -->
	<div class="flex gap-2 overflow-x-auto pb-2 lg:pb-0 mb-6 border-b border-surface-container">
        {#each tabs as tab}
            <button 
                class="px-5 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 {activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/50'}"
                onclick={() => activeTab = tab}
            >
                {tab}
            </button>
        {/each}
    </div>

	<!-- Content Area -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex-1 overflow-hidden flex flex-col">
        {#if activeTab === 'KPI Evaluations'}
            <div class="overflow-x-auto flex-1">
                <table class="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr class="border-b border-surface-container sticky top-0 bg-surface-container-lowest z-10">
                            <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Employee</th>
                            <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Period</th>
                            <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Score & Grade</th>
                            <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Evaluator</th>
                            <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-surface-container">
                        {#each kpiRecords as kpi}
                            <tr class="group hover:bg-surface-container-low transition-colors">
                                <td class="py-4 px-6">
                                    <p class="text-sm font-bold text-on-surface">{kpi.employeeName}</p>
                                    <p class="text-[11px] font-medium text-on-surface-variant mt-0.5">{kpi.employeeId} • {kpi.department}</p>
                                </td>
                                <td class="py-4 px-6">
                                    <span class="inline-flex items-center gap-1.5 text-on-surface font-bold text-xs bg-surface-container-high px-2.5 py-1 rounded-lg">
                                        <span class="material-symbols-outlined text-[14px]">calendar_month</span>
                                        {kpi.period}
                                    </span>
                                </td>
                                <td class="py-4 px-6">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm
                                            {kpi.grade === 'A' ? 'bg-tertiary-container/50 text-tertiary' : 
                                             kpi.grade.includes('B') ? 'bg-primary-container/50 text-primary' : 
                                             'bg-error-container/50 text-error'}">
                                            {kpi.grade}
                                        </div>
                                        <div>
                                            <p class="text-sm font-black text-on-surface">{kpi.score} <span class="text-xs font-bold text-on-surface-variant">/ 100</span></p>
                                        </div>
                                    </div>
                                </td>
                                <td class="py-4 px-6">
                                    <span class="text-sm font-medium text-on-surface-variant">{kpi.evaluator}</span>
                                </td>
                                <td class="py-4 px-6 text-right">
                                    <button class="p-2 rounded-lg text-primary hover:bg-primary-container/20 transition-colors">
                                        <span class="material-symbols-outlined text-[20px]">open_in_new</span>
                                    </button>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {:else}
            <div class="overflow-x-auto flex-1">
                <table class="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr class="border-b border-surface-container sticky top-0 bg-surface-container-lowest z-10">
                            <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Training Program</th>
                            <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Date</th>
                            <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Participants</th>
                            <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
                            <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-surface-container">
                        {#each trainingPrograms as trn}
                            <tr class="group hover:bg-surface-container-low transition-colors">
                                <td class="py-4 px-6">
                                    <p class="text-sm font-bold text-on-surface">{trn.title}</p>
                                    <p class="text-[11px] font-medium text-on-surface-variant mt-0.5">{trn.id}</p>
                                </td>
                                <td class="py-4 px-6">
                                    <span class="text-sm font-bold text-on-surface">{trn.date}</span>
                                </td>
                                <td class="py-4 px-6">
                                    <div class="flex items-center gap-2">
                                        <span class="material-symbols-outlined text-base text-on-surface-variant">groups</span>
                                        <span class="text-sm font-bold text-on-surface">{trn.participants}</span>
                                    </div>
                                </td>
                                <td class="py-4 px-6">
                                    {#if trn.status === 'Completed'}
                                        <span class="inline-flex items-center gap-1.5 text-tertiary font-bold text-[11px] bg-tertiary-container/30 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                            <span class="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Completed
                                        </span>
                                    {:else}
                                        <span class="inline-flex items-center gap-1.5 text-primary font-bold text-[11px] bg-primary-container/30 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                            <span class="w-1.5 h-1.5 rounded-full bg-primary"></span> Upcoming
                                        </span>
                                    {/if}
                                </td>
                                <td class="py-4 px-6 text-right">
                                    <button class="text-xs font-bold text-primary hover:underline">Manage</button>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
	</div>
</div>
