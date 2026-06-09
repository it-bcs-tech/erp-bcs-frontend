<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import ContractSimulator from '$lib/components/ContractSimulator.svelte';
	
	let { data, form }: { data: PageData, form: ActionData } = $props();
	
	let contracts = $derived(data.contracts || []);
	let customersList = $state(data.customers || []);
	let projects = $derived(data.projects || []);
	let masterRutes = $derived(data.masterRutes || []);
	let products = $derived(data.products || []);

	let showModal = $state(false);
	let showRenewModal = $state(false);
	let selectedRenewContract = $state<any>(null);
	let renewActionType = $state('extend_time');
	let renewEndDate = $state('');

	let editingContractId = $state<string | null>(null);
	let expandedHistoryId = $state<string | null>(null);
	
	// Form state
	let selectedProjectId = $state('');
	let selectedCustomer = $state('');
	let selectedOrigin = $state('');
	let selectedDestination = $state('');
	let startDate = $state('');
	let endDate = $state('');
	let targetTonnage = $state(0);
	let contractValue = $state(0);
	let maxUjoPercentage = $state(25);
	let produkId = $state('');
	let notes = $state('');

	let tipeRute = $state('master');
	let selectedMasterRuteId = $state('');

	let isSubmitting = $state(false);

	// Searchable Dropdown States
	let customerSearch = $state('');
	let showCustomerDropdown = $state(false);
	let filteredCustomers = $derived(customersList.filter((c: any) => c.name.toLowerCase().includes(customerSearch.toLowerCase())));

	let originSearch = $state('');
	let showOriginDropdown = $state(false);
	let filteredOrigins = $derived(customersList.filter((c: any) => c.name.toLowerCase().includes(originSearch.toLowerCase())));

	let destSearch = $state('');
	let showDestDropdown = $state(false);
	let filteredDests = $derived(customersList.filter((c: any) => c.name.toLowerCase().includes(destSearch.toLowerCase())));

	async function quickCreateCustomer(name: string, type: 'customer' | 'origin' | 'dest') {
		isSubmitting = true;
		try {
			const res = await fetch('/api/customers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			const result = await res.json();
			if (result.success) {
				customersList = [...customersList, result.customer];
				
				if (type === 'customer') {
					selectedCustomer = result.customer.id;
					customerSearch = result.customer.name;
					showCustomerDropdown = false;
				} else if (type === 'origin') {
					selectedOrigin = result.customer.id;
					originSearch = result.customer.name;
					showOriginDropdown = false;
				} else if (type === 'dest') {
					selectedDestination = result.customer.id;
					destSearch = result.customer.name;
					showDestDropdown = false;
				}
			} else {
				alert('Failed to create: ' + result.error);
			}
		} catch (e) {
			alert('Error creating new data');
		}
		isSubmitting = false;
	}

	// Reactive logic based on Project Category
	let selectedProject = $derived(projects.find((p: any) => p.id.toString() === selectedProjectId.toString()));
	let isTransportation = $derived(selectedProject ? selectedProject.category === 'TRANSPORTATION' : false);

	$effect(() => {
		if (form?.success) {
			showModal = false;
			showRenewModal = false;
			isSubmitting = false;
		}
		if (form?.error) {
			isSubmitting = false;
			alert(form.error);
		}
	});

	function openCreateModal() {
		editingContractId = null;
		selectedProjectId = '';
		selectedCustomer = '';
		tipeRute = 'master';
		selectedMasterRuteId = '';
		selectedOrigin = '';
		selectedDestination = '';
		startDate = '';
		endDate = '';
		targetTonnage = 0;
		contractValue = 0;
		maxUjoPercentage = 25;
		produkId = '';
		notes = '';
		customerSearch = '';
		originSearch = '';
		destSearch = '';
		showModal = true;
	}

	function openEditModal(contract: any) {
		editingContractId = contract.id;
		selectedProjectId = contract.project_id?.toString() || '';
		selectedCustomer = contract.customer_id || '';
		tipeRute = contract.master_rute_id ? 'master' : 'kustom';
		selectedMasterRuteId = contract.master_rute_id?.toString() || '';
		selectedOrigin = contract.origin_id || '';
		selectedDestination = contract.destination_id || '';
		startDate = contract.startDate || '';
		endDate = contract.endDate || '';
		targetTonnage = contract.targetTonnage || 0;
		contractValue = contract.contractValue || 0;
		maxUjoPercentage = contract.maxUjoPercentage || 25;
		produkId = contract.produk_id?.toString() || '';
		notes = contract.notes || '';

		customerSearch = customersList.find((c: any) => c.id === selectedCustomer)?.name || '';
		originSearch = customersList.find((c: any) => c.id === selectedOrigin)?.name || '';
		destSearch = customersList.find((c: any) => c.id === selectedDestination)?.name || '';

		showModal = true;
	}

	function toggleHistory(id: string) {
		expandedHistoryId = expandedHistoryId === id ? null : id;
	}

	function isEligibleForRenewal(contract: any): boolean {
		if (!contract || contract.status !== 'Active') return false;
		if (contract.targetTonnage > 0 && contract.deliveredTonnage >= (contract.targetTonnage * 0.9)) {
			return true;
		}
		if (contract.endDate) {
			const end = new Date(contract.endDate);
			const now = new Date();
			const diffTime = end.getTime() - now.getTime();
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
			if (diffDays <= 7) return true;
		}
		return false;
	}

	let expiringContractsCount = $derived(contracts.filter((c: any) => isEligibleForRenewal(c)).length);

	function openRenewModal(contract: any) {
		selectedRenewContract = contract;
		// Determine default action
		if (contract.targetTonnage > 0 && contract.deliveredTonnage >= contract.targetTonnage) {
			renewActionType = 'new_contract';
		} else {
			renewActionType = 'extend_time';
		}
		renewEndDate = contract.endDate || '';
		showRenewModal = true;
	}

	function closeRenewModal() {
		showRenewModal = false;
		selectedRenewContract = null;
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};

	// --- Contract Simulator State ---
	let showSimulatorModal = $state(false);

	function openSimulator() {
		showSimulatorModal = true;
	}

	function closeSimulator() {
		showSimulatorModal = false;
	}

	function onApplySimulation(data: any) {
		closeSimulator();
		openCreateModal();
		targetTonnage = data.targetTonnage;
		contractValue = data.contractValue;
	}
</script>

<svelte:head>
	<title>Master Kontrak (PO) | Marketing Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Master Contracts (PO)</h1>
			<p class="text-on-surface-variant font-medium text-sm">Manage monthly contracts, tonnage targets, tariffs, and fixed UJO</p>
		</div>
		<div class="flex gap-3">
			<button 
				onclick={openSimulator}
				class="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors">
				<span class="material-symbols-outlined text-lg">calculate</span>
				Simulasi Kontrak
			</button>
			<button 
				onclick={openCreateModal}
				class="bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-rose-700 transition-colors">
				<span class="material-symbols-outlined text-lg">add_circle</span>
				Create New Contract
			</button>
		</div>
	</header>

	{#if expiringContractsCount > 0}
		<div class="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-4">
			<div class="p-2 bg-rose-100 dark:bg-rose-900/50 rounded-lg text-rose-600 dark:text-rose-400">
				<span class="material-symbols-outlined text-[24px]">warning</span>
			</div>
			<div>
				<h3 class="text-sm font-bold text-rose-800 dark:text-rose-300">Perhatian: {expiringContractsCount} Kontrak Membutuhkan Perpanjangan</h3>
				<p class="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">Terdapat kontrak yang masa berlakunya akan/sudah habis, atau target tonasenya hampir tercapai. Segera perbarui untuk menghindari kendala dispatch di OCS.</p>
			</div>
		</div>
	{/if}

	<!-- Contracts List -->
	<div class="grid grid-cols-1 gap-4">
		{#if contracts.length === 0}
			<div class="bg-surface-container p-8 rounded-2xl text-center border border-dashed border-surface-container-high">
				<p class="text-on-surface-variant font-medium">No contracts found. Click 'Create New Contract' to get started.</p>
			</div>
		{/if}

		{#each contracts as contract}
			<div class="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
				
				<div class="flex flex-col lg:flex-row gap-6 justify-between">
					
					<!-- Info Section -->
					<div class="flex-1">
						<div class="flex items-center justify-between mb-2">
							<div class="flex items-center gap-3">
								<span class="text-xs font-black tracking-widest uppercase text-rose-600 bg-rose-600/10 px-2 py-1 rounded">{contract.id}</span>
								<span class="text-xs font-bold px-2 py-1 rounded {contract.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-surface-container-high text-on-surface-variant'}">{contract.status}</span>
							</div>
							<div class="flex gap-2">
								<button class="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors" onclick={() => openEditModal(contract)} title="Edit Contract">
									<span class="material-symbols-outlined text-[18px]">edit</span>
								</button>
								<button class="flex items-center gap-1.5 px-3 py-1 rounded-lg {expandedHistoryId === contract.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'} text-xs font-medium transition-colors" onclick={() => toggleHistory(contract.id)}>
									<span class="material-symbols-outlined text-[16px]">history</span> History
								</button>
							</div>
						</div>
						<h3 class="text-xl font-bold text-on-surface mb-1">{contract.customer}</h3>
						<p class="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md inline-block mb-4">{contract.project} ({contract.project_category})</p>
						
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
							{#if contract.project_category === 'TRANSPORTATION'}
								<div>
									<p class="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Route</p>
									<p class="text-sm font-semibold text-on-surface flex items-center gap-1">
										{contract.origin || '-'} &rarr; {contract.destination || '-'}
										{#if contract.master_rute_id}
											<span class="material-symbols-outlined text-[14px] text-indigo-500 ml-1" title="Menggunakan Master Rute OCS">verified</span>
										{/if}
									</p>
								</div>
							{/if}
							<div>
								<p class="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Muatan / Periode</p>
								<p class="text-sm font-semibold text-on-surface">{contract.jenis_muatan || 'Baja / Kargo'} &bull; {contract.startDate} - {contract.endDate}</p>
							</div>
							<div>
								<p class="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Nilai Kontrak</p>
								<p class="text-sm font-bold text-emerald-600">{formatCurrency(contract.contractValue)}</p>
							</div>
							{#if contract.project_category === 'TRANSPORTATION'}
								<div>
									<p class="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Batas Maks UJO</p>
									<p class="text-sm font-bold text-rose-600">{contract.maxUjoPercentage}%</p>
								</div>
							{/if}
						</div>
						{#if contract.notes}
							<p class="text-xs text-on-surface-variant bg-surface-container-low p-2 rounded">Note: {contract.notes}</p>
						{/if}
					</div>

					<!-- Progress Section -->
					<div class="w-full lg:w-96 bg-surface-container-low p-4 rounded-xl border border-surface-container-high self-center">
						<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center justify-between">
							<span>Live Tonnage Tracker</span>
							<span class="text-xs font-black text-on-surface bg-surface-container-highest px-2 py-0.5 rounded">{contract.targetTonnage} Ton</span>
						</p>
						
						<!-- The Multi-Color Bar -->
						<div class="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden mb-3 flex relative shadow-inner">
							<div class="h-full bg-emerald-500 hover:opacity-80 transition-opacity" style="width: {contract.targetTonnage > 0 ? (contract.deliveredTonnage / contract.targetTonnage) * 100 : 0}%" title="Delivered: {contract.deliveredTonnage} Ton"></div>
							<div class="h-full bg-sky-500 hover:opacity-80 transition-opacity" style="width: {contract.targetTonnage > 0 ? (contract.onrouteTonnage / contract.targetTonnage) * 100 : 0}%" title="On Route: {contract.onrouteTonnage} Ton"></div>
							<div class="h-full bg-amber-500 hover:opacity-80 transition-opacity" style="width: {contract.targetTonnage > 0 ? (contract.loadingTonnage / contract.targetTonnage) * 100 : 0}%" title="Loading: {contract.loadingTonnage} Ton"></div>
							<div class="h-full bg-indigo-500 hover:opacity-80 transition-opacity" style="width: {contract.targetTonnage > 0 ? (contract.dispatchedTonnage / contract.targetTonnage) * 100 : 0}%" title="Dispatched: {contract.dispatchedTonnage} Ton"></div>
						</div>
						
						<!-- Legend -->
						<div class="grid grid-cols-2 gap-x-2 gap-y-1">
							<div class="flex items-center justify-between text-[10px]">
								<div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-on-surface-variant font-medium">Delivered</span></div>
								<span class="font-bold text-on-surface">{contract.deliveredTonnage} <span class="font-normal opacity-70">T</span></span>
							</div>
							<div class="flex items-center justify-between text-[10px]">
								<div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-sky-500"></span><span class="text-on-surface-variant font-medium">On-Route</span></div>
								<span class="font-bold text-on-surface">{contract.onrouteTonnage} <span class="font-normal opacity-70">T</span></span>
							</div>
							<div class="flex items-center justify-between text-[10px]">
								<div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500"></span><span class="text-on-surface-variant font-medium">Loading</span></div>
								<span class="font-bold text-on-surface">{contract.loadingTonnage} <span class="font-normal opacity-70">T</span></span>
							</div>
							<div class="flex items-center justify-between text-[10px]">
								<div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-indigo-500"></span><span class="text-on-surface-variant font-medium">Dispatched</span></div>
								<span class="font-bold text-on-surface">{contract.dispatchedTonnage} <span class="font-normal opacity-70">T</span></span>
							</div>
							<div class="flex items-center justify-between text-[10px] col-span-2 mt-1 pt-1 border-t border-surface-container">
								<div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-surface-container-highest border border-surface-container-high"></span><span class="text-on-surface-variant font-medium">Remaining</span></div>
								<span class="font-bold text-on-surface">{contract.remainingTonnage} <span class="font-normal opacity-70">T</span></span>
							</div>
						</div>
					</div>
				</div>

				<!-- History Expansion -->
				{#if expandedHistoryId === contract.id}
					<div class="mt-6 pt-6 border-t border-surface-container">
						<p class="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-4 flex items-center gap-2">
							<span class="material-symbols-outlined text-[16px] text-indigo-600">manage_search</span> Customer Contract History
						</p>
						
						{#if contract.history && contract.history.length > 0}
							<!-- Omitted for brevity in this step, to keep UI simple -->
						{:else}
							<div class="bg-surface-container-low p-4 rounded-xl border border-surface-container border-dashed text-center">
								<p class="text-sm font-medium text-on-surface-variant">No contract history found for this customer.</p>
							</div>
						{/if}
					</div>
				{/if}

				{#if isEligibleForRenewal(contract)}
					<div class="mt-5 pt-4 border-t border-rose-100 dark:border-rose-900/30 flex justify-end">
						<button onclick={() => openRenewModal(contract)} class="px-4 py-2 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 border border-rose-200 dark:border-rose-900/50 shadow-sm">
							<span class="material-symbols-outlined text-[16px]">autorenew</span>
							Perbarui / Perpanjang Kontrak
						</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<!-- Modal Form Buat Kontrak -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
		<div class="bg-surface rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<div class="flex items-center justify-between p-6 border-b border-surface-container">
				<h2 class="text-xl font-bold text-on-surface">{editingContractId ? 'Edit Contract (PO)' : 'Create New Master Contract'}</h2>
				<button type="button" class="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors" onclick={() => showModal = false}>
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>
			
			<form method="POST" action="?/{editingContractId ? 'update' : 'create'}" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); }; }} class="p-6">
				
				{#if editingContractId}
					<input type="hidden" name="id" value={editingContractId} />
				{/if}

				<div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
					<div class="relative">
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Customer</label>
						<input type="hidden" name="customerId" value={selectedCustomer} required />
						<input type="text" bind:value={customerSearch} onfocus={() => showCustomerDropdown = true} onblur={() => setTimeout(() => showCustomerDropdown = false, 200)} placeholder="Search Customer..." class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all" autocomplete="off" />
						{#if showCustomerDropdown}
							<ul class="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg max-h-48 overflow-y-auto hide-scrollbar">
								{#if filteredCustomers.length > 0}
									{#each filteredCustomers as c}
										<!-- svelte-ignore a11y_click_events_have_key_events -->
										<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
										<li class="px-4 py-2 text-sm text-on-surface cursor-pointer hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0" onclick={() => { selectedCustomer = c.id; customerSearch = c.name; showCustomerDropdown = false; }}>
											{c.name}
										</li>
									{/each}
								{:else if customerSearch.trim().length > 0}
									<li class="px-4 py-3 text-center">
										<p class="text-xs text-on-surface-variant mb-2">"{customerSearch}" not found</p>
										<button type="button" class="px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors rounded-lg text-xs font-bold w-full" onclick={() => quickCreateCustomer(customerSearch, 'customer')}>
											+ Tambah "{customerSearch}"
										</button>
									</li>
								{/if}
							</ul>
						{/if}
					</div>
					
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Project Category</label>
						<select name="projectId" bind:value={selectedProjectId} required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all">
							<option value="" disabled>Select Project...</option>
							{#each projects as p}
								<option value={p.id}>{p.name} ({p.category})</option>
							{/each}
						</select>
					</div>

					{#if isTransportation}
						<div class="col-span-1 md:col-span-2">
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Metode Rute</label>
							<div class="flex gap-4">
								<label class="flex items-center gap-2 cursor-pointer">
									<input type="radio" name="tipe_rute" value="master" bind:group={tipeRute} class="w-4 h-4 text-rose-600 focus:ring-rose-500" />
									<span class="text-sm font-medium text-on-surface">Gunakan Master Rute (OCS)</span>
								</label>
								<label class="flex items-center gap-2 cursor-pointer">
									<input type="radio" name="tipe_rute" value="kustom" bind:group={tipeRute} class="w-4 h-4 text-rose-600 focus:ring-rose-500" />
									<span class="text-sm font-medium text-on-surface">Buat Rute Kustom Baru</span>
								</label>
							</div>
						</div>

						{#if tipeRute === 'master'}
							<div class="col-span-1 md:col-span-2 relative">
								<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Pilih Master Rute OCS</label>
								<select name="master_rute_id" bind:value={selectedMasterRuteId} required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all">
									<option value="" disabled>Pilih Rute...</option>
									{#each masterRutes as r}
										<option value={r.id}>{r.origin_name} &rarr; {r.destination_name} (Unit: {r.tipe_unit})</option>
									{/each}
								</select>
								{#if selectedMasterRuteId}
									{#each masterRutes as r}
										{#if r.id === selectedMasterRuteId}
											<div class="mt-3 bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/30 flex justify-between items-center">
												<div>
													<p class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Tarif Standar (Dari OCS)</p>
													<p class="text-sm font-black text-indigo-700 dark:text-indigo-300">
														{r.tarif_customer && Number(r.tarif_customer) > 0 ? formatCurrency(Number(r.tarif_customer)) : 'Tidak Diset OCS'}
													</p>
												</div>
												<div class="text-right">
													<p class="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Estimasi Cost UJO</p>
													<p class="text-sm font-black text-rose-700 dark:text-rose-300">
														{formatCurrency(Number(r.total_ujo))}
													</p>
												</div>
											</div>
										{/if}
									{/each}
								{/if}
							</div>
						{:else}
							<div class="relative">
								<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Origin</label>
								<input type="hidden" name="originId" value={selectedOrigin} required />
								<input type="text" bind:value={originSearch} onfocus={() => showOriginDropdown = true} onblur={() => setTimeout(() => showOriginDropdown = false, 200)} placeholder="Search Origin..." class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all" autocomplete="off" />
								{#if showOriginDropdown}
									<ul class="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg max-h-48 overflow-y-auto hide-scrollbar">
										{#if filteredOrigins.length > 0}
											{#each filteredOrigins as c}
												<!-- svelte-ignore a11y_click_events_have_key_events -->
												<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
												<li class="px-4 py-2 text-sm text-on-surface cursor-pointer hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0" onclick={() => { selectedOrigin = c.id; originSearch = c.name; showOriginDropdown = false; }}>
													{c.name}
												</li>
											{/each}
										{:else if originSearch.trim().length > 0}
											<li class="px-4 py-3 text-center">
												<p class="text-xs text-on-surface-variant mb-2">"{originSearch}" not found</p>
												<button type="button" class="px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors rounded-lg text-xs font-bold w-full" onclick={() => quickCreateCustomer(originSearch, 'origin')}>
													+ Tambah "{originSearch}"
												</button>
											</li>
										{/if}
									</ul>
								{/if}
							</div>
							
							<div class="relative">
								<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Destination</label>
								<input type="hidden" name="destinationId" value={selectedDestination} required />
								<input type="text" bind:value={destSearch} onfocus={() => showDestDropdown = true} onblur={() => setTimeout(() => showDestDropdown = false, 200)} placeholder="Search Destination..." class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all" autocomplete="off" />
								{#if showDestDropdown}
									<ul class="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg max-h-48 overflow-y-auto hide-scrollbar">
										{#if filteredDests.length > 0}
											{#each filteredDests as c}
												<!-- svelte-ignore a11y_click_events_have_key_events -->
												<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
												<li class="px-4 py-2 text-sm text-on-surface cursor-pointer hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0" onclick={() => { selectedDestination = c.id; destSearch = c.name; showDestDropdown = false; }}>
													{c.name}
												</li>
											{/each}
										{:else if destSearch.trim().length > 0}
											<li class="px-4 py-3 text-center">
												<p class="text-xs text-on-surface-variant mb-2">"{destSearch}" not found</p>
												<button type="button" class="px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors rounded-lg text-xs font-bold w-full" onclick={() => quickCreateCustomer(destSearch, 'dest')}>
													+ Tambah "{destSearch}"
												</button>
											</li>
										{/if}
									</ul>
								{/if}
							</div>
						{/if}
					{/if}

					<div class="col-span-1 md:col-span-2">
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Jenis Muatan (Kargo)</label>
						<select name="produk_id" bind:value={produkId} required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all">
							<option value="" disabled>Select Cargo...</option>
							{#each products as prod}
								<option value={prod.id}>{prod.name} ({prod.satuan})</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{isTransportation ? 'Target Tonnage (Ton)' : 'Target Volume / Kuantitas'}</label>
						<input type="number" name="targetTonnage" bind:value={targetTonnage} required min="0" step="0.01" class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all">
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Nilai Kontrak Total (Rp)</label>
						<input type="number" name="contractValue" bind:value={contractValue} required min="0" step="0.01" class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all">
					</div>

					{#if isTransportation}
						<div class="col-span-1 md:col-span-2">
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Batas Maksimal UJO (%)</label>
							<div class="flex items-center gap-3">
								<input type="number" name="maxUjoPercentage" bind:value={maxUjoPercentage} required min="0" max="100" step="0.01" class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all">
								<span class="text-xs text-on-surface-variant bg-surface-container p-3 rounded-xl whitespace-nowrap">Digunakan untuk validasi anggaran di OCS</span>
							</div>
						</div>
					{/if}

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Start Date</label>
						<input type="date" name="startDate" bind:value={startDate} required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all">
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">End Date</label>
						<input type="date" name="endDate" bind:value={endDate} required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all">
					</div>

					<div class="col-span-1 md:col-span-2">
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Additional Notes</label>
						<input type="text" name="notes" bind:value={notes} class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all" placeholder="Optional...">
					</div>
				</div>

				<div class="flex justify-end gap-3 pt-4 border-t border-surface-container">
					<button type="button" class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors" onclick={() => showModal = false} disabled={isSubmitting}>
						Cancel
					</button>
					<button type="submit" class="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors flex items-center gap-2" disabled={isSubmitting}>
						{#if isSubmitting}
							<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
						{/if}
						{editingContractId ? 'Update Contract' : 'Save Contract'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Simulator Modal -->
<ContractSimulator 
	bind:isOpen={showSimulatorModal} 
	availableUnits={data.availableUnits} 
	onApply={(simData) => {
		targetTonnage = simData.tonnage;
		contractValue = simData.value;
		showModal = true; // Open the Create Contract modal if not open
	}} 
/>

<!-- Renew Modal -->
{#if showRenewModal && selectedRenewContract}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
		<div class="bg-surface rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<div class="flex items-center justify-between p-6 border-b border-surface-container bg-rose-50 dark:bg-rose-900/10">
				<div class="flex items-center gap-3 text-rose-700 dark:text-rose-400">
					<span class="material-symbols-outlined text-[24px]">autorenew</span>
					<h2 class="text-xl font-bold">Perbarui Kontrak</h2>
				</div>
				<button type="button" class="w-8 h-8 rounded-full hover:bg-rose-100 flex items-center justify-center text-rose-700 transition-colors" onclick={closeRenewModal}>
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>
			
			<form method="POST" action="?/{renewActionType === 'extend_time' ? 'extendTime' : 'renewContract'}" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); }; }} class="p-6">
				<input type="hidden" name="id" value={selectedRenewContract.id} />
				<input type="hidden" name="contractValue" value={selectedRenewContract.contractValue} />
				
				<div class="mb-6">
					<p class="text-sm text-on-surface-variant font-medium mb-4">Pilih tindakan perpanjangan untuk kontrak <strong>{selectedRenewContract.id}</strong> ({selectedRenewContract.customer}):</p>
					
					<div class="space-y-3">
						<label class="flex items-start gap-3 p-4 rounded-xl border {renewActionType === 'extend_time' ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-surface-container hover:bg-surface-container-low'} cursor-pointer transition-colors">
							<input type="radio" name="renew_type" value="extend_time" bind:group={renewActionType} class="mt-1 w-4 h-4 text-rose-600 focus:ring-rose-500" />
							<div>
								<span class="block text-sm font-bold text-on-surface mb-1">Perpanjang Waktu Saja</span>
								<span class="block text-xs text-on-surface-variant">Hanya memperpanjang End Date tanpa mengubah sisa target tonase yang berjalan. Cocok jika periode habis tapi muatan masih ada.</span>
							</div>
						</label>

						<label class="flex items-start gap-3 p-4 rounded-xl border {renewActionType === 'new_contract' ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-surface-container hover:bg-surface-container-low'} cursor-pointer transition-colors">
							<input type="radio" name="renew_type" value="new_contract" bind:group={renewActionType} class="mt-1 w-4 h-4 text-rose-600 focus:ring-rose-500" />
							<div>
								<span class="block text-sm font-bold text-on-surface mb-1">Buat Kontrak Baru & Tutup Lama</span>
								<span class="block text-xs text-on-surface-variant">Membuat DRAFT kontrak baru dengan menyalin rute dan harga kontrak ini, lalu menutup kontrak lama dan menyimpannya di History.</span>
							</div>
						</label>
					</div>
				</div>

				{#if renewActionType === 'extend_time'}
					<div class="mb-6">
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Pilih End Date Baru</label>
						<input type="date" name="newEndDate" bind:value={renewEndDate} required class="w-full bg-surface-container-lowest border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all">
					</div>
				{/if}

				<div class="flex justify-end gap-3 pt-4 border-t border-surface-container">
					<button type="button" class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors" onclick={closeRenewModal} disabled={isSubmitting}>
						Batal
					</button>
					<button type="submit" class="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors flex items-center gap-2" disabled={isSubmitting}>
						{#if isSubmitting}
							<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
						{/if}
						{renewActionType === 'extend_time' ? 'Simpan Perpanjangan' : 'Lanjutkan Pembuatan'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
