<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();
	
	let startDate = $state(data.startDate);
	let endDate = $state(data.endDate);
	
	function filterByDate() {
		const url = new URL($page.url);
		url.searchParams.set('startDate', startDate);
		url.searchParams.set('endDate', endDate);
		goto(url.toString(), { keepFocus: true });
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}
	
	function getStatusColor(status: string) {
		switch (status) {
			case 'DRAFT': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800';
			case 'POSTED': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
			case 'PAID': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
			case 'CANCELLED': return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';
			default: return 'bg-slate-100 text-slate-700 border-slate-200';
		}
	}
	let showPreviewModal = $state(false);
	let isPreviewLoading = $state(false);
	let previewData = $state<any>(null);

	async function openPreview(invoiceId: string) {
		showPreviewModal = true;
		isPreviewLoading = true;
		previewData = null;
		
		try {
			const res = await fetch(`/api/finance/invoices/${invoiceId}`);
			const json = await res.json();
			if (json.success) {
				previewData = json;
			} else {
				alert(json.message || 'Gagal memuat detail invoice');
				showPreviewModal = false;
			}
		} catch (e) {
			console.error(e);
			alert('Terjadi kesalahan saat memuat detail invoice');
			showPreviewModal = false;
		} finally {
			isPreviewLoading = false;
		}
	}
