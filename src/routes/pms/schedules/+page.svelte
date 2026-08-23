<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();
	let schedules = $derived(data.schedules || []);
	let stats = $derived(data.stats);

	let statusFilter = $state($page.url.searchParams.get('status') || 'All');
	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let searchTimer: ReturnType<typeof setTimeout>;

	function updateParams() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery); else url.searchParams.delete('search');
		if (statusFilter !== 'All') url.searchParams.set('status', statusFilter); else url.searchParams.delete('status');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(updateParams, 400); }

	const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

	function getStatusStyle(s: string) {
		switch(s) {
			case 'Overdue': return 'text-rose-600 bg-rose-500/10 border-rose-500/20';
			case 'Due Today': return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
			case 'Upcoming': return 'text-sky-600 bg-sky-500/10 border-sky-500/20';
			default: return 'text-slate-600 bg-slate-500/10 border-slate-500/20';
		}
	}
</script>

<svelte:head><title>Jadwal Service | PMS</title></svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">calendar_month</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Jadwal Perawatan & Servis Armada</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Monitoring jadwal ganti oli rutin, servis ban, inspeksi berkala, dan alokasi sparepart per unit armada
			</p>
		</div>
		<button class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer">
			<span class="material-symbols-outlined text-lg">add</span>
			<span>Buat Jadwal Baru</span>
		</button>
	</header>

	<!-- Stats (Bento) -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
		{#each [
			{ label: 'Overdue', count: stats.overdue, color: 'rose', icon: 'error', val: 'Overdue' },
			{ label: 'Due Today', count: stats.dueToday, color: 'amber', icon: 'today', val: 'Due Today' },
			{ label: 'Upcoming', count: stats.upcoming, color: 'blue', icon: 'schedule', val: 'Upcoming' },
			{ label: 'Scheduled', count: stats.scheduled, color: 'slate', icon: 'calendar_month', val: 'Scheduled' },
		] as s}
			<button 
				onclick={() => { statusFilter = s.val; updateParams(); }}
				class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs hover:border-emerald-500/30 transition-all text-center cursor-pointer {statusFilter === s.val ? 'ring-2 ring-emerald-500/40' : ''}"
			>
				<span class="material-symbols-outlined text-xl text-{s.color}-500 mb-1 block">{s.icon}</span>
				<h3 class="text-3xl font-black text-{s.color}-600">{s.count}</h3>
				<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-0.5">{s.label}</p>
			</button>
		{/each}
	</div>

	<!-- Unified Filter Bar -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<!-- Segmented Control Status Tabs -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
			{#each ['All', 'Overdue', 'Due Today', 'Upcoming', 'Scheduled'] as tab}
				<button 
					onclick={() => { statusFilter = tab; updateParams(); }}
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all {statusFilter === tab ? 'bg-emerald-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
				>
					{tab === 'All' ? 'Semua Jadwal' : tab}
				</button>
			{/each}
		</div>

		<!-- Search Input -->
		<div class="relative w-full md:w-72">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input 
				type="text" 
				bind:value={searchQuery} 
				oninput={handleSearch} 
				placeholder="Cari unit, jenis perawatan..."
				class="w-full bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs font-medium shadow-xs" 
			/>
		</div>
	</div>

	<!-- Schedule Cards Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
		{#each schedules as sched}
			<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between {sched.status === 'Overdue' ? 'border-l-4 border-l-rose-500' : sched.status === 'Due Today' ? 'border-l-4 border-l-amber-500' : ''}">
				<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60">
					<div class="flex items-start justify-between mb-3">
						<div>
							<p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest font-mono">{sched.id}</p>
							<h3 class="text-sm font-bold text-on-surface mt-1">{sched.type}</h3>
						</div>
						<span class="text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider {getStatusStyle(sched.status)}">{sched.status}</span>
					</div>
					<div class="flex items-center gap-3">
						<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
							<span class="material-symbols-outlined text-lg">local_shipping</span>
						</div>
						<p class="text-sm font-bold text-on-surface font-mono">{sched.unit}</p>
					</div>
				</div>
				<div class="p-5 space-y-3 flex-1 flex flex-col justify-between">
					<div class="grid grid-cols-2 gap-3 text-xs">
						<div class="bg-surface p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
							<p class="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-0.5">Jatuh Tempo</p>
							<p class="font-bold {sched.status === 'Overdue' ? 'text-rose-600' : sched.status === 'Due Today' ? 'text-amber-600' : 'text-on-surface'}">{sched.nextDue}</p>
						</div>
						<div class="bg-surface p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
							<p class="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-0.5">KM Target</p>
							<p class="font-bold text-on-surface font-mono">{sched.nextKm ? sched.nextKm.toLocaleString() + ' km' : '-'}</p>
						</div>
						<div class="bg-surface p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
							<p class="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-0.5">Interval</p>
							<p class="font-medium text-on-surface-variant">{sched.interval}</p>
						</div>
						<div class="bg-surface p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
							<p class="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-0.5">Est. Biaya</p>
							<p class="font-bold text-emerald-600">{fmt(sched.estimatedCost)}</p>
						</div>
					</div>

					<div class="bg-surface p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
						<p class="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-1.5">Kebutuhan Item / Sparepart</p>
						<div class="space-y-1">
							{#each sched.items as item}
								<div class="flex items-center gap-1.5 text-xs text-on-surface-variant">
									<span class="material-symbols-outlined text-sm text-emerald-500">check_small</span>
									<span>{item}</span>
								</div>
							{/each}
						</div>
					</div>

					<div class="flex items-center gap-2 text-xs text-on-surface-variant">
						<span class="material-symbols-outlined text-base">engineering</span>
						<span class="font-medium">Mekanik PIC: {sched.mechanic}</span>
					</div>

					<div class="flex gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
						<button class="flex-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
							<span class="material-symbols-outlined text-base">build_circle</span>
							<span>Buat Work Order</span>
						</button>
						<button class="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors" title="Edit Jadwal">
							<span class="material-symbols-outlined text-base">edit</span>
						</button>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
