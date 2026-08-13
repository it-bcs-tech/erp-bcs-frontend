<script lang="ts">
	import { enhance } from '$app/forms';
	import SearchableSelect from '$lib/components/SearchableSelect.svelte';
	
	let { data } = $props();

	let formState = $state({
		doc_number: '',
		doc_type_id: '',
		title: '',
		partner_id: '',
		asset_id: '',
		notary_id: '',
		issuer_id: '',
		issue_date: '',
		expiry_date: '',
		filing_location_id: '',
		notes: '',
		metadata: {} as Record<string, any>
	});

	let isSubmitting = $state(false);

	// Derived to know the selected doc_type code
	let selectedTypeCode = $derived(
		data.docTypes.find((d: any) => d.id === formState.doc_type_id)?.code || ''
	);

	// Reset metadata when type changes to prevent dirty data
	$effect(() => {
		if (selectedTypeCode) {
			formState.metadata = {};
		}
	});

	// Select Options
	const typeOpts = data.docTypes.map((d: any) => ({ value: d.id, label: d.name }));
	const partnerOpts = data.partners.map((p: any) => ({ value: p.id, label: p.name }));
	const assetOpts = data.assets.map((a: any) => ({ value: a.id, label: a.name }));
	const notaryOpts = data.notaries.map((n: any) => ({ value: n.id, label: n.name }));
	const issuerOpts = data.issuers.map((i: any) => ({ value: i.id, label: i.name }));
	const locationOpts = data.locations.map((l: any) => ({ value: l.id, label: l.name }));
</script>

<svelte:head>
	<title>Register Document | DMS | ERP BCS</title>
</svelte:head>

