<script lang="ts">
	import { page } from '$app/stores';
	import OrisChat from '$lib/components/OrisChat.svelte';
	import { authUser, hasMenuAccess } from '$lib/stores/auth';
	import { isSidebarExpanded } from '$lib/stores/sidebar';

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
	<aside class="{$isSidebarExpanded ? 'w-64' : 'w-20'} transition-all duration-300 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto overflow-x-hidden">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<!-- Branding Header -->
		<div class="px-2 py-6 mb-2 flex items-center {$isSidebarExpanded ? 'gap-3' : 'justify-center'}">
			<div class="w-10 h-10 flex-shrink-0 bg-sky-100 dark:bg-sky-900/50 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
				<span class="material-symbols-outlined text-[20px]">hub</span>
			</div>
			{#if $isSidebarExpanded}
				<div class="whitespace-nowrap transition-opacity duration-300">
					<p class="text-sm font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider">Operations Control</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">System (OCS)</p>
				</div>
			{/if}
		</div>

		<nav class="flex-1 flex flex-col space-y-1">
			{#if hasMenuAccess(user, 'ocs', 'ocs.dashboard')}
			<a class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname === '/ocs' ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs" title="Dashboard">
				<span class="material-symbols-outlined text-[20px]">space_dashboard</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Dashboard</span>{/if}
			</a>
			{/if}

			<!-- Section Divider: Operations -->
			{#if hasMenuAccess(user, 'ocs', 'ocs.dispatch') || hasMenuAccess(user, 'ocs', 'ocs.pod') || hasMenuAccess(user, 'ocs', 'ocs.ujo') || hasMenuAccess(user, 'ocs', 'ocs.assign-driver') || hasMenuAccess(user, 'ocs', 'ocs.driver-readiness') || hasMenuAccess(user, 'ocs', 'ocs.daily-targets')}
			<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Operations' : '...'}</p>
			</div>
			{/if}

			{#if hasMenuAccess(user, 'ocs', 'ocs.dispatch')}
			<a class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/dispatch') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs/dispatch" title="Dispatch Operations">
				<span class="material-symbols-outlined text-[20px]">assignment</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Dispatch Operations</span>{/if}
			</a>
			{/if}

			{#if hasMenuAccess(user, 'ocs', 'ocs.pod')}
			<a class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/pod') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs/pod" title="e-POD (Proof of Delivery)">
				<span class="material-symbols-outlined text-[20px]">verified</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">e-POD (Proof of Delivery)</span>{/if}
			</a>
			{/if}
			
			{#if hasMenuAccess(user, 'ocs', 'ocs.ujo')}
			<a class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/ujo') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs/ujo" title="Driver Allowance (UJO)">
				<span class="material-symbols-outlined text-[20px]">payments</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Driver Allowance (UJO)</span>{/if}
			</a>
			{/if}
			
			{#if hasMenuAccess(user, 'ocs', 'ocs.assign-driver')}
			<a class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/assign-driver') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs/assign-driver" title="Driver Assignment">
				<span class="material-symbols-outlined text-[20px]">person_pin</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Driver Assignment</span>{/if}
			</a>
			{/if}

			{#if hasMenuAccess(user, 'ocs', 'ocs.driver-readiness') || hasMenuAccess(user, 'ocs', 'ocs.assign-driver')}
			<a class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/driver-readiness') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs/driver-readiness" title="Driver Readiness">
				<span class="material-symbols-outlined text-[20px]">badge</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Driver Readiness</span>{/if}
			</a>
			{/if}
			
			{#if hasMenuAccess(user, 'ocs', 'ocs.daily-targets')}
			<a class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/daily-targets') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs/daily-targets" title="Daily Delivery Targets">
				<span class="material-symbols-outlined text-[20px]">track_changes</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Daily Delivery Targets</span>{/if}
			</a>
			{/if}
			
			<!-- Section Divider: Master Data & Settings -->
			{#if isAdmin || hasMenuAccess(user, 'ocs', 'ocs.rute') || hasMenuAccess(user, 'ocs', 'ocs.gerbang-tol') || hasMenuAccess(user, 'ocs', 'ocs.settings')}
			<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Master Data & Settings' : '...'}</p>
			</div>

			{#if isAdmin || hasMenuAccess(user, 'ocs', 'ocs.rute')}
			<a class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/rute') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs/rute" title="Routes & UJO Catalog">
				<span class="material-symbols-outlined text-[20px]">route</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Routes & UJO Catalog</span>{/if}
			</a>
			{/if}

			{#if isAdmin || hasMenuAccess(user, 'ocs', 'ocs.gerbang-tol') || hasMenuAccess(user, 'ocs', 'ocs.rute')}
			<a class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/gerbang-tol') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs/gerbang-tol" title="Toll Gates">
				<span class="material-symbols-outlined text-[20px]">toll</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Toll Gates</span>{/if}
			</a>
			{/if}

			{#if isAdmin || hasMenuAccess(user, 'ocs', 'ocs.settings')}
			<a class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/settings') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/ocs/settings" title="OCS Settings">
				<span class="material-symbols-outlined text-[20px]">tune</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">OCS Settings</span>{/if}
			</a>
			{/if}
			{/if}

			<!-- Spacer -->
			<div class="flex-1"></div>

			<!-- Toggle Button -->
			<button 
				type="button"
				onclick={() => isSidebarExpanded.toggle()} 
				class="mt-4 flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container transition-all duration-200 hover:text-on-surface cursor-pointer"
				title={$isSidebarExpanded ? 'Collapse Menu' : 'Expand Menu'}
			>
				<span class="material-symbols-outlined transition-transform duration-300 {$isSidebarExpanded ? '' : 'rotate-180'}">keyboard_double_arrow_left</span>
				{#if $isSidebarExpanded}<span class="font-medium text-xs whitespace-nowrap">Collapse Sidebar</span>{/if}
			</button>
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
