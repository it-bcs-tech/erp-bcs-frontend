<script lang="ts">
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	const { kpiRecords, trainingPrograms, metrics, dataSource } = data;

	let activeTab = $state('KPI Evaluations');
	const tabs = ['KPI Evaluations', 'Training Programs'];
	let searchQuery = $state('');

	let filteredKpiRecords = $derived(
		(kpiRecords || []).filter((kpi: any) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			const name = (kpi.employeeName || '').toLowerCase();
			const empId = (kpi.employeeId || '').toLowerCase();
			const dept = (kpi.department || '').toLowerCase();
			const period = (kpi.period || '').toLowerCase();
			return name.includes(q) || empId.includes(q) || dept.includes(q) || period.includes(q);
		})
	);

	let filteredTrainingPrograms = $derived(
		(trainingPrograms || []).filter((tp: any) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			const title = (tp.title || '').toLowerCase();
			const provider = (tp.provider || '').toLowerCase();
			const dept = (tp.targetDepartment || '').toLowerCase();
			return title.includes(q) || provider.includes(q) || dept.includes(q);
		})
	);

	// Modal State
	let isAddModalOpen = $state(false);
	let addModalTab = $state<'kpi'|'training'>('kpi');
	let kpiType = $state<'PERSONAL'|'DEPARTMENT'>('PERSONAL');
	
	const masterData = data.masterData;
</script>

