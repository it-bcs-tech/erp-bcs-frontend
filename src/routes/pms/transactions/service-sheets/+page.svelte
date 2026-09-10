<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDateId, formatNumber } from '$lib/utils/pms';

	let { data } = $props();

	let activeTab = $state<'pending' | 'issued' | 'all'>('pending');
	let searchQuery = $state('');
	let isModalOpen = $state(false);
	let isSubmitting = $state(false);

	// Direct manual form state
	let selectedUnitId = $state('');
	let chassisNo = $state('');
	let selectedMaterialId = $state('');
	let itemQty = $state(1);
	let itemNotes = $state('');
	let spareparts = $state<Array<{
		materialId: number;
		materialCode: string;
		materialName: string;
		qty: number;
		uom: string;
		stock: number;
		notes: string;
	}>>([]);

	// Issue Modal State for Maintenance Service Sheets
	let showIssueModal = $state(false);
	let selectedSsForIssue: any = $state(null);
	let isSubmittingIssue = $state(false);
	let pickerName = $state('');
	let pickerDisplay = $state('');
	let showPickerDropdown = $state(false);
	let issueParts: any[] = $state([]);

	let totalIssueQty = $derived(issueParts.reduce((acc, p) => acc + (parseFloat(p.qty_actual) || 0), 0));

	let filteredStaff = $derived(
		pickerDisplay
			? (data.warehouseStaff || []).filter((s: any) => s.name.toLowerCase().includes(pickerDisplay.toLowerCase()))
			: (data.warehouseStaff || [])
	);

	// Selected Sheet for detail viewing
	let selectedSheetForView = $state<any>(null);

	let allSheets = $derived(data.sheets || []);
	let pendingSheets = $derived(allSheets.filter((s: any) => s.status === 'Pending'));
	let issuedSheets = $derived(allSheets.filter((s: any) => s.status === 'Issued'));

	let filteredSheets = $derived.by(() => {
		let list = allSheets;
		if (activeTab === 'pending') {
			list = pendingSheets;
		} else if (activeTab === 'issued') {
			list = issuedSheets;
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((s: any) =>
				(s.ssNumber && s.ssNumber.toLowerCase().includes(q)) ||
				(s.unitNopol && s.unitNopol.toLowerCase().includes(q)) ||
				(s.woNo && s.woNo.toLowerCase().includes(q)) ||
				(s.mekanikName && s.mekanikName.toLowerCase().includes(q)) ||
				(s.pickerName && s.pickerName.toLowerCase().includes(q)) ||
				(s.helperName && s.helperName.toLowerCase().includes(q)) ||
				(s.driverName && s.driverName.toLowerCase().includes(q)) ||
				(s.chassisNo && s.chassisNo.toLowerCase().includes(q)) ||
				(s.problem && s.problem.toLowerCase().includes(q)) ||
				(s.items && s.items.some((i: any) => i.materialName && i.materialName.toLowerCase().includes(q)))
			);
		}
		return list;
	});

	function onUnitChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedUnitId = target.value;
		const found = data.units.find((u: any) => u.id === parseInt(target.value));
		if (found) {
			chassisNo = found.chassis_no || '';
		} else {
			chassisNo = '';
		}
	}

	function addSparepart() {
		if (!selectedMaterialId) return;
		const mat = data.materials.find((m: any) => m.id === parseInt(selectedMaterialId));
		if (!mat) return;

		const existing = spareparts.find(p => p.materialId === mat.id);
		if (existing) {
			existing.qty += itemQty;
		} else {
			spareparts.push({
				materialId: mat.id,
				materialCode: mat.material_code,
				materialName: mat.name,
				qty: itemQty,
				uom: mat.uom || 'Pcs',
				stock: parseFloat(mat.stock) || 0,
				notes: itemNotes
			});
		}

		selectedMaterialId = '';
		itemQty = 1;
		itemNotes = '';
	}

	function removeSparepart(idx: number) {
		spareparts.splice(idx, 1);
	}

	function openIssueModal(ss: any) {
		selectedSsForIssue = ss;
		issueParts = (ss.items || []).map((d: any) => ({
			detail_id: d.detail_id || d.id,
			id: d.id,
			material_db_id: d.material_db_id || d.materialId,
			material_id: d.materialId,
			material_name: d.materialName,
			material_code: d.materialCode,
			spec: d.spec,
			uom: d.uom,
			stock: parseFloat(d.stock) || 0,
			qty_request: parseFloat(d.qty || d.qty_request) || 0,
			qty_actual: Math.min(parseFloat(d.qty || d.qty_request) || 0, parseFloat(d.stock) || 0),
			price: parseFloat(d.price) || 0
		}));
		showIssueModal = true;
		pickerName = '';
		pickerDisplay = '';
		showPickerDropdown = false;
	}

	function formatCurrency(amount: any) {
		if (!amount) return 'Rp 0';
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	}
</script>

