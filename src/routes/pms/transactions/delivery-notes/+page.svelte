<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDateId, formatNumber } from '$lib/utils/pms';

	let { data } = $props();

	let activeTab = $state<'pending_workshop' | 'issued_workshop' | 'logistic'>('pending_workshop');
	let searchQuery = $state('');
	let isModalOpen = $state(false);
	let isSubmitting = $state(false);

	// Maintenance Delivery Notes
	let maintenanceDNs = $derived(data.maintenanceDNs || []);
	let pendingMaintenanceDNs = $derived(
		maintenanceDNs.filter((dn: any) => dn.status === 'Pending')
	);
	let issuedMaintenanceDNs = $derived(
		maintenanceDNs.filter((dn: any) => dn.status === 'Issued')
	);

	// Logistics Delivery Notes
	let logisticNotes = $derived(data.logisticNotes || []);

	// Issue Form States for Maintenance DNs
	let showIssueModal = $state(false);
	let selectedDn: any = $state(null);
	let isSubmittingIssue = $state(false);
	let pickerName = $state('');
	let pickerDisplay = $state('');
	let showPickerDropdown = $state(false);
	let issueParts: any[] = $state([]);

	let totalIssueQty = $derived(issueParts.reduce((acc, p) => acc + (parseFloat(p.qty_actual) || 0), 0));

	let filteredStaff = $derived(
		pickerDisplay ? (data.warehouseStaff || []).filter((s: any) => s.name.toLowerCase().includes(pickerDisplay.toLowerCase())) : (data.warehouseStaff || [])
	);

	function openIssueModal(dn: any) {
		selectedDn = dn;
		issueParts = dn.details.map((d: any) => ({
			detail_id: d.id,
			material_db_id: d.m_id,
			material_id: d.material_id,
			material_name: d.material_name,
			material_code: d.material_code,
			spec: d.spec,
			uom: d.uom,
			stock: parseFloat(d.stock) || 0,
			qty_request: parseFloat(d.qty_request) || 0,
			qty_actual: parseFloat(d.qty_request) || 0,
			price: parseFloat(d.price) || 0
		}));
		showIssueModal = true;
		pickerName = '';
		pickerDisplay = '';
		showPickerDropdown = false;
	}

	function hasStockShortage(dn: any) {
		return dn.details?.some((d: any) => parseFloat(d.qty_request) > (parseFloat(d.stock) || 0));
	}

	function formatDateTime(dateStr: any) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', {
			month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
		});
	}

	function formatCurrency(amount: any) {
		if (!amount) return 'Rp 0';
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	}
</script>

