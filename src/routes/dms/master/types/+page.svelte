<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let isSubmitting = $state(false);
	let isModalOpen = $state(false);
	let searchQuery = $state('');

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

	let filteredTypes = $derived.by(() => {
		if (!searchQuery.trim()) return data.types || [];
		const q = searchQuery.toLowerCase();
		return (data.types || []).filter((t: any) =>
			(t.name && t.name.toLowerCase().includes(q)) ||
			(t.code && t.code.toLowerCase().includes(q)) ||
			(t.description && t.description.toLowerCase().includes(q))
		);
	});
</script>

<svelte:head>
	<title>Master Tipe Dokumen | DMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-2xl">category</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Master Tipe Dokumen</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Definisikan klasifikasi jenis dokumen legal, armada (STNK/KIR/BPKB), driver (SIM/SIO), dan kontrak
			</p>
		</div>
		<button
			type="button"
			onclick={() => isModalOpen = true}
			class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Tambah Tipe Baru</span>
		</button>
	</header>

	<!-- Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between gap-4">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari kode atau nama tipe dokumen..."
				class="w-full bg-surface-container-lowest dark:bg-surface-container text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium border-0 outline-none placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Total: <strong class="text-on-surface">{filteredTypes.length}</strong> tipe
		</span>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<table class="w-full text-left text-sm">
			<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
				<tr>
					<th class="py-3.5 px-5">Kode Tipe</th>
					<th class="py-3.5 px-5">Nama Dokumen</th>
					<th class="py-3.5 px-5">Deskripsi / Peruntukan</th>
					<th class="py-3.5 px-5 text-center">Status</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
				{#if filteredTypes.length === 0}
					<tr>
						<td colspan="4" class="py-12 text-center text-on-surface-variant">
							<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">category</span>
							<p class="text-xs font-semibold">Tidak ada tipe dokumen yang cocok.</p>
						</td>
					</tr>
				{:else}
					{#each filteredTypes as type}
						<tr class="hover:bg-surface-container-high/40 transition-colors">
							<td class="py-3.5 px-5">
								<span class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs border border-indigo-200 dark:border-indigo-800">
									{type.code}
								</span>
							</td>
							<td class="py-3.5 px-5 font-bold text-on-surface text-sm">{type.name}</td>
							<td class="py-3.5 px-5 text-on-surface-variant max-w-md">{type.description || '-'}</td>
							<td class="py-3.5 px-5 text-center">
								<span class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border {type.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-700 border-slate-300'}">
									<span class="w-1.5 h-1.5 rounded-full {type.is_active ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
									{type.is_active ? 'Aktif' : 'Non-Aktif'}
								</span>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<!-- Modal Tambah Tipe -->
{#if isModalOpen}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-indigo-600">category</span>
					<h3 class="text-base font-extrabold text-on-surface">Tambah Tipe Dokumen</h3>
				</div>
				<button type="button" onclick={() => isModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/save" use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					const resData = (result as any).data;
					if (result.type === 'success' && resData?.success) {
						isModalOpen = false;
						showToast('Tipe dokumen berhasil ditambahkan!', 'success');
						update();
					} else {
						showToast(resData?.message || 'Terjadi kesalahan saat menyimpan data', 'error');
					}
				};
			}}>
				<div class="p-6 space-y-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Kode Tipe Dokumen <span class="text-rose-500">*</span>
						</label>
						<input
							type="text"
							name="code"
							required
							placeholder="Misal: STNK_TRUK, KIR, BPKB"
							class="w-full bg-surface-container-low text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold border-0 outline-none placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-indigo-500/20 transition-all uppercase"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Nama Tipe Dokumen <span class="text-rose-500">*</span>
						</label>
						<input
							type="text"
							name="name"
							required
							placeholder="Misal: Surat Tanda Nomor Kendaraan"
							class="w-full bg-surface-container-low text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold border-0 outline-none placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Deskripsi / Peruntukan
						</label>
						<textarea
							name="description"
							rows="3"
							placeholder="Keterangan peruntukan dokumen..."
							class="w-full bg-surface-container-low text-on-surface rounded-xl p-3 text-xs font-medium border-0 outline-none placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
						></textarea>
					</div>
				</div>

				<div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-surface-container-low flex justify-end gap-3">
					<button
						type="button"
						onclick={() => isModalOpen = false}
						class="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
							<span>Menyimpan...</span>
						{:else}
							<span class="material-symbols-outlined text-sm">save</span>
							<span>Simpan Tipe</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Floating Toast Notification -->
{#if toast.show}
	<div class="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border animate-in slide-in-from-top-4 duration-300 {toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-rose-600 text-white border-rose-500'}">
		<span class="material-symbols-outlined text-lg">
			{toast.type === 'success' ? 'check_circle' : 'error'}
		</span>
		<p class="text-xs font-bold">{toast.message}</p>
		<button type="button" class="ml-2 text-white/80 hover:text-white cursor-pointer" onclick={() => toast.show = false} aria-label="Tutup notifikasi">
			<span class="material-symbols-outlined text-sm">close</span>
		</button>
	</div>
{/if}
