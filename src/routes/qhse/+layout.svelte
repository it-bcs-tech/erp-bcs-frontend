<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';

	let { children } = $props();

	const user = $derived($page.data?.user);
	const isAdmin = $derived(
		user && (
			['superadmin', 'administrator', 'superhyperadmin', 'super_admin'].includes(user.role?.toLowerCase()) ||
			user.role?.toLowerCase()?.includes('admin') ||
			user.email === 'superhyperadmin@bcs-logistics.co.id'
		)
	);

	function isActive(path: string) {
		if (path === '/qhse') {
			return $page.url.pathname === '/qhse';
		}
		return $page.url.pathname.startsWith(path);
	}
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Flat Standard QHSE) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>

		<!-- Branding Header -->
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
					<span class="material-symbols-outlined text-[20px]">verified_user</span>
				</div>
				<div>
					<p class="text-sm font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider">QHSE & Safety</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">K3, Mutu & Lingkungan</p>
				</div>
			</div>
		</div>

		<nav class="flex-1 space-y-1">
			<!-- Overview / Dashboard -->
			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/qhse')
					? 'bg-surface-container-highest text-orange-600 dark:text-orange-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/qhse"
			>
				<span class="material-symbols-outlined text-[20px]">space_dashboard</span>
				<span class="text-sm">Overview & KPI</span>
			</a>

			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Safety Indicators</p>
			</div>

			<!-- Lagging: Incident & CAR -->
			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/qhse/incidents')
					? 'bg-surface-container-highest text-orange-600 dark:text-orange-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/qhse/incidents"
			>
				<span class="material-symbols-outlined text-[20px]">emergency</span>
				<span class="text-sm">Insiden & CAR (Lagging)</span>
			</a>

			<!-- Leading: Inspeksi & Proaktif -->
			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/qhse/inspections')
					? 'bg-surface-container-highest text-orange-600 dark:text-orange-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/qhse/inspections"
			>
				<span class="material-symbols-outlined text-[20px]">fact_check</span>
				<span class="text-sm">Inspeksi & Proaktif (Leading)</span>
			</a>

			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Operations & System</p>
			</div>

			<!-- Enablement & APD -->
			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/qhse/safety-enablement')
					? 'bg-surface-container-highest text-orange-600 dark:text-orange-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/qhse/safety-enablement"
			>
				<span class="material-symbols-outlined text-[20px]">health_and_safety</span>
				<span class="text-sm">Safety Briefing & APD</span>
			</a>

			<!-- Management System & Quality -->
			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/qhse/quality')
					? 'bg-surface-container-highest text-orange-600 dark:text-orange-400 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/qhse/quality"
			>
				<span class="material-symbols-outlined text-[20px]">policy</span>
				<span class="text-sm">SOP & Complain System</span>
			</a>
		</nav>
	</aside>

	<!-- Main Content Canvas -->
	<main class="flex-1 h-full overflow-y-auto p-8 bg-surface">
		<div class="max-w-7xl mx-auto space-y-6">
			<!-- Admin-Only Data Source Status Badge -->
			{#if isAdmin}
				<div class="flex items-center justify-between px-4 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs shadow-2xs">
					<div class="flex items-center gap-2 font-medium">
						<span class="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">Mode Admin:</span>
						<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
							<span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
							Data Source: Direct Database (QHSE PostgreSQL)
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
