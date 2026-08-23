<script lang="ts">
	let { data } = $props();

	const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
	const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '-';

	function getStatusBadge(status: string) {
		switch(status) {
			case 'DRAFT': return 'bg-slate-100 text-slate-700 border-slate-200';
			case 'CONFIRMED': return 'bg-blue-100 text-blue-700 border-blue-200';
			case 'DONE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
			case 'CANCELLED': return 'bg-rose-100 text-rose-700 border-rose-200';
			default: return 'bg-slate-100 text-slate-700 border-slate-200';
		}
	}
</script>

<svelte:head>
	<title>Purchase Orders | PMS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Page Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">receipt_long</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Purchase Orders (PO)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Daftar pesanan pembelian resmi ke Vendor dan Supplier untuk kebutuhan armada dan operasional
			</p>
		</div>
		<div class="flex gap-3">
			<a href="/pms/purchasing/orders/create" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs transition-colors">
				<span class="material-symbols-outlined text-lg">add</span>
				<span>Buat PO Baru</span>
			</a>
		</div>
	</header>

	<!-- Table Container -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[750px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">No. PO</th>
						<th class="py-3.5 px-5">Tanggal</th>
						<th class="py-3.5 px-5">Vendor</th>
						<th class="py-3.5 px-5 text-center">Jml Item</th>
						<th class="py-3.5 px-5 text-right">Total Nominal</th>
						<th class="py-3.5 px-5 text-center">Status</th>
						<th class="py-3.5 px-5 text-center">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each data.orders as po}
						<tr class="hover:bg-surface-container transition-colors">
							<td class="py-4 px-5 font-bold text-emerald-600 font-mono">{po.po_number}</td>
							<td class="py-4 px-5 font-medium text-on-surface-variant text-xs">{formatDate(po.date)}</td>
							<td class="py-4 px-5 font-bold text-on-surface">{po.vendor_name || '-'}</td>
							<td class="py-4 px-5 text-center font-bold text-on-surface">{po.item_count}</td>
							<td class="py-4 px-5 text-right font-black text-on-surface">{formatCurrency(Number(po.total_amount))}</td>
							<td class="py-4 px-5 text-center">
								<span class="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border {getStatusBadge(po.status)}">
									{po.status}
								</span>
							</td>
							<td class="py-4 px-5">
								<div class="flex items-center justify-center gap-1.5">
									{#if po.status === 'DRAFT'}
										<form method="POST" action="?/approvePO" onsubmit={() => confirm('Apakah Anda yakin ingin meng-Confirm PO ini?')}>
											<input type="hidden" name="id" value={po.id} />
											<button type="submit" class="p-2 rounded-lg text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors" title="Confirm PO">
												<span class="material-symbols-outlined text-lg">check</span>
											</button>
										</form>
									{/if}
									<button class="p-2 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors" title="Lihat Detail">
										<span class="material-symbols-outlined text-lg">visibility</span>
									</button>
								</div>
							</td>
						</tr>
					{/each}
					{#if data.orders.length === 0}
						<tr>
							<td colspan="7" class="py-16 text-center text-on-surface-variant font-medium">
								<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 block mb-2">shopping_cart_off</span>
								<p class="font-bold text-on-surface">Belum ada Purchase Order</p>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
