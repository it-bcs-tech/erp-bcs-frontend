<script lang="ts">
	import { page } from '$app/stores';

	// Helper to determine if path is exactly or subpath of the link
	function isActive(path: string) {
		if (path === '/dms') {
			return $page.url.pathname === '/dms';
		}
		return $page.url.pathname.startsWith(path);
	}
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative">
		<!-- Add an subtle gradient overlay to avoid pure 1px border as per guideline -->
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary shadow-sm">
					<span class="material-symbols-outlined">folder_special</span>
				</div>
				<div>
					<p class="text-sm font-bold text-primary">DMS</p>
					<p class="text-[10px] text-on-surface-variant uppercase tracking-widest">Document Management</p>
				</div>
			</div>
		</div>
		<nav class="flex-1 space-y-1">
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {isActive('/dms/dashboard') ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}" href="/dms/dashboard">
				<span class="material-symbols-outlined">dashboard</span>
				<span class="font-medium text-sm">Dashboard</span>
			</a>
			<div class="pt-4 pb-2 px-4">
				<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Transaksi</p>
			</div>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {isActive('/dms/transactions/documents') ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}" href="/dms/transactions/documents">
				<span class="material-symbols-outlined">description</span>
				<span class="font-medium text-sm">All Documents</span>
			</a>
			<div class="pt-4 pb-2 px-4">
				<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Master Data</p>
			</div>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {isActive('/dms/master/types') ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}" href="/dms/master/types">
				<span class="material-symbols-outlined">category</span>
				<span class="font-medium text-sm">Doc Types</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {isActive('/dms/master/notaries') ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}" href="/dms/master/notaries">
				<span class="material-symbols-outlined">gavel</span>
				<span class="font-medium text-sm">Notaries</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {isActive('/dms/master/issuers') ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}" href="/dms/master/issuers">
				<span class="material-symbols-outlined">account_balance</span>
				<span class="font-medium text-sm">Issuers</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {isActive('/dms/master/locations') ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}" href="/dms/master/locations">
				<span class="material-symbols-outlined">shelves</span>
				<span class="font-medium text-sm">Filing Locations</span>
			</a>
		</nav>
	</aside>

	<!-- Main Content Canvas -->
	<main class="flex-1 h-full overflow-y-auto bg-surface">
		<slot />
	</main>
</div>
