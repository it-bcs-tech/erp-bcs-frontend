<script lang="ts">
	let { data } = $props();

	const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '-';

	function getStatusBadge(status: string) {
		switch(status) {
			case 'DRAFT': return 'bg-slate-100 text-slate-700 border-slate-200';
			case 'APPROVED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
			case 'CANCELLED': return 'bg-rose-100 text-rose-700 border-rose-200';
			default: return 'bg-slate-100 text-slate-700 border-slate-200';
		}
	}
</script>

<svelte:head>
	<title>Purchase Requests | PMS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Page Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">assignment_add</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Purchase Requests (PR)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Daftar pengajuan permintaan barang/sparepart internal departemen sebelum diterbitkan Purchase Order (PO)
			</p>
		</div>
		<div class="flex gap-3">
			<a href="/pms/purchasing/requests/create" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs transition-colors">
				<span class="material-symbols-outlined text-lg">add</span>
				<span>Buat PR Baru</span>
			</a>
		</div>
	</header>

	<!-- Table Container -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[750px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">No. PR</th>
						<th class="py-3.5 px-5">Tanggal</th>
						<th class="py-3.5 px-5">Departemen</th>
						<th class="py-3.5 px-5">Diminta Oleh</th>
						<th class="py-3.5 px-5 text-center">Jml Item</th>
						<th class="py-3.5 px-5 text-center">Status</th>
						<th class="py-3.5 px-5 text-center">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each data.requests as req}
						<tr class="hover:bg-surface-container transition-colors">
							<td class="py-4 px-5 font-bold text-emerald-600 font-mono">{req.pr_number}</td>
							<td class="py-4 px-5 font-medium text-on-surface-variant text-xs">{formatDate(req.date)}</td>
							<td class="py-4 px-5 font-bold text-on-surface">{req.department || '-'}</td>
							<td class="py-4 px-5 font-medium text-on-surface-variant">{req.requested_by || '-'}</td>
							<td class="py-4 px-5 text-center font-bold text-on-surface">{req.item_count}</td>
							<td class="py-4 px-5 text-center">
								<span class="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border {getStatusBadge(req.status)}">
									{req.status}
								</span>
							</td>
							<td class="py-4 px-5">
								<div class="flex items-center justify-center gap-1.5">
									{#if req.status === 'DRAFT'}
										<form method="POST" action="?/approvePR" onsubmit={() => confirm('Apakah Anda yakin ingin menyetujui PR ini?')}>
											<input type="hidden" name="id" value={req.id} />
											<button type="submit" class="p-2 rounded-lg text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors" title="Setujui (Approve)">
												<span class="material-symbols-outlined text-lg">check</span>
											</button>
										</form>
									{/if}
									<button class="p-2 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors" title="Lihat Detail">
										<span class="material-symbols-outlined text-lg">visibility</span>
									</button>
								</div>
							</td>
						</tr>
					{/each}
					{#if data.requests.length === 0}
						<tr>
							<td colspan="7" class="py-16 text-center text-on-surface-variant font-medium">
								<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 block mb-2">assignment_late</span>
								<p class="font-bold text-on-surface">Belum ada Purchase Request</p>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
