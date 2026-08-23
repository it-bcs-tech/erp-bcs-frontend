<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import TruckTwin3D from '$lib/components/TruckTwin3D.svelte';
	
	let { data }: { data: PageData } = $props();
	
	let vehicles = $derived(data.vehicles || []);
	let metrics  = $derived(data.metrics || { total: 0, active: 0, inactive: 0, maintenance: 0 });
	let meta     = $derived(data.meta);

	// 3D Digital Twin Modal state
	let show3DTwinModal = $state(false);
	let selectedVehicleFor3D = $state<any>(null);

	function open3DTwin(vhc: any) {
		selectedVehicleFor3D = vhc;
		show3DTwinModal = true;
	}

	// Slide-over Vehicle Detail Drawer state
	let showVehicleDrawer = $state(false);
	let selectedVehicle = $state<any | null>(null);
	let telematicsDetail = $state<any | null>(null);
	let fuelSensorDetail = $state<{ logs: any[], anomalies: any[] } | null>(null);
	let isLoadingTelematics = $state(false);

	async function openVehicleDetail(vhc: any) {
		selectedVehicle = vhc;
		showVehicleDrawer = true;
		telematicsDetail = null;
		fuelSensorDetail = null;
		isLoadingTelematics = true;

		try {
			const unitId = vhc.nomor_unit || vhc.id;
			const [telRes, fuelRes] = await Promise.all([
				fetch(`/api/fms/telematics/live?unitId=${encodeURIComponent(unitId)}`).then(r => r.json()).catch(() => null),
				fetch(`/api/fms/telematics/fuel-sensor/${encodeURIComponent(unitId)}`).then(r => r.json()).catch(() => null)
			]);

			if (telRes?.success) telematicsDetail = telRes.data;
			if (fuelRes?.success) fuelSensorDetail = fuelRes.data;
		} catch (e) {
			console.error("Failed to load vehicle telematics", e);
		} finally {
			isLoadingTelematics = false;
		}
	}

	// Filter state — selaras dengan query params di +page.server.ts
	let searchQuery   = $state($page.url.searchParams.get('search') || '');
	let activeFilter  = $state($page.url.searchParams.get('business_unit') || 'All');
	let activeStatus  = $state($page.url.searchParams.get('status') || 'All');
	let activeAssetGroup = $state($page.url.searchParams.get('asset_group') || 'LOGISTICS_FLEET');

	const buFilters     = ['All', 'DUMP_TRUCK', 'TRANSPORTATION', 'OUTSOURCING'];
	const statusFilters = ['All', 'ACTIVE', 'INACTIVE'];
	const assetGroupFilters = ['LOGISTICS_FLEET', 'SUPPORT_VEHICLE', 'HEAVY_EQUIPMENT', 'ATTACHMENT', 'All'];

	const buLabel: Record<string, string> = {
		DUMP_TRUCK:     'Dump Truck',
		TRANSPORTATION: 'Transportation',
		OUTSOURCING:    'Outsourcing',
	};

	const assetGroupLabel: Record<string, string> = {
		LOGISTICS_FLEET: 'Armada Logistik',
		SUPPORT_VEHICLE: 'Kendaraan Pendukung',
		HEAVY_EQUIPMENT: 'Alat Berat',
		ATTACHMENT:      'Gandengan',
	};

	let showMaintenanceModal = $state(false);
	let isAiLoading = $state(false);
	let maintenanceResult = $state<{summary: string, alerts: {nopol: string, urgency: string, reason: string}[]} | null>(null);

	async function analyzeMaintenance() {
		showMaintenanceModal = true;
		isAiLoading = true;
		maintenanceResult = null;
		
		try {
			const res = await fetch('/api/fms/maintenance-prediction');
			if (res.ok) {
				maintenanceResult = await res.json();
			} else {
				maintenanceResult = { summary: 'Gagal memuat analisis AI.', alerts: [] };
			}
		} catch (e) {
			maintenanceResult = { summary: 'Terjadi kesalahan jaringan saat memanggil AI.', alerts: [] };
		} finally {
			isAiLoading = false;
		}
	}

	let searchTimer: ReturnType<typeof setTimeout>;

	function updateQueryParams() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');

		if (activeFilter && activeFilter !== 'All') url.searchParams.set('business_unit', activeFilter);
		else url.searchParams.delete('business_unit');

		if (activeStatus && activeStatus !== 'All') url.searchParams.set('status', activeStatus);
		else url.searchParams.delete('status');

		if (activeAssetGroup && activeAssetGroup !== 'All') url.searchParams.set('asset_group', activeAssetGroup);
		else url.searchParams.delete('asset_group');

		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(updateQueryParams, 400);
	}

	function handleFilterClick(filter: string) {
		activeFilter = filter;
		updateQueryParams();
	}

	function handleStatusClick(status: string) {
		activeStatus = status;
		updateQueryParams();
	}

	function handleAssetGroupClick(ag: string) {
		activeAssetGroup = ag;
		updateQueryParams();
	}

	let totalPages  = $derived(Math.max(1, Math.ceil((meta?.total || 0) / (meta?.per_page || 10))));
	let currentPage = $derived(meta?.current_page || 1);
	let startItem   = $derived(meta?.total === 0 ? 0 : ((currentPage - 1) * (meta?.per_page || 10)) + 1);
	let endItem     = $derived(Math.min(currentPage * (meta?.per_page || 10), meta?.total || 0));

	// Halaman pagination yang ditampilkan (max 5 pages)
	let pageNumbers = $derived(() => {
		const pages: number[] = [];
		const start = Math.max(1, currentPage - 2);
		const end   = Math.min(totalPages, start + 4);
		for (let i = start; i <= end; i++) pages.push(i);
		return pages;
	});

	function goToPage(p: number) {
		if (p < 1 || p > totalPages) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { invalidateAll: true, noScroll: true });
	}

	function getVehicleIcon(namaTipe: string): string {
		const t = (namaTipe || '').toUpperCase();
		if (t.includes('DUMP'))    return 'construction';
		if (t.includes('TRAILER')) return 'local_shipping';
		if (t.includes('TRACTOR')) return 'airport_shuttle';
		return 'directions_bus';
	}

	function getBuColor(bu: string): string {
		if (bu === 'DUMP_TRUCK')     return 'amber';
		if (bu === 'OUTSOURCING')    return 'violet';
		return 'blue';
	}

	function getGradeColor(grade: string): string {
		if (grade === 'A') return 'emerald';
		if (grade === 'B') return 'amber';
		if (grade === 'C') return 'rose';
		return 'slate';
	}
