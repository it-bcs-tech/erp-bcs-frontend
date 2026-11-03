<script lang="ts">
	import { page } from '$app/stores';
	import GamaChat from '$lib/components/GamaChat.svelte';

	import { authUser, hasMenuAccess } from '$lib/stores/auth';
	import { isSidebarExpanded } from '$lib/stores/sidebar';

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
	<aside class="{$isSidebarExpanded ? 'w-64' : 'w-20'} transition-all duration-300 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto overflow-x-hidden">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>

		<!-- Branding Header -->
		<div class="px-2 py-6 mb-2 flex items-center {$isSidebarExpanded ? 'gap-3' : 'justify-center'}">
			<div class="w-10 h-10 flex-shrink-0 bg-cyan-100 dark:bg-cyan-950/60 rounded-xl flex items-center justify-center text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 shadow-2xs">
				<span class="material-symbols-outlined text-[22px]">domain</span>
			</div>
			{#if $isSidebarExpanded}
				<div class="whitespace-nowrap transition-opacity duration-300">
					<p class="text-sm font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">General Affair</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">Aset, Fasilitas & Operasional</p>
				</div>
			{/if}
		</div>

		<nav class="flex-1 flex flex-col space-y-1">
			<!-- Overview / Dashboard -->
			{#if hasMenuAccess(user, 'ga', 'ga.dashboard')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/ga')
						? 'bg-surface-container-highest text-cyan-700 dark:text-cyan-300 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/ga"
					title="Dashboard"
				>
					<span class="material-symbols-outlined text-[20px]">space_dashboard</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Dashboard</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'ga', 'ga.assets')}
				<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Asset Management' : '...'}</p>
				</div>

				<!-- Master Aset & Inventaris -->
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/ga/assets')
						? 'bg-surface-container-highest text-cyan-700 dark:text-cyan-300 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/ga/assets"
					title="Master Assets"
				>
					<span class="material-symbols-outlined text-[20px]">inventory_2</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Master Assets</span>{/if}
				</a>
			{/if}

			{#if hasMenuAccess(user, 'ga', 'ga.facilities') || hasMenuAccess(user, 'ga', 'ga.stationery')}
				<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'GA Operations' : '...'}</p>
				</div>
			{/if}

			<!-- Facility Maintenance -->
			{#if hasMenuAccess(user, 'ga', 'ga.facilities')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/ga/facilities')
						? 'bg-surface-container-highest text-cyan-700 dark:text-cyan-300 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/ga/facilities"
					title="Facility Maintenance"
				>
					<span class="material-symbols-outlined text-[20px]">home_repair_service</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Facility Maintenance</span>{/if}
				</a>
			{/if}

			<!-- Request ATK & Perlengkapan -->
			{#if hasMenuAccess(user, 'ga', 'ga.stationery')}
				<a
					class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/ga/stationery')
						? 'bg-surface-container-highest text-cyan-700 dark:text-cyan-300 font-bold'
						: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
					href="/ga/stationery"
					title="Stationery & Stock"
				>
					<span class="material-symbols-outlined text-[20px]">edit_document</span>
					{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Stationery & Stock</span>{/if}
				</a>
			{/if}

			<!-- Peminjaman Ruangan & Fasilitas (Terhubung Kalender) -->
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/ga/room-bookings')
					? 'bg-surface-container-highest text-cyan-700 dark:text-cyan-300 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/ga/room-bookings"
				title="Room Reservations"
			>
				<span class="material-symbols-outlined text-[20px]">meeting_room</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Room Reservations</span>{/if}
			</a>

			<!-- Carpool & Travel (SPD) -->
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/ga/travel')
					? 'bg-surface-container-highest text-cyan-700 dark:text-cyan-300 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/ga/travel"
				title="Carpool & Travel (SPD)"
			>
				<span class="material-symbols-outlined text-[20px]">commute</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Carpool & Travel (SPD)</span>{/if}
			</a>

			<!-- Document Archive -->
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/ga/archives')
					? 'bg-surface-container-highest text-cyan-700 dark:text-cyan-300 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/ga/archives"
				title="Document Archive"
			>
				<span class="material-symbols-outlined text-[20px]">inventory</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Document Archive</span>{/if}
			</a>

			<!-- Visitor & Front Desk -->
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/ga/visitors')
					? 'bg-surface-container-highest text-cyan-700 dark:text-cyan-300 font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/ga/visitors"
				title="Visitor & Front Desk"
			>
				<span class="material-symbols-outlined text-[20px]">badge</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Visitor & Front Desk</span>{/if}
			</a>

			<!-- Spacer -->
			<div class="flex-1"></div>

			<!-- Toggle Button -->
			<button 
				type="button"
				onclick={() => isSidebarExpanded.toggle()} 
				class="mt-4 flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container transition-all duration-200 hover:text-on-surface cursor-pointer"
				title={$isSidebarExpanded ? 'Collapse Menu' : 'Expand Menu'}
			>
				<span class="material-symbols-outlined transition-transform duration-300 {$isSidebarExpanded ? '' : 'rotate-180'}">keyboard_double_arrow_left</span>
				{#if $isSidebarExpanded}<span class="font-medium text-xs whitespace-nowrap">Collapse Sidebar</span>{/if}
			</button>
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

	<!-- GAMA General Affairs AI Assistant -->
	<GamaChat />
</div>
