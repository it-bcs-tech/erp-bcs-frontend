<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';
	let { children } = $props();
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (OCS Specific) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-sky-100 dark:bg-sky-900/50 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-300 shadow-sm border border-sky-200 dark:border-sky-800">
					<span class="material-symbols-outlined text-[20px]">hub</span>
				</div>
				<div>
					<p class="text-sm font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider">OCS</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">Operation Center</p>
				</div>
			</div>
		</div>

		<nav class="flex-1 space-y-1">
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-transform duration-200 hover:translate-x-1 {$page.url.pathname === '/ocs' ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/ocs">
				<span class="material-symbols-outlined">space_dashboard</span>
				<span class="font-medium text-sm">Dashboard</span>
			</a>

			<!-- Section Divider: Operations -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Operations</p>
			</div>

			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/dispatch') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/ocs/dispatch">
				<span class="material-symbols-outlined">assignment</span>
				<span class="font-medium text-sm">Dispatch</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/ujo') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/ocs/ujo">
				<span class="material-symbols-outlined">payments</span>
				<span class="font-medium text-sm">UJO (Uang Jalan)</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/assign-driver') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/ocs/assign-driver">
				<span class="material-symbols-outlined">person_pin</span>
				<span class="font-medium text-sm">Assign Driver</span>
			</a>
			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/daily-targets') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/ocs/daily-targets">
				<span class="material-symbols-outlined">track_changes</span>
				<span class="font-medium text-sm">Target Harian</span>
			</a>
			
			<!-- Section Divider: Master Data -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Master Data</p>
			</div>

			<a class="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform duration-200 hover:translate-x-1 {$page.url.pathname.includes('/ocs/rute') ? 'bg-surface-container-highest text-sky-600 dark:text-sky-400' : 'text-on-surface-variant hover:bg-surface-container'}" href="/ocs/rute">
				<span class="material-symbols-outlined">route</span>
				<span class="font-medium text-sm">Master Rute (UJO)</span>
			</a>
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
