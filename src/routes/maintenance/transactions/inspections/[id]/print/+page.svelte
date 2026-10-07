<script lang="ts">
	import type { PageData } from './$types';
	import { BLOOD_PRESSURE_REFERENCE } from '$lib/data/maintenance-checklists';

	let { data }: { data: PageData } = $props();
	const insp = $derived(data.inspection);

	function printDocument() {
		window.print();
	}
</script>

<svelte:head>
	<title>Form Inspeksi - {insp.inspectionNo}</title>
</svelte:head>

<!-- Print Control Floating Header (Hidden when printing) -->
<div class="print:hidden p-4 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-50">
	<div class="flex items-center gap-2">
		<span class="material-symbols-outlined text-amber-400">print</span>
		<span class="font-bold text-sm">Pratinjau Format Cetak Dokumen Resmi P2H ({insp.unitType})</span>
	</div>
	<div class="flex items-center gap-2">
		<button 
			onclick={printDocument}
			class="px-4 py-1.5 rounded-lg bg-primary text-white font-bold text-xs hover:opacity-90 flex items-center gap-1.5"
		>
			<span class="material-symbols-outlined text-[16px]">print</span>
			<span>Cetak Lembar</span>
		</button>
		<button 
			onclick={() => window.close()}
			class="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-600"
		>
			Tutup
		</button>
	</div>
</div>

