<script lang="ts">
	import { page } from '$app/stores';
	import DimasChat from '$lib/components/DimasChat.svelte';

	import { authUser, hasMenuAccess } from '$lib/stores/auth';
	import { isSidebarExpanded } from '$lib/stores/sidebar';

	let { children } = $props();

	function isActive(path: string) {
		if (path === '/dms/dashboard') {
			return $page.url.pathname === '/dms' || $page.url.pathname === '/dms/dashboard';
		}
		return $page.url.pathname.startsWith(path);
	}

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
	<!-- SideNavBar (Flat Standard DMS) -->
	<aside class="{$isSidebarExpanded ? 'w-64' : 'w-20'} transition-all duration-300 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto overflow-x-hidden">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<!-- Module Branding Header -->
		<div class="px-2 py-6 mb-2 flex items-center {$isSidebarExpanded ? 'gap-3' : 'justify-center'}">
			<div class="w-10 h-10 flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
				<span class="material-symbols-outlined text-[20px]">folder_special</span>
			</div>
			{#if $isSidebarExpanded}
				<div class="whitespace-nowrap transition-opacity duration-300">
					<p class="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Document Center</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">Digital Vault (DMS)</p>
				</div>
			{/if}
		</div>

		<!-- Nav Items (Flat Menu Design) -->
		<nav class="flex-1 flex flex-col space-y-1">
			{#if hasMenuAccess(user, 'dms', 'dms.dashboard')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/dms/dashboard')
						? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/dms/dashboard"
					title="Dashboard"
				>
					<span class="material-symbols-outlined text-[20px]">dashboard</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Dashboard</span>{/if}
				</a>
			{/if}

			<!-- Section: Documents & Archives -->
			{#if hasMenuAccess(user, 'dms', 'dms.documents') || hasMenuAccess(user, 'dms', 'dms.register')}
				<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Documents & Archives' : '...'}</p>
				</div>
			{/if}

			{#if hasMenuAccess(user, 'dms', 'dms.documents')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname === '/dms/transactions/documents'
						? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/dms/transactions/documents"
					title="All Documents"
				>
					<span class="material-symbols-outlined text-[20px]">folder_shared</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">All Documents</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'dms', 'dms.register')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/transactions/documents/create')
						? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/dms/transactions/documents/create"
					title="Register Document"
				>
					<span class="material-symbols-outlined text-[20px]">upload_file</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Register Document</span>{/if}
				</a>
			{/if}

			<!-- Section: Master Data -->
			{#if hasMenuAccess(user, 'dms', 'dms.master-types') || hasMenuAccess(user, 'dms', 'dms.master-categories') || hasMenuAccess(user, 'dms', 'dms.master-companies') || hasMenuAccess(user, 'dms', 'dms.master-locations') || hasMenuAccess(user, 'dms', 'dms.master-issuers') || hasMenuAccess(user, 'dms', 'dms.master-notaries')}
				<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Master Data' : '...'}</p>
				</div>
			{/if}

			{#if hasMenuAccess(user, 'dms', 'dms.master-companies') || hasMenuAccess(user, 'dms', 'dms.master-types')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/master/companies')
						? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/dms/master/companies"
					title="Companies"
				>
					<span class="material-symbols-outlined text-[20px]">corporate_fare</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Companies</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'dms', 'dms.master-types')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/master/types')
						? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/dms/master/types"
					title="Document Types"
				>
					<span class="material-symbols-outlined text-[20px]">category</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Document Types</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'dms', 'dms.master-categories') || hasMenuAccess(user, 'dms', 'dms.master-types')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/master/categories')
						? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/dms/master/categories"
					title="Document Categories"
				>
					<span class="material-symbols-outlined text-[20px]">folder_special</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Document Categories</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'dms', 'dms.master-locations')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/master/locations')
						? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/dms/master/locations"
					title="Storage Locations"
				>
					<span class="material-symbols-outlined text-[20px]">inventory_2</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Storage Locations</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'dms', 'dms.master-issuers')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/master/issuers')
						? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/dms/master/issuers"
					title="Issuing Authorities"
				>
					<span class="material-symbols-outlined text-[20px]">account_balance</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Issuing Authorities</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'dms', 'dms.master-notaries')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/master/notaries')
						? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/dms/master/notaries"
					title="Notaries"
				>
					<span class="material-symbols-outlined text-[20px]">gavel</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Notaries</span>{/if}
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
		<div class="max-w-7xl mx-auto space-y-4">
			<!-- Admin-Only Data Source Status Badge -->
			{#if isAdmin}
				<div class="flex items-center justify-between px-4 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs shadow-2xs">
					<div class="flex items-center gap-2 font-medium">
						<span class="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">Mode Admin:</span>
						<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
							<span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
							Data Source: Direct Database (DMS PostgreSQL)
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

	<!-- Chatbot AI Assistant -->
	<DimasChat />
</div>
