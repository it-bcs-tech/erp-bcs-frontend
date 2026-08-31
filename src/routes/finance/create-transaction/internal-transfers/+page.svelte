<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let isSubmitting = $state(false);

	let date = $state(new Date().toISOString().split('T')[0]);
	let fromAccountId = $state('');
	let toAccountId = $state('');
	let amount = $state(0);
	let reference = $state('');
	let notes = $state('');
</script>

<svelte:head>
	<title>Transfer Antar Bank & Kas | Finance ERP</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6 max-w-3xl mx-auto">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<a href="/finance/create-transaction" class="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">arrow_back</span>
				</a>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Transfer Internal Kas & Bank</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5 ml-8">
				Pemindahan saldo antar rekening bank perusahaan, kas kecil, atau pool operasional
			</p>
		</div>
	</header>

	<form method="POST" action="?/saveTransfer" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			isSubmitting = false;
			await update();
		};
	}}>
		<div class="space-y-6">
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60 pb-3 flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">sync_alt</span>
					<span>Rincian Transfer Saldo</span>
				</h3>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
						Tanggal Transfer <span class="text-rose-500">*</span>
					</label>
					<input
						type="date"
						name="date"
						required
						bind:value={date}
						class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
					/>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Rekening Sumber (Asal) <span class="text-rose-500">*</span>
						</label>
						<select
							name="fromAccountId"
							required
							bind:value={fromAccountId}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="">-- Pilih Rekening Asal --</option>
							{#each data.accounts as acc}
								<option value={acc.id} disabled={acc.id.toString() === toAccountId}>{acc.code} - {acc.name}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Rekening Tujuan <span class="text-rose-500">*</span>
						</label>
						<select
							name="toAccountId"
							required
							bind:value={toAccountId}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="">-- Pilih Rekening Tujuan --</option>
							{#each data.accounts as acc}
								<option value={acc.id} disabled={acc.id.toString() === fromAccountId}>{acc.code} - {acc.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Nominal Transfer (Rp) <span class="text-rose-500">*</span>
						</label>
						<input
							type="number"
							name="amount"
							min="1"
							required
							bind:value={amount}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none text-base text-amber-600"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							No. Referensi / Bukti Mutasi
						</label>
						<input
							type="text"
							name="reference"
							bind:value={reference}
							placeholder="Misal: TRF-INTERN-01"
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none uppercase"
						/>
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
						Catatan
					</label>
					<textarea
						name="notes"
						bind:value={notes}
						rows="2"
						placeholder="Keterangan keperluan transfer..."
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
					disabled={isSubmitting || amount <= 0 || !fromAccountId || !toAccountId}
					class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
						<span>Menyimpan...</span>
					{:else}
						<span class="material-symbols-outlined text-sm">send</span>
						<span>Eksekusi Transfer</span>
					{/if}
				</button>
			</div>
		</div>
	</form>
</div>
