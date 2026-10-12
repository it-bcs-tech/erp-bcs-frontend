<script lang="ts">
	import { page } from '$app/stores';
	import { authUser } from '$lib/stores/auth';

	let { data, children } = $props();

	const user = $derived($page.data?.user || $authUser);

	function isActive(path: string) {
		if (path === '/p2h') {
			return $page.url.pathname === '/p2h';
		}
		return $page.url.pathname.startsWith(path);
	}

	let isDark = $state(false);

	$effect(() => {
		if (typeof window !== 'undefined') {
			isDark = document.documentElement.classList.contains('dark');
		}
	});

	function toggleTheme() {
		if (typeof window !== 'undefined') {
			isDark = !isDark;
			if (isDark) {
				document.documentElement.classList.add('dark');
				localStorage.setItem('theme', 'dark');
			} else {
				document.documentElement.classList.remove('dark');
				localStorage.setItem('theme', 'light');
			}
		}
	}
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
	<title>BCS P2H Mobile - Inspeksi Armada</title>
</svelte:head>

<div class="min-h-screen bg-slate-100 dark:bg-slate-950 flex justify-center">
	<!-- App Container (Mobile viewport 100%, Centered on Tablet/Desktop) -->
	<div class="w-full max-w-xl min-h-screen bg-surface flex flex-col relative shadow-2xl border-x border-slate-200/80 dark:border-slate-800/80">
		
		<!-- Sticky Top Header -->
		<header class="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3 flex items-center justify-between">
			<div class="flex items-center gap-2.5">
				<a href="/p2h" class="flex items-center gap-2 group">
					<div class="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black text-sm shadow-xs">
						<span class="material-symbols-outlined text-[20px]">fact_check</span>
					</div>
					<div>
						<div class="flex items-center gap-1.5">
							<span class="text-xs font-black tracking-wider text-on-surface uppercase">P2H Mobile</span>
							<span class="px-1.5 py-0.2 rounded text-[9px] font-black bg-primary/10 text-primary">BCS</span>
						</div>
						<p class="text-[10px] text-on-surface-variant font-medium leading-none">Inspeksi Kendaraan</p>
					</div>
				</a>
			</div>

			<div class="flex items-center gap-1.5">
				<!-- Theme Toggle -->
				<button 
					type="button" 
					onclick={toggleTheme} 
					class="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
					title="Ganti Tema"
				>
					<span class="material-symbols-outlined text-[18px]">
						{isDark ? 'light_mode' : 'dark_mode'}
					</span>
				</button>

				<!-- Back to Desktop ERP Button -->
				<a 
					href="/maintenance/transactions/inspections" 
					class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-[11px] font-bold text-on-surface border border-slate-200 dark:border-slate-800 transition-all"
					title="Beralih ke tampilan modul ERP desktop"
				>
					<span class="material-symbols-outlined text-[15px]">desktop_windows</span>
					<span class="hidden sm:inline">ERP Desktop</span>
				</a>
			</div>
		</header>

		<!-- Main Content Area -->
		<main class="flex-1 pb-24">
			{@render children()}
		</main>

		<!-- Fixed Bottom Navigation Bar -->
		<nav class="fixed bottom-0 z-40 w-full max-w-xl bg-surface/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-lg">
			<!-- Tab 1: Beranda -->
			<a 
				href="/p2h" 
				class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all {isActive('/p2h') && !$page.url.pathname.includes('/create') ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-[22px] {isActive('/p2h') && !$page.url.pathname.includes('/create') ? 'fill-1' : ''}">home</span>
				<span class="text-[10px] mt-0.5">Beranda</span>
			</a>

			<!-- Tab 2: Tombol Tengah Tambah P2H (Hero Action) -->
			<a 
				href="/p2h/create" 
				class="flex flex-col items-center justify-center -mt-5"
			>
				<div class="w-12 h-12 rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
					<span class="material-symbols-outlined text-[26px]">add</span>
				</div>
				<span class="text-[10px] font-bold text-primary mt-1">P2H Baru</span>
			</a>

			<!-- Tab 3: Daftar / Riwayat -->
			<a 
				href="/maintenance/transactions/inspections" 
				class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all text-on-surface-variant hover:text-on-surface"
			>
				<span class="material-symbols-outlined text-[22px]">list_alt</span>
				<span class="text-[10px] mt-0.5">Daftar Full</span>
			</a>
		</nav>

	</div>
</div>
