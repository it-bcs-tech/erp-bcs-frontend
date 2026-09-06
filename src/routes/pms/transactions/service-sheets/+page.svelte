<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDateId, formatNumber } from '$lib/utils/pms';

	let { data } = $props();
	let isModalOpen = $state(false);
	let isSubmitting = $state(false);
	let searchQuery = $state('');

	// Form state
	let selectedUnitId = $state('');
	let chassisNo = $state('');
	let selectedMaterialId = $state('');
	let itemQty = $state(1);
	let itemNotes = $state('');
	let spareparts = $state<Array<{
		materialId: number;
		materialCode: string;
		materialName: string;
		qty: number;
		uom: string;
		stock: number;
		notes: string;
	}>>([]);

	// Selected Sheet for detail viewing
	let selectedSheetForView = $state<any>(null);

	function onUnitChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedUnitId = target.value;
		const found = data.units.find((u: any) => u.id === parseInt(target.value));
		if (found) {
			chassisNo = found.chassis_no || '';
		} else {
			chassisNo = '';
		}
	}

	function addSparepart() {
		if (!selectedMaterialId) return;
		const mat = data.materials.find((m: any) => m.id === parseInt(selectedMaterialId));
		if (!mat) return;

		const existing = spareparts.find(p => p.materialId === mat.id);
		if (existing) {
			existing.qty += itemQty;
		} else {
			spareparts.push({
				materialId: mat.id,
				materialCode: mat.material_code,
				materialName: mat.name,
				qty: itemQty,
				uom: mat.uom || 'Pcs',
				stock: parseFloat(mat.stock) || 0,
				notes: itemNotes
			});
		}

		selectedMaterialId = '';
		itemQty = 1;
		itemNotes = '';
	}

	function removeSparepart(idx: number) {
		spareparts.splice(idx, 1);
	}

	let filteredSheets = $derived.by(() => {
		let list = data.sheets || [];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((s: any) =>
				(s.ssNumber && s.ssNumber.toLowerCase().includes(q)) ||
				(s.unitNopol && s.unitNopol.toLowerCase().includes(q)) ||
				(s.woNo && s.woNo.toLowerCase().includes(q)) ||
				(s.mekanikName && s.mekanikName.toLowerCase().includes(q)) ||
				(s.helperName && s.helperName.toLowerCase().includes(q)) ||
				(s.driverName && s.driverName.toLowerCase().includes(q)) ||
				(s.chassisNo && s.chassisNo.toLowerCase().includes(q)) ||
				(s.problem && s.problem.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>Supply Slip (SS / Work Order) | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">build</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Supply Slip (SS / Work Order Supply)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Pengeluaran suku cadang & material gudang untuk kebutuhan perbaikan armada workshop FMS
			</p>
		</div>
		<button
			type="button"
			onclick={() => {
				spareparts = [];
				chassisNo = '';
				selectedUnitId = '';
				isModalOpen = true;
			}}
			class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Terbitkan Supply Slip Baru</span>
		</button>
	</header>

	<!-- Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between gap-4">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari no SS, nopol, chassis, mekanik, driver, problem..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Total: <strong class="text-on-surface">{filteredSheets.length}</strong> Supply Slip
		</span>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[1050px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-4">No. SS & Tanggal</th>
						<th class="py-3.5 px-4">No. WO Ref</th>
						<th class="py-3.5 px-4">Unit Armada & Chassis</th>
						<th class="py-3.5 px-4">Project</th>
						<th class="py-3.5 px-4">Mekanik & Helper</th>
						<th class="py-3.5 px-4">Driver</th>
						<th class="py-3.5 px-4">Problem / Kerusakan</th>
						<th class="py-3.5 px-4 text-center">Item Sparepart</th>
						<th class="py-3.5 px-4 text-center">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredSheets.length === 0}
						<tr>
							<td colspan="9" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">build</span>
								<p class="text-xs font-semibold">Tidak ada data Supply Slip.</p>
							</td>
						</tr>
					{:else}
						{#each filteredSheets as ss}
							{@const itemCount = ss.items ? ss.items.length : 0}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-4">
									<span class="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs">
										{ss.ssNumber}
									</span>
									<p class="text-[10px] text-on-surface-variant">{formatDateId(ss.date)}</p>
								</td>
								<td class="py-3.5 px-4 font-mono font-semibold text-on-surface">{ss.woNo}</td>
								<td class="py-3.5 px-4">
									<span class="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-on-surface">
										{ss.unitNopol}
									</span>
									<p class="text-[10px] text-on-surface-variant font-mono mt-0.5 truncate max-w-[140px]" title={ss.chassisNo}>
										Chassis: {ss.chassisNo}
									</p>
								</td>
								<td class="py-3.5 px-4 font-semibold text-on-surface">{ss.projectName || '-'}</td>
								<td class="py-3.5 px-4">
									<p class="font-bold text-on-surface">{ss.mekanikName}</p>
									{#if ss.helperName && ss.helperName !== '-'}
										<p class="text-[10px] text-on-surface-variant">Helper: {ss.helperName}</p>
									{/if}
								</td>
								<td class="py-3.5 px-4 font-medium text-on-surface">{ss.driverName || '-'}</td>
								<td class="py-3.5 px-4 text-on-surface max-w-xs truncate" title={ss.problem}>{ss.problem}</td>
								<td class="py-3.5 px-4 text-center">
									{#if itemCount > 0}
										<button
											type="button"
											onclick={() => selectedSheetForView = ss}
											class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-bold text-[10px] hover:bg-amber-100 cursor-pointer transition-colors"
										>
											<span class="material-symbols-outlined text-[14px]">inventory_2</span>
											<span>{itemCount} Sparepart</span>
										</button>
									{:else}
										<span class="text-[10px] text-on-surface-variant italic">0 Item</span>
									{/if}
								</td>
								<td class="py-3.5 px-4 text-center">
									<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300">
										{ss.status}
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

<!-- Modal Detail Sparepart Keluar -->
{#if selectedSheetForView}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div>
					<h3 class="text-base font-extrabold text-on-surface">Daftar Suku Cadang Keluar</h3>
					<p class="text-xs text-on-surface-variant font-mono mt-0.5">{selectedSheetForView.ssNumber} ({selectedSheetForView.unitNopol})</p>
				</div>
				<button type="button" onclick={() => selectedSheetForView = null} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="p-6 overflow-y-auto max-h-[60vh] space-y-3">
				{#each selectedSheetForView.items as itm}
					<div class="p-3.5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
						<div>
							<span class="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">{itm.materialCode}</span>
							<p class="text-xs font-bold text-on-surface">{itm.materialName}</p>
							{#if itm.notes && itm.notes !== '-'}
								<p class="text-[10px] text-on-surface-variant mt-0.5">Catatan: {itm.notes}</p>
							{/if}
						</div>
						<div class="text-right">
							<span class="px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black font-mono text-xs">
								{itm.qty} {itm.uom}
							</span>
						</div>
					</div>
				{/each}
			</div>

			<div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-surface-container-low flex justify-end">
				<button
					type="button"
					onclick={() => selectedSheetForView = null}
					class="px-5 py-2 rounded-xl bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high"
				>
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Tambah Supply Slip Baru -->
{#if isModalOpen}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">build</span>
					<div>
						<h3 class="text-base font-extrabold text-on-surface">Terbitkan Supply Slip (SS) Baru</h3>
						<p class="text-xs text-on-surface-variant">Catat perbaikan armada & suku cadang yang keluar dari gudang</p>
					</div>
				</div>
				<button type="button" onclick={() => isModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form 
				method="POST" 
				action="?/save" 
				class="flex-1 overflow-y-auto flex flex-col justify-between"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							isModalOpen = false;
							update();
						} else {
							alert((result as any).data?.message || 'Terjadi kesalahan');
						}
					};
				}}
			>
				<input type="hidden" name="itemsJson" value={JSON.stringify(spareparts)} />

				<div class="p-6 space-y-4">
					<!-- Tanggal & No WO -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Tanggal Keluar
							</label>
							<input
								type="date"
								name="date"
								required
								value={new Date().toISOString().split('T')[0]}
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								No. Work Order (WO)
							</label>
							<input
								type="text"
								name="woNo"
								placeholder="Contoh: WO-2026-008"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none uppercase font-mono"
							/>
						</div>
					</div>

					<!-- Unit & Chassis No -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Pilih Unit Armada
							</label>
							<select
								name="unitId"
								bind:value={selectedUnitId}
								onchange={onUnitChange}
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								<option value="">-- Non-Unit / Workshop Umum --</option>
								{#each data.units as u}
									<option value={u.id}>{u.nopol} ({u.hull_number || '-'})</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Nomor Rangka / Chassis No
							</label>
							<input
								type="text"
								name="chassisNo"
								bind:value={chassisNo}
								placeholder="No Rangka Unit"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-mono font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none uppercase"
							/>
						</div>
					</div>

					<!-- Project & Tipe Service -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Project
							</label>
							<select
								name="projectId"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								<option value="">-- Bebas / Standar Operasional --</option>
								{#each data.projects as p}
									<option value={p.id}>{p.project_name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Tipe Pekerjaan
							</label>
							<select
								name="tipe"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								<option value="Perawatan Rutin">Perawatan Rutin</option>
								<option value="Ganti Oli & Filter">Ganti Oli & Filter</option>
								<option value="Perbaikan Rem & Kaki-Kaki">Perbaikan Rem & Kaki-Kaki</option>
								<option value="Perbaikan Mesin / Engine">Perbaikan Mesin / Engine</option>
								<option value="Overhaul Transmisi">Overhaul Transmisi</option>
								<option value="Kelistrikan & AC">Kelistrikan & AC</option>
								<option value="Body & Karoseri">Body & Karoseri</option>
							</select>
						</div>
					</div>

					<!-- Mekanik, Helper, Driver -->
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Nama Mekanik Utama
							</label>
							<input
								type="text"
								name="mekanikName"
								placeholder="Nama mekanik"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Helper Mekanik
							</label>
							<input
								type="text"
								name="helperName"
								placeholder="Nama asisten/helper"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Driver Pemegang
							</label>
							<input
								type="text"
								name="driverName"
								list="driverList"
								placeholder="Nama driver"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
							<datalist id="driverList">
								{#each data.drivers as d}
									<option value={d.name}>{d.name}</option>
								{/each}
							</datalist>
						</div>
					</div>

					<!-- Problem Description -->
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Deskripsi Problem / Kerusakan <span class="text-rose-500">*</span>
						</label>
						<textarea
							name="problem"
							required
							rows="2"
							placeholder="Keluhan driver, gejala kerusakan, atau catatan perbaikan..."
							class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none resize-none"
						></textarea>
					</div>

					<!-- SPAREPART PICKER SECTION -->
					<div class="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="material-symbols-outlined text-amber-600 text-lg">inventory_2</span>
								<h4 class="text-xs font-black text-on-surface uppercase tracking-wider">Item Suku Cadang yang Dikeluarkan (Auto-Potong Stok)</h4>
							</div>
							<span class="text-[10px] font-bold text-on-surface-variant">{spareparts.length} Item Ditambahkan</span>
						</div>

						<!-- Input Bar -->
						<div class="p-3.5 rounded-2xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row gap-2 items-end">
							<div class="flex-1 w-full">
								<label class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">
									Pilih Material / Sparepart
								</label>
								<select
									bind:value={selectedMaterialId}
									class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-1.5 text-xs font-medium outline-none"
								>
									<option value="">-- Pilih Suku Cadang --</option>
									{#each data.materials as m}
										<option value={m.id}>{m.material_code} - {m.name} (Stok: {m.stock} {m.uom})</option>
									{/each}
								</select>
							</div>

							<div class="w-full sm:w-24">
								<label class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">
									Qty
								</label>
								<input
									type="number"
									min="0.1"
									step="any"
									bind:value={itemQty}
									class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-1.5 text-xs font-bold font-mono outline-none"
								/>
							</div>

							<div class="w-full sm:w-44">
								<label class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">
									Catatan Pemasangan
								</label>
								<input
									type="text"
									placeholder="Posisi / Keterangan"
									bind:value={itemNotes}
									class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-1.5 text-xs outline-none"
								/>
							</div>

							<button
								type="button"
								onclick={addSparepart}
								disabled={!selectedMaterialId}
								class="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
							>
								<span class="material-symbols-outlined text-sm">add</span>
								<span>Tambah</span>
							</button>
						</div>

						<!-- Selected Spareparts List -->
						{#if spareparts.length > 0}
							<div class="space-y-1.5 max-h-40 overflow-y-auto">
								{#each spareparts as itm, i}
									<div class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 text-xs">
										<div class="flex-1 min-w-0 pr-2">
											<span class="font-mono font-bold text-amber-600 dark:text-amber-400 text-[10px]">{itm.materialCode}</span>
											<p class="font-bold text-on-surface truncate">{itm.materialName}</p>
											{#if itm.notes}
												<p class="text-[10px] text-on-surface-variant truncate">{itm.notes}</p>
											{/if}
										</div>
										<div class="flex items-center gap-3">
											<span class="font-mono font-black text-amber-700 dark:text-amber-300">
												{itm.qty} {itm.uom}
											</span>
											<button
												type="button"
												onclick={() => removeSparepart(i)}
												class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
												title="Hapus item"
											>
												<span class="material-symbols-outlined text-base">delete</span>
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
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
						class="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
							<span>Menyimpan & Memotong Stok...</span>
						{:else}
							<span class="material-symbols-outlined text-sm">send</span>
							<span>Terbitkan Supply Slip</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
