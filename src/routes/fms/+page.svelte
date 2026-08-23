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

<div class="flex flex-col h-full space-y-8">
	<!-- Header Section -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">local_shipping</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Fleet Management Overview</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Intelligence Dashboard operasional armada logistik, utilisasi unit, status perbaikan, dan live tracking
			</p>
		</div>
		<div class="flex gap-2.5">
			<a href="/fms/live-map" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors">
				<span class="material-symbols-outlined text-lg">map</span>
				<span>Live GPS Map</span>
			</a>
		</div>
	</header>

	<!-- Metrics Grid (Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Total Vehicles -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Kendaraan</p>
					<h3 class="text-2xl font-black text-on-surface mt-1">{metrics.totalVehicles}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">local_shipping</span>
				</div>
			</div>
			<div class="flex items-center gap-2 mt-2">
				<span class="text-blue-600 dark:text-blue-400 text-xs font-bold">{fleetSummary.dumpTruck} Dump Truck</span>
				<span class="text-on-surface-variant/60 text-xs font-medium">· {fleetSummary.transportation} Trans</span>
			</div>
		</div>

		<!-- Active Fleet -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Armada Aktif</p>
					<h3 class="text-2xl font-black text-blue-600 mt-1">{metrics.activeVehicles}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">directions_car</span>
				</div>
			</div>
			<div class="flex flex-wrap gap-1.5 mt-2">
				<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded-md">🟢 {metrics.availableVehicles} Standby</span>
				<span class="px-2 py-0.5 bg-blue-500/10 text-blue-600 text-[10px] font-bold rounded-md">🔵 {metrics.activeTrips} On Trip</span>
			</div>
		</div>

		<!-- Active Trips -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Trip Berjalan</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">{metrics.activeTrips}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">route</span>
				</div>
			</div>
			<div class="flex flex-wrap gap-1.5 mt-2">
				<span class="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 text-[10px] font-bold rounded-md">🟣 {metrics.loadingTrips} Load</span>
				<span class="px-2 py-0.5 bg-blue-500/10 text-blue-600 text-[10px] font-bold rounded-md">🔵 {metrics.onRouteTrips} Route</span>
			</div>
		</div>

		<!-- Maintenance Alerts -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Perlu Perhatian</p>
					<h3 class="text-2xl font-black text-rose-600 mt-1">{metrics.maintenanceAlerts}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">build</span>
				</div>
			</div>
			<div class="flex items-center gap-1.5 mt-2">
				<span class="px-2 py-0.5 bg-rose-500/10 text-rose-600 text-[10px] font-bold rounded-md">🔴 {metrics.criticalMaintenance} Kritis</span>
				<span class="px-2 py-0.5 bg-orange-500/10 text-orange-600 text-[10px] font-bold rounded-md">🛠️ {metrics.inMaintenance} Servis</span>
			</div>
		</div>
	</div>

	<!-- Middle Section: Asymmetric Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Fleet Utilization Chart -->
		<div class="lg:col-span-2 p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between mb-8">
				<div>
					<h3 class="text-base font-bold text-on-surface tracking-tight">Tren Utilisasi Armada</h3>
					<p class="text-xs text-on-surface-variant mt-0.5">Analisis bulanan penugasan armada vs jumlah pengiriman (2026)</p>
				</div>
				<div class="flex gap-4">
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 rounded-full bg-blue-500"></span>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase">Armada Aktif</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 rounded-full bg-emerald-500"></span>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase">Trips Selesai</span>
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
							
							<div class="absolute -top-10 bg-surface-container-highest text-on-surface px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap shadow-xs">
								Fleet: {item.active} / Trips: {item.trips}
							</div>
						</div>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider group-hover/bar:text-blue-600 transition-colors">{item.month}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Action Required Sidebar -->
		<div class="p-6 rounded-2xl bg-slate-900 text-white shadow-xs flex flex-col justify-between overflow-hidden relative group border border-slate-800">
			<div class="relative z-10 flex-1">
				<h3 class="text-base font-bold mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined text-rose-400">warning</span>
					<span>Perhatian Segera</span>
					{#if alerts.length > 0}
						<span class="ml-auto text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">{alerts.length}</span>
					{/if}
				</h3>
				{#if alerts.length > 0}
					<div class="space-y-3">
						{#each alerts as alert}
							{@const isRose = alert.severity === 'critical' || alert.severity === 'danger'}
							<div class="flex items-start gap-3 bg-white/5 hover:bg-white/10 p-3 rounded-xl backdrop-blur-sm transition-colors cursor-pointer border border-white/5">
								<div class="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5
									{isRose ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}">
									<span class="material-symbols-outlined text-[16px]">{getAlertIcon(alert.type)}</span>
								</div>
								<div class="min-w-0">
									<p class="text-xs font-bold truncate">{alert.unit}</p>
									<p class="text-[10px] font-medium mt-0.5 leading-tight
										{isRose ? 'text-rose-300' : 'text-amber-300'}">
										{alert.message.length > 50 ? alert.message.slice(0, 50) + '…' : alert.message}
									</p>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-xs text-slate-400 italic">Tidak ada alert saat ini</p>
				{/if}
			</div>
			<a href="/fms/vehicles" class="mt-6 bg-white/10 hover:bg-white/20 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs relative z-10 border border-white/10">
				Lihat Seluruh Roster Armada
			</a>
		</div>
	</div>

	<!-- Live Operations Status Grid (8 Categories) -->
	<div>
		<div class="flex items-center gap-2 mb-4">
			<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">hub</span>
			<h2 class="text-base font-bold text-on-surface">Live Operations Status</h2>
		</div>

		<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
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
				<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs text-center hover:bg-surface-container transition-colors cursor-pointer">
					<span class="material-symbols-outlined text-2xl text-{item.color}-500 mb-1 block">{item.icon}</span>
					<p class="text-2xl font-black text-on-surface">{item.count}</p>
					<p class="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">{item.label}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Bottom Grid: Recent Trips & Top Drivers -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Recent Trips -->
		<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h3 class="text-base font-bold text-on-surface tracking-tight">Recent Trips</h3>
					{#if metrics.activeTrips > 0}
						<p class="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">
							{metrics.activeTrips} trip aktif saat ini
						</p>
					{/if}
				</div>
				<a href="/fms/trips" class="text-xs font-bold text-blue-600 cursor-pointer hover:underline">Lihat Semua</a>
			</div>
			<div class="space-y-2.5 flex-1">
				{#if recentTrips && recentTrips.length > 0}
					{#each recentTrips as trip}
						{@const badge = getTripStatusBadge(trip.status)}
						<div class="flex items-center justify-between p-3 bg-surface rounded-xl border border-slate-200/50 dark:border-slate-800/50 hover:bg-surface-container-high transition-colors cursor-pointer group">
							<div class="flex items-center gap-3 min-w-0">
								<div class="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center {getTripIconBg(trip.status)}">
									<span class="material-symbols-outlined text-base">{getTripIcon(trip.status)}</span>
								</div>
								<div class="min-w-0">
									<p class="text-xs font-bold text-on-surface truncate">
										{trip.nomor_unit} → {trip.destination || '-'}
									</p>
									<p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mt-0.5 truncate">
										{trip.driver_nama || '-'}
										{#if trip.cargo} · {trip.cargo}{/if}
									</p>
								</div>
							</div>
							<div class="text-right flex-shrink-0 ml-3">
								<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md {badge.cls}">
									<span class="w-1 h-1 rounded-full {badge.dot}"></span>
									{badge.label}
								</span>
								<p class="text-[10px] text-on-surface-variant font-medium mt-0.5">{trip.tgl_trip}</p>
							</div>
						</div>
					{/each}
				{:else}
					<div class="flex flex-col items-center justify-center py-10 text-on-surface-variant">
						<span class="material-symbols-outlined text-4xl mb-2 opacity-30">receipt_long</span>
						<p class="text-xs font-medium italic">Belum ada data trip</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Top Drivers -->
		<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-base font-bold text-on-surface tracking-tight">Top Drivers</h3>
				<a href="/fms/drivers" class="text-xs font-bold text-blue-600 cursor-pointer hover:underline">Lihat Semua</a>
			</div>
			<div class="space-y-2.5 flex-1">
				{#if topDrivers && topDrivers.length > 0}
					{#each topDrivers as driver, i}
						<div class="flex items-center justify-between p-3 bg-surface rounded-xl border border-slate-200/50 dark:border-slate-800/50 hover:bg-surface-container-high transition-colors cursor-pointer group">
							<div class="flex items-center gap-3">
								<div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-black text-xs">
									{i + 1}
								</div>
								<div>
									<p class="text-xs font-bold text-on-surface">{driver.name}</p>
									<p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mt-0.5">
										{driver.category || '-'} · SIM {driver.simType || '-'}
										{#if driver.totalAssigned > 0} · {driver.totalAssigned} unit{/if}
									</p>
								</div>
							</div>
							<div>
								{#if driver.totalAssigned > 0}
									<span class="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">Aktif</span>
								{:else}
									<span class="text-[10px] font-medium text-on-surface-variant/60">Standby</span>
								{/if}
							</div>
						</div>
					{/each}
				{:else}
					<p class="text-xs text-on-surface-variant italic py-6 text-center">Data driver belum tersedia</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Recent Units Registered Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex flex-col">
		<div class="px-5 py-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 flex-shrink-0">
			<h2 class="text-base font-bold text-on-surface">Unit Terbaru Terdaftar</h2>
			<a href="/fms/vehicles" class="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
				<span class="material-symbols-outlined text-[16px]">arrow_forward</span>
				<span>Lihat Seluruh Armada</span>
			</a>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[520px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3 px-5">Unit</th>
						<th class="py-3 px-5">Tipe & Model</th>
						<th class="py-3 px-5">Business Unit</th>
						<th class="py-3 px-5">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if recentUnits && recentUnits.length > 0}
						{#each recentUnits as unit}
							<tr class="hover:bg-surface-container-low transition-colors">
								<td class="py-3.5 px-5">
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
											<span class="material-symbols-outlined text-[16px]">{getBuIcon(unit.business_unit)}</span>
										</div>
										<p class="text-xs font-bold text-on-surface">{unit.nomor_unit}</p>
									</div>
								</td>
								<td class="py-3.5 px-5">
									<p class="text-xs font-bold text-on-surface">{unit.nama_produk || '—'} {unit.nama_model}</p>
									<p class="text-[10px] text-on-surface-variant font-medium mt-0.5">{unit.nama_tipe}</p>
								</td>
								<td class="py-3.5 px-5">
									<span class="text-[10px] font-bold px-2 py-0.5 rounded-md
										{unit.business_unit === 'DUMP_TRUCK' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}">
										{unit.business_unit === 'DUMP_TRUCK' ? 'Dump Truck' : unit.business_unit === 'OUTSOURCING' ? 'Outsourcing' : 'Transportation'}
									</span>
								</td>
								<td class="py-3.5 px-5">
									{#if unit.is_active}
										<span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
										</span>
									{:else}
										<span class="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[10px] bg-slate-500/10 px-2.5 py-1 rounded-md border border-slate-500/20">
											<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Tidak Aktif
										</span>
									{/if}
								</td>
							</tr>
						{/each}
					{:else}
						<tr><td colspan="4" class="py-12 text-center text-on-surface-variant text-xs italic">Belum ada data unit</td></tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
