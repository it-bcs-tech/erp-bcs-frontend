<script lang="ts">
	let { data } = $props();

	function formatCurrency(amount: number | string | null | undefined): string {
		if (amount === null || amount === undefined || isNaN(Number(amount))) return 'Rp 0';
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(Number(amount));
	}

	function formatDate(dateStr: string | null | undefined): string {
		if (!dateStr) return '-';
		try {
			const d = new Date(dateStr);
			if (isNaN(d.getTime())) return dateStr;
			return new Intl.DateTimeFormat('id-ID', {
				day: '2-digit',
				month: 'short',
				year: 'numeric'
			}).format(d);
		} catch {
			return dateStr;
		}
	}

	function getStatusColor(status: string) {
		switch (status?.toUpperCase()) {
			case 'PAID': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
			case 'POSTED': return 'bg-blue-100 text-blue-800 border-blue-300';
			case 'CANCELLED': return 'bg-rose-100 text-rose-800 border-rose-300';
			case 'DRAFT':
			default: return 'bg-slate-100 text-slate-700 border-slate-300';
		}
	}
</script>

<svelte:head>
	<title>Finance Dashboard | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header Section -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">account_balance</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Financial Performance & Ledger</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pemantauan arus kas operasional, tagihan piutang kustomer, hutang vendor, dan rekonsiliasi kasir
			</p>
		</div>
		<div class="flex gap-3">
			<a
				href="/finance/create-transaction"
				class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-lg">add_circle</span>
				<span>Transaksi Baru</span>
			</a>
		</div>
	</header>

	<!-- Bento Grid for Quick Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Total Piutang Invoiced -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex justify-between items-start">
				<div>
					<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Total Piutang Invoiced</span>
					<h2 class="text-2xl font-black text-emerald-600 mt-1 font-mono">{formatCurrency(data.summary.totalInvoiced)}</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">receipt_long</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-2">Tagihan operasional logistik</p>
		</div>

		<!-- Total Hutang Vendor Bills -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex justify-between items-start">
				<div>
					<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Hutang Vendor Bills</span>
					<h2 class="text-2xl font-black text-amber-600 mt-1 font-mono">{formatCurrency(data.summary.totalBills)}</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">shopping_cart_checkout</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-2">Tagihan pengadaan suku cadang</p>
		</div>

		<!-- Draft / Menunggu Review -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Menunggu Review</p>
					<h2 class="text-2xl font-black text-blue-600 mt-1 font-mono">{data.summary.draftCount} Dokumen</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">pending_actions</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-2">Invoice / Bill status Draft</p>
		</div>

		<!-- Overdue Invoices -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Invoice Jatuh Tempo</p>
					<h2 class="text-2xl font-black text-rose-600 mt-1 font-mono">{data.summary.overdueCount} Dokumen</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">warning</span>
				</div>
			</div>
			<p class="text-xs text-rose-600 font-bold mt-2">{formatCurrency(data.summary.overdueAmount)}</p>
		</div>
	</div>

	<!-- Dual Grid: Recent Invoices & Recent Payments -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Recent Invoices Table -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
			<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">receipt_long</span>
					<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Invoice Terbaru</h3>
				</div>
				<a href="/finance/invoices" class="text-xs font-bold text-amber-600 hover:underline">Lihat Semua →</a>
			</div>

			<div class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
				{#if !data.recentInvoices || data.recentInvoices.length === 0}
					<div class="py-12 text-center text-on-surface-variant">Belum ada invoice yang terdaftar.</div>
				{:else}
					{#each data.recentInvoices as inv}
						<div class="p-4 hover:bg-surface-container-high/40 transition-colors flex items-center justify-between gap-3">
							<div>
								<div class="flex items-center gap-2">
									<span class="font-mono font-bold text-amber-700 dark:text-amber-300">{inv.invoice_number}</span>
									<span class="text-[10px] text-on-surface-variant">({formatDate(inv.date)})</span>
								</div>
								<p class="font-bold text-on-surface text-xs mt-0.5">{inv.partner_name || '-'}</p>
							</div>

							<div class="text-right">
								<p class="font-mono font-bold text-on-surface text-xs">{formatCurrency(inv.total_amount)}</p>
								<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border mt-0.5 {getStatusColor(inv.status)}">
									{inv.status}
								</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Recent Payments Table -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
			<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600">payments</span>
					<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Riwayat Pembayaran Kas & Bank</h3>
				</div>
				<a href="/finance/payments" class="text-xs font-bold text-amber-600 hover:underline">Lihat Semua →</a>
			</div>

			<div class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
				{#if !data.recentPayments || data.recentPayments.length === 0}
					<div class="py-12 text-center text-on-surface-variant">Belum ada transaksi pembayaran.</div>
				{:else}
					{#each data.recentPayments as pay}
						<div class="p-4 hover:bg-surface-container-high/40 transition-colors flex items-center justify-between gap-3">
							<div>
								<div class="flex items-center gap-2">
									<span class="font-mono font-bold text-on-surface">{pay.payment_number}</span>
									<span class="text-[10px] text-on-surface-variant">({formatDate(pay.date)})</span>
								</div>
								<p class="font-semibold text-on-surface text-xs mt-0.5">{pay.partner_name || '-'}</p>
							</div>

							<div class="text-right">
								<p class="font-mono font-bold text-emerald-600 text-xs">{formatCurrency(pay.amount)}</p>
								<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border mt-0.5 bg-slate-100 text-slate-700 border-slate-200">
									{pay.status || 'DONE'}
								</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>
