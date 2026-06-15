<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	const { units, drivers } = data;

	let selectedUnitId = $state('');
	let driverName = $state('');
	let driverId = $state('');
	let showAdvanced = $state(false);

	function handleUnitChange() {
		const found = units.find(u => u.no_unit === selectedUnitId);
		if (found && found.driver_name) {
			driverName = found.driver_name;
			driverId = found.driver_id;
		} else {
			driverName = '';
			driverId = '';
		}
	}

	function handleDriverChange() {
		const found = drivers.find(d => d.name === driverName);
		if (found) {
			driverId = found.id;
		} else {
			driverId = '';
		}
	}
	
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Create Work Order | FMS</title>
</svelte:head>

<div class="flex flex-col h-full max-w-4xl mx-auto space-y-6">
	<!-- Breadcrumb & Header -->
	<div class="flex justify-between items-center mb-4">
		<nav class="flex items-center text-sm font-medium text-on-surface-variant">
			<a href="/fms" class="hover:text-primary transition-colors">FMS</a>
			<span class="material-symbols-outlined text-[16px] mx-1">chevron_right</span>
			<a href="/fms/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
			<span class="material-symbols-outlined text-[16px] mx-1">chevron_right</span>
			<span class="text-on-surface font-bold">New Work Order</span>
		</nav>
	</div>

	<div class="bg-surface-container-lowest rounded-[32px] p-8 shadow-sm">
		<div class="mb-8">
			<h1 class="text-3xl font-black text-on-surface tracking-tight mb-2 flex items-center gap-3">
				<span class="material-symbols-outlined text-4xl text-primary">add_circle</span>
				Create New Work Order
			</h1>
			<p class="text-on-surface-variant font-medium">Register a new vehicle defect or schedule maintenance.</p>
		</div>

		{#if form?.missing}
			<div class="bg-error-container text-on-error-container p-4 rounded-2xl mb-6 flex items-start gap-3">
				<span class="material-symbols-outlined mt-0.5">error</span>
				<div>
					<p class="font-bold text-sm">Submission Failed</p>
					<p class="text-xs mt-0.5">{form.message}</p>
				</div>
			</div>
		{/if}

		<form 
			method="POST" 
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
				};
			}}
			class="space-y-6"
		>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Vehicle ID -->
				<div>
					<label for="unit_id" class="block text-sm font-bold text-on-surface mb-2">Vehicle (Unit ID) <span class="text-error">*</span></label>
					<div class="relative">
						<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">local_shipping</span>
						<input 
							list="units-list"
							type="text" 
							id="unit_id" 
							name="unit_id" 
							required 
							bind:value={selectedUnitId}
							oninput={handleUnitChange}
							placeholder="Type to search vehicle..."
							class="w-full pl-12 pr-4 py-3 bg-surface border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
						/>
						{#if units && units.length > 0}
							<datalist id="units-list">
								{#each units as unit}
									<option value={unit.no_unit}>{unit.no_unit}</option>
								{/each}
							</datalist>
						{/if}
					</div>
				</div>

				<!-- Driver ID -->
				<div>
					<label for="driver_search" class="block text-sm font-bold text-on-surface mb-2">Driver / Reporter</label>
					<div class="relative">
						<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">person</span>
						<input type="hidden" name="driver_id" bind:value={driverId} />
						<input 
							list="drivers-list"
							type="text" 
							id="driver_search" 
							bind:value={driverName}
							oninput={handleDriverChange}
							placeholder="Type to search driver..."
							class="w-full pl-12 pr-4 py-3 bg-surface border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
						/>
						{#if drivers && drivers.length > 0}
							<datalist id="drivers-list">
								{#each drivers as driver}
									<option value={driver.name}>{driver.name}</option>
								{/each}
							</datalist>
						{/if}
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<!-- Category -->
				<div>
					<label for="maint_category" class="block text-sm font-bold text-on-surface mb-2">Maintenance Category</label>
					<div class="relative">
						<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">category</span>
						<select 
							id="maint_category" 
							name="maint_category" 
							class="w-full pl-12 pr-4 py-3 bg-surface border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium appearance-none cursor-pointer"
						>
							<option value="Regular Repair">Regular Repair</option>
							<option value="Breakdown">Breakdown</option>
							<option value="Preventive Maintenance">Preventive Maintenance</option>
							<option value="Accident">Accident</option>
							<option value="Tire Replacement">Tire Replacement</option>
						</select>
					</div>
				</div>

				<!-- Kilometer -->
				<div>
					<label for="kilometer" class="block text-sm font-bold text-on-surface mb-2">Odometer (Km)</label>
					<div class="relative">
						<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">speed</span>
						<input 
							type="number" 
							id="kilometer" 
							name="kilometer" 
							min="0"
							placeholder="e.g., 150000"
							class="w-full pl-12 pr-4 py-3 bg-surface border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
						/>
					</div>
				</div>

				<!-- Hourmeter -->
				<div>
					<label for="hourmeter" class="block text-sm font-bold text-on-surface mb-2">Hourmeter (Hm)</label>
					<div class="relative">
						<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">timer</span>
						<input 
							type="number" 
							id="hourmeter" 
							name="hourmeter" 
							min="0"
							placeholder="e.g., 2400"
							class="w-full pl-12 pr-4 py-3 bg-surface border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
						/>
					</div>
				</div>
			</div>

			<!-- Complaint -->
			<div>
				<label for="keluhan_driver" class="block text-sm font-bold text-on-surface mb-2">Issue / Complaint Description <span class="text-error">*</span></label>
				<textarea 
					id="keluhan_driver" 
					name="keluhan_driver" 
					required 
					rows="3"
					placeholder="Describe the issue reported by the driver or found during inspection..."
					class="w-full p-4 bg-surface border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium resize-y"
				></textarea>
			</div>

			<!-- Advanced Options Toggle -->
			<div>
				<button 
					type="button" 
					onclick={() => showAdvanced = !showAdvanced}
					class="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
				>
					<span class="material-symbols-outlined transition-transform duration-200" class:rotate-180={showAdvanced}>expand_more</span>
					Advanced Details (Optional)
				</button>
			</div>

			<!-- Advanced Section -->
			{#if showAdvanced}
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-surface-container-low border border-surface-container-highest rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
					<div>
						<label for="vendor" class="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">External Vendor</label>
						<input type="text" id="vendor" name="vendor" placeholder="If outsourced..." class="w-full px-4 py-2 bg-surface border border-outline-variant/30 rounded-lg text-sm" />
					</div>
					<div>
						<label for="project_code" class="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Project Code</label>
						<input type="text" id="project_code" name="project_code" placeholder="e.g., PRJ-001" class="w-full px-4 py-2 bg-surface border border-outline-variant/30 rounded-lg text-sm" />
					</div>
					<div>
						<label for="job_location" class="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Job Location</label>
						<input type="text" id="job_location" name="job_location" placeholder="e.g., Workshop A, On-Site" class="w-full px-4 py-2 bg-surface border border-outline-variant/30 rounded-lg text-sm" />
					</div>
				</div>
			{/if}

			<div class="pt-6 border-t border-surface-container flex justify-end gap-3">
				<a 
					href="/fms/maintenance" 
					class="px-6 py-3 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
				>
					Cancel
				</a>
				<button 
					type="submit" 
					disabled={isSubmitting}
					class="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
						Saving...
					{:else}
						<span class="material-symbols-outlined text-[18px]">save</span>
						Create Work Order
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
