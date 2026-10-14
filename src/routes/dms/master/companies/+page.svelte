<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let isSubmitting = $state(false);
	let isModalOpen = $state(false);
	let searchQuery = $state('');

	let editingCompany = $state<any>(null);

	// Toast Feedback State
	let toast = $state<{ show: boolean; type: 'success' | 'error'; message: string }>({
		show: false,
		type: 'success',
		message: ''
	});
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	function showToast(message: string, type: 'success' | 'error' = 'success') {
		if (toastTimer) clearTimeout(toastTimer);
		toast = { show: true, type, message };
		toastTimer = setTimeout(() => (toast.show = false), 4000);
	}

	function openCreateModal() {
		editingCompany = null;
		isModalOpen = true;
	}

	function openEditModal(company: any) {
		editingCompany = { ...company };
		isModalOpen = true;
	}

	let filteredCompanies = $derived.by(() => {
		if (!searchQuery.trim()) return data.companies || [];
		const q = searchQuery.toLowerCase();
		return (data.companies || []).filter((c: any) =>
			(c.name && c.name.toLowerCase().includes(q)) ||
			(c.code && c.code.toLowerCase().includes(q)) ||
			(c.address && c.address.toLowerCase().includes(q)) ||
			(c.remarks && c.remarks.toLowerCase().includes(q))
		);
	});
</script>

