<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let isSubmitting = $state(false);

	let date = $state(new Date().toISOString().split('T')[0]);
	let customerId = $state('');
	let invoiceId = $state('');
	let amount = $state(0);
	let reason = $state('');

	function formatCurrency(val: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
	}

	let availableInvoices = $derived.by(() => {
		if (!customerId) return data.invoices || [];
		return (data.invoices || []).filter((i: any) => i.customer_id === customerId);
	});
</script>

<svelte:head>
	<title>Buat Credit Note | Finance ERP</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6 max-w-3xl mx-auto">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<a href="/finance/create-transaction" class="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">arrow_back</span>
				</a>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Buat Credit Note (Nota Kredit)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5 ml-8">
				Penerbitan nota kredit untuk potongan invoice, retur tagihan, atau penyesuaian saldo piutang
			</p>
		</div>
	</header>

	<form method="POST" action="?/saveCreditNote" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			isSubmitting = false;
			await update();
		};
	}}>
		<div class="space-y-6">
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60 pb-3 flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">receipt</span>
					<span>Rincian Nota Kredit</span>
				</h3>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Pilih Kustomer <span class="text-rose-500">*</span>
						</label>
						<select
							name="customerId"
							required
							bind:value={customerId}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="">-- Pilih Kustomer --</option>
							{#each data.customers as c}
								<option value={c.id}>{c.name} ({c.code})</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Tanggal Credit Note <span class="text-rose-500">*</span>
						</label>
						<input
							type="date"
							name="date"
							required
							bind:value={date}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Referensi Invoice Terkait (Opsional)
						</label>
						<select
							name="invoiceId"
							bind:value={invoiceId}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="">-- Tanpa Referensi Invoice Tertentu --</option>
							{#each availableInvoices as inv}
								<option value={inv.id}>{inv.invoice_number} ({formatCurrency(inv.total_amount)})</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Nominal Credit Note (Rp) <span class="text-rose-500">*</span>
						</label>
						<input
							type="number"
							name="amount"
							min="1"
							required
							bind:value={amount}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none text-base text-emerald-600"
						/>
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
						Alasan / Keterangan Penyesuaian
					</label>
					<textarea
						name="reason"
						bind:value={reason}
						rows="2"
						placeholder="Misal: Diskon kompensasi keterlambatan bongkar muat..."
						class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none resize-none"
					></textarea>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 pt-2">
				<a href="/finance/create-transaction" class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">
					Batal
				</a>
				<button
					type="submit"
					disabled={isSubmitting || amount <= 0 || !customerId}
					class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
						<span>Menyimpan...</span>
					{:else}
						<span class="material-symbols-outlined text-sm">check_circle</span>
						<span>Terbitkan Credit Note</span>
					{/if}
				</button>
			</div>
		</div>
	</form>
</div>
