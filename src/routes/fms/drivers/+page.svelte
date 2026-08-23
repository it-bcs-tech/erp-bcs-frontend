<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	
	let drivers = $derived(data.drivers || []);
	let metrics = $derived(data.metrics);
	let meta = $derived(data.meta);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let statusFilter = $state($page.url.searchParams.get('status') || 'All');
	
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

	function handleStatusChange() {
		updateQueryParams();
	}

	let totalPages = $derived(Math.max(1, Math.ceil((meta?.total || 0) / (meta?.per_page || 5))));
	let currentPage = $derived(meta?.current_page || 1);
	let startItem = $derived(meta?.total === 0 ? 0 : ((currentPage - 1) * (meta?.per_page || 5)) + 1);
	let endItem = $derived(Math.min(currentPage * (meta?.per_page || 5), meta?.total || 0));

	function goToPage(p: number) {
		if (p < 1 || p > totalPages) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { invalidateAll: true, noScroll: true });
	}

	function isLicenseExpiringSoon(expiry: string): boolean {
		const expiryDate = new Date(expiry);
		const now = new Date();
		const diffMs = expiryDate.getTime() - now.getTime();
		const diffDays = diffMs / (1000 * 60 * 60 * 24);
		return diffDays <= 60 && diffDays > 0;
	}

	function isLicenseExpired(expiry: string): boolean {
		return new Date(expiry) < new Date();
	}

	let showScoringModal = $state(false);
	let isAiLoading = $state(false);
	let scoringResult = $state<{leaderboard: {driver_id: string, name: string, score: number, review: string}[]} | null>(null);

	async function analyzeScoring() {
		showScoringModal = true;
		isAiLoading = true;
		scoringResult = null;
		
		try {
			const res = await fetch('/api/fms/driver-scoring');
			if (res.ok) {
				scoringResult = await res.json();
			} else {
				scoringResult = { leaderboard: [] };
			}
		} catch (e) {
			scoringResult = { leaderboard: [] };
		} finally {
			isAiLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Drivers | FMS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">airline_seat_recline_normal</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Driver Management & Pengemudi</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Kelola profil pengemudi, monitoring masa berlaku SIM B2, dan penugasan armada BCS
			</p>
		</div>
		<div class="flex gap-2.5">
			<button class="bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container transition-colors shadow-xs">
				<span class="material-symbols-outlined text-lg">download</span>
				<span>Export</span>
			</button>
			<button onclick={analyzeScoring} class="bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-indigo-100 transition-colors dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50">
				<span class="material-symbols-outlined text-lg">workspace_premium</span>
				<span>AI Scoring</span>
			</button>
			<button class="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-blue-700 transition-colors cursor-pointer">
				<span class="material-symbols-outlined text-lg">person_add</span>
				<span>Tambah Driver</span>
			</button>
		</div>
	</header>

	<!-- Metrics Cards (Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Drivers</p>
					<h3 class="text-2xl font-black text-on-surface mt-1">{metrics.totalDrivers}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">groups</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2">Seluruh pengemudi aktif</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">On Duty</p>
					<h3 class="text-2xl font-black text-blue-600 mt-1">{metrics.onDuty}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">directions_car</span>
				</div>
			</div>
			<p class="text-xs text-blue-600 font-medium mt-2">Sedang dalam perjalanan</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Available</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">{metrics.available}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">check_circle</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 font-medium mt-2">Siap ditugaskan di pool</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">On Leave</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{metrics.onLeave}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">event_busy</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 font-medium mt-2">Sedang cuti / izin</p>
		</div>
	</div>

	<!-- Unified Filter & Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
		<!-- Tabs (Segmented Control Status Driver) -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
			{#each ['All', 'On Duty', 'Available', 'Off Duty', 'On Leave'] as st}
				<button
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {statusFilter === st
						? 'bg-surface text-blue-600 dark:text-blue-400 shadow-xs'
						: 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => { statusFilter = st; handleStatusChange(); }}
				>
					{st === 'All' ? 'Semua Status' : st}
				</button>
			{/each}
		</div>

		<!-- Search Input -->
		<div class="relative w-full md:w-80 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input 
				type="text" 
				bind:value={searchQuery}
				oninput={handleSearchInput}
				placeholder="Cari nama driver, NIK, SIM..." 
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-slate-400"
			/>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[1000px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Driver</th>
						<th class="py-3.5 px-5">SIM & Masa Berlaku</th>
						<th class="py-3.5 px-5">Penugasan Unit</th>
						<th class="py-3.5 px-5">Performa</th>
						<th class="py-3.5 px-5">Status</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each drivers as drv}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-4 px-6">
								<div class="flex items-center gap-4">
									<div class="w-12 h-12 rounded-xl overflow-hidden border-2 border-surface-container-high group-hover:border-blue-300 transition-colors shadow-sm">
										<img src={drv.avatar} alt={drv.name} class="w-full h-full object-cover" />
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface group-hover:text-blue-600 transition-colors">{drv.name}</p>
										<p class="text-[11px] font-medium text-on-surface-variant mt-0.5">{drv.id} • {drv.phone}</p>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1">
									<div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider w-fit">
										{drv.licenseType}
									</div>
									{#if isLicenseExpired(drv.licenseExpiry)}
										<span class="text-[11px] font-bold text-rose-600 flex items-center gap-1">
											<span class="material-symbols-outlined text-[12px]">error</span>
											Expired: {drv.licenseExpiry}
										</span>
									{:else if isLicenseExpiringSoon(drv.licenseExpiry)}
										<span class="text-[11px] font-bold text-amber-600 flex items-center gap-1">
											<span class="material-symbols-outlined text-[12px]">warning</span>
											Exp: {drv.licenseExpiry}
										</span>
									{:else}
										<span class="text-[11px] font-medium text-on-surface-variant">Exp: {drv.licenseExpiry}</span>
									{/if}
								</div>
							</td>
							<td class="py-4 px-6">
								{#if drv.assignedVehicle && drv.assignedVehicle !== '-' && drv.assignedVehicle !== ''}
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-[16px] text-blue-500">local_shipping</span>
										<span class="text-sm font-bold text-on-surface">{drv.assignedVehicle}</span>
									</div>
								{:else}
									<span class="text-sm font-medium text-on-surface-variant/50">Unassigned</span>
								{/if}
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1">
									<div class="flex items-center gap-1.5">
										<span class="material-symbols-outlined text-[14px] text-amber-500">star</span>
										<span class="text-sm font-bold text-on-surface">{drv.rating}</span>
									</div>
									<span class="text-[11px] font-medium text-on-surface-variant">{drv.totalTrips} trips completed</span>
								</div>
							</td>
							<td class="py-4 px-6">
								{#if drv.status === 'On Duty'}
									<span class="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[11px] bg-blue-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-blue-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> On Duty
									</span>
								{:else if drv.status === 'Available'}
									<span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Available
									</span>
								{:else if drv.status === 'On Leave'}
									<span class="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px] bg-amber-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> On Leave
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px] bg-slate-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-slate-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Off Duty
									</span>
								{/if}
							</td>
							<td class="py-4 px-6 text-right">
								<div class="flex items-center justify-end gap-2">
									<button class="p-2 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors" title="View Profile">
										<span class="material-symbols-outlined text-[20px]">visibility</span>
									</button>
									<button class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors" title="More Options">
										<span class="material-symbols-outlined text-[20px]">more_vert</span>
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
			<!-- Pagination Footer -->
		<div class="px-5 py-3.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
			<p class="text-xs text-on-surface-variant font-medium">
				Menampilkan <span class="font-bold text-on-surface">{startItem}–{endItem}</span> dari <span class="font-bold text-on-surface">{meta?.total || 0}</span> driver
			</p>
			<div class="flex gap-1">
				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors" 
					disabled={currentPage <= 1}
					onclick={() => goToPage(currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				{#each Array(totalPages) as _, i}
					<button 
						class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition-colors {currentPage === i + 1 ? 'bg-blue-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}"
						onclick={() => goToPage(i + 1)}>
						{i + 1}
					</button>
				{/each}
				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors" 
					disabled={currentPage >= totalPages}
					onclick={() => goToPage(currentPage + 1)}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>

{#if showScoringModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={() => showScoringModal = false}></div>
		
		<!-- Modal Content -->
		<div class="relative w-full max-w-2xl bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
			<div class="p-6 border-b border-surface-container flex items-start justify-between bg-indigo-50/50 dark:bg-indigo-900/10">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
						<span class="material-symbols-outlined text-[20px]">workspace_premium</span>
					</div>
					<div>
						<h3 class="text-xl font-bold text-on-surface">AI Driver Leaderboard</h3>
						<p class="text-xs text-on-surface-variant mt-0.5">Evaluasi kinerja sopir 30 hari terakhir oleh FARIDA</p>
					</div>
				</div>
				<button onclick={() => showScoringModal = false} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>
			
			<div class="p-6 overflow-y-auto bg-surface-container-lowest">
				{#if isAiLoading}
					<div class="flex flex-col items-center justify-center py-12">
						<span class="material-symbols-outlined text-4xl text-indigo-400 animate-spin mb-4">settings</span>
						<p class="text-sm font-bold text-on-surface">FARIDA sedang mengevaluasi...</p>
						<p class="text-xs text-on-surface-variant mt-1 text-center max-w-sm">Menganalisis ribuan data perjalanan, anomali, dan kepatuhan pengemudi.</p>
					</div>
				{:else if scoringResult && scoringResult.leaderboard.length > 0}
					<div class="space-y-3">
						{#each scoringResult.leaderboard as driver, index}
							<div class="p-4 rounded-xl border flex gap-4 items-center {index === 0 ? 'bg-amber-50 border-amber-200' : 'bg-surface-container border-outline-variant/20'}">
								<div class="flex-shrink-0">
									{#if index === 0}
										<div class="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center border-2 border-amber-200">
											<span class="material-symbols-outlined text-2xl">emoji_events</span>
										</div>
									{:else if index === 1}
										<div class="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center border-2 border-slate-200">
											<span class="text-xl font-black">2</span>
										</div>
									{:else if index === 2}
										<div class="w-12 h-12 rounded-full bg-orange-50 text-orange-700 flex items-center justify-center border-2 border-orange-200">
											<span class="text-xl font-black">3</span>
										</div>
									{:else}
										<div class="w-12 h-12 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center">
											<span class="text-lg font-bold">{index + 1}</span>
										</div>
									{/if}
								</div>
								
								<div class="flex-1">
									<h4 class="font-bold text-on-surface text-lg">{driver.name}</h4>
									<p class="text-xs text-on-surface-variant mt-0.5 leading-relaxed italic">"{driver.review}"</p>
								</div>
								
								<div class="flex-shrink-0 text-right">
									<div class="flex items-center gap-1 justify-end">
										<span class="text-2xl font-black {driver.score >= 90 ? 'text-emerald-600' : driver.score >= 70 ? 'text-blue-600' : 'text-rose-600'}">{driver.score}</span>
										<span class="text-xs font-bold text-on-surface-variant pt-1">/100</span>
									</div>
									<div class="w-24 h-1.5 bg-surface-container-high rounded-full mt-2 overflow-hidden">
										<div class="h-full rounded-full {driver.score >= 90 ? 'bg-emerald-500' : driver.score >= 70 ? 'bg-blue-500' : 'bg-rose-500'}" style="width: {driver.score}%"></div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-center py-8">
						<span class="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3 block">sentiment_dissatisfied</span>
						<p class="text-lg font-bold text-on-surface">Tidak ada data sopir</p>
						<p class="text-sm text-on-surface-variant mt-1">Belum ada perjalanan dalam 30 hari terakhir untuk dievaluasi.</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
