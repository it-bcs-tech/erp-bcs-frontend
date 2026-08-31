<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let isModalOpen = $state(false);
	let isSubmitting = $state(false);
	let searchQuery = $state('');

	let filteredProjects = $derived.by(() => {
		if (!searchQuery.trim()) return data.projects || [];
		const q = searchQuery.toLowerCase();
		return (data.projects || []).filter((p: any) =>
			(p.projectName && p.projectName.toLowerCase().includes(q)) ||
			(p.projectCode && p.projectCode.toLowerCase().includes(q)) ||
			(p.siteName && p.siteName.toLowerCase().includes(q)) ||
			(p.remarks && p.remarks.toLowerCase().includes(q))
		);
	});
</script>

<svelte:head>
	<title>Master Project Pengadaan | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">folder_special</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Master Project Pengadaan</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Kategori alokasi biaya pengadaan (Packaging, Transport, Warehouse, Supporting Projects)
			</p>
		</div>
		<button
			type="button"
			onclick={() => isModalOpen = true}
			class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Tambah Project Baru</span>
		</button>
	</header>

	<!-- Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between gap-4">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari kode project, nama project, site, atau keterangan..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Total: <strong class="text-on-surface">{filteredProjects.length}</strong> project
		</span>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<table class="w-full text-left text-sm">
			<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
				<tr>
					<th class="py-3.5 px-5">Project Code</th>
					<th class="py-3.5 px-5">Nama Project</th>
					<th class="py-3.5 px-5">Site & Alias</th>
					<th class="py-3.5 px-5">Kategori</th>
					<th class="py-3.5 px-5">Remarks / Keterangan</th>
					<th class="py-3.5 px-5 text-center">Status</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
				{#if filteredProjects.length === 0}
					<tr>
						<td colspan="6" class="py-12 text-center text-on-surface-variant">
							<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">folder_special</span>
							<p class="text-xs font-semibold">Tidak ada project yang cocok.</p>
						</td>
					</tr>
				{:else}
					{#each filteredProjects as p}
						<tr class="hover:bg-surface-container-high/40 transition-colors">
							<td class="py-3.5 px-5">
								<span class="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs border border-amber-200 dark:border-amber-800">
									{p.projectCode}
								</span>
							</td>
							<td class="py-3.5 px-5 font-bold text-on-surface text-sm">{p.projectName}</td>
							<td class="py-3.5 px-5">
								<p class="font-semibold text-on-surface">{p.siteName}</p>
								<p class="text-[10px] text-on-surface-variant">({p.siteAlias})</p>
							</td>
							<td class="py-3.5 px-5">
								<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-on-surface-variant">
									{p.category}
								</span>
							</td>
							<td class="py-3.5 px-5 text-on-surface-variant max-w-xs">{p.remarks}</td>
							<td class="py-3.5 px-5 text-center">
								<span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border {p.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-700 border-slate-300'}">
									<span class="w-1.5 h-1.5 rounded-full {p.is_active ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
									{p.is_active ? 'Aktif' : 'Non-Aktif'}
								</span>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<!-- Modal Tambah Project -->
{#if isModalOpen}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">folder_special</span>
					<h3 class="text-base font-extrabold text-on-surface">Tambah Project Baru</h3>
				</div>
				<button type="button" onclick={() => isModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/save" use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						isModalOpen = false;
						update();
					} else {
						alert(result.data?.message || 'Terjadi kesalahan');
					}
				};
			}}>
				<div class="p-6 space-y-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Project Code
						</label>
						<input
							type="text"
							name="projectCode"
							placeholder="Misal: PRJ-WHS-01 (Opsional)"
							class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none uppercase"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Nama Project <span class="text-rose-500">*</span>
						</label>
						<input
							type="text"
							name="projectName"
							required
							placeholder="Misal: Proyek Pengadaan Pallet & Plastik Wrapping"
							class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Alokasi Site Gudang
						</label>
						<select
							name="siteId"
							class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="">-- Semua Site / Bebas --</option>
							{#each data.sites as site}
								<option value={site.id}>{site.loc_name} ({site.alias})</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Remarks / Deskripsi
						</label>
						<textarea
							name="remarks"
							rows="2"
							placeholder="Keterangan alokasi project..."
							class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none resize-none"
						></textarea>
					</div>
				</div>

				<div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-surface-container-low flex justify-end gap-3">
					<button
						type="button"
						onclick={() => isModalOpen = false}
						class="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
							<span>Menyimpan...</span>
						{:else}
							<span class="material-symbols-outlined text-sm">save</span>
							<span>Simpan Project</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
