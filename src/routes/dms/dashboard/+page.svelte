<script lang="ts">
	import { formatDateId, getStatusInfo, getPhysicalStatusInfo, getEntityTypeInfo } from '$lib/utils/dms';
	import DmsSecureViewer from '$lib/components/DmsSecureViewer.svelte';

	let { data } = $props();
	let stats = $derived(data.stats);
	let upcomingExpiringDocs = $derived(data.upcomingExpiringDocs || []);
	let borrowedDocs = $derived(data.borrowedDocs || []);

	let isViewerOpen = $state(false);
	let selectedDoc = $state<any>(null);

	function openViewer(doc: any) {
		selectedDoc = doc;
		isViewerOpen = true;
	}
</script>

<svelte:head>
	<title>DMS Dashboard & Expiry Pipeline | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-2xl">folder_open</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">DMS Dashboard & Expiry Horizon</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pemantauan kepatuhan legalitas logistik, gerbang masa berlaku (H-60, H-30, H-7), dan pelacakan arsip fisik.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<a
				href="/dms/transactions/documents"
				class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-on-surface hover:bg-surface-container-high text-xs font-bold transition-colors flex items-center gap-1.5"
			>
				<span class="material-symbols-outlined text-lg">folder_shared</span>
				<span>Semua Dokumen</span>
			</a>
			<a
				href="/dms/transactions/documents/create"
				class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs flex items-center gap-2 transition-colors"
			>
				<span class="material-symbols-outlined text-lg">upload_file</span>
				<span>Tambah Dokumen Baru</span>
			</a>
		</div>
	</header>

	<!-- Metric Cards (Bento Expiry Gate) -->
	<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
		<!-- Total Docs -->
		<a
			href="/dms/transactions/documents"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-indigo-400 transition-colors flex flex-col justify-between"
		>
			<div class="flex items-center justify-between">
				<p class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Dokumen</p>
				<span class="material-symbols-outlined text-indigo-600 text-xl">description</span>
			</div>
			<h3 class="text-2xl font-black text-on-surface mt-2">{stats.total}</h3>
			<p class="text-[10px] text-on-surface-variant mt-1">Seluruh arsip</p>
		</a>

		<!-- Valid Docs -->
		<a
			href="/dms/transactions/documents"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-emerald-400 transition-colors flex flex-col justify-between"
		>
			<div class="flex items-center justify-between">
				<p class="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Aktif & Valid</p>
				<span class="material-symbols-outlined text-emerald-600 text-xl">verified</span>
			</div>
			<h3 class="text-2xl font-black text-emerald-600 mt-2">{stats.valid}</h3>
			<p class="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1">> 60 hari aman</p>
		</a>

		<!-- Warning H-60 -->
		<a
			href="/dms/transactions/documents?gate=WARNING_60"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-amber-400 transition-colors flex flex-col justify-between"
		>
			<div class="flex items-center justify-between">
				<p class="text-[11px] font-bold text-amber-600 uppercase tracking-wider">H-60 Warning</p>
				<span class="material-symbols-outlined text-amber-600 text-xl">schedule</span>
			</div>
			<h3 class="text-2xl font-black text-amber-600 mt-2">{stats.warning60}</h3>
			<p class="text-[10px] text-amber-700 dark:text-amber-400 mt-1">Jatuh tempo 31-60 hari</p>
		</a>

		<!-- Critical H-30 -->
		<a
			href="/dms/transactions/documents?gate=CRITICAL_30"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-orange-400 transition-colors flex flex-col justify-between"
		>
			<div class="flex items-center justify-between">
				<p class="text-[11px] font-bold text-orange-600 uppercase tracking-wider">H-30 Kritis</p>
				<span class="material-symbols-outlined text-orange-600 text-xl">notification_important</span>
			</div>
			<h3 class="text-2xl font-black text-orange-600 mt-2">{stats.critical30}</h3>
			<p class="text-[10px] text-orange-700 dark:text-orange-400 mt-1">Jatuh tempo 8-30 hari</p>
		</a>

		<!-- Urgent H-7 -->
		<a
			href="/dms/transactions/documents?gate=URGENT_7"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-rose-400 transition-colors flex flex-col justify-between {stats.urgent7 > 0 ? 'ring-2 ring-rose-500/30' : ''}"
		>
			<div class="flex items-center justify-between">
				<p class="text-[11px] font-bold text-rose-600 uppercase tracking-wider">H-7 Urgent</p>
				<span class="material-symbols-outlined text-rose-600 text-xl {stats.urgent7 > 0 ? 'animate-pulse' : ''}">warning</span>
			</div>
			<h3 class="text-2xl font-black text-rose-600 mt-2">{stats.urgent7}</h3>
			<p class="text-[10px] text-rose-700 dark:text-rose-400 mt-1">Segera tindak lanjuti</p>
		</a>

		<!-- Expired -->
		<a
			href="/dms/transactions/documents?gate=EXPIRED"
			class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-rose-700 transition-colors flex flex-col justify-between"
		>
			<div class="flex items-center justify-between">
				<p class="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Kadaluarsa</p>
				<span class="material-symbols-outlined text-rose-700 text-xl">error</span>
			</div>
			<h3 class="text-2xl font-black text-rose-700 mt-2">{stats.expired}</h3>
			<p class="text-[10px] text-rose-800 dark:text-rose-400 mt-1">Masa berlaku habis</p>
		</a>
	</div>

	<!-- Entity Breakdown Chips -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
		<a
			href="/dms/transactions/documents?entity_type=FLEET"
			class="p-3.5 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between hover:border-sky-400 transition-colors"
		>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-sky-600">local_shipping</span>
				<div>
					<h4 class="text-xs font-black text-on-surface">Armada (FMS)</h4>
					<p class="text-[10px] text-on-surface-variant">KIR, STNK, BPKB</p>
				</div>
			</div>
			<span class="text-base font-black text-on-surface">{stats.entities.fleet}</span>
		</a>

		<a
			href="/dms/transactions/documents?entity_type=DRIVER"
			class="p-3.5 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between hover:border-indigo-400 transition-colors"
		>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-indigo-600">airline_seat_recline_normal</span>
				<div>
					<h4 class="text-xs font-black text-on-surface">Driver (HRIS)</h4>
					<p class="text-[10px] text-on-surface-variant">SIM, SIO, KTP</p>
				</div>
			</div>
			<span class="text-base font-black text-on-surface">{stats.entities.driver}</span>
		</a>

		<a
			href="/dms/transactions/documents?entity_type=CUSTOMER"
			class="p-3.5 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between hover:border-teal-400 transition-colors"
		>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-teal-600">handshake</span>
				<div>
					<h4 class="text-xs font-black text-on-surface">Mitra / Customer</h4>
					<p class="text-[10px] text-on-surface-variant">SPK, Kontrak</p>
				</div>
			</div>
			<span class="text-base font-black text-on-surface">{stats.entities.customer}</span>
		</a>

		<a
			href="/dms/transactions/documents?entity_type=CORPORATE"
			class="p-3.5 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between hover:border-violet-400 transition-colors"
		>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-violet-600">corporate_fare</span>
				<div>
					<h4 class="text-xs font-black text-on-surface">Korporat & ISO</h4>
					<p class="text-[10px] text-on-surface-variant">Legal Perusahaan</p>
				</div>
			</div>
			<span class="text-base font-black text-on-surface">{stats.entities.corporate}</span>
		</a>
	</div>

	<!-- Main Two-Column Layout: Horizon Table & Borrowed Physical Tracker -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left (2 cols): Expiry Horizon Pipeline Table -->
		<div class="lg:col-span-2 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-xs space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-indigo-600 text-xl">event_upcoming</span>
					<h3 class="text-base font-extrabold text-on-surface">Pipeline Dokumen Mendekati Jatuh Tempo (H ≤ 60)</h3>
				</div>
				<a href="/dms/transactions/documents" class="text-xs font-bold text-indigo-600 hover:underline">
					Buka Semua
				</a>
			</div>

			{#if upcomingExpiringDocs.length === 0}
				<div class="p-8 text-center bg-surface-container-low rounded-2xl text-on-surface-variant">
					<span class="material-symbols-outlined text-4xl text-emerald-500 mb-1">check_circle</span>
					<p class="text-xs font-bold">Semua dokumen dalam kondisi valid dan aman!</p>
					<p class="text-[11px] text-slate-400 mt-0.5">Tidak ada dokumen yang jatuh tempo dalam 60 hari ke depan.</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs border-collapse">
						<thead>
							<tr class="border-b border-slate-200 dark:border-slate-800 text-on-surface-variant font-bold uppercase tracking-wider">
								<th class="py-3 px-3">Dokumen</th>
								<th class="py-3 px-3">Entitas</th>
								<th class="py-3 px-3">Jatuh Tempo</th>
								<th class="py-3 px-3">Status Alert</th>
								<th class="py-3 px-3 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
							{#each upcomingExpiringDocs as doc}
								{@const sInfo = getStatusInfo(doc.status, doc.gate_level, doc.days_remaining)}
								{@const eInfo = getEntityTypeInfo(doc.entity_type)}
								<tr class="hover:bg-surface-container-high/40 transition-colors">
									<td class="py-3 px-3">
										<a href="/dms/transactions/documents/{doc.id}" class="font-bold text-on-surface hover:text-indigo-600 line-clamp-1">
											{doc.title}
										</a>
										<p class="text-[10px] font-mono text-slate-400">{doc.doc_number || doc.type_name}</p>
									</td>
									<td class="py-3 px-3">
										<span class="font-bold text-on-surface">
											{#if doc.entity_type === 'FLEET'}
												{doc.unit_number || 'Armada'}
											{:else if doc.entity_type === 'DRIVER'}
												{doc.driver_name || 'Driver'}
											{:else if doc.entity_type === 'CUSTOMER'}
												{doc.partner_name || 'Customer'}
											{:else}
												Korporat
											{/if}
										</span>
									</td>
									<td class="py-3 px-3 font-bold text-on-surface">{formatDateId(doc.expiry_date)}</td>
									<td class="py-3 px-3">
										<span class="px-2 py-0.5 rounded-full text-[10px] font-black border inline-flex items-center gap-1 {sInfo.badgeClass}">
											<span class="material-symbols-outlined text-xs">{sInfo.icon}</span>
											<span>{sInfo.label}</span>
										</span>
									</td>
									<td class="py-3 px-3 text-right">
										<a
											href="/dms/transactions/documents/{doc.id}"
											class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] transition-colors"
										>
											Perpanjang
										</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		<!-- Right (1 col): Physical Custody Tracker -->
		<div class="rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-xs space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-orange-600 text-xl">inventory_2</span>
					<h3 class="text-base font-extrabold text-on-surface">Berkas Sedang Dipinjam ({stats.borrowedCount})</h3>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant">
				Monitoring berkas fisik asli yang saat ini berada di luar lemari/rak arsip.
			</p>

			{#if borrowedDocs.length === 0}
				<div class="p-6 text-center bg-surface-container-low rounded-2xl text-on-surface-variant">
					<span class="material-symbols-outlined text-3xl text-emerald-500 mb-1">lock</span>
					<p class="text-xs font-bold">Semua berkas fisik berada di lemari arsip.</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each borrowedDocs as bDoc}
						<div class="p-3.5 rounded-2xl bg-orange-50/50 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/40 space-y-1.5">
							<div class="flex items-center justify-between">
								<h5 class="text-xs font-bold text-on-surface line-clamp-1">{bDoc.title}</h5>
								<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200">DIPINJAM</span>
							</div>
							<p class="text-[11px] text-on-surface-variant font-mono">No: {bDoc.doc_number || '-'}</p>
							<div class="flex items-center justify-between pt-1 border-t border-orange-200/50 dark:border-orange-900/30">
								<span class="text-[10px] text-slate-500">Rak: {bDoc.filing_location_code || 'A1'}</span>
								<a href="/dms/transactions/documents/{bDoc.id}" class="text-[11px] font-bold text-orange-700 dark:text-orange-300 hover:underline">
									Kembalikan
								</a>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

{#if selectedDoc}
	<DmsSecureViewer
		bind:isOpen={isViewerOpen}
		filePath={selectedDoc.file_path || ''}
		docTitle={selectedDoc.title}
		docNumber={selectedDoc.doc_number || ''}
		userName="Staff ERP BCS"
	/>
{/if}
