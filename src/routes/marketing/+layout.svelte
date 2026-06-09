<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';
	let { children } = $props();
	let isSidebarExpanded = $state(true);
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Marketing Specific) -->
	<aside class="{isSidebarExpanded ? 'w-64' : 'w-20'} transition-all duration-300 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto overflow-x-hidden">
		<!-- Gradient border line -->
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<div class="px-2 py-6 mb-2 flex items-center {isSidebarExpanded ? 'gap-3' : 'justify-center'}">
			<div class="w-10 h-10 flex-shrink-0 bg-rose-100 dark:bg-rose-900/50 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-300 shadow-sm border border-rose-200 dark:border-rose-800">
				<span class="material-symbols-outlined text-[20px]">campaign</span>
			</div>
			{#if isSidebarExpanded}
				<div class="whitespace-nowrap transition-opacity duration-300">
					<p class="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Marketing</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">& Business Dev</p>
				</div>
			{/if}
		</div>
		<nav class="flex-1 flex flex-col space-y-1">
			<a class="flex items-center {isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-3 rounded-xl shadow-sm transition-all duration-200 hover:translate-x-1 {$page.url.pathname === '/marketing' ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/marketing" title="Overview">
				<span class="material-symbols-outlined">dashboard</span>
				{#if isSidebarExpanded}<span class="font-medium text-sm whitespace-nowrap">Overview</span>{/if}
			</a>
			<a class="flex items-center {isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-3 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/marketing/customers') ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/marketing/customers" title="Customers">
				<span class="material-symbols-outlined">group</span>
				{#if isSidebarExpanded}<span class="font-medium text-sm whitespace-nowrap">Customers</span>{/if}
			</a>

			<a class="flex items-center {isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-3 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/marketing/orders') ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/marketing/orders" title="Orders / DO">
				<span class="material-symbols-outlined">receipt_long</span>
				{#if isSidebarExpanded}<span class="font-medium text-sm whitespace-nowrap">Orders / DO</span>{/if}
			</a>
			
			<a class="flex items-center {isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-3 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/marketing/contracts') ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/marketing/contracts" title="Master Kontrak">
				<span class="material-symbols-outlined">handshake</span>
				{#if isSidebarExpanded}<span class="font-medium text-sm whitespace-nowrap">Master Kontrak (PO)</span>{/if}
			</a>

			<!-- Section Divider -->
			<div class="pt-3 pb-1 {isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{isSidebarExpanded ? 'CRM' : '...'}</p>
			</div>

			<a class="flex items-center {isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-3 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/marketing/pipeline') ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/marketing/pipeline" title="Sales Pipeline">
				<span class="material-symbols-outlined">view_kanban</span>
				{#if isSidebarExpanded}<span class="font-medium text-sm whitespace-nowrap">Sales Pipeline</span>{/if}
			</a>

			<!-- Section Divider -->
			<div class="pt-3 pb-1 {isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{isSidebarExpanded ? 'Analytics' : '...'}</p>
			</div>

			<a class="flex items-center {isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-3 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/marketing/reports') ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/marketing/reports" title="Reports">
				<span class="material-symbols-outlined">bar_chart</span>
				{#if isSidebarExpanded}<span class="font-medium text-sm whitespace-nowrap">Reports</span>{/if}
			</a>

			<!-- Spacer -->
			<div class="flex-1"></div>

			<!-- Toggle Button -->
			<button 
				onclick={() => isSidebarExpanded = !isSidebarExpanded} 
				class="mt-4 flex items-center {isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container transition-all duration-200 hover:text-on-surface"
				title={isSidebarExpanded ? 'Collapse Menu' : 'Expand Menu'}
			>
				<span class="material-symbols-outlined transition-transform duration-300 {isSidebarExpanded ? '' : 'rotate-180'}">keyboard_double_arrow_left</span>
				{#if isSidebarExpanded}<span class="font-medium text-sm whitespace-nowrap">Sembunyikan Menu</span>{/if}
			</button>
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
