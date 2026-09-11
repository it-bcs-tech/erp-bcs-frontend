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

	function formatQty(val: any) {
		if (val === null || val === undefined || isNaN(Number(val))) return '0';
		return parseFloat(Number(val).toFixed(3)).toString();
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
	function getOrderDocInfo(val: string | null) {
		if (!val || val.trim() === '') return { label: 'No. Dokumen Order', value: '-' };
		const m = val.match(/^(PO|SPK|SPH|Quotation)[\s\-:]*(.*)$/i);
		if (m) {
			const rawType = m[1].toUpperCase();
			const typeLabel = rawType === 'QUOTATION' ? 'Quotation' : rawType;
			const cleanNum = m[2]?.trim();
			return {
				label: `No. ${typeLabel}`,
				value: cleanNum || val
			};
		}
		return { label: 'No. Dokumen Order', value: val };
	}

	function getLhpDocInfo(val: string | null) {
		if (!val || val.trim() === '') return { label: 'No. Dokumen Penerimaan', value: '-' };
		const m = val.match(/^(LHP|RR|GR)[\s\-:]*(.*)$/i);
		if (m) {
			const type = m[1].toUpperCase();
			const cleanNum = m[2]?.trim();
			return {
				label: `No. ${type}`,
				value: cleanNum || val
			};
		}
		return { label: 'No. Dokumen Penerimaan', value: val };
	}

	function terbilang(angka: number): string {
		const bilangan = [
			"", "Satu", "Dua", "Tiga", "Empat", "Lima", 
			"Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"
		];
		const num = Math.floor(Math.abs(angka || 0));

		if (num < 12) {
			return bilangan[num];
		} else if (num < 20) {
			return terbilang(num - 10) + " Belas";
		} else if (num < 100) {
			return terbilang(Math.floor(num / 10)) + " Puluh " + terbilang(num % 10);
		} else if (num < 200) {
			return "Seratus " + terbilang(num - 100);
		} else if (num < 1000) {
			return terbilang(Math.floor(num / 100)) + " Ratus " + terbilang(num % 100);
		} else if (num < 2000) {
			return "Seribu " + terbilang(num - 1000);
		} else if (num < 1000000) {
			return terbilang(Math.floor(num / 1000)) + " Ribu " + terbilang(num % 1000);
		} else if (num < 1000000000) {
			return terbilang(Math.floor(num / 1000000)) + " Juta " + terbilang(num % 1000000);
		} else if (num < 1000000000000) {
			return terbilang(Math.floor(num / 1000000000)) + " Milyar " + terbilang(num % 1000000000);
		} else {
			return terbilang(Math.floor(num / 1000000000000)) + " Triliun " + terbilang(num % 1000000000000);
		}
	}

	let showPreviewModal = $state(false);
	let isPreviewLoading = $state(false);
	let previewData = $state<any>(null);

	// Print Modal State
	let showPrintModal = $state(false);
	let printKopMode = $state<'kop' | 'no-kop'>('kop');
	let printInvoiceData = $state<any>(null);
	let isPrintLoading = $state(false);
	let isPrinting = $state(false);

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

	async function openPrintModal(invoiceId: string, initialKop: 'kop' | 'no-kop' = 'kop') {
		printKopMode = initialKop;
		showPrintModal = true;
		isPrintLoading = true;
		printInvoiceData = null;

		try {
			const res = await fetch(`/api/finance/invoices/${invoiceId}`);
			const json = await res.json();
			if (json.success) {
				printInvoiceData = json;
			} else {
				alert(json.message || 'Gagal memuat data print invoice');
				showPrintModal = false;
			}
		} catch (e) {
			console.error(e);
			alert('Terjadi kesalahan saat memuat data print invoice');
			showPrintModal = false;
		} finally {
			isPrintLoading = false;
		}
	}

	function executePrint() {
		const iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
		if (!iframe || !printInvoiceData?.invoice) return;
		isPrinting = true;
		iframe.src = `/finance/invoices/${printInvoiceData.invoice.id}/print?kop=${printKopMode === 'kop'}`;
		iframe.onload = () => {
			setTimeout(() => {
				isPrinting = false;
				iframe.contentWindow?.focus();
				iframe.contentWindow?.print();
			}, 300);
		};
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
							{@const rowOrder = getOrderDocInfo(invoice.po_spk_number || invoice.reference)}
							{@const rowLhp = getLhpDocInfo(invoice.no_lhp)}
							<tr class="hover:bg-surface-container-low/30 transition-colors group">
								<td class="py-4 px-6 text-sm font-medium text-on-surface-variant">{formatDate(invoice.invoice_date)}</td>
								<td class="py-4 px-6">
									<div class="font-bold text-on-surface">{invoice.invoice_number}</div>
									{#if invoice.po_spk_number || invoice.reference}
										<div class="text-[11px] text-on-surface-variant font-medium">{rowOrder.label.replace('No. ', '')}: {rowOrder.value}</div>
									{/if}
									{#if invoice.no_lhp}
										<div class="text-[11px] text-blue-600 dark:text-blue-400 font-bold">{rowLhp.label.replace('No. ', '')}: {rowLhp.value}</div>
									{/if}
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
										<button onclick={() => openPreview(invoice.id)} class="w-8 h-8 rounded-full bg-surface-container hover:bg-blue-100 hover:text-blue-700 text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer" title="Lihat Detail">
											<span class="material-symbols-outlined text-[18px]">visibility</span>
										</button>
										<button 
											type="button" 
											onclick={() => openPrintModal(invoice.id, 'kop')} 
											class="w-8 h-8 rounded-full bg-surface-container hover:bg-indigo-100 hover:text-indigo-700 text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer" 
											title="Print Invoice"
										>
											<span class="material-symbols-outlined text-[18px]">print</span>
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
				{@const inv = previewData.invoice}
				{@const orderDoc = getOrderDocInfo(inv.po_spk_number || inv.reference)}
				{@const lhpDoc = getLhpDocInfo(inv.no_lhp)}

				<!-- Header -->
				<div class="p-6 border-b border-surface-container flex flex-wrap items-center justify-between gap-4 bg-surface-container-low/50">
					<div>
						<div class="flex items-center gap-3">
							<h3 class="text-2xl font-black text-on-surface tracking-tight">{inv.invoice_number}</h3>
							<span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border {getStatusColor(inv.status)}">
								{inv.status}
							</span>
						</div>
						<p class="text-xs font-medium text-on-surface-variant flex items-center gap-1.5 mt-1">
							<span class="material-symbols-outlined text-[15px]">calendar_today</span> 
							Diterbitkan pada {formatDate(inv.date)}
						</p>
					</div>
					<div class="flex items-center gap-2">
						<button 
							type="button"
							onclick={() => openPrintModal(inv.id, 'kop')} 
							class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
							title="Cetak Faktur Lengkap dengan Logo & Kop Resmi"
						>
							<span class="material-symbols-outlined text-[16px]">print</span>
							Print Kop
						</button>
						<button 
							type="button"
							onclick={() => openPrintModal(inv.id, 'no-kop')} 
							class="px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-surface-variant/30 shadow-sm cursor-pointer"
							title="Cetak Faktur di atas Kertas Kop Surat Fisik (Pre-printed)"
						>
							<span class="material-symbols-outlined text-[16px]">crop_portrait</span>
							Print Tanpa Kop
						</button>
						<button onclick={() => showPreviewModal = false} class="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer">
							<span class="material-symbols-outlined text-xl">close</span>
						</button>
					</div>
				</div>

				<!-- Content Bento Grid -->
				<div class="p-6 overflow-y-auto space-y-6 flex-1">
					<!-- Top Info Cards -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<!-- Card 1: Ditagihkan Kepada -->
						<div class="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col justify-between">
							<div>
								<div class="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
									<span class="material-symbols-outlined text-[16px] text-primary">apartment</span>
									Ditagihkan Kepada
								</div>
								<h4 class="font-black text-base text-on-surface">{inv.customer_name || '-'}</h4>
								{#if inv.customer_code}
									<p class="text-[11px] font-mono text-on-surface-variant mt-0.5">Kode: {inv.customer_code}</p>
								{/if}
								<p class="text-xs text-on-surface-variant mt-2 leading-relaxed whitespace-pre-wrap">{inv.customer_address || 'Alamat tidak tersedia'}</p>
							</div>
						</div>

						<!-- Card 2: Referensi Dokumen & Jadwal -->
						<div class="p-4 rounded-2xl bg-surface-container-low border border-surface-container space-y-2 text-xs">
							<div class="flex items-center gap-1.5 font-black uppercase tracking-wider text-on-surface-variant mb-1">
								<span class="material-symbols-outlined text-[16px] text-secondary">description</span>
								Dokumen Referensi
							</div>

							<div class="flex justify-between items-center py-1 border-b border-surface-container">
								<span class="text-on-surface-variant">{orderDoc.label}:</span>
								<span class="font-bold text-on-surface font-mono">{orderDoc.value}</span>
							</div>

							<div class="flex justify-between items-center py-1 border-b border-surface-container">
								<span class="text-on-surface-variant">{lhpDoc.label}:</span>
								<span class="font-bold text-on-surface font-mono">{lhpDoc.value}</span>
							</div>

							<div class="flex justify-between items-center py-1 border-b border-surface-container">
								<span class="text-on-surface-variant">Periode Kegiatan:</span>
								<span class="font-bold text-on-surface">{inv.activity_period || '-'}</span>
							</div>

							<div class="flex justify-between items-center pt-1">
								<span class="text-on-surface-variant">Jatuh Tempo:</span>
								<span class="font-bold text-rose-600">{formatDate(inv.due_date)}</span>
							</div>
						</div>

						<!-- Card 3: Rekening Pembayaran -->
						<div class="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col justify-between">
							<div>
								<div class="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">
									<span class="material-symbols-outlined text-[16px] text-tertiary">account_balance</span>
									Rekening Pembayaran
								</div>
								<h5 class="font-black text-sm text-on-surface">{inv.bank_name || 'Bank Penerima'}</h5>
								<p class="text-base font-mono font-black text-primary tracking-wider mt-1">{inv.account_number || '-'}</p>
								<p class="text-xs text-on-surface-variant mt-0.5">a.n {inv.account_name || 'PT BUANA CENTRA SWAKARSA'}</p>
							</div>
							<div class="mt-3 pt-2 border-t border-surface-container text-[11px] text-on-surface-variant flex justify-between">
								<span>Term Pembayaran:</span>
								<span class="font-bold text-on-surface">{inv.payment_term_days ? `${inv.payment_term_days} Hari` : 'Cash'}</span>
							</div>
						</div>
					</div>

					<!-- Line Items Table -->
					<div>
						<div class="flex items-center justify-between mb-2">
							<h4 class="text-xs font-black uppercase tracking-wider text-on-surface-variant">Rincian Baris Tagihan</h4>
							<span class="text-xs text-on-surface-variant font-medium">({previewData.invoiceLines?.length || 0} item)</span>
						</div>
						<div class="border border-surface-container rounded-2xl overflow-hidden shadow-xs">
							<table class="w-full text-left">
								<thead class="bg-surface-container-low/70 border-b border-surface-container text-xs font-bold uppercase text-on-surface-variant">
									<tr>
										<th class="p-3.5 w-10 text-center">No</th>
										<th class="p-3.5">Deskripsi Layanan / Pekerjaan</th>
										<th class="p-3.5 text-right w-24">Qty</th>
										<th class="p-3.5 text-center w-20">Satuan</th>
										<th class="p-3.5 text-right w-32">Harga Satuan</th>
										<th class="p-3.5 text-right w-36">Total</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-surface-container text-sm">
									{#each previewData.invoiceLines as line, i}
										<tr class="hover:bg-surface-container-lowest transition-colors">
											<td class="p-3.5 text-center font-mono text-xs text-on-surface-variant">{i + 1}</td>
											<td class="p-3.5">
												<p class="font-bold text-on-surface">{line.description || '-'}</p>
												{#if line.project_name || line.dept_name}
													<p class="text-xs text-on-surface-variant mt-0.5">{[line.dept_name, line.project_name].filter(Boolean).join(' • ')}</p>
												{/if}
											</td>
											<td class="p-3.5 font-bold font-mono text-right text-on-surface">{formatQty(line.quantity)}</td>
											<td class="p-3.5 text-center uppercase text-xs font-semibold text-on-surface-variant">{line.uom || '-'}</td>
											<td class="p-3.5 font-mono text-right text-on-surface">{formatCurrency(Number(line.unit_price))}</td>
											<td class="p-3.5 font-mono font-black text-right text-on-surface">{formatCurrency(Number(line.total))}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Summary Bento -->
					<div class="flex justify-end pt-2">
						<div class="w-full max-w-sm p-4 rounded-2xl bg-surface-container-low border border-surface-container space-y-2.5">
							<div class="flex justify-between text-xs font-semibold text-on-surface-variant">
								<span>Subtotal DPP:</span>
								<span class="font-mono font-bold text-on-surface">{formatCurrency(Number(inv.subtotal))}</span>
							</div>
							<div class="flex justify-between text-xs font-semibold text-on-surface-variant">
								<span>Pajak (PPN):</span>
								<span class="font-mono font-bold text-on-surface">{formatCurrency(Number(inv.tax_amount))}</span>
							</div>
							{#if Number(inv.advance_payment) > 0}
								<div class="flex justify-between text-xs font-bold text-rose-600">
									<span>Uang Muka (DP):</span>
									<span class="font-mono font-bold">- {formatCurrency(Number(inv.advance_payment))}</span>
								</div>
							{/if}
							<div class="pt-2 border-t-2 border-surface-container-highest flex justify-between items-baseline">
								<span class="text-xs font-black uppercase tracking-wider text-on-surface">Total Tagihan:</span>
								<span class="text-xl font-black font-mono text-primary">{formatCurrency(Number(inv.total_amount))}</span>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- ===================== IN-MODAL PRINT PREVIEW ===================== -->
{#if showPrintModal}
	<div class="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4">
		<div class="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" onclick={() => showPrintModal = false} role="presentation"></div>
		
		<div class="relative w-full max-w-5xl bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-700">
			<!-- Header Bar -->
			<div class="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-950 text-white shrink-0">
				<div class="flex items-center gap-3">
					<span class="p-2 rounded-xl bg-blue-600/20 text-blue-400">
						<span class="material-symbols-outlined text-xl">print</span>
					</span>
					<div>
						<h3 class="text-base font-black text-white">Pratinjau Cetak Invoice</h3>
						<p class="text-xs text-slate-400 font-mono">{printInvoiceData?.invoice?.invoice_number || 'Loading...'}</p>
					</div>
				</div>

				<!-- Toggle Kop / Non-Kop -->
				<div class="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
					<button 
						type="button" 
						onclick={() => printKopMode = 'kop'} 
						class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all {printKopMode === 'kop' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}"
					>
						<span class="material-symbols-outlined text-[15px]">article</span>
						Dengan Kop
					</button>
					<button 
						type="button" 
						onclick={() => printKopMode = 'no-kop'} 
						class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all {printKopMode === 'no-kop' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}"
					>
						<span class="material-symbols-outlined text-[15px]">crop_portrait</span>
						Tanpa Kop (Kertas Fisik)
					</button>
				</div>

				<!-- Action Buttons -->
				<div class="flex items-center gap-3">
					<button 
						type="button" 
						onclick={executePrint}
						disabled={isPrinting || isPrintLoading}
						class="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
					>
						<span class="material-symbols-outlined text-[16px]">{isPrinting ? 'hourglass_top' : 'print'}</span>
						{isPrinting ? 'Mencetak...' : 'Cetak Sekarang'}
					</button>
					<button 
						type="button" 
						onclick={() => showPrintModal = false} 
						class="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
					>
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>

			<!-- Body: Scrollable A4 Paper Container -->
			<div class="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/60 flex justify-center">
				{#if isPrintLoading}
					<div class="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
						<span class="material-symbols-outlined animate-spin text-4xl text-blue-500">sync</span>
						<p class="font-bold text-sm">Menyiapkan Lembar Cetak...</p>
					</div>
				{:else if printInvoiceData?.invoice}
					{@const inv = printInvoiceData.invoice}
					{@const lines = printInvoiceData.invoiceLines || []}
					{@const orderDoc = getOrderDocInfo(inv.po_spk_number || inv.reference)}
					{@const lhpDoc = getLhpDocInfo(inv.no_lhp)}
					
					<div class="bg-white text-black shadow-2xl rounded-sm p-8 sm:p-10 w-full max-w-[210mm] min-h-[297mm] text-xs leading-normal flex flex-col justify-between">
						<div>
							<!-- 1. KOP SURAT / PRE-PRINTED LETTERHEAD GAP -->
							{#if printKopMode === 'kop'}
								<header class="flex justify-between items-end border-b-[3px] border-slate-900 pb-4 mb-5 gap-6">
									<div class="flex items-center gap-3">
										<img 
											src="https://bcs-logistics.co.id/assets/images/logoo.png" 
											alt="BCS Logistics Logo" 
											class="h-9 object-contain"
											onerror={(e) => (e.currentTarget as HTMLElement).style.display = 'none'}
										/>
										<div>
											<h2 class="text-lg font-black tracking-tight text-blue-950 uppercase leading-none">
												PT. BUANA CENTRA SWAKARSA
											</h2>
											<p class="text-[8.5px] font-bold text-slate-700 mt-1 uppercase tracking-widest">
												Integrated Logistics, Transportation & Warehousing Services
											</p>
										</div>
									</div>
									<div class="text-right text-[8.5px] text-slate-700 max-w-xs leading-tight">
										<p class="font-bold text-slate-900">Head Office : BCS Logistics Center</p>
										<p>Jl. Raya Merak KM. 115, Gerem, Grogol, Cilegon, Banten 42438</p>
										<p>Telp: +62 254 571234 / 570555 | Email: corporate@bcsgroup.co.id</p>
										<p class="font-semibold text-slate-900">NPWP: 01.234.567.8-412.000</p>
									</div>
								</header>
							{:else}
								<div class="h-[4.0cm] relative flex items-center justify-center border-b border-dashed border-slate-300 mb-5">
									<span class="text-[10px] font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
										✂ Ruang Kosong (4.0 cm) untuk Kertas Kop Fisik Pre-printed
									</span>
								</div>
							{/if}

							<!-- 2. INVOICE TITLE & INFO -->
							<div class="flex justify-between items-start border-b border-slate-200 pb-3 mb-4">
								<div>
									<h1 class="text-xl font-black uppercase tracking-wider text-slate-900">FAKTUR PENJUALAN</h1>
									<p class="text-[11px] font-bold text-slate-500 tracking-widest">COMMERCIAL INVOICE</p>
								</div>
								<div class="text-right space-y-0.5">
									<div class="text-sm font-black font-mono text-slate-900">
										No: <span class="text-blue-900 font-extrabold">{inv.invoice_number}</span>
									</div>
									<div class="text-[10.5px] text-slate-700">Tanggal: <strong>{formatDate(inv.date)}</strong></div>
									<div class="text-[10.5px] text-slate-700">Jatuh Tempo: <strong class="text-rose-700">{formatDate(inv.due_date)}</strong></div>
								</div>
							</div>

							<!-- 3. BILL TO & TRANSACTION REFERENCES -->
							<div class="grid grid-cols-2 gap-4 mb-4">
								<div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
									<h4 class="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1 border-b border-slate-200 pb-1">Ditagihkan Kepada (Bill To)</h4>
									<p class="font-bold text-xs text-slate-900">{inv.customer_name || '-'}</p>
									{#if inv.customer_code}
										<p class="text-[9.5px] text-slate-500 font-mono">Kode: {inv.customer_code}</p>
									{/if}
									<p class="text-[11px] text-slate-700 leading-relaxed mt-1 whitespace-pre-wrap">{inv.customer_address || '-'}</p>
								</div>

								<div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
									<h4 class="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1 border-b border-slate-200 pb-1">Referensi Transaksi</h4>
									<div class="grid grid-cols-2 gap-y-1 text-[11px]">
										<span class="text-slate-500">{orderDoc.label}:</span>
										<span class="font-bold text-slate-900 text-right truncate" title={orderDoc.value}>{orderDoc.value}</span>

										<span class="text-slate-500">{lhpDoc.label}:</span>
										<span class="font-bold text-slate-900 text-right truncate" title={lhpDoc.value}>{lhpDoc.value}</span>

										<span class="text-slate-500">Periode Kegiatan:</span>
										<span class="font-bold text-slate-900 text-right">{inv.activity_period || '-'}</span>

										<span class="text-slate-500">Tgl Kirim Inv:</span>
										<span class="font-bold text-slate-900 text-right">{formatDate(inv.delivery_date)}</span>

										<span class="text-slate-500">Term Pembayaran:</span>
										<span class="font-bold text-slate-900 text-right">{inv.payment_term_days ? `${inv.payment_term_days} Hari` : 'Cash'}</span>
									</div>
								</div>
							</div>

							<!-- 4. LINE ITEMS TABLE -->
							<table class="w-full border-collapse border border-slate-300 mb-4 text-[11px]">
								<thead>
									<tr class="bg-slate-100 font-bold text-slate-900 border-b border-slate-300">
										<th class="border border-slate-300 p-2 w-8 text-center">No</th>
										<th class="border border-slate-300 p-2 text-left">Deskripsi / Keterangan Pekerjaan</th>
										<th class="border border-slate-300 p-2 text-right w-16">Qty</th>
										<th class="border border-slate-300 p-2 text-center w-14">Satuan</th>
										<th class="border border-slate-300 p-2 text-right w-24">Harga Satuan</th>
										<th class="border border-slate-300 p-2 text-right w-28">Total (Rp)</th>
									</tr>
								</thead>
								<tbody>
									{#each lines as line, i}
										<tr class="border-b border-slate-200">
											<td class="border border-slate-300 p-2 text-center font-mono">{i + 1}</td>
											<td class="border border-slate-300 p-2">
												<p class="font-bold text-slate-900">{line.description || '-'}</p>
												{#if line.project_name || line.dept_name}
													<p class="text-[9.5px] text-slate-500 mt-0.5">{[line.dept_name, line.project_name].filter(Boolean).join(' • ')}</p>
												{/if}
											</td>
											<td class="border border-slate-300 p-2 text-right font-mono font-bold">{formatQty(line.quantity)}</td>
											<td class="border border-slate-300 p-2 text-center uppercase font-semibold text-[10px]">{line.uom || '-'}</td>
											<td class="border border-slate-300 p-2 text-right font-mono">{formatCurrency(Number(line.unit_price))}</td>
											<td class="border border-slate-300 p-2 text-right font-mono font-bold text-slate-900">{formatCurrency(Number(line.total))}</td>
										</tr>
									{/each}
								</tbody>
							</table>

							<!-- 5. FINANCIAL SUMMARY & TERBILANG -->
							<div class="grid grid-cols-12 gap-4 mt-3">
								<div class="col-span-7 flex flex-col justify-between">
									<div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
										<p class="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-0.5">Terbilang:</p>
										<p class="font-bold italic text-slate-800 capitalize leading-relaxed">"{terbilang(Number(inv.total_amount))} Rupiah"</p>
									</div>
									{#if inv.notes}
										<div class="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[10px]">
											<p class="font-black uppercase tracking-wider text-slate-500 mb-0.5">Catatan:</p>
											<p class="text-slate-700">{inv.notes}</p>
										</div>
									{/if}
								</div>
								<div class="col-span-5 bg-slate-50 rounded-lg border border-slate-200 p-2.5 space-y-1 text-[11px]">
									<div class="flex justify-between text-slate-700">
										<span>Subtotal DPP:</span>
										<span class="font-mono font-bold">{formatCurrency(Number(inv.subtotal))}</span>
									</div>
									<div class="flex justify-between text-slate-700">
										<span>Pajak (PPN):</span>
										<span class="font-mono font-bold">{formatCurrency(Number(inv.tax_amount))}</span>
									</div>
									{#if Number(inv.advance_payment) > 0}
										<div class="flex justify-between text-rose-700">
											<span>Uang Muka:</span>
											<span class="font-mono font-bold">- {formatCurrency(Number(inv.advance_payment))}</span>
										</div>
									{/if}
									<div class="border-t-2 border-slate-800 pt-1.5 mt-1.5 flex justify-between items-baseline">
										<span class="font-black uppercase tracking-wider text-slate-900">Total Tagihan:</span>
										<span class="text-sm font-black font-mono text-blue-950">{formatCurrency(Number(inv.total_amount))}</span>
									</div>
								</div>
							</div>

							<!-- 6. PAYMENT & SIGNATURES -->
							<div class="grid grid-cols-2 gap-6 mt-6 pt-3 border-t border-slate-200 text-[11px]">
								<div>
									<h4 class="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Instruksi Pembayaran Transfer</h4>
									<div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5">
										<p class="font-black text-slate-900">{inv.bank_name || 'Bank Mandiri'}</p>
										<p class="font-mono font-bold text-blue-900">{inv.account_number || '-'}</p>
										<p class="text-slate-600 text-[10px]">a.n <strong class="text-slate-900">{inv.account_name || 'PT BUANA CENTRA SWAKARSA'}</strong></p>
									</div>
								</div>
								<div class="text-center flex flex-col justify-between items-center">
									<div>
										<p class="font-bold text-slate-700">Hormat Kami,</p>
										<p class="text-[10px] text-slate-500">PT. Buana Centra Swakarsa</p>
									</div>
									<div class="h-10"></div>
									<div>
										<p class="font-bold text-slate-900 border-b border-slate-800 inline-block px-4 pb-0.5">( Finance & Accounting Dept )</p>
									</div>
								</div>
							</div>
						</div>

						<footer class="mt-6 pt-2 border-t border-slate-200 text-center text-[8.5px] text-slate-400">
							Dokumen Resmi PT. Buana Centra Swakarsa • Dicetak secara sistem pada {new Date().toLocaleString('id-ID')}
						</footer>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Hidden iframe for seamless in-page printing without opening new tabs -->
<iframe id="print-iframe" class="hidden" title="Print frame"></iframe>
