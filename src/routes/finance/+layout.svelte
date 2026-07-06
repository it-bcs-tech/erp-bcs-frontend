<script lang="ts">
	import { page } from '$app/stores';

	// Helper to determine if path is exactly or subpath of the link
	function isActive(path: string) {
		if (path === '/finance') {
			return $page.url.pathname === '/finance';
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
					<span class="material-symbols-outlined">account_balance</span>
				</div>
				<div>
					<p class="text-sm font-bold text-primary">Finance</p>
					<p class="text-[10px] text-on-surface-variant uppercase tracking-widest">Global Overview</p>
				</div>
			</div>
		</div>
		<nav class="flex-1 space-y-1">
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {isActive('/finance') ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}" href="/finance">
				<span class="material-symbols-outlined">dashboard</span>
				<span class="font-medium text-sm">Dashboard</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {isActive('/finance/create-transaction') ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}" href="/finance/create-transaction">
				<span class="material-symbols-outlined">add_box</span>
				<span class="font-medium text-sm">Create Transaction</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {isActive('/finance/invoices') ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}" href="/finance/invoices">
				<span class="material-symbols-outlined">receipt_long</span>
				<span class="font-medium text-sm">Invoices</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {isActive('/finance/vendor-bills') ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}" href="/finance/vendor-bills">
				<span class="material-symbols-outlined">shopping_cart_checkout</span>
				<span class="font-medium text-sm">Vendor Bills</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {isActive('/finance/payments') ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}" href="/finance/payments">
				<span class="material-symbols-outlined">account_balance_wallet</span>
				<span class="font-medium text-sm">Payments</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {isActive('/finance/expenses') ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}" href="/finance/expenses">
				<span class="material-symbols-outlined">payments</span>
				<span class="font-medium text-sm">Expenses</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {isActive('/finance/reports') ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}" href="/finance/reports">
				<span class="material-symbols-outlined">analytics</span>
				<span class="font-medium text-sm">Reports</span>
			</a>
		</nav>
	</aside>

	<!-- Main Content Canvas -->
	<main class="flex-1 h-full overflow-y-auto bg-surface">
		<slot />
	</main>
</div>
