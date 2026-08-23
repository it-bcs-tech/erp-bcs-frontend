<script lang="ts">
	// Dashboard data
</script>

<svelte:head>
	<title>Finance Dashboard | Architectural ERP</title>
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
			<button class="bg-surface-container-high hover:bg-surface-container-highest border border-slate-200/60 dark:border-slate-800/60 text-on-surface px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer">
				<span class="material-symbols-outlined text-lg">download</span>
				<span>Export Laporan</span>
			</button>
			<a href="/finance/create-transaction" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors">
				<span class="material-symbols-outlined text-lg">add_circle</span>
				<span>Transaksi Baru</span>
			</a>
		</div>
	</header>

	<!-- Bento Grid for Quick Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Net Profit Card (Emphasis) -->
		<div class="lg:col-span-2 p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex justify-between items-start">
				<div>
					<span class="font-bold text-on-surface-variant uppercase tracking-wider text-xs">Laba Bersih Operasional (YTD)</span>
					<h2 class="text-3xl font-black text-emerald-600 mt-1">Rp 4.281.090.000</h2>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">trending_up</span>
				</div>
			</div>
			<div class="mt-4">
				<div class="flex justify-between text-xs text-on-surface-variant mb-1 font-medium">
					<span>Realisasi Target Anggaran</span>
					<span class="font-bold text-emerald-600">+14.2% YoY</span>
				</div>
				<div class="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
					<div class="bg-emerald-500 h-full w-3/4 rounded-full"></div>
				</div>
			</div>
		</div>

		<!-- Pending Approvals Card -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-amber-600 uppercase tracking-wider">Menunggu Approval</p>
					<h2 class="text-3xl font-black text-amber-600 mt-1">24</h2>
				</div>
				<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">pending_actions</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-2">Total estimasi Rp 142.500.000</p>
		</div>

		<!-- Unpaid Invoices Card -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-rose-600 uppercase tracking-wider">Invoice Belum Lunas</p>
					<h2 class="text-3xl font-black text-rose-600 mt-1">12</h2>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">receipt_long</span>
				</div>
			</div>
			<p class="text-xs text-rose-600 font-bold mt-2">Rp 452.000.000 Jatuh Tempo</p>
		</div>
	</div>

	<!-- Charts and Main Visuals Section -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Cash Flow Chart Container -->
		<div class="lg:col-span-2 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs p-6">
			<div class="flex justify-between items-center mb-6">
				<div>
					<h3 class="text-base font-bold tracking-tight text-on-surface">Analisis Arus Kas Bulanan</h3>
					<p class="text-xs text-on-surface-variant mt-0.5">Perbandingan Pendapatan vs Pengeluaran Operasional (2026)</p>
				</div>
				<div class="flex gap-4">
					<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
						<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Pendapatan
					</span>
					<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
						<span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Biaya/Beban
					</span>
				</div>
			</div>
			<div class="h-56 flex items-end justify-between gap-4">
				{#each [
					{ month: 'Jan', rev: '60%', exp: '40%' },
					{ month: 'Feb', rev: '75%', exp: '45%' },
					{ month: 'Mar', rev: '65%', exp: '55%' },
					{ month: 'Apr', rev: '90%', exp: '30%' },
					{ month: 'May', rev: '80%', exp: '50%' },
					{ month: 'Jun', rev: '85%', exp: '40%' }
				] as item}
					<div class="flex-1 flex flex-col items-center gap-2 h-full group/bar cursor-pointer">
						<div class="w-full flex items-end justify-center gap-1.5 h-full relative">
							<div class="w-4 bg-emerald-500/40 rounded-t-md transition-all duration-300 group-hover/bar:bg-emerald-500" style="height: {item.rev}"></div>
							<div class="w-4 bg-amber-500/40 rounded-t-md transition-all duration-300 group-hover/bar:bg-amber-500" style="height: {item.exp}"></div>
						</div>
						<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider group-hover/bar:text-amber-600 transition-colors">{item.month}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Expense Breakdown Card -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs p-6 flex flex-col justify-between">
			<div>
				<h3 class="text-base font-bold tracking-tight text-on-surface mb-1">Alokasi Beban Usaha</h3>
				<p class="text-xs text-on-surface-variant mb-4">Distribusi pengeluaran armada & operasional</p>
				<div class="space-y-3">
					<div class="p-3 bg-surface rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center">
						<div class="flex items-center gap-2.5">
							<div class="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
							<span class="text-xs font-bold text-on-surface">UJO & BBM Armada</span>
						</div>
						<span class="text-xs font-black text-on-surface font-mono">54%</span>
					</div>
					<div class="p-3 bg-surface rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center">
						<div class="flex items-center gap-2.5">
							<div class="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
							<span class="text-xs font-bold text-on-surface">Maintenance & Sparepart</span>
						</div>
						<span class="text-xs font-black text-on-surface font-mono">26%</span>
					</div>
					<div class="p-3 bg-surface rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center">
						<div class="flex items-center gap-2.5">
							<div class="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
							<span class="text-xs font-bold text-on-surface">Gaji & SDM (Payroll)</span>
						</div>
						<span class="text-xs font-black text-on-surface font-mono">20%</span>
					</div>
				</div>
			</div>
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<span class="text-xs font-bold text-on-surface-variant uppercase">Total Beban</span>
				<span class="text-base font-black text-amber-600 font-mono">Rp 1.450.000.000</span>
			</div>
		</div>
	</div>

	<!-- Recent Transactions Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="px-6 py-4 flex justify-between items-center border-b border-slate-200/60 dark:border-slate-800/60">
			<h3 class="text-base font-bold tracking-tight text-on-surface">Aktivitas Finansial Terkini</h3>
			<a href="/finance/invoices" class="text-amber-600 font-bold text-xs hover:underline">Lihat Buku Besar Lengkap</a>
		</div>
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[800px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Entitas / Deskripsi</th>
						<th class="py-3.5 px-5">Tanggal</th>
						<th class="py-3.5 px-5">Kategori</th>
						<th class="py-3.5 px-5">Status</th>
						<th class="py-3.5 px-5 text-right">Nominal</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					<tr class="hover:bg-surface-container transition-colors cursor-pointer">
						<td class="py-4 px-5">
							<div class="flex items-center gap-3">
								<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">PT</div>
								<div>
									<p class="font-bold text-on-surface">PT Pertamina Retail</p>
									<p class="text-xs text-on-surface-variant">Pembelian BBM Solar Fleet</p>
								</div>
							</div>
						</td>
						<td class="py-4 px-5 text-xs text-on-surface-variant font-medium">12 Agu 2026</td>
						<td class="py-4 px-5">
							<span class="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">BBM Armada</span>
						</td>
						<td class="py-4 px-5">
							<span class="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-xs bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Lunas
							</span>
						</td>
						<td class="py-4 px-5 text-right font-black text-rose-600 font-mono">-Rp 45.000.000</td>
					</tr>
					<tr class="hover:bg-surface-container transition-colors cursor-pointer">
						<td class="py-4 px-5">
							<div class="flex items-center gap-3">
								<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">SM</div>
								<div>
									<p class="font-bold text-on-surface">PT Sinar Mas Logistik</p>
									<p class="text-xs text-on-surface-variant">Pelunasan Invoice DO-2026-0811</p>
								</div>
							</div>
						</td>
						<td class="py-4 px-5 text-xs text-on-surface-variant font-medium">11 Agu 2026</td>
						<td class="py-4 px-5">
							<span class="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">Pendapatan DO</span>
						</td>
						<td class="py-4 px-5">
							<span class="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-xs bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Diterima
							</span>
						</td>
						<td class="py-4 px-5 text-right font-black text-emerald-600 font-mono">+Rp 120.000.000</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</div>
