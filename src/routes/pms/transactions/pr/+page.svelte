<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDateId, getCategoryBadge, getPRStatusBadge } from '$lib/utils/pms';

	let { data } = $props();
	let searchQuery = $state('');
	let statusFilter = $state('');

	let filteredRequests = $derived.by(() => {
		let list = data.requests || [];
		if (statusFilter) {
			list = list.filter((r: any) => r.status === statusFilter);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((r: any) =>
				(r.prNumber && r.prNumber.toLowerCase().includes(q)) ||
				(r.requestedBy && r.requestedBy.toLowerCase().includes(q)) ||
				(r.projectName && r.projectName.toLowerCase().includes(q)) ||
				(r.department && r.department.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>Purchase Requests (PR) | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">assignment</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Purchase Request (PR)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Pengajuan permintaan pengadaan barang & sparepart dari masing-masing departemen
			</p>
		</div>
		<a
			href="/pms/transactions/pr/create"
			class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Buat PR Baru</span>
		</a>
	</header>

	<!-- Search & Filter Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
		<div class="relative flex-1 w-full max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari nomor PR, nama pemohon, atau project..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>

		<div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
			<select
				bind:value={statusFilter}
				class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			>
				<option value="">Semua Status PR</option>
				<option value="PENDING">Menunggu Approval</option>
				<option value="APPROVED">Disetujui (Approved)</option>
				<option value="PROCESSED">Sudah Ada PO</option>
				<option value="REJECTED">Ditolak</option>
			</select>

			<span class="text-xs font-medium text-on-surface-variant whitespace-nowrap">
				Total: <strong class="text-on-surface">{filteredRequests.length}</strong> PR
			</span>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-4">No. PR & Tanggal</th>
						<th class="py-3.5 px-4">Project & Site</th>
						<th class="py-3.5 px-4">Kategori</th>
						<th class="py-3.5 px-4">Pemohon / Dept</th>
						<th class="py-3.5 px-4 text-center">Jumlah Item</th>
						<th class="py-3.5 px-4 text-center">Status</th>
						<th class="py-3.5 px-4 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredRequests.length === 0}
						<tr>
							<td colspan="7" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">assignment</span>
								<p class="text-xs font-semibold">Tidak ada data Purchase Request.</p>
							</td>
						</tr>
					{:else}
						{#each filteredRequests as pr}
							{@const catBadge = getCategoryBadge(pr.category)}
							{@const stBadge = getPRStatusBadge(pr.status)}

							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-4">
									<span class="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs">
										{pr.prNumber}
									</span>
									<p class="text-[10px] text-on-surface-variant mt-0.5">{formatDateId(pr.date)}</p>
								</td>
								<td class="py-3.5 px-4">
									<p class="font-bold text-on-surface">{pr.projectName || '-'}</p>
									<p class="text-[10px] text-on-surface-variant">{pr.siteName || 'Semua Site'}</p>
								</td>
								<td class="py-3.5 px-4">
									<span class="px-2.5 py-1 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 {catBadge.badgeClass}">
										<span class="material-symbols-outlined text-xs">{catBadge.icon}</span>
										<span>{catBadge.label}</span>
									</span>
								</td>
								<td class="py-3.5 px-4">
									<p class="font-semibold text-on-surface">{pr.requestedBy}</p>
									<p class="text-[10px] text-on-surface-variant">{pr.department || 'General'}</p>
								</td>
								<td class="py-3.5 px-4 text-center font-mono font-bold text-on-surface">
									{pr.item_count} item
								</td>
								<td class="py-3.5 px-4 text-center">
									<span class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border {stBadge.badgeClass}">
										<span class="material-symbols-outlined text-xs">{stBadge.icon}</span>
										<span>{stBadge.label}</span>
									</span>
								</td>
								<td class="py-3.5 px-4 text-right">
									<div class="flex items-center justify-end gap-1.5">
										{#if pr.status === 'PENDING' || pr.status === 'DRAFT'}
											<form method="POST" action="?/approvePR" use:enhance>
												<input type="hidden" name="id" value={pr.id} />
												<button
													type="submit"
													title="Approve PR"
													class="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
												>
													<span class="material-symbols-outlined text-base">check</span>
												</button>
											</form>
											<form method="POST" action="?/rejectPR" use:enhance>
												<input type="hidden" name="id" value={pr.id} />
												<button
													type="submit"
													title="Reject PR"
													class="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
												>
													<span class="material-symbols-outlined text-base">close</span>
												</button>
											</form>
										{/if}
										{#if pr.status === 'APPROVED'}
											<a
												href="/pms/transactions/po/create?pr_id={pr.id}"
												class="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
											>
												<span class="material-symbols-outlined text-xs">shopping_cart</span>
												<span>Buat PO</span>
											</a>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
