<script lang="ts">
	import { enhance } from '$app/forms';
	import Pagination from '$lib/components/Pagination.svelte';
	import QRCode from 'qrcode';

	let { data } = $props();

	let activeTab = $state<'CATALOG' | 'RACKS'>('CATALOG');
	let searchQuery = $state('');
	let rackFilter = $state('All');
	let shelfFilter = $state('All');
	let deptFilter = $state('All');
	let yearFilter = $state('All');
	let digitalFilter = $state('All');
	let retentionFilter = $state('All');

	let isCreateArchiveOpen = $state(false);
	let isCreateRackOpen = $state(false);
	let selectedRackForForm = $state<number>(data.racks[0]?.id || 1);

	// Modals for Upload, Preview & Box QR
	let isUploadModalOpen = $state(false);
	let uploadTargetArchive = $state<any>(null);
	let isPreviewModalOpen = $state(false);
	let previewArchive = $state<any>(null);

	// Box QR Modal State
	let isQrBoxModalOpen = $state(false);
	let qrBoxArchive = $state<any>(null);
	let qrBoxDataUrl = $state('');
	let isGeneratingBoxQr = $state(false);
	let copiedBoxQrLink = $state(false);
	let boxQrModalTab = $state<'SCREEN' | 'LABEL'>('SCREEN');

	const availableShelvesForFilter = $derived(
		rackFilter === 'All'
			? data.shelves
			: data.shelves.filter((s: any) => String(s.rack_id) === String(rackFilter))
	);

	const availableShelvesForForm = $derived(
		data.shelves.filter((s: any) => Number(s.rack_id) === Number(selectedRackForForm))
	);

	const availableYears = $derived(
		[...new Set(data.archives.map((a: any) => a.document_year).filter(Boolean))].sort((a: any, b: any) => b - a)
	);

	function jumpToShelf(rackId: number, shelfId?: number) {
		rackFilter = String(rackId);
		shelfFilter = shelfId ? String(shelfId) : 'All';
		activeTab = 'CATALOG';
	}

	function isPdf(path: string | null) {
		return path?.toLowerCase().endsWith('.pdf');
	}

	function openUploadModal(archive: any) {
		uploadTargetArchive = archive;
		isUploadModalOpen = true;
	}

	function openPreviewModal(archive: any) {
		previewArchive = archive;
		isPreviewModalOpen = true;
	}

	async function openQrBoxModal(archive: any) {
		qrBoxArchive = archive;
		boxQrModalTab = 'SCREEN';
		isQrBoxModalOpen = true;
		isGeneratingBoxQr = true;
		copiedBoxQrLink = false;
		qrBoxDataUrl = '';
		try {
			const origin = typeof window !== 'undefined' ? window.location.origin : '';
			const scanUrl = `${origin}/scan/archive/${archive.id}`;
			qrBoxDataUrl = await QRCode.toDataURL(scanUrl, {
				width: 320,
				margin: 2,
				errorCorrectionLevel: 'H',
				color: { dark: '#0f172a', light: '#ffffff' }
			});
		} catch (err) {
			console.error('Failed to generate box QR:', err);
		} finally {
			isGeneratingBoxQr = false;
		}
	}

	function copyBoxScanUrl(id: number) {
		if (typeof window !== 'undefined') {
			const url = `${window.location.origin}/scan/archive/${id}`;
			navigator.clipboard.writeText(url);
			copiedBoxQrLink = true;
			setTimeout(() => (copiedBoxQrLink = false), 2000);
		}
	}

	function downloadBoxQr(no: string) {
		if (!qrBoxDataUrl) return;
		const a = document.createElement('a');
		a.href = qrBoxDataUrl;
		a.download = `QR_Box_${no}.png`;
		a.click();
	}

	const filteredArchives = $derived(
		data.archives.filter((a: any) => {
			const q = searchQuery.toLowerCase();
			const matchQ =
				!q ||
				a.document_name?.toLowerCase().includes(q) ||
				a.archive_number?.toLowerCase().includes(q) ||
				a.department?.toLowerCase().includes(q) ||
				String(a.document_year).includes(q);
			const matchRack = rackFilter === 'All' || String(a.rack_id) === String(rackFilter);
			const matchShelf = shelfFilter === 'All' || String(a.shelf_id) === String(shelfFilter);
			const matchDept = deptFilter === 'All' || a.department === deptFilter;
			const matchYear = yearFilter === 'All' || String(a.document_year) === yearFilter;
			const matchDigital = digitalFilter === 'All' || (digitalFilter === 'HAS_FILE' ? !!a.file_path : !a.file_path);
			const matchRet =
				retentionFilter === 'All' ||
				(retentionFilter === 'DUE' && a.is_due_destruction && a.status === 'aktif') ||
				(retentionFilter === 'ACTIVE' && !a.is_due_destruction && a.status === 'aktif');
			return matchQ && matchRack && matchShelf && matchDept && matchYear && matchDigital && matchRet;
		})
	);

	let currentPage = $state(1);
	const perPage = 15;
	const totalPages = $derived(Math.max(1, Math.ceil(filteredArchives.length / perPage)));
	const paginatedArchives = $derived(
		filteredArchives.slice((currentPage - 1) * perPage, currentPage * perPage)
	);

	$effect(() => {
		const _ = [searchQuery, rackFilter, shelfFilter, deptFilter, yearFilter, digitalFilter, retentionFilter];
		currentPage = 1;
	});
