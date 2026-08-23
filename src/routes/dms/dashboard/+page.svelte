<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>DMS Dashboard | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-2xl">folder_open</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">DMS Dashboard & Arsip Dokumen</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Sistem manajemen dokumen korporat, arsip legal, izin operasional, dan pemantauan masa berlaku
			</p>
		</div>
		<div class="flex gap-3">
			<a href="/dms/transactions/documents/create" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors">
				<span class="material-symbols-outlined text-lg">upload_file</span>
				<span>Tambah Dokumen Baru</span>
			</a>
		</div>
	</header>

	<!-- Summary Cards (Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<!-- Total Docs -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Dokumen</p>
					<h3 class="text-3xl font-black text-on-surface mt-1">{data.stats.total}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">description</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-2">Seluruh arsip terdaftar</p>
		</div>

		<!-- Active Docs -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-emerald-600 uppercase tracking-wider">Dokumen Aktif</p>
					<h3 class="text-3xl font-black text-emerald-600 mt-1">{data.stats.active}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">check_circle</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 font-medium mt-2">Masa berlaku masih valid</p>
		</div>

		<!-- Expired Docs -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-rose-600 uppercase tracking-wider">Kadaluarsa (Expired)</p>
					<h3 class="text-3xl font-black text-rose-600 mt-1">{data.stats.expired}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">error</span>
				</div>
			</div>
			<p class="text-xs text-rose-600 font-medium mt-2">Memerlukan perpanjangan segera</p>
		</div>
	</div>

	<!-- Recent Documents Container -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-xs flex flex-col justify-between">
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-base font-bold text-on-surface">Direktori Dokumen & Arsip</h3>
			<a href="/dms/transactions/documents" class="text-xs font-bold text-indigo-600 hover:underline">Buka Semua Dokumen</a>
		</div>
		<p class="text-xs text-on-surface-variant">
			Gunakan menu <a href="/dms/transactions/documents" class="font-bold text-indigo-600 hover:underline">Semua Dokumen</a> untuk memfilter berdasarkan kategori, nomor legalitas, tanggal penerbit, dan lokasi penyimpanan berkas fisik.
		</p>
	</div>
</div>