<!-- Printable Paper Canvas (A4 Portrait Layout) -->
<div class="max-w-[210mm] mx-auto p-8 bg-white text-black font-sans text-xs print:p-0 print:max-w-none">
	<!-- Official Header Table -->
	<table class="w-full border-collapse border border-black mb-3">
		<tbody>
			<tr>
				<td class="border border-black p-2 w-32 text-center align-middle font-bold">
					<div class="text-sm tracking-widest font-black">BCS</div>
					<div class="text-[9px] tracking-tight">LOGISTICS</div>
				</td>
				<td class="border border-black p-2 text-center align-middle">
					<h1 class="text-base font-black tracking-wider uppercase">INSPEKSI KENDARAAN</h1>
					<h2 class="text-sm font-bold tracking-wide uppercase">{insp.unitType === 'TR' ? 'TRAILER' : 'DUMPTRUCK'}</h2>
				</td>
				<td class="border border-black p-2 w-48 text-[10px] space-y-0.5">
					<div><b>No. Dokumen:</b> {insp.inspectionNo}</div>
					<div><b>Tanggal:</b> {insp.date}</div>
					<div><b>Tipe:</b> {insp.type}</div>
				</td>
			</tr>
		</tbody>
	</table>

	<!-- Metadata Info Grid -->
	<table class="w-full border-collapse border border-black mb-3 text-[11px]">
		<tbody>
			<tr>
				<td class="border border-black p-1.5 font-bold bg-slate-100 w-28">No. Polisi / Unit</td>
				<td class="border border-black p-1.5 font-bold font-mono">{insp.unitId}</td>
				<td class="border border-black p-1.5 font-bold bg-slate-100 w-28">Pengemudi</td>
				<td class="border border-black p-1.5">{insp.driverName}</td>
			</tr>
			<tr>
				<td class="border border-black p-1.5 font-bold bg-slate-100">Odometer (KM)</td>
				<td class="border border-black p-1.5 font-mono">{insp.odometer} KM</td>
				<td class="border border-black p-1.5 font-bold bg-slate-100">Kenek</td>
				<td class="border border-black p-1.5">{insp.kenekName}</td>
			</tr>
		</tbody>
	</table>

	<!-- Section: Driver Health Check -->
	<div class="border border-black p-2 mb-3 text-[10px]">
		<div class="font-bold uppercase tracking-wider mb-1 bg-slate-200 p-1">CEK TEKANAN DARAH DAN TES ALKOHOL PENGEMUDI</div>
		<div class="grid grid-cols-2 gap-4">
			<div>
				<table class="w-full">
					<tbody>
						<tr>
							<td class="py-0.5 w-32"># Systolik</td>
							<td class="py-0.5 font-bold">: {insp.driverHealth?.systolic || '-'} mmHg</td>
						</tr>
						<tr>
							<td class="py-0.5"># Diastolik</td>
							<td class="py-0.5 font-bold">: {insp.driverHealth?.diastolic || '-'} mmHg</td>
						</tr>
						<tr>
							<td class="py-0.5"># Pulse</td>
							<td class="py-0.5 font-bold">: {insp.driverHealth?.pulse || '-'} bpm</td>
						</tr>
						<tr>
							<td class="py-0.5"># Hasil Tes Alkohol</td>
							<td class="py-0.5 font-bold">: {insp.driverHealth?.alcohol_test ?? '0.000'} (Standar: &lt; 0.01 = OK)</td>
						</tr>
					</tbody>
				</table>
				<div class="mt-1 font-bold">
					Kesimpulan: Pengemudi dinyatakan <u>{insp.driverHealth?.is_fit ? 'SEHAT' : 'TIDAK SEHAT'}</u> untuk melakukan aktivitas mengemudi.
				</div>
			</div>

			<!-- Age Reference Matrix -->
			<div>
				<div class="font-bold text-[9px] mb-0.5">Batas Normal Tekanan Darah Berdasarkan Usia (Toleransi +/- 5):</div>
				<table class="w-full border-collapse border border-black text-[9px] text-center">
					<thead>
						<tr class="bg-slate-100">
							<th class="border border-black p-0.5">Kategori Usia</th>
							<th class="border border-black p-0.5">Sistolik</th>
							<th class="border border-black p-0.5">Diastolik</th>
						</tr>
					</thead>
					<tbody>
						{#each BLOOD_PRESSURE_REFERENCE as bp}
							<tr>
								<td class="border border-black p-0.5 text-left">{bp.ageRange}</td>
								<td class="border border-black p-0.5">{bp.systolic}</td>
								<td class="border border-black p-0.5">{bp.diastolic}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- Section: Physical Checklist Items Table -->
	<div class="border border-black mb-3">
		<div class="font-bold uppercase tracking-wider text-[10px] bg-slate-200 p-1 border-b border-black">
			LEMBAR PENGECEKAN KENDARAAN
		</div>
		<table class="w-full border-collapse text-[10px]">
			<thead>
				<tr class="bg-slate-100 text-center font-bold">
					<th class="border border-black p-1 w-10">KODE</th>
					<th class="border border-black p-1 w-32">KATEGORI</th>
					<th class="border border-black p-1 text-left">ITEM PEMERIKSAAN</th>
					<th class="border border-black p-1 w-14">OK</th>
					<th class="border border-black p-1 w-16">NOT OK</th>
					<th class="border border-black p-1">CATATAN TEMUAN</th>
				</tr>
			</thead>
			<tbody>
				{#each insp.checklistData as item}
					<tr>
						<td class="border border-black p-1 text-center font-mono">{item.code || '-'}</td>
						<td class="border border-black p-1 font-semibold">{item.category}</td>
						<td class="border border-black p-1">{item.name}</td>
						<td class="border border-black p-1 text-center font-bold">{item.status === 'OK' ? '✓' : ''}</td>
						<td class="border border-black p-1 text-center font-bold text-red-600">{item.status === 'NOT_OK' ? '✗' : ''}</td>
						<td class="border border-black p-1 text-[9px]">{item.remark || ''}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Notes & Linked WO -->
	<div class="border border-black p-2 mb-3 text-[10px]">
		<div class="font-bold mb-0.5">CATATAN & TINDAK LANJUT BENGKEL:</div>
		<div>{insp.notes || 'Pemeriksaan berjalan sesuai SOP keselamatan operasional.'}</div>
		{#if insp.woNo}
			<div class="mt-1 font-bold text-red-700">
				* Diterbitkan Surat Perintah Kerja (SPK) Perbaikan No: {insp.woNo}
			</div>
		{/if}
	</div>

	<!-- Signatures Box -->
	<table class="w-full border-collapse border border-black text-center text-[10px]">
		<tbody>
			<tr>
				<td class="border border-black p-1 w-1/2 font-bold bg-slate-100">DIPERIKSA OLEH (INSPEKTOR)</td>
				<td class="border border-black p-1 w-1/2 font-bold bg-slate-100">PENGEMUDI (DRIVER)</td>
			</tr>
			<tr>
				<td class="border border-black p-10"></td>
				<td class="border border-black p-10"></td>
			</tr>
			<tr>
				<td class="border border-black p-1 font-bold">({insp.inspectorName})</td>
				<td class="border border-black p-1 font-bold">({insp.driverName})</td>
			</tr>
		</tbody>
	</table>
</div>

<style>
	@media print {
		body {
			background: white;
		}
	}
</style>
