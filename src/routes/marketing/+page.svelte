<script lang="ts">
	let { data } = $props();
	const { metrics, recentOrders, topCustomers, fleetAvailability } = data;

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};

	function getStatusBadge(status: string) {
		switch(status) {
			case 'COMPLETED': return 'emerald';
			case 'READY_TO_DISPATCH': return 'blue';
			case 'DISPATCHED': return 'indigo';
			case 'WAITING_UJO':
			case 'WAITING_TARIFF':
			case 'WAITING_CUSTOMER': return 'amber';
			default: return 'slate';
		}
	}
</script>

<svelte:head>
	<title>Marketing Dashboard | Nexus ERP</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header Section -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-rose-600 dark:text-rose-400 text-2xl">campaign</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Marketing & Sales Overview</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pemantauan performa bisnis, pipeline prospek klien, pesanan aktif, dan analitik pendapatan
			</p>
		</div>
		<div class="flex gap-3">
			<a href="/marketing/orders" class="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors">
				<span class="material-symbols-outlined text-lg">add_shopping_cart</span>
				<span>Buat Pesanan DO</span>
			</a>
		</div>
	</header>

	<!-- KPI Metrics Grid (Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Total Customers -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<span class="font-bold text-on-surface-variant uppercase tracking-wider text-xs">Total Customers</span>
					<p class="text-3xl font-black text-on-surface mt-1">{metrics.totalCustomers}</p>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">group</span>
				</div>
			</div>
			<div class="flex items-center gap-2 mt-2">
				<span class="text-emerald-600 text-xs font-bold flex items-center">+{metrics.newCustomersThisMonth}</span>
				<span class="text-on-surface-variant text-xs">klien baru bulan ini</span>
			</div>
		</div>

		<!-- Active Customers -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<span class="font-bold text-on-surface-variant uppercase tracking-wider text-xs">Active Customers</span>
					<p class="text-3xl font-black text-on-surface mt-1">{metrics.activeCustomers}</p>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">person_check</span>
				</div>
			</div>
			<div class="w-full bg-surface-container-highest h-1.5 rounded-full mt-3 overflow-hidden">
				<div class="bg-rose-500 h-full rounded-full" style="width: {metrics.totalCustomers > 0 ? Math.round(metrics.activeCustomers / metrics.totalCustomers * 100) : 0}%"></div>
			</div>
			<p class="text-xs text-on-surface-variant font-medium mt-1.5">{metrics.totalCustomers > 0 ? Math.round(metrics.activeCustomers / metrics.totalCustomers * 100) : 0}% Active Rate</p>
		</div>

		<!-- Orders This Month -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<span class="font-bold text-on-surface-variant uppercase tracking-wider text-xs">Orders This Month</span>
					<p class="text-3xl font-black text-on-surface mt-1">{metrics.ordersThisMonth}</p>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">receipt_long</span>
				</div>
			</div>
			<div class="flex items-center gap-2 mt-2">
				<span class="px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold rounded-md">{metrics.pendingOrders} Pending DO</span>
			</div>
		</div>

		<!-- Revenue -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<span class="font-bold text-on-surface-variant uppercase tracking-wider text-xs">Monthly Revenue</span>
					<p class="text-xl font-black text-emerald-600 mt-1">{formatCurrency(metrics.revenue)}</p>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">trending_up</span>
				</div>
			</div>
			<div class="flex items-center gap-1.5 mt-2 text-xs">
				<span class="text-emerald-600 font-bold flex items-center">
					<span class="material-symbols-outlined text-sm">arrow_upward</span>
					{metrics.revenueGrowth}%
				</span>
				<span class="text-on-surface-variant">vs bulan lalu</span>
			</div>
		</div>
	</div>

	<!-- Middle Section: Revenue Chart + Pipeline + Fleet -->
	<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
		<!-- Revenue Trend Chart -->
		<div class="lg:col-span-2 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h3 class="text-base font-bold text-on-surface">Tren Pendapatan & Pesanan</h3>
					<p class="text-xs text-on-surface-variant mt-0.5">Performa bulanan operasional logistik (2026)</p>
				</div>
				<div class="flex gap-4">
					<div class="flex items-center gap-2">
						<span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Revenue</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Orders</span>
					</div>
				</div>
			</div>
			
			<!-- Bar Chart -->
			<div class="relative h-56 w-full flex items-end justify-between px-2 gap-4">
				{#each [
					{ month: 'Jan', revenue: '45%', orders: '38%' },
					{ month: 'Feb', revenue: '52%', orders: '42%' },
					{ month: 'Mar', revenue: '60%', orders: '55%' },
					{ month: 'Apr', revenue: '55%', orders: '48%' },
					{ month: 'May', revenue: '78%', orders: '70%' },
					{ month: 'Jun', revenue: '72%', orders: '62%' }
				] as item}
					<div class="flex flex-col items-center flex-1 gap-2 h-full group/bar cursor-pointer">
						<div class="w-full flex items-end justify-center gap-1.5 h-full relative">
							<div class="w-4 bg-rose-500/30 rounded-t-md transition-all duration-300 group-hover/bar:bg-rose-500" style="height: {item.revenue}"></div>
							<div class="w-4 bg-blue-500/30 rounded-t-md transition-all duration-300 group-hover/bar:bg-blue-500" style="height: {item.orders}"></div>
						</div>
						<span class="text-[11px] font-bold text-on-surface-variant group-hover/bar:text-rose-600 transition-colors">{item.month}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Sales Pipeline -->
		<div class="lg:col-span-1 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs p-6 flex flex-col justify-between">
			<div>
				<h3 class="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined text-rose-600 text-lg">insights</span>
					<span>Sales Pipeline</span>
				</h3>
				<div class="space-y-3">
					<a href="/marketing/pipeline" class="flex items-center gap-3 bg-surface hover:bg-surface-container-high p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 transition-colors">
						<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
							<span class="material-symbols-outlined text-base">call</span>
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-xs font-bold text-on-surface">Lead / Prospect</p>
							<div class="w-full bg-surface-container-highest h-1.5 rounded-full mt-1.5 overflow-hidden">
								<div class="bg-blue-500 h-full rounded-full" style="width: 100%"></div>
							</div>
						</div>
						<span class="text-base font-black text-blue-600 font-mono">{data.pipelineCounts.PROSPECTING}</span>
					</a>
					<a href="/marketing/pipeline" class="flex items-center gap-3 bg-surface hover:bg-surface-container-high p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 transition-colors">
						<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
							<span class="material-symbols-outlined text-base">handshake</span>
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-xs font-bold text-on-surface">Negosiasi & Penawaran</p>
							<div class="w-full bg-surface-container-highest h-1.5 rounded-full mt-1.5 overflow-hidden">
								<div class="bg-amber-500 h-full rounded-full" style="width: 50%"></div>
							</div>
						</div>
						<span class="text-base font-black text-amber-600 font-mono">{data.pipelineCounts.NEGOTIATION + data.pipelineCounts.QUOTATION}</span>
					</a>
					<a href="/marketing/pipeline" class="flex items-center gap-3 bg-surface hover:bg-surface-container-high p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 transition-colors">
						<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
							<span class="material-symbols-outlined text-base">verified</span>
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-xs font-bold text-on-surface">Deal / Kontrak Aktif</p>
							<div class="w-full bg-surface-container-highest h-1.5 rounded-full mt-1.5 overflow-hidden">
								<div class="bg-emerald-500 h-full rounded-full" style="width: 75%"></div>
							</div>
						</div>
						<span class="text-base font-black text-emerald-600 font-mono">{data.pipelineCounts.WON}</span>
					</a>
				</div>
			</div>
			<a href="/marketing/pipeline" class="mt-4 bg-surface hover:bg-surface-container-high text-on-surface border border-slate-200/60 dark:border-slate-800/60 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5">
				<span>Lihat Pipeline Penuh</span>
				<span class="material-symbols-outlined text-sm">arrow_forward</span>
			</a>
		</div>

		<!-- Fleet Availability -->
		<div class="lg:col-span-1 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs p-6 flex flex-col justify-between">
			<div>
				<h3 class="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined text-rose-600 text-lg">local_shipping</span>
					<span>Ketersediaan Armada</span>
				</h3>
				<div class="space-y-2.5">
					<div class="flex items-center justify-between bg-surface p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
						<div class="flex items-center gap-2.5">
							<div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
							<span class="text-xs font-bold text-on-surface">Standby (Siap Muat)</span>
						</div>
						<span class="text-base font-black text-emerald-600 font-mono">{fleetAvailability.available}</span>
					</div>
					<div class="flex items-center justify-between bg-surface p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
						<div class="flex items-center gap-2.5">
							<div class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
							<span class="text-xs font-bold text-on-surface">Jalan (In Transit)</span>
						</div>
						<span class="text-base font-black text-blue-600 font-mono">{fleetAvailability.moving}</span>
					</div>
					<div class="flex items-center justify-between bg-surface p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
						<div class="flex items-center gap-2.5">
							<div class="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
							<span class="text-xs font-bold text-on-surface">Maintenance</span>
						</div>
						<span class="text-base font-black text-rose-600 font-mono">{fleetAvailability.maintenance}</span>
					</div>
				</div>
			</div>
			
			<div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-end justify-between">
				<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Armada</p>
				<p class="text-2xl font-black text-on-surface">{fleetAvailability.total}</p>
			</div>
		</div>
	</div>

	<!-- Bottom Grid: Recent Orders + Top Customers -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-base font-bold text-on-surface">Pesanan DO Terbaru</h3>
				<a href="/marketing/orders" class="text-xs font-bold text-rose-600 hover:underline">Lihat Semua DO</a>
			</div>
			<div class="space-y-3">
				{#if recentOrders.length === 0}
					<p class="text-xs text-on-surface-variant p-4 text-center">Belum ada pesanan aktif.</p>
				{/if}
				{#each recentOrders as order}
					<div class="flex items-center justify-between p-3.5 bg-surface rounded-xl border border-slate-200/60 dark:border-slate-800/60 hover:bg-surface-container-high transition-colors">
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold flex-shrink-0">
								<span class="material-symbols-outlined text-lg">receipt_long</span>
							</div>
							<div>
								<p class="text-sm font-bold text-on-surface">{order.customer}</p>
								<p class="text-[11px] text-on-surface-variant font-medium mt-0.5 font-mono">{order.do} • {order.origin} → {order.destination}</p>
							</div>
						</div>
						<div class="text-right">
							<span class="inline-flex items-center gap-1 text-{getStatusBadge(order.status)}-600 text-[10px] font-bold bg-{getStatusBadge(order.status)}-500/10 border border-{getStatusBadge(order.status)}-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
								{order.status}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-base font-bold text-on-surface">Top Customers</h3>
				<a href="/marketing/customers" class="text-xs font-bold text-rose-600 hover:underline">Lihat Semua Customer</a>
			</div>
			<div class="space-y-3">
				{#if topCustomers.length === 0}
					<p class="text-xs text-on-surface-variant p-4 text-center">Belum ada data customer teratas.</p>
				{/if}
				{#each topCustomers as cust, i}
					<div class="flex items-center justify-between p-3.5 bg-surface rounded-xl border border-slate-200/60 dark:border-slate-800/60 hover:bg-surface-container-high transition-colors">
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-black text-xs flex-shrink-0">
								#{i + 1}
							</div>
							<div>
								<p class="text-sm font-bold text-on-surface">{cust.name}</p>
								<p class="text-[11px] text-on-surface-variant font-medium mt-0.5">{cust.orders} pesanan • {cust.tier}</p>
							</div>
						</div>
						<div class="flex flex-col items-end">
							<span class="text-sm font-black text-on-surface font-mono">{formatCurrency(parseFloat(cust.revenue))}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
