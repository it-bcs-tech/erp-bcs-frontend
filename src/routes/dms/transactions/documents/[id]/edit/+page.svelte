<script lang="ts">
	import { enhance } from '$app/forms';
	import SearchableSelect from '$lib/components/SearchableSelect.svelte';
	import type { DMSEntityType } from '$lib/types/dms';
	import { getStatusInfo } from '$lib/utils/dms';

	let { data } = $props();
	let doc = data.doc;

	// Extract initial metadata
	let initialMetadataList: { key: string; value: string }[] = [];
	if (doc.metadata && typeof doc.metadata === 'object') {
		initialMetadataList = Object.entries(doc.metadata).map(([k, v]) => ({
			key: k,
			value: String(v ?? '')
		}));
	}

	let formState = $state({
		doc_number: doc.doc_number || '',
		doc_type_id: doc.doc_type_id || '',
		title: doc.title || '',
		entity_type: (doc.entity_type || 'CORPORATE') as DMSEntityType,
		partner_id: doc.partner_id || '',
		asset_id: doc.asset_id ? String(doc.asset_id) : '',
		employee_id: doc.employee_id ? String(doc.employee_id) : '',
		notary_id: doc.notary_id || '',
		issuer_id: doc.issuer_id || '',
		issue_date: doc.issue_date_str || '',
		expiry_date: doc.expiry_date_str || '',
		status: doc.status || 'ACTIVE',
		filing_location_id: doc.filing_location_id || '',
		notes: doc.notes || '',
		metadataList: initialMetadataList
	});

	let isSubmitting = $state(false);
	let fileInputRef: HTMLInputElement | null = $state(null);
	let selectedFileName = $state('');

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			selectedFileName = target.files[0].name;
		} else {
			selectedFileName = '';
		}
	}

	function addMetadataRow() {
		formState.metadataList = [...formState.metadataList, { key: '', value: '' }];
	}

	function removeMetadataRow(index: number) {
		formState.metadataList = formState.metadataList.filter((_, i) => i !== index);
	}

	// Live Expiry Preview
	let expiryPreview = $derived.by(() => {
		if (!formState.expiry_date) return null;
		const exp = new Date(formState.expiry_date);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		exp.setHours(0, 0, 0, 0);
		const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

		let gate: any = 'VALID';
		let status: any = formState.status;
		if (diff < 0) {
			gate = 'EXPIRED';
			status = 'EXPIRED';
		} else if (diff <= 7) {
			gate = 'URGENT_7';
			status = 'EXPIRING_SOON';
		} else if (diff <= 30) {
			gate = 'CRITICAL_30';
			status = 'EXPIRING_SOON';
		} else if (diff <= 60) {
			gate = 'WARNING_60';
			status = 'EXPIRING_SOON';
		}

		const info = getStatusInfo(status, gate, diff);
		return { diff, info };
	});

	// Select Options
	const typeOpts = data.docTypes.map((d: any) => ({ value: d.id, label: `${d.code} - ${d.name}` }));
	const partnerOpts = data.partners.map((p: any) => ({ value: p.id, label: p.name }));
	const assetOpts = data.assets.map((a: any) => ({ value: String(a.id), label: `${a.name} (${a.business_unit || 'Unit'})` }));
	const driverOpts = data.drivers.map((d: any) => ({ value: String(d.id), label: `${d.name} ${d.payroll_id ? `[${d.payroll_id}]` : ''}` }));
	const notaryOpts = data.notaries.map((n: any) => ({ value: n.id, label: n.name }));
	const issuerOpts = data.issuers.map((i: any) => ({ value: i.id, label: `${i.name} (${i.type || 'Penerbit'})` }));
	const locationOpts = data.locations.map((l: any) => ({ value: l.id, label: `${l.code} - ${l.name}` }));

	// Prepare payload with compiled metadata object
	let payloadJson = $derived.by(() => {
		const metaObj: Record<string, string> = {};
		for (const item of formState.metadataList) {
			if (item.key.trim()) {
				metaObj[item.key.trim()] = item.value;
			}
		}
		return JSON.stringify({
			doc_number: formState.doc_number,
			doc_type_id: formState.doc_type_id,
			title: formState.title,
			entity_type: formState.entity_type,
			partner_id: formState.entity_type === 'CUSTOMER' ? formState.partner_id : null,
			asset_id: formState.entity_type === 'FLEET' ? formState.asset_id : null,
			employee_id: formState.entity_type === 'DRIVER' ? formState.employee_id : null,
			notary_id: formState.notary_id || null,
			issuer_id: formState.issuer_id || null,
			issue_date: formState.issue_date || null,
			expiry_date: formState.expiry_date || null,
			status: formState.status,
			filing_location_id: formState.filing_location_id || null,
			notes: formState.notes || null,
			metadata: Object.keys(metaObj).length > 0 ? metaObj : null
		});
	});
