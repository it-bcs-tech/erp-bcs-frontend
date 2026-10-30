<script lang="ts">
	import { page } from '$app/stores';
	import { authUser } from '$lib/stores/auth';
	import { formatDateId, getStatusInfo } from '$lib/utils/dms';
	import DmsSecureViewer from '$lib/components/DmsSecureViewer.svelte';

	let { data } = $props();
	let doc = $derived(data.doc);
	let versions = $derived(data.versions || []);
	const user = $derived($page.data?.user || $authUser);

	let isViewerOpen = $state(false);
	let statusInfo = $derived(getStatusInfo(doc.status));

	let nowStr = $derived(formatDateId(new Date()));
	let watermarkText = $derived(`${(user?.name || 'STAFF ERP BCS').toUpperCase()} • ${nowStr} • READ-ONLY DOSSIER • ISO 27001`);
</script>

<svelte:head>
	<title>{doc.title || doc.type_name} | Dossier Dokumen ERP BCS</title>
</svelte:head>

<div class="min-h-screen bg-surface flex flex-col">
	<!-- Standalone Dossier Top Header -->
	<header class="border-b border-slate-200 dark:border-slate-800 bg-surface-container-low px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
		<div class="flex items-center gap-3">
			<div class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
				<span class="material-symbols-outlined text-xl">verified</span>
			</div>
			<div>
				<div class="flex items-center gap-2">
					<span class="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">BCS Logistics Dossier</span>
					<span class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60">
						Secure Read-Only
					</span>
				</div>
				<p class="text-[11px] text-on-surface-variant font-medium">Digital Vault & Legal Compliance Verification</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => isViewerOpen = true}
				class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">visibility</span>
				<span>Pratinjau PDF (Watermark)</span>
			</button>
			<button
				type="button"
				onclick={() => window.close()}
				class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors cursor-pointer"
			>
				Tutup
			</button>
		</div>
	</header>

	<!-- Main Content Dossier -->
	<main class="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6">
		<!-- Document Title & Identity Banner -->
		<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<div class="flex flex-wrap items-center gap-2 mb-2">
					<span class="px-3 py-1 rounded-xl text-xs font-black border {statusInfo.badgeClass}">
						{statusInfo.label}
					</span>
					{#if doc.category_name}
						<span class="px-2.5 py-1 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
							<span class="material-symbols-outlined text-[14px]">folder</span>
							<span>{doc.category_name}</span>
						</span>
					{/if}
					<span class="px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
						Versi {doc.current_version || 1}
					</span>
				</div>
				<h1 class="text-xl sm:text-2xl font-black text-on-surface tracking-tight">{doc.title || doc.type_name}</h1>
				<p class="text-xs text-on-surface-variant font-medium mt-1">
					Tipe: <strong class="text-on-surface">{doc.type_name}</strong> &bull; No: <strong class="font-mono text-indigo-600 dark:text-indigo-400">{doc.doc_number || '—'}</strong>
				</p>
			</div>

			<div class="text-left md:text-right">
				<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Masa Berlaku Berkas</p>
				{#if doc.expiry_date}
					<p class="text-lg font-black font-mono mt-0.5 {doc.days_remaining !== undefined && doc.days_remaining <= 30 ? 'text-rose-600' : 'text-on-surface'}">
						{formatDateId(doc.expiry_date)}
					</p>
					<p class="text-[11px] text-on-surface-variant font-medium">
						{doc.days_remaining !== undefined ? (doc.days_remaining > 0 ? `${doc.days_remaining} hari tersisa` : 'Telah Kadaluarsa') : '—'}
					</p>
				{:else}
					<p class="text-base font-bold text-emerald-600 mt-0.5">Seumur Hidup / Tidak Expired</p>
				{/if}
			</div>
		</div>

		<!-- Bento Grid KPI Cards -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="p-4 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
				<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Nomor Unit / Armada</span>
				<p class="text-base font-black text-on-surface font-mono mt-1">{doc.unit_number || '—'}</p>
				<p class="text-[11px] text-on-surface-variant">{doc.unit_type || 'Armada Logistik'}</p>
			</div>

			<div class="p-4 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
				<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Perusahaan Pemilik</span>
				<p class="text-base font-bold text-on-surface mt-1 truncate">{doc.company_name || 'PT BCS Logistics'}</p>
				<p class="text-[11px] text-on-surface-variant">{doc.company_code || 'BCS'}</p>
			</div>

			<div class="p-4 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
				<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Instansi Penerbit / Notaris</span>
				<p class="text-base font-bold text-on-surface mt-1 truncate">{doc.issuer_name || doc.notary_name || 'Instansi Resmi'}</p>
				<p class="text-[11px] text-on-surface-variant">Tgl Terbit: {doc.issue_date_str || '—'}</p>
			</div>

			<div class="p-4 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
				<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Lokasi Arsip Fisik</span>
				<p class="text-base font-black text-on-surface mt-1 truncate">{doc.filing_location_name || 'Lemari Arsip Pusat'}</p>
				<p class="text-[11px] text-indigo-600 font-semibold font-mono">Kode: {doc.filing_location_code || 'VAULT-01'}</p>
			</div>
		</div>

		<!-- Document Viewer Section (Embedded Standalone) -->
		<div class="rounded-3xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
			<div class="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<span class="material-symbols-outlined text-rose-600 text-xl">picture_as_pdf</span>
					<h2 class="text-sm sm:text-base font-bold text-on-surface">Pratinjau Scan Digital Dokumen</h2>
				</div>
				<button
					type="button"
					onclick={() => isViewerOpen = true}
					class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-surface-container-high text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
				>
					<span class="material-symbols-outlined text-sm">fullscreen</span>
					<span>Perbesar Layar</span>
				</button>
			</div>

			<div class="relative h-[650px] bg-slate-950 flex items-center justify-center overflow-hidden">
				{#if doc.file_path}
					<iframe
						src={`/uploads/${doc.file_path}#toolbar=0`}
						title={doc.title}
						class="w-full h-full border-none z-10"
					></iframe>
				{:else}
					<div class="text-center text-slate-400 p-8 z-10">
						<span class="material-symbols-outlined text-5xl mb-2 text-slate-500">description</span>
						<p class="text-sm font-semibold">Berkas fisik scan digital belum diunggah untuk dokumen ini.</p>
					</div>
				{/if}

				<!-- Dynamic SVG Watermark Overlay -->
				<div class="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none flex flex-col justify-around opacity-15">
					{#each Array(6) as _, rowIndex}
						<div class="flex justify-around transform -rotate-12 whitespace-nowrap text-white font-black tracking-widest text-xs md:text-sm">
							{#each Array(3) as _, colIndex}
								<span class="mx-8">{watermarkText}</span>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Metadata & Catatan Teknis -->
		{#if doc.notes || doc.metadata}
			<div class="p-6 rounded-3xl bg-surface-container border border-slate-200/80 dark:border-slate-800 space-y-3">
				<h3 class="text-xs font-black uppercase tracking-wider text-on-surface-variant">Catatan & Keterangan Khusus</h3>
				<p class="text-xs text-on-surface leading-relaxed">{doc.notes || 'Tidak ada catatan khusus.'}</p>
			</div>
		{/if}
	</main>
</div>

<!-- Modal Fullscreen Secure Viewer -->
<DmsSecureViewer
	bind:isOpen={isViewerOpen}
	filePath={doc.file_path || ''}
	docTitle={doc.title || doc.type_name}
	docNumber={doc.doc_number || ''}
	userName={user?.name || 'Staff ERP BCS'}
/>
