<script lang="ts">
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	const { actions, metrics, dataSource } = data;

	let activeTab = $state('All Actions');
    const tabs = ['All Actions', 'Mutations & Promotions', 'Warning Letters (SP)', 'Terminations'];

    let filteredActions = $derived(
        activeTab === 'All Actions' ? actions :
        activeTab === 'Mutations & Promotions' ? actions.filter((a: Record<string, any>) => a.type.includes('Mutation') || a.type.includes('Promotion')) :
        activeTab === 'Warning Letters (SP)' ? actions.filter((a: Record<string, any>) => a.type.includes('Warning')) :
        actions.filter((a: Record<string, any>) => a.type.includes('Termination'))
    );

    // Pagination State
    let currentPage = $state(1);
    const itemsPerPage = 10;

    $effect(() => {
        activeTab;
        currentPage = 1;
    });

    let totalPages = $derived(Math.max(1, Math.ceil(filteredActions.length / itemsPerPage)));
    let startItem = $derived(filteredActions.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1);
    let endItem = $derived(Math.min(currentPage * itemsPerPage, filteredActions.length));
    let paginatedActions = $derived(filteredActions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage));

	let isAddModalOpen = $state(false);
	let actionType = $state('');
	const masterData = data.masterData;
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
		<div class="flex gap-3 items-center">
			<span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full {dataSource === 'laravel' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
				<span class="w-1.5 h-1.5 rounded-full {dataSource === 'laravel' ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
				{dataSource === 'laravel' ? 'Laravel API' : 'Svelte Fallback'}
			</span>
			<button 
				class="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
				onclick={() => { isAddModalOpen = true; actionType = ''; }}
			>
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
					{#each paginatedActions as action}
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
                                        <span class="material-symbols-outlined text-[14px] text-primary">swap_horiz</span>
                                    {:else if action.type.includes('Promotion')}
                                        <span class="material-symbols-outlined text-[14px] text-tertiary">trending_up</span>
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
		
		<!-- Pagination Footer -->
		<div class="px-6 py-4 border-t border-surface-container flex items-center justify-between bg-surface-container-lowest">
			<p class="text-xs text-on-surface-variant font-medium">Showing {startItem} to {endItem} of {filteredActions.length} entries</p>
			<div class="flex gap-1">
				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" 
					disabled={currentPage <= 1}
					onclick={() => currentPage -= 1}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				
				{#each Array(totalPages) as _, i}
					{#if Math.abs(currentPage - (i + 1)) <= 2 || i === 0 || i === totalPages - 1}
						<button 
							class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-colors {currentPage === i + 1 ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container-high'}"
							onclick={() => currentPage = i + 1}>
							{i + 1}
						</button>
					{:else if Math.abs(currentPage - (i + 1)) === 3}
						<span class="w-8 h-8 flex items-center justify-center text-on-surface-variant text-sm font-bold">...</span>
					{/if}
				{/each}

				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors"
					disabled={currentPage >= totalPages}
					onclick={() => currentPage += 1}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>

<!-- NEW ACTION MODAL -->
{#if isAddModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick={() => isAddModalOpen = false}></div>
		
		<div class="relative bg-surface-container-lowest rounded-[24px] shadow-xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
			<!-- Modal Header -->
			<div class="px-8 py-6 border-b border-surface-container flex items-center justify-between bg-surface-container-lowest z-10">
				<div>
					<h2 class="text-xl font-bold text-on-surface">Create New Action</h2>
					<p class="text-sm text-on-surface-variant mt-1">Record a mutation, promotion, warning, or termination.</p>
				</div>
				<button class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors" onclick={() => isAddModalOpen = false}>
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<!-- Modal Body -->
			<div class="p-8 overflow-y-auto max-h-[70vh] flex-1">
				<form method="POST" action="?/addAction" id="action-form" class="space-y-6" onsubmit={() => setTimeout(() => window.location.reload(), 500)}>
					
					<!-- 1. Select Employee -->
					<div class="space-y-1.5">
						<label class="text-sm font-bold text-on-surface flex items-center gap-2">
							<span class="material-symbols-outlined text-[16px] text-primary">person</span>
							Select Employee
						</label>
						<select name="employeeId" class="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium cursor-pointer" required>
							<option value="" disabled selected>Search and select employee...</option>
							{#each masterData?.employees || [] as emp}
								<option value={emp.id}>{emp.name} ({emp.id})</option>
							{/each}
						</select>
					</div>

					<!-- 2. Select Action Type -->
					<div class="space-y-1.5">
						<label class="text-sm font-bold text-on-surface flex items-center gap-2">
							<span class="material-symbols-outlined text-[16px] text-primary">category</span>
							Action Type
						</label>
						<select name="actionType" bind:value={actionType} class="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium cursor-pointer" required>
							<option value="" disabled selected>Select action type...</option>
							<option value="Mutation">Mutation (Transfer)</option>
							<option value="Promotion">Promotion</option>
							<option value="Demotion">Demotion</option>
							<option value="Warning">Warning Letter (SP)</option>
							<option value="Termination">Termination (Resign/PHK)</option>
						</select>
					</div>

					<div class="h-px bg-surface-container w-full"></div>

					<!-- 3. Dynamic Form Fields -->
					{#if ['Mutation', 'Promotion', 'Demotion'].includes(actionType)}
						<div class="space-y-4 animate-in fade-in slide-in-from-top-4">
							<h3 class="text-sm font-bold text-primary uppercase tracking-wider mb-2">New Position Details</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">New Title / Role</label>
									<select name="newTitle" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm" required>
										<option value="" disabled selected>Select title...</option>
										{#each masterData?.titles || [] as t}
											<option value={t.id}>{t.name}</option>
										{/each}
									</select>
								</div>
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">New Department</label>
									<select name="newDept" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm" required>
										<option value="" disabled selected>Select department...</option>
										{#each masterData?.departments || [] as d}
											<option value={d.id}>{d.name}</option>
										{/each}
									</select>
								</div>
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">New Location</label>
									<select name="newLoc" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm" required>
										<option value="" disabled selected>Select location...</option>
										{#each masterData?.locations || [] as l}
											<option value={l.id}>{l.name}</option>
										{/each}
									</select>
								</div>
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">Effective Date</label>
									<input type="date" name="effectiveDate" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm" required />
								</div>
								<div class="space-y-1.5 md:col-span-2">
									<label class="text-xs font-bold text-on-surface-variant">Remarks / Reason</label>
									<textarea name="reason" rows="2" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm resize-none"></textarea>
								</div>
							</div>
						</div>
					{:else if actionType === 'Warning'}
						<div class="space-y-4 animate-in fade-in slide-in-from-top-4">
							<h3 class="text-sm font-bold text-error uppercase tracking-wider mb-2">Warning Letter Details</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">Warning Level</label>
									<select name="warningLevel" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-error focus:ring-1 focus:ring-error text-sm" required>
										<option value="" disabled selected>Select SP Level...</option>
										<option value="SP1">SP 1 (First Warning)</option>
										<option value="SP2">SP 2 (Second Warning)</option>
										<option value="SP3">SP 3 (Final Warning)</option>
									</select>
								</div>
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">Issue Date</label>
									<input type="date" name="effectiveDate" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-error focus:ring-1 focus:ring-error text-sm" required />
								</div>
								<div class="space-y-1.5 md:col-span-2">
									<label class="text-xs font-bold text-on-surface-variant">Violation Reason</label>
									<textarea name="reason" rows="3" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-error focus:ring-1 focus:ring-error text-sm resize-none" placeholder="Describe the violation in detail..." required></textarea>
								</div>
							</div>
						</div>
					{:else if actionType === 'Termination'}
						<div class="space-y-4 animate-in fade-in slide-in-from-top-4">
							<h3 class="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Termination Details</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">Termination Type</label>
									<select name="termType" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm" required>
										<option value="" disabled selected>Select reason...</option>
										<option value="Resign">Voluntary Resign</option>
										<option value="Fired">Dismissal (PHK)</option>
										<option value="Contract Ended">End of Contract</option>
										<option value="Retired">Retirement</option>
									</select>
								</div>
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">Effective Out Date</label>
									<input type="date" name="effectiveDate" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm" required />
								</div>
								<div class="space-y-1.5 md:col-span-2">
									<label class="text-xs font-bold text-on-surface-variant">Additional Notes / Handover</label>
									<textarea name="reason" rows="3" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm resize-none" placeholder="e.g. Asset return status, final payload details..."></textarea>
								</div>
							</div>
						</div>
					{/if}
				</form>
			</div>

			<!-- Modal Footer -->
			<div class="px-8 py-5 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3 z-10">
				<button class="px-6 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors" onclick={() => isAddModalOpen = false}>
					Cancel
				</button>
				<button form="action-form" disabled={!actionType} class="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
					<span class="material-symbols-outlined text-sm">save</span>
					Save Action
				</button>
			</div>
		</div>
	</div>
{/if}
