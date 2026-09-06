<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatRupiah, formatNumber } from '$lib/utils/pms';

	let { data } = $props();

	let currentTab = $state(data.tab || 'po');
	let startDate = $state(data.startDate);
	let endDate = $state(data.endDate);
	let searchQuery = $state(data.search || '');

	function applyFilter() {
		goto(`/pms/reports/transactions?tab=${currentTab}&startDate=${startDate}&endDate=${endDate}&q=${encodeURIComponent(searchQuery)}`);
	}

	function switchTab(newTab: string) {
		currentTab = newTab;
		goto(`/pms/reports/transactions?tab=${newTab}&startDate=${startDate}&endDate=${endDate}&q=${encodeURIComponent(searchQuery)}`);
	}

	function exportActiveTabCSV() {
		let headers: string[] = [];
		let rows: any[][] = [];
		let filename = '';

		if (currentTab === 'po') {
			filename = `PMS_Detail_PO_${startDate}_sd_${endDate}.csv`;
			headers = [
				'No PO',
				'Tanggal PO',
				'Vendor',
				'Kode Vendor',
				'Project',
				'Lokasi/Site',
				'Status PO',
				'Kode Material',
				'Nama Material',
				'Qty Order',
				'Satuan',
				'Harga Satuan (Rp)',
				'Total (Rp)',
				'Qty Received'
			];
			rows = (data.poData || []).map((r: any) => [
				`"${r.po_number || ''}"`,
				`"${r.po_date || ''}"`,
				`"${r.vendor_name || ''}"`,
				`"${r.vendor_code || ''}"`,
				`"${r.project_name || ''}"`,
				`"${r.site_name || ''}"`,
				`"${r.po_status || ''}"`,
				`"${r.material_code || ''}"`,
				`"${(r.material_name || '').replace(/"/g, '""')}"`,
				r.qty_ordered || 0,
				`"${r.uom || ''}"`,
				r.unit_price || 0,
				r.line_total || 0,
				r.qty_received || 0
			]);
		} else if (currentTab === 'ss') {
			filename = `PMS_Rekap_SS_${startDate}_sd_${endDate}.csv`;
			headers = [
				'No SS',
				'Tanggal SS',
				'No WO',
				'No Unit',
				'No Rangka/Chassis',
				'Tipe Perbaikan',
				'Mekanik',
				'Helper',
				'Driver',
				'Problem/Keluhan',
				'Status',
				'Kode Part',
				'Nama Part',
				'Qty Out',
				'Satuan',
				'Harga Standar (Rp)',
				'Total Biaya (Rp)',
				'Catatan'
			];
			rows = (data.ssData || []).map((r: any) => [
				`"${r.ss_number || ''}"`,
				`"${r.ss_date || ''}"`,
				`"${r.wo_no || ''}"`,
				`"${r.nomor_unit || ''}"`,
				`"${r.chassis_no || ''}"`,
				`"${r.tipe || ''}"`,
				`"${r.mekanik_name || ''}"`,
				`"${r.helper_name || ''}"`,
				`"${r.driver_name || ''}"`,
				`"${(r.problem || '').replace(/"/g, '""')}"`,
				`"${r.status || ''}"`,
				`"${r.material_code || ''}"`,
				`"${(r.material_name || '').replace(/"/g, '""')}"`,
				r.qty || 0,
				`"${r.uom || ''}"`,
				r.unit_price || 0,
				r.item_total || 0,
				`"${(r.item_notes || '').replace(/"/g, '""')}"`
			]);
		} else if (currentTab === 'dn') {
			filename = `PMS_Rekap_DN_${startDate}_sd_${endDate}.csv`;
			headers = [
				'No DN',
				'Tanggal DN',
				'Site Asal',
				'Site Tujuan',
				'Kurir/Pengantar',
				'No Kendaraan',
				'Status',
				'Catatan DN',
				'Kode Material',
				'Nama Material',
				'Qty Dikirim',
				'Satuan',
				'Catatan Item'
			];
			rows = (data.dnData || []).map((r: any) => [
				`"${r.dn_number || ''}"`,
				`"${r.dn_date || ''}"`,
				`"${r.from_site_name || ''}"`,
				`"${r.to_site_name || ''}"`,
				`"${r.courier_name || ''}"`,
				`"${r.vehicle_no || ''}"`,
				`"${r.status || ''}"`,
				`"${(r.notes || '').replace(/"/g, '""')}"`,
				`"${r.material_code || ''}"`,
				`"${(r.material_name || '').replace(/"/g, '""')}"`,
				r.qty || 0,
				`"${r.uom || ''}"`,
				`"${(r.item_notes || '').replace(/"/g, '""')}"`
			]);
		}

		if (rows.length === 0) {
			alert('Tidak ada data yang dapat diekspor untuk filter saat ini.');
			return;
		}

		const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<svelte:head>
	<title>Laporan Transaksi Pembelian & Logistik | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">receipt_long</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Laporan Transaksi Pembelian & Logistik</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Detail line items Purchase Order, Rekapitulasi Supply Slip Suku Cadang, dan Surat Jalan (Delivery Note)
			</p>
		</div>

		<!-- Export Button -->
		<button
			type="button"
			onclick={exportActiveTabCSV}
			class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">download</span>
			<span>Ekspor Laporan Aktif (CSV)</span>
		</button>
	</header>

	<!-- Metric Summaries -->
	<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total PO Periode</span>
				<span class="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
					<span class="material-symbols-outlined text-base">shopping_cart</span>
				</span>
			</div>
			<p class="text-xl font-black text-on-surface mt-2">{formatNumber(data.metrics?.poCount || 0)} PO</p>
			<p class="text-[11px] text-on-surface-variant mt-0.5">Total: {formatRupiah(data.metrics?.poTotalSum || 0)}</p>
		</div>

		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Supply Slip (SS)</span>
				<span class="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
					<span class="material-symbols-outlined text-base">build</span>
				</span>
			</div>
			<p class="text-xl font-black text-on-surface mt-2">{formatNumber(data.metrics?.ssCount || 0)} Slip</p>
			<p class="text-[11px] text-on-surface-variant mt-0.5">Pengeluaran sparepart bengkel</p>
		</div>

		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Delivery Notes (DN)</span>
				<span class="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
					<span class="material-symbols-outlined text-base">local_shipping</span>
				</span>
			</div>
			<p class="text-xl font-black text-on-surface mt-2">{formatNumber(data.metrics?.dnCount || 0)} Surat Jalan</p>
			<p class="text-[11px] text-on-surface-variant mt-0.5">Mutasi transfer antar site</p>
		</div>

		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Item Baris Tampil</span>
				<span class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
					<span class="material-symbols-outlined text-base">fact_check</span>
				</span>
			</div>
			<p class="text-xl font-black text-on-surface mt-2">
				{#if currentTab === 'po'}
					{formatNumber(data.poData.length)} Baris PO
				{:else if currentTab === 'ss'}
					{formatNumber(data.ssData.length)} Baris SS
				{:else}
					{formatNumber(data.dnData.length)} Baris DN
				{/if}
			</p>
			<p class="text-[11px] text-on-surface-variant mt-0.5">Sesuai filter pencarian</p>
		</div>
	</div>

	<!-- Filter Controls Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
		<!-- Tabs Navigation -->
		<div class="flex items-center p-1 bg-surface-container-highest rounded-xl w-full md:w-auto">
			<button
				type="button"
				onclick={() => switchTab('po')}
				class="flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all {currentTab === 'po' ? 'bg-amber-600 text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
			>
				Detail PO (Breakdown Line)
			</button>
			<button
				type="button"
				onclick={() => switchTab('ss')}
				class="flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all {currentTab === 'ss' ? 'bg-amber-600 text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
			>
				Rekap Supply Slip (SS)
			</button>
			<button
				type="button"
				onclick={() => switchTab('dn')}
				class="flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all {currentTab === 'dn' ? 'bg-amber-600 text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
			>
				Rekap Delivery Note (DN)
			</button>
		</div>

		<!-- Date & Search Filters -->
		<form onsubmit={(e) => { e.preventDefault(); applyFilter(); }} class="flex flex-wrap items-center gap-3 w-full md:w-auto">
			<div class="flex items-center gap-1.5">
				<label class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Dari:</label>
				<input
					type="date"
					bind:value={startDate}
					class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-2.5 py-1.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
				/>
			</div>

			<div class="flex items-center gap-1.5">
				<label class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Sampai:</label>
				<input
					type="date"
					bind:value={endDate}
					class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-2.5 py-1.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
				/>
			</div>

			<div class="relative flex-1 md:w-48">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari nomor/nama..."
					class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-amber-500 outline-none font-medium"
				/>
				<span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
			</div>

			<button
				type="submit"
				class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-xs"
			>
				Terapkan
			</button>
		</form>
	</div>

	<!-- Tab Content Tables -->
	<div class="bg-surface-container-low rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden">
		<!-- TAB 1: DETAIL PO -->
		{#if currentTab === 'po'}
			<div class="overflow-x-auto">
				<table class="w-full text-left border-collapse text-xs">
					<thead>
						<tr class="border-b border-slate-200/60 dark:border-slate-800/60 bg-surface-container/50 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
							<th class="py-3 px-4">No & Tanggal PO</th>
							<th class="py-3 px-3">Vendor / Supplier</th>
							<th class="py-3 px-3">Project & Site</th>
							<th class="py-3 px-3">Kode & Nama Material</th>
							<th class="py-3 px-3 text-center">Qty Order</th>
							<th class="py-3 px-3 text-right">Harga Satuan (Rp)</th>
							<th class="py-3 px-3 text-right">Total (Rp)</th>
							<th class="py-3 px-3 text-center">Qty Masuk (WRS)</th>
							<th class="py-3 px-4 text-center">Status PO</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
						{#if data.poData.length === 0}
							<tr>
								<td colspan="9" class="py-12 text-center text-on-surface-variant">
									<span class="material-symbols-outlined text-4xl text-slate-400 mb-2">inbox</span>
									<p class="font-bold">Tidak ada rincian transaksi Purchase Order pada periode ini.</p>
									<p class="text-[11px] text-slate-400 mt-0.5">Ubah rentang tanggal atau kata kunci pencarian di atas.</p>
								</td>
							</tr>
						{:else}
							{#each data.poData as row}
								<tr class="hover:bg-surface-container-high/40 transition-colors">
									<td class="py-3 px-4">
										<a href="/pms/transactions/po" class="font-mono font-bold text-amber-700 dark:text-amber-400 hover:underline">
											{row.po_number}
										</a>
										<p class="text-[11px] text-on-surface-variant mt-0.5">{row.po_date}</p>
									</td>
									<td class="py-3 px-3">
										<span class="font-bold text-on-surface">{row.vendor_name}</span>
										<p class="text-[11px] text-on-surface-variant">{row.vendor_code}</p>
									</td>
									<td class="py-3 px-3">
										<span class="font-semibold text-on-surface">{row.project_name}</span>
										<p class="text-[11px] text-on-surface-variant">{row.site_name}</p>
									</td>
									<td class="py-3 px-3">
										<span class="font-mono font-bold text-amber-700 dark:text-amber-300">{row.material_code}</span>
										<p class="font-medium text-on-surface">{row.material_name}</p>
										{#if row.material_spec}
											<p class="text-[10px] text-slate-400">{row.material_spec}</p>
										{/if}
									</td>
									<td class="py-3 px-3 text-center font-bold">
										{formatNumber(row.qty_ordered)} <span class="text-[11px] font-normal text-on-surface-variant">{row.uom}</span>
									</td>
									<td class="py-3 px-3 text-right font-mono font-semibold">
										{formatRupiah(row.unit_price)}
									</td>
									<td class="py-3 px-3 text-right font-mono font-bold text-on-surface">
										{formatRupiah(row.line_total)}
									</td>
									<td class="py-3 px-3 text-center font-mono font-bold">
										<span class="{parseFloat(row.qty_received) >= parseFloat(row.qty_ordered) ? 'text-emerald-600' : 'text-amber-600'}">
											{formatNumber(row.qty_received)}
										</span>
										<span class="text-[11px] text-slate-400">/ {formatNumber(row.qty_ordered)}</span>
									</td>
									<td class="py-3 px-4 text-center">
										<span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
											{row.po_status === 'APPROVED' || row.po_status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
											row.po_status === 'PARTIAL_RECEIVED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' :
											row.po_status === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
											'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}">
											{row.po_status}
										</span>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

		<!-- TAB 2: REKAP SS (SUPPLY SLIP) -->
		{:else if currentTab === 'ss'}
			<div class="overflow-x-auto">
				<table class="w-full text-left border-collapse text-xs">
					<thead>
						<tr class="border-b border-slate-200/60 dark:border-slate-800/60 bg-surface-container/50 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
							<th class="py-3 px-4">No & Tanggal SS</th>
							<th class="py-3 px-3">No Unit & Rangka</th>
							<th class="py-3 px-3">Driver & Personel</th>
							<th class="py-3 px-3">Keluhan / Problem</th>
							<th class="py-3 px-3">Suku Cadang Dikeluarkan</th>
							<th class="py-3 px-3 text-center">Qty Out</th>
							<th class="py-3 px-3 text-right">Biaya Est (Rp)</th>
							<th class="py-3 px-4 text-center">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
						{#if data.ssData.length === 0}
							<tr>
								<td colspan="8" class="py-12 text-center text-on-surface-variant">
									<span class="material-symbols-outlined text-4xl text-slate-400 mb-2">build</span>
									<p class="font-bold">Tidak ada rekapitulasi Supply Slip pada periode ini.</p>
									<p class="text-[11px] text-slate-400 mt-0.5">Ubah rentang tanggal atau kata kunci pencarian di atas.</p>
								</td>
							</tr>
						{:else}
							{#each data.ssData as row}
								<tr class="hover:bg-surface-container-high/40 transition-colors">
									<td class="py-3 px-4">
										<a href="/pms/transactions/service-sheets" class="font-mono font-bold text-blue-700 dark:text-blue-400 hover:underline">
											{row.ss_number}
										</a>
										<p class="text-[11px] text-on-surface-variant mt-0.5">{row.ss_date}</p>
										{#if row.wo_no && row.wo_no !== '-'}
											<span class="inline-block font-mono text-[10px] text-slate-400">WO: {row.wo_no}</span>
										{/if}
									</td>
									<td class="py-3 px-3">
										<span class="inline-block px-2 py-0.5 bg-surface-container-highest font-mono font-bold rounded text-on-surface text-[11px]">
											{row.nomor_unit}
										</span>
										<p class="font-mono text-[10px] text-slate-400 mt-0.5">Chassis: {row.chassis_no}</p>
									</td>
									<td class="py-3 px-3">
										<p class="font-bold text-on-surface">Supir: {row.driver_name}</p>
										<p class="text-[11px] text-on-surface-variant">Mekanik: {row.mekanik_name}</p>
										{#if row.helper_name && row.helper_name !== '-'}
											<p class="text-[10px] text-slate-400">Helper: {row.helper_name}</p>
										{/if}
									</td>
									<td class="py-3 px-3 max-w-xs">
										<p class="line-clamp-2 text-on-surface-variant">{row.problem}</p>
										{#if row.tipe && row.tipe !== '-'}
											<span class="inline-block text-[10px] font-bold text-slate-400 uppercase">{row.tipe}</span>
										{/if}
									</td>
									<td class="py-3 px-3">
										{#if row.item_id}
											<span class="font-mono font-bold text-amber-700 dark:text-amber-300">{row.material_code}</span>
											<p class="font-bold text-on-surface">{row.material_name}</p>
										{:else}
											<span class="text-slate-400 italic">Tanpa sparepart material</span>
										{/if}
									</td>
									<td class="py-3 px-3 text-center font-bold font-mono">
										{#if row.item_id}
											{formatNumber(row.qty)} <span class="text-[11px] font-normal text-on-surface-variant">{row.uom}</span>
										{:else}
											-
										{/if}
									</td>
									<td class="py-3 px-3 text-right font-mono font-bold text-on-surface">
										{#if row.item_id}
											{formatRupiah(row.item_total)}
										{:else}
											-
										{/if}
									</td>
									<td class="py-3 px-4 text-center">
										<span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
											{row.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
											row.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' :
											'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}">
											{row.status}
										</span>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

		<!-- TAB 3: REKAP DN (DELIVERY NOTE) -->
		{:else if currentTab === 'dn'}
			<div class="overflow-x-auto">
				<table class="w-full text-left border-collapse text-xs">
					<thead>
						<tr class="border-b border-slate-200/60 dark:border-slate-800/60 bg-surface-container/50 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
							<th class="py-3 px-4">No & Tanggal DN</th>
							<th class="py-3 px-3">Site Asal &rarr; Tujuan</th>
							<th class="py-3 px-3">Kurir & Kendaraan</th>
							<th class="py-3 px-3">Barang Dikirim</th>
							<th class="py-3 px-3 text-center">Qty Dikirim</th>
							<th class="py-3 px-3">Catatan</th>
							<th class="py-3 px-4 text-center">Status Mutasi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
						{#if data.dnData.length === 0}
							<tr>
								<td colspan="7" class="py-12 text-center text-on-surface-variant">
									<span class="material-symbols-outlined text-4xl text-slate-400 mb-2">local_shipping</span>
									<p class="font-bold">Tidak ada rekapitulasi Delivery Note pada periode ini.</p>
									<p class="text-[11px] text-slate-400 mt-0.5">Ubah rentang tanggal atau kata kunci pencarian di atas.</p>
								</td>
							</tr>
						{:else}
							{#each data.dnData as row}
								<tr class="hover:bg-surface-container-high/40 transition-colors">
									<td class="py-3 px-4">
										<a href="/pms/delivery-notes" class="font-mono font-bold text-purple-700 dark:text-purple-400 hover:underline">
											{row.dn_number}
										</a>
										<p class="text-[11px] text-on-surface-variant mt-0.5">{row.dn_date}</p>
									</td>
									<td class="py-3 px-3">
										<span class="font-bold text-on-surface">{row.from_site_name}</span>
										<span class="text-slate-400 mx-1">&rarr;</span>
										<span class="font-bold text-on-surface">{row.to_site_name}</span>
									</td>
									<td class="py-3 px-3">
										<p class="font-bold text-on-surface">{row.courier_name}</p>
										<p class="font-mono text-[11px] text-on-surface-variant">{row.vehicle_no}</p>
									</td>
									<td class="py-3 px-3">
										{#if row.item_id}
											<span class="font-mono font-bold text-amber-700 dark:text-amber-300">{row.material_code}</span>
											<p class="font-bold text-on-surface">{row.material_name}</p>
										{:else}
											<span class="text-slate-400 italic">Tanpa rincian item</span>
										{/if}
									</td>
									<td class="py-3 px-3 text-center font-bold font-mono">
										{#if row.item_id}
											{formatNumber(row.qty)} <span class="text-[11px] font-normal text-on-surface-variant">{row.uom}</span>
										{:else}
											-
										{/if}
									</td>
									<td class="py-3 px-3 text-on-surface-variant">
										<p class="line-clamp-2">{row.notes}</p>
									</td>
									<td class="py-3 px-4 text-center">
										<span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
											{row.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
											row.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' :
											'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}">
											{row.status}
										</span>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