</script>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">receipt_long</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Daftar Tagihan & Invoice Piutang</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Kelola penagihan piutang kustomer, verifikasi dokumen invoice logistik, dan pantau status pelunasannya
			</p>
		</div>
		<div class="flex gap-3">
			<a href="/finance/create-transaction/customer-invoices" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors">
				<span class="material-symbols-outlined text-lg">add</span>
				<span>Buat Invoice Baru</span>
			</a>
		</div>
	</header>

	<!-- Metrics Overview (Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-rose-600 uppercase tracking-wider">Total Jatuh Tempo</p>
					<h3 class="text-2xl font-black text-rose-600 mt-1 font-mono">{formatCurrency(data.metrics.totalOverdue)}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">warning</span>
				</div>
			</div>
			<p class="text-xs text-rose-600 font-medium mt-2">Memerlukan follow-up penagihan</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-amber-600 uppercase tracking-wider">Total Piutang Berjalan</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1 font-mono">{formatCurrency(data.metrics.totalUnpaid)}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">account_balance_wallet</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 font-medium mt-2">Belum terbayar penuh</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-emerald-600 uppercase tracking-wider">Tagihan Bulan Ini</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1 font-mono">{formatCurrency(data.metrics.totalThisMonth)}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">trending_up</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 font-medium mt-2">Total invoice terbit bulan ini</p>
		</div>
	</div>

	<!-- Filter & Table Section -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<!-- Filter Bar -->
		<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center gap-3 justify-between">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-on-surface-variant text-lg">filter_alt</span>
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Filter Rentang Tanggal</span>
			</div>
			
			<div class="flex items-center gap-2">
				<input type="date" bind:value={startDate} class="bg-surface border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
				<span class="text-on-surface-variant text-xs font-medium">s/d</span>
				<input type="date" bind:value={endDate} class="bg-surface border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
				<button onclick={filterByDate} class="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer">Terapkan</button>
			</div>
		</div>

		<!-- Table -->
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Tanggal</th>
						<th class="py-3.5 px-5">No. Invoice</th>
						<th class="py-3.5 px-5">Kustomer</th>
						<th class="py-3.5 px-5 text-right">Total Tagihan</th>
						<th class="py-3.5 px-5">Jatuh Tempo</th>
						<th class="py-3.5 px-5 text-center">Status</th>
						<th class="py-3.5 px-5 text-center">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if data.invoices.length === 0}
						<tr>
							<td colspan="7" class="py-12 text-center">
								<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-container-low mb-4">
									<span class="material-symbols-outlined text-[32px] text-on-surface-variant">receipt_long</span>
								</div>
								<h3 class="text-base font-bold text-on-surface">Belum Ada Tagihan</h3>
								<p class="text-sm text-on-surface-variant mt-1 max-w-sm mx-auto">Tidak ada data invoice yang ditemukan pada rentang tanggal ini.</p>
							</td>
						</tr>
					{:else}
						{#each data.invoices as invoice}
							<tr class="hover:bg-surface-container-low/30 transition-colors group">
								<td class="py-4 px-6 text-sm font-medium text-on-surface-variant">{formatDate(invoice.invoice_date)}</td>
								<td class="py-4 px-6">
									<div class="font-bold text-on-surface">{invoice.invoice_number}</div>
								</td>
								<td class="py-4 px-6 text-sm font-bold text-on-surface">{invoice.customer_name || '-'}</td>
								<td class="py-4 px-6 text-sm font-black text-on-surface text-right">{formatCurrency(invoice.total_amount)}</td>
								<td class="py-4 px-6">
									<div class="text-sm font-medium {new Date(invoice.due_date) < new Date() && invoice.status === 'POSTED' ? 'text-rose-600 font-bold' : 'text-on-surface-variant'}">
										{formatDate(invoice.due_date)}
									</div>
								</td>
								<td class="py-4 px-6">
									<span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border {getStatusColor(invoice.status)}">
										{invoice.status}
									</span>
								</td>
								<td class="py-4 px-6">
									<div class="flex items-center justify-center gap-2">
										<button onclick={() => openPreview(invoice.id)} class="w-8 h-8 rounded-full bg-surface-container hover:bg-blue-100 hover:text-blue-700 text-on-surface-variant flex items-center justify-center transition-colors" title="Lihat Detail">
											<span class="material-symbols-outlined text-[18px]">visibility</span>
										</button>
										{#if invoice.status === 'DRAFT'}
											<a href="/finance/invoices/{invoice.id}/edit" class="w-8 h-8 rounded-full bg-surface-container hover:bg-amber-100 hover:text-amber-700 text-on-surface-variant flex items-center justify-center transition-colors" title="Edit Invoice">
												<span class="material-symbols-outlined text-[18px]">edit</span>
											</a>
											<form method="POST" action="?/postInvoice" use:enhance={() => {
												return async ({ result, update }) => {
													if (result.type === 'success' && result.data?.success) {
														await update();
													} else {
														alert(result.data?.message || 'Gagal posting invoice');
													}
												}
											}}>
												<input type="hidden" name="invoiceId" value={invoice.id}>
												<button type="submit" class="w-8 h-8 rounded-full bg-surface-container hover:bg-emerald-100 hover:text-emerald-700 text-on-surface-variant flex items-center justify-center transition-colors" title="Post Invoice">
													<span class="material-symbols-outlined text-[18px]">done_all</span>
												</button>
											</form>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- ===================== PREVIEW MODAL ===================== -->
{#if showPreviewModal}
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick={() => showPreviewModal = false} role="presentation"></div>
		<div class="relative w-full max-w-4xl bg-surface-container-lowest rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
			
			{#if isPreviewLoading}
				<div class="p-12 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
					<span class="material-symbols-outlined animate-spin text-4xl">sync</span>
					<p class="font-bold">Memuat Detail Invoice...</p>
				</div>
			{:else if previewData?.invoice}
				<!-- Header -->
				<div class="p-6 border-b border-surface-container flex items-start justify-between bg-surface-container-low/30">
					<div>
						<h3 class="text-2xl font-black text-on-surface">{previewData.invoice.invoice_number}</h3>
						<div class="flex items-center gap-3 mt-2">
							<span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border {getStatusColor(previewData.invoice.status)}">
								{previewData.invoice.status}
							</span>
							<span class="text-sm font-medium text-on-surface-variant flex items-center gap-1">
								<span class="material-symbols-outlined text-[16px]">calendar_today</span> 
								{formatDate(previewData.invoice.date)}
							</span>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<a href="/finance/invoices/{previewData.invoice.id}/print" target="_blank" rel="noopener noreferrer" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
							<span class="material-symbols-outlined text-[18px]">print</span>
							Print / PDF
						</a>
						<button onclick={() => showPreviewModal = false} class="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
							<span class="material-symbols-outlined text-xl">close</span>
						</button>
					</div>
				</div>

				<!-- Content -->
				<div class="p-6 overflow-y-auto space-y-8 flex-1">
					<!-- Info Grid -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
						<div>
							<h4 class="text-xs font-black uppercase tracking-wider text-on-surface-variant mb-3">Ditagihkan Kepada</h4>
							<div class="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container">
								<div class="font-bold text-on-surface text-base">{previewData.invoice.customer_name || '-'}</div>
								<div class="text-sm text-on-surface-variant mt-1 leading-relaxed">{previewData.invoice.customer_address || '-'}</div>
							</div>
						</div>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<h4 class="text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">Jatuh Tempo</h4>
								<div class="font-bold text-on-surface">{formatDate(previewData.invoice.due_date)}</div>
							</div>
							<div>
								<h4 class="text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">No. PO/SPK</h4>
								<div class="font-bold text-on-surface">{previewData.invoice.po_spk_number || '-'}</div>
							</div>
							<div class="col-span-2 mt-2">
								<h4 class="text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">Pembayaran (Bank)</h4>
								<div class="p-3 rounded-xl bg-surface-container-low text-sm font-medium text-on-surface-variant">
									{previewData.invoice.bank_name || '-'} - {previewData.invoice.account_number || '-'} <br>
									a.n {previewData.invoice.account_name || '-'}
								</div>
							</div>
						</div>
					</div>

					<!-- Table -->
					<div>
						<h4 class="text-xs font-black uppercase tracking-wider text-on-surface-variant mb-3">Rincian Tagihan</h4>
						<div class="border border-surface-container rounded-2xl overflow-hidden">
							<table class="w-full text-left">
								<thead class="bg-surface-container-low/50 border-b border-surface-container text-xs font-black uppercase text-on-surface-variant">
									<tr>
										<th class="p-4">Deskripsi</th>
										<th class="p-4 text-right w-24">Qty</th>
										<th class="p-4 text-right w-32">Harga Satuan</th>
										<th class="p-4 text-right w-40">Total</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-surface-container">
									{#each previewData.invoiceLines as line}
										<tr class="hover:bg-surface-container-lowest transition-colors">
											<td class="p-4 text-sm font-medium text-on-surface-variant max-w-xs truncate" title={line.description}>{line.description}</td>
											<td class="p-4 text-sm font-bold text-on-surface text-right">{Number(line.quantity).toFixed(2)} {line.uom}</td>
											<td class="p-4 text-sm font-medium text-on-surface-variant text-right">{formatCurrency(Number(line.unit_price))}</td>
											<td class="p-4 text-sm font-black text-on-surface text-right">{formatCurrency(Number(line.total))}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Summary -->
					<div class="flex justify-end pt-4">
						<div class="w-full max-w-sm space-y-3">
							<div class="flex justify-between text-sm font-bold text-on-surface-variant">
								<span>Subtotal</span>
								<span>{formatCurrency(Number(previewData.invoice.subtotal))}</span>
							</div>
							<div class="flex justify-between text-sm font-bold text-on-surface-variant">
								<span>Pajak</span>
								<span>{formatCurrency(Number(previewData.invoice.tax_amount))}</span>
							</div>
							{#if Number(previewData.invoice.advance_payment) > 0}
								<div class="flex justify-between text-sm font-bold text-rose-600">
									<span>Uang Muka</span>
									<span>- {formatCurrency(Number(previewData.invoice.advance_payment))}</span>
								</div>
							{/if}
							<div class="pt-3 border-t border-surface-container flex justify-between items-center">
								<span class="text-base font-black text-on-surface">Total Tagihan</span>
								<span class="text-2xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(Number(previewData.invoice.total_amount))}</span>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