</script>

<svelte:head>
	<title>Fleet Roster | FMS Dashboard</title>
	<meta name="description" content="Kelola dan pantau seluruh armada kendaraan BCS" />
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">local_shipping</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Fleet Roster & Kendaraan</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Kelola dan pantau seluruh armada kendaraan operasional PT BCS Logistics
			</p>
		</div>
		<div class="flex gap-2.5">
			<button class="bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container transition-colors shadow-xs">
				<span class="material-symbols-outlined text-lg">download</span>
				<span>Export</span>
			</button>
			<button onclick={analyzeMaintenance} class="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-blue-700 transition-colors cursor-pointer">
				<span class="material-symbols-outlined text-lg">smart_toy</span>
				<span>AI Maintenance</span>
			</button>
		</div>
	</header>

	<!-- Metrics Cards (Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Unit</p>
					<h3 class="text-2xl font-black text-on-surface mt-1">{metrics.total}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">local_shipping</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2">Semua armada terdaftar</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Aktif</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">{metrics.active}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">check_circle</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 font-medium mt-2">Siap beroperasi</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tidak Aktif</p>
					<h3 class="text-2xl font-black text-rose-600 mt-1">{metrics.inactive}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">cancel</span>
				</div>
			</div>
			<p class="text-xs text-rose-600 font-medium mt-2">Non-operasional / Standby</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Maintenance</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{metrics.maintenance}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">build</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 font-medium mt-2">Dalam perbaikan / bengkel</p>
		</div>
	</div>

	<!-- Unified Filter & Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-4 shadow-xs">
		<!-- Baris 1: Asset Group Tabs & Search -->
		<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
			<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
				{#each assetGroupFilters as ag}
					<button
						class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {activeAssetGroup === ag
							? 'bg-surface text-blue-600 dark:text-blue-400 shadow-xs'
							: 'text-on-surface-variant hover:text-on-surface'}"
						onclick={() => handleAssetGroupClick(ag)}
					>
						{ag === 'All' ? 'Semua Kategori' : assetGroupLabel[ag] ?? ag}
					</button>
				{/each}
			</div>

			<!-- Search Input -->
			<div class="relative w-full lg:w-80 flex-shrink-0">
				<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
				<input
					type="text"
					id="vehicles-search"
					bind:value={searchQuery}
					oninput={handleSearchInput}
					placeholder="Cari nomor unit, no lambung..."
					class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-slate-400"
				/>
			</div>
		</div>

		<!-- Baris 2: BU & Status Filters (Segmented Controls) -->
		<div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
			<!-- Business Unit Filter -->
			<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto">
				{#each buFilters as filter}
					<button
						class="px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {activeFilter === filter
							? 'bg-surface text-blue-600 dark:text-blue-400 shadow-xs'
							: 'text-on-surface-variant hover:text-on-surface'}"
						onclick={() => handleFilterClick(filter)}
					>
						{filter === 'All' ? 'Semua BU' : buLabel[filter] ?? filter}
					</button>
				{/each}
			</div>

			<!-- Status Filter -->
			<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto">
				{#each statusFilters as st}
					<button
						class="px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {activeStatus === st
							? 'bg-surface text-blue-600 dark:text-blue-400 shadow-xs'
							: 'text-on-surface-variant hover:text-on-surface'}"
						onclick={() => handleStatusClick(st)}
					>
						{st === 'All' ? 'Semua Status' : st === 'ACTIVE' ? 'Aktif' : 'Tidak Aktif'}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Table Container -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Unit Info</th>
						<th class="py-3.5 px-5">Tipe & Spek</th>
						<th class="py-3.5 px-5">Driver Utama</th>
						<th class="py-3.5 px-5">Grade</th>
						<th class="py-3.5 px-5">Status</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each vehicles as vhc (vhc.id)}
						{@const buColor = getBuColor(vhc.business_unit)}
						<tr 
							class="group hover:bg-surface-container-low transition-colors cursor-pointer"
							onclick={() => openVehicleDetail(vhc)}
						>
							<!-- Unit Info -->
							<td class="py-4 px-6">
								<div class="flex items-center gap-4">
									<div class="w-12 h-12 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors shadow-sm flex-shrink-0">
										<span class="material-symbols-outlined text-[24px]">{getVehicleIcon(vhc.nama_tipe)}</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface group-hover:text-blue-600 transition-colors">{vhc.nomor_unit}</p>
										<p class="text-xs text-on-surface-variant font-medium mt-0.5">{vhc.no_lambung || '—'}</p>
										{#if vhc.nomor_unit_lama}
											<p class="text-[10px] text-on-surface-variant/60 mt-0.5">Lama: {vhc.nomor_unit_lama}</p>
										{/if}
									</div>
								</div>
							</td>

							<!-- Tipe & Spek -->
							<td class="py-4 px-6">
								<p class="text-sm font-bold text-on-surface">{vhc.nama_produk || '—'} {vhc.tahun ? '(' + vhc.tahun + ')' : ''}</p>
								<p class="text-xs text-on-surface-variant mt-0.5">{vhc.nama_model || '—'}</p>
								<div class="flex items-center gap-1.5 mt-1.5">
									<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
										{vhc.nama_tipe || '—'}
									</span>
									<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-{buColor}-100 text-{buColor}-700 dark:bg-{buColor}-900/30 dark:text-{buColor}-300 text-[10px] font-bold uppercase tracking-wider">
										{buLabel[vhc.business_unit] ?? vhc.business_unit}
									</span>
								</div>
							</td>

							<!-- Driver Utama -->
							<td class="py-4 px-6">
								{#if vhc.driver_utama?.nama}
									<p class="text-sm font-semibold text-on-surface">{vhc.driver_utama.nama}</p>
									{#if vhc.driver_utama.no_hp}
										<p class="text-xs text-on-surface-variant mt-0.5">{vhc.driver_utama.no_hp}</p>
									{/if}
								{:else}
									<span class="text-xs text-on-surface-variant/50 italic">Belum ditugaskan</span>
								{/if}
							</td>

							<!-- Grade -->
							<td class="py-4 px-6">
								{#if vhc.grade && vhc.grade !== ''}
									{@const gc = getGradeColor(vhc.grade)}
									<span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-{gc}-100 text-{gc}-700 dark:bg-{gc}-900/30 dark:text-{gc}-300 font-extrabold text-sm">
										{vhc.grade}
									</span>
								{:else}
									<span class="text-xs text-on-surface-variant/40">—</span>
								{/if}
							</td>

							<!-- Status -->
							<td class="py-4 px-6">
								{#if vhc.is_active}
									<span class="inline-flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Aktif
									</span>
								{:else}
									<span class="inline-flex items-center gap-2 text-slate-500 font-bold text-xs bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full">
										<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Tidak Aktif
									</span>
								{/if}
							</td>

							<!-- Actions -->
							<td class="py-4 px-6 text-right">
								<div class="flex items-center justify-end gap-2">
									<button 
										onclick={(e) => { e.stopPropagation(); open3DTwin(vhc); }} 
										class="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 font-bold text-xs cursor-pointer" 
										title="Inspeksi Digital Twin 3D"
									>
										<span class="material-symbols-outlined text-[20px]">view_in_ar</span>
										<span class="hidden sm:inline">3D Twin</span>
									</button>
									<button 
										onclick={(e) => { e.stopPropagation(); openVehicleDetail(vhc); }} 
										class="p-2 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer" 
										title="Lihat Detail Unit"
									>
										<span class="material-symbols-outlined text-[20px]">visibility</span>
									</button>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="py-20 text-center">
								<span class="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">directions_bus</span>
								<p class="text-on-surface-variant font-semibold">Tidak ada data unit</p>
								<p class="text-xs text-on-surface-variant/60 mt-1">Coba ubah filter atau kata kunci pencarian</p>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination Footer -->
		<div class="px-5 py-3.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
			<p class="text-xs text-on-surface-variant font-medium">
				Menampilkan <span class="font-bold text-on-surface">{startItem}–{endItem}</span> dari <span class="font-bold text-on-surface">{meta?.total || 0}</span> unit
			</p>
			<div class="flex gap-1">
				<button
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors"
					disabled={currentPage <= 1}
					onclick={() => goToPage(currentPage - 1)}
				>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>

				{#each pageNumbers() as p}
					<button
						class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors {currentPage === p ? 'bg-blue-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
						onclick={() => goToPage(p)}
					>
						{p}
					</button>
				{/each}

				<button
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors"
					disabled={currentPage >= totalPages}
					onclick={() => goToPage(currentPage + 1)}
				>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>

{#if showMaintenanceModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={() => showMaintenanceModal = false}></div>
		
		<!-- Modal Content -->
		<div class="relative w-full max-w-2xl bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
			<div class="p-6 border-b border-surface-container flex items-start justify-between bg-orange-50/50 dark:bg-orange-900/10">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
						<span class="material-symbols-outlined text-[20px]">smart_toy</span>
					</div>
					<div>
						<h3 class="text-xl font-bold text-on-surface">Predictive Maintenance AI</h3>
						<p class="text-xs text-on-surface-variant mt-0.5">Analisis kondisi armada oleh FARIDA</p>
					</div>
				</div>
				<button onclick={() => showMaintenanceModal = false} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>
			
			<div class="p-6 overflow-y-auto bg-surface-container-lowest">
				{#if isAiLoading}
					<div class="flex flex-col items-center justify-center py-12">
						<span class="material-symbols-outlined text-4xl text-orange-400 animate-spin mb-4">settings</span>
						<p class="text-sm font-bold text-on-surface">FARIDA sedang menganalisis...</p>
						<p class="text-xs text-on-surface-variant mt-1 text-center max-w-sm">Memindai jadwal servis preventif dan riwayat perjalanan 30 hari terakhir dari seluruh armada.</p>
					</div>
				{:else if maintenanceResult}
					<div class="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
						<p class="text-sm font-medium text-orange-900 leading-relaxed"><strong class="font-black text-orange-700">Ringkasan:</strong> {maintenanceResult.summary}</p>
					</div>

					{#if maintenanceResult.alerts.length > 0}
						<div class="space-y-3">
							<h4 class="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-4">Daftar Peringatan</h4>
							{#each maintenanceResult.alerts as alert}
								<div class="p-4 rounded-xl border flex gap-4 {alert.urgency === 'CRITICAL' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}">
									<div class="flex-shrink-0 mt-0.5">
										<span class="material-symbols-outlined {alert.urgency === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'}">
											{alert.urgency === 'CRITICAL' ? 'error' : 'warning'}
										</span>
									</div>
									<div class="flex-1">
										<div class="flex justify-between items-start mb-1">
											<h5 class="font-bold {alert.urgency === 'CRITICAL' ? 'text-rose-900' : 'text-amber-900'}">{alert.nopol}</h5>
											<span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-md {alert.urgency === 'CRITICAL' ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'}">
												{alert.urgency}
											</span>
										</div>
										<p class="text-xs {alert.urgency === 'CRITICAL' ? 'text-rose-800' : 'text-amber-800'} leading-relaxed">{alert.reason}</p>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-center py-8">
							<span class="material-symbols-outlined text-5xl text-emerald-500 mb-3 block">verified_user</span>
							<p class="text-lg font-bold text-on-surface">Armada dalam Kondisi Prima</p>
							<p class="text-sm text-on-surface-variant mt-1">Tidak ada truk yang membutuhkan pemeliharaan mendesak saat ini.</p>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- 3D Digital Twin Modal -->
{#if show3DTwinModal}
	<div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
			<!-- Modal Header -->
			<div class="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center font-bold">
						<span class="material-symbols-outlined text-2xl">view_in_ar</span>
					</div>
					<div>
						<h2 class="text-lg font-black text-white flex items-center gap-2">
							<span>INSPEKSI DIGITAL TWIN 3D</span>
							<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-500/20 text-sky-400 border border-sky-500/30">THREE.JS WEBGL</span>
						</h2>
						<p class="text-xs text-slate-400">
							{selectedVehicleFor3D?.no_polisi || 'B 9123 BCS'} — {selectedVehicleFor3D?.nama_model || 'Hino Ranger Tronton 6x4'}
						</p>
					</div>
				</div>
				<button onclick={() => (show3DTwinModal = false)} class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer">
					<span class="material-symbols-outlined text-xl">close</span>
				</button>
			</div>

			<!-- 3D Canvas Body -->
			<div class="p-6">
				<TruckTwin3D
					vehicleNumber={selectedVehicleFor3D?.no_polisi || 'B 9123 BCS'}
					vehicleModel={selectedVehicleFor3D?.nama_model || 'Hino Ranger Tronton 6x4'}
				/>
			</div>
		</div>
	</div>
{/if}

<!-- Slide-over Vehicle Detail Drawer -->
{#if showVehicleDrawer && selectedVehicle}
	<div class="fixed inset-0 z-50 overflow-hidden">
		<!-- Backdrop overlay -->
		<div 
			class="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
			onclick={() => showVehicleDrawer = false}
		></div>

		<div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
			<div class="w-screen max-w-xl bg-surface-container-low border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
				
				<!-- Drawer Header -->
				<div class="p-6 border-b border-slate-200/60 dark:border-slate-800/60 flex items-start justify-between bg-surface">
					<div class="flex items-center gap-3.5">
						<div class="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
							<span class="material-symbols-outlined text-2xl">{getVehicleIcon(selectedVehicle.nama_tipe)}</span>
						</div>
						<div>
							<div class="flex items-center gap-2">
								<h2 class="text-xl font-black text-on-surface tracking-tight">{selectedVehicle.nomor_unit}</h2>
								{#if selectedVehicle.grade}
									{@const gc = getGradeColor(selectedVehicle.grade)}
									<span class="px-2 py-0.5 rounded-md bg-{gc}-100 text-{gc}-700 dark:bg-{gc}-900/30 dark:text-{gc}-300 text-[10px] font-extrabold uppercase">
										Grade {selectedVehicle.grade}
									</span>
								{/if}
								{#if selectedVehicle.is_active}
									<span class="inline-flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Aktif
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-slate-500 text-[10px] font-bold bg-slate-500/10 px-2 py-0.5 rounded-md border border-slate-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Nonaktif
									</span>
								{/if}
							</div>
							<p class="text-xs text-on-surface-variant font-medium mt-0.5">
								{selectedVehicle.nama_produk || '—'} {selectedVehicle.nama_model || '—'} {selectedVehicle.tahun ? `(${selectedVehicle.tahun})` : ''}
							</p>
						</div>
					</div>

					<button 
						onclick={() => showVehicleDrawer = false}
						class="w-8 h-8 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
					>
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>

				<!-- Drawer Scrollable Content -->
				<div class="flex-1 overflow-y-auto p-6 space-y-6">
					<!-- Quick Info Grid -->
					<div class="grid grid-cols-2 gap-3">
						<div class="p-4 rounded-xl bg-surface border border-slate-200/60 dark:border-slate-800/60">
							<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Business Unit</p>
							<p class="text-sm font-bold text-on-surface mt-1">{buLabel[selectedVehicle.business_unit] ?? selectedVehicle.business_unit}</p>
						</div>
						<div class="p-4 rounded-xl bg-surface border border-slate-200/60 dark:border-slate-800/60">
							<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Asset Group</p>
							<p class="text-sm font-bold text-on-surface mt-1">{assetGroupLabel[selectedVehicle.asset_group] ?? selectedVehicle.asset_group}</p>
						</div>
						<div class="p-4 rounded-xl bg-surface border border-slate-200/60 dark:border-slate-800/60">
							<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">No. Lambung</p>
							<p class="text-sm font-bold text-on-surface mt-1 font-mono">{selectedVehicle.no_lambung || '—'}</p>
						</div>
						<div class="p-4 rounded-xl bg-surface border border-slate-200/60 dark:border-slate-800/60">
							<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Konfigurasi Gandar</p>
							<p class="text-sm font-bold text-on-surface mt-1">{selectedVehicle.axle_config || '—'}</p>
						</div>
					</div>

					<!-- Section: Telemetri CAN-bus & Sensor Bahan Bakar (IoT) -->
					<div class="p-5 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 space-y-4">
						<div class="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
							<div class="flex items-center gap-2">
								<span class="material-symbols-outlined text-blue-600 text-lg">sensors</span>
								<h3 class="text-xs font-black text-on-surface uppercase tracking-wider">Status Telemetri & Sensor Tangki BBM</h3>
							</div>
							<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Sensor Aktif
							</span>
						</div>

						<!-- Telemetry Gauges -->
						<div class="grid grid-cols-4 gap-2 text-center">
							<div class="p-2.5 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60">
								<p class="text-[9px] font-bold text-on-surface-variant uppercase">RPM Mesin</p>
								<p class="text-xs font-black text-on-surface font-mono mt-1">{telematicsDetail ? telematicsDetail.rpm : 1650}</p>
							</div>
							<div class="p-2.5 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60">
								<p class="text-[9px] font-bold text-on-surface-variant uppercase">Suhu Coolant</p>
								<p class="text-xs font-black {telematicsDetail && Number(telematicsDetail.engine_temp_c) > 100 ? 'text-rose-600' : 'text-on-surface'} font-mono mt-1">
									{telematicsDetail ? telematicsDetail.engine_temp_c : '88.5'}°C
								</p>
							</div>
							<div class="p-2.5 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60">
								<p class="text-[9px] font-bold text-on-surface-variant uppercase">Tangki BBM</p>
								<p class="text-xs font-black text-blue-600 font-mono mt-1">{telematicsDetail ? telematicsDetail.fuel_pct : '75'}%</p>
							</div>
							<div class="p-2.5 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60">
								<p class="text-[9px] font-bold text-on-surface-variant uppercase">Tegangan Aki</p>
								<p class="text-xs font-black text-on-surface font-mono mt-1">{telematicsDetail ? telematicsDetail.battery_voltage : '24.2'}V</p>
							</div>
						</div>

						<!-- Fuel Drop / Anomaly Detection Status -->
						{#if fuelSensorDetail && fuelSensorDetail.anomalies && fuelSensorDetail.anomalies.length > 0}
							<div class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
								<span class="material-symbols-outlined text-rose-600 text-xl flex-shrink-0 mt-0.5">warning</span>
								<div>
									<h4 class="text-xs font-black text-rose-700 dark:text-rose-400">Terdeteksi Anomali Penurunan BBM Drastis (Kencing Solar)</h4>
									<p class="text-[11px] text-rose-600 font-medium mt-0.5 leading-relaxed">
										Volume bahan bakar turun tajam sebesar <strong>{fuelSensorDetail.anomalies[0].drop_percentage.toFixed(1)}% ({fuelSensorDetail.anomalies[0].drop_liters.toFixed(1)} Liter)</strong> saat mesin tidak aktif.
									</p>
								</div>
							</div>
						{:else}
							<div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-400">
								<div class="flex items-center gap-2">
									<span class="material-symbols-outlined text-base">check_circle</span>
									<span>Profil konsumsi solar normal (Tidak ada anomali drop 24 jam terakhir)</span>
								</div>
							</div>
						{/if}
					</div>

					<!-- Section: Driver Utama & Penugasan -->
					<div class="p-5 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 space-y-3">
						<div class="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
							<div class="flex items-center gap-2">
								<span class="material-symbols-outlined text-blue-600 text-lg">badge</span>
								<h3 class="text-xs font-black text-on-surface uppercase tracking-wider">Driver Utama Ditugaskan</h3>
							</div>
							<a href="/fms/drivers" class="text-[11px] font-bold text-blue-600 hover:underline">Kelola Driver</a>
						</div>

						{#if selectedVehicle.driver_utama?.nama}
							<div class="flex items-center justify-between pt-1">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
										<span class="material-symbols-outlined text-lg">person</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{selectedVehicle.driver_utama.nama}</p>
										<p class="text-xs text-on-surface-variant mt-0.5">{selectedVehicle.driver_utama.no_hp || 'Tidak ada nomor telepon'}</p>
									</div>
								</div>
								{#if selectedVehicle.driver_utama.no_hp}
									<a href="tel:{selectedVehicle.driver_utama.no_hp}" class="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors" title="Hubungi Driver">
										<span class="material-symbols-outlined text-lg">call</span>
									</a>
								{/if}
							</div>
						{:else}
							<div class="py-4 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-3xl text-on-surface-variant/40 block mb-1">person_off</span>
								<p class="text-xs font-medium">Belum ada supir utama yang ditugaskan ke unit ini</p>
							</div>
						{/if}
					</div>

					<!-- Section: Legalitas & Dokumen Kendaraan -->
					<div class="p-5 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 space-y-3">
						<div class="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
							<div class="flex items-center gap-2">
								<span class="material-symbols-outlined text-blue-600 text-lg">description</span>
								<h3 class="text-xs font-black text-on-surface uppercase tracking-wider">Legalitas & Dokumen</h3>
							</div>
							<a href="/fms/documents" class="text-[11px] font-bold text-blue-600 hover:underline">Semua Dokumen</a>
						</div>

						<div class="grid grid-cols-2 gap-3 pt-1 text-xs">
							<div>
								<p class="text-[10px] text-on-surface-variant font-medium uppercase">No. Rangka</p>
								<p class="font-bold text-on-surface font-mono mt-0.5">{selectedVehicle.no_rangka || '—'}</p>
							</div>
							<div>
								<p class="text-[10px] text-on-surface-variant font-medium uppercase">No. Mesin</p>
								<p class="font-bold text-on-surface font-mono mt-0.5">{selectedVehicle.no_mesin || '—'}</p>
							</div>
							<div>
								<p class="text-[10px] text-on-surface-variant font-medium uppercase">No. BPKB</p>
								<p class="font-bold text-on-surface font-mono mt-0.5">{selectedVehicle.no_bpkb || '—'}</p>
							</div>
							<div>
								<p class="text-[10px] text-on-surface-variant font-medium uppercase">No. Uji KIR</p>
								<p class="font-bold text-on-surface font-mono mt-0.5">{selectedVehicle.no_kir || '—'}</p>
							</div>
							<div>
								<p class="text-[10px] text-on-surface-variant font-medium uppercase">Jadwal Servis Preventif</p>
								<p class="font-bold text-on-surface mt-0.5">{selectedVehicle.tgl_maintenance_prevent || '—'}</p>
							</div>
							<div>
								<p class="text-[10px] text-on-surface-variant font-medium uppercase">Asuransi Expired</p>
								<p class="font-bold text-on-surface mt-0.5">{selectedVehicle.expire_date_asuransi || '—'}</p>
							</div>
						</div>
					</div>

					<!-- Section: Area Proyek Operasional -->
					<div class="p-5 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 space-y-2">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-blue-600 text-lg">location_on</span>
							<h3 class="text-xs font-black text-on-surface uppercase tracking-wider">Penugasan Area Proyek</h3>
						</div>
						<div class="flex items-center justify-between pt-1">
							<div>
								<p class="text-sm font-bold text-on-surface">{selectedVehicle.project_area || 'Area Default / Pool Pusat'}</p>
								{#if selectedVehicle.no_proyek}
									<p class="text-xs text-on-surface-variant mt-0.5">No. Proyek: {selectedVehicle.no_proyek}</p>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Drawer Footer Actions -->
				<div class="p-5 border-t border-slate-200/60 dark:border-slate-800/60 bg-surface flex items-center justify-between gap-3">
					<button 
						onclick={() => { showVehicleDrawer = false; open3DTwin(selectedVehicle); }}
						class="flex-1 py-2.5 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
					>
						<span class="material-symbols-outlined text-base">view_in_ar</span>
						<span>Digital Twin 3D</span>
					</button>

					<a 
						href="/fms/live-map"
						class="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
					>
						<span class="material-symbols-outlined text-base">map</span>
						<span>Live GPS Map</span>
					</a>
				</div>

			</div>
		</div>
	</div>
{/if}

<style>
	.hide-scrollbar::-webkit-scrollbar { display: none; }
	.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
