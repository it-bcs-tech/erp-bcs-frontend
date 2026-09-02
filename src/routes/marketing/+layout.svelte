<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';

	let { children } = $props();
	let isSidebarExpanded = $state(true);

	const user = $derived($page.data?.user);
	const isAdmin = $derived(
		user && (
			['superadmin', 'administrator', 'superhyperadmin', 'super_admin'].includes(user.role?.toLowerCase()) ||
			user.role?.toLowerCase()?.includes('admin') ||
			user.email === 'superhyperadmin@bcs-logistics.co.id'
		)
	);
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Marketing Specific) -->
	<aside class="{isSidebarExpanded ? 'w-64' : 'w-20'} transition-all duration-300 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto overflow-x-hidden">
		<!-- Gradient border line -->
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<div class="px-2 py-6 mb-2 flex items-center {isSidebarExpanded ? 'gap-3' : 'justify-center'}">
			<div class="w-10 h-10 flex-shrink-0 bg-rose-100 dark:bg-rose-900/50 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
				<span class="material-symbols-outlined text-[20px]">campaign</span>
			</div>
			{#if isSidebarExpanded}
				<div class="whitespace-nowrap transition-opacity duration-300">
					<p class="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Marketing</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">& Contracts</p>
				</div>
			{/if}
		</div>

		<nav class="flex-1 flex flex-col space-y-1">
			<a class="flex items-center {isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname === '/marketing' ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/marketing" title="Overview">
				<span class="material-symbols-outlined text-[20px]">dashboard</span>
				{#if isSidebarExpanded}<span class="text-sm whitespace-nowrap">Overview</span>{/if}
			</a>
			<a class="flex items-center {isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/marketing/customers') ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/marketing/customers" title="Customers">
				<span class="material-symbols-outlined text-[20px]">group</span>
				{#if isSidebarExpanded}<span class="text-sm whitespace-nowrap">Customers</span>{/if}
			</a>

			<a class="flex items-center {isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/marketing/orders') ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/marketing/orders" title="Orders / DO">
				<span class="material-symbols-outlined text-[20px]">receipt_long</span>
				{#if isSidebarExpanded}<span class="text-sm whitespace-nowrap">Orders & Delivery</span>{/if}
			</a>
			
			<a class="flex items-center {isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/marketing/contracts') ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/marketing/contracts" title="Master Kontrak">
				<span class="material-symbols-outlined text-[20px]">handshake</span>
				{#if isSidebarExpanded}<span class="text-sm whitespace-nowrap">Customer Contracts</span>{/if}
			</a>

			<!-- Section Divider: CRM -->
			<div class="pt-3 pb-1 {isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{isSidebarExpanded ? 'CRM & Pipeline' : '...'}</p>
			</div>

			<a class="flex items-center {isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/marketing/pipeline') ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/marketing/pipeline" title="Sales Pipeline">
				<span class="material-symbols-outlined text-[20px]">view_kanban</span>
				{#if isSidebarExpanded}<span class="text-sm whitespace-nowrap">Sales Pipeline</span>{/if}
			</a>

			<!-- Section Divider: Analytics -->
			<div class="pt-3 pb-1 {isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{isSidebarExpanded ? 'Analytics' : '...'}</p>
			</div>

			<a class="flex items-center {isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {$page.url.pathname.includes('/marketing/reports') ? 'bg-surface-container-highest text-rose-600 dark:text-rose-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/marketing/reports" title="Reports">
				<span class="material-symbols-outlined text-[20px]">bar_chart</span>
				{#if isSidebarExpanded}<span class="text-sm whitespace-nowrap">Performance Reports</span>{/if}
			</a>

			<!-- Spacer -->
			<div class="flex-1"></div>

			<!-- Toggle Button -->
			<button 
				onclick={() => isSidebarExpanded = !isSidebarExpanded} 
				class="mt-4 flex items-center {isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container transition-all duration-200 hover:text-on-surface"
				title={isSidebarExpanded ? 'Collapse Menu' : 'Expand Menu'}
			>
				<span class="material-symbols-outlined transition-transform duration-300 {isSidebarExpanded ? '' : 'rotate-180'}">keyboard_double_arrow_left</span>
				{#if isSidebarExpanded}<span class="font-medium text-xs whitespace-nowrap">Collapse Sidebar</span>{/if}
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
						<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
							<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
							Data Source: Direct Database (Marketing PostgreSQL)
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

	<!-- AI Assistant Chatbot -->
	<Chatbot />
</div>
