<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	
	let { data, form }: { data: PageData, form: ActionData } = $props();
	
	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let statusFilter = $state($page.url.searchParams.get('status') || 'All');
	const statusTabs = ['All', 'WAITING_UJO', 'WAITING_TARIFF', 'WAITING_CUSTOMER', 'READY_TO_DISPATCH', 'DISPATCHED', 'COMPLETED', 'CANCELED'];
	const tabLabels: Record<string, string> = {
		'All': 'All', 'WAITING_UJO': 'Waiting UJO', 'WAITING_TARIFF': 'Waiting Tariff',
		'WAITING_CUSTOMER': 'Waiting Customer', 'READY_TO_DISPATCH': 'Ready to Dispatch',
		'DISPATCHED': 'In Transit', 'COMPLETED': 'Completed', 'CANCELED': 'Canceled'
	};
	
	let searchTimer: ReturnType<typeof setTimeout>;

	function updateQueryParams() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');
		if (statusFilter && statusFilter !== 'All') url.searchParams.set('status', statusFilter);
		else url.searchParams.delete('status');
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(updateQueryParams, 400);
	}

	function handleStatusClick(s: string) {
		statusFilter = s;
		updateQueryParams();
	}

	// Dynamic store filtering from data.orders
	let filteredOrders = $derived.by(() => {
		let result = data.orders || [];
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			result = result.filter(o => 
				(o.customer_name && o.customer_name.toLowerCase().includes(q)) || 
				(o.id && o.id.toLowerCase().includes(q)) ||
				(o.origin_name && o.origin_name.toLowerCase().includes(q)) ||
				(o.destination_name && o.destination_name.toLowerCase().includes(q))
			);
		}
		if (statusFilter !== 'All') {
			result = result.filter(o => o.status === statusFilter);
		}
		return result;
	});

	let metrics = $derived.by(() => {
		const all = data.orders || [];
		return {
			totalOrders: all.length,
			pending: all.filter(o => ['WAITING_UJO', 'WAITING_TARIFF', 'WAITING_CUSTOMER'].includes(o.status)).length,
			confirmed: all.filter(o => o.status === 'READY_TO_DISPATCH').length,
			inTransit: all.filter(o => o.status === 'DISPATCHED').length,
			completed: all.filter(o => o.status === 'COMPLETED').length
		};
	});

	const perPage = 5;
	let totalItems = $derived(filteredOrders.length);
	let totalPages = $derived(Math.max(1, Math.ceil(totalItems / perPage)));
	let currentPage = $derived(parseInt($page.url.searchParams.get('page') || '1'));
	let startItem = $derived(totalItems === 0 ? 0 : ((currentPage - 1) * perPage) + 1);
	let endItem = $derived(Math.min(currentPage * perPage, totalItems));
	
	let paginatedOrders = $derived(filteredOrders.slice((currentPage - 1) * perPage, currentPage * perPage));

	function goToPage(p: number) {
		if (p < 1 || p > totalPages) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { invalidateAll: true, noScroll: true });
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};

	function getStatusBadge(status: string) {
		switch(status) {
			case 'WAITING_UJO': return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
			case 'WAITING_TARIFF': return 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20';
			case 'WAITING_CUSTOMER': return 'text-pink-600 dark:text-pink-400 bg-pink-500/10 border-pink-500/20';
			case 'READY_TO_DISPATCH': return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20';
			case 'DISPATCHED': return 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
			case 'COMPLETED': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
			default: return 'text-slate-600 bg-slate-100 border-slate-200';
		}
	}

	function getStatusDot(status: string) {
		switch(status) {
			case 'WAITING_UJO': return 'bg-amber-500 animate-pulse';
			case 'WAITING_TARIFF': return 'bg-purple-500 animate-pulse';
			case 'WAITING_CUSTOMER': return 'bg-pink-500 animate-pulse';
			case 'READY_TO_DISPATCH': return 'bg-blue-500';
			case 'DISPATCHED': return 'bg-indigo-500 animate-pulse';
			case 'COMPLETED': return 'bg-emerald-500';
			default: return 'bg-slate-400';
		}
	}

	// Modal states
	let showNewOrderModal = $state(false);
	let showTariffModal = $state(false);
	let showEditOrderModal = $state(false);
	let selectedOrder = $state<any>(null);
	let isSubmitting = $state(false);

	let customersList = $state(data.customers || []);

	let customerSearch = $state('');
	let selectedCustomerId = $state('');
	let showCustomerDropdown = $state(false);
	let filteredCustomers = $derived(customersList.filter((c: any) => (c.nama_kustomer || c.name).toLowerCase().includes(customerSearch.toLowerCase())));

	let originSearch = $state('');
	let selectedOriginId = $state('');
	let showOriginDropdown = $state(false);
	let filteredOrigins = $derived(customersList.filter((c: any) => (c.nama_kustomer || c.name).toLowerCase().includes(originSearch.toLowerCase())));

	let destSearch = $state('');
	let selectedDestId = $state('');
	let showDestDropdown = $state(false);
	let filteredDests = $derived(customersList.filter((c: any) => (c.nama_kustomer || c.name).toLowerCase().includes(destSearch.toLowerCase())));

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
				// The API returns { id, name }, we map it to match nama_kustomer for consistency
				const newCustomer = { ...result.customer, nama_kustomer: result.customer.name };
				customersList = [...customersList, newCustomer];
				
				if (type === 'customer') {
					selectedCustomerId = newCustomer.id;
					customerSearch = newCustomer.nama_kustomer;
					showCustomerDropdown = false;
				} else if (type === 'origin') {
					selectedOriginId = newCustomer.id;
					originSearch = newCustomer.nama_kustomer;
					showOriginDropdown = false;
				} else if (type === 'dest') {
					selectedDestId = newCustomer.id;
					destSearch = newCustomer.nama_kustomer;
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

	function openNewOrder() { 
		customerSearch = '';
		selectedCustomerId = '';
		originSearch = '';
		selectedOriginId = '';
		destSearch = '';
		selectedDestId = '';
		showNewOrderModal = true; 
	}
	function closeNewOrder() { showNewOrderModal = false; }
	
	function openEditOrder(order: any) {
		selectedOrder = order;
		showEditOrderModal = true;
	}
	function closeEditOrder() {
		showEditOrderModal = false;
		selectedOrder = null;
	}

	function openTariffModal(order: any) {
		selectedOrder = order;
		showTariffModal = true;
	}
	function closeTariffModal() {
		showTariffModal = false;
		selectedOrder = null;
	}
</script>

<svelte:head>
	<title>Orders / DO | Marketing</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-rose-600 dark:text-rose-400 text-2xl">receipt_long</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Orders / Delivery Orders (DO)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pembuatan dan monitoring Delivery Order klien, verifikasi tarif, penentuan UJO rute, dan tracking pengiriman
			</p>
		</div>
		<div class="flex gap-3">
			<button class="bg-surface-container-high hover:bg-surface-container-highest border border-slate-200/60 dark:border-slate-800/60 text-on-surface px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer">
				<span class="material-symbols-outlined text-lg">download</span>
				<span>Export Data</span>
			</button>
			<button onclick={openNewOrder} class="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer">
				<span class="material-symbols-outlined text-lg">note_add</span>
				<span>Buat DO Baru</span>
			</button>
		</div>
	</header>

	{#if form?.error}
		<div class="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium shadow-xs">
			{form.error}
		</div>
	{/if}
	
	{#if form?.success}
		<div class="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-medium shadow-xs">
			{form.message}
		</div>
	{/if}

	<!-- Metrics Cards (Bento) -->
	<div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs text-center cursor-pointer" onclick={() => handleStatusClick('All')}>
			<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Total Orders</p>
			<h3 class="text-2xl font-black text-on-surface">{metrics.totalOrders}</h3>
		</div>
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs text-center cursor-pointer hover:border-amber-500/30 transition-all" onclick={() => handleStatusClick('WAITING_UJO')}>
			<p class="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Menunggu UJO/Tarif</p>
			<h3 class="text-2xl font-black text-amber-600">{metrics.pending}</h3>
		</div>
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs text-center cursor-pointer hover:border-blue-500/30 transition-all" onclick={() => handleStatusClick('READY_TO_DISPATCH')}>
			<p class="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Siap Dispatch</p>
			<h3 class="text-2xl font-black text-blue-600">{metrics.confirmed}</h3>
		</div>
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs text-center cursor-pointer hover:border-indigo-500/30 transition-all" onclick={() => handleStatusClick('DISPATCHED')}>
			<p class="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-0.5">Dalam Perjalanan</p>
			<h3 class="text-2xl font-black text-indigo-600">{metrics.inTransit}</h3>
		</div>
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs text-center cursor-pointer hover:border-emerald-500/30 transition-all" onclick={() => handleStatusClick('COMPLETED')}>
			<p class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Selesai Bongkar</p>
			<h3 class="text-2xl font-black text-emerald-600">{metrics.completed}</h3>
		</div>
	</div>

	<!-- Unified Filter Bar -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<!-- Segmented Control Status Tabs -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
			{#each statusTabs as tab}
				<button 
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all {statusFilter === tab ? 'bg-rose-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
					onclick={() => handleStatusClick(tab)}>
					{tabLabels[tab]}
				</button>
			{/each}
		</div>

		<!-- Search Box -->
		<div class="relative w-full md:w-72">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input 
				type="text" 
				bind:value={searchQuery} 
				oninput={handleSearchInput}
				placeholder="Cari DO, customer, rute..." 
				class="w-full bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-xs font-medium shadow-xs" 
			/>
		</div>
	</div>

	<!-- Data Table Container -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[1200px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Nomor DO & Info</th>
						<th class="py-3.5 px-5">Nama Customer</th>
						<th class="py-3.5 px-5">Rute & Muatan</th>
						<th class="py-3.5 px-5">Jadwal Muat</th>
						<th class="py-3.5 px-5">Tarif Kontrak</th>
						<th class="py-3.5 px-5">Status Order</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if paginatedOrders.length === 0}
						<tr>
							<td colspan="7" class="py-16 text-center text-on-surface-variant font-medium">
								<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 block mb-2">receipt_long</span>
								<p class="font-bold text-on-surface">Belum ada order yang sesuai.</p>
							</td>
						</tr>
					{/if}
					{#each paginatedOrders as order}
						<tr class="hover:bg-surface-container transition-colors">
							<td class="py-4 px-5">
								<div class="flex flex-col">
									<span class="text-sm font-bold text-on-surface font-mono">{order.id}</span>
									<span class="text-[10px] text-on-surface-variant mt-0.5">{new Date(order.created_at).toLocaleDateString('id-ID')}</span>
								</div>
							</td>
							<td class="py-4 px-5">
								<p class="text-sm font-bold text-on-surface">{order.customer_name}</p>
							</td>
							<td class="py-4 px-5">
								<div class="flex flex-col gap-0.5">
									<div class="flex items-center gap-1.5">
										<span class="material-symbols-outlined text-sm text-rose-500">route</span>
										<span class="text-xs font-bold text-on-surface">{order.origin_name} → {order.destination_name}</span>
									</div>
									<div class="flex items-center gap-2 mt-0.5">
										<span class="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded">{order.jenis_muatan}</span>
										<span class="text-[10px] font-medium text-on-surface-variant">{order.berat_muatan ? order.berat_muatan + ' Ton' : '-'}</span>
									</div>
								</div>
							</td>
							<td class="py-4 px-5">
								<span class="text-xs text-on-surface-variant font-medium flex items-center gap-1">
									<span class="material-symbols-outlined text-sm">calendar_today</span>
									{order.tgl_muat ? new Date(order.tgl_muat).toLocaleDateString('id-ID') : '-'}
								</span>
							</td>
							<td class="py-4 px-5">
								<span class="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">{order.tariff ? formatCurrency(Number(order.tariff)) : '-'}</span>
								<p class="text-[10px] font-medium text-on-surface-variant mt-0.5">{order.vehicle_type}</p>
							</td>
							<td class="py-4 px-5">
								<span class="inline-flex items-center gap-1.5 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider border {getStatusBadge(order.status)}">
									<span class="w-1.5 h-1.5 rounded-full {getStatusDot(order.status)}"></span> {tabLabels[order.status]}
								</span>
							</td>
							<td class="py-4 px-5 text-right">
								<div class="flex items-center justify-end gap-1.5">
									{#if order.status === 'WAITING_TARIFF'}
										<button onclick={() => openTariffModal(order)} class="px-2.5 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors shadow-xs whitespace-nowrap cursor-pointer">
											Input Tarif
										</button>
									{/if}
									{#if ['WAITING_UJO', 'WAITING_TARIFF', 'WAITING_CUSTOMER'].includes(order.status)}
										<button onclick={() => openEditOrder(order)} class="p-2 rounded-lg text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors" title="Edit Order">
											<span class="material-symbols-outlined text-lg">edit</span>
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		
		<!-- Pagination Footer -->
		<div class="px-6 py-4 border-t border-surface-container flex items-center justify-between bg-surface-container-lowest">
			<p class="text-xs text-on-surface-variant font-medium">Showing {startItem} to {endItem} of {totalItems} entries</p>
			<div class="flex gap-1">
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				{#each Array(totalPages) as _, i}
					<button class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-colors {currentPage === i + 1 ? 'bg-rose-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}" onclick={() => goToPage(i + 1)}>
						{i + 1}
					</button>
				{/each}
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Modal Create Order -->
{#if showNewOrderModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeNewOrder}></div>
		<div class="relative w-full max-w-2xl bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-xl font-bold text-on-surface">Create New Order</h3>
						<p class="text-xs text-on-surface-variant mt-1">Order will be sent to OCS to determine UJO before Tariff is created.</p>
					</div>
					<button onclick={closeNewOrder} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>
			
			<form method="POST" action="?/createOrder" use:enhance={() => {
				isSubmitting = true;
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') closeNewOrder();
					update();
				};
			}}>
				<div class="p-6 overflow-y-auto space-y-4">
					<div class="relative">
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Customer</label>
						<input type="hidden" name="customerId" value={selectedCustomerId} required />
						<input type="text" bind:value={customerSearch} onfocus={() => showCustomerDropdown = true} onblur={() => setTimeout(() => showCustomerDropdown = false, 200)} placeholder="Search Customer..." class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50" autocomplete="off" />
						{#if showCustomerDropdown}
							<ul class="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg max-h-48 overflow-y-auto hide-scrollbar">
								{#if filteredCustomers.length > 0}
									{#each filteredCustomers as c}
										<!-- svelte-ignore a11y_click_events_have_key_events -->
										<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
										<li class="px-4 py-2 text-sm text-on-surface cursor-pointer hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0" onclick={() => { selectedCustomerId = c.id; customerSearch = c.nama_kustomer || c.name; showCustomerDropdown = false; }}>
											{c.nama_kustomer || c.name}
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
					
					<div class="grid grid-cols-2 gap-4">
						<div class="relative">
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Origin Location</label>
							<input type="hidden" name="originId" value={selectedOriginId} required />
							<input type="text" bind:value={originSearch} onfocus={() => showOriginDropdown = true} onblur={() => setTimeout(() => showOriginDropdown = false, 200)} placeholder="Search Origin..." class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50" autocomplete="off" />
							{#if showOriginDropdown}
								<ul class="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg max-h-48 overflow-y-auto hide-scrollbar">
									{#if filteredOrigins.length > 0}
										{#each filteredOrigins as c}
											<!-- svelte-ignore a11y_click_events_have_key_events -->
											<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
											<li class="px-4 py-2 text-sm text-on-surface cursor-pointer hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0" onclick={() => { selectedOriginId = c.id; originSearch = c.nama_kustomer || c.name; showOriginDropdown = false; }}>
												{c.nama_kustomer || c.name}
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
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Destination Location</label>
							<input type="hidden" name="destinationId" value={selectedDestId} required />
							<input type="text" bind:value={destSearch} onfocus={() => showDestDropdown = true} onblur={() => setTimeout(() => showDestDropdown = false, 200)} placeholder="Search Destination..." class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50" autocomplete="off" />
							{#if showDestDropdown}
								<ul class="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg max-h-48 overflow-y-auto hide-scrollbar">
									{#if filteredDests.length > 0}
										{#each filteredDests as c}
											<!-- svelte-ignore a11y_click_events_have_key_events -->
											<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
											<li class="px-4 py-2 text-sm text-on-surface cursor-pointer hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0" onclick={() => { selectedDestId = c.id; destSearch = c.nama_kustomer || c.name; showDestDropdown = false; }}>
												{c.nama_kustomer || c.name}
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
					</div>

					<div class="grid grid-cols-2 md:grid-cols-3 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Project / Unit Bisnis</label>
							<select name="projectId" required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
								<option value="">-- Select Project --</option>
								{#each data.projects as p}
									<option value={p.id}>{p.project_name} ({p.category})</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Vehicle Type</label>
							<select name="vehicleTypeId" required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
								<option value="">-- Select Vehicle --</option>
								{#each data.vehicleTypes as v}
									<option value={v.id}>{v.nama_tipe}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Cargo Type & Weight (Ton)</label>
							<div class="flex gap-2">
								<input type="text" name="cargoType" placeholder="Cargo Type" required class="w-2/3 bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
								<input type="number" step="0.01" name="weight" placeholder="Ton" class="w-1/3 bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
							</div>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Loading Date</label>
							<input type="date" name="loadDate" required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Unloading Date (Optional)</label>
							<input type="date" name="unloadDate" class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
						</div>
					</div>
				</div>
				
				<div class="p-6 border-t border-surface-container bg-surface-container-low/50 flex justify-end gap-3">
					<button type="button" onclick={closeNewOrder} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">Cancel</button>
					<button type="submit" disabled={isSubmitting} class="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50">
						<span class="material-symbols-outlined text-[18px]">send</span> Submit to OCS
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Edit Order -->
{#if showEditOrderModal && selectedOrder}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeEditOrder}></div>
		<div class="relative w-full max-w-2xl bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-xl font-bold text-on-surface">Edit Order</h3>
						<p class="text-xs text-on-surface-variant mt-1">Order ID: <span class="font-bold text-on-surface">{selectedOrder.id}</span></p>
					</div>
					<button onclick={closeEditOrder} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>
			
			<form method="POST" action="?/updateOrder" use:enhance={() => {
				isSubmitting = true;
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') closeEditOrder();
					update();
				};
			}}>
				<input type="hidden" name="id" value={selectedOrder.id} />
				<div class="p-6 overflow-y-auto space-y-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Customer</label>
						<select name="customerId" required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
							{#each data.customers as c}
								<option value={c.id} selected={selectedOrder.customer_id === c.id}>{c.nama_kustomer}</option>
							{/each}
						</select>
					</div>
					
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Origin Location</label>
							<select name="originId" required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
								{#each data.customers as c}
									<option value={c.id} selected={selectedOrder.origin_id === c.id}>{c.nama_kustomer}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Destination Location</label>
							<select name="destinationId" required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
								{#each data.customers as c}
									<option value={c.id} selected={selectedOrder.destination_id === c.id}>{c.nama_kustomer}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Vehicle Type</label>
							<select name="vehicleTypeId" required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
								{#each data.vehicleTypes as v}
									<option value={v.id} selected={selectedOrder.tipe_unit_id === v.id}>{v.nama_tipe}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Cargo Type & Weight</label>
							<div class="flex gap-2">
								<input type="text" name="cargoType" value={selectedOrder.jenis_muatan} placeholder="Cargo Type" required class="w-2/3 bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
								<input type="number" step="0.01" name="weight" value={selectedOrder.berat_muatan} placeholder="Ton" class="w-1/3 bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
							</div>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Loading Date</label>
							<input type="date" name="loadDate" value={selectedOrder.tgl_muat ? new Date(selectedOrder.tgl_muat).toISOString().split('T')[0] : ''} required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Unloading Date (Optional)</label>
							<input type="date" name="unloadDate" value={selectedOrder.tgl_bongkar ? new Date(selectedOrder.tgl_bongkar).toISOString().split('T')[0] : ''} class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
						</div>
					</div>
				</div>
				
				<div class="p-6 border-t border-surface-container bg-surface-container-low/50 flex justify-end gap-3">
					<button type="button" onclick={closeEditOrder} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">Cancel</button>
					<button type="submit" disabled={isSubmitting} class="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50">
						<span class="material-symbols-outlined text-[18px]">save</span> Save Changes
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Input Tariff -->
{#if showTariffModal && selectedOrder}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeTariffModal}></div>
		<div class="relative w-full max-w-lg bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container bg-purple-50/50 dark:bg-purple-900/10">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-xl font-bold text-purple-700 dark:text-purple-400">Input Order Tariff</h3>
						<p class="text-xs text-on-surface-variant mt-1">Order: <span class="font-bold text-on-surface">{selectedOrder.id}</span></p>
					</div>
					<button onclick={closeTariffModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>
			
			<form method="POST" action="?/submitTariff" use:enhance={() => {
				isSubmitting = true;
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') closeTariffModal();
					update();
				};
			}}>
				<input type="hidden" name="id" value={selectedOrder.id} />
				<div class="p-6 overflow-y-auto">
					<div class="bg-surface-container-low p-4 rounded-xl border border-surface-container mb-6 text-sm">
						<div class="flex justify-between mb-2">
							<span class="text-on-surface-variant">Route:</span>
							<span class="font-bold">{selectedOrder.origin_name} → {selectedOrder.destination_name}</span>
						</div>
						<div class="flex justify-between mb-2">
							<span class="text-on-surface-variant">Cargo & Vehicle:</span>
							<span class="font-bold">{selectedOrder.jenis_muatan} • {selectedOrder.vehicle_type}</span>
						</div>
						<div class="flex justify-between pt-2 border-t border-surface-container">
							<span class="text-on-surface-variant">Estimated UJO by OCS:</span>
							<span class="font-black text-rose-600">{selectedOrder.estimated_ujo ? formatCurrency(Number(selectedOrder.estimated_ujo)) : 'Belum diisi OCS'}</span>
						</div>
						<div class="flex justify-between pt-2">
							<span class="text-on-surface-variant">Recommended Tariff (From Master Rute):</span>
							<span class="font-black text-emerald-600">{selectedOrder.recommended_tariff && Number(selectedOrder.recommended_tariff) > 0 ? formatCurrency(Number(selectedOrder.recommended_tariff)) : 'Tidak Diset OCS'}</span>
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Tariff Amount (To Customer)</label>
						<div class="relative">
							<span class="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">Rp</span>
							<input type="number" name="tariff" required placeholder="Enter tariff amount" class="w-full bg-surface-container-low border border-purple-500/30 rounded-xl pl-12 pr-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-purple-500/50">
						</div>
						<p class="text-[10px] text-purple-600 mt-2 font-medium">Pastikan tarif lebih besar dari Estimated UJO untuk profit margin.</p>
					</div>
				</div>
				
				<div class="p-6 border-t border-surface-container bg-surface-container-low/50 flex justify-end gap-3">
					<button type="button" onclick={closeTariffModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">Cancel</button>
					<button type="submit" disabled={isSubmitting} class="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50">
						<span class="material-symbols-outlined text-[18px]">request_quote</span> Submit Tariff
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.hide-scrollbar::-webkit-scrollbar { display: none; }
	.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
