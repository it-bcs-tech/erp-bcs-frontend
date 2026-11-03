<script lang="ts">
	import { page } from '$app/stores';
	import QishaChat from '$lib/components/QishaChat.svelte';

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

	function isActive(path: string) {
		if (path === '/qhse') {
			return $page.url.pathname === '/qhse';
		}
		return $page.url.pathname.startsWith(path);
	}
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Flat Standard QHSE) -->
	<aside class="{$isSidebarExpanded ? 'w-64' : 'w-20'} transition-all duration-300 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto overflow-x-hidden">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>

		<!-- Branding Header -->
		<div class="px-2 py-6 mb-2 flex items-center {$isSidebarExpanded ? 'gap-3' : 'justify-center'}">
			<div class="w-10 h-10 flex-shrink-0 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
				<span class="material-symbols-outlined text-[20px]">verified_user</span>
			</div>
			{#if $isSidebarExpanded}
				<div class="whitespace-nowrap transition-opacity duration-300">
					<p class="text-sm font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider">QHSE & Safety</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">K3, Mutu & Lingkungan</p>
				</div>
			{/if}
		</div>

		<nav class="flex-1 flex flex-col space-y-1">
			<!-- Overview / Dashboard -->
			{#if hasMenuAccess(user, 'qhse', 'qhse.overview')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/qhse')
						? 'bg-surface-container-highest text-orange-600 dark:text-orange-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/qhse"
					title="Dashboard"
				>
					<span class="material-symbols-outlined text-[20px]">space_dashboard</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Dashboard</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'qhse', 'qhse.incidents') || hasMenuAccess(user, 'qhse', 'qhse.inspections')}
				<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Safety Indicators' : '...'}</p>
				</div>
			{/if}

			<!-- Lagging: Incident & CAR -->
			{#if hasMenuAccess(user, 'qhse', 'qhse.incidents')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/qhse/incidents')
						? 'bg-surface-container-highest text-orange-600 dark:text-orange-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/qhse/incidents"
					title="Incidents & CAR (Lagging)"
				>
					<span class="material-symbols-outlined text-[20px]">emergency</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Incidents & CAR (Lagging)</span>{/if}
				</a>
			{/if}

			<!-- Leading: Inspeksi & Proaktif -->
			{#if hasMenuAccess(user, 'qhse', 'qhse.inspections')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/qhse/inspections')
						? 'bg-surface-container-highest text-orange-600 dark:text-orange-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/qhse/inspections"
					title="Inspections & Proactive (Leading)"
				>
					<span class="material-symbols-outlined text-[20px]">fact_check</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Inspections & Proactive (Leading)</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'qhse', 'qhse.safety-enablement') || hasMenuAccess(user, 'qhse', 'qhse.quality')}
				<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Operations & System' : '...'}</p>
				</div>
			{/if}

			<!-- Enablement & APD -->
			{#if hasMenuAccess(user, 'qhse', 'qhse.safety-enablement')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/qhse/safety-enablement')
						? 'bg-surface-container-highest text-orange-600 dark:text-orange-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/qhse/safety-enablement"
					title="Safety Briefings & PPE"
				>
					<span class="material-symbols-outlined text-[20px]">health_and_safety</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Safety Briefings & PPE</span>{/if}
				</a>
			{/if}

			<!-- Management System & Quality -->
			{#if hasMenuAccess(user, 'qhse', 'qhse.quality')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/qhse/quality')
						? 'bg-surface-container-highest text-orange-600 dark:text-orange-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/qhse/quality"
					title="SOP & Customer Complaints"
				>
					<span class="material-symbols-outlined text-[20px]">policy</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">SOP & Customer Complaints</span>{/if}
				</a>
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
		<div class="max-w-7xl mx-auto space-y-6">
			<!-- Admin-Only Data Source Status Badge -->
			{#if isAdmin}
				<div class="flex items-center justify-between px-4 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs shadow-2xs">
					<div class="flex items-center gap-2 font-medium">
						<span class="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">Mode Admin:</span>
						<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
							<span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
							Data Source: Direct Database (QHSE PostgreSQL)
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

	<!-- QISHA Safety & QHSE AI Assistant -->
	<QishaChat />
</div>
