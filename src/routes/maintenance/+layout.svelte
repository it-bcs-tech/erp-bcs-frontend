<script lang="ts">
	import { page } from '$app/stores';
	import { authUser, hasMenuAccess } from '$lib/stores/auth';
	let { children } = $props();
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Maintenance Specific) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700">
					<span class="material-symbols-outlined text-[20px]">build_circle</span>
				</div>
				<div>
					<p class="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Maintenance</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">Workshop Hub</p>
				</div>
			</div>
		</div>
		<nav class="flex-1 space-y-1">
			{#if hasMenuAccess($authUser, 'maintenance', 'maintenance.dashboard')}
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/maintenance/dashboard') ? 'bg-surface-container-highest text-slate-700 dark:text-slate-300 font-bold' : 'text-on-surface-variant hover:bg-surface-container'}" href="/maintenance/dashboard">
				<span class="material-symbols-outlined">dashboard</span>
				<span class="font-medium text-sm">Dashboard Mekanik</span>
			</a>
			{/if}
			
			{#if hasMenuAccess($authUser, 'maintenance', 'maintenance.work-orders') || hasMenuAccess($authUser, 'maintenance', 'maintenance.inspections')}
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Operations</p>
			</div>
			{/if}

			{#if hasMenuAccess($authUser, 'maintenance', 'maintenance.inspections')}
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/maintenance/inspections') ? 'bg-surface-container-highest text-slate-700 dark:text-slate-300 font-bold' : 'text-on-surface-variant hover:bg-surface-container'}" href="/maintenance/inspections">
				<span class="material-symbols-outlined">assignment_turned_in</span>
				<span class="font-medium text-sm">Inspections</span>
			</a>
			{/if}

			{#if hasMenuAccess($authUser, 'maintenance', 'maintenance.work-orders')}
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/maintenance/work-orders') ? 'bg-surface-container-highest text-slate-700 dark:text-slate-300 font-bold' : 'text-on-surface-variant hover:bg-surface-container'}" href="/maintenance/work-orders">
				<span class="material-symbols-outlined">plumbing</span>
				<span class="font-medium text-sm">Work Orders</span>
			</a>
			{/if}
		</nav>
	</aside>

	<!-- Main Content Canvas -->
	<main class="flex-1 h-full overflow-y-auto p-8 bg-surface">
		<div class="max-w-7xl mx-auto">
			{@render children()}
		</div>
	</main>
</div>
