<script lang="ts">
	import type { PageData } from './$types';
	import DriverSimAiScannerModal from '$lib/components/DriverSimAiScannerModal.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let drivers = $derived(data.drivers || []);
	let summary = $derived(data.summary || {
		totalDrivers: 0,
		expiredCount: 0,
		warningCount: 0,
		validCount: 0,
		noDateCount: 0,
		assignedCount: 0,
		standbyCount: 0
	});

	// Filter state
	let statusFilter = $state<'ALL' | 'EXPIRED' | 'WARNING' | 'VALID' | 'ASSIGNED' | 'STANDBY'>('ALL');
	let searchQuery = $state('');

	// Pagination state
	let currentPage = $state(1);
	let itemsPerPage = $state(12);

	// Modal State
	let showSimModal = $state(false);
	let selectedDriverForSim = $state<any>(null);

	let filteredDrivers = $derived(
		drivers.filter((d: any) => {
			const q = searchQuery.toLowerCase().trim();
			const matchSearch = !q || 
				d.name?.toLowerCase().includes(q) || 
				d.payroll_id?.toLowerCase().includes(q) || 
				d.sim_number?.toLowerCase().includes(q) ||
				d.assigned_unit?.toLowerCase().includes(q) ||
				d.driver_category?.toLowerCase().includes(q);

			let matchStatus = true;
			if (statusFilter === 'EXPIRED') matchStatus = d.gate_status === 'EXPIRED';
			else if (statusFilter === 'WARNING') matchStatus = d.gate_status === 'WARNING_30';
			else if (statusFilter === 'VALID') matchStatus = d.gate_status === 'VALID';
			else if (statusFilter === 'ASSIGNED') matchStatus = d.assigned_unit !== null;
			else if (statusFilter === 'STANDBY') matchStatus = d.assigned_unit === null;

			return matchSearch && matchStatus;
		})
	);

	let totalPages = $derived(Math.max(1, Math.ceil(filteredDrivers.length / itemsPerPage)));
	let paginatedDrivers = $derived(
		filteredDrivers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	let pageNumbers = $derived.by(() => {
		const pages: number[] = [];
		const start = Math.max(1, currentPage - 2);
		const end = Math.min(totalPages, Math.max(1, start + 4));
		for (let i = start; i <= end; i++) pages.push(i);
		return pages;
	});

	$effect(() => {
		if (searchQuery !== undefined || statusFilter !== undefined) {
			currentPage = 1;
		}
	});

	function openScanner(driver?: any) {
		selectedDriverForSim = driver ? {
			id: driver.id,
			name: driver.name,
			karyawan_id: driver.karyawan_id,
			sim_type: driver.sim_type,
			sim_expiry_date: driver.sim_expiry_date
		} : null;
		showSimModal = true;
	}

	function handleScanSuccess() {
		invalidateAll();
	}

	function formatDate(d: string | null | undefined): string {
		if (!d) return '-';
		try {
			const parts = d.split('-');
			if (parts.length === 3) {
				const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
				return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
			}
			return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
		} catch {
			return d;
		}
	}
</script>

<svelte:head>
	<title>Kesiapan Sopir & Kontrol SIM | OCS ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Page Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
					<span class="material-symbols-outlined text-2xl">badge</span>
				</div>
				<div>
					<h1 class="text-2xl font-black text-on-surface tracking-tight">Kesiapan Sopir & Kontrol SIM</h1>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">
						Monitoring kelayakan jalan 234 pengemudi armada, validasi masa berlaku SIM, dan pembaruan instan via AI Vision
					</p>
				</div>
			</div>
		</div>

		<div class="flex items-center gap-2.5">
			<a 
				href="/ocs/assign-driver" 
				class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-on-surface text-xs font-bold hover:bg-surface-container transition-colors shadow-xs flex items-center gap-1.5">
				<span class="material-symbols-outlined text-base text-primary">person_pin</span>
				<span>Penugasan Armada</span>
			</a>

			<button 
				type="button"
				onclick={() => openScanner()}
				class="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:opacity-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
				<span class="material-symbols-outlined text-base">auto_awesome</span>
				<span>Scan & Perbarui SIM (AI)</span>
			</button>
		</div>
	</header>

	<!-- Bento KPI Overview Cards -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3.5">
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between mb-1.5">
				<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total Sopir Aktif</span>
				<span class="material-symbols-outlined text-base text-blue-600">group</span>
			</div>
			<div class="text-2xl font-black text-on-surface">{summary.totalDrivers}</div>
			<p class="text-[10px] text-on-surface-variant mt-0.5">{summary.assignedCount} Ditugaskan • {summary.standbyCount} Standby</p>
		</div>

		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between mb-1.5">
				<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">SIM Valid & Siap</span>
				<span class="material-symbols-outlined text-base text-emerald-600">verified</span>
			</div>
			<div class="text-2xl font-black text-emerald-600">{summary.validCount}</div>
			<p class="text-[10px] text-emerald-600 font-medium mt-0.5">Memenuhi standar jalan</p>
		</div>

		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between mb-1.5">
				<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Masa Kritis (H-30)</span>
				<span class="material-symbols-outlined text-base text-amber-600">schedule</span>
			</div>
			<div class="text-2xl font-black text-amber-600">{summary.warningCount}</div>
			<p class="text-[10px] text-amber-600 font-medium mt-0.5">Segera perpanjang di pool</p>
		</div>

		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between mb-1.5">
				<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">SIM Kedaluwarsa</span>
				<span class="material-symbols-outlined text-base text-rose-600">block</span>
			</div>
			<div class="text-2xl font-black text-rose-600">{summary.expiredCount}</div>
			<p class="text-[10px] text-rose-600 font-medium mt-0.5">Hard Block penugasan</p>
		</div>
	</div>

	<!-- Controls & Search Bar (Borderless Style Standard) -->
	<div class="space-y-3">
		<!-- Category Filter Tabs -->
		<div class="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
			<button 
				onclick={() => statusFilter = 'ALL'}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer {statusFilter === 'ALL' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}">
				Semua Sopir ({summary.totalDrivers})
			</button>
			<button 
				onclick={() => statusFilter = 'EXPIRED'}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer {statusFilter === 'EXPIRED' ? 'bg-rose-600 text-white shadow-xs' : 'bg-surface-container text-rose-600 hover:bg-rose-500/10'}">
				SIM Kedaluwarsa ({summary.expiredCount})
			</button>
			<button 
				onclick={() => statusFilter = 'WARNING'}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer {statusFilter === 'WARNING' ? 'bg-amber-600 text-white shadow-xs' : 'bg-surface-container text-amber-600 hover:bg-amber-500/10'}">
				Mendekati Expired H-30 ({summary.warningCount})
			</button>
			<button 
				onclick={() => statusFilter = 'VALID'}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer {statusFilter === 'VALID' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-surface-container text-emerald-600 hover:bg-emerald-500/10'}">
				SIM Valid ({summary.validCount})
			</button>
			<button 
				onclick={() => statusFilter = 'ASSIGNED'}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer {statusFilter === 'ASSIGNED' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}">
				Sedang Bertugas ({summary.assignedCount})
			</button>
			<button 
				onclick={() => statusFilter = 'STANDBY'}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer {statusFilter === 'STANDBY' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}">
				Standby Pool ({summary.standbyCount})
			</button>
		</div>

		<!-- Search Bar Borderless with Focus Soft Ring -->
		<div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low focus-within:ring-2 focus-within:ring-primary/20 transition-all">
			<span class="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
			<input 
				type="text" 
				bind:value={searchQuery} 
				placeholder="Cari nama pengemudi, NIK/Payroll, nomor SIM, atau nomor unit..." 
				class="bg-transparent text-xs text-on-surface border-0 outline-none w-full placeholder:text-on-surface-variant/50 focus:ring-0" 
			/>
			{#if searchQuery}
				<button onclick={() => searchQuery = ''} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-sm">close</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Drivers Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[950px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Pengemudi</th>
						<th class="py-3.5 px-5">Kategori</th>
						<th class="py-3.5 px-5">Lisensi SIM</th>
						<th class="py-3.5 px-5">Masa Berlaku</th>
						<th class="py-3.5 px-5">Penugasan Unit</th>
						<th class="py-3.5 px-5">Trip Bulan Ini</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if paginatedDrivers.length === 0}
						<tr>
							<td colspan="7" class="py-16 text-center text-on-surface-variant text-sm font-medium">
								<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 block mb-2">person_search</span>
								<p class="font-bold text-on-surface">Tidak ada data pengemudi yang cocok</p>
								<p class="text-xs text-on-surface-variant mt-1">Coba sesuaikan kata kunci pencarian atau ubah filter status.</p>
							</td>
						</tr>
					{/if}
					{#each paginatedDrivers as drv}
						<tr class="hover:bg-surface-container transition-colors group">
							<td class="py-4 px-5">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
										{drv.name.substring(0, 2).toUpperCase()}
									</div>
									<div>
										<p class="text-xs font-bold text-on-surface">{drv.name}</p>
										<p class="text-[10px] text-on-surface-variant font-mono">ID #{drv.id} • {drv.payroll_id || '-'}</p>
									</div>
								</div>
							</td>

							<td class="py-4 px-5">
								<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-container text-on-surface">
									{drv.driver_category || 'TRAILER'}
								</span>
							</td>

							<td class="py-4 px-5">
								<p class="text-xs font-bold text-on-surface">{drv.sim_type || 'SIM Belum Terdata'}</p>
								<p class="text-[10px] font-mono text-on-surface-variant">No: {drv.sim_number || '-'}</p>
							</td>

							<td class="py-4 px-5">
								{#if drv.gate_status === 'EXPIRED'}
									<div class="space-y-0.5">
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
											<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Expired
										</span>
										<p class="text-[10px] text-rose-600 font-mono font-medium">Exp: {formatDate(drv.sim_expiry_date)}</p>
									</div>
								{:else if drv.gate_status === 'WARNING_30'}
									<div class="space-y-0.5">
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
											<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> H-{drv.days_remaining} Hari
										</span>
										<p class="text-[10px] text-amber-600 font-mono font-medium">Exp: {formatDate(drv.sim_expiry_date)}</p>
									</div>
								{:else if drv.gate_status === 'VALID'}
									<div class="space-y-0.5">
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Valid
										</span>
										<p class="text-[10px] text-slate-400 font-mono">Exp: {formatDate(drv.sim_expiry_date)}</p>
									</div>
								{:else}
									<span class="text-[10px] text-slate-400 font-italic">Belum ada data</span>
								{/if}
							</td>

							<td class="py-4 px-5">
								{#if drv.assigned_unit}
									<div class="space-y-0.5">
										<span class="text-xs font-bold text-on-surface flex items-center gap-1">
											<span class="material-symbols-outlined text-sm text-blue-600">local_shipping</span>
											<span>{drv.assigned_unit}</span>
										</span>
										<span class="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600">
											{drv.assignment_posisi?.replace('_', ' ') || 'TERTUGAS'}
										</span>
									</div>
								{:else}
									<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
										Standby Pool
									</span>
								{/if}
							</td>

							<td class="py-4 px-5">
								<span class="text-xs font-bold text-on-surface">{drv.trips_this_month}</span>
								<span class="text-[10px] text-on-surface-variant"> trip</span>
							</td>

							<td class="py-4 px-5 text-right">
								<button 
									type="button"
									onclick={() => openScanner(drv)}
									class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs font-bold text-primary hover:bg-primary/10 transition-colors shadow-xs cursor-pointer"
									title="Scan & Perbarui SIM Pengemudi (AI)">
									<span class="material-symbols-outlined text-sm">auto_awesome</span>
									<span>Scan SIM</span>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination Footer -->
		<div class="px-5 py-3.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
			<p class="text-xs text-on-surface-variant font-medium">
				Menampilkan <span class="font-bold text-on-surface">{paginatedDrivers.length}</span> dari <span class="font-bold text-on-surface">{filteredDrivers.length}</span> sopir
			</p>
			<div class="flex gap-1">
				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors cursor-pointer" 
					disabled={currentPage <= 1} 
					onclick={() => currentPage = Math.max(1, currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				{#each pageNumbers as pNum}
					<button 
						class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition-colors cursor-pointer {currentPage === pNum ? 'bg-blue-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}" 
						onclick={() => currentPage = pNum}>
						{pNum}
					</button>
				{/each}
				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors cursor-pointer" 
					disabled={currentPage >= totalPages} 
					onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Modal AI SIM Scanner -->
<DriverSimAiScannerModal
	isOpen={showSimModal}
	selectedDriver={selectedDriverForSim}
	driversList={drivers}
	onClose={() => showSimModal = false}
	onSuccess={handleScanSuccess}
/>
