<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDateId, formatNumber } from '$lib/utils/pms';

	let { data } = $props();
	let isModalOpen = $state(false);
	let isSubmitting = $state(false);
	let searchQuery = $state('');

	let filteredNotes = $derived.by(() => {
		let list = data.deliveryNotes || [];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((dn: any) =>
				(dn.dnNumber && dn.dnNumber.toLowerCase().includes(q)) ||
				(dn.fromSite && dn.fromSite.toLowerCase().includes(q)) ||
				(dn.toSite && dn.toSite.toLowerCase().includes(q)) ||
				(dn.courierName && dn.courierName.toLowerCase().includes(q)) ||
				(dn.vehicleNo && dn.vehicleNo.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>Delivery Notes (DN) | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">local_shipping</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Delivery Notes (DN)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Surat jalan pengiriman barang & sparepart antar gudang atau pool logistik BCS
			</p>
		</div>
		<button
			type="button"
			onclick={() => isModalOpen = true}
			class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Buat Surat Jalan (DN)</span>
		</button>
	</header>

	<!-- Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between gap-4">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari no surat jalan, asal, tujuan, kurir, nopol..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Total: <strong class="text-on-surface">{filteredNotes.length}</strong> Delivery Notes
		</span>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-4">No. DN & Tanggal</th>
						<th class="py-3.5 px-4">Dari Lokasi (Asal)</th>
						<th class="py-3.5 px-4">Ke Lokasi (Tujuan)</th>
						<th class="py-3.5 px-4">Kurir / Driver</th>
						<th class="py-3.5 px-4">No. Kendaraan</th>
						<th class="py-3.5 px-4 text-center">Total Item</th>
						<th class="py-3.5 px-4 text-center">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredNotes.length === 0}
						<tr>
							<td colspan="7" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">local_shipping</span>
								<p class="text-xs font-semibold">Tidak ada data Delivery Note.</p>
							</td>
						</tr>
					{:else}
						{#each filteredNotes as dn}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-4">
									<span class="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs">
										{dn.dnNumber}
									</span>
									<p class="text-[10px] text-on-surface-variant">{formatDateId(dn.date)}</p>
								</td>
								<td class="py-3.5 px-4 font-semibold text-on-surface">{dn.fromSite}</td>
								<td class="py-3.5 px-4 font-semibold text-on-surface">{dn.toSite}</td>
								<td class="py-3.5 px-4 text-on-surface">{dn.courierName}</td>
								<td class="py-3.5 px-4 font-mono font-bold text-on-surface">{dn.vehicleNo}</td>
								<td class="py-3.5 px-4 text-center font-mono font-bold text-on-surface">
									{dn.item_count} item ({formatNumber(dn.total_qty)} qty)
								</td>
								<td class="py-3.5 px-4 text-center">
									<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-blue-100 text-blue-800 border-blue-300">
										{dn.status}
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

<!-- Modal Tambah Delivery Note -->
{#if isModalOpen}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">local_shipping</span>
					<h3 class="text-base font-extrabold text-on-surface">Buat Surat Jalan (DN) Baru</h3>
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
							Tanggal Pengiriman
						</label>
						<input
							type="date"
							name="date"
							required
							value={new Date().toISOString().split('T')[0]}
							class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Dari Lokasi (Asal)
							</label>
							<select
								name="fromSiteId"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								{#each data.sites as s}
									<option value={s.id}>{s.loc_name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Ke Lokasi (Tujuan)
							</label>
							<select
								name="toSiteId"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								{#each data.sites as s}
									<option value={s.id}>{s.loc_name}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Nama Kurir / Driver
							</label>
							<input
								type="text"
								name="courierName"
								placeholder="Nama driver"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								No. Plat Truk / Armada
							</label>
							<input
								type="text"
								name="vehicleNo"
								placeholder="B 9876 XYZ"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none uppercase"
							/>
						</div>
					</div>

					<div class="grid grid-cols-3 gap-3">
						<div class="col-span-2">
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Pilih Material
							</label>
							<select
								name="materialId"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								<option value="">-- Bebas / Logistik Umum --</option>
								{#each data.materials as mat}
									<option value={mat.id}>{mat.material_code} - {mat.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Qty
							</label>
							<input
								type="number"
								min="1"
								name="qty"
								value="1"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Catatan Pengiriman
						</label>
						<textarea
							name="notes"
							rows="2"
							placeholder="Keterangan muatan..."
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
							<span>Simpan DN</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
