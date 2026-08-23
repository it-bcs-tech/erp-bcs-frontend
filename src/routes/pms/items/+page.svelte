<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();
	let items = $derived(data.items || []);
	let categories = $derived(data.categories || []);
	let meta = $derived(data.meta);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let catFilter = $state($page.url.searchParams.get('cat') || 'All');
	let searchTimer: ReturnType<typeof setTimeout>;

	function updateParams() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery); else url.searchParams.delete('search');
		if (catFilter !== 'All') url.searchParams.set('cat', catFilter); else url.searchParams.delete('cat');
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}
	function handleSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(updateParams, 400); }

	let totalPages = $derived(Math.max(1, Math.ceil((meta?.total || 0) / (meta?.per_page || 8))));
	let currentPage = $derived(meta?.current_page || 1);
	
	let visiblePages = $derived.by(() => {
		const pages = [];
		if (totalPages <= 7) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			if (currentPage <= 4) {
				for (let i = 1; i <= 5; i++) pages.push(i);
				pages.push('...');
				pages.push(totalPages);
			} else if (currentPage >= totalPages - 3) {
				pages.push(1);
				pages.push('...');
				for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
			} else {
				pages.push(1);
				pages.push('...');
				for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
				pages.push('...');
				pages.push(totalPages);
			}
		}
		return pages;
	});

	function goToPage(p: number | string) {
		if (typeof p !== 'number' || p < 1 || p > totalPages) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { invalidateAll: true, noScroll: true });
	}

	const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
	const isLow = (i: any) => i.stock < i.minStock;

	const catColor: Record<string, string> = {
		'Sparepart': 'blue', 'Oli & Pelumas': 'amber', 'Ban': 'emerald', 'Konsumabel': 'violet'
	};
</script>

<svelte:head><title>Item Master | PMS</title></svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">inventory_2</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Master Item & Sparepart Inventaris</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Katalog seluruh barang logistik — sparepart armada, oli/pelumas mesin, ban, dan perlengkapan konsumabel
			</p>
		</div>
		<button class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer">
			<span class="material-symbols-outlined text-lg">add</span>
			<span>Tambah Item Baru</span>
		</button>
	</header>

	<!-- Unified Filter Bar -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<!-- Segmented Control Tabs -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
			<button 
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all {catFilter === 'All' ? 'bg-emerald-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
				onclick={() => { catFilter = 'All'; updateParams(); }}>
				Semua Kategori
			</button>
			{#each categories as cat}
				<button 
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all {catFilter === cat ? 'bg-emerald-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
					onclick={() => { catFilter = cat; updateParams(); }}>
					{cat}
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
				placeholder="Cari nama, kode barang..."
				class="w-full bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-xs font-medium shadow-xs" 
			/>
		</div>
	</div>

	<!-- Table Container -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Kode & Nama Barang</th>
						<th class="py-3.5 px-5">Kategori</th>
						<th class="py-3.5 px-5">Harga Beli Standar</th>
						<th class="py-3.5 px-5">Stok Fisik</th>
						<th class="py-3.5 px-5">Vendor Utama</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each items as item}
						<tr class="group hover:bg-surface-container transition-colors {isLow(item) ? 'bg-rose-500/5' : ''}">
							<td class="py-4 px-5">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
										<span class="material-symbols-outlined text-lg">inventory_2</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{item.name}</p>
										<p class="text-xs text-emerald-600 font-bold font-mono mt-0.5">{item.code}</p>
									</div>
								</div>
							</td>
							<td class="py-4 px-5">
								<span class="text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider
									text-{catColor[item.category] || 'slate'}-600
									bg-{catColor[item.category] || 'slate'}-500/10
									border-{catColor[item.category] || 'slate'}-500/20">
									{item.category}
								</span>
							</td>
							<td class="py-4 px-5">
								<p class="text-sm font-bold text-on-surface">{fmt(item.buyPrice)}</p>
								<p class="text-[10px] text-on-surface-variant">/ {item.unit}</p>
							</td>
							<td class="py-4 px-5">
								<div class="flex items-center gap-2">
									<span class="text-sm font-black {isLow(item) ? 'text-rose-600' : 'text-on-surface'}">{item.stock}</span>
									<span class="text-xs text-on-surface-variant font-medium">{item.unit}</span>
									{#if isLow(item)}
										<span class="text-[9px] font-bold bg-rose-500/10 text-rose-600 px-1.5 py-0.5 rounded border border-rose-500/20 uppercase tracking-wider">Stok Kritis</span>
									{/if}
								</div>
								<p class="text-[10px] text-on-surface-variant mt-0.5">Min: {item.minStock} {item.unit}</p>
							</td>
							<td class="py-4 px-5">
								<p class="text-xs font-bold text-on-surface">{item.supplier}</p>
								<p class="text-[10px] text-on-surface-variant mt-0.5">Terakhir: {item.lastPurchase}</p>
							</td>
							<td class="py-4 px-5 text-right">
								<div class="flex items-center justify-end gap-1">
									<button class="p-2 rounded-lg text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors" title="Edit Item">
										<span class="material-symbols-outlined text-lg">edit</span>
									</button>
									<button class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors" title="Menu Opsi">
										<span class="material-symbols-outlined text-lg">more_vert</span>
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
			<p class="text-xs text-on-surface-variant font-medium">Total <span class="font-bold text-on-surface">{meta?.total || 0}</span> item inventaris</p>
			<div class="flex gap-1">
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				{#each visiblePages as p}
					{#if p === '...'}
						<div class="w-8 h-8 flex items-center justify-center text-on-surface-variant text-xs font-bold">...</div>
					{:else}
						<button class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition-colors {currentPage === p ? 'bg-emerald-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}" onclick={() => goToPage(p)}>{p}</button>
					{/if}
				{/each}
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>