<svelte:head>
	<title>Delivery Notes (DN) & Pengeluaran | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">local_shipping</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Delivery Notes (DN) & Pengeluaran Gudang</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Verifikasi pengeluaran sparepart gudang berdasarkan Work Order (WO) mekanik dan surat jalan logistik
			</p>
		</div>

		<!-- Segmented Control Tabs -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 self-start md:self-auto overflow-x-auto max-w-full">
			<button 
				class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all {activeTab === 'pending_workshop' ? 'bg-amber-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
				onclick={() => activeTab = 'pending_workshop'}
			>
				<span>Permintaan SPK ({pendingMaintenanceDNs.length})</span>
			</button>
			<button 
				class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all {activeTab === 'issued_workshop' ? 'bg-amber-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
				onclick={() => activeTab = 'issued_workshop'}
			>
				<span>Riwayat Pengeluaran ({issuedMaintenanceDNs.length})</span>
			</button>
			<button 
				class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all {activeTab === 'logistic' ? 'bg-amber-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
				onclick={() => activeTab = 'logistic'}
			>
				<span>Surat Jalan Logistik ({logisticNotes.length})</span>
			</button>
		</div>
	</header>

	<!-- TAB 1: Permintaan Maintenance (Pending) -->
	{#if activeTab === 'pending_workshop'}
		<div class="flex-1">
			{#if pendingMaintenanceDNs.length === 0}
				<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs text-center py-16 text-on-surface-variant">
					<span class="material-symbols-outlined text-5xl opacity-40 mb-3 block text-emerald-600">check_circle</span>
					<h3 class="text-base font-bold text-on-surface mb-1">Semua Permintaan Selesai!</h3>
					<p class="text-xs font-medium text-on-surface-variant">Tidak ada material request dari Maintenance yang menunggu pengeluaran.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{#each pendingMaintenanceDNs as dn}
						<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs p-5 hover:border-amber-500/40 transition-all flex flex-col justify-between">
							<div>
								<div class="flex justify-between items-start mb-3">
									<div>
										<h3 class="text-base font-bold text-on-surface font-mono">{dn.dn_no}</h3>
										<p class="text-xs text-on-surface-variant font-medium mt-0.5 flex items-center gap-1">
											<span class="material-symbols-outlined text-sm">calendar_today</span> {formatDateTime(dn.created_at)}
										</p>
									</div>
									<div class="flex items-center gap-1.5">
										{#if hasStockShortage(dn)}
											<span class="bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider flex items-center gap-1">
												<span class="material-symbols-outlined text-[12px]">warning</span> Stok Kurang
											</span>
										{/if}
										<span class="bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider">Menunggu</span>
									</div>
								</div>
								
								<div class="grid grid-cols-2 gap-3 mb-4">
									<div class="bg-surface p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
										<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-0.5">Unit Tujuan</p>
										<p class="text-sm font-bold text-on-surface font-mono">{dn.unit_id || '-'}</p>
									</div>
									<div class="bg-surface p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
										<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-0.5">Nomor WO (SPK)</p>
										<p class="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">{dn.wo_no || '-'}</p>
									</div>
								</div>
								
								{#if dn.note}
									<div class="mb-4 bg-surface p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
										<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-0.5">Catatan Mekanik</p>
										<p class="text-xs italic text-on-surface-variant">"{dn.note}"</p>
									</div>
								{/if}

								<div class="space-y-2 mb-4 bg-surface p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
									<div class="flex justify-between items-center border-b border-slate-200/40 dark:border-slate-800/40 pb-1.5">
										<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Daftar Item Diminta ({dn.details.length})</p>
										<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Stok / Req</p>
									</div>
									{#each dn.details as item}
										{@const stockNum = parseFloat(item.stock) || 0}
										{@const isShort = item.qty_request > stockNum}
										<div class="flex justify-between items-start text-xs pt-1">
											<div>
												<p class="font-medium text-on-surface">{item.material_name}</p>
												{#if item.spec && item.spec !== '-'}
													<p class="text-[10px] text-on-surface-variant italic">{item.spec}</p>
												{/if}
												<p class="text-[10px] {stockNum <= 0 ? 'text-rose-600 font-bold' : isShort ? 'text-amber-600 font-bold' : 'text-slate-400'}">
													Stok Gudang: {stockNum} {item.uom || ''}
													{#if isShort}
														<span class="text-rose-600 ml-1 font-mono font-bold">(Kurang {item.qty_request - stockNum})</span>
													{/if}
												</p>
											</div>
											<span class="font-bold text-amber-600 dark:text-amber-400 ml-2">{item.qty_request}x</span>
										</div>
									{/each}
								</div>
							</div>

							<div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 mt-auto flex flex-col sm:flex-row gap-2">
								<button 
									onclick={() => openIssueModal(dn)}
									class="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex justify-center items-center gap-2 cursor-pointer"
								>
									<span class="material-symbols-outlined text-base">outbox</span>
									<span>Proses Pengeluaran</span>
								</button>
								{#if hasStockShortage(dn)}
									<a 
										href="/pms/transactions/pr/create?from_dn={encodeURIComponent(dn.dn_no)}"
										class="py-2.5 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors flex justify-center items-center gap-1.5 whitespace-nowrap cursor-pointer"
										title="Buat Purchase Request untuk item yang stoknya kurang"
									>
										<span class="material-symbols-outlined text-base">shopping_cart</span>
										<span>Buat PR</span>
									</a>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

	<!-- TAB 2: Riwayat Pengeluaran Maintenance (Issued) -->
	{:else if activeTab === 'issued_workshop'}
		<div class="flex-1">
			{#if issuedMaintenanceDNs.length === 0}
				<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs text-center py-16 text-on-surface-variant">
					<span class="material-symbols-outlined text-5xl opacity-40 mb-3 block">history</span>
					<p class="text-xs font-medium">Belum ada riwayat pengeluaran barang material untuk SPK.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{#each issuedMaintenanceDNs as dn}
						<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs p-5 hover:border-emerald-500/40 transition-all">
							<div class="flex justify-between items-start mb-3">
								<div>
									<h3 class="text-base font-bold text-on-surface font-mono">{dn.dn_no}</h3>
									<p class="text-xs text-on-surface-variant font-medium mt-0.5 flex items-center gap-1">
										<span class="material-symbols-outlined text-sm">calendar_today</span> Dikeluarkan: {formatDateTime(dn.updated_at || dn.created_at)}
									</p>
								</div>
								<span class="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider">Selesai</span>
							</div>
							
							<div class="flex gap-4 mb-3 text-xs bg-surface p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
								<div><span class="text-on-surface-variant">WO (SPK):</span> <span class="font-bold text-amber-600 dark:text-amber-400 font-mono">{dn.wo_no}</span></div>
								<div><span class="text-on-surface-variant">Pengambil:</span> <span class="font-bold text-on-surface">{dn.picker_name || dn.picked_by}</span></div>
							</div>

							<div class="space-y-2 bg-surface p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
								{#each dn.details as item}
									<div class="flex justify-between text-xs">
										<span class="font-medium text-on-surface">{item.material_name}</span>
										<span class="font-bold text-emerald-600">{item.qty_actual}x <span class="font-normal text-on-surface-variant font-mono">({formatCurrency(item.total)})</span></span>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

	<!-- TAB 3: Surat Jalan Logistik Antar-Gudang -->
	{:else}
		<div class="space-y-4">
			<div class="flex justify-between items-center">
				<p class="text-xs font-semibold text-on-surface-variant">Daftar pengiriman logistik antar-site BCS</p>
				<button
					type="button"
					onclick={() => isModalOpen = true}
					class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-[18px]">add</span>
					<span>Buat Surat Jalan (DN)</span>
				</button>
			</div>

			<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm min-w-[900px]">
						<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
							<tr>
								<th class="py-3.5 px-4">No. DN & Tanggal</th>
								<th class="py-3.5 px-4">Dari Lokasi (Asal)</th>
								<th class="py-3.5 px-4">Ke Lokasi (Tujuan)</th>
								<th class="py-3.5 px-4">Kurir / Driver</th>
								<th class="py-3.5 px-4">No. Kendaraan</th>
								<th class="py-3.5 px-4 text-center">Total Item</th>
								<th class="py-3.5 px-4 text-center">Status</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
							{#if logisticNotes.length === 0}
								<tr>
									<td colspan="7" class="py-12 text-center text-on-surface-variant">
										<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">local_shipping</span>
										<p class="text-xs font-semibold">Tidak ada data Surat Jalan Logistik.</p>
									</td>
								</tr>
							{:else}
								{#each logisticNotes as dn}
									<tr class="hover:bg-surface-container-high/40 transition-colors">
										<td class="py-3.5 px-4">
											<span class="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs">
												{dn.dnNumber}
											</span>
											<p class="text-[10px] text-on-surface-variant">{formatDateId(dn.date)}</p>
										</td>
										<td class="py-3.5 px-4 font-semibold text-on-surface">{dn.fromSite}</td>
										<td class="py-3.5 px-4 font-semibold text-on-surface">{dn.toSite}</td>
										<td class="py-3.5 px-4 text-on-surface">{dn.courierName}</td>
										<td class="py-3.5 px-4 font-mono font-bold text-on-surface">{dn.vehicleNo}</td>
										<td class="py-3.5 px-4 text-center font-mono font-bold text-on-surface">
											{dn.item_count} item ({formatNumber(dn.total_qty)} qty)
										</td>
										<td class="py-3.5 px-4 text-center">
											<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-blue-100 text-blue-800 border-blue-300">
												{dn.status}
											</span>
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

<!-- ISSUE MODAL FOR MAINTENANCE DN -->
{#if showIssueModal && selectedDn}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick={() => showIssueModal = false} role="button" tabindex="0" onkeydown={(e) => e.key === 'Escape' && (showIssueModal = false)}></div>
		<div class="relative w-full max-w-3xl bg-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
			<div class="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-low">
				<h2 class="text-xl font-black text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600">outbox</span>
					Issue Materials: {selectedDn.dn_no}
				</h2>
				<button onclick={() => showIssueModal = false} class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface-variant">
					<span class="material-symbols-outlined text-[20px]">close</span>
				</button>
			</div>
			
			<div class="p-6 overflow-y-auto flex-1">
				<form 
					id="issueDnForm"
					method="POST" 
					action="?/issueDN"
					use:enhance={({ cancel }) => {
						if (totalIssueQty <= 0) {
							alert(`Mohon maaf, proses gagal diteruskan.\n\nAnda tidak bisa memproses Delivery Note dengan total pengeluaran 0. Harus ada setidaknya 1 barang yang dikeluarkan.\n\nJika stok memang kosong seluruhnya, silakan biarkan statusnya tetap Pending hingga stok barang datang.`);
							cancel();
							return;
						}

						const invalidPart = issueParts.find(p => p.qty_actual > p.stock);
						if (invalidPart) {
							alert(`Mohon maaf, proses gagal diteruskan.\n\nStok barang "${invalidPart.material_name}" tidak mencukupi untuk jumlah yang Anda minta (Aktual: ${invalidPart.qty_actual}, Stok: ${invalidPart.stock}).\n\nSilakan kurangi jumlah pengeluaran atau perbarui stok terlebih dahulu.`);
							cancel();
							return;
						}

						isSubmittingIssue = true;
						return async ({ update }) => {
							await update();
							isSubmittingIssue = false;
							showIssueModal = false;
						};
					}}
					class="space-y-6 pb-48"
				>
					<input type="hidden" name="dn_no" value={selectedDn.dn_no} />
					<input type="hidden" name="issued_parts" value={JSON.stringify(issueParts)} />
					
					<div class="relative">
						<label class="block text-sm font-bold text-on-surface mb-2">Issued By (Warehouse Staff)</label>
						<input type="hidden" name="picker_name" value={pickerName} required />
						<input 
							type="text" 
							bind:value={pickerDisplay}
							onfocus={() => showPickerDropdown = true}
							onblur={() => setTimeout(() => showPickerDropdown = false, 200)}
							placeholder="Search staff name..."
							class="w-full px-4 py-3 bg-surface border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-medium"
							autocomplete="off"
						/>
						{#if showPickerDropdown}
							<ul class="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg max-h-48 overflow-y-auto hide-scrollbar">
								{#each filteredStaff as staff}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
									<li 
										class="px-4 py-2 text-sm text-on-surface cursor-pointer hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0" 
										onclick={() => { 
											pickerName = staff.id;
											pickerDisplay = staff.name;
											showPickerDropdown = false;
										}}
									>
										{staff.name}
									</li>
								{:else}
									<li class="px-4 py-3 text-center text-xs text-on-surface-variant">
										"{pickerDisplay}" not found
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<div class="pt-2">
						<h3 class="text-md font-bold text-on-surface mb-4">Confirm Quantities to Issue</h3>

						<div class="space-y-3">
							{#each issueParts as part}
								<div class="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center p-4 border border-surface-container rounded-xl bg-surface-container-low">
									<div class="flex-1">
										<p class="text-sm font-bold text-on-surface">{part.material_name}</p>
										<p class="text-xs font-medium text-on-surface-variant">{part.material_code}</p>
										<p class="text-xs font-bold mt-1 {part.stock < part.qty_request ? 'text-rose-500' : 'text-emerald-600'}">
											Current Stock: {part.stock} {part.uom || ''}
										</p>
									</div>
									<div class="flex items-center gap-4 w-full md:w-auto">
										<div class="text-right">
											<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Req Qty</p>
											<p class="text-lg font-black text-on-surface">{part.qty_request}</p>
										</div>
										<div class="w-px h-8 bg-surface-container hidden md:block"></div>
										<div class="flex-1 md:w-24">
											<label for="qty-{part.detail_id}" class="block text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Actual Issue</label>
											<input 
												id="qty-{part.detail_id}"
												type="number" 
												min="0" 
												step="any" 
												required
												bind:value={part.qty_actual}
												class="w-full px-3 py-2 bg-surface border border-emerald-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-bold text-emerald-700"
											/>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
					
					{#if issueParts.some(p => p.qty_actual > p.stock)}
						<div class="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-3 mt-4">
							<span class="material-symbols-outlined text-rose-500 mt-0.5">error</span>
							<div>
								<p class="text-sm font-bold">Stok Tidak Mencukupi!</p>
								<p class="text-xs mt-1 leading-relaxed">Anda tidak bisa meneruskan Delivery Note ini karena jumlah barang yang akan dikeluarkan (<span class="font-bold">Actual Issue</span>) melebihi stok yang ada di gudang saat ini. Harap sesuaikan jumlahnya agar tidak melebihi stok.</p>
							</div>
						</div>
					{:else if totalIssueQty <= 0 && issueParts.length > 0}
						<div class="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl flex items-start gap-3 mt-4">
							<span class="material-symbols-outlined text-amber-500 mt-0.5">warning</span>
							<div>
								<p class="text-sm font-bold">Total Pengeluaran Kosong (0)</p>
								<p class="text-xs mt-1 leading-relaxed">Anda memasukkan angka 0 untuk semua barang. Delivery Note tidak bisa diproses jika tidak ada barang fisik yang diserahkan ke mekanik. Jika stok memang sedang kosong seluruhnya, jangan klik konfirmasi. Biarkan pesanan ini tetap <span class="font-bold">Pending</span> hingga stok tiba di gudang.</p>
							</div>
						</div>
					{/if}

					{#if issueParts.some(p => p.stock < p.qty_request)}
						<div class="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
							<div class="flex items-start gap-2.5">
								<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl mt-0.5">shopping_cart</span>
								<div>
									<p class="text-xs font-bold text-amber-800 dark:text-amber-300">Stok Gudang Tidak Mencukupi?</p>
									<p class="text-[11px] text-on-surface-variant mt-0.5">Terdapat material yang kurang dari permintaan. Anda dapat langsung menerbitkan Purchase Request (PR) untuk pengadaan item kekurangan tersebut.</p>
								</div>
							</div>
							<a 
								href="/pms/transactions/pr/create?from_dn={encodeURIComponent(selectedDn.dn_no)}"
								class="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
							>
								<span class="material-symbols-outlined text-sm">post_add</span>
								<span>Buat PR Pengadaan</span>
							</a>
						</div>
					{/if}
				</form>
			</div>
			
			<div class="p-4 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
				<button 
					type="button" 
					onclick={() => showIssueModal = false}
					class="px-6 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
				>
					Cancel
				</button>
				<button 
					type="submit"
					form="issueDnForm"
					disabled={isSubmittingIssue || !pickerName || issueParts.some(p => p.qty_actual > p.stock) || totalIssueQty <= 0}
					class="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-70 flex items-center gap-2 cursor-pointer"
				>
					{#if isSubmittingIssue}
						<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
						Processing...
					{:else}
						<span class="material-symbols-outlined text-[18px]">check_circle</span>
						Confirm Issue
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL TAMBAH SURAT JALAN LOGISTIK -->
{#if isModalOpen}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">local_shipping</span>
					<h3 class="text-base font-extrabold text-on-surface">Buat Surat Jalan (DN) Baru</h3>
				</div>
				<button type="button" onclick={() => isModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/save" use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						isModalOpen = false;
						update();
					} else {
						alert((result as any).data?.message || 'Terjadi kesalahan');
					}
				};
			}}>
				<div class="p-6 space-y-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Tanggal Pengiriman
						</label>
						<input
							type="date"
							name="date"
							required
							value={new Date().toISOString().split('T')[0]}
							class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Dari Lokasi (Asal)
							</label>
							<select
								name="fromSiteId"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								{#each data.sites as s}
									<option value={s.id}>{s.loc_name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Ke Lokasi (Tujuan)
							</label>
							<select
								name="toSiteId"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								{#each data.sites as s}
									<option value={s.id}>{s.loc_name}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Nama Kurir / Driver
							</label>
							<input
								type="text"
								name="courierName"
								placeholder="Nama driver"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								No. Plat Truk / Armada
							</label>
							<input
								type="text"
								name="vehicleNo"
								placeholder="B 9876 XYZ"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none uppercase"
							/>
						</div>
					</div>

					<div class="grid grid-cols-3 gap-3">
						<div class="col-span-2">
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Pilih Material
							</label>
							<select
								name="materialId"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								<option value="">-- Bebas / Logistik Umum --</option>
								{#each data.materials as mat}
									<option value={mat.id}>{mat.material_code} - {mat.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Qty
							</label>
							<input
								type="number"
								min="1"
								name="qty"
								value="1"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Catatan Pengiriman
						</label>
						<textarea
							name="notes"
							rows="2"
							placeholder="Keterangan muatan..."
							class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none resize-none"
						></textarea>
					</div>
				</div>

				<div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-surface-container-low flex justify-end gap-3">
					<button
						type="button"
						onclick={() => isModalOpen = false}
						class="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
							<span>Menyimpan...</span>
						{:else}
							<span class="material-symbols-outlined text-sm">save</span>
							<span>Simpan DN</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
