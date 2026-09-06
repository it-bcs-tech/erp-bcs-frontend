<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatRupiah, formatNumber } from '$lib/utils/pms';

	let { data } = $props();
	let isModalOpen = $state(false);
	let isSubmitting = $state(false);
	let searchQuery = $state('');
	let selectedType = $state('');

	// Vendor price modal state
	let selectedMaterialForPrices = $state<any>(null);
	let isPriceModalOpen = $state(false);
	let isSavingPrice = $state(false);

	let filteredMaterials = $derived.by(() => {
		let list = data.materials || [];
		if (selectedType) {
			list = list.filter((m: any) => m.typeName === selectedType);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((m: any) =>
				(m.name && m.name.toLowerCase().includes(q)) ||
				(m.materialCode && m.materialCode.toLowerCase().includes(q)) ||
				(m.brand && m.brand.toLowerCase().includes(q)) ||
				(m.partNo && m.partNo.toLowerCase().includes(q)) ||
				(m.spec && m.spec.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>Master Material & Sparepart | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">category</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Master Material & Sparepart</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Katalog barang, spesifikasi teknis, part number, satuan (UOM), dan harga standar pengadaan
			</p>
		</div>
		<button
			type="button"
			onclick={() => isModalOpen = true}
			class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Tambah Material Baru</span>
		</button>
	</header>

	<!-- Search & Filter Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
		<div class="relative flex-1 w-full max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari kode material, nama barang, part no, atau brand..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>

		<div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
			<select
				bind:value={selectedType}
				class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			>
				<option value="">Semua Tipe Material</option>
				{#each data.types as t}
					<option value={t.name}>{t.name}</option>
				{/each}
			</select>

			<span class="text-xs font-medium text-on-surface-variant whitespace-nowrap">
				Total: <strong class="text-on-surface">{filteredMaterials.length}</strong> item
			</span>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-4">Kode Material</th>
						<th class="py-3.5 px-4">Nama Barang & Tipe</th>
						<th class="py-3.5 px-4">Spesifikasi / Part No</th>
						<th class="py-3.5 px-4">Brand</th>
						<th class="py-3.5 px-4">UOM</th>
						<th class="py-3.5 px-4 text-right">Harga Standar</th>
						<th class="py-3.5 px-4 text-center">Stok Gudang</th>
						<th class="py-3.5 px-4">Lokasi Rak</th>
						<th class="py-3.5 px-4 text-center">Harga Vendor</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredMaterials.length === 0}
						<tr>
							<td colspan="9" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">category</span>
								<p class="text-xs font-semibold">Tidak ada material yang cocok.</p>
							</td>
						</tr>
					{:else}
						{#each filteredMaterials as m}
							{@const vPriceCount = (data.vendorPrices || []).filter((vp: any) => vp.materialId === m.id).length}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-4">
									<span class="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs border border-amber-200 dark:border-amber-800">
										{m.materialCode}
									</span>
								</td>
								<td class="py-3.5 px-4">
									<p class="font-bold text-on-surface text-sm">{m.name}</p>
									<p class="text-[10px] text-on-surface-variant">{m.typeName}</p>
								</td>
								<td class="py-3.5 px-4">
									<p class="text-on-surface">{m.spec}</p>
									{#if m.partNo !== '-'}
										<p class="text-[10px] font-mono text-on-surface-variant">P/N: {m.partNo}</p>
									{/if}
								</td>
								<td class="py-3.5 px-4 font-semibold text-on-surface">{m.brand}</td>
								<td class="py-3.5 px-4">
									<span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-on-surface-variant">
										{m.uom}
									</span>
								</td>
								<td class="py-3.5 px-4 text-right font-mono font-semibold text-on-surface">
									{formatRupiah(m.standardPrice)}
								</td>
								<td class="py-3.5 px-4 text-center">
									<span class="px-2.5 py-1 rounded-lg font-bold font-mono text-xs {m.stock <= m.minStock ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
										{formatNumber(m.stock)}
									</span>
								</td>
								<td class="py-3.5 px-4 text-on-surface-variant">{m.locationName}</td>
								<td class="py-3.5 px-4 text-center">
									<button
										type="button"
										onclick={() => {
											selectedMaterialForPrices = m;
											isPriceModalOpen = true;
										}}
										class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-bold text-[10px] hover:bg-amber-100 cursor-pointer transition-colors"
									>
										<span class="material-symbols-outlined text-[14px]">price_change</span>
										<span>{vPriceCount > 0 ? `${vPriceCount} Vendor` : 'Atur Harga'}</span>
									</button>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Modal Tambah Material -->
{#if isModalOpen}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">category</span>
					<h3 class="text-base font-extrabold text-on-surface">Tambah Material Baru</h3>
				</div>
				<button type="button" onclick={() => isModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/save" use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						isModalOpen = false;
						update();
					} else {
						alert(result.data?.message || 'Terjadi kesalahan');
					}
				};
			}}>
				<div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Kode Material
							</label>
							<input
								type="text"
								name="materialCode"
								placeholder="MAT-001 (Opsional)"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none uppercase"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Tipe Material
							</label>
							<select
								name="typeCode"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								{#each data.types as t}
									<option value={t.code}>{t.name}</option>
								{/each}
							</select>
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Nama Material / Barang <span class="text-rose-500">*</span>
						</label>
						<input
							type="text"
							name="name"
							required
							placeholder="Misal: Oli Mesin Meditran SX 15W-40"
							class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Brand / Merk
							</label>
							<input
								type="text"
								name="brand"
								placeholder="Pertamina, Hino, Isuzu"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Part Number (P/N)
							</label>
							<input
								type="text"
								name="partNo"
								placeholder="15613-EV020"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none uppercase"
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Satuan (UOM) <span class="text-rose-500">*</span>
							</label>
							<input
								type="text"
								name="uom"
								required
								placeholder="Pcs, Liter, Set, Roll"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Lokasi Gudang / Rak
							</label>
							<select
								name="locationId"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								{#each data.sites as site}
									<option value={site.id}>{site.loc_name}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Harga Standar (Rp)
							</label>
							<input
								type="number"
								name="standardPrice"
								min="0"
								step="1000"
								placeholder="150000"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Min. Stock Alert
							</label>
							<input
								type="number"
								name="minStock"
								min="0"
								placeholder="10"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Spesifikasi Teknis
						</label>
						<textarea
							name="spec"
							rows="2"
							placeholder="Spesifikasi ukuran, grade, atau standar teknis..."
							class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none resize-none"
						></textarea>
					</div>
				</div>

				<div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-surface-container-low flex justify-end gap-3">
					<button
						type="button"
						onclick={() => isModalOpen = false}
						class="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
							<span>Menyimpan...</span>
						{:else}
							<span class="material-symbols-outlined text-sm">save</span>
							<span>Simpan Material</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Atur Harga Vendor (Add Price) -->
{#if isPriceModalOpen && selectedMaterialForPrices}
	{@const materialVendorPrices = (data.vendorPrices || []).filter((vp: any) => vp.materialId === selectedMaterialForPrices.id)}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">price_change</span>
					<div>
						<h3 class="text-base font-extrabold text-on-surface">Atur Harga Beli Vendor</h3>
						<p class="text-xs text-on-surface-variant font-mono">
							{selectedMaterialForPrices.materialCode} - {selectedMaterialForPrices.name}
						</p>
					</div>
				</div>
				<button type="button" onclick={() => isPriceModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="p-6 overflow-y-auto space-y-6">
				<!-- Standard Reference Price Info -->
				<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Harga Standar Baseline</p>
						<p class="text-lg font-black font-mono text-on-surface mt-0.5">{formatRupiah(selectedMaterialForPrices.standardPrice)}</p>
					</div>
					<div class="text-right">
						<span class="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold">
							Satuan: {selectedMaterialForPrices.uom}
						</span>
					</div>
				</div>

				<!-- Form Tambah / Update Harga Vendor -->
				<div class="p-4 rounded-2xl bg-surface-container border border-slate-200/80 dark:border-slate-800/80 space-y-3">
					<h4 class="text-xs font-black uppercase tracking-wider text-on-surface flex items-center gap-1.5">
						<span class="material-symbols-outlined text-base text-amber-600">add_circle</span>
						<span>Input / Perbarui Harga Vendor</span>
					</h4>

					<form 
						method="POST" 
						action="?/saveVendorPrice" 
						class="space-y-3"
						use:enhance={() => {
							isSavingPrice = true;
							return async ({ result, update }) => {
								isSavingPrice = false;
								if (result.type === 'success') {
									update();
								} else {
									alert((result as any).data?.message || 'Gagal menyimpan harga vendor');
								}
							};
						}}
					>
						<input type="hidden" name="materialId" value={selectedMaterialForPrices.id} />

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">
									Pilih Vendor / Supplier <span class="text-rose-500">*</span>
								</label>
								<select
									name="vendorId"
									required
									class="w-full bg-surface border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-on-surface outline-none"
								>
									<option value="">-- Pilih Supplier --</option>
									{#each data.vendors as v}
										<option value={v.id}>{v.name} ({v.code})</option>
									{/each}
								</select>
							</div>

							<div>
								<label class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">
									Harga Beli Satuan (Rp) <span class="text-rose-500">*</span>
								</label>
								<input
									type="number"
									name="price"
									min="1"
									required
									placeholder="Contoh: 150000"
									class="w-full bg-surface border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-on-surface outline-none"
								/>
							</div>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">
									Tanggal Berlaku
								</label>
								<input
									type="date"
									name="effectiveDate"
									value={new Date().toISOString().split('T')[0]}
									class="w-full bg-surface border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-on-surface outline-none"
								/>
							</div>

							<div>
								<label class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">
									Catatan Penawaran
								</label>
								<input
									type="text"
									name="notes"
									placeholder="Term of payment / promo..."
									class="w-full bg-surface border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-on-surface outline-none"
								/>
							</div>
						</div>

						<div class="flex justify-end pt-1">
							<button
								type="submit"
								disabled={isSavingPrice}
								class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
							>
								{#if isSavingPrice}
									<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
									<span>Menyimpan...</span>
								{:else}
									<span class="material-symbols-outlined text-sm">save</span>
									<span>Simpan Harga Vendor</span>
								{/if}
							</button>
						</div>
					</form>
				</div>

				<!-- Tabel Daftar Harga Vendor Terdaftar -->
				<div class="space-y-2">
					<div class="flex justify-between items-center">
						<h4 class="text-xs font-black uppercase tracking-wider text-on-surface">
							Riwayat Harga Beli per Vendor ({materialVendorPrices.length})
						</h4>
					</div>

					{#if materialVendorPrices.length === 0}
						<div class="p-6 text-center rounded-2xl bg-surface-container-low border border-dashed border-slate-300 dark:border-slate-700 text-on-surface-variant text-xs">
							Belum ada harga khusus per vendor. Saat membuat PO, sistem akan menggunakan harga standar baseline.
						</div>
					{:else}
						<div class="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
							<table class="w-full text-left text-xs">
								<thead class="bg-surface-container-low font-bold text-on-surface-variant border-b border-slate-200/80 dark:border-slate-800/80">
									<tr>
										<th class="py-2.5 px-3">Vendor / Supplier</th>
										<th class="py-2.5 px-3 text-right">Harga Satuan</th>
										<th class="py-2.5 px-3">Tgl Berlaku</th>
										<th class="py-2.5 px-3">Catatan</th>
										<th class="py-2.5 px-3 text-center">Aksi</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
									{#each materialVendorPrices as vp}
										<tr class="hover:bg-surface-container-high/40">
											<td class="py-2.5 px-3">
												<p class="font-bold text-on-surface">{vp.vendorName}</p>
												<span class="text-[10px] font-mono text-on-surface-variant">{vp.vendorCode}</span>
											</td>
											<td class="py-2.5 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-300">
												{formatRupiah(vp.price)}
											</td>
											<td class="py-2.5 px-3 text-on-surface-variant">{formatDateId(vp.effectiveDate)}</td>
											<td class="py-2.5 px-3 text-on-surface-variant">{vp.notes}</td>
											<td class="py-2.5 px-3 text-center">
												<form method="POST" action="?/deleteVendorPrice" use:enhance>
													<input type="hidden" name="priceId" value={vp.id} />
													<button
														type="submit"
														class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
														title="Hapus harga vendor"
													>
														<span class="material-symbols-outlined text-base">delete</span>
													</button>
												</form>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>

			<div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-surface-container-low flex justify-end">
				<button
					type="button"
					onclick={() => isPriceModalOpen = false}
					class="px-5 py-2 rounded-xl bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high cursor-pointer"
				>
					Selesai
				</button>
			</div>
		</div>
	</div>
{/if}
