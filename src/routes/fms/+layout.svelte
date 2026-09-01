<script lang="ts">
	import { page } from '$app/stores';
	import FaridaChat from '$lib/components/FaridaChat.svelte';

	let { children } = $props();

	function isActive(path: string) {
		if (path === '/fms') {
			return $page.url.pathname === '/fms';
		}
		return $page.url.pathname.startsWith(path);
	}

	const user = $derived($page.data?.user);
	const isAdmin = $derived(
		user && (
			['superadmin', 'administrator', 'superhyperadmin', 'super_admin'].includes(user.role?.toLowerCase()) ||
			user.role?.toLowerCase()?.includes('admin') ||
			user.email === 'superhyperadmin@bcs-logistics.co.id'
		)
	);

	const currentPath = $derived($page.url.pathname);
	const isLaravelConnected = $derived(currentPath.startsWith('/fms/drivers'));
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Flat Standard FMS) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<!-- Branding Header -->
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
					<span class="material-symbols-outlined text-[20px]">local_shipping</span>
				</div>
				<div>
					<p class="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Fleet Management</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">System (FMS)</p>
				</div>
			</div>
		</div>

		<nav class="flex-1 space-y-1">
			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/fms') && $page.url.pathname === '/fms'
					? 'bg-surface-container-highest text-blue-600 dark:text-blue-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/fms"
			>
				<span class="material-symbols-outlined text-[20px]">dashboard</span>
				<span class="text-sm">Overview</span>
			</a>

			<!-- Section: Main & Fleet Units -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Fleet & Units</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/fms/vehicles')
					? 'bg-surface-container-highest text-blue-600 dark:text-blue-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/fms/vehicles"
			>
				<span class="material-symbols-outlined text-[20px]">local_shipping</span>
				<span class="text-sm">Vehicles & Trucks</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/fms/drivers')
					? 'bg-surface-container-highest text-blue-600 dark:text-blue-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/fms/drivers"
			>
				<span class="material-symbols-outlined text-[20px]">badge</span>
				<span class="text-sm">Drivers & SIM</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/fms/trips')
					? 'bg-surface-container-highest text-blue-600 dark:text-blue-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/fms/trips"
			>
				<span class="material-symbols-outlined text-[20px]">route</span>
				<span class="text-sm">Trips & Routes</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/fms/maintenance')
					? 'bg-surface-container-highest text-blue-600 dark:text-blue-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/fms/maintenance"
			>
				<span class="material-symbols-outlined text-[20px]">build</span>
				<span class="text-sm">Maintenance</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/fms/tires')
					? 'bg-surface-container-highest text-blue-600 dark:text-blue-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/fms/tires"
			>
				<span class="material-symbols-outlined text-[20px]">tire_repair</span>
				<span class="text-sm">Tire Management</span>
			</a>

			<!-- Section: Operations & Assets -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Operations & Assets</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/fms/fuel')
					? 'bg-surface-container-highest text-blue-600 dark:text-blue-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/fms/fuel"
			>
				<span class="material-symbols-outlined text-[20px]">local_gas_station</span>
				<span class="text-sm">Fuel Management</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/fms/documents')
					? 'bg-surface-container-highest text-blue-600 dark:text-blue-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/fms/documents"
			>
				<span class="material-symbols-outlined text-[20px]">folder_open</span>
				<span class="text-sm">Fleet Documents</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/fms/incidents')
					? 'bg-surface-container-highest text-blue-600 dark:text-blue-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/fms/incidents"
			>
				<span class="material-symbols-outlined text-[20px]">report_problem</span>
				<span class="text-sm">Incident Logs</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/fms/reports')
					? 'bg-surface-container-highest text-blue-600 dark:text-blue-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/fms/reports"
			>
				<span class="material-symbols-outlined text-[20px]">bar_chart</span>
				<span class="text-sm">Fleet Reports</span>
			</a>

			<!-- Section: Tracking & Telematics -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Tracking & Telematics</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/fms/live-map')
					? 'bg-surface-container-highest text-blue-600 dark:text-blue-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/fms/live-map"
			>
				<span class="material-symbols-outlined text-[20px]">map</span>
				<span class="text-sm">Live GPS Map</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/fms/route-history')
					? 'bg-surface-container-highest text-blue-600 dark:text-blue-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/fms/route-history"
			>
				<span class="material-symbols-outlined text-[20px]">history</span>
				<span class="text-sm">Route Playback</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/fms/rest-area')
					? 'bg-surface-container-highest text-blue-600 dark:text-blue-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/fms/rest-area"
			>
				<span class="material-symbols-outlined text-[20px]">local_cafe</span>
				<span class="text-sm">Rest Areas & Geofence</span>
			</a>
		</nav>
	</aside>

	<!-- Main Content Canvas -->
	<main class="flex-1 h-full overflow-y-auto p-8 bg-surface">
		<div class="max-w-7xl mx-auto space-y-4">
			<!-- Admin-Only Data Source Status Badge -->
			{#if isAdmin}
				<div class="flex items-center justify-between px-4 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs shadow-2xs">
					<div class="flex items-center gap-2 font-medium">
						<span class="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">Mode Admin:</span>
						{#if isLaravelConnected}
							<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
								Backend: Laravel API v1 (Live & Tanpa Fallback)
							</span>
						{:else}
							<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
								<span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
								Data Source: Direct Database (Fleet PostgreSQL + GPS)
							</span>
						{/if}
					</div>
					<div class="text-[10px] text-on-surface-variant font-mono hidden sm:block">
						Role: {user?.role || 'Admin'}
					</div>
				</div>
			{/if}

			{@render children?.()}
		</div>
	</main>

	<!-- FARIDA — AI Monitoring Armada FMS -->
	<FaridaChat />
</div>
