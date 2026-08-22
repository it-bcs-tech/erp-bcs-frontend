<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let activeCategory = $state(data.category);
	let selectedSeverity = $state(data.severity);
	let searchQuery = $state(data.searchQuery);

	let selectedDoc = $state<any>(null);
	let showModal = $state(false);
	let newDocNumber = $state('');
	let newExpireDate = $state('');

	function handleCategoryChange(cat: string) {
		activeCategory = cat;
		updateFilters();
	}

	function handleFilterChange() {
		updateFilters();
	}

	function updateFilters() {
		const query = new URLSearchParams();
		if (activeCategory) query.set('category', activeCategory);
		if (selectedSeverity) query.set('severity', selectedSeverity);
		if (searchQuery) query.set('search', searchQuery);

		goto(`/hris/certifications?${query.toString()}`, { keepFocus: true, noScroll: true });
	}

	function openRenewModal(doc: any) {
		selectedDoc = doc;
		newDocNumber = doc.doc_number || '';
		newExpireDate = doc.expire_date || '';
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		selectedDoc = null;
		newDocNumber = '';
		newExpireDate = '';
	}

	function getSeverityBadge(status: string, days: number) {
		switch (status) {
			case 'expired':
				return { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-500/20', label: 'Kedaluwarsa (Expired)' };
			case 'critical':
				return { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20', label: `Kritis (${days} hr lagi)` };
			case 'warning':
				return { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/20', label: `Warning (${days} hr lagi)` };
			default:
				return { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20', label: 'Valid / Aman' };
		}
	}
</script>

<svelte:head>
	<title>Document Expiry & Certifications | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Top Bar -->
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-primary text-2xl">verified</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Document Expiry & Certifications</h1>
			</div>
			<p class="text-sm text-on-surface-variant font-medium mt-0.5">
				Peringatan Dini Masa Berlaku SIM Driver, Sertifikasi K3 & Kontrak Kerja PKWT
			</p>
		</div>
	</div>

	<!-- Summary Indicator Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Expired Alert -->
		<button
			onclick={() => { selectedSeverity = 'expired'; handleFilterChange(); }}
			class="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 shadow-xs text-left cursor-pointer hover:bg-rose-500/10 transition-all"
		>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-rose-600 uppercase tracking-wider">🔴 Expired / Kedaluwarsa</p>
					<h3 class="text-2xl font-black text-rose-600 mt-1">{data.summary.total_expired} Dokumen</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">warning</span>
				</div>
			</div>
			<p class="text-xs text-rose-600 font-medium mt-2">Telah lewat tanggal kedaluwarsa</p>
		</button>

		<!-- Critical H-30 -->
		<button
			onclick={() => { selectedSeverity = 'critical'; handleFilterChange(); }}
			class="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 shadow-xs text-left cursor-pointer hover:bg-amber-500/10 transition-all"
		>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-amber-600 uppercase tracking-wider">🟠 Critical (H-30)</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{data.summary.total_critical} Dokumen</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">alarm</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 font-medium mt-2">Jatuh tempo kurang dari 30 hari</p>
		</button>

		<!-- Warning H-60 -->
		<button
			onclick={() => { selectedSeverity = 'warning'; handleFilterChange(); }}
			class="p-5 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 shadow-xs text-left cursor-pointer hover:bg-yellow-500/10 transition-all"
		>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-yellow-600 uppercase tracking-wider">🟡 Warning (H-60)</p>
					<h3 class="text-2xl font-black text-yellow-600 mt-1">{data.summary.total_warning} Dokumen</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-yellow-500 text-white flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">schedule</span>
				</div>
			</div>
			<p class="text-xs text-yellow-600 font-medium mt-2">Jatuh tempo 31 - 60 hari</p>
		</button>

		<!-- Valid -->
		<button
			onclick={() => { selectedSeverity = 'valid'; handleFilterChange(); }}
			class="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 shadow-xs text-left cursor-pointer hover:bg-emerald-500/10 transition-all"
		>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-emerald-600 uppercase tracking-wider">🟢 Valid / Aman</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">{data.summary.total_valid} Dokumen</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-2xl">check_circle</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 font-medium mt-2">Masa berlaku masih panjang</p>
		</button>
	</div>

	<!-- 4 Category Tabs (Segmented Control) -->
	<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
		<button
			onclick={() => handleCategoryChange('sim')}
			class="px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap {activeCategory === 'sim' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-sm">badge</span>
			<span>SIM Driver (A/B1/B2)</span>
		</button>

		<button
			onclick={() => handleCategoryChange('contract')}
			class="px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap {activeCategory === 'contract' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-sm">assignment</span>
			<span>Kontrak Kerja PKWT</span>
		</button>

		<button
			onclick={() => handleCategoryChange('k3')}
			class="px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap {activeCategory === 'k3' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-sm">health_and_safety</span>
			<span>Sertifikat K3 & Training</span>
		</button>
	</div>

	<!-- Controls Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between">
		<div class="flex items-center gap-3 w-full md:w-auto">
			<span class="material-symbols-outlined text-slate-400 text-lg">filter_alt</span>
			<select
				bind:value={selectedSeverity}
				onchange={handleFilterChange}
				class="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-on-surface"
			>
				<option value="">Semua Status Severity</option>
				<option value="expired">🔴 Expired / Kedaluwarsa</option>
				<option value="critical">🟠 Critical (H-30 Hari)</option>
				<option value="warning">🟡 Warning (H-60 Hari)</option>
				<option value="valid">🟢 Valid / Aman</option>
			</select>
		</div>

		<div class="relative w-full md:w-72">
			<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
			<input
				type="text"
				placeholder="Cari Nama / NIK / No Dokumen..."
				bind:value={searchQuery}
				oninput={handleFilterChange}
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
			/>
		</div>
	</div>

	{#if form?.message}
		<div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
			<span class="material-symbols-outlined text-sm">check_circle</span>
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="px-5 py-3.5">Karyawan</th>
						<th class="px-5 py-3.5">Jenis Dokumen</th>
						<th class="px-5 py-3.5">Nomor Dokumen</th>
						<th class="px-5 py-3.5">Tanggal Expired</th>
						<th class="px-5 py-3.5">Status Severity</th>
						<th class="px-5 py-3.5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if data.documents.length === 0}
						<tr>
							<td colspan="6" class="px-5 py-12 text-center text-on-surface-variant font-medium">
								<span class="material-symbols-outlined text-4xl text-slate-300 block mb-2">verified_user</span>
								Tidak ada data dokumen ditemukan untuk kriteria ini.
							</td>
						</tr>
					{:else}
						{#each data.documents as doc}
							{@const badge = getSeverityBadge(doc.status, doc.days_remaining)}
							<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
								<td class="px-5 py-4">
									<div>
										<p class="font-bold text-on-surface">{doc.nama_karyawan || '-'}</p>
										<p class="text-xs text-on-surface-variant font-mono mt-0.5">NIK: {doc.payroll_id || '-'}</p>
									</div>
								</td>
								<td class="px-5 py-4">
									<span class="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-semibold text-xs inline-block">
										{doc.doc_type}
									</span>
								</td>
								<td class="px-5 py-4 font-mono font-semibold text-on-surface">
									{doc.doc_number || '-'}
								</td>
								<td class="px-5 py-4 font-bold text-on-surface">
									{doc.expire_date || 'N/A'}
								</td>
								<td class="px-5 py-4">
									<span class="px-2.5 py-1 rounded-full text-xs font-bold border inline-block {badge.bg} {badge.text} {badge.border}">
										{badge.label}
									</span>
								</td>
								<td class="px-5 py-4 text-right">
									<button
										onclick={() => openRenewModal(doc)}
										class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-primary transition-all cursor-pointer inline-flex items-center gap-1"
									>
										<span class="material-symbols-outlined text-sm">edit_calendar</span>
										<span>Perbarui</span>
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

<!-- Modal Perbarui Dokumen -->
{#if showModal && selectedDoc}
	<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden my-8">
			<div class="bg-slate-900 text-white p-6 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
						<span class="material-symbols-outlined text-2xl">verified</span>
					</div>
					<div>
						<h2 class="text-lg font-bold">PERBARUI DOKUMEN</h2>
						<p class="text-xs text-slate-400">Input Masa Perpanjangan Dokumen</p>
					</div>
				</div>
				<button onclick={closeModal} class="text-slate-400 hover:text-white transition-colors cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form method="POST" action="?/renewDocument" use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					closeModal();
				};
			}} class="p-6 space-y-4 text-xs">
				<input type="hidden" name="payroll_id" value={selectedDoc.payroll_id} />
				<input type="hidden" name="doc_type" value={selectedDoc.doc_type} />

				<div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
					<span class="text-slate-400 block">Karyawan</span>
					<span class="text-sm font-bold text-on-surface block">{selectedDoc.nama_karyawan}</span>
					<span class="text-xs font-semibold text-primary mt-1 block">{selectedDoc.doc_type}</span>
				</div>

				<div class="space-y-1">
					<label for="new_doc_number_input" class="font-bold text-on-surface block uppercase tracking-wider">Nomor Dokumen Baru:</label>
					<input
						id="new_doc_number_input"
						type="text"
						name="new_doc_number"
						bind:value={newDocNumber}
						placeholder="Masukkan nomor dokumen baru..."
						class="w-full bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-3 font-mono font-bold text-on-surface"
					/>
				</div>

				<div class="space-y-1">
					<label for="new_expire_date_input" class="font-bold text-on-surface block uppercase tracking-wider">Tanggal Expired Baru:</label>
					<input
						id="new_expire_date_input"
						type="date"
						name="new_expire_date"
						bind:value={newExpireDate}
						required
						class="w-full bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-3 font-semibold text-on-surface"
					/>
				</div>

				<div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
					<button
						type="button"
						onclick={closeModal}
						class="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-on-surface hover:bg-slate-100 transition-all cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
					>
						Simpan Perpanjangan
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
