<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let workOrder = $derived(data.workOrder);
	let isEditable = $derived(data.isEditable);
	let units = $derived(data.units);

	let isSubmitting = $state(false);
	let showEditMode = $state(false);
	let editUnit = $state('');
	let editKeluhan = $state('');
	let editCategory = $state('');
	let editKm = $state('');
	let editHm = $state('');

	function startEdit() {
		editUnit = workOrder.unit_id || '';
		editKeluhan = workOrder.keluhan_driver || '';
		editCategory = workOrder.maint_category || '';
		editKm = workOrder.kilometer?.toString() || '';
		editHm = workOrder.hourmeter?.toString() || '';
		showEditMode = true;
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', {
			year: 'numeric', month: 'long', day: 'numeric',
			hour: '2-digit', minute: '2-digit'
		});
	}

	function getStatusStyle(status: string) {
		const s = status?.toLowerCase() || '';
		if (s.includes('open')) return 'bg-amber-100 text-amber-800 border-amber-300';
		if (s.includes('proses') || s.includes('progress')) return 'bg-blue-100 text-blue-800 border-blue-300';
		if (s.includes('close') || s.includes('complete')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
		return 'bg-slate-100 text-slate-700 border-slate-300';
	}
</script>

<svelte:head>
	<title>Inspeksi {workOrder.wo_no} | Maintenance</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
	<!-- Breadcrumb -->
	<nav class="flex items-center text-sm font-medium text-on-surface-variant">
		<a href="/maintenance/inspections" class="hover:text-primary transition-colors">Inspections</a>
		<span class="material-symbols-outlined text-[16px] mx-1">chevron_right</span>
		<span class="text-on-surface font-bold">Detail WO</span>
	</nav>

	<!-- Success/Error Toast -->
	{#if form?.success}
		<div class="bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-2xl px-5 py-3 text-sm font-bold flex items-center gap-2">
			<span class="material-symbols-outlined text-[18px]">check_circle</span>
			{form.message}
		</div>
	{/if}
	{#if form?.success === false}
		<div class="bg-rose-100 text-rose-800 border border-rose-300 rounded-2xl px-5 py-3 text-sm font-bold flex items-center gap-2">
			<span class="material-symbols-outlined text-[18px]">error</span>
			{form.message}
		</div>
	{/if}

	<!-- Header Card -->
	<div class="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-sm border border-surface-container">
		<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
			<div>
				<p class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Work Order</p>
				<h1 class="text-2xl md:text-3xl font-black text-on-surface tracking-tight">{workOrder.wo_no}</h1>
			</div>
			<div class="flex items-center gap-3">
				<span class="inline-flex items-center gap-2 font-bold text-sm px-4 py-2 rounded-full border {getStatusStyle(workOrder.status)}">
					<span class="w-2 h-2 rounded-full {workOrder.status?.toLowerCase() === 'open' ? 'bg-amber-600 animate-pulse' : workOrder.status?.toLowerCase().includes('proses') ? 'bg-blue-600 animate-pulse' : 'bg-emerald-600'}"></span>
					{workOrder.status}
				</span>
				{#if isEditable && !showEditMode}
					<button onclick={startEdit} class="bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-2">
						<span class="material-symbols-outlined text-[18px]">edit</span>
						Edit WO
					</button>
				{/if}
			</div>
		</div>

		<!-- Info Grid -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="bg-surface-container-low rounded-2xl p-4">
				<p class="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Unit</p>
				<p class="text-sm font-black text-on-surface">{workOrder.unit_id || '-'}</p>
			</div>
			<div class="bg-surface-container-low rounded-2xl p-4">
				<p class="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Driver</p>
				<p class="text-sm font-bold text-on-surface">{workOrder.driver_name || '-'}</p>
			</div>
			<div class="bg-surface-container-low rounded-2xl p-4">
				<p class="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Mekanik</p>
				<p class="text-sm font-bold text-on-surface">{workOrder.mechanic_name || 'Belum ditugaskan'}</p>
			</div>
			<div class="bg-surface-container-low rounded-2xl p-4">
				<p class="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Tanggal</p>
				<p class="text-sm font-bold text-on-surface">{formatDate(workOrder.wo_date)}</p>
			</div>
		</div>
	</div>

	<!-- Detail Keluhan Card -->
	<div class="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-sm border border-surface-container">
		<h2 class="text-lg font-black text-on-surface mb-4 flex items-center gap-2">
			<span class="material-symbols-outlined text-primary">report_problem</span>
			Detail Keluhan
		</h2>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div>
				<p class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Keluhan Driver</p>
				<p class="text-sm font-semibold text-on-surface bg-surface-container-low p-3 rounded-xl">{workOrder.keluhan_driver || '-'}</p>
			</div>
			<div>
				<p class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Kategori</p>
				<p class="text-sm font-semibold text-on-surface bg-surface-container-low p-3 rounded-xl">{workOrder.maint_category || '-'}</p>
			</div>
			<div>
				<p class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Kilometer</p>
				<p class="text-sm font-semibold text-on-surface bg-surface-container-low p-3 rounded-xl">{workOrder.kilometer || '-'}</p>
			</div>
			<div>
				<p class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Hourmeter</p>
				<p class="text-sm font-semibold text-on-surface bg-surface-container-low p-3 rounded-xl">{workOrder.hourmeter || '-'}</p>
			</div>
		</div>

		{#if workOrder.problem}
			<div class="mt-6 pt-6 border-t border-surface-container">
				<p class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Problem (dari Mekanik)</p>
				<p class="text-sm font-semibold text-on-surface bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-200/50">{workOrder.problem}</p>
			</div>
		{/if}

		{#if workOrder.cause}
			<div class="mt-4">
				<p class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Root Cause (dari Mekanik)</p>
				<p class="text-sm font-semibold text-on-surface bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-200/50">{workOrder.cause}</p>
			</div>
		{/if}
	</div>

	<!-- Tidak Bisa Edit Warning -->
	{#if !isEditable && !showEditMode}
		<div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-300/50 rounded-2xl p-5 flex items-start gap-3">
			<span class="material-symbols-outlined text-amber-600 text-xl mt-0.5">lock</span>
			<div>
				<p class="text-sm font-bold text-amber-800 dark:text-amber-300">Work Order tidak dapat diedit</p>
				<p class="text-xs text-amber-700 dark:text-amber-400 mt-1">Status WO ini sudah <strong>{workOrder.status}</strong>. Hanya WO dengan status <strong>Open</strong> yang bisa diedit oleh Inspector.</p>
			</div>
		</div>
	{/if}

	<!-- Edit Form (Inline, muncul ketika tombol Edit diklik) -->
	{#if showEditMode && isEditable}
		<div class="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-sm border-2 border-primary/30">
			<div class="flex justify-between items-center mb-6">
				<h2 class="text-lg font-black text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">edit_note</span>
					Edit Work Order
				</h2>
				<button onclick={() => showEditMode = false} class="text-on-surface-variant hover:text-on-surface transition-colors">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form method="POST" action="?/updateWo" use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					isSubmitting = false;
					showEditMode = false;
					await update();
				};
			}}>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
					<div>
						<label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Unit</label>
						<select name="unit_id" bind:value={editUnit} class="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20">
							{#each units as u}
								<option value={u.no_unit}>{u.no_unit}</option>
							{/each}
						</select>
					</div>
					<div>
						<label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Kategori</label>
						<select name="maint_category" bind:value={editCategory} class="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20">
							<option value="Regular Repair">Regular Repair</option>
							<option value="Breakdown Repair">Breakdown Repair</option>
							<option value="Periodic Service">Periodic Service</option>
							<option value="Accident Repair">Accident Repair</option>
						</select>
					</div>
					<div class="md:col-span-2">
						<label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Keluhan Driver</label>
						<textarea name="keluhan_driver" bind:value={editKeluhan} rows="3" class="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"></textarea>
					</div>
					<div>
						<label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Kilometer</label>
						<input type="number" name="kilometer" bind:value={editKm} class="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
					</div>
					<div>
						<label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Hourmeter</label>
						<input type="number" name="hourmeter" bind:value={editHm} class="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
					</div>
				</div>

				<div class="flex justify-end gap-3 mt-6 pt-6 border-t border-surface-container">
					<button type="button" onclick={() => showEditMode = false} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors">
						Batal
					</button>
					<button type="submit" disabled={isSubmitting} class="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
						{#if isSubmitting}
							<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
						{/if}
						Simpan Perubahan
					</button>
				</div>
			</form>
		</div>
	{/if}
</div>
