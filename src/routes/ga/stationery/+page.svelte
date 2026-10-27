<script lang="ts">
	import { enhance } from '$app/forms';
	import Pagination from '$lib/components/Pagination.svelte';

	let { data } = $props();

	let activeMainTab = $state<'ITEMS' | 'REQUESTS' | 'PURCHASING'>('ITEMS');
	let searchQuery = $state('');
	let categoryFilter = $state('All');
	let statusFilter = $state('All');
	let prStatusFilter = $state('All');

	let isAddItemModalOpen = $state(false);
	let isRestockModalOpen = $state(false);
	let isCreateRequestModalOpen = $state(false);
	let isDetailRequestModalOpen = $state(false);

	// Purchasing Modal States
	let isCreatePrModalOpen = $state(false);
	let isDetailPrModalOpen = $state(false);
	let isReceivePrModalOpen = $state(false);

	let selectedItem = $state<any>(null);
	let selectedRequest = $state<any>(null);
	let selectedPr = $state<any>(null);

	// Multi-item internal request builder state
	let reqDepartment = $state('');
	let reqName = $state('');
	let reqNotes = $state('');
	let reqLines = $state<Array<{ item_id: number; item_name: string; unit: string; quantity: number; notes: string }>>([]);

	// GA PR Builder state (Pengadaan ke PMS)
	let prRequestedBy = $state('General Affair Team');
	let prOrderType = $state('RO');
	let prRequiredDate = $state('');
	let prNotes = $state('Pengadaan Rutin Kebutuhan Kantor GA (COMS)');
	let prLines = $state<
		Array<{
			item_id: number;
			material_id: number | null;
			item_name: string;
			unit: string;
			unit_price: number;
			qty: number;
			remarks: string;
		}>
	>([]);

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

	// PR to PMS functions
	function openCreatePrModal() {
		prRequestedBy = 'General Affair Team';
		prOrderType = 'RO';
		const nextWeek = new Date();
		nextWeek.setDate(nextWeek.getDate() + 7);
		prRequiredDate = nextWeek.toISOString().split('T')[0];
		prNotes = 'Pengadaan Rutin Kebutuhan Kantor GA (COMS)';

		// If low stock exists, prefill low stock, otherwise start with 1 row
		const lowStocks = data.allItems.filter((it: any) => it.isLowStock);
		if (lowStocks.length > 0) {
			prLines = lowStocks.slice(0, 10).map((it: any) => ({
				item_id: it.id,
				material_id: it.material_id,
				item_name: it.name,
				unit: it.unit,
				unit_price: it.unit_price_estimate || 0,
				qty: Math.max(1, it.minimum_stock * 2 - it.stock_quantity),
				remarks: `Restock aman (Stok: ${it.stock_quantity}, Min: ${it.minimum_stock})`
			}));
		} else {
			const first = data.allItems[0];
			prLines = [
				{
					item_id: first ? first.id : 0,
					material_id: first ? first.material_id : null,
					item_name: first ? first.name : '',
					unit: first ? first.unit : 'PCS',
					unit_price: first ? first.unit_price_estimate : 0,
					qty: 5,
					remarks: 'Kebutuhan GA COMS'
				}
			];
		}
		isCreatePrModalOpen = true;
	}

	function loadAllLowStockToPr() {
		const lowStocks = data.allItems.filter((it: any) => it.isLowStock);
		if (lowStocks.length === 0) {
			alert('Semua stok barang ATK & COMS saat ini berada di atas batas minimum aman.');
			return;
		}
		prLines = lowStocks.map((it: any) => ({
			item_id: it.id,
			material_id: it.material_id,
			item_name: it.name,
			unit: it.unit,
			unit_price: it.unit_price_estimate || 0,
			qty: Math.max(1, it.minimum_stock * 2 - it.stock_quantity),
			remarks: `Low Stock otomatis (Stok: ${it.stock_quantity}, Min: ${it.minimum_stock})`
		}));
	}

	function addPrLine() {
		const first = data.allItems[0];
		prLines.push({
			item_id: first ? first.id : 0,
			material_id: first ? first.material_id : null,
			item_name: first ? first.name : '',
			unit: first ? first.unit : 'PCS',
			unit_price: first ? first.unit_price_estimate : 0,
			qty: 1,
			remarks: ''
		});
	}

	function removePrLine(index: number) {
		prLines.splice(index, 1);
	}

	function handlePrItemSelect(index: number, itemId: number) {
		const found = data.allItems.find((i: any) => i.id === itemId);
		if (found) {
			prLines[index].item_id = found.id;
			prLines[index].material_id = found.material_id;
			prLines[index].item_name = found.name;
			prLines[index].unit = found.unit;
			prLines[index].unit_price = found.unit_price_estimate || 0;
		}
	}

	function openDetailPrModal(pr: any) {
		selectedPr = pr;
		isDetailPrModalOpen = true;
	}

	function openReceivePrModal(pr: any) {
		selectedPr = pr;
		isReceivePrModalOpen = true;
	}

	function formatRupiah(amount: number | string | null) {
		const num = typeof amount === 'string' ? parseFloat(amount) : amount || 0;
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
			case 'ATK':
				return 'ATK (Alat Tulis Kantor)';
			case 'FORM':
				return 'Formulir Operasional';
			case 'TONNER':
			case 'TINTA':
				return 'Toner & Tinta Printer';
			case 'MATERAI':
				return 'Materai Resmi';
			case 'SANITASI_COVID':
				return 'Sanitasi / K3 Kantor';
			default:
				return cat;
		}
	}

	function getReqStatusBadge(status: string) {
		switch (status) {
			case 'DISTRIBUTED':
				return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
			case 'APPROVED':
				return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
			case 'REJECTED':
				return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
			default:
				return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
		}
	}

	function getPrStatusBadge(status: string) {
		switch (status) {
			case 'DELIVERED':
			case 'DONE':
				return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
			case 'PROCESSED':
				return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
			case 'APPROVED':
				return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
			case 'CANCELLED':
				return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
			default:
				return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
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

	const filteredGaPrs = $derived(
		(data.gaPrs || []).filter((p: any) => {
			const q = searchQuery.toLowerCase();
			const matchQ =
				!q ||
				p.prNumber?.toLowerCase().includes(q) ||
				p.requestedBy?.toLowerCase().includes(q) ||
				p.notes?.toLowerCase().includes(q);
			const matchStatus = prStatusFilter === 'All' || p.status === prStatusFilter;
			return matchQ && matchStatus;
		})
	);

	// Total calculation in PR Modal
	const prModalTotal = $derived(
		prLines.reduce((acc, cur) => acc + (cur.qty || 0) * (cur.unit_price || 0), 0)
	);

	// Pagination for Tab 1 (Items)
	let itemCurrentPage = $state(1);
	const itemPerPage = 10;
	const totalItemPages = $derived(Math.max(1, Math.ceil(filteredItems.length / itemPerPage)));
	const paginatedItems = $derived(
		filteredItems.slice((itemCurrentPage - 1) * itemPerPage, itemCurrentPage * itemPerPage)
	);

	// Pagination for Tab 2 (Requests)
	let reqCurrentPage = $state(1);
	const reqPerPage = 10;
	const totalReqPages = $derived(Math.max(1, Math.ceil(filteredRequests.length / reqPerPage)));
	const paginatedRequests = $derived(
		filteredRequests.slice((reqCurrentPage - 1) * reqPerPage, reqCurrentPage * reqPerPage)
	);

	// Pagination for Tab 3 (Purchasing PRs)
	let prCurrentPage = $state(1);
	const prPerPage = 10;
	const totalPrPages = $derived(Math.max(1, Math.ceil(filteredGaPrs.length / prPerPage)));
	const paginatedGaPrs = $derived(
		filteredGaPrs.slice((prCurrentPage - 1) * prPerPage, prCurrentPage * prPerPage)
	);

	$effect(() => {
		const _ = [searchQuery, categoryFilter, data.items];
		itemCurrentPage = 1;
	});

	$effect(() => {
		const _ = [searchQuery, statusFilter, data.requests];
		reqCurrentPage = 1;
	});

	$effect(() => {
		const _ = [searchQuery, prStatusFilter, data.gaPrs];
		prCurrentPage = 1;
	});
</script>

<svelte:head>
	<title>Stationery & Purchasing | General Affair | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
		<div>
			<div class="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">
				<span class="material-symbols-outlined text-sm">edit_document</span>
				<span>General Affair • Pengadaan & Stok Perlengkapan Operasional</span>
			</div>
			<h1 class="text-3xl font-black text-on-surface tracking-tight">Katalog ATK & Pengadaan PMS</h1>
			<p class="text-xs text-on-surface-variant mt-1">
				Kontrol stok habis pakai (COMS: ATK, Formulir, Toner, Materai & Sanitasi), pengajuan divisi internal, serta pengadaan terintegrasi ke PMS.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
			<button
				onclick={openCreatePrModal}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">shopping_cart_checkout</span>
				<span>+ Ajukan PR ke PMS</span>
			</button>
			<button
				onclick={openCreateRequestModal}
				class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold border border-slate-200 dark:border-slate-800 transition-colors shadow-2xs cursor-pointer"
			>
				<span class="material-symbols-outlined text-base text-purple-600">post_add</span>
				<span>+ Form Permintaan Divisi</span>
			</button>
			<button
				onclick={() => (isAddItemModalOpen = true)}
				class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold border border-slate-200 dark:border-slate-800 transition-colors shadow-2xs cursor-pointer"
			>
				<span class="material-symbols-outlined text-base text-cyan-600">add_box</span>
				<span>+ Master Barang</span>
			</button>
		</div>
	</div>

	<!-- Top Metric Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Katalog Barang GA</span>
			<div class="text-2xl font-black text-on-surface mt-1">
				{data.stats.totalItemCount} <span class="text-sm font-normal text-on-surface-variant">jenis item</span>
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1">
				Tersinkronisasi 5 kategori COMS & Master PMS
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-amber-300 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/30 to-transparent shadow-2xs">
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
				Perlu restock pengadaan ke modul PMS
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-purple-300 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/30 to-transparent shadow-2xs">
			<span class="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Purchase Request GA</span>
			<div class="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">
				{data.stats.gaPrCount} <span class="text-sm font-normal text-on-surface-variant">PR diajukan</span>
			</div>
			<p class="text-[11px] text-purple-700 font-medium mt-1">
				{data.stats.pendingPrCount} menunggu persetujuan / proses PO PMS
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nilai Estimasi Stok Gudang</span>
			<div class="text-2xl font-black text-emerald-600 mt-1">
				{formatRupiah(data.stats.totalStockValuation)}
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1">
				Valuasi total persediaan internal kantor
			</p>
		</div>
	</div>

	<!-- Main Sub-Module Tab Switcher -->
	<div class="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
		<button
			onclick={() => (activeMainTab = 'ITEMS')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeMainTab === 'ITEMS'
				? 'bg-purple-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">inventory_2</span>
			<span>Katalog & Stok Gudang ({data.items.length})</span>
		</button>

		<button
			onclick={() => (activeMainTab = 'REQUESTS')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeMainTab === 'REQUESTS'
				? 'bg-purple-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">assignment_turned_in</span>
			<span>Permintaan Divisi Internal ({data.requests.length})</span>
			{#if data.stats.pendingRequestCount > 0}
				<span class="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black">{data.stats.pendingRequestCount}</span>
			{/if}
		</button>

		<button
			onclick={() => (activeMainTab = 'PURCHASING')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeMainTab === 'PURCHASING'
				? 'bg-purple-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">shopping_cart_checkout</span>
			<span>Pengadaan ke PMS & Anggaran COMS ({data.gaPrs.length})</span>
			{#if data.stats.pendingPrCount > 0}
				<span class="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black">{data.stats.pendingPrCount}</span>
			{/if}
		</button>
	</div>

	<!-- TAB 1: Master Stok ATK -->
	{#if activeMainTab === 'ITEMS'}
		<!-- Filter & Search Bar (Borderless Standard) -->
		<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low w-full md:w-80 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
				<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari kode, nama barang ATK..."
					class="bg-transparent text-xs w-full outline-none text-on-surface placeholder:text-on-surface-variant/50"
				/>
				{#if searchQuery}
					<button onclick={() => (searchQuery = '')} class="text-on-surface-variant hover:text-on-surface">
						<span class="material-symbols-outlined text-xs">close</span>
					</button>
				{/if}
			</div>

			<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
				<div class="flex items-center gap-1.5 overflow-x-auto py-1">
					{#each ['All', 'ATK', 'FORM', 'TONNER', 'MATERAI', 'SANITASI_COVID'] as cat}
						<button
							onclick={() => (categoryFilter = cat)}
							class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer {categoryFilter === cat
								? 'bg-purple-600 text-white font-bold'
								: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
						>
							{cat === 'All' ? 'Semua Kategori' : cat}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Table -->
		<div class="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden bg-surface-container-lowest shadow-2xs">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead>
						<tr class="bg-surface-container-low/50 border-b border-slate-200/60 dark:border-slate-800/60 text-on-surface-variant font-bold">
							<th class="py-3 px-4">Kode Item</th>
							<th class="py-3 px-4">Nama Barang</th>
							<th class="py-3 px-4">Kategori COMS</th>
							<th class="py-3 px-4 text-center">Status Stok</th>
							<th class="py-3 px-4 text-right">Estimasi Satuan</th>
							<th class="py-3 px-4 text-right">Total Nilai</th>
							<th class="py-3 px-4 text-center">PMS Sync</th>
							<th class="py-3 px-4 text-center">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-800/40">
						{#if paginatedItems.length === 0}
							<tr>
								<td colspan="8" class="text-center py-12 text-on-surface-variant">
									<span class="material-symbols-outlined text-4xl mb-2 text-on-surface-variant/40">search_off</span>
									<p class="font-medium">Tidak ada barang ATK yang cocok dengan filter</p>
								</td>
							</tr>
						{:else}
							{#each paginatedItems as item}
								<tr class="hover:bg-surface-container-low/30 transition-colors">
									<td class="py-3 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
										{item.item_code}
									</td>
									<td class="py-3 px-4">
										<div class="font-bold text-on-surface">{item.name}</div>
										<div class="text-[10px] text-on-surface-variant flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
											<span>Satuan: <strong>{item.unit}</strong></span>
											{#if item.pms_spec && item.pms_spec !== item.name}
												<span class="text-purple-600 dark:text-purple-400 font-medium">Spec: {item.pms_spec}</span>
											{/if}
										</div>
									</td>
									<td class="py-3 px-4">
										<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface">
											{item.category}
										</span>
									</td>
									<td class="py-3 px-4 text-center">
										<div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold {item.isLowStock
											? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
											: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'}">
											<span>{item.stock_quantity} {item.unit}</span>
											{#if item.isLowStock}
												<span class="text-[9px] uppercase px-1 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">Kritis</span>
											{/if}
										</div>
										<div class="text-[10px] text-on-surface-variant/70 mt-0.5">Min: {item.minimum_stock}</div>
									</td>
									<td class="py-3 px-4 text-right font-medium text-on-surface">
										{formatRupiah(item.unit_price_estimate)}
									</td>
									<td class="py-3 px-4 text-right font-bold text-on-surface">
										{formatRupiah(item.total_value)}
									</td>
									<td class="py-3 px-4 text-center">
										{#if item.material_id}
											<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800" title="Terhubung ke Material PMS">
												<span class="material-symbols-outlined text-[12px]">link</span>
												<span>{item.pms_code || `ID: ${item.material_id}`}</span>
											</span>
										{:else}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
												<span>Auto</span>
											</span>
										{/if}
									</td>
									<td class="py-3 px-4 text-center">
										<div class="flex items-center justify-center gap-1.5">
											<button
												onclick={() => openRestockModal(item)}
												class="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-purple-600 dark:text-purple-400 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
												title="Catat barang masuk manual"
											>
												<span class="material-symbols-outlined text-[14px]">add</span>
												<span>Masuk</span>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<div class="p-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-surface-container-low/20">
				<Pagination
					currentPage={itemCurrentPage}
					totalPages={totalItemPages}
					onPageChange={(p) => (itemCurrentPage = p)}
				/>
			</div>
		</div>

	<!-- TAB 2: Permintaan Divisi Internal -->
	{:else if activeMainTab === 'REQUESTS'}
		<!-- Filter & Search Bar -->
		<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low w-full md:w-80 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
				<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari nomor permohonan, divisi, nama..."
					class="bg-transparent text-xs w-full outline-none text-on-surface placeholder:text-on-surface-variant/50"
				/>
				{#if searchQuery}
					<button onclick={() => (searchQuery = '')} class="text-on-surface-variant hover:text-on-surface">
						<span class="material-symbols-outlined text-xs">close</span>
					</button>
				{/if}
			</div>

			<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
				<div class="flex items-center gap-1.5 overflow-x-auto py-1">
					{#each ['All', 'SUBMITTED', 'APPROVED', 'DISTRIBUTED', 'REJECTED'] as st}
						<button
							onclick={() => (statusFilter = st)}
							class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer {statusFilter === st
								? 'bg-purple-600 text-white font-bold'
								: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
						>
							{st === 'All' ? 'Semua Status' : st}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Table Requests -->
		<div class="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden bg-surface-container-lowest shadow-2xs">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead>
						<tr class="bg-surface-container-low/50 border-b border-slate-200/60 dark:border-slate-800/60 text-on-surface-variant font-bold">
							<th class="py-3 px-4">No. Permintaan</th>
							<th class="py-3 px-4">Tanggal Pengajuan</th>
							<th class="py-3 px-4">Departemen / Pemohon</th>
							<th class="py-3 px-4 text-center">Jumlah Item</th>
							<th class="py-3 px-4 text-center">Status</th>
							<th class="py-3 px-4">Catatan Kebutuhan</th>
							<th class="py-3 px-4 text-center">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-800/40">
						{#if paginatedRequests.length === 0}
							<tr>
								<td colspan="7" class="text-center py-12 text-on-surface-variant">
									<span class="material-symbols-outlined text-4xl mb-2 text-on-surface-variant/40">assignment_late</span>
									<p class="font-medium">Tidak ada pengajuan ATK yang ditemukan</p>
								</td>
							</tr>
						{:else}
							{#each paginatedRequests as req}
								<tr class="hover:bg-surface-container-low/30 transition-colors">
									<td class="py-3 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
										{req.req_number}
									</td>
									<td class="py-3 px-4 text-on-surface">
										{formatDate(req.request_date)}
									</td>
									<td class="py-3 px-4">
										<div class="font-bold text-on-surface">{req.department}</div>
										<div class="text-[11px] text-on-surface-variant">{req.requester_name}</div>
									</td>
									<td class="py-3 px-4 text-center">
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface">
											{req.items?.length || req.total_items_count} item
										</span>
									</td>
									<td class="py-3 px-4 text-center">
										<span class="px-2.5 py-1 rounded-full text-[10px] font-bold {getReqStatusBadge(req.status)}">
											{req.status}
										</span>
									</td>
									<td class="py-3 px-4 text-on-surface-variant max-w-xs truncate">
										{req.notes || '-'}
									</td>
									<td class="py-3 px-4 text-center">
										<button
											onclick={() => openDetailRequestModal(req)}
											class="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
										>
											<span class="material-symbols-outlined text-[14px]">visibility</span>
											<span>Review</span>
										</button>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<div class="p-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-surface-container-low/20">
				<Pagination
					currentPage={reqCurrentPage}
					totalPages={totalReqPages}
					onPageChange={(p) => (reqCurrentPage = p)}
				/>
			</div>
		</div>

	<!-- TAB 3: Pengadaan ke PMS & Monitoring Anggaran COMS -->
	{:else if activeMainTab === 'PURCHASING'}
		<!-- Section 1: Monitoring Anggaran COMS (Target Spreadsheet vs Realisasi) -->
		<div class="space-y-4">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<div>
					<h3 class="font-bold text-base text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-purple-600">monitoring</span>
						<span>Target Anggaran vs Realisasi COMS ({data.budgetComs.year})</span>
					</h3>
					<p class="text-xs text-on-surface-variant">
						Plafon belanja resmi GA operasional per bulan & tahun berjalan sesuai parameter dokumen spreadsheet COMS.
					</p>
				</div>
				<div class="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 self-start sm:self-auto">
					Total Target Bulanan: {formatRupiah(data.budgetComs.totalMonthlyTarget)} / bln
				</div>
			</div>

			<!-- 5 Cards COMS Categories Grid -->
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
				{#each data.budgetComs.categories as cat}
					{@const monthPct = Math.round((cat.spentMonth / cat.monthlyTarget) * 100)}
					<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 shadow-2xs flex flex-col justify-between">
						<div>
							<div class="flex items-center justify-between mb-2">
								<span class="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
									{cat.key}
								</span>
								<span class="text-[10px] font-bold px-2 py-0.5 rounded-full {monthPct > 100 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}">
									{monthPct}%
								</span>
							</div>
							<h4 class="font-bold text-xs text-on-surface line-clamp-1">{cat.label}</h4>

							<div class="mt-3 space-y-1.5">
								<div class="flex justify-between text-[11px]">
									<span class="text-on-surface-variant">Target/bln:</span>
									<span class="font-bold text-on-surface">{formatRupiah(cat.monthlyTarget)}</span>
								</div>
								<div class="flex justify-between text-[11px]">
									<span class="text-on-surface-variant">Realisasi:</span>
									<span class="font-bold {monthPct > 100 ? 'text-rose-600' : 'text-purple-600 dark:text-purple-400'}">{formatRupiah(cat.spentMonth)}</span>
								</div>
							</div>

							<!-- Mini Progress Bar -->
							<div class="w-full bg-surface-container-high rounded-full h-1.5 mt-3 overflow-hidden">
								<div
									class="h-1.5 rounded-full {monthPct > 100 ? 'bg-rose-500' : 'bg-purple-600'}"
									style="width: {Math.min(100, monthPct)}%"
								></div>
							</div>
						</div>

						<div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center text-[10px] text-on-surface-variant">
							<span>Pagu Thn:</span>
							<span class="font-bold text-on-surface">{formatRupiah(cat.yearlyTarget)}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Section 2: Daftar Purchase Request GA ke PMS -->
		<div class="space-y-4 pt-2">
			<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
				<div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low w-full md:w-80 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
					<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Cari nomor PR, pemohon, catatan..."
						class="bg-transparent text-xs w-full outline-none text-on-surface placeholder:text-on-surface-variant/50"
					/>
					{#if searchQuery}
						<button onclick={() => (searchQuery = '')} class="text-on-surface-variant hover:text-on-surface">
							<span class="material-symbols-outlined text-xs">close</span>
						</button>
					{/if}
				</div>

				<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
					<div class="flex items-center gap-1.5 overflow-x-auto py-1">
						{#each ['All', 'PENDING', 'APPROVED', 'PROCESSED', 'DELIVERED', 'CANCELLED'] as st}
							<button
								onclick={() => (prStatusFilter = st)}
								class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer {prStatusFilter === st
									? 'bg-purple-600 text-white font-bold'
									: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
							>
								{st === 'All' ? 'Semua Status' : st}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Table GA PRs -->
			<div class="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden bg-surface-container-lowest shadow-2xs">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead>
							<tr class="bg-surface-container-low/50 border-b border-slate-200/60 dark:border-slate-800/60 text-on-surface-variant font-bold">
								<th class="py-3 px-4">No. PR PMS</th>
								<th class="py-3 px-4">Tanggal Diajukan</th>
								<th class="py-3 px-4">Tipe & Kebutuhan</th>
								<th class="py-3 px-4 text-center">Jumlah Barang</th>
								<th class="py-3 px-4 text-right">Estimasi Biaya</th>
								<th class="py-3 px-4 text-center">Status PMS</th>
								<th class="py-3 px-4 text-center">Aksi Gudang</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 dark:divide-slate-800/40">
							{#if paginatedGaPrs.length === 0}
								<tr>
									<td colspan="7" class="text-center py-12 text-on-surface-variant">
										<span class="material-symbols-outlined text-4xl mb-2 text-on-surface-variant/40">production_quantity_limits</span>
										<p class="font-bold text-sm text-on-surface">Belum ada Purchase Request GA yang diterbitkan ke PMS</p>
										<p class="text-xs text-on-surface-variant mt-1">Gunakan tombol "+ Ajukan PR ke PMS" untuk memesan barang low-stock ke sistem pengadaan.</p>
										<button
											onclick={openCreatePrModal}
											class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer"
										>
											<span class="material-symbols-outlined text-base">add_shopping_cart</span>
											<span>Buat PR Pengadaan Pertama</span>
										</button>
									</td>
								</tr>
							{:else}
								{#each paginatedGaPrs as pr}
									<tr class="hover:bg-surface-container-low/30 transition-colors">
										<td class="py-3 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
											{pr.prNumber}
										</td>
										<td class="py-3 px-4 text-on-surface">
											<div>{formatDate(pr.date)}</div>
											<div class="text-[10px] text-on-surface-variant">Oleh: {pr.requestedBy}</div>
										</td>
										<td class="py-3 px-4">
											<span class="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
												{pr.orderType}
											</span>
											<span class="text-[11px] text-on-surface ml-1.5">
												Batas: {formatDate(pr.requiredDate)}
											</span>
										</td>
										<td class="py-3 px-4 text-center">
											<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-container-high text-on-surface">
												{pr.item_count} item ({pr.total_qty} qty)
											</span>
										</td>
										<td class="py-3 px-4 text-right font-bold text-on-surface">
											{formatRupiah(pr.total_estimate)}
										</td>
										<td class="py-3 px-4 text-center">
											<span class="px-2.5 py-1 rounded-full text-[10px] font-bold {getPrStatusBadge(pr.status)}">
												{pr.status}
											</span>
										</td>
										<td class="py-3 px-4 text-center">
											<div class="flex items-center justify-center gap-1.5">
												<button
													onclick={() => openDetailPrModal(pr)}
													class="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-[11px] transition-colors cursor-pointer"
													title="Lihat rincian item PR"
												>
													<span class="material-symbols-outlined text-[14px]">visibility</span>
												</button>

												{#if pr.status !== 'DELIVERED' && pr.status !== 'DONE' && pr.status !== 'CANCELLED'}
													<button
														onclick={() => openReceivePrModal(pr)}
														class="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
														title="Konfirmasi barang fisik telah tiba & update stok GA"
													>
														<span class="material-symbols-outlined text-[13px]">inventory</span>
														<span>Terima Barang</span>
													</button>
												{:else if pr.status === 'DELIVERED' || pr.status === 'DONE'}
													<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold">
														<span class="material-symbols-outlined text-[13px]">check_circle</span>
														<span>Stok Masuk</span>
													</span>
												{/if}
											</div>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>

				<div class="p-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-surface-container-low/20">
					<Pagination
						currentPage={prCurrentPage}
						totalPages={totalPrPages}
						onPageChange={(p) => (prCurrentPage = p)}
					/>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- ========================================================================= -->
<!-- MODALS -->
<!-- ========================================================================= -->

<!-- Modal 1: Buat Purchase Request GA ke PMS -->
{#if isCreatePrModalOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-purple-600 text-2xl">shopping_cart_checkout</span>
					<div>
						<h3 class="font-bold text-base text-on-surface">Buat Purchase Request (PR) GA ke Modul PMS</h3>
						<p class="text-xs text-on-surface-variant">Pengadaan perlengkapan kantor & COMS terintegrasi langsung dengan Procurement Management System.</p>
					</div>
				</div>
				<button onclick={() => (isCreatePrModalOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/createGaPr"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							isCreatePrModalOpen = false;
							activeMainTab = 'PURCHASING';
						}
					};
				}}
				class="p-6 space-y-5"
			>
				<input type="hidden" name="items_json" value={JSON.stringify(prLines)} />

				<!-- Header Form Details -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label for="pr_req_by" class="block text-xs font-bold text-on-surface mb-1.5">Pemohon Pengadaan <span class="text-rose-500">*</span></label>
						<input
							id="pr_req_by"
							type="text"
							name="requested_by"
							bind:value={prRequestedBy}
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface transition-all"
						/>
					</div>

					<div>
						<label for="pr_order_type" class="block text-xs font-bold text-on-surface mb-1.5">Tipe Order PMS <span class="text-rose-500">*</span></label>
						<select
							id="pr_order_type"
							name="order_type"
							bind:value={prOrderType}
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface cursor-pointer transition-all"
						>
							<option value="RO">RO - Reguler Order (Rutin Operasional COMS)</option>
							<option value="BO">BO - By Order (Kebutuhan Khusus / Proyek)</option>
							<option value="ES">ES - Emergency Stock (Kebutuhan Sangat Mendesak)</option>
							<option value="IO">IO - Internal Order</option>
						</select>
					</div>

					<div>
						<label for="pr_req_date" class="block text-xs font-bold text-on-surface mb-1.5">Tanggal Kebutuhan (Tiba)</label>
						<input
							id="pr_req_date"
							type="date"
							name="required_date"
							bind:value={prRequiredDate}
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface transition-all"
						/>
					</div>
				</div>

				<div>
					<label for="pr_notes" class="block text-xs font-bold text-on-surface mb-1.5">Justifikasi / Catatan Pengadaan</label>
					<input
						id="pr_notes"
						type="text"
						name="notes"
						bind:value={prNotes}
						placeholder="Contoh: Pengadaan rutin bulanan ATK, toner & cetakan form OCS"
						class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface transition-all"
					/>
				</div>

				<!-- Items Builder Section -->
				<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
						<div>
							<h4 class="font-bold text-xs uppercase tracking-wider text-on-surface">Daftar Barang yang Diajukan ({prLines.length} item)</h4>
							<p class="text-[11px] text-on-surface-variant">Pilih dari katalog master atau gunakan tombol otomatis di sebelah kanan.</p>
						</div>

						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={loadAllLowStockToPr}
								class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
								title="Otomatis masukkan seluruh barang yang stoknya di bawah batas aman"
							>
								<span class="material-symbols-outlined text-[15px]">notification_important</span>
								<span>+ Muat Semua Low Stock ({data.stats.lowStockCount})</span>
							</button>

							<button
								type="button"
								onclick={addPrLine}
								class="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-purple-600 dark:text-purple-400 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
							>
								<span class="material-symbols-outlined text-[15px]">add</span>
								<span>+ Baris Manual</span>
							</button>
						</div>
					</div>

					<div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
						{#each prLines as line, idx}
							<div class="flex flex-col md:flex-row items-center gap-2 p-3 rounded-xl bg-surface-container-low/60 border border-slate-200/50 dark:border-slate-800/50">
								<div class="w-full md:w-5/12">
									<select
										value={line.item_id}
										onchange={(e) => handlePrItemSelect(idx, parseInt((e.target as HTMLSelectElement).value, 10))}
										class="w-full px-3 py-2 text-xs rounded-lg bg-surface-container-lowest border border-slate-200 dark:border-slate-800 text-on-surface font-medium outline-none cursor-pointer"
									>
										{#each data.allItems as it}
											<option value={it.id}>
												[{it.item_code}] {it.name} (Stok: {it.stock_quantity} {it.unit})
											</option>
										{/each}
									</select>
								</div>

								<div class="w-full md:w-2/12 flex items-center gap-1.5">
									<input
										type="number"
										min="1"
										bind:value={line.qty}
										required
										class="w-20 px-3 py-2 text-xs text-center rounded-lg bg-surface-container-lowest border border-slate-200 dark:border-slate-800 text-on-surface font-bold outline-none"
									/>
									<span class="text-xs text-on-surface-variant font-bold">{line.unit}</span>
								</div>

								<div class="w-full md:w-2/12 text-right">
									<div class="text-[10px] text-on-surface-variant">Est. Subtotal:</div>
									<div class="text-xs font-bold text-on-surface">{formatRupiah(line.qty * line.unit_price)}</div>
								</div>

								<div class="w-full md:w-2/12">
									<input
										type="text"
										bind:value={line.remarks}
										placeholder="Catatan item..."
										class="w-full px-3 py-2 text-xs rounded-lg bg-surface-container-lowest border border-slate-200 dark:border-slate-800 text-on-surface outline-none"
									/>
								</div>

								<div class="w-full md:w-1/12 flex justify-end">
									<button
										type="button"
										onclick={() => removePrLine(idx)}
										class="p-2 text-on-surface-variant hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
										title="Hapus baris"
									>
										<span class="material-symbols-outlined text-[17px]">delete</span>
									</button>
								</div>
							</div>
						{/each}
					</div>

					<!-- Bottom Total Summary -->
					<div class="p-4 mt-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/60 flex items-center justify-between">
						<div>
							<span class="text-xs text-on-surface-variant">Total Estimasi Pembelian PR:</span>
							<div class="text-lg font-black text-purple-700 dark:text-purple-300">
								{formatRupiah(prModalTotal)}
							</div>
						</div>
						<div class="text-xs text-on-surface-variant">
							Kategori Departemen: <strong class="text-on-surface">GENERAL AFFAIR & LEGAL (GA)</strong>
						</div>
					</div>
				</div>

				<div class="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-end gap-2.5">
					<button
						type="button"
						onclick={() => (isCreatePrModalOpen = false)}
						class="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
					>
						<span class="material-symbols-outlined text-base">send</span>
						<span>Terbitkan PR ke PMS</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal 2: Detail PR PMS -->
{#if isDetailPrModalOpen && selectedPr}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-purple-600 text-2xl">description</span>
					<div>
						<h3 class="font-bold text-base text-on-surface">Rincian Purchase Request: {selectedPr.prNumber}</h3>
						<p class="text-xs text-on-surface-variant">Dokumen pengadaan resmi di modul Procurement Management System.</p>
					</div>
				</div>
				<button onclick={() => (isDetailPrModalOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 space-y-5">
				<!-- Meta Info -->
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-surface-container-low/50">
					<div>
						<span class="text-[10px] uppercase font-bold text-on-surface-variant">Tanggal Diajukan</span>
						<div class="font-bold text-xs text-on-surface mt-0.5">{formatDate(selectedPr.date)}</div>
					</div>
					<div>
						<span class="text-[10px] uppercase font-bold text-on-surface-variant">Tipe Order</span>
						<div class="font-bold text-xs text-on-surface mt-0.5">{selectedPr.orderType} (Kebutuhan: {formatDate(selectedPr.requiredDate)})</div>
					</div>
					<div>
						<span class="text-[10px] uppercase font-bold text-on-surface-variant">Pemohon</span>
						<div class="font-bold text-xs text-on-surface mt-0.5">{selectedPr.requestedBy}</div>
					</div>
					<div>
						<span class="text-[10px] uppercase font-bold text-on-surface-variant">Status PMS</span>
						<div class="mt-0.5">
							<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold {getPrStatusBadge(selectedPr.status)}">
								{selectedPr.status}
							</span>
						</div>
					</div>
				</div>

				{#if selectedPr.notes}
					<div class="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface">
						<strong class="text-purple-600">Catatan Pengadaan:</strong> {selectedPr.notes}
					</div>
				{/if}

				<!-- Lines Table -->
				<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
					<table class="w-full text-left text-xs">
						<thead>
							<tr class="bg-surface-container-low text-on-surface-variant font-bold border-b border-slate-200 dark:border-slate-800">
								<th class="py-2.5 px-3">Kode PMS</th>
								<th class="py-2.5 px-3">Nama Material</th>
								<th class="py-2.5 px-3 text-center">Qty Request</th>
								<th class="py-2.5 px-3 text-right">Est. Harga Satuan</th>
								<th class="py-2.5 px-3 text-right">Total Est.</th>
								<th class="py-2.5 px-3">Keterangan</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 dark:divide-slate-800/40">
							{#each selectedPr.lines || [] as line}
								<tr>
									<td class="py-2.5 px-3 font-mono text-purple-600 font-bold">{line.materialCode || '-'}</td>
									<td class="py-2.5 px-3 font-bold text-on-surface">{line.itemName}</td>
									<td class="py-2.5 px-3 text-center font-bold">{line.qtyRequested} {line.unit}</td>
									<td class="py-2.5 px-3 text-right">{formatRupiah(line.unitPrice)}</td>
									<td class="py-2.5 px-3 text-right font-bold text-on-surface">{formatRupiah(line.lineTotal)}</td>
									<td class="py-2.5 px-3 text-on-surface-variant">{line.remarks || '-'}</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr class="bg-surface-container-low/70 font-bold">
								<td colspan="4" class="py-2.5 px-3 text-right text-on-surface">Total Estimasi PR:</td>
								<td class="py-2.5 px-3 text-right text-purple-700 dark:text-purple-300 text-sm">
									{formatRupiah(selectedPr.total_estimate)}
								</td>
								<td></td>
							</tr>
						</tfoot>
					</table>
				</div>

				<div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
					<div>
						{#if selectedPr.status !== 'DELIVERED' && selectedPr.status !== 'DONE' && selectedPr.status !== 'CANCELLED'}
							<button
								type="button"
								onclick={() => {
									isDetailPrModalOpen = false;
									openReceivePrModal(selectedPr);
								}}
								class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
							>
								<span class="material-symbols-outlined text-[16px]">inventory</span>
								<span>Terima Barang Fisik (1-Click Stock-In)</span>
							</button>
						{/if}
					</div>

					<button
						type="button"
						onclick={() => (isDetailPrModalOpen = false)}
						class="px-4 py-2 rounded-xl text-xs font-bold bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-colors cursor-pointer"
					>
						Tutup
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Modal 3: Konfirmasi Terima Barang Fisik (1-Click Stock-In) -->
{#if isReceivePrModalOpen && selectedPr}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600 text-2xl">check_circle</span>
					<div>
						<h3 class="font-bold text-base text-on-surface">Konfirmasi Penerimaan Barang Fisik</h3>
						<p class="text-xs text-on-surface-variant">1-Click Stock-In ke Gudang GA</p>
					</div>
				</div>
				<button onclick={() => (isReceivePrModalOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/receiveGaPr"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							isReceivePrModalOpen = false;
							activeMainTab = 'ITEMS';
						}
					};
				}}
				class="p-6 space-y-4"
			>
				<input type="hidden" name="pr_id" value={selectedPr.id} />

				<div class="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 text-xs text-on-surface space-y-2">
					<p>
						Barang fisik dari Purchase Request <strong class="font-mono text-purple-600">{selectedPr.prNumber}</strong> telah tiba dan diperiksa oleh tim GA di kantor.
					</p>
					<p class="text-on-surface-variant">
						Sistem akan secara otomatis:
					</p>
					<ul class="list-disc list-inside space-y-1 text-emerald-800 dark:text-emerald-300 font-medium">
						<li>Menambahkan stok fisik di master <code class="font-mono text-[11px]">ga.stationery_items</code></li>
						<li>Mencatat log riwayat masuk di kartu stok <code class="font-mono text-[11px]">ga.stationery_stock_in</code></li>
						<li>Memperbarui status PR PMS menjadi <strong class="font-bold">DELIVERED</strong></li>
					</ul>
				</div>

				<div>
					<label for="rcv_by" class="block text-xs font-bold text-on-surface mb-1.5">Nama Petugas Penerima Gudang <span class="text-rose-500">*</span></label>
					<input
						id="rcv_by"
						type="text"
						name="received_by"
						value="Petugas Gudang GA"
						required
						class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface transition-all"
					/>
				</div>

				<div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-end gap-2.5">
					<button
						type="button"
						onclick={() => (isReceivePrModalOpen = false)}
						class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
					>
						<span class="material-symbols-outlined text-base">inventory</span>
						<span>Konfirmasi & Tambah Stok Gudang</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal 4: Tambah Master Barang ATK -->
{#if isAddItemModalOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-purple-600">add_box</span>
					<h3 class="font-bold text-base text-on-surface">Tambah Master Barang Operasional Baru</h3>
				</div>
				<button onclick={() => (isAddItemModalOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
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
					<label for="item_name" class="block text-xs font-bold text-on-surface mb-1.5">Nama Barang <span class="text-rose-500">*</span></label>
					<input
						id="item_name"
						type="text"
						name="name"
						placeholder="Contoh: Kertas HVS A4 75gr PaperOne"
						required
						class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface transition-all"
					/>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="item_category" class="block text-xs font-bold text-on-surface mb-1.5">Kategori COMS <span class="text-rose-500">*</span></label>
						<select
							id="item_category"
							name="category"
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface cursor-pointer transition-all"
						>
							<option value="ATK">ATK (Alat Tulis Kantor)</option>
							<option value="FORM">FORM (Formulir Operasional)</option>
							<option value="TONNER">TONNER (Toner & Tinta Printer)</option>
							<option value="MATERAI">MATERAI (Materai Resmi)</option>
							<option value="SANITASI_COVID">SANITASI_COVID (Sanitasi & K3)</option>
						</select>
					</div>

					<div>
						<label for="item_unit" class="block text-xs font-bold text-on-surface mb-1.5">Satuan Ukuran <span class="text-rose-500">*</span></label>
						<input
							id="item_unit"
							type="text"
							name="unit"
							placeholder="PCS, RIM, BOX, BOTOL, BUKU"
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface transition-all"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label for="item_stock" class="block text-xs font-bold text-on-surface mb-1.5">Stok Awal Fisik</label>
						<input
							id="item_stock"
							type="number"
							name="stock_quantity"
							value="0"
							min="0"
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface transition-all"
						/>
					</div>

					<div>
						<label for="item_min_stock" class="block text-xs font-bold text-on-surface mb-1.5">Batas Minimum Aman</label>
						<input
							id="item_min_stock"
							type="number"
							name="minimum_stock"
							value="5"
							min="1"
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface transition-all"
						/>
					</div>

					<div>
						<label for="item_price" class="block text-xs font-bold text-on-surface mb-1.5">Estimasi Harga Satuan (Rp)</label>
						<input
							id="item_price"
							type="number"
							name="unit_price_estimate"
							value="0"
							min="0"
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface transition-all"
						/>
					</div>
				</div>

				<div class="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-end gap-2.5">
					<button
						type="button"
						onclick={() => (isAddItemModalOpen = false)}
						class="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
					>
						Simpan Master Barang
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal 5: Restock Manual Barang -->
{#if isRestockModalOpen && selectedItem}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-purple-600">add_circle</span>
					<h3 class="font-bold text-base text-on-surface">Penerimaan Stok Manual</h3>
				</div>
				<button onclick={() => (isRestockModalOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
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
				class="p-6 space-y-4"
			>
				<input type="hidden" name="id" value={selectedItem.id} />

				<div class="p-3.5 rounded-xl bg-surface-container-low text-xs">
					<div class="font-bold text-on-surface text-sm">{selectedItem.name}</div>
					<div class="flex items-center justify-between mt-1 text-on-surface-variant">
						<span>Kode: {selectedItem.item_code}</span>
						<span>Stok Sekarang: <strong class="text-on-surface">{selectedItem.stock_quantity} {selectedItem.unit}</strong></span>
					</div>
				</div>

				<div>
					<label for="added_qty" class="block text-xs font-bold text-on-surface mb-1.5">Jumlah Barang Masuk <span class="text-rose-500">*</span></label>
					<div class="flex items-center gap-2">
						<input
							id="added_qty"
							type="number"
							name="added_quantity"
							min="1"
							value="1"
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface font-bold transition-all"
						/>
						<span class="text-xs font-bold text-on-surface-variant px-3 py-2.5 bg-surface-container-high rounded-xl">
							{selectedItem.unit}
						</span>
					</div>
				</div>

				<div class="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-end gap-2.5">
					<button
						type="button"
						onclick={() => (isRestockModalOpen = false)}
						class="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
					>
						Tambah Stok
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal 6: Form Pengajuan Kebutuhan ATK Divisi Internal -->
{#if isCreateRequestModalOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-purple-600">post_add</span>
					<h3 class="font-bold text-base text-on-surface">Form Pengajuan Kebutuhan ATK Divisi</h3>
				</div>
				<button onclick={() => (isCreateRequestModalOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
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
						<label for="req_dept" class="block text-xs font-bold text-on-surface mb-1.5">Departemen / Divisi Pemohon <span class="text-rose-500">*</span></label>
						<select
							id="req_dept"
							name="department"
							bind:value={reqDepartment}
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface cursor-pointer transition-all"
						>
							<option value="Operations Control (OCS)">Operations Control (OCS)</option>
							<option value="QHSE & Safety">QHSE & Safety</option>
							<option value="Human Resources (HRIS)">Human Resources (HRIS)</option>
							<option value="Finance & Accounting">Finance & Accounting</option>
							<option value="Maintenance Workshop (FMS)">Maintenance Workshop (FMS)</option>
							<option value="General Affair (GA)">General Affair (GA)</option>
							<option value="Marketing & Commercial">Marketing & Commercial</option>
						</select>
					</div>

					<div>
						<label for="req_nama" class="block text-xs font-bold text-on-surface mb-1.5">Nama Pemohon <span class="text-rose-500">*</span></label>
						<input
							id="req_nama"
							type="text"
							name="requester_name"
							bind:value={reqName}
							placeholder="Nama staf pemohon"
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface transition-all"
						/>
					</div>
				</div>

				<div>
					<label for="req_catatan" class="block text-xs font-bold text-on-surface mb-1.5">Keperluan / Catatan</label>
					<input
						id="req_catatan"
						type="text"
						name="notes"
						bind:value={reqNotes}
						placeholder="Contoh: Kebutuhan operasional arsip dokumen & form cetak bulan ini"
						class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface transition-all"
					/>
				</div>

				<!-- Multi-item rows -->
				<div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
					<div class="flex items-center justify-between mb-3">
						<span class="text-xs font-bold text-on-surface uppercase tracking-wider">Item Barang yang Diajukan</span>
						<button
							type="button"
							onclick={addRequestLine}
							class="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-purple-600 dark:text-purple-400 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
						>
							<span class="material-symbols-outlined text-[15px]">add</span>
							<span>Tambah Item</span>
						</button>
					</div>

					<div class="space-y-3 max-h-60 overflow-y-auto pr-1">
						{#each reqLines as line, idx}
							<div class="flex flex-col sm:flex-row items-center gap-2 p-3 rounded-xl bg-surface-container-low/60 border border-slate-200/50 dark:border-slate-800/50">
								<div class="w-full sm:w-6/12">
									<select
										value={line.item_id}
										onchange={(e) => handleItemSelect(idx, parseInt((e.target as HTMLSelectElement).value, 10))}
										class="w-full px-3 py-2 text-xs rounded-lg bg-surface-container-lowest border border-slate-200 dark:border-slate-800 text-on-surface font-medium outline-none cursor-pointer"
									>
										{#each data.allItems as it}
											<option value={it.id}>
												{it.name} ({it.stock_quantity} {it.unit} tersedia)
											</option>
										{/each}
									</select>
								</div>

								<div class="w-full sm:w-2/12 flex items-center gap-1">
									<input
										type="number"
										min="1"
										bind:value={line.quantity}
										required
										class="w-16 px-2 py-2 text-xs text-center rounded-lg bg-surface-container-lowest border border-slate-200 dark:border-slate-800 text-on-surface font-bold outline-none"
									/>
									<span class="text-xs text-on-surface-variant font-medium">{line.unit}</span>
								</div>

								<div class="w-full sm:w-3/12">
									<input
										type="text"
										bind:value={line.notes}
										placeholder="Catatan item..."
										class="w-full px-3 py-2 text-xs rounded-lg bg-surface-container-lowest border border-slate-200 dark:border-slate-800 text-on-surface outline-none"
									/>
								</div>

								<div class="w-full sm:w-1/12 flex justify-end">
									{#if reqLines.length > 1}
										<button
											type="button"
											onclick={() => removeRequestLine(idx)}
											class="p-1.5 text-on-surface-variant hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
										>
											<span class="material-symbols-outlined text-[16px]">delete</span>
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-end gap-2.5">
					<button
						type="button"
						onclick={() => (isCreateRequestModalOpen = false)}
						class="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
					>
						Kirim Pengajuan ATK
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal 7: Detail & Approval Permintaan ATK Divisi -->
{#if isDetailRequestModalOpen && selectedRequest}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-purple-600">assignment</span>
					<div>
						<h3 class="font-bold text-base text-on-surface">Review Pengajuan ATK</h3>
						<p class="text-xs text-on-surface-variant">{selectedRequest.req_number}</p>
					</div>
				</div>
				<button onclick={() => (isDetailRequestModalOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 space-y-4">
				<div class="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface-container-low/60 text-xs">
					<div>
						<span class="text-[10px] uppercase font-bold text-on-surface-variant">Departemen</span>
						<div class="font-bold text-on-surface mt-0.5">{selectedRequest.department}</div>
					</div>
					<div>
						<span class="text-[10px] uppercase font-bold text-on-surface-variant">Nama Pemohon</span>
						<div class="font-bold text-on-surface mt-0.5">{selectedRequest.requester_name}</div>
					</div>
					<div>
						<span class="text-[10px] uppercase font-bold text-on-surface-variant">Tanggal</span>
						<div class="font-bold text-on-surface mt-0.5">{formatDate(selectedRequest.request_date)}</div>
					</div>
					<div>
						<span class="text-[10px] uppercase font-bold text-on-surface-variant">Status</span>
						<div class="mt-0.5">
							<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold {getReqStatusBadge(selectedRequest.status)}">
								{selectedRequest.status}
							</span>
						</div>
					</div>
				</div>

				{#if selectedRequest.notes}
					<div class="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface">
						<strong>Catatan:</strong> {selectedRequest.notes}
					</div>
				{/if}

				<div>
					<span class="text-xs font-bold text-on-surface uppercase tracking-wider block mb-2">Daftar Item Diminta:</span>
					<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
						<table class="w-full text-left text-xs">
							<thead>
								<tr class="bg-surface-container-low text-on-surface-variant font-bold border-b border-slate-200 dark:border-slate-800">
									<th class="py-2.5 px-3">Nama Barang</th>
									<th class="py-2.5 px-3 text-center">Qty Diminta</th>
									<th class="py-2.5 px-3">Catatan</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-100 dark:divide-slate-800/40">
								{#each selectedRequest.items as item}
									<tr>
										<td class="py-2.5 px-3 font-bold text-on-surface">{item.item_name}</td>
										<td class="py-2.5 px-3 text-center font-bold text-purple-600">{item.quantity_requested} {item.unit}</td>
										<td class="py-2.5 px-3 text-on-surface-variant">{item.notes || '-'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Actions for General Affair Team -->
				<div class="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
					<button
						type="button"
						onclick={() => (isDetailRequestModalOpen = false)}
						class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
					>
						Tutup
					</button>

					<div class="flex items-center gap-2">
						{#if selectedRequest.status === 'SUBMITTED'}
							<form
								method="POST"
								action="?/rejectRequest"
								use:enhance={() => {
									if (!confirm('Yakin ingin menolak pengajuan ATK ini?')) return ({ cancel }: any) => cancel();
									isDetailRequestModalOpen = false;
								}}
								class="inline"
							>
								<input type="hidden" name="id" value={selectedRequest.id} />
								<button
									type="submit"
									class="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 text-on-surface text-xs font-bold transition-colors cursor-pointer"
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
									class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
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
									class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
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
