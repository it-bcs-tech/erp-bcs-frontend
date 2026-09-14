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

	let totalQty = $derived(
		(data.items || []).reduce((sum: number, itm: any) => sum + (parseFloat(itm.qtyRequested) || 0), 0)
	);
</script>

<svelte:head>
	<title>Purchase Requisition - {data.pr.prNumber}</title>
</svelte:head>

<!-- Shell Container -->
<div class="min-h-screen font-sans text-slate-800 {isEmbedded ? 'bg-slate-950/70' : 'bg-slate-100 dark:bg-slate-950'}">
	<!-- Top Sticky Action Bar (Hidden on Print and when Embedded) -->
	{#if !isEmbedded}
		<header class="no-print bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl sticky top-0 z-50">
		<div class="flex items-center gap-3">
			<a 
				href="/pms/transactions/pr/{data.pr.id}" 
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
			>
				<span class="material-symbols-outlined text-[16px]">arrow_back</span>
				Kembali ke Detail PR
			</a>
			<div class="h-4 w-[1px] bg-slate-700"></div>
			<div>
				<span class="text-xs text-slate-400 font-mono">Purchase Requisition</span>
				<h1 class="text-sm font-black tracking-tight text-white">{data.pr.prNumber}</h1>
			</div>
		</div>

		<!-- Segmented Control for Kop Mode -->
		<div class="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
			<button 
				type="button" 
				onclick={() => kopMode = 'kop'} 
				class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all {kopMode === 'kop' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}"
			>
				<span class="material-symbols-outlined text-[16px]">article</span>
				Dengan Kop Surat
			</button>
			<button 
				type="button" 
				onclick={() => kopMode = 'no-kop'} 
				class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all {kopMode === 'no-kop' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}"
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
				class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
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
						<h1 class="text-lg font-black uppercase tracking-wider text-slate-900 leading-tight">PURCHASE REQUISITION</h1>
						<p class="text-[10px] font-bold text-slate-500 tracking-widest mt-0.5">FORM PERMINTAAN PEMBELIAN BARANG</p>
					</div>
					<div class="text-right space-y-0.5">
						<div class="text-xs font-black font-mono text-slate-900">
							No: <span class="text-amber-800 font-extrabold">{data.pr.prNumber}</span>
						</div>
						<div class="text-[10px] text-slate-700">
							Tanggal PR: <strong>{formatDate(data.pr.date)}</strong>
						</div>
						<div class="text-[10px] text-slate-700">
							Dibutuhkan Pada: <strong class="text-blue-800">{formatDate(data.pr.requiredDate)}</strong>
						</div>
						<div class="text-[10px] text-slate-600">
							Kategori: <strong class="uppercase text-slate-900">{data.pr.category || 'SUPPORTING'}</strong>
						</div>
					</div>
				</div>

				<!-- 3. REQUESTOR & SITE DESTINATION INFO -->
				<div class="grid grid-cols-2 gap-3 mb-3">
					<!-- Requestor Box -->
					<div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
						<h3 class="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1 border-b border-slate-200 pb-0.5">
							Informasi Pemohon (Requested By)
						</h3>
						<p class="font-black text-xs text-slate-900">{data.pr.requestedBy || data.pr.createdByName || '-'}</p>
						<p class="text-[10.5px] text-slate-700 mt-0.5">
							Departemen: <strong class="text-slate-900">{data.pr.department || 'General'}</strong>
						</p>
						{#if data.pr.createdByPayroll}
							<p class="text-[9.5px] text-slate-500 font-mono">ID Karyawan: {data.pr.createdByPayroll}</p>
						{/if}
						<p class="text-[9px] text-slate-500 mt-0.5">
							Diajukan via sistem pada {data.pr.createdAt || '-'}
						</p>
					</div>

					<!-- Project & Location Destination -->
					<div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
						<h3 class="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1 border-b border-slate-200 pb-0.5">
							Alokasi Kebutuhan & Proyek
						</h3>
						<div class="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px]">
							<span class="text-slate-500">Proyek:</span>
							<span class="font-bold text-slate-900 text-right truncate">
								{data.pr.projectName || 'General Operations'}
							</span>

							<span class="text-slate-500">Site / Lokasi:</span>
							<span class="font-bold text-slate-900 text-right truncate">
								{data.pr.siteName || 'Pool Cilegon'}
							</span>

							<span class="text-slate-500">Status PR:</span>
							<span class="font-bold uppercase text-slate-900 text-right">
								{data.pr.status}
							</span>

							<span class="text-slate-500">Total Item:</span>
							<span class="font-bold font-mono text-slate-900 text-right">
								{data.items.length} Macam Barang
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
							<th class="border border-slate-300 py-1.5 px-2 text-right w-16">Stok</th>
							<th class="border border-slate-300 py-1.5 px-2 text-right w-20">Qty Diminta</th>
							<th class="border border-slate-300 py-1.5 px-2 text-center w-14">Satuan</th>
							<th class="border border-slate-300 py-1.5 px-2 text-left w-32">Keterangan / Keperluan</th>
						</tr>
					</thead>
					<tbody>
						{#each data.items as itm, i}
							<tr class="border-b border-slate-200">
								<td class="border border-slate-300 py-1 px-2 text-center font-mono">{i + 1}</td>
								<td class="border border-slate-300 py-1 px-2">
									<p class="font-bold text-slate-900 text-[10.5px] leading-tight">{itm.name}</p>
									<p class="text-[9px] text-slate-500 font-mono">{itm.materialCode}</p>
								</td>
								<td class="border border-slate-300 py-1 px-2 text-slate-700 leading-tight">
									<p>{itm.spec || '-'}</p>
									{#if itm.brand}
										<p class="text-[9px] text-slate-500 italic">Brand: {itm.brand}</p>
									{/if}
								</td>
								<td class="border border-slate-300 py-1 px-2 text-right font-mono text-slate-600">
									{formatQty(itm.stock)}
								</td>
								<td class="border border-slate-300 py-1 px-2 text-right font-mono font-bold text-slate-900">
									{formatQty(itm.qtyRequested)}
								</td>
								<td class="border border-slate-300 py-1 px-2 text-center uppercase font-semibold text-[9.5px]">
									{itm.uom || 'PCS'}
								</td>
								<td class="border border-slate-300 py-1 px-2 text-slate-700 text-[9.5px]">
									{itm.remarks || '-'}
								</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr class="bg-slate-50 font-bold border-t border-slate-300 text-[10px]">
							<td colspan="4" class="py-1 px-2 text-right text-slate-700">Total Kuantitas Diminta:</td>
							<td class="py-1 px-2 text-right font-mono text-amber-800 font-black">{formatQty(totalQty)}</td>
							<td colspan="2" class="py-1 px-2"></td>
						</tr>
					</tfoot>
				</table>

				<!-- 5. JUSTIFICATION & NOTES -->
				{#if data.pr.notes}
					<div class="p-2 bg-slate-50 rounded-lg border border-slate-200 mt-2 mb-2 text-[10px]">
						<p class="text-[8.5px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
							Alasan Kebutuhan / Justifikasi Pengajuan:
						</p>
						<p class="text-slate-700 whitespace-pre-wrap leading-tight">{data.pr.notes}</p>
					</div>
				{/if}

				<!-- 6. 3-COLUMN AUTHORIZED SIGNATURES (Guaranteed on same page) -->
				<div class="signature-block break-inside-avoid grid grid-cols-3 gap-3 mt-3 pt-2 border-t border-slate-200 text-center">
					<!-- Kolom 1: Pemohon -->
					<div class="flex flex-col justify-between items-center h-20">
						<div>
							<p class="text-[10.5px] font-bold text-slate-700 leading-tight">Diajukan Oleh,</p>
							<p class="text-[9px] text-slate-500">Pemohon (User / Dept)</p>
						</div>
						<div>
							<p class="font-bold text-[10.5px] text-slate-900 border-b border-slate-800 inline-block px-3 pb-0.5">
								( {data.pr.requestedBy || data.pr.createdByName || 'Pemohon'} )
							</p>
							<p class="text-[8px] text-slate-500 mt-0.5">Tgl: {formatDate(data.pr.date)}</p>
						</div>
					</div>

					<!-- Kolom 2: Diperiksa -->
					<div class="flex flex-col justify-between items-center h-20">
						<div>
							<p class="text-[10.5px] font-bold text-slate-700 leading-tight">Diperiksa Oleh,</p>
							<p class="text-[9px] text-slate-500">Head of Dept / Site Manager</p>
						</div>
						<div>
							<p class="font-bold text-[10.5px] text-slate-900 border-b border-slate-800 inline-block px-3 pb-0.5">
								( .................................................. )
							</p>
							<p class="text-[8px] text-slate-500 mt-0.5">Tanda Tangan & Tanggal</p>
						</div>
					</div>

					<!-- Kolom 3: Disetujui -->
					<div class="flex flex-col justify-between items-center h-20">
						<div>
							<p class="text-[10.5px] font-bold text-slate-700 leading-tight">Disetujui Oleh,</p>
							<p class="text-[9px] text-slate-500">Procurement / Management</p>
						</div>
						<div>
							<p class="font-bold text-[10.5px] text-slate-900 border-b border-slate-800 inline-block px-3 pb-0.5">
								( .................................................. )
							</p>
							<p class="text-[8px] text-slate-500 mt-0.5">Authorized Approval</p>
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
