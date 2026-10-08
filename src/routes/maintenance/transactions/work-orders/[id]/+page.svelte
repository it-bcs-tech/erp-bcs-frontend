<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: any } = $props();

	let wo = $derived(data.wo);
	let mechanics = $derived(data.mechanics || []);
	let materials = $derived(data.materials || []);

	let isAssignModalOpen = $state(false);
	let isSparepartModalOpen = $state(false);
	let isDispensationModalOpen = $state(false);
	let updatingItemId = $state<string | null>(null);

	let dispensationRec = $state(wo.dispensationData?.recommendation || '');
	let dispensationReason = $state(wo.dispensationData?.operational_reason || '');
	let dispensationCommitment = $state(wo.dispensationData?.commitment_date || '');

	// Sparepart picker state
	let searchMaterial = $state('');
	let selectedMaterialCode = $state('');
	let selectedMaterialName = $state('');
	let selectedMaterialUom = $state('PCS');
	let selectedMaterialPrice = $state(0);
	let partQty = $state(1);
	let partItemRef = $state('');

	let filteredMaterials = $derived(
		materials.filter(m => 
			m.name.toLowerCase().includes(searchMaterial.toLowerCase()) ||
			m.code.toLowerCase().includes(searchMaterial.toLowerCase()) ||
			m.partNo.toLowerCase().includes(searchMaterial.toLowerCase())
		).slice(0, 8)
	);

	function selectMaterial(mat: typeof materials[0]) {
		selectedMaterialCode = mat.code;
		selectedMaterialName = mat.name;
		selectedMaterialUom = mat.uom;
		selectedMaterialPrice = mat.price;
	}

	let totalItems = $derived(wo.repairedItems.length);
	let resolvedItemsCount = $derived(wo.repairedItems.filter((i: any) => i.status === 'RESOLVED').length);
	let allItemsResolved = $derived(totalItems > 0 && resolvedItemsCount === totalItems);

	// Total spareparts cost
	let totalPartsCost = $derived(
		wo.pmsParts.reduce((acc, p) => acc + (p.total || 0), 0)
	);

	function getStatusBadge(status: string) {
		const s = status.toUpperCase();
		if (s.includes('DISPENSATION')) {
			return 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border-amber-400 dark:border-amber-700 font-bold';
		}
		if (s.includes('PROGRESS') || s.includes('PROSES')) {
			return 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800';
		}
		if (s.includes('REINSPECT') || s.includes('READY')) {
			return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800';
		}
		if (s.includes('CLOSE') || s.includes('COMPLET')) {
			return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
		}
		return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800';
	}
</script>

<svelte:head>
	<title>{wo.woNo} - Pengerjaan SPK Bengkel | ERP BCS</title>
</svelte:head>

