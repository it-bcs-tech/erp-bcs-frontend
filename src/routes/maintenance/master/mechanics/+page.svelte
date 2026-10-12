<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();
	let mechanics = $derived(data.mechanics || []);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let searchTimer: ReturnType<typeof setTimeout>;

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			const url = new URL(window.location.href);
			if (searchQuery) url.searchParams.set('search', searchQuery);
			else url.searchParams.delete('search');
			goto(url.toString(), { keepFocus: true, noScroll: true });
		}, 300);
	}
</script>

<svelte:head>
	<title>Master Mekanik & Teknisi | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<nav class="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mb-1">
				<a href="/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<span class="text-on-surface font-bold">Master Mekanik</span>
			</nav>
			<h1 class="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2.5">
				<span class="material-symbols-outlined text-primary text-3xl">badge</span>
				Mekanik & Teknisi Bengkel
			</h1>
		</div>

		<div class="flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 w-full sm:w-80">
			<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
			<input 
				type="text" 
				bind:value={searchQuery} 
				oninput={handleSearchInput} 
				placeholder="Cari nama mekanik, NIK..." 
				class="bg-transparent text-xs text-on-surface outline-none w-full"
			/>
		</div>
	</header>

	<!-- Quick Metrics -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
		<div class="p-4 rounded-xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Teknisi</div>
			<div class="text-2xl font-black text-on-surface mt-1 font-mono">{mechanics.length}</div>
		</div>
		<div class="p-4 rounded-xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<div class="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Aktif Menangani SPK</div>
			<div class="text-2xl font-black text-sky-600 mt-1 font-mono">{mechanics.filter(m => m.activeWo > 0).length}</div>
		</div>
		<div class="p-4 rounded-xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<div class="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Siap Ditugaskan</div>
			<div class="text-2xl font-black text-emerald-600 mt-1 font-mono">{mechanics.filter(m => m.activeWo === 0).length}</div>
		</div>
		<div class="p-4 rounded-xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Penanganan SPK</div>
			<div class="text-2xl font-black text-on-surface mt-1 font-mono">{mechanics.reduce((acc, m) => acc + m.totalWo, 0)}</div>
		</div>
	</div>

	<!-- Table -->
	<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead class="bg-surface-container-low text-on-surface-variant text-[11px] font-black uppercase tracking-wider border-b border-slate-200/70 dark:border-slate-800/70">
					<tr>
						<th class="py-3 px-4">Nama Teknisi</th>
						<th class="py-3 px-4">NIK / Payroll ID</th>
						<th class="py-3 px-4">Jabatan & Lokasi</th>
						<th class="py-3 px-4 text-center">SPK Sedang Dikerjakan</th>
						<th class="py-3 px-4 text-center">Total Riwayat SPK</th>
						<th class="py-3 px-4 text-right">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if mechanics.length === 0}
						<tr>
							<td colspan="6" class="py-12 text-center text-xs text-on-surface-variant">
								<span class="material-symbols-outlined text-3xl mb-1 text-slate-400 block">engineering</span>
								Belum ada data mekanik yang ditemukan.
							</td>
						</tr>
					{:else}
						{#each mechanics as m}
							<tr class="hover:bg-surface-container-low/50 transition-colors">
								<td class="py-3.5 px-4">
									<div class="flex items-center gap-2.5">
										<div class="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
											{m.name.charAt(0)}
										</div>
										<div class="font-bold text-xs text-on-surface">{m.name}</div>
									</div>
								</td>
								<td class="py-3.5 px-4 font-mono text-xs text-on-surface-variant">{m.payrollId}</td>
								<td class="py-3.5 px-4">
									<div class="text-xs font-bold text-on-surface">{m.position}</div>
									<div class="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-1">
										<span class="material-symbols-outlined text-[13px]">location_on</span>
										<span>{m.location}</span>
									</div>
								</td>
								<td class="py-3.5 px-4 text-center">
									<span class="font-bold text-xs {m.activeWo > 0 ? 'text-sky-600 font-mono' : 'text-on-surface-variant'}">
										{m.activeWo}
									</span>
								</td>
								<td class="py-3.5 px-4 text-center font-mono text-xs font-semibold text-on-surface">
									{m.totalWo}
								</td>
								<td class="py-3.5 px-4 text-right">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
										{m.status}
									</span>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
