<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatRupiah, formatNumber } from '$lib/utils/pms';

	let { data } = $props();
	let isSubmitting = $state(false);

	let date = $state(new Date().toISOString().split('T')[0]);
	let vendorId = $state('');
	let projectId = $state(data.initialPR?.project_id ? data.initialPR.project_id.toString() : '');
	let siteId = $state(data.initialPR?.site_id ? data.initialPR.site_id.toString() : '');
	let category = $state(data.initialPR?.category || 'SUPPORTING');
	let shipmentDate = $state('');
	let shipmentLocation = $state('');
	let refNo = $state(data.initialPR?.pr_number ? `PR REF: ${data.initialPR.pr_number}` : '');
	let dueDate = $state('');
	let currency = $state('IDR');
	let discountPercent = $state(0);
	let vatPercent = $state(11);
	let notes = $state(data.initialPR?.notes || '');
	let wrsNotes = $state('');

	// Line items
	let items = $state<Array<{
		material_id: number;
		material_code: string;
		name: string;
		spec: string;
		uom: string;
		qty: number;
		unit_price: number;
		pr_line_id?: number;
	}>>([]);

	$effect(() => {
		if (data.initialItems && data.initialItems.length > 0 && items.length === 0) {
			items = data.initialItems.map((itm: any) => ({
				material_id: itm.item_id,
				material_code: itm.material_code,
				name: itm.name,
				spec: itm.spec || '-',
				uom: itm.uom || 'Pcs',
				qty: parseFloat(itm.qty_ordered) || 1,
				unit_price: parseFloat(itm.unit_price) || 0,
				pr_line_id: itm.pr_line_id
			}));
		}
	});

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
			qty: 1,
			unit_price: parseFloat(mat.standard_price) || 0
		});

		selectedMaterialId = '';
	}

	function removeItem(idx: number) {
		items.splice(idx, 1);
	}

	// Live Totals
	let subtotal = $derived.by(() => {
		return items.reduce((sum, itm) => sum + ((itm.qty || 0) * (itm.unit_price || 0)), 0);
	});

	let discountAmount = $derived((subtotal * (discountPercent || 0)) / 100);
	let netSubtotal = $derived(subtotal - discountAmount);
	let vatAmount = $derived((netSubtotal * (vatPercent || 0)) / 100);
	let grandTotal = $derived(netSubtotal + vatAmount);
</script>

