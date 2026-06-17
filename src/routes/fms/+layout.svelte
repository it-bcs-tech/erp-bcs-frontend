<script lang="ts">
	import { page } from '$app/stores';
	import FaridaChat from '$lib/components/FaridaChat.svelte';
	let { children } = $props();
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (FMS Specific) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<!-- Add an subtle gradient overlay to avoid pure 1px border as per guideline -->
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-300 shadow-sm border border-blue-200 dark:border-blue-800">
					<span class="material-symbols-outlined text-[20px]">precision_manufacturing</span>
				</div>
				<div>
					<p class="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Fleet Management</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">System</p>
				</div>
			</div>
		</div>
		<nav class="flex-1 space-y-1">
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-transform duration-200 hover:translate-x-1 {$page.url.pathname === '/fms' ? 'bg-surface-container-highest text-blue-600 dark:text-blue-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/fms">
				<span class="material-symbols-outlined">dashboard</span>
				<span class="font-medium text-sm">Overview</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/fms/vehicles') ? 'bg-surface-container-highest text-blue-600 dark:text-blue-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/fms/vehicles">
				<span class="material-symbols-outlined">local_shipping</span>
				<span class="font-medium text-sm">Vehicles</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/fms/trips') ? 'bg-surface-container-highest text-blue-600 dark:text-blue-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/fms/trips">
				<span class="material-symbols-outlined">route</span>
				<span class="font-medium text-sm">Trips & Routes</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/fms/maintenance') ? 'bg-surface-container-highest text-blue-600 dark:text-blue-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/fms/maintenance">
				<span class="material-symbols-outlined">build</span>
				<span class="font-medium text-sm">Maintenance</span>
			</a>

			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/fms/drivers') ? 'bg-surface-container-highest text-blue-600 dark:text-blue-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/fms/drivers">
				<span class="material-symbols-outlined">airline_seat_recline_normal</span>
				<span class="font-medium text-sm">Drivers</span>
			</a>

			<!-- Section Divider -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Operations</p>
			</div>

			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/fms/fuel') ? 'bg-surface-container-highest text-blue-600 dark:text-blue-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/fms/fuel">
				<span class="material-symbols-outlined">local_gas_station</span>
				<span class="font-medium text-sm">Fuel Management</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/fms/documents') ? 'bg-surface-container-highest text-blue-600 dark:text-blue-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/fms/documents">
				<span class="material-symbols-outlined">folder_open</span>
				<span class="font-medium text-sm">Documents</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/fms/reports') ? 'bg-surface-container-highest text-blue-600 dark:text-blue-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/fms/reports">
				<span class="material-symbols-outlined">bar_chart</span>
				<span class="font-medium text-sm">Reports</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/fms/incidents') ? 'bg-surface-container-highest text-blue-600 dark:text-blue-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/fms/incidents">
				<span class="material-symbols-outlined">report</span>
				<span class="font-medium text-sm">Incidents</span>
			</a>

			<!-- Section Divider: Monitoring -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Monitoring</p>
			</div>

			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/fms/route-history') ? 'bg-surface-container-highest text-blue-600 dark:text-blue-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/fms/route-history">
				<span class="material-symbols-outlined">history</span>
				<span class="font-medium text-sm">Route History</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/fms/live-map') ? 'bg-surface-container-highest text-blue-600 dark:text-blue-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/fms/live-map">
				<span class="material-symbols-outlined">map</span>
				<span class="font-medium text-sm">Live Map</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/fms/rest-area') ? 'bg-surface-container-highest text-blue-600 dark:text-blue-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/fms/rest-area">
				<span class="material-symbols-outlined">local_cafe</span>
				<span class="font-medium text-sm">Rest Areas</span>
			</a>
		</nav>
	</aside>

	<!-- Main Content Canvas -->
	<main class="flex-1 h-full overflow-y-auto p-8 bg-surface">
		<div class="max-w-7xl mx-auto">
			{@render children()}
		</div>
	</main>

	<!-- FARIDA — AI Monitoring Armada FMS -->
	<FaridaChat />
</div>
