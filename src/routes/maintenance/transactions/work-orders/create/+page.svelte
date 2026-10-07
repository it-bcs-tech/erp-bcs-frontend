<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: any } = $props();

	const units = $derived(data.units || []);
	const mechanics = $derived(data.mechanics || []);
	const drivers = $derived(data.drivers || []);

	let selectedUnitId = $state(data.initialUnit || '');
	let maintCategory = $state(data.initialCategory || 'Regular Repair');
	let driverId = $state('');
	let mechanicId = $state('');
	let helperMechanicId = $state('');
	let complaint = $state('');
	let kilometer = $state<number | null>(null);
	let hourmeter = $state<number | null>(null);
	let jobLocation = $state('Workshop Pool Utama');

	// Dynamic repair tasks
	let repairTasks = $state<string[]>(['']);
	let isSubmitting = $state(false);

	function addTask() {
		repairTasks = [...repairTasks, ''];
	}

	function removeTask(index: number) {
		if (repairTasks.length > 1) {
			repairTasks = repairTasks.filter((_, i) => i !== index);
		}
	}

	function handleUnitChange() {
		const found = units.find(u => u.noUnit === selectedUnitId);
		if (found && found.odometer) {
			kilometer = found.odometer;
		}
	}

	// Auto-trigger on initial mount if initialUnit is passed
	if (selectedUnitId) {
		handleUnitChange();
	}
</script>

