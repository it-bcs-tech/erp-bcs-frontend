<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	let searchQuery = $state('');
	let categoryFilter = $state('All');
	let locationFilter = $state('All');
	let conditionFilter = $state('All');

	let isAddModalOpen = $state(false);
	let isEditModalOpen = $state(false);
	let isMutateModalOpen = $state(false);
	let isQrModalOpen = $state(false);
	let isDetailModalOpen = $state(false);
	let selectedAsset = $state<any>(null);

	// Depreciation calculator state for form
	let formCost = $state<number>(0);
	let formSalvage = $state<number>(0);
	let formMonths = $state<number>(60);
	const estMonthlyDep = $derived(
		formMonths > 0 ? Math.max(0, (formCost - formSalvage) / formMonths) : 0
	);

	function openAddModal() {
		formCost = 0;
		formSalvage = 0;
		formMonths = 60;
		isAddModalOpen = true;
	}

	function openEditModal(asset: any) {
		selectedAsset = asset;
		formCost = asset.acquisition_cost || 0;
		formSalvage = asset.salvage_value || 0;
		formMonths = asset.economic_life_months || 60;
		isEditModalOpen = true;
	}

	function openMutateModal(asset: any) {
		selectedAsset = asset;
		isMutateModalOpen = true;
	}

	function openQrModal(asset: any) {
		selectedAsset = asset;
		isQrModalOpen = true;
	}

	function openDetailModal(asset: any) {
		selectedAsset = asset;
		isDetailModalOpen = true;
	}

	function formatRupiah(amount: number | string | null) {
		const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(num);
	}

	function formatDate(d: string | null) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function getCategoryLabel(cat: string) {
		switch (cat) {
			case 'ELEKTRONIK_IT': return 'Elektronik & IT';
			case 'FASILITAS_GEDUNG': return 'Fasilitas Gedung';
			case 'MESIN_GENSET': return 'Mesin & Genset';
			case 'KENDARAAN_OPERASIONAL': return 'Kendaraan Operasional';
			case 'FURNITUR_KANTOR': return 'Furnitur Kantor';
			default: return cat;
		}
	}

	function getConditionBadge(condition: string) {
		switch (condition) {
			case 'GOOD':
				return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200';
			case 'MINOR_DAMAGE':
				return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200';
			case 'MAJOR_DAMAGE':
				return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200';
			case 'SCRAP':
				return 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300';
			default:
				return 'bg-slate-100 text-slate-700';
		}
	}

	// Client-side quick filter
	const filteredAssets = $derived(
		data.assets.filter((a: any) => {
			const q = searchQuery.toLowerCase();
			const matchQ =
				!q ||
				a.name?.toLowerCase().includes(q) ||
				a.asset_code?.toLowerCase().includes(q) ||
				a.brand_model?.toLowerCase().includes(q) ||
				a.serial_number?.toLowerCase().includes(q) ||
				a.pic_name?.toLowerCase().includes(q);
			const matchCat = categoryFilter === 'All' || a.category === categoryFilter;
			const matchLoc = locationFilter === 'All' || a.location === locationFilter;
			const matchCond = conditionFilter === 'All' || a.condition === conditionFilter;
			return matchQ && matchCat && matchLoc && matchCond;
		})
	);
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
		<div>
			<div class="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">
				<span class="material-symbols-outlined text-sm">inventory_2</span>
				<span>KR 7.1 • Master Aset & Inventaris Kantor</span>
			</div>
			<h1 class="text-3xl font-black text-on-surface tracking-tight">Inventaris Aset Tetap</h1>
			<p class="text-xs text-on-surface-variant mt-1">
				Pengelolaan aset fisik kantor & pool, kalkulasi depresiasi garis lurus, riwayat mutasi lokasi, serta tagging barcode/QR code.
			</p>
		</div>

		<button
			onclick={openAddModal}
			class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition-colors self-start md:self-auto"
		>
			<span class="material-symbols-outlined text-base">add_box</span>
			<span>+ Registrasi Aset Baru</span>
		</button>
	</div>

	<!-- Top Highlights / Financial Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Aset Terdaftar</span>
			<div class="text-2xl font-black text-on-surface mt-1">
				{data.totals.activeCount} <span class="text-sm font-normal text-on-surface-variant">/ {data.allAssetsCount} unit</span>
			</div>
			<p class="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
				<span class="material-symbols-outlined text-xs">verified</span> Unit aktif terinventarisasi
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Nilai Perolehan</span>
			<div class="text-2xl font-black text-on-surface mt-1">
				{formatRupiah(data.totals.totalCost)}
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1">
				Biaya historis pembelian awal
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Akumulasi Depresiasi</span>
			<div class="text-2xl font-black text-rose-600 mt-1">
				{formatRupiah(data.totals.totalAccumulatedDepreciation)}
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1">
				Penyusutan nilai hingga periode ini
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-cyan-500/30 dark:border-cyan-800/40 bg-gradient-to-br from-cyan-50/20 to-transparent">
			<span class="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">Nilai Buku Saat Ini</span>
			<div class="text-2xl font-black text-cyan-700 dark:text-cyan-300 mt-1">
				{formatRupiah(data.totals.totalBookValue)}
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1">
				Estimasi nilai buku bersih (*Net Book Value*)
			</p>
		</div>
	</div>

	<!-- Filter & Search Bar -->
	<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
		<div class="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 w-full md:w-80 focus-within:border-cyan-500">
			<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari kode, nama aset, S/N, PIC..."
				class="bg-transparent text-xs text-on-surface outline-none w-full placeholder:text-on-surface-variant/50"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
			<select
				bind:value={categoryFilter}
				class="px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs text-on-surface font-medium"
			>
				<option value="All">Semua Kategori</option>
				<option value="ELEKTRONIK_IT">Elektronik & IT</option>
				<option value="FASILITAS_GEDUNG">Fasilitas Gedung</option>
				<option value="MESIN_GENSET">Mesin & Genset</option>
				<option value="KENDARAAN_OPERASIONAL">Kendaraan Operasional</option>
				<option value="FURNITUR_KANTOR">Furnitur Kantor</option>
			</select>

			<select
				bind:value={locationFilter}
				class="px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs text-on-surface font-medium"
			>
				<option value="All">Semua Lokasi</option>
				<option value="Head Office Cilegon">Head Office Cilegon</option>
				<option value="Pool Cilegon">Pool Cilegon</option>
				<option value="Pool Merak">Pool Merak</option>
			</select>

			<select
				bind:value={conditionFilter}
				class="px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs text-on-surface font-medium"
			>
				<option value="All">Semua Kondisi</option>
				<option value="GOOD">Baik (Good)</option>
				<option value="MINOR_DAMAGE">Rusak Ringan</option>
				<option value="MAJOR_DAMAGE">Rusak Berat</option>
				<option value="SCRAP">Afkir / Scrap</option>
			</select>
		</div>
	</div>

	<!-- Asset Data Table -->
	<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3 px-4">Kode & QR</th>
						<th class="py-3 px-4">Nama Aset & Brand</th>
						<th class="py-3 px-4">Kategori</th>
						<th class="py-3 px-4">Lokasi / Ruang</th>
						<th class="py-3 px-4">PIC Unit</th>
						<th class="py-3 px-4 text-center">Kondisi</th>
						<th class="py-3 px-4 text-right">Nilai Perolehan</th>
						<th class="py-3 px-4 text-right">Nilai Buku Saat Ini</th>
						<th class="py-3 px-4 text-center">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each filteredAssets as asset}
						<tr class="hover:bg-surface-container transition-colors">
							<td class="py-3 px-4">
								<div class="flex items-center gap-2">
									<button
										onclick={() => openQrModal(asset)}
										title="Tampilkan QR Code Stiker Tagging"
										class="p-1 rounded-md bg-surface-container hover:bg-cyan-100 dark:hover:bg-cyan-950 text-cyan-600 transition-colors"
									>
										<span class="material-symbols-outlined text-base">qr_code_2</span>
									</button>
									<span class="font-mono font-bold text-on-surface">{asset.asset_code}</span>
								</div>
							</td>
							<td class="py-3 px-4">
								<div class="font-bold text-on-surface">{asset.name}</div>
								<div class="text-[11px] text-on-surface-variant font-medium">
									{asset.brand_model || '-'} {#if asset.serial_number}(S/N: {asset.serial_number}){/if}
								</div>
							</td>
							<td class="py-3 px-4 font-medium text-on-surface">
								{getCategoryLabel(asset.category)}
							</td>
							<td class="py-3 px-4">
								<div class="font-semibold text-on-surface">{asset.location}</div>
								{#if asset.room}
									<div class="text-[10px] text-on-surface-variant">{asset.room}</div>
								{/if}
							</td>
							<td class="py-3 px-4 font-medium text-on-surface">
								{asset.pic_name || 'Umum Pool / Kantor'}
							</td>
							<td class="py-3 px-4 text-center">
								<span class="px-2 py-0.5 rounded text-[10px] font-bold {getConditionBadge(asset.condition)}">
									{asset.condition}
								</span>
							</td>
							<td class="py-3 px-4 text-right font-mono font-medium text-on-surface">
								{formatRupiah(asset.acquisition_cost)}
								<div class="text-[10px] text-on-surface-variant">{formatDate(asset.acquisition_date)}</div>
							</td>
							<td class="py-3 px-4 text-right font-mono font-bold text-cyan-700 dark:text-cyan-300">
								{formatRupiah(asset.bookValue)}
								<div class="text-[10px] text-on-surface-variant font-normal">
									Sisa: {asset.remainingMonths} bln
								</div>
							</td>
							<td class="py-3 px-4 text-center whitespace-nowrap">
								<div class="flex items-center justify-center gap-1">
									<button
										onclick={() => openDetailModal(asset)}
										title="Rincian & Riwayat Mutasi"
										class="p-1.5 rounded-lg text-slate-500 hover:bg-surface-container hover:text-on-surface transition-colors"
									>
										<span class="material-symbols-outlined text-[17px]">visibility</span>
									</button>
									<button
										onclick={() => openMutateModal(asset)}
										title="Mutasi Lokasi / PIC"
										class="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
									>
										<span class="material-symbols-outlined text-[17px]">move_up</span>
									</button>
									<button
										onclick={() => openEditModal(asset)}
										title="Edit Data Aset"
										class="p-1.5 rounded-lg text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition-colors"
									>
										<span class="material-symbols-outlined text-[17px]">edit</span>
									</button>
									<form
										method="POST"
										action="?/deleteAsset"
										use:enhance={() => {
											if (!confirm(`Hapus data aset ${asset.name}?`)) return ({ cancel }: any) => cancel();
										}}
										class="inline"
									>
										<input type="hidden" name="id" value={asset.id} />
										<button
											type="submit"
											title="Hapus Aset"
											class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
										>
											<span class="material-symbols-outlined text-[17px]">delete</span>
										</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}

					{#if filteredAssets.length === 0}
						<tr>
							<td colspan="9" class="py-8 text-center text-on-surface-variant text-xs">
								Tidak ada aset yang sesuai dengan kriteria filter.
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- MODAL: Tagging QR Code & Barcode Resmi PT BCS -->
{#if isQrModalOpen && selectedAsset}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-cyan-600 text-xl">qr_code_scanner</span>
					<h3 class="font-bold text-sm text-on-surface">Label Stiker Inventaris Aset</h3>
				</div>
				<button onclick={() => isQrModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="p-6 flex flex-col items-center">
				<!-- Label Stiker Mockup (Printable Format) -->
				<div id="printable-qr-tag" class="w-full max-w-sm p-4 rounded-xl border-2 border-slate-800 bg-white text-slate-900 shadow-md">
					<!-- Kop Stiker -->
					<div class="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-3">
						<div>
							<h4 class="font-black text-xs tracking-wider uppercase text-[#57344f]">PT BUMI CITRA SAHIDA</h4>
							<p class="text-[9px] font-bold text-slate-600 uppercase">Fixed Asset Management</p>
						</div>
						<span class="text-[9px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
							{selectedAsset.asset_code}
						</span>
					</div>

					<!-- QR Code + Data Aset -->
					<div class="flex items-center gap-4">
						<div class="p-2 border border-slate-300 rounded-lg bg-white flex-shrink-0">
							<img
								src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data={encodeURIComponent(selectedAsset.barcode_qr || selectedAsset.asset_code)}"
								alt="Asset QR Code"
								class="w-24 h-24"
							/>
						</div>
						<div class="space-y-1 text-[11px] leading-tight flex-1">
							<p class="font-black text-xs text-slate-950">{selectedAsset.name}</p>
							<p class="text-slate-600 font-medium">{selectedAsset.brand_model || '-'}</p>
							<div class="pt-1 border-t border-slate-200">
								<p><strong class="font-bold">Lokasi:</strong> {selectedAsset.location}</p>
								<p><strong class="font-bold">Ruang:</strong> {selectedAsset.room || '-'}</p>
								<p><strong class="font-bold">PIC:</strong> {selectedAsset.pic_name || 'Umum'}</p>
							</div>
						</div>
					</div>

					<div class="mt-3 pt-2 border-t border-dashed border-slate-400 text-center text-[8px] text-slate-500 font-semibold tracking-wider uppercase">
						Dilarang memindahkan / melepas stiker tanpa izin General Affair
					</div>
				</div>

				<p class="text-xs text-on-surface-variant mt-4 text-center">
					Scan QR code di atas menggunakan smartphone/PDA scanner untuk melihat detail aset langsung di lapangan.
				</p>

				<div class="flex items-center gap-3 w-full mt-6">
					<button
						type="button"
						onclick={() => window.print()}
						class="flex-1 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
					>
						<span class="material-symbols-outlined text-base">print</span>
						<span>Cetak Stiker Label</span>
					</button>
					<button
						type="button"
						onclick={() => isQrModalOpen = false}
						class="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container"
					>
						Tutup
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL: Tambah / Registrasi Aset Baru -->
{#if isAddModalOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-cyan-600">add_box</span>
					<h3 class="font-bold text-base text-on-surface">Registrasi Aset Tetap Baru</h3>
				</div>
				<button onclick={() => isAddModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/createAsset"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							isAddModalOpen = false;
						}
					};
				}}
				class="p-6 space-y-4"
			>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="create_name" class="block text-xs font-bold text-on-surface mb-1">Nama Aset *</label>
						<input
							id="create_name"
							type="text"
							name="name"
							required
							placeholder="Misal: Genset Silent 60 KVA"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface outline-none focus:border-cyan-500"
						/>
					</div>
					<div>
						<label for="create_category" class="block text-xs font-bold text-on-surface mb-1">Kategori Aset *</label>
						<select
							id="create_category"
							name="category"
							required
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface outline-none focus:border-cyan-500"
						>
							<option value="ELEKTRONIK_IT">Elektronik & IT</option>
							<option value="FASILITAS_GEDUNG">Fasilitas Gedung</option>
							<option value="MESIN_GENSET">Mesin & Genset</option>
							<option value="KENDARAAN_OPERASIONAL">Kendaraan Operasional</option>
							<option value="FURNITUR_KANTOR">Furnitur Kantor</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="create_brand" class="block text-xs font-bold text-on-surface mb-1">Merk / Model</label>
						<input
							id="create_brand"
							type="text"
							name="brand_model"
							placeholder="Misal: Perkins 1104A / Dell PowerEdge"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface outline-none focus:border-cyan-500"
						/>
					</div>
					<div>
						<label for="create_serial" class="block text-xs font-bold text-on-surface mb-1">Nomor Seri / Serial Number</label>
						<input
							id="create_serial"
							type="text"
							name="serial_number"
							placeholder="Nomor seri pabrikan"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface outline-none focus:border-cyan-500 font-mono"
						/>
					</div>
				</div>

				<!-- Financial & Depreciation Settings -->
				<div class="p-4 rounded-xl bg-cyan-50/40 dark:bg-cyan-950/20 border border-cyan-200/60 dark:border-cyan-800/50 space-y-3">
					<div class="flex items-center gap-2 text-xs font-bold text-cyan-800 dark:text-cyan-300">
						<span class="material-symbols-outlined text-sm">calculate</span>
						<span>Kalkulasi Nilai & Depresiasi Garis Lurus (Straight-Line)</span>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div>
							<label for="create_acq_cost" class="block text-[11px] font-bold text-on-surface mb-1">Nilai Perolehan (Rp) *</label>
							<input
								id="create_acq_cost"
								type="number"
								name="acquisition_cost"
								bind:value={formCost}
								min="0"
								step="1000"
								required
								class="w-full px-3 py-1.5 text-xs rounded-lg bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono"
							/>
						</div>
						<div>
							<label for="create_econ_life" class="block text-[11px] font-bold text-on-surface mb-1">Umur Ekonomis (Bulan) *</label>
							<input
								id="create_econ_life"
								type="number"
								name="economic_life_months"
								bind:value={formMonths}
								min="1"
								required
								class="w-full px-3 py-1.5 text-xs rounded-lg bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono"
							/>
						</div>
						<div>
							<label for="create_salvage" class="block text-[11px] font-bold text-on-surface mb-1">Nilai Residu / Sisa (Rp)</label>
							<input
								id="create_salvage"
								type="number"
								name="salvage_value"
								bind:value={formSalvage}
								min="0"
								class="w-full px-3 py-1.5 text-xs rounded-lg bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono"
							/>
						</div>
					</div>

					<div class="pt-2 border-t border-cyan-200/50 dark:border-cyan-800/50 flex items-center justify-between text-xs">
						<span class="text-on-surface-variant">Estimasi Penyusutan per Bulan:</span>
						<span class="font-mono font-bold text-cyan-700 dark:text-cyan-300">{formatRupiah(estMonthlyDep)} / bln</span>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="create_location" class="block text-xs font-bold text-on-surface mb-1">Lokasi Fisik *</label>
						<select
							id="create_location"
							name="location"
							required
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface outline-none focus:border-cyan-500"
						>
							<option value="Head Office Cilegon">Head Office Cilegon</option>
							<option value="Pool Cilegon">Pool Cilegon</option>
							<option value="Pool Merak">Pool Merak</option>
						</select>
					</div>
					<div>
						<label for="create_room" class="block text-xs font-bold text-on-surface mb-1">Ruangan / Area</label>
						<input
							id="create_room"
							type="text"
							name="room"
							placeholder="Misal: Server Room Lt 2, Workshop Mekanik"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface outline-none focus:border-cyan-500"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label for="create_acq_date" class="block text-xs font-bold text-on-surface mb-1">Tanggal Perolehan</label>
						<input
							id="create_acq_date"
							type="date"
							name="acquisition_date"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						/>
					</div>
					<div>
						<label for="create_pic" class="block text-xs font-bold text-on-surface mb-1">PIC Penanggung Jawab</label>
						<input
							id="create_pic"
							type="text"
							name="pic_name"
							placeholder="Nama staf / penanggung jawab"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						/>
					</div>
					<div>
						<label for="create_condition" class="block text-xs font-bold text-on-surface mb-1">Kondisi Awal</label>
						<select
							id="create_condition"
							name="condition"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						>
							<option value="GOOD">Baik (Good)</option>
							<option value="MINOR_DAMAGE">Rusak Ringan</option>
						</select>
					</div>
				</div>

				<div>
					<label for="create_notes" class="block text-xs font-bold text-on-surface mb-1">Catatan Tambahan</label>
					<textarea
						id="create_notes"
						name="notes"
						rows="2"
						placeholder="Keterangan kelengkapan dokumen atau spesifikasi aset..."
						class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface outline-none focus:border-cyan-500"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => isAddModalOpen = false}
						class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition-colors"
					>
						Simpan & Daftarkan Aset
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: Mutasi Aset (Pindah Lokasi / Ganti PIC) -->
{#if isMutateModalOpen && selectedAsset}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">move_up</span>
					<h3 class="font-bold text-base text-on-surface">Form Mutasi Lokasi & PIC Aset</h3>
				</div>
				<button onclick={() => isMutateModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/recordMutation"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							isMutateModalOpen = false;
						}
					};
				}}
				class="p-6 space-y-4"
			>
				<input type="hidden" name="asset_id" value={selectedAsset.id} />

				<div class="p-3 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-1">
					<div class="font-bold text-on-surface">{selectedAsset.name} ({selectedAsset.asset_code})</div>
					<div class="text-on-surface-variant">
						<strong>Lokasi Saat Ini:</strong> {selectedAsset.location} {selectedAsset.room ? `(${selectedAsset.room})` : ''} • <strong>PIC:</strong> {selectedAsset.pic_name || 'Umum'}
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="mutate_loc" class="block text-xs font-bold text-on-surface mb-1">Lokasi Tujuan Baru *</label>
						<select
							id="mutate_loc"
							name="to_location"
							required
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						>
							<option value="Head Office Cilegon">Head Office Cilegon</option>
							<option value="Pool Cilegon">Pool Cilegon</option>
							<option value="Pool Merak">Pool Merak</option>
						</select>
					</div>
					<div>
						<label for="mutate_room" class="block text-xs font-bold text-on-surface mb-1">Ruangan Tujuan</label>
						<input
							id="mutate_room"
							type="text"
							name="to_room"
							placeholder="Misal: Ruang Dispatcher OCS"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="mutate_pic" class="block text-xs font-bold text-on-surface mb-1">PIC Penanggung Jawab Baru</label>
						<input
							id="mutate_pic"
							type="text"
							name="to_pic"
							placeholder="Nama staf penerima aset"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						/>
					</div>
					<div>
						<label for="mutate_date" class="block text-xs font-bold text-on-surface mb-1">Tanggal Mutasi</label>
						<input
							id="mutate_date"
							type="date"
							name="mutation_date"
							value={new Date().toISOString().split('T')[0]}
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						/>
					</div>
				</div>

				<div>
					<label for="mutate_reason" class="block text-xs font-bold text-on-surface mb-1">Alasan Pemindahan / Mutasi *</label>
					<textarea
						id="mutate_reason"
						name="reason"
						required
						rows="2"
						placeholder="Misal: Penyesuaian workstation divisi OCS, rotasi fasilitas pool..."
						class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => isMutateModalOpen = false}
						class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
					>
						Catat Mutasi Aset
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: Detail & Riwayat Mutasi Aset -->
{#if isDetailModalOpen && selectedAsset}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div>
					<div class="text-[11px] font-mono font-bold text-cyan-600 uppercase">{selectedAsset.asset_code}</div>
					<h3 class="font-bold text-base text-on-surface">{selectedAsset.name}</h3>
				</div>
				<button onclick={() => isDetailModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 space-y-5">
				<!-- Asset Basic Info Grid -->
				<div class="grid grid-cols-2 gap-3 text-xs p-3 rounded-xl bg-surface-container-low border border-slate-200/50 dark:border-slate-800/50">
					<div>
						<span class="text-on-surface-variant text-[10px] uppercase font-bold block">Kategori</span>
						<span class="font-semibold text-on-surface">{getCategoryLabel(selectedAsset.category)}</span>
					</div>
					<div>
						<span class="text-on-surface-variant text-[10px] uppercase font-bold block">Kondisi & Status</span>
						<span class="font-semibold text-on-surface">{selectedAsset.condition} • {selectedAsset.status}</span>
					</div>
					<div>
						<span class="text-on-surface-variant text-[10px] uppercase font-bold block">Nilai Perolehan</span>
						<span class="font-mono font-bold text-on-surface">{formatRupiah(selectedAsset.acquisition_cost)}</span>
					</div>
					<div>
						<span class="text-on-surface-variant text-[10px] uppercase font-bold block">Nilai Buku Saat Ini</span>
						<span class="font-mono font-bold text-cyan-600">{formatRupiah(selectedAsset.bookValue)}</span>
					</div>
				</div>

				<!-- Riwayat Mutasi Timeline -->
				<div>
					<h4 class="text-xs font-bold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-1.5">
						<span class="material-symbols-outlined text-sm text-amber-600">history</span>
						<span>Riwayat Mutasi & Perpindahan Lokasi</span>
					</h4>

					{#if selectedAsset.mutations && selectedAsset.mutations.length > 0}
						<div class="space-y-3 relative pl-4 border-l-2 border-slate-200 dark:border-slate-700">
							{#each selectedAsset.mutations as mut}
								<div class="relative text-xs">
									<div class="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-600 border-2 border-white dark:border-slate-900"></div>
									<div class="font-bold text-on-surface">{formatDate(mut.mutation_date)}</div>
									<div class="text-on-surface-variant text-[11px] mt-0.5">
										Dari: <span class="font-medium text-on-surface">{mut.from_location || '-'}</span> &rarr; Ke: <span class="font-medium text-cyan-600">{mut.to_location}</span>
									</div>
									<div class="text-[11px] text-on-surface-variant">
										PIC: {mut.to_pic || mut.from_pic || '-'} • Disetujui: {mut.approved_by || 'Manager GA'}
									</div>
									<p class="text-[11px] text-on-surface mt-1 italic bg-surface-container-low p-2 rounded-lg">
										"{mut.reason}"
									</p>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-xs text-on-surface-variant text-center py-4 bg-surface-container-low rounded-xl">
							Belum ada riwayat mutasi. Aset masih berada di lokasi awal perolehan.
						</p>
					{/if}
				</div>

				<div class="flex justify-end pt-2">
					<button
						type="button"
						onclick={() => isDetailModalOpen = false}
						class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container"
					>
						Tutup
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
