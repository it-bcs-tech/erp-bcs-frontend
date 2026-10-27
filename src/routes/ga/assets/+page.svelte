<script lang="ts">
	import { enhance } from '$app/forms';
	import Pagination from '$lib/components/Pagination.svelte';
	import QRCode from 'qrcode';

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

	// QR Code On-Screen & Print State
	let qrDataUrl = $state('');
	let isGeneratingQr = $state(false);
	let copiedQrLink = $state(false);
	let qrModalTab = $state<'SCREEN' | 'STICKER'>('SCREEN');

	// Batch Selection & Print State
	let selectedAssetIds = $state<number[]>([]);
	let isBatchModalOpen = $state(false);
	let batchQrMap = $state<Record<string, string>>({});
	let isGeneratingBatch = $state(false);

	// Depreciation calculator state for form
	let formCost = $state<number>(0);
	let formSalvage = $state<number>(0);
	let formMonths = $state<number>(60);
	let formCategory = $state<string>('KENDARAAN_OPERASIONAL');
	const fuelPrices = $derived(data.fuelPrices || []);
	const estMonthlyDep = $derived(
		formMonths > 0 ? Math.max(0, (formCost - formSalvage) / formMonths) : 0
	);

	function openAddModal() {
		formCost = 0;
		formSalvage = 0;
		formMonths = 60;
		formCategory = 'KENDARAAN_OPERASIONAL';
		isAddModalOpen = true;
	}

	function openEditModal(asset: any) {
		selectedAsset = asset;
		formCost = asset.acquisition_cost || 0;
		formSalvage = asset.salvage_value || 0;
		formMonths = asset.economic_life_months || 60;
		formCategory = asset.category || 'KENDARAAN_OPERASIONAL';
		isEditModalOpen = true;
	}

	function openMutateModal(asset: any) {
		selectedAsset = asset;
		isMutateModalOpen = true;
	}

	async function openQrModal(asset: any) {
		selectedAsset = asset;
		qrModalTab = 'SCREEN';
		isQrModalOpen = true;
		isGeneratingQr = true;
		copiedQrLink = false;
		qrDataUrl = '';
		try {
			const origin = typeof window !== 'undefined' ? window.location.origin : '';
			const scanUrl = `${origin}/scan/asset/${asset.asset_code}`;
			qrDataUrl = await QRCode.toDataURL(scanUrl, {
				width: 320,
				margin: 2,
				errorCorrectionLevel: 'H',
				color: { dark: '#0f172a', light: '#ffffff' }
			});
		} catch (e) {
			console.error('Failed to generate QR:', e);
		} finally {
			isGeneratingQr = false;
		}
	}

	function copyScanUrl(assetCode: string) {
		if (typeof window !== 'undefined') {
			const url = `${window.location.origin}/scan/asset/${assetCode}`;
			navigator.clipboard.writeText(url);
			copiedQrLink = true;
			setTimeout(() => (copiedQrLink = false), 2000);
		}
	}

	function downloadQrImage(assetCode: string) {
		if (!qrDataUrl) return;
		const a = document.createElement('a');
		a.href = qrDataUrl;
		a.download = `QR_${assetCode}.png`;
		a.click();
	}

	function toggleSelectAsset(id: number) {
		if (selectedAssetIds.includes(id)) {
			selectedAssetIds = selectedAssetIds.filter(x => x !== id);
		} else {
			selectedAssetIds = [...selectedAssetIds, id];
		}
	}

	function toggleSelectAllOnPage() {
		const pageIds = paginatedAssets.map((a: any) => a.id);
		const allSelected = pageIds.length > 0 && pageIds.every((id: number) => selectedAssetIds.includes(id));
		if (allSelected) {
			selectedAssetIds = selectedAssetIds.filter((id: number) => !pageIds.includes(id));
		} else {
			selectedAssetIds = Array.from(new Set([...selectedAssetIds, ...pageIds]));
		}
	}

	async function openBatchPrintModal() {
		if (selectedAssetIds.length === 0) return;
		isBatchModalOpen = true;
		isGeneratingBatch = true;
		try {
			const origin = typeof window !== 'undefined' ? window.location.origin : '';
			const selectedItems = data.assets.filter((a: any) => selectedAssetIds.includes(a.id));
			for (const a of selectedItems) {
				if (!batchQrMap[a.asset_code]) {
					const url = `${origin}/scan/asset/${a.asset_code}`;
					batchQrMap[a.asset_code] = await QRCode.toDataURL(url, {
						width: 180,
						margin: 1,
						errorCorrectionLevel: 'M',
						color: { dark: '#0f172a', light: '#ffffff' }
					});
				}
			}
		} catch (e) {
			console.error('Batch QR error:', e);
		} finally {
			isGeneratingBatch = false;
		}
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
				return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
			case 'MINOR_DAMAGE':
				return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
			case 'MAJOR_DAMAGE':
				return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
			case 'SCRAP':
				return 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700';
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

	// Pagination state
	let currentPage = $state(1);
	const perPage = 10;
	const totalPages = $derived(Math.max(1, Math.ceil(filteredAssets.length / perPage)));
	const paginatedAssets = $derived(
		filteredAssets.slice((currentPage - 1) * perPage, currentPage * perPage)
	);

	$effect(() => {
		const _ = [searchQuery, categoryFilter, locationFilter, conditionFilter, data.assets];
		currentPage = 1;
	});
</script>

<svelte:head>
	<title>Master Assets | General Affair | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
		<div>
			<div class="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">
				<span class="material-symbols-outlined text-sm">inventory_2</span>
				<span>General Affair • Master Aset & Inventaris Kantor</span>
			</div>
			<h1 class="text-3xl font-black text-on-surface tracking-tight">Inventaris Aset Tetap</h1>
			<p class="text-xs text-on-surface-variant mt-1">
				Pengelolaan aset fisik kantor & pool, kalkulasi depresiasi garis lurus, riwayat mutasi lokasi, serta tagging barcode/QR code.
			</p>
		</div>

		<button
			onclick={openAddModal}
			class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition-colors self-start md:self-auto cursor-pointer"
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

	<!-- Filter & Search Bar (Borderless Standard) -->
	<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
		<div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low w-full md:w-80 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
			<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari kode, nama aset, S/N, PIC..."
				class="bg-transparent text-xs text-on-surface border-0 outline-none w-full placeholder:text-on-surface-variant/50 focus:ring-0"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
			{#if selectedAssetIds.length > 0}
				<button
					type="button"
					onclick={openBatchPrintModal}
					class="px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-[17px]">print</span>
					<span>Cetak Massal ({selectedAssetIds.length} Label)</span>
				</button>
			{/if}

			<select
				bind:value={categoryFilter}
				class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs text-on-surface font-medium cursor-pointer transition-all"
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
				class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs text-on-surface font-medium cursor-pointer transition-all"
			>
				<option value="All">Semua Lokasi</option>
				<option value="Head Office Cilegon">Head Office Cilegon</option>
				<option value="Pool Cilegon">Pool Cilegon</option>
				<option value="Pool Merak">Pool Merak</option>
			</select>

			<select
				bind:value={conditionFilter}
				class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs text-on-surface font-medium cursor-pointer transition-all"
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
						<th class="py-3 px-3 text-center w-10">
							<input
								type="checkbox"
								checked={paginatedAssets.length > 0 && paginatedAssets.every((a: any) => selectedAssetIds.includes(a.id))}
								onchange={toggleSelectAllOnPage}
								class="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
								title="Pilih Semua di Halaman Ini"
							/>
						</th>
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
					{#each paginatedAssets as asset (asset.id)}
						<tr class="hover:bg-surface-container transition-colors {selectedAssetIds.includes(asset.id) ? 'bg-teal-50/30 dark:bg-teal-950/20' : ''}">
							<td class="py-3 px-3 text-center">
								<input
									type="checkbox"
									checked={selectedAssetIds.includes(asset.id)}
									onchange={() => toggleSelectAsset(asset.id)}
									class="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
								/>
							</td>
							<td class="py-3 px-4">
								<div class="flex items-center gap-2">
									<button
										onclick={() => openQrModal(asset)}
										title="Tampilkan QR Code di Layar / Cetak Stiker"
										class="p-1 rounded-md bg-surface-container hover:bg-teal-100 dark:hover:bg-teal-950 text-teal-600 transition-colors cursor-pointer"
									>
										<span class="material-symbols-outlined text-base">qr_code_2</span>
									</button>
									<span class="font-mono font-bold text-on-surface">{asset.asset_code}</span>
								</div>
							</td>
							<td class="py-3 px-4">
								<div class="font-bold text-on-surface">{asset.name}</div>
								<div class="text-[11px] text-on-surface-variant font-medium">
									{asset.brand_model || '-'} {#if asset.serial_number}({asset.category === 'KENDARAAN_OPERASIONAL' ? 'Nopol' : 'S/N'}: {asset.serial_number}){/if}
								</div>
								{#if asset.category === 'KENDARAAN_OPERASIONAL'}
									<div class="flex flex-wrap items-center gap-1.5 mt-1">
										<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
											Carpool Sync #{asset.car_id || '-'}
										</span>
										{#if asset.fuel_name}
											<span class="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-surface-container-high text-on-surface-variant">
												{asset.fuel_name} • {asset.km_per_liter || 0} KM/L
											</span>
										{/if}
									</div>
								{/if}
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
										class="p-1.5 rounded-lg text-slate-500 hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
									>
										<span class="material-symbols-outlined text-[17px]">visibility</span>
									</button>
									<button
										onclick={() => openMutateModal(asset)}
										title="Mutasi Lokasi / PIC"
										class="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
									>
										<span class="material-symbols-outlined text-[17px]">move_up</span>
									</button>
									<button
										onclick={() => openEditModal(asset)}
										title="Edit Data Aset"
										class="p-1.5 rounded-lg text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition-colors cursor-pointer"
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
											class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
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

		{#if filteredAssets.length > 0}
			<Pagination
				currentPage={currentPage}
				totalPages={totalPages}
				totalItems={filteredAssets.length}
				perPage={perPage}
				itemLabel="aset tetap"
				onPageChange={(p) => (currentPage = p)}
			/>
		{/if}
	</div>
</div>

<!-- MODAL: Tagging QR Code & Barcode Resmi PT BCS (Layar & Stiker) -->
{#if isQrModalOpen && selectedAsset}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<!-- Header Modal -->
			<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-teal-600 text-xl">qr_code_scanner</span>
					<div>
						<h3 class="font-bold text-sm text-on-surface">QR Code & Label Inventaris Aset</h3>
						<p class="text-[10px] text-on-surface-variant font-mono">{selectedAsset.asset_code} • {selectedAsset.name}</p>
					</div>
				</div>
				<button onclick={() => (isQrModalOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer p-1 rounded-lg">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Tab Switcher: Scan di Layar vs Format Stiker Fisik -->
			<div class="flex items-center border-b border-slate-200/60 dark:border-slate-800/60 px-4 pt-2 gap-2 bg-surface-container-low">
				<button
					type="button"
					onclick={() => (qrModalTab = 'SCREEN')}
					class="pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer {qrModalTab === 'SCREEN'
						? 'border-teal-600 text-teal-600 dark:text-teal-400'
						: 'border-transparent text-on-surface-variant hover:text-on-surface'}"
				>
					<span class="material-symbols-outlined text-[17px]">screen_rotation</span>
					<span>Scan dari Monitor (Layar)</span>
				</button>
				<button
					type="button"
					onclick={() => (qrModalTab = 'STICKER')}
					class="pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer {qrModalTab === 'STICKER'
						? 'border-teal-600 text-teal-600 dark:text-teal-400'
						: 'border-transparent text-on-surface-variant hover:text-on-surface'}"
				>
					<span class="material-symbols-outlined text-[17px]">label</span>
					<span>Format Cetak Stiker (Fisik)</span>
				</button>
			</div>

			<div class="p-6">
				{#if qrModalTab === 'SCREEN'}
					<!-- TAB 1: SCAN LANGSUNG DARI LAYAR MONITOR -->
					<div class="flex flex-col items-center text-center space-y-4">
						<div class="p-3 bg-white rounded-2xl shadow-inner border border-slate-200 dark:border-slate-700 inline-block">
							{#if isGeneratingQr || !qrDataUrl}
								<div class="w-64 h-64 flex items-center justify-center text-slate-400">
									<span class="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
								</div>
							{:else}
								<img
									src={qrDataUrl}
									alt="QR Code Aset"
									class="w-64 h-64 object-contain rounded-xl"
								/>
							{/if}
						</div>

						<div>
							<span class="inline-block px-3 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-mono text-xs font-black border border-teal-200 dark:border-teal-800">
								{selectedAsset.asset_code}
							</span>
							<h4 class="font-bold text-sm text-on-surface mt-1">{selectedAsset.name}</h4>
							<p class="text-xs text-on-surface-variant mt-0.5">
								Lokasi: <span class="font-semibold text-on-surface">{selectedAsset.location}</span> ({selectedAsset.room || 'Umum'})
								• PIC: <span class="font-semibold text-on-surface">{selectedAsset.pic_name || 'GA Pool'}</span>
							</p>
							<p class="text-[11px] text-teal-600 dark:text-teal-400 font-medium mt-2 flex items-center justify-center gap-1">
								<span class="material-symbols-outlined text-sm">photo_camera</span>
								Arahkan kamera smartphone langsung ke QR code di monitor ini.
							</p>
						</div>

						<!-- Quick Actions -->
						<div class="grid grid-cols-3 gap-2 w-full pt-2">
							<a
								href="/scan/asset/{selectedAsset.asset_code}"
								target="_blank"
								class="py-2.5 px-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs flex flex-col items-center justify-center gap-1 transition-colors"
								title="Buka Halaman Scan di Tab Baru"
							>
								<span class="material-symbols-outlined text-lg text-teal-600">open_in_new</span>
								<span>Buka Halaman</span>
							</a>

							<button
								type="button"
								onclick={() => copyScanUrl(selectedAsset.asset_code)}
								class="py-2.5 px-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
								title="Salin Tautan Scan ke Clipboard"
							>
								<span class="material-symbols-outlined text-lg {copiedQrLink ? 'text-emerald-500' : 'text-indigo-600'}">
									{copiedQrLink ? 'check' : 'content_copy'}
								</span>
								<span>{copiedQrLink ? 'Tersalin!' : 'Salin Link'}</span>
							</button>

							<button
								type="button"
								onclick={() => downloadQrImage(selectedAsset.asset_code)}
								class="py-2.5 px-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
								title="Unduh Gambar QR Format PNG Resolusi Tinggi"
							>
								<span class="material-symbols-outlined text-lg text-cyan-600">download</span>
								<span>Unduh PNG</span>
							</button>
						</div>
					</div>
				{:else}
					<!-- TAB 2: FORMAT CETAK STIKER LABEL FISIK (7 x 4 cm) -->
					<div class="flex flex-col items-center space-y-4">
						<div
							id="printable-single-sticker"
							class="w-full max-w-sm p-3.5 rounded-xl border-2 border-slate-900 bg-white text-slate-900 shadow-md font-sans"
						>
							<!-- Header Stiker -->
							<div class="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2.5">
								<div class="flex items-center gap-2">
									<div class="w-6 h-6 rounded bg-[#57344f] text-white font-black text-[10px] flex items-center justify-center">
										BCS
									</div>
									<div>
										<h4 class="font-black text-[11px] tracking-wider uppercase text-[#57344f] leading-none">
											PT BANGUN CAKRAWALA SARI
										</h4>
										<p class="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
											Inventaris Aset Tetap
										</p>
									</div>
								</div>
								<span class="text-[9px] font-mono font-black bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
									{selectedAsset.asset_code}
								</span>
							</div>

							<!-- Isi Stiker: QR + Info -->
							<div class="flex items-center gap-3">
								<div class="p-1 border border-slate-300 rounded bg-white flex-shrink-0">
									{#if qrDataUrl}
										<img src={qrDataUrl} alt="QR" class="w-20 h-20" />
									{:else}
										<div class="w-20 h-20 bg-slate-100 flex items-center justify-center text-[10px]">Loading</div>
									{/if}
								</div>
								<div class="space-y-0.5 text-[10px] leading-tight flex-1">
									<p class="font-black text-xs text-slate-950 line-clamp-1">{selectedAsset.name}</p>
									<p class="text-slate-600 font-semibold">{selectedAsset.brand_model || '-'}</p>
									{#if selectedAsset.serial_number}
										<p class="text-[9px] font-mono text-slate-500">S/N: {selectedAsset.serial_number}</p>
									{/if}
									<div class="pt-1 mt-1 border-t border-slate-200 text-[9px] text-slate-700">
										<p><strong>Lok:</strong> {selectedAsset.location} ({selectedAsset.room || '-'})</p>
										<p><strong>PIC:</strong> {selectedAsset.pic_name || 'GA Pool'}</p>
									</div>
								</div>
							</div>

							<!-- Footer Stiker -->
							<div class="mt-2.5 pt-1.5 border-t border-dashed border-slate-400 text-center text-[7px] text-slate-500 font-bold uppercase tracking-wider">
								Dilarang memindahkan / merusak label tanpa izin resmi General Affair
							</div>
						</div>

						<p class="text-[11px] text-on-surface-variant text-center">
							Format siap cetak stiker label ukuran 7 x 4 cm / Tom & Jerry.
						</p>

						<button
							type="button"
							onclick={() => window.print()}
							class="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
						>
							<span class="material-symbols-outlined text-base">print</span>
							<span>Cetak Stiker Ini Sekarang</span>
						</button>
					</div>
				{/if}

				<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-end">
					<button
						type="button"
						onclick={() => (isQrModalOpen = false)}
						class="py-2 px-4 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
					>
						Tutup
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL: CETAK MASSAL (BATCH PRINT STICKER SHEET A4) -->
{#if isBatchModalOpen}
	{@const selectedItems = data.assets.filter((a: any) => selectedAssetIds.includes(a.id))}
	<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<!-- Header -->
			<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-teal-600 text-xl">batch_prediction</span>
					<div>
						<h3 class="font-bold text-sm text-on-surface">Cetak Massal Stiker Label Aset ({selectedItems.length} Label)</h3>
						<p class="text-[11px] text-on-surface-variant">Pratinjau lembar stiker A4 (Grid 2 Kolom x 5 Baris)</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => window.print()}
						disabled={isGeneratingBatch}
						class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
					>
						<span class="material-symbols-outlined text-sm">print</span>
						<span>{isGeneratingBatch ? 'Menyiapkan...' : 'Cetak Lembar Stiker'}</span>
					</button>
					<button onclick={() => (isBatchModalOpen = false)} class="p-2 rounded-xl text-on-surface-variant hover:text-on-surface">
						<span class="material-symbols-outlined text-base">close</span>
					</button>
				</div>
			</div>

			<!-- Sheet Preview -->
			<div class="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
				{#if isGeneratingBatch}
					<div class="py-16 text-center text-slate-500">
						<span class="material-symbols-outlined text-4xl animate-spin mb-2">progress_activity</span>
						<p class="text-xs font-bold">Membuat QR Code untuk {selectedItems.length} aset terpilih...</p>
					</div>
				{:else}
					<div
						id="printable-batch-stickers"
						class="w-full max-w-3xl bg-white text-slate-900 p-6 rounded-2xl shadow border border-slate-300 grid grid-cols-1 md:grid-cols-2 gap-4"
					>
						{#each selectedItems as item (item.id)}
							<div class="p-3 rounded-xl border border-slate-800 bg-white space-y-2">
								<div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
									<div class="flex items-center gap-1.5">
										<div class="w-5 h-5 rounded bg-[#57344f] text-white font-black text-[9px] flex items-center justify-center">
											BCS
										</div>
										<span class="font-black text-[10px] uppercase text-[#57344f]">PT BANGUN CAKRAWALA SARI</span>
									</div>
									<span class="text-[9px] font-mono font-black bg-slate-100 px-1 py-0.5 rounded border border-slate-300">
										{item.asset_code}
									</span>
								</div>

								<div class="flex items-center gap-3">
									<div class="p-1 border border-slate-300 rounded bg-white flex-shrink-0">
										{#if batchQrMap[item.asset_code]}
											<img src={batchQrMap[item.asset_code]} alt="QR" class="w-16 h-16" />
										{:else}
											<div class="w-16 h-16 bg-slate-100 flex items-center justify-center text-[9px]">Loading</div>
										{/if}
									</div>
									<div class="space-y-0.5 text-[10px] leading-tight flex-1">
										<p class="font-black text-slate-950 truncate">{item.name}</p>
										<p class="text-slate-600 font-semibold">{item.brand_model || '-'}</p>
										<p class="text-slate-500 text-[9px]">Lokasi: {item.location} ({item.room || '-'})</p>
										<p class="text-slate-500 text-[9px]">PIC: {item.pic_name || 'GA Pool'}</p>
									</div>
								</div>

								<div class="border-t border-dashed border-slate-300 pt-1 text-center text-[7px] text-slate-400 font-bold uppercase">
									Dilarang memindahkan stiker tanpa izin GA
								</div>
							</div>
						{/each}
					</div>
				{/if}
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
				<button onclick={() => isAddModalOpen = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
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
						<label for="create_name" class="block text-xs font-bold text-on-surface mb-1.5">Nama Aset <span class="text-rose-500">*</span></label>
						<input
							id="create_name"
							type="text"
							name="name"
							required
							placeholder="Misal: Genset Silent 60 KVA"
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface transition-all"
						/>
					</div>
					<div>
						<label for="create_category" class="block text-xs font-bold text-on-surface mb-1.5">Kategori Aset <span class="text-rose-500">*</span></label>
						<select
							id="create_category"
							name="category"
							bind:value={formCategory}
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface cursor-pointer transition-all"
						>
							<option value="KENDARAAN_OPERASIONAL">Kendaraan Operasional (Terintegrasi Carpool GA)</option>
							<option value="ELEKTRONIK_IT">Elektronik & IT</option>
							<option value="FASILITAS_GEDUNG">Fasilitas Gedung</option>
							<option value="MESIN_GENSET">Mesin & Genset</option>
							<option value="FURNITUR_KANTOR">Furnitur Kantor</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="create_brand" class="block text-xs font-bold text-on-surface mb-1.5">Merk / Model</label>
						<input
							id="create_brand"
							type="text"
							name="brand_model"
							placeholder={formCategory === 'KENDARAAN_OPERASIONAL' ? 'Misal: Toyota Avanza / Honda Vario' : 'Misal: Perkins 1104A / Dell PowerEdge'}
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface transition-all"
						/>
					</div>
					<div>
						<label for="create_serial" class="block text-xs font-bold text-on-surface mb-1.5">
							{formCategory === 'KENDARAAN_OPERASIONAL' ? 'Nomor Polisi (Nopol) *' : 'Nomor Seri / Serial Number'}
						</label>
						<input
							id="create_serial"
							type="text"
							name="serial_number"
							required={formCategory === 'KENDARAAN_OPERASIONAL'}
							placeholder={formCategory === 'KENDARAAN_OPERASIONAL' ? 'Contoh: A 1301 VH' : 'Nomor seri pabrikan'}
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono transition-all"
						/>
					</div>
				</div>

				{#if formCategory === 'KENDARAAN_OPERASIONAL'}
					<div class="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/50 space-y-3">
						<div class="flex items-center justify-between text-xs font-bold text-indigo-800 dark:text-indigo-300">
							<div class="flex items-center gap-2">
								<span class="material-symbols-outlined text-sm">commute</span>
								<span>Spesifikasi Operasional Carpool GA (Otomatis Sinkron ke Menu Carpool)</span>
							</div>
						</div>
						<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
							<div>
								<label class="block text-[11px] font-bold text-on-surface mb-1">Kelompok Kendaraan</label>
								<select
									name="vehicle_group"
									class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-indigo-500/20 text-on-surface"
								>
									<option value="R-4">R-4 (Mobil)</option>
									<option value="R2">R2 (Motor)</option>
								</select>
							</div>
							<div>
								<label class="block text-[11px] font-bold text-on-surface mb-1">Jenis BBM</label>
								<select
									name="fuel_id"
									class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-indigo-500/20 text-on-surface"
								>
									{#each fuelPrices as fp}
										<option value={fp.id}>{fp.fuel_name}</option>
									{/each}
								</select>
							</div>
							<div>
								<label class="block text-[11px] font-bold text-on-surface mb-1">Rasio Konsumsi (KM/Liter)</label>
								<input
									type="number"
									name="km_per_liter"
									step="0.01"
									value="11"
									class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-indigo-500/20 text-on-surface font-mono"
								/>
							</div>
						</div>
					</div>
				{/if}

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
								class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono"
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
								class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono"
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
								class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono"
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
						<label for="create_location" class="block text-xs font-bold text-on-surface mb-1.5">Lokasi Fisik <span class="text-rose-500">*</span></label>
						<select
							id="create_location"
							name="location"
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface cursor-pointer transition-all"
						>
							<option value="Head Office Cilegon">Head Office Cilegon</option>
							<option value="Pool Cilegon">Pool Cilegon</option>
							<option value="Pool Merak">Pool Merak</option>
						</select>
					</div>
					<div>
						<label for="create_room" class="block text-xs font-bold text-on-surface mb-1.5">Ruangan / Area</label>
						<input
							id="create_room"
							type="text"
							name="room"
							placeholder="Misal: Server Room Lt 2, Workshop Mekanik"
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface transition-all"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label for="create_acq_date" class="block text-xs font-bold text-on-surface mb-1.5">Tanggal Perolehan</label>
						<input
							id="create_acq_date"
							type="date"
							name="acquisition_date"
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface"
						/>
					</div>
					<div>
						<label for="create_pic" class="block text-xs font-bold text-on-surface mb-1.5">PIC Penanggung Jawab</label>
						<input
							id="create_pic"
							type="text"
							name="pic_name"
							placeholder="Nama staf / penanggung jawab"
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface"
						/>
					</div>
					<div>
						<label for="create_condition" class="block text-xs font-bold text-on-surface mb-1.5">Kondisi Awal</label>
						<select
							id="create_condition"
							name="condition"
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface cursor-pointer"
						>
							<option value="GOOD">Baik (Good)</option>
							<option value="MINOR_DAMAGE">Rusak Ringan</option>
						</select>
					</div>
				</div>

				<div>
					<label for="create_notes" class="block text-xs font-bold text-on-surface mb-1.5">Catatan Tambahan</label>
					<textarea
						id="create_notes"
						name="notes"
						rows="2"
						placeholder="Keterangan kelengkapan dokumen atau spesifikasi aset..."
						class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface transition-all"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => isAddModalOpen = false}
						class="px-4 py-2.5 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
					>
						Simpan & Daftarkan Aset
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: Edit Data Aset -->
{#if isEditModalOpen && selectedAsset}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-cyan-600">edit</span>
					<div>
						<h3 class="font-bold text-base text-on-surface">Edit Data Aset Tetap</h3>
						<p class="text-[11px] font-mono text-on-surface-variant">{selectedAsset.asset_code}</p>
					</div>
				</div>
				<button onclick={() => isEditModalOpen = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/updateAsset"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							isEditModalOpen = false;
						}
					};
				}}
				class="p-6 space-y-4"
			>
				<input type="hidden" name="id" value={selectedAsset.id} />

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="edit_name" class="block text-xs font-bold text-on-surface mb-1.5">Nama Aset <span class="text-rose-500">*</span></label>
						<input
							id="edit_name"
							type="text"
							name="name"
							value={selectedAsset.name}
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface"
						/>
					</div>
					<div>
						<label for="edit_category" class="block text-xs font-bold text-on-surface mb-1.5">Kategori Aset <span class="text-rose-500">*</span></label>
						<select
							id="edit_category"
							name="category"
							bind:value={formCategory}
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface cursor-pointer"
						>
							<option value="KENDARAAN_OPERASIONAL">Kendaraan Operasional (Terintegrasi Carpool GA)</option>
							<option value="ELEKTRONIK_IT">Elektronik & IT</option>
							<option value="FASILITAS_GEDUNG">Fasilitas Gedung</option>
							<option value="MESIN_GENSET">Mesin & Genset</option>
							<option value="FURNITUR_KANTOR">Furnitur Kantor</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="edit_brand" class="block text-xs font-bold text-on-surface mb-1.5">Merk / Model</label>
						<input
							id="edit_brand"
							type="text"
							name="brand_model"
							value={selectedAsset.brand_model || ''}
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface"
						/>
					</div>
					<div>
						<label for="edit_serial" class="block text-xs font-bold text-on-surface mb-1.5">
							{formCategory === 'KENDARAAN_OPERASIONAL' ? 'Nomor Polisi (Nopol)' : 'Nomor Seri / Serial Number'}
						</label>
						<input
							id="edit_serial"
							type="text"
							name="serial_number"
							value={selectedAsset.serial_number || ''}
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono"
						/>
					</div>
				</div>

				{#if formCategory === 'KENDARAAN_OPERASIONAL'}
					<div class="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/50 space-y-3">
						<div class="flex items-center gap-2 text-xs font-bold text-indigo-800 dark:text-indigo-300">
							<span class="material-symbols-outlined text-sm">commute</span>
							<span>Spesifikasi Operasional Carpool GA (Sinkron ke Carpool ID #{selectedAsset.car_id || 'Baru'})</span>
						</div>
						<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
							<div>
								<label class="block text-[11px] font-bold text-on-surface mb-1">Kelompok Kendaraan</label>
								<input
									type="text"
									name="vehicle_group"
									value={selectedAsset.vehicle_group || 'R4'}
									class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-indigo-500/20 text-on-surface"
								/>
							</div>
							<div>
								<label class="block text-[11px] font-bold text-on-surface mb-1">Jenis BBM</label>
								<select
									name="fuel_id"
									value={selectedAsset.fuel_id || 1}
									class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-indigo-500/20 text-on-surface"
								>
									{#each fuelPrices as fp}
										<option value={fp.id}>{fp.fuel_name}</option>
									{/each}
								</select>
							</div>
							<div>
								<label class="block text-[11px] font-bold text-on-surface mb-1">Rasio Konsumsi (KM/Liter)</label>
								<input
									type="number"
									name="km_per_liter"
									step="0.01"
									value={selectedAsset.km_per_liter || 0}
									class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-indigo-500/20 text-on-surface font-mono"
								/>
							</div>
						</div>
					</div>
				{/if}

				<div class="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-surface-container-low">
					<div>
						<label for="edit_acq_cost" class="block text-[11px] font-bold text-on-surface mb-1">Nilai Perolehan (Rp)</label>
						<input
							id="edit_acq_cost"
							type="number"
							name="acquisition_cost"
							bind:value={formCost}
							min="0"
							step="1000"
							required
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono"
						/>
					</div>
					<div>
						<label for="edit_econ_life" class="block text-[11px] font-bold text-on-surface mb-1">Umur Ekonomis (Bln)</label>
						<input
							id="edit_econ_life"
							type="number"
							name="economic_life_months"
							bind:value={formMonths}
							min="1"
							required
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono"
						/>
					</div>
					<div>
						<label for="edit_salvage" class="block text-[11px] font-bold text-on-surface mb-1">Nilai Residu (Rp)</label>
						<input
							id="edit_salvage"
							type="number"
							name="salvage_value"
							bind:value={formSalvage}
							min="0"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface font-mono"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="edit_location" class="block text-xs font-bold text-on-surface mb-1.5">Lokasi Fisik *</label>
						<select
							id="edit_location"
							name="location"
							value={selectedAsset.location}
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface cursor-pointer"
						>
							<option value="Head Office Cilegon">Head Office Cilegon</option>
							<option value="Pool Cilegon">Pool Cilegon</option>
							<option value="Pool Merak">Pool Merak</option>
						</select>
					</div>
					<div>
						<label for="edit_room" class="block text-xs font-bold text-on-surface mb-1.5">Ruangan / Area</label>
						<input
							id="edit_room"
							type="text"
							name="room"
							value={selectedAsset.room || ''}
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-4 gap-3">
					<div>
						<label for="edit_acq_date" class="block text-xs font-bold text-on-surface mb-1.5">Tgl Perolehan</label>
						<input
							id="edit_acq_date"
							type="date"
							name="acquisition_date"
							value={selectedAsset.acquisition_date || ''}
							class="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface"
						/>
					</div>
					<div>
						<label for="edit_pic" class="block text-xs font-bold text-on-surface mb-1.5">PIC Unit</label>
						<input
							id="edit_pic"
							type="text"
							name="pic_name"
							value={selectedAsset.pic_name || ''}
							class="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface"
						/>
					</div>
					<div>
						<label for="edit_condition" class="block text-xs font-bold text-on-surface mb-1.5">Kondisi</label>
						<select
							id="edit_condition"
							name="condition"
							value={selectedAsset.condition}
							class="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface cursor-pointer"
						>
							<option value="GOOD">GOOD</option>
							<option value="MINOR_DAMAGE">MINOR_DAMAGE</option>
							<option value="MAJOR_DAMAGE">MAJOR_DAMAGE</option>
							<option value="SCRAP">SCRAP</option>
						</select>
					</div>
					<div>
						<label for="edit_status" class="block text-xs font-bold text-on-surface mb-1.5">Status</label>
						<select
							id="edit_status"
							name="status"
							value={selectedAsset.status}
							class="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface cursor-pointer"
						>
							<option value="ACTIVE">ACTIVE</option>
							<option value="IN_REPAIR">IN_REPAIR</option>
							<option value="DISPOSED">DISPOSED</option>
						</select>
					</div>
				</div>

				<div>
					<label for="edit_notes" class="block text-xs font-bold text-on-surface mb-1.5">Catatan</label>
					<textarea
						id="edit_notes"
						name="notes"
						rows="2"
						value={selectedAsset.notes || ''}
						class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-on-surface"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => isEditModalOpen = false}
						class="px-4 py-2.5 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
					>
						Simpan Perubahan
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
				<button onclick={() => isMutateModalOpen = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
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

				<div class="p-3 rounded-xl bg-surface-container-low text-xs space-y-1">
					<div class="font-bold text-on-surface">{selectedAsset.name} ({selectedAsset.asset_code})</div>
					<div class="text-on-surface-variant">
						<strong>Lokasi Saat Ini:</strong> {selectedAsset.location} {selectedAsset.room ? `(${selectedAsset.room})` : ''} • <strong>PIC:</strong> {selectedAsset.pic_name || 'Umum'}
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="mutate_loc" class="block text-xs font-bold text-on-surface mb-1.5">Lokasi Tujuan Baru <span class="text-rose-500">*</span></label>
						<select
							id="mutate_loc"
							name="to_location"
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-amber-500/20 text-on-surface cursor-pointer"
						>
							<option value="Head Office Cilegon">Head Office Cilegon</option>
							<option value="Pool Cilegon">Pool Cilegon</option>
							<option value="Pool Merak">Pool Merak</option>
						</select>
					</div>
					<div>
						<label for="mutate_room" class="block text-xs font-bold text-on-surface mb-1.5">Ruangan Tujuan</label>
						<input
							id="mutate_room"
							type="text"
							name="to_room"
							placeholder="Misal: Ruang Dispatcher OCS"
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-amber-500/20 text-on-surface"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="mutate_pic" class="block text-xs font-bold text-on-surface mb-1.5">PIC Penanggung Jawab Baru</label>
						<input
							id="mutate_pic"
							type="text"
							name="to_pic"
							placeholder="Nama staf penerima aset"
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-amber-500/20 text-on-surface"
						/>
					</div>
					<div>
						<label for="mutate_date" class="block text-xs font-bold text-on-surface mb-1.5">Tanggal Mutasi</label>
						<input
							id="mutate_date"
							type="date"
							name="mutation_date"
							value={new Date().toISOString().split('T')[0]}
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-amber-500/20 text-on-surface"
						/>
					</div>
				</div>

				<div>
					<label for="mutate_reason" class="block text-xs font-bold text-on-surface mb-1.5">Alasan Pemindahan / Mutasi <span class="text-rose-500">*</span></label>
					<textarea
						id="mutate_reason"
						name="reason"
						required
						rows="2"
						placeholder="Misal: Penyesuaian workstation divisi OCS, rotasi fasilitas pool..."
						class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-amber-500/20 text-on-surface"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => isMutateModalOpen = false}
						class="px-4 py-2.5 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
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
				<button onclick={() => isDetailModalOpen = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 space-y-5">
				<!-- Asset Basic Info Grid -->
				<div class="grid grid-cols-2 gap-3 text-xs p-3 rounded-xl bg-surface-container-low">
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
						class="px-4 py-2 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
					>
						Tutup
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@media print {
		:global(body *) {
			visibility: hidden !important;
		}
		:global(#printable-single-sticker),
		:global(#printable-single-sticker *),
		:global(#printable-batch-stickers),
		:global(#printable-batch-stickers *) {
			visibility: visible !important;
		}
		:global(#printable-single-sticker) {
			position: fixed !important;
			left: 50% !important;
			top: 50% !important;
			transform: translate(-50%, -50%) !important;
			width: 80mm !important;
			max-width: 80mm !important;
			border: 2px solid #000 !important;
			box-shadow: none !important;
		}
		:global(#printable-batch-stickers) {
			position: absolute !important;
			left: 0 !important;
			top: 0 !important;
			width: 100% !important;
			box-shadow: none !important;
			border: none !important;
		}
	}
</style>
