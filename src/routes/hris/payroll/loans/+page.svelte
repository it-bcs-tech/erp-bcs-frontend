<script lang="ts">
	import { goto } from '$app/navigation';
	import { systemSettings, formatCurrencyPrivacy, formatMaskedText } from '$lib/stores/settings';
	import { isAdmin } from '$lib/stores/auth';

	let { data } = $props();

	let searchQuery = $state(data.searchQuery || '');
	let selectedStatus = $state(data.statusFilter || '');

	$effect(() => {
		searchQuery = data.searchQuery || '';
		selectedStatus = data.statusFilter || '';
	});

	let selectedLoan = $state<any>(null);
	let showModal = $state(false);

	function formatRupiah(val: number | null | undefined) {
		return formatCurrencyPrivacy(val, $systemSettings.hideSalaryNominals);
	}

	function handleFilterChange() {
		const query = new URLSearchParams();
		if (searchQuery) query.set('search', searchQuery);
		if (selectedStatus) query.set('status', selectedStatus);

		goto(`/hris/payroll/loans?${query.toString()}`, { keepFocus: true, noScroll: true });
	}

	function openLoanModal(loan: any) {
		selectedLoan = loan;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		selectedLoan = null;
	}

	function getStatusBadge(status: string) {
		switch (status?.toLowerCase()) {
			case 'approved':
			case 'active':
				return { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20', label: 'Aktif / Disetujui' };
			case 'pending':
				return { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20', label: 'Menunggu HRD' };
			case 'paid_off':
				return { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20', label: 'Lunas' };
			case 'rejected':
				return { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-500/20', label: 'Ditolak' };
			default:
				return { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/20', label: status || 'Draft' };
		}
	}
</script>

<svelte:head>
	<title>Kasbon & Pinjaman Karyawan | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Top Bar -->
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
		<div>
			<div class="flex items-center gap-3">
				<a
					href="/hris/payroll"
					class="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors"
					title="Kembali ke Payroll"
				>
					<span class="material-symbols-outlined text-on-surface">arrow_back</span>
				</a>
				<div>
					<h1 class="text-2xl font-black text-on-surface tracking-tight">Kasbon & Pinjaman Karyawan</h1>
					<p class="text-sm text-on-surface-variant font-medium mt-0.5">
						Monitoring Pinjaman, Cicilan Bulanan, dan Potongan Gaji Staff
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Alert Banner: Mode Presentasi Aktif -->
	{#if $systemSettings.hideSalaryNominals}
		<div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between animate-in fade-in">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-amber-600 text-lg">visibility_off</span>
				<span>
					<strong>Mode Presentasi Aktif:</strong> Seluruh nominal rupiah pinjaman & kasbon disamarkan menjadi <code class="px-1.5 py-0.5 rounded bg-amber-500/20 font-mono font-bold">Rp ••••••••</code> untuk keamanan layar saat presentasi.
				</span>
			</div>
			{#if $isAdmin}
				<a href="/settings" class="text-amber-700 dark:text-amber-300 font-bold hover:underline inline-flex items-center gap-1">
					<span>Ubah di Pengaturan</span>
					<span class="material-symbols-outlined text-xs">arrow_forward</span>
				</a>
			{/if}
		</div>
	{/if}

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Pinjaman</p>
					<h3 class="text-2xl font-black text-on-surface mt-1">{data.summary.total_loans} Aplikasi</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">credit_card</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2">Total pengajuan tercatat</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Plafond Disetujui</p>
					<h3 class="text-xl font-black text-emerald-600 mt-1">{formatRupiah(data.summary.total_amount)}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">request_quote</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 font-medium mt-2">{data.summary.active_loans} Pinjaman Aktif</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Sisa Outstanding</p>
					<h3 class="text-xl font-black text-primary mt-1">{formatRupiah(data.summary.total_remaining)}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">account_balance</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2">Belum terbayar via payroll</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pending HRD</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{data.summary.pending_loans} Pengajuan</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">pending_actions</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 font-medium mt-2">Membutuhkan review HRD</p>
		</div>
	</div>

	<!-- Controls & Filter Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
		<!-- Tabs (Segmented Control Status Pinjaman) -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
			<button 
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {!selectedStatus ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
				onclick={() => { selectedStatus = ''; handleFilterChange(); }}
			>
				Semua Status
			</button>
			<button 
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {selectedStatus === 'pending' ? 'bg-surface text-amber-600 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
				onclick={() => { selectedStatus = 'pending'; handleFilterChange(); }}
			>
				Menunggu HRD
			</button>
			<button 
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {selectedStatus === 'approved' ? 'bg-surface text-emerald-600 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
				onclick={() => { selectedStatus = 'approved'; handleFilterChange(); }}
			>
				Aktif / Disetujui
			</button>
			<button 
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {selectedStatus === 'paid_off' ? 'bg-surface text-blue-600 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
				onclick={() => { selectedStatus = 'paid_off'; handleFilterChange(); }}
			>
				Lunas
			</button>
			<button 
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {selectedStatus === 'rejected' ? 'bg-surface text-rose-600 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
				onclick={() => { selectedStatus = 'rejected'; handleFilterChange(); }}
			>
				Ditolak
			</button>
		</div>

		<!-- Search Input -->
		<div class="relative w-full md:w-80 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				placeholder="Cari nama karyawan / alasan pinjaman..."
				bind:value={searchQuery}
				oninput={handleFilterChange}
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400"
			/>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="px-5 py-3.5">Karyawan</th>
						<th class="px-5 py-3.5">Plafond Pinjaman</th>
						<th class="px-5 py-3.5">Tenor & Cicilan</th>
						<th class="px-5 py-3.5">Sisa Tagihan</th>
						<th class="px-5 py-3.5">Alasan Pinjaman</th>
						<th class="px-5 py-3.5">Status</th>
						<th class="px-5 py-3.5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if data.loans.length === 0}
						<tr>
							<td colspan="7" class="px-5 py-12 text-center text-on-surface-variant font-medium">
								<span class="material-symbols-outlined text-4xl mb-2 text-slate-300 block">credit_card_off</span>
								Tidak ada data kasbon/pinjaman ditemukan.
							</td>
						</tr>
					{:else}
						{#each data.loans as loan}
							{@const badge = getStatusBadge(loan.status)}
							<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
								<td class="px-5 py-4">
									<div>
										<p class="font-bold text-on-surface">{loan.employee_name}</p>
										<p class="text-xs text-on-surface-variant mt-0.5">Tgl Pengajuan: {loan.request_date || '-'}</p>
									</div>
								</td>
								<td class="px-5 py-4 font-bold text-on-surface font-mono">
									{formatRupiah(loan.amount)}
								</td>
								<td class="px-5 py-4">
									<div>
										<p class="font-semibold text-on-surface">{loan.tenor_months} Bulan</p>
										<p class="text-xs text-primary font-bold font-mono mt-0.5">{formatRupiah(loan.monthly_installment)}/bln</p>
									</div>
								</td>
								<td class="px-5 py-4 font-black text-rose-600 font-mono">
									{formatRupiah(loan.remaining_amount)}
								</td>
								<td class="px-5 py-4 text-xs font-medium text-on-surface-variant max-w-xs truncate">
									{loan.reason || '-'}
								</td>
								<td class="px-5 py-4">
									<span class="px-2.5 py-1 rounded-full text-xs font-bold border inline-block {badge.bg} {badge.text} {badge.border}">
										{badge.label}
									</span>
								</td>
								<td class="px-5 py-4 text-right">
									<button
										onclick={() => openLoanModal(loan)}
										class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-primary transition-all inline-flex items-center gap-1 cursor-pointer"
									>
										<span class="material-symbols-outlined text-sm">info</span>
										<span>Detail</span>
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

<!-- Modal Detail Pinjaman -->
{#if showModal && selectedLoan}
	{@const badge = getStatusBadge(selectedLoan.status)}
	<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden my-8">
			<div class="bg-slate-900 text-white p-6 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
						<span class="material-symbols-outlined text-2xl">credit_card</span>
					</div>
					<div>
						<h2 class="text-lg font-bold">DETAIL PINJAMAN / KASBON</h2>
						<p class="text-xs text-slate-400">Plafond ID #{selectedLoan.id} | HRD Administration</p>
					</div>
				</div>
				<button onclick={closeModal} class="text-slate-400 hover:text-white transition-colors cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 space-y-6 text-xs">
				<div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 grid grid-cols-2 gap-4">
					<div>
						<span class="text-slate-400 block">Karyawan</span>
						<span class="text-sm font-bold text-on-surface">{selectedLoan.employee_name}</span>
					</div>
					<div>
						<span class="text-slate-400 block">Status Pengajuan</span>
						<span class="px-2.5 py-0.5 rounded-full text-xs font-bold border inline-block mt-0.5 {badge.bg} {badge.text} {badge.border}">
							{badge.label}
						</span>
					</div>
					<div>
						<span class="text-slate-400 block">Plafond Pinjaman</span>
						<span class="text-sm font-bold text-emerald-600 font-mono">{formatRupiah(selectedLoan.amount)}</span>
					</div>
					<div>
						<span class="text-slate-400 block">Sisa Outstanding</span>
						<span class="text-sm font-bold text-rose-600 font-mono">{formatRupiah(selectedLoan.remaining_amount)}</span>
					</div>
					<div>
						<span class="text-slate-400 block">Tenor & Cicilan</span>
						<span class="font-semibold text-on-surface">{selectedLoan.tenor_months} Bulan (<span class="font-mono">{formatRupiah(selectedLoan.monthly_installment)}</span>/bln)</span>
					</div>
					<div>
						<span class="text-slate-400 block">Rekening Pencairan</span>
						<span class="font-semibold text-on-surface">{selectedLoan.bank_name || 'BCA'} - {formatMaskedText(selectedLoan.bank_account_number, $systemSettings.maskSensitiveInfo)}</span>
					</div>
				</div>

				<div>
					<span class="text-slate-400 block font-bold uppercase tracking-wider mb-1">Alasan Pengajuan Pinjaman:</span>
					<p class="p-3 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-on-surface font-medium leading-relaxed">
						{selectedLoan.reason_detail || selectedLoan.reason || 'Tidak ada catatan tambahan.'}
					</p>
				</div>
			</div>

			<div class="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end border-t border-slate-200 dark:border-slate-800">
				<button
					onclick={closeModal}
					class="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-on-surface hover:bg-slate-300 transition-all cursor-pointer"
				>
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}
