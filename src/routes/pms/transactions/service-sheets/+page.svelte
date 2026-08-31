<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDateId } from '$lib/utils/pms';

	let { data } = $props();
	let isModalOpen = $state(false);
	let isSubmitting = $state(false);
	let searchQuery = $state('');

	let filteredSheets = $derived.by(() => {
		let list = data.sheets || [];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((s: any) =>
				(s.ssNumber && s.ssNumber.toLowerCase().includes(q)) ||
				(s.unitNopol && s.unitNopol.toLowerCase().includes(q)) ||
				(s.woNo && s.woNo.toLowerCase().includes(q)) ||
				(s.mekanikName && s.mekanikName.toLowerCase().includes(q)) ||
				(s.problem && s.problem.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>Service Sheets (SS) | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">build</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Service Sheets (SS / WO)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Pencatatan lembar kerja perbaikan unit truk, mekanik bengkel, dan suku cadang yang dibutuhkan
			</p>
		</div>
		<button
			type="button"
			onclick={() => isModalOpen = true}
			class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Catat Service Sheet Baru</span>
		</button>
	</header>

	<!-- Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between gap-4">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari no SS, nopol unit, mekanik, problem..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Total: <strong class="text-on-surface">{filteredSheets.length}</strong> Service Sheets
		</span>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-4">No. SS & Tanggal</th>
						<th class="py-3.5 px-4">No. Work Order (WO)</th>
						<th class="py-3.5 px-4">No. Unit Armada</th>
						<th class="py-3.5 px-4">Project</th>
						<th class="py-3.5 px-4">Tipe Service</th>
						<th class="py-3.5 px-4">Mekanik</th>
						<th class="py-3.5 px-4">Deskripsi Problem / Kerusakan</th>
						<th class="py-3.5 px-4 text-center">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredSheets.length === 0}
						<tr>
							<td colspan="8" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">build</span>
								<p class="text-xs font-semibold">Tidak ada lembar kerja service.</p>
							</td>
						</tr>
					{:else}
						{#each filteredSheets as ss}
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
								</td>
								<td class="py-3.5 px-4 font-semibold text-on-surface">{ss.projectName || '-'}</td>
								<td class="py-3.5 px-4 text-on-surface-variant">{ss.tipe}</td>
								<td class="py-3.5 px-4 font-semibold text-on-surface">{ss.mekanikName}</td>
								<td class="py-3.5 px-4 text-on-surface max-w-xs">{ss.problem}</td>
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

<!-- Modal Tambah Service Sheet -->
{#if isModalOpen}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">build</span>
					<h3 class="text-base font-extrabold text-on-surface">Catat Service Sheet Baru</h3>
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
								Tanggal
							</label>
							<input
								type="date"
								name="date"
								required
								value={new Date().toISOString().split('T')[0]}
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								No. WO Ref
							</label>
							<input
								type="text"
								name="woNo"
								placeholder="WO-2026-..."
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none uppercase"
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Pilih Unit Armada
							</label>
							<select
								name="unitId"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								<option value="">-- Non-Unit --</option>
								{#each data.units as u}
									<option value={u.id}>{u.nopol} ({u.hull_number || u.model})</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Project
							</label>
							<select
								name="projectId"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								<option value="">-- Bebas --</option>
								{#each data.projects as p}
									<option value={p.id}>{p.project_name}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Tipe Service
							</label>
							<select
								name="tipe"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								<option value="Perawatan Rutin">Perawatan Rutin</option>
								<option value="Ganti Oli & Filter">Ganti Oli & Filter</option>
								<option value="Perbaikan Rem & Kaki-Kaki">Perbaikan Rem & Kaki-Kaki</option>
								<option value="Overhaul Mesin">Overhaul Mesin</option>
								<option value="Body & Painting">Body & Painting</option>
							</select>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Nama Mekanik
							</label>
							<input
								type="text"
								name="mekanikName"
								placeholder="Nama teknisi"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Problem / Kerusakan <span class="text-rose-500">*</span>
						</label>
						<textarea
							name="problem"
							required
							rows="2"
							placeholder="Keluhan driver / detail kerusakan..."
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
							<span>Simpan SS</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
