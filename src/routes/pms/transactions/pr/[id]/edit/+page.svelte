<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNumber } from '$lib/utils/pms';
	import SearchableSelect from '$lib/components/SearchableSelect.svelte';
	import { ORDER_TYPES } from '$lib/utils/pmsNumbering';

	let { data, form } = $props();
	let isSubmitting = $state(false);

	let prNumber = $state(data.pr.prNumber || '');
	let date = $state(data.pr.date || new Date().toISOString().split('T')[0]);
	let requiredDate = $state(data.pr.requiredDate || '');
	let orderType = $state(data.pr.orderType || 'RO');
	let department = $state(data.pr.department || 'General');
	let requestedBy = $state(data.pr.requestedBy || '');
	let projectId = $state(data.pr.projectId ? data.pr.projectId.toString() : '');
	let siteId = $state(data.pr.siteId ? data.pr.siteId.toString() : '');
	let notes = $state(data.pr.notes || '');

	let selectedSite = $derived(data.sites?.find((s: any) => String(s.id) === String(siteId)));

	const orderTypeOpts = ORDER_TYPES.map(t => ({
		value: t.value,
		label: t.label,
		sublabel: t.desc
	}));

	let deptOpts = $derived([
		{ value: '', label: '-- Pilih Departemen --' },
		...(data.departments || []).map((d: any) => ({
			value: d.dept_name,
			label: d.dept_name,
			sublabel: `Kode: ${d.dept_code} | Alias: ${d.alias || '-'}`,
			searchTerms: `${d.dept_name} ${d.dept_code} ${d.alias || ''}`
		}))
	]);

	let projectOpts = $derived([
		{ value: '', label: '-- Bebas / Non-Project --' },
		...data.projects.map((p: any) => ({
			value: p.id,
			label: p.project_name,
			sublabel: `Kode: ${p.project_code || '-'} | Alias: ${p.alias || '-'}`
		}))
	]);

	let siteOpts = $derived([
		{ value: '', label: '-- Pilih Lokasi Site Tujuan --' },
		...data.sites.map((s: any) => ({
			value: s.id,
			label: s.contact_person ? `${s.loc_name} - ${s.contact_person}` : `${s.loc_name} - (Tanpa PIC)`,
			sublabel: `Kode: ${s.loc_code || '-'} | Alias: ${s.alias || '-'} | Kota: ${s.city || '-'}`,
			searchTerms: `${s.loc_name} ${s.contact_person || ''} ${s.alias || ''} ${s.city || ''}`
		}))
	]);

	let materialOpts = $derived(
		data.materials.map((m: any) => ({
			value: m.id,
			label: `${m.name} (${m.uom})`,
			sublabel: m.spec && m.spec !== '-' ? m.spec : undefined,
			searchTerms: `${m.spec || ''} ${m.material_code || ''} ${m.brand || ''} ${m.part_no || ''}`
		}))
	);

	// Line items
	let items = $state<Array<{
		material_id: number;
		material_code: string;
		name: string;
		spec: string;
		uom: string;
		stock: number;
		qty: number;
		remarks: string;
	}>>((data.items || []).map((itm: any) => ({
		material_id: itm.material_id,
		material_code: itm.material_code,
		name: itm.name,
		spec: itm.spec || '-',
		uom: itm.uom || 'Pcs',
		stock: parseFloat(itm.stock) || 0,
		qty: parseFloat(itm.qty) || 1,
		remarks: itm.remarks || ''
	})));

	let selectedMaterialId = $state('');

	function addItem() {
		if (!selectedMaterialId) return;
		const mat = data.materials.find((m: any) => m.id === parseInt(selectedMaterialId));
		if (!mat) return;

		const exists = items.find(i => i.material_id === mat.id);
		if (exists) {
			exists.qty += 1;
			selectedMaterialId = '';
			return;
		}

		items.push({
			material_id: mat.id,
			material_code: mat.material_code,
			name: mat.name,
			spec: mat.spec || '-',
			uom: mat.uom || 'Pcs',
			stock: parseFloat(mat.stock) || 0,
			qty: 1,
			remarks: ''
		});

		selectedMaterialId = '';
	}

	function removeItem(idx: number) {
		items.splice(idx, 1);
	}
