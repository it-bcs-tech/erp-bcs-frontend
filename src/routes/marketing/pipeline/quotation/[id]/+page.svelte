<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const deal = data.deal;

	// Calculate unit price from total value and tonnage
	const unitPrice = deal.estimated_tonnage && deal.estimated_tonnage > 0 
		? deal.estimated_value / deal.estimated_tonnage 
		: 0;

	function formatCurrency(num: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
	}

	function getTodayDate() {
		return new Date().toLocaleDateString('id-ID', { 
			day: 'numeric', month: 'long', year: 'numeric' 
		});
	}

	function handlePrint() {
		window.print();
	}
</script>

<svelte:head>
	<title>Quotation - {deal.company_name}</title>
</svelte:head>

<!-- Print Container (Only shows exactly what we want to print, hiding the app shell) -->
<div class="print-wrapper bg-white min-h-screen">
	<!-- Action Bar (Hidden when printing) -->
	<div class="no-print bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
		<div class="flex items-center gap-3">
			<a href="/marketing/pipeline" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 transition-colors">
				<span class="material-symbols-outlined text-sm">arrow_back</span>
			</a>
			<h2 class="font-bold text-sm">Quotation Document Preview</h2>
		</div>
		<button onclick={handlePrint} class="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
			<span class="material-symbols-outlined text-[18px]">print</span>
			Print / Save PDF
		</button>
	</div>

	<!-- A4 Paper Area -->
	<div class="a4-paper bg-white mx-auto p-8 sm:p-12 text-black text-xs leading-normal">
		<!-- KOP SURAT -->
		<div class="flex justify-between items-end border-b-2 border-indigo-900 pb-2 mb-3 gap-6">
			<div class="flex items-center gap-3">
				<img src="https://bcs-logistics.co.id/assets/images/logoo.png" alt="BCS Logistics Logo" class="h-8 object-contain">
				<div>
					<h1 class="text-lg font-black tracking-tight text-indigo-900 uppercase">PT. BUANA CENTRA SWAKARSA LOGISTICS</h1>
					<p class="text-[9px] font-bold text-slate-600 mt-0.5 uppercase tracking-widest">Logistics & Transportation Services</p>
				</div>
			</div>
			<div class="text-right text-[8.5px] text-slate-600 max-w-sm leading-tight">
				<p class="font-bold mb-0.5">Head Office : BCS Logistics Center</p>
				<p class="mb-0.5">Jl. Raya Merak KM. 115, Rw. Arum, Kec. Gerogol, Kota Cilegon, Banten - 42436</p>
				<p class="mb-0.5">Phone : +62 254 570 555 | Fax : +62 254 570 666</p>
				<p>Email : marketing@bcs-logistics.co.id | Website : https://bcs-logistics.co.id</p>
			</div>
		</div>

		<!-- KEPALA SURAT -->
		<div class="flex justify-between mb-3 text-xs">
			<div>
				<p class="mb-0.5">Nomor : PEN-{deal.id.split('-')[1]}-{deal.id.split('-')[2]}</p>
				<p class="mb-0.5">Hal : <strong>Penawaran Jasa Pengangkutan ({deal.project_category})</strong></p>
				<p class="mb-0.5">Lampiran : -</p>
			</div>
			<div class="text-right">
				<p>Jakarta, {getTodayDate()}</p>
			</div>
		</div>

		<div class="mb-3 text-xs">
			<p class="mb-0.5">Kepada Yth,</p>
			<p class="font-bold text-sm">{deal.contact_person || 'Bapak/Ibu Pimpinan'}</p>
			<p class="font-bold">{deal.company_name}</p>
			<p>Di Tempat</p>
		</div>

		<!-- ISI SURAT -->
		<div class="mb-3 leading-relaxed text-xs">
			<p class="mb-1.5">Dengan hormat,</p>
			<p class="mb-1.5 text-justify">
				Berdasarkan diskusi dan kebutuhan transportasi logistik di perusahaan Bapak/Ibu, kami PT. Buana Centra Swakarsa Logistics bermaksud mengajukan penawaran harga untuk layanan jasa pengangkutan dengan detail sebagai berikut:
			</p>
		</div>

		<!-- TABEL HARGA -->
		<div class="mb-3">
			<table class="w-full border-collapse border border-slate-800 text-[11px]">
				<thead>
					<tr class="bg-slate-100 font-bold">
						<th class="border border-slate-800 py-1.5 px-3 text-center w-8">No</th>
						<th class="border border-slate-800 py-1.5 px-3 text-left">Deskripsi Layanan</th>
						<th class="border border-slate-800 py-1.5 px-3 text-center w-24">Estimasi Tonase</th>
						<th class="border border-slate-800 py-1.5 px-3 text-right w-32">Tarif / Ton (Rp)</th>
						<th class="border border-slate-800 py-1.5 px-3 text-right w-36">Total Nilai Estimasi (Rp)</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td class="border border-slate-800 py-2 px-3 text-center">1</td>
						<td class="border border-slate-800 py-2 px-3">
							<p class="font-bold uppercase">{deal.project_category} SERVICES</p>
							<p class="text-[10px] text-slate-600 mt-0.5">Layanan pengangkutan muatan sesuai kesepakatan rute operasional.</p>
						</td>
						<td class="border border-slate-800 py-2 px-3 text-center font-mono">
							{deal.estimated_tonnage ? new Intl.NumberFormat('id-ID').format(deal.estimated_tonnage) + ' Ton' : 'TBD'}
						</td>
						<td class="border border-slate-800 py-2 px-3 text-right font-mono">
							{unitPrice > 0 ? formatCurrency(unitPrice) : 'TBD'}
						</td>
						<td class="border border-slate-800 py-2 px-3 text-right font-bold font-mono bg-indigo-50/50">
							{deal.estimated_value ? formatCurrency(deal.estimated_value) : 'TBD'}
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- SYARAT & KETENTUAN -->
		<div class="mb-3 text-xs">
			<h4 class="font-bold underline mb-1.5">Syarat & Ketentuan (Terms & Conditions):</h4>
			<ul class="list-decimal pl-5 space-y-1 text-[11px]">
				<li>Harga di atas <strong>exclude (belum termasuk) PPN 11%</strong>.</li>
				<li>Harga sudah termasuk biaya operasional (UJO), bahan bakar, dan jasa supir.</li>
				<li>Sistem pembayaran dilakukan via Transfer Bank paling lambat 14 Hari Kerja setelah *Invoice* & *Berita Acara* diterima dengan lengkap dan benar.</li>
				<li>Penawaran harga ini berlaku selama <strong>14 (empat belas) hari kerja</strong> terhitung sejak tanggal diterbitkan.</li>
			</ul>
		</div>

		<!-- PENUTUP -->
		<div class="mb-4 leading-relaxed text-xs">
			<p class="text-justify">
				Demikian surat penawaran harga ini kami sampaikan. Kami sangat berharap dapat menjalin kerjasama yang baik dan saling menguntungkan dengan {deal.company_name}. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.
			</p>
		</div>

		<!-- TTD (Guaranteed on same page) -->
		<div class="signature-block break-inside-avoid flex justify-end pt-1">
			<div class="text-center w-64 flex flex-col justify-between items-center h-20">
				<div>
					<p class="font-bold text-xs">Hormat Kami,</p>
					<p class="text-[10px] text-slate-500">PT. Buana Centra Swakarsa Logistics</p>
				</div>
				<div>
					<p class="font-bold underline text-xs">Manajer Marketing</p>
					<p class="text-[9px] text-slate-500 mt-0.5">Authorized Signature</p>
				</div>
			</div>
		</div>

	</div>
