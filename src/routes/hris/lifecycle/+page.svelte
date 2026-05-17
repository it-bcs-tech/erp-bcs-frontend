<script lang="ts">
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	const { actions, metrics } = data;

	let activeTab = $state('All Actions');
    const tabs = ['All Actions', 'Mutations & Promotions', 'Warning Letters (SP)', 'Terminations'];

    let filteredActions = $derived(
        activeTab === 'All Actions' ? actions :
        activeTab === 'Mutations & Promotions' ? actions.filter((a: Record<string, any>) => a.type.includes('Mutation')) :
        activeTab === 'Warning Letters (SP)' ? actions.filter((a: Record<string, any>) => a.type.includes('Warning')) :
        actions.filter((a: Record<string, any>) => a.type.includes('Termination'))
    );
</script>

<svelte:head>
	<title>Lifecycle & Disciplinary | HRIS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header & Actions -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Lifecycle & Disciplinary</h1>
			<p class="text-on-surface-variant font-medium text-sm">Manage mutations, warning letters, and terminations</p>
		</div>
		<div class="flex gap-3">
			<button class="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-primary/90 transition-colors">
				<span class="material-symbols-outlined text-lg">add</span>
				New Action
			</button>
		</div>
	</header>

	<!-- Metrics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-primary/20 shadow-sm flex items-center justify-between">
            <div>
                <p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Active Mutations</p>
                <h3 class="text-3xl font-black text-on-surface">{metrics.activeMutations}</h3>
            </div>
            <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span class="material-symbols-outlined text-2xl">swap_horiz</span>
            </div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-error/20 shadow-sm flex items-center justify-between">
			<div>
                <p class="text-xs font-bold text-error uppercase tracking-wider mb-1">Active Warnings (SP)</p>
                <h3 class="text-3xl font-black text-error">{metrics.activeWarnings}</h3>
            </div>
            <div class="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error">
                <span class="material-symbols-outlined text-2xl">warning</span>
            </div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-sm flex items-center justify-between">
			<div>
                <p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Pending Terminations</p>
                <h3 class="text-3xl font-black text-on-surface-variant">{metrics.pendingTerminations}</h3>
            </div>
            <div class="w-12 h-12 rounded-full bg-surface-variant/10 flex items-center justify-center text-on-surface-variant">
                <span class="material-symbols-outlined text-2xl">person_remove</span>
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

	<!-- Data Table -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse min-w-[900px]">
				<thead>
					<tr class="border-b border-surface-container sticky top-0 bg-surface-container-lowest z-10">
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Reference & Date</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Action Type</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Employee</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Description</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Manage</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each filteredActions as action}
						<tr class="group hover:bg-surface-container-low transition-colors">
                            <td class="py-4 px-6">
								<div class="flex flex-col">
									<span class="text-[11px] font-black tracking-widest uppercase text-on-surface-variant/70">{action.id}</span>
									<span class="text-sm font-bold text-on-surface mt-1">{action.date}</span>
								</div>
							</td>
							<td class="py-4 px-6">
                                <span class="inline-flex items-center gap-1.5 text-on-surface font-bold text-xs bg-surface-container-high px-2.5 py-1 rounded-lg">
                                    {#if action.type.includes('Mutation')}
                                        <span class="material-symbols-outlined text-[14px]">swap_horiz</span>
                                    {:else if action.type.includes('Warning')}
                                        <span class="material-symbols-outlined text-[14px] text-error">warning</span>
                                    {:else}
                                        <span class="material-symbols-outlined text-[14px]">person_remove</span>
                                    {/if}
                                    {action.type}
                                </span>
							</td>
                            <td class="py-4 px-6">
								<p class="text-sm font-bold text-on-surface">{action.employeeName}</p>
								<p class="text-[11px] font-medium text-on-surface-variant mt-0.5">{action.employeeId}</p>
							</td>
							<td class="py-4 px-6">
								<p class="text-sm font-medium text-on-surface max-w-[250px] truncate" title={action.description}>{action.description}</p>
							</td>
                            <td class="py-4 px-6">
                                <span class="text-xs font-bold text-on-surface-variant">{action.status}</span>
							</td>
							<td class="py-4 px-6 text-right">
                                <button class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors tooltip tooltip-left" data-tip="View Details">
                                    <span class="material-symbols-outlined text-[20px]">chevron_right</span>
                                </button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
