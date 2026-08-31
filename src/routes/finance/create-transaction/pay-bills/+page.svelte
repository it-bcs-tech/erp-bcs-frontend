<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let isSubmitting = $state(false);

	let date = $state(new Date().toISOString().split('T')[0]);
	let vendorId = $state('');
	let accountId = $state('');
	let selectedBillId = $state('');
	let amount = $state(0);
	let reference = $state('');
	let notes = $state('');

	function formatCurrency(val: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
	}

	let availableBills = $derived.by(() => {
		if (!vendorId) return data.unpaidBills || [];
		return (data.unpaidBills || []).filter((b: any) => b.vendor_id === vendorId);
	});

	function handleBillSelect(e: Event) {
		const bId = (e.target as HTMLSelectElement).value;
		selectedBillId = bId;
		if (bId) {
			const found = data.unpaidBills.find((b: any) => b.id.toString() === bId);
			if (found) {
				const due = Number(found.total_amount) - Number(found.paid_amount);
				amount = Math.max(0, due);
				vendorId = found.vendor_id;
			}
		}
	}
</script>

<svelte:head>
	<title>Bayar Tagihan Vendor (Pay Bills) | Finance ERP</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6 max-w-4xl mx-auto">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<a href="/finance/create-transaction" class="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">arrow_back</span>
				</a>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Bayar Tagihan Vendor (Pay Bills)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5 ml-8">
				Pencatatan pengeluaran kas / transfer bank untuk pelunasan tagihan Vendor Bills
			</p>
		</div>
	</header>

	<form method="POST" action="?/savePayment" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			isSubmitting = false;
			await update();
		};
	}}>
		<div class="space-y-6">
			<!-- Section: Data Pengeluaran Kas/Bank -->
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60 pb-3 flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">account_balance_wallet</span>
					<span>Rincian Pembayaran Kas / Bank</span>
				</h3>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Pilih Vendor / Pemasok <span class="text-rose-500">*</span>
						</label>
						<select
							name="vendorId"
							required
							bind:value={vendorId}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="">-- Pilih Vendor --</option>
							{#each data.vendors as v}
								<option value={v.id}>{v.name} ({v.code})</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Tanggal Pembayaran <span class="text-rose-500">*</span>
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
							Tagihan Vendor Bill yang Dibayar (Opsional)
						</label>
						<select
							name="billId"
							value={selectedBillId}
							onchange={handleBillSelect}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="">-- Pembayaran Langsung / Tanpa Tagihan --</option>
							{#each availableBills as b}
								{@const due = Number(b.total_amount) - Number(b.paid_amount)}
								<option value={b.id}>{b.bill_number} • {b.vendor_name} (Sisa: {formatCurrency(due)})</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Sumber Rekening / Akun Kas/Bank <span class="text-rose-500">*</span>
						</label>
						<select
							name="accountId"
							required
							bind:value={accountId}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="">-- Pilih Akun Kas/Bank --</option>
							{#each data.accounts as acc}
								<option value={acc.id}>{acc.code} - {acc.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Jumlah Pembayaran (Rp) <span class="text-rose-500">*</span>
						</label>
						<input
							type="number"
							name="amount"
							min="1"
							required
							bind:value={amount}
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none text-base text-rose-600"
						/>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							No. Referensi / Bukti Transfer
						</label>
						<input
							type="text"
							name="reference"
							bind:value={reference}
							placeholder="Misal: TRF-BCA-8921"
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none uppercase"
						/>
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
						Catatan Pembayaran
					</label>
					<textarea
						name="notes"
						bind:value={notes}
						rows="2"
						placeholder="Keterangan transaksi..."
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
					disabled={isSubmitting || amount <= 0 || !vendorId}
					class="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
						<span>Memproses Pembayaran...</span>
					{:else}
						<span class="material-symbols-outlined text-sm">send</span>
						<span>Konfirmasi Pengeluaran Kas</span>
					{/if}
				</button>
			</div>
		</div>
	</form>
</div>
