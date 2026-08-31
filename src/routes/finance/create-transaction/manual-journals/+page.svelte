<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let isSubmitting = $state(false);

	let date = $state(new Date().toISOString().split('T')[0]);
	let reference = $state('');
	let description = $state('');

	interface JournalLine {
		account_id: string;
		description: string;
		debit: number;
		credit: number;
	}

	let lines = $state<JournalLine[]>([
		{ account_id: '', description: '', debit: 0, credit: 0 },
		{ account_id: '', description: '', debit: 0, credit: 0 }
	]);

	function addLine() {
		lines = [...lines, { account_id: '', description: '', debit: 0, credit: 0 }];
	}

	function removeLine(index: number) {
		if (lines.length > 2) {
			lines = lines.filter((_, i) => i !== index);
		}
	}

	let totalDebit = $derived(lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0));
	let totalCredit = $derived(lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0));
	let isBalanced = $derived(totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01);

	function formatCurrency(val: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
	}
</script>

<svelte:head>
	<title>Entri Jurnal Umum (Manual Journal) | Finance ERP</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6 max-w-5xl mx-auto">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<a href="/finance/create-transaction" class="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">arrow_back</span>
				</a>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Entri Jurnal Penyesuaian & Umum (GL)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5 ml-8">
				Pencatatan jurnal umum buku besar manual dengan verifikasi keseimbangan Debit & Kredit
			</p>
		</div>
	</header>

	<form method="POST" action="?/saveJournal" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			isSubmitting = false;
			await update();
		};
	}}>
		<input type="hidden" name="lines" value={JSON.stringify(lines)} />

		<div class="space-y-6">
			<!-- Header Info Card -->
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Tanggal Jurnal <span class="text-rose-500">*</span>
						</label>
						<input
							type="date"
							name="date"
							required
							bind:value={date}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							No. Referensi / Voucher
						</label>
						<input
							type="text"
							name="reference"
							bind:value={reference}
							placeholder="Misal: JV-2026-089"
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none uppercase"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Keterangan / Memo
						</label>
						<input
							type="text"
							name="description"
							bind:value={description}
							placeholder="Deskripsi transaksi jurnal..."
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>
				</div>
			</div>

			<!-- Lines Table Card -->
			<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
				<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center bg-surface-container-highest/20">
					<h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-600 text-base">format_list_bulleted</span>
						<span>Baris Akun Debit & Kredit</span>
					</h3>
					<button
						type="button"
						onclick={addLine}
						class="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
					>
						<span class="material-symbols-outlined text-base">add</span>
						<span>Tambah Baris</span>
					</button>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs min-w-[700px]">
						<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
							<tr>
								<th class="py-3 px-4 w-1/3">Akun COA</th>
								<th class="py-3 px-4">Deskripsi Baris</th>
								<th class="py-3 px-4 text-right w-36">Debit (Rp)</th>
								<th class="py-3 px-4 text-right w-36">Kredit (Rp)</th>
								<th class="py-3 px-3 text-center w-12"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
							{#each lines as line, idx}
								<tr class="hover:bg-surface-container-high/20">
									<td class="py-2.5 px-4">
										<select
											bind:value={line.account_id}
											class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-lg p-2 text-xs font-medium focus:ring-1 focus:ring-amber-500 outline-none"
										>
											<option value="">-- Pilih Akun COA --</option>
											{#each data.accounts as acc}
												<option value={acc.id}>{acc.code} - {acc.name}</option>
											{/each}
										</select>
									</td>
									<td class="py-2.5 px-4">
										<input
											type="text"
											bind:value={line.description}
											placeholder="Keterangan baris..."
											class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
										/>
									</td>
									<td class="py-2.5 px-4">
										<input
											type="number"
											min="0"
											bind:value={line.debit}
											oninput={() => { if (line.debit > 0) line.credit = 0; }}
											class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-lg p-2 text-xs text-right font-mono font-bold focus:ring-1 focus:ring-amber-500 outline-none"
										/>
									</td>
									<td class="py-2.5 px-4">
										<input
											type="number"
											min="0"
											bind:value={line.credit}
											oninput={() => { if (line.credit > 0) line.debit = 0; }}
											class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-lg p-2 text-xs text-right font-mono font-bold focus:ring-1 focus:ring-amber-500 outline-none"
										/>
									</td>
									<td class="py-2.5 px-3 text-center">
										{#if lines.length > 2}
											<button
												type="button"
												onclick={() => removeLine(idx)}
												class="text-slate-400 hover:text-rose-500 p-1 transition-colors"
											>
												<span class="material-symbols-outlined text-base">delete</span>
											</button>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
						<tfoot class="bg-surface-container-high/40 font-bold border-t border-slate-200/60 dark:border-slate-800/60">
							<tr>
								<td colspan="2" class="py-3 px-4 text-right uppercase text-[10px] tracking-wider text-on-surface-variant">Total:</td>
								<td class="py-3 px-4 text-right font-mono text-xs text-emerald-600">{formatCurrency(totalDebit)}</td>
								<td class="py-3 px-4 text-right font-mono text-xs text-rose-600">{formatCurrency(totalCredit)}</td>
								<td></td>
							</tr>
						</tfoot>
					</table>
				</div>

				<!-- Balance Status Alert -->
				<div class="p-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs font-bold {isBalanced ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'}">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-base">{isBalanced ? 'check_circle' : 'error'}</span>
						<span>{isBalanced ? 'Jurnal Seimbang (Balanced)' : 'Jurnal Tidak Seimbang! Selisih: ' + formatCurrency(Math.abs(totalDebit - totalCredit))}</span>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 pt-2">
				<a href="/finance/create-transaction" class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">
					Batal
				</a>
				<button
					type="submit"
					disabled={isSubmitting || !isBalanced}
					class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
						<span>Menyimpan Jurnal...</span>
					{:else}
						<span class="material-symbols-outlined text-sm">save</span>
						<span>Posting Jurnal Umum</span>
					{/if}
				</button>
			</div>
		</div>
	</form>
</div>
