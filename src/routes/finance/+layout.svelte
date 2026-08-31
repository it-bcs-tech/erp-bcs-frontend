<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';

	let { children } = $props();

	// Helper to determine if path is exactly or subpath of the link
	function isActive(path: string) {
		if (path === '/finance') {
			return $page.url.pathname === '/finance';
		}
		return $page.url.pathname.startsWith(path);
	}
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Flat Standard Finance) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<!-- Branding Header -->
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
					<span class="material-symbols-outlined text-[20px]">account_balance</span>
				</div>
				<div>
					<p class="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Finance</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">Accounting & Ledger</p>
				</div>
			</div>
		</div>

		<nav class="flex-1 space-y-1">
			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/finance') && $page.url.pathname === '/finance'
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/finance"
			>
				<span class="material-symbols-outlined text-[20px]">dashboard</span>
				<span class="text-sm">Dashboard</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/finance/create-transaction')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/finance/create-transaction"
			>
				<span class="material-symbols-outlined text-[20px]">add_box</span>
				<span class="text-sm">Pusat Transaksi</span>
			</a>

			<!-- Section: Piutang & Penjualan -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Piutang & Pendapatan</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/finance/invoices')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/finance/invoices"
			>
				<span class="material-symbols-outlined text-[20px]">receipt_long</span>
				<span class="text-sm">Customer Invoices</span>
			</a>

			<!-- Section: Hutang & Pengadaan -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Hutang & Pengeluaran</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/finance/vendor-bills')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/finance/vendor-bills"
			>
				<span class="material-symbols-outlined text-[20px]">shopping_cart_checkout</span>
				<span class="text-sm">Vendor Bills</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/finance/payments')
					? 'bg-surface-container-highest text-amber-600 dark:text-amber-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/finance/payments"
			>
				<span class="material-symbols-outlined text-[20px]">payments</span>
				<span class="text-sm">Riwayat Pembayaran</span>
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
