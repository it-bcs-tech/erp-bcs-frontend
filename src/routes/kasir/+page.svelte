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

<div class="flex flex-col h-full pb-8">
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Dashboard Kasir</h1>
			<p class="text-on-surface-variant font-medium text-sm flex items-center gap-2">
				<span class="material-symbols-outlined text-[18px]">calendar_today</span>
				{today}
			</p>
		</div>
		<div class="flex items-center gap-3">
			<button class="bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-4 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-colors">
				<span class="material-symbols-outlined text-[18px]">receipt_long</span> Input Pengeluaran
			</button>
		</div>
	</header>

	<!-- Summary Cards -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-sm">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total UJO Cair (All Time)</p>
			<div class="flex items-end justify-between">
				<h3 class="text-xl font-black text-rose-600">{formatCurrency(cashSummary.cashOut)}</h3>
				<span class="material-symbols-outlined text-2xl text-rose-500/50">arrow_downward</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-sm">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Net Cash (Simulasi)</p>
			<div class="flex items-end justify-between">
				<h3 class="text-xl font-black {cashSummary.netCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}">{formatCurrency(cashSummary.netCash)}</h3>
				<span class="material-symbols-outlined text-2xl {cashSummary.netCash >= 0 ? 'text-emerald-500/50' : 'text-rose-500/50'}">account_balance</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-indigo-500/20 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
			<div class="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent"></div>
			<p class="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 relative z-10">Antrean UJO (Baru)</p>
			<div class="flex items-end justify-between relative z-10">
				<h3 class="text-3xl font-black text-indigo-600">{cashSummary.pendingUjo}</h3>
				<span class="material-symbols-outlined text-3xl text-indigo-500/30">payments</span>
			</div>
			<a href="/kasir/ujo" class="relative z-10 text-[10px] font-bold text-indigo-600 mt-2 flex items-center gap-1 hover:underline">
				Proses UJO <span class="material-symbols-outlined text-[12px]">arrow_forward</span>
			</a>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-rose-500/20 shadow-sm relative overflow-hidden group hover:border-rose-500/40 transition-colors">
			<div class="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent"></div>
			<p class="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 relative z-10">Antrean Settlement (Closing)</p>
			<div class="flex items-end justify-between relative z-10">
				<h3 class="text-3xl font-black text-rose-600">{cashSummary.pendingDn}</h3>
				<span class="material-symbols-outlined text-3xl text-rose-500/30">assignment_return</span>
			</div>
			<a href="/kasir/closing" class="relative z-10 text-[10px] font-bold text-rose-600 mt-2 flex items-center gap-1 hover:underline">
				Proses Closing <span class="material-symbols-outlined text-[12px]">arrow_forward</span>
			</a>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		<!-- Left Column -->
		<div class="space-y-8">
			
			<!-- Pending UJO Approval -->
			<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex flex-col overflow-hidden border border-surface-container">
				<div class="px-6 py-5 border-b border-surface-container flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-900/10">
					<h2 class="text-base font-extrabold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
						<span class="material-symbols-outlined text-[20px]">payments</span>
						Menunggu Pencairan UJO
					</h2>
					<a href="/kasir/ujo" class="text-xs font-bold text-indigo-600 hover:underline">Lihat Semua</a>
				</div>
				<div class="p-4 space-y-3">
					{#if pendingUjoRequests.length === 0}
						<p class="text-center text-sm font-medium text-on-surface-variant py-4">Tidak ada UJO pending.</p>
					{/if}
					{#each pendingUjoRequests as req}
						<div class="flex items-center justify-between p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors group">
							<div class="flex items-center gap-4">
								<div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
									<span class="material-symbols-outlined text-[20px]">account_circle</span>
								</div>
								<div>
									<p class="text-sm font-bold text-on-surface">{req.driver}</p>
									<p class="text-[10px] font-medium text-on-surface-variant flex items-center gap-1">
										<span class="material-symbols-outlined text-[12px]">local_shipping</span> {req.unit} · {req.route}
									</p>
									<p class="text-[10px] font-bold text-indigo-600">{req.id}</p>
								</div>
							</div>
							<div class="text-right">
								<p class="text-sm font-black text-on-surface mb-1">{formatCurrency(req.amount)}</p>
								<a href="/kasir/ujo" class="inline-block px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-md hover:bg-indigo-700 transition-colors shadow-sm">
									Cairkan
								</a>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Pending DN Settlements -->
			<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex flex-col overflow-hidden border border-surface-container">
				<div class="px-6 py-5 border-b border-surface-container flex items-center justify-between bg-rose-50/50 dark:bg-rose-900/10">
					<h2 class="text-base font-extrabold text-rose-700 dark:text-rose-400 flex items-center gap-2">
						<span class="material-symbols-outlined text-[20px]">assignment_turned_in</span>
						Penyelesaian Ritase (Closing)
					</h2>
					<a href="/kasir/closing" class="text-xs font-bold text-rose-600 hover:underline">Lihat Semua</a>
				</div>
				<div class="p-4 space-y-3">
					{#if pendingDNSettlements.length === 0}
						<p class="text-center text-sm font-medium text-on-surface-variant py-4">Tidak ada order yang sedang Closing.</p>
					{/if}
					{#each pendingDNSettlements as settle}
						<div class="flex items-center justify-between p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors">
							<div>
								<div class="flex items-center gap-2 mb-1">
									<p class="text-sm font-bold text-on-surface">{settle.id}</p>
									<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">Extra Cost</span>
								</div>
								<p class="text-[11px] text-on-surface-variant mb-0.5">{settle.customer} · {settle.driver}</p>
								<p class="text-[10px] font-medium text-on-surface-variant italic">"{settle.desc || '-'}"</p>
							</div>
							<div class="text-right">
								<p class="text-sm font-black text-rose-600">{formatCurrency(settle.extraCost)}</p>
								<a href="/kasir/closing" class="inline-block mt-2 px-3 py-1 bg-surface-container-high text-on-surface text-[10px] font-bold rounded-md hover:bg-rose-600 hover:text-white transition-colors shadow-sm">
									Selesaikan
								</a>
							</div>
						</div>
					{/each}
				</div>
			</div>

		</div>

		<!-- Right Column -->
		<div class="space-y-8">
			<!-- Visual Placeholder for Chart -->
			<div class="bg-surface-container-lowest rounded-[24px] shadow-sm p-6 border border-surface-container">
				<h2 class="text-base font-extrabold text-on-surface mb-6">Arus Kas Mingguan</h2>
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
				<div class="flex justify-center gap-6 mt-6 pt-4 border-t border-surface-container">
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 rounded bg-emerald-400"></span>
						<span class="text-[10px] font-bold text-on-surface-variant">Pemasukan</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 rounded bg-rose-400"></span>
						<span class="text-[10px] font-bold text-on-surface-variant">Pengeluaran</span>
					</div>
				</div>
			</div>
			
			<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex flex-col overflow-hidden border border-surface-container opacity-50 grayscale pointer-events-none">
				<div class="px-6 py-5 border-b border-surface-container flex items-center justify-between">
					<h2 class="text-base font-extrabold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-[20px] text-surface-variant">lock</span>
						Riwayat Transaksi Umum (TBD)
					</h2>
				</div>
				<div class="p-6 text-center text-sm font-medium text-on-surface-variant">
					Fitur transaksi keuangan umum belum terintegrasi di prototipe ini.
				</div>
			</div>
		</div>
	</div>
</div>
