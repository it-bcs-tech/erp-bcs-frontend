<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';

	import { authUser, hasMenuAccess } from '$lib/stores/auth';

	let { children } = $props();

	const user = $derived($page.data?.user || $authUser);
	const isAdmin = $derived(
		user && (
			['superadmin', 'administrator', 'superhyperadmin', 'super_admin'].includes(user.role?.toLowerCase()) ||
			user.role?.toLowerCase()?.includes('admin') ||
			user.email === 'superhyperadmin@bcs-logistics.co.id'
		)
	);

	function isActive(path: string) {
		if (path === '/ga') {
			return $page.url.pathname === '/ga';
		}
		return $page.url.pathname.startsWith(path);
	}
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Flat Standard GA) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>

		<!-- Branding Header -->
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-cyan-100 dark:bg-cyan-950/60 rounded-xl flex items-center justify-center text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 shadow-2xs">
					<span class="material-symbols-outlined text-[22px]">domain</span>
				</div>
				<div>
					<p class="text-sm font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">General Affair</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">Aset, Legalitas & Fasilitas</p>
				</div>
			</div>
		</div>

		<nav class="flex-1 space-y-1">
			<!-- Overview / Dashboard -->
			{#if hasMenuAccess(user, 'ga', 'ga.dashboard')}
				<a
					class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/ga')
						? 'bg-surface-container-highest text-cyan-700 dark:text-cyan-300 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/ga"
				>
					<span class="material-symbols-outlined text-[20px]">space_dashboard</span>
					<span class="text-sm">Overview & KPI</span>
				</a>
			{/if}

			{#if hasMenuAccess(user, 'ga', 'ga.assets') || hasMenuAccess(user, 'ga', 'ga.permits')}
				<div class="pt-3 pb-1 px-4">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Tata Kelola Aset</p>
				</div>
			{/if}

			<!-- Master Aset & Inventaris (KR 7.1) -->
			{#if hasMenuAccess(user, 'ga', 'ga.assets')}
				<a
					class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/ga/assets')
						? 'bg-surface-container-highest text-cyan-700 dark:text-cyan-300 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/ga/assets"
				>
					<span class="material-symbols-outlined text-[20px]">inventory_2</span>
					<span class="text-sm">Master Aset (KR 7.1)</span>
				</a>
			{/if}

			<!-- Legalitas & Perizinan Armada (KR 7.2) -->
			{#if hasMenuAccess(user, 'ga', 'ga.permits')}
				<a
					class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/ga/permits')
						? 'bg-surface-container-highest text-cyan-700 dark:text-cyan-300 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/ga/permits"
				>
					<span class="material-symbols-outlined text-[20px]">badge</span>
					<span class="text-sm">Legalitas Armada (KR 7.2)</span>
				</a>
			{/if}

			{#if hasMenuAccess(user, 'ga', 'ga.facilities') || hasMenuAccess(user, 'ga', 'ga.stationery')}
				<div class="pt-3 pb-1 px-4">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Operasional GA</p>
				</div>
			{/if}

			<!-- Facility Maintenance (KR 7.3) -->
			{#if hasMenuAccess(user, 'ga', 'ga.facilities')}
				<a
					class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/ga/facilities')
						? 'bg-surface-container-highest text-cyan-700 dark:text-cyan-300 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/ga/facilities"
				>
					<span class="material-symbols-outlined text-[20px]">home_repair_service</span>
					<span class="text-sm">Facility Maintenance (KR 7.3)</span>
				</a>
			{/if}

			<!-- Request ATK & Perlengkapan (KR 7.4) -->
			{#if hasMenuAccess(user, 'ga', 'ga.stationery')}
				<a
					class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/ga/stationery')
						? 'bg-surface-container-highest text-cyan-700 dark:text-cyan-300 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/ga/stationery"
				>
					<span class="material-symbols-outlined text-[20px]">edit_document</span>
					<span class="text-sm">Request & Stok ATK (KR 7.4)</span>
				</a>
			{/if}

			<!-- Peminjaman Ruangan & Fasilitas (Terhubung Kalender) -->
			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/ga/room-bookings')
					? 'bg-surface-container-highest text-cyan-700 dark:text-cyan-300 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/ga/room-bookings"
			>
				<span class="material-symbols-outlined text-[20px]">meeting_room</span>
				<span class="text-sm">Peminjaman Ruangan</span>
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
						<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
							<span class="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
							Data Source: Direct Database (GA PostgreSQL)
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
