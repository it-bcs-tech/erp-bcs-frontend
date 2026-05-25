<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	
	let { data, form }: { data: PageData, form: ActionData } = $props();
	
	let customers = $derived(data.customers || []);
	let metrics = $derived(data.metrics);
	let meta = $derived(data.meta);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let typeFilter = $state($page.url.searchParams.get('type') || 'All');
	let tierFilter = $state($page.url.searchParams.get('tier') || 'All');
	
	let searchTimer: ReturnType<typeof setTimeout>;

	function updateQueryParams() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');
		if (typeFilter && typeFilter !== 'All') url.searchParams.set('type', typeFilter);
		else url.searchParams.delete('type');
		if (tierFilter && tierFilter !== 'All') url.searchParams.set('tier', tierFilter);
		else url.searchParams.delete('tier');
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(updateQueryParams, 400);
	}

	function handleFilterChange() {
		updateQueryParams();
	}

	let filteredCustomers = $derived.by(() => {
		let result = customers;
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			result = result.filter((c: any) => 
				c.name?.toLowerCase().includes(q) || 
				c.contactPerson?.toLowerCase().includes(q) ||
				c.id?.toLowerCase().includes(q)
			);
		}
		if (typeFilter !== 'All') result = result.filter((c: any) => c.type === typeFilter);
		if (tierFilter !== 'All') result = result.filter((c: any) => c.tier === tierFilter);
		return result;
	});

	let totalItems = $derived(filteredCustomers.length);
	let totalPages = $derived(Math.max(1, Math.ceil(totalItems / 5)));
	let currentPage = $derived(parseInt($page.url.searchParams.get('page') || '1'));
	let startItem = $derived(totalItems === 0 ? 0 : ((currentPage - 1) * 5) + 1);
	let endItem = $derived(Math.min(currentPage * 5, totalItems));
	
	let paginatedCustomers = $derived(filteredCustomers.slice((currentPage - 1) * 5, currentPage * 5));

	function goToPage(p: number) {
		if (p < 1 || p > totalPages) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { invalidateAll: true, noScroll: true });
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};

	function getTierColor(tier: string) {
		switch(tier) {
			case 'Platinum': return 'bg-violet-500/10 text-violet-600 border-violet-500/20';
			case 'Gold': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
			case 'Silver': return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
			default: return 'bg-surface-container-high text-on-surface-variant border-surface-container';
		}
	}

	let showEditModal = $state(false);
	let selectedCustomer = $state<any>(null);
	let isSubmitting = $state(false);

	function openEditModal(cust: any) {
		selectedCustomer = cust;
		showEditModal = true;
	}
	function closeEditModal() {
		showEditModal = false;
		selectedCustomer = null;
	}

	let L: any;
	let showMapPicker = $state(false);
	let mapElement = $state<HTMLElement | null>(null);
	let pickerMap: any;
	let pickerMarker: any;
	let isFetchingAddress = $state(false);
	
	let mapSearchQuery = $state('');
	let isSearchingMap = $state(false);

	async function searchMap(e: Event) {
		e.preventDefault();
		if (!mapSearchQuery.trim()) return;
		isSearchingMap = true;
		try {
			const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}&limit=1`);
			const data = await res.json();
			if (data && data.length > 0) {
				const { lat, lon, display_name } = data[0];
				
				// Move map and marker
				if (pickerMap && pickerMarker) {
					pickerMap.setView([lat, lon], 16);
					pickerMarker.setLatLng([lat, lon]);
				}
				
				// Update selected location
				selectedCustomer = {
					...selectedCustomer,
					alamat: display_name,
					latitude: parseFloat(lat).toFixed(6),
					longitude: parseFloat(lon).toFixed(6)
				};
			} else {
				alert("Lokasi tidak ditemukan. Coba kata kunci yang lebih spesifik.");
			}
		} catch (err) {
			console.error("Map search failed", err);
		} finally {
			isSearchingMap = false;
		}
	}

	onMount(async () => {
		if (browser) {
			L = await import('leaflet');
		}
	});

	function openMapPicker() {
		mapSearchQuery = '';
		showMapPicker = true;
		setTimeout(() => {
			if (!mapElement || !L) return;
			
			const initialLat = selectedCustomer.latitude || -6.200000;
			const initialLng = selectedCustomer.longitude || 106.816666;
			
			pickerMap = L.map(mapElement).setView([initialLat, initialLng], 15);
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; OpenStreetMap contributors'
			}).addTo(pickerMap);

			const icon = L.divIcon({
				className: 'custom-pin',
				html: `<div style="background-color: #e11d48; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
				iconSize: [24, 24],
				iconAnchor: [12, 12]
			});

			pickerMarker = L.marker([initialLat, initialLng], { icon, draggable: true }).addTo(pickerMap);

			const updateLocation = async (lat: number, lng: number) => {
				isFetchingAddress = true;
				try {
					const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
					const data = await res.json();
					if (data && data.display_name) {
						selectedCustomer = {
							...selectedCustomer,
							alamat: data.display_name,
							latitude: parseFloat(lat.toString()).toFixed(6),
							longitude: parseFloat(lng.toString()).toFixed(6)
						};
					}
				} catch (err) {
					console.error("Reverse geocoding failed", err);
					selectedCustomer = {
						...selectedCustomer,
						latitude: parseFloat(lat.toString()).toFixed(6),
						longitude: parseFloat(lng.toString()).toFixed(6)
					};
				} finally {
					isFetchingAddress = false;
				}
			};

			pickerMap.on('click', (e: any) => {
				const { lat, lng } = e.latlng;
				pickerMarker.setLatLng([lat, lng]);
				updateLocation(lat, lng);
			});

			pickerMarker.on('dragend', (e: any) => {
				const { lat, lng } = e.target.getLatLng();
				updateLocation(lat, lng);
			});
		}, 100);
	}

	function closeMapPicker() {
		if (pickerMap) {
			pickerMap.remove();
			pickerMap = null;
		}
		showMapPicker = false;
	}
