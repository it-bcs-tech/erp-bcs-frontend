<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	// Active tab: PO or PR
	let activeTab = $state<'po' | 'pr'>('po');

	// Form states
	let poName = $state(data.approvalPo?.name || '');
	let poPosition = $state(data.approvalPo?.position || '');
	let poPayrollId = $state(data.approvalPo?.payroll_id || '');

	let prName = $state(data.approvalPr?.name || '');
	let prPosition = $state(data.approvalPr?.position || '');
	let prPayrollId = $state(data.approvalPr?.payroll_id || '');

	let isSaving = $state(false);
	let saveMessage = $state('');

	// Keep local state synced if data updates
	$effect(() => {
		if (data.approvalPo) {
			poName = data.approvalPo.name || '';
			poPosition = data.approvalPo.position || '';
			poPayrollId = data.approvalPo.payroll_id || '';
		}
		if (data.approvalPr) {
			prName = data.approvalPr.name || '';
			prPosition = data.approvalPr.position || '';
			prPayrollId = data.approvalPr.payroll_id || '';
		}
	});

	$effect(() => {
		if (form?.message) {
			saveMessage = form.message;
			const timer = setTimeout(() => {
				saveMessage = '';
			}, 4000);
			return () => clearTimeout(timer);
		}
	});

	function handleEmployeeSelect(e: Event, docType: 'po' | 'pr') {
		const target = e.target as HTMLSelectElement;
		const payrollId = target.value;
		if (!payrollId) return;

		const emp = data.employees?.find((em: any) => em.payrollId === payrollId);
		if (emp) {
			if (docType === 'po') {
				poName = emp.name;
				poPayrollId = emp.payrollId;
				if (emp.position) poPosition = emp.position;
			} else {
				prName = emp.name;
				prPayrollId = emp.payrollId;
				if (emp.position) prPosition = emp.position;
			}
		}
		target.value = '';
	}

	function getTodayFormatted(): string {
		return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Pengaturan Modul PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
				<span class="material-symbols-outlined text-2xl">tune</span>
			</div>
			<div>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Pengaturan Modul PMS</h1>
				<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
					Konfigurasi pejabat penandatangan (Approved By) pada lembar cetak Purchase Order & Purchase Request
				</p>
			</div>
		</div>

		<!-- Toast Feedback -->
		{#if saveMessage}
			<div class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs font-bold shadow-xs">
				<span class="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
				<span>{saveMessage}</span>
			</div>
		{/if}
	</header>

	<!-- Tabs Selector -->
	<div class="inline-flex p-1.5 rounded-2xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 gap-1 shadow-xs w-fit">
		<button
			type="button"
			onclick={() => activeTab = 'po'}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {activeTab === 'po'
				? 'bg-amber-600 text-white shadow-xs'
				: 'text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-sm">print</span>
			<span>Approved By - Cetak PO</span>
		</button>

		<button
			type="button"
			onclick={() => activeTab = 'pr'}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer {activeTab === 'pr'
				? 'bg-amber-600 text-white shadow-xs'
				: 'text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-sm">description</span>
			<span>Approved By - Cetak PR</span>
		</button>
	</div>

	<!-- TAB 1: Approved By Purchase Order (PO) -->
	{#if activeTab === 'po'}
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
			<!-- Left: Form Configuration -->
			<div class="lg:col-span-7 bg-surface-container-lowest rounded-2xl border border-slate-200/70 dark:border-slate-800/70 p-6 shadow-xs">
				<div class="flex items-center justify-between pb-4 mb-5 border-b border-slate-200/60 dark:border-slate-800/60">
					<div>
						<h2 class="text-base font-black text-on-surface">Pejabat Penandatangan Cetak PO</h2>
						<p class="text-xs text-on-surface-variant mt-0.5">
							Nama dan jabatan pejabat yang akan tampil di kolom "Disetujui Oleh" pada cetakan Purchase Order
						</p>
					</div>
					<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono">
						PO Print
					</span>
				</div>

				<form
					method="POST"
					action="?/saveApproval"
					use:enhance={() => {
						isSaving = true;
						return async ({ update }) => {
							isSaving = false;
							await update();
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="docType" value="po" />
					<input type="hidden" name="payrollId" value={poPayrollId} />

					<!-- Quick Select from Employee Master -->
					<div>
						<label for="po-employee-select" class="block text-xs font-bold text-on-surface-variant mb-1.5">
							Pilih Cepat dari Master Karyawan (Opsional)
						</label>
						<select
							id="po-employee-select"
							onchange={(e) => handleEmployeeSelect(e, 'po')}
							class="w-full px-3.5 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
						>
							<option value="">-- Pilih Karyawan untuk Mengisi Otomatis --</option>
							{#each data.employees as emp}
								<option value={emp.payrollId}>
									{emp.name} ({emp.payrollId}) {emp.position ? `- ${emp.position}` : ''}
								</option>
							{/each}
						</select>
						<p class="text-[11px] text-slate-500 mt-1">
							Memilih dari dropdown akan mengisi otomatis Nama dan Jabatan di bawah. Anda tetap dapat mengubah teksnya secara manual.
						</p>
					</div>

					<!-- Name Input -->
					<div>
						<label for="po-name-input" class="block text-xs font-bold text-on-surface mb-1.5">
							Nama Lengkap Pejabat <span class="text-rose-500">*</span>
						</label>
						<input
							id="po-name-input"
							type="text"
							name="name"
							bind:value={poName}
							placeholder="Contoh: Irwan Gunawan, S.T."
							required
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-amber-500/40"
						/>
					</div>

					<!-- Position Input -->
					<div>
						<label for="po-position-input" class="block text-xs font-bold text-on-surface mb-1.5">
							Jabatan Resmi Pejabat <span class="text-rose-500">*</span>
						</label>
						<input
							id="po-position-input"
							type="text"
							name="position"
							bind:value={poPosition}
							placeholder="Contoh: Procurement Manager"
							required
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-amber-500/40"
						/>
					</div>

					<!-- Submit Button -->
					<div class="pt-3 flex justify-end">
						<button
							type="submit"
							disabled={isSaving || !poName.trim() || !poPosition.trim()}
							class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{#if isSaving}
								<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
								<span>Menyimpan...</span>
							{:else}
								<span class="material-symbols-outlined text-sm">save</span>
								<span>Simpan Pejabat PO</span>
							{/if}
						</button>
					</div>
				</form>
			</div>

			<!-- Right: Live Print Preview -->
			<div class="lg:col-span-5 bg-surface-container-lowest rounded-2xl border border-slate-200/70 dark:border-slate-800/70 p-6 shadow-xs space-y-4">
				<div class="flex items-center gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
					<span class="material-symbols-outlined text-amber-600 text-lg">visibility</span>
					<h3 class="text-xs font-black uppercase tracking-wider text-on-surface">Preview Tanda Tangan Cetak PO</h3>
				</div>

				<p class="text-[11px] text-slate-500">
					Format berikut akan tampil pada lembar cetak PO fisik maupun PDF:
				</p>

				<!-- Paper Box Preview -->
				<div class="bg-white p-6 rounded-xl border border-slate-300 shadow-inner flex flex-col items-center justify-between text-center min-h-[140px]">
					<div>
						<p class="text-[11px] font-bold text-slate-700 leading-tight">Disetujui Oleh,</p>
						<p class="text-[10px] text-slate-500">{poPosition || 'Procurement Manager'}</p>
					</div>
					<div class="mt-8">
						<p class="font-bold text-[11px] text-slate-900 border-b border-slate-800 inline-block px-4 pb-0.5">
							( {poName || '..................................................'} )
						</p>
						<p class="text-[9px] text-slate-500 mt-1">Tgl: {getTodayFormatted()}</p>
					</div>
				</div>

				<div class="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
					<strong>Catatan:</strong> Format tanda tangan ini diselaraskan sama persis dengan kolom "Dibuat Oleh" (label, jabatan, nama bergaris bawah di dalam kurung, dan tanggal cetak).
				</div>
			</div>
		</div>
	{/if}

	<!-- TAB 2: Approved By Purchase Request (PR) -->
	{#if activeTab === 'pr'}
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
			<!-- Left: Form Configuration -->
			<div class="lg:col-span-7 bg-surface-container-lowest rounded-2xl border border-slate-200/70 dark:border-slate-800/70 p-6 shadow-xs">
				<div class="flex items-center justify-between pb-4 mb-5 border-b border-slate-200/60 dark:border-slate-800/60">
					<div>
						<h2 class="text-base font-black text-on-surface">Pejabat Penandatangan Cetak PR</h2>
						<p class="text-xs text-on-surface-variant mt-0.5">
							Nama dan jabatan pejabat yang akan tampil di kolom "Disetujui Oleh" pada cetakan Purchase Request
						</p>
					</div>
					<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 font-mono">
						PR Print
					</span>
				</div>

				<form
					method="POST"
					action="?/saveApproval"
					use:enhance={() => {
						isSaving = true;
						return async ({ update }) => {
							isSaving = false;
							await update();
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="docType" value="pr" />
					<input type="hidden" name="payrollId" value={prPayrollId} />

					<!-- Quick Select from Employee Master -->
					<div>
						<label for="pr-employee-select" class="block text-xs font-bold text-on-surface-variant mb-1.5">
							Pilih Cepat dari Master Karyawan (Opsional)
						</label>
						<select
							id="pr-employee-select"
							onchange={(e) => handleEmployeeSelect(e, 'pr')}
							class="w-full px-3.5 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
						>
							<option value="">-- Pilih Karyawan untuk Mengisi Otomatis --</option>
							{#each data.employees as emp}
								<option value={emp.payrollId}>
									{emp.name} ({emp.payrollId}) {emp.position ? `- ${emp.position}` : ''}
								</option>
							{/each}
						</select>
						<p class="text-[11px] text-slate-500 mt-1">
							Memilih dari dropdown akan mengisi otomatis Nama dan Jabatan di bawah. Anda tetap dapat mengubah teksnya secara manual.
						</p>
					</div>

					<!-- Name Input -->
					<div>
						<label for="pr-name-input" class="block text-xs font-bold text-on-surface mb-1.5">
							Nama Lengkap Pejabat <span class="text-rose-500">*</span>
						</label>
						<input
							id="pr-name-input"
							type="text"
							name="name"
							bind:value={prName}
							placeholder="Contoh: Andi Riswanto, S.T."
							required
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-amber-500/40"
						/>
					</div>

					<!-- Position Input -->
					<div>
						<label for="pr-position-input" class="block text-xs font-bold text-on-surface mb-1.5">
							Jabatan Resmi Pejabat <span class="text-rose-500">*</span>
						</label>
						<input
							id="pr-position-input"
							type="text"
							name="position"
							bind:value={prPosition}
							placeholder="Contoh: Head of Operations"
							required
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-amber-500/40"
						/>
					</div>

					<!-- Submit Button -->
					<div class="pt-3 flex justify-end">
						<button
							type="submit"
							disabled={isSaving || !prName.trim() || !prPosition.trim()}
							class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{#if isSaving}
								<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
								<span>Menyimpan...</span>
							{:else}
								<span class="material-symbols-outlined text-sm">save</span>
								<span>Simpan Pejabat PR</span>
							{/if}
						</button>
					</div>
				</form>
			</div>

			<!-- Right: Live Print Preview -->
			<div class="lg:col-span-5 bg-surface-container-lowest rounded-2xl border border-slate-200/70 dark:border-slate-800/70 p-6 shadow-xs space-y-4">
				<div class="flex items-center gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
					<span class="material-symbols-outlined text-blue-600 text-lg">visibility</span>
					<h3 class="text-xs font-black uppercase tracking-wider text-on-surface">Preview Tanda Tangan Cetak PR</h3>
				</div>

				<p class="text-[11px] text-slate-500">
					Format berikut akan tampil pada lembar cetak PR fisik maupun PDF:
				</p>

				<!-- Paper Box Preview -->
				<div class="bg-white p-6 rounded-xl border border-slate-300 shadow-inner flex flex-col items-center justify-between text-center min-h-[140px]">
					<div>
						<p class="text-[11px] font-bold text-slate-700 leading-tight">Disetujui Oleh,</p>
						<p class="text-[10px] text-slate-500">{prPosition || 'Head of Operations'}</p>
					</div>
					<div class="mt-8">
						<p class="font-bold text-[11px] text-slate-900 border-b border-slate-800 inline-block px-4 pb-0.5">
							( {prName || '..................................................'} )
						</p>
						<p class="text-[9px] text-slate-500 mt-1">Tgl: {getTodayFormatted()}</p>
					</div>
				</div>

				<div class="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
					<strong>Catatan:</strong> Pejabat PR ini akan menggantikan tanda tangan titik-titik pada kolom ke-3 lembar cetak Purchase Request.
				</div>
			</div>
		</div>
	{/if}
</div>
