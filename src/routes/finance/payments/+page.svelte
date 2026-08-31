<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	// Modal State
	let showModal = $state(false);
	let isLoadingDetail = $state(false);
	let paymentDetail = $state<any>(null);
	let actionLoading = $state(false);
	let searchQuery = $state('');

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

	let filteredPayments = $derived.by(() => {
		let list = data.payments || [];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((p: any) =>
				(p.payment_number && p.payment_number.toLowerCase().includes(q)) ||
				(p.partner_name && p.partner_name.toLowerCase().includes(q)) ||
				(p.reference && p.reference.toLowerCase().includes(q)) ||
				(p.account_name && p.account_name.toLowerCase().includes(q))
			);
		}
		return list;
	});
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
			<a
				href="/finance/create-transaction/receive-payments"
				class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-lg">add</span>
				<span>Terima Pembayaran</span>
			</a>
		</div>
	</header>

	<!-- Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between gap-4">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari nomor pembayaran, kustomer/vendor, atau referensi..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Total: <strong class="text-on-surface">{filteredPayments.length}</strong> Transaksi
		</span>
	</div>

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
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredPayments.length === 0}
						<tr>
							<td colspan="8" class="py-16 text-center text-on-surface-variant font-medium">
								<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 block mb-2">payments</span>
								<p class="font-bold text-on-surface">Belum ada riwayat transaksi pembayaran yang cocok.</p>
							</td>
						</tr>
					{:else}
						{#each filteredPayments as payment}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-5 text-on-surface-variant font-mono">{formatDate(payment.date)}</td>
								<td class="py-3.5 px-5 font-bold text-on-surface font-mono text-amber-700 dark:text-amber-300">{payment.payment_number}</td>
								<td class="py-3.5 px-5">
									{#if payment.type === 'RECEIVE'}
										<span class="text-emerald-600 font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider">
											<span class="material-symbols-outlined text-sm">arrow_downward</span> Masuk
										</span>
									{:else}
										<span class="text-rose-600 font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider">
											<span class="material-symbols-outlined text-sm">arrow_upward</span> Keluar
										</span>
									{/if}
								</td>
								<td class="py-3.5 px-5 font-bold text-on-surface">{payment.partner_name || '-'}</td>
								<td class="py-3.5 px-5 text-on-surface-variant font-semibold">{payment.account_name || '-'}</td>
								<td class="py-3.5 px-5 font-black text-on-surface text-right font-mono text-xs">{formatCurrency(Number(payment.amount))}</td>
								<td class="py-3.5 px-5 text-center">
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-emerald-50 text-emerald-800 border-emerald-200">
										{payment.status || 'PAID'}
									</span>
								</td>
								<td class="py-3.5 px-5 text-center">
									<button
										type="button"
										onclick={() => openDetail(payment.id)}
										class="p-1.5 rounded-lg text-on-surface-variant hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors cursor-pointer"
										title="Lihat Detail Transaksi"
									>
										<span class="material-symbols-outlined text-lg">visibility</span>
									</button>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Modal Detail Pembayaran -->
{#if showModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">receipt</span>
					<h3 class="text-base font-extrabold text-on-surface">Rincian Pembayaran</h3>
				</div>
				<button type="button" onclick={() => showModal = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="p-6 space-y-4">
				{#if isLoadingDetail}
					<div class="py-12 text-center text-on-surface-variant">
						<span class="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
						<p class="text-xs font-semibold mt-2">Memuat rincian...</p>
					</div>
				{:else if paymentDetail}
					<div class="grid grid-cols-2 gap-4 text-xs">
						<div>
							<p class="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">No. Transaksi</p>
							<p class="font-mono font-bold text-on-surface text-sm mt-0.5">{paymentDetail.payment_number}</p>
						</div>
						<div>
							<p class="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Tanggal</p>
							<p class="font-mono text-on-surface mt-0.5">{formatDate(paymentDetail.date)}</p>
						</div>
						<div>
							<p class="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Mitra / Partner</p>
							<p class="font-bold text-on-surface mt-0.5">{paymentDetail.partner_name || '-'}</p>
						</div>
						<div>
							<p class="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Jumlah</p>
							<p class="font-mono font-black text-emerald-600 text-sm mt-0.5">{formatCurrency(paymentDetail.amount)}</p>
						</div>
					</div>

					{#if paymentDetail.notes}
						<div class="p-3 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs">
							<p class="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Catatan</p>
							<p class="text-on-surface mt-1">{paymentDetail.notes}</p>
						</div>
					{/if}
				{/if}
			</div>

			<div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-surface-container-low flex justify-end">
				<button
					type="button"
					onclick={() => showModal = false}
					class="px-4 py-2 bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high transition-colors"
				>
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}
