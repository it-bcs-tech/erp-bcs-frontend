<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';

	import { authUser, hasMenuAccess } from '$lib/stores/auth';

	let { data, children } = $props();

	function isActive(path: string) {
		if (path === '/kasir') {
			return $page.url.pathname === '/kasir';
		}
		return $page.url.pathname.startsWith(path);
	}

	const user = $derived($page.data?.user || $authUser);
	const activeShift = $derived(data?.activeShift);
	const counts = $derived(data?.counts || { pendingUjo: 0, pendingDN: 0, pendingClosing: 0 });

	const isAdmin = $derived(
		user && (
			['superadmin', 'administrator', 'superhyperadmin', 'super_admin'].includes(user.role?.toLowerCase()) ||
			user.role?.toLowerCase()?.includes('admin') ||
			user.email === 'superhyperadmin@bcs-logistics.co.id'
		)
	);

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Flat Standard Kasir) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>

		<!-- Branding Header -->
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
					<span class="material-symbols-outlined text-[20px]">point_of_sale</span>
				</div>
				<div>
					<p class="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Cashier</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">& Settlement (Kasir)</p>
				</div>
			</div>
		</div>

		<nav class="flex-1 space-y-1">
			{#if hasMenuAccess(user, 'kasir', 'kasir.overview')}
				<a class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/kasir') ? 'bg-surface-container-highest text-emerald-600 dark:text-emerald-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/kasir">
					<span class="material-symbols-outlined text-[20px]">space_dashboard</span>
					<span class="text-sm">Overview</span>
				</a>
			{/if}

			<!-- Menu Shift & Handover -->
			<a class="flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/kasir/shift') ? 'bg-surface-container-highest text-emerald-600 dark:text-emerald-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/kasir/shift">
				<div class="flex items-center gap-3">
					<span class="material-symbols-outlined text-[20px]">schedule</span>
					<span class="text-sm">Shift & Handover</span>
				</div>
				{#if activeShift}
					<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Shift Aktif"></span>
				{:else}
					<span class="w-2 h-2 rounded-full bg-amber-500" title="Shift Tutup"></span>
				{/if}
			</a>

			{#if hasMenuAccess(user, 'kasir', 'kasir.kas-operasional')}
				<a class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/kasir/kas-operasional') ? 'bg-surface-container-highest text-emerald-600 dark:text-emerald-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/kasir/kas-operasional">
					<span class="material-symbols-outlined text-[20px]">account_balance_wallet</span>
					<span class="text-sm">Kas & Saldo Operasional</span>
				</a>
			{/if}

			{#if hasMenuAccess(user, 'kasir', 'kasir.ujo') || hasMenuAccess(user, 'kasir', 'kasir.surat-jalan') || hasMenuAccess(user, 'kasir', 'kasir.closing')}
				<div class="pt-3 pb-1 px-4">
					<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Fleet Settlements</p>
				</div>
			{/if}

			{#if hasMenuAccess(user, 'kasir', 'kasir.ujo')}
				<a class="flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/kasir/ujo') ? 'bg-surface-container-highest text-emerald-600 dark:text-emerald-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/kasir/ujo">
					<div class="flex items-center gap-3">
						<span class="material-symbols-outlined text-[20px]">payments</span>
						<span class="text-sm">Pencairan UJO</span>
					</div>
					{#if counts.pendingUjo > 0}
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
							{counts.pendingUjo}
						</span>
					{/if}
				</a>
			{/if}
			{#if hasMenuAccess(user, 'kasir', 'kasir.surat-jalan')}
				<a class="flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/kasir/surat-jalan') ? 'bg-surface-container-highest text-emerald-600 dark:text-emerald-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/kasir/surat-jalan">
					<div class="flex items-center gap-3">
						<span class="material-symbols-outlined text-[20px]">edit_document</span>
						<span class="text-sm">Surat Jalan Balik (DN)</span>
					</div>
					{#if counts.pendingDN > 0}
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
							{counts.pendingDN}
						</span>
					{/if}
				</a>
			{/if}
			{#if hasMenuAccess(user, 'kasir', 'kasir.closing')}
				<a class="flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/kasir/closing') ? 'bg-surface-container-highest text-emerald-600 dark:text-emerald-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}" href="/kasir/closing">
					<div class="flex items-center gap-3">
						<span class="material-symbols-outlined text-[20px]">assignment_turned_in</span>
						<span class="text-sm">Closing Kasbon UJO</span>
					</div>
					{#if counts.pendingClosing > 0}
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
							{counts.pendingClosing}
						</span>
					{/if}
				</a>
			{/if}
		</nav>
	</aside>

	<!-- Main Content Canvas -->
	<main class="flex-1 h-full overflow-y-auto p-8 bg-surface">
		<div class="max-w-7xl mx-auto space-y-6">
			<!-- Top Shift Indicator Bar -->
			{#if activeShift}
				<div class="px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-emerald-500/30 flex items-center justify-between text-xs shadow-xs">
					<div class="flex items-center gap-2.5 flex-wrap">
						<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
						<span class="font-bold text-emerald-700 dark:text-emerald-400 font-mono">{activeShift.shiftName} AKTIF</span>
						<span class="text-on-surface-variant">•</span>
						<span class="text-on-surface">Kasir: <strong class="font-bold">{activeShift.cashierName}</strong></span>
						<span class="text-on-surface-variant hidden md:inline">•</span>
						<span class="text-on-surface-variant hidden md:inline">Saldo Kas: <strong class="text-on-surface font-mono font-bold">{formatCurrency(activeShift.expectedClosingCash)}</strong></span>
						<span class="text-on-surface-variant hidden lg:inline">•</span>
						<span class="text-on-surface-variant hidden lg:inline">UJO: <strong class="font-mono text-amber-600 dark:text-amber-400">{activeShift.totalUjoCount}</strong> | DN: <strong class="font-mono text-cyan-600 dark:text-cyan-400">{activeShift.totalDnCount}</strong></span>
					</div>
					<a href="/kasir/shift" class="px-3 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-xs font-bold text-on-surface border border-slate-200/70 dark:border-slate-800/70 transition-colors flex items-center gap-1.5 flex-shrink-0">
						<span class="material-symbols-outlined text-[15px] text-emerald-600">tune</span>
						<span>Shift & Handover</span>
					</a>
				</div>
			{:else}
				<div class="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
					<div class="flex items-center gap-2 text-amber-800 dark:text-amber-300">
						<span class="material-symbols-outlined text-base text-amber-600">lock_open</span>
						<span class="font-bold">Shift Kasir Belum Dibuka:</span>
						<span class="hidden sm:inline text-on-surface-variant">Buka shift untuk memproses pencairan UJO dan validasi Surat Jalan.</span>
					</div>
					<a href="/kasir/shift" class="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0">
						<span class="material-symbols-outlined text-[15px]">add_circle</span>
						<span>Buka Shift Baru</span>
					</a>
				</div>
			{/if}

			<!-- Admin-Only Data Source Status Badge -->
			{#if isAdmin}
				<div class="flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 text-xs">
					<div class="flex items-center gap-2 font-medium">
						<span class="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">Mode Admin:</span>
						<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
							<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
							Data Source: Direct Database (Kasir PostgreSQL)
						</span>
					</div>
					<div class="text-[10px] text-on-surface-variant font-mono hidden sm:block">
						Role: {user?.role || 'Admin'}
					</div>
				</div>
			{/if}

			{@render children()}
		</div>
	</main>

	<!-- AI Assistant Chatbot -->
	<Chatbot />
</div>
