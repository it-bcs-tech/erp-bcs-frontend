<script lang="ts">
	import { onMount } from 'svelte';
	let { data } = $props();

	let kopMode = $state<'kop' | 'no-kop'>('kop');
	let isEmbedded = $state(false);

	onMount(() => {
		const searchParams = new URLSearchParams(window.location.search);
		isEmbedded = searchParams.get('embedded') === 'true';
		if (searchParams.get('kop') === 'false') {
			kopMode = 'no-kop';
		} else {
			kopMode = 'kop';
		}

		// Auto trigger print only if not embedded
		const handleMessage = (e: MessageEvent) => {
			if (e.data?.type === 'SET_KOP_MODE' && (e.data.kopMode === 'kop' || e.data.kopMode === 'no-kop')) {
				kopMode = e.data.kopMode;
			}
		};
		window.addEventListener('message', handleMessage);

		if (!isEmbedded) {
			const timer = setTimeout(() => {
				window.print();
			}, 500);

			return () => {
				clearTimeout(timer);
				window.removeEventListener('message', handleMessage);
			};
		}

		return () => {
			window.removeEventListener('message', handleMessage);
		};
	});

	function printNow(mode?: 'kop' | 'no-kop') {
		if (mode) kopMode = mode;
		setTimeout(() => {
			window.print();
		}, 100);
	}

	function formatQty(val: any) {
		if (val === null || val === undefined || isNaN(Number(val))) return '0';
		return parseFloat(Number(val).toFixed(2)).toString();
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	let totalQtyReceived = $derived(
		(data.items || []).reduce((sum: number, itm: any) => sum + (parseFloat(itm.qtyReceived) || 0), 0)
	);

	let totalQtyOrdered = $derived(
		(data.items || []).reduce((sum: number, itm: any) => sum + (parseFloat(itm.qtyOrdered) || 0), 0)
	);
</script>

<svelte:head>
	<title>LPB / WRS - {data.wrs.grNumber}</title>
</svelte:head>

<!-- Shell Container -->
<div class="min-h-screen font-sans text-slate-800 {isEmbedded ? 'bg-slate-950/70' : 'bg-slate-100 dark:bg-slate-950'}">
	<!-- Top Sticky Action Bar (Hidden on Print and when Embedded) -->
	{#if !isEmbedded}
		<header class="no-print bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl sticky top-0 z-50">
		<div class="flex items-center gap-3">
			<a 
				href="/pms/transactions/wrs/{data.wrs.id}" 
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
			>
				<span class="material-symbols-outlined text-[16px]">arrow_back</span>
				Kembali ke Detail WRS
			</a>
			<div class="h-4 w-[1px] bg-slate-700"></div>
			<div>
				<span class="text-xs text-slate-400 font-mono">Warehouse Receipt</span>
				<h1 class="text-sm font-black tracking-tight text-white">{data.wrs.grNumber}</h1>
			</div>
		</div>

		<!-- Segmented Control for Kop Mode -->
		<div class="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
			<button 
				type="button" 
				onclick={() => kopMode = 'kop'} 
				class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all {kopMode === 'kop' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}"
			>
				<span class="material-symbols-outlined text-[16px]">article</span>
				Dengan Kop Surat
			</button>
			<button 
				type="button" 
				onclick={() => kopMode = 'no-kop'} 
				class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all {kopMode === 'no-kop' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}"
			>
				<span class="material-symbols-outlined text-[16px]">crop_portrait</span>
				Tanpa Kop (Kertas Fisik)
			</button>
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-2">
			<button 
				type="button" 
				onclick={() => printNow('kop')} 
				class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
				title="Print dengan Logo & Header Resmi"
			>
				<span class="material-symbols-outlined text-[16px]">print</span>
				Print (Kop)
			</button>
			<button 
				type="button" 
				onclick={() => printNow('no-kop')} 
				class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
				title="Print di atas Kertas Kop Surat Fisik"
			>
				<span class="material-symbols-outlined text-[16px]">print</span>
				Print (Tanpa Kop)
			</button>
			<button 
				type="button" 
				onclick={() => window.print()} 
				class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
			>
				<span class="material-symbols-outlined text-[16px]">print</span>
				Print Sekarang
			</button>
		</div>
	</header>
	{/if}

	<!-- Printable A4 Paper Container -->
	<div class="p-4 sm:p-8 flex justify-center">
		<main class="print-container bg-white text-black shadow-2xl rounded-sm p-8 sm:p-12 w-full max-w-[210mm] min-h-[297mm] flex flex-col justify-between text-xs leading-normal">
			
			<div>
				<!-- 1. KOP SURAT / PRE-PRINTED GAP -->
				{#if kopMode === 'kop'}
					<header class="flex justify-between items-end border-b-[3px] border-slate-900 pb-4 mb-6 gap-6">
						<div class="flex items-center gap-3.5">
							<img 
								src="https://bcs-logistics.co.id/assets/images/logoo.png" 
								alt="BCS Logistics Logo" 
								class="h-10 object-contain"
								onerror={(e) => (e.currentTarget as HTMLElement).style.display = 'none'}
							/>
							<div>
								<h2 class="text-xl font-black tracking-tight text-blue-950 uppercase leading-none">
									PT. BUANA CENTRA SWAKARSA
								</h2>
								<p class="text-[9px] font-bold text-slate-700 mt-1 uppercase tracking-widest">
									Integrated Logistics, Transportation & Warehousing Services
								</p>
							</div>
						</div>
						<div class="text-right text-[9px] text-slate-700 max-w-xs leading-tight">
							<p class="font-bold text-slate-900">Head Office : BCS Logistics Center</p>
							<p>Jl. Raya Merak KM. 115, Gerem, Grogol, Cilegon, Banten 42438</p>
							<p>Telp: +62 254 571234 / 570555 | Email: corporate@bcsgroup.co.id</p>
							<p class="font-semibold text-slate-900">NPWP: 01.234.567.8-412.000</p>
						</div>
					</header>
				{:else}
					<!-- Empty spacing (~4.0cm) calibrated for physical letterhead stationary -->
					<div class="h-[4.0cm] relative flex items-center justify-center border-b border-dashed border-slate-300 mb-6 group">
						<span class="no-print text-[11px] font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
							✂ Ruang Kosong Terkalibrasi (4.0 cm) untuk Kertas Kop Surat Fisik
						</span>
					</div>
				{/if}

				<!-- 2. DOCUMENT TITLE & METADATA -->
				<div class="flex justify-between items-start border-b border-slate-200 pb-4 mb-5">
					<div>
						<h1 class="text-2xl font-black uppercase tracking-wider text-slate-900">LAPORAN PENERIMAAN BARANG</h1>
						<p class="text-xs font-bold text-slate-500 tracking-widest mt-0.5">GOODS RECEIPT SHEET / LPB (WRS)</p>
					</div>
					<div class="text-right space-y-0.5">
						<div class="text-sm font-black font-mono text-slate-900">
							No. LPB: <span class="text-blue-900 font-extrabold">{data.wrs.grNumber}</span>
						</div>
						<div class="text-[11px] text-slate-700">
							Tanggal Terima: <strong>{formatDate(data.wrs.date)}</strong>
						</div>
						{#if data.wrs.poNumber}
							<div class="text-[11px] text-slate-700 font-mono">
								No. PO Terkait: <strong class="text-emerald-800">{data.wrs.poNumber}</strong>
							</div>
						{/if}
						{#if data.wrs.vendorDeliveryNumber}
							<div class="text-[11px] text-slate-700 font-mono">
								Surat Jalan Vendor: <strong>{data.wrs.vendorDeliveryNumber}</strong>
							</div>
						{/if}
					</div>
				</div>

				<!-- 3. SUPPLIER & WAREHOUSE LOCATION INFO -->
				<div class="grid grid-cols-2 gap-6 mb-6">
					<!-- Supplier Box -->
					<div class="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
						<h3 class="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 border-b border-slate-200 pb-1">
							Pemasok / Vendor (Supplier)
						</h3>
						<p class="font-black text-sm text-slate-900">{data.wrs.supplierName || '-'}</p>
						{#if data.wrs.vendorCode && data.wrs.vendorCode !== '-'}
							<p class="text-[10px] text-slate-500 font-mono mb-1">Kode Vendor: {data.wrs.vendorCode}</p>
						{/if}
						<p class="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed mt-1">
							{data.wrs.vendorAddress || 'Alamat vendor tidak tersedia'}
						</p>
					</div>

					<!-- Warehouse Receiving Location -->
					<div class="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
						<h3 class="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 border-b border-slate-200 pb-1">
							Lokasi Gudang & Petugas Penerima
						</h3>
						<div class="grid grid-cols-2 gap-y-1.5 gap-x-2 text-xs">
							<span class="text-slate-500">Gudang Penerima:</span>
							<span class="font-bold text-slate-900 text-right truncate">
								{data.wrs.siteName || 'Gudang Utama Cilegon'}
							</span>

							<span class="text-slate-500">Petugas Gudang:</span>
							<span class="font-bold text-slate-900 text-right truncate">
								{data.wrs.receivedByName || data.wrs.receivedBy || 'Petugas Gudang'}
							</span>

							<span class="text-slate-500">Status Dokumen:</span>
							<span class="font-bold uppercase text-slate-900 text-right">
								{data.wrs.status || 'RECEIVED'}
							</span>

							<span class="text-slate-500">Waktu Rekam Sistem:</span>
							<span class="font-bold font-mono text-[11px] text-slate-700 text-right">
								{data.wrs.createdAt || '-'}
							</span>
						</div>
					</div>
				</div>

				<!-- 4. ITEM LIST TABLE -->
				<table class="w-full border-collapse border border-slate-300 mb-4 text-xs">
					<thead>
						<tr class="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
							<th class="border border-slate-300 p-2 w-10 text-center">No</th>
							<th class="border border-slate-300 p-2 text-left">Kode & Nama Material / Barang</th>
							<th class="border border-slate-300 p-2 text-left">Spesifikasi / Brand</th>
							<th class="border border-slate-300 p-2 text-right w-20">Qty PO</th>
							<th class="border border-slate-300 p-2 text-right w-24">Qty Diterima</th>
							<th class="border border-slate-300 p-2 text-right w-20">Selisih</th>
							<th class="border border-slate-300 p-2 text-center w-16">Satuan</th>
							<th class="border border-slate-300 p-2 text-center w-24">Kondisi Fisik</th>
						</tr>
					</thead>
					<tbody>
						{#each data.items as itm, i}
							{@const ordered = parseFloat(itm.qtyOrdered) || 0}
							{@const received = parseFloat(itm.qtyReceived) || 0}
							{@const diff = ordered - received}
							<tr class="border-b border-slate-200">
								<td class="border border-slate-300 p-2 text-center font-mono">{i + 1}</td>
								<td class="border border-slate-300 p-2">
									<p class="font-bold text-slate-900">{itm.name}</p>
									<p class="text-[10px] text-slate-500 font-mono mt-0.5">{itm.materialCode}</p>
								</td>
								<td class="border border-slate-300 p-2 text-slate-700">
									<p>{itm.spec || '-'}</p>
									{#if itm.brand}
										<p class="text-[10px] text-slate-500 italic mt-0.5">Brand: {itm.brand}</p>
									{/if}
								</td>
								<td class="border border-slate-300 p-2 text-right font-mono text-slate-600">
									{ordered > 0 ? formatQty(ordered) : '-'}
								</td>
								<td class="border border-slate-300 p-2 text-right font-mono font-bold text-blue-950">
									{formatQty(received)}
								</td>
								<td class="border border-slate-300 p-2 text-right font-mono {diff > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'}">
									{ordered > 0 ? (diff === 0 ? '0' : (diff > 0 ? `-${formatQty(diff)}` : `+${formatQty(Math.abs(diff))}`)) : '-'}
								</td>
								<td class="border border-slate-300 p-2 text-center uppercase font-semibold text-[11px]">
									{itm.uom || 'PCS'}
								</td>
								<td class="border border-slate-300 p-2 text-center">
									<span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
										BAIK
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr class="bg-slate-50 font-bold border-t border-slate-300">
							<td colspan="3" class="p-2 text-right text-slate-700">Total Kuantitas:</td>
							<td class="p-2 text-right font-mono text-slate-700">{formatQty(totalQtyOrdered)}</td>
							<td class="p-2 text-right font-mono text-blue-900 font-black">{formatQty(totalQtyReceived)}</td>
							<td colspan="3" class="p-2"></td>
						</tr>
					</tfoot>
				</table>

				<!-- 5. NOTES / REMARKS -->
				{#if data.wrs.notes}
					<div class="p-3 bg-slate-50 rounded-lg border border-slate-200 mt-4 mb-6">
						<p class="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
							Catatan Pemeriksaan & Berita Acara Penerimaan:
						</p>
						<p class="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{data.wrs.notes}</p>
					</div>
				{/if}

				<!-- 6. 3-COLUMN AUTHORIZED SIGNATURES -->
				<div class="grid grid-cols-3 gap-6 mt-8 pt-4 border-t border-slate-200 text-center">
					<!-- Kolom 1: Diterima Oleh (Gudang) -->
					<div class="flex flex-col justify-between items-center h-32">
						<div>
							<p class="text-xs font-bold text-slate-700">Diterima Oleh,</p>
							<p class="text-[10px] text-slate-500">Petugas Gudang (Warehouse)</p>
						</div>
						<div>
							<p class="font-bold text-xs text-slate-900 border-b border-slate-800 inline-block px-4 pb-0.5">
								( {data.wrs.receivedByName || data.wrs.receivedBy || 'Petugas Gudang'} )
							</p>
							<p class="text-[9px] text-slate-500 mt-0.5">Tgl: {formatDate(data.wrs.date)}</p>
						</div>
					</div>

					<!-- Kolom 2: Diperiksa Oleh (QC / Supervisor) -->
					<div class="flex flex-col justify-between items-center h-32">
						<div>
							<p class="text-xs font-bold text-slate-700">Diperiksa Oleh,</p>
							<p class="text-[10px] text-slate-500">QC / Supervisor Gudang</p>
						</div>
						<div>
							<p class="font-bold text-xs text-slate-900 border-b border-slate-800 inline-block px-4 pb-0.5">
								( .................................................. )
							</p>
							<p class="text-[9px] text-slate-500 mt-0.5">Tanda Tangan & Tanggal</p>
						</div>
					</div>

					<!-- Kolom 3: Mengetahui (Purchasing / Logistics) -->
					<div class="flex flex-col justify-between items-center h-32">
						<div>
							<p class="text-xs font-bold text-slate-700">Mengetahui,</p>
							<p class="text-[10px] text-slate-500">Purchasing / Logistics Dept</p>
						</div>
						<div>
							<p class="font-bold text-xs text-slate-900 border-b border-slate-800 inline-block px-4 pb-0.5">
								( .................................................. )
							</p>
							<p class="text-[9px] text-slate-500 mt-0.5">Authorized Signature</p>
						</div>
					</div>
				</div>
			</div>

			<!-- 7. PRINT FOOTER TIMESTAMP -->
			<footer class="mt-8 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400">
				Dokumen Resmi PT. Buana Centra Swakarsa • Dicetak secara sistem pada {new Date().toLocaleString('id-ID')}
			</footer>

		</main>
	</div>
</div>

<style>
	@media print {
		@page {
			size: A4 portrait;
			margin: 10mm 15mm;
		}

		:global(aside),
		:global(nav),
		:global(header.app-header),
		:global(div[class*="sidebar"]),
		:global(div[class*="navigation"]),
		:global(footer.app-footer),
		.no-print {
			display: none !important;
		}

		:global(body),
		:global(main),
		:global(#app),
		:global(.app) {
			background: white !important;
			color: black !important;
			margin: 0 !important;
			padding: 0 !important;
			width: 100% !important;
			max-width: none !important;
			box-shadow: none !important;
		}

		.print-container {
			position: absolute !important;
			top: 0 !important;
			left: 0 !important;
			right: 0 !important;
			width: 100% !important;
			max-width: 100% !important;
			min-height: 100% !important;
			padding: 0 !important;
			margin: 0 !important;
			box-shadow: none !important;
			border-radius: 0 !important;
		}
	}
</style>
