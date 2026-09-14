<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let stats = $derived(data.stats);
	let fundRequests = $derived(data.fundRequests || []);
	let ledger = $derived(data.ledger || []);

	// Navigation Tabs
	let activeMainTab = $state<'REQUESTS' | 'LEDGER'>('REQUESTS');

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

	// Form Submission State
	let isSubmitting = $state(false);

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
				<div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
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
				class="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-surface text-on-surface hover:bg-surface-container text-xs font-bold transition-colors flex items-center gap-2 shadow-2xs"
				onclick={() => showDirectModal = true}
			>
				<span class="material-symbols-outlined text-base text-emerald-600">add_card</span>
				<span>Drop / Mutasi Kas Langsung</span>
			</button>
			<button 
				class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
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
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden">
			<div class="flex items-center justify-between mb-2">
				<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Saldo Kas Operasional</p>
				<span class="material-symbols-outlined text-2xl {stats.currentBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}">account_balance_wallet</span>
			</div>
			<h3 class="text-2xl font-black font-mono {stats.currentBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
				{formatCurrency(stats.currentBalance)}
			</h3>
			<p class="text-[11px] text-on-surface-variant mt-1.5 flex items-center gap-1 font-medium">
				<span class="material-symbols-outlined text-xs">info</span>
				<span>Float kasir untuk UJO & operasional</span>
			</p>
		</div>

		<!-- Total Masuk Bulan Ini -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between mb-2">
				<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Drop Dana (Bulan Ini)</p>
				<span class="material-symbols-outlined text-2xl text-emerald-500">trending_up</span>
			</div>
			<h3 class="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
				{formatCurrency(stats.monthIn)}
			</h3>
			<p class="text-[11px] text-on-surface-variant mt-1.5">
				Total keseluruhan: <span class="font-bold font-mono">{formatCurrency(stats.totalIn)}</span>
			</p>
		</div>

		<!-- Total Keluar Bulan Ini -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between mb-2">
				<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pengeluaran (Bulan Ini)</p>
				<span class="material-symbols-outlined text-2xl text-rose-500">trending_down</span>
			</div>
			<h3 class="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
				{formatCurrency(stats.monthOut)}
			</h3>
			<p class="text-[11px] text-on-surface-variant mt-1.5">
				Total keseluruhan: <span class="font-bold font-mono">{formatCurrency(stats.totalOut)}</span>
			</p>
		</div>

		<!-- Pengajuan Pending -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-amber-500/30 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-2">
					<p class="text-xs font-bold text-amber-600 uppercase tracking-wider">Pengajuan Menunggu</p>
					<span class="material-symbols-outlined text-2xl text-amber-500">hourglass_top</span>
				</div>
				<div class="flex items-baseline gap-2">
					<h3 class="text-2xl font-black font-mono text-amber-600">{stats.pendingCount}</h3>
					<span class="text-xs text-on-surface-variant font-medium">Tiket Diajukan</span>
				</div>
				<p class="text-xs font-bold font-mono text-amber-700 dark:text-amber-300 mt-1">
					{formatCurrency(stats.pendingTotal)}
				</p>
			</div>
			<button 
				class="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1 mt-2 text-left"
				onclick={() => { activeMainTab = 'REQUESTS'; requestFilterStatus = 'PENDING'; }}
			>
				<span>Tinjau Pengajuan</span>
				<span class="material-symbols-outlined text-sm">arrow_forward</span>
			</button>
		</div>
	</div>

	<!-- Main Tabs Nav -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800">
			<button 
				class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 {activeMainTab === 'REQUESTS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
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
				class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 {activeMainTab === 'LEDGER' ? 'bg-emerald-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
				onclick={() => activeMainTab = 'LEDGER'}
			>
				<span class="material-symbols-outlined text-base">menu_book</span>
				<span>Buku Kas & Mutasi Saldo</span>
			</button>
		</div>

		<!-- Secondary controls / filters -->
		{#if activeMainTab === 'REQUESTS'}
			<div class="inline-flex p-1 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs">
				<button 
					class="px-3 py-1 rounded-lg font-bold transition-colors {requestFilterStatus === 'ALL' ? 'bg-surface text-emerald-600 shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => requestFilterStatus = 'ALL'}
				>
					Semua ({fundRequests.length})
				</button>
				<button 
					class="px-3 py-1 rounded-lg font-bold transition-colors {requestFilterStatus === 'PENDING' ? 'bg-surface text-amber-600 shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => requestFilterStatus = 'PENDING'}
				>
					Menunggu ({fundRequests.filter((r: any) => r.status === 'PENDING').length})
				</button>
				<button 
					class="px-3 py-1 rounded-lg font-bold transition-colors {requestFilterStatus === 'RECEIVED' ? 'bg-surface text-emerald-600 shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => requestFilterStatus = 'RECEIVED'}
				>
					Diterima ({fundRequests.filter((r: any) => r.status === 'RECEIVED').length})
				</button>
			</div>
		{:else}
			<div class="flex items-center gap-3 w-full sm:w-auto">
				<div class="relative flex-1 sm:w-64">
					<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">search</span>
					<input 
						type="text" 
						placeholder="Cari mutasi / SO / Trip..." 
						bind:value={ledgerSearch}
						class="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-surface border border-slate-200/80 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-on-surface"
					/>
				</div>
				<div class="inline-flex p-1 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs">
					<button 
						class="px-3 py-1 rounded-lg font-bold transition-colors {ledgerFilterDirection === 'ALL' ? 'bg-surface text-on-surface shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
						onclick={() => ledgerFilterDirection = 'ALL'}
					>
						Semua
					</button>
					<button 
						class="px-3 py-1 rounded-lg font-bold transition-colors {ledgerFilterDirection === 'IN' ? 'bg-surface text-emerald-600 shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
						onclick={() => ledgerFilterDirection = 'IN'}
					>
						Masuk (IN)
					</button>
					<button 
						class="px-3 py-1 rounded-lg font-bold transition-colors {ledgerFilterDirection === 'OUT' ? 'bg-surface text-rose-600 shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
						onclick={() => ledgerFilterDirection = 'OUT'}
					>
						Keluar (OUT)
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Tab 1: Daftar Pengajuan Dana ke Finance -->
	{#if activeMainTab === 'REQUESTS'}
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20 text-[11px] font-black text-on-surface-variant uppercase tracking-wider">
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
					<tbody class="divide-y divide-slate-200/40 dark:divide-slate-800/40 text-xs font-medium">
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
							<tr class="hover:bg-surface-container transition-colors">
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
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
											<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
											MENUNGGU CAIR
										</span>
									{:else if req.status === 'RECEIVED'}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
											DITERIMA KASIR
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
											DIBATALKAN
										</span>
									{/if}
								</td>
								<td class="py-3.5 px-4 text-[11px] text-on-surface-variant max-w-[200px]">
									{#if req.status === 'RECEIVED'}
										<p class="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
											<span class="material-symbols-outlined text-xs">payments</span>
											<span>{req.paymentMethod}</span>
										</p>
										{#if req.referenceNo}
											<p class="font-mono text-[10px] text-on-surface">Ref: {req.referenceNo}</p>
										{/if}
										<p class="text-[10px] text-on-surface-variant/70">{formatDateTime(req.receivedAt)}</p>
									{:else if req.status === 'PENDING'}
										<span class="text-amber-600 font-medium">Menunggu transfer Finance...</span>
									{:else}
										<span>-</span>
									{/if}
								</td>
								<td class="py-3.5 px-4 text-right whitespace-nowrap">
									{#if req.status === 'PENDING'}
										<div class="flex items-center justify-end gap-1.5">
											<button 
												type="button"
												class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1"
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
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden">
			<div class="px-5 py-3 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600 text-lg">menu_book</span>
					<span class="text-xs font-bold text-on-surface">Buku Kas Operasional (Real-time Mutasi)</span>
				</div>
				<span class="text-[11px] text-on-surface-variant font-medium">
					Menampilkan {filteredLedger.length} transaksi terakhir
				</span>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20 text-[11px] font-black text-on-surface-variant uppercase tracking-wider">
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
					<tbody class="divide-y divide-slate-200/40 dark:divide-slate-800/40 text-xs font-medium">
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
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-3 px-4 text-on-surface-variant whitespace-nowrap font-mono text-[11px]">
									{formatDateTime(row.transactionDate)}
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									{#if row.direction === 'IN'}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
											<span class="material-symbols-outlined text-xs">arrow_downward</span>
											MASUK
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
											<span class="material-symbols-outlined text-xs">arrow_upward</span>
											KELUAR
										</span>
									{/if}
								</td>
								<td class="py-3 px-4 whitespace-nowrap">
									<span class="text-[11px] font-bold px-2 py-0.5 rounded bg-surface-container-high border border-slate-200/60 dark:border-slate-800 text-on-surface">
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
								<td class="py-3 px-4 text-right font-mono font-black text-on-surface whitespace-nowrap bg-slate-50/50 dark:bg-slate-900/30">
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
</div>

<!-- MODAL 1: Buat Pengajuan Dana ke Finance -->
{#if showRequestModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
		<div class="w-full max-w-lg rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-500/5">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600">post_add</span>
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
						class="w-full px-3.5 py-2.5 rounded-xl text-sm bg-surface-container-low border border-slate-300 dark:border-slate-700 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
						class="w-full px-3.5 py-2.5 rounded-xl text-base font-mono font-bold bg-surface-container-low border border-slate-300 dark:border-slate-700 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
						class="w-full px-3.5 py-2.5 rounded-xl text-sm bg-surface-container-low border border-slate-300 dark:border-slate-700 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
						class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-container-low border border-slate-300 dark:border-slate-700 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
						class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
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
					<span class="material-symbols-outlined text-emerald-600">check_circle</span>
					<div>
						<h3 class="text-base font-black text-on-surface">Konfirmasi Penerimaan Dana</h3>
						<p class="text-[11px] font-mono text-emerald-600 font-bold">{selectedRequestToConfirm.requestNumber}</p>
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
						class="w-full px-3.5 py-2.5 rounded-xl text-base font-mono font-bold bg-surface-container-low border border-slate-300 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
							class="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-surface-container-low border border-slate-300 dark:border-slate-700 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
							class="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-surface-container-low border border-slate-300 dark:border-slate-700 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
						class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-container-low border border-slate-300 dark:border-slate-700 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
						class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
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
					<span class="material-symbols-outlined text-emerald-600">add_card</span>
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
						class="w-full px-3.5 py-2.5 rounded-xl text-base font-mono font-bold bg-surface-container-low border border-slate-300 dark:border-slate-700 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
							class="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-surface-container-low border border-slate-300 dark:border-slate-700 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
							class="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-surface-container-low border border-slate-300 dark:border-slate-700 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
						class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-container-low border border-slate-300 dark:border-slate-700 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
						class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
					>
						<span class="material-symbols-outlined text-sm">{isSubmitting ? 'sync' : 'add'}</span>
						<span>{isSubmitting ? 'Menyimpan...' : 'Simpan Kas Masuk'}</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
