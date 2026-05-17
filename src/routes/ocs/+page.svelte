<script lang="ts">
	let { data } = $props();
	const { fleetSummary, activeAlerts, liveUnits } = data;

	const statusConfig: Record<string, { color: string; icon: string; label: string }> = {
		available: { color: 'emerald', icon: 'check_circle', label: 'Available' },
		moving: { color: 'sky', icon: 'local_shipping', label: 'Moving' },
		transit: { color: 'amber', icon: 'pause_circle', label: 'Transit' },
		loading: { color: 'indigo', icon: 'forklift', label: 'Loading' },
		maintenance: { color: 'orange', icon: 'build', label: 'Maintenance' },
		overhaul: { color: 'rose', icon: 'engineering', label: 'Overhaul' },
		accident: { color: 'red', icon: 'car_crash', label: 'Accident' },
		onDO: { color: 'blue', icon: 'assignment', label: 'On DO' }
	};

	function getSeverityStyle(severity: string) {
		switch(severity) {
			case 'critical': return 'bg-rose-500/10 border-rose-500/30 text-rose-600';
			case 'warning': return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
			default: return 'bg-blue-500/10 border-blue-500/30 text-blue-600';
		}
	}

	function getUnitStatusStyle(status: string) {
		switch(status) {
			case 'Moving': return 'text-sky-600 bg-sky-500/10 border-sky-500/20';
			case 'Transit': return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
			case 'Loading': return 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20';
			case 'Available': return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
			default: return 'text-slate-600 bg-slate-500/10 border-slate-500/20';
		}
	}

	function getStatusDot(status: string) {
		switch(status) {
			case 'Moving': return 'bg-sky-500 animate-pulse';
			case 'Transit': return 'bg-amber-500';
			case 'Loading': return 'bg-indigo-500 animate-pulse';
			case 'Available': return 'bg-emerald-500';
			default: return 'bg-slate-400';
		}
	}
</script>

<svelte:head>
	<title>Command Center | OCS</title>
</svelte:head>

<!-- Header Section -->
<header class="mb-8">
	<div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Command Center</h1>
			<p class="text-on-surface-variant font-medium text-sm">Real-time fleet monitoring, alerts, and operational intelligence</p>
		</div>
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
				<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
				<span class="text-xs font-bold text-emerald-600 uppercase tracking-wider">Live System</span>
			</div>
			<a href="/ocs/live-map" class="bg-sky-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-sky-700 transition-colors">
				<span class="material-symbols-outlined text-lg">map</span>
				Open Live Map
			</a>
		</div>
	</div>
</header>

