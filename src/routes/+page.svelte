<script lang="ts">
	import ModuleCard from '$lib/components/ModuleCard.svelte';
	import { authUser, hasModuleAccess, getRoleLabel } from '$lib/stores/auth';
	import { page } from '$app/stores';
	import { fade } from 'svelte/transition';
	
	const modules = [
		{ id: 'fms', title: 'FMS', subtitle: 'Fleet Management', icon: 'precision_manufacturing', colorClass: 'bg-blue-50', textClass: 'text-blue-600' },
		{ id: 'maintenance', title: 'Maintenance', subtitle: 'Workshop & Inspections', icon: 'build_circle', colorClass: 'bg-slate-100', textClass: 'text-slate-700' },
		{ id: 'ocs', title: 'OCS', subtitle: 'Operations Hub', icon: 'hub', colorClass: 'bg-sky-50', textClass: 'text-sky-600' },
		{ id: 'hris', title: 'HRIS', subtitle: 'Human Capital', icon: 'groups', colorClass: 'bg-purple-50', textClass: 'text-purple-600' },
		{ id: 'marketing', title: 'Marketing', subtitle: 'Growth Engine', icon: 'campaign', colorClass: 'bg-rose-50', textClass: 'text-rose-600' },
		{ id: 'pms', title: 'PMS', subtitle: 'Procurement', icon: 'inventory', colorClass: 'bg-amber-50', textClass: 'text-amber-600' },
		{ id: 'kasir', title: 'Kasir', subtitle: 'Cash & Payment', icon: 'point_of_sale', colorClass: 'bg-emerald-50', textClass: 'text-emerald-600' },
		{ id: 'finance', title: 'Finance', subtitle: 'Economic Control', icon: 'account_balance', colorClass: 'bg-teal-50', textClass: 'text-teal-600' },
		{ id: 'dms', title: 'DMS', subtitle: 'Document Asset', icon: 'folder_managed', colorClass: 'bg-indigo-50', textClass: 'text-indigo-600' },
		{ id: 'qhse', title: 'QHSE', subtitle: 'Quality & Safety', icon: 'verified_user', colorClass: 'bg-orange-50', textClass: 'text-orange-600' }
	];

	// Cek access_denied parameter dari URL
	const accessDenied = $derived($page.url.searchParams.get('access_denied'));
	let showAccessDenied = $state(false);

	$effect(() => {
		if (accessDenied) {
			showAccessDenied = true;
			// Hapus parameter dari URL setelah 4 detik
			setTimeout(() => {
				showAccessDenied = false;
				const url = new URL(window.location.href);
				url.searchParams.delete('access_denied');
				window.history.replaceState({}, '', url.toString());
			}, 4000);
		}
	});

	// Reactive user state
	const user = $derived($authUser);
</script>

<main class="min-h-[calc(100vh-130px)] flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
	<!-- Subtle Architectural Background Texture -->
	<div class="absolute inset-0 z-0 pointer-events-none opacity-20">
		<div class="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-primary-fixed/30 to-transparent rounded-full blur-3xl"></div>
		<div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-secondary-container/20 to-transparent rounded-full blur-3xl"></div>
	</div>

	<!-- Access Denied Toast -->
	{#if showAccessDenied}
		<div 
			transition:fade={{ duration: 300 }}
			class="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 max-w-md"
		>
			<span class="material-symbols-outlined text-red-500">block</span>
			<div>
				<p class="font-bold text-sm">Akses Ditolak</p>
				<p class="text-xs mt-0.5">Anda tidak memiliki hak akses ke modul <strong class="uppercase">{accessDenied}</strong>. Hubungi Administrator.</p>
			</div>
		</div>
	{/if}

	<div class="w-full max-w-5xl z-10">
		<header class="mb-12 text-center">
			<h1 class="text-4xl font-extrabold text-primary tracking-tight mb-3">
				{#if user}
					Selamat Datang, {user.name}
				{:else}
					Welcome, BCS Logistics
				{/if}
			</h1>
			<p class="text-on-surface-variant font-medium">
				{#if user}
					{getRoleLabel(user.role)} — {user.division}
				{:else}
					Select a module to begin your workspace orchestration
				{/if}
			</p>
		</header>

		<!-- Module App Switcher Grid -->
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
			{#each modules as mod}
				{@const canAccess = user ? hasModuleAccess(user, mod.id) : true}
				{@const disabledReason = !canAccess 
					? (mod.id === 'ocs' && user && user.levelSequence < 4
						? 'Level akses tidak mencukupi (min. Supervisor)'
						: 'Akses Terbatas — Hubungi Administrator') 
					: ''}
				<ModuleCard 
					title={mod.title}
					subtitle={mod.subtitle}
					icon={mod.icon}
					colorClass={mod.colorClass}
					textClass={mod.textClass}
					href={'/' + mod.id}
					disabled={!canAccess}
					disabledReason={disabledReason}
				/>
			{/each}

			<!-- Add New Module Placeholder -->
			<button class="group flex flex-col items-center p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-full hover:border-primary/40 hover:bg-white transition-all duration-300 transform active:scale-95">
				<div class="w-20 h-20 mb-4 rounded-full flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors">
					<span class="material-symbols-outlined text-4xl">add_circle</span>
				</div>
				<span class="text-slate-400 font-semibold group-hover:text-primary transition-colors">Add Module</span>
				<span class="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Extensions</span>
			</button>
		</div>

		<!-- Dashboard Insights (Bento Style) -->
		<div class="mt-20 grid grid-cols-1 md:grid-cols-4 gap-6">
			<div class="md:col-span-2 p-8 bg-surface-container-lowest rounded-full shadow-sm">
				<div class="flex items-center gap-4 mb-6">
					<div class="p-3 bg-primary-fixed rounded-xl">
						<span class="material-symbols-outlined text-primary">auto_awesome</span>
					</div>
					<h2 class="text-xl font-bold text-on-surface">Architectural Insights</h2>
				</div>
				<div class="space-y-4">
					<div class="p-4 bg-surface-container-low rounded-full flex justify-between items-center">
						<span class="text-sm font-medium text-on-surface-variant">Active FMS Projects</span>
						<span class="text-sm font-bold text-primary">12 Running</span>
					</div>
					<div class="p-4 bg-surface-container-low rounded-full flex justify-between items-center">
						<span class="text-sm font-medium text-on-surface-variant">Pending HR Approvals</span>
						<span class="text-sm font-bold text-primary">04 Pending</span>
					</div>
				</div>
			</div>

			<div class="p-8 bg-[#57344f] rounded-full text-white flex flex-col justify-between">
				<div class="text-xs uppercase tracking-[0.2em] opacity-70 mb-4 font-bold">System Status</div>
				<div class="text-4xl font-extrabold">99.9%</div>
				<div class="flex items-center gap-2 mt-4">
					<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
					<span class="text-xs font-medium">Global Operations Optimal</span>
				</div>
			</div>

			<div class="p-8 bg-surface-container-highest rounded-full flex flex-col items-center justify-center text-center">
				<span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">chat</span>
				<div class="text-sm font-bold text-on-surface">Support Center</div>
				<div class="text-[10px] text-on-surface-variant mt-1">Chat with a System Architect</div>
			</div>
		</div>
	</div>
</main>
