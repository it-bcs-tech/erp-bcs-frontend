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
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">point_of_sale</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Dashboard Operasional Kasir</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5 flex items-center gap-1.5">
				<span class="material-symbols-outlined text-base">calendar_today</span>
				<span>{today} • Manajemen pencairan UJO supir, klaim ritase surat jalan, dan closing kasir</span>
			</p>
		</div>
		<div class="flex items-center gap-3">
			<a href="/kasir/ujo" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors">
				<span class="material-symbols-outlined text-lg">payments</span>
				<span>Proses UJO</span>
			</a>
		</div>
	</header>

	<!-- Summary Cards (Bento) -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total UJO Cair</p>
			<div class="flex items-end justify-between">
				<h3 class="text-xl font-black text-rose-600 font-mono">{formatCurrency(cashSummary.cashOut)}</h3>
				<span class="material-symbols-outlined text-2xl text-rose-500/50">arrow_downward</span>
			</div>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Net Cash Kasir</p>
			<div class="flex items-end justify-between">
				<h3 class="text-xl font-black {cashSummary.netCash >= 0 ? 'text-emerald-600' : 'text-rose-600'} font-mono">{formatCurrency(cashSummary.netCash)}</h3>
				<span class="material-symbols-outlined text-2xl {cashSummary.netCash >= 0 ? 'text-emerald-500/50' : 'text-rose-500/50'}">account_balance</span>
			</div>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-amber-500/20 shadow-xs flex flex-col justify-between">
			<div>
				<p class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Antrean UJO (Baru)</p>
				<div class="flex items-end justify-between">
					<h3 class="text-3xl font-black text-amber-600 font-mono">{cashSummary.pendingUjo}</h3>
					<span class="material-symbols-outlined text-3xl text-amber-500/40">payments</span>
				</div>
			</div>
			<a href="/kasir/ujo" class="text-xs font-bold text-amber-600 mt-2 flex items-center gap-1 hover:underline">
				<span>Proses Pencairan</span>
				<span class="material-symbols-outlined text-sm">arrow_forward</span>
			</a>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-rose-500/20 shadow-xs flex flex-col justify-between">
			<div>
				<p class="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Antrean Settlement</p>
				<div class="flex items-end justify-between">
					<h3 class="text-3xl font-black text-rose-600 font-mono">{cashSummary.pendingDn}</h3>
					<span class="material-symbols-outlined text-3xl text-rose-500/40">assignment_return</span>
				</div>
			</div>
			<a href="/kasir/closing" class="text-xs font-bold text-rose-600 mt-2 flex items-center gap-1 hover:underline">
				<span>Proses Closing</span>
				<span class="material-symbols-outlined text-sm">arrow_forward</span>
			</a>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Left Column: Pending UJO Approval -->
		<div class="space-y-6">
			<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col overflow-hidden">
				<div class="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
					<h2 class="text-sm font-bold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-600 text-lg">payments</span>
						<span>Menunggu Pencairan UJO</span>
					</h2>
					<a href="/kasir/ujo" class="text-xs font-bold text-amber-600 hover:underline">Lihat Semua</a>
				</div>
				<div class="p-4 space-y-3">
					{#if pendingUjoRequests.length === 0}
						<p class="text-center text-xs font-medium text-on-surface-variant py-4">Tidak ada permohonan UJO yang pending.</p>
					{/if}
					{#each pendingUjoRequests as req}
						<div class="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-slate-200/60 dark:border-slate-800/60 hover:bg-surface-container-high transition-colors">
							<div class="flex items-center gap-3">
								<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
									<span class="material-symbols-outlined text-lg">person</span>
								</div>
								<div>
									<p class="text-sm font-bold text-on-surface">{req.driver}</p>
									<p class="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
										<span class="material-symbols-outlined text-xs">local_shipping</span> {req.unit} · {req.route}
									</p>
									<p class="text-[10px] font-mono text-amber-600">{req.id}</p>
								</div>
							</div>
							<div class="text-right">
								<p class="text-sm font-black text-on-surface mb-1 font-mono">{formatCurrency(req.amount)}</p>
								<a href="/kasir/ujo" class="inline-block px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors shadow-xs">
									Cairkan
								</a>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Pending DN Settlements -->
			<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col overflow-hidden">
				<div class="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
					<h2 class="text-sm font-bold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-rose-600 text-lg">assignment_turned_in</span>
						<span>Penyelesaian Ritase (Closing Kasir)</span>
					</h2>
					<a href="/kasir/closing" class="text-xs font-bold text-rose-600 hover:underline">Lihat Semua</a>
				</div>
				<div class="p-4 space-y-3">
					{#if pendingDNSettlements.length === 0}
						<p class="text-center text-xs font-medium text-on-surface-variant py-4">Tidak ada order yang sedang Closing.</p>
					{/if}
					{#each pendingDNSettlements as settle}
						<div class="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-slate-200/60 dark:border-slate-800/60 hover:bg-surface-container-high transition-colors">
							<div>
								<div class="flex items-center gap-2 mb-0.5">
									<p class="text-sm font-bold text-on-surface font-mono">{settle.id}</p>
									<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20">Extra Cost</span>
								</div>
								<p class="text-xs text-on-surface-variant">{settle.customer} · {settle.driver}</p>
								<p class="text-[10px] text-on-surface-variant italic">"{settle.desc || '-'}"</p>
							</div>
							<div class="text-right">
								<p class="text-sm font-black text-rose-600 font-mono">{formatCurrency(settle.extraCost)}</p>
								<a href="/kasir/closing" class="inline-block mt-1.5 px-3 py-1 bg-surface-container-high text-on-surface text-xs font-bold rounded-lg hover:bg-rose-600 hover:text-white transition-colors shadow-xs">
									Selesaikan
								</a>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right Column: Chart -->
		<div class="space-y-6">
			<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs p-6">
				<h2 class="text-base font-bold text-on-surface mb-6">Arus Kas Mingguan</h2>
				<div class="h-48 flex items-end justify-between gap-2">
					{#each weeklyChart as w}
						<div class="w-full flex flex-col items-center gap-2 group">
							<div class="w-full flex items-end justify-center gap-1 h-32 relative">
								<!-- Bar Cash Out (Red) -->
								<div class="w-1/2 bg-rose-400 rounded-t-sm group-hover:bg-rose-500 transition-colors relative" style="height: {Math.max((w.cashOut / 80000000) * 100, 2)}%">
									<div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-opacity pointer-events-none">
										{formatCurrency(w.cashOut)}
									</div>
								</div>
								<!-- Bar Cash In (Green) -->
								<div class="w-1/2 bg-emerald-400 rounded-t-sm group-hover:bg-emerald-500 transition-colors relative" style="height: {Math.max((w.cashIn / 80000000) * 100, 2)}%">
									<div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-opacity pointer-events-none">
										{formatCurrency(w.cashIn)}
									</div>
								</div>
							</div>
							<span class="text-[10px] font-bold text-on-surface-variant uppercase">{w.day}</span>
						</div>
					{/each}
				</div>
				<div class="flex justify-center gap-6 mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
					<div class="flex items-center gap-2">
						<span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
						<span class="text-xs font-bold text-on-surface-variant">Pemasukan</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
						<span class="text-xs font-bold text-on-surface-variant">Pengeluaran</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
