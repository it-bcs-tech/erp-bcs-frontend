<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';

	import { authUser, hasMenuAccess } from '$lib/stores/auth';
	import { isSidebarExpanded } from '$lib/stores/sidebar';

	let { children } = $props();

	function isActive(path: string) {
		if (path === '/pms') {
			return $page.url.pathname === '/pms';
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

	const isPrintRoute = $derived(
		$page.url.pathname.endsWith('/print') || 
		$page.url.pathname.includes('/print/') || 
		$page.url.searchParams.has('embedded')
	);
</script>

{#if isPrintRoute}
	{@render children?.()}
{:else}
<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Flat Standard PMS 6-Pillars) -->
	<aside class="{$isSidebarExpanded ? 'w-64' : 'w-20'} transition-all duration-300 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto overflow-x-hidden">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>

		<!-- Branding Header -->
		<div class="px-2 py-6 mb-2 flex items-center {$isSidebarExpanded ? 'gap-3' : 'justify-center'}">
			<div class="w-10 h-10 flex-shrink-0 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
				<span class="material-symbols-outlined text-[20px]">inventory</span>
			</div>
			{#if $isSidebarExpanded}
				<div class="whitespace-nowrap transition-opacity duration-300">
					<p class="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Procurement</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">Management System (PMS)</p>
				</div>
			{/if}
		</div>

		<nav class="flex-1 flex flex-col space-y-1">
			<!-- 1. Dashboard -->
			{#if hasMenuAccess(user, 'pms', 'pms.dashboard')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms"
					title="Dashboard"
				>
					<span class="material-symbols-outlined text-[20px]">dashboard</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Dashboard</span>{/if}
				</a>
			{/if}

			<!-- 2. Master Data Section -->
			{#if hasMenuAccess(user, 'pms', 'pms.master-vendors') || hasMenuAccess(user, 'pms', 'pms.master-sites') || hasMenuAccess(user, 'pms', 'pms.master-projects') || hasMenuAccess(user, 'pms', 'pms.master-materials')}
				<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Master Data' : '...'}</p>
				</div>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.master-vendors')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/master/vendors')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/master/vendors"
					title="Vendors"
				>
					<span class="material-symbols-outlined text-[18px]">storefront</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">Vendors</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.master-sites')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/master/sites')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/master/sites"
					title="Sites & Locations"
				>
					<span class="material-symbols-outlined text-[18px]">location_city</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">Sites & Locations</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.master-projects')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/master/projects')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/master/projects"
					title="Projects"
				>
					<span class="material-symbols-outlined text-[18px]">folder_special</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">Projects</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.master-materials')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/master/materials')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/master/materials"
					title="Materials Catalog"
				>
					<span class="material-symbols-outlined text-[18px]">category</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">Materials Catalog</span>{/if}
				</a>
			{/if}

			<!-- 3. Transactions Section -->
			{#if hasMenuAccess(user, 'pms', 'pms.transactions-pr') || hasMenuAccess(user, 'pms', 'pms.transactions-po') || hasMenuAccess(user, 'pms', 'pms.transactions-wrs') || hasMenuAccess(user, 'pms', 'pms.transactions-outstanding') || hasMenuAccess(user, 'pms', 'pms.transactions-service-sheets') || hasMenuAccess(user, 'pms', 'pms.transactions-delivery-notes')}
				<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Procurement Transactions' : '...'}</p>
				</div>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.transactions-pr')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/transactions/pr')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/transactions/pr"
					title="Purchase Request (PR)"
				>
					<span class="material-symbols-outlined text-[18px]">assignment</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">Purchase Request (PR)</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.transactions-po')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/transactions/po')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/transactions/po"
					title="Purchase Order (PO)"
				>
					<span class="material-symbols-outlined text-[18px]">shopping_cart</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">Purchase Order (PO)</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.transactions-wrs')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/transactions/wrs')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/transactions/wrs"
					title="Warehouse Receiving (WRS)"
				>
					<span class="material-symbols-outlined text-[18px]">receipt_long</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">Warehouse Receiving (WRS)</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.transactions-outstanding')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/transactions/outstanding')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/transactions/outstanding"
					title="Outstanding (OS) Hub"
				>
					<span class="material-symbols-outlined text-[18px]">pending_actions</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">Outstanding (OS) Hub</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.transactions-service-sheets')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/transactions/service-sheets')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/transactions/service-sheets"
					title="Supply Slips (SS / WO)"
				>
					<span class="material-symbols-outlined text-[18px]">build</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">Supply Slips (SS / WO)</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.transactions-delivery-notes')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/transactions/delivery-notes')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/transactions/delivery-notes"
					title="Delivery Notes (DN)"
				>
					<span class="material-symbols-outlined text-[18px]">local_shipping</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">Delivery Notes (DN)</span>{/if}
				</a>
			{/if}

			<!-- 4. History Section -->
			{#if hasMenuAccess(user, 'pms', 'pms.history-materials') || hasMenuAccess(user, 'pms', 'pms.history-vendors') || hasMenuAccess(user, 'pms', 'pms.history-remarks')}
				<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Procurement History' : '...'}</p>
				</div>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.history-materials')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/history/materials')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/history/materials"
					title="by Material"
				>
					<span class="material-symbols-outlined text-[18px]">history</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">by Material</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.history-vendors')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/history/vendors')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/history/vendors"
					title="by Vendor"
				>
					<span class="material-symbols-outlined text-[18px]">person_pin</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">by Vendor</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.history-remarks')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/history/remarks')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/history/remarks"
					title="by Remarks"
				>
					<span class="material-symbols-outlined text-[18px]">notes</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">by Remarks</span>{/if}
				</a>
			{/if}

			<!-- 5. Reports & Analytics -->
			{#if hasMenuAccess(user, 'pms', 'pms.reports-yearly-matrix') || hasMenuAccess(user, 'pms', 'pms.reports-lead-time') || hasMenuAccess(user, 'pms', 'pms.reports-transactions')}
				<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Reports & Analytics' : '...'}</p>
				</div>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.reports-yearly-matrix')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/reports/yearly-matrix')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/reports/yearly-matrix"
					title="Yearly Matrix (Jan-Dec)"
				>
					<span class="material-symbols-outlined text-[18px]">calendar_month</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">Yearly Matrix (Jan-Dec)</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.reports-lead-time')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/reports/lead-time')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/reports/lead-time"
					title="Lead Time Tracking"
				>
					<span class="material-symbols-outlined text-[18px]">timelapse</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">Lead Time Tracking</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.reports-transactions')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/reports/transactions')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/reports/transactions"
					title="PO Details & SS/DN Recap"
				>
					<span class="material-symbols-outlined text-[18px]">table_chart</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">PO Details & SS/DN Recap</span>{/if}
				</a>
			{/if}

			<!-- 6. Inventory & Stock -->
			{#if hasMenuAccess(user, 'pms', 'pms.inventory-on-hand') || hasMenuAccess(user, 'pms', 'pms.inventory-stock-history')}
				<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Inventory & Warehouse' : '...'}</p>
				</div>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.inventory-on-hand')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/inventory/on-hand')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/inventory/on-hand"
					title="Stock on Hand"
				>
					<span class="material-symbols-outlined text-[18px]">warehouse</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">Stock on Hand</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'pms', 'pms.inventory-stock-history')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/inventory/stock-history')
						? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/pms/inventory/stock-history"
					title="Stock Cards & Movements"
				>
					<span class="material-symbols-outlined text-[18px]">swap_horiz</span>
					{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">Stock Cards & Movements</span>{/if}
				</a>
			{/if}

			<!-- 7. Settings Section -->
			<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Settings & Configuration' : '...'}</p>
			</div>
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/pms/settings')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/pms/settings"
				title="Approval Settings"
			>
				<span class="material-symbols-outlined text-[18px]">tune</span>
				{#if $isSidebarExpanded}<span class="text-xs font-semibold whitespace-nowrap">Approval Settings</span>{/if}
			</a>

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
						<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
							<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
							Data Source: Direct Database (PMS PostgreSQL)
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
{/if}
