<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	
	let vehicles = $derived(data.vehicles || []);
	let metrics  = $derived(data.metrics || { total: 0, active: 0, inactive: 0, maintenance: 0 });
	let meta     = $derived(data.meta);

	// Filter state — selaras dengan query params di +page.server.ts
	let searchQuery   = $state($page.url.searchParams.get('search') || '');
	let activeFilter  = $state($page.url.searchParams.get('business_unit') || 'All');
	let activeStatus  = $state($page.url.searchParams.get('status') || 'All');

	const buFilters     = ['All', 'DUMP_TRUCK', 'TRANSPORTATION', 'OUTSOURCING'];
	const statusFilters = ['All', 'ACTIVE', 'INACTIVE'];

	const buLabel: Record<string, string> = {
		DUMP_TRUCK:     'Dump Truck',
		TRANSPORTATION: 'Transportation',
		OUTSOURCING:    'Outsourcing',
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

<div class="flex flex-col h-full">
	<!-- Header -->
	<header class="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-1">Fleet Roster</h1>
			<p class="text-on-surface-variant font-medium text-sm">Kelola dan pantau armada kendaraan operasional</p>
		</div>
		<div class="flex gap-3">
			<button class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container-low transition-colors">
				<span class="material-symbols-outlined text-lg">download</span>
				Export
			</button>
			<button onclick={analyzeMaintenance} class="bg-orange-50 text-orange-700 border border-orange-200 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-orange-100 transition-colors dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50">
				<span class="material-symbols-outlined text-lg">smart_toy</span>
				AI Maintenance
			</button>
			<button class="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-blue-700 transition-colors">
				<span class="material-symbols-outlined text-lg">add_circle</span>
				Tambah Unit
			</button>
		</div>
	</header>

	<!-- Metrics Cards -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
		<div class="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-black uppercase tracking-widest text-on-surface-variant">Total Unit</span>
				<span class="material-symbols-outlined text-blue-500 text-xl">directions_bus</span>
			</div>
			<p class="text-3xl font-extrabold text-on-surface">{metrics.total}</p>
			<p class="text-xs text-on-surface-variant mt-1 font-medium">Semua armada</p>
		</div>
		<div class="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-black uppercase tracking-widest text-on-surface-variant">Aktif</span>
				<span class="material-symbols-outlined text-emerald-500 text-xl">check_circle</span>
			</div>
			<p class="text-3xl font-extrabold text-emerald-600">{metrics.active}</p>
			<p class="text-xs text-on-surface-variant mt-1 font-medium">Beroperasi</p>
		</div>
		<div class="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-black uppercase tracking-widest text-on-surface-variant">Tidak Aktif</span>
				<span class="material-symbols-outlined text-rose-500 text-xl">cancel</span>
			</div>
			<p class="text-3xl font-extrabold text-rose-600">{metrics.inactive}</p>
			<p class="text-xs text-on-surface-variant mt-1 font-medium">Non-operasional</p>
		</div>
		<div class="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-black uppercase tracking-widest text-on-surface-variant">Maintenance</span>
				<span class="material-symbols-outlined text-amber-500 text-xl">build</span>
			</div>
			<p class="text-3xl font-extrabold text-amber-600">{metrics.maintenance}</p>
			<p class="text-xs text-on-surface-variant mt-1 font-medium">Dalam servis</p>
		</div>
	</div>

	<!-- Filters & Search -->
	<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-6">
		<div class="flex flex-wrap gap-2">
			<!-- Business Unit Filter -->
			{#each buFilters as filter}
				<button
					class="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors {activeFilter === filter
						? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
						: 'text-on-surface-variant hover:bg-surface-container'}"
					onclick={() => handleFilterClick(filter)}
				>
					{filter === 'All' ? 'Semua BU' : buLabel[filter] ?? filter}
				</button>
			{/each}

			<!-- Divider -->
			<span class="w-px h-8 bg-outline-variant/30 self-center"></span>

			<!-- Status Filter -->
			{#each statusFilters as st}
				<button
					class="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors {activeStatus === st
						? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
						: 'text-on-surface-variant hover:bg-surface-container'}"
					onclick={() => handleStatusClick(st)}
				>
					{st === 'All' ? 'Semua Status' : st === 'ACTIVE' ? 'Aktif' : 'Tidak Aktif'}
				</button>
			{/each}
		</div>

		<!-- Search -->
		<div class="relative w-full lg:w-72 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input
				type="text"
				id="vehicles-search"
				bind:value={searchQuery}
				oninput={handleSearchInput}
				placeholder="Cari nomor unit, lambung..."
				class="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium"
			/>
		</div>
	</div>

	<!-- Table -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="border-b border-surface-container sticky top-0 bg-surface-container-lowest z-10">
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Unit Info</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Tipe & Spek</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Driver Utama</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Grade</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each vehicles as vhc (vhc.id)}
						{@const buColor = getBuColor(vhc.business_unit)}
						<tr class="group hover:bg-surface-container-low transition-colors">
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
									<button class="p-2 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors" title="Lihat Detail">
										<span class="material-symbols-outlined text-[20px]">visibility</span>
									</button>
									<button class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors" title="Opsi Lain">
										<span class="material-symbols-outlined text-[20px]">more_vert</span>
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
		<div class="px-6 py-4 border-t border-surface-container flex items-center justify-between bg-surface-container-lowest">
			<p class="text-xs text-on-surface-variant font-medium">
				Menampilkan {startItem}–{endItem} dari {meta?.total || 0} unit
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
						class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors {currentPage === p ? 'bg-blue-600 text-white shadow-sm' : 'text-on-surface hover:bg-surface-container-high'}"
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

<style>
	.hide-scrollbar::-webkit-scrollbar { display: none; }
	.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
