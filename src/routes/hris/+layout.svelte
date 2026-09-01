<script lang="ts">
	import { page } from '$app/stores';
	import Chatbot from '$lib/components/Chatbot.svelte';

	let { children } = $props();

	function isActive(path: string) {
		if (path === '/hris') {
			return $page.url.pathname === '/hris';
		}
		return $page.url.pathname.startsWith(path);
	}
</script>

<div class="flex h-[calc(100vh-64px)] overflow-hidden bg-surface relative">
	<!-- SideNavBar (Flat Standard HRIS) -->
	<aside class="w-64 flex-shrink-0 h-full bg-surface-container-low flex flex-col p-4 gap-2 z-40 relative overflow-y-auto">
		<div class="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-surface-variant/30 to-transparent"></div>
		
		<!-- Branding Header -->
		<div class="px-4 py-6 mb-2">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-primary-container/80 rounded-xl flex items-center justify-center text-primary border border-primary/20">
					<span class="material-symbols-outlined text-[20px]">group</span>
				</div>
				<div>
					<p class="text-sm font-black text-primary uppercase tracking-wider">Human Capital</p>
					<p class="text-[10px] text-on-surface-variant font-medium uppercase">Management System</p>
				</div>
			</div>
		</div>

		<nav class="flex-1 space-y-1">
			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris') && $page.url.pathname === '/hris'
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris"
			>
				<span class="material-symbols-outlined text-[20px]">dashboard</span>
				<span class="text-sm">Overview</span>
			</a>

			<!-- Section: Personalia & Rekrutmen -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Personalia & Karir</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/employees')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/employees"
			>
				<span class="material-symbols-outlined text-[20px]">badge</span>
				<span class="text-sm">Data Karyawan</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/recruitment')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/recruitment"
			>
				<span class="material-symbols-outlined text-[20px]">person_search</span>
				<span class="text-sm">Recruitment & ATS</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/lifecycle')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/lifecycle"
			>
				<span class="material-symbols-outlined text-[20px]">manage_accounts</span>
				<span class="text-sm">Lifecycle & Mutasi</span>
			</a>

			<!-- Section: Waktu & Kehadiran -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Presensi & Waktu</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/attendance')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/attendance"
			>
				<span class="material-symbols-outlined text-[20px]">how_to_reg</span>
				<span class="text-sm">Presensi & Kehadiran</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/leave')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/leave"
			>
				<span class="material-symbols-outlined text-[20px]">pending_actions</span>
				<span class="text-sm">Pengajuan Cuti</span>
			</a>

			<!-- Section: Kompensasi & Payroll -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Kompensasi & Benefit</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/payroll') && !isActive('/hris/payroll/loans')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/payroll"
			>
				<span class="material-symbols-outlined text-[20px]">payments</span>
				<span class="text-sm">Penggajian & Slip Gaji</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/payroll/loans')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/payroll/loans"
			>
				<span class="material-symbols-outlined text-[20px]">account_balance_wallet</span>
				<span class="text-sm">Pinjaman Kasbon</span>
			</a>

			<!-- Section: Pengembangan & Organisasi -->
			<div class="pt-3 pb-1 px-4">
				<p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Pengembangan & Organisasi</p>
			</div>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/performance')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/performance"
			>
				<span class="material-symbols-outlined text-[20px]">assessment</span>
				<span class="text-sm">KPI & Kinerja</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/lms')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/lms"
			>
				<span class="material-symbols-outlined text-[20px]">school</span>
				<span class="text-sm">LMS & Pelatihan</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/org-chart')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/org-chart"
			>
				<span class="material-symbols-outlined text-[20px]">account_tree</span>
				<span class="text-sm">Struktur Organisasi</span>
			</a>

			<a
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 hover:translate-x-1 {isActive('/hris/certifications')
					? 'bg-surface-container-highest text-primary font-bold'
					: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm'}"
				href="/hris/certifications"
			>
				<span class="material-symbols-outlined text-[20px]">verified</span>
				<span class="text-sm">Sertifikasi & SIM Driver</span>
			</a>
		</nav>
	</aside>

	<!-- Main Content Canvas -->
	<main class="flex-1 h-full overflow-y-auto p-8 bg-surface">
		<div class="max-w-7xl mx-auto space-y-6">
			{@render children?.()}
		</div>
	</main>

	<!-- AI Assistant Chatbot -->
	<Chatbot />
</div>
