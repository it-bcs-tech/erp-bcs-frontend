<script lang="ts">
	let { data } = $props();
	const { metrics } = data;

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};
</script>

<svelte:head>
	<title>Marketing Dashboard | Nexus ERP</title>
</svelte:head>

<!-- Header Section -->
<header class="mb-10">
	<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Marketing Overview</h1>
	<p class="text-on-surface-variant font-medium text-sm">Business development, sales pipeline, and customer insights</p>
</header>

<!-- KPI Metrics Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
	<!-- Total Customers -->
	<div class="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm hover:scale-[1.02] transition-transform duration-300">
		<div class="flex items-center justify-between mb-4">
			<span class="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Total Customers</span>
			<span class="material-symbols-outlined text-rose-500">group</span>
		</div>
		<p class="text-4xl font-black text-on-surface mb-1">{metrics.totalCustomers}</p>
		<div class="flex items-center gap-2">
			<span class="text-emerald-500 text-xs font-bold flex items-center">+{metrics.newCustomersThisMonth}</span>
			<span class="text-on-surface-variant/60 text-[10px] font-medium">new this month</span>
		</div>
	</div>

	<!-- Active Customers -->
	<div class="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden group">
		<div class="absolute -right-10 -top-10 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-colors"></div>
		<div class="relative z-10">
			<div class="flex items-center justify-between mb-4">
				<span class="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Active Customers</span>
				<span class="material-symbols-outlined text-rose-600">person_check</span>
			</div>
			<p class="text-4xl font-black text-on-surface mb-1">{metrics.activeCustomers}</p>
			<div class="w-full bg-surface-container-high h-1.5 rounded-full mt-4 overflow-hidden">
				<div class="bg-rose-500 h-full rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]" style="width: {Math.round(metrics.activeCustomers / metrics.totalCustomers * 100)}%"></div>
			</div>
			<p class="text-[10px] font-medium text-on-surface-variant mt-2">{Math.round(metrics.activeCustomers / metrics.totalCustomers * 100)}% Active Rate</p>
		</div>
	</div>

	<!-- Orders This Month -->
	<div class="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm hover:scale-[1.02] transition-transform duration-300">
		<div class="flex items-center justify-between mb-4">
			<span class="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Orders This Month</span>
			<span class="material-symbols-outlined text-blue-500">receipt_long</span>
		</div>
		<p class="text-4xl font-black text-on-surface mb-1">{metrics.ordersThisMonth}</p>
		<div class="flex items-center gap-2 mt-2">
			<span class="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-full">{metrics.pendingOrders} Pending</span>
		</div>
	</div>

	<!-- Revenue -->
	<div class="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm hover:scale-[1.02] transition-transform duration-300">
		<div class="flex items-center justify-between mb-4">
			<span class="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Monthly Revenue</span>
			<span class="material-symbols-outlined text-emerald-500">trending_up</span>
		</div>
		<p class="text-2xl font-black text-on-surface mb-1">{formatCurrency(metrics.revenue)}</p>
		<div class="flex items-center gap-2">
			<span class="text-emerald-500 text-xs font-bold flex items-center gap-0.5">
				<span class="material-symbols-outlined text-[14px]">arrow_upward</span>
				{metrics.revenueGrowth}%
			</span>
			<span class="text-on-surface-variant/60 text-[10px] font-medium">vs last month</span>
		</div>
	</div>
</div>

<!-- Middle Section: Revenue Chart + Top Customers -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
	<!-- Revenue Trend Chart -->
	<div class="lg:col-span-2 bg-surface-container-lowest rounded-[24px] p-8 shadow-sm">
		<div class="flex items-center justify-between mb-8">
			<div>
				<h3 class="text-xl font-bold text-on-surface tracking-tight">Revenue Trend</h3>
				<p class="text-xs text-on-surface-variant mt-1">Monthly revenue performance (2026)</p>
			</div>
			<div class="flex gap-4">
				<div class="flex items-center gap-2">
					<span class="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase">Revenue</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase">Orders</span>
				</div>
			</div>
		</div>
		
		<!-- Bar Chart -->
		<div class="relative h-64 w-full flex items-end justify-between px-2 gap-4">
			{#each [
				{ month: 'Jan', revenue: '45%', orders: '38%' },
				{ month: 'Feb', revenue: '52%', orders: '42%' },
				{ month: 'Mar', revenue: '60%', orders: '55%' },
				{ month: 'Apr', revenue: '55%', orders: '48%' },
				{ month: 'May', revenue: '78%', orders: '70%' },
				{ month: 'Jun', revenue: '72%', orders: '62%' }
			] as item}
				<div class="flex flex-col items-center flex-1 gap-3 h-full group/bar cursor-pointer">
					<div class="w-full flex items-end justify-center gap-1.5 h-full relative">
						<div class="w-5 bg-rose-500/40 rounded-t-md transition-all duration-300 group-hover/bar:bg-rose-500" style="height: {item.revenue}"></div>
						<div class="w-5 bg-blue-500/40 rounded-t-md transition-all duration-300 group-hover/bar:bg-blue-500" style="height: {item.orders}"></div>
						
						<div class="absolute -top-10 bg-surface-container-highest text-on-surface px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
							Revenue: {item.revenue} / Orders: {item.orders}
						</div>
					</div>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider group-hover/bar:text-rose-600 transition-colors">{item.month}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Sales Pipeline -->
	<div class="bg-slate-800 p-8 rounded-[24px] text-white shadow-lg flex flex-col justify-between overflow-hidden relative group">
		<div class="absolute top-0 right-0 w-48 h-48 bg-rose-500/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
		<div class="relative z-10">
			<h3 class="text-xl font-extrabold mb-8 flex items-center gap-2">
				<span class="material-symbols-outlined text-3xl text-rose-400">insights</span>
				Sales Pipeline
			</h3>
			<div class="space-y-4">
				<div class="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-3 -mx-3 rounded-xl backdrop-blur-sm transition-colors cursor-pointer">
					<div class="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
						<span class="material-symbols-outlined text-sm">call</span>
					</div>
					<div class="flex-1">
						<p class="text-sm font-bold">Lead / Prospect</p>
						<div class="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
							<div class="bg-blue-400 h-full rounded-full" style="width: 100%"></div>
						</div>
					</div>
					<span class="text-xl font-black text-blue-400">24</span>
				</div>
				<div class="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-3 -mx-3 rounded-xl backdrop-blur-sm transition-colors cursor-pointer">
					<div class="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
						<span class="material-symbols-outlined text-sm">handshake</span>
					</div>
					<div class="flex-1">
						<p class="text-sm font-bold">Negotiation</p>
						<div class="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
							<div class="bg-amber-400 h-full rounded-full" style="width: 50%"></div>
						</div>
					</div>
					<span class="text-xl font-black text-amber-400">12</span>
				</div>
				<div class="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-3 -mx-3 rounded-xl backdrop-blur-sm transition-colors cursor-pointer">
					<div class="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
						<span class="material-symbols-outlined text-sm">verified</span>
					</div>
					<div class="flex-1">
						<p class="text-sm font-bold">Contracted</p>
						<div class="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
							<div class="bg-emerald-400 h-full rounded-full" style="width: 75%"></div>
						</div>
					</div>
					<span class="text-xl font-black text-emerald-400">64</span>
				</div>
			</div>
		</div>
		<a href="/marketing/customers" class="mt-8 bg-white text-slate-900 py-3 px-6 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-sm relative z-10">
			View All Customers
		</a>
	</div>
