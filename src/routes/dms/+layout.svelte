<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';

	let { children } = $props();

	function isActive(path: string) {
		if (path === '/dms') {
			return $page.url.pathname === '/dms' || $page.url.pathname === '/dms/dashboard';
		}
		return $page.url.pathname.startsWith(path);
	}
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (DMS Specific Standard) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<!-- Subtle gradient overlay border to match FMS/HRIS standard -->
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<!-- Module Branding Header -->
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-300 shadow-sm border border-indigo-200 dark:border-indigo-800">
					<span class="material-symbols-outlined text-[20px]">folder_special</span>
				</div>
				<div>
					<p class="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Document Mgmt</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">System (DMS)</p>
				</div>
			</div>
		</div>

		<!-- Nav Items -->
		<nav class="flex-1 space-y-1">
			<a
				class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-transform duration-200 hover:translate-x-1 {isActive('/dms/dashboard')
					? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
					: 'text-on-surface-variant hover:bg-surface-container font-medium text-sm'}"
				href="/dms/dashboard"
			>
				<span class="material-symbols-outlined">dashboard</span>
				<span class="text-sm">Overview & Horizon</span>
			</a>

			<!-- Section Divider: Transactions -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Dokumen & Arsip</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-transform duration-200 hover:translate-x-1 {$page.url.pathname === '/dms/transactions/documents'
					? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
					: 'text-on-surface-variant hover:bg-surface-container font-medium text-sm'}"
				href="/dms/transactions/documents"
			>
				<span class="material-symbols-outlined">folder_shared</span>
				<span class="text-sm">Semua Dokumen</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/transactions/documents/create')
					? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
					: 'text-on-surface-variant hover:bg-surface-container font-medium text-sm'}"
				href="/dms/transactions/documents/create"
			>
				<span class="material-symbols-outlined">upload_file</span>
				<span class="text-sm">Registrasi Dokumen</span>
			</a>

			<!-- Section Divider: Master Data -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Master Data DMS</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/master/types')
					? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
					: 'text-on-surface-variant hover:bg-surface-container font-medium text-sm'}"
				href="/dms/master/types"
			>
				<span class="material-symbols-outlined">category</span>
				<span class="text-sm">Tipe Dokumen</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/master/locations')
					? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
					: 'text-on-surface-variant hover:bg-surface-container font-medium text-sm'}"
				href="/dms/master/locations"
			>
				<span class="material-symbols-outlined">inventory_2</span>
				<span class="text-sm">Lokasi Penyimpanan</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/master/issuers')
					? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
					: 'text-on-surface-variant hover:bg-surface-container font-medium text-sm'}"
				href="/dms/master/issuers"
			>
				<span class="material-symbols-outlined">account_balance</span>
				<span class="text-sm">Instansi Penerbit</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/dms/master/notaries')
					? 'bg-surface-container-highest text-indigo-600 dark:text-indigo-400 font-bold'
					: 'text-on-surface-variant hover:bg-surface-container font-medium text-sm'}"
				href="/dms/master/notaries"
			>
				<span class="material-symbols-outlined">gavel</span>
				<span class="text-sm">Notaris</span>
			</a>
		</nav>
	</aside>

	<!-- Main Content Canvas (Standard Layout Container across ERP BCS) -->
	<main class="flex-1 h-full overflow-y-auto p-8 bg-surface">
		<div class="max-w-7xl mx-auto space-y-6">
			{@render children?.()}
		</div>
	</main>

	<!-- Chatbot AI Assistant -->
	<Chatbot />
</div>
