<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const wo = $derived(data.wo);

	function printDocument() {
		window.print();
	}
</script>

<svelte:head>
	<title>Surat Perintah Kerja (SPK) - {wo.woNo}</title>
</svelte:head>

<!-- Print Control Floating Header (Hidden when printing) -->
<div class="print:hidden p-4 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-50">
	<div class="flex items-center gap-2">
		<span class="material-symbols-outlined text-amber-400">print</span>
		<span class="font-bold text-sm">Pratinjau Format Cetak Surat Perintah Kerja (SPK) Bengkel</span>
	</div>
	<div class="flex items-center gap-2">
		<button 
			onclick={printDocument}
			class="px-4 py-1.5 rounded-lg bg-primary text-white font-bold text-xs hover:opacity-90 flex items-center gap-1.5"
		>
			<span class="material-symbols-outlined text-[16px]">print</span>
			<span>Cetak SPK Fisik</span>
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
					<h1 class="text-base font-black tracking-wider uppercase">SURAT PERINTAH KERJA (SPK)</h1>
					<h2 class="text-xs font-bold tracking-wide uppercase">BENGKEL & PERAWATAN ARMADA</h2>
				</td>
				<td class="border border-black p-2 w-48 text-[10px] space-y-0.5">
					<div><b>No. SPK:</b> {wo.woNo}</div>
					<div><b>Tanggal:</b> {wo.date}</div>
					<div><b>Status:</b> {wo.status}</div>
				</td>
			</tr>
		</tbody>
	</table>

	<!-- Metadata Info Grid -->
	<table class="w-full border-collapse border border-black mb-3 text-[11px]">
		<tbody>
			<tr>
				<td class="border border-black p-1.5 font-bold bg-slate-100 w-28">No. Polisi / Unit</td>
				<td class="border border-black p-1.5 font-bold font-mono">{wo.unitId}</td>
				<td class="border border-black p-1.5 font-bold bg-slate-100 w-28">Mekanik Pelaksana</td>
				<td class="border border-black p-1.5 font-bold">{wo.mechanicName}</td>
			</tr>
			<tr>
				<td class="border border-black p-1.5 font-bold bg-slate-100">Kategori Servis</td>
				<td class="border border-black p-1.5">{wo.category}</td>
				<td class="border border-black p-1.5 font-bold bg-slate-100">Helper Mekanik</td>
				<td class="border border-black p-1.5">{wo.helperMechanicName}</td>
			</tr>
			<tr>
				<td class="border border-black p-1.5 font-bold bg-slate-100">Odometer (KM)</td>
				<td class="border border-black p-1.5 font-mono">{wo.kilometer} KM</td>
				<td class="border border-black p-1.5 font-bold bg-slate-100">Pengemudi (Driver)</td>
				<td class="border border-black p-1.5">{wo.driverName}</td>
			</tr>
			<tr>
				<td class="border border-black p-1.5 font-bold bg-slate-100">Lokasi Kerja</td>
				<td class="border border-black p-1.5">{wo.location}</td>
				<td class="border border-black p-1.5 font-bold bg-slate-100">Referensi P2H</td>
				<td class="border border-black p-1.5 font-mono">{wo.inspectionNo || '-'}</td>
			</tr>
		</tbody>
	</table>

	<!-- Primary Problem Statement -->
	<div class="border border-black p-2 mb-3 text-[10px]">
		<div class="font-bold uppercase tracking-wider mb-1 bg-slate-200 p-1">KELUHAN / MASALAH UTAMA:</div>
		<p class="font-semibold text-[11px]">{wo.complaint}</p>
	</div>

	<!-- Section: Repair Checklist Items Table -->
	<div class="border border-black mb-3">
		<div class="font-bold uppercase tracking-wider text-[10px] bg-slate-200 p-1 border-b border-black">
			RINCIAN ITEM PEKERJAAN PERBAIKAN
		</div>
		<table class="w-full border-collapse text-[10px]">
			<thead>
				<tr class="bg-slate-100 text-center font-bold">
					<th class="border border-black p-1 w-10">NO</th>
					<th class="border border-black p-1 w-32">KATEGORI</th>
					<th class="border border-black p-1 text-left">ITEM PEKERJAAN</th>
					<th class="border border-black p-1 w-20">STATUS</th>
					<th class="border border-black p-1">CATATAN TINDAKAN MEKANIK</th>
				</tr>
			</thead>
			<tbody>
				{#each wo.repairedItems as item, idx}
					<tr>
						<td class="border border-black p-1 text-center font-mono">{idx + 1}</td>
						<td class="border border-black p-1 font-semibold">{item.category}</td>
						<td class="border border-black p-1">{item.item}</td>
						<td class="border border-black p-1 text-center font-bold">
							{item.status === 'RESOLVED' ? 'SELESAI' : 'PROSES'}
						</td>
						<td class="border border-black p-1 text-[9px]">{item.mechanic_notes || item.remark || ''}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Section: Spareparts Used Table -->
	<div class="border border-black mb-3">
		<div class="font-bold uppercase tracking-wider text-[10px] bg-slate-200 p-1 border-b border-black">
			DAFTAR SUKU CADANG / MATERIAL YANG DIGUNAKAN
		</div>
		<table class="w-full border-collapse text-[10px]">
			<thead>
				<tr class="bg-slate-100 text-center font-bold">
					<th class="border border-black p-1 w-10">NO</th>
					<th class="border border-black p-1 w-28">KODE BARANG</th>
					<th class="border border-black p-1 text-left">NAMA SUKU CADANG</th>
					<th class="border border-black p-1 w-16">QTY</th>
					<th class="border border-black p-1 w-24">HARGA SATUAN</th>
					<th class="border border-black p-1 w-24">SUBTOTAL</th>
				</tr>
			</thead>
			<tbody>
				{#if wo.pmsParts.length === 0}
					<tr>
						<td colspan="6" class="border border-black p-2 text-center text-slate-500 italic">
							Tidak ada pemakaian suku cadang tercatat.
						</td>
					</tr>
				{:else}
					{#each wo.pmsParts as p, idx}
						<tr>
							<td class="border border-black p-1 text-center font-mono">{idx + 1}</td>
							<td class="border border-black p-1 font-mono text-center">{p.code || '-'}</td>
							<td class="border border-black p-1">{p.name}</td>
							<td class="border border-black p-1 text-center">{p.qty} {p.uom}</td>
							<td class="border border-black p-1 text-right font-mono">Rp {p.price.toLocaleString('id-ID')}</td>
							<td class="border border-black p-1 text-right font-mono font-bold">Rp {p.total.toLocaleString('id-ID')}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Signatures Box -->
	<table class="w-full border-collapse border border-black text-center text-[10px] mt-4">
		<tbody>
			<tr>
				<td class="border border-black p-1 w-1/3 font-bold bg-slate-100">KEPALA BENGKEL</td>
				<td class="border border-black p-1 w-1/3 font-bold bg-slate-100">MEKANIK PELAKSANA</td>
				<td class="border border-black p-1 w-1/3 font-bold bg-slate-100">PENGEMUDI / CHECKER</td>
			</tr>
			<tr>
				<td class="border border-black p-12"></td>
				<td class="border border-black p-12"></td>
				<td class="border border-black p-12"></td>
			</tr>
			<tr>
				<td class="border border-black p-1 font-bold">(....................................)</td>
				<td class="border border-black p-1 font-bold">({wo.mechanicName})</td>
				<td class="border border-black p-1 font-bold">({wo.driverName})</td>
			</tr>
		</tbody>
	</table>

	<!-- Lembar Persetujuan Rilis Bersyarat (Dispensasi Jalan) -->
	{#if wo.dispensationData?.is_requested || wo.status === 'DISPENSATION_ACTIVE'}
		<div class="border border-black mb-3 mt-4 print:break-inside-avoid">
			<div class="font-bold uppercase tracking-wider text-[10px] bg-slate-200 p-1 border-b border-black text-center">
				LEMBAR PERSETUJUAN DISPENSASI JALAN (RILIS BERSYARAT 3 PIHAK)
			</div>
			
			<div class="p-2 text-[10px] space-y-1.5 border-b border-black">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<b>Rekomendasi Teknis Mekanik:</b>
						<p class="italic">{wo.dispensationData.recommendation || '-'}</p>
					</div>
					<div>
						<b>Alasan Kebutuhan Operasional:</b>
						<p class="italic">{wo.dispensationData.operational_reason || '-'}</p>
					</div>
				</div>
				<div class="flex justify-between pt-1 border-t border-slate-200 text-[10px]">
					<div><b>Target Komitmen Kembali ke Bengkel:</b> {wo.dispensationData.commitment_date ? new Date(wo.dispensationData.commitment_date).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}</div>
					<div><b>Status Rilis:</b> {wo.status === 'DISPENSATION_ACTIVE' ? 'DISETUJUI PENUH (UNIT BOLEH JALAN)' : 'MENUNGGU PERSETUJUAN LENGKAP'}</div>
				</div>
			</div>

			<!-- Daftar Item Tertunda -->
			{#if wo.dispensationData.deferred_items && wo.dispensationData.deferred_items.length > 0}
				<div class="p-1.5 bg-slate-50 border-b border-black text-[9px]">
					<b>Item Perbaikan Tertunda:</b> 
					{wo.dispensationData.deferred_items.map(d => `${d.item} (${d.category})`).join(', ')}
				</div>
			{/if}

			<!-- Signatures 3 Pihak -->
			<table class="w-full border-collapse text-center text-[10px]">
				<thead>
					<tr class="bg-slate-100 font-bold">
						<th class="border-r border-b border-black p-1 w-1/3">1. PIHAK MAINTENANCE<br/>(KEPALA BENGKEL)</th>
						<th class="border-r border-b border-black p-1 w-1/3">2. PIHAK INSPEKSI<br/>(CHECKER / QHSE)</th>
						<th class="border-b border-black p-1 w-1/3">3. PIHAK OPERASIONAL<br/>(DISPATCHER / KA. OPS)</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td class="border-r border-black p-5 align-bottom">
							{#if wo.dispensationData.approval_maintenance?.approved}
								<div class="text-[9px] text-emerald-800 font-bold mb-1">✓ DISETUJUI SISTEM</div>
								<div class="text-[8px] text-slate-600 font-mono">{wo.dispensationData.approval_maintenance.at ? new Date(wo.dispensationData.approval_maintenance.at).toLocaleString('id-ID') : ''}</div>
							{:else}
								<div class="text-[9px] text-slate-400 italic mb-1">[ Belum Disetujui ]</div>
							{/if}
						</td>
						<td class="border-r border-black p-5 align-bottom">
							{#if wo.dispensationData.approval_inspek?.approved}
								<div class="text-[9px] text-emerald-800 font-bold mb-1">✓ DISETUJUI SISTEM</div>
								<div class="text-[8px] text-slate-600 font-mono">{wo.dispensationData.approval_inspek.at ? new Date(wo.dispensationData.approval_inspek.at).toLocaleString('id-ID') : ''}</div>
							{:else}
								<div class="text-[9px] text-slate-400 italic mb-1">[ Belum Disetujui ]</div>
							{/if}
						</td>
						<td class="border-black p-5 align-bottom">
							{#if wo.dispensationData.approval_operational?.approved}
								<div class="text-[9px] text-emerald-800 font-bold mb-1">✓ DISETUJUI SISTEM</div>
								<div class="text-[8px] text-slate-600 font-mono">{wo.dispensationData.approval_operational.at ? new Date(wo.dispensationData.approval_operational.at).toLocaleString('id-ID') : ''}</div>
							{:else}
								<div class="text-[9px] text-slate-400 italic mb-1">[ Belum Disetujui ]</div>
							{/if}
						</td>
					</tr>
					<tr class="font-bold">
						<td class="border-r border-t border-black p-1">({wo.dispensationData.approval_maintenance?.by || '....................................'})</td>
						<td class="border-r border-t border-black p-1">({wo.dispensationData.approval_inspek?.by || '....................................'})</td>
						<td class="border-t border-black p-1">({wo.dispensationData.approval_operational?.by || '....................................'})</td>
					</tr>
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	@media print {
		body {
			background: white;
		}
	}
</style>
