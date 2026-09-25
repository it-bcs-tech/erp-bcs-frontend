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
	<header class="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
				<span class="material-symbols-outlined text-2xl">assignment_turned_in</span>
			</div>
			<div>
				<h1 class="text-xl font-bold text-on-surface tracking-tight">Closing Ritase & Biaya Kasir</h1>
				<p class="text-xs text-on-surface-variant font-medium mt-0.5">
					Validasi biaya ekstra pengiriman, pengembalian sisa UJO supir, dan penutupan buku ritase DO
				</p>
			</div>
		</div>
		
		<div class="inline-flex p-1 rounded-xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70 self-start md:self-auto">
			<button
				class="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 {filterStatus === 'UNPAID' ? 'bg-surface-container-lowest text-amber-600 dark:text-amber-400 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
				onclick={() => filterStatus = 'UNPAID'}
			>
				<span class="w-2 h-2 rounded-full bg-amber-500"></span>
				<span>Menunggu Closing</span>
				<span class="px-1.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] rounded-full font-mono">
					{settlements.filter(s => s.paymentStatus === 'UNPAID').length}
				</span>
			</button>
			<button
				class="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 {filterStatus === 'PAID' ? 'bg-surface-container-lowest text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
				onclick={() => filterStatus = 'PAID'}
			>
				<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
				<span>Sudah Selesai</span>
				<span class="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] rounded-full font-mono">
					{settlements.filter(s => s.paymentStatus === 'PAID').length}
				</span>
			</button>
		</div>
	</header>

	<!-- Table Container -->
	<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-xs overflow-hidden flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-xs min-w-[800px]">
				<thead class="bg-surface-container-low/50 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80">
					<tr>
						<th class="py-3 px-5">Nomor DO & Armada</th>
						<th class="py-3 px-5">Rute & Tonase</th>
						<th class="py-3 px-5 text-right">Rekap UJO & Biaya Ekstra</th>
						<th class="py-3 px-5 text-center">Status</th>
						<th class="py-3 px-5 text-right">Aksi Kasir</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
					{#if filteredSettlements.length === 0}
						<tr>
							<td colspan="5" class="py-12 text-center text-xs font-medium text-on-surface-variant">
								<div class="flex flex-col items-center justify-center gap-2">
									<span class="material-symbols-outlined text-3xl text-on-surface-variant/40">task_alt</span>
									<span>Tidak ada antrean penyelesaian biaya pada status ini.</span>
								</div>
							</td>
						</tr>
					{/if}
					{#each filteredSettlements as item}
						<tr class="hover:bg-surface-container-low/40 transition-colors group">
							<td class="py-3.5 px-5">
								<p class="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">{item.id}</p>
								<div class="flex items-center gap-2 mt-1 text-[11px] text-on-surface-variant">
									<span>Supir: <strong class="text-on-surface">{item.driver}</strong></span>
									<span>•</span>
									<span>Unit: <strong class="text-on-surface">{item.unit}</strong></span>
								</div>
							</td>
							<td class="py-3.5 px-5">
								<p class="text-xs font-bold text-on-surface">{item.origin} → {item.destination}</p>
								<div class="mt-1.5 flex gap-2">
									<span class="px-2 py-0.5 bg-surface-container-low text-on-surface-variant text-[10px] font-medium rounded-md border border-slate-200/70 dark:border-slate-800/70">
										Est: <b>{item.estWeight} Ton</b>
									</span>
									<span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold rounded-md border border-emerald-200/50 dark:border-emerald-800/50">
										Real: <b>{item.realWeight || 0} Ton</b>
									</span>
								</div>
							</td>
							<td class="py-3.5 px-5 text-right">
								<div class="text-[11px] text-on-surface-variant space-y-1 mb-1.5 border-b border-slate-100 dark:border-slate-800/80 pb-1.5 inline-block text-right">
									<div class="flex justify-between gap-6"><span class="text-on-surface-variant">Total UJO:</span> <span class="font-mono text-on-surface font-semibold">{formatCurrency(item.ujo)}</span></div>
									<div class="flex justify-between gap-6">
										<span class="text-rose-600 dark:text-rose-400 font-medium">Extra Cost:</span> 
										<span class="text-rose-600 dark:text-rose-400 font-mono font-bold">{formatCurrency(item.extraCost || 0)}</span>
									</div>
									{#if item.desc}
										<div class="text-[10px] italic text-rose-600 dark:text-rose-400 max-w-[180px] text-right ml-auto">"{item.desc}"</div>
									{/if}
								</div>
								{#if (item.extraCost || 0) > 0}
									<p class="text-[10px] font-medium text-on-surface-variant">Harus Dibayar ke Supir:</p>
									<p class="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">{formatCurrency(item.extraCost)}</p>
								{:else}
									<p class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
										<span class="material-symbols-outlined text-[13px]">check_circle</span>
										<span>Clear (Nihil Extra)</span>
									</p>
								{/if}
							</td>
							<td class="py-3.5 px-5 text-center">
								{#if item.paymentStatus === 'PAID'}
									<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
										<span class="material-symbols-outlined text-[13px]">task_alt</span>
										<span class="uppercase tracking-wider">Selesai</span>
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
										<span class="material-symbols-outlined text-[13px]">pending_actions</span>
										<span class="uppercase tracking-wider">Menunggu</span>
									</span>
								{/if}
							</td>
							<td class="py-3.5 px-5 text-right">
								{#if item.paymentStatus === 'UNPAID'}
									<form method="POST" action="?/settleClosing" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; } }}>
										<input type="hidden" name="orderId" value={item.soId}>
										<button type="submit" disabled={isSubmitting} class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 justify-center w-full disabled:opacity-50 cursor-pointer">
											<span class="material-symbols-outlined text-[15px]">check_circle</span>
											<span>Selesaikan Closing</span>
										</button>
									</form>
								{:else}
									<button class="px-3 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold rounded-xl border border-slate-200/70 dark:border-slate-800/70 flex items-center gap-1.5 justify-center w-full transition-colors cursor-pointer">
										<span class="material-symbols-outlined text-[15px]">receipt</span>
										<span>Nota Closing</span>
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
