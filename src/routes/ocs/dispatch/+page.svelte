<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	
	let { data, form }: { data: PageData, form: ActionData } = $props();
	let availableUnits = $derived(data.availableUnits || []);
	let orders = $derived(data.orders || []);

	let statusFilter = $state($page.url.searchParams.get('status') || 'All');

	// Modal States
	let showUjoModal = $state(false);
	let showClosingModal = $state(false);
	let selectedOrder = $state<any>(null);

	// UJO Form State
	let ujoUnit = $state('');
	let ujoAmount = $state('');
	let ujoMakan = $state('');
	let ujoTol = $state('');
	let isSubmitting = $state(false);

	let aiReason = $state('');
	let isAiLoading = $state(false);

	async function getSmartDispatch() {
		if (!selectedOrder) return;
		isAiLoading = true;
		aiReason = '';
		try {
			const res = await fetch('/api/fms/smart-dispatch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ orderId: selectedOrder.id })
			});
			if (res.ok) {
				const data = await res.json();
				if (data.recommended_unit) {
					ujoUnit = data.recommended_unit;
					const unit = availableUnits.find((u: any) => u.id === data.recommended_unit);
					if (unit) {
						unitSearch = `${unit.id} • ${unit.driver} (${unit.type})`;
					} else {
						unitSearch = data.recommended_unit;
					}
				}
				aiReason = data.reason || '';
			} else {
				aiReason = 'Gagal memuat rekomendasi AI.';
			}
		} catch (e) {
			aiReason = 'Terjadi kesalahan jaringan saat memanggil AI.';
		} finally {
			isAiLoading = false;
		}
	}

	let unitSearch = $state('');
	let showUnitDropdown = $state(false);
	let filteredUnits = $derived(availableUnits.filter(u => 
		(u.id && u.id.toLowerCase().includes(unitSearch.toLowerCase())) || 
		(u.driver && u.driver.toLowerCase().includes(unitSearch.toLowerCase())) ||
		(u.type && u.type.toLowerCase().includes(unitSearch.toLowerCase()))
	));

	// Closing Form State
	let closeWeight = $state('');
	let closeCost = $state('');
	let closeDesc = $state('');

	function openUjoModal(order: any) {
		selectedOrder = order;
		ujoUnit = order.assignedUnit || '';
		unitSearch = order.assignedUnit ? `${order.assignedUnit} • ${order.assignedDriver || ''}` : '';
		ujoMakan = order.ujoMakan ? String(order.ujoMakan) : '';
		ujoTol = order.ujoTol ? String(order.ujoTol) : '';
		
		if (order.estimatedUjo) {
			ujoAmount = String(order.estimatedUjo - (order.ujoMakan || 0) - (order.ujoTol || 0));
		} else {
			ujoAmount = '';
		}
		aiReason = '';
		showUjoModal = true;
	}

	function closeUjoModal() {
		showUjoModal = false;
		selectedOrder = null;
	}

	function openClosingModal(order: any) {
		selectedOrder = order;
		closeWeight = '';
		closeCost = '';
		closeDesc = '';
		showClosingModal = true;
	}

	function closeClosingModal() {
		showClosingModal = false;
		selectedOrder = null;
	}

	function handleStatusClick(s: string) {
		statusFilter = s;
		const url = new URL(window.location.href);
		if (s !== 'All') url.searchParams.set('status', s);
		else url.searchParams.delete('status');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};

	let filteredOrders = $derived.by(() => {
		let result = orders.filter(o => o.status !== 'COMPLETED');
		if (statusFilter === 'New Order') result = result.filter(o => o.status === 'WAITING_UJO');
		else if (statusFilter === 'Waiting Marketing') result = result.filter(o => o.status === 'WAITING_TARIFF' || o.status === 'WAITING_CUSTOMER');
		else if (statusFilter === 'Ready to Dispatch') result = result.filter(o => o.status === 'READY_TO_DISPATCH');
		else if (statusFilter === 'Dispatched') result = result.filter(o => o.status === 'DISPATCHED');
		else if (statusFilter === 'Closing') result = result.filter(o => o.status === 'CLOSING');
		return result;
	});

	let summary = $derived.by(() => {
		const all = orders;
		return {
			newOrder: all.filter(o => o.status === 'WAITING_UJO').length,
			ready: all.filter(o => o.status === 'READY_TO_DISPATCH').length,
			closing: all.filter(o => o.status === 'CLOSING').length,
			availableUnits: availableUnits.length
		};
	});

	$effect(() => {
		if (form?.success) {
			closeUjoModal();
			closeClosingModal();
			isSubmitting = false;
		}
		if (form?.error) {
			alert(form.error);
			isSubmitting = false;
		}
	});
