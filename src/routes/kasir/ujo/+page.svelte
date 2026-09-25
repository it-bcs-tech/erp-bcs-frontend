<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData, form: ActionData } = $props();
	let requests = $derived(data.ujoRequests || []);
	let contractRequests = $derived(data.contractUjos || []);

	let filterStatus = $state('UNPAID');
	let activeTab = $state('REGULAR'); // REGULAR | CONTRACT

	let filteredRequests = $derived.by(() => {
		const source = activeTab === 'REGULAR' ? requests : contractRequests;
		return source.filter((r: any) => r.paymentStatus === filterStatus);
	});

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

	let isSubmitting = $state(false);

	$effect(() => {
		if (form?.success || form?.error) {
			isSubmitting = false;
			if (form.error) alert(form.error);
		}
	});
</script>

<svelte:head>
	<title>Pencairan UJO | Kasir ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">payments</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Pencairan UJO Supir</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Verifikasi permohonan Uang Jalan Operasional supir armada reguler & kontrak sebelum keberangkatan DO
			</p>
		</div>
		<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
			<!-- Tab Tipe UJO -->
			<div class="inline-flex p-1 rounded-2xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70">
				<button class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all {activeTab === 'REGULAR' ? 'bg-emerald-600 text-white' : 'text-on-surface hover:bg-surface-container'}" onclick={() => activeTab = 'REGULAR'}>
					UJO Reguler
				</button>
				<button class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 {activeTab === 'CONTRACT' ? 'bg-emerald-600 text-white' : 'text-on-surface hover:bg-surface-container'}" onclick={() => activeTab = 'CONTRACT'}>
					<span class="material-symbols-outlined text-sm">handshake</span>
					<span>UJO Kontrak</span>
				</button>
			</div>

			<!-- Tab Status -->
			<div class="inline-flex p-1 rounded-2xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70">
				<button class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all {filterStatus === 'UNPAID' ? 'bg-amber-500 text-white' : 'text-on-surface hover:bg-surface-container'}" onclick={() => filterStatus = 'UNPAID'}>
					Menunggu Cair
				</button>
				<button class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all {filterStatus === 'PAID' ? 'bg-emerald-600 text-white' : 'text-on-surface hover:bg-surface-container'}" onclick={() => filterStatus = 'PAID'}>
					Sudah Cair
				</button>
			</div>
		</div>
	</header>

	<!-- Table Container -->
	<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 overflow-hidden flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[800px]">
				<thead class="bg-surface-container-low/50 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/70 dark:border-slate-800/70">
					<tr>
						<th class="py-3.5 px-5">Nomor DO & Jadwal</th>
						<th class="py-3.5 px-5">Supir & Armada</th>
						<th class="py-3.5 px-5">Rute Perjalanan</th>
						<th class="py-3.5 px-5 text-right">Rincian Nominal UJO</th>
						<th class="py-3.5 px-5 text-center">Status Bayar</th>
						<th class="py-3.5 px-5 text-right">Aksi Kasir</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if filteredRequests.length === 0}
						<tr>
							<td colspan="6" class="py-12 text-center text-sm font-medium text-on-surface-variant">
								<div class="flex flex-col items-center gap-2">
									<span class="material-symbols-outlined text-4xl opacity-40">payments</span>
									<p class="font-bold">Tidak ada data pencairan UJO.</p>
								</div>
							</td>
						</tr>
					{/if}
					{#each filteredRequests as req}
						<tr class="hover:bg-surface-container/40 transition-colors">
							<td class="py-4 px-5">
								<p class="text-sm font-black font-mono text-on-surface">{req.id}</p>
								<p class="text-[10px] text-on-surface-variant font-medium mt-0.5">Muat: {req.loadingDate ? new Date(req.loadingDate).toLocaleDateString('id-ID') : '-'}</p>
								<span class="inline-flex items-center gap-1 mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border {req.status === 'READY_TO_DISPATCH' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800'}">
									{req.status}
								</span>
							</td>
							<td class="py-4 px-5">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex-shrink-0">
										<span class="material-symbols-outlined text-[18px]">person</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{req.driver}</p>
										<p class="text-[11px] text-on-surface-variant font-medium mt-0.5">{req.unit}</p>
									</div>
								</div>
							</td>
							<td class="py-4 px-5">
								<p class="text-[11px] font-bold text-on-surface">{req.origin}</p>
								<p class="text-[10px] text-on-surface-variant my-0.5">↓</p>
								<p class="text-[11px] font-bold text-on-surface">{req.destination}</p>
							</td>
							<td class="py-4 px-5 text-right">
								{#if activeTab !== 'REGULAR'}
									<div class="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full inline-block mb-1 border border-emerald-200 dark:border-emerald-800">
										UJO KONTRAK (PO)
									</div><br>
								{/if}
								<div class="text-[10px] text-on-surface-variant space-y-0.5 mb-1.5 border-b border-surface-container pb-1.5 inline-block text-left w-full max-w-[150px]">
									<div class="flex justify-between gap-4"><span class="font-medium">UJO Dasar:</span> <span class="font-mono">{formatCurrency(req.amount - (req.ujoMakan||0) - (req.ujoTol||0))}</span></div>
									<div class="flex justify-between gap-4"><span class="font-medium">Uang Makan:</span> <span class="font-mono">{formatCurrency(req.ujoMakan||0)}</span></div>
									<div class="flex justify-between gap-4"><span class="font-medium">Tol:</span> <span class="font-mono">{formatCurrency(req.ujoTol||0)}</span></div>
								</div>
								<p class="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(req.amount)}</p>
							</td>
							<td class="py-4 px-5 text-center">
								{#if req.paymentStatus === 'PAID'}
									<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold uppercase tracking-wider">
										<span class="material-symbols-outlined text-[14px]">check_circle</span>
										<span>Telah Cair</span>
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold uppercase tracking-wider">
										<span class="material-symbols-outlined text-[14px]">pending</span>
										<span>Menunggu Cair</span>
									</span>
								{/if}
							</td>
							<td class="py-4 px-5 text-right whitespace-nowrap">
								{#if req.paymentStatus === 'UNPAID'}
									<form method="POST" action="?/payUjo" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); } }}>
										<input type="hidden" name="orderId" value={req.soId}>
										<button type="submit" disabled={isSubmitting} class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 justify-center w-full disabled:opacity-50">
											<span class="material-symbols-outlined text-[16px]">payments</span>
											<span>Cairkan UJO</span>
										</button>
									</form>
								{:else}
									<button class="px-4 py-2 bg-surface-container text-on-surface-variant text-xs font-bold rounded-xl flex items-center gap-2 justify-center w-full hover:bg-surface-container-high transition-colors">
										<span class="material-symbols-outlined text-[16px]">print</span>
										<span>Cetak Bukti</span>
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
