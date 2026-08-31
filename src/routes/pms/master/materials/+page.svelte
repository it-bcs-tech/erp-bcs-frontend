<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatRupiah, formatNumber } from '$lib/utils/pms';

	let { data } = $props();
	let isModalOpen = $state(false);
	let isSubmitting = $state(false);
	let searchQuery = $state('');
	let selectedType = $state('');

	let filteredMaterials = $derived.by(() => {
		let list = data.materials || [];
		if (selectedType) {
			list = list.filter((m: any) => m.typeName === selectedType);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((m: any) =>
				(m.name && m.name.toLowerCase().includes(q)) ||
				(m.materialCode && m.materialCode.toLowerCase().includes(q)) ||
				(m.brand && m.brand.toLowerCase().includes(q)) ||
				(m.partNo && m.partNo.toLowerCase().includes(q)) ||
				(m.spec && m.spec.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>Master Material & Sparepart | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">category</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Master Material & Sparepart</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Katalog barang, spesifikasi teknis, part number, satuan (UOM), dan harga standar pengadaan
			</p>
		</div>
		<button
			type="button"
			onclick={() => isModalOpen = true}
			class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Tambah Material Baru</span>
		</button>
	</header>

	<!-- Search & Filter Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
		<div class="relative flex-1 w-full max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari kode material, nama barang, part no, atau brand..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>

		<div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
			<select
				bind:value={selectedType}
				class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			>
				<option value="">Semua Tipe Material</option>
				{#each data.types as t}
					<option value={t.name}>{t.name}</option>
				{/each}
			</select>

			<span class="text-xs font-medium text-on-surface-variant whitespace-nowrap">
				Total: <strong class="text-on-surface">{filteredMaterials.length}</strong> item
			</span>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-4">Kode Material</th>
						<th class="py-3.5 px-4">Nama Barang & Tipe</th>
						<th class="py-3.5 px-4">Spesifikasi / Part No</th>
						<th class="py-3.5 px-4">Brand</th>
						<th class="py-3.5 px-4">UOM</th>
						<th class="py-3.5 px-4 text-right">Harga Standar</th>
						<th class="py-3.5 px-4 text-center">Stok Gudang</th>
						<th class="py-3.5 px-4">Lokasi Rak</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredMaterials.length === 0}
						<tr>
							<td colspan="8" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">category</span>
								<p class="text-xs font-semibold">Tidak ada material yang cocok.</p>
							</td>
						</tr>
					{:else}
						{#each filteredMaterials as m}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-4">
									<span class="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs border border-amber-200 dark:border-amber-800">
										{m.materialCode}
									</span>
								</td>
								<td class="py-3.5 px-4">
									<p class="font-bold text-on-surface text-sm">{m.name}</p>
									<p class="text-[10px] text-on-surface-variant">{m.typeName}</p>
								</td>
								<td class="py-3.5 px-4">
									<p class="text-on-surface">{m.spec}</p>
									{#if m.partNo !== '-'}
										<p class="text-[10px] font-mono text-on-surface-variant">P/N: {m.partNo}</p>
									{/if}
								</td>
								<td class="py-3.5 px-4 font-semibold text-on-surface">{m.brand}</td>
								<td class="py-3.5 px-4">
									<span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-on-surface-variant">
										{m.uom}
									</span>
								</td>
								<td class="py-3.5 px-4 text-right font-mono font-semibold text-on-surface">
									{formatRupiah(m.standardPrice)}
								</td>
								<td class="py-3.5 px-4 text-center">
									<span class="px-2.5 py-1 rounded-lg font-bold font-mono text-xs {m.stock <= m.minStock ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
										{formatNumber(m.stock)}
									</span>
								</td>
								<td class="py-3.5 px-4 text-on-surface-variant">{m.locationName}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Modal Tambah Material -->
{#if isModalOpen}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">category</span>
					<h3 class="text-base font-extrabold text-on-surface">Tambah Material Baru</h3>
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
				<div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Kode Material
							</label>
							<input
								type="text"
								name="materialCode"
								placeholder="MAT-001 (Opsional)"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none uppercase"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Tipe Material
							</label>
							<select
								name="typeCode"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								{#each data.types as t}
									<option value={t.code}>{t.name}</option>
								{/each}
							</select>
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Nama Material / Barang <span class="text-rose-500">*</span>
						</label>
						<input
							type="text"
							name="name"
							required
							placeholder="Misal: Oli Mesin Meditran SX 15W-40"
							class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Brand / Merk
							</label>
							<input
								type="text"
								name="brand"
								placeholder="Pertamina, Hino, Isuzu"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Part Number (P/N)
							</label>
							<input
								type="text"
								name="partNo"
								placeholder="15613-EV020"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none uppercase"
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Satuan (UOM) <span class="text-rose-500">*</span>
							</label>
							<input
								type="text"
								name="uom"
								required
								placeholder="Pcs, Liter, Set, Roll"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Lokasi Gudang / Rak
							</label>
							<select
								name="locationId"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								{#each data.sites as site}
									<option value={site.id}>{site.loc_name}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Harga Standar (Rp)
							</label>
							<input
								type="number"
								name="standardPrice"
								min="0"
								step="1000"
								placeholder="150000"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Min. Stock Alert
							</label>
							<input
								type="number"
								name="minStock"
								min="0"
								placeholder="10"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Spesifikasi Teknis
						</label>
						<textarea
							name="spec"
							rows="2"
							placeholder="Spesifikasi ukuran, grade, atau standar teknis..."
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
							<span>Simpan Material</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
