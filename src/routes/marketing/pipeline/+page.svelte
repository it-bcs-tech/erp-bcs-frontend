<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import ContractSimulator from '$lib/components/ContractSimulator.svelte';
	
	let { data }: { data: PageData } = $props();
	
	let deals = $state(data.deals);
	
	$effect(() => {
		deals = data.deals;
	});
	
	// Kanban Stages
	const stages = [
		{ id: 'PROSPECTING', label: 'Prospecting', color: 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700', textColor: 'text-slate-700 dark:text-slate-300' },
		{ id: 'QUOTATION', label: 'Quotation', color: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30', textColor: 'text-blue-700 dark:text-blue-300' },
		{ id: 'NEGOTIATION', label: 'Negotiation', color: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30', textColor: 'text-amber-700 dark:text-amber-300' },
		{ id: 'WON', label: 'Closed Won', color: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30', textColor: 'text-emerald-700 dark:text-emerald-300' },
		{ id: 'LOST', label: 'Closed Lost', color: 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/30', textColor: 'text-rose-700 dark:text-rose-300' }
	];

	let showNewDealModal = $state(false);
	let showQuotationModal = $state(false);
	let showNegotiationModal = $state(false);
	let showWonModal = $state(false);
	let showLostModal = $state(false);
	let showSimulator = $state(false);
	let showDetailModal = $state(false);
	let targetDealId = $state<string | null>(null);
	let detailDeal = $state<any>(null);
	let targetQuotationTonnage = $state('');
	let targetQuotationValue = $state('');
	let targetNegotiationValue = $state('');
	let targetNegotiationNotes = $state('');
	let targetWonSignatory = $state('');
	let targetLostReason = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	let draggedDealId = $state<string | null>(null);

	const stageOrder: Record<string, number> = {
		'PROSPECTING': 1,
		'QUOTATION': 2,
		'NEGOTIATION': 3,
		'WON': 4,
		'LOST': 4
	};

	function formatCurrency(num: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
	}

	function handleDragStart(e: DragEvent, dealId: string) {
		draggedDealId = dealId;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', dealId);
		}
	}

	function handleDrop(e: DragEvent, newStage: string) {
		e.preventDefault();
		if (!draggedDealId) return;
		
		const dealId = draggedDealId;
		const dealIndex = deals.findIndex((d: any) => d.id === dealId);
		
		if (dealIndex !== -1 && deals[dealIndex].stage !== newStage) {
			const oldStage = deals[dealIndex].stage;
			
			// Validation: no skipping stages
			const oldOrder = stageOrder[oldStage];
			const newOrder = stageOrder[newStage];
			
			if (newOrder - oldOrder > 1 || newOrder < oldOrder) {
				errorMessage = `Maaf, tidak boleh melewati tahapan. Harus berurutan dari ${oldStage} ke tahapan berikutnya.`;
				setTimeout(() => errorMessage = '', 4000);
				draggedDealId = null;
				return;
			}
			
			if (newStage === 'QUOTATION' && oldStage === 'PROSPECTING') {
				// Prompt for Tonnage and Value
				targetDealId = dealId;
				showQuotationModal = true;
				draggedDealId = null;
				return;
			}
			
			if (newStage === 'NEGOTIATION' && oldStage === 'QUOTATION') {
				// Prompt for Revised Value and Notes
				targetDealId = dealId;
				// Pre-fill with current value
				targetNegotiationValue = deals[dealIndex].estimated_value;
				targetNegotiationNotes = deals[dealIndex].notes || '';
				showNegotiationModal = true;
				draggedDealId = null;
				return;
			}
			
			if (newStage === 'WON' && oldStage === 'NEGOTIATION') {
				targetDealId = dealId;
				targetWonSignatory = deals[dealIndex].contact_person || '';
				showWonModal = true;
				draggedDealId = null;
				return;
			}
			
			if (newStage === 'LOST') {
				targetDealId = dealId;
				showLostModal = true;
				draggedDealId = null;
				return;
			}
			
			// Optimistic UI Update
			deals[dealIndex].stage = newStage;
			
			const formData = new FormData();
			formData.append('dealId', dealId);
			formData.append('newStage', newStage);
			
			fetch('?/moveStage', {
				method: 'POST',
				body: formData
			}).catch(() => {
				deals[dealIndex].stage = oldStage;
			});
		}
		draggedDealId = null;
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
	}
</script>

<svelte:head>
	<title>Sales Pipeline | Marketing</title>
</svelte:head>

<div class="flex flex-col h-full overflow-hidden">
	<!-- Header & Actions -->
	<header class="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Sales Pipeline</h1>
			<p class="text-on-surface-variant font-medium text-sm">Track and manage your prospect deals through the sales cycle.</p>
		</div>
		<div class="flex items-center gap-4">
			{#if errorMessage}
				<div class="bg-rose-100 text-rose-700 px-4 py-2 rounded-lg text-xs font-bold animate-pulse">
					{errorMessage}
				</div>
			{/if}
			<button onclick={() => showNewDealModal = true} class="bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-rose-700 transition-colors">
				<span class="material-symbols-outlined text-lg">add_circle</span>
				New Deal
			</button>
		</div>
	</header>

	<!-- Kanban Board -->
	<div class="flex-1 flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
		{#each stages as stage}
			<div 
				class="flex-shrink-0 w-80 flex flex-col rounded-2xl border {stage.color} overflow-hidden"
				ondragover={handleDragOver}
				ondrop={(e) => handleDrop(e, stage.id)}
				role="region"
				aria-label="{stage.label} Column"
			>
				<!-- Column Header -->
				<div class="p-4 border-b {stage.color.split(' ')[2]}">
					<div class="flex items-center justify-between mb-1">
						<h3 class="font-black {stage.textColor} uppercase tracking-wider text-sm">{stage.label}</h3>
						<span class="bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full text-xs font-bold {stage.textColor}">
							{deals.filter((d: any) => d.stage === stage.id).length}
						</span>
					</div>
					<p class="text-[10px] font-bold opacity-70 {stage.textColor}">
						{formatCurrency(deals.filter((d: any) => d.stage === stage.id).reduce((sum: number, d: any) => sum + Number(d.estimated_value), 0))}
					</p>
				</div>

				<!-- Column Body / Cards -->
				<div class="flex-1 p-3 overflow-y-auto space-y-3">
					{#each deals.filter((d: any) => d.stage === stage.id) as deal}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div 
							draggable="true"
							ondragstart={(e) => handleDragStart(e, deal.id)}
							onclick={() => { detailDeal = deal; showDetailModal = true; }}
							class="bg-surface-container-lowest border border-surface-container rounded-xl p-4 shadow-sm cursor-grab active:cursor-grabbing hover:border-rose-300 transition-colors group relative"
						>
							<div class="flex justify-between items-start mb-2">
								<h4 class="font-bold text-sm text-on-surface group-hover:text-rose-600 transition-colors">{deal.company_name}</h4>
								<span class="text-[9px] font-black uppercase text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
									{deal.project_category}
								</span>
							</div>
							
							{#if deal.is_converted}
								<div class="mb-2">
									<span class="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded flex w-fit items-center gap-1 border border-emerald-200">
										<span class="material-symbols-outlined text-[10px]">task_alt</span>
										Converted to Contract
									</span>
								</div>
							{/if}
							
							{#if stage.id === 'QUOTATION' || stage.id === 'NEGOTIATION'}
								<button onclick={(e) => { e.stopPropagation(); targetDealId = deal.id; showSimulator = true; }} class="mb-3 w-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
									<span class="material-symbols-outlined text-[14px]">calculate</span>
									Open Margin Simulator
								</button>
							{/if}
							
							<div class="mb-3">
								<p class="text-xs text-on-surface-variant font-medium flex items-center gap-1.5 mb-1">
									<span class="material-symbols-outlined text-[14px]">person</span>
									{deal.contact_person || '-'}
								</p>
								{#if deal.estimated_tonnage}
									<p class="text-xs text-on-surface-variant font-medium flex items-center gap-1.5 mb-1">
										<span class="material-symbols-outlined text-[14px]">weight</span>
										{deal.estimated_tonnage} Ton
									</p>
								{/if}
								{#if deal.notes}
									<div class="mt-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg p-2 flex items-start gap-1.5">
										<span class="material-symbols-outlined text-[14px] text-amber-600 mt-0.5">speaker_notes</span>
										<p class="text-[10px] text-amber-800 dark:text-amber-300 font-medium leading-snug">{deal.notes}</p>
									</div>
								{/if}
								{#if deal.loss_reason}
									<div class="mt-2 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 rounded-lg p-2 flex items-start gap-1.5">
										<span class="material-symbols-outlined text-[14px] text-rose-600 mt-0.5">flag</span>
										<p class="text-[10px] text-rose-800 dark:text-rose-300 font-medium leading-snug">{deal.loss_reason}</p>
									</div>
								{/if}
							</div>

							<div class="pt-3 border-t border-surface-container/50 flex items-end justify-between">
								<div>
									<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-0.5">Est. Value</p>
									<p class="text-sm font-black text-on-surface">{formatCurrency(deal.estimated_value)}</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<!-- Modal Create Deal -->
{#if showNewDealModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={() => showNewDealModal = false}></div>
		<div class="relative w-full max-w-lg bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-xl font-bold text-on-surface">Create New Deal</h3>
						<p class="text-xs text-on-surface-variant mt-1">Add a new prospect to the pipeline.</p>
					</div>
					<button onclick={() => showNewDealModal = false} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>
			
			<form method="POST" action="?/createDeal" use:enhance={() => {
				isSubmitting = true;
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						showNewDealModal = false;
						// Update local state by triggering a load refresh natively via sveltekit update()
					}
					update();
				};
			}}>
				<div class="p-6 overflow-y-auto space-y-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Company Name *</label>
						<input type="text" name="company_name" required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Contact Person</label>
							<input type="text" name="contact_person" class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Phone</label>
							<input type="text" name="phone" class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
						</div>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Project Category *</label>
						<select name="project_category" required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
							<option value="">-- Select Category --</option>
							<option value="TRANSPORTATION">Transportation</option>
							<option value="WAREHOUSE">Warehouse</option>
							<option value="RENTAL">Rental</option>
							<option value="OUTSOURCING">Outsourcing</option>
							<option value="PACKAGING">Packaging</option>
						</select>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Expected Start Date</label>
						<input type="date" name="expected_date" class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
					</div>
				</div>
				
				<div class="p-6 border-t border-surface-container bg-surface-container-low/50 flex justify-end gap-3">
					<button type="button" onclick={() => showNewDealModal = false} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">Cancel</button>
					<button type="submit" disabled={isSubmitting} class="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50">
						{isSubmitting ? 'Saving...' : 'Create Deal'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Quotation Value -->
{#if showQuotationModal && targetDealId}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={() => showQuotationModal = false}></div>
		<div class="relative w-full max-w-sm bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container">
				<h3 class="text-xl font-bold text-on-surface">Input Quotation</h3>
				<p class="text-xs text-on-surface-variant mt-1">Input estimated value to move to the Quotation stage.</p>
			</div>
			
			<form method="POST" action="?/moveStage" use:enhance={() => {
				isSubmitting = true;
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						showQuotationModal = false;
						targetQuotationTonnage = '';
						targetQuotationValue = '';
					}
					update();
				};
			}}>
				<input type="hidden" name="dealId" value={targetDealId} />
				<input type="hidden" name="newStage" value="QUOTATION" />
				<div class="p-6 space-y-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Est. Tonnage (Ton)</label>
						<input type="number" step="0.01" name="estimated_tonnage" bind:value={targetQuotationTonnage} required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Est. Value (Rp)</label>
						<input type="number" name="estimated_value" bind:value={targetQuotationValue} required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
					</div>
				</div>
				<div class="p-6 border-t border-surface-container bg-surface-container-low/50 flex justify-end gap-3">
					<button type="button" onclick={() => showQuotationModal = false} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">Cancel</button>
					<button type="submit" disabled={isSubmitting} class="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50">
						{isSubmitting ? 'Saving...' : 'Continue'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Negotiation -->
{#if showNegotiationModal && targetDealId}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={() => showNegotiationModal = false}></div>
		<div class="relative w-full max-w-sm bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container">
				<h3 class="text-xl font-bold text-on-surface">Update Negotiation</h3>
				<p class="text-xs text-on-surface-variant mt-1">Adjust negotiation value (if any) and log the negotiation details.</p>
			</div>
			
			<form method="POST" action="?/moveStage" use:enhance={() => {
				isSubmitting = true;
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						showNegotiationModal = false;
						targetNegotiationValue = '';
						targetNegotiationNotes = '';
					}
					update();
				};
			}}>
				<input type="hidden" name="dealId" value={targetDealId} />
				<input type="hidden" name="newStage" value="NEGOTIATION" />
				<div class="p-6 space-y-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Revised Est. Value (Rp)</label>
						<input type="number" name="estimated_value" bind:value={targetNegotiationValue} required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Negotiation Notes / Client Conditions</label>
						<textarea name="notes" bind:value={targetNegotiationNotes} required rows="3" placeholder="Client requested a lower price..." class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"></textarea>
					</div>
				</div>
				<div class="p-6 border-t border-surface-container bg-surface-container-low/50 flex justify-end gap-3">
					<button type="button" onclick={() => showNegotiationModal = false} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">Cancel</button>
					<button type="submit" disabled={isSubmitting} class="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50">
						{isSubmitting ? 'Saving...' : 'Update Deal'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal WON (Convert to Contract) -->
{#if showWonModal && targetDealId}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={() => showWonModal = false}></div>
		<div class="relative w-full max-w-sm bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container text-center">
				<div class="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-50 dark:border-emerald-900/10">
					<span class="material-symbols-outlined text-4xl text-emerald-500">celebration</span>
				</div>
				<h3 class="text-xl font-black text-on-surface">Tender Won!</h3>
				<p class="text-xs text-on-surface-variant mt-2">A Master Customer and New Contract Draft will be automatically created for this deal.</p>
			</div>
			
			<form method="POST" action="?/convertToContract" use:enhance={() => {
				isSubmitting = true;
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						showWonModal = false;
						targetWonSignatory = '';
					}
					update();
				};
			}}>
				<input type="hidden" name="dealId" value={targetDealId} />
				<div class="p-6">
					<label class="block text-xs font-bold text-on-surface-variant mb-2">Contract Signatory PIC Name</label>
					<input type="text" name="contact_person" bind:value={targetWonSignatory} required placeholder="e.g., Mr. Budi" class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
				</div>
				<div class="p-6 border-t border-surface-container bg-surface-container-low/50 flex justify-end gap-3">
					<button type="button" onclick={() => showWonModal = false} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">Cancel</button>
					<button type="submit" disabled={isSubmitting} class="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50">
						{isSubmitting ? 'Processing...' : 'Create Contract!'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal LOST (Loss Reason) -->
{#if showLostModal && targetDealId}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={() => showLostModal = false}></div>
		<div class="relative w-full max-w-sm bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container text-center">
				<div class="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-rose-50 dark:border-rose-900/10">
					<span class="material-symbols-outlined text-4xl text-rose-500">thumb_down</span>
				</div>
				<h3 class="text-xl font-black text-on-surface">Deal Lost</h3>
				<p class="text-xs text-on-surface-variant mt-2">Please note the specific reason for this loss for management evaluation.</p>
			</div>
			
			<form method="POST" action="?/moveStage" use:enhance={() => {
				isSubmitting = true;
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						showLostModal = false;
						targetLostReason = '';
					}
					update();
				};
			}}>
				<input type="hidden" name="dealId" value={targetDealId} />
				<input type="hidden" name="newStage" value="LOST" />
				<div class="p-6">
					<label class="block text-xs font-bold text-on-surface-variant mb-2">Loss Reason</label>
					<textarea name="loss_reason" bind:value={targetLostReason} required rows="3" placeholder="e.g., Competitor X is cheaper..." class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"></textarea>
				</div>
				<div class="p-6 border-t border-surface-container bg-surface-container-low/50 flex justify-end gap-3">
					<button type="button" onclick={() => showLostModal = false} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">Cancel</button>
					<button type="submit" disabled={isSubmitting} class="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50">
						{isSubmitting ? 'Saving...' : 'Save Data'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Contract Simulator Component -->
<ContractSimulator 
	bind:isOpen={showSimulator} 
	availableUnits={data.availableUnits} 
	onApply={(simData) => {
		// Auto-fill values if a modal is currently open
		if (showQuotationModal) {
			targetQuotationTonnage = simData.tonnage.toString();
			targetQuotationValue = simData.value.toString();
		} else if (showNegotiationModal) {
			targetNegotiationValue = simData.value.toString();
		} else if (targetDealId) {
			// Find the deal to see its stage
			const currentDeal = data.deals.find(d => d.id === targetDealId);
			if (currentDeal) {
				if (currentDeal.stage === 'QUOTATION') {
					targetQuotationTonnage = simData.tonnage.toString();
					targetQuotationValue = simData.value.toString();
					showQuotationModal = true;
				} else if (currentDeal.stage === 'NEGOTIATION') {
					targetNegotiationValue = simData.value.toString();
					targetNegotiationNotes = currentDeal.notes || '';
					showNegotiationModal = true;
				}
			}
		} else {
			targetQuotationTonnage = simData.tonnage.toString();
			targetQuotationValue = simData.value.toString();
		}
	}} 
/>

<!-- Modal Detail & Activity Log -->
{#if showDetailModal && detailDeal}
	<div class="fixed inset-0 z-50 flex items-center justify-end p-4 sm:p-0">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={() => showDetailModal = false}></div>
		<div class="relative w-full max-w-lg h-full sm:h-auto sm:max-h-screen bg-surface-container-lowest sm:rounded-l-[24px] shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
			<div class="p-6 border-b border-surface-container flex items-start justify-between bg-surface-container-low/50">
				<div>
					<h3 class="text-xl font-bold text-on-surface flex items-center gap-2">
						{detailDeal.company_name}
					</h3>
					<p class="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
						<span class="material-symbols-outlined text-[14px]">person</span> {detailDeal.contact_person || 'No Contact'} | {detailDeal.phone || '-'}
					</p>
				</div>
				<button onclick={() => showDetailModal = false} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>
			
			<div class="flex-1 overflow-y-auto p-6 space-y-8 bg-surface-container-lowest">
				
				<!-- Quick Info -->
				<div class="grid grid-cols-2 gap-4">
					<div class="bg-surface-container-low p-4 rounded-2xl">
						<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Project Category</p>
						<p class="text-sm font-black text-on-surface">{detailDeal.project_category}</p>
					</div>
					<div class="bg-surface-container-low p-4 rounded-2xl">
						<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Est. Tonnage</p>
						<p class="text-sm font-black text-on-surface">{detailDeal.estimated_tonnage ? detailDeal.estimated_tonnage + ' Ton' : '-'}</p>
					</div>
					<div class="col-span-2 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl">
						<p class="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-1">Estimated Quotation Value (Rp)</p>
						<p class="text-xl font-black text-indigo-800 dark:text-indigo-300">{formatCurrency(detailDeal.estimated_value || 0)}</p>
					</div>
				</div>

				<!-- Activity Log Section -->
				<div>
					<div class="flex items-center justify-between mb-4 border-b border-surface-container pb-2">
						<h4 class="text-sm font-black text-on-surface">Activity History</h4>
					</div>

					<!-- Form Add Activity -->
					<form method="POST" action="?/addActivity" class="bg-surface-container-low p-4 rounded-2xl mb-6 border border-surface-container" use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							isSubmitting = false;
							update();
						};
					}}>
						<input type="hidden" name="dealId" value={detailDeal.id} />
						<div class="mb-3">
							<select name="activity_type" required class="w-full bg-surface-container-lowest border border-surface-container rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50">
								<option value="MEETING">🤝 Meeting On-site</option>
								<option value="CALL">📞 Telepon / WhatsApp</option>
								<option value="EMAIL">📧 Kirim Email / Dokumen</option>
								<option value="NOTE">📝 Catatan Internal</option>
							</select>
						</div>
						<div class="mb-3">
							<textarea name="description" required rows="2" placeholder="Tuliskan hasil diskusi / catatan follow up..." class="w-full bg-surface-container-lowest border border-surface-container rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"></textarea>
						</div>
						<div class="flex justify-end">
							<button type="submit" disabled={isSubmitting} class="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-1.5 disabled:opacity-50">
								<span class="material-symbols-outlined text-[14px]">add</span> {isSubmitting ? 'Menyimpan...' : 'Tambah Log'}
							</button>
						</div>
					</form>

					<!-- Timeline -->
					<div class="space-y-4 pl-2 border-l-2 border-surface-container ml-2">
						{#each data.activities.filter((a: any) => a.deal_id === detailDeal.id) as act}
							<div class="relative pl-6">
								<div class="absolute -left-[29px] top-0 w-6 h-6 rounded-full flex items-center justify-center border-4 border-surface-container-lowest
									{act.activity_type === 'MEETING' ? 'bg-indigo-100 text-indigo-600' : 
									 act.activity_type === 'CALL' ? 'bg-emerald-100 text-emerald-600' : 
									 act.activity_type === 'EMAIL' ? 'bg-sky-100 text-sky-600' : 'bg-slate-200 text-slate-600'}">
									<span class="material-symbols-outlined text-[10px]">
										{act.activity_type === 'MEETING' ? 'handshake' : 
										 act.activity_type === 'CALL' ? 'call' : 
										 act.activity_type === 'EMAIL' ? 'mail' : 'sticky_note_2'}
									</span>
								</div>
								<div class="bg-surface-container-low p-3 rounded-r-xl rounded-bl-xl border border-surface-container">
									<div class="flex justify-between items-start mb-1">
										<p class="text-[10px] font-bold text-on-surface">{act.activity_type}</p>
										<p class="text-[9px] font-medium text-on-surface-variant">
											{new Date(act.activity_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
										</p>
									</div>
									<p class="text-xs text-on-surface-variant leading-relaxed">{act.description}</p>
								</div>
							</div>
						{:else}
							<div class="pl-4">
								<p class="text-xs text-on-surface-variant italic">Belum ada riwayat aktivitas.</p>
							</div>
						{/each}
					</div>
					
					<div class="mt-8 pt-4 border-t border-surface-container flex justify-center">
						<a href="/marketing/pipeline/quotation/{detailDeal.id}" class="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
							<span class="material-symbols-outlined text-[18px]">print</span> Cetak Dokumen Penawaran
						</a>
					</div>
					
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes slide-in-right {
		from { transform: translateX(100%); }
		to { transform: translateX(0); }
	}
	.animate-slide-in-right {
		animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}
</style>
