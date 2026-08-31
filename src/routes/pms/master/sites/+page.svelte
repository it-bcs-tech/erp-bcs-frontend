<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let isModalOpen = $state(false);
	let isSubmitting = $state(false);
	let searchQuery = $state('');

	let filteredSites = $derived.by(() => {
		if (!searchQuery.trim()) return data.sites || [];
		const q = searchQuery.toLowerCase();
		return (data.sites || []).filter((s: any) =>
			(s.locName && s.locName.toLowerCase().includes(q)) ||
			(s.locCode && s.locCode.toLowerCase().includes(q)) ||
			(s.alias && s.alias.toLowerCase().includes(q)) ||
			(s.city && s.city.toLowerCase().includes(q))
		);
	});
</script>

<svelte:head>
	<title>Master Site & Lokasi Gudang | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">location_city</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Master Site & Lokasi Gudang</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Daftar pool operasional, gudang pusat, dan site penerimaan logistik BCS
			</p>
		</div>
		<button
			type="button"
			onclick={() => isModalOpen = true}
			class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Tambah Site Baru</span>
		</button>
	</header>

	<!-- Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between gap-4">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari kode site, nama gudang, alias, atau kota..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Total: <strong class="text-on-surface">{filteredSites.length}</strong> site
		</span>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<table class="w-full text-left text-sm">
			<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
				<tr>
					<th class="py-3.5 px-5">Site ID / Kode</th>
					<th class="py-3.5 px-5">Nama Site & Alias</th>
					<th class="py-3.5 px-5">Contact Person (PIC)</th>
					<th class="py-3.5 px-5">No. Telepon</th>
					<th class="py-3.5 px-5">Alamat Gudang</th>
					<th class="py-3.5 px-5">Kota / Provinsi</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
				{#if filteredSites.length === 0}
					<tr>
						<td colspan="6" class="py-12 text-center text-on-surface-variant">
							<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">location_city</span>
							<p class="text-xs font-semibold">Tidak ada site yang cocok.</p>
						</td>
					</tr>
				{:else}
					{#each filteredSites as s}
						<tr class="hover:bg-surface-container-high/40 transition-colors">
							<td class="py-3.5 px-5">
								<span class="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs border border-amber-200 dark:border-amber-800">
									{s.locCode}
								</span>
							</td>
							<td class="py-3.5 px-5">
								<p class="font-bold text-on-surface text-sm">{s.locName}</p>
								<p class="text-[10px] text-on-surface-variant">Alias: {s.alias}</p>
							</td>
							<td class="py-3.5 px-5 text-on-surface">{s.contactPerson}</td>
							<td class="py-3.5 px-5 font-mono">{s.phone}</td>
							<td class="py-3.5 px-5 text-on-surface-variant max-w-xs truncate">{s.address1}</td>
							<td class="py-3.5 px-5 text-on-surface font-semibold">{s.city}, {s.state}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<!-- Modal Tambah Site -->
{#if isModalOpen}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">location_city</span>
					<h3 class="text-base font-extrabold text-on-surface">Tambah Site Baru</h3>
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
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Kode Site <span class="text-rose-500">*</span>
							</label>
							<input
								type="text"
								name="locCode"
								required
								placeholder="SITE-01"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none uppercase"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Alias Site
							</label>
							<input
								type="text"
								name="alias"
								placeholder="Cilegon Main"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Nama Site / Gudang <span class="text-rose-500">*</span>
						</label>
						<input
							type="text"
							name="locName"
							required
							placeholder="Misal: Gudang Utama Cilegon"
							class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Contact Person
							</label>
							<input
								type="text"
								name="contactPerson"
								placeholder="Nama PIC"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								No. Telepon
							</label>
							<input
								type="text"
								name="phone"
								placeholder="0254-..."
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Alamat Site
						</label>
						<textarea
							name="address1"
							rows="2"
							placeholder="Alamat lengkap..."
							class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none resize-none"
						></textarea>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Kota
							</label>
							<input
								type="text"
								name="city"
								placeholder="Cilegon"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Provinsi
							</label>
							<input
								type="text"
								name="state"
								placeholder="Banten"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
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
							<span>Simpan Site</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
