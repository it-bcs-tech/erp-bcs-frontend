<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';
	let { children } = $props();
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (HRIS Specific) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative">
		<!-- Add an subtle gradient overlay to avoid pure 1px border as per guideline -->
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center text-on-primary-container shadow-sm">
					<span class="material-symbols-outlined">group</span>
				</div>
				<div>
					<p class="text-sm font-black text-primary uppercase tracking-wider">Human Capital</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">Dashboard</p>
				</div>
			</div>
		</div>
		<nav class="flex-1 space-y-1">
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-transform duration-200 hover:translate-x-1 {$page.url.pathname === '/hris' ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:bg-surface-container'}" href="/hris">
				<span class="material-symbols-outlined">dashboard</span>
				<span class="font-medium text-sm">Overview</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/hris/employees') ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:bg-surface-container'}" href="/hris/employees">
				<span class="material-symbols-outlined">badge</span>
				<span class="font-medium text-sm">Employees</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/hris/attendance') ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:bg-surface-container'}" href="/hris/attendance">
				<span class="material-symbols-outlined">how_to_reg</span>
				<span class="font-medium text-sm">Attendance</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/hris/leave') ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:bg-surface-container'}" href="/hris/leave">
				<span class="material-symbols-outlined">pending_actions</span>
				<span class="font-medium text-sm">Leave Requests</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/hris/lifecycle') ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:bg-surface-container'}" href="/hris/lifecycle">
				<span class="material-symbols-outlined">manage_accounts</span>
				<span class="font-medium text-sm">Lifecycle & Actions</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/hris/performance') ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:bg-surface-container'}" href="/hris/performance">
				<span class="material-symbols-outlined">assessment</span>
				<span class="font-medium text-sm">Performance</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/hris/payroll') ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:bg-surface-container'}" href="/hris/payroll">
				<span class="material-symbols-outlined">payments</span>
				<span class="font-medium text-sm">Payroll & Slips</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/hris/org-chart') ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:bg-surface-container'}" href="/hris/org-chart">
				<span class="material-symbols-outlined">account_tree</span>
				<span class="font-medium text-sm">Org Chart & Hierarchy</span>
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
