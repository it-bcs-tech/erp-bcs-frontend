<script lang="ts">
	import { page } from '$app/stores';
	import { authUser, hasMenuAccess } from '$lib/stores/auth';

	let { children } = $props();

	const user = $derived($page.data?.user || $authUser);
	const isAdmin = $derived(
		user && (
			['superadmin', 'administrator', 'superhyperadmin', 'super_admin'].includes(user.role?.toLowerCase()) ||
			user.role?.toLowerCase()?.includes('admin') ||
			user.email === 'superhyperadmin@bcs-logistics.co.id'
		)
	);
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Maintenance Specific) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<!-- Branding Header -->
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
					<span class="material-symbols-outlined text-[20px]">build_circle</span>
				</div>
				<div>
					<p class="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Maintenance</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">Workshop & Repairs</p>
				</div>
			</div>
		</div>

		<nav class="flex-1 space-y-1">
			{#if hasMenuAccess(user, 'maintenance', 'maintenance.dashboard')}
			<a class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/maintenance/dashboard') ? 'bg-surface-container-highest text-slate-700 dark:text-slate-300 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/maintenance/dashboard">
				<span class="material-symbols-outlined text-[20px]">dashboard</span>
				<span class="text-sm">Overview</span>
			</a>
			{/if}
			
			<!-- Section Divider: Operations -->
			{#if hasMenuAccess(user, 'maintenance', 'maintenance.work-orders') || hasMenuAccess(user, 'maintenance', 'maintenance.inspections')}
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Workshop Operations</p>
			</div>
			{/if}

			{#if hasMenuAccess(user, 'maintenance', 'maintenance.inspections')}
			<a class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/maintenance/inspections') ? 'bg-surface-container-highest text-slate-700 dark:text-slate-300 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/maintenance/inspections">
				<span class="material-symbols-outlined text-[20px]">assignment_turned_in</span>
				<span class="text-sm">Inspections</span>
			</a>
			{/if}

			{#if hasMenuAccess(user, 'maintenance', 'maintenance.work-orders')}
			<a class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/maintenance/work-orders') ? 'bg-surface-container-highest text-slate-700 dark:text-slate-300 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/maintenance/work-orders">
				<span class="material-symbols-outlined text-[20px]">plumbing</span>
				<span class="text-sm">Work Orders (SPK)</span>
			</a>
			{/if}
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
						<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
							<span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
							Data Source: Direct Database (Maintenance PostgreSQL)
						</span>
					</div>
					<div class="text-[10px] text-on-surface-variant font-mono hidden sm:block">
						Role: {user?.role || 'Admin'}
					</div>
				</div>
			{/if}

			{@render children?.()}
		</div>
	</main>
</div>
