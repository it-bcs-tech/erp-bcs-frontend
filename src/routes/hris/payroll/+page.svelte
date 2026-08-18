<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();

	let selectedPeriod = $state(data.selectedPeriod);
	let searchQuery = $state(data.searchQuery);
	let selectedDivision = $state(data.divisionFilter);

	let selectedSlip = $state<any>(null);
	let showModal = $state(false);

	function formatRupiah(val: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(val || 0);
	}

	function handleFilterChange() {
		const query = new URLSearchParams();
		if (selectedPeriod) query.set('period', selectedPeriod);
		if (searchQuery) query.set('search', searchQuery);
		if (selectedDivision) query.set('division', selectedDivision);

		goto(`/hris/payroll?${query.toString()}`, { keepFocus: true, noScroll: true });
	}

	function openSlipModal(slip: any) {
		selectedSlip = slip;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		selectedSlip = null;
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
</script>

<svelte:head>
	<title>HRD Payroll & Salary Slips | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Top Bar / Header -->
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
		<div>
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-primary text-2xl">payments</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">HRD Payroll & Salary Slips</h1>
			</div>
			<p class="text-sm text-on-surface-variant font-medium mt-0.5">
				Pengelolaan Penggajian, Tunjangan, Potongan, dan Slip Gaji Staff Officer BCS
			</p>
		</div>

		<div class="flex items-center gap-3">
			<a
				href="/hris/payroll/loans"
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-low text-on-surface font-semibold text-sm hover:bg-surface-container transition-all"
			>
				<span class="material-symbols-outlined text-lg">credit_score</span>
				<span>Kasbon & Pinjaman</span>
			</a>
			<button
				onclick={exportBankFile}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
			>
				<span class="material-symbols-outlined text-lg">file_download</span>
				<span>Export Bank Transfer</span>
			</button>
		</div>
	</div>

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
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Gross Salary</p>
					<h3 class="text-xl font-black text-on-surface mt-1">{formatRupiah(data.summary.sum_gross)}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">account_balance_wallet</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 font-medium mt-2">Gaji Pokok & Total Tunjangan</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs relative overflow-hidden">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Potongan (Deductions)</p>
					<h3 class="text-xl font-black text-rose-600 mt-1">{formatRupiah(data.summary.sum_deductions)}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">remove_circle_outline</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2">BPJS + Tax + Absensi + Pinjaman</p>
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
					class="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-on-surface focus:ring-2 focus:ring-primary/20"
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
						class="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20"
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
								Tidak ada data payroll ditemukan untuk periode/filter ini.
							</td>
						</tr>
					{:else}
						{#each data.salarySlips as slip}
							<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
								<td class="px-5 py-4">
									<div>
										<p class="font-bold text-on-surface">{slip.employee_name}</p>
										<p class="text-xs text-on-surface-variant font-mono mt-0.5">NIK: {slip.employee_nik}</p>
									</div>
								</td>
								<td class="px-5 py-4">
									<div>
										<p class="font-semibold text-on-surface">{slip.employee_position || '-'}</p>
										<p class="text-xs text-on-surface-variant mt-0.5">{slip.employee_division || '-'}</p>
									</div>
								</td>
								<td class="px-5 py-4 font-medium text-on-surface">
									{formatRupiah(slip.basic_salary)}
								</td>
								<td class="px-5 py-4 font-semibold text-emerald-600">
									{formatRupiah(slip.gross_salary)}
								</td>
								<td class="px-5 py-4 font-medium text-rose-600">
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
</div>

<!-- Modal Detail Slip Gaji (Format Eksak PT. Buana Centra Swakarsa) -->
{#if showModal && selectedSlip}
	<div class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
		<div class="bg-surface rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden my-4 print:my-0 print:border-none print:shadow-none print:w-full">
			<!-- Header Mobile Style -->
			<div class="px-6 pt-6 pb-3 flex items-center justify-between">
				<button onclick={closeModal} class="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-on-surface transition-colors cursor-pointer print:hidden">
					<span class="material-symbols-outlined">arrow_back</span>
				</button>
				<h2 class="text-lg font-black text-on-surface tracking-tight">Slip Gaji</h2>
				<button onclick={() => window.print()} class="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-primary transition-colors cursor-pointer print:hidden" title="Unduh PDF">
					<span class="material-symbols-outlined">download</span>
				</button>
			</div>

			<!-- Periode Selector Tag -->
			<div class="flex justify-center pb-4">
				<div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-on-surface border border-slate-200 dark:border-slate-700 shadow-2xs">
					<span class="material-symbols-outlined text-sm text-slate-400">calendar_month</span>
					<span>{selectedSlip.period_display || selectedSlip.period_date}</span>
					<span class="material-symbols-outlined text-sm text-slate-400">arrow_drop_down</span>
				</div>
			</div>

			<!-- Scrollable Slip Content -->
			<div class="px-5 pb-6 space-y-4 max-h-[75vh] overflow-y-auto">
				<!-- Blue Main Card: Gaji Bersih (Take Home Pay) -->
				<div class="p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg space-y-3 relative overflow-hidden">
					<div class="flex items-center justify-between">
						<span class="text-xs font-medium text-blue-100">Gaji Bersih (Take Home Pay)</span>
						<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/50 text-[10px] font-bold text-white uppercase tracking-wider border border-white/20">
							✓ DIBAYARKAN
						</span>
					</div>

					<div class="space-y-0.5">
						<h3 class="text-2xl sm:text-3xl font-black tracking-tight">{formatRupiah(selectedSlip.net_salary)}</h3>
						<p class="text-xs text-blue-100 font-medium">
							Ditransfer ke Bank {selectedSlip.bank_name || 'BNI'} •••• {selectedSlip.account_number ? selectedSlip.account_number.slice(-4) : '1234'}
						</p>
					</div>

					<div class="pt-2 flex items-center justify-between border-t border-white/20 text-xs text-blue-100">
						<span>Periode: {selectedSlip.period_display || selectedSlip.period_date}</span>
						<div class="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
							<span class="material-symbols-outlined text-sm">visibility</span>
						</div>
					</div>
				</div>

				<!-- Section: PENDAPATAN -->
				<div class="space-y-2">
					<p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">PENDAPATAN</p>
					
					<div class="bg-surface-container-low rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs space-y-3 text-xs">
						<!-- Gaji Pokok -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
									$
								</div>
								<span class="font-medium text-on-surface">Gaji Pokok</span>
							</div>
							<span class="font-bold text-on-surface">{formatRupiah(selectedSlip.basic_salary)}</span>
						</div>

						<!-- Tunj. Profesi/Kontribusi -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
									$
								</div>
								<span class="font-medium text-on-surface">Tunj. Profesi/Kontribusi</span>
							</div>
							<span class="font-bold text-on-surface">{formatRupiah(selectedSlip.professional_allowance)}</span>
						</div>

						<!-- Tunj. Prestasi -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
									$
								</div>
								<span class="font-medium text-on-surface">Tunj. Prestasi</span>
							</div>
							<span class="font-bold text-on-surface">{formatRupiah(selectedSlip.performance_allowance)}</span>
						</div>

						<!-- Tunj. Jabatan -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
									$
								</div>
								<span class="font-medium text-on-surface">Tunj. Jabatan</span>
							</div>
							<span class="font-bold text-on-surface">{formatRupiah(selectedSlip.position_allowance)}</span>
						</div>

						<!-- Uang Makan -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
									<span class="material-symbols-outlined text-sm">shopping_bag</span>
								</div>
								<span class="font-medium text-on-surface">Uang Makan</span>
							</div>
							<span class="font-bold text-on-surface">{formatRupiah(selectedSlip.meal_allowance)}</span>
						</div>

						<!-- Transport -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
									<span class="material-symbols-outlined text-sm">shopping_bag</span>
								</div>
								<span class="font-medium text-on-surface">Transport</span>
							</div>
							<span class="font-bold text-on-surface">{formatRupiah(selectedSlip.transport_allowance)}</span>
						</div>

						<!-- Tunj. Relokasi -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
									<span class="material-symbols-outlined text-sm">shopping_bag</span>
								</div>
								<span class="font-medium text-on-surface">Tunj. Relokasi</span>
							</div>
							<span class="font-bold text-on-surface">{formatRupiah(selectedSlip.relocation_allowance)}</span>
						</div>

						<!-- Tunj. Skill -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
									<span class="material-symbols-outlined text-sm">shopping_bag</span>
								</div>
								<span class="font-medium text-on-surface">Tunj. Skill</span>
							</div>
							<span class="font-bold text-on-surface">{formatRupiah(selectedSlip.skill_allowance)}</span>
						</div>

						<!-- Tunj. Lain-lain -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
									<span class="material-symbols-outlined text-sm">shopping_bag</span>
								</div>
								<span class="font-medium text-on-surface">Tunj. Lain-lain</span>
							</div>
							<span class="font-bold text-on-surface">{formatRupiah(selectedSlip.other_allowance)}</span>
						</div>

						<!-- Insentif -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
									<span class="material-symbols-outlined text-sm">shopping_bag</span>
								</div>
								<span class="font-medium text-on-surface">Insentif</span>
							</div>
							<span class="font-bold text-on-surface">{formatRupiah(selectedSlip.incentive)}</span>
						</div>

						<!-- Tunj. Komunikasi -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
									<span class="material-symbols-outlined text-sm">shopping_bag</span>
								</div>
								<span class="font-medium text-on-surface">Tunj. Komunikasi</span>
							</div>
							<span class="font-bold text-on-surface">{formatRupiah(selectedSlip.communication_allowance)}</span>
						</div>

						<!-- Lembur -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
									<span class="material-symbols-outlined text-sm">shopping_bag</span>
								</div>
								<span class="font-medium text-on-surface">Lembur {selectedSlip.overtime_hours || '0.00'} jam</span>
							</div>
							<span class="font-bold text-on-surface">{formatRupiah(selectedSlip.overtime_allowance)}</span>
						</div>

						<!-- KHK -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
									<span class="material-symbols-outlined text-sm">shopping_bag</span>
								</div>
								<span class="font-medium text-on-surface">KHK</span>
							</div>
							<span class="font-bold text-on-surface">{formatRupiah(selectedSlip.khk_allowance)}</span>
						</div>

						<!-- Total Pendapatan -->
						<div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm">
							<span class="font-bold text-on-surface">Total Pendapatan</span>
							<span class="font-black text-emerald-600">{formatRupiah(selectedSlip.gross_salary)}</span>
						</div>
					</div>
				</div>

				<!-- Section: POTONGAN -->
				<div class="space-y-2">
					<p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">POTONGAN</p>
					
					<div class="bg-surface-container-low rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs space-y-3 text-xs">
						<!-- Zakat, Infak, Sodaqoh -->
						<div class="flex items-center justify-between">
							<span class="font-medium text-on-surface">Zakat, Infak, Sodaqoh</span>
							<span class="font-bold text-rose-500">- {formatRupiah(selectedSlip.zakat)}</span>
						</div>

						<!-- Pajak/PPH.21 -->
						<div class="flex items-center justify-between">
							<span class="font-medium text-on-surface">Pajak/PPH.21</span>
							<span class="font-bold text-rose-500">- {formatRupiah(selectedSlip.tax)}</span>
						</div>

						<!-- BPJS -->
						<div class="flex items-center justify-between">
							<span class="font-medium text-on-surface">BPJS</span>
							<span class="font-bold text-rose-500">- {formatRupiah(selectedSlip.bpjs)}</span>
						</div>

						<!-- Iuran SP-BCS -->
						<div class="flex items-center justify-between">
							<span class="font-medium text-on-surface">Iuran SP-BCS</span>
							<span class="font-bold text-rose-500">- {formatRupiah(selectedSlip.union_fee)}</span>
						</div>

						<!-- Alpa/Absen -->
						<div class="flex items-center justify-between">
							<span class="font-medium text-on-surface">Alpa/Absen ({selectedSlip.absence_days || '0'})</span>
							<span class="font-bold text-rose-500">- {formatRupiah(selectedSlip.absence_deduction)}</span>
						</div>

						<!-- Koperasi -->
						<div class="flex items-center justify-between">
							<span class="font-medium text-on-surface">Koperasi</span>
							<span class="font-bold text-rose-500">- {formatRupiah(selectedSlip.cooperative)}</span>
						</div>

						<!-- Angsuran BPR -->
						<div class="flex items-center justify-between">
							<span class="font-medium text-on-surface">Angsuran BPR</span>
							<span class="font-bold text-rose-500">- {formatRupiah(selectedSlip.bpr_installment)}</span>
						</div>

						<!-- Lain-lain -->
						<div class="flex items-center justify-between">
							<span class="font-medium text-on-surface">Lain-lain</span>
							<span class="font-bold text-rose-500">- {formatRupiah(selectedSlip.other_deduction)}</span>
						</div>

						<!-- Total Potongan -->
						<div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm">
							<span class="font-bold text-on-surface">Total Potongan</span>
							<span class="font-black text-rose-600">({formatRupiah(selectedSlip.total_deductions)})</span>
						</div>
					</div>
				</div>

				<!-- Footer Legal PT. Buana Centra Swakarsa -->
				<div class="text-center pt-2 pb-1 text-slate-400 space-y-0.5">
					<p class="text-xs font-bold text-on-surface">PT. Buana Centra Swakarsa</p>
					<p class="text-[10px]">Confidential • Generated on 18 Aug 2026</p>
				</div>

				<!-- Full Width Download Button -->
				<button
					onclick={() => window.print()}
					class="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all print:hidden"
				>
					<span class="material-symbols-outlined text-lg">download</span>
					<span>Unduh PDF</span>
				</button>
			</div>
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
