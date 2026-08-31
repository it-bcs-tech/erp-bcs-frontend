<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDateId, formatDateTimeId, getStatusInfo, getPhysicalStatusInfo, getEntityTypeInfo } from '$lib/utils/dms';
	import DmsSecureViewer from '$lib/components/DmsSecureViewer.svelte';
	import DmsQrLabelModal from '$lib/components/DmsQrLabelModal.svelte';

	let { data } = $props();
	let doc = $derived(data.document);
	let versions = $derived(data.versions || []);
	let custodyLogs = $derived(data.custodyLogs || []);
	let auditLogs = $derived(data.auditLogs || []);

	// Active Tab State
	let activeTab = $state<'overview' | 'versions' | 'custody' | 'audit'>('overview');

	// Modals State
	let isViewerOpen = $state(false);
	let isQrModalOpen = $state(false);
	let isRenewModalOpen = $state(false);
	let isCheckoutModalOpen = $state(false);
	let isCheckinModalOpen = $state(false);

	let isSubmitting = $state(false);

	// Renewal Form State
	let renewState = $state({
		doc_number: '',
		issue_date: '',
		expiry_date: '',
		change_summary: 'Perpanjangan Masa Berlaku',
		notes: ''
	});

	// Checkout Form State
	let checkoutState = $state({
		borrower_name: '',
		borrower_role: 'Driver / Tim Lapangan',
		borrow_date: new Date().toISOString().slice(0, 10),
		expected_return_date: '',
		purpose: 'Perpanjangan Uji KIR / Pajak Kendaraan',
		notes: ''
	});

	// Derived helpers
	let statusInfo = $derived(getStatusInfo(doc.status, doc.gate_level, doc.days_remaining));
	let physicalStatusInfo = $derived(getPhysicalStatusInfo(doc.physical_status));
	let entityTypeInfo = $derived(getEntityTypeInfo(doc.entity_type));

	let entityDisplayName = $derived.by(() => {
		if (doc.entity_type === 'FLEET') return doc.unit_number ? `Unit: ${doc.unit_number} (${doc.unit_type || 'Fleet'})` : 'Armada Umum';
		if (doc.entity_type === 'DRIVER') return doc.driver_name ? `Driver: ${doc.driver_name} ${doc.driver_payroll_id ? `[${doc.driver_payroll_id}]` : ''}` : 'Driver Operasional';
		if (doc.entity_type === 'CUSTOMER') return doc.partner_name ? `Mitra: ${doc.partner_name}` : 'Mitra Bisnis';
		return 'Dokumen Korporat';
	});

	let metadataEntries = $derived(
		doc.metadata && typeof doc.metadata === 'object'
			? Object.entries(doc.metadata).filter(([_, v]) => v !== null && v !== '')
			: []
	);
</script>

<svelte:head>
	<title>{doc.title} | DMS | ERP BCS</title>
</svelte:head>

