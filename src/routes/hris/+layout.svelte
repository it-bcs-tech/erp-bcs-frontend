<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';
	import { authUser, hasMenuAccess } from '$lib/stores/auth';
	import { isSidebarExpanded } from '$lib/stores/sidebar';

	let { children } = $props();

	function isActive(path: string) {
		if (path === '/hris') {
			return $page.url.pathname === '/hris';
		}
		return $page.url.pathname.startsWith(path);
	}

	const user = $derived($page.data?.user || $authUser);
	const isAdmin = $derived(
		user && (
			['superadmin', 'administrator', 'superhyperadmin', 'super_admin'].includes(user.role?.toLowerCase()) ||
			user.role?.toLowerCase()?.includes('admin') ||
			user.email === 'superhyperadmin@bcs-logistics.co.id'
		)
	);

	const currentPath = $derived($page.url.pathname);
	const isLaravelConnected = $derived(
		!currentPath.startsWith('/hris/lms') &&
		!currentPath.startsWith('/hris/assessments') &&
		!currentPath.startsWith('/hris/org-chart') &&
		!currentPath.startsWith('/hris/certifications') &&
		!currentPath.startsWith('/hris/recruitment')
	);
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Flat Standard HRIS) -->
	<aside class="{$isSidebarExpanded ? 'w-64' : 'w-20'} transition-all duration-300 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto overflow-x-hidden">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<!-- Branding Header -->
		<div class="px-2 py-6 mb-2 flex items-center {$isSidebarExpanded ? 'gap-3' : 'justify-center'}">
			<div class="w-10 h-10 flex-shrink-0 bg-primary-container/80 rounded-xl flex items-center justify-center text-primary border border-primary/20">
				<span class="material-symbols-outlined text-[20px]">group</span>
			</div>
			{#if $isSidebarExpanded}
				<div class="whitespace-nowrap transition-opacity duration-300">
					<p class="text-sm font-black text-primary uppercase tracking-wider">Human Capital</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">Management System</p>
				</div>
			{/if}
		</div>

		<nav class="flex-1 flex flex-col space-y-1">
			{#if hasMenuAccess(user, 'hris', 'hris.overview')}
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris') && $page.url.pathname === '/hris'
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris"
				title="Dashboard"
			>
				<span class="material-symbols-outlined text-[20px]">dashboard</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Dashboard</span>{/if}
			</a>
			{/if}

			<!-- Section: Personnel & Careers -->
			{#if hasMenuAccess(user, 'hris', 'hris.employees') || hasMenuAccess(user, 'hris', 'hris.recruitment') || hasMenuAccess(user, 'hris', 'hris.lifecycle')}
			<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Personnel & Careers' : '...'}</p>
			</div>
			{/if}

			{#if hasMenuAccess(user, 'hris', 'hris.employees')}
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/employees')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/employees"
				title="Employees"
			>
				<span class="material-symbols-outlined text-[20px]">badge</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Employees</span>{/if}
			</a>
			{/if}

			{#if hasMenuAccess(user, 'hris', 'hris.recruitment')}
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/recruitment')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/recruitment"
				title="Recruitment & ATS"
			>
				<span class="material-symbols-outlined text-[20px]">person_search</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Recruitment & ATS</span>{/if}
			</a>
			{/if}

			{#if hasMenuAccess(user, 'hris', 'hris.lifecycle')}
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/lifecycle')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/lifecycle"
				title="Lifecycle & Actions"
			>
				<span class="material-symbols-outlined text-[20px]">manage_accounts</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Lifecycle & Actions</span>{/if}
			</a>
			{/if}

			<!-- Section: Time & Attendance -->
			{#if hasMenuAccess(user, 'hris', 'hris.attendance') || hasMenuAccess(user, 'hris', 'hris.leave')}
			<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Time & Attendance' : '...'}</p>
			</div>
			{/if}

			{#if hasMenuAccess(user, 'hris', 'hris.attendance')}
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/attendance')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/attendance"
				title="Attendance"
			>
				<span class="material-symbols-outlined text-[20px]">how_to_reg</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Attendance</span>{/if}
			</a>
			{/if}

			{#if hasMenuAccess(user, 'hris', 'hris.leave')}
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/leave')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/leave"
				title="Leave Requests"
			>
				<span class="material-symbols-outlined text-[20px]">pending_actions</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Leave Requests</span>{/if}
			</a>
			{/if}

			<!-- Section: Compensation & Benefits -->
			{#if hasMenuAccess(user, 'hris', 'hris.payroll') || hasMenuAccess(user, 'hris', 'hris.loans')}
			<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Compensation & Benefits' : '...'}</p>
			</div>
			{/if}

			{#if hasMenuAccess(user, 'hris', 'hris.payroll')}
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/payroll') && !isActive('/hris/payroll/loans')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/payroll"
				title="Payroll & Slips"
			>
				<span class="material-symbols-outlined text-[20px]">payments</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Payroll & Slips</span>{/if}
			</a>
			{/if}

			{#if hasMenuAccess(user, 'hris', 'hris.loans')}
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/payroll/loans')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/payroll/loans"
				title="Employee Loans"
			>
				<span class="material-symbols-outlined text-[20px]">account_balance_wallet</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Employee Loans</span>{/if}
			</a>
			{/if}

			<!-- Section: Talent & Organization -->
			{#if hasMenuAccess(user, 'hris', 'hris.performance') || hasMenuAccess(user, 'hris', 'hris.assessments') || hasMenuAccess(user, 'hris', 'hris.lms') || hasMenuAccess(user, 'hris', 'hris.org-chart') || hasMenuAccess(user, 'hris', 'hris.certifications')}
			<div class="pt-3 pb-1 {$isSidebarExpanded ? 'px-4' : 'px-0 text-center'}">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">{$isSidebarExpanded ? 'Talent & Organization' : '...'}</p>
			</div>
			{/if}

			{#if hasMenuAccess(user, 'hris', 'hris.performance')}
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/performance')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/performance"
				title="Performance & KPI"
			>
				<span class="material-symbols-outlined text-[20px]">assessment</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Performance & KPI</span>{/if}
			</a>
			{/if}

			{#if hasMenuAccess(user, 'hris', 'hris.assessments')}
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/assessments')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/assessments"
				title="Team Competency Assessment"
			>
				<span class="material-symbols-outlined text-[20px]">fact_check</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Team Competency Assessment</span>{/if}
			</a>
			{/if}

			{#if hasMenuAccess(user, 'hris', 'hris.lms')}
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/lms')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/lms"
				title="LMS & Training"
			>
				<span class="material-symbols-outlined text-[20px]">school</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">LMS & Training</span>{/if}
			</a>
			{/if}

			{#if hasMenuAccess(user, 'hris', 'hris.org-chart')}
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/org-chart')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/org-chart"
				title="Org Chart & Hierarchy"
			>
				<span class="material-symbols-outlined text-[20px]">account_tree</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Org Chart & Hierarchy</span>{/if}
			</a>
			{/if}

			{#if hasMenuAccess(user, 'hris', 'hris.certifications')}
			<a
				class="flex items-center {$isSidebarExpanded ? 'justify-start px-4' : 'justify-center'} gap-3 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/certifications')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/certifications"
				title="Document Expiry & Certs"
			>
				<span class="material-symbols-outlined text-[20px]">verified</span>
				{#if $isSidebarExpanded}<span class="text-sm whitespace-nowrap">Document Expiry & Certs</span>{/if}
			</a>
			{/if}

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
		<div class="max-w-7xl mx-auto space-y-4">
			<!-- Admin-Only Data Source Status Badge -->
			{#if isAdmin}
				<div class="flex items-center justify-between px-4 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs shadow-2xs">
					<div class="flex items-center gap-2 font-medium">
						<span class="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">Mode Admin:</span>
						{#if isLaravelConnected}
							<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
								Backend: Laravel API v1 (Live & Tanpa Fallback)
							</span>
						{:else}
							<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
								<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
								Belum Terhubung ke Laravel (Direct DB / Standalone)
							</span>
						{/if}
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
