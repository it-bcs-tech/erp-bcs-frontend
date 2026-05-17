<script lang="ts">
	let { data } = $props();
	const { metrics } = data;
</script>

<svelte:head>
	<title>FMS Dashboard | Architectural ERP</title>
</svelte:head>

<!-- Header Section -->
<header class="mb-10">
	<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Fleet Overview</h1>
	<p class="text-on-surface-variant font-medium text-sm">Strategic Fleet Management Intelligence Dashboard</p>
</header>

<!-- Metrics Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
	<!-- Total Vehicles -->
	<div class="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm hover:scale-[1.02] transition-transform duration-300">
		<div class="flex items-center justify-between mb-4">
			<span class="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Total Vehicles</span>
			<span class="material-symbols-outlined text-blue-500">local_shipping</span>
		</div>
		<p class="text-4xl font-black text-on-surface mb-1">{metrics.totalVehicles}</p>
		<div class="flex items-center gap-2">
			<span class="text-blue-500 text-xs font-bold flex items-center">+5</span>
			<span class="text-on-surface-variant/60 text-[10px] font-medium">new this month</span>
		</div>
	</div>

	<!-- Active Fleet -->
	<div class="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden group">
		<div class="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
		<div class="relative z-10">
			<div class="flex items-center justify-between mb-4">
				<span class="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Active Fleet</span>
				<span class="material-symbols-outlined text-blue-600">directions_car</span>
			</div>
			<p class="text-4xl font-black text-on-surface mb-1">{metrics.activeVehicles}</p>
			<div class="w-full bg-surface-container-high h-1.5 rounded-full mt-4 overflow-hidden">
				<div class="bg-blue-500 h-full rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" style="width: {metrics.fleetUtilization}%"></div>
			</div>
			<p class="text-[10px] font-medium text-on-surface-variant mt-2">{metrics.fleetUtilization}% Utilization</p>
		</div>
	</div>

	<!-- Active Trips -->
	<div class="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm hover:scale-[1.02] transition-transform duration-300">
		<div class="flex items-center justify-between mb-4">
			<span class="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Active Trips</span>
			<span class="material-symbols-outlined text-emerald-500">route</span>
		</div>
		<p class="text-4xl font-black text-on-surface mb-1">{metrics.activeTrips}</p>
		<div class="flex items-center gap-2 mt-2">
			<span class="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full">{metrics.completedTripsToday} Completed Today</span>
		</div>
	</div>

	<!-- Maintenance Alerts -->
	<div class="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm hover:scale-[1.02] transition-transform duration-300">
		<div class="flex items-center justify-between mb-4">
			<span class="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Maintenance Alerts</span>
			<span class="material-symbols-outlined text-rose-500">build</span>
		</div>
		<p class="text-4xl font-black text-on-surface mb-1">{metrics.maintenanceAlerts}</p>
		<div class="flex items-center gap-2 mt-2">
			<span class="text-rose-500 text-xs font-bold flex items-center">{metrics.criticalMaintenance} Critical</span>
		</div>
	</div>
</div>

<!-- Middle Section: Asymmetric Layout -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
	<!-- Fleet Utilization Chart -->
	<div class="lg:col-span-2 bg-surface-container-lowest rounded-[24px] p-8 shadow-sm">
		<div class="flex items-center justify-between mb-8">
			<div>
				<h3 class="text-xl font-bold text-on-surface tracking-tight">Fleet Utilization Trend</h3>
				<p class="text-xs text-on-surface-variant mt-1">Monthly vehicle deployment analysis (2026)</p>
			</div>
			<div class="flex gap-4">
				<div class="flex items-center gap-2">
					<span class="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase">Active</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase">Trips</span>
				</div>
			</div>
		</div>
		
		<!-- Bar Chart -->
		<div class="relative h-64 w-full flex items-end justify-between px-2 gap-4">
			{#each [
				{ month: 'Jan', active: '55%', trips: '40%' },
				{ month: 'Feb', active: '60%', trips: '50%' },
				{ month: 'Mar', active: '65%', trips: '55%' },
				{ month: 'Apr', active: '58%', trips: '48%' },
				{ month: 'May', active: '72%', trips: '65%' },
				{ month: 'Jun', active: '68%', trips: '58%' }
			] as item}
				<div class="flex flex-col items-center flex-1 gap-3 h-full group/bar cursor-pointer">
					<div class="w-full flex items-end justify-center gap-1.5 h-full relative">
						<div class="w-5 bg-blue-500/40 rounded-t-md transition-all duration-300 group-hover/bar:bg-blue-500" style="height: {item.active}"></div>
						<div class="w-5 bg-emerald-500/40 rounded-t-md transition-all duration-300 group-hover/bar:bg-emerald-500" style="height: {item.trips}"></div>
						
						<div class="absolute -top-10 bg-surface-container-highest text-on-surface px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
							Fleet: {item.active} / Trips: {item.trips}
						</div>
					</div>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider group-hover/bar:text-blue-600 transition-colors">{item.month}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Action Required Sidebar -->
	<div class="bg-slate-800 p-8 rounded-[24px] text-white shadow-lg flex flex-col justify-between overflow-hidden relative group">
		<div class="absolute top-0 right-0 w-48 h-48 bg-rose-500/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
		<div class="relative z-10">
			<h3 class="text-xl font-extrabold mb-8 flex items-center gap-2">
				<span class="material-symbols-outlined text-3xl text-rose-400">warning</span>
				Action Required
			</h3>
			<div class="space-y-4">
				<div class="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-3 -mx-3 rounded-xl backdrop-blur-sm transition-colors cursor-pointer">
					<div class="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
						<span class="material-symbols-outlined text-sm">oil_barrel</span>
					</div>
					<div>
						<p class="text-sm font-bold">Truck B 1234 CD</p>
						<p class="text-xs text-rose-300 font-medium mt-0.5">Oil Change Overdue</p>
					</div>
				</div>
				<div class="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-3 -mx-3 rounded-xl backdrop-blur-sm transition-colors cursor-pointer">
					<div class="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
						<span class="material-symbols-outlined text-sm">tire_repair</span>
					</div>
					<div>
						<p class="text-sm font-bold">Van D 5678 EF</p>
						<p class="text-xs text-amber-300 font-medium mt-0.5">Tire Pressure Low</p>
					</div>
				</div>
				<div class="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-3 -mx-3 rounded-xl backdrop-blur-sm transition-colors cursor-pointer">
					<div class="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
						<span class="material-symbols-outlined text-sm">license</span>
					</div>
					<div>
						<p class="text-sm font-bold">Eko Firmansyah</p>
						<p class="text-xs text-amber-300 font-medium mt-0.5">License Expiring Soon</p>
					</div>
				</div>
			</div>
		</div>
		<a href="/fms/maintenance" class="mt-8 bg-white text-slate-900 py-3 px-6 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-sm relative z-10">
			View Maintenance
		</a>
	</div>
