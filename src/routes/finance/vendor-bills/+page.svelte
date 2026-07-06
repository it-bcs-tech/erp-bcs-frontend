<script lang="ts">
	let { data } = $props();

	const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
	const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '-';

	function getStatusBadge(status: string) {
		switch(status) {
			case 'DRAFT': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800';
			case 'POSTED': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
			case 'PAID': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
			case 'CANCELLED': return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';
			default: return 'bg-slate-100 text-slate-700 border-slate-200';
		}
	}
</script>

<svelte:head>
	<title>Vendor Bills | Finance ERP</title>
</svelte:head>

<div class="max-w-7xl mx-auto space-y-6">
	<!-- Page Header -->
	<header class="flex justify-between items-end border-b border-surface-container pb-6">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2 flex items-center gap-2">
				<span class="material-symbols-outlined text-4xl text-primary">shopping_cart_checkout</span>
				Vendor Bills
			</h1>
			<p class="text-on-surface-variant font-medium">Kelola tagihan dari Pemasok / Vendor.</p>
		</div>
		<div class="flex gap-3">
			<a href="/finance/create-transaction/vendor-bills" class="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm">
				<span class="material-symbols-outlined text-[18px]">add</span> Buat Bill Baru
			</a>
		</div>
	</header>

	<!-- Table -->
	<div class="bg-surface-container-lowest rounded-3xl shadow-sm border border-surface-container overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left">
				<thead class="bg-surface-container-low/50 border-b border-surface-container text-xs font-black uppercase text-on-surface-variant tracking-wider">
					<tr>
						<th class="p-5">No. Bill</th>
						<th class="p-5">Tanggal</th>
						<th class="p-5">Jatuh Tempo</th>
						<th class="p-5">Vendor</th>
						<th class="p-5 text-right">Total Tagihan</th>
						<th class="p-5 text-right">Sudah Dibayar</th>
						<th class="p-5 text-right">Sisa Tagihan</th>
						<th class="p-5 text-center">Status</th>
						<th class="p-5 text-center">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container text-sm">
					{#each data.bills as bill}
						<tr class="hover:bg-surface-container-low/30 transition-colors">
							<td class="p-5 font-bold text-primary">{bill.bill_number}</td>
							<td class="p-5 font-medium text-on-surface-variant">{formatDate(bill.date)}</td>
							<td class="p-5 font-medium text-on-surface-variant">{formatDate(bill.due_date)}</td>
							<td class="p-5 font-bold text-on-surface">{bill.vendor_name}</td>
							<td class="p-5 font-black text-on-surface text-right">{formatCurrency(Number(bill.total_amount))}</td>
							<td class="p-5 font-medium text-emerald-600 dark:text-emerald-400 text-right">{formatCurrency(Number(bill.paid_amount))}</td>
							<td class="p-5 font-black text-rose-600 dark:text-rose-400 text-right">{formatCurrency(Number(bill.total_amount) - Number(bill.paid_amount))}</td>
							<td class="p-5 text-center">
								<span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border {getStatusBadge(bill.status)}">
									{bill.status}
								</span>
							</td>
							<td class="p-5">
								<div class="flex items-center justify-center gap-2">
									<button class="w-8 h-8 rounded-full bg-surface-container hover:bg-blue-100 hover:text-blue-700 flex items-center justify-center transition-colors" title="Lihat">
										<span class="material-symbols-outlined text-[18px]">visibility</span>
									</button>
								</div>
							</td>
						</tr>
					{/each}
					{#if data.bills.length === 0}
						<tr>
							<td colspan="9" class="p-12 text-center text-on-surface-variant font-medium">
								Belum ada Vendor Bills.
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
