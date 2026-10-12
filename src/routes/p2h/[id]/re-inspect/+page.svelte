<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: any } = $props();
	const insp = $derived(data.inspection);

	let reinspectNotes = $state('');
	let isSubmitting = $state(false);

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

<div class="p-4 space-y-4">
	
	<!-- Top Navigation -->
	<div class="flex items-center justify-between">
		<a href="/p2h/{encodeURIComponent(insp.inspectionNo)}" class="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-on-surface">
			<span class="material-symbols-outlined text-[18px]">arrow_back</span>
			<span>Detail P2H</span>
		</a>
		<span class="font-mono text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800">
			SPK: {insp.woNo}
		</span>
	</div>

	<!-- Title Card -->
	<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 space-y-2">
		<div class="flex items-center gap-2">
			<div class="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
				<span class="material-symbols-outlined text-[18px]">verified</span>
			</div>
			<div>
				<h1 class="text-sm font-black text-on-surface uppercase">Uji Re-Inspeksi & QC Armada</h1>
				<p class="text-xs text-on-surface-variant">Verifikasi hasil perbaikan bengkel sebelum unit dirilis jalan.</p>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
			<div>
				<span class="text-[10px] text-on-surface-variant uppercase font-medium">Nomor Unit:</span>
				<p class="font-mono font-bold text-on-surface">{insp.unitId}</p>
			</div>
			<div>
				<span class="text-[10px] text-on-surface-variant uppercase font-medium">Mekanik Bengkel:</span>
				<p class="font-bold text-on-surface">{insp.mechanicName || 'Tim Bengkel'}</p>
			</div>
		</div>
	</div>

	{#if form?.message}
		<div class="p-3.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-2">
			<span class="material-symbols-outlined text-[18px]">error</span>
			{form.message}
		</div>
	{/if}

	<!-- QC Form -->
	<form method="POST" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			isSubmitting = false;
			await update();
		};
	}} class="space-y-4">

		<input type="hidden" name="inspection_no" value={insp.inspectionNo} />
		<input type="hidden" name="wo_no" value={insp.woNo} />
		<input type="hidden" name="unit_id" value={insp.unitId} />
		<input type="hidden" name="items_verification" value={JSON.stringify(verificationList)} />

		<!-- Verification Items -->
		<div class="space-y-3">
			<span class="text-xs font-black uppercase tracking-wider text-on-surface px-1">
				Item Perbaikan yang Harus Diuji ({verificationList.length}):
			</span>

			{#each verificationList as item, idx}
				<div class="p-3.5 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 space-y-2.5 shadow-2xs">
					<div class="space-y-1">
						<div class="flex items-center gap-1.5">
							<span class="font-mono text-xs font-bold text-on-surface-variant">#{idx + 1}</span>
							<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-surface-container text-on-surface-variant">{item.category}</span>
							<span class="text-xs font-bold text-on-surface">{item.item}</span>
						</div>
						{#if item.remark}
							<div class="text-[11px] text-rose-700 dark:text-rose-300 font-medium pl-2 border-l-2 border-rose-400">
								Temuan awal: {item.remark}
							</div>
						{/if}
						<div class="text-[11px] text-sky-700 dark:text-sky-300 font-medium flex items-center gap-1 pl-2 border-l-2 border-sky-400">
							<span class="material-symbols-outlined text-[12px]">handyman</span>
							<span>Perbaikan: {item.mechanic_notes}</span>
						</div>
					</div>

					<!-- QC Buttons -->
					<div class="grid grid-cols-2 gap-2 pt-1">
						<button 
							type="button" 
							onclick={() => item.verified_ok = true}
							class="py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 {item.verified_ok ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-[16px]">check_circle</span>
							<span>Lolos Uji</span>
						</button>

						<button 
							type="button" 
							onclick={() => item.verified_ok = false}
							class="py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 {!item.verified_ok ? 'bg-rose-600 text-white shadow-2xs' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
						>
							<span class="material-symbols-outlined text-[16px]">cancel</span>
							<span>Perlu Revisi</span>
						</button>
					</div>
				</div>
			{/each}
		</div>

		<!-- Re-Inspection Notes -->
		<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
			<label for="p2h_reinspect_notes" class="block text-xs font-bold text-on-surface-variant uppercase">
				Catatan Hasil Uji QC / Uji Jalan (Opsional)
			</label>
			<textarea 
				id="p2h_reinspect_notes"
				name="reinspect_notes" 
				bind:value={reinspectNotes}
				rows="2"
				placeholder="Kondisi rem, uji coba mesin di pool, catatan perbaikan..."
				class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none"
			></textarea>
		</div>

		<!-- Conclusion Notice -->
		<div class="p-3.5 rounded-xl border {allPassed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100' : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100'} text-xs space-y-0.5">
			<div class="font-bold flex items-center gap-1.5">
				<span class="material-symbols-outlined text-[18px] {allPassed ? 'text-emerald-600' : 'text-amber-600'}">
					{allPassed ? 'verified' : 'warning'}
				</span>
				<span>{allPassed ? 'Semua item perbaikan dinyatakan LOLOS uji kelayakan.' : 'Ada item yang perlu revisi perbaikan oleh bengkel.'}</span>
			</div>
			<p class="text-[11px] text-on-surface-variant">
				{allPassed ? 'SPK akan otomatis ditutup dan status unit kembali ke Siap Operasi (AT_POOL) di OCS.' : 'Tiket SPK akan dikembalikan ke mekanik bengkel.'}
			</p>
		</div>

		<!-- Submit Button -->
		<div class="pt-2">
			<button 
				type="submit" 
				disabled={isSubmitting}
				class="w-full py-3 rounded-xl {allPassed ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'} text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
			>
				{#if isSubmitting}
					<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
					<span>Memproses...</span>
				{:else if allPassed}
					<span class="material-symbols-outlined text-[18px]">verified</span>
					<span>Sahkan Kelayakan & Tutup SPK (Unit Siap Jalan)</span>
				{:else}
					<span class="material-symbols-outlined text-[18px]">replay</span>
					<span>Kirim Kembali ke Bengkel (Revisi)</span>
				{/if}
			</button>
		</div>

	</form>

</div>
