<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNumber } from '$lib/utils/pms';
	import SearchableSelect from '$lib/components/SearchableSelect.svelte';

	let { data, form } = $props();
	let isSubmitting = $state(false);

	let date = $state(data.wrs.date || new Date().toISOString().split('T')[0]);
	let vendorDeliveryNumber = $state(data.wrs.vendorDeliveryNumber || '');
	let siteId = $state(data.wrs.siteId ? data.wrs.siteId.toString() : '');
	let notes = $state(data.wrs.notes || '');

	let siteOpts = $derived([
		{ value: '', label: '-- Semua Site / Gudang Pusat --' },
		...data.sites.map((s: any) => ({
			value: s.id,
			label: s.loc_name,
			sublabel: s.loc_code
		}))
	]);

	// Line items
	let items = $state<Array<{
		line_id: number;
		material_id: number;
		material_code: string;
		name: string;
		spec: string;
		uom: string;
		stock: number;
		qty: number;
		qtyOrdered?: number;
	}>>((data.items || []).map((itm: any) => ({
		line_id: itm.line_id,
		material_id: itm.material_id,
		material_code: itm.material_code,
		name: itm.name,
		spec: itm.spec || '-',
		uom: itm.uom || 'Pcs',
		stock: parseFloat(itm.stock) || 0,
		qty: parseFloat(itm.qty) || 0,
		qtyOrdered: itm.qtyOrdered != null ? parseFloat(itm.qtyOrdered) : undefined
	})));

	let totalReceived = $derived(
		items.reduce((sum, itm) => sum + (parseFloat(itm.qty.toString()) || 0), 0)
	);
</script>

<svelte:head>
	<title>Edit WRS {data.wrs.grNumber} | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6 max-w-5xl mx-auto">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<a href="/pms/transactions/wrs/{data.wrs.id}" class="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">arrow_back</span>
				</a>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Edit Penerimaan Barang (WRS)</h1>
				<span class="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
					{data.wrs.grNumber}
				</span>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5 ml-8">
				Perbarui nomor surat jalan vendor, tanggal penerimaan, atau koreksi kuantitas barang masuk
			</p>
		</div>
	</header>

	<!-- Stock correction notice alert -->
	<div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
		<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg shrink-0 mt-0.5">info</span>
		<div>
			<strong class="font-bold">Sinkronisasi Otomatis Stok:</strong>
			<p class="mt-0.5 text-[11px] leading-relaxed">
				Setiap perubahan kuantitas pada tabel barang di bawah akan langsung mengoreksi saldo on-hand stok gudang (<code class="font-mono font-bold">master.m_materials</code>) berdasarkan selisih (+/- delta) secara akurat.
			</p>
		</div>
	</div>

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
			<!-- Section 1: Informasi Penerimaan -->
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60 pb-3 flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600">receipt_long</span>
					<span>Informasi Dokumen Penerimaan</span>
				</h3>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Tanggal Penerimaan Fisik <span class="text-rose-500">*</span>
						</label>
						<input
							type="date"
							name="date"
							required
							bind:value={date}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-normal focus:ring-2 focus:ring-emerald-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							No. Surat Jalan Vendor / SJ
						</label>
						<input
							type="text"
							name="vendorDeliveryNumber"
							bind:value={vendorDeliveryNumber}
							placeholder="No. SJ dari supplier..."
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-normal focus:ring-2 focus:ring-emerald-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Site Gudang Penerima
						</label>
						<SearchableSelect
							name="siteId"
							options={siteOpts}
							bind:value={siteId}
							placeholder="-- Semua Site / Gudang Pusat --"
							btnClass="bg-surface border border-slate-200 dark:border-slate-700 text-xs font-normal"
						/>
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
						Catatan Penerimaan Gudang
					</label>
					<textarea
						name="notes"
						bind:value={notes}
						rows="2"
						placeholder="Catatan inspeksi fisik, kerusakan packing, nomor segel kontainer..."
						class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-3 text-xs font-normal focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
					></textarea>
				</div>
			</div>

			<!-- Section 2: Line Items -->
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<div class="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
					<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-600">inventory_2</span>
						<span>Kuantitas Barang Diterima ({items.length} item)</span>
					</h3>
					<span class="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
						Total Masuk: {formatNumber(totalReceived)} Satuan
					</span>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm min-w-[700px]">
						<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
							<tr>
								<th class="py-3 px-3">Kode & Nama Material</th>
								<th class="py-3 px-3">Spesifikasi</th>
								<th class="py-3 px-3 text-center w-28">Qty di PO</th>
								<th class="py-3 px-3 text-center w-36">Qty Diterima</th>
								<th class="py-3 px-3">Satuan</th>
								<th class="py-3 px-3 text-center w-32">Stok Saat Ini</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
							{#if items.length === 0}
								<tr>
									<td colspan="6" class="py-8 text-center text-on-surface-variant">
										Tidak ada item material dalam laporan penerimaan ini.
									</td>
								</tr>
							{:else}
								{#each items as item}
									<tr>
										<td class="py-3 px-3 font-bold text-on-surface text-xs">
											<span>{item.name}</span>
											<p class="text-[10px] text-on-surface-variant font-mono mt-0.5">{item.material_code}</p>
										</td>
										<td class="py-3 px-3 text-on-surface-variant">{item.spec}</td>
										<td class="py-3 px-3 text-center font-mono text-on-surface-variant">
											{item.qtyOrdered != null ? `${formatNumber(item.qtyOrdered)}` : '-'}
										</td>
										<td class="py-3 px-3 text-center">
											<input
												type="number"
												min="0"
												step="any"
												bind:value={item.qty}
												class="w-24 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-lg px-2 py-1 text-center font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
											/>
										</td>
										<td class="py-3 px-3 font-semibold">{item.uom}</td>
										<td class="py-3 px-3 text-center font-mono text-on-surface-variant">
											{formatNumber(item.stock)}
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
					href="/pms/transactions/wrs/{data.wrs.id}"
					class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors"
				>
					Batal
				</a>
				<button
					type="submit"
					disabled={isSubmitting || items.length === 0}
					class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
						<span>Menyimpan Perubahan...</span>
					{:else}
						<span class="material-symbols-outlined text-sm">save</span>
						<span>Simpan Perubahan WRS</span>
					{/if}
				</button>
			</div>
		</div>
	</form>
</div>