<svelte:head>
	<title>Performance & KPI Reviews | HRIS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header & Actions -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-primary text-2xl">assessment</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Performance & KPI Reviews</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Evaluasi Penilaian Kinerja Karyawan, Pencapaian KPI & Program Pelatihan SDM
			</p>
		</div>
		<div class="flex gap-2.5 items-center">
			<span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full {dataSource === 'laravel' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
				<span class="w-1.5 h-1.5 rounded-full {dataSource === 'laravel' ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
				{dataSource === 'laravel' ? 'Laravel API' : 'Svelte Fallback'}
			</span>
			<button 
				class="bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-primary/90 transition-colors cursor-pointer"
				onclick={() => { isAddModalOpen = true; addModalTab = 'kpi'; }}
			>
				<span class="material-symbols-outlined text-lg">add</span>
				<span>Tambah Penilaian KPI</span>
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

	<!-- Unified Filter & Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs mb-6">
		<!-- Tabs (Segmented Control) -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
			{#each tabs as tab}
				<button 
					class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {activeTab === tab ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => activeTab = tab}
				>
					{tab}
				</button>
			{/each}
		</div>

		<!-- Search Input -->
		<div class="relative w-full md:w-80 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input 
				type="text" 
				bind:value={searchQuery}
				placeholder="Cari karyawan, departemen, program..." 
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
			/>
		</div>
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
                        {#each filteredKpiRecords as kpi}
                            <tr class="group hover:bg-surface-container-low transition-colors">
                                <td class="py-4 px-6">
                                    <div class="flex items-center gap-2 mb-0.5">
                                        {#if kpi.kpiType === 'DEPARTMENT'}
                                            <span class="inline-flex items-center text-primary font-bold text-[9px] bg-primary-container/50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                DEPT
                                            </span>
                                        {/if}
                                        <p class="text-sm font-bold text-on-surface">{kpi.employeeName}</p>
                                    </div>
                                    <p class="text-[11px] font-medium text-on-surface-variant">{kpi.employeeId} • {kpi.department}</p>
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
                                            <p class="text-sm font-black text-on-surface">{kpi.finalScore} / 100</p>
                                            <p class="text-[10px] font-medium text-on-surface-variant mt-0.5">{kpi.notes}</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="py-4 px-6">
                                    <p class="text-sm font-medium text-on-surface">{kpi.evaluatedBy}</p>
                                    <p class="text-[10px] text-on-surface-variant">{kpi.evaluatedAt}</p>
                                </td>
                                <td class="py-4 px-6 text-right">
                                    <button class="text-xs font-bold text-primary hover:underline">Review</button>
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
                            <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Program Title</th>
                            <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Date</th>
                            <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Participants</th>
                            <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
                            <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-surface-container">
                        {#each filteredTrainingPrograms as trn}
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

<!-- NEW RECORD MODAL -->
{#if isAddModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick={() => isAddModalOpen = false}></div>
		
		<div class="relative bg-surface-container-lowest rounded-[24px] shadow-xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
			<!-- Modal Header & Tabs -->
			<div class="border-b border-surface-container bg-surface-container-lowest z-10 pt-6 px-8">
				<div class="flex items-center justify-between mb-4">
					<div>
						<h2 class="text-xl font-bold text-on-surface">Add New Entry</h2>
						<p class="text-sm text-on-surface-variant mt-1">Record a new KPI evaluation or create a training program.</p>
					</div>
					<button class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors" onclick={() => isAddModalOpen = false}>
						<span class="material-symbols-outlined">close</span>
					</button>
				</div>
                <div class="flex gap-4">
                    <button 
                        class="pb-3 text-sm font-bold border-b-2 transition-colors {addModalTab === 'kpi' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}"
                        onclick={() => addModalTab = 'kpi'}
                    >
                        KPI Evaluation
                    </button>
                    <button 
                        class="pb-3 text-sm font-bold border-b-2 transition-colors {addModalTab === 'training' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}"
                        onclick={() => addModalTab = 'training'}
                    >
                        Training Program
                    </button>
                </div>
			</div>

			<!-- Modal Body -->
			<div class="p-8 overflow-y-auto max-h-[65vh] flex-1">
                {#if addModalTab === 'kpi'}
                    <form method="POST" action="?/addKpi" id="kpi-form" class="space-y-5 animate-in fade-in slide-in-from-left-4" onsubmit={() => setTimeout(() => window.location.reload(), 500)}>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div class="space-y-1.5 md:col-span-2">
                                <label class="text-sm font-bold text-on-surface flex items-center gap-2">
                                    <span class="material-symbols-outlined text-[16px] text-primary">category</span>
                                    KPI Type
                                </label>
                                <select name="kpiType" bind:value={kpiType} class="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium cursor-pointer" required>
                                    <option value="PERSONAL">PERSONAL (Individual Employee)</option>
                                    <option value="DEPARTMENT">DEPARTMENT (Team/Group)</option>
                                </select>
                            </div>

                            <div class="space-y-1.5 md:col-span-2">
                                <label class="text-xs font-bold text-on-surface-variant">Target {kpiType === 'PERSONAL' ? 'Employee' : 'Department'}</label>
                                <select name="targetId" class="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium cursor-pointer" required>
                                    <option value="" disabled selected>Select {kpiType === 'PERSONAL' ? 'employee' : 'department'}...</option>
                                    {#if kpiType === 'PERSONAL'}
                                        {#each masterData?.employees || [] as emp}
                                            <option value={emp.id}>{emp.name} ({emp.id})</option>
                                        {/each}
                                    {:else}
                                        {#each masterData?.departments || [] as dept}
                                            <option value={dept.id}>{dept.name} ({dept.id})</option>
                                        {/each}
                                    {/if}
                                </select>
                            </div>

                            <div class="space-y-1.5">
                                <label class="text-xs font-bold text-on-surface-variant">Active Period</label>
                                <input type="text" name="activePeriod" placeholder="e.g., Oct 2026 or Q3-2026" class="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium" required />
                            </div>

                            <div class="space-y-1.5">
                                <label class="text-xs font-bold text-on-surface-variant">Score (0-100)</label>
                                <input type="number" name="score" step="0.01" min="0" max="100" placeholder="e.g., 85.50" class="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium" required />
                            </div>

                            <div class="space-y-1.5 md:col-span-2">
                                <label class="text-xs font-bold text-on-surface-variant">Evaluator Remarks</label>
                                <textarea name="remarks" rows="3" placeholder="Additional notes about this evaluation..." class="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium resize-none"></textarea>
                            </div>
                        </div>
                    </form>
                {:else}
                    <form method="POST" action="?/addTraining" id="training-form" class="space-y-5 animate-in fade-in slide-in-from-right-4" onsubmit={() => setTimeout(() => window.location.reload(), 500)}>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div class="space-y-1.5 md:col-span-2">
                                <label class="text-xs font-bold text-on-surface-variant">Program Title</label>
                                <input type="text" name="title" placeholder="e.g., K3 & Safety Driving Certification" class="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none transition-all text-sm font-medium" required />
                            </div>

                            <div class="space-y-1.5 md:col-span-2">
                                <label class="text-xs font-bold text-on-surface-variant">Category</label>
                                <select name="category" class="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none transition-all text-sm font-medium cursor-pointer" required>
                                    <option value="" disabled selected>Select category...</option>
                                    <option value="Safety">Health & Safety (HSE)</option>
                                    <option value="Technical">Technical & Tools</option>
                                    <option value="Soft Skills">Soft Skills & Leadership</option>
                                    <option value="Compliance">Compliance & SOP</option>
                                </select>
                            </div>

                            <div class="space-y-1.5">
                                <label class="text-xs font-bold text-on-surface-variant">Start Date</label>
                                <input type="date" name="startDate" class="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none transition-all text-sm font-medium" required />
                            </div>

                            <div class="space-y-1.5">
                                <label class="text-xs font-bold text-on-surface-variant">End Date</label>
                                <input type="date" name="endDate" class="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none transition-all text-sm font-medium" />
                            </div>

                            <div class="space-y-1.5 md:col-span-2">
                                <label class="text-xs font-bold text-on-surface-variant">Trainer / Instructor Name</label>
                                <input type="text" name="trainer" placeholder="e.g., Internal Dept or External Agency" class="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none transition-all text-sm font-medium" />
                            </div>
                        </div>
                    </form>
                {/if}
			</div>

			<!-- Modal Footer -->
			<div class="px-8 py-5 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3 z-10">
				<button class="px-6 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors" onclick={() => isAddModalOpen = false}>
					Cancel
				</button>
				<button form={addModalTab === 'kpi' ? 'kpi-form' : 'training-form'} class="px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 {addModalTab === 'kpi' ? 'bg-primary text-on-primary hover:bg-primary/90' : 'bg-tertiary text-on-tertiary hover:bg-tertiary/90'}">
					<span class="material-symbols-outlined text-sm">save</span>
					Save {addModalTab === 'kpi' ? 'KPI' : 'Program'}
				</button>
			</div>
		</div>
	</div>
{/if}