<svelte:head>
	<title>Buat SPK Bengkel Baru | ERP BCS</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
	<!-- Header -->
	<header>
		<nav class="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mb-1">
			<a href="/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
			<span class="material-symbols-outlined text-[14px]">chevron_right</span>
			<a href="/maintenance/transactions/work-orders" class="hover:text-primary transition-colors">Work Orders</a>
			<span class="material-symbols-outlined text-[14px]">chevron_right</span>
			<span class="text-on-surface font-bold">Buat SPK Baru</span>
		</nav>
		<h1 class="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2.5">
			<span class="material-symbols-outlined text-primary text-3xl">note_add</span>
			Penerbitan Surat Perintah Kerja (SPK)
		</h1>
	</header>

	{#if form?.message}
		<div class="p-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold">
			{form.message}
		</div>
	{/if}

	<form method="POST" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			isSubmitting = false;
			await update();
		};
	}} class="space-y-6">

		<input type="hidden" name="items" value={JSON.stringify(repairTasks.filter(t => t.trim().length > 0))} />

		<!-- Card 1: Unit & Kategori Perbaikan -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
			<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
				<span class="material-symbols-outlined text-primary text-[20px]">directions_car</span>
				Informasi Unit & Kategori Kerusakan
			</h2>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				<!-- No. Unit -->
				<div>
					<label for="unit_id" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Nomor Unit Armada *</label>
					<input 
						id="unit_id"
						name="unit_id" 
						list="units-list"
						bind:value={selectedUnitId}
						onchange={handleUnitChange}
						placeholder="Pilih atau ketik No. Unit..." 
						required
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
					<datalist id="units-list">
						{#each units as u}
							<option value={u.noUnit}>{u.noUnit} ({u.type || 'Truck'})</option>
						{/each}
					</datalist>
				</div>

				<!-- Kategori Servis -->
				<div>
					<label for="maint_category" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Kategori Perawatan *</label>
					<select 
						id="maint_category"
						name="maint_category" 
						bind:value={maintCategory}
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					>
						<option value="Regular Repair">Regular Repair / Servis Ringan</option>
						<option value="Breakdown Repair">Breakdown / Mogok Darurat</option>
						<option value="Preventive Maintenance">Preventive Maintenance (Servis Berkala)</option>
						<option value="Overhaul Engine">Overhaul Mesin / Transmisi</option>
						<option value="Tire & Wheel Service">Ban & Kaki-kaki (Wheel Alignment)</option>
						<option value="Electrical Repair">Kelistrikan & Wiring</option>
						<option value="Body & Chassis Repair">Bodi, Bak & Chassis</option>
					</select>
				</div>

				<!-- Odometer (KM) -->
				<div>
					<label for="kilometer" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Kilometer (Odometer)</label>
					<input 
						id="kilometer"
						type="number" 
						name="kilometer" 
						bind:value={kilometer}
						placeholder="125000" 
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-mono text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
				</div>

				<!-- Pengemudi -->
				<div>
					<label for="driver_id" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Pengemudi (Driver)</label>
					<select 
						id="driver_id"
						name="driver_id" 
						bind:value={driverId}
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					>
						<option value="">-- Pilih Pengemudi --</option>
						{#each drivers as d}
							<option value={d.id}>{d.name} ({d.id})</option>
						{/each}
					</select>
				</div>

				<!-- Lokasi Pekerjaan -->
				<div>
					<label for="job_location" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Lokasi Perbaikan</label>
					<input 
						id="job_location"
						type="text" 
						name="job_location" 
						bind:value={jobLocation}
						placeholder="Pool Utama / Site Luar..." 
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
				</div>
			</div>
		</div>

		<!-- Card 2: Penugasan Mekanik & Tim Bengkel -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
			<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
				<span class="material-symbols-outlined text-primary text-[20px]">badge</span>
				Penugasan Mekanik Bengkel
			</h2>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label for="mechanic_id" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Mekanik Utama</label>
					<select 
						id="mechanic_id"
						name="mechanic_id" 
						bind:value={mechanicId}
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					>
						<option value="">-- Tugaskan Nanti (Status: Antre/Open) --</option>
						{#each mechanics as m}
							<option value={m.id}>{m.name} ({m.id})</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="helper_mechanic_id" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Helper / Asisten Mekanik (Opsional)</label>
					<select 
						id="helper_mechanic_id"
						name="helper_mechanic_id" 
						bind:value={helperMechanicId}
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					>
						<option value="">-- Tanpa Helper --</option>
						{#each mechanics as m}
							<option value={m.id}>{m.name} ({m.id})</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		<!-- Card 3: Keluhan & Daftar Item Pekerjaan Perbaikan -->
		<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
			<div class="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800/70 pb-3">
				<div>
					<h2 class="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-[20px]">checklist</span>
						Keluhan & Rincian Item Pekerjaan
					</h2>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">
						Item-item ini akan diperiksa dan diselesaikan satu per satu oleh mekanik bengkel.
					</p>
				</div>
				<button 
					type="button" 
					onclick={addTask}
					class="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center gap-1"
				>
					<span class="material-symbols-outlined text-[16px]">add</span>
					Tambah Item
				</button>
			</div>

			<!-- Keluhan Utama -->
			<div>
				<label for="keluhan_driver" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Ringkasan Keluhan / Masalah *</label>
				<input 
					id="keluhan_driver"
					type="text" 
					name="keluhan_driver" 
					bind:value={complaint}
					placeholder="Contoh: Rem belakang bocor angin & setir getar di kecepatan 60 km/h" 
					required
					class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold"
				/>
			</div>

			<!-- Dynamic Task List -->
			<div class="space-y-2.5 pt-2">
				<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Item Pengerjaan Spesifik (Per Item Resolution):</label>
				{#each repairTasks as task, idx}
					<div class="flex items-center gap-2">
						<span class="font-mono text-xs font-bold text-on-surface-variant w-6 text-center">{idx + 1}.</span>
						<input 
							type="text" 
							bind:value={repairTasks[idx]}
							placeholder="Rincian perbaikan item ke-{idx + 1} (contoh: Kuras & ganti seal rem angin)" 
							class="flex-1 px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
						/>
						<button 
							type="button" 
							onclick={() => removeTask(idx)} 
							disabled={repairTasks.length <= 1}
							class="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30 disabled:cursor-not-allowed"
							title="Hapus baris"
						>
							<span class="material-symbols-outlined text-[18px]">delete</span>
						</button>
					</div>
				{/each}
			</div>
		</div>

		<!-- Action Footer -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-4">
			<a href="/maintenance/transactions/work-orders" class="px-5 py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-bold text-xs transition-all">
				Batal
			</a>
			<button 
				type="submit" 
				disabled={isSubmitting || !selectedUnitId || !complaint}
				class="px-7 py-2.5 rounded-xl bg-primary hover:opacity-95 text-on-primary font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if isSubmitting}
					<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
					<span>Menyimpan SPK...</span>
				{:else}
					<span class="material-symbols-outlined text-[18px]">send</span>
					<span>Terbitkan Surat Perintah Kerja (SPK)</span>
				{/if}
			</button>
		</div>

	</form>
</div>
