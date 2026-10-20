<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { formatDateId, getStatusInfo, getPhysicalStatusInfo, getEntityTypeInfo } from '$lib/utils/dms';
	import DmsSecureViewer from '$lib/components/DmsSecureViewer.svelte';

	let { data } = $props();

	let q = $derived($page.url.searchParams.get('q') || '');
	let entityType = $derived($page.url.searchParams.get('entity_type') || '');
	let type = $derived($page.url.searchParams.get('type') || '');
	let category = $derived($page.url.searchParams.get('category') || '');
	let company = $derived($page.url.searchParams.get('company') || '');
	let gate = $derived($page.url.searchParams.get('gate') || '');
	let scope = $derived($page.url.searchParams.get('scope') || '');
	let sort = $derived($page.url.searchParams.get('sort') || data.selectedSort || 'newest');

	let isDenseView = $state(false);

	// Quick Preview modal
	let isViewerOpen = $state(false);
	let selectedDoc = $state<any>(null);

	let hasActiveFilters = $derived(Boolean(q || entityType || type || category || company || gate || scope || (sort && sort !== 'newest')));

	function openViewer(doc: any) {
		selectedDoc = doc;
		isViewerOpen = true;
	}

	function setQuickFilter(mode: 'ALL' | 'CONTRACT' | 'FLEET' | 'DRIVER' | 'CORPORATE') {
		const url = new URL(window.location.href);
		url.searchParams.delete('entity_type');
		url.searchParams.delete('type');
		url.searchParams.delete('scope');
		url.searchParams.set('page', '1');

		if (mode === 'CONTRACT') {
			url.searchParams.set('type', 'KONTRAK_KERJASAMA');
		} else if (mode === 'FLEET') {
			url.searchParams.set('entity_type', 'FLEET');
		} else if (mode === 'DRIVER') {
			url.searchParams.set('entity_type', 'DRIVER');
		} else if (mode === 'CORPORATE') {
			url.searchParams.set('entity_type', 'CORPORATE');
		}
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleScopeClusterClick(clusterId: string) {
		const url = new URL(window.location.href);
		if (!clusterId || scope === clusterId) {
			url.searchParams.delete('scope');
		} else {
			url.searchParams.set('scope', clusterId);
		}
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function setEntityFilter(newType: string) {
		const url = new URL(window.location.href);
		if (newType) {
			url.searchParams.set('entity_type', newType);
		} else {
			url.searchParams.delete('entity_type');
		}
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function setGateFilter(newGate: string) {
		const url = new URL(window.location.href);
		if (newGate) {
			url.searchParams.set('gate', newGate);
		} else {
			url.searchParams.delete('gate');
		}
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleTypeChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		const url = new URL(window.location.href);
		if (val) {
			url.searchParams.set('type', val);
		} else {
			url.searchParams.delete('type');
		}
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleCategoryChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		const url = new URL(window.location.href);
		if (val) {
			url.searchParams.set('category', val);
		} else {
			url.searchParams.delete('category');
		}
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleCompanyChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		const url = new URL(window.location.href);
		if (val) {
			url.searchParams.set('company', val);
		} else {
			url.searchParams.delete('company');
		}
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSortChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		const url = new URL(window.location.href);
		if (val && val !== 'newest') {
			url.searchParams.set('sort', val);
		} else {
			url.searchParams.delete('sort');
		}
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleLimitChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		const url = new URL(window.location.href);
		url.searchParams.set('limit', val);
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function resetFilters() {
		goto('/dms/transactions/documents', { keepFocus: true, noScroll: true });
	}

	function goToPage(pNum: number) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', pNum.toString());
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	let currentPage = $derived(data.pagination.page);
	let totalPages = $derived(data.pagination.totalPages);
	let startItem = $derived(data.pagination.total === 0 ? 0 : ((currentPage - 1) * data.pagination.limit) + 1);
	let endItem = $derived(Math.min(currentPage * data.pagination.limit, data.pagination.total));

	let pageNumbers = $derived.by(() => {
		const pages: number[] = [];
		const start = Math.max(1, currentPage - 2);
		const end = Math.min(totalPages, Math.max(1, start + 4));
		for (let i = start; i <= end; i++) pages.push(i);
		return pages;
	});
</script>

<svelte:head>
	<title>Direktori Dokumen & Arsip Legal | DMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-2xl">folder_shared</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Direktori Dokumen & Arsip Legal</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Pusat pemantauan masa berlaku dokumen kepatuhan logistik, armada, driver, kontrak legal, dan arsip fisik.
			</p>
		</div>
		<div class="flex items-center gap-3">
			<a
				href="/dms/dashboard"
				class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-on-surface hover:bg-surface-container-high text-xs font-bold transition-colors flex items-center gap-1.5"
			>
				<span class="material-symbols-outlined text-lg text-indigo-600">analytics</span>
				<span>Dashboard DMS</span>
			</a>
			<a
				href="/dms/transactions/documents/create"
				class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs flex items-center gap-2 transition-colors"
			>
				<span class="material-symbols-outlined text-lg">add</span>
				<span>Registrasi Dokumen</span>
			</a>
		</div>
	</header>

	<!-- Segmented Navigation Tabs (Semua, Kontrak Legal & PKS, Armada, Driver, Korporat & ISO) -->
	<div class="flex flex-col gap-3">
		<div class="inline-flex p-1.5 rounded-2xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 gap-1 overflow-x-auto shadow-xs max-w-full">
			<button
				type="button"
				onclick={() => setQuickFilter('ALL')}
				class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {!entityType && !type
					? 'bg-indigo-600 text-white shadow-xs'
					: 'bg-transparent text-on-surface-variant hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">grid_view</span>
				<span>Semua Dokumen</span>
				{#if data.tabCounts?.total}
					<span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {!entityType && !type ? 'bg-indigo-700/60 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300'}">{data.tabCounts.total.toLocaleString('id-ID')}</span>
				{/if}
			</button>

			<button
				type="button"
				onclick={() => setQuickFilter('CONTRACT')}
				class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {type === 'KONTRAK_KERJASAMA'
					? 'bg-amber-600 text-white shadow-xs'
					: 'bg-transparent text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'}"
			>
				<span class="material-symbols-outlined text-sm">history_edu</span>
				<span>Kontrak Legal & PKS</span>
				<span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {type === 'KONTRAK_KERJASAMA' ? 'bg-amber-700/60 text-white' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'}">{data.tabCounts?.contracts ? data.tabCounts.contracts.toLocaleString('id-ID') : '1.706'}</span>
			</button>

			<button
				type="button"
				onclick={() => setQuickFilter('FLEET')}
				class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {entityType === 'FLEET'
					? 'bg-sky-600 text-white shadow-xs'
					: 'bg-transparent text-on-surface-variant hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">local_shipping</span>
				<span>Dokumen Armada (FMS)</span>
				<span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {entityType === 'FLEET' ? 'bg-sky-700/60 text-white' : 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300'}">{data.tabCounts?.fleet ? data.tabCounts.fleet.toLocaleString('id-ID') : '2.744'}</span>
			</button>

			<button
				type="button"
				onclick={() => setQuickFilter('DRIVER')}
				class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {entityType === 'DRIVER'
					? 'bg-indigo-600 text-white shadow-xs'
					: 'bg-transparent text-on-surface-variant hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">airline_seat_recline_normal</span>
				<span>Dokumen Driver (HRIS)</span>
				<span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {entityType === 'DRIVER' ? 'bg-indigo-700/60 text-white' : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300'}">{data.tabCounts?.driver ? data.tabCounts.driver.toLocaleString('id-ID') : '574'}</span>
			</button>

			<button
				type="button"
				onclick={() => setQuickFilter('CORPORATE')}
				class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {entityType === 'CORPORATE'
					? 'bg-violet-600 text-white shadow-xs'
					: 'bg-transparent text-on-surface-variant hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">corporate_fare</span>
				<span>Korporat & ISO</span>
				<span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {entityType === 'CORPORATE' ? 'bg-violet-700/60 text-white' : 'bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-300'}">{data.tabCounts?.corporate ? data.tabCounts.corporate.toLocaleString('id-ID') : '846'}</span>
			</button>
		</div>

		<!-- Scope Cluster Filter Chips (Aktif saat di Tab Kontrak Legal & PKS) -->
		{#if type === 'KONTRAK_KERJASAMA' && data.scopeClusters}
			<div class="flex items-center gap-1.5 flex-wrap p-2.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
				<span class="text-[11px] font-bold text-amber-900 dark:text-amber-300 ml-1 mr-1 flex items-center gap-1">
					<span class="material-symbols-outlined text-sm">category</span>
					Klaster Ruang Lingkup:
				</span>
				<button
					type="button"
					onclick={() => handleScopeClusterClick('')}
					class="px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer {!scope
						? 'bg-amber-600 text-white shadow-xs'
						: 'bg-surface-container-low text-on-surface-variant hover:bg-amber-100 dark:hover:bg-amber-900/40'}"
				>
					Semua Scope
				</button>
				{#each data.scopeClusters as cluster}
					<button
						type="button"
						onclick={() => handleScopeClusterClick(cluster.id)}
						class="px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer {scope === cluster.id
							? 'bg-amber-600 text-white shadow-xs'
							: 'bg-surface-container-low text-on-surface-variant hover:bg-amber-100 dark:hover:bg-amber-900/40'}"
					>
						<span class="material-symbols-outlined text-xs">{cluster.icon}</span>
						<span>{cluster.name}</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Table Container with Filter Header -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<!-- Search & Filters Bar -->
		<form method="GET" data-sveltekit-keepfocus class="p-3 sm:p-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap items-center gap-2 sm:gap-2.5">
			<input type="hidden" name="entity_type" value={entityType} />
			{#if type === 'KONTRAK_KERJASAMA'}
				<input type="hidden" name="type" value={type} />
			{/if}
			<input type="hidden" name="gate" value={gate} />
			<input type="hidden" name="scope" value={scope} />
			<input type="hidden" name="limit" value={data.pagination.limit} />

			<div class="relative flex-1 min-w-[200px] sm:min-w-[240px]">
				<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
				<input
					type="text"
					name="q"
					value={q}
					placeholder="Cari nomor dokumen, judul, unit truk, driver, atau QR ID..."
					class="w-full bg-surface-container-low text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium border-0 outline-none placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
				/>
			</div>

			{#if type !== 'KONTRAK_KERJASAMA'}
				<select
					name="type"
					onchange={handleTypeChange}
					value={type}
					class="bg-surface-container-low text-on-surface rounded-xl px-3 py-2 text-xs font-medium border-0 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer w-full sm:w-auto sm:max-w-[155px] truncate"
					title="Filter berdasarkan Tipe Dokumen"
				>
					<option value="">Semua Tipe Dokumen</option>
					{#each data.docTypes as dt}
						<option value={dt.code}>{dt.name}</option>
					{/each}
				</select>
			{/if}

			<select
				name="category"
				onchange={handleCategoryChange}
				value={category}
				class="bg-surface-container-low text-on-surface rounded-xl px-3 py-2 text-xs font-medium border-0 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer w-full sm:w-auto sm:max-w-[150px] truncate"
				title="Filter berdasarkan Kategori Dokumen"
			>
				<option value="">Semua Kategori</option>
				{#each data.categories || [] as cat}
					<option value={cat.id}>{cat.name}</option>
				{/each}
			</select>

			{#if entityType === 'CORPORATE' || !entityType}
				<select
					name="company"
					onchange={handleCompanyChange}
					value={company}
					class="bg-surface-container-low text-on-surface rounded-xl px-3 py-2 text-xs font-medium border-0 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer w-full sm:w-auto sm:max-w-[175px] truncate"
					title="Filter berdasarkan Entitas Perusahaan"
				>
					<option value="">Semua Perusahaan</option>
					{#each data.companies || [] as cmp}
						<option value={cmp.id}>{cmp.name}</option>
					{/each}
				</select>
			{/if}

			<select
				name="sort"
				onchange={handleSortChange}
				value={sort}
				class="bg-surface-container-low text-on-surface rounded-xl px-3 py-2 text-xs font-medium border-0 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer w-full sm:w-auto sm:max-w-[160px] truncate"
				title="Urutan Tampilan Dokumen"
			>
				<option value="newest">🕒 Terbaru (Terbit)</option>
				<option value="oldest">⏳ Terlama (Terbit)</option>
				<option value="expiring_soon">⚠️ Segera Expired</option>
				<option value="created_recent">📥 Terakhir Ditambahkan</option>
			</select>

			<div class="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
				<button
					type="submit"
					class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer flex-1 sm:flex-initial shrink-0"
				>
					<span class="material-symbols-outlined text-sm">filter_alt</span>
					<span>Filter</span>
				</button>

				{#if hasActiveFilters}
					<button
						type="button"
						onclick={resetFilters}
						class="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
						title="Reset semua filter ke default"
					>
						<span class="material-symbols-outlined text-sm">filter_alt_off</span>
						<span>Reset</span>
					</button>
				{/if}
			</div>
		</form>

		<!-- Expiry Gate Quick Filters & View Mode Toggle -->
		<div class="px-4 py-2.5 bg-surface-container-lowest dark:bg-surface-container-low/50 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-3 overflow-x-auto text-xs">
			<div class="flex items-center gap-2">
				<span class="text-on-surface-variant font-bold text-[11px] uppercase tracking-wider mr-1">Status Gate:</span>
				
				<button
					type="button"
					onclick={() => setGateFilter('')}
					class="px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer {gate === '' ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/30' : 'text-on-surface-variant hover:text-on-surface'}"
				>
					Semua
				</button>

				<button
					type="button"
					onclick={() => setGateFilter('EXPIRED')}
					class="px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer {gate === 'EXPIRED' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/30' : 'text-on-surface-variant hover:text-on-surface'}"
				>
					Expired (Kadaluarsa)
				</button>

				<button
					type="button"
					onclick={() => setGateFilter('URGENT_7')}
					class="px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer {gate === 'URGENT_7' ? 'bg-red-500/10 text-red-600 border border-red-500/30' : 'text-on-surface-variant hover:text-on-surface'}"
				>
					H-7 Urgent
				</button>

				<button
					type="button"
					onclick={() => setGateFilter('CRITICAL_30')}
					class="px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer {gate === 'CRITICAL_30' ? 'bg-orange-500/10 text-orange-600 border border-orange-500/30' : 'text-on-surface-variant hover:text-on-surface'}"
				>
					H-30 Kritis
				</button>

				<button
					type="button"
					onclick={() => setGateFilter('WARNING_60')}
					class="px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer {gate === 'WARNING_60' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30' : 'text-on-surface-variant hover:text-on-surface'}"
				>
					H-60 Warning
				</button>
			</div>

			<!-- Dense View Toggle Button -->
			<button
				type="button"
				onclick={() => isDenseView = !isDenseView}
				class="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 {isDenseView ? 'bg-indigo-600 text-white shadow-xs' : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface'}"
				title="Toggle tampilan tabel rapat / padat"
			>
				<span class="material-symbols-outlined text-[16px]">{isDenseView ? 'density_small' : 'density_medium'}</span>
				<span>{isDenseView ? 'Mode Ringkas' : 'Mode Standar'}</span>
			</button>
		</div>

		<!-- Main Document Table -->
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[1000px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60 {isDenseView ? 'text-[10px]' : 'text-xs'}">
					<tr>
						<th class="{isDenseView ? 'py-2 px-3' : 'py-3.5 px-4'}">Dokumen & QR ID</th>
						<th class="{isDenseView ? 'py-2 px-3' : 'py-3.5 px-4'}">Entitas Terkait</th>
						<th class="{isDenseView ? 'py-2 px-3' : 'py-3.5 px-4'}">Tipe & Versi</th>
						<th class="{isDenseView ? 'py-2 px-3' : 'py-3.5 px-4'}">Masa Berlaku</th>
						<th class="{isDenseView ? 'py-2 px-3' : 'py-3.5 px-4'}">Status & Sisa Hari</th>
						<th class="{isDenseView ? 'py-2 px-3' : 'py-3.5 px-4'}">Lokasi Fisik</th>
						<th class="{isDenseView ? 'py-2 px-3' : 'py-3.5 px-4'} text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if data.documents.length === 0}
						<tr>
							<td colspan="7" class="py-16 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">folder_open</span>
								<p class="text-xs font-semibold">Tidak ada dokumen yang sesuai dengan kriteria pencarian.</p>
							</td>
						</tr>
					{:else}
						{#each data.documents as doc}
							{@const sInfo = getStatusInfo(doc.status, doc.gate_level, doc.days_remaining)}
							{@const eInfo = getEntityTypeInfo(doc.entity_type)}
							{@const pInfo = getPhysicalStatusInfo(doc.physical_status)}

							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<!-- Document Title & QR -->
								<td class="{isDenseView ? 'py-2 px-3' : 'py-3.5 px-4'}">
									<div class="flex items-start gap-2.5">
										<div class="{isDenseView ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
											<span class="material-symbols-outlined {isDenseView ? 'text-xs' : 'text-base'}">description</span>
										</div>
										<div>
											<a href="/dms/transactions/documents/{doc.id}" class="font-bold text-on-surface hover:text-indigo-600 transition-colors {isDenseView ? 'text-[11px]' : 'text-xs'} line-clamp-1">
												{doc.title}
											</a>
											<div class="flex items-center gap-1.5 flex-wrap mt-0.5">
												<span class="text-[10px] font-mono text-on-surface-variant">No: {doc.doc_number || '-'}</span>
												{#if doc.metadata?.is_addendum}
													<span class="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-[9px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300">
														Adendum
													</span>
												{:else if doc.type_code === 'KONTRAK_KERJASAMA'}
													<span class="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/60 text-[9px] font-bold text-blue-800 dark:text-blue-300 border border-blue-300">
														Kontrak Induk
													</span>
												{/if}
												{#if doc.metadata?.scope}
													<span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-700 dark:text-slate-300">
														{doc.metadata.scope}
													</span>
												{/if}
												{#if doc.metadata?.contract_value && doc.metadata.contract_value !== '0' && Number(doc.metadata.contract_value) > 0}
													<span class="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
														Rp {Number(doc.metadata.contract_value).toLocaleString('id-ID')}
													</span>
												{/if}
												{#if doc.metadata?.molhr_no && doc.metadata.molhr_no !== '-'}
													<span class="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-[9px] font-mono font-bold text-purple-800 dark:text-purple-300 border border-purple-300">
														SK: {doc.metadata.molhr_no}
													</span>
												{/if}
												{#if doc.metadata?.bentuk_fisik_akta}
													<span class="px-1.5 py-0.2 rounded text-[9px] font-bold border {doc.metadata.is_original ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300'}">
														{doc.metadata.bentuk_fisik_akta.split(' ')[0]}
													</span>
												{/if}
												{#if doc.metadata?.certificate_type}
													<span class="px-1.5 py-0.2 rounded text-[9px] font-bold border {doc.metadata.certificate_type === 'SHM' ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300' : 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300'}">
														{doc.metadata.certificate_type}
													</span>
												{/if}
												{#if doc.metadata?.land_size_formatted}
													<span class="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
														📐 {doc.metadata.land_size_formatted}
													</span>
												{/if}
												{#if doc.metadata?.status_agunan}
													{#if doc.metadata?.is_pledged}
														<span class="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-[9px] font-bold text-rose-800 dark:text-rose-300 border border-rose-300 inline-flex items-center gap-0.5">
															<span class="material-symbols-outlined text-[11px]">account_balance</span>
															Agunan: {doc.metadata.posisi_dokumen || doc.metadata.status_agunan}
														</span>
													{:else}
														<span class="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-[9px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 inline-flex items-center gap-0.5">
															<span class="material-symbols-outlined text-[11px]">lock</span>
															Brankas
														</span>
													{/if}
												{/if}
												{#if doc.metadata?.no_ajb}
													<span class="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-[9px] font-mono text-amber-800 dark:text-amber-300 border border-amber-200">
														AJB: {doc.metadata.no_ajb}
													</span>
												{/if}
												{#if doc.type_code === 'SK_DIREKSI'}
													<span class="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-[9px] font-bold text-purple-800 dark:text-purple-300 border border-purple-300">
														📜 SK Direksi
													</span>
												{/if}
												{#if doc.type_code === 'IZIN_B3'}
													<span class="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-[9px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300">
														☣️ Izin Limbah B3
													</span>
													{#if doc.metadata?.rekom_klh}
														<span class="px-1.5 py-0.2 rounded bg-teal-50 dark:bg-teal-950/60 text-[9px] font-mono font-bold text-teal-800 dark:text-teal-300 border border-teal-200">
															KLHK: {doc.metadata.rekom_klh}
														</span>
													{/if}
												{/if}

												{#if doc.type_code === 'SIM_DRIVER'}
													<span class="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/60 text-[9px] font-bold text-indigo-800 dark:text-indigo-300 border border-indigo-300">
														🪪 {doc.metadata?.golongan ? `SIM ${doc.metadata.golongan}` : 'SIM Pengemudi'}
													</span>
												{/if}
												{#if doc.type_code === 'SERTIFIKAT_B3_DRIVER'}
													<span class="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-[9px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300">
														🪪 Sertifikat B3 Driver
													</span>
													{#if doc.metadata?.jenis_kendaraan}
														<span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-semibold text-slate-700 dark:text-slate-300">
															🚛 {doc.metadata.jenis_kendaraan}
														</span>
													{/if}
													{#if doc.metadata?.dilaksanakan}
														<span class="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-[9px] text-indigo-700 dark:text-indigo-300 border border-indigo-200">
															🎓 {doc.metadata.dilaksanakan}
														</span>
													{/if}
												{/if}
												{#if doc.type_code === 'KREDIT_PERBANKAN'}
													<span class="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-[9px] font-bold text-rose-800 dark:text-rose-300 border border-rose-300 inline-flex items-center gap-0.5">
														<span class="material-symbols-outlined text-[11px]">account_balance</span>
														Bank: {doc.metadata?.nama_bank || 'Perbankan'}
													</span>
													{#if doc.metadata?.attachments && doc.metadata.attachments.length > 1}
														<span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-mono text-slate-600 dark:text-slate-400">
															📎 {doc.metadata.attachments.length} berkas
														</span>
													{/if}
												{/if}
												{#if doc.metadata?.no_nib && doc.metadata.no_nib !== '-'}
													<span class="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-[9px] font-mono text-indigo-700 dark:text-indigo-300">
														NIB: {doc.metadata.no_nib}
													</span>
												{/if}
												{#if doc.metadata?.administrative_village}
													<span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] text-slate-700 dark:text-slate-300">
														📍 {doc.metadata.administrative_village}
													</span>
												{/if}
												{#if doc.metadata?.job_desc}
													<span class="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-[9px] font-bold text-amber-700 dark:text-amber-300 border border-amber-300">
														👷 {doc.metadata.job_desc}
													</span>
												{/if}
												{#if doc.metadata?.work_location}
													<span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-medium text-slate-700 dark:text-slate-300">
														🏢 {doc.metadata.work_location}
													</span>
												{/if}
												{#if doc.metadata?.issued_by && doc.type_code === 'LEGAL_PERUSAHAAN'}
													<span class="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-[9px] text-blue-700 dark:text-blue-300 border border-blue-200">
														🏛️ {doc.metadata.issued_by.length > 25 ? doc.metadata.issued_by.substring(0, 23) + '...' : doc.metadata.issued_by}
													</span>
												{/if}
												{#if doc.metadata?.capacity}
													<span class="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-[9px] font-mono text-emerald-700 dark:text-emerald-300">
														⚖️ {doc.metadata.capacity}
													</span>
												{/if}
												{#if doc.qr_code_id}
													<span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-mono text-slate-600 dark:text-slate-400">
														{doc.qr_code_id}
													</span>
												{/if}
											</div>
										</div>
									</div>
								</td>

								<!-- Linked Entity -->
								<td class="{isDenseView ? 'py-2 px-3' : 'py-3.5 px-4'}">
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-sm {eInfo.color}">{eInfo.icon}</span>
										<div class="{isDenseView ? 'text-[11px]' : 'text-xs'}">
											{#if doc.entity_type === 'FLEET'}
												<p class="font-bold text-on-surface">{doc.unit_nomor || doc.unit_number || 'Armada'}</p>
												<p class="text-[10px] text-on-surface-variant">{doc.unit_lambung || doc.unit_type || 'Fleet Unit'}</p>
											{:else if doc.entity_type === 'DRIVER'}
												<p class="font-bold text-on-surface">{doc.driver_name || 'Driver'}</p>
												<p class="text-[10px] text-on-surface-variant">NIK: {doc.driver_payroll || doc.driver_payroll_id || '-'}</p>
											{:else if doc.entity_type === 'CUSTOMER'}
												<p class="font-bold text-on-surface">{doc.customer_name || doc.partner_name || 'Mitra'}</p>
												<p class="text-[10px] text-on-surface-variant">{doc.metadata?.legal_entity ? `[${doc.metadata.legal_entity}] Customer` : 'Customer SPK'}</p>
											{:else if doc.entity_type === 'VENDOR'}
												<p class="font-bold text-on-surface">{doc.customer_name || doc.partner_name || 'Vendor / Rekanan'}</p>
												<p class="text-[10px] text-amber-600 font-semibold">{doc.metadata?.legal_entity ? `[${doc.metadata.legal_entity}] Rekanan` : 'Vendor & Jasa'}</p>
											{:else}
												{#if doc.metadata?.owner_name}
													<p class="font-bold text-on-surface">{doc.metadata.owner_name}</p>
													<div class="flex items-center gap-1.5 flex-wrap">
														<p class="text-[10px] text-on-surface-variant">Hak Atas Tanah · {doc.company_name || 'BCS Group'}</p>
													</div>
												{:else}
													<p class="font-bold text-on-surface">{doc.company_name || 'Korporat / Umum'}</p>
													<div class="flex items-center gap-1.5 flex-wrap">
														<p class="text-[10px] text-on-surface-variant">{doc.company_code ? `[${doc.company_code}] Legal` : 'Holding & Legal'}</p>
														{#if doc.notary_name}
															<span class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">· {doc.notary_name}</span>
														{/if}
													</div>
												{/if}
											{/if}
										</div>
									</div>
								</td>

								<!-- Doc Type, Category & Version -->
								<td class="{isDenseView ? 'py-2 px-3' : 'py-3.5 px-4'}">
									<div class="flex flex-col gap-1 items-start">
										<div class="flex items-center gap-1">
											<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-on-surface-variant">
												{doc.type_name || doc.doc_type_name || 'Dokumen'}
											</span>
											<span class="text-[10px] font-mono font-bold text-indigo-600">v{doc.current_version || 1}</span>
										</div>
										{#if doc.category_name}
											<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
												{doc.category_name}
											</span>
										{/if}
									</div>
								</td>

								<!-- Expiry Date -->
								<td class="{isDenseView ? 'py-2 px-3 text-[11px]' : 'py-3.5 px-4 text-xs'} font-mono">
									{doc.expiry_date ? formatDateId(doc.expiry_date) : 'Permanen'}
								</td>

								<!-- Status Badge & Remaining Days -->
								<td class="{isDenseView ? 'py-2 px-3' : 'py-3.5 px-4'}">
									<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black border inline-flex items-center gap-1 {sInfo.badgeClass}">
										<span class="material-symbols-outlined text-xs">{sInfo.icon}</span>
										<span>{sInfo.label}</span>
									</span>
								</td>

								<!-- Physical Location -->
								<td class="{isDenseView ? 'py-2 px-3' : 'py-3.5 px-4'}">
									<div class="flex items-center gap-1">
										<span class="material-symbols-outlined text-xs text-slate-400">inventory_2</span>
										<span class="text-on-surface-variant font-medium text-[11px]">
											{doc.filing_location_name ? `${doc.filing_location_code || ''} ${doc.filing_location_name}` : '-'}
										</span>
									</div>
								</td>

								<!-- Actions -->
								<td class="{isDenseView ? 'py-2 px-3' : 'py-3.5 px-4'} text-right">
									<div class="flex items-center justify-end gap-1.5">
										{#if doc.file_path}
											<button
												type="button"
												onclick={() => openViewer(doc)}
												title="Pratinjau Watermark"
												class="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors cursor-pointer"
											>
												<span class="material-symbols-outlined text-base">visibility</span>
											</button>
										{/if}
										<a
											href="/dms/transactions/documents/{doc.id}"
											title="Buka Detail & Timeline"
											class="p-1.5 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded-lg transition-colors"
										>
											<span class="material-symbols-outlined text-base">arrow_forward</span>
										</a>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		<!-- Pagination Footer with Dynamic Limit -->
		<div class="px-4 py-3 border-t border-slate-200/60 dark:border-slate-800/60 bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
			<div class="flex items-center gap-4">
				<div>
					Menampilkan <span class="font-bold text-on-surface">{startItem}</span> - <span class="font-bold text-on-surface">{endItem}</span> dari <span class="font-bold text-on-surface">{data.pagination.total}</span> dokumen
				</div>

				<div class="flex items-center gap-2">
					<span class="text-[11px] text-on-surface-variant">Tampilkan:</span>
					<select
						onchange={handleLimitChange}
						value={String(data.pagination.limit)}
						class="bg-surface-container-lowest dark:bg-surface-container text-on-surface rounded-lg px-2 py-1 text-xs border-0 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer font-bold"
					>
						<option value="10">10</option>
						<option value="25">25</option>
						<option value="50">50</option>
						<option value="100">100</option>
					</select>
				</div>
			</div>

			<div class="flex items-center gap-1">
				<button
					type="button"
					onclick={() => goToPage(currentPage - 1)}
					disabled={currentPage <= 1}
					class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
				>
					<span class="material-symbols-outlined text-sm">chevron_left</span>
				</button>

				{#each pageNumbers as pNum}
					<button
						type="button"
						onclick={() => goToPage(pNum)}
						class="w-7 h-7 flex items-center justify-center rounded-lg font-bold transition-colors cursor-pointer {pNum === currentPage
							? 'bg-indigo-600 text-white'
							: 'border border-slate-200 dark:border-slate-800 hover:bg-surface-container-high text-on-surface'}"
					>
						{pNum}
					</button>
				{/each}

				<button
					type="button"
					onclick={() => goToPage(currentPage + 1)}
					disabled={currentPage >= totalPages}
					class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
				>
					<span class="material-symbols-outlined text-sm">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Modal Quick Viewer -->
{#if selectedDoc}
	<DmsSecureViewer
		bind:isOpen={isViewerOpen}
		filePath={selectedDoc.file_path || ''}
		docTitle={selectedDoc.title}
		docNumber={selectedDoc.doc_number || ''}
		userName="Staff ERP BCS"
	/>
{/if}