<div class="px-4 md:px-8 py-8 w-full max-w-7xl mx-auto space-y-6">
	<!-- Top Breadcrumbs & Action Header -->
	<header class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
		<div>
			<a
				href="/dms/transactions/documents"
				class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 mb-1.5"
			>
				<span class="material-symbols-outlined text-[16px]">arrow_back</span>
				Kembali ke Direktori Dokumen
			</a>
			<div class="flex flex-wrap items-center gap-3">
				<h1 class="text-2xl md:text-3xl font-black text-on-surface tracking-tight">{doc.title}</h1>
				<!-- Status Badge -->
				<span class="px-3 py-1 rounded-full text-xs font-black tracking-wider border flex items-center gap-1.5 {statusInfo.badgeClass}">
					<span class="material-symbols-outlined text-sm">{statusInfo.icon}</span>
					<span>{statusInfo.label}</span>
				</span>
				<!-- Version Badge -->
				<span class="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
					v{doc.current_version || 1}
				</span>
			</div>
			<p class="text-xs md:text-sm text-on-surface-variant font-medium mt-1 flex flex-wrap items-center gap-2">
				<span class="font-bold text-on-surface">{doc.type_name || 'Dokumen'}</span>
				<span>&bull;</span>
				<span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">{doc.doc_number || 'Tanpa Nomor'}</span>
				<span>&bull;</span>
				<span class="font-mono text-slate-500">QR: {doc.qr_code_id || '-'}</span>
			</p>
		</div>

		<!-- Action Buttons -->
		<div class="flex flex-wrap items-center gap-2.5">
			<!-- Secure Preview Button -->
			<button
				type="button"
				onclick={() => isViewerOpen = true}
				class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
			>
				<span class="material-symbols-outlined text-lg">visibility</span>
				<span>Pratinjau Aman (Watermark)</span>
			</button>

			<!-- Renewal Action -->
			<button
				type="button"
				onclick={() => {
					renewState.doc_number = doc.doc_number || '';
					renewState.issue_date = doc.issue_date_str || '';
					renewState.expiry_date = '';
					isRenewModalOpen = true;
				}}
				class="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
			>
				<span class="material-symbols-outlined text-lg">history_edu</span>
				<span>Perpanjang / Addendum</span>
			</button>

			<!-- QR Label Button -->
			<button
				type="button"
				onclick={() => isQrModalOpen = true}
				class="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-surface-container-high text-on-surface text-xs font-bold transition-colors flex items-center gap-1.5"
			>
				<span class="material-symbols-outlined text-lg text-indigo-600 dark:text-indigo-400">qr_code_2</span>
				<span class="hidden sm:inline">Cetak Label QR</span>
			</button>

			<!-- Edit Document -->
			<a
				href="/dms/transactions/documents/{doc.id}/edit"
				class="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-surface-container-high text-on-surface text-xs font-bold transition-colors flex items-center gap-1.5"
			>
				<span class="material-symbols-outlined text-lg">edit</span>
				<span class="hidden sm:inline">Edit</span>
			</a>
		</div>
	</header>

	<!-- Tabs Navigation -->
	<div class="border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
		<button
			type="button"
			onclick={() => activeTab = 'overview'}
			class="px-4 py-3 text-xs md:text-sm font-black border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap {activeTab === 'overview'
				? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
				: 'border-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-lg">info</span>
			<span>Ikhtisar Dokumen</span>
		</button>

		<button
			type="button"
			onclick={() => activeTab = 'versions'}
			class="px-4 py-3 text-xs md:text-sm font-black border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap {activeTab === 'versions'
				? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
				: 'border-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-lg">layers</span>
			<span>Riwayat Versi ({versions.length})</span>
		</button>

		<button
			type="button"
			onclick={() => activeTab = 'custody'}
			class="px-4 py-3 text-xs md:text-sm font-black border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap {activeTab === 'custody'
				? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
				: 'border-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-lg">inventory_2</span>
			<span>Pelacakan Fisik & Peminjaman ({custodyLogs.length})</span>
		</button>

		<button
			type="button"
			onclick={() => activeTab = 'audit'}
			class="px-4 py-3 text-xs md:text-sm font-black border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap {activeTab === 'audit'
				? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
				: 'border-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-lg">verified_user</span>
			<span>Audit Trail ISO 27001 ({auditLogs.length})</span>
		</button>
	</div>

	<!-- TAB 1: OVERVIEW -->
	{#if activeTab === 'overview'}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
			<!-- Left / Main: General Info & Dates -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Expiry & Entity Banner -->
				<div class="bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/80">
						<div>
							<span class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant">Tautan Entitas Terkait</span>
							<div class="flex items-center gap-2.5 mt-1.5">
								<span class="material-symbols-outlined text-xl text-indigo-600 dark:text-indigo-400">{entityTypeInfo.icon}</span>
								<span class="text-base font-extrabold text-on-surface">{entityDisplayName}</span>
								<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider {entityTypeInfo.color}">
									{entityTypeInfo.label}
								</span>
							</div>
						</div>

						<div class="text-right sm:text-right">
							<span class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant">Status Fisik Asli</span>
							<div class="mt-1.5 flex items-center sm:justify-end gap-1.5">
								<span class="px-3 py-1 rounded-full text-xs font-black border {physicalStatusInfo.badgeClass}">
									{physicalStatusInfo.label}
								</span>
							</div>
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
						<div>
							<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tanggal Terbit</p>
							<p class="text-sm font-black text-on-surface mt-1">{formatDateId(doc.issue_date)}</p>
						</div>
						<div>
							<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tanggal Jatuh Tempo</p>
							<p class="text-sm font-black text-on-surface mt-1">{formatDateId(doc.expiry_date)}</p>
						</div>
						<div>
							<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Sisa Masa Berlaku</p>
							<p class="text-sm font-black mt-1 {doc.days_remaining !== null && doc.days_remaining < 0 ? 'text-rose-600' : doc.days_remaining !== null && doc.days_remaining <= 30 ? 'text-orange-600' : 'text-emerald-600'}">
								{#if doc.days_remaining === null}
									Tanpa Batas Waktu
								{:else if doc.days_remaining < 0}
									Kadaluarsa ({Math.abs(doc.days_remaining)} hari lalu)
								{:else}
									{doc.days_remaining} Hari Lagi
								{/if}
							</p>
						</div>
					</div>
				</div>

				<!-- Legal Issuing & Location -->
				<div class="bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs space-y-5">
					<h3 class="text-sm font-extrabold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-indigo-600">account_balance</span>
						<span>Instansi, Notaris & Lokasi Penyimpanan</span>
					</h3>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
						<div>
							<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Instansi Penerbit (Issuer)</p>
							<p class="text-sm font-bold text-on-surface mt-1">{doc.issuer_name || 'Tidak Ditentukan'}</p>
						</div>
						<div>
							<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Notaris Pembuat Akta</p>
							<p class="text-sm font-bold text-on-surface mt-1">{doc.notary_name || 'Tidak Ada'}</p>
						</div>
						<div>
							<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Lokasi Berkas Fisik (Lemari / Rak)</p>
							<p class="text-sm font-bold text-on-surface mt-1">{doc.filing_location_name ? `${doc.filing_location_code || ''} - ${doc.filing_location_name}` : 'Belum Ditentukan'}</p>
						</div>
						<div>
							<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipe Registrasi Dokumen</p>
							<p class="text-sm font-bold text-on-surface mt-1">{doc.type_name || '-'}</p>
						</div>
					</div>
				</div>

				<!-- Notes -->
				{#if doc.notes}
					<div class="bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs">
						<h3 class="text-sm font-extrabold text-on-surface mb-2">Catatan Tambahan</h3>
						<p class="text-xs md:text-sm text-on-surface font-medium whitespace-pre-line leading-relaxed bg-surface-container-low p-4 rounded-2xl">
							{doc.notes}
						</p>
					</div>
				{/if}
			</div>

			<!-- Right Column: Quick File View & Custom Metadata -->
			<div class="space-y-6">
				<!-- File Card -->
				<div class="bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs space-y-4">
					<h3 class="text-sm font-extrabold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-indigo-600">attachment</span>
						<span>Lampiran Scan Berkas</span>
					</h3>

					{#if doc.file_path}
						<div class="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
							<div class="flex items-center gap-3">
								<span class="material-symbols-outlined text-3xl text-indigo-600">picture_as_pdf</span>
								<div class="min-w-0 flex-1">
									<p class="text-xs font-black text-on-surface truncate">{doc.file_path}</p>
									<p class="text-[11px] text-on-surface-variant">Format Dokumen PDF</p>
								</div>
							</div>
							<button
								type="button"
								onclick={() => isViewerOpen = true}
								class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
							>
								<span class="material-symbols-outlined text-base">visibility</span>
								<span>Buka Pratinjau PDF</span>
							</button>
						</div>
					{:else}
						<div class="p-5 rounded-2xl bg-surface-container-low text-center text-on-surface-variant">
							<span class="material-symbols-outlined text-3xl mb-1 text-slate-400">upload_file</span>
							<p class="text-xs font-medium">Belum ada file digital yang diunggah.</p>
							<a
								href="/dms/transactions/documents/{doc.id}/edit"
								class="inline-block mt-3 text-xs font-bold text-indigo-600 hover:underline"
							>
								Unggah Berkas Scan
							</a>
						</div>
					{/if}
				</div>

				<!-- Custom Metadata Entries -->
				{#if metadataEntries.length > 0}
					<div class="bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs space-y-3">
						<h3 class="text-sm font-extrabold text-on-surface flex items-center gap-2">
							<span class="material-symbols-outlined text-indigo-600">tune</span>
							<span>Parameter Spesifik</span>
						</h3>
						<div class="divide-y divide-slate-100 dark:divide-slate-800/60">
							{#each metadataEntries as [k, v]}
								<div class="py-2 flex items-center justify-between text-xs">
									<span class="font-bold text-on-surface-variant capitalize">{k.replace(/_/g, ' ')}</span>
									<span class="font-mono font-bold text-on-surface text-right">{v}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- TAB 2: VERSIONS -->
	{#if activeTab === 'versions'}
		<div class="bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div>
					<h3 class="text-base font-extrabold text-on-surface">Riwayat Versi & Addendum Dokumen</h3>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">
						Setiap perpanjangan dokumen atau addendum kontrak tersimpan sebagai snapshot terisolasi untuk audit kepatuhan.
					</p>
				</div>
				<button
					type="button"
					onclick={() => isRenewModalOpen = true}
					class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
				>
					<span class="material-symbols-outlined text-base">add</span>
					<span>Tambah Perpanjangan / Versi Baru</span>
				</button>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs border-collapse">
					<thead>
						<tr class="border-b border-slate-200 dark:border-slate-800 text-on-surface-variant font-bold uppercase tracking-wider">
							<th class="py-3 px-4">Versi</th>
							<th class="py-3 px-4">Nomor Dokumen</th>
							<th class="py-3 px-4">Tanggal Terbit</th>
							<th class="py-3 px-4">Jatuh Tempo</th>
							<th class="py-3 px-4">Ringkasan Perubahan</th>
							<th class="py-3 px-4">Diperbarui Pada</th>
							<th class="py-3 px-4 text-right">Berkas Scan</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
						{#each versions as ver}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-4 font-black text-indigo-600 dark:text-indigo-400">
									v{ver.version_number}
									{#if ver.version_number === doc.current_version}
										<span class="ml-1.5 px-2 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-800 font-bold uppercase">Aktif</span>
									{/if}
								</td>
								<td class="py-3.5 px-4 font-mono font-bold text-on-surface">{ver.doc_number || '-'}</td>
								<td class="py-3.5 px-4 text-on-surface">{formatDateId(ver.issue_date)}</td>
								<td class="py-3.5 px-4 text-on-surface font-bold">{formatDateId(ver.expiry_date)}</td>
								<td class="py-3.5 px-4 text-on-surface-variant max-w-xs truncate">{ver.change_summary || 'Perpanjangan reguler'}</td>
								<td class="py-3.5 px-4 text-on-surface-variant">{formatDateTimeId(ver.created_at)}</td>
								<td class="py-3.5 px-4 text-right">
									{#if ver.file_path}
										<a
											href={`/uploads/${ver.file_path}`}
											target="_blank"
											class="text-indigo-600 font-bold hover:underline inline-flex items-center gap-1"
										>
											<span class="material-symbols-outlined text-sm">download</span>
											<span>Unduh v{ver.version_number}</span>
										</a>
									{:else}
										<span class="text-slate-400 italic">Tanpa File</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- TAB 3: PHYSICAL CUSTODY -->
	{#if activeTab === 'custody'}
		<div class="bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
			<!-- Custody Status & Actions -->
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-container-low border border-slate-200 dark:border-slate-800">
				<div>
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status Berkas Fisik Asli</span>
					<div class="flex items-center gap-3 mt-1.5">
						<span class="px-3.5 py-1 rounded-full text-xs font-black border {physicalStatusInfo.badgeClass}">
							{physicalStatusInfo.label}
						</span>
						<span class="text-xs font-bold text-on-surface">
							Lokasi Rak: {doc.filing_location_name ? `${doc.filing_location_code} - ${doc.filing_location_name}` : 'Belum Ditentukan'}
						</span>
					</div>
				</div>

				<div class="flex items-center gap-2">
					{#if doc.physical_status === 'BORROWED'}
						<button
							type="button"
							onclick={() => isCheckinModalOpen = true}
							class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
						>
							<span class="material-symbols-outlined text-base">input</span>
							<span>Konfirmasi Pengembalian (Check-In)</span>
						</button>
					{:else}
						<button
							type="button"
							onclick={() => isCheckoutModalOpen = true}
							class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
						>
							<span class="material-symbols-outlined text-base">output</span>
							<span>Catat Peminjaman Fisik (Check-Out)</span>
						</button>
					{/if}
				</div>
			</div>

			<!-- Custody Logs Table -->
			<div>
				<h4 class="text-sm font-extrabold text-on-surface mb-3">Log Peminjaman & Pengembalian Berkas</h4>
				{#if custodyLogs.length === 0}
					<p class="text-xs text-on-surface-variant italic p-4 bg-surface-container-low rounded-xl">
						Belum ada riwayat peminjaman berkas fisik.
					</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-left text-xs border-collapse">
							<thead>
								<tr class="border-b border-slate-200 dark:border-slate-800 text-on-surface-variant font-bold uppercase tracking-wider">
									<th class="py-3 px-4">Aksi</th>
									<th class="py-3 px-4">Nama Peminjam</th>
									<th class="py-3 px-4">Tanggal Pinjam</th>
									<th class="py-3 px-4">Target Kembali</th>
									<th class="py-3 px-4">Tanggal Kembali Aktual</th>
									<th class="py-3 px-4">Keperluan</th>
									<th class="py-3 px-4">Dicatat Oleh</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
								{#each custodyLogs as log}
									<tr class="hover:bg-surface-container-high/40 transition-colors">
										<td class="py-3.5 px-4 font-black">
											{#if log.action === 'CHECK_OUT'}
												<span class="px-2 py-0.5 rounded text-[10px] bg-orange-100 text-orange-800 font-black">PINJAM</span>
											{:else}
												<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-black">KEMBALI</span>
											{/if}
										</td>
										<td class="py-3.5 px-4 font-bold text-on-surface">{log.borrower_name} ({log.borrower_role || 'Staff'})</td>
										<td class="py-3.5 px-4 text-on-surface">{formatDateId(log.borrow_date)}</td>
										<td class="py-3.5 px-4 text-on-surface font-bold">{formatDateId(log.expected_return_date)}</td>
										<td class="py-3.5 px-4 text-on-surface">{formatDateId(log.actual_return_date)}</td>
										<td class="py-3.5 px-4 text-on-surface-variant max-w-xs truncate">{log.purpose || '-'}</td>
										<td class="py-3.5 px-4 text-on-surface-variant">{log.created_by || 'Staff ERP'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- TAB 4: AUDIT TRAIL (ISO 27001) -->
	{#if activeTab === 'audit'}
		<div class="bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs space-y-5 animate-in fade-in duration-150">
			<div class="flex items-center justify-between">
				<div>
					<h3 class="text-base font-extrabold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-600">verified_user</span>
						<span>Jejak Audit Kepatuhan (ISO 27001 Audit Trail)</span>
					</h3>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">
						Catatan immutable untuk setiap akses lihat, unduh, modifikasi, perpanjangan, dan mutasi fisik.
					</p>
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs border-collapse">
					<thead>
						<tr class="border-b border-slate-200 dark:border-slate-800 text-on-surface-variant font-bold uppercase tracking-wider">
							<th class="py-3 px-4">Waktu</th>
							<th class="py-3 px-4">Tindakan (Action)</th>
							<th class="py-3 px-4">Pengguna</th>
							<th class="py-3 px-4">Detail Aktivitas</th>
							<th class="py-3 px-4">IP Address</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
						{#each auditLogs as log}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3 px-4 font-mono text-on-surface-variant">{formatDateTimeId(log.created_at)}</td>
								<td class="py-3 px-4 font-bold">
									<span class="px-2 py-0.5 rounded text-[10px] font-black uppercase {log.action === 'CREATE' ? 'bg-blue-100 text-blue-800' : log.action === 'RENEW' ? 'bg-amber-100 text-amber-800' : log.action === 'VIEW' ? 'bg-slate-100 text-slate-800' : 'bg-emerald-100 text-emerald-800'}">
										{log.action}
									</span>
								</td>
								<td class="py-3 px-4 font-bold text-on-surface">{log.user_name || 'Staff ERP'}</td>
								<td class="py-3 px-4 text-on-surface-variant font-mono text-[11px] max-w-sm truncate">
									{log.details ? JSON.stringify(log.details) : '-'}
								</td>
								<td class="py-3 px-4 text-on-surface-variant font-mono">{log.ip_address || '127.0.0.1'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<!-- MODAL 1: Secure Watermarked Viewer -->
<DmsSecureViewer
	bind:isOpen={isViewerOpen}
	filePath={doc.file_path || ''}
	docTitle={doc.title}
	docNumber={doc.doc_number || ''}
	userName="Staff ERP BCS"
/>

<!-- MODAL 2: Printable QR Label -->
<DmsQrLabelModal
	bind:isOpen={isQrModalOpen}
	qrCodeId={doc.qr_code_id || ''}
	docTitle={doc.title}
	docNumber={doc.doc_number || ''}
	entityName={entityDisplayName}
	filingLocation={doc.filing_location_name ? `${doc.filing_location_code} - ${doc.filing_location_name}` : ''}
	expiryDate={formatDateId(doc.expiry_date)}
/>

<!-- MODAL 3: Renewal & Versioning -->
{#if isRenewModalOpen}
	<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest dark:bg-surface-container-low rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-5">
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">history_edu</span>
					<h3 class="text-base font-extrabold text-on-surface">Perpanjang Dokumen / Addendum</h3>
				</div>
				<button type="button" onclick={() => isRenewModalOpen = false} class="text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/renewDoc"
				enctype="multipart/form-data"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							isRenewModalOpen = false;
							window.location.reload();
						} else {
							alert(result.data?.message || 'Gagal memperpanjang dokumen');
						}
					};
				}}
				class="space-y-4"
			>
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Nomor Dokumen Baru</label>
					<input
						type="text"
						name="doc_number"
						bind:value={renewState.doc_number}
						placeholder="Nomor baru jika berubah"
						class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-on-surface"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Tanggal Terbit Baru</label>
						<input
							type="date"
							name="issue_date"
							bind:value={renewState.issue_date}
							class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-on-surface"
						/>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Tanggal Jatuh Tempo Baru <span class="text-rose-500">*</span></label>
						<input
							type="date"
							name="expiry_date"
							required
							bind:value={renewState.expiry_date}
							class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-on-surface"
						/>
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Ringkasan Perubahan</label>
					<input
						type="text"
						name="change_summary"
						bind:value={renewState.change_summary}
						placeholder="Misal: Perpanjangan Uji KIR Semester 2 2026"
						class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-on-surface"
					/>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Unggah PDF Baru</label>
					<input
						type="file"
						name="file_upload"
						accept=".pdf"
						class="w-full text-xs text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600"
					/>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button
						type="button"
						onclick={() => isRenewModalOpen = false}
						class="px-4 py-2 rounded-xl border text-xs font-bold"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
					>
						<span class="material-symbols-outlined text-base">save</span>
						<span>Simpan Snapshot Versi Baru</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL 4: Checkout Custody -->
{#if isCheckoutModalOpen}
	<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest dark:bg-surface-container-low rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-5">
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-orange-600">output</span>
					<h3 class="text-base font-extrabold text-on-surface">Catat Peminjaman Berkas Fisik</h3>
				</div>
				<button type="button" onclick={() => isCheckoutModalOpen = false} class="text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/checkoutCustody"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							isCheckoutModalOpen = false;
							window.location.reload();
						} else {
							alert(result.data?.message || 'Gagal mencatat peminjaman');
						}
					};
				}}
				class="space-y-4"
			>
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Nama Peminjam <span class="text-rose-500">*</span></label>
					<input
						type="text"
						name="borrower_name"
						required
						bind:value={checkoutState.borrower_name}
						placeholder="Nama staff atau driver peminjam"
						class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-on-surface"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Tanggal Pinjam</label>
						<input
							type="date"
							name="borrow_date"
							bind:value={checkoutState.borrow_date}
							class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-on-surface"
						/>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Target Pengembalian</label>
						<input
							type="date"
							name="expected_return_date"
							bind:value={checkoutState.expected_return_date}
							class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-on-surface"
						/>
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Keperluan Peminjaman <span class="text-rose-500">*</span></label>
					<input
						type="text"
						name="purpose"
						required
						bind:value={checkoutState.purpose}
						placeholder="Misal: Uji Berkala KIR / Sidang Tilang / Samsat"
						class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-on-surface"
					/>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button
						type="button"
						onclick={() => isCheckoutModalOpen = false}
						class="px-4 py-2 rounded-xl border text-xs font-bold"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
					>
						<span class="material-symbols-outlined text-base">check</span>
						<span>Konfirmasi Check-Out</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL 5: Checkin Custody -->
{#if isCheckinModalOpen}
	<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest dark:bg-surface-container-low rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-5">
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600">input</span>
					<h3 class="text-base font-extrabold text-on-surface">Konfirmasi Pengembalian Berkas Fisik</h3>
				</div>
				<button type="button" onclick={() => isCheckinModalOpen = false} class="text-slate-400 hover:text-slate-600">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/checkinCustody"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							isCheckinModalOpen = false;
							window.location.reload();
						} else {
							alert(result.data?.message || 'Gagal mengembalikan berkas');
						}
					};
				}}
				class="space-y-4"
			>
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Nama yang Mengembalikan</label>
					<input
						type="text"
						name="borrower_name"
						placeholder="Nama pengembali"
						class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-on-surface"
					/>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Tanggal Pengembalian Aktual</label>
					<input
						type="date"
						name="actual_return_date"
						value={new Date().toISOString().slice(0, 10)}
						class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-on-surface"
					/>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Kondisi Berkas / Catatan</label>
					<textarea
						name="notes"
						rows="2"
						placeholder="Kondisi berkas lengkap dan telah disimpan kembali ke lemari rak"
						class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-on-surface"
					></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button
						type="button"
						onclick={() => isCheckinModalOpen = false}
						class="px-4 py-2 rounded-xl border text-xs font-bold"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
					>
						<span class="material-symbols-outlined text-base">check_circle</span>
						<span>Konfirmasi Masuk Lemari (Check-In)</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
