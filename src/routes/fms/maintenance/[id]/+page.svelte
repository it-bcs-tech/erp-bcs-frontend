<script lang="ts">
	import { page } from '$app/stores';

	let { data } = $props();
	const { workOrder, dnHeader, dnDetails } = data;

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', {
			year: 'numeric', month: 'long', day: 'numeric',
			hour: '2-digit', minute: '2-digit'
		});
	}

	function formatCurrency(amount) {
		if (!amount) return 'Rp 0';
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	}

	let showExecuteModal = $state(false);
	let isSubmitting = $state(false);
	let editProblem = $state(workOrder.problem || '');
	let editCause = $state(workOrder.cause || '');
	let editStatus = $state(workOrder.status || 'Proses');
	// Deep copy checklist for editing so we don't mutate the view immediately
	let editChecklist = $state(JSON.parse(JSON.stringify(workOrder.checklist_parsed || [])));

	// DN Request States
	let showSparepartsModal = $state(false);
	let showAssignModal = $state(false);
	let isSubmittingDn = $state(false);
	let requestedParts = $state([{ id: '', code: '', name: '', price: 0, qty: 1, displayValue: '', showDropdown: false }]);
	let dnNote = $state('');

	function addPart() {
		requestedParts.push({ id: '', code: '', name: '', price: 0, qty: 1, displayValue: '', showDropdown: false });
	}

	function removePart(index) {
		requestedParts.splice(index, 1);
	}

	function getFilteredMaterials(search) {
		const q = search.toLowerCase();
		return (data.materials || []).filter(m => 
			m.name.toLowerCase().includes(q) || 
			m.code.toLowerCase().includes(q)
		);
	}
</script>

<svelte:head>
	<title>Work Order {workOrder.wo_no} | FMS Maintenance</title>
</svelte:head>

