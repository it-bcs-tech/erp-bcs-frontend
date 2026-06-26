<script lang="ts">
	let { data } = $props();
	const metrics      = $derived(data.metrics);
	const fleetSummary = $derived(data.fleetSummary);
	const alerts       = $derived(data.alerts);
	const liveUnits    = $derived(data.liveUnits);
	const topDrivers   = $derived(data.topDrivers);
	const recentTrips  = $derived(data.recentTrips);
	const recentUnits  = $derived(data.recentUnits);

	function getAlertSeverityClass(severity: string) {
		switch(severity) {
			case 'critical': return 'text-rose-600 bg-rose-500/10 border-rose-500/20';
			case 'danger':   return 'text-orange-600 bg-orange-500/10 border-orange-500/20';
			case 'warning':  return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
			default:         return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
		}
	}

	function getAlertIcon(type: string) {
		switch(type) {
			case 'Maintenance': return 'build';
			case 'Asuransi':    return 'policy';
			case 'Geofence':    return 'fence';
			case 'Speed':       return 'speed';
			default:            return 'warning';
		}
	}

	function getBuIcon(bu: string) {
		if (bu === 'DUMP_TRUCK') return 'construction';
		if (bu === 'OUTSOURCING') return 'handshake';
		return 'local_shipping';
	}

	function getTripStatusBadge(status: string) {
		switch(status) {
			case 'AT_ORIGIN':   return { cls: 'text-indigo-600 bg-indigo-500/10', dot: 'bg-indigo-500 animate-pulse', label: 'Loading at Origin' };
			case 'ON_ROUTE':  return { cls: 'text-blue-600 bg-blue-500/10', dot: 'bg-blue-500 animate-pulse', label: 'On Route' };
			case 'AT_DESTINATION':   return { cls: 'text-indigo-600 bg-indigo-500/10', dot: 'bg-indigo-500 animate-pulse', label: 'Unloading' };
			case 'RETURNING':  return { cls: 'text-blue-600 bg-blue-500/10', dot: 'bg-blue-500 animate-pulse', label: 'Returning' };
			case 'COMPLETED':     return { cls: 'text-emerald-600 bg-emerald-500/10', dot: 'bg-emerald-500', label: 'Completed' };
			case 'CANCELLED': return { cls: 'text-rose-600 bg-rose-500/10',   dot: 'bg-rose-500',   label: 'Dibatalkan' };
			default:          return { cls: 'text-slate-600 bg-slate-500/10',  dot: 'bg-slate-400',  label: status };
		}
	}

	function getTripIcon(status: string) {
		switch (status) {
			case 'AT_ORIGIN':   return 'forklift';
			case 'ON_ROUTE':  return 'local_shipping';
			case 'AT_DESTINATION': return 'forklift';
			case 'RETURNING': return 'local_shipping';
			case 'COMPLETED':      return 'check_circle';
			case 'CANCELLED': return 'cancel';
			default:          return 'receipt_long';
		}
	}

	function getTripIconBg(status: string) {
		switch (status) {
			case 'AT_ORIGIN':   return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400';
			case 'ON_ROUTE':  return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
			case 'AT_DESTINATION':   return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400';
			case 'RETURNING':  return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
			case 'COMPLETED':      return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
			case 'CANCELLED': return 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400';
			default:          return 'bg-slate-100 dark:bg-slate-800 text-slate-600';
		}
	}
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
			<span class="text-blue-500 text-xs font-bold">{fleetSummary.dumpTruck} DT</span>
			<span class="text-on-surface-variant/60 text-[10px] font-medium">· {fleetSummary.transportation} Trans</span>
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
			<div class="flex flex-wrap gap-2 mt-3">
				<span class="px-2 py-0.5 bg-emerald-100/50 text-emerald-700 text-[10px] font-bold rounded-md" title="Available di Pool">🟢 {metrics.availableVehicles} Available</span>
				<span class="px-2 py-0.5 bg-blue-100/50 text-blue-700 text-[10px] font-bold rounded-md">🔵 {metrics.activeTrips} On Trip</span>
				<span class="px-2 py-0.5 bg-orange-100/50 text-orange-700 text-[10px] font-bold rounded-md">🟠 {metrics.inMaintenance} In Maintenance</span>
			</div>
			<div class="w-full bg-surface-container-high h-1 mt-4 rounded-full overflow-hidden">
				<div class="bg-blue-500 h-full rounded-full" style="width: {metrics.fleetUtilization}%"></div>
			</div>
		</div>
	</div>

	<!-- Active Trips -->
	<div class="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm hover:scale-[1.02] transition-transform duration-300">
		<div class="flex items-center justify-between mb-4">
			<span class="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Active Trips</span>
			<span class="material-symbols-outlined text-emerald-500">route</span>
		</div>
		<p class="text-4xl font-black text-on-surface mb-1">{metrics.activeTrips}</p>
		<div class="flex flex-wrap gap-2 mt-3">
			<span class="px-2 py-0.5 bg-indigo-100/50 text-indigo-700 text-[10px] font-bold rounded-md">🟣 {metrics.loadingTrips} Loading</span>
			<span class="px-2 py-0.5 bg-blue-100/50 text-blue-700 text-[10px] font-bold rounded-md">🔵 {metrics.onRouteTrips} On Route</span>
			<span class="px-2 py-0.5 bg-amber-100/50 text-amber-700 text-[10px] font-bold rounded-md">🟡 {metrics.atCustomerTrips} At Customer</span>
			<span class="px-2 py-0.5 bg-slate-100/50 text-slate-700 text-[10px] font-bold rounded-md">⚪️ {metrics.returningTrips} Returning</span>
		</div>
	</div>

	<!-- Maintenance Alerts -->
	<div class="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm hover:scale-[1.02] transition-transform duration-300">
		<div class="flex items-center justify-between mb-4">
			<span class="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Maintenance Alerts</span>
			<span class="material-symbols-outlined text-rose-500">build</span>
		</div>
		<p class="text-4xl font-black text-on-surface mb-1">{metrics.maintenanceAlerts}</p>
		<div class="flex items-center gap-2 mt-3">
			<span class="px-2 py-0.5 bg-rose-100/50 text-rose-700 text-[10px] font-bold rounded-md">🔴 {metrics.criticalMaintenance} Asuransi Expired</span>
			<span class="px-2 py-0.5 bg-orange-100/50 text-orange-700 text-[10px] font-bold rounded-md">🛠️ {metrics.inMaintenance} Sedang Servis</span>
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
			{#each data.trendData || [] as item}
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

	<!-- Action Required Sidebar (data real dari DB) -->
	<div class="bg-slate-800 p-8 rounded-[24px] text-white shadow-lg flex flex-col justify-between overflow-hidden relative group">
		<div class="absolute top-0 right-0 w-48 h-48 bg-rose-500/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
		<div class="relative z-10 flex-1">
			<h3 class="text-xl font-extrabold mb-6 flex items-center gap-2">
				<span class="material-symbols-outlined text-2xl text-rose-400">warning</span>
				Action Required
				{#if alerts.length > 0}
					<span class="ml-auto text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">{alerts.length}</span>
				{/if}
			</h3>
			{#if alerts.length > 0}
				<div class="space-y-3">
					{#each alerts as alert}
						{@const isRose = alert.severity === 'critical' || alert.severity === 'danger'}
						<div class="flex items-start gap-3 bg-white/5 hover:bg-white/10 p-3 -mx-3 rounded-xl backdrop-blur-sm transition-colors cursor-pointer">
							<div class="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5
								{isRose ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}">
								<span class="material-symbols-outlined text-[18px]">{getAlertIcon(alert.type)}</span>
							</div>
							<div class="min-w-0">
								<p class="text-sm font-bold truncate">{alert.unit}</p>
								<p class="text-[10px] font-medium mt-0.5 leading-tight
									{isRose ? 'text-rose-300' : 'text-amber-300'}">
									{alert.message.length > 50 ? alert.message.slice(0, 50) + '…' : alert.message}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-slate-400 italic">Tidak ada alert saat ini</p>
			{/if}
		</div>
		<a href="/fms/vehicles" class="mt-6 bg-white text-slate-900 py-3 px-6 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-sm relative z-10">
			Lihat Fleet Roster
		</a>
	</div>
</div>

<!-- Active Contracts Tonnage Tracker -->
{#if data.activeContracts && data.activeContracts.length > 0}
	<div class="mb-10">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h3 class="text-xl font-bold text-on-surface tracking-tight">Live Contract Tonnage Tracker</h3>
				<p class="text-xs text-on-surface-variant mt-1">Real-time delivery progress for active POs</p>
			</div>
			<a href="/marketing/contracts" class="text-xs font-bold text-blue-600 cursor-pointer hover:underline px-3 py-1.5 rounded-lg hover:bg-blue-100/30 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">open_in_new</span> Lihat di Marketing</a>
		</div>
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			{#each data.activeContracts as contract}
				<div class="bg-surface-container-lowest p-6 sm:p-8 rounded-[24px] shadow-sm border border-surface-container hover:shadow-md transition-shadow hover:scale-[1.02] duration-300">
					<div class="flex justify-between items-start mb-6">
						<div>
							<span class="text-xs font-black tracking-widest uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg mb-3 inline-block border border-indigo-100 dark:border-indigo-900/50">{contract.id}</span>
							<h4 class="text-lg sm:text-xl font-bold text-on-surface mb-1">{contract.customer}</h4>
							<p class="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">{contract.project_category}</p>
						</div>
						<div class="flex flex-col items-end gap-1">
							<span class="text-sm font-black text-on-surface bg-surface-container-low px-3 py-1.5 rounded-lg border border-surface-container shadow-sm">{contract.targetTonnage} T</span>
							{#if contract.isBorongan}
								<span class="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900/50">Target {new Date().toLocaleString('id-ID', { month: 'long' })}</span>
							{/if}
						</div>
					</div>
					
					<!-- The Multi-Color Bar -->
					<div class="w-full h-4 sm:h-5 bg-surface-container-highest rounded-full overflow-hidden mb-5 flex relative shadow-inner">
						<div class="h-full bg-emerald-500 hover:opacity-80 transition-opacity" style="width: {contract.targetTonnage > 0 ? (contract.deliveredTonnage / contract.targetTonnage) * 100 : 0}%" title="Delivered: {contract.deliveredTonnage} Ton"></div>
						<div class="h-full bg-sky-500 hover:opacity-80 transition-opacity" style="width: {contract.targetTonnage > 0 ? (contract.onrouteTonnage / contract.targetTonnage) * 100 : 0}%" title="On Route: {contract.onrouteTonnage} Ton"></div>
						<div class="h-full bg-amber-500 hover:opacity-80 transition-opacity" style="width: {contract.targetTonnage > 0 ? (contract.loadingTonnage / contract.targetTonnage) * 100 : 0}%" title="Loading: {contract.loadingTonnage} Ton"></div>
						<div class="h-full bg-indigo-500 hover:opacity-80 transition-opacity" style="width: {contract.targetTonnage > 0 ? (contract.dispatchedTonnage / contract.targetTonnage) * 100 : 0}%" title="Dispatched: {contract.dispatchedTonnage} Ton"></div>
					</div>
					
					<!-- Legend -->
					<div class="grid grid-cols-2 gap-x-4 gap-y-3">
						<div class="flex items-center justify-between text-xs sm:text-sm">
							<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-emerald-500"></span><span class="text-on-surface-variant font-medium">Delivered</span></div>
							<span class="font-bold text-on-surface">{contract.deliveredTonnage} <span class="font-medium opacity-60">T</span></span>
						</div>
						<div class="flex items-center justify-between text-xs sm:text-sm">
							<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-sky-500"></span><span class="text-on-surface-variant font-medium">On-Route</span></div>
							<span class="font-bold text-on-surface">{contract.onrouteTonnage} <span class="font-medium opacity-60">T</span></span>
						</div>
						<div class="flex items-center justify-between text-xs sm:text-sm">
							<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-amber-500"></span><span class="text-on-surface-variant font-medium">Loading</span></div>
							<span class="font-bold text-on-surface">{contract.loadingTonnage} <span class="font-medium opacity-60">T</span></span>
						</div>
						<div class="flex items-center justify-between text-xs sm:text-sm">
							<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-indigo-500"></span><span class="text-on-surface-variant font-medium">Dispatched</span></div>
							<span class="font-bold text-on-surface">{contract.dispatchedTonnage} <span class="font-medium opacity-60">T</span></span>
						</div>
						<div class="flex items-center justify-between text-xs sm:text-sm col-span-2 pt-2 border-t border-surface-container">
							<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-surface-container-highest border border-surface-container"></span><span class="text-on-surface-variant font-medium">Remaining</span></div>
							<span class="font-bold text-on-surface">{contract.remainingTonnage} <span class="font-medium opacity-60">T</span></span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

<!-- Bottom Grid: Recent Trips & Top Drivers -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
	<!-- Recent Trips (data real dari fleet.trip) -->
	<div class="bg-surface-container-lowest rounded-[24px] p-8 shadow-sm">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h3 class="text-xl font-bold text-on-surface tracking-tight">Recent Trips</h3>
				{#if metrics.activeTrips > 0}
					<p class="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">
						{metrics.activeTrips} trip aktif saat ini
					</p>
				{/if}
			</div>
			<a href="/fms/trips" class="text-xs font-bold text-blue-600 cursor-pointer hover:underline px-3 py-1.5 rounded-lg hover:bg-blue-100/30 dark:hover:bg-blue-900/20 transition-colors">Lihat Semua</a>
		</div>
		<div class="space-y-3">
			{#if recentTrips && recentTrips.length > 0}
				{#each recentTrips as trip}
					{@const badge = getTripStatusBadge(trip.status)}
					<div class="flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer group">
						<div class="flex items-center gap-4 min-w-0">
							<div class="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center group-hover:scale-110 transition-transform {getTripIconBg(trip.status)}">
								<span class="material-symbols-outlined text-lg">{getTripIcon(trip.status)}</span>
							</div>
							<div class="min-w-0">
								<p class="text-sm font-bold text-on-surface truncate">
									{trip.nomor_unit} → {trip.destination || '-'}
								</p>
								<p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mt-0.5 truncate">
									{trip.driver_nama || '-'}
									{#if trip.cargo} · {trip.cargo}{/if}
								</p>
								<p class="text-[10px] text-blue-600 font-bold mt-0.5">{trip.no_surat_tugas}</p>
							</div>
						</div>
						<div class="text-right flex-shrink-0 ml-3">
							<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full {badge.cls}">
								<span class="w-1 h-1 rounded-full {badge.dot}"></span>
								{badge.label}
							</span>
							<p class="text-[10px] text-on-surface-variant font-medium mt-1">{trip.tgl_trip}</p>
						</div>
					</div>
				{/each}
			{:else}
				<div class="flex flex-col items-center justify-center py-10 text-on-surface-variant">
					<span class="material-symbols-outlined text-4xl mb-2 opacity-30">receipt_long</span>
					<p class="text-sm font-medium italic">Belum ada data trip</p>
				</div>
			{/if}
		</div>
	</div>

	<div class="bg-surface-container-lowest rounded-[24px] p-8 shadow-sm">
		<div class="flex items-center justify-between mb-6">
			<h3 class="text-xl font-bold text-on-surface tracking-tight">Top Drivers</h3>
			<a href="/fms/drivers" class="text-xs font-bold text-blue-600 cursor-pointer hover:underline px-3 py-1.5 rounded-lg hover:bg-blue-100/30 dark:hover:bg-blue-900/20 transition-colors">Lihat Semua</a>
		</div>
		<div class="space-y-3">
			{#if topDrivers && topDrivers.length > 0}
				{#each topDrivers as driver, i}
					<div class="flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer group">
						<div class="flex items-center gap-4">
							<div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-black text-sm group-hover:scale-110 transition-transform border-2 {i === 0 ? 'border-amber-400' : 'border-transparent'}">
								{i + 1}
							</div>
							<div>
								<p class="text-sm font-bold text-on-surface">{driver.name}</p>
								<p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mt-0.5">
									{driver.category || '-'} · SIM {driver.simType || '-'}
									{#if driver.totalAssigned > 0} · {driver.totalAssigned} unit{/if}
								</p>
							</div>
						</div>
						<div class="flex items-center gap-1.5">
							{#if driver.totalAssigned > 0}
								<span class="text-xs font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Aktif</span>
							{:else}
								<span class="text-xs font-medium text-on-surface-variant/60">Standby</span>
							{/if}
						</div>
					</div>
				{/each}
			{:else}
				<p class="text-sm text-on-surface-variant italic">Data driver belum tersedia</p>
			{/if}
		</div>
	</div>
</div>

<!-- Command Center Components (Merged) -->
<div class="mt-10 mb-8 border-t border-surface-container pt-10">
	<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 w-fit mb-6">
		<span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
		<span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Live Operations Center</span>
	</div>

	<!-- Fleet Status Grid: 8 Categories -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
		{#each [
			{ label: 'Available',    count: fleetSummary.available,    color: 'emerald', icon: 'check_circle' },
			{ label: 'Moving',       count: fleetSummary.moving,       color: 'blue',    icon: 'local_shipping' },
			{ label: 'Transit',      count: fleetSummary.transit,      color: 'amber',   icon: 'pause_circle' },
			{ label: 'Loading',      count: fleetSummary.loading,      color: 'indigo',  icon: 'forklift' },
			{ label: 'Maintenance',  count: fleetSummary.maintenance,  color: 'orange',  icon: 'build' },
			{ label: 'Overhaul',     count: fleetSummary.overhaul,     color: 'rose',    icon: 'engineering' },
			{ label: 'Accident',     count: fleetSummary.accident,     color: 'red',     icon: 'car_crash' },
			{ label: 'On DO',        count: fleetSummary.onDO,         color: 'violet',  icon: 'receipt_long' },
		] as item}
			<div class="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-surface-container hover:scale-[1.03] transition-transform duration-200 cursor-pointer text-center">
				<span class="material-symbols-outlined text-2xl text-{item.color}-500 mb-1 block">{item.icon}</span>
				<p class="text-3xl font-black text-on-surface">{item.count}</p>
				<p class="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">{item.label}</p>
			</div>
		{/each}
	</div>

	<!-- Recent Units (data real dari fleet.unit) -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex flex-col overflow-hidden">
		<div class="px-6 pt-6 pb-4 flex items-center justify-between border-b border-surface-container flex-shrink-0">
			<h2 class="text-lg font-extrabold text-on-surface">Unit Terbaru Terdaftar</h2>
			<a href="/fms/vehicles" class="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
				<span class="material-symbols-outlined text-[16px]">arrow_forward</span>
				Lihat Fleet Roster
			</a>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse min-w-[520px]">
				<thead>
					<tr class="border-b border-surface-container">
						<th class="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Unit</th>
						<th class="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Tipe & Model</th>
						<th class="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Business Unit</th>
						<th class="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#if recentUnits && recentUnits.length > 0}
						{#each recentUnits as unit}
							<tr class="hover:bg-surface-container-low transition-colors">
								<td class="py-4 px-6">
									<div class="flex items-center gap-3">
										<div class="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
											<span class="material-symbols-outlined text-[18px]">{getBuIcon(unit.business_unit)}</span>
										</div>
										<p class="text-sm font-bold text-on-surface">{unit.nomor_unit}</p>
									</div>
								</td>
								<td class="py-4 px-6">
									<p class="text-sm font-semibold text-on-surface">{unit.nama_produk || '—'} {unit.nama_model}</p>
									<p class="text-[10px] text-on-surface-variant font-medium mt-0.5">{unit.nama_tipe}</p>
								</td>
								<td class="py-4 px-6">
									<span class="text-[10px] font-bold px-2 py-0.5 rounded-md
										{unit.business_unit === 'DUMP_TRUCK' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}">
										{unit.business_unit === 'DUMP_TRUCK' ? 'Dump Truck' : unit.business_unit === 'OUTSOURCING' ? 'Outsourcing' : 'Transportation'}
									</span>
								</td>
								<td class="py-4 px-6">
									{#if unit.is_active}
										<span class="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] bg-emerald-100 px-2.5 py-1 rounded-full">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
										</span>
									{:else}
										<span class="inline-flex items-center gap-1.5 text-slate-500 font-bold text-[10px] bg-slate-100 px-2.5 py-1 rounded-full">
											<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Tidak Aktif
										</span>
									{/if}
								</td>
							</tr>
						{/each}
					{:else}
						<tr><td colspan="4" class="py-12 text-center text-on-surface-variant text-sm italic">Belum ada data unit</td></tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