<svelte:head>
	<title>Master Entitas Perusahaan | DMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-2xl">corporate_fare</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Master Entitas Perusahaan</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Daftar badan hukum, anak perusahaan, dan unit bisnis grup BCS untuk relasi dokumen korporat & legal
			</p>
		</div>
		<button
			type="button"
			onclick={openCreateModal}
			class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Tambah Perusahaan Baru</span>
		</button>
	</header>

	<!-- Search Bar & Summary -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between gap-4">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari kode, nama perusahaan, atau kota..."
				class="w-full bg-surface-container-lowest dark:bg-surface-container text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium border-0 outline-none placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Total: <strong class="text-on-surface">{filteredCompanies.length}</strong> perusahaan
		</span>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<table class="w-full text-left text-sm">
			<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
				<tr>
					<th class="py-3.5 px-5">Kode</th>
					<th class="py-3.5 px-5">Nama Perusahaan / Badan Hukum</th>
					<th class="py-3.5 px-5">Alamat / Domisili</th>
					<th class="py-3.5 px-5">Kontak</th>
					<th class="py-3.5 px-5 text-center">Dokumen Terkait</th>
					<th class="py-3.5 px-5 text-center">Status</th>
					<th class="py-3.5 px-5 text-center">Aksi</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
				{#each filteredCompanies as company}
					<tr class="hover:bg-surface-container transition-colors">
						<td class="py-3.5 px-5 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
							{company.code}
							{#if company.legacy_id}
								<span class="ml-1 text-[10px] text-on-surface-variant/50 font-normal">#{company.legacy_id}</span>
							{/if}
						</td>
						<td class="py-3.5 px-5 font-semibold text-on-surface">
							<div class="flex items-center gap-2">
								<span class="material-symbols-outlined text-violet-500 text-lg">domain</span>
								<span>{company.name}</span>
							</div>
							{#if company.remarks}
								<p class="text-[11px] text-on-surface-variant mt-0.5 ml-6">{company.remarks}</p>
							{/if}
						</td>
						<td class="py-3.5 px-5 text-xs text-on-surface-variant">
							{company.address || '-'}
						</td>
						<td class="py-3.5 px-5 text-xs text-on-surface-variant">
							{company.phone || '-'}
						</td>
						<td class="py-3.5 px-5 text-center">
							<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold {company.doc_count > 0 ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}">
								<span class="material-symbols-outlined text-[14px]">description</span>
								{company.doc_count || 0}
							</span>
						</td>
						<td class="py-3.5 px-5 text-center">
							<form
								method="POST"
								action="?/toggleActive"
								use:enhance={() => {
									return async ({ result, update }) => {
										const resData = (result as any).data;
										if (result.type === 'success' && resData?.success) {
											showToast(resData.message, 'success');
										} else {
											showToast(resData?.message || 'Gagal mengubah status', 'error');
										}
										update();
									};
								}}
							>
								<input type="hidden" name="id" value={company.id} />
								<button
									type="submit"
									class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors {company.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'}"
								>
									<span class="w-1.5 h-1.5 rounded-full {company.is_active ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
									{company.is_active ? 'Aktif' : 'Non-Aktif'}
								</button>
							</form>
						</td>
						<td class="py-3.5 px-5 text-center">
							<button
								type="button"
								onclick={() => openEditModal(company)}
								class="p-1.5 text-on-surface-variant hover:text-indigo-600 hover:bg-surface-container-highest rounded-lg transition-colors cursor-pointer"
								title="Edit Perusahaan"
							>
								<span class="material-symbols-outlined text-[18px]">edit</span>
							</button>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="py-12 text-center text-on-surface-variant text-xs">
							<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">domain_disabled</span>
							<p>Tidak ada data perusahaan yang sesuai dengan pencarian.</p>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Modal Form Create / Edit -->
{#if isModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
		<div class="w-full max-w-lg bg-surface-container-lowest dark:bg-surface-container rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
			<div class="p-6 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400">corporate_fare</span>
					<h3 class="text-base font-bold text-on-surface">
						{editingCompany ? 'Edit Data Perusahaan' : 'Tambah Perusahaan Baru'}
					</h3>
				</div>
				<button
					type="button"
					onclick={() => (isModalOpen = false)}
					class="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-lg transition-colors cursor-pointer"
				>
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
						const resData = (result as any).data;
						if (result.type === 'success' && resData?.success) {
							isModalOpen = false;
							showToast(resData.message, 'success');
						} else {
							showToast(resData?.message || 'Terjadi kesalahan saat menyimpan data', 'error');
						}
						update();
					};
				}}
				class="p-6 space-y-4"
			>
				{#if editingCompany}
					<input type="hidden" name="id" value={editingCompany.id} />
				{/if}

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div class="sm:col-span-1">
						<label for="company_code" class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
							Kode <span class="text-rose-500">*</span>
						</label>
						<input
							type="text"
							id="company_code"
							name="code"
							value={editingCompany?.code || ''}
							required
							placeholder="Misal: CMP-01"
							class="w-full bg-surface-container-low text-on-surface rounded-xl py-2 px-3.5 text-xs font-medium border-0 outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase"
						/>
					</div>
					<div class="sm:col-span-2">
						<label for="company_name" class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
							Nama Perusahaan / Badan Hukum <span class="text-rose-500">*</span>
						</label>
						<input
							type="text"
							id="company_name"
							name="name"
							value={editingCompany?.name || ''}
							required
							placeholder="Misal: BUANA CENTRA SWAKARSA, PT"
							class="w-full bg-surface-container-low text-on-surface rounded-xl py-2 px-3.5 text-xs font-medium border-0 outline-none focus:ring-2 focus:ring-indigo-500/20"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="company_address" class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
							Alamat / Domisili Kota
						</label>
						<input
							type="text"
							id="company_address"
							name="address"
							value={editingCompany?.address || ''}
							placeholder="Misal: Cilegon, Serang, Tangerang"
							class="w-full bg-surface-container-low text-on-surface rounded-xl py-2 px-3.5 text-xs font-medium border-0 outline-none focus:ring-2 focus:ring-indigo-500/20"
						/>
					</div>
					<div>
						<label for="company_phone" class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
							No. Telepon / Kontak
						</label>
						<input
							type="text"
							id="company_phone"
							name="phone"
							value={editingCompany?.phone || ''}
							placeholder="Misal: 0254-xxxxxx"
							class="w-full bg-surface-container-low text-on-surface rounded-xl py-2 px-3.5 text-xs font-medium border-0 outline-none focus:ring-2 focus:ring-indigo-500/20"
						/>
					</div>
				</div>

				<div>
					<label for="company_remarks" class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
						Keterangan / Catatan
					</label>
					<textarea
						id="company_remarks"
						name="remarks"
						rows="2"
						placeholder="Catatan tambahan mengenai badan hukum atau bidang usaha..."
						class="w-full bg-surface-container-low text-on-surface rounded-xl py-2 px-3.5 text-xs font-medium border-0 outline-none focus:ring-2 focus:ring-indigo-500/20"
					>{editingCompany?.remarks || ''}</textarea>
				</div>

				<div class="pt-2">
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							name="is_active"
							value="true"
							checked={editingCompany ? editingCompany.is_active : true}
							class="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 border-0"
						/>
						<span class="text-xs font-semibold text-on-surface">Status Aktif</span>
					</label>
				</div>

				<div class="pt-4 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-end gap-3">
					<button
						type="button"
						onclick={() => (isModalOpen = false)}
						class="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
						{/if}
						<span>{editingCompany ? 'Simpan Perubahan' : 'Tambah Perusahaan'}</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Floating Toast Notification -->
{#if toast.show}
	<div
		class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 {toast.type === 'success'
			? 'bg-emerald-500/90 border-emerald-400/40 text-white'
			: 'bg-rose-500/90 border-rose-400/40 text-white'}"
	>
		<span class="material-symbols-outlined text-lg">
			{toast.type === 'success' ? 'check_circle' : 'error'}
		</span>
		<p class="text-xs font-semibold">{toast.message}</p>
		<button
			type="button"
			onclick={() => (toast.show = false)}
			class="ml-2 p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-sm">close</span>
		</button>
	</div>
{/if}