</div>

<style>
	/* Make the A4 Paper look like a real paper on screen */
	.a4-paper {
		width: 210mm;
		min-height: 297mm;
		box-shadow: 0 0 20px rgba(0,0,0,0.1);
		margin-top: 2rem;
		margin-bottom: 2rem;
		box-sizing: border-box;
	}

	@page {
		size: A4 portrait;
		margin: 0;
	}

	/* Force print styles to hide EVERYTHING else in the ERP */
	@media print {
		/* Hide the main app wrapper layout elements (sidebar, topnav) */
		:global(aside), :global(nav), :global(header) {
			display: none !important;
		}
		
		/* The ERP container might have padding or max-width, reset it */
		:global(main), :global(#app), :global(body) {
			padding: 0 !important;
			margin: 0 !important;
			background: white !important;
			width: 100% !important;
			max-width: none !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}

		/* Hide our custom non-print actions */
		.no-print {
			display: none !important;
		}

		.print-wrapper {
			position: relative !important;
			width: 100% !important;
			min-height: 100vh !important;
			margin: 0 !important;
			padding: 0 !important;
			background: white !important;
		}

		.a4-paper {
			box-shadow: none !important;
			margin: 0 auto !important;
			padding: 10mm 15mm !important;
			width: 100% !important;
			box-sizing: border-box !important;
		}

		.signature-block, .break-inside-avoid {
			break-inside: avoid !important;
			page-break-inside: avoid !important;
		}
	}
</style>
