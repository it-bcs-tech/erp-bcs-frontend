<script lang="ts">
	let { data } = $props();

	let copied = $state(false);
	let isViewerOpen = $state(false);

	function copyLink() {
		if (typeof window !== 'undefined') {
			navigator.clipboard.writeText(window.location.href);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}

	function isPdf(path: string | null) {
		return path?.toLowerCase().endsWith('.pdf');
	}
</script>

<svelte:head>
	<title>{data.archive ? `Arsip #${data.archive.archive_number} - ${data.archive.document_name}` : 'Arsip Tidak Ditemukan'} | Portal Scan Gudang Arsip BCS</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
</svelte:head>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased pb-16">
	<!-- Top App Bar -->
	<header class="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3">
		<div class="max-w-xl mx-auto flex items-center justify-between">
			<div class="flex items-center gap-2.5">
				<div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs tracking-wider">
					GA
				</div>
				<div>
					<h1 class="text-xs font-black tracking-tight uppercase text-slate-900 dark:text-white leading-tight">
						PT Buana Centra Swakarsa
					</h1>
					<p class="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">
						Gudang Arsip & Dokumen Fisik
					</p>
				</div>
			</div>

			<div class="flex items-center gap-1.5">
				<button
					onclick={copyLink}
					type="button"
					class="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
					title="Salin Tautan Halaman"
				>
					<span class="material-symbols-outlined text-lg">{copied ? 'done' : 'share'}</span>
				</button>
				<a
					href="/login"
					class="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
				>
					Login ERP
				</a>
			</div>
		</div>
	</header>

	<main class="max-w-xl mx-auto px-4 pt-5 space-y-4">
		{#if !data.archive}
			<!-- NOT FOUND STATE -->
			<div class="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mt-8 space-y-4">
				<div class="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 mx-auto flex items-center justify-center">
					<span class="material-symbols-outlined text-3xl">inventory_2</span>
				</div>
				<div>
					<h2 class="text-lg font-black text-slate-900 dark:text-white">Berkas Arsip Tidak Ditemukan</h2>
					<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
						Berkas dengan ID #{data.id} tidak terdaftar di sistem gudang arsip General Affair ERP BCS.
					</p>
				</div>
				<div class="pt-3">
					<a
						href="https://wa.me/{data.helpdeskPhone}?text={encodeURIComponent(`Halo GA, saya scan QR label arsip ID ${data.id} namun berkas tidak ditemukan.`)}"
						target="_blank"
						class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
					>
						<span class="material-symbols-outlined text-sm">support_agent</span>
						<span>Hubungi Petugas Gudang Arsip</span>
					</a>
				</div>
			</div>
		{:else}
			{@const a = data.archive}

			<!-- ARCHIVE MAIN CARD -->
			<div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden">
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1">
						<div class="flex flex-wrap items-center gap-2 mb-2">
							<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800">
								<span class="material-symbols-outlined text-[13px]">domain</span>
								{a.department}
							</span>
							<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] border {a.status === 'aktif' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' : 'bg-slate-100 text-slate-700 border-slate-300'}">
								<span class="material-symbols-outlined text-[13px]">{a.status === 'aktif' ? 'check_circle' : 'inventory'}</span>
								Status: {a.status.toUpperCase()}
							</span>
						</div>
						<h2 class="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
							{a.document_name}
						</h2>
						<p class="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
							Tahun Terbit Dokumen: <span class="font-mono text-slate-800 dark:text-slate-200">{a.document_year}</span>
						</p>
					</div>

					<div class="flex-shrink-0 text-right">
						<span class="inline-block px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 font-mono text-sm font-black text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
							#{a.archive_number}
						</span>
					</div>
				</div>
			</div>

			<!-- PHYSICAL LOCATION CARD -->
			<div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
				<h3 class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
					<span class="material-symbols-outlined text-[15px] text-teal-600">shelves</span>
					Penempatan Fisik Gudang Arsip
				</h3>

				<div class="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800/70 flex items-center justify-between">
					<div>
						<span class="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-widest block">Lokasi Rak & Lantai</span>
						<span class="text-lg font-black text-slate-900 dark:text-white">
							{a.rack_name || 'Rak Gudang'} <span class="text-teal-600 font-bold">•</span> {a.shelf_name || 'Lantai 1'}
						</span>
					</div>
					<div class="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
						<span class="material-symbols-outlined text-2xl">folder</span>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3 text-xs pt-1">
					<div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
						<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Masa Retensi Simpan</span>
						<span class="font-bold text-slate-900 dark:text-white text-sm block">{a.retention_years} Tahun</span>
						<span class="text-[10px] text-slate-400">Sejak tahun {a.document_year}</span>
					</div>

					<div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
						<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Jadwal Pemusnahan</span>
						{#if a.destruction_date}
							<span class="font-bold text-sm block {a.is_due_destruction ? 'text-amber-600' : 'text-slate-900 dark:text-white'}">
								{a.destruction_date}
							</span>
							{#if a.is_due_destruction}
								<span class="text-[10px] text-amber-600 font-bold block mt-0.5">⚠️ Jatuh Tempo</span>
							{:else}
								<span class="text-[10px] text-emerald-600 font-bold block mt-0.5">✓ Masih Aktif</span>
							{/if}
						{:else}
							<span class="font-bold text-slate-500 text-sm block">-</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- DIGITAL DOCUMENT FILE CARD -->
			<div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
				<h3 class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
					<span class="material-symbols-outlined text-[15px] text-teal-600">file_present</span>
					Salinan Digital Dokumen
				</h3>

				{#if a.file_path}
					<div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-xl {isPdf(a.file_path) ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400' : 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400'} flex items-center justify-center flex-shrink-0">
								<span class="material-symbols-outlined text-2xl">{isPdf(a.file_path) ? 'picture_as_pdf' : 'image'}</span>
							</div>
							<div class="truncate">
								<span class="font-bold text-xs text-slate-900 dark:text-white block truncate">{a.file_path.split('/').pop()}</span>
								<span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
									<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
									Tersimpan di Cloud Server ERP
								</span>
							</div>
						</div>

						<div class="flex items-center gap-2 flex-shrink-0">
							<button
								type="button"
								onclick={() => (isViewerOpen = true)}
								class="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
							>
								<span class="material-symbols-outlined text-sm">visibility</span>
								<span>Lihat</span>
							</button>
							<a
								href="/api/uploads/{a.file_path}"
								download
								class="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1 transition-colors"
								title="Unduh Berkas Asli"
							>
								<span class="material-symbols-outlined text-sm">download</span>
							</a>
						</div>
					</div>
				{:else}
					<div class="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 text-center py-5 space-y-1">
						<span class="material-symbols-outlined text-amber-600 text-2xl">upload_file</span>
						<p class="text-xs font-bold text-amber-900 dark:text-amber-300">Belum Ada Salinan Digital</p>
						<p class="text-[11px] text-amber-700/80 dark:text-amber-400/80 max-w-xs mx-auto">
							Scan dokumen fisik ini belum diunggah ke ERP. Silakan unggah melalui portal admin GA.
						</p>
					</div>
				{/if}
			</div>

			<!-- SIBLING DOCUMENTS IN SAME SHELF -->
			{#if data.siblings && data.siblings.length > 0}
				<div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
					<div class="flex items-center justify-between">
						<h3 class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
							<span class="material-symbols-outlined text-[15px] text-indigo-600">inventory</span>
							Dokumen Lain di {a.shelf_name} ({data.siblings.length})
						</h3>
					</div>

					<div class="divide-y divide-slate-100 dark:divide-slate-800">
						{#each data.siblings as s (s.id)}
							<a
								href="/scan/archive/{s.id}"
								class="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-xl transition-colors group"
							>
								<div class="truncate">
									<div class="flex items-center gap-1.5">
										<span class="font-mono text-[11px] font-black text-teal-600">#{s.archive_number}</span>
										<span class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 truncate">{s.document_name}</span>
									</div>
									<span class="text-[10px] text-slate-400 font-medium">{s.department} • {s.document_year}</span>
								</div>

								<div class="flex items-center gap-1.5 flex-shrink-0">
									{#if s.file_path}
										<span class="w-2 h-2 rounded-full bg-emerald-500" title="Ada File Digital"></span>
									{/if}
									<span class="material-symbols-outlined text-slate-400 text-base">chevron_right</span>
								</div>
							</a>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</main>
</div>

<!-- MODAL VIEWER: PREVIEW PDF / GAMBAR -->
{#if isViewerOpen && data.archive?.file_path}
	{@const filePath = data.archive.file_path}
	<div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col p-2 sm:p-4 animate-in fade-in duration-150">
		<div class="flex items-center justify-between bg-slate-900 text-white px-4 py-3 rounded-t-2xl">
			<div class="flex items-center gap-2 truncate pr-2">
				<span class="material-symbols-outlined text-teal-400 text-xl">{isPdf(filePath) ? 'picture_as_pdf' : 'image'}</span>
				<span class="font-bold text-xs truncate">#{data.archive.archive_number} • {data.archive.document_name}</span>
			</div>
			<div class="flex items-center gap-2 flex-shrink-0">
				<a
					href="/api/uploads/{filePath}"
					download
					class="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
					title="Unduh"
				>
					<span class="material-symbols-outlined text-lg">download</span>
				</a>
				<button
					onclick={() => (isViewerOpen = false)}
					class="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
					title="Tutup"
				>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>
		</div>

		<div class="flex-1 bg-slate-950 rounded-b-2xl overflow-hidden flex items-center justify-center p-2 relative">
			{#if isPdf(filePath)}
				<iframe
					src="/api/uploads/{filePath}#toolbar=1"
					title="PDF Preview"
					class="w-full h-full rounded border-0"
				></iframe>
			{:else}
				<img
					src="/api/uploads/{filePath}"
					alt="Scan Arsip"
					class="max-w-full max-h-full object-contain rounded"
				/>
			{/if}
		</div>
	</div>
{/if}
