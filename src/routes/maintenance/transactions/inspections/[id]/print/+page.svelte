<script lang="ts">
	import type { PageData } from './$types';
	import { BLOOD_PRESSURE_REFERENCE } from '$lib/data/maintenance-checklists';

	let { data }: { data: PageData } = $props();
	const insp = $derived(data.inspection);

	function printDocument() {
		window.print();
	}

	function getDocNumber(type: string) {
		if (type === 'DT') return 'NO. FM-HSE-67 Rev.12';
		if (type === 'BULK') return 'No. FM-HSE-02 Rev.04';
		return 'No. FM-HSE-66 Rev.12';
	}

	function getDocTitle(type: string) {
		if (type === 'DT') return 'DUMPTRUCK';
		if (type === 'BULK') return 'TRONTON & TRAILER BULK';
		return 'TRAILER';
	}
</script>

<svelte:head>
	<title>Form Inspeksi Fisik ({insp.unitType}) - {insp.inspectionNo}</title>
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
			<span>Cetak Lembar Resmi</span>
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
<div class="max-w-[210mm] mx-auto p-6 bg-white text-black font-sans text-[10px] print:p-0 print:max-w-none">
	<!-- Official Form Header -->
	<table class="w-full border-collapse border border-black mb-2">
		<tbody>
			<tr>
				<td class="border border-black p-2 w-28 text-center align-middle font-bold">
					<div class="text-base tracking-widest font-black">BCS</div>
					<div class="text-[8px] tracking-tight">LOGISTICS</div>
				</td>
				<td class="border border-black p-2 text-center align-middle">
					<h1 class="text-sm font-black tracking-wider uppercase">INSPEKSI KENDARAAN</h1>
					<h2 class="text-xs font-bold tracking-wide uppercase">{getDocTitle(insp.unitType)}</h2>
				</td>
				<td class="border border-black p-2 w-52 text-[9px] align-middle space-y-1">
					<div class="font-mono font-bold text-right">{getDocNumber(insp.unitType)}</div>
					<div class="border border-black p-1 space-y-0.5 text-[8px]">
						<div>[{insp.status === 'LAYAK' ? '✓' : ' '}] LAYAK BEROPERASI</div>
						<div>[{insp.status === 'LAYAK_DENGAN_CATATAN' ? '✓' : ' '}] LAYAK DENGAN CATATAN</div>
						<div>[{insp.status === 'TIDAK_LAYAK' ? '✓' : ' '}] TIDAK LAYAK BEROPERASI</div>
					</div>
				</td>
			</tr>
		</tbody>
	</table>

	<!-- Metadata Info Grid based on Unit Type -->
	<table class="w-full border-collapse border border-black mb-2 text-[10px]">
		<tbody>
			{#if insp.unitType === 'DT'}
				<tr>
					<td class="border border-black p-1 bg-slate-100 font-bold w-20">Masuk</td>
					<td class="border border-black p-1 font-mono">Waktu: {insp.entryTime}</td>
					<td class="border border-black p-1 bg-slate-100 font-bold w-24">No. Polisi :</td>
					<td class="border border-black p-1 font-mono font-bold">{insp.policeNo}</td>
					<td class="border border-black p-1 bg-slate-100 font-bold w-20">No. Unit :</td>
					<td class="border border-black p-1 font-mono font-bold">{insp.unitId}</td>
				</tr>
				<tr>
					<td class="border border-black p-1 bg-slate-100 font-bold">Keluar</td>
					<td class="border border-black p-1 font-mono">Waktu: {insp.exitTime}</td>
					<td class="border border-black p-1 bg-slate-100 font-bold">Pengemudi :</td>
					<td class="border border-black p-1">{insp.driverName}</td>
					<td class="border border-black p-1 bg-slate-100 font-bold">No. Id :</td>
					<td class="border border-black p-1 font-mono">{insp.driverId}</td>
				</tr>
				<tr>
					<td class="border border-black p-1 bg-slate-100 font-bold">Odometer</td>
					<td class="border border-black p-1 font-mono">{insp.odometer} KM</td>
					<td class="border border-black p-1 bg-slate-100 font-bold">Kenek :</td>
					<td class="border border-black p-1">{insp.kenekName}</td>
					<td class="border border-black p-1 bg-slate-100 font-bold">No. Apar :</td>
					<td class="border border-black p-1 font-mono">{insp.noApar}</td>
				</tr>
			{:else if insp.unitType === 'BULK'}
				<tr>
					<td class="border border-black p-1 bg-slate-100 font-bold w-28">Tipe Unit :</td>
					<td class="border border-black p-1 font-bold">TRONTON & TRAILER BULK</td>
					<td class="border border-black p-1 bg-slate-100 font-bold w-28">Tgl / Jam Masuk :</td>
					<td class="border border-black p-1 font-mono">{insp.entryTime}</td>
				</tr>
				<tr>
					<td class="border border-black p-1 bg-slate-100 font-bold">Nomor Unit :</td>
					<td class="border border-black p-1 font-mono font-bold">{insp.unitId}</td>
					<td class="border border-black p-1 bg-slate-100 font-bold">Tgl / Jam Keluar :</td>
					<td class="border border-black p-1 font-mono">{insp.exitTime}</td>
				</tr>
				<tr>
					<td class="border border-black p-1 bg-slate-100 font-bold">Nomor Polisi :</td>
					<td class="border border-black p-1 font-mono font-bold">{insp.policeNo}</td>
					<td class="border border-black p-1 bg-slate-100 font-bold">Nomor Inspector :</td>
					<td class="border border-black p-1 font-mono">{insp.inspectorId} ({insp.inspectorName})</td>
				</tr>
				<tr>
					<td class="border border-black p-1 bg-slate-100 font-bold">Nama Pengemudi :</td>
					<td class="border border-black p-1 font-bold">{insp.driverName}</td>
					<td class="border border-black p-1 bg-slate-100 font-bold">Odometer / Tujuan :</td>
					<td class="border border-black p-1 font-mono">{insp.odometer} KM • {insp.destination}</td>
				</tr>
			{:else}
				<tr>
					<td class="border border-black p-1 bg-slate-100 font-bold w-36">Tgl / Jam Masuk :</td>
					<td class="border border-black p-1 font-mono">{insp.entryTime}</td>
					<td class="border border-black p-1 bg-slate-100 font-bold w-28">No Unit :</td>
					<td class="border border-black p-1 font-mono font-bold">{insp.unitId}</td>
				</tr>
				<tr>
					<td class="border border-black p-1 bg-slate-100 font-bold">Tgl / Jam Keluar :</td>
					<td class="border border-black p-1 font-mono">{insp.exitTime}</td>
					<td class="border border-black p-1 bg-slate-100 font-bold">Type Unit :</td>
					<td class="border border-black p-1 font-bold">TRAILER</td>
				</tr>
				<tr>
					<td class="border border-black p-1 bg-slate-100 font-bold">Odometer (KM) :</td>
					<td class="border border-black p-1 font-mono">{insp.odometer} KM</td>
					<td class="border border-black p-1 bg-slate-100 font-bold">Operator (Driver) :</td>
					<td class="border border-black p-1 font-bold">{insp.driverName}</td>
				</tr>
			{/if}
		</tbody>
	</table>

	<!-- Section: Physical Checklist Items Table (Compact 2-Column Grid or Full Table) -->
	<div class="border border-black mb-2">
		<div class="font-bold uppercase tracking-wider text-[9px] bg-slate-200 p-1 border-b border-black">
			LEMBAR PENGECEKAN KENDARAAN (CHECKLIST FISIK OPERASIONAL)
		</div>
		<table class="w-full border-collapse text-[9px]">
			<thead>
				<tr class="bg-slate-100 text-center font-bold">
					<th class="border border-black p-0.5 w-8">KD</th>
					<th class="border border-black p-0.5 w-32">KATEGORI</th>
					<th class="border border-black p-0.5 text-left">ITEM PEMERIKSAAN</th>
					<th class="border border-black p-0.5 w-10">OK</th>
					<th class="border border-black p-0.5 w-12">NOT OK</th>
					<th class="border border-black p-0.5 w-44">CATATAN TEMUAN</th>
				</tr>
			</thead>
			<tbody>
				{#each insp.checklistData as item}
					<tr>
						<td class="border border-black p-0.5 text-center font-mono">{item.code || '-'}</td>
						<td class="border border-black p-0.5 font-semibold text-[8px]">{item.category}</td>
						<td class="border border-black p-0.5">{item.name}</td>
						<td class="border border-black p-0.5 text-center font-bold">{item.status === 'OK' ? '✓' : ''}</td>
						<td class="border border-black p-0.5 text-center font-bold text-red-600">{item.status === 'NOT_OK' ? '✗' : ''}</td>
						<td class="border border-black p-0.5 text-[8px]">{item.remark || ''}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Section: Pemeriksaan Ketebalan Ban (Tire Tread Depth MM) -->
	<div class="border border-black mb-2 text-[9px]">
		<div class="font-bold uppercase tracking-wider bg-slate-200 p-1 border-b border-black">
			PEMERIKSAAN KETEBALAN BAN (MINIMAL 1.0 MM - SK.523/AJ.402/DRJD/2015)
		</div>
		<div class="p-1 space-y-1">
			{#if insp.tireDepthData?.head && insp.tireDepthData.head.length > 0}
				<div>
					<b>1. BAN HEAD:</b>
					<div class="grid grid-cols-6 sm:grid-cols-12 gap-1 mt-0.5">
						{#each insp.tireDepthData.head as d, idx}
							<div class="border border-black p-0.5 text-center font-mono text-[8px]">
								#{idx + 1}: <b>{d !== null ? `${d} mm` : '-'}</b>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if insp.tireDepthData?.trailer && insp.tireDepthData.trailer.length > 0}
				<div>
					<b>2. BAN TRAILER:</b>
					<div class="grid grid-cols-6 sm:grid-cols-12 gap-1 mt-0.5">
						{#each insp.tireDepthData.trailer as d, idx}
							<div class="border border-black p-0.5 text-center font-mono text-[8px]">
								Trl #{idx + 1}: <b>{d !== null ? `${d} mm` : '-'}</b>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="pt-0.5 font-mono">
				<b>BAN SEREP:</b> {insp.tireDepthData?.spare !== null && insp.tireDepthData?.spare !== undefined ? `${insp.tireDepthData.spare} mm` : '-'}
			</div>
		</div>
	</div>

	<!-- Section: Driver Health Check -->
	<div class="border border-black p-1.5 mb-2 text-[9px]">
		<div class="font-bold uppercase tracking-wider mb-1 bg-slate-200 p-0.5">CEK TEKANAN DARAH DAN TES ALKOHOL PENGEMUDI</div>
		<div class="grid grid-cols-2 gap-2">
			<div>
				<table class="w-full text-[9px]">
					<tbody>
						<tr>
							<td class="py-0.5 w-28"># Systolik</td>
							<td class="py-0.5 font-bold">: {insp.driverHealth?.systolic || '-'} mmHg</td>
							<td class="py-0.5 w-28"># Jam Ukur</td>
							<td class="py-0.5 font-mono">: {insp.driverHealth?.measurement_time || '-'}</td>
						</tr>
						<tr>
							<td class="py-0.5"># Diastolik</td>
							<td class="py-0.5 font-bold">: {insp.driverHealth?.diastolic || '-'} mmHg</td>
							<td class="py-0.5"># Umur Driver</td>
							<td class="py-0.5 font-mono">: {insp.driverHealth?.driver_age ? `${insp.driverHealth.driver_age} Thn` : '-'}</td>
						</tr>
						<tr>
							<td class="py-0.5"># Pulse</td>
							<td class="py-0.5 font-bold">: {insp.driverHealth?.pulse || '-'} bpm</td>
							<td class="py-0.5"># Tujuan</td>
							<td class="py-0.5 font-mono">: {insp.driverHealth?.destination || '-'}</td>
						</tr>
						<tr>
							<td class="py-0.5"># Hasil Alkohol</td>
							<td class="py-0.5 font-bold" colspan="3">: {insp.driverHealth?.alcohol_test ?? '0.00'} (Standar: &lt; 0.01 = OK)</td>
						</tr>
					</tbody>
				</table>
				<div class="mt-0.5 font-bold">
					Kesimpulan: Driver dinyatakan <u>{insp.driverHealth?.is_fit ? 'SEHAT' : 'TIDAK SEHAT'}</u> untuk mengemudi (Toleransi +/- 5).
				</div>
			</div>

			<!-- Age Reference Matrix -->
			<div>
				<div class="font-bold text-[8px] mb-0.5">Batas Normal Sesuai Usia:</div>
				<table class="w-full border-collapse border border-black text-[8px] text-center">
					<thead>
						<tr class="bg-slate-100">
							<th class="border border-black p-0.5">Usia</th>
							<th class="border border-black p-0.5">Sistolik</th>
							<th class="border border-black p-0.5">Diastolik</th>
							<th class="border border-black p-0.5">Pulse</th>
						</tr>
					</thead>
					<tbody>
						{#each BLOOD_PRESSURE_REFERENCE as bp}
							<tr>
								<td class="border border-black p-0.5 text-left">{bp.ageRange}</td>
								<td class="border border-black p-0.5">{bp.systolic}</td>
								<td class="border border-black p-0.5">{bp.diastolic}</td>
								<td class="border border-black p-0.5">60 – 100x</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- Notes & Linked Work Order -->
	<div class="border border-black p-1.5 mb-2 text-[9px]">
		<div class="font-bold mb-0.5">CATATAN & REKOMENDASI INSPEKTOR:</div>
		<div>{insp.notes || 'Pemeriksaan kelayakan armada dan pengemudi selesai sesuai ketentuan.'}</div>
		{#if insp.woNo}
			<div class="mt-1 font-bold text-red-700">
				* Diterbitkan Surat Perintah Kerja (SPK) Bengkel No: {insp.woNo}
			</div>
		{/if}
	</div>

	<!-- Official 2-Session Signatures: KELUAR & MASUK -->
	<table class="w-full border-collapse border border-black text-center text-[9px]">
		<thead>
			<tr class="bg-slate-100 font-bold">
				<th colspan="2" class="border border-black p-1 w-1/2">KELUAR</th>
				<th colspan="2" class="border border-black p-1 w-1/2">MASUK</th>
			</tr>
			<tr class="bg-slate-50 font-bold">
				<th class="border border-black p-0.5 w-1/4">Mengetahui (Inspektor)</th>
				<th class="border border-black p-0.5 w-1/4">Dilaporkan Oleh (Driver)</th>
				<th class="border border-black p-0.5 w-1/4">Mengetahui (Inspektor)</th>
				<th class="border border-black p-0.5 w-1/4">Dilaporkan Oleh (Driver)</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td class="border border-black p-6"></td>
				<td class="border border-black p-6"></td>
				<td class="border border-black p-6"></td>
				<td class="border border-black p-6"></td>
			</tr>
			<tr class="font-bold">
				<td class="border border-black p-1">({insp.inspectorName})</td>
				<td class="border border-black p-1">({insp.driverName})</td>
				<td class="border border-black p-1">({insp.inspectorName})</td>
				<td class="border border-black p-1">({insp.driverName})</td>
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
