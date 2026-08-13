<script lang="ts">
	let { data } = $props();
	let doc = data.document;

	function formatDate(d: Date | string | null) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
	}

	function getStatusBadge(status: string) {
		switch(status) {
			case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
			case 'EXPIRED': return 'bg-rose-100 text-rose-700 border-rose-200';
			case 'REVOKED': return 'bg-slate-100 text-slate-700 border-slate-200';
			case 'FINISHED': return 'bg-blue-100 text-blue-700 border-blue-200';
			default: return 'bg-slate-100 text-slate-700 border-slate-200';
		}
	}

    // Convert metadata object into array of key-value pairs for easy rendering
    let metadataEntries = $derived(doc.metadata ? Object.entries(doc.metadata).filter(([_, v]) => v !== null && v !== '') : []);
</script>

<svelte:head>
	<title>{doc.title} | DMS | ERP BCS</title>
</svelte:head>

<div class="px-6 py-8 w-full mx-auto max-w-7xl">
	<!-- Header -->
	<header class="mb-8 flex flex-wrap justify-between items-end gap-4">
		<div>
			<a href="/dms/transactions/documents" class="text-sm font-medium text-primary hover:underline flex items-center gap-1 mb-2">
				<span class="material-symbols-outlined text-[18px]">arrow_back</span>
				Back to Documents
			</a>
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-extrabold text-on-surface tracking-tight">{doc.title}</h1>
				<span class="px-3 py-1 rounded-full text-xs font-extrabold tracking-wider border {getStatusBadge(doc.status)}">
					{doc.status}
				</span>
			</div>
			<p class="text-sm font-medium text-on-surface-variant mt-1">
				{doc.type_name} &bull; {doc.doc_number || 'No Number'}
			</p>
		</div>
		<div class="flex gap-3">
			<a href="/dms/transactions/documents/{doc.id}/edit" class="bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-surface-container-high transition-colors border border-transparent">
				<span class="material-symbols-outlined text-[18px]">edit</span>
				Edit Document
			</a>
		</div>
	</header>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		
		<!-- Left Column: Information -->
		<div class="lg:col-span-1 space-y-6">
			
			<!-- General Info Card -->
			<div class="bg-surface-container-lowest border border-surface-variant/20 rounded-3xl p-6 shadow-sm">
				<h2 class="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">info</span>
					General Information
				</h2>
				<div class="space-y-4">
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Issue Date</p>
						<p class="text-sm font-medium text-on-surface">{formatDate(doc.issue_date)}</p>
					</div>
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Expiry Date</p>
						<p class="text-sm font-medium text-on-surface">{formatDate(doc.expiry_date)}</p>
					</div>
					{#if doc.partner_name}
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Partner / Customer</p>
						<p class="text-sm font-medium text-on-surface">{doc.partner_name}</p>
					</div>
					{/if}
					{#if doc.asset_name}
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Linked Asset</p>
						<p class="text-sm font-medium text-on-surface">{doc.asset_name}</p>
					</div>
					{/if}
				</div>
			</div>

			<!-- Filing & Legal Card -->
			<div class="bg-surface-container-lowest border border-surface-variant/20 rounded-3xl p-6 shadow-sm">
				<h2 class="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">account_balance</span>
					Filing & Legal
				</h2>
				<div class="space-y-4">
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Filing Location</p>
						<p class="text-sm font-medium text-on-surface">{doc.filing_location_name || '-'}</p>
					</div>
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Issuer</p>
						<p class="text-sm font-medium text-on-surface">{doc.issuer_name || '-'}</p>
					</div>
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Notary</p>
						<p class="text-sm font-medium text-on-surface">{doc.notary_name || '-'}</p>
					</div>
				</div>
			</div>

			<!-- Dynamic Metadata Card -->
			{#if metadataEntries.length > 0}
			<div class="bg-surface-container-lowest border border-surface-variant/20 rounded-3xl p-6 shadow-sm">
				<h2 class="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">list_alt</span>
					Additional Metadata
				</h2>
				<div class="space-y-4">
					{#each metadataEntries as [key, val]}
						<div>
							<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</p>
							<p class="text-sm font-medium text-on-surface">{val}</p>
						</div>
					{/each}
				</div>
			</div>
			{/if}

            <!-- Notes -->
            {#if doc.notes}
            <div class="bg-surface-container-lowest border border-surface-variant/20 rounded-3xl p-6 shadow-sm">
				<h2 class="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">notes</span>
					Notes
				</h2>
				<p class="text-sm font-medium text-on-surface whitespace-pre-wrap">{doc.notes}</p>
			</div>
            {/if}

		</div>

		<!-- Right Column: Document Viewer -->
		<div class="lg:col-span-2">
			<div class="bg-surface-container-lowest border border-surface-variant/20 rounded-3xl overflow-hidden shadow-sm h-full min-h-[600px] flex flex-col">
				<div class="bg-surface-container-low px-4 py-3 border-b border-surface-variant/20 flex items-center justify-between">
					<div class="flex items-center gap-2 text-on-surface font-bold text-sm">
						<span class="material-symbols-outlined text-primary text-[20px]">picture_as_pdf</span>
						Document Viewer
					</div>
					{#if doc.file_path}
						<a href="/api/uploads/{doc.file_path}" target="_blank" class="text-xs font-bold text-primary hover:underline flex items-center gap-1">
							<span class="material-symbols-outlined text-[16px]">open_in_new</span>
							Open Original
						</a>
					{/if}
				</div>
				
				<div class="flex-1 bg-surface-container relative w-full h-full min-h-[500px]">
					{#if doc.file_path}
						<iframe src="/api/uploads/{doc.file_path}" class="absolute inset-0 w-full h-full border-0" title="Document Viewer"></iframe>
					{:else}
						<div class="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
							<span class="material-symbols-outlined text-6xl text-on-surface-variant opacity-30 mb-4">find_in_page</span>
							<h3 class="text-lg font-bold text-on-surface mb-2">No File Attached</h3>
							<p class="text-sm text-on-surface-variant max-w-md">
								This document record does not have a scanned file attached to it. Click Edit Document to upload a file.
							</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
