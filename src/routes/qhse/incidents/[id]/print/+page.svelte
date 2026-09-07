<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();
	const inc: any = data.incident || {};

	onMount(() => {
		// Optional: auto-trigger print after short delay
		const timer = setTimeout(() => {
			window.print();
		}, 600);
		return () => clearTimeout(timer);
	});

	function formatRupiah(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(amount);
	}

	function formatDate(d: string | Date | null) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function formatDateTime(d: string | Date | null) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Berita Acara Insiden - {inc.incident_number}</title>
</svelte:head>

<!-- Top Action Bar (Hidden when printing) -->
<div class="no-print bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-50">
	<div class="flex items-center gap-3">
		<a
			href="/qhse/incidents"
			class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-sm">arrow_back</span>
			<span>Kembali ke Daftar Insiden</span>
		</a>
		<span class="text-xs text-slate-400">|</span>
		<span class="text-xs font-semibold text-slate-300">
			Pratinjau Cetak Berita Acara & Investigasi: <strong class="text-white font-mono">{inc.incident_number}</strong>
		</span>
	</div>

	<div class="flex items-center gap-2.5">
		<button
			type="button"
			onclick={() => window.print()}
			class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-base">print</span>
			<span>Cetak / Simpan PDF</span>
		</button>
	</div>
</div>