<div class="max-w-5xl mx-auto space-y-6 pb-16">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<nav class="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mb-1">
				<a href="/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<a href="/maintenance/transactions/work-orders" class="hover:text-primary transition-colors">Work Orders</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<span class="text-on-surface font-bold">{wo.woNo}</span>
			</nav>
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-black text-on-surface tracking-tight font-mono">{wo.woNo}</h1>
				<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black border {getStatusBadge(wo.status)}">
					{wo.status}
				</span>
			</div>
		</div>

		<div class="flex items-center gap-2">
			{#if !allItemsResolved && wo.status !== 'Closed' && wo.status !== 'READY_FOR_REINSPECTION' && !wo.dispensationData?.is_requested}
				<button 
					type="button" 
					onclick={() => isDispensationModalOpen = true}
					class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all"
				>
					<span class="material-symbols-outlined text-[16px]">release_alert</span>
					<span>Ajukan Dispensasi Jalan</span>
				</button>
			{/if}
			{#if wo.status === 'READY_FOR_REINSPECTION'}
				<a href="/maintenance/transactions/inspections/{encodeURIComponent(wo.inspectionNo || wo.woNo)}/re-inspect" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 shadow-sm transition-all">
					<span class="material-symbols-outlined text-[16px]">verified</span>
					<span>Uji Re-Inspeksi</span>
				</a>
			{/if}
			<a href="/maintenance/transactions/work-orders/{encodeURIComponent(wo.woNo)}/print" target="_blank" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-xs border border-slate-200/80 dark:border-slate-800/80 transition-all">
				<span class="material-symbols-outlined text-[16px]">print</span>
				<span>Cetak SPK Fisik</span>
			</a>
		</div>
	</header>

	{#if form?.message}
		<div class="p-4 rounded-xl {form.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'} text-xs font-bold flex items-center gap-2">
			<span class="material-symbols-outlined text-[18px]">{form.success ? 'check_circle' : 'error'}</span>
			{form.message}
		</div>
	{/if}

	<!-- Banner: Dispensasi Jalan Aktif (Rilis Bersyarat) -->
	{#if wo.status === 'DISPENSATION_ACTIVE'}
		<div class="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-on-surface space-y-4">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div class="flex items-start gap-3">
					<div class="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-0.5">
						<span class="material-symbols-outlined text-2xl">warning</span>
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h3 class="text-sm font-black uppercase tracking-wider text-amber-900 dark:text-amber-100">Dispensasi Jalan Aktif (Rilis Bersyarat)</h3>
							<span class="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-white uppercase tracking-wider">Unit Beroperasi</span>
						</div>
						<p class="text-xs text-on-surface-variant mt-0.5">
							Unit diizinkan beroperasi sementara dengan rekomendasi teknis & telah disetujui penuh oleh Maintenance, Inspek, dan Operational.
						</p>
					</div>
				</div>

				<form method="POST" action="?/returnToWorkshop" use:enhance>
					<button 
						type="submit" 
						class="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
					>
						<span class="material-symbols-outlined text-[16px]">build_circle</span>
						<span>Tandai Unit Kembali ke Bengkel</span>
					</button>
				</form>
			</div>

			<!-- Dispensation details -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface-container/60 text-xs">
				<div>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase">Rekomendasi Mekanik:</span>
					<p class="font-semibold text-on-surface mt-0.5">{wo.dispensationData?.recommendation || '-'}</p>
				</div>
				<div>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase">Alasan Kebutuhan Operasional:</span>
					<p class="font-semibold text-on-surface mt-0.5">{wo.dispensationData?.operational_reason || '-'}</p>
				</div>
				<div>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase">Target Kembali ke Bengkel:</span>
					<p class="font-mono font-bold text-primary mt-0.5">
						{wo.dispensationData?.commitment_date ? new Date(wo.dispensationData.commitment_date).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}
					</p>
				</div>
			</div>

			<!-- 3 Approvers summary -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-amber-500/20">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
					<div>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase">1. Maintenance:</span>
						<div class="font-bold text-on-surface">{wo.dispensationData?.approval_maintenance?.by || 'Disetujui'}</div>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
					<div>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase">2. Inspeksi:</span>
						<div class="font-bold text-on-surface">{wo.dispensationData?.approval_inspek?.by || 'Disetujui'}</div>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
					<div>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase">3. Operational:</span>
						<div class="font-bold text-on-surface">{wo.dispensationData?.approval_operational?.by || 'Disetujui'}</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Banner: Menunggu Persetujuan Dispensasi Jalan (3 Pihak) -->
	{#if wo.dispensationData?.is_requested && wo.status !== 'DISPENSATION_ACTIVE' && wo.status !== 'Closed'}
		<div class="p-6 rounded-2xl bg-surface-container-lowest border-2 border-amber-500/40 space-y-4">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-500 text-[22px]">pending_actions</span>
						<h3 class="text-sm font-black text-on-surface uppercase tracking-wider">Menunggu Persetujuan Dispensasi Jalan (3 Pihak)</h3>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">
						Mekanik mengajukan izin jalan sementara. Unit baru dapat dirilis (STANDBY) setelah disetujui bertingkat oleh Maintenance, Inspek, dan Operational.
					</p>
				</div>
				<span class="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
					Menunggu Persetujuan
				</span>
			</div>

			<!-- Dispensation Request Info -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface-container text-xs">
				<div>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase">Rekomendasi Mekanik:</span>
					<p class="font-semibold text-on-surface mt-0.5">{wo.dispensationData.recommendation || '-'}</p>
					<span class="text-[10px] text-on-surface-variant">Diajukan oleh: <b>{wo.dispensationData.requested_by || 'Mekanik'}</b></span>
				</div>
				<div>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase">Alasan Kebutuhan Operasional:</span>
					<p class="font-semibold text-on-surface mt-0.5">{wo.dispensationData.operational_reason || '-'}</p>
				</div>
				<div>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase">Target Kembali ke Bengkel:</span>
					<p class="font-mono font-bold text-primary mt-0.5">
						{wo.dispensationData.commitment_date ? new Date(wo.dispensationData.commitment_date).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}
					</p>
				</div>
			</div>

			<!-- 3-Party Approval Cards -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
				<!-- 1. Maintenance Approval -->
				<div class="p-4 rounded-xl border {wo.dispensationData.approval_maintenance?.approved ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' : 'bg-surface-container-low border-slate-200 dark:border-slate-800'} space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-[11px] font-bold uppercase tracking-wider text-on-surface">1. Pihak Maintenance</span>
						{#if wo.dispensationData.approval_maintenance?.approved}
							<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
								<span class="material-symbols-outlined text-[13px]">check</span> Disetujui
							</span>
						{:else}
							<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Menunggu</span>
						{/if}
					</div>

					{#if wo.dispensationData.approval_maintenance?.approved}
						<div class="text-xs space-y-1">
							<div class="text-[11px] text-on-surface">Disetujui oleh: <b>{wo.dispensationData.approval_maintenance.by}</b></div>
							{#if wo.dispensationData.approval_maintenance.notes}
								<div class="text-[10px] text-on-surface-variant italic">"{wo.dispensationData.approval_maintenance.notes}"</div>
							{/if}
						</div>
					{:else}
						<form method="POST" action="?/approveDispensation" use:enhance class="space-y-2 pt-1">
							<input type="hidden" name="role_type" value="maintenance" />
							<input 
								type="text" 
								name="notes" 
								placeholder="Catatan Ka. Bengkel (opsional)..." 
								class="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface-container border border-slate-200 dark:border-slate-800 text-on-surface outline-none"
							/>
							<button 
								type="submit" 
								class="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1"
							>
								<span class="material-symbols-outlined text-[15px]">check_circle</span>
								<span>Setujui (Ka. Bengkel)</span>
							</button>
						</form>
					{/if}
				</div>

				<!-- 2. Inspek Approval -->
				<div class="p-4 rounded-xl border {wo.dispensationData.approval_inspek?.approved ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' : 'bg-surface-container-low border-slate-200 dark:border-slate-800'} space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-[11px] font-bold uppercase tracking-wider text-on-surface">2. Pihak Inspeksi</span>
						{#if wo.dispensationData.approval_inspek?.approved}
							<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
								<span class="material-symbols-outlined text-[13px]">check</span> Disetujui
							</span>
						{:else}
							<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Menunggu</span>
						{/if}
					</div>

					{#if wo.dispensationData.approval_inspek?.approved}
						<div class="text-xs space-y-1">
							<div class="text-[11px] text-on-surface">Disetujui oleh: <b>{wo.dispensationData.approval_inspek.by}</b></div>
							{#if wo.dispensationData.approval_inspek.notes}
								<div class="text-[10px] text-on-surface-variant italic">"{wo.dispensationData.approval_inspek.notes}"</div>
							{/if}
						</div>
					{:else}
						<form method="POST" action="?/approveDispensation" use:enhance class="space-y-2 pt-1">
							<input type="hidden" name="role_type" value="inspek" />
							<input 
								type="text" 
								name="notes" 
								placeholder="Catatan Tim Inspek (opsional)..." 
								class="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface-container border border-slate-200 dark:border-slate-800 text-on-surface outline-none"
							/>
							<button 
								type="submit" 
								class="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1"
							>
								<span class="material-symbols-outlined text-[15px]">check_circle</span>
								<span>Setujui (Tim Inspeksi)</span>
							</button>
						</form>
					{/if}
				</div>

				<!-- 3. Operational Approval -->
				<div class="p-4 rounded-xl border {wo.dispensationData.approval_operational?.approved ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' : 'bg-surface-container-low border-slate-200 dark:border-slate-800'} space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-[11px] font-bold uppercase tracking-wider text-on-surface">3. Pihak Operasional</span>
						{#if wo.dispensationData.approval_operational?.approved}
							<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
								<span class="material-symbols-outlined text-[13px]">check</span> Disetujui
							</span>
						{:else}
							<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Menunggu</span>
						{/if}
					</div>

					{#if wo.dispensationData.approval_operational?.approved}
						<div class="text-xs space-y-1">
							<div class="text-[11px] text-on-surface">Disetujui oleh: <b>{wo.dispensationData.approval_operational.by}</b></div>
							{#if wo.dispensationData.approval_operational.notes}
								<div class="text-[10px] text-on-surface-variant italic">"{wo.dispensationData.approval_operational.notes}"</div>
							{/if}
						</div>
					{:else}
						<form method="POST" action="?/approveDispensation" use:enhance class="space-y-2 pt-1">
							<input type="hidden" name="role_type" value="operational" />
							<input 
								type="text" 
								name="notes" 
								placeholder="Catatan Ka. Operasional (opsional)..." 
								class="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface-container border border-slate-200 dark:border-slate-800 text-on-surface outline-none"
							/>
							<button 
								type="submit" 
								class="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1"
							>
								<span class="material-symbols-outlined text-[15px]">check_circle</span>
								<span>Setujui (Ka. Operasional)</span>
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Overview Metadata Card -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
		<!-- Unit & Keluhan -->
		<div class="md:col-span-2 p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-3">
			<div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Unit & Informasi Kerusakan</div>
			<div class="space-y-1.5 text-xs">
				<div class="flex justify-between items-center">
					<span class="text-on-surface-variant">Nomor Unit:</span>
					<span class="font-mono font-bold text-sm px-2 py-0.5 rounded bg-surface-container text-on-surface">{wo.unitId}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-on-surface-variant">Kategori:</span>
					<span class="font-semibold text-on-surface">{wo.category}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-on-surface-variant">Odometer:</span>
					<span class="font-mono text-on-surface">{wo.kilometer} KM</span>
				</div>
				<div class="pt-1.5 border-t border-slate-100 dark:border-slate-800">
					<span class="text-on-surface-variant font-medium">Keluhan / Deskripsi:</span>
					<p class="font-semibold text-on-surface mt-0.5">{wo.complaint}</p>
				</div>
				{#if wo.inspectionNo}
					<div class="pt-1">
						<a href="/maintenance/transactions/inspections/{encodeURIComponent(wo.inspectionNo)}" class="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
							<span class="material-symbols-outlined text-[13px]">link</span>
							Terkait Hasil Inspeksi P2H: {wo.inspectionNo}
						</a>
					</div>
				{/if}
			</div>
		</div>

		<!-- Mekanik Penanggung Jawab -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-3 flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-2">
					<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Penugasan Mekanik</span>
					<button 
						onclick={() => isAssignModalOpen = !isAssignModalOpen}
						class="text-[11px] font-bold text-primary hover:underline"
					>
						Ubah
					</button>
				</div>
				<div class="space-y-2 text-xs">
					<div>
						<span class="text-on-surface-variant text-[10px]">Mekanik Utama:</span>
						<div class="font-bold text-sm text-on-surface flex items-center gap-1.5 mt-0.5">
							<span class="material-symbols-outlined text-primary text-[18px]">engineering</span>
							{wo.mechanicName}
						</div>
					</div>
					<div>
						<span class="text-on-surface-variant text-[10px]">Helper Mekanik:</span>
						<div class="font-medium text-xs text-on-surface mt-0.5">{wo.helperMechanicName}</div>
					</div>
					<div>
						<span class="text-on-surface-variant text-[10px]">Lokasi Kerja:</span>
						<div class="font-medium text-xs text-on-surface mt-0.5">{wo.location}</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Status & Biaya Ringkas -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-3 flex flex-col justify-between">
			<div>
				<div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Progres & Biaya</div>
				<div class="space-y-2 text-xs">
					<div>
						<span class="text-on-surface-variant text-[10px]">Penyelesaian Item:</span>
						<div class="text-base font-black text-on-surface mt-0.5">{resolvedItemsCount} / {totalItems} Item</div>
						<div class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
							<div 
								class="h-full bg-emerald-500 rounded-full transition-all"
								style="width: {totalItems > 0 ? (resolvedItemsCount / totalItems) * 100 : 0}%"
							></div>
						</div>
					</div>
					<div class="pt-1">
						<span class="text-on-surface-variant text-[10px]">Biaya Sparepart (PMS):</span>
						<div class="font-mono font-bold text-sm text-on-surface mt-0.5">
							{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalPartsCost)}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Modal Penugasan Mekanik -->
	{#if isAssignModalOpen}
		<div class="p-5 rounded-2xl bg-surface-container-low border border-primary/30 space-y-4">
			<div class="flex items-center justify-between">
				<h3 class="text-xs font-black text-on-surface uppercase tracking-wider">Tugaskan Mekanik Bengkel</h3>
				<button onclick={() => isAssignModalOpen = false} class="text-on-surface-variant text-xs">Tutup</button>
			</div>
			<form method="POST" action="?/assignMechanic" use:enhance={() => {
				return async ({ update }) => {
					isAssignModalOpen = false;
					await update();
				};
			}} class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label for="assign_mechanic_id" class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Pilih Mekanik Utama *</label>
					<select id="assign_mechanic_id" name="mechanic_id" value={wo.mechanicId} required class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface">
						<option value="">-- Pilih Mekanik --</option>
						{#each mechanics as m}
							<option value={m.id}>{m.name} ({m.id})</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="assign_helper_mechanic_id" class="block text-xs font-bold text-on-surface-variant uppercase mb-1">Helper Mekanik</label>
					<select id="assign_helper_mechanic_id" name="helper_mechanic_id" value={wo.helperMechanicId} class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface">
						<option value="">-- Tanpa Helper --</option>
						{#each mechanics as m}
							<option value={m.id}>{m.name} ({m.id})</option>
						{/each}
					</select>
				</div>
				<div class="sm:col-span-2 flex justify-end gap-2">
					<button type="submit" class="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs">
						Simpan Penugasan
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Section 1: Item-by-Item Pengerjaan Perbaikan (Close Per Item) -->
	<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
		<div class="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800/70 pb-3">
			<div>
				<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
					<span class="material-symbols-outlined text-primary text-[20px]">handyman</span>
					Daftar Item Pengerjaan Perbaikan (Checklist Resolusi)
				</h2>
				<p class="text-xs text-on-surface-variant font-medium mt-0.5">
					Setiap item temuan/pekerjaan dikerjakan dan ditutup (close) satu per satu oleh mekanik.
				</p>
			</div>
			<div class="text-xs font-bold {allItemsResolved ? 'text-emerald-600' : 'text-amber-600'}">
				{resolvedItemsCount}/{totalItems} Selesai
			</div>
		</div>

		<div class="space-y-3">
			{#each wo.repairedItems as item, idx}
				<div class="p-4 rounded-xl border transition-all {item.status === 'RESOLVED' ? 'bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/60' : 'bg-surface-container-low border-slate-200/60 dark:border-slate-800/60'}">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div class="space-y-1 flex-1">
							<div class="flex items-center gap-2">
								<span class="font-mono text-xs font-bold text-on-surface-variant">#{idx + 1}</span>
								<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container text-on-surface">{item.category}</span>
								<span class="font-bold text-sm text-on-surface">{item.item}</span>
							</div>
							{#if item.remark}
								<div class="text-xs text-on-surface-variant">
									Catatan: <i>{item.remark}</i>
								</div>
							{/if}
							{#if item.mechanic_notes}
								<div class="text-xs text-sky-700 dark:text-sky-300 font-medium flex items-center gap-1 mt-1">
									<span class="material-symbols-outlined text-[14px]">comment</span>
									Tindakan Mekanik: {item.mechanic_notes}
								</div>
							{/if}
						</div>

						<!-- Status & Actions Form -->
						<div class="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
							{#if item.status === 'RESOLVED'}
								<span class="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
									<span class="material-symbols-outlined text-[15px]">check_circle</span>
									Selesai (Resolved)
								</span>
								<form method="POST" action="?/updateItemStatus" use:enhance={() => {
									updatingItemId = item.id;
									return async ({ update }) => {
										await update();
										updatingItemId = null;
									};
								}}>
									<input type="hidden" name="item_id" value={item.id} />
									<input type="hidden" name="item_status" value="PENDING" />
									<button 
										type="submit" 
										disabled={updatingItemId === item.id}
										class="text-[10px] text-on-surface-variant hover:text-rose-600 underline disabled:opacity-50 cursor-pointer"
									>
										{updatingItemId === item.id ? 'Membuka...' : 'Buka Kembali'}
									</button>
								</form>
							{:else}
								<form method="POST" action="?/updateItemStatus" use:enhance={() => {
									updatingItemId = item.id;
									return async ({ update }) => {
										await update();
										updatingItemId = null;
									};
								}} class="flex items-center gap-2">
									<input type="hidden" name="item_id" value={item.id} />
									<input type="hidden" name="item_status" value="RESOLVED" />
									<input 
										type="text" 
										name="mechanic_notes" 
										placeholder="Catatan perbaikan..." 
										class="text-xs px-2.5 py-1.5 rounded-lg bg-surface-container border border-slate-200 dark:border-slate-800 text-on-surface outline-none w-48"
									/>
									<button 
										type="submit" 
										disabled={updatingItemId === item.id}
										class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
									>
										{#if updatingItemId === item.id}
											<span class="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
											<span>Menyimpan...</span>
										{:else}
											<span class="material-symbols-outlined text-[15px]">done</span>
											<span>Tutup Item</span>
										{/if}
									</button>
								</form>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Section 2: Pemakaian Suku Cadang & Integrasi PMS -->
	<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
		<div class="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800/70 pb-3">
			<div>
				<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
					<span class="material-symbols-outlined text-primary text-[20px]">inventory_2</span>
					Pemakaian Suku Cadang Bengkel (Integrasi PMS)
				</h2>
				<p class="text-xs text-on-surface-variant font-medium mt-0.5">
					Suku cadang yang dicatat otomatis terhubung ke Delivery Note / Service Sheet di modul PMS.
				</p>
			</div>

			<button 
				type="button" 
				onclick={() => isSparepartModalOpen = !isSparepartModalOpen}
				class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-on-primary hover:opacity-90 transition-all flex items-center gap-1"
			>
				<span class="material-symbols-outlined text-[16px]">add</span>
				<span>Tambah Sparepart</span>
			</button>
		</div>

		<!-- Sparepart Picker Drawer/Modal -->
		{#if isSparepartModalOpen}
			<div class="p-5 rounded-xl bg-surface-container-low border border-primary/30 space-y-4">
				<div class="flex items-center justify-between">
					<h3 class="text-xs font-black text-on-surface uppercase tracking-wider">Katalog Suku Cadang PMS</h3>
					<button onclick={() => isSparepartModalOpen = false} class="text-on-surface-variant text-xs">Tutup</button>
				</div>

				<div class="space-y-3">
					<div>
						<input 
							type="text" 
							bind:value={searchMaterial} 
							placeholder="Cari nama barang / kode / part no..." 
							class="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none"
						/>
					</div>

					<!-- List filter results -->
					{#if searchMaterial && filteredMaterials.length > 0}
						<div class="max-h-40 overflow-y-auto divide-y divide-slate-200/50 dark:divide-slate-800/50 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800">
							{#each filteredMaterials as mat}
								<button 
									type="button" 
									onclick={() => selectMaterial(mat)}
									class="w-full p-2.5 text-left text-xs hover:bg-surface-container-high transition-colors flex items-center justify-between"
								>
									<div>
										<div class="font-bold text-on-surface">{mat.name}</div>
										<div class="text-[10px] text-on-surface-variant font-mono">{mat.code} • Stok: {mat.stock} {mat.uom}</div>
									</div>
									<div class="font-mono font-bold text-primary">
										Rp {mat.price.toLocaleString('id-ID')}
									</div>
								</button>
							{/each}
						</div>
					{/if}

					<!-- Chosen part details form -->
					<form method="POST" action="?/addSparepart" use:enhance={() => {
						return async ({ update }) => {
							isSparepartModalOpen = false;
							selectedMaterialName = '';
							selectedMaterialCode = '';
							await update();
						};
					}} class="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
						<div class="sm:col-span-2">
							<label for="sparepart_name" class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Nama Barang *</label>
							<input id="sparepart_name" type="text" name="material_name" bind:value={selectedMaterialName} required placeholder="Pilih barang di atas atau ketik manual..." class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface" />
							<input type="hidden" name="material_code" value={selectedMaterialCode} />
						</div>

						<div>
							<label for="sparepart_qty" class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Qty *</label>
							<div class="flex items-center gap-1">
								<input id="sparepart_qty" type="number" step="0.1" name="qty" bind:value={partQty} min="0.1" required class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface" />
								<input type="text" name="uom" bind:value={selectedMaterialUom} class="w-16 px-2 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-center text-on-surface" />
							</div>
						</div>

						<div>
							<label for="sparepart_price" class="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Harga Satuan (Rp)</label>
							<input id="sparepart_price" type="number" name="price" bind:value={selectedMaterialPrice} class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface" />
						</div>

						<div class="sm:col-span-4 flex justify-end gap-2 pt-1">
							<button type="submit" disabled={!selectedMaterialName} class="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs disabled:opacity-50">
								Simpan Pemakaian
							</button>
						</div>
					</form>
				</div>
			</div>
		{/if}

		<!-- Spareparts Table -->
		{#if wo.pmsParts.length === 0}
			<div class="p-8 text-center text-on-surface-variant text-xs">
				Belum ada suku cadang yang dicatat untuk SPK ini.
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="bg-surface-container-low text-on-surface-variant uppercase font-bold text-[10px]">
						<tr>
							<th class="py-2.5 px-3">Kode Barang</th>
							<th class="py-2.5 px-3">Nama Suku Cadang</th>
							<th class="py-2.5 px-3 text-right">Qty</th>
							<th class="py-2.5 px-3 text-right">Harga Satuan</th>
							<th class="py-2.5 px-3 text-right">Total</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each wo.pmsParts as part}
							<tr class="hover:bg-surface-container-low/30">
								<td class="py-2.5 px-3 font-mono text-on-surface-variant">{part.code || '-'}</td>
								<td class="py-2.5 px-3 font-semibold text-on-surface">{part.name}</td>
								<td class="py-2.5 px-3 text-right font-mono">{part.qty} {part.uom}</td>
								<td class="py-2.5 px-3 text-right font-mono">Rp {part.price.toLocaleString('id-ID')}</td>
								<td class="py-2.5 px-3 text-right font-mono font-bold text-on-surface">Rp {part.total.toLocaleString('id-ID')}</td>
							</tr>
						{/each}
						<tr class="bg-surface-container-low font-bold">
							<td colspan="4" class="py-2.5 px-3 text-right uppercase tracking-wider text-[11px]">Total Biaya Sparepart:</td>
							<td class="py-2.5 px-3 text-right font-mono text-sm text-primary">
								Rp {totalPartsCost.toLocaleString('id-ID')}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Closed-Loop Action Banner: Kirim ke Re-Inspeksi -->
	<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col sm:flex-row items-center justify-between gap-4">
		<div class="space-y-1">
			<div class="text-sm font-black text-on-surface">Penyelesaian Tiket SPK & Uji Kelayakan Re-Inspeksi</div>
			<div class="text-xs text-on-surface-variant">
				{#if allItemsResolved}
					<span class="text-emerald-600 font-bold">✓ Seluruh item ({totalItems}) telah diselesaikan mekanik.</span> Tiket siap dikirim kembali ke Tim Inspeksi untuk uji QC.
				{:else}
					<span>Masih ada <b>{totalItems - resolvedItemsCount}</b> item perbaikan yang belum berstatus 'Resolved'. Selesaikan seluruh item untuk mengirim ke Re-Inspeksi.</span>
				{/if}
			</div>
		</div>

		<div class="flex items-center gap-2">
			{#if wo.status === 'READY_FOR_REINSPECTION'}
				<a href="/maintenance/transactions/inspections/{encodeURIComponent(wo.inspectionNo || wo.woNo)}/re-inspect" class="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 shadow-sm transition-all flex items-center gap-1.5">
					<span class="material-symbols-outlined text-[16px]">verified</span>
					<span>Buka Lembar Re-Inspeksi QC</span>
				</a>
			{:else if wo.status === 'Closed'}
				<div class="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
					<span class="material-symbols-outlined text-[16px]">lock</span>
					<span>SPK Telah Ditutup (Selesai & Armada Siap Jalan)</span>
				</div>
			{:else}
				{#if !allItemsResolved && !wo.dispensationData?.is_requested}
					<button 
						type="button" 
						onclick={() => isDispensationModalOpen = true}
						class="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
					>
						<span class="material-symbols-outlined text-[16px]">release_alert</span>
						<span>Ajukan Dispensasi Jalan</span>
					</button>
				{/if}
				<form method="POST" action="?/sendToReinspection" use:enhance>
					<button 
						type="submit" 
						disabled={!allItemsResolved}
						class="px-6 py-2.5 rounded-xl bg-primary hover:opacity-95 text-on-primary font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
					>
						<span class="material-symbols-outlined text-[16px]">send</span>
						<span>Kirim ke Re-Inspeksi (Semua Item Selesai)</span>
					</button>
				</form>
			{/if}
		</div>
	</div>

	<!-- Modal Ajukan Dispensasi Jalan (Rilis Bersyarat) -->
	{#if isDispensationModalOpen}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
			<div class="w-full max-w-xl rounded-2xl bg-surface-container-lowest border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
				<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
					<div>
						<h3 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
							<span class="material-symbols-outlined text-amber-500 text-[20px]">release_alert</span>
							Pengajuan Dispensasi Jalan (Rilis Bersyarat)
						</h3>
						<p class="text-xs text-on-surface-variant mt-0.5">
							Mekanik memberikan rekomendasi teknis bahwa unit aman beroperasi sementara. Memerlukan persetujuan 3 pihak.
						</p>
					</div>
					<button onclick={() => isDispensationModalOpen = false} class="text-on-surface-variant hover:text-on-surface p-1">
						<span class="material-symbols-outlined text-[20px]">close</span>
					</button>
				</div>

				<form method="POST" action="?/requestDispensation" use:enhance={() => {
					return async ({ update }) => {
						isDispensationModalOpen = false;
						await update();
					};
				}} class="space-y-4 text-xs">
					<!-- Deferred items notice -->
					<div class="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-1.5">
						<span class="text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase">
							Item yang Belum Selesai ({totalItems - resolvedItemsCount} item):
						</span>
						<ul class="list-disc list-inside text-on-surface-variant space-y-0.5 max-h-32 overflow-y-auto">
							{#each wo.repairedItems.filter((i: any) => i.status !== 'RESOLVED') as item}
								<li><span class="font-bold text-on-surface">{item.item}</span> ({item.category})</li>
							{/each}
						</ul>
					</div>

					<div>
						<label for="disp_recommendation" class="block font-bold text-on-surface-variant uppercase mb-1">
							Rekomendasi Teknis Mekanik *
						</label>
						<textarea 
							id="disp_recommendation"
							name="recommendation" 
							bind:value={dispensationRec}
							rows="3" 
							required 
							placeholder="Contoh: Kerusakan minor lampu bak/karet wiper tidak fatal untuk rute jarak dekat siang hari. Sistem rem utama dan kemudi aman..."
							class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-on-surface outline-none"
						></textarea>
					</div>

					<div>
						<label for="disp_operational_reason" class="block font-bold text-on-surface-variant uppercase mb-1">
							Alasan Kebutuhan Operasional *
						</label>
						<textarea 
							id="disp_operational_reason"
							name="operational_reason" 
							bind:value={dispensationReason}
							rows="2" 
							required 
							placeholder="Contoh: Unit mendesak ditugaskan untuk muatan semen curah PT Indocement Merak trip prioritas..."
							class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-on-surface outline-none"
						></textarea>
					</div>

					<div>
						<label for="disp_commitment_date" class="block font-bold text-on-surface-variant uppercase mb-1">
							Target Tanggal Komitmen Kembali ke Bengkel *
						</label>
						<input 
							id="disp_commitment_date"
							type="date" 
							name="commitment_date" 
							bind:value={dispensationCommitment}
							required 
							class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-on-surface font-mono outline-none"
						/>
					</div>

					<div class="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
						<button 
							type="button" 
							onclick={() => isDispensationModalOpen = false}
							class="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high transition-all"
						>
							Batal
						</button>
						<button 
							type="submit" 
							class="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:opacity-95 shadow-sm transition-all"
						>
							Kirim Pengajuan
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
