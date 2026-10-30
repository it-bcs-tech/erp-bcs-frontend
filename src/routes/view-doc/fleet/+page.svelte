<script lang="ts">
	import { page } from '$app/stores';
	import { authUser } from '$lib/stores/auth';
	import { formatDateId, getStatusInfo } from '$lib/utils/dms';
	import DmsSecureViewer from '$lib/components/DmsSecureViewer.svelte';

	let { data } = $props();
	let vehicle = $derived(data.vehicle);
	let documents = $derived(data.documents || []);
	const user = $derived($page.data?.user || $authUser);

	let isViewerOpen = $state(false);
	let selectedDoc = $state<any>(null);

	function openQuickPreview(doc: any) {
		selectedDoc = doc;
		isViewerOpen = true;
	}

	let validCount = $derived(documents.filter((d: any) => d.status === 'ACTIVE' && (!d.days_remaining || d.days_remaining > 30)).length);
	let warningCount = $derived(documents.filter((d: any) => d.status === 'ACTIVE' && d.days_remaining !== undefined && d.days_remaining <= 30 && d.days_remaining > 0).length);
	let expiredCount = $derived(documents.filter((d: any) => d.status === 'EXPIRED' || (d.days_remaining !== undefined && d.days_remaining <= 0)).length);
</script>

<svelte:head>
	<title>Dossier Berkas Armada {vehicle.nomor_unit} | ERP BCS</title>
</svelte:head>

