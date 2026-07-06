<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';
	let { children } = $props();
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (PMS Specific) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>

		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-300 shadow-sm border border-amber-200 dark:border-amber-800">
					<span class="material-symbols-outlined text-[20px]">inventory</span>
				</div>
				<div>
					<p class="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">PMS</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">Procurement Mgmt</p>
				</div>
			</div>
		</div>

		<nav class="flex-1 space-y-1">
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-transform duration-200 hover:translate-x-1 {$page.url.pathname === '/pms' ? 'bg-surface-container-highest text-amber-600 dark:text-amber-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/pms">
				<span class="material-symbols-outlined">space_dashboard</span>
				<span class="font-medium text-sm">Dashboard</span>
			</a>

			<!-- Section: Procurement -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Procurement</p>
			</div>

			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/pms/purchase-orders') ? 'bg-surface-container-highest text-amber-600 dark:text-amber-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/pms/purchase-orders">
				<span class="material-symbols-outlined">receipt_long</span>
				<span class="font-medium text-sm">Purchase Orders</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/pms/suppliers') ? 'bg-surface-container-highest text-amber-600 dark:text-amber-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/pms/suppliers">
				<span class="material-symbols-outlined">storefront</span>
				<span class="font-medium text-sm">Suppliers</span>
			</a>

			<!-- Section: Inventory -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Inventory</p>
			</div>

			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/pms/items') ? 'bg-surface-container-highest text-amber-600 dark:text-amber-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/pms/items">
				<span class="material-symbols-outlined">inventory_2</span>
				<span class="font-medium text-sm">Item Master</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/pms/stock') ? 'bg-surface-container-highest text-amber-600 dark:text-amber-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/pms/stock">
				<span class="material-symbols-outlined">warehouse</span>
				<span class="font-medium text-sm">Stock & Gudang</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/pms/delivery-notes') ? 'bg-surface-container-highest text-amber-600 dark:text-amber-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/pms/delivery-notes">
				<span class="material-symbols-outlined">outbox</span>
				<span class="font-medium text-sm">Delivery Notes</span>
			</a>

			<!-- Section: Purchasing / Procurement -->
			<div class="pt-3 pb-1 px-4 mt-2">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Purchasing</p>
			</div>
			
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/pms/purchasing/requests') ? 'bg-surface-container-highest text-amber-600 dark:text-amber-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/pms/purchasing/requests">
				<span class="material-symbols-outlined">assignment_add</span>
				<span class="font-medium text-sm">Purchase Request</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/pms/purchasing/orders') ? 'bg-surface-container-highest text-amber-600 dark:text-amber-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/pms/purchasing/orders">
				<span class="material-symbols-outlined">shopping_cart</span>
				<span class="font-medium text-sm">Purchase Order</span>
			</a>

			<!-- Section: Maintenance Schedules -->
			<div class="pt-3 pb-1 px-4 mt-2">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Jadwal Perawatan</p>
			</div>

			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/pms/schedules') ? 'bg-surface-container-highest text-amber-600 dark:text-amber-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/pms/schedules">
				<span class="material-symbols-outlined">calendar_month</span>
				<span class="font-medium text-sm">Jadwal Service</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/pms/work-orders') ? 'bg-surface-container-highest text-amber-600 dark:text-amber-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/pms/work-orders">
				<span class="material-symbols-outlined">build_circle</span>
				<span class="font-medium text-sm">Work Orders</span>
			</a>
		</nav>
	</aside>

	<!-- Main Content Canvas -->
	<main class="flex-1 h-full overflow-y-auto p-8 bg-surface">
		<div class="max-w-7xl mx-auto">
			{@render children()}
		</div>
	</main>

	<Chatbot />
</div>
