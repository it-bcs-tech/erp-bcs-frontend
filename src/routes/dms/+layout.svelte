<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';

	let { children } = $props();

	function isActive(path: string) {
		if (path === '/dms/dashboard') {
			return $page.url.pathname === '/dms' || $page.url.pathname === '/dms/dashboard';
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
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Flat Standard DMS) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<!-- Module Branding Header -->
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
					<span class="material-symbols-outlined text-[20px]">folder_special</span>
				</div>
				<div>
					<p class="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Document Center</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">Digital Vault (DMS)</p>
				</div>
			</div>
		</div>

		<!-- Nav Items (Flat Menu Design) -->
		<nav class="flex-1 space-y-1">
			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/dms/dashboard')
					? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/dms/dashboard"
			>
				<span class="material-symbols-outlined text-[20px]">dashboard</span>
				<span class="text-sm">Overview & Horizon</span>
			</a>

			<!-- Section: Documents & Archives -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Documents & Archives</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname === '/dms/transactions/documents'
					? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/dms/transactions/documents"
			>
				<span class="material-symbols-outlined text-[20px]">folder_shared</span>
				<span class="text-sm">All Documents</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/transactions/documents/create')
					? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/dms/transactions/documents/create"
			>
				<span class="material-symbols-outlined text-[20px]">upload_file</span>
				<span class="text-sm">Register Document</span>
			</a>

			<!-- Section: Master Data -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Master Data</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/master/types')
					? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/dms/master/types"
			>
				<span class="material-symbols-outlined text-[20px]">category</span>
				<span class="text-sm">Document Types</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/master/locations')
					? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/dms/master/locations"
			>
				<span class="material-symbols-outlined text-[20px]">inventory_2</span>
				<span class="text-sm">Storage Locations</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/master/issuers')
					? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/dms/master/issuers"
			>
				<span class="material-symbols-outlined text-[20px]">account_balance</span>
				<span class="text-sm">Issuing Authorities</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/master/notaries')
					? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/dms/master/notaries"
			>
				<span class="material-symbols-outlined text-[20px]">gavel</span>
				<span class="text-sm">Notaries</span>
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
	<Chatbot />
</div>
