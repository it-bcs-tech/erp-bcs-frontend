<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { formatDateId, getStatusInfo, getPhysicalStatusInfo, getEntityTypeInfo } from '$lib/utils/dms';
	import DmsSecureViewer from '$lib/components/DmsSecureViewer.svelte';

	let { data } = $props();

	let q = $derived($page.url.searchParams.get('q') || '');
	let entityType = $derived($page.url.searchParams.get('entity_type') || '');
	let type = $derived($page.url.searchParams.get('type') || '');
	let gate = $derived($page.url.searchParams.get('gate') || '');

	// Quick Preview modal
	let isViewerOpen = $state(false);
	let selectedDoc = $state<any>(null);

	function openViewer(doc: any) {
		selectedDoc = doc;
		isViewerOpen = true;
	}

	function handleFilterChange(e: Event) {
		const form = (e.target as HTMLElement).closest('form');
		if (form) form.submit();
	}

	function setEntityFilter(newType: string) {
		const newUrl = new URL($page.url);
		if (newType) {
			newUrl.searchParams.set('entity_type', newType);
		} else {
			newUrl.searchParams.delete('entity_type');
		}
		newUrl.searchParams.set('page', '1');
		window.location.href = newUrl.search + newUrl.hash;
	}

	function setGateFilter(newGate: string) {
		const newUrl = new URL($page.url);
		if (newGate) {
			newUrl.searchParams.set('gate', newGate);
		} else {
			newUrl.searchParams.delete('gate');
		}
		newUrl.searchParams.set('page', '1');
		window.location.href = newUrl.search + newUrl.hash;
	}

	function getPageUrl(pageNum: number) {
		const newUrl = new URL($page.url);
		newUrl.searchParams.set('page', pageNum.toString());
		return newUrl.search + newUrl.hash;
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
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
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

	<!-- Entity Filter Tabs (Segmented Pills) -->
	<div class="flex flex-wrap items-center gap-2">
		<button
			type="button"
			onclick={() => setEntityFilter('')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 {entityType === ''
				? 'bg-indigo-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-slate-200/80 dark:border-slate-800'}"
		>
			<span class="material-symbols-outlined text-sm">grid_view</span>
			<span>Semua Kategori</span>
		</button>

		<button
			type="button"
			onclick={() => setEntityFilter('FLEET')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 {entityType === 'FLEET'
				? 'bg-sky-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-slate-200/80 dark:border-slate-800'}"
		>
			<span class="material-symbols-outlined text-sm">local_shipping</span>
			<span>Dokumen Armada (FMS)</span>
		</button>

		<button
			type="button"
			onclick={() => setEntityFilter('DRIVER')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 {entityType === 'DRIVER'
				? 'bg-indigo-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-slate-200/80 dark:border-slate-800'}"
		>
			<span class="material-symbols-outlined text-sm">airline_seat_recline_normal</span>
			<span>Dokumen Driver (HRIS)</span>
		</button>

		<button
			type="button"
			onclick={() => setEntityFilter('CUSTOMER')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 {entityType === 'CUSTOMER'
				? 'bg-teal-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-slate-200/80 dark:border-slate-800'}"
		>
			<span class="material-symbols-outlined text-sm">handshake</span>
			<span>Mitra / Legal Customer</span>
		</button>

		<button
			type="button"
			onclick={() => setEntityFilter('CORPORATE')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 {entityType === 'CORPORATE'
				? 'bg-violet-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-slate-200/80 dark:border-slate-800'}"
		>
			<span class="material-symbols-outlined text-sm">corporate_fare</span>
			<span>Korporat & ISO</span>
		</button>
	</div>

	<!-- Table Container with Filter Header -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<!-- Search & Filters Bar -->
		<form method="GET" data-sveltekit-keepfocus class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row gap-3">
			<input type="hidden" name="entity_type" value={entityType} />
			<input type="hidden" name="limit" value={data.pagination.limit} />

			<div class="relative flex-1">
				<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
				<input
					type="text"
					name="q"
					value={q}
					placeholder="Cari nomor dokumen, judul, unit truk, driver, atau QR ID..."
					class="w-full bg-surface-container-lowest dark:bg-surface-container border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
				/>
			</div>

			<select
				name="type"
				onchange={handleFilterChange}
				class="bg-surface-container-lowest dark:bg-surface-container border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
			>
				<option value="" selected={type === ''}>Semua Tipe Dokumen</option>
				{#each data.docTypes as dt}
					<option value={dt.code} selected={type === dt.code}>{dt.name}</option>
				{/each}
			</select>

			<select
				name="gate"
				onchange={handleFilterChange}
				class="bg-surface-container-lowest dark:bg-surface-container border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
			>
				<option value="" selected={gate === ''}>Semua Masa Berlaku</option>
				<option value="URGENT_7" selected={gate === 'URGENT_7'}>🔴 H-7 (Urgent Jatuh Tempo)</option>
				<option value="CRITICAL_30" selected={gate === 'CRITICAL_30'}>🟠 H-30 (Kritis)</option>
				<option value="WARNING_60" selected={gate === 'WARNING_60'}>🟡 H-60 (Peringatan Awal)</option>
				<option value="EXPIRED" selected={gate === 'EXPIRED'}>⛔ Sudah Expired (Kadaluarsa)</option>
			</select>
		</form>

		<!-- Data Table -->
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-xs border-collapse">
				<thead>
					<tr class="border-b border-slate-200/60 dark:border-slate-800/60 bg-surface-container-low font-bold text-on-surface-variant uppercase tracking-wider">
						<th class="py-3.5 px-4">Dokumen & Nomor</th>
						<th class="py-3.5 px-4">Tipe / Kategori</th>
						<th class="py-3.5 px-4">Entitas Terkait</th>
						<th class="py-3.5 px-4">Masa Berlaku (Expiry)</th>
						<th class="py-3.5 px-4">Status & Sisa Hari</th>
						<th class="py-3.5 px-4">Lokasi Fisik</th>
						<th class="py-3.5 px-4 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800/50 font-medium">
					{#if data.documents.length === 0}
						<tr>
							<td colspan="7" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">folder_off</span>
								<p class="text-sm font-semibold">Tidak ada dokumen yang ditemukan.</p>
								<p class="text-xs text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau filter kategori di atas.</p>
							</td>
						</tr>
					{:else}
						{#each data.documents as doc}
							{@const sInfo = getStatusInfo(doc.status, doc.gate_level, doc.days_remaining)}
							{@const pInfo = getPhysicalStatusInfo(doc.physical_status)}
							{@const eInfo = getEntityTypeInfo(doc.entity_type)}
							<tr class="hover:bg-surface-container-high/40 transition-colors group">
								<!-- Doc Title & Number -->
								<td class="py-3.5 px-4">
									<div class="flex items-start gap-2.5">
										<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-lg mt-0.5">description</span>
										<div>
											<a
												href="/dms/transactions/documents/{doc.id}"
												class="font-black text-on-surface hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1"
											>
												{doc.title}
											</a>
											<div class="flex items-center gap-2 mt-0.5 text-[11px] text-on-surface-variant">
												<span class="font-mono font-bold text-slate-600 dark:text-slate-400">{doc.doc_number || 'Tanpa No'}</span>
												<span>&bull;</span>
												<span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">v{doc.current_version || 1}</span>
											</div>
										</div>
									</div>
								</td>

								<!-- Doc Type -->
								<td class="py-3.5 px-4">
									<span class="font-bold text-on-surface">{doc.type_name || '-'}</span>
								</td>

								<!-- Linked Entity -->
								<td class="py-3.5 px-4">
									<div class="flex items-center gap-1.5">
										<span class="material-symbols-outlined text-sm {eInfo.color.split(' ')[0]}">{eInfo.icon}</span>
										<span class="font-bold text-on-surface">
											{#if doc.entity_type === 'FLEET'}
												{doc.unit_number ? `${doc.unit_number}` : 'Armada'}
											{:else if doc.entity_type === 'DRIVER'}
												{doc.driver_name || 'Driver'}
											{:else if doc.entity_type === 'CUSTOMER'}
												{doc.partner_name || 'Mitra'}
											{:else}
												Korporat
											{/if}
										</span>
									</div>
								</td>

								<!-- Issue & Expiry Dates -->
								<td class="py-3.5 px-4">
									<p class="font-bold text-on-surface">{formatDateId(doc.expiry_date)}</p>
									<p class="text-[11px] text-on-surface-variant">Terbit: {formatDateId(doc.issue_date)}</p>
								</td>

								<!-- Status Badge & Remaining Days -->
								<td class="py-3.5 px-4">
									<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black border inline-flex items-center gap-1 {sInfo.badgeClass}">
										<span class="material-symbols-outlined text-xs">{sInfo.icon}</span>
										<span>{sInfo.label}</span>
									</span>
								</td>

								<!-- Physical Location -->
								<td class="py-3.5 px-4">
									<div class="flex items-center gap-1">
										<span class="material-symbols-outlined text-xs text-slate-400">inventory_2</span>
										<span class="text-on-surface-variant font-medium text-[11px]">
											{doc.filing_location_name ? `${doc.filing_location_code || ''} ${doc.filing_location_name}` : '-'}
										</span>
									</div>
								</td>

								<!-- Actions -->
								<td class="py-3.5 px-4 text-right">
									<div class="flex items-center justify-end gap-1.5">
										{#if doc.file_path}
											<button
												type="button"
												onclick={() => openViewer(doc)}
												title="Pratinjau Watermark"
												class="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors"
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

		<!-- Pagination Footer -->
		<div class="px-4 py-3 border-t border-slate-200/60 dark:border-slate-800/60 bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
			<div>
				Menampilkan <span class="font-bold text-on-surface">{startItem}</span> - <span class="font-bold text-on-surface">{endItem}</span> dari <span class="font-bold text-on-surface">{data.pagination.total}</span> dokumen
			</div>

			<div class="flex items-center gap-1">
				<a
					href={currentPage > 1 ? getPageUrl(currentPage - 1) : '#'}
					class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-surface-container-high transition-colors {currentPage <= 1 ? 'opacity-40 pointer-events-none' : ''}"
				>
					<span class="material-symbols-outlined text-sm">chevron_left</span>
				</a>

				{#each pageNumbers as pNum}
					<a
						href={getPageUrl(pNum)}
						class="w-7 h-7 flex items-center justify-center rounded-lg font-bold transition-colors {pNum === currentPage
							? 'bg-indigo-600 text-white'
							: 'border border-slate-200 dark:border-slate-800 hover:bg-surface-container-high text-on-surface'}"
					>
						{pNum}
					</a>
				{/each}

				<a
					href={currentPage < totalPages ? getPageUrl(currentPage + 1) : '#'}
					class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-surface-container-high transition-colors {currentPage >= totalPages ? 'opacity-40 pointer-events-none' : ''}"
				>
					<span class="material-symbols-outlined text-sm">chevron_right</span>
				</a>
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
