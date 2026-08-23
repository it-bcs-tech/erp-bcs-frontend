<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData, form: ActionData } = $props();
	let settlements = $derived(data.settlements || []);

	let filterStatus = $state('UNPAID');

	let filteredSettlements = $derived.by(() => {
		return settlements.filter(s => s.paymentStatus === filterStatus);
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
	<title>Closing Settlement | Kasir</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">assignment_turned_in</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Closing Ritase & Biaya Kasir</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Validasi biaya ekstra pengiriman, pengembalian sisa UJO supir, dan penutupan buku ritase DO
			</p>
		</div>
		
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800">
			<button class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all {filterStatus === 'UNPAID' ? 'bg-amber-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}" onclick={() => filterStatus = 'UNPAID'}>
				Menunggu Closing
			</button>
			<button class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all {filterStatus === 'PAID' ? 'bg-emerald-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}" onclick={() => filterStatus = 'PAID'}>
				Sudah Selesai
			</button>
		</div>
	</header>

	<!-- Table Container -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[800px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Nomor DO & Armada</th>
						<th class="py-3.5 px-5">Rute & Tonase</th>
						<th class="py-3.5 px-5 text-right">Rekap UJO & Biaya Ekstra</th>
						<th class="py-3.5 px-5 text-center">Status</th>
						<th class="py-3.5 px-5 text-right">Aksi Kasir</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if filteredSettlements.length === 0}
						<tr>
							<td colspan="5" class="py-8 text-center text-sm font-medium text-on-surface-variant">
								Tidak ada antrean penyelesaian biaya.
							</td>
						</tr>
					{/if}
					{#each filteredSettlements as item}
						<tr class="hover:bg-surface-container-low/30 transition-colors group">
							<td class="py-4 px-6">
								<p class="text-sm font-black text-on-surface">{item.id}</p>
								<p class="text-[11px] text-on-surface-variant font-medium mt-1">Supir: <span class="text-on-surface">{item.driver}</span></p>
								<p class="text-[11px] text-on-surface-variant font-medium">Unit: <span class="text-on-surface">{item.unit}</span></p>
							</td>
							<td class="py-4 px-6">
								<p class="text-[11px] font-bold text-on-surface">{item.origin} → {item.destination}</p>
								<div class="mt-2 flex gap-2">
									<div class="px-2 py-1 bg-surface-container text-on-surface text-[9px] font-medium rounded border border-surface-container-high">
										Est: <b>{item.estWeight} Ton</b>
									</div>
									<div class="px-2 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded border border-emerald-200">
										Real: <b>{item.realWeight || 0} Ton</b>
									</div>
								</div>
							</td>
							<td class="py-4 px-6 text-right">
								<div class="text-[10px] text-on-surface-variant space-y-1 mb-2 border-b border-surface-container pb-2 inline-block">
									<div class="flex justify-between gap-6"><span class="font-medium">Total UJO Awal:</span> <span>{formatCurrency(item.ujo)}</span></div>
									<div class="flex justify-between gap-6">
										<span class="font-medium text-rose-600">Extra Cost (Retribusidll):</span> 
										<span class="text-rose-600">{formatCurrency(item.extraCost || 0)}</span>
									</div>
									{#if item.desc}
										<div class="text-[9px] italic text-rose-600 max-w-[150px] text-right ml-auto">"{item.desc}"</div>
									{/if}
								</div>
								{#if (item.extraCost || 0) > 0}
									<p class="text-xs font-bold text-on-surface">Harus Dibayar ke Supir:</p>
									<p class="text-lg font-black text-rose-600">{formatCurrency(item.extraCost)}</p>
								{:else}
									<p class="text-xs font-bold text-emerald-600">Clear (Tidak ada extra)</p>
								{/if}
							</td>
							<td class="py-4 px-6 text-center">
								{#if item.paymentStatus === 'PAID'}
									<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
										<span class="material-symbols-outlined text-[16px]">task_alt</span>
										<span class="text-[10px] font-bold uppercase tracking-wider">Selesai</span>
									</div>
								{:else}
									<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
										<span class="material-symbols-outlined text-[16px]">pending_actions</span>
										<span class="text-[10px] font-bold uppercase tracking-wider">Menunggu</span>
									</div>
								{/if}
							</td>
							<td class="py-4 px-6 text-right">
								{#if item.paymentStatus === 'UNPAID'}
									<form method="POST" action="?/settleClosing" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); } }}>
										<input type="hidden" name="orderId" value={item.soId}>
										<button type="submit" disabled={isSubmitting} class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 justify-end w-full disabled:opacity-50">
											<span class="material-symbols-outlined text-[16px]">check_circle</span> Selesaikan Order
										</button>
									</form>
								{:else}
									<button class="px-4 py-2 bg-surface-container text-on-surface-variant text-xs font-bold rounded-xl flex items-center gap-2 justify-end w-full hover:bg-surface-container-high transition-colors">
										<span class="material-symbols-outlined text-[16px]">receipt</span> Nota Closing
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
