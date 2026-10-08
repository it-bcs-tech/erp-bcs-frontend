<script lang="ts">
	import { page } from '$app/stores';
	import { authUser, hasMenuAccess } from '$lib/stores/auth';

	let { children } = $props();

	let isMobileDrawerOpen = $state(false);

	const user = $derived($page.data?.user || $authUser);
	const isAdmin = $derived(
		user && (
			['superadmin', 'administrator', 'superhyperadmin', 'super_admin'].includes(user.role?.toLowerCase()) ||
			user.role?.toLowerCase()?.includes('admin') ||
			user.email === 'superhyperadmin@bcs-logistics.co.id'
		)
	);

	function isActive(path: string, exact: boolean = false) {
		const current = $page.url.pathname;
		if (exact) return current === path;
		return current.startsWith(path);
	}
</script>

<!-- Snippet Menu Navigasi Bersama (Digunakan di Desktop & Mobile Drawer) -->
{#snippet navMenu(isMobile: boolean = false)}
	<!-- Branding Header -->
	<div class="px-3 py-4 mb-1 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
				<span class="material-symbols-outlined text-[20px]">build_circle</span>
			</div>
			<div>
				<p class="text-sm font-black text-on-surface uppercase tracking-wider">Maintenance</p>
				<p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-tight">Workshop & Inspection</p>
			</div>
		</div>

		{#if isMobile}
			<button 
				type="button" 
				onclick={() => isMobileDrawerOpen = false}
				class="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
				aria-label="Tutup Menu"
			>
				<span class="material-symbols-outlined text-[20px]">close</span>
			</button>
		{/if}
	</div>

	<nav class="flex-1 space-y-1">
		<!-- Section: Overview -->
		{#if isAdmin || hasMenuAccess(user, 'maintenance', 'maintenance.dashboard')}
			<a 
				onclick={() => { if (isMobile) isMobileDrawerOpen = false; }}
				class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 {isActive('/maintenance', true) || isActive('/maintenance/dashboard') ? 'bg-surface-container-highest text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" 
				href="/maintenance"
			>
				<span class="material-symbols-outlined text-[20px]">dashboard</span>
				<span class="text-sm">Dashboard Overview</span>
			</a>
		{/if}
		
		<!-- Section Divider: Transactions -->
		{#if isAdmin || hasMenuAccess(user, 'maintenance', 'maintenance.inspections') || hasMenuAccess(user, 'maintenance', 'maintenance.work-orders') || hasMenuAccess(user, 'maintenance', 'maintenance.schedules')}
			<div class="pt-3 pb-1 px-3">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Workshop Operations</p>
			</div>
		{/if}

		{#if isAdmin || hasMenuAccess(user, 'maintenance', 'maintenance.inspections')}
			<a 
				onclick={() => { if (isMobile) isMobileDrawerOpen = false; }}
				class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 {isActive('/maintenance/transactions/inspections') || isActive('/maintenance/inspections') ? 'bg-surface-container-highest text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" 
				href="/maintenance/transactions/inspections"
			>
				<span class="material-symbols-outlined text-[20px]">assignment_turned_in</span>
				<span class="text-sm">Inspeksi Armada (P2H)</span>
			</a>
		{/if}

		{#if isAdmin || hasMenuAccess(user, 'maintenance', 'maintenance.work-orders')}
			<a 
				onclick={() => { if (isMobile) isMobileDrawerOpen = false; }}
				class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 {isActive('/maintenance/transactions/work-orders') || isActive('/maintenance/work-orders') ? 'bg-surface-container-highest text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" 
				href="/maintenance/transactions/work-orders"
			>
				<span class="material-symbols-outlined text-[20px]">engineering</span>
				<span class="text-sm">Work Orders (SPK)</span>
			</a>
		{/if}

		{#if isAdmin || hasMenuAccess(user, 'maintenance', 'maintenance.schedules')}
			<a 
				onclick={() => { if (isMobile) isMobileDrawerOpen = false; }}
				class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 {isActive('/maintenance/transactions/schedules') ? 'bg-surface-container-highest text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" 
				href="/maintenance/transactions/schedules"
			>
				<span class="material-symbols-outlined text-[20px]">event_repeat</span>
				<span class="text-sm">Jadwal Servis (PM)</span>
			</a>
		{/if}

		<!-- Section Divider: Master Data -->
		{#if isAdmin || hasMenuAccess(user, 'maintenance', 'maintenance.master-mechanics') || hasMenuAccess(user, 'maintenance', 'maintenance.master-categories')}
			<div class="pt-3 pb-1 px-3">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Master Data</p>
			</div>
		{/if}

		{#if isAdmin || hasMenuAccess(user, 'maintenance', 'maintenance.master-mechanics')}
			<a 
				onclick={() => { if (isMobile) isMobileDrawerOpen = false; }}
				class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 {isActive('/maintenance/master/mechanics') ? 'bg-surface-container-highest text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" 
				href="/maintenance/master/mechanics"
			>
				<span class="material-symbols-outlined text-[20px]">badge</span>
				<span class="text-sm">Mekanik & Teknisi</span>
			</a>
		{/if}

		{#if isAdmin || hasMenuAccess(user, 'maintenance', 'maintenance.master-categories')}
			<a 
				onclick={() => { if (isMobile) isMobileDrawerOpen = false; }}
				class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 {isActive('/maintenance/master/service-categories') ? 'bg-surface-container-highest text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" 
				href="/maintenance/master/service-categories"
			>
				<span class="material-symbols-outlined text-[20px]">category</span>
				<span class="text-sm">Kategori Servis</span>
			</a>
		{/if}

		<!-- Section Divider: Reports -->
		{#if isAdmin || hasMenuAccess(user, 'maintenance', 'maintenance.reports-history') || hasMenuAccess(user, 'maintenance', 'maintenance.reports-costs')}
			<div class="pt-3 pb-1 px-3">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Laporan & Analitik</p>
			</div>
		{/if}

		{#if isAdmin || hasMenuAccess(user, 'maintenance', 'maintenance.reports-history')}
			<a 
				onclick={() => { if (isMobile) isMobileDrawerOpen = false; }}
				class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 {isActive('/maintenance/reports/history') ? 'bg-surface-container-highest text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" 
				href="/maintenance/reports/history"
			>
				<span class="material-symbols-outlined text-[20px]">history</span>
				<span class="text-sm">Riwayat Servis Armada</span>
			</a>
		{/if}

		{#if isAdmin || hasMenuAccess(user, 'maintenance', 'maintenance.reports-costs')}
			<a 
				onclick={() => { if (isMobile) isMobileDrawerOpen = false; }}
				class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 {isActive('/maintenance/reports/costs') ? 'bg-surface-container-highest text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" 
				href="/maintenance/reports/costs"
			>
				<span class="material-symbols-outlined text-[20px]">payments</span>
				<span class="text-sm">Analisis Biaya Servis</span>
			</a>
		{/if}
	</nav>
{/snippet}

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar Desktop (Hanya muncul di Layar LG ke atas) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex-col p-4 gap-2 z-40 relative overflow-y-auto hidden lg:flex">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		{@render navMenu(false)}
	</aside>

	<!-- Mobile Drawer Off-Canvas (Untuk Layar HP & Tablet < LG) -->
	{#if isMobileDrawerOpen}
		<!-- Backdrop -->
		<div 
			class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden"
			onclick={() => isMobileDrawerOpen = false}
			onkeydown={(e) => { if (e.key === 'Escape') isMobileDrawerOpen = false; }}
			role="button"
			tabindex="0"
			aria-label="Tutup Drawer"
		></div>

		<!-- Drawer Container -->
		<aside class="fixed inset-y-0 left-0 w-72 max-w-[85vw] h-full bg-surface-container-low flex flex-col p-4 gap-2 z-50 shadow-2xl overflow-y-auto lg:hidden animate-in slide-in-from-left duration-200">
			{@render navMenu(true)}
		</aside>
	{/if}

	<!-- Main Content Canvas (Standardized ERP BCS Canvas Wrapper - Mobile First) -->
	<main class="flex-1 h-full overflow-y-auto p-2.5 sm:p-5 lg:p-8 bg-surface">
		<div class="max-w-7xl mx-auto space-y-4">
			<!-- Mobile Top Bar with Hamburger Toggle (Layar HP & Tablet < LG) -->
			<div class="flex lg:hidden items-center justify-between p-2 rounded-xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70">
				<button 
					type="button" 
					onclick={() => isMobileDrawerOpen = true}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-colors"
					aria-label="Buka Menu Maintenance"
				>
					<span class="material-symbols-outlined text-[18px] text-primary">menu</span>
					<span>Menu Modul</span>
				</button>

				<div class="flex items-center gap-1.5 text-xs font-black text-on-surface uppercase tracking-wider">
					<span class="material-symbols-outlined text-primary text-[18px]">build_circle</span>
					<span>Maintenance</span>
				</div>

				<div class="w-10"></div>
			</div>

			<!-- Admin-Only Data Source Status Badge (Hanya Desktop) -->
			{#if isAdmin}
				<div class="hidden sm:flex items-center justify-between px-3.5 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs">
					<div class="flex items-center gap-2 font-medium">
						<span class="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">Mode Admin:</span>
						<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
							<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
							Direct Database (PostgreSQL Live)
						</span>
					</div>
					<div class="text-[10px] text-on-surface-variant font-mono flex items-center gap-3">
						<span>Module: <b>maintenance</b></span>
						<span>Role: <b>{user?.role || 'Admin'}</b></span>
					</div>
				</div>
			{/if}

			{@render children?.()}
		</div>
	</main>
</div>
