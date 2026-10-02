<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let stats = $derived(data.stats);
	let fundRequests = $derived(data.fundRequests || []);
	let ledger = $derived(data.ledger || []);
	let pendingShifts = $derived(data.pendingShifts || []);
	let reconciliationSummary = $derived(data.reconciliationSummary);
	let dailyClosingHistory = $derived(data.dailyClosingHistory || []);

	// Navigation Tabs
	let activeMainTab = $state<'REQUESTS' | 'LEDGER' | 'CLOSING_HARIAN'>('REQUESTS');

	// Filters for Fund Requests
	let requestFilterStatus = $state<string>('ALL');
	let filteredRequests = $derived.by(() => {
		if (requestFilterStatus === 'ALL') return fundRequests;
		return fundRequests.filter((r: any) => r.status === requestFilterStatus);
	});

	// Filters for Cash Ledger
	let ledgerFilterDirection = $state<string>('ALL');
	let ledgerSearch = $state<string>('');
	let filteredLedger = $derived.by(() => {
		let list = ledger;
		if (ledgerFilterDirection !== 'ALL') {
			list = list.filter((l: any) => l.direction === ledgerFilterDirection);
		}
		if (ledgerSearch.trim()) {
			const q = ledgerSearch.toLowerCase();
			list = list.filter((l: any) => 
				(l.description && l.description.toLowerCase().includes(q)) ||
				(l.referenceId && l.referenceId.toLowerCase().includes(q)) ||
				(l.category && l.category.toLowerCase().includes(q))
			);
		}
		return list;
	});

	// Modal States
	let showRequestModal = $state(false);
	let showDirectModal = $state(false);
	let showConfirmModal = $state(false);
	let selectedRequestToConfirm = $state<any>(null);
	let selectedClosingForPrint = $state<any>(null);

	// Form Submission State
	let isSubmitting = $state(false);
	let closingNotes = $state('');
	let differenceReason = $state('');

	// Toast / Notification
	let toastMessage = $state<string | null>(null);
	let toastType = $state<'success' | 'error'>('success');

	$effect(() => {
		if (form?.success) {
			isSubmitting = false;
			showRequestModal = false;
			showDirectModal = false;
			showConfirmModal = false;
			selectedRequestToConfirm = null;
			closingNotes = '';
			differenceReason = '';
			toastType = 'success';
			toastMessage = form.message || 'Operasi berhasil!';
			setTimeout(() => { toastMessage = null; }, 5000);
		} else if (form?.error || (form as any)?.message) {
			isSubmitting = false;
			toastType = 'error';
			toastMessage = form.error || (form as any).message || 'Terjadi kesalahan.';
			setTimeout(() => { toastMessage = null; }, 5000);
		}
	});

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

	const formatDate = (dateStr: string) => {
		if (!dateStr) return '-';
		try {
			return new Date(dateStr).toLocaleDateString('id-ID', {
				day: 'numeric',
				month: 'short',
				year: 'numeric'
			});
		} catch {
			return dateStr;
		}
	};

	const formatDateTime = (dateStr: string) => {
		if (!dateStr) return '-';
		try {
			return new Date(dateStr).toLocaleDateString('id-ID', {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return dateStr;
		}
	};

	const openConfirmModal = (req: any) => {
		selectedRequestToConfirm = req;
		showConfirmModal = true;
	};
</script>

<svelte:head>
	<title>Kas & Saldo Operasional | Kasir ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Toast Notification -->
	{#if toastMessage}
		<div class="fixed top-20 right-8 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-bold transition-all {toastType === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-500 text-white border-rose-400'}">
			<span class="material-symbols-outlined text-xl">{toastType === 'success' ? 'check_circle' : 'error'}</span>
			<span>{toastMessage}</span>
			<button class="ml-2 opacity-80 hover:opacity-100" onclick={() => toastMessage = null}>
				<span class="material-symbols-outlined text-base">close</span>
			</button>
		</div>
	{/if}

	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
					<span class="material-symbols-outlined text-2xl">account_balance_wallet</span>
				</div>
				<div>
					<h1 class="text-2xl font-black text-on-surface tracking-tight">Kas & Saldo Operasional</h1>
					<p class="text-on-surface-variant font-medium text-xs mt-0.5">
						Pengajuan dana harian ke Finance, pencatatan drop kas, serta pemantauan mutasi buku kas operasional
					</p>
				</div>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-2.5">
			<button 
				class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-lowest text-on-surface hover:bg-surface-container text-xs font-bold transition-colors flex items-center gap-2"
				onclick={() => showDirectModal = true}
			>
				<span class="material-symbols-outlined text-base text-emerald-600 dark:text-emerald-400">add_card</span>
				<span>Drop / Mutasi Kas Langsung</span>
			</button>
			<button 
				class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-2"
				onclick={() => showRequestModal = true}
			>
				<span class="material-symbols-outlined text-base">post_add</span>
				<span>+ Ajukan Dana ke Finance</span>
			</button>
		</div>
	</header>

	<!-- Bento Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Saldo Kasir Berjalan -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-emerald-500/30 flex flex-col justify-between">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Saldo Kas Operasional</span>
				<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">account_balance_wallet</span>
				</div>
			</div>
			<div class="text-2xl font-black font-mono {stats.currentBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
				{formatCurrency(stats.currentBalance)}
			</div>
			<p class="text-[11px] text-on-surface-variant mt-2 flex items-center gap-1 font-medium">
				<span class="material-symbols-outlined text-xs text-emerald-600">info</span>
				<span>Float kasir untuk UJO & operasional</span>
			</p>
		</div>

		<!-- Total Masuk Bulan Ini -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-emerald-500/30 flex flex-col justify-between">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Drop Dana (Bulan Ini)</span>
				<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">trending_up</span>
				</div>
			</div>
			<div class="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
				{formatCurrency(stats.monthIn)}
			</div>
			<p class="text-[11px] text-on-surface-variant mt-2">
				Total keseluruhan: <span class="font-bold font-mono">{formatCurrency(stats.totalIn)}</span>
			</p>
		</div>

		<!-- Total Keluar Bulan Ini -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-rose-500/30 flex flex-col justify-between">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pengeluaran (Bulan Ini)</span>
				<div class="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">trending_down</span>
				</div>
			</div>
			<div class="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
				{formatCurrency(stats.monthOut)}
			</div>
			<p class="text-[11px] text-on-surface-variant mt-2">
				Total keseluruhan: <span class="font-bold font-mono">{formatCurrency(stats.totalOut)}</span>
			</p>
		</div>

		<!-- Pengajuan Pending -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-amber-500/30 flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-3">
					<span class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pengajuan Menunggu</span>
					<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
						<span class="material-symbols-outlined text-[20px]">hourglass_top</span>
					</div>
				</div>
				<div class="flex items-baseline gap-2">
					<span class="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">{stats.pendingCount}</span>
					<span class="text-xs text-on-surface-variant font-medium">Tiket Diajukan</span>
				</div>
				<p class="text-xs font-bold font-mono text-amber-700 dark:text-amber-300 mt-1">
					{formatCurrency(stats.pendingTotal)}
				</p>
			</div>
			<button 
				class="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 mt-3 text-left"
				onclick={() => { activeMainTab = 'REQUESTS'; requestFilterStatus = 'PENDING'; }}
			>
				<span>Tinjau Pengajuan</span>
				<span class="material-symbols-outlined text-sm">arrow_forward</span>
			</button>
		</div>
	</div>

	<!-- Main Tabs Nav -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/70 dark:border-slate-800/70 pb-3">
		<div class="inline-flex p-1 rounded-2xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70 flex-wrap">
			<button 
				class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 {activeMainTab === 'REQUESTS' ? 'bg-emerald-600 text-white' : 'text-on-surface hover:bg-surface-container'}"
				onclick={() => activeMainTab = 'REQUESTS'}
			>
				<span class="material-symbols-outlined text-base">receipt_long</span>
				<span>Daftar Pengajuan Dana</span>
				{#if stats.pendingCount > 0}
					<span class="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 ml-1">
						{stats.pendingCount}
					</span>
				{/if}
			</button>
			<button 
				class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 {activeMainTab === 'LEDGER' ? 'bg-emerald-600 text-white' : 'text-on-surface hover:bg-surface-container'}"
				onclick={() => activeMainTab = 'LEDGER'}
			>
				<span class="material-symbols-outlined text-base">menu_book</span>
				<span>Buku Kas & Mutasi Saldo</span>
			</button>
			<button 
				class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 {activeMainTab === 'CLOSING_HARIAN' ? 'bg-emerald-600 text-white' : 'text-on-surface hover:bg-surface-container'}"
				onclick={() => activeMainTab = 'CLOSING_HARIAN'}
			>
				<span class="material-symbols-outlined text-base">rule_settings</span>
				<span>Closing Harian Keuangan</span>
				{#if pendingShifts.length > 0}
					<span class="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 ml-1 animate-pulse">
						{pendingShifts.length} Shift Siap
					</span>
				{/if}
			</button>
		</div>

		<!-- Secondary controls / filters -->
		{#if activeMainTab === 'REQUESTS'}
			<div class="inline-flex p-1 rounded-xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70 text-xs">
				<button 
					class="px-3 py-1.5 rounded-lg font-bold transition-colors {requestFilterStatus === 'ALL' ? 'bg-surface-container-lowest text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => requestFilterStatus = 'ALL'}
				>
					Semua ({fundRequests.length})
				</button>
				<button 
					class="px-3 py-1.5 rounded-lg font-bold transition-colors {requestFilterStatus === 'PENDING' ? 'bg-surface-container-lowest text-amber-600 dark:text-amber-400' : 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => requestFilterStatus = 'PENDING'}
				>
					Menunggu ({fundRequests.filter((r: any) => r.status === 'PENDING').length})
				</button>
				<button 
					class="px-3 py-1.5 rounded-lg font-bold transition-colors {requestFilterStatus === 'RECEIVED' ? 'bg-surface-container-lowest text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => requestFilterStatus = 'RECEIVED'}
				>
					Diterima ({fundRequests.filter((r: any) => r.status === 'RECEIVED').length})
				</button>
			</div>
		{:else if activeMainTab === 'LEDGER'}
			<div class="flex items-center gap-3 w-full sm:w-auto">
				<!-- Clean borderless search input -->
				<div class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-low focus-within:ring-2 focus-within:ring-emerald-500/30 flex-1 sm:w-64">
					<span class="material-symbols-outlined text-on-surface-variant text-base">search</span>
					<input 
						type="text" 
						placeholder="Cari mutasi / SO / Trip..." 
						bind:value={ledgerSearch}
						class="w-full bg-transparent text-xs text-on-surface outline-none placeholder:text-on-surface-variant/50"
					/>
				</div>
				<div class="inline-flex p-1 rounded-xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70 text-xs">
					<button 
						class="px-3 py-1.5 rounded-lg font-bold transition-colors {ledgerFilterDirection === 'ALL' ? 'bg-surface-container-lowest text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}"
						onclick={() => ledgerFilterDirection = 'ALL'}
					>
						Semua
					</button>
					<button 
						class="px-3 py-1.5 rounded-lg font-bold transition-colors {ledgerFilterDirection === 'IN' ? 'bg-surface-container-lowest text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant hover:text-on-surface'}"
						onclick={() => ledgerFilterDirection = 'IN'}
					>
						Masuk (IN)
					</button>
					<button 
						class="px-3 py-1.5 rounded-lg font-bold transition-colors {ledgerFilterDirection === 'OUT' ? 'bg-surface-container-lowest text-rose-600 dark:text-rose-400' : 'text-on-surface-variant hover:text-on-surface'}"
						onclick={() => ledgerFilterDirection = 'OUT'}
					>
						Keluar (OUT)
					</button>
				</div>
			</div>
		{:else if activeMainTab === 'CLOSING_HARIAN'}
			<div class="flex items-center gap-2 text-xs">
				<span class="px-3 py-1.5 rounded-xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70 font-semibold text-on-surface-variant flex items-center gap-1.5">
					<span class="material-symbols-outlined text-base text-emerald-600 dark:text-emerald-400">schedule</span>
					<span>Audit Harian: Jam 08:00 - 09:00 WIB</span>
				</span>
			</div>
		{/if}
	</div>

	<!-- Tab 1: Daftar Pengajuan Dana ke Finance -->
	{#if activeMainTab === 'REQUESTS'}
		<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="border-b border-slate-200/70 dark:border-slate-800/70 bg-surface-container-low/50 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
							<th class="py-3.5 px-4">No. Pengajuan</th>
							<th class="py-3.5 px-4">Tanggal</th>
							<th class="py-3.5 px-4">Keperluan & Catatan</th>
							<th class="py-3.5 px-4 text-right">Diajukan (Rp)</th>
							<th class="py-3.5 px-4 text-right">Diterima (Rp)</th>
							<th class="py-3.5 px-4 text-center">Status</th>
							<th class="py-3.5 px-4">Info Pencairan</th>
							<th class="py-3.5 px-4 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs font-medium">
						{#if filteredRequests.length === 0}
							<tr>
								<td colspan="8" class="text-center py-10 text-on-surface-variant">
									<div class="flex flex-col items-center gap-2">
										<span class="material-symbols-outlined text-4xl opacity-40">receipt_long</span>
										<p class="font-bold">Belum ada data pengajuan dana</p>
										<p class="text-[11px]">Klik tombol "+ Ajukan Dana ke Finance" di atas untuk membuat tiket pengajuan dana operasional baru.</p>
									</div>
								</td>
							</tr>
						{/if}

						{#each filteredRequests as req}
							<tr class="hover:bg-surface-container/40 transition-colors">
								<td class="py-3.5 px-4 font-mono font-bold text-on-surface">
									{req.requestNumber}
								</td>
								<td class="py-3.5 px-4 text-on-surface-variant whitespace-nowrap">
									{formatDate(req.requestDate)}
								</td>
								<td class="py-3.5 px-4 max-w-xs">
									<p class="font-bold text-on-surface">{req.purpose}</p>
									{#if req.notes}
										<p class="text-[11px] text-on-surface-variant italic mt-0.5">"{req.notes}"</p>
									{/if}
									<p class="text-[10px] text-on-surface-variant/70 mt-0.5">Oleh: {req.createdBy || 'Kasir'}</p>
								</td>
								<td class="py-3.5 px-4 text-right font-mono font-bold text-on-surface whitespace-nowrap">
									{formatCurrency(req.amountRequested)}
								</td>
								<td class="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap {req.amountReceived > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant'}">
									{req.amountReceived > 0 ? formatCurrency(req.amountReceived) : '-'}
								</td>
								<td class="py-3.5 px-4 text-center whitespace-nowrap">
									{#if req.status === 'PENDING'}
										<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
											<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
											MENUNGGU CAIR
										</span>
									{:else if req.status === 'RECEIVED'}
										<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
											DITERIMA KASIR
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
											DIBATALKAN
										</span>
									{/if}
								</td>
								<td class="py-3.5 px-4 text-[11px] text-on-surface-variant max-w-[200px]">
									{#if req.status === 'RECEIVED'}
										<p class="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
											<span class="material-symbols-outlined text-xs">payments</span>
											<span>{req.paymentMethod}</span>
										</p>
										{#if req.referenceNo}
											<p class="font-mono text-[10px] text-on-surface">Ref: {req.referenceNo}</p>
										{/if}
										<p class="text-[10px] text-on-surface-variant/70">{formatDateTime(req.receivedAt)}</p>
									{:else if req.status === 'PENDING'}
										<span class="text-amber-600 dark:text-amber-400 font-medium">Menunggu transfer Finance...</span>
									{:else}
										<span>-</span>
									{/if}
								</td>
								<td class="py-3.5 px-4 text-right whitespace-nowrap">
									{#if req.status === 'PENDING'}
										<div class="flex items-center justify-end gap-1.5">
											<button 
												type="button"
												class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
												onclick={() => openConfirmModal(req)}
											>
												<span class="material-symbols-outlined text-sm">check_circle</span>
												<span>Konfirmasi Terima</span>
											</button>
											<form method="POST" action="?/cancelFundRequest" use:enhance={() => {
												if (!confirm('Apakah Anda yakin ingin membatalkan pengajuan ini?')) return () => {};
												isSubmitting = true;
												return async ({ update }) => {
													await update();
													isSubmitting = false;
												};
											}}>
												<input type="hidden" name="requestId" value={req.id} />
												<button 
													type="submit" 
													class="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
													title="Batalkan Pengajuan"
												>
													<span class="material-symbols-outlined text-base">close</span>
												</button>
											</form>
										</div>
									{:else}
										<span class="text-[11px] text-on-surface-variant/60 italic font-mono">Selesai</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Tab 2: Buku Kas & Riwayat Mutasi -->
	{#if activeMainTab === 'LEDGER'}
		<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 overflow-hidden">
			<div class="px-5 py-3.5 border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between bg-surface-container-low/50">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg">menu_book</span>
					<span class="text-xs font-bold text-on-surface">Buku Kas Operasional (Real-time Mutasi)</span>
				</div>
				<span class="text-[11px] text-on-surface-variant font-medium">
					Menampilkan {filteredLedger.length} transaksi terakhir
				</span>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="border-b border-slate-200/70 dark:border-slate-800/70 bg-surface-container-low/50 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
							<th class="py-3 px-4">Waktu</th>
							<th class="py-3 px-4 text-center">Tipe</th>
							<th class="py-3 px-4">Kategori</th>
							<th class="py-3 px-4">Keterangan & Referensi</th>
							<th class="py-3 px-4 text-right">Debet / Masuk (Rp)</th>
							<th class="py-3 px-4 text-right">Kredit / Keluar (Rp)</th>
							<th class="py-3 px-4 text-right">Saldo Berjalan (Rp)</th>
							<th class="py-3 px-4">Kasir / User</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs font-medium">
						{#if filteredLedger.length === 0}
							<tr>
								<td colspan="8" class="text-center py-10 text-on-surface-variant">
									<div class="flex flex-col items-center gap-2">
										<span class="material-symbols-outlined text-4xl opacity-40">menu_book</span>
										<p class="font-bold">Belum ada mutasi buku kas</p>
										<p class="text-[11px]">Setiap drop dana dari Finance atau pencairan UJO supir akan tercatat di sini secara otomatis.</p>
									</div>
								</td>
							</tr>
						{/if}

						{#each filteredLedger as row}
							<tr class="hover:bg-surface-container/40 transition-colors">
								<td class="py-3 px-4 text-on-surface-variant whitespace-nowrap font-mono text-[11px]">
									{formatDateTime(row.transactionDate)}
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									{#if row.direction === 'IN'}
										<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
											<span class="material-symbols-outlined text-xs">arrow_downward</span>
											MASUK
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
											<span class="material-symbols-outlined text-xs">arrow_upward</span>
											KELUAR
										</span>
									{/if}
								</td>
								<td class="py-3 px-4 whitespace-nowrap">
									<span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
										{row.category}
									</span>
								</td>
								<td class="py-3 px-4 max-w-sm">
									<p class="text-on-surface font-semibold">{row.description}</p>
									{#if row.referenceId}
										<p class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">Ref: {row.referenceId}</p>
									{/if}
								</td>
								<td class="py-3 px-4 text-right font-mono font-bold whitespace-nowrap {row.direction === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant/40'}">
									{row.direction === 'IN' ? formatCurrency(row.amount) : '-'}
								</td>
								<td class="py-3 px-4 text-right font-mono font-bold whitespace-nowrap {row.direction === 'OUT' ? 'text-rose-600 dark:text-rose-400' : 'text-on-surface-variant/40'}">
									{row.direction === 'OUT' ? formatCurrency(row.amount) : '-'}
								</td>
								<td class="py-3 px-4 text-right font-mono font-black text-on-surface whitespace-nowrap bg-surface-container-low/30">
									{formatCurrency(row.balanceAfter)}
								</td>
								<td class="py-3 px-4 text-on-surface-variant text-[11px] whitespace-nowrap">
									{row.performedBy || 'System'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Tab 3: Closing Harian Keuangan (Audit 3 Shift Kasir) -->
	{#if activeMainTab === 'CLOSING_HARIAN'}
		<div class="space-y-6">
			<!-- Banner Info Audit Pagi -->
			<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div class="flex items-center gap-3.5">
					<div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 flex-shrink-0">
						<span class="material-symbols-outlined text-2xl">policy</span>
					</div>
					<div>
						<h2 class="text-base font-black text-on-surface">Rekonsiliasi & Closing Harian Keuangan</h2>
						<p class="text-xs text-on-surface-variant mt-0.5">
							Audit harian rutin jam 08:00–09:00 WIB untuk mencocokkan drop dana modal awal keuangan dengan akumulasi pengeluaran 3 shift kasir dan sisa fisik uang kasir.
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2 flex-shrink-0">
					{#if pendingShifts.length > 0}
						<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
							<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
							{pendingShifts.length} Shift Siap Direkonsiliasi
						</span>
					{:else}
						<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
							<span class="material-symbols-outlined text-sm">verified</span>
							Semua Shift Terekonsiliasi
						</span>
					{/if}
				</div>
			</div>

			{#if pendingShifts.length > 0 && reconciliationSummary}
				<!-- Reconciliation Status Alert Banner -->
				{#if reconciliationSummary.status === 'BALANCED'}
					<div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3.5 text-xs text-emerald-900 dark:text-emerald-200">
						<span class="material-symbols-outlined text-emerald-600 text-2xl flex-shrink-0">check_circle</span>
						<div>
							<strong class="font-bold text-sm block text-emerald-800 dark:text-emerald-300">Status Rekonsiliasi: BALANCE (Cocok 100%)</strong>
							<span>Total dana kas yang tersedia cocok persis dengan akumulasi pengeluaran dan sisa uang fisik kasir (Selisih: Rp 0).</span>
						</div>
					</div>
				{:else if reconciliationSummary.cashDifference > 0}
					<div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3.5 text-xs text-amber-900 dark:text-amber-200">
						<span class="material-symbols-outlined text-amber-600 text-2xl flex-shrink-0">warning</span>
						<div>
							<strong class="font-bold text-sm block text-amber-800 dark:text-amber-300">
								Status Rekonsiliasi: SELISIH LEBIH (+{formatCurrency(reconciliationSummary.cashDifference)})
							</strong>
							<span>Sisa uang fisik aktual di tangan kasir melebihi saldo sistem kasir. Mohon masukkan justifikasi investigasi sebelum melakukan finalisasi.</span>
						</div>
					</div>
				{:else}
					<div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3.5 text-xs text-rose-900 dark:text-rose-200">
						<span class="material-symbols-outlined text-rose-600 text-2xl flex-shrink-0">error</span>
						<div>
							<strong class="font-bold text-sm block text-rose-800 dark:text-rose-300">
								Status Rekonsiliasi: SELISIH KURANG (-{formatCurrency(Math.abs(reconciliationSummary.cashDifference))})
							</strong>
							<span>Sisa uang fisik aktual di tangan kasir lebih kecil dari saldo sistem kasir. Mohon cantumkan catatan investigasi sebelum melakukan finalisasi.</span>
						</div>
					</div>
				{/if}

				<!-- Bento Grid Summary Cards -->
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<!-- Modal Awal Siklus -->
					<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between">
						<div class="flex items-center justify-between mb-2">
							<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">1. Modal Awal Kasir</span>
							<div class="w-8 h-8 rounded-lg bg-surface-container text-on-surface flex items-center justify-center">
								<span class="material-symbols-outlined text-lg">flight_takeoff</span>
							</div>
						</div>
						<div class="text-xl font-black font-mono text-on-surface">
							{formatCurrency(reconciliationSummary.openingCash)}
						</div>
						<p class="text-[11px] text-on-surface-variant mt-2">
							Kas awal shift pertama siklus ini
						</p>
					</div>

					<!-- Total Drop Dana Keuangan -->
					<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between">
						<div class="flex items-center justify-between mb-2">
							<span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">2. Drop Dana Keuangan</span>
							<div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
								<span class="material-symbols-outlined text-lg">add_card</span>
							</div>
						</div>
						<div class="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
							{formatCurrency(reconciliationSummary.totalFundDropped)}
						</div>
						<p class="text-[11px] text-on-surface-variant mt-2">
							Total modal: <strong class="font-mono text-on-surface">{formatCurrency(reconciliationSummary.totalCashAvailable)}</strong>
						</p>
					</div>

					<!-- Realisasi Pengeluaran Kasir -->
					<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between">
						<div class="flex items-center justify-between mb-2">
							<span class="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">3. Realisasi Pengeluaran</span>
							<div class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
								<span class="material-symbols-outlined text-lg">payments</span>
							</div>
						</div>
						<div class="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
							{formatCurrency(reconciliationSummary.totalCashOut)}
						</div>
						<p class="text-[11px] text-on-surface-variant mt-2">
							UJO: {reconciliationSummary.totalUjoCount} rit ({formatCurrency(reconciliationSummary.totalUjoPaid)})
						</p>
					</div>

					<!-- Sisa Fisik Kasir & Selisih -->
					<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between">
						<div class="flex items-center justify-between mb-2">
							<span class="text-xs font-bold uppercase tracking-wider {reconciliationSummary.status === 'BALANCED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}">
								4. Sisa Fisik Kasir
							</span>
							<div class="w-8 h-8 rounded-lg {reconciliationSummary.status === 'BALANCED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'} flex items-center justify-center">
								<span class="material-symbols-outlined text-lg">point_of_sale</span>
							</div>
						</div>
						<div class="text-xl font-black font-mono text-on-surface">
							{formatCurrency(reconciliationSummary.actualClosingCash)}
						</div>
						<p class="text-[11px] font-bold mt-2 {reconciliationSummary.cashDifference === 0 ? 'text-emerald-600' : reconciliationSummary.cashDifference > 0 ? 'text-amber-600' : 'text-rose-600'}">
							Selisih: {reconciliationSummary.cashDifference >= 0 ? '+' : ''}{formatCurrency(reconciliationSummary.cashDifference)}
						</p>
					</div>
				</div>

				<!-- Form Finalisasi Closing Harian -->
				<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 p-6">
					<div class="flex items-center gap-2 mb-4">
						<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400">assignment_turned_in</span>
						<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider">Form Finalisasi & Berita Acara Closing Harian</h3>
					</div>

					<form method="POST" action="?/finalizeDailyClosing" use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							await update();
							isSubmitting = false;
						};
					}} class="space-y-4">
						<!-- Hidden Calculation Fields -->
						<input type="hidden" name="shiftIds" value={reconciliationSummary.shiftIds.join(',')} />
						<input type="hidden" name="openingCash" value={reconciliationSummary.openingCash} />
						<input type="hidden" name="totalFundDropped" value={reconciliationSummary.totalFundDropped} />
						<input type="hidden" name="totalCashAvailable" value={reconciliationSummary.totalCashAvailable} />
						<input type="hidden" name="totalUjoPaid" value={reconciliationSummary.totalUjoPaid} />
						<input type="hidden" name="totalDnClaimPaid" value={reconciliationSummary.totalDnClaimPaid} />
						<input type="hidden" name="totalOtherExpenses" value={reconciliationSummary.totalOtherExpenses} />
						<input type="hidden" name="totalRefundReceived" value={reconciliationSummary.totalRefundReceived} />
						<input type="hidden" name="totalCashOut" value={reconciliationSummary.totalCashOut} />
						<input type="hidden" name="expectedClosingCash" value={reconciliationSummary.expectedClosingCash} />
						<input type="hidden" name="actualClosingCash" value={reconciliationSummary.actualClosingCash} />
						<input type="hidden" name="cashDifference" value={reconciliationSummary.cashDifference} />
						<input type="hidden" name="periodStart" value={reconciliationSummary.periodStart} />
						<input type="hidden" name="periodEnd" value={reconciliationSummary.periodEnd} />

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#if reconciliationSummary.status !== 'BALANCED'}
								<div class="md:col-span-2">
									<label class="block text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1.5" for="diffReason">
										Catatan Investigasi Selisih Kas (Wajib Diisi) <span class="text-rose-500">*</span>
									</label>
									<textarea 
										id="diffReason"
										name="differenceReason"
										rows="2"
										required
										bind:value={differenceReason}
										placeholder="Jelaskan alasan atau kronologi selisih kas antara sistem dan fisik kasir..."
										class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-container-low border border-rose-300 dark:border-rose-800 text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/30"
									></textarea>
								</div>
							{/if}

							<div class="md:col-span-2">
								<label class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5" for="generalNotes">
									Catatan Tambahan Petugas Keuangan (Opsional)
								</label>
								<input 
									id="generalNotes"
									type="text"
									name="notes"
									bind:value={closingNotes}
									placeholder="Contoh: Seluruh bukti fisik tanda terima UJO dan DN lengkap & tervalidasi."
									class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
								/>
							</div>
						</div>

						<div class="pt-3 border-t border-slate-200/70 dark:border-slate-800/70 flex flex-col sm:flex-row items-center justify-between gap-3">
							<p class="text-[11px] text-on-surface-variant flex items-center gap-1.5">
								<span class="material-symbols-outlined text-sm text-emerald-600">lock</span>
								<span>Finalisasi akan mengunci {pendingShifts.length} shift kasir dan menerbitkan Berita Acara Rekonsiliasi resmi.</span>
							</p>

							<button 
								type="submit" 
								disabled={isSubmitting}
								class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
							>
								<span class="material-symbols-outlined text-base">{isSubmitting ? 'sync' : 'verified'}</span>
								<span>{isSubmitting ? 'Memproses Closing...' : 'Finalisasi Closing Harian'}</span>
							</button>
						</div>
					</form>
				</div>

				<!-- Rincian Shift Kasir yang Direkonsiliasi -->
				<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 overflow-hidden">
					<div class="px-5 py-4 border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between bg-surface-container-low/40">
						<h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
							<span class="material-symbols-outlined text-base text-emerald-600">schedule</span>
							<span>Daftar {pendingShifts.length} Shift Kasir yang Termasuk Dalam Closing Ini</span>
						</h3>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full text-left border-collapse">
							<thead>
								<tr class="border-b border-slate-200/70 dark:border-slate-800/70 bg-surface-container-low/20 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
									<th class="py-3 px-4">Shift & Sesi</th>
									<th class="py-3 px-4">Kasir Bertugas</th>
									<th class="py-3 px-4">Jam Sesi</th>
									<th class="py-3 px-4 text-right">Modal Awal</th>
									<th class="py-3 px-4 text-right">Kas Masuk</th>
									<th class="py-3 px-4 text-right">Kas Keluar</th>
									<th class="py-3 px-4 text-right">Fisik Diserahkan</th>
									<th class="py-3 px-4 text-center">Selisih</th>
									<th class="py-3 px-4">Handover Ke</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs font-medium">
								{#each pendingShifts as s}
									<tr class="hover:bg-surface-container/30 transition-colors">
										<td class="py-3 px-4">
											<span class="font-bold text-on-surface">{s.shiftName}</span>
											<p class="text-[10px] font-mono text-on-surface-variant">{s.sessionNumber}</p>
										</td>
										<td class="py-3 px-4 font-semibold text-on-surface">
											{s.cashierName}
										</td>
										<td class="py-3 px-4 text-[11px] text-on-surface-variant font-mono">
											{formatDateTime(s.openedAt)}<br/>s.d. {formatDateTime(s.closedAt)}
										</td>
										<td class="py-3 px-4 text-right font-mono font-semibold">
											{formatCurrency(parseFloat(s.openingCash))}
										</td>
										<td class="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
											+{formatCurrency(parseFloat(s.totalCashIn))}
										</td>
										<td class="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
											-{formatCurrency(parseFloat(s.totalCashOut))}
											<p class="text-[10px] text-on-surface-variant font-normal">UJO: {s.totalUjoCount} | DN: {s.totalDnCount}</p>
										</td>
										<td class="py-3 px-4 text-right font-mono font-bold text-on-surface bg-surface-container-low/20">
											{formatCurrency(parseFloat(s.actualClosingCash))}
										</td>
										<td class="py-3 px-4 text-center font-mono text-xs">
											{#if parseFloat(s.cashDifference) === 0}
												<span class="text-emerald-600 font-bold">Rp 0</span>
											{:else}
												<span class="text-rose-600 font-bold">{formatCurrency(parseFloat(s.cashDifference))}</span>
											{/if}
										</td>
										<td class="py-3 px-4 text-[11px] text-on-surface-variant">
											{s.handoverTo || '-'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{:else}
				<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 p-12 text-center text-on-surface-variant">
					<div class="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center mb-4">
						<span class="material-symbols-outlined text-3xl">task_alt</span>
					</div>
					<h3 class="text-base font-bold text-on-surface mb-1">Seluruh Shift Kasir Sudah Direkonsiliasi</h3>
					<p class="text-xs text-on-surface-variant max-w-md mx-auto">
						Tidak ada sesi shift kasir tertutup yang menunggu closing. Sesi shift baru akan muncul di sini setelah kasir menyelesaikan shift mereka.
					</p>
				</div>
			{/if}

			<!-- Riwayat Closing Harian Sebelumnya -->
			<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 overflow-hidden">
				<div class="px-5 py-4 border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between bg-surface-container-low/40">
					<h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-base text-emerald-600">history</span>
						<span>Riwayat Berita Acara Closing Harian Keuangan</span>
					</h3>
					<span class="text-xs text-on-surface-variant">{dailyClosingHistory.length} Berita Acara Tersimpan</span>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse">
						<thead>
							<tr class="border-b border-slate-200/70 dark:border-slate-800/70 bg-surface-container-low/20 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
								<th class="py-3 px-4">No. Dokumen</th>
								<th class="py-3 px-4">Tanggal Closing</th>
								<th class="py-3 px-4 text-right">Modal Awal + Drop</th>
								<th class="py-3 px-4 text-right">Realisasi Keluar</th>
								<th class="py-3 px-4 text-right">Sisa Fisik Kasir</th>
								<th class="py-3 px-4 text-center">Status</th>
								<th class="py-3 px-4">Ditutup Oleh</th>
								<th class="py-3 px-4 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs font-medium">
							{#if dailyClosingHistory.length === 0}
								<tr>
									<td colspan="8" class="text-center py-8 text-on-surface-variant">
										Belum ada riwayat closing harian yang tersimpan.
									</td>
								</tr>
							{/if}
							{#each dailyClosingHistory as hist}
								<tr class="hover:bg-surface-container/30 transition-colors">
									<td class="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
										{hist.closingNumber}
									</td>
									<td class="py-3 px-4 text-on-surface">
										{formatDate(hist.closingDate)}
										<p class="text-[10px] text-on-surface-variant font-mono">{formatDateTime(hist.periodStart)} s.d. {formatDateTime(hist.periodEnd)}</p>
									</td>
									<td class="py-3 px-4 text-right font-mono font-semibold">
										{formatCurrency(parseFloat(hist.totalCashAvailable))}
									</td>
									<td class="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
										-{formatCurrency(parseFloat(hist.totalCashOut))}
									</td>
									<td class="py-3 px-4 text-right font-mono font-bold text-on-surface bg-surface-container-low/20">
										{formatCurrency(parseFloat(hist.actualClosingCash))}
									</td>
									<td class="py-3 px-4 text-center">
										{#if hist.status === 'BALANCED'}
											<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
												BALANCE
											</span>
										{:else}
											<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
												SELISIH {formatCurrency(parseFloat(hist.cashDifference))}
											</span>
										{/if}
									</td>
									<td class="py-3 px-4 text-on-surface-variant text-[11px]">
										{hist.closedBy || 'Keuangan'}
									</td>
									<td class="py-3 px-4 text-right">
										<button 
											class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low hover:bg-surface-container text-xs font-bold text-on-surface transition-colors flex items-center gap-1.5 ml-auto"
											onclick={() => selectedClosingForPrint = hist}
										>
											<span class="material-symbols-outlined text-sm text-emerald-600">print</span>
											<span>Cetak Berita Acara</span>
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- MODAL 1: Buat Pengajuan Dana ke Finance -->
{#if showRequestModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
		<div class="w-full max-w-lg rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-500/5">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400">post_add</span>
					<h3 class="text-base font-black text-on-surface">Buat Pengajuan Dana ke Finance</h3>
				</div>
				<button class="text-on-surface-variant hover:text-on-surface" onclick={() => showRequestModal = false}>
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form method="POST" action="?/createFundRequest" use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
				};
			}} class="p-6 space-y-4">
				<div>
					<label class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5" for="requestDate">
						Tanggal Kebutuhan
					</label>
					<input 
						id="requestDate"
						type="date" 
						name="requestDate" 
						value={new Date().toISOString().split('T')[0]} 
						required 
						class="w-full px-3.5 py-2.5 rounded-xl text-sm bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
					/>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5" for="amount">
						Nominal Pengajuan (Rp) <span class="text-rose-500">*</span>
					</label>
					<input 
						id="amount"
						type="number" 
						name="amount" 
						placeholder="Contoh: 15000000" 
						min="1000" 
						step="1000" 
						required 
						class="w-full px-3.5 py-2.5 rounded-xl text-base font-mono font-bold bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
					/>
					<p class="text-[11px] text-on-surface-variant mt-1">Masukkan nominal estimasi dana operasional yang dibutuhkan.</p>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5" for="purpose">
						Keperluan Pengajuan <span class="text-rose-500">*</span>
					</label>
					<input 
						id="purpose"
						type="text" 
						name="purpose" 
						placeholder="Contoh: Dana Operasional Harian & UJO Supir Ritase" 
						required 
						class="w-full px-3.5 py-2.5 rounded-xl text-sm bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
					/>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5" for="notes">
						Catatan Tambahan / Rincian Singkat
					</label>
					<textarea 
						id="notes"
						name="notes" 
						rows="2" 
						placeholder="Contoh: Kebutuhan pencairan 5 armada rute Cilegon - Semarang besok pagi" 
						class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
					></textarea>
				</div>

				<div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
					<button 
						type="button" 
						class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:text-on-surface"
						onclick={() => showRequestModal = false}
					>
						Batal
					</button>
					<button 
						type="submit" 
						disabled={isSubmitting}
						class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
					>
						<span class="material-symbols-outlined text-sm">{isSubmitting ? 'sync' : 'send'}</span>
						<span>{isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan ke Finance'}</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL 2: Konfirmasi Terima Dana dari Finance -->
{#if showConfirmModal && selectedRequestToConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
		<div class="w-full max-w-lg rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-500/10">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400">check_circle</span>
					<div>
						<h3 class="text-base font-black text-on-surface">Konfirmasi Penerimaan Dana</h3>
						<p class="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">{selectedRequestToConfirm.requestNumber}</p>
					</div>
				</div>
				<button class="text-on-surface-variant hover:text-on-surface" onclick={() => showConfirmModal = false}>
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="px-6 py-3 bg-surface-container-low border-b border-slate-200 dark:border-slate-800 text-xs">
				<div class="grid grid-cols-2 gap-2">
					<div>
						<p class="text-on-surface-variant text-[10px] uppercase font-bold">Keperluan:</p>
						<p class="font-bold text-on-surface">{selectedRequestToConfirm.purpose}</p>
					</div>
					<div class="text-right">
						<p class="text-on-surface-variant text-[10px] uppercase font-bold">Nominal Diajukan:</p>
						<p class="font-bold text-on-surface font-mono">{formatCurrency(selectedRequestToConfirm.amountRequested)}</p>
					</div>
				</div>
			</div>

			<form method="POST" action="?/confirmReceiveFund" use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
				};
			}} class="p-6 space-y-4">
				<input type="hidden" name="requestId" value={selectedRequestToConfirm.id} />

				<div>
					<label class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5" for="amountReceived">
						Nominal Dana Diterima (Rp) <span class="text-rose-500">*</span>
					</label>
					<input 
						id="amountReceived"
						type="number" 
						name="amountReceived" 
						value={selectedRequestToConfirm.amountRequested}
						min="1000" 
						step="1000" 
						required 
						class="w-full px-3.5 py-2.5 rounded-xl text-base font-mono font-bold bg-surface-container-low border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
					/>
					<p class="text-[11px] text-on-surface-variant mt-1">Sesuaikan jika nominal transfer berbeda dengan pengajuan awal.</p>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5" for="paymentMethod">
							Metode Pencairan
						</label>
						<select 
							id="paymentMethod"
							name="paymentMethod" 
							class="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
						>
							<option value="TRANSFER">Transfer Bank</option>
							<option value="CASH">Tunai / Cash</option>
							<option value="CEK_GIRO">Cek / Giro</option>
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5" for="referenceNo">
							No. Referensi / Bukti Transfer
						</label>
						<input 
							id="referenceNo"
							type="text" 
							name="referenceNo" 
							placeholder="Contoh: TRF-BCA-98124" 
							class="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
						/>
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5" for="confirmNotes">
						Catatan Penerimaan
					</label>
					<input 
						id="confirmNotes"
						type="text" 
						name="notes" 
						placeholder="Contoh: Diterima utuh via rekening operasional pool" 
						class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
					/>
				</div>

				<div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
					<span class="material-symbols-outlined text-base flex-shrink-0 mt-0.5">info</span>
					<span>Setelah dikonfirmasi, saldo operasional kasir akan otomatis bertambah dan tercatat di buku kas (IN).</span>
				</div>

				<div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
					<button 
						type="button" 
						class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:text-on-surface"
						onclick={() => showConfirmModal = false}
					>
						Batal
					</button>
					<button 
						type="submit" 
						disabled={isSubmitting}
						class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
					>
						<span class="material-symbols-outlined text-sm">{isSubmitting ? 'sync' : 'account_balance_wallet'}</span>
						<span>{isSubmitting ? 'Menyimpan...' : 'Konfirmasi & Tambah Saldo'}</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL 3: Drop Kas Langsung / Penyesuaian Saldo -->
{#if showDirectModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
		<div class="w-full max-w-lg rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-surface-container">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400">add_card</span>
					<h3 class="text-base font-black text-on-surface">Catat Mutasi Kas Langsung</h3>
				</div>
				<button class="text-on-surface-variant hover:text-on-surface" onclick={() => showDirectModal = false}>
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form method="POST" action="?/directTopup" use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
				};
			}} class="p-6 space-y-4">
				<div>
					<label class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5" for="topupAmount">
						Nominal Kas Masuk (Rp) <span class="text-rose-500">*</span>
					</label>
					<input 
						id="topupAmount"
						type="number" 
						name="amount" 
						placeholder="Contoh: 5000000" 
						min="1000" 
						step="1000" 
						required 
						class="w-full px-3.5 py-2.5 rounded-xl text-base font-mono font-bold bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5" for="topupCategory">
							Kategori
						</label>
						<select 
							id="topupCategory"
							name="category" 
							class="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
						>
							<option value="DROP_DANA_FINANCE">Drop Dana Finance Langsung</option>
							<option value="PENYESUAIAN_SALDO">Saldo Awal / Penyesuaian Saldo</option>
							<option value="PENGEMBALIAN_SISA">Pengembalian Sisa UJO / Titipan</option>
							<option value="KAS_MASUK_LAIN">Kas Masuk Lainnya</option>
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5" for="topupRef">
							No. Referensi / Nota
						</label>
						<input 
							id="topupRef"
							type="text" 
							name="referenceNo" 
							placeholder="Contoh: BKK-001" 
							class="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
						/>
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5" for="topupDesc">
						Keterangan <span class="text-rose-500">*</span>
					</label>
					<input 
						id="topupDesc"
						type="text" 
						name="description" 
						placeholder="Contoh: Drop dana tunai kas kecil operasional pool" 
						required 
						class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
					/>
				</div>

				<div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
					<button 
						type="button" 
						class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:text-on-surface"
						onclick={() => showDirectModal = false}
					>
						Batal
					</button>
					<button 
						type="submit" 
						disabled={isSubmitting}
						class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
					>
						<span class="material-symbols-outlined text-sm">{isSubmitting ? 'sync' : 'add'}</span>
						<span>{isSubmitting ? 'Menyimpan...' : 'Simpan Kas Masuk'}</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL 4: Cetak Berita Acara Rekonsiliasi Kas Harian -->
{#if selectedClosingForPrint}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto no-print">
		<div class="w-full max-w-4xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
			<!-- Modal Controls Header (Hidden in Print) -->
			<div class="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between no-print">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600 text-xl">description</span>
					<h3 class="text-sm font-bold text-slate-800">Pratinjau Berita Acara Rekonsiliasi Kas Harian</h3>
				</div>
				<div class="flex items-center gap-2">
					<button 
						type="button"
						onclick={() => window.print()}
						class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
					>
						<span class="material-symbols-outlined text-sm">print</span>
						<span>Cetak / Unduh PDF</span>
					</button>
					<button 
						type="button"
						onclick={() => selectedClosingForPrint = null}
						class="px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-bold hover:bg-slate-200/60 transition-colors"
					>
						Tutup
					</button>
				</div>
			</div>

			<!-- Document Content Area (Printable Sheet) -->
			<div class="p-8 sm:p-12 print:p-0 printable-document bg-white text-slate-900">
				<!-- Kop Dokumen Resmi BCS -->
				<div class="border-b-2 border-slate-900 pb-4 mb-6">
					<div class="flex items-start justify-between gap-4">
						<div class="flex items-center gap-3">
							<div class="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-xl">
								BCS
							</div>
							<div>
								<h1 class="text-lg font-black tracking-tight text-slate-900">PT BUANA CENTRA SWAKARSA</h1>
								<p class="text-[10px] text-slate-600 uppercase font-semibold tracking-wider">Logistics & Transportation Services</p>
								<p class="text-[10px] text-slate-500">Jl. Raya Anyer Km. 122, Ciwandan, Kota Cilegon - Banten</p>
							</div>
						</div>
						<div class="text-right">
							<span class="inline-block px-3 py-1 rounded-md text-[10px] font-mono font-bold {selectedClosingForPrint.status === 'BALANCED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}">
								{selectedClosingForPrint.status === 'BALANCED' ? 'STATUS: BALANCE' : 'STATUS: DISCREPANCY'}
							</span>
							<p class="text-xs font-mono font-bold text-slate-800 mt-1">{selectedClosingForPrint.closingNumber}</p>
						</div>
					</div>

					<div class="mt-6 text-center">
						<h2 class="text-base font-black uppercase tracking-wider text-slate-900">
							BERITA ACARA REKONSILIASI KAS OPERASIONAL HARIAN
						</h2>
						<p class="text-xs font-medium text-slate-600 mt-0.5">
							Tanggal: <strong>{formatDate(selectedClosingForPrint.closingDate)}</strong> • Periode Siklus 24 Jam Kasir
						</p>
					</div>
				</div>

				<!-- Section I: Metadata Dokumen -->
				<div class="grid grid-cols-2 gap-4 text-xs mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
					<div>
						<p class="text-slate-500 text-[11px]">No. Dokumen Closing:</p>
						<p class="font-mono font-bold text-slate-800">{selectedClosingForPrint.closingNumber}</p>
						<p class="text-slate-500 text-[11px] mt-2">Periode Transaksi Shift:</p>
						<p class="font-mono font-semibold text-slate-800">
							{formatDateTime(selectedClosingForPrint.periodStart)} s.d. {formatDateTime(selectedClosingForPrint.periodEnd)}
						</p>
					</div>
					<div>
						<p class="text-slate-500 text-[11px]">Petugas Keuangan / Audit:</p>
						<p class="font-bold text-slate-800">{selectedClosingForPrint.closedBy || 'Tim Keuangan'}</p>
						<p class="text-slate-500 text-[11px] mt-2">Waktu Finalisasi Dokumen:</p>
						<p class="font-mono font-semibold text-slate-800">{formatDateTime(selectedClosingForPrint.createdAt)}</p>
					</div>
				</div>

				<!-- Section II: Tabel Rekonsiliasi Arus Kas -->
				<div class="mb-6">
					<h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
						A. Rekonsiliasi Modal Awal & Drop Dana Keuangan vs Realisasi Kasir
					</h4>
					<table class="w-full text-xs border border-slate-300 border-collapse">
						<tbody>
							<tr class="border-b border-slate-200 bg-slate-50">
								<td class="p-2.5 font-medium text-slate-700">1. Modal Kas Awal Siklus (Shift Pertama)</td>
								<td class="p-2.5 text-right font-mono font-bold text-slate-900 w-48">
									{formatCurrency(parseFloat(selectedClosingForPrint.openingCash))}
								</td>
							</tr>
							<tr class="border-b border-slate-200">
								<td class="p-2.5 font-medium text-slate-700">2. Drop Tambahan Dana dari Keuangan / Brankas</td>
								<td class="p-2.5 text-right font-mono font-bold text-emerald-700 w-48">
									+{formatCurrency(parseFloat(selectedClosingForPrint.totalFundDropped))}
								</td>
							</tr>
							<tr class="border-b-2 border-slate-400 bg-emerald-50/50 font-bold text-slate-900">
								<td class="p-2.5">TOTAL MODAL KAS DIKELOLA KASIR (1 + 2)</td>
								<td class="p-2.5 text-right font-mono text-emerald-800">
									{formatCurrency(parseFloat(selectedClosingForPrint.totalCashAvailable))}
								</td>
							</tr>
							<tr class="border-b border-slate-200">
								<td class="p-2.5 font-medium text-slate-700 pl-6">• Realisasi Pencairan UJO Supir</td>
								<td class="p-2.5 text-right font-mono text-rose-700">
									-{formatCurrency(parseFloat(selectedClosingForPrint.totalUjoPaid))}
								</td>
							</tr>
							<tr class="border-b border-slate-200">
								<td class="p-2.5 font-medium text-slate-700 pl-6">• Realisasi Klaim Extra Cost Surat Jalan Balik (DN)</td>
								<td class="p-2.5 text-right font-mono text-rose-700">
									-{formatCurrency(parseFloat(selectedClosingForPrint.totalDnClaimPaid))}
								</td>
							</tr>
							<tr class="border-b border-slate-200">
								<td class="p-2.5 font-medium text-slate-700 pl-6">• Biaya Operasional Kasir Lainnya</td>
								<td class="p-2.5 text-right font-mono text-rose-700">
									-{formatCurrency(parseFloat(selectedClosingForPrint.totalOtherExpenses))}
								</td>
							</tr>
							{#if parseFloat(selectedClosingForPrint.totalRefundReceived) > 0}
								<tr class="border-b border-slate-200">
									<td class="p-2.5 font-medium text-slate-700 pl-6">• Penerimaan Pengembalian Sisa Kas / Titipan Supir</td>
									<td class="p-2.5 text-right font-mono text-emerald-700">
										+{formatCurrency(parseFloat(selectedClosingForPrint.totalRefundReceived))}
									</td>
								</tr>
							{/if}
							<tr class="border-b-2 border-slate-400 bg-rose-50/50 font-bold text-slate-900">
								<td class="p-2.5">TOTAL REALISASI PENGELUARAN KASIR 3 SHIFT</td>
								<td class="p-2.5 text-right font-mono text-rose-800">
									-{formatCurrency(parseFloat(selectedClosingForPrint.totalCashOut))}
								</td>
							</tr>
							<tr class="border-b border-slate-200 bg-slate-50 font-semibold text-slate-800">
								<td class="p-2.5">SALDO KAS SISTEM YANG SEHARUSNYA (EXPECTED CASH)</td>
								<td class="p-2.5 text-right font-mono font-bold text-slate-900">
									{formatCurrency(parseFloat(selectedClosingForPrint.expectedClosingCash))}
								</td>
							</tr>
							<tr class="border-b-2 border-slate-400 bg-slate-100 font-bold text-slate-900">
								<td class="p-2.5">SALDO FISIK AKTUAL HASIL SERAH TERIMA KASIR KE SHIFT 1</td>
								<td class="p-2.5 text-right font-mono text-slate-900">
									{formatCurrency(parseFloat(selectedClosingForPrint.actualClosingCash))}
								</td>
							</tr>
							<tr class="border-b border-slate-900 font-black {parseFloat(selectedClosingForPrint.cashDifference) === 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'}">
								<td class="p-3 text-sm">SELISIH KAS (FISIK vs SISTEM)</td>
								<td class="p-3 text-right font-mono text-sm">
									{parseFloat(selectedClosingForPrint.cashDifference) >= 0 ? '+' : ''}{formatCurrency(parseFloat(selectedClosingForPrint.cashDifference))}
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<!-- Section III: Catatan Investigasi -->
				<div class="mb-8 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
					<p class="font-bold text-slate-800 mb-1">Catatan & Kronologi Investigasi Selisih:</p>
					<p class="text-slate-700 italic">
						{selectedClosingForPrint.differenceReason || 'Nihil / Selisih Rp 0. Sisa fisik uang kasir cocok sempurna dengan perhitungan sistem.'}
					</p>
					{#if selectedClosingForPrint.notes}
						<p class="font-bold text-slate-800 mt-2 mb-0.5">Catatan Umum Keuangan:</p>
						<p class="text-slate-700">{selectedClosingForPrint.notes}</p>
					{/if}
				</div>

				<!-- Section IV: Kolom 5 Tanda Tangan Resmi -->
				<div class="mt-8 pt-4 border-t border-slate-300">
					<p class="text-center text-xs font-bold uppercase tracking-wider text-slate-700 mb-6">
						PENGESAHAN & PERTANGGUNGJAWABAN SERAH TERIMA FISIK KAS OPERASIONAL
					</p>
					<div class="grid grid-cols-5 gap-2 text-center text-[10px]">
						<!-- Kasir 1 -->
						<div class="border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between h-28">
							<p class="font-bold text-slate-700">Kasir Shift 1</p>
							<div class="border-b border-slate-300 w-3/4 mx-auto mb-1"></div>
							<p class="text-slate-500 font-medium">( .......................... )</p>
						</div>

						<!-- Kasir 2 -->
						<div class="border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between h-28">
							<p class="font-bold text-slate-700">Kasir Shift 2</p>
							<div class="border-b border-slate-300 w-3/4 mx-auto mb-1"></div>
							<p class="text-slate-500 font-medium">( .......................... )</p>
						</div>

						<!-- Kasir 3 -->
						<div class="border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between h-28">
							<p class="font-bold text-slate-700">Kasir Shift 3</p>
							<div class="border-b border-slate-300 w-3/4 mx-auto mb-1"></div>
							<p class="text-slate-500 font-medium">( .......................... )</p>
						</div>

						<!-- Keuangan -->
						<div class="border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between h-28 bg-slate-50">
							<p class="font-bold text-slate-800">Petugas Keuangan</p>
							<div class="border-b border-slate-400 w-3/4 mx-auto mb-1"></div>
							<p class="font-bold text-slate-800">{selectedClosingForPrint.closedBy || 'Keuangan'}</p>
						</div>

						<!-- Supervisor Keuangan -->
						<div class="border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between h-28 bg-slate-50">
							<p class="font-bold text-slate-800">Finance Supervisor</p>
							<div class="border-b border-slate-400 w-3/4 mx-auto mb-1"></div>
							<p class="text-slate-500 font-medium">( .......................... )</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@media print {
		:global(body) {
			background: white !important;
			color: black !important;
		}
		:global(header), 
		:global(aside), 
		:global(nav), 
		:global(footer), 
		:global(.no-print) {
			display: none !important;
		}
		.printable-document {
			position: absolute !important;
			left: 0 !important;
			top: 0 !important;
			width: 100% !important;
			margin: 0 !important;
			padding: 0 !important;
			box-shadow: none !important;
			border: none !important;
			background: white !important;
			color: black !important;
		}
	}
</style>

