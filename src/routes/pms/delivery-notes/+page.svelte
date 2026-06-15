<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	let activeTab = $state('pending');
	
	let pendingDNs = $derived(data.deliveryNotes.filter((dn: any) => dn.status === 'Pending'));
	let issuedDNs = $derived(data.deliveryNotes.filter((dn: any) => dn.status === 'Issued'));

	let showIssueModal = $state(false);
	let selectedDn: any = $state(null);
	let isSubmitting = $state(false);
	
	// Issue Form States
	let pickerName = $state('');
	let pickerDisplay = $state('');
	let showPickerDropdown = $state(false);
	let issueParts: any[] = $state([]);

	let totalIssueQty = $derived(issueParts.reduce((acc, p) => acc + (parseFloat(p.qty_actual) || 0), 0));

	let filteredStaff = $derived(
		pickerDisplay ? data.warehouseStaff.filter(s => s.name.toLowerCase().includes(pickerDisplay.toLowerCase())) : data.warehouseStaff
	);

	function openIssueModal(dn: any) {
		selectedDn = dn;
		// Prepare the parts for the form
		issueParts = dn.details.map((d: any) => ({
			detail_id: d.id,
			material_db_id: d.m_id,
			material_id: d.material_id,
			material_name: d.material_name,
			material_code: d.material_code,
			stock: d.stock || 0,
			qty_request: d.qty_request,
			qty_actual: d.qty_request, // default to fulfilling requested qty
			price: d.price
		}));
		showIssueModal = true;
		pickerName = '';
		pickerDisplay = '';
		showPickerDropdown = false;
	}

	function formatDate(dateStr: any) {
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
	<title>Warehouse Delivery Notes | PMS</title>
</svelte:head>

<div class="flex flex-col h-full max-w-7xl mx-auto space-y-6">
	<!-- Header -->
	<div class="bg-surface-container-lowest rounded-[32px] p-8 shadow-sm">
		<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
			<div>
				<p class="text-sm font-black tracking-widest text-on-surface-variant uppercase mb-2">Inventory Management</p>
				<h1 class="text-3xl font-black text-on-surface tracking-tight mb-2 flex items-center gap-3">
					<span class="material-symbols-outlined text-emerald-600 text-4xl">inventory_2</span>
					Delivery Notes (Material Requests)
				</h1>
				<p class="text-sm font-medium text-on-surface-variant">Review and issue spareparts requested by mechanics for maintenance work orders.</p>
			</div>
			
			<div class="flex bg-surface-container p-1 rounded-2xl">
				<button 
					class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all {activeTab === 'pending' ? 'bg-surface-container-lowest text-emerald-600 shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => activeTab = 'pending'}
				>
					Pending ({pendingDNs.length})
				</button>
				<button 
					class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all {activeTab === 'issued' ? 'bg-surface-container-lowest text-emerald-600 shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => activeTab = 'issued'}
				>
					Issued ({issuedDNs.length})
				</button>
			</div>
		</div>
	</div>

	<!-- List -->
	<div class="bg-surface-container-lowest rounded-[32px] p-6 shadow-sm flex-1">
		{#if activeTab === 'pending'}
			{#if pendingDNs.length === 0}
				<div class="text-center py-16 text-on-surface-variant">
					<span class="material-symbols-outlined text-6xl opacity-50 mb-4">check_circle</span>
					<h3 class="text-xl font-bold text-on-surface mb-2">All clear!</h3>
					<p class="text-sm">There are no pending material requests.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{#each pendingDNs as dn}
						<div class="border border-outline-variant/30 rounded-2xl p-5 hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between">
							<div>
								<div class="flex justify-between items-start mb-4">
									<div>
										<h3 class="text-lg font-black text-on-surface">{dn.dn_no}</h3>
										<p class="text-xs font-bold text-on-surface-variant mt-1 flex items-center gap-1">
											<span class="material-symbols-outlined text-[14px]">calendar_today</span> {formatDate(dn.created_at)}
										</p>
									</div>
									<span class="bg-amber-100 text-amber-700 font-bold px-3 py-1 rounded-full text-xs">Pending</span>
								</div>
								
								<div class="grid grid-cols-2 gap-4 mb-4">
									<div class="bg-surface-container-low p-3 rounded-xl">
										<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Target Unit</p>
										<p class="text-sm font-bold text-on-surface">{dn.unit_id || '-'}</p>
									</div>
									<div class="bg-surface-container-low p-3 rounded-xl">
										<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Work Order</p>
										<p class="text-sm font-bold text-on-surface">{dn.wo_no || '-'}</p>
									</div>
								</div>
								
								{#if dn.note}
									<div class="mb-4">
										<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Note</p>
										<p class="text-sm italic text-on-surface-variant">"{dn.note}"</p>
									</div>
								{/if}

								<div class="space-y-2 mb-4">
									<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Requested Items ({dn.details.length})</p>
									{#each dn.details as item}
										<div class="flex justify-between text-sm">
											<span class="font-medium text-on-surface">{item.material_name} ({item.material_code})</span>
											<span class="font-bold text-emerald-600">{item.qty_request}x</span>
										</div>
									{/each}
								</div>
							</div>

							<div class="pt-4 border-t border-surface-container mt-auto">
								<button 
									onclick={() => openIssueModal(dn)}
									class="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors flex justify-center items-center gap-2 shadow-sm"
								>
									<span class="material-symbols-outlined text-[18px]">outbox</span>
									Review & Issue Items
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{:else}
			{#if issuedDNs.length === 0}
				<div class="text-center py-16 text-on-surface-variant">
					<span class="material-symbols-outlined text-6xl opacity-50 mb-4">history</span>
					<p class="text-sm font-medium">No issued delivery notes history found.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{#each issuedDNs as dn}
						<div class="border border-outline-variant/30 rounded-2xl p-5 bg-surface-container-lowest opacity-80 hover:opacity-100 transition-opacity">
							<div class="flex justify-between items-start mb-4">
								<div>
									<h3 class="text-lg font-black text-on-surface">{dn.dn_no}</h3>
									<p class="text-xs font-bold text-on-surface-variant mt-1 flex items-center gap-1">
										<span class="material-symbols-outlined text-[14px]">calendar_today</span> Issued: {formatDate(dn.updated_at)}
									</p>
								</div>
								<span class="bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-full text-xs">Issued</span>
							</div>
							
							<div class="flex gap-4 mb-4 text-sm">
								<div><span class="text-on-surface-variant">WO:</span> <span class="font-bold">{dn.wo_no}</span></div>
								<div><span class="text-on-surface-variant">Picked by:</span> <span class="font-bold">{dn.picker_name || dn.picked_by}</span></div>
							</div>

							<div class="space-y-2 pt-3 border-t border-surface-container">
								{#each dn.details as item}
									<div class="flex justify-between text-sm">
										<span class="font-medium text-on-surface">{item.material_name}</span>
										<span class="font-bold text-emerald-600">{item.qty_actual}x <span class="text-xs font-normal text-on-surface-variant">({formatCurrency(item.total)})</span></span>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>

<!-- ISSUE MODAL -->
{#if showIssueModal && selectedDn}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick={() => showIssueModal = false}></div>
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

						isSubmitting = true;
						return async ({ update }) => {
							await update();
							isSubmitting = false;
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
											Current Stock: {part.stock}
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
					disabled={isSubmitting || !pickerName || issueParts.some(p => p.qty_actual > p.stock) || totalIssueQty <= 0}
					class="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-70 flex items-center gap-2"
				>
					{#if isSubmitting}
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