</script>

<svelte:head>
	<title>Customers | Marketing</title>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header & Actions -->
	<header class="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Customer Management</h1>
			<p class="text-on-surface-variant font-medium text-sm">Manage client profiles, contracts, and payment terms</p>
		</div>
		<div class="flex gap-3">
			<button class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container-low transition-colors">
				<span class="material-symbols-outlined text-lg">download</span>
				Export
			</button>
			<button class="bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-rose-700 transition-colors">
				<span class="material-symbols-outlined text-lg">person_add</span>
				Add Customer
			</button>
		</div>
	</header>

	{#if form?.error}
		<div class="mb-6 p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-medium">
			{form.error}
		</div>
	{/if}
	
	{#if form?.success}
		<div class="mb-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium">
			{form.message}
		</div>
	{/if}

	<!-- Metrics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-sm">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Customers</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-on-surface">{metrics.total}</h3>
				<span class="material-symbols-outlined text-3xl text-surface-variant">groups</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-emerald-500/20 shadow-sm">
			<p class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Active</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-emerald-600">{metrics.active}</h3>
				<span class="material-symbols-outlined text-3xl text-emerald-500/50">check_circle</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-blue-500/20 shadow-sm">
			<p class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Corporate</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-blue-600">{metrics.corporate}</h3>
				<span class="material-symbols-outlined text-3xl text-blue-500/50">domain</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-amber-500/20 shadow-sm">
			<p class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">SME / Retail</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-amber-600">{metrics.sme}</h3>
				<span class="material-symbols-outlined text-3xl text-amber-500/50">storefront</span>
			</div>
		</div>
	</div>

	<!-- Filters & Search -->
	<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
		<div class="flex gap-3">
			<select bind:value={typeFilter} onchange={handleFilterChange}
				class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium shadow-sm appearance-none cursor-pointer">
				<option value="All">All Types</option>
				<option value="Corporate">Corporate</option>
				<option value="SME">SME</option>
			</select>
			<select bind:value={tierFilter} onchange={handleFilterChange}
				class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium shadow-sm appearance-none cursor-pointer">
				<option value="All">All Tiers</option>
				<option value="Platinum">Platinum</option>
				<option value="Gold">Gold</option>
				<option value="Silver">Silver</option>
				<option value="Standard">Standard</option>
			</select>
		</div>
		<div class="relative w-full lg:w-72 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input type="text" bind:value={searchQuery} oninput={handleSearchInput}
				placeholder="Search customer or contact..." 
				class="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium shadow-sm" />
		</div>
	</div>

	<!-- Data Table -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse min-w-[1100px]">
				<thead>
					<tr class="border-b border-surface-container sticky top-0 bg-surface-container-lowest z-10">
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Customer</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Address & Location</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Contact Person</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Terms & Tier</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Performance</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#if paginatedCustomers.length === 0}
						<tr>
							<td colspan="6" class="py-12 text-center text-on-surface-variant font-medium">Tidak ada customer ditemukan.</td>
						</tr>
					{/if}
					{#each paginatedCustomers as cust}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-4 px-6">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
										<span class="material-symbols-outlined text-[20px]">{cust.type === 'Corporate' ? 'domain' : 'storefront'}</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{cust.name}</p>
										<div class="flex items-center gap-2 mt-0.5">
											<span class="text-[10px] font-medium text-on-surface-variant/70 uppercase tracking-widest">{cust.id}</span>
											<span class="text-[9px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">{cust.sector}</span>
										</div>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="flex items-start gap-2">
									{#if cust.latitude && cust.longitude}
										<a href="https://www.google.com/maps/search/?api=1&query={cust.latitude},{cust.longitude}" target="_blank" class="p-1.5 rounded-lg text-blue-600 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex-shrink-0" title="View on Maps">
											<span class="material-symbols-outlined text-[16px]">location_on</span>
										</a>
									{:else}
										<span class="p-1.5 rounded-lg text-slate-400 bg-slate-100 dark:bg-slate-800 flex-shrink-0" title="No coordinates">
											<span class="material-symbols-outlined text-[16px]">location_off</span>
										</span>
									{/if}
									<div class="flex flex-col gap-0.5">
										<span class="text-[11px] text-on-surface-variant line-clamp-2" title={cust.alamat}>{cust.alamat || 'Alamat belum diisi'}</span>
										{#if cust.latitude && cust.longitude}
											<span class="text-[9px] font-mono text-on-surface-variant/70">{cust.latitude}, {cust.longitude}</span>
										{/if}
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<p class="text-sm font-bold text-on-surface">{cust.contactPerson || '-'}</p>
								<p class="text-[11px] text-on-surface-variant mt-0.5">{cust.email}</p>
								<p class="text-[11px] text-on-surface-variant mt-0.5">{cust.phone}</p>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1.5">
									<span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border w-fit {getTierColor(cust.tier)}">
										{#if cust.tier === 'Platinum'}<span class="material-symbols-outlined text-[12px]">diamond</span>{/if}
										{#if cust.tier === 'Gold'}<span class="material-symbols-outlined text-[12px]">stars</span>{/if}
										{cust.tier}
									</span>
									<span class="text-[11px] font-medium text-on-surface-variant">{cust.term}</span>
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1">
									<span class="text-sm font-bold text-on-surface">{cust.totalOrders} Orders</span>
									<span class="text-[11px] font-medium text-on-surface-variant">{formatCurrency(cust.totalRevenue)}</span>
								</div>
							</td>
							<td class="py-4 px-6">
								{#if cust.status === 'Active'}
									<span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px] bg-slate-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-slate-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
									</span>
								{/if}
							</td>
							<td class="py-4 px-6 text-right">
								<div class="flex items-center justify-end gap-2">
									<button onclick={() => openEditModal(cust)} class="p-2 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors" title="Edit Customer">
										<span class="material-symbols-outlined text-[20px]">edit</span>
									</button>
									<button class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors" title="View Details">
										<span class="material-symbols-outlined text-[20px]">visibility</span>
									</button>
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

<!-- Modal Edit Customer -->
{#if showEditModal && selectedCustomer}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeEditModal}></div>
		<div class="relative w-full max-w-2xl bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-xl font-bold text-on-surface">Edit Customer</h3>
						<p class="text-xs text-on-surface-variant mt-1">Customer ID: <span class="font-bold text-on-surface">{selectedCustomer.id}</span></p>
					</div>
					<button onclick={closeEditModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>
			
			<form method="POST" action="?/editCustomer" use:enhance={() => {
				isSubmitting = true;
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') closeEditModal();
					update();
				};
			}}>
				<input type="hidden" name="id" value={selectedCustomer.id} />
				<div class="p-6 overflow-y-auto space-y-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant mb-2">Customer Name</label>
						<input type="text" name="name" value={selectedCustomer.name} required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
					</div>
					
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Category / Type</label>
							<select name="type" required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
								<option value="Corporate" selected={selectedCustomer.type === 'Corporate'}>Corporate</option>
								<option value="SME" selected={selectedCustomer.type === 'SME'}>SME</option>
							</select>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Tier</label>
							<select name="tier" class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
								<option value="Standard" selected={selectedCustomer.tier === 'Standard'}>Standard</option>
								<option value="Silver" selected={selectedCustomer.tier === 'Silver'}>Silver</option>
								<option value="Gold" selected={selectedCustomer.tier === 'Gold'}>Gold</option>
								<option value="Platinum" selected={selectedCustomer.tier === 'Platinum'}>Platinum</option>
							</select>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Contact Person</label>
							<input type="text" name="contactPerson" value={selectedCustomer.contactPerson || ''} placeholder="Person in Charge" class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Phone Number</label>
							<input type="text" name="phone" value={selectedCustomer.phone || ''} placeholder="Phone number" class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
						</div>
					</div>

					<div class="grid grid-cols-1 gap-4">
						<div>
							<div class="flex items-center justify-between mb-2">
								<label class="block text-xs font-bold text-on-surface-variant">Address</label>
								<button type="button" onclick={openMapPicker} class="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-[10px] font-bold hover:bg-blue-200 transition-colors shadow-sm">
									<span class="material-symbols-outlined text-[14px]">map</span>
									Pick on Map
								</button>
							</div>
							<textarea name="alamat" rows="2" placeholder="Full address" class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">{selectedCustomer.alamat || ''}</textarea>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Latitude</label>
							<input type="number" step="any" name="latitude" value={selectedCustomer.latitude || ''} placeholder="-6.123456" class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Longitude</label>
							<input type="number" step="any" name="longitude" value={selectedCustomer.longitude || ''} placeholder="106.123456" class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Email</label>
							<input type="email" name="email" value={selectedCustomer.email || ''} placeholder="Email Address" class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Status</label>
							<select name="status" required class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
								<option value="Active" selected={selectedCustomer.status === 'Active'}>Active</option>
								<option value="Inactive" selected={selectedCustomer.status === 'Inactive'}>Inactive</option>
							</select>
						</div>
					</div>
				</div>
				
				<div class="p-6 border-t border-surface-container bg-surface-container-low/50 flex justify-end gap-3">
					<button type="button" onclick={closeEditModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">Cancel</button>
					<button type="submit" disabled={isSubmitting} class="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50">
						<span class="material-symbols-outlined text-[18px]">save</span> Save Changes
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Map Picker Modal -->
{#if showMapPicker}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeMapPicker}></div>
		<div class="relative w-full max-w-4xl bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-4 border-b border-surface-container flex items-center justify-between">
				<div>
					<h3 class="text-lg font-bold text-on-surface">Pick Location on Map</h3>
					<p class="text-[10px] text-on-surface-variant mt-0.5">Click or drag the pin to set the location. Address will be automatically filled.</p>
				</div>
				<button onclick={closeMapPicker} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>
			<div class="p-0 h-[60vh] bg-surface-container-low relative">
				<!-- Search Bar Overlay -->
				<div class="absolute top-4 left-4 right-4 z-[1000] lg:left-1/2 lg:-translate-x-1/2 lg:w-96">
					<form onsubmit={searchMap} class="flex gap-2">
						<div class="relative flex-1">
							<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
							<input type="text" bind:value={mapSearchQuery} placeholder="Cari lokasi (contoh: Monas)..." class="w-full bg-surface-container-lowest/95 backdrop-blur border border-surface-container rounded-xl pl-9 pr-3 py-2.5 text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
						</div>
						<button type="submit" disabled={isSearchingMap} class="px-4 py-2.5 bg-surface-container-highest text-on-surface border border-surface-container rounded-xl shadow-md hover:bg-surface-container-high transition-colors disabled:opacity-50 flex items-center justify-center font-bold text-sm">
							{#if isSearchingMap}
								<span class="w-4 h-4 border-2 border-on-surface border-t-transparent rounded-full animate-spin"></span>
							{:else}
								Cari
							{/if}
						</button>
					</form>
				</div>
				
				<div bind:this={mapElement} class="w-full h-full z-0"></div>
				<!-- Floating Address Display -->
				<div class="absolute bottom-6 left-6 right-6 z-[1000] bg-surface-container-lowest/95 backdrop-blur p-4 rounded-xl shadow-lg border border-surface-container flex justify-between items-center gap-4">
					<div class="flex-1">
						<p class="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1 flex items-center gap-2">
							Selected Address
							{#if isFetchingAddress}
								<span class="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></span>
							{/if}
						</p>
						<p class="text-sm font-bold text-on-surface line-clamp-2">{selectedCustomer.alamat || 'Please click on the map'}</p>
					</div>
					<button onclick={closeMapPicker} class="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-rose-700 whitespace-nowrap transition-colors flex items-center gap-2">
						<span class="material-symbols-outlined text-[18px]">check_circle</span>
						Confirm
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
