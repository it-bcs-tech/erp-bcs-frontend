<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNumber } from '$lib/utils/pms';

	let { data } = $props();
	let isSubmitting = $state(false);

	let date = $state(new Date().toISOString().split('T')[0]);
	let requiredDate = $state('');
	let department = $state('Workshop / Maintenance');
	let requestedBy = $state('Staff Gudang');
	let projectId = $state('');
	let siteId = $state('');
	let category = $state('SUPPORTING');
	let notes = $state('');

	// Line items
	let items = $state<Array<{
		material_id: number;
		material_code: string;
		name: string;
		spec: string;
		uom: string;
		stock: number;
		qty: number;
		remarks: string;
	}>>([]);

	let selectedMaterialId = $state('');

	function addItem() {
		if (!selectedMaterialId) return;
		const mat = data.materials.find((m: any) => m.id === parseInt(selectedMaterialId));
		if (!mat) return;

		// Check if already added
		const exists = items.find(i => i.material_id === mat.id);
		if (exists) {
			exists.qty += 1;
			selectedMaterialId = '';
			return;
		}

		items.push({
			material_id: mat.id,
			material_code: mat.material_code,
			name: mat.name,
			spec: mat.spec || '-',
			uom: mat.uom || 'Pcs',
			stock: mat.stock || 0,
			qty: 1,
			remarks: ''
		});

		selectedMaterialId = '';
	}

	function removeItem(idx: number) {
		items.splice(idx, 1);
	}
</script>

<svelte:head>
	<title>Buat Purchase Request (PR) Baru | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6 max-w-5xl mx-auto">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<a href="/pms/transactions/pr" class="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">arrow_back</span>
				</a>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Buat Purchase Request (PR)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5 ml-8">
				Formulir pengajuan permintaan pembelian barang, sparepart, atau perlengkapan logistik
			</p>
		</div>
	</header>

	<form method="POST" action="?/create" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			isSubmitting = false;
			await update();
		};
	}}>
		<input type="hidden" name="items" value={JSON.stringify(items)} />

		<div class="space-y-6">
			<!-- Section 1: Informasi Header PR -->
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60 pb-3 flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">assignment</span>
					<span>Informasi Permintaan</span>
				</h3>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Tanggal Pengajuan <span class="text-rose-500">*</span>
						</label>
						<input
							type="date"
							name="date"
							required
							bind:value={date}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Target Diperlukan (Required Date)
						</label>
						<input
							type="date"
							name="requiredDate"
							bind:value={requiredDate}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Kategori Pengadaan <span class="text-rose-500">*</span>
						</label>
						<select
							name="category"
							bind:value={category}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="PACKAGING">Packaging (Pallet, Wrapping, Sak)</option>
							<option value="TRANSPORT">Transport (Armada & Ban Truk)</option>
							<option value="WAREHOUSE">Warehouse (Gudang & Forklift)</option>
							<option value="SUPPORTING">Supporting (Oli, Pelumas, Tools)</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Pemohon (Request By) <span class="text-rose-500">*</span>
						</label>
						<input
							type="text"
							name="requestedBy"
							required
							bind:value={requestedBy}
							placeholder="Nama staf pemohon"
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Departemen
						</label>
						<input
							type="text"
							name="department"
							bind:value={department}
							placeholder="Workshop, IT, Logistik"
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Alokasi Project
						</label>
						<select
							name="projectId"
							bind:value={projectId}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="">-- Bebas / Non-Project --</option>
							{#each data.projects as p}
								<option value={p.id}>{p.project_name}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Lokasi Site Tujuan
						</label>
						<select
							name="siteId"
							bind:value={siteId}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="">-- Semua Site --</option>
							{#each data.sites as s}
								<option value={s.id}>{s.loc_name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
						Catatan / Justifikasi Pengadaan
					</label>
					<textarea
						name="notes"
						bind:value={notes}
						rows="2"
						placeholder="Keterangan peruntukan atau alasan pembelian..."
						class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none resize-none"
					></textarea>
				</div>
			</div>

			<!-- Section 2: Line Items -->
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
					<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-600">format_list_bulleted</span>
						<span>Daftar Item Material ({items.length})</span>
					</h3>

					<div class="flex items-center gap-2">
						<select
							bind:value={selectedMaterialId}
							class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 max-w-xs"
						>
							<option value="">-- Pilih Material dari Katalog --</option>
							{#each data.materials as mat}
								<option value={mat.id}>{mat.material_code} - {mat.name} ({mat.uom})</option>
							{/each}
						</select>
						<button
							type="button"
							onclick={addItem}
							disabled={!selectedMaterialId}
							class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1 shadow-xs"
						>
							<span class="material-symbols-outlined text-base">add</span>
							<span>Tambah</span>
						</button>
					</div>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm min-w-[700px]">
						<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
							<tr>
								<th class="py-3 px-3">Kode & Nama Material</th>
								<th class="py-3 px-3">Spesifikasi</th>
								<th class="py-3 px-3 text-center">Stok Saat Ini</th>
								<th class="py-3 px-3 text-center w-28">Qty Request</th>
								<th class="py-3 px-3">Satuan</th>
								<th class="py-3 px-3">Remarks / Catatan</th>
								<th class="py-3 px-3 text-center w-12">Hapus</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
							{#if items.length === 0}
								<tr>
									<td colspan="7" class="py-8 text-center text-on-surface-variant">
										<p class="text-xs font-semibold">Belum ada item material yang ditambahkan.</p>
										<p class="text-[11px] text-slate-400 mt-0.5">Pilih material dari dropdown di atas lalu klik Tambah.</p>
									</td>
								</tr>
							{:else}
								{#each items as item, idx}
									<tr>
										<td class="py-3 px-3">
											<span class="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs">{item.material_code}</span>
											<p class="font-bold text-on-surface text-xs">{item.name}</p>
										</td>
										<td class="py-3 px-3 text-on-surface-variant">{item.spec}</td>
										<td class="py-3 px-3 text-center font-mono font-semibold">
											{formatNumber(item.stock)}
										</td>
										<td class="py-3 px-3 text-center">
											<input
												type="number"
												min="1"
												bind:value={item.qty}
												class="w-20 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-lg px-2 py-1 text-center font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500 outline-none"
											/>
										</td>
										<td class="py-3 px-3 font-semibold">{item.uom}</td>
										<td class="py-3 px-3">
											<input
												type="text"
												bind:value={item.remarks}
												placeholder="Keterangan..."
												class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
											/>
										</td>
										<td class="py-3 px-3 text-center">
											<button
												type="button"
												onclick={() => removeItem(idx)}
												class="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
											>
												<span class="material-symbols-outlined text-base">delete</span>
											</button>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 pt-2">
				<a href="/pms/transactions/pr" class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">
					Batal
				</a>
				<button
					type="submit"
					disabled={isSubmitting || items.length === 0}
					class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
						<span>Menyimpan PR...</span>
					{:else}
						<span class="material-symbols-outlined text-sm">send</span>
						<span>Kirim Purchase Request</span>
					{/if}
				</button>
			</div>
		</div>
	</form>
</div>
