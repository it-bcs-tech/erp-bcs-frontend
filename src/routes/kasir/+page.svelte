<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	let { today, cashSummary, pendingUjoRequests, pendingDNSettlements, pendingInvoices, recentTransactions, weeklyChart } = $derived(data);

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
</script>

<svelte:head>
	<title>Kasir Dashboard | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">point_of_sale</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Dashboard Operasional Kasir</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5 flex items-center gap-1.5">
				<span class="material-symbols-outlined text-base">calendar_today</span>
				<span>{today} • Manajemen pencairan UJO supir, klaim ritase surat jalan, dan closing kasir</span>
			</p>
		</div>
		<div class="flex items-center gap-2.5">
			<a href="/kasir/kas-operasional" class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-lowest text-on-surface hover:bg-surface-container text-xs font-bold transition-colors flex items-center gap-2">
				<span class="material-symbols-outlined text-base text-emerald-600 dark:text-emerald-400">account_balance_wallet</span>
				<span>Kas Operasional</span>
			</a>
			<a href="/kasir/ujo" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors">
				<span class="material-symbols-outlined text-base">payments</span>
				<span>Proses UJO</span>
			</a>
		</div>
	</header>

	<!-- Summary Cards (Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Saldo Kas -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-emerald-500/30 flex flex-col justify-between">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Saldo Kas Operasional</span>
				<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">account_balance_wallet</span>
				</div>
			</div>
			<div class="text-2xl font-black {cashSummary.netCash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} font-mono">{formatCurrency(cashSummary.netCash)}</div>
			<a href="/kasir/kas-operasional" class="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-3 flex items-center gap-1 hover:underline">
				<span>Kelola Kas Operasional</span>
				<span class="material-symbols-outlined text-sm">arrow_forward</span>
			</a>
		</div>

		<!-- Drop Dana Masuk -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-emerald-500/30 flex flex-col justify-between">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Drop Dana Masuk</span>
				<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">arrow_downward</span>
				</div>
			</div>
			<div class="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(cashSummary.cashIn)}</div>
			<p class="text-xs text-on-surface-variant mt-3 flex items-center gap-1">
				<span class="material-symbols-outlined text-sm text-emerald-600">verified</span>
				<span>Dari Finance & Topup</span>
			</p>
		</div>

		<!-- Antrean UJO -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-amber-500/30 flex flex-col justify-between">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Antrean UJO (Baru)</span>
				<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">payments</span>
				</div>
			</div>
			<div class="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">{cashSummary.pendingUjo}</div>
			<a href="/kasir/ujo" class="text-xs font-bold text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1 hover:underline">
				<span>Proses Pencairan UJO</span>
				<span class="material-symbols-outlined text-sm">arrow_forward</span>
			</a>
		</div>

		<!-- Antrean Settlement -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-rose-500/30 flex flex-col justify-between">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Antrean Settlement</span>
				<div class="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">assignment_return</span>
				</div>
			</div>
			<div class="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">{cashSummary.pendingDn}</div>
			<a href="/kasir/closing" class="text-xs font-bold text-rose-600 dark:text-rose-400 mt-3 flex items-center gap-1 hover:underline">
				<span>Proses Closing Ritase</span>
				<span class="material-symbols-outlined text-sm">arrow_forward</span>
			</a>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Left Column: Pending UJO Approval & Settlements -->
		<div class="space-y-6">
			<!-- Menunggu Pencairan UJO -->
			<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 overflow-hidden flex flex-col">
				<div class="px-5 py-4 border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between bg-surface-container-low/40">
					<h2 class="text-sm font-bold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg">payments</span>
						<span>Menunggu Pencairan UJO</span>
					</h2>
					<a href="/kasir/ujo" class="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Lihat Semua</a>
				</div>
				<div class="p-4 space-y-3">
					{#if pendingUjoRequests.length === 0}
						<p class="text-center text-xs font-medium text-on-surface-variant py-4">Tidak ada permohonan UJO yang pending.</p>
					{/if}
					{#each pendingUjoRequests as req}
						<div class="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low/50 border border-slate-200/60 dark:border-slate-800/60 hover:bg-surface-container-high transition-colors">
							<div class="flex items-center gap-3">
								<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold flex-shrink-0">
									<span class="material-symbols-outlined text-lg">person</span>
								</div>
								<div>
									<p class="text-sm font-bold text-on-surface">{req.driver}</p>
									<p class="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
										<span class="material-symbols-outlined text-xs">local_shipping</span> {req.unit} · {req.route}
									</p>
									<p class="text-[10px] font-mono text-amber-600 dark:text-amber-400">{req.id}</p>
								</div>
							</div>
							<div class="text-right">
								<p class="text-sm font-black text-on-surface mb-1 font-mono">{formatCurrency(req.amount)}</p>
								<a href="/kasir/ujo" class="inline-block px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">
									Cairkan
								</a>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Pending DN Settlements -->
			<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 overflow-hidden flex flex-col">
				<div class="px-5 py-4 border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between bg-surface-container-low/40">
					<h2 class="text-sm font-bold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-rose-600 dark:text-rose-400 text-lg">assignment_turned_in</span>
						<span>Penyelesaian Ritase (Closing Kasir)</span>
					</h2>
					<a href="/kasir/closing" class="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Lihat Semua</a>
				</div>
				<div class="p-4 space-y-3">
					{#if pendingDNSettlements.length === 0}
						<p class="text-center text-xs font-medium text-on-surface-variant py-4">Tidak ada order yang sedang Closing.</p>
					{/if}
					{#each pendingDNSettlements as settle}
						<div class="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low/50 border border-slate-200/60 dark:border-slate-800/60 hover:bg-surface-container-high transition-colors">
							<div>
								<div class="flex items-center gap-2 mb-0.5">
									<p class="text-sm font-bold text-on-surface font-mono">{settle.id}</p>
									<span class="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">Extra Cost</span>
								</div>
								<p class="text-xs text-on-surface-variant">{settle.customer} · {settle.driver}</p>
								<p class="text-[10px] text-on-surface-variant italic">"{settle.desc || '-'}"</p>
							</div>
							<div class="text-right">
								<p class="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(settle.extraCost)}</p>
								<a href="/kasir/closing" class="inline-block mt-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-rose-600 hover:text-white transition-colors">
									Selesaikan
								</a>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right Column: Chart & Recent Cash Ledger -->
		<div class="space-y-6">
			<!-- Chart Arus Kas Mingguan -->
			<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 p-6">
				<div class="flex items-center justify-between mb-6">
					<h2 class="text-sm font-bold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg">insights</span>
						<span>Arus Kas Mingguan</span>
					</h2>
					<div class="flex items-center gap-4 text-xs font-bold">
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
							<span class="text-on-surface-variant text-[11px]">Pemasukan</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
							<span class="text-on-surface-variant text-[11px]">Pengeluaran</span>
						</div>
					</div>
				</div>

				<div class="h-48 flex items-end justify-between gap-2">
					{#each weeklyChart as w}
						<div class="w-full flex flex-col items-center gap-2 group">
							<div class="w-full flex items-end justify-center gap-1.5 h-32 relative">
								<!-- Bar Cash Out (Red) -->
								<div class="w-1/2 bg-rose-400/80 rounded-t-md group-hover:bg-rose-500 transition-colors relative" style="height: {Math.max((w.cashOut / 80000000) * 100, 4)}%">
									<div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-opacity pointer-events-none">
										{formatCurrency(w.cashOut)}
									</div>
								</div>
								<!-- Bar Cash In (Green) -->
								<div class="w-1/2 bg-emerald-400/80 rounded-t-md group-hover:bg-emerald-500 transition-colors relative" style="height: {Math.max((w.cashIn / 80000000) * 100, 4)}%">
									<div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-opacity pointer-events-none">
										{formatCurrency(w.cashIn)}
									</div>
								</div>
							</div>
							<span class="text-[10px] font-bold text-on-surface-variant uppercase">{w.day}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Recent Cash Ledger Mutations -->
			<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 overflow-hidden flex flex-col">
				<div class="px-5 py-4 border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between bg-surface-container-low/40">
					<h2 class="text-sm font-bold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg">receipt_long</span>
						<span>Mutasi Kas Terakhir</span>
					</h2>
					<a href="/kasir/kas-operasional" class="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Lihat Buku Kas</a>
				</div>
				<div class="p-4 space-y-2.5">
					{#if recentTransactions.length === 0}
						<p class="text-center text-xs font-medium text-on-surface-variant py-4">Belum ada catatan mutasi kas.</p>
					{/if}
					{#each recentTransactions as tx}
						<div class="flex items-center justify-between p-3 rounded-xl bg-surface-container-low/50 border border-slate-200/60 dark:border-slate-800/60 hover:bg-surface-container-high transition-colors">
							<div class="flex items-center gap-2.5">
								<div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0 {tx.direction === 'IN' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}">
									<span class="material-symbols-outlined text-base">
										{tx.direction === 'IN' ? 'arrow_downward' : 'arrow_upward'}
									</span>
								</div>
								<div>
									<p class="text-xs font-bold text-on-surface line-clamp-1">{tx.description}</p>
									<p class="text-[10px] text-on-surface-variant flex items-center gap-1.5 mt-0.5 font-mono">
										<span>{new Date(tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
										{#if tx.ref}<span>· Ref: {tx.ref}</span>{/if}
									</p>
								</div>
							</div>
							<div class="text-right whitespace-nowrap">
								<p class="text-xs font-black font-mono {tx.direction === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
									{tx.direction === 'IN' ? '+' : '-'}{formatCurrency(tx.amount)}
								</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
