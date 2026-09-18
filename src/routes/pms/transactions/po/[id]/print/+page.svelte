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

		// Auto trigger print after brief delay if not embedded
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

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
	}

	function formatQty(val: any) {
		if (val === null || val === undefined || isNaN(Number(val))) return '0';
		return parseFloat(Number(val).toFixed(2)).toString();
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function terbilang(angka: number): string {
		const bilangan = [
			"", "Satu", "Dua", "Tiga", "Empat", "Lima", 
			"Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"
		];
		const num = Math.floor(Math.abs(angka));

		if (num < 12) {
			return bilangan[num];
		} else if (num < 20) {
			return terbilang(num - 10) + " Belas";
		} else if (num < 100) {
			return terbilang(Math.floor(num / 10)) + " Puluh " + terbilang(num % 10);
		} else if (num < 200) {
			return "Seratus " + terbilang(num - 100);
		} else if (num < 1000) {
			return terbilang(Math.floor(num / 100)) + " Ratus " + terbilang(num % 100);
		} else if (num < 2000) {
			return "Seribu " + terbilang(num - 1000);
		} else if (num < 1000000) {
			return terbilang(Math.floor(num / 1000)) + " Ribu " + terbilang(num % 1000);
		} else if (num < 1000000000) {
			return terbilang(Math.floor(num / 1000000)) + " Juta " + terbilang(num % 1000000);
		} else if (num < 1000000000000) {
			return terbilang(Math.floor(num / 1000000000)) + " Milyar " + terbilang(num % 1000000000);
		} else {
			return terbilang(Math.floor(num / 1000000000000)) + " Triliun " + terbilang(num % 1000000000000);
		}
	}
</script>

<svelte:head>
	<title>Purchase Order - {data.po.poNumber}</title>
</svelte:head>

<!-- Shell Container -->
<div class="min-h-screen font-sans text-slate-800 {isEmbedded ? 'bg-slate-950/70' : 'bg-slate-100 dark:bg-slate-950'}">
	<!-- Top Sticky Action Bar (Hidden on Print and when Embedded) -->
	{#if !isEmbedded}
		<header class="no-print bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl sticky top-0 z-50">
		<div class="flex items-center gap-3">
			<a 
				href="/pms/transactions/po/{data.po.id}" 
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
			>
				<span class="material-symbols-outlined text-[16px]">arrow_back</span>
				Kembali ke Detail PO
			</a>
			<div class="h-4 w-[1px] bg-slate-700"></div>
			<div>
				<span class="text-xs text-slate-400 font-mono">Purchase Order</span>
				<h1 class="text-sm font-black tracking-tight text-white">{data.po.poNumber}</h1>
			</div>
		</div>

		<!-- Segmented Control for Kop Mode -->
		<div class="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
			<button 
				type="button" 
				onclick={() => kopMode = 'kop'} 
				class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all {kopMode === 'kop' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}"
			>
				<span class="material-symbols-outlined text-[16px]">article</span>
				Dengan Kop Surat
			</button>
			<button 
				type="button" 
				onclick={() => kopMode = 'no-kop'} 
				class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all {kopMode === 'no-kop' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}"
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
				class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
			>
				<span class="material-symbols-outlined text-[16px]">print</span>
				Print Sekarang
			</button>
		</div>
	</header>
	{/if}

	<!-- Printable A4 Paper Container -->
	<div class="p-2 sm:p-6 flex justify-center">
		<main class="print-container bg-white text-black shadow-2xl rounded-sm p-6 sm:p-8 w-full max-w-[210mm] min-h-[297mm] flex flex-col justify-between text-xs leading-normal">
			
			<div>
				<!-- 1. KOP SURAT / PRE-PRINTED GAP -->
				{#if kopMode === 'kop'}
					<header class="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-3 gap-4">
						<div class="flex items-center gap-3">
							<img 
								src="https://bcs-logistics.co.id/assets/images/logoo.png" 
								alt="BCS Logistics Logo" 
								class="h-8 object-contain"
								onerror={(e) => (e.currentTarget as HTMLElement).style.display = 'none'}
							/>
							<div>
								<h2 class="text-lg font-black tracking-tight text-blue-950 uppercase leading-none">
									PT. BUANA CENTRA SWAKARSA
								</h2>
								<p class="text-[8px] font-bold text-slate-700 mt-0.5 uppercase tracking-widest">
									Integrated Logistics, Transportation & Warehousing Services
								</p>
							</div>
						</div>
						<div class="text-right text-[8px] text-slate-700 max-w-xs leading-tight">
							<p class="font-bold text-slate-900">Head Office : BCS Logistics Center</p>
							<p>Jl. Raya Merak KM. 115, Gerem, Grogol, Cilegon, Banten 42438</p>
							<p>Telp: +62 254 571234 / 570555 | Email: corporate@bcsgroup.co.id</p>
							<p class="font-semibold text-slate-900">NPWP: 01.234.567.8-412.000</p>
						</div>
					</header>
				{:else}
					<!-- Empty spacing calibrated for physical letterhead stationary -->
					<div class="h-[3.6cm] relative flex items-center justify-center border-b border-dashed border-slate-300 mb-3 group">
						<span class="no-print text-[10px] font-semibold text-slate-400 bg-slate-50 px-3 py-0.5 rounded-full border border-slate-200">
							✂ Ruang Kosong Terkalibrasi untuk Kertas Kop Surat Fisik
						</span>
					</div>
				{/if}

				<!-- 2. DOCUMENT TITLE & METADATA -->
				<div class="flex justify-between items-start border-b border-slate-200 pb-2 mb-3">
					<div>
						<h1 class="text-lg font-black uppercase tracking-wider text-slate-900 leading-tight">PURCHASE ORDER</h1>
						<p class="text-[10px] font-bold text-slate-500 tracking-widest mt-0.5">SURAT PESANAN PEMBELIAN</p>
					</div>
					<div class="text-right space-y-0.5">
						<div class="text-xs font-black font-mono text-slate-900">
							No: <span class="text-emerald-800 font-extrabold">{data.po.poNumber}</span>
						</div>
						<div class="text-[10px] text-slate-700">
							Tanggal PO: <strong>{formatDate(data.po.date)}</strong>
						</div>
						<div class="text-[10px] text-slate-700">
							Term Pembayaran: <strong class="text-amber-900 font-bold">{data.po.paymentTerm || '30 Hari'}</strong>
						</div>
						{#if data.po.dueDate}
							<div class="text-[10px] text-slate-700">
								Tenggat: <strong class="text-rose-700">{formatDate(data.po.dueDate)}</strong>
							</div>
						{/if}
						<div class="text-[10px] text-slate-600">
							Kategori: <strong class="uppercase text-slate-900">{data.po.category || 'SUPPORTING'}</strong>
						</div>
					</div>
				</div>

				<!-- 3. VENDOR & DELIVERY INFO -->
				<div class="grid grid-cols-2 gap-3 mb-3">
					<!-- Vendor / Supplier Box -->
					<div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
						<h3 class="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1 border-b border-slate-200 pb-0.5">
							Dipesan Kepada (Vendor / Supplier)
						</h3>
						<p class="font-black text-xs text-slate-900">{data.po.vendorName || '-'}</p>
						{#if data.po.vendorCode && data.po.vendorCode !== '-'}
							<p class="text-[9.5px] text-slate-500 font-mono">Kode: {data.po.vendorCode}</p>
						{/if}
						<p class="text-[10px] text-slate-700 whitespace-pre-wrap leading-tight mt-0.5">
							{data.po.vendorAddress || 'Alamat vendor tidak tersedia'}
						</p>
					</div>

					<!-- Delivery & Project Reference -->
					<div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
						<h3 class="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1 border-b border-slate-200 pb-0.5">
							Pengiriman & Referensi Proyek
						</h3>
						<div class="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px]">
							<span class="text-slate-500">Proyek / Alias:</span>
							<span class="font-bold text-slate-900 text-right truncate">
								{data.po.projectName || 'BCS General'}
								{#if data.po.projectAlias}
									<span class="font-mono text-[9px] text-amber-700">({data.po.projectAlias})</span>
								{/if}
							</span>

							<span class="text-slate-500">Site Penerima:</span>
							<span class="font-bold text-slate-900 text-right truncate">
								{data.po.siteName ? `${data.po.siteName}${data.po.sitePic ? ' - ' + data.po.sitePic : ''}` : 'Semua Site'}
							</span>

							<span class="text-slate-500">No. Referensi:</span>
							<span class="font-bold text-slate-900 text-right truncate">
								{data.po.refNo || '-'}
							</span>

							<span class="text-slate-500">Tgl. Estimasi Kirim:</span>
							<span class="font-bold text-slate-900 text-right">
								{formatDate(data.po.shipmentDate)}
							</span>

							<span class="text-slate-500">Lokasi Penerimaan:</span>
							<span class="font-bold text-slate-900 text-right truncate">
								{data.po.shipmentLocation || data.po.siteName || 'Gudang Pusat Cilegon'}
							</span>

							<span class="text-slate-500">Status PO:</span>
							<span class="font-bold uppercase text-slate-900 text-right">
								{data.po.status}
							</span>
						</div>
					</div>
				</div>

				<!-- 4. ITEM LIST TABLE (Compact layout for up to 10+ rows) -->
				<table class="w-full border-collapse border border-slate-300 mb-2.5 text-[10px]">
					<thead>
						<tr class="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
							<th class="border border-slate-300 py-1.5 px-2 w-8 text-center">No</th>
							<th class="border border-slate-300 py-1.5 px-2 text-left">Kode & Nama Material / Barang</th>
							<th class="border border-slate-300 py-1.5 px-2 text-left">Spesifikasi / Brand</th>
							<th class="border border-slate-300 py-1.5 px-2 text-right w-16">Qty</th>
							<th class="border border-slate-300 py-1.5 px-2 text-center w-14">Satuan</th>
							<th class="border border-slate-300 py-1.5 px-2 text-right w-24">Harga Satuan</th>
							<th class="border border-slate-300 py-1.5 px-2 text-right w-28">Total (Rp)</th>
						</tr>
					</thead>
					<tbody>
						{#each data.items as itm, i}
							<tr class="border-b border-slate-200">
								<td class="border border-slate-300 py-1 px-2 text-center font-mono">{i + 1}</td>
								<td class="border border-slate-300 py-1 px-2">
									<p class="font-bold text-slate-900 text-[10.5px] leading-tight">{itm.name}</p>
									<p class="text-[9px] text-slate-500 font-mono">{itm.materialCode}</p>
									{#if itm.prNumber}
										<p class="text-[8.5px] text-emerald-700 font-mono">Ref PR: {itm.prNumber}</p>
									{/if}
								</td>
								<td class="border border-slate-300 py-1 px-2 text-slate-700 leading-tight">
									<p>{itm.spec || '-'}</p>
									{#if itm.brand}
										<p class="text-[9px] text-slate-500 italic">Brand: {itm.brand}</p>
									{/if}
								</td>
								<td class="border border-slate-300 py-1 px-2 text-right font-mono font-bold">
									{formatQty(itm.qtyOrdered)}
								</td>
								<td class="border border-slate-300 py-1 px-2 text-center uppercase font-semibold text-[9.5px]">
									{itm.uom || 'PCS'}
								</td>
								<td class="border border-slate-300 py-1 px-2 text-right font-mono">
									{formatCurrency(Number(itm.unitPrice))}
								</td>
								<td class="border border-slate-300 py-1 px-2 text-right font-mono font-bold text-slate-900">
									{formatCurrency(Number(itm.total))}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>

				<!-- 5. FINANCIAL SUMMARY & TERBILANG -->
				<div class="grid grid-cols-12 gap-3 mt-2">
					<!-- Terbilang & Catatan -->
					<div class="col-span-7 flex flex-col justify-between">
						<div class="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px]">
							<p class="text-[8.5px] font-black uppercase tracking-wider text-slate-500 mb-0.5">Terbilang:</p>
							<p class="font-bold italic text-slate-800 capitalize leading-tight">
								"{terbilang(Number(data.po.totalAmount))} Rupiah"
							</p>
						</div>

						{#if data.po.notes}
							<div class="mt-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 text-[9.5px]">
								<p class="text-[8.5px] font-black uppercase tracking-wider text-slate-500 mb-0.5">Catatan / Terms & Conditions:</p>
								<p class="text-slate-700 whitespace-pre-wrap leading-tight">{data.po.notes}</p>
							</div>
						{/if}
					</div>

					<!-- Calculation Totals -->
					<div class="col-span-5 bg-slate-50 rounded-lg border border-slate-200 p-2 space-y-1 text-[10px]">
						<div class="flex justify-between text-slate-700">
							<span>Subtotal:</span>
							<span class="font-mono font-bold">{formatCurrency(Number(data.po.subtotal))}</span>
						</div>
						{#if Number(data.po.discountPercent) > 0}
							<div class="flex justify-between text-rose-700">
								<span>Diskon ({data.po.discountPercent}%):</span>
								<span class="font-mono font-bold">-</span>
							</div>
						{/if}
						<div class="flex justify-between text-slate-700">
							<span>PPN ({data.po.vatPercent || 11}%):</span>
							<span class="font-mono font-bold">{formatCurrency(Number(data.po.taxAmount))}</span>
						</div>
						<div class="border-t-2 border-slate-800 pt-1 mt-1 flex justify-between items-baseline">
							<span class="font-black uppercase tracking-wider text-slate-900 text-[10.5px]">Total Nilai PO:</span>
							<span class="text-sm font-black font-mono text-emerald-800">
								{formatCurrency(Number(data.po.totalAmount))}
							</span>
						</div>
					</div>
				</div>

				<!-- 6. 3-COLUMN AUTHORIZED SIGNATURES (Guaranteed on same page) -->
				<div class="signature-block break-inside-avoid grid grid-cols-3 gap-3 mt-3 pt-2 border-t border-slate-200 text-center">
					<!-- Kolom 1: Dibuat Oleh -->
					<div class="flex flex-col justify-between items-center h-20">
						<div>
							<p class="text-[10.5px] font-bold text-slate-700 leading-tight">Dibuat Oleh,</p>
							<p class="text-[9px] text-slate-500">Purchasing Staff</p>
						</div>
						<div>
							<p class="font-bold text-[10.5px] text-slate-900 border-b border-slate-800 inline-block px-3 pb-0.5">
								( {data.po.createdByName || data.po.createdBy || 'Purchasing Staff'} )
							</p>
							<p class="text-[8px] text-slate-500 mt-0.5">Tgl: {formatDate(data.po.date)}</p>
						</div>
					</div>

					<!-- Kolom 2: Disetujui Oleh -->
					<div class="flex flex-col justify-between items-center h-20">
						<div>
							<p class="text-[10.5px] font-bold text-slate-700 leading-tight">Disetujui Oleh,</p>
							<p class="text-[9px] text-slate-500">Procurement Manager / Direksi</p>
						</div>
						<div>
							<p class="font-bold text-[10.5px] text-slate-900 border-b border-slate-800 inline-block px-3 pb-0.5">
								( .................................................. )
							</p>
							<p class="text-[8px] text-slate-500 mt-0.5">Authorized Approval</p>
						</div>
					</div>

					<!-- Kolom 3: Dikonfirmasi Vendor -->
					<div class="flex flex-col justify-between items-center h-20">
						<div>
							<p class="text-[10.5px] font-bold text-slate-700 leading-tight">Dikonfirmasi Oleh,</p>
							<p class="text-[9px] text-slate-500">{data.po.vendorName || 'Vendor / Supplier'}</p>
						</div>
						<div>
							<p class="font-bold text-[10.5px] text-slate-900 border-b border-slate-800 inline-block px-3 pb-0.5">
								( .................................................. )
							</p>
							<p class="text-[8px] text-slate-500 mt-0.5">Ttd & Cap Perusahaan</p>
						</div>
					</div>
				</div>
			</div>

			<!-- 7. PRINT FOOTER TIMESTAMP -->
			<footer class="mt-3 pt-1 border-t border-slate-200 text-center text-[8px] text-slate-400">
				Dokumen Resmi PT. Buana Centra Swakarsa • Dicetak secara sistem pada {new Date().toLocaleString('id-ID')}
			</footer>

		</main>
	</div>
</div>

<style>
	@media print {
		@page {
			size: A4 portrait;
			margin: 0;
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

		:global(html),
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
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}

		.print-container {
			position: relative !important;
			width: 100% !important;
			max-width: 100% !important;
			min-height: 100vh !important;
			margin: 0 auto !important;
			padding: 10mm 15mm !important;
			box-sizing: border-box !important;
			box-shadow: none !important;
			border: none !important;
			border-radius: 0 !important;
		}

		.signature-block,
		.break-inside-avoid {
			break-inside: avoid !important;
			page-break-inside: avoid !important;
		}
	}
</style>
