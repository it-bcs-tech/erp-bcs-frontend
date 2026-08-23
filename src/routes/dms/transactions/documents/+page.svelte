<script lang="ts">
	import { enhance } from '$app/forms';
	let { data } = $props();

	function getStatusBadge(status: string) {
		switch(status) {
			case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
			case 'EXPIRED': return 'bg-rose-100 text-rose-700 border-rose-200';
			case 'REVOKED': return 'bg-slate-100 text-slate-700 border-slate-200';
			case 'FINISHED': return 'bg-blue-100 text-blue-700 border-blue-200';
			default: return 'bg-slate-100 text-slate-700 border-slate-200';
		}
	}

	function formatDate(d: Date | string | null) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	import { page } from '$app/stores';
	
	let q = $derived($page.url.searchParams.get('q') || '');
	let type = $derived($page.url.searchParams.get('type') || '');
	let status = $derived($page.url.searchParams.get('status') || '');

	function handleFilterChange(e: Event) {
		const form = (e.target as HTMLElement).closest('form');
		if (form) form.submit();
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

	let pageNumbers = $derived(() => {
		const pages: number[] = [];
		const start = Math.max(1, currentPage - 2);
		const end   = Math.min(totalPages, Math.max(1, start + 4));
		for (let i = start; i <= end; i++) pages.push(i);
		return pages;
	});
</script>

<svelte:head>
	<title>All Documents | DMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-2xl">folder_shared</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Daftar Dokumen & Berkas Legal</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Kelola seluruh kontrak kerjasama, lisensi izin operasi, sertifikat aset, dan notarisasi perusahaan
			</p>
		</div>
		<div class="flex gap-3">
			<a href="/dms/transactions/documents/create" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors">
				<span class="material-symbols-outlined text-lg">add</span>
				<span>Tambah Dokumen</span>
			</a>
		</div>
	</header>

	<!-- Table Container with Filter Header -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<!-- Search & Filters Bar -->
		<form method="GET" data-sveltekit-keepfocus data-sveltekit-replacestate class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row gap-3">
			<!-- Keep existing page/limit params if any -->
			<input type="hidden" name="limit" value={data.pagination.limit} />
			<div class="relative flex-1">
				<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
				<input type="text" name="q" value={q} placeholder="Cari nomor dokumen atau judul berkas..." class="w-full bg-surface border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-xs">
			</div>
			<select name="type" onchange={handleFilterChange} class="bg-surface border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-xs cursor-pointer">
				<option value="" selected={type === ''}>Semua Tipe Dokumen</option>
				{#each data.docTypes as dt}
					<option value={dt.code} selected={type === dt.code}>{dt.name}</option>
				{/each}
			</select>
			<select name="status" onchange={handleFilterChange} class="bg-surface border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-xs cursor-pointer">
				<option value="" selected={status === ''}>Semua Status</option>
				<option value="ACTIVE" selected={status === 'ACTIVE'}>Active</option>
				<option value="EXPIRED" selected={status === 'EXPIRED'}>Expired</option>
				<option value="REVOKED" selected={status === 'REVOKED'}>Revoked</option>
				<option value="FINISHED" selected={status === 'FINISHED'}>Finished</option>
				<option value="INACTIVE" selected={status === 'INACTIVE'}>Inactive</option>
			</select>
		</form>

		<!-- Table -->
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Nomor Dokumen</th>
						<th class="py-3.5 px-5">Kategori Tipe</th>
						<th class="py-3.5 px-5">Judul & Mitra / Klien</th>
						<th class="py-3.5 px-5 text-center">Tgl Terbit</th>
						<th class="py-3.5 px-5 text-center">Tgl Expired</th>
						<th class="py-3.5 px-5 text-center">Status</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if data.documents.length === 0}
						<tr>
							<td colspan="7" class="py-16 text-center text-on-surface-variant font-medium">
								<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 block mb-2">folder_off</span>
								<p class="font-bold text-on-surface">Tidak ada dokumen ditemukan.</p>
							</td>
						</tr>
					{:else}
						{#each data.documents as doc}
							<tr class="hover:bg-surface-container transition-colors group">
								<td class="py-4 px-5 font-bold text-on-surface font-mono">{doc.doc_number || '-'}</td>
								<td class="py-4 px-5">
									<span class="bg-surface-container-high px-2 py-0.5 rounded text-[10px] font-bold text-on-surface uppercase">
										{doc.type_name || 'N/A'}
									</span>
								</td>
								<td class="py-4 px-5">
									<p class="text-on-surface font-bold text-sm">{doc.title}</p>
									{#if doc.partner_name}
										<p class="text-xs text-on-surface-variant mt-0.5">{doc.partner_name}</p>
									{/if}
								</td>
								<td class="py-4 px-5 text-center text-xs text-on-surface-variant font-medium">{formatDate(doc.issue_date)}</td>
								<td class="py-4 px-5 text-center text-xs text-on-surface-variant font-medium">{formatDate(doc.expiry_date)}</td>
								<td class="py-4 px-5 text-center">
									<span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border {getStatusBadge(doc.status)}">
										{doc.status}
									</span>
								</td>
								<td class="py-4 px-5 text-right whitespace-nowrap">
									<div class="flex items-center justify-end gap-1">
										<a href="/dms/transactions/documents/{doc.id}" class="p-1.5 text-on-surface-variant hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Lihat Detail">
											<span class="material-symbols-outlined text-lg">visibility</span>
										</a>
										<a href="/dms/transactions/documents/{doc.id}/edit" class="p-1.5 text-on-surface-variant hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Edit">
											<span class="material-symbols-outlined text-lg">edit</span>
										</a>
										<form method="POST" action="?/delete" use:enhance={() => {
											return async ({ result, update }) => {
												if (result.type === 'success' && result.data?.success) {
													update();
												} else {
													alert(result.data?.message || 'Error occurred while deleting.');
												}
											};
										}} class="inline-block" onsubmit={(e) => {
											if (!confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) e.preventDefault();
										}}>
											<input type="hidden" name="id" value={doc.id} />
											<button type="submit" class="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors cursor-pointer" title="Hapus">
												<span class="material-symbols-outlined text-lg">delete</span>
											</button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	<!-- Pagination Footer -->
	<div class="px-6 py-4 border-t border-surface-container flex items-center justify-between bg-surface-container-lowest rounded-b-3xl">
		<p class="text-xs text-on-surface-variant font-medium">
			Menampilkan {startItem}–{endItem} dari {data.pagination.total} dokumen
		</p>
		<div class="flex gap-1">
			<a
				href={getPageUrl(currentPage - 1)}
				class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors {currentPage <= 1 ? 'pointer-events-none opacity-40' : ''}"
			>
				<span class="material-symbols-outlined text-lg">chevron_left</span>
			</a>

			{#each pageNumbers() as p}
				<a
					href={getPageUrl(p)}
					class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors {currentPage === p ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface hover:bg-surface-container-high'}"
				>
					{p}
				</a>
			{/each}

			<a
				href={getPageUrl(currentPage + 1)}
				class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors {currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''}"
			>
				<span class="material-symbols-outlined text-lg">chevron_right</span>
			</a>
		</div>
	</div>
</div>
</div>
