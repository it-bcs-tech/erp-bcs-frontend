<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';

	let { children } = $props();

	function isActive(path: string) {
		if (path === '/pms') {
			return $page.url.pathname === '/pms';
		}
		return $page.url.pathname.startsWith(path);
	}
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Flat Standard PMS 6-Pillars) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>

		<!-- Branding Header -->
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
					<span class="material-symbols-outlined text-[20px]">inventory</span>
				</div>
				<div>
					<p class="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Procurement</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">Management (PMS)</p>
				</div>
			</div>
		</div>

		<nav class="flex-1 space-y-1">
			<!-- 1. Dashboard -->
			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms"
			>
				<span class="material-symbols-outlined text-[20px]">dashboard</span>
				<span class="text-sm">Dashboard Resume</span>
			</a>

			<!-- 2. Master Data Section -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Master Data</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/master/vendors')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/master/vendors"
			>
				<span class="material-symbols-outlined text-[18px]">storefront</span>
				<span class="text-xs font-semibold">Master Vendor</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/master/sites')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/master/sites"
			>
				<span class="material-symbols-outlined text-[18px]">location_city</span>
				<span class="text-xs font-semibold">Master Site / Lokasi</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/master/projects')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/master/projects"
			>
				<span class="material-symbols-outlined text-[18px]">folder_special</span>
				<span class="text-xs font-semibold">Master Project</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/master/materials')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/master/materials"
			>
				<span class="material-symbols-outlined text-[18px]">category</span>
				<span class="text-xs font-semibold">Master Material</span>
			</a>

			<!-- 3. Transactions Section -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Transaksi Pengadaan</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/transactions/pr')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/transactions/pr"
			>
				<span class="material-symbols-outlined text-[18px]">assignment</span>
				<span class="text-xs font-semibold">Purchase Request (PR)</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/transactions/po')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/transactions/po"
			>
				<span class="material-symbols-outlined text-[18px]">shopping_cart</span>
				<span class="text-xs font-semibold">Purchase Order (PO)</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/transactions/wrs')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/transactions/wrs"
			>
				<span class="material-symbols-outlined text-[18px]">receipt_long</span>
				<span class="text-xs font-semibold">WRS / LPB Gudang</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/transactions/outstanding')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/transactions/outstanding"
			>
				<span class="material-symbols-outlined text-[18px]">pending_actions</span>
				<span class="text-xs font-semibold">Outstanding (OS) Hub</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/transactions/service-sheets')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/transactions/service-sheets"
			>
				<span class="material-symbols-outlined text-[18px]">build</span>
				<span class="text-xs font-semibold">Service Sheets (SS)</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/transactions/delivery-notes')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/transactions/delivery-notes"
			>
				<span class="material-symbols-outlined text-[18px]">local_shipping</span>
				<span class="text-xs font-semibold">Delivery Notes (DN)</span>
			</a>

			<!-- 4. History Section -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Riwayat Pengadaan</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/history/materials')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/history/materials"
			>
				<span class="material-symbols-outlined text-[18px]">history</span>
				<span class="text-xs font-semibold">by Material</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/history/vendors')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/history/vendors"
			>
				<span class="material-symbols-outlined text-[18px]">person_pin</span>
				<span class="text-xs font-semibold">by Vendor</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/history/remarks')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/history/remarks"
			>
				<span class="material-symbols-outlined text-[18px]">notes</span>
				<span class="text-xs font-semibold">by Remarks</span>
			</a>

			<!-- 5. Reports & Analytics -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Laporan & Analitik</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/reports/yearly-matrix')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/reports/yearly-matrix"
			>
				<span class="material-symbols-outlined text-[18px]">calendar_month</span>
				<span class="text-xs font-semibold">Yearly Matrix (Jan-Dec)</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/reports/lead-time')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/reports/lead-time"
			>
				<span class="material-symbols-outlined text-[18px]">timelapse</span>
				<span class="text-xs font-semibold">Lead Time Tracking</span>
			</a>

			<!-- 6. Inventory & Stock -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Inventori & Gudang</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/inventory/on-hand')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/inventory/on-hand"
			>
				<span class="material-symbols-outlined text-[18px]">warehouse</span>
				<span class="text-xs font-semibold">Stok On Hand</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/inventory/stock-history')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/inventory/stock-history"
			>
				<span class="material-symbols-outlined text-[18px]">swap_horiz</span>
				<span class="text-xs font-semibold">Kartu Stok / Mutasi</span>
			</a>
		</nav>
	</aside>

	<!-- Main Content Canvas -->
	<main class="flex-1 h-full overflow-y-auto p-8 bg-surface">
		<div class="max-w-7xl mx-auto space-y-6">
			{@render children?.()}
		</div>
	</main>

	<!-- Chatbot AI Assistant -->
	<Chatbot />
</div>
