<script lang="ts">
	let { data } = $props();
	let metrics = $derived(data.metrics);
	let pipeline = $derived(data.pipeline);
	let contractStats = $derived(data.contractStats);
	let monthlyTrend = $derived(data.monthlyTrend);
	let customerTiers = $derived(data.customerTiers);
	let recentOrders = $derived(data.recentOrders);
	let topCustomers = $derived(data.topCustomers);
	let activeContracts = $derived(data.activeContracts);

	let activeOrderTab = $state<'all' | 'pending'>('all');
	let activeCustomerTab = $state<'top_revenue' | 'contracts'>('top_revenue');

	let displayedOrders = $derived(
		activeOrderTab === 'pending'
			? recentOrders.filter((o: any) => o.status.includes('WAITING') || o.status.includes('PENDING'))
			: recentOrders
	);

	function formatRupiah(val: any) {
		const num = Number(val) || 0;
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(num);
	}

	function formatShortRupiah(val: any) {
		const num = Number(val) || 0;
		if (num >= 1_000_000_000) {
			return `Rp ${(num / 1_000_000_000).toFixed(2).replace('.', ',')} M`;
		}
		if (num >= 1_000_000) {
			return `Rp ${Math.round(num / 1_000_000)} Jt`;
		}
		return formatRupiah(num);
	}

	function getStatusBadge(status: string) {
		const s = (status || '').toUpperCase();
		if (s === 'COMPLETED') return 'emerald';
		if (s === 'READY_TO_DISPATCH') return 'blue';
		if (s === 'DISPATCHED') return 'indigo';
		if (s.includes('WAITING') || s.includes('PENDING')) return 'amber';
		if (s.includes('CANCEL')) return 'rose';
		return 'slate';
	}

	function getTierBadge(tier: string) {
		const t = (tier || '').toUpperCase();
		if (t === 'PLATINUM') return 'text-purple-600 bg-purple-500/10 border-purple-500/20';
		if (t === 'GOLD') return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
		if (t === 'SILVER') return 'text-slate-600 bg-slate-500/10 border-slate-500/20';
		return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
	}
</script>

<svelte:head>
	<title>Marketing & Sales Command Center | ERP BCS</title>
</svelte:head>