<!-- Fleet Status Grid -->
<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
	{#each Object.entries(statusConfig) as [key, config]}
		{@const count = fleetSummary[key as keyof typeof fleetSummary]}
		<div class="bg-surface-container-lowest p-4 rounded-2xl shadow-sm hover:scale-[1.03] transition-transform duration-300 cursor-pointer border border-surface-container text-center group">
			<span class="material-symbols-outlined text-2xl text-{config.color}-500 group-hover:scale-110 transition-transform inline-block mb-2">{config.icon}</span>
			<p class="text-2xl font-black text-on-surface">{count}</p>
			<p class="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">{config.label}</p>
		</div>
	{/each}
</div>

<!-- Main Content: Alerts + Live Units -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
	<!-- Active Alerts -->
	<div class="bg-slate-800 p-8 rounded-[24px] text-white shadow-lg flex flex-col overflow-hidden relative group">
		<div class="absolute top-0 right-0 w-48 h-48 bg-rose-500/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
		<div class="relative z-10 flex-1">
			<h3 class="text-xl font-extrabold mb-6 flex items-center gap-2">
				<span class="material-symbols-outlined text-3xl text-rose-400">notifications_active</span>
				Active Alerts
				<span class="ml-auto px-2 py-0.5 text-xs font-black bg-rose-500/30 text-rose-300 rounded-full">{activeAlerts.length}</span>
			</h3>
			<div class="space-y-3">
				{#each activeAlerts as alert}
					<div class="flex items-start gap-3 bg-white/5 hover:bg-white/10 p-3 -mx-3 rounded-xl backdrop-blur-sm transition-colors cursor-pointer">
						<div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 {alert.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' : alert.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}">
							<span class="material-symbols-outlined text-sm">{alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}</span>
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-0.5">
								<span class="text-xs font-black">{alert.unit}</span>
								<span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded {alert.severity === 'critical' ? 'bg-rose-500/30 text-rose-300' : 'bg-amber-500/30 text-amber-300'}">{alert.type}</span>
							</div>
							<p class="text-[11px] text-white/60 font-medium leading-relaxed">{alert.message}</p>
							<p class="text-[10px] text-white/40 mt-1">{alert.time}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Live Unit Tracking Table -->
	<div class="lg:col-span-2 bg-surface-container-lowest rounded-[24px] p-8 shadow-sm flex flex-col">
		<div class="flex items-center justify-between mb-6">
			<h3 class="text-xl font-bold text-on-surface tracking-tight">Live Unit Tracking</h3>
			<a href="/ocs/live-map" class="text-xs font-bold text-sky-600 cursor-pointer hover:underline px-3 py-1.5 rounded-lg hover:bg-sky-100/30 dark:hover:bg-sky-900/20 transition-colors">View on Map</a>
		</div>
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse min-w-[700px]">
				<thead>
					<tr class="border-b border-surface-container">
						<th class="pb-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Unit</th>
						<th class="pb-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Driver</th>
						<th class="pb-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
						<th class="pb-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Route</th>
						<th class="pb-3 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Progress</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container/50">
					{#each liveUnits as unit}
						<tr class="hover:bg-surface-container-low transition-colors group cursor-pointer">
							<td class="py-3 px-2">
								<div class="flex items-center gap-2">
									<div class="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
										<span class="material-symbols-outlined text-[16px]">local_shipping</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{unit.id}</p>
										<p class="text-[9px] text-on-surface-variant font-medium">{unit.do}</p>
									</div>
								</div>
							</td>
							<td class="py-3 px-2">
								<p class="text-sm font-medium text-on-surface">{unit.driver}</p>
								{#if unit.speed > 0}
									<p class="text-[10px] text-sky-600 font-bold mt-0.5">{unit.speed} km/h</p>
								{/if}
							</td>
							<td class="py-3 px-2">
								<span class="inline-flex items-center gap-1.5 font-bold text-[11px] px-2.5 py-1 rounded-md uppercase tracking-wider border {getUnitStatusStyle(unit.status)}">
									<span class="w-1.5 h-1.5 rounded-full {getStatusDot(unit.status)}"></span> {unit.status}
								</span>
							</td>
							<td class="py-3 px-2">
								{#if unit.origin !== '-'}
									<p class="text-sm font-medium text-on-surface">{unit.origin} → {unit.destination}</p>
								{:else}
									<p class="text-sm text-on-surface-variant">Standby at Pool</p>
								{/if}
							</td>
							<td class="py-3 px-2 w-32">
								{#if unit.progress > 0}
									<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
										<div class="bg-sky-500 h-full rounded-full transition-all" style="width: {unit.progress}%"></div>
									</div>
									<p class="text-[10px] font-bold text-on-surface-variant mt-1">{unit.progress}%</p>
								{:else}
									<span class="text-[10px] font-medium text-on-surface-variant">—</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Bottom Section: Quick Stats -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
	<div class="bg-surface-container-lowest rounded-[24px] p-6 shadow-sm flex items-center gap-5">
		<div class="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 flex-shrink-0">
			<span class="material-symbols-outlined text-3xl">speed</span>
		</div>
		<div>
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Avg. Speed</p>
			<p class="text-2xl font-black text-on-surface">58 <span class="text-sm font-medium text-on-surface-variant">km/h</span></p>
		</div>
	</div>
	<div class="bg-surface-container-lowest rounded-[24px] p-6 shadow-sm flex items-center gap-5">
		<div class="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 flex-shrink-0">
			<span class="material-symbols-outlined text-3xl">check_circle</span>
		</div>
		<div>
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Deliveries Today</p>
			<p class="text-2xl font-black text-on-surface">18 <span class="text-sm font-medium text-on-surface-variant">completed</span></p>
		</div>
	</div>
	<div class="bg-surface-container-lowest rounded-[24px] p-6 shadow-sm flex items-center gap-5">
		<div class="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 flex-shrink-0">
			<span class="material-symbols-outlined text-3xl">distance</span>
		</div>
		<div>
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total KM Today</p>
			<p class="text-2xl font-black text-on-surface">4,280 <span class="text-sm font-medium text-on-surface-variant">km</span></p>
		</div>
	</div>
</div>