</div>

<!-- Bottom Grid: Recent Trips & Top Drivers -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
	<div class="bg-surface-container-lowest rounded-[24px] p-8 shadow-sm">
		<div class="flex items-center justify-between mb-6">
			<h3 class="text-xl font-bold text-on-surface tracking-tight">Recent Trips</h3>
			<a href="/fms/trips" class="text-xs font-bold text-blue-600 cursor-pointer hover:underline px-3 py-1.5 rounded-lg hover:bg-blue-100/30 dark:hover:bg-blue-900/20 transition-colors">View All</a>
		</div>
		<div class="space-y-3">
			<div class="flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer group">
				<div class="flex items-center gap-4">
					<div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
						<span class="material-symbols-outlined text-lg">local_shipping</span>
					</div>
					<div>
						<p class="text-sm font-bold text-on-surface">B 1234 CD → Surabaya</p>
						<p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mt-0.5">Ahmad Subarkah</p>
					</div>
				</div>
				<div class="text-right">
					<span class="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-[10px] font-bold bg-blue-500/10 px-2 py-0.5 rounded-full">
						<span class="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></span> In Transit
					</span>
					<p class="text-[10px] text-on-surface-variant font-medium mt-1">65% • ETA 18:30</p>
				</div>
			</div>
			<div class="flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer group">
				<div class="flex items-center gap-4">
					<div class="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
						<span class="material-symbols-outlined text-lg">check_circle</span>
					</div>
					<div>
						<p class="text-sm font-bold text-on-surface">L 9012 GH → Jakarta</p>
						<p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mt-0.5">Budi Santoso</p>
					</div>
				</div>
				<div class="text-right">
					<span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
						<span class="w-1 h-1 rounded-full bg-emerald-500"></span> Completed
					</span>
					<p class="text-[10px] text-on-surface-variant font-medium mt-1">Yesterday 16:00</p>
				</div>
			</div>
			<div class="flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer group">
				<div class="flex items-center gap-4">
					<div class="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
						<span class="material-symbols-outlined text-lg">warning</span>
					</div>
					<div>
						<p class="text-sm font-bold text-on-surface">F 7890 KL → Cirebon</p>
						<p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mt-0.5">Eko Firmansyah</p>
					</div>
				</div>
				<div class="text-right">
					<span class="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 text-[10px] font-bold bg-rose-500/10 px-2 py-0.5 rounded-full">
						<span class="w-1 h-1 rounded-full bg-rose-500"></span> Delayed
					</span>
					<p class="text-[10px] text-on-surface-variant font-medium mt-1">25% • ETA 12:00</p>
				</div>
			</div>
		</div>
	</div>

	<div class="bg-surface-container-lowest rounded-[24px] p-8 shadow-sm">
		<div class="flex items-center justify-between mb-6">
			<h3 class="text-xl font-bold text-on-surface tracking-tight">Top Drivers</h3>
			<a href="/fms/drivers" class="text-xs font-bold text-blue-600 cursor-pointer hover:underline px-3 py-1.5 rounded-lg hover:bg-blue-100/30 dark:hover:bg-blue-900/20 transition-colors">View All</a>
		</div>
		<div class="space-y-3">
			{#each [
				{ name: 'Cahyo Wibowo', trips: 312, rating: 4.9, vehicle: 'B 3456 IJ' },
				{ name: 'Ahmad Subarkah', trips: 245, rating: 4.8, vehicle: 'B 1234 CD' },
				{ name: 'Fajar Nugroho', trips: 201, rating: 4.7, vehicle: '-' }
			] as driver, i}
				<div class="flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer group">
					<div class="flex items-center gap-4">
						<div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-black text-sm group-hover:scale-110 transition-transform border-2 {i === 0 ? 'border-amber-400' : 'border-transparent'}">
							{i + 1}
						</div>
						<div>
							<p class="text-sm font-bold text-on-surface">{driver.name}</p>
							<p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mt-0.5">{driver.trips} trips • {driver.vehicle !== '-' ? driver.vehicle : 'Available'}</p>
						</div>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="material-symbols-outlined text-[16px] text-amber-500">star</span>
						<span class="text-sm font-black text-on-surface">{driver.rating}</span>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
