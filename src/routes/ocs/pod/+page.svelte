<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let summary = $derived(data.summary);
	let pods = $derived(data.pods || []);
	let pendingOrders = $derived(data.pendingOrdersForPod || []);

	let showCreateModal = $state(false);
	let selectedOrder = $state<any>(null);
	let selectedPodForPreview = $state<any>(null);

	let inputReceivedWeight = $state<number>(0);
	let inputDispatchedWeight = $state<number>(0);
	let computedDiscrepancy = $derived(inputDispatchedWeight - inputReceivedWeight);

	function openCreateModal(order?: any) {
		if (order) {
			selectedOrder = order;
			inputDispatchedWeight = parseFloat(order.dispatched_weight || 0);
			inputReceivedWeight = parseFloat(order.dispatched_weight || 0);
		} else if (pendingOrders.length > 0) {
			selectedOrder = pendingOrders[0];
			inputDispatchedWeight = parseFloat(selectedOrder.dispatched_weight || 0);
			inputReceivedWeight = parseFloat(selectedOrder.dispatched_weight || 0);
		}
		showCreateModal = true;
	}

	function onOrderSelectChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const found = pendingOrders.find((o: any) => o.id === select.value);
		if (found) {
			selectedOrder = found;
			inputDispatchedWeight = parseFloat(found.dispatched_weight || 0);
			inputReceivedWeight = parseFloat(found.dispatched_weight || 0);
		}
	}
</script>

