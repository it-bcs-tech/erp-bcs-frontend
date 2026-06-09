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
	<div class="a4-paper bg-white mx-auto p-12 text-black text-sm">
		<!-- KOP SURAT -->
		<div class="flex justify-between items-end border-b-4 border-indigo-900 pb-6 mb-8 gap-6">
			<div class="flex items-center gap-4">
				<img src="https://bcs-logistics.co.id/assets/images/logoo.png" alt="BCS Logistics Logo" class="h-8 object-contain">
				<div>
					<h1 class="text-2xl font-black tracking-tighter text-indigo-900 uppercase">PT. BUANA CENTRA SWAKARSA LOGISTICS</h1>
					<p class="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-widest">Logistics & Transportation Services</p>
				</div>
			</div>
			<div class="text-right text-[10px] text-slate-600 max-w-sm">
				<p class="font-bold mb-0.5">Head Office : BCS Logistics Center</p>
				<p class="mb-0.5">Jl. Raya Merak KM. 115, Rw. Arum, Kec. Gerogol, Kota Cilegon, Banten - 42436</p>
				<p class="mb-0.5">Phone : +62 254 570 555 | Fax : +62 254 570 666</p>
				<p>Email : marketing@bcs-logistics.co.id | Website : https://bcs-logistics.co.id</p>
			</div>
		</div>

		<!-- KEPALA SURAT -->
		<div class="flex justify-between mb-10">
			<div>
				<p class="mb-1">Nomor : PEN-{deal.id.split('-')[1]}-{deal.id.split('-')[2]}</p>
				<p class="mb-1">Hal : <strong>Penawaran Jasa Pengangkutan ({deal.project_category})</strong></p>
				<p class="mb-1">Lampiran : -</p>
			</div>
			<div class="text-right">
				<p>Jakarta, {getTodayDate()}</p>
			</div>
		</div>

		<div class="mb-8">
			<p class="mb-1">Kepada Yth,</p>
			<p class="font-bold text-base">{deal.contact_person || 'Bapak/Ibu Pimpinan'}</p>
			<p class="font-bold">{deal.company_name}</p>
			<p>Di Tempat</p>
		</div>

		<!-- ISI SURAT -->
		<div class="mb-8 leading-relaxed">
			<p class="mb-4">Dengan hormat,</p>
			<p class="mb-4 text-justify">
				Berdasarkan diskusi dan kebutuhan transportasi logistik di perusahaan Bapak/Ibu, kami PT. Buana Centra Swakarsa Logistics bermaksud mengajukan penawaran harga untuk layanan jasa pengangkutan dengan detail sebagai berikut:
			</p>
		</div>

		<!-- TABEL HARGA -->
		<div class="mb-8">
			<table class="w-full border-collapse border border-slate-800">
				<thead>
					<tr class="bg-slate-100">
						<th class="border border-slate-800 py-3 px-4 text-left">No</th>
						<th class="border border-slate-800 py-3 px-4 text-left">Deskripsi Layanan</th>
						<th class="border border-slate-800 py-3 px-4 text-center">Estimasi Tonase</th>
						<th class="border border-slate-800 py-3 px-4 text-right">Tarif / Ton (Rp)</th>
						<th class="border border-slate-800 py-3 px-4 text-right">Total Nilai Estimasi (Rp)</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td class="border border-slate-800 py-4 px-4 text-center">1</td>
						<td class="border border-slate-800 py-4 px-4">
							<p class="font-bold uppercase">{deal.project_category} SERVICES</p>
							<p class="text-xs text-slate-600 mt-1">Layanan pengangkutan muatan sesuai kesepakatan rute operasional.</p>
						</td>
						<td class="border border-slate-800 py-4 px-4 text-center">
							{deal.estimated_tonnage ? new Intl.NumberFormat('id-ID').format(deal.estimated_tonnage) + ' Ton' : 'TBD'}
						</td>
						<td class="border border-slate-800 py-4 px-4 text-right">
							{unitPrice > 0 ? formatCurrency(unitPrice) : 'TBD'}
						</td>
						<td class="border border-slate-800 py-4 px-4 text-right font-bold bg-indigo-50/50">
							{deal.estimated_value ? formatCurrency(deal.estimated_value) : 'TBD'}
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- SYARAT & KETENTUAN -->
		<div class="mb-12">
			<h4 class="font-bold underline mb-3">Syarat & Ketentuan (Terms & Conditions):</h4>
			<ul class="list-decimal pl-5 space-y-2 text-sm">
				<li>Harga di atas <strong>exclude (belum termasuk) PPN 11%</strong>.</li>
				<li>Harga sudah termasuk biaya operasional (UJO), bahan bakar, dan jasa supir.</li>
				<li>Sistem pembayaran dilakukan via Transfer Bank paling lambat 14 Hari Kerja setelah *Invoice* & *Berita Acara* diterima dengan lengkap dan benar.</li>
				<li>Penawaran harga ini berlaku selama <strong>14 (empat belas) hari kerja</strong> terhitung sejak tanggal diterbitkan.</li>
			</ul>
		</div>

		<!-- PENUTUP -->
		<div class="mb-16 leading-relaxed">
			<p class="text-justify">
				Demikian surat penawaran harga ini kami sampaikan. Kami sangat berharap dapat menjalin kerjasama yang baik dan saling menguntungkan dengan {deal.company_name}. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.
			</p>
		</div>

		<!-- TTD -->
		<div class="flex justify-end">
			<div class="text-center w-64">
				<p class="mb-20">Hormat Kami,</p>
				<p class="font-bold underline">Manajer Marketing</p>
				<p class="text-xs mt-1">PT. Buana Centra Swakarsa Logistics</p>
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
		}

		/* Hide our custom non-print actions */
		.no-print {
			display: none !important;
		}

		.print-wrapper {
			position: absolute !important;
			top: 0;
			left: 0;
			width: 100%;
			height: auto;
			z-index: 9999;
			background: white;
		}

		.a4-paper {
			box-shadow: none !important;
			margin: 0 !important;
			padding: 0 !important;
			width: 100% !important;
		}
	}
</style>