<div class="min-h-screen bg-surface flex flex-col">
	<!-- Standalone Top Header -->
	<header class="border-b border-slate-200 dark:border-slate-800 bg-surface-container-low px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
		<div class="flex items-center gap-3">
			<div class="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
				<span class="material-symbols-outlined text-xl">local_shipping</span>
			</div>
			<div>
				<div class="flex items-center gap-2">
					<span class="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Dossier Berkas Armada</span>
					<span class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60">
						Secure Read-Only
					</span>
				</div>
				<p class="text-[11px] text-on-surface-variant font-medium">Kepatuhan Berkas Legalitas & Operasional Kendaraan</p>
			</div>
		</div>

		<button
			type="button"
			onclick={() => window.close()}
			class="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors cursor-pointer"
		>
			Tutup Jendela
		</button>
	</header>

	<main class="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6">
		<!-- Unit Identity Banner -->
		<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
			<div class="space-y-1.5">
				<div class="flex items-center gap-2">
					<span class="px-2.5 py-1 rounded-lg text-xs font-black uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
						{vehicle.business_unit || 'TRUCK'}
					</span>
					<span class="px-2.5 py-1 rounded-lg text-xs font-bold {vehicle.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-700'}">
						{vehicle.is_active ? 'Unit Aktif Operasional' : 'Non-Aktif'}
					</span>
				</div>
				<h1 class="text-2xl sm:text-3xl font-black text-on-surface tracking-tight font-mono">{vehicle.nomor_unit}</h1>
				<p class="text-xs text-on-surface-variant font-medium">
					{vehicle.brand || 'Mercedes / Hino'} {vehicle.model || ''} &bull; No. Proyek: <strong class="text-on-surface">{vehicle.no_proyek || 'Pool Default'}</strong> &bull; Area: <strong class="text-on-surface">{vehicle.project_area || 'Nasional'}</strong>
				</p>
			</div>

			<!-- Vehicle Specs -->
			<div class="grid grid-cols-2 gap-3 text-xs bg-surface-container p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
				<div>
					<span class="text-[10px] text-on-surface-variant uppercase font-bold">No. Rangka</span>
					<p class="font-mono font-bold text-on-surface mt-0.5">{vehicle.no_rangka || '—'}</p>
				</div>
				<div>
					<span class="text-[10px] text-on-surface-variant uppercase font-bold">No. Mesin</span>
					<p class="font-mono font-bold text-on-surface mt-0.5">{vehicle.no_mesin || '—'}</p>
				</div>
			</div>
		</div>

		<!-- Bento Counter Cards -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
			<div class="p-4 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
				<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total Dokumen</span>
				<p class="text-2xl font-black text-blue-600 font-mono mt-1">{documents.length}</p>
				<p class="text-[11px] text-on-surface-variant">Terarsip di digital vault</p>
			</div>

			<div class="p-4 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
				<span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Berkas Valid</span>
				<p class="text-2xl font-black text-emerald-600 font-mono mt-1">{validCount}</p>
				<p class="text-[11px] text-on-surface-variant">Status aman & aktif</p>
			</div>

			<div class="p-4 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
				<span class="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Segera Habis (H-30)</span>
				<p class="text-2xl font-black text-amber-600 font-mono mt-1">{warningCount}</p>
				<p class="text-[11px] text-on-surface-variant">Perlu antrean perpanjangan</p>
			</div>

			<div class="p-4 rounded-2xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
				<span class="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Telah Kadaluarsa</span>
				<p class="text-2xl font-black text-rose-600 font-mono mt-1">{expiredCount}</p>
				<p class="text-[11px] text-on-surface-variant">Kritis / Wajib diperbarui</p>
			</div>
		</div>

		<!-- Documents List Table -->
		<div class="rounded-3xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
			<div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<span class="material-symbols-outlined text-blue-600 text-xl">folder_shared</span>
					<h2 class="text-base font-bold text-on-surface">Daftar Dokumen & Kepatuhan Legalitas</h2>
				</div>
				<span class="text-xs text-on-surface-variant font-medium">{documents.length} berkas ditemukan</span>
			</div>

			{#if documents.length === 0}
				<div class="p-12 text-center text-on-surface-variant">
					<span class="material-symbols-outlined text-5xl text-slate-400 mb-2">folder_open</span>
					<p class="text-sm font-semibold">Belum ada dokumen digital yang tercatat untuk armada ini.</p>
				</div>
			{:else}
				<div class="divide-y divide-slate-200 dark:divide-slate-800">
					{#each documents as doc}
						{@const stInfo = getStatusInfo(doc.status)}
						<div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container transition-colors">
							<div class="flex items-start gap-3.5 min-w-0">
								<div class="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
									<span class="material-symbols-outlined text-xl">description</span>
								</div>
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2 mb-1">
										<span class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
											{doc.type_code || doc.type_name || 'DOC'}
										</span>
										<span class="px-2 py-0.5 rounded-lg text-[10px] font-black border {stInfo.badgeClass}">
											{stInfo.label}
										</span>
										{#if doc.category_name}
											<span class="text-[11px] text-on-surface-variant font-medium">&bull; {doc.category_name}</span>
										{/if}
									</div>
									<h3 class="text-sm font-bold text-on-surface truncate">{doc.title || doc.type_name}</h3>
									<p class="text-xs text-on-surface-variant font-mono mt-0.5">
										No: <strong class="text-on-surface">{doc.doc_number || '—'}</strong>
										{#if doc.expiry_date_str}
											&bull; Exp: <span class="font-bold {doc.days_remaining !== undefined && doc.days_remaining <= 30 ? 'text-rose-600' : 'text-on-surface'}">{doc.expiry_date_str}</span>
											{#if doc.days_remaining !== undefined}
												<span class="text-[10px] font-normal">({doc.days_remaining > 0 ? `${doc.days_remaining} hari lagi` : 'Kadaluarsa'})</span>
											{/if}
										{/if}
									</p>
								</div>
							</div>

							<!-- Actions -->
							<div class="flex items-center gap-2 self-end sm:self-center shrink-0">
								<button
									type="button"
									onclick={() => openQuickPreview(doc)}
									class="px-3.5 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
								>
									<span class="material-symbols-outlined text-base text-blue-600">visibility</span>
									<span>Pratinjau</span>
								</button>
								<a
									href={`/view-doc?token=${doc.view_token}`}
									target="_blank"
									class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
								>
									<span>Dossier Lengkap</span>
									<span class="material-symbols-outlined text-sm">open_in_new</span>
								</a>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</main>
</div>

<!-- Modal Quick Watermarked Preview -->
{#if selectedDoc}
	<DmsSecureViewer
		bind:isOpen={isViewerOpen}
		filePath={selectedDoc.file_path || ''}
		docTitle={selectedDoc.title || selectedDoc.type_name}
		docNumber={selectedDoc.doc_number || ''}
		userName={user?.name || 'Staff ERP BCS'}
	/>
{/if}
