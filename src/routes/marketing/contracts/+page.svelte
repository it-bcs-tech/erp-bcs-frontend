<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import ContractSimulator from '$lib/components/ContractSimulator.svelte';
	import SearchableSelect from '$lib/components/SearchableSelect.svelte';
	
	let { data, form }: { data: PageData, form: ActionData } = $props();
	
	let contracts = $derived(data.contracts || []);
	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	}

	let customersList = $state<any[]>(data.customers || []);
	let projects = $derived(data.projects || []);
	let masterRutes = $derived(data.masterRutes || []);
	let masterRuteOpts = $derived((masterRutes || []).map((r: any) => ({
		value: String(r.id),
		label: `${r.origin_name} → ${r.destination_name}`,
		searchTerms: `${r.origin_name} ${r.destination_name}`
	})));
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

	let customerOpts = $derived((customersList || []).map((c: any) => ({
		value: String(c.id),
		label: c.name || c.nama_kustomer || '',
		sublabel: c.code || c.type || undefined,
		searchTerms: `${c.name || c.nama_kustomer || ''} ${c.code || ''}`
	})));

	// Reactive logic based on Project Category
	let selectedProject = $derived(projects.find((p: any) => p.id.toString() === selectedProjectId.toString()));
	let isTransportation = $derived(selectedProject ? selectedProject.category === 'TRANSPORTATION' : false);

	// --- Feedback UI: Floating Toast & Inline Error ---
	let formError = $state('');
	let toast = $state<{ show: boolean; type: 'success' | 'error'; message: string }>({
		show: false,
		type: 'success',
		message: ''
	});
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	function showToast(type: 'success' | 'error', message: string) {
		if (toastTimer) clearTimeout(toastTimer);
		toast = { show: true, type, message };
		toastTimer = setTimeout(() => (toast.show = false), 4000);
	}

	// Handler enhance terpusat untuk form Create/Update/Renew kontrak
	const handleSubmit: SubmitFunction = () => {
		isSubmitting = true;
		formError = '';
		return async ({ result, update }) => {
			isSubmitting = false;
			if (result.type === 'success') {
				showModal = false;
				showRenewModal = false;
				showToast('success', (result.data?.message as string) || 'Data kontrak berhasil disimpan.');
				await update({ reset: false });
			} else if (result.type === 'failure') {
				formError = (result.data?.error as string) || 'Gagal menyimpan kontrak. Periksa kembali isian form.';
				showToast('error', formError);
			} else if (result.type === 'error') {
				formError = result.error?.message || 'Terjadi kesalahan pada server.';
				showToast('error', formError);
			} else {
				await update();
			}
		};
	};

	function openCreateModal() {
		editingContractId = null;
		selectedProjectId = '';
		selectedCustomer = '';
		tipeRute = 'kustom';
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
		formError = '';
		showModal = true;
	}

	// Isi cepat Origin & Destination dari templat Master Rute OCS (tetap bisa diubah manual)
	function applyMasterRute(rId: string) {
		selectedMasterRuteId = String(rId || '');
		if (!selectedMasterRuteId) return;
		const r = masterRutes.find((mr: any) => String(mr.id) === selectedMasterRuteId);
		if (r) {
			selectedOrigin = r.origin_id != null ? String(r.origin_id) : '';
			selectedDestination = r.destination_id != null ? String(r.destination_id) : '';
		}
	}

	function openEditModal(contract: any) {
		editingContractId = contract.id;
		selectedProjectId = contract.project_id?.toString() || '';
		selectedCustomer = contract.customer_id?.toString() || '';
		tipeRute = contract.master_rute_id ? 'master' : 'kustom';
		selectedMasterRuteId = contract.master_rute_id?.toString() || '';
		selectedOrigin = contract.origin_id?.toString() || '';
		selectedDestination = contract.destination_id?.toString() || '';
		startDate = contract.startDate || '';
		endDate = contract.endDate || '';
		targetTonnage = contract.targetTonnage || 0;
		contractValue = contract.contractValue || 0;
		maxUjoPercentage = contract.maxUjoPercentage || 25;
		produkId = contract.produk_id?.toString() || '';
		notes = contract.notes || '';
		formError = '';
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
		formError = '';
		showRenewModal = true;
	}

	function closeRenewModal() {
		showRenewModal = false;
		selectedRenewContract = null;
	}


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
	<title>Customer Contracts | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-rose-600 dark:text-rose-400 text-2xl">handshake</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Customer Contracts & PO</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pengelolaan kontrak bulanan klien, target tonase pengiriman, parameter tarif, batas UJO, dan perpanjangan masa berlaku
			</p>
		</div>
		<div class="flex gap-3">
			<button 
				onclick={openSimulator}
				class="bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-slate-200/60 dark:border-slate-800/60 px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer">
				<span class="material-symbols-outlined text-lg">calculate</span>
				<span>Simulasi Kontrak</span>
			</button>
			<button 
				onclick={openCreateModal}
				class="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer">
				<span class="material-symbols-outlined text-lg">add_circle</span>
				<span>Buat Kontrak Baru</span>
			</button>
		</div>
	</header>

	{#if expiringContractsCount > 0}
		<div class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 shadow-xs">
			<div class="p-2 bg-rose-500/20 rounded-lg text-rose-600">
				<span class="material-symbols-outlined text-xl">warning</span>
			</div>
			<div>
				<h3 class="text-xs font-bold text-rose-700 dark:text-rose-300">Perhatian: {expiringContractsCount} Kontrak Membutuhkan Perpanjangan Segera</h3>
				<p class="text-xs text-rose-600 dark:text-rose-400 mt-0.5 font-medium">Terdapat kontrak yang masa berlakunya hampir habis atau target tonasenya mendekati limit. Segera perbarui untuk kelancaran dispatch DO.</p>
			</div>
		</div>
	{/if}

	<!-- Contracts List -->
	<div class="grid grid-cols-1 gap-4">
		{#if contracts.length === 0}
			<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 p-12 text-center shadow-xs">
				<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 block mb-2">contract</span>
				<p class="font-bold text-on-surface text-sm">Belum ada kontrak klien yang terdaftar.</p>
			</div>
		{/if}

		{#each contracts as contract}
			<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-xs hover:border-rose-500/30 transition-all relative overflow-hidden">
				
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
								<p class="text-sm font-semibold text-on-surface">{contract.jenis_muatan || '-'} &bull; {contract.startDate} - {contract.endDate}</p>
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
							<span>Live Tonnage Tracker {contract.isBorongan ? `(${new Date().toLocaleString('id-ID', { month: 'long' })})` : ''}</span>
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
			
			<form method="POST" action="?/{editingContractId ? 'update' : 'create'}" use:enhance={handleSubmit} class="p-6">
				
				{#if editingContractId}
					<input type="hidden" name="id" value={editingContractId} />
				{/if}

				{#if formError}
					<div class="mb-5 p-3.5 rounded-xl border bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 flex items-start gap-2.5" role="alert">
						<span class="material-symbols-outlined text-[20px] flex-shrink-0">error</span>
						<p class="text-xs font-bold flex-1 pt-0.5">{formError}</p>
						<button type="button" class="text-rose-500 hover:text-rose-700 flex-shrink-0" onclick={() => (formError = '')} aria-label="Tutup pesan error">
							<span class="material-symbols-outlined text-[18px]">close</span>
						</button>
					</div>
				{/if}

				<div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
							Pelanggan (Customer) <span class="text-rose-500">*</span>
						</label>
						<SearchableSelect 
							options={customerOpts} 
							bind:value={selectedCustomer} 
							placeholder="-- Pilih Pelanggan --" 
							required 
						/>
						<input type="hidden" name="customerId" value={selectedCustomer} required />
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
						<!-- Quick Template Selection (Optional) -->
						<div class="col-span-1 md:col-span-2">
							<div class="flex items-center justify-between mb-2">
								<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
									Isi Cepat dari Templat Rute OCS (Opsional)
								</label>
								<span class="text-[11px] text-on-surface-variant/70">Pilih untuk mengisi Origin & Destination otomatis</span>
							</div>
							<SearchableSelect 
								options={masterRuteOpts} 
								bind:value={selectedMasterRuteId} 
								placeholder="-- Pilih Templat Master Rute (Jika Ada) --" 
								onchange={(val) => applyMasterRute(String(val || ''))}
							/>
							<input type="hidden" name="master_rute_id" value={selectedMasterRuteId || ''} />
						</div>

						<!-- Origin (Titik Muat) -->
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
								Origin (Titik Muat) <span class="text-rose-500">*</span>
							</label>
							<SearchableSelect 
								options={customerOpts} 
								bind:value={selectedOrigin} 
								placeholder="-- Pilih Titik Muat (Origin) --" 
								required 
							/>
							<input type="hidden" name="originId" value={selectedOrigin} required />
						</div>
						
						<!-- Destination (Titik Bongkar) -->
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
								Destination (Titik Bongkar) <span class="text-rose-500">*</span>
							</label>
							<SearchableSelect 
								options={customerOpts} 
								bind:value={selectedDestination} 
								placeholder="-- Pilih Titik Bongkar (Destination) --" 
								required 
							/>
							<input type="hidden" name="destinationId" value={selectedDestination} required />
						</div>
					{/if}

					<div class="col-span-1 md:col-span-2">
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Jenis Muatan (Kargo)</label>
						<select name="produk_id" bind:value={produkId} class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all">
							<option value="">Pilih Produk / Jenis Muatan (Boleh Kosong)</option>
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
	availableUnits={data.availableUnits || 0} 
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
			
			<form method="POST" action="?/{renewActionType === 'extend_time' ? 'extendTime' : 'renewContract'}" use:enhance={handleSubmit} class="p-6">
				<input type="hidden" name="id" value={selectedRenewContract.id} />
				<input type="hidden" name="contractValue" value={selectedRenewContract.contractValue} />
				
				{#if formError}
					<div class="mb-5 p-3.5 rounded-xl border bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 flex items-start gap-2.5" role="alert">
						<span class="material-symbols-outlined text-[20px] flex-shrink-0">error</span>
						<p class="text-xs font-bold flex-1 pt-0.5">{formError}</p>
						<button type="button" class="text-rose-500 hover:text-rose-700 flex-shrink-0" onclick={() => (formError = '')} aria-label="Tutup pesan error">
							<span class="material-symbols-outlined text-[18px]">close</span>
						</button>
					</div>
				{/if}

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

<!-- Floating Toast Notification -->
{#if toast.show}
	<div class="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border animate-in slide-in-from-top-4 duration-300 {toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-rose-600 text-white border-rose-500'}">
		<span class="material-symbols-outlined text-[20px]">
			{toast.type === 'success' ? 'check_circle' : 'error'}
		</span>
		<p class="text-xs font-bold">{toast.message}</p>
		<button type="button" class="ml-2 text-white/80 hover:text-white" onclick={() => toast.show = false} aria-label="Tutup notifikasi">
			<span class="material-symbols-outlined text-[18px]">close</span>
		</button>
	</div>
{/if}
