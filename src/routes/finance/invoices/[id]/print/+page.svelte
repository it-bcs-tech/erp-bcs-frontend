<script lang="ts">
	import { onMount } from 'svelte';
	let { data } = $props();

	let kopMode = $state<'kop' | 'no-kop'>('kop');

	onMount(() => {
		// Read initial mode from URL search params (?kop=false -> no-kop)
		const searchParams = new URLSearchParams(window.location.search);
		if (searchParams.get('kop') === 'false') {
			kopMode = 'no-kop';
		} else {
			kopMode = 'kop';
		}

		// Automatically open browser print dialog
		const timer = setTimeout(() => {
			window.print();
		}, 500);

		return () => clearTimeout(timer);
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
		return parseFloat(Number(val).toFixed(3)).toString();
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
	<title>Invoice - {data.invoice.invoice_number}</title>
</svelte:head>

<!-- Shell container -->
<div class="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans text-slate-800">
	<!-- Top Sticky Action Bar (Hidden on Print) -->
	<header class="no-print bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl sticky top-0 z-50">
		<div class="flex items-center gap-3">
			<a 
				href="/finance/invoices" 
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
			>
				<span class="material-symbols-outlined text-[16px]">arrow_back</span>
				Daftar Invoice
			</a>
			<div class="h-4 w-[1px] bg-slate-700"></div>
			<div>
				<span class="text-xs text-slate-400 font-mono">Invoice</span>
				<h1 class="text-sm font-black tracking-tight text-white">{data.invoice.invoice_number}</h1>
			</div>
		</div>

		<!-- Segmented Control for Kop Mode -->
		<div class="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
			<button 
				type="button" 
				onclick={() => kopMode = 'kop'} 
				class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all {kopMode === 'kop' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}"
			>
				<span class="material-symbols-outlined text-[16px]">article</span>
				Dengan Kop Surat
			</button>
			<button 
				type="button" 
				onclick={() => kopMode = 'no-kop'} 
				class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all {kopMode === 'no-kop' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}"
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

				<!-- 2. INVOICE TITLE & METADATA -->
				<div class="flex justify-between items-start border-b border-slate-200 pb-4 mb-5">
					<div>
						<h1 class="text-2xl font-black uppercase tracking-wider text-slate-900">FAKTUR PENJUALAN</h1>
						<p class="text-xs font-bold text-slate-500 tracking-widest mt-0.5">COMMERCIAL INVOICE</p>
					</div>
					<div class="text-right space-y-0.5">
						<div class="text-sm font-black font-mono text-slate-900">
							No: <span class="text-blue-900 font-extrabold">{data.invoice.invoice_number}</span>
						</div>
						<div class="text-[11px] text-slate-700">
							Tanggal: <strong>{formatDate(data.invoice.date)}</strong>
						</div>
						<div class="text-[11px] text-slate-700">
							Jatuh Tempo: <strong class="text-rose-700">{formatDate(data.invoice.due_date)}</strong>
						</div>
					</div>
				</div>

				<!-- 3. CUSTOMER & ORDER REFERENCE INFO -->
				<div class="grid grid-cols-2 gap-6 mb-6">
					<!-- Customer / Ditagihkan Kepada -->
					<div class="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
						<h3 class="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 border-b border-slate-200 pb-1">
							Ditagihkan Kepada (Bill To)
						</h3>
						<p class="font-black text-sm text-slate-900">{data.invoice.customer_name || '-'}</p>
						{#if data.invoice.customer_code}
							<p class="text-[10px] text-slate-500 font-mono mb-1">Kode: {data.invoice.customer_code}</p>
						{/if}
						<p class="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed mt-1">
							{data.invoice.customer_address || 'Alamat tidak tersedia'}
						</p>
					</div>

					<!-- Referensi Dokumen -->
					<div class="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
						<h3 class="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 border-b border-slate-200 pb-1">
							Referensi Transaksi
						</h3>
						<div class="grid grid-cols-2 gap-y-1.5 gap-x-2 text-xs">
							<span class="text-slate-500">No. PO / SPK:</span>
							<span class="font-bold text-slate-900 text-right truncate" title={data.invoice.po_spk_number || data.invoice.reference}>
								{data.invoice.po_spk_number || data.invoice.reference || '-'}
							</span>

							<span class="text-slate-500">No. LHP / Pengiriman:</span>
							<span class="font-bold text-slate-900 text-right truncate" title={data.invoice.no_lhp}>
								{data.invoice.no_lhp || '-'}
							</span>

							<span class="text-slate-500">Periode Kegiatan:</span>
							<span class="font-bold text-slate-900 text-right">
								{data.invoice.activity_period || '-'}
							</span>

							<span class="text-slate-500">Tgl Kirim Invoice:</span>
							<span class="font-bold text-slate-900 text-right">
								{formatDate(data.invoice.delivery_date)}
							</span>

							<span class="text-slate-500">Term Pembayaran:</span>
							<span class="font-bold text-slate-900 text-right">
								{data.invoice.payment_term_days ? `${data.invoice.payment_term_days} Hari` : 'Cash'}
							</span>
						</div>
					</div>
				</div>

				<!-- 4. LINE ITEMS TABLE -->
				<table class="w-full border-collapse border border-slate-300 mb-4 text-xs">
					<thead>
						<tr class="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
							<th class="border border-slate-300 p-2 w-10 text-center">No</th>
							<th class="border border-slate-300 p-2 text-left">Deskripsi / Keterangan Layanan</th>
							<th class="border border-slate-300 p-2 text-right w-20">Qty</th>
							<th class="border border-slate-300 p-2 text-center w-16">Satuan</th>
							<th class="border border-slate-300 p-2 text-right w-28">Harga Satuan</th>
							<th class="border border-slate-300 p-2 text-right w-32">Total (Rp)</th>
						</tr>
					</thead>
					<tbody>
						{#each data.invoiceLines as line, i}
							<tr class="border-b border-slate-200">
								<td class="border border-slate-300 p-2 text-center font-mono">{i + 1}</td>
								<td class="border border-slate-300 p-2">
									<p class="font-bold text-slate-900">{line.description || '-'}</p>
									{#if line.project_name || line.dept_name}
										<p class="text-[10px] text-slate-500 mt-0.5">
											{[line.dept_name, line.project_name].filter(Boolean).join(' • ')}
										</p>
									{/if}
								</td>
								<td class="border border-slate-300 p-2 text-right font-mono font-bold">
									{formatQty(line.quantity)}
								</td>
								<td class="border border-slate-300 p-2 text-center uppercase font-semibold text-[11px]">
									{line.uom || '-'}
								</td>
								<td class="border border-slate-300 p-2 text-right font-mono">
									{formatCurrency(Number(line.unit_price))}
								</td>
								<td class="border border-slate-300 p-2 text-right font-mono font-bold text-slate-900">
									{formatCurrency(Number(line.total))}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>

				<!-- 5. FINANCIAL SUMMARY & TERBILANG -->
				<div class="grid grid-cols-12 gap-6 mt-4">
					<!-- Terbilang & Catatan -->
					<div class="col-span-7 flex flex-col justify-between">
						<div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
							<p class="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Terbilang:</p>
							<p class="text-xs font-bold italic text-slate-800 capitalize leading-relaxed">
								"{terbilang(Number(data.invoice.total_amount))} Rupiah"
							</p>
						</div>

						{#if data.invoice.notes}
							<div class="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
								<p class="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Catatan / Remarks:</p>
								<p class="text-[11px] text-slate-700 whitespace-pre-wrap">{data.invoice.notes}</p>
							</div>
						{/if}
					</div>

					<!-- Calculation Totals -->
					<div class="col-span-5 bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-1.5">
						<div class="flex justify-between text-xs text-slate-700">
							<span>Subtotal DPP:</span>
							<span class="font-mono font-bold">{formatCurrency(Number(data.invoice.subtotal))}</span>
						</div>
						<div class="flex justify-between text-xs text-slate-700">
							<span>Pajak (PPN):</span>
							<span class="font-mono font-bold">{formatCurrency(Number(data.invoice.tax_amount))}</span>
						</div>
						{#if Number(data.invoice.advance_payment) > 0}
							<div class="flex justify-between text-xs text-rose-700">
								<span>Uang Muka (DP):</span>
								<span class="font-mono font-bold">- {formatCurrency(Number(data.invoice.advance_payment))}</span>
							</div>
						{/if}
						<div class="border-t-2 border-slate-800 pt-2 mt-2 flex justify-between items-baseline">
							<span class="text-xs font-black uppercase tracking-wider text-slate-900">Total Tagihan:</span>
							<span class="text-base font-black font-mono text-blue-950">
								{formatCurrency(Number(data.invoice.total_amount))}
							</span>
						</div>
					</div>
				</div>

				<!-- 6. PAYMENT INSTRUCTION & SIGNATURES -->
				<div class="grid grid-cols-2 gap-8 mt-8 pt-4 border-t border-slate-200">
					<!-- Bank Account Details -->
					<div>
						<h4 class="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
							Instruksi Pembayaran Transfer
						</h4>
						<div class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-0.5">
							<p class="font-black text-slate-900 text-sm">{data.invoice.bank_name || 'Bank Mandiri'}</p>
							<p class="font-mono font-bold text-sm tracking-wider text-blue-900">
								{data.invoice.account_number || '-'}
							</p>
							<p class="text-slate-600">a.n <strong class="text-slate-900">{data.invoice.account_name || 'PT BUANA CENTRA SWAKARSA'}</strong></p>
						</div>
						<p class="text-[10px] text-slate-500 mt-1 italic">
							* Cantumkan nomor invoice <strong>{data.invoice.invoice_number}</strong> pada berita transfer.
						</p>
					</div>

					<!-- Authorized Signature Block -->
					<div class="text-center flex flex-col justify-between items-center">
						<div>
							<p class="text-xs font-bold text-slate-700">Hormat Kami,</p>
							<p class="text-[11px] text-slate-500">PT. Buana Centra Swakarsa</p>
						</div>
						
						<!-- Signature / Stamp Space -->
						<div class="h-16"></div>

						<div>
							<p class="font-bold text-xs text-slate-900 border-b border-slate-800 inline-block px-6 pb-0.5">
								( Finance & Accounting Dept )
							</p>
							<p class="text-[10px] text-slate-500 mt-0.5">Authorized Signature</p>
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
	/* Print-specific style isolation */
	@media print {
		@page {
			size: A4 portrait;
			margin: 10mm 15mm;
		}

		/* Hide layout shell elements */
		:global(aside),
		:global(nav),
		:global(header.app-header),
		:global(div[class*="sidebar"]),
		:global(div[class*="navigation"]),
		:global(footer.app-footer),
		.no-print {
			display: none !important;
		}

		/* Reset global containers */
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

		/* Print wrapper strictly resets to top-left */
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
