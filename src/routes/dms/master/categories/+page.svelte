<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let isSubmitting = $state(false);
	let isModalOpen = $state(false);
	let searchQuery = $state('');

	let editingCategory = $state<any>(null);

	function openCreateModal() {
		editingCategory = null;
		isModalOpen = true;
	}

	function openEditModal(category: any) {
		editingCategory = { ...category };
		isModalOpen = true;
	}

	let filteredCategories = $derived.by(() => {
		if (!searchQuery.trim()) return data.categories || [];
		const q = searchQuery.toLowerCase();
		return (data.categories || []).filter((c: any) =>
			(c.name && c.name.toLowerCase().includes(q)) ||
			(c.code && c.code.toLowerCase().includes(q)) ||
			(c.description && c.description.toLowerCase().includes(q))
		);
	});
</script>

<svelte:head>
	<title>Master Kategori Dokumen | DMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-2xl">folder_special</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Master Kategori Dokumen</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Klasifikasi dokumen berdasarkan divisi operasional dan lini bisnis (Angkutan, Packaging, Tinplate, Pergudangan, Kepabeanan)
			</p>
		</div>
		<button
			type="button"
			onclick={openCreateModal}
			class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Tambah Kategori Baru</span>
		</button>
	</header>

	<!-- Search Bar & Summary -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between gap-4">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari kode atau nama kategori..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Total: <strong class="text-on-surface">{filteredCategories.length}</strong> kategori
		</span>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<table class="w-full text-left text-sm">
			<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
				<tr>
					<th class="py-3.5 px-5">Kode Kategori</th>
					<th class="py-3.5 px-5">Nama Kategori</th>
					<th class="py-3.5 px-5">Deskripsi / Cakupan Operasional</th>
					<th class="py-3.5 px-5 text-center">Dokumen Terkait</th>
					<th class="py-3.5 px-5 text-center">Status</th>
					<th class="py-3.5 px-5 text-center">Aksi</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
				{#if filteredCategories.length === 0}
					<tr>
						<td colspan="6" class="py-12 text-center text-on-surface-variant">
							<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">folder_off</span>
							<p class="text-xs font-semibold">Tidak ada kategori dokumen yang cocok.</p>
						</td>
					</tr>
				{:else}
					{#each filteredCategories as category}
						<tr class="hover:bg-surface-container-high/40 transition-colors">
							<td class="py-3.5 px-5">
								<span class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs border border-indigo-200 dark:border-indigo-800">
									{category.code}
								</span>
							</td>
							<td class="py-3.5 px-5 font-bold text-on-surface text-sm">
								{category.name}
							</td>
							<td class="py-3.5 px-5 text-on-surface-variant max-w-md">
								{category.description || '-'}
							</td>
							<td class="py-3.5 px-5 text-center">
								<span class="inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-on-surface">
									<span class="material-symbols-outlined text-[14px] text-slate-400">description</span>
									{category.document_count || 0}
								</span>
							</td>
							<td class="py-3.5 px-5 text-center">
								<span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border {category.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}">
									<span class="w-1.5 h-1.5 rounded-full {category.is_active ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
									{category.is_active ? 'Aktif' : 'Non-Aktif'}
								</span>
							</td>
							<td class="py-3.5 px-5 text-center">
								<div class="inline-flex items-center gap-1">
									<button
										type="button"
										onclick={() => openEditModal(category)}
										title="Edit Kategori"
										class="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
									>
										<span class="material-symbols-outlined text-[18px]">edit</span>
									</button>
									<form
										method="POST"
										action="?/toggleActive"
										use:enhance={() => {
											return async ({ update }) => {
												await update();
											};
										}}
										class="inline"
									>
										<input type="hidden" name="id" value={category.id} />
										<button
											type="submit"
											title={category.is_active ? 'Nonaktifkan' : 'Aktifkan'}
											class="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
										>
											<span class="material-symbols-outlined text-[18px]">
												{category.is_active ? 'visibility_off' : 'visibility'}
											</span>
										</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<!-- Modal Tambah / Edit Kategori -->
{#if isModalOpen}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest dark:bg-surface-container-low rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400">folder_special</span>
					<h3 class="text-base font-extrabold text-on-surface">
						{editingCategory ? 'Edit Kategori Dokumen' : 'Tambah Kategori Dokumen'}
					</h3>
				</div>
				<button type="button" onclick={() => isModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/save"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							isModalOpen = false;
							await update();
						} else {
							alert((result as any).data?.message || 'Terjadi kesalahan sistem.');
						}
					};
				}}
				class="p-6 space-y-4 text-xs font-semibold text-on-surface-variant"
			>
				{#if editingCategory?.id}
					<input type="hidden" name="id" value={editingCategory.id} />
				{/if}

				<div>
					<label class="block uppercase tracking-wider mb-1.5 font-bold" for="cat-code">
						Kode Kategori <span class="text-rose-500">*</span>
					</label>
					<input
						id="cat-code"
						type="text"
						name="code"
						value={editingCategory?.code || ''}
						required
						placeholder="Misal: CAT-ANGKUTAN atau CAT-GUDANG"
						class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-2.5 font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
					/>
				</div>

				<div>
					<label class="block uppercase tracking-wider mb-1.5 font-bold" for="cat-name">
						Nama Kategori <span class="text-rose-500">*</span>
					</label>
					<input
						id="cat-name"
						type="text"
						name="name"
						value={editingCategory?.name || ''}
						required
						placeholder="Misal: Angkutan atau Pergudangan"
						class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
					/>
				</div>

				<div>
					<label class="block uppercase tracking-wider mb-1.5 font-bold" for="cat-desc">
						Deskripsi / Cakupan Operasional
					</label>
					<textarea
						id="cat-desc"
						name="description"
						rows="3"
						placeholder="Uraian singkat lini bisnis atau jenis dokumen yang termasuk..."
						class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
					>{editingCategory?.description || ''}</textarea>
				</div>

				<div class="flex items-center gap-2 pt-2">
					<input
						type="checkbox"
						id="cat-active"
						name="is_active"
						value="true"
						checked={editingCategory ? editingCategory.is_active : true}
						class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
					/>
					<label for="cat-active" class="font-bold text-on-surface cursor-pointer">
						Status Kategori Aktif
					</label>
				</div>

				<div class="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
					<button
						type="button"
						onclick={() => isModalOpen = false}
						class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-on-surface-variant font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
					>
						{isSubmitting ? 'Menyimpan...' : 'Simpan Kategori'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
