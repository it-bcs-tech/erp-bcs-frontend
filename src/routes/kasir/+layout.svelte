<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';
	let { children } = $props();
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>

		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-300 shadow-sm border border-emerald-200 dark:border-emerald-800">
					<span class="material-symbols-outlined text-[20px]">point_of_sale</span>
				</div>
				<div>
					<p class="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Kasir</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">Cash & Payment</p>
				</div>
			</div>
		</div>

		<nav class="flex-1 space-y-1">
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-transform duration-200 hover:translate-x-1 {$page.url.pathname === '/kasir' ? 'bg-surface-container-highest text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/kasir">
				<span class="material-symbols-outlined">space_dashboard</span>
				<span class="font-medium text-sm">Dashboard</span>
			</a>

			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Operasional Truk</p>
			</div>

			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/kasir/ujo') ? 'bg-surface-container-highest text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/kasir/ujo">
				<span class="material-symbols-outlined">payments</span>
				<span class="font-medium text-sm">Pencairan UJO</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/kasir/closing') ? 'bg-surface-container-highest text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/kasir/closing">
				<span class="material-symbols-outlined">assignment_turned_in</span>
				<span class="font-medium text-sm">Closing Settlement</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/kasir/surat-jalan') ? 'bg-surface-container-highest text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/kasir/surat-jalan">
				<span class="material-symbols-outlined">edit_document</span>
				<span class="font-medium text-sm">Surat Jalan (DN)</span>
			</a>

			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Keuangan (Coming Soon)</p>
			</div>

			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/kasir/invoices') ? 'bg-surface-container-highest text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/kasir/invoices">
				<span class="material-symbols-outlined">description</span>
				<span class="font-medium text-sm">Invoice & Tagihan</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/kasir/expenses') ? 'bg-surface-container-highest text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/kasir/expenses">
				<span class="material-symbols-outlined">money_off</span>
				<span class="font-medium text-sm">Pengeluaran</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/kasir/cash-flow') ? 'bg-surface-container-highest text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/kasir/cash-flow">
				<span class="material-symbols-outlined">account_balance_wallet</span>
				<span class="font-medium text-sm">Arus Kas</span>
			</a>
		</nav>
	</aside>

	<main class="flex-1 h-full overflow-y-auto p-8 bg-surface">
		<div class="max-w-7xl mx-auto">
			{@render children()}
		</div>
	</main>

	<Chatbot />
</div>
