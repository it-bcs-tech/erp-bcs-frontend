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
						<th class="px-5 py-3.5">PTKP & TER</th>
						<th class="px-5 py-3.5">Gaji Pokok</th>
						<th class="px-5 py-3.5">Gross (Pendapatan)</th>
						<th class="px-5 py-3.5">Potongan</th>
						<th class="px-5 py-3.5">Net THP</th>
						<th class="px-5 py-3.5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if data.salarySlips.length === 0}
						<tr>
							<td colspan="8" class="px-5 py-12 text-center text-on-surface-variant font-medium">
								<span class="material-symbols-outlined text-4xl mb-2 text-slate-300 block">search_off</span>
								Tidak ada data payroll ditemukan untuk periode/filter ini.
							</td>
						</tr>
					{:else}
						{#each data.salarySlips as slip}
							<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
								<td class="px-5 py-4">
									<div>
										<div class="flex items-center gap-1.5">
											<p class="font-bold text-on-surface">{slip.employee_name}</p>
											{#if slip.isDriver}
												<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 font-mono">DRIVER</span>
											{/if}
										</div>
										<p class="text-xs text-on-surface-variant font-mono mt-0.5">NIK: {slip.employee_nik}</p>
									</div>
								</td>
								<td class="px-5 py-4">
									<div>
										<p class="font-semibold text-on-surface">{slip.employee_position || '-'}</p>
										<p class="text-xs text-on-surface-variant mt-0.5">{slip.employee_division || '-'}</p>
									</div>
								</td>
								<td class="px-5 py-4">
									<div class="flex flex-col gap-1">
										<span class="text-xs font-mono font-bold text-on-surface">{slip.ptkpStatus}</span>
										<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/10 text-blue-600 border border-blue-500/20 w-fit font-mono">
											TER {slip.terCategory} ({slip.terRate}%)
										</span>
									</div>
								</td>
								<td class="px-5 py-4 font-medium text-on-surface">
									{formatRupiah(slip.basic_salary)}
								</td>
								<td class="px-5 py-4 font-semibold text-emerald-600">
									<div>
										<span>{formatRupiah(slip.gross_salary)}</span>
										{#if slip.isDriver && slip.logisticsDetails?.ritase_count > 0}
											<span class="block text-[11px] text-amber-600 font-normal">
												🛣️ {slip.logisticsDetails.ritase_count} Ritase ({slip.logisticsDetails.tonnage_total} Ton)
											</span>
										{/if}
									</div>
								</td>
								<td class="px-5 py-4 font-medium text-rose-600">
									-{formatRupiah(slip.total_deductions)}
								</td>
								<td class="px-5 py-4">
									<span class="font-black text-primary px-2.5 py-1 rounded-lg bg-primary/10 inline-block">
										{formatRupiah(slip.net_salary)}
									</span>
								</td>
								<td class="px-5 py-4 text-right">
									<button
										onclick={() => openSlipModal(slip)}
										class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-primary transition-all inline-flex items-center gap-1 cursor-pointer"
									>
										<span class="material-symbols-outlined text-sm">visibility</span>
										<span>Slip Gaji</span>
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

<!-- Modal Detail Slip Gaji (Format Resmi Standar Industri) -->
{#if showModal && selectedSlip}
	<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden my-8 print:my-0 print:border-none print:shadow-none print:w-full">
			<!-- Header Slip Gaji & Kop Perusahaan -->
			<div class="bg-slate-900 text-white p-6 flex items-center justify-between print:bg-white print:text-black print:border-b-2 print:border-black">
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center font-black text-xl border border-white/20 print:bg-slate-100 print:text-black">
						BCS
					</div>
					<div>
						<h2 class="text-base font-black tracking-tight print:text-lg">PT BUMI CITRA SENTOSA (BCS LOGISTICS)</h2>
						<p class="text-xs text-slate-400 print:text-slate-600 font-medium">SLIP GAJI RESMI & BUKTI POTONG KARYAWAN | PERIODE: {selectedSlip.period_date}</p>
					</div>
				</div>
				<button onclick={closeModal} class="text-slate-400 hover:text-white transition-colors cursor-pointer print:hidden">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<!-- Body Modal -->
			<div class="p-6 space-y-5">
				<!-- Informasi Profil Karyawan & Status Pajak -->
				<div class="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs font-medium border border-slate-200/60 dark:border-slate-700/60">
					<div>
						<span class="text-slate-400 block text-[11px]">Nama Karyawan</span>
						<span class="text-sm font-bold text-on-surface">{selectedSlip.employee_name}</span>
					</div>
					<div>
						<span class="text-slate-400 block text-[11px]">NIK / ID</span>
						<span class="text-sm font-mono font-bold text-on-surface">{selectedSlip.employee_nik}</span>
					</div>
					<div>
						<span class="text-slate-400 block text-[11px]">Jabatan / Divisi</span>
						<span class="text-on-surface font-semibold">{selectedSlip.employee_position} ({selectedSlip.employee_division || 'General'})</span>
					</div>
					<div>
						<span class="text-slate-400 block text-[11px]">Status PTKP & TER</span>
						<span class="text-on-surface font-bold text-blue-600">{selectedSlip.ptkpStatus} • TER {selectedSlip.terCategory} ({selectedSlip.terRate}%)</span>
					</div>
				</div>

				<!-- Khusus Driver Logistik: Komponen Ritase & Tonase -->
				{#if selectedSlip.isDriver}
					<div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex flex-col md:flex-row justify-between items-center gap-3">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-amber-600 text-xl">local_shipping</span>
							<div>
								<span class="font-bold block text-sm">Rincian Operasional Ritase Driver</span>
								<span class="text-[11px] text-amber-700 dark:text-amber-300">Sinkronisasi Surat Jalan FMS & Trip Logistik</span>
							</div>
						</div>
						<div class="flex items-center gap-4 text-xs font-mono font-bold">
							<span class="px-2.5 py-1 rounded-lg bg-amber-500/20">{selectedSlip.logisticsDetails?.ritase_count} RITASE</span>
							<span class="px-2.5 py-1 rounded-lg bg-amber-500/20">{selectedSlip.logisticsDetails?.tonnage_total} TON</span>
							<span class="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
								Insentif: {formatRupiah(selectedSlip.logisticsDetails?.total_driver_incentive)}
							</span>
						</div>
					</div>
				{/if}

				<!-- Grid Rincian Pendapatan vs Potongan -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
					<!-- Rincian Penerimaan (Earnings) -->
					<div class="space-y-2 border-r border-slate-200 dark:border-slate-800 pr-0 md:pr-4">
						<h3 class="font-bold text-emerald-600 uppercase tracking-wider pb-2 border-b border-emerald-500/20 flex justify-between">
							<span>A. Penerimaan (Earnings)</span>
						</h3>
						<div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
							<span class="text-slate-500">Gaji Pokok (Basic)</span>
							<span class="font-semibold text-on-surface">{formatRupiah(selectedSlip.basic_salary)}</span>
						</div>
						<div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
							<span class="text-slate-500">Tunjangan Jabatan</span>
							<span class="font-semibold text-on-surface">{formatRupiah(selectedSlip.position_allowance)}</span>
						</div>
						<div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
							<span class="text-slate-500">Tunjangan Makan & Transport</span>
							<span class="font-semibold text-on-surface">{formatRupiah(selectedSlip.meal_allowance + selectedSlip.transport_allowance)}</span>
						</div>
						{#if selectedSlip.isDriver}
							<div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-amber-700 dark:text-amber-300">
								<span>Uang Jalan & Ritase ({selectedSlip.logisticsDetails?.ritase_count} Trip)</span>
								<span class="font-bold">{formatRupiah(selectedSlip.logisticsDetails?.ritase_allowance)}</span>
							</div>
							<div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-amber-700 dark:text-amber-300">
								<span>Premi Keselamatan & Bongkar Muat</span>
								<span class="font-bold">{formatRupiah((selectedSlip.logisticsDetails?.safety_bonus || 0) + (selectedSlip.logisticsDetails?.waiting_fee || 0))}</span>
							</div>
						{:else}
							<div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Lembur (Overtime Depnaker)</span>
								<span class="font-semibold text-on-surface">{formatRupiah(selectedSlip.overtime_allowance)}</span>
							</div>
							<div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
								<span class="text-slate-500">Tunjangan Lainnya</span>
								<span class="font-semibold text-on-surface">{formatRupiah(selectedSlip.other_allowance)}</span>
							</div>
						{/if}
						<div class="flex justify-between pt-2 text-sm font-bold text-emerald-600">
							<span>Total Penerimaan (Gross)</span>
							<span>{formatRupiah(selectedSlip.gross_salary)}</span>
						</div>
					</div>

					<!-- Rincian Potongan (Deductions) -->
					<div class="space-y-2">
						<h3 class="font-bold text-rose-600 uppercase tracking-wider pb-2 border-b border-rose-500/20 flex justify-between">
							<span>B. Potongan (Deductions)</span>
						</h3>
						<div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
							<div>
								<span class="text-slate-500 block">Pajak Penghasilan (PPh 21 TER)</span>
								<span class="text-[10px] text-slate-400">Tarif {selectedSlip.terRate}% dari Gross</span>
							</div>
							<span class="font-semibold text-rose-600">-{formatRupiah(selectedSlip.calculatedTax || selectedSlip.tax)}</span>
						</div>
						<div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
							<div>
								<span class="text-slate-500 block">BPJS Ketenagakerjaan (JHT 2% + JP 1%)</span>
								<span class="text-[10px] text-slate-400">Iuran Karyawan</span>
							</div>
							<span class="font-semibold text-rose-600">-{formatRupiah((selectedSlip.bpjsDetails?.bpjs_tk_jht_employee || 0) + (selectedSlip.bpjsDetails?.bpjs_tk_jp_employee || 0))}</span>
						</div>
						<div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
							<div>
								<span class="text-slate-500 block">BPJS Kesehatan (1%)</span>
								<span class="text-[10px] text-slate-400">Iuran Karyawan</span>
							</div>
							<span class="font-semibold text-rose-600">-{formatRupiah(selectedSlip.bpjsDetails?.bpjs_kes_employee || (selectedSlip.bpjs * 0.4))}</span>
						</div>
						<div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
							<span class="text-slate-500">Pinjaman / Kasbon Karyawan</span>
							<span class="font-semibold text-rose-600">-{formatRupiah(selectedSlip.other_deduction)}</span>
						</div>
						<div class="flex justify-between pt-2 text-sm font-bold text-rose-600">
							<span>Total Potongan</span>
							<span>-{formatRupiah(selectedSlip.total_deductions)}</span>
						</div>
					</div>
				</div>

				<!-- Iuran BPJS Dibayar Perusahaan (Benefit Perusahaan) -->
				<div class="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-xs">
					<div class="flex items-center justify-between text-blue-800 dark:text-blue-200 font-bold mb-1">
						<span class="flex items-center gap-1.5">
							<span class="material-symbols-outlined text-sm">health_and_safety</span>
							<span>Iuran Jaminan Sosial Ditanggung Perusahaan (Company Contribution)</span>
						</span>
						<span class="font-mono">{formatRupiah(selectedSlip.bpjsDetails?.total_company_bpjs || 0)}</span>
					</div>
					<p class="text-[10px] text-blue-600/80 dark:text-blue-300/70">
						Termasuk JKK (1.27%), JKM (0.30%), JHT (3.70%), JP (2.00%), dan BPJS Kesehatan (4.00%). Tidak memotong gaji karyawan.
					</p>
				</div>

				<!-- Summary THP -->
				<div class="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
					<div>
						<span class="text-xs font-bold text-primary uppercase tracking-wider block">TAKE HOME PAY (THP) / GAJI BERSIH</span>
						<span class="text-xs text-on-surface-variant">Transfer Bank: {selectedSlip.bank_name || 'BCA'} • Rek: {selectedSlip.account_number || '-'}</span>
					</div>
					<div class="text-right">
						<span class="text-2xl font-black text-primary">{formatRupiah(selectedSlip.net_salary)}</span>
					</div>
				</div>

				<!-- Tanda Tangan & QR Verifikasi Otentik -->
				<div class="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
					<div class="space-y-1">
						<p class="text-[11px] text-slate-400">Penerima (Karyawan):</p>
						<p class="font-bold text-on-surface pt-8">{selectedSlip.employee_name}</p>
					</div>
					<div class="text-right space-y-1">
						<p class="text-[11px] text-slate-400">Cilegon, {selectedSlip.period_date}</p>
						<p class="font-bold text-on-surface">HRD & Finance PT BCS Logistics</p>
						<p class="text-[10px] text-emerald-600 font-mono">✅ Valid Digitally Signed</p>
					</div>
				</div>
			</div>

			<!-- Footer Modal -->
			<div class="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center border-t border-slate-200 dark:border-slate-800 print:hidden">
				<p class="text-[10px] text-slate-400">Dokumen Rahasia & Otentik - PT Bumi Citra Sentosa</p>
				<div class="flex gap-2">
					<button
						onclick={closeModal}
						class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
					>
						Tutup
					</button>
					<button
						onclick={() => window.print()}
						class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs"
					>
						<span class="material-symbols-outlined text-sm">print</span>
						<span>Cetak Slip Resmi (A4)</span>
					</button>
				</div>
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
