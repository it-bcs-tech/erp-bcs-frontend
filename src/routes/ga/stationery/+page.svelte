<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	let activeMainTab = $state<'ITEMS' | 'REQUESTS'>('ITEMS');
	let searchQuery = $state('');
	let categoryFilter = $state('All');
	let statusFilter = $state('All');

	let isAddItemModalOpen = $state(false);
	let isRestockModalOpen = $state(false);
	let isCreateRequestModalOpen = $state(false);
	let isDetailRequestModalOpen = $state(false);

	let selectedItem = $state<any>(null);
	let selectedRequest = $state<any>(null);

	// Multi-item request builder state
	let reqDepartment = $state('');
	let reqName = $state('');
	let reqNotes = $state('');
	let reqLines = $state<Array<{ item_id: number; item_name: string; unit: string; quantity: number; notes: string }>>([]);

	function openCreateRequestModal() {
		reqDepartment = 'Operations Control (OCS)';
		reqName = '';
		reqNotes = '';
		reqLines = [{ item_id: data.allItems[0]?.id || 0, item_name: data.allItems[0]?.name || '', unit: data.allItems[0]?.unit || '', quantity: 1, notes: '' }];
		isCreateRequestModalOpen = true;
	}

	function addRequestLine() {
		const first = data.allItems[0];
		reqLines.push({
			item_id: first ? first.id : 0,
			item_name: first ? first.name : '',
			unit: first ? first.unit : '',
			quantity: 1,
			notes: ''
		});
	}

	function removeRequestLine(index: number) {
		reqLines.splice(index, 1);
	}

	function handleItemSelect(index: number, itemId: number) {
		const found = data.allItems.find((i: any) => i.id === itemId);
		if (found) {
			reqLines[index].item_id = found.id;
			reqLines[index].item_name = found.name;
			reqLines[index].unit = found.unit;
		}
	}

	function openRestockModal(item: any) {
		selectedItem = item;
		isRestockModalOpen = true;
	}

	function openDetailRequestModal(req: any) {
		selectedRequest = req;
		isDetailRequestModalOpen = true;
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
			case 'ALAT_TULIS': return 'Alat Tulis';
			case 'KERTAS_CETAK': return 'Kertas & Cetak';
			case 'PERLENGKAPAN_KEBERSIHAN': return 'Perlengkapan Kebersihan';
			case 'PANTRY_KANTOR': return 'Pantry & Dapur Kantor';
			default: return cat;
		}
	}

	function getReqStatusBadge(status: string) {
		switch (status) {
			case 'DISTRIBUTED':
				return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200';
			case 'APPROVED':
				return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200';
			case 'REJECTED':
				return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200';
			default:
				return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200';
		}
	}

	const filteredItems = $derived(
		data.items.filter((i: any) => {
			const q = searchQuery.toLowerCase();
			const matchQ =
				!q ||
				i.name?.toLowerCase().includes(q) ||
				i.item_code?.toLowerCase().includes(q) ||
				i.category?.toLowerCase().includes(q);
			const matchCat = categoryFilter === 'All' || i.category === categoryFilter;
			return matchQ && matchCat;
		})
	);

	const filteredRequests = $derived(
		data.requests.filter((r: any) => {
			const q = searchQuery.toLowerCase();
			const matchQ =
				!q ||
				r.req_number?.toLowerCase().includes(q) ||
				r.department?.toLowerCase().includes(q) ||
				r.requester_name?.toLowerCase().includes(q) ||
				r.notes?.toLowerCase().includes(q);
			const matchStatus = statusFilter === 'All' || r.status === statusFilter;
			return matchQ && matchStatus;
		})
	);
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
		<div>
			<div class="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">
				<span class="material-symbols-outlined text-sm">edit_document</span>
				<span>KR 7.4 • Pengadaan & Stok Perlengkapan Operasional</span>
			</div>
			<h1 class="text-3xl font-black text-on-surface tracking-tight">Katalog & Permintaan ATK</h1>
			<p class="text-xs text-on-surface-variant mt-1">
				Kontrol stok habis pakai internal (ATK, kertas cetak, perlengkapan kebersihan & pantry) serta alur approval pengajuan divisi.
			</p>
		</div>

		<div class="flex items-center gap-2.5 self-start md:self-auto">
			<button
				onclick={openCreateRequestModal}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors"
			>
				<span class="material-symbols-outlined text-base">post_add</span>
				<span>+ Ajukan Permintaan ATK</span>
			</button>
			<button
				onclick={() => isAddItemModalOpen = true}
				class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold border border-slate-200 dark:border-slate-800 transition-colors shadow-2xs"
			>
				<span class="material-symbols-outlined text-base text-cyan-600">add_box</span>
				<span>+ Master Barang</span>
			</button>
		</div>
	</div>

	<!-- Top Metric Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Item ATK Terdaftar</span>
			<div class="text-2xl font-black text-on-surface mt-1">
				{data.stats.totalItemCount} <span class="text-sm font-normal text-on-surface-variant">jenis barang</span>
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1">
				Katalog barang habis pakai kantor & pool
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-amber-300 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/30 to-transparent">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Stok Menipis / Kritis</span>
				{#if data.stats.lowStockCount > 0}
					<span class="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping"></span>
				{/if}
			</div>
			<div class="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
				{data.stats.lowStockCount} <span class="text-sm font-normal text-on-surface-variant">item</span>
			</div>
			<p class="text-[11px] text-amber-700 font-medium mt-1">
				Di bawah batas stok minimum aman
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-purple-300 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/30 to-transparent">
			<span class="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Pengajuan Menunggu Approval</span>
			<div class="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">
				{data.stats.pendingRequestCount} <span class="text-sm font-normal text-on-surface-variant">request</span>
			</div>
			<p class="text-[11px] text-purple-700 font-medium mt-1">
				Pengajuan kebutuhan antar departemen
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nilai Estimasi Stok Gudang</span>
			<div class="text-2xl font-black text-emerald-600 mt-1">
				{formatRupiah(data.stats.totalStockValuation)}
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1">
				Valuasi total persediaan internal
			</p>
		</div>
	</div>

	<!-- Main Sub-Module Tab Switcher -->
	<div class="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
		<button
			onclick={() => activeMainTab = 'ITEMS'}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 {activeMainTab === 'ITEMS'
				? 'bg-purple-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">inventory_2</span>
			<span>Katalog & Stok Gudang ({data.items.length})</span>
		</button>

		<button
			onclick={() => activeMainTab = 'REQUESTS'}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 {activeMainTab === 'REQUESTS'
				? 'bg-purple-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">assignment_turned_in</span>
			<span>Pengajuan Kebutuhan Divisi ({data.requests.length})</span>
			{#if data.stats.pendingRequestCount > 0}
				<span class="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black">{data.stats.pendingRequestCount}</span>
			{/if}
		</button>
	</div>

	<!-- TAB 1: Master Stok ATK -->
	{#if activeMainTab === 'ITEMS'}
		<!-- Filter & Search Bar -->
		<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<div class="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 w-full md:w-80 focus-within:border-purple-500">
				<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari kode, nama barang ATK..."
					class="bg-transparent text-xs text-on-surface outline-none w-full placeholder:text-on-surface-variant/50"
				/>
			</div>

			<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
				<select
					bind:value={categoryFilter}
					class="px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs text-on-surface font-medium"
				>
					<option value="All">Semua Kategori</option>
					<option value="ALAT_TULIS">Alat Tulis</option>
					<option value="KERTAS_CETAK">Kertas & Cetak</option>
					<option value="PERLENGKAPAN_KEBERSIHAN">Perlengkapan Kebersihan</option>
					<option value="PANTRY_KANTOR">Pantry Kantor</option>
				</select>
			</div>
		</div>

		<!-- Table Items -->
		<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3 px-4">Kode Item</th>
							<th class="py-3 px-4">Nama Barang</th>
							<th class="py-3 px-4">Kategori</th>
							<th class="py-3 px-4">Satuan</th>
							<th class="py-3 px-4 text-center">Stok Tersedia</th>
							<th class="py-3 px-4 text-center">Status Stok</th>
							<th class="py-3 px-4 text-right">Harga Satuan (Est)</th>
							<th class="py-3 px-4 text-right">Total Nilai</th>
							<th class="py-3 px-4 text-center">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each filteredItems as item}
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-3 px-4 font-mono font-bold text-on-surface">
									{item.item_code}
								</td>
								<td class="py-3 px-4 font-bold text-on-surface">
									{item.name}
								</td>
								<td class="py-3 px-4 text-on-surface-variant font-medium">
									{getCategoryLabel(item.category)}
								</td>
								<td class="py-3 px-4 text-on-surface font-semibold">
									{item.unit}
								</td>
								<td class="py-3 px-4 text-center font-mono font-black text-sm text-on-surface">
									{item.stock_quantity}
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									{#if item.isLowStock}
										<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 animate-pulse">
											<span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
											Stok Menipis (Min: {item.minimum_stock})
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200">
											Aman (&gt; {item.minimum_stock})
										</span>
									{/if}
								</td>
								<td class="py-3 px-4 text-right font-mono text-on-surface-variant">
									{formatRupiah(item.unit_price_estimate)}
								</td>
								<td class="py-3 px-4 text-right font-mono font-bold text-on-surface">
									{formatRupiah(item.total_value)}
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									<div class="flex items-center justify-center gap-1.5">
										<button
											onclick={() => openRestockModal(item)}
											title="Tambah Stok Masuk"
											class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 font-bold text-[11px] hover:bg-emerald-100 transition-colors"
										>
											<span class="material-symbols-outlined text-[13px]">add</span>
											<span>Restock</span>
										</button>

										<form
											method="POST"
											action="?/deleteItem"
											use:enhance={() => {
												if (!confirm(`Hapus barang ${item.name} dari katalog?`)) return ({ cancel }: any) => cancel();
											}}
											class="inline"
										>
											<input type="hidden" name="id" value={item.id} />
											<button
												type="submit"
												title="Hapus Barang"
												class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
											>
												<span class="material-symbols-outlined text-[16px]">delete</span>
											</button>
										</form>
									</div>
								</td>
							</tr>
						{/each}

						{#if filteredItems.length === 0}
							<tr>
								<td colspan="9" class="py-8 text-center text-on-surface-variant text-xs">
									Tidak ada barang yang sesuai kriteria pencarian.
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- TAB 2: Pengajuan Permintaan ATK -->
	{#if activeMainTab === 'REQUESTS'}
		<!-- Filter Bar -->
		<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<div class="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 w-full md:w-80 focus-within:border-purple-500">
				<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari no request, divisi, pemohon..."
					class="bg-transparent text-xs text-on-surface outline-none w-full placeholder:text-on-surface-variant/50"
				/>
			</div>

			<div class="flex items-center gap-2">
				<select
					bind:value={statusFilter}
					class="px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs text-on-surface font-medium"
				>
					<option value="All">Semua Status</option>
					<option value="SUBMITTED">SUBMITTED (Menunggu Approval)</option>
					<option value="APPROVED">APPROVED (Disetujui)</option>
					<option value="DISTRIBUTED">DISTRIBUTED (Barang Diserahkan)</option>
					<option value="REJECTED">REJECTED (Ditolak)</option>
				</select>
			</div>
		</div>

		<!-- Table Requests -->
		<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3 px-4">No. Pengajuan & Tgl</th>
							<th class="py-3 px-4">Departemen Pemohon</th>
							<th class="py-3 px-4">Nama Pemohon</th>
							<th class="py-3 px-4">Item Diajukan</th>
							<th class="py-3 px-4 text-center">Status</th>
							<th class="py-3 px-4">Penyetuju (Approval)</th>
							<th class="py-3 px-4">Catatan</th>
							<th class="py-3 px-4 text-center">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each filteredRequests as req}
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-3 px-4 whitespace-nowrap">
									<div class="font-mono font-bold text-on-surface">{req.req_number}</div>
									<div class="text-[10px] text-on-surface-variant">{formatDate(req.request_date)}</div>
								</td>
								<td class="py-3 px-4 font-bold text-on-surface">
									{req.department}
								</td>
								<td class="py-3 px-4 font-semibold text-on-surface">
									{req.requester_name}
								</td>
								<td class="py-3 px-4">
									<div class="font-semibold text-purple-600">{req.total_items_count} Jenis Barang</div>
									<div class="text-[10px] text-on-surface-variant line-clamp-1">
										{req.items.map((i: any) => `${i.item_name} (${i.quantity_requested} ${i.unit})`).join(', ')}
									</div>
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									<span class="px-2.5 py-0.5 rounded text-[10px] font-bold {getReqStatusBadge(req.status)}">
										{req.status}
									</span>
								</td>
								<td class="py-3 px-4 text-on-surface-variant">
									{#if req.approved_by}
										<div class="font-medium text-on-surface">{req.approved_by}</div>
										<div class="text-[10px]">{req.approved_at}</div>
									{:else}
										<span class="italic text-[11px]">Belum diproses</span>
									{/if}
								</td>
								<td class="py-3 px-4 text-on-surface-variant max-w-xs truncate">
									{req.notes || '-'}
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									<div class="flex items-center justify-center gap-1.5">
										<button
											onclick={() => openDetailRequestModal(req)}
											title="Rincian Barang & Approval"
											class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-[11px] border border-slate-200 dark:border-slate-700 transition-colors"
										>
											<span class="material-symbols-outlined text-[14px]">checklist</span>
											<span>Detail & Proses</span>
										</button>
									</div>
								</td>
							</tr>
						{/each}

						{#if filteredRequests.length === 0}
							<tr>
								<td colspan="8" class="py-8 text-center text-on-surface-variant text-xs">
									Tidak ada pengajuan permintaan ATK yang sesuai filter.
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<!-- MODAL: Tambah Master Barang ATK Baru -->
{#if isAddItemModalOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-purple-600">add_box</span>
					<h3 class="font-bold text-base text-on-surface">Tambah Master Barang ATK</h3>
				</div>
				<button onclick={() => isAddItemModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/createItem"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							isAddItemModalOpen = false;
						}
					};
				}}
				class="p-6 space-y-4"
			>
				<div>
					<label for="item_name" class="block text-xs font-bold text-on-surface mb-1">Nama Barang *</label>
					<input
						id="item_name"
						type="text"
						name="name"
						required
						placeholder="Misal: Spidol Whiteboard Hitam"
						class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="item_category" class="block text-xs font-bold text-on-surface mb-1">Kategori *</label>
						<select
							id="item_category"
							name="category"
							required
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						>
							<option value="ALAT_TULIS">Alat Tulis</option>
							<option value="KERTAS_CETAK">Kertas & Cetak</option>
							<option value="PERLENGKAPAN_KEBERSIHAN">Perlengkapan Kebersihan</option>
							<option value="PANTRY_KANTOR">Pantry Kantor</option>
						</select>
					</div>
					<div>
						<label for="item_unit" class="block text-xs font-bold text-on-surface mb-1">Satuan *</label>
						<input
							id="item_unit"
							type="text"
							name="unit"
							required
							placeholder="Pcs, Rim, Box, Jerigen..."
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						/>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-3">
					<div>
						<label for="item_stock_qty" class="block text-[11px] font-bold text-on-surface mb-1">Stok Awal</label>
						<input
							id="item_stock_qty"
							type="number"
							name="stock_quantity"
							min="0"
							value="10"
							class="w-full px-3 py-1.5 text-xs rounded-lg bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono"
						/>
					</div>
					<div>
						<label for="item_min_stock" class="block text-[11px] font-bold text-on-surface mb-1">Stok Minimum</label>
						<input
							id="item_min_stock"
							type="number"
							name="minimum_stock"
							min="1"
							value="5"
							class="w-full px-3 py-1.5 text-xs rounded-lg bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono"
						/>
					</div>
					<div>
						<label for="item_unit_price" class="block text-[11px] font-bold text-on-surface mb-1">Harga Satuan (Rp)</label>
						<input
							id="item_unit_price"
							type="number"
							name="unit_price_estimate"
							min="0"
							step="500"
							value="25000"
							class="w-full px-3 py-1.5 text-xs rounded-lg bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono"
						/>
					</div>
				</div>

				<div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => isAddItemModalOpen = false}
						class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors"
					>
						Simpan Barang
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: Restock Tambah Stok Masuk -->
{#if isRestockModalOpen && selectedItem}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<h3 class="font-bold text-sm text-on-surface">Tambah Stok Barang Masuk</h3>
				<button onclick={() => isRestockModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/restockItem"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							isRestockModalOpen = false;
						}
					};
				}}
				class="p-5 space-y-4"
			>
				<input type="hidden" name="id" value={selectedItem.id} />

				<div class="p-3 rounded-xl bg-surface-container-low text-xs space-y-1">
					<div class="font-bold text-on-surface">{selectedItem.name}</div>
					<div class="text-on-surface-variant">Stok Saat Ini: <strong>{selectedItem.stock_quantity} {selectedItem.unit}</strong></div>
				</div>

				<div>
					<label for="restock_qty" class="block text-xs font-bold text-on-surface mb-1">Jumlah Tambahan Masuk ({selectedItem.unit}) *</label>
					<input
						id="restock_qty"
						type="number"
						name="added_quantity"
						min="1"
						value="10"
						required
						class="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono font-bold"
					/>
				</div>

				<div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => isRestockModalOpen = false}
						class="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
					>
						+ Tambah Stok
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: Ajukan Permintaan ATK Multi-Item -->
{#if isCreateRequestModalOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-purple-600">post_add</span>
					<h3 class="font-bold text-base text-on-surface">Form Pengajuan Kebutuhan ATK Divisi</h3>
				</div>
				<button onclick={() => isCreateRequestModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/createRequest"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							isCreateRequestModalOpen = false;
							activeMainTab = 'REQUESTS';
						}
					};
				}}
				class="p-6 space-y-4"
			>
				<input type="hidden" name="items_json" value={JSON.stringify(reqLines)} />

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="req_dept" class="block text-xs font-bold text-on-surface mb-1">Departemen / Divisi Pemohon *</label>
						<select
							id="req_dept"
							name="department"
							bind:value={reqDepartment}
							required
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						>
							<option value="Operations Control (OCS)">Operations Control (OCS)</option>
							<option value="QHSE & Safety">QHSE & Safety</option>
							<option value="Fleet Management (FMS)">Fleet Management (FMS)</option>
							<option value="Workshop Maintenance">Workshop Maintenance</option>
							<option value="Finance & Accounting">Finance & Accounting</option>
							<option value="Marketing & Sales">Marketing & Sales</option>
							<option value="HR & Legal">HR & Legal</option>
							<option value="Security & Pool">Security & Pool</option>
						</select>
					</div>
					<div>
						<label for="req_pic_name" class="block text-xs font-bold text-on-surface mb-1">Nama Pemohon (PIC) *</label>
						<input
							id="req_pic_name"
							type="text"
							name="requester_name"
							bind:value={reqName}
							required
							placeholder="Nama staf pengaju"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						/>
					</div>
				</div>

				<!-- Multi-Item Lines -->
				<div class="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
					<div class="flex items-center justify-between">
						<label for="daftar_item_atk" class="text-xs font-bold text-on-surface">Daftar Barang yang Diajukan</label>
						<button
							id="daftar_item_atk"
							type="button"
							onclick={addRequestLine}
							class="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
						>
							<span class="material-symbols-outlined text-sm">add_circle</span>
							<span>+ Tambah Baris Barang</span>
						</button>
					</div>

					<div class="space-y-2.5 max-h-60 overflow-y-auto pr-1">
						{#each reqLines as line, idx}
							<div class="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-slate-200/50 dark:border-slate-800/50">
								<div class="flex-1">
									<select
										value={line.item_id}
										onchange={(e) => handleItemSelect(idx, parseInt((e.target as HTMLSelectElement).value, 10))}
										class="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface-container border border-slate-200 dark:border-slate-700 text-on-surface"
									>
										{#each data.allItems as it}
											<option value={it.id}>{it.name} (Stok: {it.stock_quantity} {it.unit})</option>
										{/each}
									</select>
								</div>
								<div class="w-20">
									<input
										type="number"
										min="1"
										bind:value={line.quantity}
										placeholder="Qty"
										class="w-full px-2 py-1.5 text-xs rounded-lg bg-surface-container border border-slate-200 dark:border-slate-700 text-on-surface font-mono text-center font-bold"
									/>
								</div>
								<div class="w-16 text-xs text-on-surface-variant font-medium text-center">
									{line.unit}
								</div>
								<div class="flex-1">
									<input
										type="text"
										bind:value={line.notes}
										placeholder="Keterangan peruntukan..."
										class="w-full px-2 py-1.5 text-xs rounded-lg bg-surface-container border border-slate-200 dark:border-slate-700 text-on-surface"
									/>
								</div>
								{#if reqLines.length > 1}
									<button
										type="button"
										onclick={() => removeRequestLine(idx)}
										class="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
									>
										<span class="material-symbols-outlined text-sm">remove_circle</span>
									</button>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<div>
					<label for="req_notes" class="block text-xs font-bold text-on-surface mb-1">Catatan Umum Permintaan</label>
					<textarea
						id="req_notes"
						name="notes"
						bind:value={reqNotes}
						rows="2"
						placeholder="Misal: Kebutuhan cetak surat jalan awal bulan, persiapan audit berkas..."
						class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => isCreateRequestModalOpen = false}
						class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors"
					>
						Kirim Pengajuan ATK
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: Detail & Alur Approval Pengajuan ATK -->
{#if isDetailRequestModalOpen && selectedRequest}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div>
					<div class="text-[11px] font-mono font-bold text-purple-600 uppercase">{selectedRequest.req_number}</div>
					<h3 class="font-bold text-base text-on-surface">Detail & Proses Pengajuan ATK</h3>
				</div>
				<button onclick={() => isDetailRequestModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 space-y-4 text-xs">
				<div class="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-container-low border border-slate-200/50 dark:border-slate-800/50">
					<div>
						<span class="text-on-surface-variant text-[10px] uppercase font-bold block">Departemen</span>
						<span class="font-bold text-on-surface">{selectedRequest.department}</span>
						<span class="text-on-surface-variant block text-[11px]">Pemohon: {selectedRequest.requester_name}</span>
					</div>
					<div>
						<span class="text-on-surface-variant text-[10px] uppercase font-bold block">Status</span>
						<span class="px-2.5 py-0.5 rounded text-[10px] font-bold {getReqStatusBadge(selectedRequest.status)}">
							{selectedRequest.status}
						</span>
						{#if selectedRequest.approved_by}
							<span class="text-on-surface-variant block text-[10px] mt-1">Disetujui: {selectedRequest.approved_by}</span>
						{/if}
					</div>
				</div>

				{#if selectedRequest.notes}
					<p class="italic text-on-surface bg-surface-container-low p-2.5 rounded-lg border border-slate-200/40">
						"{selectedRequest.notes}"
					</p>
				{/if}

				<!-- Items Table -->
				<div>
					<h4 class="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">Daftar Item Diajukan:</h4>
					<div class="rounded-xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
						<table class="w-full text-left text-xs">
							<thead class="bg-surface-container-low text-on-surface-variant text-[10px] font-bold uppercase">
								<tr>
									<th class="py-2 px-3">Nama Barang</th>
									<th class="py-2 px-3 text-center">Jumlah Diajukan</th>
									<th class="py-2 px-3 text-center">Satuan</th>
									<th class="py-2 px-3">Catatan</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
								{#each selectedRequest.items as it}
									<tr>
										<td class="py-2 px-3 font-semibold text-on-surface">{it.item_name}</td>
										<td class="py-2 px-3 text-center font-mono font-bold text-purple-600">{it.quantity_requested}</td>
										<td class="py-2 px-3 text-center text-on-surface-variant">{it.unit}</td>
										<td class="py-2 px-3 text-on-surface-variant">{it.notes || '-'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Action Buttons based on status -->
				<div class="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => isDetailRequestModalOpen = false}
						class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container"
					>
						Tutup
					</button>

					<div class="flex items-center gap-2">
						{#if selectedRequest.status === 'SUBMITTED'}
							<form
								method="POST"
								action="?/rejectRequest"
								use:enhance={() => {
									if (!confirm('Tolak pengajuan ATK ini?')) return ({ cancel }: any) => cancel();
									isDetailRequestModalOpen = false;
								}}
								class="inline"
							>
								<input type="hidden" name="id" value={selectedRequest.id} />
								<button
									type="submit"
									class="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
								>
									Tolak
								</button>
							</form>

							<form
								method="POST"
								action="?/approveRequest"
								use:enhance={() => {
									isDetailRequestModalOpen = false;
								}}
								class="inline"
							>
								<input type="hidden" name="id" value={selectedRequest.id} />
								<button
									type="submit"
									class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors"
								>
									Setujui Pengajuan
								</button>
							</form>
						{:else if selectedRequest.status === 'APPROVED'}
							<form
								method="POST"
								action="?/distributeRequest"
								use:enhance={() => {
									if (!confirm('Konfirmasi penyerahan barang ATK? Stok gudang akan otomatis terpotong.')) return ({ cancel }: any) => cancel();
									isDetailRequestModalOpen = false;
								}}
								class="inline"
							>
								<input type="hidden" name="id" value={selectedRequest.id} />
								<button
									type="submit"
									class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
								>
									<span class="material-symbols-outlined text-[15px]">done_all</span>
									<span>Serahkan Barang (Potong Stok)</span>
								</button>
							</form>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
