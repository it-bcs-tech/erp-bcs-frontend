<script lang="ts">
	import { page } from '$app/stores';
	import FinaChat from '$lib/components/FinaChat.svelte';

	import { authUser, hasMenuAccess } from '$lib/stores/auth';
	import { isSidebarExpanded } from '$lib/stores/sidebar';

	let { children } = $props();

	function isActive(path: string) {
		if (path === '/finance') {
			return $page.url.pathname === '/finance';
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
	<!-- SideNavBar (Flat Standard Finance) -->
	<aside class="{$isSidebarExpanded ? 'w-64' : 'w-20'} transition-all duration-300 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto overflow-x-hidden">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<!-- Branding Header -->
		<div class="px-2 py-6 mb-2 flex items-center {$isSidebarExpanded ? 'gap-3' : 'justify-center'}">
			<div class="w-10 h-10 flex-shrink-0 bg-teal-100 dark:bg-teal-900/50 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
				<span class="material-symbols-outlined text-[20px]">account_balance</span>
			</div>
			{#if $isSidebarExpanded}
				<div class="whitespace-nowrap transition-opacity duration-300">
					<p class="text-sm font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider">Finance</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">& Accounting</p>
				</div>
			{/if}
		</div>

		<nav class="flex-1 flex flex-col space-y-1">
			{#if hasMenuAccess(user, 'finance', 'finance.overview')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/finance') && $page.url.pathname === '/finance'
						? 'bg-surface-container-highest text-teal-600 dark:text-teal-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/finance"
					title="Dashboard"
				>
					<span class="material-symbols-outlined text-[20px]">dashboard</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Dashboard</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'finance', 'finance.create-transaction')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/finance/create-transaction')
						? 'bg-surface-container-highest text-teal-600 dark:text-teal-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/finance/create-transaction"
					title="Transaction Center"
				>
					<span class="material-symbols-outlined text-[20px]">add_box</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Transaction Center</span>{/if}
				</a>
			{/if}

			<!-- Section: Invoicing & Receivables -->
			{#if hasMenuAccess(user, 'finance', 'finance.invoices')}
				<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Receivables & Invoicing' : '...'}</p>
				</div>

				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/finance/invoices')
						? 'bg-surface-container-highest text-teal-600 dark:text-teal-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/finance/invoices"
					title="Customer Invoices"
				>
					<span class="material-symbols-outlined text-[20px]">receipt_long</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Customer Invoices</span>{/if}
				</a>
			{/if}

			<!-- Section: Payables & Expenses -->
			{#if hasMenuAccess(user, 'finance', 'finance.vendor-bills') || hasMenuAccess(user, 'finance', 'finance.payments')}
				<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Payables & Expenses' : '...'}</p>
				</div>
			{/if}

			{#if hasMenuAccess(user, 'finance', 'finance.vendor-bills')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/finance/vendor-bills')
						? 'bg-surface-container-highest text-teal-600 dark:text-teal-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/finance/vendor-bills"
					title="Vendor Bills"
				>
					<span class="material-symbols-outlined text-[20px]">shopping_cart_checkout</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Vendor Bills</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'finance', 'finance.payments')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/finance/payments')
						? 'bg-surface-container-highest text-teal-600 dark:text-teal-400 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/finance/payments"
					title="Payment History"
				>
					<span class="material-symbols-outlined text-[20px]">payments</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Payment History</span>{/if}
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
						<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
							<span class="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
							Data Source: Direct Database (Finance PostgreSQL)
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

	<!-- FINA Financial AI Assistant -->
	<FinaChat />
</div>
{/if}