</script>

<svelte:head>
	<title>Edit PR {data.pr.prNumber} | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6 max-w-5xl mx-auto">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<a href="/pms/transactions/pr/{data.pr.id}" class="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">arrow_back</span>
				</a>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Edit Purchase Request</h1>
				<span class="font-mono font-bold text-amber-700 dark:text-amber-300 text-sm bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
					{data.pr.prNumber}
				</span>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5 ml-8">
				Perbarui rincian kebutuhan barang, alokasi project, atau jumlah kuantitas
			</p>
		</div>
	</header>

	{#if form?.message}
		<div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
			<span class="material-symbols-outlined text-lg">error</span>
			<span>{form.message}</span>
		</div>
	{/if}

	<form method="POST" action="?/update" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			isSubmitting = false;
			await update();
		};
	}}>
		<input type="hidden" name="items" value={JSON.stringify(items)} />

		<div class="space-y-6">
			<!-- Section 1: Informasi Header -->
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60 pb-3 flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">info</span>
					<span>Informasi Dasar PR</span>
				</h3>

				<!-- Row 1: Tanggal, Target, Tipe Order -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Tanggal Pengajuan <span class="text-rose-500">*</span>
						</label>
						<input
							type="date"
							name="date"
							required
							bind:value={date}
							class="w-full h-10 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3.5 text-xs font-normal focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
						/>
					</div>

					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Target Dibutuhkan
						</label>
						<input
							type="date"
							name="requiredDate"
							bind:value={requiredDate}
							class="w-full h-10 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3.5 text-xs font-normal focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
						/>
					</div>

					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Tipe Order <span class="text-rose-500">*</span>
						</label>
						<SearchableSelect
							name="orderType"
							options={orderTypeOpts}
							bind:value={orderType}
							placeholder="-- Pilih Tipe Order --"
							required
							btnClass="bg-surface border-slate-200 dark:border-slate-700 text-xs font-normal"
						/>
					</div>
				</div>

				<!-- Row 2: Pemohon, Departemen, Project, Site -->
				<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Nama Pemohon <span class="text-rose-500">*</span>
						</label>
						<input
							type="text"
							name="requestedBy"
							required
							bind:value={requestedBy}
							placeholder="Nama staf / mekanik pemohon"
							class="w-full h-10 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3.5 text-xs font-normal focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
						/>
					</div>

					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Departemen Pemohon <span class="text-rose-500">*</span>
						</label>
						<SearchableSelect
							name="department"
							options={deptOpts}
							bind:value={department}
							placeholder="-- Pilih Departemen --"
							required
							btnClass="bg-surface border-slate-200 dark:border-slate-700 text-xs font-normal"
						/>
					</div>

					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Alokasi Project
						</label>
						<SearchableSelect
							name="projectId"
							options={projectOpts}
							bind:value={projectId}
							placeholder="-- Bebas / Non-Project --"
							btnClass="bg-surface border-slate-200 dark:border-slate-700 text-xs font-normal"
						/>
					</div>

					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Site Tujuan
						</label>
						<SearchableSelect
							name="siteId"
							options={siteOpts}
							bind:value={siteId}
							placeholder="-- Pilih Site Tujuan --"
							btnClass="bg-surface border-slate-200 dark:border-slate-700 text-xs font-normal"
						/>
					</div>
				</div>

				<!-- Info Card PIC Site Tujuan jika dipilih -->
				{#if selectedSite}
					<div class="p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 flex items-start gap-3 text-xs">
						<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 mt-0.5 text-lg">location_on</span>
						<div class="flex-1 space-y-1">
							<div class="flex items-center gap-2 font-bold text-on-surface">
								<span>Site: {selectedSite.loc_name}</span>
								{#if selectedSite.alias}
									<span class="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold">Alias: {selectedSite.alias}</span>
								{/if}
								{#if selectedSite.loc_code}
									<span class="text-on-surface-variant font-mono text-[10px]">({selectedSite.loc_code})</span>
								{/if}
							</div>
							<div class="text-on-surface-variant grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11px]">
								<div><span class="font-semibold text-on-surface">PIC Site:</span> {selectedSite.contact_person || 'Belum diatur'}</div>
								<div><span class="font-semibold text-on-surface">No. Telepon / HP:</span> {selectedSite.phone || '-'}</div>
								<div><span class="font-semibold text-on-surface">Kota:</span> {selectedSite.city || '-'}</div>
								{#if selectedSite.address_1}
									<div class="sm:col-span-3 text-[11px]"><span class="font-semibold text-on-surface">Alamat Pengiriman:</span> {selectedSite.address_1}</div>
								{/if}
							</div>
						</div>
					</div>
				{/if}

				<div>
					<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
						Catatan Tambahan
					</label>
					<textarea
						name="notes"
						bind:value={notes}
						rows="2"
						placeholder="Keterangan peruntukan atau alasan perubahan..."
						class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-3 text-xs font-normal focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none transition-all"
					></textarea>
				</div>
			</div>

			<!-- Section 2: Line Items -->
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
					<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-600">format_list_bulleted</span>
						<span>Daftar Item Material ({items.length})</span>
					</h3>

					<div class="flex items-center gap-2 min-w-[280px] sm:min-w-[360px]">
						<SearchableSelect
							options={materialOpts}
							bind:value={selectedMaterialId}
							placeholder="-- Cari & Tambah Material --"
							btnClass="bg-surface border-slate-200 dark:border-slate-700 text-xs font-normal"
						/>
						<button
							type="button"
							onclick={addItem}
							disabled={!selectedMaterialId}
							class="h-10 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
						>
							<span class="material-symbols-outlined text-base">add</span>
							<span>Tambah</span>
						</button>
					</div>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm min-w-[650px]">
						<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
							<tr>
								<th class="py-3 px-3">Nama Material</th>
								<th class="py-3 px-3">Spesifikasi</th>
								<th class="py-3 px-3 text-center w-24">Stok Saat Ini</th>
								<th class="py-3 px-3 text-center w-28">Qty Diminta</th>
								<th class="py-3 px-3">Satuan</th>
								<th class="py-3 px-3">Catatan Item</th>
								<th class="py-3 px-3 text-center w-12">Hapus</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
							{#if items.length === 0}
								<tr>
									<td colspan="7" class="py-8 text-center text-on-surface-variant">
										<p class="text-xs font-semibold">Belum ada item material yang dimasukkan.</p>
										<p class="text-[11px] text-slate-400 mt-0.5">Pilih material dari dropdown di atas lalu klik Tambah.</p>
									</td>
								</tr>
							{:else}
								{#each items as item, idx}
									<tr>
										<td class="py-3 px-3 font-bold text-on-surface text-xs">
											{item.name}
										</td>
										<td class="py-3 px-3 text-on-surface-variant">{item.spec}</td>
										<td class="py-3 px-3 text-center font-mono text-on-surface-variant">
											{formatNumber(item.stock)}
										</td>
										<td class="py-3 px-3 text-center">
											<input
												type="number"
												min="1"
												step="any"
												bind:value={item.qty}
												class="w-20 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-lg px-2 py-1 text-center font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500 outline-none"
											/>
										</td>
										<td class="py-3 px-3 font-semibold">{item.uom}</td>
										<td class="py-3 px-3">
											<input
												type="text"
												bind:value={item.remarks}
												placeholder="Keterangan item (opsional)"
												class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
											/>
										</td>
										<td class="py-3 px-3 text-center">
											<button
												type="button"
												onclick={() => removeItem(idx)}
												class="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
											>
												<span class="material-symbols-outlined text-base">delete</span>
											</button>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 pt-2">
				<a
					href="/pms/transactions/pr/{data.pr.id}"
					class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors"
				>
					Batal
				</a>
				<button
					type="submit"
					disabled={isSubmitting || items.length === 0}
					class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
						<span>Menyimpan Perubahan...</span>
					{:else}
						<span class="material-symbols-outlined text-sm">save</span>
						<span>Simpan Perubahan PR</span>
					{/if}
				</button>
			</div>
		</div>
	</form>
</div>