</div>

<!-- Bottom Grid: Recent Orders + Top Customers -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
	<div class="bg-surface-container-lowest rounded-[24px] p-8 shadow-sm">
		<div class="flex items-center justify-between mb-6">
			<h3 class="text-xl font-bold text-on-surface tracking-tight">Recent Orders</h3>
			<a href="/marketing/orders" class="text-xs font-bold text-rose-600 cursor-pointer hover:underline px-3 py-1.5 rounded-lg hover:bg-rose-100/30 dark:hover:bg-rose-900/20 transition-colors">View All</a>
		</div>
		<div class="space-y-3">
			{#each [
				{ customer: 'PT Indofood Sukses', do: 'DO-260515001', route: 'Jakarta → Surabaya', status: 'Confirmed', color: 'blue' },
				{ customer: 'PT Unilever Indonesia', do: 'DO-260514008', route: 'Bandung → Semarang', status: 'Completed', color: 'emerald' },
				{ customer: 'PT Mayora Indah', do: 'DO-260515003', route: 'Jakarta → Cirebon', status: 'Pending', color: 'amber' }
			] as order}
				<div class="flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer group">
					<div class="flex items-center gap-4">
						<div class="w-10 h-10 rounded-lg bg-{order.color}-100 dark:bg-{order.color}-900/30 flex items-center justify-center text-{order.color}-600 dark:text-{order.color}-400 group-hover:scale-110 transition-transform">
							<span class="material-symbols-outlined text-lg">receipt_long</span>
						</div>
						<div>
							<p class="text-sm font-bold text-on-surface">{order.customer}</p>
							<p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mt-0.5">{order.do} • {order.route}</p>
						</div>
					</div>
					<div class="text-right">
						{#if order.status === 'Confirmed'}
							<span class="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-[10px] font-bold bg-blue-500/10 px-2 py-0.5 rounded-full">
								<span class="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></span> Confirmed
							</span>
						{:else if order.status === 'Completed'}
							<span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
								<span class="w-1 h-1 rounded-full bg-emerald-500"></span> Completed
							</span>
						{:else}
							<span class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[10px] font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">
								<span class="w-1 h-1 rounded-full bg-amber-500"></span> Pending
							</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="bg-surface-container-lowest rounded-[24px] p-8 shadow-sm">
		<div class="flex items-center justify-between mb-6">
			<h3 class="text-xl font-bold text-on-surface tracking-tight">Top Customers</h3>
			<a href="/marketing/customers" class="text-xs font-bold text-rose-600 cursor-pointer hover:underline px-3 py-1.5 rounded-lg hover:bg-rose-100/30 dark:hover:bg-rose-900/20 transition-colors">View All</a>
		</div>
		<div class="space-y-3">
			{#each [
				{ name: 'PT Indofood Sukses Makmur', orders: 48, revenue: 580000000, tier: 'Platinum' },
				{ name: 'PT Unilever Indonesia', orders: 35, revenue: 420000000, tier: 'Gold' },
				{ name: 'PT Mayora Indah Tbk', orders: 28, revenue: 310000000, tier: 'Gold' }
			] as cust, i}
				<div class="flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer group">
					<div class="flex items-center gap-4">
						<div class="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-700 dark:text-rose-300 font-black text-sm group-hover:scale-110 transition-transform border-2 {i === 0 ? 'border-amber-400' : 'border-transparent'}">
							{i + 1}
						</div>
						<div>
							<p class="text-sm font-bold text-on-surface">{cust.name}</p>
							<p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mt-0.5">{cust.orders} orders • {cust.tier}</p>
						</div>
					</div>
					<div class="flex flex-col items-end">
						<span class="text-sm font-black text-on-surface">{formatCurrency(cust.revenue)}</span>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
