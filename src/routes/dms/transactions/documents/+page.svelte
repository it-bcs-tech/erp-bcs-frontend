<script lang="ts">
	import { goto } from '$app/navigation';
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

	<!-- Segmented Entity Category Selector (Armada, Driver, Customer, Corporate) -->
	<div class="inline-flex p-1.5 rounded-2xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 gap-1 overflow-x-auto shadow-xs max-w-full">
		<button
			type="button"
			onclick={() => setEntityFilter('')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {entityType === ''
				? 'bg-indigo-600 text-white shadow-xs'
				: 'bg-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-sm">grid_view</span>
			<span>Semua Kategori</span>
		</button>

		<button
			type="button"
			onclick={() => setEntityFilter('FLEET')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {entityType === 'FLEET'
				? 'bg-sky-600 text-white shadow-xs'
				: 'bg-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-sm">local_shipping</span>
			<span>Dokumen Armada (FMS)</span>
		</button>

		<button
			type="button"
			onclick={() => setEntityFilter('DRIVER')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {entityType === 'DRIVER'
				? 'bg-indigo-600 text-white shadow-xs'
				: 'bg-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-sm">airline_seat_recline_normal</span>
			<span>Dokumen Driver (HRIS)</span>
		</button>

		<button
			type="button"
			onclick={() => setEntityFilter('CUSTOMER')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {entityType === 'CUSTOMER'
				? 'bg-teal-600 text-white shadow-xs'
				: 'bg-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-sm">handshake</span>
			<span>Mitra / Legal Customer</span>
		</button>

		<button
			type="button"
			onclick={() => setEntityFilter('CORPORATE')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {entityType === 'CORPORATE'
				? 'bg-violet-600 text-white shadow-xs'
				: 'bg-transparent text-on-surface-variant hover:text-on-surface'}"
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
				onchange={handleTypeChange}
				value={type}
				class="bg-surface-container-lowest dark:bg-surface-container border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
			>
				<option value="">Semua Tipe Dokumen</option>
				{#each data.docTypes as dt}
					<option value={dt.code}>{dt.name}</option>
				{/each}
			</select>

			<button
				type="submit"
				class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
			>
				<span class="material-symbols-outlined text-sm">filter_alt</span>
				<span>Filter</span>
			</button>
		</form>

		<!-- Expiry Gate Quick Filters -->
		<div class="px-4 py-2.5 bg-surface-container-lowest dark:bg-surface-container-low/50 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 overflow-x-auto text-xs">
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

		<!-- Main Document Table -->
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[1000px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-4">Dokumen & QR ID</th>
						<th class="py-3.5 px-4">Entitas Terkait</th>
						<th class="py-3.5 px-4">Tipe & Versi</th>
						<th class="py-3.5 px-4">Masa Berlaku</th>
						<th class="py-3.5 px-4">Status & Sisa Hari</th>
						<th class="py-3.5 px-4">Lokasi Fisik</th>
						<th class="py-3.5 px-4 text-right">Aksi</th>
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
							{@const sInfo = getStatusInfo(doc.computedStatus, doc.daysRemaining, doc.gateLevel)}
							{@const eInfo = getEntityTypeInfo(doc.entity_type)}
							{@const pInfo = getPhysicalStatusInfo(doc.physical_status)}

							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<!-- Document Title & QR -->
								<td class="py-3.5 px-4">
									<div class="flex items-start gap-2.5">
										<div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
											<span class="material-symbols-outlined text-base">description</span>
										</div>
										<div>
											<a href="/dms/transactions/documents/{doc.id}" class="font-bold text-on-surface hover:text-indigo-600 transition-colors text-xs line-clamp-1">
												{doc.title}
											</a>
											<div class="flex items-center gap-1.5 mt-0.5">
												<span class="text-[10px] font-mono text-on-surface-variant">No: {doc.doc_number || '-'}</span>
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
								<td class="py-3.5 px-4">
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-sm {eInfo.color}">{eInfo.icon}</span>
										<div class="text-xs">
											{#if doc.entity_type === 'FLEET'}
												<p class="font-bold text-on-surface">{doc.unit_nomor || 'Armada'}</p>
												<p class="text-[10px] text-on-surface-variant">{doc.unit_lambung || 'Fleet Unit'}</p>
											{:else if doc.entity_type === 'DRIVER'}
												<p class="font-bold text-on-surface">{doc.driver_name || 'Driver'}</p>
												<p class="text-[10px] text-on-surface-variant">NIK: {doc.driver_payroll || '-'}</p>
											{:else if doc.entity_type === 'CUSTOMER'}
												<p class="font-bold text-on-surface">{doc.customer_name || 'Mitra'}</p>
												<p class="text-[10px] text-on-surface-variant">Customer SPK</p>
											{:else}
												<p class="font-bold text-on-surface">PT BCS Logistics</p>
												<p class="text-[10px] text-on-surface-variant">Korporat / Legal</p>
											{/if}
										</div>
									</div>
								</td>

								<!-- Doc Type & Version -->
								<td class="py-3.5 px-4">
									<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-on-surface-variant">
										{doc.doc_type_name || 'Dokumen'}
									</span>
									<span class="ml-1 text-[10px] font-mono font-bold text-indigo-600">v{doc.current_version || 1}</span>
								</td>

								<!-- Expiry Date -->
								<td class="py-3.5 px-4 font-mono text-xs">
									{doc.expiry_date ? formatDateId(doc.expiry_date) : 'Permanen'}
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

		<!-- Pagination Footer -->
		<div class="px-4 py-3 border-t border-slate-200/60 dark:border-slate-800/60 bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
			<div>
				Menampilkan <span class="font-bold text-on-surface">{startItem}</span> - <span class="font-bold text-on-surface">{endItem}</span> dari <span class="font-bold text-on-surface">{data.pagination.total}</span> dokumen
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