<svelte:head>
	<title>e-POD & Surat Jalan Balik | OCS ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-2xl">verified</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">e-POD & Surat Jalan Balik (SJB)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Digital Proof of Delivery, verifikasi timbangan susut muatan, dan otorisasi kesiapan penagihan Invoice
			</p>
		</div>

		<div class="flex items-center gap-3">
			<button
				onclick={() => openCreateModal()}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
			>
				<span class="material-symbols-outlined text-lg">add_a_photo</span>
				<span>Input e-POD Baru</span>
			</button>
		</div>
	</div>

	<!-- Alert Messages -->
	{#if form?.error}
		<div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5">
			<span class="material-symbols-outlined text-rose-500 text-lg">error</span>
			<span>{form.error}</span>
		</div>
	{/if}
	{#if form?.message}
		<div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
			<span class="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- Metric Cards (Bento Style) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total e-POD</p>
					<h3 class="text-2xl font-black text-on-surface mt-1">{summary.total}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">fact_check</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2 font-medium">Dokumen pengiriman tercatat</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Menunggu Otorisasi</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{summary.pendingVerification}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">pending_actions</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 mt-2 font-bold">Verifikasi OCS Diperlukan</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Siap Invoice (Verified)</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">{summary.verified}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">verified_user</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 mt-2 font-bold">Terhubung ke Modul Finance</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Selisih / Susut Muatan</p>
					<h3 class="text-2xl font-black text-rose-600 mt-1">{summary.totalShrinkageTons.toFixed(2)} Ton</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">scale</span>
				</div>
			</div>
			<p class="text-xs text-rose-600 mt-2 font-bold">{summary.disputed} Order Selisih Timbangan</p>
		</div>
	</div>

	<!-- Main Filter & Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden">
		<!-- Table Filter Toolbar -->
		<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
			<div class="flex items-center gap-2 w-full sm:w-auto">
				<a
					href="?status=All"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('status') === 'All' || !$page.url.searchParams.get('status') ? 'bg-indigo-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Semua ({summary.total})
				</a>
				<a
					href="?status=PENDING_VERIFICATION"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('status') === 'PENDING_VERIFICATION' ? 'bg-amber-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Pending ({summary.pendingVerification})
				</a>
				<a
					href="?status=VERIFIED"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('status') === 'VERIFIED' ? 'bg-emerald-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Verified ({summary.verified})
				</a>
				<a
					href="?status=DISPUTED"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('status') === 'DISPUTED' ? 'bg-rose-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Disputed ({summary.disputed})
				</a>
			</div>
		</div>

		<!-- Table View -->
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[850px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">No. e-POD & Order</th>
						<th class="py-3.5 px-5">Customer & Rute</th>
						<th class="py-3.5 px-5">Unit & Driver</th>
						<th class="py-3.5 px-5">Tonase (Muat vs Terima)</th>
						<th class="py-3.5 px-5">Penerima & Waktu</th>
						<th class="py-3.5 px-5">Status</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if pods.length === 0}
						<tr>
							<td colspan="7" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 block mb-2">description</span>
								<p class="font-bold text-sm">Belum ada data e-POD pada filter ini</p>
								<p class="text-xs mt-0.5">Klik "Input e-POD Baru" untuk meregistrasi surat jalan balik dari driver.</p>
							</td>
						</tr>
					{:else}
						{#each pods as p}
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-4 px-5">
									<p class="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{p.pod_number}</p>
									<p class="text-[11px] font-mono text-on-surface font-semibold mt-0.5">{p.sales_order_id}</p>
									<span class="text-[10px] text-on-surface-variant">{p.jenis_muatan || 'Muatan Umum'}</span>
								</td>
								<td class="py-4 px-5">
									<p class="text-xs font-bold text-on-surface">{p.customer_name || 'Customer'}</p>
									<p class="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-1">
										<span>{p.origin_name || '-'}</span>
										<span class="material-symbols-outlined text-[12px]">arrow_forward</span>
										<span>{p.destination_name || '-'}</span>
									</p>
								</td>
								<td class="py-4 px-5">
									<p class="text-xs font-bold text-on-surface">{p.unit_number || 'Unit -'}</p>
									<p class="text-[11px] text-on-surface-variant mt-0.5">{p.driver_name || 'Driver -'}</p>
								</td>
								<td class="py-4 px-5">
									<div class="flex items-center gap-2">
										<div>
											<span class="text-xs font-bold text-on-surface">{p.received_weight} Ton</span>
											<span class="text-[10px] text-on-surface-variant block">Kirim: {p.dispatched_weight} Ton</span>
										</div>
										{#if Math.abs(parseFloat(p.shrinkage_weight || '0')) > 0.05}
											<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200">
												-{p.shrinkage_weight} Ton ({p.shrinkage_pct}%)
											</span>
										{:else}
											<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
												Pas
											</span>
										{/if}
									</div>
								</td>
								<td class="py-4 px-5">
									<p class="text-xs font-bold text-on-surface">{p.receiver_name || '-'}</p>
									<p class="text-[10px] text-on-surface-variant mt-0.5">{new Date(p.received_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
								</td>
								<td class="py-4 px-5">
									{#if p.status === 'VERIFIED'}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
											Verified
										</span>
									{:else if p.status === 'DISPUTED'}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200">
											<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
											Disputed
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200">
											<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
											Pending OCS
										</span>
									{/if}
								</td>
								<td class="py-4 px-5 text-right">
									<div class="flex items-center justify-end gap-2">
										{#if p.pod_document_url}
											<button
												onclick={() => selectedPodForPreview = p}
												class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
												title="Lihat Foto Surat Jalan Balik"
											>
												<span class="material-symbols-outlined text-lg">image</span>
											</button>
										{/if}

										{#if p.status !== 'VERIFIED'}
											<form action="?/verifyPod" method="POST" use:enhance>
												<input type="hidden" name="pod_id" value={p.id} />
												<button
													type="submit"
													class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors"
												>
													Verifikasi
												</button>
											</form>
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
</div>

<!-- Modal: Input e-POD Baru -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<h3 class="text-base font-bold text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-indigo-600 text-xl">verified</span>
					<span>Registrasi Digital Proof of Delivery</span>
				</h3>
				<button onclick={() => showCreateModal = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form action="?/submitPod" method="POST" use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') {
						showCreateModal = false;
					}
				};
			}} class="p-6 space-y-4">
				<!-- Pilih Sales Order -->
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="sales_order_select">
						Pilih Order Pengiriman
					</label>
					<select
						id="sales_order_select"
						name="sales_order_id"
						onchange={onOrderSelectChange}
						class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
					>
						{#each pendingOrders as o}
							<option value={o.id} selected={selectedOrder?.id === o.id}>
								{o.id} — {o.customer_name} ({o.unit_number} / {o.driver_name})
							</option>
						{/each}
					</select>
				</div>

				{#if selectedOrder}
					<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1">
						<p class="font-bold text-on-surface">{selectedOrder.customer_name}</p>
						<p class="text-on-surface-variant">{selectedOrder.origin_name} → {selectedOrder.destination_name}</p>
						<p class="text-indigo-600 font-bold">Tonase Muat Awal: {inputDispatchedWeight} Ton</p>
					</div>
				{/if}

				<!-- Berat Diterima & Susut Discrepancy -->
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="received_weight_input">
							Berat Diterima (Ton)
						</label>
						<input
							id="received_weight_input"
							type="number"
							step="0.01"
							name="received_weight"
							bind:value={inputReceivedWeight}
							required
							class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
						/>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="selisih_readonly">
							Selisih / Susut (Ton)
						</label>
						<div id="selisih_readonly" class="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold {Math.abs(computedDiscrepancy) > 0.1 ? 'text-rose-600' : 'text-emerald-600'}">
							{computedDiscrepancy.toFixed(2)} Ton
						</div>
					</div>
				</div>

				<!-- Nama & Telepon Penerima -->
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="receiver_name_input">
							Nama PIC Penerima
						</label>
						<input
							id="receiver_name_input"
							type="text"
							name="receiver_name"
							placeholder="Nama Petugas Gudang"
							required
							class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
						/>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="receiver_phone_input">
							No. HP Penerima
						</label>
						<input
							id="receiver_phone_input"
							type="text"
							name="receiver_phone"
							placeholder="0812xxxxxxxx"
							class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
						/>
					</div>
				</div>

				<!-- URL Foto Dokumen / Bukti Surat Jalan -->
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="pod_document_url_input">
						Tautan / Bukti Foto Surat Jalan Berstempel
					</label>
					<input
						id="pod_document_url_input"
						type="url"
						name="pod_document_url"
						placeholder="https://..."
						class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
					/>
				</div>

				<!-- Catatan -->
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="pod_notes_input">
						Catatan Serah Terima
					</label>
					<textarea
						id="pod_notes_input"
						name="notes"
						rows="2"
						placeholder="Kondisi barang, catatan timbangan, dll."
						class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button
						type="button"
						onclick={() => showCreateModal = false}
						class="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
					>
						Simpan e-POD
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Preview Surat Jalan Balik -->
{#if selectedPodForPreview}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<div>
					<h3 class="text-base font-bold text-on-surface">{selectedPodForPreview.pod_number}</h3>
					<p class="text-xs text-on-surface-variant font-mono">{selectedPodForPreview.sales_order_id}</p>
				</div>
				<button onclick={() => selectedPodForPreview = null} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 space-y-4">
				<img
					src={selectedPodForPreview.pod_document_url}
					alt="Bukti Surat Jalan Balik"
					class="w-full h-64 object-cover rounded-xl border border-slate-200 dark:border-slate-800"
				/>
				<div class="text-xs space-y-1">
					<p><strong class="text-on-surface">Penerima:</strong> {selectedPodForPreview.receiver_name} ({selectedPodForPreview.receiver_phone || '-'})</p>
					<p><strong class="text-on-surface">Catatan:</strong> {selectedPodForPreview.notes || '-'}</p>
					<p><strong class="text-on-surface">Status:</strong> <span class="font-bold">{selectedPodForPreview.status}</span></p>
				</div>
			</div>
		</div>
	</div>
{/if}
