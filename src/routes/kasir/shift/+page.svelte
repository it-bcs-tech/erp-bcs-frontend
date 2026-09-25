<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let activeShift = $derived(data.activeShift);
	let lastClosedShift = $derived(data.lastClosedShift);
	let employees = $derived(data.employees || []);
	let shiftUjoList = $derived(data.shiftUjoList || []);
	let shiftDnList = $derived(data.shiftDnList || []);
	let shiftLedgerList = $derived(data.shiftLedgerList || []);
	let shiftHistory = $derived(data.shiftHistory || []);

	// Active tab inside current shift
	let activeTab = $state<'ujo' | 'dn' | 'ledger'>('ujo');

	// Modals
	let showOpenModal = $state(false);
	let showCloseModal = $state(false);
	let selectedShiftForReceipt = $state<any>(null);
	let isSubmitting = $state(false);

	// Open Shift Form states
	const getCurrentShiftRecommendation = () => {
		const hour = new Date().getHours();
		if (hour >= 7 && hour < 15) return 'Shift 1';
		if (hour >= 15 && hour < 23) return 'Shift 2';
		return 'Shift 3';
	};

	let inputShiftName = $state(getCurrentShiftRecommendation());
	let inputCashierName = $state(data.user?.name || '');
	let inputOpeningCash = $state<number>(
		lastClosedShift ? parseFloat(lastClosedShift.actualClosingCash) || 0 : 0
	);

	// Close Shift Form states
	let inputActualCash = $state<number>(0);
	let inputHandoverTo = $state('');
	let inputClosingNotes = $state('');

	$effect(() => {
		if (activeShift) {
			inputActualCash = activeShift.expectedClosingCash || 0;
		}
	});

	$effect(() => {
		if (form?.success) {
			showOpenModal = false;
			showCloseModal = false;
			isSubmitting = false;
		}
		if (form?.error) {
			isSubmitting = false;
			alert(form.error);
		}
	});

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

	const formatDateTime = (isoString?: string) => {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	// Selisih kalkulasi
	let cashDifference = $derived(
		(inputActualCash || 0) - ((activeShift?.expectedClosingCash) || 0)
	);
</script>

<svelte:head>
	<title>Manajemen Shift & Handover | Kasir BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
				<span class="material-symbols-outlined text-2xl">schedule</span>
			</div>
			<div>
				<h1 class="text-xl font-bold text-on-surface tracking-tight">Manajemen Shift & Serah Terima Kasir</h1>
				<p class="text-xs text-on-surface-variant font-medium mt-0.5">
					Pencatatan sesi kasir 3 shift, kontrol pencairan UJO & penerimaan fisik Surat Jalan (DN), serta rekonsiliasi kas handover
				</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			{#if activeShift}
				<button
					type="button"
					onclick={() => showCloseModal = true}
					class="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">lock_clock</span>
					<span>Tutup Shift ({activeShift.shiftName})</span>
				</button>
			{:else}
				<button
					type="button"
					onclick={() => showOpenModal = true}
					class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">add_circle</span>
					<span>Buka Shift Baru</span>
				</button>
			{/if}
		</div>
	</header>

	<!-- Live Shift Status Card (Bento Container) -->
	{#if activeShift}
		<div class="rounded-2xl bg-surface-container-lowest border border-emerald-500/30 p-6 shadow-xs relative overflow-hidden">
			<!-- Top Accent Glow -->
			<div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>

			<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800/80">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
						<span class="material-symbols-outlined text-2xl animate-spin" style="animation-duration: 12s;">autorenew</span>
					</div>
					<div>
						<div class="flex items-center gap-2.5 flex-wrap">
							<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white">
								<span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
								<span>{activeShift.shiftName} SEDANG BERJALAN</span>
							</span>
							<span class="font-mono text-xs font-bold text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-slate-800/70">
								{activeShift.sessionNumber}
							</span>
						</div>
						<div class="mt-2 flex items-center gap-4 text-xs text-on-surface-variant flex-wrap">
							<span>Kasir Bertugas: <strong class="text-on-surface font-bold">{activeShift.cashierName}</strong></span>
							<span>•</span>
							<span>Dibuka: <strong class="text-on-surface">{formatDateTime(activeShift.openedAt)}</strong></span>
						</div>
					</div>
				</div>

				<div class="flex items-center gap-3">
					<button
						type="button"
						onclick={() => showCloseModal = true}
						class="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
					>
						<span class="material-symbols-outlined text-[17px]">assignment_turned_in</span>
						<span>Closing Shift & Handover</span>
					</button>
				</div>
			</div>

			<!-- 4 KPI Metrics during this active shift -->
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
				<!-- KPI 1: Saldo Modal Awal -->
				<div class="p-4 rounded-xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70">
					<div class="flex items-center justify-between text-xs text-on-surface-variant font-medium mb-1">
						<span>Modal Kas Awal</span>
						<span class="material-symbols-outlined text-sm text-emerald-600">account_balance_wallet</span>
					</div>
					<div class="text-base font-bold font-mono text-on-surface">
						{formatCurrency(activeShift.openingCash)}
					</div>
					<p class="text-[10px] text-on-surface-variant mt-1">Saldo pembukaan sesi shift</p>
				</div>

				<!-- KPI 2: UJO Keluar -->
				<div class="p-4 rounded-xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70">
					<div class="flex items-center justify-between text-xs text-on-surface-variant font-medium mb-1">
						<span>Total UJO Cair ({activeShift.totalUjoCount} Trip)</span>
						<span class="material-symbols-outlined text-sm text-amber-600">local_shipping</span>
					</div>
					<div class="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
						{formatCurrency(activeShift.totalUjoAmount)}
					</div>
					<p class="text-[10px] text-on-surface-variant mt-1">{activeShift.totalUjoCount} order supir dicairkan</p>
				</div>

				<!-- KPI 3: Fisik DN / SJB Diterima -->
				<div class="p-4 rounded-xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70">
					<div class="flex items-center justify-between text-xs text-on-surface-variant font-medium mb-1">
						<span>Surat Jalan Fisik (DN)</span>
						<span class="material-symbols-outlined text-sm text-cyan-600">description</span>
					</div>
					<div class="text-base font-bold font-mono text-on-surface">
						{activeShift.totalDnCount} <span class="text-xs font-normal text-on-surface-variant">Berkas</span>
					</div>
					<p class="text-[10px] text-on-surface-variant mt-1">SJB customer telah diverifikasi</p>
				</div>

				<!-- KPI 4: Estimasi Saldo Kasir Saat Ini -->
				<div class="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20">
					<div class="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold mb-1">
						<span>Saldo Sistem Saat Ini</span>
						<span class="material-symbols-outlined text-sm text-emerald-600">payments</span>
					</div>
					<div class="text-base font-black font-mono text-emerald-700 dark:text-emerald-400">
						{formatCurrency(activeShift.expectedClosingCash)}
					</div>
					<p class="text-[10px] text-emerald-800/70 dark:text-emerald-400/70 mt-1">
						Modal Awal + Masuk ({formatCurrency(activeShift.totalCashIn)}) - Keluar ({formatCurrency(activeShift.totalCashOut)})
					</p>
				</div>
			</div>
		</div>

		<!-- Detail Transaksi Sesi Aktif -->
		<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-xs overflow-hidden">
			<!-- Tabs Header -->
			<div class="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div class="inline-flex p-1 rounded-xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70">
					<button
						type="button"
						onclick={() => activeTab = 'ujo'}
						class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 {activeTab === 'ujo' ? 'bg-surface-container-lowest text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
					>
						<span class="material-symbols-outlined text-[15px]">local_shipping</span>
						<span>UJO Cair</span>
						<span class="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] rounded-full font-mono">
							{shiftUjoList.length}
						</span>
					</button>

					<button
						type="button"
						onclick={() => activeTab = 'dn'}
						class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 {activeTab === 'dn' ? 'bg-surface-container-lowest text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
					>
						<span class="material-symbols-outlined text-[15px]">description</span>
						<span>Surat Jalan Balik (DN)</span>
						<span class="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] rounded-full font-mono">
							{shiftDnList.length}
						</span>
					</button>

					<button
						type="button"
						onclick={() => activeTab = 'ledger'}
						class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 {activeTab === 'ledger' ? 'bg-surface-container-lowest text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
					>
						<span class="material-symbols-outlined text-[15px]">receipt_long</span>
						<span>Mutasi Kasir</span>
						<span class="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] rounded-full font-mono">
							{shiftLedgerList.length}
						</span>
					</button>
				</div>

				<div class="text-xs text-on-surface-variant font-medium">
					Sesi Aktif: <strong class="text-on-surface font-mono">{activeShift.sessionNumber}</strong>
				</div>
			</div>

			<!-- Tab 1: UJO List -->
			{#if activeTab === 'ujo'}
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="bg-surface-container-low/50 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80">
							<tr>
								<th class="py-3 px-5">Waktu Cair</th>
								<th class="py-3 px-4">No. Order / DO</th>
								<th class="py-3 px-4">Supir & Armada</th>
								<th class="py-3 px-4">Rute Pengiriman</th>
								<th class="py-3 px-5 text-right">Nominal UJO</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
							{#if shiftUjoList.length === 0}
								<tr>
									<td colspan="5" class="py-10 text-center text-xs text-on-surface-variant">
										Belum ada pencairan UJO pada shift ini.
									</td>
								</tr>
							{/if}
							{#each shiftUjoList as ujo}
								<tr class="hover:bg-surface-container-low/40 transition-colors">
									<td class="py-3.5 px-5 font-mono text-[11px] text-on-surface-variant">
										{formatDateTime(ujo.disbursedAt)}
									</td>
									<td class="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
										{ujo.soId}
									</td>
									<td class="py-3.5 px-4">
										<p class="font-bold text-on-surface">{ujo.driver}</p>
										<p class="text-[10px] text-on-surface-variant font-mono">{ujo.unit}</p>
									</td>
									<td class="py-3.5 px-4 text-on-surface-variant">
										{ujo.origin || '-'} → {ujo.destination || '-'}
									</td>
									<td class="py-3.5 px-5 text-right font-mono font-bold text-on-surface">
										{formatCurrency(parseFloat(ujo.amount) || 0)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else if activeTab === 'dn'}
				<!-- Tab 2: DN List -->
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="bg-surface-container-low/50 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80">
							<tr>
								<th class="py-3 px-5">Waktu Terima</th>
								<th class="py-3 px-4">No. Surat Jalan Customer</th>
								<th class="py-3 px-4">Customer & Armada</th>
								<th class="py-3 px-4 text-right">Tonase Riil</th>
								<th class="py-3 px-5 text-center">Status Berkas</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
							{#if shiftDnList.length === 0}
								<tr>
									<td colspan="5" class="py-10 text-center text-xs text-on-surface-variant">
										Belum ada penerimaan fisik Surat Jalan pada shift ini.
									</td>
								</tr>
							{/if}
							{#each shiftDnList as dn}
								<tr class="hover:bg-surface-container-low/40 transition-colors">
									<td class="py-3.5 px-5 font-mono text-[11px] text-on-surface-variant">
										{formatDateTime(dn.receivedAt)}
									</td>
									<td class="py-3.5 px-4 font-mono font-bold text-on-surface">
										{dn.noSuratJalan}
										<p class="text-[10px] text-on-surface-variant font-normal font-sans">Tugas: {dn.noSuratTugas || '-'}</p>
									</td>
									<td class="py-3.5 px-4">
										<p class="font-bold text-on-surface">{dn.customer || '-'}</p>
										<p class="text-[10px] text-on-surface-variant font-mono">{dn.unit} • {dn.driver}</p>
									</td>
									<td class="py-3.5 px-4 text-right font-mono font-bold text-on-surface">
										{dn.totalBerat ? `${dn.totalBerat} Kg` : '-'}
									</td>
									<td class="py-3.5 px-5 text-center">
										<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-md">
											<span class="material-symbols-outlined text-[12px]">verified</span>
											<span>Diverifikasi</span>
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<!-- Tab 3: Ledger Mutasi -->
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="bg-surface-container-low/50 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80">
							<tr>
								<th class="py-3 px-5">Waktu</th>
								<th class="py-3 px-4">Arah / Kategori</th>
								<th class="py-3 px-4">Keterangan</th>
								<th class="py-3 px-4">Petugas</th>
								<th class="py-3 px-5 text-right">Nominal</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
							{#if shiftLedgerList.length === 0}
								<tr>
									<td colspan="5" class="py-10 text-center text-xs text-on-surface-variant">
										Belum ada transaksi mutasi kasir pada shift ini.
									</td>
								</tr>
							{/if}
							{#each shiftLedgerList as item}
								<tr class="hover:bg-surface-container-low/40 transition-colors">
									<td class="py-3.5 px-5 font-mono text-[11px] text-on-surface-variant">
										{formatDateTime(item.createdAt)}
									</td>
									<td class="py-3.5 px-4">
										{#if item.direction === 'IN'}
											<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-md">
												<span class="material-symbols-outlined text-[12px]">arrow_downward</span>
												<span>MASUK: {item.category}</span>
											</span>
										{:else}
											<span class="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 px-2 py-0.5 rounded-md">
												<span class="material-symbols-outlined text-[12px]">arrow_upward</span>
												<span>KELUAR: {item.category}</span>
											</span>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-on-surface max-w-xs truncate">
										{item.description || '-'}
									</td>
									<td class="py-3.5 px-4 text-on-surface-variant">
										{item.performedBy || '-'}
									</td>
									<td class="py-3.5 px-5 text-right font-mono font-bold {item.direction === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
										{item.direction === 'IN' ? '+' : '-'} {formatCurrency(parseFloat(item.amount) || 0)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{:else}
		<!-- No Active Shift Banner -->
		<div class="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-8 text-center space-y-4">
			<div class="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
				<span class="material-symbols-outlined text-3xl">lock_open</span>
			</div>
			<div class="max-w-md mx-auto">
				<h3 class="text-base font-bold text-on-surface">Tidak Ada Shift Kasir yang Sedang Aktif</h3>
				<p class="text-xs text-on-surface-variant mt-1">
					Untuk menjaga akuntabilitas serah terima uang tunai dan berkas Surat Jalan, kasir wajib membuka shift terlebih dahulu sebelum memproses transaksi operasional.
				</p>
			</div>

			{#if lastClosedShift}
				<div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 text-xs font-mono">
					<span class="text-on-surface-variant">Shift Terakhir Ditutup:</span>
					<strong class="text-on-surface">{lastClosedShift.shiftName} ({lastClosedShift.cashierName})</strong>
					<span>•</span>
					<span class="text-emerald-600 dark:text-emerald-400 font-bold">Saldo Akhir: {formatCurrency(parseFloat(lastClosedShift.actualClosingCash) || 0)}</span>
				</div>
			{/if}

			<div>
				<button
					type="button"
					onclick={() => showOpenModal = true}
					class="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors inline-flex items-center gap-2 cursor-pointer"
				>
					<span class="material-symbols-outlined text-lg">add_circle</span>
					<span>Buka Shift Sekarang ({getCurrentShiftRecommendation()})</span>
				</button>
			</div>
		</div>
	{/if}

	<!-- Shift History Section (Riwayat Closing Shift) -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-base font-bold text-on-surface">Riwayat Closing Shift Kasir</h2>
				<p class="text-xs text-on-surface-variant mt-0.5">Arsip serah terima fisik uang kas dan berkas Surat Jalan antarsesi</p>
			</div>
		</div>

		<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-xs overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs min-w-[900px]">
					<thead class="bg-surface-container-low/50 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80">
						<tr>
							<th class="py-3 px-5">Sesi & Shift</th>
							<th class="py-3 px-4">Kasir & Handover</th>
							<th class="py-3 px-4">Jam Kerja</th>
							<th class="py-3 px-4 text-center">Rekap UJO & DN</th>
							<th class="py-3 px-4 text-right">Saldo Kas Akhir</th>
							<th class="py-3 px-4 text-right">Selisih Kas</th>
							<th class="py-3 px-5 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
						{#if shiftHistory.length === 0}
							<tr>
								<td colspan="7" class="py-12 text-center text-xs text-on-surface-variant">
									Belum ada riwayat shift yang ditutup.
								</td>
							</tr>
						{/if}
						{#each shiftHistory as hist}
							{@const diff = parseFloat(hist.cashDifference) || 0}
							<tr class="hover:bg-surface-container-low/40 transition-colors">
								<td class="py-3.5 px-5">
									<p class="font-mono font-bold text-emerald-600 dark:text-emerald-400">{hist.sessionNumber}</p>
									<span class="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-surface-container-low text-[10px] font-bold text-on-surface border border-slate-200/70 dark:border-slate-800/70">
										{hist.shiftName}
									</span>
								</td>
								<td class="py-3.5 px-4">
									<p class="font-bold text-on-surface">Oleh: {hist.cashierName}</p>
									<p class="text-[10px] text-on-surface-variant mt-0.5">
										Serah terima ke: <strong class="text-on-surface">{hist.handoverTo || '-'}</strong>
									</p>
								</td>
								<td class="py-3.5 px-4 text-[11px] text-on-surface-variant">
									<p>Buka: {formatDateTime(hist.openedAt)}</p>
									<p>Tutup: {formatDateTime(hist.closedAt)}</p>
								</td>
								<td class="py-3.5 px-4 text-center">
									<div class="flex items-center justify-center gap-2">
										<span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-[10px]" title="Total UJO Disbursed">
											{hist.totalUjoCount} UJO ({formatCurrency(parseFloat(hist.totalUjoAmount) || 0)})
										</span>
										<span class="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300 font-bold text-[10px]" title="Total DN Received">
											{hist.totalDnCount} DN
										</span>
									</div>
								</td>
								<td class="py-3.5 px-4 text-right">
									<p class="font-mono font-bold text-on-surface text-xs">
										{formatCurrency(parseFloat(hist.actualClosingCash) || 0)}
									</p>
									<p class="text-[10px] text-on-surface-variant font-mono">
										Sistem: {formatCurrency(parseFloat(hist.expectedClosingCash) || 0)}
									</p>
								</td>
								<td class="py-3.5 px-4 text-right">
									{#if diff === 0}
										<span class="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-xs">
											Cocok (Rp 0)
										</span>
									{:else if diff < 0}
										<span class="text-rose-600 dark:text-rose-400 font-bold font-mono text-xs">
											Kurang ({formatCurrency(Math.abs(diff))})
										</span>
									{:else}
										<span class="text-blue-600 dark:text-blue-400 font-bold font-mono text-xs">
											Lebih (+{formatCurrency(diff)})
										</span>
									{/if}
								</td>
								<td class="py-3.5 px-5 text-right">
									<button
										type="button"
										onclick={() => selectedShiftForReceipt = hist}
										class="px-3 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold rounded-xl border border-slate-200/70 dark:border-slate-800/70 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
										title="Lihat & Cetak Berita Acara Handover"
									>
										<span class="material-symbols-outlined text-[15px]">receipt_long</span>
										<span>Berita Acara</span>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>

<!-- Modal: Buka Shift Baru (Open Shift) -->
{#if showOpenModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onclick={() => showOpenModal = false}></div>
		<div class="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
			<!-- Header -->
			<div class="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-emerald-500/5">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
							<span class="material-symbols-outlined text-2xl">add_circle</span>
						</div>
						<div>
							<h3 class="text-base font-bold text-on-surface">Buka Shift Kasir Baru</h3>
							<p class="text-xs text-on-surface-variant mt-0.5">Mulai sesi kerja kasir operasional</p>
						</div>
					</div>
					<button type="button" onclick={() => showOpenModal = false} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>

			<!-- Form -->
			<form method="POST" action="?/openShift" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; }; }}>
				<div class="p-6 space-y-4">
					<!-- Pilihan Shift -->
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="shift_select">
							Pilihan Shift <span class="text-rose-500">*</span>
						</label>
						<select
							id="shift_select"
							name="shiftName"
							bind:value={inputShiftName}
							class="w-full bg-surface-container-low border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-emerald-500/30"
							required
						>
							<option value="Shift 1">Shift 1 (07:00 - 15:00 WIB)</option>
							<option value="Shift 2">Shift 2 (15:00 - 23:00 WIB)</option>
							<option value="Shift 3">Shift 3 (23:00 - 07:00 WIB)</option>
						</select>
						<p class="text-[10px] text-on-surface-variant mt-1">Rekomendasi saat ini: <strong>{getCurrentShiftRecommendation()}</strong></p>
					</div>

					<!-- Kasir Bertugas -->
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="cashier_name">
							Nama Kasir Bertugas <span class="text-rose-500">*</span>
						</label>
						<input
							id="cashier_name"
							type="text"
							name="cashierName"
							bind:value={inputCashierName}
							placeholder="Nama Kasir"
							class="w-full bg-surface-container-low border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-emerald-500/30"
							required
						/>
					</div>

					<!-- Saldo Modal Awal -->
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="opening_cash">
							Modal Kas Awal di Laci (Rp) <span class="text-rose-500">*</span>
						</label>
						<div class="relative">
							<span class="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">Rp</span>
							<input
								id="opening_cash"
								type="number"
								name="openingCash"
								bind:value={inputOpeningCash}
								min="0"
								step="1000"
								class="w-full bg-surface-container-low border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono font-bold text-on-surface outline-none focus:ring-2 focus:ring-emerald-500/30"
								required
							/>
						</div>
						{#if lastClosedShift}
							<p class="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
								✓ Otomatis terisi dari saldo akhir shift sebelumnya ({formatCurrency(parseFloat(lastClosedShift.actualClosingCash) || 0)})
							</p>
						{/if}
					</div>
				</div>

				<div class="p-6 border-t border-slate-100 dark:border-slate-800/80 bg-surface-container-low/40 flex justify-end gap-3">
					<button type="button" onclick={() => showOpenModal = false} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
						Batal
					</button>
					<button type="submit" disabled={isSubmitting || !inputCashierName.trim()} class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer">
						{#if isSubmitting}
							<span class="material-symbols-outlined text-[18px] animate-spin">sync</span>
							<span>Membuka...</span>
						{:else}
							<span class="material-symbols-outlined text-[18px]">verified</span>
							<span>Buka Shift</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Tutup Shift & Handover (Close Shift) -->
{#if showCloseModal && activeShift}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onclick={() => showCloseModal = false}></div>
		<div class="relative w-full max-w-lg bg-surface-container-lowest rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
			<!-- Header -->
			<div class="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-rose-500/5">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
							<span class="material-symbols-outlined text-2xl">lock_clock</span>
						</div>
						<div>
							<h3 class="text-base font-bold text-on-surface">Closing {activeShift.shiftName} & Serah Terima</h3>
							<p class="text-xs text-on-surface-variant font-mono mt-0.5">{activeShift.sessionNumber} • {activeShift.cashierName}</p>
						</div>
					</div>
					<button type="button" onclick={() => showCloseModal = false} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>

			<!-- Form -->
			<form method="POST" action="?/closeShift" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; }; }}>
				<input type="hidden" name="shiftId" value={activeShift.id}>

				<div class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
					<!-- Ringkasan Shift -->
					<div class="p-4 rounded-xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70 space-y-2 text-xs">
						<div class="flex justify-between items-center text-on-surface-variant">
							<span>Modal Kas Awal:</span>
							<span class="font-mono font-bold text-on-surface">{formatCurrency(activeShift.openingCash)}</span>
						</div>
						<div class="flex justify-between items-center text-on-surface-variant">
							<span>Total Kasir Masuk (+):</span>
							<span class="font-mono font-bold text-emerald-600">+{formatCurrency(activeShift.totalCashIn)}</span>
						</div>
						<div class="flex justify-between items-center text-on-surface-variant">
							<span>Total Kasir Keluar (-):</span>
							<span class="font-mono font-bold text-rose-600">-{formatCurrency(activeShift.totalCashOut)}</span>
						</div>
						<div class="flex justify-between items-center text-on-surface-variant">
							<span>Total UJO Cair:</span>
							<span class="font-mono font-bold text-on-surface">{activeShift.totalUjoCount} Trip ({formatCurrency(activeShift.totalUjoAmount)})</span>
						</div>
						<div class="flex justify-between items-center text-on-surface-variant">
							<span>Surat Jalan Fisik (DN) Masuk:</span>
							<span class="font-mono font-bold text-on-surface">{activeShift.totalDnCount} Berkas</span>
						</div>
						<div class="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex justify-between items-center">
							<span class="font-bold text-on-surface">Saldo Kas Sistem (Expected):</span>
							<span class="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">{formatCurrency(activeShift.expectedClosingCash)}</span>
						</div>
					</div>

					<!-- Input Fisik Kasir -->
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="actual_cash">
							Hasil Hitung Uang Kas Fisik di Laci (Rp) <span class="text-rose-500">*</span>
						</label>
						<div class="relative">
							<span class="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">Rp</span>
							<input
								id="actual_cash"
								type="number"
								name="actualClosingCash"
								bind:value={inputActualCash}
								min="0"
								step="1000"
								class="w-full bg-surface-container-low border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono font-bold text-on-surface outline-none focus:ring-2 focus:ring-rose-500/30"
								required
							/>
						</div>

						<!-- Status Varian Selisih -->
						<div class="mt-2 p-2.5 rounded-lg text-xs flex items-center justify-between font-mono {cashDifference === 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : cashDifference < 0 ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold' : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold'}">
							<span class="font-sans font-medium">Selisih Kas:</span>
							<span>
								{#if cashDifference === 0}
									✓ Cocok (Rp 0)
								{:else if cashDifference < 0}
									Defisit / Kurang: -{formatCurrency(Math.abs(cashDifference))}
								{:else}
									Surplus / Lebih: +{formatCurrency(cashDifference)}
								{/if}
							</span>
						</div>
					</div>

					<!-- Serah Terima Kepada -->
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="handover_to">
							Diserahterimakan Kepada (Kasir Pengganti) <span class="text-rose-500">*</span>
						</label>
						<input
							id="handover_to"
							type="text"
							name="handoverTo"
							bind:value={inputHandoverTo}
							placeholder="Nama Kasir Shift Berikutnya"
							class="w-full bg-surface-container-low border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-rose-500/30"
							required
						/>
					</div>

					<!-- Catatan Closing -->
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="closing_notes">
							Catatan Handover / Keterangan Berkas / Selisih Kas
						</label>
						<textarea
							id="closing_notes"
							name="closingNotes"
							bind:value={inputClosingNotes}
							rows="2"
							placeholder="Contoh: Berkas 5 SJB lengkap diserahkan ke lemari pos. Kas fisik cocok."
							class="w-full bg-surface-container-low border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs text-on-surface outline-none focus:ring-2 focus:ring-rose-500/30"
						></textarea>
					</div>
				</div>

				<div class="p-6 border-t border-slate-100 dark:border-slate-800/80 bg-surface-container-low/40 flex justify-end gap-3">
					<button type="button" onclick={() => showCloseModal = false} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
						Batal
					</button>
					<button type="submit" disabled={isSubmitting || !inputHandoverTo.trim()} class="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer">
						{#if isSubmitting}
							<span class="material-symbols-outlined text-[18px] animate-spin">sync</span>
							<span>Memproses...</span>
						{:else}
							<span class="material-symbols-outlined text-[18px]">lock</span>
							<span>Tutup Shift & Terbitkan Berita Acara</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal / View: Berita Acara Serah Terima Shift -->
{#if selectedShiftForReceipt}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<div>
					<h3 class="text-base font-bold text-on-surface">Berita Acara Serah Terima Kasir</h3>
					<p class="text-xs font-mono text-on-surface-variant">{selectedShiftForReceipt.sessionNumber}</p>
				</div>
				<button onclick={() => selectedShiftForReceipt = null} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 space-y-4 overflow-y-auto text-xs" id="printable-receipt">
				<!-- Header Struk -->
				<div class="text-center pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
					<h4 class="font-bold text-sm text-on-surface">PT BUMI CITRA SURYA (BCS)</h4>
					<p class="text-[10px] text-on-surface-variant">Laporan Serah Terima Kasir & Closing Shift Operasional</p>
					<p class="font-mono text-[10px] text-on-surface mt-1">No: {selectedShiftForReceipt.sessionNumber}</p>
				</div>

				<!-- Info Shift -->
				<div class="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
					<div>
						<p class="text-on-surface-variant">Shift:</p>
						<p class="font-bold text-on-surface">{selectedShiftForReceipt.shiftName}</p>
					</div>
					<div>
						<p class="text-on-surface-variant">Tanggal:</p>
						<p class="font-bold text-on-surface">{selectedShiftForReceipt.shiftDate}</p>
					</div>
					<div>
						<p class="text-on-surface-variant">Kasir Penyerah:</p>
						<p class="font-bold text-on-surface">{selectedShiftForReceipt.cashierName}</p>
					</div>
					<div>
						<p class="text-on-surface-variant">Kasir Penerima:</p>
						<p class="font-bold text-on-surface">{selectedShiftForReceipt.handoverTo || '-'}</p>
					</div>
					<div>
						<p class="text-on-surface-variant">Jam Buka:</p>
						<p class="font-mono text-on-surface">{formatDateTime(selectedShiftForReceipt.openedAt)}</p>
					</div>
					<div>
						<p class="text-on-surface-variant">Jam Tutup:</p>
						<p class="font-mono text-on-surface">{formatDateTime(selectedShiftForReceipt.closedAt)}</p>
					</div>
				</div>

				<!-- Rekonsiliasi Kas -->
				<div class="space-y-1.5 pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
					<div class="flex justify-between">
						<span class="text-on-surface-variant">Modal Awal:</span>
						<span class="font-mono font-bold">{formatCurrency(parseFloat(selectedShiftForReceipt.openingCash) || 0)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-on-surface-variant">Total Uang Masuk (+):</span>
						<span class="font-mono font-bold text-emerald-600">+{formatCurrency(parseFloat(selectedShiftForReceipt.totalCashIn) || 0)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-on-surface-variant">Total Uang Keluar (-):</span>
						<span class="font-mono font-bold text-rose-600">-{formatCurrency(parseFloat(selectedShiftForReceipt.totalCashOut) || 0)}</span>
					</div>
					<div class="flex justify-between font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
						<span>Saldo Sistem:</span>
						<span class="font-mono">{formatCurrency(parseFloat(selectedShiftForReceipt.expectedClosingCash) || 0)}</span>
					</div>
					<div class="flex justify-between font-bold text-emerald-700 dark:text-emerald-400">
						<span>Fisik Kas Dihitung:</span>
						<span class="font-mono">{formatCurrency(parseFloat(selectedShiftForReceipt.actualClosingCash) || 0)}</span>
					</div>
					<div class="flex justify-between font-bold {parseFloat(selectedShiftForReceipt.cashDifference) === 0 ? 'text-emerald-600' : 'text-rose-600'}">
						<span>Selisih:</span>
						<span class="font-mono">
							{parseFloat(selectedShiftForReceipt.cashDifference) === 0 ? 'Rp 0 (Cocok)' : formatCurrency(parseFloat(selectedShiftForReceipt.cashDifference))}
						</span>
					</div>
				</div>

				<!-- Rekap Fisik Berkas -->
				<div class="space-y-1.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
					<div class="flex justify-between">
						<span class="text-on-surface-variant">Pencairan UJO:</span>
						<span class="font-mono font-bold">{selectedShiftForReceipt.totalUjoCount} Trip ({formatCurrency(parseFloat(selectedShiftForReceipt.totalUjoAmount) || 0)})</span>
					</div>
					<div class="flex justify-between">
						<span class="text-on-surface-variant">Fisik Surat Jalan Diterima:</span>
						<span class="font-mono font-bold">{selectedShiftForReceipt.totalDnCount} Berkas</span>
					</div>
				</div>

				{#if selectedShiftForReceipt.closingNotes}
					<div class="p-2.5 rounded-lg bg-surface-container-low text-[11px]">
						<span class="font-bold text-on-surface-variant">Catatan:</span>
						<p class="text-on-surface mt-0.5">{selectedShiftForReceipt.closingNotes}</p>
					</div>
				{/if}

				<!-- Tanda Tangan -->
				<div class="grid grid-cols-2 gap-4 text-center pt-4">
					<div>
						<p class="text-on-surface-variant text-[10px]">Yang Menyerahkan,</p>
						<div class="h-12"></div>
						<p class="font-bold text-on-surface border-t border-slate-300 dark:border-slate-700 pt-1">
							{selectedShiftForReceipt.cashierName}
						</p>
					</div>
					<div>
						<p class="text-on-surface-variant text-[10px]">Yang Menerima,</p>
						<div class="h-12"></div>
						<p class="font-bold text-on-surface border-t border-slate-300 dark:border-slate-700 pt-1">
							{selectedShiftForReceipt.handoverTo || '..........................'}
						</p>
					</div>
				</div>
			</div>

			<div class="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-surface-container-low/40">
				<button
					type="button"
					onclick={() => window.print()}
					class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
				>
					<span class="material-symbols-outlined text-[16px]">print</span>
					<span>Cetak Berita Acara</span>
				</button>
			</div>
		</div>
	</div>
{/if}
