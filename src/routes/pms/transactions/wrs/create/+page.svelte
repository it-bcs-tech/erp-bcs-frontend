<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { formatNumber } from '$lib/utils/pms';

	let { data } = $props();
	let isSubmitting = $state(false);

	let date = $state(new Date().toISOString().split('T')[0]);
	let selectedPOId = $state(data.initialPO?.id ? data.initialPO.id.toString() : '');
	let siteId = $state(data.initialPO?.site_id ? data.initialPO.site_id.toString() : '');
	let vendorDeliveryNumber = $state('');
	let receivedBy = $state('Petugas Gudang Cilegon');
	let notes = $state(data.initialPO?.wrs_notes || '');

	// Line items
	let items = $state<Array<{
		item_id: number;
		po_line_id: number;
		material_code: string;
		name: string;
		spec: string;
		uom: string;
		qty_ordered: number;
		qty_previously_received: number;
		qty_outstanding: number;
		qty_received: number;
	}>>([]);

	$effect(() => {
		if (data.poLines && data.poLines.length > 0) {
			items = data.poLines.map((l: any) => {
				const ordered = parseFloat(l.qty_ordered) || 0;
				const prev = parseFloat(l.qty_previously_received) || 0;
				const outstanding = Math.max(0, ordered - prev);
				return {
					item_id: l.item_id,
					po_line_id: l.po_line_id,
					material_code: l.material_code,
					name: l.name,
					spec: l.spec || '-',
					uom: l.uom || 'Pcs',
					qty_ordered: ordered,
					qty_previously_received: prev,
					qty_outstanding: outstanding,
					qty_received: outstanding // Default to remaining outstanding
				};
			});
		}
	});

	function handlePOChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		if (val) {
			goto(`/pms/transactions/wrs/create?po_id=${val}`);
		}
	}
</script>

<svelte:head>
	<title>Terima Barang (WRS / LPB) | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6 max-w-5xl mx-auto">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<a href="/pms/transactions/wrs" class="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">arrow_back</span>
				</a>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Terima Barang (WRS / LPB Gudang)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5 ml-8">
				Pencatatan penerimaan fisik barang gudang & sinkronisasi otomatis ke stok on-hand
			</p>
		</div>
	</header>

	<form method="POST" action="?/create" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			isSubmitting = false;
			await update();
		};
	}}>
		<input type="hidden" name="poId" value={selectedPOId} />
		<input type="hidden" name="items" value={JSON.stringify(items)} />

		<div class="space-y-6">
			<!-- Section 1: Informasi Penerimaan -->
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60 pb-3 flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">receipt_long</span>
					<span>Referensi Purchase Order & Gudang</span>
				</h3>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Pilih Purchase Order (PO) <span class="text-rose-500">*</span>
						</label>
						<select
							name="poSelect"
							required
							value={selectedPOId}
							onchange={handlePOChange}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none font-mono"
						>
							<option value="">-- Pilih PO Aktif --</option>
							{#each data.purchaseOrders as po}
								<option value={po.id}>{po.po_number} • {po.vendor_name} ({po.date})</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Tanggal Penerimaan <span class="text-rose-500">*</span>
						</label>
						<input
							type="date"
							name="date"
							required
							bind:value={date}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Lokasi Gudang Penerima <span class="text-rose-500">*</span>
						</label>
						<select
							name="siteId"
							bind:value={siteId}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						>
							{#each data.sites as s}
								<option value={s.id}>{s.loc_name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							No. Surat Jalan Vendor / Ekspedisi (Delivery Ref)
						</label>
						<input
							type="text"
							name="vendorDeliveryNumber"
							bind:value={vendorDeliveryNumber}
							placeholder="Misal: SJ-2026/08/9981"
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Penerima Barang (Received By) <span class="text-rose-500">*</span>
						</label>
						<input
							type="text"
							name="receivedBy"
							required
							bind:value={receivedBy}
							placeholder="Nama staf gudang pemeriksa"
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
						Catatan Kondisi Fisik Barang / WRS Notes
					</label>
					<textarea
						name="notes"
						bind:value={notes}
						rows="2"
						placeholder="Keterangan kondisi kemasan, segel, atau catatan pemeriksaan fisik..."
						class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none resize-none"
					></textarea>
				</div>
			</div>

			<!-- Section 2: Items Inspection Table -->
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60 pb-3 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-600">inventory</span>
						<span>Verifikasi Item Diterima ({items.length})</span>
					</div>
					{#if data.initialPO}
						<span class="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">
							PO: {data.initialPO.po_number} ({data.initialPO.vendor_name})
						</span>
					{/if}
				</h3>

				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm min-w-[750px]">
						<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
							<tr>
								<th class="py-3 px-3">Kode & Nama Material</th>
								<th class="py-3 px-3">Spesifikasi</th>
								<th class="py-3 px-3 text-center">Qty Dipesan</th>
								<th class="py-3 px-3 text-center">Telah Diterima</th>
								<th class="py-3 px-3 text-center">Sisa Outstanding</th>
								<th class="py-3 px-3 text-center w-32">Qty Diterima Saat Ini</th>
								<th class="py-3 px-3">Satuan</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
							{#if items.length === 0}
								<tr>
									<td colspan="7" class="py-8 text-center text-on-surface-variant">
										<p class="text-xs font-semibold">Silakan pilih Purchase Order di atas untuk memuat daftar barang yang akan diterima.</p>
									</td>
								</tr>
							{:else}
								{#each items as item}
									<tr>
										<td class="py-3 px-3">
											<span class="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs">{item.material_code}</span>
											<p class="font-bold text-on-surface text-xs">{item.name}</p>
										</td>
										<td class="py-3 px-3 text-on-surface-variant">{item.spec}</td>
										<td class="py-3 px-3 text-center font-mono font-semibold">
											{formatNumber(item.qty_ordered)}
										</td>
										<td class="py-3 px-3 text-center font-mono text-on-surface-variant">
											{formatNumber(item.qty_previously_received)}
										</td>
										<td class="py-3 px-3 text-center font-mono font-bold text-amber-600">
											{formatNumber(item.qty_outstanding)}
										</td>
										<td class="py-3 px-3 text-center">
											<input
												type="number"
												min="0"
												max={item.qty_outstanding}
												bind:value={item.qty_received}
												class="w-24 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-lg px-2 py-1 text-center font-mono font-black text-xs focus:ring-2 focus:ring-amber-500 outline-none"
											/>
										</td>
										<td class="py-3 px-3 font-semibold">{item.uom}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 pt-2">
				<a href="/pms/transactions/wrs" class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">
					Batal
				</a>
				<button
					type="submit"
					disabled={isSubmitting || items.length === 0 || !selectedPOId}
					class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
						<span>Memproses LPB & Update Stok...</span>
					{:else}
						<span class="material-symbols-outlined text-sm">inventory_2</span>
						<span>Simpan Penerimaan Gudang & Update Stok</span>
					{/if}
				</button>
			</div>
		</div>
	</form>
</div>
