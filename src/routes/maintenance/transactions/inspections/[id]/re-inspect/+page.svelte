<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: any } = $props();
	const insp = $derived(data.inspection);

	let reinspectNotes = $state('');
	let isSubmitting = $state(false);

	// Initialize items verification state
	let verificationList = $state<{
		id: string;
		item: string;
		category: string;
		remark: string;
		mechanic_notes: string;
		verified_ok: boolean;
	}[]>(
		(insp.repairedItems || []).map((r: any) => ({
			id: r.id || r.item,
			item: r.item || r.name,
			category: r.category || 'General',
			remark: r.remark || '',
			mechanic_notes: r.mechanic_notes || 'Telah diperbaiki oleh mekanik',
			verified_ok: true
		}))
	);

	let allPassed = $derived(verificationList.length > 0 && verificationList.every(i => i.verified_ok));
</script>

<svelte:head>
	<title>Uji Re-Inspeksi QC - {insp.inspectionNo}</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<nav class="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mb-1">
				<a href="/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<a href="/maintenance/transactions/inspections" class="hover:text-primary transition-colors">Inspeksi</a>
				<span class="material-symbols-outlined text-[14px]">chevron_right</span>
				<span class="text-on-surface font-bold">Uji Re-Inspeksi</span>
			</nav>
			<h1 class="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2.5">
				<span class="material-symbols-outlined text-purple-600 text-3xl">verified</span>
				Verifikasi & Uji Re-Inspeksi Armada
			</h1>
		</div>

		<div class="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold font-mono">
			SPK: {insp.woNo}
		</div>
	</header>

	{#if form?.message}
		<div class="p-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold">
			{form.message}
		</div>
	{/if}

	<!-- Summary Context Card -->
	<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
		<div>
			<span class="text-on-surface-variant font-medium">Nomor Unit:</span>
			<div class="font-mono font-bold text-base text-on-surface mt-0.5">{insp.unitId}</div>
		</div>
		<div>
			<span class="text-on-surface-variant font-medium">Pengemudi:</span>
			<div class="font-bold text-sm text-on-surface mt-0.5">{insp.driverName}</div>
		</div>
		<div>
			<span class="text-on-surface-variant font-medium">Mekanik Pengerjaan:</span>
			<div class="font-bold text-sm text-on-surface mt-0.5">{insp.mechanicName || 'Tim Bengkel'}</div>
		</div>
		<div>
			<span class="text-on-surface-variant font-medium">Status Pengerjaan:</span>
			<div class="font-bold text-purple-600 mt-0.5">Selesai Perbaikan Bengkel</div>
		</div>
	</div>

	<!-- Form Re-Inspection -->
	<form method="POST" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			isSubmitting = false;
			await update();
		};
	}} class="space-y-6">

		<input type="hidden" name="inspection_no" value={insp.inspectionNo} />
		<input type="hidden" name="wo_no" value={insp.woNo} />
		<input type="hidden" name="unit_id" value={insp.unitId} />
		<input type="hidden" name="items_verification" value={JSON.stringify(verificationList)} />

		<!-- Verification Items Table -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
			<div class="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800/70 pb-3">
				<div>
					<h2 class="text-sm font-black text-on-surface uppercase tracking-wider">
						Daftar Item Temuan Kerusakan yang Diperbaiki
					</h2>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">
						Lakukan uji fisik apakah setiap item benar-benar telah selesai diperbaiki dan layak operasi.
					</p>
				</div>
			</div>

			<div class="space-y-3">
				{#each verificationList as item, idx}
					<div class="p-4 rounded-xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div class="space-y-1 flex-1">
							<div class="flex items-center gap-2">
								<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container-high text-on-surface">{item.category}</span>
								<span class="font-bold text-sm text-on-surface">{item.item}</span>
							</div>
							<div class="text-xs text-rose-600 dark:text-rose-400 font-medium">
								Temuan Awal P2H: {item.remark}
							</div>
							<div class="text-xs text-sky-700 dark:text-sky-300 font-medium flex items-center gap-1">
								<span class="material-symbols-outlined text-[14px]">handyman</span>
								Catatan Mekanik: {item.mechanic_notes}
							</div>
						</div>

						<div class="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
							<button 
								type="button" 
								onclick={() => item.verified_ok = true}
								class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 {item.verified_ok ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}"
							>
								<span class="material-symbols-outlined text-[16px]">check_circle</span>
								Lolos Uji
							</button>
							<button 
								type="button" 
								onclick={() => item.verified_ok = false}
								class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 {!item.verified_ok ? 'bg-rose-600 text-white shadow-2xs' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}"
							>
								<span class="material-symbols-outlined text-[16px]">cancel</span>
								Perlu Revisi
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Re-Inspection Notes -->
			<div class="pt-2">
				<label for="reinspect_notes" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
					Catatan Hasil Verifikasi & Uji Jalan / Re-Inspeksi
				</label>
				<textarea 
					id="reinspect_notes"
					name="reinspect_notes" 
					bind:value={reinspectNotes}
					rows="3"
					placeholder="Tuliskan catatan uji kelayakan, kondisi rem, hasil uji jalan atau revisi pekerjaan..." 
					class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
				></textarea>
			</div>
		</div>

		<!-- Action Footer -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col sm:flex-row items-center justify-between gap-4">
			<div class="text-xs">
				{#if allPassed}
					<div class="font-bold text-emerald-600 flex items-center gap-1">
						<span class="material-symbols-outlined text-[18px]">verified</span>
						Semua item terverifikasi lolos uji kelayakan.
					</div>
					<div class="text-on-surface-variant mt-0.5">
						SPK bengkel akan ditutup (Closed) dan armada otomatis kembali ke status <b>STANDBY</b> di OCS.
					</div>
				{:else}
					<div class="font-bold text-amber-600 flex items-center gap-1">
						<span class="material-symbols-outlined text-[18px]">warning</span>
						Ada item perbaikan yang belum lolos verifikasi.
					</div>
					<div class="text-on-surface-variant mt-0.5">
						Tiket SPK akan dikembalikan ke mekanik bengkel untuk perbaikan revisi.
					</div>
				{/if}
			</div>

			<div class="flex items-center gap-3 w-full sm:w-auto">
				<a href="/maintenance/transactions/inspections/{encodeURIComponent(insp.inspectionNo)}" class="px-4 py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-bold text-xs transition-all text-center">
					Kembali
				</a>
				<button 
					type="submit" 
					disabled={isSubmitting}
					class="px-6 py-2.5 rounded-xl {allPassed ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'} text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
						<span>Memproses...</span>
					{:else if allPassed}
						<span class="material-symbols-outlined text-[16px]">lock_clock</span>
						<span>Sahkan Kelayakan & Tutup SPK (Unit Siap Jalan)</span>
					{:else}
						<span class="material-symbols-outlined text-[16px]">replay</span>
						<span>Kirim Kembali ke Bengkel (Revisi)</span>
					{/if}
				</button>
			</div>
		</div>

	</form>
</div>
