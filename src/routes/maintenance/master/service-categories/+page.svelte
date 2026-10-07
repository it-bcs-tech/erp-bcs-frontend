<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let categories = $derived(data.categories || []);
</script>

<svelte:head>
	<title>Master Kategori Servis | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header>
		<nav class="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mb-1">
			<a href="/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
			<span class="material-symbols-outlined text-[14px]">chevron_right</span>
			<span class="text-on-surface font-bold">Master Kategori Servis</span>
		</nav>
		<h1 class="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2.5">
			<span class="material-symbols-outlined text-primary text-3xl">category</span>
			Kategori Perawatan & Servis Armada
		</h1>
	</header>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each categories as cat}
			<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-3 hover:border-primary/40 transition-all flex flex-col justify-between">
				<div class="space-y-1.5">
					<div class="flex items-center justify-between">
						<span class="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-surface-container text-primary">
							{cat.code}
						</span>
						{#if cat.activeWo > 0}
							<span class="text-[10px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
								{cat.activeWo} SPK Aktif
							</span>
						{/if}
					</div>
					<h3 class="text-sm font-black text-on-surface">{cat.name}</h3>
					<p class="text-xs text-on-surface-variant line-clamp-2">{cat.desc}</p>
				</div>

				<div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
					<span class="text-on-surface-variant text-[11px]">Total SPK Riwayat:</span>
					<span class="font-mono font-bold text-on-surface">{cat.totalWo}</span>
				</div>
			</div>
		{/each}
	</div>
</div>