</script>

<svelte:head>
	<title>Document Archive | General Affair | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
		<div>
			<div class="flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1">
				<span class="material-symbols-outlined text-sm">inventory</span>
				<span>General Affair • Penyimpanan & Retensi Berkas Fisik</span>
			</div>
			<h1 class="text-3xl font-black text-on-surface tracking-tight">Document Archive (Gudang Arsip)</h1>
			<p class="text-xs text-on-surface-variant mt-1">
				Manajemen penempatan box dokumen fisik per Rak & Lantai, kontrol masa retensi simpan, dan jadwal pemusnahan berkas lintas departemen.
			</p>
		</div>

		<div class="flex items-center gap-2.5 self-start md:self-auto">
			<button
				onclick={() => (isCreateArchiveOpen = true)}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">add_box</span>
				<span>+ Registrasi Berkas Arsip</span>
			</button>
			<button
				onclick={() => (isCreateRackOpen = true)}
				class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-base text-teal-600">shelves</span>
				<span>+ Tambah Rak</span>
			</button>
		</div>
	</div>

	<!-- KPI Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Berkas Tersimpan</span>
			<div class="text-2xl font-black text-on-surface mt-1">
				{data.stats.totalDocs} <span class="text-sm font-normal text-on-surface-variant">bundel/box</span>
			</div>
			<p class="text-[11px] text-teal-600 font-semibold mt-1">
				{data.stats.activeDocs} berstatus aktif di gudang
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-amber-300 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/30 to-transparent">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Jatuh Tempo Pemusnahan</span>
				{#if data.stats.dueDestructionCount > 0}
					<span class="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping"></span>
				{/if}
			</div>
			<div class="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
				{data.stats.dueDestructionCount} <span class="text-sm font-normal text-on-surface-variant">berkas</span>
			</div>
			<p class="text-[11px] text-amber-700 font-medium mt-1">
				Melewati masa retensi simpan
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Kapasitas Rak & Lantai</span>
			<div class="text-2xl font-black text-cyan-600 mt-1">
				{data.stats.totalRacks} <span class="text-sm font-normal text-on-surface-variant">Rak ({data.stats.totalShelves} Lantai)</span>
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1">
				Struktur Rak 1 s/d Rak 10 (LT 1 - LT 5)
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Departemen Pemilik Arsip</span>
			<div class="text-2xl font-black text-indigo-600 mt-1">
				{data.departments.length} <span class="text-sm font-normal text-on-surface-variant">divisi/dept</span>
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1 truncate">
				Finance, Procurement, HRD, Transport, dll.
			</p>
		</div>
	</div>

	<!-- Tab Switcher -->
	<div class="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
		<button
			onclick={() => (activeTab = 'CATALOG')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeTab === 'CATALOG'
				? 'bg-teal-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">folder_Special</span>
			<span>Katalog Berkas Arsip ({filteredArchives.length})</span>
		</button>

		<button
			onclick={() => (activeTab = 'RACKS')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeTab === 'RACKS'
				? 'bg-teal-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">shelves</span>
			<span>Visualisasi Kapasitas Rak & Lantai ({data.racks.length} Rak)</span>
		</button>
	</div>

	<!-- TAB 1: KATALOG BERKAS ARSIP -->
	{#if activeTab === 'CATALOG'}
		<div class="flex flex-col lg:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low w-full lg:w-80 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
				<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari no arsip, nama dokumen, tahun..."
					class="bg-transparent text-xs text-on-surface border-0 outline-none w-full placeholder:text-on-surface-variant/50 focus:ring-0"
				/>
			</div>

			<div class="flex flex-wrap items-center gap-2 w-full lg:w-auto">
				<select
					bind:value={rackFilter}
					onchange={() => (shelfFilter = 'All')}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 text-xs text-on-surface font-medium cursor-pointer"
				>
					<option value="All">Semua Rak</option>
					{#each data.racks as r (r.id)}
						<option value={String(r.id)}>{r.rack_name} ({r.doc_count})</option>
					{/each}
				</select>

				<select
					bind:value={shelfFilter}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 text-xs text-on-surface font-medium cursor-pointer"
				>
					<option value="All">Semua Lantai</option>
					{#each availableShelvesForFilter as s (s.id)}
						<option value={String(s.id)}>{s.rack_name} - {s.shelf_name} ({s.doc_count})</option>
					{/each}
				</select>

				<select
					bind:value={deptFilter}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 text-xs text-on-surface font-medium cursor-pointer"
				>
					<option value="All">Semua Departemen</option>
					{#each data.departments as d}
						<option value={d}>{d}</option>
					{/each}
				</select>

				<select
					bind:value={yearFilter}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 text-xs text-on-surface font-medium cursor-pointer"
				>
					<option value="All">Semua Tahun</option>
					{#each availableYears as yr}
						<option value={String(yr)}>Tahun {yr}</option>
					{/each}
				</select>

				<select
					bind:value={digitalFilter}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 text-xs text-on-surface font-medium cursor-pointer"
				>
					<option value="All">Semua Status Digital</option>
					<option value="HAS_FILE">✓ Ada Salinan Digital</option>
					<option value="NO_FILE">⚠️ Belum Ada Digital</option>
				</select>

				<select
					bind:value={retentionFilter}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 text-xs text-on-surface font-medium cursor-pointer"
				>
					<option value="All">Semua Status Retensi</option>
					<option value="DUE">Jatuh Tempo Pemusnahan ({data.stats.dueDestructionCount})</option>
					<option value="ACTIVE">Masa Simpan Aktif</option>
				</select>
			</div>
		</div>

		<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3 px-4">No. Arsip</th>
							<th class="py-3 px-4">Lokasi Rak & Lantai</th>
							<th class="py-3 px-4">Departemen</th>
							<th class="py-3 px-4">Nama Dokumen / Bundel</th>
							<th class="py-3 px-4 text-center">Tahun</th>
							<th class="py-3 px-4 text-center">Retensi</th>
							<th class="py-3 px-4 text-center">Salinan Digital</th>
							<th class="py-3 px-4 text-center">Status</th>
							<th class="py-3 px-4 text-center">Aksi & Label</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each paginatedArchives as a (a.id)}
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-3 px-4 font-mono font-black text-on-surface whitespace-nowrap">
									<div class="flex items-center gap-1.5">
										<button
											onclick={() => openQrBoxModal(a)}
											title="Tampilkan QR Box di Layar / Cetak Label Box"
											class="p-1 rounded-md bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-600 transition-colors cursor-pointer"
										>
											<span class="material-symbols-outlined text-sm">qr_code_2</span>
										</button>
										<span>#{a.archive_number}</span>
									</div>
								</td>
								<td class="py-3 px-4 whitespace-nowrap">
									<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-bold text-[11px]">
										<span class="material-symbols-outlined text-[13px]">shelves</span>
										{a.rack_name} • {a.shelf_name}
									</span>
								</td>
								<td class="py-3 px-4 font-bold text-on-surface-variant">
									{a.department}
								</td>
								<td class="py-3 px-4 font-bold text-on-surface max-w-md">
									{a.document_name}
								</td>
								<td class="py-3 px-4 text-center font-mono font-bold text-on-surface">
									{a.document_year}
								</td>
								<td class="py-3 px-4 text-center font-mono text-on-surface-variant whitespace-nowrap">
									{a.retention_years} thn
									{#if a.destruction_date && a.is_due_destruction && a.status === 'aktif'}
										<div class="text-[9px] text-amber-600 font-bold">Jatuh Tempo</div>
									{/if}
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									{#if a.file_path}
										<div class="inline-flex items-center gap-1">
											<button
												onclick={() => openPreviewModal(a)}
												class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg {isPdf(a.file_path) ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200' : 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200'} font-bold text-[11px] cursor-pointer hover:opacity-90 transition-opacity"
												title="Lihat Pratinjau Dokumen Digital"
											>
												<span class="material-symbols-outlined text-[13px]">{isPdf(a.file_path) ? 'picture_as_pdf' : 'image'}</span>
												<span>Lihat</span>
											</button>
											<button
												onclick={() => openUploadModal(a)}
												class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-surface-container"
												title="Ganti File Digital"
											>
												<span class="material-symbols-outlined text-[14px]">sync</span>
											</button>
										</div>
									{:else}
										<button
											onclick={() => openUploadModal(a)}
											class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-medium text-[11px] border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer transition-colors"
										>
											<span class="material-symbols-outlined text-[13px] text-teal-600">upload</span>
											<span>+ Upload</span>
										</button>
									{/if}
								</td>
								<td class="py-3 px-4 text-center">
									<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase {a.status === 'aktif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-700'}">
										{a.status}
									</span>
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									<div class="flex items-center justify-center gap-1">
										<button
											onclick={() => openQrBoxModal(a)}
											title="QR Code & Label Box Gudang"
											class="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/60 transition-colors cursor-pointer"
										>
											<span class="material-symbols-outlined text-[16px]">qr_code_scanner</span>
										</button>
										{#if a.status === 'aktif' && a.is_due_destruction}
											<form method="POST" action="?/updateArchiveStatus" use:enhance class="inline">
												<input type="hidden" name="id" value={a.id} />
												<input type="hidden" name="status" value="dimusnahkan" />
												<button
													type="submit"
													title="Tandai Sudah Dimusnahkan"
													class="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10px] cursor-pointer"
												>
													Musnahkan
												</button>
											</form>
										{/if}
										<form
											method="POST"
											action="?/deleteArchive"
											use:enhance={() => {
												if (!confirm(`Hapus arsip #${a.archive_number} - ${a.document_name}?`)) return ({ cancel }: any) => cancel();
											}}
											class="inline"
										>
											<input type="hidden" name="id" value={a.id} />
											<button type="submit" class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer" title="Hapus">
												<span class="material-symbols-outlined text-[15px]">delete</span>
											</button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<Pagination
				currentPage={currentPage}
				totalPages={totalPages}
				totalItems={filteredArchives.length}
				perPage={perPage}
				itemLabel="berkas arsip"
				onPageChange={(p) => (currentPage = p)}
			/>
		</div>
	{/if}

	<!-- TAB 2: VISUALISASI KAPASITAS RAK & LANTAI -->
	{#if activeTab === 'RACKS'}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each data.racks as rack (rack.id)}
				{@const rackShelves = data.shelves.filter((s: any) => s.rack_id === rack.id)}
				<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs space-y-3">
					<div class="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
						<div class="flex items-center gap-2.5">
							<div class="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center font-black">
								<span class="material-symbols-outlined text-[20px]">shelves</span>
							</div>
							<div>
								<h3 class="font-black text-sm text-on-surface">{rack.rack_name}</h3>
								<p class="text-[10px] text-on-surface-variant">{rackShelves.length} Lantai Penyimpanan</p>
							</div>
						</div>
						<button
							onclick={() => jumpToShelf(rack.id)}
							class="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs cursor-pointer"
						>
							{rack.doc_count} Berkas →
						</button>
					</div>

					<div class="space-y-1.5">
						{#each rackShelves as sh (sh.id)}
							<button
								onclick={() => jumpToShelf(rack.id, sh.id)}
								class="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-xs cursor-pointer"
							>
								<span class="font-bold text-on-surface">{sh.shelf_name}</span>
								<span class="font-mono text-[11px] font-bold {sh.doc_count > 0 ? 'text-teal-600' : 'text-on-surface-variant/50'}">
									{sh.doc_count} bundel
								</span>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- MODAL: REGISTRASI BERKAS ARSIP BARU -->
{#if isCreateArchiveOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<h3 class="font-bold text-base text-on-surface">Registrasi Berkas Arsip Baru</h3>
				<button onclick={() => (isCreateArchiveOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/createArchive"
				enctype="multipart/form-data"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isCreateArchiveOpen = false;
					};
				}}
				class="p-6 space-y-3.5 text-xs"
			>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="arc_rack" class="block font-bold mb-1">Pilih Rak *</label>
						<select
							id="arc_rack"
							name="rack_id"
							bind:value={selectedRackForForm}
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20"
						>
							{#each data.racks as r (r.id)}
								<option value={r.id}>{r.rack_name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="arc_shelf" class="block font-bold mb-1">Pilih Lantai *</label>
						<select
							id="arc_shelf"
							name="shelf_id"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20"
						>
							{#each availableShelvesForForm as s (s.id)}
								<option value={s.id}>{s.shelf_name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="arc_no" class="block font-bold mb-1">Nomor Arsip / Box *</label>
						<input id="arc_no" type="text" name="archive_number" required placeholder="Misal: 051" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 font-mono" />
					</div>
					<div>
						<label for="arc_dept" class="block font-bold mb-1">Departemen Pemilik *</label>
						<input id="arc_dept" type="text" name="department" required value="FINANCE" placeholder="FINANCE / HRD / PROCUREMENT" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20" />
					</div>
				</div>

				<div>
					<label for="arc_name" class="block font-bold mb-1">Nama Dokumen / Uraian Bundel *</label>
					<input id="arc_name" type="text" name="document_name" required placeholder="Misal: BDV A/P SUPPLIER JAN-MAR 2025" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20" />
				</div>

				<div class="grid grid-cols-3 gap-3">
					<div>
						<label for="arc_yr" class="block font-bold mb-1">Tahun Dokumen *</label>
						<input id="arc_yr" type="number" name="document_year" required value="2025" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 font-mono" />
					</div>
					<div>
						<label for="arc_ret" class="block font-bold mb-1">Masa Simpan (Thn)</label>
						<input id="arc_ret" type="number" name="retention_years" value="10" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 font-mono" />
					</div>
					<div>
						<label for="arc_dest" class="block font-bold mb-1">Tgl Pemusnahan</label>
						<input id="arc_dest" type="date" name="destruction_date" class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20" />
					</div>
				</div>

				<!-- Lampirkan File Scan Digital (Opsional) -->
				<div class="pt-1">
					<label for="arc_file_new" class="block font-bold mb-1">
						Upload Salinan Scan Dokumen (PDF / Gambar) - Opsional
					</label>
					<input
						id="arc_file_new"
						type="file"
						name="file"
						accept=".pdf,image/png,image/jpeg,image/webp"
						class="w-full text-xs p-2 rounded-xl bg-surface-container-low border border-dashed border-slate-300 dark:border-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer"
					/>
					<p class="text-[10px] text-on-surface-variant mt-1">Maksimal 25 MB (Format: PDF, JPG, PNG, WEBP)</p>
				</div>

				<div class="flex justify-end gap-2 pt-3">
					<button type="button" onclick={() => (isCreateArchiveOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer">Batal</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer">Simpan Arsip</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: TAMBAH RAK BARU -->
{#if isCreateRackOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<h3 class="font-bold text-base text-on-surface">Tambah Rak Gudang Arsip</h3>
				<button onclick={() => (isCreateRackOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>
			<form
				method="POST"
				action="?/createRack"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isCreateRackOpen = false;
					};
				}}
				class="p-6 space-y-3.5 text-xs"
			>
				<div>
					<label for="rk_name" class="block font-bold mb-1">Nama Rak *</label>
					<input id="rk_name" type="text" name="rack_name" required placeholder="Misal: Rak 11" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20" />
				</div>
				<div>
					<label for="rk_cnt" class="block font-bold mb-1">Jumlah Lantai Otomatis (LT 1..N)</label>
					<input id="rk_cnt" type="number" min="1" max="10" name="shelf_count" value="5" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 font-mono" />
				</div>
				<div class="flex justify-end gap-2 pt-3">
					<button type="button" onclick={() => (isCreateRackOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer">Batal</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer">Buat Rak</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: UPLOAD SALINAN DIGITAL ARSIP -->
{#if isUploadModalOpen && uploadTargetArchive}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-teal-600">upload_file</span>
					<div>
						<h3 class="font-bold text-sm text-on-surface">Upload Salinan Digital Arsip</h3>
						<p class="text-[10px] text-on-surface-variant font-mono">#{uploadTargetArchive.archive_number} • {uploadTargetArchive.department}</p>
					</div>
				</div>
				<button onclick={() => (isUploadModalOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/uploadArchiveFile"
				enctype="multipart/form-data"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isUploadModalOpen = false;
					};
				}}
				class="p-6 space-y-4 text-xs"
			>
				<input type="hidden" name="archive_id" value={uploadTargetArchive.id} />

				<div class="p-3 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-700/60 space-y-1">
					<span class="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Nama Dokumen Fisik</span>
					<p class="font-black text-on-surface text-xs leading-snug">{uploadTargetArchive.document_name}</p>
					<p class="text-[10px] text-on-surface-variant">Tahun: {uploadTargetArchive.document_year} • {uploadTargetArchive.rack_name} - {uploadTargetArchive.shelf_name}</p>
				</div>

				{#if uploadTargetArchive.file_path}
					<div class="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2">
						<span class="material-symbols-outlined text-base">info</span>
						<span>Dokumen ini sudah memiliki file. Mengunggah file baru akan menimpa file lama.</span>
					</div>
				{/if}

				<div>
					<label for="upload_archive_input" class="block font-bold mb-1">Pilih Berkas Scan (PDF / Gambar) *</label>
					<input
						id="upload_archive_input"
						type="file"
						name="file"
						required
						accept=".pdf,image/png,image/jpeg,image/webp"
						class="w-full text-xs p-2.5 rounded-xl bg-surface-container-low border border-dashed border-slate-300 dark:border-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer"
					/>
					<p class="text-[10px] text-on-surface-variant mt-1.5">
						Format didukung: <strong>PDF, JPG, PNG, WEBP</strong> (Maksimal 25 MB).
					</p>
				</div>

				<div class="flex justify-end gap-2 pt-2">
					<button
						type="button"
						onclick={() => (isUploadModalOpen = false)}
						class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer text-on-surface hover:bg-surface-container"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
					>
						<span class="material-symbols-outlined text-sm">cloud_upload</span>
						<span>Unggah Berkas</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: PREVIEW DOKUMEN DIGITAL (PDF VIEWER / LIGHTBOX) -->
{#if isPreviewModalOpen && previewArchive?.file_path}
	{@const filePath = previewArchive.file_path}
	<div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col p-2 sm:p-4 animate-in fade-in duration-150">
		<div class="flex items-center justify-between bg-slate-900 text-white px-5 py-3 rounded-t-2xl">
			<div class="flex items-center gap-2.5 truncate pr-2">
				<span class="material-symbols-outlined text-teal-400 text-xl">{isPdf(filePath) ? 'picture_as_pdf' : 'image'}</span>
				<div class="truncate">
					<h4 class="font-bold text-xs truncate">#{previewArchive.archive_number} • {previewArchive.document_name}</h4>
					<p class="text-[10px] text-slate-400">{previewArchive.department} • {previewArchive.document_year} • {previewArchive.rack_name} - {previewArchive.shelf_name}</p>
				</div>
			</div>

			<div class="flex items-center gap-2 flex-shrink-0">
				<a
					href="/api/uploads/{filePath}"
					target="_blank"
					class="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
					title="Buka Tab Baru"
				>
					<span class="material-symbols-outlined text-lg">open_in_new</span>
				</a>

				<a
					href="/api/uploads/{filePath}"
					download
					class="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
					title="Unduh Berkas Asli"
				>
					<span class="material-symbols-outlined text-lg">download</span>
				</a>

				<form
					method="POST"
					action="?/deleteArchiveFile"
					use:enhance={() => {
						if (!confirm('Hapus salinan digital dokumen ini dari server?')) return ({ cancel }: any) => cancel();
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success') isPreviewModalOpen = false;
						};
					}}
					class="inline"
				>
					<input type="hidden" name="archive_id" value={previewArchive.id} />
					<button
						type="submit"
						class="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 transition-colors cursor-pointer"
						title="Hapus Salinan Digital Ini"
					>
						<span class="material-symbols-outlined text-lg">delete</span>
					</button>
				</form>

				<button
					onclick={() => (isPreviewModalOpen = false)}
					class="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
					title="Tutup Preview"
				>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>
		</div>

		<div class="flex-1 bg-slate-950 rounded-b-2xl overflow-hidden flex items-center justify-center p-2 relative">
			{#if isPdf(filePath)}
				<iframe
					src="/api/uploads/{filePath}#toolbar=1"
					title="PDF Document Viewer"
					class="w-full h-full rounded border-0 bg-white"
				></iframe>
			{:else}
				<img
					src="/api/uploads/{filePath}"
					alt="Scan Dokumen Arsip"
					class="max-w-full max-h-full object-contain rounded"
				/>
			{/if}
		</div>
	</div>
{/if}

<!-- MODAL: QR CODE & LABEL BOX GUDANG (LAYAR & CETAK FISIK) -->
{#if isQrBoxModalOpen && qrBoxArchive}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<!-- Header Modal -->
			<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-teal-600 text-xl">qr_code_2</span>
					<div>
						<h3 class="font-bold text-sm text-on-surface">QR Code & Label Box Gudang Arsip</h3>
						<p class="text-[10px] text-on-surface-variant font-mono">#{qrBoxArchive.archive_number} • {qrBoxArchive.rack_name} - {qrBoxArchive.shelf_name}</p>
					</div>
				</div>
				<button onclick={() => (isQrBoxModalOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer p-1 rounded-lg">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Tab Switcher -->
			<div class="flex items-center border-b border-slate-200/60 dark:border-slate-800/60 px-4 pt-2 gap-2 bg-surface-container-low">
				<button
					type="button"
					onclick={() => (boxQrModalTab = 'SCREEN')}
					class="pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer {boxQrModalTab === 'SCREEN'
						? 'border-teal-600 text-teal-600 dark:text-teal-400'
						: 'border-transparent text-on-surface-variant hover:text-on-surface'}"
				>
					<span class="material-symbols-outlined text-[17px]">screen_rotation</span>
					<span>Scan dari Monitor (Layar)</span>
				</button>
				<button
					type="button"
					onclick={() => (boxQrModalTab = 'LABEL')}
					class="pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer {boxQrModalTab === 'LABEL'
						? 'border-teal-600 text-teal-600 dark:text-teal-400'
						: 'border-transparent text-on-surface-variant hover:text-on-surface'}"
				>
					<span class="material-symbols-outlined text-[17px]">label</span>
					<span>Format Label Box / Ordner (Fisik)</span>
				</button>
			</div>

			<div class="p-6">
				{#if boxQrModalTab === 'SCREEN'}
					<!-- TAB 1: SCAN LANGSUNG DARI LAYAR MONITOR -->
					<div class="flex flex-col items-center text-center space-y-4">
						<div class="p-3 bg-white rounded-2xl shadow-inner border border-slate-200 dark:border-slate-700 inline-block">
							{#if isGeneratingBoxQr || !qrBoxDataUrl}
								<div class="w-64 h-64 flex items-center justify-center text-slate-400">
									<span class="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
								</div>
							{:else}
								<img
									src={qrBoxDataUrl}
									alt="QR Code Box Arsip"
									class="w-64 h-64 object-contain rounded-xl"
								/>
							{/if}
						</div>

						<div>
							<span class="inline-block px-3 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-mono text-xs font-black border border-teal-200 dark:border-teal-800">
								Arsip #{qrBoxArchive.archive_number}
							</span>
							<h4 class="font-bold text-sm text-on-surface mt-1">{qrBoxArchive.document_name}</h4>
							<p class="text-xs text-on-surface-variant mt-0.5">
								Departemen: <span class="font-semibold text-on-surface">{qrBoxArchive.department}</span>
								• Posisi: <span class="font-semibold text-teal-600 dark:text-teal-400">{qrBoxArchive.rack_name} ({qrBoxArchive.shelf_name})</span>
							</p>
							<p class="text-[11px] text-teal-600 dark:text-teal-400 font-medium mt-2 flex items-center justify-center gap-1">
								<span class="material-symbols-outlined text-sm">photo_camera</span>
								Arahkan kamera smartphone ke QR code di monitor untuk melihat isi bundel arsip ini.
							</p>
						</div>

						<!-- Quick Actions -->
						<div class="grid grid-cols-3 gap-2 w-full pt-2">
							<a
								href="/scan/archive/{qrBoxArchive.id}"
								target="_blank"
								class="py-2.5 px-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs flex flex-col items-center justify-center gap-1 transition-colors"
								title="Buka Halaman Scan di Tab Baru"
							>
								<span class="material-symbols-outlined text-lg text-teal-600">open_in_new</span>
								<span>Buka Halaman</span>
							</a>

							<button
								type="button"
								onclick={() => copyBoxScanUrl(qrBoxArchive.id)}
								class="py-2.5 px-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
								title="Salin Tautan Scan ke Clipboard"
							>
								<span class="material-symbols-outlined text-lg {copiedBoxQrLink ? 'text-emerald-500' : 'text-indigo-600'}">
									{copiedBoxQrLink ? 'check' : 'content_copy'}
								</span>
								<span>{copiedBoxQrLink ? 'Tersalin!' : 'Salin Link'}</span>
							</button>

							<button
								type="button"
								onclick={() => downloadBoxQr(qrBoxArchive.archive_number)}
								class="py-2.5 px-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
								title="Unduh Gambar QR Format PNG"
							>
								<span class="material-symbols-outlined text-lg text-cyan-600">download</span>
								<span>Unduh PNG</span>
							</button>
						</div>
					</div>
				{:else}
					<!-- TAB 2: FORMAT CETAK LABEL BOX FISIK (10 x 6 cm) -->
					<div class="flex flex-col items-center space-y-4">
						<div
							id="printable-box-label"
							class="w-full max-w-md p-4 rounded-xl border-2 border-slate-900 bg-white text-slate-900 shadow-md font-sans"
						>
							<!-- Header Kop Label Box -->
							<div class="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2.5">
								<div class="flex items-center gap-2">
									<div class="w-6 h-6 rounded bg-[#57344f] text-white font-black text-[10px] flex items-center justify-center">
										BCS
									</div>
									<div>
										<h4 class="font-black text-xs tracking-wider uppercase text-[#57344f] leading-none">
											PT BANGUN CAKRAWALA SARI
										</h4>
										<p class="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
											Label Box / Ordner Gudang Arsip
										</p>
									</div>
								</div>
								<span class="text-xs font-mono font-black bg-teal-50 px-2.5 py-1 rounded border border-teal-300 text-teal-800">
									#{qrBoxArchive.archive_number}
								</span>
							</div>

							<!-- Body: QR Code + Detail Lokasi & Dokumen -->
							<div class="flex items-center gap-3">
								<div class="p-1 border border-slate-300 rounded bg-white flex-shrink-0">
									{#if qrBoxDataUrl}
										<img src={qrBoxDataUrl} alt="QR Box" class="w-20 h-20" />
									{:else}
										<div class="w-20 h-20 bg-slate-100 flex items-center justify-center text-[10px]">Loading</div>
									{/if}
								</div>

								<div class="space-y-1 text-[10px] leading-tight flex-1">
									<div class="p-1.5 rounded bg-slate-100 border border-slate-300">
										<p class="text-[9px] font-bold text-slate-500 uppercase">Posisi Penyimpanan Gudang:</p>
										<p class="font-black text-xs text-slate-900">{qrBoxArchive.rack_name} • {qrBoxArchive.shelf_name}</p>
									</div>
									<p class="font-black text-xs text-slate-950 line-clamp-2 mt-1">{qrBoxArchive.document_name}</p>
									<p class="text-slate-600 font-bold">Dept: {qrBoxArchive.department} • Tahun {qrBoxArchive.document_year}</p>
									<p class="text-[9px] text-slate-500">Masa Retensi: {qrBoxArchive.retention_years} Thn {qrBoxArchive.destruction_date ? `(s/d ${qrBoxArchive.destruction_date})` : ''}</p>
								</div>
							</div>

							<!-- Footer Stiker -->
							<div class="mt-2.5 pt-1.5 border-t border-dashed border-slate-400 flex items-center justify-between text-[7px] text-slate-500 font-bold uppercase tracking-wider">
								<span>Gudang Arsip Pusat GA</span>
								<span>Scan QR untuk unduh salinan digital</span>
							</div>
						</div>

						<p class="text-[11px] text-on-surface-variant text-center">
							Format label stiker ordner / box fisik (Ukuran 10 x 6 cm).
						</p>

						<button
							type="button"
							onclick={() => window.print()}
							class="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
						>
							<span class="material-symbols-outlined text-base">print</span>
							<span>Cetak Label Box Ini Sekarang</span>
						</button>
					</div>
				{/if}

				<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-end">
					<button
						type="button"
						onclick={() => (isQrBoxModalOpen = false)}
						class="py-2 px-4 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
					>
						Tutup
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@media print {
		:global(body *) {
			visibility: hidden !important;
		}
		:global(#printable-box-label),
		:global(#printable-box-label *) {
			visibility: visible !important;
		}
		:global(#printable-box-label) {
			position: fixed !important;
			left: 50% !important;
			top: 50% !important;
			transform: translate(-50%, -50%) !important;
			width: 100mm !important;
			max-width: 100mm !important;
			border: 2px solid #000 !important;
			box-shadow: none !important;
		}
	}
</style>
