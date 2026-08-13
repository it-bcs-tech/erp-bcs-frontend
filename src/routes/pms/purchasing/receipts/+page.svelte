<script lang="ts">
	let { data } = $props();

	const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '-';

	function getStatusBadge(status: string) {
		switch(status) {
			case 'DRAFT': return 'bg-slate-100 text-slate-700 border-slate-200';
			case 'DONE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
			case 'CANCELLED': return 'bg-rose-100 text-rose-700 border-rose-200';
			default: return 'bg-slate-100 text-slate-700 border-slate-200';
		}
	}
</script>

<svelte:head>
	<title>Goods Receipt | PMS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<header class="flex justify-between items-end border-b border-surface-container pb-6">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2 flex items-center gap-2">
				<span class="material-symbols-outlined text-4xl text-primary">inventory</span>
				Goods Receipt
			</h1>
			<p class="text-on-surface-variant font-medium">Daftar penerimaan barang masuk dari Vendor.</p>
		</div>
		<div class="flex gap-3">
			<a href="/pms/purchasing/receipts/create" class="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm">
				<span class="material-symbols-outlined text-[18px]">add</span> Penerimaan Baru
			</a>
		</div>
	</header>

	<!-- Table -->
	<div class="bg-surface-container-lowest rounded-3xl shadow-sm border border-surface-container overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left">
				<thead class="bg-surface-container-low/50 border-b border-surface-container text-xs font-black uppercase text-on-surface-variant tracking-wider">
					<tr>
						<th class="p-5">No. GR</th>
						<th class="p-5">Tanggal</th>
						<th class="p-5">Surat Jalan Vendor</th>
						<th class="p-5">Referensi PO</th>
						<th class="p-5 text-center">Jml Item</th>
						<th class="p-5 text-center">Status</th>
						<th class="p-5 text-center">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container text-sm">
					{#each data.receipts as gr}
						<tr class="hover:bg-surface-container-low/30 transition-colors">
							<td class="p-5 font-bold text-primary">{gr.gr_number}</td>
							<td class="p-5 font-medium text-on-surface-variant">{formatDate(gr.date)}</td>
							<td class="p-5 font-bold text-on-surface">{gr.vendor_delivery_number || '-'}</td>
							<td class="p-5 font-bold text-on-surface">{gr.po_number || '-'}</td>
							<td class="p-5 text-center font-black text-on-surface">{gr.item_count}</td>
							<td class="p-5 text-center">
								<span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border {getStatusBadge(gr.status)}">
									{gr.status}
								</span>
							</td>
							<td class="p-5">
								<div class="flex items-center justify-center gap-2">
									{#if gr.status === 'DRAFT'}
										<form method="POST" action="?/approveGR" onsubmit={() => confirm('Apakah Anda yakin ingin menerima GR ini? Stok fisik akan BERTAMBAH di sistem.')}>
											<input type="hidden" name="id" value={gr.id} />
											<button type="submit" class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors" title="Terima Barang (Approve)">
												<span class="material-symbols-outlined text-[18px]">check</span>
											</button>
										</form>
									{/if}
									<button class="w-8 h-8 rounded-full bg-surface-container hover:bg-blue-100 hover:text-blue-700 flex items-center justify-center transition-colors" title="Lihat">
										<span class="material-symbols-outlined text-[18px]">visibility</span>
									</button>
								</div>
							</td>
						</tr>
					{/each}
					{#if data.receipts.length === 0}
						<tr>
							<td colspan="7" class="p-12 text-center text-on-surface-variant font-medium">
								Belum ada Penerimaan Barang.
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
