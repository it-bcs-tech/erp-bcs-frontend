<script lang="ts">
	import { page } from '$app/stores';
	import OrisChat from '$lib/components/OrisChat.svelte';
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
	<!-- SideNavBar (OCS Specific) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<!-- Branding Header -->
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-sky-100 dark:bg-sky-900/50 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
					<span class="material-symbols-outlined text-[20px]">hub</span>
				</div>
				<div>
					<p class="text-sm font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider">Operations Control</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">System (OCS)</p>
				</div>
			</div>
		</div>

		<nav class="flex-1 space-y-1">
			{#if hasMenuAccess(user, 'ocs', 'ocs.dashboard')}
			<a class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname === '/ocs' ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs">
				<span class="material-symbols-outlined text-[20px]">space_dashboard</span>
				<span class="text-sm">Overview</span>
			</a>
			{/if}

			<!-- Section Divider: Operations -->
			{#if hasMenuAccess(user, 'ocs', 'ocs.dispatch') || hasMenuAccess(user, 'ocs', 'ocs.ujo') || hasMenuAccess(user, 'ocs', 'ocs.assign-driver') || hasMenuAccess(user, 'ocs', 'ocs.daily-targets')}
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Operations</p>
			</div>
			{/if}

			{#if hasMenuAccess(user, 'ocs', 'ocs.dispatch')}
			<a class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/dispatch') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs/dispatch">
				<span class="material-symbols-outlined text-[20px]">assignment</span>
				<span class="text-sm">Dispatch Operations</span>
			</a>

			<a class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/pod') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs/pod">
				<span class="material-symbols-outlined text-[20px]">verified</span>
				<span class="text-sm">e-POD (Surat Jalan Balik)</span>
			</a>
			{/if}
			
			{#if hasMenuAccess(user, 'ocs', 'ocs.ujo')}
			<a class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/ujo') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs/ujo">
				<span class="material-symbols-outlined text-[20px]">payments</span>
				<span class="text-sm">UJO (Driver Allowance)</span>
			</a>
			{/if}
			
			{#if hasMenuAccess(user, 'ocs', 'ocs.assign-driver')}
			<a class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/assign-driver') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs/assign-driver">
				<span class="material-symbols-outlined text-[20px]">person_pin</span>
				<span class="text-sm">Assign Driver</span>
			</a>
			{/if}
			
			{#if hasMenuAccess(user, 'ocs', 'ocs.daily-targets')}
			<a class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/daily-targets') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs/daily-targets">
				<span class="material-symbols-outlined text-[20px]">track_changes</span>
				<span class="text-sm">Daily Fleet Targets</span>
			</a>
			{/if}
			
			<!-- Section Divider: Master Data -->
			{#if hasMenuAccess(user, 'ocs', 'ocs.rute')}
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Master Data</p>
			</div>

			<a class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/rute') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs/rute">
				<span class="material-symbols-outlined text-[20px]">route</span>
				<span class="text-sm">Master Routes & Tolls</span>
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
						<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
							<span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
							Data Source: Direct Database (OCS Operations PostgreSQL)
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

	<!-- AI Assistant Chatbot -->
	<OrisChat />
</div>