<svelte:head>
	<title>Supply Slip (SS / Work Order Supply) | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">build</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Supply Slip (SS / Service Sheet)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Permintaan & pengeluaran suku cadang internal workshop FMS dari Work Order (SPK)
			</p>
		</div>

		<div class="flex items-center gap-3">
			<!-- Segmented Control Tabs -->
			<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 self-start md:self-auto overflow-x-auto max-w-full">
				<button 
					type="button"
					class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all {activeTab === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
					onclick={() => activeTab = 'pending'}
				>
					<span>Menunggu Penyerahan ({pendingSheets.length})</span>
				</button>
				<button 
					type="button"
					class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all {activeTab === 'issued' ? 'bg-amber-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
					onclick={() => activeTab = 'issued'}
				>
					<span>Sudah Diserahkan ({issuedSheets.length})</span>
				</button>
				<button 
					type="button"
					class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all {activeTab === 'all' ? 'bg-amber-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
					onclick={() => activeTab = 'all'}
				>
					<span>Semua SS ({allSheets.length})</span>
				</button>
			</div>

			<button
				type="button"
				onclick={() => {
					spareparts = [];
					chassisNo = '';
					selectedUnitId = '';
					isModalOpen = true;
				}}
				class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
			>
				<span class="material-symbols-outlined text-[18px]">add</span>
				<span>Terbitkan SS Manual</span>
			</button>
		</div>
	</header>

	<!-- Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between gap-4">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari no SS, WO, nopol, mekanik, sparepart, problem..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Menampilkan: <strong class="text-on-surface">{filteredSheets.length}</strong> Service Sheet
		</span>
	</div>

	<!-- Data View -->
	{#if activeTab === 'pending'}
		<!-- TAB 1: Permintaan Pending (Menunggu Penyerahan Barang) -->
		{#if filteredSheets.length === 0}
			<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs text-center py-16 text-on-surface-variant">
				<span class="material-symbols-outlined text-5xl opacity-40 mb-3 block text-emerald-600">check_circle</span>
				<h3 class="text-base font-bold text-on-surface mb-1">Semua Permintaan SS Selesai!</h3>
				<p class="text-xs font-medium text-on-surface-variant">Tidak ada Service Sheet dari Maintenance yang menunggu penyerahan suku cadang.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{#each filteredSheets as ss}
					<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs p-5 hover:border-amber-500/40 transition-all flex flex-col justify-between">
						<div>
							<div class="flex justify-between items-start mb-3">
								<div>
									<div class="flex items-center gap-2">
										<h3 class="text-base font-bold text-on-surface font-mono text-amber-700 dark:text-amber-300">{ss.ssNumber}</h3>
										<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
											{ss.source === 'maintenance' ? 'WO Maintenance' : 'Manual SS'}
										</span>
									</div>
									<p class="text-xs text-on-surface-variant font-medium mt-0.5 flex items-center gap-1">
										<span class="material-symbols-outlined text-sm">calendar_today</span> {formatDateId(ss.date)}
									</p>
								</div>
								<div class="flex items-center gap-1.5">
									{#if ss.hasShortage}
										<span class="bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider flex items-center gap-1">
											<span class="material-symbols-outlined text-[12px]">warning</span> Stok Kurang
										</span>
									{/if}
									<span class="bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider">Menunggu</span>
								</div>
							</div>
							
							<div class="grid grid-cols-2 gap-3 mb-4">
								<div class="bg-surface p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
									<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-0.5">Unit Armada</p>
									<p class="text-sm font-bold text-on-surface font-mono">{ss.unitNopol}</p>
								</div>
								<div class="bg-surface p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
									<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-0.5">Nomor WO Ref</p>
									<p class="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">{ss.woNo || '-'}</p>
								</div>
							</div>
							
							<div class="mb-4 bg-surface p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
								<div class="flex justify-between items-center mb-1">
									<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Mekanik / Pemohon</p>
									<span class="text-xs font-bold text-on-surface">{ss.mekanikName}</span>
								</div>
								{#if ss.problem && ss.problem !== '-'}
									<p class="text-[11px] text-on-surface-variant italic mt-1 border-t border-slate-200/40 dark:border-slate-800/40 pt-1">
										"{ss.problem}"
									</p>
								{/if}
							</div>

							<!-- Item List -->
							<div class="space-y-2 mb-4 bg-surface p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
								<div class="flex justify-between items-center border-b border-slate-200/40 dark:border-slate-800/40 pb-1.5">
									<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Suku Cadang Diminta ({ss.items.length})</p>
									<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Stok / Req</p>
								</div>
								{#each ss.items as item}
									{@const stockNum = parseFloat(item.stock) || 0}
									{@const isShort = item.qty > stockNum}
									<div class="flex justify-between items-start text-xs pt-1">
										<div class="flex-1 pr-2">
											<p class="font-bold text-on-surface">{item.materialName}</p>
											{#if item.spec && item.spec !== '-'}
												<p class="text-[10px] text-on-surface-variant italic">{item.spec}</p>
											{/if}
											<p class="text-[10px] {stockNum <= 0 ? 'text-rose-600 font-bold' : isShort ? 'text-amber-600 font-bold' : 'text-slate-400'}">
												Stok Gudang: {stockNum} {item.uom || ''}
												{#if isShort}
													<span class="text-rose-600 ml-1 font-mono font-bold">(Kurang {item.qty - stockNum})</span>
												{/if}
											</p>
										</div>
										<span class="font-bold text-amber-600 dark:text-amber-400 ml-2 whitespace-nowrap">{item.qty} {item.uom}</span>
									</div>
								{/each}
							</div>
						</div>

						<div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 mt-auto flex flex-col sm:flex-row gap-2">
							<button 
								type="button"
								onclick={() => openIssueModal(ss)}
								class="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex justify-center items-center gap-2 cursor-pointer"
							>
								<span class="material-symbols-outlined text-base">outbox</span>
								<span>Serahkan Barang / Issue</span>
							</button>
							{#if ss.hasShortage}
								<a 
									href="/pms/transactions/pr/create?from_ss={encodeURIComponent(ss.ssNumber)}"
									class="py-2.5 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors flex justify-center items-center gap-1.5 whitespace-nowrap cursor-pointer"
									title="Buat Purchase Request dari SS ini"
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

	{:else}
		<!-- TAB 2 / 3: Table View (Issued or All) -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm min-w-[1050px]">
					<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3.5 px-4">No. SS & Tanggal</th>
							<th class="py-3.5 px-4">No. WO Ref</th>
							<th class="py-3.5 px-4">Unit Armada & Chassis</th>
							<th class="py-3.5 px-4">Mekanik / Pemohon</th>
							<th class="py-3.5 px-4">Problem / Kerusakan</th>
							<th class="py-3.5 px-4 text-center">Item Sparepart</th>
							<th class="py-3.5 px-4 text-center">Status</th>
							<th class="py-3.5 px-4 text-center">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
						{#if filteredSheets.length === 0}
							<tr>
								<td colspan="8" class="py-12 text-center text-on-surface-variant">
									<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">build</span>
									<p class="text-xs font-semibold">Tidak ada data Supply Slip.</p>
								</td>
							</tr>
						{:else}
							{#each filteredSheets as ss}
								{@const itemCount = ss.items ? ss.items.length : 0}
								<tr class="hover:bg-surface-container-high/40 transition-colors">
									<td class="py-3.5 px-4">
										<span class="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs">
											{ss.ssNumber}
										</span>
										<p class="text-[10px] text-on-surface-variant">{formatDateId(ss.date)}</p>
									</td>
									<td class="py-3.5 px-4 font-mono font-semibold text-on-surface">{ss.woNo || '-'}</td>
									<td class="py-3.5 px-4">
										<span class="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-on-surface">
											{ss.unitNopol}
										</span>
										{#if ss.chassisNo && ss.chassisNo !== '-'}
											<p class="text-[10px] text-on-surface-variant font-mono mt-0.5 truncate max-w-[140px]" title={ss.chassisNo}>
												Chassis: {ss.chassisNo}
											</p>
										{/if}
									</td>
									<td class="py-3.5 px-4">
										<p class="font-bold text-on-surface">{ss.mekanikName}</p>
										{#if ss.pickerName && ss.pickerName !== ss.mekanikName}
											<p class="text-[10px] text-on-surface-variant">Penyerah: {ss.pickerName}</p>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-on-surface max-w-xs truncate" title={ss.problem}>{ss.problem}</td>
									<td class="py-3.5 px-4 text-center">
										{#if itemCount > 0}
											<button
												type="button"
												onclick={() => selectedSheetForView = ss}
												class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-bold text-[10px] hover:bg-amber-100 cursor-pointer transition-colors"
											>
												<span class="material-symbols-outlined text-[14px]">inventory_2</span>
												<span>{itemCount} Sparepart</span>
												{#if ss.hasShortage}
													<span class="w-2 h-2 rounded-full bg-rose-500 ml-0.5"></span>
												{/if}
											</button>
										{:else}
											<span class="text-[10px] text-on-surface-variant italic">0 Item</span>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-center">
										{#if ss.status === 'Issued'}
											<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300">
												Diserahkan
											</span>
										{:else}
											<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-300">
												Pending
											</span>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-center">
										<div class="flex items-center justify-center gap-1.5">
											{#if ss.status === 'Pending'}
												<button
													type="button"
													onclick={() => openIssueModal(ss)}
													class="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
													title="Serahkan barang & potong stok gudang"
												>
													<span class="material-symbols-outlined text-[14px]">outbox</span>
													<span>Issue</span>
												</button>
												{#if ss.hasShortage}
													<a
														href="/pms/transactions/pr/create?from_ss={encodeURIComponent(ss.ssNumber)}"
														class="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
														title="Buat Purchase Request dari SS ini"
													>
														<span class="material-symbols-outlined text-[14px]">shopping_cart</span>
														<span>PR</span>
													</a>
												{/if}
											{:else}
												<button
													type="button"
													onclick={() => selectedSheetForView = ss}
													class="px-2.5 py-1 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
												>
													<span class="material-symbols-outlined text-[14px]">visibility</span>
													<span>Detail</span>
												</button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<!-- MODAL ISSUE PARTS (PENYERAHAN SUKU CADANG DARI SS) -->
{#if showIssueModal && selectedSsForIssue}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick={() => showIssueModal = false} role="button" tabindex="0" onkeydown={(e) => e.key === 'Escape' && (showIssueModal = false)}></div>
		<div class="relative w-full max-w-3xl bg-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
			<div class="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-low">
				<div>
					<h2 class="text-xl font-black text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-600">outbox</span>
						Penyerahan Suku Cadang: {selectedSsForIssue.ssNumber}
					</h2>
					<p class="text-xs text-on-surface-variant font-mono mt-0.5">
						WO: {selectedSsForIssue.woNo || '-'} | Unit: {selectedSsForIssue.unitNopol || '-'}
					</p>
				</div>
				<button onclick={() => showIssueModal = false} class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface-variant">
					<span class="material-symbols-outlined text-[20px]">close</span>
				</button>
			</div>
			
			<div class="p-6 overflow-y-auto flex-1">
				<form 
					id="issueSsForm"
					method="POST" 
					action="?/issueParts"
					use:enhance={({ cancel }) => {
						if (totalIssueQty <= 0) {
							alert(`Mohon maaf, proses gagal diteruskan.\n\nAnda tidak bisa memproses Service Sheet dengan total pengeluaran 0. Harus ada setidaknya 1 barang yang diserahkan fisik ke mekanik.\n\nJika stok sedang kosong, silakan gunakan tombol 'Buat PR Pengadaan' dan biarkan status SS tetap Pending.`);
							cancel();
							return;
						}

						const invalidPart = issueParts.find(p => p.qty_actual > p.stock);
						if (invalidPart) {
							alert(`Mohon maaf, proses gagal diteruskan.\n\nStok barang "${invalidPart.material_name}" tidak mencukupi untuk jumlah yang Anda minta (Aktual: ${invalidPart.qty_actual}, Stok: ${invalidPart.stock}).\n\nSilakan kurangi jumlah pengeluaran aktual agar tidak melebihi stok yang ada.`);
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
					<input type="hidden" name="ss_no" value={selectedSsForIssue.ssNumber} />
					<input type="hidden" name="issued_parts" value={JSON.stringify(issueParts)} />
					
					<div class="relative">
						<label class="block text-sm font-bold text-on-surface mb-2">Petugas Gudang / Penyerah Barang <span class="text-rose-500">*</span></label>
						<input type="hidden" name="picker_name" value={pickerName} required />
						<input 
							type="text" 
							bind:value={pickerDisplay}
							onfocus={() => showPickerDropdown = true}
							onblur={() => setTimeout(() => showPickerDropdown = false, 200)}
							placeholder="Ketik atau pilih nama staff gudang..."
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
										"{pickerDisplay}" tidak ditemukan
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<div class="pt-2">
						<h3 class="text-md font-bold text-on-surface mb-4">Konfirmasi Jumlah Fisik yang Diserahkan</h3>

						<div class="space-y-3">
							{#each issueParts as part}
								<div class="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center p-4 border border-surface-container rounded-xl bg-surface-container-low">
									<div class="flex-1">
										<p class="text-sm font-bold text-on-surface">{part.material_name}</p>
										<p class="text-xs font-medium text-on-surface-variant font-mono">{part.material_code}</p>
										<p class="text-xs font-bold mt-1 {part.stock < part.qty_request ? 'text-rose-500' : 'text-emerald-600'}">
											Stok On-Hand: {part.stock} {part.uom || ''}
										</p>
									</div>
									<div class="flex items-center gap-4 w-full md:w-auto">
										<div class="text-right">
											<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Diminta</p>
											<p class="text-lg font-black text-on-surface font-mono">{part.qty_request}</p>
										</div>
										<div class="w-px h-8 bg-surface-container hidden md:block"></div>
										<div class="flex-1 md:w-28">
											<label for="qty-{part.detail_id}" class="block text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Diserahkan</label>
											<input 
												id="qty-{part.detail_id}"
												type="number" 
												min="0" 
												step="any" 
												required
												bind:value={part.qty_actual}
												class="w-full px-3 py-2 bg-surface border border-emerald-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-bold text-emerald-700 font-mono"
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
								<p class="text-xs mt-1 leading-relaxed">Jumlah penyerahan aktual melebihi stok yang ada di gudang. Harap sesuaikan jumlahnya agar tidak melebihi stok.</p>
							</div>
						</div>
					{:else if totalIssueQty <= 0 && issueParts.length > 0}
						<div class="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl flex items-start gap-3 mt-4">
							<span class="material-symbols-outlined text-amber-500 mt-0.5">warning</span>
							<div>
								<p class="text-sm font-bold">Total Pengeluaran Kosong (0)</p>
								<p class="text-xs mt-1 leading-relaxed">Service Sheet tidak bisa diproses jika tidak ada barang fisik yang diserahkan ke mekanik. Jika barang kosong seluruhnya, biarkan status SS tetap <span class="font-bold">Pending</span> dan buat PR pengadaan.</p>
							</div>
						</div>
					{/if}

					{#if issueParts.some(p => p.stock < p.qty_request)}
						<div class="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
							<div class="flex items-start gap-2.5">
								<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl mt-0.5">shopping_cart</span>
								<div>
									<p class="text-xs font-bold text-amber-800 dark:text-amber-300">Stok Gudang Kurang?</p>
									<p class="text-[11px] text-on-surface-variant mt-0.5">Terdapat material yang kurang stoknya. Anda dapat langsung menerbitkan Purchase Request (PR) otomatis dari SS ini.</p>
								</div>
							</div>
							<a 
								href="/pms/transactions/pr/create?from_ss={encodeURIComponent(selectedSsForIssue.ssNumber)}"
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
					Batal
				</button>
				<button 
					type="submit"
					form="issueSsForm"
					disabled={isSubmittingIssue || !pickerName || issueParts.some(p => p.qty_actual > p.stock) || totalIssueQty <= 0}
					class="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-70 flex items-center gap-2 cursor-pointer"
				>
					{#if isSubmittingIssue}
						<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
						<span>Memproses...</span>
					{:else}
						<span class="material-symbols-outlined text-[18px]">check_circle</span>
						<span>Konfirmasi Penyerahan (Potong Stok)</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL DETAIL SPARKPART KELUAR -->
{#if selectedSheetForView}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div>
					<h3 class="text-base font-extrabold text-on-surface">Rincian Suku Cadang Service Sheet</h3>
					<p class="text-xs text-on-surface-variant font-mono mt-0.5">{selectedSheetForView.ssNumber} ({selectedSheetForView.unitNopol})</p>
				</div>
				<button type="button" onclick={() => selectedSheetForView = null} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="p-6 overflow-y-auto max-h-[60vh] space-y-3">
				{#each selectedSheetForView.items as itm}
					<div class="p-3.5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
						<div>
							<span class="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">{itm.materialCode}</span>
							<p class="text-xs font-bold text-on-surface">{itm.materialName}</p>
							{#if itm.spec && itm.spec !== '-'}
								<p class="text-[10px] text-on-surface-variant">{itm.spec}</p>
							{/if}
							{#if itm.notes && itm.notes !== '-'}
								<p class="text-[10px] text-on-surface-variant mt-0.5 italic">Catatan: {itm.notes}</p>
							{/if}
						</div>
						<div class="text-right">
							<span class="px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black font-mono text-xs">
								{itm.qtyActual ?? itm.qty} {itm.uom}
							</span>
							{#if itm.price > 0}
								<p class="text-[10px] text-on-surface-variant font-mono mt-1">{formatCurrency(itm.total || (itm.qty * itm.price))}</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-surface-container-low flex justify-end">
				<button
					type="button"
					onclick={() => selectedSheetForView = null}
					class="px-5 py-2 rounded-xl bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high"
				>
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL TAMBAH SUPPLY SLIP MANUAL BARU -->
{#if isModalOpen}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">build</span>
					<div>
						<h3 class="text-base font-extrabold text-on-surface">Terbitkan Supply Slip (SS) Manual</h3>
						<p class="text-xs text-on-surface-variant">Catat pemakaian & suku cadang langsung keluar dari gudang</p>
					</div>
				</div>
				<button type="button" onclick={() => isModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form 
				method="POST" 
				action="?/save" 
				class="flex-1 overflow-y-auto flex flex-col justify-between"
				use:enhance={() => {
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
				}}
			>
				<input type="hidden" name="itemsJson" value={JSON.stringify(spareparts)} />

				<div class="p-6 space-y-4">
					<!-- Tanggal & No WO -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Tanggal Keluar
							</label>
							<input
								type="date"
								name="date"
								required
								value={new Date().toISOString().split('T')[0]}
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								No. Work Order (WO) Ref
							</label>
							<input
								type="text"
								name="woNo"
								placeholder="Contoh: WO-2026-008"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none uppercase font-mono"
							/>
						</div>
					</div>

					<!-- Unit & Chassis No -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Pilih Unit Armada
							</label>
							<select
								name="unitId"
								bind:value={selectedUnitId}
								onchange={onUnitChange}
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								<option value="">-- Non-Unit / Workshop Umum --</option>
								{#each data.units as u}
									<option value={u.id}>{u.nopol} ({u.hull_number || '-'})</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Nomor Rangka / Chassis No
							</label>
							<input
								type="text"
								name="chassisNo"
								bind:value={chassisNo}
								placeholder="No Rangka Unit"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-mono font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none uppercase"
							/>
						</div>
					</div>

					<!-- Project & Tipe Service -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Project
							</label>
							<select
								name="projectId"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								<option value="">-- Bebas / Standar Operasional --</option>
								{#each data.projects as p}
									<option value={p.id}>{p.project_name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Tipe Pekerjaan
							</label>
							<select
								name="tipe"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							>
								<option value="Perawatan Rutin">Perawatan Rutin</option>
								<option value="Ganti Oli & Filter">Ganti Oli & Filter</option>
								<option value="Perbaikan Rem & Kaki-Kaki">Perbaikan Rem & Kaki-Kaki</option>
								<option value="Perbaikan Mesin / Engine">Perbaikan Mesin / Engine</option>
								<option value="Overhaul Transmisi">Overhaul Transmisi</option>
								<option value="Kelistrikan & AC">Kelistrikan & AC</option>
								<option value="Body & Karoseri">Body & Karoseri</option>
							</select>
						</div>
					</div>

					<!-- Mekanik, Helper, Driver -->
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Nama Mekanik Utama
							</label>
							<input
								type="text"
								name="mekanikName"
								placeholder="Nama mekanik"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Helper Mekanik
							</label>
							<input
								type="text"
								name="helperName"
								placeholder="Nama asisten/helper"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
								Driver Pemegang
							</label>
							<input
								type="text"
								name="driverName"
								list="driverList"
								placeholder="Nama driver"
								class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none"
							/>
							<datalist id="driverList">
								{#each data.drivers as d}
									<option value={d.name}>{d.name}</option>
								{/each}
							</datalist>
						</div>
					</div>

					<!-- Problem Description -->
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Deskripsi Problem / Kerusakan <span class="text-rose-500">*</span>
						</label>
						<textarea
							name="problem"
							required
							rows="2"
							placeholder="Keluhan driver, gejala kerusakan, atau catatan perbaikan..."
							class="w-full bg-surface-container border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-on-surface focus:ring-2 focus:ring-amber-500 outline-none resize-none"
						></textarea>
					</div>

					<!-- SPAREPART PICKER SECTION -->
					<div class="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="material-symbols-outlined text-amber-600 text-lg">inventory_2</span>
								<h4 class="text-xs font-black text-on-surface uppercase tracking-wider">Item Suku Cadang yang Dikeluarkan (Auto-Potong Stok)</h4>
							</div>
							<span class="text-[10px] font-bold text-on-surface-variant">{spareparts.length} Item Ditambahkan</span>
						</div>

						<!-- Input Bar -->
						<div class="p-3.5 rounded-2xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row gap-2 items-end">
							<div class="flex-1 w-full">
								<label class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">
									Pilih Material / Sparepart
								</label>
								<select
									bind:value={selectedMaterialId}
									class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-1.5 text-xs font-medium outline-none"
								>
									<option value="">-- Pilih Suku Cadang --</option>
									{#each data.materials as m}
										<option value={m.id}>{m.material_code} - {m.name} (Stok: {m.stock} {m.uom})</option>
									{/each}
								</select>
							</div>

							<div class="w-full sm:w-24">
								<label class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">
									Qty
								</label>
								<input
									type="number"
									min="0.1"
									step="any"
									bind:value={itemQty}
									class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-1.5 text-xs font-bold font-mono outline-none"
								/>
							</div>

							<div class="w-full sm:w-44">
								<label class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">
									Catatan Pemasangan
								</label>
								<input
									type="text"
									placeholder="Posisi / Keterangan"
									bind:value={itemNotes}
									class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-1.5 text-xs outline-none"
								/>
							</div>

							<button
								type="button"
								onclick={addSparepart}
								disabled={!selectedMaterialId}
								class="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
							>
								<span class="material-symbols-outlined text-sm">add</span>
								<span>Tambah</span>
							</button>
						</div>

						<!-- Selected Spareparts List -->
						{#if spareparts.length > 0}
							<div class="space-y-1.5 max-h-40 overflow-y-auto">
								{#each spareparts as itm, i}
									<div class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 text-xs">
										<div class="flex-1 min-w-0 pr-2">
											<span class="font-mono font-bold text-amber-600 dark:text-amber-400 text-[10px]">{itm.materialCode}</span>
											<p class="font-bold text-on-surface truncate">{itm.materialName}</p>
											{#if itm.notes}
												<p class="text-[10px] text-on-surface-variant truncate">{itm.notes}</p>
											{/if}
										</div>
										<div class="flex items-center gap-3">
											<span class="font-mono font-black text-amber-700 dark:text-amber-300">
												{itm.qty} {itm.uom}
											</span>
											<button
												type="button"
												onclick={() => removeSparepart(i)}
												class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
												title="Hapus item"
											>
												<span class="material-symbols-outlined text-base">delete</span>
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
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
							<span>Menyimpan & Memotong Stok...</span>
						{:else}
							<span class="material-symbols-outlined text-sm">send</span>
							<span>Terbitkan Supply Slip</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

