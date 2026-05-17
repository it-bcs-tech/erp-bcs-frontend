<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';
	let { children } = $props();
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Marketing Specific) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<!-- Gradient border line -->
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-rose-100 dark:bg-rose-900/50 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-300 shadow-sm border border-rose-200 dark:border-rose-800">
					<span class="material-symbols-outlined text-[20px]">campaign</span>
				</div>
				<div>
					<p class="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Marketing</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">& Business Dev</p>
				</div>
			</div>
		</div>
		<nav class="flex-1 space-y-1">
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-transform duration-200 hover:translate-x-1 {$page.url.pathname === '/marketing' ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/marketing">
				<span class="material-symbols-outlined">dashboard</span>
				<span class="font-medium text-sm">Overview</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/marketing/customers') ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/marketing/customers">
				<span class="material-symbols-outlined">group</span>
				<span class="font-medium text-sm">Customers</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/marketing/tariffs') ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/marketing/tariffs">
				<span class="material-symbols-outlined">price_change</span>
				<span class="font-medium text-sm">Tariffs & Pricing</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/marketing/orders') ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/marketing/orders">
				<span class="material-symbols-outlined">receipt_long</span>
				<span class="font-medium text-sm">Orders / DO</span>
			</a>

			<!-- Section Divider -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Analytics</p>
			</div>

			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/marketing/reports') ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/marketing/reports">
				<span class="material-symbols-outlined">bar_chart</span>
				<span class="font-medium text-sm">Reports</span>
			</a>
		</nav>
	</aside>

	<!-- Main Content Canvas -->
	<main class="flex-1 h-full overflow-y-auto p-8 bg-surface">
		<div class="max-w-7xl mx-auto">
			{@render children()}
		</div>
	</main>

	<!-- AI Assistant Chatbot -->
	<Chatbot />
</div>
