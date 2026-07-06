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

<div class="space-y-6">
	<!-- Page Header -->
	<header class="flex justify-between items-end border-b border-surface-container pb-6">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2 flex items-center gap-2">
				<span class="material-symbols-outlined text-4xl text-primary">assignment_add</span>
				Purchase Requests
			</h1>
			<p class="text-on-surface-variant font-medium">Daftar permintaan pembelian internal (PR).</p>
		</div>
		<div class="flex gap-3">
			<a href="/pms/purchasing/requests/create" class="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm">
				<span class="material-symbols-outlined text-[18px]">add</span> Buat PR Baru
			</a>
		</div>
	</header>

	<!-- Table -->
	<div class="bg-surface-container-lowest rounded-3xl shadow-sm border border-surface-container overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left">
				<thead class="bg-surface-container-low/50 border-b border-surface-container text-xs font-black uppercase text-on-surface-variant tracking-wider">
					<tr>
						<th class="p-5">No. PR</th>
						<th class="p-5">Tanggal</th>
						<th class="p-5">Departemen</th>
						<th class="p-5">Diminta Oleh</th>
						<th class="p-5 text-center">Jml Item</th>
						<th class="p-5 text-center">Status</th>
						<th class="p-5 text-center">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container text-sm">
					{#each data.requests as req}
						<tr class="hover:bg-surface-container-low/30 transition-colors">
							<td class="p-5 font-bold text-primary">{req.pr_number}</td>
							<td class="p-5 font-medium text-on-surface-variant">{formatDate(req.date)}</td>
							<td class="p-5 font-bold text-on-surface">{req.department || '-'}</td>
							<td class="p-5 font-medium text-on-surface-variant">{req.requested_by || '-'}</td>
							<td class="p-5 text-center font-black text-on-surface">{req.item_count}</td>
							<td class="p-5 text-center">
								<span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border {getStatusBadge(req.status)}">
									{req.status}
								</span>
							</td>
							<td class="p-5">
								<div class="flex items-center justify-center gap-2">
									<button class="w-8 h-8 rounded-full bg-surface-container hover:bg-blue-100 hover:text-blue-700 flex items-center justify-center transition-colors" title="Lihat">
										<span class="material-symbols-outlined text-[18px]">visibility</span>
									</button>
								</div>
							</td>
						</tr>
					{/each}
					{#if data.requests.length === 0}
						<tr>
							<td colspan="7" class="p-12 text-center text-on-surface-variant font-medium">
								Belum ada Purchase Request.
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
