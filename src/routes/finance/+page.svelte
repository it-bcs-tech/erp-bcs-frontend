<script lang="ts">
	let { data } = $props();

	// Tab states
	let activeDocTab = $state<'invoices' | 'bills'>('invoices');
	let activePaymentTab = $state<'bank' | 'ujo'>('bank');
	let selectedMonthIdx = $state<number | null>(null);

	function formatRupiah(amount: number | string | null | undefined): string {
		if (amount === null || amount === undefined || isNaN(Number(amount))) return 'Rp 0';
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(Number(amount));
	}

	function formatShortRupiah(val: number | string | null | undefined): string {
		const num = Number(val) || 0;
		if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)} M`;
		if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1)} Jt`;
		if (num >= 1_000) return `Rp ${(num / 1_000).toFixed(0)} Rb`;
		return `Rp ${num}`;
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

	function getStatusBadge(status: string) {
		switch (status?.toUpperCase()) {
			case 'PAID':
				return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
			case 'POSTED':
				return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
			case 'CANCELLED':
			case 'REJECTED':
				return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
			case 'DRAFT':
			default:
				return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
		}
	}
</script>

<svelte:head>
	<title>Finance Command Center | ERP BCS</title>
</svelte:head>

<div class="space-y-6 pb-8">
	<!-- HEADER SECTION -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">account_balance</span>
				</div>
				<div>
					<h1 class="text-2xl font-black text-on-surface tracking-tight">Finance Command Center</h1>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">
						Pemantauan likuiditas kas, aging piutang kustomer (AR), kewajiban hutang vendor (AP), dan rekonsiliasi kasir
					</p>
				</div>
			</div>
		</div>

		<!-- Action CTAs -->
		<div class="flex flex-wrap items-center gap-2.5">
			<a
				href="/finance/create-transaction/customer-invoices"
				class="px-3.5 py-2 rounded-xl bg-surface border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-on-surface hover:bg-surface-container transition-all flex items-center gap-1.5 shadow-xs"
			>
				<span class="material-symbols-outlined text-base text-emerald-600">receipt_long</span>
				<span>Buat Faktur AR</span>
			</a>
			<a
				href="/finance/create-transaction/vendor-bills"
				class="px-3.5 py-2 rounded-xl bg-surface border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-on-surface hover:bg-surface-container transition-all flex items-center gap-1.5 shadow-xs"
			>
				<span class="material-symbols-outlined text-base text-amber-600">shopping_cart_checkout</span>
				<span>Tagihan Vendor AP</span>
			</a>
			<a
				href="/finance/create-transaction"
				class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">add_circle</span>
				<span>Transaksi Baru</span>
			</a>
		</div>
	</header>

	<!-- ZONA 1: 4 EXECUTIVE BENTO KPI CARDS -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- 1. Total Piutang Invoiced (AR) -->
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Piutang Usaha (AR)</span>
					<h2 class="text-2xl font-black text-emerald-600 mt-1 font-mono tracking-tight">
						{formatShortRupiah(data.summary.totalInvoiced)}
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">receipt_long</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">
					<strong class="text-on-surface">{data.summary.postedInvoicedCount}</strong> Aktif ({formatShortRupiah(data.summary.postedInvoiced)})
				</span>
				<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold font-mono text-[10px]">
					{data.summary.draftInvoicedCount} Draft
				</span>
			</div>
		</div>

		<!-- 2. Total Hutang Vendor (AP) -->
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Hutang Vendor (AP)</span>
					<h2 class="text-2xl font-black text-amber-600 mt-1 font-mono tracking-tight">
						{formatShortRupiah(data.summary.totalBills)}
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">shopping_cart_checkout</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">
					<strong class="text-on-surface">{data.summary.totalBillsCount}</strong> Tagihan Suku Cadang
				</span>
				<a href="/finance/vendor-bills" class="text-amber-600 font-bold hover:underline text-[10px]">
					Kelola AP →
				</a>
			</div>
		</div>

		<!-- 3. Likuiditas Kas Operasional -->
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Saldo Kas Likuiditas</span>
					<h2 class="text-2xl font-black text-blue-600 mt-1 font-mono tracking-tight">
						{formatShortRupiah(data.summary.netCash)}
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">account_balance_wallet</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">
					Masuk: <strong class="text-emerald-600">{formatShortRupiah(data.summary.cashIn)}</strong>
				</span>
				<span class="text-slate-400">
					Keluar: <strong class="text-rose-500">{formatShortRupiah(data.summary.cashOut)}</strong>
				</span>
			</div>
		</div>

		<!-- 4. Piutang Overdue Alert -->
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex items-start justify-between">
				<div>
					<span class="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Jatuh Tempo Terlewat</span>
					<h2 class="text-2xl font-black text-rose-600 mt-1 font-mono tracking-tight">
						{formatShortRupiah(data.summary.overdueAmount)}
					</h2>
				</div>
				<div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-xl">warning</span>
				</div>
			</div>
			<div class="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
				<span class="text-slate-400">
					<strong class="text-rose-600">{data.summary.overdueCount}</strong> Faktur Melewati Tempo
				</span>
				<span class="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold font-mono text-[10px]">
					Perlu Penagihan
				</span>
			</div>
		</div>
	</div>

	<!-- ZONA 2: CONTINUOUS FINANCIAL OPERATIONAL LIFECYCLE PIPELINE STRIP -->
	<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-amber-600 text-lg">timeline</span>
				<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Siklus Keuangan Logistik (Revenue & Billing Flow)</h3>
			</div>
			<span class="text-[11px] font-mono text-slate-400">Hulu Logistik → Hilir Penagihan & Pelunasan</span>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
			<!-- Stage 1: Surat Jalan Selesai (Delivery Notes) -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">1. SURAT JALAN (DN)</span>
					<span class="material-symbols-outlined text-blue-500 text-base">local_shipping</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{data.pipeline.stage1_dn.count} Dokumen
				</p>
				<p class="text-[11px] font-bold text-blue-600 mt-0.5 font-mono">
					{formatShortRupiah(data.pipeline.stage1_dn.amount)}
				</p>
				<p class="text-[10px] text-slate-400 mt-1">Logistik selesai terbit DN</p>
			</div>

			<!-- Stage 2: Draft Invoice -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">2. DRAFT FAKTUR</span>
					<span class="material-symbols-outlined text-amber-500 text-base">edit_document</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{data.pipeline.stage2_draft.count} Faktur
				</p>
				<p class="text-[11px] font-bold text-amber-600 mt-0.5 font-mono">
					{formatShortRupiah(data.pipeline.stage2_draft.amount)}
				</p>
				<p class="text-[10px] text-slate-400 mt-1">Menunggu validasi & pajak</p>
			</div>

			<!-- Stage 3: Piutang Aktif (Posted) -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">3. PIUTANG AKTIF (POSTED)</span>
					<span class="material-symbols-outlined text-emerald-500 text-base">send_money</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{data.pipeline.stage3_posted.count} Faktur
				</p>
				<p class="text-[11px] font-bold text-emerald-600 mt-0.5 font-mono">
					{formatShortRupiah(data.pipeline.stage3_posted.amount)}
				</p>
				<p class="text-[10px] text-slate-400 mt-1">Tagihan terkirim ke klien</p>
			</div>

			<!-- Stage 4: Kasir & Rekonsiliasi -->
			<div class="p-3.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70 relative">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-mono font-bold text-slate-400">4. SETTLEMENT & KASIR</span>
					<span class="material-symbols-outlined text-purple-500 text-base">check_circle</span>
				</div>
				<p class="text-base font-black text-on-surface mt-1 font-mono">
					{data.summary.totalUjoCount} UJO Settled
				</p>
				<p class="text-[11px] font-bold text-purple-600 mt-0.5 font-mono">
					{formatShortRupiah(data.summary.totalUjoPaid)}
				</p>
				<p class="text-[10px] text-slate-400 mt-1">Arus kas & uang jalan kliring</p>
			</div>
		</div>
	</div>

	<!-- ZONA 3: STRATEGIC FINANCIAL ANALYTICS (12-COLUMN BALANCED GRID) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- 7 Kolom Kiri: Tren Bulanan Faktur vs Perputaran Kas (6 Bulan) -->
		<div class="lg:col-span-7 p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-2">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-blue-600">bar_chart</span>
						<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Tren Faktur Penjualan vs Arus Kas</h3>
					</div>
					<div class="flex items-center gap-3 text-[11px]">
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block"></span>
							<span class="text-slate-400 font-medium">Faktur AR</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
							<span class="text-slate-400 font-medium">Kas Masuk</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block"></span>
							<span class="text-slate-400 font-medium">Kas Keluar</span>
						</div>
					</div>
				</div>
				<p class="text-xs text-on-surface-variant font-medium mb-6">
					Perbandingan nominal faktur penagihan kustomer dan mutasi kas 6 bulan terakhir
				</p>

				<!-- Grafik Batang CSS/SVG -->
				<div class="h-44 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
					{#each data.monthlyTrend as item, idx}
						{@const isSelected = selectedMonthIdx === idx}
						<button
							type="button"
							onclick={() => (selectedMonthIdx = selectedMonthIdx === idx ? null : idx)}
							class="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
						>
							<!-- Tooltip Hover/Select -->
							<div
								class="absolute -top-12 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-[10px] font-mono whitespace-nowrap shadow-lg pointer-events-none transition-all z-20 {isSelected
									? 'opacity-100 scale-100'
									: 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'}"
							>
								<p class="font-bold text-amber-400">{item.period}</p>
								<p>Faktur: {formatShortRupiah(item.invoiceAmount)}</p>
								<p>Masuk: {formatShortRupiah(item.cashIn)} · Keluar: {formatShortRupiah(item.cashOut)}</p>
							</div>

							<!-- Multi-Bar Container -->
							<div class="w-full flex items-end justify-center gap-1 h-32">
								<!-- Bar 1: Invoice Amount (Blue) -->
								<div
									class="w-1/3 rounded-t-md bg-blue-600 transition-all duration-300 group-hover:brightness-110"
									style="height: {Math.max(item.invoicePct, 4)}%"
								></div>
								<!-- Bar 2: Cash In (Emerald) -->
								<div
									class="w-1/3 rounded-t-md bg-emerald-500 transition-all duration-300 group-hover:brightness-110"
									style="height: {Math.max(item.cashInPct, 4)}%"
								></div>
								<!-- Bar 3: Cash Out (Rose) -->
								<div
									class="w-1/3 rounded-t-md bg-rose-400 transition-all duration-300 group-hover:brightness-110"
									style="height: {Math.max(item.cashOutPct, 4)}%"
								></div>
							</div>

							<!-- Month Label -->
							<span class="text-[10px] font-mono font-bold mt-2 text-on-surface-variant group-hover:text-blue-600">
								{item.month}
							</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="mt-4 pt-2 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Klik batang bulan untuk menyorot detail perputaran kas</span>
				<a href="/finance/invoices" class="font-bold text-blue-600 hover:underline">
					Buka Rekap Faktur →
				</a>
			</div>
		</div>

		<!-- 5 Kolom Kanan: AR Aging Schedule (Klasifikasi Usia Piutang) -->
		<div class="lg:col-span-5 p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-2">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-600">pie_chart</span>
						<h3 class="text-sm font-extrabold text-on-surface tracking-tight">Jadwal Usia Piutang (AR Aging)</h3>
					</div>
					<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-mono font-bold text-[10px]">
						{formatShortRupiah(data.aging.totalReceivable)}
					</span>
				</div>
				<p class="text-xs text-on-surface-variant font-medium mb-4">
					Distribusi penagihan faktur kustomer berdasarkan jatuh tempo
				</p>

				<!-- Stacked Progress Bar Usia Piutang -->
				<div class="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex mb-5">
					<div style="width: {data.aging.current.pct}%" class="bg-emerald-500 transition-all" title="Belum Jatuh Tempo"></div>
					<div style="width: {data.aging.days_1_30.pct}%" class="bg-amber-400 transition-all" title="1-30 Hari"></div>
					<div style="width: {data.aging.days_31_60.pct}%" class="bg-orange-500 transition-all" title="31-60 Hari"></div>
					<div style="width: {data.aging.over_60.pct}%" class="bg-rose-500 transition-all" title="> 60 Hari"></div>
				</div>

				<!-- 4 Aging Buckets -->
				<div class="space-y-2.5">
					<!-- Bucket 1: Current -->
					<div class="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50">
						<div class="flex items-center gap-2.5">
							<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
							<div>
								<p class="text-xs font-bold text-on-surface">Belum Jatuh Tempo</p>
								<p class="text-[10px] text-slate-400 font-mono">{data.aging.current.count} Faktur</p>
							</div>
						</div>
						<div class="text-right">
							<p class="text-xs font-black font-mono text-emerald-600">{formatRupiah(data.aging.current.amount)}</p>
							<p class="text-[10px] text-slate-400 font-mono">{data.aging.current.pct}%</p>
						</div>
					</div>

					<!-- Bucket 2: 1-30 Hari -->
					<div class="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50">
						<div class="flex items-center gap-2.5">
							<span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
							<div>
								<p class="text-xs font-bold text-on-surface">1 – 30 Hari Terlewat</p>
								<p class="text-[10px] text-slate-400 font-mono">{data.aging.days_1_30.count} Faktur</p>
							</div>
						</div>
						<div class="text-right">
							<p class="text-xs font-black font-mono text-amber-600">{formatRupiah(data.aging.days_1_30.amount)}</p>
							<p class="text-[10px] text-slate-400 font-mono">{data.aging.days_1_30.pct}%</p>
						</div>
					</div>

					<!-- Bucket 3: 31-60 Hari -->
					<div class="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50">
						<div class="flex items-center gap-2.5">
							<span class="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
							<div>
								<p class="text-xs font-bold text-on-surface">31 – 60 Hari Terlewat</p>
								<p class="text-[10px] text-slate-400 font-mono">{data.aging.days_31_60.count} Faktur</p>
							</div>
						</div>
						<div class="text-right">
							<p class="text-xs font-black font-mono text-orange-600">{formatRupiah(data.aging.days_31_60.amount)}</p>
							<p class="text-[10px] text-slate-400 font-mono">{data.aging.days_31_60.pct}%</p>
						</div>
					</div>

					<!-- Bucket 4: > 60 Hari -->
					<div class="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50">
						<div class="flex items-center gap-2.5">
							<span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
							<div>
								<p class="text-xs font-bold text-rose-600">Kritis (&gt; 60 Hari)</p>
								<p class="text-[10px] text-slate-400 font-mono">{data.aging.over_60.count} Faktur</p>
							</div>
						</div>
						<div class="text-right">
							<p class="text-xs font-black font-mono text-rose-600">{formatRupiah(data.aging.over_60.amount)}</p>
							<p class="text-[10px] text-slate-400 font-mono">{data.aging.over_60.pct}%</p>
						</div>
					</div>
				</div>
			</div>

			<div class="mt-4 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Mitigasi risiko gagal bayar kustomer</span>
				<a href="/finance/invoices" class="font-bold text-emerald-600 hover:underline">
					Kirim Reminder →
				</a>
			</div>
		</div>
	</div>

	<!-- ZONA 4: OPERATIONAL LEDGER & INVOICES (2-COLUMN BALANCED GRID WITH TAB SWITCHERS) -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Card Kiri: Faktur & Tagihan (AR vs AP) -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Segmented Switcher -->
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						{#if activeDocTab === 'invoices'}
							<span class="material-symbols-outlined text-emerald-600 text-xl">receipt_long</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Faktur Penjualan (Piutang AR)</h3>
						{:else}
							<span class="material-symbols-outlined text-amber-600 text-xl">shopping_cart_checkout</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Tagihan Vendor (Hutang AP)</h3>
						{/if}
					</div>

					<!-- Segmented Switcher -->
					<div class="inline-flex items-center p-0.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70">
						<button
							type="button"
							onclick={() => (activeDocTab = 'invoices')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeDocTab === 'invoices'
								? 'bg-emerald-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							AR ({data.recentInvoices.length})
						</button>
						<button
							type="button"
							onclick={() => (activeDocTab = 'bills')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeDocTab === 'bills'
								? 'bg-amber-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							AP ({data.recentBills.length})
						</button>
					</div>
				</div>

				<!-- TAB 1: FAKTUR PENJUALAN (AR) -->
				{#if activeDocTab === 'invoices'}
					<div class="space-y-2.5">
						{#each data.recentInvoices as inv}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-emerald-500/10 text-emerald-600">
										<span class="material-symbols-outlined text-base">receipt</span>
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-xs font-bold text-on-surface truncate">{inv.invoice_number}</span>
											<span class="text-[10px] text-slate-400 font-mono">({formatDate(inv.date)})</span>
										</div>
										<p class="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
											{inv.partner_name || '-'}
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<p class="text-xs font-black font-mono text-on-surface">{formatRupiah(inv.total_amount)}</p>
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 {getStatusBadge(inv.status)}">
										{inv.status}
									</span>
								</div>
							</div>
						{/each}

						{#if data.recentInvoices.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada faktur penjualan.</p>
						{/if}
					</div>

				<!-- TAB 2: TAGIHAN VENDOR (AP) -->
				{:else}
					<div class="space-y-2.5">
						{#each data.recentBills as bill}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-amber-500/10 text-amber-600">
										<span class="material-symbols-outlined text-base">local_mall</span>
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-xs font-bold text-on-surface truncate">{bill.invoice_number}</span>
											<span class="text-[10px] text-slate-400 font-mono">({formatDate(bill.date)})</span>
										</div>
										<p class="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
											Vendor: {bill.partner_name || '-'}
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<p class="text-xs font-black font-mono text-amber-600">{formatRupiah(bill.total_amount)}</p>
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 {getStatusBadge(bill.status)}">
										{bill.status}
									</span>
								</div>
							</div>
						{/each}

						{#if data.recentBills.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada tagihan vendor.</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Action -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Seluruh catatan buku piutang dan tagihan</span>
				<a href={activeDocTab === 'invoices' ? '/finance/invoices' : '/finance/vendor-bills'} class="font-bold text-emerald-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Semua</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>

		<!-- Card Kanan: Rekonsiliasi Kas & Operasional Kasir (Kas/Bank vs UJO Kasir) -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Segmented Switcher -->
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						{#if activePaymentTab === 'bank'}
							<span class="material-symbols-outlined text-blue-600 text-xl">payments</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Riwayat Kas & Bank</h3>
						{:else}
							<span class="material-symbols-outlined text-purple-600 text-xl">point_of_sale</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Uang Jalan Kasir (UJO)</h3>
						{/if}
					</div>

					<!-- Segmented Switcher -->
					<div class="inline-flex items-center p-0.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70">
						<button
							type="button"
							onclick={() => (activePaymentTab = 'bank')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activePaymentTab === 'bank'
								? 'bg-blue-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Kas/Bank ({data.recentPayments.length})
						</button>
						<button
							type="button"
							onclick={() => (activePaymentTab = 'ujo')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activePaymentTab === 'ujo'
								? 'bg-purple-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							UJO ({data.recentUjo.length})
						</button>
					</div>
				</div>

				<!-- TAB 1: KAS & BANK -->
				{#if activePaymentTab === 'bank'}
					<div class="space-y-2.5">
						{#each data.recentPayments as pay}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-blue-500/10 text-blue-600">
										<span class="material-symbols-outlined text-base">credit_card</span>
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-xs font-bold text-on-surface truncate">{pay.payment_number}</span>
											<span class="text-[10px] text-slate-400 font-mono">({formatDate(pay.date)})</span>
										</div>
										<p class="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
											{pay.partner_name || '-'}
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<p class="text-xs font-black font-mono text-emerald-600">{formatRupiah(pay.amount)}</p>
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 {getStatusBadge(pay.status)}">
										{pay.status || 'DONE'}
									</span>
								</div>
							</div>
						{/each}

						{#if data.recentPayments.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada riwayat pembayaran bank.</p>
						{/if}
					</div>

				<!-- TAB 2: UJO OPERASIONAL KASIR -->
				{:else}
					<div class="space-y-2.5">
						{#each data.recentUjo as ujo}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-purple-500/10 text-purple-600">
										<span class="material-symbols-outlined text-base">directions_car</span>
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-xs font-bold text-on-surface truncate">{ujo.driver_name}</span>
											<span class="text-[10px] px-1.5 py-0.2 rounded bg-surface-container font-mono text-slate-400">
												{ujo.unit_no}
											</span>
										</div>
										<p class="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
											SO #{ujo.sales_order_id} · Tgl: {formatDate(ujo.date)}
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<p class="text-xs font-black font-mono text-purple-600">{formatRupiah(ujo.ujo_amount)}</p>
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 {getStatusBadge(ujo.payment_status)}">
										{ujo.payment_status}
									</span>
								</div>
							</div>
						{/each}

						{#if data.recentUjo.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada pencairan UJO.</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Action -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Audit buku kas & serah terima kasir</span>
				<a href="/kasir" class="font-bold text-purple-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Kasir</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>
	</div>
</div>