<svelte:head>
	<title>Buat Purchase Order (PO) Baru | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6 max-w-5xl mx-auto">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<a href="/pms/transactions/po" class="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">arrow_back</span>
				</a>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Buat Purchase Order (PO)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5 ml-8">
				Formulir pesanan resmi pembelian barang dengan rincian vendor, pengiriman, diskon, dan PPN 11%
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
		<input type="hidden" name="prId" value={data.initialPR?.id || ''} />
		<input type="hidden" name="items" value={JSON.stringify(items)} />

		<div class="space-y-6">
			<!-- Section 1: Informasi Header PO -->
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60 pb-3 flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">shopping_cart</span>
					<span>Informasi Order & Vendor</span>
				</h3>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Pilih Vendor / Supplier <span class="text-rose-500">*</span>
						</label>
						<select
							name="vendorId"
							required
							bind:value={vendorId}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="">-- Pilih Vendor --</option>
							{#each data.vendors as v}
								<option value={v.id}>{v.nama_kustomer} ({v.kode_kustomer})</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Tanggal PO <span class="text-rose-500">*</span>
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
							Kategori Pengadaan <span class="text-rose-500">*</span>
						</label>
						<select
							name="category"
							bind:value={category}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="PACKAGING">Packaging</option>
							<option value="TRANSPORT">Transport</option>
							<option value="WAREHOUSE">Warehouse</option>
							<option value="SUPPORTING">Supporting</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Alokasi Project
						</label>
						<select
							name="projectId"
							bind:value={projectId}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="">-- Bebas / Non-Project --</option>
							{#each data.projects as p}
								<option value={p.id}>{p.project_name}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Site Penerima
						</label>
						<select
							name="siteId"
							bind:value={siteId}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="">-- Semua Site --</option>
							{#each data.sites as s}
								<option value={s.id}>{s.loc_name}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							No. Referensi / PR
						</label>
						<input
							type="text"
							name="refNo"
							bind:value={refNo}
							placeholder="No. Kontrak / PR"
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Jatuh Tempo Pembayaran
						</label>
						<input
							type="date"
							name="dueDate"
							bind:value={dueDate}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Target Tanggal Pengiriman
						</label>
						<input
							type="date"
							name="shipmentDate"
							bind:value={shipmentDate}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Alamat / Lokasi Pengiriman (Shipment Location)
						</label>
						<input
							type="text"
							name="shipmentLocation"
							bind:value={shipmentLocation}
							placeholder="Misal: Gudang Utama BCS Cilegon, Pool Merak"
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>
				</div>
			</div>

			<!-- Section 2: Line Items -->
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
					<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-600">format_list_bulleted</span>
						<span>Rincian Barang & Harga ({items.length})</span>
					</h3>

					<div class="flex items-center gap-2">
						<select
							bind:value={selectedMaterialId}
							class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 max-w-xs"
						>
							<option value="">-- Tambah Item Material --</option>
							{#each data.materials as mat}
								<option value={mat.id}>{mat.material_code} - {mat.name} ({mat.uom})</option>
							{/each}
						</select>
						<button
							type="button"
							onclick={addItem}
							disabled={!selectedMaterialId}
							class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1 shadow-xs"
						>
							<span class="material-symbols-outlined text-base">add</span>
							<span>Tambah</span>
						</button>
					</div>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm min-w-[750px]">
						<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
							<tr>
								<th class="py-3 px-3">Kode & Nama Material</th>
								<th class="py-3 px-3">Spesifikasi</th>
								<th class="py-3 px-3 text-center w-24">Qty Order</th>
								<th class="py-3 px-3">Satuan</th>
								<th class="py-3 px-3 text-right w-36">Harga Satuan (Rp)</th>
								<th class="py-3 px-3 text-right w-36">Total (Rp)</th>
								<th class="py-3 px-3 text-center w-12">Hapus</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
							{#if items.length === 0}
								<tr>
									<td colspan="7" class="py-8 text-center text-on-surface-variant">
										<p class="text-xs font-semibold">Belum ada item material dalam PO ini.</p>
										<p class="text-[11px] text-slate-400 mt-0.5">Pilih material dari dropdown di atas lalu klik Tambah.</p>
									</td>
								</tr>
							{:else}
								{#each items as item, idx}
									<tr>
										<td class="py-3 px-3">
											<span class="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs">{item.material_code}</span>
											<p class="font-bold text-on-surface text-xs">{item.name}</p>
										</td>
										<td class="py-3 px-3 text-on-surface-variant">{item.spec}</td>
										<td class="py-3 px-3 text-center">
											<input
												type="number"
												min="1"
												bind:value={item.qty}
												class="w-20 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-lg px-2 py-1 text-center font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500 outline-none"
											/>
										</td>
										<td class="py-3 px-3 font-semibold">{item.uom}</td>
										<td class="py-3 px-3 text-right">
											<input
												type="number"
												min="0"
												step="500"
												bind:value={item.unit_price}
												class="w-32 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-lg px-2 py-1 text-right font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500 outline-none"
											/>
										</td>
										<td class="py-3 px-3 text-right font-mono font-bold text-on-surface">
											{formatRupiah((item.qty || 0) * (item.unit_price || 0))}
										</td>
										<td class="py-3 px-3 text-center">
											<button
												type="button"
												onclick={() => removeItem(idx)}
												class="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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

				<!-- Kalkulasi Total Section -->
				<div class="border-t border-slate-200/60 dark:border-slate-800/60 pt-4 flex flex-col sm:flex-row justify-between items-start gap-6">
					<div class="space-y-3 w-full sm:w-1/2">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
								Catatan Pembelian (PO Notes)
							</label>
							<textarea
								name="notes"
								bind:value={notes}
								rows="2"
								placeholder="Instruksi penagihan, syarat pembayaran..."
								class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none resize-none"
							></textarea>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
								Catatan Penerimaan Gudang (WRS Note)
							</label>
							<input
								type="text"
								name="wrsNotes"
								bind:value={wrsNotes}
								placeholder="Catatan inspeksi saat barang tiba di gudang..."
								class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
					</div>

					<div class="w-full sm:w-80 bg-surface-container rounded-2xl p-4 space-y-2 border border-slate-200/60 dark:border-slate-800/60 font-medium text-xs">
						<div class="flex justify-between">
							<span class="text-on-surface-variant">Subtotal:</span>
							<span class="font-mono font-bold">{formatRupiah(subtotal)}</span>
						</div>

						<div class="flex items-center justify-between">
							<div class="flex items-center gap-1">
								<span class="text-on-surface-variant">Diskon (%):</span>
								<input
									type="number"
									min="0"
									max="100"
									name="discountPercent"
									bind:value={discountPercent}
									class="w-12 bg-surface border border-slate-200 dark:border-slate-700 rounded px-1 text-center font-bold font-mono text-[11px]"
								/>
							</div>
							<span class="font-mono text-rose-600">- {formatRupiah(discountAmount)}</span>
						</div>

						<div class="flex items-center justify-between">
							<div class="flex items-center gap-1">
								<span class="text-on-surface-variant">PPN (%):</span>
								<input
									type="number"
									min="0"
									max="100"
									name="vatPercent"
									bind:value={vatPercent}
									class="w-12 bg-surface border border-slate-200 dark:border-slate-700 rounded px-1 text-center font-bold font-mono text-[11px]"
								/>
							</div>
							<span class="font-mono font-bold text-on-surface">+ {formatRupiah(vatAmount)}</span>
						</div>

						<div class="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center text-sm font-black text-on-surface">
							<span>Total Nilai PO:</span>
							<span class="text-amber-600 dark:text-amber-400 font-mono text-base">{formatRupiah(grandTotal)}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 pt-2">
				<a href="/pms/transactions/po" class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">
					Batal
				</a>
				<button
					type="submit"
					disabled={isSubmitting || items.length === 0 || !vendorId}
					class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
						<span>Menerbitkan PO...</span>
					{:else}
						<span class="material-symbols-outlined text-sm">send</span>
						<span>Terbitkan Purchase Order</span>
					{/if}
				</button>
			</div>
		</div>
	</form>
</div>