<!-- Print Container (A4 Standard) -->
<div class="print-container max-w-4xl mx-auto my-6 bg-white text-slate-900 p-8 sm:p-12 shadow-lg border border-slate-200">
	<!-- KOP SURAT RESMI PERUSAHAAN -->
	<header class="border-b-2 border-slate-900 pb-4 mb-6">
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-4">
				<div class="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-black text-2xl tracking-tighter shadow-xs">
					BCS
				</div>
				<div>
					<h1 class="text-lg font-black tracking-tight text-slate-950 uppercase leading-none">
						PT BUMI CITRA SAHIDA
					</h1>
					<p class="text-xs font-bold text-amber-700 tracking-wider uppercase mt-1">
						Logistics & Transport Solution
					</p>
					<p class="text-[11px] text-slate-600 mt-0.5">
						Jl. Raya Merak KM. 115 Rawa Arum, Grogol, Kota Cilegon, Banten 42436 | Telp: (0254) 571234
					</p>
				</div>
			</div>

			<div class="text-right">
				<span class="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
					{inc.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
					inc.status === 'CAR_ISSUED' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
					'bg-amber-100 text-amber-800 border border-amber-300'}">
					STATUS: {inc.status}
				</span>
				<p class="font-mono text-xs font-bold text-slate-700 mt-1.5">{inc.incident_number}</p>
				{#if inc.car_number}
					<p class="font-mono text-[11px] text-slate-500">No. CAR: {inc.car_number}</p>
				{/if}
			</div>
		</div>

		<div class="mt-4 pt-3 border-t border-slate-200 text-center">
			<h2 class="text-base font-black tracking-wider uppercase text-slate-900 underline underline-offset-4">
				BERITA ACARA & LAPORAN INVESTIGASI INSIDEN K3 / QHSE
			</h2>
			<p class="text-[11px] text-slate-500 mt-0.5 font-medium">
				Root Cause Analysis (5-Why), Faktor Penyebab 4M, dan Corrective Action Request (CAR)
			</p>
		</div>
	</header>

	<!-- SECTION 1: DATA KEJADIAN -->
	<section class="mb-5">
		<h3 class="text-xs font-black uppercase tracking-wider bg-slate-100 px-3 py-1.5 border-l-4 border-amber-600 text-slate-900 mb-3">
			1. Informasi Kejadian & Identitas Operasional
		</h3>

		<table class="w-full text-xs border-collapse">
			<tbody>
				<tr class="border-b border-slate-200">
					<td class="w-1/4 py-1.5 font-bold text-slate-600">Nomor Laporan</td>
					<td class="w-1/4 py-1.5 font-mono font-bold text-slate-900">{inc.incident_number}</td>
					<td class="w-1/4 py-1.5 font-bold text-slate-600">Tanggal & Waktu</td>
					<td class="w-1/4 py-1.5 font-medium text-slate-900">{formatDateTime(inc.incident_date)}</td>
				</tr>
				<tr class="border-b border-slate-200">
					<td class="py-1.5 font-bold text-slate-600">Jenis Insiden</td>
					<td class="py-1.5 font-bold text-slate-900">{inc.incident_type}</td>
					<td class="py-1.5 font-bold text-slate-600">Tingkat Keparahan</td>
					<td class="py-1.5">
						<span class="font-bold uppercase tracking-wider
							{inc.severity === 'Major' || inc.severity === 'Critical' ? 'text-rose-700' :
							inc.severity === 'Moderate' ? 'text-amber-700' : 'text-slate-800'}">
							{inc.severity}
						</span>
					</td>
				</tr>
				<tr class="border-b border-slate-200">
					<td class="py-1.5 font-bold text-slate-600">Armada / No. Unit</td>
					<td class="py-1.5 font-mono font-bold text-slate-900">{inc.unit_number || 'Tidak Ada Unit'}</td>
					<td class="py-1.5 font-bold text-slate-600">Pengemudi / Supir</td>
					<td class="py-1.5 font-bold text-slate-900">{inc.driver_name}</td>
				</tr>
				<tr>
					<td class="py-1.5 font-bold text-slate-600">Lokasi / TKP</td>
					<td colspan="3" class="py-1.5 font-medium text-slate-900">{inc.location}</td>
				</tr>
			</tbody>
		</table>
	</section>

	<!-- SECTION 2: KRONOLOGI & DAMPAK KERUGIAN -->
	<section class="mb-5">
		<h3 class="text-xs font-black uppercase tracking-wider bg-slate-100 px-3 py-1.5 border-l-4 border-amber-600 text-slate-900 mb-3">
			2. Kronologi Kejadian & Dampak Kerugian
		</h3>

		<div class="space-y-3 text-xs">
			<div>
				<p class="font-bold text-slate-700 mb-1">Deskripsi Detail Kejadian (Kronologi):</p>
				<div class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed whitespace-pre-line">
					{inc.description}
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
					<p class="text-[10px] font-bold text-slate-500 uppercase">Kerugian Finansial</p>
					<p class="text-sm font-black font-mono text-rose-700 mt-0.5">{formatRupiah(inc.financial_loss)}</p>
				</div>
				<div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
					<p class="text-[10px] font-bold text-slate-500 uppercase">Hari Kerja Hilang (LTI)</p>
					<p class="text-sm font-black font-mono text-slate-900 mt-0.5">{inc.lost_work_days} Hari</p>
				</div>
				<div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
					<p class="text-[10px] font-bold text-slate-500 uppercase">Dampak Operasional</p>
					<p class="text-xs font-bold text-slate-800 mt-0.5 truncate">{inc.consequence || 'Kerusakan Armada'}</p>
				</div>
			</div>
		</div>
	</section>

	<!-- SECTION 3: ANALISIS 4M (FAKTOR KONTRIBUSI) -->
	<section class="mb-5">
		<h3 class="text-xs font-black uppercase tracking-wider bg-slate-100 px-3 py-1.5 border-l-4 border-amber-600 text-slate-900 mb-3">
			3. Analisis Faktor Penyebab (Metode 4M)
		</h3>

		<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
			<div class="p-2 border {inc.is_human_factor ? 'border-amber-600 bg-amber-50/50' : 'border-slate-200'} rounded-lg flex items-center gap-2">
				<span class="font-bold text-sm {inc.is_human_factor ? 'text-amber-700' : 'text-slate-400'}">
					{inc.is_human_factor ? '☑' : '☐'}
				</span>
				<div>
					<p class="font-bold text-slate-900">Man (Manusia)</p>
					<p class="text-[10px] text-slate-500">Kelelahan, human-error, keahlian</p>
				</div>
			</div>

			<div class="p-2 border {inc.is_equipment_factor ? 'border-amber-600 bg-amber-50/50' : 'border-slate-200'} rounded-lg flex items-center gap-2">
				<span class="font-bold text-sm {inc.is_equipment_factor ? 'text-amber-700' : 'text-slate-400'}">
					{inc.is_equipment_factor ? '☑' : '☐'}
				</span>
				<div>
					<p class="font-bold text-slate-900">Machine (Mesin/Unit)</p>
					<p class="text-[10px] text-slate-500">Rem, ban, kegagalan mekanis</p>
				</div>
			</div>

			<div class="p-2 border {inc.is_method_factor ? 'border-amber-600 bg-amber-50/50' : 'border-slate-200'} rounded-lg flex items-center gap-2">
				<span class="font-bold text-sm {inc.is_method_factor ? 'text-amber-700' : 'text-slate-400'}">
					{inc.is_method_factor ? '☑' : '☐'}
				</span>
				<div>
					<p class="font-bold text-slate-900">Method (Prosedur)</p>
					<p class="text-[10px] text-slate-500">SOP kerja, instruksi kerja</p>
				</div>
			</div>

			<div class="p-2 border {inc.is_environment_factor ? 'border-amber-600 bg-amber-50/50' : 'border-slate-200'} rounded-lg flex items-center gap-2">
				<span class="font-bold text-sm {inc.is_environment_factor ? 'text-amber-700' : 'text-slate-400'}">
					{inc.is_environment_factor ? '☑' : '☐'}
				</span>
				<div>
					<p class="font-bold text-slate-900">Environment (Lingkungan)</p>
					<p class="text-[10px] text-slate-500">Cuaca, jalan, pencahayaan</p>
				</div>
			</div>
		</div>
	</section>

	<!-- SECTION 4: 5-WHY ROOT CAUSE ANALYSIS -->
	<section class="mb-5">
		<h3 class="text-xs font-black uppercase tracking-wider bg-slate-100 px-3 py-1.5 border-l-4 border-amber-600 text-slate-900 mb-3">
			4. Investigasi Analisis Akar Masalah (5-Why Analysis)
		</h3>

		<div class="border border-slate-200 rounded-lg overflow-hidden text-xs">
			<table class="w-full text-left">
				<thead class="bg-slate-50 border-b border-slate-200 font-bold text-[11px] text-slate-600 uppercase">
					<tr>
						<th class="py-2 px-3 w-28">Tahapan</th>
						<th class="py-2 px-3">Pertanyaan & Temuan Penyebab (Why)</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200 font-medium">
					<tr>
						<td class="py-2 px-3 font-bold text-amber-800 bg-slate-50/50">Why 1 (Langsung)</td>
						<td class="py-2 px-3 text-slate-900">{inc.analysis?.why1 || inc.description || '-'}</td>
					</tr>
					<tr>
						<td class="py-2 px-3 font-bold text-amber-800 bg-slate-50/50">Why 2</td>
						<td class="py-2 px-3 text-slate-900">{inc.analysis?.why2 || '-'}</td>
					</tr>
					<tr>
						<td class="py-2 px-3 font-bold text-amber-800 bg-slate-50/50">Why 3</td>
						<td class="py-2 px-3 text-slate-900">{inc.analysis?.why3 || '-'}</td>
					</tr>
					<tr>
						<td class="py-2 px-3 font-bold text-amber-800 bg-slate-50/50">Why 4</td>
						<td class="py-2 px-3 text-slate-900">{inc.analysis?.why4 || '-'}</td>
					</tr>
					<tr class="bg-amber-50/40">
						<td class="py-2.5 px-3 font-black text-rose-800 bg-amber-100/50">Why 5 (Akar Masalah)</td>
						<td class="py-2.5 px-3 font-bold text-slate-950">
							{inc.analysis?.why5 || inc.root_cause_analysis || 'Belum dilakukan analisis 5-Why mendalam'}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<!-- SECTION 5: CORRECTIVE ACTION REQUEST (CAR) -->
	<section class="mb-5">
		<h3 class="text-xs font-black uppercase tracking-wider bg-slate-100 px-3 py-1.5 border-l-4 border-amber-600 text-slate-900 mb-3">
			5. Corrective Action Request (CAR) & Tindakan Pencegahan
		</h3>

		<table class="w-full text-xs border-collapse border border-slate-200 rounded-lg overflow-hidden">
			<tbody>
				<tr class="border-b border-slate-200">
					<td class="w-1/4 py-2 px-3 font-bold text-slate-600 bg-slate-50">Nomor CAR</td>
					<td class="w-1/4 py-2 px-3 font-mono font-bold text-slate-900">{inc.car_number || '-'}</td>
					<td class="w-1/4 py-2 px-3 font-bold text-slate-600 bg-slate-50">Target Selesai (Due Date)</td>
					<td class="w-1/4 py-2 px-3 font-bold text-slate-900">{formatDate(inc.due_date)}</td>
				</tr>
				<tr class="border-b border-slate-200">
					<td class="py-2 px-3 font-bold text-slate-600 bg-slate-50">PIC Tindak Lanjut</td>
					<td colspan="3" class="py-2 px-3 font-bold text-slate-900">{inc.pic_followup || '-'}</td>
				</tr>
				<tr class="border-b border-slate-200">
					<td class="py-2 px-3 font-bold text-slate-600 bg-slate-50">Tindakan Korektif (Corrective Action)</td>
					<td colspan="3" class="py-2 px-3 text-slate-900 whitespace-pre-line">{inc.corrective_action || '-'}</td>
				</tr>
				<tr>
					<td class="py-2 px-3 font-bold text-slate-600 bg-slate-50">Tindakan Pencegahan (Preventive Action)</td>
					<td colspan="3" class="py-2 px-3 text-slate-900 whitespace-pre-line">{inc.preventive_action || '-'}</td>
				</tr>
			</tbody>
		</table>
	</section>

	<!-- SECTION 6: VERIFIKASI & CLOSING -->
	<section class="mb-8">
		<h3 class="text-xs font-black uppercase tracking-wider bg-slate-100 px-3 py-1.5 border-l-4 border-amber-600 text-slate-900 mb-3">
			6. Verifikasi Efektivitas & Status Penutupan Kasus
		</h3>

		<div class="p-3.5 border border-slate-200 rounded-lg text-xs bg-slate-50">
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-2 mb-2 border-b border-slate-200">
				<div>
					<span class="text-[10px] font-bold text-slate-500 uppercase">Status Kasus:</span>
					<p class="font-black text-xs uppercase mt-0.5 {inc.status === 'CLOSED' ? 'text-emerald-700' : 'text-amber-700'}">
						{inc.status}
					</p>
				</div>
				<div>
					<span class="text-[10px] font-bold text-slate-500 uppercase">Diverifikasi Oleh:</span>
					<p class="font-bold text-xs text-slate-900 mt-0.5">{inc.analysis?.verified_by || '-'}</p>
				</div>
				<div>
					<span class="text-[10px] font-bold text-slate-500 uppercase">Tanggal Closing:</span>
					<p class="font-bold text-xs text-slate-900 mt-0.5">{formatDate(inc.analysis?.closed_date)}</p>
				</div>
			</div>

			<div>
				<span class="text-[10px] font-bold text-slate-500 uppercase">Catatan Hasil Verifikasi Lapangan:</span>
				<p class="text-xs text-slate-800 mt-1 whitespace-pre-line leading-relaxed italic">
					"{inc.analysis?.closing_notes || 'Menunggu verifikasi hasil penerapan tindakan korektif dan preventif di lapangan oleh tim K3/QHSE.'}"
				</p>
			</div>
		</div>
	</section>

	<!-- SECTION 7: LEMBAR TANDA TANGAN PENGESAHAN -->
	<section class="pt-2 page-break-inside-avoid">
		<div class="grid grid-cols-3 gap-4 text-center text-xs">
			<div class="p-3 border border-slate-300 rounded-lg flex flex-col justify-between h-36">
				<p class="font-bold text-slate-700">Dilaporkan Oleh,</p>
				<div>
					<div class="border-b border-slate-400 w-3/4 mx-auto mb-1"></div>
					<p class="font-bold text-slate-900">{inc.driver_name !== 'No Driver' ? inc.driver_name : 'Pelapor Lapangan'}</p>
					<p class="text-[10px] text-slate-500">Pengemudi / Petugas Lapangan</p>
				</div>
			</div>

			<div class="p-3 border border-slate-300 rounded-lg flex flex-col justify-between h-36">
				<p class="font-bold text-slate-700">Diselidiki & Diverifikasi Oleh,</p>
				<div>
					<div class="border-b border-slate-400 w-3/4 mx-auto mb-1"></div>
					<p class="font-bold text-slate-900">{inc.analysis?.verified_by || inc.pic_followup || 'Tim Investigasi QHSE'}</p>
					<p class="text-[10px] text-slate-500">QHSE Officer / Specialist</p>
				</div>
			</div>

			<div class="p-3 border border-slate-300 rounded-lg flex flex-col justify-between h-36">
				<p class="font-bold text-slate-700">Disetujui Oleh,</p>
				<div>
					<div class="border-b border-slate-400 w-3/4 mx-auto mb-1"></div>
					<p class="font-bold text-slate-900">Head of QHSE & Operation</p>
					<p class="text-[10px] text-slate-500">Manajemen PT BCS Logistics</p>
				</div>
			</div>
		</div>
	</section>
</div>

<style>
	@media print {
		.no-print {
			display: none !important;
		}
		body {
			background: white !important;
			color: black !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.print-container {
			box-shadow: none !important;
			border: none !important;
			margin: 0 !important;
			padding: 0 !important;
			max-width: 100% !important;
		}
		@page {
			size: A4 portrait;
			margin: 1.2cm;
		}
		.page-break-inside-avoid {
			page-break-inside: avoid;
		}
	}
</style>
