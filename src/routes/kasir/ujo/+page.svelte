<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { fade, slide } from 'svelte/transition';

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
	<title>Pencairan UJO | Kasir</title>
</svelte:head>

<div class="flex flex-col h-full">
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<a href="/kasir" class="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 mb-2">
				<span class="material-symbols-outlined text-[14px]">arrow_back</span> Kembali ke Dashboard
			</a>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Pencairan UJO</h1>
			<p class="text-on-surface-variant font-medium text-sm">Proses pencairan Uang Jalan Operasional untuk supir.</p>
		</div>
		<div class="flex flex-col gap-3 items-end">
			<div class="flex bg-surface-container-low p-1 rounded-xl">
				<button class="px-4 py-2 rounded-lg text-sm font-bold transition-colors {activeTab === 'REGULAR' ? 'bg-indigo-600 shadow-sm text-white' : 'text-on-surface-variant hover:text-on-surface'}" onclick={() => activeTab = 'REGULAR'}>
					UJO Reguler
				</button>
				<button class="px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 {activeTab === 'CONTRACT' ? 'bg-indigo-600 shadow-sm text-white' : 'text-on-surface-variant hover:text-on-surface'}" onclick={() => activeTab = 'CONTRACT'}>
					<span class="material-symbols-outlined text-[16px]">handshake</span> UJO Kontrak (PO)
				</button>
			</div>
			<div class="flex bg-surface-container-low p-1 rounded-xl self-end">
				<button class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {filterStatus === 'UNPAID' ? 'bg-white shadow-sm text-indigo-700' : 'text-on-surface-variant hover:text-on-surface'}" onclick={() => filterStatus = 'UNPAID'}>
					Menunggu Cair
				</button>
				<button class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {filterStatus === 'PAID' ? 'bg-white shadow-sm text-emerald-700' : 'text-on-surface-variant hover:text-on-surface'}" onclick={() => filterStatus = 'PAID'}>
					Sudah Cair
				</button>
			</div>
		</div>
	</header>

	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm border border-surface-container flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse min-w-[800px]">
				<thead>
					<tr class="border-b border-surface-container bg-surface-container-low/50">
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">DO / Order</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Supir & Unit</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Rute</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Rincian UJO</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-center">Status Pembayaran</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#if filteredRequests.length === 0}
						<tr>
							<td colspan="6" class="py-8 text-center text-sm font-medium text-on-surface-variant">
								Tidak ada data pencairan UJO.
							</td>
						</tr>
					{/if}
					{#each filteredRequests as req}
						<tr class="hover:bg-surface-container-low/30 transition-colors">
							<td class="py-4 px-6">
								<p class="text-sm font-black text-on-surface">{req.id}</p>
								<p class="text-[10px] text-on-surface-variant font-medium mt-1">Muat: {req.loadingDate ? new Date(req.loadingDate).toLocaleDateString('id-ID') : '-'}</p>
								<span class="inline-block mt-2 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border {req.status === 'READY_TO_DISPATCH' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-sky-50 text-sky-700 border-sky-200'}">
									{req.status}
								</span>
							</td>
							<td class="py-4 px-6">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
										<span class="material-symbols-outlined text-[20px]">person</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{req.driver}</p>
										<p class="text-[11px] text-on-surface-variant font-medium mt-0.5">{req.unit}</p>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<p class="text-[11px] font-bold text-on-surface">{req.origin}</p>
								<p class="text-[10px] text-on-surface-variant">↓</p>
								<p class="text-[11px] font-bold text-on-surface">{req.destination}</p>
							</td>
							<td class="py-4 px-6 text-right">
								{#if activeTab !== 'REGULAR'}
									<div class="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded inline-block mb-1 border border-indigo-200">
										UJO KONTRAK (PO)
									</div><br>
								{/if}
								<div class="text-[10px] text-on-surface-variant space-y-1 mb-2 border-b border-surface-container pb-2 inline-block text-left w-full max-w-[150px]">
									<div class="flex justify-between gap-4"><span class="font-medium">UJO Dasar:</span> <span>{formatCurrency(req.amount - (req.ujoMakan||0) - (req.ujoTol||0))}</span></div>
									<div class="flex justify-between gap-4"><span class="font-medium">Uang Makan:</span> <span>{formatCurrency(req.ujoMakan||0)}</span></div>
									<div class="flex justify-between gap-4"><span class="font-medium">Tol:</span> <span>{formatCurrency(req.ujoTol||0)}</span></div>
								</div>
								<p class="text-base font-black text-indigo-600">{formatCurrency(req.amount)}</p>
							</td>
							<td class="py-4 px-6 text-center">
								{#if req.paymentStatus === 'PAID'}
									<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
										<span class="material-symbols-outlined text-[16px]">check_circle</span>
										<span class="text-[10px] font-bold uppercase tracking-wider">Telah Cair</span>
									</div>
								{:else}
									<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
										<span class="material-symbols-outlined text-[16px]">pending</span>
										<span class="text-[10px] font-bold uppercase tracking-wider">Menunggu Cair</span>
									</div>
								{/if}
							</td>
							<td class="py-4 px-6 text-right">
								{#if req.paymentStatus === 'UNPAID'}
									<form method="POST" action="?/payUjo" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); } }}>
										<input type="hidden" name="orderId" value={req.id}>
										<button type="submit" disabled={isSubmitting} class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 justify-end w-full disabled:opacity-50">
											<span class="material-symbols-outlined text-[16px]">payments</span> Cairkan
										</button>
									</form>
								{:else}
									<button class="px-4 py-2 bg-surface-container text-on-surface-variant text-xs font-bold rounded-xl flex items-center gap-2 justify-end w-full hover:bg-surface-container-high transition-colors">
										<span class="material-symbols-outlined text-[16px]">print</span> Cetak Bukti
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
