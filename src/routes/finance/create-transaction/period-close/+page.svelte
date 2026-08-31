<script lang="ts">
	let { data } = $props();
	let isClosing = $state(false);
	let successMsg = $state('');

	function handleClose() {
		isClosing = true;
		setTimeout(() => {
			isClosing = false;
			successMsg = 'Periode buku berjalan berhasil divalidasi dan dikunci!';
		}, 800);
	}
</script>

<svelte:head>
	<title>Tutup Buku Periodik | Finance ERP</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6 max-w-3xl mx-auto">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<a href="/finance/create-transaction" class="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">arrow_back</span>
				</a>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Tutup Buku Periodik (Period End Closing)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5 ml-8">
				Verifikasi integritas jurnal, rekonsiliasi saldo buku besar, dan penguncian transaksi periode berjalan
			</p>
		</div>
	</header>

	{#if successMsg}
		<div class="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
			<span class="material-symbols-outlined">check_circle</span>
			<span>{successMsg}</span>
		</div>
	{/if}

	<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-6">
		<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60 pb-3 flex items-center gap-2">
			<span class="material-symbols-outlined text-amber-600">lock_clock</span>
			<span>Checklist Pra-Tutup Buku</span>
		</h3>

		<div class="space-y-4 text-xs font-medium">
			<div class="flex items-center justify-between p-4 rounded-xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60">
				<div class="flex items-center gap-3">
					<span class="material-symbols-outlined {data.stats.unpostedInvoices === 0 ? 'text-emerald-600' : 'text-amber-600'}">
						{data.stats.unpostedInvoices === 0 ? 'task_alt' : 'pending'}
					</span>
					<div>
						<p class="font-bold text-on-surface">Invoice & Bill Status Draft</p>
						<p class="text-[10px] text-on-surface-variant">Seluruh tagihan harus di-posting sebelum tutup buku</p>
					</div>
				</div>
				<span class="font-mono font-bold {data.stats.unpostedInvoices === 0 ? 'text-emerald-600' : 'text-amber-600'}">
					{data.stats.unpostedInvoices} Dokumen
				</span>
			</div>

			<div class="flex items-center justify-between p-4 rounded-xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60">
				<div class="flex items-center gap-3">
					<span class="material-symbols-outlined {data.stats.unpostedJournals === 0 ? 'text-emerald-600' : 'text-amber-600'}">
						{data.stats.unpostedJournals === 0 ? 'task_alt' : 'pending'}
					</span>
					<div>
						<p class="font-bold text-on-surface">Jurnal Umum Belum Posting</p>
						<p class="text-[10px] text-on-surface-variant">Jurnal penyesuaian harus sudah terekam seimbang</p>
					</div>
				</div>
				<span class="font-mono font-bold {data.stats.unpostedJournals === 0 ? 'text-emerald-600' : 'text-amber-600'}">
					{data.stats.unpostedJournals} Jurnal
				</span>
			</div>
		</div>

		<div class="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
			<span class="text-xs text-on-surface-variant font-medium">Periode aktif: <strong class="text-on-surface">Agustus 2026</strong></span>
			<button
				type="button"
				onclick={handleClose}
				disabled={isClosing}
				class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
			>
				{#if isClosing}
					<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
					<span>Memproses...</span>
				{:else}
					<span class="material-symbols-outlined text-sm">lock</span>
					<span>Validasi & Kunci Periode</span>
				{/if}
			</button>
		</div>
	</div>
</div>
