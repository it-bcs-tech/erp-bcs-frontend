<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { systemSettings, formatCurrencyPrivacy, formatMaskedText } from '$lib/stores/settings';

	let { data } = $props();

	let activeMainTab = $state<'payroll' | 'reimbursement'>('payroll');
	let selectedPeriod = $state(data.selectedPeriod);
	let searchQuery = $state(data.searchQuery);
	let selectedDivision = $state(data.divisionFilter);

	// Payslip Modal State
	let selectedSlip = $state<any>(null);
	let showModal = $state(false);
	let isEditMode = $state(false);

	// Reimbursement Modal State
	let showClaimModal = $state(false);
	let selectedClaimForAction = $state<any>(null);
	let showApproveModal = $state(false);
	let showRejectModal = $state(false);

	// Automated Payroll Calculation Wizard State
	let showGenerateModal = $state(false);
	let generateStep = $state<'form' | 'preview' | 'success'>('form');
	let generatePeriod = $state(data.selectedPeriod || '2026-08-01');
	let generateMode = $state<'all' | 'new_only'>('all');
	let isCalculating = $state(false);
	let isSaving = $state(false);
	let previewData = $state<any>(null);
	let generateError = $state<string | null>(null);
	let searchPreview = $state('');

	function formatRupiah(val: number) {
		return formatCurrencyPrivacy(val, $systemSettings.hideSalaryNominals);
	}

	function formatNIK(nik: string) {
		return formatMaskedText(nik, $systemSettings.maskSensitiveInfo);
	}

	function formatAccount(acc: string) {
		return formatMaskedText(acc, $systemSettings.maskSensitiveInfo);
	}

	function handleFilterChange() {
		const query = new URLSearchParams();
		if (selectedPeriod) query.set('period', selectedPeriod);
		if (searchQuery) query.set('search', searchQuery);
		if (selectedDivision) query.set('division', selectedDivision);

		goto(`/hris/payroll?${query.toString()}`, { keepFocus: true, noScroll: true });
	}

	function openSlipModal(slip: any) {
		selectedSlip = { ...slip };
		isEditMode = false;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		selectedSlip = null;
		isEditMode = false;
	}

	function openGenerateModal() {
		generatePeriod = selectedPeriod || '2026-08-01';
		generateStep = 'form';
		previewData = null;
		generateError = null;
		showGenerateModal = true;
	}

	function closeGenerateModal() {
		showGenerateModal = false;
		generateStep = 'form';
		previewData = null;
		generateError = null;
	}

	async function handleCalculatePreview() {
		isCalculating = true;
		generateError = null;
		try {
			const res = await fetch('/api/hris/payroll/calculate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					period: generatePeriod,
					mode: generateMode
				})
			});
			const result = await res.json();

			if (result.success && result.summary) {
				previewData = result.summary;
				generateStep = 'preview';
			} else {
				generateError = result.message || 'Gagal menjalankan simulasi kalkulasi payroll.';
			}
		} catch (err: any) {
			generateError = err?.message || 'Terjadi kesalahan jaringan/server saat memproses.';
		} finally {
			isCalculating = false;
		}
	}

	async function handleCommitCalculation() {
		isSaving = true;
		generateError = null;
		try {
			const res = await fetch('/api/hris/payroll/commit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					period: generatePeriod,
					mode: generateMode
				})
			});
			const result = await res.json();

			if (result.success) {
				generateStep = 'success';
			} else {
				generateError = result.message || 'Gagal menyimpan hasil payroll ke database.';
			}
		} catch (err: any) {
			generateError = err?.message || 'Terjadi kesalahan saat menyimpan ke database.';
		} finally {
			isSaving = false;
		}
	}

	function handleFinishGenerate() {
		showGenerateModal = false;
		generateStep = 'form';
		selectedPeriod = generatePeriod;
		goto(`/hris/payroll?period=${generatePeriod}`, { invalidateAll: true });
	}

	function exportBankFile() {
		if (!data.salarySlips || data.salarySlips.length === 0) {
			alert('Tidak ada data payroll untuk diekspor.');
			return;
		}

		let csvContent = 'data:text/csv;charset=utf-8,';
		csvContent += 'No,NIK,Nama Karyawan,Bank,No Rekening,Nominal Transfer (THP)\n';

		data.salarySlips.forEach((item: any, idx: number) => {
			csvContent += `${idx + 1},"${item.employee_nik}","${item.employee_name}","${item.bank_name || 'BCA'}","${item.account_number || '-'}",${item.net_salary}\n`;
		});

		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `Payroll_Bank_Transfer_${selectedPeriod}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	let filteredPreviewItems = $derived(
		previewData?.items?.filter((item: any) => {
			if (!searchPreview) return true;
			const q = searchPreview.toLowerCase();
			return (
				item.employee_name.toLowerCase().includes(q) ||
				item.employee_nik.toLowerCase().includes(q) ||
				item.employee_position.toLowerCase().includes(q)
			);
		}) || []
	);
</script>


<svelte:head>
	<title>Payroll & Salary Slips | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Top Bar / Header -->
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-primary text-2xl">payments</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Payroll & Salary Slips</h1>
			</div>
			<p class="text-sm text-on-surface-variant font-medium mt-0.5">
				Pengelolaan Gaji Karyawan, Slip Gaji PT BCS & Klaim Reimbursement Benefit
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2.5">
			<a
				href="/hris/payroll/loans"
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-semibold text-sm hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-lg">credit_score</span>
				<span>Kasbon & Pinjaman</span>
			</a>
			{#if activeMainTab === 'payroll'}
				<button
					onclick={openGenerateModal}
					class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-semibold text-sm hover:bg-surface-container transition-all cursor-pointer"
				>
					<span class="material-symbols-outlined text-lg">bolt</span>
					<span>Hitung Otomatis Payroll</span>
				</button>
				<button
					onclick={exportBankFile}
					class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high border border-slate-200 dark:border-slate-700 text-on-surface font-bold text-sm shadow-2xs hover:bg-surface-container transition-all cursor-pointer"
				>
					<span class="material-symbols-outlined text-lg">file_download</span>
					<span>Export Bank Transfer</span>
				</button>
			{:else}
				<button
					onclick={() => (showClaimModal = true)}
					class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
				>
					<span class="material-symbols-outlined text-lg">add_card</span>
					<span>Ajukan Klaim Baru</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Alert Banner: Mode Presentasi Aktif -->
	{#if $systemSettings.hideSalaryNominals}
		<div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between animate-in fade-in">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-amber-600 text-lg">visibility_off</span>
				<span>
					<strong>Mode Presentasi Aktif:</strong> Seluruh nominal rupiah disamarkan menjadi <code class="px-1.5 py-0.5 rounded bg-amber-500/20 font-mono font-bold">Rp ••••••••</code> untuk keamanan layar saat presentasi.
				</span>
			</div>
			<a href="/settings" class="text-amber-700 dark:text-amber-300 font-bold hover:underline inline-flex items-center gap-1">
				<span>Ubah di Pengaturan</span>
				<span class="material-symbols-outlined text-xs">arrow_forward</span>
			</a>
		</div>
	{/if}

	<!-- Tab Switcher (Segmented Control) -->
	<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 flex-wrap gap-1">
		<button
			onclick={() => (activeMainTab = 'payroll')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeMainTab === 'payroll' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-sm">receipt_long</span>
			<span>Slip Gaji & Direktori Payroll</span>
			<span class="px-2 py-0.5 rounded-full text-[10px] {activeMainTab === 'payroll' ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'} font-bold font-mono">{data.summary.total_count}</span>
		</button>
		<button
			onclick={() => (activeMainTab = 'reimbursement')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeMainTab === 'reimbursement' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-sm">medical_services</span>
			<span>Klaim Reimbursement (Medis & Operasional)</span>
			{#if data.reimbursementSummary.pending_claims > 0}
				<span class="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold font-mono">{data.reimbursementSummary.pending_claims} Pending</span>
			{/if}
		</button>
	</div>


	<!-- TAB 1: PAYROLL DIRECTORY -->
	{#if activeMainTab === 'payroll'}
		<!-- Summary Metrics Cards -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Karyawan</p>
						<h3 class="text-2xl font-black text-on-surface mt-1">{data.summary.total_count} Staff</h3>
					</div>
					<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-2xl">badge</span>
					</div>
				</div>
				<p class="text-xs text-on-surface-variant mt-2">Terproses pada periode aktif</p>
			</div>

			<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Pendapatan (Gross)</p>
						<h3 class="text-xl font-black text-on-surface mt-1">{formatRupiah(data.summary.sum_gross)}</h3>
					</div>
					<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-2xl">account_balance_wallet</span>
					</div>
				</div>
				<p class="text-xs text-emerald-600 font-medium mt-2">Gaji Pokok & Seluruh Tunjangan</p>
			</div>

			<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Potongan</p>
						<h3 class="text-xl font-black text-rose-600 mt-1">{formatRupiah(data.summary.sum_deductions)}</h3>
					</div>
					<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-2xl">remove_circle_outline</span>
					</div>
				</div>
				<p class="text-xs text-on-surface-variant mt-2">BPJS, Pajak, Absen, Zakat & Pinjaman</p>
			</div>

			<div class="p-5 rounded-2xl bg-primary-container/30 border border-primary/20 shadow-xs relative overflow-hidden">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-bold text-primary uppercase tracking-wider">Total Net THP</p>
						<h3 class="text-xl font-black text-primary mt-1">{formatRupiah(data.summary.sum_net)}</h3>
					</div>
					<div class="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
						<span class="material-symbols-outlined text-2xl">paid</span>
					</div>
				</div>
				<p class="text-xs text-primary font-medium mt-2">Rata-rata THP: {formatRupiah(data.summary.avg_net)}</p>
			</div>
		</div>

		<!-- Controls & Filters -->
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between">
			<div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
				<!-- Period Selector -->
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-slate-400 text-lg">calendar_month</span>
					<select
						bind:value={selectedPeriod}
						onchange={handleFilterChange}
						class="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-on-surface focus:ring-2 focus:ring-primary/20 cursor-pointer"
					>
						{#each data.periods as p}
							<option value={p.period_key}>{p.period_label} ({p.total_employees} karyawan)</option>
						{/each}
					</select>
				</div>

				<!-- Division Filter -->
				{#if data.divisions.length > 0}
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-slate-400 text-lg">corporate_fare</span>
						<select
							bind:value={selectedDivision}
							onchange={handleFilterChange}
							class="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 cursor-pointer"
						>
							<option value="">Semua Divisi</option>
							{#each data.divisions as div}
								<option value={div}>{div}</option>
							{/each}
						</select>
					</div>
				{/if}
			</div>

			<!-- Search Input -->
			<div class="relative w-full md:w-72">
				<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
				<input
					type="text"
					placeholder="Cari NIK / Nama / Jabatan..."
					bind:value={searchQuery}
					oninput={handleFilterChange}
					class="w-full bg-surface border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
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
							<th class="px-5 py-3.5">Jabatan / Divisi</th>
							<th class="px-5 py-3.5">Gaji Pokok</th>
							<th class="px-5 py-3.5">Total Pendapatan</th>
							<th class="px-5 py-3.5">Total Potongan</th>
							<th class="px-5 py-3.5">THP (Gaji Bersih)</th>
							<th class="px-5 py-3.5 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#if data.salarySlips.length === 0}
							<tr>
								<td colspan="7" class="px-5 py-12 text-center text-on-surface-variant font-medium">
									<span class="material-symbols-outlined text-4xl mb-2 text-slate-300 block">search_off</span>
									<p>Belum ada data payroll ditemukan untuk periode <strong>{selectedPeriod}</strong>.</p>
									<button
										onclick={openGenerateModal}
										class="mt-3 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer hover:bg-primary/90 transition-all"
									>
										<span class="material-symbols-outlined text-sm">bolt</span>
										<span>Hitung Otomatis Sekarang</span>
									</button>
								</td>
							</tr>
						{:else}
							{#each data.salarySlips as slip}
								<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
									<td class="px-5 py-4">
										<div>
											<p class="font-bold text-on-surface">{slip.employee_name}</p>
											<div class="flex items-center gap-2 mt-0.5">
												<span class="text-xs text-on-surface-variant font-mono">NIK: {slip.employee_nik}</span>
												<span class="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 text-[10px] font-bold font-mono">HK: {slip.work_days || 0} hr</span>
											</div>
										</div>
									</td>
									<td class="px-5 py-4">
										<div>
											<p class="font-semibold text-on-surface">{slip.employee_position || '-'}</p>
											<p class="text-xs text-on-surface-variant mt-0.5">{slip.employee_division || '-'}</p>
										</div>
									</td>
									<td class="px-5 py-4 font-medium text-on-surface font-mono">
										{formatRupiah(slip.basic_salary)}
									</td>
									<td class="px-5 py-4 font-semibold text-emerald-600 font-mono">
										{formatRupiah(slip.gross_salary)}
									</td>
									<td class="px-5 py-4 font-medium text-rose-600 font-mono">
										-{formatRupiah(slip.total_deductions)}
									</td>
									<td class="px-5 py-4">
										<span class="font-black text-primary px-2.5 py-1 rounded-lg bg-primary/10 inline-block font-mono">
											{formatRupiah(slip.net_salary)}
										</span>
									</td>
									<td class="px-5 py-4 text-right">
										<button
											onclick={() => openSlipModal(slip)}
											class="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
										>
											<span class="material-symbols-outlined text-sm">receipt_long</span>
											<span>Buka Slip</span>
										</button>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<!-- TAB 2: KLAIM REIMBURSEMENT -->
		<div class="space-y-6">
			<!-- Reimbursement Metrics -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Pengajuan Klaim</p>
					<div class="flex items-end justify-between">
						<h3 class="text-2xl font-black text-on-surface">{data.reimbursementSummary.total_claims} Tiket</h3>
						<span class="material-symbols-outlined text-2xl text-slate-400">receipt</span>
					</div>
				</div>
				<div class="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
					<p class="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-1">Total Klaim Disetujui</p>
					<div class="flex items-end justify-between">
						<h3 class="text-2xl font-black text-emerald-700 dark:text-emerald-300">{formatRupiah(data.reimbursementSummary.total_approved_amount)}</h3>
						<span class="material-symbols-outlined text-2xl text-emerald-600">verified</span>
					</div>
				</div>
				<div class="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xs">
					<p class="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">Menunggu Persetujuan HRD</p>
					<div class="flex items-end justify-between">
						<h3 class="text-2xl font-black text-amber-700 dark:text-amber-300">{data.reimbursementSummary.pending_claims} Klaim</h3>
						<span class="material-symbols-outlined text-2xl text-amber-600">pending_actions</span>
					</div>
				</div>
			</div>

			<!-- Reimbursement Table -->
			<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
							<tr>
								<th class="px-5 py-3.5">Karyawan</th>
								<th class="px-5 py-3.5">Kategori Klaim</th>
								<th class="px-5 py-3.5">Fasilitas / Merchant & Kuitansi</th>
								<th class="px-5 py-3.5">Tgl Kuitansi</th>
								<th class="px-5 py-3.5">Nominal Klaim</th>
								<th class="px-5 py-3.5">Status</th>
								<th class="px-5 py-3.5 text-right">Aksi HRD</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
							{#if data.reimbursements.length === 0}
								<tr>
									<td colspan="7" class="px-5 py-12 text-center text-slate-400">Belum ada data klaim reimbursement diajukan.</td>
								</tr>
							{:else}
								{#each data.reimbursements as claim}
									<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
										<td class="px-5 py-4">
											<p class="font-bold text-on-surface">{claim.employee_name}</p>
											<p class="text-xs text-on-surface-variant font-mono mt-0.5">{claim.employee_nik} • {claim.employee_division}</p>
										</td>
										<td class="px-5 py-4">
											<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
												{claim.claim_type}
											</span>
										</td>
										<td class="px-5 py-4">
											<p class="font-semibold text-on-surface">{claim.merchant_name || '-'}</p>
											<p class="text-xs text-slate-400 font-mono mt-0.5">No: {claim.invoice_number || '-'}</p>
										</td>
										<td class="px-5 py-4 text-xs font-mono text-on-surface">
											{claim.claim_date}
										</td>
										<td class="px-5 py-4 font-bold text-on-surface font-mono">
											{formatRupiah(claim.amount)}
										</td>
										<td class="px-5 py-4">
											{#if claim.status === 'Approved'}
												<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 inline-flex items-center gap-1">
													<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Disetujui
												</span>
											{:else if claim.status === 'Rejected'}
												<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 inline-flex items-center gap-1">
													<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Ditolak
												</span>
											{:else}
												<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 inline-flex items-center gap-1">
													<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Menunggu
												</span>
											{/if}
										</td>
										<td class="px-5 py-4 text-right">
											{#if claim.status === 'Pending'}
												<div class="flex justify-end gap-1.5">
													<form method="POST" action="?/approveReimbursement">
														<input type="hidden" name="claimId" value={claim.id} />
														<input type="hidden" name="approved_amount" value={claim.amount} />
														<button type="submit" class="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer shadow-2xs">
															Setujui
														</button>
													</form>
													<form method="POST" action="?/rejectReimbursement">
														<input type="hidden" name="claimId" value={claim.id} />
														<button type="submit" class="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer shadow-2xs">
															Tolak
														</button>
													</form>
												</div>
											{:else}
												<span class="text-xs text-slate-400">Selesai</span>
											{/if}
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- MODAL WIZARD: AUTOMATED PAYROLL ENGINE (GENERASI & KALKULASI OTOMATIS) -->
{#if showGenerateModal}
	<div class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl overflow-hidden my-6 animate-in zoom-in-95 duration-150">
			<!-- Header Wizard -->
			<div class="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 flex items-center justify-between">
				<div class="flex items-center gap-3.5">
					<div class="w-11 h-11 rounded-2xl bg-white/15 text-white flex items-center justify-center font-bold border border-white/20">
						<span class="material-symbols-outlined text-2xl">bolt</span>
					</div>
					<div>
						<h2 class="text-lg font-black tracking-tight">Kalkulasi Otomatis Payroll PT BCS</h2>
						<p class="text-xs text-blue-100 font-medium">Automated Batch Calculation Engine (Absensi, Lembur, Kasbon, BPJS & PPh 21)</p>
					</div>
				</div>
				<button onclick={closeGenerateModal} class="text-blue-200 hover:text-white transition-colors cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<!-- Body Wizard -->
			<div class="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
				{#if generateError}
					<div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
						<span class="material-symbols-outlined text-rose-500 text-xl">error</span>
						<span>{generateError}</span>
					</div>
				{/if}

				{#if generateStep === 'form'}
					<!-- STEP 1: PARAMETER SETUP -->
					<div class="space-y-5">
						<div class="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 text-xs space-y-2">
							<p class="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
								<span class="material-symbols-outlined text-base text-blue-600">info</span>
								Alur Kerja & Integrasi Sumber Data Otomatis:
							</p>
							<ul class="list-disc list-inside text-blue-800 dark:text-blue-300/90 space-y-1 pl-1">
								<li><strong>Gaji Pokok & Tunjangan:</strong> Mewarisi baseline profil slip terakhir seluruh karyawan aktif.</li>
								<li><strong>Uang Lembur:</strong> Mengagregasi jam lembur aktual dari log presensi (<code class="font-mono">presensi.presences</code>) x formula Depnaker 1.5x upah sejam.</li>
								<li><strong>Potongan Alpa:</strong> Mengkalkulasi hari alpa aktual x pro-rata 25 hari kerja.</li>
								<li><strong>Cicilan Pinjaman/Kasbon:</strong> Menarik angsuran pinjaman berstatus aktif dari modul Kasbon (<code class="font-mono">presensi.loans</code>).</li>
								<li><strong>Pajak PPh 21 & BPJS:</strong> Mengalkulasi tarif efektif bulanan (TER 2024) dan porsi BPJS pekerja (4%).</li>
							</ul>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label class="font-bold text-xs text-on-surface block mb-1.5">Periode Gaji yang Dihitung</label>
								<select
									bind:value={generatePeriod}
									class="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-sm font-semibold text-on-surface cursor-pointer"
								>
									{#each data.periods as p}
										<option value={p.period_key}>{p.period_label} ({p.period_code})</option>
									{/each}
								</select>
							</div>

							<div>
								<label class="font-bold text-xs text-on-surface block mb-1.5">Metode / Mode Sinkronisasi</label>
								<select
									bind:value={generateMode}
									class="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-sm font-semibold text-on-surface cursor-pointer"
								>
									<option value="all">⚡ Hitung Ulang Semua Karyawan (Sinkronisasi Total)</option>
									<option value="new_only">➕ Hanya Tambahkan Karyawan yang Belum Ada Slip</option>
								</select>
							</div>
						</div>
					</div>

					<div class="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
						<button
							type="button"
							onclick={closeGenerateModal}
							class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
						>
							Batal
						</button>
						<button
							type="button"
							disabled={isCalculating}
							onclick={handleCalculatePreview}
							class="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-md inline-flex items-center gap-2 disabled:opacity-50"
						>
							{#if isCalculating}
								<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
								<span>Menghitung Batch Data...</span>
							{:else}
								<span class="material-symbols-outlined text-sm">play_arrow</span>
								<span>Mulai Simulasi Perhitungan</span>
							{/if}
						</button>
					</div>

				{:else if generateStep === 'preview' && previewData}
					<!-- STEP 2: PREVIEW BATCH RESULTS -->
					<div class="space-y-5">
						<!-- Summary Metric Cards -->
						<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
							<div class="p-3.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800">
								<p class="text-[10px] font-bold text-on-surface-variant uppercase">Total Karyawan</p>
								<p class="text-xl font-black text-on-surface mt-0.5">{previewData.total_employees} Staff</p>
							</div>
							<div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
								<p class="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Gross Salary</p>
								<p class="text-base font-black text-emerald-600 font-mono mt-0.5">{formatRupiah(previewData.total_gross)}</p>
							</div>
							<div class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
								<p class="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase">Total Potongan</p>
								<p class="text-base font-black text-rose-600 font-mono mt-0.5">-{formatRupiah(previewData.total_deductions)}</p>
							</div>
							<div class="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
								<p class="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">Total Net THP</p>
								<p class="text-base font-black text-blue-600 font-mono mt-0.5">{formatRupiah(previewData.total_net)}</p>
							</div>
						</div>

						<!-- Dynamic Sub-metrics -->
						<div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs p-3 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800">
							<div>
								<span class="text-slate-400 block text-[10px]">Total Lembur:</span>
								<span class="font-bold font-mono text-on-surface">{previewData.total_overtime_hours} jam ({formatRupiah(previewData.total_overtime_amount)})</span>
							</div>
							<div>
								<span class="text-slate-400 block text-[10px]">Potongan Alpa:</span>
								<span class="font-bold font-mono text-rose-600">{previewData.total_absence_days} hari ({formatRupiah(previewData.total_absence_deduction)})</span>
							</div>
							<div>
								<span class="text-slate-400 block text-[10px]">Potongan Kasbon:</span>
								<span class="font-bold font-mono text-on-surface">{formatRupiah(previewData.total_loan_deduction)}</span>
							</div>
							<div>
								<span class="text-slate-400 block text-[10px]">Total BPJS + PPh 21:</span>
								<span class="font-bold font-mono text-on-surface">{formatRupiah(previewData.total_bpjs + previewData.total_tax)}</span>
							</div>
						</div>

						<!-- Search & Preview Table -->
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<h3 class="font-bold text-xs text-on-surface">Pratinjau Hasil Perhitungan (Menampilkan {filteredPreviewItems.length} Karyawan)</h3>
								<input
									type="text"
									placeholder="Filter nama / NIK..."
									bind:value={searchPreview}
									class="px-3 py-1.5 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 w-52"
								/>
							</div>

							<div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-60 overflow-y-auto">
								<table class="w-full text-left text-xs">
									<thead class="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-on-surface-variant uppercase sticky top-0">
										<tr>
											<th class="p-2.5">Karyawan</th>
											<th class="p-2.5">Hari Kerja (HK)</th>
											<th class="p-2.5">Gaji Pokok</th>
											<th class="p-2.5">Lembur</th>
											<th class="p-2.5">Alpa</th>
											<th class="p-2.5">Kasbon</th>
											<th class="p-2.5">BPJS & Pajak</th>
											<th class="p-2.5 text-right">Take Home Pay</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
										{#each filteredPreviewItems.slice(0, 50) as item}
											<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
												<td class="p-2.5">
													<p class="font-bold text-on-surface">{item.employee_name}</p>
													<p class="text-[10px] text-slate-400 font-mono">{item.employee_nik}</p>
												</td>
												<td class="p-2.5 font-mono font-bold text-blue-600">{item.work_days || 0} hr</td>
												<td class="p-2.5 font-mono">{formatRupiah(item.basic_salary)}</td>
												<td class="p-2.5 font-mono text-emerald-600">{formatRupiah(item.overtime_allowance)}</td>
												<td class="p-2.5 font-mono text-rose-600">{item.absence_days > 0 ? `-${formatRupiah(item.absence_deduction)}` : 'Rp 0'}</td>
												<td class="p-2.5 font-mono text-rose-600">{item.bpr_installment > 0 ? `-${formatRupiah(item.bpr_installment)}` : 'Rp 0'}</td>
												<td class="p-2.5 font-mono text-rose-600">-{formatRupiah(item.bpjs + item.tax)}</td>
												<td class="p-2.5 font-mono font-bold text-primary text-right">{formatRupiah(item.net_salary)}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					</div>

					<div class="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
						<button
							type="button"
							onclick={() => (generateStep = 'form')}
							class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer inline-flex items-center gap-1"
						>
							<span class="material-symbols-outlined text-sm">arrow_back</span>
							<span>Ubah Parameter</span>
						</button>

						<div class="flex gap-2">
							<button
								type="button"
								onclick={closeGenerateModal}
								class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
							>
								Batal
							</button>
							<button
								type="button"
								disabled={isSaving}
								onclick={handleCommitCalculation}
								class="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5 disabled:opacity-50"
							>
								{#if isSaving}
									<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
									<span>Menyimpan ke Database...</span>
								{:else}
									<span class="material-symbols-outlined text-sm">save</span>
									<span>Simpan & Terapkan Hasil ke Database</span>
								{/if}
							</button>
						</div>
					</div>

				{:else if generateStep === 'success'}
					<!-- STEP 3: SUCCESS CONFIRMATION -->
					<div class="py-8 text-center space-y-4">
						<div class="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
							<span class="material-symbols-outlined text-4xl">check_circle</span>
						</div>
						<h3 class="text-xl font-black text-on-surface">Perhitungan Payroll Berhasil Disimpan!</h3>
						<p class="text-xs text-on-surface-variant max-w-md mx-auto">
							Seluruh data slip gaji untuk periode <strong>{generatePeriod}</strong> telah berhasil dikalkulasi otomatis dan disimpan ke database sistem PT BCS.
						</p>

						<div class="pt-4">
							<button
								type="button"
								onclick={handleFinishGenerate}
								class="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 shadow-md cursor-pointer inline-flex items-center gap-2"
							>
								<span class="material-symbols-outlined text-sm">visibility</span>
								<span>Buka Direktori Payroll Periode Ini</span>
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- MODAL SLIP GAJI ENTERPRISE WIDE DESKTOP (PT. BUANA CENTRA SWAKARSA) -->
{#if showModal && selectedSlip}
	<div class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl overflow-hidden my-6 print:my-0 print:border-none print:shadow-none print:w-full animate-in zoom-in-95 duration-150">
			<!-- Header Kop Perusahaan -->
			<div class="bg-slate-900 text-white p-6 flex items-center justify-between print:bg-white print:text-black print:border-b-2 print:border-black">
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center font-black text-xl border border-white/20 print:bg-slate-100 print:text-black">
						BCS
					</div>
					<div>
						<h2 class="text-base font-black tracking-tight print:text-lg">PT. BUANA CENTRA SWAKARSA</h2>
						<p class="text-xs text-slate-400 print:text-slate-600 font-medium">SLIP GAJI RESMI KARYAWAN | PERIODE: {selectedSlip.period_display || selectedSlip.period_date}</p>
					</div>
				</div>
				<div class="flex items-center gap-2 print:hidden">
					<button
						onclick={() => (isEditMode = !isEditMode)}
						class="px-3 py-1.5 rounded-xl border border-white/20 hover:bg-white/10 text-xs font-bold text-white transition-all inline-flex items-center gap-1 cursor-pointer"
					>
						<span class="material-symbols-outlined text-sm">{isEditMode ? 'visibility' : 'edit'}</span>
						<span>{isEditMode ? 'Mode Lihat' : 'Edit Nilai'}</span>
					</button>
					<button onclick={closeModal} class="text-slate-400 hover:text-white transition-colors cursor-pointer">
						<span class="material-symbols-outlined">close</span>
					</button>
				</div>
			</div>

			<!-- Body Modal -->
			<div class="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
				<!-- Informasi Identitas Karyawan -->
				<div class="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs font-medium border border-slate-200/60 dark:border-slate-700/60">
					<div>
						<span class="text-slate-400 block text-[11px]">Nama Karyawan</span>
						<span class="text-sm font-bold text-on-surface">{selectedSlip.employee_name}</span>
					</div>
					<div>
						<span class="text-slate-400 block text-[11px]">Nomor Induk Karyawan (NIK)</span>
						<span class="text-sm font-mono font-bold text-on-surface">{selectedSlip.employee_nik}</span>
					</div>
					<div>
						<span class="text-slate-400 block text-[11px]">Jabatan / Divisi</span>
						<span class="text-on-surface font-semibold">{selectedSlip.employee_position} ({selectedSlip.employee_division || 'General'})</span>
					</div>
					<div>
						<span class="text-slate-400 block text-[11px]">Rekening Bank Transfer</span>
						<span class="text-on-surface font-semibold">{selectedSlip.bank_name || 'BCA'} • {selectedSlip.account_number || '-'}</span>
					</div>
					<div class="bg-blue-500/10 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-500/20 flex flex-col justify-center">
						<span class="text-blue-600 dark:text-blue-300 block text-[11px] font-bold">Hari Kerja (HK)</span>
						<span class="text-sm font-mono font-black text-blue-700 dark:text-blue-200">{selectedSlip.work_days || 0} Hari</span>
					</div>
				</div>

				<!-- Kartu Highlight Take Home Pay (THP) -->
				<div class="p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
					<div>
						<div class="flex items-center gap-2">
							<span class="text-xs font-semibold text-blue-100 uppercase tracking-wider">Gaji Bersih (Take Home Pay)</span>
							<span class="px-2.5 py-0.5 rounded-full bg-blue-500/60 text-[10px] font-bold border border-white/20">✓ DIBAYARKAN</span>
						</div>
						<p class="text-xs text-blue-100 mt-1">Ditransfer via transfer payroll bank perusahaan</p>
					</div>
					<div class="text-right">
						<span class="text-3xl font-black font-mono tracking-tight">{formatRupiah(selectedSlip.net_salary)}</span>
					</div>
				</div>

				<!-- FORM EDIT MODE ATAU VIEW MODE -->
				{#if isEditMode}
					<!-- Form Edit Nilai Komponen Slip Gaji -->
					<form method="POST" action="?/updateSlip" class="space-y-6 text-xs">
						<input type="hidden" name="slipId" value={selectedSlip.id} />

						<!-- Baris Edit Hari Kerja & Kehadiran Aktual -->
						<div class="p-4 rounded-2xl border border-blue-500/30 bg-blue-50/30 dark:bg-blue-950/20 grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label class="font-bold text-blue-900 dark:text-blue-300 block mb-1">Hari Kerja (HK)</label>
								<div class="flex items-center gap-2">
									<input type="number" name="work_days" bind:value={selectedSlip.work_days} min="0" max="31" class="w-full px-3 py-2 rounded-xl bg-surface border font-mono font-bold text-blue-600" />
									<span class="text-xs font-bold text-slate-400">Hari</span>
								</div>
								<p class="text-[10px] text-slate-400 mt-1">Presensi hadir / edit manual</p>
							</div>
							<div>
								<label class="font-bold text-rose-900 dark:text-rose-300 block mb-1">Jumlah Alpa / Absen</label>
								<div class="flex items-center gap-2">
									<input type="number" name="absence_days" bind:value={selectedSlip.absence_days} min="0" max="31" class="w-full px-3 py-2 rounded-xl bg-surface border font-mono font-bold text-rose-600" />
									<span class="text-xs font-bold text-slate-400">Hari</span>
								</div>
								<p class="text-[10px] text-slate-400 mt-1">Mengurangi THP pro-rata</p>
							</div>
							<div>
								<label class="font-bold text-emerald-900 dark:text-emerald-300 block mb-1">Total Jam Lembur (OT)</label>
								<div class="flex items-center gap-2">
									<input type="number" step="0.5" name="overtime_hours" bind:value={selectedSlip.overtime_hours} min="0" class="w-full px-3 py-2 rounded-xl bg-surface border font-mono font-bold text-emerald-600" />
									<span class="text-xs font-bold text-slate-400">Jam</span>
								</div>
								<p class="text-[10px] text-slate-400 mt-1">Jam lembur aktual SPKL</p>
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<!-- Kolom Edit Pendapatan -->
							<div class="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3">
								<h3 class="font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider pb-2 border-b border-emerald-500/20">
									Edit Komponen Pendapatan
								</h3>
								<div class="space-y-2">
									<div>
										<label class="text-slate-500 block mb-1">Gaji Pokok</label>
										<input type="number" name="basic_salary" bind:value={selectedSlip.basic_salary} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Tunj. Profesi/Kontribusi</label>
										<input type="number" name="professional_allowance" bind:value={selectedSlip.professional_allowance} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Tunj. Prestasi</label>
										<input type="number" name="performance_allowance" bind:value={selectedSlip.performance_allowance} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Tunj. Jabatan</label>
										<input type="number" name="position_allowance" bind:value={selectedSlip.position_allowance} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Uang Makan</label>
										<input type="number" name="meal_allowance" bind:value={selectedSlip.meal_allowance} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Transport</label>
										<input type="number" name="transport_allowance" bind:value={selectedSlip.transport_allowance} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Tunj. Relokasi</label>
										<input type="number" name="relocation_allowance" bind:value={selectedSlip.relocation_allowance} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Tunj. Skill</label>
										<input type="number" name="skill_allowance" bind:value={selectedSlip.skill_allowance} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Insentif</label>
										<input type="number" name="incentive" bind:value={selectedSlip.incentive} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Tunj. Komunikasi</label>
										<input type="number" name="communication_allowance" bind:value={selectedSlip.communication_allowance} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Lembur (Rupiah)</label>
										<input type="number" name="overtime_allowance" bind:value={selectedSlip.overtime_allowance} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">KHK (Kompensasi Hari Kerja)</label>
										<input type="number" name="khk_allowance" bind:value={selectedSlip.khk_allowance} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Tunj. Lain-lain</label>
										<input type="number" name="other_allowance" bind:value={selectedSlip.other_allowance} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold" />
									</div>
								</div>
							</div>

							<!-- Kolom Edit Potongan -->
							<div class="p-4 rounded-2xl border border-rose-500/30 bg-rose-50/20 dark:bg-rose-950/10 space-y-3">
								<h3 class="font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider pb-2 border-b border-rose-500/20">
									Edit Komponen Potongan
								</h3>
								<div class="space-y-2">
									<div>
										<label class="text-slate-500 block mb-1">Zakat, Infak, Sodaqoh</label>
										<input type="number" name="zakat" bind:value={selectedSlip.zakat} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold text-rose-600" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Pajak/PPH.21</label>
										<input type="number" name="tax" bind:value={selectedSlip.tax} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold text-rose-600" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">BPJS (Kes & Naker)</label>
										<input type="number" name="bpjs" bind:value={selectedSlip.bpjs} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold text-rose-600" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Iuran SP-BCS</label>
										<input type="number" name="union_fee" bind:value={selectedSlip.union_fee} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold text-rose-600" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Potongan Alpa/Absen</label>
										<input type="number" name="absence_deduction" bind:value={selectedSlip.absence_deduction} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold text-rose-600" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Koperasi</label>
										<input type="number" name="cooperative" bind:value={selectedSlip.cooperative} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold text-rose-600" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Angsuran BPR</label>
										<input type="number" name="bpr_installment" bind:value={selectedSlip.bpr_installment} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold text-rose-600" />
									</div>
									<div>
										<label class="text-slate-500 block mb-1">Potongan Lain-lain</label>
										<input type="number" name="other_deduction" bind:value={selectedSlip.other_deduction} class="w-full px-3 py-1.5 rounded-lg bg-surface border font-mono font-bold text-rose-600" />
									</div>
								</div>
							</div>
						</div>

						<div class="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
							<button type="button" onclick={() => (isEditMode = false)} class="px-5 py-2.5 rounded-xl border text-xs font-bold hover:bg-slate-100 cursor-pointer">
								Batal
							</button>
							<button type="submit" class="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 cursor-pointer shadow-xs flex items-center gap-1.5">
								<span class="material-symbols-outlined text-sm">save</span>
								<span>Simpan Perubahan ke Database</span>
							</button>
						</div>
					</form>
				{:else}
					<!-- Grid Rincian 2 Kolom Wide Desktop -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
						<!-- Kolom Kiri: PENDAPATAN (13 Komponen Lengkap BCS) -->
						<div class="space-y-2 border-r border-slate-200 dark:border-slate-800 pr-0 md:pr-6">
							<h3 class="font-bold text-emerald-600 uppercase tracking-wider pb-2 border-b border-emerald-500/20 flex justify-between">
								<span>A. PENDAPATAN (EARNINGS)</span>
							</h3>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Gaji Pokok</span>
								<span class="font-bold text-on-surface font-mono">{formatRupiah(selectedSlip.basic_salary)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Tunj. Profesi/Kontribusi</span>
								<span class="font-semibold text-on-surface font-mono">{formatRupiah(selectedSlip.professional_allowance)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Tunj. Prestasi</span>
								<span class="font-semibold text-on-surface font-mono">{formatRupiah(selectedSlip.performance_allowance)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Tunj. Jabatan</span>
								<span class="font-semibold text-on-surface font-mono">{formatRupiah(selectedSlip.position_allowance)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Uang Makan</span>
								<span class="font-semibold text-on-surface font-mono">{formatRupiah(selectedSlip.meal_allowance)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Transport</span>
								<span class="font-semibold text-on-surface font-mono">{formatRupiah(selectedSlip.transport_allowance)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Tunj. Relokasi</span>
								<span class="font-semibold text-on-surface font-mono">{formatRupiah(selectedSlip.relocation_allowance)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Tunj. Skill</span>
								<span class="font-semibold text-on-surface font-mono">{formatRupiah(selectedSlip.skill_allowance)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Insentif</span>
								<span class="font-semibold text-on-surface font-mono">{formatRupiah(selectedSlip.incentive)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Tunj. Komunikasi</span>
								<span class="font-semibold text-on-surface font-mono">{formatRupiah(selectedSlip.communication_allowance)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Lembur ({selectedSlip.overtime_hours || '0.00'} jam)</span>
								<span class="font-semibold text-on-surface font-mono">{formatRupiah(selectedSlip.overtime_allowance)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">KHK</span>
								<span class="font-semibold text-on-surface font-mono">{formatRupiah(selectedSlip.khk_allowance)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Tunj. Lain-lain</span>
								<span class="font-semibold text-on-surface font-mono">{formatRupiah(selectedSlip.other_allowance)}</span>
							</div>
							<div class="flex justify-between pt-3 text-sm font-bold text-emerald-600">
								<span>Total Pendapatan (Gross)</span>
								<span class="font-mono">{formatRupiah(selectedSlip.gross_salary)}</span>
							</div>
						</div>

						<!-- Kolom Kanan: POTONGAN (8 Komponen Lengkap BCS) -->
						<div class="space-y-2">
							<h3 class="font-bold text-rose-600 uppercase tracking-wider pb-2 border-b border-rose-500/20 flex justify-between">
								<span>B. POTONGAN (DEDUCTIONS)</span>
							</h3>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Zakat, Infak, Sodaqoh</span>
								<span class="font-semibold text-rose-600 font-mono">-{formatRupiah(selectedSlip.zakat)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Pajak/PPH.21</span>
								<span class="font-semibold text-rose-600 font-mono">-{formatRupiah(selectedSlip.tax)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">BPJS (Kes & Naker)</span>
								<span class="font-semibold text-rose-600 font-mono">-{formatRupiah(selectedSlip.bpjs)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Iuran SP-BCS</span>
								<span class="font-semibold text-rose-600 font-mono">-{formatRupiah(selectedSlip.union_fee)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Alpa/Absen ({selectedSlip.absence_days || '0'})</span>
								<span class="font-semibold text-rose-600 font-mono">-{formatRupiah(selectedSlip.absence_deduction)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Koperasi</span>
								<span class="font-semibold text-rose-600 font-mono">-{formatRupiah(selectedSlip.cooperative)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Angsuran BPR</span>
								<span class="font-semibold text-rose-600 font-mono">-{formatRupiah(selectedSlip.bpr_installment)}</span>
							</div>
							<div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Lain-lain</span>
								<span class="font-semibold text-rose-600 font-mono">-{formatRupiah(selectedSlip.other_deduction)}</span>
							</div>
							<div class="flex justify-between pt-3 text-sm font-bold text-rose-600">
								<span>Total Potongan</span>
								<span class="font-mono">({formatRupiah(selectedSlip.total_deductions)})</span>
							</div>
						</div>
					</div>

					<!-- Tanda Tangan Resmi & QR Verifikasi Otentik -->
					<div class="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs">
						<div class="space-y-1">
							<p class="text-[11px] text-slate-400">Penerima (Karyawan):</p>
							<p class="font-bold text-on-surface pt-8 underline">{selectedSlip.employee_name}</p>
							<p class="text-[10px] text-slate-400">NIK: {selectedSlip.employee_nik}</p>
						</div>
						<div class="text-right space-y-1">
							<p class="text-[11px] text-slate-400">Cilegon, {selectedSlip.period_date}</p>
							<p class="font-bold text-on-surface">PT. BUANA CENTRA SWAKARSA</p>
							<p class="text-[10px] text-emerald-600 font-mono font-bold">✅ VALID DIGITALLY SIGNED</p>
							<p class="text-[10px] text-slate-400">Payroll & HRD Division</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Footer Modal -->
			<div class="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center border-t border-slate-200 dark:border-slate-800 print:hidden">
				<p class="text-[10px] text-slate-400">Dokumen Rahasia & Otentik - PT. Buana Centra Swakarsa</p>
				<div class="flex gap-2">
					<button
						onclick={closeModal}
						class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
					>
						Tutup
					</button>
					<button
						onclick={() => window.print()}
						class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
					>
						<span class="material-symbols-outlined text-sm">print</span>
						<span>Cetak Slip Resmi (A4)</span>
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL FORM AJUKAN KLAIM REIMBURSEMENT BARU -->
{#if showClaimModal}
	<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div class="flex items-center gap-2.5">
					<div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
						<span class="material-symbols-outlined text-xl">medical_services</span>
					</div>
					<div>
						<h3 class="font-bold text-sm text-on-surface">Ajukan Klaim Reimbursement</h3>
						<p class="text-[11px] text-on-surface-variant">Benefit kesehatan & operasional karyawan BCS</p>
					</div>
				</div>
				<button onclick={() => (showClaimModal = false)} class="text-slate-400 hover:text-slate-600 cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/submitReimbursement" class="space-y-3 text-xs">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="font-bold text-on-surface block mb-1">NIK Karyawan</label>
						<input type="text" name="employee_nik" placeholder="Contoh: 0807.0747" required class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 font-mono" />
					</div>
					<div>
						<label class="font-bold text-on-surface block mb-1">Nama Karyawan</label>
						<input type="text" name="employee_name" placeholder="Nama lengkap..." required class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="font-bold text-on-surface block mb-1">Kategori Klaim</label>
						<select name="claim_type" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 font-semibold cursor-pointer">
							<option value="Rawat Jalan & Obat">Rawat Jalan & Obat</option>
							<option value="Kacamata & Lensa">Kacamata & Lensa</option>
							<option value="Rawat Inap & Bersalin">Rawat Inap & Bersalin</option>
							<option value="Operasional / Dinas">Operasional / Dinas</option>
						</select>
					</div>
					<div>
						<label class="font-bold text-on-surface block mb-1">Divisi</label>
						<select name="employee_division" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 font-semibold cursor-pointer">
							<option value="LOGISTIK">LOGISTIK (Driver & Kru)</option>
							<option value="WORKSHOP">WORKSHOP (Mekanik)</option>
							<option value="FINANCE">FINANCE</option>
							<option value="HRD">HRD</option>
							<option value="OPERASIONAL">OPERASIONAL</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="font-bold text-on-surface block mb-1">Nama Fasilitas / Vendor</label>
						<input type="text" name="merchant_name" placeholder="Contoh: RS Krakatau Medika / Optik" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800" />
					</div>
					<div>
						<label class="font-bold text-on-surface block mb-1">No. Invoice / Kuitansi</label>
						<input type="text" name="invoice_number" placeholder="No struk / kuitansi..." class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 font-mono" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="font-bold text-on-surface block mb-1">Tanggal Kuitansi</label>
						<input type="date" name="claim_date" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800" />
					</div>
					<div>
						<label class="font-bold text-on-surface block mb-1">Nominal Pengajuan (Rp)</label>
						<input type="number" name="amount" placeholder="0" required class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 font-mono font-bold text-emerald-600" />
					</div>
				</div>

				<div>
					<label class="font-bold text-on-surface block mb-1">Keterangan / Diagnosa</label>
					<textarea name="description" rows="2" placeholder="Uraian keperluan klaim atau diagnosa..." class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 resize-none"></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => (showClaimModal = false)} class="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-slate-100 cursor-pointer">
						Batal
					</button>
					<button type="submit" class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 cursor-pointer shadow-xs flex items-center gap-1">
						<span class="material-symbols-outlined text-sm">send</span>
						<span>Kirim Pengajuan Klaim</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	@media print {
		:global(body *) {
			visibility: hidden;
		}
		:global(.print\\:block),
		:global(.print\\:w-full),
		:global(.print\\:p-0) {
			visibility: visible;
		}
	}
</style>

