<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	// Modal State
	let showModal = $state(false);
	let isLoadingDetail = $state(false);
	let paymentDetail = $state<any>(null);
	let actionLoading = $state(false);

	async function openDetail(id: string) {
		showModal = true;
		isLoadingDetail = true;
		paymentDetail = null;

		try {
			const res = await fetch(`/api/finance/payments/${id}`);
			const json = await res.json();
			if (json.success) {
				paymentDetail = json.data;
			} else {
				alert(json.message);
				showModal = false;
			}
		} catch (e) {
			console.error(e);
			alert('Gagal memuat detail pembayaran');
			showModal = false;
		} finally {
			isLoadingDetail = false;
		}
	}

	const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
	const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '-';
</script>

<svelte:head>
	<title>Daftar Pembayaran | Finance ERP</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">payments</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Riwayat Pembayaran Kas & Bank</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pencatatan dan verifikasi transaksi penerimaan pelunasan invoice serta pengeluaran kas operasional
			</p>
		</div>
		<div class="flex gap-3">
			<a href="/finance/create-transaction/receive-payments" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors">
				<span class="material-symbols-outlined text-lg">add</span>
				<span>Terima Pembayaran</span>
			</a>
		</div>
	</header>

	<!-- Table Container -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Tanggal</th>
						<th class="py-3.5 px-5">No. Transaksi</th>
						<th class="py-3.5 px-5">Tipe Arus Kas</th>
						<th class="py-3.5 px-5">Kustomer / Vendor</th>
						<th class="py-3.5 px-5">Akun Kas/Bank</th>
						<th class="py-3.5 px-5 text-right">Jumlah Transaksi</th>
						<th class="py-3.5 px-5 text-center">Status</th>
						<th class="py-3.5 px-5 text-center">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if !data.payments || data.payments.length === 0}
						<tr>
							<td colspan="8" class="py-16 text-center text-on-surface-variant font-medium">
								<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 block mb-2">payments</span>
								<p class="font-bold text-on-surface">Belum ada riwayat transaksi pembayaran.</p>
							</td>
						</tr>
					{/if}
					{#each data.payments as payment}
						<tr class="hover:bg-surface-container transition-colors">
							<td class="py-4 px-5 text-xs text-on-surface-variant font-medium">{formatDate(payment.date)}</td>
							<td class="py-4 px-5 font-bold text-on-surface font-mono">{payment.payment_number}</td>
							<td class="py-4 px-5">
								{#if payment.type === 'RECEIVE'}
									<span class="text-emerald-600 font-bold flex items-center gap-1 text-xs uppercase tracking-wider"><span class="material-symbols-outlined text-sm">arrow_downward</span> Masuk</span>
								{:else}
									<span class="text-rose-600 font-bold flex items-center gap-1 text-xs uppercase tracking-wider"><span class="material-symbols-outlined text-sm">arrow_upward</span> Keluar</span>
								{/if}
							</td>
							<td class="py-4 px-5 font-bold text-on-surface">{payment.partner_name || '-'}</td>
							<td class="py-4 px-5 text-xs text-on-surface-variant font-medium">{payment.account_name || '-'}</td>
							<td class="py-4 px-5 font-black text-on-surface text-right font-mono">{formatCurrency(Number(payment.amount))}</td>
							<td class="py-4 px-5 text-center">
								{#if payment.status === 'POSTED'}
									<span class="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
										POSTED
									</span>
								{:else}
									<span class="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20">
										CANCELLED
									</span>
								{/if}
							</td>
							<td class="py-4 px-5 text-center">
								<button onclick={() => openDetail(payment.id)} class="p-1.5 rounded-lg text-on-surface-variant hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors cursor-pointer" title="Lihat Detail">
									<span class="material-symbols-outlined text-lg">visibility</span>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- ===================== DETAIL MODAL ===================== -->
{#if showModal}
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick={() => !actionLoading && (showModal = false)} role="presentation"></div>
		<div class="relative w-full max-w-3xl bg-surface-container-lowest rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
			
			{#if isLoadingDetail}
				<div class="p-16 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
					<span class="material-symbols-outlined animate-spin text-4xl">sync</span>
					<p class="font-bold">Memuat Detail Pembayaran...</p>
				</div>
			{:else if paymentDetail?.payment}
				<!-- Header -->
				<div class="p-6 border-b border-surface-container flex items-start justify-between {paymentDetail.payment.status === 'CANCELLED' ? 'bg-rose-50' : 'bg-surface-container-low/30'}">
					<div>
						<div class="flex items-center gap-3 mb-1">
							<h3 class="text-2xl font-black text-on-surface">{paymentDetail.payment.payment_number}</h3>
							{#if paymentDetail.payment.status === 'CANCELLED'}
								<span class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-200 text-rose-800">BATAL</span>
							{/if}
						</div>
						<div class="flex items-center gap-4 text-sm font-medium text-on-surface-variant mt-2">
							<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">calendar_today</span> {formatDate(paymentDetail.payment.date)}</span>
							<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">account_balance</span> Masuk ke: {paymentDetail.payment.account_code} - {paymentDetail.payment.account_name}</span>
						</div>
					</div>
					<button onclick={() => !actionLoading && (showModal = false)} disabled={actionLoading} class="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors disabled:opacity-50">
						<span class="material-symbols-outlined text-xl">close</span>
					</button>
				</div>

				<!-- Content -->
				<div class="p-6 overflow-y-auto flex-1 space-y-6">
					
					<div class="grid grid-cols-2 gap-6 p-4 rounded-2xl bg-surface-container-low border border-surface-container">
						<div>
							<span class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Kustomer / Vendor</span>
							<span class="block text-lg font-bold text-on-surface">{paymentDetail.payment.partner_name || '-'}</span>
						</div>
						<div class="text-right">
							<span class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Total Pembayaran</span>
							<span class="block text-2xl font-black text-emerald-600">{formatCurrency(Number(paymentDetail.payment.amount))}</span>
						</div>
						<div class="col-span-2 pt-3 border-t border-surface-container">
							<span class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Referensi / Catatan</span>
							<span class="block text-sm font-medium text-on-surface">{paymentDetail.payment.reference || '-'} &mdash; {paymentDetail.payment.notes || '-'}</span>
						</div>
					</div>

					<div>
						<h4 class="text-sm font-bold uppercase text-on-surface-variant mb-3 flex items-center gap-2">
							<span class="material-symbols-outlined text-[18px]">account_tree</span> Alokasi Pembayaran
						</h4>
						{#if paymentDetail.allocations.length > 0}
							<div class="border border-surface-container rounded-xl overflow-hidden">
								<table class="w-full text-left text-sm">
									<thead class="bg-surface-container-low/50 border-b border-surface-container font-black text-on-surface-variant">
										<tr>
											<th class="p-3">No. Invoice</th>
											<th class="p-3">Tgl Invoice</th>
											<th class="p-3 text-right">Total Invoice</th>
											<th class="p-3 text-right">Alokasi Dibayar</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-surface-container">
										{#each paymentDetail.allocations as alloc}
											<tr>
												<td class="p-3 font-bold text-primary">{alloc.invoice_number}</td>
												<td class="p-3 text-on-surface-variant">{formatDate(alloc.invoice_date)}</td>
												<td class="p-3 text-right font-medium text-on-surface-variant">{formatCurrency(Number(alloc.invoice_total))}</td>
												<td class="p-3 text-right font-black text-on-surface">{formatCurrency(Number(alloc.amount))}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<div class="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium text-center">
								Tidak ada rincian alokasi invoice (Pembayaran Bebas).
							</div>
						{/if}
					</div>
				</div>

				<!-- Footer Actions -->
				{#if paymentDetail.payment.status === 'POSTED'}
					<div class="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-between items-center">
						<form method="POST" action="?/cancelPayment" use:enhance={() => {
							const confirmCancel = confirm('Apakah Anda yakin ingin membatalkan transaksi pembayaran ini? Alokasi ke invoice akan dilepaskan (invoice kembali terhutang).');
							if (!confirmCancel) return ({ cancel }) => cancel();
							
							actionLoading = true;
							return async ({ result, update }) => {
								if (result.type === 'success' && result.data?.success) {
									alert(result.data.message);
									showModal = false;
									await update();
								} else {
									alert(result.data?.message || 'Gagal membatalkan pembayaran');
								}
								actionLoading = false;
							};
						}}>
							<input type="hidden" name="paymentId" value={paymentDetail.payment.id}>
							<button type="submit" disabled={actionLoading} class="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
								{#if actionLoading}
									<span class="material-symbols-outlined animate-spin text-[18px]">sync</span> Memproses...
								{:else}
									<span class="material-symbols-outlined text-[18px]">cancel</span> Batalkan Transaksi
								{/if}
							</button>
						</form>
						<button onclick={() => !actionLoading && (showModal = false)} disabled={actionLoading} class="px-5 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-sm font-bold transition-colors">Tutup</button>
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}