</script>

<svelte:head>
	<title>Dispatch | OCS</title>
</svelte:head>

<div class="flex flex-col h-full">
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Dispatch Center</h1>
			<p class="text-on-surface-variant font-medium text-sm">Assign available units to incoming delivery orders from Marketing</p>
		</div>
		<button class="bg-sky-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-sky-700 transition-colors">
			<span class="material-symbols-outlined text-lg">auto_fix_high</span>
			Auto-Assign
		</button>
	</header>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-sm">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">New Orders</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-on-surface">{summary.newOrder}</h3>
				<span class="material-symbols-outlined text-3xl text-surface-variant">new_releases</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-amber-500/20 shadow-sm">
			<p class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Ready to Dispatch</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-amber-600">{summary.ready}</h3>
				<span class="material-symbols-outlined text-3xl text-amber-500/50">hourglass_top</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-rose-500/20 shadow-sm">
			<p class="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">Needs Closing</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-rose-600">{summary.closing}</h3>
				<span class="material-symbols-outlined text-3xl text-rose-500/50">assignment_return</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-emerald-500/20 shadow-sm">
			<p class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Units Available</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-emerald-600">{summary.availableUnits}</h3>
				<span class="material-symbols-outlined text-3xl text-emerald-500/50">check_circle</span>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<!-- Orders List -->
		<div class="lg:col-span-2">
			<!-- Status Tabs -->
			<div class="flex gap-2 mb-4 overflow-x-auto pb-2">
				{#each ['All', 'New Order', 'Waiting Marketing', 'Ready to Dispatch', 'Dispatched', 'Closing'] as tab}
					<button class="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors {statusFilter === tab ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300' : 'text-on-surface-variant hover:bg-surface-container'}"
						onclick={() => handleStatusClick(tab)}>
						{tab}
					</button>
				{/each}
			</div>

			<div class="space-y-3">
				{#if filteredOrders.length === 0}
					<p class="p-6 text-center text-sm font-medium text-on-surface-variant bg-surface-container-low border border-surface-container rounded-2xl shadow-sm">Tidak ada order yang cocok.</p>
				{/if}
				{#each filteredOrders as order}
					<div class="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container hover:shadow-md transition-all">
						<div class="flex items-start justify-between mb-3">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-xl {order.status === 'DISPATCHED' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600' : order.status === 'CLOSING' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'} flex items-center justify-center">
									<span class="material-symbols-outlined text-[20px]">{order.status === 'DISPATCHED' ? 'local_shipping' : order.status === 'CLOSING' ? 'assignment_return' : 'pending_actions'}</span>
								</div>
								<div>
									<p class="text-sm font-black text-on-surface">{order.id}</p>
									<p class="text-xs text-on-surface-variant font-medium">{order.customer}</p>
								</div>
							</div>
							
							<span class="inline-flex items-center gap-1.5 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider border {order.status === 'WAITING_UJO' ? 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20' : (order.status === 'WAITING_TARIFF' || order.status === 'WAITING_CUSTOMER') ? 'text-amber-600 bg-amber-500/10 border-amber-500/20' : order.status === 'READY_TO_DISPATCH' ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' : order.status === 'DISPATCHED' ? 'text-sky-600 bg-sky-500/10 border-sky-500/20' : 'text-rose-600 bg-rose-500/10 border-rose-500/20'}">
								<span class="w-1.5 h-1.5 rounded-full {order.status === 'DISPATCHED' ? 'bg-sky-500 animate-pulse' : order.status === 'WAITING_UJO' ? 'bg-indigo-500' : (order.status === 'WAITING_TARIFF' || order.status === 'WAITING_CUSTOMER') ? 'bg-amber-500' : order.status === 'READY_TO_DISPATCH' ? 'bg-emerald-500' : 'bg-rose-500'}"></span> 
								{#if order.status === 'WAITING_UJO'} New Order 
								{:else if order.status === 'WAITING_TARIFF' || order.status === 'WAITING_CUSTOMER'} Waiting Marketing 
								{:else if order.status === 'READY_TO_DISPATCH'} Ready to Dispatch 
								{:else if order.status === 'DISPATCHED'} Dispatched 
								{:else if order.status === 'CLOSING'} Closing 
								{/if}
							</span>
						</div>
						
						<div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
							<div>
								<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Route</p>
								<p class="font-bold text-on-surface">{order.origin} → {order.destination}</p>
							</div>
							<div>
								<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Cargo</p>
								<p class="font-medium text-on-surface">{order.cargo} ({order.weight} T)</p>
							</div>
							<div>
								<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Loading Date</p>
								<p class="font-medium text-on-surface">{order.loadingDate ? new Date(order.loadingDate).toLocaleDateString('id-ID') : '-'}</p>
							</div>
							<div>
								<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Est. UJO</p>
								<p class="font-bold text-sky-600">{order.estimatedUjo ? formatCurrency(parseFloat(order.estimatedUjo)) : '-'}</p>
							</div>
						</div>

						{#if order.assignedUnit}
							<div class="p-3 rounded-xl bg-surface-container border border-surface-container-high flex items-center gap-3 mb-4">
								<span class="material-symbols-outlined text-on-surface-variant text-lg">local_shipping</span>
								<div>
									<p class="text-xs font-bold text-on-surface">{order.assignedUnit} • {order.assignedDriver || 'No Driver'}</p>
									<p class="text-[10px] text-on-surface-variant">Unit assigned</p>
								</div>
							</div>
						{/if}

						<div class="pt-3 border-t border-surface-container flex justify-end">
							{#if order.status === 'WAITING_UJO'}
								<button onclick={() => openUjoModal(order)} class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
									<span class="material-symbols-outlined text-[16px]">add_task</span>
									Assign Unit & Input UJO
								</button>
							{:else if order.status === 'WAITING_TARIFF' || order.status === 'WAITING_CUSTOMER'}
								<div class="flex items-center gap-2 w-full">
									<div class="px-4 py-2 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg text-xs font-bold flex items-center gap-2 flex-1 justify-center border border-amber-200 dark:border-amber-900/50">
										<span class="material-symbols-outlined text-[16px]">schedule</span>
										Waiting Marketing Confirmation
									</div>
									<button onclick={() => openUjoModal(order)} class="px-3 py-2 bg-surface-container-high hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 text-on-surface-variant rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-2">
										<span class="material-symbols-outlined text-[16px]">edit</span> Edit UJO
									</button>
								</div>
							{:else if order.status === 'READY_TO_DISPATCH'}
								<form method="POST" action="?/finalizeDispatch" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; } }}>
									<input type="hidden" name="orderId" value={order.id}>
									<button type="submit" disabled={isSubmitting} class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50">
										<span class="material-symbols-outlined text-[16px]">send</span>
										Finalize Dispatch & Send UJO
									</button>
								</form>
							{:else if order.status === 'DISPATCHED'}
								<form method="POST" action="?/submitClosing" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; } }}>
									<input type="hidden" name="orderId" value={order.id}>
									<button type="submit" disabled={isSubmitting} class="px-4 py-2 bg-sky-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-sky-700 transition-colors flex items-center gap-2 disabled:opacity-50">
										<span class="material-symbols-outlined text-[16px]">pin_drop</span>
										Mark Unit Arrived (Begin Closing)
									</button>
								</form>
							{:else if order.status === 'CLOSING'}
								<button onclick={() => openClosingModal(order)} class="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2">
									<span class="material-symbols-outlined text-[16px]">receipt_long</span>
									Close Dispatch & Input Real Costs
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Available Units Panel -->
		<div class="bg-surface-container-lowest rounded-[24px] p-6 shadow-sm border border-surface-container h-fit sticky top-8">
			<h3 class="text-lg font-bold text-on-surface tracking-tight mb-4 flex items-center gap-2">
				<span class="material-symbols-outlined text-emerald-500">check_circle</span>
				Available Units
			</h3>
			<div class="space-y-3 max-h-[600px] overflow-y-auto pr-2">
				{#each availableUnits as unit}
					<div class="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors cursor-pointer group border border-transparent hover:border-sky-500/20">
						<div class="flex items-center justify-between mb-2">
							<div class="flex items-center gap-3">
								<div class="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
									<span class="material-symbols-outlined text-[18px]">local_shipping</span>
								</div>
								<div>
									<p class="text-sm font-black text-on-surface">{unit.id}</p>
									<p class="text-[10px] text-on-surface-variant font-medium">{unit.brand}</p>
								</div>
							</div>
							{#if unit.current_state !== 'STANDBY'}
								<span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700 border border-sky-200">
									{unit.current_state}
								</span>
							{/if}
						</div>
						<div class="flex items-center gap-4 text-[11px] text-on-surface-variant mt-2">
							<span class="flex items-center gap-1">
								<span class="material-symbols-outlined text-[12px]">person</span>
								{unit.driver}
							</span>
							<span class="flex items-center gap-1">
								<span class="material-symbols-outlined text-[12px]">location_on</span>
								{unit.location || 'Pool'}
							</span>
						</div>
						<div class="mt-2">
							<span class="text-[9px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded uppercase tracking-wider">{unit.type}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<!-- Modal Pengajuan UJO -->
{#if showUjoModal && selectedOrder}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeUjoModal}></div>
		
		<!-- Modal Content -->
		<div class="relative w-full max-w-lg bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-xl font-bold text-on-surface">Assign Unit & Input UJO</h3>
						<p class="text-xs text-on-surface-variant mt-1">Order: <span class="font-bold text-on-surface">{selectedOrder.id}</span> • {selectedOrder.customer}</p>
					</div>
					<button onclick={closeUjoModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>
			
			<form method="POST" action="?/assignUjo" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); } }}>
				<input type="hidden" name="orderId" value={selectedOrder.id}>
				<div class="p-6 overflow-y-auto">
					<!-- Order Details Summary -->
					<div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 mb-6 border border-indigo-100 dark:border-indigo-900/50">
						<div class="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 mb-2">
							<span class="material-symbols-outlined text-sm">route</span>
							<span class="text-xs font-bold uppercase tracking-wider">Route & Cargo</span>
						</div>
						<p class="font-bold text-on-surface text-sm">{selectedOrder.origin} → {selectedOrder.destination}</p>
						<p class="text-xs text-on-surface-variant mt-1">{selectedOrder.cargo} • {selectedOrder.weight} Ton</p>
					</div>

					<!-- Form Inputs -->
					<div class="space-y-5">
						<div class="relative">
							<div class="flex items-center justify-between mb-2">
								<label class="block text-xs font-bold text-on-surface-variant">Select Unit & Driver</label>
								<button type="button" onclick={getSmartDispatch} disabled={isAiLoading} class="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1.5 rounded-lg border border-orange-200 flex items-center gap-1 hover:bg-orange-100 transition-colors disabled:opacity-50">
									{#if isAiLoading}
										<span class="material-symbols-outlined text-[14px] animate-spin">refresh</span>
										Menganalisis...
									{:else}
										<span class="material-symbols-outlined text-[14px]">smart_toy</span>
										✨ Tanya FARIDA
									{/if}
								</button>
							</div>
							
							<input type="hidden" name="unitId" bind:value={ujoUnit} required />
							<input type="text" bind:value={unitSearch} onfocus={() => showUnitDropdown = true} onblur={() => setTimeout(() => showUnitDropdown = false, 200)} placeholder="Search unit number, driver, or type..." class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/50" autocomplete="off" />
							{#if showUnitDropdown && filteredUnits.length > 0}
								<ul class="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg max-h-48 overflow-y-auto hide-scrollbar">
									{#each filteredUnits as unit}
										<!-- svelte-ignore a11y_click_events_have_key_events -->
										<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
										<li class="px-4 py-3 text-sm text-on-surface cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border-b border-surface-container last:border-0" onclick={() => { ujoUnit = unit.id; unitSearch = `${unit.id} • ${unit.driver} (${unit.type})`; showUnitDropdown = false; }}>
											<span class="font-bold">{unit.id}</span> • {unit.driver} 
											<span class="text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded ml-1 text-on-surface-variant">{unit.type}</span>
										</li>
									{/each}
								</ul>
							{/if}
							
							{#if aiReason}
								<div class="mt-3 p-3 rounded-xl bg-orange-50 border border-orange-200 animate-in fade-in slide-in-from-top-2">
									<div class="flex items-center gap-1.5 mb-1.5">
										<span class="material-symbols-outlined text-orange-600 text-[14px]">smart_toy</span>
										<p class="text-[10px] font-black text-orange-600 uppercase tracking-wider">FARIDA Insight</p>
									</div>
									<p class="text-xs font-medium text-orange-900 leading-relaxed">{aiReason}</p>
								</div>
							{/if}
						</div>
						
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Total UJO Dasar</label>
							<div class="relative">
								<span class="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">Rp</span>
								<input type="number" name="ujoAmount" bind:value={ujoAmount} required placeholder="Enter base amount" class="w-full bg-surface-container-low border border-surface-container rounded-xl pl-12 pr-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
							</div>
						</div>
						
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-2">Uang Makan</label>
								<div class="relative">
									<span class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-xs">Rp</span>
									<input type="number" name="ujoMakan" bind:value={ujoMakan} placeholder="0" class="w-full bg-surface-container-low border border-surface-container rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
								</div>
							</div>
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-2">Uang Tol</label>
								<div class="relative">
									<span class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-xs">Rp</span>
									<input type="number" name="ujoTol" bind:value={ujoTol} placeholder="0" class="w-full bg-surface-container-low border border-surface-container rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
								</div>
							</div>
						</div>
						
						<div class="bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between">
							<span class="text-xs font-bold text-indigo-700 dark:text-indigo-400">Total UJO:</span>
							<span class="text-base font-black text-indigo-700 dark:text-indigo-400">Rp {formatCurrency((Number(ujoAmount) || 0) + (Number(ujoMakan) || 0) + (Number(ujoTol) || 0)).replace('Rp', '').trim()}</span>
						</div>
						<p class="text-[10px] text-on-surface-variant mt-1 flex items-center gap-1">
							<span class="material-symbols-outlined text-[12px] text-amber-500">info</span>
							Total UJO akan dikirim ke Kasir setelah Marketing & Customer Deal.
						</p>
					</div>
				</div>
				
				<div class="p-6 border-t border-surface-container bg-surface-container-low/50 flex justify-end gap-3">
					<button type="button" onclick={closeUjoModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">
						Cancel
					</button>
					<button type="submit" disabled={isSubmitting} class="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50">
						<span class="material-symbols-outlined text-[18px]">save</span>
						Save & Submit
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Closing Dispatch -->
{#if showClosingModal && selectedOrder}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeClosingModal}></div>
		
		<!-- Modal Content -->
		<div class="relative w-full max-w-lg bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container bg-rose-50/50 dark:bg-rose-900/10">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-xl font-bold text-rose-700 dark:text-rose-400">Closing Dispatch</h3>
						<p class="text-xs text-on-surface-variant mt-1">Order: <span class="font-bold text-on-surface">{selectedOrder.id}</span> • {selectedOrder.customer}</p>
					</div>
					<button onclick={closeClosingModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>
			
			<form method="POST" action="?/submitClosing" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); } }}>
				<input type="hidden" name="orderId" value={selectedOrder.id}>
				<div class="p-6 overflow-y-auto">
					<!-- Order Details -->
					<div class="grid grid-cols-2 gap-4 mb-6 text-sm">
						<div class="bg-surface-container-low p-3 rounded-xl border border-surface-container">
							<span class="block text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">Unit & Driver</span>
							<span class="font-bold text-on-surface block">{selectedOrder.assignedUnit}</span>
							<span class="text-xs text-on-surface-variant">{selectedOrder.assignedDriver}</span>
						</div>
						<div class="bg-surface-container-low p-3 rounded-xl border border-surface-container">
							<span class="block text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">UJO Awal</span>
							<span class="font-bold text-sky-600 block">{formatCurrency(parseFloat(selectedOrder.estimatedUjo))}</span>
						</div>
					</div>

					<div class="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs p-3 rounded-xl mb-6 flex items-start gap-2 border border-amber-200 dark:border-amber-900/50">
						<span class="material-symbols-outlined text-base mt-0.5">warning</span>
						<p>Silakan masukkan kelebihan tonase (jika ada) dan rincian biaya aktual di luar UJO awal untuk closing <b>Delivery Note (DN) / Surat Jalan</b> ini.</p>
					</div>

					<!-- Form Inputs -->
					<div class="space-y-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Real Weight (Tonase Aktual)</label>
							<div class="relative">
								<input type="number" name="closeWeight" bind:value={closeWeight} required placeholder="Enter real weight" class="w-full bg-surface-container-low border border-surface-container rounded-xl pl-4 pr-12 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
								<span class="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-xs">Ton</span>
							</div>
						</div>

						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Biaya Tambahan / Retribusi / Parkir</label>
							<div class="relative">
								<span class="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">Rp</span>
								<input type="number" name="closeCost" bind:value={closeCost} placeholder="0" class="w-full bg-surface-container-low border border-surface-container rounded-xl pl-12 pr-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
							</div>
						</div>

						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Keterangan Biaya Tambahan</label>
							<textarea name="closeDesc" bind:value={closeDesc} rows="3" placeholder="Contoh: Biaya parkir bongkar muat & retribusi jalan..." class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"></textarea>
						</div>
					</div>
				</div>
				
				<div class="p-6 border-t border-surface-container bg-surface-container-low/50 flex justify-end gap-3">
					<button type="button" onclick={closeClosingModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">
						Cancel
					</button>
					<button type="submit" disabled={isSubmitting} class="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50">
						<span class="material-symbols-outlined text-[18px]">check_circle</span>
						Submit Closing
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