</script>

<svelte:head>
	<title>Edit Dokumen: {doc.title} | DMS | ERP BCS</title>
</svelte:head>

<div class="px-4 md:px-8 py-8 w-full max-w-6xl mx-auto space-y-6">
	<!-- Top Header -->
	<header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<a
				href="/dms/transactions/documents/{doc.id}"
				class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 mb-1.5"
			>
				<span class="material-symbols-outlined text-[16px]">arrow_back</span>
				Kembali ke Detail Dokumen
			</a>
			<h1 class="text-2xl md:text-3xl font-black text-on-surface tracking-tight">
				Edit Dokumen & Metadata
			</h1>
			<p class="text-xs md:text-sm text-on-surface-variant font-medium mt-0.5">
				ID: {doc.id} &bull; QR Tag: {doc.qr_code_id || '-'}
			</p>
		</div>
	</header>

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ result }) => {
				isSubmitting = false;
				if (result.type === 'success' && result.data?.success) {
					window.location.href = `/dms/transactions/documents/${doc.id}`;
				} else {
					alert(result.data?.message || 'Gagal memperbarui dokumen');
				}
			};
		}}
		class="space-y-6"
	>
		<input type="hidden" name="payload" value={payloadJson} />

		<!-- 1. Entity Type -->
		<div class="bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs">
			<div class="flex items-center gap-2 mb-4">
				<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400">hub</span>
				<h3 class="text-base font-extrabold text-on-surface">Tipe Entitas Pemilik Dokumen</h3>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				<button
					type="button"
					onclick={() => formState.entity_type = 'FLEET'}
					class="p-4 rounded-2xl border text-left transition-all flex flex-col justify-between {formState.entity_type === 'FLEET'
						? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 ring-2 ring-sky-500/20'
						: 'border-slate-200 dark:border-slate-800 bg-surface-container-low'}"
				>
					<div class="flex items-center justify-between mb-2">
						<span class="material-symbols-outlined text-2xl text-sky-600">local_shipping</span>
						<span class="w-4 h-4 rounded-full border-2 flex items-center justify-center {formState.entity_type === 'FLEET' ? 'border-sky-600 bg-sky-600' : 'border-slate-300'}">
							{#if formState.entity_type === 'FLEET'}<span class="w-1.5 h-1.5 bg-white rounded-full"></span>{/if}
						</span>
					</div>
					<div>
						<h4 class="text-sm font-bold text-on-surface">Armada / Truk</h4>
						<p class="text-[11px] text-on-surface-variant mt-0.5">STNK, KIR, BPKB, Polis Asuransi Unit</p>
					</div>
				</button>

				<button
					type="button"
					onclick={() => formState.entity_type = 'DRIVER'}
					class="p-4 rounded-2xl border text-left transition-all flex flex-col justify-between {formState.entity_type === 'DRIVER'
						? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
						: 'border-slate-200 dark:border-slate-800 bg-surface-container-low'}"
				>
					<div class="flex items-center justify-between mb-2">
						<span class="material-symbols-outlined text-2xl text-indigo-600">airline_seat_recline_normal</span>
						<span class="w-4 h-4 rounded-full border-2 flex items-center justify-center {formState.entity_type === 'DRIVER' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}">
							{#if formState.entity_type === 'DRIVER'}<span class="w-1.5 h-1.5 bg-white rounded-full"></span>{/if}
						</span>
					</div>
					<div>
						<h4 class="text-sm font-bold text-on-surface">Driver Operasional</h4>
						<p class="text-[11px] text-on-surface-variant mt-0.5">SIM, SIO, KTP, MCU, Kontrak</p>
					</div>
				</button>

				<button
					type="button"
					onclick={() => formState.entity_type = 'CUSTOMER'}
					class="p-4 rounded-2xl border text-left transition-all flex flex-col justify-between {formState.entity_type === 'CUSTOMER'
						? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 ring-2 ring-teal-500/20'
						: 'border-slate-200 dark:border-slate-800 bg-surface-container-low'}"
				>
					<div class="flex items-center justify-between mb-2">
						<span class="material-symbols-outlined text-2xl text-teal-600">handshake</span>
						<span class="w-4 h-4 rounded-full border-2 flex items-center justify-center {formState.entity_type === 'CUSTOMER' ? 'border-teal-600 bg-teal-600' : 'border-slate-300'}">
							{#if formState.entity_type === 'CUSTOMER'}<span class="w-1.5 h-1.5 bg-white rounded-full"></span>{/if}
						</span>
					</div>
					<div>
						<h4 class="text-sm font-bold text-on-surface">Mitra / Customer</h4>
						<p class="text-[11px] text-on-surface-variant mt-0.5">SPK, Kontrak Kerjasama</p>
					</div>
				</button>

				<button
					type="button"
					onclick={() => formState.entity_type = 'CORPORATE'}
					class="p-4 rounded-2xl border text-left transition-all flex flex-col justify-between {formState.entity_type === 'CORPORATE'
						? 'border-violet-500 bg-violet-50/60 dark:bg-violet-950/40 ring-2 ring-violet-500/20'
						: 'border-slate-200 dark:border-slate-800 bg-surface-container-low'}"
				>
					<div class="flex items-center justify-between mb-2">
						<span class="material-symbols-outlined text-2xl text-violet-600">corporate_fare</span>
						<span class="w-4 h-4 rounded-full border-2 flex items-center justify-center {formState.entity_type === 'CORPORATE' ? 'border-violet-600 bg-violet-600' : 'border-slate-300'}">
							{#if formState.entity_type === 'CORPORATE'}<span class="w-1.5 h-1.5 bg-white rounded-full"></span>{/if}
						</span>
					</div>
					<div>
						<h4 class="text-sm font-bold text-on-surface">Korporat / Umum</h4>
						<p class="text-[11px] text-on-surface-variant mt-0.5">Legal Perusahaan, Sertifikasi ISO</p>
					</div>
				</button>
			</div>

			<div class="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/80">
				{#if formState.entity_type === 'FLEET'}
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Pilih Unit Armada (FMS)
						</label>
						<SearchableSelect options={assetOpts} bind:value={formState.asset_id} placeholder="-- Pilih Unit Armada --" />
					</div>
				{:else if formState.entity_type === 'DRIVER'}
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Pilih Driver Operasional (HRIS)
						</label>
						<SearchableSelect options={driverOpts} bind:value={formState.employee_id} placeholder="-- Pilih Driver --" />
					</div>
				{:else if formState.entity_type === 'CUSTOMER'}
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Pilih Mitra / Customer
						</label>
						<SearchableSelect options={partnerOpts} bind:value={formState.partner_id} placeholder="-- Pilih Mitra --" />
					</div>
				{/if}
			</div>
		</div>

		<!-- 2. Basic Info -->
		<div class="bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs space-y-5">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400">description</span>
				<h3 class="text-base font-extrabold text-on-surface">Informasi Legalitas & Judul Dokumen</h3>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
						Tipe Dokumen <span class="text-rose-500">*</span>
					</label>
					<SearchableSelect options={typeOpts} bind:value={formState.doc_type_id} placeholder="-- Pilih Jenis Dokumen --" />
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
						Nomor Resmi Dokumen
					</label>
					<input
						type="text"
						bind:value={formState.doc_number}
						class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200/80 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface focus:ring-2 focus:ring-indigo-500 focus:outline-none"
					/>
				</div>

				<div class="md:col-span-2">
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
						Judul Dokumen <span class="text-rose-500">*</span>
					</label>
					<input
						type="text"
						bind:value={formState.title}
						required
						class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200/80 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface focus:ring-2 focus:ring-indigo-500 focus:outline-none"
					/>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
						Instansi Penerbit
					</label>
					<SearchableSelect options={issuerOpts} bind:value={formState.issuer_id} placeholder="-- Pilih Penerbit --" />
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
						Notaris Pembuat Akta
					</label>
					<SearchableSelect options={notaryOpts} bind:value={formState.notary_id} placeholder="-- Pilih Notaris --" />
				</div>
			</div>
		</div>

		<!-- 3. Expiry & Storage Location -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<div class="bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs space-y-4">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400">event_repeat</span>
					<h3 class="text-base font-extrabold text-on-surface">Masa Berlaku</h3>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Tanggal Terbit
						</label>
						<input
							type="date"
							bind:value={formState.issue_date}
							class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200/80 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface focus:ring-2 focus:ring-indigo-500 focus:outline-none"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Tanggal Jatuh Tempo
						</label>
						<input
							type="date"
							bind:value={formState.expiry_date}
							class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200/80 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface focus:ring-2 focus:ring-indigo-500 focus:outline-none"
						/>
					</div>
				</div>

				{#if expiryPreview}
					<div class="p-3.5 rounded-xl border flex items-center justify-between {expiryPreview.info.badgeClass}">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-lg">{expiryPreview.info.icon}</span>
							<span class="text-xs font-bold">{expiryPreview.info.label}</span>
						</div>
						<span class="text-[11px] font-bold">
							{#if expiryPreview.diff < 0}
								Kadaluarsa {Math.abs(expiryPreview.diff)} hari lalu
							{:else}
								Sisa {expiryPreview.diff} hari lagi
							{/if}
						</span>
					</div>
				{/if}
			</div>

			<div class="bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs space-y-4">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400">inventory_2</span>
					<h3 class="text-base font-extrabold text-on-surface">Penyimpanan Fisik</h3>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
						Lemari / Rak Arsip
					</label>
					<SearchableSelect options={locationOpts} bind:value={formState.filing_location_id} placeholder="-- Pilih Lokasi --" />
				</div>
			</div>
		</div>

		<!-- 4. Replace File & Notes -->
		<div class="bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs space-y-5">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400">upload_file</span>
				<h3 class="text-base font-extrabold text-on-surface">Ganti Berkas Digital (Opsional)</h3>
			</div>

			{#if doc.file_path}
				<div class="p-3 bg-surface-container-low rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-indigo-600 text-lg">picture_as_pdf</span>
						<span class="text-xs font-bold text-on-surface">File Saat Ini: {doc.file_path}</span>
					</div>
					<span class="text-[11px] text-emerald-600 font-bold">Tersimpan</span>
				</div>
			{/if}

			<div>
				<input
					type="file"
					name="file_upload"
					accept=".pdf,application/pdf"
					bind:this={fileInputRef}
					onchange={handleFileChange}
					class="hidden"
				/>
				<div
					onclick={() => fileInputRef?.click()}
					class="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-5 text-center cursor-pointer transition-colors bg-surface-container-low"
				>
					<span class="material-symbols-outlined text-3xl text-indigo-600 mb-1">cloud_upload</span>
					<h4 class="text-xs font-bold text-on-surface">
						{selectedFileName ? selectedFileName : 'Klik untuk mengunggah file baru pengganti'}
					</h4>
				</div>
			</div>

			<div>
				<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
					Catatan Tambahan
				</label>
				<textarea
					bind:value={formState.notes}
					rows="3"
					class="w-full bg-surface-container-low dark:bg-surface-container-high border border-slate-200/80 dark:border-slate-700 rounded-xl p-4 text-sm font-medium text-on-surface focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
				></textarea>
			</div>
		</div>

		<!-- 5. Metadata -->
		<div class="bg-surface-container-lowest dark:bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400">tune</span>
					<h3 class="text-base font-extrabold text-on-surface">Atribut Tambahan (Custom Metadata)</h3>
				</div>
				<button
					type="button"
					onclick={addMetadataRow}
					class="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
				>
					<span class="material-symbols-outlined text-sm">add</span>
					Tambah Parameter
				</button>
			</div>

			{#if formState.metadataList.length > 0}
				<div class="space-y-2.5">
					{#each formState.metadataList as meta, i}
						<div class="flex items-center gap-3">
							<input
								type="text"
								bind:value={meta.key}
								placeholder="Nama Atribut"
								class="w-1/3 bg-surface-container-low dark:bg-surface-container-high border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-indigo-500 focus:outline-none"
							/>
							<input
								type="text"
								bind:value={meta.value}
								placeholder="Nilai Atribut"
								class="flex-1 bg-surface-container-low dark:bg-surface-container-high border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-on-surface focus:ring-2 focus:ring-indigo-500 focus:outline-none"
							/>
							<button
								type="button"
								onclick={() => removeMetadataRow(i)}
								class="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
							>
								<span class="material-symbols-outlined text-sm">delete</span>
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Submit -->
		<div class="flex justify-end gap-3 pt-2">
			<a
				href="/dms/transactions/documents/{doc.id}"
				class="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-on-surface text-sm font-bold hover:bg-surface-container-high transition-colors"
			>
				Batal
			</a>
			<button
				type="submit"
				disabled={isSubmitting}
				class="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-extrabold shadow-sm flex items-center gap-2 disabled:opacity-50"
			>
				{#if isSubmitting}
					<span class="material-symbols-outlined animate-spin text-lg">progress_activity</span>
					<span>Menyimpan Perubahan...</span>
				{:else}
					<span class="material-symbols-outlined text-lg">save</span>
					<span>Simpan Perubahan Dokumen</span>
				{/if}
			</button>
		</div>
	</form>
</div>
