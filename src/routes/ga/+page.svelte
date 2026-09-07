<script lang="ts">
	let { data } = $props();

	const assets = $derived(data.assets);
	const permits = $derived(data.permits);
	const facilities = $derived(data.facilities);
	const stationery = $derived(data.stationery);
	const totalAttention = $derived((permits.stats.expired_count || 0) + (permits.stats.urgent_7_count || 0) + (permits.stats.critical_30_count || 0));

	function formatRupiah(val: number | string | null) {
		const num = typeof val === 'string' ? parseFloat(val) : (val || 0);
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
			case 'STNK_TAHUNAN': return 'Pajak STNK 1 Tahun';
			case 'STNK_5_TAHUN': return 'STNK Plat 5 Tahun';
			case 'KIR_BERKALA': return 'KIR Uji Berkala';
			case 'IZIN_TRAYEK': return 'Izin Trayek BPTD';
			case 'UJI_EMISI': return 'Sertifikat Uji Emisi';
			case 'SIUP_NIB': return 'Legalitas Usaha / NIB';
			case 'ASURANSI': return 'Polis Asuransi';
			default: return type;
		}
	}

	function getUrgencyBadge(urgency: string) {
		switch (urgency) {
			case 'EMERGENCY':
				return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-black animate-pulse';
			case 'HIGH':
				return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300 dark:border-orange-800 font-bold';
			case 'MEDIUM':
				return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-medium';
			default:
				return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-medium';
		}
	}

	function getWoStatusBadge(status: string) {
		switch (status) {
			case 'COMPLETED':
				return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
			case 'IN_PROGRESS':
				return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
			case 'APPROVED':
				return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
			default:
				return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
		}
	}
</script>