<div class="space-y-6 pb-12">
	<!-- 1. Executive Header & Quick Action Buttons -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">campaign</span>
				</div>
				<div>
					<h1 class="text-2xl font-black text-on-surface tracking-tight">Marketing Command Center</h1>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">
						Manajemen Penjualan, Pipeline Kontrak Klien, Pesanan DO & Kinerja Pendapatan PT BCS
					</p>
				</div>
			</div>
		</div>

		<!-- Action Shortcuts -->
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/marketing/orders"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all"
			>
				<span class="material-symbols-outlined text-base">add_shopping_cart</span>
				<span>Buat Pesanan DO</span>
			</a>
			<a
				href="/marketing/pipeline"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base text-rose-600">insights</span>
				<span>Pipeline Deals</span>
			</a>
			<a
				href="/marketing/contracts"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base text-blue-600">history_edu</span>
				<span>Kontrak Proyek</span>
				<span class="px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-600 text-[10px] font-mono font-bold">
					{contractStats.activeContracts}
				</span>
			</a>
			<a
				href="/marketing/customers"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-bold text-xs hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-base text-purple-600">storefront</span>
				<span>Direktori Klien</span>
			</a>
		</div>
	</div>

	<!-- 2. Top Bento KPI Executive Metric Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Total Pelanggan Terdaftar -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-rose-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Total Akun Klien</span>
				<div class="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">storefront</span>
				</div>
			</div>
			<div class="flex items-baseline gap-2">
				<h3 class="text-3xl font-black text-on-surface tracking-tight">{metrics.totalCustomers}</h3>
				<span class="text-xs font-semibold text-on-surface-variant">Klien</span>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				Terdaftar aktif di Master Customer PT BCS
			</p>
		</div>

		<!-- Total Pesanan DO Tercatat -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-blue-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Akumulasi Pesanan DO</span>
				<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">receipt_long</span>
				</div>
			</div>
			<div class="flex items-baseline gap-2">
				<h3 class="text-3xl font-black text-blue-600 tracking-tight">{metrics.totalOrders}</h3>
				<span class="text-xs font-semibold text-slate-400">Order</span>
			</div>
			<div class="flex items-center gap-2 mt-2">
				{#if metrics.pendingOrders > 0}
					<span class="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-mono text-[10px] font-bold">
						{metrics.pendingOrders} Butuh Penetapan UJO / Tarif
					</span>
				{:else}
					<span class="text-xs text-emerald-600 font-medium">Semua order terverifikasi</span>
				{/if}
			</div>
		</div>

		<!-- Total Realisasi Pendapatan Billing -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Realisasi Billing DO</span>
				<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">trending_up</span>
				</div>
			</div>
			<h3 class="text-2xl font-black text-emerald-600 font-mono tracking-tight">{formatRupiah(metrics.revenue)}</h3>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				Tarif Delivery Order terealisasi & terselesaikan
			</p>
		</div>

		<!-- Kontrak & Target Harian -->
		<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden group hover:border-purple-500/40 transition-all">
			<div class="flex items-center justify-between mb-2">
				<span class="font-bold text-on-surface-variant uppercase tracking-wider text-[11px]">Target Kontrak Harian</span>
				<div class="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-xl">contract</span>
				</div>
			</div>
			<div class="flex items-baseline gap-2">
				<h3 class="text-3xl font-black text-purple-600 font-mono tracking-tight">{contractStats.totalTargetTonnage}</h3>
				<span class="text-xs font-semibold text-slate-400">Ton / Hari</span>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-1">
				{contractStats.activeContracts} Kontrak Aktif • {contractStats.totalTargetRitase} Ritase target per hari
			</p>
		</div>
	</div>

	<!-- 3. Commercial Deal & Contract Pipeline Strip (NEW) -->
	<div class="p-5 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-rose-600 text-xl">hub</span>
				<h2 class="text-sm font-black text-on-surface tracking-tight uppercase">
					Commercial Sales & Contract Pipeline
				</h2>
			</div>
			<div class="flex items-center gap-2 text-[11px] font-mono text-on-surface-variant">
				<span>Total Nilai Pipeline:</span>
				<span class="font-black text-rose-600">{formatRupiah(pipeline.totalPipelineValue + contractStats.totalContractValue)}</span>
			</div>
		</div>

		<!-- Continuous Horizontal Pipeline Strip -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
			<!-- Stage 1: Prospek / Lead -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-blue-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">call</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">1. Prospek & Leads</p>
						<p class="text-sm font-black text-on-surface">{pipeline.prospecting} Deals</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-mono font-bold">
					Inbound
				</span>
			</div>

			<!-- Stage 2: Penawaran Harga (Quotation) -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-amber-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">request_quote</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">2. Penawaran Harga</p>
						<p class="text-sm font-black text-on-surface">{pipeline.quotation} Deals</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-mono font-bold">
					Quotation
				</span>
			</div>

			<!-- Stage 3: Negosiasi Kontrak -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-indigo-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">handshake</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">3. Negosiasi Tarif</p>
						<p class="text-sm font-black text-on-surface">{pipeline.negotiation} Deals</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-[10px] font-mono font-bold">
					Review
				</span>
			</div>

			<!-- Stage 4: Kontrak Berjalan / Won -->
			<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between group hover:border-emerald-500/40 transition-all">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-lg">verified</span>
					</div>
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">4. Kontrak Aktif / Won</p>
						<p class="text-sm font-black text-emerald-600">{contractStats.activeContracts} Kontrak ({pipeline.won} Won)</p>
					</div>
				</div>
				<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-mono font-bold">
					Active
				</span>
			</div>
		</div>
	</div>

	<!-- 4. Visual Analytics Zone (Grid 12-col: 8 vs 4) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- Left: Real Monthly Sales Trend (8 Kolom) -->
		<div class="lg:col-span-8 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
					<div>
						<h3 class="text-base font-black text-on-surface tracking-tight">Tren Pendapatan & Pesanan Bulanan (6 Bulan Terakhir)</h3>
						<p class="text-xs text-on-surface-variant font-medium mt-0.5">
							Realisasi volume Delivery Order dan nilai billing yang tercatat di database operasional
						</p>
					</div>

					<!-- Legend -->
					<div class="flex items-center gap-4">
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
							<span class="text-[11px] font-bold text-on-surface-variant">Realisasi Billing</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
							<span class="text-[11px] font-bold text-on-surface-variant">Jumlah Order DO</span>
						</div>
					</div>
				</div>

				<!-- Dual-Bar Chart with Real Data -->
				<div class="h-56 w-full flex items-end justify-between px-2 gap-3 pt-6 border-b border-slate-200 dark:border-slate-800 pb-2">
					{#each monthlyTrend as item}
						<div class="flex flex-col items-center flex-1 gap-2 h-full group cursor-pointer">
							<div class="w-full flex items-end justify-center gap-1.5 h-full relative">
								<!-- Orders Count Label -->
								<span class="absolute -top-6 text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
									{item.orders} DO
								</span>

								<!-- Revenue Bar -->
								<div
									class="w-5 sm:w-8 bg-rose-500/80 group-hover:bg-rose-500 rounded-t-lg transition-all duration-300"
									style="height: {item.revenuePct}%"
								></div>
								<!-- Orders Bar -->
								<div
									class="w-5 sm:w-8 bg-blue-500/80 group-hover:bg-blue-500 rounded-t-lg transition-all duration-300"
									style="height: {item.ordersPct}%"
								></div>

								<!-- Tooltip -->
								<div class="absolute -top-16 bg-slate-900 text-white px-3 py-2 rounded-xl text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-20 space-y-0.5">
									<p class="font-black text-rose-300">{item.month} ({item.period_key})</p>
									<p>Order DO: <span class="font-mono font-bold">{item.orders} Pesanan</span></p>
									<p>Billing: <span class="font-mono font-bold text-emerald-300">{formatRupiah(item.revenueNum)}</span></p>
								</div>
							</div>
							<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-rose-600 transition-colors">
								{item.month}
							</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Footer Context Action -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Tarif DO tersinkronisasi otomatis dari integrasi modul logistik OCS</span>
				<a href="/marketing/reports" class="font-bold text-rose-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Laporan Penjualan Detail</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>

		<!-- Right: Komposisi Tiering Pelanggan (4 Kolom) -->
		<div class="lg:col-span-4 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-4">
					<div>
						<h3 class="text-base font-black text-on-surface tracking-tight">Sebaran Tiering Klien</h3>
						<p class="text-xs text-on-surface-variant font-medium mt-0.5">Klasifikasi Portofolio Pelanggan</p>
					</div>
					<span class="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-mono font-bold">
						{metrics.totalCustomers} Akun
					</span>
				</div>

				<!-- Customer Tier Progress Bars -->
				<div class="space-y-3.5 my-2">
					{#each customerTiers as tier}
						<div class="p-2.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 space-y-1.5">
							<div class="flex items-center justify-between text-xs">
								<div class="flex items-center gap-2">
									<span class="px-1.5 py-0.2 rounded border text-[10px] font-bold {getTierBadge(tier.tier)}">
										{tier.tier}
									</span>
								</div>
								<span class="font-mono font-bold text-on-surface-variant">
									{tier.count} <span class="text-[10px] text-slate-400 font-normal">({tier.percentage}%)</span>
								</span>
							</div>
							<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
								<div
									class="h-full rounded-full transition-all duration-500 {tier.tier === 'Platinum' ? 'bg-purple-500' : tier.tier === 'Gold' ? 'bg-amber-500' : tier.tier === 'Silver' ? 'bg-slate-400' : 'bg-blue-500'}"
									style="width: {tier.percentage}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<a
				href="/marketing/customers"
				class="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container text-center transition-all inline-block mt-4"
			>
				Lihat Direktori Seluruh Pelanggan ({metrics.totalCustomers})
			</a>
		</div>
	</div>

	<!-- 5. Balanced Bottom Operational Section (Grid 12-col: 7 vs 5) -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- Left: Delivery Orders Monitor (7 Kolom) -->
		<div class="lg:col-span-7 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Tab Switcher -->
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-rose-600 text-xl">local_shipping</span>
						<div>
							<h3 class="font-black text-base text-on-surface tracking-tight">Pesanan Delivery Order (DO) Terkini</h3>
							<p class="text-xs text-on-surface-variant font-medium">Monitoring pergerakan pesanan rute logistik aktif</p>
						</div>
					</div>

					<!-- Segmented DO Switcher -->
					<div class="inline-flex items-center p-1 rounded-2xl bg-surface border border-slate-200/70 dark:border-slate-800/70 self-start">
						<button
							type="button"
							onclick={() => (activeOrderTab = 'all')}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeOrderTab === 'all'
								? 'bg-rose-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span>Semua ({recentOrders.length})</span>
						</button>
						<button
							type="button"
							onclick={() => (activeOrderTab = 'pending')}
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeOrderTab === 'pending'
								? 'bg-amber-500 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span>Menunggu UJO ({metrics.pendingOrders})</span>
						</button>
					</div>
				</div>

				<!-- Orders List Cards -->
				<div class="space-y-2.5">
					{#each displayedOrders as order}
						<div class="p-3.5 rounded-2xl bg-surface border border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-rose-500/40 transition-all">
							<div class="flex items-center gap-3 min-w-0">
								<div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
									<span class="material-symbols-outlined text-base">receipt_long</span>
								</div>
								<div class="min-w-0">
									<div class="flex items-center gap-2">
										<p class="text-xs font-black text-on-surface truncate">{order.customer}</p>
										<span class="px-1.5 py-0.2 rounded border text-[10px] font-mono font-bold uppercase tracking-wider text-{getStatusBadge(order.status)}-600 bg-{getStatusBadge(order.status)}-500/10 border-{getStatusBadge(order.status)}-500/20">
											{order.status}
										</span>
									</div>
									<p class="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
										{order.do} • {order.origin} → {order.destination}
									</p>
								</div>
							</div>
							<div class="flex items-center sm:flex-col sm:items-end justify-between text-right shrink-0">
								<span class="text-xs font-mono font-bold text-on-surface">
									{order.created_at || '-'}
								</span>
								<span class="text-[11px] font-mono text-emerald-600 font-bold">
									{formatShortRupiah(order.tariff)}
								</span>
							</div>
						</div>
					{/each}

					{#if displayedOrders.length === 0}
						<div class="p-8 text-center bg-surface rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
							<span class="material-symbols-outlined text-3xl text-emerald-500">task_alt</span>
							<p class="text-xs font-bold text-on-surface mt-2">Tidak Ada Pesanan Tertunda</p>
							<p class="text-[11px] text-slate-400">Semua pesanan DO berada dalam status operasional normal.</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer Link -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Integrasi status DO terhubung dengan modul OCS Dispatch</span>
				<a href="/marketing/orders" class="font-bold text-rose-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Semua Pesanan DO</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>

		<!-- Right: Top Pelanggan & Kontrak Aktif (5 Kolom) -->
		<div class="lg:col-span-5 p-6 sm:p-7 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Header with Tab Switcher -->
				<div class="flex items-center justify-between gap-2 mb-4">
					<div class="flex items-center gap-2">
						{#if activeCustomerTab === 'top_revenue'}
							<span class="material-symbols-outlined text-amber-500 text-xl">star</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Top Klien (Revenue)</h3>
						{:else}
							<span class="material-symbols-outlined text-blue-500 text-xl">contract</span>
							<h3 class="font-black text-base text-on-surface tracking-tight">Kontrak Berjalan</h3>
						{/if}
					</div>

					<!-- Segmented Customer Switcher -->
					<div class="inline-flex items-center p-0.5 rounded-xl bg-surface border border-slate-200/70 dark:border-slate-800/70">
						<button
							type="button"
							onclick={() => (activeCustomerTab = 'top_revenue')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeCustomerTab === 'top_revenue'
								? 'bg-amber-500 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Top Klien
						</button>
						<button
							type="button"
							onclick={() => (activeCustomerTab = 'contracts')}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {activeCustomerTab === 'contracts'
								? 'bg-blue-600 text-white shadow-xs'
								: 'text-on-surface-variant hover:text-on-surface'}"
						>
							Kontrak ({activeContracts.length})
						</button>
					</div>
				</div>

				<!-- TAB 1: TOP REVENUE CUSTOMERS -->
				{#if activeCustomerTab === 'top_revenue'}
					<div class="space-y-2.5">
						{#each topCustomers as cust, i}
							<div class="flex items-center justify-between p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs shrink-0">
										#{i + 1}
									</div>
									<div class="min-w-0">
										<p class="text-xs font-bold text-on-surface truncate">{cust.name}</p>
										<p class="text-[10px] text-slate-400 truncate mt-0.5">
											{cust.orders} Pesanan DO • Tier: <span class="font-bold text-slate-600 dark:text-slate-300">{cust.tier}</span>
										</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<span class="text-xs font-black font-mono text-emerald-600">
										{formatShortRupiah(cust.revenue)}
									</span>
								</div>
							</div>
						{/each}

						{#if topCustomers.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada transaksi pelanggan terdata.</p>
						{/if}
					</div>

				<!-- TAB 2: ACTIVE CONTRACTS -->
				{:else}
					<div class="space-y-2.5">
						{#each activeContracts as c}
							<div class="p-3 rounded-2xl bg-surface hover:bg-surface-container transition-colors">
								<div class="flex items-center justify-between mb-1">
									<span class="font-mono font-bold text-xs text-on-surface truncate max-w-[170px]">{c.id}</span>
									<span class="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-mono font-bold uppercase">
										{c.status}
									</span>
								</div>
								<p class="text-xs font-medium text-slate-400 truncate">{c.customer_name}</p>
								<div class="flex items-center justify-between mt-2 text-[10px] text-on-surface-variant font-mono">
									<span>Target: {c.daily_target_tonnage} Ton / {c.daily_target_ritase} Ritase</span>
									<span class="font-bold text-purple-600">{formatShortRupiah(c.contract_value)}</span>
								</div>
							</div>
						{/each}

						{#if activeContracts.length === 0}
							<p class="text-xs text-slate-400 italic py-6 text-center">Belum ada kontrak aktif.</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Action -->
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Retensi & Kontrak Klien PT BCS</span>
				<a href="/marketing/contracts" class="font-bold text-blue-600 hover:underline inline-flex items-center gap-1">
					<span>Buka Kontrak</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			</div>
		</div>
	</div>
</div>
