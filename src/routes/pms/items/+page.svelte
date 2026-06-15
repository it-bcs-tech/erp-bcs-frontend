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

<div class="flex flex-col h-full">
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Item Master</h1>
			<p class="text-on-surface-variant font-medium text-sm">Data master semua barang — sparepart, oli, ban, dan konsumabel</p>
		</div>
		<button class="bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-amber-700 transition-colors shadow-sm">
			<span class="material-symbols-outlined text-lg">add</span> Tambah Item
		</button>
	</header>

	<!-- Filters -->
	<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
		<div class="flex gap-2 items-center w-full lg:w-auto">
			<span class="material-symbols-outlined text-on-surface-variant hidden lg:block">filter_list</span>
			<select 
				bind:value={catFilter} 
				onchange={updateParams}
				class="w-full lg:w-64 px-4 py-2.5 bg-surface border border-outline-variant/30 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none cursor-pointer"
			>
				<option value="All">All Categories</option>
				{#each categories as cat}
					<option value={cat}>{cat}</option>
				{/each}
			</select>
		</div>

		<div class="relative w-full lg:w-72 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input type="text" bind:value={searchQuery} oninput={handleSearch}
				placeholder="Cari nama, kode barang..."
				class="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm font-medium shadow-sm" />
		</div>
	</div>

	<!-- Table -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse min-w-[900px]">
				<thead>
					<tr class="border-b border-surface-container">
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Kode & Nama</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Kategori</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Harga Beli</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Stok</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Supplier</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each items as item}
						<tr class="group hover:bg-surface-container-low transition-colors {isLow(item) ? 'bg-rose-500/3' : ''}">
							<td class="py-4 px-6">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 flex-shrink-0">
										<span class="material-symbols-outlined text-[17px]">inventory_2</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{item.name}</p>
										<p class="text-[10px] text-amber-600 font-bold">{item.code}</p>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<span class="text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wide
									text-{catColor[item.category] || 'slate'}-600
									bg-{catColor[item.category] || 'slate'}-500/10
									border-{catColor[item.category] || 'slate'}-500/20">
									{item.category}
								</span>
							</td>
							<td class="py-4 px-6">
								<p class="text-sm font-bold text-on-surface">{fmt(item.buyPrice)}</p>
								<p class="text-[10px] text-on-surface-variant">/ {item.unit}</p>
							</td>
							<td class="py-4 px-6">
								<div class="flex items-center gap-2">
									<span class="text-sm font-black {isLow(item) ? 'text-rose-600' : 'text-on-surface'}">{item.stock}</span>
									<span class="text-xs text-on-surface-variant">{item.unit}</span>
									{#if isLow(item)}
										<span class="text-[9px] font-bold bg-rose-500/10 text-rose-600 px-1.5 py-0.5 rounded border border-rose-500/20 uppercase">Low</span>
									{/if}
								</div>
								<p class="text-[10px] text-on-surface-variant mt-0.5">Min: {item.minStock} {item.unit}</p>
							</td>
							<td class="py-4 px-6">
								<p class="text-xs font-medium text-on-surface">{item.supplier}</p>
								<p class="text-[10px] text-on-surface-variant">Last: {item.lastPurchase}</p>
							</td>
							<td class="py-4 px-6 text-right">
								<div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<button class="p-2 rounded-lg text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
										<span class="material-symbols-outlined text-[18px]">edit</span>
									</button>
									<button class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">
										<span class="material-symbols-outlined text-[18px]">more_vert</span>
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="px-6 py-4 border-t border-surface-container flex items-center justify-between">
			<p class="text-xs text-on-surface-variant">Total {meta?.total || 0} item</p>
			<div class="flex gap-1">
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				{#each visiblePages as p}
					{#if p === '...'}
						<div class="w-8 h-8 flex items-center justify-center text-on-surface-variant">...</div>
					{:else}
						<button class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors {currentPage === p ? 'bg-amber-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}" onclick={() => goToPage(p)}>{p}</button>
					{/if}
				{/each}
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>
