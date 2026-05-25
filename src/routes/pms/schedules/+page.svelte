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

<div class="flex flex-col h-full">
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Jadwal Perawatan</h1>
			<p class="text-on-surface-variant font-medium text-sm">Jadwal ganti oli, ban, service berkala, sparepart, dan perawatan lainnya per unit</p>
		</div>
		<button class="bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-amber-700 transition-colors shadow-sm">
			<span class="material-symbols-outlined text-lg">add</span> Buat Jadwal
		</button>
	</header>

	<!-- Stats -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
		{#each [
			{ label: 'Overdue', count: stats.overdue, color: 'rose', icon: 'error' },
			{ label: 'Due Today', count: stats.dueToday, color: 'amber', icon: 'today' },
			{ label: 'Upcoming', count: stats.upcoming, color: 'sky', icon: 'schedule' },
			{ label: 'Scheduled', count: stats.scheduled, color: 'slate', icon: 'calendar_month' },
		] as s}
			<button onclick={() => { statusFilter = s.label === 'Overdue' ? 'Overdue' : s.label === 'Due Today' ? 'Due Today' : s.label === 'Upcoming' ? 'Upcoming' : 'Scheduled'; updateParams(); }}
				class="bg-surface-container-lowest p-5 rounded-2xl border border-{s.color}-500/20 shadow-sm hover:scale-[1.02] transition-all text-center cursor-pointer {statusFilter === (s.label === 'Due Today' ? 'Due Today' : s.label) ? 'ring-2 ring-' + s.color + '-500/40' : ''}">
				<span class="material-symbols-outlined text-xl text-{s.color}-500 mb-1 block">{s.icon}</span>
				<h3 class="text-3xl font-black text-{s.color}-600">{s.count}</h3>
				<p class="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider mt-0.5">{s.label}</p>
			</button>
		{/each}
	</div>

	<!-- Filters -->
	<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
		<div class="flex gap-2 flex-wrap">
			{#each ['All', 'Overdue', 'Due Today', 'Upcoming', 'Scheduled'] as tab}
				<button onclick={() => { statusFilter = tab; updateParams(); }}
					class="px-4 py-2 rounded-full text-sm font-bold transition-colors {statusFilter === tab ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' : 'text-on-surface-variant hover:bg-surface-container'}">{tab}</button>
			{/each}
		</div>
		<div class="relative w-full lg:w-72 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input type="text" bind:value={searchQuery} oninput={handleSearch} placeholder="Cari unit, jenis perawatan..."
				class="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm font-medium shadow-sm" />
		</div>
	</div>

	<!-- Schedule Cards Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
		{#each schedules as sched}
			<div class="bg-surface-container-lowest rounded-[20px] shadow-sm border border-surface-container hover:shadow-md transition-all {sched.status === 'Overdue' ? 'border-l-4 border-l-rose-500' : sched.status === 'Due Today' ? 'border-l-4 border-l-amber-500' : ''}">
				<div class="p-5 border-b border-surface-container">
					<div class="flex items-start justify-between mb-3">
						<div>
							<p class="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{sched.id}</p>
							<h3 class="text-sm font-black text-on-surface mt-1">{sched.type}</h3>
						</div>
						<span class="text-[9px] font-bold px-2 py-1 rounded border uppercase tracking-wide {getStatusStyle(sched.status)}">{sched.status}</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
							<span class="material-symbols-outlined text-[16px]">local_shipping</span>
						</div>
						<p class="text-sm font-bold text-on-surface">{sched.unit}</p>
					</div>
				</div>
				<div class="p-5 space-y-3">
					<div class="grid grid-cols-2 gap-3 text-sm">
						<div>
							<p class="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-0.5">Jatuh Tempo</p>
							<p class="font-bold text-on-surface {sched.status === 'Overdue' ? 'text-rose-600' : sched.status === 'Due Today' ? 'text-amber-600' : ''}">{sched.nextDue}</p>
						</div>
						<div>
							<p class="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-0.5">KM Berikutnya</p>
							<p class="font-bold text-on-surface">{sched.nextKm ? sched.nextKm.toLocaleString() + ' km' : '-'}</p>
						</div>
						<div>
							<p class="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-0.5">Interval</p>
							<p class="text-xs text-on-surface-variant">{sched.interval}</p>
						</div>
						<div>
							<p class="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-0.5">Estimasi Biaya</p>
							<p class="font-bold text-amber-600">{fmt(sched.estimatedCost)}</p>
						</div>
					</div>
					<div>
						<p class="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-2">Item yang Dibutuhkan</p>
						<div class="space-y-1">
							{#each sched.items as item}
								<div class="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
									<span class="material-symbols-outlined text-[12px] text-amber-500">check_small</span> {item}
								</div>
							{/each}
						</div>
					</div>
					<div class="flex items-center gap-2 pt-1">
						<span class="material-symbols-outlined text-[14px] text-on-surface-variant">engineering</span>
						<span class="text-xs text-on-surface-variant">{sched.mechanic}</span>
					</div>
					<div class="flex gap-2 pt-1">
						<button class="flex-1 text-xs font-bold text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5">
							<span class="material-symbols-outlined text-[14px]">build_circle</span> Buat Work Order
						</button>
						<button class="w-10 h-9 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors">
							<span class="material-symbols-outlined text-[18px]">edit</span>
						</button>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
