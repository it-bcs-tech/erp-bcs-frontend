<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	let searchQuery = $state('');
	let typeFilter = $state('All');
	let gateFilter = $state('All');
	let activeTab = $state('ALL'); // ALL, ATTENTION, STNK, KIR, TRAYEK

	let isAddModalOpen = $state(false);
	let isRenewModalOpen = $state(false);
	let isHistoryModalOpen = $state(false);
	let isEditModalOpen = $state(false);
	let selectedPermit = $state<any>(null);

	// Selected fleet unit for auto-fill in Add Modal
	let selectedFleetUnitId = $state('');

	function handleFleetUnitChange() {
		const found = data.fleetUnits.find((u: any) => u.id === selectedFleetUnitId);
		if (found && formAddUnitNumber !== undefined) {
			formAddUnitNumber = found.nomor_unit;
			formAddPoliceNumber = found.nomor_unit; // usually plate is in nomor_unit
			formAddChassis = found.no_rangka || '';
			formAddEngine = found.no_mesin || '';
		}
	}

	let formAddUnitNumber = $state('');
	let formAddPoliceNumber = $state('');
	let formAddChassis = $state('');
	let formAddEngine = $state('');

	function openAddModal() {
		selectedFleetUnitId = '';
		formAddUnitNumber = '';
		formAddPoliceNumber = '';
		formAddChassis = '';
		formAddEngine = '';
		isAddModalOpen = true;
	}

	function openRenewModal(permit: any) {
		selectedPermit = permit;
		isRenewModalOpen = true;
	}

	function openHistoryModal(permit: any) {
		selectedPermit = permit;
		isHistoryModalOpen = true;
	}

	function openEditModal(permit: any) {
		selectedPermit = permit;
		isEditModalOpen = true;
	}

	function formatRupiah(amount: number | string | null) {
		const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(num);
	}

	function formatDate(d: string | null) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function getPermitLabel(type: string) {
		switch (type) {
			case 'STNK_TAHUNAN': return 'STNK Pajak Tahunan';
			case 'STNK_5_TAHUN': return 'STNK Ganti Plat 5 Tahun';
			case 'KIR_BERKALA': return 'KIR Uji Berkala';
			case 'IZIN_TRAYEK': return 'Izin Trayek BPTD';
			case 'UJI_EMISI': return 'Sertifikat Uji Emisi';
			case 'SIUP_NIB': return 'Legalitas Usaha / NIB';
			case 'ASURANSI': return 'Polis Asuransi';
			default: return type;
		}
	}

	function setTab(tab: string) {
		activeTab = tab;
		if (tab === 'ALL') {
			gateFilter = 'All';
			typeFilter = 'All';
		} else if (tab === 'ATTENTION') {
			gateFilter = 'ATTENTION';
			typeFilter = 'All';
		} else if (tab === 'STNK') {
			gateFilter = 'All';
			typeFilter = 'STNK_TAHUNAN';
		} else if (tab === 'KIR') {
			gateFilter = 'All';
			typeFilter = 'KIR_BERKALA';
		} else if (tab === 'TRAYEK') {
			gateFilter = 'All';
			typeFilter = 'IZIN_TRAYEK';
		}
	}

	const filteredPermits = $derived(
		data.permits.filter((p: any) => {
			const q = searchQuery.toLowerCase();
			const matchQ =
				!q ||
				p.unit_number?.toLowerCase().includes(q) ||
				p.police_number?.toLowerCase().includes(q) ||
				p.document_number?.toLowerCase().includes(q) ||
				p.institution?.toLowerCase().includes(q) ||
				p.chassis_number?.toLowerCase().includes(q);

			const matchType = typeFilter === 'All' || p.permit_type === typeFilter;
			const matchGate =
				gateFilter === 'All' ||
				(gateFilter === 'ATTENTION' && p.gateLevel !== 'VALID') ||
				p.gateLevel === gateFilter;

			return matchQ && matchType && matchGate;
		})
	);
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
		<div>
			<div class="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">
				<span class="material-symbols-outlined text-sm">badge</span>
				<span>KR 7.2 • Legalitas & Perizinan Kendaraan</span>
			</div>
			<h1 class="text-3xl font-black text-on-surface tracking-tight">Legalitas & Pajak Armada</h1>
			<p class="text-xs text-on-surface-variant mt-1">
				Database STNK, KIR, Izin Trayek, dan Uji Emisi terintegrasi armada logistik dengan deteksi dini jatuh tempo & audit biaya perpanjangan.
			</p>
		</div>

		<button
			onclick={openAddModal}
			class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors self-start md:self-auto"
		>
			<span class="material-symbols-outlined text-base">post_add</span>
			<span>+ Registrasi Dokumen Baru</span>
		</button>
	</div>

	<!-- Top Metric Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Dokumen Terdaftar</span>
			<div class="text-2xl font-black text-on-surface mt-1">
				{data.stats.totalPermits} <span class="text-sm font-normal text-on-surface-variant">berkas</span>
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1">
				{data.stats.validCount} dokumen dalam masa berlaku aman
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-rose-300 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/30 to-transparent">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Expired (Lewat Waktu)</span>
				{#if data.stats.expiredCount > 0}
					<span class="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
				{/if}
			</div>
			<div class="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
				{data.stats.expiredCount} <span class="text-sm font-normal text-on-surface-variant">dokumen</span>
			</div>
			<p class="text-[11px] text-rose-600 font-bold mt-1">
				Segera proses perpanjangan di biro jasa
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-amber-300 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/30 to-transparent">
			<span class="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Kritis & Urgent (&lt; 30 Hari)</span>
			<div class="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
				{data.stats.urgentCount + data.stats.criticalCount} <span class="text-sm font-normal text-on-surface-variant">dokumen</span>
			</div>
			<p class="text-[11px] text-amber-700 font-medium mt-1">
				{data.stats.urgentCount} unit jatuh tempo &lt; 7 hari ke depan
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Est. Biaya Perpanjangan Kritis</span>
			<div class="text-2xl font-black text-on-surface mt-1">
				{formatRupiah(data.stats.attentionCost)}
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1">
				Estimasi anggaran biro jasa / samsat
			</p>
		</div>
	</div>

	<!-- Filter Tabs & Search Bar -->
	<div class="space-y-3">
		<!-- Quick Filter Tabs -->
		<div class="flex flex-wrap items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
			<button
				onclick={() => setTab('ALL')}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all {activeTab === 'ALL'
					? 'bg-amber-600 text-white shadow-xs'
					: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
			>
				Semua Dokumen ({data.stats.totalPermits})
			</button>
			<button
				onclick={() => setTab('ATTENTION')}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 {activeTab === 'ATTENTION'
					? 'bg-rose-600 text-white shadow-xs'
					: 'bg-surface-container-low text-rose-600 dark:text-rose-400 hover:bg-rose-50'}"
			>
				<span>🚨 Perlu Atensi / Kritis</span>
				<span class="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{data.stats.expiredCount + data.stats.urgentCount + data.stats.criticalCount}</span>
			</button>
			<button
				onclick={() => setTab('STNK')}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all {activeTab === 'STNK'
					? 'bg-amber-600 text-white shadow-xs'
					: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
			>
				Pajak STNK
			</button>
			<button
				onclick={() => setTab('KIR')}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all {activeTab === 'KIR'
					? 'bg-amber-600 text-white shadow-xs'
					: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
			>
				KIR Uji Berkala
			</button>
			<button
				onclick={() => setTab('TRAYEK')}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all {activeTab === 'TRAYEK'
					? 'bg-amber-600 text-white shadow-xs'
					: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
			>
				Izin Trayek
			</button>
		</div>

		<!-- Search Box & Detailed Selectors -->
		<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<div class="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 w-full md:w-80 focus-within:border-amber-500">
				<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari nopol, no unit, no dokumen, instansi..."
					class="bg-transparent text-xs text-on-surface outline-none w-full placeholder:text-on-surface-variant/50"
				/>
			</div>

			<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
				<select
					bind:value={typeFilter}
					class="px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs text-on-surface font-medium"
				>
					<option value="All">Semua Tipe Dokumen</option>
					<option value="STNK_TAHUNAN">STNK Tahunan</option>
					<option value="STNK_5_TAHUN">STNK Plat 5 Tahun</option>
					<option value="KIR_BERKALA">KIR Berkala</option>
					<option value="IZIN_TRAYEK">Izin Trayek</option>
					<option value="UJI_EMISI">Uji Emisi</option>
					<option value="SIUP_NIB">Legalitas Usaha / NIB</option>
				</select>

				<select
					bind:value={gateFilter}
					class="px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs text-on-surface font-medium"
				>
					<option value="All">Semua Status Gate</option>
					<option value="ATTENTION">🚨 Perlu Atensi (&lt; 30 Hari)</option>
					<option value="EXPIRED">Expired / Kedaluwarsa</option>
					<option value="URGENT_7">Urgent (&lt; 7 Hari)</option>
					<option value="CRITICAL_30">Kritis (7 - 30 Hari)</option>
					<option value="VALID">Aman (&gt; 30 Hari)</option>
				</select>
			</div>
		</div>
	</div>

	<!-- Permits Data Table -->
	<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3 px-4">Kendaraan (Unit & Nopol)</th>
						<th class="py-3 px-4">No. Rangka & Mesin</th>
						<th class="py-3 px-4">Jenis Dokumen</th>
						<th class="py-3 px-4">Nomor Dokumen</th>
						<th class="py-3 px-4">Instansi Penerbit</th>
						<th class="py-3 px-4">Jatuh Tempo</th>
						<th class="py-3 px-4">Status & Sisa Waktu</th>
						<th class="py-3 px-4 text-right">Biaya Terakhir</th>
						<th class="py-3 px-4 text-center">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each filteredPermits as permit}
						<tr class="hover:bg-surface-container transition-colors">
							<td class="py-3 px-4">
								<div class="font-mono font-black text-sm text-on-surface">{permit.unit_number}</div>
								<div class="text-[11px] text-on-surface-variant font-semibold mt-0.5">
									{permit.police_number || '-'}
								</div>
							</td>
							<td class="py-3 px-4 font-mono text-[11px] text-on-surface-variant">
								<div><strong class="font-bold">Rangka:</strong> {permit.chassis_number || '-'}</div>
								<div><strong class="font-bold">Mesin:</strong> {permit.engine_number || '-'}</div>
							</td>
							<td class="py-3 px-4 font-bold text-on-surface">
								{getPermitLabel(permit.permit_type)}
							</td>
							<td class="py-3 px-4 font-mono font-medium text-on-surface">
								{permit.document_number}
							</td>
							<td class="py-3 px-4 text-on-surface-variant">
								{permit.institution || '-'}
							</td>
							<td class="py-3 px-4 font-medium text-on-surface whitespace-nowrap">
								{formatDate(permit.expiry_date)}
								<div class="text-[10px] text-on-surface-variant">Terbit: {formatDate(permit.issue_date)}</div>
							</td>
							<td class="py-3 px-4 whitespace-nowrap">
								{#if permit.days_remaining < 0}
									<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
										<span class="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
										Expired {Math.abs(permit.days_remaining)} Hari Lalu
									</span>
								{:else if permit.days_remaining <= 7}
									<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300">
										<span class="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
										Urgent (H-{permit.days_remaining})
									</span>
								{:else if permit.days_remaining <= 30}
									<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-yellow-50 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300 border border-yellow-300">
										Kritis ({permit.days_remaining} Hari Lagi)
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200">
										Aman ({permit.days_remaining} Hari)
									</span>
								{/if}
							</td>
							<td class="py-3 px-4 text-right font-mono font-bold text-on-surface">
								{formatRupiah(permit.renewal_cost)}
							</td>
							<td class="py-3 px-4 text-center whitespace-nowrap">
								<div class="flex items-center justify-center gap-1">
									<button
										onclick={() => openRenewModal(permit)}
										title="Perpanjang Dokumen Legalitas"
										class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 font-bold text-[11px] hover:bg-emerald-100 transition-colors"
									>
										<span class="material-symbols-outlined text-[14px]">autorenew</span>
										<span>Perpanjang</span>
									</button>
									<button
										onclick={() => openHistoryModal(permit)}
										title="Riwayat Perpanjangan & Biaya"
										class="p-1.5 rounded-lg text-slate-500 hover:bg-surface-container hover:text-on-surface transition-colors"
									>
										<span class="material-symbols-outlined text-[17px]">history</span>
									</button>
									<button
										onclick={() => openEditModal(permit)}
										title="Edit Dokumen"
										class="p-1.5 rounded-lg text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition-colors"
									>
										<span class="material-symbols-outlined text-[17px]">edit</span>
									</button>
									<form
										method="POST"
										action="?/deletePermit"
										use:enhance={() => {
											if (!confirm(`Hapus dokumen ${permit.document_number} untuk unit ${permit.unit_number}?`)) return ({ cancel }: any) => cancel();
										}}
										class="inline"
									>
										<input type="hidden" name="id" value={permit.id} />
										<button
											type="submit"
											title="Hapus Dokumen"
											class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
										>
											<span class="material-symbols-outlined text-[17px]">delete</span>
										</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}

					{#if filteredPermits.length === 0}
						<tr>
							<td colspan="9" class="py-8 text-center text-on-surface-variant text-xs">
								Tidak ada data dokumen perizinan armada yang sesuai filter.
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- MODAL: Perpanjangan Dokumen Legalitas (Renew) -->
{#if isRenewModalOpen && selectedPermit}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600">autorenew</span>
					<h3 class="font-bold text-base text-on-surface">Catat Perpanjangan Masa Berlaku Dokumen</h3>
				</div>
				<button onclick={() => isRenewModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/renewPermit"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							isRenewModalOpen = false;
						}
					};
				}}
				class="p-6 space-y-4"
			>
				<input type="hidden" name="permit_id" value={selectedPermit.id} />

				<div class="p-3 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-1">
					<div class="font-bold text-on-surface">Unit: {selectedPermit.unit_number} ({selectedPermit.police_number || '-'})</div>
					<div class="text-on-surface-variant">
						<strong>Jenis:</strong> {getPermitLabel(selectedPermit.permit_type)} • <strong>No. Berkas:</strong> {selectedPermit.document_number}
					</div>
					<div class="text-rose-600 font-semibold">
						Jatuh Tempo Lama: {formatDate(selectedPermit.expiry_date)}
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="renew_date" class="block text-xs font-bold text-on-surface mb-1">Tanggal Pengurusan / Terbit *</label>
						<input
							id="renew_date"
							type="date"
							name="renewal_date"
							value={new Date().toISOString().split('T')[0]}
							required
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						/>
					</div>
					<div>
						<label for="renew_extended_to" class="block text-xs font-bold text-on-surface mb-1">Masa Berlaku Baru (Jatuh Tempo Baru) *</label>
						<input
							id="renew_extended_to"
							type="date"
							name="extended_to"
							required
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="renew_cost" class="block text-xs font-bold text-on-surface mb-1">Total Biaya Perpanjangan (Rp) *</label>
						<input
							id="renew_cost"
							type="number"
							name="cost"
							min="0"
							step="1000"
							value={selectedPermit.renewal_cost}
							required
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono"
						/>
					</div>
					<div>
						<label for="renew_handled_by" class="block text-xs font-bold text-on-surface mb-1">Diurus Oleh (Biro Jasa / Staf GA) *</label>
						<input
							id="renew_handled_by"
							type="text"
							name="handled_by"
							placeholder="Misal: Biro Jasa Mandiri Banten / Tim GA"
							required
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						/>
					</div>
				</div>

				<div>
					<label for="renew_notes" class="block text-xs font-bold text-on-surface mb-1">Catatan Tambahan & Bukti Kuitansi</label>
					<textarea
						id="renew_notes"
						name="notes"
						rows="2"
						placeholder="Nomor resi/kuitansi pembayaran, keterangan uji emisi..."
						class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => isRenewModalOpen = false}
						class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
					>
						Simpan & Perbarui Masa Berlaku
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: Riwayat Perpanjangan & Biaya (History) -->
{#if isHistoryModalOpen && selectedPermit}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div>
					<div class="text-[11px] font-mono font-bold text-amber-600 uppercase">{selectedPermit.unit_number} • {selectedPermit.police_number || '-'}</div>
					<h3 class="font-bold text-base text-on-surface">Log Riwayat Perpanjangan Pajak/Dokumen</h3>
				</div>
				<button onclick={() => isHistoryModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 space-y-4">
				<div class="text-xs text-on-surface-variant font-medium">
					Dokumen: <strong class="text-on-surface">{getPermitLabel(selectedPermit.permit_type)}</strong> ({selectedPermit.document_number})
				</div>

				{#if selectedPermit.renewalLogs && selectedPermit.renewalLogs.length > 0}
					<div class="space-y-3 relative pl-4 border-l-2 border-slate-200 dark:border-slate-700 max-h-80 overflow-y-auto">
						{#each selectedPermit.renewalLogs as log}
							<div class="relative text-xs">
								<div class="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 border-2 border-white dark:border-slate-900"></div>
								<div class="flex items-center justify-between">
									<span class="font-bold text-on-surface">Tanggal Perpanjangan: {formatDate(log.renewal_date)}</span>
									<span class="font-mono font-black text-emerald-600">{formatRupiah(log.cost)}</span>
								</div>
								<div class="text-[11px] text-on-surface-variant mt-0.5">
									Masa Berlaku Diperpanjang Hingga: <strong class="text-cyan-600">{formatDate(log.extended_to)}</strong>
								</div>
								<div class="text-[11px] text-on-surface-variant">
									Diurus oleh: <span class="font-medium text-on-surface">{log.handled_by || '-'}</span>
								</div>
								{#if log.notes}
									<p class="text-[11px] text-on-surface mt-1 italic bg-surface-container-low p-2 rounded-lg">
										"{log.notes}"
									</p>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-xs text-on-surface-variant text-center py-6 bg-surface-container-low rounded-xl">
						Belum ada entri log perpanjangan berkas untuk dokumen ini.
					</p>
				{/if}

				<div class="flex justify-end pt-2">
					<button
						type="button"
						onclick={() => isHistoryModalOpen = false}
						class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container"
					>
						Tutup
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL: Tambah / Registrasi Dokumen Baru -->
{#if isAddModalOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">post_add</span>
					<h3 class="font-bold text-base text-on-surface">Registrasi Dokumen Legalitas Baru</h3>
				</div>
				<button onclick={() => isAddModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/createPermit"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							isAddModalOpen = false;
						}
					};
				}}
				class="p-6 space-y-4"
			>
				<!-- Pilihan Cepat dari Fleet Unit -->
				<div class="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
					<label for="select_fleet_unit" class="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
						Pilih dari Unit Armada Terdaftar (Auto-Fill)
					</label>
					<select
						id="select_fleet_unit"
						bind:value={selectedFleetUnitId}
						onchange={handleFleetUnitChange}
						class="w-full px-3 py-1.5 text-xs rounded-lg bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
					>
						<option value="">-- Pilih Unit Armada atau Input Manual di Bawah --</option>
						{#each data.fleetUnits as unit}
							<option value={unit.id}>{unit.nomor_unit} (Rangka: {unit.no_rangka || '-'})</option>
						{/each}
					</select>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="create_unit_number" class="block text-xs font-bold text-on-surface mb-1">Nomor Unit Armada *</label>
						<input
							id="create_unit_number"
							type="text"
							name="unit_number"
							bind:value={formAddUnitNumber}
							required
							placeholder="Misal: A9176R / TR-01"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono font-bold uppercase"
						/>
					</div>
					<div>
						<label for="create_police_number" class="block text-xs font-bold text-on-surface mb-1">Nomor Polisi (Plat)</label>
						<input
							id="create_police_number"
							type="text"
							name="police_number"
							bind:value={formAddPoliceNumber}
							placeholder="Misal: A 9176 R"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-semibold uppercase"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="create_chassis_number" class="block text-xs font-bold text-on-surface mb-1">Nomor Rangka</label>
						<input
							id="create_chassis_number"
							type="text"
							name="chassis_number"
							bind:value={formAddChassis}
							placeholder="Nomor rangka kendaraan"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono"
						/>
					</div>
					<div>
						<label for="create_engine_number" class="block text-xs font-bold text-on-surface mb-1">Nomor Mesin</label>
						<input
							id="create_engine_number"
							type="text"
							name="engine_number"
							bind:value={formAddEngine}
							placeholder="Nomor mesin kendaraan"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="create_permit_type" class="block text-xs font-bold text-on-surface mb-1">Jenis Dokumen Legalitas *</label>
						<select
							id="create_permit_type"
							name="permit_type"
							required
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						>
							<option value="STNK_TAHUNAN">STNK Pajak Tahunan</option>
							<option value="STNK_5_TAHUN">STNK Ganti Plat 5 Tahun</option>
							<option value="KIR_BERKALA">KIR Uji Berkala</option>
							<option value="IZIN_TRAYEK">Izin Trayek BPTD</option>
							<option value="UJI_EMISI">Sertifikat Uji Emisi</option>
							<option value="SIUP_NIB">Legalitas Usaha / NIB</option>
							<option value="ASURANSI">Polis Asuransi</option>
						</select>
					</div>
					<div>
						<label for="create_doc_number" class="block text-xs font-bold text-on-surface mb-1">Nomor Dokumen / Berkas *</label>
						<input
							id="create_doc_number"
							type="text"
							name="document_number"
							required
							placeholder="Misal: STNK-BANTEN-9912 / KIR-CLG-2026"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label for="create_institution" class="block text-xs font-bold text-on-surface mb-1">Instansi Penerbit</label>
						<input
							id="create_institution"
							type="text"
							name="institution"
							placeholder="Samsat / Dishub / BPTD"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						/>
					</div>
					<div>
						<label for="create_issue_date" class="block text-xs font-bold text-on-surface mb-1">Tanggal Terbit</label>
						<input
							id="create_issue_date"
							type="date"
							name="issue_date"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						/>
					</div>
					<div>
						<label for="create_expiry_date" class="block text-xs font-bold text-on-surface mb-1">Tanggal Jatuh Tempo *</label>
						<input
							id="create_expiry_date"
							type="date"
							name="expiry_date"
							required
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="create_renewal_cost" class="block text-xs font-bold text-on-surface mb-1">Estimasi Biaya Perpanjangan (Rp)</label>
						<input
							id="create_renewal_cost"
							type="number"
							name="renewal_cost"
							min="0"
							step="1000"
							placeholder="0"
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface font-mono"
						/>
					</div>
					<div>
						<label for="create_file_url" class="block text-xs font-bold text-on-surface mb-1">Link Dokumen Scan / Cloud</label>
						<input
							id="create_file_url"
							type="text"
							name="file_url"
							placeholder="https://..."
							class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
						/>
					</div>
				</div>

				<div>
					<label for="create_notes" class="block text-xs font-bold text-on-surface mb-1">Catatan</label>
					<textarea
						id="create_notes"
						name="notes"
						rows="2"
						placeholder="Keterangan kondisi fisik plat nomor atau kelengkapan berkas..."
						class="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-700 text-on-surface"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => isAddModalOpen = false}
						class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
					>
						Simpan Dokumen
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
