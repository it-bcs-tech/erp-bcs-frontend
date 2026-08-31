<script lang="ts">
	let { data } = $props();
	let searchQuery = $state('');

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

	let filteredBills = $derived.by(() => {
		let list = data.bills || [];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((b: any) =>
				(b.bill_number && b.bill_number.toLowerCase().includes(q)) ||
				(b.vendor_name && b.vendor_name.toLowerCase().includes(q)) ||
				(b.reference && b.reference.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>Vendor Bills | Finance ERP</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Page Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">shopping_cart_checkout</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Tagihan Pemasok & Vendor Bills</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Kelola tagihan dari pemasok/vendor, monitoring jatuh tempo hutang dagang, dan status pencairan
			</p>
		</div>
		<div class="flex gap-3">
			<a
				href="/finance/create-transaction/vendor-bills"
				class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-lg">add</span>
				<span>Buat Bill Baru</span>
			</a>
		</div>
	</header>

	<!-- Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between gap-4">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari nomor bill, nama vendor, atau referensi..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Total: <strong class="text-on-surface">{filteredBills.length}</strong> Tagihan
		</span>
	</div>

	<!-- Table Container -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">No. Bill</th>
						<th class="py-3.5 px-5">Tanggal</th>
						<th class="py-3.5 px-5">Jatuh Tempo</th>
						<th class="py-3.5 px-5">Vendor</th>
						<th class="py-3.5 px-5 text-right">Total Tagihan</th>
						<th class="py-3.5 px-5 text-right">Sudah Dibayar</th>
						<th class="py-3.5 px-5 text-right">Sisa Tagihan</th>
						<th class="py-3.5 px-5 text-center">Status</th>
						<th class="py-3.5 px-5 text-center">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredBills.length === 0}
						<tr>
							<td colspan="9" class="py-16 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 block mb-2">shopping_cart_checkout</span>
								<p class="font-bold text-on-surface">Belum ada data Vendor Bills yang cocok.</p>
							</td>
						</tr>
					{:else}
						{#each filteredBills as bill}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-5 font-bold text-on-surface font-mono text-amber-700 dark:text-amber-300">{bill.bill_number}</td>
								<td class="py-3.5 px-5 text-on-surface-variant font-mono">{formatDate(bill.date)}</td>
								<td class="py-3.5 px-5 text-on-surface-variant font-mono">{formatDate(bill.due_date)}</td>
								<td class="py-3.5 px-5 font-bold text-on-surface">{bill.vendor_name}</td>
								<td class="py-3.5 px-5 font-black text-on-surface text-right font-mono">{formatCurrency(Number(bill.total_amount))}</td>
								<td class="py-3.5 px-5 font-bold text-emerald-600 text-right font-mono">{formatCurrency(Number(bill.paid_amount))}</td>
								<td class="py-3.5 px-5 font-black text-rose-600 text-right font-mono">{formatCurrency(Number(bill.total_amount) - Number(bill.paid_amount))}</td>
								<td class="py-3.5 px-5 text-center">
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border {getStatusBadge(bill.status)}">
										{bill.status}
									</span>
								</td>
								<td class="py-3.5 px-5 text-center">
									<button class="p-1.5 rounded-lg text-on-surface-variant hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors cursor-pointer" title="Lihat Detail">
										<span class="material-symbols-outlined text-lg">visibility</span>
									</button>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