<div class="space-y-8">
	<!-- Page Header & Fast Navigation Actions -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
		<div>
			<div class="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">
				<span class="material-symbols-outlined text-sm">domain</span>
				<span>ERP BCS • General Affair & Asset Management</span>
			</div>
			<h1 class="text-3xl font-black text-on-surface tracking-tight">Overview & Dashboard GA</h1>
			<p class="text-xs text-on-surface-variant mt-1 max-w-2xl">
				Pusat komando pemantauan aset kantor/pool, sistem peringatan dini (EWS) pajak armada, tiket perbaikan gedung, dan stok perlengkapan operasional.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2.5">
			<a
				href="/ga/assets"
				class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold border border-slate-200 dark:border-slate-800 transition-colors shadow-2xs"
			>
				<span class="material-symbols-outlined text-base text-cyan-600">inventory_2</span>
				<span>Master Aset</span>
			</a>
			<a
				href="/ga/permits"
				class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold border border-slate-200 dark:border-slate-800 transition-colors shadow-2xs"
			>
				<span class="material-symbols-outlined text-base text-amber-600">badge</span>
				<span>Legalitas Armada</span>
			</a>
			<a
				href="/ga/facilities"
				class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition-colors"
			>
				<span class="material-symbols-outlined text-base">home_repair_service</span>
				<span>+ Buat Tiket WO</span>
			</a>
		</div>
	</div>

	<!-- Top Highlights: Bento Grid KPI Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Card 1: Nilai Aset Kantor -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-cyan-500/30 flex flex-col justify-between relative overflow-hidden">
			<div class="absolute -right-4 -bottom-4 text-cyan-500/5">
				<span class="material-symbols-outlined text-9xl">domain_verification</span>
			</div>
			<div>
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Nilai Aset</span>
					<div class="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-200/50 dark:border-cyan-800/50">
						<span class="material-symbols-outlined text-[18px]">account_balance_wallet</span>
					</div>
				</div>
				<div class="text-2xl font-black text-on-surface tracking-tight">
					{formatRupiah(assets.totals.total_asset_value)}
				</div>
			</div>
			<div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>{assets.totals.active_assets} Unit Aset Aktif</span>
				<span class="font-bold text-cyan-600 hover:underline"><a href="/ga/assets">Rincian &rarr;</a></span>
			</div>
		</div>

		<!-- Card 2: EWS Legalitas & Pajak Armada -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-amber-500/30 flex flex-col justify-between relative overflow-hidden">
			<div class="absolute -right-4 -bottom-4 text-amber-500/5">
				<span class="material-symbols-outlined text-9xl">warning</span>
			</div>
			<div>
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">EWS Pajak & Legalitas</span>
					<div class="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50">
						<span class="material-symbols-outlined text-[18px]">notifications_active</span>
					</div>
				</div>
				<div class="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight flex items-baseline gap-1.5">
					<span>{totalAttention}</span>
					<span class="text-sm font-bold text-on-surface-variant">Dokumen Kritis</span>
				</div>
			</div>
			<div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-2 text-[11px]">
				{#if permits.stats.expired_count > 0}
					<span class="px-2 py-0.5 rounded-md font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200">
						{permits.stats.expired_count} Expired
					</span>
				{/if}
				<span class="px-2 py-0.5 rounded-md font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200">
					{permits.stats.urgent_7_count + permits.stats.critical_30_count} &lt; 30 Hari
				</span>
			</div>
		</div>

		<!-- Card 3: Tiket Pemeliharaan Fasilitas -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-blue-500/30 flex flex-col justify-between relative overflow-hidden">
			<div class="absolute -right-4 -bottom-4 text-blue-500/5">
				<span class="material-symbols-outlined text-9xl">engineering</span>
			</div>
			<div>
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Facility Work Orders</span>
					<div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-800/50">
						<span class="material-symbols-outlined text-[18px]">build_circle</span>
					</div>
				</div>
				<div class="text-2xl font-black text-on-surface tracking-tight">
					{facilities.stats.pending_wo + facilities.stats.in_progress_wo + facilities.stats.approved_wo}
					<span class="text-sm font-normal text-on-surface-variant">Tiket Aktif</span>
				</div>
			</div>
			<div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span>{facilities.stats.pending_wo} Menunggu • {facilities.stats.in_progress_wo} Dikerjakan</span>
				<span class="font-bold text-blue-600 hover:underline"><a href="/ga/facilities">Detail &rarr;</a></span>
			</div>
		</div>

		<!-- Card 4: Stok & Permintaan ATK -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-purple-500/30 flex flex-col justify-between relative overflow-hidden">
			<div class="absolute -right-4 -bottom-4 text-purple-500/5">
				<span class="material-symbols-outlined text-9xl">edit_note</span>
			</div>
			<div>
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Request & Stok ATK</span>
					<div class="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/50 dark:border-purple-800/50">
						<span class="material-symbols-outlined text-[18px]">receipt_long</span>
					</div>
				</div>
				<div class="text-2xl font-black text-on-surface tracking-tight">
					{stationery.stats.pending_requests}
					<span class="text-sm font-normal text-on-surface-variant">Request Pending</span>
				</div>
			</div>
			<div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-on-surface-variant">
				<span class="{stationery.stats.low_stock_items > 0 ? 'text-amber-600 font-bold' : ''}">
					{stationery.stats.low_stock_items} Item Stok Menipis
				</span>
				<span class="font-bold text-purple-600 hover:underline"><a href="/ga/stationery">Katalog &rarr;</a></span>
			</div>
		</div>
	</div>

	<!-- Early Warning System (EWS) Section: Critical Fleet Permits Table -->
	<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs space-y-4">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
			<div class="flex items-center gap-3">
				<div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">fmd_bad</span>
				</div>
				<div>
					<h3 class="text-base font-bold text-on-surface">Early Warning System (EWS) — Pajak & Dokumen Armada</h3>
					<p class="text-xs text-on-surface-variant">Daftar kendaraan dengan dokumen STNK, KIR, atau izin trayek yang segera habis atau telah lewat masa berlaku.</p>
				</div>
			</div>
			<a href="/ga/permits" class="text-xs font-bold text-cyan-600 hover:underline flex items-center gap-1">
				<span>Lihat Semua Dokumen</span>
				<span class="material-symbols-outlined text-sm">arrow_forward</span>
			</a>
		</div>

		{#if permits.criticalList.length === 0}
			<div class="py-8 text-center text-on-surface-variant flex flex-col items-center">
				<span class="material-symbols-outlined text-4xl text-emerald-500 mb-2">check_circle</span>
				<p class="text-sm font-bold text-on-surface">Semua Dokumen Legalitas Masih Valid</p>
				<p class="text-xs text-on-surface-variant">Tidak ada dokumen STNK atau KIR yang mendekati masa kedaluwarsa (&lt; 60 hari).</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3 px-4">Kendaraan (Unit)</th>
							<th class="py-3 px-4">No. Polisi</th>
							<th class="py-3 px-4">Jenis Dokumen</th>
							<th class="py-3 px-4">Instansi Penerbit</th>
							<th class="py-3 px-4">Jatuh Tempo</th>
							<th class="py-3 px-4">Status & Sisa Waktu</th>
							<th class="py-3 px-4 text-right">Est. Biaya Perpanjangan</th>
							<th class="py-3 px-4 text-center">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each permits.criticalList as permit}
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-3 px-4 font-mono font-bold text-on-surface">
									{permit.unit_number}
								</td>
								<td class="py-3 px-4 font-semibold text-on-surface">
									{permit.police_number || '-'}
								</td>
								<td class="py-3 px-4 font-medium text-on-surface">
									{getPermitLabel(permit.permit_type)}
								</td>
								<td class="py-3 px-4 text-on-surface-variant">
									{permit.institution || '-'}
								</td>
								<td class="py-3 px-4 font-medium text-on-surface whitespace-nowrap">
									{formatDate(permit.expiry_date)}
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
								<td class="py-3 px-4 text-center">
									<a
										href="/ga/permits"
										class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 hover:bg-cyan-100 transition-colors text-[11px] font-bold"
									>
										<span>Urus Berkas</span>
										<span class="material-symbols-outlined text-[13px]">arrow_forward</span>
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- 2-Column Grid: Facility Work Orders & Stationery Requests -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Left: Tiket Pemeliharaan Sarana Gedung/Pool -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-[18px]">build</span>
					</div>
					<div>
						<h3 class="text-sm font-bold text-on-surface">Tiket Pemeliharaan Fasilitas Terkini</h3>
						<p class="text-[11px] text-on-surface-variant">Work orders perbaikan kantor, pool & instalasi listrik</p>
					</div>
				</div>
				<a href="/ga/facilities" class="text-xs font-bold text-cyan-600 hover:underline">Kelola &rarr;</a>
			</div>

			<div class="space-y-3">
				{#each facilities.recentList as wo}
					<div class="p-3.5 rounded-xl bg-surface-container-low border border-slate-200/50 dark:border-slate-800/50 hover:border-primary/20 transition-all flex flex-col gap-2">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="font-mono text-xs font-bold text-on-surface">{wo.wo_number}</span>
								<span class="px-2 py-0.5 rounded text-[10px] {getUrgencyBadge(wo.urgency)}">
									{wo.urgency}
								</span>
							</div>
							<span class="px-2 py-0.5 rounded text-[10px] font-bold {getWoStatusBadge(wo.status)}">
								{wo.status}
							</span>
						</div>

						<p class="text-xs text-on-surface font-semibold line-clamp-1">{wo.description}</p>

						<div class="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 border-t border-slate-100 dark:border-slate-800/50">
							<div class="flex items-center gap-1.5">
								<span class="material-symbols-outlined text-xs">location_on</span>
								<span>{wo.location}</span>
							</div>
							<div class="font-medium">
								{wo.technician_vendor || 'Belum ditugaskan'}
							</div>
						</div>
					</div>
				{/each}

				{#if facilities.recentList.length === 0}
					<p class="text-xs text-on-surface-variant text-center py-6">Tidak ada tiket pemeliharaan fasilitas aktif.</p>
				{/if}
			</div>
		</div>

		<!-- Right: Stok ATK Kritis & Pengajuan Divisi -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs space-y-5">
			<!-- Peringatan Stok Minimum ATK -->
			<div>
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-2.5">
						<div class="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
							<span class="material-symbols-outlined text-[18px]">inventory</span>
						</div>
						<div>
							<h3 class="text-sm font-bold text-on-surface">Peringatan Stok Habis Pakai (ATK)</h3>
							<p class="text-[11px] text-on-surface-variant">Item dengan stok berada di bawah batas minimum</p>
						</div>
					</div>
					<a href="/ga/stationery" class="text-xs font-bold text-purple-600 hover:underline">Semua ATK &rarr;</a>
				</div>

				{#if stationery.lowStockList.length === 0}
					<p class="text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
						<span class="material-symbols-outlined text-sm">check_circle</span>
						Seluruh stok ATK & perlengkapan berada di atas batas minimum aman.
					</p>
				{:else}
					<div class="space-y-2">
						{#each stationery.lowStockList as item}
							<div class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-slate-200/40 dark:border-slate-800/40">
								<div>
									<div class="font-bold text-xs text-on-surface">{item.name}</div>
									<div class="text-[10px] text-on-surface-variant font-mono">{item.item_code} • {item.category}</div>
								</div>
								<div class="text-right">
									<span class="px-2 py-0.5 rounded text-[11px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200">
										Sisa: {item.stock_quantity} {item.unit}
									</span>
									<div class="text-[9px] text-on-surface-variant mt-0.5">Min: {item.minimum_stock} {item.unit}</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Pengajuan ATK Divisi Terkini -->
			<div class="pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
				<div class="flex items-center justify-between mb-3">
					<h4 class="text-xs font-bold text-on-surface uppercase tracking-wider">Pengajuan Permintaan Terakhir</h4>
					<a href="/ga/stationery" class="text-xs font-bold text-cyan-600 hover:underline">Approval &rarr;</a>
				</div>

				<div class="space-y-2">
					{#each stationery.recentRequests as req}
						<div class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low text-xs border border-slate-200/40 dark:border-slate-800/40">
							<div>
								<div class="font-mono font-bold text-on-surface">{req.req_number}</div>
								<div class="text-[11px] text-on-surface-variant">{req.department} • {req.requester_name}</div>
							</div>
							<div class="text-right">
								<span class="px-2 py-0.5 rounded text-[10px] font-bold {req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
									{req.status}
								</span>
								<div class="text-[10px] text-on-surface-variant mt-0.5">{req.total_items_count} item</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