<div class="flex flex-col h-full max-w-6xl mx-auto space-y-6">
	<!-- Breadcrumb & Header -->
	<div class="flex justify-between items-center">
		<nav class="flex items-center text-sm font-medium text-on-surface-variant">
			<a href="/fms" class="hover:text-primary transition-colors">FMS</a>
			<span class="material-symbols-outlined text-[16px] mx-1">chevron_right</span>
			<a href="/fms/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
			<span class="material-symbols-outlined text-[16px] mx-1">chevron_right</span>
			<span class="text-on-surface font-bold">WO Details</span>
		</nav>
	</div>

	<!-- Header Card -->
	<div class="bg-surface-container-lowest rounded-[32px] p-8 shadow-sm">
		<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
			<div>
				<p class="text-sm font-black tracking-widest text-on-surface-variant uppercase mb-2">Work Order</p>
				<h1 class="text-3xl font-black text-on-surface tracking-tight mb-2">{workOrder.wo_no}</h1>
				<div class="flex items-center gap-3 text-sm font-medium text-on-surface-variant">
					<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">local_shipping</span> {workOrder.unit_id}</span>
					<span class="w-1 h-1 rounded-full bg-outline-variant"></span>
					<span class="flex items-center gap-1">
						<span class="material-symbols-outlined text-[18px]">engineering</span> 
						{workOrder.mechanic_name || 'Unassigned Mechanic'}
						{#if !workOrder.mechanic_name}
							<button onclick={() => showAssignModal = true} class="ml-2 text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md hover:bg-primary/20 transition-colors">Assign</button>
						{/if}
					</span>
					<span class="w-1 h-1 rounded-full bg-outline-variant"></span>
					<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">calendar_today</span> {formatDate(workOrder.wo_date)}</span>
				</div>
			</div>
			
			<div class="text-right">
				<p class="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Status</p>
				{#if workOrder.status?.toLowerCase().includes('open') || workOrder.status?.toLowerCase().includes('overdue')}
					<span class="inline-flex items-center gap-2 text-rose-700 font-bold text-sm bg-rose-500/20 px-4 py-2 rounded-full border border-rose-600/20">
						<span class="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span> {workOrder.status}
					</span>
				{:else if workOrder.status?.toLowerCase().includes('proses') || workOrder.status?.toLowerCase().includes('progress')}
					<span class="inline-flex items-center gap-2 text-blue-700 font-bold text-sm bg-blue-500/20 px-4 py-2 rounded-full border border-blue-600/20">
						<span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span> {workOrder.status}
					</span>
				{:else if workOrder.status?.toLowerCase().includes('close') || workOrder.status?.toLowerCase().includes('complete')}
					<span class="inline-flex items-center gap-2 text-emerald-700 font-bold text-sm bg-emerald-500/20 px-4 py-2 rounded-full border border-emerald-600/20">
						<span class="w-2 h-2 rounded-full bg-emerald-600"></span> {workOrder.status}
					</span>
				{:else}
					<span class="inline-flex items-center gap-2 text-slate-700 font-bold text-sm bg-slate-500/20 px-4 py-2 rounded-full border border-slate-600/20">
						<span class="w-2 h-2 rounded-full bg-slate-600"></span> {workOrder.status}
					</span>
				{/if}
				
				{#if !workOrder.status?.toLowerCase().includes('close') && !workOrder.status?.toLowerCase().includes('complete')}
					<div class="mt-4 flex flex-col gap-2">
						<button 
							type="button"
							onclick={() => showExecuteModal = true}
							class="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-sm hover:bg-primary/90 transition-colors"
						>
							<span class="material-symbols-outlined text-[18px]">engineering</span>
							Execute WO
						</button>
						<button 
							type="button"
							onclick={() => showSparepartsModal = true}
							class="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-sm hover:bg-emerald-700 transition-colors"
						>
							<span class="material-symbols-outlined text-[18px]">inventory_2</span>
							Request Spareparts
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left Column: Details & Checklist -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Issue Details -->
			<div class="bg-surface-container-lowest rounded-[24px] p-6 shadow-sm">
				<h2 class="text-lg font-black text-on-surface mb-6 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">report_problem</span>
					Issue Report
				</h2>
				
				<div class="grid grid-cols-2 gap-6 mb-6">
					<div>
						<p class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Driver Complaint</p>
						<p class="text-sm font-semibold text-on-surface">{workOrder.keluhan_driver || '-'}</p>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Maintenance Category</p>
						<p class="text-sm font-semibold text-on-surface">{workOrder.maint_category || '-'}</p>
					</div>
				</div>
				
				<div class="grid grid-cols-2 gap-6">
					<div>
						<p class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Actual Problem (Mechanic)</p>
						<p class="text-sm font-medium text-on-surface">{workOrder.problem || '-'}</p>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Root Cause</p>
						<p class="text-sm font-medium text-on-surface">{workOrder.cause || '-'}</p>
					</div>
				</div>
			</div>

			<!-- JSONB Checklist -->
			<div class="bg-surface-container-lowest rounded-[24px] p-6 shadow-sm">
				<h2 class="text-lg font-black text-on-surface mb-6 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">fact_check</span>
					Inspection Checklist
				</h2>

				{#if workOrder.checklist_parsed && workOrder.checklist_parsed.length > 0}
					<div class="space-y-3">
						{#each workOrder.checklist_parsed as item}
							<div class="flex items-center justify-between p-3 rounded-xl border border-surface-container hover:bg-surface-container-low transition-colors">
								<div class="flex flex-col">
									<span class="text-sm font-bold text-on-surface capitalize">{item.item}</span>
									{#if item.remark}
										<span class="text-xs text-on-surface-variant">{item.remark}</span>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									{#if item.status === 'OK'}
										<span class="material-symbols-outlined text-emerald-500">check_circle</span>
										<span class="text-xs font-bold text-emerald-600">OK</span>
									{:else if item.status === 'Not Yet'}
										<span class="material-symbols-outlined text-slate-400">radio_button_unchecked</span>
										<span class="text-xs font-bold text-slate-500">Not Yet</span>
									{:else}
										<span class="material-symbols-outlined text-amber-500">warning</span>
										<span class="text-xs font-bold text-amber-600">{item.status}</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="bg-surface-container-low p-6 rounded-xl text-center border border-dashed border-outline-variant/30">
						<span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">assignment_late</span>
						<p class="text-sm font-bold text-on-surface">No Checklist Data</p>
						<p class="text-xs text-on-surface-variant mt-1">This work order doesn't have an inspection checklist.</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Right Column: Spareparts -->
		<div class="space-y-6">
			<div class="bg-surface-container-lowest rounded-[24px] shadow-sm overflow-hidden">
				<div class="p-6 border-b border-surface-container">
					<h2 class="text-lg font-black text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-primary">build_circle</span>
						Spareparts / Delivery Note
					</h2>
					{#if dnHeader}
						<p class="text-xs font-medium text-on-surface-variant mt-2">DN No: {dnHeader.dn_no}</p>
					{/if}
				</div>

				<div class="p-0">
					{#if dnDetails && dnDetails.length > 0}
						<div class="divide-y divide-surface-container">
							{#each dnDetails as part}
								<div class="p-6 hover:bg-surface-container-low transition-colors">
									<div class="flex justify-between items-start mb-2">
										<div>
											<p class="text-sm font-bold text-on-surface">{part.material_name || 'Material #' + part.material_id}</p>
											<p class="text-xs text-on-surface-variant mt-0.5">Loc: {part.location}</p>
										</div>
										<p class="text-sm font-black text-on-surface">{formatCurrency(part.total)}</p>
									</div>
									<div class="flex items-center gap-4 mt-3">
										<div class="bg-surface-container px-3 py-1.5 rounded-lg flex-1">
											<p class="text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">Req Qty</p>
											<p class="text-sm font-semibold text-on-surface">{part.qty_request}</p>
										</div>
										<div class="bg-surface-container px-3 py-1.5 rounded-lg flex-1">
											<p class="text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">Actual Qty</p>
											<p class="text-sm font-semibold text-emerald-600">{part.qty_actual}</p>
										</div>
									</div>
								</div>
							{/each}
						</div>
						<div class="p-6 bg-surface-container-low border-t border-surface-container">
							<div class="flex justify-between items-center">
								<p class="text-sm font-bold text-on-surface-variant uppercase">Total Cost</p>
								<p class="text-xl font-black text-primary">
									{formatCurrency(dnDetails.reduce((sum, item) => sum + parseFloat(item.total), 0))}
								</p>
							</div>
						</div>
					{:else}
						<div class="p-8 text-center">
							<span class="material-symbols-outlined text-4xl text-on-surface-variant mb-3">inventory_2</span>
							<p class="text-sm font-bold text-on-surface">No Spareparts Used</p>
							<p class="text-xs text-on-surface-variant mt-1">There are no material delivery notes associated with this Work Order.</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<!-- ASSIGN MECHANIC MODAL -->
{#if showAssignModal}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick={() => showAssignModal = false}></div>
		<div class="relative w-full max-w-md bg-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden">
			<div class="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-low">
				<h2 class="text-xl font-black text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">person_add</span>
					Assign Mechanic
				</h2>
				<button onclick={() => showAssignModal = false} class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface-variant">
					<span class="material-symbols-outlined text-[20px]">close</span>
				</button>
			</div>
			
			<div class="p-6">
				<form 
					id="assignForm"
					method="POST" 
					action="?/assignMechanic"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							await update();
							isSubmitting = false;
							showAssignModal = false;
						};
					}}
					class="space-y-6"
				>
					<div>
						<label for="mechanic_id" class="block text-sm font-bold text-on-surface mb-2">Select Mechanic</label>
						<select 
							id="mechanic_id" 
							name="mechanic_id" 
							required
							class="w-full px-4 py-3 bg-surface border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
						>
							<option value="">-- Choose Mechanic --</option>
							{#each data.mechanics as mech}
								<option value={mech.id}>{mech.name}</option>
							{/each}
						</select>
					</div>
				</form>
			</div>
			
			<div class="p-4 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
				<button 
					type="button"
					onclick={() => showAssignModal = false}
					class="px-6 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
				>
					Cancel
				</button>
				<button 
					type="submit"
					form="assignForm"
					disabled={isSubmitting}
					class="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center gap-2"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
						Saving...
					{:else}
						<span class="material-symbols-outlined text-[18px]">check</span>
						Assign Now
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showExecuteModal}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick={() => showExecuteModal = false} role="button" tabindex="0" onkeydown={(e) => e.key === 'Escape' && (showExecuteModal = false)}></div>
		<div class="relative w-full max-w-2xl bg-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
			<div class="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-low">
				<h2 class="text-xl font-black text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">engineering</span>
					Execute Work Order
				</h2>
				<button onclick={() => showExecuteModal = false} class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface-variant">
					<span class="material-symbols-outlined text-[20px]">close</span>
				</button>
			</div>
			
			<div class="p-6 overflow-y-auto flex-1">
				<form 
					id="executeWoForm"
					method="POST" 
					action="?/updateWO"
					onsubmit={() => isSubmitting = true}
					class="space-y-6"
				>
					<input type="hidden" name="checklist_items" value={JSON.stringify(editChecklist)} />
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="col-span-full md:col-span-1">
							<label for="status" class="block text-sm font-bold text-on-surface mb-2">Update Status</label>
							<select 
								id="status" 
								name="status" 
								bind:value={editStatus}
								class="w-full px-4 py-3 bg-surface border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
							>
								<option value="Open">Open</option>
								<option value="Proses">Proses</option>
								<option value="Closed">Closed</option>
							</select>
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label for="problem" class="block text-sm font-bold text-on-surface mb-2">Actual Problem</label>
							<textarea 
								id="problem" 
								name="problem" 
								bind:value={editProblem}
								rows="3"
								placeholder="Describe what is actually broken..."
								class="w-full p-4 bg-surface border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium resize-y"
							></textarea>
						</div>
						<div>
							<label for="cause" class="block text-sm font-bold text-on-surface mb-2">Root Cause</label>
							<textarea 
								id="cause" 
								name="cause" 
								bind:value={editCause}
								rows="3"
								placeholder="Why did this happen? (e.g. Wear and tear, negligence)"
								class="w-full p-4 bg-surface border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium resize-y"
							></textarea>
						</div>
					</div>

					<div class="pt-4 border-t border-surface-container">
						<h3 class="text-md font-bold text-on-surface mb-4 flex items-center gap-2">
							<span class="material-symbols-outlined text-primary text-[20px]">fact_check</span>
							Update Inspection Checklist
						</h3>
						
						{#if editChecklist.length > 0}
							<div class="space-y-3">
								{#each editChecklist as item, i}
									<div class="p-4 rounded-xl border border-surface-container bg-surface-container-low flex flex-col md:flex-row gap-4 md:items-center">
										<div class="flex-1">
											<p class="text-sm font-bold text-on-surface capitalize">{item.item}</p>
										</div>
										<div class="flex items-center gap-2 flex-wrap">
											<select 
												bind:value={item.status}
												class="px-3 py-1.5 bg-surface border border-outline-variant/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs font-bold w-full md:w-32"
											>
												<option value="Not Yet">Not Yet</option>
												<option value="OK">OK</option>
												<option value="Warning">Warning</option>
												<option value="Not OK">Not OK</option>
											</select>
											<input 
												type="text" 
												bind:value={item.remark}
												placeholder="Remark..."
												class="px-3 py-1.5 bg-surface border border-outline-variant/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs font-medium flex-1 min-w-[150px]"
											/>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-on-surface-variant italic">No checklist items for this Work Order.</p>
						{/if}
					</div>
				</form>
			</div>
			
			<div class="p-4 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
				<button 
					type="button"
					onclick={() => showExecuteModal = false}
					class="px-6 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
				>
					Cancel
				</button>
				<button 
					type="submit"
					form="executeWoForm"
					disabled={isSubmitting}
					class="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center gap-2"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
						Saving...
					{:else}
						<span class="material-symbols-outlined text-[18px]">save</span>
						Save Execution
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showSparepartsModal}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick={() => showSparepartsModal = false} role="button" tabindex="0" onkeydown={(e) => e.key === 'Escape' && (showSparepartsModal = false)}></div>
		<div class="relative w-full max-w-4xl bg-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
			<div class="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-low">
				<h2 class="text-xl font-black text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600">inventory_2</span>
					Request Spareparts (Delivery Note)
				</h2>
				<button onclick={() => showSparepartsModal = false} class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface-variant">
					<span class="material-symbols-outlined text-[20px]">close</span>
				</button>
			</div>
			
			<div class="p-6 overflow-y-auto flex-1">
				<form 
					id="createDnForm"
					method="POST" 
					action="?/createDN"
					onsubmit={() => isSubmittingDn = true}
					class="space-y-6 pb-48"
				>
					<input type="hidden" name="requested_parts" value={JSON.stringify(requestedParts)} />
					
					<div>
						<label for="note" class="block text-sm font-bold text-on-surface mb-2">Request Note / Reference</label>
						<input 
							type="text" 
							id="note" 
							name="note" 
							bind:value={dnNote}
							placeholder="e.g. Parts needed for brake replacement..."
							class="w-full px-4 py-3 bg-surface border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-medium"
						/>
					</div>

					<div class="pt-2">
						<div class="flex justify-between items-end mb-4">
							<h3 class="text-md font-bold text-on-surface">Material List</h3>
							<button 
								type="button" 
								onclick={addPart}
								class="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
							>
								<span class="material-symbols-outlined text-[16px]">add</span> Add Row
							</button>
						</div>

						<div class="space-y-3">
							{#each requestedParts as part, i}
								<div class="flex flex-col md:flex-row gap-3 items-start md:items-center p-3 border border-surface-container rounded-xl bg-surface-container-low">
									<div class="flex-1 w-full relative">
										<input 
											type="text" 
											required
											bind:value={part.displayValue}
											onfocus={() => part.showDropdown = true}
											onblur={() => setTimeout(() => part.showDropdown = false, 200)}
											placeholder="Search material..."
											class="w-full pl-3 pr-8 py-2 bg-surface border border-outline-variant/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-medium"
											autocomplete="off"
										/>
										{#if part.showDropdown}
											<ul class="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg max-h-48 overflow-y-auto hide-scrollbar">
												{#each getFilteredMaterials(part.displayValue) as mat}
													<!-- svelte-ignore a11y_click_events_have_key_events -->
													<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
													<li 
														class="px-4 py-2 text-sm text-on-surface cursor-pointer hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0" 
														onclick={() => { 
															part.id = mat.id;
															part.code = mat.code;
															part.name = mat.name;
															part.price = mat.price || 0;
															part.displayValue = `${mat.code} - ${mat.name}`;
															part.showDropdown = false;
														}}
													>
														<div class="font-bold">{mat.name}</div>
														<div class="text-xs mt-1 flex justify-between items-center">
															<span class="text-on-surface-variant font-medium bg-surface-container px-1.5 py-0.5 rounded">{mat.code}</span>
															<span class="font-bold {mat.stock > 0 ? 'text-emerald-600 bg-emerald-500/10' : 'text-rose-600 bg-rose-500/10'} px-1.5 py-0.5 rounded">Stock: {mat.stock}</span>
														</div>
													</li>
												{/each}
												{#if getFilteredMaterials(part.displayValue).length === 0}
													<li class="px-4 py-3 text-center text-xs text-on-surface-variant">
														"{part.displayValue}" not found
													</li>
												{/if}
											</ul>
										{/if}
									</div>
									<div class="w-full md:w-32">
										<input 
											type="number" 
											min="0.1" 
											step="any"
											required
											bind:value={part.qty}
											placeholder="Qty"
											class="w-full px-3 py-2 bg-surface border border-outline-variant/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-medium"
										/>
									</div>
									{#if requestedParts.length > 1}
										<button 
											type="button" 
											onclick={() => removePart(i)}
											class="w-9 h-9 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors self-end md:self-auto"
										>
											<span class="material-symbols-outlined text-[18px]">delete</span>
										</button>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</form>
			</div>
			
			<div class="p-4 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
				<button 
					type="button"
					onclick={() => showSparepartsModal = false}
					class="px-6 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
				>
					Cancel
				</button>
				<button 
					type="submit"
					form="createDnForm"
					disabled={isSubmittingDn || requestedParts.length === 0}
					class="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-70 flex items-center gap-2"
				>
					{#if isSubmittingDn}
						<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
						Submitting...
					{:else}
						<span class="material-symbols-outlined text-[18px]">send</span>
						Submit Request
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
