<script lang="ts">
	import { page } from '$app/stores';

	let { children } = $props();

	function isActive(path: string) {
		if (path === '/dms') {
			return $page.url.pathname === '/dms';
		}
		return $page.url.pathname.startsWith(path);
	}
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative border-r border-slate-200/60 dark:border-slate-800/60">
		<div class="px-4 py-5 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xs">
					<span class="material-symbols-outlined">folder_special</span>
				</div>
				<div>
					<p class="text-sm font-black text-indigo-600 dark:text-indigo-400">DMS Module</p>
					<p class="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Doc & Legal Archive</p>
				</div>
			</div>
		</div>

		<nav class="flex-1 space-y-1 overflow-y-auto scrollbar-none">
			<a
				class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs {isActive('/dms/dashboard')
					? 'bg-indigo-600 text-white shadow-xs'
					: 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}"
				href="/dms/dashboard"
			>
				<span class="material-symbols-outlined text-lg">dashboard</span>
				<span>Dashboard & Horizon</span>
			</a>

			<div class="pt-4 pb-1.5 px-3.5">
				<p class="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Direktori Dokumen</p>
			</div>

			<a
				class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs {isActive('/dms/transactions/documents')
					? 'bg-indigo-600 text-white shadow-xs'
					: 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}"
				href="/dms/transactions/documents"
			>
				<span class="material-symbols-outlined text-lg">description</span>
				<span>Semua Dokumen</span>
			</a>

			<a
				class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs {isActive('/dms/transactions/documents/create')
					? 'bg-indigo-600 text-white shadow-xs'
					: 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}"
				href="/dms/transactions/documents/create"
			>
				<span class="material-symbols-outlined text-lg">upload_file</span>
				<span>Registrasi Dokumen</span>
			</a>

			<div class="pt-4 pb-1.5 px-3.5">
				<p class="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Master Data DMS</p>
			</div>

			<a
				class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs {isActive('/dms/master/types')
					? 'bg-indigo-600 text-white shadow-xs'
					: 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}"
				href="/dms/master/types"
			>
				<span class="material-symbols-outlined text-lg">category</span>
				<span>Tipe Dokumen</span>
			</a>

			<a
				class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs {isActive('/dms/master/notaries')
					? 'bg-indigo-600 text-white shadow-xs'
					: 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}"
				href="/dms/master/notaries"
			>
				<span class="material-symbols-outlined text-lg">gavel</span>
				<span>Notaris</span>
			</a>

			<a
				class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs {isActive('/dms/master/issuers')
					? 'bg-indigo-600 text-white shadow-xs'
					: 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}"
				href="/dms/master/issuers"
			>
				<span class="material-symbols-outlined text-lg">account_balance</span>
				<span>Instansi Penerbit</span>
			</a>

			<a
				class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs {isActive('/dms/master/locations')
					? 'bg-indigo-600 text-white shadow-xs'
					: 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}"
				href="/dms/master/locations"
			>
				<span class="material-symbols-outlined text-lg">inventory_2</span>
				<span>Lokasi Fisik / Rak</span>
			</a>
		</nav>
	</aside>

	<!-- Main Content Canvas -->
	<main class="flex-1 h-full overflow-y-auto bg-surface p-4 md:p-6">
		{@render children?.()}
	</main>
</div>
