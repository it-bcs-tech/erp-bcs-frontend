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

<div class="px-6 py-8 w-full mx-auto">
	<header class="mb-8 flex justify-between items-end">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight">All Documents</h1>
			<p class="text-sm font-medium text-on-surface-variant mt-1">Manage Contracts, Licenses, and Asset Certificates in one central repository.</p>
		</div>
		<div class="flex gap-3">
			<a href="/dms/transactions/documents/create" class="bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity">
				<span class="material-symbols-outlined text-[18px]">add</span>
				New Document
			</a>
		</div>
	</header>

	<!-- Search & Filters -->
	<form method="GET" data-sveltekit-keepfocus data-sveltekit-replacestate class="bg-surface-container-lowest rounded-t-3xl p-4 border border-b-0 border-surface-variant/20 flex gap-4">
		<!-- Keep existing page/limit params if any -->
		<input type="hidden" name="limit" value={data.pagination.limit} />
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
			<input type="text" name="q" value={q} placeholder="Search document number or title... (Press Enter)" class="w-full bg-surface-container rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary border border-transparent">
		</div>
		<select name="type" onchange={handleFilterChange} class="bg-surface-container rounded-xl py-2 px-4 text-sm font-medium outline-none border border-transparent focus:ring-2 focus:ring-primary">
			<option value="" selected={type === ''}>All Types</option>
			{#each data.docTypes as dt}
				<option value={dt.code} selected={type === dt.code}>{dt.name}</option>
			{/each}
		</select>
		<select name="status" onchange={handleFilterChange} class="bg-surface-container rounded-xl py-2 px-4 text-sm font-medium outline-none border border-transparent focus:ring-2 focus:ring-primary">
			<option value="" selected={status === ''}>All Statuses</option>
			<option value="ACTIVE" selected={status === 'ACTIVE'}>Active</option>
			<option value="EXPIRED" selected={status === 'EXPIRED'}>Expired</option>
			<option value="REVOKED" selected={status === 'REVOKED'}>Revoked</option>
			<option value="FINISHED" selected={status === 'FINISHED'}>Finished</option>
			<option value="INACTIVE" selected={status === 'INACTIVE'}>Inactive</option>
		</select>
	</form>

	<!-- Table -->
	<div class="bg-surface-container-lowest border border-surface-variant/20 rounded-b-3xl overflow-hidden shadow-sm flex flex-col">
		<div class="overflow-x-auto">
		<table class="w-full text-left border-collapse">
			<thead>
				<tr class="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider font-bold border-b border-surface-variant/20">
					<th class="p-4">Doc Number</th>
					<th class="p-4">Type</th>
					<th class="p-4">Title / Partner</th>
					<th class="p-4 text-center">Issue Date</th>
					<th class="p-4 text-center">Expiry Date</th>
					<th class="p-4 text-center">Status</th>
					<th class="p-4 text-right">Actions</th>
				</tr>
			</thead>
			<tbody class="text-sm font-medium divide-y divide-surface-variant/10">
				{#if data.documents.length === 0}
					<tr>
						<td colspan="7" class="p-8 text-center text-on-surface-variant">
							<span class="material-symbols-outlined text-4xl mb-2 opacity-50">folder_off</span>
							<p>No documents found.</p>
						</td>
					</tr>
				{:else}
					{#each data.documents as doc}
						<tr class="hover:bg-surface-container-low/50 transition-colors group">
							<td class="p-4 font-bold text-primary">{doc.doc_number || '-'}</td>
							<td class="p-4">
								<span class="bg-surface-container px-2.5 py-1 rounded-md text-xs font-bold text-on-surface">
									{doc.type_name || 'N/A'}
								</span>
							</td>
							<td class="p-4">
								<p class="text-on-surface font-bold">{doc.title}</p>
								{#if doc.partner_name}
									<p class="text-xs text-on-surface-variant mt-0.5">{doc.partner_name}</p>
								{/if}
							</td>
							<td class="p-4 text-center text-on-surface-variant">{formatDate(doc.issue_date)}</td>
							<td class="p-4 text-center text-on-surface-variant">{formatDate(doc.expiry_date)}</td>
							<td class="p-4 text-center">
								<span class="px-3 py-1 rounded-full text-xs font-extrabold tracking-wider border {getStatusBadge(doc.status)}">
									{doc.status}
								</span>
							</td>
							<td class="p-4 text-right whitespace-nowrap">
								<a href="/dms/transactions/documents/{doc.id}" class="inline-block p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="View Details">
									<span class="material-symbols-outlined text-sm">visibility</span>
								</a>
								<a href="/dms/transactions/documents/{doc.id}/edit" class="inline-block p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Edit">
									<span class="material-symbols-outlined text-sm">edit</span>
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
									if (!confirm('Are you sure you want to delete this document?')) e.preventDefault();
								}}>
									<input type="hidden" name="id" value={doc.id} />
									<button type="submit" class="p-2 text-error hover:bg-error/10 rounded-lg transition-colors" title="Delete">
										<span class="material-symbols-outlined text-sm">delete</span>
									</button>
								</form>
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