<div class="px-6 py-8 w-full max-w-5xl mx-auto">
	<header class="mb-8 flex justify-between items-end">
		<div>
			<a href="/dms/transactions/documents" class="text-sm text-primary hover:underline font-bold mb-2 inline-flex items-center gap-1">
				<span class="material-symbols-outlined text-[16px]">arrow_back</span> Back to Documents
			</a>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mt-1">Register New Document</h1>
			<p class="text-sm font-medium text-on-surface-variant mt-1">Fill the details below to archive a new document.</p>
		</div>
	</header>

	<form method="POST" action="?/saveDoc" enctype="multipart/form-data" use:enhance={() => {
		isSubmitting = true;
		return async ({ result }) => {
			if (result.type === 'success' && result.data?.success) {
				alert(result.data.message);
				window.location.href = '/dms/transactions/documents';
			} else {
				alert(result.data?.message || 'Error occurred');
			}
			isSubmitting = false;
		};
	}}>
		<input type="hidden" name="payload" value={JSON.stringify(formState)} />
		
		<div class="space-y-6">
			<!-- Main Information -->
			<div class="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-surface-variant/20">
				<h3 class="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">info</span>
					Basic Information
				</h3>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Document Type <span class="text-error">*</span></label>
						<SearchableSelect options={typeOpts} bind:value={formState.doc_type_id} placeholder="-- Select Type --" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Document Number</label>
						<input type="text" bind:value={formState.doc_number} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. 001/LEGAL/2026" />
					</div>
					<div class="md:col-span-2">
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Document Title <span class="text-error">*</span></label>
						<input type="text" bind:value={formState.title} required class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Surat Perjanjian Sewa Gudang B" />
					</div>
					<div class="md:col-span-2">
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Scanned Document (PDF)</label>
						<input type="file" name="file_upload" accept=".pdf" class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-on-primary hover:file:bg-primary/90" />
					</div>
				</div>
			</div>

			<!-- Dynamic Metadata Section -->
			{#if selectedTypeCode}
				<div class="bg-primary/5 rounded-3xl p-8 border border-primary/20 transition-all">
					<h3 class="text-lg font-bold text-primary mb-6 flex items-center gap-2">
						<span class="material-symbols-outlined">dataset</span>
						{selectedTypeCode} Specific Details
					</h3>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						{#if selectedTypeCode === 'CONTRACT'}
							<div>
								<label class="block text-xs font-bold text-primary uppercase tracking-wider mb-1">Partner / Vendor</label>
								<SearchableSelect options={partnerOpts} bind:value={formState.partner_id} placeholder="-- Select Partner --" />
							</div>
							<div>
								<label class="block text-xs font-bold text-primary uppercase tracking-wider mb-1">Notary</label>
								<SearchableSelect options={notaryOpts} bind:value={formState.notary_id} placeholder="-- Select Notary --" />
							</div>
							<div>
								<label class="block text-xs font-bold text-primary uppercase tracking-wider mb-1">Contract Value (IDR)</label>
								<input type="number" bind:value={formState.metadata.value} class="w-full bg-surface-container-lowest rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="0" />
							</div>
							<div>
								<label class="block text-xs font-bold text-primary uppercase tracking-wider mb-1">Scope of Work</label>
								<input type="text" bind:value={formState.metadata.scope} class="w-full bg-surface-container-lowest rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Maintenance Services" />
							</div>
						{/if}

						{#if selectedTypeCode === 'BPKB' || selectedTypeCode === 'LAND'}
							<div>
								<label class="block text-xs font-bold text-primary uppercase tracking-wider mb-1">Asset / Vehicle Ref</label>
								<SearchableSelect options={assetOpts} bind:value={formState.asset_id} placeholder="-- Select Asset --" />
							</div>
							<div>
								<label class="block text-xs font-bold text-primary uppercase tracking-wider mb-1">Ownership Name</label>
								<input type="text" bind:value={formState.metadata.ownership} class="w-full bg-surface-container-lowest rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. PT BCS Logistics" />
							</div>
							<div>
								<label class="block text-xs font-bold text-primary uppercase tracking-wider mb-1">Brankas Detail</label>
								<input type="text" bind:value={formState.metadata.brankas} class="w-full bg-surface-container-lowest rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Laci A2" />
							</div>
						{/if}

						{#if selectedTypeCode === 'LICENSE' || selectedTypeCode === 'SIO'}
							<div>
								<label class="block text-xs font-bold text-primary uppercase tracking-wider mb-1">Issuer (Instansi)</label>
								<SearchableSelect options={issuerOpts} bind:value={formState.issuer_id} placeholder="-- Select Issuer --" />
							</div>
							<div>
								<label class="block text-xs font-bold text-primary uppercase tracking-wider mb-1">Company Entity</label>
								<input type="text" bind:value={formState.metadata.company} class="w-full bg-surface-container-lowest rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. BCS Branch Jakarta" />
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Dates & Archiving -->
			<div class="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-surface-variant/20">
				<h3 class="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">calendar_month</span>
					Validity & Archiving
				</h3>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Issue / Sign Date</label>
						<input type="date" bind:value={formState.issue_date} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Expiry Date</label>
						<input type="date" bind:value={formState.expiry_date} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Filing Location (Rak Arsip)</label>
						<SearchableSelect options={locationOpts} bind:value={formState.filing_location_id} placeholder="-- Select Location --" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Remarks / Notes</label>
						<textarea bind:value={formState.notes} rows="2" class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="Optional notes..."></textarea>
					</div>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex justify-end gap-3 pt-4 border-t border-surface-variant/20">
				<button type="button" onclick={() => history.back()} class="bg-surface-container-high text-on-surface px-6 py-3 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">
					Cancel
				</button>
				<button type="submit" disabled={isSubmitting || !formState.title || !formState.doc_type_id} class="bg-primary text-on-primary px-8 py-3 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
					{#if isSubmitting}
						<span class="material-symbols-outlined text-[18px] animate-spin">sync</span> Saving...
					{:else}
						<span class="material-symbols-outlined text-[18px]">save</span> Save Document
					{/if}
				</button>
			</div>
		</div>
	</form>
</div>
